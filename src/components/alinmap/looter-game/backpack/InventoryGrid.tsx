import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { DollarSign, Trash2 } from 'lucide-react';
import type { LooterItem, BagItem } from './types';
import { useLooterGame } from '../LooterGameProvider';
import { MAX_GRID_W, MAX_GRID_H } from './constants';

interface InventoryGridProps {
  items: LooterItem[];
  bags: BagItem[]; // We only use the first bag now
  readOnly?: boolean;
  onItemLayoutChange?: (items: LooterItem[]) => void;
  onItemDoubleClick?: (item: LooterItem) => void;
  onItemClick?: (item: LooterItem) => void;
  cellSize?: number;
  gridW?: number;
  gridH?: number;
  hideStorage?: boolean;
  onHoverCellChange?: (cell: { x: number; y: number } | null) => void;
  onDragStart?: (item: LooterItem, source: 'inventory' | 'storage', offset: { x: number; y: number }) => void;
  onDragEnd?: () => void;
  onExternalDrop?: (item: LooterItem, x: number, y: number) => void;
  externalDragItem?: LooterItem | null;
  externalDragOffset?: { x: number; y: number } | null;
  externalHoverCell?: { x: number; y: number } | null;
}

const RARITY_COLORS: Record<string, string> = {
  common: 'bg-sky-100 border-sky-300 text-sky-900',
  uncommon: 'bg-emerald-100 border-emerald-300 text-emerald-900',
  rare: 'bg-amber-100 border-amber-400 text-amber-900',
  legendary: 'bg-purple-100 border-purple-400 text-purple-900',
};

const BAG_BG: Record<string, string> = {
  common: 'rgba(56, 189, 248, 0.15)', // sky-400
  uncommon: 'rgba(52, 211, 153, 0.15)', // emerald-400
  rare: 'rgba(251, 191, 36, 0.15)', // amber-400
  legendary: 'rgba(192, 132, 252, 0.15)', // purple-400
};

const CLICK_MOVE_TOLERANCE = 8;

const formatItemTooltip = (item: LooterItem) =>
  `${item.name}\n⚔ ${item.weight || 0} DMG | ❤ +${item.hpBonus || 0} HP\n⚡ +${item.energyMax || 0} EN | ✦ +${item.energyRegen || 0} Regen\n💰 ${item.price || 0} vàng | ${item.gridW || 1}x${item.gridH || 1}`;

type DragMode = 'item' | 'storage-item' | null;

