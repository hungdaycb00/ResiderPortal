import type React from 'react';
import BackpackView from '../features/backpack/components/BackpackView';
import CreatorTabView from '../features/creator/components/CreatorTabView';
import DiscoverView from '../features/explore/components/DiscoverView';
import MyProfileView from '../features/profile/components/MyProfileView';
import SelectedUserView from '../features/profile/components/SelectedUserView';
import { useProfile } from '../features/profile/context/ProfileContext';
import NotificationsView from '../features/social/components/NotificationsView';
import SocialView from '../features/social/components/SocialView';
import { useLooterGame } from '../looter-game/LooterGameContext';

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
}) => {
    const { encounter } = useLooterGame();
    const { isVisibleOnMap, setIsVisibleOnMap } = useProfile();

    if (mainTab === 'backpack') {
        return (
            <div className="flex-1 relative z-[100] flex flex-col overflow-visible">
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
