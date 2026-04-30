import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import type { LooterItem, BagItem } from './types';
import { useLooterState, useLooterActions } from '../LooterGameContext';
import { MAX_GRID_W, MAX_GRID_H } from './constants';

interface InventoryGridProps {
  items: LooterItem[];
  bags: BagItem[];
  readOnly?: boolean;
  onItemLayoutChange?: (items: LooterItem[]) => void;
  onItemDoubleClick?: (item: LooterItem) => void;
  onItemClick?: (item: LooterItem) => void;
  cellSize?: number;
  gridW?: number;
  gridH?: number;
  onHoverCellChange?: (cell: { x: number; y: number } | null) => void;
  onDragStart?: (item: LooterItem, source: 'inventory', offset: { x: number; y: number }) => void;
  onDragEnd?: () => void;
  externalDragItem?: LooterItem | null;
  externalDragOffset?: { x: number; y: number } | null;
  externalHoverCell?: { x: number; y: number } | null;
}

const RARITY_COLORS: Record<string, string> = {
  common: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
  uncommon: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  rare: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  legendary: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
};

const BAG_BG: Record<string, string> = {
  common: 'rgba(56, 189, 248, 0.05)',
  uncommon: 'rgba(52, 211, 153, 0.05)',
  rare: 'rgba(251, 191, 36, 0.05)',
  legendary: 'rgba(192, 132, 252, 0.05)',
};

const CLICK_MOVE_TOLERANCE = 8;

