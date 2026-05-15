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

const getOffscreenContainer = () => {
  let div = document.getElementById('maplibre-offscreen-container');
  if (!div) {
    div = document.createElement('div');
    div.id = 'maplibre-offscreen-container';
    div.style.position = 'fixed';
    div.style.left = '-9999px';
    div.style.top = '-9999px';
    div.style.width = '2048px';
    div.style.height = '2048px';
    div.style.pointerEvents = 'none';
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
  // Throttle: chỉ gọi jumpTo tối đa ~15fps để tránh quá tải MapLibre WebGL context
  const lastJumpRef = useRef(0);
  // Guard: chỉ cập nhật texture khi MapLibre context còn sống
  const mapReadyRef = useRef(false);

  useEffect(() => {
    if (mode !== 'roadmap' || !myObfPos) return;

    const container = getOffscreenContainer();
    const safeScale = scale.get() || 1;
    const initialZoom = getRoadmapTileZoom(safeScale);

    const map = new maplibregl.Map({
      container,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [myObfPos.lng, myObfPos.lat],
      zoom: isNaN(initialZoom) ? 15 : initialZoom,
      interactive: false,
      attributionControl: false,
      // @ts-ignore – MapLibre hỗ trợ preserveDrawingBuffer natively nhưng types có thể lỗi thời
      preserveDrawingBuffer: true,
      fadeDuration: 0,
    });

    map.on('load', () => {
      mapReadyRef.current = true;
      const canvas = map.getCanvas();

      // Tự phục hồi khi WebGL context bị mất (tránh lỗi texSubImage2D)
      canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        mapReadyRef.current = false;
        console.warn('[WebGLMapTiles] MapLibre context lost – sẽ tự phục hồi...');
      }, false);

      canvas.addEventListener('webglcontextrestored', () => {
        mapReadyRef.current = true;
        console.info('[WebGLMapTiles] MapLibre context restored');
      }, false);

      const texture = new THREE.CanvasTexture(canvas);
      // Tắt mipmap để bản đồ sắc nét khi zoom
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.format = THREE.RGBAFormat;
      // MapLibre render ngược trục Y trong WebGL – flipY để đúng chiều
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

    // Throttle jumpTo: gọi ~15fps thay vì 60fps để tránh quá tải context WebGL
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

      // Guard chống NaN / Infinity trước khi gọi jumpTo
      if (!isFinite(zoom)) zoom = 15;
      if (!isFinite(center.lat)) center.lat = myObfPos.lat;
      if (!isFinite(center.lng)) center.lng = myObfPos.lng;

      try {
        mapRef.current.jumpTo({ center: [center.lng, center.lat], zoom });
      } catch {
        // Bỏ qua – thường xảy ra khi context đang bị lost
      }
    }

    // Đồng bộ texture với MapLibre canvas mỗi frame
    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  });

  if (mode !== 'roadmap') return null;

  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.2, 0]}>
      <planeGeometry args={[180, 180]} />
      <meshBasicMaterial ref={materialRef} transparent opacity={1} color="#ffffff" />
    </mesh>
  );
}
