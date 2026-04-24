import React, { useState, useRef } from 'react';
import { normalizeImageUrl, getBaseUrl } from '../../services/externalApi';
import { Search, MapPin, X, UserPlus, MessageCircle, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Heart, Star, Bookmark, PlusCircle, Diamond, Edit, Image as ImageIcon, User, Flag, Copy, AlertTriangle, Trash2, Navigation, CloudSun, Compass, Plus, RefreshCw, Bell, Gamepad2 } from 'lucide-react';
import { motion } from 'framer-motion';
import DiscoverView from './views/DiscoverView';
import SocialView from './views/SocialView';
import NotificationsView from './views/NotificationsView';
import MyProfileView from './views/MyProfileView';
import SelectedUserView from './views/SelectedUserView';
import CreatorTabView from './views/CreatorTabView';
import BackpackView from './views/BackpackView';


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
    onOpenChat?: (id: string, name: string, avatar?: string) => void;
    handlePlayGame?: (game: any) => void;
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
    myAvatarUrl: string;
    setMyAvatarUrl: (v: string) => void;
    setFriendIdInput: (v: string) => void;
    setSocialSection: (v: 'friends' | 'nearby' | 'recent' | 'blocked') => void;
    setIsCreatingPost: (v: boolean) => void;
    setPostTitle: (v: string) => void;
    handleAddFriend: () => void;
    handleMessage: () => void;
    handleCreatePost: (files: File[]) => void;
    handleStarPost: (postId: string) => void;
    handleDeletePost: (postId: string) => void;
    cloudflareUrl?: string;
    triggerAuth?: (callback: () => void) => void;
    externalOpenList?: boolean;
    onOpenListChange?: (v: boolean) => void;
    onPublishSuccess?: () => void;
}



