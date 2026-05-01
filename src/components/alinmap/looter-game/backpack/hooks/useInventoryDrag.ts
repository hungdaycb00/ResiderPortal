import { useState, useCallback, useRef } from 'react';
import type { LooterItem, BagItem } from '../types';

interface UseInventoryDragProps {
  items: LooterItem[];
  cellSize: number;
  gridW: number;
  gridH: number;
  activeBag?: BagItem;
  onItemLayoutChange?: (items: LooterItem[]) => void;
}

export function useInventoryDrag({
  items,
  cellSize,
  gridW,
  gridH,
  activeBag,
  onItemLayoutChange,
}: UseInventoryDragProps) {
  const [draggingItem, setDraggingItem] = useState<LooterItem | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragGridPos, setDragGridPos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const checkOverlap = useCallback((item: LooterItem, gridX: number, gridY: number, currentItems: LooterItem[]) => {
    const w = item.gridW || 1;
    const h = item.gridH || 1;
    const shape = item.shape;

    // Boundary check
    if (gridX < 0 || gridY < 0 || gridX + w > gridW || gridY + h > gridH) return true;

    // Bag occupancy check (if applicable)
    if (activeBag) {
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          if (!shape || shape[r][c]) {
            const bx = gridX + c - activeBag.gridX;
            const by = gridY + r - activeBag.gridY;
            if (bx < 0 || by < 0 || bx >= activeBag.width || by >= activeBag.height || !activeBag.shape[by][bx]) {
              return true;
            }
          }
        }
      }
    }

    // Overlap with other items check
    return currentItems.some((other) => {
      if (other.uid === item.uid || other.gridX < 0) return false;
      const ow = other.gridW || 1;
      const oh = other.gridH || 1;
      const oshape = other.shape;

      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          if (!shape || shape[r][c]) {
            const tx = gridX + c;
            const ty = gridY + r;
            if (tx >= other.gridX && tx < other.gridX + ow && ty >= other.gridY && ty < other.gridY + oh) {
              if (!oshape || oshape[ty - other.gridY][tx - other.gridX]) return true;
            }
          }
        }
      }
      return false;
    });
  }, [activeBag, gridW, gridH]);

  const onPointerDown = useCallback((e: React.PointerEvent, item: LooterItem) => {
    if (e.button !== 0) return; // Only left click
    
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const itemW = (item.gridW || 1) * cellSize;
    const itemH = (item.gridH || 1) * cellSize;

    // Centering requirement: Item center is at pointer position
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    setDraggingItem(item);
    setDragPos({ x: startX - itemW / 2, y: startY - itemH / 2 });
    
    // Initial snap position
    const gx = Math.round((startX - itemW / 2) / cellSize);
    const gy = Math.round((startY - itemH / 2) / cellSize);
    setDragGridPos({ x: gx, y: gy });

    // Lock pointer for movement tracking
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [cellSize]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingItem || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const itemW = (draggingItem.gridW || 1) * cellSize;
    const itemH = (draggingItem.gridH || 1) * cellSize;

    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const newX = currentX - itemW / 2;
    const newY = currentY - itemH / 2;

    setDragPos({ x: newX, y: newY });

    const gx = Math.round(newX / cellSize);
    const gy = Math.round(newY / cellSize);
    
    setDragGridPos({ x: gx, y: gy });
  }, [draggingItem, cellSize]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!draggingItem) return;

    const gx = dragGridPos?.x ?? draggingItem.gridX;
    const gy = dragGridPos?.y ?? draggingItem.gridY;

    if (!checkOverlap(draggingItem, gx, gy, items)) {
      // Valid placement
      const newItems = items.map((i) => 
        i.uid === draggingItem.uid ? { ...i, gridX: gx, gridY: gy } : i
      );
      onItemLayoutChange?.(newItems);
    }

    setDraggingItem(null);
    setDragGridPos(null);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, [draggingItem, dragGridPos, items, checkOverlap, onItemLayoutChange]);

  return {
    draggingItem,
    dragPos,
    dragGridPos,
    containerRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    checkOverlap: (gx: number, gy: number) => draggingItem ? checkOverlap(draggingItem, gx, gy, items) : false
  };
}
