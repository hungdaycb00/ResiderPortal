import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { generateSolvableFruitGrid } from './minigameUtils';
import { getBaseUrl, getLooterServerUrl } from '../../../services/externalApi';
import type { LooterItem, BagItem, GridExpander, PortalItem } from './backpack/types';
import { MAX_GRID_W, MAX_GRID_H } from './backpack/constants';
import { getBagBonuses, countBagCells, createStarterBag, repairBagData } from './backpack/utils';
import { 
  LooterGameContext, 
  type LooterGameContextType, 
  type LooterGameState, 
  type WorldItem, 
  type Encounter, 
  type CombatResult, 
  type StorageAccessMode,
  FORTRESS_INTERACTION_METERS,
  getDistanceMeters,
  isLooterAtFortress
} from './LooterGameContext';

// Re-export for backward compatibility
export { useLooterGame } from './LooterGameContext';
export { FORTRESS_INTERACTION_METERS, getDistanceMeters, isLooterAtFortress };
export type { LooterItem, BagItem, GridExpander, PortalItem, WorldItem, Encounter, CombatResult, LooterGameState };
export { MAX_GRID_W, MAX_GRID_H, getBagBonuses };

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



// ==========================================
// Provider
// ==========================================
interface LooterGameProviderProps {
  children: React.ReactNode;
  deviceId: string | null;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const LooterGameProvider: React.FC<LooterGameProviderProps> = ({ children, deviceId, showNotification }) => {
  const [state, setState] = useState<LooterGameState>(defaultState);
  const [worldItems, setWorldItems] = useState<WorldItem[]>([]);
  const [pickupRewardItem, setPickupRewardItem] = useState<LooterItem | null>(null);
  const [pendingBagSwap, setPendingBagSwap] = useState<BagItem | null>(null);
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


  const openBackpack = useCallback(() => {
    if (openBackpackHandler) {
      openBackpackHandler();
    }
  }, [openBackpackHandler]);

  const API = getLooterServerUrl();

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

  useEffect(() => {
    // Tiền tạo grid khi người dùng ở gần vật phẩm thế giới hoặc định kỳ
    if (!isLooterGameMode) return;
    
    const prepareMinigame = () => {
      if (preGeneratedMinigame) return; 
      
      const tier = state.worldTier;
      let innerRows = 4;
      let innerCols = 4;

      if (tier === 1) { innerRows = 4; innerCols = 5; }
      else if (tier === 2) { innerRows = 4; innerCols = 6; }
      else if (tier === 3) { innerRows = 5; innerCols = 6; }
      else if (tier === 4) { innerRows = 6; innerCols = 6; }
      else if (tier >= 5) { innerRows = 7; innerCols = 6; }

      // Đảm bảo số ô chẵn
      if ((innerRows * innerCols) % 2 !== 0) {
        innerCols += 1;
      }

      const grid = generateSolvableFruitGrid(innerRows, innerCols);
      setPreGeneratedMinigame({ type: 'fishing', grid });
    };

    const interval = setInterval(prepareMinigame, 5000);
    return () => clearInterval(interval);
  }, [isLooterGameMode, preGeneratedMinigame, state.worldTier]);

  const loadState = useCallback(async () => {
    if (!deviceId) return;
    try {
      const res = await fetch(`${API}/api/looter/state?deviceId=${encodeURIComponent(deviceId)}`);
      const data = await res.json();
      if (data.success && data.state) {
        const s = data.state;
        // Repair bag data from older server versions
        let bags: BagItem[] = Array.isArray(s.bags) ? s.bags : [];
        let didRepairBags = false;
        if (bags.length > 0) {
          const { bag, repaired } = repairBagData(bags[0]);
          bags = [bag, ...bags.slice(1)];
          if (repaired) {
            didRepairBags = true;
            console.log('[LooterGame] Repaired bag data:', bag);
          }
        } else {
          // No bags at all — create a default starter bag client-side
          const bag = createStarterBag();
          bags = [bag];
          didRepairBags = true;
          console.log('[LooterGame] Created default starter bag:', bag);
        }
        if (didRepairBags) {
          void fetch(`${API}/api/looter/bags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId, bags }),
          }).catch(err => console.error('[LooterGame] save repaired bag error:', err));
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
        if (data.settings) {
          setGlobalSettings(data.settings);
        }
        
        const isAtFortress = getDistanceMeters(s.current_lat, s.current_lng, s.fortress_lat, s.fortress_lng) <= FORTRESS_INTERACTION_METERS;
        setIsChallengeActive(!isAtFortress);
      }
    } catch (err) { console.error('[LooterGame] loadState error:', err); }
  }, [deviceId, API]);

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

  const moveBoat = useCallback(async (toLat: number, toLng: number) => {
    if (!deviceId) return { curseTrigger: false, encounter: null };
    setIsMoving(true);
    try {
      const res = await fetch(`${API}/api/looter/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

        if (data.returnedToFortress || getDistanceMeters(nextLat, nextLng, state.fortressLat, state.fortressLng) <= FORTRESS_INTERACTION_METERS) {
          setIsChallengeActive(false);
        } else {
          setIsChallengeActive(true);
        }

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
  }, [deviceId, API, state.fortressLat, state.fortressLng]);

  const saveInventory = useCallback(async (inventory: LooterItem[]) => {
    if (!deviceId) return;
    
    // Optimistic Update using ref-like variable from prev state
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

  const dropItem = useCallback(async (itemUid: string) => {
    if (!deviceId) return;
    
    const droppedItem = state.inventory.find(i => i.uid === itemUid);
    
    // Optimistic Update: Xóa khỏi inventory và thêm vào world items
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
    } catch (err) {
      console.error('[LooterGame] dropItem error:', err);
      // Không cần rollback vì ném đồ thường là hành động cuối cùng và server sẽ sync lại sau
    }
  }, [deviceId, API, loadWorldItems, showNotification]);

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
        if (data.type === 'item') {
          const item = data.item;
          const activeBag = state.bags[0];
          
          let slot = (gridX !== undefined && gridY !== undefined) ? { x: gridX, y: gridY } : null;
          if (slot == null) {
            slot = findEmptySlotFor(item, state.inventory, activeBag);
          }

          const newItem = { 
            ...item, 
            gridX: slot ? slot.x : -1, 
            gridY: slot ? slot.y : -1 
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
        } else if (data.type === 'bag') {
          const bag = data.bag;
          setState(prev => ({
            ...prev,
            bags: Array.isArray(data.bags) ? data.bags : [...prev.bags, bag],
            cursePercent: typeof data.cursePercent === 'number' ? data.cursePercent : prev.cursePercent
          }));
          showNotification(`Đã nhặt Túi đồ: ${bag.name}`, 'success');
        }
        
        setState(prev => ({ ...prev, cursePercent: data.cursePercent }));
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('[Looter Pickup]', err);
      showNotification(err.message || 'Lỗi khi nhặt vật phẩm', 'error');
      loadWorldItems(true);
      void loadState(); 
      return false;
    }
  }, [deviceId, API, state.inventory, state.bags, findEmptySlotFor, saveInventory, dropItem, loadWorldItems, showNotification]);

  // Handle Map Item Dragging
  useEffect(() => {
    if (!draggingMapItem) return;

    const handlePointerMove = (e: PointerEvent) => {
      setDragPointerPos({ x: e.clientX, y: e.clientY });
    };

    const handlePointerUp = (e: PointerEvent) => {
      // Check if dropped in backpack area (bottom 30% of screen)
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

  const confirmDiscard = useCallback(async () => {
    const stagingItems = state.inventory.filter(i => i.gridX < 0);
    for (const item of stagingItems) {
      await dropItem(item.uid);
    }
    setShowDiscardModal(false);
    showNotification(`Đã vứt bỏ ${stagingItems.length} vật phẩm thừa`, 'info');
  }, [state.inventory, dropItem, showNotification]);

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







  const inflictMinigamePenalty = useCallback(async (spawnId: string) => {
    if (!deviceId) return false;
    // Optimistic: Xóa vật phẩm ngay lập tức
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
    } catch (err) {
      console.error('[LooterGame] minigamePenalty error:', err);
      return false;
    }
  }, [deviceId, API]);

  const destroyItem = useCallback(async (spawnId: string) => {
    if (!deviceId) return false;
    // Optimistic: Xóa vật phẩm ngay lập tức
    setWorldItems(prev => prev.filter(i => i.spawnId !== spawnId));
    try {
      const res = await fetch(`${API}/api/looter/destroy-item`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, spawnId }),
      });
      const data = await res.json();
      if (data.success) {
        return true;
      }
      return false;
    } catch (err) {
      console.error('[LooterGame] destroyItem error:', err);
      return false;
    }
  }, [deviceId, API]);

  const onWinMinigame = useCallback(async (worldItem: WorldItem) => {
    await pickupItem(worldItem.spawnId, undefined, undefined, true);
  }, [pickupItem]);


  const acceptBagSwap = useCallback(async (newBag: BagItem) => {
    const oldBag = state.bags[0];
    const bagShape = newBag.shape || [];
    
    const itemsToKeep: LooterItem[] = [];
    const itemsToDrop: LooterItem[] = [];

    for (const item of state.inventory) {
      let inBounds = true;
      if (item.gridX >= 0) {
        for (let r = 0; r < item.gridH; r++) {
          for (let c = 0; c < item.gridW; c++) {
            const br = item.gridY + r - newBag.gridY;
            const bc = item.gridX + c - newBag.gridX;
            if (br < 0 || br >= newBag.height || bc < 0 || bc >= newBag.width || !bagShape[br] || !bagShape[br][bc]) {
              inBounds = false;
              break;
            }
          }
          if (!inBounds) break;
        }
      } else {
        inBounds = false; // Items in staging (if any left) are dropped
      }



      if (inBounds) {
        itemsToKeep.push(item);
      } else {
        itemsToDrop.push(item);
      }
    }

    // Process drops
    for (const item of itemsToDrop) {
      await dropItem(item.uid);
    }

    // Convert old bag to item and drop it too (since no staging)
    if (oldBag && !oldBag.isStarter) {
       // We'll just let the server handle bag conversions if needed, 
       // but here we'll just drop the old bag as an item.
       // For now, let's just save the new bag and keep the compatible items.
    }

    await saveBags([newBag]);
    await saveInventory(itemsToKeep);
    setPendingBagSwap(null);
    showNotification(`Đã đổi balo. ${itemsToDrop.length} vật phẩm không vừa đã rơi ra biển.`, 'info');
  }, [state.inventory, state.bags, saveBags, saveInventory, dropItem, showNotification]);

  const executeCombat = useCallback(async (opponentId: string, opponentInventory?: LooterItem[], opponentHp?: number, opponentBags?: BagItem[]) => {
    if (!deviceId) throw new Error('No device');
    const normalizedOpponentId = opponentId || '';
    const isBotOpponent = normalizedOpponentId.startsWith('bot_');
    const payload = {
      deviceId,
      opponentId: normalizedOpponentId,
      targetUserId: normalizedOpponentId,
      targetId: normalizedOpponentId,
      opponentInventory,
      opponentHp,
      opponentBags,
      botItems: opponentInventory,
      botHp: opponentHp,
      botBags: opponentBags,
      isBot: isBotOpponent,
      playerItemCount: state.inventory.filter((item) => item.gridX >= 0).length,
      opponentTier: state.worldTier,
    };
    const combatUrls: string[] = [];
    if (API) {
      combatUrls.push(`${API}/api/looter/combat`);
      combatUrls.push(`${API}/api/looterJourney/combat`);
    }
    
    console.log('[LooterCombat-Debug] Starting combat request sequence');
    console.log('[LooterCombat-Debug] API Base:', API);
    console.log('[LooterCombat-Debug] Browser Origin:', window.location.origin);
    
    // Quick Health Check to see if ANY sea route works
    try {
      const healthRes = await fetch(`${API}/api/looter/combat/health`).catch(() => null);
      if (healthRes) {
        console.log(`[LooterCombat-Debug] Health Check status: ${healthRes.status}`);
        const healthData = await healthRes.json().catch(() => ({}));
        console.log(`[LooterCombat-Debug] Health Check data:`, healthData);
      } else {
        console.warn(`[LooterCombat-Debug] Health Check failed to fetch`);
      }
    } catch (e) {
      console.error(`[LooterCombat-Debug] Health Check error:`, e);
    }
    
    // Thêm các URL tiềm năng khác nếu cần, nhưng bỏ qua domain frontend nếu nó là alin.city (static)
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      if (!origin.includes('alin.city') && !combatUrls.includes(`${origin}/api/looter/combat`)) {
        combatUrls.push(`${origin}/api/looter/combat`);
      }
    }

    let data: any = null;
    let lastError = 'Combat failed';

    for (const combatUrl of combatUrls) {
      try {
        console.log(`[LooterCombat] Attempting: ${combatUrl}`);
        const res = await fetch(combatUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        
        if (res.status === 404) {
          console.warn(`[LooterCombat] 404 Not Found at ${combatUrl}`);
          continue;
        }

        const responseData = await res.json().catch(() => ({}));
        if (res.ok && responseData?.success) {
          data = responseData;
          break;
        }
        
        lastError = responseData?.error || `Combat failed (${res.status})`;
        console.error(`[LooterCombat-Debug] Error at ${combatUrl}: ${lastError}`);
        console.error(`[LooterCombat-Debug] Full Response:`, responseData);
      } catch (err: any) {
        lastError = err.message;
        if (err.name === 'AbortError') lastError = 'Request timeout';
        console.error(`[LooterCombat] Fetch failed for ${combatUrl}:`, err);
      }
    }

    if (!data?.success) {
      throw new Error(lastError);
    }

    if (data.success) {
      await loadState();
      const result: CombatResult = { result: data.result, combatLog: data.combatLog, loot: data.loot, droppedItems: data.droppedItems, finalHp: data.finalHp };
      if (result.result === 'lose') {
          setIsChallengeActive(false);
      }
      setCombatResult(result);
      return result;
    }
    throw new Error(data.error || 'Combat failed');
  }, [deviceId, API, loadState, state.inventory, state.worldTier]);

  const curseChoice = useCallback(async (choice: 'flee' | 'challenge') => {
    if (!deviceId) return;
    const res = await fetch(`${API}/api/looter/curse-choice`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, choice }),
    });
    const data = await res.json();
    if (data.success) {
      await loadState();
    }
    setShowCurseModal(false);
  }, [deviceId, API, loadState]);

