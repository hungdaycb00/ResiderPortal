import { useState } from 'react';
import { Users, UserPlus, UserMinus, Check, X, Mail, RefreshCw, Layout, Copy, CheckCircle2, AlertCircle, Send as SendIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { externalApi, normalizeImageUrl } from '../services/externalApi';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  friends: any[];
  requests: any[];
  onAddFriend: (targetId: string) => Promise<{ success: boolean; message: string }>;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onRemove: (id: string) => void;
  onRefresh?: () => void;
}

export default function FriendsModal({
  isOpen,
  onClose,
  friends,
  requests,
  onAddFriend,
  onAccept,
  onReject,
  onRemove,
  onRefresh
}: FriendsModalProps) {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const [friendInput, setFriendInput] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(externalApi.getDeviceId());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendRequest = async () => {
    if (!friendInput.trim()) return;
    setIsSubmitting(true);
    setStatusMsg(null);
    try {
      const result = await onAddFriend(friendInput.trim());
      setStatusMsg({ text: result.message || 'Friend request sent!', type: 'success' });
      setFriendInput('');
    } catch (err: any) {
      if (err.message.includes('409') || err.message.toLowerCase().includes('already')) {
        setStatusMsg({ text: 'Bạn đã là bạn bè hoặc đã gửi yêu cầu rồi!', type: 'error' });
      } else {
        setStatusMsg({ text: err.message || 'Lỗi khi gửi yêu cầu kết bạn', type: 'error' });
      }
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-lg bg-[#1a1d24] border border-gray-800 rounded-[2.5rem] flex flex-col max-h-[85vh] overflow-hidden shadow-2xl"
        >
          {/* Header & Tabs */}
          <div className="p-6 pb-4 border-b border-gray-800 bg-[#1a1d24] sticky top-0 z-20">
            <div className="flex items-center justify-center mb-6 relative">
              <h2 className="text-lg font-medium text-white uppercase tracking-widest">
                Community
              </h2>
              <button 
                onClick={onClose}
                className="absolute right-0 p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex bg-[#252830] p-1.5 rounded-2xl w-full">
              <button
                onClick={() => setActiveTab('friends')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'friends' ? 'bg-[#4382ec] text-white shadow-lg' : 'text-gray-400 hover:text-gray-300'}`}
              >
                Friends
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'requests' ? 'bg-[#4382ec] text-white shadow-lg' : 'text-gray-400 hover:text-gray-300'}`}
              >
                Requests
                {requests.length > 0 && (
                  <div className="absolute top-2 right-4 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 pt-6 space-y-6 min-h-[350px]">
            {activeTab === 'friends' ? (
              <>
                <div className="bg-[#24252a] rounded-[20px] p-5 shadow-sm">
                  {/* Section 1: Your ID */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">User ID:</label>
                    <div className="flex items-center justify-between group pt-1 pb-2">
                      <span className="text-lg text-gray-200 font-normal break-all mr-2">{externalApi.getDeviceId()}</span>
                      <button 
                        onClick={handleCopyId}
                        className="shrink-0 text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        {copied ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="my-4 border-t border-gray-700/60" />

                  {/* Section 2 & 3: Input & Button & Status */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Add Friend</label>
                    <div className="relative flex items-center">
                      <input 
                        type="text" 
                        value={friendInput}
                        onChange={(e) => setFriendInput(e.target.value)}
                        placeholder="Friend ID" 
                        className="w-full bg-transparent border border-gray-700/80 focus:border-gray-500 rounded-xl pl-4 pr-24 py-3.5 text-base focus:outline-none transition-all placeholder:text-gray-600 text-white shadow-sm"
                      />
                      <button 
                        onClick={handleSendRequest}
                        disabled={isSubmitting || !friendInput.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 disabled:text-gray-600 text-gray-400 hover:text-gray-200 font-medium rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 text-sm tracking-widest uppercase"
                      >
                        <SendIcon className="w-4 h-4 -rotate-45 mb-1" />
                        SEND
                      </button>
                    </div>
                    {/* Section 3: Status Message */}
                    <AnimatePresence>
                      {statusMsg && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={`flex items-center gap-2 px-2 pt-1 text-[11px] font-medium ${statusMsg.type === 'success' ? 'text-green-500' : 'text-red-400'}`}
                        >
                          {statusMsg.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                          {statusMsg.text}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Section 4: Friends List */}
                <div className="space-y-4">
                  <label className="text-[12px] font-bold text-gray-500 uppercase tracking-widest block px-1">Social ({friends.length})</label>
                  {friends.length > 0 ? (
                    <div className="space-y-2">
                      {friends.map((friend) => (
                        <div key={friend.id} className="flex items-center justify-between px-1 py-2 group">
                          <div className="flex items-center gap-4">
                            <img src={normalizeImageUrl(friend.photoURL || friend.avatar_url) || `https://i.pravatar.cc/150?u=${friend.id}`} className="w-10 h-10 rounded-full bg-[#24252a] object-cover" alt="" />
                            <p className="font-normal text-gray-100 text-[17px]">{friend.displayName || friend.id}</p>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => onRemove(friend.id)}
                              className="p-1 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                              title="Xóa bạn"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                            <div className={`w-2 h-2 rounded-full ${friend.is_online ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-[#404040]'}`}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 rounded-3xl border-2 border-dashed border-gray-800 opacity-50 mx-1">
                      <Users className="w-10 h-10 mx-auto mb-3 text-gray-700" />
                      <p className="text-sm font-medium text-gray-600">No friends found</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Tab Requests */
              <div className="space-y-4">
                <label className="text-[12px] font-bold text-gray-500 uppercase tracking-widest block px-1">Received Wishes ({requests.length})</label>
                {requests.length > 0 ? (
                  <div className="space-y-3">
                    {requests.map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-4 bg-[#24252a] rounded-2xl">
                        <div className="flex items-center gap-4">
                          <img src={normalizeImageUrl(req.photoURL || req.avatar_url) || `https://i.pravatar.cc/150?u=${req.id}`} className="w-12 h-12 rounded-full object-cover" alt="" />
                          <div>
                            <p className="font-medium text-white text-base">{req.displayName || req.id}</p>
                            <p className="text-[11px] text-gray-500 uppercase font-medium mt-0.5">Incoming Request</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => onAccept(req.id)}
                            className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg active:scale-90 transition-all"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => onReject(req.id)}
                            className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-full active:scale-90 transition-all"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 rounded-3xl border-2 border-dashed border-gray-800 opacity-50">
                    <Mail className="w-12 h-12 mx-auto mb-4 text-gray-700" />
                    <p className="text-sm font-bold text-gray-600 uppercase tracking-widest">Inbox is empty</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pb-8 pt-2 bg-[#1a1d24] flex justify-center mt-auto">
             {onRefresh && (
               <button 
                 onClick={onRefresh}
                 className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800/50 rounded-full transition-colors text-[#4382ec] text-[13px] font-normal"
               >
                 <RefreshCw className="w-4 h-4" />
                 Synchronize Data
               </button>
             )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
