import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ProceduralBoatProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
}

export default function ProceduralBoat({ position, rotation = [0, 0, 0], scale = 1.5 }: ProceduralBoatProps) {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (!groupRef.current) return;
        const t = state.clock.getElapsedTime();
        // Bobbing on waves
        groupRef.current.position.y = position[1] + Math.sin(t * 2.5) * 0.05 + 0.1;
        // Slight rocking
        groupRef.current.rotation.z = Math.sin(t * 1.5) * 0.06;
        groupRef.current.rotation.x = Math.sin(t * 1.2) * 0.04;
    });

    return (
        <group position={position} rotation={rotation} ref={groupRef} scale={scale}>
            {/* Hull */}
            <mesh position={[0, 0.1, 0]} castShadow>
                <boxGeometry args={[0.5, 0.2, 1.2]} />
                <meshStandardMaterial color="#78350f" roughness={0.9} />
            </mesh>
            {/* Bow (front) */}
            <mesh position={[0, 0.1, 0.7]} rotation={[-Math.PI / 6, 0, 0]} castShadow>
                <boxGeometry args={[0.5, 0.2, 0.4]} />
                <meshStandardMaterial color="#92400e" roughness={0.9} />
            </mesh>
            {/* Stern (back) */}
            <mesh position={[0, 0.15, -0.65]} castShadow>
                <boxGeometry args={[0.5, 0.3, 0.2]} />
                <meshStandardMaterial color="#92400e" roughness={0.9} />
            </mesh>
            {/* Mast */}
            <mesh position={[0, 0.7, 0.1]} castShadow>
                <cylinderGeometry args={[0.02, 0.04, 1.2]} />
                <meshStandardMaterial color="#451a03" />
            </mesh>
            {/* Sail */}
            <mesh position={[0, 0.6, 0.2]} castShadow>
                <coneGeometry args={[0.4, 0.8, 4]} />
                <meshStandardMaterial color="#e0f2fe" side={THREE.DoubleSide} roughness={0.4} />
            </mesh>
            {/* Flag */}
            <mesh position={[0, 1.35, -0.05]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[0.2, 0.15]} />
                <meshStandardMaterial color="#38bdf8" side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}
