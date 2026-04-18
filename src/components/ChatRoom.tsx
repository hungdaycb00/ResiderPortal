import React, { useState, useEffect, useRef } from 'react';
import { initSocket, getSocket } from '../utils/socket';
import { authenticateChat, joinRoom, sendMessage } from '../utils/chatService';
import { useChat } from '../hooks/useChat';
import { MessageCircle, Send, MessageSquare, RefreshCw } from 'lucide-react';

interface ChatRoomProps {
    deviceId: string;
    currentUserId?: string;
    userName?: string;
    userAvatar?: string;
}

export default function ChatRoom({ deviceId, currentUserId, userName, userAvatar }: ChatRoomProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        console.log('🔌 Initializing WebSocket...');
        initSocket();
        
        const socket = getSocket();
        if (!socket) return;
        
        const handleConnect = () => {
            setIsConnected(true);
            console.log('✅ WebSocket connected');
        };
        
        const handleDisconnect = () => {
            setIsConnected(false);
            console.log('❌ WebSocket disconnected');
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);

        if (socket.connected) {
            handleConnect();
        }

        authenticateChat(deviceId)
            .then((user) => {
                console.log('✅ Authenticated:', user);
                if (user && user.id) {
                    setAuthenticatedUserId(String(user.id));
                }
                return joinRoom('global');
            })
            .then(() => {
                setIsLoading(false);
                console.log('✅ Joined global room');
            })
            .catch((error) => {
                console.error('❌ Error:', error);
                setIsLoading(false);
            });

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
        };
    }, [deviceId]);

    useChat(
        (newMessage) => {
            setMessages(prev => [...prev, newMessage]);
            scrollToBottom();
        },
        (history) => {
            setMessages(history);
            scrollToBottom();
        }
    );

    useEffect(() => {
        console.log('ChatRoom Debug:', { currentUserId, deviceId, userName, authenticatedUserId, messages });
    }, [messages, currentUserId, deviceId, userName, authenticatedUserId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = () => {
        if (inputText.trim()) {
            try {
                sendMessage(inputText.trim(), 'text');
                setInputText('');
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

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[600px] bg-[#1a1d24] border border-gray-800 rounded-2xl shadow-2xl">
                <div className="w-10 h-10 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400">Connecting to chat...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[600px] bg-[#1a1d24] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 border-b border-gray-800 bg-[#252830]/50 flex items-center justify-between">
                <h2 className="font-bold flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-blue-400" />
                    World Chat
                </h2>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                        {isConnected ? 'Online' : 'Offline'}
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {messages.length > 0 ? messages.map((msg, idx) => {
                    const msgSenderId = msg.sender_id || msg.senderId || msg.uid || (msg.sender && msg.sender.id);
                    const msgUserId = msg.user_id || msg.userId;
                    
                    // Check if this message is from current user
                    const isOwn = (
                        (authenticatedUserId && String(msgSenderId) === String(authenticatedUserId)) ||
                        (currentUserId && String(msgSenderId) === String(currentUserId)) ||
                        (deviceId && String(msgSenderId) === String(deviceId)) ||
                        (userName && msg.display_name === userName) ||
                        (userName && msg.senderName === userName) ||
                        (authenticatedUserId && msgUserId && String(msgUserId) === String(authenticatedUserId))
                    );

                    if (idx === messages.length - 1) {
                        console.log('Last Message Debug:', {
                            msgSenderId,
                            msgUserId,
                            authenticatedUserId,
                            currentUserId,
                            deviceId,
                            userName,
                            isOwn,
                            message: msg
                        });
                    }

                    return (
                        <div 
                            key={msg.id || idx} 
                            className={`flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300 ${isOwn ? 'items-end' : 'items-start'}`}
                        >
                            <div className={`flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                                <span className={`text-xs font-bold whitespace-nowrap ${isOwn ? 'text-blue-300' : 'text-blue-400'}`}>
                                    {msg.display_name || msg.senderName || msg.sender_name || 'User'}
                                </span>
                                <span className="text-[10px] text-gray-500 whitespace-nowrap">
                                    {new Date(msg.createdAt || msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div 
                                className={`p-3 rounded-2xl text-sm max-w-[80%] break-words ${
                                    isOwn 
                                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 border border-blue-500 rounded-tr-none text-white shadow-lg shadow-blue-600/20' 
                                        : 'bg-[#252830] border border-gray-700/50 rounded-tl-none text-gray-200'
                                }`}
                            >
                                {msg.content || msg.message}
                            </div>
                        </div>
                    );
                }) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                        <MessageSquare className="w-12 h-12 mb-2" />
                        <p>No messages yet. Start chatting!</p>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-800 bg-[#252830]/30">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyPress}
                        disabled={!isConnected}
                        placeholder={isConnected ? "Type a message..." : "Disconnected..."}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputText.trim() || !isConnected}
                        className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl transition-all active:scale-95"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
