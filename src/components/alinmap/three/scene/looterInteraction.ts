import React from 'react';
import { Vector3, Ray } from 'three';
import { DEGREES_TO_PX } from '../../constants';
import { worldToScene, pxToScene, AVATAR_PLANE_SIZE, type LatLng } from '../sceneUtils';
import { resolveGroundClickSelection } from './useGroundClickTarget';

interface LooterInteractionParams {
  isLooterGameMode: boolean;
  isDesktop: boolean;
  origin: LatLng;
  safeWorldItems: any[];
  looterStateObj: any;
  encounter: any;
  boatTargetPin: LatLng | null;
  boatOffsetX: any;
  boatOffsetY: any;
  itemClickLockRef: React.MutableRefObject<boolean>;
  onRequestMove?: (lat: number, lng: number, source?: string) => void;
  onStopBoat?: () => void;
  onSetArrivalAction?: (action: (() => void) | null) => void;
  openFortressStorage?: (mode: string) => void;
  setShowMinigame?: (item: any) => void;
  pickupItem?: (spawnId: string, item: any, lat: number, lng: number) => void;
  setIsTierSelectorOpen?: (v: boolean) => void;
  sceneWorldScale?: number;
}

export function useLooterInteraction(params: LooterInteractionParams) {
  const {
    isLooterGameMode, isDesktop, origin, safeWorldItems,
    looterStateObj, encounter, boatTargetPin,
    boatOffsetX, boatOffsetY, itemClickLockRef,
    onRequestMove, onStopBoat, onSetArrivalAction,
    openFortressStorage, setShowMinigame, pickupItem,
    setIsTierSelectorOpen, sceneWorldScale = 1,
  } = params;

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
    if (worldItem?.item?.type === 'portal') return '🌀';
    if (worldItem?.minigameType) return '📦';
    if (worldItem?.item?.type === 'bag') return '🎒';
    return '💎';
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

  // Waypoint: 3 item gan nhat, bypass culling
  const waypointItems = React.useMemo(() => {
    if (!isLooterGameMode || !safeWorldItems.length) return [];
    const curLat = looterStateObj?.currentLat ?? origin.lat;
    const curLng = looterStateObj?.currentLng ?? origin.lng;
    return safeWorldItems
      .filter((i: any) => i.item?.type !== 'portal')
      .map((i: any) => ({ item: i, dist: (i.lat - curLat) ** 2 + (i.lng - curLng) ** 2 }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3)
      .map(e => e.item);
  }, [isLooterGameMode, safeWorldItems, looterStateObj?.currentLat, looterStateObj?.currentLng, origin.lat, origin.lng]);

  const waypointSpawnIds = React.useMemo(() =>
    new Set(waypointItems.map((i: any) => i.spawnId))
  , [waypointItems]);

  const renderedWorldItems = React.useMemo(() => {
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
  }, [encounter, isDesktop, isLooterGameMode, looterStateObj?.currentLat, looterStateObj?.currentLng, origin.lat, origin.lng, safeWorldItems, waypointSpawnIds]);

  const handleWorldItemClick = React.useCallback((worldItem: any) => {
    if (!isLooterGameMode || !worldItem) return;
    console.log('[LootClick] Clicked item:', worldItem.spawnId, worldItem.item?.name || worldItem.item?.type, 'at', worldItem.lat?.toFixed(5), worldItem.lng?.toFixed(5));
    itemClickLockRef.current = true;
    const boat = getCurrentBoatLatLng();
    const dist = distanceMeters(boat, { lat: worldItem.lat, lng: worldItem.lng });
    const interactionRadius = 250;
    const isPortal = worldItem?.item?.type === 'portal';

    if (dist > interactionRadius) {
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
    if (isPortal) { openFortressStorage?.('portal'); return; }
    if (worldItem.minigameType) {
      setShowMinigame?.({ ...worldItem, currentLat: boat.lat, currentLng: boat.lng });
      return;
    }
    pickupItem?.(worldItem.spawnId, worldItem, boat.lat, boat.lng);
  }, [
    distanceMeters, getCurrentBoatLatLng, isLooterGameMode,
    onRequestMove, onStopBoat, onSetArrivalAction,
    openFortressStorage, pickupItem, setShowMinigame, itemClickLockRef,
  ]);

  const handleWorldItemClickRef = React.useRef(handleWorldItemClick);
  handleWorldItemClickRef.current = handleWorldItemClick;

  const handleFortressClick = React.useCallback(() => {
    if (!isLooterGameMode || !looterStateObj?.fortressLat || !looterStateObj?.fortressLng) return;
    const target = { lat: looterStateObj.fortressLat, lng: looterStateObj.fortressLng };
    const boat = getCurrentBoatLatLng();
    if (distanceMeters(boat, target) <= 250) {
      onStopBoat?.();
      openFortressStorage?.('fortress');
    } else {
      onSetArrivalAction?.(() => { openFortressStorage?.('fortress'); });
      onRequestMove?.(target.lat, target.lng, 'fortress');
    }
  }, [
    distanceMeters, getCurrentBoatLatLng, isLooterGameMode,
    looterStateObj?.fortressLat, looterStateObj?.fortressLng,
    onRequestMove, onStopBoat, onSetArrivalAction, openFortressStorage,
  ]);

  const handleGroundClick = React.useCallback((groundMeshRef: React.RefObject<any>, point: Vector3, ray?: Ray) => {
    if (!isLooterGameMode || !groundMeshRef.current || !onRequestMove) return;
    if (itemClickLockRef.current) { itemClickLockRef.current = false; return; }

    const moveGroup = groundMeshRef.current.parent;
    if (!moveGroup) return;

    const selection = resolveGroundClickSelection({
      point,
      ray,
      moveGroup,
      origin,
      sceneWorldScale,
      waypointItems,
      renderedWorldItems,
    });

    if (selection.kind === 'item' && selection.item) {
      const nearest = selection.item;
      console.log('[GroundClick->Item] Proximity hit:', nearest.spawnId, nearest.item?.name || nearest.item?.type, 'at', nearest.lat?.toFixed(5), nearest.lng?.toFixed(5), 'click-lat:', selection.lat.toFixed(5), 'click-lng:', selection.lng.toFixed(5));
      handleWorldItemClickRef.current(nearest);
      return;
    }

    if (looterStateObj?.worldTier === -1 && !encounter) {
      setIsTierSelectorOpen?.(true);
      return;
    }

    onRequestMove(selection.lat, selection.lng, 'map');
  }, [isLooterGameMode, onRequestMove, origin.lat, origin.lng, itemClickLockRef, looterStateObj?.worldTier, encounter, setIsTierSelectorOpen, waypointItems, renderedWorldItems]);

  const itemRenderData = React.useMemo(() =>
    renderedWorldItems.map((item: any) => ({
      item,
      pos: worldToScene(origin, { lat: item.lat, lng: item.lng }),
    }))
  , [renderedWorldItems, origin.lat, origin.lng]);

  const waypointRenderData = React.useMemo(() =>
    waypointItems.map((item: any) => ({
      item,
      pos: worldToScene(origin, { lat: item.lat, lng: item.lng }),
    }))
  , [waypointItems, origin.lat, origin.lng]);

  return {
    getCurrentBoatLatLng, distanceMeters,
    getWorldItemIcon, getWorldItemType, getWorldItemAccent,
    handleWorldItemClick, handleFortressClick, handleGroundClick,
    waypointItems, waypointSpawnIds, renderedWorldItems,
    itemRenderData, waypointRenderData,
  };
}

export { worldToScene, type LatLng };
