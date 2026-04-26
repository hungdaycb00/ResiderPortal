import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getBaseUrl } from '../../../services/externalApi';

// ==========================================
// Types
// ==========================================
export interface SeaItem {
  uid: string;
  id: string;
  name: string;
  icon: string;
  rarity: string;
  tier: number;
  price: number;
  weight: number;
  hpBonus: number;
  energyMax: number;
  energyRegen: number;
  gridW: number;
  gridH: number;
  rotated: boolean;
  gridX: number;
  gridY: number;
  floatX?: number;
  floatY?: number;
}

export interface GridExpander {
  id: string;
  name: string;
  icon: string;
  expandW: number;
  expandH: number;
  type: 'grid_expander';
}

export interface BagItem {
  uid: string;
  id: string;
  name: string;
  icon: string;
  rarity: string;
  gridX: number;
  gridY: number;
  rotated: boolean;
  shape: boolean[][];
  width: number;
  height: number;
  cells?: number;
  type?: 'bag';
}

export const MAX_GRID_W = 7;
export const MAX_GRID_H = 6;

export interface WorldItem {
  spawnId: string;
  lat: number;
  lng: number;
  isExpander: boolean;
  minigameType: 'fishing' | 'diving' | 'chest';
  item: SeaItem | GridExpander | BagItem;
}

export interface Encounter {
  type: 'player' | 'bot';
  id: string;
  name: string;
  avatar?: string;
  inventory: SeaItem[];
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
}

interface SeaGameContextType {
  state: SeaGameState;
  worldItems: WorldItem[];
  isBackpackOpen: boolean;
  setIsBackpackOpen: (v: boolean) => void;
  isFortressStorageOpen: boolean;
  setIsFortressStorageOpen: (v: boolean) => void;
  openFortressStorage: () => void;
  stagingItem: SeaItem | null;
  setStagingItem: (item: SeaItem | null) => void;
  encounter: Encounter | null;
  setEncounter: (e: Encounter | null) => void;
  combatResult: CombatResult | null;
  setCombatResult: (r: CombatResult | null) => void;
  showCurseModal: boolean;
  setShowCurseModal: (v: boolean) => void;
  showMinigame: WorldItem | null;
  setShowMinigame: (item: WorldItem | null) => void;
  isSeaGameMode: boolean;
  setIsSeaGameMode: (v: boolean) => void;
  isChallengeActive: boolean;
  setIsChallengeActive: (v: boolean) => void;
  globalSettings: any;
  // Actions
  initGame: (lat: number, lng: number) => Promise<void>;
  loadState: () => Promise<void>;
  moveBoat: (toLat: number, toLng: number) => Promise<{ curseTrigger: boolean; encounter: Encounter | null }>;
  pickupItem: (spawnId: string) => Promise<void>;
  saveInventory: (inventory: SeaItem[]) => Promise<void>;
  saveStorage: (storage: SeaItem[]) => Promise<void>;
  saveBags: (bags: BagItem[]) => Promise<void>;
  pendingBagSwap: BagItem | null;
  setPendingBagSwap: (bag: BagItem | null) => void;
  acceptBagSwap: (newBag: BagItem) => void;
  executeCombat: (opponentId: string, opponentInventory?: SeaItem[], opponentHp?: number) => Promise<CombatResult>;
  curseChoice: (choice: 'flee' | 'challenge') => Promise<void>;
  sellItems: (itemUids: string[]) => Promise<void>;
  storeItems: (itemUids: string[], action: 'store' | 'retrieve') => Promise<void>;
  setWorldTier: (tier: number) => Promise<void>;
  loadWorldItems: (forceActive?: boolean) => Promise<void>;
  isMoving: boolean;
  showDiscardModal: boolean;
  setShowDiscardModal: (v: boolean) => void;
  confirmDiscard: () => void;
  upgradeBag: () => Promise<void>;
}

const defaultState: SeaGameState = {
  initialized: false, fortressLat: null, fortressLng: null, currentLat: null, currentLng: null,
  baseMaxHp: 100, currentHp: 100, moveSpeed: 1.0, inventoryWidth: 6, inventoryHeight: 4,
  cursePercent: 0, seaGold: 0, worldTier: 1, inventory: [], storage: [], bags: [], distance: 0,
  energyMax: 100, energyCurrent: 100,
};

