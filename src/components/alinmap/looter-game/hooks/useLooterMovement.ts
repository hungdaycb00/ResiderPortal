import { useCallback, useState, useMemo } from 'react';
import { looterApi } from '../services/looterApi';
import { getDistanceMeters } from '../backpack/utils';
import { FORTRESS_INTERACTION_METERS } from '../LooterGameContext';
import type { LooterGameState, Encounter } from '../LooterGameContext';
import type { LooterItem } from '../backpack/types';
import { calculateCurseGain, rollCurse } from '../engine/curses';
import { calcTotalStats } from '../engine/combat';
import { generateBot } from '../engine/entities';
import { isItemInBag } from '../engine/utils';

interface UseLooterMovementProps {
  deviceId: string | null;
  apiUrl: string;
  state: LooterGameState;
  setState: React.Dispatch<React.SetStateAction<LooterGameState>>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;

  setIsChallengeActive: (v: boolean) => void;
  setEncounter: (e: Encounter | null) => void;
  setShowCurseModal: (v: boolean) => void;
  dropItems: (uids: string[], lat: number, lng: number) => Promise<void>;
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
  dropItems
}: UseLooterMovementProps) {
  const [isMoving, setIsMoving] = useState(false);

  const moveBoat = useCallback(async (toLat: number, toLng: number, isStep?: boolean, stepDist?: number) => {
    setIsMoving(true);
    try {
        const fromLat = state.currentLat || state.fortressLat || 0;
        const fromLng = state.currentLng || state.fortressLng || 0;
        const distToFortress = getDistanceMeters(toLat, toLng, state.fortressLat, state.fortressLng);
        const currentDistToFortress = getDistanceMeters(fromLat, fromLng, state.fortressLat, state.fortressLng);

        // worldTier === -1 nghĩa là đang ở Thành Trì, cần bắt đầu thử thách mới
        if ((state.worldTier ?? -1) === -1 && distToFortress > FORTRESS_INTERACTION_METERS) {
            if (!isStep) notify('Bạn cần bắt đầu thử thách mới để ra khơi!', 'info');
            setIsMoving(false);
            return { curseTrigger: false, encounter: null };
        }

        const distMeters = isStep ? (stepDist || 0) : getDistanceMeters(fromLat, fromLng, toLat, toLng);

        // Auto eject staging items (outside bag) - chỉ chạy khi kết thúc chuyến đi
        if (!isStep) {
            const itemsToDrop = (state.inventory || []).filter(i => i.gridX < 0 || i.gridY < 0 || !isItemInBag(i, i.gridX, i.gridY, state.bags?.[0]));
            if (itemsToDrop.length > 0) {
                dropItems(itemsToDrop.map(i => i.uid), fromLat, fromLng).catch(console.error);
            }
        }
        
        let newCurse = state.cursePercent;
        let curseTrigger = false;
        let encounter: Encounter | null = null;
        
        const hasItems = state.inventory && state.inventory.length > 0;
        
        if (hasItems) {
            const curseGain = calculateCurseGain('move', distMeters, state.activeCurses);
            newCurse = Math.min((state.cursePercent || 0) + curseGain, 100);
            curseTrigger = rollCurse(newCurse);
            
            if (curseTrigger) {
                newCurse = 0; // Reset
                const bot = generateBot(state.worldTier || 1, state.inventory.length);
                const botStats = calcTotalStats(bot.inventory, bot.bags[0], {});
                encounter = {
                    type: 'bot',
                    ...bot,
                    totalWeight: botStats.totalWeight,
                    totalHp: bot.baseMaxHp + botStats.totalHp,
                };
            }
        }
        
        setState(prev => ({
          ...prev,
          currentLat: toLat,
          currentLng: toLng,
          cursePercent: newCurse,
          distance: prev.distance + Math.round(distMeters),
        }));

        if (distToFortress > FORTRESS_INTERACTION_METERS) {
            setIsChallengeActive(true);
        } else if (!isStep) {
            // Về đến thành trì: reset về trạng thái "ở thành trì" (-1) và tắt challenge (chỉ thực hiện nếu tới bến)
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
  }, [state, setState, setIsChallengeActive, setEncounter, setShowCurseModal]);

  const returnToFortress = useCallback(async () => {
    if (!deviceId) return;
    try {
      const data = await looterApi.returnToFortress(apiUrl, deviceId);
      if (data.success) {
        setState(prev => ({
          ...prev,
          currentLat: prev.fortressLat,
          currentLng: prev.fortressLng,
          worldTier: -1  // -1 = đang ở thành trì, cần thử thách mới
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
