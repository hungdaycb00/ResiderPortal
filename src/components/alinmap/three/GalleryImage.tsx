import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { resolveRenderableImageUrl } from './sceneUtils';

interface GalleryImageProps {
    url?: string;
    title?: string;
    avatarPlaneSize: number;
    scaleFactor?: number;
    onClick?: () => void;
}

export default function GalleryImage({ url, title, avatarPlaneSize, scaleFactor = 4, onClick }: GalleryImageProps) {
    const lastOpenAtRef = useRef(0);
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

    useEffect(() => {
        console.warn('[AlinMap][Billboard] mounted image-only billboard', {
            title: title || 'GALLERY',
            url: url || null,
            hasTexture: !!texture,
            billboardWidth,
            billboardHeight,
        });
    }, [billboardHeight, billboardWidth, texture, title, url]);

    const logBillboardEvent = (eventName: string) => {
        console.warn(`[AlinMap][Billboard] ${eventName}`, {
            title: title || 'GALLERY',
            url: url || null,
            hasTexture: !!texture,
            billboardWidth,
            billboardHeight,
        });
    };

    const openBillboardOnce = () => {
        const now = performance.now();
        if (now - lastOpenAtRef.current < 180) return;
        lastOpenAtRef.current = now;
        onClick?.();
    };

    const handleBillboardPointerDown = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        logBillboardEvent('pointerdown');
    };

    const handleBillboardPointerUp = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        logBillboardEvent('pointerup');
        openBillboardOnce();
    };

    const handleBillboardClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        logBillboardEvent('click');
        openBillboardOnce();
    };

    return (
        <group
            position={[0, billboardYOffset, 0]}
        >
            <mesh
                position={[0, 0, 0.05]}
                renderOrder={30}
                onPointerDown={handleBillboardPointerDown}
                onPointerUp={handleBillboardPointerUp}
                onClick={handleBillboardClick}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    document.body.style.cursor = 'pointer';
                }}
                onPointerOut={(e) => {
                    e.stopPropagation();
                    document.body.style.cursor = 'auto';
                }}
            >
                <planeGeometry args={[billboardWidth, billboardHeight]} />
                {texture ? (
                    <meshBasicMaterial map={texture} transparent depthTest={false} depthWrite={false} />
                ) : (
                    <meshBasicMaterial color="#0f172a" transparent depthTest={false} depthWrite={false} />
                )}
            </mesh>
        </group>
    );
}
