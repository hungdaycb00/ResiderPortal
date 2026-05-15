import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
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

// SPRINT 1 FIX: Adaptive proxy size theo device capability
const getProxySize = (isDesktop = false, perfMode = 'high'): number => {
  if (perfMode === 'low') return 512;
  if (!isDesktop) return 1024;
  return 2048;
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
  // SPRINT 1 FIX P0: Dirty flag — chỉ upload texture khi MapLibre render xong
  const textureDirtyRef = useRef(false);

  useEffect(() => {
    if (mode !== 'roadmap' || !myObfPos) return;

    const PROXY_SIZE = getProxySize(isDesktop, performanceMode);
    const container = getOffscreenContainer();
    const safeScale = scale.get() || 1;
    const initialZoom = getRoadmapTileZoom(safeScale);

    // Proxy 2D canvas: Three.js đọc từ đây, tránh xung đột WebGL context
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

      // Copy MapLibre frame → proxy 2D canvas đồng bộ trong render callback
      // Sau đó set dirty flag để useFrame biết texture cần upload
      map.on('render', () => {
        if (!ctx2d || !mapReadyRef.current) return;
        try {
          // FIX TEXT NGƯỢC: ctx2d.drawImage từ WebGL canvas cần được flip ngang
          // vì MapLibre với yaw=0 (nhìn từ Nam lên Bắc) render map đúng hướng
          // nhưng UV plane sau rotation-x=-PI/2 cần flip U để text đúng chiều
          ctx2d.save();
          ctx2d.translate(PROXY_SIZE, 0);
          ctx2d.scale(-1, 1); // Flip ngang để correct text direction
          ctx2d.drawImage(mapCanvas, 0, 0, PROXY_SIZE, PROXY_SIZE);
          ctx2d.restore();
          // SPRINT 1 FIX P0: Đặt dirty flag thay vì set needsUpdate trực tiếp
          textureDirtyRef.current = true;
        } catch {
          // bỏ qua khi canvas đang transition
        }
      });

      const texture = new THREE.CanvasTexture(proxyCanvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.format = THREE.RGBAFormat;
      // flipY=true: Three.js chuẩn hóa V-axis, kết hợp với flip ngang bên trên
      // cho ra đúng hướng bản đồ (north = top, east = right, text đọc được)
      texture.flipY = true;

      textureRef.current = texture;
      if (materialRef.current) {
        materialRef.current.map = texture;
        materialRef.current.needsUpdate = true;
      }
    });

    mapRef.current = map;

    return () => {
      mapReadyRef.current = false;
      textureDirtyRef.current = false;
      map.remove();
      mapRef.current = null;
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
    };
  }, [mode, myObfPos, isDesktop, performanceMode]);

  useFrame((_, delta) => {
    if (!mapReadyRef.current || !mapRef.current || !myObfPos) return;

    // Throttle jumpTo ~15fps
    lastJumpRef.current += delta;
    if (lastJumpRef.current >= 0.066) {
      lastJumpRef.current = 0;

      let center = getRoadmapCenterFromPan(
        myObfPos, panX.get() || 0, panY.get() || 0, planeYScale.get() || 0.66
      );
      let zoom = getRoadmapTileZoom(scale.get() || 1);

      if (!isFinite(zoom)) zoom = 15;
      if (!isFinite(center.lat)) center.lat = myObfPos.lat;
      if (!isFinite(center.lng)) center.lng = myObfPos.lng;

      try {
        // SPRINT 1 FIX P2: easeTo() thay jumpTo() để smooth giữa các frame
        mapRef.current.easeTo({
          center: [center.lng, center.lat],
          zoom,
          duration: 80,  // ms — smooth giữa 2 frame 15fps
          easing: (t: number) => t, // linear
        });
      } catch {
        // bỏ qua
      }
    }

    // SPRINT 1 FIX P0: Chỉ upload GPU khi có frame mới từ MapLibre
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
