import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useMotionValue, animate, useTransform, useMotionValueEvent } from 'framer-motion';
import { useLooterState, useLooterActions } from '../looter-game/LooterGameContext';
import {
  CAMERA_FOV_DEGREES,
  CAMERA_ROTATE_DEFAULT_DEG,
  CAMERA_ROTATE_Y_DEFAULT_DEG,
  CAMERA_Z_DEFAULT,
  CAMERA_Z_NEAR,
  CAMERA_HEIGHT_OFFSET_DEFAULT,
  CAMERA_HEIGHT_RATIO_DEFAULT,
  CAMERA_TILT_FAR_DEGREES,
  DEGREES_TO_PX,
  MAP_PLANE_SCALE,
  ROADMAP_VISUAL_SCALE_DEFAULT,
  getDefaultVisualScaleForMapMode,
  getPerspectivePx,
  getCameraZForVisualScale,
  getPlaneYScaleFromTilt,
  getTiltAngleFromCameraZ,
  getVisualScaleFromCameraZ,
  type AlinMapMode,
} from '../constants';
import { getVisibleBoatCameraOffsets } from '../looter-game/utils/boatCameraFocus';

interface UseMapNavigationParams {
  initialMainTab: string;
  myObfPos: { lat: number; lng: number } | null;
  ws: React.MutableRefObject<WebSocket | null>;
  onTabChange?: (tab: string) => void;
  handleRefresh: () => void;
  requireAuth?: (actionLabel: string, afterLogin?: () => void) => boolean;
  user?: any;
}

export type MainTab = 'discover' | 'friends' | 'profile' | 'notifications' | 'backpack' | 'creator';

