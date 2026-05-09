import { looterApi } from '../services/looterApi';
import { findEmptySlotFor } from '../utils/looterHelpers';
import { BAG_DEFAULTS } from '../backpack/constants';
import { sanitizeWorldItems } from '../LooterGameContext';
import type { LooterChunkCacheEntry, LooterGameState, WorldItem } from '../LooterGameContext';
import type { LooterItem, BagItem } from '../backpack/types';

interface EquipBagDeps {
  state: LooterGameState;
  setState: React.Dispatch<React.SetStateAction<LooterGameState>>;
  saveInventory: (inventory: LooterItem[]) => Promise<boolean>;
  saveBags: (bags: BagItem[]) => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export async function equipBag(itemUid: string, deps: EquipBagDeps) {
  const { state, setState, saveInventory, saveBags, notify } = deps;
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

  let bagShape = newBagData.shape;
  if (!bagShape && bagDef?.shape) {
    bagShape = (bagDef.shape as any[]).map((row: any[]) => row.map((v: any) => !!v));
  }
  if (!bagShape) {
    bagShape = Array.from({ length: bagH }, () => Array(bagW).fill(true));
  }

  const newBag: BagItem = {
    uid: itemToEquip.uid, id: bagId, type: 'bag',
    name: itemToEquip.name, icon: itemToEquip.icon, rarity: itemToEquip.rarity,
    width: bagW, height: bagH, shape: bagShape, rotated: false,
    gridX: currentBag.gridX, gridY: currentBag.gridY
  };

  const itemsToKeep: LooterItem[] = [];
  const oldItems = state.inventory.filter(i => i.uid !== itemUid);

  for (const item of oldItems) {
    if (item.gridX < 0) { itemsToKeep.push(item); continue; }
    const canFit = (
      item.gridX >= newBag.gridX && item.gridX + (item.gridW || 1) <= newBag.gridX + newBag.width &&
      item.gridY >= newBag.gridY && item.gridY + (item.gridH || 1) <= newBag.gridY + newBag.height
    );
    if (canFit) {
      itemsToKeep.push(item);
    } else {
      itemsToKeep.push({ ...item, gridX: -1, gridY: -1, stagingX: Math.random() * 200, stagingY: Math.random() * 300 });
    }
  }

  if (currentBag) {
    const oldBagAsItem: LooterItem = {
      uid: currentBag.uid || `bag_${Date.now()}`, id: currentBag.id || 'basic_bag',
      name: currentBag.name, icon: currentBag.icon, rarity: currentBag.rarity, type: 'bag',
      gridW: 1, gridH: 1, rotated: false, price: currentBag.price || 0, weight: currentBag.weight || 0,
      hpBonus: currentBag.hpBonus, energyMax: currentBag.energyMax, energyRegen: currentBag.energyRegen,
      width: currentBag.width || 3, height: currentBag.height || 3, shape: currentBag.shape,
      gridX: -1, gridY: -1, stagingX: Math.random() * 200, stagingY: Math.random() * 300
    } as any;
    itemsToKeep.push(oldBagAsItem);
  }

  await saveInventory(itemsToKeep);
  await saveBags([newBag]);
  notify(`Đã trang bị ${newBag.name}`, 'success');
}

// ─── Pickup ──────────────────────────────────────────────────────────

interface PickupDeps {
  deviceId: string | null;
  apiUrl: string;
  state: LooterGameState;
  setState: React.Dispatch<React.SetStateAction<LooterGameState>>;
  setWorldItems: React.Dispatch<React.SetStateAction<WorldItem[]>>;
  saveInventory: (inventory: LooterItem[]) => Promise<boolean>;
  saveStorage: (storage: LooterItem[]) => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  chunkCacheRef: React.MutableRefObject<Map<string, LooterChunkCacheEntry>>;
  consumedSpawnIdsRef: React.MutableRefObject<Set<string>>;
  openBackpack?: () => void;
  lastPickupTimeRef: React.MutableRefObject<number>;
}

export async function pickupItem(
  spawnId: string, directItem: WorldItem | undefined,
  currentLat: number | undefined, currentLng: number | undefined,
  deps: PickupDeps
) {
  const { deviceId, apiUrl, state, setState, setWorldItems, saveInventory, saveStorage, notify, chunkCacheRef, consumedSpawnIdsRef, openBackpack, lastPickupTimeRef } = deps;
  if (!deviceId) return;

  const now = Date.now();
  if (now - lastPickupTimeRef.current < 800) return;
  lastPickupTimeRef.current = now;

  let pickedWorldItem = directItem;
  if (!pickedWorldItem) {
    setWorldItems(prev => {
      const sanitized = sanitizeWorldItems(prev);
      pickedWorldItem = sanitized.find(i => i.spawnId === spawnId);
      return sanitized;
    });
  }

  try {
    const result: any = await looterApi.pickupItem(apiUrl, deviceId, spawnId, false, currentLat, currentLng);
    if (!result?.success || !result?.item) {
      notify(result?.error || 'Khong the nhat vat pham', 'error');
      return;
    }
    pickedWorldItem = {
      ...(pickedWorldItem || {
        spawnId, lat: state.currentLat || 0, lng: state.currentLng || 0,
        isExpander: false, minigameType: null,
      }),
      item: result.item, isExpander: !!result.isExpander,
    } as WorldItem;

    consumedSpawnIdsRef.current.add(spawnId);
    for (const entry of chunkCacheRef.current.values()) {
      entry.items = sanitizeWorldItems(entry.items).filter(i => i.spawnId !== spawnId);
    }
    setWorldItems(prev => sanitizeWorldItems(prev).filter(i => i.spawnId !== spawnId));

    if (Array.isArray(result.inventory)) {
      setState(prev => ({
        ...prev,
        inventory: result.inventory,
        storage: Array.isArray(result.storage) ? result.storage : prev.storage,
      }));
      openBackpack?.();
      notify(
        result.item?.gridX != null && result.item.gridX >= 0
          ? `Nhặt được ${result.item.name}`
          : `Nhặt được ${result.item.name} nhưng balo đã đầy!`,
        result.item?.gridX != null && result.item.gridX >= 0 ? 'success' : 'info'
      );
      return;
    }
  } catch (err) {
    console.error('[LooterGame] pickup confirm error:', err);
    notify('Khong the xac thuc vat pham voi server', 'error');
    return;
  }

  if (pickedWorldItem?.item) {
    const looterItem = pickedWorldItem.item as LooterItem;
    consumedSpawnIdsRef.current.add(spawnId);
    for (const entry of chunkCacheRef.current.values()) {
      entry.items = sanitizeWorldItems(entry.items).filter(i => i.spawnId !== spawnId);
    }
    setWorldItems(prev => sanitizeWorldItems(prev).filter(i => i.spawnId !== spawnId));

    setState(prevState => {
      const currentBag = prevState.bags[0];
      const slot = findEmptySlotFor(looterItem, prevState.inventory, currentBag);
      const newItem: LooterItem = slot
        ? { ...looterItem, gridX: slot.x, gridY: slot.y }
        : { ...looterItem, gridX: -1, gridY: -1, stagingX: Math.random() * 200, stagingY: Math.random() * 300 } as any;
      const newInventory = [...prevState.inventory, newItem];
      setTimeout(() => { saveInventory(newInventory); notify(slot ? `Nhặt được ${looterItem.name}` : `Nhặt được ${looterItem.name} nhưng balo đã đầy!`, slot ? 'success' : 'info'); }, 0);
      return { ...prevState, inventory: newInventory };
    });
  }
}

// ─── Drop ────────────────────────────────────────────────────────────

interface DropDeps {
  deviceId: string | null;
  apiUrl: string;
  state: LooterGameState;
  setState: React.Dispatch<React.SetStateAction<LooterGameState>>;
  setWorldItems: React.Dispatch<React.SetStateAction<WorldItem[]>>;
  saveInventory: (inventory: LooterItem[]) => Promise<boolean>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  chunkCacheRef: React.MutableRefObject<Map<string, LooterChunkCacheEntry>>;
  openBackpack?: () => void;
}

export async function dropItems(
  itemUids: string[], lat: number, lng: number,
  deps: DropDeps
) {
  const { deviceId, apiUrl, setState, setWorldItems, notify, chunkCacheRef } = deps;
  if (!deviceId || itemUids.length === 0) return;

  try {
    const result: any = await looterApi.dropItems(apiUrl, deviceId, itemUids, lat, lng);
    if (!result?.success) {
      notify(result?.error || 'Khong the nem vat pham ra map', 'error');
      return;
    }

    setState(prev => {
      if (Array.isArray(result.inventory)) return { ...prev, inventory: result.inventory };
      const uidsToDrop = new Set(itemUids);
      return { ...prev, inventory: prev.inventory.filter(i => !uidsToDrop.has(i.uid)) };
    });

    if (Array.isArray(result.items) && result.items.length > 0) {
      const droppedItems = sanitizeWorldItems(result.items);
      const now = Date.now();
      for (const item of droppedItems) {
        if (item.chunkX == null || item.chunkY == null) continue;
        const key = `${item.chunkX}:${item.chunkY}`;
        const entry = chunkCacheRef.current.get(key);
        if (entry) {
          entry.items = [...sanitizeWorldItems(entry.items).filter(i => i.spawnId !== item.spawnId), item];
          entry.touchedAt = now;
        } else {
          chunkCacheRef.current.set(key, { key, chunkX: item.chunkX, chunkY: item.chunkY, items: [item], touchedAt: now });
        }
      }
      setWorldItems(wItems => [...sanitizeWorldItems(wItems).filter(i => !droppedItems.some(item => item.spawnId === i.spawnId)), ...droppedItems]);
    }
  } catch (err) {
    console.error('[LooterGame] drop item error:', err);
    notify('Khong the xac thuc nem vat pham voi server', 'error');
    return;
  }
  notify(`Đã ném ${itemUids.length} vật phẩm ra Map`, 'success');
}

export async function dropCombatLoot(
  items: LooterItem[],
  deps: DropDeps
) {
  const { deviceId, state, saveInventory, notify, openBackpack } = deps;
  if (!deviceId || items.length === 0) return;

  const itemsWithStaging = items.map(item => ({
    ...item, gridX: -1, gridY: -1,
    stagingX: Math.random() * 200, stagingY: Math.random() * 300
  }));
  const newInventory = [...state.inventory, ...itemsWithStaging];
  const itemUids = items.map(i => i.uid);

  const success = await saveInventory(newInventory);
  if (!success) { notify('Lỗi khi chuẩn bị rơi đồ!', 'error'); return; }

  await dropItems(itemUids, state.currentLat || 0, state.currentLng || 0, deps);
  openBackpack?.();
}
