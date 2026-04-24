import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Trophy, XCircle, Bomb, Apple, Brain, Layers, Search, MousePointer2 } from 'lucide-react';

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
  onWin: () => void;
  onLose: () => void;
  onClose: () => void;
}

// ==========================================
// 1. Fruit Game (Fishing Alternative)
// ==========================================
const FruitGame: React.FC<{ diff: number; onWin: () => void; onLose: () => void }> = ({ diff, onWin, onLose }) => {
  const FRUITS = ['🍎', '🍌', '🍇', '🍉', '🍊', '🍓', '🍍', '🍒', '🥝', '🥭'];
  const config = {
    1: { rows: 4, cols: 4, time: 60 },
    2: { rows: 4, cols: 5, time: 50 },
    3: { rows: 5, cols: 6, time: 40 },
    4: { rows: 6, cols: 6, time: 30 },
  }[diff as 1|2|3|4] || { rows: 4, cols: 4, time: 60 };

  const [grid, setGrid] = useState<{f: string | null, id: number}[][]>([]);
  const [selection, setSelection] = useState<{r: number, c: number} | null>(null);
  const [timeLeft, setTimeLeft] = useState(config.time);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');

  useEffect(() => {
    const total = config.rows * config.cols;
    const tiles: string[] = [];
    for (let i = 0; i < total / 2; i++) {
      const f = FRUITS[i % FRUITS.length];
      tiles.push(f, f);
    }
    tiles.sort(() => Math.random() - 0.5);
    const newGrid = [];
    let idx = 0;
    for (let r = 0; r < config.rows; r++) {
      const row = [];
      for (let c = 0; c < config.cols; c++) {
        row.push({ f: tiles[idx++], id: idx });
      }
      newGrid.push(row);
    }
    setGrid(newGrid);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); setGameState('lost'); setTimeout(onLose, 1500); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCellClick = (r: number, c: number) => {
    if (gameState !== 'playing' || !grid[r][c].f) return;
    playSound('click');
    triggerHaptic('light');

    if (!selection) {
      setSelection({ r, c });
    } else {
      if (selection.r === r && selection.c === c) { setSelection(null); return; }
      if (grid[r][c].f === grid[selection.r][selection.c].f) {
        // Simplified connection: any pair matches for Sea Game speed
        const newGrid = [...grid.map(row => [...row])];
        newGrid[r][c].f = null;
        newGrid[selection.r][selection.c].f = null;
        setGrid(newGrid);
        setSelection(null);
        playSound('correct');
        if (newGrid.every(row => row.every(cell => cell.f === null))) {
          setGameState('won');
          playSound('success');
          setTimeout(onWin, 1500);
        }
      } else {
        setSelection({ r, c });
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex justify-between w-full px-2 text-xs font-black text-emerald-400 uppercase tracking-widest">
        <span>Fruit Harvest</span>
        <span>⏱️ {timeLeft}s</span>
      </div>
      <div className="grid gap-1 bg-black/40 p-2 rounded-xl border border-white/10" style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)` }}>
        {grid.map((row, r) => row.map((cell, c) => (
          <button
            key={cell.id}
            onClick={() => handleCellClick(r, c)}
            className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-xl rounded-lg transition-all ${
              cell.f ? 'bg-white/10 hover:bg-white/20 active:scale-90' : 'opacity-0'
            } ${selection?.r === r && selection?.c === c ? 'ring-2 ring-emerald-400' : ''}`}
          >
            {cell.f}
          </button>
        )))}
      </div>
      {gameState !== 'playing' && <p className="font-black text-white">{gameState === 'won' ? '✅ THÀNH CÔNG!' : '❌ THẤT BẠI'}</p>}
    </div>
  );
};

