import React, { useRef } from 'react';
import { Timer, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound, triggerHaptic } from './utils';
import { formatTime, getCellCoord, LEVELS } from './FruitGameEngine';
import type { Point, Cell } from './FruitGameLogic';

interface FruitGameBoardProps {
    grid: Cell[][];
    selection: Point | null;
    path: Point[];
    timeLeft: number;
    score: number;
    gameState: 'playing' | 'won' | 'lost' | 'menu';
    level: keyof typeof LEVELS | 'custom';
    gridConfig: { rows: number; cols: number; time: number };
    isMobile: boolean;
    autoStart: boolean;
    onComplete?: (success: boolean) => void;
    onBack: () => void;
    onCellClick: (r: number, c: number) => void;
}

export default function FruitGameBoard({
    grid,
    selection,
    path,
    timeLeft,
    score,
    gameState,
    level,
    gridConfig,
    isMobile,
    autoStart,
    onComplete,
    onBack,
    onCellClick,
}: FruitGameBoardProps) {
    const gridRef = useRef<HTMLDivElement>(null);
    const maxCellSize = level === 'easy' ? 45 : level === 'medium' ? 38 : 32;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full h-full flex flex-col items-center justify-center relative p-1 md:p-4 gap-2 md:gap-4 overflow-visible"
            >
                {/* Header Dashboard */}
                <div
                    className="flex w-full max-w-[min(96vw,560px)] flex-row items-center justify-between gap-2 bg-white/20 p-2 md:px-4 md:py-3 rounded-xl md:rounded-[24px] backdrop-blur-sm border border-white/30 shrink-0 z-40"
                    style={{ WebkitBackdropFilter: 'blur(4px)' } as any}
                >
                    <div className="flex items-center gap-1.5 bg-emerald-500/20 px-3 py-1.5 rounded-full border border-emerald-500/30">
                        <Timer size={12} className={`${timeLeft < 30 ? 'text-red-400 animate-pulse' : 'text-emerald-300'}`} />
                        <span className={`text-xs md:text-lg font-black tabular-nums ${timeLeft < 30 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>

                    <div className="flex flex-col items-center">
                        <span className="text-[8px] md:text-[10px] font-black text-white/60 uppercase tracking-widest">Score</span>
                        <span className="font-black text-lg md:text-2xl text-white tabular-nums leading-none">{score}</span>
                    </div>

                    {autoStart && onComplete && (
                        <button
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
                            onClick={() => { playSound('click'); onBack(); }}
                            className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform text-white border border-white/20 shrink-0"
                        >
                            <XCircle size={24} />
                        </button>
                    )}
                </div>

                {/* Content Area */}
                <div className="min-h-0 flex-1 flex flex-col items-center justify-center w-full">
                    {/* Grid Area Wrapper */}
                    <div
                        className="p-2 md:p-4 bg-white/30 backdrop-blur-sm rounded-[30px] border-2 border-white/50 flex items-center justify-center z-10 shadow-inner overflow-hidden mx-auto"
                        style={{
                            width: '100%',
                            WebkitBackdropFilter: 'blur(4px)',
                            maxWidth: isMobile
                                ? `min(96vw, ${(gridConfig.cols / gridConfig.rows) * 45}vh)`
                                : `min(96vw, ${(gridConfig.cols / gridConfig.rows) * 55}vh)`
                        } as any}
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
                                        onClick={() => onCellClick(r, c)}
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
                                    <polyline
                                        points={path.map(p => {
                                            const { x, y } = getCellCoord(p, gridRef.current, grid.length, grid[0].length);
                                            return `${x},${y}`;
                                        }).join(' ')}
                                        fill="none"
                                        stroke="#10b981"
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="animate-pulse"
                                        style={{ filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.8))' }}
                                    />
                                </svg>
                            )}
                        </div>
                    </div>

                    {/* Hint */}
                    <p className="text-[7px] md:text-[10px] font-black text-white/80 uppercase tracking-widest text-center mt-2 md:mt-4 z-10 opacity-80">
                        Connect identical fruits! Max 2 turns.
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
                            <h2 className="text-4xl md:text-6xl font-black text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)] italic uppercase tracking-tighter animate-bounce">
                                THÀNH CÔNG!
                            </h2>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
}
