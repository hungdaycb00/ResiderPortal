import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useMotionValue, animate, useAnimationFrame, MotionValue } from 'framer-motion';
import { DEGREES_TO_PX } from '../constants';

interface UseSeaBoatParams {
    isSeaGameMode: boolean;
    seaGameCtx: any;
    myObfPos: { lat: number; lng: number } | null;
    scale: MotionValue<number>;
    panX: MotionValue<number>;
    panY: MotionValue<number>;
    setMainTab?: (tab: string) => void;
    setIsSheetExpanded: (v: boolean) => void;
    showNotification?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const PICKUP_RADIUS_DEG = 0.0011; // forgiving pickup radius
const PORTAL_RADIUS_DEG = 0.0024;
const TAP_MOVE_TOLERANCE_PX = 30;

export function useSeaBoat({
    isSeaGameMode, seaGameCtx, myObfPos, scale, panX, panY,
    setMainTab, setIsSheetExpanded, showNotification
}: UseSeaBoatParams) {
    const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
    const pickingItemsRef = useRef(new Set<string>());
    const activePortalRef = useRef<string | null>(null);
    const isAnimatingRef = useRef(false);
    const boatMoveXRef = useRef<any>(null);
    const boatMoveYRef = useRef<any>(null);

    const boatOffsetX = useMotionValue(0);
    const boatOffsetY = useMotionValue(0);
    const curseVisual = useMotionValue(0);
    const [boatTargetPin, setBoatTargetPin] = useState<{lat: number, lng: number} | null>(null);

    useEffect(() => {
        curseVisual.set(seaGameCtx?.state?.cursePercent || 0);
    }, [seaGameCtx?.state?.cursePercent, curseVisual]);

    useEffect(() => {
        if (!isSeaGameMode || !seaGameCtx?.state || !myObfPos || isAnimatingRef.current) return;
        const { currentLat, currentLng } = seaGameCtx.state;
        if (currentLat == null || currentLng == null) return;

        const nextBoatX = (currentLng - myObfPos.lng) * DEGREES_TO_PX;
        const nextBoatY = -(currentLat - myObfPos.lat) * DEGREES_TO_PX;
        boatOffsetX.set(nextBoatX);
        boatOffsetY.set(nextBoatY);
        panX.set(-nextBoatX);
        panY.set(-nextBoatY);
    }, [
        isSeaGameMode,
        seaGameCtx?.state?.currentLat,
        seaGameCtx?.state?.currentLng,
        seaGameCtx?.isChallengeActive,
        myObfPos,
        boatOffsetX,
        boatOffsetY,
        panX,
        panY,
    ]);



    // Auto-pickup loop
    useAnimationFrame(() => {
        if (!isSeaGameMode || !seaGameCtx || !myObfPos) return;
        if (seaGameCtx.showMinigame || seaGameCtx.isFortressStorageOpen || seaGameCtx.encounter || seaGameCtx.showCurseModal || seaGameCtx.combatResult) {
            // Stop movement if any event is active
            if (boatMoveXRef.current) {
                boatMoveXRef.current.stop();
                boatMoveXRef.current = null;
                isAnimatingRef.current = false;
            }
            if (boatMoveYRef.current) {
                boatMoveYRef.current.stop();
                boatMoveYRef.current = null;
                isAnimatingRef.current = false;
            }
            setBoatTargetPin(null);
            return;
        }
        if (
            !seaGameCtx.worldItems?.length ||
            seaGameCtx.pickupRewardItem ||
            seaGameCtx.pendingBagSwap ||
            seaGameCtx.showMinigame
        ) return;

        const currentLng = myObfPos.lng + (boatOffsetX?.get?.() ?? 0) / DEGREES_TO_PX;
        const currentLat = myObfPos.lat - (boatOffsetY?.get?.() ?? 0) / DEGREES_TO_PX;

        seaGameCtx.worldItems.forEach((item: any) => {
            if (pickingItemsRef.current.has(item.spawnId)) return;
            const dLat = item.lat - currentLat;
            const dLng = item.lng - currentLng;
            const dist = Math.sqrt(dLat * dLat + dLng * dLng);
            if (item?.item?.type === 'portal') {
                if (dist < PORTAL_RADIUS_DEG && activePortalRef.current !== item.spawnId) {
                    boatOffsetX.stop();
                    boatOffsetY.stop();
                    panX.stop();
                    panY.stop();
                    isAnimatingRef.current = false;
                    setBoatTargetPin(null);
                    activePortalRef.current = item.spawnId;
                    seaGameCtx.openFortressStorage?.('portal');
                } else if (dist >= PORTAL_RADIUS_DEG && activePortalRef.current === item.spawnId) {
                    activePortalRef.current = null;
                }
                return;
            }
            if (dist < PICKUP_RADIUS_DEG) {
                // Dừng thuyền khi va chạm
                boatOffsetX.stop();
                boatOffsetY.stop();
                panX.stop();
                panY.stop();
                isAnimatingRef.current = false;
                setBoatTargetPin(null);

                const rarityStr = item.item?.rarity || '';
                const isRare = rarityStr === 'rare' || rarityStr === 'legendary' || item.isExpander;

                if (isRare) {
                    seaGameCtx.setShowMinigame(item);
                    pickingItemsRef.current.add(item.spawnId);
                    return;
                }

                pickingItemsRef.current.add(item.spawnId);
                seaGameCtx.pickupItem(item.spawnId).then((success: boolean) => {
                    if (!success) {
                        setTimeout(() => pickingItemsRef.current.delete(item.spawnId), 5000);
                    }
                });
            }
        });
    });

    const executeMoveToExact = useCallback((lat: number, lng: number) => {
        if (!isSeaGameMode || !seaGameCtx || !myObfPos) {
            console.log('[MapMove] Pre-conditions failed:', { isSeaGameMode, hasCtx: !!seaGameCtx, hasPos: !!myObfPos });
            return;
        }

        if (seaGameCtx.showMinigame || seaGameCtx.encounter || seaGameCtx.showCurseModal) {
            console.log('[MapMove] Blocked by active event');
            return;
        }

        if (!seaGameCtx.isChallengeActive) {
            showNotification?.('Bạn đang ở Thành Trì. Hãy mở Balo -> Thử Thách để xuất phát!', 'info');
            return;
        }

        console.log('[MapMove] Target Coordinates:', { lat, lng });

        const boatLng = myObfPos.lng + (boatOffsetX?.get?.() ?? 0) / DEGREES_TO_PX;
        const boatLat = myObfPos.lat - (boatOffsetY?.get?.() ?? 0) / DEGREES_TO_PX;
        const distLng = lng - boatLng;
        const distLat = lat - boatLat;
        const distDeg = Math.sqrt(distLng * distLng + distLat * distLat);

        const multiplier = seaGameCtx?.globalSettings?.speedMultiplier || 1.0;
        const baseDuration = Math.min(Math.max(distDeg * 2000, 1), 8);
        const duration = baseDuration / multiplier;

        const hasFloatingItems = seaGameCtx.state.inventory.some((i: any) => i.gridX < 0);
        if (hasFloatingItems) {
            console.log('[MapMove] Blocked by floating items');
            seaGameCtx.setShowDiscardModal(true);
            return;
        }

        const currentCurse = seaGameCtx.state.cursePercent || 0;
        const curseGainMultiplier = seaGameCtx.state.activeCurses?.curse_gain ? 1.5 : 1;
        const distMeters = distDeg * 111000;
        const expectedCurseGain = (distMeters / 100) * curseGainMultiplier;
        const nextCurse = Math.min(100, currentCurse + expectedCurseGain);
        animate(curseVisual, nextCurse, { duration, ease: "linear" });

        console.log('[MapMove] Executing move...', { duration });
        isAnimatingRef.current = true;
        setBoatTargetPin({ lat, lng });
        seaGameCtx.moveBoat(lat, lng);

        const newBoatPxX = (lng - myObfPos.lng) * DEGREES_TO_PX;
        const newBoatPxY = -(lat - myObfPos.lat) * DEGREES_TO_PX;

        boatMoveXRef.current = animate(boatOffsetX, newBoatPxX, { duration, ease: "easeInOut" });
        boatMoveYRef.current = animate(boatOffsetY, newBoatPxY, { duration, ease: "easeInOut" });

        const newPanX = -newBoatPxX;
        const newPanY = -newBoatPxY;
        animate(panX, newPanX, { duration, ease: "easeInOut" });
        animate(panY, newPanY, {
            duration,
            ease: "easeInOut",
            onComplete: () => {
                isAnimatingRef.current = false;
                setBoatTargetPin(null);
                boatMoveXRef.current = null;
                boatMoveYRef.current = null;
            }
        });
        }, [isSeaGameMode, seaGameCtx, myObfPos, scale, panX, panY, boatOffsetX, boatOffsetY, showNotification]);

    const centerOnBoat = useCallback(() => {
        const nextPanX = -(boatOffsetX?.get?.() ?? 0);
        const nextPanY = -(boatOffsetY?.get?.() ?? 0);
        animate(panX, nextPanX, { duration: 0.45, ease: 'easeInOut' });
        animate(panY, nextPanY, { duration: 0.45, ease: 'easeInOut' });
    }, [boatOffsetX, boatOffsetY, panX, panY]);

    const handleMapDoubleClick = useCallback((clientX: number, clientY: number) => {
        if (!isSeaGameMode || !myObfPos) return;

        const currentScale = scale?.get?.() || 1;
        const offsetX = clientX - window.innerWidth / 2;
        const offsetY = clientY - window.innerHeight / 2;
        const mapX = offsetX / currentScale - (panX?.get?.() ?? 0);
        const mapY = offsetY / currentScale - (panY?.get?.() ?? 0);
        const lng = myObfPos.lng + mapX / DEGREES_TO_PX;
        const lat = myObfPos.lat - mapY / DEGREES_TO_PX;
        
        executeMoveToExact(lat, lng);
    }, [isSeaGameMode, myObfPos, scale, panX, panY, executeMoveToExact]);

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
        if (!isSeaGameMode || !seaGameCtx || !myObfPos) {
            pointerDownRef.current = null;
            return;
        }

        const currentPoint = { x: e.clientX, y: e.clientY };
        if (!isTapWithinTolerance(pointerDownRef.current, currentPoint)) {
            pointerDownRef.current = null;
            return;
        }

        console.log('[MapClick] Tap detected');
        handleMapDoubleClick(e.clientX, e.clientY);
        pointerDownRef.current = null;
    };

    const handlePointerCancel = () => {
        pointerDownRef.current = null;
    };

    return {
        boatOffsetX, boatOffsetY, curseVisual,
        boatTargetPin,
        handlePointerDown, handlePointerUp, handlePointerCancel,
        handleMapDoubleClick, executeMoveToExact, centerOnBoat
    };
}
