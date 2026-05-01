import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LooterItem } from '../types';
import { RARITY_COLORS } from '../constants';

interface ItemPopupProps {
  item: LooterItem | null;
  onClose: () => void;
  style?: React.CSSProperties;
}

const ItemPopup: React.FC<ItemPopupProps> = ({ item, onClose, style }) => {
  if (!item) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[100] pointer-events-auto" 
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        className="absolute z-[101] min-w-[200px] bg-[#0a1421] border border-white/20 shadow-2xl p-4 pointer-events-auto"
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="text-4xl">{item.icon}</div>
          <div>
            <h3 className="font-bold text-white text-lg">{item.name}</h3>
            <span className={`text-xs uppercase font-black ${RARITY_COLORS[item.rarity]?.split(' ')[1] || 'text-white'}`}>
              {item.rarity}
            </span>
          </div>
        </div>

        <div className="space-y-1 text-sm border-t border-white/10 pt-3">
          <div className="flex justify-between">
            <span className="text-gray-400">Kích thước:</span>
            <span className="text-white font-mono">{item.gridW}x{item.gridH}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Tier:</span>
            <span className="text-white font-mono uppercase">T{item.tier || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Giá bán:</span>
            <span className="text-yellow-400 font-mono">{item.price || 0} 💰</span>
          </div>

          {(item.weight || 0) !== 0 && (
            <div className="flex justify-between">
              <span className="text-red-400 font-bold">Sát thương:</span>
              <span className="text-red-400 font-mono">{item.weight} ⚔️</span>
            </div>
          )}

          {(item.energyCost || 0) !== 0 && (
            <div className="flex justify-between">
              <span className="text-orange-400">Tiêu tốn NL:</span>
              <span className="text-orange-400 font-mono">-{item.energyCost} ⚡</span>
            </div>
          )}
          
          {(item.hpBonus || 0) !== 0 && (
            <div className="flex justify-between">
              <span className="text-emerald-400">HP Bonus:</span>
              <span className="text-emerald-400 font-mono">+{item.hpBonus} ❤️</span>
            </div>
          )}
          
          {(item.energyMax || 0) !== 0 && (
            <div className="flex justify-between">
              <span className="text-blue-400">Năng lượng:</span>
              <span className="text-blue-400 font-mono">+{item.energyMax} 🧪</span>
            </div>
          )}

          {(item.energyRegen || 0) !== 0 && (
            <div className="flex justify-between">
              <span className="text-green-400">Hồi năng lượng:</span>
              <span className="text-green-400 font-mono">+{item.energyRegen} ✨</span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ItemPopup;
