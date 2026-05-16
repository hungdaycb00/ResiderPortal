import React from 'react';
import { Billboard } from '@react-three/drei';
import { AVATAR_PLANE_SIZE } from './sceneUtils';

interface HomeMarkerProps {
  position: [number, number, number];
}

export default function HomeMarker({ position }: HomeMarkerProps) {
  const baseSize = AVATAR_PLANE_SIZE * 0.15;
  const houseWidth = baseSize * 1.35;
  const houseDepth = baseSize * 1.15;
  const houseHeight = baseSize * 0.95;
  const roofHeight = baseSize * 0.7;

  return (
    <Billboard follow position={position} renderOrder={999}>
      <group renderOrder={999} scale={1}>
        <mesh position={[0, houseHeight * 0.45, 0]} renderOrder={1000}>
          <boxGeometry args={[houseWidth, houseHeight, houseDepth]} />
          <meshBasicMaterial color="#0f172a" transparent opacity={0.92} depthWrite={false} depthTest={false} />
        </mesh>
        <mesh position={[0, houseHeight + roofHeight * 0.35, 0]} rotation={[0, Math.PI / 4, 0]} renderOrder={1001}>
          <coneGeometry args={[houseWidth * 0.72, roofHeight, 4]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.98} depthWrite={false} depthTest={false} />
        </mesh>
        <mesh position={[0, 0.04, 0]} renderOrder={999}>
          <circleGeometry args={[baseSize * 0.95, 32]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.18} depthWrite={false} depthTest={false} />
        </mesh>
      </group>
    </Billboard>
  );
}
