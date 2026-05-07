import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ProceduralBoatProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
}

/**
 * Thuyền 3D cho người chơi.
 * Geometry được thiết kế sẵn theo đơn vị scene (1 unit ≈ 1 px CSS * 0.34).
 * Camera scene nằm ở y=1600, z=2200 → thuyền cần cao ~40-80 scene units.
 * Không dùng scale lớn bên ngoài — geometry đã đúng kích thước.
 */
export default function ProceduralBoat({ position, rotation = [0, 0, 0], scale = 1 }: ProceduralBoatProps) {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (!groupRef.current) return;
        const t = state.clock.getElapsedTime();
        // Bobbing trên sóng — đơn vị scene units
        groupRef.current.position.y = position[1] + Math.sin(t * 2.5) * 3 + 5;
        // Lắc nhẹ
        groupRef.current.rotation.z = Math.sin(t * 1.5) * 0.06;
        groupRef.current.rotation.x = Math.sin(t * 1.2) * 0.04;
    });

    // S = 40: đơn vị cơ sở của thuyền trong scene
    const S = 40;

    return (
        <group position={position} rotation={rotation} ref={groupRef} scale={scale}>
            {/* Thân thuyền (Hull) */}
            <mesh position={[0, S * 0.1, 0]} castShadow>
                <boxGeometry args={[S * 0.5, S * 0.2, S * 1.2]} />
                <meshStandardMaterial color="#78350f" roughness={0.9} />
            </mesh>
            {/* Mũi thuyền (Bow) */}
            <mesh position={[0, S * 0.1, S * 0.7]} rotation={[-Math.PI / 6, 0, 0]} castShadow>
                <boxGeometry args={[S * 0.5, S * 0.2, S * 0.4]} />
                <meshStandardMaterial color="#92400e" roughness={0.9} />
            </mesh>
            {/* Đuôi thuyền (Stern) */}
            <mesh position={[0, S * 0.15, -S * 0.65]} castShadow>
                <boxGeometry args={[S * 0.5, S * 0.3, S * 0.2]} />
                <meshStandardMaterial color="#92400e" roughness={0.9} />
            </mesh>
            {/* Cột buồm (Mast) */}
            <mesh position={[0, S * 0.7, S * 0.1]} castShadow>
                <cylinderGeometry args={[S * 0.02, S * 0.04, S * 1.2]} />
                <meshStandardMaterial color="#451a03" />
            </mesh>
            {/* Buồm (Sail) */}
            <mesh position={[0, S * 0.6, S * 0.2]} castShadow>
                <coneGeometry args={[S * 0.4, S * 0.8, 4]} />
                <meshStandardMaterial color="#e0f2fe" side={THREE.DoubleSide} roughness={0.4} />
            </mesh>
            {/* Cờ (Flag) */}
            <mesh position={[0, S * 1.35, -S * 0.05]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[S * 0.2, S * 0.15]} />
                <meshStandardMaterial color="#38bdf8" side={THREE.DoubleSide} />
            </mesh>
            {/* Glow ring bên dưới thuyền */}
            <mesh position={[0, -S * 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[S * 0.5, S * 0.7, 32]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.35} depthWrite={false} />
            </mesh>
        </group>
    );
}
