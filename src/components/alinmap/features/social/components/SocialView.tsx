import React from 'react';
import SocialNearbySection from './SocialNearbySection';
import SocialPostsSection from './SocialPostsSection';

interface SocialViewProps {
    myUserId: string | null;
    myObfPos: { lat: number; lng: number } | null;
    friends: any[];
    nearbyUsers: any[];
    setSelectedUser: (user: any) => void;
    radius: number;
    handleUpdateRadius: (radius: number) => void;
    isVisibleOnMap: boolean;
    setIsVisibleOnMap: (v: boolean) => void;
    requireAuth?: (actionLabel: string, afterLogin?: () => void) => boolean;
    requestLocation?: (forceInvisible?: boolean, wsRef?: React.MutableRefObject<WebSocket | null>, setIsVisibleOnMap?: (v: boolean) => void) => void;
    ws: React.MutableRefObject<WebSocket | null>;
    feedPosts: any[];
    isCreatingPost: boolean;
    setIsCreatingPost: (v: boolean) => void;
    postTitle: string;
    setPostTitle: (v: string) => void;
    postPrivacy: 'public' | 'friends' | 'private';
    setPostPrivacy: (v: 'public' | 'friends' | 'private') => void;
    postIsStarred: boolean;
    setPostIsStarred: (v: boolean) => void;
    isSavingPost: boolean;
    handleCreatePost: (files: File[]) => void;
    handleUpdatePostPrivacy: (postId: string, privacy: string) => void;
    handleStarPost: (postId: string) => void;
    handleDeletePost: (postId: string) => void;
    fetchUserPosts: (uid: string) => void;
    externalApi: any;
    galleryActive: boolean;
    user: any;
    socialSubTab: 'posts' | 'nearby';
    onPostClick?: (post: any) => void;
}

const SocialView: React.FC<SocialViewProps> = ({
    myUserId, myObfPos, nearbyUsers,
    setSelectedUser, radius, handleUpdateRadius,
    isVisibleOnMap, setIsVisibleOnMap, requireAuth, requestLocation, ws,
    feedPosts, isCreatingPost, setIsCreatingPost, postTitle, setPostTitle,
    postPrivacy, setPostPrivacy, postIsStarred, setPostIsStarred,
    isSavingPost, handleCreatePost,
    handleUpdatePostPrivacy, handleStarPost, handleDeletePost, fetchUserPosts,
    externalApi, socialSubTab,
    onPostClick,
}) => {
    return (
        <div className="flex flex-col h-full relative">
            <div className="flex-1 overflow-y-auto space-y-4 pb-20">
                <h3 className="text-lg font-black text-gray-900 px-1">Social</h3>

                {socialSubTab === 'posts' ? (
                    <SocialPostsSection
                        myUserId={myUserId}
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
                        handleStarPost={handleStarPost}
                        handleDeletePost={handleDeletePost}
                        handleUpdatePostPrivacy={handleUpdatePostPrivacy}
                        fetchUserPosts={fetchUserPosts}
                        externalApi={externalApi}
                        requireAuth={requireAuth}
                        onPostClick={onPostClick}
                        onAuthorClick={setSelectedUser}
                    />
                ) : (
                    <SocialNearbySection
                        myObfPos={myObfPos}
                        nearbyUsers={nearbyUsers}
                        radius={radius}
                        setSelectedUser={setSelectedUser}
                        handleUpdateRadius={handleUpdateRadius}
                        isVisibleOnMap={isVisibleOnMap}
                        setIsVisibleOnMap={setIsVisibleOnMap}
                        requireAuth={requireAuth}
                        requestLocation={requestLocation}
                        ws={ws}
                    />
                )}
            </div>
        </div>
    );
};

export default React.memo(SocialView);
