import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { generateSolvableFruitGrid } from './minigameUtils';
import { getLooterServerUrl } from '../../../services/externalApi';
import type { LooterItem, BagItem, GridExpander, PortalItem } from './backpack/types';
import { MAX_GRID_W, MAX_GRID_H } from './backpack/constants';
import { createStarterBag, repairBagData, getDistanceMeters } from './backpack/utils';
import { 
  LooterGameContext, 
  type LooterGameState, 
  type WorldItem, 
  type Encounter, 
  type CombatResult, 
  type StorageAccessMode,
  FORTRESS_INTERACTION_METERS
} from './LooterGameContext';

const defaultState: LooterGameState = {
  initialized: false, fortressLat: null, fortressLng: null, currentLat: null, currentLng: null,
  baseMaxHp: 100, currentHp: 100, moveSpeed: 1.0, inventoryWidth: 6, inventoryHeight: 4,
  cursePercent: 0, looterGold: 0, worldTier: 1, inventory: [], storage: [], bags: [], distance: 0,
  energyMax: 100, energyCurrent: 100, activeCurses: {},
};

const PORTAL_SPACING_METERS = 5000;
const PORTAL_SEARCH_RADIUS = 2;

const createPortalWorldItems = (
  fortressLat: number | null,
  fortressLng: number | null,
  currentLat: number | null,
  currentLng: number | null
): WorldItem[] => {
  if (fortressLat == null || fortressLng == null || currentLat == null || currentLng == null) return [];
  const cosLat = Math.max(0.25, Math.cos((fortressLat * Math.PI) / 180));
  const xMeters = (currentLng - fortressLng) * 111000 * cosLat;
  const yMeters = (currentLat - fortressLat) * 111000;
  const centerGridX = Math.round(xMeters / PORTAL_SPACING_METERS);
  const centerGridY = Math.round(yMeters / PORTAL_SPACING_METERS);
  const items: WorldItem[] = [];

  for (let gridY = centerGridY - PORTAL_SEARCH_RADIUS; gridY <= centerGridY + PORTAL_SEARCH_RADIUS; gridY += 1) {
    for (let gridX = centerGridX - PORTAL_SEARCH_RADIUS; gridX <= centerGridX + PORTAL_SEARCH_RADIUS; gridX += 1) {
      if (gridX === 0 && gridY === 0) continue;
      const portalLat = fortressLat + ((gridY * PORTAL_SPACING_METERS) / 111000);
      const portalLng = fortressLng + ((gridX * PORTAL_SPACING_METERS) / (111000 * cosLat));
      items.push({
        spawnId: `portal_${gridX}_${gridY}`,
        lat: portalLat,
        lng: portalLng,
        isExpander: false,
        minigameType: 'chest',
        item: {
          id: 'looter_portal',
          name: 'Cong Portal',
          icon: '🌀',
          type: 'portal',
        },
      });
    }
  }
  return items;
};

