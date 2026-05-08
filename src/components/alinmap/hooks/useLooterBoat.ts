import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { animate, useMotionValue, MotionValue } from 'framer-motion';
import { DEGREES_TO_PX, MAP_PLANE_SCALE } from '../constants';
import { useLooterState, useLooterActions } from '../looter-game/LooterGameContext';
import { useBoatAnimation } from '../looter-game/hooks/useBoatAnimation';
import { getDistanceMeters } from '../looter-game/backpack/utils';

interface UseSeaBoatParams {
    isLooterGameMode: boolean;
    myObfPos: { lat: number; lng: number } | null;
    scale: MotionValue<number>;
    planeYScale: MotionValue<number>;
    panX: MotionValue<number>;
    panY: MotionValue<number>;
    setMainTab?: (tab: string) => void;
    setIsSheetExpanded: (v: boolean) => void;
    showNotification?: (msg: string, type: 'success' | 'error' | 'info') => void;
    setIsTierSelectorOpen?: (v: boolean) => void;
}

const TAP_MOVE_TOLERANCE_PX = 30;

export function useLooterBoat({
    isLooterGameMode, myObfPos, scale, planeYScale, panX, panY,
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
        stopAllAnimations();
        setBoatTargetPin(null);
        if (myObfPos) {
            const boatLng = myObfPos.lng + (boatOffsetX?.get?.() ?? 0) / DEGREES_TO_PX;
            const boatLat = myObfPos.lat - (boatOffsetY?.get?.() ?? 0) / DEGREES_TO_PX;
            moveBoat(boatLat, boatLng);
        }
    }, [stopAllAnimations, myObfPos, boatOffsetX, boatOffsetY, moveBoat]);

    const executeMoveToExact = useCallback((lat: number, lng: number) => {
        if (showMinigame || encounter || showCurseModal || combatResult || isIntegratedStorageOpen) {
            // Safety Reset Logic
            const now = Date.now();
            if (now - lastBlockTimeRef.current < 2000) {
                consecutiveBlockCountRef.current++;
                if (consecutiveBlockCountRef.current >= 3) {
                    console.warn('[MapMove] Force resetting blocked states');
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

        if (!isChallengeActive) {
            setIsTierSelectorOpen?.(true);
            return;
        }

        if (!myObfPos) return;



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
        const baseDuration = Math.min(Math.max(distDeg * 2000, 1), 8);
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
        animate(curseVisual, nextCurse, { duration, ease: "linear" });

        // Animation Offline: Thuyền trượt mượt trên map, sau khi kết thúc mới gọi moveBoat cập nhật logic
        animateBoatTo(lat, lng, duration).then(() => {
            // Nếu animation bị dừng giữa chừng (ví dụ user click chỗ khác), thì isAnimatingRef sẽ là false
            // Không thực hiện update logic ở đích nữa vì stopBoat() đã ghi nhận vị trí rồi.
            if (!isAnimatingRef.current) return;
            
            setBoatTargetPin(null);
            
            // Tính khoảng cách đã di chuyển (toàn bộ quãng đường tới đích)
            const curPxX = boatOffsetX.get();
            const curPxY = boatOffsetY.get();
            const finalLngVal = myObfPos.lng + curPxX / DEGREES_TO_PX;
            const finalLatVal = myObfPos.lat - curPxY / DEGREES_TO_PX;
            const finalDist = getDistanceMeters(startLat, startLng, finalLatVal, finalLngVal);
            
            // Update logic (Offline - gọi moveBoat để update react state, sinh curse, mở combat nếu có)
            moveBoat(lat, lng, false, finalDist).then(res => {
                if (res?.curseTrigger) {
                    centerOnCombat();
                }
            });
        });

    }, [isLooterGameMode, looterState, looterActions, myObfPos, boatOffsetX, boatOffsetY, showNotification, setIsTierSelectorOpen, animateBoatTo, curseVisual, isAnimatingRef, centerOnCombat, stopAllAnimations]);

    const handleMapDoubleClick = useCallback((clientX: number, clientY: number) => {
        if (!isLooterGameMode || !myObfPos) return;
        const currentScale = scale?.get?.() || 1;
        const offsetX = clientX - window.innerWidth / 2;
        const offsetY = clientY - window.innerHeight / 2;
        const mapX = (offsetX / currentScale - (panX?.get?.() ?? 0)) / MAP_PLANE_SCALE;
        const mapY = (offsetY / currentScale - (panY?.get?.() ?? 0)) / planeYScale.get();
        const lng = myObfPos.lng + mapX / DEGREES_TO_PX;
        const lat = myObfPos.lat - mapY / DEGREES_TO_PX;
        console.log('[MapClick]', { clientX, clientY, offsetX, offsetY, currentScale, panX: panX?.get?.(), panY: panY?.get?.(), mapX, mapY, lng, lat, myObfPos });
        executeMoveToExact(lat, lng);
    }, [isLooterGameMode, myObfPos, scale, panX, panY, planeYScale, executeMoveToExact]);

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
        handleMapDoubleClick(e.clientX, e.clientY);
        pointerDownRef.current = null;
    };

    const handlePointerCancel = () => {
        pointerDownRef.current = null;
    };

    return useMemo(() => ({
        boatOffsetX, boatOffsetY, curseVisual,
        boatTargetPin,
        handlePointerDown, handlePointerUp, handlePointerCancel,
        handleMapDoubleClick, executeMoveToExact, stopBoat, centerOnBoat, centerOnCombat, stopPanFollow
    }), [
        boatOffsetX, boatOffsetY, curseVisual,
        boatTargetPin,
        handlePointerDown, handlePointerUp, handlePointerCancel,
        handleMapDoubleClick, executeMoveToExact, stopBoat, centerOnBoat, centerOnCombat, stopPanFollow
    ]);
}
