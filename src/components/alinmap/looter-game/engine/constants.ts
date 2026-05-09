/**
 * constants.js - Hằng số và cấu hình định dạng vật phẩm
 */

const TIER_MULTIPLIERS = {
  0: 0.5,   // 0 gold
  1: 1.0,   // 10 gold
  2: 3.0,   // 100 gold
  3: 8.0,   // 1,000 gold
  4: 20.0,  // 10,000 gold
  5: 50.0,  // 100,000 gold
};

const TIER_COSTS = { 0: 0, 1: 10, 2: 100, 3: 1000, 4: 10000, 5: 100000 };

const DEFAULT_SETTINGS = {
  speedMultiplier: 1.0,
  spawnRadiusDeg: 0.02,
  spawnItemCount: 8,
  distancePerCurseMeters: 250 // Tính theo mét
};

function getSettings() {
  return DEFAULT_SETTINGS;
}

const RARITY = { COMMON: 'common', UNCOMMON: 'uncommon', RARE: 'rare', LEGENDARY: 'legendary', GRID_EXPANDER: 'grid_expander' };
const DROP_WEIGHTS = { [RARITY.COMMON]: 40, [RARITY.UNCOMMON]: 35, [RARITY.RARE]: 20, [RARITY.LEGENDARY]: 5 };

// Shape definitions for non-rectangular items
const ITEM_SHAPES = {
  SQUARE_2x2: [[1, 1], [1, 1]],
  L_SHAPE:    [[1, 0], [1, 1]],
  L_SHAPE_3x2: [[1, 0], [1, 0], [1, 1]],
  CROSS_3x3:  [[0, 1, 0], [1, 1, 1], [0, 1, 0]],
  PLUS_2x2:   [[1, 1], [1, 0]], // Small plus/L
  T_SHAPE:    [[1, 1, 1], [0, 1, 0]],
};

const MAX_GRID_W = 10;
const MAX_GRID_H = 12;

const BAG_POOL = [
  { id: 'basic_bag',   name: 'Balo Cơ Bản',      icon: '🎒', rarity: RARITY.COMMON,    width: 3, height: 3, cells: 9,  dropRate: 0,
    shape: [[1,1,1],[1,1,1],[1,1,1]] },
  { id: 'leather_bag', name: 'Balo Da',          icon: '👝', rarity: RARITY.COMMON,    width: 4, height: 4, cells: 16, dropRate: 0.18,
    shape: [[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1]] },
  { id: 'duffel_bag',  name: 'Túi Trống',        icon: '🧳', rarity: RARITY.UNCOMMON,  width: 5, height: 4, cells: 20, dropRate: 0.18,
    shape: [[1,1,1,1,1],[1,1,1,1,1],[1,1,1,1,1],[1,1,1,1,1]] },
  { id: 'cross_bag',   name: 'Balo Chữ Thập',    icon: '✚',  rarity: RARITY.UNCOMMON,  width: 5, height: 5, cells: 13, dropRate: 0.10,
    shape: [[0,0,1,0,0],[0,1,1,1,0],[1,1,1,1,1],[0,1,1,1,0],[0,0,1,0,0]] },
  { id: 'war_bag',     name: 'Balo Chiến Binh',   icon: '⚔️', rarity: RARITY.RARE,      width: 5, height: 5, cells: 21, dropRate: 0.04,
    shape: [[0,1,1,1,0],[1,1,1,1,1],[1,1,1,1,1],[1,1,1,1,1],[0,1,1,1,0]] },
  { id: 'voyager_pack',name: 'Balo Thám Hiểm',    icon: '💎', rarity: RARITY.LEGENDARY, width: 7, height: 6, cells: 42, dropRate: 0.01,
    shape: [[1,1,1,1,1,1,1],[1,1,1,1,1,1,1],[1,1,1,1,1,1,1],[1,1,1,1,1,1,1],[1,1,1,1,1,1,1],[1,1,1,1,1,1,1]] },
];

const BAG_STATS = {
  basic_bag: { price: 0, weight: 1.0, hpBonus: 10, energyMax: 5, energyRegen: 1, isStarter: true, dropProtected: true },
  leather_bag: { price: 80, weight: 2.0, hpBonus: 18, energyMax: 8, energyRegen: 1, dropProtected: false },
  duffel_bag: { price: 180, weight: 3.5, hpBonus: 26, energyMax: 12, energyRegen: 2, dropProtected: false },
  cross_bag: { price: 240, weight: 5.0, hpBonus: 34, energyMax: 18, energyRegen: 3, dropProtected: false },
  war_bag: { price: 420, weight: 8.0, hpBonus: 48, energyMax: 24, energyRegen: 4, dropProtected: false },
  voyager_pack: { price: 900, weight: 12.0, hpBonus: 72, energyMax: 40, energyRegen: 6, dropProtected: false },
};

const GHOST_NAMES = [
  'Bóng Ma Tàn Tích', 'Linh Hồn Lạc Lối', 'Kẻ Gác Đền Vong Hồn', 'Bóng Đen Lang Thang',
  'Ám Ảnh Cổ Đại', 'Bóng Đêm Cuối Cùng', 'Hồn Ma Của Những Kho Báu', 'Tiếng Khóc Trong Hang',
  'Kẻ Săn Đuổi', 'Bóng Ma Sa Mạc', 'Linh Hồn Của Những Báu Vật', 'Kẻ Gác Cổng Vô Hình',
];

const SPAWN_MIN_DISTANCE_FROM_FORTRESS_METERS = 1500;
const SPAWN_MIN_ITEM_SPACING_METERS = 2000;
const SPAWN_MAX_ITEM_SPACING_METERS = 5000;
const SPAWN_RING_RADIUS_METERS = 10000;

export {
  TIER_MULTIPLIERS,
  TIER_COSTS,
  RARITY,
  DROP_WEIGHTS,
  ITEM_SHAPES,
  MAX_GRID_W,
  MAX_GRID_H,
  BAG_POOL,
  BAG_STATS,
  GHOST_NAMES,
  SPAWN_MIN_DISTANCE_FROM_FORTRESS_METERS,
  SPAWN_MIN_ITEM_SPACING_METERS,
  SPAWN_MAX_ITEM_SPACING_METERS,
  SPAWN_RING_RADIUS_METERS,
  getSettings,
 };
