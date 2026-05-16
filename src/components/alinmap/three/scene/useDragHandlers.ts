import React, { useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { MotionValue } from 'framer-motion';
import { DEGREES_TO_PX, MAP_PLANE_SCALE } from '../../constants';
import type { LatLng } from '../sceneUtils';

interface DragHandlersParams {
  isLooterGameMode: boolean;
  basePosition: LatLng;
  scale: MotionValue<number>;
  selfDragX: MotionValue<number>;
  selfDragY: MotionValue<number>;
  onSelfDragEnd?: (newLat: number, newLng: number) => void;
}

interface SelfDragState {
  active: boolean;
  pointerId: number | null;
  startClientX: number;
  startClientY: number;
  lastClientX: number;
  lastClientY: number;
  startLat: number;
  startLng: number;
  moved: boolean;
}

interface WindowDragListeners {
  move: (event: PointerEvent) => void;
  up: (event: PointerEvent) => void;
  cancel: (event: PointerEvent) => void;
}

const DRAG_THRESHOLD_PX = 4;
const DRAG_FOLLOW_MULTIPLIER = 15;

export function useDragHandlers(params: DragHandlersParams) {
  const { isLooterGameMode, basePosition, scale, selfDragX, selfDragY, onSelfDragEnd } = params;

  const selfDragRef = useRef<SelfDragState>({
    active: false,
    pointerId: null,
    startClientX: 0,
    startClientY: 0,
    lastClientX: 0,
    lastClientY: 0,
    startLat: basePosition.lat,
    startLng: basePosition.lng,
    moved: false,
  });
  const windowDragListenersRef = useRef<WindowDragListeners | null>(null);

  const cleanupWindowDragListeners = React.useCallback(() => {
    const listeners = windowDragListenersRef.current;
    if (!listeners) return;
    window.removeEventListener('pointermove', listeners.move);
    window.removeEventListener('pointerup', listeners.up);
    window.removeEventListener('pointercancel', listeners.cancel);
    windowDragListenersRef.current = null;
  }, []);

  const updateDragOffset = React.useCallback((clientX: number, clientY: number) => {
    const state = selfDragRef.current;
    const screenDx = clientX - state.startClientX;
    const screenDy = clientY - state.startClientY;
    const currentScale = Math.max(scale.get(), 0.001);
    const dragX = (screenDx / currentScale) * DRAG_FOLLOW_MULTIPLIER;
    const dragY = (screenDy / currentScale) * DRAG_FOLLOW_MULTIPLIER;

    state.lastClientX = clientX;
    state.lastClientY = clientY;

    if (Math.hypot(screenDx, screenDy) > DRAG_THRESHOLD_PX) {
      state.moved = true;
    }

    if (state.moved) {
      selfDragX.set(dragX);
      selfDragY.set(dragY);
    }
  }, [scale, selfDragX, selfDragY]);

  const finishDrag = React.useCallback((clientX?: number, clientY?: number) => {
    const state = selfDragRef.current;
    if (!state.active) return;

    if (typeof clientX === 'number' && typeof clientY === 'number') {
      updateDragOffset(clientX, clientY);
    }

    state.active = false;
    cleanupWindowDragListeners();
    document.body.style.cursor = state.moved ? 'auto' : 'pointer';

    if (!state.moved || !onSelfDragEnd) return;

    const totalDx = selfDragX.get();
    const totalDy = selfDragY.get();
    const deltaLng = totalDx / MAP_PLANE_SCALE / DEGREES_TO_PX;
    const deltaLat = -totalDy / MAP_PLANE_SCALE / DEGREES_TO_PX;
    onSelfDragEnd(state.startLat + deltaLat, state.startLng + deltaLng);
  }, [cleanupWindowDragListeners, onSelfDragEnd, selfDragX, selfDragY, updateDragOffset]);

  const handleWindowPointerMove = React.useCallback((event: PointerEvent) => {
    const state = selfDragRef.current;
    if (!state.active || state.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    updateDragOffset(event.clientX, event.clientY);
  }, [updateDragOffset]);

  const handleWindowPointerUp = React.useCallback((event: PointerEvent) => {
    const state = selfDragRef.current;
    if (!state.active || state.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    finishDrag(event.clientX, event.clientY);
  }, [finishDrag]);

  const handleWindowPointerCancel = React.useCallback((event: PointerEvent) => {
    const state = selfDragRef.current;
    if (!state.active || state.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    selfDragX.set(0);
    selfDragY.set(0);
    state.active = false;
    cleanupWindowDragListeners();
    document.body.style.cursor = 'auto';
  }, [cleanupWindowDragListeners, selfDragX, selfDragY]);

  React.useEffect(() => cleanupWindowDragListeners, [cleanupWindowDragListeners]);

  const handleSelfPointerDown = React.useCallback((e: ThreeEvent<PointerEvent>) => {
    if (isLooterGameMode || !onSelfDragEnd) return;
    e.stopPropagation();
    e.nativeEvent.stopPropagation();
    e.nativeEvent.preventDefault();

    cleanupWindowDragListeners();
    selfDragRef.current = {
      active: true,
      pointerId: e.nativeEvent.pointerId,
      startClientX: e.nativeEvent.clientX,
      startClientY: e.nativeEvent.clientY,
      lastClientX: e.nativeEvent.clientX,
      lastClientY: e.nativeEvent.clientY,
      startLat: basePosition.lat,
      startLng: basePosition.lng,
      moved: false,
    };
    selfDragX.set(0);
    selfDragY.set(0);
    const listeners: WindowDragListeners = {
      move: handleWindowPointerMove,
      up: handleWindowPointerUp,
      cancel: handleWindowPointerCancel,
    };
    windowDragListenersRef.current = listeners;
    window.addEventListener('pointermove', listeners.move, { passive: false });
    window.addEventListener('pointerup', listeners.up, { passive: false });
    window.addEventListener('pointercancel', listeners.cancel, { passive: false });
    document.body.style.cursor = 'grabbing';
  }, [
    basePosition.lat,
    basePosition.lng,
    cleanupWindowDragListeners,
    handleWindowPointerCancel,
    handleWindowPointerMove,
    handleWindowPointerUp,
    isLooterGameMode,
    onSelfDragEnd,
    selfDragX,
    selfDragY,
  ]);

  const handleSelfPointerMove = React.useCallback((e: ThreeEvent<PointerEvent>) => {
    const state = selfDragRef.current;
    if (!state.active || isLooterGameMode) return;
    e.stopPropagation();
    e.nativeEvent.stopPropagation();
    updateDragOffset(e.nativeEvent.clientX, e.nativeEvent.clientY);
  }, [isLooterGameMode, updateDragOffset]);

  const handleSelfPointerUp = React.useCallback((e: ThreeEvent<PointerEvent>) => {
    const state = selfDragRef.current;
    if (!state.active) return;
    e.stopPropagation();
    e.nativeEvent.stopPropagation();
    finishDrag(e.nativeEvent.clientX, e.nativeEvent.clientY);
  }, [finishDrag]);

  return { selfDragRef, handleSelfPointerDown, handleSelfPointerMove, handleSelfPointerUp };
}
