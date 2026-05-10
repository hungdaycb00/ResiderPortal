import React from 'react';
import { Send as SendIcon, MessageSquare, ChevronLeft, Globe, User } from 'lucide-react';
import { normalizeImageUrl } from '../../services/externalApi';

interface ChatAreaProps {
    messages: any[];
    inputText: string;
    isConnected: boolean;
    isLoading: boolean;
    activeRoomId: number | null;
    activeRoomName: string;
    activeRoomAvatar: string | null;
    mobileView: 'sidebar' | 'chat';
    authenticatedUserId: string | null;
    currentUserId?: string;
    deviceId: string;
    messagesEndRef: React.RefObject<HTMLDivElement>;
    setInputText: (v: string) => void;
    setMobileView: (v: 'sidebar' | 'chat') => void;
    handleSend: () => void;
    handleKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export default function ChatArea({
    messages,
    inputText,
    isConnected,
    isLoading,
    activeRoomId,
    activeRoomName,
    activeRoomAvatar,
    mobileView,
    authenticatedUserId,
    currentUserId,
    deviceId,
    messagesEndRef,
    setInputText,
    setMobileView,
    handleSend,
    handleKeyPress,
}: ChatAreaProps) {
    return (
        <div className={`flex-1 flex-col bg-[#1a1d24] ${mobileView === 'sidebar' ? 'hidden md:flex' : 'flex'}`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-800 bg-[#20232a] flex items-center justify-between shrink-0 h-[69px]">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setMobileView('sidebar')}
                        className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full transition-colors active:scale-95"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col">
                        <h2 className="font-bold text-white text-lg flex items-center gap-2">
                            {activeRoomName === 'World Chat' ? (
                                <Globe className="w-4 h-4 text-blue-400" />
                            ) : activeRoomAvatar ? (
                                <img src={normalizeImageUrl(activeRoomAvatar)} className="w-5 h-5 rounded-full object-cover border border-gray-700" alt="avatar" />
                            ) : (
                                <User className="w-4 h-4 text-emerald-400" />
                            )}
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
                        <SendIcon className="w-5 h-5 -ml-0.5 mt-0.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
