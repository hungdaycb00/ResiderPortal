import type { WorldItem, LooterGameState } from '../LooterGameContext';
import type { LooterItem, BagItem } from '../backpack/types';
import { GAME_CONFIG } from '../gameConfig';

const { PORTAL_SPACING_METERS, PORTAL_SEARCH_RADIUS } = GAME_CONFIG;
const CHUNK_SIZE_METERS = 1000;

export const chunkKey = (chunkX: number, chunkY: number) => `${chunkX}:${chunkY}`;

export const getChunkCoords = (
  lat: number | null,
  lng: number | null,
  originLat: number | null,
  originLng: number | null,
  chunkSizeMeters = CHUNK_SIZE_METERS
) => {
  if (lat == null || lng == null) return { chunkX: 0, chunkY: 0 };

  const baseLat = originLat ?? lat;
  const baseLng = originLng ?? lng;
  const cosLat = Math.max(0.25, Math.cos((baseLat * Math.PI) / 180));
  const xMeters = (lng - baseLng) * 111000 * cosLat;
  const yMeters = (lat - baseLat) * 111000;

  return {
    chunkX: Math.floor(xMeters / chunkSizeMeters),
    chunkY: Math.floor(yMeters / chunkSizeMeters),
  };
};

export const getActiveChunkKeys = (center: { chunkX: number; chunkY: number }, radius: number) => {
  const keys: string[] = [];
  for (let y = center.chunkY - radius; y <= center.chunkY + radius; y += 1) {
    for (let x = center.chunkX - radius; x <= center.chunkX + radius; x += 1) {
      keys.push(chunkKey(x, y));
    }
  }
  return keys;
};

/**
 * Tạo danh sách các cổng Portal xung quanh vị trí hiện tại
 */
export const createPortalWorldItems = (
  fortressLat: number | null,
  fortressLng: number | null,
  currentLat: number | null,
  currentLng: number | null
): WorldItem[] => {
  if (fortressLat == null || fortressLng == null || currentLat == null || currentLng == null) return [];
  
  const cosLat = Math.max(0.25, Math.cos((fortressLat * Math.PI) / 180));
  const xMeters = (currentLng - fortressLng) * 111000 * cosLat;
  const yMeters = (currentLat - fortressLat) * 111000;
  
  const centerGridX = Math.round(xMeters / PORTAL_SPACING_METERS);
  const centerGridY = Math.round(yMeters / PORTAL_SPACING_METERS);
  
  const items: WorldItem[] = [];

  for (let gridY = centerGridY - PORTAL_SEARCH_RADIUS; gridY <= centerGridY + PORTAL_SEARCH_RADIUS; gridY += 1) {
    for (let gridX = centerGridX - PORTAL_SEARCH_RADIUS; gridX <= centerGridX + PORTAL_SEARCH_RADIUS; gridX += 1) {
      if (gridX === 0 && gridY === 0) continue;
      
      const portalLat = fortressLat + ((gridY * PORTAL_SPACING_METERS) / 111000);
      const portalLng = fortressLng + ((gridX * PORTAL_SPACING_METERS) / (111000 * cosLat));
      
      items.push({
        spawnId: `portal_${gridX}_${gridY}`,
        lat: portalLat,
        lng: portalLng,
        isExpander: false,
        minigameType: 'chest',
        item: {
          id: 'looter_portal',
          name: 'Cổng Portal',
          icon: '🌀',
          type: 'portal',
        },
      });
    }
  }
  return items;
};

/**
 * Tìm vị trí trống trong Balo cho vật phẩm
 */
export const findEmptySlotFor = (
  item: LooterItem, 
  inventory: LooterItem[], 
  bag: BagItem | undefined
): { x: number; y: number } | null => {
  if (!bag) return null;
  
  const w = item.gridW || 1;
  const h = item.gridH || 1;
  const shape = item.shape;

  const isOccupied = (x: number, y: number) => {
    const bagX = x - bag.gridX;
    const bagY = y - bag.gridY;
    
    if (bagX < 0 || bagY < 0 || bagX >= bag.width || bagY >= bag.height) return true;
    if (!bag.shape[bagY][bagX]) return true;
    
    return inventory.some(i => {
      if (i.gridX < 0) return false;
      const iw = i.gridW || 1;
      const ih = i.gridH || 1;
      const ishape = i.shape;
      
      if (x >= i.gridX && x < i.gridX + iw && y >= i.gridY && y < i.gridY + ih) {
        if (!ishape) return true;
        return ishape[y - i.gridY][x - i.gridX];
      }
      return false;
    });
  };

  const canPlace = (startX: number, startY: number) => {
    if (startX + w > 7 || startY + h > 6) return false;
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (!shape || shape[r][c]) {
          if (isOccupied(startX + c, startY + r)) return false;
        }
      }
    }
    return true;
  };

  for (let y = 0; y <= 6 - h; y++) {
    for (let x = 0; x <= 7 - w; x++) {
      if (canPlace(x, y)) return { x, y };
    }
  }
  
  return null;
};
