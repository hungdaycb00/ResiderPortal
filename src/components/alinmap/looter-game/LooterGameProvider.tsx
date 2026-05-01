import React, { useState, useEffect, useCallback, useMemo, useReducer } from 'react';
import { getLooterServerUrl } from '../../../services/externalApi';
import type { LooterItem, BagItem } from './backpack/types';
import { 
  LooterStateContext, 
  LooterActionsContext,
  type LooterGameState, 
  type WorldItem, 
  type Encounter, 
  type CombatResult, 
  type StorageAccessMode,
  type LooterGameStateContextType,
  type LooterGameActions
} from './LooterGameContext';
import { GAME_CONFIG } from './gameConfig';

// Hooks
import { useLooterQueue } from './hooks/useLooterQueue';
import { useLooterData } from './hooks/useLooterData';
import { useLooterMovement } from './hooks/useLooterMovement';
import { useLooterInventory } from './hooks/useLooterInventory';
import { useLooterStateManager } from './hooks/useLooterStateManager';

const defaultState: LooterGameState = {
  initialized: false, fortressLat: null, fortressLng: null, currentLat: null, currentLng: null,
  baseMaxHp: 100, currentHp: 100, moveSpeed: 1.0, inventoryWidth: 6, inventoryHeight: 4,
  cursePercent: 0, looterGold: 0, worldTier: 0, inventory: [], storage: [], bags: [], distance: 0,
  energyMax: 100, energyCurrent: 100, activeCurses: {},
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
  | { type: 'OPEN_FORTRESS_STORAGE'; payload: StorageAccessMode };

const initialUIState: UIState = {
  encounter: null, combatResult: null,
  showCurseModal: false, showMinigame: null, isLooterGameMode: false,
  isChallengeActive: false, isFortressStorageOpen: false, fortressStorageMode: 'fortress',
};

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SET_ENCOUNTER': return { ...state, encounter: action.payload };
    case 'SET_COMBAT_RESULT': return { ...state, combatResult: action.payload };
    case 'SET_SHOW_CURSE_MODAL': return { ...state, showCurseModal: action.payload };
    case 'SET_SHOW_MINIGAME': return { ...state, showMinigame: action.payload };
    case 'SET_LOOTER_GAME_MODE': return { ...state, isLooterGameMode: action.payload };
    case 'SET_CHALLENGE_ACTIVE': return { ...state, isChallengeActive: action.payload };
    case 'SET_FORTRESS_STORAGE_OPEN': return { ...state, isFortressStorageOpen: action.payload };
    case 'SET_FORTRESS_STORAGE_MODE': return { ...state, fortressStorageMode: action.payload };
    case 'OPEN_FORTRESS_STORAGE': return { ...state, fortressStorageMode: action.payload, isFortressStorageOpen: true };
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
  const [worldItems, setWorldItems] = useState<WorldItem[]>([]);
  const [ui, dispatch] = useReducer(uiReducer, initialUIState);
  const [globalSettings, setGlobalSettings] = useState<any>({ speedMultiplier: 1.0 });
  const [openBackpackHandler, setOpenBackpackHandler] = useState<(() => void) | null>(null);

  const API_URL = useMemo(() => getLooterServerUrl(), []);
  const saveTimerRef = useRef<any>(null);
  const storageTimerRef = useRef<any>(null);

  const notify = useCallback((msg: string, type: 'success'|'error'|'info' = 'info') => {
    if (typeof showNotification === 'function') {
      showNotification(msg, type);
    } else {
      console.log(`[LooterNotify] ${type}: ${msg}`);
    }
  }, [showNotification]);

  // Stable dispatch wrappers
  const setEncounter = useCallback((v: Encounter | null) => dispatch({ type: 'SET_ENCOUNTER', payload: v }), []);
  const setCombatResult = useCallback((v: CombatResult | null) => dispatch({ type: 'SET_COMBAT_RESULT', payload: v }), []);
  const setShowCurseModal = useCallback((v: boolean) => dispatch({ type: 'SET_SHOW_CURSE_MODAL', payload: v }), []);
  const setShowMinigame = useCallback((v: WorldItem | null) => dispatch({ type: 'SET_SHOW_MINIGAME', payload: v }), []);
  const setIsLooterGameMode = useCallback((v: boolean) => dispatch({ type: 'SET_LOOTER_GAME_MODE', payload: v }), []);
  const setIsChallengeActive = useCallback((v: boolean) => dispatch({ type: 'SET_CHALLENGE_ACTIVE', payload: v }), []);
  const setIsFortressStorageOpen = useCallback((v: boolean) => dispatch({ type: 'SET_FORTRESS_STORAGE_OPEN', payload: v }), []);

  const { runInQueue, isSyncing } = useLooterQueue();
  const { saveInventory, saveBags, saveStorage } = useLooterData({ deviceId, apiUrl: API_URL, setState });

  // 3. Initialize Hooks
  const stateManager = useLooterStateManager({
    deviceId, apiUrl: API_URL, state, setState, setWorldItems,
    setIsChallengeActive, setGlobalSettings, notify, isChallengeActive: ui.isChallengeActive,
    saveBags
  });

  const inventory = useLooterInventory({
    deviceId, apiUrl: API_URL, state, setState, notify,
    setWorldItems, loadWorldItems: stateManager.loadWorldItems,
    saveInventory, saveBags, saveStorage
  });

  const movement = useLooterMovement({
    deviceId, apiUrl: API_URL, state, setState, notify,
    setIsChallengeActive,
    setEncounter, setShowCurseModal
  });

  // 3. Actions Orchestrator
  const actionsValue: LooterGameActions = useMemo(() => ({
    setIsFortressStorageOpen,
    openFortressStorage: (mode: StorageAccessMode = 'fortress') => {
      dispatch({ type: 'OPEN_FORTRESS_STORAGE', payload: mode });
    },
    setEncounter, setCombatResult,
    setShowCurseModal, setShowMinigame, setIsLooterGameMode,
    openBackpack: () => { if (openBackpackHandler) openBackpackHandler(); },
    setOpenBackpackHandler,
    setIsChallengeActive,
    
    initGame: (lat, lng) => runInQueue(() => stateManager.initGame(lat, lng)),
    loadState: (opts) => runInQueue(stateManager.loadState, opts),
    moveBoat: (lat, lng) => runInQueue(() => movement.moveBoat(lat, lng)),
    // Pickup và penalty chạy song song — không block bởi heartbeat loadState
    pickupItem: (spawnId) => inventory.pickupItem(spawnId),
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
      storageTimerRef.current = setTimeout(() => {
        runInQueue(() => inventory.saveStorage(st));
      }, 500);
    },
    saveBags: (bags) => runInQueue(() => inventory.saveBags(bags)),
    equipBag: (uid) => runInQueue(() => inventory.equipBag(uid)),
    executeCombat: (id, inv, hp, bags) => runInQueue(() => stateManager.executeCombat(id, inv, hp, bags)),
    curseChoice: (choice) => runInQueue(() => stateManager.curseChoice(choice)),
    sellItems: (uids) => runInQueue(() => inventory.sellItems(uids)),
    storeItems: (uids, act, mode, gx, gy) => runInQueue(() => inventory.storeItems(uids, act, mode, gx, gy)),
    setWorldTier: (tier) => runInQueue(() => stateManager.setWorldTier(tier)),
    returnToFortress: () => runInQueue(movement.returnToFortress),
    loadWorldItems: (force) => runInQueue(() => stateManager.loadWorldItems(force)),
    
    showNotification
  }), [
    stateManager, inventory, movement, runInQueue, openBackpackHandler, showNotification,
    setEncounter, setCombatResult, setShowCurseModal, setShowMinigame,
    setIsLooterGameMode, setIsChallengeActive, setIsFortressStorageOpen,
    notify
  ]);

  const stateValue: LooterGameStateContextType = useMemo(() => ({
    state,
    worldItems,
    encounter: ui.encounter, combatResult: ui.combatResult,
    showCurseModal: ui.showCurseModal, showMinigame: ui.showMinigame,
    isLooterGameMode: ui.isLooterGameMode,
    isChallengeActive: ui.isChallengeActive,
    isFortressStorageOpen: ui.isFortressStorageOpen, fortressStorageMode: ui.fortressStorageMode,
    globalSettings, isMoving: movement.isMoving, isSyncing,
  }), [state, worldItems, ui, globalSettings, movement.isMoving, isSyncing]);

  // 4. Effects
  




  // Heartbeat Synchronization
  useEffect(() => {
    if (!deviceId || !ui.isLooterGameMode) return;
    actionsValue.loadState({ skipIfBusy: true });
    const interval = setInterval(() => {
      actionsValue.loadState({ skipIfBusy: true });
    }, SYNC_HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [deviceId, ui.isLooterGameMode, actionsValue]);



  return (
    <LooterStateContext.Provider value={stateValue}>
      <LooterActionsContext.Provider value={actionsValue}>
        {children}
      </LooterActionsContext.Provider>
    </LooterStateContext.Provider>
  );
};

export default LooterGameProvider;
