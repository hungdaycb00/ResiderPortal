import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLooterState, useLooterActions } from './LooterGameContext';
import { FruitGame } from './minigames/FruitGame';
import { MinesweeperGame } from './minigames/MinesweeperGame';

export const PickupMinigame: React.FC = () => {
    const { showMinigame, state } = useLooterState();
    const { setShowMinigame, pickupItem, inflictMinigamePenalty } = useLooterActions();

    // 1. Hooks MUST be at the top level
    const gameTypeRef = useRef<'fruit' | 'minesweeper' | null>(null);
    const mountTimeRef = useRef<number>(0);

    // Calculate grid settings
    const worldTier = state.worldTier || 0;
    const baseSize = 3 + worldTier;
    const rows = baseSize;
    const cols = (rows * rows) % 2 === 0 ? rows : rows + 1;
    const customGrid = React.useMemo(() => ({ rows, cols }), [rows, cols]);

    // Handle minigame display logic and logging
    React.useEffect(() => {
        if (showMinigame) {
            if (gameTypeRef.current === null) {
                // Chest minigame triggers a random game (Fruit or Minesweeper)
                gameTypeRef.current = Math.random() > 0.5 ? 'minesweeper' : 'fruit';
            }
            mountTimeRef.current = Date.now();
            console.log(`[LooterPerf] Minigame mounted: ${showMinigame.minigameType || 'chest'} (spawnId: ${showMinigame.spawnId}) at ${mountTimeRef.current}`);
        } else {
            gameTypeRef.current = null;
        }
    }, [!!showMinigame]);

    const handleComplete = (success: boolean) => {
        const spawnId = showMinigame?.spawnId;
        if (!spawnId) return;

        const duration = Date.now() - mountTimeRef.current;
        console.log(`[LooterPerf] Minigame completed: ${success ? 'SUCCESS' : 'FAILED'} in ${duration}ms (spawnId: ${spawnId})`);

        // Đóng popup NGAY LẬP TỨC, không đợi API
        setShowMinigame(null);
        // API call chạy nền, không block UI
        if (success) {
            pickupItem(spawnId);
        } else {
            inflictMinigamePenalty(spawnId);
        }
    };

    if (!showMinigame) return null;

    const isMinesweeper = gameTypeRef.current === 'minesweeper';

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 z-[200] flex flex-col bg-slate-900/90 backdrop-blur-md"
            >
                <div className="flex-1 w-full h-full p-4 flex items-center justify-center">
                    {!isMinesweeper ? (
                        <FruitGame 
                            autoStart={true}
                            customGrid={customGrid}
                            onComplete={handleComplete}
                            onBack={() => handleComplete(false)}
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
