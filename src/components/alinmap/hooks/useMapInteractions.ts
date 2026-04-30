import React, { useCallback, useRef } from 'react';
import { MotionValue } from 'framer-motion';
import { DEGREES_TO_PX } from '../constants';

interface UseMapInteractionsProps {
    panX: MotionValue<number>;
    panY: MotionValue<number>;
    scale: MotionValue<number>;
    isLooterGameMode: boolean;
    looterStateObj: any;
    isChallengeActive: boolean;
    myObfPos: { lat: number; lng: number } | null;
    looterBoat: any;
    setIsTierSelectorOpen?: (v: boolean) => void;
}

export function useMapInteractions({
    panX, panY, scale,
    isLooterGameMode, looterStateObj, isChallengeActive,
    myObfPos, looterBoat, setIsTierSelectorOpen
}: UseMapInteractionsProps) {

    const mapDragRef = useRef<{
        active: boolean;
        pointerId: number | null;
        startX: number;
        startY: number;
        startPanX: number;
        startPanY: number;
        moved: boolean;
        suppressClick: boolean;
    }>({
        active: false,
        pointerId: null,
        startX: 0,
        startY: 0,
        startPanX: 0,
        startPanY: 0,
        moved: false,
        suppressClick: false,
    });

    const handleMapPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        const interactiveTarget = (e.target as HTMLElement | null)?.closest?.('[data-map-interactive="true"]');
        if (interactiveTarget && !isLooterGameMode) {
            looterBoat.handlePointerDown(e);
            return;
        }
        looterBoat.handlePointerDown(e);
        mapDragRef.current = {
            active: true,
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            startPanX: panX.get(),
            startPanY: panY.get(),
            moved: false,
            suppressClick: false,
        };
        if (isLooterGameMode) {
            looterBoat.stopPanFollow?.();
        }

        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
        e.preventDefault();
    }, [isLooterGameMode, panX, panY, looterBoat]);

    const handleMapPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const dragState = mapDragRef.current;
        if (!dragState.active || dragState.pointerId !== e.pointerId) return;

        const currentScale = scale?.get?.() ?? 1;
        const deltaX = (e.clientX - dragState.startX) / currentScale;
        const deltaY = (e.clientY - dragState.startY) / currentScale;
        if (Math.abs(deltaX) + Math.abs(deltaY) > 4) {
            dragState.moved = true;
        }

        panX.set(dragState.startPanX + deltaX);
        panY.set(dragState.startPanY + deltaY);
        e.preventDefault();
    }, [panX, panY, scale]);

    const handleMapPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const dragState = mapDragRef.current;
        const interactiveTarget = (e.target as HTMLElement | null)?.closest?.('[data-map-interactive="true"]');

        if (dragState.active && dragState.pointerId === e.pointerId) {
            dragState.active = false;
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {}

            if (dragState.moved) {
                dragState.suppressClick = true;
                looterBoat.handlePointerCancel();
                return;
            }
        }

        if (interactiveTarget) {
            looterBoat.handlePointerCancel();
            return;
        }

        // --- Looter Challenge Initiation Logic ---
        if (isLooterGameMode && looterStateObj && !isChallengeActive && !dragState.moved) {
             const currentScale = scale?.get?.() || 1;
             const offsetX = e.clientX - window.innerWidth / 2;
             const offsetY = e.clientY - window.innerHeight / 2;
             const mapX = offsetX / currentScale - (panX?.get?.() ?? 0);
             const mapY = offsetY / currentScale - (panY?.get?.() ?? 0);
             const targetLng = (myObfPos?.lng || 0) + mapX / DEGREES_TO_PX;
             const targetLat = (myObfPos?.lat || 0) - mapY / DEGREES_TO_PX;

             const distToFortress = Math.sqrt(
                 Math.pow(targetLat - (looterStateObj.fortressLat || 0), 2) + 
                 Math.pow(targetLng - (looterStateObj.fortressLng || 0), 2)
             ) * 111000;

             if (distToFortress < 100) {
                 setIsTierSelectorOpen?.(true);
                 return;
             }
        }

        looterBoat.handlePointerUp(e);
    }, [looterBoat, isLooterGameMode, looterStateObj, isChallengeActive, setIsTierSelectorOpen, panX, panY, scale, myObfPos]);

    const handleMapPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const dragState = mapDragRef.current;
        if (dragState.active && dragState.pointerId === e.pointerId) {
            dragState.active = false;
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {}
        }
        looterBoat.handlePointerCancel();
    }, [looterBoat]);

    const handleMapClickCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const dragState = mapDragRef.current;
        if (!dragState.suppressClick) return;
        dragState.suppressClick = false;
        e.preventDefault();
        e.stopPropagation();
    }, []);

    return {
        handleMapPointerDown,
        handleMapPointerMove,
        handleMapPointerUp,
        handleMapPointerCancel,
        handleMapClickCapture
    };
}
