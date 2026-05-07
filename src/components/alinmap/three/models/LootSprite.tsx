import { Billboard, useTexture } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { createTextCanvasTexture } from '../sceneUtils';

interface LootSpriteProps {
    position: [number, number, number];
    emoji: string;
    scale?: number;
    onClick?: () => void;
}

/**
 * Render Item/Loot dưới dạng Sprite 2D chất lượng cao.
 * Kích thước chuẩn hóa là 25x25 scene units.
 */
export default function LootSprite({ position, emoji, scale = 1, onClick }: LootSpriteProps) {
    // Tạo texture từ emoji bằng canvas (chất lượng cao hơn emoji text mesh)
    const texture = useMemo(() => createTextCanvasTexture(emoji, 128), [emoji]);

    return (
        <Billboard
            position={position}
            // scale 1:1 vì planeGeometry đã set kích thước chuẩn 25 units
            scale={[scale, scale, 1]}
            onClick={(e) => {
                e.stopPropagation();
                onClick?.();
            }}
        >
            <mesh>
                {/* 25 units là kích thước cơ sở để nhìn rõ từ Camera cao 1600 */}
                <planeGeometry args={[25, 25]} />
                <meshBasicMaterial 
                    map={texture} 
                    transparent={true} 
                    alphaTest={0.1}
                    side={THREE.DoubleSide}
                />
            </mesh>
            
            {/* Đổ bóng giả bên dưới item */}
            <mesh position={[0, -12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[10, 16]} />
                <meshBasicMaterial color="black" transparent opacity={0.2} />
            </mesh>
        </Billboard>
    );
}
