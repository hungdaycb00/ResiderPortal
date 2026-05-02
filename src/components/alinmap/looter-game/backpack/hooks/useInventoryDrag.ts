import { useState, useCallback, useRef, useEffect } from 'react';
import type { LooterItem, BagItem } from '../types';
import { isItemInBag } from '../../engine/utils';

interface UseInventoryDragProps {
  items: LooterItem[];
  cellSize: number;
  gridW: number;
  gridH: number;
  activeBag?: BagItem;
  onItemLayoutChange?: (items: LooterItem[]) => void;
  onDropOutside?: (item: LooterItem, e?: PointerEvent | React.PointerEvent) => void;
  onEquipBag?: (itemUid: string) => void;
}

export function useInventoryDrag({
  items,
  cellSize,
  gridW,
  gridH,
  activeBag,
  onItemLayoutChange,
  onDropOutside,
  onEquipBag,
}: UseInventoryDragProps) {
  const [draggingItem, setDraggingItem] = useState<LooterItem | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragClientPos, setDragClientPos] = useState({ x: 0, y: 0 });
  const [dragGridPos, setDragGridPos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const isItemTouchingBag = useCallback((item: LooterItem, gx: number, gy: number, bag: BagItem) => {
    const isBag = (item as any).type === 'bag';
    const w = item.gridW || (isBag ? 1 : (item as any).width) || 1;
    const h = item.gridH || (isBag ? 1 : (item as any).height) || 1;
    const bagW = bag.width;
    const bagH = bag.height;

    if (gx + w <= bag.gridX) return false;
    if (gy + h <= bag.gridY) return false;
    if (gx >= bag.gridX + bagW) return false;
    if (gy >= bag.gridY + bagH) return false;

    return true;
  }, []);

  const isItemCompletelyInBag = useCallback((item: LooterItem, gx: number, gy: number, bag: BagItem) => {
    const isBag = (item as any).type === 'bag';
    const w = item.gridW || (isBag ? 1 : (item as any).width) || 1;
    const h = item.gridH || (isBag ? 1 : (item as any).height) || 1;
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
    const isBag = (item as any).type === 'bag';
    const w = item.gridW || (isBag ? 1 : (item as any).width) || 1;
    const h = item.gridH || (isBag ? 1 : (item as any).height) || 1;
    const shape = item.shape;

    // 1. Boundary check
    if (gridX < 0 || gridY < 0 || gridX + w > gridW || gridY + h > gridH) return true;

    // 2. Overlap with other items check
    return currentItems.some((other) => {
      if (other.uid === item.uid || other.gridX < 0) return false;
      const isOtherBag = (other as any).type === 'bag';
      const ow = other.gridW || (isOtherBag ? 1 : (other as any).width) || 1;
      const oh = other.gridH || (isOtherBag ? 1 : (other as any).height) || 1;
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
    const isBag = (item as any).type === 'bag';
    const w = item.gridW || (isBag ? 1 : (item as any).width) || 1;
    const h = item.gridH || (isBag ? 1 : (item as any).height) || 1;
    const itemW = w * cellSize;
    const itemH = h * cellSize;

    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    setDraggingItem(item);
    setDragPos({ x: startX - itemW / 2, y: startY - itemH / 2 });
    setDragClientPos({ x: e.clientX - itemW / 2, y: e.clientY - itemH / 2 });
    
    // Initial snap position
    const gx = Math.round((startX - itemW / 2) / cellSize);
    const gy = Math.round((startY - itemH / 2) / cellSize);
    setDragGridPos({ x: gx, y: gy });
  }, [cellSize]);

  const onPointerMove = useCallback((e: PointerEvent | React.PointerEvent) => {
    if (!draggingItem || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const isBag = (draggingItem as any).type === 'bag';
    const w = draggingItem.gridW || (isBag ? 1 : (draggingItem as any).width) || 1;
    const h = draggingItem.gridH || (isBag ? 1 : (draggingItem as any).height) || 1;
    const itemW = w * cellSize;
    const itemH = h * cellSize;

    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const newX = currentX - itemW / 2;
    const newY = currentY - itemH / 2;

    setDragPos({ x: newX, y: newY });
    setDragClientPos({ x: e.clientX - itemW / 2, y: e.clientY - itemH / 2 });

    const gx = Math.round(newX / cellSize);
    const gy = Math.round(newY / cellSize);
    
    setDragGridPos({ x: gx, y: gy });
  }, [draggingItem, cellSize]);

  const onPointerUp = useCallback((e: PointerEvent | React.PointerEvent) => {
    if (!draggingItem) return;

    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const isOutside = e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
      
      if (isOutside) {
        onDropOutside?.(draggingItem, e);
        setDraggingItem(null);
        setDragGridPos(null);
        return;
      }
    }

    const gx = dragGridPos?.x ?? draggingItem.gridX;
    const gy = dragGridPos?.y ?? draggingItem.gridY;

    // 1. Kiểm tra xem có bị chồng lấp vật phẩm khác không
    if (checkOverlap(draggingItem, gx, gy, items)) {
      setDraggingItem(null);
      setDragGridPos(null);
      return;
    }

    let finalGx = gx;
    let finalGy = gy;

    // 2. Kiểm tra tương tác với balo active (chỉ để equip balo mới)
    if (activeBag) {
      const touching = isItemTouchingBag(draggingItem, gx, gy, activeBag);
      if (touching && (draggingItem as any).type === 'bag') {
        onEquipBag?.(draggingItem.uid);
        setDraggingItem(null);
        setDragGridPos(null);
        return;
      }
    }

    // Hợp lệ -> Lưu vị trí mới (Tạm thời cho phép đặt ở bất kỳ đâu trên grid)
    const newItems = items.map((i) => 
      i.uid === draggingItem.uid ? { ...i, gridX: finalGx, gridY: finalGy } : i
    );
    onItemLayoutChange?.(newItems);

    setDraggingItem(null);
    setDragGridPos(null);
  }, [
    draggingItem, dragGridPos, items, activeBag, 
    checkOverlap, isItemTouchingBag, onEquipBag, 
    onItemLayoutChange, onDropOutside
  ]);

  useEffect(() => {
    if (draggingItem) {
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      return () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };
    }
  }, [draggingItem, onPointerMove, onPointerUp]);

  return {
    draggingItem,
    dragPos,
    dragClientPos,
    dragGridPos,
    containerRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    checkOverlap,
    isInvalidPosition: (gx: number, gy: number) => {
      if (!draggingItem) return false;
      // Tạm thời chỉ check chồng lấp và biên
      return checkOverlap(draggingItem, gx, gy, items);
    }
  };
}
