import React from 'react';
import { motion } from 'framer-motion';
import type { LooterItem } from '../types';
// import { RARITY_COLORS } from '../constants'; // Moved locally to avoid circular dependency issues

const ITEM_RARITY_COLORS: Record<string, string> = {
  common: 'border-sky-500/40 text-sky-500',
  uncommon: 'border-emerald-500/40 text-emerald-500',
  rare: 'border-amber-500/40 text-amber-500',
  legendary: 'border-purple-500/40 text-purple-500',
};

interface InventoryItemProps {
  item: LooterItem;
  cellSize: number;
  isDragging?: boolean;
  isGhost?: boolean;
  isInvalid?: boolean;
  onPointerDown?: (e: React.PointerEvent, item: LooterItem) => void;
  onDoubleClick?: (item: LooterItem) => void;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

const InventoryItem: React.FC<InventoryItemProps> = React.memo(({
  item,
  cellSize,
  isDragging = false,
  isGhost = false,
  isInvalid = false,
  onPointerDown,
  onDoubleClick,
  onClick,
  style,
  className = '',
}) => {
  const clickTimerRef = React.useRef<any>(null);
  const lastClickTimeRef = React.useRef<number>(0);

  // If we start dragging, cancel any pending click
  React.useEffect(() => {
    if (isDragging && clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
  }, [isDragging]);

  return (
    <motion.div
      className={`absolute cursor-grab active:cursor-grabbing border rounded-sm shadow-sm 
        ${isDragging ? 'opacity-20 z-10' : 'z-20'} 
        ${isGhost ? 'opacity-40 pointer-events-none z-10' : ''}
        ${isInvalid ? 'border-red-500 bg-red-500/20' : (ITEM_RARITY_COLORS[item.rarity]?.split(' ')[0] || 'border-white/20')} 
        ${className}`}
      style={{
        ...style,
        width: (item.gridW || 1) * cellSize - 2,
        height: (item.gridH || 1) * cellSize - 2,
        left: (typeof style?.left === 'number' ? style.left : 0) + 1,
        top: (typeof style?.top === 'number' ? style.top : 0) + 1,
      }}
      onPointerDown={(e) => {
        onPointerDown?.(e, item);
      }}
      onClick={(e) => {
        e.stopPropagation();
        const now = Date.now();
        const timeDiff = now - lastClickTimeRef.current;

        if (timeDiff < 200) {
          // CUSTOM DOUBLE CLICK DETECTED
          if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
          }
          lastClickTimeRef.current = 0; // Reset
          onDoubleClick?.(item);
        } else {
          // Potential single click
          lastClickTimeRef.current = now;
          if (onDoubleClick) {
            if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
            clickTimerRef.current = setTimeout(() => {
              onClick?.();
              clickTimerRef.current = null;
            }, 200);
          } else {
            onClick?.();
          }
        }
      }}
    >
      {Array.from({ length: item.gridH || 1 }).map((_, r) =>
        Array.from({ length: item.gridW || 1 }).map((_, c) => {
          if (item.shape && (!item.shape[r] || !item.shape[r][c])) return null;
          return (
            <div
              key={`${r}-${c}`}
              className={`absolute rounded-sm ${isInvalid ? 'bg-red-400/50' : 'bg-slate-100/95'}`}
              style={{
                left: c * cellSize,
                top: r * cellSize,
                width: cellSize - 2,
                height: cellSize - 2,
              }}
            />
          );
        })
      )}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-4xl drop-shadow-md select-none">{item.icon}</span>
      </div>
    </motion.div>
  );
});

export default InventoryItem;
