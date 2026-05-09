import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { MotionValue } from 'framer-motion';
import * as THREE from 'three';
import { MAP_PLANE_SCALE } from '../../constants';
import { pxToScene, AVATAR_PLANE_SIZE } from '../sceneUtils';
import LootSprite from './LootSprite';

interface ProceduralBoatProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
    offsetX?: MotionValue<number>;
    offsetY?: MotionValue<number>;
    planeYScale?: MotionValue<number>;
}

const ProceduralBoat: React.FC<ProceduralBoatProps> = ({
    position,
    rotation = [0, 0, 0],
    scale = 4,
    offsetX,
    offsetY,
    planeYScale,
}) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (!groupRef.current) return;
        const t = state.clock.getElapsedTime();
        const yScale = planeYScale?.get?.() ?? MAP_PLANE_SCALE;
        const x = position[0] + pxToScene((offsetX?.get?.() ?? 0) * MAP_PLANE_SCALE);
        const z = position[2] + pxToScene((offsetY?.get?.() ?? 0) * yScale);
        groupRef.current.position.set(x, position[1] + Math.sin(t * 2.1) * 1.5 + 5, z);
        groupRef.current.rotation.z = Math.sin(t * 1.2) * 0.025;
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
            />
        </group>
    );
};

export default React.memo(ProceduralBoat);
