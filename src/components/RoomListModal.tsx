import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, Shield, Plus, Lock, Globe, RefreshCw, ChevronRight, Play, Info, Signal, Wifi, MapPin, Gamepad2 } from 'lucide-react';
import { externalApi } from '../services/externalApi';

interface Room {
  id: string;
  name: string;
  host_id: string;
  host_name: string;
  has_password: boolean;
  player_count: number;
  host_region: string;
  members_json?: string;
}

interface RoomListModalProps {
  game: any;
  user: any;
  onClose: () => void;
  onJoinRoom: (room: Room, password?: string) => void;
  onCreateRoom: (roomData: { name: string, password?: string, region: string }) => void;
  onLoginRequest: () => void;
  onPlaySolo: () => void;
}

export default function RoomListModal({ game, user, onClose, onJoinRoom, onCreateRoom, onLoginRequest, onPlaySolo }: RoomListModalProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [password, setPassword] = useState('');
  const [roomName, setRoomName] = useState(`${user?.displayName || 'Guest'}'s Room`);
  const [roomPassword, setRoomPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [userRegion, setUserRegion] = useState('Unknown');

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      const data = await externalApi.getP2PRooms(game.id.toString());
      setRooms(data);
    } catch (err: any) {
      console.error('Failed to fetch rooms:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserRegion = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data.city && data.country_name) {
        setUserRegion(`${data.city}, ${data.country_code}`);
      }
    } catch (e) {
      console.warn('Region fetch failed:', e);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchUserRegion();
    const interval = setInterval(fetchRooms, 15000); // Auto refresh every 15s
    return () => clearInterval(interval);
  }, [game.id]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onLoginRequest();
      return;
    }
    onCreateRoom({
      name: roomName,
      password: roomPassword || undefined,
      region: userRegion
    });
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    if (selectedRoom.has_password && !password) {
      setError('Password is required for this room');
      return;
    }
    onJoinRoom(selectedRoom, password);
  };

  const calculatePingEstimation = (hostRegion: string) => {
    if (hostRegion === 'Unknown' || userRegion === 'Unknown') return { label: 'Unknown', color: 'text-gray-400' };
    
    // Simple logic: if countries match, Good; else Medium
    const hostCountry = hostRegion.split(', ').pop();
    const userCountry = userRegion.split(', ').pop();
    
    if (hostCountry === userCountry) return { label: 'Good (~40ms)', color: 'text-green-400' };
    return { label: 'Medium (~200ms)', color: 'text-yellow-400' };
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-[#1a1a2e]/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Users className="text-white w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white leading-tight">{game.title} Lobby</h2>
              <p className="text-sm text-gray-400 flex items-center gap-1">
                <Globe className="w-3 h-3 text-indigo-400" /> {userRegion}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {!isCreating && !selectedRoom ? (
              <motion.div 
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white/90">Active Rooms ({rooms.length})</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={fetchRooms}
                      disabled={isLoading}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-indigo-400"
                      title="Refresh Rooms"
                    >
                      <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    {/* Hide Solo/Create buttons for VPS authoritative games */}
                    {!(game.tunnel_url || game.category?.toLowerCase().includes('vps')) && (
                      <>
                        <button 
                          onClick={onPlaySolo}
                          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg font-medium transition-all active:scale-95 text-sm"
                        >
                          <Play className="w-4 h-4" /> Play Solo
                        </button>
                        <button 
                          onClick={() => setIsCreating(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20 active:scale-95 text-sm"
                        >
                          <Plus className="w-4 h-4" /> Create Room
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-3 min-h-[300px]">
                  {rooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500 bg-white/2 border border-dashed border-white/10 rounded-xl">
                      <Gamepad2 className="w-12 h-12 mb-3 opacity-20" />
                      <p>No active rooms found. Be the first to host!</p>
                    </div>
                  ) : (
                    rooms.map(room => (
                      <motion.div 
                        key={room.id}
                        whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.05)' }}
                        onClick={() => setSelectedRoom(room)}
                        className="p-4 bg-white/2 border border-white/5 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                            {room.has_password ? <Lock className="w-5 h-5 text-amber-400" /> : <Globe className="w-5 h-5 text-indigo-400" />}
                          </div>
                          <div>
                            <div className="font-bold text-white group-hover:text-indigo-300 transition-colors">{room.name}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                              <span>Host: {room.host_name}</span>
                              <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                              <span className={calculatePingEstimation(room.host_region).color}>
                                {calculatePingEstimation(room.host_region).label}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
                              <Users className="w-4 h-4" />
                              <span>{room.player_count}</span>
                            </div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest">Players</div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            ) : isCreating ? (
              <motion.div 
                key="create"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <button 
                  onClick={() => setIsCreating(false)}
                  className="mb-4 text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" /> Back to lobby
                </button>
                <h3 className="text-xl font-bold text-white mb-6">Host a New Game</h3>
                
                <form onSubmit={handleCreateSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Room Name</label>
                    <input 
                      type="text"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                      placeholder="Enter room name..."
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Password (Optional)</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input 
                        type="password"
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                        placeholder="Leave blank for public room"
                        value={roomPassword}
                        onChange={(e) => setRoomPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-4">
                    <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div className="text-sm text-indigo-300">
                      As the host, you'll need a stable internet connection. Room configuration will automatically use your ExpressTURN settings.
                    </div>
                  </div>

                  {error && <p className="text-red-400 text-sm italic">{error}</p>}

                  <button 
                    type="submit"
                    className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-all shadow-xl shadow-indigo-500/20 active:scale-95 mt-4"
                  >
                    Launch Match
                  </button>
                </form>
              </motion.div>
            ) : selectedRoom && (
              <motion.div 
                key="confirm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-6"
              >
                <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
                  <Play className="w-10 h-10 text-indigo-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{selectedRoom.name}</h3>
                <div className="flex items-center justify-center gap-4 text-gray-400 mb-8">
                  <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {selectedRoom.player_count} Players</span>
                  <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                  <span className={`flex items-center gap-1 ${calculatePingEstimation(selectedRoom.host_region).color}`}>
                    <Wifi className="w-4 h-4" /> {calculatePingEstimation(selectedRoom.host_region).label}
                  </span>
                </div>

                <form onSubmit={handleJoinSubmit} className="max-w-sm mx-auto space-y-4">
                  {selectedRoom.has_password && (
                    <div className="text-left">
                      <label className="block text-sm font-medium text-gray-400 mb-2">Room Password</label>
                      <input 
                        type="password"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all text-center tracking-widest"
                        placeholder="••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                      />
                    </div>
                  )}

                  {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => { setSelectedRoom(null); setError(null); setPassword(''); }}
                      className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-[2] py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
                    >
                      Join Game
                    </button>
                  </div>
                </form>

                {/* Member List Preview */}
                {selectedRoom.members_json && (
                  <div className="mt-10 pt-8 border-t border-white/5">
                    <h4 className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-4">Current Members</h4>
                    <div className="flex flex-wrap justify-center gap-2">
                       {JSON.parse(selectedRoom.members_json).map((p: any, idx: number) => (
                         <div key={idx} className="px-3 py-1.5 bg-white/5 rounded-full text-xs text-gray-300 border border-white/5">
                            {p.name}
                         </div>
                       ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
