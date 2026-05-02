/**
 * utils.js - Các hàm tiện ích dùng chung
 */

function generateUid() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function toFiniteNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function lerpCoordinates(fromLat, fromLng, toLat, toLng, maxDistMeters, actualDistMeters) {
  if (actualDistMeters <= maxDistMeters) return { lat: toLat, lng: toLng };
  
  const ratio = maxDistMeters / actualDistMeters;
  return {
    lat: fromLat + (toLat - fromLat) * ratio,
    lng: fromLng + (toLng - fromLng) * ratio
  };
}

function calcBoatSpeed(level, activeCurses = {}) {
  // We need getActiveCurses here, but it's defined in combat.js (or we can move it to utils)
  // Let's define a local version or move it to utils if it's widely used.
  // For now, I'll define it locally to avoid circular dependencies if possible.
  const getActiveCurses = (curses) => (curses && typeof curses === 'object' && !Array.isArray(curses) ? curses : {});
  
  const baseSpeed = 20; // 20 m/s
  const levelBonus = 1 + (Math.max(1, level || 1) - 1) * 0.1; // +10% per level
  const curses = getActiveCurses(activeCurses);
  
  // Boat scale curse might affect speed? Let's say it reduces speed by 5% per stack
  const cursePenalty = Math.max(0.5, 1 - toFiniteNumber(curses.boat_scale, 0) * 0.05);
  
  return baseSpeed * levelBonus * cursePenalty;
}

export function isItemInBag(item: any, gx: number, gy: number, bag?: any) {
  if (!bag) return true;
  const w = toFiniteNumber(item?.gridW ?? item?.width, 1);
  const h = toFiniteNumber(item?.gridH ?? item?.height, 1);
  const shape = item?.shape;

  const bagX = toFiniteNumber(bag?.gridX, 0);
  const bagY = toFiniteNumber(bag?.gridY, 0);
  const bagW = toFiniteNumber(bag?.width, 5);
  const bagH = toFiniteNumber(bag?.height, 5);
  const bagShape = bag?.shape || [];

  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (!shape || shape[r][c]) {
        const tx = gx + c;
        const ty = gy + r;
        
        const relX = tx - bagX;
        const relY = ty - bagY;

        if (relX < 0 || relX >= bagW || relY < 0 || relY >= bagH) return false;
        if (bagShape.length > 0 && bagShape[relY] && !bagShape[relY][relX]) return false;
      }
    }
  }
  return true;
}

export { 
  generateUid,
  toFiniteNumber,
  lerpCoordinates,
  calcBoatSpeed,
};
