import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { generateSolvableFruitGrid } from './minigameUtils';
import { getBaseUrl } from '../../../services/externalApi';
import type { SeaItem, BagItem, GridExpander, PortalItem } from './backpack/types';
import { MAX_GRID_W, MAX_GRID_H } from './backpack/constants';
import { getBagBonuses, countBagCells, createStarterBag, repairBagData } from './backpack/utils';

// Re-export for backward compatibility
export type { SeaItem, BagItem, GridExpander, PortalItem };
export { MAX_GRID_W, MAX_GRID_H, getBagBonuses };

export const FORTRESS_INTERACTION_METERS = 200;

export const getDistanceMeters = (
  fromLat?: number | null,
  fromLng?: number | null,
  toLat?: number | null,
  toLng?: number | null
) => {
  if (fromLat == null || fromLng == null || toLat == null || toLng == null) return Number.POSITIVE_INFINITY;
  const cosLat = Math.max(0.25, Math.cos((fromLat * Math.PI) / 180));
  const dLat = (toLat - fromLat) * 111000;
  const dLng = (toLng - fromLng) * 111000 * cosLat;
  return Math.sqrt(dLat * dLat + dLng * dLng);
};

export const isSeaAtFortress = (state: Pick<SeaGameState, 'currentLat' | 'currentLng' | 'fortressLat' | 'fortressLng'>) =>
  getDistanceMeters(state.currentLat, state.currentLng, state.fortressLat, state.fortressLng) <= FORTRESS_INTERACTION_METERS;

export interface WorldItem {
  spawnId: string;
  lat: number;
  lng: number;
  isExpander: boolean;
  minigameType: 'fishing' | 'diving' | 'chest';
  item: SeaItem | GridExpander | BagItem | PortalItem;
}

export interface Encounter {
  type: 'player' | 'bot';
  id: string;
  name: string;
  avatar?: string;
  inventory: SeaItem[];
  bags?: BagItem[];
  baseMaxHp: number;
  totalWeight: number;
  totalHp: number;
  isBot?: boolean;
}

export interface CombatResult {
  result: 'win' | 'lose';
  combatLog: any[];
  loot?: SeaItem[];
  droppedItems?: SeaItem[];
  finalHp: number;
}

export interface SeaGameState {
  initialized: boolean;
  fortressLat: number | null;
  fortressLng: number | null;
  currentLat: number | null;
  currentLng: number | null;
  baseMaxHp: number;
  currentHp: number;
  moveSpeed: number;
  inventoryWidth: number;
  inventoryHeight: number;
  cursePercent: number;
  seaGold: number;
  worldTier: number;
  inventory: SeaItem[];
  storage: SeaItem[];
  bags: BagItem[];
  distance: number;
  energyMax: number;
  energyCurrent: number;
  activeCurses: Record<string, number>;
}

type StorageAccessMode = 'fortress' | 'portal';

