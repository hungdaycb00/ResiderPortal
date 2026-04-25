import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { RotateCw } from 'lucide-react';
import type { SeaItem, BagItem } from './SeaGameProvider';
import { MAX_GRID_W, MAX_GRID_H } from './SeaGameProvider';

interface InventoryGridV2Props {
  items: SeaItem[];
  bags: BagItem[];
  readOnly?: boolean;
  stagingItem?: SeaItem | null;
  stagingBag?: BagItem | null;
  onItemLayoutChange?: (items: SeaItem[]) => void;
  onBagLayoutChange?: (bags: BagItem[]) => void;
  onStagingItemPlaced?: (item: SeaItem) => void;
  onStagingBagPlaced?: (bag: BagItem) => void;
  onStagingItemDiscarded?: () => void;
  onStagingBagDiscarded?: () => void;
  cellSize?: number;
}

const RARITY_COLORS: Record<string, string> = {
  common: 'bg-sky-100 border-sky-300',
  uncommon: 'bg-emerald-100 border-emerald-300',
  rare: 'bg-amber-100 border-amber-400',
  legendary: 'bg-purple-100 border-purple-400',
};

const BAG_COLORS: Record<string, string> = {
  common: 'bg-cyan-900/40 border-cyan-600/50',
  uncommon: 'bg-teal-900/40 border-teal-500/50',
  rare: 'bg-amber-900/30 border-amber-500/40',
  legendary: 'bg-purple-900/30 border-purple-500/40',
};

const BAG_BG: Record<string, string> = {
  common: 'rgba(20, 60, 100, 0.35)',
  uncommon: 'rgba(20, 80, 70, 0.35)',
  rare: 'rgba(80, 60, 20, 0.35)',
  legendary: 'rgba(60, 20, 80, 0.35)',
};

type DragMode = 'item' | 'bag' | 'staging-item' | 'staging-bag' | null;

