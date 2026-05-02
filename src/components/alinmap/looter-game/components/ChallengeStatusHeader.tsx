import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Sword, Anchor } from 'lucide-react';

interface ChallengeStatusHeaderProps {
    isChallengeActive: boolean;
    worldTier: number;
    onStartChallenge?: () => void;
}

const ChallengeStatusHeader: React.FC<ChallengeStatusHeaderProps> = ({ isChallengeActive, worldTier, onStartChallenge }) => {
    const isAtFortress = worldTier === -1;

    return (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[300] pointer-events-none">
            <AnimatePresence mode="wait">
                {isAtFortress ? (
                    // Trạng thái: Đang ở Thành Trì, chưa có thử thách
                    <motion.button
                        key="at-fortress"
                        initial={{ y: -20, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -20, opacity: 0, scale: 0.9 }}
                        onClick={onStartChallenge}
                        className="flex items-center gap-3 px-6 py-2 rounded-full bg-black/60 backdrop-blur-xl border border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.2)] pointer-events-auto cursor-pointer hover:bg-red-950/40 hover:border-red-400/60 transition-all"
                    >
                        <Anchor className="w-4 h-4 text-red-400 animate-pulse" />
                        <span className="text-[11px] font-black tracking-[0.1em] text-red-200 uppercase whitespace-nowrap">
                            Bắt Đầu Thử Thách Mới
                        </span>
                    </motion.button>
                ) : !isChallengeActive ? (
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
