import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MotionValue } from 'framer-motion';
import { clamp } from '../constants';

interface CameraRigProps {
    scale: MotionValue<number>;
    tiltAngle: MotionValue<number>;
    cameraYawDeg: number;
    cameraHeightOffset: number;
    perspectivePx: number;
    cameraFov?: number;
    minDistance?: number;
}

// SPRINT 2: Temp objects tái sử dụng — tránh GC pressure mỗi frame
const _targetPos = new THREE.Vector3();
const _lookAtTarget = new THREE.Vector3();
const _tempMatrix = new THREE.Matrix4();
const _targetQuat = new THREE.Quaternion();
const _UP = new THREE.Vector3(0, 1, 0);

export default function CameraRig({
    scale,
    tiltAngle,
    cameraYawDeg,
    cameraHeightOffset,
    perspectivePx,
    cameraFov,
    minDistance = 140,
}: CameraRigProps) {
    const { camera, invalidate } = useThree();

    // SPRINT 2: Cache degToRad — chỉ tính lại khi giá trị thay đổi
    const prevPitchRef = useRef(-999);
    const prevYawRef = useRef(-999);
    const phiRef = useRef(0);
    const thetaRef = useRef(0);
    const sinPhiRef = useRef(0);
    const cosPhiRef = useRef(0);
    const sinThetaRef = useRef(0);
    const cosThetaRef = useRef(0);

    // SPRINT 2: Subscribe MotionValues → invalidate() để trigger frame khi cần
    useEffect(() => {
        const unsubScale = scale.on('change', invalidate);
        const unsubTilt = tiltAngle.on('change', invalidate);
        return () => { unsubScale(); unsubTilt(); };
    }, [scale, tiltAngle, invalidate]);

    // Đồng bộ FOV khi prop thay đổi
    useEffect(() => {
        if (!cameraFov) return;
        const cam = camera as THREE.PerspectiveCamera;
        if (!cam.isPerspectiveCamera) return;
        if (Math.abs(cam.fov - cameraFov) < 0.01) return;
        cam.fov = cameraFov;
        cam.updateProjectionMatrix();
        invalidate();
    }, [camera, cameraFov, invalidate]);

    // Trigger frame khi yaw thay đổi (prop, không phải MotionValue)
    const prevYawPropRef = useRef(cameraYawDeg);
    useEffect(() => {
        if (prevYawPropRef.current !== cameraYawDeg) {
            prevYawPropRef.current = cameraYawDeg;
            invalidate();
        }
    }, [cameraYawDeg, invalidate]);

    useFrame((_, delta) => {
        const zoom = Math.max(0.0001, scale.get() || 1);
        const depthFit = perspectivePx * 0.56;
        const distance = depthFit / zoom;

        // SPRINT 2: Cache trig values — chỉ tính lại khi pitch/yaw thực sự thay đổi
        const pitchDeg = clamp(tiltAngle.get(), 0, 89.9);
        if (pitchDeg !== prevPitchRef.current) {
            prevPitchRef.current = pitchDeg;
            phiRef.current = THREE.MathUtils.degToRad(pitchDeg);
            sinPhiRef.current = Math.sin(phiRef.current);
            cosPhiRef.current = Math.cos(phiRef.current);
        }
        if (cameraYawDeg !== prevYawRef.current) {
            prevYawRef.current = cameraYawDeg;
            thetaRef.current = THREE.MathUtils.degToRad(cameraYawDeg);
            sinThetaRef.current = Math.sin(thetaRef.current);
            cosThetaRef.current = Math.cos(thetaRef.current);
        }

        const camX = distance * cosPhiRef.current * sinThetaRef.current;
        const camY = distance * sinPhiRef.current + cameraHeightOffset;
        const camZ = distance * cosPhiRef.current * cosThetaRef.current;

        _targetPos.set(camX, camY, camZ);
        _lookAtTarget.set(0, cameraHeightOffset * 0.5, 0);

        // SPRINT 2: Quaternion slerp thay vì lookAt() mỗi frame
        // lookAt() → tính full rotation matrix → chậm hơn slerp trên mobile
        _tempMatrix.lookAt(_targetPos, _lookAtTarget, _UP);
        _targetQuat.setFromRotationMatrix(_tempMatrix);

        const EPSILON = 0.5;
        const posNeedsUpdate = camera.position.distanceToSquared(_targetPos) > EPSILON;
        const quatNeedsUpdate = camera.quaternion.angleTo(_targetQuat) > 0.0001;

        if (posNeedsUpdate) {
            camera.position.lerp(_targetPos, Math.min(1, delta * 6));
        }
        if (quatNeedsUpdate) {
            camera.quaternion.slerp(_targetQuat, Math.min(1, delta * 8));
        }

        // SPRINT 2: Chỉ request frame tiếp theo khi camera vẫn đang di chuyển
        if (posNeedsUpdate || quatNeedsUpdate) {
            invalidate();
        }
    });

    return null;
}
