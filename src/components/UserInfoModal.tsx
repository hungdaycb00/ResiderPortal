import React, { useState, useRef } from 'react';
import { X, LogIn, LogOut, Trophy, Wallet, User as UserIcon, Settings, Camera, Gamepad2, Edit2, Check, Upload, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../App';
import { externalApi } from '../services/externalApi';

interface UserInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onManageGames: () => void;
  userStats: {
    gold: number;
    level: number;
    xp: number;
    rankScore: number;
  } | null;
  onUpdateAvatar: (url: string) => void;
}

const DEFAULT_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jace',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Midnight',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
];

export default function UserInfoModal({ 
  isOpen, 
  onClose, 
  user, 
  onLogin, 
  onLogout, 
  onManageGames,
  userStats,
  onUpdateAvatar
}: UserInfoModalProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatars, setShowAvatars] = useState(false);
  const [showMyGames, setShowMyGames] = useState(false);
  const [myGames, setMyGames] = useState<any[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(false);

  // Sync newName when user data changes (e.g. after login or external sync)
  React.useEffect(() => {
    if (user?.displayName) {
      setNewName(user.displayName);
    }
  }, [user?.displayName]);

  if (!isOpen) return null;

  const handleSaveName = async () => {
    if (!user || !newName.trim() || newName === user.displayName) {
      setIsEditingName(false);
      return;
    }
    setIsSaving(true);
    try {
      await externalApi.syncUser({
        uid: user.uid,
        displayName: newName.trim(),
        photoURL: user.photoURL,
        email: user.email
      });
      setIsEditingName(false);
      // Trigger a refresh or local update if needed
      window.location.reload(); 
    } catch (err) {
      console.error("Failed to update name:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFetchMyGames = async () => {
    if (!user) return;
    // Toggle MyGames
    if (showMyGames) {
      setShowMyGames(false);
      return;
    }
    
    setIsLoadingGames(true);
    setShowMyGames(true);
    try {
      const identifier = user.email || user.uid;
      const res = await externalApi.getUserGames(identifier);
      if (res.success) {
        setMyGames(res.games || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingGames(false);
    }
  };

  return (
    <>
      {/* Invisible backdrop to close on outside click */}
      <div className="fixed inset-0 z-[390]" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-full mt-4 right-0 w-[320px] bg-[#1a1d24] border border-gray-800 rounded-[2rem] overflow-hidden shadow-2xl z-[400] overflow-y-auto max-h-[80vh] scrollbar-none"
      >
        <div className="p-5">
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-5 pt-2">
            <div className="relative group cursor-pointer" onClick={() => setShowAvatars(!showAvatars)}>
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-gray-800 bg-[#252830] shadow-xl relative transition-transform active:scale-95 group-hover:border-purple-500/50">
                <img 
                  src={user?.photoURL || `https://i.pravatar.cc/150?u=${user?.uid || 'guest'}`} 
                  className="w-full h-full object-cover"
                  alt="Profile"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col items-center w-full">
              {isEditingName ? (
                <div className="flex flex-col items-center gap-1 w-full px-2">
                  <div className="flex items-center gap-2 w-full">
                    <input 
                      autoFocus
                      maxLength={15}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="flex-1 bg-gray-800 border border-blue-500 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                    />
                    <button 
                      onClick={handleSaveName} 
                      disabled={isSaving}
                      className={`p-1.5 rounded-lg ${isSaving ? 'bg-gray-700' : 'bg-blue-600'}`}
                    >
                      {isSaving ? (
                         <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>
                  <span className="text-[10px] text-gray-500">{newName.length}/15 ký tự</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/name">
                  <h2 className="text-lg font-black text-white tracking-tight">
                    {user?.displayName || 'Guest Player'}
                  </h2>
                  {user && (
                    <button 
                      onClick={() => setIsEditingName(true)}
                      className="opacity-0 group-hover/name:opacity-100 transition-opacity p-1 hover:bg-gray-800 rounded-md"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {user ? (
            <div className="space-y-4">
              {/* Stats & Avatars */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#252830] p-3 rounded-2xl border border-gray-800/50 flex items-center gap-3">
                  <Wallet className="w-4 h-4 text-yellow-500" />
                  <div>
                    <p className="text-[8px] text-gray-500 font-bold uppercase">Gold</p>
                    <p className="text-sm font-black text-white">{userStats?.gold || 0}</p>
                  </div>
                </div>
                <div className="bg-[#252830] p-3 rounded-2xl border border-gray-800/50 flex items-center gap-3">
                  <Trophy className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-[8px] text-gray-500 font-bold uppercase">Level</p>
                    <p className="text-sm font-black text-white">{userStats?.level || 1}</p>
                  </div>
                </div>
              </div>

              {/* Avatar Pick */}
              {showAvatars && (
                <AnimatePresence>
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-2 mt-2">
                      <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Select System Avatar</label>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {DEFAULT_AVATARS.map((url, i) => (
                        <button 
                          key={i}
                          onClick={() => {
                            onUpdateAvatar(url);
                            setShowAvatars(false);
                          }}
                          className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${user?.photoURL === url ? 'border-purple-500 scale-105 shadow-lg shadow-purple-500/30' : 'border-transparent hover:border-gray-700'}`}
                        >
                          <img src={url} className="w-full h-full object-cover bg-gray-800" alt="" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}

              {/* Account Actions */}
              <div className="space-y-2 pt-2 border-t border-gray-800/50">
                <button 
                  onClick={onManageGames}
                  className="w-full flex items-center justify-between p-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 rounded-xl transition-all group shadow-sm active:scale-95"
                >
                  <div className="flex items-center gap-3">
                    <Gamepad2 className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-blue-100">My Games Management</span>
                  </div>
                  <Plus className="w-3 h-3 text-blue-400 opacity-50 group-hover:rotate-90 transition-transform" />
                </button>

                {showMyGames && (
                  <AnimatePresence>
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mb-2"
                    >
                      <div className="bg-[#111318] rounded-xl p-2 border border-gray-800/80 max-h-[150px] overflow-y-auto scrollbar-none">
                        {isLoadingGames ? (
                          <div className="p-3 text-center text-[10px] text-gray-500 font-bold">Loading...</div>
                        ) : myGames.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            {myGames.map(game => (
                              <div key={game.id} className="flex items-center gap-2 bg-[#252830] p-1.5 rounded-lg border border-gray-800/50">
                                <img 
                                  src={game.thumbnail_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${game.id}`} 
                                  className="w-6 h-6 rounded bg-gray-800 object-cover"
                                />
                                <div className="flex flex-col overflow-hidden">
                                  <span className="text-[10px] font-bold text-white truncate">{game.name || game.title || 'Untitled'}</span>
                                  <span className="text-[8px] text-gray-500 font-medium">#{game.id}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 text-center text-[10px] text-gray-500 font-bold">No games uploaded yet</div>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}
                
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 p-3 bg-red-500/5 hover:bg-red-500/10 rounded-xl transition-all text-red-500/70 hover:text-red-500"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-xs font-bold">Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 space-y-4">
              <p className="text-gray-500 text-xs px-2">
                Sign in to save scores and earn rewards.
              </p>
              <button 
                onClick={onLogin}
                className="w-full flex items-center justify-center gap-3 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-lg shadow-blue-500/10 transition-all active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                GOOGLE SIGN IN
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