interface SeaGameContextType {
  state: SeaGameState;
  worldItems: WorldItem[];
  isFortressStorageOpen: boolean;
  setIsFortressStorageOpen: (v: boolean) => void;
  fortressStorageMode: StorageAccessMode;
  openFortressStorage: (mode?: StorageAccessMode) => void;
  pickupRewardItem: SeaItem | null;
  setPickupRewardItem: (item: SeaItem | null) => void;
  encounter: Encounter | null;
  setEncounter: (e: Encounter | null) => void;
  combatResult: CombatResult | null;
  setCombatResult: (r: CombatResult | null) => void;
  showCurseModal: boolean;
  setShowCurseModal: (v: boolean) => void;
  showMinigame: WorldItem | null;
  setShowMinigame: (item: WorldItem | null) => void;
  isLootGameMode: boolean;
  setIsLootGameMode: (v: boolean) => void;
  openBackpack: () => void;
  setOpenBackpackHandler: (h: (() => void) | null) => void;
  isItemDragging: boolean;
  setIsItemDragging: (v: boolean) => void;
  isChallengeActive: boolean;
  setIsChallengeActive: (v: boolean) => void;
  preGeneratedMinigame: { type: string, grid: any } | null;
  setPreGeneratedMinigame: (v: { type: string, grid: any } | null) => void;
  globalSettings: any;
  // Actions
  initGame: (lat: number, lng: number) => Promise<void>;
  loadState: () => Promise<void>;
  moveBoat: (toLat: number, toLng: number) => Promise<{ curseTrigger: boolean; encounter: Encounter | null }>;
  pickupItem: (spawnId: string) => Promise<boolean>;
  inflictMinigamePenalty: (spawnId: string) => Promise<boolean>;
  saveInventory: (inventory: SeaItem[]) => Promise<void>;
  saveStorage: (storage: SeaItem[]) => Promise<void>;
  saveBags: (bags: BagItem[]) => Promise<void>;
  pendingBagSwap: BagItem | null;
  setPendingBagSwap: (bag: BagItem | null) => void;
  acceptBagSwap: (newBag: BagItem) => void;
  executeCombat: (opponentId: string, opponentInventory?: SeaItem[], opponentHp?: number, opponentBags?: BagItem[]) => Promise<CombatResult>;
  curseChoice: (choice: 'flee' | 'challenge') => Promise<void>;
  sellItems: (itemUids: string[]) => Promise<void>;
  storeItems: (itemUids: string[], action: 'store' | 'retrieve', mode?: StorageAccessMode, gridX?: number, gridY?: number) => Promise<void>;
  destroyItem: (spawnId: string) => Promise<boolean>;
  setWorldTier: (tier: number) => Promise<void>;
  returnToFortress: () => Promise<void>;
  loadWorldItems: (forceActive?: boolean) => Promise<void>;
  isMoving: boolean;
  showDiscardModal: boolean;
  setShowDiscardModal: (v: boolean) => void;
  confirmDiscard: () => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  draggingItem: SeaItem | null;
  setDraggingItem: (item: SeaItem | null) => void;
}

const defaultState: SeaGameState = {
  initialized: false, fortressLat: null, fortressLng: null, currentLat: null, currentLng: null,
  baseMaxHp: 100, currentHp: 100, moveSpeed: 1.0, inventoryWidth: 6, inventoryHeight: 4,
  cursePercent: 0, lootGold: 0, worldTier: 1, inventory: [], storage: [], bags: [], distance: 0,
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
          id: 'sea_portal',
          name: 'Cong Portal',
          icon: '🌀',
          type: 'portal',
        },
      });
    }
  }

  return items;
};


const SeaGameContext = createContext<SeaGameContextType | null>(null);

export function useSeaGame() {
  const ctx = useContext(SeaGameContext);
  if (!ctx) throw new Error('useSeaGame must be inside SeaGameProvider');
  return ctx;
}

