import { useCallback } from 'react';
import { looterApi } from '../services/looterApi';
import type { LooterGameState } from '../LooterGameContext';
import type { LooterItem, BagItem } from '../backpack/types';

interface UseLooterDataProps {
  deviceId: string | null;
  apiUrl: string;
  setState: React.Dispatch<React.SetStateAction<LooterGameState>>;
}

export function useLooterData({ deviceId, apiUrl, setState }: UseLooterDataProps) {
  
  const saveInventory = useCallback(async (inventory: LooterItem[]) => {
    if (!deviceId) return false;
    
    let previousInventory: LooterItem[] = [];
    setState(prev => {
      previousInventory = prev.inventory;
      return { ...prev, inventory };
    });

    try {
      const data = await looterApi.saveInventory(apiUrl, deviceId, inventory);
      if (!data.success) throw new Error('Save failed');
      return true;
    } catch (err) {
      console.error('[LooterGame] saveInventory error:', err);
      // Rollback on failure
      setState(prev => ({ ...prev, inventory: previousInventory }));
      return false;
    }
  }, [deviceId, apiUrl, setState]);

  const saveBags = useCallback(async (bags: BagItem[]) => {
    if (!deviceId) return;
    let previousBags: BagItem[] = [];
    setState(prev => {
      previousBags = prev.bags;
      return { ...prev, bags };
    });
    try {
      await looterApi.saveBags(apiUrl, deviceId, bags);
    } catch (err) {
      console.error('[LooterGame] saveBags error:', err);
      setState(prev => ({ ...prev, bags: previousBags }));
    }
  }, [deviceId, apiUrl, setState]);

  const saveStorage = useCallback(async (storage: LooterItem[]) => {
    if (!deviceId) return;
    let previousStorage: LooterItem[] = [];
    setState(prev => {
      previousStorage = prev.storage;
      return { ...prev, storage };
    });
    try {
      await looterApi.saveStorageLayout(apiUrl, deviceId, storage);
    } catch (err) {
      console.error('[LooterGame] saveStorage error:', err);
      setState(prev => ({ ...prev, storage: previousStorage }));
    }
  }, [deviceId, apiUrl, setState]);

  return { saveInventory, saveBags, saveStorage };
}
