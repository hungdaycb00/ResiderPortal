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
    setState(prev => {
        const next = { ...prev, inventory };
        syncState(next);
        return next;
    });
    return true;
  }, [deviceId, setState, syncState]);

  const saveBags = useCallback(async (bags: BagItem[]) => {
    if (!deviceId) return;
    setState(prev => {
        const next = { ...prev, bags };
        syncState(next);
        return next;
    });
  }, [deviceId, setState, syncState]);

  const saveStorage = useCallback(async (storage: LooterItem[]) => {
    if (!deviceId) return;
    setState(prev => {
        const next = { ...prev, storage };
        syncState(next);
        return next;
    });
  }, [deviceId, setState, syncState]);

  return useMemo(() => ({ saveInventory, saveBags, saveStorage, syncState }), [saveInventory, saveBags, saveStorage, syncState]);
}
