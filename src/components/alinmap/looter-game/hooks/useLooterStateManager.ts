import { useCallback, useMemo } from 'react';
import { looterApi } from '../services/looterApi';
import { createPortalWorldItems } from '../utils/looterHelpers';
import { simulateCombat } from '../engine/combat';
import { repairBagData, createStarterBag, getDistanceMeters } from '../backpack/utils';
import { FORTRESS_INTERACTION_METERS } from '../LooterGameContext';
import type { LooterGameState, WorldItem, LooterItem, BagItem } from '../LooterGameContext';

interface UseLooterStateManagerProps {
  deviceId: string | null;
  apiUrl: string;
  state: LooterGameState;
  setState: React.Dispatch<React.SetStateAction<LooterGameState>>;
  setWorldItems: React.Dispatch<React.SetStateAction<WorldItem[]>>;
  setIsChallengeActive: (v: boolean) => void;
  setGlobalSettings: (v: any) => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  saveBags?: (bags: BagItem[]) => void;
  syncState: (state: LooterGameState) => void;
  isChallengeActive: boolean;
}

export function useLooterStateManager({
  deviceId,
  apiUrl,
  state,
  setState,
  setWorldItems,
  setIsChallengeActive,
  setGlobalSettings,
  notify,
  isChallengeActive,
  saveBags,
  syncState
}: UseLooterStateManagerProps) {

  const loadWorldItems = useCallback(async (forceActive?: boolean) => {
    if (!deviceId) return;
    try {
      const data = await looterApi.fetchWorldItems(apiUrl, deviceId);
      if (data.success) {
        const portalItems = createPortalWorldItems(state.fortressLat, state.fortressLng, state.currentLat, state.currentLng);
        const mapItems: WorldItem[] = Array.isArray(data.items) ? data.items : [];
        const normalItems = mapItems.filter((item) => (item as any)?.item?.type !== 'portal');
        
        let items = [...portalItems, ...normalItems];
        if (!forceActive && !isChallengeActive) {
          items = [...portalItems, ...normalItems.slice(0, 3)];
        }
        setWorldItems(items);
      }
    } catch (err) {
      console.error('[LooterGame] loadWorldItems error:', err);
    }
  }, [deviceId, apiUrl, state.fortressLat, state.fortressLng, state.currentLat, state.currentLng, isChallengeActive, setWorldItems]);

  const loadState = useCallback(async () => {
    if (!deviceId) return;
    try {
      const data = await looterApi.fetchState(apiUrl, deviceId);
      if (data.success && data.state) {
        const s = data.state; // Đây là dữ liệu đã qua Transformer
        let bags: BagItem[] = s.bags || [];
        let didRepairBags = false;

        if (bags.length > 0) {
          const { bag, repaired } = repairBagData(bags[0]);
          bags = [bag, ...bags.slice(1)];
          if (repaired) didRepairBags = true;
        } else {
          const bag = createStarterBag();
          bags = [bag];
          didRepairBags = true;
        }

        if (didRepairBags) {
          saveBags(bags);
        }

        setState({
          ...s,
          bags,
        } as LooterGameState);

        if (data.settings) setGlobalSettings(data.settings);
        
        const distToFortress = getDistanceMeters(s.currentLat, s.currentLng, s.fortressLat, s.fortressLng);
        // Tier -1 = đang ở thành trì (chưa bắt đầu thử thách). 
        const isNearFortress = distToFortress <= FORTRESS_INTERACTION_METERS;
        const shouldBeActive = !isNearFortress || (s.worldTier ?? -1) > 0;
        
        // Cập nhật worldTier nội bộ nếu đang ở thành trì mà state chưa đồng bộ
        const finalWorldTier = (isNearFortress && !isChallengeActive) ? -1 : s.worldTier;

        setState({
          ...s,
          bags,
          worldTier: finalWorldTier,
        } as LooterGameState);

        if (data.settings) setGlobalSettings(data.settings);
        
        if (shouldBeActive && !isChallengeActive) {
          setIsChallengeActive(true);
        }
      }
    } catch (err) {
      console.error('[LooterGame] loadState error:', err);
    }
  }, [deviceId, apiUrl, setState, setGlobalSettings, setIsChallengeActive, saveBags]);

  const initGame = useCallback(async (lat: number, lng: number) => {
    if (!deviceId) return;
    try {
      await looterApi.initGame(apiUrl, deviceId, lat, lng);
      await loadState();
    } catch (err) {
      console.error('[LooterGame] initGame error:', err);
    }
  }, [deviceId, apiUrl, loadState]);

  const setWorldTier = useCallback(async (tier: number) => {
    if (!deviceId) return;
    try {
      const data = await looterApi.setWorldTier(apiUrl, deviceId, tier);
      if (data.success) {
        setState(prev => ({ ...prev, worldTier: tier }));
        setIsChallengeActive(true);
        notify(`Đã chuyển sang Tier ${tier}`, 'success');
        setTimeout(() => loadWorldItems(true), 500);
      }
    } catch (err) {
      console.error('[LooterGame] setWorldTier error:', err);
    }
  }, [deviceId, apiUrl, setState, setIsChallengeActive, notify, loadWorldItems]);



  const executeCombat = useCallback(async (opponentId: string, opponentInventory?: any[], opponentHp?: number, opponentBags?: any[]) => {
    if (!deviceId) throw new Error('No deviceId');
    try {
      // 1. Build Player A (User)
      const playerA = {
          inventory: state.inventory,
          bag: state.bags?.[0],
          activeCurses: state.activeCurses,
          baseMaxHp: 100 // Default base
      };

      // 2. Build Player B (Opponent/Bot)
      const playerB = {
          inventory: opponentInventory || [],
          bag: opponentBags?.[0],
          activeCurses: {},
          // Approximate base max HP since we only have total HP. 
          // Actually, totalHp = base + stats.totalHp. So base = totalHp - stats.totalHp.
          // For simplicity, just use opponentHp as baseMaxHp if we don't have accurate decomposition.
          baseMaxHp: opponentHp || 100
      };

      const result = simulateCombat(playerA, playerB);

      // 3. Update Local State
      setState(prev => {
          let newInventory = [...prev.inventory];
          let hp = result.finalHpA;

          if (result.winner === 'A') {
              // Gained items. They go to staging or empty slots. We let CombatLootModal handle claiming them, so we DON'T add them here automatically!
              // Wait, the API used to return `result.droppedItems`. CombatLootModal displays them. So we just return them.
          } else if (result.winner === 'B') {
              // Lost items. Remove them from inventory.
              const lostUids = result.droppedItems.map((i: any) => i.uid);
              newInventory = newInventory.filter(i => !lostUids.includes(i.uid));
              // Player respawns at fortress with full HP if they die
              if (hp <= 0) {
                  hp = 100;
                  // Should we teleport them to fortress? The `returnToFortress` is usually called on death.
              }
          }

          const nextState = { ...prev, inventory: newInventory, currentHp: hp };
          syncState(nextState);
          return nextState;
      });

      const formattedResult = {
          result: result.winner === 'A' ? 'win' : 'lose',
          combatLog: result.combatLog,
          loot: result.winner === 'A' ? result.droppedItems : undefined,
          droppedItems: result.winner === 'B' ? result.droppedItems : undefined,
          finalHp: result.finalHpA,
          finalHpA: result.finalHpA,
          finalHpB: result.finalHpB,
          totalTicks: result.totalTicks
      };

      return formattedResult as any;
    } catch (err) {
      console.error('[LooterGame] executeCombat error:', err);
      throw err;
    }
  }, [deviceId, state, setState, syncState]);

  const curseChoice = useCallback(async (choice: 'flee' | 'challenge') => {
    if (!deviceId) return;
    try {
      if (choice === 'flee') {
          // Flee penalty: Lose some energy or drop random item
          setState(prev => {
             const nextState = { ...prev };
             syncState(nextState);
             return nextState;
          });
          notify('Bạn đã bỏ trốn thành công', 'info');
      }
    } catch (err) {
      console.error('[LooterGame] curseChoice error:', err);
    }
  }, [deviceId, setState, notify, syncState]);

  const inflictMinigamePenalty = useCallback(async (spawnId: string) => {
    if (!deviceId) return false;
    setWorldItems(prev => prev.filter(i => i.spawnId !== spawnId));
    try {
      // Offline minigame penalty: increase curse percent by 10%
      let newCurse = 0;
      setState(prev => {
          newCurse = Math.min((prev.cursePercent || 0) + 20, 100);
          const nextState = { ...prev, cursePercent: newCurse };
          syncState(nextState);
          return nextState;
      });
      return true;
    } catch (err) {
      console.error('[LooterGame] minigamePenalty error:', err);
      return false;
    }
  }, [deviceId, setState, setWorldItems, syncState]);

  return useMemo(() => ({ 
    loadWorldItems, loadState, initGame, 
    setWorldTier, inflictMinigamePenalty, 
    executeCombat, curseChoice 
  }), [
    loadWorldItems, loadState, initGame, 
    setWorldTier, inflictMinigamePenalty, 
    executeCombat, curseChoice
  ]);
}
