import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface PickupMinigameProps {
  type: 'fishing' | 'diving' | 'chest';
  onWin: () => void;
  onLose: () => void;
  onClose: () => void;
}

// ==========================================
// Fishing Minigame - Timing bar
// ==========================================
const FishingGame: React.FC<{ onWin: () => void; onLose: () => void }> = ({ onWin, onLose }) => {
  const [pos, setPos] = useState(0);
  const [dir, setDir] = useState(1);
  const [caught, setCaught] = useState<boolean | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const targetStart = 35 + Math.floor(Math.random() * 20);
  const targetEnd = targetStart + 15;

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setPos(prev => {
        const next = prev + dir * 2;
        if (next >= 100) { setDir(-1); return 100; }
        if (next <= 0) { setDir(1); return 0; }
        return next;
      });
    }, 30);
    const timeout = setTimeout(() => {
      clearInterval(timerRef.current);
      setCaught(false);
      setTimeout(onLose, 800);
    }, 5000);
    return () => { clearInterval(timerRef.current); clearTimeout(timeout); };
  }, []);

  const handleCatch = () => {
    if (caught !== null) return;
    clearInterval(timerRef.current);
    const hit = pos >= targetStart && pos <= targetEnd;
    setCaught(hit);
    setTimeout(hit ? onWin : onLose, 800);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <span className="text-5xl">🎣</span>
      <p className="text-sm font-bold text-cyan-200">Bấm đúng vùng xanh!</p>
      <div className="w-64 h-8 bg-gray-800 rounded-full relative overflow-hidden border border-cyan-700/50">
        <div className="absolute h-full bg-emerald-500/40 rounded-full" style={{ left: `${targetStart}%`, width: `${targetEnd - targetStart}%` }} />
        <motion.div className="absolute top-0 h-full w-1.5 bg-white rounded-full shadow-lg shadow-white/50" style={{ left: `${pos}%` }} />
      </div>
      <button onClick={handleCatch} disabled={caught !== null} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl transition-colors active:scale-95 disabled:opacity-50">
        🐟 CÂU!
      </button>
      {caught !== null && <p className={`text-lg font-black ${caught ? 'text-emerald-400' : 'text-red-400'}`}>{caught ? '✅ Tuyệt vời!' : '❌ Hụt rồi!'}</p>}
    </div>
  );
};

// ==========================================
// Diving Minigame - Tap nhanh
// ==========================================
const DivingGame: React.FC<{ onWin: () => void; onLose: () => void }> = ({ onWin, onLose }) => {
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(5);
  const TARGET = 15;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (taps >= TARGET) { setTimeout(onWin, 500); }
    else if (timeLeft === 0 && taps < TARGET) { setTimeout(onLose, 500); }
  }, [taps, timeLeft]);

  return (
    <div className="flex flex-col items-center gap-4">
      <span className="text-5xl">🤿</span>
      <p className="text-sm font-bold text-cyan-200">Tap nhanh {TARGET} lần!</p>
      <div className="flex items-center gap-3">
        <span className="text-3xl font-black text-white">{taps}/{TARGET}</span>
        <span className="text-lg font-bold text-amber-400">⏱️ {timeLeft}s</span>
      </div>
      <div className="w-48 h-3 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-cyan-500 transition-all rounded-full" style={{ width: `${(taps / TARGET) * 100}%` }} />
      </div>
      <button
        onClick={() => setTaps(prev => prev + 1)}
        disabled={timeLeft === 0 || taps >= TARGET}
        className="w-24 h-24 bg-cyan-600 hover:bg-cyan-500 rounded-full text-3xl font-black text-white active:scale-90 transition-transform disabled:opacity-50 shadow-lg shadow-cyan-600/40"
      >
        🫧
      </button>
    </div>
  );
};

// ==========================================
// Chest Minigame - 3 number combo
// ==========================================
const ChestGame: React.FC<{ onWin: () => void; onLose: () => void }> = ({ onWin, onLose }) => {
  const [target] = useState(() => [Math.floor(Math.random() * 10), Math.floor(Math.random() * 10), Math.floor(Math.random() * 10)]);
  const [guess, setGuess] = useState([0, 0, 0]);
  const [timeLeft, setTimeLeft] = useState(8);
  const [result, setResult] = useState<boolean | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (timeLeft === 0 && result === null) {
      setResult(false);
      setTimeout(onLose, 800);
    }
  }, [timeLeft]);

  const handleSubmit = () => {
    const correct = guess[0] === target[0] && guess[1] === target[1] && guess[2] === target[2];
    setResult(correct);
    setTimeout(correct ? onWin : onLose, 800);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <span className="text-5xl">📦</span>
      <p className="text-sm font-bold text-amber-200">Mã khóa: {target.join(' - ')}</p>
      <div className="flex gap-3">
        {guess.map((v, i) => (
          <div key={i} className="flex flex-col items-center">
            <button onClick={() => setGuess(prev => { const n = [...prev]; n[i] = (n[i] + 1) % 10; return n; })} className="text-lg text-white">▲</button>
            <div className="w-12 h-14 bg-gray-800 border-2 border-amber-600/50 rounded-lg flex items-center justify-center text-2xl font-black text-amber-300">{v}</div>
            <button onClick={() => setGuess(prev => { const n = [...prev]; n[i] = (n[i] - 1 + 10) % 10; return n; })} className="text-lg text-white">▼</button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-amber-400">⏱️ {timeLeft}s</span>
        <button onClick={handleSubmit} disabled={result !== null || timeLeft === 0} className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors active:scale-95 disabled:opacity-50">
          🔓 Mở
        </button>
      </div>
      {result !== null && <p className={`text-lg font-black ${result ? 'text-emerald-400' : 'text-red-400'}`}>{result ? '✅ Mở được!' : '❌ Sai mã!'}</p>}
    </div>
  );
};

// ==========================================
// Main Wrapper
// ==========================================
const PickupMinigame: React.FC<PickupMinigameProps> = ({ type, onWin, onLose, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[350] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-gradient-to-b from-[#0d2137] to-[#0a1929] border border-cyan-600/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white text-sm font-bold">✕</button>
        {type === 'fishing' && <FishingGame onWin={onWin} onLose={onLose} />}
        {type === 'diving' && <DivingGame onWin={onWin} onLose={onLose} />}
        {type === 'chest' && <ChestGame onWin={onWin} onLose={onLose} />}
      </motion.div>
    </motion.div>
  );
};

export default PickupMinigame;
