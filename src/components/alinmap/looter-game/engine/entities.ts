/**
 * entities.js - Logic tạo Ghost/Bot
 */

import {  GHOST_NAMES, BAG_POOL, TIER_MULTIPLIERS  } from './constants';
import {  generateUid, toFiniteNumber  } from './utils';
import {  createBagItem  } from './bags';
import {  rollRandomItem  } from './items';
import {  isPlacedCombatItem  } from './combat';

function canPlaceBotItem(placedItems, item, x, y, bag) {
  const w = toFiniteNumber(item.gridW, 1);
  const h = toFiniteNumber(item.gridH, 1);
  const shape = item.shape;
  
  const occupied = new Set();
  for (const placed of placedItems) {
    if (!isPlacedCombatItem(placed)) continue;
    const pW = toFiniteNumber(placed.gridW, 1);
    const pH = toFiniteNumber(placed.gridH, 1);
    const pShape = placed.shape;
    for (let r = 0; r < pH; r++) {
      for (let c = 0; c < pW; c++) {
        if (!pShape || (pShape[r] && pShape[r][c])) {
          occupied.add(`${toFiniteNumber(placed.gridX, -1) + c}:${toFiniteNumber(placed.gridY, -1) + r}`);
        }
      }
    }
  }

  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (!shape || (shape[r] && shape[r][c])) {
        const cellX = x + c;
        const cellY = y + r;
        const bagRow = cellY - toFiniteNumber(bag.gridY, 0);
    const bagCol = cellX - toFiniteNumber(bag.gridX, 0);
    if (!bag.shape?.[bagRow]?.[bagCol]) return false;
    if (occupied.has(`${cellX}:${cellY}`)) return false;
      }
    }
  }

  return true;
}

function placeBotItem(placedItems, item, bag) {
  const startX = toFiniteNumber(bag.gridX, 0);
  const startY = toFiniteNumber(bag.gridY, 0);
  const width = toFiniteNumber(bag.width, 3);
  const height = toFiniteNumber(bag.height, 3);

  const w = toFiniteNumber(item.gridW, 1);
  const h = toFiniteNumber(item.gridH, 1);

  for (let y = startY; y <= startY + height - h; y++) {
    for (let x = startX; x <= startX + width - w; x++) {
      // Clone item with temporary pos to check placement
      const tempItem = { ...item, gridW: w, gridH: h, gridX: x, gridY: y };
      if (canPlaceBotItem(placedItems, tempItem, x, y, bag)) {
        item.gridX = x;
        item.gridY = y;
        item.gridW = w;
        item.gridH = h;
        item.rotated = false;
        return true;
      }
    }
  }

  return false;
}

function generateBot(tier, playerItemCount) {
  const name = GHOST_NAMES[Math.floor(Math.random() * GHOST_NAMES.length)];
  const inventory = [];
  
  const pCount = Number(playerItemCount) || 0;
  const botItemCount = Math.max(1, pCount + (Math.random() < 0.5 ? 1 : -1));
  
  // Choose bag based on tier and expected item count
  let bagId = 'basic_bag';
  if (tier >= 4 || botItemCount > 8) bagId = 'voyager_pack';
  else if (tier >= 2 || botItemCount > 5) bagId = 'war_bag';
  else if (tier >= 1 || botItemCount > 3) bagId = 'leather_bag';
  
  const bagDef = BAG_POOL.find(b => b.id === bagId) || BAG_POOL[0];
  const botBag = createBagItem(bagDef);
  botBag.gridX = 0;
  botBag.gridY = 0;

  for (let i = 0; i < botItemCount; i++) {
    let item = rollRandomItem(tier);
    if (!item) continue;
    
    // Ensure item isn't larger than the bag itself
    let attempts = 0;
    while (attempts < 5 && (item.gridW > botBag.width || item.gridH > botBag.height)) {
      item = rollRandomItem(tier);
      attempts++;
    }

    if (placeBotItem(inventory, item, botBag)) {
      inventory.push(item);
    }
  }

  return {
    id: 'ghost_' + generateUid(),
    name,
    isBot: true,
    isGhost: true,
    baseMaxHp: 80 + Math.floor(Math.random() * 40) * (TIER_MULTIPLIERS[tier] || 1),
    inventory,
    bags: [botBag],
    avatar: null,
  };
}

export { 
  canPlaceBotItem,
  placeBotItem,
  generateBot,
 };
