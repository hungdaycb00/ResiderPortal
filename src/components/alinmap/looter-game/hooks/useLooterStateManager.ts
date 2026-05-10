import { useCallback, useMemo, useRef } from 'react';
import { looterApi } from '../services/looterApi';
import { createPortalWorldItems } from '../utils/looterHelpers';
import { simulateCombat } from '../engine/combat';
import { repairBagData, createStarterBag, getDistanceMeters } from '../backpack/utils';
import { FORTRESS_INTERACTION_METERS, sanitizeWorldItems } from '../LooterGameContext';
import type { LooterGameState, WorldItem, LooterItem, BagItem } from '../LooterGameContext';

const LOOT_RENDER_LIMIT = 25; // Đủ để hiển thị trên mobile mà không gây lag

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
  chunkCacheRef: React.MutableRefObject<Map<string, any>>;
  consumedSpawnIdsRef: React.MutableRefObject<Set<string>>;
  saveInventory?: (inventory: LooterItem[]) => Promise<boolean>;
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
  syncState,
  chunkCacheRef,
  consumedSpawnIdsRef,
  saveInventory
}: UseLooterStateManagerProps) {

  const loadWorldItems = useCallback(async (forceActive?: boolean, centerOverride?: { lat: number; lng: number; fortressLat?: number | null; fortressLng?: number | null }) => {
    if (!deviceId) return;
    try {
      const centerLat = centerOverride?.lat ?? state.currentLat;
      const centerLng = centerOverride?.lng ?? state.currentLng;
      const fortressLat = centerOverride?.fortressLat ?? state.fortressLat;
      const fortressLng = centerOverride?.fortressLng ?? state.fortressLng;

      const portalItems = sanitizeWorldItems(createPortalWorldItems(fortressLat, fortressLng, centerLat, centerLng));
      // Ưu tiên centerOverride để tránh stale closure state, đặc biệt khi vừa moveBoat
      const curLat = centerOverride?.lat ?? centerLat ?? state.fortressLat ?? 0;
      const curLng = centerOverride?.lng ?? centerLng ?? state.fortressLng ?? 0;

      // Primary: proximity-based world-items (DB-persisted, 5km radius)
      const worldData = await looterApi.fetchWorldItems(apiUrl, deviceId, centerLat, centerLng);
      if (worldData?.success) {
        const fetchedItems = sanitizeWorldItems(worldData.items)
          .filter(item => !consumedSpawnIdsRef.current.has(item.spawnId));

        const normalItems = fetchedItems
          .filter((item) => (item as any)?.item?.type !== 'portal')
          .sort((a, b) => {
            const ad = Math.pow(a.lat - curLat, 2) + Math.pow(a.lng - curLng, 2);
            const bd = Math.pow(b.lat - curLat, 2) + Math.pow(b.lng - curLng, 2);
            return ad - bd;
          })
          .slice(0, LOOT_RENDER_LIMIT);

        setWorldItems([...portalItems, ...normalItems]);
      }
    } catch (err) {
      console.error('[LooterGame] loadWorldItems error:', err);
    }
  }, [deviceId, apiUrl, state.fortressLat, state.fortressLng, state.currentLat, state.currentLng, setWorldItems, consumedSpawnIdsRef]);

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
        const isNearFortress = distToFortress <= FORTRESS_INTERACTION_METERS;

        // Chỉ set worldTier = -1 nếu state từ server KHÔNG có challenge đang chạy
        // Tránh ghi đè khi F5 reload lúc đang trong thử thách
        const savedHadChallenge = (s.worldTier ?? 0) > 0;
        const finalWorldTier = (isNearFortress && !isChallengeActive && !savedHadChallenge) ? -1 : s.worldTier;

        const shouldBeActive = !isNearFortress || (finalWorldTier ?? -1) > 0 || savedHadChallenge;

        setState({
          ...s,
          bags,
          worldTier: finalWorldTier,
        } as LooterGameState);

        if (data.settings) setGlobalSettings(data.settings);

        if (shouldBeActive && !isChallengeActive) {
          setIsChallengeActive(true);
        }

        void loadWorldItems(true, { lat: s.currentLat, lng: s.currentLng, fortressLat: s.fortressLat, fortressLng: s.fortressLng });
      }
    } catch (err) {
      console.error('[LooterGame] loadState error:', err);
    }
  }, [deviceId, apiUrl, setState, setGlobalSettings, setIsChallengeActive, saveBags, loadWorldItems]);

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
        setState(prev => ({ ...prev, worldTier: tier, looterGold: data.looterGold ?? prev.looterGold }));
        setIsChallengeActive(true);
        notify(`Đã chuyển sang Tier ${tier}`, 'success');
        setTimeout(() => loadWorldItems(true), 500);
      } else {
        setIsChallengeActive(false);
        notify(data?.error || 'Không thể bắt đầu thử thách', 'error');
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
          baseMaxHp: opponentHp || 100
      };

      const result = simulateCombat(playerA, playerB);

      // 3. Update Local State
      setState(prev => {
          let newInventory = [...prev.inventory];
          let hp = result.finalHpA;

          if (result.winner === 'A') {
              // Gained items. They go to staging or empty slots. CombatLootModal handles claiming.
          } else if (result.winner === 'B') {
              // Lost items. Remove them from inventory.
              const lostUids = result.droppedItems.map((i: any) => i.uid);
              newInventory = newInventory.filter(i => !lostUids.includes(i.uid));
              // Player respawns at fortress with full HP if they die
              if (hp <= 0) {
                  hp = 100;
              }
          }

          const nextState = { ...prev, inventory: newInventory, currentHp: hp };
          syncState(nextState);
          // Actual server save for inventory to prevent lost items from coming back
          if (saveInventory && result.winner === 'B') {
              saveInventory(newInventory);
          }
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
    setWorldItems(prev => sanitizeWorldItems(prev).filter(i => i.spawnId !== spawnId));
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
