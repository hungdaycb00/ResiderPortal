import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Fog, Color, Group, MathUtils, Mesh, SRGBColorSpace, NoToneMapping } from 'three';
import { useMotionValueEvent, type MotionValue } from 'framer-motion';
import { sanitizeWorldItems, useLooterActions, useLooterState } from '../looter-game/LooterGameContext';
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

// Hooks
import { useLooterInteraction } from './scene/looterInteraction';
import { useDragHandlers } from './scene/useDragHandlers';

// Utils
import { worldToScene, pxToScene, MAP_COORD_SCENE_SCALE, AVATAR_PLANE_SIZE, type LatLng } from './sceneUtils';

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
    tiltAngle: MotionValue<number>;  // keep backward compat — alias for effectiveTiltAngle
    planeYScale: MotionValue<number>;
    perspectivePx: number;
    cameraHeightOffset: number;
    cameraRotateDeg: number;
    cameraPitchOverride: number | null;
    cameraRotateYDeg: number;
    panX: MotionValue<number>;
    panY: MotionValue<number>;
    selfDragX: MotionValue<number>;
    selfDragY: MotionValue<number>;
    mapMode: 'grid' | 'satellite';
    isLooterGameMode?: boolean;
    boatTargetPin?: LatLng | null;
    boatOffsetX?: MotionValue<number>;
    boatOffsetY?: MotionValue<number>;
    selectedUser?: any;
    onSelectUser?: (user: any) => void;
    onSelectSelf?: (user: any) => void;
    onRequestMove?: (lat: number, lng: number, source?: string) => void;
    onStopBoat?: () => void;
    onSelfDragEnd?: (newLat: number, newLng: number) => void;
    onSetArrivalAction?: (action: (() => void) | null) => void;
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
    isDesktop,
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
    cameraHeightOffset,
    cameraRotateDeg,
    cameraPitchOverride,
    cameraRotateYDeg,
    panX,
    panY,
    selfDragX,
    selfDragY,
    mapMode,
    isLooterGameMode,
    boatTargetPin,
    boatOffsetX,
    boatOffsetY,
    selectedUser,
    onSelectUser,
    onSelectSelf,
    onRequestMove,
    onStopBoat,
    onSelfDragEnd,
    onSetArrivalAction,
}: AlinMapThreeSceneProps) {
    const tiltGroupRef = useRef<Group>(null);
    const moveGroupRef = useRef<Group>(null);
    // Track vị trí thuyền thực tế để render DashedPath chính xác
    const boatPosRef = useRef<[number, number, number]>([0, 0, 0]);
    // Ngăn ground click khi item đã được click (R3F raycasting hit cả hai sibling)
    const itemClickLockRef = useRef(false);
    // Cache useFrame values to skip redundant .set() calls
    const lastLiftXRef = useRef(0);
    const lastLiftZRef = useRef(0);
    const lastTiltRef = useRef(0);
    const lastBoatPosRef = useRef<[number, number, number]>([0, 0, 0]);
    const frameSkipRef = useRef(0);
    const groundMeshRef = useRef<Mesh>(null);
    const { scene } = useThree();
    const looterState = useLooterState();
    const looterActions = useLooterActions();
    const safeWorldItems = useMemo(
        () => (isLooterGameMode ? sanitizeWorldItems(looterState.worldItems) : []),
        [looterState.worldItems, isLooterGameMode]
    );
    const { state: looterStateObj, encounter } = looterState;
    const { openFortressStorage, setShowMinigame, pickupItem } = looterActions;

    // Subscribe to selfDragX/Y motion value changes for reactive avatar repositioning
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    useMotionValueEvent(selfDragX, 'change', (v) => setDragOffset(prev => ({ ...prev, x: v })));
    useMotionValueEvent(selfDragY, 'change', (v) => setDragOffset(prev => ({ ...prev, y: v })));

    // ─── Hooks: Drag & Looter Interaction ─────────────────────────────────
    const origin: LatLng = position ? { lat: position[0], lng: position[1] } : { lat: 0, lng: 0 };

    const { selfDragRef, handleSelfPointerDown, handleSelfPointerMove, handleSelfPointerUp } = useDragHandlers({
        isLooterGameMode: !!isLooterGameMode,
        position,
        scale,
        planeYScale,
        selfDragX,
        selfDragY,
        onSelfDragEnd,
    });

    const {
        getWorldItemIcon, getWorldItemType, getWorldItemAccent,
        handleWorldItemClick, handleFortressClick, handleGroundClick,
        waypointItems, waypointSpawnIds, renderedWorldItems,
        itemRenderData, waypointRenderData,
    } = useLooterInteraction({
        isLooterGameMode: !!isLooterGameMode,
        isDesktop,
        origin,
        safeWorldItems,
        looterStateObj,
        encounter,
        boatTargetPin: boatTargetPin ?? null,
        boatOffsetX,
        boatOffsetY,
        itemClickLockRef,
        onRequestMove,
        onStopBoat,
        onSetArrivalAction,
        openFortressStorage,
        setShowMinigame,
        pickupItem,
    });

    // ─── Effects & Derived State ──────────────────────────────────────────
    useEffect(() => {
        scene.fog = isLooterGameMode ? null : new Fog('#08111b', 1800, 22000);
        scene.background = new Color(mapMode === 'satellite' ? '#020b12' : '#071018');
    }, [mapMode, scene, isLooterGameMode]);

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

            // Gán khoảng cách vào object để dùng cho logic billboard
            u.distKm = distKm;
            return true;
        });
        // Sort by distance ascending — prioritize closer users for gallery billboards
        visible.sort((a, b) => (a.distKm ?? 9999) - (b.distKm ?? 9999));
        return visible.slice(0, isLooterGameMode ? 40 : 90);
    }, [nearbyUsers, myUserId, user?.uid, searchTag, filterDistance, filterAgeMin, filterAgeMax, position, isLooterGameMode]);

    useFrame(() => {
        if (!tiltGroupRef.current || !moveGroupRef.current) return;
        const liftX = panX.get();
        const liftZ = panY.get();
        const tilt = tiltAngle.get();

        if (Math.abs(liftX - lastLiftXRef.current) > 0.001 || Math.abs(liftZ - lastLiftZRef.current) > 0.001) {
            moveGroupRef.current.position.set(liftX * MAP_COORD_SCENE_SCALE, 0, liftZ * MAP_COORD_SCENE_SCALE);
            lastLiftXRef.current = liftX;
            lastLiftZRef.current = liftZ;
        }

        if (Math.abs(tilt - lastTiltRef.current) > 0.001) {
            tiltGroupRef.current.rotation.set(
                MathUtils.degToRad(tilt),
                MathUtils.degToRad(cameraRotateYDeg),
                MathUtils.degToRad(cameraRotateDeg)
            );
            lastTiltRef.current = tilt;
        }

        // Cập nhật vị trí thuyền thực tế để DashedPath luôn bắt đúng điểm (mỗi 3 frame để giảm rAF cost)
        if (position && isLooterGameMode) {
            frameSkipRef.current = (frameSkipRef.current + 1) % 3;
            if (frameSkipRef.current === 0) {
                const origin2: LatLng = { lat: position[0], lng: position[1] };
                const sp = worldToScene(origin2, origin2);
                const visualBoatX = (boatOffsetX?.get?.() ?? 0) * MAP_PLANE_SCALE;
                const visualBoatY = (boatOffsetY?.get?.() ?? 0) * MAP_PLANE_SCALE;
                const nx = sp.x + pxToScene(visualBoatX);
                const nz = sp.z + pxToScene(visualBoatY);
                const [lx, , lz] = lastBoatPosRef.current;
                if (Math.abs(nx - lx) > 0.01 || Math.abs(nz - lz) > 0.01) {
                    // ⚠️ ĐỒNG BỘ Y=5.0: giá trị này phải khớp với ProceduralBoat.tsx (bobbing Y offset +5)
                    // và tất cả looter element bên dưới (DashedPath to Y=5.0, target pin Y=5.02).
                    // Nếu thay đổi, phải cập nhật đồng thời tất cả các vị trí Y liên quan.
                    boatPosRef.current = [nx, 5.0, nz];
                    lastBoatPosRef.current = [nx, 0, nz];
                }
            }
        }
    });

    const selfPos = worldToScene(origin, origin);
    const selfLift = pxToScene(dragOffset.x);
    const selfDepth = pxToScene(dragOffset.y);
    const searchMarkerScene = searchMarkerPos ? worldToScene(origin, searchMarkerPos) : null;
    const fortressScene = looterStateObj?.fortressLat && looterStateObj?.fortressLng
        ? worldToScene(origin, { lat: looterStateObj.fortressLat, lng: looterStateObj.fortressLng })
        : null;
    const boatTargetScene = boatTargetPin ? worldToScene(origin, boatTargetPin) : null;

    // Precompute user positions (stays in main file — uses filteredUsers which is local)
    const userRenderData = useMemo(() =>
        filteredUsers.map((u) => ({
            user: u,
            pos: worldToScene(origin, u),
        }))
    , [filteredUsers, origin.lat, origin.lng]);

    if (!position) return null;

    return (
        <group ref={tiltGroupRef}>
            <group ref={moveGroupRef}>
                {/* 1. Nền bản đồ (Ground) */}
                <Ground mapMode={mapMode} groundRef={groundMeshRef}
                    onGroundClick={(point) => handleGroundClick(groundMeshRef, point)} />

                {/* Search Target Pin */}
                <group position={[0, 0.08, 0]}>
                    <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
                        <circleGeometry args={[1200, 64]} />
                        <meshBasicMaterial color="#22d3ee" transparent opacity={0.05} />
                    </mesh>
                </group>

                {/* Self avatar */}
                {isLooterGameMode ? (
                    <ProceduralBoat
                        position={[selfPos.x, 0, selfPos.z]}
                        offsetX={boatOffsetX}
                        offsetY={boatOffsetY}
                        currentLat={looterStateObj?.currentLat}
                        currentLng={looterStateObj?.currentLng}
                        fortressLat={looterStateObj?.fortressLat}
                        fortressLng={looterStateObj?.fortressLng}
                    />
                ) : (() => {
                    const isSelfSelected = selectedUser?.id === 'self' || selectedUser?.id === user?.uid || selectedUser?.id === myUserId;
                    return (
                        <group
                            onPointerDown={handleSelfPointerDown}
                            onPointerMove={handleSelfPointerMove}
                            onPointerUp={handleSelfPointerUp}
                        >
                            <AvatarBillboard
                                name={myDisplayName || user?.displayName || 'Me'}
                                avatarUrl={myAvatarUrl || user?.photoURL}
                                position={[selfPos.x + selfLift, 0.25, selfPos.z + selfDepth]}
                                status={myStatus}
                                isVisibleOnMap={isVisibleOnMap}
                                isSelected={isSelfSelected}
                                onClick={() => {
                                    if (!selfDragRef.current.moved) {
                                        onSelectSelf?.({
                                            id: user?.uid || myUserId || 'self',
                                            username: myDisplayName,
                                            lat: origin.lat,
                                            lng: origin.lng,
                                            isSelf: true,
                                        });
                                    }
                                }}
                            showGallery={galleryActive && (isSelfSelected || (isVisibleOnMap && !isLooterGameMode))}
                            galleryTitle={galleryTitle}
                            galleryImages={galleryImages}
                        />
                        </group>
                    );
                })()}

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
                {userRenderData.map(({ user: u, pos }) => (
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
                ))}

                {/* ─── Looter Game Elements ────────────────────────────────────────── */}
                {/* ⚠️ Tất cả vị trí Y và scale dưới đây đồng bộ với:                   */}
                {/*   - ProceduralBoat.tsx: scale=4, bobbing Y offset +5               */}
                {/*   - boatPosRef Y=5.0 (trong useFrame phía trên)                    */}
                {/*   Khi scale hình ảnh, phải cập nhật đồng bộ cả 3 nơi.              */}

                {/* Fortress */}
                {isLooterGameMode && !encounter && looterStateObj?.fortressLat && looterStateObj?.fortressLng ? (
                    <ProceduralFortress position={[fortressScene!.x, 0, fortressScene!.z]} onClick={handleFortressClick} />
                ) : null}

                {/* Waypoint: 3 item gần nhất — luôn hiển thị, to hơn và cao hơn item thường */}
                {waypointRenderData.map(({ item, pos }: any) => (
                    <LootSprite
                        key={`wp-${item.spawnId}`}
                        position={[pos.x, 3.5, pos.z]}
                        type={getWorldItemType(item)}
                        icon={getWorldItemIcon(item)}
                        title={item?.item?.name || 'Loot'}
                        accent={getWorldItemAccent(item)}
                        scale={2.4}
                        size={AVATAR_PLANE_SIZE * 2.0}
                        renderOrder={50}
                        onClick={() => handleWorldItemClick(item)}
                    />
                ))}

                {/* Đường nét đứt từ thuyền → target (chỉ khi có target và không combat) */}
                {isLooterGameMode && !encounter && boatTargetPin && boatTargetScene ? (
                    <DashedPath
                        from={boatPosRef.current}
                        to={[boatTargetScene.x, 5.0, boatTargetScene.z]}
                        color="#22d3ee"
                    />
                ) : null}

                {/* Boat target pin (chỉ còn circle, DashedPath đã vẽ target) */}
                {isLooterGameMode && !encounter && boatTargetPin ? (
                    <LootSprite
                        position={[boatTargetScene!.x, 5.02, boatTargetScene!.z]}
                        type="target"
                        size={AVATAR_PLANE_SIZE * 0.2}
                        scale={2}
                    />
                ) : null}

                {/* Enemy */}
                {isLooterGameMode && encounter ? (
                    <LootSprite
                        position={[
                            boatPosRef.current[0] + pxToScene(180),
                            0.7,
                            boatPosRef.current[2] + pxToScene(-220)
                        ]}
                        type="enemy"
                        scale={2.4}
                    />
                ) : null}

                {/* World loot items */}
                {itemRenderData.map(({ item, pos }: any) => (
                    <LootSprite
                        key={item.spawnId}
                        position={[pos.x, 3.0, pos.z]}
                        type={getWorldItemType(item)}
                        icon={getWorldItemIcon(item)}
                        title={item?.item?.name || 'Loot'}
                        accent={getWorldItemAccent(item)}
                        scale={2}
                        size={AVATAR_PLANE_SIZE * 1.8}
                        renderOrder={40}
                        onClick={() => handleWorldItemClick(item)}
                    />
                ))}

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
                cameraHeightOffset={cameraHeightOffset}
                perspectivePx={perspectivePx}
            />
        </group>
    );
}

// ─── Canvas Entry Point ───────────────────────────────────────────────────────
const AlinMapThreeScene: React.FC<AlinMapThreeSceneProps> = (props) => {
    return (
        <Canvas
            dpr={props.isDesktop ? [1, 1.5] : [0.85, 1]}
            frameloop="demand"
            shadows={false}
            gl={{
                antialias: props.isDesktop,
                alpha: true,
                powerPreference: 'high-performance',
                preserveDrawingBuffer: false,
            }}
            camera={{ fov: 46, near: 0.5, far: 120000, position: [0, 1600, 2200] }}
            onCreated={({ gl }) => {
                gl.setClearColor('#071018', 1);
                gl.outputColorSpace = SRGBColorSpace;
                gl.toneMapping = NoToneMapping;
                gl.toneMappingExposure = 1;
                gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, props.isDesktop ? 1.5 : 1));
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
