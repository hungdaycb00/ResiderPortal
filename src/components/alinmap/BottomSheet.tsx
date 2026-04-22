import React from 'react';
import { normalizeImageUrl } from '../../services/externalApi';
import { Search, MapPin, X, UserPlus, MessageCircle, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Heart, Star, Bookmark, PlusCircle, Diamond, Edit, Image as ImageIcon, User, Flag, Copy, AlertTriangle, Trash2, Navigation, CloudSun, Compass, Plus, RefreshCw, Bell } from 'lucide-react';
import { motion } from 'framer-motion';

interface BottomSheetProps {
    isDesktop: boolean;
    isSheetExpanded: boolean;
    selectedUser: any;
    activeTab: 'info' | 'posts' | 'saved';
    mainTab: string;
    nearbyUsers: any[];
    friends: any[];
    games: any[];
    userGames: any[];
    userPosts: any[];
    myUserId: string | null;
    myDisplayName: string;
    myStatus: string;
    myObfPos: { lat: number; lng: number } | null;
    user: any;
    searchTag: string;
    isReporting: boolean;
    reportReason: string;
    reportStatus: string;
    sentFriendRequests: string[];
    isEditingStatus: boolean;
    isEditingName: boolean;
    statusInput: string;
    nameInput: string;
    isVisibleOnMap: boolean;
    friendIdInput: string;
    socialSection: 'friends' | 'nearby' | 'recent' | 'blocked';
    isCreatingPost: boolean;
    postTitle: string;
    isSavingPost: boolean;
    galleryActive: boolean;
    currentProvince: string | null;
    radius: number;
    notifications: any[];
    fetchNotifications: () => void;
    fetchUserPosts: (uid: string) => void;
    ws: React.MutableRefObject<WebSocket | null>;
    panX: any;
    panY: any;
    scale: any;
    externalApi: any;
    onOpenChat?: (id: string, name: string) => void;
    showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
    setSentFriendRequests: (fn: (prev: string[]) => string[]) => void;
    handleUpdateRadius: (v: number) => void;
    setIsSheetExpanded: (v: boolean) => void;
    setSelectedUser: (user: any) => void;
    setActiveTab: (tab: 'info' | 'posts' | 'saved') => void;
    setMainTab: (tab: any) => void;
    setSearchTag: (v: string) => void;
    setIsReporting: (v: boolean) => void;
    setReportReason: (v: string) => void;
    setReportStatus: (v: string) => void;
    setIsEditingStatus: (v: boolean) => void;
    setIsEditingName: (v: boolean) => void;
    setStatusInput: (v: string) => void;
    setNameInput: (v: string) => void;
    setMyStatus: (v: string) => void;
    setMyDisplayName: (v: string) => void;
    setIsVisibleOnMap: (v: boolean) => void;
    setFriendIdInput: (v: string) => void;
    setSocialSection: (v: 'friends' | 'nearby' | 'recent' | 'blocked') => void;
    setIsCreatingPost: (v: boolean) => void;
    setPostTitle: (v: string) => void;
    handleAddFriend: () => void;
    handleMessage: () => void;
    handleCreatePost: (files: File[]) => void;
    handleStarPost: (postId: string) => void;
    handleDeletePost: (postId: string) => void;
}

