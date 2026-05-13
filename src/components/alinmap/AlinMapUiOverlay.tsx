import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MotionValue, useMotionValueEvent } from 'framer-motion';
import BottomSheet from './BottomSheet';
import ContextMenu from './ContextMenu';
import FullscreenToggle from './components/FullscreenToggle';
import MapControls from './MapControls';

import NavigationBar from './NavigationBar';
import SearchHeader from './SearchHeader';
import SearchOverlay from './SearchOverlay';
import PickupRewardModal from './looter-game/components/PickupRewardModal';
import PostDetailOverlay from './features/profile/components/PostDetailOverlay';
import TierSelectionOverlay from './looter-game/TierSelectionOverlay';
import { useGeolocation } from './hooks/useGeolocation';
import { useLooterActions, useLooterState } from './looter-game/LooterGameContext';
import { useAlinWebSocket } from './hooks/useAlinWebSocket';
import { useMapNavigation } from './hooks/useMapNavigation';
import { usePosts } from './features/profile/hooks/usePosts';

type CameraLabState = {
  cameraZ: MotionValue<number>;
  tiltAngle: MotionValue<number>;
  cameraHeightOffset: number;
  cameraRotateDeg: number;
  cameraPitchOverride: number | null;
  cameraRotateYDeg: number;
  setCameraZ: (z: number) => void;
  setCameraHeightOffset: (v: number) => void;
  setCameraRotateDeg: (v: number) => void;
  setCameraPitchOverride: (v: number | null) => void;
  setCameraRotateYDeg: (v: number) => void;
};

interface AlinMapUiOverlayProps {
  nav: ReturnType<typeof useMapNavigation>;
  geo: ReturnType<typeof useGeolocation>;
  wsCtx: ReturnType<typeof useAlinWebSocket>;
  posts: ReturnType<typeof usePosts>;
  user: any;
  friends: any[];
  games: any[];
  handlePlayGame?: (game: any) => void;
  showNotification?: (msg: string, type: 'success' | 'error' | 'info') => void;
  triggerAuth?: (callback: () => void) => void;
  requireAuth: (actionLabel: string, afterLogin?: () => void) => boolean;
  logout?: () => void;
  externalApi: any;
  externalOpenList?: boolean;
  onOpenListChange?: (v: boolean) => void;
  cloudflareUrl?: string;
  onOpenChat?: (id: string, name: string, avatar?: string) => void;
  contextMenu: { x: number; y: number; target: 'map' | 'user'; data: any } | null;
  setContextMenu: (menu: { x: number; y: number; target: 'map' | 'user'; data: any } | null) => void;
  pickupRewardItem: any;
  handleDiscardPickupItem: () => void;
  handleOpenBackpackFromPickup: () => void;
  isTierSelectorOpen: boolean;
  setIsTierSelectorOpen: (v: boolean) => void;
  isWeatherWidgetExpanded: boolean;
  setIsWeatherWidgetExpanded: (v: boolean) => void;
  friendIdInput: string;
  setFriendIdInput: (v: string) => void;
  setSearchMarkerPos: (pos: { lat: number; lng: number } | null) => void;
  searchTag: string;
  setSearchTag: (v: string) => void;
  handleRefresh: () => void;
  selectedUser: any;
  setSelectedUser: (u: any) => void;
  setActiveTab: (tab: 'info' | 'posts' | 'saved') => void;
  setIsLooterGameMode: (v: boolean) => void;
  setIsSheetExpanded: (v: boolean) => void;
  looterStateObj: any;
  looterActions: ReturnType<typeof useLooterActions>;
  isLooterGameMode: boolean;
  mainTab: string;
  myAvatarUrl: string;
  myDisplayName: string;
  myObfPos: { lat: number; lng: number } | null;
  currentProvince: string | null;
  weatherData: { temp: number; desc: string; icon: string; humidity?: number; feelsLike?: number } | null;
  isDesktop: boolean;
  isSocketConnecting: boolean;
  isSheetExpanded: boolean;
  camera: CameraLabState;
}

