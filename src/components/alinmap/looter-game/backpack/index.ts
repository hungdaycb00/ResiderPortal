// ==========================================
// Backpack Module - Barrel Export
// ==========================================

// Types
export type { LooterItem, BagItem, GridExpander, PortalItem } from './types';

// Constants
export { MAX_GRID_W, MAX_GRID_H, BAG_DEFAULTS, RARITY_COLORS, RARITY_COLORS_SIMPLE, RARITY_GLOW, BAG_BG } from './constants';

// Utils
export { getBagBonuses, countBagCells, createStarterBag, repairBagData, getDistanceMeters } from './utils';

// Components
export { default as InventoryGrid } from './InventoryGrid';
export { default as CombatInventoryGrid } from './CombatInventoryGrid';
