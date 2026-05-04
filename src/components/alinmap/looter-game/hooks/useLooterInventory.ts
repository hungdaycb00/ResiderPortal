import { useCallback, useMemo } from 'react';
import { looterApi } from '../services/looterApi';
import { findEmptySlotFor } from '../utils/looterHelpers';
import { repairBagData, createStarterBag } from '../backpack/utils';
import { BAG_DEFAULTS } from '../backpack/constants';
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
    const bagId = itemToEquip.id || 'basic_bag';
    const bagDef = BAG_DEFAULTS[bagId];
    const bagW = newBagData.width || bagDef?.width || 4;
    const bagH = newBagData.height || bagDef?.height || 4;
    
    // Shape priority: item data > BAG_DEFAULTS > full rectangle fallback
    let bagShape = newBagData.shape;
    if (!bagShape && bagDef?.shape) {
      bagShape = (bagDef.shape as any[]).map((row: any[]) => row.map((v: any) => !!v));
    }
    if (!bagShape) {
      bagShape = Array.from({ length: bagH }, () => Array(bagW).fill(true));
    }

    const newBag: BagItem = {
      uid: itemToEquip.uid,
      id: bagId,
      type: 'bag',
      name: itemToEquip.name,
      icon: itemToEquip.icon,
      rarity: itemToEquip.rarity,
      width: bagW,
      height: bagH,
      shape: bagShape,
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
        hpBonus: currentBag.hpBonus,
        energyMax: currentBag.energyMax,
        energyRegen: currentBag.energyRegen,
        width: currentBag.width || 3,
        height: currentBag.height || 3,
        shape: currentBag.shape,
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
    
    let success = false;
    setState(prev => {
        let newInventory = [...prev.inventory];
        let newStorage = [...prev.storage];

        if (action === 'store') {
            const itemsToStore = newInventory.filter(i => itemUids.includes(i.uid));
            newInventory = newInventory.filter(i => !itemUids.includes(i.uid));
            
            itemsToStore.forEach(item => {
                // Reset coords to -1 so buildPlacedStorage can find a new spot
                newStorage.push({ ...item, gridX: gridX ?? -1, gridY: gridY ?? -1 });
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
        // Sync once with full state
        looterApi.syncState(apiUrl, deviceId, nextState).catch(console.error);
        success = true;
        return nextState;
    });

    if (success) {
      notify(action === 'store' ? 'Đã cất vật phẩm vào kho' : 'Đã lấy vật phẩm từ kho', 'success');
    }
  }, [deviceId, apiUrl, setState, notify]);



  const pickupItem = useCallback(async (spawnId: string, directItem?: WorldItem) => {
    if (!deviceId) return;
    
    // Tìm vật phẩm ngay lập tức từ tham số hoặc từ state hiện tại (để tránh race condition)
    let pickedWorldItem = directItem;
    
    if (!pickedWorldItem) {
        // Tìm thủ công trong mảng worldItems hiện tại (lấy từ closure hoặc ref nếu cần, nhưng ở đây dùng logic find trực tiếp)
        // Lưu ý: setWorldItems(prev => ...) là cách duy nhất để lấy 'prev' mới nhất nếu không dùng Ref.
        // Tuy nhiên, vì ta muốn dùng item đó NGAY LẬP TỨC để update inventory, ta nên tìm nó trước.
        setWorldItems(prev => {
            pickedWorldItem = prev.find(i => i.spawnId === spawnId);
            return prev.filter(i => i.spawnId !== spawnId);
        });
    } else {
        // Nếu đã có directItem, chỉ cần xóa khỏi map
        setWorldItems(prev => prev.filter(i => i.spawnId !== spawnId));
    }

    // Đợi 1 tick nhỏ để đảm bảo pickedWorldItem được gán (nếu tìm từ setWorldItems)
    // Hoặc tốt nhất là tìm TRƯỚC khi gọi setWorldItems nếu không có directItem.
    // Thực tế, trong PickupMinigame ta sẽ truyền directItem vào, nên logic này sẽ chạy mượt.
    
    const processPickup = (itemToPick: WorldItem) => {
        if (!itemToPick.item) return;
        const looterItem = itemToPick.item as LooterItem;
        
        setState(prevState => {
            const currentBag = prevState.bags[0];
            const slot = findEmptySlotFor(looterItem, prevState.inventory, currentBag);
            
            let newItem: LooterItem;
            if (slot) {
                newItem = { ...looterItem, gridX: slot.x, gridY: slot.y };
            } else {
                newItem = { 
                    ...looterItem, 
                    gridX: -1, gridY: -1,
                    stagingX: Math.random() * 200, stagingY: Math.random() * 300 
                } as any;
            }

            const newInventory = [...prevState.inventory, newItem];
            const nextState = { ...prevState, inventory: newInventory };

            // Đồng bộ trực tiếp lên server offline thay vì qua hook trung gian gây double-render (giật lag)
            setTimeout(() => {
                looterApi.syncState(apiUrl, deviceId, nextState).catch(console.error);
                notify(slot ? `Nhặt được ${looterItem.name}` : `Nhặt được ${looterItem.name} nhưng balo đã đầy!`, slot ? 'success' : 'info');
            }, 0);

            return nextState;
        });
    };

    if (pickedWorldItem) {
        processPickup(pickedWorldItem);
    } else {
        // Fallback nếu vẫn chưa tìm thấy (do race condition của setWorldItems)
        // Ta sẽ dùng giải pháp an toàn: tìm trong state hiện tại nếu có thể truy cập
        // Ở đây ta dùng closure 'state' từ hook, nhưng nó có thể cũ.
        // Giải pháp tốt nhất là PickupMinigame luôn truyền directItem.
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

  const dropCombatLoot = useCallback(async (items: LooterItem[]) => {
    if (!deviceId || items.length === 0) return;
    
    // 1. Tạm thời thêm items vào inventory (ở vị trí -1, -1)
    const itemsWithStaging = items.map(item => ({
      ...item,
      gridX: -1, gridY: -1,
      stagingX: Math.random() * 200,
      stagingY: Math.random() * 300
    }));

    const newInventory = [...state.inventory, ...itemsWithStaging];
    const itemUids = items.map(i => i.uid);

    // 2. Lưu inventory mới lên server
    const success = await saveInventory(newInventory);
    if (!success) {
      notify('Lỗi khi chuẩn bị rơi đồ!', 'error');
      return;
    }

    // 3. Thực hiện rơi đồ ra Map tại vị trí hiện tại của thuyền
    await dropItems(itemUids, state.currentLat || 0, state.currentLng || 0);
  }, [deviceId, state.inventory, state.currentLat, state.currentLng, saveInventory, dropItems, notify]);

  return useMemo(() => ({ 
    saveInventory, saveBags, saveStorage, 
    equipBag, sellItems, storeItems, pickupItem, dropItems, dropCombatLoot
  }), [
    saveInventory, saveBags, saveStorage, 
    equipBag, sellItems, storeItems, pickupItem, dropItems, dropCombatLoot
  ]);
}
