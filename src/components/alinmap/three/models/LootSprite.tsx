import React, { useEffect, useMemo } from 'react';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { makeLootSpriteTexture, AVATAR_PLANE_SIZE, AVATAR_RING_RADIUS } from '../sceneUtils';

// Hằng số kích thước được đồng bộ với AvatarBillboard
const ITEM_SIZE = AVATAR_PLANE_SIZE;
const SHADOW_RADIUS = AVATAR_RING_RADIUS * 0.8;

interface LootSpriteProps {
    position: [number, number, number];
    icon?: string;
    type?: string;
    title?: string;
    accent?: string;
    scale?: number;
    size?: number;
    renderOrder?: number;
    interactive?: boolean;
    onClick?: () => void;
}

const LootSprite: React.FC<LootSpriteProps> = ({
    position,
    icon,
    type = 'item',
    title,
    accent = '#22d3ee',
    scale = 1,
    size = AVATAR_PLANE_SIZE,
    renderOrder = 35,
    interactive = true,
    onClick,
}) => {
    const texture = useMemo(() => makeLootSpriteTexture(type, title, accent, icon), [type, title, accent, icon]);

    useEffect(() => () => { texture.dispose(); }, [texture]);

    return (
        <Billboard
            lockX
            lockZ
            position={position}
            scale={[scale, scale, 1]}
            onClick={(e) => {
                e.stopPropagation();
                onClick?.();
            }}
            onPointerDown={(e) => {
                if (!onClick) return;
                e.stopPropagation();
            }}
            onPointerUp={(e) => {
                if (!onClick) return;
                e.stopPropagation();
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
            <mesh renderOrder={renderOrder} raycast={interactive ? undefined : () => {}}>
                <planeGeometry args={[size, size]} />
                <meshBasicMaterial
                    map={texture}
                    transparent
                    alphaTest={0.1}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>
            {interactive && (
            <mesh position={[0, -size * 0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[AVATAR_RING_RADIUS * 0.8, 16]} />
                <meshBasicMaterial color="black" transparent opacity={0.18} depthWrite={false} />
            </mesh>
            )}
        </Billboard>
    );
};

export default React.memo(LootSprite);
