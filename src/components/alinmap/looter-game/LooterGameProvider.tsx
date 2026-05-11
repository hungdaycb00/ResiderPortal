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
import { uiReducer, initialUIState, type UIState } from './uiReducer';
import { GAME_CONFIG } from './gameConfig';
import { looterApi } from './services/looterApi';

// Hooks
import { useLooterQueue } from './hooks/useLooterQueue';
import { useLooterData } from './hooks/useLooterData';
import { useLooterMovement } from './hooks/useLooterMovement';
import { useLooterInventory } from './hooks/useLooterInventory';
import { useLooterStateManager } from './hooks/useLooterStateManager';
import { useBeforeUnloadSync } from './hooks/useBeforeUnloadSync';
import { useLooterMinigamePregen } from './hooks/useLooterMinigamePregen';

const defaultState: LooterGameState = {
  initialized: false, fortressLat: null, fortressLng: null, currentLat: null, currentLng: null,
  baseMaxHp: 100, currentHp: 100, moveSpeed: 1.0, inventoryWidth: 6, inventoryHeight: 4,
  cursePercent: 0, looterGold: 0, worldTier: 0, inventory: [], storage: [], portalStorage: [], bags: [], distance: 0,
  energyMax: 100, energyCurrent: 100, activeCurses: {},
  isIntegratedStorageOpen: false,
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
  const [worldItems, setWorldItemsRaw] = useState<WorldItem[]>([]);
  const [ui, dispatch] = useReducer(uiReducer, initialUIState);
  const [globalSettings, setGlobalSettings] = useState<any>({ speedMultiplier: 1.0 });
  const [openBackpackHandler, setOpenBackpackHandler] = useState<(() => void) | null>(null);
  // Dùng ref thay state để tránh khoảng trống null khi dependency thay đổi
  const centerBoatHandlerRef = useRef<((yOffset?: number, xOffset?: number) => void) | null>(null);
  const centerCombatHandlerRef = useRef<((yOffset?: number, xOffset?: number) => void) | null>(null);
  const [isItemDragging, setIsItemDragging] = useState(false);
  const [isTierSelectorOpen, setIsTierSelectorOpenState] = useState(false);
  const isLooterGameModeRef = useRef(ui.isLooterGameMode);


  const setIsTierSelectorOpen = useCallback((v: boolean) => {
    setIsTierSelectorOpenState(v);
  }, []);

  // Reset dragging state when game mode changes or unmounts
  useEffect(() => {
    isLooterGameModeRef.current = ui.isLooterGameMode;
    if (!ui.isLooterGameMode) {
      setIsItemDragging(false);
    }
  }, [ui.isLooterGameMode]);


  const API_URL = useMemo(() => getLooterServerUrl(), []);
  const saveTimerRef = useRef<any>(null);
  const storageTimerRef = useRef<any>(null);
  const portalStorageTimerRef = useRef<any>(null);
  const initialLoadDoneRef = useRef(false);
  const chunkCacheRef = useRef<Map<string, LooterChunkCacheEntry>>(new Map());
  const consumedSpawnIdsRef = useRef<Set<string>>(new Set());

  // Pre-generate minigame boards trong background (API_URL phải được khai báo trước)
  const { pregeneratedMinigames, clearPregeneratedFruit } = useLooterMinigamePregen({
    isLooterGameMode: ui.isLooterGameMode,
    worldTier: state.worldTier || 0,
  });

  // Sync trước khi thoát tab
  useBeforeUnloadSync({ deviceId, apiUrl: API_URL, state });

  const notify = useCallback((msg: string, type: 'success'|'error'|'info' = 'info') => {
    if (typeof showNotification === 'function') {
      showNotification(msg, type);
    } else {
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
  const runInQueueRef = useRef(runInQueue);
  runInQueueRef.current = runInQueue;
  const { saveInventory, saveBags, saveStorage, syncState } = useLooterData({ deviceId, apiUrl: API_URL, setState });
  const openBackpack = useCallback(() => {
    if (!isLooterGameModeRef.current) return;
    if (typeof openBackpackHandler === 'function') openBackpackHandler();
  }, [openBackpackHandler]);

  // 3. Initialize Hooks
  const stateManager = useLooterStateManager({
    deviceId, apiUrl: API_URL, state, setState, setWorldItems,
    setIsChallengeActive, setGlobalSettings, notify, isChallengeActive: ui.isChallengeActive,
    saveBags, syncState, saveInventory, chunkCacheRef, consumedSpawnIdsRef
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
    setWorldItems, saveInventory, loadWorldItems: stateManager.loadWorldItems, chunkCacheRef,
    openBackpack,
    setIsIntegratedStorageOpen: (v: boolean) => dispatch({ type: 'SET_INTEGRATED_STORAGE_OPEN', payload: v }),
    setIsTierSelectorOpen,
  });

  // 3. Actions Orchestrator
  const actionsValue: LooterGameActions = useMemo(() => ({
    setIsFortressStorageOpen,
    openFortressStorage: (mode: StorageAccessMode = 'fortress') => {
      dispatch({ type: 'OPEN_FORTRESS_STORAGE', payload: mode });
      openBackpack();
      if (mode === 'fortress') {
        (window as any).expandLooterTab?.();
      }
    },
    setEncounter, setCombatResult,
    setShowCurseModal, setShowMinigame, setIsLooterGameMode,
    setIsIntegratedStorageOpen: (v) => dispatch({ type: 'SET_INTEGRATED_STORAGE_OPEN', payload: v }),
    toggleIntegratedStorage: (mode: StorageAccessMode = 'fortress') => dispatch({ type: 'TOGGLE_INTEGRATED_STORAGE', payload: mode }),
    openBackpack,
    setOpenBackpackHandler,
    centerOnBoat: (yOffset?: number, xOffset?: number) => { if (centerBoatHandlerRef.current) centerBoatHandlerRef.current(yOffset, xOffset); },
    setCenterBoatHandler: (h) => { centerBoatHandlerRef.current = h; },
    centerOnCombat: (yOffset?: number, xOffset?: number) => { if (centerCombatHandlerRef.current) centerCombatHandlerRef.current(yOffset, xOffset); },
    setCenterCombatHandler: (h) => { centerCombatHandlerRef.current = h; },
    setIsChallengeActive,
    setIsItemDragging,
    setIsTierSelectorOpen,

    initGame: (lat, lng) => runInQueueRef.current(() => stateManager.initGame(lat, lng)),
    loadState: () => runInQueueRef.current(() => stateManager.loadState()),
    moveBoat: (lat, lng, isStep, stepDist) => runInQueueRef.current(() => movement.moveBoat(lat, lng, isStep, stepDist)),
    // Pickup và penalty chạy song song — không block bởi heartbeat loadState
    pickupItem: (spawnId, directItem, currentLat, currentLng) => inventory.pickupItem(spawnId, directItem, currentLat, currentLng),
    inflictMinigamePenalty: (sid) => stateManager.inflictMinigamePenalty(sid),

    saveInventory: (inv) => {
      // Optimistic update
      setState(prev => ({ ...prev, inventory: inv }));
      
      // Debounce saving to server
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        runInQueueRef.current(async () => {
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
          runInQueueRef.current(() => inventory.saveStorage(st))
            .then(() => resolve())
            .catch(() => resolve());
        }, 500);
      });
    },
    savePortalStorage: (st) => {
      setState(prev => ({ ...prev, portalStorage: st }));
      if (portalStorageTimerRef.current) clearTimeout(portalStorageTimerRef.current);
      return new Promise<void>((resolve) => {
        portalStorageTimerRef.current = setTimeout(() => {
          runInQueueRef.current(() => inventory.saveStorage(st))
            .then(() => resolve())
            .catch(() => resolve());
        }, 500);
      });
    },
    transportPortalItems: async () => {
      const portalItems = state.portalStorage;
      if (!portalItems || portalItems.length === 0) return;

      const totalValue = portalItems.reduce((sum, item) => sum + (item.price || 0), 0);
      const fee = Math.ceil(totalValue * 0.05);

      if (state.looterGold < fee) {
        notify(`Không đủ vàng! Cần ${fee}G`, 'error');
        return;
      }

      // Trừ vàng ngay (UI sẽ hiện progress bar 3s)
      setState(prev => ({ ...prev, looterGold: prev.looterGold - fee }));

      // Roll random: 75% thành công, 25% thất bại
      const success = Math.random() < 0.75;

      if (success) {
        // Chuyển items từ portalStorage sang storage
        setState(prev => ({
          ...prev,
          storage: [...prev.storage, ...prev.portalStorage.map(item => ({ ...item, gridX: -1, gridY: -1 }))],
          portalStorage: [],
        }));
        notify('Vận chuyển thành công! Đồ đã về kho Thành Trì.', 'success');
      } else {
        // Mất đồ
        setState(prev => ({ ...prev, portalStorage: [] }));
        notify('Vận chuyển thất bại! Hàng hóa đã bị mất.', 'error');
      }
    },
    saveBags: (bags) => runInQueueRef.current(() => inventory.saveBags(bags)),
    equipBag: (uid) => runInQueueRef.current(() => inventory.equipBag(uid)),
    executeCombat: (id, inv, hp, bags) => runInQueueRef.current(() => stateManager.executeCombat(id, inv, hp, bags)),
    curseChoice: (choice) => runInQueueRef.current(() => stateManager.curseChoice(choice)),
    sellItems: (uids) => runInQueueRef.current(() => inventory.sellItems(uids)),
    storeItems: (uids, act, mode, gx, gy) => runInQueueRef.current(() => inventory.storeItems(uids, act, mode, gx, gy)),
    setWorldTier: (tier) => runInQueueRef.current(() => stateManager.setWorldTier(tier)),
    returnToFortress: () => runInQueueRef.current(() => movement.returnToFortress()),
    loadWorldItems: (force) => runInQueueRef.current(() => stateManager.loadWorldItems(force)),
    dropItems: (uids, lat, lng) => runInQueueRef.current(() => inventory.dropItems(uids, lat, lng)),
    dropCombatLoot: (items) => runInQueueRef.current(() => inventory.dropCombatLoot(items)),
    
    showNotification: notify,
    clearPregeneratedFruit,
    setGlobalSettings,
  }), [
    stateManager, inventory, movement, openBackpack, showNotification,

    setEncounter, setCombatResult, setShowCurseModal, setShowMinigame,
    setIsLooterGameMode, setIsChallengeActive, setIsFortressStorageOpen, setIsItemDragging,
    notify, clearPregeneratedFruit, deviceId, API_URL
  ]);

  const stateValue: LooterGameStateContextType = useMemo(() => ({
    state,
    inventory: state.inventory,
    storage: state.storage,
    portalStorage: state.portalStorage,
    bags: state.bags,
    cursePercent: state.cursePercent,
    worldItems,
    encounter: ui.encounter, combatResult: ui.combatResult,
    showCurseModal: ui.showCurseModal, showMinigame: ui.showMinigame,
    isLooterGameMode: ui.isLooterGameMode,
    isChallengeActive: ui.isChallengeActive,
    isItemDragging,
    isTierSelectorOpen,
    isFortressStorageOpen: ui.isFortressStorageOpen, fortressStorageMode: ui.fortressStorageMode,
    isIntegratedStorageOpen: ui.isIntegratedStorageOpen,
    globalSettings, isMoving: movement.isMoving, isSyncing,
    pregeneratedMinigames
  }), [state, worldItems, ui, globalSettings, movement.isMoving, isSyncing, pregeneratedMinigames, isItemDragging, isTierSelectorOpen]);

  // 4. Effects
  
  // Initial load - Only run once when game mode is active
  useEffect(() => {
    if (!deviceId || !ui.isLooterGameMode || initialLoadDoneRef.current) return;
    
    initialLoadDoneRef.current = true;
    actionsValue.loadState();
  }, [deviceId, ui.isLooterGameMode, actionsValue]);

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