interface LooterGameProviderProps {
  children: React.ReactNode;
  deviceId: string | null;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const LooterGameProvider: React.FC<LooterGameProviderProps> = ({ children, deviceId, showNotification }) => {
  const [state, setState] = useState<LooterGameState>(defaultState);
  const [worldItems, setWorldItems] = useState<WorldItem[]>([]);
  const [pickupRewardItem, setPickupRewardItem] = useState<LooterItem | null>(null);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [combatResult, setCombatResult] = useState<CombatResult | null>(null);
  const [showCurseModal, setShowCurseModal] = useState(false);
  const [showMinigame, setShowMinigame] = useState<WorldItem | null>(null);
  const [isLooterGameMode, setIsLooterGameMode] = useState(false);
  const [isChallengeActive, setIsChallengeActive] = useState(false);
  const [isFortressStorageOpen, setIsFortressStorageOpen] = useState(false);
  const [fortressStorageMode, setFortressStorageMode] = useState<StorageAccessMode>('fortress');
  const [globalSettings, setGlobalSettings] = useState<any>({ speedMultiplier: 1.0 });
  const [isMoving, setIsMoving] = useState(false);
  const [draggingItem, setDraggingItem] = useState<LooterItem | null>(null);
  const [isItemDragging, setIsItemDragging] = useState(false);
  const [isLootGameMode, setIsLootGameMode] = useState(false);
  const [preGeneratedMinigame, setPreGeneratedMinigame] = useState<{ type: string, grid: any } | null>(null);
  const [openBackpackHandler, setOpenBackpackHandler] = useState<(() => void) | null>(null);
  const [draggingMapItem, setDraggingMapItem] = useState<WorldItem | null>(null);
  const [dragPointerPos, setDragPointerPos] = useState({ x: 0, y: 0 });
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const API = useMemo(() => getLooterServerUrl(), []);

  // 1. Leaf Actions
  const saveInventory = useCallback(async (inventory: LooterItem[]) => {
    if (!deviceId) return;
    let previousInventory: LooterItem[] = [];
    setState(prev => {
      previousInventory = prev.inventory;
      return { ...prev, inventory };
    });
    try {
      const res = await fetch(`${API}/api/looter/inventory`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, inventory }),
      });
      if (!res.ok) throw new Error('Save failed');
      return true;
    } catch (err) { 
      console.error('[LooterGame] saveInventory error:', err);
      setState(prev => ({ ...prev, inventory: previousInventory }));
      return false;
    }
  }, [deviceId, API]);

  const saveBags = useCallback(async (bags: BagItem[]) => {
    if (!deviceId) return;
    let previousBags: BagItem[] = [];
    setState(prev => {
      previousBags = prev.bags;
      return { ...prev, bags };
    });
    try {
      const res = await fetch(`${API}/api/looter/bags`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, bags }),
      });
      if (!res.ok) throw new Error('Save failed');
    } catch (err) {
      console.error('[LooterGame] saveBags error:', err);
      setState(prev => ({ ...prev, bags: previousBags }));
    }
  }, [deviceId, API]);

  const loadWorldItems = useCallback(async (forceActive?: boolean) => {
    if (!deviceId) return;
    try {
      const res = await fetch(`${API}/api/looter/world-items?deviceId=${encodeURIComponent(deviceId)}`);
      const data = await res.json();
      if (data.success) {
          const portalItems = createPortalWorldItems(state.fortressLat, state.fortressLng, state.currentLat, state.currentLng);
          const mapItems: WorldItem[] = Array.isArray(data.items) ? data.items : [];
          const normalItems = mapItems.filter((item) => (item as any)?.item?.type !== 'portal');
          let items = [...portalItems, ...normalItems];
          if (!forceActive && !isChallengeActive) {
              items = [...portalItems, ...normalItems.slice(0, 3)];
          }
          setWorldItems(items);
      }
    } catch (err) { console.error('[LooterGame] loadWorldItems error:', err); }
  }, [deviceId, API, isChallengeActive, state.currentLat, state.currentLng, state.fortressLat, state.fortressLng]);

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
      const res = await fetch(`${API}/api/looter/drop`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, itemUid }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Đã ném vật phẩm ra biển', 'info');
        setTimeout(() => loadWorldItems(true), 500);
      }
    } catch (err) { console.error('[LooterGame] dropItem error:', err); }
  }, [deviceId, API, state.inventory, state.currentLat, state.currentLng, loadWorldItems, showNotification]);

  const findEmptySlotFor = useCallback((item: LooterItem, inventory: LooterItem[], bag: BagItem | undefined) => {
    if (!bag) return null;
    const w = item.gridW || 1;
    const h = item.gridH || 1;
    const shape = item.shape;
    const isOccupied = (x: number, y: number) => {
      const bagX = x - bag.gridX;
      const bagY = y - bag.gridY;
      if (bagX < 0 || bagY < 0 || bagX >= bag.width || bagY >= bag.height) return true;
      if (!bag.shape[bagY][bagX]) return true;
      return inventory.some(i => {
        if (i.gridX < 0) return false;
        const iw = i.gridW || 1;
        const ih = i.gridH || 1;
        const ishape = i.shape;
        if (x >= i.gridX && x < i.gridX + iw && y >= i.gridY && y < i.gridY + ih) {
          if (!ishape) return true;
          return ishape[y - i.gridY][x - i.gridX];
        }
        return false;
      });
    };
    const canPlace = (startX: number, startY: number) => {
      if (startX + w > 7 || startY + h > 6) return false;
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          if (!shape || shape[r][c]) {
            if (isOccupied(startX + c, startY + r)) return false;
          }
        }
      }
      return true;
    };
    for (let y = 0; y <= 6 - h; y++) {
      for (let x = 0; x <= 7 - w; x++) {
        if (canPlace(x, y)) return { x, y };
      }
    }
    return null;
  }, []);

  const pickupItem = useCallback(async (spawnId: string, gridX?: number, gridY?: number, force: boolean = false) => {
    if (!deviceId) return false;
    try {
      const res = await fetch(`${API}/api/looter/pickup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, spawnId, force }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 400) {
          showNotification(data.error || 'Quá xa để nhặt', 'error');
          loadWorldItems(true);
          return false;
        }
        throw new Error(data.error || `HTTP ${res.status}`);
      }
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
            showNotification(`Đã nhặt ${item.name} (Vào hàng chờ)`, 'info');
          } else {
            showNotification(`Đã nhặt ${item.name}`, 'success');
          }
        }
        setState(prev => ({ ...prev, cursePercent: data.cursePercent }));
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('[Looter Pickup]', err);
      showNotification(err.message || 'Lỗi khi nhặt vật phẩm', 'error');
      loadWorldItems(true);
      return false;
    }
  }, [deviceId, API, state.inventory, state.bags, findEmptySlotFor, loadWorldItems, showNotification]);

  const moveBoat = useCallback(async (toLat: number, toLng: number) => {
    if (!deviceId) return { curseTrigger: false, encounter: null };
    const stagingItems = state.inventory.filter(i => (i.gridX ?? -1) < 0);
    if (stagingItems.length > 0) {
      for (const item of stagingItems) {
        await dropItem(item.uid);
      }
      showNotification(`${stagingItems.length} vật phẩm thừa đã rơi xuống biển tại đây.`, 'info');
    }
    setIsMoving(true);
    try {
      const res = await fetch(`${API}/api/looter/move`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, toLat, toLng }),
      });
      const data = await res.json();
      if (data.success) {
        const nextLat = data.currentLat ?? toLat;
        const nextLng = data.currentLng ?? toLng;
        setState(prev => ({
          ...prev,
          currentLat: nextLat,
          currentLng: nextLng,
          cursePercent: data.cursePercent,
          distance: prev.distance + (data.distMeters || 0),
        }));
        if (data.speedViolation) {
            showNotification(`Di chuyển quá nhanh! Lời nguyền tăng +${data.penaltyCurse.toFixed(0)}%`, 'error');
        }
        const distToFortress = getDistanceMeters(nextLat, nextLng, state.fortressLat, state.fortressLng);
        setIsChallengeActive(distToFortress > FORTRESS_INTERACTION_METERS);
        if (data.curseTrigger && data.encounter) {
          setEncounter(data.encounter);
          setShowCurseModal(true);
          return { curseTrigger: true, encounter: data.encounter };
        }
      }
      return { curseTrigger: false, encounter: null };
    } catch (err) {
      console.error('[LooterGame] moveBoat error:', err);
      return { curseTrigger: false, encounter: null };
    } finally { setIsMoving(false); }
  }, [deviceId, API, state.inventory, state.fortressLat, state.fortressLng, dropItem, showNotification]);

  const loadState = useCallback(async () => {
    if (!deviceId) return;
    try {
      const res = await fetch(`${API}/api/looter/state?deviceId=${encodeURIComponent(deviceId)}`);
      const data = await res.json();
      if (data.success && data.state) {
        const s = data.state;
        let bags: BagItem[] = Array.isArray(s.bags) ? s.bags : [];
        let didRepairBags = false;
        if (bags.length > 0) {
          const { bag, repaired } = repairBagData(bags[0]);
          bags = [bag, ...bags.slice(1)];
          if (repaired) didRepairBags = true;
        } else {
          const bag = createStarterBag();
          bags = [bag];
          didRepairBags = true;
        }
        if (didRepairBags) {
          saveBags(bags);
        }
        setState({
          initialized: s.fortress_lat != null,
          fortressLat: s.fortress_lat, fortressLng: s.fortress_lng,
          currentLat: s.current_lat, currentLng: s.current_lng,
          baseMaxHp: s.base_max_hp || 100, currentHp: s.current_hp || 100,
          moveSpeed: s.move_speed || 1.0, inventoryWidth: s.inventory_width || 6, inventoryHeight: s.inventory_height || 4,
          cursePercent: s.curse_percent || 0, looterGold: Number(s.looter_gold || 0), worldTier: s.world_tier || 1,
          inventory: (() => { try { return JSON.parse(s.inventory_json || '[]'); } catch(e) { return []; } })(),
          storage: (() => { try { return JSON.parse(s.storage_json || '[]'); } catch(e) { return []; } })(),
          bags,
          distance: s.distance || 0, energyMax: s.energy_max || 100, energyCurrent: s.energy_current || 100,
          activeCurses: s.activeCurses || {},
        });
        if (data.settings) setGlobalSettings(data.settings);
        const distToFortress = getDistanceMeters(s.current_lat, s.current_lng, s.fortress_lat, s.fortress_lng);
        setIsChallengeActive(distToFortress > FORTRESS_INTERACTION_METERS);
      }
    } catch (err) { console.error('[LooterGame] loadState error:', err); }
  }, [deviceId, API, saveBags]);

  const initGame = useCallback(async (lat: number, lng: number) => {
    if (!deviceId) return;
    try {
      const res = await fetch(`${API}/api/looter/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, lat, lng }),
      });
      await res.json();
      await loadState();
    } catch (err) { console.error('[LooterGame] initGame error:', err); }
  }, [deviceId, API, loadState]);

  const equipBag = useCallback(async (itemUid: string) => {
    const itemToEquip = state.inventory.find(i => i.uid === itemUid);
    if (!itemToEquip || itemToEquip.type !== 'bag') {
      showNotification('Vật phẩm này không phải là Balo', 'error');
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
      };
      itemsToKeep.push(oldBagAsItem);
    }
    await saveInventory(itemsToKeep);
    await saveBags([newBag]);
    showNotification(`Đã trang bị ${newBag.name}`, 'success');
  }, [state.inventory, state.bags, saveInventory, saveBags, showNotification]);

  const saveStorage = useCallback(async (storage: LooterItem[]) => {
    if (!deviceId) return;
    let previousStorage: LooterItem[] = [];
    setState(prev => {
      previousStorage = prev.storage;
      return { ...prev, storage };
    });
    try {
      const res = await fetch(`${API}/api/looter/storage_layout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, storage }),
      });
      if (!res.ok) throw new Error('Save failed');
    } catch (err) { 
      console.error('[LooterGame] saveStorage error:', err);
      setState(prev => ({ ...prev, storage: previousStorage }));
    }
  }, [deviceId, API]);

  const inflictMinigamePenalty = useCallback(async (spawnId: string) => {
    if (!deviceId) return false;
    setWorldItems(prev => prev.filter(i => i.spawnId !== spawnId));
    try {
      const res = await fetch(`${API}/api/looter/minigame-lose`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, spawnId }),
      });
      const data = await res.json();
      if (data.success) {
        setState(prev => ({ ...prev, cursePercent: data.cursePercent }));
        return true;
      }
      return false;
    } catch (err) { console.error('[LooterGame] minigamePenalty error:', err); return false; }
  }, [deviceId, API]);

  const destroyItem = useCallback(async (spawnId: string) => {
    if (!deviceId) return false;
    setWorldItems(prev => prev.filter(i => i.spawnId !== spawnId));
    try {
      const res = await fetch(`${API}/api/looter/destroy-item`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, spawnId }),
      });
      const data = await res.json();
      return !!data.success;
    } catch (err) { console.error('[LooterGame] destroyItem error:', err); return false; }
  }, [deviceId, API]);

  const openBackpack = useCallback(() => {
    if (openBackpackHandler) openBackpackHandler();
  }, [openBackpackHandler]);

  const onWinMinigame = useCallback(async (worldItem: WorldItem) => {
    await pickupItem(worldItem.spawnId, undefined, undefined, true);
  }, [pickupItem]);

  const confirmDiscard = useCallback(async () => {
    const stagingItems = state.inventory.filter(i => i.gridX < 0);
    for (const item of stagingItems) {
      await dropItem(item.uid);
    }
    setShowDiscardModal(false);
    showNotification(`Đã vứt bỏ ${stagingItems.length} vật phẩm thừa`, 'info');
  }, [state.inventory, dropItem, showNotification]);

  // Use Effects
  useEffect(() => {
    if (!isLooterGameMode) return;
    const prepareMinigame = () => {
      if (preGeneratedMinigame) return; 
      const tier = state.worldTier;
      let innerRows = 4, innerCols = 4;
      if (tier === 1) { innerRows = 4; innerCols = 5; }
      else if (tier === 2) { innerRows = 4; innerCols = 6; }
      else if (tier === 3) { innerRows = 5; innerCols = 6; }
      else if (tier === 4) { innerRows = 6; innerCols = 6; }
      else if (tier >= 5) { innerRows = 7; innerCols = 6; }
      if ((innerRows * innerCols) % 2 !== 0) innerCols += 1;
      const grid = generateSolvableFruitGrid(innerRows, innerCols);
      setPreGeneratedMinigame({ type: 'fishing', grid });
    };
    const interval = setInterval(prepareMinigame, 5000);
    return () => clearInterval(interval);
  }, [isLooterGameMode, preGeneratedMinigame, state.worldTier]);

  useEffect(() => {
    if (!draggingMapItem) return;
    const handlePointerMove = (e: PointerEvent) => setDragPointerPos({ x: e.clientX, y: e.clientY });
    const handlePointerUp = (e: PointerEvent) => {
      if (e.clientY > window.innerHeight * 0.65) {
        pickupItem(draggingMapItem.spawnId, undefined, undefined, true);
        showNotification(`Đang nhặt ${draggingMapItem.item.name}...`, 'info');
      }
      setDraggingMapItem(null);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingMapItem, pickupItem, showNotification]);

  const contextValue: any = {
    ...state,
    worldItems, pickupRewardItem, setPickupRewardItem,
    encounter, setEncounter, combatResult, setCombatResult,
    showCurseModal, setShowCurseModal, showMinigame, setShowMinigame,
    isLooterGameMode, setIsLooterGameMode, isChallengeActive,
    isFortressStorageOpen, setIsFortressStorageOpen, fortressStorageMode, setFortressStorageMode,
    globalSettings, loadState, initGame, moveBoat, saveInventory, saveStorage, pickupItem, dropItem,
    inflictMinigamePenalty, destroyItem, onWinMinigame, isMoving,
    draggingItem, setDraggingItem, isItemDragging, setIsItemDragging,
    isLootGameMode, setIsLootGameMode, preGeneratedMinigame, setPreGeneratedMinigame,
    openBackpack, setOpenBackpackHandler, draggingMapItem, setDraggingMapItem,
    dragPointerPos, showDiscardModal, setShowDiscardModal, confirmDiscard,
    equipBag, saveBags
  };

  return (
    <LooterGameContext.Provider value={contextValue}>
      {children}
    </LooterGameContext.Provider>
  );
};

export default LooterGameProvider;
