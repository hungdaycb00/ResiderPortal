import React from 'react';
import { Trash2 } from 'lucide-react';
import type { LooterItem } from '../types';

interface ItemPopupProps {
  item: LooterItem;
  x: number;
  y: number;
  onDrop: (uid: string) => void;
  onClose: () => void;
}

const ItemPopup: React.FC<ItemPopupProps> = ({ item, x, y, onDrop, onClose }) => {
  return (
    <div
      className="fixed z-[10000] rounded-2xl border border-white/10 bg-[#08131d]/90 backdrop-blur-xl p-4 shadow-2xl pointer-events-auto transform -translate-y-1/2"
      style={{
        left: x > window.innerWidth / 2 ? 'auto' : x + 20,
        right: x > window.innerWidth / 2 ? window.innerWidth - x + 20 : 'auto',
        top: y,
        minWidth: '180px',
      }}
    >
      <div className="flex items-center gap-3 border-b border-white/5 pb-3 mb-3">
        <span className="text-3xl drop-shadow-md">{item.icon}</span>
        <div>
          <h3
            className={`text-sm font-black uppercase ${
              item.rarity === 'legendary' ? 'text-purple-400' : 'text-cyan-400'
            }`}
          >
            {item.name}
          </h3>
          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
            {item.rarity}
          </p>
        </div>
      </div>
      <div className="space-y-1.5 mb-4 text-[10px]">
        {item.weight > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-500 font-bold uppercase">Sát thương</span>
            <span className="font-black text-orange-400">{item.weight}</span>
          </div>
        )}
        {item.price > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-500 font-bold uppercase">Giá bán</span>
            <span className="font-black text-amber-400">{item.price}</span>
          </div>
        )}
      </div>
      <button
        onClick={() => {
          onDrop(item.uid);
          onClose();
        }}
        className="w-full py-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-red-500/20"
      >
        <Trash2 className="w-3.5 h-3.5" /> Ném ra biển
      </button>
    </div>
  );
};

export default ItemPopup;
