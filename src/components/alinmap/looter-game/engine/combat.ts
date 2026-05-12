/**
 * combat.js - Hệ thống chiến đấu (Combat Engine)
 */

import {  TIER_MULTIPLIERS  } from './constants';
import {  toFiniteNumber, isItemInBag  } from './utils';

function getCombatInventory(inventory) {
  return Array.isArray(inventory)
    ? inventory.filter(item => item && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function isPlacedCombatItem(item, bag) {
  return item && typeof item === 'object' &&
    toFiniteNumber(item.gridX, -1) >= 0 &&
    toFiniteNumber(item.gridY, -1) >= 0 &&
    isItemInBag(item, item.gridX, item.gridY, bag);
}

function getActiveCurses(activeCurses) {
  return activeCurses && typeof activeCurses === 'object' && !Array.isArray(activeCurses)
    ? activeCurses
    : {};
}

function getDroppableCombatItems(inventory) {
  return getCombatInventory(inventory).filter((item) => !item.dropProtected);
}

function pickRandomSubset(items, count) {
  const pool = [...items];
  const picked = [];
  const targetCount = Math.min(pool.length, Math.max(0, count));

  for (let i = 0; i < targetCount; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }

  return picked;
}

function rollProportionalDrops(inventory, dropRate) {
  const droppableItems = getDroppableCombatItems(inventory);
  if (!droppableItems.length) return [];

  const clampedRate = Math.max(0, Math.min(1, toFiniteNumber(dropRate, 0)));
  const dropCount = Math.max(1, Math.floor(droppableItems.length * clampedRate));
  return pickRandomSubset(droppableItems, dropCount);
}

function calcTotalStats(inventory, bag, activeCurses = {}) {
  let totalHp = 0, totalWeight = 0, totalEnergyMax = 0, totalEnergyRegen = 0;
  for (const item of getCombatInventory(inventory)) {
    if (!isPlacedCombatItem(item, bag)) continue; // Only count placed items IN BAG
    totalHp += toFiniteNumber(item.hpBonus, 0);
    totalWeight += toFiniteNumber(item.weight, 0);
    totalEnergyMax += toFiniteNumber(item.energyMax, 0);
    totalEnergyRegen += toFiniteNumber(item.energyRegen, 0);
  }
  if (bag && typeof bag === 'object') {
    totalHp += toFiniteNumber(bag.hpBonus, 0);
    totalWeight += toFiniteNumber(bag.weight, 0);
    totalEnergyMax += toFiniteNumber(bag.energyMax, 0);
    totalEnergyRegen += toFiniteNumber(bag.energyRegen, 0);
  }

  // Apply Curse Debuffs (5% each stack)
  const curses = getActiveCurses(activeCurses);
  const hpMult = Math.max(0.1, 1 - toFiniteNumber(curses.hp_debuff, 0) * 0.05);
  const dmgMult = Math.max(0.1, 1 - toFiniteNumber(curses.dmg_debuff, 0) * 0.05);
  const regenMult = Math.max(0.1, 1 - toFiniteNumber(curses.regen_debuff, 0) * 0.05);

  return { 
    totalHp: Math.round(totalHp * hpMult), 
    totalWeight: Math.round(totalWeight * dmgMult), 
    totalEnergyMax, 
    totalEnergyRegen: totalEnergyRegen * regenMult 
  };
}

function simulateCombat(playerA, playerB) {
  const inventoryA = getCombatInventory(playerA?.inventory);
  const inventoryB = getCombatInventory(playerB?.inventory);
  const activeCursesA = getActiveCurses(playerA?.activeCurses);
  const activeCursesB = getActiveCurses(playerB?.activeCurses);

  // Calculate total stats from inventory items
  const statsA = calcTotalStats(inventoryA, playerA?.bag, activeCursesA);
  const statsB = calcTotalStats(inventoryB, playerB?.bag, activeCursesB);

  const hpA = { current: toFiniteNumber(playerA?.baseMaxHp, 100) + statsA.totalHp };
  const hpB = { current: toFiniteNumber(playerB?.baseMaxHp, 100) + statsB.totalHp };

  const regenA = 2 + (statsA.totalEnergyRegen * 0.1);
  const regenB = 2 + (statsB.totalEnergyRegen * 0.1);

  const maxActionBarA = 100 + statsA.totalEnergyMax;
  const maxActionBarB = 100 + statsB.totalEnergyMax;

  // Curses multipliers for items
  const dmgDebuffA = Math.max(0.1, 1 - (toFiniteNumber(activeCursesA.dmg_debuff, 0) * 0.05));
  const dmgDebuffB = Math.max(0.1, 1 - (toFiniteNumber(activeCursesB.dmg_debuff, 0) * 0.05));

  // Add small random jitter to starting progress (0-10%) to prevent perfect sync
  let actionProgressA = Math.random() * 10;
  let actionProgressB = Math.random() * 10;

  const combatLog = [];
  let tick = 0;
  const MAX_TICKS = 100000;

  const itemsA = inventoryA.filter(item => isPlacedCombatItem(item, playerA?.bag));
  const itemsB = inventoryB.filter(item => isPlacedCombatItem(item, playerB?.bag));

  while (hpA.current > 0 && hpB.current > 0 && tick < MAX_TICKS) {
    tick++;
    actionProgressA = Math.min(actionProgressA + regenA, maxActionBarA);
    actionProgressB = Math.min(actionProgressB + regenB, maxActionBarB);

    // Player A attacks — Mana phải đầy mới được đánh
    if (actionProgressA >= maxActionBarA) {
      const weaponsA = itemsA.filter(i => toFiniteNumber(i.weight, 0) > 0);
      if (weaponsA.length > 0) {
        const idx = Math.floor(Math.random() * weaponsA.length);
        const thrown = weaponsA[idx];
        const damage = Math.max(1, Math.round(toFiniteNumber(thrown.weight, 0) * dmgDebuffA));
        hpB.current -= damage;
        const energySpent = actionProgressA;
        actionProgressA = 0; // RESET VỀ 0
        combatLog.push({ tick, attacker: 'A', item: thrown, damage, targetHp: hpB.current, energySpent, energyRemaining: 0 });
        if (hpB.current <= 0) break;
      }
    }

    // Ghost B attacks — Mana phải đầy mới được đánh
    if (actionProgressB >= maxActionBarB) {
      const weaponsB = itemsB.filter(i => toFiniteNumber(i.weight, 0) > 0);
      if (weaponsB.length > 0) {
        const idx = Math.floor(Math.random() * weaponsB.length);
        const thrown = weaponsB[idx];
        const damage = Math.max(1, Math.round(toFiniteNumber(thrown.weight, 0) * dmgDebuffB));
        hpA.current -= damage;
        const energySpent = actionProgressB;
        actionProgressB = 0; // RESET VỀ 0
        combatLog.push({ tick, attacker: 'B', item: thrown, damage, targetHp: hpA.current, energySpent, energyRemaining: 0 });
        if (hpA.current <= 0) break;
      }
    }
  }

  const winner = hpA.current > 0 ? 'A' : (hpB.current > 0 ? 'B' : 'DRAW');

  // Loser drops: roll by percentage of eligible items, minimum 1 item
  let droppedItems = [];
  if (winner === 'A') {
    droppedItems = rollProportionalDrops(inventoryB, 0.25);
  } else if (winner === 'B') {
    droppedItems = rollProportionalDrops(inventoryA, 0.25);
  }

  return { winner, combatLog, droppedItems, finalHpA: hpA.current, finalHpB: hpB.current, totalTicks: tick };
}

function rollDeathDrops(inventory) {
  // Lose 25% of eligible items, minimum 1
  return rollProportionalDrops(inventory, 0.25);
}

function rollFleeDrops(inventory, dropRate = 0.25) {
  // Lose a proportional share of eligible items, minimum 1
  return rollProportionalDrops(inventory, dropRate);
}

export { 
  getCombatInventory,
  isPlacedCombatItem,
  getActiveCurses,
  calcTotalStats,
  simulateCombat,
  rollDeathDrops,
  rollFleeDrops,
 };
