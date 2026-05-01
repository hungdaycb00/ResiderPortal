import type { BagItem } from './types';

// ==========================================
// Grid Dimensions
// ==========================================
export const MAX_GRID_W = 10;
export const MAX_GRID_H = 12;

// ==========================================
// Bag Preset Defaults
// ==========================================
export const BAG_DEFAULTS: Record<string, Partial<BagItem>> = {
  basic_bag: { name: 'Balo Cơ Bản', icon: '🎒', rarity: 'common', width: 3, height: 3, cells: 9, price: 0, weight: 0, hpBonus: 10, energyMax: 5, energyRegen: 1, isStarter: true, dropProtected: true },
  leather_bag: { name: 'Balo Da', icon: '👜', rarity: 'common', width: 4, height: 4, cells: 16, price: 80, weight: 3, hpBonus: 18, energyMax: 8, energyRegen: 1 },
  duffel_bag: { name: 'Túi Trống', icon: '🧳', rarity: 'uncommon', width: 5, height: 4, cells: 20, price: 180, weight: 5, hpBonus: 26, energyMax: 12, energyRegen: 2 },
  cross_bag: { name: 'Balo Chữ Thập', icon: '✚', rarity: 'uncommon', width: 5, height: 5, cells: 13, price: 240, weight: 7, hpBonus: 34, energyMax: 18, energyRegen: 3 },
  war_bag: { name: 'Balo Chiến Binh', icon: '⚔️', rarity: 'rare', width: 5, height: 5, cells: 21, price: 420, weight: 10, hpBonus: 48, energyMax: 24, energyRegen: 4 },
  voyager_pack: { name: 'Balo Thám Hiểm', icon: '💎', rarity: 'legendary', width: 7, height: 6, cells: 42, price: 900, weight: 14, hpBonus: 72, energyMax: 40, energyRegen: 6 },
};

// ==========================================
// Rarity Color Maps (shared across inventory UIs)
// ==========================================
export const RARITY_COLORS: Record<string, string> = {
  common: 'border-sky-500/40 text-sky-500',
  uncommon: 'border-emerald-500/40 text-emerald-500',
  rare: 'border-amber-500/40 text-amber-500',
  legendary: 'border-purple-500/40 text-purple-500',
};

export const RARITY_COLORS_SIMPLE: Record<string, string> = {
  common: 'bg-sky-500/10 border-sky-500/30',
  uncommon: 'bg-emerald-500/10 border-emerald-500/30',
  rare: 'bg-amber-500/10 border-amber-500/30',
  legendary: 'bg-purple-500/10 border-purple-500/30',
};

export const RARITY_GLOW: Record<string, string> = {
  common: '',
  uncommon: 'shadow-emerald-500/20',
  rare: 'shadow-amber-500/20',
  legendary: 'shadow-purple-500/20 animate-pulse',
};

export const BAG_BG: Record<string, string> = {
  common: 'rgba(56, 189, 248, 0.05)',
  uncommon: 'rgba(52, 211, 153, 0.05)',
  rare: 'rgba(251, 191, 36, 0.05)',
  legendary: 'rgba(192, 132, 252, 0.05)',
};
