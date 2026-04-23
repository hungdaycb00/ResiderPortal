import React from 'react';
import { X, Play, FileCode, Settings, MessageSquare, Trash2, Database, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GameData } from '../types';

interface MyGamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverGames: GameData[];
  onPlayGame: (game: any) => void;
  onUpdateGame: (game: any) => void;
  onEditInfo: (game: any) => void;
  onViewFeedback: (game: any) => void;
  onDeleteGame: (gameId: string | number) => void;
}

export default function MyGamesModal({
  serverGames,
  onPlayGame, onUpdateGame, onEditInfo, onViewFeedback, onDeleteGame,
}: Omit<MyGamesModalProps, 'isOpen' | 'onClose'>) {
  return (
        <div className="w-full h-full flex flex-col bg-[#1a1d24]">
            <div className="p-6 flex items-center justify-between bg-[#1a1d24] border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 rounded-xl">
                  <Database className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">My Games List</h3>
                  <p className="text-xs text-gray-500 font-medium">Manage and monitor your uploaded projects</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#14161c]/50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {serverGames.map(game => (
                  <div key={game.id} className="bg-[#1a1d24] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 hover:border-blue-500/30 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full translate-x-16 -translate-y-16 group-hover:bg-blue-600/10 transition-all" />
                    
                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#252830] flex items-center justify-center text-xs text-blue-400 font-black border border-white/5 shadow-inner">
                          #{game.id}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-base text-gray-100 truncate group-hover:text-blue-400 transition-colors uppercase italic tracking-tighter">{game.name || game.title}</h4>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {(game.category || 'Uncategorized').split(',').map((cat: string, i: number) => (
                              <span key={i} className="text-[9px] px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20 font-bold uppercase tracking-wider">
                                {cat.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {game.normalizedImage && (
                          <div className="w-12 h-12 rounded-xl bg-gray-900 border border-white/10 overflow-hidden shadow-lg">
                            <img src={game.normalizedImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                          </div>
                        )}
                        <div className="flex items-center gap-1 bg-yellow-400/10 px-2 py-0.5 rounded-lg border border-yellow-400/20">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          <span className="text-[10px] text-yellow-400 font-black">{game.rating || '0.0'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-2 mt-2 relative z-10">
                      <button 
                        onClick={() => {
                          onPlayGame(game);
                        }}
                        className="flex items-center justify-center py-2.5 bg-green-600/10 hover:bg-green-600/20 border border-green-500/20 rounded-xl transition-all group/btn"
                        title="Play"
                      >
                        <Play className="w-4 h-4 text-green-400 group-hover/btn:scale-125 transition-transform" />
                      </button>
                      <button 
                        onClick={() => onUpdateGame(game)}
                        className="flex items-center justify-center py-2.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 rounded-xl transition-all group/btn"
                        title="Update Folder"
                      >
                        <FileCode className="w-4 h-4 text-blue-400 group-hover/btn:scale-125 transition-transform" />
                      </button>
                      <button 
                        onClick={() => onEditInfo(game)}
                        className="flex items-center justify-center py-2.5 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 rounded-xl transition-all group/btn"
                        title="Edit Info"
                      >
                        <Settings className="w-4 h-4 text-purple-400 group-hover/btn:scale-125 transition-transform" />
                      </button>
                      <button 
                        onClick={() => onViewFeedback(game)}
                        className="flex items-center justify-center py-2.5 bg-yellow-600/10 hover:bg-yellow-600/20 border border-yellow-500/20 rounded-xl transition-all group/btn"
                        title="View Feedbacks"
                      >
                        <MessageSquare className="w-4 h-4 text-yellow-400 group-hover/btn:scale-125 transition-transform" />
                      </button>
                      <button 
                        onClick={() => onDeleteGame(game.id)}
                        className="flex items-center justify-center py-2.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 rounded-xl transition-all group/btn"
                        title="Delete Game"
                      >
                        <Trash2 className="w-4 h-4 text-red-400 group-hover/btn:scale-125 transition-transform" />
                      </button>
                    </div>
                  </div>
                ))}

                {serverGames.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-600">
                    <div className="w-24 h-24 rounded-full bg-gray-800/20 flex items-center justify-center mb-6 border border-white/5">
                      <Database className="w-12 h-12 opacity-20" />
                    </div>
                    <p className="text-lg font-bold text-gray-500">No Games Found</p>
                    <p className="text-sm italic text-gray-600 mt-2">Bạn chưa tải lên game nào lên server.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 bg-[#1a1d24] border-t border-white/5 text-center">
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest tracking-widest">Alin.city Game Creator • Project Management v2.0</p>
            </div>
        </div>
  );
}
