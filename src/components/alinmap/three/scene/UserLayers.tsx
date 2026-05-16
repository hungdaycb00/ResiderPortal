import React, { useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import type { MotionValue } from 'framer-motion';
import AvatarBillboard from '../AvatarBillboard';
import HomeMarker from '../HomeMarker';
import User3DModel from '../models/User3DModel';
import ProceduralBoat from '../models/ProceduralBoat';
import { useDragHandlers } from './useDragHandlers';
import { worldToScene, pxToScene, AVATAR_PLANE_SIZE, MAP_COORD_SCENE_SCALE, type LatLng } from '../sceneUtils';
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

  // Pan offset (counteract moveGroup translation so avatars stay on GPS position)
  panX: MotionValue<number>;
  panY: MotionValue<number>;

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
  onOpenBillboardPost?: (user: any) => void;

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
  panX,
  panY,
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
  onOpenBillboardPost,
  performance,
}: UserLayersProps) {
  // Sync pan offset - ĐÃ LOẠI BỎ vì UserLayers đã nằm trong moveGroupRef của SceneContent
  // Việc bù trừ thêm panX/panY ở đây sẽ làm avatar bị "trượt" khỏi vị trí trên map.
  const performanceMode = performance?.mode ?? 'high';
  const labelMode = performance?.labelMode ?? 'full';
  const maxVisibleUsers = performance?.maxNearbyUsers ?? (isLooterGameMode ? 40 : 90);
  const avatarPresentation: 'roadmap' | 'default' = mapMode === 'roadmap' ? 'roadmap' : 'default';

  const USE_3D_AVATARS = true;
  const shouldUseRoadmapBillboards = isRoadmapOverlay;
  const shouldClusterUsers = !isRoadmapOverlay;

  const scaleScenePoint = (point: { x: number; z: number }) => ({
    x: point.x * sceneWorldScale,
    z: point.z * sceneWorldScale,
  });
  const pxToScaledScene = (px: number) => pxToScene(px) * sceneWorldScale;

  const filteredUsers = useMemo(() => {
    const baseLat = baseOrigin.lat;
    const baseLng = baseOrigin.lng;
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
  }, [nearbyUsers, myUserId, user?.uid, searchTag, filterDistance, filterAgeMin, filterAgeMax, baseOrigin.lat, baseOrigin.lng, maxVisibleUsers]);

  const userRenderData = useMemo(() => {
    const raw = filteredUsers.map((u) => ({ user: u, pos: scaleScenePoint(worldToScene(origin, u)) }));
    if (!shouldClusterUsers) return raw;

    // Adaptive spatial clustering: grid cell size based on actual avatar visual footprint
    const scaledSpacing = AVATAR_PLANE_SIZE * sceneWorldScale * 0.6;
    const cellSize = Math.max(scaledSpacing * 1.5, 0.001); // prevent division by zero

    const groups = new Map<string, typeof raw>();
    raw.forEach((item) => {
      const gridX = Math.round(item.pos.x / cellSize);
      const gridZ = Math.round(item.pos.z / cellSize);
      const key = `${gridX},${gridZ}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    });

    const result: typeof raw = [];
    groups.forEach((group) => {
      group.forEach((item, i) => {
        if (i === 0) { result.push(item); return; }
        const ring = Math.ceil(i / 6);
        const angle = ((i - 1) % 6) * (Math.PI / 3);
        const radius = ring * scaledSpacing;
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
  }, [filteredUsers, origin.lat, origin.lng, sceneWorldScale, shouldClusterUsers]);

  const { selfDragRef, handleSelfPointerDown, handleSelfPointerMove, handleSelfPointerUp } = useDragHandlers({
    isLooterGameMode,
    basePosition: baseOrigin,
    scale,
    selfDragX,
    selfDragY,
    onSelfDragEnd,
  });

  const selfPos = scaleScenePoint(worldToScene(origin, baseOrigin));
  const realSelfPos = position ? scaleScenePoint(worldToScene(origin, { lat: position[0], lng: position[1] })) : selfPos;
  const selfLift = pxToScaledScene(dragOffset.x);
  const selfDepth = pxToScaledScene(dragOffset.y);

  return (
    <group>
      {/* Self avatar / Boat */}
      {isLooterGameMode && showLooterBoat ? (
        <ProceduralBoat
          position={[selfPos.x, 0, selfPos.z]}
          offsetX={boatOffsetX}
          offsetY={boatOffsetY}
          reducedMotion={performanceMode === 'low'}
          sceneWorldScale={sceneWorldScale}
        />
      ) : !isLooterGameMode && (() => {
        const isSelfSelected = selectedUser?.id === 'self' || selectedUser?.id === user?.uid || selectedUser?.id === myUserId;
        const selfAvatarUrl = myAvatarUrl || user?.photoURL || null;
        const selfTags = Array.isArray(user?.tags) ? user.tags : null;
        
        const avatarProps = {
            name: myDisplayName || user?.displayName || 'Me',
            position: [selfPos.x + selfLift, 0.01, selfPos.z + selfDepth] as [number, number, number],
            status: myStatus,
            tags: selfTags,
            isVisibleOnMap,
            isSelected: isSelfSelected,
            labelMode,
            presentation: avatarPresentation,
            onClick: () => {
              if (!selfDragRef.current.moved) {
                onSelectSelf?.({
                  id: user?.uid || myUserId || 'self',
                  username: myDisplayName,
                  lat: baseOrigin.lat,
                  lng: baseOrigin.lng,
                  isSelf: true,
                });
              }
            },
            onGalleryClick: onOpenBillboardPost ? () => {
              const selfBillboardUser = {
                id: user?.uid || myUserId || 'self',
                displayName: myDisplayName || user?.displayName || 'Me',
                username: myDisplayName || user?.username || 'Me',
                avatar_url: selfAvatarUrl,
                photoURL: selfAvatarUrl,
                gallery: {
                  active: galleryActive,
                  title: galleryTitle,
                  images: galleryImages,
                },
                status: myStatus,
                lat: baseOrigin.lat,
                lng: baseOrigin.lng,
                isSelf: true,
              };
              console.warn('[AlinMap][Billboard] self callback from UserLayers', {
                userId: selfBillboardUser.id,
                galleryActive,
                galleryTitle,
                imageCount: galleryImages.length,
              });
              onOpenBillboardPost(selfBillboardUser);
            } : undefined,
            showGallery: galleryActive && (isSelfSelected || (isVisibleOnMap && !isLooterGameMode)),
            galleryTitle,
            galleryImages,
        };

        return (
          <>
            <HomeMarker position={[realSelfPos.x, 0.04, realSelfPos.z]} />
            {isVisibleOnMap ? (
              <group
                onPointerDown={handleSelfPointerDown}
                onPointerMove={handleSelfPointerMove}
                onPointerUp={handleSelfPointerUp}
              >
                {shouldUseRoadmapBillboards ? (
                  <AvatarBillboard {...avatarProps} avatarUrl={selfAvatarUrl} zoomScale={scale} />
                ) : USE_3D_AVATARS ? (
                  <User3DModel {...avatarProps} color="#3b82f6" /> // Blue for self
                ) : (
                  <AvatarBillboard {...avatarProps} avatarUrl={selfAvatarUrl} zoomScale={scale} />
                )}
              </group>
            ) : null}
          </>
        );
      })()}

      {/* Nearby users */}
      {userRenderData.map(({ user: u, pos }) => {
        const avatarUrl = isLooterGameMode ? null : (u.avatar_url || u.photoURL || u.avatarUrl || null);
        const avatarTags = Array.isArray(u.tags) ? u.tags : null;
        const avatarProps = {
          name: u.displayName || u.username || 'U',
          position: [pos.x, 0.01, pos.z] as [number, number, number],
          status: isLooterGameMode ? undefined : u.status,
          tags: avatarTags,
          isVisibleOnMap: true,
          isSelected: !isLooterGameMode && selectedUser?.id === u.id,
          labelMode,
          presentation: avatarPresentation,
          onPointerDown: isLooterGameMode ? undefined : (e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            e.nativeEvent.stopPropagation();
          },
          onPointerUp: isLooterGameMode ? undefined : (e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            e.nativeEvent.stopPropagation();
            onSelectUser?.(u);
          },
          onClick: isLooterGameMode ? undefined : () => onSelectUser?.(u),
          onGalleryClick: onOpenBillboardPost ? () => {
            console.warn('[AlinMap][Billboard] nearby callback from UserLayers', {
              userId: u.id || u.uid || u.user_id || null,
              name: u.displayName || u.username || null,
              galleryActive: !!u.gallery?.active,
              galleryTitle: u.gallery?.title || '',
              imageCount: Array.isArray(u.gallery?.images) ? u.gallery.images.length : 0,
            });
            onOpenBillboardPost(u);
          } : undefined,
          showGallery: !isLooterGameMode && u.gallery?.active,
          galleryTitle: u.gallery?.title,
          galleryImages: u.gallery?.images,
          dimmed: isLooterGameMode,
        };

        return shouldUseRoadmapBillboards ? (
          <AvatarBillboard
            key={u.id}
            {...avatarProps}
            avatarUrl={avatarUrl}
            zoomScale={scale}
          />
        ) : USE_3D_AVATARS ? (
          <User3DModel key={u.id} {...avatarProps} />
        ) : (
          <AvatarBillboard
            key={u.id}
            {...avatarProps}
            avatarUrl={avatarUrl}
            zoomScale={scale}
          />
        );
      })}
    </group>
  );
}