// ==========================================
// 2. Memory Game (Diving Alternative)
// ==========================================
const MemoryGame: React.FC<{ diff: number; onWin: () => void; onLose: () => void }> = ({ diff, onWin, onLose }) => {
  const ICONS = ['🐬', '🐚', '🦀', '🐳', '🐡', '🐙', '🦈', '🐠', '🧜‍♀️', '🔱'];
  const config = {
    1: { rows: 4, cols: 4, time: 45 },
    2: { rows: 4, cols: 4, time: 35 },
    3: { rows: 4, cols: 6, time: 45 },
    4: { rows: 6, cols: 6, time: 60 },
  }[diff as 1|2|3|4] || { rows: 4, cols: 4, time: 45 };

  const [cards, setCards] = useState<{v: string, f: boolean, m: boolean}[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(config.time);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');

  useEffect(() => {
    const total = config.rows * config.cols;
    const icons = [];
    for (let i = 0; i < total / 2; i++) {
      const icon = ICONS[i % ICONS.length];
      icons.push(icon, icon);
    }
    icons.sort(() => Math.random() - 0.5);
    setCards(icons.map(v => ({ v, f: false, m: false })));

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); setGameState('lost'); setTimeout(onLose, 1500); return 0; }
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
      <div className="grid gap-1 bg-black/40 p-2 rounded-xl border border-white/10" style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)` }}>
        {cards.map((card, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-xl rounded-lg transition-all ${
              card.f || card.m ? 'bg-white rotate-0' : 'bg-blue-600/40 rotate-180'
            }`}
            style={{ transformStyle: 'preserve-3d' }}
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
const Minesweeper: React.FC<{ diff: number; onWin: () => void; onLose: () => void }> = ({ diff, onWin, onLose }) => {
  const config = {
    1: { size: 5, mines: 3, time: 60 },
    2: { size: 6, mines: 6, time: 50 },
    3: { size: 7, mines: 10, time: 45 },
    4: { size: 8, mines: 15, time: 40 },
  }[diff as 1|2|3|4] || { size: 5, mines: 3, time: 60 };

  const [grid, setGrid] = useState<{m: boolean, o: boolean, n: number}[][]>([]);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [timeLeft, setTimeLeft] = useState(config.time);

  useEffect(() => {
    const newGrid = Array(config.size).fill(0).map(() => Array(config.size).fill(0).map(() => ({ m: false, o: false, n: 0 })));
    let m = 0;
    while (m < config.mines) {
      const r = Math.floor(Math.random() * config.size);
      const c = Math.floor(Math.random() * config.size);
      if (!newGrid[r][c].m) { newGrid[r][c].m = true; m++; }
    }
    for (let r = 0; r < config.size; r++) {
      for (let c = 0; c < config.size; c++) {
        if (newGrid[r][c].m) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < config.size && nc >= 0 && nc < config.size && newGrid[nr][nc].m) count++;
          }
        }
        newGrid[r][c].n = count;
      }
    }
    setGrid(newGrid);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); setGameState('lost'); setTimeout(onLose, 1500); return 0; }
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
        if (row < 0 || row >= config.size || col < 0 || col >= config.size || newGrid[row][col].o) return;
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
      <div className="grid gap-1 bg-black/40 p-2 rounded-xl border border-white/10" style={{ gridTemplateColumns: `repeat(${config.size}, 1fr)` }}>
        {grid.map((row, r) => row.map((cell, c) => (
          <button
            key={`${r}-${c}`}
            onClick={() => open(r, c)}
            className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-xs font-black rounded ${
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

// ==========================================
// Main Wrapper
// ==========================================
const PickupMinigame: React.FC<PickupMinigameProps> = ({ type, difficulty, onWin, onLose, onClose }) => {
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
        </div>

        {type === 'fishing' && <FruitGame diff={difficulty} onWin={onWin} onLose={onLose} />}
        {type === 'diving' && <MemoryGame diff={difficulty} onWin={onWin} onLose={onLose} />}
        {type === 'chest' && <Minesweeper diff={difficulty} onWin={onWin} onLose={onLose} />}
      </motion.div>
    </motion.div>
  );
};

export default PickupMinigame;
