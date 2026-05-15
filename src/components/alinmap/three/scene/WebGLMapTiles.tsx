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
}

// Kích thước proxy canvas (phải là power-of-2 để GPU cache tốt)
const PROXY_SIZE = 2048;

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
  panX, panY, scale, planeYScale, myObfPos, mode
}: WebGLMapTilesProps) {
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const mapReadyRef = useRef(false);
  const lastJumpRef = useRef(0);

  useEffect(() => {
    if (mode !== 'roadmap' || !myObfPos) return;

    const container = getOffscreenContainer();
    const safeScale = scale.get() || 1;
    const initialZoom = getRoadmapTileZoom(safeScale);

    // ── Proxy 2D canvas: Three.js đọc từ đây, KHÔNG đọc trực tiếp từ WebGL canvas của MapLibre
    // Điều này loại bỏ hoàn toàn xung đột giữa 2 WebGL context
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
      // KHÔNG dùng preserveDrawingBuffer – tránh mất WebGL context
      fadeDuration: 0,
    });

    map.on('load', () => {
      mapReadyRef.current = true;
      const mapCanvas = map.getCanvas();

      // Mỗi khi MapLibre render xong một frame, copy sang proxy 2D canvas
      // drawImage() an toàn vì được gọi đồng bộ trong render callback
      map.on('render', () => {
        if (!ctx2d || !mapReadyRef.current) return;
        try {
          ctx2d.clearRect(0, 0, PROXY_SIZE, PROXY_SIZE);
          ctx2d.drawImage(mapCanvas, 0, 0, PROXY_SIZE, PROXY_SIZE);
        } catch {
          // bỏ qua – có thể xảy ra khi canvas đang trong quá trình re-init
        }
      });

      // Three.js texture đọc từ 2D canvas (không phụ thuộc WebGL context của MapLibre)
      const texture = new THREE.CanvasTexture(proxyCanvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.format = THREE.RGBAFormat;
      // 2D canvas KHÔNG bị lật Y như WebGL canvas
      texture.flipY = false;

      textureRef.current = texture;
      if (materialRef.current) {
        materialRef.current.map = texture;
        materialRef.current.needsUpdate = true;
      }
    });

    mapRef.current = map;

    return () => {
      mapReadyRef.current = false;
      map.remove();
      mapRef.current = null;
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
    };
  }, [mode, myObfPos]);

  useFrame((_, delta) => {
    if (!mapReadyRef.current || !mapRef.current || !myObfPos) return;

    // Throttle jumpTo ~15fps để tránh quá tải MapLibre
    lastJumpRef.current += delta;
    if (lastJumpRef.current >= 0.066) {
      lastJumpRef.current = 0;

      let center = getRoadmapCenterFromPan(
        myObfPos,
        panX.get() || 0,
        panY.get() || 0,
        planeYScale.get() || 0.66
      );
      let zoom = getRoadmapTileZoom(scale.get() || 1);

      if (!isFinite(zoom)) zoom = 15;
      if (!isFinite(center.lat)) center.lat = myObfPos.lat;
      if (!isFinite(center.lng)) center.lng = myObfPos.lng;

      try {
        mapRef.current.jumpTo({ center: [center.lng, center.lat], zoom });
      } catch {
        // bỏ qua khi map chưa sẵn sàng
      }
    }

    // Đánh dấu texture cần update sau khi MapLibre render event copy xong
    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  });

  if (mode !== 'roadmap') return null;

  // Plane phải đủ lớn để phủ toàn bộ vùng nhìn từ camera
  // 1000 units ở sceneWorldScale=0.12 tương đương vùng nhìn rộng
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.2, 0]}>
      <planeGeometry args={[1000, 1000]} />
      <meshBasicMaterial ref={materialRef} transparent opacity={1} color="#ffffff" />
    </mesh>
  );
}
