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
        stopPanFollow();
        curseAnimationRef.current?.stop();
        curseAnimationRef.current = null;
        setBoatTargetPin(null);
        onArrivalActionRef.current = null;
    }, [stopAllAnimations, stopPanFollow]);

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
    }, [isLooterGameMode, state?.currentLat, state?.currentLng, encounter, syncBoatPosition]);

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

        // User chose a new target or tapped the map, so the locate/follow mode must be released.
        stopPanFollow();

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
                    centerOnBoat();
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

    }, [isLooterGameMode, looterState, looterActions, myObfPos, boatOffsetX, boatOffsetY, showNotification, setIsTierSelectorOpen, animateBoatTo, curseVisual, isAnimatingRef, centerOnCombat, stopAllAnimations, stopPanFollow]);

    return useMemo(() => ({
        boatOffsetX, boatOffsetY, curseVisual,
        boatTargetPin, setOnArrivalAction,
        executeMoveToExact, stopBoat, centerOnBoat, centerOnCombat, stopPanFollow,
        cancelBoatMovement
    }), [
        boatOffsetX, boatOffsetY, curseVisual,
        boatTargetPin, setOnArrivalAction,
        executeMoveToExact, stopBoat, centerOnBoat, centerOnCombat, stopPanFollow,
        cancelBoatMovement
    ]);
}
