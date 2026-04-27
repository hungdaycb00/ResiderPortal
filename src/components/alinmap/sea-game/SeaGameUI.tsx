import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CombatScreen from './CombatScreen';
import CurseModal from './CurseModal';
import PickupMinigame from './PickupMinigame';
import { FortressStorageModal } from './backpack';
import { useSeaGame } from './SeaGameProvider';

const RARITY_COLORS: Record<string, string> = {
  common: 'bg-sky-100 border-sky-300',
  uncommon: 'bg-emerald-100 border-emerald-300',
  rare: 'bg-amber-100 border-amber-400',
  legendary: 'bg-purple-100 border-purple-400',
};

const SeaGameUI: React.FC = () => {
    const { showMinigame, setShowMinigame, pickupItem, destroyItem, showDiscardModal, setShowDiscardModal, confirmDiscard, state } = useSeaGame();

    return (
        <>
            <CombatScreen />
            <CurseModal />
            <FortressStorageModal />
            {showMinigame && (
                <PickupMinigame
                    type={showMinigame.minigameType || 'fishing'}
                    difficulty={(() => {
                        if (showMinigame.isExpander) return 3;
                        const r = (showMinigame.item as any).rarity;
                        if (r === 'legendary') return 4;
                        if (r === 'rare') return 3;
                        if (r === 'uncommon') return 2;
                        return 1;
                    })()}
                    onWin={() => {
                        pickupItem(showMinigame.spawnId);
                        setShowMinigame(null);
                    }}
                    onLose={() => {
                        if (showMinigame?.spawnId) destroyItem(showMinigame.spawnId);
                        setShowMinigame(null);
                    }}
                    onClose={() => {
                        if (showMinigame?.spawnId) destroyItem(showMinigame.spawnId);
                        setShowMinigame(null);
                    }}
                />
            )}

            {/* Global Discard Modal for Floating Items */}
            <AnimatePresence>
                {showDiscardModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md pointer-events-auto"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="w-full max-w-sm bg-[#0d2137] border border-cyan-800/50 rounded-2xl p-6 shadow-2xl"
                        >
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-red-900/20 border border-red-500/30 flex items-center justify-center">
                                    <div className="text-3xl">⚠️</div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white mb-2">Vứt vật phẩm xuống biển?</h3>
                                    <p className="text-sm text-gray-400">Bạn đang có vật phẩm lơ lửng ở ngoài balo. Bạn có muốn vứt vật phẩm này xuống biển không?</p>
                                </div>
                                
                                {/* Display Floating Items */}
                                <div className="flex flex-wrap gap-2 my-2 justify-center">
                                    {state.inventory.filter(i => i.gridX < 0).map(item => (
                                        <div
                                            key={item.uid}
                                            className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 bg-gray-900/40 ${RARITY_COLORS[item.rarity] || ''}`}
                                            title={item.name}
                                        >
                                            <span className="text-2xl drop-shadow-md">{item.icon}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="w-full flex flex-col gap-3 mt-2">
                                    <button
                                        onClick={() => {
                                            confirmDiscard();
                                            setShowDiscardModal(false);
                                        }}
                                        className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all active:scale-95"
                                    >
                                        Vứt bỏ để di chuyển
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowDiscardModal(false);
                                        }}
                                        className="w-full py-3 bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-300 font-bold rounded-xl transition-all"
                                    >
                                        Quay lại
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default SeaGameUI;
