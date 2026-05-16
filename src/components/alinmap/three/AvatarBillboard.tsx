import React, { useEffect, useMemo, useState } from 'react';
import { Billboard, Text } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { MotionValue } from 'framer-motion';
import GalleryImage from './GalleryImage';
import { makeAvatarTexture, AVATAR_PLANE_SIZE, getAvatarTagList } from './sceneUtils';

interface AvatarBillboardProps {
    name: string;
    avatarUrl?: string | null;
    position: [number, number, number];
    status?: string;
    tags?: string[] | null;
    isVisibleOnMap: boolean;
    labelMode?: 'full' | 'name-only' | 'focus-only';
    onClick?: () => void;
    showGallery?: boolean;
    galleryTitle?: string;
    galleryImages?: string[];
    isSelected?: boolean;
    presentation?: 'default' | 'roadmap';
    zoomScale?: MotionValue<number>;
    dimmed?: boolean;
}

const AvatarBillboard: React.FC<AvatarBillboardProps> = ({
    name,
    avatarUrl,
    position,
    status,
    tags,
    isVisibleOnMap,
    labelMode = 'full',
    onClick,
    showGallery,
    galleryTitle,
    galleryImages,
    isSelected,
    presentation = 'default',
    zoomScale,
    dimmed = false,
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [currentZoomScale, setCurrentZoomScale] = useState(() => zoomScale?.get?.() ?? 1);
    const texture = useMemo(() => makeAvatarTexture(name, avatarUrl), [name, avatarUrl]);
    const displayTags = useMemo(() => getAvatarTagList(tags, status), [tags, status]);
    const shouldShowDetails = isHovered || !!isSelected;
    const shouldRenderLabel = labelMode === 'full' || labelMode === 'name-only' || shouldShowDetails;
    const isRoadmapPresentation = presentation === 'roadmap';
    const presentationScale = isRoadmapPresentation ? 0.72 : 1;
    const baseAvatarScale = presentationScale * 0.2;
    const zoomOutT = Math.max(0, Math.min(1, (1 - currentZoomScale) / 0.5));
    const zoomMultiplier = 1 + zoomOutT * 2;
    const avatarScale = baseAvatarScale * zoomMultiplier;
    const avatarPlaneSize = AVATAR_PLANE_SIZE * avatarScale;
    const labelYOffset = isRoadmapPresentation ? -2.45 : -3.65;

    useEffect(() => {
        if (!zoomScale) {
            setCurrentZoomScale(1);
            return;
        }
        setCurrentZoomScale(zoomScale.get());
        const unsubscribe = zoomScale.on('change', (value) => {
            setCurrentZoomScale(value);
        });
        return unsubscribe;
    }, [zoomScale]);

    useEffect(() => () => { texture.dispose(); }, [texture]);

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick?.();
    };

    return (
        <group
            position={position}
            onClick={handleClick}
            onPointerOver={(e) => { e.stopPropagation(); setIsHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerOut={(e) => { e.stopPropagation(); setIsHovered(false); document.body.style.cursor = 'auto'; }}
            renderOrder={10}
        >
            <Billboard follow>
                <mesh position={[0, 1.15 * avatarScale, 0.02]} renderOrder={20}>
                    <planeGeometry args={[avatarPlaneSize, avatarPlaneSize]} />
                    <meshBasicMaterial map={texture} transparent alphaTest={0.1} depthWrite={false} opacity={dimmed ? 0.18 : 1} />
                </mesh>
                {shouldRenderLabel && (
                    <group position={[0, labelYOffset, 0]}>
                        <Text
                            position={[0, 0, 0]}
                            fontSize={isRoadmapPresentation ? 0.4 : 0.7}
                            color="#0f172a"
                            outlineWidth={0.04}
                            outlineColor="#ffffff"
                            anchorX="center"
                            anchorY="middle"
                            fontWeight="bold"
                        >
                            {name}
                        </Text>
                        <Text
                            position={[0, isRoadmapPresentation ? -0.43 : -0.58, 0]}
                            fontSize={isRoadmapPresentation ? 0.18 : 0.28}
                            color="#334155"
                            outlineWidth={0.02}
                            outlineColor="#ffffff"
                            anchorX="center"
                            anchorY="middle"
                            fontWeight="bold"
                        >
                            {displayTags.join(' ')}
                        </Text>
                        {status && (
                            <Text
                                position={[0, isRoadmapPresentation ? -0.87 : -1.18, 0]}
                                fontSize={isRoadmapPresentation ? 0.25 : 0.35}
                                color="#0284c7"
                                outlineWidth={0.02}
                                outlineColor="#e0f2fe"
                                anchorX="center"
                                anchorY="middle"
                                fontWeight="bold"
                            >
                                {status}
                            </Text>
                        )}
                    </group>
                )}
                {showGallery ? (
                    <GalleryImage
                        url={galleryImages?.[0]}
                        title={galleryTitle}
                        avatarPlaneSize={avatarPlaneSize}
                    />
                ) : null}
            </Billboard>
        </group>
    );
};

export default React.memo(AvatarBillboard);
