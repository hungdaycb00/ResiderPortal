import React from 'react';
import { Billboard, Text } from '@react-three/drei';

interface HomeMarkerProps {
  position: [number, number, number];
}

export default function HomeMarker({ position }: HomeMarkerProps) {
  return (
    <Billboard follow position={position} renderOrder={999}>
      <group renderOrder={999} scale={1.75}>
        <mesh position={[0, 0.12, 0]} renderOrder={1000}>
          <circleGeometry args={[0.9, 32]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.28} depthWrite={false} depthTest={false} />
        </mesh>
        <mesh position={[0, 0.18, 0]} renderOrder={1001}>
          <circleGeometry args={[0.42, 32]} />
          <meshBasicMaterial color="#0f172a" transparent opacity={0.95} depthWrite={false} depthTest={false} />
        </mesh>
        <Text
          position={[0, 0.17, 0]}
          fontSize={0.92}
          color="#e0f2fe"
          outlineColor="#0f172a"
          outlineWidth={0.06}
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          ⌂
        </Text>
        <Text
          position={[0, 1.35, 0]}
          fontSize={0.34}
          color="#e0f2fe"
          outlineColor="#0f172a"
          outlineWidth={0.04}
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          HOME
        </Text>
      </group>
    </Billboard>
  );
}
