import React from 'react';
import type { BagItem } from '../types';
import { BAG_BG } from '../constants';

interface GridBackgroundProps {
  gridW: number;
  gridH: number;
  cellSize: number;
  activeBag?: BagItem;
  bagOcc: boolean[][];
  highlightCells: { x: number; y: number; valid: boolean }[];
}

const GridBackground: React.FC<GridBackgroundProps> = React.memo(({
  gridW,
  gridH,
  cellSize,
  activeBag,
  bagOcc,
  highlightCells,
}) => {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: `${cellSize}px ${cellSize}px`,
        }}
      />
      {/* Uniform Grid Background is handled by parent container's backgroundImage */}
      {/* Bag shape cells - render each active cell with smart borders to create shape outline */}
      {bagOcc.map((row, gy) =>
        row.map((active, gx) => {
          if (!active) return null;

          // Logic to draw border only on outer edges of the shape
          const hasTop = gy > 0 && bagOcc[gy - 1][gx];
          const hasBottom = gy < gridH - 1 && bagOcc[gy + 1][gx];
          const hasLeft = gx > 0 && bagOcc[gy][gx - 1];
          const hasRight = gx < gridW - 1 && bagOcc[gy][gx + 1];

          const borderColor = 'rgba(34, 211, 238, 0.4)'; // cyan-400 with opacity
          const borderStyle = `2px solid ${borderColor}`;

          return (
            <div
              key={`bag-${gx}-${gy}`}
              className="absolute"
              style={{
                left: gx * cellSize,
                top: gy * cellSize,
                width: cellSize,
                height: cellSize,
                background: activeBag ? (BAG_BG[activeBag.rarity] || BAG_BG.common) : BAG_BG.common,
                borderTop: hasTop ? 'none' : borderStyle,
                borderBottom: hasBottom ? 'none' : borderStyle,
                borderLeft: hasLeft ? 'none' : borderStyle,
                borderRight: hasRight ? 'none' : borderStyle,
                zIndex: 5,
              }}
            />
          );
        })
      )}
      {highlightCells.map(({ x, y, valid }) => (
        <div
          key={`hl-${x}-${y}`}
          className={`absolute z-10 pointer-events-none ${
            valid ? 'bg-emerald-400/20' : 'bg-red-400/20'
          }`}
          style={{
            left: x * cellSize,
            top: y * cellSize,
            width: cellSize,
            height: cellSize,
          }}
        />
      ))}
    </>
  );
}, (prev, next) => {
  if (prev.gridW !== next.gridW || prev.gridH !== next.gridH || prev.cellSize !== next.cellSize) return false;
  if (prev.activeBag?.uid !== next.activeBag?.uid || prev.activeBag?.gridX !== next.activeBag?.gridX || prev.activeBag?.gridY !== next.activeBag?.gridY) return false;
  if (prev.highlightCells.length !== next.highlightCells.length) return false;
  for (let i = 0; i < prev.highlightCells.length; i++) {
    if (prev.highlightCells[i].x !== next.highlightCells[i].x || prev.highlightCells[i].y !== next.highlightCells[i].y || prev.highlightCells[i].valid !== next.highlightCells[i].valid) return false;
  }
  return true;
});

export default GridBackground;
