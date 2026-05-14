import type { Encounter, CombatResult, StorageAccessMode } from './LooterGameContext';

// ==========================================
// UI State Reducer (gom 15 useState → 1 useReducer)
// ==========================================
export interface UIState {
  encounter: Encounter | null;
  combatResult: CombatResult | null;
  showCurseModal: boolean;
  showMinigame: any | null;
  isLooterGameMode: boolean;
  isChallengeActive: boolean;
  isFortressStorageOpen: boolean;
  fortressStorageMode: StorageAccessMode;
  isIntegratedStorageOpen: boolean;
}

export type UIAction =
  | { type: 'SET_ENCOUNTER'; payload: Encounter | null }
  | { type: 'SET_COMBAT_RESULT'; payload: CombatResult | null }
  | { type: 'SET_SHOW_CURSE_MODAL'; payload: boolean }
  | { type: 'SET_SHOW_MINIGAME'; payload: any | null }
  | { type: 'SET_LOOTER_GAME_MODE'; payload: boolean }
  | { type: 'SET_CHALLENGE_ACTIVE'; payload: boolean }
  | { type: 'SET_FORTRESS_STORAGE_OPEN'; payload: boolean }
  | { type: 'SET_FORTRESS_STORAGE_MODE'; payload: StorageAccessMode }
  | { type: 'OPEN_FORTRESS_STORAGE'; payload: StorageAccessMode }
  | { type: 'SET_INTEGRATED_STORAGE_OPEN'; payload: boolean }
  | { type: 'TOGGLE_INTEGRATED_STORAGE'; payload?: StorageAccessMode };

export const initialUIState: UIState = {
  encounter: null, combatResult: null,
  showCurseModal: false, showMinigame: null, isLooterGameMode: false,
  isChallengeActive: false, isFortressStorageOpen: false, fortressStorageMode: 'fortress',
  isIntegratedStorageOpen: false,
};

export function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SET_ENCOUNTER':
      if (action.payload && state.isIntegratedStorageOpen) return state;
      return action.payload
        ? { ...state, encounter: action.payload, showMinigame: null, showCurseModal: false, isIntegratedStorageOpen: false, isFortressStorageOpen: false }
        : { ...state, encounter: null, showCurseModal: false };
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
