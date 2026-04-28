export type FruitPoint = { r: number; c: number };
export type FruitCell = { f: string | null; id: string };

const FRUITS = ['🍎', '🍌', '🍇', '🍉', '🍊', '🍓', '🍍', '🍒', '🥝', '🥭'];
const FRUIT_DIRS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

export const cloneFruitGrid = (grid: FruitCell[][]) => grid.map(row => row.map(cell => ({ ...cell })));

export const isWalkableFruitCell = (grid: FruitCell[][], r: number, c: number, end: FruitPoint) => {
  if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length) return false;
  if (r === end.r && c === end.c) return true;
  return grid[r][c].f === null;
};

export const findFruitPath = (grid: FruitCell[][], start: FruitPoint, end: FruitPoint): FruitPoint[] | null => {
  if (start.r === end.r && start.c === end.c) return null;
  const rows = grid.length;
  const cols = grid[0].length;
  const keyOf = (r: number, c: number, dir: number, turns: number) => `${r},${c},${dir},${turns}`;
  const parent = new Map<string, string | null>();
  const stateByKey = new Map<string, { r: number; c: number; dir: number; turns: number }>();
  const queue: { r: number; c: number; dir: number; turns: number }[] = [];
  const visited = new Set<string>();

  const push = (state: { r: number; c: number; dir: number; turns: number }, prevKey: string | null) => {
    const key = keyOf(state.r, state.c, state.dir, state.turns);
    if (visited.has(key)) return;
    visited.add(key);
    parent.set(key, prevKey);
    stateByKey.set(key, state);
    queue.push(state);
  };

  FRUIT_DIRS.forEach((dir, dirIndex) => {
    const nr = start.r + dir.dr;
    const nc = start.c + dir.dc;
    if (isWalkableFruitCell(grid, nr, nc, end)) {
      push({ r: nr, c: nc, dir: dirIndex, turns: 0 }, keyOf(start.r, start.c, -1, 0));
    }
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentKey = keyOf(current.r, current.c, current.dir, current.turns);

    if (current.r === end.r && current.c === end.c) {
      const path: FruitPoint[] = [{ r: end.r, c: end.c }];
      let cursor: string | null = currentKey;
      while (cursor) {
        const state = stateByKey.get(cursor);
        if (!state) break;
        path.push({ r: state.r, c: state.c });
        cursor = parent.get(cursor) || null;
      }
      path.push({ r: start.r, c: start.c });
      return path.reverse();
    }

    for (let nextDir = 0; nextDir < FRUIT_DIRS.length; nextDir++) {
      const { dr, dc } = FRUIT_DIRS[nextDir];
      const nr = current.r + dr;
      const nc = current.c + dc;
      if (!isWalkableFruitCell(grid, nr, nc, end)) continue;
      const turns = current.turns + (current.dir === nextDir ? 0 : 1);
      if (turns > 2) continue;
      push({ r: nr, c: nc, dir: nextDir, turns }, currentKey);
    }
  }

  return null;
};

export const findAnyMove = (grid: FruitCell[][]) => {
  const fruitPositions = new Map<string, FruitPoint[]>();
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      const f = grid[r][c].f;
      if (f) {
        if (!fruitPositions.has(f)) fruitPositions.set(f, []);
        fruitPositions.get(f)!.push({ r, c });
      }
    }
  }

  for (const [fruit, positions] of fruitPositions.entries()) {
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        if (findFruitPath(grid, positions[i], positions[j])) return true;
      }
    }
  }
  return false;
};

export const generateSolvableFruitGrid = (innerRows: number, innerCols: number): FruitCell[][] => {
  const boardRows = innerRows + 2;
  const boardCols = innerCols + 2;
  
  let grid: FruitCell[][] = Array.from({ length: boardRows }, (_, r) =>
    Array.from({ length: boardCols }, (_, c) => ({
      f: null,
      id: `${r}-${c}`,
    }))
  );

  const availablePositions: FruitPoint[] = [];
  for (let r = 1; r <= innerRows; r++) {
    for (let c = 1; c <= innerCols; c++) {
      availablePositions.push({ r, c });
    }
  }

  availablePositions.sort(() => Math.random() - 0.5);

  const fruitPairs = availablePositions.length / 2;
  const fruitsToUse: string[] = [];
  for (let i = 0; i < fruitPairs; i++) {
    const fruit = FRUITS[i % FRUITS.length];
    fruitsToUse.push(fruit, fruit);
  }
  
  let attempts = 0;
  while (attempts < 50) {
    const tempFruits = [...fruitsToUse].sort(() => Math.random() - 0.5);
    const tempGrid = cloneFruitGrid(grid);
    for (let i = 0; i < availablePositions.length; i++) {
      const pos = availablePositions[i];
      tempGrid[pos.r][pos.c].f = tempFruits[i];
    }
    
    if (findAnyMove(tempGrid)) {
      return tempGrid;
    }
    attempts++;
  }
  
  return grid;
};
