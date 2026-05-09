import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getBaseUrl } from '../../services/externalApi';
import { extractExploreGame } from '../../utils/routing';
import MapCanvas from './MapCanvas';
import AlinMapUiOverlay from './AlinMapUiOverlay';
import { AlinMapProps, DEGREES_TO_PX, MAP_PLANE_SCALE } from './constants';
import { ProfileProvider } from './features/profile/context/ProfileContext';
import { usePosts } from './features/profile/hooks/usePosts';
import { SocialProvider } from './features/social/context/SocialContext';
import { useAlinWebSocket } from './hooks/useAlinWebSocket';
import { useDesktopSearch } from './hooks/useDesktopSearch';
import { useGeolocation } from './hooks/useGeolocation';
import { useMapNavigation } from './hooks/useMapNavigation';
import { useLooterActions, useLooterState } from './looter-game/LooterGameContext';

export const AlinMapInner: React.FC<AlinMapProps> = ({
    user,
    onClose,
    externalApi,
    profileUserId,
    profileStatus,
    games,
    friends = [],
    onOpenChat,
    showNotification,
    initialMainTab = 'discover',
    onTabChange,
    handlePlayGame,
    cloudflareUrl,
    triggerAuth,
    logout,
    externalOpenList,
    onOpenListChange
}) => {
    const API_BASE = getBaseUrl();
    const hasInitialCenteredRef = React.useRef(false);

    // --- Geolocation / Weather / Province ---
    const geo = useGeolocation();
    const location = useLocation();

    const [searchTag, setSearchTag] = useState('');
    const [friendIdInput, setFriendIdInput] = useState('');
    const [searchMarkerPos, setSearchMarkerPos] = useState<{ lat: number; lng: number } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, target: 'map' | 'user', data: any } | null>(null);
    const [isWeatherWidgetExpanded, setIsWeatherWidgetExpanded] = useState(false);
    const [isTierSelectorOpen, setIsTierSelectorOpen] = useState(false);

    // --- Looter Game ---
    const looterState = useLooterState();
    const looterActions = useLooterActions();
    
    const { isLooterGameMode, state: looterStateObj, isChallengeActive } = looterState;
    const { setIsLooterGameMode, setOpenBackpackHandler, saveInventory, setWorldTier } = looterActions;
    const pickupRewardItem = (looterState as any).pickupRewardItem;
    const setPickupRewardItem = (looterActions as any).setPickupRewardItem || (() => {});

    // --- WebSocket ---
    const wsCtx = useAlinWebSocket({
        position: geo.position,
        myObfPos: geo.myObfPos,
        setMyObfPos: geo.setMyObfPos,
        radius: 5,
        searchTag,
        myStatus: profileStatus || '',
        isVisibleOnMap: (() => {
            const saved = localStorage.getItem('alinmap_visible');
            return saved !== null ? saved === 'true' : !!user;
        })(),
        user,
        externalApi,
        currentProvince: geo.currentProvince,
        panX: undefined as any,
        panY: undefined as any,
        fetchNotifications: async () => {},
        onStatusSync: () => {}, // We will update ProfileContext from children or a separate effect if needed
    });
    const resolvedMyUserId = wsCtx.myUserId || profileUserId || localStorage.getItem('alin_profile_user_id') || null;
    const resolvedMyStatus = profileStatus || wsCtx.myStatus || '';

    const requireAuth = useCallback((actionLabel: string, afterLogin?: () => void) => {
        if (user) return true;
        showNotification?.(`Dang nhap de ${actionLabel}. Du lieu se duoc dong bo voi tai khoan Gmail.`, 'info');
        triggerAuth?.(afterLogin || (() => {}));
        return false;
    }, [user, showNotification, triggerAuth]);

    // --- Map Navigation ---
    const nav = useMapNavigation({
        initialMainTab,
        myObfPos: geo.myObfPos,
        ws: wsCtx.ws,
        onTabChange,
        handleRefresh: wsCtx.handleRefresh,
        requireAuth,
        user,
    });

    // --- Auto-focus Camera after initial load ---
    useEffect(() => {
        if (!wsCtx.isConnecting && wsCtx.wsStatus === 'OPEN' && !hasInitialCenteredRef.current) {
            hasInitialCenteredRef.current = true;
            
            // Wait a bit for map layers to settle
            setTimeout(() => {
                if (isLooterGameMode) {
                    looterActions.centerOnBoat();
                } else {
                    nav.handleCenter();
                }
            }, 500);
        }
    }, [wsCtx.isConnecting, wsCtx.wsStatus, isLooterGameMode, looterActions.centerOnBoat, nav]);

    // Patch wsCtx with actual panX/panY (circular dep workaround)
    // The handleRefresh in wsCtx uses panX/panY, so we re-bind it here
    const handleRefresh = useCallback(() => {
        if (wsCtx.ws.current && wsCtx.ws.current.readyState === WebSocket.OPEN && geo.myObfPos) {
            const scanLng = geo.myObfPos.lng + (-nav.panX.get() / MAP_PLANE_SCALE / DEGREES_TO_PX);
            const scanLat = geo.myObfPos.lat + (nav.panY.get() / nav.planeYScale.get() / DEGREES_TO_PX);
            wsCtx.ws.current.send(JSON.stringify({ type: 'MAP_MOVE', payload: { lat: scanLat, lng: scanLng, zoom: 13 } }));
        }
    }, [wsCtx.ws, geo.myObfPos, nav.panX, nav.panY, nav.planeYScale]);

    // --- Posts CRUD ---
    const posts = usePosts({
        ws: wsCtx.ws,
        externalApi,
        myUserId: resolvedMyUserId,
        user,
        selectedUser: nav.selectedUser,
        viewerLocation: geo.myObfPos,
        showNotification,
        setGalleryActive: wsCtx.setGalleryActive,
        setGalleryTitle: wsCtx.setGalleryTitle,
        setGalleryImages: wsCtx.setGalleryImages,
    });

    // --- Desktop Search ---
    const search = useDesktopSearch(searchTag, nav.isDesktop);

    // --- Fallback myObfPos for unauthenticated users ---
    useEffect(() => {
        if (!user && Array.isArray(geo.position) && geo.position.length >= 2 && !geo.myObfPos) {
            geo.setMyObfPos({ lat: geo.position[0], lng: geo.position[1] });
        }
    }, [user, geo.position, geo.myObfPos]);

    // --- URL Sub-path Sync ---
    useEffect(() => {
        const subGame = extractExploreGame(location.pathname);
        if (subGame === 'looter-game' && !isLooterGameMode) {
            looterActions.setIsLooterGameMode(true);
            nav.setMainTab('backpack');
            nav.setIsSheetExpanded(true);
        }
    }, [location.pathname, isLooterGameMode, looterActions.setIsLooterGameMode, nav.setMainTab, nav.setIsSheetExpanded]);

    useEffect(() => {
        const subGame = extractExploreGame(location.pathname);
        let newPath = '/explore';
        
        if (isLooterGameMode) {
            newPath = '/explore/looter-game';
        } else {
            // Khi không ở looter mode, không bao giờ giữ URL /explore/looter-game
            const nonLooterSubGame = subGame && subGame !== 'looter-game';
            if (nonLooterSubGame) {
                newPath = location.pathname;
            }
            // else: newPath stays '/explore' (không có sub-game nào khác)
        }

        if (location.pathname !== newPath) {
            window.history.replaceState(null, '', newPath);
        }
    }, [isLooterGameMode, nav.mainTab, location.pathname]);

    // Combat HUD & Camera Sync logic has been moved to useCombatCamera hook inside MapCanvas
    // to prevent redundant animations and circular dependency issues.

    const handleOpenBackpackFromPickup = useCallback(() => {
        setIsLooterGameMode(true);
        nav.setMainTab('backpack');
        nav.setIsSheetExpanded(true);
        setPickupRewardItem(null);
    }, [nav.setMainTab, nav.setIsSheetExpanded, setIsLooterGameMode, setPickupRewardItem]);

    useEffect(() => {
        setOpenBackpackHandler(() => handleOpenBackpackFromPickup);
        return () => setOpenBackpackHandler(null);
    }, [handleOpenBackpackFromPickup, setOpenBackpackHandler]);

    useEffect(() => {
        if (!isLooterGameMode || nav.mainTab !== 'backpack' || !nav.isSheetExpanded) return;
        const timer = window.setTimeout(() => {
            const backpack = document.getElementById('looter-backpack-container');
            const rect = backpack?.getBoundingClientRect();
            let xOffset = 0;
            let yOffset = 0;
            if (rect) {
                const isDesktopSidePanel =
                    window.innerWidth >= 768 &&
                    rect.left < window.innerWidth * 0.35 &&
                    rect.width < window.innerWidth * 0.8 &&
                    rect.height > window.innerHeight * 0.55;
                if (isDesktopSidePanel) {
                    const visibleLeft = Math.min(Math.max(rect.right, 0), window.innerWidth);
                    xOffset = (visibleLeft + window.innerWidth) / 2 - window.innerWidth / 2;
                } else {
                    const visibleMapHeight = Math.max(120, Math.min(rect.top, window.innerHeight));
                    yOffset = window.innerHeight / 2 - visibleMapHeight / 2;
                }
            }
            looterActions.centerOnBoat(yOffset, xOffset);
        }, 140);
        return () => window.clearTimeout(timer);
    }, [isLooterGameMode, nav.mainTab, nav.isSheetExpanded, looterActions.centerOnBoat]);

    const handleDiscardPickupItem = async () => {
        if (!pickupRewardItem) return;
        const newInventory = looterState.inventory.filter((item) => item.uid !== pickupRewardItem.uid);
        await saveInventory(newInventory);
        setPickupRewardItem(null);
    };

    return (
        <ProfileProvider 
            initialIsVisible={(() => {
                const saved = localStorage.getItem('alinmap_visible');
                return saved !== null ? saved === 'true' : !!user;
            })()}
            initialStatus={resolvedMyStatus}
        >
        <SocialProvider
            user={user}
            externalApi={externalApi}
            apiBase={API_BASE}
            showNotification={showNotification}
            requireAuth={requireAuth}
            onOpenChat={onOpenChat}
            selectedUser={nav.selectedUser}
        >
        <div className="fixed inset-0 z-[100] isolate overflow-hidden bg-[#13151a] select-none">
            <div className="absolute inset-0 z-0">
                <MapCanvas
                    position={geo.position} isConsentOpen={geo.isConsentOpen}
                    nearbyUsers={wsCtx.nearbyUsers} friends={friends}
                    myUserId={resolvedMyUserId} user={user}
                    myObfPos={geo.myObfPos} myDisplayName={wsCtx.myDisplayName} myAvatarUrl={wsCtx.myAvatarUrl}
                    myStatus={resolvedMyStatus} isVisibleOnMap={wsCtx.isVisibleOnMap} isConnecting={wsCtx.isConnecting}
                    isDesktop={nav.isDesktop}
                    currentProvince={geo.currentProvince} galleryActive={wsCtx.galleryActive} galleryTitle={wsCtx.galleryTitle}
                    galleryImages={wsCtx.galleryImages} searchTag={searchTag} filterDistance={50}
                    filterAgeMin={13} filterAgeMax={99} searchMarkerPos={searchMarkerPos}
                    scale={nav.scale} cameraZ={nav.cameraZ} tiltAngle={nav.tiltAngle} planeYScale={nav.planeYScale} perspectivePx={nav.perspectivePx}
                    cameraHeightPct={nav.cameraHeightPct} cameraRotateDeg={nav.cameraRotateDeg}
                    cameraRotateXDeg={nav.cameraRotateXDeg} cameraRotateYDeg={nav.cameraRotateYDeg}
                    panX={nav.panX} panY={nav.panY} selfDragX={nav.selfDragX} selfDragY={nav.selfDragY} ws={wsCtx.ws}
                    requestLocation={geo.requestLocation} selectedUser={nav.selectedUser} setSelectedUser={nav.setSelectedUser} setActiveTab={nav.setActiveTab}
                    setIsSheetExpanded={nav.setIsSheetExpanded} setMyObfPos={geo.setMyObfPos} addLog={wsCtx.addLog} handleWheel={nav.handleWheel}
                    mapMode={nav.mapMode}
                    setContextMenu={setContextMenu}
                    isLooterGameMode={isLooterGameMode}
                    isLooterLoading={nav.isLooterLoading}
                    setMainTab={nav.setMainTab}
                    showNotification={showNotification}
                    setIsTierSelectorOpen={setIsTierSelectorOpen}
                    setCameraZ={nav.setCameraZ}
                    setCameraHeightPct={nav.setCameraHeightPct}
                    setCameraRotateDeg={nav.setCameraRotateDeg}
                    setCameraRotateXDeg={nav.setCameraRotateXDeg}
                    setCameraRotateYDeg={nav.setCameraRotateYDeg}
                />
            </div>

            <AlinMapUiOverlay
                nav={nav}
                geo={geo}
                wsCtx={wsCtx}
                search={search}
                posts={posts}
                user={user}
                friends={friends}
                games={games}
                handlePlayGame={handlePlayGame}
                showNotification={showNotification}
                triggerAuth={triggerAuth}
                requireAuth={requireAuth}
                logout={logout}
                externalApi={externalApi}
                externalOpenList={externalOpenList}
                onOpenListChange={onOpenListChange}
                cloudflareUrl={cloudflareUrl}
                onOpenChat={onOpenChat}
                contextMenu={contextMenu}
                setContextMenu={setContextMenu}
                pickupRewardItem={pickupRewardItem}
                handleDiscardPickupItem={handleDiscardPickupItem}
                handleOpenBackpackFromPickup={handleOpenBackpackFromPickup}
                isTierSelectorOpen={isTierSelectorOpen}
                setIsTierSelectorOpen={setIsTierSelectorOpen}
                isWeatherWidgetExpanded={isWeatherWidgetExpanded}
                setIsWeatherWidgetExpanded={setIsWeatherWidgetExpanded}
                friendIdInput={friendIdInput}
                setFriendIdInput={setFriendIdInput}
                setSearchMarkerPos={setSearchMarkerPos}
                searchTag={searchTag}
                setSearchTag={setSearchTag}
                handleRefresh={handleRefresh}
                selectedUser={nav.selectedUser}
                setSelectedUser={nav.setSelectedUser}
                setActiveTab={nav.setActiveTab}
                setIsLooterGameMode={setIsLooterGameMode}
                setIsSheetExpanded={nav.setIsSheetExpanded}
                looterStateObj={looterStateObj}
                looterActions={looterActions}
                isLooterGameMode={isLooterGameMode}
                mainTab={nav.mainTab}
                myAvatarUrl={wsCtx.myAvatarUrl}
                myDisplayName={wsCtx.myDisplayName}
                myObfPos={geo.myObfPos}
                currentProvince={geo.currentProvince}
                weatherData={geo.weatherData}
                isDesktop={nav.isDesktop}
                isConnecting={wsCtx.isConnecting}
                isSheetExpanded={nav.isSheetExpanded}
                camera={{
                    cameraZ: nav.cameraZ,
                    tiltAngle: nav.tiltAngle,
                    cameraHeightPct: nav.cameraHeightPct,
                    cameraRotateDeg: nav.cameraRotateDeg,
                    cameraRotateXDeg: nav.cameraRotateXDeg,
                    cameraRotateYDeg: nav.cameraRotateYDeg,
                    setCameraZ: nav.setCameraZ,
                    setCameraHeightPct: nav.setCameraHeightPct,
                    setCameraRotateDeg: nav.setCameraRotateDeg,
                    setCameraRotateXDeg: nav.setCameraRotateXDeg,
                    setCameraRotateYDeg: nav.setCameraRotateYDeg,
                }}
            />
        </div>
        </SocialProvider>
        </ProfileProvider>
    );
};

export default AlinMapInner;
