import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initSocket, getSocket } from '../utils/socket';
import { authenticateChat, joinRoom, sendMessage, getMyPrivateRooms, createOrGetPrivateRoom } from '../utils/chatService';
import { notify } from '../utils/notify';
import { useChat } from '../hooks/useChat';
import ChatSidebar from './chat/ChatSidebar';
import ChatArea from './chat/ChatArea';

interface ChatRoomProps {
    deviceId: string;
    currentUserId?: string;
    userName?: string;
    userAvatar?: string;
    targetUser?: { id: string, name: string, avatarUrl?: string } | null;
    friends?: any[];
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

export default function ChatRoom({ deviceId, currentUserId, userName, userAvatar, targetUser, onClose, friends = [] }: ChatRoomProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [privateRooms, setPrivateRooms] = useState<RoomInfo[]>([]);
    const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
    const [activeRoomName, setActiveRoomName] = useState('World Chat');
    const [activeRoomAvatar, setActiveRoomAvatar] = useState<string | null>(null);
    const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');
    const [initError, setInitError] = useState<string | null>(null);

    const isDirectChat = !!targetUser;

    const activeRoomIdRef = useRef<number | null>(null);

    const setActiveRoom = (id: number, name: string, avatar: string | null = null) => {
        setActiveRoomId(id);
        setActiveRoomName(name);
        setActiveRoomAvatar(avatar);
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
                        const roomId = res.roomId ?? res.room_id;
                        return joinRoom('private', roomId);
                    });
                } else {
                    return joinRoom('global');
                }
            })
            .then((data) => {
                if (!mounted) return;
                if (data && (data.roomId || data.room_id)) {
                    const roomId = data.roomId ?? data.room_id;
                    setActiveRoom(roomId, targetUser ? targetUser.name : 'World Chat', targetUser?.avatarUrl || null);
                }
                setIsLoading(false);
            })
            .catch((error) => {
                console.error('❌ Chat Error:', error);
                if (mounted) {
                    setInitError(error.message || 'Không thể kết nối chat');
                    setIsLoading(false);
                }
            });

        return () => {
            mounted = false;
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
        };
    }, [deviceId, targetUser?.id]);

    useChat(
        useCallback((newMessage) => {
            if (activeRoomIdRef.current === null || String(newMessage.roomId) === String(activeRoomIdRef.current)) {
                setMessages(prev => [...prev, newMessage]);
            }
        }, []),
        useCallback((history) => {
            setMessages(history);
        }, [])
    );

    // Auto-scroll after messages have rendered
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (inputText.trim() && activeRoomId) {
            try {
                sendMessage(inputText.trim(), 'text', activeRoomId);
                setInputText('');
                getMyPrivateRooms().then(rooms => setPrivateRooms(rooms || []));
            } catch (error: any) {
                notify('Error: ' + error.message, 'error');
            }
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const switchRoom = (type: 'global' | 'private', roomId: number | null, roomName: string, avatarUrl: string | null = null) => {
        setIsLoading(true);
        setActiveRoomName(roomName);
        setActiveRoomAvatar(avatarUrl);
        setMobileView('chat');
        setMessages([]);

        joinRoom(type, roomId)
            .then((data) => {
                setActiveRoom(data.roomId, roomName, avatarUrl);
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    };

    const startChatWithFriend = (friend: any) => {
        setIsLoading(true);
        createOrGetPrivateRoom(friend.id)
            .then((data) => {
                switchRoom('private', data.room_id, friend.displayName || friend.username || friend.id, friend.photoURL || friend.avatar_url || null);
            })
            .catch((err) => {
                notify('Không thể bắt đầu chat: ' + err.message, 'error');
                setIsLoading(false);
            });
    };

    if (isLoading && !activeRoomId) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px] bg-[#1a1d24] border border-gray-800 rounded-2xl shadow-2xl">
                <div className="w-10 h-10 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400 font-medium">Đang kết nối chat...</p>
            </div>
        );
    }

    if (initError && !activeRoomId) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px] bg-[#1a1d24] border border-gray-800 rounded-2xl shadow-2xl px-6">
                <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">⚠️</span>
                </div>
                <p className="text-gray-300 font-bold text-lg mb-2">Không thể kết nối</p>
                <p className="text-gray-500 text-sm text-center mb-6">{initError}</p>
                <button
                    onClick={() => {
                        setInitError(null);
                        setIsLoading(true);
                        window.location.reload();
                    }}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors active:scale-95"
                >
                    Thử lại
                </button>
            </div>
        );
    }

    return (
        <div className="flex w-full h-[80vh] min-h-[500px] bg-[#1a1d24] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            {!isDirectChat && (
                <ChatSidebar
                    friends={friends}
                    activeRoomName={activeRoomName}
                    mobileView={mobileView}
                    switchRoom={switchRoom}
                    startChatWithFriend={startChatWithFriend}
                />
            )}
            <ChatArea
                messages={messages}
                inputText={inputText}
                isConnected={isConnected}
                isLoading={isLoading}
                activeRoomId={activeRoomId}
                activeRoomName={activeRoomName}
                activeRoomAvatar={activeRoomAvatar}
                mobileView={isDirectChat ? 'chat' : mobileView}
                authenticatedUserId={authenticatedUserId}
                currentUserId={currentUserId}
                deviceId={deviceId}
                messagesEndRef={messagesEndRef}
                setInputText={setInputText}
                setMobileView={setMobileView}
                handleSend={handleSend}
                handleKeyPress={handleKeyPress}
            />
        </div>
    );
}
