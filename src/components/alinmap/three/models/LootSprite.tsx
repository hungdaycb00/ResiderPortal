import React, { useEffect, useMemo } from 'react';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { makeLootSpriteTexture, AVATAR_PLANE_SIZE, AVATAR_RING_RADIUS } from '../sceneUtils';

const FOOTPRINT_WORLD_Y = 0.01; // Vòng tròn click đặt ngay trên mặt đất (ground y=0)

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

    // Vị trí Y cục bộ để vòng tròn footprint nằm ở FOOTPRINT_WORLD_Y trong world space,
    // bất kể item được đặt ở độ cao nào hay scale bao nhiêu.
    const footprintLocalY = (FOOTPRINT_WORLD_Y - position[1]) / scale;

    // Bán kính vòng tròn click — tỉ lệ với size, tối thiểu 3.5 để luôn dễ click
    const footprintRadius = Math.max(size * 0.5, 3.5);

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
            {/* Sprite chính — plane đứng thẳng vuông góc nền map (lockX lockZ) */}
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
            {/* Click footprint — vòng tròn nằm ngang trên mặt đất, LUÔN trên ground (y=-1) */}
            <mesh
                position={[0, footprintLocalY, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                renderOrder={renderOrder - 1}
            >
                <circleGeometry args={[footprintRadius, 16]} />
                <meshBasicMaterial color="black" transparent opacity={0.10} depthWrite={false} />
            </mesh>
        </Billboard>
    );
};

export default React.memo(LootSprite);
