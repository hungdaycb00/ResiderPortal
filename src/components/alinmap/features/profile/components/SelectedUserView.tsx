import React from 'react';
import { X, UserPlus, MessageCircle, MapPin, Flag, ChevronRight, Edit } from 'lucide-react';
import { normalizeImageUrl } from '../../../../../services/externalApi';
import PostCard from './PostCard';
import { useProfile } from '../context/ProfileContext';
import { useSocial } from '../../social/context/SocialContext';

const DEGREES_TO_PX = 11100;

interface SelectedUserViewProps {
    selectedUser: any;
    setSelectedUser: (user: any) => void;
    activeTab: 'info' | 'posts' | 'saved';
    setActiveTab: (tab: 'info' | 'posts' | 'saved') => void;
    fetchUserPosts: (uid: string) => void;
    friends: any[];
    myObfPos: any;
    panX: any;
    panY: any;
    scale: any;
    ws: React.MutableRefObject<WebSocket | null>;
    games: any[];
    userPosts: any[];
    handleStarPost: (postId: string) => void;
    handleDeletePost: (postId: string) => void;
    externalApi: any;
    requireAuth?: (actionLabel: string, afterLogin?: () => void) => boolean;
}

const SelectedUserView: React.FC<SelectedUserViewProps> = ({
    selectedUser, setSelectedUser, activeTab, setActiveTab, fetchUserPosts,
    friends,
    myObfPos, panX, panY, scale, ws,
    games, userPosts, handleStarPost, handleDeletePost, externalApi, requireAuth
}) => {
    const { isReporting, setIsReporting, reportStatus, setReportStatus, reportReason, setReportReason } = useProfile();
    const { sentFriendRequests, handleAddFriend, handleMessage } = useSocial();

    return (
        <div className="pt-20 md:pt-6 pb-24 md:pb-6 px-2">
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
                    onClick={() => { setActiveTab('posts'); fetchUserPosts(selectedUser.id); }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'posts' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Posts {selectedUser.gallery?.active && <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full ml-1 animate-pulse" />}
                </button>
                <button
                    onClick={() => setActiveTab('info')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'info' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Info
                </button>
            </div>

            {activeTab === 'info' ? (
                <>
                    <p className="text-gray-500 text-[13px] truncate mb-2">{selectedUser.status || "Exploring the digital universe"}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
                        {(selectedUser.tags || ['#GAMER', '#ALIN']).map((tag: string) => (
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
                            <button onClick={() => { if (requireAuth && !requireAuth('bao cao nguoi dung')) return; setIsReporting(true); }} className="flex items-center gap-2 text-[11px] font-bold text-red-500 hover:text-red-600 transition-colors px-2 py-1">
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
                                            if (requireAuth && !requireAuth('bao cao nguoi dung')) return;
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
                                {games.length === 0 && (
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
                            <p className="text-[11px] text-gray-400 mt-1">This user hasn't posted anything.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SelectedUserView;
