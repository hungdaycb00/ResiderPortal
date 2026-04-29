import { createContext, useContext } from 'react';
import type { LooterItem, BagItem, GridExpander, PortalItem } from './backpack/types';

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

export interface WorldItem {
  spawnId: string;
  lat: number;
  lng: number;
  isExpander: boolean;
  minigameType: 'fishing' | 'diving' | 'chest';
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

export interface LooterGameContextType {
  state: LooterGameState;
  worldItems: WorldItem[];
  isFortressStorageOpen: boolean;
  setIsFortressStorageOpen: (v: boolean) => void;
  fortressStorageMode: StorageAccessMode;
  openFortressStorage: (mode?: StorageAccessMode) => void;
  pickupRewardItem: LooterItem | null;
  setPickupRewardItem: (item: LooterItem | null) => void;
  encounter: Encounter | null;
  setEncounter: (e: Encounter | null) => void;
  combatResult: CombatResult | null;
  setCombatResult: (r: CombatResult | null) => void;
  showCurseModal: boolean;
  setShowCurseModal: (v: boolean) => void;
  showMinigame: WorldItem | null;
  setShowMinigame: (item: WorldItem | null) => void;
  isLootGameMode: boolean;
  setIsLootGameMode: (v: boolean) => void;
  openBackpack: () => void;
  setOpenBackpackHandler: (h: (() => void) | null) => void;
  isItemDragging: boolean;
  setIsItemDragging: (v: boolean) => void;
  isChallengeActive: boolean;
  setIsChallengeActive: (v: boolean) => void;
  preGeneratedMinigame: { type: string, grid: any } | null;
  setPreGeneratedMinigame: (v: { type: string, grid: any } | null) => void;
  globalSettings: any;
  // Actions
  initGame: (lat: number, lng: number) => Promise<void>;
  loadState: () => Promise<void>;
  moveBoat: (toLat: number, toLng: number) => Promise<{ curseTrigger: boolean; encounter: Encounter | null }>;
  pickupItem: (spawnId: string) => Promise<boolean>;
  inflictMinigamePenalty: (spawnId: string) => Promise<boolean>;
  saveInventory: (inventory: LooterItem[]) => Promise<void>;
  saveStorage: (storage: LooterItem[]) => Promise<void>;
  saveBags: (bags: BagItem[]) => Promise<void>;
  pendingBagSwap: BagItem | null;
  setPendingBagSwap: (bag: BagItem | null) => void;
  acceptBagSwap: (newBag: BagItem) => void;
  executeCombat: (opponentId: string, opponentInventory?: LooterItem[], opponentHp?: number, opponentBags?: BagItem[]) => Promise<CombatResult>;
  curseChoice: (choice: 'flee' | 'challenge') => Promise<void>;
  sellItems: (itemUids: string[]) => Promise<void>;
  storeItems: (itemUids: string[], action: 'store' | 'retrieve', mode?: StorageAccessMode, gridX?: number, gridY?: number) => Promise<void>;
  destroyItem: (spawnId: string) => Promise<boolean>;
  setWorldTier: (tier: number) => Promise<void>;
  dropItem: (itemUid: string) => Promise<void>;
  returnToFortress: () => Promise<void>;
  loadWorldItems: (forceActive?: boolean) => Promise<void>;
  isMoving: boolean;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  draggingItem: LooterItem | null;
  setDraggingItem: (item: LooterItem | null) => void;
}

export const LooterGameContext = createContext<LooterGameContextType | null>(null);

export function useLooterGame() {
  const ctx = useContext(LooterGameContext);
  if (!ctx) throw new Error('useLooterGame must be inside LooterGameProvider');
  return ctx;
}
