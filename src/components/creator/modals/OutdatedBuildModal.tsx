import React from 'react';
import { RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';

interface OutdatedBuildModalProps {
  isOpen: boolean;
  outdatedDetails: { sourceTime: string; buildTime: string } | null;
  onClose: () => void;
}

export default function OutdatedBuildModal({
  isOpen, outdatedDetails, onClose,
}: OutdatedBuildModalProps) {
  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-[#1a1d24] border border-yellow-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Glow */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500/50 to-orange-500/50" />
        
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center mb-6 border border-yellow-500/20">
            <RotateCcw className="w-8 h-8 text-yellow-500 animate-spin-slow" />
          </div>
          
          <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight italic">
            Bản Build Có Vẻ Đã Cũ!
          </h3>
          
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Hệ thống phát hiện mã nguồn của bạn đã thay đổi nhưng dự án chưa được build lại. 
            Tải lên bản build cũ sẽ khiến các thay đổi mới nhất không xuất hiện.
          </p>

          <div className="w-full bg-black/40 rounded-2xl p-4 mb-6 border border-white/5 flex flex-col gap-3 text-left">
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Source Code mới nhất</div>
              <div className="text-xs text-yellow-400 font-mono">{outdatedDetails?.sourceTime}</div>
            </div>
            <div className="h-px bg-white/5" />
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Build Assets cũ nhất</div>
              <div className="text-xs text-gray-400 font-mono">{outdatedDetails?.buildTime}</div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <button 
              onClick={onClose}
              className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-yellow-600/20 active:scale-95"
            >
              Tôi Đã Hiểu, Tiếp Tục
            </button>
            <button 
              onClick={onClose}
              className="w-full py-3 bg-transparent border border-gray-700 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-bold transition-all"
            >
              Để Tôi Build Lại Đã
            </button>
          </div>

          <p className="mt-6 text-[10px] text-gray-500 font-medium">
            Mẹo: Chạy <code>npm run build</code> hoặc <code>yarn build</code> để cập nhật thư mục <code>dist</code>.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
