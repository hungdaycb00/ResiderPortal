import React from 'react';
import { Database, ShoppingBag, X } from 'lucide-react';
import BackpackView from '../features/backpack/components/BackpackView';
import IntegratedStoragePanel from '../features/backpack/components/IntegratedStoragePanel';
import CreatorTabView from '../features/creator/components/CreatorTabView';
import DiscoverView from '../features/explore/components/DiscoverView';
import MyProfileView from '../features/profile/components/MyProfileView';
import SelectedUserView from '../features/profile/components/SelectedUserView';
import { useProfile } from '../features/profile/context/ProfileContext';
import NotificationsView from '../features/social/components/NotificationsView';
import SocialView from '../features/social/components/SocialView';
import { isLooterAtFortress, useLooterGame } from '../looter-game/LooterGameContext';
import SheetSearchResults from '../SheetSearchResults';
import type { BottomSheetProps, ExploreSubTab, SocialSubTab } from './types';

interface BottomSheetContentProps extends BottomSheetProps {
    deferredSearchTag: string;
    exploreSubTab: ExploreSubTab;
    socialSubTab: SocialSubTab;
    shouldHideSearch: boolean;
    shouldRenderSheetContent: boolean;
    setExploreSubTab: (tab: ExploreSubTab) => void;
    setSocialSubTab: (tab: SocialSubTab) => void;
    onSearchClick: () => void;
    onEnterWorld: () => void;
}

