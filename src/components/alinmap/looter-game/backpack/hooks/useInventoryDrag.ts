import { useState, useCallback, useRef, useEffect, useReducer } from 'react';
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

// ─── Unified drag state reducer — 1 dispatch thay vì 3 setState/pointermove frame
interface DragState {
  pos: { x: number; y: number };
  clientPos: { x: number; y: number };
  gridPos: { x: number; y: number } | null;
}
type DragAction =
  | { type: 'SET_ALL'; pos: { x: number; y: number }; clientPos: { x: number; y: number }; gridPos: { x: number; y: number } }
  | { type: 'UPDATE_MOVE'; pos: { x: number; y: number }; clientPos: { x: number; y: number }; gridPos: { x: number; y: number } }
  | { type: 'RESET' };

const initialDragState: DragState = { pos: { x: 0, y: 0 }, clientPos: { x: 0, y: 0 }, gridPos: null };

function dragReducer(state: DragState, action: DragAction): DragState {
  switch (action.type) {
    case 'SET_ALL':
    case 'UPDATE_MOVE':
      return { pos: action.pos, clientPos: action.clientPos, gridPos: action.gridPos };
    case 'RESET':
      return initialDragState;
  }
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
  const [dragState, dispatchDrag] = useReducer(dragReducer, initialDragState);
  const [dragStartInfo, setDragStartInfo] = useState<{ item: LooterItem; x: number; y: number } | null>(null);
  const [panStart, setPanStart] = useState<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollParentRef = useRef<HTMLElement | null>(null);

  const findScrollParent = (el: HTMLElement | null): HTMLElement | null => {
    if (!el) return null;
    const style = window.getComputedStyle(el);
    if (/(auto|scroll)/.test(style.overflow + style.overflowY)) return el;
    return findScrollParent(el.parentElement);
  };

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

  const doesItemOverlapBag = useCallback((item: LooterItem, gx: number, gy: number, bag: BagItem) => {
    const w = item.gridW || 1;
    const h = item.gridH || 1;
    const shape = item.shape;

    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (shape && !shape[r][c]) continue;
        const bagR = gy + r - bag.gridY;
        const bagC = gx + c - bag.gridX;
        if (bagR >= 0 && bagR < bag.height && bagC >= 0 && bagC < bag.width && bag.shape?.[bagR]?.[bagC]) {
          return true;
        }
      }
    }
    return false;
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

      scrollParentRef.current = findScrollParent(container);
      setPanStart({
        x: e.clientX,
        y: e.clientY,
        scrollLeft: scrollParentRef.current?.scrollLeft || 0,
        scrollTop: scrollParentRef.current?.scrollTop || 0
      });
    }
  }, []);

  const onPointerMove = useCallback((e: PointerEvent | React.PointerEvent) => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Handle Panning (Cuộn nền)
    if (panStart) {
      const scrollParent = scrollParentRef.current;
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
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
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
            const gx = Math.round((startX - itemW / 2) / cellSize);
            const gy = Math.round((startY - itemH / 2) / cellSize);
            dispatchDrag({
              type: 'SET_ALL',
              pos: { x: startX - itemW / 2, y: startY - itemH / 2 },
              clientPos: { x: dragStartInfo.x - itemW / 2, y: dragStartInfo.y - itemH / 2 },
              gridPos: { x: gx, y: gy },
            });
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

    const gx = Math.round(newX / cellSize);
    const gy = Math.round(newY / cellSize);

    dispatchDrag({
      type: 'UPDATE_MOVE',
      pos: { x: newX, y: newY },
      clientPos: { x: e.clientX - itemW / 2, y: e.clientY - itemH / 2 },
      gridPos: { x: gx, y: gy },
    });
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
    scrollParentRef.current = null;

    if (!draggingItem) return;

    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const isOutside = e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
      
      if (isOutside) {
        onDropOutside?.(draggingItem, e);
        setDraggingItem(null);
        dispatchDrag({ type: 'RESET' });
        return;
      }
    }

    const gx = dragState.gridPos?.x ?? draggingItem.gridX;
    const gy = dragState.gridPos?.y ?? draggingItem.gridY;

    // 1. Kiểm tra xem có bị chồng lấp vật phẩm khác không
    if (checkOverlap(draggingItem, gx, gy, items)) {
      // Chồng lấp hoặc ra ngoài biên toàn cục -> Quay về vị trí cũ
      setDraggingItem(null);
      dispatchDrag({ type: 'RESET' });
      return;
    }

    // 2. Nếu item chạm vào vùng balo -> phải nằm hoàn toàn trong balo
    //    Nếu item nằm ngoài vùng balo -> cho phép đặt tự do (không ràng buộc)
    if (activeBag && doesItemOverlapBag(draggingItem, gx, gy, activeBag) && !isItemCompletelyInBag(draggingItem, gx, gy, activeBag)) {
      // Chạm balo nhưng không nằm gọn -> Quay về vị trí cũ
      setDraggingItem(null);
      dispatchDrag({ type: 'RESET' });
      return;
    }

    let finalGx = gx;
    let finalGy = gy;

    const newItems = items.map((i) =>
      i.uid === draggingItem.uid ? { ...i, gridX: finalGx, gridY: finalGy } : i
    );
    onItemLayoutChange?.(newItems);

    setDraggingItem(null);
    dispatchDrag({ type: 'RESET' });
  }, [draggingItem, dragState.gridPos, items, checkOverlap, onItemLayoutChange, onDropOutside, activeBag, isItemCompletelyInBag, doesItemOverlapBag]);

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
    dragState,
    containerRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    checkOverlap,
    isInvalidPosition: (gx: number, gy: number) => {
      if (!draggingItem) return false;
      if (checkOverlap(draggingItem, gx, gy, items)) return true;
      if (activeBag && doesItemOverlapBag(draggingItem, gx, gy, activeBag) && !isItemCompletelyInBag(draggingItem, gx, gy, activeBag)) return true;
      return false;
    }
  };
}
