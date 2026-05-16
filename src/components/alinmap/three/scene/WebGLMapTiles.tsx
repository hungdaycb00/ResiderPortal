import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MotionValue } from 'framer-motion';
import { getRoadmapCenterFromPan, DEGREES_TO_PX, MAP_PLANE_SCALE } from '../../constants';
import { MAP_COORD_SCENE_SCALE } from '../sceneCoords';

// --- Style Patching Utils ---
const NUMERIC_MIN_FALLBACK = 0.1;
const STYLE_NUMBER_DEFAULTS: Record<string, number> = {
  'text-size': 14,
  'icon-size': 1,
  'line-width': 1,
  'line-opacity': 1,
};

const getNumericFallback = (operator: string, value: number) => {
  if (['<', '<='].includes(operator)) return value - 1;
  if (['>', '>='].includes(operator)) return value + 1;
  if (operator === '==') return value;
  if (operator === '!=') return value === 0 ? 1 : 0;
  return NUMERIC_MIN_FALLBACK;
};

const patchStyleExpression = (value: any): any => {
  if (!value) return value;
  const isGetExpression = (expr: any) => Array.isArray(expr) && expr[0] === 'get';

  if (Array.isArray(value)) {
    if (value.length === 0) return value;
    const operator = value[0];
    const left = value[1];
    const right = value[2];
    const rest = value.slice(3);

    if (operator === 'step' && isGetExpression(left)) {
      return [
        operator,
        ['to-number', patchStyleExpression(left), NUMERIC_MIN_FALLBACK],
        right,
        ...rest.map(patchStyleExpression),
      ];
    }

    if (operator === 'interpolate' && isGetExpression(right)) {
      return [
        operator,
        patchStyleExpression(left),
        ['to-number', patchStyleExpression(right), NUMERIC_MIN_FALLBACK],
        ...rest.map(patchStyleExpression),
      ];
    }

    if (
      typeof operator === 'string'
      && ['>', '>=', '<', '<=', '==', '!='].includes(operator)
      && typeof right === 'number'
      && isGetExpression(left)
    ) {
      return [
        operator,
        ['to-number', patchStyleExpression(left), getNumericFallback(operator, right)],
        right,
        ...rest.map(patchStyleExpression),
      ];
    }

    if (
      typeof operator === 'string'
      && ['>', '>=', '<', '<=', '==', '!='].includes(operator)
      && typeof left === 'number'
      && isGetExpression(right)
    ) {
      return [
        operator,
        left,
        ['to-number', patchStyleExpression(right), getNumericFallback(operator, left)],
        ...rest.map(patchStyleExpression),
      ];
    }

    return value.map(patchStyleExpression);
  }

  if (typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      const child = value[key];
      if (child === null && key in STYLE_NUMBER_DEFAULTS) {
        result[key] = STYLE_NUMBER_DEFAULTS[key];
      } else {
        result[key] = patchStyleExpression(child);
      }
    }
    return result;
  }

  return value;
};
// -----------------------------

interface WebGLMapTilesProps {
  panX: MotionValue<number>;
  panY: MotionValue<number>;
  scale: MotionValue<number>;
  planeYScale: MotionValue<number>;
  myObfPos: { lat: number; lng: number } | null;
  mode: string;
  isDesktop?: boolean;
  performanceMode?: string;
  sceneWorldScale?: number;
}

// SPRINT 1: Adaptive proxy size theo device capability
const getProxySize = (isDesktop = false, perfMode = 'high'): number => {
  if (typeof window !== 'undefined') {
    const maxSize = Math.max(window.innerWidth, window.innerHeight);
    if (perfMode === 'low') return Math.min(maxSize, 2048);
    return Math.min(Math.max(maxSize, 2048), 4096);
  }
  return isDesktop ? 4096 : 2048;
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
    div.style.cssText = 'position:fixed;left:-9999px;top:-9999px;pointer-events:none;';
    document.body.appendChild(div);
  }
  return div;
};

