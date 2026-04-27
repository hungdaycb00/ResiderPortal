import React from 'react';
import { Edit, Bookmark, LogIn, LogOut } from 'lucide-react';
import ProfileHeader from './ProfileHeader';
import ProfileInfoTab from './ProfileInfoTab';
import CreatePostForm from '../../creator/components/CreatePostForm';
import PostCard from './PostCard';
import { useProfile } from '../context/ProfileContext';
import { useAvatarUpload } from '../hooks/useAvatarUpload';

interface MyProfileViewProps {
    myUserId: string | null;
    myDisplayName: string;
    myAvatarUrl: string;
    currentProvince: string | null;
    activeTab: 'info' | 'posts' | 'saved';
    setActiveTab: (tab: 'info' | 'posts' | 'saved') => void;
    galleryActive: boolean;
    setMyDisplayName: (v: string) => void;
    radius: number;
    handleUpdateRadius: (v: number) => void;
    games: any[];
    userPosts: any[];
    isCreatingPost: boolean;
    setIsCreatingPost: (v: boolean) => void;
    postTitle: string;
    setPostTitle: (v: string) => void;
    isSavingPost: boolean;
    ws: React.MutableRefObject<WebSocket | null>;
    myObfPos: any;
    user: any;
    showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
    setIsSheetExpanded: (v: boolean) => void;
    setMainTab: (tab: any) => void;
    handleCreatePost: (files: File[]) => void;
    handleStarPost: (postId: string) => void;
    handleDeletePost: (postId: string) => void;
    fetchUserPosts: (uid: string) => void;
    externalApi: any;
    setMyAvatarUrl: (v: string) => void;
    triggerAuth?: (callback: () => void) => void;
    requireAuth?: (actionLabel: string, afterLogin?: () => void) => boolean;
    logout?: () => void;
    requestLocation?: (forceInvisible?: boolean, wsRef?: React.MutableRefObject<WebSocket | null>, setIsVisibleOnMap?: (v: boolean) => void) => void;
}

const MyProfileView: React.FC<MyProfileViewProps> = (props) => {
    const {
        myUserId, myDisplayName, myAvatarUrl, currentProvince,
        activeTab, setActiveTab, galleryActive,
        setMyDisplayName,
        radius, handleUpdateRadius,
        games, userPosts,
        isCreatingPost, setIsCreatingPost, postTitle, setPostTitle, isSavingPost,
        ws, myObfPos, user, showNotification, setIsSheetExpanded, setMainTab,
        handleCreatePost, handleStarPost, handleDeletePost, fetchUserPosts, externalApi,
        setMyAvatarUrl,
        triggerAuth, requireAuth, logout, requestLocation
    } = props;

    const { 
        myStatus, setMyStatus,
        isVisibleOnMap, setIsVisibleOnMap,
        isEditingStatus, setIsEditingStatus,
        isEditingName, setIsEditingName,
        nameInput, setNameInput
    } = useProfile();

    const avatar = useAvatarUpload({ user, ws, setMyAvatarUrl, showNotification, externalApi });

    const openCreatePost = (open: boolean) => {
        if (open && requireAuth && !requireAuth('dang bai viet')) return;
        setIsCreatingPost(open);
    };

    const submitPost = (files: File[]) => {
        if (requireAuth && !requireAuth('dang bai viet')) return;
        handleCreatePost(files);
    };

    return (
        <div className="space-y-4 pt-16 md:pt-4">
            <div className="flex items-center justify-between px-1 mb-2">
                <h3 className="text-lg font-black text-gray-900">My Profile</h3>
                {user ? (
                    <button
                        onClick={() => logout?.()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-all active:scale-95"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Đăng xuất
                    </button>
                ) : (
                    <button
                        onClick={() => triggerAuth?.(() => {})}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-xl transition-all active:scale-95"
                    >
                        <LogIn className="w-3.5 h-3.5" />
                        Đăng nhập
                    </button>
                )}
            </div>

            <ProfileHeader
                myUserId={myUserId} userEmail={user?.email || null} myDisplayName={myDisplayName} myAvatarUrl={myAvatarUrl}
                currentProvince={currentProvince}
                setMyDisplayName={setMyDisplayName}
                ws={ws} showNotification={showNotification}
                showAvatarMenu={avatar.showAvatarMenu} setShowAvatarMenu={avatar.setShowAvatarMenu}
                avatarInputRef={avatar.avatarInputRef} handleAvatarUpload={avatar.handleAvatarUpload} handleDefaultAvatar={avatar.handleDefaultAvatar}
                externalApi={externalApi}
                requireAuth={requireAuth}
            />

            {/* Tab Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-2xl mb-6">
                <button
                    onClick={() => {
                        if (!user && requireAuth && !requireAuth('xem bai viet cua ban')) return;
                        setActiveTab('posts');
                        fetchUserPosts(myUserId || user?.uid);
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'posts' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Posts {galleryActive && <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full ml-1 animate-pulse" />}
                </button>
                <button
                    onClick={() => setActiveTab('info')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'info' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Info
                </button>
                <button
                    onClick={() => {
                        if (requireAuth && !requireAuth('xem bai viet da luu')) return;
                        setActiveTab('saved');
                        fetchUserPosts('saved');
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'saved' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Saved
                </button>
            </div>

            {activeTab === 'info' ? (
                <ProfileInfoTab
                    myUserId={myUserId}
                    radius={radius} handleUpdateRadius={handleUpdateRadius}
                games={games} ws={ws} myObfPos={myObfPos}
                    setIsSheetExpanded={setIsSheetExpanded} setMainTab={setMainTab}
                    logout={logout} user={user} requireAuth={requireAuth}
                    externalApi={externalApi}
                    showNotification={showNotification}
                    requestLocation={requestLocation}
                />
            ) : activeTab === 'posts' ? (
                <div className="pb-8">
                    <div className="mb-6">
                        <CreatePostForm
                            isCreatingPost={isCreatingPost} setIsCreatingPost={openCreatePost}
                            postTitle={postTitle} setPostTitle={setPostTitle}
                            isSavingPost={isSavingPost} handleCreatePost={submitPost}
                        />
                    </div>
                    {userPosts.length > 0 ? (
                        <div className="space-y-0">
                            {userPosts.map((post) => (
                                <PostCard
                                    key={post.id} post={post} isSelf={true}
                                    onStar={handleStarPost} onDelete={handleDeletePost}
                                    externalApi={externalApi} fetchUserPosts={fetchUserPosts}
                                    requireAuth={requireAuth}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Edit className="w-8 h-8 text-gray-200" />
                            </div>
                            <p className="text-gray-400 text-sm">No posts yet</p>
                            <p className="text-[11px] text-gray-400 mt-1">Create your first post above!</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="pb-8">
                    {userPosts.length > 0 ? (
                        <div className="space-y-0">
                            {userPosts.map((post) => (
                                <PostCard
                                    key={post.id} post={{...post, isArchivedState: true}} isSelf={true}
                                    onStar={handleStarPost} onDelete={handleDeletePost}
                                    externalApi={externalApi} fetchUserPosts={fetchUserPosts}
                                    requireAuth={requireAuth}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Bookmark className="w-8 h-8 text-gray-200" />
                            </div>
                            <p className="text-gray-400 text-sm">No saved posts</p>
                            <p className="text-[11px] text-gray-400 mt-1">Bookmark posts to see them here.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MyProfileView;
