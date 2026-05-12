import React, { useEffect, useMemo, useState } from 'react';
import { Billboard, Html } from '@react-three/drei';
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
    /** Khi ở looter mode, avatar bị làm mờ */
    dimmed?: boolean;
}

const AvatarBillboard: React.FC<AvatarBillboardProps> = ({
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
    dimmed = false,
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const texture = useMemo(() => makeAvatarTexture(name, avatarUrl), [name, avatarUrl]);
    const shouldShowDetails = isHovered || !!isSelected;

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
                <mesh position={[0, 1.15, 0.02]} renderOrder={20}>
                    <planeGeometry args={[AVATAR_PLANE_SIZE, AVATAR_PLANE_SIZE]} />
                    <meshBasicMaterial map={texture} transparent depthTest={false} depthWrite={false} opacity={dimmed ? 0.18 : 1} />
                </mesh>
                <mesh position={[0, 0.08, -0.02]}>
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
                    <mesh position={[0, 0.08, -0.03]}>
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
                <Html
                    position={[0, -3.65, 0]}
                    center
                    transform
                    sprite
                    distanceFactor={14}
                    occlude={false}
                >
                    <div className="pointer-events-none flex flex-col items-center gap-1">
                        <div className={`max-w-[180px] rounded-full border border-white/80 bg-white/95 px-3 py-1 shadow-[0_8px_24px_rgba(15,23,42,0.18)] backdrop-blur-md transition-transform duration-200 ${shouldShowDetails ? 'scale-105' : 'scale-100'}`}>
                            <span className="block max-w-[150px] truncate text-[10px] font-extrabold tracking-tight text-slate-900 sm:text-[11px]">
                                {name}
                            </span>
                        </div>
                        {status ? (
                            <div className={`max-w-[200px] rounded-full border border-sky-100 bg-sky-50/95 px-2.5 py-0.5 shadow-[0_6px_18px_rgba(14,165,233,0.12)] backdrop-blur-md transition-all duration-200 ${shouldShowDetails ? 'opacity-100 translate-y-0' : 'opacity-85 translate-y-0.5'}`}>
                                <span className="block max-w-[170px] truncate text-[9px] font-semibold text-slate-600 sm:text-[10px]">
                                    {status}
                                </span>
                            </div>
                        ) : null}
                    </div>
                </Html>
                {showGallery ? (
                    <GalleryImage url={galleryImages?.[0]} title={galleryTitle} />
                ) : null}
            </Billboard>
        </group>
    );
};

export default React.memo(AvatarBillboard);