export default function WebGLMapTiles({
  panX, panY, scale, planeYScale, myObfPos, mode,
  isDesktop = false, performanceMode = 'high',
  sceneWorldScale = 1,
}: WebGLMapTilesProps) {
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const mapReadyRef = useRef(false);
  const lastJumpRef = useRef(0);
  const textureDirtyRef = useRef(false);
  // SPRINT 3c: Pause khi tab hidden
  const isPageVisibleRef = useRef(true);

  const meshRef = useRef<THREE.Mesh>(null);
  const { gl, invalidate } = useThree();
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
    container.style.width = `${PROXY_SIZE}px`;
    container.style.height = `${PROXY_SIZE}px`;
    const safeScale = scale.get() || 1;
    const initialZoom = 9.47 + Math.log2(safeScale * (PROXY_SIZE / 2048));

    // Tính toán DPR của màn hình hiện tại (tối đa 2 để tránh tốn quá nhiều VRAM)
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvasWidth = PROXY_SIZE * dpr;
    const canvasHeight = PROXY_SIZE * dpr;

    // Proxy 2D canvas — kích thước thật phải bằng kích thước MapLibre render (có tính dpr)
    const proxyCanvas = document.createElement('canvas');
    proxyCanvas.width = canvasWidth;
    proxyCanvas.height = canvasHeight;
    const ctx2d = proxyCanvas.getContext('2d', { willReadFrequently: false });

    let map: maplibregl.Map | null = null;
    let isCancelled = false;

    // Fetch style json, patch null numeric expressions, then init map
    fetch('https://tiles.openfreemap.org/styles/positron')
      .then(res => res.json())
      .then(style => {
        if (isCancelled) return;
        const patchedStyle = patchStyleExpression(style);

        map = new maplibregl.Map({
          container,
          style: patchedStyle,
          center: [myObfPos.lng, myObfPos.lat],
          zoom: isNaN(initialZoom) ? 15 : initialZoom,
          interactive: false,
          attributionControl: false,
          fadeDuration: 0,
        });

        map.on('load', () => {
          mapReadyRef.current = true;
          if (!map) return;
          const mapCanvas = map.getCanvas();

          map.on('render', () => {
            // SPRINT 3c: Skip copy khi tab hidden
            if (!ctx2d || !mapReadyRef.current || !isPageVisibleRef.current) return;
            try {
              // Vẽ với kích thước thật của canvas
              ctx2d.drawImage(mapCanvas, 0, 0, canvasWidth, canvasHeight);
              textureDirtyRef.current = true;
              invalidateRef.current(); // Sprint 2: trigger R3F frame
            } catch {
              // bỏ qua khi canvas đang transition
            }
          });

          const texture = new THREE.CanvasTexture(proxyCanvas);
          texture.minFilter = THREE.LinearMipMapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.format = THREE.RGBAFormat;
          texture.flipY = true;
          texture.anisotropy = gl.capabilities.getMaxAnisotropy();
          texture.generateMipmaps = true;
          texture.needsUpdate = true;

          textureRef.current = texture;
          if (materialRef.current) {
            materialRef.current.map = texture;
            materialRef.current.needsUpdate = true;
          }
        });

        mapRef.current = map;
      })
      .catch(err => {
        console.error('Failed to load map style:', err);
      });

    // SPRINT 3d: Cleanup đầy đủ khi component unmount hoặc mode thay đổi
    return () => {
      isCancelled = true;
      mapReadyRef.current = false;
      textureDirtyRef.current = false;
      if (map) {
        map.remove();
      }
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
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
      const currentProxySize = getProxySize(isDesktop, performanceMode);
      
      // Calculate precise zoom so that the proxy canvas exactly spans the visible 3D width.
      // 6255 is derived from (360 * DEGREES_TO_PX * MAP_PLANE_SCALE * MAP_COORD_SCENE_SCALE) / (512 * 0.56)
      // This ensures 1:1 pixel mapping at the focal plane, guaranteeing maximum text crispness.
      // We add a larger buffer to prevent seeing edges when zooming out heavily
      const buffer = 1.2;
      const exactZoom = Math.log2(
        (currentProxySize * 6255 * sceneWorldScale * Math.max(scale.get() || 1, 0.01)) / (viewportWidth * buffer)
      );
      
      if (Math.random() < 0.02) {
          console.log(`[Map_Render] currentProxySize=${currentProxySize}, buffer=${buffer}, scale=${scale.get()?.toFixed(5)}, exactZoom=${exactZoom.toFixed(2)}`);
      }

      let zoom = exactZoom;

      if (!isFinite(zoom)) zoom = 15;
      if (!isFinite(center.lat)) center.lat = myObfPos.lat;
      if (!isFinite(center.lng)) center.lng = myObfPos.lng;

      try {
        // Thay easeTo bằng jumpTo để Mapbox theo sát React state mà không tự tạo animation đè lên (tránh giật lag)
        mapRef.current.jumpTo({
          center: [center.lng, center.lat],
          zoom,
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

    if (meshRef.current) {
      const currentZoom = mapRef.current.getZoom();
      const currentCenter = mapRef.current.getCenter();
      const PROXY_SIZE = getProxySize(isDesktop, performanceMode);
      
      // Tính toán kích thước 3D plane động để khớp hoàn hảo 100% với diện tích địa lý texture
      const planeSizeX = (PROXY_SIZE * 360 * DEGREES_TO_PX * MAP_PLANE_SCALE * MAP_COORD_SCENE_SCALE * sceneWorldScale) / (512 * Math.pow(2, currentZoom));
      const planeSizeY = planeSizeX * Math.cos((currentCenter.lat * Math.PI) / 180);
      
      meshRef.current.scale.set(planeSizeX, planeSizeY, 1);
      
      // Dịch chuyển plane để center của texture (hiện đang tại currentCenter) nằm đúng tọa độ 3D của currentCenter
      const x = (currentCenter.lng - myObfPos.lng) * DEGREES_TO_PX * MAP_PLANE_SCALE * MAP_COORD_SCENE_SCALE * sceneWorldScale;
      const zCoord = -(currentCenter.lat - myObfPos.lat) * DEGREES_TO_PX * MAP_PLANE_SCALE * MAP_COORD_SCENE_SCALE * sceneWorldScale;
      
      meshRef.current.position.set(x, -0.2, zCoord);
    }
  });

  if (mode !== 'roadmap') return null;

  return (
    <mesh ref={meshRef} rotation-x={-Math.PI / 2} position={[0, -0.2, 0]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial ref={materialRef} color="#e8e8e4" />
    </mesh>
  );
}
