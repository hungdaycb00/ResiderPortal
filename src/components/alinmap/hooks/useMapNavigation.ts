import React, { useState, useEffect, useCallback } from 'react';
import { useMotionValue, animate, MotionValue } from 'framer-motion';

interface UseMapNavigationParams {
  initialMainTab: string;
  myObfPos: { lat: number; lng: number } | null;
  ws: React.MutableRefObject<WebSocket | null>;
  seaState: any;
  seaGame: any;
  onTabChange?: (tab: string) => void;
  handleRefresh: () => void;
}

export type MainTab = 'discover' | 'friends' | 'profile' | 'notifications' | 'creator' | 'backpack';

export function useMapNavigation({
  initialMainTab, myObfPos, ws, seaState, seaGame, onTabChange, handleRefresh,
}: UseMapNavigationParams) {
  const { setIsSeaGameMode, isSeaGameMode, initGame, loadWorldItems } = seaGame;

  const panX = useMotionValue(0);
  const panY = useMotionValue(0);
  const scale = useMotionValue(1);
  const selfDragX = useMotionValue(0);
  const selfDragY = useMotionValue(0);

  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth >= 768);
  const [mainTab, setMainTab] = useState<MainTab>((initialMainTab as MainTab) || 'discover');
  const [activeTab, setActiveTab] = useState<'info' | 'posts' | 'saved'>('posts');
  const [mapMode, setMapMode] = useState<'grid' | 'satellite'>('grid');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isSeaLoading, setIsSeaLoading] = useState(false);
  const [radius, setRadius] = useState(5);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (initialMainTab) {
      setMainTab(initialMainTab as MainTab);
      setIsSheetExpanded(true);
    }
  }, [initialMainTab]);

  useEffect(() => {
    if (mainTab === 'backpack' && seaState.initialized && !isSeaGameMode) {
      setIsSeaGameMode(true);
    }
  }, [mainTab, seaState.initialized, isSeaGameMode, setIsSeaGameMode]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const currentScale = scale.get();
    const newScale = Math.min(Math.max(0.02, currentScale + delta * currentScale), 5);
    animate(scale, newScale, { type: "spring", damping: 25, stiffness: 200, restDelta: 0.001 });
  }, [scale]);

  const handleCenter = useCallback(() => { panX.set(0); panY.set(0); scale.set(1); }, [panX, panY, scale]);

  const handleCenterTo = useCallback((lat: number, lng: number) => {
    if (!myObfPos) return;
    const DEGREES_TO_PX = 11100;
    const pxX = (lng - myObfPos.lng) * DEGREES_TO_PX;
    const pxY = -(lat - myObfPos.lat) * DEGREES_TO_PX;
    panX.set(-pxX);
    panY.set(-pxY);
  }, [myObfPos, panX, panY]);

  const handleUpdateRadius = useCallback((newRadius: number) => {
    setRadius(newRadius);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'UPDATE_RADIUS', payload: { radiusKm: newRadius } }));
      setTimeout(handleRefresh, 500);
    }
  }, [ws, handleRefresh]);

  const handleTabClick = useCallback((tabId: string) => {
    setSelectedUser(null);
    if (tabId === 'profile') { setActiveTab('info'); }

    if (tabId === 'backpack') {
      if (mainTab === 'backpack') {
        setIsSheetExpanded(prev => !prev);
      } else {
        setMainTab('backpack');
        setIsSeaGameMode(true);
        setIsSheetExpanded(true);
        setIsSeaLoading(true);

        const doLoad = async () => {
          try {
            if (!seaState.initialized && myObfPos) {
              await initGame(myObfPos.lat, myObfPos.lng);
            }
            await loadWorldItems();
          } finally {
            setIsSeaLoading(false);
          }
        };
        doLoad();

        const targetLat = seaState.currentLat || myObfPos?.lat;
        const targetLng = seaState.currentLng || myObfPos?.lng;
        if (targetLat && targetLng) {
          handleCenterTo(targetLat, targetLng);
        }
      }
    } else {
      setIsSeaGameMode(false);
      if (mainTab === tabId) {
        setIsSheetExpanded(prev => !prev);
      } else {
        setMainTab(tabId as MainTab);
        setIsSheetExpanded(true);
      }
    }

    if (onTabChange) onTabChange(tabId);
  }, [mainTab, seaState, myObfPos, isSeaGameMode, setIsSeaGameMode, initGame, loadWorldItems, handleCenterTo, onTabChange]);

  return {
    panX, panY, scale, selfDragX, selfDragY,
    isSheetExpanded, setIsSheetExpanded,
    isDesktop, mainTab, setMainTab,
    activeTab, setActiveTab,
    mapMode, setMapMode,
    selectedUser, setSelectedUser,
    radius, setRadius,
    isSeaLoading, setIsSeaLoading,
    handleWheel, handleCenter, handleCenterTo,
    handleUpdateRadius, handleTabClick,
  };
}
