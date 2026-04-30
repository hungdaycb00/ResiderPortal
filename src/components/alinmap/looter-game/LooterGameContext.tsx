import { createContext, useContext } from 'react';
import type { LooterItem, BagItem, GridExpander, PortalItem } from './backpack/types';
import { getDistanceMeters } from './backpack/utils';
import { GAME_CONFIG } from './gameConfig';

const { FORTRESS_INTERACTION_METERS } = GAME_CONFIG;
export { FORTRESS_INTERACTION_METERS };

export interface WorldItem {
  spawnId: string;
  lat: number;
  lng: number;
  isExpander: boolean;
  minigameType: 'fishing' | 'diving' | 'chest' | null;
  item: LooterItem | GridExpander | BagItem | PortalItem;
}

export interface Encounter {
  type: 'player' | 'bot';
  id: string;
  name: string;
  avatar?: string;
  inventory: LooterItem[];
  bags?: BagItem[];
  baseMaxHp: number;
  totalWeight: number;
  totalHp: number;
  isBot?: boolean;
}

export interface CombatResult {
  result: 'win' | 'lose';
  combatLog: any[];
  loot?: LooterItem[];
  droppedItems?: LooterItem[];
  finalHp: number;
}

export interface LooterGameState {
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
  looterGold: number;
  worldTier: number;
  inventory: LooterItem[];
  storage: LooterItem[];
  bags: BagItem[];
  distance: number;
  energyMax: number;
  energyCurrent: number;
  activeCurses: Record<string, number>;
}

export const isLooterAtFortress = (state: Pick<LooterGameState, 'currentLat' | 'currentLng' | 'fortressLat' | 'fortressLng'>) =>
  getDistanceMeters(state.currentLat, state.currentLng, state.fortressLat, state.fortressLng) <= FORTRESS_INTERACTION_METERS;

export type StorageAccessMode = 'fortress' | 'portal';

export interface LooterGameActions {
  setIsFortressStorageOpen: (v: boolean) => void;
  openFortressStorage: (mode?: StorageAccessMode) => void;
  setPickupRewardItem: (item: LooterItem | null) => void;
  setEncounter: (e: Encounter | null) => void;
  setCombatResult: (r: CombatResult | null) => void;
  setShowCurseModal: (v: boolean) => void;
  setShowMinigame: (item: WorldItem | null) => void;
  setIsLooterGameMode: (v: boolean) => void;
  openBackpack: () => void;
  setOpenBackpackHandler: (h: (() => void) | null) => void;
  setIsItemDragging: (v: boolean) => void;
  setIsChallengeActive: (v: boolean) => void;
  setPreGeneratedMinigame: (v: { type: string, grid: any } | null) => void;
  initGame: (lat: number, lng: number) => Promise<void>;
  loadState: () => Promise<void>;
  moveBoat: (toLat: number, toLng: number) => Promise<{ curseTrigger: boolean; encounter: Encounter | null }>;
  pickupItem: (spawnId: string, gridX?: number, gridY?: number) => Promise<boolean>;
  inflictMinigamePenalty: (spawnId: string) => Promise<boolean>;
  saveInventory: (inventory: LooterItem[]) => Promise<void>;
  saveStorage: (storage: LooterItem[]) => Promise<void>;
  saveBags: (bags: BagItem[]) => Promise<void>;
  equipBag: (itemUid: string) => Promise<void>;
  executeCombat: (opponentId: string, opponentInventory?: LooterItem[], opponentHp?: number, opponentBags?: BagItem[]) => Promise<CombatResult>;
  curseChoice: (choice: 'flee' | 'challenge') => Promise<void>;
  sellItems: (itemUids: string[]) => Promise<void>;
  storeItems: (itemUids: string[], action: 'store' | 'retrieve', mode?: StorageAccessMode, gridX?: number, gridY?: number) => Promise<void>;
  destroyItem: (spawnId: string) => Promise<boolean>;
  setWorldTier: (tier: number) => Promise<void>;
  dropItem: (itemUid: string) => Promise<void>;
  returnToFortress: () => Promise<void>;
  loadWorldItems: (forceActive?: boolean) => Promise<void>;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  setDraggingItem: (item: LooterItem | null) => void;
  setDraggingMapItem: (item: WorldItem | null) => void;
  setShowDiscardModal: (v: boolean) => void;
  confirmDiscard: () => Promise<void>;
}

export interface LooterGameStateContextType {
  state: LooterGameState;
  worldItems: WorldItem[];
  isFortressStorageOpen: boolean;
  fortressStorageMode: StorageAccessMode;
  pickupRewardItem: LooterItem | null;
  encounter: Encounter | null;
  combatResult: CombatResult | null;
  showCurseModal: boolean;
  showMinigame: WorldItem | null;
  isLooterGameMode: boolean;
  isItemDragging: boolean;
  isChallengeActive: boolean;
  preGeneratedMinigame: { type: string, grid: any } | null;
  globalSettings: any;
  isMoving: boolean;
  isSyncing: boolean;
  draggingItem: LooterItem | null;
  draggingMapItem: WorldItem | null;
  showDiscardModal: boolean;
  dragPointerPos: { x: number; y: number };
}

export const LooterStateContext = createContext<LooterGameStateContextType | null>(null);
export const LooterActionsContext = createContext<LooterGameActions | null>(null);

export function useLooterState() {
  const ctx = useContext(LooterStateContext);
  if (!ctx) throw new Error('useLooterState must be inside LooterGameProvider');
  return ctx;
}

export function useLooterActions() {
  const ctx = useContext(LooterActionsContext);
  if (!ctx) throw new Error('useLooterActions must be inside LooterGameProvider');
  return ctx;
}

// Legacy support (optional, but better to migrate)
export function useLooterGame() {
  const state = useLooterState();
  const actions = useLooterActions();
  return { ...state, ...actions };
}
