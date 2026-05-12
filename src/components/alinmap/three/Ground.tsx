import React, { useEffect, useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import ZenKoiPond from './ZenKoiPond';
import { useThree } from '@react-three/fiber';
import type { AlinMapMode } from '../constants';

interface GroundProps {
    mapMode: AlinMapMode;
    roadmapWorldScale?: number;
    onGroundClick?: (point: THREE.Vector3) => void;
    groundRef?: React.RefObject<THREE.Mesh | null>;
}

const ROADMAP_EXTENT = 36000;
const ROADMAP_HIT_SIZE = 90000;
const ROADMAP_TEXTURE_REPEAT = 48;

function drawMapRoad(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    length: number,
    width: number,
    rotation: number,
    color: string,
    alpha: number,
) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = color;
    ctx.fillRect(-length / 2, -width / 2, length, width);
    ctx.restore();
}

function createRoadmapTexture() {
    if (typeof document === 'undefined') return null;

    const size = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#dfe8dd';
    ctx.fillRect(0, 0, size, size);

    const patches = [
        { x: 360, y: 470, w: 280, h: 170, r: 0.12, c: '#cde4cb', a: 0.72 },
        { x: 1510, y: 560, w: 330, h: 210, r: -0.22, c: '#d2e7c9', a: 0.58 },
        { x: 1240, y: 1450, w: 420, h: 230, r: 0.18, c: '#c7ddc6', a: 0.62 },
        { x: 610, y: 1520, w: 300, h: 190, r: -0.3, c: '#d5e7d0', a: 0.55 },
    ];
    patches.forEach((patch) => drawMapRoad(ctx, patch.x, patch.y, patch.w, patch.h, patch.r, patch.c, patch.a));

    drawMapRoad(ctx, 680, 850, 2500, 52, -0.28, '#a8d8e6', 0.45);
    drawMapRoad(ctx, 1510, 1130, 2200, 36, 0.42, '#b7e2ed', 0.34);

    for (let offset = -240; offset <= size + 240; offset += 92) {
        const collector = Math.round(offset / 92) % 4 === 0;
        drawMapRoad(ctx, offset, size / 2, size * 1.55, collector ? 5 : 2.6, Math.PI / 2, '#f8fafc', collector ? 0.55 : 0.34);
        drawMapRoad(ctx, size / 2, offset, size * 1.55, collector ? 5 : 2.4, 0, '#f8fafc', collector ? 0.54 : 0.32);
    }

    const angledRoads = [
        { x: 1024, y: 1010, len: 2500, w: 15, r: 0.28, c: '#ffffff', a: 0.86 },
        { x: 820, y: 1110, len: 2200, w: 12, r: -0.58, c: '#ffe28a', a: 0.78 },
        { x: 1260, y: 780, len: 1900, w: 10, r: 1.05, c: '#ffffff', a: 0.7 },
        { x: 760, y: 650, len: 1700, w: 8, r: 1.55, c: '#edf3f7', a: 0.66 },
        { x: 1340, y: 1350, len: 2200, w: 9, r: -1.35, c: '#f8fafc', a: 0.7 },
        { x: 1040, y: 360, len: 1900, w: 7, r: -0.02, c: '#ffffff', a: 0.62 },
        { x: 900, y: 1710, len: 2100, w: 7, r: 0.08, c: '#ffffff', a: 0.64 },
    ];
    angledRoads.forEach((road) => drawMapRoad(ctx, road.x, road.y, road.len, road.w, road.r, road.c, road.a));

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(ROADMAP_TEXTURE_REPEAT, ROADMAP_TEXTURE_REPEAT);
    texture.needsUpdate = true;
    return texture;
}

export default function Ground({ mapMode, onGroundClick, groundRef }: GroundProps) {
    const internalRef = useRef<THREE.Mesh>(null);
    const meshRef = groundRef || internalRef;
    const { camera } = useThree();
    const roadmapTexture = useMemo(() => createRoadmapTexture(), []);

    useEffect(() => () => {
        roadmapTexture?.dispose();
    }, [roadmapTexture]);

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onGroundClick?.(e.point);
    };

    return (
        <group>
            <mesh ref={meshRef} rotation-x={-Math.PI / 2} position={[0, -1, 0]} receiveShadow onClick={handleClick}>
                <planeGeometry args={[ROADMAP_HIT_SIZE, ROADMAP_HIT_SIZE, 1, 1]} />
                <meshBasicMaterial visible={false} />
            </mesh>
            
            {mapMode === 'roadmap' && (
                <group>
                    <mesh rotation-x={-Math.PI / 2} position={[0, -1.01, 0]}>
                        <planeGeometry args={[ROADMAP_EXTENT * 2.35, ROADMAP_EXTENT * 2.35, 1, 1]} />
                        <meshBasicMaterial color="#dfe8dd" map={roadmapTexture ?? undefined} fog={false} />
                    </mesh>
                </group>
            )}

            {mapMode === 'satellite' && (
                <ZenKoiPond camPosRef={{ current: camera.position } as React.RefObject<THREE.Vector3>} />
            )}
        </group>
    );
}
