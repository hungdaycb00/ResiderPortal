import { useState } from 'react';
import { Users, UserPlus, UserMinus, Check, X, Mail, RefreshCw, Layout, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { externalApi } from '../services/externalApi';

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
      setStatusMsg({ text: err.message || 'Error sending request', type: 'error' });
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
          <div className="p-6 pb-2 border-b border-gray-800 bg-[#1a1d24] sticky top-0 z-20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-tighter italic">
                <Users className="w-6 h-6 text-blue-400" />
                Community
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex bg-[#252830] p-1 rounded-2xl w-full">
              <button
                onClick={() => setActiveTab('friends')}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'friends' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Friends
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'requests' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Requests
                {requests.length > 0 && (
                  <div className="absolute top-2 right-4 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-4 min-h-[350px]">
            {activeTab === 'friends' ? (
              <>
                {/* Section 1: Your ID */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">User ID:</label>
                  <div className="flex items-center justify-between bg-[#252830] p-3 rounded-2xl border border-gray-800 shadow-inner group">
                    <code className="text-sm text-blue-400 font-mono tracking-wider break-all mr-2">{externalApi.getDeviceId()}</code>
                    <button 
                      onClick={handleCopyId}
                      className="shrink-0 p-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition-all active:scale-90"
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>

                {/* Section 2 & 3: Input & Button & Status */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Add Friend</label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={friendInput}
                        onChange={(e) => setFriendInput(e.target.value)}
                        placeholder="Friend ID" 
                        className="flex-1 bg-[#252830] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all shadow-inner"
                      />
                      <button 
                        onClick={handleSendRequest}
                        disabled={isSubmitting || !friendInput.trim()}
                        className="px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-600 text-white font-black rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 text-xs"
                      >
                        <UserPlus className="w-4 h-4" />
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
                          className={`flex items-center gap-2 px-2 text-[10px] font-bold ${statusMsg.type === 'success' ? 'text-green-500' : 'text-red-400'}`}
                        >
                          {statusMsg.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {statusMsg.text}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Section 4: Friends List */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Social ({friends.length})</label>
                  {friends.length > 0 ? (
                    <div className="space-y-2">
                      {friends.map((friend) => (
                        <div key={friend.id} className="flex items-center justify-between p-3 bg-[#252830]/30 border border-gray-800/50 rounded-2xl hover:bg-[#252830]/50 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <img src={friend.photoURL || `https://i.pravatar.cc/150?u=${friend.id}`} className="w-12 h-12 rounded-2xl border border-gray-700 object-cover" alt="" />
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-[#1a1d24] rounded-full ${friend.is_online ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm">{friend.displayName || friend.id}</p>
                              <p className="text-[10px] text-gray-500 uppercase font-black">{friend.is_online ? 'Active' : 'Offline'}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => onRemove(friend.id)}
                            className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                          >
                            <UserMinus className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 rounded-3xl border-2 border-dashed border-gray-800 opacity-50">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                      <p className="text-sm font-bold text-gray-600">No friends found</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Tab Requests */
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Received Wishes ({requests.length})</label>
                {requests.length > 0 ? (
                  <div className="space-y-3">
                    {requests.map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-4 bg-[#252830]/50 border border-gray-800 rounded-3xl">
                        <div className="flex items-center gap-4">
                          <img src={req.photoURL || `https://i.pravatar.cc/150?u=${req.id}`} className="w-12 h-12 rounded-2xl border border-gray-700 object-cover" alt="" />
                          <div>
                            <p className="font-bold text-white text-sm">{req.displayName || req.id}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-black">Incoming Request</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => onAccept(req.id)}
                            className="w-12 h-12 flex items-center justify-center bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 active:scale-90 transition-all"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => onReject(req.id)}
                            className="w-12 h-12 flex items-center justify-center bg-gray-800 text-gray-400 rounded-2xl active:scale-90 transition-all"
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

          <div className="p-6 pt-2 bg-[#1a1d24] border-t border-gray-800 flex justify-center">
             {onRefresh && (
               <button 
                 onClick={onRefresh}
                 className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 rounded-full transition-colors text-gray-500 text-[10px] font-black uppercase tracking-widest"
               >
                 <RefreshCw className="w-3.5 h-3.5" />
                 Synchronize Data
               </button>
             )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
