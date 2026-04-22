import React from 'react';
import { X, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { DocGraphics, DocMode } from '../types';

interface DocOptionsModalProps {
  isOpen: boolean;
  docGraphics: DocGraphics;
  docMode: DocMode;
  onDocGraphicsChange: (g: DocGraphics) => void;
  onDocModeChange: (m: DocMode) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export default function DocOptionsModal({
  isOpen, docGraphics, docMode,
  onDocGraphicsChange, onDocModeChange,
  onConfirm, onClose,
}: DocOptionsModalProps) {
  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-[#1a1d24] border border-blue-500/30 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500" />
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-black flex items-center gap-2 text-white uppercase tracking-tight italic">
              <Download className="w-5 h-5 text-blue-400" />
              Tải Tài Liệu Game
            </h3>
            <p className="text-[10px] text-gray-500 mt-1 ml-7">Chọn loại đồ họa và chế độ chơi phù hợp với game của bạn</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Graphics Selection */}
        <div className="mb-5">
          <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block ml-1">1. Đồ họa</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onDocGraphicsChange('2d')}
              className={`relative p-4 rounded-2xl border-2 transition-all text-left group overflow-hidden ${
                docGraphics === '2d'
                  ? 'bg-green-600/15 border-green-500/60 shadow-lg shadow-green-500/10'
                  : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              {docGraphics === '2d' && <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-green-400 to-emerald-400" />}
              <div className="text-2xl mb-2">🎨</div>
              <div className="text-sm font-black uppercase tracking-tight">2D — P5.js</div>
              <div className="text-[9px] text-gray-500 mt-1 leading-relaxed">Canvas 2D, shapes, sprites, pixel art. Phù hợp cho Arcade, Puzzle, Board game.</div>
            </button>
            <button
              onClick={() => onDocGraphicsChange('3d')}
              className={`relative p-4 rounded-2xl border-2 transition-all text-left group overflow-hidden ${
                docGraphics === '3d'
                  ? 'bg-cyan-600/15 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                  : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              {docGraphics === '3d' && <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-400 to-blue-400" />}
              <div className="text-2xl mb-2">🧊</div>
              <div className="text-sm font-black uppercase tracking-tight">3D — Three.js</div>
              <div className="text-[9px] text-gray-500 mt-1 leading-relaxed">Voxel 3D, orbit camera, colorful scenes. Phù hợp cho Simulation, Sandbox.</div>
            </button>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="mb-6">
          <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block ml-1">2. Chế độ chơi</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onDocModeChange('offline')}
              className={`relative p-4 rounded-2xl border-2 transition-all text-left group overflow-hidden ${
                docMode === 'offline'
                  ? 'bg-yellow-600/15 border-yellow-500/60 shadow-lg shadow-yellow-500/10'
                  : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              {docMode === 'offline' && <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-yellow-400 to-orange-400" />}
              <div className="text-2xl mb-2">🏆</div>
              <div className="text-sm font-black uppercase tracking-tight">Offline</div>
              <div className="text-[9px] text-gray-500 mt-1 leading-relaxed">Chơi đơn. Lưu điểm cao, XP, Level, Rank lên server. Có bảng xếp hạng.</div>
            </button>
            <button
              onClick={() => onDocModeChange('multiplayer')}
              className={`relative p-4 rounded-2xl border-2 transition-all text-left group overflow-hidden ${
                docMode === 'multiplayer'
                  ? 'bg-purple-600/15 border-purple-500/60 shadow-lg shadow-purple-500/10'
                  : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              {docMode === 'multiplayer' && <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-400 to-pink-400" />}
              <div className="text-2xl mb-2">🌐</div>
              <div className="text-sm font-black uppercase tracking-tight">Multiplayer</div>
              <div className="text-[9px] text-gray-500 mt-1 leading-relaxed">P2P WebRTC qua PeerJS. Host-Authoritative, TURN Config tự động inject.</div>
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-black/30 rounded-xl p-3 mb-5 border border-white/5">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 font-bold">Đồ họa:</span>
              <span className={`font-black ${docGraphics === '2d' ? 'text-green-400' : 'text-cyan-400'}`}>
                {docGraphics === '2d' ? '2D P5.js' : '3D Three.js'}
              </span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 font-bold">Mode:</span>
              <span className={`font-black ${docMode === 'offline' ? 'text-yellow-400' : 'text-purple-400'}`}>
                {docMode === 'offline' ? 'Offline + Leaderboard' : 'Multiplayer P2P'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-transparent border border-gray-700 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-bold transition-all"
          >
            Hủy
          </button>
          <button 
            onClick={onConfirm}
            className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 active:scale-95"
          >
            <Download className="w-4 h-4" />
            Tải Document
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
