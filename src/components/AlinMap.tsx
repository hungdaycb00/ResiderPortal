import React, { useState, useEffect, useCallback } from 'react';
import { getBaseUrl } from '../services/externalApi';
import { AlinMapProps } from './alinmap/constants';
import MapCanvas from './alinmap/MapCanvas';
import MapControls from './alinmap/MapControls';
import NavigationBar from './alinmap/NavigationBar';
import BottomSheet from './alinmap/BottomSheet';
import SearchHeader from './alinmap/SearchHeader';
import ContextMenu from './alinmap/ContextMenu';
import LooterGameProvider from './alinmap/looter-game/LooterGameProvider';
import { useLooterState, useLooterActions } from './alinmap/looter-game/LooterGameContext';
import LooterGameUI from './alinmap/looter-game/LooterGameUI';
import TierSelectionOverlay from './alinmap/looter-game/TierSelectionOverlay';
import { SocialProvider } from './alinmap/features/social/context/SocialContext';
import { ProfileProvider } from './alinmap/features/profile/context/ProfileContext';
import FullscreenToggle from './alinmap/components/FullscreenToggle';

// Hooks
import { useGeolocation } from './alinmap/hooks/useGeolocation';
import { useAlinWebSocket } from './alinmap/hooks/useAlinWebSocket';
import { usePosts } from './alinmap/features/profile/hooks/usePosts';
import { useMapNavigation } from './alinmap/hooks/useMapNavigation';
import { useDesktopSearch } from './alinmap/hooks/useDesktopSearch';
import { extractExploreGame } from '../utils/routing';
import { useLocation } from 'react-router-dom';

