import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Html, Billboard } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { MotionValue } from 'framer-motion';
import { normalizeImageUrl } from '../../../services/externalApi';
import { sanitizeWorldItems, useLooterState } from '../looter-game/LooterGameContext';
import { DEGREES_TO_PX, MAP_PLANE_SCALE } from '../constants';

type LatLng = { lat: number; lng: number };
const MAP_COORD_SCENE_SCALE = 0.34;
const BILLBOARD_STATUS_DISTANCE_FACTOR = 5.5;
const BILLBOARD_GALLERY_DISTANCE_FACTOR = 4.2;
const AVATAR_PLANE_SIZE = 6.5;
const AVATAR_RING_RADIUS = 4.4;
const MARKER_PLANE_SIZE: [number, number] = [8.5, 2.9];
const LABEL_PLANE_SIZE: [number, number] = [10.5, 3.2];

export interface AlinMapThreeSceneProps {
    position: [number, number] | null;
    nearbyUsers: any[];
    myUserId: string | null;
    user: any;
    myDisplayName: string;
    myAvatarUrl: string;
    myStatus: string;
    isVisibleOnMap: boolean;
    isConnecting: boolean;
    isDesktop: boolean;
    currentProvince: string | null;
    galleryActive: boolean;
    galleryTitle: string;
    galleryImages: string[];
    searchTag: string;
    filterDistance: number;
    filterAgeMin: number;
    filterAgeMax: number;
    searchMarkerPos: LatLng | null;
    scale: MotionValue<number>;
    cameraZ: MotionValue<number>;
    tiltAngle: MotionValue<number>;
    planeYScale: MotionValue<number>;
    perspectivePx: number;
    cameraHeightPct: number;
    cameraRotateDeg: number;
    cameraRotateXDeg: number;
    cameraRotateYDeg: number;
    panX: MotionValue<number>;
    panY: MotionValue<number>;
    selfDragX: MotionValue<number>;
    selfDragY: MotionValue<number>;
    mapMode: 'grid' | 'satellite';
    isLooterGameMode?: boolean;
    boatTargetPin?: LatLng | null;
    onSelectUser?: (user: any) => void;
    onSelectSelf?: (user: any) => void;
    onRequestMove?: (lat: number, lng: number) => void;
}

const worldToScene = (origin: LatLng, target: LatLng) => ({
    x: (target.lng - origin.lng) * DEGREES_TO_PX * MAP_PLANE_SCALE * MAP_COORD_SCENE_SCALE,
    z: -(target.lat - origin.lat) * DEGREES_TO_PX * MAP_PLANE_SCALE * MAP_COORD_SCENE_SCALE,
});

const pxToScene = (px: number) => px * MAP_COORD_SCENE_SCALE;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const initialsForName = (name: string) => {
    const cleaned = (name || 'U')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
    return cleaned || 'U';
};

