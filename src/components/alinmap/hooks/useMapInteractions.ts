import React, { useCallback, useRef } from 'react';
import { MotionValue } from 'framer-motion';
import { DEGREES_TO_PX, MAP_PLANE_SCALE } from '../constants';
import type { AlinMapMode } from '../constants';

interface UseMapInteractionsProps {
    panX: MotionValue<number>;
    panY: MotionValue<number>;
    scale: MotionValue<number>;
    isLooterGameMode: boolean;
    myObfPos: { lat: number; lng: number } | null;
    looterBoat: any;
    encounter: any;
    isInteractionLocked?: boolean;
    planeYScale?: MotionValue<number>;
    cameraZ?: MotionValue<number>;
    setCameraZ?: (z: number) => void;
    mapMode?: AlinMapMode;
    useDomLooterLayer?: boolean;
}

interface MapDragState {
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    initialClientX: number;
    initialClientY: number;
    initialPanX: number;
    initialPanY: number;
    moved: boolean;
    suppressClick: boolean;
}

export function useMapInteractions({
    panX, panY, scale,
    isLooterGameMode,
    myObfPos, looterBoat, encounter, isInteractionLocked = false,
    planeYScale, cameraZ, setCameraZ, mapMode,
    useDomLooterLayer = false,
}: UseMapInteractionsProps) {

    const mapDragRef = useRef<MapDragState>({
        active: false,
        pointerId: null,
        startX: 0,
        startY: 0,
        startPanX: 0,
        startPanY: 0,
        initialClientX: 0,
        initialClientY: 0,
        initialPanX: 0,
        initialPanY: 0,
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
            return;
        }

        // Capture pointer to ensure smooth drag and prevent losing focus
        if (e.currentTarget && e.currentTarget.setPointerCapture) {
            e.currentTarget.setPointerCapture(e.pointerId);

        }

        mapDragRef.current = {
            active: true,
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            initialClientX: e.clientX,
            initialClientY: e.clientY,
            startPanX: panX.get(),
            startPanY: panY.get(),
            initialPanX: panX.get(),
            initialPanY: panY.get(),
            moved: false,
            suppressClick: false,
        };
        
        // Dừng toàn bộ animation pan (do setCenterAndZoom hoặc click) nếu user chạm vào map
        if (typeof panX.stop === 'function') panX.stop();
        if (typeof panY.stop === 'function') panY.stop();
        
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
            const zoomDelta = (scaleDiff - 1) * 31;
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
        const mapPlaneScale = MAP_PLANE_SCALE;
        
        // Calculate the absolute offset from the moment the pointer went down
        const totalMovX = e.clientX - dragState.initialClientX;
        const totalMovY = e.clientY - dragState.initialClientY;
        
        // Tốc độ 3.0 theo yêu cầu (kéo 1 pixel màn hình = map đi 3 pixel).
        const totalDeltaX = totalMovX / currentScale * 3.0;
        const totalDeltaY = totalMovY / currentScale * 3.0;

        if (Math.abs(totalMovX) > 4 || Math.abs(totalMovY) > 4) {
            dragState.moved = true;
        }

        // Apply absolute position instead of reading panX.get() which can have frame delay
        panX.set(dragState.initialPanX + totalDeltaX / mapPlaneScale);
        panY.set(dragState.initialPanY + (totalDeltaY / currentPlaneYScale) * mapPlaneScale);

        // Update relative for potential velocity calculations later, but rendering relies on absolute pan
        dragState.startX = e.clientX;
        dragState.startY = e.clientY;

        e.preventDefault();
    }, [panX, panY, scale, planeYScale, encounter, isInteractionLocked, mapMode]);

    const handleMapPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const dragState = mapDragRef.current;
        if (isInteractionLocked) {
            dragState.active = false;
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        
        activePointersRef.current.delete(e.pointerId);
        if (activePointersRef.current.size < 2) {
            initialPinchDistRef.current = null;
            initialCameraZRef.current = null;
        }

        if (e.currentTarget && e.currentTarget.releasePointerCapture) {
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);

            } catch (err) {}
        }

        const interactiveTarget = (e.target as HTMLElement | null)?.closest?.('[data-map-interactive="true"]');

        if (dragState.active && dragState.pointerId === e.pointerId) {
            dragState.active = false;

            if (dragState.moved) {
                dragState.suppressClick = true;
                return;
            }
        }

        if (interactiveTarget) {
            return;
        }

        if (encounter) {
            // Trong lúc combat, không cho phép thả map gây di chuyển thuyền. Chỉ di chuyển camera ở trên.
            return;
        }

        // DOM Pointer event delegation for looter game is removed.
        // All interactions are now handled natively by Three.js Raycaster.
    }, [looterBoat, isLooterGameMode, encounter, isInteractionLocked, panX, panY, scale, myObfPos, useDomLooterLayer]);

    const handleMapPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const dragState = mapDragRef.current;
        if (isInteractionLocked) {
            dragState.active = false;
            return;
        }
        
        activePointersRef.current.delete(e.pointerId);
        if (activePointersRef.current.size < 2) {
            initialPinchDistRef.current = null;
            initialCameraZRef.current = null;
        }

        if (e.currentTarget && e.currentTarget.releasePointerCapture) {
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);

            } catch (err) {}
        }

        if (dragState.active && dragState.pointerId === e.pointerId) {
            dragState.active = false;
        }
    }, [isInteractionLocked]);

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
