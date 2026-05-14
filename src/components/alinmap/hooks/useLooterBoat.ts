import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { animate, useMotionValue, MotionValue } from 'framer-motion';
import { DEGREES_TO_PX, MAP_PLANE_SCALE, CAMERA_HEIGHT_RATIO_DEFAULT } from '../constants';
import { useLooterState, useLooterActions } from '../looter-game/LooterGameContext';
import { useBoatAnimation } from '../looter-game/hooks/useBoatAnimation';
import { getDistanceMeters } from '../looter-game/backpack/utils';
import { MAP_COORD_SCENE_SCALE } from '../three/sceneUtils';
import { clamp as clampVal } from '../constants';

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
        curseAnimationRef.current?.stop();
        curseAnimationRef.current = null;
        setBoatTargetPin(null);
        onArrivalActionRef.current = null;
    }, [stopAllAnimations]);

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
                    centerOnCombat();
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

    }, [isLooterGameMode, looterState, looterActions, myObfPos, boatOffsetX, boatOffsetY, showNotification, setIsTierSelectorOpen, animateBoatTo, curseVisual, isAnimatingRef, centerOnCombat, stopAllAnimations]);

    /**
     * Chuyển đổi click trên màn hình (offsetX, offsetY từ tâm container) → (lat, lng) trên map.
     * Dùng phép chiếu ray-plane intersection chính xác trong không gian 3D,
     * tính đến vị trí camera (H, D), góc tilt θ, và FOV 46° của perspective camera.
     */
    const screenToWorld = useCallback((offsetX: number, offsetY: number, containerW: number, containerH: number) => {
        if (!myObfPos) return null;
        const safeW = Math.max(containerW || 1, 1);
        const safeH = Math.max(containerH || 1, 1);

        // 1. Vị trí camera (H, D) — đồng bộ chuẩn với CameraRig
        const zoom = clampVal(scale?.get?.() ?? 1, 0.08, 8);
        const D = clampVal(perspectivePx * 0.56 / zoom, 140, 9000); // Sửa 95 -> 140 (minDistance)
        const baseHeight = D * CAMERA_HEIGHT_RATIO_DEFAULT;
        const H = baseHeight + cameraHeightOffset;

        // 2. Góc tilt θ = acos(planeYScale / MAP_PLANE_SCALE)
        const curPlaneYScale = planeYScale.get();
        const cosTheta = clampVal(curPlaneYScale / MAP_PLANE_SCALE, 0.001, 1);
        const theta = Math.acos(cosTheta);

        // 3. Ray-plane intersection
        // β = 2·tan(FOV/2) / containerHeight
        const cameraFovRad = (clampVal(cameraFov || 46, 20, 110) * Math.PI) / 180;
        const beta = 2 * Math.tan(cameraFovRad / 2) / safeH;
        const L = Math.sqrt(baseHeight * baseHeight + D * D); // Fix: Sử dụng baseHeight thay vì H để tìm hướng quang trục
        
        const S_dir = baseHeight * Math.cos(theta) + D * Math.sin(theta);
        const K_dir = baseHeight * Math.sin(theta) - D * Math.cos(theta);
        
        const denom_pos = S_dir - offsetY * beta * K_dir;
        if (denom_pos < 1e-8) return null; // ray song song hoặc hướng lên trời

        const Num = H * Math.cos(theta) + D * Math.sin(theta);
        const t = (Num * L) / denom_pos;

        // Giao điểm trong world space
        const Px = t * beta * offsetX;
        const Pz = D + t * (-D + offsetY * beta * baseHeight) / L; // Fix: Công thức Pz theo chuẩn vector nhìn của camera

        // Chuyển về ground-local (trừ đi pan offset)
        const curPanX = panX?.get?.() ?? 0;
        const curPanY = panY?.get?.() ?? 0;
        const xGround = Px - curPanX * MAP_COORD_SCENE_SCALE;
        const zGround = Pz / Math.cos(theta) - curPanY * MAP_COORD_SCENE_SCALE;

        // Chuyển sang lat/lng
        const COORD_SCALE = DEGREES_TO_PX * MAP_PLANE_SCALE * MAP_COORD_SCENE_SCALE;
        const lng = myObfPos.lng + xGround / COORD_SCALE;
        const lat = myObfPos.lat - zGround / COORD_SCALE;

        return { lat, lng, debug: { zoom, H, baseHeight, D, theta, beta, L, S_dir, K_dir, denom_pos, Num, t, Px, Pz, xGround, zGround } };
    }, [myObfPos, scale, planeYScale, panX, panY, perspectivePx, cameraFov, cameraHeightOffset]);

    const handleMapDoubleClick = useCallback((offsetX: number, offsetY: number, containerRect?: DOMRect) => {
        if (!isLooterGameMode || !myObfPos) return;
        const cw = containerRect?.width ?? window.innerWidth;
        const ch = containerRect?.height ?? window.innerHeight;
        const result = screenToWorld(offsetX, offsetY, cw, ch);
        if (!result) return;
        executeMoveToExact(result.lat, result.lng, 'map');
    }, [isLooterGameMode, myObfPos, screenToWorld, executeMoveToExact, state?.currentLat, state?.currentLng]);

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
        // Dùng bounding rect của map container thay vì window center
        // để tránh sai lệch khi mở tab/bottom sheet
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        handleMapDoubleClick(e.clientX - centerX, e.clientY - centerY, rect);
        pointerDownRef.current = null;
    };

    const handlePointerCancel = () => {
        pointerDownRef.current = null;
    };

    return useMemo(() => ({
        boatOffsetX, boatOffsetY, curseVisual,
        boatTargetPin, setOnArrivalAction,
        handlePointerDown, handlePointerUp, handlePointerCancel,
        handleMapDoubleClick, executeMoveToExact, stopBoat, centerOnBoat, centerOnCombat, stopPanFollow,
        cancelBoatMovement
    }), [
        boatOffsetX, boatOffsetY, curseVisual,
        boatTargetPin, setOnArrivalAction,
        handlePointerDown, handlePointerUp, handlePointerCancel,
        handleMapDoubleClick, executeMoveToExact, stopBoat, centerOnBoat, centerOnCombat, stopPanFollow,
        cancelBoatMovement
    ]);
}
