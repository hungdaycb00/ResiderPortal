import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DashedPathProps {
    /** Điểm bắt đầu (vị trí thuyền) */
    from: [number, number, number];
    /** Điểm kết thúc (target pin) */
    to: [number, number, number];
    color?: string;
}

/**
 * Đường nét đứt động từ thuyền tới target khi di chuyển.
 * Dùng LineDashedMaterial với dashOffset animation để hiệu ứng "chạy".
 */
export default function DashedPath({ from, to, color = '#22d3ee' }: DashedPathProps) {
    const lineRef = useRef<THREE.Line>(null!);

    const { geometry, material } = useMemo(() => {
        const pts = [
            new THREE.Vector3(from[0], from[1] + 5, from[2]),
            new THREE.Vector3(to[0], to[1] + 5, to[2]),
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);

        const mat = new THREE.LineDashedMaterial({
            color,
            dashSize: 60,
            gapSize: 40,
            linewidth: 2,
            transparent: true,
            opacity: 0.85,
            depthTest: false,
        });
        return { geometry: geo, material: mat };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [from[0], from[2], to[0], to[2], color]);
    const lineObject = useMemo(() => {
        const line = new THREE.Line(geometry, material);
        line.computeLineDistances();
        line.renderOrder = 50;
        return line;
    }, [geometry, material]);

    useEffect(() => () => {
        geometry.dispose();
        material.dispose();
    }, [geometry, material]);

    // Animate dashOffset → hiệu ứng đường chạy về phía target
    useFrame((_state, delta) => {
        if (!lineRef.current) return;
        lineRef.current.computeLineDistances();
        const mat = lineRef.current.material as THREE.LineDashedMaterial;
        (mat as any).dashOffset = ((mat as any).dashOffset || 0) - delta * 80;
    });

    return (
        <group>
            {/* Đường chính nét đứt */}
            <primitive ref={lineRef} object={lineObject} />

            {/* Vòng tròn ngoài tại target */}
            <mesh position={[to[0], to[1] + 5, to[2]]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={51}>
                <ringGeometry args={[55, 80, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.22} depthTest={false} depthWrite={false} />
            </mesh>
            {/* Chấm trung tâm target */}
            <mesh position={[to[0], to[1] + 5, to[2]]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={52}>
                <circleGeometry args={[20, 32]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.55} depthTest={false} depthWrite={false} />
            </mesh>
        </group>
    );
}
