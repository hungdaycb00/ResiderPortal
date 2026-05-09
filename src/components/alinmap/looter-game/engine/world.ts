/**
 * world.js - Logic sinh vật phẩm trên bản đồ thế giới
 */

import { getSettings, SPAWN_MIN_DISTANCE_FROM_FORTRESS_METERS } from './constants';
import {  generateUid  } from './utils';
import {  rollBagDrop  } from './bags';
import {  rollRandomItem  } from './items';
import { getDistanceMeters } from '../backpack/utils';

function spawnWorldItems(centerLat, centerLng, baseCount, tier, fortressLat?: number, fortressLng?: number) {
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
      const dist = (0.3 + Math.random() * 0.7) * SPAWN_RADIUS_DEG;
      lat = centerLat + Math.cos(angle) * dist;
      lng = centerLng + Math.sin(angle) * dist;

      // Filter: at least 1.5km from fortress
      if (fortressLat != null && fortressLng != null) {
        const distFromFortress = getDistanceMeters(fortressLat, fortressLng, lat, lng);
        if (distFromFortress < SPAWN_MIN_DISTANCE_FROM_FORTRESS_METERS) {
          attempts++;
          continue;
        }
      }

      tooClose = items.some(existing => {
        const dLat = existing.lat - lat;
        const dLng = existing.lng - lng;
        return Math.sqrt(dLat*dLat + dLng*dLng) < MIN_DIST_DEG;
      });
      attempts++;
    } while (tooClose && attempts < 20);

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
