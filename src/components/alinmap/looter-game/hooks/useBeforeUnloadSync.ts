import { useEffect, useRef } from 'react';
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
  // Dùng ref để tránh re-register listener mỗi state change
  const stateRef = useRef(state);
  stateRef.current = state;
  const deviceIdRef = useRef(deviceId);
  deviceIdRef.current = deviceId;

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!deviceIdRef.current) return;
      try {
        const { currentLat, currentLng, fortressLat, fortressLng, cursePercent, looterGold, worldTier, currentHp, baseMaxHp, inventory, storage } = stateRef.current;
        const essentialState = { currentLat, currentLng, fortressLat, fortressLng, cursePercent, looterGold, worldTier, currentHp, baseMaxHp, inventory, storage };
        const payload = JSON.stringify({ deviceId: deviceIdRef.current, state: essentialState });
        navigator.sendBeacon(`${apiUrl}/api/looter/sync`, new Blob([payload], { type: 'application/json' }));
      } catch (e) {
        console.error('[Looter] beforeunload sync error', e);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [apiUrl]); // Chỉ re-register khi apiUrl thay đổi (thực tế không bao giờ)
}
