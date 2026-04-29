import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Trophy, XCircle, Bomb, Apple, Brain, Layers, Search, MousePointer2 } from 'lucide-react';
import { FruitCell, FruitPoint, generateSolvableFruitGrid, findFruitPath, findAnyMove, cloneFruitGrid } from './minigameUtils';

// ==========================================
// Utils (Audio & Haptic)
// ==========================================
const playSound = (type: 'click' | 'correct' | 'wrong' | 'success' | 'tick') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(800, ctx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch (e) {}
};

const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      if (type === 'light') navigator.vibrate(10);
      else if (type === 'medium') navigator.vibrate(30);
      else if (type === 'heavy') navigator.vibrate([40, 30, 40]);
    } catch (e) {}
  }
};

interface PickupMinigameProps {
  type: 'fishing' | 'diving' | 'chest'; // fishing=Fruit, diving=Memory, chest=Minesweeper
  difficulty: number; // 1=Common, 2=Uncommon, 3=Rare, 4=Legendary
  tier: number; // 0=0g, 1=10g, etc.
  onWin: () => void;
  onLose: () => void;
  onClose: () => void;
}

// ==========================================
// 1. Fruit Game (Fishing Alternative)
// ==========================================
type FruitCell = { f: string | null; id: string };
type FruitPoint = { r: number; c: number };
type FruitPathState = { selection: FruitPoint | null; activePath: FruitPoint[] };

const FRUITS = ['🍎', '🍌', '🍇', '🍉', '🍊', '🍓', '🍍', '🍒', '🥝', '🥭'];
const FRUIT_PATH_COLORS = ['#34d399', '#22d3ee', '#f59e0b', '#a78bfa'];

