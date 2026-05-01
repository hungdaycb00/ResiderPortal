import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLooterState, useLooterActions } from './LooterGameContext';
import { FruitGame } from './minigames/FruitGame';
import { MinesweeperGame } from './minigames/MinesweeperGame';

export const PickupMinigame: React.FC = () => {
    const { showMinigame, state } = useLooterState();
    const { setShowMinigame, pickupItem, inflictMinigamePenalty } = useLooterActions();

    // Lưu quyết định game type vào ref để không bị random lại mỗi render
    const gameTypeRef = useRef<'fruit' | 'minesweeper' | null>(null);
    if (showMinigame && gameTypeRef.current === null) {
        gameTypeRef.current = showMinigame.minigameType === 'diving' || Math.random() > 0.5 
            ? 'minesweeper' : 'fruit';
    }
    if (!showMinigame) {
        gameTypeRef.current = null;
        return null;
    }

    const handleComplete = (success: boolean) => {
        const spawnId = showMinigame.spawnId;
        // Đóng popup NGAY LẬP TỨC, không đợi API
        setShowMinigame(null);
        // API call chạy nền, không block UI
        if (success) {
            pickupItem(spawnId);
        } else {
            inflictMinigamePenalty(spawnId);
        }
    };

    const worldTier = state.worldTier || 0;
    const baseSize = 3 + worldTier;
    // Đảm bảo tổng ô luôn chẵn cho game tìm cặp
    const rows = baseSize;
    const cols = (rows * rows) % 2 === 0 ? rows : rows + 1; // 3→4x3=12, 4→4x4=16, 5→6x5=30

    const customGrid = React.useMemo(() => ({ rows, cols }), [rows, cols]);
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
