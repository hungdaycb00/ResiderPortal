import { useCallback, useState } from 'react';
import { looterApi } from '../services/looterApi';
import { getDistanceMeters } from '../backpack/utils';
import { FORTRESS_INTERACTION_METERS } from '../LooterGameContext';
import type { LooterGameState, Encounter } from '../LooterGameContext';
import type { LooterItem } from '../backpack/types';

interface UseLooterMovementProps {
  deviceId: string | null;
  apiUrl: string;
  state: LooterGameState;
  setState: React.Dispatch<React.SetStateAction<LooterGameState>>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;

  setIsChallengeActive: (v: boolean) => void;
  setEncounter: (e: Encounter | null) => void;
  setShowCurseModal: (v: boolean) => void;
}

export function useLooterMovement({
  deviceId,
  apiUrl,
  state,
  setState,
  notify,
  setIsChallengeActive,
  setEncounter,
  setShowCurseModal
}: UseLooterMovementProps) {
  const [isMoving, setIsMoving] = useState(false);

  const moveBoat = useCallback(async (toLat: number, toLng: number) => {
    if (!deviceId) return { curseTrigger: false, encounter: null };



    setIsMoving(true);
    try {
      const data = await looterApi.moveBoat(apiUrl, deviceId, toLat, toLng);
      if (data.success) {
        const nextLat = data.currentLat ?? toLat;
        const nextLng = data.currentLng ?? toLng;
        
        setState(prev => ({
          ...prev,
          currentLat: nextLat,
          currentLng: nextLng,
          cursePercent: data.cursePercent,
          distance: prev.distance + (data.distMeters || 0),
        }));

        if (data.speedViolation) {
          notify(`Di chuyển quá nhanh! Lời nguyền tăng +${data.penaltyCurse.toFixed(0)}%`, 'error');
        }

        const distToFortress = getDistanceMeters(nextLat, nextLng, state.fortressLat, state.fortressLng);
        // Thử thách vẫn active nếu ở xa Fortress HOẶC đang có Tier > 0
        setIsChallengeActive(distToFortress > FORTRESS_INTERACTION_METERS || (state.worldTier || 0) > 0);

        if (data.curseTrigger && data.encounter) {
          setEncounter(data.encounter);
          setShowCurseModal(true);
          return { curseTrigger: true, encounter: data.encounter };
        }
      }
      return { curseTrigger: false, encounter: null };
    } catch (err) {
      console.error('[LooterGame] moveBoat error:', err);
      return { curseTrigger: false, encounter: null };
    } finally {
      setIsMoving(false);
    }
  }, [deviceId, apiUrl, state.fortressLat, state.fortressLng, notify, setState, setIsChallengeActive, setEncounter, setShowCurseModal]);

  const returnToFortress = useCallback(async () => {
    if (!deviceId) return;
    try {
      const data = await looterApi.returnToFortress(apiUrl, deviceId);
      if (data.success) {
        setIsChallengeActive(false);
        notify('Đã quay về Thành trì', 'success');
      }
    } catch (err) {
      console.error('[LooterGame] returnToFortress error:', err);
    }
  }, [deviceId, apiUrl, notify]);

  return { moveBoat, returnToFortress, isMoving };
}
