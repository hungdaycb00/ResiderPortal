import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { MotionValue } from 'framer-motion';
import * as THREE from 'three';
import { MAP_PLANE_SCALE } from '../../constants';
import { pxToScene, AVATAR_PLANE_SIZE } from '../sceneUtils';
import LootSprite from './LootSprite';
import { getDistanceMeters } from '../../looter-game/backpack/utils';
import { GAME_CONFIG } from '../../looter-game/gameConfig';

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
    reducedMotion?: boolean;
}

const ProceduralBoat: React.FC<ProceduralBoatProps> = ({
    position,
    rotation = [0, 0, 0],
    scale = 4 * GAME_CONFIG.COMBAT_BOAT_SCALE_MULTIPLIER,
    offsetX,
    offsetY,
    currentLat,
    currentLng,
    fortressLat,
    fortressLng,
    reducedMotion = false,
}) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (!groupRef.current) return;

        const t = state.clock.getElapsedTime();
        const x = position[0] + pxToScene((offsetX?.get?.() ?? 0) * MAP_PLANE_SCALE);
        const z = position[2] + pxToScene((offsetY?.get?.() ?? 0) * MAP_PLANE_SCALE);
        const bobY = reducedMotion ? 0 : Math.sin(t * 2.1) * 1.5;
        const rockZ = reducedMotion ? 0 : Math.sin(t * 1.2) * 0.025;

        groupRef.current.position.set(x, position[1] + bobY + 5, z);
        groupRef.current.rotation.z = rockZ;
    });

    const distToFortress = useMemo(() => {
        if (currentLat == null || currentLng == null || fortressLat == null || fortressLng == null) return null;
        return Math.round(getDistanceMeters(currentLat, currentLng, fortressLat, fortressLng));
    }, [currentLat, currentLng, fortressLat, fortressLng]);

    return (
        <group position={position} rotation={rotation} ref={groupRef}>
            <LootSprite
                position={[0, 0, 0]}
                type="boat"
                title="You"
                accent="#38bdf8"
                scale={scale}
                size={AVATAR_PLANE_SIZE * 1.1}
                interactive={false}
            />
            {distToFortress != null && !reducedMotion && (
                <Html position={[0, -9, 0]} center transform sprite distanceFactor={20} occlude={false}>
                    <div style={{ color: '#94a3b8', fontSize: 9, fontWeight: 700, textShadow: '0 0 6px rgba(0,0,0,0.9)', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                        {distToFortress}m → 🏰
                    </div>
                </Html>
            )}
        </group>
    );
};

export default React.memo(ProceduralBoat);
