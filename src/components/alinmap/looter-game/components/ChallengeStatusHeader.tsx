import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Sword } from 'lucide-react';

interface ChallengeStatusHeaderProps {
    isChallengeActive: boolean;
    worldTier: number;
}

const ChallengeStatusHeader: React.FC<ChallengeStatusHeaderProps> = ({ isChallengeActive, worldTier }) => {
    return (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[300] pointer-events-none">
            <AnimatePresence mode="wait">
                {!isChallengeActive ? (
                    <motion.div
                        key="not-active"
                        initial={{ y: -20, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -20, opacity: 0, scale: 0.9 }}
                        className="flex items-center gap-3 px-6 py-2 rounded-full bg-black/60 backdrop-blur-xl border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                    >
                        <Map className="w-4 h-4 text-cyan-400 animate-pulse" />
                        <span className="text-[11px] font-black tracking-[0.1em] text-cyan-100 uppercase whitespace-nowrap">
                            Click Map to Move
                        </span>
                    </motion.div>
                ) : (
                    <motion.div
                        key="active"
                        initial={{ y: -20, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -20, opacity: 0, scale: 0.9 }}
                        className="flex items-center gap-3 px-6 py-2 rounded-full bg-black/60 backdrop-blur-xl border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                    >
                        <Sword className="w-4 h-4 text-amber-400" />
                        <span className="text-[11px] font-black text-amber-100 uppercase tracking-wider whitespace-nowrap">
                            Tier {worldTier} Challenge
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChallengeStatusHeader;
