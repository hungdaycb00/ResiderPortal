import React, { useState, useEffect } from 'react';
import { ChevronRight, Users, Ban, MessageCircle, UserPlus, AlertTriangle, Mail, Check, X } from 'lucide-react';
import { normalizeImageUrl } from '../../../../../services/externalApi';
import { useSocial } from '../../social/context/SocialContext';

interface ProfileInfoTabProps {
    myUserId: string | null;
    friends: any[];
    games: any[];
    ws: React.MutableRefObject<WebSocket | null>;
    user: any;
    externalApi: any;
    requireAuth?: (actionLabel: string, afterLogin?: () => void) => boolean;
    setSelectedUser: (user: any) => void;
}

const ProfileInfoTab: React.FC<ProfileInfoTabProps> = ({
    myUserId, friends, games, setSelectedUser,
}) => {
    const {
        handleMessage,
        sentFriendRequests,
        incomingFriendRequests,
        fetchIncomingFriendRequests,
        handleAcceptFriendRequest,
        handleRejectFriendRequest,
    } = useSocial();
    const [activeList, setActiveList] = useState<'none' | 'friends' | 'blocked' | 'invites'>('none');

    useEffect(() => {
        fetchIncomingFriendRequests();
    }, [fetchIncomingFriendRequests]);

    return (
        <div className="space-y-4">
            {/* Social Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                    onClick={() => setActiveList(activeList === 'friends' ? 'none' : 'friends')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all ${activeList === 'friends' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50'}`}
                >
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-bold">Bạn bè ({friends.length})</span>
                </button>
                <button
                    onClick={() => setActiveList(activeList === 'invites' ? 'none' : 'invites')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all ${activeList === 'invites' ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50'}`}
                >
                    <Mail className="w-4 h-4" />
                    <span className="text-xs font-bold">Lời mời{incomingFriendRequests.length > 0 ? ` (${incomingFriendRequests.length})` : ''}</span>
                </button>
                <button
                    onClick={() => setActiveList(activeList === 'blocked' ? 'none' : 'blocked')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all col-span-2 ${activeList === 'blocked' ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-200' : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50'}`}
                >
                    <Ban className="w-4 h-4" />
                    <span className="text-xs font-bold">Đã chặn</span>
                </button>
            </div>

            {/* Friends List View */}
            {activeList === 'friends' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <h4 className="text-xs font-bold text-gray-500 mb-3 px-1 uppercase tracking-wider">Danh sách bạn bè</h4>
                    {friends.length > 0 ? (
                        <div className="divide-y divide-gray-50 bg-white border border-gray-100 rounded-3xl p-1">
                            {friends.map(f => (
                                <div
                                    key={f.id}
                                    onClick={() => setSelectedUser(f)}
                                    className="flex items-center gap-3 py-3 hover:bg-gray-50 rounded-2xl px-2 transition-colors cursor-pointer"
                                >
                                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 shrink-0">
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
                                            handleMessage(f);
                                        }}
                                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center bg-gray-50 rounded-3xl">
                            <UserPlus className="w-6 h-6 text-gray-200 mx-auto mb-2" />
                            <p className="text-gray-400 text-[11px] font-medium">Chưa có bạn bè nào</p>
                        </div>
                    )}
                </div>
            )}

            {/* Blocked List View */}
            {activeList === 'blocked' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <h4 className="text-xs font-bold text-gray-500 mb-3 px-1 uppercase tracking-wider">Người dùng đã chặn</h4>
                    <div className="py-8 text-center bg-gray-50 rounded-3xl">
                        <AlertTriangle className="w-6 h-6 text-gray-200 mx-auto mb-2" />
                        <p className="text-gray-400 text-[11px] font-medium">Chưa chặn người dùng nào</p>
                    </div>
                </div>
            )}

            {/* Invites View */}
            {activeList === 'invites' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-5">
                    {/* Sent Requests */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-500 mb-3 px-1 uppercase tracking-wider">
                            Lời mời đã gửi ({sentFriendRequests.length})
                        </h4>
                        {sentFriendRequests.length > 0 ? (
                            <div className="divide-y divide-gray-50 bg-white border border-gray-100 rounded-3xl p-1">
                                {sentFriendRequests.map((req) => (
                                    <div
                                        key={req.id}
                                        onClick={() => setSelectedUser(req)}
                                        className="flex items-center gap-3 py-3 px-2 cursor-pointer hover:bg-gray-50 rounded-2xl transition-colors active:scale-[0.99]"
                                    >
                                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                                            <img
                                                src={normalizeImageUrl(req.avatar_url || req.photoURL || req.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.username || req.displayName || req.name || 'U')}&background=amber-500&color=fff&size=100&bold=true`}
                                                className="w-full h-full object-cover"
                                                alt={req.username || req.displayName || req.name || 'User'}
                                                onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(req.username || req.displayName || req.name || 'U')}&background=amber-500&color=fff&size=100&bold=true`; }}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-gray-900 text-sm truncate">{req.displayName || req.username || req.name || req.id}</h4>
                                            <p className="text-[10px] text-amber-500 font-medium">Đang chờ phản hồi...</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-6 text-center bg-gray-50 rounded-3xl">
                                <Mail className="w-5 h-5 text-gray-200 mx-auto mb-2" />
                                <p className="text-gray-400 text-[11px] font-medium">Chưa gửi lời mời nào</p>
                            </div>
                        )}
                    </div>

                    {/* Incoming Requests */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-500 mb-3 px-1 uppercase tracking-wider">
                            Lời mời nhận được ({incomingFriendRequests.length})
                        </h4>
                        {incomingFriendRequests.length > 0 ? (
                            <div className="divide-y divide-gray-50 bg-white border border-gray-100 rounded-3xl p-1">
                                {incomingFriendRequests.map((req) => (
                                    <div
                                        key={req.id}
                                        onClick={() => setSelectedUser(req)}
                                        className="flex items-center gap-3 py-3 px-2 cursor-pointer hover:bg-gray-50 rounded-2xl transition-colors active:scale-[0.99]"
                                    >
                                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                                            <img
                                                src={normalizeImageUrl(req.photoURL || req.avatar_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.displayName || req.display_name || req.id)}&background=3b82f6&color=fff&size=100&bold=true`}
                                                className="w-full h-full object-cover"
                                                alt={req.displayName || req.display_name || req.id}
                                                onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(req.displayName || req.display_name || req.id)}&background=3b82f6&color=fff&size=100&bold=true`; }}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-gray-900 text-sm truncate">{req.displayName || req.display_name || req.id}</h4>
                                            <p className="text-[10px] text-blue-500 font-medium">Muốn kết bạn với bạn</p>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleAcceptFriendRequest(req.id); }}
                                                className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors active:scale-90"
                                                title="Chấp nhận"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleRejectFriendRequest(req.id); }}
                                                className="p-2 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-xl transition-colors active:scale-90"
                                                title="Từ chối"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-6 text-center bg-gray-50 rounded-3xl">
                                <UserPlus className="w-5 h-5 text-gray-200 mx-auto mb-2" />
                                <p className="text-gray-400 text-[11px] font-medium">Không có lời mời kết bạn nào</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* User Games Section */}
            {games && games.filter(g => g.ownerId === myUserId).length > 0 && (
                <div className="mt-2">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[13px] font-bold text-gray-900">🎮 My Games</h4>
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{games.filter(g => g.ownerId === myUserId).length}</span>
                    </div>
                    <div className="space-y-2">
                        {games.filter(g => g.ownerId === myUserId).map((g) => (
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
        </div>
    );
};

export default ProfileInfoTab;
