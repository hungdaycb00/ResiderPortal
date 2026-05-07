import { useEffect, useMemo, useState } from 'react';
import { Billboard, Text } from '@react-three/drei';
import GalleryImage from './GalleryImage';
import { makeAvatarTexture, AVATAR_PLANE_SIZE, AVATAR_RING_RADIUS } from './sceneUtils';

interface AvatarBillboardProps {
    name: string;
    avatarUrl?: string | null;
    position: [number, number, number];
    status?: string;
    isVisibleOnMap: boolean;
    onClick?: () => void;
    showGallery?: boolean;
    galleryTitle?: string;
    galleryImages?: string[];
    isSelected?: boolean;
}

export default function AvatarBillboard({
    name,
    avatarUrl,
    position,
    status,
    isVisibleOnMap,
    onClick,
    showGallery,
    galleryTitle,
    galleryImages,
    isSelected,
}: AvatarBillboardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const texture = useMemo(() => makeAvatarTexture(name, avatarUrl), [name, avatarUrl]);

    useEffect(() => () => { texture.dispose(); }, [texture]);

    return (
        <group 
            position={position} 
            onClick={onClick} 
            onPointerOver={(e) => { e.stopPropagation(); setIsHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerOut={(e) => { e.stopPropagation(); setIsHovered(false); document.body.style.cursor = 'auto'; }}
            renderOrder={10}
        >
            <Billboard follow>
                <mesh position={[0, 3.45, 0.02]} renderOrder={20}>
                    <planeGeometry args={[AVATAR_PLANE_SIZE, AVATAR_PLANE_SIZE]} />
                    <meshBasicMaterial map={texture} transparent depthTest={false} depthWrite={false} />
                </mesh>
                <mesh position={[0, 0.24, -0.02]}>
                    <circleGeometry args={[AVATAR_RING_RADIUS, 48]} />
                    <meshBasicMaterial
                        color={isVisibleOnMap ? '#22d3ee' : '#10b981'}
                        transparent
                        opacity={0.2}
                        depthTest={false}
                        depthWrite={false}
                    />
                </mesh>
                {(isSelected || isHovered) && (
                    <mesh position={[0, 0.24, -0.03]}>
                        <circleGeometry args={[AVATAR_RING_RADIUS * 1.15, 48]} />
                        <meshBasicMaterial
                            color="#ffffff"
                            transparent
                            opacity={0.4}
                            depthTest={false}
                            depthWrite={false}
                        />
                    </mesh>
                )}
                {status ? (
                    <Text
                        position={[0, -6.0, 0]}
                        fontSize={2.1}
                        color="white"
                        anchorX="center"
                        anchorY="middle"
                        outlineWidth={0.18}
                        outlineColor="#000000"
                        maxWidth={30}
                        textAlign={"center" as const}
                    >
                        {status}
                    </Text>
                ) : null}
                {showGallery ? (
                    <GalleryImage url={galleryImages?.[0]} title={galleryTitle} />
                ) : null}
            </Billboard>
        </group>
    );
}
