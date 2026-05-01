import React, { useRef } from 'react';
import type { LooterItem, BagItem } from './types';
import { MAX_GRID_W, MAX_GRID_H } from './constants';

import InventoryItem from './components/InventoryItem';
import GridBackground from './components/GridBackground';

interface InventoryGridProps {
  items: LooterItem[];
  bags: BagItem[];
  onItemDoubleClick?: (item: LooterItem) => void;
  onItemClick?: (item: LooterItem) => void;
  cellSize?: number;
  gridW?: number;
  gridH?: number;
}

const InventoryGrid: React.FC<InventoryGridProps> = ({
  items,
  bags,
  onItemDoubleClick,
  onItemClick,
  cellSize = 40,
  gridW = MAX_GRID_W,
  gridH = MAX_GRID_H,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);

  const activeBag = Array.isArray(bags) ? bags[0] : undefined;

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

  return (
    <div className="flex flex-col gap-4 select-none touch-none w-full h-full relative">
      {stagingItems.map((item) => (
        <InventoryItem
          key={item.uid}
          item={item}
          cellSize={cellSize}
          isDragging={false}
          style={{
            left: (item as any).stagingX ?? getStablePos(item.uid + 'x', 150),
            top: (item as any).stagingY ?? getStablePos(item.uid + 'y', 200),
          }}
          onDoubleClick={onItemDoubleClick}
          onClick={() => onItemClick?.(item)}
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
            highlightCells={[]}
          />

          {gridItems.map((item) => (
            <InventoryItem
              key={item.uid}
              item={item}
              cellSize={cellSize}
              isDragging={false}
              style={{ left: item.gridX * cellSize, top: item.gridY * cellSize }}
              onDoubleClick={onItemDoubleClick}
              onClick={() => onItemClick?.(item)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default InventoryGrid;
