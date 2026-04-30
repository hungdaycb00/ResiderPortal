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


  const dropItem = useCallback(async (itemUid: string) => {
    if (!deviceId) return;
    const droppedItem = state.inventory.find(i => i.uid === itemUid);
    setState(prev => ({
      ...prev,
      inventory: prev.inventory.filter(i => i.uid !== itemUid)
    }));

    if (droppedItem) {
      setWorldItems(prev => [
        ...prev,
        {
          spawnId: `temp_${itemUid}_${Date.now()}`,
          lat: (state.currentLat || 0) + (Math.random() - 0.5) * 0.0004,
          lng: (state.currentLng || 0) + (Math.random() - 0.5) * 0.0004,
          item: droppedItem,
          minigameType: null as any
        }
      ]);
    }

    try {
      const data = await looterApi.dropItem(apiUrl, deviceId, itemUid);
      if (data.success) {
        notify('Đã ném vật phẩm ra biển', 'info');
        setTimeout(() => loadWorldItems(true), 500);
      }
    } catch (err) {
      console.error('[LooterGame] dropItem error:', err);
    }
  }, [deviceId, apiUrl, state.inventory, state.currentLat, state.currentLng, setState, setWorldItems, notify, loadWorldItems]);

  const pickupItem = useCallback(async (spawnId: string, gridX?: number, gridY?: number, force: boolean = false) => {
    if (!deviceId) return false;
    try {
      const data = await looterApi.pickupItem(apiUrl, deviceId, spawnId, force);
      if (data.success) {
        setWorldItems(prev => prev.filter(i => i.spawnId !== spawnId));
        if (data.type === 'item' || data.type === 'bag') {
          const item = data.item || data.bag;
          const activeBag = state.bags[0];
          let slot = (gridX !== undefined && gridY !== undefined) ? { x: gridX, y: gridY } : null;
          
          if (slot == null) {
            slot = findEmptySlotFor(item, state.inventory, activeBag);
          }

          const newItem = {
            ...item,
            gridX: slot ? slot.x : -1,
            gridY: slot ? slot.y : -1,
            stagingX: slot ? undefined : Math.random() * 200,
            stagingY: slot ? undefined : Math.random() * 300
          };

          setState(prev => ({
            ...prev,
            inventory: Array.isArray(data.inventory) ? data.inventory : [...prev.inventory, newItem],
            cursePercent: typeof data.cursePercent === 'number' ? data.cursePercent : prev.cursePercent
          }));

          if (slot == null) {
            notify(`Đã nhặt ${item.name} (Vào hàng chờ)`, 'info');
          } else {
            notify(`Đã nhặt ${item.name}`, 'success');
          }
        } else {
          setState(prev => ({ ...prev, cursePercent: data.cursePercent }));
        }
        return true;
      } else {
          // Handle error if success is false but request didn't throw
          if (data.error) notify(data.error, 'error');
          loadWorldItems(true);
          return false;
      }
    } catch (err: any) {
      console.error('[Looter Pickup]', err);
      notify(err.message || 'Lỗi khi nhặt vật phẩm', 'error');
      loadWorldItems(true);
      return false;
    }
  }, [deviceId, apiUrl, state.inventory, state.bags, setState, setWorldItems, notify, loadWorldItems]);

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

  const destroyItem = useCallback(async (spawnId: string) => {
    if (!deviceId) return false;
    setWorldItems(prev => prev.filter(i => i.spawnId !== spawnId));
    try {
      const data = await looterApi.destroyItem(apiUrl, deviceId, spawnId);
      return !!data.success;
    } catch (err) {
      console.error('[LooterGame] destroyItem error:', err);
      return false;
    }
  }, [deviceId, apiUrl, setWorldItems]);

  const confirmDiscard = useCallback(async () => {
    const stagingItems = state.inventory.filter(i => i.gridX < 0);
    for (const item of stagingItems) {
      await dropItem(item.uid);
    }
    notify(`Đã vứt bỏ ${stagingItems.length} vật phẩm thừa`, 'info');
  }, [state.inventory, dropItem, notify]);

  return { 
    saveInventory, saveBags, saveStorage, 
    dropItem, pickupItem, equipBag, 
    sellItems, storeItems, destroyItem, confirmDiscard 
  };
}
