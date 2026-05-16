import React, { useRef } from 'react';
import { DEGREES_TO_PX, MAP_PLANE_SCALE } from '../../constants';
import type { MotionValue } from 'framer-motion';

interface DragHandlersParams {
  isLooterGameMode: boolean;
  position: [number, number] | null;
  scale: MotionValue<number>;
  planeYScale: MotionValue<number>;
  selfDragX: MotionValue<number>;
  selfDragY: MotionValue<number>;
  onSelfDragEnd?: (newLat: number, newLng: number) => void;
}

export function useDragHandlers(params: DragHandlersParams) {
  const { isLooterGameMode, position, scale, planeYScale, selfDragX, selfDragY, onSelfDragEnd } = params;

  const selfDragRef = useRef<{ active: boolean; startClientX: number; startClientY: number; moved: boolean }>(
    { active: false, startClientX: 0, startClientY: 0, moved: false }
  );

  const capturePointer = (e: any) => {
    const target = e?.target ?? e?.currentTarget ?? e?.sourceEvent?.target;
    if (target?.setPointerCapture && typeof e?.pointerId === 'number') {
      try {
        target.setPointerCapture(e.pointerId);
      } catch {}
    }
  };

  const releasePointer = (e: any) => {
    const target = e?.target ?? e?.currentTarget ?? e?.sourceEvent?.target;
    if (target?.releasePointerCapture && typeof e?.pointerId === 'number') {
      try {
        target.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleSelfPointerDown = React.useCallback((e: any) => {
    if (isLooterGameMode || !onSelfDragEnd) return;
    e.stopPropagation();
    e.sourceEvent?.stopPropagation?.();
    e.sourceEvent?.preventDefault?.();
    capturePointer(e);
    selfDragRef.current = {
      active: true,
      startClientX: e.sourceEvent?.clientX ?? 0,
      startClientY: e.sourceEvent?.clientY ?? 0,
      moved: false,
    };
    document.body.style.cursor = 'grabbing';
  }, [isLooterGameMode, onSelfDragEnd]);

  const handleSelfPointerMove = React.useCallback((e: any) => {
    const state = selfDragRef.current;
    if (!state.active || isLooterGameMode) return;
    e.stopPropagation();
    e.sourceEvent?.stopPropagation?.();
    const clientX = e.sourceEvent?.clientX ?? 0;
    const clientY = e.sourceEvent?.clientY ?? 0;
    const currentScale = scale.get();
    const dx = (clientX - state.startClientX) / currentScale;
    const dy = (clientY - state.startClientY) / currentScale;
    if (Math.abs(dx) + Math.abs(dy) > 4) state.moved = true;
    if (state.moved) { selfDragX.set(dx); selfDragY.set(dy); }
  }, [isLooterGameMode, scale, selfDragX, selfDragY]);

  const handleSelfPointerUp = React.useCallback((e: any) => {
    const state = selfDragRef.current;
    if (!state.active) return;
    e.stopPropagation();
    e.sourceEvent?.stopPropagation?.();
    releasePointer(e);
    state.active = false;
    document.body.style.cursor = state.moved ? 'auto' : 'pointer';
    if (state.moved && onSelfDragEnd) {
      const currentScale = scale.get();
      const currentPlaneYScale = planeYScale.get();
      const totalDx = selfDragX.get();
      const totalDy = selfDragY.get();
      const deltaLng = (totalDx / currentScale / MAP_PLANE_SCALE) / DEGREES_TO_PX;
      const deltaLat = (-totalDy / currentScale / currentPlaneYScale) / DEGREES_TO_PX;
      const newLat = (position?.[0] ?? 0) + deltaLat;
      const newLng = (position?.[1] ?? 0) + deltaLng;
      onSelfDragEnd(newLat, newLng);
    }
  }, [onSelfDragEnd, scale, planeYScale, selfDragX, selfDragY, position]);

  return { selfDragRef, handleSelfPointerDown, handleSelfPointerMove, handleSelfPointerUp };
}
