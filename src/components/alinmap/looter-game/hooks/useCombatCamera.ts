import { useEffect, useRef } from 'react';
import type { Encounter } from '../LooterGameContext';

/**
 * useCombatCamera
 * 
 * Tách biệt logic điều khiển Camera khi vào trận đấu.
 * Theo dõi trạng thái encounter và tự động focus camera vào tâm 2 thuyền.
 */
export function useCombatCamera(
  encounter: Encounter | null,
  centerOnCombat: () => void,
  centerOnBoat: () => void
) {
  const lastEncounterUid = useRef<string | null>(null);

  useEffect(() => {
    // Nếu bắt đầu một trận đấu mới
    if (encounter && encounter.spawnId !== lastEncounterUid.current) {
      lastEncounterUid.current = encounter.spawnId;
      
      // Delay nhẹ 300ms để đợi UI Combat mở ra rồi mới trượt camera cho mượt
      const timer = setTimeout(() => {
        centerOnCombat();
      }, 300);
      
      return () => clearTimeout(timer);
    } 
    
    // Nếu trận đấu kết thúc (encounter chuyển về null)
    if (!encounter && lastEncounterUid.current) {
      lastEncounterUid.current = null;
      centerOnBoat();
    }
  }, [encounter, centerOnCombat, centerOnBoat]);
}
