import { FRUITS } from './FruitGame';
import { checkConnection, findAllValidPairs, type Point, type Cell } from './FruitGameLogic';

export const LEVELS = {
  easy: { rows: 6, cols: 8, fruits: 8, time: 300, name: 'EASY' },
  medium: { rows: 8, cols: 10, fruits: 12, time: 300, name: 'MEDIUM' },
  hard: { rows: 8, cols: 12, fruits: 16, time: 300, name: 'HARD' }
};

export const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${m}:${rs < 10 ? '0' : ''}${rs}`;
};

export const setupGrid = (
  rows: number, cols: number, fruitCount: number,
  autoStart: boolean, pregeneratedGrid?: Cell[][]
) => {
  const totalTiles = rows * cols;
  const fruitSubSet = FRUITS.slice(0, fruitCount);
  let tiles: string[] = [];
  for (let i = 0; i < totalTiles / 2; i++) {
    const f = fruitSubSet[i % fruitSubSet.length];
    tiles.push(f, f);
  }
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  const newGrid: Cell[][] = [];
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({ fruit: tiles[idx++], id: idx });
    }
    newGrid.push(row);
  }
  return autoStart && pregeneratedGrid ? pregeneratedGrid : newGrid;
};

export const handleLevelMechanics = (newGrid: Cell[][], level: string) => {
  if (level === 'easy') return newGrid;
  const rows = newGrid.length;
  const cols = newGrid[0].length;

  if (level === 'medium') {
    for (let c = 0; c < cols; c++) {
      let emptyCount = 0;
      for (let r = rows - 1; r >= 0; r--) {
        if (newGrid[r][c].fruit === null) emptyCount++;
        else if (emptyCount > 0) {
          newGrid[r + emptyCount][c] = { ...newGrid[r][c] };
          newGrid[r][c].fruit = null;
        }
      }
    }
  } else if (level === 'hard') {
    const midR = rows / 2;
    for (let c = 0; c < cols; c++) {
      for (let r = Math.floor(midR) - 1; r >= 0; r--) {
        if (newGrid[r][c].fruit !== null) {
          let targetR = r;
          while (targetR + 1 < midR && newGrid[targetR + 1][c].fruit === null) {
            newGrid[targetR + 1][c] = { ...newGrid[targetR][c] };
            newGrid[targetR][c].fruit = null;
            targetR++;
          }
        }
      }
      for (let r = Math.ceil(midR); r < rows; r++) {
        if (newGrid[r][c].fruit !== null) {
          let targetR = r;
          while (targetR - 1 >= midR && newGrid[targetR - 1][c].fruit === null) {
            newGrid[targetR - 1][c] = { ...newGrid[targetR][c] };
            newGrid[targetR][c].fruit = null;
            targetR--;
          }
        }
      }
    }
  }
  return newGrid;
};

export const shiftGrid = (currentGrid: Cell[][]): Cell[][] => {
  const allFruits = currentGrid.flatMap(row => row.map(c => c.fruit)).filter(f => f !== null) as string[];
  if (allFruits.length === 0) return currentGrid;
  for (let i = allFruits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allFruits[i], allFruits[j]] = [allFruits[j], allFruits[i]];
  }
  return currentGrid.map(row => row.map(cell => {
    if (cell.fruit === null) return cell;
    return { ...cell, fruit: allFruits.pop()! };
  }));
};

export const getCellCoord = (p: Point, gridRef: HTMLDivElement | null, rows: number, cols: number) => {
  if (!gridRef) return { x: 0, y: 0 };
  const rect = gridRef.getBoundingClientRect();
  const cellW = rect.width / cols;
  const cellH = rect.height / rows;
  return { x: (p.c + 0.5) * cellW, y: (p.r + 0.5) * cellH };
};
