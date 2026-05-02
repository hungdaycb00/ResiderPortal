/**
 * items.js - Dữ liệu vật phẩm và logic liên quan
 */

import {  TIER_MULTIPLIERS, RARITY, DROP_WEIGHTS, ITEM_SHAPES  } from './constants';
import {  generateUid, toFiniteNumber  } from './utils';

const BASE_ITEMS = [
  // --- HỆ VŨ KHÍ (Sát thương cực mạnh) ---
  { id: 'fish_small',     name: 'Cá Nhỏ',        icon: '🐟', rarity: RARITY.COMMON,   price: 2,   weight: { min: 5,  max: 10 },  hpBonus: 0,                   energyMax: 0, energyRegen: 0, energyCost: 20, gridW: 1, gridH: 1 },
  { id: 'seahorse',       name: 'Cá Ngựa',        icon: '🐡', rarity: RARITY.COMMON,   price: 5,   weight: { min: 8,  max: 15 },  hpBonus: 0,                   energyMax: 0, energyRegen: 1, energyCost: 35, gridW: 1, gridH: 2 },
  { id: 'swordfish',      name: 'Cá Kiếm',        icon: '🐠', rarity: RARITY.COMMON,   price: 8,   weight: { min: 15, max: 25 },  hpBonus: 0,                   energyMax: 0, energyRegen: 0, energyCost: 50, gridW: 2, gridH: 1 },
  { id: 'baby_shark',     name: 'Cá Mập Con',     icon: '🦈', rarity: RARITY.COMMON,   price: 15,  weight: { min: 30, max: 50 },  hpBonus: 0,                   energyMax: 0, energyRegen: 2, energyCost: 80, gridW: 2, gridH: 2, shape: ITEM_SHAPES.SQUARE_2x2 },
  { id: 'small_whale',    name: 'Cá Voi Nhỏ',     icon: '🐋', rarity: RARITY.COMMON,   price: 25,  weight: { min: 50, max: 80 },  hpBonus: 20,                  energyMax: 10, energyRegen: 0, energyCost: 120, gridW: 3, gridH: 2 },
  
  { id: 'ancient_sword',  name: 'Kiếm Cổ',         icon: '🗡️', rarity: RARITY.RARE,     price: 60,  weight: { min: 60, max: 100 }, hpBonus: 0,  energyMax: 20, energyRegen: 0,  energyCost: 150, gridW: 1, gridH: 3 },
  { id: 'trident',        name: 'Trident Poseidon', icon: '🔱', rarity: RARITY.LEGENDARY, price: 300, weight: { min: 120, max: 200 }, hpBonus: 0,  energyMax: 50, energyRegen: 0,  energyCost: 250, gridW: 1, gridH: 4 },

  // --- HỆ PHỤ KIỆN (Stats & Support - Sát thương không đáng kể) ---
  { id: 'coral_small',    name: 'San Hô Nhỏ',     icon: '🪸', rarity: RARITY.UNCOMMON, price: 3,   weight: { min: 0.1, max: 0.5 }, hpBonus: 10, energyMax: 5,  energyRegen: 2,  energyCost: 10, gridW: 1, gridH: 1 },
  { id: 'coral_reef',     name: 'Rạn San Hô',     icon: '🏝️', rarity: RARITY.UNCOMMON, price: 50,  weight: { min: 1.0, max: 2.0 }, hpBonus: 50, energyMax: 30, energyRegen: 10, energyCost: 30, gridW: 3, gridH: 3, shape: ITEM_SHAPES.CROSS_3x3 },
  { id: 'black_pearl',    name: 'Ngọc Trai Đen',   icon: '🖤', rarity: RARITY.LEGENDARY, price: 200, weight: { min: 2.0, max: 5.0 }, hpBonus: 150, energyMax: 80, energyRegen: 20, energyCost: 50, gridW: 1, gridH: 1 },
  { id: 'gold_chest',     name: 'Rương Vàng Cổ',   icon: '💰', rarity: RARITY.LEGENDARY, price: 500, weight: { min: 5.0, max: 10.0 }, hpBonus: 100, energyMax: 100, energyRegen: 15, energyCost: 80, gridW: 3, gridH: 2 },
];