const colorFromString = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue} 70% 48%)`;
};

const isRenderableImageUrl = (value?: string | null) => {
    if (!value) return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (trimmed === '...' || trimmed === 'undefined' || trimmed === 'null') return false;
    if (/^\.\.\.+$/.test(trimmed)) return false;
    if (trimmed.includes('...')) return false;
    return true;
};

const resolveRenderableImageUrl = (value?: string | null) => {
    if (!isRenderableImageUrl(value)) return '';
    return normalizeImageUrl(value);
};

const makeAvatarTexture = (name: string, imageUrl?: string | null) => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return new THREE.CanvasTexture(canvas);
    }

    const bg = colorFromString(name || imageUrl || 'alin');
    const drawFallback = () => {
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, bg);
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0.95)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 92px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 18;
        ctx.fillText(initialsForName(name), size / 2, size / 2 + 4);
    };

    const resolvedImageUrl = resolveRenderableImageUrl(imageUrl);
    if (!resolvedImageUrl) {
        drawFallback();
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        return texture;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        ctx.clearRect(0, 0, size, size);
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, bg);
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size * 0.47, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, 0, 0, size, size);
        ctx.restore();

        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size * 0.47, 0, Math.PI * 2);
        ctx.lineWidth = 10;
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.stroke();

        texture.needsUpdate = true;
    };
    img.onerror = drawFallback;
    img.src = resolvedImageUrl;

    drawFallback();
    return texture;
};

const makeBadgeTexture = (title: string, subtitle?: string, accent = '#22d3ee') => {
    const width = 512;
    const height = 168;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return new THREE.CanvasTexture(canvas);
    }

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(2, 6, 23, 0.95)');
    gradient.addColorStop(1, accent);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 0, width, 20);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '900 42px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;
    ctx.fillText(title, width / 2, height * 0.42);

    if (subtitle) {
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '800 22px Inter, system-ui, sans-serif';
        ctx.fillText(subtitle, width / 2, height * 0.72);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
};

function CameraRig({
    scale,
    cameraZ,
    cameraHeightPct,
    perspectivePx,
}: Pick<AlinMapThreeSceneProps, 'scale' | 'cameraZ' | 'cameraHeightPct' | 'perspectivePx'>) {
    const { camera } = useThree();

    useFrame(() => {
        const zoom = clamp(scale.get() || 1, 0.08, 8);
        const depthFit = perspectivePx * 0.56;
        const distance = clamp(depthFit / zoom - (cameraZ.get() || 0) * 5, 95, 9000);
        const height = distance * (0.22 + cameraHeightPct / 620);

        camera.position.set(0, height, distance);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
    });

    return null;
}

function Ground({ mapMode }: { mapMode: 'grid' | 'satellite' }) {
    return (
        <group>
            <mesh rotation-x={-Math.PI / 2} position={[0, -1, 0]} receiveShadow>
                <planeGeometry args={[12000, 12000, 1, 1]} />
                <meshStandardMaterial
                    color={mapMode === 'satellite' ? '#02203a' : '#09141f'}
                    metalness={0.08}
                    roughness={1}
                    fog
                />
            </mesh>
            <gridHelper args={[12000, 120, '#164158', '#0f2436']} position={[0, -0.98, 0]} />
            <mesh rotation-x={-Math.PI / 2} position={[0, -0.96, 0]}>
                <planeGeometry args={[12000, 12000]} />
                <meshBasicMaterial
                    color={mapMode === 'satellite' ? '#0d3b66' : '#050b12'}
                    transparent
                    opacity={0.18}
                />
            </mesh>
        </group>
    );
}

function BillboardLabel({
    title,
    subtitle,
    accent,
    position,
}: {
    title: string;
    subtitle?: string;
    accent?: string;
    position: [number, number, number];
}) {
    const texture = useMemo(() => makeBadgeTexture(title, subtitle, accent), [title, subtitle, accent]);

    useEffect(() => () => {
        texture.dispose();
    }, [texture]);

    return (
        <Billboard follow lockX lockY lockZ position={position}>
            <mesh position={[0, 0, 0.1]} renderOrder={50}>
                <planeGeometry args={LABEL_PLANE_SIZE} />
                <meshBasicMaterial map={texture} transparent depthTest={false} depthWrite={false} />
            </mesh>
        </Billboard>
    );
}

function AvatarBillboard({
    name,
    avatarUrl,
    position,
    status,
    isVisibleOnMap,
    onClick,
    showGallery,
    galleryTitle,
    galleryImages,
}: {
    name: string;
    avatarUrl?: string | null;
    position: [number, number, number];
    status?: string;
    isVisibleOnMap: boolean;
    onClick?: () => void;
    showGallery?: boolean;
    galleryTitle?: string;
    galleryImages?: string[];
}) {
    const texture = useMemo(() => makeAvatarTexture(name, avatarUrl), [name, avatarUrl]);

    useEffect(() => () => {
        texture.dispose();
    }, [texture]);

    return (
        <group position={position} onClick={onClick} renderOrder={10}>
            <Billboard follow>
                <mesh position={[0, 1.15, 0.02]} renderOrder={20}>
                    <planeGeometry args={[AVATAR_PLANE_SIZE, AVATAR_PLANE_SIZE]} />
                    <meshBasicMaterial map={texture} transparent depthTest={false} depthWrite={false} />
                </mesh>
                <mesh position={[0, 0.08, -0.02]}>
                    <circleGeometry args={[AVATAR_RING_RADIUS, 48]} />
                    <meshBasicMaterial color={isVisibleOnMap ? '#22d3ee' : '#10b981'} transparent opacity={0.2} />
                </mesh>
                {status ? (
                    <Html
                        position={[0, -0.85, 0]}
                        center
                        transform
                        sprite
                        distanceFactor={BILLBOARD_STATUS_DISTANCE_FACTOR}
                        occlude={false}
                    >
                        <div className="rounded-full border border-white/10 bg-slate-950/85 px-2 py-0.5 text-[9px] font-bold text-slate-100 shadow-lg backdrop-blur-md">
                            <span className="block max-w-[120px] truncate">{status}</span>
                        </div>
                    </Html>
                ) : null}
                {showGallery ? (
                    <Html
                        position={[0, -1.75, 0]}
                        center
                        transform
                        sprite
                        distanceFactor={BILLBOARD_GALLERY_DISTANCE_FACTOR}
                        occlude={false}
                    >
                        <div className="w-[180px] overflow-hidden rounded-lg border border-amber-300/30 bg-slate-950/90 shadow-2xl shadow-amber-500/20 backdrop-blur-md">
                            <div className="border-b border-white/10 bg-slate-900/80 px-2 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-100">
                                {galleryTitle || 'Gallery'}
                            </div>
                            <div className="flex h-[50px] items-center justify-center bg-cyan-500/10">
                                <div className="text-2xl">🖼️</div>
                            </div>
                            <div className="px-2 py-1 text-[8px] text-slate-300">
                                {galleryImages?.[0] ? 'Preview available' : 'No gallery preview'}
                            </div>
                        </div>
                    </Html>
                ) : null}
            </Billboard>
        </group>
    );
}

function MarkerBillboard({
    position,
    icon,
    label,
    accent = '#22d3ee',
}: {
    position: [number, number, number];
    icon: string;
    label: string;
    accent?: string;
}) {
    const texture = useMemo(() => makeBadgeTexture(icon, label, accent), [icon, label, accent]);

    useEffect(() => () => {
        texture.dispose();
    }, [texture]);

    return (
        <Billboard follow lockX lockY lockZ position={position}>
            <mesh position={[0, 0.45, 0.08]} renderOrder={30}>
                <planeGeometry args={MARKER_PLANE_SIZE} />
                <meshBasicMaterial map={texture} transparent depthTest={false} depthWrite={false} />
            </mesh>
        </Billboard>
    );
}

function SceneContent({
    position,
    nearbyUsers,
    myUserId,
    user,
    myDisplayName,
    myAvatarUrl,
    myStatus,
    isVisibleOnMap,
    currentProvince,
    galleryActive,
    galleryTitle,
    galleryImages,
    searchTag,
    filterDistance,
    filterAgeMin,
    filterAgeMax,
    searchMarkerPos,
    scale,
    cameraZ,
    tiltAngle,
    planeYScale,
    perspectivePx,
    cameraHeightPct,
    cameraRotateDeg,
    cameraRotateXDeg,
    cameraRotateYDeg,
    panX,
    panY,
    selfDragX,
    selfDragY,
    mapMode,
    isLooterGameMode,
    boatTargetPin,
    onSelectUser,
    onSelectSelf,
    onRequestMove,
}: AlinMapThreeSceneProps) {
    const sceneRef = useRef<THREE.Group>(null);
    const { scene } = useThree();
    const looterState = useLooterState();
    const safeWorldItems = useMemo(() => sanitizeWorldItems(looterState.worldItems), [looterState.worldItems]);
    const { state: looterStateObj, encounter } = looterState;

    useEffect(() => {
        scene.fog = new THREE.Fog('#08111b', 1800, 22000);
        scene.background = new THREE.Color(mapMode === 'satellite' ? '#020b12' : '#071018');
    }, [mapMode, scene]);

    const filteredUsers = useMemo(() => {
        const baseLat = position?.[0] ?? 0;
        const baseLng = position?.[1] ?? 0;
        const visible = nearbyUsers.filter((u) => {
            if (u.id === myUserId || u.id === user?.uid) return false;
            if (searchTag) {
                const term = searchTag.toLowerCase();
                const matchesName = (u.displayName || u.username || '').toLowerCase().includes(term);
                const tagsStr = (Array.isArray(u.tags) ? u.tags.join(' ') : u.tags || '').toLowerCase();
                const matchesTags = tagsStr.includes(term);
                const statusStr = (u.status || '').toLowerCase();
                const matchesStatus = statusStr.includes(term);
                if (!matchesName && !matchesTags && !matchesStatus) return false;
            }
            if (u.lat == null || u.lng == null || Number.isNaN(u.lat) || Number.isNaN(u.lng)) return false;
            const distKm = Math.sqrt(((u.lat - baseLat) ** 2) + ((u.lng - baseLng) ** 2)) * 111;
            if (distKm > filterDistance) return false;
            const age = u.birthdate ? (new Date().getFullYear() - new Date(u.birthdate).getFullYear()) : 20;
            if (age < filterAgeMin || age > filterAgeMax) return false;
            return true;
        });
        return visible.slice(0, isLooterGameMode ? 40 : 90);
    }, [nearbyUsers, myUserId, user?.uid, searchTag, filterDistance, filterAgeMin, filterAgeMax, position, isLooterGameMode]);

    useFrame(() => {
        if (!sceneRef.current) return;
        const liftX = panX.get();
        const liftZ = panY.get();
        const tilt = tiltAngle.get();

        sceneRef.current.position.set(liftX * MAP_COORD_SCENE_SCALE, 0, liftZ * MAP_COORD_SCENE_SCALE);
        sceneRef.current.rotation.set(
            THREE.MathUtils.degToRad(tilt + cameraRotateXDeg),
            THREE.MathUtils.degToRad(cameraRotateYDeg),
            THREE.MathUtils.degToRad(cameraRotateDeg)
        );
    });

    if (!position) return null;

    const origin = { lat: position[0], lng: position[1] };
    const selfPos = worldToScene(origin, origin);
    const selfLift = pxToScene(selfDragX.get() || 0);
    const selfDepth = pxToScene(selfDragY.get() || 0);
    const searchMarkerScene = searchMarkerPos ? worldToScene(origin, searchMarkerPos) : null;
    const fortressScene = looterStateObj?.fortressLat && looterStateObj?.fortressLng
        ? worldToScene(origin, { lat: looterStateObj.fortressLat, lng: looterStateObj.fortressLng })
        : null;
    const boatTargetScene = boatTargetPin ? worldToScene(origin, boatTargetPin) : null;

    return (
        <group ref={sceneRef}>
            <Ground mapMode={mapMode} />

            <group position={[0, 0.08, 0]}>
                <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
                    <circleGeometry args={[1200, 64]} />
                    <meshBasicMaterial color="#22d3ee" transparent opacity={0.05} />
                </mesh>
            </group>

            <AvatarBillboard
                name={myDisplayName || user?.displayName || 'Me'}
                avatarUrl={myAvatarUrl || user?.photoURL}
                position={[selfPos.x + selfLift, 0.25, selfPos.z + selfDepth]}
                status={myStatus}
                isVisibleOnMap={isVisibleOnMap}
                onClick={() => onSelectSelf?.({
                    id: user?.uid || myUserId || 'self',
                    username: myDisplayName,
                    lat: origin.lat,
                    lng: origin.lng,
                    isSelf: true,
                })}
                showGallery={galleryActive}
                galleryTitle={galleryTitle}
                galleryImages={galleryImages}
            />

            {currentProvince ? (
                <MarkerBillboard
                    position={[selfPos.x + pxToScene(180), 0.5, selfPos.z - pxToScene(180)]}
                    icon="Province"
                    label={currentProvince}
                    accent="#0ea5e9"
                />
            ) : null}

            {searchMarkerPos ? (
                <MarkerBillboard
                    position={[searchMarkerScene!.x, 0.4, searchMarkerScene!.z]}
                    icon="Pin"
                    label="Search"
                    accent="#fb7185"
                />
            ) : null}

            {filteredUsers.map((u) => {
                const pos = worldToScene(origin, u);
                return (
                    <AvatarBillboard
                        key={u.id}
                        name={u.displayName || u.username || 'U'}
                        avatarUrl={u.avatar_url}
                        position={[pos.x, 0.22, pos.z]}
                        status={u.status}
                        isVisibleOnMap
                        onClick={() => onSelectUser?.(u)}
                    />
                );
            })}

            {!encounter && looterStateObj?.fortressLat && looterStateObj?.fortressLng ? (
                <MarkerBillboard
                    position={[fortressScene!.x, 0.55, fortressScene!.z]}
                    icon="🏰"
                    label="Thành trì"
                    accent="#f59e0b"
                />
            ) : null}

            {!encounter && boatTargetPin ? (
                <MarkerBillboard
                    position={[boatTargetScene!.x, 0.32, boatTargetScene!.z]}
                    icon="📍"
                    label="Target"
                    accent="#22c55e"
                />
            ) : null}

            {encounter ? (
                <MarkerBillboard
                    position={[pxToScene(180), 0.7, pxToScene(-220)]}
                    icon="🚢"
                    label="Enemy"
                    accent="#ef4444"
                />
            ) : null}

            {!encounter && safeWorldItems.slice(0, isLooterGameMode ? 24 : 60).map((item: any) => {
                const pos = worldToScene(origin, { lat: item.lat, lng: item.lng });
                const icon = item?.item?.icon || '💎';
                const title = item?.item?.name || 'Loot';
                return (
                    <MarkerBillboard
                        key={item.spawnId}
                        position={[pos.x, 0.3, pos.z]}
                        icon={icon}
                        label={title}
                        accent={item?.item?.type === 'portal' ? '#a78bfa' : '#22d3ee'}
                    />
                );
            })}

            <Html position={[0, 10, 0]} center transform sprite distanceFactor={18} occlude={false}>
                <div className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-[9px] font-black uppercase tracking-[0.26em] text-cyan-200 shadow-lg backdrop-blur-md">
                    {mapMode} / {currentProvince || 'Global'}
                </div>
            </Html>

            <CameraRig
                scale={scale}
                cameraZ={cameraZ}
                cameraHeightPct={cameraHeightPct}
                perspectivePx={perspectivePx}
            />
        </group>
    );
}

const AlinMapThreeScene: React.FC<AlinMapThreeSceneProps> = (props) => {
    return (
        <Canvas
            dpr={[1, 2]}
            frameloop="always"
            shadows={false}
            gl={{
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance',
                preserveDrawingBuffer: false,
            }}
            camera={{ fov: 46, near: 0.5, far: 120000, position: [0, 1600, 2200] }}
            onCreated={({ gl }) => {
                gl.setClearColor('#071018', 1);
                gl.outputColorSpace = THREE.SRGBColorSpace;
                gl.toneMapping = THREE.NoToneMapping;
                gl.toneMappingExposure = 1;
                gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            }}
        >
            <ambientLight intensity={1.4} />
            <directionalLight position={[4000, 8000, 6000]} intensity={1.1} color="#dbeafe" />
            <directionalLight position={[-4000, 2000, -3000]} intensity={0.35} color="#22d3ee" />
            <Suspense
                fallback={
                    <Html center>
                        <div className="rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-md">
                            Loading Three.js scene...
                        </div>
                    </Html>
                }
            >
                <SceneContent {...props} />
            </Suspense>
        </Canvas>
    );
};

export default React.memo(AlinMapThreeScene);
