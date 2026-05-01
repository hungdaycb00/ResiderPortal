import React, { useState, useEffect, useCallback, useMemo, useReducer } from 'react';
import { generateSolvableFruitGrid } from './minigameUtils';
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
  pickupRewardItem: LooterItem | null;
  encounter: Encounter | null;
  combatResult: CombatResult | null;
  showCurseModal: boolean;
  showMinigame: WorldItem | null;
  isLooterGameMode: boolean;
  isChallengeActive: boolean;
  isFortressStorageOpen: boolean;
  fortressStorageMode: StorageAccessMode;
  isItemDragging: boolean;
  preGeneratedMinigame: { type: string; grid: any } | null;
  draggingItem: LooterItem | null;
  draggingMapItem: WorldItem | null;
  showDiscardModal: boolean;
  dragPointerPos: { x: number; y: number };
}

type UIAction =
  | { type: 'SET_PICKUP_REWARD'; payload: LooterItem | null }
  | { type: 'SET_ENCOUNTER'; payload: Encounter | null }
  | { type: 'SET_COMBAT_RESULT'; payload: CombatResult | null }
  | { type: 'SET_SHOW_CURSE_MODAL'; payload: boolean }
  | { type: 'SET_SHOW_MINIGAME'; payload: WorldItem | null }
  | { type: 'SET_LOOTER_GAME_MODE'; payload: boolean }
  | { type: 'SET_CHALLENGE_ACTIVE'; payload: boolean }
  | { type: 'SET_FORTRESS_STORAGE_OPEN'; payload: boolean }
  | { type: 'SET_FORTRESS_STORAGE_MODE'; payload: StorageAccessMode }
  | { type: 'SET_ITEM_DRAGGING'; payload: boolean }
  | { type: 'SET_PRE_GENERATED_MINIGAME'; payload: { type: string; grid: any } | null }
  | { type: 'SET_DRAGGING_ITEM'; payload: LooterItem | null }
  | { type: 'SET_DRAGGING_MAP_ITEM'; payload: WorldItem | null }
  | { type: 'SET_SHOW_DISCARD_MODAL'; payload: boolean }
  | { type: 'SET_DRAG_POINTER_POS'; payload: { x: number; y: number } }
  | { type: 'OPEN_FORTRESS_STORAGE'; payload: StorageAccessMode };