const AlinMapUiOverlay: React.FC<AlinMapUiOverlayProps> = ({
  nav,
  geo,
  wsCtx,
  posts,
  user,
  friends,
  games,
  handlePlayGame,
  showNotification,
  triggerAuth,
  requireAuth,
  logout,
  externalApi,
  externalOpenList,
  onOpenListChange,
  cloudflareUrl,
  onOpenChat,
  contextMenu,
  setContextMenu,
  pickupRewardItem,
  handleDiscardPickupItem,
  handleOpenBackpackFromPickup,
  isTierSelectorOpen,
  setIsTierSelectorOpen,
  isWeatherWidgetExpanded,
  setIsWeatherWidgetExpanded,
  friendIdInput,
  setFriendIdInput,
  setSearchMarkerPos,
  searchTag,
  setSearchTag,
  handleRefresh,
  selectedUser,
  setSelectedUser,
  setActiveTab,
  setIsLooterGameMode,
  setIsSheetExpanded,
  looterStateObj,
  looterActions,
  isLooterGameMode,
  mainTab,
  myAvatarUrl,
  myDisplayName,
  myObfPos,
  currentProvince,
  weatherData,
  isDesktop,
  isSocketConnecting,
  isSheetExpanded,
  camera,
}) => {
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(400);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [exploreSubTab, setExploreSubTab] = useState<string>('games');
  const [socialSubTab, setSocialSubTab] = useState<string>('posts');
  const looterUi = useLooterState();

  const isSelectedPostSelf = selectedPost
    ? (selectedPost.author?.id === wsCtx.myUserId || selectedPost.user_id === wsCtx.myUserId)
    : false;
  const handleSearchOverlayClose = useCallback(() => {
    setIsSearchOverlayOpen(false);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (isSearchOverlayOpen) {
        setIsSearchOverlayOpen(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isSearchOverlayOpen]);

  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  const shouldHideFullscreenHandle = !!(
    isSearchOverlayOpen ||
    selectedPost ||
    contextMenu ||
    pickupRewardItem ||
    isTierSelectorOpen ||
    looterUi.encounter ||
    looterUi.combatResult ||
    looterUi.showCurseModal ||
    looterUi.showMinigame ||
    looterUi.isItemDragging
  );

  if (!portalTarget) return null;

  return createPortal(
    <div className="fixed inset-0 z-[320] isolate pointer-events-none">
      <div className="pointer-events-auto">
        <FullscreenToggle isDesktop={isDesktop} blocked={shouldHideFullscreenHandle} />
      </div>

        <SearchHeader
          isDesktop={isDesktop}
          isSheetExpanded={isSheetExpanded}
          setIsSearchOverlayOpen={setIsSearchOverlayOpen}
          handleTabClick={nav.handleTabClick}
          currentProvince={currentProvince}
        myObfPos={myObfPos}
        onWeatherClick={() => setIsWeatherWidgetExpanded(true)}
      />

      <MapControls
        isSocketConnecting={isSocketConnecting}
        isSidebarOpen={false}
        weatherData={weatherData}
        currentProvince={currentProvince}
        myObfPos={myObfPos}
        friendLocInput={friendIdInput}
        filterDistance={50}
        filterAgeMin={13}
        filterAgeMax={99}
        searchTag={searchTag}
        mapMode={nav.mapMode}
        setIsSidebarOpen={() => {}}
        setFriendLocInput={setFriendIdInput}
        setSearchMarkerPos={setSearchMarkerPos}
        setFilterDistance={() => {}}
        setFilterAgeMin={() => {}}
        setFilterAgeMax={() => {}}
        setSearchTag={setSearchTag}
        handleRefresh={handleRefresh}
        handleCenter={nav.handleCenter}
        handleCenterTo={nav.handleCenterTo}
        setMapMode={nav.setMapMode}
        cameraZ={camera.cameraZ}
        perspectivePx={nav.perspectivePx}
        setCameraZ={camera.setCameraZ}
        cameraHeightOffset={camera.cameraHeightOffset}
        cameraPitchOverride={camera.cameraPitchOverride}
        setCameraHeightOffset={camera.setCameraHeightOffset}
        setCameraPitchOverride={camera.setCameraPitchOverride}
        isWidgetExpanded={isWeatherWidgetExpanded}
        setIsWidgetExpanded={setIsWeatherWidgetExpanded}
        isSheetExpanded={isSheetExpanded}
      />

      <NavigationBar
        mainTab={nav.mainTab}
        selectedUser={selectedUser}
        isDesktop={isDesktop}
        handleTabClick={nav.handleTabClick}
        user={user}
        isSheetExpanded={isSheetExpanded}
      />

      <BottomSheet
        isDesktop={isDesktop}
        isSheetExpanded={isSheetExpanded}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        activeTab={nav.activeTab}
        mainTab={nav.mainTab}
        nearbyUsers={wsCtx.nearbyUsers}
        friends={friends}
        games={games}
        userGames={posts.userGames}
        userPosts={posts.userPosts}
        feedPosts={posts.feedPosts}
        myUserId={wsCtx.myUserId || null}
        myDisplayName={wsCtx.myDisplayName}
        myObfPos={geo.myObfPos}
        user={user}
        searchTag={searchTag}
        isCreatingPost={posts.isCreatingPost}
        postTitle={posts.postTitle}
        postPrivacy={posts.postPrivacy}
        postIsStarred={posts.postIsStarred}
        isSavingPost={posts.isSavingPost}
        galleryActive={wsCtx.galleryActive}
        currentProvince={currentProvince}
        radius={nav.radius}
        fetchUserPosts={posts.fetchUserPosts}
        fetchFeedPosts={posts.fetchFeedPosts}
        showNotification={showNotification}
        ws={wsCtx.ws}
        panX={nav.panX}
        panY={nav.panY}
        onLocateUser={(lat, lng) => {
          nav.handleCenterTo(lat, lng);
          nav.setVisualScale(2);
        }}
        onOpenChat={onOpenChat}
        handleUpdateRadius={nav.handleUpdateRadius}
        setIsSheetExpanded={nav.setIsSheetExpanded}
        setActiveTab={nav.setActiveTab}
        setMainTab={nav.setMainTab}
        setSearchTag={setSearchTag}
        setIsSearchOverlayOpen={setIsSearchOverlayOpen}
        panelWidth={panelWidth}
        setPanelWidth={setPanelWidth}
        setMyDisplayName={wsCtx.setMyDisplayName}
        myAvatarUrl={wsCtx.myAvatarUrl}
        setMyAvatarUrl={wsCtx.setMyAvatarUrl}
        setIsCreatingPost={posts.setIsCreatingPost}
        setPostTitle={posts.setPostTitle}
        setPostPrivacy={posts.setPostPrivacy}
        setPostIsStarred={posts.setPostIsStarred}
        handleCreatePost={posts.handleCreatePost}
        handleUpdatePostPrivacy={posts.handleUpdatePostPrivacy}
        handleStarPost={posts.handleStarPost}
        handleDeletePost={posts.handleDeletePost}
        handlePlayGame={handlePlayGame}
        cloudflareUrl={cloudflareUrl}
        triggerAuth={triggerAuth}
        requireAuth={requireAuth}
        logout={logout}
        externalOpenList={externalOpenList}
        onOpenListChange={onOpenListChange}
        onPublishSuccess={handleRefresh}
        requestLocation={geo.requestLocation}
        externalApi={externalApi}
        onPostClick={(post) => setSelectedPost(post)}
        exploreSubTab={exploreSubTab}
        socialSubTab={socialSubTab}
        onExploreSubTabChange={setExploreSubTab}
        onSocialSubTabChange={setSocialSubTab}
      />

      {contextMenu && (
        <div className="pointer-events-auto">
          <ContextMenu
            contextMenu={contextMenu}
            setContextMenu={setContextMenu}
            setMyObfPos={geo.setMyObfPos}
            panX={nav.panX}
            panY={nav.panY}
            ws={wsCtx.ws}
            setSelectedUser={nav.setSelectedUser}
          />
        </div>
      )}

      {pickupRewardItem && (
        <div className="pointer-events-auto">
          <PickupRewardModal
            item={pickupRewardItem}
            onDiscard={handleDiscardPickupItem}
            onOpenBackpack={handleOpenBackpackFromPickup}
          />
        </div>
      )}

      {selectedPost && (
        <div className="pointer-events-auto">
          <PostDetailOverlay
            post={selectedPost}
            isSelf={isSelectedPostSelf}
            onClose={() => setSelectedPost(null)}
            onAuthorClick={(author) => {
              setSelectedPost(null);
              nav.setSelectedUser(author);
              nav.setActiveTab('posts');
            }}
            isDesktop={isDesktop}
            isSheetExpanded={isSheetExpanded}
            panelWidth={panelWidth}
            externalApi={externalApi}
            requireAuth={requireAuth}
            onStar={posts.handleStarPost}
            onDelete={posts.handleDeletePost}
            onUpdatePrivacy={posts.handleUpdatePostPrivacy}
            fetchUserPosts={posts.fetchUserPosts}
          />
        </div>
      )}

      <div className="pointer-events-auto">
        <TierSelectionOverlay
          isOpen={isTierSelectorOpen}
          onClose={() => setIsTierSelectorOpen(false)}
          currentGold={looterStateObj.looterGold}
          onSelectTier={async (tier) => {
            try {
              if (typeof looterActions.setWorldTier === 'function') {
                setIsTierSelectorOpen(false);
                setIsLooterGameMode(true);
                looterActions.setWorldTier(tier).catch(err => {
                  console.error('[AlinMap] Background setWorldTier error:', err);
                });
              }
              if (typeof nav.handleCenterTo === 'function') {
                nav.handleCenterTo(looterStateObj.fortressLat || 0, looterStateObj.fortressLng || 0);
              }
            } catch (err) {
              console.error('[AlinMap] onSelectTier error:', err);
            }
          }}
        />
      </div>

      {isSearchOverlayOpen && (
        <div className="pointer-events-auto">
          <SearchOverlay
            searchTag={searchTag}
            setSearchTag={setSearchTag}
            nearbyUsers={wsCtx.nearbyUsers}
            setSelectedUser={nav.setSelectedUser}
            setActiveTab={nav.setActiveTab}
            setIsSheetExpanded={nav.setIsSheetExpanded}
            handlePlayGame={handlePlayGame}
            onClose={handleSearchOverlayClose}
            isDesktop={isDesktop}
            isSheetExpanded={isSheetExpanded}
            panelWidth={panelWidth}
          />
        </div>
      )}

    </div>,
    portalTarget
  );
};

export default React.memo(AlinMapUiOverlay);
