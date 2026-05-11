import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useTexture } from '@react-three/drei';
import type { MotionValue } from 'framer-motion';
import * as THREE from 'three';
import { MAP_PLANE_SCALE } from '../../constants';
import { pxToScene, AVATAR_PLANE_SIZE } from '../sceneUtils';
import { getDistanceMeters } from '../../looter-game/backpack/utils';

interface ProceduralBoatProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
    offsetX?: MotionValue<number>;
    offsetY?: MotionValue<number>;
    currentLat?: number | null;
    currentLng?: number | null;
    fortressLat?: number | null;
    fortressLng?: number | null;
}

// Map các hướng sang tọa độ offset của texture (Sprite Sheet 2x2)
// Three.js UV: (0,0) là bottom-left
const DIRECTION_OFFSETS: Record<string, [number, number]> = {
    'UP':    [0, 0.5],   // Top-Left
    'RIGHT': [0.5, 0.5], // Top-Right
    'LEFT':  [0, 0],     // Bottom-Left
    'DOWN':  [0.5, 0],   // Bottom-Right
};

const ProceduralBoat: React.FC<ProceduralBoatProps> = ({
    position,
    rotation = [0, 0, 0],
    scale = 6, // Tăng scale một chút vì sprite sheet chứa 4 thuyền
    offsetX,
    offsetY,
    currentLat,
    currentLng,
    fortressLat,
    fortressLng,
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const texture = useTexture('/assets/looter/boat_sheet.png');
    const [direction, setDirection] = useState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('DOWN');
    
    // Lưu vị trí trước đó để tính vector di chuyển
    const lastPos = useRef({ x: 0, z: 0 });

    useFrame((state) => {
        if (!groupRef.current) return;
        const t = state.clock.getElapsedTime();
        
        const curX = position[0] + pxToScene((offsetX?.get?.() ?? 0) * MAP_PLANE_SCALE);
        const curZ = position[2] + pxToScene((offsetY?.get?.() ?? 0) * MAP_PLANE_SCALE);
        
        // Tính delta để xác định hướng
        const dx = curX - lastPos.current.x;
        const dz = curZ - lastPos.current.z;

        // Chỉ cập nhật hướng nếu có sự di chuyển đáng kể
        if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
            if (Math.abs(dx) > Math.abs(dz)) {
                setDirection(dx > 0 ? 'RIGHT' : 'LEFT');
            } else {
                setDirection(dz > 0 ? 'DOWN' : 'UP');
            }
        }

        lastPos.current = { x: curX, z: curZ };

        // Cập nhật vị trí và hiệu ứng nhấp nhô (bobbing)
        groupRef.current.position.set(curX, position[1] + Math.sin(t * 2.1) * 0.8 + 5, curZ);
        groupRef.current.rotation.z = Math.sin(t * 1.2) * 0.025;
    });

    // Cấu hình texture để chỉ hiển thị 1 quadrant
    const boatTexture = useMemo(() => {
        const tex = texture.clone();
        tex.repeat.set(0.5, 0.5);
        const offset = DIRECTION_OFFSETS[direction];
        tex.offset.set(offset[0], offset[1]);
        tex.needsUpdate = true;
        return tex;
    }, [texture, direction]);

    const distToFortress = useMemo(() => {
        if (currentLat == null || currentLng == null || fortressLat == null || fortressLng == null) return null;
        return Math.round(getDistanceMeters(currentLat, currentLng, fortressLat, fortressLng));
    }, [currentLat, currentLng, fortressLat, fortressLng]);

    const size = AVATAR_PLANE_SIZE * 1.5;

    return (
        <group position={position} rotation={rotation} ref={groupRef}>
            {/* Thuyền chính */}
            <mesh position={[0, 0, 0]} renderOrder={40}>
                <planeGeometry args={[size * scale, size * scale]} />
                <meshBasicMaterial 
                    map={boatTexture} 
                    transparent 
                    alphaTest={0.1}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>

            {/* Shadow dưới thuyền */}
            <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[size * scale * 0.3, 16]} />
                <meshBasicMaterial color="black" transparent opacity={0.2} depthWrite={false} />
            </mesh>

            {/* Khoảng cách tới pháo đài */}
            {distToFortress != null && (
                <Html position={[0, -size * scale * 0.5 - 2, 0]} center transform sprite distanceFactor={20} occlude={false}>
                    <div style={{ 
                        color: '#f8fafc', 
                        fontSize: 10, 
                        fontWeight: 900, 
                        textShadow: '0 0 8px rgba(0,0,0,1)', 
                        whiteSpace: 'nowrap', 
                        fontFamily: 'system-ui',
                        padding: '2px 8px',
                        background: 'rgba(0,0,0,0.4)',
                        borderRadius: '12px'
                    }}>
                        {distToFortress}m → 🏰
                    </div>
                </Html>
            )}
        </group>
    );
};

export default React.memo(ProceduralBoat);

