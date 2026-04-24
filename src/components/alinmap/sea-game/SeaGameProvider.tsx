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
}

export interface GridExpander {
  id: string;
  name: string;
  icon: string;
  expandW: number;
  expandH: number;
  type: 'grid_expander';
}

export interface WorldItem {
  spawnId: string;
  lat: number;
  lng: number;
  isExpander: boolean;
  minigameType: 'fishing' | 'diving' | 'chest';
  item: SeaItem | GridExpander;
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
  distance: number;
  energyMax: number;
  energyCurrent: number;
}

interface SeaGameContextType {
  state: SeaGameState;
  worldItems: WorldItem[];
  isBackpackOpen: boolean;
  setIsBackpackOpen: (v: boolean) => void;
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
  globalSettings: any;
  // Actions
  initGame: (lat: number, lng: number) => Promise<void>;
  loadState: () => Promise<void>;
  moveBoat: (toLat: number, toLng: number) => Promise<{ curseTrigger: boolean; encounter: Encounter | null }>;
  pickupItem: (spawnId: string) => Promise<void>;
  saveInventory: (inventory: SeaItem[]) => Promise<void>;
  executeCombat: (opponentId: string, opponentInventory?: SeaItem[], opponentHp?: number) => Promise<CombatResult>;
  curseChoice: (choice: 'flee' | 'challenge') => Promise<void>;
  sellItems: (itemUids: string[]) => Promise<void>;
  storeItems: (itemUids: string[], action: 'store' | 'retrieve') => Promise<void>;
  setWorldTier: (tier: number) => Promise<void>;
  loadWorldItems: () => Promise<void>;
  isMoving: boolean;
}

const defaultState: SeaGameState = {
  initialized: false, fortressLat: null, fortressLng: null, currentLat: null, currentLng: null,
  baseMaxHp: 100, currentHp: 100, moveSpeed: 1.0, inventoryWidth: 6, inventoryHeight: 4,
  cursePercent: 0, seaGold: 0, worldTier: 1, inventory: [], storage: [], distance: 0,
  energyMax: 100, energyCurrent: 100,
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
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [combatResult, setCombatResult] = useState<CombatResult | null>(null);
  const [showCurseModal, setShowCurseModal] = useState(false);
  const [showMinigame, setShowMinigame] = useState<WorldItem | null>(null);
  const [isSeaGameMode, setIsSeaGameMode] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<any>({ speedMultiplier: 1.0 });
  const [isMoving, setIsMoving] = useState(false);
  const goldTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const API = getBaseUrl();

  // Gold regen: +1 gold per minute
  useEffect(() => {
    goldTimerRef.current = setInterval(() => {
      setState(prev => ({ ...prev, seaGold: prev.seaGold + 1 }));
    }, 60000);
    return () => { if (goldTimerRef.current) clearInterval(goldTimerRef.current); };
  }, []);

  const loadState = useCallback(async () => {
    if (!deviceId) return;
    try {
      const res = await fetch(`${API}/api/sea/state?deviceId=${encodeURIComponent(deviceId)}`);
      const data = await res.json();
      if (data.success && data.state) {
        const s = data.state;
        setState({
          initialized: s.fortress_lat != null,
          fortressLat: s.fortress_lat, fortressLng: s.fortress_lng,
          currentLat: s.current_lat, currentLng: s.current_lng,
          baseMaxHp: s.base_max_hp || 100, currentHp: s.current_hp || 100,
          moveSpeed: s.move_speed || 1.0, inventoryWidth: s.inventory_width || 6, inventoryHeight: s.inventory_height || 4,
          cursePercent: s.curse_percent || 0, seaGold: s.sea_gold || 0, worldTier: s.world_tier || 1,
          inventory: JSON.parse(s.inventory_json || '[]'), storage: JSON.parse(s.storage_json || '[]'),
          distance: s.distance || 0, energyMax: s.energy_max || 100, energyCurrent: s.energy_current || 100,
        });
        if (data.settings) {
          setGlobalSettings(data.settings);
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
        } else if (data.type === 'item') {
          setStagingItem(data.item);
        }
        setWorldItems(prev => prev.filter(i => i.spawnId !== spawnId));
      }
    } catch (err) { console.error('[SeaGame] pickupItem error:', err); }
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

  const setWorldTier = useCallback(async (tier: number) => {
    if (!deviceId) return;
    await fetch(`${API}/api/sea/set-tier`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, tier }),
    });
    await loadState();
  }, [deviceId, API, loadState]);

  const loadWorldItems = useCallback(async () => {
    if (!deviceId) return;
    try {
      const res = await fetch(`${API}/api/sea/world-items?deviceId=${encodeURIComponent(deviceId)}`);
      const data = await res.json();
      if (data.success) setWorldItems(data.items);
    } catch (err) { console.error('[SeaGame] loadWorldItems error:', err); }
  }, [deviceId, API]);

  // Auto-load state when deviceId is available
  useEffect(() => { if (deviceId) loadState(); }, [deviceId, loadState]);

  const value: SeaGameContextType = {
    state, worldItems, isBackpackOpen, setIsBackpackOpen,
    stagingItem, setStagingItem, encounter, setEncounter,
    combatResult, setCombatResult, showCurseModal, setShowCurseModal,
    showMinigame, setShowMinigame, isMoving,
    isSeaGameMode, setIsSeaGameMode, globalSettings,
    initGame, loadState, moveBoat, pickupItem, saveInventory,
    executeCombat, curseChoice, sellItems, storeItems, setWorldTier, loadWorldItems,
  };

  return <SeaGameContext.Provider value={value}>{children}</SeaGameContext.Provider>;
};

export default SeaGameProvider;
