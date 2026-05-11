import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Fog, Color, Group, MathUtils, Mesh } from 'three';
import { useMotionValueEvent } from 'framer-motion';
import { sanitizeWorldItems, useLooterActions, useLooterState } from '../../looter-game/LooterGameContext';
import { MAP_PLANE_SCALE } from '../../constants';

// Sub-components
import CameraRig from '../CameraRig';
import Ground from '../Ground';
import AvatarBillboard from '../AvatarBillboard';
import MarkerBillboard from '../MarkerBillboard';
import ProceduralBoat from '../models/ProceduralBoat';
import ProceduralFortress from '../models/ProceduralFortress';
import LootSprite from '../models/LootSprite';
import DashedPath from '../models/DashedPath';

// Hooks
import { useLooterInteraction } from './looterInteraction';
import { useDragHandlers } from './useDragHandlers';

// Utils
import { worldToScene, pxToScene, MAP_COORD_SCENE_SCALE, AVATAR_PLANE_SIZE, type LatLng } from '../sceneUtils';

// Types
import type { AlinMapThreeSceneProps } from './types';

/**
 * SceneContent: toàn bộ logic render bên trong Canvas.
 * Tách ra khỏi AlinMapThreeScene.tsx để file entry point chỉ chứa Canvas setup.
 */
export default function SceneContent({
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
  setIsTierSelectorOpen,
}: AlinMapThreeSceneProps) {
  const tiltGroupRef = useRef<Group>(null);
  const moveGroupRef = useRef<Group>(null);
  const boatPosRef = useRef<[number, number, number]>([0, 0, 0]);
  const itemClickLockRef = useRef(false);
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

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  useMotionValueEvent(selfDragX, 'change', (v) => setDragOffset(prev => ({ ...prev, x: v })));
  useMotionValueEvent(selfDragY, 'change', (v) => setDragOffset(prev => ({ ...prev, y: v })));

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
    setIsTierSelectorOpen,
  });

  useEffect(() => {
    scene.fog = isLooterGameMode ? null : new Fog('#08111b', 1800, 22000);
    scene.background = new Color(mapMode === 'satellite' ? '#020b12' : '#071018');
  }, [mapMode, scene, isLooterGameMode]);

  // ── Filtered & sorted nearby users ───────────────────────────────────────
  const filteredUsers = useMemo(() => {
    const baseLat = position?.[0] ?? 0;
    const baseLng = position?.[1] ?? 0;
    const visible = nearbyUsers.filter((u) => {
      if (u.id === myUserId || u.id === user?.uid) return false;
      if (searchTag) {
        const term = String(searchTag || '').toLowerCase();
        const matchesName = String(u.displayName || u.username || '').toLowerCase().includes(term);
        const tagsStr = (Array.isArray(u.tags) ? u.tags.join(' ') : String(u.tags || '')).toLowerCase();
        const statusStr = String(u.status || '').toLowerCase();
        if (!matchesName && !tagsStr.includes(term) && !statusStr.includes(term)) return false;
      }
      if (u.lat == null || u.lng == null || Number.isNaN(u.lat) || Number.isNaN(u.lng)) return false;
      const distKm = Math.sqrt(((u.lat - baseLat) ** 2) + ((u.lng - baseLng) ** 2)) * 111;
      if (distKm > filterDistance) return false;
      const age = u.birthdate ? (new Date().getFullYear() - new Date(u.birthdate).getFullYear()) : 20;
      if (age < filterAgeMin || age > filterAgeMax) return false;
      u.distKm = distKm;
      return true;
    });
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
          // ⚠️ ĐỒNG BỘ Y=5.0: khớp với ProceduralBoat.tsx (bobbing Y offset +5)
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

  const userRenderData = useMemo(() => {
    const raw = filteredUsers.map((u) => ({ user: u, pos: worldToScene(origin, u) }));
    // Nhóm user theo vị trí (làm tròn 1 chữ số thập phân ~ 0.1 scene unit)
    const groups = new Map<string, typeof raw>();
    raw.forEach((item) => {
      const key = `${item.pos.x.toFixed(1)},${item.pos.z.toFixed(1)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    });
    // Offset user trùng vị trí theo vòng tròn lục giác
    const SPACING = AVATAR_PLANE_SIZE * 0.6;
    const result: typeof raw = [];
    groups.forEach((group) => {
      group.forEach((item, i) => {
        if (i === 0) { result.push(item); return; }
        const ring = Math.ceil(i / 6);
        const angle = ((i - 1) % 6) * (Math.PI / 3);
        const radius = ring * SPACING;
        result.push({
          user: item.user,
          pos: {
            x: item.pos.x + Math.cos(angle) * radius,
            z: item.pos.z + Math.sin(angle) * radius,
          },
        });
      });
    });
    return result;
  }, [filteredUsers, origin.lat, origin.lng]);

  if (!position) return null;

  return (
    <group ref={tiltGroupRef}>
      <group ref={moveGroupRef}>
        {/* 1. Ground */}
        <Ground mapMode={mapMode} groundRef={groundMeshRef}
          onGroundClick={(point) => handleGroundClick(groundMeshRef, point)} />

        {/* Search Target Pin */}
        <group position={[0, 0.08, 0]}>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
            <circleGeometry args={[1200, 64]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.05} />
          </mesh>
        </group>

        {/* Self avatar / Boat */}
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

        {/* Nearby users */}
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

        {/* ─── Looter Game Elements ──────────────────────────────────────────── */}
        {/* Fortress */}
        {isLooterGameMode && !encounter && looterStateObj?.fortressLat && looterStateObj?.fortressLng ? (
          <ProceduralFortress position={[fortressScene!.x, 0, fortressScene!.z]} scale={13.5} onClick={handleFortressClick} />
        ) : null}

        {/* Waypoint items (3 gần nhất) */}
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

        {/* Dashed path từ thuyền → target */}
        {isLooterGameMode && !encounter && boatTargetPin && boatTargetScene ? (
          <DashedPath
            from={boatPosRef.current}
            to={[boatTargetScene.x, 5.0, boatTargetScene.z]}
            color="#22d3ee"
          />
        ) : null}

        {/* Boat target pin */}
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
