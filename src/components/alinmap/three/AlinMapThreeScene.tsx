import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Fog, Color, Group, MathUtils, Mesh, Vector3, SRGBColorSpace, NoToneMapping } from 'three';
import { useMotionValueEvent, type MotionValue } from 'framer-motion';
import { sanitizeWorldItems, useLooterActions, useLooterState } from '../looter-game/LooterGameContext';
import { DEGREES_TO_PX, MAP_PLANE_SCALE } from '../constants';

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
    onSelfDragEnd,
    onSetArrivalAction,
}: AlinMapThreeSceneProps) {
    const tiltGroupRef = useRef<Group>(null);
    const moveGroupRef = useRef<Group>(null);
    // Track vị trí thuyền thực tế để render DashedPath chính xác
    const boatPosRef = useRef<[number, number, number]>([0, 0, 0]);
    // Track self-avatar drag state
    const selfDragRef = useRef<{
        active: boolean;
        startClientX: number;
        startClientY: number;
        moved: boolean;
    }>({ active: false, startClientX: 0, startClientY: 0, moved: false });
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
                MathUtils.degToRad(tilt + cameraRotateXDeg),
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
                    boatPosRef.current = [nx, 5.0, nz];
                    lastBoatPosRef.current = [nx, 0, nz];
                }
            }
        }
    });

    const origin: LatLng = position ? { lat: position[0], lng: position[1] } : { lat: 0, lng: 0 };
    const selfPos = worldToScene(origin, origin);
    const selfLift = pxToScene(dragOffset.x);
    const selfDepth = pxToScene(dragOffset.y);
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
        itemClickLockRef.current = true;
        const boat = getCurrentBoatLatLng();
        const dist = distanceMeters(boat, { lat: worldItem.lat, lng: worldItem.lng });
        const interactionRadius = 250;
        const isPortal = worldItem?.item?.type === 'portal';

        if (dist > interactionRadius) {
            // Lưu callback auto-interact để chạy khi thuyền đến nơi
            const spawnId = worldItem.spawnId;
            onSetArrivalAction?.(() => {
                if (isPortal) {
                    openFortressStorage?.('portal');
                } else if (worldItem.minigameType) {
                    const arrivedBoat = getCurrentBoatLatLng();
                    setShowMinigame?.({ ...worldItem, currentLat: arrivedBoat.lat, currentLng: arrivedBoat.lng });
                } else {
                    const arrivedBoat = getCurrentBoatLatLng();
                    pickupItem?.(spawnId, worldItem, arrivedBoat.lat, arrivedBoat.lng);
                }
            });
            onRequestMove?.(worldItem.lat, worldItem.lng, 'item');
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
        onSetArrivalAction,
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
            onSetArrivalAction?.(() => {
                openFortressStorage?.('fortress');
            });
            onRequestMove?.(target.lat, target.lng, 'fortress');
        }
    }, [
        distanceMeters,
        getCurrentBoatLatLng,
        isLooterGameMode,
        looterStateObj?.fortressLat,
        looterStateObj?.fortressLng,
        onRequestMove,
        onStopBoat,
        onSetArrivalAction,
        openFortressStorage,
    ]);

    // ─── Ground Click → Move (Raycaster) ───────────────────────────────────
    const handleGroundClick = useCallback((point: Vector3) => {
        if (!isLooterGameMode || !tiltGroupRef.current || !onRequestMove) return;
        if (itemClickLockRef.current) { itemClickLockRef.current = false; return; }
        const localPt = tiltGroupRef.current.worldToLocal(point.clone());
        const SCALE = DEGREES_TO_PX * MAP_PLANE_SCALE * MAP_COORD_SCENE_SCALE;
        const lng = origin.lng + localPt.x / SCALE;
        const lat = origin.lat - localPt.z / SCALE;
        onRequestMove(lat, lng, 'map');
    }, [isLooterGameMode, onRequestMove, origin.lat, origin.lng]);

    // ─── Self Avatar Drag Handlers ────────────────────────────────────────────
    const handleSelfPointerDown = useCallback((e: any) => {
        if (isLooterGameMode || !onSelfDragEnd) return;
        e.stopPropagation();
        (e as any).sourceEvent?.stopPropagation?.();
        (e as any).sourceEvent?.preventDefault?.();
        selfDragRef.current = {
            active: true,
            startClientX: (e as any).sourceEvent?.clientX ?? 0,
            startClientY: (e as any).sourceEvent?.clientY ?? 0,
            moved: false,
        };
        document.body.style.cursor = 'grabbing';
    }, [isLooterGameMode, onSelfDragEnd]);

    const handleSelfPointerMove = useCallback((e: any) => {
        const state = selfDragRef.current;
        if (!state.active || isLooterGameMode) return;
        e.stopPropagation();
        (e as any).sourceEvent?.stopPropagation?.();
        const clientX = (e as any).sourceEvent?.clientX ?? 0;
        const clientY = (e as any).sourceEvent?.clientY ?? 0;
        const currentScale = scale.get();
        const dx = (clientX - state.startClientX) / currentScale;
        const dy = (clientY - state.startClientY) / currentScale;
        if (Math.abs(dx) + Math.abs(dy) > 4) {
            state.moved = true;
        }
        if (state.moved) {
            selfDragX.set(dx);
            selfDragY.set(dy);
        }
    }, [isLooterGameMode, scale, selfDragX, selfDragY]);

    const handleSelfPointerUp = useCallback((e: any) => {
        const state = selfDragRef.current;
        if (!state.active) return;
        e.stopPropagation();
        (e as any).sourceEvent?.stopPropagation?.();
        state.active = false;
        document.body.style.cursor = state.moved ? 'auto' : 'pointer';
        if (state.moved && onSelfDragEnd) {
            const currentScale = scale.get();
            const currentPlaneYScale = planeYScale.get();
            const totalDx = selfDragX.get();
            const totalDy = selfDragY.get();
            const deltaLng = (totalDx / currentScale / MAP_PLANE_SCALE) / DEGREES_TO_PX;
            const deltaLat = (-totalDy / currentScale / currentPlaneYScale) / DEGREES_TO_PX;
            const newLat = (position?.[0] ?? 0) + deltaLat;
            const newLng = (position?.[1] ?? 0) + deltaLng;
            onSelfDragEnd(newLat, newLng);
        }
    }, [onSelfDragEnd, scale, planeYScale, selfDragX, selfDragY, position]);

    // Waypoint: 3 item gần nhất, bypass culling — rendered separately with larger scale
    const waypointItems = React.useMemo(() => {
        if (!isLooterGameMode || !safeWorldItems.length) return [];
        const curLat = looterStateObj?.currentLat ?? origin.lat;
        const curLng = looterStateObj?.currentLng ?? origin.lng;
        return safeWorldItems
            .filter((i: any) => i.item?.type !== 'portal')
            .map((i: any) => ({
                item: i,
                dist: (i.lat - curLat) ** 2 + (i.lng - curLng) ** 2,
            }))
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 3)
            .map(e => e.item);
    }, [isLooterGameMode, safeWorldItems, looterStateObj?.currentLat, looterStateObj?.currentLng, origin.lat, origin.lng]);

    const waypointSpawnIds = React.useMemo(() =>
        new Set(waypointItems.map((i: any) => i.spawnId))
    , [waypointItems]);

    const renderedWorldItems = useMemo(() => {
        if (!isLooterGameMode || encounter || !safeWorldItems.length) return [];
        const centerLat = looterStateObj?.currentLat ?? origin.lat;
        const centerLng = looterStateObj?.currentLng ?? origin.lng;
        const cullDeg = (isDesktop ? 5000 : 3200) / 111000;
        const maxItems = isDesktop ? 42 : 24;

        return safeWorldItems
            .filter((item: any) => Math.abs(item.lat - centerLat) <= cullDeg && Math.abs(item.lng - centerLng) <= cullDeg)
            .filter((item: any) => !waypointSpawnIds.has(item.spawnId))
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
        waypointSpawnIds,
    ]);

    // Precompute scene positions — avoids calling worldToScene inside .map() (eliminates ~132 object allocations/render)
    const userRenderData = useMemo(() =>
        filteredUsers.map((u) => ({
            user: u,
            pos: worldToScene(origin, u),
        }))
    , [filteredUsers, origin.lat, origin.lng]);

    const itemRenderData = useMemo(() =>
        renderedWorldItems.map((item: any) => ({
            item,
            pos: worldToScene(origin, { lat: item.lat, lng: item.lng }),
        }))
    , [renderedWorldItems, origin.lat, origin.lng]);

    const waypointRenderData = useMemo(() =>
        waypointItems.map((item: any) => ({
            item,
            pos: worldToScene(origin, { lat: item.lat, lng: item.lng }),
        }))
    , [waypointItems, origin.lat, origin.lng]);

    if (!position) return null;

    return (
        <group ref={tiltGroupRef}>
            <group ref={moveGroupRef}>
                {/* 1. Nền bản đồ (Ground) */}
                <Ground mapMode={mapMode} groundRef={groundMeshRef} onGroundClick={handleGroundClick} />

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

                {/* Fortress */}
                {isLooterGameMode && !encounter && looterStateObj?.fortressLat && looterStateObj?.fortressLng ? (
                    <ProceduralFortress position={[fortressScene!.x, 0, fortressScene!.z]} onClick={handleFortressClick} />
                ) : null}

                {/* Waypoint: 3 item gần nhất — luôn hiển thị, to hơn và cao hơn item thường */}
                {waypointRenderData.map(({ item, pos }) => (
                    <LootSprite
                        key={`wp-${item.spawnId}`}
                        position={[pos.x, 0.3, pos.z]}
                        type={getWorldItemType(item)}
                        icon={getWorldItemIcon(item)}
                        title={item?.item?.name || 'Loot'}
                        accent={getWorldItemAccent(item)}
                        scale={1.2}
                        size={AVATAR_PLANE_SIZE}
                        renderOrder={50}
                        onClick={() => handleWorldItemClick(item)}
                    />
                ))}

                {/* Đường nét đứt từ thuyền → target (chỉ khi có target và không combat) */}
                {isLooterGameMode && !encounter && boatTargetPin && boatTargetScene ? (
                    <DashedPath
                        from={boatPosRef.current}
                        to={[boatTargetScene.x, 0.3, boatTargetScene.z]}
                        color="#22d3ee"
                    />
                ) : null}

                {/* Boat target pin (chỉ còn circle, DashedPath đã vẽ target) */}
                {isLooterGameMode && !encounter && boatTargetPin ? (
                    <LootSprite
                        position={[boatTargetScene!.x, 0.3, boatTargetScene!.z]}
                        type="target"
                        size={AVATAR_PLANE_SIZE * 0.2}
                        scale={1}
                    />
                ) : null}

                {/* Enemy */}
                {isLooterGameMode && encounter ? (
                    <LootSprite
                        position={[
                            boatPosRef.current[0] + pxToScene(90),
                            0.3,
                            boatPosRef.current[2] + pxToScene(-110)
                        ]}
                        type="enemy"
                        scale={1.2}
                    />
                ) : null}

                {/* World loot items */}
                {itemRenderData.map(({ item, pos }) => (
                    <LootSprite
                        key={item.spawnId}
                        position={[pos.x, 0.15, pos.z]}
                        type={getWorldItemType(item)}
                        icon={getWorldItemIcon(item)}
                        title={item?.item?.name || 'Loot'}
                        accent={getWorldItemAccent(item)}
                        scale={1}
                        size={AVATAR_PLANE_SIZE * 0.9}
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