const initialUIState: UIState = {
  pickupRewardItem: null, encounter: null, combatResult: null,
  showCurseModal: false, showMinigame: null, isLooterGameMode: false,
  isChallengeActive: false, isFortressStorageOpen: false, fortressStorageMode: 'fortress',
  isItemDragging: false, preGeneratedMinigame: null, draggingItem: null,
  draggingMapItem: null, showDiscardModal: false, dragPointerPos: { x: 0, y: 0 },
};

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SET_PICKUP_REWARD': return { ...state, pickupRewardItem: action.payload };
    case 'SET_ENCOUNTER': return { ...state, encounter: action.payload };
    case 'SET_COMBAT_RESULT': return { ...state, combatResult: action.payload };
    case 'SET_SHOW_CURSE_MODAL': return { ...state, showCurseModal: action.payload };
    case 'SET_SHOW_MINIGAME': return { ...state, showMinigame: action.payload };
    case 'SET_LOOTER_GAME_MODE': return { ...state, isLooterGameMode: action.payload };
    case 'SET_CHALLENGE_ACTIVE': return { ...state, isChallengeActive: action.payload };
    case 'SET_FORTRESS_STORAGE_OPEN': return { ...state, isFortressStorageOpen: action.payload };
    case 'SET_FORTRESS_STORAGE_MODE': return { ...state, fortressStorageMode: action.payload };
    case 'SET_ITEM_DRAGGING': return { ...state, isItemDragging: action.payload };
    case 'SET_PRE_GENERATED_MINIGAME': return { ...state, preGeneratedMinigame: action.payload };
    case 'SET_DRAGGING_ITEM': return { ...state, draggingItem: action.payload };
    case 'SET_DRAGGING_MAP_ITEM': return { ...state, draggingMapItem: action.payload };
    case 'SET_SHOW_DISCARD_MODAL': return { ...state, showDiscardModal: action.payload };
    case 'SET_DRAG_POINTER_POS': return { ...state, dragPointerPos: action.payload };
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

  const notify = useCallback((msg: string, type: 'success'|'error'|'info' = 'info') => {
    if (typeof showNotification === 'function') {
      showNotification(msg, type);
    } else {
      console.log(`[LooterNotify] ${type}: ${msg}`);
    }
  }, [showNotification]);

  // Stable dispatch wrappers
  const setPickupRewardItem = useCallback((v: LooterItem | null) => dispatch({ type: 'SET_PICKUP_REWARD', payload: v }), []);
  const setEncounter = useCallback((v: Encounter | null) => dispatch({ type: 'SET_ENCOUNTER', payload: v }), []);
  const setCombatResult = useCallback((v: CombatResult | null) => dispatch({ type: 'SET_COMBAT_RESULT', payload: v }), []);
  const setShowCurseModal = useCallback((v: boolean) => dispatch({ type: 'SET_SHOW_CURSE_MODAL', payload: v }), []);
  const setShowMinigame = useCallback((v: WorldItem | null) => dispatch({ type: 'SET_SHOW_MINIGAME', payload: v }), []);
  const setIsLooterGameMode = useCallback((v: boolean) => dispatch({ type: 'SET_LOOTER_GAME_MODE', payload: v }), []);
  const setIsChallengeActive = useCallback((v: boolean) => dispatch({ type: 'SET_CHALLENGE_ACTIVE', payload: v }), []);
  const setIsFortressStorageOpen = useCallback((v: boolean) => dispatch({ type: 'SET_FORTRESS_STORAGE_OPEN', payload: v }), []);
  const setIsItemDragging = useCallback((v: boolean) => dispatch({ type: 'SET_ITEM_DRAGGING', payload: v }), []);
  const setPreGeneratedMinigame = useCallback((v: { type: string; grid: any } | null) => dispatch({ type: 'SET_PRE_GENERATED_MINIGAME', payload: v }), []);
  const setDraggingItem = useCallback((v: LooterItem | null) => dispatch({ type: 'SET_DRAGGING_ITEM', payload: v }), []);
  const setDraggingMapItem = useCallback((v: WorldItem | null) => dispatch({ type: 'SET_DRAGGING_MAP_ITEM', payload: v }), []);
  const setShowDiscardModal = useCallback((v: boolean) => dispatch({ type: 'SET_SHOW_DISCARD_MODAL', payload: v }), []);
  const setDragPointerPos = useCallback((v: { x: number; y: number }) => dispatch({ type: 'SET_DRAG_POINTER_POS', payload: v }), []);

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
    dropItem: inventory.dropItem, setIsChallengeActive,
    setEncounter, setShowCurseModal
  });

  // 3. Actions Orchestrator
  const actionsValue: LooterGameActions = useMemo(() => ({
    setIsFortressStorageOpen,
    openFortressStorage: (mode: StorageAccessMode = 'fortress') => {
      dispatch({ type: 'OPEN_FORTRESS_STORAGE', payload: mode });
    },
    setPickupRewardItem, setEncounter, setCombatResult,
    setShowCurseModal, setShowMinigame, setIsLooterGameMode,
    openBackpack: () => { if (openBackpackHandler) openBackpackHandler(); },
    setOpenBackpackHandler,
    setIsItemDragging, setIsChallengeActive, setPreGeneratedMinigame,
    
    // Actions from Hooks wrapped in Queue
    initGame: (lat, lng) => runInQueue(() => stateManager.initGame(lat, lng)),
    loadState: () => runInQueue(stateManager.loadState),
    moveBoat: (lat, lng) => runInQueue(() => movement.moveBoat(lat, lng)),
    pickupItem: (sid, gx, gy) => runInQueue(() => inventory.pickupItem(sid, gx, gy)),
    inflictMinigamePenalty: (sid) => runInQueue(() => stateManager.inflictMinigamePenalty(sid)),
    saveInventory: (inv) => {
      setState(prev => ({ ...prev, inventory: inv }));
      return runInQueue(async () => {
        const success = await inventory.saveInventory(inv);
        if (!success) {
          notify('Lỗi khi lưu vị trí vật phẩm', 'error');
          await stateManager.loadState();
        }
      });
    },
    saveStorage: (st) => runInQueue(() => inventory.saveStorage(st)),
    saveBags: (bags) => runInQueue(() => inventory.saveBags(bags)),
    equipBag: (uid) => runInQueue(() => inventory.equipBag(uid)),
    executeCombat: (id, inv, hp, bags) => runInQueue(() => stateManager.executeCombat(id, inv, hp, bags)),
    curseChoice: (choice) => runInQueue(() => stateManager.curseChoice(choice)),
    sellItems: (uids) => runInQueue(() => inventory.sellItems(uids)),
    storeItems: (uids, act, mode, gx, gy) => runInQueue(() => inventory.storeItems(uids, act, mode, gx, gy)),
    destroyItem: (sid) => runInQueue(() => inventory.destroyItem(sid)),
    setWorldTier: (tier) => runInQueue(() => stateManager.setWorldTier(tier)),
    dropItem: (uid) => runInQueue(() => inventory.dropItem(uid)),
    returnToFortress: () => runInQueue(movement.returnToFortress),
    loadWorldItems: (force) => runInQueue(() => stateManager.loadWorldItems(force)),
    
    showNotification, setDraggingItem, setDraggingMapItem,
    setShowDiscardModal, confirmDiscard: () => runInQueue(inventory.confirmDiscard)
  }), [
    stateManager, inventory, movement, runInQueue, openBackpackHandler, showNotification,
    setPickupRewardItem, setEncounter, setCombatResult, setShowCurseModal, setShowMinigame,
    setIsLooterGameMode, setIsChallengeActive, setIsFortressStorageOpen, setIsItemDragging,
    setPreGeneratedMinigame, setDraggingItem, setDraggingMapItem, setShowDiscardModal, notify
  ]);

  const stateValue: LooterGameStateContextType = useMemo(() => ({
    state,
    worldItems, pickupRewardItem: ui.pickupRewardItem,
    encounter: ui.encounter, combatResult: ui.combatResult,
    showCurseModal: ui.showCurseModal, showMinigame: ui.showMinigame,
    isLooterGameMode: ui.isLooterGameMode, isItemDragging: ui.isItemDragging,
    isChallengeActive: ui.isChallengeActive,
    isFortressStorageOpen: ui.isFortressStorageOpen, fortressStorageMode: ui.fortressStorageMode,
    globalSettings, isMoving: movement.isMoving, isSyncing,
    draggingItem: ui.draggingItem, draggingMapItem: ui.draggingMapItem,
    showDiscardModal: ui.showDiscardModal, dragPointerPos: ui.dragPointerPos
  }), [state, worldItems, ui, globalSettings, movement.isMoving, isSyncing]);

  // 4. Effects
  
  // Chuẩn bị Minigame
  useEffect(() => {
    if (!ui.isLooterGameMode) return;
    const prepareMinigame = () => {
      if (ui.preGeneratedMinigame) return; 
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
  }, [ui.isLooterGameMode, ui.preGeneratedMinigame, state.worldTier, setPreGeneratedMinigame]);

  // Xử lý kéo vật phẩm từ bản đồ
  useEffect(() => {
    if (!ui.draggingMapItem) return;
    const handlePointerMove = (e: PointerEvent) => setDragPointerPos({ x: e.clientX, y: e.clientY });
    const handlePointerUp = (e: PointerEvent) => {
      if (e.clientY > window.innerHeight * 0.65) {
        actionsValue.pickupItem(ui.draggingMapItem!.spawnId, undefined, undefined, true);
        notify(`Đang nhặt ${ui.draggingMapItem!.item.name}...`, 'info');
      }
      setDraggingMapItem(null);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [ui.draggingMapItem, actionsValue, notify, setDragPointerPos, setDraggingMapItem]);

  // Heartbeat Synchronization
  useEffect(() => {
    if (!deviceId || !ui.isLooterGameMode) return;
    actionsValue.loadState();
    const interval = setInterval(() => {
      actionsValue.loadState();
    }, SYNC_HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [deviceId, ui.isLooterGameMode, actionsValue]);

  // World Items Polling (Smart Interval based on movement)
  useEffect(() => {
    if (!deviceId || !ui.isLooterGameMode) return;
    
    const fetchItems = () => actionsValue.loadWorldItems();
    fetchItems(); // Initial load

    // Nếu đang di chuyển: 3s, đứng yên: 10s
    const intervalMs = movement.isMoving ? 3000 : 10000;
    const interval = setInterval(fetchItems, intervalMs);
    
    return () => clearInterval(interval);
  }, [deviceId, ui.isLooterGameMode, movement.isMoving, actionsValue]);

  return (
    <LooterStateContext.Provider value={stateValue}>
      <LooterActionsContext.Provider value={actionsValue}>
        {children}
      </LooterActionsContext.Provider>
    </LooterStateContext.Provider>
  );
};

export default LooterGameProvider;