const BottomSheet: React.FC<BottomSheetProps> = (props) => {
    const {
        isDesktop, isSheetExpanded, selectedUser, activeTab, mainTab, nearbyUsers, friends, games, userGames, userPosts,
        myUserId, myDisplayName, myStatus, myObfPos, user, searchTag,
        isReporting, reportReason, reportStatus, sentFriendRequests,
        isEditingStatus, isEditingName, statusInput, nameInput, isVisibleOnMap, friendIdInput, socialSection,
        isCreatingPost, postTitle, isSavingPost, galleryActive, currentProvince, radius,
        ws, panX, panY, scale, externalApi, onOpenChat, showNotification, handlePlayGame,
        setIsSheetExpanded, setSelectedUser, setActiveTab, setMainTab, setSearchTag,
        setIsReporting, setReportReason, setReportStatus,
        setIsEditingStatus, setIsEditingName, setStatusInput, setNameInput, setMyStatus, setMyDisplayName,
        setIsVisibleOnMap, setFriendIdInput, setSocialSection, setSentFriendRequests,
        setIsCreatingPost, setPostTitle, notifications, fetchNotifications, fetchUserPosts,
        handleAddFriend, handleMessage, handleCreatePost, handleStarPost, handleDeletePost, handleUpdateRadius,
        myAvatarUrl, setMyAvatarUrl,
        cloudflareUrl, triggerAuth, externalOpenList, onOpenListChange, onPublishSuccess
    } = props;

    const [showAvatarMenu, setShowAvatarMenu] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        if (file.size > 1024 * 1024) {
            showNotification?.("Ảnh tải lên không được vượt quá 1MB", "error");
            return;
        }

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const res = await fetch(`${getBaseUrl()}/api/profile/upload-avatar`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${user?.uid || ''}` },
                body: formData
            });
            const data = await res.json();
            if (res.ok && data.imageUrl) {
                setMyAvatarUrl(data.imageUrl);
                if (ws.current?.readyState === WebSocket.OPEN) {
                    ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { avatar_url: data.imageUrl } }));
                }
                showNotification?.("Cập nhật ảnh đại diện thành công", "success");
            } else {
                showNotification?.(data.error || "Lỗi tải ảnh", "error");
            }
        } catch (err) {
            console.error(err);
            showNotification?.("Lỗi kết nối khi tải ảnh", "error");
        }
        setShowAvatarMenu(false);
    };

    const handleDefaultAvatar = () => {
        setMyAvatarUrl('');
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { avatar_url: '' } }));
        }
        showNotification?.("Đã đổi về ảnh mặc định", "success");
        setShowAvatarMenu(false);
    };

    const [searchResults, setSearchResults] = React.useState<{ posts: any[], users: any[], games?: any[] }>({ posts: [], users: [], games: [] });
    const [isSearching, setIsSearching] = React.useState(false);
    const [showSearchResults, setShowSearchResults] = React.useState(false);
    const [panelWidth, setPanelWidth] = React.useState(400);
    const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const API_BASE_SEARCH = getBaseUrl();

    React.useEffect(() => {
        if (!searchTag || searchTag.trim().length < 2) {
            setSearchResults({ posts: [], users: [], games: [] });
            setShowSearchResults(false);
            return;
        }
        setIsSearching(true);
        setShowSearchResults(true);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(async () => {
            try {
                const resp = await fetch(`${API_BASE_SEARCH}/api/search?q=${encodeURIComponent(searchTag.trim())}`);
                const data = await resp.json();
                if (data.success) {
                    // Merge nearby users matching tag
                    const localUserMatches = nearbyUsers.filter(u =>
                        (u.username || '').toLowerCase().includes(searchTag.toLowerCase()) ||
                        (u.status || '').toLowerCase().includes(searchTag.toLowerCase())
                    ).map(u => ({ id: u.id, displayName: u.username, avatar: u.avatar_url, status: u.status || '' }));

                    // Deduplicate by id
                    const allUsers = [...data.users];
                    localUserMatches.forEach(lu => {
                        if (!allUsers.find((u: any) => u.id === lu.id)) allUsers.push(lu);
                    });

                    setSearchResults({ posts: data.posts, users: allUsers.slice(0, 10), games: data.games || [] });
                }
            } catch (err) {
                console.error('[Search]', err);
            }
            setIsSearching(false);
        }, 300); // 300ms debounce like TikTok/FB
        return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
    }, [searchTag]);

    const DEGREES_TO_PX = 11100;

    return (
        <>
            <div 
                className={`absolute left-0 right-0 md:left-[72px] md:right-auto md:translate-x-0 pointer-events-none z-[140] ${isDesktop ? 'top-0 bottom-0 overflow-visible' : 'top-20 bottom-[60px] overflow-hidden w-full'}`}
                style={isDesktop ? { width: panelWidth } : {}}
            >
                <motion.div
                    className="absolute top-0 left-0 right-0 h-full bg-white rounded-t-[32px] md:rounded-none shadow-[0_-10px_40px_rgba(0,0,0,0.15)] md:shadow-[4px_0_24px_rgba(0,0,0,0.1)] md:border-r md:border-gray-200 flex flex-col pointer-events-auto"
                    variants={{
                        expanded: { y: isDesktop ? 0 : '25vh', x: 0 },
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

                    {/* PC Resize Handle */}
                    {isDesktop && isSheetExpanded && (
                        <motion.div
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0}
                            dragMomentum={false}
                            onDrag={(e, info) => {
                                setPanelWidth(prev => Math.min(Math.max(320, prev + info.delta.x), 800));
                            }}
                            className="absolute top-0 right-[-4px] bottom-0 w-2 cursor-col-resize hover:bg-blue-500/30 z-[160] transition-colors"
                        />
                    )}

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

                    <div className="flex-1 overflow-y-auto px-4 pb-32 md:pb-6 md:pt-[76px] relative z-[100] subtle-scrollbar" style={{ direction: 'rtl' }}>
                      <div style={{ direction: 'ltr' }}>
                        {/* Instant Search Results Dropdown */}
                        {showSearchResults && searchTag.trim().length >= 2 && !selectedUser && (
                            <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                {isSearching && (
                                    <div className="flex items-center justify-center gap-2 py-4">
                                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                                        <span className="text-xs text-gray-400 font-medium">Đang tìm kiếm...</span>
                                    </div>
                                )}

                                {!isSearching && searchResults.users.length === 0 && searchResults.posts.length === 0 && (!searchResults.games || searchResults.games.length === 0) && (
                                    <div className="text-center py-6">
                                        <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                        <p className="text-sm text-gray-400">Không tìm thấy kết quả cho "{searchTag}"</p>
                                    </div>
                                )}

                                {/* Users Results */}
                                {searchResults.users.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Users</p>
                                        <div className="space-y-1">
                                            {searchResults.users.map((u: any) => (
                                                <button
                                                    key={u.id}
                                                    onClick={() => {
                                                        // Try to find in nearbyUsers to select on map
                                                        const mapUser = nearbyUsers.find(nu => nu.id === u.id);
                                                        if (mapUser) {
                                                            setSelectedUser(mapUser);
                                                            setIsSheetExpanded(true);
                                                        }
                                                        setShowSearchResults(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors active:scale-[0.98]"
                                                >
                                                    <img
                                                        src={normalizeImageUrl(u.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || 'U')}&background=3b82f6&color=fff&size=80`}
                                                        className="w-9 h-9 rounded-full object-cover bg-gray-100 shrink-0"
                                                        alt=""
                                                        onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || 'U')}&background=3b82f6&color=fff&size=80`; }}
                                                    />
                                                    <div className="flex-1 min-w-0 text-left">
                                                        <p className="text-[13px] font-bold text-gray-900 truncate">{u.displayName}</p>
                                                        {u.status && <p className="text-[11px] text-gray-500 truncate">{u.status}</p>}
                                                    </div>
                                                    <User className="w-4 h-4 text-gray-300 shrink-0" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Posts Results */}
                                {searchResults.posts.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Posts</p>
                                        <div className="space-y-1">
                                            {searchResults.posts.map((p: any) => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => {
                                                        // Navigate to the post author's profile
                                                        if (p.author?.id) {
                                                            const mapUser = nearbyUsers.find(nu => nu.id === p.author.id);
                                                            if (mapUser) { setSelectedUser(mapUser); setActiveTab('posts'); }
                                                        }
                                                        setShowSearchResults(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors active:scale-[0.98]"
                                                >
                                                    {p.images && p.images.length > 0 ? (
                                                        <img src={normalizeImageUrl(p.images[0])} className="w-9 h-9 rounded-lg object-cover bg-gray-100 shrink-0" alt="" />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                                            <Edit className="w-4 h-4 text-blue-400" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0 text-left">
                                                        <p className="text-[13px] font-bold text-gray-900 truncate">{p.title}</p>
                                                        <p className="text-[11px] text-gray-500 truncate">
                                                            {p.author?.name || 'User'} • {p.likeCount || 0} ❤️
                                                        </p>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Games Results */}
                                {searchResults.games && searchResults.games.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Games</p>
                                        <div className="space-y-1">
                                            {searchResults.games.map((g: any) => (
                                                <button
                                                    key={g.id}
                                                    onClick={() => {
                                                        if (handlePlayGame) handlePlayGame(g);
                                                    }}
                                                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors active:scale-[0.98]"
                                                >
                                                    {g.thumbnail ? (
                                                        <img src={normalizeImageUrl(g.thumbnail)} className="w-9 h-9 rounded-lg object-cover bg-gray-100 shrink-0" alt="" />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                                                            <Gamepad2 className="w-4 h-4 text-emerald-500" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0 text-left">
                                                        <p className="text-[13px] font-bold text-gray-900 truncate">{g.title}</p>
                                                        <p className="text-[11px] text-gray-500 truncate">
                                                            {g.category || 'Game'} • {g.playCount || 0} plays
                                                        </p>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {selectedUser ? (
                            <SelectedUserView
                                selectedUser={selectedUser} setSelectedUser={setSelectedUser} activeTab={activeTab as any} setActiveTab={setActiveTab as any}
                                fetchUserPosts={fetchUserPosts} sentFriendRequests={sentFriendRequests} friends={friends}
                                handleAddFriend={handleAddFriend} handleMessage={handleMessage} myObfPos={myObfPos}
                                panX={panX} panY={panY} scale={scale} isReporting={isReporting} setIsReporting={setIsReporting}
                                reportStatus={reportStatus} setReportStatus={setReportStatus} reportReason={reportReason}
                                setReportReason={setReportReason} ws={ws} games={userGames} userPosts={userPosts}
                                handleStarPost={handleStarPost} handleDeletePost={handleDeletePost} externalApi={externalApi}
                            />
                        ) : (
                            <div className="pt-2">
                                {mainTab === 'discover' && (
                                    <DiscoverView games={games} nearbyUsers={nearbyUsers} setSearchTag={setSearchTag} handlePlayGame={handlePlayGame} />
                                )}
                                {mainTab === 'friends' && (
                                    <SocialView
                                        myUserId={myUserId} friendIdInput={friendIdInput} setFriendIdInput={setFriendIdInput}
                                        ws={ws} setSentFriendRequests={setSentFriendRequests as any} socialSection={socialSection}
                                        setSocialSection={setSocialSection} friends={friends} nearbyUsers={nearbyUsers}
                                        setSelectedUser={setSelectedUser} setActiveTab={setActiveTab as any} onOpenChat={onOpenChat}
                                    />
                                )}
                                {mainTab === 'notifications' && (
                                    <NotificationsView notifications={notifications} externalApi={externalApi} fetchNotifications={fetchNotifications} />
                                )}
                                {mainTab === 'profile' && !selectedUser && (
                                    <MyProfileView
                                        myUserId={myUserId} myDisplayName={myDisplayName} myAvatarUrl={myAvatarUrl} myStatus={myStatus} currentProvince={currentProvince}
                                        activeTab={activeTab as any} setActiveTab={setActiveTab as any} galleryActive={galleryActive} isEditingName={isEditingName}
                                        setIsEditingName={setIsEditingName} nameInput={nameInput} setNameInput={setNameInput} setMyDisplayName={setMyDisplayName}
                                        isEditingStatus={isEditingStatus} setIsEditingStatus={setIsEditingStatus} statusInput={statusInput} setStatusInput={setStatusInput}
                                        setMyStatus={setMyStatus} radius={radius} handleUpdateRadius={handleUpdateRadius} isVisibleOnMap={isVisibleOnMap}
                                        setIsVisibleOnMap={setIsVisibleOnMap} games={games} userPosts={userPosts} isCreatingPost={isCreatingPost}
                                        setIsCreatingPost={setIsCreatingPost} postTitle={postTitle} setPostTitle={setPostTitle} isSavingPost={isSavingPost}
                                        ws={ws} myObfPos={myObfPos} user={user} showNotification={showNotification} setIsSheetExpanded={setIsSheetExpanded}
                                        setMainTab={setMainTab} handleCreatePost={handleCreatePost} handleStarPost={handleStarPost} handleDeletePost={handleDeletePost}
                                        fetchUserPosts={fetchUserPosts} externalApi={externalApi} showAvatarMenu={showAvatarMenu} setShowAvatarMenu={setShowAvatarMenu}
                                        avatarInputRef={avatarInputRef} handleAvatarUpload={handleAvatarUpload} handleDefaultAvatar={handleDefaultAvatar}
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
                                {mainTab === 'backpack' && (
                                    <BackpackView />
                                )}
                            </div>
                        )}
                      </div>
                    </div>
                </motion.div>
            </div>
        </>
    );
};

export default BottomSheet;
