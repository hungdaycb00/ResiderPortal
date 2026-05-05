import React, { useState, useEffect, useCallback, useMemo, useReducer, useRef } from 'react';
import { getLooterServerUrl } from '../../../services/externalApi';
import type { LooterItem, BagItem } from './backpack/types';
import { 
  LooterStateContext, 
  LooterActionsContext,
  isValidWorldItem,
  sanitizeWorldItems,
  type LooterGameState, 
  type WorldItem, 
  type LooterChunkCacheEntry,
  type Encounter, 
  type CombatResult, 
  type StorageAccessMode,
  type LooterGameStateContextType,
  type LooterGameActions
} from './LooterGameContext';
import { GAME_CONFIG } from './gameConfig';
import { looterApi } from './services/looterApi';

// Hooks
import { useLooterQueue } from './hooks/useLooterQueue';
import { useLooterData } from './hooks/useLooterData';
import { useLooterMovement } from './hooks/useLooterMovement';
import { useLooterInventory } from './hooks/useLooterInventory';
import { useLooterStateManager } from './hooks/useLooterStateManager';
import { generateSolvableGrid } from './minigames/FruitGameLogic';
import { FRUITS } from './minigames/FruitGame';

const defaultState: LooterGameState = {
  initialized: false, fortressLat: null, fortressLng: null, currentLat: null, currentLng: null,
  baseMaxHp: 100, currentHp: 100, moveSpeed: 1.0, inventoryWidth: 6, inventoryHeight: 4,
  cursePercent: 0, looterGold: 0, worldTier: 0, inventory: [], storage: [], bags: [], distance: 0,
  energyMax: 100, energyCurrent: 100, activeCurses: {},
  isIntegratedStorageOpen: false,
};

const { SYNC_HEARTBEAT_MS } = GAME_CONFIG;

// ==========================================
// UI State Reducer (gom 15 useState → 1 useReducer)
// ==========================================
interface UIState {
  encounter: Encounter | null;
  combatResult: CombatResult | null;
  showCurseModal: boolean;
  showMinigame: WorldItem | null;
  isLooterGameMode: boolean;
  isChallengeActive: boolean;
  isFortressStorageOpen: boolean;
  fortressStorageMode: StorageAccessMode;
  isIntegratedStorageOpen: boolean;
}

type UIAction =
  | { type: 'SET_ENCOUNTER'; payload: Encounter | null }
  | { type: 'SET_COMBAT_RESULT'; payload: CombatResult | null }
  | { type: 'SET_SHOW_CURSE_MODAL'; payload: boolean }
  | { type: 'SET_SHOW_MINIGAME'; payload: WorldItem | null }
  | { type: 'SET_LOOTER_GAME_MODE'; payload: boolean }
  | { type: 'SET_CHALLENGE_ACTIVE'; payload: boolean }
  | { type: 'SET_FORTRESS_STORAGE_OPEN'; payload: boolean }
  | { type: 'SET_FORTRESS_STORAGE_MODE'; payload: StorageAccessMode }
  | { type: 'OPEN_FORTRESS_STORAGE'; payload: StorageAccessMode }
  | { type: 'SET_INTEGRATED_STORAGE_OPEN'; payload: boolean }
  | { type: 'TOGGLE_INTEGRATED_STORAGE'; payload?: StorageAccessMode };

