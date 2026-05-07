import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MotionValue } from 'framer-motion';
import { clamp } from './sceneUtils';

interface CameraRigProps {
    scale: MotionValue<number>;
    cameraZ: MotionValue<number>;
    cameraHeightPct: number;
    perspectivePx: number;
}

export default function CameraRig({ scale, cameraZ, cameraHeightPct, perspectivePx }: CameraRigProps) {
    const { camera } = useThree();

    useFrame((_, delta) => {
        const zoom = clamp(scale.get() || 1, 0.08, 8);
        const depthFit = perspectivePx * 0.56;
        const distance = clamp(depthFit / zoom - (cameraZ.get() || 0) * 5, 95, 9000);
        const height = distance * (0.22 + cameraHeightPct / 620);

        const targetPos = new THREE.Vector3(0, height, distance);
        camera.position.lerp(targetPos, Math.min(1, delta * 12));
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
    });

    return null;
}
