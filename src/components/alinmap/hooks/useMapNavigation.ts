import React, { useState, useEffect, useCallback } from 'react';
import { useMotionValue, animate, useTransform } from 'framer-motion';
import { useLooterState, useLooterActions } from '../looter-game/LooterGameContext';
import {
  CAMERA_Z_DEFAULT,
  CAMERA_Z_FAR,
  CAMERA_Z_NEAR,
  CAMERA_HEIGHT_DEFAULT_PCT,
  CAMERA_HEIGHT_MIN_PCT,
  CAMERA_HEIGHT_MAX_PCT,
  CAMERA_ROTATE_DEFAULT_DEG,
  CAMERA_ROTATE_MIN_DEG,
  CAMERA_ROTATE_MAX_DEG,
  CAMERA_ROTATE_X_DEFAULT_DEG,
  CAMERA_ROTATE_X_MIN_DEG,
  CAMERA_ROTATE_X_MAX_DEG,
  CAMERA_ROTATE_Y_DEFAULT_DEG,
  CAMERA_ROTATE_Y_MIN_DEG,
  CAMERA_ROTATE_Y_MAX_DEG,
  DEGREES_TO_PX,
  MAP_PLANE_SCALE,
  clamp,
  getPerspectivePx,
  getCameraZForVisualScale,
  getPlaneYScaleFromTilt,
  getTiltAngleFromCameraZ,
  getVisualScaleFromCameraZ,
} from '../constants';

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
  const { setIsLooterGameMode, initGame, loadWorldItems } = looterActions;
  const { isLooterGameMode, isItemDragging, state: looterStateObj } = looterState;

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
  const [mapMode, setMapMode] = useState<'grid' | 'satellite'>('grid');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isLooterLoading, setIsSeaLoading] = useState(false);
  const [radius, setRadius] = useState(50);
  const [cameraHeightPct, setCameraHeightPct] = useState(CAMERA_HEIGHT_DEFAULT_PCT);
  const [cameraRotateDeg, setCameraRotateDeg] = useState(CAMERA_ROTATE_DEFAULT_DEG);
  const [cameraRotateXDeg, setCameraRotateXDeg] = useState(CAMERA_ROTATE_X_DEFAULT_DEG);
  const [cameraRotateYDeg, setCameraRotateYDeg] = useState(CAMERA_ROTATE_Y_DEFAULT_DEG);

  const perspectivePx = getPerspectivePx(viewportHeight);
  const scale = useTransform(cameraZ, (z) => getVisualScaleFromCameraZ(z, perspectivePx));
  const tiltAngle = useTransform(cameraZ, getTiltAngleFromCameraZ);
  const planeYScale = useTransform(tiltAngle, getPlaneYScaleFromTilt);

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
    if (mainTab === 'backpack' && looterStateObj.initialized && !isLooterGameMode) {
      setIsLooterGameMode(true);
    }
  }, [mainTab, looterStateObj.initialized, isLooterGameMode, setIsLooterGameMode]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const currentZ = cameraZ.get();
    const nextZ = Math.min(CAMERA_Z_NEAR, currentZ + (e.deltaY > 0 ? -5 : 5));
    animate(cameraZ, nextZ, { type: 'spring', damping: 25, stiffness: 200, restDelta: 0.001 });
  }, [cameraZ]);

  const setCameraZ = useCallback((z: number) => {
    animate(cameraZ, Math.min(CAMERA_Z_NEAR, z), { type: 'spring', damping: 25, stiffness: 200, restDelta: 0.001 });
  }, [cameraZ]);

  const zoomIn = useCallback(() => {
    setCameraZ(cameraZ.get() + 5);
  }, [cameraZ, setCameraZ]);

  const zoomOut = useCallback(() => {
    setCameraZ(cameraZ.get() - 5);
  }, [cameraZ, setCameraZ]);

  const setVisualScale = useCallback((visualScale: number) => {
    setCameraZ(getCameraZForVisualScale(visualScale, perspectivePx));
  }, [perspectivePx, setCameraZ]);

  const handleCenter = useCallback(() => {
    animate(panX, 0, { duration: 0.8, ease: "easeInOut" });
    animate(panY, 0, { duration: 0.8, ease: "easeInOut" });
    animate(cameraZ, CAMERA_Z_DEFAULT, { duration: 0.8, ease: "easeInOut" });
  }, [panX, panY, cameraZ]);

  const handleCenterTo = useCallback((lat: number, lng: number, yOffsetPx: number = 0) => {
    if (!myObfPos) return;
    const pxX = (lng - myObfPos.lng) * DEGREES_TO_PX;
    const pxY = -(lat - myObfPos.lat) * DEGREES_TO_PX;
    animate(panX, -pxX * MAP_PLANE_SCALE, { duration: 1.5, ease: "easeInOut" });
    // Reverse yOffsetPx sign: subtract to push the boat UP on screen when sheet is open
    animate(panY, -pxY * planeYScale.get() - yOffsetPx, { duration: 1.5, ease: "easeInOut" });
  }, [myObfPos, panX, panY, planeYScale]);

  const handleUpdateRadius = useCallback((newRadius: number) => {
    setRadius(newRadius);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'UPDATE_RADIUS', payload: { radiusKm: newRadius } }));
      setTimeout(handleRefresh, 500);
    }
  }, [ws, handleRefresh]);

  const handleTabClick = useCallback((tabId: string) => {
    if (isItemDragging) return;

    setSelectedUser(null);
    if (tabId === 'profile') setActiveTab('posts');

    if (mainTab === tabId) {
      setIsSheetExpanded((prev) => !prev);
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

      const doLoad = async () => {
        if (!looterStateObj.initialized && myObfPos) {
          await initGame(myObfPos.lat, myObfPos.lng);
        }
        await loadWorldItems(true);
      };
      void doLoad();

      const targetLat = looterStateObj.currentLat ?? myObfPos?.lat;
      const targetLng = looterStateObj.currentLng ?? myObfPos?.lng;
      if (targetLat != null && targetLng != null) {
        setTimeout(() => {
          const backpack = document.getElementById('looter-backpack-container');
          const backpackTop = backpack ? backpack.getBoundingClientRect().top : window.innerHeight;
          const visibleMapHeight = Math.max(120, backpack ? backpackTop : window.innerHeight);
          const yOffset = backpack ? (window.innerHeight / 2) - (visibleMapHeight / 2) : 0;
          handleCenterTo(targetLat, targetLng, yOffset);
        }, 120);
      }
    } else {
      setIsLooterGameMode(false);
      setMainTab(tabId as MainTab);
      setIsSheetExpanded(true);
    }

    onTabChange?.(tabId);
  }, [mainTab, myObfPos, looterStateObj, isItemDragging, requireAuth, user, onTabChange, setIsLooterGameMode, initGame, loadWorldItems, handleCenterTo]);

  return {
    panX, panY, scale, cameraZ, tiltAngle, planeYScale, perspectivePx, selfDragX, selfDragY,
    cameraHeightPct, cameraRotateDeg, cameraRotateXDeg, cameraRotateYDeg,
    isSheetExpanded, setIsSheetExpanded,
    isDesktop, mainTab, setMainTab: (tab: string) => setMainTab(tab as MainTab),
    activeTab, setActiveTab,
    mapMode, setMapMode,
    selectedUser, setSelectedUser,
    radius, setRadius,
    isLooterLoading, setIsSeaLoading,
    handleWheel, handleCenter, handleCenterTo,
    setCameraZ, setVisualScale, zoomIn, zoomOut,
    setCameraHeightPct: (v: number) => setCameraHeightPct(clamp(v, CAMERA_HEIGHT_MIN_PCT, CAMERA_HEIGHT_MAX_PCT)),
    setCameraRotateDeg: (v: number) => setCameraRotateDeg(clamp(v, CAMERA_ROTATE_MIN_DEG, CAMERA_ROTATE_MAX_DEG)),
    setCameraRotateXDeg: (v: number) => setCameraRotateXDeg(clamp(v, CAMERA_ROTATE_X_MIN_DEG, CAMERA_ROTATE_X_MAX_DEG)),
    setCameraRotateYDeg: (v: number) => setCameraRotateYDeg(clamp(v, CAMERA_ROTATE_Y_MIN_DEG, CAMERA_ROTATE_Y_MAX_DEG)),
    handleUpdateRadius, handleTabClick,
  };
}