const initialUIState: UIState = {
  encounter: null, combatResult: null,
  showCurseModal: false, showMinigame: null, isLooterGameMode: false,
  isChallengeActive: false, isFortressStorageOpen: false, fortressStorageMode: 'fortress',
  isIntegratedStorageOpen: false,
};

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SET_ENCOUNTER':
      if (action.payload && state.isIntegratedStorageOpen) return state;
      return action.payload
        ? { ...state, encounter: action.payload, showMinigame: null, showCurseModal: false, isIntegratedStorageOpen: false, isFortressStorageOpen: false }
        : { ...state, encounter: null };
    case 'SET_COMBAT_RESULT':
      return action.payload
        ? { ...state, combatResult: action.payload, showMinigame: null, showCurseModal: false, isIntegratedStorageOpen: false, isFortressStorageOpen: false }
        : { ...state, combatResult: null };
    case 'SET_SHOW_CURSE_MODAL':
      if (action.payload && state.isIntegratedStorageOpen) return state;
      return action.payload
        ? { ...state, showCurseModal: true, showMinigame: null, isIntegratedStorageOpen: false, isFortressStorageOpen: false }
        : { ...state, showCurseModal: false };
    case 'SET_SHOW_MINIGAME':
      return action.payload
        ? { ...state, showMinigame: action.payload, encounter: null, combatResult: null, showCurseModal: false, isIntegratedStorageOpen: false, isFortressStorageOpen: false }
        : { ...state, showMinigame: null };
    case 'SET_LOOTER_GAME_MODE': return { ...state, isLooterGameMode: action.payload };
    case 'SET_CHALLENGE_ACTIVE': return { ...state, isChallengeActive: action.payload };
    case 'SET_FORTRESS_STORAGE_OPEN': return { ...state, isFortressStorageOpen: action.payload };
    case 'SET_FORTRESS_STORAGE_MODE': return { ...state, fortressStorageMode: action.payload };
    case 'OPEN_FORTRESS_STORAGE':
      return { ...state, fortressStorageMode: action.payload, isFortressStorageOpen: true, isIntegratedStorageOpen: true, encounter: null, combatResult: null, showCurseModal: false, showMinigame: null };
    case 'SET_INTEGRATED_STORAGE_OPEN':
      return action.payload
        ? { ...state, isIntegratedStorageOpen: true, encounter: null, combatResult: null, showCurseModal: false, showMinigame: null }
        : { ...state, isIntegratedStorageOpen: false };
    case 'TOGGLE_INTEGRATED_STORAGE':
      return state.isIntegratedStorageOpen
        ? { ...state, isIntegratedStorageOpen: false }
        : { ...state, fortressStorageMode: action.payload ?? 'fortress', isIntegratedStorageOpen: true, encounter: null, combatResult: null, showCurseModal: false, showMinigame: null };
    default: return state;
  }
}

interface LooterGameProviderProps {
  children: React.ReactNode;
  deviceId: string | null;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const LooterGameProvider: React.FC<LooterGameProviderProps> = ({ children, deviceId, showNotification }) => {
  // 1. Core State
  const [state, setState] = useState<LooterGameState>(defaultState);
  const [worldItems, setWorldItemsRaw] = useState<WorldItem[]>([]);
  const [ui, dispatch] = useReducer(uiReducer, initialUIState);
  const [globalSettings, setGlobalSettings] = useState<any>({ speedMultiplier: 1.0 });
  const [openBackpackHandler, setOpenBackpackHandler] = useState<(() => void) | null>(null);
  const [centerBoatHandler, setCenterBoatHandler] = useState<((yOffset?: number) => void) | null>(null);
  const [centerCombatHandler, setCenterCombatHandler] = useState<((yOffset?: number) => void) | null>(null);
  const [pregeneratedMinigames, setPregeneratedMinigames] = useState<{ fruit?: any }>({});
  const [isItemDragging, setIsItemDragging] = useState(false);

  const API_URL = useMemo(() => getLooterServerUrl(), []);
  const saveTimerRef = useRef<any>(null);
  const storageTimerRef = useRef<any>(null);
  const initialLoadDoneRef = useRef(false);
  const chunkCacheRef = useRef<Map<string, LooterChunkCacheEntry>>(new Map());
  const consumedSpawnIdsRef = useRef<Set<string>>(new Set());

  const notify = useCallback((msg: string, type: 'success'|'error'|'info' = 'info') => {
    if (typeof showNotification === 'function') {
      showNotification(msg, type);
    } else {
      console.log(`[LooterNotify] ${type}: ${msg}`);
    }
  }, [showNotification]);

  const setWorldItems = useCallback<React.Dispatch<React.SetStateAction<WorldItem[]>>>((next) => {
    setWorldItemsRaw(prev => {
      const safePrev = sanitizeWorldItems(prev);
      const resolved = typeof next === 'function' ? next(safePrev) : next;
      return sanitizeWorldItems(resolved);
    });
  }, []);

  // Stable dispatch wrappers
  const setEncounter = useCallback((v: Encounter | null) => dispatch({ type: 'SET_ENCOUNTER', payload: v }), []);
  const setCombatResult = useCallback((v: CombatResult | null) => dispatch({ type: 'SET_COMBAT_RESULT', payload: v }), []);
  const setShowCurseModal = useCallback((v: boolean) => dispatch({ type: 'SET_SHOW_CURSE_MODAL', payload: v }), []);
  const setShowMinigame = useCallback((v: WorldItem | null) => {
    dispatch({ type: 'SET_SHOW_MINIGAME', payload: isValidWorldItem(v) ? v : null });
  }, []);
  const setIsLooterGameMode = useCallback((v: boolean) => dispatch({ type: 'SET_LOOTER_GAME_MODE', payload: v }), []);
  const setIsChallengeActive = useCallback((v: boolean) => dispatch({ type: 'SET_CHALLENGE_ACTIVE', payload: v }), []);
  const setIsFortressStorageOpen = useCallback((v: boolean) => dispatch({ type: 'SET_FORTRESS_STORAGE_OPEN', payload: v }), []);

  const { runInQueue, isSyncing } = useLooterQueue();
  const { saveInventory, saveBags, saveStorage, syncState } = useLooterData({ deviceId, apiUrl: API_URL, setState });
  const openBackpack = useCallback(() => {
    if (typeof openBackpackHandler === 'function') openBackpackHandler();
  }, [openBackpackHandler]);

  // Handle BeforeUnload for final sync
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!deviceId) return;
      try {
        const payload = JSON.stringify({ deviceId, state });
        navigator.sendBeacon(`${API_URL}/api/looter/sync`, new Blob([payload], { type: 'application/json' }));
      } catch (e) {
        console.error('[Looter] beforeunload sync error', e);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [deviceId, API_URL, state]);

