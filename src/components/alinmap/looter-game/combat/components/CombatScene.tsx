import React from 'react';
import { Swords } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Encounter } from '../LooterGameContext';
import type { LooterItem } from '../backpack/types';

interface CombatSceneProps {
    encounter: Encounter;
    phase: 'ready' | 'fighting' | 'result';
    flyingItem: { item: LooterItem; from: 'A' | 'B'; damage: number } | null;
    handleStart: () => void;
    skipCombat: () => void;
    setShowFleeConfirm: (v: boolean) => void;
    isHUDMode?: boolean;
}

export const CombatScene: React.FC<CombatSceneProps> = ({
    encounter, phase, flyingItem, handleStart, skipCombat, setShowFleeConfirm, isHUDMode
}) => {
    if (isHUDMode) {
        return (
            <div className="absolute inset-0 pointer-events-none">
                {/* Flying item animation - Adjusted for Map HUD */}
                <AnimatePresence mode="popLayout">
                    {flyingItem && (
                        <motion.div
                            key={flyingItem.item.uid + flyingItem.from}
                            initial={{ 
                                x: flyingItem.from === 'A' ? '50vw' : 'calc(50vw + 60px)', 
                                y: flyingItem.from === 'A' ? '50vh' : 'calc(50vh - 40px)', 
                                opacity: 1, scale: 1.2 
                            }}
                            animate={{ 
                                x: flyingItem.from === 'A' ? 'calc(50vw + 60px)' : '50vw', 
                                y: flyingItem.from === 'A' ? 'calc(50vh - 40px)' : '50vh', 
                                opacity: 0.3, scale: 0.6 
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5, ease: 'easeIn' }}
                            className="absolute z-50 flex flex-col items-center -ml-4 -mt-4"
                        >
                            <span className="text-4xl drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">{flyingItem.item.icon}</span>
                            <motion.span 
                                initial={{ y: 0, opacity: 1 }}
                                animate={{ y: -20, opacity: 0 }}
                                className="text-2xl font-black text-red-500 bg-black/40 px-2 rounded-lg"
                            >
                                -{flyingItem.damage}
                            </motion.span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Start Button - Floating Center */}
                {phase === 'ready' && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
                        <motion.button
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleStart}
                            className="px-10 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-xl rounded-full shadow-[0_0_30px_rgba(245,158,11,0.4)] border-2 border-amber-300/30 flex items-center gap-3"
                        >
                            <Swords className="w-6 h-6" />
                            Bắt Đầu
                        </motion.button>
                    </div>
                )}

                {/* Skip Button - Floating Right */}
                {phase === 'fighting' && (
                    <div className="absolute right-4 bottom-1/2 translate-y-1/2 pointer-events-auto">
                        <button
                            onClick={skipCombat}
                            className="group flex flex-col items-center gap-1 p-3 bg-black/60 hover:bg-amber-600/80 border border-amber-500/30 rounded-2xl transition-all shadow-2xl"
                        >
                            <div className="flex gap-1 mb-1">
                                <div className="w-1.5 h-4 bg-amber-500 rounded-full animate-pulse" />
                                <div className="w-1.5 h-4 bg-amber-500 rounded-full animate-pulse [animation-delay:0.2s]" />
                            </div>
                            <span className="text-[10px] font-black text-amber-400 group-hover:text-white uppercase">Skip</span>
                        </button>
                    </div>
                )}

            </div>
        );
    }

    return (
        <div className="relative h-[22vh] md:h-[28vh] min-h-[160px] bg-gradient-to-b from-[#1a4a6e] to-[#0a2540] overflow-hidden shrink-0 border-y border-[#0a1929]/50 shadow-[0_0_20px_rgba(0,0,0,0.5)_inset]">
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0a1929] to-transparent" />
            <svg className="absolute bottom-0 w-full h-8 text-[#0a1929]" viewBox="0 0 1200 40" preserveAspectRatio="none">
                <path d="M0,20 Q150,0 300,20 Q450,40 600,20 Q750,0 900,20 Q1050,40 1200,20 L1200,40 L0,40 Z" fill="currentColor" />
            </svg>

            {/* Player A (left) */}
            <motion.div
                className="absolute left-[20%] bottom-[40%] flex flex-col items-center"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
                <span className="text-4xl md:text-5xl">🚢</span>
                <span className="text-[10px] font-black text-cyan-200 bg-black/40 px-2 py-0.5 rounded-full mt-1">Bạn</span>
            </motion.div>

            {/* Player B (right) */}
            <motion.div
                className="absolute right-[20%] bottom-[40%] flex flex-col items-center"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            >
                <span className="text-4xl md:text-5xl" style={{ transform: 'scaleX(-1)' }}>🚢</span>
                <span className="text-[10px] font-black text-red-200 bg-black/40 px-2 py-0.5 rounded-full mt-1 max-w-[80px] truncate">{encounter.name}</span>
            </motion.div>

            {/* Flying item animation */}
            <AnimatePresence mode="popLayout">
                {flyingItem && (
                    <motion.div
                        key={flyingItem.item.uid + flyingItem.from}
                        initial={{ x: flyingItem.from === 'A' ? '20vw' : '80vw', y: '-5vh', opacity: 1, scale: 1.5 }}
                        animate={{ x: flyingItem.from === 'A' ? '75vw' : '20vw', y: '10vh', opacity: 0.3, scale: 0.8 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: 'easeIn' }}
                        className="absolute z-50 flex flex-col items-center"
                    >
                        <span className="text-4xl">{flyingItem.item.icon}</span>
                        <span className="text-xl font-black text-red-500 bg-black/60 px-2 rounded">-{flyingItem.damage}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {phase === 'ready' && (
                <div className="absolute top-3 right-3 z-30">
                    <button 
                        onClick={() => setShowFleeConfirm(true)} 
                        className="px-3 py-1.5 bg-red-600/80 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg"
                    >
                        Bỏ Trốn
                    </button>
                </div>
            )}

            {phase === 'fighting' && (
                <div className="absolute right-[20%] top-[20%] -translate-x-1/2 z-30">
                    <button
                        onClick={skipCombat}
                        className="group flex items-center gap-2 px-3 py-1.5 bg-black/60 hover:bg-amber-600/80 border border-amber-500/30 rounded-xl transition-all active:scale-95 shadow-xl"
                    >
                        <span className="text-[10px] font-black text-amber-400 group-hover:text-white uppercase tracking-tighter">Kết thúc nhanh</span>
                        <div className="flex gap-0.5">
                            <div className="w-1 h-3 bg-amber-500 rounded-full animate-pulse" />
                            <div className="w-1 h-3 bg-amber-500 rounded-full animate-pulse [animation-delay:0.2s]" />
                        </div>
                    </button>
                </div>
            )}
            
            {phase === 'ready' && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                    <button
                        onClick={handleStart}
                        className="px-8 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-lg rounded-full shadow-lg shadow-amber-600/40 hover:scale-105 active:scale-95 transition-transform border-2 border-amber-300/30 flex items-center gap-2"
                    >
                        <Swords className="w-5 h-5" />
                        Bắt Đầu
                    </button>
                </div>
            )}
        </div>
    );
};
