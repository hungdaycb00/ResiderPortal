import { useState, useCallback, useRef, useEffect } from 'react';
import type { LooterItem, BagItem } from '../types';

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
  const [dragStartInfo, setDragStartInfo] = useState<{ item: LooterItem; x: number; y: number } | null>(null);
  const [panStart, setPanStart] = useState<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

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

    // 3. Overlap with other items check
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

  const onPointerDown = useCallback((e: React.PointerEvent, item?: LooterItem) => {
    if (e.button !== 0 && e.pointerType !== 'touch') return; // Only left click or touch
    
    const container = containerRef.current;
    if (!container) return;

    if (item) {
      // Store start info for item dragging
      setDragStartInfo({ item, x: e.clientX, y: e.clientY });
    } else {
      // Start panning if clicking on background
      const target = e.currentTarget as HTMLElement;
      try {
        target.setPointerCapture(e.pointerId);
      } catch (err) {}

      const findScrollParent = (el: HTMLElement | null): HTMLElement | null => {
        if (!el) return null;
        const style = window.getComputedStyle(el);
        if (/(auto|scroll)/.test(style.overflow + style.overflowY)) return el;
        return findScrollParent(el.parentElement);
      };
      
      const scrollParent = findScrollParent(container);
      setPanStart({
        x: e.clientX,
        y: e.clientY,
        scrollLeft: scrollParent?.scrollLeft || 0,
        scrollTop: scrollParent?.scrollTop || 0
      });
    }
  }, []);

  const onPointerMove = useCallback((e: PointerEvent | React.PointerEvent) => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Handle Panning (Cuộn nền)
    if (panStart) {
      const findScrollParent = (el: HTMLElement | null): HTMLElement | null => {
        if (!el) return null;
        const style = window.getComputedStyle(el);
        if (/(auto|scroll)/.test(style.overflow + style.overflowY)) return el;
        return findScrollParent(el.parentElement);
      };

      const scrollParent = findScrollParent(container);
      if (scrollParent) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        scrollParent.scrollLeft = panStart.scrollLeft - dx;
        scrollParent.scrollTop = panStart.scrollTop - dy;
      }
      return;
    }

    // 2. Handle Item Dragging
    // If we have start info but not dragging yet, check for threshold
    if (dragStartInfo && !draggingItem) {
        const dx = e.clientX - dragStartInfo.x;
        const dy = e.clientY - dragStartInfo.y;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            const item = dragStartInfo.item;
            const rect = container.getBoundingClientRect();
            const isBag = (item as any).type === 'bag';
            const w = item.gridW || (isBag ? 1 : (item as any).width) || 1;
            const h = item.gridH || (isBag ? 1 : (item as any).height) || 1;
            const itemW = w * cellSize;
            const itemH = h * cellSize;

            setDraggingItem(item);
            const startX = dragStartInfo.x - rect.left;
            const startY = dragStartInfo.y - rect.top;
            setDragPos({ x: startX - itemW / 2, y: startY - itemH / 2 });
            setDragClientPos({ x: dragStartInfo.x - itemW / 2, y: dragStartInfo.y - itemH / 2 });
            
            const gx = Math.round((startX - itemW / 2) / cellSize);
            const gy = Math.round((startY - itemH / 2) / cellSize);
            setDragGridPos({ x: gx, y: gy });
        }
        return;
    }

    if (!draggingItem) return;

    const rect = container.getBoundingClientRect();
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
  }, [dragStartInfo, draggingItem, cellSize, panStart]);

  const onPointerUp = useCallback((e: PointerEvent | React.PointerEvent) => {
    if (panStart) {
      const target = e.currentTarget as HTMLElement;
      try {
        target.releasePointerCapture((e as any).pointerId);
      } catch (err) {}
    }

    setDragStartInfo(null);
    setPanStart(null);

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
      // Chồng lấp hoặc ra ngoài biên toàn cục -> Quay về vị trí cũ
      setDraggingItem(null);
      setDragGridPos(null);
      return;
    }

    let finalGx = gx;
    let finalGy = gy;

    // Items nằm ngoài bag active vẫn được giữ trên grid.
    // Chỉ bị vứt ra biển khi thuyền di chuyển (moveBoat xử lý).

    const newItems = items.map((i) => 
      i.uid === draggingItem.uid ? { ...i, gridX: finalGx, gridY: finalGy } : i
    );
    onItemLayoutChange?.(newItems);

    setDraggingItem(null);
    setDragGridPos(null);
  }, [draggingItem, dragGridPos, items, checkOverlap, onItemLayoutChange, onDropOutside, activeBag, isItemCompletelyInBag]);

  useEffect(() => {
    if (dragStartInfo || draggingItem || panStart) {
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      return () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };
    }
  }, [dragStartInfo, draggingItem, panStart, onPointerMove, onPointerUp]);

  return {
    draggingItem,
    dragPos,
    dragClientPos,
    dragGridPos,
    containerRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    checkOverlap, // Trả về hàm 4 tham số gốc
    isInvalidPosition: (gx: number, gy: number) => draggingItem ? checkOverlap(draggingItem, gx, gy, items) : false
  };
}
