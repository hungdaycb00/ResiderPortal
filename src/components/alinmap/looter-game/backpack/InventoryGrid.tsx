import React from 'react';
import type { LooterItem, BagItem } from './types';
import { MAX_GRID_W, MAX_GRID_H } from './constants';
import InventoryItem from './components/InventoryItem';
import GridBackground from './components/GridBackground';
import ItemPopup from './components/ItemPopup';
import { useInventoryDrag } from './hooks/useInventoryDrag';

interface InventoryGridProps {
  items: LooterItem[];
  bags: BagItem[];
  onItemDoubleClick?: (item: LooterItem) => void;
  onItemClick?: (item: LooterItem) => void;
  onItemLayoutChange?: (items: LooterItem[]) => void;
  onHoverCellChange?: (cell: { x: number; y: number } | null) => void;
  onDragStart?: (item: LooterItem, source: any, offset: any) => void;
  onDragEnd?: () => void;
  onDropOutside?: (item: LooterItem) => void;
  cellSize?: number;
  gridW?: number;
  gridH?: number;
}

const InventoryGrid: React.FC<InventoryGridProps> = ({
  items,
  bags,
  onItemDoubleClick,
  onItemClick,
  onItemLayoutChange,
  onDropOutside,
  cellSize = 40,
  gridW = MAX_GRID_W,
  gridH = MAX_GRID_H,
}) => {
  const [selectedItem, setSelectedItem] = React.useState<LooterItem | null>(null);
  const [popupPos, setPopupPos] = React.useState({ x: 0, y: 0 });

  const activeBag = Array.isArray(bags) ? bags[0] : undefined;

  const {
    draggingItem,
    dragPos,
    dragGridPos,
    containerRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    checkOverlap
  } = useInventoryDrag({
    items,
    cellSize,
    gridW,
    gridH,
    activeBag,
    onItemLayoutChange,
    onDropOutside,
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
  const stagingItems = React.useMemo(() => items.filter((i) => i.gridX < 0), [items]);

  const getStablePos = (seed: string, max: number) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash % max);
  };

  React.useEffect(() => {
    const staging = items.filter(i => i.gridX < 0);
    if (staging.length === 0) return;

    const findEmptySpot = (item: LooterItem, currentItems: LooterItem[]) => {
      const w = item.gridW || 1;
      const h = item.gridH || 1;
      for (let y = 0; y <= gridH - h; y++) {
        for (let x = 0; x <= gridW - w; x++) {
          if (!checkOverlap(item, x, y, currentItems)) return { x, y };
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

    if (changed) {
      onItemLayoutChange?.(updated);
    }
  }, [items, gridW, gridH, checkOverlap, onItemLayoutChange]);

  return (
    <div 
      className="flex flex-col select-none touch-none w-full h-full relative"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >

      <div className="w-full h-full flex items-start justify-center pt-0 pointer-events-none">
        <div
          ref={containerRef}
          className="pointer-events-auto relative shrink-0 mx-auto bg-[#040911] border-2 border-white/10"
          style={{ width: gridW * cellSize, height: gridH * cellSize, touchAction: 'none' }}
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
              style={{ left: item.gridX * cellSize, top: item.gridY * cellSize }}
              onPointerDown={onPointerDown}
              onDoubleClick={onItemDoubleClick}
              onClick={() => {
                setSelectedItem(item);
                setPopupPos({ x: item.gridX * cellSize, y: item.gridY * cellSize });
                onItemClick?.(item);
              }}
            />
          ))}

          {/* Ghost Preview */}
          {draggingItem && dragGridPos && (
            <InventoryItem
              key="ghost"
              item={draggingItem}
              cellSize={cellSize}
              isGhost={true}
              isInvalid={checkOverlap(dragGridPos.x, dragGridPos.y)}
              style={{
                left: dragGridPos.x * cellSize,
                top: dragGridPos.y * cellSize,
              }}
            />
          )}

          {/* Active Dragging Item */}
          {draggingItem && (
            <InventoryItem
              key="dragging"
              item={draggingItem}
              cellSize={cellSize}
              style={{
                left: dragPos.x,
                top: dragPos.y,
                pointerEvents: 'none',
                zIndex: 100,
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5)',
              }}
            />
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
