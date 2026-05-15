import React, { useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import ZenKoiPond from './ZenKoiPond';
import { useThree } from '@react-three/fiber';
import type { AlinMapMode } from '../constants';

interface GroundProps {
    mapMode: AlinMapMode;
    roadmapWorldScale?: number;
    onGroundClick?: (point: THREE.Vector3) => void;
    groundRef?: React.RefObject<THREE.Mesh | null>;
}

const ROADMAP_HIT_SIZE = 90000;

export default function Ground({ mapMode, onGroundClick, groundRef }: GroundProps) {
    const internalRef = useRef<THREE.Mesh>(null);
    const meshRef = groundRef || internalRef;
    const { camera } = useThree();

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onGroundClick?.(e.point);
    };

    return (
        <group>
            <mesh ref={meshRef} rotation-x={-Math.PI / 2} position={[0, -1, 0]} receiveShadow onClick={handleClick}>
                <planeGeometry args={[ROADMAP_HIT_SIZE, ROADMAP_HIT_SIZE, 1, 1]} />
                <meshBasicMaterial visible={false} />
            </mesh>

            {mapMode === 'satellite' && (
                <ZenKoiPond camPosRef={{ current: camera.position } as React.RefObject<THREE.Vector3>} />
            )}
        </group>
    );
}
