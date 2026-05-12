import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LooterItem } from '../types';
import { RARITY_COLORS, BAG_DEFAULTS } from '../constants';

interface ItemPopupProps {
  item: LooterItem | null;
  onClose: () => void;
  style?: React.CSSProperties;
}

const ItemPopup: React.FC<ItemPopupProps> = ({ item, onClose, style }) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [adjustedStyle, setAdjustedStyle] = useState<React.CSSProperties>(style || {});

  useEffect(() => {
    if (!item || !popupRef.current) return;
    const el = popupRef.current;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;

    let newLeft = typeof style?.left === 'number' ? style.left : rect.left;
    let newTop = typeof style?.top === 'number' ? style.top : rect.top;

    // Clamp right
    if (newLeft + rect.width > vw - margin) {
      newLeft = vw - rect.width - margin;
    }
    // Clamp left
    if (newLeft < margin) newLeft = margin;

    // Clamp bottom
    if (newTop + rect.height > vh - margin) {
      newTop = vh - rect.height - margin;
    }
    // Clamp top
    if (newTop < margin) newTop = margin;

    setAdjustedStyle({ ...style, left: newLeft, top: newTop });
  }, [item, style]);

  useEffect(() => {
    if (!item) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (popupRef.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [item, onClose]);

  if (!item) return null;

  const bagDef = BAG_DEFAULTS[item.id] || null;
  const isBag = item.type === 'bag' || !!bagDef;
  const displayItem = { ...item };
  
  // Nếu là balo, merge thông tin từ defaults nếu bị thiếu
  if (isBag && bagDef) {
    if (!displayItem.hpBonus) displayItem.hpBonus = bagDef.hpBonus;
    if (!displayItem.energyMax) displayItem.energyMax = bagDef.energyMax;
    if (!displayItem.energyRegen) displayItem.energyRegen = bagDef.energyRegen;
  }

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[100] pointer-events-auto" 
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      <motion.div
        ref={popupRef}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        className="absolute z-[101] min-w-[200px] max-w-[260px] bg-[#0a1421] border border-white/20 shadow-2xl p-4 pointer-events-auto"
        style={adjustedStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="text-4xl">{displayItem.icon}</div>
          <div>
            <h3 className="font-bold text-white text-lg">{displayItem.name}</h3>
            <span className={`text-xs uppercase font-black ${RARITY_COLORS[displayItem.rarity]?.split(' ')[1] || 'text-white'}`}>
              {displayItem.rarity}
            </span>
          </div>
        </div>

        <div className="space-y-1 text-sm border-t border-white/10 pt-3">
          <div className="flex justify-between">
            <span className="text-gray-400">Kích thước:</span>
            <span className="text-white font-mono">{displayItem.gridW || 1}x{displayItem.gridH || 1}</span>
          </div>
          {isBag && (
            <div className="flex justify-between">
              <span className="text-indigo-400 font-bold">Sức chứa Balo:</span>
              <span className="text-indigo-400 font-mono">
                {(displayItem as any).cells || bagDef?.cells || ((displayItem as any).width || bagDef?.width || 1) * ((displayItem as any).height || bagDef?.height || 1)} ô
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400">Giá bán:</span>
            <span className="text-yellow-400 font-mono">{displayItem.price || 0} 💰</span>
          </div>

          {(displayItem.weight || 0) !== 0 && (
            <div className="flex justify-between">
              <span className="text-red-400 font-bold">Sát thương:</span>
              <span className="text-red-400 font-mono">{displayItem.weight} ⚔️</span>
            </div>
          )}

          {(displayItem.energyCost || 0) !== 0 && (
            <div className="flex justify-between">
              <span className="text-orange-400">Tiêu tốn NL:</span>
              <span className="text-orange-400 font-mono">-{displayItem.energyCost} ⚡</span>
            </div>
          )}
          
          {(displayItem.hpBonus || 0) !== 0 && (
            <div className="flex justify-between">
              <span className="text-emerald-400">HP Bonus:</span>
              <span className="text-emerald-400 font-mono">+{displayItem.hpBonus} ❤️</span>
            </div>
          )}
          
          {(displayItem.energyMax || 0) !== 0 && (
            <div className="flex justify-between">
              <span className="text-blue-400">Năng lượng:</span>
              <span className="text-blue-400 font-mono">+{displayItem.energyMax} 🧪</span>
            </div>
          )}

          {(displayItem.energyRegen || 0) !== 0 && (
            <div className="flex justify-between">
              <span className="text-green-400">Hồi năng lượng:</span>
              <span className="text-green-400 font-mono">+{displayItem.energyRegen} ✨</span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ItemPopup;
