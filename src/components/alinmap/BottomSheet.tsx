import React from 'react';
import { Database, Search, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import DiscoverView from './features/explore/components/DiscoverView';
import SocialView from './features/social/components/SocialView';
import NotificationsView from './features/social/components/NotificationsView';
import MyProfileView from './features/profile/components/MyProfileView';
import SelectedUserView from './features/profile/components/SelectedUserView';
import CreatorTabView from './features/creator/components/CreatorTabView';
import BackpackView from './features/backpack/components/BackpackView';
import SheetSearchResults from './SheetSearchResults';
import { useSocial } from './features/social/context/SocialContext';
import { useProfile } from './features/profile/context/ProfileContext';
import { isLooterAtFortress, useLooterGame } from './looter-game/LooterGameContext';

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
    myObfPos: { lat: number; lng: number } | null;
    user: any;
    searchTag: string;
    isCreatingPost: boolean;
    postTitle: string;
    postPrivacy: 'public' | 'friends' | 'private';
    isSavingPost: boolean;
    galleryActive: boolean;
    currentProvince: string | null;
    radius: number;
    fetchUserPosts: (uid: string) => void;
    ws: React.MutableRefObject<WebSocket | null>;
    panX: any;
    panY: any;
    onLocateUser?: (lat: number, lng: number) => void;
    externalApi: any;
    onOpenChat?: (id: string, name: string, avatar?: string) => void;
    handlePlayGame?: (game: any) => void;
    showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
    handleUpdateRadius: (v: number) => void;
    setIsSheetExpanded: (v: boolean) => void;
    setSelectedUser: (user: any) => void;
    setActiveTab: (tab: 'info' | 'posts' | 'saved') => void;
    setMainTab: (tab: any) => void;
    setSearchTag: (v: string) => void;
    setMyDisplayName: (v: string) => void;
    myAvatarUrl: string;
    setMyAvatarUrl: (v: string) => void;
    setIsCreatingPost: (v: boolean) => void;
    setPostTitle: (v: string) => void;
    setPostPrivacy: (v: 'public' | 'friends' | 'private') => void;
    handleCreatePost: (files: File[]) => void;
    handleUpdatePostPrivacy: (postId: string, privacy: string) => void;
    handleStarPost: (postId: string) => void;
    handleDeletePost: (postId: string) => void;
    cloudflareUrl?: string;
    triggerAuth?: (callback: () => void) => void;
    requireAuth?: (actionLabel: string, afterLogin?: () => void) => boolean;
    logout?: () => void;
    externalOpenList?: boolean;
    onOpenListChange?: (v: boolean) => void;
    onPublishSuccess?: () => void;
    requestLocation?: (forceInvisible?: boolean, wsRef?: React.MutableRefObject<WebSocket | null>, setIsVisibleOnMap?: (v: boolean) => void) => void;
}

