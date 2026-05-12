import React from 'react';
import { Plus, Search } from 'lucide-react';
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
    onSearchClick?: () => void;
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
    onSearchClick,
    onPostClick,
}) => {
    return (
        <div className="flex flex-col h-full relative">
            <div className="flex-1 overflow-y-auto space-y-4 pb-20">
                <div className="flex items-center justify-between px-1">
                    <div className="flex flex-1 min-w-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={onSearchClick}
                            className="inline-flex order-last ml-auto h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition-all active:scale-95 hover:bg-gray-50"
                            aria-label="Search"
                            title="Search"
                        >
                            <Search className="h-4 w-4" />
                        </button>
                        <h3 className="truncate text-lg font-black text-gray-900">Social</h3>
                    </div>
                    {socialSubTab === 'posts' && !isCreatingPost && (
                        <button
                            onClick={() => {
                                if (requireAuth && !requireAuth('tao bai viet')) return;
                                setPostPrivacy('public');
                                setPostIsStarred(false);
                                setIsCreatingPost(true);
                            }}
                            className="flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                            aria-label="Create post"
                            title="Tạo bài viết"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
                </div>

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
