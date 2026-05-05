import { useCallback, useMemo, useRef } from 'react';
import { looterApi } from '../services/looterApi';
import { chunkKey, createPortalWorldItems, getActiveChunkKeys, getChunkCoords } from '../utils/looterHelpers';
import { simulateCombat } from '../engine/combat';
import { repairBagData, createStarterBag, getDistanceMeters } from '../backpack/utils';
import { FORTRESS_INTERACTION_METERS } from '../LooterGameContext';
import type { LooterChunkCacheEntry, LooterGameState, WorldItem, LooterItem, BagItem } from '../LooterGameContext';

const LOOT_RENDER_LIMIT = 5;

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
  chunkCacheRef: React.MutableRefObject<Map<string, LooterChunkCacheEntry>>;
  consumedSpawnIdsRef: React.MutableRefObject<Set<string>>;
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
  consumedSpawnIdsRef
}: UseLooterStateManagerProps) {
  const chunkBackoffUntilRef = useRef(0);
  const chunkRequestRef = useRef<Promise<any> | null>(null);
  const chunkRequestKeyRef = useRef('');

  const loadWorldItems = useCallback(async (forceActive?: boolean, centerOverride?: { lat: number; lng: number }) => {
    if (!deviceId) return;
    try {
      const radius = 4;
      const now = Date.now();
      const cacheTtlMs = forceActive ? 0 : 90_000;
      const maxCacheEntries = 80;
      const centerLat = centerOverride?.lat ?? state.currentLat;
      const centerLng = centerOverride?.lng ?? state.currentLng;
      const centerChunk = getChunkCoords(
        centerLat,
        centerLng,
        state.fortressLat,
        state.fortressLng
      );
      const chunkKeys = getActiveChunkKeys(centerChunk, radius);
      const cache = chunkCacheRef.current;
      const missingKeys = chunkKeys.filter((key) => {
        const cached = cache.get(key);
        return !cached || now - cached.touchedAt > cacheTtlMs;
      });

      if (missingKeys.length > 0 && now >= chunkBackoffUntilRef.current) {
        let data: any = null;
        try {
          const requestKey = missingKeys.join(',');
          if (!chunkRequestRef.current || chunkRequestKeyRef.current !== requestKey) {
            chunkRequestKeyRef.current = requestKey;
            chunkRequestRef.current = looterApi.fetchChunks(apiUrl, deviceId, missingKeys)
              .finally(() => {
                chunkRequestRef.current = null;
                chunkRequestKeyRef.current = '';
              });
          }
          data = await chunkRequestRef.current;
        } catch (chunkErr) {
          console.warn('[LooterGame] chunk fetch failed, using cache if available:', chunkErr);
        }
        if (data?.success) {
          const fetchedItems: WorldItem[] = Array.isArray(data.items) ? data.items : [];
          const fetchedByChunk = new Map<string, WorldItem[]>();

          for (const item of fetchedItems) {
            if (item.chunkX == null || item.chunkY == null) continue;
            const key = chunkKey(item.chunkX, item.chunkY);
            if (!fetchedByChunk.has(key)) fetchedByChunk.set(key, []);
            fetchedByChunk.get(key)!.push(item);
          }

          for (const key of missingKeys) {
            const [chunkXRaw, chunkYRaw] = key.split(':');
            const chunkX = Number(chunkXRaw);
            const chunkY = Number(chunkYRaw);
            cache.set(key, {
              key,
              chunkX,
              chunkY,
              items: (fetchedByChunk.get(key) || []).filter(item => !consumedSpawnIdsRef.current.has(item.spawnId)),
              touchedAt: now,
            });
          }
        } else if (data?.rateLimited) {
          chunkBackoffUntilRef.current = Date.now() + Math.max(1000, Number(data.retryAfter || 1500));
        } else if (cache.size === 0) {
          const fallback = await looterApi.fetchWorldItems(apiUrl, deviceId);
          if (fallback.success) {
            const portalItems = createPortalWorldItems(state.fortressLat, state.fortressLng, centerLat, centerLng);
            const mapItems: WorldItem[] = Array.isArray(fallback.items) ? fallback.items : [];
            const curLat = centerLat ?? state.fortressLat ?? 0;
            const curLng = centerLng ?? state.fortressLng ?? 0;
            const normalItems = mapItems
              .filter((item) => (item as any)?.item?.type !== 'portal')
              .sort((a, b) => {
                const ad = Math.pow(a.lat - curLat, 2) + Math.pow(a.lng - curLng, 2);
                const bd = Math.pow(b.lat - curLat, 2) + Math.pow(b.lng - curLng, 2);
                return ad - bd;
              })
              .slice(0, LOOT_RENDER_LIMIT);
            setWorldItems([...portalItems, ...normalItems]);
          }
          return;
        }
      }

      for (const key of chunkKeys) {
        const cached = cache.get(key);
        if (cached) cached.touchedAt = now;
      }

      if (cache.size > maxCacheEntries) {
        const entries = Array.from(cache.entries()).sort((a, b) => b[1].touchedAt - a[1].touchedAt);
        for (const [key] of entries.slice(maxCacheEntries)) cache.delete(key);
      }

      const portalItems = createPortalWorldItems(state.fortressLat, state.fortressLng, centerLat, centerLng);
      const curLat = centerLat ?? state.fortressLat ?? 0;
      const curLng = centerLng ?? state.fortressLng ?? 0;
      const normalItems = chunkKeys
        .flatMap(key => cache.get(key)?.items || [])
        .filter((item) => !consumedSpawnIdsRef.current.has(item.spawnId) && (item as any)?.item?.type !== 'portal')
        .sort((a, b) => {
          const ad = Math.pow(a.lat - curLat, 2) + Math.pow(a.lng - curLng, 2);
          const bd = Math.pow(b.lat - curLat, 2) + Math.pow(b.lng - curLng, 2);
          return ad - bd;
        })
        .slice(0, LOOT_RENDER_LIMIT);

      let items = [...portalItems, ...normalItems];
      if (!forceActive && !isChallengeActive) {
        items = [...portalItems, ...normalItems];
      }
      setWorldItems(items);

      if (normalItems.length < 2) {
        try {
          const fallback = await looterApi.fetchWorldItems(apiUrl, deviceId);
          if (fallback.success) {
            const fallbackItems: WorldItem[] = Array.isArray(fallback.items) ? fallback.items : [];
            const merged = new Map<string, WorldItem>();
            for (const item of [...portalItems, ...normalItems, ...fallbackItems]) {
              if (!item?.spawnId) continue;
              if (consumedSpawnIdsRef.current.has(item.spawnId)) continue;
              if ((item as any)?.item?.type === 'portal' && merged.has(item.spawnId)) continue;
              merged.set(item.spawnId, item);
            }
            setWorldItems(Array.from(merged.values()));
          }
        } catch (fallbackErr) {
          console.warn('[LooterGame] world-items fallback failed:', fallbackErr);
        }
      }
    } catch (err) {
      console.error('[LooterGame] loadWorldItems error:', err);
    }
  }, [deviceId, apiUrl, state.fortressLat, state.fortressLng, state.currentLat, state.currentLng, isChallengeActive, setWorldItems, chunkCacheRef, consumedSpawnIdsRef]);

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
        
        // Trả về đúng logic gốc: worldTier lấy từ server, chỉ update -1 nếu đang ở gần và chưa active
        const finalWorldTier = (isNearFortress && !isChallengeActive) ? -1 : s.worldTier;

        const shouldBeActive = !isNearFortress || (finalWorldTier ?? -1) > 0;

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
