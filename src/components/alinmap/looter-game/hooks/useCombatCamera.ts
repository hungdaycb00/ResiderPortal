import { useCallback, useEffect, useRef } from 'react';
import type { Encounter } from '../LooterGameContext';
import { CAMERA_Z_DEFAULT, CAMERA_Z_NEAR } from '../../constants';
import { getVisibleBoatCameraOffsets } from '../utils/boatCameraFocus';
import { getTiltAngleFromCameraZ } from '../../constants';

export function useCombatCamera(
  encounter: Encounter | null,
  centerOnCombat: (yOffset?: number, xOffset?: number) => void,
  centerOnBoat: () => void,
  setCameraZ?: (z: number) => void,
  setMainTab?: (tab: any) => void,
  setIsSheetExpanded?: (v: boolean) => void,
  isLooterGameMode: boolean = true,
  isSheetExpanded: boolean = false,
  cameraZ?: { get: () => number },
  perspectivePx?: number,
  cameraPitchOverride?: number | null
) {
  const lastEncounterUid = useRef<string | null>(null);
  const combatCenterTokenRef = useRef(0);

  const centerCombatInVisibleArea = useCallback(() => {
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
    const currentCameraZ = cameraZ?.get?.();
    const tiltDeg = cameraPitchOverride ?? (typeof currentCameraZ === 'number' ? getTiltAngleFromCameraZ(currentCameraZ) : undefined);
    const { xOffset, yOffset } = getVisibleBoatCameraOffsets({
      cameraZ: currentCameraZ,
      perspectivePx,
      tiltDeg,
    });
    centerOnCombat(isDesktop ? 0 : yOffset, xOffset);
  }, [cameraPitchOverride, cameraZ, centerOnCombat, perspectivePx]);

  const scheduleCombatCenter = useCallback(() => {
    const token = ++combatCenterTokenRef.current;
    let lastRectKey = '';
    let stableFrames = 0;

    const step = () => {
      if (token !== combatCenterTokenRef.current) return;

      const backpack = document.getElementById('looter-backpack-container');
      const rect = backpack?.getBoundingClientRect();
      const rectKey = rect
        ? `${Math.round(rect.left)}:${Math.round(rect.top)}:${Math.round(rect.width)}:${Math.round(rect.height)}`
        : 'missing';

      if (rectKey === lastRectKey) {
        stableFrames += 1;
      } else {
        lastRectKey = rectKey;
        stableFrames = 0;
      }

      if (stableFrames >= 2) {
        centerCombatInVisibleArea();
        return;
      }

      window.requestAnimationFrame(step);
    };

    window.requestAnimationFrame(step);
  }, [centerCombatInVisibleArea]);

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
      scheduleCombatCenter();
    }, 300);

    return () => {
      combatCenterTokenRef.current += 1;
      window.clearTimeout(timer);
    };
  }, [encounter, centerOnBoat, scheduleCombatCenter, setCameraZ, setMainTab, setIsSheetExpanded, isLooterGameMode]);

  useEffect(() => {
    if (!isLooterGameMode || !encounter) return;

    const timer = window.setTimeout(() => {
      scheduleCombatCenter();
    }, 450);

    return () => {
      combatCenterTokenRef.current += 1;
      window.clearTimeout(timer);
    };
  }, [isSheetExpanded, encounter, scheduleCombatCenter, isLooterGameMode]);
}
