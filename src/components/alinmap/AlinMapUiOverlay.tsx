import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MotionValue, useMotionValueEvent } from 'framer-motion';
import BottomSheet from './BottomSheet';
import ContextMenu from './ContextMenu';
import MapControls from './MapControls';
import NavigationBar from './NavigationBar';
import SearchHeader from './SearchHeader';
import PickupRewardModal from './looter-game/components/PickupRewardModal';
import TierSelectionOverlay from './looter-game/TierSelectionOverlay';
import {
  CAMERA_HEIGHT_DEFAULT_PCT,
  CAMERA_HEIGHT_MAX_PCT,
  CAMERA_HEIGHT_MIN_PCT,
  CAMERA_ROTATE_DEFAULT_DEG,
  CAMERA_ROTATE_MAX_DEG,
  CAMERA_ROTATE_MIN_DEG,
  CAMERA_ROTATE_X_DEFAULT_DEG,
  CAMERA_ROTATE_X_MAX_DEG,
  CAMERA_ROTATE_X_MIN_DEG,
  CAMERA_ROTATE_Y_DEFAULT_DEG,
  CAMERA_ROTATE_Y_MAX_DEG,
  CAMERA_ROTATE_Y_MIN_DEG,
  CAMERA_Z_DEFAULT,
  CAMERA_Z_FAR,
  CAMERA_Z_NEAR,
} from './constants';
import { useDesktopSearch } from './hooks/useDesktopSearch';
import { useGeolocation } from './hooks/useGeolocation';
import { useLooterActions } from './looter-game/LooterGameContext';
import { useAlinWebSocket } from './hooks/useAlinWebSocket';
import { useMapNavigation } from './hooks/useMapNavigation';
import { usePosts } from './features/profile/hooks/usePosts';

type CameraLabState = {
  cameraZ: MotionValue<number>;
  tiltAngle: MotionValue<number>;
  cameraHeightPct: number;
  cameraRotateDeg: number;
  cameraRotateXDeg: number;
  cameraRotateYDeg: number;
  setCameraZ: (z: number) => void;
  setCameraHeightPct: (v: number) => void;
  setCameraRotateDeg: (v: number) => void;
  setCameraRotateXDeg: (v: number) => void;
  setCameraRotateYDeg: (v: number) => void;
};

interface AlinMapUiOverlayProps {
  nav: ReturnType<typeof useMapNavigation>;
  geo: ReturnType<typeof useGeolocation>;
  wsCtx: ReturnType<typeof useAlinWebSocket>;
  search: ReturnType<typeof useDesktopSearch>;
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
  isConnecting: boolean;
  isSheetExpanded: boolean;
  camera: CameraLabState;
}

const AlinMapUiOverlay: React.FC<AlinMapUiOverlayProps> = ({
  nav,
  geo,
  wsCtx,
  search,
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
  isConnecting,
  isSheetExpanded,
  camera,
}) => {
  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  if (!portalTarget) return null;

  return createPortal(
    <div className="fixed inset-0 z-[320] isolate pointer-events-none">
      <SearchHeader
        searchTag={searchTag}
        setSearchTag={setSearchTag}
        isDesktop={isDesktop}
        isSheetExpanded={isSheetExpanded}
        setIsSheetExpanded={nav.setIsSheetExpanded}
        isLooterGameMode={isLooterGameMode}
        mainTab={mainTab}
        myAvatarUrl={myAvatarUrl}
        myDisplayName={myDisplayName}
        handleTabClick={nav.handleTabClick}
        showDesktopResults={search.showDesktopResults}
        setShowDesktopResults={search.setShowDesktopResults}
        isSearchingDesktop={search.isSearchingDesktop}
        desktopSearchResults={search.desktopSearchResults}
        nearbyUsers={wsCtx.nearbyUsers}
        setSelectedUser={nav.setSelectedUser}
        setActiveTab={nav.setActiveTab}
        handlePlayGame={handlePlayGame}
        weatherData={geo.weatherData}
        currentProvince={currentProvince}
        myObfPos={myObfPos}
        onWeatherClick={() => setIsWeatherWidgetExpanded(true)}
      />

      <MapControls
        isConnecting={isConnecting}
        isSidebarOpen={false}
        weatherData={weatherData}
        currentProvince={currentProvince}
        myObfPos={myObfPos}
        friendLocInput={friendIdInput}
        filterDistance={50}
        filterAgeMin={13}
        filterAgeMax={99}
        searchTag={searchTag}
        zoomIn={nav.zoomIn}
        zoomOut={nav.zoomOut}
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

      {typeof window !== 'undefined' && window.localStorage.getItem('alinmap_camera_lab') === 'true' && (
        <CameraLabPanel
          camera={camera}
        />
      )}
    </div>,
    portalTarget
  );
};

