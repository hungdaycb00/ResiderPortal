import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { MotionValue } from 'framer-motion';
import { sanitizeWorldItems, useLooterState } from '../looter-game/LooterGameContext';
import { MAP_PLANE_SCALE } from '../constants';

// Sub-components
import CameraRig from './CameraRig';
import Ground from './Ground';
import AvatarBillboard from './AvatarBillboard';
import MarkerBillboard from './MarkerBillboard';
import ProceduralBoat from './models/ProceduralBoat';
import ProceduralFortress from './models/ProceduralFortress';
import LootSprite from './models/LootSprite';
import DashedPath from './models/DashedPath';

// Utils
import { worldToScene, pxToScene, MAP_COORD_SCENE_SCALE, type LatLng } from './sceneUtils';

// ─── Public Types ─────────────────────────────────────────────────────────────
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
    selectedUser?: any;
    onSelectUser?: (user: any) => void;
    onSelectSelf?: (user: any) => void;
    onRequestMove?: (lat: number, lng: number) => void;
}

// ─── Scene Content ────────────────────────────────────────────────────────────
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
    selectedUser,
    onSelectUser,
    onSelectSelf,
}: AlinMapThreeSceneProps) {
    const tiltGroupRef = useRef<THREE.Group>(null);
    const moveGroupRef = useRef<THREE.Group>(null);
    // Track vị trí thuyền thực tế để render DashedPath chính xác
    const boatPosRef = useRef<[number, number, number]>([0, 0, 0]);
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
        if (!tiltGroupRef.current || !moveGroupRef.current) return;
        const liftX = panX.get();
        const liftZ = panY.get();
        const tilt = tiltAngle.get();

        moveGroupRef.current.position.set(liftX * MAP_COORD_SCENE_SCALE, 0, liftZ * MAP_COORD_SCENE_SCALE);
        
        tiltGroupRef.current.rotation.set(
            THREE.MathUtils.degToRad(tilt + cameraRotateXDeg),
            THREE.MathUtils.degToRad(cameraRotateYDeg),
            THREE.MathUtils.degToRad(cameraRotateDeg)
        );

        // Cập nhật vị trí thuyền thực tế để DashedPath luôn bắt đúng điểm
        if (position && isLooterGameMode) {
            const origin2: LatLng = { lat: position[0], lng: position[1] };
            const sp = worldToScene(origin2, origin2);
            boatPosRef.current = [
                sp.x + pxToScene(selfDragX.get() || 0),
                8,
                sp.z + pxToScene(selfDragY.get() || 0),
            ];
        }
    });

    if (!position) return null;

    const origin: LatLng = { lat: position[0], lng: position[1] };
    const selfPos = worldToScene(origin, origin);
    const selfLift = pxToScene(selfDragX.get() || 0);
    const selfDepth = pxToScene(selfDragY.get() || 0);
    const searchMarkerScene = searchMarkerPos ? worldToScene(origin, searchMarkerPos) : null;
    const fortressScene = looterStateObj?.fortressLat && looterStateObj?.fortressLng
        ? worldToScene(origin, { lat: looterStateObj.fortressLat, lng: looterStateObj.fortressLng })
        : null;
    const boatTargetScene = boatTargetPin ? worldToScene(origin, boatTargetPin) : null;

    return (
        <group ref={tiltGroupRef}>
            <group ref={moveGroupRef}>
                {/* 1. Nền bản đồ (Ground) */}
                <Ground mapMode={mapMode} />

                {/* Search Target Pin */}
                <group position={[0, 0.08, 0]}>
                    <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
                        <circleGeometry args={[1200, 64]} />
                        <meshBasicMaterial color="#22d3ee" transparent opacity={0.05} />
                    </mesh>
                </group>

                {/* Self avatar */}
                {isLooterGameMode ? (
                    <ProceduralBoat position={[selfPos.x + selfLift, 0, selfPos.z + selfDepth]} />
                ) : (
                    <AvatarBillboard
                        name={myDisplayName || user?.displayName || 'Me'}
                        avatarUrl={myAvatarUrl || user?.photoURL}
                        position={[selfPos.x + selfLift, 0.25, selfPos.z + selfDepth]}
                        status={myStatus}
                        isVisibleOnMap={isVisibleOnMap}
                        isSelected={selectedUser?.id === 'self' || selectedUser?.id === user?.uid || selectedUser?.id === myUserId}
                        onClick={() => onSelectSelf?.({
                            id: user?.uid || myUserId || 'self',
                            username: myDisplayName,
                            lat: origin.lat,
                            lng: origin.lng,
                            isSelf: true,
                        })}
                        showGallery={isSelected && galleryActive}
                        galleryTitle={galleryTitle}
                        galleryImages={galleryImages}
                    />
                )}

                {/* Province marker */}
                {currentProvince ? (
                    <MarkerBillboard
                        position={[selfPos.x + pxToScene(180), 0.5, selfPos.z - pxToScene(180)]}
                        icon="Province"
                        label={currentProvince}
                        accent="#0ea5e9"
                    />
                ) : null}

                {/* Search marker */}
                {searchMarkerPos ? (
                    <MarkerBillboard
                        position={[searchMarkerScene!.x, 0.4, searchMarkerScene!.z]}
                        icon="Pin"
                        label="Search"
                        accent="#fb7185"
                    />
                ) : null}

                {/* Nearby users - làm mờ khi ở looter game mode */}
                {filteredUsers.map((u) => {
                    const pos = worldToScene(origin, u);
                    return (
                        <AvatarBillboard
                            key={u.id}
                            name={u.displayName || u.username || 'U'}
                            avatarUrl={isLooterGameMode ? null : u.avatar_url}
                            position={[pos.x, 0.22, pos.z]}
                            status={isLooterGameMode ? undefined : u.status}
                            isVisibleOnMap
                            isSelected={!isLooterGameMode && selectedUser?.id === u.id}
                            onClick={isLooterGameMode ? undefined : () => onSelectUser?.(u)}
                            showGallery={!isLooterGameMode && u.gallery?.active}
                            galleryTitle={u.gallery?.title}
                            galleryImages={u.gallery?.images}
                            dimmed={isLooterGameMode}
                        />
                    );
                })}

                {/* Fortress */}
                {!encounter && looterStateObj?.fortressLat && looterStateObj?.fortressLng ? (
                    <ProceduralFortress position={[fortressScene!.x, 0, fortressScene!.z]} />
                ) : null}

                {/* Đường nét đứt từ thuyền → target (chỉ khi có target và không combat) */}
                {isLooterGameMode && !encounter && boatTargetPin && boatTargetScene ? (
                    <DashedPath
                        from={boatPosRef.current}
                        to={[boatTargetScene.x, 5, boatTargetScene.z]}
                        color="#22d3ee"
                    />
                ) : null}

                {/* Boat target pin (chỉ còn circle, DashedPath đã vẽ target) */}
                {!encounter && boatTargetPin ? (
                    <LootSprite
                        position={[boatTargetScene!.x, 0.32, boatTargetScene!.z]}
                        type="target"
                    />
                ) : null}

                {/* Enemy */}
                {encounter ? (
                    <LootSprite
                        position={[pxToScene(180), 0.7, pxToScene(-220)]}
                        type="enemy"
                        scale={1.5}
                    />
                ) : null}

                {/* World loot items */}
                {!encounter && safeWorldItems.slice(0, isLooterGameMode ? 24 : 60).map((item: any) => {
                    const pos = worldToScene(origin, { lat: item.lat, lng: item.lng });
                    const isPortal = item?.item?.type === 'portal';
                    const title = item?.item?.name || 'Loot';
                    return (
                        <LootSprite
                            key={item.spawnId}
                            position={[pos.x, 0.3, pos.z]}
                            type={isPortal ? 'portal' : 'gem'}
                            title={title}
                            accent={isPortal ? '#a78bfa' : '#22d3ee'}
                        />
                    );
                })}

                {/* Mode label */}
                <Html position={[0, 10, 0]} center transform sprite distanceFactor={18} occlude={false}>
                    <div className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-[9px] font-black uppercase tracking-[0.26em] text-cyan-200 shadow-lg backdrop-blur-md">
                        {mapMode} / {currentProvince || 'Global'}
                    </div>
                </Html>
            </group>

            <CameraRig
                scale={scale}
                cameraZ={cameraZ}
                cameraHeightPct={cameraHeightPct}
                perspectivePx={perspectivePx}
            />
        </group>
    );
}

// ─── Canvas Entry Point ───────────────────────────────────────────────────────
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
