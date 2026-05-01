import React from 'react';
import { motion } from 'framer-motion';
import { CombatInventoryGrid } from '../../backpack';
import type { LooterItem, BagItem } from '../../backpack/types';

interface StatsPanelProps {
    side: 'player' | 'enemy';
    name: string;
    hp: number;
    maxHp: number;
    actionProgress: number;
    maxActionBar: number;
    dmg: number;
    regen: number;
    inventory: LooterItem[];
    bags?: BagItem[];
    gridWidth: number;
    gridHeight: number;
    isMobileTop?: boolean;
}

export const CombatStatsPanel: React.FC<StatsPanelProps> = ({
    side, name, hp, maxHp, actionProgress, maxActionBar, dmg, regen,
    inventory, bags, gridWidth, gridHeight, isMobileTop
}) => {
    const isPlayer = side === 'player';
    const bgClass = isPlayer ? 'bg-[#0d2137]/30 border-cyan-800/20' : 'bg-[#370d0d]/20 border-red-900/20';
    const accentColor = isPlayer ? 'cyan' : 'red';
    const barGradient = isPlayer ? 'from-blue-600 to-cyan-400' : 'from-blue-600 to-purple-500';

    return (
        <div className={`flex-1 flex flex-col ${bgClass} ${isMobileTop ? 'md:hidden' : ''} md:rounded-2xl p-2 border-t md:border overflow-hidden`}>
            <div className="mt-1 mb-2 shrink-0 px-1">
                <div className="flex justify-between items-end mb-1">
                    <div className="flex flex-col">
                        <span className={`text-[10px] font-black text-${accentColor}-400 uppercase tracking-wider`}>⚔️ DMG: {dmg}</span>
                        <span className={`text-[9px] font-bold text-${accentColor}-300 uppercase`}>⚡ REGEN: +{regen}/s</span>
                    </div>
                    <span className="text-[10px] font-black text-white drop-shadow-md">{name}</span>
                    <span className="text-[10px] font-bold text-red-300">{Math.max(0, Math.round(hp))}/{maxHp}</span>
                </div>
                {/* HP Bar */}
                <div className="h-5 bg-gray-900 rounded-full overflow-hidden mb-1 border border-white/5 shadow-inner">
                    <motion.div 
                        className={`h-full bg-gradient-to-r from-red-600 to-${isPlayer ? 'red-400' : 'orange-500'} rounded-full`} 
                        animate={{ width: `${Math.max(0, (hp / maxHp) * 100)}%` }} 
                    />
                </div>
                {/* Action Bar */}
                <div className="h-5 bg-gray-900 rounded-full overflow-hidden border border-white/5 shadow-inner relative">
                    <motion.div 
                        className={`h-full bg-gradient-to-r ${barGradient} rounded-full`} 
                        animate={{ width: `${(actionProgress / maxActionBar) * 100}%` }} 
                        transition={{ duration: 0.1 }} 
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white mix-blend-difference">
                        {Math.round(actionProgress)}/{maxActionBar}
                    </div>
                </div>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-auto subtle-scrollbar min-h-0">
                <CombatInventoryGrid 
                    items={inventory} 
                    gridWidth={gridWidth} 
                    gridHeight={gridHeight} 
                    bag={bags?.[0]} 
                    readOnly 
                    cellSize={Math.min(32, (window.innerWidth - 40) / Math.max(gridWidth, 6))} 
                />
            </div>
        </div>
    );
};
