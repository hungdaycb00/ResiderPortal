import { useEffect, useRef } from 'react';
import type { Encounter } from '../LooterGameContext';

export function useCombatCamera(
  encounter: Encounter | null,
  centerOnCombat: (yOffset?: number) => void,
  centerOnBoat: () => void,
  scale?: any,
  setMainTab?: (tab: any) => void,
  setIsSheetExpanded?: (v: boolean) => void
) {
  const lastEncounterUid = useRef<string | null>(null);

  useEffect(() => {
    if (!encounter) {
      if (lastEncounterUid.current) {
        lastEncounterUid.current = null;
        if (scale && (scale.get?.() ?? 1) !== 1) scale.set(1);
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

      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
      const yOffset = !isDesktop ? window.innerHeight * 0.25 : 0;

      if (scale && (scale.get?.() ?? 1) !== 1.5) scale.set(1.5);
      centerOnCombat(yOffset);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [encounter, centerOnCombat, centerOnBoat, scale, setMainTab, setIsSheetExpanded]);
}
