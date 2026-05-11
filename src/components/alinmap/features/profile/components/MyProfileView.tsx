import React from 'react';
import { LogIn, LogOut } from 'lucide-react';
import ProfileHeader from './ProfileHeader';
import ProfileInfoTab from './ProfileInfoTab';
import ProfilePresenceSection from './ProfilePresenceSection';
import ProfilePostsSection from './ProfilePostsSection';
import ProfileTabs from './ProfileTabs';
import { useProfile } from '../context/ProfileContext';
import { useAvatarUpload } from '../hooks/useAvatarUpload';
import CreatePostForm from '../../creator/components/CreatePostForm';

const INITIAL_SAVED_POST_LIMIT = 8;
const SAVED_POST_BATCH_SIZE = 8;

interface MyProfileViewProps {
    myUserId: string | null;
    myDisplayName: string;
    myAvatarUrl: string;
    currentProvince: string | null;
    activeTab: 'info' | 'posts' | 'saved';
    setActiveTab: (tab: 'info' | 'posts' | 'saved') => void;
    setMyDisplayName: (v: string) => void;
    games: any[];
    userPosts: any[];
    ws: React.MutableRefObject<WebSocket | null>;
    myObfPos: any;
    user: any;
    showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
    setIsSheetExpanded: (v: boolean) => void;
    setMainTab: (tab: any) => void;
    handleStarPost: (postId: string) => void;
    handleDeletePost: (postId: string) => void;
    handleUpdatePostPrivacy?: (postId: string, privacy: string) => void;
    fetchUserPosts: (uid: string) => void;
    externalApi: any;
    setMyAvatarUrl: (v: string) => void;
    triggerAuth?: (callback: () => void) => void;
    requireAuth?: (actionLabel: string, afterLogin?: () => void) => boolean;
    logout?: () => void;
    requestLocation?: (forceInvisible?: boolean, wsRef?: React.MutableRefObject<WebSocket | null>, setIsVisibleOnMap?: (v: boolean) => void) => void;
    friends: any[];
    setSelectedUser: (user: any) => void;
    isCreatingPost?: boolean;
    setIsCreatingPost?: (v: boolean) => void;
    postTitle?: string;
    setPostTitle?: (v: string) => void;
    postPrivacy?: 'public' | 'friends' | 'private';
    setPostPrivacy?: (v: 'public' | 'friends' | 'private') => void;
    postIsStarred?: boolean;
    setPostIsStarred?: (v: boolean) => void;
    isSavingPost?: boolean;
    handleCreatePost?: (files: File[]) => void;
    onPostClick?: (post: any) => void;
}