const FruitGame: React.FC<{ tier: number; onWin: () => void; onLose: () => void; preGeneratedGrid?: FruitCell[][] }> = ({ tier, onWin, onLose, preGeneratedGrid }) => {
  let innerRows = Math.min(7, 4 + Math.floor(tier / 2));
  let innerCols = Math.min(7, 4 + Math.ceil(tier / 2));
  if ((innerRows * innerCols) % 2 !== 0) {
    if (innerCols < 7) innerCols += 1;
    else if (innerRows < 7) innerRows += 1;
  }
  const boardRows = innerRows + 2;
  const boardCols = innerCols + 2;
  const config = { rows: innerRows, cols: innerCols, time: Math.max(20, 60 - tier * 5) };

  const [grid, setGrid] = useState<FruitCell[][]>([]);
  const [selection, setSelection] = useState<FruitPoint | null>(null);
  const [activePath, setActivePath] = useState<FruitPoint[]>([]);
  const [timeLeft, setTimeLeft] = useState(config.time);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [isShaking, setIsShaking] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkWin = useCallback((nextGrid: FruitCell[][]) => {
    const hasAnyFruit = nextGrid.slice(1, -1).some(row => row.slice(1, -1).some(cell => cell.f));
    if (!hasAnyFruit) {
      setGameState('won');
      playSound('success');
      setTimeout(onWin, 1200);
    }
  }, [onWin]);

  useEffect(() => {
    const nextGrid = preGeneratedGrid || generateSolvableFruitGrid(innerRows, innerCols);

    setGrid(nextGrid);
    setSelection(null);
    setActivePath([]);
    setGameState('playing');
    setTimeLeft(config.time);
    setIsShaking(false);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          setGameState('lost');
          setTimeout(() => { onLose(); }, 1200);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, []); // Only run once on mount

  const handleCellClick = (r: number, c: number) => {
    if (gameState !== 'playing' || !grid[r][c].f) return;
    if (selection && selection.r === r && selection.c === c) {
      setSelection(null);
      return;
    }

    playSound('click');
    triggerHaptic('light');

    if (!selection) {
      setSelection({ r, c });
      return;
    }

    const first = grid[selection.r][selection.c];
    const second = grid[r][c];
    if (!first.f || !second.f) return;

    if (first.f !== second.f) {
      setSelection({ r, c });
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 180);
      return;
    }

    const path = findFruitPath(grid, selection, { r, c });
    if (!path) {
      setIsShaking(true);
      playSound('wrong');
      setTimeout(() => {
        setSelection(null);
        setIsShaking(false);
      }, 250);
      return;
    }

    setActivePath(path);
    setTimeout(() => {
      const nextGrid = cloneFruitGrid(grid);
      nextGrid[selection.r][selection.c].f = null;
      nextGrid[r][c].f = null;
      
      setSelection(null);
      setActivePath([]);
      playSound('correct');
      triggerHaptic('medium');

      setGrid(nextGrid);
      checkWin(nextGrid);
    }, 280);
  };

  const pathSegments = activePath.length > 1
    ? activePath.slice(0, -1).map((point, index) => ({
        key: `${point.r}-${point.c}-${index}`,
        x1: ((point.c + 0.5) / boardCols) * 100,
        y1: ((point.r + 0.5) / boardRows) * 100,
        x2: ((activePath[index + 1].c + 0.5) / boardCols) * 100,
        y2: ((activePath[index + 1].r + 0.5) / boardRows) * 100,
        color: FRUIT_PATH_COLORS[index % FRUIT_PATH_COLORS.length],
      }))
    : [];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex justify-between w-full px-2 text-xs font-black text-emerald-400 uppercase tracking-widest">
        <span>Fruit Harvest</span>
        <span>⏱️ {timeLeft}s</span>
      </div>

      <div className={`relative w-full max-h-[50vh] overflow-auto bg-black/40 p-2 rounded-xl border border-white/10 ${isShaking ? 'animate-[shake_0.18s_ease-in-out_1]' : ''}`}>
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${boardCols}, minmax(0, 1fr))` }}
        >
          {grid.map((row, r) => row.map((cell, c) => {
            const isSelected = selection?.r === r && selection?.c === c;
            const isPathNode = activePath.some(p => p.r === r && p.c === c);
            const isBorder = r === 0 || c === 0 || r === boardRows - 1 || c === boardCols - 1;

            return (
              <button
                key={cell.id}
                onClick={() => handleCellClick(r, c)}
                className={`aspect-square min-w-0 flex items-center justify-center rounded-lg transition-all text-lg md:text-xl font-black ${isBorder ? 'bg-transparent pointer-events-none' : 'bg-white/10 hover:bg-white/20 active:scale-90'} ${isSelected ? 'ring-2 ring-emerald-400 scale-95' : ''} ${isPathNode ? 'ring-2 ring-cyan-300' : ''}`}
              >
                <span className={`${cell.f ? 'drop-shadow-md' : 'opacity-0'}`}>{cell.f || '·'}</span>
              </button>
            );
          }))}
        </div>

        {pathSegments.length > 0 && (
          <svg
            className="absolute inset-0 pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {pathSegments.map(seg => (
              <line
                key={seg.key}
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                stroke={seg.color}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeDasharray="4 3"
                opacity="0.92"
              />
            ))}
          </svg>
        )}
      </div>

      {gameState !== 'playing' && <p className="font-black text-white">{gameState === 'won' ? '✅ THÀNH CÔNG!' : '❌ THẤT BẠI'}</p>}
    </div>
  );
};

// ==========================================
// 2. Memory Game (Diving Alternative)
// ==========================================
const MemoryGame: React.FC<{ tier: number; difficulty: number; onWin: () => void; onLose: () => void }> = ({ tier, difficulty, onWin, onLose }) => {
  const ICONS = ['🐬', '🐚', '🦀', '🐳', '🐡', '🐙', '🦈', '🐠', '🧜‍♀️', '🔱', '⚓', '🌊'];
  const effectiveTier = tier + Math.max(0, difficulty - 1);
  const rows = Math.min(7, 4 + Math.floor(effectiveTier / 2));
  const cols = Math.min(7, 4 + Math.ceil(effectiveTier / 2));
  const config = { rows, cols, time: Math.max(20, 60 - effectiveTier * 5) };

  const [cards, setCards] = useState<{v: string, f: boolean, m: boolean}[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(config.time);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');

  useEffect(() => {
    const total = config.rows * config.cols;
    const icons = [];
    const pairs = Math.floor(total / 2);
    for (let i = 0; i < pairs; i++) {
      const icon = ICONS[i % ICONS.length];
      icons.push(icon, icon);
    }
    if (total % 2 !== 0) icons.push('🐚'); // Filler for odd grids
    icons.sort(() => Math.random() - 0.5);
    setCards(icons.map(v => ({ v, f: false, m: false })));

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { 
          clearInterval(timer); 
          setGameState('lost'); 
          setTimeout(() => { if (gameState === 'lost') onLose(); }, 1500); 
          return 0; 
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClick = (idx: number) => {
    if (gameState !== 'playing' || flipped.length === 2 || cards[idx].f || cards[idx].m) return;
    playSound('click');
    const newCards = [...cards];
    newCards[idx].f = true;
    setCards(newCards);
    const newFlipped = [...flipped, idx];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      const [i1, i2] = newFlipped;
      if (cards[i1].v === cards[i2].v) {
        setTimeout(() => {
          setCards(prev => {
            const up = [...prev];
            up[i1].m = true;
            up[i2].m = true;
            if (up.every(c => c.m)) {
              setGameState('won');
              playSound('success');
              setTimeout(onWin, 1500);
            } else {
              playSound('correct');
            }
            return up;
          });
          setFlipped([]);
        }, 500);
      } else {
        setTimeout(() => {
          setCards(prev => {
            const up = [...prev];
            up[i1].f = false;
            up[i2].f = false;
            return up;
          });
          setFlipped([]);
          playSound('wrong');
        }, 800);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex justify-between w-full px-2 text-xs font-black text-blue-400 uppercase tracking-widest">
        <span>Memory Dive</span>
        <span>⏱️ {timeLeft}s</span>
      </div>
      <div className="grid gap-1 bg-black/40 p-2 rounded-xl border border-white/10 overflow-auto max-h-[50vh]" style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)` }}>
        {cards.map((card, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            className={`w-11 h-11 md:w-14 md:h-14 flex items-center justify-center text-xl rounded-lg transition-all ${
              card.f || card.m ? 'bg-white rotate-0' : 'bg-blue-600/40 rotate-180'
            }`}
          >
            {(card.f || card.m) ? card.v : '❓'}
          </button>
        ))}
      </div>
      {gameState !== 'playing' && <p className="font-black text-white">{gameState === 'won' ? '✅ THÀNH CÔNG!' : '❌ THẤT BẠI'}</p>}
    </div>
  );
};

