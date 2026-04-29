import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CombatScreen from './CombatScreen';
import CurseModal from './CurseModal';
import PickupMinigame from './PickupMinigame';
import { FortressStorageModal } from './backpack';
import CombatLootModal from './backpack/CombatLootModal';
import { useLooterGame } from './LooterGameContext';

const RARITY_COLORS: Record<string, string> = {
  common: 'bg-sky-100 border-sky-300',
  uncommon: 'bg-emerald-100 border-emerald-300',
  rare: 'bg-amber-100 border-amber-400',
  legendary: 'bg-purple-100 border-purple-400',
};

const LooterGameUI: React.FC = () => {
    const { showMinigame, setShowMinigame, pickupItem, inflictMinigamePenalty, destroyItem, showDiscardModal, setShowDiscardModal, confirmDiscard, state, combatResult, openBackpack, preGeneratedMinigame, setPreGeneratedMinigame, draggingMapItem, dragPointerPos } = useLooterGame();

    return (
        <>
            <CombatScreen />
            <CurseModal />
            {state.initialized && <FortressStorageModal />}
            {combatResult?.result === 'win' && combatResult?.loot && combatResult.loot.length > 0 && (
                <CombatLootModal />
            )}
            {showMinigame && (
                <PickupMinigame
                    type={showMinigame.minigameType || 'fishing'}
                    tier={showMinigame.item?.type === 'bag' ? (state.worldTier || 0) + 1 : (state.worldTier || 0)}
                    difficulty={(() => {
                        let diff = 1;
                        if (showMinigame.isExpander) diff = 3;
                        else {
                            const r = (showMinigame.item as any).rarity;
                            if (r === 'legendary') diff = 4;
                            else if (r === 'rare') diff = 3;
                            else if (r === 'uncommon') diff = 2;
                        }
                        // Nếu là balo, tăng thêm 1 độ khó nếu chưa đạt max
                        if (showMinigame.item?.type === 'bag') diff = Math.min(4, diff + 1);
                        return diff;
                    })()}
                    onWin={() => {
                        pickupItem(showMinigame.spawnId);
                        setShowMinigame(null);
                        setPreGeneratedMinigame(null);
                    }}
                    onLose={() => {
                        if (showMinigame?.spawnId) inflictMinigamePenalty(showMinigame.spawnId);
                        setShowMinigame(null);
                        setPreGeneratedMinigame(null);
                    }}
                    onClose={() => {
                        if (showMinigame?.spawnId) inflictMinigamePenalty(showMinigame.spawnId);
                        setShowMinigame(null);
                        setPreGeneratedMinigame(null);
                    }}
                    preGeneratedGrid={preGeneratedMinigame?.type === 'fishing' ? preGeneratedMinigame.grid : null}
                />
            )}



            {/* Map Item Drag Overlay */}
            <AnimatePresence>
                {draggingMapItem && (
                    <motion.div
                        className="fixed pointer-events-none z-[600]"
                        style={{
                            left: dragPointerPos.x,
                            top: dragPointerPos.y,
                            x: '-50%',
                            y: '-50%',
                        }}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1.2, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                    >
                        <div className="flex flex-col items-center">
                            <span className="text-4xl drop-shadow-2xl filter drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
                                {draggingMapItem.item?.icon || '💎'}
                            </span>
                            <div className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-cyan-500/30 mt-2">
                                <span className="text-[10px] font-black text-cyan-300 whitespace-nowrap">
                                    Thả vào balo để nhặt
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default LooterGameUI;