const BottomSheetContent: React.FC<BottomSheetContentProps> = ({
    activeTab,
    cloudflareUrl,
    currentProvince,
    deferredSearchTag,
    exploreSubTab,
    externalApi,
    externalOpenList,
    fetchUserPosts,
    friends,
    galleryActive,
    games,
    handleCreatePost,
    handleDeletePost,
    handlePlayGame,
    handleStarPost,
    handleUpdatePostPrivacy,
    handleUpdateRadius,
    isDesktop,
    isCreatingPost,
    isSavingPost,
    mainTab,
    myAvatarUrl,
    myDisplayName,
    myObfPos,
    myUserId,
    nearbyUsers,
    onEnterWorld,
    onLocateUser,
    onOpenListChange,
    onPublishSuccess,
    panX,
    panY,
    postPrivacy,
    postIsStarred,
    postTitle,
    radius,
    requireAuth,
    requestLocation,
    selectedUser,
    setActiveTab,
    setIsCreatingPost,
    setIsSheetExpanded,
    setMainTab,
    setMyAvatarUrl,
    setMyDisplayName,
    setPostPrivacy,
    setPostIsStarred,
    setPostTitle,
    setSearchTag,
    setSelectedUser,
    setExploreSubTab,
    setSocialSubTab,
    onSearchClick,
    shouldHideSearch,
    shouldRenderSheetContent,
    showNotification,
    socialSubTab,
    triggerAuth,
    user,
    userGames,
    userPosts,
    feedPosts,
    ws,
    logout,
    onPostClick,
}) => {
    const {
        encounter,
        currentLat,
        currentLng,
        fortressLat,
        fortressLng,
        worldTier,
        isItemDragging,
        isIntegratedStorageOpen,
        fortressStorageMode,
        openFortressStorage,
        setIsFortressStorageOpen,
        setIsIntegratedStorageOpen,
    } = useLooterGame();
    const { isVisibleOnMap, setIsVisibleOnMap } = useProfile();
    const isAtFortress = worldTier === -1 || isLooterAtFortress({ currentLat, currentLng, fortressLat, fortressLng });

    const pulseSellZone = React.useCallback(() => {
        const sellZone = document.getElementById('global-sell-zone');
        if (!sellZone || typeof sellZone.animate !== 'function') return;

        sellZone.animate(
            [
                { transform: 'scale(1)', boxShadow: '0 0 24px rgba(234, 179, 8, 0.35)' },
                { transform: 'scale(1.08)', boxShadow: '0 0 0 4px rgba(234, 179, 8, 0.36), 0 0 32px rgba(234, 179, 8, 0.45)' },
                { transform: 'scale(1)', boxShadow: '0 0 24px rgba(234, 179, 8, 0.35)' },
            ],
            { duration: 900, easing: 'ease-out' }
        );
    }, []);

    const isFortressStorageActive = isIntegratedStorageOpen && fortressStorageMode === 'fortress';

    const handleToggleFortressStorage = React.useCallback(() => {
        if (isFortressStorageActive) {
            setIsIntegratedStorageOpen(false);
            return;
        }
        openFortressStorage('fortress');
    }, [isFortressStorageActive, openFortressStorage, setIsIntegratedStorageOpen]);

    const handleOpenShop = React.useCallback(() => {
        openFortressStorage('fortress');
        window.setTimeout(() => {
            pulseSellZone();
        }, 220);
    }, [openFortressStorage, pulseSellZone]);

    const handleCloseBackpackTab = React.useCallback(() => {
        setIsFortressStorageOpen(false);
        setIsIntegratedStorageOpen(false);
        (window as any).collapseLooterTab?.();
    }, [setIsFortressStorageOpen, setIsIntegratedStorageOpen]);

    if (mainTab === 'backpack') {
        return (
            <div className={`flex-1 relative z-[100] flex flex-col overflow-hidden ${isDesktop ? 'min-h-0' : 'overflow-visible'}`}>
                {isDesktop && isIntegratedStorageOpen && (
                    <div className="flex-[0.44] min-h-0 border-b border-white/5">
                        <IntegratedStoragePanel variant="inline" />
                    </div>
                )}
                {!isDesktop && isAtFortress && (
                    <div className="absolute left-3 top-2 z-[140] flex items-center gap-2">
                            <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={handleToggleFortressStorage}
                                disabled={isItemDragging}
                                aria-pressed={isFortressStorageActive}
                                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-transparent transition-all active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-60 ${
                                    isFortressStorageActive
                                        ? 'text-amber-50 ring-1 ring-amber-200/40'
                                        : 'text-amber-200/90'
                                }`}
                                title={isFortressStorageActive ? 'Đóng kho thành trì' : 'Mở kho thành trì'}
                            >
                                {isFortressStorageActive ? <X className="h-[18px] w-[18px] shrink-0" /> : <Database className="h-[18px] w-[18px] shrink-0" />}
                            </button>
                            <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={handleOpenShop}
                                disabled={isItemDragging}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-transparent text-emerald-100/90 transition-all active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-60"
                                title="Mở shop thành trì"
                            >
                                <ShoppingBag className="h-[18px] w-[18px] shrink-0" />
                            </button>
                    </div>
                )}
                <div className={`${isDesktop && isIntegratedStorageOpen ? 'flex-[0.56] min-h-0' : 'flex-1 min-h-0'}`}>
                    <BackpackView onEnterWorld={onEnterWorld} onCloseTab={handleCloseBackpackTab} readOnly={!!encounter} />
                </div>
            </div>
        );
    }

    return (
        <div
            data-immersive-scroll
            className="flex-1 overflow-y-auto px-4 pb-32 md:pb-6 md:pt-[76px] relative z-[100] subtle-scrollbar"
            style={{ direction: 'rtl' }}
            onPointerDown={(e) => e.stopPropagation()}
        >
            {shouldRenderSheetContent && (
                <div style={{ direction: 'ltr' }}>
                    {!selectedUser && !shouldHideSearch && (
                        <SheetSearchResults
                            searchTag={deferredSearchTag}
                            nearbyUsers={nearbyUsers}
                            setSelectedUser={setSelectedUser}
                            setActiveTab={setActiveTab}
                            setIsSheetExpanded={setIsSheetExpanded}
                            setSearchTag={setSearchTag}
                            handlePlayGame={handlePlayGame}
                        />
                    )}

                    {selectedUser ? (
                        <SelectedUserView
                            selectedUser={selectedUser}
                            setSelectedUser={(u) => {
                                setSelectedUser(u);
                                if (!u) {
                                    setIsSheetExpanded(false);
                                }
                            }}
                            activeTab={activeTab as any}
                            setActiveTab={setActiveTab as any}
                            fetchUserPosts={fetchUserPosts}
                            friends={friends}
                            onLocateUser={onLocateUser!}
                            ws={ws}
                            games={userGames}
                            userPosts={userPosts}
                            handleStarPost={handleStarPost}
                            handleDeletePost={handleDeletePost}
                            externalApi={externalApi}
                            requireAuth={requireAuth}
                            onPostClick={onPostClick}
                        />
                    ) : (
                        <div className="pt-2">
                            {mainTab === 'discover' && (
                                <div className="flex flex-col h-full">
                            {exploreSubTab === 'games' ? (
                                        <DiscoverView
                                            games={games}
                                            nearbyUsers={nearbyUsers}
                                            setSearchTag={setSearchTag}
                                            handlePlayGame={handlePlayGame}
                                            onSearchClick={onSearchClick}
                                        />
                                    ) : (
                                        <CreatorTabView
                                            user={user}
                                            externalApi={externalApi}
                                            showNotification={showNotification}
                                            cloudflareUrl={cloudflareUrl}
                                            onPublishSuccess={onPublishSuccess}
                                        />
                                    )}
                                </div>
                            )}

                            {mainTab === 'friends' && (
                                <div className="flex flex-col h-full">
                                    <SocialView
                                        myUserId={myUserId}
                                        myObfPos={myObfPos}
                                        friends={friends}
                                        nearbyUsers={nearbyUsers}
                                        setSelectedUser={setSelectedUser}
                                        radius={radius}
                                        handleUpdateRadius={handleUpdateRadius}
                                        isVisibleOnMap={isVisibleOnMap}
                                        setIsVisibleOnMap={setIsVisibleOnMap}
                                        requestLocation={requestLocation}
                                        ws={ws}
                                        feedPosts={feedPosts}
                                        isCreatingPost={isCreatingPost}
                                        setIsCreatingPost={setIsCreatingPost}
                                        postTitle={postTitle}
                                        setPostTitle={setPostTitle}
                                        postPrivacy={postPrivacy}
                                        setPostPrivacy={setPostPrivacy}
                                        postIsStarred={postIsStarred}
                                        setPostIsStarred={setPostIsStarred}
                                        isSavingPost={isSavingPost}
                                        handleCreatePost={handleCreatePost}
                                        handleUpdatePostPrivacy={handleUpdatePostPrivacy}
                                        handleStarPost={handleStarPost}
                                        handleDeletePost={handleDeletePost}
                                        fetchUserPosts={fetchUserPosts}
                                        externalApi={externalApi}
                                        galleryActive={galleryActive}
                                        user={user}
                                        requireAuth={requireAuth}
                                        socialSubTab={socialSubTab}
                                        onSearchClick={onSearchClick}
                                        onPostClick={onPostClick}
                                    />

                                </div>
                            )}

                            {mainTab === 'notifications' && (
                                <NotificationsView externalApi={externalApi} />
                            )}

                            {mainTab === 'profile' && !selectedUser && (
                                <MyProfileView
                                    myUserId={myUserId}
                                    myDisplayName={myDisplayName}
                                    myAvatarUrl={myAvatarUrl}
                                    currentProvince={currentProvince}
                                    activeTab={activeTab as any}
                                    setActiveTab={setActiveTab as any}
                                    setMyDisplayName={setMyDisplayName}
                                    games={games}
                                    userPosts={userPosts}
                                    ws={ws}
                                    myObfPos={myObfPos}
                                    user={user}
                                    showNotification={showNotification}
                                    setIsSheetExpanded={setIsSheetExpanded}
                                    setMainTab={setMainTab}
                                    handleStarPost={handleStarPost}
                                    handleDeletePost={handleDeletePost}
                                    handleUpdatePostPrivacy={handleUpdatePostPrivacy}
                                    fetchUserPosts={fetchUserPosts}
                                    externalApi={externalApi}
                                    setMyAvatarUrl={setMyAvatarUrl}
                                    triggerAuth={triggerAuth}
                                    requireAuth={requireAuth}
                                    logout={logout}
                                    requestLocation={requestLocation}
                                    friends={friends}
                                    setSelectedUser={setSelectedUser}
                                    isCreatingPost={isCreatingPost}
                                    setIsCreatingPost={setIsCreatingPost}
                                    postTitle={postTitle}
                                    setPostTitle={setPostTitle}
                                    postPrivacy={postPrivacy}
                                    setPostPrivacy={setPostPrivacy}
                                    postIsStarred={postIsStarred}
                                    setPostIsStarred={setPostIsStarred}
                                    isSavingPost={isSavingPost}
                                    handleCreatePost={handleCreatePost}
                                    onSearchClick={onSearchClick}
                                    onPostClick={onPostClick}
                                />
                            )}

                            {mainTab === 'creator' && (
                                <CreatorTabView
                                    user={user}
                                    showNotification={showNotification}
                                    onPublishSuccess={onPublishSuccess}
                                    onPlayGame={handlePlayGame}
                                    cloudflareUrl={cloudflareUrl}
                                    triggerAuth={triggerAuth}
                                    externalOpenList={externalOpenList}
                                    onOpenListChange={onOpenListChange}
                                />
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BottomSheetContent;
