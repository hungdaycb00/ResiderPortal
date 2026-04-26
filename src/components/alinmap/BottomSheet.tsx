import React from 'react';
import { Search, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import DiscoverView from './views/DiscoverView';
import SocialView from './views/SocialView';
import NotificationsView from './views/NotificationsView';
import MyProfileView from './views/MyProfileView';
import SelectedUserView from './views/SelectedUserView';
import CreatorTabView from './views/CreatorTabView';
import BackpackView from './views/BackpackView';
import SheetSearchResults from './SheetSearchResults';
import { useAvatarUpload } from './hooks/useAvatarUpload';


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
    logout?: () => void;
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
        cloudflareUrl, triggerAuth, logout, externalOpenList, onOpenListChange, onPublishSuccess
    } = props;

    const avatar = useAvatarUpload({ user, ws, setMyAvatarUrl, showNotification });
    const [panelWidth, setPanelWidth] = React.useState(400);
    const [mobileExpandLevel, setMobileExpandLevel] = React.useState<'half' | 'full'>('half');

    return (
        <>
            <div
                className={`absolute left-0 right-0 md:left-[72px] md:right-auto md:translate-x-0 pointer-events-none z-[140] ${isDesktop ? 'top-0 bottom-0 overflow-visible' : 'top-0 bottom-0 overflow-hidden w-full'}`}
                style={isDesktop ? { width: panelWidth } : {}}
            >
                <motion.div
                    className="absolute top-0 left-0 right-0 h-full bg-white rounded-t-[32px] md:rounded-none shadow-[0_-10px_40px_rgba(0,0,0,0.15)] md:shadow-[4px_0_24px_rgba(0,0,0,0.1)] md:border-r md:border-gray-200 flex flex-col pointer-events-auto"
                    variants={{
                        full: { y: isDesktop ? 0 : '0vh', x: 0 },
                        half: { y: isDesktop ? 0 : '25vh', x: 0 },
                        collapsed: {
                            y: isDesktop ? 0 : 'calc(100% - 60px)',
                            x: isDesktop ? '-100%' : 0
                        }
                    }}
                    initial="collapsed"
                    animate={isSheetExpanded || selectedUser ? (isDesktop ? 'full' : mobileExpandLevel) : "collapsed"}
                    transition={{ type: "spring", stiffness: 350, damping: 35 }}
                    drag={isDesktop ? false : "y"}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={0.05}
                    onDragEnd={(e, info) => {
                        if (isDesktop) return;
                        const threshold = 60;
                        if (!isSheetExpanded) {
                            if (info.offset.y < -threshold) {
                                setIsSheetExpanded(true);
                                setMobileExpandLevel('half');
                            }
                        } else if (mobileExpandLevel === 'full') {
                            if (info.offset.y > threshold) setMobileExpandLevel('half');
                        } else {
                            // half
                            if (info.offset.y < -threshold) setMobileExpandLevel('full');
                            else if (info.offset.y > threshold) {
                                setIsSheetExpanded(false);
                                setSelectedUser(null);
                            }
                        }
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
                        <div className="w-full flex md:hidden flex-col items-center pt-2 pb-1 cursor-pointer active:bg-gray-50 transition-colors shadow-[0_-2px_8px_rgba(0,0,0,0.02)]" 
                            onClick={() => {
                                if (!isSheetExpanded) {
                                    setIsSheetExpanded(true);
                                    setMobileExpandLevel('half');
                                } else if (mobileExpandLevel === 'half') {
                                    setMobileExpandLevel('full');
                                } else {
                                    setMobileExpandLevel('half');
                                }
                            }}>
                            <div className="w-10 h-1 bg-gray-300 rounded-full mb-1" />
                            <div className="text-gray-400">
                                {isSheetExpanded && mobileExpandLevel === 'full' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
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

                    <div 
                      className="flex-1 overflow-y-auto px-4 pb-32 md:pb-6 md:pt-[76px] relative z-[100] subtle-scrollbar" 
                      style={{ direction: 'rtl' }}
                      onPointerDownCapture={(e) => e.stopPropagation()}
                    >
                      <div style={{ direction: 'ltr' }}>
                        {/* Instant Search Results */}
                        {!selectedUser && (
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
                                        fetchUserPosts={fetchUserPosts} externalApi={externalApi}
                                        showAvatarMenu={avatar.showAvatarMenu} setShowAvatarMenu={avatar.setShowAvatarMenu}
                                        avatarInputRef={avatar.avatarInputRef} handleAvatarUpload={avatar.handleAvatarUpload} handleDefaultAvatar={avatar.handleDefaultAvatar}
                                        triggerAuth={triggerAuth} logout={logout}
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
