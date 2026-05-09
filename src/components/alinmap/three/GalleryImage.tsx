import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { resolveRenderableImageUrl } from './sceneUtils';

interface GalleryImageProps {
    url?: string;
    title?: string;
}

export default function GalleryImage({ url, title }: GalleryImageProps) {
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

    return (
        <group position={[0, 11.5, 0]}>
            <mesh position={[0, 0, 0.05]} renderOrder={30}>
                <planeGeometry args={[24, 13.5]} />
                {texture ? (
                    <meshBasicMaterial map={texture} transparent depthTest={false} depthWrite={false} />
                ) : (
                    <meshBasicMaterial color="#0f172a" transparent depthTest={false} depthWrite={false} />
                )}
            </mesh>
            <mesh position={[0, 0, 0.02]} renderOrder={29}>
                <planeGeometry args={[25.2, 14.7]} />
                <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} depthTest={false} depthWrite={false} />
            </mesh>
            <Text
                position={[0, 8.1, 0.1]}
                fontSize={1.8}
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
