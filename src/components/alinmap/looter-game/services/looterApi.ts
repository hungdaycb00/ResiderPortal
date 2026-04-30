import type { LooterItem, BagItem } from '../backpack/types';
import type { LooterGameState, WorldItem, Encounter, CombatResult } from '../LooterGameContext';

/**
 * Looter Data Transformer
 * Chuyển đổi dữ liệu thô từ API sang định dạng sử dụng trong State
 */
export const transformLooterState = (raw: any): Partial<LooterGameState> => {
  const s = raw;
  return {
    initialized: s.fortress_lat != null,
    fortressLat: s.fortress_lat,
    fortressLng: s.fortress_lng,
    currentLat: s.current_lat,
    currentLng: s.current_lng,
    baseMaxHp: s.base_max_hp || 100,
    currentHp: s.current_hp || 100,
    moveSpeed: s.move_speed || 1.0,
    inventoryWidth: s.inventory_width || 6,
    inventoryHeight: s.inventory_height || 4,
    cursePercent: s.curse_percent || 0,
    looterGold: Number(s.looter_gold || 0),
    worldTier: s.world_tier ?? 0,
    inventory: (() => { 
      try { 
        return typeof s.inventory_json === 'string' ? JSON.parse(s.inventory_json) : (s.inventory_json || []); 
      } catch(e) { return []; } 
    })(),
    storage: (() => { 
      try { 
        return typeof s.storage_json === 'string' ? JSON.parse(s.storage_json) : (s.storage_json || []); 
      } catch(e) { return []; } 
    })(),
    bags: Array.isArray(s.bags) ? s.bags : [],
    distance: s.distance || 0,
    energyMax: s.energy_max || 100,
    energyCurrent: s.energy_current || 100,
    activeCurses: s.activeCurses || {},
  };
};

/**
 * Looter API Service
 */
export const looterApi = {
  async fetchState(apiUrl: string, deviceId: string) {
    const res = await fetch(`${apiUrl}/api/looter/state?deviceId=${encodeURIComponent(deviceId)}`);
    const data = await res.json();
    if (data.success && data.state) {
      return {
        ...data,
        state: transformLooterState(data.state)
      };
    }
    return data;
  },

  async initGame(apiUrl: string, deviceId: string, lat: number, lng: number) {
    const res = await fetch(`${apiUrl}/api/looter/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, lat, lng }),
    });
    return await res.json();
  },

  async moveBoat(apiUrl: string, deviceId: string, toLat: number, toLng: number) {
    const res = await fetch(`${apiUrl}/api/looter/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, toLat, toLng }),
    });
    return await res.json();
  },

  async pickupItem(apiUrl: string, deviceId: string, spawnId: string, force: boolean = false) {
    const res = await fetch(`${apiUrl}/api/looter/pickup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, spawnId, force }),
    });
    return await res.json();
  },

  async dropItem(apiUrl: string, deviceId: string, itemUid: string) {
    const res = await fetch(`${apiUrl}/api/looter/drop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, itemUid }),
    });
    return await res.json();
  },

  async fetchWorldItems(apiUrl: string, deviceId: string) {
    const res = await fetch(`${apiUrl}/api/looter/world-items?deviceId=${encodeURIComponent(deviceId)}`);
    return await res.json();
  },

  async saveInventory(apiUrl: string, deviceId: string, inventory: LooterItem[]) {
    const res = await fetch(`${apiUrl}/api/looter/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, inventory }),
    });
    return await res.json();
  },

  async saveBags(apiUrl: string, deviceId: string, bags: BagItem[]) {
    const res = await fetch(`${apiUrl}/api/looter/bags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, bags }),
    });
    return await res.json();
  },

  async saveStorageLayout(apiUrl: string, deviceId: string, storage: LooterItem[]) {
    const res = await fetch(`${apiUrl}/api/looter/storage_layout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, storage }),
    });
    return await res.json();
  },

  async minigameLose(apiUrl: string, deviceId: string, spawnId: string) {
    const res = await fetch(`${apiUrl}/api/looter/minigame-lose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, spawnId }),
    });
    return await res.json();
  },

  async destroyItem(apiUrl: string, deviceId: string, spawnId: string) {
    const res = await fetch(`${apiUrl}/api/looter/destroy-item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, spawnId }),
    });
    return await res.json();
  },

  async executeCombat(apiUrl: string, deviceId: string, opponentId: string, opponentInventory?: LooterItem[], opponentHp?: number, opponentBags?: BagItem[]) {
    const res = await fetch(`${apiUrl}/api/looter/combat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, opponentId, opponentInventory, opponentHp, opponentBags }),
    });
    return await res.json();
  },

  async curseChoice(apiUrl: string, deviceId: string, choice: 'flee' | 'challenge') {
    const res = await fetch(`${apiUrl}/api/looter/curse-choice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, choice }),
    });
    return await res.json();
  },

  async sellItems(apiUrl: string, deviceId: string, itemUids: string[]) {
    const res = await fetch(`${apiUrl}/api/looter/sell`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, itemUids }),
    });
    return await res.json();
  },

  async storeItems(apiUrl: string, deviceId: string, itemUids: string[], action: 'store' | 'retrieve', mode: string, gridX?: number, gridY?: number) {
    const res = await fetch(`${apiUrl}/api/looter/store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, itemUids, action, mode, gridX, gridY }),
    });
    return await res.json();
  },

  async setWorldTier(apiUrl: string, deviceId: string, tier: number) {
    const res = await fetch(`${apiUrl}/api/looter/set-tier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, tier }),
    });
    return await res.json();
  },

  async returnToFortress(apiUrl: string, deviceId: string) {
    const res = await fetch(`${apiUrl}/api/looter/return-fortress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    });
    return await res.json();
  }
};
