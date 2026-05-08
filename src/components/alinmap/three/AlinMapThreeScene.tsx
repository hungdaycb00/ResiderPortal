import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { MotionValue } from 'framer-motion';
import { sanitizeWorldItems, useLooterActions, useLooterState } from '../looter-game/LooterGameContext';
import { DEGREES_TO_PX, MAP_PLANE_SCALE, BILLBOARD_VISIBLE_DISTANCE_KM } from '../constants';

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
    boatOffsetX?: MotionValue<number>;
    boatOffsetY?: MotionValue<number>;
    selectedUser?: any;
    onSelectUser?: (user: any) => void;
    onSelectSelf?: (user: any) => void;
    onRequestMove?: (lat: number, lng: number) => void;
    onStopBoat?: () => void;
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
    boatOffsetX,
    boatOffsetY,
    selectedUser,
    onSelectUser,
    onSelectSelf,
    onRequestMove,
    onStopBoat,
}: AlinMapThreeSceneProps) {
    const tiltGroupRef = useRef<THREE.Group>(null);
    const moveGroupRef = useRef<THREE.Group>(null);
    // Track vị trí thuyền thực tế để render DashedPath chính xác
    const boatPosRef = useRef<[number, number, number]>([0, 0, 0]);
    const { scene } = useThree();
    const looterState = useLooterState();
    const looterActions = useLooterActions();
    const safeWorldItems = useMemo(
        () => (isLooterGameMode ? sanitizeWorldItems(looterState.worldItems) : []),
        [looterState.worldItems, isLooterGameMode]
    );
    const { state: looterStateObj, encounter } = looterState;
    const { openFortressStorage, setShowMinigame, pickupItem } = looterActions;

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
            
            // Gán khoảng cách vào object để dùng cho logic billboard
            u.distKm = distKm;
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
            const currentPlaneY = planeYScale?.get?.() ?? MAP_PLANE_SCALE;
            const visualBoatX = (boatOffsetX?.get?.() ?? 0) * MAP_PLANE_SCALE;
            const visualBoatY = (boatOffsetY?.get?.() ?? 0) * currentPlaneY;
            boatPosRef.current = [
                sp.x + pxToScene(visualBoatX),
                5.0,
                sp.z + pxToScene(visualBoatY),
            ];
        }
    });

    const origin: LatLng = position ? { lat: position[0], lng: position[1] } : { lat: 0, lng: 0 };
    const selfPos = worldToScene(origin, origin);
    const selfLift = pxToScene(selfDragX.get() || 0);
    const selfDepth = pxToScene(selfDragY.get() || 0);
    const searchMarkerScene = searchMarkerPos ? worldToScene(origin, searchMarkerPos) : null;
    const fortressScene = looterStateObj?.fortressLat && looterStateObj?.fortressLng
        ? worldToScene(origin, { lat: looterStateObj.fortressLat, lng: looterStateObj.fortressLng })
        : null;
    const boatTargetScene = boatTargetPin ? worldToScene(origin, boatTargetPin) : null;
    const getCurrentBoatLatLng = React.useCallback((): LatLng => {
        const offsetX = boatOffsetX?.get?.();
        const offsetY = boatOffsetY?.get?.();
        if (typeof offsetX === 'number' && typeof offsetY === 'number') {
            return {
                lat: origin.lat - offsetY / DEGREES_TO_PX,
                lng: origin.lng + offsetX / DEGREES_TO_PX,
            };
        }
        return {
            lat: looterStateObj?.currentLat ?? origin.lat,
            lng: looterStateObj?.currentLng ?? origin.lng,
        };
    }, [boatOffsetX, boatOffsetY, looterStateObj?.currentLat, looterStateObj?.currentLng, origin.lat, origin.lng]);

    const distanceMeters = React.useCallback((a: LatLng, b: LatLng) => {
        const cosLat = Math.cos((a.lat * Math.PI) / 180);
        const dLat = b.lat - a.lat;
        const dLng = (b.lng - a.lng) * cosLat;
        return Math.sqrt(dLat * dLat + dLng * dLng) * 111000;
    }, []);

    const getWorldItemIcon = React.useCallback((worldItem: any) => {
        if (worldItem?.item?.icon) return worldItem.item.icon;
        if (worldItem?.item?.type === 'portal') return '\ud83c\udf00';
        if (worldItem?.minigameType) return '\ud83d\udce6';
        if (worldItem?.item?.type === 'bag') return '\ud83c\udf92';
        return '\ud83d\udc8e';
    }, []);

    const getWorldItemType = React.useCallback((worldItem: any) => {
        if (worldItem?.item?.type === 'portal') return 'portal';
        if (worldItem?.minigameType) return 'chest';
        if (worldItem?.item?.type === 'bag') return 'bag';
        return 'item';
    }, []);

    const getWorldItemAccent = React.useCallback((worldItem: any) => {
        const rarity = String(worldItem?.item?.rarity || '').toLowerCase();
        if (worldItem?.item?.type === 'portal') return '#a78bfa';
        if (rarity.includes('legend')) return '#f59e0b';
        if (rarity.includes('rare')) return '#60a5fa';
        if (rarity.includes('uncommon')) return '#34d399';
        return '#22d3ee';
    }, []);

    const handleWorldItemClick = React.useCallback((worldItem: any) => {
        if (!isLooterGameMode || !worldItem) return;
        const boat = getCurrentBoatLatLng();
        const dist = distanceMeters(boat, { lat: worldItem.lat, lng: worldItem.lng });
        const interactionRadius = 250;
        const isPortal = worldItem?.item?.type === 'portal';

        if (dist > interactionRadius) {
            onRequestMove?.(worldItem.lat, worldItem.lng);
            return;
        }

        onStopBoat?.();
        if (isPortal) {
            openFortressStorage?.('portal');
            return;
        }

        if (worldItem.minigameType) {
            setShowMinigame?.({ ...worldItem, currentLat: boat.lat, currentLng: boat.lng });
            return;
        }

        pickupItem?.(worldItem.spawnId, worldItem, boat.lat, boat.lng);
    }, [
        distanceMeters,
        getCurrentBoatLatLng,
        isLooterGameMode,
        onRequestMove,
        onStopBoat,
        openFortressStorage,
        pickupItem,
        setShowMinigame,
    ]);

    const handleFortressClick = React.useCallback(() => {
        if (!isLooterGameMode || !looterStateObj?.fortressLat || !looterStateObj?.fortressLng) return;
        const target = { lat: looterStateObj.fortressLat, lng: looterStateObj.fortressLng };
        const boat = getCurrentBoatLatLng();
        if (distanceMeters(boat, target) <= 250) {
            onStopBoat?.();
            openFortressStorage?.('fortress');
        } else {
            onRequestMove?.(target.lat, target.lng);
        }
    }, [
        distanceMeters,
        getCurrentBoatLatLng,
        isLooterGameMode,
        looterStateObj?.fortressLat,
        looterStateObj?.fortressLng,
        onRequestMove,
        onStopBoat,
        openFortressStorage,
    ]);

    const renderedWorldItems = useMemo(() => {
        if (!isLooterGameMode || encounter || !safeWorldItems.length) return [];
        const centerLat = looterStateObj?.currentLat ?? origin.lat;
        const centerLng = looterStateObj?.currentLng ?? origin.lng;
        const cullDeg = (isDesktop ? 5000 : 3200) / 111000;
        const maxItems = isDesktop ? 42 : 24;

        return safeWorldItems
            .filter((item: any) => Math.abs(item.lat - centerLat) <= cullDeg && Math.abs(item.lng - centerLng) <= cullDeg)
            .map((item: any) => {
                const dLat = item.lat - centerLat;
                const dLng = item.lng - centerLng;
                const priority = item?.item?.type === 'portal' ? -1 : 0;
                return { item, score: priority + dLat * dLat + dLng * dLng };
            })
            .sort((a, b) => a.score - b.score)
            .slice(0, maxItems)
            .map((entry) => entry.item);
    }, [
        encounter,
        isDesktop,
        isLooterGameMode,
        looterStateObj?.currentLat,
        looterStateObj?.currentLng,
        origin.lat,
        origin.lng,
        safeWorldItems,
    ]);

    if (!position) return null;

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
                    <ProceduralBoat
                        position={[selfPos.x, 0, selfPos.z]}
                        offsetX={boatOffsetX}
                        offsetY={boatOffsetY}
                        planeYScale={planeYScale}
                    />
                ) : (() => {
                    const isSelfSelected = selectedUser?.id === 'self' || selectedUser?.id === user?.uid || selectedUser?.id === myUserId;
                    return (
                        <AvatarBillboard
                            name={myDisplayName || user?.displayName || 'Me'}
                            avatarUrl={myAvatarUrl || user?.photoURL}
                            position={[selfPos.x + selfLift, 0.25, selfPos.z + selfDepth]}
                            status={myStatus}
                            isVisibleOnMap={isVisibleOnMap}
                            isSelected={isSelfSelected}
                            onClick={() => onSelectSelf?.({
                                id: user?.uid || myUserId || 'self',
                                username: myDisplayName,
                                lat: origin.lat,
                                lng: origin.lng,
                                isSelf: true,
                            })}
                            showGallery={galleryActive && (isSelfSelected || (isVisibleOnMap && !isLooterGameMode))}
                            galleryTitle={galleryTitle}
                            galleryImages={galleryImages}
                        />
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
                            showGallery={!isLooterGameMode && u.gallery?.active && (selectedUser?.id === u.id || (u.distKm != null && u.distKm <= BILLBOARD_VISIBLE_DISTANCE_KM))}
                            galleryTitle={u.gallery?.title}
                            galleryImages={u.gallery?.images}
                            dimmed={isLooterGameMode}
                        />
                    );
                })}

                {/* Fortress */}
                {isLooterGameMode && !encounter && looterStateObj?.fortressLat && looterStateObj?.fortressLng ? (
                    <ProceduralFortress position={[fortressScene!.x, 0, fortressScene!.z]} onClick={handleFortressClick} />
                ) : null}

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
                        size={AVATAR_PLANE_SIZE * 0.6}
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
                {renderedWorldItems.map((item: any) => {
                    const pos = worldToScene(origin, { lat: item.lat, lng: item.lng });
                    const title = item?.item?.name || 'Loot';
                    return (
                        <LootSprite
                            key={item.spawnId}
                            position={[pos.x, 0.3, pos.z]}
                            type={getWorldItemType(item)}
                            icon={getWorldItemIcon(item)}
                            title={title}
                            accent={getWorldItemAccent(item)}
                            scale={2}
                            onClick={() => handleWorldItemClick(item)}
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
            dpr={props.isDesktop ? [1, 1.5] : [0.85, 1]}
            frameloop="always"
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
                gl.outputColorSpace = THREE.SRGBColorSpace;
                gl.toneMapping = THREE.NoToneMapping;
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
