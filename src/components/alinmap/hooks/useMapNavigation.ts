import React, { useState, useEffect, useCallback } from 'react';
import { useMotionValue, animate } from 'framer-motion';

interface UseMapNavigationParams {
  initialMainTab: string;
  myObfPos: { lat: number; lng: number } | null;
  ws: React.MutableRefObject<WebSocket | null>;
  looterState: any;
  looterGame: any;
  onTabChange?: (tab: string) => void;
  handleRefresh: () => void;
  requireAuth?: (actionLabel: string, afterLogin?: () => void) => boolean;
  user?: any;
}

export type MainTab = 'discover' | 'friends' | 'profile' | 'notifications' | 'backpack';

export function useMapNavigation({
  initialMainTab, myObfPos, ws, looterState, looterGame, onTabChange, handleRefresh, requireAuth, user,
}: UseMapNavigationParams) {
  const { setIsLooterGameMode, isLooterGameMode, initGame, loadWorldItems } = looterGame;

  const panX = useMotionValue(0);
  const panY = useMotionValue(0);
  const scale = useMotionValue(1);
  const selfDragX = useMotionValue(0);
  const selfDragY = useMotionValue(0);

  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth >= 768);
  const [mainTab, setMainTab] = useState<MainTab>((initialMainTab as MainTab) === 'creator' ? 'discover' : (initialMainTab as MainTab) || 'discover');
  const [activeTab, setActiveTab] = useState<'info' | 'posts' | 'saved'>('posts');
  const [mapMode, setMapMode] = useState<'grid' | 'satellite'>('grid');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isLooterLoading, setIsSeaLoading] = useState(false);
  const [radius, setRadius] = useState(50);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (initialMainTab) {
      const resolvedTab = initialMainTab === 'creator' ? 'discover' : initialMainTab;
      
      setMainTab(prev => {
        // Không tự động co lại khi chuyển sang discover để tránh hiệu ứng giật
        if (prev !== resolvedTab && resolvedTab !== 'discover') {
            setIsSheetExpanded(true);
        } else if (isDesktop) {
            setIsSheetExpanded(true);
        }
        return resolvedTab as MainTab;
      });
    }
  }, [initialMainTab, isDesktop, user]);

  useEffect(() => {
    if (mainTab === 'backpack' && looterState.initialized && !isLooterGameMode) {
      setIsLooterGameMode(true);
    }
  }, [mainTab, looterState.initialized, isLooterGameMode, setIsLooterGameMode]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const currentScale = scale?.get?.() ?? 1;
    const newScale = Math.min(Math.max(0.02, currentScale + delta * currentScale), 5);
    animate(scale, newScale, { type: 'spring', damping: 25, stiffness: 200, restDelta: 0.001 });
  }, [scale]);

  const handleCenter = useCallback(() => {
    animate(panX, 0, { duration: 0.8, ease: "easeInOut" });
    animate(panY, 0, { duration: 0.8, ease: "easeInOut" });
    animate(scale, 1, { duration: 0.8, ease: "easeInOut" });
  }, [panX, panY, scale]);

  const handleCenterTo = useCallback((lat: number, lng: number) => {
    if (!myObfPos) return;
    const DEGREES_TO_PX = 11100;
    const pxX = (lng - myObfPos.lng) * DEGREES_TO_PX;
    const pxY = -(lat - myObfPos.lat) * DEGREES_TO_PX;
    animate(panX, -pxX, { duration: 1.5, ease: "easeInOut" });
    animate(panY, -pxY, { duration: 1.5, ease: "easeInOut" });
  }, [myObfPos, panX, panY]);

  const handleUpdateRadius = useCallback((newRadius: number) => {
    setRadius(newRadius);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'UPDATE_RADIUS', payload: { radiusKm: newRadius } }));
      setTimeout(handleRefresh, 500);
    }
  }, [ws, handleRefresh]);

  const handleTabClick = useCallback((tabId: string) => {
    // Prevent toggling sheet if currently dragging an item (fixes click-through bug)
    const { isItemDragging } = looterGame;
    if (isItemDragging) return;

    setSelectedUser(null);
    if (tabId === 'profile') setActiveTab('info');

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
        if (!looterState.initialized && myObfPos) {
          await initGame(myObfPos.lat, myObfPos.lng);
        }
        await loadWorldItems(true);
      };
      void doLoad();

      const targetLat = looterState.currentLat ?? myObfPos?.lat;
      const targetLng = looterState.currentLng ?? myObfPos?.lng;
      if (targetLat != null && targetLng != null) handleCenterTo(targetLat, targetLng);
    } else {
      setIsLooterGameMode(false);
      setMainTab(tabId as MainTab);
      setIsSheetExpanded(true);
    }

    onTabChange?.(tabId);
  }, [mainTab, myObfPos, looterState, requireAuth, user, onTabChange, setIsLooterGameMode, initGame, loadWorldItems, handleCenterTo]);

  return {
    panX, panY, scale, selfDragX, selfDragY,
    isSheetExpanded, setIsSheetExpanded,
    isDesktop, mainTab, setMainTab,
    activeTab, setActiveTab,
    mapMode, setMapMode,
    selectedUser, setSelectedUser,
    radius, setRadius,
    isLooterLoading, setIsSeaLoading,
    handleWheel, handleCenter, handleCenterTo,
    handleUpdateRadius, handleTabClick,
  };
}