// ==========================================
// Provider
// ==========================================
interface SeaGameProviderProps {
  children: React.ReactNode;
  deviceId: string | null;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const SeaGameProvider: React.FC<SeaGameProviderProps> = ({ children, deviceId, showNotification }) => {
  const [state, setState] = useState<SeaGameState>(defaultState);
  const [worldItems, setWorldItems] = useState<WorldItem[]>([]);
  const [pickupRewardItem, setPickupRewardItem] = useState<SeaItem | null>(null);
  const [pendingBagSwap, setPendingBagSwap] = useState<BagItem | null>(null);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [combatResult, setCombatResult] = useState<CombatResult | null>(null);
  const [showCurseModal, setShowCurseModal] = useState(false);
  const [showMinigame, setShowMinigame] = useState<WorldItem | null>(null);
  const [isSeaGameMode, setIsSeaGameMode] = useState(false);
  const [isChallengeActive, setIsChallengeActive] = useState(false);
  const [isFortressStorageOpen, setIsFortressStorageOpen] = useState(false);
  const [fortressStorageMode, setFortressStorageMode] = useState<StorageAccessMode>('fortress');
  const [globalSettings, setGlobalSettings] = useState<any>({ speedMultiplier: 1.0 });
  const [isMoving, setIsMoving] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [draggingItem, setDraggingItem] = useState<SeaItem | null>(null);
  const [isItemDragging, setIsItemDragging] = useState(false);
  const [preGeneratedMinigame, setPreGeneratedMinigame] = useState<{ type: string, grid: any } | null>(null);
  const [openBackpackHandler, setOpenBackpackHandler] = useState<(() => void) | null>(null);

  const openBackpack = useCallback(() => {
    if (openBackpackHandler) {
      openBackpackHandler();
    }
  }, [openBackpackHandler]);
  const API = getBaseUrl();

  useEffect(() => {
    // Tiền tạo grid khi người dùng ở gần vật phẩm thế giới hoặc định kỳ
    if (!isSeaGameMode) return;
    
    const prepareMinigame = () => {
      if (preGeneratedMinigame) return; // Đã có rồi
      
      const tier = state.worldTier;
      const innerRows = Math.min(7, 4 + Math.floor(tier / 2));
      const innerCols = Math.min(7, 4 + Math.ceil(tier / 2));
      const grid = generateSolvableFruitGrid(innerRows, innerCols);
      setPreGeneratedMinigame({ type: 'fishing', grid });
    };

    const interval = setInterval(prepareMinigame, 5000);
    return () => clearInterval(interval);
  }, [isSeaGameMode, preGeneratedMinigame, state.worldTier]);

  const loadState = useCallback(async () => {
    if (!deviceId) return;
    try {
      const res = await fetch(`${API}/api/sea/state?deviceId=${encodeURIComponent(deviceId)}`);
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
            console.log('[SeaGame] Repaired bag data:', bag);
          }
        } else {
          // No bags at all — create a default starter bag client-side
          const bag = createStarterBag();
          bags = [bag];
          didRepairBags = true;
          console.log('[SeaGame] Created default starter bag:', bag);
        }
        if (didRepairBags) {
          void fetch(`${API}/api/sea/bags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId, bags }),
          }).catch(err => console.error('[SeaGame] save repaired bag error:', err));
        }
        setState({
          initialized: s.fortress_lat != null,
          fortressLat: s.fortress_lat, fortressLng: s.fortress_lng,
          currentLat: s.current_lat, currentLng: s.current_lng,
          baseMaxHp: s.base_max_hp || 100, currentHp: s.current_hp || 100,
          moveSpeed: s.move_speed || 1.0, inventoryWidth: s.inventory_width || 6, inventoryHeight: s.inventory_height || 4,
          cursePercent: s.curse_percent || 0, seaGold: s.sea_gold || 0, worldTier: s.world_tier || 1,
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
    } catch (err) { console.error('[SeaGame] loadState error:', err); }
  }, [deviceId, API]);

  const initGame = useCallback(async (lat: number, lng: number) => {
    if (!deviceId) return;
    try {
      const res = await fetch(`${API}/api/sea/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, lat, lng }),
      });
      await res.json();
      await loadState();
    } catch (err) { console.error('[SeaGame] initGame error:', err); }
  }, [deviceId, API, loadState, state.inventory, state.worldTier]);

  const moveBoat = useCallback(async (toLat: number, toLng: number) => {
    if (!deviceId) return { curseTrigger: false, encounter: null };
    setIsMoving(true);
    try {
      const res = await fetch(`${API}/api/sea/move`, {
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
      console.error('[SeaGame] moveBoat error:', err);
      return { curseTrigger: false, encounter: null };
    } finally { setIsMoving(false); }
  }, [deviceId, API, state.fortressLat, state.fortressLng]);

  const saveInventory = useCallback(async (inventory: SeaItem[]) => {
    if (!deviceId) return;
    
    // Optimistic Update using ref-like variable from prev state
    let previousInventory: SeaItem[] = [];
    setState(prev => {
      previousInventory = prev.inventory;
      return { ...prev, inventory };
    });

    try {
      const res = await fetch(`${API}/api/sea/inventory`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, inventory }),
      });
      if (!res.ok) throw new Error('Save failed');
    } catch (err) { 
      console.error('[SeaGame] saveInventory error:', err);
      setState(prev => ({ ...prev, inventory: previousInventory }));
    }
  }, [deviceId, API]);

  const saveStorage = useCallback(async (storage: SeaItem[]) => {
    if (!deviceId) return;
    
    let previousStorage: SeaItem[] = [];
    setState(prev => {
      previousStorage = prev.storage;
      return { ...prev, storage };
    });

    try {
      const res = await fetch(`${API}/api/sea/storage_layout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, storage }),
      });
      if (!res.ok) throw new Error('Save failed');
    } catch (err) { 
      console.error('[SeaGame] saveStorage error:', err);
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
      const res = await fetch(`${API}/api/sea/bags`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, bags }),
      });
      if (!res.ok) throw new Error('Save failed');
    } catch (err) {
      console.error('[SeaGame] saveBags error:', err);
      setState(prev => ({ ...prev, bags: previousBags }));
    }
  }, [deviceId, API]);

  const pickupItem = useCallback(async (spawnId: string) => {
    if (!deviceId) return false;
    
    // Optimistic: Xóa vật phẩm khỏi bản đồ ngay lập tức
    setWorldItems(prev => prev.filter(i => i.spawnId !== spawnId));

    try {
      const res = await fetch(`${API}/api/sea/pickup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, spawnId }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.type === 'bag' || data.type === 'item') {
          const itemData = data.type === 'bag' ? { ...data.bag, type: 'bag', gridW: 2, gridH: 2 } : data.item;
          const floatingItem = { ...itemData, gridX: -1, gridY: -1 };
          // Use functional setState to always get latest inventory (fix stale closure)
          setState(prev => {
            const newInventory = [...prev.inventory, floatingItem];
            // Fire-and-forget save with the correct inventory
            fetch(`${API}/api/sea/inventory`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ deviceId, inventory: newInventory }),
            }).catch(err => console.error('[Sea Pickup] save error:', err));
            return { ...prev, inventory: newInventory, cursePercent: data.cursePercent };
          });
          setPickupRewardItem(floatingItem);
        }
        return true;
      }
      return false;
    } catch (err: any) {
      if (err.message?.includes('400') || err.message?.includes('Too far')) {
        console.warn('[Sea Pickup] Too far, skipping');
      } else {
        console.error('[Sea Pickup] error:', err);
      }
      return false;
    }
  }, [deviceId, API]);

  const inflictMinigamePenalty = useCallback(async (spawnId: string) => {
    if (!deviceId) return false;
    // Optimistic: Xóa vật phẩm ngay lập tức
    setWorldItems(prev => prev.filter(i => i.spawnId !== spawnId));
    try {
      const res = await fetch(`${API}/api/sea/minigame-lose`, {
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
      console.error('[SeaGame] minigamePenalty error:', err);
      return false;
    }
  }, [deviceId, API]);

  const destroyItem = useCallback(async (spawnId: string) => {
    if (!deviceId) return false;
    // Optimistic: Xóa vật phẩm ngay lập tức
    setWorldItems(prev => prev.filter(i => i.spawnId !== spawnId));
    try {
      const res = await fetch(`${API}/api/sea/destroy-item`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, spawnId }),
      });
      const data = await res.json();
      if (data.success) {
        return true;
      }
      return false;
    } catch (err) {
      console.error('[SeaGame] destroyItem error:', err);
      return false;
    }
  }, [deviceId, API]);


  const acceptBagSwap = useCallback(async (newBag: BagItem) => {
    const oldBag = state.bags[0];
    
    // Determine which items need to be pushed out
    const bagShape = newBag.shape || [];
    let newInventory = state.inventory.map(item => {
      if (item.gridX < 0) return item; // Already staging
      let inBounds = true;
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
      if (!inBounds) {
        return { ...item, gridX: -1, gridY: -1 };
      }
      return item;
    });

    // If there was an old bag, convert it back to a SeaItem and put it in staging
    if (oldBag && !oldBag.isStarter) {
      const oldBagAsItem: SeaItem = {
        uid: oldBag.uid || Math.random().toString(36).substring(2, 10),
        id: oldBag.id,
        name: oldBag.name,
        icon: oldBag.icon,
        rarity: oldBag.rarity,
        tier: 0, // Bags don't have tiers usually
        price: oldBag.price || 0,
        weight: oldBag.weight || 0,
        hpBonus: oldBag.hpBonus || 0,
        energyMax: oldBag.energyMax || 0,
        energyRegen: oldBag.energyRegen || 0,
        gridW: 2, // Bags take 2x2 in inventory
        gridH: 2,
        rotated: false,
        gridX: -1,
        gridY: -1,
        type: 'bag',
        width: oldBag.width,
        height: oldBag.height,
        shape: oldBag.shape,
      } as any;
      // Remove the new bag from inventory if it was there
      newInventory = newInventory.filter(i => i.uid !== newBag.uid);
      newInventory.push(oldBagAsItem);
    } else {
      // Just remove the new bag from inventory
      newInventory = newInventory.filter(i => i.uid !== newBag.uid);
    }

    await saveBags([newBag]);
    await saveInventory(newInventory);
    setPendingBagSwap(null);
  }, [state.inventory, state.bags, saveBags, saveInventory]);

  const confirmDiscard = useCallback(async () => {
    // Delete floating items using functional update to get current inventory
    let inventoryToSave: SeaItem[] = [];
    setState(prev => {
      inventoryToSave = prev.inventory.filter(i => i.gridX >= 0);
      return { ...prev, inventory: inventoryToSave };
    });
    
    await saveInventory(inventoryToSave);
    setShowDiscardModal(false);
  }, [saveInventory]);

  const executeCombat = useCallback(async (opponentId: string, opponentInventory?: SeaItem[], opponentHp?: number, opponentBags?: BagItem[]) => {
    if (!deviceId) throw new Error('No device');
    const normalizedOpponentId = opponentId || '';
    const isBotOpponent = normalizedOpponentId.startsWith('bot_');
    const res = await fetch(`${API}/api/sea/combat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
      }),
    });
    const data = await res.json();
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
    const res = await fetch(`${API}/api/sea/curse-choice`, {
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
    const previousGold = state.seaGold;
    
    const itemsToSell = state.inventory.filter(i => itemUids.includes(i.uid));
    const totalGain = itemsToSell.reduce((sum, i) => sum + (i.price || 0), 0);
    
    setState(prev => ({
      ...prev,
      inventory: prev.inventory.filter(i => !itemUids.includes(i.uid)),
      seaGold: prev.seaGold + totalGain,
    }));

    try {
      const res = await fetch(`${API}/api/sea/sell`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, itemUids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Sell failed');
      setState(prev => ({
        ...prev,
        inventory: Array.isArray(data.remaining) ? data.remaining : prev.inventory,
        seaGold: typeof data.seaGold === 'number' ? data.seaGold : prev.seaGold,
      }));
      // Không cần loadState() nữa vì đã update ở trên, 
      // trừ khi muốn đồng bộ chính xác tuyệt đối sau khi server xử lý.
    } catch (err) {
      console.error('[SeaGame] sellItems error:', err);
      showNotification(err instanceof Error ? err.message : 'Ban vat pham that bai', 'error');
      // Rollback
      setState(prev => ({ ...prev, inventory: previousInventory, seaGold: previousGold }));
    }
  }, [deviceId, API, state.inventory, state.seaGold, showNotification]);

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
      const res = await fetch(`${API}/api/sea/store`, {
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
      const res = await fetch(`${API}/api/sea/return-fortress`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Return to fortress failed');
      }
      await loadState();
    } catch (err) {
      console.error('[SeaGame] returnToFortress error:', err);
      // Rollback
      setState(prev => ({ ...prev, currentLat: prevLat, currentLng: prevLng }));
      setIsChallengeActive(prevActive);
    }
  }, [deviceId, API, state.currentLat, state.currentLng, state.fortressLat, state.fortressLng, isChallengeActive, loadState]);

  const loadWorldItems = useCallback(async (forceActive?: boolean) => {
    if (!deviceId) return;
    try {
      const res = await fetch(`${API}/api/sea/world-items?deviceId=${encodeURIComponent(deviceId)}`);
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
    } catch (err) { console.error('[SeaGame] loadWorldItems error:', err); }
  }, [deviceId, API, isChallengeActive, state.currentLat, state.currentLng, state.fortressLat, state.fortressLng]);

  useEffect(() => {
    if (!deviceId || !state.initialized || !isChallengeActive) return;
    void loadWorldItems(true);
  }, [deviceId, state.initialized, state.currentLat, state.currentLng, isChallengeActive, loadWorldItems]);

  const setWorldTier = useCallback(async (tier: number) => {
    if (!deviceId) return;
    
    // Optimistic Update
    const TIER_COSTS = [0, 10, 100, 1000, 10000, 100000];
    const cost = TIER_COSTS[tier] || 0;
    
    const previousTier = state.worldTier;
    const previousGold = state.seaGold;

    setState(prev => ({
      ...prev,
      worldTier: tier,
      lootGold: Math.max(0, prev.lootGold - cost),
    }));

    try {
      const res = await fetch(`${API}/api/sea/set-tier`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, tier }),
      });
      const data = await res.json();
      if (data.success) {
        setState(prev => ({
          ...prev,
          worldTier: data.tier,
          lootGold: data.seaGold || data.lootGold,
          cursePercent: data.cursePercent,
        }));
      } else {
        throw new Error('Tier upgrade failed');
      }
    } catch (err: any) {
      showNotification(err.message || 'Nâng cấp vùng biển thất bại', 'error');
      // Rollback
      setState(prev => ({ ...prev, worldTier: previousTier, seaGold: previousGold }));
    }
    
    // Force challenge active AFTER loadState (loadState resets it based on position)
    setIsChallengeActive(true);
    // Load world items for the new tier (force=true to bypass stale closure)
    await loadWorldItems(true);
  }, [deviceId, API, state.worldTier, state.seaGold, loadWorldItems]);

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
    setIsFortressStorageOpen(true);
  }, []);

  const value: SeaGameContextType = useMemo(() => ({
    state, worldItems,
    isFortressStorageOpen, setIsFortressStorageOpen, fortressStorageMode,
    pickupRewardItem, setPickupRewardItem,
    pendingBagSwap, setPendingBagSwap, acceptBagSwap,
    encounter, setEncounter,
    combatResult, setCombatResult, showCurseModal, setShowCurseModal,
    showMinigame, setShowMinigame,
    isSeaGameMode,
    setIsSeaGameMode,
    openBackpack,
    setOpenBackpackHandler,
    isItemDragging,
    setIsItemDragging,
    isChallengeActive, setIsChallengeActive,
    preGeneratedMinigame,
    setPreGeneratedMinigame,
    globalSettings,
    isMoving, showDiscardModal, setShowDiscardModal, confirmDiscard,
    initGame, loadState, moveBoat, pickupItem, inflictMinigamePenalty, destroyItem, saveInventory, saveStorage, saveBags,
    executeCombat, curseChoice, sellItems, storeItems, setWorldTier, returnToFortress, loadWorldItems,
    showNotification, draggingItem, setDraggingItem,
    openFortressStorage,
  }), [
    state, worldItems, isFortressStorageOpen, fortressStorageMode, pickupRewardItem, pendingBagSwap,
    acceptBagSwap, encounter, combatResult, showCurseModal, showMinigame, isSeaGameMode, openBackpack,
    setOpenBackpackHandler, isItemDragging, isChallengeActive, preGeneratedMinigame, globalSettings,
    isMoving, showDiscardModal, confirmDiscard, initGame, loadState, moveBoat, pickupItem,
    inflictMinigamePenalty, destroyItem, saveInventory, saveStorage, saveBags, executeCombat,
    curseChoice, sellItems, storeItems, setWorldTier, returnToFortress, loadWorldItems,
    showNotification, draggingItem, openFortressStorage
  ]);

  return <SeaGameContext.Provider value={value}>{children}</SeaGameContext.Provider>;
};

export default SeaGameProvider;
