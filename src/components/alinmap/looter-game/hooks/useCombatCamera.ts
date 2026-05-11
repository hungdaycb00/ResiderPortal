import { useEffect, useRef } from 'react';
import type { Encounter } from '../LooterGameContext';
import { CAMERA_Z_DEFAULT, CAMERA_Z_NEAR } from '../../constants';
import { getVisibleBoatCameraOffsets } from '../utils/boatCameraFocus';

export function useCombatCamera(
  encounter: Encounter | null,
  centerOnCombat: (yOffset?: number) => void,
  centerOnBoat: () => void,
  setCameraZ?: (z: number) => void,
  setMainTab?: (tab: any) => void,
  setIsSheetExpanded?: (v: boolean) => void,
  isLooterGameMode: boolean = true
) {
  const lastEncounterUid = useRef<string | null>(null);

  useEffect(() => {
    if (!isLooterGameMode) {
      return;
    }

    if (!encounter) {
      if (lastEncounterUid.current) {
        lastEncounterUid.current = null;
        setCameraZ?.(CAMERA_Z_DEFAULT);
        centerOnBoat();
      }
      return;
    }

    const encounterKey = encounter.spawnId || encounter.id;
    if (encounterKey === lastEncounterUid.current) return;

    lastEncounterUid.current = encounterKey;

    const timer = window.setTimeout(() => {
      setMainTab?.('backpack');
      setIsSheetExpanded?.(true);

      setCameraZ?.(CAMERA_Z_NEAR);
      window.requestAnimationFrame(() => {
        const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
        const { yOffset } = getVisibleBoatCameraOffsets();
        centerOnCombat(isDesktop ? 0 : yOffset);
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [encounter, centerOnCombat, centerOnBoat, setCameraZ, setMainTab, setIsSheetExpanded, isLooterGameMode]);
}
