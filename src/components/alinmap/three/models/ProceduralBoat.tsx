import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
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
    reducedMotion?: boolean;
    sceneWorldScale?: number;
}

const ProceduralBoat: React.FC<ProceduralBoatProps> = ({
    position,
    rotation = [0, 0, 0],
    scale = 2 * GAME_CONFIG.COMBAT_BOAT_SCALE_MULTIPLIER,
    offsetX,
    offsetY,
    reducedMotion = false,
    sceneWorldScale = 1,
}) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (!groupRef.current) return;

        const t = state.clock.getElapsedTime();
        const x = position[0] + pxToScene((offsetX?.get?.() ?? 0) * MAP_PLANE_SCALE) * sceneWorldScale;
        const z = position[2] + pxToScene((offsetY?.get?.() ?? 0) * MAP_PLANE_SCALE) * sceneWorldScale;
        const bobY = reducedMotion ? 0 : Math.sin(t * 2.1) * 1.5;
        const rockZ = reducedMotion ? 0 : Math.sin(t * 1.2) * 0.025;

        groupRef.current.position.set(x, position[1] + bobY + 5, z);
        groupRef.current.rotation.z = rockZ;
    });



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
        </group>
    );
};

export default React.memo(ProceduralBoat);
