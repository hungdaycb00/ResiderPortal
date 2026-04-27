import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import type { SeaItem, BagItem } from './types';
import { MAX_GRID_W, MAX_GRID_H } from './constants';

interface InventoryGridProps {
  items: SeaItem[];
  bags: BagItem[]; // We only use the first bag now
  readOnly?: boolean;
  onItemLayoutChange?: (items: SeaItem[]) => void;
  onItemDoubleClick?: (item: SeaItem) => void;
  onItemClick?: (item: SeaItem) => void;
  cellSize?: number;
  gridW?: number;
  gridH?: number;
}

const RARITY_COLORS: Record<string, string> = {
  common: 'bg-sky-100 border-sky-300 text-sky-900',
  uncommon: 'bg-emerald-100 border-emerald-300 text-emerald-900',
  rare: 'bg-amber-100 border-amber-400 text-amber-900',
  legendary: 'bg-purple-100 border-purple-400 text-purple-900',
};

const BAG_BG: Record<string, string> = {
  common: 'rgba(56, 189, 248, 0.2)', // sky-400
  uncommon: 'rgba(52, 211, 153, 0.2)', // emerald-400
  rare: 'rgba(251, 191, 36, 0.2)', // amber-400
  legendary: 'rgba(192, 132, 252, 0.2)', // purple-400
};

const CLICK_MOVE_TOLERANCE = 8;

const formatItemTooltip = (item: SeaItem) =>
  `${item.name}\n⚔ ${item.weight || 0} DMG | ❤ +${item.hpBonus || 0} HP\n⚡ +${item.energyMax || 0} EN | ✦ +${item.energyRegen || 0} Regen\n💰 ${item.price || 0} vang | ${item.gridW}x${item.gridH}`;

type DragMode = 'item' | 'storage-item' | null;

