import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { LooterItem } from './types';

interface CombatInventoryGridProps {
  items: LooterItem[];
  gridWidth: number;
  gridHeight: number;
  readOnly?: boolean;
  onLayoutChange?: (items: LooterItem[]) => void;
  onItemClick?: (item: LooterItem) => void;
  cellSize?: number;
  bag?: any;
}

const RARITY_COLORS: Record<string, string> = {
  common: 'bg-sky-100 border-sky-300',
  uncommon: 'bg-emerald-100 border-emerald-300',
  rare: 'bg-amber-100 border-amber-400',
  legendary: 'bg-purple-100 border-purple-400',
};

const RARITY_GLOW: Record<string, string> = {
  common: '',
  uncommon: 'shadow-emerald-200/50',
  rare: 'shadow-amber-300/60',
  legendary: 'shadow-purple-400/60 animate-pulse',
};

const CombatInventoryGrid: React.FC<CombatInventoryGridProps> = ({
  items,
  gridWidth,
  gridHeight,
  readOnly = false,
  onLayoutChange,
  onItemClick,
  cellSize = 48,
  bag,
}) => {
  const [dragItem, setDragItem] = useState<LooterItem | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const buildOccupancy = useCallback((excludeUid?: string) => {
    const grid: (string | null)[][] = Array.from(
      { length: gridHeight },
      () => Array(gridWidth).fill(null)
    );

    for (const item of items) {
      if (item.gridX < 0 || item.gridY < 0) continue;
      if (excludeUid && item.uid === excludeUid) continue;

      const w = item.rotated ? item.gridH : item.gridW;
      const h = item.rotated ? item.gridW : item.gridH;
      for (let r = item.gridY; r < item.gridY + h && r < gridHeight; r += 1) {
        for (let c = item.gridX; c < item.gridX + w && c < gridWidth; c += 1) {
          grid[r][c] = item.uid;
        }
      }
    }

    return grid;
  }, [items, gridWidth, gridHeight]);

  const canPlace = useCallback((item: LooterItem, x: number, y: number, excludeUid?: string) => {
    const occ = buildOccupancy(excludeUid);
    const w = item.rotated ? item.gridH : item.gridW;
    const h = item.rotated ? item.gridW : item.gridH;

    if (x < 0 || y < 0 || x + w > gridWidth || y + h > gridHeight) return false;

    for (let r = y; r < y + h; r += 1) {
      for (let c = x; c < x + w; c += 1) {
        if (occ[r][c] !== null) return false;
      }
    }

    return true;
  }, [buildOccupancy, gridWidth, gridHeight]);

  const handleItemPointerDown = (e: React.PointerEvent, item: LooterItem) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;

    const w = item.rotated ? item.gridH : item.gridW;
    const h = item.rotated ? item.gridW : item.gridH;
    setDragItem(item);
    setDragOffset({ x: (w * cellSize) / 2, y: (h * cellSize) / 2 });
    setDragPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragItem) return;

    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;

    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    setDragPos({ x: relX, y: relY });
    setHoverCell({
      x: Math.floor(relX / cellSize),
      y: Math.floor(relY / cellSize),
    });
  }, [dragItem, cellSize]);

  const handlePointerUp = useCallback(() => {
    if (!dragItem) return;

    if (hoverCell && canPlace(dragItem, hoverCell.x, hoverCell.y, dragItem.uid)) {
      onLayoutChange?.(
        items.map((item) =>
          item.uid === dragItem.uid
            ? { ...item, gridX: hoverCell.x, gridY: hoverCell.y }
            : item
        )
      );
    } else {
      onLayoutChange?.(
        items.map((item) =>
          item.uid === dragItem.uid
            ? {
                ...item,
                gridX: -1,
                gridY: -1,
                floatX: dragPos.x - dragOffset.x,
                floatY: dragPos.y - dragOffset.y,
              }
            : item
        )
      );
    }

    setDragItem(null);
    setHoverCell(null);
  }, [
    dragItem,
    hoverCell,
    items,
    canPlace,
    onLayoutChange,
    dragPos.x,
    dragPos.y,
    dragOffset.x,
    dragOffset.y,
  ]);

  const handleRotate = (item: LooterItem) => {
    if (readOnly) return;

    const rotated = !item.rotated;
    if (dragItem?.uid === item.uid) {
      setDragItem({ ...dragItem, rotated });
    }

    onLayoutChange?.(
      items.map((current) =>
        current.uid === item.uid ? { ...current, rotated } : current
      )
    );
  };

  const highlightCells: { x: number; y: number; valid: boolean }[] = [];

  if (hoverCell && dragItem) {
    const w = dragItem.rotated ? dragItem.gridH : dragItem.gridW;
    const h = dragItem.rotated ? dragItem.gridW : dragItem.gridH;
    const valid = canPlace(dragItem, hoverCell.x, hoverCell.y, dragItem.uid);

    for (let r = hoverCell.y; r < hoverCell.y + h; r += 1) {
      for (let c = hoverCell.x; c < hoverCell.x + w; c += 1) {
        highlightCells.push({ x: c, y: r, valid });
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={gridRef}
        className="relative border-2 border-cyan-600/40 rounded-lg bg-[#0a1929]/80 select-none"
        style={{ width: gridWidth * cellSize, height: gridHeight * cellSize }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onMouseDown={(e) => {
          if (e.button === 2 && dragItem) {
            e.preventDefault();
            e.stopPropagation();
            handleRotate(dragItem);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (dragItem) handleRotate(dragItem);
        }}
        onAuxClick={(e) => {
          if (e.button === 2 && dragItem) {
            e.preventDefault();
            handleRotate(dragItem);
          }
        }}
      >
        {Array.from({ length: gridHeight }).map((_, r) =>
          Array.from({ length: gridWidth }).map((_, c) => {
            const isBag = bag && bag.shape?.[r - (bag.gridY || 0)]?.[c - (bag.gridX || 0)];
            return (
              <div
                key={`cell-${r}-${c}`}
                className={`absolute border ${isBag ? 'bg-cyan-900/20 border-cyan-800/30' : 'bg-gray-900/40 border-white/5'}`}
                style={{ left: c * cellSize, top: r * cellSize, width: cellSize, height: cellSize }}
              />
            );
          })
        )}

        {highlightCells.map(({ x, y, valid }) => (
          <div
            key={`hl-${x}-${y}`}
            className={`absolute z-10 transition-colors pointer-events-none ${
              valid ? 'bg-emerald-400/30 border border-emerald-400/60' : 'bg-red-400/30 border border-red-400/60'
            }`}
            style={{ left: x * cellSize, top: y * cellSize, width: cellSize, height: cellSize }}
          />
        ))}

        {items.map((item) => {
          if (item.gridX < 0 && item.floatX == null) return null;

          const isFloating = item.gridX < 0;
          const w = item.rotated ? item.gridH : item.gridW;
          const h = item.rotated ? item.gridW : item.gridH;
          const isDragging = dragItem?.uid === item.uid;
          const left = isFloating ? (item.floatX || 0) : item.gridX * cellSize;
          const top = isFloating ? (item.floatY || 0) : item.gridY * cellSize;
          const colorClass = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
          const glowClass = RARITY_GLOW[item.rarity] || '';

          return (
            <motion.div
              key={item.uid}
              className={`absolute rounded-md border-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-shadow origin-center ${colorClass} ${glowClass} ${
                isDragging ? 'opacity-0' : 'opacity-100 hover:brightness-110'
              } ${isFloating ? 'z-[100] ring-4 ring-red-500/80 shadow-2xl animate-pulse' : 'z-20'}`}
              style={{
                left: left + 1,
                top: top + 1,
                width: w * cellSize - 2,
                height: h * cellSize - 2,
              }}
              whileTap={{ scale: 1.1 }}
              onPointerDown={(e) => {
                if (readOnly) {
                  e.preventDefault();
                  e.stopPropagation();
                  onItemClick?.(item);
                  return;
                }
                if (e.button === 2) {
                  e.preventDefault();
                  handleRotate(item);
                  return;
                }
                handleItemPointerDown(e, item);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (!dragItem) handleRotate(item);
              }}
              title={`${item.name}\n${item.weight} DMG | +${item.hpBonus} HP\n${item.price}g | ${item.gridW}x${item.gridH}`}
            >
              <span className="text-lg leading-none drop-shadow-md">{item.icon}</span>
              {(w * cellSize > 50 || h * cellSize > 50) && (
                <span className="text-[8px] font-bold text-gray-700 leading-tight truncate max-w-full px-0.5">{item.name}</span>
              )}
            </motion.div>
          );
        })}

        {dragItem && (
          <div
            className="absolute z-[9999] pointer-events-none opacity-90 scale-110 origin-center"
            style={{
              left: dragPos.x - dragOffset.x,
              top: dragPos.y - dragOffset.y,
              width: (dragItem.rotated ? dragItem.gridH : dragItem.gridW) * cellSize,
              height: (dragItem.rotated ? dragItem.gridW : dragItem.gridH) * cellSize,
            }}
          >
            <div className={`w-full h-full rounded-md border-2 flex items-center justify-center shadow-2xl ${RARITY_COLORS[dragItem.rarity] || ''}`}>
              <span className="text-2xl">{dragItem.icon}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CombatInventoryGrid;
