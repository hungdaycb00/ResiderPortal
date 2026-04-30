import React from 'react';
import { createPortal } from 'react-dom';
import type { LooterItem } from '../types';
import { RARITY_COLORS } from '../constants';

interface DragPortalProps {
  dragItem: LooterItem;
  dragPos: { clientX: number; clientY: number };
  dragOffset: { x: number; y: number };
  cellSize: number;
}

const DragPortal: React.FC<DragPortalProps> = ({
  dragItem,
  dragPos,
  dragOffset,
  cellSize,
}) => {
  return createPortal(
    <div
      className="fixed pointer-events-none z-[999999] opacity-90 scale-110 shadow-2xl rounded-2xl overflow-hidden border-2 bg-slate-100/95"
      style={{
        left: dragPos.clientX - dragOffset.x,
        top: dragPos.clientY - dragOffset.y,
        width: (dragItem.gridW || 1) * cellSize,
        height: (dragItem.gridH || 1) * cellSize,
        borderColor:
          RARITY_COLORS[dragItem.rarity]?.split(' ')[0].replace('border-', '') ||
          'rgba(255,255,255,0.4)',
      }}
    >
      {Array.from({ length: dragItem.gridH || 1 }).map((_, r) =>
        Array.from({ length: dragItem.gridW || 1 }).map((_, c) => {
          if (dragItem.shape && (!dragItem.shape[r] || !dragItem.shape[r][c])) return null;
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
        <span className="text-5xl drop-shadow-2xl select-none">{dragItem.icon}</span>
      </div>
    </div>,
    document.body
  );
};

export default DragPortal;
