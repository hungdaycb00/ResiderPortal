import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Sword } from 'lucide-react';

interface ChallengeStatusHeaderProps {
    isChallengeActive: boolean;
    worldTier: number;
}

const ChallengeStatusHeader: React.FC<ChallengeStatusHeaderProps> = ({ isChallengeActive, worldTier }) => {
    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[300] pointer-events-none">
            <AnimatePresence mode="wait">
                {!isChallengeActive ? (
                    <motion.div
                        key="not-active"
                        initial={{ y: -20, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -20, opacity: 0, scale: 0.9 }}
                        className="flex items-center gap-3 px-6 py-2.5 rounded-full bg-black/60 backdrop-blur-xl border border-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.2)]"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400">
                            <Map className="w-5 h-5 animate-pulse" />
                        </div>
                        <span className="text-sm font-black tracking-wider text-cyan-100 uppercase">
                            Bấm vào Map để bắt đầu thử thách
                        </span>
                    </motion.div>
                ) : (
                    <motion.div
                        key="active"
                        initial={{ y: -20, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -20, opacity: 0, scale: 0.9 }}
                        className="flex items-center gap-3 px-6 py-2.5 rounded-full bg-black/60 backdrop-blur-xl border border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.2)]"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                            <Sword className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col items-start leading-tight">
                            <span className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest">Đang trong thử thách</span>
                            <span className="text-sm font-black text-amber-100 uppercase">
                                Thế giới: Tier {worldTier}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChallengeStatusHeader;
