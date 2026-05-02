/**
 * bags.js - Logic liên quan đến hệ thống túi (Bags)
 */

import {  BAG_POOL, BAG_STATS, MAX_GRID_W, MAX_GRID_H  } from './constants';
import {  generateUid  } from './utils';

function centerOffset(bagWidth, bagHeight) {
  return {
    x: Math.floor((MAX_GRID_W - bagWidth) / 2),
    y: Math.floor((MAX_GRID_H - bagHeight) / 2),
  };
}

function createBagItem(bagDef) {
  const off = centerOffset(bagDef.width, bagDef.height);
  // Use shape from definition (supports non-rectangular shapes)
  const shape = bagDef.shape.map(row => row.map(v => !!v));
  const stats = BAG_STATS[bagDef.id] || BAG_STATS.basic_bag;
  return {
    uid: generateUid(),
    id: bagDef.id,
    name: bagDef.name,
    icon: bagDef.icon,
    rarity: bagDef.rarity,
    price: stats.price || 0,
    weight: stats.weight || 0,
    hpBonus: stats.hpBonus || 0,
    energyMax: stats.energyMax || 0,
    energyRegen: stats.energyRegen || 0,
    gridX: off.x,
    gridY: off.y,
    shape,
    width: bagDef.width,
    height: bagDef.height,
    cells: bagDef.cells,
    type: 'bag',
    isStarter: !!stats.isStarter,
    dropProtected: stats.dropProtected !== false,
  };
}

function getStarterBag() {
  // Returns single 3x3 default bag, centered on grid
  const def = BAG_POOL.find(b => b.id === 'basic_bag') || BAG_POOL[0];
  return createBagItem(def);
}

function rollBagDrop() {
  const droppable = BAG_POOL.filter(b => b.dropRate > 0);
  const roll = Math.random();
  let cumulative = 0;
  for (const def of droppable) {
    cumulative += def.dropRate;
    if (roll < cumulative) {
      return { ...createBagItem(def), type: 'bag' };
    }
  }
  return null;
}

export { 
  centerOffset,
  createBagItem,
  getStarterBag,
  rollBagDrop,
 };
