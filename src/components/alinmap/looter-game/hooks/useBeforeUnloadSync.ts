import { useEffect } from 'react';
import type { LooterGameState } from '../LooterGameContext';

/**
 * Hook: Gửi beacon sync khi tab/window đóng.
 * Giúp lưu state trước khi người dùng rời trang.
 */
export function useBeforeUnloadSync(params: {
  deviceId: string | null;
  apiUrl: string;
  state: LooterGameState;
}) {
  const { deviceId, apiUrl, state } = params;

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!deviceId) return;
      try {
        const { currentLat, currentLng, fortressLat, fortressLng, cursePercent, looterGold, worldTier, currentHp, baseMaxHp, inventory, storage } = state;
        const essentialState = { currentLat, currentLng, fortressLat, fortressLng, cursePercent, looterGold, worldTier, currentHp, baseMaxHp, inventory, storage };
        const payload = JSON.stringify({ deviceId, state: essentialState });
        navigator.sendBeacon(`${apiUrl}/api/looter/sync`, new Blob([payload], { type: 'application/json' }));
      } catch (e) {
        console.error('[Looter] beforeunload sync error', e);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [deviceId, apiUrl, state]);
}
