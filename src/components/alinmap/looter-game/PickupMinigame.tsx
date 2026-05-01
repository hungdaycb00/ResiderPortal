import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLooterState, useLooterActions } from './LooterGameContext';
import { FruitGame } from './minigames/FruitGame';
import { MinesweeperGame } from './minigames/MinesweeperGame';

export const PickupMinigame: React.FC = () => {
    const { showMinigame, state } = useLooterState();
    const { setShowMinigame, pickupItem, inflictMinigamePenalty } = useLooterActions();

    if (!showMinigame) return null;

    const handleComplete = async (success: boolean) => {
        if (success) {
            await pickupItem(showMinigame.spawnId);
        } else {
            await inflictMinigamePenalty(showMinigame.spawnId);
        }
        setShowMinigame(null);
    };

    const worldTier = state.worldTier || 0;
    const gridSize = 3 + worldTier; // Bắt đầu với 3x3 ở level 0, tăng dần

    // Quyết định game dựa vào minigameType
    const isMinesweeper = showMinigame.minigameType === 'diving' || Math.random() > 0.5;

    // Use memo to avoid object reference change causing infinite loop
    const customGrid = React.useMemo(() => ({ rows: gridSize, cols: gridSize }), [gridSize]);

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 z-[200] flex flex-col bg-slate-900/90 backdrop-blur-md"
            >
                {/* Header/Close Button can be handled inside game, or we can provide an abort */}
                <div className="absolute top-4 right-4 z-50">
                    <button 
                        onClick={() => setShowMinigame(null)}
                        className="bg-red-500/80 text-white px-4 py-2 rounded-full font-bold shadow-lg"
                    >
                        Bỏ qua
                    </button>
                </div>
                
                <div className="flex-1 w-full h-full p-4 flex items-center justify-center">
                    {showMinigame.minigameType === 'fishing' || !isMinesweeper ? (
                        <FruitGame 
                            autoStart={true}
                            customGrid={customGrid}
                            onComplete={handleComplete}
                            onBack={() => setShowMinigame(null)}
                        />
                    ) : (
                        <MinesweeperGame 
                            autoStart={true}
                            customGrid={customGrid}
                            onComplete={handleComplete}
                            onActiveChange={() => {}}
                        />
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
