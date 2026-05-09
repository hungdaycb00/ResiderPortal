export type Cell = {
  isMine: boolean;
  isOpened: boolean;
  isFlagged: boolean;
  isQuestion: boolean;
  neighborMines: number;
};

export const LEVELS = {
  easy: { size: 4, mines: 3, name: 'EASY' },
  medium: { size: 7, mines: 9, name: 'MEDIUM' },
  hard: { size: 9, mines: 15, name: 'HARD' }
};

export const setupGrid = (rows: number, cols: number, mines: number): Cell[][] => {
  const newGrid: Cell[][] = Array(rows).fill(null).map(() =>
    Array(cols).fill(null).map(() => ({
      isMine: false, isOpened: false, isFlagged: false, isQuestion: false, neighborMines: 0,
    }))
  );
  let minesPlaced = 0;
  while (minesPlaced < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (!newGrid[r][c].isMine) {
      newGrid[r][c].isMine = true;
      minesPlaced++;
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (newGrid[r][c].isMine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && newGrid[nr][nc].isMine) count++;
        }
      }
      newGrid[r][c].neighborMines = count;
    }
  }
  return newGrid;
};

export const openCell = (grid: Cell[][], r: number, c: number, rows: number, cols: number): { newGrid: Cell[][], hitMine: boolean, allCleared: boolean } => {
  const newGrid = grid.map(row => [...row]);
  if (newGrid[r][c].isMine) {
    newGrid[r][c].isOpened = true;
    newGrid.forEach(row => row.forEach(cell => { if (cell.isMine) cell.isOpened = true; }));
    return { newGrid, hitMine: true, allCleared: false };
  }

  const reveal = (row: number, col: number) => {
    if (row < 0 || row >= rows || col < 0 || col >= cols || newGrid[row][col].isOpened || newGrid[row][col].isFlagged) return;
    newGrid[row][col].isOpened = true;
    if (newGrid[row][col].neighborMines === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          reveal(row + dr, col + dc);
        }
      }
    }
  };
  reveal(r, c);

  const allCleared = newGrid.every(row => row.every(cell => cell.isMine || cell.isOpened));
  return { newGrid, hitMine: false, allCleared };
};

export const toggleFlag = (grid: Cell[][], r: number, c: number): { newGrid: Cell[][], flagDelta: number } => {
  const newGrid = grid.map(row => [...row]);
  const cell = newGrid[r][c];
  let flagDelta = 0;

  if (!cell.isFlagged && !cell.isQuestion) {
    cell.isFlagged = true;
    flagDelta = -1;
  } else if (cell.isFlagged) {
    cell.isFlagged = false;
    cell.isQuestion = true;
    flagDelta = 1;
  } else {
    cell.isQuestion = false;
  }
  return { newGrid, flagDelta };
};

export const getNumberColor = (num: number) => {
  switch (num) {
    case 1: return 'text-blue-500';
    case 2: return 'text-green-500';
    case 3: return 'text-red-500';
    case 4: return 'text-indigo-600';
    case 5: return 'text-orange-600';
    case 6: return 'text-teal-600';
    case 7: return 'text-pink-600';
    case 8: return 'text-gray-800';
    default: return 'text-transparent';
  }
};
