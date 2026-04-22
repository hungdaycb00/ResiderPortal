import React from 'react';
import { X, Loader2, MessageSquare, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { FeedbackData } from '../types';

interface FeedbackModalProps {
  game: any;
  feedbacks: FeedbackData[];
  isLoading: boolean;
  onClose: () => void;
}

export default function FeedbackModal({
  game, feedbacks, isLoading, onClose,
}: FeedbackModalProps) {
  if (!game) return null;

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
        className="bg-[#1a1d24] border border-white/10 rounded-3xl p-6 max-w-lg w-full h-[80vh] flex flex-col shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-yellow-400" />
              Góp ý từ người chơi
            </h3>
            <p className="text-[10px] text-gray-500 font-medium ml-7">{game.name || game.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm">Đang tải đóng góp...</p>
            </div>
          ) : feedbacks.length > 0 ? (
            <div className="space-y-4">
              {feedbacks.map((fb, idx) => (
                <div key={idx} className="bg-black/20 border border-white/5 rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-800 border border-white/10 overflow-hidden">
                        {fb.avatar_url ? (
                          <img src={fb.avatar_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500">
                            {fb.display_name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-200">{fb.display_name || 'Người chơi vô danh'}</div>
                        <div className="text-[9px] text-gray-500">{new Date(fb.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
                      <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                      <span className="text-[10px] font-bold text-yellow-500">{fb.rating}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed italic">
                    "{fb.comment || 'Không có nhận xét chi tiết.'}"
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-700 text-center p-8">
              <MessageSquare className="w-12 h-12 mb-4 opacity-10" />
              <p className="text-sm italic">Chưa có góp ý nào cho game này.</p>
              <p className="text-[10px] mt-2">Đóng góp sẽ xuất hiện khi có người chơi bình luận về game của bạn.</p>
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-white/5">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl font-bold transition-all"
          >
            Đóng
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
