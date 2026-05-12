import React from 'react';
import { createPortal } from 'react-dom';
import type { LooterItem, BagItem } from './types';
import { MAX_GRID_W, MAX_GRID_H } from './constants';
import InventoryItem from './components/InventoryItem';
import GridBackground from './components/GridBackground';
import ItemPopup from './components/ItemPopup';
import { useInventoryDrag } from './hooks/useInventoryDrag';
import { isItemFullyInsideBag } from '../utils/looterHelpers';

interface InventoryGridProps {
  items: LooterItem[];
  bags: BagItem[];
  readOnly?: boolean;
  onItemDoubleClick?: (item: LooterItem) => void;
  onItemClick?: (item: LooterItem, pos: { x: number; y: number }) => void;
  onItemLayoutChange?: (items: LooterItem[]) => void;
  onHoverCellChange?: (cell: { x: number; y: number } | null) => void;
  onDragStart?: (item: LooterItem, source: any, offset: any) => void;
  onDragEnd?: () => void;
  onDropOutside?: (item: LooterItem, e?: PointerEvent | React.PointerEvent) => void;
  onEquipBag?: (itemUid: string) => void;
  onDragStateChange?: (item: LooterItem | null) => void;
  cellSize?: number;
  gridW?: number;
  gridH?: number;
}

  const InventoryGrid: React.FC<InventoryGridProps> = ({
    items,
    bags,
    readOnly = false,
    onItemDoubleClick,
    onItemClick,
    onItemLayoutChange,
    onDropOutside,
    onEquipBag,
    onDragStateChange,
    cellSize = 40,
    gridW = MAX_GRID_W,
    gridH = MAX_GRID_H,
  }) => {
    const [selectedItem, setSelectedItem] = React.useState<LooterItem | null>(null);
    const [popupPos, setPopupPos] = React.useState({ x: 0, y: 0 });
  
    const handleDoubleClick = React.useCallback((item: LooterItem) => {
      setSelectedItem(null); // Close popup on double click
      onItemDoubleClick?.(item);
    }, [onItemDoubleClick]);

  const activeBag = Array.isArray(bags) ? bags[0] : undefined;

  const {
    draggingItem,
    dragState,
    containerRef,
    onPointerDown,
    checkOverlap,
    isInvalidPosition
  } = useInventoryDrag({
    items,
    cellSize,
    gridW,
    gridH,
    activeBag,
    onItemLayoutChange,
    onDropOutside,
    onEquipBag,
  });

  const bagOcc = React.useMemo(() => {
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

  const gridItems = React.useMemo(() => items.filter((i) => i.gridX >= 0), [items]);

  const outsideBagUids = React.useMemo(() => {
    if (!activeBag || activeBag.gridX < 0) return new Set<string>();
    return new Set(
      items
        .filter(i => i.gridX >= 0 && !isItemFullyInsideBag(i, activeBag))
        .map(i => i.uid)
    );
  }, [items, activeBag]);

  React.useEffect(() => {
    const staging = items.filter(i => i.gridX < 0);
    if (staging.length === 0) return;
    if (!activeBag || activeBag.gridX < 0) return;

    const findEmptySpot = (item: LooterItem, currentItems: LooterItem[]) => {
      const w = item.gridW || 1;
      const h = item.gridH || 1;
      const canUseSpot = (x: number, y: number, requireBagCells: boolean, forbidBagCells: boolean) => {
        for (let dy = 0; dy < h; dy++) {
          for (let dx = 0; dx < w; dx++) {
            const occupiesCell = !item.shape || !!item.shape[dy]?.[dx];
            if (!occupiesCell) continue;

            const inBag = !!bagOcc[y + dy]?.[x + dx];
            if (requireBagCells && !inBag) return false;
            if (forbidBagCells && inBag) return false;
            }
          }
        return !checkOverlap(item, x, y, currentItems);
      };

      for (let y = 0; y <= gridH - h; y++) {
        for (let x = 0; x <= gridW - w; x++) {
          if (canUseSpot(x, y, true, false)) return { x, y };
        }
      }
      for (let y = 0; y <= gridH - h; y++) {
        for (let x = 0; x <= gridW - w; x++) {
          if (canUseSpot(x, y, false, true)) return { x, y };
        }
      }
      return null;
    };

    let updated = [...items];
    let changed = false;
    for (const item of staging) {
      const spot = findEmptySpot(item, updated);
      if (spot) {
        updated = updated.map(i => i.uid === item.uid ? { ...i, gridX: spot.x, gridY: spot.y } : i);
        changed = true;
      }
    }

    // Only call if layout actually differs from current items
    if (changed && updated.some((item, i) => item.gridX !== items[i].gridX || item.gridY !== items[i].gridY)) {
      onItemLayoutChange?.(updated);
    }
  }, [items, gridW, gridH, checkOverlap, onItemLayoutChange, activeBag, bagOcc]);

  React.useEffect(() => {
    onDragStateChange?.(draggingItem);
  }, [draggingItem, onDragStateChange]);

  return (
    <div 
      className="flex flex-col select-none touch-none w-full h-full relative"
    >

      <div className="w-full h-full flex items-start justify-center pt-0 pointer-events-none">
        <div
          ref={containerRef}
          className="pointer-events-auto relative shrink-0 mx-auto bg-[#040911] border-2 border-white/10"
          style={{ width: gridW * cellSize, height: gridH * cellSize, touchAction: 'none' }}
          onPointerDown={(e) => onPointerDown(e)}
        >
          <GridBackground
            gridW={gridW}
            gridH={gridH}
            cellSize={cellSize}
            activeBag={activeBag}
            bagOcc={bagOcc}
            highlightCells={[]}
          />

          {gridItems.map((item) => (
            <InventoryItem
              key={item.uid}
              item={item}
              cellSize={cellSize}
              isDragging={draggingItem?.uid === item.uid}
              outsideBag={outsideBagUids.has(item.uid)}
              style={{ left: item.gridX * cellSize, top: item.gridY * cellSize }}
              onPointerDown={readOnly ? undefined : onPointerDown}
              onDoubleClick={readOnly ? undefined : handleDoubleClick}
              onClick={() => {
                const pos = { x: item.gridX * cellSize, y: item.gridY * cellSize };
                setSelectedItem(item);
                setPopupPos(pos);
                onItemClick?.(item, pos);
              }}
            />
          ))}

          {/* Ghost Preview */}
          {draggingItem && dragState.gridPos && (
            <InventoryItem
              key="ghost"
              item={draggingItem}
              cellSize={cellSize}
              isGhost={true}
              isInvalid={isInvalidPosition(dragState.gridPos.x, dragState.gridPos.y)}
              style={{
                left: dragState.gridPos.x * cellSize,
                top: dragState.gridPos.y * cellSize,
              }}
            />
          )}

          {/* Active Dragging Item */}
          {draggingItem && createPortal(
            <InventoryItem
              key="dragging"
              item={draggingItem}
              cellSize={cellSize}
              style={{
                position: 'fixed',
                left: dragState.clientPos.x,
                top: dragState.clientPos.y,
                pointerEvents: 'none',
                zIndex: 999999,
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5)',
              }}
            />,
            document.body
          )}

          {/* Item Popup */}
          <ItemPopup 
            item={selectedItem} 
            onClose={() => setSelectedItem(null)} 
            style={{
              left: Math.min(gridW * cellSize - 220, Math.max(0, popupPos.x)),
              top: Math.min(gridH * cellSize - 200, Math.max(0, popupPos.y - 150)),
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default InventoryGrid;
