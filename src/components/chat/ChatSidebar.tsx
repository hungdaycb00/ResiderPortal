import React from 'react';
import { MessageCircle, Globe, Users } from 'lucide-react';
import { normalizeImageUrl } from '../../services/externalApi';

interface RoomInfo {
    room_id: number;
    last_message_at: string;
    target_user_id: string;
    target_user_name: string;
    target_user_avatar?: string;
    last_message?: string;
}

interface ChatSidebarProps {
    friends: any[];
    activeRoomName: string;
    mobileView: 'sidebar' | 'chat';
    switchRoom: (type: 'global' | 'private', roomId: number | null, roomName: string, avatarUrl: string | null) => void;
    startChatWithFriend: (friend: any) => void;
}

export default function ChatSidebar({
    friends,
    activeRoomName,
    mobileView,
    switchRoom,
    startChatWithFriend,
}: ChatSidebarProps) {
    return (
        <div className={`w-full md:w-[320px] shrink-0 border-r border-gray-800 flex-col bg-[#16181d] ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-gray-800 bg-[#1e2128] flex items-center justify-between">
                <h2 className="font-bold text-white flex items-center gap-2 text-lg">
                    <MessageCircle className="w-5 h-5 text-blue-500" />
                    Messenger
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {/* World Chat Global Option */}
                <button
                    onClick={() => switchRoom('global', null, 'World Chat', null)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors active:scale-95 ${activeRoomName === 'World Chat' ? 'bg-blue-600/20 shadow-inner' : 'hover:bg-gray-800/50'}`}
                >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg ${activeRoomName === 'World Chat' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                        <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                        <h3 className={`font-bold text-sm truncate ${activeRoomName === 'World Chat' ? 'text-blue-400' : 'text-gray-200'}`}>Kênh Tổng Thế Giới</h3>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Toàn bộ cư dân Alin</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    </div>
                </button>

                <div className="pt-4 pb-2 px-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Danh sách Bạn bè</span>
                        <span className="text-[10px] font-bold text-gray-600 bg-gray-800/50 px-1.5 py-0.5 rounded-md">{friends.length}</span>
                    </div>
                    <div className="h-px bg-gray-800/50 mt-2"></div>
                </div>

                <div className="space-y-1">
                    {friends.map(friend => {
                        const isActive = activeRoomName === (friend.displayName || friend.username || friend.id);
                        return (
                            <button
                                key={friend.id}
                                onClick={() => startChatWithFriend(friend)}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all active:scale-95 ${isActive ? 'bg-blue-600/10' : 'hover:bg-gray-800/40'}`}
                            >
                                <div className="relative w-9 h-9 rounded-full shrink-0 border border-gray-700 overflow-hidden bg-[#252830]">
                                    <img src={normalizeImageUrl(friend.photoURL || friend.avatar_url) || `https://i.pravatar.cc/150?u=${friend.id}`} className="w-full h-full object-cover" />
                                    <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#16181d] ${friend.is_online ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-gray-600'}`}></div>
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <h3 className={`font-bold text-xs truncate ${isActive ? 'text-blue-400' : 'text-gray-300'}`}>{friend.display_name || friend.displayName || friend.username || friend.id}</h3>
                                    <p className="text-[9px] text-gray-500 uppercase font-medium">{friend.is_online ? 'Đang hoạt động' : 'Ngoại tuyến'}</p>
                                </div>
                            </button>
                        );
                    })}
                    {friends.length === 0 && (
                        <div className="text-center py-8 opacity-40 space-y-2">
                            <Users className="w-8 h-8 mx-auto text-gray-600" />
                            <p className="text-[10px] uppercase font-bold tracking-widest">Chưa có bạn bè</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
