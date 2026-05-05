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
    worldTier: s.world_tier ?? -1,  // -1 = ở thành trì, >= 0 = đang trong thử thách
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

// ==========================================
// Generic request helpers
// ==========================================

async function get<T = any>(apiUrl: string, path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${apiUrl}/api/looter/${path}?${qs}`);
  const data = await res.json().catch(() => ({}));
  return {
    ...data,
    status: res.status,
    rateLimited: res.status === 429,
    retryAfter: Number(data?.retryAfter || res.headers.get('Retry-After') || 1000),
  };
}

async function post<T = any>(apiUrl: string, path: string, body: Record<string, any>): Promise<T> {
  const res = await fetch(`${apiUrl}/api/looter/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return {
    ...data,
    status: res.status,
    rateLimited: res.status === 429,
    retryAfter: Number(data?.retryAfter || res.headers.get('Retry-After') || 1000),
  };
}

/**
 * Looter API Service
 */
export const looterApi = {
  async fetchState(apiUrl: string, deviceId: string) {
    const data = await get(apiUrl, 'state', { deviceId });
    if (data.success && data.state) {
      return { ...data, state: transformLooterState(data.state) };
    }
    return data;
  },

  initGame: (apiUrl: string, deviceId: string, lat: number, lng: number) =>
    post(apiUrl, 'init', { deviceId, lat, lng }),

  syncState: (apiUrl: string, deviceId: string, state: Partial<LooterGameState>) =>
    post(apiUrl, 'sync', { deviceId, state }),

  moveBoat: (apiUrl: string, deviceId: string, toLat: number, toLng: number, dropItemUids?: string[]) =>
    post(apiUrl, 'move', { deviceId, toLat, toLng, dropItemUids }),



  pickupItem: (apiUrl: string, deviceId: string, spawnId: string, force = false, currentLat?: number, currentLng?: number) =>
    post(apiUrl, 'pickup', { deviceId, spawnId, force, currentLat, currentLng }),

  minigameLose: (apiUrl: string, deviceId: string, spawnId: string) =>
    post(apiUrl, 'minigame-lose', { deviceId, spawnId }),

  fetchWorldItems: (apiUrl: string, deviceId: string, lat?: number | null, lng?: number | null) =>
    get(apiUrl, 'world-items', {
      deviceId,
      ...(lat != null && lng != null ? { lat: String(lat), lng: String(lng) } : {}),
    }),

  fetchChunks: (apiUrl: string, deviceId: string, chunks: string[]) =>
    get(apiUrl, 'chunks', { deviceId, chunks: chunks.join(',') }),

  saveInventory: (apiUrl: string, deviceId: string, inventory: LooterItem[]) =>
    post(apiUrl, 'inventory', { deviceId, inventory }),

  saveBags: (apiUrl: string, deviceId: string, bags: BagItem[]) =>
    post(apiUrl, 'bags', { deviceId, bags }),

  saveStorageLayout: (apiUrl: string, deviceId: string, storage: LooterItem[]) =>
    post(apiUrl, 'storage_layout', { deviceId, storage }),



  executeCombat: (apiUrl: string, deviceId: string, opponentId: string, opponentInventory?: LooterItem[], opponentHp?: number, opponentBags?: BagItem[]) =>
    post(apiUrl, 'combat', { deviceId, opponentId, opponentInventory, opponentHp, opponentBags }),

  curseChoice: (apiUrl: string, deviceId: string, choice: 'flee' | 'challenge') =>
    post(apiUrl, 'curse-choice', { deviceId, choice }),

  sellItems: (apiUrl: string, deviceId: string, itemUids: string[]) =>
    post(apiUrl, 'sell', { deviceId, itemUids }),

  storeItems: (apiUrl: string, deviceId: string, itemUids: string[], action: 'store' | 'retrieve', mode: string, gridX?: number, gridY?: number) =>
    post(apiUrl, 'store', { deviceId, itemUids, action, mode, gridX, gridY }),

  setWorldTier: (apiUrl: string, deviceId: string, tier: number) =>
    post(apiUrl, 'set-tier', { deviceId, tier }),

  returnToFortress: (apiUrl: string, deviceId: string) =>
    post(apiUrl, 'return-fortress', { deviceId }),

  dropItems: (apiUrl: string, deviceId: string, itemUids: string[], lat: number, lng: number) =>
    post(apiUrl, 'drop', { deviceId, itemUids, lat, lng }),
};
