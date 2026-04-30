import React, { useCallback, useRef, useState } from 'react';
import type { LooterItem, BagItem } from './types';
import { useLooterState, useLooterActions } from '../LooterGameContext';
import { MAX_GRID_W, MAX_GRID_H } from './constants';

// Sub-components
import InventoryItem from './components/InventoryItem';
import GridBackground from './components/GridBackground';
import DragPortal from './components/DragPortal';
import ItemPopup from './components/ItemPopup';

// Hooks
import { useInventoryDrag } from './hooks/useInventoryDrag';

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

const InventoryGrid: React.FC<InventoryGridProps> = ({
  items,
  bags,
  readOnly = false,
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
  const [popupInfo, setPopupInfo] = useState<{ item: LooterItem; x: number; y: number } | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);

  const handleDropItem = useCallback(
    (uid: string) => {
      if (typeof looterDropItem === 'function') {
        looterDropItem(uid);
      }
    },
    [looterDropItem]
  );

  const activeBag = Array.isArray(bags) ? bags[0] : undefined;

  const buildBagOccupancy = useCallback(() => {
    const grid: boolean[][] = Array.from({ length: gridH }, () => Array(gridW).fill(false));
    if (!activeBag || activeBag.gridX < 0) return grid;

    const w = activeBag.width;
    const h = activeBag.height;
    const shape = activeBag.shape || [];
    for (let r = 0; r < h && activeBag.gridY + r < gridH; r++) {
      for (let c = 0; c < w && activeBag.gridX + c < gridW; c++) {
        if (shape[r] && shape[r][c]) {
          grid[activeBag.gridY + r][activeBag.gridX + c] = true;
        }
      }
    }
    return grid;
  }, [activeBag, gridW, gridH]);

  const buildItemOccupancy = useCallback(
    (excludeUid?: string) => {
      const grid: (string | null)[][] = Array.from({ length: gridH }, () => Array(gridW).fill(null));
      for (const item of items) {
        if (item.gridX < 0 || (excludeUid && item.uid === excludeUid)) continue;
        const w = item.gridW || 1;
        const h = item.gridH || 1;
        const shape = item.shape;

        for (let r = 0; r < h && item.gridY + r < gridH; r++) {
          for (let c = 0; c < w && item.gridX + c < gridW; c++) {
            if (!shape || (shape[r] && shape[r][c])) {
              grid[item.gridY + r][item.gridX + c] = item.uid;
            }
          }
        }
      }
      return grid;
    },
    [items, gridW, gridH]
  );

  const canPlaceItem = useCallback(
    (item: LooterItem, x: number, y: number, excludeUid?: string) => {
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
    },
    [buildBagOccupancy, buildItemOccupancy, gridW, gridH]
  );

  const { dragItem, dragOffset, dragPos, hoverCell, handleItemPointerDown } = useInventoryDrag({
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
  });

  const activeDragItem = externalDragItem || dragItem;
  const activeHoverCell = externalHoverCell || hoverCell;
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

  const gridItems = items.filter((i) => i.gridX >= 0);
  const stagingItems = items.filter((i) => i.gridX < 0);

  // Helper for stable staging position
  const getStablePos = (seed: string, max: number) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash % max);
  };

  return (
    <div
      className="flex flex-col gap-4 select-none touch-none w-full h-full relative"
      onPointerMove={(e) => {
        if (isItemDragging) e.stopPropagation();
      }}
    >
      {stagingItems.map((item) => (
        <InventoryItem
          key={item.uid}
          item={item}
          cellSize={cellSize}
          isDragging={activeDragItem?.uid === item.uid}
          style={{
            left: (item as any).stagingX ?? getStablePos(item.uid + 'x', 150),
            top: (item as any).stagingY ?? getStablePos(item.uid + 'y', 200),
          }}
          onPointerDown={readOnly ? undefined : handleItemPointerDown}
          onDoubleClick={onItemDoubleClick}
        />
      ))}

      <div className="w-full h-full flex items-center justify-center pointer-events-none">
        <div
          ref={gridRef}
          className="pointer-events-auto relative rounded-[32px] overflow-hidden shrink-0 mx-auto bg-[#040911] border-2 border-white/5"
          style={{ width: gridW * cellSize, height: gridH * cellSize, touchAction: 'none' }}
        >
          <GridBackground
            gridW={gridW}
            gridH={gridH}
            cellSize={cellSize}
            activeBag={activeBag}
            bagOcc={bagOcc}
            highlightCells={highlightCells}
          />

          {gridItems.map((item) => (
            <InventoryItem
              key={item.uid}
              item={item}
              cellSize={cellSize}
              isDragging={activeDragItem?.uid === item.uid}
              style={{ left: item.gridX * cellSize, top: item.gridY * cellSize }}
              onPointerDown={readOnly ? undefined : handleItemPointerDown}
              onDoubleClick={onItemDoubleClick}
            />
          ))}
        </div>
      </div>

      {dragItem && (
        <DragPortal
          dragItem={dragItem}
          dragPos={dragPos}
          dragOffset={externalDragOffset || dragOffset}
          cellSize={cellSize}
        />
      )}

      {popupInfo && (
        <ItemPopup
          item={popupInfo.item}
          x={popupInfo.x}
          y={popupInfo.y}
          onDrop={handleDropItem}
          onClose={() => setPopupInfo(null)}
        />
      )}
    </div>
  );
};

export default InventoryGrid;
