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

    // Player A attacks
    const weaponsA = itemsA.filter(i => {
      const cost = toFiniteNumber(i.energyCost, 0) || 10;
      return toFiniteNumber(i.weight, 0) > 0 && cost <= actionProgressA;
    });
    
    if (weaponsA.length > 0) {
      const idx = Math.floor(Math.random() * weaponsA.length);
      const thrown = weaponsA[idx];
      const damage = Math.max(1, Math.round(toFiniteNumber(thrown.weight, 0) * dmgDebuffA));
      hpB.current -= damage;
      const energySpent = actionProgressA; // Lấy toàn bộ mana hiện có
      actionProgressA = 0; // RESET VỀ 0
      combatLog.push({ tick, attacker: 'A', item: thrown, damage, targetHp: hpB.current, energySpent, energyRemaining: 0 });
      if (hpB.current <= 0) break;
    }

    // Ghost B attacks
    const weaponsB = itemsB.filter(i => {
      const cost = toFiniteNumber(i.energyCost, 0) || 10; 
      return toFiniteNumber(i.weight, 0) > 0 && cost <= actionProgressB;
    });
    
    if (weaponsB.length > 0) {
      const idx = Math.floor(Math.random() * weaponsB.length);
      const thrown = weaponsB[idx];
      const damage = Math.max(1, Math.round(toFiniteNumber(thrown.weight, 0) * dmgDebuffB));
      hpA.current -= damage;
      const energySpent = actionProgressB; // Lấy toàn bộ mana hiện có
      actionProgressB = 0; // RESET VỀ 0
      combatLog.push({ tick, attacker: 'B', item: thrown, damage, targetHp: hpA.current, energySpent, energyRemaining: 0 });
      if (hpA.current <= 0) break;
    }
  }

  const winner = hpA.current > 0 ? 'A' : (hpB.current > 0 ? 'B' : 'DRAW');

  // Loser drops: 50% roll per item
  let droppedItems = [];
  if (winner === 'A') {
    droppedItems = inventoryB.filter((item) => !item.dropProtected && Math.random() < 0.5);
  } else if (winner === 'B') {
    droppedItems = inventoryA.filter((item) => !item.dropProtected && Math.random() < 0.5);
  }

  return { winner, combatLog, droppedItems, finalHpA: hpA.current, finalHpB: hpB.current, totalTicks: tick };
}

function rollDeathDrops(inventory) {
  // 75% roll per item
  return getCombatInventory(inventory).filter((item) => !item.dropProtected && Math.random() < 0.75);
}

function rollFleeDrops(inventory, dropRate = 0.5) {
  // Configurable drop rate per item
  return getCombatInventory(inventory).filter((item) => !item.dropProtected && Math.random() < dropRate);
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
