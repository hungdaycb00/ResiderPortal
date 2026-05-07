import { Billboard } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { makeLootSpriteTexture } from '../sceneUtils';

interface LootSpriteProps {
    position: [number, number, number];
    icon?: string;
    type?: string;
    title?: string;
    accent?: string;
    scale?: number;
    size?: number;
    onClick?: () => void;
}

export default function LootSprite({
    position,
    icon,
    type = 'item',
    title,
    accent = '#22d3ee',
    scale = 1,
    size = 25,
    onClick,
}: LootSpriteProps) {
    const texture = useMemo(() => makeLootSpriteTexture(type, title, accent, icon), [type, title, accent, icon]);

    useEffect(() => () => { texture.dispose(); }, [texture]);

    return (
        <Billboard
            follow
            position={position}
            scale={[scale, scale, 1]}
            onClick={(e) => {
                e.stopPropagation();
                (e as any).nativeEvent?.stopPropagation?.();
                (e as any).sourceEvent?.stopPropagation?.();
                onClick?.();
            }}
            onPointerDown={(e) => {
                if (!onClick) return;
                e.stopPropagation();
                (e as any).nativeEvent?.stopPropagation?.();
                (e as any).sourceEvent?.stopPropagation?.();
            }}
            onPointerUp={(e) => {
                if (!onClick) return;
                e.stopPropagation();
                (e as any).nativeEvent?.stopPropagation?.();
                (e as any).sourceEvent?.stopPropagation?.();
            }}
            onPointerOver={(e) => {
                if (!onClick) return;
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
                if (!onClick) return;
                e.stopPropagation();
                document.body.style.cursor = 'auto';
            }}
        >
            <mesh renderOrder={35}>
                <planeGeometry args={[size, size]} />
                <meshBasicMaterial
                    map={texture}
                    transparent
                    alphaTest={0.1}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>
            <mesh position={[0, -size * 0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[Math.max(8, size * 0.38), 16]} />
                <meshBasicMaterial color="black" transparent opacity={0.18} depthWrite={false} />
            </mesh>
        </Billboard>
    );
}
