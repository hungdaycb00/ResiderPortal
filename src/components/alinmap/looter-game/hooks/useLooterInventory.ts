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



  const pickupItem = useCallback(async (spawnId: string, directItem?: WorldItem) => {
    if (!deviceId) return;
    const startTime = Date.now();
    console.log(`[LooterPerf] Optimistic pickupItem started for ${spawnId} at ${startTime}`, directItem ? '(with direct item)' : '(search in state)');
    
    // 1. Optimistic Update
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
            
            // Background save
            saveInventory(newInventory).catch(console.error);

            setTimeout(() => {
                notify(slot ? `Nhặt được ${item.name}` : `Nhặt được ${item.name} nhưng balo đã đầy!`, slot ? 'success' : 'info');
            }, 0);

            return { ...prevState, inventory: newInventory };
        });
    }

    // 2. Fire and forget API call
    looterApi.pickupItem(apiUrl, deviceId, spawnId, true).then(data => {
        const endTime = Date.now();
        console.log(`[LooterPerf] API pickupItem (background) completed for ${spawnId} in ${endTime - startTime}ms`);
        
        if (!data.success) {
            // Nếu Server từ chối, thông báo lỗi và yêu cầu đồng bộ lại dữ liệu thực tế
            notify(data.error || 'Không thể nhặt vật phẩm này', 'error');
            // Trigger loadState để sửa lại inventory lạc quan
            setTimeout(() => {
                // Chúng ta không có loadState trực tiếp ở đây, 
                // nhưng heartbeat tiếp theo sẽ sửa nó, hoặc ta có thể gọi loadWorldItems
                loadWorldItems(true);
            }, 500);
            return;
        }

        // Fallback: If we didn't have it optimistically (e.g. state was really stale), add it now
        if (!pickedWorldItem && data.item) {
            const item = data.item as LooterItem;
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
    }).catch(err => {
        const endTime = Date.now();
        console.error(`[LooterPerf] API pickupItem (background) FAILED for ${spawnId} after ${endTime - startTime}ms`, err);
        notify('Lỗi kết nối khi nhặt đồ', 'error');
    });

  }, [deviceId, apiUrl, setState, setWorldItems, saveInventory, notify]);

  const dropItems = useCallback(async (itemUids: string[], lat: number, lng: number) => {
    if (!deviceId || itemUids.length === 0) return;
    
    let previousInventory: LooterItem[] = [];
    setState(prev => {
      previousInventory = prev.inventory;
      const newInventory = prev.inventory.filter(i => !itemUids.includes(i.uid));
      return { ...prev, inventory: newInventory };
    });

    try {
      const data = await looterApi.dropItems(apiUrl, deviceId, itemUids, lat, lng);
      if (data.success) {
        notify(`Đã ném ${itemUids.length} vật phẩm ra Map`, 'success');
        loadWorldItems(true);
      } else {
        throw new Error('Drop failed');
      }
    } catch (err) {
      console.error('[LooterGame] dropItems error:', err);
      notify('Không thể ném vật phẩm lúc này', 'error');
      setState(prev => ({ ...prev, inventory: previousInventory }));
    }
  }, [deviceId, apiUrl, setState, notify, loadWorldItems]);

  return { 
    saveInventory, saveBags, saveStorage, 
    equipBag, sellItems, storeItems, pickupItem, dropItems
  };
}
