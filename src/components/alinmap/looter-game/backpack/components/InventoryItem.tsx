import React from 'react';
import { motion } from 'framer-motion';
import type { LooterItem } from '../types';
import { RARITY_COLORS } from '../constants';

interface InventoryItemProps {
  item: LooterItem;
  cellSize: number;
  isDragging?: boolean;
  onPointerDown?: (e: React.PointerEvent, item: LooterItem) => void;
  onDoubleClick?: (item: LooterItem) => void;
  style?: React.CSSProperties;
  className?: string;
}

const InventoryItem: React.FC<InventoryItemProps> = React.memo(({
  item,
  cellSize,
  isDragging = false,
  onPointerDown,
  onDoubleClick,
  style,
  className = '',
}) => {
  return (
    <motion.div
      className={`absolute z-20 cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-20' : ''} rounded-xl overflow-hidden border-2 shadow-md ${RARITY_COLORS[item.rarity]?.split(' ')[0] || 'border-white/20'} ${className}`}
      style={{
        width: (item.gridW || 1) * cellSize,
        height: (item.gridH || 1) * cellSize,
        ...style,
      }}
      onPointerDown={(e) => onPointerDown?.(e, item)}
      onDoubleClick={() => onDoubleClick?.(item)}
    >
      {Array.from({ length: item.gridH || 1 }).map((_, r) =>
        Array.from({ length: item.gridW || 1 }).map((_, c) => {
          if (item.shape && (!item.shape[r] || !item.shape[r][c])) return null;
          return (
            <div
              key={`${r}-${c}`}
              className="absolute bg-slate-100/95"
              style={{
                left: c * cellSize,
                top: r * cellSize,
                width: cellSize,
                height: cellSize,
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
}, (prev, next) => {
  return prev.item.uid === next.item.uid &&
         prev.item.gridX === next.item.gridX &&
         prev.item.gridY === next.item.gridY &&
         prev.cellSize === next.cellSize &&
         prev.isDragging === next.isDragging &&
         prev.style?.left === next.style?.left &&
         prev.style?.top === next.style?.top &&
         prev.className === next.className;
});

export default InventoryItem;
