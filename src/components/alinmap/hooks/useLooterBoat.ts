import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { animate, useMotionValue, MotionValue } from 'framer-motion';
import { DEGREES_TO_PX } from '../constants';
import { useLooterState, useLooterActions } from '../looter-game/LooterGameContext';
import { useBoatAnimation } from '../looter-game/hooks/useBoatAnimation';
import { getDistanceMeters } from '../looter-game/backpack/utils';

interface UseSeaBoatParams {
    isLooterGameMode: boolean;
    myObfPos: { lat: number; lng: number } | null;
    scale: MotionValue<number>;
    panX: MotionValue<number>;
    panY: MotionValue<number>;
    setMainTab?: (tab: string) => void;
    setIsSheetExpanded: (v: boolean) => void;
    showNotification?: (msg: string, type: 'success' | 'error' | 'info') => void;
    setIsTierSelectorOpen?: (v: boolean) => void;
}

const TAP_MOVE_TOLERANCE_PX = 30;

export function useLooterBoat({
    isLooterGameMode, myObfPos, scale, panX, panY,
    setMainTab, setIsSheetExpanded, showNotification, setIsTierSelectorOpen
}: UseSeaBoatParams) {
    const looterState = useLooterState();
    const looterActions = useLooterActions();
    
    const { 
        state, worldItems, isChallengeActive, showMinigame, 
        isFortressStorageOpen, encounter, showCurseModal, combatResult,
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
        myObfPos, panX, panY,
        currentLat: state?.currentLat ?? null,
        currentLng: state?.currentLng ?? null,
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
        if (showMinigame || encounter || showCurseModal || combatResult) {
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

        const multiplier = globalSettings?.speedMultiplier || 1.0;
        const baseDuration = Math.min(Math.max(distDeg * 2000, 1), 8);
        const duration = baseDuration / multiplier;

        // Curse visual interpolation
        const currentCurse = state.cursePercent || 0;
        const curseGainMultiplier = state.activeCurses?.curse_gain ? 1.5 : 1;
        const distMeters = distDeg * 111000;
        const expectedCurseGain = (distMeters / 100) * curseGainMultiplier;
        const nextCurse = Math.min(100, currentCurse + expectedCurseGain);
        animate(curseVisual, nextCurse, { duration, ease: "linear" });

        isAnimatingRef.current = true;
        setBoatTargetPin({ lat, lng });
        moveBoat(lat, lng).then(res => {
            if (res?.curseTrigger) {
                stopAllAnimations();
                centerOnCombat();
            }
        });
        animateBoatTo(lat, lng, duration);
    }, [isLooterGameMode, looterState, looterActions, myObfPos, boatOffsetX, boatOffsetY, showNotification, setIsTierSelectorOpen, animateBoatTo, curseVisual, isAnimatingRef, centerOnCombat, stopAllAnimations]);

    const handleMapDoubleClick = useCallback((clientX: number, clientY: number) => {
        if (!isLooterGameMode || !myObfPos) return;
        const currentScale = scale?.get?.() || 1;
        const offsetX = clientX - window.innerWidth / 2;
        const offsetY = clientY - window.innerHeight / 2;
        const mapX = offsetX / currentScale - (panX?.get?.() ?? 0);
        const mapY = offsetY / currentScale - (panY?.get?.() ?? 0);
        const lng = myObfPos.lng + mapX / DEGREES_TO_PX;
        const lat = myObfPos.lat - mapY / DEGREES_TO_PX;
        executeMoveToExact(lat, lng);
    }, [isLooterGameMode, myObfPos, scale, panX, panY, executeMoveToExact]);

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
        handleMapDoubleClick, executeMoveToExact, stopBoat, centerOnBoat, stopPanFollow
    }), [
        boatOffsetX, boatOffsetY, curseVisual,
        boatTargetPin,
        handlePointerDown, handlePointerUp, handlePointerCancel,
        handleMapDoubleClick, executeMoveToExact, stopBoat, centerOnBoat, stopPanFollow
    ]);
}
