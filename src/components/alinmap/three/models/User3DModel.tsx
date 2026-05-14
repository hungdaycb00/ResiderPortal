import React, { useState } from 'react';
import { Html, Billboard, Sphere, Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import GalleryImage from '../GalleryImage';

interface User3DModelProps {
    name: string;
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
    dimmed?: boolean;
    color?: string; // Optional color to distinguish if needed
}

const User3DModel: React.FC<User3DModelProps> = ({
    name,
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
    dimmed = false,
    color = '#10b981', // Default green-ish
}) => {
    const [isHovered, setIsHovered] = useState(false);

    const shouldShowDetails = isHovered || !!isSelected;
    const shouldRenderLabel = labelMode === 'full' || labelMode === 'name-only' || shouldShowDetails;
    const isRoadmapPresentation = presentation === 'roadmap';
    
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

    React.useEffect(() => {
        console.log(`[User3DModel] MOUNTED for user: ${name} at position:`, position);
        return () => console.log(`[User3DModel] UNMOUNTED for user: ${name}`);
    }, [name, position]);

    return (
        <group
            position={position}
            onClick={onClick}
            onPointerOver={(e) => { e.stopPropagation(); setIsHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerOut={(e) => { e.stopPropagation(); setIsHovered(false); document.body.style.cursor = 'auto'; }}
            scale={[avatarScale, avatarScale, avatarScale]}
        >
            {/* 3D Placeholder Character (Meeple shape) */}
            <group position={[0, 1.2, 0]}>
                {/* Body */}
                <Cylinder args={[0.3, 0.6, 1.5, 16]} position={[0, -0.2, 0]} castShadow receiveShadow>
                    <meshNormalMaterial transparent={dimmed} opacity={dimmed ? 0.3 : 1} />
                </Cylinder>
                {/* Head */}
                <Sphere args={[0.5, 32, 32]} position={[0, 0.8, 0]} castShadow receiveShadow>
                    <meshNormalMaterial transparent={dimmed} opacity={dimmed ? 0.3 : 1} />
                </Sphere>
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
                    <Html
                        position={[0, 0, 0]}
                        center
                        transform
                        sprite
                        distanceFactor={labelDistanceFactor}
                        occlude={false}
                    >
                        <div className="pointer-events-none flex flex-col items-center gap-1">
                            <div className={`${labelShellClass} transition-transform duration-200 ${shouldShowDetails ? 'scale-105' : 'scale-100'}`}>
                                <span className={labelTextClass}>
                                    {name}
                                </span>
                            </div>
                            {status && labelMode === 'full' ? (
                                <div className={`${statusShellClass} transition-all duration-200 ${shouldShowDetails ? 'opacity-100 translate-y-0' : 'opacity-85 translate-y-0.5'}`}>
                                    <span className={statusTextClass}>
                                        {status}
                                    </span>
                                </div>
                            ) : null}
                        </div>
                    </Html>
                )}
                {showGallery ? (
                    <GalleryImage url={galleryImages?.[0]} title={galleryTitle} />
                ) : null}
            </Billboard>
        </group>
    );
};

export default React.memo(User3DModel);