export function useMapNavigation({
  initialMainTab, myObfPos, ws, onTabChange, handleRefresh, requireAuth, user,
}: UseMapNavigationParams) {
  const looterState = useLooterState();
  const looterActions = useLooterActions();
  const {
    setIsLooterGameMode,
    initGame,
    loadWorldItems,
    setEncounter,
    setCombatResult,
    setShowCurseModal,
    setShowMinigame,
    setIsIntegratedStorageOpen,
    setIsItemDragging,
  } = looterActions;
  const { isLooterGameMode, isItemDragging, state: looterStateObj } = looterState;

  const initialPerspectivePx = getPerspectivePx(typeof window !== 'undefined' ? window.innerHeight : 720);
  const panX = useMotionValue(0);
  const panY = useMotionValue(0);
  const cameraZ = useMotionValue(CAMERA_Z_DEFAULT);
  const selfDragX = useMotionValue(0);
  const selfDragY = useMotionValue(0);

  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth >= 768);
  const [viewportHeight, setViewportHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 720);
  const [mainTab, setMainTab] = useState<MainTab>((initialMainTab as MainTab) === 'creator' ? 'discover' : (initialMainTab as MainTab) || 'discover');
  const [activeTab, setActiveTab] = useState<'info' | 'posts' | 'saved'>('posts');
  const [mapMode, setMapMode] = useState<AlinMapMode>('roadmap');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isBackpackLoading, setIsBackpackLoading] = useState(false);
  const [radius, setRadius] = useState(50);
  const [cameraHeightOffset, setCameraHeightOffset] = useState(CAMERA_HEIGHT_OFFSET_DEFAULT);
  const [cameraRotateDeg, setCameraRotateDeg] = useState(CAMERA_ROTATE_DEFAULT_DEG);
  const [cameraRotateYDeg, setCameraRotateYDeg] = useState(CAMERA_ROTATE_Y_DEFAULT_DEG);
  const cameraFov = useMotionValue(CAMERA_FOV_DEGREES);
  const [cameraFovValue, setCameraFovValue] = useState(CAMERA_FOV_DEGREES);
  useMotionValueEvent(cameraFov, 'change', (v: number) => setCameraFovValue(v));
  const [cameraPitchOverride, setCameraPitchOverride] = useState<number | null>(35); // default 35deg (góc 2.5D đẹp)
  const looterBootstrapRef = React.useRef(false);
  const pendingBoatFocusRef = useRef(false);
  const WHEEL_ZOOM_STEP = 300;
  const TRACKPAD_ZOOM_STEP = 150;

  const perspectivePxMotion = useTransform(cameraFov, (fov: number) => getPerspectivePx(viewportHeight, fov));
  const [perspectivePx, setPerspectivePx] = useState(() => getPerspectivePx(viewportHeight, CAMERA_FOV_DEGREES));
  useMotionValueEvent(perspectivePxMotion, 'change', (v: number) => setPerspectivePx(v));
  const scale = useTransform([cameraZ, perspectivePxMotion], ([z, p]: [number, number]) => getVisualScaleFromCameraZ(z, p));
  const effectiveTiltAngle = useMotionValue(CAMERA_TILT_FAR_DEGREES);
  const pitchOverrideRef = useRef<number | null>(null);
  pitchOverrideRef.current = cameraPitchOverride;

  // Sync effectiveTiltAngle: auto mode follows cameraZ, manual mode uses override
  const cameraZRef = useRef(cameraZ.get());
  useMotionValueEvent(cameraZ, 'change', (v) => {
    cameraZRef.current = v;
    if (pitchOverrideRef.current === null) {
      effectiveTiltAngle.set(getTiltAngleFromCameraZ(v));
    }
  });

  useEffect(() => {
    if (cameraPitchOverride !== null) {
      effectiveTiltAngle.set(cameraPitchOverride);
    } else {
      effectiveTiltAngle.set(getTiltAngleFromCameraZ(cameraZRef.current));
    }
  }, [cameraPitchOverride]);

  const planeYScale = useTransform(effectiveTiltAngle, getPlaneYScaleFromTilt);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
      setViewportHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Tự động mở bảng điều khiển khi có user được chọn
  useEffect(() => {
    if (selectedUser) {
      setIsSheetExpanded(true);
    }
  }, [selectedUser]);

  const lastInitialTabRef = React.useRef(initialMainTab);

  useEffect(() => {
    // Chỉ chạy logic đồng bộ nếu initialMainTab thực sự thay đổi từ bên ngoài (ví dụ: qua URL)
    if (initialMainTab && initialMainTab !== lastInitialTabRef.current) {
      const resolvedTab = initialMainTab === 'creator' ? 'discover' : initialMainTab;
      lastInitialTabRef.current = initialMainTab;
      
      setMainTab(prev => {
        if (prev !== resolvedTab && resolvedTab !== 'discover') {
            setIsSheetExpanded(true);
        } else if (isDesktop) {
            setIsSheetExpanded(true);
        }
        return resolvedTab as MainTab;
      });
    }
  }, [initialMainTab, isDesktop]);

  useEffect(() => {
    if (mainTab !== 'backpack') return;
    if (!isLooterGameMode) setIsLooterGameMode(true);
    if (looterStateObj.initialized || !myObfPos || looterBootstrapRef.current) return;

    looterBootstrapRef.current = true;
    setIsBackpackLoading(true);
    void (async () => {
      try {
        await initGame(myObfPos.lat, myObfPos.lng);
        await loadWorldItems(true);
      } finally {
        setIsBackpackLoading(false);
        looterBootstrapRef.current = false;
      }
    })();
  }, [mainTab, looterStateObj.initialized, isLooterGameMode, setIsLooterGameMode, initGame, loadWorldItems, myObfPos]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const currentZ = cameraZ.get();
    const step = e.deltaMode === 0 ? TRACKPAD_ZOOM_STEP : WHEEL_ZOOM_STEP;
    const nextZ = e.deltaY > 0
      ? currentZ - step
      : Math.min(currentZ + step, CAMERA_Z_NEAR);
    animate(cameraZ, nextZ, { type: 'spring', damping: 25, stiffness: 200, restDelta: 0.001 });
  }, [cameraZ]);

  const setCameraZ = useCallback((z: number) => {
    animate(cameraZ, z, { type: 'spring', damping: 25, stiffness: 200, restDelta: 0.001 });
  }, [cameraZ]);

  const zoomIn = useCallback(() => {
    setCameraZ(Math.min(cameraZ.get() + TRACKPAD_ZOOM_STEP, CAMERA_Z_NEAR));
  }, [cameraZ, setCameraZ]);

  const zoomOut = useCallback(() => {
    setCameraZ(cameraZ.get() - TRACKPAD_ZOOM_STEP);
  }, [cameraZ, setCameraZ]);

  const setVisualScale = useCallback((visualScale: number) => {
    setCameraZ(getCameraZForVisualScale(visualScale, perspectivePx));
  }, [perspectivePx, setCameraZ]);

  const handleCenter = useCallback(() => {
    animate(panX, 0, { duration: 1.6, ease: "easeInOut" });
    animate(panY, 0, { duration: 1.6, ease: "easeInOut" });
    const targetVisualScale = getDefaultVisualScaleForMapMode(mapMode, isLooterGameMode);
    animate(cameraZ, getCameraZForVisualScale(targetVisualScale, perspectivePx), { duration: 1.6, ease: "easeInOut" });
  }, [panX, panY, cameraZ, mapMode, isLooterGameMode, perspectivePx]);

  const handleCenterTo = useCallback((lat: number, lng: number, yOffsetPx: number = 0) => {
    if (!myObfPos) return;
    const pxX = (lng - myObfPos.lng) * DEGREES_TO_PX;
    const pxY = -(lat - myObfPos.lat) * DEGREES_TO_PX;
    animate(panX, -pxX * MAP_PLANE_SCALE, { duration: 3.0, ease: "easeInOut" });
    // Reverse yOffsetPx sign: subtract to push the boat UP on screen when sheet is open
    animate(panY, -pxY * planeYScale.get() - yOffsetPx, { duration: 3.0, ease: "easeInOut" });
  }, [myObfPos, panX, panY, planeYScale]);

  const requestBoatAutoFocus = useCallback(() => {
    pendingBoatFocusRef.current = true;
  }, []);

  useEffect(() => {
    if (!pendingBoatFocusRef.current) return;
    if (mainTab !== 'backpack' || !isSheetExpanded) return;

    const targetLat = looterStateObj.currentLat ?? myObfPos?.lat;
    const targetLng = looterStateObj.currentLng ?? myObfPos?.lng;
    if (targetLat == null || targetLng == null) return;

    const timer = window.setTimeout(() => {
      const effectivePitch = cameraPitchOverride ?? getTiltAngleFromCameraZ(cameraZ.get());
      const { xOffset, yOffset } = getVisibleBoatCameraOffsets({
        cameraZ: cameraZ.get(),
        perspectivePx,
        tiltDeg: effectivePitch,
      });
      looterActions.centerOnBoat(yOffset, xOffset);
      pendingBoatFocusRef.current = false;
    }, 140);

    return () => window.clearTimeout(timer);
  }, [
    mainTab,
    isSheetExpanded,
    looterStateObj.currentLat,
    looterStateObj.currentLng,
    myObfPos,
    looterActions.centerOnBoat,
    cameraPitchOverride,
    cameraZ,
    perspectivePx,
  ]);

  const handleUpdateRadius = useCallback((newRadius: number) => {
    setRadius(newRadius);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'UPDATE_RADIUS', payload: { radiusKm: newRadius } }));
      setTimeout(handleRefresh, 500);
    }
  }, [ws, handleRefresh]);

  const handleTabClick = useCallback((tabId: string) => {
    if (isItemDragging) {
      setIsItemDragging(false);
    }

    setSelectedUser(null);
    if (tabId === 'profile') setActiveTab('posts');

    if (mainTab === tabId) {
      if (tabId === 'backpack') {
        setIsLooterGameMode(true);
        const nextIsExpanded = !isSheetExpanded;
        setIsSheetExpanded(nextIsExpanded);
        if (nextIsExpanded) requestBoatAutoFocus();
        else pendingBoatFocusRef.current = false;
      } else {
        setIsSheetExpanded((prev) => !prev);
      }
      return;
    }

    if (tabId === 'creator') {
        setMainTab('discover');
        setIsSheetExpanded(true);
        onTabChange?.('discover');
        return;
    }

    if (tabId === 'backpack') {
      setMainTab('backpack');
      setIsLooterGameMode(true);
      setIsSheetExpanded(true);
      requestBoatAutoFocus();
    } else {
      setShowMinigame(null);
      setEncounter(null);
      setCombatResult(null);
      setShowCurseModal(false);
      setIsIntegratedStorageOpen(false);
      setIsLooterGameMode(false);
      pendingBoatFocusRef.current = false;
      setMainTab(tabId as MainTab);
      setIsSheetExpanded(true);
    }

    onTabChange?.(tabId);
  }, [
    mainTab,
    myObfPos,
    looterStateObj,
    isItemDragging,
    requireAuth,
    user,
    onTabChange,
    setIsLooterGameMode,
    initGame,
    loadWorldItems,
    setShowMinigame,
    setEncounter,
    setCombatResult,
    setShowCurseModal,
    setIsIntegratedStorageOpen,
    setIsItemDragging,
    requestBoatAutoFocus,
    isSheetExpanded,
  ]);

  return {
    panX, panY, scale, cameraZ, effectiveTiltAngle, planeYScale, perspectivePx, selfDragX, selfDragY,
    cameraHeightOffset, cameraRotateDeg, cameraPitchOverride, cameraRotateYDeg, cameraFov: cameraFovValue,
    isSheetExpanded, setIsSheetExpanded,
    isDesktop, mainTab, setMainTab: (tab: string) => setMainTab(tab as MainTab),
    activeTab, setActiveTab,
    mapMode, setMapMode,
    selectedUser, setSelectedUser,
    radius, setRadius,
    isBackpackLoading, setIsBackpackLoading,
    handleWheel, handleCenter, handleCenterTo,
    setCameraZ, setVisualScale, zoomIn, zoomOut,
    setCameraHeightOffset: (v: number) => setCameraHeightOffset(v),
    setCameraRotateDeg: (v: number) => setCameraRotateDeg(v),
    setCameraPitchOverride: (v: number | null) => {
      if (v === null) setCameraPitchOverride(null);
      else setCameraPitchOverride(v);
    },
    setCameraRotateYDeg: (v: number) => setCameraRotateYDeg(v),
    setCameraFov: (v: number) => {
      cameraFov.set(v);
    },
    handleUpdateRadius, handleTabClick,
    requestBoatAutoFocus,
  };
}
