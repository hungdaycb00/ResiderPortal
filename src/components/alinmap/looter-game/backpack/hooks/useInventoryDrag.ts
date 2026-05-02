import { useState, useCallback, useRef } from 'react';
import type { LooterItem, BagItem } from '../types';

interface UseInventoryDragProps {
  items: LooterItem[];
  cellSize: number;
  gridW: number;
  gridH: number;
  activeBag?: BagItem;
  onItemLayoutChange?: (items: LooterItem[]) => void;
  onDropOutside?: (item: LooterItem) => void;
  onDragStart?: (item: LooterItem, source: any, offset: any) => void;
  onDragEnd?: () => void;
  onHoverCellChange?: (cell: { x: number; y: number } | null) => void;
  dragSource?: any;
}

export function useInventoryDrag({
  items,
  cellSize,
  gridW,
  gridH,
  activeBag,
  onItemLayoutChange,
  onDropOutside,
  onDragStart,
  onDragEnd,
  onHoverCellChange,
  dragSource = 'inventory',
}: UseInventoryDragProps) {
  const [draggingItem, setDraggingItem] = useState<LooterItem | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragGridPos, setDragGridPos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const isItemInBag = useCallback((item: LooterItem, gx: number, gy: number) => {
    if (!activeBag) return true;
    const w = item.gridW || 1;
    const h = item.gridH || 1;
    const shape = item.shape;

    const bagX = activeBag.gridX;
    const bagY = activeBag.gridY;
    const bagW = activeBag.width;
    const bagH = activeBag.height;
    const bagShape = activeBag.shape || [];

    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (!shape || shape[r][c]) {
          const tx = gx + c;
          const ty = gy + r;
          
          const relX = tx - bagX;
          const relY = ty - bagY;

          if (relX < 0 || relX >= bagW || relY < 0 || relY >= bagH) return false;
          if (!bagShape[relY] || !bagShape[relY][relX]) return false;
        }
      }
    }
    return true;
  }, [activeBag]);

  const checkOverlap = useCallback((item: LooterItem, gridX: number, gridY: number, currentItems: LooterItem[]) => {
    const w = item.gridW || 1;
    const h = item.gridH || 1;
    const shape = item.shape;

    // 1. Boundary check
    if (gridX < 0 || gridY < 0 || gridX + w > gridW || gridY + h > gridH) return true;

    // 2. Bag shape check
    if (!isItemInBag(item, gridX, gridY)) return true;

    // 3. Overlap with other items check
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
  }, [activeBag, gridW, gridH, isItemInBag]);

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

    // Notify external
    onDragStart?.(item, dragSource, { x: itemW / 2, y: itemH / 2 });
  }, [cellSize, onDragStart, dragSource]);

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
    onHoverCellChange?.({ x: gx, y: gy });
  }, [draggingItem, cellSize, onHoverCellChange]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!draggingItem) return;

    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const isOutside = e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
      
      if (isOutside) {
        onDropOutside?.(draggingItem);
        setDraggingItem(null);
        setDragGridPos(null);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        return;
      }
    }

    const gx = dragGridPos?.x ?? draggingItem.gridX;
    const gy = dragGridPos?.y ?? draggingItem.gridY;

    // 1. Kiểm tra xem có bị chồng lấp vật phẩm khác không
    if (checkOverlap(draggingItem, gx, gy, items)) {
      // Chồng lấp hoặc ra ngoài biên toàn cục -> Quay về vị trí cũ
      setDraggingItem(null);
      setDragGridPos(null);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      return;
    }

    // 2. Kiểm tra xem có nằm trong Balo active không
    if (!isItemInBag(draggingItem, gx, gy)) {
      // Nằm trong grid nhưng KHÔNG nằm trong balo -> Vứt ra ngoài (Drop to map)
      onDropOutside?.(draggingItem);
    } else {
      // Hợp lệ -> Lưu vị trí mới
      const newItems = items.map((i) => 
        i.uid === draggingItem.uid ? { ...i, gridX: gx, gridY: gy } : i
      );
      onItemLayoutChange?.(newItems);
    }

    setDraggingItem(null);
    setDragGridPos(null);
    onDragEnd?.();
    onHoverCellChange?.(null);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, [draggingItem, dragGridPos, items, checkOverlap, isItemInBag, onItemLayoutChange, onDropOutside, onDragEnd, onHoverCellChange]);

  return {
    draggingItem,
    dragPos,
    dragGridPos,
    containerRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    checkOverlap, // Trả về hàm 4 tham số gốc
    isInvalidPosition: (gx: number, gy: number) => draggingItem ? checkOverlap(draggingItem, gx, gy, items) : false
  };
}
