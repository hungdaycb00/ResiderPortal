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
  centerOnCombat: (yOffset?: number) => void,
  centerOnBoat: () => void,
  scale?: any,
  setMainTab?: (tab: any) => void,
  setIsSheetExpanded?: (v: boolean) => void
) {
  const lastEncounterUid = useRef<string | null>(null);

  useEffect(() => {
    // Nếu bắt đầu một trận đấu mới
    if (encounter && encounter.spawnId !== lastEncounterUid.current) {
      lastEncounterUid.current = encounter.spawnId;
      
      // Delay nhẹ 300ms để đợi UI Combat mở ra rồi mới trượt camera cho mượt
      const timer = setTimeout(() => {
        // Tự động chuyển sang tab Balo và mở rộng sheet để sẵn sàng chiến đấu
        if (setMainTab) setMainTab('backpack');
        if (setIsSheetExpanded) setIsSheetExpanded(true);
        
        // Tính toán yOffset cho Mobile (đẩy thuyền lên trên vùng trống)
        const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
        const yOffset = !isDesktop ? window.innerHeight * 0.25 : 0;
        
        // Zoom nhẹ để nhìn rõ trận đấu hơn
        if (scale && (scale.get?.() ?? 1) !== 1.5) scale.set(1.5);
        
        // Focus vào trung điểm giữa 2 thuyền
        centerOnCombat(yOffset);
      }, 300);
      
      return () => clearTimeout(timer);
    } 
    
    // Nếu trận đấu kết thúc (encounter chuyển về null)
    if (!encounter && lastEncounterUid.current) {
      lastEncounterUid.current = null;
      
      // Trả lại zoom bình thường và focus về thuyền người chơi
      if (scale && (scale.get?.() ?? 1) !== 1) scale.set(1);
      centerOnBoat();
    }
  }, [encounter, centerOnCombat, centerOnBoat, scale, setMainTab, setIsSheetExpanded]);
}
