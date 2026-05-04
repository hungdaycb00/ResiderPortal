import { useCallback, useMemo, useRef } from 'react';
import { looterApi } from '../services/looterApi';
import type { LooterGameState } from '../LooterGameContext';
import type { LooterItem, BagItem } from '../backpack/types';

interface UseLooterDataProps {
  deviceId: string | null;
  apiUrl: string;
  setState: React.Dispatch<React.SetStateAction<LooterGameState>>;
}

export function useLooterData({ deviceId, apiUrl, setState }: UseLooterDataProps) {
  
  const lastSyncTime = useRef(0);
  const syncTimeout = useRef<any>(null);

  const syncState = useCallback((latestState: LooterGameState) => {
    if (!deviceId) return;
    const now = Date.now();
    
    const executeSync = async (s: LooterGameState) => {
        try {
            await looterApi.syncState(apiUrl, deviceId, s);
        } catch(e) {
            console.error('[Looter] Sync error', e);
        }
    };

    if (now - lastSyncTime.current >= 1000) {
        lastSyncTime.current = now;
        executeSync(latestState);
        if (syncTimeout.current) {
            clearTimeout(syncTimeout.current);
            syncTimeout.current = null;
        }
    } else {
        if (!syncTimeout.current) {
            syncTimeout.current = setTimeout(() => {
                lastSyncTime.current = Date.now();
                executeSync(latestState); // this might be slightly stale if another call happens, but good enough
                syncTimeout.current = null;
            }, 1000 - (now - lastSyncTime.current));
        }
    }
  }, [deviceId, apiUrl]);

  const saveInventory = useCallback(async (inventory: LooterItem[]) => {
    if (!deviceId) return false;
    try {
      const result: any = await looterApi.saveInventory(apiUrl, deviceId, inventory);
      if (!result?.success) return false;
      setState(prev => ({ ...prev, inventory: Array.isArray(result.inventory) ? result.inventory : inventory }));
      return true;
    } catch (err) {
      console.error('[Looter] Save inventory error', err);
      return false;
    }
  }, [deviceId, apiUrl, setState]);

  const saveBags = useCallback(async (bags: BagItem[]) => {
    if (!deviceId) return;
    try {
      const result: any = await looterApi.saveBags(apiUrl, deviceId, bags);
      setState(prev => ({
        ...prev,
        bags: Array.isArray(result?.bags) ? result.bags : bags,
        inventory: Array.isArray(result?.inventory) ? result.inventory : prev.inventory,
      }));
    } catch (err) {
      console.error('[Looter] Save bags error', err);
    }
  }, [deviceId, apiUrl, setState]);

  const saveStorage = useCallback(async (storage: LooterItem[]) => {
    if (!deviceId) return;
    try {
      const result: any = await looterApi.saveStorageLayout(apiUrl, deviceId, storage);
      setState(prev => ({ ...prev, storage: Array.isArray(result?.storage) ? result.storage : storage }));
    } catch (err) {
      console.error('[Looter] Save storage error', err);
    }
  }, [deviceId, apiUrl, setState]);

  return useMemo(() => ({ saveInventory, saveBags, saveStorage, syncState }), [saveInventory, saveBags, saveStorage, syncState]);
}
