import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initSocket, getSocket } from '../utils/socket';
import { authenticateChat, joinRoom, sendMessage, getMyPrivateRooms, createOrGetPrivateRoom } from '../utils/chatService';
import { useChat } from '../hooks/useChat';
import { MessageCircle, Send, MessageSquare, ChevronLeft, Globe, User } from 'lucide-react';
import { normalizeImageUrl } from '../services/externalApi';

interface ChatRoomProps {
    deviceId: string;
    currentUserId?: string;
    userName?: string;
    userAvatar?: string;
    targetUser?: { id: string, name: string } | null;
    onClose?: () => void;
}

interface RoomInfo {
    room_id: number;
    last_message_at: string;
    target_user_id: string;
    target_user_name: string;
    target_user_avatar?: string;
    last_message?: string;
}

export default function ChatRoom({ deviceId, currentUserId, userName, userAvatar, targetUser, onClose }: ChatRoomProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [privateRooms, setPrivateRooms] = useState<RoomInfo[]>([]);
    const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
    const [activeRoomName, setActiveRoomName] = useState('World Chat');
    const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
    
    const activeRoomIdRef = useRef<number | null>(null);

    const setActiveRoom = (id: number, name: string) => {
        setActiveRoomId(id);
        setActiveRoomName(name);
        activeRoomIdRef.current = id;
    };

    useEffect(() => {
        console.log('🔌 Initializing WebSocket...');
        initSocket();
        const socket = getSocket();
        if (!socket) return;
        
        const handleConnect = () => setIsConnected(true);
        const handleDisconnect = () => setIsConnected(false);

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        if (socket.connected) handleConnect();

        let mounted = true;

        authenticateChat(deviceId)
            .then((user) => {
                if (user && user.id) setAuthenticatedUserId(String(user.id));
                return getMyPrivateRooms();
            })
            .then((rooms) => {
                if (!mounted) return;
                if (rooms) setPrivateRooms(rooms);
                
                if (targetUser) {
                    setMobileView('chat');
                    return createOrGetPrivateRoom(targetUser.id).then(res => {
                        return joinRoom('private', res.roomId);
                    });
                } else {
                    return joinRoom('global');
                }
            })
            .then((data) => {
                if (!mounted) return;
                if (data && data.roomId) {
                    setActiveRoom(data.roomId, targetUser ? targetUser.name : 'World Chat');
                }
                setIsLoading(false);
            })
            .catch((error) => {
                console.error('❌ Chat Error:', error);
                if (mounted) setIsLoading(false);
            });

        return () => {
            mounted = false;
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
        };
    }, [deviceId, targetUser]);

    useChat(
        useCallback((newMessage) => {
            if (activeRoomIdRef.current === null || String(newMessage.roomId) === String(activeRoomIdRef.current)) {
                setMessages(prev => [...prev, newMessage]);
                scrollToBottom();
            }
        }, []),
        useCallback((history) => {
            setMessages(history);
            scrollToBottom();
        }, [])
    );

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = () => {
        if (inputText.trim() && activeRoomId) {
            try {
                // If it's World Chat, contentType is text, roomId passed as number
                sendMessage(inputText.trim(), 'text', activeRoomId);
                setInputText('');
                
                // Fetch rooms again to update latest message in sidebar
                getMyPrivateRooms().then(rooms => setPrivateRooms(rooms || []));
            } catch (error: any) {
                alert('Error: ' + error.message);
            }
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const switchRoom = (type: 'global' | 'private', roomId: number | null, roomName: string) => {
        setIsLoading(true);
        setActiveRoomName(roomName);
        setMobileView('chat');
        setMessages([]);
        
        joinRoom(type, roomId)
            .then((data) => {
                setActiveRoom(data.roomId, roomName);
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    };

    if (isLoading && !activeRoomId) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px] bg-[#1a1d24] border border-gray-800 rounded-2xl shadow-2xl">
                <div className="w-10 h-10 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400 font-medium">Connecting to chat...</p>
            </div>
        );
    }

    return (
        <div className="flex w-full h-[80vh] min-h-[500px] bg-[#1a1d24] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            
            {/* LEFT SIDEBAR (Room List) */}
            <div className={`w-full md:w-[320px] shrink-0 border-r border-gray-800 flex-col bg-[#16181d] ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-gray-800 bg-[#1e2128]">
                    <h2 className="font-bold text-white flex items-center gap-2 text-lg">
                        <MessageCircle className="w-5 h-5 text-blue-500" />
                        Messenger
                    </h2>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {/* World Chat Global Option */}
                    <button 
                        onClick={() => switchRoom('global', null, 'World Chat')}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors active:scale-95 ${activeRoomName === 'World Chat' ? 'bg-blue-600/20 shadow-inner' : 'hover:bg-gray-800/50'}`}
                    >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-lg ${activeRoomName === 'World Chat' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                            <Globe className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                            <h3 className={`font-bold truncate ${activeRoomName === 'World Chat' ? 'text-blue-400' : 'text-gray-200'}`}>World Chat</h3>
                            <p className="text-xs text-gray-500 truncate">Kênh thế giới chung</p>
                        </div>
                    </button>

                    <div className="my-2 border-t border-gray-800" />
                    
                    {/* Private Rooms */}
                    <h4 className="text-[10px] uppercase font-bold text-gray-500 px-3 pt-2 mb-1">Tin nhắn cá nhân</h4>
                    {privateRooms.length > 0 ? privateRooms.map(room => (
                        <button 
                            key={room.room_id}
                            onClick={() => switchRoom('private', room.room_id, room.target_user_name)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all active:scale-95 ${activeRoomId === room.room_id ? 'bg-emerald-600/20 shadow-inner' : 'hover:bg-gray-800/50'}`}
                        >
                            <div className="relative w-12 h-12 rounded-full shrink-0 border-2 border-gray-700 overflow-hidden shadow-lg bg-[#252830]">
                                {room.target_user_avatar ? (
                                    <img src={normalizeImageUrl(room.target_user_avatar)} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-full h-full p-2 text-gray-400" />
                                )}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <h3 className={`font-bold truncate ${activeRoomId === room.room_id ? 'text-emerald-400' : 'text-gray-200'}`}>{room.target_user_name}</h3>
                                <p className="text-xs text-gray-400 truncate">{room.last_message || 'Bắt đầu trò chuyện'}</p>
                            </div>
                        </button>
                    )) : (
                        <div className="px-3 py-6 text-center text-gray-500 text-xs">
                            <p>Không có tin nhắn nào.</p>
                            <p className="mt-1 opacity-70">Tìm kiếm bạn bè trên AlinMap để bắt đầu!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT MAIN (Chat Area) */}
            <div className={`flex-1 flex-col bg-[#1a1d24] ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
                {/* Header */}
                <div className="p-4 border-b border-gray-800 bg-[#20232a] flex items-center justify-between shrink-0 h-[69px]">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setMobileView('list')}
                            className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full transition-colors active:scale-95"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        
                        <div className="flex flex-col">
                            <h2 className="font-bold text-white text-lg flex items-center gap-2">
                                {activeRoomName === 'World Chat' ? <Globe className="w-4 h-4 text-blue-400" /> : <User className="w-4 h-4 text-emerald-400" />}
                                {activeRoomName}
                            </h2>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-red-500 shadow-[0_0_5px_#ef4444]'}`}></div>
                                <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                                    {isConnected ? 'Connected' : 'Offline'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#16181d] relative">
                    {messages.length > 0 ? messages.map((msg, idx) => {
                        const msgSenderId = msg.sender_id || msg.senderId || msg.uid || (msg.sender && msg.sender.id);
                        
                        // Checking if this message was sent by the currently logged in user
                        const isOwn = (
                            (authenticatedUserId && String(msgSenderId) === String(authenticatedUserId)) ||
                            (currentUserId && String(msgSenderId) === String(currentUserId)) ||
                            (deviceId && String(msgSenderId) === String(deviceId))
                        );

                        return (
                            <div 
                                key={msg.id || idx} 
                                className={`flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300 ${isOwn ? 'items-end' : 'items-start'}`}
                            >
                                <div className={`flex items-center gap-2 mb-0.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <span className={`text-[11px] font-bold ${isOwn ? 'text-gray-400' : (activeRoomName === 'World Chat' ? 'text-blue-400' : 'text-emerald-400')}`}>
                                        {isOwn ? 'Bạn' : (msg.display_name || msg.senderName || msg.sender_name || 'User')}
                                    </span>
                                    <span className="text-[9px] font-medium text-gray-500/80">
                                        {new Date(msg.createdAt || msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div 
                                    className={`px-4 py-2.5 rounded-2xl text-[14px] max-w-[80%] break-words leading-relaxed shadow-sm ${
                                        isOwn 
                                            ? 'bg-blue-600 border border-blue-500 rounded-tr-sm text-white shadow-blue-900/20' 
                                            : 'bg-[#252830] border border-gray-700/80 rounded-tl-sm text-gray-200'
                                    }`}
                                >
                                    {msg.content || msg.message}
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500/70 p-4 text-center pointer-events-none">
                            <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
                            <p className="font-medium text-sm">Chưa có tin nhắn nào.</p>
                            <p className="text-xs mt-1">Gửi lời chào để bắt đầu!</p>
                        </div>
                    )}
                    {isLoading && activeRoomId && (
                        <div className="flex justify-center p-2">
                             <div className="w-4 h-4 border-2 border-gray-700 border-t-white rounded-full animate-spin"></div>
                        </div>
                    )}
                    <div ref={messagesEndRef} className="h-2" />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-800 bg-[#20232a] shrink-0">
                    <div className="flex gap-2 p-1 bg-[#16181d] border border-gray-700/50 rounded-2xl focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-inner">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyPress}
                            disabled={!isConnected || isLoading}
                            placeholder={isConnected ? "Nhập tin nhắn..." : "Đang kết nối..."}
                            className="flex-1 bg-transparent px-4 py-2 text-[14px] text-white focus:outline-none disabled:opacity-50 min-w-0"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!inputText.trim() || !isConnected || isLoading}
                            className="p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:hover:bg-gray-800 text-white rounded-xl transition-all active:scale-95 flex items-center justify-center"
                        >
                            <Send className="w-5 h-5 -ml-0.5 mt-0.5" />
                        </button>
                    </div>
                </div>
            </div>
            
        </div>
    );
}