const countBagCells = (shape: unknown): number => {
  if (!Array.isArray(shape)) return 0;
  return shape.reduce<number>((sum, row) => {
    if (!Array.isArray(row)) return sum;
    return sum + row.filter(Boolean).length;
  }, 0);
};

const createStarterBag = (existing?: Partial<BagItem>): BagItem => ({
  uid: existing?.uid || Math.random().toString(36).substring(2, 10),
  id: 'basic_bag',
  name: existing?.name || 'Balo Cơ Bản',
  icon: existing?.icon || '🎒',
  rarity: existing?.rarity || 'common',
  gridX: Math.floor((MAX_GRID_W - 3) / 2),
  gridY: Math.floor((MAX_GRID_H - 3) / 2),
  rotated: existing?.rotated ?? false,
  shape: [[true, true, true], [true, true, true], [true, true, true]],
  width: 3,
  height: 3,
  cells: 9,
  type: 'bag',
});

const repairBagData = (rawBag?: BagItem): { bag: BagItem; repaired: boolean } => {
  if (!rawBag) return { bag: createStarterBag(), repaired: true };

  const bag: BagItem = { ...rawBag };
  let repaired = false;
  const width = Number(bag.width) || 3;
  const height = Number(bag.height) || 3;

  if (!Array.isArray(bag.shape) || bag.shape.length === 0) {
    bag.shape = Array.from({ length: height }, () => Array(width).fill(true));
    bag.width = width;
    bag.height = height;
    repaired = true;
  }

  const shapeCells = countBagCells(bag.shape);
  if (width === 3 && height === 3 && shapeCells !== 9) {
    return { bag: createStarterBag(bag), repaired: true };
  }

  if (bag.width !== width) { bag.width = width; repaired = true; }
  if (bag.height !== height) { bag.height = height; repaired = true; }
  const currentCells = countBagCells(bag.shape);
  if (bag.cells !== currentCells) { bag.cells = currentCells; repaired = true; }

  const correctX = Math.floor((MAX_GRID_W - bag.width) / 2);
  const correctY = Math.floor((MAX_GRID_H - bag.height) / 2);
  if (bag.gridX !== correctX || bag.gridY !== correctY) {
    bag.gridX = correctX;
    bag.gridY = correctY;
    repaired = true;
  }
  if (!bag.uid) { bag.uid = Math.random().toString(36).substring(2, 10); repaired = true; }
  if (!bag.id) { bag.id = 'basic_bag'; repaired = true; }
  if (!bag.name) { bag.name = 'Balo Cơ Bản'; repaired = true; }
  if (!bag.icon) { bag.icon = '🎒'; repaired = true; }
  if (!bag.rarity) { bag.rarity = 'common'; repaired = true; }

  return { bag, repaired };
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
}