  const sellItems = useCallback(async (itemUids: string[]) => {
    if (!deviceId) return;
    
    // Optimistic Update
    const previousInventory = state.inventory;
    const previousGold = state.looterGold;
    
    const itemsToSell = state.inventory.filter(i => itemUids.includes(i.uid));
    const totalGain = itemsToSell.reduce((sum, i) => sum + (i.price || 0), 0);
    
    setState(prev => ({
      ...prev,
      inventory: prev.inventory.filter(i => !itemUids.includes(i.uid)),
      looterGold: prev.looterGold + totalGain,
    }));

    try {
      const res = await fetch(`${API}/api/looter/sell`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, itemUids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Sell failed');
      setState(prev => ({
        ...prev,
        inventory: Array.isArray(data.remaining) ? data.remaining : prev.inventory,
        looterGold: typeof data.looterGold === 'number' ? data.looterGold : prev.looterGold,
      }));
      // Không cần loadState() nữa vì đã update ở trên, 
      // trừ khi muốn đồng bộ chính xác tuyệt đối sau khi server xử lý.
    } catch (err) {
      console.error('[LooterGame] sellItems error:', err);
      showNotification(err instanceof Error ? err.message : 'Ban vat pham that bai', 'error');
      // Rollback
      setState(prev => ({ ...prev, inventory: previousInventory, looterGold: previousGold }));
    }
  }, [deviceId, API, state.inventory, state.looterGold, showNotification]);

  const storeItems = useCallback(async (itemUids: string[], action: 'store' | 'retrieve', mode: StorageAccessMode = 'fortress', gridX?: number, gridY?: number) => {
    if (!deviceId) return;

    // Optimistic Update
    const prevInventory = state.inventory;
    const prevStorage = state.storage;

    if (action === 'store') {
      const itemsToMove = state.inventory.filter(i => itemUids.includes(i.uid));
      setState(prev => ({
        ...prev,
        inventory: prev.inventory.filter(i => !itemUids.includes(i.uid)),
        storage: [...prev.storage, ...itemsToMove.map(i => ({ ...i, gridX: gridX ?? -1, gridY: gridY ?? -1 }))]
      }));
    } else {
      const itemsToMove = state.storage.filter(i => itemUids.includes(i.uid));
      setState(prev => ({
        ...prev,
        storage: prev.storage.filter(i => !itemUids.includes(i.uid)),
        inventory: [...prev.inventory, ...itemsToMove.map(i => ({ ...i, gridX: gridX ?? -1, gridY: gridY ?? -1 }))]
      }));
    }

    try {
      const res = await fetch(`${API}/api/looter/store`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, itemUids, action, mode, gridX, gridY }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Thao tác kho đồ thất bại');
      }
      await loadState();
    } catch (err: any) { 
      let errorMsg = err.message || 'Lỗi kết nối máy chủ';
      showNotification(errorMsg, 'error');
      // Rollback
      setState(prev => ({ ...prev, inventory: prevInventory, storage: prevStorage }));
    }
  }, [deviceId, API, state.inventory, state.storage, loadState, showNotification]);

