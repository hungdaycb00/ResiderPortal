import React, { useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import ZenKoiPond from './ZenKoiPond';
import { useThree } from '@react-three/fiber';
import type { AlinMapMode } from '../constants';

interface GroundProps {
    mapMode: AlinMapMode;
    onGroundClick?: (point: THREE.Vector3) => void;
    groundRef?: React.RefObject<THREE.Mesh | null>;
}

const ROAD_SEGMENTS: Array<{
    position: [number, number, number];
    rotationZ: number;
    size: [number, number];
    color: string;
    opacity: number;
}> = [
    { position: [0, -0.97, 0], rotationZ: Math.PI / 10, size: [11800, 90], color: '#f8fafc', opacity: 0.82 },
    { position: [-700, -0.965, 780], rotationZ: -Math.PI / 5.5, size: [7800, 64], color: '#fde68a', opacity: 0.72 },
    { position: [1180, -0.96, -900], rotationZ: Math.PI / 3.7, size: [6200, 52], color: '#f1f5f9', opacity: 0.66 },
    { position: [-1850, -0.955, -1120], rotationZ: Math.PI / 2.9, size: [4200, 42], color: '#e2e8f0', opacity: 0.56 },
];

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
                <planeGeometry args={[12000, 12000, 1, 1]} />
                <meshBasicMaterial visible={false} />
            </mesh>
            
            {mapMode === 'roadmap' && (
                <group>
                    <mesh rotation-x={-Math.PI / 2} position={[0, -1.01, 0]}>
                        <planeGeometry args={[12000, 12000, 1, 1]} />
                        <meshBasicMaterial color="#dfe8dd" />
                    </mesh>
                    <mesh rotation-x={-Math.PI / 2} position={[0, -0.96, 0]}>
                        <planeGeometry args={[12000, 12000]} />
                        <meshBasicMaterial color="#b9d8e7" transparent opacity={0.12} />
                    </mesh>
                    <mesh rotation-x={-Math.PI / 2} position={[1400, -0.95, -1800]} rotation-z={-Math.PI / 8}>
                        <planeGeometry args={[8600, 260]} />
                        <meshBasicMaterial color="#9ed1e3" transparent opacity={0.42} />
                    </mesh>
                    {ROAD_SEGMENTS.map((road, index) => (
                        <mesh
                            key={`road-${index}`}
                            rotation-x={-Math.PI / 2}
                            rotation-z={road.rotationZ}
                            position={road.position}
                        >
                            <planeGeometry args={road.size} />
                            <meshBasicMaterial color={road.color} transparent opacity={road.opacity} />
                        </mesh>
                    ))}
                </group>
            )}

            {mapMode === 'satellite' && (
                <ZenKoiPond camPosRef={{ current: camera.position } as React.RefObject<THREE.Vector3>} />
            )}
        </group>
    );
}