const MyProfileView: React.FC<MyProfileViewProps> = (props) => {
    const {
        myUserId, myDisplayName, myAvatarUrl, currentProvince,
        activeTab, setActiveTab,
        setMyDisplayName,
        games, userPosts,
        ws, myObfPos, user, showNotification, setIsSheetExpanded, setMainTab,
        handleStarPost, handleDeletePost, handleUpdatePostPrivacy, fetchUserPosts, externalApi,
        setMyAvatarUrl,
        triggerAuth, requireAuth, logout, requestLocation,
        friends, setSelectedUser,
        isCreatingPost, setIsCreatingPost, postTitle, setPostTitle,
        postPrivacy, setPostPrivacy, postIsStarred, setPostIsStarred,
        isSavingPost, handleCreatePost,
        onPostClick
    } = props;

    const { 
        myStatus, setMyStatus,
        isVisibleOnMap, setIsVisibleOnMap,
        isEditingStatus, setIsEditingStatus,
        isEditingName, setIsEditingName,
        nameInput, setNameInput,
        statusInput, setStatusInput
    } = useProfile();

    const [visibleSavedPostCount, setVisibleSavedPostCount] = React.useState(INITIAL_SAVED_POST_LIMIT);
    const [isAddingTag, setIsAddingTag] = React.useState(false);
    const [tagInput, setTagInput] = React.useState('');

    React.useEffect(() => {
        setVisibleSavedPostCount(INITIAL_SAVED_POST_LIMIT);
    }, [activeTab, userPosts]);

    const persistStatus = async (nextStatus: string) => {
        await externalApi.request('/api/update-profile', {
            method: 'POST',
            body: JSON.stringify({ status: nextStatus }),
        });
        localStorage.setItem('alin_profile_status', nextStatus);
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { status: nextStatus } }));
        }
    };

    const saveStatus = async () => {
        if (requireAuth && !requireAuth('cap nhat trang thai')) return;
        const nextStatus = statusInput.trim();
        try {
            await persistStatus(nextStatus);
            setMyStatus(nextStatus);
            setIsEditingStatus(false);
        } catch (err) {
            console.error(err);
            showNotification?.('Khong the luu trang thai len server', 'error');
        }
    };

    const removeTag = async (tag: string) => {
        if (requireAuth && !requireAuth('cap nhat tag')) return;
        const cleanTag = '#' + tag.toLowerCase();
        const newStatus = myStatus.replace(new RegExp(cleanTag + '\\b', 'g'), '').replace(/\s+/g, ' ').trim();
        try {
            await persistStatus(newStatus);
            setMyStatus(newStatus);
        } catch (err) {
            console.error(err);
            showNotification?.('Khong the luu tag len server', 'error');
        }
    };

    const addTag = async (rawTag: string) => {
        if (requireAuth && !requireAuth('cap nhat tag')) return;
        const newTag = '#' + rawTag.trim();
        if (!myStatus.includes(newTag)) {
            const newStatus = (myStatus.trim() + ' ' + newTag).trim();
            try {
                await persistStatus(newStatus);
                setMyStatus(newStatus);
            } catch (err) {
                console.error(err);
                showNotification?.('Khong the luu tag len server', 'error');
            }
        }
        setTagInput('');
        setIsAddingTag(false);
    };

    const parsedTags = React.useMemo(() => myStatus.split(' ')
        .filter(w => w.startsWith('#'))
        .map(w => w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9#]/g, '')), [myStatus]);

    const avatar = useAvatarUpload({ user, ws, setMyAvatarUrl, showNotification, externalApi });

    return (
        <div className="space-y-4">
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

            <ProfilePresenceSection
                myStatus={myStatus}
                statusInput={statusInput}
                setStatusInput={setStatusInput}
                isEditingStatus={isEditingStatus}
                setIsEditingStatus={setIsEditingStatus}
                isAddingTag={isAddingTag}
                setIsAddingTag={setIsAddingTag}
                tagInput={tagInput}
                setTagInput={setTagInput}
                parsedTags={parsedTags}
                onSaveStatus={saveStatus}
                onAddTag={addTag}
                onRemoveTag={removeTag}
                requireAuth={requireAuth}
            />

            <ProfileTabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                requireAuth={requireAuth}
                fetchUserPosts={fetchUserPosts}
            />

            {activeTab === 'posts' ? (
                <div className="space-y-4">
                    {setIsCreatingPost && (
                        <div className="mb-4">
                            <CreatePostForm
                                isCreatingPost={!!isCreatingPost}
                                setIsCreatingPost={setIsCreatingPost}
                                postTitle={postTitle || ''}
                                setPostTitle={setPostTitle || (() => {})}
                                postPrivacy={postPrivacy || 'public'}
                                setPostPrivacy={setPostPrivacy || (() => {})}
                                postIsStarred={postIsStarred}
                                setPostIsStarred={setPostIsStarred}
                                isSavingPost={!!isSavingPost}
                                handleCreatePost={handleCreatePost || (() => {})}
                            />
                        </div>
                    )}
                    <ProfilePostsSection
                        posts={userPosts}
                        visibleCount={visibleSavedPostCount}
                        onShowMore={() => setVisibleSavedPostCount((count) => count + SAVED_POST_BATCH_SIZE)}
                        showMoreLabel="Show more posts"
                        emptyTitle="No posts yet"
                        emptyDescription="Create a post from Social to show it here."
                        emptyType="posts"
                        onStar={handleStarPost}
                        onDelete={handleDeletePost}
                        onUpdatePrivacy={handleUpdatePostPrivacy}
                        externalApi={externalApi}
                        fetchUserPosts={fetchUserPosts}
                        requireAuth={requireAuth}
                        onPostClick={onPostClick}
                    />
                </div>
            ) : activeTab === 'info' ? (
                <ProfileInfoTab
                    myUserId={myUserId} games={games} ws={ws}
                    user={user} externalApi={externalApi}
                    requireAuth={requireAuth} friends={friends}
                    setSelectedUser={setSelectedUser}
                />
            ) : (
                <ProfilePostsSection
                    posts={userPosts}
                    visibleCount={visibleSavedPostCount}
                    onShowMore={() => setVisibleSavedPostCount((count) => count + SAVED_POST_BATCH_SIZE)}
                    showMoreLabel="Show more saved posts"
                    emptyTitle="No saved posts"
                    emptyDescription="Bookmark posts to see them here."
                    emptyType="saved"
                    onStar={handleStarPost}
                    onDelete={handleDeletePost}
                    externalApi={externalApi}
                    fetchUserPosts={fetchUserPosts}
                    requireAuth={requireAuth}
                    onPostClick={onPostClick}
                />
            )}
        </div>
    );
};

export default React.memo(MyProfileView);