const GRID_EXPANDERS = [
  { id: 'plank',      name: 'Tấm Ván',      icon: '🪵', expandW: 1, expandH: 2, dropRate: 0.15 },
  { id: 'raft',       name: 'Mảng Gỗ',      icon: '🛟', expandW: 1, expandH: 4, dropRate: 0.08 },
  { id: 'cabin',      name: 'Khoang Thuyền', icon: '🚢', expandW: 2, expandH: 3, dropRate: 0.04 },
  { id: 'cargo_hold', name: 'Hầm Tàu',      icon: '⛵', expandW: 2, expandH: 6, dropRate: 0.02 },
];

function getScaledItem(baseItem, tier) {
  const mult = TIER_MULTIPLIERS[tier] || 1;

  const rollStat = (stat) => {
    if (typeof stat === 'number') return stat;
    if (stat && typeof stat === 'object' && 'min' in stat && 'max' in stat) {
      return stat.min + Math.random() * (stat.max - stat.min);
    }
    return 0;
  };

  return {
    uid: generateUid(),
    id: baseItem.id,
    name: baseItem.name,
    icon: baseItem.icon,
    rarity: baseItem.rarity,
    tier,
    price: Math.round(baseItem.price * mult),
    weight: Math.round(rollStat(baseItem.weight) * mult),
    hpBonus: Math.round(rollStat(baseItem.hpBonus) * mult),
    energyMax: Math.round(rollStat(baseItem.energyMax) * mult),
    energyRegen: Math.round(rollStat(baseItem.energyRegen) * mult),
    energyCost: toFiniteNumber(baseItem.energyCost, 0),
    gridW: baseItem.gridW,
    gridH: baseItem.gridH,
    gridX: baseItem.gridX ?? -1,
    gridY: baseItem.gridY ?? -1,
    shape: baseItem.shape || null,
    rotated: false, // Rotation disabled in Loot Game
  };
}

function rollRandomItem(tier) {
  // Roll rarity first
  const roll = Math.random() * 100;
  let cumulative = 0;
  let targetRarity = RARITY.COMMON;
  for (const [rarity, weight] of Object.entries(DROP_WEIGHTS)) {
    cumulative += weight;
    if (roll < cumulative) { targetRarity = rarity; break; }
  }

  let pool = BASE_ITEMS.filter(i => i.rarity === targetRarity);
  
  // Tier 0, 1: Reduce spawn rate of items > 4 grid cells
  if (tier <= 1) {
    const largeItems = pool.filter(i => (i.gridW * i.gridH) > 4);
    const smallItems = pool.filter(i => (i.gridW * i.gridH) <= 4);
    
    // If pool has both large and small, 90% chance to pick from small pool only
    if (largeItems.length > 0 && smallItems.length > 0 && Math.random() < 0.9) {
      pool = smallItems;
    }
  }

  if (pool.length === 0) {
    console.error(`[LootGame] No items found for rarity: ${targetRarity}`);
    return getScaledItem(BASE_ITEMS[0], tier);
  }
  const base = pool[Math.floor(Math.random() * pool.length)];
  return getScaledItem(base, tier);
}

function rollGridExpander() {
  const roll = Math.random();
  let cumulative = 0;
  for (const exp of GRID_EXPANDERS) {
    cumulative += exp.dropRate;
    if (roll < cumulative) return { ...exp, type: 'grid_expander' };
  }
  return null; // No expander dropped
}

export { 
  BASE_ITEMS,
  GRID_EXPANDERS,
  getScaledItem,
  rollRandomItem,
  rollGridExpander,
 };
