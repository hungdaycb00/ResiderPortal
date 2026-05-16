import { useCallback, useRef } from 'react';
import { useMotionValue, animate, MotionValue } from 'framer-motion';
import { DEGREES_TO_PX, MAP_PLANE_SCALE } from '../../constants';
import { GAME_CONFIG } from '../gameConfig';


interface UseBoatAnimationParams {
  myObfPos: { lat: number; lng: number } | null;
  panX: MotionValue<number>;
  panY: MotionValue<number>;
  planeYScale: MotionValue<number>;
  currentLat: number | null;
  currentLng: number | null;
  encounter: any | null;
  cameraYaw: MotionValue<number> | number;
  cameraPitch: MotionValue<number> | number;
}

export function useBoatAnimation({ 
  myObfPos, panX, panY, planeYScale, currentLat, currentLng, encounter,
  cameraYaw, cameraPitch 
}: UseBoatAnimationParams) {
  const boatOffsetX = useMotionValue(0);
  const boatOffsetY = useMotionValue(0);
  const isAnimatingRef = useRef(false);
  const boatMoveXRef = useRef<any>(null);
  const boatMoveYRef = useRef<any>(null);
  const panMoveXRef = useRef<any>(null);
  const panMoveYRef = useRef<any>(null);
  const userDraggingRef = useRef(false);
  const cameraYOffsetRef = useRef(0);
  const cameraXOffsetRef = useRef(0);
  const boatAutoFollowRef = useRef(false);

  const stopPanAnimations = useCallback(() => {
    if (panMoveXRef.current) { panMoveXRef.current.stop(); panMoveXRef.current = null; }
    if (panMoveYRef.current) { panMoveYRef.current.stop(); panMoveYRef.current = null; }
  }, []);

  const stopAllAnimations = useCallback(() => {
    if (boatMoveXRef.current) { boatMoveXRef.current.stop(); boatMoveXRef.current = null; }
    if (boatMoveYRef.current) { boatMoveYRef.current.stop(); boatMoveYRef.current = null; }
    stopPanAnimations();
    isAnimatingRef.current = false;
  }, [stopPanAnimations]);

  const animateBoatTo = useCallback((lat: number, lng: number, duration: number): Promise<void> => {
    return new Promise(resolve => {
        if (!myObfPos) { resolve(); return; }
        isAnimatingRef.current = true;

        const newBoatPxX = (lng - myObfPos.lng) * DEGREES_TO_PX;
        const newBoatPxY = -(lat - myObfPos.lat) * DEGREES_TO_PX;
        cameraXOffsetRef.current = 0;
        cameraYOffsetRef.current = 0;

        boatMoveXRef.current = animate(boatOffsetX, newBoatPxX, { duration, ease: 'linear' });
        boatMoveYRef.current = animate(boatOffsetY, newBoatPxY, { duration, ease: 'linear' });

        panMoveXRef.current = animate(panX, -newBoatPxX * MAP_PLANE_SCALE, { duration, ease: 'linear' });
        panMoveYRef.current = animate(panY, -newBoatPxY * MAP_PLANE_SCALE, {
          duration,
          ease: 'linear',
          onComplete: () => {
            isAnimatingRef.current = false;
            boatMoveXRef.current = null;
            boatMoveYRef.current = null;
            stopPanAnimations();
            resolve();
          }
        });
    });
  }, [myObfPos, boatOffsetX, boatOffsetY, panX, panY, stopPanAnimations]);

  const syncBoatPosition = useCallback(() => {
    // Không tự động sync camera nếu đang trong trận đấu, animation, hoặc người dùng đang kéo map
    if (!myObfPos || currentLat == null || currentLng == null || isAnimatingRef.current || encounter || userDraggingRef.current) return;
    stopPanAnimations();
    const nextBoatX = (currentLng - myObfPos.lng) * DEGREES_TO_PX;
    const nextBoatY = -(currentLat - myObfPos.lat) * DEGREES_TO_PX;
    boatOffsetX.set(nextBoatX);
    boatOffsetY.set(nextBoatY);
    panX.set(-nextBoatX * MAP_PLANE_SCALE + cameraXOffsetRef.current);
    panY.set(-nextBoatY * MAP_PLANE_SCALE - cameraYOffsetRef.current);
  }, [myObfPos, currentLat, currentLng, encounter, boatOffsetX, boatOffsetY, panX, panY, stopPanAnimations]);

  const centerOnBoat = useCallback((yOffsetPx: number = 0, xOffsetPx: number = 0) => {
    stopPanAnimations();
    userDraggingRef.current = false;
    boatAutoFollowRef.current = true;
    cameraYOffsetRef.current = yOffsetPx;
    cameraXOffsetRef.current = xOffsetPx;

    // Lấy vị trí visual thực tế của thuyền tại thời điểm bấm nút
    const hasCurrentBoatPosition = !!myObfPos && currentLat != null && currentLng != null && !isAnimatingRef.current;
    const pxX = hasCurrentBoatPosition
      ? (currentLng - myObfPos.lng) * DEGREES_TO_PX
      : boatOffsetX.get();
    const pxY = hasCurrentBoatPosition
      ? -(currentLat - myObfPos.lat) * DEGREES_TO_PX
      : boatOffsetY.get();

    if (hasCurrentBoatPosition) {
      boatOffsetX.set(pxX);
      boatOffsetY.set(pxY);
    }

    // Di chuyển camera (pan) đến vị trí đó
    // Khi xoay Camera Yaw, hướng "Lên" của màn hình (yOffsetPx) không còn là hướng Bắc.
    // Chúng ta cần xoay vector offset theo góc Yaw hiện tại.
    const yawRad = ((typeof cameraYaw === 'number' ? cameraYaw : cameraYaw?.get?.() ?? 0) * Math.PI) / 180;
    
    // Vector offset trong view-space: [xOffsetPx, -yOffsetPx] (y âm vì đẩy lên là giảm Z trong world space mặc định)
    // Sau khi xoay Yaw:
    const rotatedX = xOffsetPx * Math.cos(yawRad) - (-yOffsetPx) * Math.sin(yawRad);
    const rotatedZ = xOffsetPx * Math.sin(yawRad) + (-yOffsetPx) * Math.cos(yawRad);

    panMoveXRef.current = animate(panX, -pxX * MAP_PLANE_SCALE + rotatedX, { duration: 0.9, ease: 'easeInOut' });
    panMoveYRef.current = animate(panY, -pxY * MAP_PLANE_SCALE + rotatedZ, {
      duration: 0.9,
      ease: 'easeInOut',
      onComplete: () => stopPanAnimations(),
    });
  }, [myObfPos, currentLat, currentLng, boatOffsetX, boatOffsetY, panX, panY, stopPanAnimations]);

  const stopPanFollow = useCallback(() => {
    userDraggingRef.current = true;
    boatAutoFollowRef.current = false;
    if (panMoveXRef.current) { panMoveXRef.current.stop(); panMoveXRef.current = null; }
    if (panMoveYRef.current) { panMoveYRef.current.stop(); panMoveYRef.current = null; }
  }, []);

  // Camera focus vào midpoint giữa thuyền User và Enemy (+60px X)
  const centerOnCombat = useCallback((yOffsetPx: number = -60, xOffsetPx: number = 0) => {
    // CRITICAL: Dừng tất cả animation thuyền trước khi tính midpoint
    // để đảm bảo boatOffsetX/Y đã ổn định, tránh camera target sai
    stopAllAnimations();
    userDraggingRef.current = false;
    cameraYOffsetRef.current = yOffsetPx;
    cameraXOffsetRef.current = xOffsetPx;
    
    const boatX = (boatOffsetX?.get?.() ?? 0) * MAP_PLANE_SCALE;
    // CHUYÊN GIA FIX: boatY cũng dùng MAP_PLANE_SCALE, đồng nhất với centerOnBoat và pan system.
    const boatY = (boatOffsetY?.get?.() ?? 0) * MAP_PLANE_SCALE;
    const midX = boatX + GAME_CONFIG.COMBAT_MIDPOINT_OFFSET_PX;
    const midY = boatY;
    panMoveXRef.current = animate(panX, -midX + xOffsetPx, { duration: 1.6, ease: 'easeInOut' });
    panMoveYRef.current = animate(panY, -midY - yOffsetPx, {
      duration: 1.6,
      ease: 'easeInOut',
      onComplete: () => stopPanAnimations(),
    });
  }, [stopAllAnimations, boatOffsetX, boatOffsetY, panX, panY, stopPanAnimations]);

  return {
    boatOffsetX, boatOffsetY,
    isAnimatingRef,
    stopAllAnimations, animateBoatTo, syncBoatPosition,
    centerOnBoat, centerOnCombat, stopPanFollow,
  };
}
