import { useState, useCallback, useRef, useEffect } from 'react';
import type { LooterItem } from '../types';

const CLICK_MOVE_TOLERANCE = 8;

interface UseInventoryDragProps {
  items: LooterItem[];
  cellSize: number;
  gridRef: React.RefObject<HTMLDivElement>;
  onItemLayoutChange?: (items: LooterItem[]) => void;
  onItemClick?: (item: LooterItem) => void;
  onHoverCellChange?: (cell: { x: number; y: number } | null) => void;
  onDragStart?: (item: LooterItem, source: 'inventory', offset: { x: number; y: number }) => void;
  onDragEnd?: () => void;
  handleDropItem: (uid: string) => void;
  canPlaceItem: (item: LooterItem, x: number, y: number, excludeUid?: string) => boolean;
  setDraggingItem: (item: LooterItem | null) => void;
  setIsItemDragging: (isDragging: boolean) => void;
  setPopupInfo: (info: { item: LooterItem; x: number; y: number } | null) => void;
}

export const useInventoryDrag = ({
  items,
  cellSize,
  gridRef,
  onItemLayoutChange,
  onItemClick,
  onHoverCellChange,
  onDragStart,
  onDragEnd,
  handleDropItem,
  canPlaceItem,
  setDraggingItem,
  setIsItemDragging,
  setPopupInfo,
}: UseInventoryDragProps) => {
  const [dragItem, setDragItem] = useState<LooterItem | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState({ x: 0, y: 0, clientX: 0, clientY: 0 });
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);

  const pointerStartRef = useRef<{ itemUid: string; clientX: number; clientY: number } | null>(null);
  const pointerCurrentRef = useRef<{ clientX: number; clientY: number } | null>(null);

  const updateDragPosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragItem) return;
      const gridRect = gridRef.current?.getBoundingClientRect();
      const relX = gridRect ? clientX - gridRect.left : 0;
      const relY = gridRect ? clientY - gridRect.top : 0;
      pointerCurrentRef.current = { clientX, clientY };
      setDragPos({ x: relX, y: relY, clientX, clientY });

      if (gridRect) {
        const isInsideGrid =
          clientX >= gridRect.left &&
          clientX <= gridRect.right &&
          clientY >= gridRect.top &&
          clientY <= gridRect.bottom;
        if (isInsideGrid) {
          const topLeftX = relX - dragOffset.x;
          const topLeftY = relY - dragOffset.y;
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
    },
    [dragItem, cellSize, dragOffset, hoverCell, onHoverCellChange, gridRef]
  );

  const handleItemPointerDown = (e: React.PointerEvent, item: LooterItem) => {
    setPopupInfo(null);
    e.preventDefault();
    e.stopPropagation();

    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) return;

    setDragItem(item);
    setDraggingItem(item);

    const itemRect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const isFloating = item.gridX < 0;
    
    // For staging items (floating), they might have a CSS transform or be inside a scaled container
    // We calculate offset directly relative to the item's bounding box
    const offsetX = e.clientX - itemRect.left;
    const offsetY = e.clientY - itemRect.top;
    
    const offset = {
      x: Math.max(0, offsetX),
      y: Math.max(0, offsetY),
    };
    setDragOffset(offset);
    onDragStart?.(item, 'inventory', offset);
    setIsItemDragging(true);
    pointerStartRef.current = { itemUid: item.uid, clientX: e.clientX, clientY: e.clientY };
    pointerCurrentRef.current = { clientX: e.clientX, clientY: e.clientY };
    try {
      (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
    } catch {}
    setDragPos({
      x: e.clientX - gridRect.left,
      y: e.clientY - gridRect.top,
      clientX: e.clientX,
      clientY: e.clientY,
    });
  };

  const handlePointerUp = useCallback(
    (e?: React.PointerEvent | PointerEvent) => {
      if (!dragItem) return;

      if (e && 'currentTarget' in e && e.currentTarget) {
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture?.((e as any).pointerId);
        } catch {}
      }

      const pointerStart = pointerStartRef.current;
      const pointerCurrent = pointerCurrentRef.current;
      const wasClick =
        !!pointerStart &&
        pointerStart.itemUid === dragItem?.uid &&
        !!pointerCurrent &&
        Math.abs(pointerCurrent.clientX - pointerStart.clientX) <= CLICK_MOVE_TOLERANCE &&
        Math.abs(pointerCurrent.clientY - pointerStart.clientY) <= CLICK_MOVE_TOLERANCE;

      if (wasClick) {
        onItemClick?.(dragItem);
        setPopupInfo({ item: dragItem, x: pointerCurrent.clientX, y: pointerCurrent.clientY });
      } else {
        if (hoverCell && canPlaceItem(dragItem, hoverCell.x, hoverCell.y, dragItem.uid)) {
          const newItems = items.map((i) =>
            i.uid === dragItem.uid ? { ...i, gridX: hoverCell.x, gridY: hoverCell.y } : i
          );
          onItemLayoutChange?.(newItems);
        } else {
          const gridRect = gridRef.current?.getBoundingClientRect();
          if (gridRect && pointerCurrent) {
            const isOutside =
              pointerCurrent.clientX < gridRect.left ||
              pointerCurrent.clientX > gridRect.right ||
              pointerCurrent.clientY < gridRect.top ||
              pointerCurrent.clientY > gridRect.bottom;
            if (!isOutside) {
              const newItems = items.map((i) => {
                if (i.uid === dragItem.uid) {
                  return {
                    ...i,
                    gridX: -1,
                    gridY: -1,
                    stagingX: dragPos.x - dragOffset.x,
                    stagingY: dragPos.y - dragOffset.y,
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
      setIsItemDragging(false); // Removed setTimeout to fix drop delay
      setHoverCell(null);
      onHoverCellChange?.(null);
      pointerStartRef.current = null;
      pointerCurrentRef.current = null;
      onDragEnd?.();
    },
    [
      dragItem,
      hoverCell,
      items,
      canPlaceItem,
      onItemClick,
      onItemLayoutChange,
      onHoverCellChange,
      onDragEnd,
      handleDropItem,
      setDraggingItem,
      setIsItemDragging,
      dragPos,
      dragOffset,
      gridRef,
      setPopupInfo,
    ]
  );

  useEffect(() => {
    const handleGlobalMove = (e: PointerEvent) => {
      if (dragItem) updateDragPosition(e.clientX, e.clientY);
    };
    const handleGlobalUp = (e: PointerEvent) => {
      if (dragItem) handlePointerUp(e);
    };
    window.addEventListener('pointermove', handleGlobalMove);
    window.addEventListener('pointerup', handleGlobalUp);
    return () => {
      window.removeEventListener('pointermove', handleGlobalMove);
      window.removeEventListener('pointerup', handleGlobalUp);
    };
  }, [dragItem, handlePointerUp, updateDragPosition]);

  return {
    dragItem,
    dragOffset,
    dragPos,
    hoverCell,
    handleItemPointerDown,
    handlePointerUp,
  };
};
