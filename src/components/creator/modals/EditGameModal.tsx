import React from 'react';
import { X, Settings } from 'lucide-react';
import { motion } from 'motion/react';
import CategorySelector from '../components/CategorySelector';
import { AVAILABLE_CATEGORIES } from '../constants';

interface EditGameModalProps {
  editingGame: any;
  editGameName: string;
  editNameError: string;
  editCategories: string[];
  onClose: () => void;
  onEditGameNameChange: (name: string) => void;
  onEditNameErrorClear: () => void;
  onEditCategoryToggle: (catId: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  showNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function EditGameModal({
  editingGame, editGameName, editNameError, editCategories,
  onClose, onEditGameNameChange, onEditNameErrorClear,
  onEditCategoryToggle, onSubmit, showNotification,
}: EditGameModalProps) {
  if (!editingGame) return null;

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
        className="bg-[#1a1d24] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" />
            Chỉnh sửa thông tin Game
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Tên Game (Không ký tự đặc biệt)</label>
            <input 
              type="text"
              value={editGameName}
              onChange={(e) => {
                onEditGameNameChange(e.target.value);
                onEditNameErrorClear();
              }}
              className={`w-full bg-black/40 border ${editNameError ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-colors`}
              placeholder="Nhập tên game..."
              required
            />
            {editNameError && (
              <p className="text-[10px] text-red-500 mt-1.5 ml-1 font-bold animate-in fade-in slide-in-from-top-1">
                {editNameError}
              </p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2 px-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Thể loại (Tối đa 3)</label>
              <span className={`text-[9px] font-bold ${editCategories.length === 3 ? 'text-red-400' : 'text-purple-400'}`}>
                {editCategories.length}/3
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onEditCategoryToggle(cat.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-bold transition-all ${
                    editCategories.includes(cat.id.toLowerCase())
                    ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                    : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/10'
                  }`}
                >
                  {cat.icon}
                  {cat.name.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl font-bold transition-all"
            >
              Hủy
            </button>
            <button 
              type="submit"
              className="flex-[2] py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-600/20"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
