import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getBaseUrl } from '../../services/externalApi';
import MapCanvas from './MapCanvas';
import AlinMapUiOverlay from './AlinMapUiOverlay';
import { AlinMapProps, DEGREES_TO_PX, MAP_PLANE_SCALE } from './constants';
import { ProfileProvider } from './features/profile/context/ProfileContext';
import { usePosts } from './features/profile/hooks/usePosts';
import { SocialProvider } from './features/social/context/SocialContext';
import { useAlinWebSocket } from './hooks/useAlinWebSocket';
import { useGeolocation } from './hooks/useGeolocation';
import { useMapNavigation } from './hooks/useMapNavigation';
import { useAdaptivePerformance } from './hooks/useAdaptivePerformance';
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
    const performance = useAdaptivePerformance();
    const location = useLocation();
    const navigate = useNavigate();

    const [searchTag, setSearchTag] = useState('');
    const [friendIdInput, setFriendIdInput] = useState('');
    const [searchMarkerPos, setSearchMarkerPos] = useState<{ lat: number; lng: number } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, target: 'map' | 'user', data: any } | null>(null);
    const [selectedPost, setSelectedPost] = useState<any | null>(null);
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
    const fetchNotifications = useCallback(async () => {}, []);
    const onStatusSync = useCallback(() => {}, []);

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
        fetchNotifications,
        onStatusSync, // We will update ProfileContext from children or a separate effect if needed
        performance,
    });
    const resolvedMyUserId = wsCtx.myUserId || profileUserId || localStorage.getItem('alin_profile_user_id') || null;
    const resolvedMyStatus = profileStatus || wsCtx.myStatus || '';

    const requireAuth = useCallback((_actionLabel: string, afterLogin?: () => void) => {
        if (user) return true;
        triggerAuth?.(afterLogin || (() => {}));
        return false;
    }, [user, triggerAuth]);

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
        if (!wsCtx.isSocketConnecting && wsCtx.wsStatus === 'OPEN' && !hasInitialCenteredRef.current) {
            hasInitialCenteredRef.current = true;
            
            // Wait a bit for map layers to settle
            setTimeout(() => {
                if (isLooterGameMode) {
                    looterActions.centerOnBoat();
                } else {
                    nav.handleCenterAvatar();
                }
            }, 500);
        }
    }, [wsCtx.isSocketConnecting, wsCtx.wsStatus, isLooterGameMode, looterActions.centerOnBoat, nav]);

    // Patch wsCtx with actual panX/panY (circular dep workaround)
    // The handleRefresh in wsCtx uses panX/panY, so we re-bind it here
    const handleRefresh = useCallback(() => {
        if (!wsCtx.ws.current || wsCtx.ws.current.readyState !== WebSocket.OPEN) return;
        if (!geo.myObfPos) return;

        wsCtx.setIsSocketConnecting(true);
        const scanLng = geo.myObfPos.lng + (-nav.panX.get() / MAP_PLANE_SCALE / DEGREES_TO_PX);
        // CHUYÊN GIA FIX: panY giờ đồng nhất với panX, dùng MAP_PLANE_SCALE thay vì planeYScale.
        const scanLat = geo.myObfPos.lat + (nav.panY.get() / MAP_PLANE_SCALE / DEGREES_TO_PX);
        wsCtx.ws.current.send(JSON.stringify({ type: 'MAP_MOVE', payload: { lat: scanLat, lng: scanLng, zoom: 13 } }));
        setTimeout(() => wsCtx.setIsSocketConnecting(false), 1000);
    }, [wsCtx.ws, wsCtx.setIsSocketConnecting, geo.myObfPos, nav.panX, nav.panY]);

    // --- Posts CRUD ---
    const posts = usePosts({
        ws: wsCtx.ws,
        externalApi,
        myUserId: resolvedMyUserId,
        user,
        selectedUser: nav.selectedUser,
        viewerLocation: geo.myObfPos,
        showNotification,
        triggerAuth,
        setGalleryActive: wsCtx.setGalleryActive,
        setGalleryTitle: wsCtx.setGalleryTitle,
        setGalleryImages: wsCtx.setGalleryImages,
    });

    const handleOpenBillboardPost = useCallback(async (sourceUser: any) => {
        if (!sourceUser) return;

        const sourceUserId = sourceUser.id || sourceUser.uid || sourceUser.user_id || null;
        const galleryTitle = String(sourceUser.gallery?.title || '').trim();
        const galleryImages = Array.isArray(sourceUser.gallery?.images) ? sourceUser.gallery.images : [];
        const galleryPostId = sourceUser.gallery?.postId || sourceUser.gallery?.post_id || sourceUser.gallery?.id || null;
        const allPosts = [
            ...(Array.isArray(posts.feedPosts) ? posts.feedPosts : []),
            ...(Array.isArray(posts.userPosts) ? posts.userPosts : []),
        ];

        const matchesAuthor = (post: any) => {
            const postAuthorId = post?.author?.id || post?.user_id || post?.author_id || null;
            return sourceUserId != null && String(postAuthorId) === String(sourceUserId);
        };

        const matchesGallery = (post: any) => {
            if (!post) return false;
            if (galleryPostId && String(post.id) === String(galleryPostId)) return true;
            const sameTitle = galleryTitle && String(post.title || '').trim() === galleryTitle;
            const postImages = Array.isArray(post.images) ? post.images : [];
            const sameImage = galleryImages.length > 0 && postImages.some((img: string) => galleryImages.includes(img));
            return !!(sameTitle || sameImage);
        };

        const openPost = (post: any) => {
            if (!post) return false;
            setSelectedPost(post);
            return true;
        };

        const localPost = allPosts.find((post: any) => matchesAuthor(post) && matchesGallery(post))
            || allPosts.find((post: any) => matchesAuthor(post) && post?.isStarred)
            || allPosts.find((post: any) => matchesAuthor(post))
            || null;

        if (openPost(localPost)) {
            return;
        }

        if (!sourceUserId) return;

        try {
            const resp = await fetch(`${API_BASE}/api/user/${sourceUserId}/posts`, {
                headers: { 'X-Device-Id': externalApi.getDeviceId() },
            });
            const data = await resp.json();
            const fetchedPosts = Array.isArray(data?.posts) ? data.posts : [];
            const fetchedPost = fetchedPosts.find(matchesGallery)
                || fetchedPosts.find((post: any) => post?.isStarred)
                || null;
            if (!openPost(fetchedPost)) {
                showNotification?.('Không tìm thấy bài viết billboard', 'info');
            }
        } catch (err) {
            console.error('Open billboard post error:', err);
            showNotification?.('Không mở được bài viết billboard', 'error');
        }
    }, [API_BASE, externalApi, posts.feedPosts, posts.userPosts, showNotification]);

    // --- Fallback myObfPos for unauthenticated users ---
    useEffect(() => {
        if (!user && Array.isArray(geo.position) && geo.position.length >= 2 && !geo.myObfPos) {
            geo.setMyObfPos({ lat: geo.position[0], lng: geo.position[1] });
        }
    }, [user, geo.position, geo.myObfPos]);

    // --- URL Sub-path Sync ---
    useEffect(() => {
        if (location.pathname.startsWith('/explore/looter-game')) {
            navigate('/explore', { replace: true });
        }
    }, [location.pathname, navigate]);

    // Combat HUD & Camera Sync logic has been moved to useCombatCamera hook inside MapCanvas
    // to prevent redundant animations and circular dependency issues.

    const handleOpenBackpackFromPickup = useCallback(() => {
        setIsLooterGameMode(true);
        nav.setMainTab('backpack');
        nav.setIsSheetExpanded(true);
        nav.requestBoatAutoFocus();
        setPickupRewardItem(null);
    }, [nav.setMainTab, nav.setIsSheetExpanded, nav.requestBoatAutoFocus, setIsLooterGameMode, setPickupRewardItem]);

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
        <div className="alinmap-viewport fixed inset-0 z-[100] isolate overflow-hidden bg-[#13151a] select-none">
            <div className="absolute inset-0 z-0">
                <MapCanvas
                position={geo.position} isConsentOpen={geo.isConsentOpen}
                nearbyUsers={wsCtx.nearbyUsers} friends={friends}
                myUserId={resolvedMyUserId} user={user}
                myObfPos={geo.myObfPos} myDisplayName={wsCtx.myDisplayName} myAvatarUrl={wsCtx.myAvatarUrl}
                    myStatus={resolvedMyStatus} isVisibleOnMap={wsCtx.isVisibleOnMap} isSocketConnecting={wsCtx.isSocketConnecting}
                    isDesktop={nav.isDesktop}
                    currentProvince={geo.currentProvince} galleryActive={wsCtx.galleryActive} galleryTitle={wsCtx.galleryTitle}
                    galleryImages={wsCtx.galleryImages} searchTag={searchTag} filterDistance={50}
                    filterAgeMin={13} filterAgeMax={99} searchMarkerPos={searchMarkerPos}
                    scale={nav.scale} cameraZ={nav.cameraZ} tiltAngle={nav.effectiveTiltAngle} planeYScale={nav.planeYScale} perspectivePx={nav.perspectivePx}
                    cameraHeightOffset={nav.cameraHeightOffset} cameraRotateDeg={nav.cameraRotateDeg}
                    cameraPitchOverride={nav.cameraPitchOverride} cameraRotateYDeg={nav.cameraRotateYDeg}
                    panX={nav.panX} panY={nav.panY} selfDragX={nav.selfDragX} selfDragY={nav.selfDragY} ws={wsCtx.ws}
	                    requestLocation={geo.requestLocation} selectedUser={nav.selectedUser} setSelectedUser={nav.setSelectedUser} setActiveTab={nav.setActiveTab}
	                    isSheetExpanded={nav.isSheetExpanded} setIsSheetExpanded={nav.setIsSheetExpanded} setMyObfPos={geo.setMyObfPos} addLog={wsCtx.addLog} handleWheel={nav.handleWheel}
                    mapMode={nav.mapMode}
                    onOpenBillboardPost={handleOpenBillboardPost}
                    setContextMenu={setContextMenu}
                    isLooterGameMode={isLooterGameMode}
                    isBackpackLoading={nav.isBackpackLoading}
                    setMainTab={nav.setMainTab}
                    showNotification={showNotification}
                    setIsTierSelectorOpen={setIsTierSelectorOpen}
                    setCameraZ={nav.setCameraZ}
                    setCameraHeightOffset={nav.setCameraHeightOffset}
                    setCameraRotateDeg={nav.setCameraRotateDeg}
                    setCameraPitchOverride={nav.setCameraPitchOverride}
                    setCameraRotateYDeg={nav.setCameraRotateYDeg}
                    setCameraFov={nav.setCameraFov}
                    cameraFov={nav.cameraFov}
                    performance={performance}
                />
            </div>

            <AlinMapUiOverlay
                nav={nav}
                geo={geo}
                wsCtx={wsCtx}
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
                selectedPost={selectedPost}
                setSelectedPost={setSelectedPost}
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
                isSocketConnecting={wsCtx.isSocketConnecting}
                isSheetExpanded={nav.isSheetExpanded}
                camera={{
                    cameraZ: nav.cameraZ,
                    tiltAngle: nav.effectiveTiltAngle,
                    cameraHeightOffset: nav.cameraHeightOffset,
                    cameraRotateDeg: nav.cameraRotateDeg,
                    cameraPitchOverride: nav.cameraPitchOverride,
                    cameraRotateYDeg: nav.cameraRotateYDeg,
                    cameraFov: nav.cameraFov,
                    setCameraZ: nav.setCameraZ,
                    setCameraHeightOffset: nav.setCameraHeightOffset,
                    setCameraRotateDeg: nav.setCameraRotateDeg,
                    setCameraPitchOverride: nav.setCameraPitchOverride,
                    setCameraRotateYDeg: nav.setCameraRotateYDeg,
                    setCameraFov: nav.setCameraFov,
                }}
            />
        </div>
        </SocialProvider>
        </ProfileProvider>
    );
};

export default AlinMapInner;
