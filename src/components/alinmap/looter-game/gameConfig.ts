/**
 * Centralized Looter Game Configuration
 */

export const GAME_CONFIG = {
  // Navigation & Interaction
  FORTRESS_INTERACTION_METERS: 250,
  PICKUP_INTERACTION_METERS: 150,
  PORTAL_SPACING_METERS: 5000,
  PORTAL_SEARCH_RADIUS: 2,

  // UI & UX
  SYNC_HEARTBEAT_MS: 30000,
  NOTIFY_DURATION_MS: 3000,
  
  // Inventory Scaling (Grid sizes)
  GRID_MIN_W: 4,
  GRID_MIN_H: 4,
  GRID_MAX_W: 7,
  GRID_MAX_H: 6,

  // Combat & Balancing
  BASE_HP: 100,
  CURSE_GAIN_MOVE_BASE: 0.1, // % per meter
  CURSE_GAIN_PICKUP: 5,     // % flat
  CURSE_GAIN_MINIGAME_LOSE: 15, // % flat
  
  // Tiers
  TIER_MAX: 5,
  TIER_COSTS: [0, 50, 150, 450, 1000, 2500],
};

export default GAME_CONFIG;
