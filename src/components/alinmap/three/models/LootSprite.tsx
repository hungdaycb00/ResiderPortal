import React, { useMemo, useEffect, useRef } from 'react';
import { Billboard } from '@react-three/drei';
import { makeLootSpriteTexture } from '../sceneUtils';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface LootSpriteProps {
    position: [number, number, number];
    type: string;
    title?: string;
    accent?: string;
    scale?: number;
    onClick?: () => void;
}

export default function LootSprite({ position, type, title, accent = '#22d3ee', scale = 1, onClick }: LootSpriteProps) {
    const texture = useMemo(() => makeLootSpriteTexture(type, title, accent), [type, title, accent]);
    const groupRef = useRef<THREE.Group>(null);

    useEffect(() => {
        return () => {
            texture.dispose();
        };
    }, [texture]);

    useFrame((state) => {
        if (!groupRef.current) return;
        const t = state.clock.getElapsedTime();
        // Hovering animation
        if (type !== 'target') {
            groupRef.current.position.y = position[1] + Math.sin(t * 3 + position[0]) * 0.15;
        }
    });

    return (
        <group position={position} ref={groupRef} onClick={(e) => {
            if (onClick) {
                e.stopPropagation();
                onClick();
            }
        }}>
            <Billboard follow lockX lockY lockZ>
                {/* Tăng scale để hình ảnh canvas hiện rõ */}
                <mesh position={[0, 0.5, 0]} renderOrder={type === 'target' ? 25 : 30} scale={[2.5 * scale, 2.5 * scale, 1]}>
                    <planeGeometry args={[10, 10]} />
                    <meshBasicMaterial map={texture} transparent depthTest={false} depthWrite={false} />
                </mesh>
            </Billboard>
        </group>
    );
}
