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
    encounter: any;
    isInteractionLocked?: boolean;
    setIsTierSelectorOpen?: (v: boolean) => void;
}

export function useMapInteractions({
    panX, panY, scale,
    isLooterGameMode, looterStateObj, isChallengeActive,
    myObfPos, looterBoat, encounter, isInteractionLocked = false, setIsTierSelectorOpen
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
        if (isInteractionLocked) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
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
        
        if (encounter) {
            // Trong lúc combat, chỉ cập nhật trạng thái drag (để pan bản đồ) chứ KHÔNG gọi handlePointerDown để di chuyển thuyền
            try {
                e.currentTarget.setPointerCapture(e.pointerId);
            } catch {}
            e.preventDefault();
            return;
        }

        if (isLooterGameMode) {
            looterBoat.stopPanFollow?.();
        }

        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
        e.preventDefault();
    }, [isLooterGameMode, panX, panY, looterBoat, encounter, isInteractionLocked]);

    const handleMapPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const dragState = mapDragRef.current;
        if (isInteractionLocked) {
            e.preventDefault();
            return;
        }
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
    }, [panX, panY, scale, encounter, isInteractionLocked]);

    const handleMapPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const dragState = mapDragRef.current;
        if (isInteractionLocked) {
            dragState.active = false;
            looterBoat.handlePointerCancel();
            e.preventDefault();
            e.stopPropagation();
            return;
        }
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

        if (encounter) {
            // Trong lúc combat, không cho phép thả map gây di chuyển thuyền. Chỉ di chuyển camera ở trên.
            return;
        }

             // --- Looter Challenge Initiation Logic ---
             if (isLooterGameMode && looterStateObj && !isChallengeActive && !dragState.moved) {
                  setIsTierSelectorOpen?.(true);
                  return;
             }

        looterBoat.handlePointerUp(e);
    }, [looterBoat, isLooterGameMode, looterStateObj, isChallengeActive, encounter, isInteractionLocked, setIsTierSelectorOpen, panX, panY, scale, myObfPos]);

    const handleMapPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const dragState = mapDragRef.current;
        if (isInteractionLocked) {
            dragState.active = false;
            looterBoat.handlePointerCancel();
            return;
        }
        if (dragState.active && dragState.pointerId === e.pointerId) {
            dragState.active = false;
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {}
        }
        looterBoat.handlePointerCancel();
    }, [looterBoat, isInteractionLocked]);

    const handleMapClickCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const dragState = mapDragRef.current;
        if (isInteractionLocked) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        if (!dragState.suppressClick) return;
        dragState.suppressClick = false;
        e.preventDefault();
        e.stopPropagation();
    }, [isInteractionLocked]);

    return {
        handleMapPointerDown,
        handleMapPointerMove,
        handleMapPointerUp,
        handleMapPointerCancel,
        handleMapClickCapture
    };
}