const InventoryGrid: React.FC<InventoryGridProps> = ({
  items, bags, readOnly = false,
  onItemLayoutChange,
  onItemDoubleClick,
  onItemClick,
  cellSize = 40,
  gridW = MAX_GRID_W,
  gridH = MAX_GRID_H,
  hideStorage = false,
  onHoverCellChange,
  onDragStart,
  onDragEnd,
  onExternalDrop,
  externalDragItem,
  externalDragOffset,
  externalHoverCell,
}) => {
  const { setDraggingItem, setIsItemDragging, isItemDragging, sellItems, isLootGameMode, isChallengeActive, items: allItems, saveInventory } = useLooterGame();
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragItem, setDragItem] = useState<LooterItem | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState({ x: 0, y: 0, clientX: 0, clientY: 0 });
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const [isHoveringStorage, setIsHoveringStorage] = useState(false);
  const [isHoveringSell, setIsHoveringSell] = useState(false);
  const [popupInfo, setPopupInfo] = useState<{ item: LooterItem; x: number; y: number } | null>(null);
  
  const gridRef = useRef<HTMLDivElement>(null);
  const storageRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const pointerStartRef = useRef<{ itemUid: string; clientX: number; clientY: number } | null>(null);
  const pointerCurrentRef = useRef<{ clientX: number; clientY: number } | null>(null);

  const activeBag = Array.isArray(bags) ? bags[0] : undefined; // Single bag system

  const activeDragItem = externalDragItem || dragItem;
  const activeHoverCell = externalHoverCell || hoverCell;

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
  }, [activeBag, gridW, gridH]);

  const updateHoverCell = useCallback((cell: { x: number; y: number } | null) => {
    setHoverCell((prev) => {
      // Avoid re-renders if cell hasn't changed
      if (prev === null && cell === null) return prev;
      if (prev && cell && prev.x === cell.x && prev.y === cell.y) return prev;
      
      // Call external callback only when changed
      onHoverCellChange?.(cell);
      return cell;
    });
  }, [onHoverCellChange]);

  const buildItemOccupancy = useCallback((excludeUid?: string) => {
    const grid: (string | null)[][] = Array.from({ length: gridH }, () => Array(gridW).fill(null));
    for (const item of items) {
      if (item.gridX < 0 || (excludeUid && item.uid === excludeUid)) continue;
      const w = item.gridW || 1;
      const h = item.gridH || 1;
      for (let r = item.gridY; r < item.gridY + h && r < gridH; r++) {
        for (let c = item.gridX; c < item.gridX + w && c < gridW; c++) {
          grid[r][c] = item.uid;
        }
      }
    }
    return grid;
  }, [items, gridW, gridH]);

  // Can place item: all cells must be on the bag AND not occupied by another item
  const canPlaceItem = useCallback((item: LooterItem, x: number, y: number, excludeUid?: string) => {
    const bagOcc = buildBagOccupancy();
    const itemOcc = buildItemOccupancy(excludeUid);
    const w = item.gridW || 1;
    const h = item.gridH || 1;
    if (x < 0 || y < 0 || x + w > gridW || y + h > gridH) return false;
    for (let r = y; r < y + h; r++) {
      for (let c = x; c < x + w; c++) {
        if (!bagOcc[r] || !bagOcc[r][c]) return false; // Not on the bag
        if (!itemOcc[r] || itemOcc[r][c] !== null) return false; // Overlap
      }
    }
    return true;
  }, [buildBagOccupancy, buildItemOccupancy, gridW, gridH]);

  // ==========================================
  // Drag Handlers
  // ==========================================
  const handleItemPointerDown = (e: React.PointerEvent, item: LooterItem, mode: DragMode) => {
    setPopupInfo(null);
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
    setDraggingItem(item);
    
    const itemRect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const offset = {
      x: Math.max(0, e.clientX - itemRect.left),
      y: Math.max(0, e.clientY - itemRect.top),
    };
    setDragOffset(offset);
    onDragStart?.(item, mode === 'item' ? 'inventory' : 'storage', offset);
    setIsItemDragging(true);
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
    
    setDragPos({ x: e.clientX - gridRect.left, y: e.clientY - gridRect.top, clientX: e.clientX, clientY: e.clientY });
  };

  const updateDragPosition = useCallback((clientX: number, clientY: number) => {
    if ((!dragMode || !dragItem) && !externalDragItem) return;
    const itemToMeasure = dragItem || externalDragItem;
    if (!itemToMeasure) return;

    const gridRect = gridRef.current?.getBoundingClientRect();
    const storageRect = storageRef.current?.getBoundingClientRect();
    const trashRect = trashRef.current?.getBoundingClientRect();
    
    // 1. Luôn cập nhật vị trí Ghost Item bất kể chuột đang ở đâu (Dùng tọa độ tuyệt đối)
    const relX = gridRect ? clientX - gridRect.left : 0;
    const relY = gridRect ? clientY - gridRect.top : 0;
    pointerCurrentRef.current = { clientX, clientY };
    setDragPos({ x: relX, y: relY, clientX, clientY });

    // 2. Chỉ tính toán ô xanh nếu Grid này hiện diện
    if (gridRect) {
      const isInsideGrid = clientX >= gridRect.left && clientX <= gridRect.right &&
                           clientY >= gridRect.top && clientY <= gridRect.bottom;
      const isInsideStorage = !hideStorage && storageRect && 
                              clientX >= storageRect.left && clientX <= storageRect.right &&
                              clientY >= storageRect.top && clientY <= storageRect.bottom;
      const isInsideTrash = trashRect &&
                            clientX >= trashRect.left && clientX <= trashRect.right &&
                            clientY >= trashRect.top && clientY <= trashRect.bottom;

      if (isInsideTrash) {
        updateHoverCell(null);
        setIsHoveringStorage(false);
        setIsHoveringSell(true);
      } else if (isInsideGrid) {
        const currentOffset = externalDragOffset || dragOffset;
        
        // Get scroll offset of the grid container if it exists
        const scrollContainer = gridRef.current?.parentElement;
        const scrollTop = scrollContainer?.scrollTop || 0;
        const scrollLeft = scrollContainer?.scrollLeft || 0;

        const topLeftX = relX - currentOffset.x + scrollLeft;
        const topLeftY = relY - currentOffset.y + scrollTop;
        
        updateHoverCell({
          x: Math.round(topLeftX / cellSize),
          y: Math.round(topLeftY / cellSize),
        });
        setIsHoveringStorage(false);
        setIsHoveringSell(false);
      } else if (isInsideStorage) {
        updateHoverCell(null);
        setIsHoveringStorage(true);
        setIsHoveringSell(false);
      } else {
        // Chuột nằm ngoài Grid này hoàn toàn
        if (hoverCell || isHoveringStorage || isHoveringSell) {
          updateHoverCell(null);
          setIsHoveringStorage(false);
          setIsHoveringSell(false);
        }
      }
    }
  }, [dragMode, dragItem, externalDragItem, cellSize, dragOffset.x, dragOffset.y, externalDragOffset, updateHoverCell, hideStorage, hoverCell, isHoveringStorage, isHoveringSell]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isItemDragging) {
      e.stopPropagation();
    }
    updateDragPosition(e.clientX, e.clientY);
  }, [updateDragPosition, isItemDragging]);

  const handlePointerUp = useCallback((e?: React.PointerEvent | PointerEvent) => {
    if ((!dragMode || !dragItem) && !externalDragItem) return;

    if (dragMode && dragItem) {
      if (e && 'currentTarget' in e && e.currentTarget) {
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture?.((e as any).pointerId);
        } catch {}
      }
    }

    const pointerStart = pointerStartRef.current;
    const pointerCurrent = pointerCurrentRef.current;
    const wasClick = !!pointerStart && pointerStart.itemUid === dragItem.uid &&
      !!pointerCurrent &&
      Math.abs(pointerCurrent.clientX - pointerStart.clientX) <= CLICK_MOVE_TOLERANCE &&
      Math.abs(pointerCurrent.clientY - pointerStart.clientY) <= CLICK_MOVE_TOLERANCE;

    if (wasClick) {
      onItemClick?.(dragItem);
      // Determine position for popup (to the right of the click)
      setPopupInfo({
        item: dragItem,
        x: pointerCurrent.clientX,
        y: pointerCurrent.clientY,
      });
    } else {
      if (isHoveringSell) {
        if (isLootGameMode) {
          // Discard items in Loot Mode
          const newItems = items.filter(i => i.uid !== dragItem.uid);
          saveInventory(newItems);
        } else {
          sellItems([dragItem.uid]);
        }
      } else if (dragMode && dragItem && hoverCell && canPlaceItem(dragItem, hoverCell.x, hoverCell.y, dragItem.uid)) {
        // Place on grid
        const newItems = items.map(i =>
          i.uid === dragItem.uid ? { ...i, gridX: hoverCell.x, gridY: hoverCell.y } : i
        );
        onItemLayoutChange?.(newItems);
      } else if (isHoveringStorage && !hideStorage) {
        if (dragMode === 'item') {
          // Move from grid to storage
          const newItems = items.map(i =>
            i.uid === dragItem.uid ? { ...i, gridX: -1, gridY: -1 } : i
          );
          onItemLayoutChange?.(newItems);
        } else if (dragMode === 'storage-item') {
          // Reorder storage: move to front
          const filtered = items.filter(i => i.uid !== dragItem.uid);
          const movingItem = items.find(i => i.uid === dragItem.uid);
          if (movingItem) {
            onItemLayoutChange?.([movingItem, ...filtered]);
          }
        } else if (externalDragItem) {
          // Drop external item into storage
          onExternalDrop?.(externalDragItem, -1, -1);
        }
      } else if (externalDragItem && hoverCell) {
        // Drop external item here
        onExternalDrop?.(externalDragItem, hoverCell.x, hoverCell.y);
      }
    }

    setDragMode(null);
    setDragItem(null);
    setDraggingItem(null);
    // Delay resetting isItemDragging to prevent "click-through" on mobile navigation
    setTimeout(() => {
      setIsItemDragging(false);
    }, 400);
    updateHoverCell(null);
    setIsHoveringStorage(false);
    setIsHoveringSell(false);
    pointerStartRef.current = null;
    pointerCurrentRef.current = null;
    onDragEnd?.();
  }, [dragMode, dragItem, externalDragItem, hoverCell, isHoveringStorage, isHoveringSell, items, canPlaceItem, onItemClick, onItemLayoutChange, hideStorage, updateHoverCell, onDragEnd, sellItems, onExternalDrop]);

  // Global mouse up to catch drops outside
  React.useEffect(() => {
    const handleGlobalMove = (e: PointerEvent) => {
      if (dragMode || externalDragItem) updateDragPosition(e.clientX, e.clientY);
    };
    const handleGlobalUp = (e: PointerEvent) => {
      if (dragMode || externalDragItem) handlePointerUp(e);
      // Close popup if clicked outside
      if (!dragMode && popupInfo) {
        setPopupInfo(null);
      }
    };
    window.addEventListener('pointermove', handleGlobalMove);
    window.addEventListener('pointerup', handleGlobalUp);
    return () => {
      window.removeEventListener('pointermove', handleGlobalMove);
      window.removeEventListener('pointerup', handleGlobalUp);
    };
  }, [dragMode, externalDragItem, handlePointerUp, updateDragPosition]);

  // ==========================================
  // Render Helpers
  // ==========================================
  const bagOcc = buildBagOccupancy();
  
  const highlightCells: { x: number; y: number; valid: boolean }[] = [];
  if (activeHoverCell && activeDragItem) {
    const w = activeDragItem.gridW || 1;
    const h = activeDragItem.gridH || 1;
    const valid = canPlaceItem(activeDragItem, activeHoverCell.x, activeHoverCell.y, activeDragItem.uid);
    for (let r = activeHoverCell.y; r < activeHoverCell.y + h; r++) {
      for (let c = activeHoverCell.x; c < activeHoverCell.x + w; c++) {
        highlightCells.push({ x: c, y: r, valid });
      }
    }
  }

  const gridItems = items.filter(i => i.gridX >= 0);
  const storageItems = items.filter(i => i.gridX < 0);

  return (
    <div 
      className="flex flex-col gap-4 select-none touch-none w-full" 
      onPointerMove={handlePointerMove}
    >
      {/* Container for scrollability */}
      <div className="w-full overflow-x-auto overflow-y-hidden subtle-scrollbar pb-1">
        <div
          ref={gridRef}
          className="relative rounded-lg overflow-hidden shrink-0 mx-auto bg-[#060d17]"
          style={{
            width: gridW * cellSize,
            height: gridH * cellSize,
            border: '2px solid rgba(30, 60, 90, 0.4)',
            touchAction: 'none',
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Layer 1: Background grid cells optimized with CSS */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(25, 45, 65, 0.2) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(25, 45, 65, 0.2) 1px, transparent 1px)
              `,
              backgroundSize: `${cellSize}px ${cellSize}px`,
            }}
          />
          
          {/* Layer 1.5: Out-of-bag cells darkening */}
          {Array.from({ length: gridH }).map((_, r) =>
            Array.from({ length: gridW }).map((_, c) => {
              if (bagOcc[r][c]) return null;
              return (
                <div
                  key={`bg-off-${r}-${c}`}
                  className="absolute"
                  style={{
                    left: c * cellSize,
                    top: r * cellSize,
                    width: cellSize,
                    height: cellSize,
                    background: 'rgba(8, 12, 20, 0.6)',
                  }}
                />
              );
            })
          )}

          {/* Layer 2: Bag active cells */}
          {activeBag && activeBag.gridX >= 0 && (() => {
            const w = activeBag.width;
            const h = activeBag.height;
            const shape = activeBag.shape || [];
            const bgColor = BAG_BG[activeBag.rarity] || BAG_BG.common;

            // Check if it's a solid rectangle to simplify rendering and avoid grid lines
            let isRect = true;
            for (let r = 0; r < h; r++) {
              for (let c = 0; c < w; c++) {
                if (!shape[r] || !shape[r][c]) { isRect = false; break; }
              }
              if (!isRect) break;
            }

            if (isRect) {
              return (
                <div
                  className="absolute rounded-lg"
                  style={{
                    left: activeBag.gridX * cellSize,
                    top: activeBag.gridY * cellSize,
                    width: w * cellSize,
                    height: h * cellSize,
                    background: bgColor,
                    border: '2px solid rgba(56, 189, 248, 0.3)',
                    boxShadow: 'inset 0 0 20px rgba(56, 189, 248, 0.1)',
                  }}
                />
              );
            }

            const bagCells = [];
            for (let r = 0; r < h; r++) {
              for (let c = 0; c < w; c++) {
                if (shape[r] && shape[r][c]) {
                  const x = activeBag.gridX + c;
                  const y = activeBag.gridY + r;
                  if (x < gridW && y < gridH) {
                    bagCells.push(
                      <div
                        key={`bag-${r}-${c}`}
                        className="absolute"
                        style={{
                          left: x * cellSize,
                          top: y * cellSize,
                          width: cellSize,
                          height: cellSize,
                          background: bgColor,
                          // Only show borders between non-adjacent cells or at edges
                          borderTop: (r === 0 || !shape[r - 1][c]) ? '1px solid rgba(56, 189, 248, 0.4)' : 'none',
                          borderLeft: (c === 0 || !shape[r][c - 1]) ? '1px solid rgba(56, 189, 248, 0.4)' : 'none',
                          borderBottom: (r === h - 1 || !shape[r + 1][c]) ? '1px solid rgba(56, 189, 248, 0.4)' : 'none',
                          borderRight: (c === w - 1 || !shape[r][c + 1]) ? '1px solid rgba(56, 189, 248, 0.4)' : 'none',
                        }}
                      />
                    );
                  }
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
            const w = item.gridW || 1;
            const h = item.gridH || 1;
            const isDragging = activeDragItem?.uid === item.uid && (dragMode === 'item' || externalDragItem);
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
        </div>
      </div>

      {/* Storage Area */}
      {!hideStorage && (
        <div 
          ref={storageRef}
          className={`relative min-h-[120px] bg-[#0d1a2a] border-2 rounded-lg p-3 transition-colors ${
            isHoveringStorage ? 'border-cyan-400 bg-[#122b46]' : 'border-cyan-800/50'
          }`}
        >
          <div
            ref={trashRef}
            className={`absolute bottom-2 right-2 z-20 flex h-10 w-10 items-center justify-center rounded-lg border-2 transition-transform ${
              isHoveringSell 
                ? `scale-125 border-${(isLootGameMode || isChallengeActive) ? 'red' : 'amber'}-400 bg-${(isLootGameMode || isChallengeActive) ? 'red' : 'amber'}-600 text-white shadow-lg shadow-${(isLootGameMode || isChallengeActive) ? 'red' : 'amber'}-900/40` 
                : `border-${(isLootGameMode || isChallengeActive) ? 'red' : 'amber'}-600/40 bg-${(isLootGameMode || isChallengeActive) ? 'red' : 'amber'}-950/50 text-${(isLootGameMode || isChallengeActive) ? 'red' : 'amber'}-200`
            }`}
          >
            {(isLootGameMode || isChallengeActive) ? <Trash2 className="h-5 w-5" /> : <DollarSign className="h-5 w-5" />}
          </div>
          <div className="mb-2 flex items-center justify-between pr-12">
            <p className="text-[10px] text-cyan-500/80 font-bold uppercase tracking-widest">
              Khu vực chờ
            </p>
            <span className="text-[9px] text-cyan-600">Kéo xuống để cất</span>
          </div>
          
          <div className="grid grid-cols-9 gap-1.5">
            {storageItems.map(item => {
              const isDragging = dragItem?.uid === item.uid && dragMode === 'storage-item';
              const colorClass = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
              
              return (
                <div
                  key={item.uid}
                  className={`aspect-square w-full rounded-md border-2 flex items-center justify-center cursor-grab active:cursor-grabbing ${colorClass} ${
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
               <div className="col-span-full flex items-center justify-center py-6 text-center text-xs italic text-slate-500">
                 Kho trống
               </div>
            )}
          </div>
        </div>
      )}
      
      {/* Smooth Drag Ghost (Rendered via Portal to avoid clipping and coordinate issues) */}
      {dragMode && dragItem && dragPos.clientX > 0 && createPortal(
        <div
          className={`fixed pointer-events-none rounded-md border-2 flex flex-col items-center justify-center shadow-2xl opacity-90 scale-110 ${RARITY_COLORS[dragItem.rarity] || RARITY_COLORS.common}`}
          style={{
            left: dragPos.clientX - dragOffset.x,
            top: dragPos.clientY - dragOffset.y,
            width: (dragItem.gridW || 1) * cellSize - 2,
            height: (dragItem.gridH || 1) * cellSize - 2,
            zIndex: 999999,
            transition: 'transform 0.1s ease-out',
          }}
        >
          <span className="text-3xl drop-shadow-2xl">{dragItem.icon}</span>
        </div>,
        document.body
      )}
      
      {/* Item Info Popup */}
      {popupInfo && (
        <div 
          className="fixed z-[10000] rounded-xl border border-cyan-500/50 bg-[#08131d]/95 backdrop-blur-md p-3 shadow-2xl pointer-events-none transform -translate-y-1/2"
          style={{ 
            left: popupInfo.x > window.innerWidth / 2 ? 'auto' : popupInfo.x + 20,
            right: popupInfo.x > window.innerWidth / 2 ? window.innerWidth - popupInfo.x + 20 : 'auto',
            top: popupInfo.y, 
            minWidth: '160px',
            maxWidth: '220px'
          }}
        >
          <div className="flex items-center gap-2 border-b border-white/10 pb-2 mb-2">
            <span className="text-2xl drop-shadow-md">{popupInfo.item.icon}</span>
            <div className="flex-1">
              <h3 className={`text-sm font-bold truncate max-w-[120px] ${popupInfo.item.rarity === 'legendary' ? 'text-purple-400' : popupInfo.item.rarity === 'rare' ? 'text-amber-400' : popupInfo.item.rarity === 'uncommon' ? 'text-emerald-400' : 'text-sky-400'}`}>
                {popupInfo.item.name}
              </h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">{popupInfo.item.rarity}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {popupInfo.item.weight > 0 && <div className="flex justify-between text-xs"><span className="text-gray-400">Sát thương</span><span className="font-bold text-orange-400">{popupInfo.item.weight}</span></div>}
            {popupInfo.item.hpBonus > 0 && <div className="flex justify-between text-xs"><span className="text-gray-400">Máu tối đa</span><span className="font-bold text-red-400">+{popupInfo.item.hpBonus}</span></div>}
            {popupInfo.item.energyMax > 0 && <div className="flex justify-between text-xs"><span className="text-gray-400">Năng lượng</span><span className="font-bold text-blue-400">+{popupInfo.item.energyMax}</span></div>}
            {popupInfo.item.energyRegen > 0 && <div className="flex justify-between text-xs"><span className="text-gray-400">Hồi năng lượng</span><span className="font-bold text-cyan-400">+{popupInfo.item.energyRegen}</span></div>}
            {popupInfo.item.price > 0 && <div className="flex justify-between text-xs"><span className="text-gray-400">Giá bán</span><span className="font-bold text-amber-400">{popupInfo.item.price} vàng</span></div>}
            <div className="flex justify-between text-xs"><span className="text-gray-400">Kích thước</span><span className="font-bold text-gray-300">{popupInfo.item.gridW || 1}x{popupInfo.item.gridH || 1}</span></div>
          </div>
          {/* Quick Sell Button for Mobile */}
          <button
             onPointerDown={(e) => {
               e.stopPropagation();
               const isTrash = isLootGameMode || isChallengeActive;
               if (isTrash) {
                 const newItems = items.filter(i => i.uid !== popupInfo.item.uid);
                 saveInventory(newItems);
               } else {
                 sellItems([popupInfo.item.uid]);
               }
               setPopupInfo(null);
             }}
             className={`w-full mt-3 py-2 ${(isLootGameMode || isChallengeActive) ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-600 hover:bg-amber-500'} text-white text-[10px] font-black rounded-lg transition-colors uppercase tracking-widest flex items-center justify-center gap-1.5`}
          >
            {(isLootGameMode || isChallengeActive) ? <Trash2 className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
            {(isLootGameMode || isChallengeActive) ? 'Vứt bỏ' : 'Bán nhanh'}
          </button>
        </div>
      )}

    </div>
  );
};

export default InventoryGrid;

