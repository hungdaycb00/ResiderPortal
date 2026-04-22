import React, { useState } from 'react';
import { Edit, Copy, Compass, ChevronRight, Image as ImageIcon, X, Bookmark, Smile } from 'lucide-react';
import { normalizeImageUrl } from '../../../services/externalApi';
import PostCard from '../PostCard';

interface MyProfileViewProps {
    myUserId: string | null;
    myDisplayName: string;
    myAvatarUrl: string;
    myStatus: string;
    currentProvince: string | null;
    activeTab: 'info' | 'posts' | 'saved';
    setActiveTab: (tab: 'info' | 'posts' | 'saved') => void;
    galleryActive: boolean;
    isEditingName: boolean;
    setIsEditingName: (v: boolean) => void;
    nameInput: string;
    setNameInput: (v: string) => void;
    setMyDisplayName: (v: string) => void;
    isEditingStatus: boolean;
    setIsEditingStatus: (v: boolean) => void;
    statusInput: string;
    setStatusInput: (v: string) => void;
    setMyStatus: (v: string) => void;
    radius: number;
    handleUpdateRadius: (v: number) => void;
    isVisibleOnMap: boolean;
    setIsVisibleOnMap: (v: boolean) => void;
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
    showAvatarMenu: boolean;
    setShowAvatarMenu: (v: boolean) => void;
    avatarInputRef: React.RefObject<HTMLInputElement>;
    handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleDefaultAvatar: () => void;
}

