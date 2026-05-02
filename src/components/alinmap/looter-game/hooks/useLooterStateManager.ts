import { useCallback } from 'react';
import { looterApi } from '../services/looterApi';
import { createPortalWorldItems } from '../utils/looterHelpers';
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
  saveBags: (bags: BagItem[]) => Promise<void>;
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
  saveBags,
  isChallengeActive
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
        const shouldBeActive = distToFortress > FORTRESS_INTERACTION_METERS || (s.worldTier ?? 0) > 0 || (s.inventory && s.inventory.length > 0);
        
        // Chỉ tự động set TRUE nếu thỏa mãn điều kiện active.
        // KHÔNG tự động set FALSE ở đây để tránh đè lên trạng thái người dùng vừa chọn Tier 0.
        if (shouldBeActive) {
          setIsChallengeActive(true);
        }
      }
    } catch (err) {
      console.error('[LooterGame] loadState error:', err);
    }
  }, [deviceId, apiUrl, setState, setGlobalSettings, setIsChallengeActive, saveBags, isChallengeActive]);

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
      const data = await looterApi.executeCombat(apiUrl, deviceId, opponentId, opponentInventory, opponentHp, opponentBags);
      if (data.success) {
        return data.result;
      }
      throw new Error(data.error || 'Combat failed');
    } catch (err) {
      console.error('[LooterGame] executeCombat error:', err);
      throw err;
    }
  }, [deviceId, apiUrl]);

  const curseChoice = useCallback(async (choice: 'flee' | 'challenge') => {
    if (!deviceId) return;
    try {
      const data = await looterApi.curseChoice(apiUrl, deviceId, choice);
      if (data.success) {
        if (choice === 'flee') notify('Bạn đã bỏ trốn thành công', 'info');
        await loadState();
      }
    } catch (err) {
      console.error('[LooterGame] curseChoice error:', err);
    }
  }, [deviceId, apiUrl, loadState, notify]);

  const inflictMinigamePenalty = useCallback(async (spawnId: string) => {
    if (!deviceId) return false;
    setWorldItems(prev => prev.filter(i => i.spawnId !== spawnId));
    try {
      const data = await looterApi.minigameLose(apiUrl, deviceId, spawnId);
      if (data.success) {
        setState(prev => ({ ...prev, cursePercent: data.cursePercent }));
        return true;
      }
      return false;
    } catch (err) {
      console.error('[LooterGame] minigamePenalty error:', err);
      return false;
    }
  }, [deviceId, apiUrl, setState, setWorldItems]);

  return { 
    loadWorldItems, loadState, initGame, 
    setWorldTier, inflictMinigamePenalty, 
    executeCombat, curseChoice 
  };
}
