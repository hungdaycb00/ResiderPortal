import { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MotionValue } from 'framer-motion';
import { clamp, CAMERA_HEIGHT_RATIO_DEFAULT } from '../constants';

interface CameraRigProps {
    scale: MotionValue<number>;
    cameraHeightOffset: number;
    perspectivePx: number;
    cameraFov?: number;
    minDistance?: number;
}

export default function CameraRig({ scale, cameraHeightOffset, perspectivePx, cameraFov, minDistance = 140 }: CameraRigProps) {
    const { camera } = useThree();
    const targetPosRef = useRef(new THREE.Vector3());

    useFrame((_, delta) => {
        // Đồng bộ FOV khi giá trị perspective thay đổi từ UI
        if (cameraFov && (camera as THREE.PerspectiveCamera).isPerspectiveCamera && (camera as THREE.PerspectiveCamera).fov !== cameraFov) {
            (camera as THREE.PerspectiveCamera).fov = cameraFov;
            (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
        }

        const zoom = clamp(scale.get() || 1, 0.08, 8);
        const depthFit = perspectivePx * 0.56;
        const distance = clamp(depthFit / zoom, minDistance, 9000);
        const baseHeight = distance * CAMERA_HEIGHT_RATIO_DEFAULT;
        const height = baseHeight + cameraHeightOffset;

        targetPosRef.current.set(0, height, distance);
        camera.position.lerp(targetPosRef.current, Math.min(1, delta * 6));
        camera.lookAt(0, cameraHeightOffset, 0);
    });

    return null;
}
