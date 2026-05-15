import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Group, Mesh } from 'three';
import { useMotionValueEvent } from 'framer-motion';
import { sanitizeWorldItems, useLooterActions, useLooterState } from '../../looter-game/LooterGameContext';
import { getRoadmapCenterFromPan, MAP_PLANE_SCALE, ROADMAP_WORLD_SCALE } from '../../constants';

// Sub-components
import Ground from '../Ground';
import CameraRig from '../CameraRig';

// Layers
import UserLayers from './UserLayers';
import LooterLayers from './LooterLayers';
import SceneMarkers from './SceneMarkers';
import WebGLMapTiles from './WebGLMapTiles';

// Hooks
import { useLooterInteraction } from './looterInteraction';

// Utils
import { worldToScene, pxToScene, MAP_COORD_SCENE_SCALE, type LatLng } from '../sceneUtils';

// Types
import type { AlinMapThreeSceneProps } from './types';

/**
 * SceneContent: điều phối render bên trong Canvas.
 * Fog/Background đã bị loại bỏ theo yêu cầu.
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
  useDomLooterLayer,
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
  cameraFov,
  performance,
}: AlinMapThreeSceneProps) {
  const tiltGroupRef = useRef<Group>(null);
  const moveGroupRef = useRef<Group>(null);
  const boatPosRef = useRef<[number, number, number]>([0, 0, 0]);
  const itemClickLockRef = useRef(false);
  const lastLiftXRef = useRef(0);
  const lastLiftZRef = useRef(0);
  const lastBoatPosRef = useRef<[number, number, number]>([0, 0, 0]);
  const frameSkipRef = useRef(0);
  const groundMeshRef = useRef<Mesh>(null);

  const looterState = useLooterState();
  const looterActions = useLooterActions();
  const safeWorldItems = useMemo(
    () => (isLooterGameMode ? sanitizeWorldItems(looterState.worldItems) : []),
    [looterState.worldItems, isLooterGameMode]
  );
  const { state: looterStateObj, encounter } = looterState;
  const { openFortressStorage, setShowMinigame, pickupItem } = looterActions;

  const usesRoadmapProjection = mapMode === 'roadmap';
  const isRoadmapOverlay = usesRoadmapProjection && !isLooterGameMode;
  const renderLooterInScene = !!isLooterGameMode && !useDomLooterLayer;

  // SPRINT 2: Subscribe pan MotionValues — trigger render khi user kéo bản đồ
  const { invalidate } = useThree();
  useEffect(() => {
    const unsubX = panX.on('change', invalidate);
    const unsubY = panY.on('change', invalidate);
    const unsubScale = scale.on('change', invalidate);
    return () => { unsubX(); unsubY(); unsubScale(); };
  }, [panX, panY, scale, invalidate]);
  const sceneWorldScale = isRoadmapOverlay ? ROADMAP_WORLD_SCALE : 1;
  const scaleScenePoint = (point: { x: number; z: number }) => ({
    x: point.x * sceneWorldScale,
    z: point.z * sceneWorldScale,
  });
  const pxToScaledScene = (px: number) => pxToScene(px) * sceneWorldScale;

  // ── Drag offset state ──────────────────────────────────────────────────────
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  useMotionValueEvent(selfDragX, 'change', (v) => setDragOffset(prev => ({ ...prev, x: v })));
  useMotionValueEvent(selfDragY, 'change', (v) => setDragOffset(prev => ({ ...prev, y: v })));

  // ── Origin calculation ─────────────────────────────────────────────────────
  // Đã loại bỏ roadmapView state để tối ưu CPU. Sử dụng baseOrigin cố định, 
  // việc dịch chuyển sẽ được xử lý bằng Matrix Translation ở WebGL loop (moveGroupRef).
  const baseOrigin: LatLng = position ? { lat: position[0], lng: position[1] } : { lat: 0, lng: 0 };
  const origin: LatLng = baseOrigin;

  // ── Looter interaction ─────────────────────────────────────────────────────
  const {
    getWorldItemIcon, getWorldItemType, getWorldItemAccent,
    handleWorldItemClick, handleFortressClick, handleGroundClick,
    waypointRenderData, itemRenderData,
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
    sceneWorldScale,
  });

  // ── Per-frame pan/boat sync ────────────────────────────────────────────────
  // LƯU Ý KIẾN TRÚC: Trong hệ thống Camera 3D mới, chúng ta KHÔNG xoay tiltGroupRef
  // vì góc nhìn được tạo ra bởi Camera Orbit (CameraRig).
  // tiltGroupRef chỉ còn là container trung gian, không có rotation.
  useFrame(() => {
    if (!moveGroupRef.current) return;
    const liftX = panX.get();
    const liftZ = panY.get();

    // GPU Matrix Translation: Dịch chuyển thế giới 3D đồng bộ với thao tác pan bản đồ DOM
    if (Math.abs(liftX - lastLiftXRef.current) > 0.001 || Math.abs(liftZ - lastLiftZRef.current) > 0.001) {
      moveGroupRef.current.position.set(
        liftX * MAP_COORD_SCENE_SCALE * sceneWorldScale,
        0,
        liftZ * MAP_COORD_SCENE_SCALE * sceneWorldScale
      );
      lastLiftXRef.current = liftX;
      lastLiftZRef.current = liftZ;
    }

    if (position && isLooterGameMode) {
      frameSkipRef.current = (frameSkipRef.current + 1) % 3;
      if (frameSkipRef.current === 0) {
        const sp = scaleScenePoint(worldToScene(origin, baseOrigin));
        const visualBoatX = (boatOffsetX?.get?.() ?? 0) * MAP_PLANE_SCALE;
        const visualBoatY = (boatOffsetY?.get?.() ?? 0) * MAP_PLANE_SCALE;
        const nx = sp.x + pxToScaledScene(visualBoatX);
        const nz = sp.z + pxToScaledScene(visualBoatY);
        const [lx, , lz] = lastBoatPosRef.current;
        if (Math.abs(nx - lx) > 0.01 || Math.abs(nz - lz) > 0.01) {
          boatPosRef.current = [nx, 5.0, nz];
          lastBoatPosRef.current = [nx, 0, nz];
        }
      }
    }
  });

  // ── Derived scene positions ────────────────────────────────────────────────
  const selfPos = scaleScenePoint(worldToScene(origin, baseOrigin));
  const searchMarkerScene = searchMarkerPos ? scaleScenePoint(worldToScene(origin, searchMarkerPos)) : null;
  const fortressScene = looterStateObj?.fortressLat && looterStateObj?.fortressLng
    ? scaleScenePoint(worldToScene(origin, { lat: looterStateObj.fortressLat, lng: looterStateObj.fortressLng }))
    : null;
  const boatTargetScene = boatTargetPin ? scaleScenePoint(worldToScene(origin, boatTargetPin)) : null;

  if (!position) return null;

  // Kích thước của Texture MapLibre canvas
  const CANVAS_SIZE = 2048;
  const MAP_PLANE_SIZE = CANVAS_SIZE * MAP_PLANE_SCALE * sceneWorldScale;

  return (
    <group ref={tiltGroupRef}>
      {/* Fog chân trời — màu thay đổi theo mode */}
      {isRoadmapOverlay ? (
        // Roadmap: fog trắng nhạt (đúng màu nền Positron/CartoDB)
        <fogExp2 attach="fog" color="#e8e8e4" density={0.000006} />
      ) : (
        // Satellite / Looter: fog đẮm tối
        <fogExp2 attach="fog" color="#071a2e" density={0.000018} />
      )}
      
      {/* Background fill plane — chỉ hiển thị trong roadmap mode
          Phủ khắp mặt đất bằng màu nền map để lấp đầy khoảng trống */}
      {isRoadmapOverlay && (
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.4, 0]}>
          <planeGeometry args={[6000, 6000]} />
          <meshBasicMaterial color="#e8e8e4" depthWrite={false} />
        </mesh>
      )}

      {/* Lớp bản đồ nền (WebGL) không bị gắn vào moveGroupRef 
          vì MapLibre đã tự handle việc trượt tọa độ theo panX, panY */}
      <WebGLMapTiles 
        panX={panX} 
        panY={panY} 
        scale={scale} 
        planeYScale={planeYScale} 
        myObfPos={origin} 
        mode={mapMode}
        isDesktop={isDesktop}
        performanceMode={performance?.mode ?? 'high'}
      />

      <group ref={moveGroupRef}>
        {/* Ground */}
        <Ground
          mapMode={mapMode}
          roadmapWorldScale={sceneWorldScale}
          groundRef={groundMeshRef}
          onGroundClick={(point, ray) => handleGroundClick(groundMeshRef, point, ray)}
        />

        {/* Search area ring */}
        {!isRoadmapOverlay && (
          <group position={[0, 0.08, 0]}>
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
              <circleGeometry args={[160 * sceneWorldScale, 64]} />
              <meshBasicMaterial color="#22d3ee" transparent opacity={0.025} depthWrite={false} />
            </mesh>
          </group>
        )}

        {/* User layers (Self + Nearby avatars / Boat) */}
        <UserLayers
          origin={origin}
          baseOrigin={baseOrigin}
          sceneWorldScale={sceneWorldScale}
          myUserId={myUserId}
          user={user}
          myDisplayName={myDisplayName}
          myAvatarUrl={myAvatarUrl}
          myStatus={myStatus}
          isVisibleOnMap={isVisibleOnMap}
          nearbyUsers={nearbyUsers}
          selectedUser={selectedUser}
          filterDistance={filterDistance}
          filterAgeMin={filterAgeMin}
          filterAgeMax={filterAgeMax}
          searchTag={searchTag}
          galleryActive={galleryActive}
          galleryTitle={galleryTitle}
          galleryImages={galleryImages}
          mapMode={mapMode}
          isLooterGameMode={!!isLooterGameMode}
          showLooterBoat={renderLooterInScene}
          isRoadmapOverlay={isRoadmapOverlay}
          panX={panX}
          panY={panY}
          scale={scale}
          planeYScale={planeYScale}
          selfDragX={selfDragX}
          selfDragY={selfDragY}
          dragOffset={dragOffset}
          position={position}
          onSelfDragEnd={onSelfDragEnd}
          boatOffsetX={boatOffsetX}
          boatOffsetY={boatOffsetY}
          looterStateObj={looterStateObj}
          onSelectUser={onSelectUser}
          onSelectSelf={onSelectSelf}
          performance={performance}
        />

        {/* Scene markers (Province, Search, Mode label) */}
        <SceneMarkers
          isRoadmapOverlay={isRoadmapOverlay}
          currentProvince={currentProvince}
          selfSceneX={selfPos.x}
          selfSceneZ={selfPos.z}
          pxToScaledScene={pxToScaledScene}
          searchMarkerPos={searchMarkerPos}
          searchMarkerScene={searchMarkerScene}
        />

        {/* Looter game layers */}
        <LooterLayers
          isLooterGameMode={renderLooterInScene}
          encounter={encounter}
          sceneWorldScale={sceneWorldScale}
          boatPosRef={boatPosRef}
          looterStateObj={looterStateObj}
          fortressScene={fortressScene}
          handleFortressClick={handleFortressClick}
          boatTargetPin={boatTargetPin}
          boatTargetScene={boatTargetScene}
          waypointRenderData={waypointRenderData}
          itemRenderData={itemRenderData}
          getWorldItemType={getWorldItemType}
          getWorldItemIcon={getWorldItemIcon}
          getWorldItemAccent={getWorldItemAccent}
          handleWorldItemClick={handleWorldItemClick}
        />
      </group>

      <CameraRig
        scale={scale}
        tiltAngle={tiltAngle}
        cameraYawDeg={cameraRotateYDeg}
        cameraHeightOffset={cameraHeightOffset}
        perspectivePx={perspectivePx}
        cameraFov={cameraFov}
        minDistance={isLooterGameMode ? 95 : 140}
      />
    </group>
  );
}