const MyProfileView: React.FC<MyProfileViewProps> = ({
    myUserId, myDisplayName, myAvatarUrl, myStatus, currentProvince,
    activeTab, setActiveTab, galleryActive, isEditingName, setIsEditingName,
    nameInput, setNameInput, setMyDisplayName, isEditingStatus, setIsEditingStatus,
    statusInput, setStatusInput, setMyStatus, radius, handleUpdateRadius,
    isVisibleOnMap, setIsVisibleOnMap, games, userPosts,
    isCreatingPost, setIsCreatingPost, postTitle, setPostTitle, isSavingPost,
    ws, myObfPos, user, showNotification, setIsSheetExpanded, setMainTab,
    handleCreatePost, handleStarPost, handleDeletePost, fetchUserPosts, externalApi,
    showAvatarMenu, setShowAvatarMenu, avatarInputRef, handleAvatarUpload, handleDefaultAvatar
}) => {
    // Missing states for post creation
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    
    const quickEmojis = ['🎮', '🔥', '✨', '😂', '😎', '💀', '💯', '❤️', '🎉', '🌟'];
    const popularTags = ['#game', '#shop', '#chill', '#event', '#trading', '#friends'];

    const insertEmoji = (emoji: string) => {
        setPostTitle(postTitle + emoji);
        setShowEmojiPicker(false);
    };

    const insertTag = (tag: string) => {
        setPostTitle(postTitle + (postTitle.endsWith(' ') || postTitle.length === 0 ? '' : ' ') + tag + ' ');
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files) as File[];
            setSelectedImages(prev => [...prev, ...files]);
            const urls = files.map((file: File) => URL.createObjectURL(file));
            setPreviewUrls(prev => [...prev, ...urls]);
        }
    };

    return (
        <div className="space-y-4 pt-16 md:pt-4">
            <h3 className="text-lg font-black text-gray-900 px-1 mb-2">My Profile</h3>

            {/* Avatar & Basic Info */}
            <div className="flex items-start gap-4 mb-6 px-1 relative">
                <div className="w-20 h-20 bg-gray-100 rounded-[20px] overflow-hidden shrink-0 shadow-sm border border-gray-200 relative group/avatar cursor-pointer" onClick={() => setShowAvatarMenu(!showAvatarMenu)}>
                    <img
                        src={normalizeImageUrl(myAvatarUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(myDisplayName)}&background=3b82f6&color=fff&size=150&bold=true`}
                        alt="Avatar"
                        className="w-full h-full object-cover transition-transform group-hover/avatar:scale-110"
                        onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(myDisplayName)}&background=3b82f6&color=fff&size=150&bold=true`; }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity justify-center items-center flex">
                        <Edit className="w-6 h-6 text-white drop-shadow-md" />
                    </div>
                </div>
                
                {/* Avatar Menu */}
                {showAvatarMenu && (
                    <div className="absolute top-20 left-1 bg-white shadow-xl rounded-xl border border-gray-200 p-1.5 z-50 flex flex-col min-w-[140px] animate-in fade-in zoom-in duration-200">
                        <button onClick={() => avatarInputRef.current?.click()} className="text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors">Tải ảnh lên</button>
                        <button onClick={handleDefaultAvatar} className="text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors">Ảnh mặc định</button>
                    </div>
                )}
                <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={handleAvatarUpload} />

                <div className="flex-1 min-w-0 pt-1">
                    {isEditingName ? (
                        <div className="flex gap-2 mb-2">
                            <input
                                autoFocus type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setMyDisplayName(nameInput); setIsEditingName(false);
                                        if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { displayName: nameInput } }));
                                    }
                                }}
                                className="bg-gray-100 border border-blue-500 rounded-lg px-2 py-1 text-sm font-bold text-gray-900 w-full outline-none focus:border-blue-500 transition-colors"
                            />
                            <button onClick={() => { setMyDisplayName(nameInput); setIsEditingName(false); if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { displayName: nameInput } })); }} className="bg-blue-600 hover:bg-blue-500 text-white px-3 rounded-lg text-xs font-bold transition-colors">Save</button>
                        </div>
                    ) : (
                        <div className="mb-1">
                            <div className="group/name inline-flex items-center gap-2 cursor-pointer" onClick={() => { setNameInput(myDisplayName); setIsEditingName(true); }}>
                                <h3 className="text-2xl font-black text-gray-900 truncate tracking-tight">{myDisplayName}</h3>
                                <Edit className="w-4 h-4 text-blue-500 opacity-40 group-hover/name:opacity-100 transition-opacity" />
                            </div>
                            {currentProvince && (
                                <p className="text-sm text-gray-500 font-medium">📍 {currentProvince}</p>
                            )}
                        </div>
                    )}
                    
                    {/* ID Copy */}
                    <div className="group/id inline-flex items-center gap-1.5 bg-gray-100/80 hover:bg-blue-50 px-2 py-1 rounded-md cursor-pointer transition-colors mt-2" onClick={() => { navigator.clipboard.writeText(myUserId || ""); showNotification?.("ID copied to clipboard!", "success"); }}>
                        <span className="text-[10px] font-bold text-gray-500 group-hover/id:text-blue-600 truncate max-w-[120px]">ID: {myUserId}</span>
                        <Copy className="w-3 h-3 text-gray-400 group-hover/id:text-blue-500" />
                    </div>
                </div>
            </div>

            {/* Tab Toggle for Profile content */}
            <div className="flex bg-gray-100 p-1 rounded-2xl mb-6">
                <button
                    onClick={() => setActiveTab('info')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'info' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Info
                </button>
                <button
                    onClick={() => { setActiveTab('posts'); fetchUserPosts(myUserId || user?.uid); }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'posts' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Posts {galleryActive && <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full ml-1 animate-pulse" />}
                </button>
                <button
                    onClick={() => { setActiveTab('saved'); fetchUserPosts('saved'); }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'saved' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Saved
                </button>
            </div>

            {activeTab === 'info' ? (
                <>
                    {isEditingStatus ? (
                        <div className="bg-gray-100/80 p-3 rounded-xl mt-2 border border-gray-200 shadow-inner">
                            <div className="flex gap-2">
                                <input
                                    autoFocus type="text" value={statusInput}
                                    onChange={(e) => setStatusInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            setMyStatus(statusInput);
                                            setIsEditingStatus(false);
                                            if (ws.current?.readyState === WebSocket.OPEN && myObfPos) ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { status: statusInput } }));
                                        }
                                    }}
                                    placeholder="Update your status..."
                                    className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 w-full outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                />
                                <button
                                    onClick={() => {
                                        setMyStatus(statusInput);
                                        setIsEditingStatus(false);
                                        if (ws.current?.readyState === WebSocket.OPEN && myObfPos) ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { status: statusInput } }));
                                    }}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="group/status inline-flex items-center gap-2 cursor-pointer mb-2" onClick={() => { setStatusInput(myStatus); setIsEditingStatus(true); }}>
                            <p className="text-gray-500 text-[13px] truncate">{myStatus || "Tap to add status..."}</p>
                            <Edit className="w-3.5 h-3.5 text-gray-400 opacity-40 group-hover/status:opacity-100 transition-opacity" />
                        </div>
                    )}

                    <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
                        {myStatus.split(' ').filter(w => w.startsWith('#')).map(w => w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9#]/g, '')).map((tag) => (
                            <span key={tag} className="text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">
                                {tag.toUpperCase()}
                            </span>
                        ))}
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
                        <h4 className="text-[13px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Compass className="w-4 h-4 text-blue-500" /> Privacy & Location
                        </h4>
                        
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-[11px] font-bold text-gray-500">Obfuscation Radius</span>
                                    <span className="text-[11px] font-bold text-blue-600">{radius} km</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={radius}
                                    onChange={(e) => handleUpdateRadius(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-between items-center pt-3 border-t border-gray-200/60">
                                <div>
                                    <span className="text-[11px] font-bold text-gray-700 block">Visible on Map</span>
                                    <span className="text-[9px] font-medium text-gray-400">{isVisibleOnMap ? 'Others can see you' : 'Ghost mode'}</span>
                                </div>
                                <div className="relative inline-flex items-center cursor-pointer" onClick={() => {
                                    const newVal = !isVisibleOnMap;
                                    setIsVisibleOnMap(newVal);
                                    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { visible: newVal } }));
                                }}>
                                    <div className={`w-9 h-5 rounded-full transition-colors ${isVisibleOnMap ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full mt-0.5 ml-0.5 transition-transform shadow-sm flex items-center justify-center ${isVisibleOnMap ? 'translate-x-4' : 'translate-x-0'}`}>
                                            {isVisibleOnMap && <div className="w-1 h-1 bg-blue-600 rounded-full" />}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* User Games Section */}
                    {games && games.length > 0 && (
                        <div className="mt-2">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-[13px] font-bold text-gray-900">🎮 My Games</h4>
                                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{games.length}</span>
                            </div>
                            <div className="space-y-2">
                                {games.map((g) => (
                                    <div key={g.id || g.gameId} className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors cursor-pointer group">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-lg shrink-0 overflow-hidden">
                                            {g.thumbnail ? (
                                                <img src={normalizeImageUrl(g.thumbnail)} className="w-full h-full object-cover" />
                                            ) : (
                                                <span>🎮</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-bold text-gray-900 truncate">{g.name || g.title || 'Untitled Game'}</p>
                                            <p className="text-[11px] text-gray-500">{g.type || 'Game'} {g.playCount ? `• ${g.playCount} plays` : ''}</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="pt-4 pb-4">
                        <button onClick={() => { setIsSheetExpanded(false); setMainTab('discover'); }} className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 py-4 rounded-[20px] font-bold transition-all active:scale-95 shadow-sm">
                            <X className="w-5 h-5" /> Close Profile
                        </button>
                    </div>
                </>
            ) : activeTab === 'posts' ? (
                <div className="pb-8">
                    {/* Create Post Form */}
                    <div className="mb-6">
                        {!isCreatingPost ? (
                            <button
                                onClick={() => setIsCreatingPost(true)}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                            >
                                <Edit className="w-4 h-4" /> Create Post
                            </button>
                        ) : (
                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Post title..."
                                        value={postTitle}
                                        onChange={(e) => setPostTitle(e.target.value.substring(0, 50))}
                                        className="w-full bg-white border border-gray-200 rounded-xl pl-4 pr-10 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
                                    />
                                    <button 
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-amber-500 transition-colors"
                                    >
                                        <Smile className="w-5 h-5" />
                                    </button>
                                    
                                    {showEmojiPicker && (
                                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 shadow-xl rounded-xl p-2 z-50 flex flex-wrap gap-1 w-[200px]">
                                            {quickEmojis.map(emoji => (
                                                <button 
                                                    key={emoji} 
                                                    onClick={() => insertEmoji(emoji)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-lg transition-colors"
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Popular Tags */}
                                <div className="flex flex-wrap gap-1.5 px-1">
                                    {popularTags.map(tag => (
                                        <button 
                                            key={tag}
                                            onClick={() => insertTag(tag)}
                                            className="text-[10px] font-bold bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 px-2.5 py-1 rounded-md transition-colors"
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                                
                                {previewUrls.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto py-2 px-1">
                                        {previewUrls.map((url, i) => (
                                            <div key={i} className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-gray-200">
                                                <img src={url} className="w-full h-full object-cover" alt="preview" />
                                                <button onClick={() => {
                                                    const newImages = [...selectedImages];
                                                    newImages.splice(i, 1);
                                                    setSelectedImages(newImages);
                                                    const newUrls = [...previewUrls];
                                                    URL.revokeObjectURL(newUrls[i]);
                                                    newUrls.splice(i, 1);
                                                    setPreviewUrls(newUrls);
                                                }} className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 text-white">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <p className="text-[10px] text-right text-gray-400">{postTitle.length}/50</p>
                                <div className="flex gap-2">
                                    <label className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 border border-gray-200">
                                        <ImageIcon className="w-4 h-4" /> Add Photos
                                        <input
                                            type="file"
                                            hidden
                                            accept="image/png,image/jpeg,image/webp"
                                            multiple
                                            onChange={handleImageSelect}
                                        />
                                    </label>
                                </div>
                                <div className="flex gap-2 mt-3 pt-2 border-t border-gray-200/60">
                                    <button
                                        onClick={() => { 
                                            setIsCreatingPost(false); 
                                            setPostTitle(''); 
                                            setSelectedImages([]);
                                            setPreviewUrls([]);
                                        }}
                                        className="flex-1 text-gray-500 hover:bg-gray-200 bg-gray-100 rounded-xl text-xs font-bold py-2.5 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleCreatePost(selectedImages);
                                            setSelectedImages([]);
                                            setPreviewUrls([]);
                                        }}
                                        disabled={!postTitle.trim() && selectedImages.length === 0}
                                        className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                                    >
                                        {isSavingPost ? 'Posting...' : 'Post'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Posts Timeline */}
                    {userPosts.length > 0 ? (
                        <div className="space-y-0">
                            {userPosts.map((post) => (
                                <PostCard 
                                    key={post.id} post={post} isSelf={true} 
                                    onStar={handleStarPost} onDelete={handleDeletePost} 
                                    externalApi={externalApi} fetchUserPosts={fetchUserPosts}
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
                /* Saved / Archived Posts Tab - No Create Post button */
                <div className="pb-8">
                    {userPosts.length > 0 ? (
                        <div className="space-y-0">
                            {userPosts.map((post) => (
                                <PostCard 
                                    key={post.id} post={{...post, isArchivedState: true}} isSelf={true} 
                                    onStar={handleStarPost} onDelete={handleDeletePost} 
                                    externalApi={externalApi} fetchUserPosts={fetchUserPosts}
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
