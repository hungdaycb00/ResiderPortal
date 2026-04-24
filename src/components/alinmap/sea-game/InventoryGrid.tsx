import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { RotateCw } from 'lucide-react';
import type { SeaItem } from './SeaGameProvider';

interface InventoryGridProps {
  items: SeaItem[];
  gridWidth: number;
  gridHeight: number;
  readOnly?: boolean;
  stagingItem?: SeaItem | null;
  onLayoutChange?: (items: SeaItem[]) => void;
  onStagingPlaced?: (item: SeaItem) => void;
  onStagingDiscarded?: () => void;
  cellSize?: number;
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

const InventoryGrid: React.FC<InventoryGridProps> = ({
  items, gridWidth, gridHeight, readOnly = false,
  stagingItem, onLayoutChange, onStagingPlaced, onStagingDiscarded,
  cellSize = 48,
}) => {
  const [dragItem, setDragItem] = useState<SeaItem | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingStaging, setIsDraggingStaging] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Build occupancy grid
  const buildOccupancy = useCallback((excludeUid?: string) => {
    const grid: (string | null)[][] = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(null));
    for (const item of items) {
      if (item.gridX < 0 || item.gridY < 0) continue;
      if (excludeUid && item.uid === excludeUid) continue;
      const w = item.rotated ? item.gridH : item.gridW;
      const h = item.rotated ? item.gridW : item.gridH;
      for (let r = item.gridY; r < item.gridY + h && r < gridHeight; r++) {
        for (let c = item.gridX; c < item.gridX + w && c < gridWidth; c++) {
          grid[r][c] = item.uid;
        }
      }
    }
    return grid;
  }, [items, gridWidth, gridHeight]);

  const canPlace = useCallback((item: SeaItem, x: number, y: number, excludeUid?: string) => {
    const occ = buildOccupancy(excludeUid);
    const w = item.rotated ? item.gridH : item.gridW;
    const h = item.rotated ? item.gridW : item.gridH;
    if (x < 0 || y < 0 || x + w > gridWidth || y + h > gridHeight) return false;
    for (let r = y; r < y + h; r++) {
      for (let c = x; c < x + w; c++) {
        if (occ[r][c] !== null) return false;
      }
    }
    return true;
  }, [buildOccupancy, gridWidth, gridHeight]);

  // --- Drag handlers (inventory items) ---
  const handleItemPointerDown = (e: React.PointerEvent, item: SeaItem) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragItem(item);
    // Đặt offset vào chính giữa item
    const w = item.rotated ? item.gridH : item.gridW;
    const h = item.rotated ? item.gridW : item.gridH;
    setDragOffset({ x: (w * cellSize) / 2, y: (h * cellSize) / 2 });
    setDragPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragItem && !isDraggingStaging) return;
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Calculate position relative to grid
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    
    setDragPos({ x: relX, y: relY });
    const cellX = Math.floor(relX / cellSize);
    const cellY = Math.floor(relY / cellSize);
    setHoverCell({ x: cellX, y: cellY });
  }, [dragItem, isDraggingStaging, cellSize]);

  const handlePointerUp = useCallback(() => {
    if (dragItem) {
      if (hoverCell && canPlace(dragItem, hoverCell.x, hoverCell.y, dragItem.uid)) {
        const newItems = items.map(i =>
          i.uid === dragItem.uid ? { ...i, gridX: hoverCell.x, gridY: hoverCell.y } : i
        );
        onLayoutChange?.(newItems);
      } else {
        // Nếu thả ra ngoài hoặc không hợp lệ, chuyển thành floating
        const newItems = items.map(i =>
          i.uid === dragItem.uid ? { ...i, gridX: -1, gridY: -1 } : i
        );
        onLayoutChange?.(newItems);
      }
    }
    if (isDraggingStaging && stagingItem && hoverCell) {
      if (canPlace(stagingItem, hoverCell.x, hoverCell.y)) {
        const placed = { ...stagingItem, gridX: hoverCell.x, gridY: hoverCell.y };
        onStagingPlaced?.(placed);
      }
      setIsDraggingStaging(false);
    }
    setDragItem(null);
    setHoverCell(null);
  }, [dragItem, hoverCell, items, canPlace, onLayoutChange, isDraggingStaging, stagingItem, onStagingPlaced]);

  // --- Rotate ---
  const handleRotate = (item: SeaItem) => {
    if (readOnly) return;
    const rotated = !item.rotated;
    
    // Luôn cho phép xoay (yêu cầu mới: không cần biết có đủ ô hay không)
    if (dragItem?.uid === item.uid) {
      setDragItem({ ...dragItem, rotated });
    }
    
    // Cập nhật trạng thái trong danh sách items
    const newItems = items.map(i => i.uid === item.uid ? { ...i, rotated } : i);
    onLayoutChange?.(newItems);

    // Nếu là staging item
    if (stagingItem && item.uid === stagingItem.uid) {
      onStagingPlaced?.({ ...item, rotated });
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: SeaItem) => {
    e.preventDefault();
    handleRotate(item);
  };

  // --- Staging item drag ---
  const handleStagingPointerDown = (e: React.PointerEvent) => {
    if (!stagingItem) return;
    e.preventDefault();
    setIsDraggingStaging(true);
    setDragPos({ x: e.clientX, y: e.clientY });
  };

  // Render placed items
  const occupancy = buildOccupancy();

  // Highlight cells for current drag
  const highlightCells: { x: number; y: number; valid: boolean }[] = [];
  if (hoverCell && (dragItem || (isDraggingStaging && stagingItem))) {
    const item = dragItem || stagingItem!;
    const w = item.rotated ? item.gridH : item.gridW;
    const h = item.rotated ? item.gridW : item.gridH;
    const valid = canPlace(item, hoverCell.x, hoverCell.y, dragItem?.uid);
    for (let r = hoverCell.y; r < hoverCell.y + h; r++) {
      for (let c = hoverCell.x; c < hoverCell.x + w; c++) {
        highlightCells.push({ x: c, y: r, valid });
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Grid */}
      <div
        ref={gridRef}
        className="relative border-2 border-cyan-600/40 rounded-lg bg-[#0a1929]/80 select-none"
        style={{ width: gridWidth * cellSize, height: gridHeight * cellSize }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onMouseDown={(e) => {
          // Button 2 is Right Click
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
        {/* Grid lines */}
        {Array.from({ length: gridHeight }).map((_, r) =>
          Array.from({ length: gridWidth }).map((_, c) => (
            <div
              key={`cell-${r}-${c}`}
              className="absolute border border-cyan-800/30"
              style={{ left: c * cellSize, top: r * cellSize, width: cellSize, height: cellSize }}
            />
          ))
        )}

        {/* Highlight on drag */}
        {highlightCells.map(({ x, y, valid }) => (
          <div
            key={`hl-${x}-${y}`}
            className={`absolute z-10 transition-colors pointer-events-none ${
              valid ? 'bg-emerald-400/30 border border-emerald-400/60' : 'bg-red-400/30 border border-red-400/60'
            }`}
            style={{ left: x * cellSize, top: y * cellSize, width: cellSize, height: cellSize }}
          />
        ))}

        {/* Placed items */}
        {items.filter(i => i.gridX >= 0 && i.gridY >= 0).map(item => {
          const w = item.rotated ? item.gridH : item.gridW;
          const h = item.rotated ? item.gridW : item.gridH;
          const isDragging = dragItem?.uid === item.uid;
          const colorClass = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
          const glowClass = RARITY_GLOW[item.rarity] || '';

          return (
            <motion.div
              key={item.uid}
              className={`absolute z-20 rounded-md border-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-shadow origin-center ${colorClass} ${glowClass} ${
                isDragging ? 'opacity-0' : 'opacity-100 hover:brightness-110'
              }`}
              style={{
                left: item.gridX * cellSize + 1,
                top: item.gridY * cellSize + 1,
                width: w * cellSize - 2,
                height: h * cellSize - 2,
              }}
              whileTap={{ scale: 1.1 }}
              onPointerDown={(e) => {
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
              title={`${item.name}\n⚔️ ${item.weight} DMG | ❤️ +${item.hpBonus} HP\n💰 ${item.price}g | ${item.gridW}×${item.gridH}`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {(w * cellSize > 50 || h * cellSize > 50) && (
                <span className="text-[8px] font-bold text-gray-700 leading-tight truncate max-w-full px-0.5">{item.name}</span>
              )}
            </motion.div>
          );
        })}

        {/* Dragging ghost - now using absolute to avoid BottomSheet transform issues */}
        {(dragItem || (isDraggingStaging && stagingItem)) && (
          <div
            className="absolute z-[9999] pointer-events-none opacity-90 scale-110 origin-center"
            style={{
              left: dragPos.x - (dragItem ? dragOffset.x : ((dragItem || stagingItem)!.rotated ? (dragItem || stagingItem)!.gridH : (dragItem || stagingItem)!.gridW) * cellSize / 2),
              top: dragPos.y - (dragItem ? dragOffset.y : ((dragItem || stagingItem)!.rotated ? (dragItem || stagingItem)!.gridW : (dragItem || stagingItem)!.gridH) * cellSize / 2),
              width: ((dragItem || stagingItem)!.rotated ? (dragItem || stagingItem)!.gridH : (dragItem || stagingItem)!.gridW) * cellSize,
              height: ((dragItem || stagingItem)!.rotated ? (dragItem || stagingItem)!.gridW : (dragItem || stagingItem)!.gridH) * cellSize,
            }}
          >
            <div className={`w-full h-full rounded-md border-2 flex items-center justify-center shadow-2xl ${RARITY_COLORS[(dragItem || stagingItem)!.rarity] || ''}`}>
              <span className="text-2xl">{(dragItem || stagingItem)!.icon}</span>
            </div>
          </div>
        )}
      </div>

      {/* Staging Area */}
      {stagingItem && !readOnly && (
        <div className="flex items-center gap-2 bg-amber-900/40 border border-amber-400/50 rounded-lg p-2">
          <div
            className={`shrink-0 rounded-md border-2 flex items-center justify-center cursor-grab ${RARITY_COLORS[stagingItem.rarity] || ''}`}
            style={{ width: stagingItem.gridW * cellSize * 0.7, height: stagingItem.gridH * cellSize * 0.7 }}
            onPointerDown={handleStagingPointerDown}
          >
            <span className="text-lg">{stagingItem.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-200 truncate">{stagingItem.name}</p>
            <p className="text-[10px] text-amber-300/70">⚔️{stagingItem.weight} ❤️+{stagingItem.hpBonus} 💰{stagingItem.price}</p>
            <p className="text-[9px] text-amber-400/50">Kéo vào grid để nhặt</p>
          </div>
          <button
            onClick={() => handleRotate({ ...stagingItem, gridX: -1, gridY: -1 })}
            className="p-1.5 bg-amber-700/50 rounded hover:bg-amber-600/50 transition-colors"
            title="Xoay item"
          >
            <RotateCw className="w-4 h-4 text-amber-200" />
          </button>
          <button
            onClick={onStagingDiscarded}
            className="text-[10px] text-red-400 font-bold px-2 py-1 bg-red-900/30 rounded hover:bg-red-800/40 transition-colors"
          >
            Bỏ
          </button>
        </div>
      )}
    </div>
  );
};

export default InventoryGrid;
