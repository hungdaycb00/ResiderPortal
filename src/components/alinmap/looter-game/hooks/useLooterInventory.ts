import { useCallback, useMemo, useRef } from 'react';
import { looterApi } from '../services/looterApi';
import { sanitizeWorldItems } from '../LooterGameContext';
import { equipBag as doEquipBag, pickupItem as doPickupItem, dropItems as doDropItems, dropCombatLoot as doDropCombatLoot } from './inventoryActions';
import type { LooterChunkCacheEntry, LooterGameState, WorldItem } from '../LooterGameContext';
import type { LooterItem, BagItem } from '../backpack/types';

interface UseLooterInventoryProps {
  deviceId: string | null;
  apiUrl: string;
  state: LooterGameState;
  setState: React.Dispatch<React.SetStateAction<LooterGameState>>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  setWorldItems: React.Dispatch<React.SetStateAction<WorldItem[]>>;
  loadWorldItems: (force?: boolean) => Promise<void>;
  saveInventory: (inventory: LooterItem[]) => Promise<boolean>;
  saveBags: (bags: BagItem[]) => Promise<void>;
  saveStorage: (storage: LooterItem[]) => Promise<void>;
  openBackpack?: () => void;
  chunkCacheRef: React.MutableRefObject<Map<string, LooterChunkCacheEntry>>;
  consumedSpawnIdsRef: React.MutableRefObject<Set<string>>;
}

export function useLooterInventory({
  deviceId,
  apiUrl,
  state,
  setState,
  notify,
  setWorldItems,
  loadWorldItems,
  saveInventory,
  saveBags,
  saveStorage,
  openBackpack,
  chunkCacheRef,
  consumedSpawnIdsRef
}: UseLooterInventoryProps) {

  const lastPickupTimeRef = useRef(0);

  const equipBag = useCallback(async (itemUid: string) => {
    await doEquipBag(itemUid, { state, setState, saveInventory, saveBags, notify });
  }, [state, setState, saveInventory, saveBags, notify]);

  const sellItems = useCallback(async (itemUids: string[]) => {
    if (!deviceId) return;
    try {
      const result: any = await looterApi.sellItems(apiUrl, deviceId, itemUids);
      if (!result?.success) {
        notify(result?.error || 'Khong the ban vat pham', 'error');
        return;
      }

      setState(prev => ({
        ...prev,
        inventory: Array.isArray(result.inventory) ? result.inventory : prev.inventory,
        looterGold: result.looterGold ?? prev.looterGold,
      }));
    } catch (err) {
      console.error('[LooterGame] sell item error:', err);
      notify('Khong the xac thuc ban vat pham voi server', 'error');
      return;
    }
    notify(`Đã bán vật phẩm`, 'success');
  }, [deviceId, apiUrl, setState, notify]);

  const storeItems = useCallback(async (itemUids: string[], action: 'store' | 'retrieve', mode: string = 'fortress', gridX?: number, gridY?: number) => {
    if (!deviceId) return;

    try {
      const result: any = await looterApi.storeItems(apiUrl, deviceId, itemUids, action, mode, gridX, gridY);
      if (!result?.success) {
        notify(result?.error || 'Khong the cap nhat kho', 'error');
        return;
      }

      // Khi mode='portal', đồng bộ portalStorage với storage từ server
      // vì server chỉ có 1 storage, client tách 2 view (fortress vs portal)
      setState(prev => ({
        ...prev,
        inventory: Array.isArray(result.inventory) ? result.inventory : prev.inventory,
        storage: Array.isArray(result.storage) ? result.storage : prev.storage,
        portalStorage: mode === 'portal' && Array.isArray(result.storage) ? result.storage : prev.portalStorage,
        looterGold: result.looterGold ?? prev.looterGold,
      }));
      notify(action === 'store' ? 'Da cat vat pham vao kho' : 'Da lay vat pham tu kho', 'success');
      return;
    } catch (err) {
      console.error('[LooterGame] store item error:', err);
      notify('Khong the xac thuc kho voi server', 'error');
    }
  }, [deviceId, apiUrl, setState, notify]);



  const pickupItem = useCallback(async (spawnId: string, directItem?: WorldItem, currentLat?: number, currentLng?: number) => {
    await doPickupItem(spawnId, directItem, currentLat, currentLng, {
      deviceId, apiUrl, state, setState, setWorldItems, saveInventory, saveStorage, notify,
      chunkCacheRef, consumedSpawnIdsRef, openBackpack, lastPickupTimeRef
    });
  }, [deviceId, apiUrl, state, setState, setWorldItems, saveInventory, saveStorage, notify, chunkCacheRef, consumedSpawnIdsRef, openBackpack]);

  const dropDeps = { deviceId, apiUrl, state, setState, setWorldItems, saveInventory, notify, chunkCacheRef, openBackpack };

  const dropItems = useCallback(async (itemUids: string[], lat: number, lng: number) => {
    await doDropItems(itemUids, lat, lng, dropDeps);
  }, [deviceId, apiUrl, state, setState, setWorldItems, saveInventory, notify, chunkCacheRef, openBackpack]);

  const dropCombatLoot = useCallback(async (items: LooterItem[]) => {
    await doDropCombatLoot(items, dropDeps);
  }, [deviceId, apiUrl, state, setState, setWorldItems, saveInventory, notify, chunkCacheRef, openBackpack]);

  return useMemo(() => ({ 
    saveInventory, saveBags, saveStorage, 
    equipBag, sellItems, storeItems, pickupItem, dropItems, dropCombatLoot
  }), [
    saveInventory, saveBags, saveStorage, 
    equipBag, sellItems, storeItems, pickupItem, dropItems, dropCombatLoot
  ]);
}
