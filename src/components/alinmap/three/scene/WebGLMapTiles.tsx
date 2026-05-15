import React, { useEffect, useRef, useState } from 'react';
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
    // Đặt ngoài màn hình để không che khuất UI
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

  useEffect(() => {
    if (mode !== 'roadmap' || !myObfPos) return;
    
    const container = getOffscreenContainer();
    const initialZoom = getRoadmapTileZoom(scale.get());

    const map = new maplibregl.Map({
      container,
      style: 'https://tiles.openfreemap.org/styles/positron', // Nguồn bản đồ
      center: [myObfPos.lng, myObfPos.lat],
      zoom: initialZoom,
      interactive: false,
      attributionControl: false,
      // @ts-ignore - MapLibre supports this WebGL parameter natively but types might be outdated
      preserveDrawingBuffer: true, // Cho phép WebGL lấy canvas
      fadeDuration: 0,
    });
    
    map.on('load', () => {
      const canvas = map.getCanvas();
      const texture = new THREE.CanvasTexture(canvas);
      // Tắt mipmap để map sắc nét hơn khi zoom
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.format = THREE.RGBAFormat;
      // MapLibre render canvas ngược trục Y trong WebGL, cần lật lại
      texture.flipY = true;
      
      textureRef.current = texture;
      
      if (materialRef.current) {
        materialRef.current.map = texture;
        materialRef.current.needsUpdate = true;
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      if (textureRef.current) {
        textureRef.current.dispose();
      }
    };
  }, [mode, myObfPos]); // Phụ thuộc vào myObfPos ban đầu

  useFrame(() => {
    if (mapRef.current && myObfPos) {
      const center = getRoadmapCenterFromPan(myObfPos, panX.get(), panY.get(), planeYScale.get());
      const zoom = getRoadmapTileZoom(scale.get());
      mapRef.current.jumpTo({ center: [center.lng, center.lat], zoom });
    }

    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  });

  if (mode !== 'roadmap') return null;

  // Plane kích thước lớn để bao phủ không gian. 
  // 2048px texture sẽ map lên một vùng tương ứng. Cần map đúng world scale.
  // Khoảng 120 đơn vị 3D tương đương vùng hiển thị bình thường.
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.2, 0]}>
      <planeGeometry args={[180, 180]} />
      <meshBasicMaterial ref={materialRef} transparent opacity={1} color="#ffffff" />
    </mesh>
  );
}
