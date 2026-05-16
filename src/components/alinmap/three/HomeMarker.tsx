import React from 'react';
import { Billboard, Text } from '@react-three/drei';

interface HomeMarkerProps {
  position: [number, number, number];
}

export default function HomeMarker({ position }: HomeMarkerProps) {
  return (
    <Billboard follow position={position} renderOrder={999}>
      <group renderOrder={999}>
        <mesh position={[0, 0.08, 0]} renderOrder={1000}>
          <circleGeometry args={[0.88, 32]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.22} depthWrite={false} depthTest={false} />
        </mesh>
        <mesh position={[0, 0.14, 0]} renderOrder={1001}>
          <circleGeometry args={[0.42, 32]} />
          <meshBasicMaterial color="#0f172a" transparent opacity={0.95} depthWrite={false} depthTest={false} />
        </mesh>
        <Text
          position={[0, 1.1, 0]}
          fontSize={0.42}
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
