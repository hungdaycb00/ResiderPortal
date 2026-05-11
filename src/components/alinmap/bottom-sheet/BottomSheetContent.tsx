import React from 'react';
import { Database, ShoppingBag } from 'lucide-react';
import BackpackView from '../features/backpack/components/BackpackView';
import CreatorTabView from '../features/creator/components/CreatorTabView';
import DiscoverView from '../features/explore/components/DiscoverView';
import MyProfileView from '../features/profile/components/MyProfileView';
import SelectedUserView from '../features/profile/components/SelectedUserView';
import { useProfile } from '../features/profile/context/ProfileContext';
import NotificationsView from '../features/social/components/NotificationsView';
import SocialView from '../features/social/components/SocialView';
import { isLooterAtFortress, useLooterGame } from '../looter-game/LooterGameContext';
import SheetSearchResults from '../SheetSearchResults';
import SubTabSwitcher from './SubTabSwitcher';
import type { BottomSheetProps, ExploreSubTab, SocialSubTab } from './types';

interface BottomSheetContentProps extends BottomSheetProps {
    deferredSearchTag: string;
    exploreSubTab: ExploreSubTab;
    socialSubTab: SocialSubTab;
    shouldHideSearch: boolean;
    shouldRenderSheetContent: boolean;
    setExploreSubTab: (tab: ExploreSubTab) => void;
    setSocialSubTab: (tab: SocialSubTab) => void;
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
        openFortressStorage,
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

    const handleOpenFortressStorage = React.useCallback(() => {
        openFortressStorage('fortress');
    }, [openFortressStorage]);

    const handleOpenShop = React.useCallback(() => {
        openFortressStorage('fortress');
        window.setTimeout(() => {
            pulseSellZone();
        }, 220);
    }, [openFortressStorage, pulseSellZone]);

    if (mainTab === 'backpack') {
        return (
            <div className="flex-1 relative z-[100] flex flex-col overflow-visible">
                {!isDesktop && isAtFortress && (
                    <div className="px-3 pt-2">
                        <div className="flex items-stretch gap-2 rounded-3xl border border-amber-400/15 bg-black/35 p-2 backdrop-blur-xl shadow-[0_12px_30px_rgba(0,0,0,0.25)]">
                            <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={handleOpenFortressStorage}
                                disabled={isItemDragging}
                                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-amber-400/35 bg-amber-500/15 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-amber-200 shadow-[0_8px_20px_rgba(245,158,11,0.18)] transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                                title="Mở kho thành trì"
                            >
                                <Database className="h-4 w-4 shrink-0" />
                                <span>Mở kho thành trì</span>
                            </button>
                            <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={handleOpenShop}
                                disabled={isItemDragging}
                                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-200 shadow-[0_8px_20px_rgba(16,185,129,0.16)] transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                                title="Mở shop thành trì"
                            >
                                <ShoppingBag className="h-4 w-4 shrink-0" />
                                <span>Shop</span>
                            </button>
                        </div>
                    </div>
                )}
                <BackpackView onEnterWorld={onEnterWorld} readOnly={!!encounter} />
            </div>
        );
    }

    return (
        <div
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
                                        <DiscoverView games={games} nearbyUsers={nearbyUsers} setSearchTag={setSearchTag} handlePlayGame={handlePlayGame} />
                                    ) : (
                                        <CreatorTabView
                                            user={user}
                                            externalApi={externalApi}
                                            showNotification={showNotification}
                                            cloudflareUrl={cloudflareUrl}
                                            onPublishSuccess={onPublishSuccess}
                                        />
                                    )}

                                    {!selectedUser && (
                                        <SubTabSwitcher
                                            value={exploreSubTab}
                                            onChange={setExploreSubTab}
                                            options={[
                                                { value: 'games', label: 'Games' },
                                                { value: 'creator', label: 'Creator' },
                                            ]}
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
                                        onPostClick={onPostClick}
                                    />

                                    {!selectedUser && (
                                        <SubTabSwitcher
                                            value={socialSubTab}
                                            onChange={setSocialSubTab}
                                            options={[
                                                { value: 'posts', label: 'Posts' },
                                                { value: 'nearby', label: 'Nearby' },
                                            ]}
                                        />
                                    )}
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
