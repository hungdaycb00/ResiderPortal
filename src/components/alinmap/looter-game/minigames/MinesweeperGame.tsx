import React, { useState, useEffect, useCallback } from 'react';
import { Bomb, Flag, Trophy, XCircle, RefreshCw, HelpCircle, Zap, Layers } from 'lucide-react';
import { playSound, triggerHaptic } from './utils';
import { motion, AnimatePresence } from 'framer-motion';

const LEVELS = {
  easy: { size: 4, mines: 3, name: 'EASY' },
  medium: { size: 7, mines: 9, name: 'MEDIUM' },
  hard: { size: 9, mines: 15, name: 'HARD' }
};

type Cell = {
  isMine: boolean;
  isOpened: boolean;
  isFlagged: boolean;
  isQuestion: boolean;
  neighborMines: number;
};

export function MinesweeperGame({
  onActiveChange,
  initialLevel,
  autoStart = false,
  onComplete,
  customGrid
}: {
  onActiveChange?: (active: boolean) => void,
  initialLevel?: keyof typeof LEVELS,
  autoStart?: boolean,
  onComplete?: (success: boolean) => void,
  customGrid?: { rows: number, cols: number }
}) {
  const [level, setLevel] = useState<keyof typeof LEVELS | 'custom'>(customGrid ? 'custom' : (initialLevel || 'medium'));
  const [gridConfig, setGridConfig] = useState({ rows: 5, cols: 5, mines: 4 });
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'won' | 'lost'>(autoStart ? 'playing' : 'menu');
  const [minesLeft, setMinesLeft] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300);

  useEffect(() => {
    if (autoStart) {
      if (customGrid) {
        initCustomGame(customGrid.rows, customGrid.cols);
      } else if (initialLevel) {
        initGame(initialLevel);
      }
    }
  }, [autoStart, initialLevel, customGrid]);

  useEffect(() => {
    if (onActiveChange) {
      onActiveChange(gameState !== 'menu');
    }
  }, [gameState, onActiveChange]);

  const initCustomGame = useCallback((rows: number, cols: number) => {
    const total = rows * cols;
    // Tỉ lệ mìn khoảng 20% cho sảnh chờ
    const mines = Math.max(3, Math.floor(total * 0.20));
    setupGrid(rows, cols, mines, 'custom');
  }, []);

  const initGame = useCallback((diff: keyof typeof LEVELS) => {
    const { size, mines } = LEVELS[diff];
    setupGrid(size, size, mines, diff);
  }, []);

  const setupGrid = (rows: number, cols: number, mines: number, diffLevel: keyof typeof LEVELS | 'custom') => {
    const newGrid: Cell[][] = Array(rows).fill(null).map(() =>
      Array(cols).fill(null).map(() => ({
        isMine: false,
        isOpened: false,
        isFlagged: false,
        isQuestion: false,
        neighborMines: 0,
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
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && newGrid[nr][nc].isMine) {
              count++;
            }
          }
        }
        newGrid[r][c].neighborMines = count;
      }
    }

    setGridConfig({ rows, cols, mines });
    setGrid(newGrid);
    setGameState('playing');
    setMinesLeft(mines);
    setTimeLeft(diffLevel === 'custom' ? 45 : 300);
    setLevel(diffLevel);
  };

  useEffect(() => {
    let interval: any;
    if (gameState === 'playing') {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setGameState('lost');
            playSound('wrong');
            triggerHaptic('heavy');
            if (onComplete) setTimeout(() => onComplete(false), 2000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  const openCell = (r: number, c: number) => {
    if (gameState !== 'playing' || grid[r][c].isOpened || grid[r][c].isFlagged) return;

    playSound('click');
    triggerHaptic('light');

    const { rows, cols } = gridConfig;
    const newGrid = [...grid.map(row => [...row])];

    if (newGrid[r][c].isMine) {
      newGrid[r][c].isOpened = true;
      setGameState('lost');
      playSound('wrong');
      triggerHaptic('heavy');
      newGrid.forEach(row => row.forEach(cell => { if (cell.isMine) cell.isOpened = true; }));
      if (onComplete) {
        setTimeout(() => onComplete(false), 2000);
      }
    } else {
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

      const allOpened = newGrid.every(row => row.every(cell => cell.isMine || cell.isOpened));
      if (allOpened) {
        setGameState('won');
        playSound('success');
        triggerHaptic('heavy');
        window.dispatchEvent(new CustomEvent('MINIGAME_WIN', { detail: { difficulty: level } }));
        if (onComplete) {
          setTimeout(() => onComplete(true), 2000);
        }
      }
    }
    setGrid(newGrid);
  };

  const handleRightClick = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (gameState !== 'playing' || grid[r][c].isOpened) return;

    playSound('click');
    triggerHaptic('light');

    const newGrid = [...grid.map(row => [...row])];
    const cell = newGrid[r][c];

    if (!cell.isFlagged && !cell.isQuestion) {
      cell.isFlagged = true;
      setMinesLeft(prev => prev - 1);
    } else if (cell.isFlagged) {
      cell.isFlagged = false;
      cell.isQuestion = true;
      setMinesLeft(prev => prev + 1);
    } else {
      cell.isQuestion = false;
    }

    setGrid(newGrid);
  };

  const getNumberColor = (num: number) => {
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

  const maxDimension = Math.max(gridConfig.rows, gridConfig.cols);
  const iconSize = maxDimension <= 5 ? 32 : maxDimension <= 7 ? 24 : 18;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      {gameState === 'menu' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 w-full max-w-sm mx-auto overflow-y-auto no-scrollbar">
          {/* Animated Icon Section - RED */}
          <div className="w-20 h-20 bg-red-100 rounded-[35px] flex items-center justify-center mb-4 shadow-sm border-4 border-white animate-bounce-slow shrink-0">
            <Bomb size={40} className="text-red-500 fill-red-50" />
          </div>

          {/* Unified Header - RED */}
          <h2 className="font-bubbly text-3xl text-white mb-1 uppercase tracking-widest italic">MINESWEEPER</h2>
          <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-8 text-center leading-relaxed px-4">
            Clear the grid of hidden mines without triggering any!
          </p>

          {/* Difficulty Selection */}
          <div className="w-full">
            <label className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-4 block px-2 text-center italic">SELECT SCAN LEVEL</label>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.keys(LEVELS).map((diff) => (
                <button
                  key={diff}
                  aria-label={`Select ${LEVELS[diff as keyof typeof LEVELS].name} difficulty`}
                  onClick={() => initGame(diff as keyof typeof LEVELS)}
                  className="group bg-white/80 hover:bg-red-500 p-1.5 md:p-3 rounded-2xl flex flex-col items-center justify-center border-2 border-slate-100 hover:border-red-300 transition-all active:scale-95 shadow-sm"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="font-black text-[10px] md:text-xs text-slate-700 group-hover:text-white uppercase italic tracking-tighter">{LEVELS[diff as keyof typeof LEVELS].name}</span>
                    <span className="text-[7px] md:text-[8px] font-black text-slate-400 group-hover:text-red-100 uppercase tracking-widest">{LEVELS[diff as keyof typeof LEVELS].size}x{LEVELS[diff as keyof typeof LEVELS].size}</span>
                  </div>
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-red-50 group-hover:bg-red-400 flex items-center justify-center text-red-500 group-hover:text-white transition-colors mt-0 md:mt-1">
                    <Layers size={14} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full h-full flex flex-col items-center justify-start relative p-0.5 md:p-4 gap-1 md:gap-4 overflow-hidden"
          >
            {/* Header Dashboard - Absolute Top Center */}
            <div
              className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-row justify-center items-center w-fit bg-white/20 p-1 md:px-6 md:py-3 rounded-xl md:rounded-[30px] backdrop-blur-sm border border-white/30 shrink-0 z-40"
              style={{ WebkitBackdropFilter: 'blur(4px)' }}
            >
              <div className="flex flex-row gap-6 md:gap-16 items-center">
                <div className="flex flex-col items-center">
                  <span className="text-[7px] md:text-[10px] font-black text-white/60 uppercase tracking-widest flex items-center gap-1">Mines</span>
                  <span className="font-black text-lg md:text-3xl text-white tabular-nums leading-none flex items-center gap-1"><Bomb size={10} />{minesLeft}</span>
                </div>

                <div className="flex flex-col px-2 items-center">
                  <span className="text-[7px] md:text-[10px] font-black text-white/60 uppercase tracking-widest flex items-center gap-1">Time</span>
                  <span className="font-black text-lg md:text-3xl text-white tabular-nums leading-none">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Button Container - Absolute Top Right */}
            <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
              {autoStart && onComplete && (
                <button
                  onClick={() => {
                    playSound('click');
                    triggerHaptic('medium');
                    onComplete(false);
                  }}
                  className="w-10 h-10 bg-red-500/20 hover:bg-red-500/40 text-red-100 rounded-xl flex items-center justify-center border border-red-500/30 transition-all active:scale-95 shadow-md backdrop-blur-md"
                >
                  <XCircle size={24} />
                </button>
              )}

              {!autoStart && (
                <button
                  aria-label="Back to Menu"
                  title="Back to Menu"
                  onClick={() => { playSound('click'); setGameState('menu'); }}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform text-white border border-white/20 shrink-0"
                >
                  <XCircle size={24} />
                </button>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center w-full">
              {/* Grid Area */}
              <div
                className="p-1 md:p-4 bg-white/30 backdrop-blur-sm rounded-[30px] border-2 border-white/50 flex items-center justify-center z-10 shadow-inner overflow-hidden mx-auto"
                style={{
                  width: '100%',
                  WebkitBackdropFilter: 'blur(4px)',
                  maxWidth: `min(96vw, ${(gridConfig.cols / gridConfig.rows) * 40}vh)`
                }}
              >
                <div
                  className="grid gap-1 w-full h-full place-items-center"
                  style={{
                    gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
                    aspectRatio: `${gridConfig.cols}/${gridConfig.rows}`
                  }}
                >
                  {grid.map((row, rIdx) =>
                    row.map((cell, cIdx) => (
                      <button
                        key={`${rIdx}-${cIdx}`}
                        onClick={() => openCell(rIdx, cIdx)}
                        onContextMenu={(e) => handleRightClick(e, rIdx, cIdx)}
                        className={`
                        w-full h-full aspect-square rounded-lg transition-all duration-200 transform flex items-center justify-center relative font-black text-sm
                        ${cell.isOpened
                            ? 'bg-white/80 shadow-inner'
                            : 'bg-linear-to-br from-red-400 to-rose-500 shadow-[0_3px_0_0_#9f1239] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none'
                          }
                        ${(gameState === 'lost' || gameState === 'won') && cell.isMine && cell.isOpened ? 'bg-red-600 shadow-none!' : ''}
                      `}
                      >
                        {cell.isOpened ? (
                          cell.isMine ? (
                            <Bomb size={iconSize} className="text-white fill-current animate-bounce" />
                          ) : (
                            <span className={`${getNumberColor(cell.neighborMines)} text-xs`}>
                              {cell.neighborMines > 0 ? cell.neighborMines : ''}
                            </span>
                          )
                        ) : (
                          <>
                            {cell.isFlagged && <Flag size={iconSize - 2} className="text-red-500 fill-current animate-pulse" />}
                            {cell.isQuestion && <HelpCircle size={iconSize - 2} className="text-white/40" />}
                          </>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Hint */}
              <p className="text-[7px] md:text-[10px] font-black text-white/80 uppercase tracking-widest text-center mt-2 md:mt-4 z-10 opacity-80">
                Clear tiles. Flag bombs!
              </p>
            </div>

            {/* Result Message */}
            <AnimatePresence>
              {gameState === 'won' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
                >
                  <h2 className="text-4xl md:text-6xl font-black text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.8)] italic uppercase tracking-tighter animate-bounce">
                    THÀNH CÔNG!
                  </h2>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