  const returnToFortress = useCallback(async () => {
    if (!deviceId) return;
    
    // Optimistic Update
    const prevLat = state.currentLat;
    const prevLng = state.currentLng;
    const prevActive = isChallengeActive;

    setState(prev => ({ ...prev, currentLat: state.fortressLat, currentLng: state.fortressLng }));
    setIsChallengeActive(false);

    try {
      const res = await fetch(`${API}/api/looter/return-fortress`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Return to fortress failed');
      }
      await loadState();
    } catch (err) {
      console.error('[LooterGame] returnToFortress error:', err);
      // Rollback
      setState(prev => ({ ...prev, currentLat: prevLat, currentLng: prevLng }));
      setIsChallengeActive(prevActive);
    }
  }, [deviceId, API, state.currentLat, state.currentLng, state.fortressLat, state.fortressLng, isChallengeActive, loadState]);


  useEffect(() => {
    if (!deviceId || !state.initialized || !isChallengeActive) return;
    void loadWorldItems(true);
  }, [deviceId, state.initialized, state.currentLat, state.currentLng, isChallengeActive, loadWorldItems]);

  const setWorldTier = useCallback(async (tier: number) => {
    if (!deviceId) return;
    
    // Optimistic Update
    const TIER_COSTS = [0, 10, 100, 1000, 10000, 100000];
    const cost = TIER_COSTS[tier] || 0;
    
    const previousTier = state.worldTier ?? 0;
    const previousGold = state.looterGold ?? 0;

    setState(prev => ({
      ...prev,
      worldTier: tier,
      looterGold: Math.max(0, prev.looterGold - cost),
    }));

    try {
      const res = await fetch(`${API}/api/looter/set-tier`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, tier }),
      });
      const data = await res.json();
      if (data.success) {
        setState(prev => ({
          ...prev,
          worldTier: data.tier,
          looterGold: Number(data.looterGold ?? data.looter_gold ?? 0),
          cursePercent: data.cursePercent,
        }));
      } else {
        throw new Error('Tier upgrade failed');
      }
    } catch (err: any) {
      showNotification(err.message || 'Nâng cấp vùng biển thất bại', 'error');
      // Rollback
      setState(prev => ({ ...prev, worldTier: previousTier, looterGold: previousGold }));
    }
    
    // Force challenge active AFTER loadState (loadState resets it based on position)
    setIsChallengeActive(true);
    // Load world items for the new tier (force=true to bypass stale closure)
    await loadWorldItems(true);
  }, [deviceId, API, state.worldTier, state.looterGold, loadWorldItems]);

  useEffect(() => {
    const portalItems = createPortalWorldItems(state.fortressLat, state.fortressLng, state.currentLat, state.currentLng);
    setWorldItems((prev) => {
      const normalItems = prev.filter((item) => (item as any)?.item?.type !== 'portal');
      return [...portalItems, ...normalItems];
    });
  }, [state.currentLat, state.currentLng, state.fortressLat, state.fortressLng]);

  // Auto-load state when deviceId is available
  useEffect(() => { if (deviceId) loadState(); }, [deviceId, loadState]);

  const openFortressStorage = useCallback((mode: StorageAccessMode = 'fortress') => {
    setFortressStorageMode(mode);
    setIsLootGameMode(mode === 'portal');
    setIsFortressStorageOpen(true);
  }, []);

  const value: LooterGameContextType = useMemo(() => ({
    state, worldItems,
    isFortressStorageOpen, setIsFortressStorageOpen, fortressStorageMode,
    pickupRewardItem, setPickupRewardItem,
    pendingBagSwap, setPendingBagSwap, acceptBagSwap,
    encounter, setEncounter,
    combatResult, setCombatResult, showCurseModal, setShowCurseModal,
    showMinigame, setShowMinigame,
    isLooterGameMode,
    setIsLooterGameMode,
    isLootGameMode, setIsLootGameMode,
    openBackpack,
    setOpenBackpackHandler,
    isItemDragging,
    setIsItemDragging,
    isChallengeActive, setIsChallengeActive,
    preGeneratedMinigame,
    setPreGeneratedMinigame,
    globalSettings,
    isMoving,
    initGame, loadState, moveBoat, pickupItem, inflictMinigamePenalty, destroyItem, saveInventory, saveStorage, saveBags,
    executeCombat, curseChoice, sellItems, storeItems, setWorldTier, dropItem, returnToFortress, loadWorldItems,
    showNotification, draggingItem, setDraggingItem,
    draggingMapItem, setDraggingMapItem, dragPointerPos,
    openFortressStorage,
    showDiscardModal, setShowDiscardModal, confirmDiscard
  }), [
    state, worldItems, isFortressStorageOpen, fortressStorageMode, pickupRewardItem, pendingBagSwap,
    acceptBagSwap, encounter, combatResult, showCurseModal, showMinigame, isLooterGameMode, isLootGameMode, openBackpack,
    setOpenBackpackHandler, isItemDragging, isChallengeActive, preGeneratedMinigame, globalSettings,
    isMoving, initGame, loadState, moveBoat, pickupItem,
    inflictMinigamePenalty, destroyItem, saveInventory, saveStorage, saveBags, executeCombat,
    curseChoice, sellItems, storeItems, setWorldTier, dropItem, returnToFortress, loadWorldItems,
    showNotification, draggingItem, draggingMapItem, dragPointerPos, openFortressStorage,
    showDiscardModal, confirmDiscard
  ]);

  return <LooterGameContext.Provider value={value}>{children}</LooterGameContext.Provider>;
};

export default LooterGameProvider;