const AlinMapInner: React.FC<AlinMapProps> = ({
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
            console.log('[AlinMap] Initial auto-focus trigger');
            
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
            const DEGREES_TO_PX = 11100;
            const scanLng = geo.myObfPos.lng + (-nav.panX.get() / DEGREES_TO_PX);
            const scanLat = geo.myObfPos.lat + (nav.panY.get() / DEGREES_TO_PX);
            wsCtx.ws.current.send(JSON.stringify({ type: 'MAP_MOVE', payload: { lat: scanLat, lng: scanLng, zoom: 13 } }));
        }
    }, [wsCtx.ws, geo.myObfPos, nav.panX, nav.panY]);

    // --- Posts CRUD ---
    const posts = usePosts({
        ws: wsCtx.ws,
        externalApi,
        myUserId: resolvedMyUserId,
        user,
        selectedUser: nav.selectedUser,
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
        }
    }, []); // Run once on mount

    useEffect(() => {
        let newPath = '/explore';
        
        if (isLooterGameMode) {
            newPath = '/explore/looter-game';
        } else if (nav.mainTab !== 'discover') {
            // Optional: Show main tab in URL if you want, e.g. /explore/social
            // But per user request, we focus on "games in explore"
            // If you want more, uncomment: newPath = `/explore/${nav.mainTab}`;
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
        <div className="fixed inset-0 z-[100] bg-[#13151a] flex flex-col select-none">
            {/* Fullscreen Toggle for Mobile */}
            <FullscreenToggle isDesktop={nav.isDesktop} />

            {/* Header / Search Bar */}
            <SearchHeader
                searchTag={searchTag}
                setSearchTag={setSearchTag}
                isDesktop={nav.isDesktop}
                isSheetExpanded={nav.isSheetExpanded}
                setIsSheetExpanded={nav.setIsSheetExpanded}
                isLooterGameMode={isLooterGameMode}
                mainTab={nav.mainTab}
                myAvatarUrl={wsCtx.myAvatarUrl}
                myDisplayName={wsCtx.myDisplayName}
                handleTabClick={nav.handleTabClick}
                showDesktopResults={search.showDesktopResults}
                setShowDesktopResults={search.setShowDesktopResults}
                isSearchingDesktop={search.isSearchingDesktop}
                desktopSearchResults={search.desktopSearchResults}
                setSelectedUser={nav.setSelectedUser}
                setActiveTab={nav.setActiveTab}
                weatherData={geo.weatherData}
                currentProvince={geo.currentProvince}
                myObfPos={geo.myObfPos}
                onWeatherClick={() => setIsWeatherWidgetExpanded(true)}
            />

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
                scale={nav.scale} panX={nav.panX} panY={nav.panY} selfDragX={nav.selfDragX} selfDragY={nav.selfDragY} ws={wsCtx.ws}
                requestLocation={geo.requestLocation} setSelectedUser={nav.setSelectedUser} setActiveTab={nav.setActiveTab}
                setIsSheetExpanded={nav.setIsSheetExpanded} setMyObfPos={geo.setMyObfPos} addLog={wsCtx.addLog} handleWheel={nav.handleWheel}
                mapMode={nav.mapMode}
                setContextMenu={setContextMenu}
                isLooterGameMode={isLooterGameMode}
                isLooterLoading={nav.isLooterLoading}
                setMainTab={nav.setMainTab}
                showNotification={showNotification}
                setIsTierSelectorOpen={setIsTierSelectorOpen}
            />

            <MapControls
                isConnecting={wsCtx.isConnecting}
                isSidebarOpen={false}
                weatherData={geo.weatherData}
                currentProvince={geo.currentProvince}
                myObfPos={geo.myObfPos}
                friendLocInput={friendIdInput}
                filterDistance={50}
                filterAgeMin={13}
                filterAgeMax={99}
                searchTag={searchTag}
                radius={nav.radius}
                scale={nav.scale}
                ws={wsCtx.ws}
                mapMode={nav.mapMode}
                setIsSidebarOpen={() => {}}
                setFriendLocInput={setFriendIdInput}
                setMyObfPos={geo.setMyObfPos}
                setSearchMarkerPos={setSearchMarkerPos}
                setFilterDistance={() => {}}
                setFilterAgeMin={() => {}}
                setFilterAgeMax={() => {}}
                setSearchTag={setSearchTag}
                handleRefresh={handleRefresh}
                handleCenter={nav.handleCenter}
                handleCenterTo={nav.handleCenterTo}
                handleUpdateRadius={nav.handleUpdateRadius}
                setMapMode={nav.setMapMode}
                onOpenTierSelector={() => setIsTierSelectorOpen(true)}
                isWidgetExpanded={isWeatherWidgetExpanded}
                setIsWidgetExpanded={setIsWeatherWidgetExpanded}
                isSheetExpanded={nav.isSheetExpanded}
                isDesktop={nav.isDesktop}
            />

            <NavigationBar mainTab={nav.mainTab} selectedUser={nav.selectedUser} isDesktop={nav.isDesktop} handleTabClick={nav.handleTabClick} user={user} isSheetExpanded={nav.isSheetExpanded} />

            <BottomSheet
                isDesktop={nav.isDesktop} isSheetExpanded={nav.isSheetExpanded} selectedUser={nav.selectedUser}
                activeTab={nav.activeTab} mainTab={nav.mainTab} nearbyUsers={wsCtx.nearbyUsers} friends={friends}
                games={games} userGames={posts.userGames} userPosts={posts.userPosts} myUserId={resolvedMyUserId}
                myDisplayName={wsCtx.myDisplayName} myObfPos={geo.myObfPos} user={user}
                searchTag={searchTag}
                isCreatingPost={posts.isCreatingPost} postTitle={posts.postTitle}
                postPrivacy={posts.postPrivacy}
                isSavingPost={posts.isSavingPost} galleryActive={wsCtx.galleryActive} currentProvince={geo.currentProvince}
                radius={nav.radius} fetchUserPosts={posts.fetchUserPosts}
                showNotification={showNotification}
                                ws={wsCtx.ws} panX={nav.panX} panY={nav.panY} 
                onLocateUser={(lat, lng) => {
                    nav.handleCenterTo(lat, lng);
                    nav.scale.set(2);
                }}
                externalApi={externalApi} onOpenChat={onOpenChat}
                handleUpdateRadius={nav.handleUpdateRadius}
                setIsSheetExpanded={nav.setIsSheetExpanded} setSelectedUser={nav.setSelectedUser} setActiveTab={nav.setActiveTab}
                setMainTab={nav.setMainTab} setSearchTag={setSearchTag}
                setMyDisplayName={wsCtx.setMyDisplayName}
                myAvatarUrl={wsCtx.myAvatarUrl} setMyAvatarUrl={wsCtx.setMyAvatarUrl}
                setIsCreatingPost={posts.setIsCreatingPost} setPostTitle={posts.setPostTitle}
                setPostPrivacy={posts.setPostPrivacy}
                handleCreatePost={posts.handleCreatePost}
                handleUpdatePostPrivacy={posts.handleUpdatePostPrivacy}
                handleStarPost={posts.handleStarPost} handleDeletePost={posts.handleDeletePost}
                handlePlayGame={handlePlayGame}
                cloudflareUrl={cloudflareUrl}
                triggerAuth={triggerAuth}
                requireAuth={requireAuth}
                logout={logout}
                externalOpenList={externalOpenList}
                onOpenListChange={onOpenListChange}
                onPublishSuccess={handleRefresh}
                requestLocation={geo.requestLocation}
            />

            {/* Context Menu Overlay */}
            {contextMenu && (
                <ContextMenu
                    contextMenu={contextMenu}
                    setContextMenu={setContextMenu}
                    setMyObfPos={geo.setMyObfPos}
                    panX={nav.panX}
                    panY={nav.panY}
                    ws={wsCtx.ws}
                    setSelectedUser={nav.setSelectedUser}
                />
            )}

            {pickupRewardItem && (
                <div className="fixed inset-0 z-[450] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
                    <div className="w-full max-w-xs rounded-3xl border border-cyan-700/40 bg-[#08131d] p-6 text-center shadow-2xl">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-700/40 bg-[#0d2137] text-5xl shadow-inner">
                            {pickupRewardItem.icon}
                        </div>
                        <p className="mt-4 text-lg font-black text-cyan-100">{pickupRewardItem.name}</p>
                        <div className="mt-4 grid grid-cols-2 gap-2 text-left text-xs text-cyan-100/85">
                            <div className="rounded-xl border border-cyan-900/30 bg-[#0a1929] px-3 py-2">DMG: {pickupRewardItem.weight || 0}</div>
                            <div className="rounded-xl border border-cyan-900/30 bg-[#0a1929] px-3 py-2">HP: {pickupRewardItem.hpBonus || 0}</div>
                            <div className="rounded-xl border border-cyan-900/30 bg-[#0a1929] px-3 py-2">EN: {pickupRewardItem.energyMax || 0}</div>
                            <div className="rounded-xl border border-cyan-900/30 bg-[#0a1929] px-3 py-2">Regen: {pickupRewardItem.energyRegen || 0}</div>
                            <div className="rounded-xl border border-cyan-900/30 bg-[#0a1929] px-3 py-2">Vang: {pickupRewardItem.price || 0}</div>
                            <div className="rounded-xl border border-cyan-900/30 bg-[#0a1929] px-3 py-2">Kich thuoc: {pickupRewardItem.gridW}x{pickupRewardItem.gridH}</div>
                        </div>

                        <div className="mt-5 flex gap-3">
                            <button
                                type="button"
                                onClick={() => { void handleDiscardPickupItem(); }}
                                className="flex-1 rounded-2xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm font-black text-red-200 transition-colors hover:bg-red-900/40"
                            >
                                Vut bo
                            </button>
                            <button
                                type="button"
                                onClick={handleOpenBackpackFromPickup}
                                className="flex-1 rounded-2xl border border-cyan-500/40 bg-cyan-950/30 px-4 py-3 text-sm font-black text-cyan-100 transition-colors hover:bg-cyan-900/40"
                            >
                                Mo balo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <TierSelectionOverlay
                isOpen={isTierSelectorOpen}
                onClose={() => setIsTierSelectorOpen(false)}
                currentGold={looterStateObj.looterGold}
                onSelectTier={async (tier) => {
                    console.log(`[AlinMap] onSelectTier selected: ${tier}`);
                    try {
                        if (typeof looterActions.setWorldTier === 'function') {
                            setIsTierSelectorOpen(false);
                            setIsLooterGameMode(true);
                            // Run in background so UI feels instant
                            looterActions.setWorldTier(tier).catch(err => {
                                console.error('[AlinMap] Background setWorldTier error:', err);
                            });
                        } else {
                            console.error('[AlinMap] setWorldTier is not a function in looterActions');
                        }
                        
                        // Check if nav methods exist before calling
                        if (nav && typeof nav.handleCenterTo === 'function') {
                            console.log(`[AlinMap] Centering map to fortress...`);
                            nav.handleCenterTo(looterStateObj.fortressLat || 0, looterStateObj.fortressLng || 0);
                        } else {
                            console.warn(`[AlinMap] nav.handleCenterTo is not available`, nav);
                        }
                    } catch (err) {
                        console.error(`[AlinMap] onSelectTier error:`, err);
                    }
                }}
            />
        </div>
        </SocialProvider>
        </ProfileProvider>
    );
};

const AlinMap: React.FC<AlinMapProps> = (props) => {
    const activeDeviceId = props.externalApi.getDeviceId();
    return (
        <LooterGameProvider deviceId={activeDeviceId} showNotification={props.showNotification || (() => {})}>
            <LooterGameUI />
            <AlinMapInner {...props} />
        </LooterGameProvider>
    );
};

export default AlinMap;
