import React, { useCallback, useEffect, useState } from 'react';
import AlinMapUiOverlayView, { type CameraLabState } from './AlinMapUiOverlayView';
import { useGeolocation } from './hooks/useGeolocation';
import { useLooterActions, useLooterState } from './looter-game/LooterGameContext';
import { useAlinWebSocket } from './hooks/useAlinWebSocket';
import { useMapNavigation } from './hooks/useMapNavigation';
import { usePosts } from './features/profile/hooks/usePosts';

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
  selectedPost: any | null;
  setSelectedPost: (post: any | null) => void;
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
  handleUpdateAvatar?: (url: string) => Promise<void> | void;
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
  selectedPost,
  setSelectedPost,
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
  handleUpdateAvatar,
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
  const [exploreSubTab, setExploreSubTab] = useState<string>('games');
  const [socialSubTab, setSocialSubTab] = useState<string>('posts');
  const looterUi = useLooterState();

  const normalizeProfileUser = useCallback((candidate: any, fallbackSource?: any) => ({
    ...candidate,
    id: candidate?.id || candidate?.uid || candidate?.user_id || candidate?.author_id || fallbackSource?.id || fallbackSource?.uid || fallbackSource?.user_id || null,
    displayName: candidate?.displayName || candidate?.name || candidate?.username || fallbackSource?.displayName || fallbackSource?.name || fallbackSource?.username || 'User',
    username: candidate?.username || candidate?.displayName || candidate?.name || fallbackSource?.username || fallbackSource?.displayName || fallbackSource?.name || 'User',
    avatar_url: candidate?.avatar_url || candidate?.photoURL || candidate?.avatarUrl || fallbackSource?.avatar_url || fallbackSource?.photoURL || fallbackSource?.avatarUrl || null,
    photoURL: candidate?.photoURL || candidate?.avatar_url || candidate?.avatarUrl || fallbackSource?.photoURL || fallbackSource?.avatar_url || fallbackSource?.avatarUrl || null,
    status: candidate?.status || fallbackSource?.status || '',
    province: candidate?.province || fallbackSource?.province || '',
    lat: candidate?.lat ?? fallbackSource?.lat ?? null,
    lng: candidate?.lng ?? fallbackSource?.lng ?? null,
    isSelf: candidate?.isSelf ?? fallbackSource?.isSelf ?? false,
  }), []);
  const handleSearchOverlayClose = useCallback(() => {
    setIsSearchOverlayOpen(false);
  }, []);

  const handleSheetExpandedChange = useCallback((expanded: boolean) => {
    nav.setIsSheetExpanded(expanded);
    if (!expanded) {
      setSelectedPost(null);
    }
  }, [nav, setSelectedPost]);

  const handleSheetSelectedUserChange = useCallback((nextUser: any) => {
    setSelectedPost(null);
    setSelectedUser(nextUser);
  }, [setSelectedPost, setSelectedUser]);

  const handleOpenAuthorFromPost = useCallback((author: any) => {
    if (!author) return;
    const normalizedAuthor = normalizeProfileUser(author, selectedPost?.author);
    setSelectedPost(null);
    nav.setSelectedUser(normalizedAuthor);
    nav.setMainTab('profile');
    nav.setActiveTab('info');
    nav.setIsSheetExpanded(true);
  }, [nav, normalizeProfileUser, selectedPost?.author, setSelectedPost]);

  useEffect(() => {
    if (!isSheetExpanded && selectedPost) {
      setSelectedPost(null);
    }
  }, [isSheetExpanded, selectedPost, setSelectedPost]);

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

  return (
    <AlinMapUiOverlayView
      portalTarget={portalTarget}
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
      selectedUser={selectedUser}
      setSelectedUser={handleSheetSelectedUserChange}
      setActiveTab={setActiveTab}
      setIsLooterGameMode={setIsLooterGameMode}
      setIsSheetExpanded={setIsSheetExpanded}
      looterStateObj={looterStateObj}
      looterActions={looterActions}
      isLooterGameMode={isLooterGameMode}
      mainTab={mainTab}
      myAvatarUrl={myAvatarUrl}
      myDisplayName={myDisplayName}
      handleUpdateAvatar={handleUpdateAvatar}
      myObfPos={myObfPos}
      currentProvince={currentProvince}
      weatherData={weatherData}
      isDesktop={isDesktop}
      isSocketConnecting={isSocketConnecting}
      isSheetExpanded={isSheetExpanded}
      camera={camera}
      panelWidth={panelWidth}
      setPanelWidth={setPanelWidth}
      isSearchOverlayOpen={isSearchOverlayOpen}
      setIsSearchOverlayOpen={setIsSearchOverlayOpen}
      shouldHideFullscreenHandle={shouldHideFullscreenHandle}
      handleSearchOverlayClose={handleSearchOverlayClose}
      handleSheetExpandedChange={handleSheetExpandedChange}
      handleSheetSelectedUserChange={handleSheetSelectedUserChange}
      handleOpenAuthorFromPost={handleOpenAuthorFromPost}
      exploreSubTab={exploreSubTab}
      socialSubTab={socialSubTab}
      onExploreSubTabChange={setExploreSubTab}
      onSocialSubTabChange={setSocialSubTab}
    />
  );
};

export default React.memo(AlinMapUiOverlay);
