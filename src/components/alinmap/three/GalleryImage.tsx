import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { resolveRenderableImageUrl } from './sceneUtils';

interface GalleryImageProps {
    url?: string;
    title?: string;
    avatarPlaneSize: number;
    scaleFactor?: number;
}

export default function GalleryImage({ url, title, avatarPlaneSize, scaleFactor = 4 }: GalleryImageProps) {
    const texture = useMemo(() => {
        if (!url) return null;
        const normalized = resolveRenderableImageUrl(url);
        if (!normalized) return null;
        const loader = new THREE.TextureLoader();
        return loader.load(
            normalized,
            undefined,
            undefined,
            undefined
        );
    }, [url]);

    const billboardWidth = Math.max(avatarPlaneSize * scaleFactor, 0.01);
    const billboardHeight = billboardWidth * (9 / 16);
    const billboardYOffset = avatarPlaneSize * 1.35 + billboardHeight * 0.5;
    const borderWidth = billboardWidth * 1.05;
    const borderHeight = billboardHeight * 1.09;

    return (
        <group position={[0, billboardYOffset, 0]}>
            <mesh position={[0, 0, 0.05]} renderOrder={30}>
                <planeGeometry args={[billboardWidth, billboardHeight]} />
                {texture ? (
                    <meshBasicMaterial map={texture} transparent depthTest={false} depthWrite={false} />
                ) : (
                    <meshBasicMaterial color="#0f172a" transparent depthTest={false} depthWrite={false} />
                )}
            </mesh>
            <mesh position={[0, 0, 0.02]} renderOrder={29}>
                <planeGeometry args={[borderWidth, borderHeight]} />
                <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} depthTest={false} depthWrite={false} />
            </mesh>
            <Text
                position={[0, billboardHeight * 0.36, 0.1]}
                fontSize={Math.max(billboardWidth * 0.075, 0.14)}
                color="#fef3c7"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.15}
                outlineColor="#000000"
            >
                {title || 'GALLERY'}
            </Text>
        </group>
    );
}
