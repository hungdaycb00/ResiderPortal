import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ProceduralFortressProps {
    position: [number, number, number];
    scale?: number;
}

/**
 * Thành trì 3D (Procedural).
 * Đã chuẩn hóa kích thước hình học (S=25) để đạt đường kính ~75 units (gấp 3 lần item).
 */
export default function ProceduralFortress({ position, scale = 1 }: ProceduralFortressProps) {
    const groupRef = useRef<THREE.Group>(null);
    const floatRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (!floatRef.current) return;
        const t = state.clock.getElapsedTime();
        // Hovering fortress magic effect
        floatRef.current.position.y = Math.sin(t * 1.5) * 5; 
    });

    // Hệ số tỉ lệ nội bộ để đạt kích thước 75 units
    const S = 25;

    return (
        <group position={position} ref={groupRef} scale={scale}>
            <group ref={floatRef} position={[0, S * 0.4, 0]}>
                {/* Floating Island Base */}
                <mesh castShadow receiveShadow position={[0, 0, 0]}>
                    <cylinderGeometry args={[S * 1.5, S * 0.2, S * 0.8, 7]} />
                    <meshStandardMaterial color="#4d7c0f" roughness={0.9} />
                </mesh>
                
                {/* Stone Base / Walls */}
                <mesh castShadow receiveShadow position={[0, S * 0.5, 0]}>
                    <cylinderGeometry args={[S * 0.8, S * 1.2, S * 0.4, 6]} />
                    <meshStandardMaterial color="#64748b" roughness={0.8} />
                </mesh>

                {/* Main Tower */}
                <mesh castShadow position={[0, S * 1.2, 0]}>
                    <cylinderGeometry args={[S * 0.4, S * 0.5, S * 1.2, 8]} />
                    <meshStandardMaterial color="#94a3b8" roughness={0.7} />
                </mesh>

                {/* Tower Roof */}
                <mesh castShadow position={[0, S * 2.0, 0]}>
                    <coneGeometry args={[S * 0.6, S * 0.8, 8]} />
                    <meshStandardMaterial color="#dc2626" roughness={0.6} />
                </mesh>

                {/* Small Tower 1 */}
                <mesh castShadow position={[S * 0.7, S * 0.9, S * 0.5]}>
                    <cylinderGeometry args={[S * 0.2, S * 0.25, S * 0.8, 6]} />
                    <meshStandardMaterial color="#94a3b8" />
                </mesh>
                <mesh castShadow position={[S * 0.7, S * 1.4, S * 0.5]}>
                    <coneGeometry args={[S * 0.3, S * 0.4, 6]} />
                    <meshStandardMaterial color="#dc2626" />
                </mesh>

                {/* Small Tower 2 */}
                <mesh castShadow position={[-S * 0.8, S * 0.9, -S * 0.2]}>
                    <cylinderGeometry args={[S * 0.2, S * 0.25, S * 0.8, 6]} />
                    <meshStandardMaterial color="#94a3b8" />
                </mesh>
                <mesh castShadow position={[-S * 0.8, S * 1.4, -S * 0.2]}>
                    <coneGeometry args={[S * 0.3, S * 0.4, 6]} />
                    <meshStandardMaterial color="#dc2626" />
                </mesh>

                {/* Gateway */}
                <mesh castShadow position={[0, S * 0.6, S * 1.05]}>
                    <boxGeometry args={[S * 0.6, S * 0.5, S * 0.4]} />
                    <meshStandardMaterial color="#475569" />
                </mesh>
                <mesh position={[0, S * 0.5, S * 1.26]}>
                    <boxGeometry args={[S * 0.3, S * 0.4, S * 0.05]} />
                    <meshStandardMaterial color="#1e293b" />
                </mesh>

                {/* Glowing Core below */}
                <mesh position={[0, -S * 0.5, 0]}>
                    <sphereGeometry args={[S * 0.3, 16, 16]} />
                    <meshBasicMaterial color="#f59e0b" transparent opacity={0.8} />
                </mesh>
            </group>
        </group>
    );
}
