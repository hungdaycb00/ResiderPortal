import { createContext, useContext } from 'react';
import type { LooterItem, BagItem, GridExpander, PortalItem } from './backpack/types';
export type { LooterItem, BagItem, GridExpander, PortalItem };
import { getDistanceMeters } from './backpack/utils';
import { GAME_CONFIG } from './gameConfig';

const { FORTRESS_INTERACTION_METERS } = GAME_CONFIG;
export { FORTRESS_INTERACTION_METERS };

export interface WorldItem {
  spawnId: string;
  lat: number;
  lng: number;
  chunkX?: number;
  chunkY?: number;
  slotIndex?: number;
  source?: 'legacy' | 'procedural' | 'dropped' | 'portal';
  isExpander: boolean;
  minigameType: 'chest' | null;
  item: LooterItem | GridExpander | BagItem | PortalItem;
}

export function isValidWorldItem(item: unknown): item is WorldItem {
  if (!item || typeof item !== 'object') return false;
  const value = item as Partial<WorldItem>;
  return (
    typeof value.spawnId === 'string' &&
    value.spawnId.length > 0 &&
    typeof value.lat === 'number' &&
    Number.isFinite(value.lat) &&
    typeof value.lng === 'number' &&
    Number.isFinite(value.lng) &&
    !!value.item &&
    typeof value.item === 'object'
  );
}

export function sanitizeWorldItems(items: unknown): WorldItem[] {
  return Array.isArray(items) ? items.filter(isValidWorldItem) : [];
}

export interface LooterChunkCacheEntry {
  key: string;
  chunkX: number;
  chunkY: number;
  items: WorldItem[];
  touchedAt: number;
}

export interface Encounter {
  spawnId?: string;
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
  isGhost?: boolean;
}

export interface CombatResult {
  result: 'win' | 'lose';
  combatLog: any[];
  loot?: LooterItem[];
  droppedItems?: LooterItem[];
  finalHp: number;
  finalHpA?: number;
  finalHpB?: number;
  totalTicks?: number;
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
  portalStorage: LooterItem[];
  bags: BagItem[];
  distance: number;
  energyMax: number;
  energyCurrent: number;
  activeCurses: Record<string, number>;
  isIntegratedStorageOpen: boolean;
  showCurseModal?: boolean;
}

export const isLooterAtFortress = (state: Pick<LooterGameState, 'currentLat' | 'currentLng' | 'fortressLat' | 'fortressLng'>) =>
  getDistanceMeters(state.currentLat, state.currentLng, state.fortressLat, state.fortressLng) <= FORTRESS_INTERACTION_METERS;

export type StorageAccessMode = 'fortress' | 'portal';

export interface LooterGameActions {
  setIsFortressStorageOpen: (v: boolean) => void;
  openFortressStorage: (mode?: StorageAccessMode) => void;
  setEncounter: (e: Encounter | null) => void;
  setCombatResult: (r: CombatResult | null) => void;
  setShowCurseModal: (v: boolean) => void;
  setShowMinigame: (item: WorldItem | null) => void;
  setIsLooterGameMode: (v: boolean) => void;
  setIsIntegratedStorageOpen: (v: boolean) => void;
  toggleIntegratedStorage: (mode?: StorageAccessMode) => void;
  openBackpack: () => void;
  setOpenBackpackHandler: (h: (() => void) | null) => void;
  centerOnBoat: (yOffset?: number) => void;
  setCenterBoatHandler: (h: ((yOffset?: number) => void) | null) => void;
  centerOnCombat: (yOffset?: number) => void;
  setCenterCombatHandler: (h: ((yOffset?: number) => void) | null) => void;
  setIsChallengeActive: (v: boolean) => void;
  setIsItemDragging: (v: boolean) => void;
  initGame: (lat: number, lng: number) => Promise<void>;
  loadState: () => Promise<void>;
  moveBoat: (toLat: number, toLng: number, isStep?: boolean, stepDist?: number) => Promise<{ curseTrigger: boolean; encounter: Encounter | null }>;
  pickupItem: (spawnId: string, directItem?: WorldItem, currentLat?: number, currentLng?: number) => Promise<void>;
  inflictMinigamePenalty: (spawnId: string) => Promise<boolean>;
  saveStorage: (storage: LooterItem[]) => Promise<void>;
  savePortalStorage: (storage: LooterItem[]) => Promise<void>;
  transportPortalItems: () => Promise<void>;
  saveInventory: (inventory: LooterItem[]) => void;
  saveBags: (bags: BagItem[]) => Promise<void>;
  equipBag: (itemUid: string) => Promise<void>;
  executeCombat: (opponentId: string, opponentInventory?: LooterItem[], opponentHp?: number, opponentBags?: BagItem[]) => Promise<CombatResult>;
  curseChoice: (choice: 'flee' | 'challenge') => Promise<void>;
  sellItems: (itemUids: string[]) => Promise<void>;
  storeItems: (itemUids: string[], action: 'store' | 'retrieve', mode?: StorageAccessMode, gridX?: number, gridY?: number) => Promise<void>;
  setWorldTier: (tier: number) => Promise<void>;
  returnToFortress: () => Promise<void>;
  loadWorldItems: (forceActive?: boolean, centerOverride?: { lat: number; lng: number; fortressLat?: number | null; fortressLng?: number | null }) => Promise<void>;
  dropItems: (itemUids: string[], lat: number, lng: number) => Promise<void>;
  dropCombatLoot: (items: LooterItem[]) => Promise<void>;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  clearPregeneratedFruit: () => void;
}

export interface LooterGameStateContextType {
  state: LooterGameState;
  inventory: LooterItem[];
  storage: LooterItem[];
  portalStorage: LooterItem[];
  bags: BagItem[];
  cursePercent: number;
  worldItems: WorldItem[];
  isFortressStorageOpen: boolean;
  fortressStorageMode: StorageAccessMode;
  isIntegratedStorageOpen: boolean;
  encounter: Encounter | null;
  combatResult: CombatResult | null;
  showCurseModal: boolean;
  showMinigame: WorldItem | null;
  isLooterGameMode: boolean;
  isChallengeActive: boolean;
  isItemDragging: boolean;
  globalSettings: any;
  isMoving: boolean;
  isSyncing: boolean;
  pregeneratedMinigames: {
    fruit?: any;
  };
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

export function useLooterGame() {
  const state = useLooterState();
  const actions = useLooterActions();
  return { ...state, ...state.state, ...actions };
}
// Cache buster: 2026-05-05
