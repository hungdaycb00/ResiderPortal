import React, { useState, useEffect, useCallback } from 'react';
import { getBaseUrl } from '../services/externalApi';
import { AlinMapProps } from './alinmap/constants';
import MapCanvas from './alinmap/MapCanvas';
import MapControls from './alinmap/MapControls';
import NavigationBar from './alinmap/NavigationBar';
import BottomSheet from './alinmap/BottomSheet';
import SearchHeader from './alinmap/SearchHeader';
import ContextMenu from './alinmap/ContextMenu';
import SeaGameProvider, { useSeaGame } from './alinmap/sea-game/SeaGameProvider';
import SeaGameUI from './alinmap/sea-game/SeaGameUI';
import { SocialProvider } from './alinmap/features/social/context/SocialContext';
import { ProfileProvider } from './alinmap/features/profile/context/ProfileContext';

// Hooks
import { useGeolocation } from './alinmap/hooks/useGeolocation';
import { useAlinWebSocket } from './alinmap/hooks/useAlinWebSocket';
import { usePosts } from './alinmap/features/profile/hooks/usePosts';
import { useMapNavigation } from './alinmap/hooks/useMapNavigation';
import { useDesktopSearch } from './alinmap/hooks/useDesktopSearch';

const AlinMapInner: React.FC<AlinMapProps> = ({
    user,
    onClose,
    externalApi,
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

    // --- Geolocation / Weather / Province ---
    const geo = useGeolocation();

    const [searchTag, setSearchTag] = useState('');
    const [searchMarkerPos, setSearchMarkerPos] = useState<{ lat: number; lng: number } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, target: 'map' | 'user', data: any } | null>(null);

    // --- Sea Game ---
    const seaGame = useSeaGame();
    const { isSeaGameMode, state: seaState, pickupRewardItem, setPickupRewardItem } = seaGame;

    // --- WebSocket ---
    const wsCtx = useAlinWebSocket({
        position: geo.position,
        myObfPos: geo.myObfPos,
        setMyObfPos: geo.setMyObfPos,
        radius: 5,
        searchTag,
        myStatus: "",
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
        seaState,
        seaGame,
        onTabChange,
        handleRefresh: wsCtx.handleRefresh,
        requireAuth,
        user,
    });

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
        myUserId: wsCtx.myUserId,
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
        if (!user && geo.position && !geo.myObfPos) {
            geo.setMyObfPos({ lat: geo.position[0], lng: geo.position[1] });
        }
    }, [user, geo.position, geo.myObfPos]);

    // --- Avatar state (from WS context) ---
    const [showAvatarMenu, setShowAvatarMenu] = useState(false);
    const avatarInputRef = React.useRef<HTMLInputElement>(null);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        // Placeholder — actual upload handled elsewhere
    };
    const handleDefaultAvatar = () => {
        // Placeholder
    };

    const handleOpenBackpackFromPickup = () => {
        seaGame.setIsSeaGameMode(true);
        nav.setMainTab('backpack');
        nav.setIsSheetExpanded(true);
        setPickupRewardItem(null);
    };

    const handleDiscardPickupItem = async () => {
        if (!pickupRewardItem) return;
        const newInventory = seaGame.state.inventory.filter((item) => item.uid !== pickupRewardItem.uid);
        await seaGame.saveInventory(newInventory);
        setPickupRewardItem(null);
    };

    return (
        <ProfileProvider initialIsVisible={(() => {
            const saved = localStorage.getItem('alinmap_visible');
            return saved !== null ? saved === 'true' : !!user;
        })()}>
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
            {/* Header / Search Bar */}
            <SearchHeader
                searchTag={searchTag}
                setSearchTag={setSearchTag}
                isDesktop={nav.isDesktop}
                isSheetExpanded={nav.isSheetExpanded}
                setIsSheetExpanded={nav.setIsSheetExpanded}
                isSeaGameMode={isSeaGameMode}
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
            />

            <MapCanvas
                position={geo.position} isConsentOpen={geo.isConsentOpen} myObfPos={geo.myObfPos} nearbyUsers={wsCtx.nearbyUsers}
                myUserId={wsCtx.myUserId} user={user} myDisplayName={wsCtx.myDisplayName} myStatus={""}
                isVisibleOnMap={true} isConnecting={wsCtx.isConnecting} isDesktop={nav.isDesktop}
                currentProvince={geo.currentProvince} galleryActive={wsCtx.galleryActive} galleryTitle={wsCtx.galleryTitle}
                galleryImages={wsCtx.galleryImages} searchTag={searchTag} filterDistance={50}
                filterAgeMin={13} filterAgeMax={99} searchMarkerPos={searchMarkerPos}
                scale={nav.scale} panX={nav.panX} panY={nav.panY} selfDragX={nav.selfDragX} selfDragY={nav.selfDragY} ws={wsCtx.ws}
                requestLocation={geo.requestLocation} setSelectedUser={nav.setSelectedUser} setActiveTab={nav.setActiveTab}
                setIsSheetExpanded={nav.setIsSheetExpanded} setMyObfPos={geo.setMyObfPos} addLog={wsCtx.addLog} handleWheel={nav.handleWheel}
                mapMode={nav.mapMode}
                setContextMenu={setContextMenu}
                isSeaGameMode={isSeaGameMode}
                seaState={seaState}
                seaGameCtx={seaGame}
                isSeaLoading={nav.isSeaLoading}
                setMainTab={nav.setMainTab}
                showNotification={showNotification}
            />

            <MapControls
                isConnecting={wsCtx.isConnecting} isSidebarOpen={false} weatherData={geo.weatherData} currentProvince={geo.currentProvince}
                myObfPos={geo.myObfPos} friendLocInput={friendIdInput} filterDistance={50}
                filterAgeMin={13} filterAgeMax={99} searchTag={searchTag} radius={nav.radius}
                scale={nav.scale} ws={wsCtx.ws} mapMode={nav.mapMode}
                setIsSidebarOpen={() => {}} setFriendLocInput={setFriendIdInput} setMyObfPos={geo.setMyObfPos}
                setSearchMarkerPos={setSearchMarkerPos} setFilterDistance={() => {}}
                setFilterAgeMin={() => {}} setFilterAgeMax={() => {}} setSearchTag={setSearchTag}
                handleRefresh={handleRefresh} handleCenter={nav.handleCenter} handleCenterTo={nav.handleCenterTo} handleUpdateRadius={nav.handleUpdateRadius}
                setMapMode={nav.setMapMode}
                isSeaGameMode={isSeaGameMode}
            />

            <NavigationBar mainTab={nav.mainTab} selectedUser={nav.selectedUser} isDesktop={nav.isDesktop} handleTabClick={nav.handleTabClick} user={user} />

            <BottomSheet
                isDesktop={nav.isDesktop} isSheetExpanded={nav.isSheetExpanded} selectedUser={nav.selectedUser}
                activeTab={nav.activeTab} mainTab={nav.mainTab} nearbyUsers={wsCtx.nearbyUsers} friends={friends}
                games={games} userGames={posts.userGames} userPosts={posts.userPosts} myUserId={wsCtx.myUserId}
                myDisplayName={wsCtx.myDisplayName} myStatus={myStatus} myObfPos={geo.myObfPos} user={user}
                searchTag={searchTag}
                isCreatingPost={posts.isCreatingPost} postTitle={posts.postTitle}
                isSavingPost={posts.isSavingPost} galleryActive={wsCtx.galleryActive} currentProvince={geo.currentProvince}
                radius={nav.radius} fetchUserPosts={posts.fetchUserPosts}
                showNotification={showNotification}
                ws={wsCtx.ws} panX={nav.panX} panY={nav.panY} scale={nav.scale} externalApi={externalApi} onOpenChat={onOpenChat}
                setSentFriendRequests={setSentFriendRequests} handleUpdateRadius={nav.handleUpdateRadius}
                setIsSheetExpanded={nav.setIsSheetExpanded} setSelectedUser={nav.setSelectedUser} setActiveTab={nav.setActiveTab}
                setMainTab={nav.setMainTab} setSearchTag={setSearchTag}
                setStatusInput={wsCtx.setStatusInput}
                setMyDisplayName={wsCtx.setMyDisplayName}
                myAvatarUrl={wsCtx.myAvatarUrl} setMyAvatarUrl={wsCtx.setMyAvatarUrl}
                setIsCreatingPost={posts.setIsCreatingPost} setPostTitle={posts.setPostTitle}
                handleCreatePost={posts.handleCreatePost} handleStarPost={posts.handleStarPost} handleDeletePost={posts.handleDeletePost}
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
        </div>
        </SocialProvider>
        </ProfileProvider>
    );
};

const AlinMap: React.FC<AlinMapProps> = (props) => {
    const activeDeviceId = props.externalApi.getDeviceId();
    return (
        <SeaGameProvider deviceId={activeDeviceId}>
            <SeaGameUI />
            <AlinMapInner {...props} />
        </SeaGameProvider>
    );
};

export default AlinMap;
