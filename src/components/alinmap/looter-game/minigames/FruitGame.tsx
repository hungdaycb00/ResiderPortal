import React, { useState, useEffect, useCallback, useRef } from 'react';
import { playSound, triggerHaptic } from './utils';
import { checkConnection, findAllValidPairs, type Point, type Cell } from './FruitGameLogic';
import { LEVELS, setupGrid, handleLevelMechanics, shiftGrid } from './FruitGameEngine';
import FruitGameMenu from './FruitGameMenu';
import FruitGameBoard from './FruitGameBoard';

// Re-export FRUITS cho backward compatibility
export { FRUITS } from './fruitConstants';


export function FruitGame({
  onBack,
  isEmbedded = false,
  onActiveChange,
  initialLevel,
  autoStart = false,
  onComplete,
  customGrid,
  pregeneratedGrid,
  notify
}: {
  onBack: () => void,
  isEmbedded?: boolean,
  onActiveChange?: (active: boolean) => void,
  initialLevel?: keyof typeof LEVELS,
  autoStart?: boolean,
  onComplete?: (success: boolean) => void,
  customGrid?: { rows: number, cols: number },
  pregeneratedGrid?: Cell[][],
  notify?: (msg: string, type: 'success' | 'error' | 'info') => void
}) {
  const [level, setLevel] = useState<keyof typeof LEVELS | 'custom'>(customGrid ? 'custom' : (initialLevel || 'easy'));
  const [gridConfig, setGridConfig] = useState({ rows: 6, cols: 8, time: 300 });
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [selection, setSelection] = useState<Point | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost' | 'menu'>(autoStart ? 'playing' : 'menu');
  const [score, setScore] = useState(0);
  const [path, setPath] = useState<Point[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    if (autoStart) {
      if (customGrid) initCustomGame(customGrid.rows, customGrid.cols);
      else if (initialLevel) initGame(initialLevel);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoStart, initialLevel, customGrid]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (onActiveChange) {
      onActiveChange(gameState !== 'menu');
    }
  }, [gameState, onActiveChange]);

  const initCustomGame = useCallback((rows: number, cols: number) => {
    const totalTiles = rows * cols;
    const maxFruits = Math.min(16, Math.max(8, Math.floor(totalTiles / 4)));
    const newGrid = setupGrid(rows, cols, maxFruits, false);
    startGameWithGrid(rows, cols, 45, 'custom', newGrid);
  }, []);

  const initGame = useCallback((diff: keyof typeof LEVELS) => {
    const { rows, cols, fruits, time } = LEVELS[diff];
    const newGrid = setupGrid(rows, cols, fruits, false);
    startGameWithGrid(rows, cols, time, diff, newGrid);
  }, []);

  const startGameWithGrid = (rows: number, cols: number, timeLimit: number, diffLevel: keyof typeof LEVELS | 'custom', newGrid: Cell[][]) => {
    setGridConfig({ rows, cols, time: timeLimit });
    if (autoStart && pregeneratedGrid) {
      setGrid(pregeneratedGrid);
    } else {
      setGrid(newGrid);
    }
    setGameState('playing');
    setTimeLeft(timeLimit);
    setScore(0);
    setSelection(null);
    setPath([]);
    setLevel(diffLevel);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('lost');
          if (timerRef.current) clearInterval(timerRef.current);
          if (onComplete) { setTimeout(() => onComplete(false), 2000); }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCellClick = (r: number, c: number) => {
    if (gameState !== 'playing' || grid[r][c].fruit === null) return;
    playSound('click');
    triggerHaptic('light');

    if (!selection) {
      setSelection({ r, c });
    } else {
      if (selection.r === r && selection.c === c) {
        setSelection(null);
        return;
      }

      if (grid[r][c].fruit === grid[selection.r][selection.c].fruit) {
        const foundPath = checkConnection(grid, selection, { r, c });
        if (foundPath) {
          setPath(foundPath);
          setTimeout(() => {
            const newGrid = [...grid.map(row => [...row])];
            newGrid[r][c].fruit = null;
            newGrid[selection.r][selection.c].fruit = null;
            const shiftedGrid = handleLevelMechanics(newGrid, level);
            setGrid(shiftedGrid);
            setPath([]);
            setSelection(null);
            setScore(prev => prev + 20);
            playSound('correct');
            triggerHaptic('medium');
            if (shiftedGrid.every(row => row.every(cell => cell.fruit === null))) {
              setGameState('won');
              if (timerRef.current) clearInterval(timerRef.current);
              window.dispatchEvent(new CustomEvent('MINIGAME_WIN', { detail: { difficulty: level } }));
              if (onComplete) {
                setTimeout(() => onComplete(true), 2000);
              }
            } else {
              const validMoves = findAllValidPairs(shiftedGrid);
              if (validMoves.length === 0) {
                setTimeout(() => {
                  doShiftGrid(shiftedGrid);
                  notify?.('Không còn nước đi! Tự động xáo trộn...', 'info');
                }, 500);
              }
            }
          }, 200);
        } else setSelection({ r, c });
      } else setSelection({ r, c });
    }
  };

  const doShiftGrid = (currentGrid?: Cell[][]) => {
    playSound('click');
    triggerHaptic('medium');
    const targetGrid = currentGrid || grid;
    const result = shiftGrid(targetGrid);
    setGrid(result);
    setSelection(null);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      {gameState === 'menu' ? (
        <FruitGameMenu onSelectDifficulty={initGame} />
      ) : (
        <FruitGameBoard
          grid={grid}
          selection={selection}
          path={path}
          timeLeft={timeLeft}
          score={score}
          gameState={gameState}
          level={level}
          gridConfig={gridConfig}
          isMobile={isMobile}
          autoStart={autoStart}
          onComplete={onComplete}
          onBack={() => setGameState('menu')}
          onCellClick={handleCellClick}
        />
      )}
    </div>
  );
}
