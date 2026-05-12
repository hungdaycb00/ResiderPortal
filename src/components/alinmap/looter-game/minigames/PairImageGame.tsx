import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Timer, XCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { playSound, triggerHaptic } from './utils';

type GameState = 'menu' | 'playing' | 'won' | 'lost';

interface PairImageCard {
  id: string;
  pairId: number;
  imageSrc: string;
  label: string;
  isOpened: boolean;
  isMatched: boolean;
}

interface PairImageGameProps {
  onActiveChange?: (active: boolean) => void;
  autoStart?: boolean;
  onComplete?: (success: boolean) => void;
  customGrid?: { rows: number; cols: number };
}

const LEVELS = {
  easy: { rows: 3, cols: 4, time: 45, name: 'EASY' },
  medium: { rows: 4, cols: 5, time: 60, name: 'MEDIUM' },
  hard: { rows: 5, cols: 6, time: 80, name: 'HARD' },
};

type LevelKey = keyof typeof LEVELS;

const shuffle = <T,>(items: T[]): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const createArtwork = (pairId: number): string => {
  const hue = (pairId * 47 + 178) % 360;
  const hueAlt = (hue + 72) % 360;
  const shape = pairId % 4;
  const number = String(pairId + 1).padStart(2, '0');
  const shapeMarkup = [
    `<circle cx="64" cy="62" r="31" fill="hsla(${hueAlt}, 88%, 64%, 0.86)" />`,
    `<rect x="34" y="32" width="60" height="60" rx="18" fill="hsla(${hueAlt}, 88%, 64%, 0.86)" transform="rotate(12 64 62)" />`,
    `<path d="M64 24 L101 88 H27 Z" fill="hsla(${hueAlt}, 88%, 64%, 0.86)" />`,
    `<path d="M64 25 C82 44 100 45 103 65 C82 71 79 90 64 102 C49 90 46 71 25 65 C28 45 46 44 64 25 Z" fill="hsla(${hueAlt}, 88%, 64%, 0.86)" />`,
  ][shape];

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="hsl(${hue}, 78%, 42%)" />
          <stop offset="100%" stop-color="hsl(${hueAlt}, 80%, 28%)" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="128" height="128" rx="26" fill="url(#bg)" />
      <circle cx="22" cy="20" r="42" fill="rgba(255,255,255,0.18)" />
      <circle cx="112" cy="116" r="52" fill="rgba(0,0,0,0.18)" />
      <g filter="url(#glow)">${shapeMarkup}</g>
      <text x="64" y="75" text-anchor="middle" font-family="Arial, sans-serif" font-size="31" font-weight="900" fill="white">${number}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const buildDeck = (rows: number, cols: number): PairImageCard[] => {
  const totalCards = rows * cols;
  const pairCount = Math.floor(totalCards / 2);
  const cards = Array.from({ length: pairCount }, (_, pairId) => {
    const imageSrc = createArtwork(pairId);
    const label = `Relic ${pairId + 1}`;
    return [
      { id: `${pairId}-a`, pairId, imageSrc, label, isOpened: false, isMatched: false },
      { id: `${pairId}-b`, pairId, imageSrc, label, isOpened: false, isMatched: false },
    ];
  }).flat();

  return shuffle(cards);
};

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export function PairImageGame({
  onActiveChange,
  autoStart = false,
  onComplete,
  customGrid,
}: PairImageGameProps) {
  const [level, setLevel] = useState<LevelKey | 'custom'>(customGrid ? 'custom' : 'easy');
  const [gridConfig, setGridConfig] = useState({ rows: 3, cols: 4, time: 45 });
  const [cards, setCards] = useState<PairImageCard[]>([]);
  const [openedCards, setOpenedCards] = useState<PairImageCard[]>([]);
  const [gameState, setGameState] = useState<GameState>(autoStart ? 'playing' : 'menu');
  const [timeLeft, setTimeLeft] = useState(45);
  const [attempts, setAttempts] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [score, setScore] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const pendingTimeoutsRef = useRef<number[]>([]);

  const pairCount = useMemo(() => Math.floor((gridConfig.rows * gridConfig.cols) / 2), [gridConfig]);
  const maxDimension = Math.max(gridConfig.rows, gridConfig.cols);
  const cardGap = maxDimension <= 5 ? '0.45rem' : maxDimension <= 7 ? '0.32rem' : '0.22rem';

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timeoutId = window.setTimeout(() => {
      pendingTimeoutsRef.current = pendingTimeoutsRef.current.filter((id) => id !== timeoutId);
      callback();
    }, delay);
    pendingTimeoutsRef.current.push(timeoutId);
  }, []);

  const startGameWithGrid = useCallback((rows: number, cols: number, time: number, nextLevel: LevelKey | 'custom') => {
    const safeCols = (rows * cols) % 2 === 0 ? cols : cols + 1;
    setGridConfig({ rows, cols: safeCols, time });
    setCards(buildDeck(rows, safeCols));
    setOpenedCards([]);
    setGameState('playing');
    setTimeLeft(time);
    setAttempts(0);
    setMatchedPairs(0);
    setScore(0);
    setIsLocked(false);
    setLevel(nextLevel);
  }, []);

  const initCustomGame = useCallback((rows: number, cols: number) => {
    const totalCards = rows * ((rows * cols) % 2 === 0 ? cols : cols + 1);
    const time = Math.min(110, Math.max(45, Math.round(totalCards * 1.8)));
    startGameWithGrid(rows, cols, time, 'custom');
  }, [startGameWithGrid]);

  const initGame = useCallback((nextLevel: LevelKey) => {
    const config = LEVELS[nextLevel];
    startGameWithGrid(config.rows, config.cols, config.time, nextLevel);
  }, [startGameWithGrid]);

  const finishGame = useCallback((success: boolean) => {
    setGameState(success ? 'won' : 'lost');
    playSound(success ? 'success' : 'wrong');
    triggerHaptic(success ? 'heavy' : 'medium');

    if (success) {
      window.dispatchEvent(new CustomEvent('MINIGAME_WIN', { detail: { difficulty: level } }));
    }

    if (onComplete) {
      schedule(() => onComplete(success), success ? 1300 : 1500);
    }
  }, [level, onComplete, schedule]);

  useEffect(() => {
    if (autoStart) {
      if (customGrid) {
        initCustomGame(customGrid.rows, customGrid.cols);
      } else {
        initGame('easy');
      }
    }
  }, [autoStart, customGrid, initCustomGame, initGame]);

  useEffect(() => {
    if (onActiveChange) {
      onActiveChange(gameState !== 'menu');
    }
  }, [gameState, onActiveChange]);

  useEffect(() => {
    if (gameState !== 'playing') return undefined;

    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          finishGame(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [finishGame, gameState]);

  useEffect(() => {
    return () => {
      pendingTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      pendingTimeoutsRef.current = [];
    };
  }, []);

  const handleCardClick = (card: PairImageCard) => {
    if (gameState !== 'playing' || isLocked || card.isOpened || card.isMatched) return;

    playSound('click');
    triggerHaptic('light');

    const nextOpenedCards = [...openedCards, card];
    setCards((prev) => prev.map((item) => (item.id === card.id ? { ...item, isOpened: true } : item)));
    setOpenedCards(nextOpenedCards);

    if (nextOpenedCards.length < 2) return;

    const [firstCard, secondCard] = nextOpenedCards;
    setAttempts((prev) => prev + 1);
    setIsLocked(true);

    if (firstCard.pairId === secondCard.pairId) {
      schedule(() => {
        const nextMatchedPairs = matchedPairs + 1;
        setCards((prev) => prev.map((item) => (
          item.pairId === firstCard.pairId ? { ...item, isMatched: true, isOpened: false } : item
        )));
        setMatchedPairs(nextMatchedPairs);
        setScore((prev) => prev + 100 + Math.max(0, timeLeft));
        setOpenedCards([]);
        setIsLocked(false);
        playSound('correct');
        triggerHaptic('medium');

        if (nextMatchedPairs >= pairCount) {
          finishGame(true);
        }
      }, 280);
    } else {
      schedule(() => {
        setCards((prev) => prev.map((item) => (
          item.id === firstCard.id || item.id === secondCard.id ? { ...item, isOpened: false } : item
        )));
        setOpenedCards([]);
        setIsLocked(false);
      }, 620);
    }
  };

  const gridShellStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: `min(96vw, ${(gridConfig.cols / gridConfig.rows) * 52}dvh)`,
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      {gameState === 'menu' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 w-full max-w-sm mx-auto overflow-y-auto no-scrollbar">
          <div className="w-20 h-20 rounded-[28px] bg-cyan-400/20 border-4 border-white/20 flex items-center justify-center mb-4 shadow-lg">
            <span className="text-4xl font-black text-cyan-100">2x</span>
          </div>
          <h2 className="font-bubbly text-3xl text-white mb-1 uppercase tracking-widest italic">PAIR IMAGES</h2>
          <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-8 text-center leading-relaxed px-4">
            Flip cards and match every hidden image pair.
          </p>

          <div className="w-full">
            <label className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-4 block px-2 text-center italic">
              SELECT MEMORY GRID
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(LEVELS) as LevelKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => initGame(key)}
                  className="group bg-white/80 hover:bg-cyan-500 p-1.5 md:p-3 rounded-2xl flex flex-col items-center justify-center border-2 border-slate-100 hover:border-cyan-300 transition-all active:scale-95 shadow-sm"
                >
                  <span className="font-black text-[10px] md:text-xs text-slate-700 group-hover:text-white uppercase italic tracking-tighter">
                    {LEVELS[key].name}
                  </span>
                  <span className="text-[7px] md:text-[8px] font-black text-slate-400 group-hover:text-cyan-100 uppercase tracking-widest">
                    {LEVELS[key].rows}x{LEVELS[key].cols}
                  </span>
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
            className="w-full h-full flex flex-col items-center justify-center relative p-1 md:p-4 gap-2 md:gap-4 overflow-visible"
          >
            <div className="flex w-full max-w-[min(96vw,560px)] flex-row items-center justify-between gap-2 bg-white/20 p-2 md:px-4 md:py-3 rounded-xl md:rounded-[24px] backdrop-blur-sm border border-white/30 shrink-0 z-40">
              <div className="flex items-center gap-1.5 bg-cyan-500/20 px-3 py-1.5 rounded-full border border-cyan-500/30">
                <Timer size={12} className={timeLeft < 20 ? 'text-red-400 animate-pulse' : 'text-cyan-200'} />
                <span className={`text-xs md:text-lg font-black tabular-nums ${timeLeft < 20 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[8px] md:text-[10px] font-black text-white/60 uppercase tracking-widest">Pairs</span>
                <span className="font-black text-lg md:text-2xl text-white tabular-nums leading-none">
                  {matchedPairs}/{pairCount}
                </span>
              </div>

              <div className="hidden sm:flex flex-col items-center">
                <span className="text-[8px] md:text-[10px] font-black text-white/60 uppercase tracking-widest">Score</span>
                <span className="font-black text-lg md:text-2xl text-white tabular-nums leading-none">{score}</span>
              </div>

              {autoStart && onComplete && (
                <button
                  aria-label="Quit pair image game"
                  onClick={() => {
                    playSound('click');
                    triggerHaptic('medium');
                    onComplete(false);
                  }}
                  className="w-10 h-10 bg-red-500/20 hover:bg-red-500/40 text-red-100 rounded-xl flex items-center justify-center border border-red-500/30 transition-all active:scale-95 shadow-md backdrop-blur-md shrink-0"
                >
                  <XCircle size={24} />
                </button>
              )}

              {!autoStart && (
                <button
                  aria-label="Back to Menu"
                  onClick={() => {
                    playSound('click');
                    setGameState('menu');
                  }}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform text-white border border-white/20 shrink-0"
                >
                  <XCircle size={24} />
                </button>
              )}
            </div>

            <div className="min-h-0 flex-1 flex flex-col items-center justify-center w-full">
              <div
                className="p-1.5 md:p-4 bg-white/25 backdrop-blur-sm rounded-[26px] md:rounded-[30px] border-2 border-white/45 flex items-center justify-center z-10 shadow-inner overflow-hidden mx-auto"
                style={gridShellStyle}
              >
                <div
                  className="grid w-full h-full select-none"
                  style={{
                    gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
                    aspectRatio: `${gridConfig.cols}/${gridConfig.rows}`,
                    gap: cardGap,
                  }}
                >
                  {cards.map((card) => {
                    const isVisible = card.isOpened || card.isMatched || gameState === 'lost';
                    return (
                      <button
                        key={card.id}
                        aria-label={isVisible ? card.label : 'Hidden image card'}
                        onClick={() => handleCardClick(card)}
                        className={`relative aspect-square w-full h-full overflow-hidden rounded-lg md:rounded-xl border transition-all duration-200 active:scale-95 ${
                          card.isMatched
                            ? 'border-emerald-300/70 bg-emerald-400/25 shadow-[0_0_18px_rgba(52,211,153,0.35)]'
                            : isVisible
                              ? 'border-white/70 bg-white/95 shadow-[0_3px_0_0_rgba(226,232,240,0.55)]'
                              : 'border-cyan-200/25 bg-linear-to-br from-slate-700 to-cyan-950 shadow-[0_3px_0_0_rgba(8,47,73,0.8)] hover:-translate-y-0.5'
                        }`}
                      >
                        <span className="absolute inset-0 flex items-center justify-center p-[9%]">
                          {isVisible ? (
                            <img
                              src={card.imageSrc}
                              alt=""
                              draggable={false}
                              className={`h-full w-full rounded-md object-cover transition-all duration-200 ${card.isMatched ? 'opacity-70 saturate-150' : ''}`}
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center rounded-md border border-white/10 bg-white/10 text-[clamp(0.7rem,3vw,1.1rem)] font-black text-cyan-100">
                              ?
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-[7px] md:text-[10px] font-black text-white/80 uppercase tracking-widest text-center mt-2 md:mt-4 z-10 opacity-80">
                Match image pairs. Attempts: {attempts}
              </p>
            </div>

            <AnimatePresence>
              {gameState === 'won' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
                >
                  <h2 className="text-4xl md:text-6xl font-black text-cyan-300 drop-shadow-[0_0_20px_rgba(103,232,249,0.8)] italic uppercase tracking-tighter animate-bounce">
                    SUCCESS!
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
