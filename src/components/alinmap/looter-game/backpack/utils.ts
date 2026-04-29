import type { BagItem } from './types';
import { MAX_GRID_W, MAX_GRID_H, BAG_DEFAULTS } from './constants';

// ==========================================
// Bag Stat Helpers
// ==========================================
export const getBagBonuses = (bag?: Partial<BagItem> | null) => ({
  hp: Number(bag?.hpBonus) || 0,
  weight: Number(bag?.weight) || 0,
  energyMax: Number(bag?.energyMax) || 0,
  regen: Number(bag?.energyRegen) || 0,
});

export const countBagCells = (shape: unknown): number => {
  if (!Array.isArray(shape)) return 0;
  return shape.reduce<number>((sum, row) => {
    if (!Array.isArray(row)) return sum;
    return sum + row.filter(Boolean).length;
  }, 0);
};

// ==========================================
// Bag Creation & Repair
// ==========================================
export const createStarterBag = (existing?: Partial<BagItem>): BagItem => ({
  uid: existing?.uid || Math.random().toString(36).substring(2, 10),
  id: 'basic_bag',
  name: existing?.name || 'Balo Cơ Bản',
  icon: existing?.icon || '🎒',
  rarity: existing?.rarity || 'common',
  price: existing?.price ?? BAG_DEFAULTS.basic_bag.price ?? 0,
  weight: existing?.weight ?? BAG_DEFAULTS.basic_bag.weight ?? 0,
  hpBonus: existing?.hpBonus ?? BAG_DEFAULTS.basic_bag.hpBonus ?? 10,
  energyMax: existing?.energyMax ?? BAG_DEFAULTS.basic_bag.energyMax ?? 5,
  energyRegen: existing?.energyRegen ?? BAG_DEFAULTS.basic_bag.energyRegen ?? 1,
  gridX: Math.floor((MAX_GRID_W - 3) / 2),
  gridY: Math.floor((MAX_GRID_H - 3) / 2),
  rotated: existing?.rotated ?? false,
  shape: [[true, true, true], [true, true, true], [true, true, true]],
  width: 3,
  height: 3,
  cells: 9,
  type: 'bag',
  isStarter: existing?.isStarter ?? true,
  dropProtected: existing?.dropProtected ?? true,
});

export const repairBagData = (rawBag?: BagItem): { bag: BagItem; repaired: boolean } => {
  if (!rawBag) return { bag: createStarterBag(), repaired: true };

  const bag: BagItem = { ...rawBag };
  let repaired = false;
  const bagDefaults = BAG_DEFAULTS[bag.id || 'basic_bag'] || BAG_DEFAULTS.basic_bag;
  const width = Number(bag.width) || Number(bagDefaults.width) || 3;
  const height = Number(bag.height) || Number(bagDefaults.height) || 3;

  if (!Array.isArray(bag.shape) || bag.shape.length === 0) {
    bag.shape = Array.from({ length: height }, () => Array(width).fill(true));
    bag.width = width;
    bag.height = height;
    repaired = true;
  }

  const shapeCells = countBagCells(bag.shape);
  if (width === 3 && height === 3 && shapeCells !== 9) {
    return { bag: createStarterBag(bag), repaired: true };
  }

  if (bag.width !== width) { bag.width = width; repaired = true; }
  if (bag.height !== height) { bag.height = height; repaired = true; }
  const currentCells = countBagCells(bag.shape);
  if (bag.cells !== currentCells) { bag.cells = currentCells; repaired = true; }

  const correctX = Math.floor((MAX_GRID_W - bag.width) / 2);
  const correctY = Math.floor((MAX_GRID_H - bag.height) / 2);
  if (bag.gridX !== correctX || bag.gridY !== correctY) {
    bag.gridX = correctX;
    bag.gridY = correctY;
    repaired = true;
  }
  if (!bag.uid) { bag.uid = Math.random().toString(36).substring(2, 10); repaired = true; }
  if (!bag.id) { bag.id = 'basic_bag'; repaired = true; }
  if (!bag.name) { bag.name = bagDefaults.name || 'Balo Cơ Bản'; repaired = true; }
  if (!bag.icon) { bag.icon = bagDefaults.icon || '🎒'; repaired = true; }
  if (!bag.rarity) { bag.rarity = bagDefaults.rarity || 'common'; repaired = true; }
  if (bag.price == null) { bag.price = Number(bagDefaults.price) || 0; repaired = true; }
  if (bag.weight == null) { bag.weight = Number(bagDefaults.weight) || 0; repaired = true; }
  if (bag.hpBonus == null) { bag.hpBonus = Number(bagDefaults.hpBonus) || 0; repaired = true; }
  if (bag.energyMax == null) { bag.energyMax = Number(bagDefaults.energyMax) || 0; repaired = true; }
  if (bag.energyRegen == null) { bag.energyRegen = Number(bagDefaults.energyRegen) || 0; repaired = true; }
  if (bag.isStarter == null) { bag.isStarter = !!bagDefaults.isStarter; repaired = true; }
  if (bag.dropProtected == null) { bag.dropProtected = bagDefaults.dropProtected !== false; repaired = true; }
  if (bag.cells != null && bag.cells < 9) { bag.cells = 9; repaired = true; }
  if (bag.type !== 'bag') { bag.type = 'bag'; repaired = true; }

  return { bag, repaired };
};
