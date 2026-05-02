import { useState, useCallback, useRef } from 'react';
import type { LooterItem, BagItem } from '../types';
import { isItemInBag } from '../../engine/utils';

interface UseInventoryDragProps {
  items: LooterItem[];
  cellSize: number;
  gridW: number;
  gridH: number;
  activeBag?: BagItem;
  onItemLayoutChange?: (items: LooterItem[]) => void;
  onDropOutside?: (item: LooterItem) => void;
}

export function useInventoryDrag({
  items,
  cellSize,
  gridW,
  gridH,
  activeBag,
  onItemLayoutChange,
  onDropOutside,
}: UseInventoryDragProps) {
  const [draggingItem, setDraggingItem] = useState<LooterItem | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragGridPos, setDragGridPos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const isItemTouchingBag = useCallback((item: LooterItem, gx: number, gy: number, bag: BagItem) => {
    const w = item.gridW || 1;
    const h = item.gridH || 1;
    const bagW = bag.width;
    const bagH = bag.height;

    if (gx + w <= bag.gridX) return false;
    if (gy + h <= bag.gridY) return false;
    if (gx >= bag.gridX + bagW) return false;
    if (gy >= bag.gridY + bagH) return false;

    return true;
  }, []);

  const isItemCompletelyInBag = useCallback((item: LooterItem, gx: number, gy: number, bag: BagItem) => {
    const w = item.gridW || 1;
    const h = item.gridH || 1;
    const shape = item.shape;
    const bagShape = bag.shape;

    if (gx < bag.gridX || gy < bag.gridY || gx + w > bag.gridX + bag.width || gy + h > bag.gridY + bag.height) {
      return false;
    }

    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (!shape || shape[r][c]) {
          const bagR = gy + r - bag.gridY;
          const bagC = gx + c - bag.gridX;
          
          if (bagShape && (!bagShape[bagR] || !bagShape[bagR][bagC])) {
            return false;
          }
        }
      }
    }

    return true;
  }, []);

  const checkOverlap = useCallback((item: LooterItem, gridX: number, gridY: number, currentItems: LooterItem[]) => {
    const w = item.gridW || 1;
    const h = item.gridH || 1;
    const shape = item.shape;

    // 1. Boundary check
    if (gridX < 0 || gridY < 0 || gridX + w > gridW || gridY + h > gridH) return true;

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
  }, [gridW, gridH]);

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

    let finalGx = gx;
    let finalGy = gy;

    // 2. Kiểm tra balo active
    if (activeBag && isItemTouchingBag(draggingItem, gx, gy, activeBag)) {
      if (!isItemCompletelyInBag(draggingItem, gx, gy, activeBag)) {
        // Nếu chạm balo nhưng không lọt thỏm -> văng ra ngoài
        finalGx = -1;
        finalGy = -1;
      }
    }

    // Hợp lệ -> Lưu vị trí mới (kể cả ngoài balo)
    const newItems = items.map((i) => 
      i.uid === draggingItem.uid ? { ...i, gridX: finalGx, gridY: finalGy } : i
    );
    onItemLayoutChange?.(newItems);

    setDraggingItem(null);
    setDragGridPos(null);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, [draggingItem, dragGridPos, items, checkOverlap, onItemLayoutChange, onDropOutside]);

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
