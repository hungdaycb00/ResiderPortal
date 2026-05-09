import { useCallback, useMemo, useState, useRef } from 'react';

import { looterApi } from '../services/looterApi';
import { getDistanceMeters } from '../backpack/utils';
import { FORTRESS_INTERACTION_METERS, sanitizeWorldItems } from '../LooterGameContext';
import { isItemFullyInsideBag } from '../utils/looterHelpers';
import { calculateCurseGain, rollCursePerIncrement } from '../engine/curses';
import { generateBot } from '../engine/entities';
import { calcTotalStats } from '../engine/combat';
import type { LooterChunkCacheEntry, LooterGameState, Encounter, WorldItem } from '../LooterGameContext';
import type { LooterItem } from '../backpack/types';

interface UseLooterMovementProps {
  deviceId: string | null;
  apiUrl: string;
  state: LooterGameState;
  setState: React.Dispatch<React.SetStateAction<LooterGameState>>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  setIsChallengeActive: (v: boolean) => void;
  setEncounter: (e: Encounter | null) => void;
  setShowCurseModal: (v: boolean) => void;
  setWorldItems: React.Dispatch<React.SetStateAction<WorldItem[]>>;
  saveInventory: (inventory: LooterItem[]) => Promise<boolean>;
  loadWorldItems: (forceActive?: boolean, centerOverride?: { lat: number; lng: number; fortressLat?: number | null; fortressLng?: number | null }) => Promise<void>;
  chunkCacheRef: React.MutableRefObject<Map<string, LooterChunkCacheEntry>>;
  openBackpack?: () => void;
  setIsIntegratedStorageOpen?: (v: boolean) => void;
  setIsTierSelectorOpen?: (v: boolean) => void;
}

