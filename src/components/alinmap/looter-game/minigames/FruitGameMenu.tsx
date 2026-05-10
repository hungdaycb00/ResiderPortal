import React from 'react';
import { Apple, Layers } from 'lucide-react';
import { LEVELS } from './FruitGameEngine';

interface FruitGameMenuProps {
    onSelectDifficulty: (diff: keyof typeof LEVELS) => void;
}

export default function FruitGameMenu({ onSelectDifficulty }: FruitGameMenuProps) {
    return (
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
                            onClick={() => onSelectDifficulty(diff as keyof typeof LEVELS)}
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
    );
}
