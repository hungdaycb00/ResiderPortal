import { useCallback, useState, useMemo } from 'react';
import { looterApi } from '../services/looterApi';
import { getDistanceMeters } from '../backpack/utils';
import { FORTRESS_INTERACTION_METERS } from '../LooterGameContext';
import type { LooterGameState, Encounter, WorldItem } from '../LooterGameContext';
import type { LooterItem } from '../backpack/types';
import { calculateCurseGain, rollCurse } from '../engine/curses';
import { generateBot } from '../engine/entities';
import { calcTotalStats } from '../engine/combat';

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
  saveInventory
}: UseLooterMovementProps) {
  const [isMoving, setIsMoving] = useState(false);

  const moveBoat = useCallback(async (toLat: number, toLng: number, isStep?: boolean, stepDist?: number) => {
    setIsMoving(true);
    try {
        const fromLat = state.currentLat || state.fortressLat || 0;
        const fromLng = state.currentLng || state.fortressLng || 0;
        const distToFortress = getDistanceMeters(toLat, toLng, state.fortressLat, state.fortressLng);

        if ((state.worldTier ?? -1) === -1 && distToFortress > FORTRESS_INTERACTION_METERS) {
            if (!isStep) notify('Bạn cần bắt đầu thử thách mới để ra khơi!', 'info');
            setIsMoving(false);
            return { curseTrigger: false, encounter: null };
        }

        const distMeters = isStep ? (stepDist || 0) : getDistanceMeters(fromLat, fromLng, toLat, toLng);

        let itemsToDrop: LooterItem[] = [];
        if (!isStep) {
            const activeBag = state.bags?.[0];
            itemsToDrop = (state.inventory || []).filter(item => {
                if (item.gridX < 0 || item.gridY < 0) return true;
                if (!activeBag) return true;

                const bagX = activeBag.gridX ?? 0;
                const bagY = activeBag.gridY ?? 0;
                const bagW = activeBag.width ?? 5;
                const bagH = activeBag.height ?? 5;
                const itemW = item.gridW ?? 1;
                const itemH = item.gridH ?? 1;
                return (
                    item.gridX < bagX ||
                    item.gridY < bagY ||
                    item.gridX + itemW > bagX + bagW ||
                    item.gridY + itemH > bagY + bagH
                );
            });
        }

        const dropUids = new Set(itemsToDrop.map(i => i.uid));
        const cleanedInventory = (state.inventory || []).filter(i => !dropUids.has(i.uid));
        
        let newCurse = state.cursePercent;
        let curseTrigger = false;
        let encounter: Encounter | null = null;
        
        const hasItems = cleanedInventory.length > 0;
        
        if (hasItems) {
            const curseGain = calculateCurseGain('move', distMeters, state.activeCurses);
            newCurse = Math.min((state.cursePercent || 0) + curseGain, 100);
            curseTrigger = rollCurse(newCurse);
            
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
        
        setState(prev => ({
          ...prev,
          inventory: prev.inventory.filter(i => !dropUids.has(i.uid)),
          currentLat: toLat,
          currentLng: toLng,
          cursePercent: newCurse,
          distance: prev.distance + Math.round(distMeters),
        }));

        if (itemsToDrop.length > 0) {
            setWorldItems(wItems => {
                const newWorldItems = itemsToDrop.map((item, i) => ({
                    spawnId: `dropped_${item.uid}_${Date.now()}_${i}`,
                    lat: fromLat + (Math.random() - 0.5) * 0.0001,
                    lng: fromLng + (Math.random() - 0.5) * 0.0001,
                    item: item,
                    isExpander: false,
                    minigameType: null
                }));
                return [...wItems, ...newWorldItems];
            });
            saveInventory(cleanedInventory);
            notify(`Đã ném ${itemsToDrop.length} vật phẩm ra Map`, 'info');
        }

        if (distToFortress > FORTRESS_INTERACTION_METERS) {
            setIsChallengeActive(true);
        } else if (!isStep) {
            setState(prev => ({ ...prev, worldTier: -1 }));
            setIsChallengeActive(false);
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
  }, [state, setState, setIsChallengeActive, setEncounter, setShowCurseModal, setWorldItems, saveInventory, notify]);

  const returnToFortress = useCallback(async () => {
    if (!deviceId) return;
    try {
      const data = await looterApi.returnToFortress(apiUrl, deviceId);
      if (data.success) {
        setState(prev => ({
          ...prev,
          currentLat: prev.fortressLat,
          currentLng: prev.fortressLng,
          worldTier: -1
        }));
        setIsChallengeActive(false);
        notify('Đã quay về Thành trì', 'success');
      }
    } catch (err) {
      console.error('[LooterGame] returnToFortress error:', err);
    }
  }, [deviceId, apiUrl, notify, setState, setIsChallengeActive]);

  return useMemo(() => ({ moveBoat, returnToFortress, isMoving }), [moveBoat, returnToFortress, isMoving]);
}
