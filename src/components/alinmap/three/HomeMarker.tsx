import React from 'react';
import { Billboard, Text } from '@react-three/drei';

interface HomeMarkerProps {
  position: [number, number, number];
}

export default function HomeMarker({ position }: HomeMarkerProps) {
  return (
    <Billboard follow position={position} renderOrder={999} raycast={() => null}>
      <Text
        position={[0, 0.15, 0]}
        fontSize={0.78}
        color="#38bdf8"
        outlineColor="#0f172a"
        outlineWidth={0.05}
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        ⌂
      </Text>
    </Billboard>
  );
}
