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
    planeYScale?: MotionValue<number>;
    cameraZ?: MotionValue<number>;
    setCameraZ?: (z: number) => void;
}

export function useMapInteractions({
    panX, panY, scale,
    isLooterGameMode, looterStateObj, isChallengeActive,
    myObfPos, looterBoat, encounter, isInteractionLocked = false, setIsTierSelectorOpen,
    planeYScale, cameraZ, setCameraZ
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

    const activePointersRef = useRef<Map<number, { x: number, y: number }>>(new Map());
    const initialPinchDistRef = useRef<number | null>(null);
    const initialCameraZRef = useRef<number | null>(null);

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
        
        activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (activePointersRef.current.size === 2) {
            const pts = Array.from(activePointersRef.current.values());
            const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            initialPinchDistRef.current = dist;
            initialCameraZRef.current = cameraZ?.get() ?? 0;
            mapDragRef.current.moved = true; // Prevent click if pinching
        }

        if (encounter) {
            // Trong lúc combat, chỉ cập nhật trạng thái drag (để pan bản đồ) chứ KHÔNG gọi handlePointerDown để di chuyển thuyền
            // Do not capture pointer, allow R3F to receive events
            e.preventDefault();
            return;
        }

        if (isLooterGameMode) {
            looterBoat.stopPanFollow?.();
        }

        // Do not capture pointer, allow R3F to receive events
        e.preventDefault();
    }, [isLooterGameMode, panX, panY, looterBoat, encounter, isInteractionLocked]);

    const handleMapPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const dragState = mapDragRef.current;
        if (isInteractionLocked) {
            e.preventDefault();
            return;
        }

        if (activePointersRef.current.has(e.pointerId)) {
            activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }

        if (activePointersRef.current.size === 2 && initialPinchDistRef.current != null && initialCameraZRef.current != null) {
            const pts = Array.from(activePointersRef.current.values());
            const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            const scaleDiff = currentDist / initialPinchDistRef.current;
            
            // Adjust zoom sensitivity based on need
            // Moving fingers apart (scaleDiff > 1) -> zoom in (larger cameraZ)
            // Moving fingers together (scaleDiff < 1) -> zoom out (smaller cameraZ)
            const zoomDelta = (scaleDiff - 1) * 250; 
            if (setCameraZ) {
                setCameraZ(initialCameraZRef.current + zoomDelta);
            }
            dragState.moved = true;
            e.preventDefault();
            return; // Skip panning while pinching
        }

        if (!dragState.active || dragState.pointerId !== e.pointerId) return;

        const currentScale = scale?.get?.() ?? 1;
        const currentPlaneYScale = planeYScale?.get?.() || 0.66;
        const mapPlaneScale = 1.32; // MAP_PLANE_SCALE from constants
        
        const deltaX = (e.clientX - dragState.startX) / currentScale;
        const deltaY = (e.clientY - dragState.startY) / currentScale;
        if (Math.abs(deltaX) + Math.abs(deltaY) > 4) {
            dragState.moved = true;
        }

        // Áp dụng scale ngược để map di chuyển chuẩn theo tay người dùng
        panX.set(dragState.startPanX - deltaX / mapPlaneScale);
        panY.set(dragState.startPanY + deltaY / currentPlaneYScale);
        e.preventDefault();
    }, [panX, panY, scale, planeYScale, encounter, isInteractionLocked]);

    const handleMapPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const dragState = mapDragRef.current;
        if (isInteractionLocked) {
            dragState.active = false;
            looterBoat.handlePointerCancel();
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        
        activePointersRef.current.delete(e.pointerId);
        if (activePointersRef.current.size < 2) {
            initialPinchDistRef.current = null;
            initialCameraZRef.current = null;
        }

        const interactiveTarget = (e.target as HTMLElement | null)?.closest?.('[data-map-interactive="true"]');

        if (dragState.active && dragState.pointerId === e.pointerId) {
            dragState.active = false;

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
        
        activePointersRef.current.delete(e.pointerId);
        if (activePointersRef.current.size < 2) {
            initialPinchDistRef.current = null;
            initialCameraZRef.current = null;
        }

        if (dragState.active && dragState.pointerId === e.pointerId) {
            dragState.active = false;
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
