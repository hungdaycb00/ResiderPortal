import { useCallback, useMemo } from 'react';

import { findEmptySlotFor } from '../utils/looterHelpers';
import { looterApi } from '../services/looterApi';
import { repairBagData, createStarterBag } from '../backpack/utils';
import { BAG_DEFAULTS } from '../backpack/constants';
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
  chunkCacheRef,
  consumedSpawnIdsRef
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

      setState(prev => ({
        ...prev,
        inventory: Array.isArray(result.inventory) ? result.inventory : prev.inventory,
        storage: Array.isArray(result.storage) ? result.storage : prev.storage,
        looterGold: result.looterGold ?? prev.looterGold,
      }));
      notify(action === 'store' ? 'Da cat vat pham vao kho' : 'Da lay vat pham tu kho', 'success');
      return;
    } catch (err) {
      console.error('[LooterGame] store item error:', err);
      notify('Khong the xac thuc kho voi server', 'error');
      return;
    }
    
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
        // Dùng saveInventory để đi qua debounce, tránh spam 429
        saveInventory(newInventory);
        saveStorage(newStorage);
        success = true;
        return nextState;
    });

    if (success) {
      notify(action === 'store' ? 'Đã cất vật phẩm vào kho' : 'Đã lấy vật phẩm từ kho', 'success');
    }
  }, [deviceId, apiUrl, setState, notify]);



  const pickupItem = useCallback(async (spawnId: string, directItem?: WorldItem, currentLat?: number, currentLng?: number) => {
    if (!deviceId) return;
    
    // Tìm vật phẩm ngay lập tức từ tham số hoặc từ state hiện tại (để tránh race condition)
    let pickedWorldItem = directItem;
    
    if (!pickedWorldItem) {
        // Tìm thủ công trong mảng worldItems hiện tại (lấy từ closure hoặc ref nếu cần, nhưng ở đây dùng logic find trực tiếp)
        // Lưu ý: setWorldItems(prev => ...) là cách duy nhất để lấy 'prev' mới nhất nếu không dùng Ref.
        // Tuy nhiên, vì ta muốn dùng item đó NGAY LẬP TỨC để update inventory, ta nên tìm nó trước.
        setWorldItems(prev => {
            pickedWorldItem = prev.find(i => i.spawnId === spawnId);
            return prev;
        });
    } else {
        // Nếu đã có directItem, chỉ cần xóa khỏi map
        // Wait for server confirmation before removing the item from the map.
    }

    // Đợi 1 tick nhỏ để đảm bảo pickedWorldItem được gán (nếu tìm từ setWorldItems)
    // Hoặc tốt nhất là tìm TRƯỚC khi gọi setWorldItems nếu không có directItem.
    // Thực tế, trong PickupMinigame ta sẽ truyền directItem vào, nên logic này sẽ chạy mượt.
    
    try {
      const result: any = await looterApi.pickupItem(apiUrl, deviceId, spawnId, false, currentLat, currentLng);
      if (!result?.success || !result?.item) {
        notify(result?.error || 'Khong the nhat vat pham', 'error');
        return;
      }
      pickedWorldItem = {
        ...(pickedWorldItem || {
          spawnId,
          lat: state.currentLat || 0,
          lng: state.currentLng || 0,
          isExpander: false,
          minigameType: null,
        }),
        item: result.item,
        isExpander: !!result.isExpander,
      } as WorldItem;

      consumedSpawnIdsRef.current.add(spawnId);
      for (const entry of chunkCacheRef.current.values()) {
        entry.items = entry.items.filter(i => i.spawnId !== spawnId);
      }
      setWorldItems(prev => prev.filter(i => i.spawnId !== spawnId));

      if (Array.isArray(result.inventory)) {
        setState(prev => ({
          ...prev,
          inventory: result.inventory,
          storage: Array.isArray(result.storage) ? result.storage : prev.storage,
        }));
        notify(
          result.item?.gridX != null && result.item.gridX >= 0
            ? `Nháº·t Ä‘Æ°á»£c ${result.item.name}`
            : `Nháº·t Ä‘Æ°á»£c ${result.item.name} nhÆ°ng balo Ä‘Ã£ Ä‘áº§y!`,
          result.item?.gridX != null && result.item.gridX >= 0 ? 'success' : 'info'
        );
        return;
      }
    } catch (err) {
      console.error('[LooterGame] pickup confirm error:', err);
      notify('Khong the xac thuc vat pham voi server', 'error');
      return;
    }

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

            // Dùng saveInventory để đi qua debounce, tránh spam 429
            setTimeout(() => {
                saveInventory(newInventory);
                notify(slot ? `Nhặt được ${looterItem.name}` : `Nhặt được ${looterItem.name} nhưng balo đã đầy!`, slot ? 'success' : 'info');
            }, 0);

            return nextState;
        });
    };

    if (pickedWorldItem) {
        consumedSpawnIdsRef.current.add(spawnId);
        for (const entry of chunkCacheRef.current.values()) {
          entry.items = entry.items.filter(i => i.spawnId !== spawnId);
        }
        setWorldItems(prev => prev.filter(i => i.spawnId !== spawnId));
        processPickup(pickedWorldItem);
    } else {
        // Fallback nếu vẫn chưa tìm thấy (do race condition của setWorldItems)
        // Ta sẽ dùng giải pháp an toàn: tìm trong state hiện tại nếu có thể truy cập
        // Ở đây ta dùng closure 'state' từ hook, nhưng nó có thể cũ.
        // Giải pháp tốt nhất là PickupMinigame luôn truyền directItem.
    }
  }, [deviceId, apiUrl, state.currentLat, state.currentLng, setWorldItems, setState, saveInventory, saveStorage, notify, chunkCacheRef, consumedSpawnIdsRef]);

  const dropItems = useCallback(async (itemUids: string[], lat: number, lng: number) => {
    if (!deviceId || itemUids.length === 0) return;
    
    try {
      const result: any = await looterApi.dropItems(apiUrl, deviceId, itemUids, lat, lng);
      if (!result?.success) {
        notify(result?.error || 'Khong the nem vat pham ra map', 'error');
        return;
      }

      setState(prev => {
        if (Array.isArray(result.inventory)) {
          return { ...prev, inventory: result.inventory };
        }
        const uidsToDrop = new Set(itemUids);
        const newInventory = prev.inventory.filter(i => !uidsToDrop.has(i.uid));
        return { ...prev, inventory: newInventory };
      });

      if (Array.isArray(result.items) && result.items.length > 0) {
        const droppedItems = result.items as WorldItem[];
        const now = Date.now();
        for (const item of droppedItems) {
          if (item.chunkX == null || item.chunkY == null) continue;
          const key = `${item.chunkX}:${item.chunkY}`;
          const entry = chunkCacheRef.current.get(key);
          if (entry) {
            entry.items = [...entry.items.filter(i => i.spawnId !== item.spawnId), item];
            entry.touchedAt = now;
          } else {
            chunkCacheRef.current.set(key, {
              key,
              chunkX: item.chunkX,
              chunkY: item.chunkY,
              items: [item],
              touchedAt: now,
            });
          }
        }
        setWorldItems(wItems => [...wItems.filter(i => !droppedItems.some(item => item.spawnId === i.spawnId)), ...droppedItems]);
      }
    } catch (err) {
      console.error('[LooterGame] drop item error:', err);
      notify('Khong the xac thuc nem vat pham voi server', 'error');
      return;
    }
    
    notify(`Đã ném ${itemUids.length} vật phẩm ra Map`, 'success');
  }, [deviceId, apiUrl, setState, setWorldItems, notify, chunkCacheRef]);

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
