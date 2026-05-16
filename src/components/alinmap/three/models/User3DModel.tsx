import React from 'react';
import { Billboard, Text } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import GalleryImage from '../GalleryImage';
import { getAvatarTagList } from '../sceneCoords';

interface User3DModelProps {
    name: string;
    position: [number, number, number];
    status?: string;
    tags?: string[] | null;
    isVisibleOnMap: boolean;
    labelMode?: 'full' | 'name-only' | 'focus-only';
    onClick?: () => void;
    onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
    onPointerUp?: (e: ThreeEvent<PointerEvent>) => void;
    onGalleryClick?: () => void;
    showGallery?: boolean;
    galleryTitle?: string;
    galleryImages?: string[];
    isSelected?: boolean;
    presentation?: 'default' | 'roadmap';
    dimmed?: boolean;
    color?: string; // Optional color to distinguish if needed
}

const User3DModel: React.FC<User3DModelProps> = ({
    name,
    position,
    status,
    tags,
    isVisibleOnMap,
    labelMode = 'full',
    onClick,
    onPointerDown,
    onPointerUp,
    onGalleryClick,
    showGallery,
    galleryTitle,
    galleryImages,
    isSelected,
    presentation = 'default',
    dimmed = false,
    color = '#10b981', // Default green-ish
}) => {
    const [isHovered, setIsHovered] = React.useState(false);

    const shouldShowDetails = isHovered || !!isSelected;
    const shouldRenderLabel = labelMode === 'full' || labelMode === 'name-only' || shouldShowDetails;
    const isRoadmapPresentation = presentation === 'roadmap';
    const displayTags = getAvatarTagList(tags, status);
    
    // Scale down a bit for roadmap to match 2D behavior
    const avatarScale = isRoadmapPresentation ? 0.72 : 1.0;
    
    // Adjusted offsets since 3D models have height
    const labelYOffset = isRoadmapPresentation ? -2.45 : -3.65;
    const labelDistanceFactor = isRoadmapPresentation ? 8.4 : 7;
    
    // Reusing the same label classes from AvatarBillboard
    const labelShellClass = isRoadmapPresentation
        ? 'max-w-[260px] rounded-full border border-white/80 bg-white/94 px-4 py-2.5 shadow-[0_8px_22px_rgba(15,23,42,0.14)] backdrop-blur-md'
        : 'max-w-[420px] rounded-full border border-white/80 bg-white/95 px-8 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.18)] backdrop-blur-md';
    const labelTextClass = isRoadmapPresentation
        ? 'block max-w-[220px] truncate text-[30px] leading-none font-extrabold tracking-tight text-slate-900 sm:text-[33px]'
        : 'block max-w-[360px] truncate text-[50px] leading-none font-extrabold tracking-tight text-slate-900 sm:text-[55px]';
    const statusShellClass = isRoadmapPresentation
        ? 'max-w-[200px] rounded-full border border-sky-100 bg-sky-50/95 px-2.5 py-1 shadow-[0_6px_16px_rgba(14,165,233,0.1)] backdrop-blur-md'
        : 'max-w-[260px] rounded-full border border-sky-100 bg-sky-50/95 px-3 py-1 shadow-[0_6px_18px_rgba(14,165,233,0.12)] backdrop-blur-md';
    const statusTextClass = isRoadmapPresentation
        ? 'block max-w-[180px] truncate text-[9px] font-semibold text-slate-600 sm:text-[10px]'
        : 'block max-w-[220px] truncate text-[12px] font-semibold text-slate-600 sm:text-[13px]';

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick?.();
    };

    return (
        <group
            position={position}
            onClick={handleClick}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerOver={(e) => { e.stopPropagation(); setIsHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerOut={(e) => { e.stopPropagation(); setIsHovered(false); document.body.style.cursor = 'auto'; }}
            scale={[avatarScale, avatarScale, avatarScale]}
        >
            {/* 3D Placeholder Character (Cube shape) */}
            <group position={[0, 0.6, 0]}>
                <mesh position={[0, 0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[1.2, 1.2, 1.2]} />
                    <meshNormalMaterial transparent={dimmed} opacity={dimmed ? 0.3 : 1} />
                </mesh>
            </group>

            {/* Selection/Hover Highlight Ring on the ground */}
            {(isSelected || isHovered) && (
                <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[1.0, 1.2, 32]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.6} depthWrite={false} side={THREE.DoubleSide} />
                </mesh>
            )}
            {/* Base indicator */}
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.8, 32]} />
                <meshBasicMaterial color={isVisibleOnMap ? '#22d3ee' : '#10b981'} transparent opacity={0.3} depthWrite={false} />
            </mesh>

            {/* Labels (Using Billboard so they always face camera) */}
            <Billboard follow position={[0, 3.5, 0]}>
                {shouldRenderLabel && (
                    <group position={[0, isRoadmapPresentation ? 0.5 : 1.2, 0]}>
                        <Text
                            position={[0, 0, 0]}
                            fontSize={isRoadmapPresentation ? 0.4 : 0.6}
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
                            position={[0, isRoadmapPresentation ? -0.38 : -0.55, 0]}
                            fontSize={isRoadmapPresentation ? 0.16 : 0.22}
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
                                position={[0, isRoadmapPresentation ? -0.75 : -1.05, 0]}
                                fontSize={isRoadmapPresentation ? 0.2 : 0.25}
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
                        avatarPlaneSize={1.2 * avatarScale}
                        onClick={() => onGalleryClick?.()}
                    />
                ) : null}
            </Billboard>
        </group>
    );
};

export default React.memo(User3DModel);
