/**
 * inventory.js - Logic quản lý và kiểm tra túi đồ (Inventory)
 */

import {  MAX_GRID_W, MAX_GRID_H  } from './constants';

function buildItemOccupancy(items, excludeUid) {
  const grid = Array.from({ length: MAX_GRID_H }, () => Array(MAX_GRID_W).fill(null));
  for (const item of items) {
    if (item.gridX < 0 || (excludeUid && item.uid === excludeUid)) continue;
    const w = item.gridW;
    const h = item.gridH;
    const shape = item.shape;

    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const gridR = item.gridY + r;
        const gridC = item.gridX + c;
        if (gridR < MAX_GRID_H && gridC < MAX_GRID_W) {
          if (!shape || (shape[r] && shape[r][c])) {
            grid[gridR][gridC] = item.uid;
          }
        }
      }
    }
  }
  return grid;
}

function buildBagOccupancy(bags) {
  // Returns grid using bag shape matrix
  const grid = Array.from({ length: MAX_GRID_H }, () => Array(MAX_GRID_W).fill(null));
  for (const bag of (Array.isArray(bags) ? bags : [bags])) {
    if (!bag || bag.gridX < 0) continue;
    const shape = bag.shape || [];
    for (let r = 0; r < bag.height && (bag.gridY + r) < MAX_GRID_H; r++) {
      for (let c = 0; c < bag.width && (bag.gridX + c) < MAX_GRID_W; c++) {
        if (shape[r] && shape[r][c]) {
          grid[bag.gridY + r][bag.gridX + c] = bag.uid;
        }
      }
    }
  }
  return grid;
}

function validateInventoryWithBags(items, bags) {
  // Validate that all placed items sit on bag cells
  const bagOcc = buildBagOccupancy(bags);
  const itemOcc = buildItemOccupancy(items, null);

  for (const item of items) {
    if (item.gridX < 0 || item.gridY < 0) continue;
    const w = item.gridW;
    const h = item.gridH;
    const shape = item.shape;

    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const gridR = item.gridY + r;
        const gridC = item.gridX + c;
        if (gridR >= MAX_GRID_H || gridC >= MAX_GRID_W) return false;
        
        // If this part of the item exists
        if (!shape || (shape[r] && shape[r][c])) {
          if (bagOcc[gridR][gridC] === null) return false; // Not on a bag cell
        }
      }
    }
  }
  
  // Re-verify overlap properly
  const checkGrid = Array.from({ length: MAX_GRID_H }, () => Array(MAX_GRID_W).fill(null));
  for (const item of items) {
    if (item.gridX < 0) continue;
    const w = item.gridW;
    const h = item.gridH;
    const shape = item.shape;
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (!shape || (shape[r] && shape[r][c])) {
          const gr = item.gridY + r;
          const gc = item.gridX + c;
          if (checkGrid[gr][gc]) return false; // Overlap!
          checkGrid[gr][gc] = item.uid;
        }
      }
    }
  }

  return true;
}

function createGrid(width, height) {
  return Array.from({ length: height }, () => Array(width).fill(null));
}

function canPlaceItem(grid, item, x, y, bagOcc) {
  const w = item.gridW;
  const h = item.gridH;
  const shape = item.shape;
  if (y + h > grid.length || x + w > grid[0].length) return false;
  
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (!shape || (shape[r] && shape[r][c])) {
        const gridR = y + r;
        const gridC = x + c;
        if (grid[gridR][gridC] !== null) return false; // Already occupied by item
        if (bagOcc && bagOcc[gridR][gridC] === null) return false; // Not on bag
      }
    }
  }
  return true;
}

function placeItem(grid, item, x, y) {
  const w = item.gridW;
  const h = item.gridH;
  const shape = item.shape;
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (!shape || (shape[r] && shape[r][c])) {
        grid[y + r][x + c] = item.uid;
      }
    }
  }
}

function removeItemFromGrid(grid, itemUid) {
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[0].length; col++) {
      if (grid[row][col] === itemUid) grid[row][col] = null;
    }
  }
}

function validateInventoryLayout(items, gridWidth, gridHeight, bagOcc) {
  const grid = createGrid(gridWidth, gridHeight);
  for (const item of items) {
    if (item.gridX == null || item.gridY == null || item.gridX < 0 || item.gridY < 0) continue;
    if (!canPlaceItem(grid, item, item.gridX, item.gridY, bagOcc)) return false;
    placeItem(grid, item, item.gridX, item.gridY);
  }
  return true;
}

export { 
  buildItemOccupancy,
  buildBagOccupancy,
  validateInventoryWithBags,
  createGrid,
  canPlaceItem,
  placeItem,
  removeItemFromGrid,
  validateInventoryLayout,
 };