const CameraLabPanel = ({ camera }: { camera: CameraLabState }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [zValue, setZValue] = useState(() => camera.cameraZ.get());
  const [tiltValue, setTiltValue] = useState(() => camera.tiltAngle.get());
  const [heightValue, setHeightValue] = useState(camera.cameraHeightPct);
  const [rotateValue, setRotateValue] = useState(camera.cameraRotateDeg);

  useMotionValueEvent(camera.cameraZ, 'change', setZValue);
  useMotionValueEvent(camera.tiltAngle, 'change', setTiltValue);

  useEffect(() => setHeightValue(camera.cameraHeightPct), [camera.cameraHeightPct]);
  useEffect(() => setRotateValue(camera.cameraRotateDeg), [camera.cameraRotateDeg]);

  return (
    <div
      className={`absolute right-2 top-20 z-[380] pointer-events-auto select-none rounded-xl border border-white/15 bg-slate-950/90 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md ${isCollapsed ? 'w-[160px] p-2' : 'w-[320px] p-3'}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200">Camera Lab</div>
          <div className="text-[9px] text-slate-300">Kéo depth, height và rotate X/Y/Z để chỉnh camera map.</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white/90 hover:bg-white/10"
            onClick={() => {
              camera.setCameraZ(CAMERA_Z_DEFAULT);
              camera.setCameraHeightPct(CAMERA_HEIGHT_DEFAULT_PCT);
              camera.setCameraRotateDeg(CAMERA_ROTATE_DEFAULT_DEG);
              camera.setCameraRotateXDeg(CAMERA_ROTATE_X_DEFAULT_DEG);
              camera.setCameraRotateYDeg(CAMERA_ROTATE_Y_DEFAULT_DEG);
            }}
          >
            Reset
          </button>
          <button
            type="button"
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white/90 hover:bg-white/10"
            onClick={() => setIsCollapsed((prev) => !prev)}
          >
            {isCollapsed ? 'Mở' : 'Thu gọn'}
          </button>
        </div>
      </div>

      <div className={isCollapsed ? 'mt-3 hidden space-y-3' : 'mt-3 space-y-3'}>
        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-slate-300">
            <span>Camera Z</span>
            <span className="tabular-nums text-cyan-100">{Math.round(zValue)}</span>
          </div>
          <input
            type="range"
            min={CAMERA_Z_FAR}
            max={CAMERA_Z_NEAR}
            step={1}
            value={zValue}
            onChange={(e) => camera.setCameraZ(Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-slate-300">
            <span>Camera Height</span>
            <span className="tabular-nums text-cyan-100">{heightValue}%</span>
          </div>
          <input
            type="range"
            min={CAMERA_HEIGHT_MIN_PCT}
            max={CAMERA_HEIGHT_MAX_PCT}
            step={1}
            value={heightValue}
            onChange={(e) => {
              const next = Number(e.target.value);
              setHeightValue(next);
              camera.setCameraHeightPct(next);
            }}
            className="w-full accent-cyan-400"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-slate-300">
            <span>Rotate Z</span>
            <span className="tabular-nums text-cyan-100">{rotateValue}deg</span>
          </div>
          <input
            type="range"
            min={CAMERA_ROTATE_MIN_DEG}
            max={CAMERA_ROTATE_MAX_DEG}
            step={1}
            value={rotateValue}
            onChange={(e) => {
              const next = Number(e.target.value);
              setRotateValue(next);
              camera.setCameraRotateDeg(next);
            }}
            className="w-full accent-cyan-400"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-slate-300">
            <span>Rotate X</span>
            <span className="tabular-nums text-cyan-100">{camera.cameraRotateXDeg}deg</span>
          </div>
          <input
            type="range"
            min={CAMERA_ROTATE_X_MIN_DEG}
            max={CAMERA_ROTATE_X_MAX_DEG}
            step={1}
            value={camera.cameraRotateXDeg}
            onChange={(e) => camera.setCameraRotateXDeg(Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-slate-300">
            <span>Rotate Y</span>
            <span className="tabular-nums text-cyan-100">{camera.cameraRotateYDeg}deg</span>
          </div>
          <input
            type="range"
            min={CAMERA_ROTATE_Y_MIN_DEG}
            max={CAMERA_ROTATE_Y_MAX_DEG}
            step={1}
            value={camera.cameraRotateYDeg}
            onChange={(e) => camera.setCameraRotateYDeg(Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-[10px] text-slate-300">
          <div className="flex items-center justify-between">
            <span>Current tilt</span>
            <span className="font-black text-amber-100 tabular-nums">{tiltValue.toFixed(1)}deg</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span>Camera model</span>
            <span className="font-black text-cyan-100 tabular-nums">FOV 75deg</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AlinMapUiOverlay);
