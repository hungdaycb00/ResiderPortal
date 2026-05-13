import React, { useMemo } from 'react';
import type { MotionValue } from 'framer-motion';
import AvatarBillboard from '../AvatarBillboard';
import ProceduralBoat from '../models/ProceduralBoat';
import { useDragHandlers } from './useDragHandlers';
import { worldToScene, pxToScene, AVATAR_PLANE_SIZE, type LatLng } from '../sceneUtils';
import type { AdaptivePerformanceProfile } from '../../hooks/useAdaptivePerformance';
import type { AlinMapMode } from '../../constants';

interface UserLayersProps {
  // Position / origin
  origin: LatLng;
  baseOrigin: LatLng;
  sceneWorldScale: number;

  // User data
  myUserId: string | null;
  user: any;
  myDisplayName: string;
  myAvatarUrl: string;
  myStatus: string;
  isVisibleOnMap: boolean;
  nearbyUsers: any[];
  selectedUser?: any;
  filterDistance: number;
  filterAgeMin: number;
  filterAgeMax: number;
  searchTag: string;

  // Gallery
  galleryActive: boolean;
  galleryTitle: string;
  galleryImages: string[];

  // Mode
  mapMode: AlinMapMode;
  isLooterGameMode: boolean;
  showLooterBoat?: boolean;
  isRoadmapOverlay: boolean;

  // Drag
  scale: MotionValue<number>;
  planeYScale: MotionValue<number>;
  selfDragX: MotionValue<number>;
  selfDragY: MotionValue<number>;
  dragOffset: { x: number; y: number };
  position: [number, number] | null;
  onSelfDragEnd?: (lat: number, lng: number) => void;

  // Boat (Looter)
  boatOffsetX?: MotionValue<number>;
  boatOffsetY?: MotionValue<number>;
  looterStateObj: any;

  // Callbacks
  onSelectUser?: (user: any) => void;
  onSelectSelf?: (user: any) => void;

  // Performance
  performance?: AdaptivePerformanceProfile;
}

export default function UserLayers({
  origin,
  baseOrigin,
  sceneWorldScale,
  myUserId,
  user,
  myDisplayName,
  myAvatarUrl,
  myStatus,
  isVisibleOnMap,
  nearbyUsers,
  selectedUser,
  filterDistance,
  filterAgeMin,
  filterAgeMax,
  searchTag,
  galleryActive,
  galleryTitle,
  galleryImages,
  mapMode,
  isLooterGameMode,
  showLooterBoat = true,
  isRoadmapOverlay,
  scale,
  planeYScale,
  selfDragX,
  selfDragY,
  dragOffset,
  position,
  onSelfDragEnd,
  boatOffsetX,
  boatOffsetY,
  looterStateObj,
  onSelectUser,
  onSelectSelf,
  performance,
}: UserLayersProps) {
  const performanceMode = performance?.mode ?? 'high';
  const labelMode = performance?.labelMode ?? 'full';
  const maxVisibleUsers = performance?.maxNearbyUsers ?? (isLooterGameMode ? 40 : 90);
  const avatarPresentation = mapMode === 'roadmap' ? 'roadmap' : 'default';

  const scaleScenePoint = (point: { x: number; z: number }) => ({
    x: point.x * sceneWorldScale,
    z: point.z * sceneWorldScale,
  });
  const pxToScaledScene = (px: number) => pxToScene(px) * sceneWorldScale;

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
    return visible.slice(0, maxVisibleUsers);
  }, [nearbyUsers, myUserId, user?.uid, searchTag, filterDistance, filterAgeMin, filterAgeMax, position, maxVisibleUsers]);

  const userRenderData = useMemo(() => {
    const raw = filteredUsers.map((u) => ({ user: u, pos: scaleScenePoint(worldToScene(origin, u)) }));
    const groups = new Map<string, typeof raw>();
    raw.forEach((item) => {
      const key = `${item.pos.x.toFixed(1)},${item.pos.z.toFixed(1)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    });
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
  }, [filteredUsers, origin.lat, origin.lng, sceneWorldScale]);

  const { selfDragRef, handleSelfPointerDown, handleSelfPointerMove, handleSelfPointerUp } = useDragHandlers({
    isLooterGameMode,
    position,
    scale,
    planeYScale,
    selfDragX,
    selfDragY,
    onSelfDragEnd,
  });

  const selfPos = scaleScenePoint(worldToScene(origin, baseOrigin));
  const selfLift = pxToScaledScene(dragOffset.x);
  const selfDepth = pxToScaledScene(dragOffset.y);

  return (
    <>
      {/* Self avatar / Boat */}
      {isLooterGameMode && showLooterBoat ? (
        <ProceduralBoat
          position={[selfPos.x, 0, selfPos.z]}
          offsetX={boatOffsetX}
          offsetY={boatOffsetY}
          currentLat={looterStateObj?.currentLat}
          currentLng={looterStateObj?.currentLng}
          fortressLat={looterStateObj?.fortressLat}
          fortressLng={looterStateObj?.fortressLng}
          reducedMotion={performanceMode === 'low'}
          sceneWorldScale={sceneWorldScale}
        />
      ) : !isLooterGameMode && !isRoadmapOverlay && (() => {
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
              labelMode={labelMode}
              presentation={avatarPresentation}
              onClick={() => {
                if (!selfDragRef.current.moved) {
                  onSelectSelf?.({
                    id: user?.uid || myUserId || 'self',
                    username: myDisplayName,
                    lat: baseOrigin.lat,
                    lng: baseOrigin.lng,
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

      {/* Nearby users */}
      {!isRoadmapOverlay && userRenderData.map(({ user: u, pos }) => (
        <AvatarBillboard
          key={u.id}
          name={u.displayName || u.username || 'U'}
          avatarUrl={isLooterGameMode ? null : u.avatar_url}
          position={[pos.x, 0.22, pos.z]}
          status={isLooterGameMode ? undefined : u.status}
          isVisibleOnMap
          isSelected={!isLooterGameMode && selectedUser?.id === u.id}
          labelMode={labelMode}
          presentation={avatarPresentation}
          onClick={isLooterGameMode ? undefined : () => onSelectUser?.(u)}
          showGallery={!isLooterGameMode && u.gallery?.active}
          galleryTitle={u.gallery?.title}
          galleryImages={u.gallery?.images}
          dimmed={isLooterGameMode}
        />
      ))}
    </>
  );
}