const BottomSheet: React.FC<BottomSheetProps> = (props) => {
    const {
        isDesktop, isSheetExpanded, selectedUser, activeTab, mainTab, nearbyUsers, friends, games, userGames, userPosts,
        myUserId, myDisplayName, myObfPos, user, searchTag,
        isCreatingPost, postTitle, postPrivacy, isSavingPost, galleryActive, currentProvince, radius,
        ws, panX, panY, onLocateUser, externalApi, onOpenChat, showNotification, handlePlayGame,
        setIsSheetExpanded, setSelectedUser, setActiveTab, setMainTab, setSearchTag,
        setMyDisplayName,
        setIsCreatingPost, setPostTitle, setPostPrivacy, fetchUserPosts,
        handleCreatePost, handleUpdatePostPrivacy, handleStarPost, handleDeletePost, handleUpdateRadius,
        myAvatarUrl, setMyAvatarUrl,
        cloudflareUrl, triggerAuth, requireAuth, logout, externalOpenList, onOpenListChange, onPublishSuccess, requestLocation
    } = props;

    const { sentFriendRequests, handleAddFriend, handleMessage } = useSocial();
    const { isItemDragging, encounter, state: looterState, toggleIntegratedStorage } = useLooterGame();
    const { isVisibleOnMap, setIsVisibleOnMap } = useProfile();

    React.useEffect(() => {
        (window as any).collapseLooterTab = () => {
            setIsSheetExpanded(false);
        };
        return () => {
            delete (window as any).collapseLooterTab;
        };
    }, [setIsSheetExpanded]);

    const [panelWidth, setPanelWidth] = React.useState(400);
    const [exploreSubTab, setExploreSubTab] = React.useState<'games' | 'creator'>('games');
    const [socialSubTab, setSocialSubTab] = React.useState<'posts' | 'nearby'>('posts');
    const shouldHideSearch = ['profile', 'backpack'].includes(mainTab);

    const handleEnterWorld = React.useCallback(() => {
        setIsSheetExpanded(false);
    }, [setIsSheetExpanded]);

    const isWhiteBg = mainTab !== 'backpack';

    return (
        <>
            <div
                className={`absolute left-0 right-0 md:left-[72px] md:right-auto md:translate-x-0 pointer-events-none z-[140] ${isDesktop ? 'top-0 bottom-0 overflow-visible' : (mainTab === 'backpack' ? 'top-0 bottom-0 overflow-visible w-full' : 'top-0 bottom-0 overflow-hidden w-full')}`}
                style={isDesktop ? { width: panelWidth } : {}}
            >
                <motion.div
                    className={`absolute top-0 left-0 right-0 h-full ${isWhiteBg ? 'bg-white' : 'bg-[#121417]'} rounded-t-[32px] md:rounded-none shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:shadow-[4px_0_24px_rgba(0,0,0,0.05)] md:border-r ${isWhiteBg ? 'border-gray-100' : 'border-white/5'} flex flex-col pointer-events-auto`}
                    variants={{
                        full: { 
                            y: (!isDesktop && mainTab === 'backpack') ? '55%' : 0, 
                            x: 0 
                        },
                        collapsed: {
                            y: isDesktop ? 0 : '100%',
                            x: isDesktop ? '-100%' : 0
                        }
                    }}
                    initial="collapsed"
                    animate={isSheetExpanded || selectedUser ? 'full' : "collapsed"}
                    transition={{ type: "spring", stiffness: 400, damping: 40 }}
                    drag={isDesktop || isItemDragging || mainTab === 'backpack' ? false : "y"}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={0.05}
                    onDragEnd={(e, info) => {
                        if (isDesktop) return;
                        const threshold = 60;
                        if (!isSheetExpanded) {
                            if (info.offset.y < -threshold) {
                                setIsSheetExpanded(true);
                            }
                        } else if (info.offset.y > threshold) {
                            if (!isItemDragging) {
                                setIsSheetExpanded(false);
                                setSelectedUser(null);
                            }
                        }
                    }}
                >
                    {/* Fortress Storage Edge Button */}
                    {mainTab === 'backpack' && isLooterAtFortress(looterState) && (
                        <button
                            type="button"
                            data-map-interactive="true"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsSheetExpanded(true);
                                toggleIntegratedStorage?.('fortress');
                            }}
                            className="absolute -top-12 left-3 z-[190] flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300/50 bg-[#121417]/95 text-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.35)] backdrop-blur-xl transition-all hover:border-amber-200 hover:text-amber-100 active:scale-95 md:top-4 md:-left-14"
                            title="Mở Kho Thành Trì"
                        >
                            <Database className="h-5 w-5" />
                        </button>
                    )}

                    {/* PC Hinge Toggle Button */}
                    <button
                        onClick={() => {
                            if (!isItemDragging) setIsSheetExpanded(!isSheetExpanded);
                        }}
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
                    <div className={`backdrop-blur-md sticky top-0 z-[110] shrink-0 border-b ${isWhiteBg ? 'bg-white/80 border-gray-100' : 'bg-[#121417]/80 border-white/5'}`}>
                        {/* Hover Area / Handle (Mobile Only) */}
                        {!isDesktop && mainTab !== 'backpack' && (
                            <div className={`w-full flex md:hidden flex-col items-center pt-2 pb-1 cursor-pointer transition-colors ${isWhiteBg ? 'active:bg-gray-50' : 'active:bg-white/5'}`} 
                                onClick={() => {
                                    if (!isSheetExpanded) {
                                        setIsSheetExpanded(true);
                                    } else {
                                        setIsSheetExpanded(false);
                                        setSelectedUser(null);
                                    }
                                }}>
                                <div className="w-10 h-1 bg-gray-300 rounded-full mb-1" />
                                <div className="text-gray-400">
                                    {isSheetExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                                </div>
                            </div>
                        )}

                        {/* MOBILE Search Bar inside Sheet */}
                        {!isDesktop && isSheetExpanded && !shouldHideSearch && (
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

                    {mainTab === 'backpack' ? (
                      <div className="flex-1 relative z-[100] flex flex-col overflow-visible">
                        <BackpackView onEnterWorld={handleEnterWorld} readOnly={!!encounter} />
                      </div>
                    ) : (
                      <div 
                        className={`flex-1 overflow-y-auto px-4 pb-32 md:pb-6 md:pt-[76px] relative z-[100] subtle-scrollbar`} 
                        style={{ direction: 'rtl' }}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <div style={{ direction: 'ltr' }}>
                        {/* Instant Search Results */}
                        {!selectedUser && !shouldHideSearch && (
                            <SheetSearchResults
                                searchTag={searchTag}
                                nearbyUsers={nearbyUsers}
                                setSelectedUser={setSelectedUser}
                                setActiveTab={setActiveTab}
                                setIsSheetExpanded={setIsSheetExpanded}
                                handlePlayGame={handlePlayGame}
                            />
                        )}

                        {selectedUser ? (
                            <SelectedUserView
                                selectedUser={selectedUser} setSelectedUser={setSelectedUser} activeTab={activeTab as any} setActiveTab={setActiveTab as any}
                                fetchUserPosts={fetchUserPosts} friends={friends}
                                myObfPos={myObfPos}
                                panX={panX} panY={panY} onLocateUser={onLocateUser!}
                                ws={ws} games={userGames} userPosts={userPosts}
                                handleStarPost={handleStarPost} handleDeletePost={handleDeletePost} externalApi={externalApi}
                                requireAuth={requireAuth}
                            />
                        ) : (
                            <div className={mainTab === 'backpack' ? 'pt-0' : 'pt-2'}>
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

                                        {/* Explore Sub-tabs Switcher */}
                                        {!selectedUser && (
                                            <div className="absolute bottom-[72px] left-0 right-0 z-[160] px-6 pb-4 pointer-events-none">
                                                <div className="flex bg-white/80 backdrop-blur-2xl p-1.5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-200/50 pointer-events-auto max-w-[400px] mx-auto">
                                                    <button 
                                                        onClick={() => setExploreSubTab('games')}
                                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${exploreSubTab === 'games' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                                                    >
                                                        <span>🎮 Games</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => setExploreSubTab('creator')}
                                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${exploreSubTab === 'creator' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                                                    >
                                                        <span>🎨 Creator</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {mainTab === 'friends' && (
                                    <div className="flex flex-col h-full">
                                        <SocialView
                                            myUserId={myUserId} myObfPos={myObfPos}
                                            friends={friends} nearbyUsers={nearbyUsers}
                                            setSelectedUser={setSelectedUser} radius={radius}
                                            handleUpdateRadius={handleUpdateRadius}
                                            isVisibleOnMap={isVisibleOnMap}
                                            setIsVisibleOnMap={setIsVisibleOnMap}
                                            requestLocation={requestLocation}
                                            ws={ws}
                                            
                                            userPosts={userPosts}
                                            isCreatingPost={isCreatingPost}
                                            setIsCreatingPost={setIsCreatingPost}
                                            postTitle={postTitle}
                                            setPostTitle={setPostTitle}
                                            postPrivacy={postPrivacy}
                                            setPostPrivacy={setPostPrivacy}
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

                                        {/* Social Sub-tabs Switcher */}
                                        {!selectedUser && (
                                            <div className="absolute bottom-[72px] left-0 right-0 z-[160] px-6 pb-4 pointer-events-none">
                                                <div className="flex bg-white/80 backdrop-blur-2xl p-1.5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-200/50 pointer-events-auto max-w-[400px] mx-auto">
                                                    <button 
                                                        onClick={() => setSocialSubTab('posts')}
                                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${socialSubTab === 'posts' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                                                    >
                                                        <span>📰 Posts</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => setSocialSubTab('nearby')}
                                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${socialSubTab === 'nearby' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                                                    >
                                                        <span>📍 Nearby</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {mainTab === 'notifications' && (
                                    <NotificationsView externalApi={externalApi} />
                                )}
                                {mainTab === 'profile' && !selectedUser && (
                                    <MyProfileView
                                        myUserId={myUserId} myDisplayName={myDisplayName} myAvatarUrl={myAvatarUrl} currentProvince={currentProvince}
                                        activeTab={(activeTab === 'posts' ? 'info' : activeTab) as any} setActiveTab={setActiveTab as any}
                                        setMyDisplayName={setMyDisplayName}
                                        radius={radius} handleUpdateRadius={handleUpdateRadius} games={games} userPosts={userPosts}
                                        ws={ws} myObfPos={myObfPos} user={user} showNotification={showNotification} setIsSheetExpanded={setIsSheetExpanded}
                                        setMainTab={setMainTab} 
                                        handleStarPost={handleStarPost} handleDeletePost={handleDeletePost}
                                        fetchUserPosts={fetchUserPosts} externalApi={externalApi} setMyAvatarUrl={setMyAvatarUrl}
                                        triggerAuth={triggerAuth} requireAuth={requireAuth} logout={logout}
                                        requestLocation={requestLocation} friends={friends} setSelectedUser={setSelectedUser}
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
                    </div>
                    )}
                </motion.div>
            </div>
        </>
    );
};

export default BottomSheet;
