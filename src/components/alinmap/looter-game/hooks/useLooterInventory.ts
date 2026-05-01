import { useCallback } from 'react';
import { looterApi } from '../services/looterApi';
import { findEmptySlotFor } from '../utils/looterHelpers';
import { repairBagData, createStarterBag } from '../backpack/utils';
import type { LooterGameState, WorldItem } from '../LooterGameContext';
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
  saveStorage
}: UseLooterInventoryProps) {




  const equipBag = useCallback(async (itemUid: string) => {
    const itemToEquip = state.inventory.find(i => i.uid === itemUid);
    if (!itemToEquip || itemToEquip.type !== 'bag') {
      notify('Vật phẩm này không phải là Balo', 'error');
      return;
    }

    const currentBag = state.bags[0];
    const newBagData = (itemToEquip as any).bagData || itemToEquip;
    const newBag: BagItem = {
      uid: itemToEquip.uid,
      name: itemToEquip.name,
      icon: itemToEquip.icon,
      rarity: itemToEquip.rarity,
      width: newBagData.width || 4,
      height: newBagData.height || 4,
      shape: newBagData.shape || Array.from({ length: 4 }, () => Array(4).fill(true)),
      gridX: currentBag.gridX,
      gridY: currentBag.gridY
    };

    const itemsToKeep: LooterItem[] = [];
    const oldItems = state.inventory.filter(i => i.uid !== itemUid);

    for (const item of oldItems) {
      if (item.gridX < 0) {
        itemsToKeep.push(item);
        continue;
      }
      const canFit = (
        item.gridX >= newBag.gridX &&
        item.gridX + (item.gridW || 1) <= newBag.gridX + newBag.width &&
        item.gridY >= newBag.gridY &&
        item.gridY + (item.gridH || 1) <= newBag.gridY + newBag.height
      );
      if (canFit) {
        itemsToKeep.push(item);
      } else {
        itemsToKeep.push({
          ...item,
          gridX: -1, gridY: -1,
          stagingX: Math.random() * 200,
          stagingY: Math.random() * 300
        });
      }
    }

    if (currentBag) {
      const oldBagAsItem: LooterItem = {
        uid: `bag_${Date.now()}`,
        id: 'looter_bag',
        name: currentBag.name,
        icon: currentBag.icon,
        rarity: currentBag.rarity,
        type: 'bag',
        gridX: -1, gridY: -1,
        stagingX: Math.random() * 200,
        stagingY: Math.random() * 300
      } as any;
      itemsToKeep.push(oldBagAsItem);
    }

    await saveInventory(itemsToKeep);
    await saveBags([newBag]);
    notify(`Đã trang bị ${newBag.name}`, 'success');
  }, [state.inventory, state.bags, saveInventory, saveBags, notify]);

  const sellItems = useCallback(async (itemUids: string[]) => {
    if (!deviceId) return;
    try {
      const data = await looterApi.sellItems(apiUrl, deviceId, itemUids);
      if (data.success) {
        notify(`Đã bán vật phẩm, thu về ${data.goldEarned} vàng`, 'success');
        // loadState() should be called by the orchestrator
      }
    } catch (err) {
      console.error('[LooterGame] sellItems error:', err);
    }
  }, [deviceId, apiUrl, notify]);

  const storeItems = useCallback(async (itemUids: string[], action: 'store' | 'retrieve', mode: string = 'fortress', gridX?: number, gridY?: number) => {
    if (!deviceId) return;
    try {
      const data = await looterApi.storeItems(apiUrl, deviceId, itemUids, action, mode, gridX, gridY);
      if (data.success) {
        notify(action === 'store' ? 'Đã cất vật phẩm vào kho' : 'Đã lấy vật phẩm từ kho', 'success');
        // loadState() should be called by the orchestrator
      }
    } catch (err) {
      console.error('[LooterGame] storeItems error:', err);
    }
  }, [deviceId, apiUrl, notify]);



  const pickupItem = useCallback(async (spawnId: string) => {
    if (!deviceId) return;
    const startTime = Date.now();
    console.log(`[LooterPerf] API pickupItem started for ${spawnId} at ${startTime}`);
    try {
      const data = await looterApi.pickupItem(apiUrl, deviceId, spawnId, true);
      const endTime = Date.now();
      console.log(`[LooterPerf] API pickupItem completed for ${spawnId} in ${endTime - startTime}ms`);
      
      if (data.success && data.item) {
        const item = data.item as LooterItem;
        const currentBag = state.bags[0];
        
        const slot = findEmptySlotFor(item, state.inventory, currentBag);
        let newItem: LooterItem;
        
        if (slot) {
          newItem = { ...item, gridX: slot.x, gridY: slot.y };
          notify(`Nhặt được ${item.name}`, 'success');
        } else {
          newItem = { 
            ...item, 
            gridX: -1, 
            gridY: -1,
            stagingX: Math.random() * 200,
            stagingY: Math.random() * 300 
          } as any;
          notify(`Nhặt được ${item.name} nhưng balo đã đầy!`, 'info');
        }

        const newInventory = [...state.inventory, newItem];
        setState(prev => ({ ...prev, inventory: newInventory }));
        setWorldItems(prev => prev.filter(i => i.spawnId !== spawnId));
        await saveInventory(newInventory);
      }
    } catch (err) {
      const endTime = Date.now();
      console.error(`[LooterPerf] API pickupItem FAILED for ${spawnId} after ${endTime - startTime}ms`, err);
    }
  }, [deviceId, apiUrl, state.inventory, state.bags, setState, setWorldItems, saveInventory, notify]);

  return { 
    saveInventory, saveBags, saveStorage, 
    equipBag, sellItems, storeItems, pickupItem
  };
}