const InventoryGrid: React.FC<InventoryGridProps> = ({
  items, bags, readOnly = false,
  onItemLayoutChange,
  onItemDoubleClick,
  onItemClick,
  cellSize = 40,
  gridW = MAX_GRID_W,
  gridH = MAX_GRID_H,
  onHoverCellChange,
  onDragStart,
  onDragEnd,
  externalDragItem,
  externalDragOffset,
  externalHoverCell,
}) => {
  const { isItemDragging } = useLooterState();
  const { setDraggingItem, setIsItemDragging, dropItem: looterDropItem } = useLooterActions();
  const [dragItem, setDragItem] = useState<LooterItem | null>(null);
  
  const handleDropItem = useCallback((uid: string) => {
    if (typeof looterDropItem === 'function') {
      looterDropItem(uid);
    }
  }, [looterDropItem]);

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState({ x: 0, y: 0, clientX: 0, clientY: 0 });
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const [popupInfo, setPopupInfo] = useState<{ item: LooterItem; x: number; y: number } | null>(null);
  
  const gridRef = useRef<HTMLDivElement>(null);
  const pointerStartRef = useRef<{ itemUid: string; clientX: number; clientY: number } | null>(null);
  const pointerCurrentRef = useRef<{ clientX: number; clientY: number } | null>(null);

  const activeBag = Array.isArray(bags) ? bags[0] : undefined;
  const activeDragItem = externalDragItem || dragItem;
  const activeHoverCell = externalHoverCell || hoverCell;

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

  const buildItemOccupancy = useCallback((excludeUid?: string) => {
    const grid: (string | null)[][] = Array.from({ length: gridH }, () => Array(gridW).fill(null));
    for (const item of items) {
      if (item.gridX < 0 || (excludeUid && item.uid === excludeUid)) continue;
      const w = item.gridW || 1;
      const h = item.gridH || 1;
      const shape = item.shape;

      for (let r = 0; r < h && (item.gridY + r) < gridH; r++) {
        for (let c = 0; c < w && (item.gridX + c) < gridW; c++) {
          if (!shape || (shape[r] && shape[r][c])) {
            grid[item.gridY + r][item.gridX + c] = item.uid;
          }
        }
      }
    }
    return grid;
  }, [items, gridW, gridH]);

  const canPlaceItem = useCallback((item: LooterItem, x: number, y: number, excludeUid?: string) => {
    const bagOcc = buildBagOccupancy();
    const itemOcc = buildItemOccupancy(excludeUid);
    const w = item.gridW || 1;
    const h = item.gridH || 1;
    const shape = item.shape;

    if (x < 0 || y < 0 || x + w > gridW || y + h > gridH) return false;
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (!shape || (shape[r] && shape[r][c])) {
          const gridR = y + r;
          const gridC = x + c;
          if (!bagOcc[gridR] || !bagOcc[gridR][gridC]) return false;
          if (!itemOcc[gridR] || itemOcc[gridR][gridC] !== null) return false;
        }
      }
    }
    return true;
  }, [buildBagOccupancy, buildItemOccupancy, gridW, gridH]);

  const updateDragPosition = useCallback((clientX: number, clientY: number) => {
    if (!dragItem && !externalDragItem) return;
    const gridRect = gridRef.current?.getBoundingClientRect();
    const relX = gridRect ? clientX - gridRect.left : 0;
    const relY = gridRect ? clientY - gridRect.top : 0;
    pointerCurrentRef.current = { clientX, clientY };
    setDragPos({ x: relX, y: relY, clientX, clientY });

    if (gridRect) {
      const isInsideGrid = clientX >= gridRect.left && clientX <= gridRect.right &&
                           clientY >= gridRect.top && clientY <= gridRect.bottom;
      if (isInsideGrid) {
        const currentOffset = externalDragOffset || dragOffset;
        const topLeftX = relX - currentOffset.x;
        const topLeftY = relY - currentOffset.y;
        const newCell = { x: Math.round(topLeftX / cellSize), y: Math.round(topLeftY / cellSize) };
        if (!hoverCell || hoverCell.x !== newCell.x || hoverCell.y !== newCell.y) {
          setHoverCell(newCell);
          onHoverCellChange?.(newCell);
        }
      } else {
        if (hoverCell) {
          setHoverCell(null);
          onHoverCellChange?.(null);
        }
      }
    }
  }, [dragItem, externalDragItem, cellSize, dragOffset, externalDragOffset, hoverCell, onHoverCellChange]);

  const handleItemPointerDown = (e: React.PointerEvent, item: LooterItem) => {
    setPopupInfo(null);
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    
    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) return;
    
    setDragItem(item);
    setDraggingItem(item);
    
    const itemRect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const offset = {
      x: Math.max(0, e.clientX - itemRect.left),
      y: Math.max(0, e.clientY - itemRect.top),
    };
    setDragOffset(offset);
    onDragStart?.(item, 'inventory', offset);
    setIsItemDragging(true);
    pointerStartRef.current = { itemUid: item.uid, clientX: e.clientX, clientY: e.clientY };
    pointerCurrentRef.current = { clientX: e.clientX, clientY: e.clientY };
    try { (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId); } catch {}
    setDragPos({ x: e.clientX - gridRect.left, y: e.clientY - gridRect.top, clientX: e.clientX, clientY: e.clientY });
  };

  const handlePointerUp = useCallback((e?: React.PointerEvent | PointerEvent) => {
    if (!dragItem && !externalDragItem) return;

    if (dragItem && e && 'currentTarget' in e && e.currentTarget) {
      try { (e.currentTarget as HTMLElement).releasePointerCapture?.((e as any).pointerId); } catch {}
    }

    const pointerStart = pointerStartRef.current;
    const pointerCurrent = pointerCurrentRef.current;
    const wasClick = !!pointerStart && pointerStart.itemUid === dragItem?.uid &&
      !!pointerCurrent &&
      Math.abs(pointerCurrent.clientX - pointerStart.clientX) <= CLICK_MOVE_TOLERANCE &&
      Math.abs(pointerCurrent.clientY - pointerStart.clientY) <= CLICK_MOVE_TOLERANCE;

    if (wasClick && dragItem) {
      onItemClick?.(dragItem);
      setPopupInfo({ item: dragItem, x: pointerCurrent.clientX, y: pointerCurrent.clientY });
    } else if (dragItem) {
      if (hoverCell && canPlaceItem(dragItem, hoverCell.x, hoverCell.y, dragItem.uid)) {
        const newItems = items.map(i => i.uid === dragItem.uid ? { ...i, gridX: hoverCell.x, gridY: hoverCell.y } : i);
        onItemLayoutChange?.(newItems);
      } else {
        const gridRect = gridRef.current?.getBoundingClientRect();
        if (gridRect && pointerCurrent) {
          const isOutside = pointerCurrent.clientX < gridRect.left || pointerCurrent.clientX > gridRect.right ||
                            pointerCurrent.clientY < gridRect.top || pointerCurrent.clientY > gridRect.bottom;
          if (!isOutside) {
            const newItems = items.map(i => {
              if (i.uid === dragItem.uid) {
                return {
                  ...i,
                  gridX: -1,
                  gridY: -1,
                  stagingX: dragPos.x - dragOffset.x,
                  stagingY: dragPos.y - dragOffset.y
                };
              }
              return i;
            });
            onItemLayoutChange?.(newItems);
          } else {
            handleDropItem(dragItem.uid);
          }
        }
      }
    }

    setDragItem(null);
    setDraggingItem(null);
    setTimeout(() => setIsItemDragging(false), 400);
    setHoverCell(null);
    onHoverCellChange?.(null);
    pointerStartRef.current = null;
    pointerCurrentRef.current = null;
    onDragEnd?.();
  }, [dragItem, externalDragItem, hoverCell, items, canPlaceItem, onItemClick, onItemLayoutChange, onHoverCellChange, onDragEnd, handleDropItem, setDraggingItem, setIsItemDragging, dragPos, dragOffset]);

  React.useEffect(() => {
    const handleGlobalMove = (e: PointerEvent) => { if (dragItem || externalDragItem) updateDragPosition(e.clientX, e.clientY); };
    const handleGlobalUp = (e: PointerEvent) => { if (dragItem || externalDragItem) handlePointerUp(e); if (!dragItem && popupInfo) setPopupInfo(null); };
    window.addEventListener('pointermove', handleGlobalMove);
    window.addEventListener('pointerup', handleGlobalUp);
    return () => { window.removeEventListener('pointermove', handleGlobalMove); window.removeEventListener('pointerup', handleGlobalUp); };
  }, [dragItem, externalDragItem, handlePointerUp, updateDragPosition, popupInfo]);

  const bagOcc = buildBagOccupancy();
  const highlightCells: { x: number; y: number; valid: boolean }[] = [];
  if (activeHoverCell && activeDragItem) {
    const w = activeDragItem.gridW || 1;
    const h = activeDragItem.gridH || 1;
    const shape = activeDragItem.shape;
    const valid = canPlaceItem(activeDragItem, activeHoverCell.x, activeHoverCell.y, activeDragItem.uid);
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (!shape || (shape[r] && shape[r][c])) {
          highlightCells.push({ x: activeHoverCell.x + c, y: activeHoverCell.y + r, valid });
        }
      }
    }
  }

  const gridItems = items.filter(i => i.gridX >= 0);
  const stagingItems = items.filter(i => i.gridX < 0);

  return (
    <div className="flex flex-col gap-4 select-none touch-none w-full h-full relative" onPointerMove={(e) => { if (isItemDragging) e.stopPropagation(); updateDragPosition(e.clientX, e.clientY); }}>
       {stagingItems.map((item) => (
         <motion.div
           key={item.uid}
           className={`absolute z-20 cursor-grab active:cursor-grabbing ${activeDragItem?.uid === item.uid ? 'opacity-20' : ''}`}
           style={{ 
             left: (item as any).stagingX ?? (Math.random() * 50), 
             top: (item as any).stagingY ?? (Math.random() * 50), 
             width: (item.gridW || 1) * cellSize, 
             height: (item.gridH || 1) * cellSize 
           }}
           onPointerDown={(e) => handleItemPointerDown(e, item)}
           onDoubleClick={() => onItemDoubleClick?.(item)}
         >
           {Array.from({ length: item.gridH || 1 }).map((_, r) => Array.from({ length: item.gridW || 1 }).map((_, c) => {
             if (item.shape && (!item.shape[r] || !item.shape[r][c])) return null;
             const isMain = (!item.shape && r === 0 && c === 0) || (item.shape && r === item.shape.findIndex(row => row.includes(1 || true)) && c === item.shape[r].indexOf(1 || true));
             return (
               <div key={`${r}-${c}`} className={`absolute border-[1.5px] rounded-lg flex items-center justify-center ${RARITY_COLORS[item.rarity] || RARITY_COLORS.common}`} style={{ left: c * cellSize + 1, top: r * cellSize + 1, width: cellSize - 2, height: cellSize - 2 }}>
                 {isMain && <span className="text-xl drop-shadow-md">{item.icon}</span>}
               </div>
             );
           }))}
         </motion.div>
       ))}

      <div className="w-full h-full flex items-center justify-center pointer-events-none">
        <div
          ref={gridRef}
          className="pointer-events-auto relative rounded-[32px] overflow-hidden shrink-0 mx-auto bg-[#040911] border-2 border-white/5"
          style={{ width: gridW * cellSize, height: gridH * cellSize, touchAction: 'none' }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)`, backgroundSize: `${cellSize}px ${cellSize}px` }} />
          {Array.from({ length: gridH }).map((_, r) => Array.from({ length: gridW }).map((_, c) => !bagOcc[r][c] && (
            <div key={`${r}-${c}`} className="absolute" style={{ left: c * cellSize, top: r * cellSize, width: cellSize, height: cellSize, background: 'rgba(0,0,0,0.4)' }} />
          )))}
          {activeBag && activeBag.gridX >= 0 && (
            <div className="absolute rounded-xl border-2 border-cyan-500/10" style={{ left: activeBag.gridX * cellSize + 2, top: activeBag.gridY * cellSize + 2, width: activeBag.width * cellSize - 4, height: activeBag.height * cellSize - 4, background: BAG_BG[activeBag.rarity] || BAG_BG.common }} />
          )}
          {highlightCells.map(({ x, y, valid }) => (
            <div key={`hl-${x}-${y}`} className={`absolute z-10 pointer-events-none ${valid ? 'bg-emerald-400/20' : 'bg-red-400/20'}`} style={{ left: x * cellSize, top: y * cellSize, width: cellSize, height: cellSize }} />
          ))}
          {gridItems.map((item) => (
            <motion.div
              key={item.uid}
              className={`absolute z-20 cursor-grab active:cursor-grabbing ${activeDragItem?.uid === item.uid ? 'opacity-20' : ''}`}
              style={{ left: item.gridX * cellSize, top: item.gridY * cellSize, width: (item.gridW || 1) * cellSize, height: (item.gridH || 1) * cellSize }}
              onPointerDown={(e) => handleItemPointerDown(e, item)}
              onDoubleClick={() => onItemDoubleClick?.(item)}
            >
              {Array.from({ length: item.gridH || 1 }).map((_, r) => Array.from({ length: item.gridW || 1 }).map((_, c) => {
                if (item.shape && (!item.shape[r] || !item.shape[r][c])) return null;
                const isMain = (!item.shape && r === 0 && c === 0) || (item.shape && r === item.shape.findIndex(row => row.includes(1 || true)) && c === item.shape[r].indexOf(1 || true));
                return (
                  <div key={`${r}-${c}`} className={`absolute border-[1.5px] rounded-lg flex items-center justify-center ${RARITY_COLORS[item.rarity] || RARITY_COLORS.common}`} style={{ left: c * cellSize + 1, top: r * cellSize + 1, width: cellSize - 2, height: cellSize - 2 }}>
                    {isMain && <span className="text-xl drop-shadow-md">{item.icon}</span>}
                  </div>
                );
              }))}
            </motion.div>
          ))}
        </div>
      </div>

      {dragItem && createPortal(
        <div className="fixed pointer-events-none z-[999999] opacity-90 scale-110 shadow-2xl" style={{ left: dragPos.clientX - dragOffset.x, top: dragPos.clientY - dragOffset.y, width: (dragItem.gridW || 1) * cellSize, height: (dragItem.gridH || 1) * cellSize }}>
          {Array.from({ length: dragItem.gridH || 1 }).map((_, r) => Array.from({ length: dragItem.gridW || 1 }).map((_, c) => {
            if (dragItem.shape && (!dragItem.shape[r] || !dragItem.shape[r][c])) return null;
            const isMain = (!dragItem.shape && r === 0 && c === 0) || (dragItem.shape && r === dragItem.shape.findIndex(row => row.includes(1 || true)) && c === dragItem.shape[r].indexOf(1 || true));
            return (
              <div key={`${r}-${c}`} className={`absolute border-2 rounded-lg flex items-center justify-center ${RARITY_COLORS[dragItem.rarity] || RARITY_COLORS.common}`} style={{ left: c * cellSize + 1, top: r * cellSize + 1, width: cellSize - 2, height: cellSize - 2 }}>
                {isMain && <span className="text-3xl drop-shadow-2xl">{dragItem.icon}</span>}
              </div>
            );
          }))}
        </div>,
        document.body
      )}

      {popupInfo && (
        <div className="fixed z-[10000] rounded-2xl border border-white/10 bg-[#08131d]/90 backdrop-blur-xl p-4 shadow-2xl pointer-events-auto transform -translate-y-1/2" style={{ left: popupInfo.x > window.innerWidth / 2 ? 'auto' : popupInfo.x + 20, right: popupInfo.x > window.innerWidth / 2 ? window.innerWidth - popupInfo.x + 20 : 'auto', top: popupInfo.y, minWidth: '180px' }}>
          <div className="flex items-center gap-3 border-b border-white/5 pb-3 mb-3">
            <span className="text-3xl drop-shadow-md">{popupInfo.item.icon}</span>
            <div><h3 className={`text-sm font-black uppercase ${popupInfo.item.rarity === 'legendary' ? 'text-purple-400' : 'text-cyan-400'}`}>{popupInfo.item.name}</h3><p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{popupInfo.item.rarity}</p></div>
          </div>
          <div className="space-y-1.5 mb-4 text-[10px]">
             {popupInfo.item.weight > 0 && <div className="flex justify-between"><span className="text-gray-500 font-bold uppercase">Sát thương</span><span className="font-black text-orange-400">{popupInfo.item.weight}</span></div>}
             {popupInfo.item.price > 0 && <div className="flex justify-between"><span className="text-gray-500 font-bold uppercase">Giá bán</span><span className="font-black text-amber-400">{popupInfo.item.price}</span></div>}
          </div>
          <button onClick={() => { handleDropItem(popupInfo.item.uid); setPopupInfo(null); }} className="w-full py-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-red-500/20"><Trash2 className="w-3.5 h-3.5" /> Ném ra biển</button>
        </div>
      )}
    </div>
  );
};

export default InventoryGrid;