export const SeaGameProvider: React.FC<SeaGameProviderProps> = ({ children, deviceId }) => {
  const [state, setState] = useState<SeaGameState>(defaultState);
  const [worldItems, setWorldItems] = useState<WorldItem[]>([]);
  const [isBackpackOpen, setIsBackpackOpen] = useState(false);
  const [stagingItem, setStagingItem] = useState<SeaItem | null>(null);
  const [pendingBagSwap, setPendingBagSwap] = useState<BagItem | null>(null);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [combatResult, setCombatResult] = useState<CombatResult | null>(null);
  const [showCurseModal, setShowCurseModal] = useState(false);
  const [showMinigame, setShowMinigame] = useState<WorldItem | null>(null);
  const [isSeaGameMode, setIsSeaGameMode] = useState(false);
  const [isChallengeActive, setIsChallengeActive] = useState(false);
  const [isFortressStorageOpen, setIsFortressStorageOpen] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<any>({ speedMultiplier: 1.0 });
  const [isMoving, setIsMoving] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const API = getBaseUrl();

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
          inventory: JSON.parse(s.inventory_json || '[]'), storage: JSON.parse(s.storage_json || '[]'),
          bags,
          distance: s.distance || 0, energyMax: s.energy_max || 100, energyCurrent: s.energy_current || 100,
        });
        if (data.settings) {
          setGlobalSettings(data.settings);
        }
        
        const isAtFortress = s.current_lat === s.fortress_lat && s.current_lng === s.fortress_lng;
        if (!isAtFortress) {
            setIsChallengeActive(true);
        } else {
            setIsChallengeActive(false);
        }
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
  }, [deviceId, API, loadState]);

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
        setState(prev => ({
          ...prev,
          currentLat: toLat,
          currentLng: toLng,
          cursePercent: data.cursePercent,
          distance: prev.distance + (data.distMeters || 0),
        }));

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
  }, [deviceId, API]);

  const pickupItem = useCallback(async (spawnId: string) => {
    if (!deviceId) return;
    try {
      const res = await fetch(`${API}/api/sea/pickup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, spawnId }),
      });
      const data = await res.json();
      if (data.success) {
        setState(prev => ({ ...prev, cursePercent: data.cursePercent }));
        if (data.type === 'grid_expander') {
          setState(prev => ({ ...prev, inventoryWidth: data.newWidth, inventoryHeight: data.newHeight }));
        } else if (data.type === 'bag') {
          setPendingBagSwap(data.bag);
        } else if (data.type === 'item') {
          const floatingItem = { ...data.item, gridX: -1, gridY: -1 };
          const newInventory = [...state.inventory, floatingItem];
          setState(prev => ({ ...prev, inventory: newInventory }));
          setStagingItem(null);
          await fetch(`${API}/api/sea/inventory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId, inventory: newInventory }),
          });
        }
        setWorldItems(prev => prev.filter(i => i.spawnId !== spawnId));
      }
    } catch (err) { console.error('[SeaGame] pickupItem error:', err); }
  }, [deviceId, API, state.inventory]);

  const saveInventory = useCallback(async (inventory: SeaItem[]) => {
    if (!deviceId) return;
    try {
      await fetch(`${API}/api/sea/inventory`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, inventory }),
      });
      setState(prev => ({ ...prev, inventory }));
    } catch (err) { console.error('[SeaGame] saveInventory error:', err); }
  }, [deviceId, API]);

  const saveStorage = useCallback(async (storage: SeaItem[]) => {
    if (!deviceId) return;
    try {
      await fetch(`${API}/api/sea/storage_layout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, storage }),
      });
      setState(prev => ({ ...prev, storage }));
    } catch (err) { console.error('[SeaGame] saveStorage error:', err); }
  }, [deviceId, API]);

  const saveBags = useCallback(async (bags: BagItem[]) => {
    if (!deviceId) return;
    try {
      await fetch(`${API}/api/sea/bags`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, bags }),
      });
      setState(prev => ({ ...prev, bags }));
    } catch (err) { console.error('[SeaGame] saveBags error:', err); }
  }, [deviceId, API]);

  const acceptBagSwap = useCallback(async (newBag: BagItem) => {
    // Determine which items need to be pushed out
    const bagShape = newBag.shape || [];
    const newItems = state.inventory.map(item => {
      if (item.gridX < 0) return item; // Already staging
      let inBounds = true;
      for (let r = 0; r < item.gridH; r++) {
        for (let c = 0; c < item.gridW; c++) {
          const br = item.gridY + r - newBag.gridY;
          const bc = item.gridX + c - newBag.gridX;
          if (br < 0 || br >= newBag.height || bc < 0 || bc >= newBag.width || !bagShape[br][bc]) {
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

    await saveBags([newBag]);
    await saveInventory(newItems);
    setPendingBagSwap(null);
  }, [state.inventory, saveBags, saveInventory]);

  const confirmDiscard = useCallback(async () => {
    // Delete floating items
    const validItems = state.inventory.filter(i => i.gridX >= 0);
    await saveInventory(validItems);
    setStagingItem(null);
    setShowDiscardModal(false);
  }, [state.inventory, saveInventory]);

  const executeCombat = useCallback(async (opponentId: string, opponentInventory?: SeaItem[], opponentHp?: number) => {
    if (!deviceId) throw new Error('No device');
    const res = await fetch(`${API}/api/sea/combat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, opponentId, opponentInventory, opponentHp }),
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
  }, [deviceId, API, loadState]);

  const curseChoice = useCallback(async (choice: 'flee' | 'challenge') => {
    if (!deviceId) return;
    const res = await fetch(`${API}/api/sea/curse-choice`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, choice }),
    });
    const data = await res.json();
    if (data.success && choice === 'flee') {
      await loadState();
    }
    setShowCurseModal(false);
  }, [deviceId, API, loadState]);

  const sellItems = useCallback(async (itemUids: string[]) => {
    if (!deviceId) return;
    await fetch(`${API}/api/sea/sell`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, itemUids }),
    });
    await loadState();
  }, [deviceId, API, loadState]);

  const storeItems = useCallback(async (itemUids: string[], action: 'store' | 'retrieve') => {
    if (!deviceId) return;
    await fetch(`${API}/api/sea/store`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, itemUids, action }),
    });
    await loadState();
  }, [deviceId, API, loadState]);

  const loadWorldItems = useCallback(async (forceActive?: boolean) => {
    if (!deviceId) return;
    try {
      const res = await fetch(`${API}/api/sea/world-items?deviceId=${encodeURIComponent(deviceId)}`);
      const data = await res.json();
      if (data.success) {
          let items = data.items;
          if (!forceActive && !isChallengeActive) {
              items = items.slice(0, 3);
          }
          setWorldItems(items);
      }
    } catch (err) { console.error('[SeaGame] loadWorldItems error:', err); }
  }, [deviceId, API, isChallengeActive]);

  const setWorldTier = useCallback(async (tier: number) => {
    if (!deviceId) return;
    const res = await fetch(`${API}/api/sea/set-tier`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, tier }),
    });
    const data = await res.json();
    if (!data.success) {
      console.error('[SeaGame] setWorldTier failed:', data.error);
      return;
    }
    await loadState();
    // Force challenge active AFTER loadState (loadState resets it based on position)
    setIsChallengeActive(true);
    // Load world items for the new tier (force=true to bypass stale closure)
    await loadWorldItems(true);
  }, [deviceId, API, loadState, loadWorldItems]);

  const upgradeBag = useCallback(async () => {
    if (!deviceId) return;
    try {
      const res = await fetch(`${API}/api/sea/upgrade-bag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });
      const data = await res.json();
      if (data.success) {
        setState(prev => {
          const newBags = [...prev.bags];
          newBags[0] = data.bag;
          return { ...prev, bags: newBags, seaGold: prev.seaGold - data.goldSpent };
        });
      } else {
        alert(data.error);
      }
    } catch (err) { console.error('[SeaGame] upgradeBag error:', err); }
  }, [deviceId, API]);

  // Auto-load state when deviceId is available
  useEffect(() => { if (deviceId) loadState(); }, [deviceId, loadState]);

  const value: SeaGameContextType = {
    state, worldItems, isBackpackOpen, setIsBackpackOpen,
    stagingItem, setStagingItem, pendingBagSwap, setPendingBagSwap, acceptBagSwap,
    encounter, setEncounter,
    combatResult, setCombatResult, showCurseModal, setShowCurseModal,
    showMinigame, setShowMinigame, isSeaGameMode, setIsSeaGameMode,
    isChallengeActive, setIsChallengeActive, globalSettings,
    isMoving, showDiscardModal, setShowDiscardModal, confirmDiscard,
    initGame, loadState, moveBoat, pickupItem, saveInventory, saveStorage, saveBags,
    executeCombat, curseChoice, sellItems, storeItems, setWorldTier, loadWorldItems,
    upgradeBag, isFortressStorageOpen, setIsFortressStorageOpen,
    openFortressStorage: () => setIsFortressStorageOpen(true),
  };

  return <SeaGameContext.Provider value={value}>{children}</SeaGameContext.Provider>;
};

export default SeaGameProvider;
