import React, { useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

interface GroundProps {
    mapMode: 'grid' | 'satellite';
    onGroundClick?: (point: THREE.Vector3) => void;
    groundRef?: React.RefObject<THREE.Mesh | null>;
}

export default function Ground({ mapMode, onGroundClick, groundRef }: GroundProps) {
    const internalRef = useRef<THREE.Mesh>(null);
    const meshRef = groundRef || internalRef;

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onGroundClick?.(e.point);
    };

    return (
        <group>
            <mesh ref={meshRef} rotation-x={-Math.PI / 2} position={[0, -1, 0]} receiveShadow onClick={handleClick}>
                <planeGeometry args={[12000, 12000, 1, 1]} />
                <meshBasicMaterial
                    color={mapMode === 'satellite' ? '#02203a' : '#09141f'}
                />
            </mesh>
            <gridHelper args={[12000, 120, '#164158', '#0f2436']} position={[0, -0.98, 0]} />
            <mesh rotation-x={-Math.PI / 2} position={[0, -0.96, 0]}>
                <planeGeometry args={[12000, 12000]} />
                <meshBasicMaterial
                    color={mapMode === 'satellite' ? '#0d3b66' : '#050b12'}
                    transparent
                    opacity={0.18}
                />
            </mesh>
        </group>
    );
}