// ==========================================
// 3. Minesweeper (Chest Alternative)
// ==========================================
const Minesweeper: React.FC<{ tier: number; difficulty: number; onWin: () => void; onLose: () => void }> = ({ tier, difficulty, onWin, onLose }) => {
  const effectiveTier = tier + Math.max(0, difficulty - 1);
  const rows = Math.min(7, 4 + Math.floor(effectiveTier / 2));
  const cols = Math.min(7, 4 + Math.ceil(effectiveTier / 2));
  const config = { rows, cols, mines: Math.floor(rows * cols * (0.15 + effectiveTier * 0.02)), time: Math.max(20, 60 - effectiveTier * 5) };

  const [grid, setGrid] = useState<{m: boolean, o: boolean, n: number}[][]>([]);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [timeLeft, setTimeLeft] = useState(config.time);

  useEffect(() => {
    const newGrid = Array(rows).fill(0).map(() => Array(cols).fill(0).map(() => ({ m: false, o: false, n: 0 })));
    let m = 0;
    while (m < config.mines) {
      const r = Math.floor(Math.random() * config.rows);
      const c = Math.floor(Math.random() * config.cols);
      if (!newGrid[r][c].m) { newGrid[r][c].m = true; m++; }
    }
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        if (newGrid[r][c].m) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && newGrid[nr][nc].m) count++;
          }
        }
        newGrid[r][c].n = count;
      }
    }
    setGrid(newGrid);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { 
          clearInterval(timer); 
          setGameState('lost'); 
          setTimeout(() => { if (gameState === 'lost') onLose(); }, 1500); 
          return 0; 
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const open = (r: number, c: number) => {
    if (gameState !== 'playing' || grid[r][c].o) return;
    playSound('click');
    const newGrid = [...grid.map(row => [...row])];
    if (newGrid[r][c].m) {
      newGrid[r][c].o = true;
      setGameState('lost');
      playSound('wrong');
      setTimeout(onLose, 1500);
    } else {
      const reveal = (row: number, col: number) => {
        if (row < 0 || row >= config.rows || col < 0 || col >= config.cols || newGrid[row][col].o) return;
        newGrid[row][col].o = true;
        if (newGrid[row][col].n === 0) {
          for (let dr = -1; dr <= 1; dr++)
            for (let dc = -1; dc <= 1; dc++) reveal(row + dr, col + dc);
        }
      };
      reveal(r, c);
      if (newGrid.every(row => row.every(cell => cell.m || cell.o))) {
        setGameState('won');
        playSound('success');
        setTimeout(onWin, 1500);
      } else {
        playSound('correct');
      }
    }
    setGrid(newGrid);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex justify-between w-full px-2 text-xs font-black text-red-400 uppercase tracking-widest">
        <span>Safe Chest</span>
        <span>⏱️ {timeLeft}s</span>
      </div>
      <div className="grid gap-1 bg-black/40 p-2 rounded-xl border border-white/10 overflow-auto max-h-[50vh]" style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)` }}>
        {grid.map((row, r) => row.map((cell, c) => (
          <button
            key={`${r}-${c}`}
            onClick={() => open(r, c)}
            className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-sm font-black rounded ${
              cell.o ? (cell.m ? 'bg-red-600' : 'bg-white/20 text-white') : 'bg-red-900/40 hover:bg-red-800/40 active:scale-90'
            }`}
          >
            {cell.o ? (cell.m ? '💣' : (cell.n || '')) : ''}
          </button>
        )))}
      </div>
      {gameState !== 'playing' && <p className="font-black text-white">{gameState === 'won' ? '✅ THÀNH CÔNG!' : '❌ BÙM!'}</p>}
    </div>
  );
};

