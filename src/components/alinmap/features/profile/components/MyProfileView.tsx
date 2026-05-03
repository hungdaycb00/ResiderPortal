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
    friends: any[];
    setSelectedUser: (user: any) => void;
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
        triggerAuth, requireAuth, logout, requestLocation,
        friends, setSelectedUser
    } = props;

    const { 
        myStatus, setMyStatus,
        isVisibleOnMap, setIsVisibleOnMap,
        isEditingStatus, setIsEditingStatus,
        isEditingName, setIsEditingName,
        nameInput, setNameInput,
        statusInput, setStatusInput
    } = useProfile();

    const [isAddingTag, setIsAddingTag] = React.useState(false);
    const [tagInput, setTagInput] = React.useState('');

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

    const parsedTags = myStatus.split(' ')
        .filter(w => w.startsWith('#'))
        .map(w => w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9#]/g, ''));

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

            {/* Status & Tags moved from Info Tab */}
            <div className="px-1 mt-2">
                {isEditingStatus ? (
                    <div className="bg-gray-100/80 p-3 rounded-xl border border-gray-200 shadow-inner">
                        <div className="flex gap-2">
                            <input
                                autoFocus type="text" value={statusInput}
                                onChange={(e) => setStatusInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') void saveStatus(); }}
                                placeholder="Update your status..."
                                className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 w-full outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                            <button onClick={() => { void saveStatus(); }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-lg text-xs font-bold transition-colors whitespace-nowrap">
                                Save
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="group/status inline-flex items-center gap-2 cursor-pointer mb-2" onClick={() => {
                        if (requireAuth && !requireAuth('cap nhat trang thai')) return;
                        setStatusInput(myStatus);
                        setIsEditingStatus(true);
                    }}>
                        <p className="text-gray-500 text-[13px] truncate">{myStatus || "Tap to add status..."}</p>
                        <Edit className="w-3.5 h-3.5 text-gray-400 opacity-40 group-hover/status:opacity-100 transition-opacity" />
                    </div>
                )}

                <div className="flex flex-wrap gap-1.5 mt-2 mb-4 items-center">
                    {parsedTags.map((tag) => (
                        <span key={tag} className="group/tag relative text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1 transition-all hover:bg-blue-100">
                            {tag.toUpperCase()}
                            <button onClick={() => { void removeTag(tag.replace('#', '')); }} className="opacity-0 group-hover/tag:opacity-100 transition-opacity hover:text-red-500">
                                <X className="w-2.5 h-2.5" />
                            </button>
                        </span>
                    ))}

                    {isAddingTag ? (
                        <div className="flex items-center gap-1 bg-white border border-blue-300 rounded-full px-2 py-0.5 shadow-sm animate-in fade-in zoom-in duration-200">
                            <span className="text-blue-500 text-[10px] font-bold">#</span>
                            <input
                                autoFocus type="text" value={tagInput}
                                onChange={(e) => setTagInput(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && tagInput.trim()) void addTag(tagInput);
                                    else if (e.key === 'Escape') setIsAddingTag(false);
                                }}
                                onBlur={() => { if (!tagInput.trim()) setIsAddingTag(false); }}
                                className="w-16 bg-transparent border-none outline-none text-[10px] font-bold text-gray-900 placeholder:text-gray-300"
                                placeholder="tag..."
                            />
                        </div>
                    ) : (
                        <button onClick={() => setIsAddingTag(true)} className="w-6 h-6 rounded-full bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-400 flex items-center justify-center transition-all active:scale-90 border border-gray-200" title="Thêm tag">
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-2xl mb-6">
                    <button
                        onClick={() => {
                        if (!user && requireAuth && !requireAuth('xem bai viet cua ban')) return;
                        setActiveTab('posts');
                        fetchUserPosts(myUserId || user?.uid || 'me');
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
                    myUserId={myUserId} games={games} ws={ws}
                    user={user} externalApi={externalApi}
                    requireAuth={requireAuth} friends={friends}
                    setSelectedUser={setSelectedUser}
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