const InventoryGrid: React.FC<InventoryGridProps> = ({
  items, bags, readOnly = false,
  onItemLayoutChange,
  onItemDoubleClick,
  onItemClick,
  cellSize = 40,
  gridW = MAX_GRID_W,
  gridH = MAX_GRID_H,
}) => {
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragItem, setDragItem] = useState<SeaItem | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const [isHoveringStorage, setIsHoveringStorage] = useState(false);
  const [isHoveringTrash, setIsHoveringTrash] = useState(false);
  
  const gridRef = useRef<HTMLDivElement>(null);
  const storageRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const pointerStartRef = useRef<{ itemUid: string; clientX: number; clientY: number } | null>(null);
  const pointerCurrentRef = useRef<{ clientX: number; clientY: number } | null>(null);

  const activeBag = Array.isArray(bags) ? bags[0] : undefined; // Single bag system

  // ==========================================
  // Occupancy Grids
  // ==========================================
  const buildBagOccupancy = useCallback(() => {
    const grid: boolean[][] = Array.from({ length: gridH }, () => Array(gridW).fill(false));
    if (!activeBag || activeBag.gridX < 0) return grid;
    
    const w = activeBag.width;
    const h = activeBag.height;
    const shape = activeBag.shape || [];
    for (let r = 0; r < h && (activeBag.gridY + r) < gridH; r++) {
      for (let c = 0; c < w && (activeBag.gridX + c) < gridW; c++) {
        if (shape[r] && shape[r][c]) {
          grid[activeBag.gridY + r][activeBag.gridX + c] = true;
        }
      }
    }
    return grid;
  }, [activeBag]);

  const buildItemOccupancy = useCallback((excludeUid?: string) => {
    const grid: (string | null)[][] = Array.from({ length: gridH }, () => Array(gridW).fill(null));
    for (const item of items) {
      if (item.gridX < 0 || (excludeUid && item.uid === excludeUid)) continue;
      const w = item.gridW;
      const h = item.gridH;
      for (let r = item.gridY; r < item.gridY + h && r < gridH; r++) {
        for (let c = item.gridX; c < item.gridX + w && c < gridW; c++) {
          grid[r][c] = item.uid;
        }
      }
    }
    return grid;
  }, [items]);

  // Can place item: all cells must be on the bag AND not occupied by another item
  const canPlaceItem = useCallback((item: SeaItem, x: number, y: number, excludeUid?: string) => {
    const bagOcc = buildBagOccupancy();
    const itemOcc = buildItemOccupancy(excludeUid);
    const w = item.gridW;
    const h = item.gridH;
    if (x < 0 || y < 0 || x + w > gridW || y + h > gridH) return false;
    for (let r = y; r < y + h; r++) {
      for (let c = x; c < x + w; c++) {
        if (!bagOcc[r][c]) return false; // Not on the bag
        if (itemOcc[r][c] !== null) return false; // Overlap
      }
    }
    return true;
  }, [buildBagOccupancy, buildItemOccupancy]);

  // ==========================================
  // Drag Handlers
  // ==========================================
  const handleItemPointerDown = (e: React.PointerEvent, item: SeaItem, mode: DragMode) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    
    // We base the coordinates relative to the screen to allow cross-container dragging,
    // but for simplicity we keep it relative to a wrapper or document.
    // Actually, bounding rects are easiest.
    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) return;
    
    setDragMode(mode);
    setDragItem(item);
    const itemRect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    setDragOffset({
      x: Math.max(0, e.clientX - itemRect.left),
      y: Math.max(0, e.clientY - itemRect.top),
    });
    pointerStartRef.current = {
      itemUid: item.uid,
      clientX: e.clientX,
      clientY: e.clientY,
    };
    pointerCurrentRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
    };
    try {
      (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
    } catch {}
    
    // Track global position if needed, but we'll stick to relative to grid for rendering
    setDragPos({ x: e.clientX - gridRect.left, y: e.clientY - gridRect.top });
  };

  const updateDragPosition = useCallback((clientX: number, clientY: number) => {
    if (!dragMode || !dragItem) return;
    const gridRect = gridRef.current?.getBoundingClientRect();
    const storageRect = storageRef.current?.getBoundingClientRect();
    const trashRect = trashRef.current?.getBoundingClientRect();
    
    if (gridRect) {
      const relX = clientX - gridRect.left;
      const relY = clientY - gridRect.top;
      pointerCurrentRef.current = { clientX, clientY };
      setDragPos({ x: relX, y: relY });
      
      if (trashRect &&
          clientX >= trashRect.left && clientX <= trashRect.right &&
          clientY >= trashRect.top && clientY <= trashRect.bottom) {
        setHoverCell(null);
        setIsHoveringStorage(false);
        setIsHoveringTrash(true);
      }
      // Check if hovering grid
      else if (clientX >= gridRect.left && clientX <= gridRect.right &&
          clientY >= gridRect.top && clientY <= gridRect.bottom) {
        const topLeftX = relX - dragOffset.x;
        const topLeftY = relY - dragOffset.y;
        setHoverCell({
          x: Math.round(topLeftX / cellSize),
          y: Math.round(topLeftY / cellSize),
        });
        setIsHoveringStorage(false);
        setIsHoveringTrash(false);
      } 
      // Check if hovering storage
      else if (storageRect && 
               clientX >= storageRect.left && clientX <= storageRect.right &&
               clientY >= storageRect.top && clientY <= storageRect.bottom) {
        setHoverCell(null);
        setIsHoveringStorage(true);
        setIsHoveringTrash(false);
      } 
      else {
        setHoverCell(null);
        setIsHoveringStorage(false);
        setIsHoveringTrash(false);
      }
    }
  }, [dragMode, dragItem, cellSize, dragOffset.x, dragOffset.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    updateDragPosition(e.clientX, e.clientY);
  }, [updateDragPosition]);

  const handlePointerUp = useCallback((e?: React.PointerEvent | PointerEvent) => {
    if (!dragMode || !dragItem) return;

    if (e && 'currentTarget' in e && e.currentTarget) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture?.((e as any).pointerId);
      } catch {}
    }

    const pointerStart = pointerStartRef.current;
    const pointerCurrent = pointerCurrentRef.current;
    const wasClick = !!pointerStart && pointerStart.itemUid === dragItem.uid &&
      !!pointerCurrent &&
      Math.abs(pointerCurrent.clientX - pointerStart.clientX) <= CLICK_MOVE_TOLERANCE &&
      Math.abs(pointerCurrent.clientY - pointerStart.clientY) <= CLICK_MOVE_TOLERANCE;

    if (wasClick) {
      onItemClick?.(dragItem);
    } else {
      if (isHoveringTrash) {
        onItemLayoutChange?.(items.filter(i => i.uid !== dragItem.uid));
      } else if (hoverCell && canPlaceItem(dragItem, hoverCell.x, hoverCell.y, dragItem.uid)) {
        // Place on grid
        const newItems = items.map(i =>
          i.uid === dragItem.uid ? { ...i, gridX: hoverCell.x, gridY: hoverCell.y } : i
        );
        onItemLayoutChange?.(newItems);
      } else if (isHoveringStorage && dragMode === 'item') {
        // Move from grid to storage
        const newItems = items.map(i =>
          i.uid === dragItem.uid ? { ...i, gridX: -1, gridY: -1 } : i
        );
        onItemLayoutChange?.(newItems);
      } else if (isHoveringStorage && dragMode === 'storage-item') {
        // Reorder storage: move to front
        const filtered = items.filter(i => i.uid !== dragItem.uid);
        const movingItem = items.find(i => i.uid === dragItem.uid);
        if (movingItem) {
          onItemLayoutChange?.([movingItem, ...filtered]);
        }
      }
    }

    setDragMode(null);
    setDragItem(null);
    setHoverCell(null);
    setIsHoveringStorage(false);
    setIsHoveringTrash(false);
    pointerStartRef.current = null;
    pointerCurrentRef.current = null;
  }, [dragMode, dragItem, hoverCell, isHoveringStorage, isHoveringTrash, items, canPlaceItem, onItemClick, onItemLayoutChange]);

  // Global mouse up to catch drops outside
  React.useEffect(() => {
    const handleGlobalMove = (e: PointerEvent) => {
      if (dragMode) updateDragPosition(e.clientX, e.clientY);
    };
    const handleGlobalUp = (e: PointerEvent) => {
      if (dragMode) handlePointerUp(e);
    };
    window.addEventListener('pointermove', handleGlobalMove);
    window.addEventListener('pointerup', handleGlobalUp);
    return () => {
      window.removeEventListener('pointermove', handleGlobalMove);
      window.removeEventListener('pointerup', handleGlobalUp);
    };
  }, [dragMode, handlePointerUp, updateDragPosition]);

  // ==========================================
  // Render Helpers
  // ==========================================
  const bagOcc = buildBagOccupancy();
  
  const highlightCells: { x: number; y: number; valid: boolean }[] = [];
  if (hoverCell && dragMode && dragItem) {
    const w = dragItem.gridW;
    const h = dragItem.gridH;
    const valid = canPlaceItem(dragItem, hoverCell.x, hoverCell.y, dragItem.uid);
    for (let r = hoverCell.y; r < hoverCell.y + h; r++) {
      for (let c = hoverCell.x; c < hoverCell.x + w; c++) {
        highlightCells.push({ x: c, y: r, valid });
      }
    }
  }

  const gridItems = items.filter(i => i.gridX >= 0);
  const storageItems = items.filter(i => i.gridX < 0);

  return (
    <div 
      className="flex flex-col gap-4 select-none touch-none" 
      onPointerMove={handlePointerMove}
    >
      {/* Main Grid 7x6 */}
      <div
        ref={gridRef}
        className="relative rounded-lg overflow-hidden shrink-0 mx-auto"
        style={{
          width: gridW * cellSize,
          height: gridH * cellSize,
          background: '#060d17',
          border: '2px solid rgba(30, 60, 90, 0.4)',
          touchAction: 'none',
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Layer 1: Background grid cells */}
        {Array.from({ length: gridH }).map((_, r) =>
          Array.from({ length: gridW }).map((_, c) => (
            <div
              key={`bg-${r}-${c}`}
              className="absolute"
              style={{
                left: c * cellSize,
                top: r * cellSize,
                width: cellSize,
                height: cellSize,
                border: '1px solid rgba(25, 45, 65, 0.3)',
                background: bagOcc[r][c] ? undefined : 'rgba(8, 12, 20, 0.6)',
              }}
            />
          ))
        )}

        {/* Layer 2: Bag active cells */}
        {activeBag && activeBag.gridX >= 0 && (() => {
          const w = activeBag.width;
          const h = activeBag.height;
          const shape = activeBag.shape || [];
          const bgColor = BAG_BG[activeBag.rarity] || BAG_BG.common;

          const bagCells = [];
          for (let r = 0; r < h; r++) {
            for (let c = 0; c < w; c++) {
              if (shape[r] && shape[r][c]) {
                bagCells.push(
                  <div
                    key={`bag-${r}-${c}`}
                    className="absolute"
                    style={{
                      left: (activeBag.gridX + c) * cellSize,
                      top: (activeBag.gridY + r) * cellSize,
                      width: cellSize,
                      height: cellSize,
                      background: bgColor,
                      border: '1px solid rgba(56, 189, 248, 0.5)',
                      boxShadow: 'inset 0 0 8px rgba(56, 189, 248, 0.15)',
                    }}
                  />
                );
              }
            }
          }
          return bagCells;
        })()}

        {/* Highlight cells */}
        {highlightCells.map(({ x, y, valid }) => (
          <div
            key={`hl-${x}-${y}`}
            className={`absolute z-10 pointer-events-none transition-colors ${
              valid ? 'bg-emerald-400/30 border border-emerald-400/60' : 'bg-red-400/30 border border-red-400/60'
            }`}
            style={{ left: x * cellSize, top: y * cellSize, width: cellSize, height: cellSize }}
          />
        ))}

        {/* Grid Items */}
        {gridItems.map(item => {
          const w = item.gridW;
          const h = item.gridH;
          const isDragging = dragItem?.uid === item.uid && dragMode === 'item';
          const colorClass = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;

          return (
            <motion.div
              key={item.uid}
              className={`absolute rounded-md border-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing z-20 ${colorClass} ${
                isDragging ? 'opacity-30' : 'opacity-100 hover:brightness-110'
              }`}
              style={{
                left: item.gridX * cellSize + 1,
                top: item.gridY * cellSize + 1,
                width: w * cellSize - 2,
                height: h * cellSize - 2,
                touchAction: 'none',
              }}
              whileTap={{ scale: 1.05 }}
              onPointerDown={(e) => handleItemPointerDown(e, item, 'item')}
              onDoubleClick={() => onItemDoubleClick?.(item)}
              onContextMenu={(e) => e.preventDefault()}
              title={formatItemTooltip(item)}
            >
              <span className="text-xl leading-none drop-shadow-md">{item.icon}</span>
            </motion.div>
          );
        })}

        {/* Drag Ghost inside Grid bounds */}
        {dragMode && dragItem && hoverCell && (
          <div
            className={`absolute z-[9999] pointer-events-none rounded-md border-2 flex flex-col items-center justify-center shadow-2xl opacity-90 ${RARITY_COLORS[dragItem.rarity] || RARITY_COLORS.common}`}
            style={{
              left: hoverCell.x * cellSize + 1,
              top: hoverCell.y * cellSize + 1,
              width: dragItem.gridW * cellSize - 2,
              height: dragItem.gridH * cellSize - 2,
            }}
          >
            <span className="text-xl">{dragItem.icon}</span>
          </div>
        )}
      </div>

      {/* Storage Area (Khoảng trống chứa item) */}
      <div 
        ref={storageRef}
        className={`relative min-h-[80px] bg-[#0d1a2a] border-2 rounded-lg p-3 transition-colors ${
          isHoveringStorage ? 'border-cyan-400 bg-[#122b46]' : 'border-cyan-800/50'
        }`}
      >
        <div
          ref={trashRef}
          className={`absolute left-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/40 bg-red-950/50 text-red-200 transition-transform ${
            isHoveringTrash ? 'scale-150 border-red-300 bg-red-800 text-white shadow-lg shadow-red-900/40' : 'scale-100'
          }`}
        >
          <Trash2 className="h-4 w-4" />
        </div>
        <div className="mb-2 flex items-center justify-between pl-10">
          <p className="text-[10px] text-cyan-500/80 font-bold uppercase tracking-widest">
            Khu Vực Chờ ({storageItems.length})
          </p>
          <span className="text-[9px] text-cyan-600">Kéo item xuống đây để cất</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {storageItems.map(item => {
            const isDragging = dragItem?.uid === item.uid && dragMode === 'storage-item';
            const colorClass = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
            
            return (
              <div
                key={item.uid}
                className={`w-10 h-10 rounded-md border-2 flex items-center justify-center cursor-grab active:cursor-grabbing ${colorClass} ${
                  isDragging ? 'opacity-30' : 'opacity-100 hover:brightness-110'
                }`}
                style={{ touchAction: 'none' }}
                onPointerDown={(e) => handleItemPointerDown(e, item, 'storage-item')}
                onDoubleClick={() => onItemDoubleClick?.(item)}
                title={formatItemTooltip(item)}
              >
                <span className="text-xl leading-none">{item.icon}</span>
              </div>
            );
          })}
          {storageItems.length === 0 && (
             <div className="text-xs text-slate-500 italic w-full text-center py-2">
               Kho trống
             </div>
          )}
        </div>
      </div>
      
      {/* Free-floating Drag Ghost (follows cursor exactly when not snapped to grid) */}
      {dragMode && dragItem && (!hoverCell || isHoveringStorage) && (
        <div
          className={`fixed z-[9999] pointer-events-none rounded-md border-2 flex flex-col items-center justify-center shadow-2xl opacity-90 scale-105 ${RARITY_COLORS[dragItem.rarity] || RARITY_COLORS.common}`}
          style={{
            // Convert relative to viewport coords since it's fixed
            left: (gridRef.current?.getBoundingClientRect().left || 0) + dragPos.x - dragOffset.x,
            top: (gridRef.current?.getBoundingClientRect().top || 0) + dragPos.y - dragOffset.y,
            width: dragItem.gridW * cellSize - 2,
            height: dragItem.gridH * cellSize - 2,
          }}
        >
          <span className="text-xl">{dragItem.icon}</span>
        </div>
      )}
    </div>
  );
};

export default InventoryGrid;
