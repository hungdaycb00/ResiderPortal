import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

interface LooterGameProviderProps {
  children: React.ReactNode;
  deviceId: string | null;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const LooterGameProvider: React.FC<LooterGameProviderProps> = ({ children, deviceId, showNotification }) => {
  // 1. Core State
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
  const [draggingItem, setDraggingItem] = useState<LooterItem | null>(null);
  const [isItemDragging, setIsItemDragging] = useState(false);
  const [preGeneratedMinigame, setPreGeneratedMinigame] = useState<{ type: string, grid: any } | null>(null);
  const [openBackpackHandler, setOpenBackpackHandler] = useState<(() => void) | null>(null);
  const [draggingMapItem, setDraggingMapItem] = useState<WorldItem | null>(null);
  const [dragPointerPos, setDragPointerPos] = useState({ x: 0, y: 0 });
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const API_URL = useMemo(() => getLooterServerUrl(), []);

  const notify = useCallback((msg: string, type: 'success'|'error'|'info' = 'info') => {
    if (typeof showNotification === 'function') {
      showNotification(msg, type);
    } else {
      console.log(`[LooterNotify] ${type}: ${msg}`);
    }
  }, [showNotification]);

  const { runInQueue, isSyncing } = useLooterQueue();
  const { saveInventory, saveBags, saveStorage } = useLooterData({ deviceId, apiUrl: API_URL, setState });

  // 3. Initialize Hooks
  const stateManager = useLooterStateManager({
    deviceId, apiUrl: API_URL, state, setState, setWorldItems,
    setIsChallengeActive, setGlobalSettings, notify, isChallengeActive,
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
      setFortressStorageMode(mode);
      setIsFortressStorageOpen(true);
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
    saveInventory: (inv) => runInQueue(() => inventory.saveInventory(inv)),
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
    stateManager, inventory, movement, runInQueue, openBackpackHandler, showNotification
  ]);

  const stateValue: LooterGameStateContextType = useMemo(() => ({
    state,
    worldItems, pickupRewardItem,
    encounter, combatResult,
    showCurseModal, showMinigame,
    isLooterGameMode, isItemDragging, isChallengeActive,
    isFortressStorageOpen, fortressStorageMode,
    globalSettings, isMoving: movement.isMoving, isSyncing,
    draggingItem, draggingMapItem,
    showDiscardModal, dragPointerPos
  }), [
    state, worldItems, pickupRewardItem, encounter, combatResult,
    showCurseModal, showMinigame, isLooterGameMode, isItemDragging,
    isChallengeActive, isFortressStorageOpen, fortressStorageMode,
    globalSettings, movement.isMoving, isSyncing, draggingItem, draggingMapItem,
    showDiscardModal, dragPointerPos
  ]);

  // 4. Effects
  
  // Chuẩn bị Minigame
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

  // Xử lý kéo vật phẩm từ bản đồ
  useEffect(() => {
    if (!draggingMapItem) return;
    const handlePointerMove = (e: PointerEvent) => setDragPointerPos({ x: e.clientX, y: e.clientY });
    const handlePointerUp = (e: PointerEvent) => {
      if (e.clientY > window.innerHeight * 0.65) {
        actionsValue.pickupItem(draggingMapItem.spawnId, undefined, undefined, true);
        notify(`Đang nhặt ${draggingMapItem.item.name}...`, 'info');
      }
      setDraggingMapItem(null);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingMapItem, actionsValue, notify]);

  // Heartbeat Synchronization
  useEffect(() => {
    if (!deviceId || !isLooterGameMode) return;
    actionsValue.loadState();
    const interval = setInterval(() => {
      actionsValue.loadState();
    }, SYNC_HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [deviceId, isLooterGameMode, actionsValue]);

  // World Items Polling (Smart Interval based on movement)
  useEffect(() => {
    if (!deviceId || !isLooterGameMode) return;
    
    const fetchItems = () => actionsValue.loadWorldItems();
    fetchItems(); // Initial load

    // Nếu đang di chuyển: 3s, đứng yên: 10s
    const intervalMs = movement.isMoving ? 3000 : 10000;
    const interval = setInterval(fetchItems, intervalMs);
    
    return () => clearInterval(interval);
  }, [deviceId, isLooterGameMode, movement.isMoving, actionsValue]);

  return (
    <LooterStateContext.Provider value={stateValue}>
      <LooterActionsContext.Provider value={actionsValue}>
        {children}
      </LooterActionsContext.Provider>
    </LooterStateContext.Provider>
  );
};

export default LooterGameProvider;
