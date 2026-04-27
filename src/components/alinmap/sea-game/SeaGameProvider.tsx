import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  isSeaGameMode: boolean;
  setIsSeaGameMode: (v: boolean) => void;
  isChallengeActive: boolean;
  setIsChallengeActive: (v: boolean) => void;
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
  executeCombat: (opponentId: string, opponentInventory?: SeaItem[], opponentHp?: number) => Promise<CombatResult>;
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
}

const defaultState: SeaGameState = {
  initialized: false, fortressLat: null, fortressLng: null, currentLat: null, currentLng: null,
  baseMaxHp: 100, currentHp: 100, moveSpeed: 1.0, inventoryWidth: 6, inventoryHeight: 4,
  cursePercent: 0, seaGold: 0, worldTier: 1, inventory: [], storage: [], bags: [], distance: 0,
  energyMax: 100, energyCurrent: 100,
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
}

export const SeaGameProvider: React.FC<SeaGameProviderProps> = ({ children, deviceId }) => {
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
          inventory: (() => { try { return JSON.parse(s.inventory_json || '[]'); } catch(e) { return []; } })(),
          storage: (() => { try { return JSON.parse(s.storage_json || '[]'); } catch(e) { return []; } })(),
          bags,
          distance: s.distance || 0, energyMax: s.energy_max || 100, energyCurrent: s.energy_current || 100,
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

  const pickupItem = useCallback(async (spawnId: string) => {
    if (!deviceId) return false;
    try {
      const res = await fetch(`${API}/api/sea/pickup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, spawnId }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.type === 'grid_expander') {
          setState(prev => ({
            ...prev,
            cursePercent: data.cursePercent,
            inventoryWidth: data.newWidth,
            inventoryHeight: data.newHeight,
          }));
        } else if (data.type === 'bag') {
          setState(prev => ({ ...prev, cursePercent: data.cursePercent }));
          setPendingBagSwap(data.bag);
        } else if (data.type === 'item') {
          const floatingItem = { ...data.item, gridX: -1, gridY: -1 };
          const newInventory = [...state.inventory, floatingItem];
          await fetch(`${API}/api/sea/inventory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId, inventory: newInventory }),
          });
          setState(prev => ({ ...prev, cursePercent: data.cursePercent, inventory: newInventory }));
          setPickupRewardItem(floatingItem);
        }
        setWorldItems(prev => prev.filter(i => i.spawnId !== spawnId));
        return true;
      }
      return false;
    } catch (err) {
      console.error('[SeaGame] pickupItem error:', err);
      return false;
    }
  }, [deviceId, API, state.inventory]);

  const inflictMinigamePenalty = useCallback(async (spawnId: string) => {
    if (!deviceId) return false;
    try {
      const res = await fetch(`${API}/api/sea/minigame-lose`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, spawnId }),
      });
      const data = await res.json();
      if (data.success) {
        setState(prev => ({ ...prev, cursePercent: data.cursePercent }));
        setWorldItems(prev => prev.filter(i => i.spawnId !== spawnId));
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
    try {
      const res = await fetch(`${API}/api/sea/destroy-item`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, spawnId }),
      });
      const data = await res.json();
      if (data.success) {
        setWorldItems(prev => prev.filter(i => i.spawnId !== spawnId));
        return true;
      }
      return false;
    } catch (err) {
      console.error('[SeaGame] destroyItem error:', err);
      return false;
    }
  }, [deviceId, API]);

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

    await saveBags([newBag]);
    await saveInventory(newItems);
    setPendingBagSwap(null);
  }, [state.inventory, saveBags, saveInventory]);

  const confirmDiscard = useCallback(async () => {
    // Delete floating items
    const validItems = state.inventory.filter(i => i.gridX >= 0);
    await saveInventory(validItems);
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

  const storeItems = useCallback(async (itemUids: string[], action: 'store' | 'retrieve', mode: StorageAccessMode = 'fortress', gridX?: number, gridY?: number) => {
    if (!deviceId) return;
    await fetch(`${API}/api/sea/store`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, itemUids, action, mode, gridX, gridY }),
    });
    await loadState();
  }, [deviceId, API, loadState]);

  const returnToFortress = useCallback(async () => {
    if (!deviceId) return;
    const res = await fetch(`${API}/api/sea/return-fortress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    });
    const data = await res.json();
    if (!data.success) {
      console.error('[SeaGame] returnToFortress failed:', data.error);
      return;
    }
    await loadState();
    setIsChallengeActive(false);
  }, [deviceId, API, loadState]);

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

  useEffect(() => {
    const portalItems = createPortalWorldItems(state.fortressLat, state.fortressLng, state.currentLat, state.currentLng);
    setWorldItems((prev) => {
      const normalItems = prev.filter((item) => (item as any)?.item?.type !== 'portal');
      return [...portalItems, ...normalItems];
    });
  }, [state.currentLat, state.currentLng, state.fortressLat, state.fortressLng]);

  // Auto-load state when deviceId is available
  useEffect(() => { if (deviceId) loadState(); }, [deviceId, loadState]);

  const value: SeaGameContextType = {
    state, worldItems,
    isFortressStorageOpen, setIsFortressStorageOpen, fortressStorageMode,
    pickupRewardItem, setPickupRewardItem,
    pendingBagSwap, setPendingBagSwap, acceptBagSwap,
    encounter, setEncounter,
    combatResult, setCombatResult, showCurseModal, setShowCurseModal,
    showMinigame, setShowMinigame, isSeaGameMode, setIsSeaGameMode,
    isChallengeActive, setIsChallengeActive, globalSettings,
    isMoving, showDiscardModal, setShowDiscardModal, confirmDiscard,
    initGame, loadState, moveBoat, pickupItem, inflictMinigamePenalty, destroyItem, saveInventory, saveStorage, saveBags,
    executeCombat, curseChoice, sellItems, storeItems, setWorldTier, returnToFortress, loadWorldItems,
    openFortressStorage: (mode: StorageAccessMode = 'fortress') => {
      setFortressStorageMode(mode);
      setIsFortressStorageOpen(true);
    },
  };

  return <SeaGameContext.Provider value={value}>{children}</SeaGameContext.Provider>;
};

export default SeaGameProvider;
