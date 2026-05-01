import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Timer, RefreshCw, Trophy, XCircle, Zap, ChevronLeft, Layers, Apple } from 'lucide-react';
import { playSound, triggerHaptic } from './utils';
import { motion, AnimatePresence } from 'framer-motion';

// Constants for 3 difficulty levels
const LEVELS = {
  easy: { rows: 6, cols: 8, fruits: 8, time: 300, name: 'EASY' },
  medium: { rows: 8, cols: 10, fruits: 12, time: 300, name: 'MEDIUM' },
  hard: { rows: 8, cols: 12, fruits: 16, time: 300, name: 'HARD' }
};

const FRUITS = [
  '🍎', '🍌', '🍇', '🍉', '🍊', '🍓', '🍍', '🍒',
  '🥝', '🥭', '🍐', '🍑', '🍋', '🫐', '🥑', '🐲'
];

type Point = { r: number, c: number };
type Cell = { fruit: string | null, id: number };

export function FruitGame({
  onBack,
  isEmbedded = false,
  onActiveChange,
  initialLevel,
  autoStart = false,
  onComplete,
  customGrid
}: {
  onBack: () => void,
  isEmbedded?: boolean,
  onActiveChange?: (active: boolean) => void,
  initialLevel?: keyof typeof LEVELS,
  autoStart?: boolean,
  onComplete?: (success: boolean) => void,
  customGrid?: { rows: number, cols: number }
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
    // ensure fruit types are enough
    const maxFruits = Math.min(16, Math.max(8, Math.floor(totalTiles / 4)));
    setupGrid(rows, cols, maxFruits, 45, 'custom');
  }, []);

  const initGame = useCallback((diff: keyof typeof LEVELS) => {
    const { rows, cols, fruits, time } = LEVELS[diff];
    setupGrid(rows, cols, fruits, time, diff);
  }, []);

  const setupGrid = (rows: number, cols: number, fruitCount: number, timeLimit: number, diffLevel: keyof typeof LEVELS | 'custom') => {
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

    setGridConfig({ rows, cols, time: timeLimit });
    setGrid(newGrid);
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
          if (onComplete) {
            setTimeout(() => onComplete(false), 2000);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const gridRef = useRef<HTMLDivElement>(null);

  const checkConnection = (currentGrid: Cell[][], p1: Point, p2: Point): Point[] | null => {
    const rows = currentGrid.length;
    const cols = currentGrid[0].length;

    const isPassable = (r: number, c: number) => {
      if (r === p2.r && c === p2.c) return true;
      if (r < -1 || r > rows || c < -1 || c > cols) return false;
      if (r === -1 || r === rows || c === -1 || c === cols) return true;
      return currentGrid[r][c].fruit === null;
    };

    const queue: { r: number, c: number, dir: number, turns: number, path: Point[] }[] = [
      { r: p1.r, c: p1.c, dir: -1, turns: 0, path: [p1] }
    ];

    const visited = new Map<string, number>();

    while (queue.length > 0) {
      const { r, c, dir, turns, path: currentPath } = queue.shift()!;

      if (r === p2.r && c === p2.c) return currentPath;
      if (turns > 2) continue;

      const dr = [-1, 0, 1, 0];
      const dc = [0, 1, 0, -1];

      for (let i = 0; i < 4; i++) {
        const nr = r + dr[i];
        const nc = c + dc[i];

        if (nr < -1 || nr > rows || nc < -1 || nc > cols) continue;
        if (!isPassable(nr, nc)) continue;

        const newTurns = (dir === -1 || dir === i) ? turns : turns + 1;
        if (newTurns > 2) continue;

        const key = `${nr},${nc},${i}`;
        if (!visited.has(key) || visited.get(key)! > newTurns) {
          visited.set(key, newTurns);
          queue.push({ r: nr, c: nc, dir: i, turns: newTurns, path: [...currentPath, { r: nr, c: nc }] });
        }
      }
    }
    return null;
  };

  const handleLevelMechanics = (newGrid: Cell[][]) => {
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
            const shiftedGrid = handleLevelMechanics(newGrid);
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
            }
          }, 200);
        } else setSelection({ r, c });
      } else setSelection({ r, c });
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${rs < 10 ? '0' : ''}${rs}`;
  };

  const shiftGrid = () => {
    playSound('click');
    triggerHaptic('medium');
    const allFruits = grid.flatMap(row => row.map(c => c.fruit)).filter(f => f !== null) as string[];
    for (let i = allFruits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allFruits[i], allFruits[j]] = [allFruits[j], allFruits[i]];
    }
    const newGrid = grid.map(row => row.map(cell => {
      if (cell.fruit === null) return cell;
      return { ...cell, fruit: allFruits.pop()! };
    }));
    setGrid(newGrid);
    setSelection(null);
  };

  const getCellCoord = (p: Point) => {
    if (!gridRef.current) return { x: 0, y: 0 };
    const rect = gridRef.current.getBoundingClientRect();
    const rows = grid.length;
    const cols = grid[0].length;
    const cellW = rect.width / cols;
    const cellH = rect.height / rows;
    return { x: (p.c + 0.5) * cellW, y: (p.r + 0.5) * cellH };
  };

  const maxCellSize = level === 'easy' ? 45 : level === 'medium' ? 38 : 32;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      {gameState === 'menu' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 w-full max-w-sm mx-auto overflow-y-auto no-scrollbar">
          {/* Animated Icon Section - EMERALD */}
          <div className="w-20 h-20 bg-emerald-100 rounded-[35px] flex items-center justify-center mb-4 shadow-sm border-4 border-white animate-bounce-slow shrink-0">
            <Apple size={40} className="text-emerald-500 fill-emerald-50" />
          </div>

          {/* Unified Header - EMERALD */}
          <h2 className="font-bubbly text-3xl text-white mb-1 uppercase tracking-widest italic">FRUIT HARVEST</h2>
          <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-8 text-center leading-relaxed px-4">
            Connect identical fruits with paths that have no more than two turns!
          </p>

          {/* Difficulty Selection */}
          <div className="w-full">
            <label className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-4 block px-2 text-center italic">SELECT HARVEST LEVEL</label>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.keys(LEVELS).map((diff) => (
                <button
                  key={diff}
                  aria-label={`Select ${LEVELS[diff as keyof typeof LEVELS].name} difficulty`}
                  onClick={() => initGame(diff as keyof typeof LEVELS)}
                  className="group bg-white/80 hover:bg-emerald-500 p-1.5 md:p-3 rounded-2xl flex flex-col items-center justify-center border-2 border-slate-100 hover:border-emerald-300 transition-all active:scale-95 shadow-sm"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="font-black text-[10px] md:text-xs text-slate-700 group-hover:text-white uppercase italic tracking-tighter">{LEVELS[diff as keyof typeof LEVELS].name}</span>
                    <span className="text-[7px] md:text-[8px] font-black text-slate-400 group-hover:text-emerald-100 uppercase tracking-widest">{LEVELS[diff as keyof typeof LEVELS].rows}x{LEVELS[diff as keyof typeof LEVELS].cols}</span>
                  </div>
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-emerald-50 group-hover:bg-emerald-400 flex items-center justify-center text-emerald-500 group-hover:text-white transition-colors mt-0 md:mt-1">
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
            {/* Header Dashboard - Top on PC */}
            <div
              className="flex flex-row justify-center items-center w-fit bg-white/20 p-2 md:px-6 md:py-3 rounded-xl md:rounded-[30px] backdrop-blur-sm border border-white/30 shrink-0 mx-auto"
              style={{ maxWidth: `min(96vw, ${(gridConfig.cols / gridConfig.rows) * 40}vh)`, WebkitBackdropFilter: 'blur(4px)' }}
            >
              <div className="flex flex-row gap-8 md:gap-16 items-center">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
                    <Timer size={12} className={`${timeLeft < 30 ? 'text-red-400 animate-pulse' : 'text-emerald-300'}`} />
                    <span className={`text-xs md:text-xl font-black tabular-nums ${timeLeft < 30 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                      {formatTime(timeLeft)}
                    </span>
                  </div>

                </div>

                <div className="flex flex-col items-center">
                  <span className="text-[8px] md:text-[10px] font-black text-white/60 uppercase tracking-widest">Score</span>
                  <span className="font-black text-xl md:text-3xl text-white tabular-nums leading-none">{score}</span>
                </div>
              </div>
            </div>

            {/* Navigation Button Container - Absolute Top Right */}
            <div className="absolute top-1 md:top-2 right-1 md:right-2 z-40 flex items-center gap-2">
              {autoStart && onComplete && (
                <button
                  onClick={() => {
                    playSound('click');
                    triggerHaptic('medium');
                    onComplete(false);
                  }}
                  className="px-3 py-1.5 md:px-4 md:py-2 bg-red-500/20 hover:bg-red-500/40 text-white rounded-xl font-black text-[9px] md:text-[10px] border border-red-500/30 transition-all flex items-center gap-2"
                >
                  <Apple size={12} />
                  GIVE UP
                </button>
              )}

              {!autoStart && (
                <button
                  aria-label="Back to Menu"
                  onClick={() => { playSound('click'); setGameState('menu'); }}
                  className="w-8 h-8 md:w-10 md:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform text-white border border-white/20 shrink-0"
                  style={{ WebkitBackdropFilter: 'blur(12px)' }}
                >
                  <XCircle size={20} />
                </button>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center w-full">
              {/* Grid Area Wrapper - Glassmorphism */}
              <div
                className="p-2 md:p-4 bg-white/30 backdrop-blur-sm rounded-[30px] border-2 border-white/50 flex items-center justify-center z-10 shadow-inner overflow-hidden mx-auto"
                style={{
                  width: '100%',
                  WebkitBackdropFilter: 'blur(4px)',
                  maxWidth: isMobile
                    ? `min(96vw, ${(gridConfig.cols / gridConfig.rows) * 45}vh)`
                    : `min(96vw, ${(gridConfig.cols / gridConfig.rows) * 55}vh)`
                }}
              >
                <div
                  ref={gridRef}
                  className="grid gap-1 md:gap-1.5 w-full h-full select-none relative"
                  style={{
                    gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
                    aspectRatio: `${gridConfig.cols}/${gridConfig.rows}`
                  }}
                >
                  {grid.map((row, r) =>
                    row.map((cell, c) => (
                      <button
                        key={`${r}-${c}`}
                        onClick={() => handleCellClick(r, c)}
                        className={`aspect-square rounded-md md:rounded-lg flex items-center justify-center text-sm md:text-2xl transition-all duration-200 w-full h-full
                            ${cell.fruit === null ? 'opacity-0 pointer-events-none' : 'bg-white shadow-[0_2px_0_0_#e2e8f0] md:shadow-[0_4px_0_0_#e2e8f0] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none'}
                            ${selection?.r === r && selection?.c === c ? ' ring-2 md:ring-4 ring-emerald-400 ring-offset-1 scale-105 z-10' : ''}
                          `}
                      >
                        <span className="text-2xl md:text-5xl leading-none flex items-center justify-center">{cell.fruit}</span>
                      </button>
                    ))
                  )}

                  {path.length > 1 && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible">
                      <polyline points={path.map(p => { const { x, y } = getCellCoord(p); return `${x},${y}`; }).join(' ')} fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse" style={{ filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.8))' }} />
                    </svg>
                  )}
                </div>
              </div>

              {/* Hint */}
              <p className="text-[7px] md:text-[10px] font-black text-white/80 uppercase tracking-widest text-center mt-2 md:mt-4 z-10 opacity-80">
                Connect identical fruits! Max 2 turns.
              </p>
            </div>

            {/* Result Overlay */}
            <AnimatePresence>
              {(gameState === 'won' || gameState === 'lost') && (
                <motion.div
                  initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                  animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
                  className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center p-4 md:p-8 text-center rounded-[30px] md:rounded-[40px]"
                  style={{ WebkitBackdropFilter: 'blur(8px)' }}
                >
                  <motion.div
                    initial={{ scale: 0.8, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="w-full max-w-xs md:max-w-sm bg-white rounded-[30px] md:rounded-[40px] shadow-2xl border-4 border-emerald-100 p-5 md:p-8 flex flex-col items-center"
                  >
                    <div className={`w-16 h-16 md:w-20 md:h-20 rounded-[25px] md:rounded-[35px] flex items-center justify-center mb-3 shadow-xl border-4 border-white animate-bounce-slow ${gameState === 'won' ? 'bg-yellow-400' : 'bg-red-500'}`}>
                      {gameState === 'won' ? <Trophy size={32} className="text-white fill-white" /> : <XCircle size={32} className="text-white" />}
                    </div>

                    <h3 className="font-bubbly text-3xl md:text-4xl text-emerald-600 mb-1 uppercase italic tracking-tighter">
                      {gameState === 'won' ? 'PERFECT!' : "TIME'S UP!"}
                    </h3>
                    <div className="space-y-3 md:space-y-4 w-full">
                      <p className="font-black text-slate-400 uppercase tracking-[0.2em] text-[10px]">
                        {gameState === 'won' ? 'Board Cleared!' : 'Fruit Harvest Interrupted'}
                      </p>
                      <div className="bg-slate-50 rounded-2xl md:rounded-3xl p-3 md:p-4 flex justify-around items-center border border-slate-100 shadow-inner">
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Score</p>
                          <p className="font-black text-lg md:text-xl text-emerald-600 mt-1">{score}</p>
                        </div>
                        <div className="w-px h-6 bg-slate-200"></div>
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Time</p>
                          <p className="font-black text-lg md:text-xl text-slate-700 mt-1">{formatTime(timeLeft)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 w-full mt-4 md:mt-6">
                      <button onClick={() => { level === 'custom' ? initCustomGame(gridConfig.rows, gridConfig.cols) : initGame(level as keyof typeof LEVELS) }} className="w-full py-3 md:py-4 bg-emerald-500 text-white rounded-2xl md:rounded-3xl font-black uppercase tracking-wider shadow-lg active:translate-y-1 transition-all text-sm md:text-base">TRY AGAIN</button>
                      {!autoStart && <button onClick={() => setGameState('menu')} className="w-full py-2 bg-transparent text-slate-400 font-bold uppercase tracking-wider active:text-slate-600 transition-all text-[10px] md:text-xs">Back to Menu</button>}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
