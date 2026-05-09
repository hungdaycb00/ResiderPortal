import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLooterState, useLooterActions } from './LooterGameContext';
import { FruitGame } from './minigames/FruitGame';
import { MinesweeperGame } from './minigames/MinesweeperGame';

export const PickupMinigame: React.FC = () => {
    const { showMinigame, state, pregeneratedMinigames } = useLooterState();
    const { setShowMinigame, pickupItem, inflictMinigamePenalty, clearPregeneratedFruit, showNotification } = useLooterActions();

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
        } else {
            gameTypeRef.current = null;
        }
    }, [!!showMinigame]);

    const handleComplete = (success: boolean) => {
        const spawnId = showMinigame?.spawnId;
        if (!spawnId) return;

        const duration = Date.now() - mountTimeRef.current;

        // Đóng popup NGAY LẬP TỨC, không đợi API
        setShowMinigame(null);
        if (gameTypeRef.current === 'fruit') {
            clearPregeneratedFruit();
        }
        // API call chạy nền, không block UI
        if (success) {
            pickupItem(spawnId, showMinigame, (showMinigame as any).currentLat, (showMinigame as any).currentLng);
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
                className="fixed inset-0 z-[650] flex items-center justify-center bg-slate-950/90 p-3 backdrop-blur-md md:p-6"
            >
                <div
                    className="flex max-h-[92dvh] w-full max-w-[min(94vw,720px)] items-center justify-center overflow-auto rounded-2xl border border-cyan-500/30 bg-slate-950/95 p-3 shadow-2xl md:p-5"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    {!isMinesweeper ? (
                        <FruitGame 
                            autoStart={true}
                            customGrid={customGrid}
                            pregeneratedGrid={pregeneratedMinigames.fruit}
                            onComplete={handleComplete}
                            onBack={() => handleComplete(false)}
                            notify={showNotification}
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
