import { useCallback, useRef } from 'react';
import { useMotionValue, animate, MotionValue } from 'framer-motion';
import { DEGREES_TO_PX } from '../../constants';

interface UseBoatAnimationParams {
  myObfPos: { lat: number; lng: number } | null;
  panX: MotionValue<number>;
  panY: MotionValue<number>;
  currentLat: number | null;
  currentLng: number | null;
  encounter: any | null;
}

export function useBoatAnimation({ myObfPos, panX, panY, currentLat, currentLng, encounter }: UseBoatAnimationParams) {
  const boatOffsetX = useMotionValue(0);
  const boatOffsetY = useMotionValue(0);
  const isAnimatingRef = useRef(false);
  const boatMoveXRef = useRef<any>(null);
  const boatMoveYRef = useRef<any>(null);
  const panMoveXRef = useRef<any>(null);
  const panMoveYRef = useRef<any>(null);
  const userDraggingRef = useRef(false);

  const stopAllAnimations = useCallback(() => {
    if (boatMoveXRef.current) { boatMoveXRef.current.stop(); boatMoveXRef.current = null; }
    if (boatMoveYRef.current) { boatMoveYRef.current.stop(); boatMoveYRef.current = null; }
    isAnimatingRef.current = false;
  }, []);

  const animateBoatTo = useCallback((lat: number, lng: number, duration: number) => {
    if (!myObfPos) return;
    isAnimatingRef.current = true;

    const newBoatPxX = (lng - myObfPos.lng) * DEGREES_TO_PX;
    const newBoatPxY = -(lat - myObfPos.lat) * DEGREES_TO_PX;

    boatMoveXRef.current = animate(boatOffsetX, newBoatPxX, { duration, ease: 'easeInOut' });
    boatMoveYRef.current = animate(boatOffsetY, newBoatPxY, { duration, ease: 'easeInOut' });

    panMoveXRef.current = animate(panX, -newBoatPxX, { duration, ease: 'easeInOut' });
    panMoveYRef.current = animate(panY, -newBoatPxY, {
      duration, ease: 'easeInOut',
      onComplete: () => {
        isAnimatingRef.current = false;
        boatMoveXRef.current = null;
        boatMoveYRef.current = null;
        panMoveXRef.current = null;
        panMoveYRef.current = null;
      }
    });
  }, [myObfPos, boatOffsetX, boatOffsetY, panX, panY]);

  const syncBoatPosition = useCallback(() => {
    // Không tự động sync camera nếu đang trong trận đấu hoặc đang chạy animation di chuyển
    if (!myObfPos || currentLat == null || currentLng == null || isAnimatingRef.current || encounter) return;
    const nextBoatX = (currentLng - myObfPos.lng) * DEGREES_TO_PX;
    const nextBoatY = -(currentLat - myObfPos.lat) * DEGREES_TO_PX;
    boatOffsetX.set(nextBoatX);
    boatOffsetY.set(nextBoatY);
    panX.set(-nextBoatX);
    panY.set(-nextBoatY);
  }, [myObfPos, currentLat, currentLng, boatOffsetX, boatOffsetY, panX, panY]);

  const centerOnBoat = useCallback((yOffsetPx: number = 0) => {
    if (panMoveXRef.current) panMoveXRef.current.stop();
    if (panMoveYRef.current) panMoveYRef.current.stop();
    userDraggingRef.current = false;

    // Lấy vị trí visual thực tế của thuyền tại thời điểm bấm nút
    const pxX = boatOffsetX.get();
    const pxY = boatOffsetY.get();

    // Di chuyển camera (pan) đến vị trí đó
    animate(panX, -pxX, { duration: 0.45, ease: 'easeInOut' });
    // Trừ yOffsetPx để đẩy thuyền lên trên một chút (thường dùng khi mở BottomSheet)
    animate(panY, -pxY - yOffsetPx, { duration: 0.45, ease: 'easeInOut' });
  }, [boatOffsetX, boatOffsetY, panX, panY]);

  const stopPanFollow = useCallback(() => {
    userDraggingRef.current = true;
    if (panMoveXRef.current) { panMoveXRef.current.stop(); panMoveXRef.current = null; }
    if (panMoveYRef.current) { panMoveYRef.current.stop(); panMoveYRef.current = null; }
  }, []);

  // Camera focus vào midpoint giữa thuyền User và Enemy (+60px X)
  const centerOnCombat = useCallback((yOffsetPx: number = 0) => {
    // CRITICAL: Dừng tất cả animation thuyền trước khi tính midpoint
    // để đảm bảo boatOffsetX/Y đã ổn định, tránh camera target sai
    stopAllAnimations();
    if (panMoveXRef.current) panMoveXRef.current.stop();
    if (panMoveYRef.current) panMoveYRef.current.stop();
    userDraggingRef.current = false;
    
    const boatX = boatOffsetX?.get?.() ?? 0;
    const boatY = boatOffsetY?.get?.() ?? 0;
    // Enemy boat render at boatX + 120px -> midpoint = boatX + 60px
    const midX = boatX + 60;
    const midY = boatY;
    animate(panX, -midX, { duration: 0.8, ease: 'easeInOut' });
    animate(panY, -midY - yOffsetPx, { duration: 0.8, ease: 'easeInOut' });
  }, [stopAllAnimations, boatOffsetX, boatOffsetY, panX, panY]);

  return {
    boatOffsetX, boatOffsetY,
    isAnimatingRef,
    stopAllAnimations, animateBoatTo, syncBoatPosition,
    centerOnBoat, centerOnCombat, stopPanFollow,
  };
}
