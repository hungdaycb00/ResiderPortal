import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { animate, useMotionValue, MotionValue } from 'framer-motion';
import { DEGREES_TO_PX, MAP_PLANE_SCALE, getRoadmapCenterFromPan, getRoadmapTileZoom, ROADMAP_TILE_SIZE } from '../constants';
import { useLooterState, useLooterActions } from '../looter-game/LooterGameContext';
import { useBoatAnimation } from '../looter-game/hooks/useBoatAnimation';
import { getDistanceMeters } from '../looter-game/backpack/utils';
import { clamp as clampVal } from '../constants';

// Tile projection helpers (giống LooterMapPlaneLayer)
const lngToTileX = (lng: number, zoom: number) => ((lng + 180) / 360) * 2 ** zoom;
const latToTileY = (lat: number, zoom: number) => {
    const safeLat = clampVal(lat, -85.05112878, 85.05112878);
    const rad = safeLat * Math.PI / 180;
    return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom;
};
const tileXToLng = (x: number, zoom: number) => (x / (2 ** zoom)) * 360 - 180;
const tileYToLat = (y: number, zoom: number) => {
    const n = Math.PI - (2 * Math.PI * y) / (2 ** zoom);
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

interface UseSeaBoatParams {
    isLooterGameMode: boolean;
    myObfPos: { lat: number; lng: number } | null;
    scale: MotionValue<number>;
    planeYScale: MotionValue<number>;
    panX: MotionValue<number>;
    panY: MotionValue<number>;
    perspectivePx: number;
    cameraFov: number;
    cameraZ: MotionValue<number>;
    cameraHeightOffset: number;
    setMainTab?: (tab: string) => void;
    setIsSheetExpanded: (v: boolean) => void;
    showNotification?: (msg: string, type: 'success' | 'error' | 'info') => void;
    setIsTierSelectorOpen?: (v: boolean) => void;
}

const TAP_MOVE_TOLERANCE_PX = 30;

export function useLooterBoat({
    isLooterGameMode, myObfPos, scale, planeYScale, panX, panY,
    perspectivePx, cameraFov, cameraZ, cameraHeightOffset,
    setMainTab, setIsSheetExpanded, showNotification, setIsTierSelectorOpen
}: UseSeaBoatParams) {
    const looterState = useLooterState();
    const looterActions = useLooterActions();
    
    const { 
        state, worldItems, isChallengeActive, showMinigame, 
        isFortressStorageOpen, isIntegratedStorageOpen, encounter, showCurseModal, combatResult,
        globalSettings
    } = looterState;
    
    const { 
        moveBoat, setShowMinigame, setEncounter, 
        setShowCurseModal, setCombatResult, setIsChallengeActive,
        openFortressStorage, loadState, inflictMinigamePenalty
    } = looterActions;

    const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
    const lastBlockTimeRef = useRef<number>(0);
    const consecutiveBlockCountRef = useRef<number>(0);
    const curseVisual = useMotionValue(0);
    const [boatTargetPin, setBoatTargetPin] = useState<{lat: number, lng: number} | null>(null);
    const onArrivalActionRef = useRef<(() => void) | null>(null);
    const movementRunIdRef = useRef(0);
    const isLooterModeRef = useRef(isLooterGameMode);
    const curseAnimationRef = useRef<{ stop: () => void } | null>(null);

    // Sub-hook: Boat Animation
    const {
        boatOffsetX, boatOffsetY, isAnimatingRef,
        stopAllAnimations, animateBoatTo, syncBoatPosition,
        centerOnBoat, centerOnCombat, stopPanFollow
    } = useBoatAnimation({
        myObfPos, panX, panY, planeYScale,
        currentLat: state?.currentLat ?? null,
        currentLng: state?.currentLng ?? null,
        encounter,
    });





    const cancelBoatMovement = useCallback(() => {
        movementRunIdRef.current += 1;
        stopAllAnimations();
        curseAnimationRef.current?.stop();
        curseAnimationRef.current = null;
        setBoatTargetPin(null);
        onArrivalActionRef.current = null;
    }, [stopAllAnimations]);

    useEffect(() => {
        isLooterModeRef.current = isLooterGameMode;
        if (!isLooterGameMode) {
            cancelBoatMovement();
        }
    }, [isLooterGameMode, cancelBoatMovement]);

    // Sync boat position when state changes
    useEffect(() => {
        if (!isLooterGameMode || !state) return;
        syncBoatPosition();
    }, [isLooterGameMode, state?.currentLat, state?.currentLng, isChallengeActive, syncBoatPosition]);

    const pendingPickupsRef = useRef<Set<string>>(new Set());

    // Auto-pickup logic has been removed as per user request. 
    // Users must now manually click on items to pick them up or start minigames.
    useEffect(() => {
        pendingPickupsRef.current.clear();
    }, [worldItems]);

    // Sync curse visual
    useEffect(() => {
        curseVisual.set(state?.cursePercent || 0);
    }, [state?.cursePercent, curseVisual]);

    const stopBoat = useCallback(() => {
        movementRunIdRef.current += 1;
        stopAllAnimations();
        curseAnimationRef.current?.stop();
        curseAnimationRef.current = null;
        setBoatTargetPin(null);
        onArrivalActionRef.current = null;
        if (myObfPos) {
            const boatLng = myObfPos.lng + (boatOffsetX?.get?.() ?? 0) / DEGREES_TO_PX;
            const boatLat = myObfPos.lat - (boatOffsetY?.get?.() ?? 0) / DEGREES_TO_PX;
            moveBoat(boatLat, boatLng);
        }
    }, [stopAllAnimations, myObfPos, boatOffsetX, boatOffsetY, moveBoat]);

    const setOnArrivalAction = useCallback((action: (() => void) | null) => {
        onArrivalActionRef.current = action;
    }, []);

    const executeMoveToExact = useCallback((lat: number, lng: number, source: string = 'map') => {
        if (!isLooterModeRef.current) return;

        if (showMinigame || encounter || showCurseModal || combatResult || isIntegratedStorageOpen) {
            // Safety Reset Logic
            const now = Date.now();
            if (now - lastBlockTimeRef.current < 2000) {
                consecutiveBlockCountRef.current++;
                if (consecutiveBlockCountRef.current >= 3) {
                    setShowMinigame(null);
                    setEncounter(null);
                    setShowCurseModal(false);
                    setCombatResult(null);
                    setIsChallengeActive(true);
                    consecutiveBlockCountRef.current = 0;
                    showNotification?.('Đã tự động sửa lỗi kẹt di chuyển.', 'info');
                }
            } else {
                consecutiveBlockCountRef.current = 1;
            }
            lastBlockTimeRef.current = now;
            return;
        }

        if (!isChallengeActive && state?.worldTier === -1) {
            setIsTierSelectorOpen?.(true);
            return;
        }

        if (!myObfPos) return;
        const runId = movementRunIdRef.current + 1;
        movementRunIdRef.current = runId;
        curseAnimationRef.current?.stop();
        curseAnimationRef.current = null;

        // Dừng animation cũ trước khi bắt đầu animation mới (tránh double execution)
        stopAllAnimations();

        const boatLng = myObfPos.lng + (boatOffsetX?.get?.() ?? 0) / DEGREES_TO_PX;
        const boatLat = myObfPos.lat - (boatOffsetY?.get?.() ?? 0) / DEGREES_TO_PX;
        const distLng = lng - boatLng;
        const distLat = lat - boatLat;
        const distDeg = Math.sqrt(distLng * distLng + distLat * distLat);

        isAnimatingRef.current = true;
        setBoatTargetPin({ lat, lng });
        setIsSheetExpanded(false);
        
        // Tính toán khoảng cách và thời gian
        const multiplier = globalSettings?.speedMultiplier || 1.0;
        // Tốc độ cố định: thời gian tỉ lệ thuận với khoảng cách, không clamp
        const SPEED_DEG_PER_SEC = 0.008; // ~0.89 km/s trong world space, tốc độ mặc định (x1)
        const baseDuration = distDeg / SPEED_DEG_PER_SEC;
        const duration = baseDuration / multiplier;

        // Lưu lại vị trí bắt đầu
        const startLat = boatLat;
        const startLng = boatLng;
        const totalDistMeters = distDeg * 111000;

        // Hiệu ứng Curse visual interpolation chạy offline trong lúc di chuyển
        const currentCurse = state.cursePercent || 0;
        const curseGainMultiplier = state.activeCurses?.curse_gain ? 1.5 : 1;
        const expectedCurseGain = (totalDistMeters / 100) * curseGainMultiplier;
        const nextCurse = Math.min(100, currentCurse + expectedCurseGain);
        curseAnimationRef.current = animate(curseVisual, nextCurse, { duration, ease: "linear" });

        // Animation Offline: Thuyền trượt mượt trên map, sau khi kết thúc mới gọi moveBoat cập nhật logic
        animateBoatTo(lat, lng, duration).then(() => {
            // Nếu animation bị dừng giữa chừng (ví dụ user click chỗ khác), thì isAnimatingRef sẽ là false
            // Không thực hiện update logic ở đích nữa vì stopBoat() đã ghi nhận vị trí rồi.
            if (movementRunIdRef.current !== runId || !isLooterModeRef.current) return;
            
            setBoatTargetPin(null);
            curseAnimationRef.current = null;
            
            // Tính khoảng cách đã di chuyển (toàn bộ quãng đường tới đích)
            const curPxX = boatOffsetX.get();
            const curPxY = boatOffsetY.get();
            const finalLngVal = myObfPos.lng + curPxX / DEGREES_TO_PX;
            const finalLatVal = myObfPos.lat - curPxY / DEGREES_TO_PX;
            const finalDist = getDistanceMeters(startLat, startLng, finalLatVal, finalLngVal);
            
            // Update logic (Offline - gọi moveBoat để update react state, sinh curse, mở combat nếu có)
            moveBoat(lat, lng, false, finalDist).then(res => {
                if (movementRunIdRef.current !== runId || !isLooterModeRef.current) return;
                if (res?.curseTrigger) {
                    centerOnCombat();
                } else {
                    // Auto-interact: thực thi callback nếu được set trước khi di chuyển
                    const arrivalAction = onArrivalActionRef.current;
                    onArrivalActionRef.current = null;
                    if (arrivalAction) {
                        setTimeout(() => {
                            if (movementRunIdRef.current === runId && isLooterModeRef.current) {
                                arrivalAction();
                            }
                        }, 300);
                    }
                }
            });
        });

    }, [isLooterGameMode, looterState, looterActions, myObfPos, boatOffsetX, boatOffsetY, showNotification, setIsTierSelectorOpen, animateBoatTo, curseVisual, isAnimatingRef, centerOnCombat, stopAllAnimations]);

    /**
     * Chuyển đổi click trên màn hình (clientX, clientY) → (lat, lng) trên map.
     * 
     * Wrapper div giữa .alin-map-scene và .alin-map-tilt-plane có transform
     * nhưng KHÔNG có transform-style: preserve-3d → phá vỡ 3D context.
     * Do đó rotateX(tilt) chỉ là phép chiếu 2D phẳng (scale Y bởi cosTilt),
     * KHÔNG có perspective foreshortening.
     * 
     * Phép chiếu thuận (plane → screen):
     *   screenX = planeX * S        (relative to wrapper center)
     *   screenY = planeY * cos(tilt) * S  (relative to wrapper center)
     * 
     * Phép chiếu ngược (screen → plane):
     *   planeX = relX / S
     *   planeY = relY / (cos(tilt) * S)
     * 
     * Flow: clientXY → affineInverse → planeXY → tileReverse → lat/lng
     */
    const screenToWorld = useCallback((clientX: number, clientY: number) => {
        if (!myObfPos) return null;

        // 1. Lấy viewport container
        const sceneEl = document.querySelector('.alin-map-scene') as HTMLElement | null;
        if (!sceneEl) return null;
        
        const sceneRect = sceneEl.getBoundingClientRect();
        
        // 2. Reference point = viewport center (50%, 50%)
        //    Đây là tâm của wrapper div (left:50% top:50% -translate-x/y-1/2)
        //    và cũng là transform-origin của tilt-plane (center center)
        const centerX = sceneRect.left + sceneRect.width * 0.5;
        const centerY = sceneRect.top + sceneRect.height * 0.5;
        
        // 3. Tọa độ click tương đối với wrapper center
        const relX = clientX - centerX;
        const relY = clientY - centerY;
        
        // 4. Tilt angle từ planeYScale
        const curPlaneYScale = planeYScale.get();
        const cosTheta = clampVal(curPlaneYScale / MAP_PLANE_SCALE, 0.001, 1);
        const tiltRad = Math.acos(cosTheta);
        const cosTilt = Math.cos(tiltRad);
        const S = MAP_PLANE_SCALE;
        
        // 5. Affine inverse (2D, không perspective):
        //    rotateX(tilt) scale(S) → screenX = planeX * S
        //                           → screenY = planeY * cosTilt * S
        const planeX = relX / S;
        const planeY = relY / (cosTilt * S);
        
        // 6. Chuyển sang hệ tọa độ tile Mercator (ngược lại projectToPlane)
        //    projectToPlane: x = planeSize/2 + (targetTileX - centerTileX) * TILE_SIZE
        //    Ngược lại: targetTileX = centerTileX + planeX / TILE_SIZE
        const curPanX = panX?.get?.() ?? 0;
        const curPanY = panY?.get?.() ?? 0;
        const visualScale = clampVal(scale?.get?.() ?? 1, 0.08, 8);
        
        const tileZoom = getRoadmapTileZoom(visualScale);
        const center = getRoadmapCenterFromPan(myObfPos, curPanX, curPanY, curPlaneYScale);
        
        const centerTileX = lngToTileX(center.lng, tileZoom);
        const centerTileY = latToTileY(center.lat, tileZoom);
        
        const targetTileX = centerTileX + planeX / ROADMAP_TILE_SIZE;
        const targetTileY = centerTileY + planeY / ROADMAP_TILE_SIZE;
        
        // 7. Tile → lat/lng
        const lat = tileYToLat(targetTileY, tileZoom);
        const lng = tileXToLng(targetTileX, tileZoom);

        return { lat, lng };
    }, [myObfPos, scale, planeYScale, panX, panY, perspectivePx]);

    const handleMapClick = useCallback((clientX: number, clientY: number) => {
        if (!isLooterGameMode || !myObfPos) return;
        const result = screenToWorld(clientX, clientY);
        if (!result) return;
        executeMoveToExact(result.lat, result.lng, 'map');
    }, [isLooterGameMode, myObfPos, screenToWorld, executeMoveToExact]);

    const isTapWithinTolerance = (start: { x: number; y: number } | null, end: { x: number; y: number }) => {
        if (!start) return true;
        const deltaX = end.x - start.x;
        const deltaY = end.y - start.y;
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY) <= TAP_MOVE_TOLERANCE_PX;
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        pointerDownRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isLooterGameMode || !looterState || !myObfPos) {
            pointerDownRef.current = null;
            return;
        }
        const currentPoint = { x: e.clientX, y: e.clientY };
        if (!isTapWithinTolerance(pointerDownRef.current, currentPoint)) {
            pointerDownRef.current = null;
            return;
        }
        // Truyền clientX/Y trực tiếp vào screenToWorld
        // (không cần tính offset từ center container nữa)
        handleMapClick(e.clientX, e.clientY);
        pointerDownRef.current = null;
    };

    const handlePointerCancel = () => {
        pointerDownRef.current = null;
    };

    return useMemo(() => ({
        boatOffsetX, boatOffsetY, curseVisual,
        boatTargetPin, setOnArrivalAction,
        handlePointerDown, handlePointerUp, handlePointerCancel,
        handleMapClick, executeMoveToExact, stopBoat, centerOnBoat, centerOnCombat, stopPanFollow,
        cancelBoatMovement
    }), [
        boatOffsetX, boatOffsetY, curseVisual,
        boatTargetPin, setOnArrivalAction,
        handlePointerDown, handlePointerUp, handlePointerCancel,
        handleMapClick, executeMoveToExact, stopBoat, centerOnBoat, centerOnCombat, stopPanFollow,
        cancelBoatMovement
    ]);
}
