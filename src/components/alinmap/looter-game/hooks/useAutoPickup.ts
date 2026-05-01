import { useRef } from 'react';
import { useAnimationFrame, MotionValue } from 'framer-motion';
import { DEGREES_TO_PX } from '../../constants';
import type { WorldItem } from '../LooterGameContext';

const PICKUP_RADIUS_DEG = 0.00085;
const PORTAL_RADIUS_DEG = 0.0024;

interface UseAutoPickupParams {
  isLooterGameMode: boolean;
  myObfPos: { lat: number; lng: number } | null;
  boatOffsetX: MotionValue<number>;
  boatOffsetY: MotionValue<number>;
  panX: MotionValue<number>;
  panY: MotionValue<number>;
  worldItems: WorldItem[];
  isAnimatingRef: React.MutableRefObject<boolean>;
  // Blocking conditions
  showMinigame: WorldItem | null;
  isFortressStorageOpen: boolean;
  encounter: any;
  showCurseModal: boolean;
  combatResult: any;
  pickupRewardItem: any;
  // Actions
  pickupItem: (spawnId: string) => Promise<boolean>;
  setShowMinigame: (item: WorldItem | null) => void;
  openFortressStorage: (mode: 'portal') => void;
  stopAllAnimations: () => void;
  setBoatTargetPin: (v: { lat: number; lng: number } | null) => void;
}

export function useAutoPickup({
  isLooterGameMode, myObfPos, boatOffsetX, boatOffsetY, panX, panY,
  worldItems, isAnimatingRef,
  showMinigame, isFortressStorageOpen, encounter, showCurseModal, combatResult, pickupRewardItem,
  pickupItem, setShowMinigame, openFortressStorage, stopAllAnimations, setBoatTargetPin,
}: UseAutoPickupParams) {
  const pickingItemsRef = useRef(new Set<string>());
  const activePortalRef = useRef<string | null>(null);

  useAnimationFrame(() => {
    if (!isLooterGameMode || !myObfPos) return;

    // Stop movement if any blocking event is active
    if (showMinigame || isFortressStorageOpen || encounter || showCurseModal || combatResult) {
      if (isAnimatingRef.current) {
        stopAllAnimations();
        setBoatTargetPin(null);
      }
      return;
    }

    if (!worldItems?.length || pickupRewardItem || showMinigame) return;

    const currentLng = myObfPos.lng + (boatOffsetX?.get?.() ?? 0) / DEGREES_TO_PX;
    const currentLat = myObfPos.lat - (boatOffsetY?.get?.() ?? 0) / DEGREES_TO_PX;

    worldItems.forEach((item: any) => {
      if (pickingItemsRef.current.has(item.spawnId)) return;
      const dLat = item.lat - currentLat;
      const dLng = item.lng - currentLng;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);

      // Portal detection
      if (item?.item?.type === 'portal') {
        if (dist < PORTAL_RADIUS_DEG && activePortalRef.current !== item.spawnId) {
          boatOffsetX.stop(); boatOffsetY.stop(); panX.stop(); panY.stop();
          isAnimatingRef.current = false;
          setBoatTargetPin(null);
          activePortalRef.current = item.spawnId;
          openFortressStorage('portal');
        } else if (dist >= PORTAL_RADIUS_DEG && activePortalRef.current === item.spawnId) {
          activePortalRef.current = null;
        }
        return;
      }

      // Item pickup
      if (dist < PICKUP_RADIUS_DEG) {
        boatOffsetX.stop(); boatOffsetY.stop(); panX.stop(); panY.stop();
        isAnimatingRef.current = false;
        setBoatTargetPin(null);

        const rarityStr = item.item?.rarity || '';
        const isRare = rarityStr === 'rare' || rarityStr === 'legendary' || item.isExpander;

        if (isRare) {
          setShowMinigame(item);
          pickingItemsRef.current.add(item.spawnId);
          return;
        }

        pickingItemsRef.current.add(item.spawnId);
        pickupItem(item.spawnId).then((success: boolean) => {
          if (!success) {
            setTimeout(() => pickingItemsRef.current.delete(item.spawnId), 5000);
          }
        });
      }
    });
  });
}