export function useLooterMovement({
  deviceId,
  apiUrl,
  state,
  setState,
  notify,
  setIsChallengeActive,
  setEncounter,
  setShowCurseModal,
  setWorldItems,
  saveInventory,
  loadWorldItems,
  chunkCacheRef,
  openBackpack,
  setIsIntegratedStorageOpen,
  setIsTierSelectorOpen,
}: UseLooterMovementProps) {
  const [isMoving, setIsMoving] = useState(false);
  const prevDistToFortressRef = useRef<number>(99999);

  const moveBoat = useCallback(async (toLat: number, toLng: number, isStep?: boolean, stepDist?: number) => {
    setIsMoving(true);
    try {
      const fromLat = state.currentLat || state.fortressLat || 0;
      const fromLng = state.currentLng || state.fortressLng || 0;
      const distToFortress = getDistanceMeters(toLat, toLng, state.fortressLat, state.fortressLng);

      if ((state.worldTier ?? -1) === -1 && distToFortress > FORTRESS_INTERACTION_METERS) {
        if (!isStep) {
          setIsTierSelectorOpen?.(true);
        }
        return { curseTrigger: false, encounter: null };
      }

      const distMeters = isStep ? (stepDist || 0) : getDistanceMeters(fromLat, fromLng, toLat, toLng);
      let itemsToDrop: LooterItem[] = [];

      if (!isStep) {
        const activeBag = state.bags?.[0];
        itemsToDrop = (state.inventory || []).filter(item => {
          if (item.gridX < 0 || item.gridY < 0) return true;
          return !isItemFullyInsideBag(item, activeBag);
        });
      }

      const dropUids = new Set(itemsToDrop.map(item => item.uid));
      const cleanedInventory = (state.inventory || []).filter(item => !dropUids.has(item.uid));

      let newCurse = state.cursePercent;
      let curseTrigger = false;
      let encounter: Encounter | null = null;
      let serverDroppedItems: WorldItem[] = [];
      let serverInventory: LooterItem[] | null = null;

      if (cleanedInventory.length > 0) {
        const curseGain = calculateCurseGain('move', distMeters, state.activeCurses);
        newCurse = Math.min((state.cursePercent || 0) + curseGain, 100);
        curseTrigger = rollCursePerIncrement(state.cursePercent || 0, curseGain);

        if (curseTrigger) {
          newCurse = 0;
          const bot = generateBot(state.worldTier || 1, cleanedInventory.length);
          const botStats = calcTotalStats(bot.inventory, bot.bags[0], {});
          encounter = {
            type: 'bot',
            ...bot,
            totalWeight: botStats.totalWeight,
            totalHp: bot.baseMaxHp + botStats.totalHp,
          } as any;
        }
      }

      if (deviceId) {
        try {
          const moveResult: any = await looterApi.moveBoat(
            apiUrl,
            deviceId,
            toLat,
            toLng,
            itemsToDrop.map(item => item.uid)
          );
          if (moveResult?.success) {
            newCurse = moveResult.cursePercent ?? newCurse;
            curseTrigger = !!moveResult.curseTrigger;
            encounter = moveResult.encounter || encounter;
            serverDroppedItems = sanitizeWorldItems(moveResult.droppedItems);
            serverInventory = Array.isArray(moveResult.inventory) ? moveResult.inventory : null;

            // Handle newly spawned proximity items from milestone
            if (Array.isArray(moveResult.spawnedItems) && moveResult.spawnedItems.length > 0) {
              const spawned = sanitizeWorldItems(moveResult.spawnedItems);
              setWorldItems(prev => [...sanitizeWorldItems(prev), ...spawned]);
            }
          }
        } catch (moveErr) {
        }
      }

      setState(prev => ({
        ...prev,
        inventory: (serverInventory || prev.inventory).filter(item => !dropUids.has(item.uid)),
        currentLat: toLat,
        currentLng: toLng,
        cursePercent: newCurse,
        distance: prev.distance + Math.round(distMeters),
      }));
      void loadWorldItems(true, { lat: toLat, lng: toLng });

      if (itemsToDrop.length > 0) {
        if (serverDroppedItems.length > 0) {
          const now = Date.now();
          for (const item of serverDroppedItems) {
            if (item.chunkX == null || item.chunkY == null) continue;
            const key = `${item.chunkX}:${item.chunkY}`;
            const entry = chunkCacheRef.current.get(key);
            if (entry) {
              entry.items = [...sanitizeWorldItems(entry.items).filter(existing => existing.spawnId !== item.spawnId), item];
              entry.touchedAt = now;
            } else {
              chunkCacheRef.current.set(key, {
                key,
                chunkX: item.chunkX,
                chunkY: item.chunkY,
                items: [item],
                touchedAt: now,
              });
            }
          }
          setWorldItems(worldItems => [
            ...sanitizeWorldItems(worldItems).filter(existing => !serverDroppedItems.some(item => item.spawnId === existing.spawnId)),
            ...serverDroppedItems,
          ]);
        } else {
          await saveInventory(cleanedInventory);
        }
        notify(`Đã ném ${itemsToDrop.length} vật phẩm ra biển`, 'info');
      }

      // Phát hiện crossing boundary (vào/ra vùng thành trì)
      const wasInside = prevDistToFortressRef.current <= FORTRESS_INTERACTION_METERS;
      const isInside = distToFortress <= FORTRESS_INTERACTION_METERS;
      prevDistToFortressRef.current = distToFortress;

      if (distToFortress > FORTRESS_INTERACTION_METERS) {
        setIsChallengeActive(true);
        if (wasInside && !isStep) {
          // Vừa rời khỏi thành trì → đóng storage panel
          setIsIntegratedStorageOpen?.(false);
        }
      } else if (!isStep) {
        setState(prev => ({ ...prev, worldTier: -1 }));
        setIsChallengeActive(false);
        if (!wasInside) {
          // Vừa vào thành trì → mở tab kho đồ
          openBackpack?.();
          setTimeout(() => setIsIntegratedStorageOpen?.(true), 200);
        }
      }

      if (curseTrigger && encounter) {
        setEncounter(encounter);
        setShowCurseModal(true);
        return { curseTrigger: true, encounter };
      }

      return { curseTrigger: false, encounter: null };
    } catch (err) {
      console.error('[LooterGame] moveBoat error:', err);
      return { curseTrigger: false, encounter: null };
    } finally {
      setIsMoving(false);
    }
  }, [deviceId, apiUrl, state, setState, setIsChallengeActive, setEncounter, setShowCurseModal, setWorldItems, saveInventory, loadWorldItems, notify, chunkCacheRef]);

  const returnToFortress = useCallback(async () => {
    if (!deviceId) return;
    try {
      const data = await looterApi.returnToFortress(apiUrl, deviceId);
      if (data.success) {
        setState(prev => ({
          ...prev,
          currentLat: prev.fortressLat,
          currentLng: prev.fortressLng,
          worldTier: -1,
          inventory: Array.isArray(data.state?.inventory) ? data.state.inventory : prev.inventory,
          storage: Array.isArray(data.state?.storage) ? data.state.storage : prev.storage,
        }));
        setIsChallengeActive(false);
        notify('Đã quay về thành trì', 'success');
      }
    } catch (err) {
      console.error('[LooterGame] returnToFortress error:', err);
    }
  }, [deviceId, apiUrl, notify, setState, setIsChallengeActive]);

  return useMemo(() => ({ moveBoat, returnToFortress, isMoving }), [moveBoat, returnToFortress, isMoving]);
}