const InventoryGridV2: React.FC<InventoryGridV2Props> = ({
  items, bags, readOnly = false,
  stagingItem, stagingBag,
  onItemLayoutChange, onBagLayoutChange,
  onStagingItemPlaced, onStagingBagPlaced,
  onStagingItemDiscarded, onStagingBagDiscarded,
  cellSize = 40,
}) => {
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragItem, setDragItem] = useState<SeaItem | null>(null);
  const [dragBag, setDragBag] = useState<BagItem | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // ==========================================
  // Occupancy Grids
  // ==========================================
  const buildBagOccupancy = useCallback((excludeUid?: string) => {
    const grid: (string | null)[][] = Array.from({ length: MAX_GRID_H }, () => Array(MAX_GRID_W).fill(null));
    for (const bag of bags) {
      if (bag.gridX < 0 || (excludeUid && bag.uid === excludeUid)) continue;
      const w = bag.rotated ? bag.height : bag.width;
      const h = bag.rotated ? bag.width : bag.height;
      for (let r = bag.gridY; r < bag.gridY + h && r < MAX_GRID_H; r++) {
        for (let c = bag.gridX; c < bag.gridX + w && c < MAX_GRID_W; c++) {
          grid[r][c] = bag.uid;
        }
      }
    }
    return grid;
  }, [bags]);

  const buildItemOccupancy = useCallback((excludeUid?: string) => {
    const grid: (string | null)[][] = Array.from({ length: MAX_GRID_H }, () => Array(MAX_GRID_W).fill(null));
    for (const item of items) {
      if (item.gridX < 0 || (excludeUid && item.uid === excludeUid)) continue;
      const w = item.rotated ? item.gridH : item.gridW;
      const h = item.rotated ? item.gridW : item.gridH;
      for (let r = item.gridY; r < item.gridY + h && r < MAX_GRID_H; r++) {
        for (let c = item.gridX; c < item.gridX + w && c < MAX_GRID_W; c++) {
          grid[r][c] = item.uid;
        }
      }
    }
    return grid;
  }, [items]);

  // Can place item: all cells must be on a bag AND not occupied by another item
  const canPlaceItem = useCallback((item: SeaItem, x: number, y: number, excludeUid?: string) => {
    const bagOcc = buildBagOccupancy();
    const itemOcc = buildItemOccupancy(excludeUid);
    const w = item.rotated ? item.gridH : item.gridW;
    const h = item.rotated ? item.gridW : item.gridH;
    if (x < 0 || y < 0 || x + w > MAX_GRID_W || y + h > MAX_GRID_H) return false;
    for (let r = y; r < y + h; r++) {
      for (let c = x; c < x + w; c++) {
        if (bagOcc[r][c] === null) return false; // Not on a bag
        if (itemOcc[r][c] !== null) return false; // Overlap
      }
    }
    return true;
  }, [buildBagOccupancy, buildItemOccupancy]);

  // Can place bag: all cells must be within grid and not overlap another bag
  const canPlaceBag = useCallback((bag: BagItem, x: number, y: number, excludeUid?: string) => {
    const bagOcc = buildBagOccupancy(excludeUid);
    const w = bag.rotated ? bag.height : bag.width;
    const h = bag.rotated ? bag.width : bag.height;
    if (x < 0 || y < 0 || x + w > MAX_GRID_W || y + h > MAX_GRID_H) return false;
    for (let r = y; r < y + h; r++) {
      for (let c = x; c < x + w; c++) {
        if (bagOcc[r][c] !== null) return false;
      }
    }
    return true;
  }, [buildBagOccupancy]);

  // ==========================================
  // Drag Handlers
  // ==========================================
  const handleItemPointerDown = (e: React.PointerEvent, item: SeaItem) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    const w = item.rotated ? item.gridH : item.gridW;
    const h = item.rotated ? item.gridW : item.gridH;
    setDragMode('item');
    setDragItem(item);
    setDragOffset({ x: (w * cellSize) / 2, y: (h * cellSize) / 2 });
    setDragPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleBagPointerDown = (e: React.PointerEvent, bag: BagItem) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    const w = bag.rotated ? bag.height : bag.width;
    const h = bag.rotated ? bag.width : bag.height;
    setDragMode('bag');
    setDragBag(bag);
    setDragOffset({ x: (w * cellSize) / 2, y: (h * cellSize) / 2 });
    setDragPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleStagingItemDown = (e: React.PointerEvent) => {
    if (!stagingItem || readOnly) return;
    e.preventDefault();
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragMode('staging-item');
    setDragItem(stagingItem);
    const w = stagingItem.rotated ? stagingItem.gridH : stagingItem.gridW;
    const h = stagingItem.rotated ? stagingItem.gridW : stagingItem.gridH;
    setDragOffset({ x: (w * cellSize) / 2, y: (h * cellSize) / 2 });
    setDragPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleStagingBagDown = (e: React.PointerEvent) => {
    if (!stagingBag || readOnly) return;
    e.preventDefault();
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragMode('staging-bag');
    setDragBag(stagingBag);
    const w = stagingBag.rotated ? stagingBag.height : stagingBag.width;
    const h = stagingBag.rotated ? stagingBag.width : stagingBag.height;
    setDragOffset({ x: (w * cellSize) / 2, y: (h * cellSize) / 2 });
    setDragPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragMode) return;
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    setDragPos({ x: relX, y: relY });
    setHoverCell({ x: Math.floor(relX / cellSize), y: Math.floor(relY / cellSize) });
  }, [dragMode, cellSize]);

  const handlePointerUp = useCallback(() => {
    if (dragMode === 'item' && dragItem && hoverCell) {
      if (canPlaceItem(dragItem, hoverCell.x, hoverCell.y, dragItem.uid)) {
        const newItems = items.map(i =>
          i.uid === dragItem.uid ? { ...i, gridX: hoverCell.x, gridY: hoverCell.y } : i
        );
        onItemLayoutChange?.(newItems);
      }
    }
    if (dragMode === 'bag' && dragBag && hoverCell) {
      if (canPlaceBag(dragBag, hoverCell.x, hoverCell.y, dragBag.uid)) {
        const newBags = bags.map(b =>
          b.uid === dragBag.uid ? { ...b, gridX: hoverCell.x, gridY: hoverCell.y } : b
        );
        onBagLayoutChange?.(newBags);
      }
    }
    if (dragMode === 'staging-item' && dragItem && hoverCell) {
      if (canPlaceItem(dragItem, hoverCell.x, hoverCell.y)) {
        onStagingItemPlaced?.({ ...dragItem, gridX: hoverCell.x, gridY: hoverCell.y });
      }
    }
    if (dragMode === 'staging-bag' && dragBag && hoverCell) {
      if (canPlaceBag(dragBag, hoverCell.x, hoverCell.y)) {
        onStagingBagPlaced?.({ ...dragBag, gridX: hoverCell.x, gridY: hoverCell.y });
      }
    }
    setDragMode(null);
    setDragItem(null);
    setDragBag(null);
    setHoverCell(null);
  }, [dragMode, dragItem, dragBag, hoverCell, items, bags, canPlaceItem, canPlaceBag, onItemLayoutChange, onBagLayoutChange, onStagingItemPlaced, onStagingBagPlaced]);

  // ==========================================
  // Rotate
  // ==========================================
  const handleRotateItem = (item: SeaItem) => {
    if (readOnly) return;
    const rotated = !item.rotated;
    if (dragItem?.uid === item.uid) setDragItem({ ...dragItem, rotated });
    const newItems = items.map(i => i.uid === item.uid ? { ...i, rotated } : i);
    onItemLayoutChange?.(newItems);
  };

  const handleRotateBag = (bag: BagItem) => {
    if (readOnly) return;
    const rotated = !bag.rotated;
    if (dragBag?.uid === bag.uid) setDragBag({ ...dragBag, rotated });
    const newBags = bags.map(b => b.uid === bag.uid ? { ...b, rotated } : b);
    onBagLayoutChange?.(newBags);
  };

  // ==========================================
  // Highlight
  // ==========================================
  const highlightCells: { x: number; y: number; valid: boolean }[] = [];
  if (hoverCell && dragMode) {
    if ((dragMode === 'item' || dragMode === 'staging-item') && dragItem) {
      const w = dragItem.rotated ? dragItem.gridH : dragItem.gridW;
      const h = dragItem.rotated ? dragItem.gridW : dragItem.gridH;
      const valid = canPlaceItem(dragItem, hoverCell.x, hoverCell.y, dragMode === 'item' ? dragItem.uid : undefined);
      for (let r = hoverCell.y; r < hoverCell.y + h; r++) {
        for (let c = hoverCell.x; c < hoverCell.x + w; c++) {
          highlightCells.push({ x: c, y: r, valid });
        }
      }
    }
    if ((dragMode === 'bag' || dragMode === 'staging-bag') && dragBag) {
      const w = dragBag.rotated ? dragBag.height : dragBag.width;
      const h = dragBag.rotated ? dragBag.width : dragBag.height;
      const valid = canPlaceBag(dragBag, hoverCell.x, hoverCell.y, dragMode === 'bag' ? dragBag.uid : undefined);
      for (let r = hoverCell.y; r < hoverCell.y + h; r++) {
        for (let c = hoverCell.x; c < hoverCell.x + w; c++) {
          highlightCells.push({ x: c, y: r, valid });
        }
      }
    }
  }

  const bagOcc = buildBagOccupancy();

  // Ghost dimensions
  const ghostW = dragItem
    ? (dragItem.rotated ? dragItem.gridH : dragItem.gridW) * cellSize
    : dragBag
    ? (dragBag.rotated ? dragBag.height : dragBag.width) * cellSize
    : 0;
  const ghostH = dragItem
    ? (dragItem.rotated ? dragItem.gridW : dragItem.gridH) * cellSize
    : dragBag
    ? (dragBag.rotated ? dragBag.width : dragBag.height) * cellSize
    : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Main Grid 7x8 */}
      <div
        ref={gridRef}
        className="relative rounded-lg select-none overflow-hidden"
        style={{
          width: MAX_GRID_W * cellSize,
          height: MAX_GRID_H * cellSize,
          background: '#060d17',
          border: '2px solid rgba(30, 60, 90, 0.4)',
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={(e) => {
          e.preventDefault();
          if (dragItem) handleRotateItem(dragItem);
          if (dragBag) handleRotateBag(dragBag);
        }}
      >
        {/* Layer 1: Background grid cells */}
        {Array.from({ length: MAX_GRID_H }).map((_, r) =>
          Array.from({ length: MAX_GRID_W }).map((_, c) => (
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

        {/* Layer 2: Bag cells (brighter overlay) */}
        {bags.filter(b => b.gridX >= 0).map(bag => {
          const w = bag.rotated ? bag.height : bag.width;
          const h = bag.rotated ? bag.width : bag.height;
          const isDragging = dragBag?.uid === bag.uid;
          const bgColor = BAG_BG[bag.rarity] || BAG_BG.common;

          return Array.from({ length: h }).map((_, r) =>
            Array.from({ length: w }).map((_, c) => (
              <div
                key={`bag-${bag.uid}-${r}-${c}`}
                className={`absolute transition-opacity ${isDragging ? 'opacity-30' : 'opacity-100'}`}
                style={{
                  left: (bag.gridX + c) * cellSize,
                  top: (bag.gridY + r) * cellSize,
                  width: cellSize,
                  height: cellSize,
                  background: bgColor,
                  border: '1px solid rgba(60, 130, 200, 0.3)',
                }}
                onPointerDown={(e) => {
                  if (e.button === 2) {
                    e.preventDefault();
                    handleRotateBag(bag);
                    return;
                  }
                  // Only start bag drag if no item is at this cell
                  const itemOcc = buildItemOccupancy();
                  if (itemOcc[bag.gridY + r][bag.gridX + c] === null) {
                    handleBagPointerDown(e, bag);
                  }
                }}
              />
            ))
          );
        })}

        {/* Layer 2.5: Bag icon overlay (top-left of each bag) */}
        {bags.filter(b => b.gridX >= 0).map(bag => {
          const isDragging = dragBag?.uid === bag.uid;
          return (
            <div
              key={`bag-icon-${bag.uid}`}
              className={`absolute pointer-events-none z-[5] text-[10px] font-bold flex items-center gap-0.5 px-0.5 rounded transition-opacity ${isDragging ? 'opacity-0' : 'opacity-70'}`}
              style={{
                left: bag.gridX * cellSize + 2,
                top: bag.gridY * cellSize + 1,
                color: 'rgba(150, 200, 255, 0.7)',
              }}
            >
              <span>{bag.icon}</span>
            </div>
          );
        })}

        {/* Drag highlight */}
        {highlightCells.map(({ x, y, valid }) => (
          <div
            key={`hl-${x}-${y}`}
            className={`absolute z-10 pointer-events-none transition-colors ${
              valid ? 'bg-emerald-400/30 border border-emerald-400/60' : 'bg-red-400/30 border border-red-400/60'
            }`}
            style={{ left: x * cellSize, top: y * cellSize, width: cellSize, height: cellSize }}
          />
        ))}

        {/* Layer 3: Items */}
        {items.filter(i => i.gridX >= 0).map(item => {
          const w = item.rotated ? item.gridH : item.gridW;
          const h = item.rotated ? item.gridW : item.gridH;
          const isDragging = dragItem?.uid === item.uid;
          const colorClass = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;

          return (
            <motion.div
              key={item.uid}
              className={`absolute rounded-md border-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing z-20 ${colorClass} ${
                isDragging ? 'opacity-0' : 'opacity-100 hover:brightness-110'
              }`}
              style={{
                left: item.gridX * cellSize + 1,
                top: item.gridY * cellSize + 1,
                width: w * cellSize - 2,
                height: h * cellSize - 2,
              }}
              whileTap={{ scale: 1.08 }}
              onPointerDown={(e) => {
                if (e.button === 2) {
                  e.preventDefault();
                  handleRotateItem(item);
                  return;
                }
                handleItemPointerDown(e, item);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (!dragItem) handleRotateItem(item);
              }}
              title={`${item.name}\n⚔️ ${item.weight} DMG | ❤️ +${item.hpBonus} HP\n💰 ${item.price}g | ${item.gridW}×${item.gridH}`}
            >
              <span className="text-base leading-none drop-shadow-md">{item.icon}</span>
              {(w * cellSize > 45 || h * cellSize > 45) && (
                <span className="text-[7px] font-bold text-gray-700 leading-tight truncate max-w-full px-0.5">{item.name}</span>
              )}
            </motion.div>
          );
        })}

        {/* Drag ghost */}
        {dragMode && (dragItem || dragBag) && (
          <div
            className="absolute z-[9999] pointer-events-none opacity-80 scale-105 origin-center"
            style={{
              left: dragPos.x - dragOffset.x,
              top: dragPos.y - dragOffset.y,
              width: ghostW,
              height: ghostH,
            }}
          >
            {dragItem && (
              <div className={`w-full h-full rounded-md border-2 flex items-center justify-center shadow-2xl ${RARITY_COLORS[dragItem.rarity] || ''}`}>
                <span className="text-xl">{dragItem.icon}</span>
              </div>
            )}
            {dragBag && !dragItem && (
              <div className={`w-full h-full rounded-md border-2 flex items-center justify-center shadow-2xl ${BAG_COLORS[dragBag.rarity] || BAG_COLORS.common}`}
                style={{ background: BAG_BG[dragBag.rarity] || BAG_BG.common }}>
                <span className="text-xl">{dragBag.icon}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Staging Area */}
      {!readOnly && (stagingItem || stagingBag) && (
        <div className="bg-[#0d1a2a] border border-cyan-800/30 rounded-lg p-2.5 space-y-2">
          <p className="text-[9px] text-cyan-500/60 font-bold uppercase tracking-widest">Kho tạm — Kéo vào balo</p>

          {/* Staging Item */}
          {stagingItem && (
            <div className="flex items-center gap-2 bg-amber-900/30 border border-amber-500/30 rounded-lg p-2">
              <div
                className={`shrink-0 rounded-md border-2 flex items-center justify-center cursor-grab ${RARITY_COLORS[stagingItem.rarity] || ''}`}
                style={{ width: (stagingItem.rotated ? stagingItem.gridH : stagingItem.gridW) * cellSize * 0.6, height: (stagingItem.rotated ? stagingItem.gridW : stagingItem.gridH) * cellSize * 0.6 }}
                onPointerDown={handleStagingItemDown}
              >
                <span className="text-sm">{stagingItem.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-amber-200 truncate">{stagingItem.name}</p>
                <p className="text-[9px] text-amber-300/60">⚔️{stagingItem.weight} ❤️+{stagingItem.hpBonus} 💰{stagingItem.price}</p>
              </div>
              <button
                onClick={() => handleRotateItem(stagingItem)}
                className="p-1 bg-amber-700/40 rounded hover:bg-amber-600/40 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5 text-amber-200" />
              </button>
              <button
                onClick={onStagingItemDiscarded}
                className="text-[9px] text-red-400 font-bold px-2 py-1 bg-red-900/30 rounded hover:bg-red-800/40 transition-colors"
              >
                Bỏ
              </button>
            </div>
          )}

          {/* Staging Bag */}
          {stagingBag && (
            <div className="flex items-center gap-2 bg-cyan-900/30 border border-cyan-500/30 rounded-lg p-2">
              <div
                className={`shrink-0 rounded-md border-2 flex items-center justify-center cursor-grab ${BAG_COLORS[stagingBag.rarity] || BAG_COLORS.common}`}
                style={{
                  width: (stagingBag.rotated ? stagingBag.height : stagingBag.width) * cellSize * 0.6,
                  height: (stagingBag.rotated ? stagingBag.width : stagingBag.height) * cellSize * 0.6,
                  background: BAG_BG[stagingBag.rarity] || BAG_BG.common,
                }}
                onPointerDown={handleStagingBagDown}
              >
                <span className="text-sm">{stagingBag.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-cyan-200 truncate">{stagingBag.name}</p>
                <p className="text-[9px] text-cyan-300/60">{stagingBag.width}×{stagingBag.height} ({stagingBag.width * stagingBag.height} ô)</p>
              </div>
              <button
                onClick={() => handleRotateBag(stagingBag)}
                className="p-1 bg-cyan-700/40 rounded hover:bg-cyan-600/40 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5 text-cyan-200" />
              </button>
              <button
                onClick={onStagingBagDiscarded}
                className="text-[9px] text-red-400 font-bold px-2 py-1 bg-red-900/30 rounded hover:bg-red-800/40 transition-colors"
              >
                Bỏ
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryGridV2;
