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

const GridBackground: React.FC<GridBackgroundProps> = ({
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
      {Array.from({ length: gridH }).map((_, r) =>
        Array.from({ length: gridW }).map(
          (_, c) =>
            !bagOcc[r][c] && (
              <div
                key={`${r}-${c}`}
                className="absolute"
                style={{
                  left: c * cellSize,
                  top: r * cellSize,
                  width: cellSize,
                  height: cellSize,
                  background: 'rgba(0,0,0,0.4)',
                }}
              />
            )
        )
      )}
      {activeBag && activeBag.gridX >= 0 && (
        <div
          className="absolute rounded-xl border-2 border-cyan-500/10"
          style={{
            left: activeBag.gridX * cellSize + 2,
            top: activeBag.gridY * cellSize + 2,
            width: activeBag.width * cellSize - 4,
            height: activeBag.height * cellSize - 4,
            background: BAG_BG[activeBag.rarity] || BAG_BG.common,
          }}
        />
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
};

export default GridBackground;
