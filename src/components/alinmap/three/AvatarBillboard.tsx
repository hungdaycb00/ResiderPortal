import React, { useEffect, useMemo, useState } from 'react';
import { Billboard, Text } from '@react-three/drei';
import type { MotionValue } from 'framer-motion';
import GalleryImage from './GalleryImage';
import { makeAvatarTexture, AVATAR_PLANE_SIZE, AVATAR_RING_RADIUS } from './sceneUtils';

interface AvatarBillboardProps {
    name: string;
    avatarUrl?: string | null;
    position: [number, number, number];
    status?: string;
    isVisibleOnMap: boolean;
    labelMode?: 'full' | 'name-only' | 'focus-only';
    onClick?: () => void;
    showGallery?: boolean;
    galleryTitle?: string;
    galleryImages?: string[];
    isSelected?: boolean;
    presentation?: 'default' | 'roadmap';
    zoomScale?: MotionValue<number>;
    /** Khi ở looter mode, avatar bị làm mờ */
    dimmed?: boolean;
}

const AvatarBillboard: React.FC<AvatarBillboardProps> = ({
    name,
    avatarUrl,
    position,
    status,
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
    const shouldShowDetails = isHovered || !!isSelected;
    const shouldRenderLabel = labelMode === 'full' || labelMode === 'name-only' || shouldShowDetails;
    const isRoadmapPresentation = presentation === 'roadmap';
    const presentationScale = isRoadmapPresentation ? 0.72 : 1;
    const baseAvatarScale = presentationScale * 0.2;
    const zoomOutT = Math.max(0, Math.min(1, (1 - currentZoomScale) / 0.5));
    const zoomMultiplier = 1 + zoomOutT * 2;
    const avatarScale = baseAvatarScale * zoomMultiplier;
    const avatarPlaneSize = AVATAR_PLANE_SIZE * avatarScale;
    const billboardPlaneSize = avatarPlaneSize * 4;
    const ringRadius = AVATAR_RING_RADIUS * avatarScale;
    const labelYOffset = isRoadmapPresentation ? -2.45 : -3.65;
    const labelDistanceFactor = isRoadmapPresentation ? 8.4 : 7;
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

    return (
        <group 
            position={position} 
            onClick={onClick} 
            onPointerOver={(e) => { e.stopPropagation(); setIsHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerOut={(e) => { e.stopPropagation(); setIsHovered(false); document.body.style.cursor = 'auto'; }}
            renderOrder={10}
        >
            <Billboard follow lockX lockZ>
                <mesh position={[0, 1.15 * avatarScale, -0.01]} renderOrder={19}>
                    <planeGeometry args={[billboardPlaneSize, billboardPlaneSize]} />
                    <meshBasicMaterial transparent opacity={0.01} depthWrite={false} color="#ffffff" />
                </mesh>
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
                        {status && labelMode === 'full' && (
                            <Text
                                position={[0, isRoadmapPresentation ? -0.5 : -0.7, 0]}
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
            </Billboard>

            {/* Vòng tròn dưới đất (footprint) */}
            <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[ringRadius, 48]} />
                <meshBasicMaterial
                    color={isVisibleOnMap ? '#22d3ee' : '#10b981'}
                    transparent
                    opacity={0.2}
                    depthWrite={false}
                />
            </mesh>
            {(isSelected || isHovered) && (
                <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[ringRadius * 1.15, 48]} />
                    <meshBasicMaterial
                        color="#ffffff"
                        transparent
                        opacity={0.4}
                        depthWrite={false}
                    />
                </mesh>
            )}
            
            {/* Fake Drop Shadow */}
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[ringRadius * 0.8, 32]} />
                <meshBasicMaterial color="black" transparent opacity={0.15} depthWrite={false} />
            </mesh>

            {showGallery ? (
                <GalleryImage url={galleryImages?.[0]} title={galleryTitle} />
            ) : null}
        </group>
    );
};

export default React.memo(AvatarBillboard);
