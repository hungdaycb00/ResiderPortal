import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MotionValue } from 'framer-motion';
import { clamp } from '../constants';

interface CameraRigProps {
    scale: MotionValue<number>;
    /** Góc ngẩng (Pitch) từ mặt phẳng XZ: 10° = nhìn ngang, 89° = nhìn thẳng xuống */
    tiltAngle: MotionValue<number>;
    /** Góc xoay ngang (Yaw) quanh trục Y: 0° = nhìn về phía Nam (Z+) */
    cameraYawDeg: number;
    cameraHeightOffset: number;
    perspectivePx: number;
    cameraFov?: number;
    minDistance?: number;
}

/**
 * CameraRig (True 3D Orbit)
 *
 * Camera di chuyển theo hệ tọa độ cầu (Spherical Coordinates) xung quanh điểm nhìn trung tâm.
 * - Pitch (tiltAngle): Góc ngẩng của camera từ mặt đất.
 * - Yaw (cameraYawDeg): Góc xoay vòng của camera quanh trục Y.
 * - Radius (distance): Khoảng cách từ camera đến tâm, được tính từ zoom scale.
 *
 * Kiến trúc:
 *   Camera quỹ đạo xung quanh origin (0, cameraHeightOffset, 0).
 *   World group (moveGroupRef) di chuyển để tạo hiệu ứng pan.
 *   Không còn xoay World group để tạo góc nghiêng nữa.
 */
export default function CameraRig({
    scale,
    tiltAngle,
    cameraYawDeg,
    cameraHeightOffset,
    perspectivePx,
    cameraFov,
    minDistance = 140,
}: CameraRigProps) {
    const { camera } = useThree();
    const targetPosRef = useRef(new THREE.Vector3());
    const lookAtTargetRef = useRef(new THREE.Vector3());

    // ── Đồng bộ FOV ngay lập tức khi prop thay đổi ────────────────────────────
    useEffect(() => {
        if (!cameraFov) return;
        const cam = camera as THREE.PerspectiveCamera;
        if (!cam.isPerspectiveCamera) return;
        if (Math.abs(cam.fov - cameraFov) < 0.01) return;
        cam.fov = cameraFov;
        cam.updateProjectionMatrix();
    }, [camera, cameraFov]);

    useFrame((_, delta) => {
        const zoom = clamp(scale.get() || 1, 0.08, 8);
        const depthFit = perspectivePx * 0.56;
        const distance = clamp(depthFit / zoom, minDistance, 9000);

        // ── Tính vị trí Camera theo tọa độ cầu ──────────────────────────────
        // phi = góc ngẩng từ mặt phẳng XZ (giống altitude trong spherical coords)
        // theta = góc xoay quanh trục Y (azimuth)
        const pitchDeg = clamp(tiltAngle.get(), 8, 89);
        const phi   = THREE.MathUtils.degToRad(pitchDeg);     // elevation
        const theta = THREE.MathUtils.degToRad(cameraYawDeg); // azimuth

        const sinPhi   = Math.sin(phi);
        const cosPhi   = Math.cos(phi);
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        // Camera quỹ đạo quanh tâm (0, cameraHeightOffset, 0)
        const camX = distance * cosPhi * sinTheta;
        const camY = distance * sinPhi + cameraHeightOffset;
        const camZ = distance * cosPhi * cosTheta;

        targetPosRef.current.set(camX, camY, camZ);
        camera.position.lerp(targetPosRef.current, Math.min(1, delta * 6));

        // Camera luôn nhìn về tâm, có tính đến height offset
        lookAtTargetRef.current.set(0, cameraHeightOffset * 0.5, 0);
        camera.lookAt(lookAtTargetRef.current);
    });

    return null;
}