interface PickupMinigameProps {
  type: 'fishing' | 'diving' | 'chest'; // fishing=Fruit, diving=Memory, chest=Minesweeper
  difficulty: number; // 1=Common, 2=Uncommon, 3=Rare, 4=Legendary
  tier: number; // 0=0g, 1=10g, etc.
  onWin: () => void;
  onLose: () => void;
  onClose: () => void;
  preGeneratedGrid?: any;
}

// ==========================================
// Main Wrapper
// ==========================================
const PickupMinigame: React.FC<PickupMinigameProps> = ({ type, difficulty, tier, onWin, onLose, onClose, preGeneratedGrid }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-gradient-to-b from-[#0d2137] to-[#0a1929] border border-cyan-600/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white text-sm font-bold z-10">✕</button>
        
        <div className="text-center mb-4">
          <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Mini Game</h2>
          <div className="flex justify-center gap-1 mt-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`w-3 h-1.5 rounded-full ${i < difficulty ? 'bg-cyan-400' : 'bg-white/10'}`} />
            ))}
          </div>
          <p className="text-[11px] font-bold text-cyan-400 mt-1 uppercase tracking-widest bg-cyan-950/30 px-3 py-1 rounded-full border border-cyan-800/30">
            Cấp độ thế giới: {tier}
          </p>
        </div>

        {type === 'fishing' && <FruitGame tier={tier} onWin={onWin} onLose={onLose} preGeneratedGrid={preGeneratedGrid} />}
        {type === 'diving' && <MemoryGame tier={tier} difficulty={difficulty} onWin={onWin} onLose={onLose} />}
        {type === 'chest' && <Minesweeper tier={tier} difficulty={difficulty} onWin={onWin} onLose={onLose} />}
      </motion.div>
    </motion.div>
  );
};

export default PickupMinigame;
