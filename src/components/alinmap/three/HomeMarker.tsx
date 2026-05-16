import React from 'react';
import { Billboard } from '@react-three/drei';

interface HomeMarkerProps {
  position: [number, number, number];
}

export default function HomeMarker({ position }: HomeMarkerProps) {
  return (
    <Billboard follow position={position}>
      <group renderOrder={28}>
        <mesh position={[0, 0.36, 0]} renderOrder={30}>
          <boxGeometry args={[0.72, 0.56, 0.72]} />
          <meshBasicMaterial color="#0f172a" transparent opacity={0.92} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.82, 0]} rotation={[0, Math.PI / 4, 0]} renderOrder={31}>
          <coneGeometry args={[0.62, 0.42, 4]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.98} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.05, 0]} renderOrder={29}>
          <circleGeometry args={[0.98, 32]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.18} depthWrite={false} />
        </mesh>
      </group>
    </Billboard>
  );
}
