/**
 * world.js - Logic sinh vật phẩm trên bản đồ thế giới
 */

import { getSettings } from './constants';
import {  generateUid  } from './utils';
import {  rollBagDrop  } from './bags';
import {  rollRandomItem  } from './items';

function spawnWorldItems(centerLat, centerLng, baseCount, tier) {
  const items = [];
  const settings = getSettings();
  const SPAWN_RADIUS_DEG = settings.spawnRadiusDeg || 0.02; 
  const MIN_DIST_DEG = 0.004; // ~400m minimum between items
  
  const count = settings.spawnItemCount || baseCount || 8;

  for (let i = 0; i < count; i++) {
    let lat, lng, tooClose;
    let attempts = 0;
    do {
      const angle = Math.random() * Math.PI * 2;
      // Minimum 30% of radius to avoid clustering at center
      const dist = (0.3 + Math.random() * 0.7) * SPAWN_RADIUS_DEG;
      lat = centerLat + Math.cos(angle) * dist;
      lng = centerLng + Math.sin(angle) * dist;
      tooClose = items.some(existing => {
        const dLat = existing.lat - lat;
        const dLng = existing.lng - lng;
        return Math.sqrt(dLat*dLat + dLng*dLng) < MIN_DIST_DEG;
      });
      attempts++;
    } while (tooClose && attempts < 20);

    // 10% chance to drop a bag instead of regular item
    const isExpander = Math.random() < 0.1;

    items.push({
      spawnId: generateUid(),
      lat,
      lng,
      isExpander,
      item: isExpander ? (rollBagDrop() || rollRandomItem(tier)) : rollRandomItem(tier),
      minigameType: Math.random() < 0.2 ? 'chest' : null,
    });
  }
  return items.filter(i => i.item !== null);
}

export { 
  spawnWorldItems,
 };
