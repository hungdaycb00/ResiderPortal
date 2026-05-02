import { useCallback, useMemo } from 'react';
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
      gridX: currentBag?.gridX ?? Math.floor((10 - (newBagData.width || 4)) / 2),
      gridY: currentBag?.gridY ?? Math.floor((10 - (newBagData.height || 4)) / 2)
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
        uid: currentBag.uid || `bag_${Date.now()}`,
        id: currentBag.id || 'basic_bag',
        name: currentBag.name,
        icon: currentBag.icon,
        rarity: currentBag.rarity,
        type: 'bag',
        gridW: 1,
        gridH: 1,
        rotated: false,
        price: currentBag.price || 0,
        weight: currentBag.weight || 0,
        hpBonus: currentBag.hpBonus || 0,
        energyMax: currentBag.energyMax || 0,
        energyRegen: currentBag.energyRegen || 0,
        width: currentBag.width || 3,
        height: currentBag.height || 3,
        shape: currentBag.shape,
        gridX: -1, gridY: -1,
        stagingX: Math.random() * 200,
        stagingY: Math.random() * 300
      } as any;
      itemsToKeep.push(oldBagAsItem);
    }

    // Atomic update: set cả inventory + bags trong 1 setState duy nhất rồi sync.
    // KHÔNG gọi saveInventory + saveBags riêng lẻ vì chúng gọi setState độc lập
    // và ghi đè lẫn nhau (race condition).
    setState(prev => {
      const next = { ...prev, inventory: itemsToKeep, bags: [newBag] };
      // Fire-and-forget sync to server (Tạm thời vô hiệu hóa theo yêu cầu)
      /*
      if (deviceId) {
        looterApi.syncState(apiUrl, deviceId, next).catch(console.error);
      }
      */
      return next;
    });
    notify(`Đã trang bị ${newBag.name}`, 'success');
  }, [state.inventory, state.bags, setState, deviceId, apiUrl, notify]);

  const sellItems = useCallback(async (itemUids: string[]) => {
    if (!deviceId) return;
    setState(prev => {
        const itemsToSell = prev.inventory.filter(i => itemUids.includes(i.uid));
        const newInventory = prev.inventory.filter(i => !itemUids.includes(i.uid));
        const goldEarned = itemsToSell.reduce((sum, item) => sum + (item.price || 0), 0);
        
        const nextState = {
            ...prev,
            inventory: newInventory,
            looterGold: (prev.looterGold || 0) + goldEarned
        };
        saveInventory(newInventory); // Triggers sync
        return nextState;
    });
    notify(`Đã bán vật phẩm`, 'success');
  }, [deviceId, setState, saveInventory, notify]);

  const storeItems = useCallback(async (itemUids: string[], action: 'store' | 'retrieve', mode: string = 'fortress', gridX?: number, gridY?: number) => {
    if (!deviceId) return;
    setState(prev => {
        let newInventory = [...prev.inventory];
        let newStorage = [...prev.storage];

        if (action === 'store') {
            const itemsToStore = newInventory.filter(i => itemUids.includes(i.uid));
            newInventory = newInventory.filter(i => !itemUids.includes(i.uid));
            
            itemsToStore.forEach(item => {
                newStorage.push({ ...item, gridX: gridX ?? item.gridX, gridY: gridY ?? item.gridY });
            });
        } else {
            const itemsToRetrieve = newStorage.filter(i => itemUids.includes(i.uid));
            newStorage = newStorage.filter(i => !itemUids.includes(i.uid));
            
            itemsToRetrieve.forEach(item => {
                const currentBag = prev.bags[0];
                const slot = findEmptySlotFor(item, newInventory, currentBag);
                if (slot) {
                    newInventory.push({ ...item, gridX: slot.x, gridY: slot.y });
                } else {
                    newInventory.push({ ...item, gridX: -1, gridY: -1, stagingX: Math.random() * 200, stagingY: Math.random() * 300 } as any);
                }
            });
        }

        const nextState = { ...prev, inventory: newInventory, storage: newStorage };
        saveInventory(newInventory);
        saveStorage(newStorage);
        return nextState;
    });
    notify(action === 'store' ? 'Đã cất vật phẩm vào kho' : 'Đã lấy vật phẩm từ kho', 'success');
  }, [deviceId, setState, saveInventory, saveStorage, notify]);



  const pickupItem = useCallback(async (spawnId: string, directItem?: WorldItem) => {
    if (!deviceId) return;
    
    let pickedWorldItem: WorldItem | undefined = directItem;
    
    setWorldItems(prev => {
      if (!pickedWorldItem) {
        pickedWorldItem = prev.find(i => i.spawnId === spawnId);
      }
      return prev.filter(i => i.spawnId !== spawnId);
    });

    if (pickedWorldItem && pickedWorldItem.item) {
        const item = pickedWorldItem.item as LooterItem;
        setState(prevState => {
            const currentBag = prevState.bags[0];
            const slot = findEmptySlotFor(item, prevState.inventory, currentBag);
            let newItem: LooterItem;
            
            if (slot) {
                newItem = { ...item, gridX: slot.x, gridY: slot.y };
            } else {
                newItem = { 
                    ...item, 
                    gridX: -1, gridY: -1,
                    stagingX: Math.random() * 200, stagingY: Math.random() * 300 
                } as any;
            }

            const newInventory = [...prevState.inventory, newItem];
            saveInventory(newInventory).catch(console.error);

            setTimeout(() => {
                notify(slot ? `Nhặt được ${item.name}` : `Nhặt được ${item.name} nhưng balo đã đầy!`, slot ? 'success' : 'info');
            }, 0);

            return { ...prevState, inventory: newInventory };
        });
    }

  }, [deviceId, setWorldItems, setState, saveInventory, notify]);

  const dropItems = useCallback(async (itemUids: string[], lat: number, lng: number) => {
    if (!deviceId || itemUids.length === 0) return;
    
    setState(prev => {
      const droppedItems = prev.inventory.filter(i => itemUids.includes(i.uid));
      const newInventory = prev.inventory.filter(i => !itemUids.includes(i.uid));
      
      saveInventory(newInventory);
      
      // Add dropped items to world locally
      setWorldItems(wItems => {
        const newWorldItems = droppedItems.map((item, i) => ({
            spawnId: `dropped_${item.uid}_${Date.now()}_${i}`,
            lat: lat + (Math.random() - 0.5) * 0.0001,
            lng: lng + (Math.random() - 0.5) * 0.0001,
            item: item,
            isExpander: false,
            minigameType: null
        }));
        return [...wItems, ...newWorldItems];
      });

      return { ...prev, inventory: newInventory };
    });
    
    notify(`Đã ném ${itemUids.length} vật phẩm ra Map`, 'success');

  }, [deviceId, setState, setWorldItems, saveInventory, notify]);

  return useMemo(() => ({ 
    saveInventory, saveBags, saveStorage, 
    equipBag, sellItems, storeItems, pickupItem, dropItems
  }), [
    saveInventory, saveBags, saveStorage, 
    equipBag, sellItems, storeItems, pickupItem, dropItems
  ]);
}