  // 3. Initialize Hooks
  const stateManager = useLooterStateManager({
    deviceId, apiUrl: API_URL, state, setState, setWorldItems,
    setIsChallengeActive, setGlobalSettings, notify, isChallengeActive: ui.isChallengeActive,
    saveBags, syncState, chunkCacheRef, consumedSpawnIdsRef
  });

  const inventory = useLooterInventory({
    deviceId, apiUrl: API_URL, state, setState, notify,
    setWorldItems, loadWorldItems: stateManager.loadWorldItems,
    saveInventory, saveBags, saveStorage, openBackpack, chunkCacheRef, consumedSpawnIdsRef
  });

  const movement = useLooterMovement({
    deviceId, apiUrl: API_URL, state, setState, notify,
    setIsChallengeActive,
    setEncounter, setShowCurseModal,
    setWorldItems, saveInventory, loadWorldItems: stateManager.loadWorldItems, chunkCacheRef
  });

  const clearPregeneratedFruit = useCallback(() => {
    setPregeneratedMinigames(prev => ({ ...prev, fruit: null }));
  }, []);

  // 3. Actions Orchestrator
  const actionsValue: LooterGameActions = useMemo(() => ({
    setIsFortressStorageOpen,
    openFortressStorage: (mode: StorageAccessMode = 'fortress') => {
      dispatch({ type: 'OPEN_FORTRESS_STORAGE', payload: mode });
      openBackpack();
    },
    setEncounter, setCombatResult,
    setShowCurseModal, setShowMinigame, setIsLooterGameMode,
    setIsIntegratedStorageOpen: (v) => dispatch({ type: 'SET_INTEGRATED_STORAGE_OPEN', payload: v }),
    toggleIntegratedStorage: (mode: StorageAccessMode = 'fortress') => dispatch({ type: 'TOGGLE_INTEGRATED_STORAGE', payload: mode }),
    openBackpack,
    setOpenBackpackHandler,
    centerOnBoat: (yOffset?: number) => { if (centerBoatHandler) centerBoatHandler(yOffset); },
    setCenterBoatHandler,
    centerOnCombat: (yOffset?: number) => { if (centerCombatHandler) centerCombatHandler(yOffset); },
    setCenterCombatHandler,
    setIsChallengeActive,
    setIsItemDragging,
    
    initGame: (lat, lng) => runInQueue(() => stateManager.initGame(lat, lng)),
    loadState: () => runInQueue(() => stateManager.loadState()),
    moveBoat: (lat, lng, isStep, stepDist) => runInQueue(() => movement.moveBoat(lat, lng, isStep, stepDist)),
    // Pickup và penalty chạy song song — không block bởi heartbeat loadState
    pickupItem: (spawnId, directItem, currentLat, currentLng) => inventory.pickupItem(spawnId, directItem, currentLat, currentLng),
    inflictMinigamePenalty: (sid) => stateManager.inflictMinigamePenalty(sid),

    saveInventory: (inv) => {
      // Optimistic update
      setState(prev => ({ ...prev, inventory: inv }));
      
      // Debounce saving to server
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        runInQueue(async () => {
          const success = await inventory.saveInventory(inv);
          if (!success) {
            notify('Lỗi khi lưu vị trí vật phẩm', 'error');
            await stateManager.loadState();
          }
        });
      }, 500); // 500ms debounce
    },
    saveStorage: (st) => {
      setState(prev => ({ ...prev, storage: st }));
      if (storageTimerRef.current) clearTimeout(storageTimerRef.current);
      return new Promise<void>((resolve) => {
        storageTimerRef.current = setTimeout(() => {
          runInQueue(() => inventory.saveStorage(st))
            .then(() => resolve())
            .catch(() => resolve());
        }, 500);
      });
    },
    saveBags: (bags) => runInQueue(() => inventory.saveBags(bags)),
    equipBag: (uid) => runInQueue(() => inventory.equipBag(uid)),
    executeCombat: (id, inv, hp, bags) => runInQueue(() => stateManager.executeCombat(id, inv, hp, bags)),
    curseChoice: (choice) => runInQueue(() => stateManager.curseChoice(choice)),
    sellItems: (uids) => runInQueue(() => inventory.sellItems(uids)),
    storeItems: (uids, act, mode, gx, gy) => runInQueue(() => inventory.storeItems(uids, act, mode, gx, gy)),
    setWorldTier: (tier) => runInQueue(() => stateManager.setWorldTier(tier)),
    returnToFortress: () => runInQueue(() => movement.returnToFortress()),
    loadWorldItems: (force) => runInQueue(() => stateManager.loadWorldItems(force)),
    dropItems: (uids, lat, lng) => runInQueue(() => inventory.dropItems(uids, lat, lng)),
    dropCombatLoot: (items) => runInQueue(() => inventory.dropCombatLoot(items)),
    
    showNotification: notify,
    clearPregeneratedFruit
  }), [
    stateManager, inventory, movement, runInQueue, openBackpack, showNotification,
    centerBoatHandler, centerCombatHandler, setCenterBoatHandler, setCenterCombatHandler,
    setEncounter, setCombatResult, setShowCurseModal, setShowMinigame,
    setIsLooterGameMode, setIsChallengeActive, setIsFortressStorageOpen, setIsItemDragging,
    notify, clearPregeneratedFruit, deviceId, API_URL
  ]);

  const stateValue: LooterGameStateContextType = useMemo(() => ({
    state,
    inventory: state.inventory,
    storage: state.storage,
    bags: state.bags,
    cursePercent: state.cursePercent,
    worldItems,
    encounter: ui.encounter, combatResult: ui.combatResult,
    showCurseModal: ui.showCurseModal, showMinigame: ui.showMinigame,
    isLooterGameMode: ui.isLooterGameMode,
    isChallengeActive: ui.isChallengeActive,
    isItemDragging,
    isFortressStorageOpen: ui.isFortressStorageOpen, fortressStorageMode: ui.fortressStorageMode,
    isIntegratedStorageOpen: ui.isIntegratedStorageOpen,
    globalSettings, isMoving: movement.isMoving, isSyncing,
    pregeneratedMinigames
  }), [state, worldItems, ui, globalSettings, movement.isMoving, isSyncing, pregeneratedMinigames, isItemDragging]);

  // 4. Effects
  
  // Initial load - Only run once when game mode is active
  useEffect(() => {
    if (!deviceId || !ui.isLooterGameMode || initialLoadDoneRef.current) return;
    
    initialLoadDoneRef.current = true;
    actionsValue.loadState();
  }, [deviceId, ui.isLooterGameMode, actionsValue]);

  // Background Minigame Generation
  useEffect(() => {
    if (!ui.isLooterGameMode) return;
    
    // Nếu chưa có bàn chơi sẵn cho tier hiện tại, hãy tạo một cái
    if (!pregeneratedMinigames.fruit) {
      const worldTier = state.worldTier || 0;
      const baseSize = 3 + worldTier;
      const rows = baseSize;
      const cols = (rows * rows) % 2 === 0 ? rows : rows + 1;
      
      // Số lượng loại hoa quả khác nhau tăng theo tier
      const fruitCount = Math.min(16, 8 + worldTier);

      console.log(`[LooterMinigame] Starting background generation for Tier ${worldTier} (${rows}x${cols})`);
      
      // Chạy ngầm để không block UI chính
      setTimeout(() => {
        const grid = generateSolvableGrid(rows, cols, fruitCount, FRUITS);
        if (grid && grid.length > 0) {
          setPregeneratedMinigames(prev => ({ ...prev, fruit: grid }));
          console.log(`[LooterMinigame] Background generation complete for Tier ${worldTier}`);
        }
      }, 100);
    }
  }, [ui.isLooterGameMode, state.worldTier, !!pregeneratedMinigames.fruit]);

  // Debug: Press 'P' to spawn all bags
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p' && deviceId && state.currentLat != null) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

        try {
          const response = await fetch(`${API_URL}/api/looter/debug/spawn-all-bags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId, lat: state.currentLat, lng: state.currentLng })
          });
          const data = await response.json();
          if (data.success) {
            notify(`Đã spawn ${data.count} loại balo xung quanh bạn!`, 'success');
            // Refresh world items to see them immediately
            stateManager.loadWorldItems(true);
          }
        } catch (err) {
          console.error('[Debug Spawn Bags]', err);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deviceId, API_URL, state.currentLat, state.currentLng, notify, stateManager]);

  return (
    <LooterStateContext.Provider value={stateValue}>
      <LooterActionsContext.Provider value={actionsValue}>
        {children}
      </LooterActionsContext.Provider>
    </LooterStateContext.Provider>
  );
};

export default LooterGameProvider;
