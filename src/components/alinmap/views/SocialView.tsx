import React from 'react';
import { Copy, Plus, UserPlus, MessageCircle, Navigation, RefreshCw, AlertTriangle } from 'lucide-react';
import { normalizeImageUrl } from '../../../services/externalApi';

interface SocialViewProps {
    myUserId: string | null;
    friendIdInput: string;
    setFriendIdInput: (val: string) => void;
    ws: React.MutableRefObject<WebSocket | null>;
    setSentFriendRequests: React.Dispatch<React.SetStateAction<string[]>>;
    socialSection: 'friends' | 'nearby' | 'recent' | 'blocked';
    setSocialSection: (val: 'friends' | 'nearby' | 'recent' | 'blocked') => void;
    friends: any[];
    nearbyUsers: any[];
    setSelectedUser: (user: any) => void;
    setActiveTab: (tab: 'info' | 'posts' | 'saved') => void;
    onOpenChat?: (id: string, name: string, avatar?: string) => void;
    requireAuth?: (actionLabel: string, afterLogin?: () => void) => boolean;
    handleAddFriendById?: (targetId: string) => Promise<void> | void;
}

const SocialView: React.FC<SocialViewProps> = ({
    myUserId, friendIdInput, setFriendIdInput, ws, setSentFriendRequests,
    socialSection, setSocialSection, friends, nearbyUsers,
    setSelectedUser, setActiveTab, onOpenChat, requireAuth, handleAddFriendById
}) => {
    return (
        <div className="space-y-5">
            <h3 className="text-lg font-black text-gray-900 px-1">Social</h3>

            {/* User ID + Copy */}
            <div className="bg-gray-50 rounded-2xl p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Your User ID</p>
                    <p className="text-[13px] font-mono font-bold text-gray-900 truncate">{myUserId || '...'}</p>
                </div>
                <button 
                    onClick={() => {
                        if (!myUserId) {
                            requireAuth?.('lay User ID');
                            return;
                        }
                        navigator.clipboard.writeText(myUserId);
                    }}
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
                    onClick={async () => {
                        const targetId = friendIdInput.trim();
                        if (!targetId) return;
                        if (requireAuth && !requireAuth('ket ban')) return;
                        await handleAddFriendById?.(targetId);
                        setSentFriendRequests(prev => prev.includes(targetId) ? prev : [...prev, targetId]);
                        setFriendIdInput('');
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
                <button onClick={() => setSocialSection('blocked')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${socialSection === 'blocked' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Blocked</button>
            </div>

            {/* Friends Section */}
            {socialSection === 'friends' && (
                <div className="flex flex-col gap-6">
                    {/* Recent Part */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-500 mb-3 px-1 uppercase tracking-wider">Recent Interactions</h4>
                        {/* Recent users will be listed here when available */}
                    </div>

                    {/* Friends Part */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-500 mb-3 px-1 uppercase tracking-wider">All Friends</h4>
                        {friends.length > 0 ? (
                            <div className="divide-y divide-gray-50 bg-white border border-gray-100 rounded-3xl p-1">
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
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (requireAuth && !requireAuth('nhan tin')) return;
                                                onOpenChat?.(f.id, f.displayName || f.username || f.id, f.avatarUrl || f.avatar_url || f.photoURL || '');
                                            }}
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
                        )}
                    </div>
                </div>
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
    );
};

export default SocialView;
