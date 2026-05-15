import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MotionValue } from 'framer-motion';
import { getRoadmapCenterFromPan, getRoadmapTileZoom } from '../../constants';

interface WebGLMapTilesProps {
  panX: MotionValue<number>;
  panY: MotionValue<number>;
  scale: MotionValue<number>;
  planeYScale: MotionValue<number>;
  myObfPos: { lat: number; lng: number } | null;
  mode: string;
  isDesktop?: boolean;
  performanceMode?: string;
}

// SPRINT 1: Adaptive proxy size theo device capability
const getProxySize = (isDesktop = false, perfMode = 'high'): number => {
  if (perfMode === 'low') return 512;
  if (!isDesktop) return 1024;
  return 2048;
};

// SPRINT 3b: Adaptive throttle interval theo performance mode
// high=30fps(33ms), balanced=20fps(50ms), low=10fps(100ms)
const getThrottleInterval = (perfMode = 'high'): number => {
  if (perfMode === 'low') return 0.1;
  if (perfMode === 'balanced') return 0.05;
  return 0.033;
};

const getOffscreenContainer = () => {
  let div = document.getElementById('maplibre-offscreen-container');
  if (!div) {
    div = document.createElement('div');
    div.id = 'maplibre-offscreen-container';
    div.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:2048px;height:2048px;pointer-events:none;';
    document.body.appendChild(div);
  }
  return div;
};

export default function WebGLMapTiles({
  panX, panY, scale, planeYScale, myObfPos, mode,
  isDesktop = false, performanceMode = 'high',
}: WebGLMapTilesProps) {
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const mapReadyRef = useRef(false);
  const lastJumpRef = useRef(0);
  const textureDirtyRef = useRef(false);
  // SPRINT 3c: Pause khi tab hidden
  const isPageVisibleRef = useRef(true);

  const { invalidate } = useThree();
  const invalidateRef = useRef(invalidate);
  invalidateRef.current = invalidate;

  // SPRINT 3c: Dừng MapLibre update khi tab bị ẩn — tiết kiệm CPU/GPU
  useEffect(() => {
    const onVisibility = () => {
      isPageVisibleRef.current = document.visibilityState !== 'hidden';
      if (isPageVisibleRef.current) {
        // Khi quay lại tab — trigger re-render ngay
        invalidateRef.current();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    // SPRINT 3d: Cleanup triệt để khi mode !== 'roadmap' hoặc myObfPos null
    if (mode !== 'roadmap' || !myObfPos) return;

    const PROXY_SIZE = getProxySize(isDesktop, performanceMode);
    const container = getOffscreenContainer();
    const safeScale = scale.get() || 1;
    const initialZoom = getRoadmapTileZoom(safeScale);

    // Proxy 2D canvas — tránh xung đột 2 WebGL context
    const proxyCanvas = document.createElement('canvas');
    proxyCanvas.width = PROXY_SIZE;
    proxyCanvas.height = PROXY_SIZE;
    const ctx2d = proxyCanvas.getContext('2d', { willReadFrequently: false });

    const map = new maplibregl.Map({
      container,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [myObfPos.lng, myObfPos.lat],
      zoom: isNaN(initialZoom) ? 15 : initialZoom,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
    });

    map.on('load', () => {
      mapReadyRef.current = true;
      const mapCanvas = map.getCanvas();

      map.on('render', () => {
        // SPRINT 3c: Skip copy khi tab hidden
        if (!ctx2d || !mapReadyRef.current || !isPageVisibleRef.current) return;
        try {
          // Fix text ngược: flip ngang khi copy
          ctx2d.save();
          ctx2d.translate(PROXY_SIZE, 0);
          ctx2d.scale(-1, 1);
          ctx2d.drawImage(mapCanvas, 0, 0, PROXY_SIZE, PROXY_SIZE);
          ctx2d.restore();
          textureDirtyRef.current = true;
          invalidateRef.current(); // Sprint 2: trigger R3F frame
        } catch {
          // bỏ qua khi canvas đang transition
        }
      });

      const texture = new THREE.CanvasTexture(proxyCanvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.format = THREE.RGBAFormat;
      texture.flipY = true; // correct V-axis

      textureRef.current = texture;
      if (materialRef.current) {
        materialRef.current.map = texture;
        materialRef.current.needsUpdate = true;
      }
    });

    mapRef.current = map;

    // SPRINT 3d: Cleanup đầy đủ khi component unmount hoặc mode thay đổi
    return () => {
      mapReadyRef.current = false;
      textureDirtyRef.current = false;
      map.remove();
      mapRef.current = null;
      // Giải phóng VRAM ngay lập tức khi rời roadmap mode
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
      if (materialRef.current) {
        materialRef.current.map = null;
        materialRef.current.needsUpdate = true;
      }
    };
  }, [mode, myObfPos, isDesktop, performanceMode]);

  useFrame((_, delta) => {
    if (!mapReadyRef.current || !mapRef.current || !myObfPos) return;
    // SPRINT 3c: Skip frame processing khi tab hidden
    if (!isPageVisibleRef.current) return;

    // SPRINT 3b: Adaptive throttle theo performance mode
    const throttleInterval = getThrottleInterval(performanceMode);
    lastJumpRef.current += delta;
    if (lastJumpRef.current >= throttleInterval) {
      lastJumpRef.current = 0;

      let center = getRoadmapCenterFromPan(
        myObfPos, panX.get() || 0, panY.get() || 0, planeYScale.get() || 0.66
      );
      let zoom = getRoadmapTileZoom(scale.get() || 1);

      if (!isFinite(zoom)) zoom = 15;
      if (!isFinite(center.lat)) center.lat = myObfPos.lat;
      if (!isFinite(center.lng)) center.lng = myObfPos.lng;

      try {
        // Sprint 1: easeTo smooth hơn jumpTo
        mapRef.current.easeTo({
          center: [center.lng, center.lat],
          zoom,
          duration: Math.round(throttleInterval * 1000 * 1.2),
          easing: (t: number) => t,
        });
      } catch {
        // bỏ qua
      }
    }

    // Chỉ upload texture khi có frame mới từ MapLibre
    if (textureDirtyRef.current && textureRef.current) {
      textureRef.current.needsUpdate = true;
      textureDirtyRef.current = false;
    }
  });

  if (mode !== 'roadmap') return null;

  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.2, 0]}>
      <planeGeometry args={[4000, 4000]} />
      <meshBasicMaterial ref={materialRef} color="#ffffff" />
    </mesh>
  );
}