const PostCard = ({ post, isSelf, onStar, onDelete, externalApi, fetchUserPosts }: any) => {
    const API_BASE = externalApi.getBaseUrl ? externalApi.getBaseUrl() : 'https://api.alin.city';
    const [liked, setLiked] = React.useState(post.isLiked);
    const [likeCount, setLikeCount] = React.useState(post.likeCount || 0);
    const [archived, setArchived] = React.useState(post.isArchived);
    const [commentCount, setCommentCount] = React.useState(post.commentCount || 0);
    const [comments, setComments] = React.useState<any[]>(post.comments || []);
    const [showComments, setShowComments] = React.useState(false);
    const [newCmt, setNewCmt] = React.useState('');
    const [loadingCmt, setLoadingCmt] = React.useState(false);

    const toggleLike = async () => {
        setLiked(!liked);
        setLikeCount(liked ? likeCount - 1 : likeCount + 1);
        try {
            await fetch(`${API_BASE}/api/user/post/${post.id}/like`, { method: 'POST', headers: { 'X-Device-Id': externalApi.getDeviceId() } });
        } catch (e) {
            setLiked(liked);
            setLikeCount(likeCount);
        }
    };

    const toggleArchive = async () => {
        setArchived(!archived);
        try {
            await fetch(`${API_BASE}/api/user/post/${post.id}/archive`, { method: 'POST', headers: { 'X-Device-Id': externalApi.getDeviceId() } });
        } catch (e) {
            setArchived(archived);
        }
    };

    const fetchAllComments = async () => {
        try {
            const r = await fetch(`${API_BASE}/api/user/post/${post.id}/comments`);
            const d = await r.json();
            if (d.success) setComments(d.comments);
        } catch (e) {}
    };

    const submitComment = async () => {
        if (!newCmt.trim()) return;
        setLoadingCmt(true);
        try {
            const r = await fetch(`${API_BASE}/api/user/post/${post.id}/comment`, {
                method: 'POST',
                headers: { 'X-Device-Id': externalApi.getDeviceId(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newCmt })
            });
            const d = await r.json();
            if (d.success) {
                setComments([...comments, d.comment]);
                setCommentCount(commentCount + 1);
                setNewCmt('');
            }
        } catch (e) {}
        finally { setLoadingCmt(false); }
    };

    return (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm mb-4">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                    <img 
                        src={normalizeImageUrl(post.author?.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.name || 'User')}&background=random`} 
                        alt="author" 
                        className="w-10 h-10 rounded-full object-cover shadow-sm bg-gray-100" 
                    />
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h4 className="text-[14px] font-bold text-gray-900">{post.author?.name || 'Unknown User'}</h4>
                            {post.isStarred && !post.isArchivedState && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-gray-400">
                            {new Date(post.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
                {isSelf && !post.isArchivedState && (
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button onClick={() => onStar(post.id)} className={`p-2 rounded-xl transition-all active:scale-90 ${post.isStarred ? 'bg-amber-50 text-amber-500' : 'text-gray-300 hover:text-amber-400 hover:bg-amber-50'}`} title={post.isStarred ? 'Remove from Billboard' : 'Set as Billboard'}>
                            <Star className={`w-4 h-4 ${post.isStarred ? 'fill-amber-400' : ''}`} />
                        </button>
                        <button onClick={() => onDelete(post.id)} className="p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90" title="Delete post">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {post.title && <div className="px-4 pb-2 text-sm text-gray-800">{post.title}</div>}

            {post.images?.length > 0 && (
                <div className="flex overflow-x-auto gap-1 px-1 pb-1 scrollbar-hide snap-x">
                    {post.images.map((img: string, idx: number) => (
                        <div key={idx} className={`snap-start shrink-0 aspect-[4/5] bg-gray-900 overflow-hidden ${post.images.length === 1 ? 'w-full rounded-lg' : 'w-[85%] rounded-lg'}`}>
                            <img src={normalizeImageUrl(img)} className="w-full h-full object-cover" alt="Post" />
                        </div>
                    ))}
                </div>
            )}

            {(likeCount > 0 || commentCount > 0) && (
                <div className="px-4 py-2 flex justify-between items-center text-[11px] text-gray-500">
                    <span className="flex items-center gap-1"><Heart className={`w-3.5 h-3.5 ${liked ? 'fill-red-500 text-red-500' : ''}`} /> {likeCount}</span>
                    <span>{commentCount} bình luận</span>
                </div>
            )}

            <div className="mx-2 py-1 flex items-center justify-between border-t border-gray-50">
                <button onClick={toggleLike} className={`flex-1 py-1 flex items-center justify-center gap-1.5 text-[11px] font-bold rounded-lg transition-colors active:scale-95 ${liked ? 'text-red-500' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <Heart className={`w-4 h-4 ${liked ? 'fill-red-500' : ''}`} /> Thích {likeCount > 0 && <span>({likeCount})</span>}
                </button>
                <button onClick={() => { setShowComments(!showComments); if (!showComments) fetchAllComments(); }} className="flex-1 py-1 flex items-center justify-center gap-1.5 text-[11px] font-bold text-gray-500 hover:bg-gray-50 rounded-lg transition-colors active:scale-95">
                    <MessageCircle className="w-4 h-4" /> Bình luận {commentCount > 0 && <span>({commentCount})</span>}
                </button>
                <button onClick={toggleArchive} className={`flex-1 py-1 flex items-center justify-center gap-1.5 text-[11px] font-bold rounded-lg transition-colors active:scale-95 ${archived ? 'text-blue-500' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <Bookmark className={`w-4 h-4 ${archived ? 'fill-blue-500' : ''}`} /> Lưu trữ
                </button>
            </div>

            {showComments && (
                <div className="px-4 py-3 bg-gray-50/50">
                    <div className="max-h-[250px] overflow-y-auto space-y-3 mb-3 pr-1">
                        {comments.length === 0 ? (
                            <p className="text-center text-xs text-gray-400 py-2">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                        ) : (
                            comments.map((c: any) => (
                                <div key={c.id} className="flex gap-2">
                                    <img src={normalizeImageUrl(c.author?.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.author?.name || 'User')}&background=random`} alt="cmt-author" className="w-7 h-7 rounded-full bg-gray-200 mt-0.5 object-cover" />
                                    <div className="flex-1 min-w-0">
                                        <div className="bg-gray-100 px-3 py-2 rounded-2xl rounded-tl-sm inline-block max-w-full">
                                            <p className="text-xs font-bold text-gray-900">{c.author?.name}</p>
                                            <p className="text-sm text-gray-800 break-words whitespace-pre-wrap">{c.content}</p>
                                        </div>
                                        <p className="text-[9px] text-gray-400 px-2 mt-0.5">{new Date(c.createdAt).toLocaleDateString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="flex items-center gap-2 relative">
                        <input type="text" value={newCmt} onChange={e => setNewCmt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submitComment() }} placeholder="Viết bình luận..." className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-blue-300 transition-colors" disabled={loadingCmt} />
                        <button onClick={submitComment} disabled={!newCmt.trim() || loadingCmt} className={`w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition-all active:scale-90 ${(!newCmt.trim() || loadingCmt) ? 'opacity-50' : 'hover:bg-blue-500'}`}>
                            <Navigation className="w-4 h-4 rotate-45 -ml-0.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const BottomSheet: React.FC<BottomSheetProps> = (props) => {
    const {
        isDesktop, isSheetExpanded, selectedUser, activeTab, mainTab, nearbyUsers, friends, games, userGames, userPosts,
        myUserId, myDisplayName, myStatus, myObfPos, user, searchTag,
        isReporting, reportReason, reportStatus, sentFriendRequests,
        isEditingStatus, isEditingName, statusInput, nameInput, isVisibleOnMap, friendIdInput, socialSection,
        isCreatingPost, postTitle, isSavingPost, galleryActive, currentProvince, radius,
        ws, panX, panY, scale, externalApi, onOpenChat, showNotification,
        setIsSheetExpanded, setSelectedUser, setActiveTab, setMainTab, setSearchTag,
        setIsReporting, setReportReason, setReportStatus,
        setIsEditingStatus, setIsEditingName, setStatusInput, setNameInput, setMyStatus, setMyDisplayName,
        setIsVisibleOnMap, setFriendIdInput, setSocialSection, setSentFriendRequests,
        setIsCreatingPost, setPostTitle, notifications, fetchNotifications, fetchUserPosts,
        handleAddFriend, handleMessage, handleCreatePost, handleStarPost, handleDeletePost, handleUpdateRadius
    } = props;

    const DEGREES_TO_PX = 11100;

    return (
        <>
            <div className={`absolute left-0 right-0 md:left-[72px] md:right-auto md:translate-x-0 md:w-[400px] pointer-events-none z-[140] ${isDesktop ? 'top-0 bottom-0 overflow-visible' : 'top-20 bottom-[60px] overflow-hidden'}`}>
                <motion.div
                    className="absolute top-0 left-0 right-0 h-full bg-white rounded-t-[32px] md:rounded-none shadow-[0_-10px_40px_rgba(0,0,0,0.15)] md:shadow-[4px_0_24px_rgba(0,0,0,0.1)] md:border-r md:border-gray-200 flex flex-col pointer-events-auto"
                    variants={{
                        expanded: { y: 0, x: 0 },
                        collapsed: {
                            y: isDesktop ? 0 : 'calc(100% - 40px)',
                            x: isDesktop ? '-100%' : 0
                        }
                    }}
                    initial="collapsed"
                    animate={isSheetExpanded || selectedUser ? "expanded" : "collapsed"}
                    transition={{ type: "spring", stiffness: 350, damping: 35 }}
                    drag={isDesktop ? false : "y"}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={0.05}
                    onDragEnd={(e, info) => {
                        if (isDesktop) return;
                        const threshold = 100;
                        if (info.offset.y < -threshold) setIsSheetExpanded(true);
                        else if (info.offset.y > threshold) { setIsSheetExpanded(false); setSelectedUser(null); }
                    }}
                >
                    {/* PC Hinge Toggle Button */}
                    <button 
                        onClick={() => setIsSheetExpanded(!isSheetExpanded)}
                        className="hidden md:flex absolute top-1/2 -right-[23px] -translate-y-1/2 w-6 h-14 bg-white border border-l-0 border-gray-200 rounded-r-[10px] shadow-[4px_0_10px_rgba(0,0,0,0.05)] items-center justify-center cursor-pointer hover:bg-gray-50 z-50 text-gray-500 hover:text-gray-700 transition-colors"
                        title={isSheetExpanded ? "Collapse panel" : "Expand panel"}
                    >
                        {isSheetExpanded ? <ChevronLeft className="w-4 h-4 ml-[-4px]" /> : <ChevronRight className="w-4 h-4 ml-[-4px]" />}
                    </button>

                    {/* Header Part (Search & Handle) */}
                    <div className="bg-white/80 backdrop-blur-md sticky top-0 z-[110] shrink-0">
                        {/* Hover Area / Handle (Mobile Only) */}
                        <div className="w-full flex md:hidden flex-col items-center pt-2 pb-1 cursor-pointer active:bg-gray-50 transition-colors shadow-[0_-2px_8px_rgba(0,0,0,0.02)]" onClick={() => setIsSheetExpanded(!isSheetExpanded)}>
                            <div className="w-10 h-1 bg-gray-300 rounded-full mb-1" />
                            <div className="text-gray-400">
                                {isSheetExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            </div>
                        </div>

                        {/* MOBILE Search Bar inside Sheet */}
                        {!isDesktop && isSheetExpanded && (
                            <div className="px-4 pb-3 -mt-1 block md:hidden animate-in fade-in duration-300">
                                <div className="flex bg-gray-100 rounded-full items-center px-4 py-2 border border-gray-200 shadow-inner">
                                    <Search className="w-4 h-4 text-gray-500 mr-2 shrink-0" />
                                    <input
                                        id="sheet-search-mobile"
                                        type="text"
                                        placeholder="Search..."
                                        className="bg-transparent border-none outline-none text-gray-900 text-sm w-full placeholder:text-gray-500 font-medium font-sans"
                                        value={searchTag}
                                        onChange={(e) => setSearchTag(e.target.value)}
                                    />
                                    {searchTag && (
                                        <button onClick={() => setSearchTag('')} className="p-1 hover:bg-gray-200 rounded-full ml-1">
                                            <X className="w-3 h-3 text-gray-400" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 pb-32 md:pb-6 md:pt-[76px] scrollbar-hide relative z-[100]">
                        {selectedUser ? (
                            <div className="pt-2">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="w-20 h-20 bg-gray-100 rounded-[20px] overflow-hidden shrink-0 shadow-sm border border-gray-200 relative group/avatar">
                                        <img
                                            src={normalizeImageUrl(selectedUser.avatar_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.username || 'U')}&background=3b82f6&color=fff&size=150&bold=true`}
                                            alt="Avatar"
                                            className="w-full h-full object-cover transition-transform group-hover/avatar:scale-110"
                                            onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.username || 'U')}&background=3b82f6&color=fff&size=150&bold=true`; }}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0 pt-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-2xl font-black text-gray-900 truncate tracking-tight mb-1">{selectedUser.username || 'Mysterious User'}</h3>
                                                {selectedUser.province && (
                                                    <p className="text-xs text-gray-500 font-medium">📍 {selectedUser.province}</p>
                                                )}
                                            </div>
                                            <button 
                                                onClick={() => setSelectedUser(null)} 
                                                className="shrink-0 p-2 -mr-2 -mt-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Tab Toggle */}
                                <div className="flex bg-gray-100 p-1 rounded-2xl mb-6">
                                    <button
                                        onClick={() => setActiveTab('info')}
                                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'info' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                    >
                                        Info
                                    </button>
                                    <button
                                        onClick={() => { setActiveTab('posts'); fetchUserPosts(selectedUser.id); }}
                                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'posts' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                    >
                                        Posts {selectedUser.gallery?.active && <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full ml-1 animate-pulse" />}
                                    </button>
                                </div>

                                {activeTab === 'info' ? (
                                    <>
                                        <p className="text-gray-500 text-[13px] truncate mb-2">{selectedUser.status || "Exploring the digital universe"}</p>
                                        <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
                                            {(selectedUser.tags || ['#GAMER', '#ALIN']).map((tag) => (
                                                <span key={tag} className="text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">
                                                    {tag.toUpperCase()}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pb-8">
                                            {!sentFriendRequests.includes(selectedUser.id) && !friends.some(f => f.id === selectedUser.id) && (
                                                <button onClick={handleAddFriend} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-[20px] font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
                                                    <UserPlus className="w-5 h-5" /> Add Friend
                                                </button>
                                            )}
                                            <div className={`flex gap-3 ${sentFriendRequests.includes(selectedUser.id) || friends.some(f => f.id === selectedUser.id) ? 'col-span-2' : ''}`}>
                                                <button onClick={handleMessage} className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 py-4 rounded-[20px] font-bold active:scale-95 transition-all shadow-sm">
                                                    <MessageCircle className="w-5 h-5" /> Message
                                                </button>
                                                <button onClick={() => { const pxX = (selectedUser.lng - (myObfPos?.lng || 0)) * DEGREES_TO_PX; const pxY = -(selectedUser.lat - (myObfPos?.lat || 0)) * DEGREES_TO_PX; panX.set(-pxX); panY.set(-pxY); scale.set(2); }} className="px-5 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-blue-600 rounded-[20px] active:scale-95 transition-all shadow-sm">
                                                    <MapPin className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Report User Section */}
                                        <div className="mt-2 mb-6">
                                            {!isReporting ? (
                                                <button onClick={() => setIsReporting(true)} className="flex items-center gap-2 text-[11px] font-bold text-red-500 hover:text-red-600 transition-colors px-2 py-1">
                                                    <Flag className="w-3.5 h-3.5" /> Report User
                                                </button>
                                            ) : (
                                                <div className="bg-red-50/50 border border-red-100 rounded-xl p-3">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <p className="text-[10px] uppercase font-bold text-red-500">Report Content/User</p>
                                                        {reportStatus && <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{reportStatus}</p>}
                                                    </div>
                                                    <textarea
                                                        value={reportReason}
                                                        onChange={e => setReportReason(e.target.value)}
                                                        placeholder="Why are you reporting this user?"
                                                        className="w-full bg-white text-gray-900 border border-red-200 rounded-lg p-2 text-xs outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 mb-2 resize-none h-16"
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => { setIsReporting(false); setReportReason(""); }} className="px-3 py-1.5 text-[11px] font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                                                        <button 
                                                            onClick={() => {
                                                                if (ws.current?.readyState === WebSocket.OPEN && reportReason.trim()) {
                                                                    ws.current.send(JSON.stringify({ type: 'REPORT_USER', payload: { reportedId: selectedUser.id, reason: reportReason.trim() } }));
                                                                    setReportReason("");
                                                                    setReportStatus("Report submitted!");
                                                                    setTimeout(() => { setReportStatus(""); setIsReporting(false); }, 2000);
                                                                }
                                                            }}
                                                            className="px-3 py-1.5 text-[11px] font-bold bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors active:scale-95 disabled:opacity-50"
                                                            disabled={!reportReason.trim()}
                                                        >
                                                            Submit Report
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* User Games Section */}
                                        {games && games.length > 0 && (
                                            <div className="mt-2">
                                                <h4 className="text-[13px] font-bold text-gray-900 mb-3">🎮 Games</h4>
                                                <div className="space-y-2">
                                                    {games.filter((g) => g.creatorId === selectedUser.id).map((g) => (
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
                                                    {games.filter((g) => g.creatorId === selectedUser.id).length === 0 && (
                                                        <p className="text-[12px] text-gray-400 text-center py-4">No games created yet.</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="pb-8">
                                        {userPosts.length > 0 ? (
                                            <div className="space-y-0">
                                                {userPosts.map((post) => (
                                                    <PostCard 
                                                        key={post.id} post={post} isSelf={false} 
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
                                                <p className="text-[11px] text-gray-400 mt-1">This user hasn't posted anything.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="pt-2">
                                {mainTab === 'discover' && (
                                    <>
                                        <div className="flex justify-between items-center mb-5">
                                            <h2 className="text-[22px] font-black text-gray-900 tracking-tight">Featured Games</h2>
                                            <div className="bg-gray-100 rounded-full px-3 py-1 flex items-center gap-1.5 shrink-0">
                                                <CloudSun className="w-4 h-4 text-gray-500" />
                                                <span className="text-[11px] font-bold text-gray-700">28°</span>
                                            </div>
                                        </div>
                                        <div className="flex overflow-x-auto gap-4 pb-8 snap-x snap-mandatory scrollbar-hide -mx-5 px-5">
                                            {(games && games.length > 0 ? games : [1, 2, 3]).slice(0, 5).map((game: any, idx: number) => {
                                                const isPlaceholder = typeof game === 'number';
                                                return (
                                                    <div key={isPlaceholder ? idx : game.id} className="snap-start shrink-0 w-64 bg-[#eef5fa] rounded-3xl overflow-hidden border border-[#d6eaf3] flex flex-col active:scale-[0.98] transition-transform cursor-pointer">
                                                        <div className="p-4 pb-3">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <h3 className="font-bold text-gray-900 text-[15px] leading-tight line-clamp-2">{isPlaceholder ? 'Explore a world of smooth gaming...' : game.title}</h3>
                                                                <Diamond className="w-5 h-5 text-blue-500 shrink-0 fill-blue-50 mt-0.5" />
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500 mt-2">
                                                                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                                                                <span>Alin Maps • {isPlaceholder ? 'Coming Soon' : (game.mode || 'Multiplayer')}</span>
                                                            </div>
                                                        </div>
                                                        <div className="p-2 pt-0 flex-1 flex flex-col justify-end">
                                                            <div className="w-full aspect-[4/3] bg-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                                {!isPlaceholder && (
                                                                    <img
                                                                        src={normalizeImageUrl(game.image || '')}
                                                                        alt={game.title}
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                    />
                                                                )}
                                                                {isPlaceholder && <div className="w-full h-full bg-gradient-to-br from-blue-100 to-gray-200" />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Trending Tags from nearby users */}
                                        <div className="mt-4 space-y-4">
                                            <div className="flex justify-between items-center px-1">
                                                <h3 className="text-lg font-black text-gray-900">Trending Tags</h3>
                                                <span className="text-[11px] font-bold text-gray-400">{nearbyUsers.length} users nearby</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {(() => {
                                                    const tagCounts: Record<string, number> = {};
                                                    nearbyUsers.forEach(u => {
                                                        const words = (u.status || '').split(' ').filter((w: string) => w.startsWith('#'));
                                                        words.forEach((w: string) => {
                                                            const clean = w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9#]/g, '').toUpperCase();
                                                            if (clean.length > 1) tagCounts[clean] = (tagCounts[clean] || 0) + 1;
                                                        });
                                                    });
                                                    const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 12);
                                                    if (sorted.length === 0) return <p className="text-[12px] text-gray-400 italic py-2">No trending tags yet.</p>;
                                                    return sorted.map(([tag, count]) => (
                                                        <button key={tag} onClick={() => setSearchTag(tag)} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[11px] font-bold rounded-full border border-blue-100 transition-colors active:scale-95">
                                                            {tag} <span className="text-blue-400 ml-1">×{count}</span>
                                                        </button>
                                                    ));
                                                })()}
                                            </div>
                                        </div>
                                    </>
                                )}


                                {mainTab === 'friends' && (
                                    <div className="space-y-5">
                                        <h3 className="text-lg font-black text-gray-900 px-1">Social</h3>

                                        {/* User ID + Copy */}
                                        <div className="bg-gray-50 rounded-2xl p-3 flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Your User ID</p>
                                                <p className="text-[13px] font-mono font-bold text-gray-900 truncate">{myUserId || '...'}</p>
                                            </div>
                                            <button 
                                                onClick={() => { if (myUserId) { navigator.clipboard.writeText(myUserId); } }}
                                                className="p-2.5 bg-white hover:bg-blue-50 border border-gray-200 rounded-xl transition-colors active:scale-95 shrink-0"
                                                title="Copy ID"
                                            >
                                                <Copy className="w-4 h-4 text-gray-500" />
                                            </button>
                                        </div>

                                        {/* Add Friend by ID */}
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Enter User ID to add..."
                                                value={friendIdInput}
                                                onChange={(e) => setFriendIdInput(e.target.value)}
                                                className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-gray-900 font-medium placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                            />
                                            <button
                                                onClick={() => {
                                                    if (friendIdInput.trim() && ws.current?.readyState === WebSocket.OPEN) {
                                                        ws.current.send(JSON.stringify({ type: 'FRIEND_REQUEST_BY_ID', payload: { targetId: friendIdInput.trim() } }));
                                                        setSentFriendRequests(prev => [...prev, friendIdInput.trim()]);
                                                        setFriendIdInput('');
                                                    }
                                                }}
                                                className="px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-colors active:scale-95 shrink-0"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Section Tabs */}
                                        <div className="flex bg-gray-100 p-1 rounded-xl">
                                            <button onClick={() => setSocialSection('friends')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${socialSection === 'friends' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Friends ({friends.length})</button>
                                            <button onClick={() => setSocialSection('nearby')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${socialSection === 'nearby' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Nearby ({nearbyUsers.length})</button>
                                            <button onClick={() => setSocialSection('recent')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${socialSection === 'recent' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Recent</button>
                                            <button onClick={() => setSocialSection('blocked')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${socialSection === 'blocked' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Blocked</button>
                                        </div>

                                        {/* Friends Section */}
                                        {socialSection === 'friends' && (
                                            friends.length > 0 ? (
                                                <div className="divide-y divide-gray-50">
                                                    {friends.map(f => (
                                                        <div
                                                            key={f.id}
                                                            onClick={() => { setSelectedUser({ ...f, isFriend: true }); setActiveTab('info'); }}
                                                            className="flex items-center gap-3 py-3 hover:bg-gray-50 rounded-2xl px-2 transition-colors cursor-pointer"
                                                        >
                                                            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 shrink-0">
                                                                <img src={normalizeImageUrl(f.avatar_url || f.photoURL) || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.username || f.displayName || 'U')}`} className="w-full h-full object-cover" alt={f.username} onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(f.username || f.displayName || 'U')}&background=3b82f6&color=fff&size=100&bold=true`; }} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-bold text-gray-900 text-sm truncate">{f.displayName || f.username}</h4>
                                                                <div className="flex items-center gap-1">
                                                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                                                    <p className="text-[10px] text-emerald-500 font-bold uppercase">Online</p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onOpenChat?.(f.id, f.displayName || f.username); }}
                                                                className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                                                            >
                                                                <MessageCircle className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-10 text-center bg-gray-50 rounded-[32px]">
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                                        <UserPlus className="w-6 h-6 text-gray-200" />
                                                    </div>
                                                    <p className="text-gray-400 text-xs font-medium">No friends added yet</p>
                                                    <p className="text-gray-300 text-[11px] mt-1">Share your ID or add someone above</p>
                                                </div>
                                            )
                                        )}

                                        {/* Nearby People Section */}
                                        {socialSection === 'nearby' && (
                                            nearbyUsers.length > 0 ? (
                                                <div className="divide-y divide-gray-50">
                                                    {nearbyUsers.map(u => (
                                                        <div
                                                            key={u.id}
                                                            onClick={() => setSelectedUser(u)}
                                                            className="flex items-center gap-3 py-3 hover:bg-gray-50 rounded-2xl px-2 transition-colors cursor-pointer group"
                                                        >
                                                            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 shrink-0 relative">
                                                                <img src={normalizeImageUrl(u.avatar_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || 'U')}`} className="w-full h-full object-cover" alt={u.username} onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || 'U')}&background=3b82f6&color=fff&size=100&bold=true`; }} />
                                                                {u.gallery?.active && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-full animate-pulse" />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <h4 className="font-bold text-gray-900 text-sm truncate">{u.username || 'Mysterious User'}</h4>
                                                                    {u.isSelf && <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase">You</span>}
                                                                </div>
                                                                <p className="text-[11px] text-gray-400 truncate">{u.status || "Exploring digital world"}</p>
                                                            </div>
                                                            <div className="text-[10px] text-gray-300 font-bold uppercase group-hover:text-blue-500 transition-colors">View</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-12 text-center bg-gray-50 rounded-[32px]">
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                                        <Navigation className="w-6 h-6 text-gray-200" />
                                                    </div>
                                                    <p className="text-gray-400 text-xs font-medium">No active users found nearby</p>
                                                </div>
                                            )
                                        )}

                                        {/* Recent Interactions */}
                                        {socialSection === 'recent' && (
                                            <div className="py-10 text-center bg-gray-50 rounded-[32px]">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                                    <RefreshCw className="w-6 h-6 text-gray-200" />
                                                </div>
                                                <p className="text-gray-400 text-xs font-medium">No recent interactions</p>
                                                <p className="text-gray-300 text-[11px] mt-1">View profiles and chat to build history</p>
                                            </div>
                                        )}

                                        {/* Blocked Users */}
                                        {socialSection === 'blocked' && (
                                            <div className="py-10 text-center bg-gray-50 rounded-[32px]">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                                    <AlertTriangle className="w-6 h-6 text-gray-200" />
                                                </div>
                                                <p className="text-gray-400 text-xs font-medium">No blocked users</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {mainTab === 'notifications' && (
                                    <div className="space-y-4 pt-16 md:pt-4">
                                        <div className="flex items-center justify-between px-1 mb-2">
                                            <h3 className="text-lg font-black text-gray-900">Notifications</h3>
                                            {notifications.filter((n: any) => !n.isRead).length > 0 && (
                                                <button 
                                                    onClick={async () => {
                                                        const API_BASE = externalApi.getBaseUrl ? externalApi.getBaseUrl() : 'https://api.alin.city';
                                                        await fetch(`${API_BASE}/api/notifications/read-all`, { method: 'PUT', headers: { 'X-Device-Id': externalApi.getDeviceId() }});
                                                        if (fetchNotifications) fetchNotifications();
                                                    }} 
                                                    className="text-xs text-blue-600 font-bold hover:underline"
                                                >
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>
                                        {notifications.length > 0 ? (
                                            <div className="divide-y divide-gray-50 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                                {notifications.map((n: any) => (
                                                    <div key={n.id} className={`flex items-start gap-3 p-4 transition-colors ${!n.isRead ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                                                        <div className="relative shrink-0">
                                                            <img src={normalizeImageUrl(n.actor?.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(n.actor?.name || 'User')}&background=random`} className="w-10 h-10 rounded-full object-cover" />
                                                            {!n.isRead && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-full" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0 pt-0.5">
                                                            <p className="text-sm text-gray-900"><span className="font-bold">{n.actor?.name}</span> {n.message}</p>
                                                            <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString('vi-VN', {hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'})}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-12 flex flex-col items-center justify-center text-center">
                                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4"><Bell className="w-8 h-8 text-gray-300" /></div>
                                                <p className="text-gray-500 font-bold text-sm">No notifications</p>
                                                <p className="text-gray-400 text-xs mt-1">You're all caught up!</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {mainTab === 'profile' && !selectedUser && (
                                    <div className="space-y-4 pt-16 md:pt-4">
                                        <h3 className="text-lg font-black text-gray-900 px-1 mb-2">My Profile</h3>

                                        {/* Avatar & Basic Info */}
                                        <div className="flex items-start gap-4 mb-6 px-1">
                                            <div className="w-20 h-20 bg-gray-100 rounded-[20px] overflow-hidden shrink-0 shadow-sm border border-gray-200 relative group/avatar cursor-pointer" onClick={() => showNotification?.("Chức năng đổi ảnh đại diện sẽ sớm ra mắt!", "info")}>
                                                <img
                                                    src={normalizeImageUrl(user?.photoURL) || `https://ui-avatars.com/api/?name=${encodeURIComponent(myDisplayName)}&background=3b82f6&color=fff&size=150&bold=true`}
                                                    alt="Avatar"
                                                    className="w-full h-full object-cover transition-transform group-hover/avatar:scale-110"
                                                    onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(myDisplayName)}&background=3b82f6&color=fff&size=150&bold=true`; }}
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity justify-center items-center flex">
                                                    <Edit className="w-6 h-6 text-white drop-shadow-md" />
                                                </div>
                                            </div>
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
                                                
                                                {/* ID Copy placed here concisely */}
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
                                                        <h4 className="text-[13px] font-bold text-gray-900 mb-3">🎮 My Games</h4>
                                                        <div className="space-y-2">
                                                            {games.filter((g) => g.creatorId === user?.uid || g.creatorId === myUserId).map((g) => (
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
                                                            {games.filter((g) => g.creatorId === user?.uid || g.creatorId === myUserId).length === 0 && (
                                                                <p className="text-[12px] text-gray-400 text-center py-4">No games created yet.</p>
                                                            )}
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
                                                            <input
                                                                type="text"
                                                                placeholder="Post title..."
                                                                value={postTitle}
                                                                onChange={(e) => setPostTitle(e.target.value.substring(0, 50))}
                                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
                                                            />
                                                            <p className="text-[10px] text-right text-gray-400">{postTitle.length}/50</p>
                                                            <div className="flex gap-2">
                                                                <label className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95">
                                                                    <ImageIcon className="w-4 h-4" /> Add Photos & Post
                                                                    <input
                                                                        type="file"
                                                                        hidden
                                                                        accept="image/png,image/jpeg,image/webp"
                                                                        multiple
                                                                        onChange={(e) => {
                                                                            const files = Array.from(e.target.files || []) as File[];
                                                                            handleCreatePost(files);
                                                                        }}
                                                                    />
                                                                </label>
                                                                <button
                                                                    onClick={() => handleCreatePost([])}
                                                                    className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                                                                >
                                                                    Text Only
                                                                </button>
                                                            </div>
                                                            <button
                                                                onClick={() => { setIsCreatingPost(false); setPostTitle(''); }}
                                                                className="w-full text-gray-400 hover:text-gray-600 text-xs font-medium py-1 transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            {isSavingPost && <p className="text-[10px] text-blue-500 text-center animate-pulse">Posting...</p>}
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
                                )}

                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </>
    );
};

export default BottomSheet;
