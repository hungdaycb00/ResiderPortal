import React, { useEffect, useMemo, useState } from 'react';
import { Billboard } from '@react-three/drei';
import type { MotionValue } from 'framer-motion';
import * as THREE from 'three';
import { makeLootSpriteTexture, AVATAR_PLANE_SIZE } from '../sceneUtils';

const FOOTPRINT_WORLD_Y = 0.01; // Vòng tròn click đặt ngay trên mặt đất (ground y=0)

/**
 * BASE_LOOT_SCALE = 0.2 — giống hệt baseAvatarScale trong AvatarBillboard.
 * Điều này đảm bảo LootSprite có cùng tỷ lệ gốc với avatar trên map.
 */
const BASE_LOOT_SCALE = 0.2;

interface LootSpriteProps {
    position: [number, number, number];
    icon?: string;
    type?: string;
    title?: string;
    accent?: string;
    /** Hệ số nhân thêm (1.0 = cùng size avatar, 1.5 = lớn hơn 50%). */
    sizeMultiplier?: number;
    renderOrder?: number;
    interactive?: boolean;
    onClick?: () => void;
    /** MotionValue zoom từ camera — giống zoomScale trong AvatarBillboard. */
    zoomScale?: MotionValue<number>;
}

const LootSprite: React.FC<LootSpriteProps> = ({
    position,
    icon,
    type = 'item',
    title,
    accent = '#22d3ee',
    sizeMultiplier = 1,
    renderOrder = 35,
    interactive = true,
    onClick,
    zoomScale,
}) => {
    const texture = useMemo(() => makeLootSpriteTexture(type, title, accent, icon), [type, title, accent, icon]);
    const [currentZoomScale, setCurrentZoomScale] = useState(() => zoomScale?.get?.() ?? 1);

    // Subscribe zoom MotionValue — cùng pattern với AvatarBillboard
    useEffect(() => {
        if (!zoomScale) {
            setCurrentZoomScale(1);
            return;
        }
        setCurrentZoomScale(zoomScale.get());
        const unsubscribe = zoomScale.on('change', (value) => {
            setCurrentZoomScale(value);
        });
        return unsubscribe;
    }, [zoomScale]);

    useEffect(() => () => { texture.dispose(); }, [texture]);

    // ── Scale tính toán giống hệt AvatarBillboard ──
    // zoomOutT: 0 khi zoom=1 (gần nhất), 1 khi zoom<=0.5 (xa nhất)
    const zoomOutT = Math.max(0, Math.min(1, (1 - currentZoomScale) / 0.5));
    // Zoom xa → icon lớn hơn để vẫn nhìn thấy (giống avatar)
    const zoomMultiplier = 1 + zoomOutT * 2;
    const lootScale = BASE_LOOT_SCALE * zoomMultiplier * sizeMultiplier;
    const planeSize = AVATAR_PLANE_SIZE * lootScale;

    // Vị trí Y cục bộ để vòng tròn footprint nằm ở FOOTPRINT_WORLD_Y trong world space
    const footprintLocalY = FOOTPRINT_WORLD_Y - position[1];
    // Bán kính vòng tròn click — tỉ lệ với kích thước hiển thị thực tế
    const footprintRadius = Math.max(planeSize * 0.65, 0.5);

    return (
        <group
            position={position}
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
            {/* Sprite chính — dùng planeSize thay vì Billboard scale, giống avatar. */}
            <Billboard follow>
                <mesh renderOrder={renderOrder} raycast={interactive ? undefined : () => {}}>
                    <planeGeometry args={[planeSize, planeSize]} />
                    <meshBasicMaterial
                        map={texture}
                        transparent
                        alphaTest={0.1}
                        depthWrite={false}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            </Billboard>
            {/* Click footprint — vòng tròn nằm ngang trên mặt đất */}
            <mesh
                position={[0, footprintLocalY, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                renderOrder={renderOrder - 1}
            >
                <circleGeometry args={[footprintRadius, 16]} />
                <meshBasicMaterial color="black" transparent opacity={0.10} depthWrite={false} />
            </mesh>
        </group>
    );
};

export default React.memo(LootSprite);
