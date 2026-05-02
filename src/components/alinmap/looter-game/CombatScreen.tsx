import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLooterState, useLooterActions } from './LooterGameContext';
import { useCombatLoop } from './combat/hooks/useCombatLoop';

// Sub-components
import { CombatScene } from './combat/components/CombatScene';
import { CombatStatsPanel } from './combat/components/CombatStatsPanel';
import { FleeConfirmOverlay, CombatResultOverlay } from './combat/components/CombatOverlays';
import CombatInventoryGrid from './backpack/CombatInventoryGrid';

const CombatScreen: React.FC = () => {
    const { state, encounter } = useLooterState();
    const { 
        setEncounter, executeCombat, setCombatResult, loadState, 
        curseChoice, showNotification, setIsChallengeActive 
    } = useLooterActions();
    
    const [showFleeConfirm, setShowFleeConfirm] = useState(false);
    const [selectedResultItem, setSelectedResultItem] = useState<any>(null);
    const [selectedEnemyItem, setSelectedEnemyItem] = useState<any>(null);

    const combat = useCombatLoop({
        state, encounter, executeCombat, setCombatResult, showNotification
    });

    if (!encounter) return null;

    const handleClose = () => {
        if (combat.frameRef.current) cancelAnimationFrame(combat.frameRef.current);
        
        // Chỉ set kết quả toàn cục khi đóng màn hình này
        if (combat.pendingResult) {
            setCombatResult(combat.pendingResult);
            if (combat.pendingResult.result === 'win') {
                showNotification('Bạn đã chiến thắng!', 'success');
            } else {
                showNotification('Bạn đã thất bại...', 'error');
                // Khi thất bại và quay về thành, set trạng thái thử thách về false
                setIsChallengeActive(false);
            }
        }

        setEncounter(null);
        combat.setPhase('ready');
        combat.setInitialPlayerInventory([]);
        combat.setPendingResult(null);
        loadState();
    };

    const handleFlee = async () => {
        setShowFleeConfirm(false);
        if (combat.frameRef.current) cancelAnimationFrame(combat.frameRef.current);
        await curseChoice('flee');
        setEncounter(null);
        combat.setPhase('ready');
        combat.setInitialPlayerInventory([]);
        setCombatResult(null);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-transparent pointer-events-none flex flex-col overflow-hidden"
        >
            {/* 1. Desktop: Enemy Stats at Right */}
            {!state.showCurseModal && (
                <div className="hidden md:block absolute top-2 right-2 w-80 pointer-events-auto">
                    <CombatStatsPanel 
                        side="enemy" name={encounter.name} hp={combat.hpB} maxHp={combat.maxHpB}
                        actionProgress={combat.actionProgressB} maxActionBar={combat.maxActionBarB}
                        dmg={encounter.totalWeight} regen={combat.botStats.eRegen + 10}
                        inventory={encounter.inventory || []} bags={encounter.bags}
                        gridWidth={encounter.bags?.[0]?.width || 6} gridHeight={encounter.bags?.[0]?.height || 4}
                    />
                </div>
            )}

            {/* 2. Mobile: Enemy Stats at Top (Inventory + HUD nối tiếp) */}
            {!state.showCurseModal && (
                <>
                    <div className="md:hidden absolute top-0 left-0 right-0 flex flex-col pointer-events-auto">
                        {/* Enemy Inventory Background */}
                        <div className="bg-black/40 backdrop-blur-md border-b border-white/10 p-2">
                            <div className="flex items-center justify-between mb-2 px-1">
                                 <span className="text-xs font-black text-red-400 uppercase tracking-widest">{encounter.name}</span>
                            </div>
                            <div className="flex justify-center overflow-auto py-1">
                                <CombatInventoryGrid 
                                    items={encounter.inventory || []} 
                                    gridWidth={encounter.bags?.[0]?.width || 6} 
                                    gridHeight={encounter.bags?.[0]?.height || 4} 
                                    bag={encounter.bags?.[0]} 
                                    readOnly 
                                    cellSize={28}
                                    onItemClick={(item) => setSelectedEnemyItem(item)}
                                />
                            </div>
                        </div>
                        {/* Enemy HP/EN Bar - nối tiếp ngay dưới inventory */}
                        <div className="flex items-center gap-2 justify-end pr-2 pt-1">
                            <div className="flex flex-col gap-1 text-[9px] font-bold text-white/80 items-end">
                                <span className="bg-black/60 px-1.5 py-0.5 rounded shadow">⚔️ {encounter.totalWeight}</span>
                                <span className="bg-black/60 px-1.5 py-0.5 rounded shadow">⚡ +{combat.botStats.eRegen + 10}/s</span>
                            </div>
                            <div className="bg-black/60 backdrop-blur-xl rounded-xl border border-red-500/30 p-1.5 shadow-2xl w-48">
                                <div className="flex justify-between items-center mb-0.5 px-0.5">
                                    <span className="text-[8px] font-black text-red-400 uppercase">HP</span>
                                    <span className="text-[8px] font-black text-white">{Math.max(0, Math.round(combat.hpB))}</span>
                                </div>
                                <div className="h-1 bg-gray-900 rounded-full overflow-hidden mb-1.5 border border-white/5">
                                    <motion.div className="h-full bg-gradient-to-r from-red-600 to-orange-500" animate={{ width: `${Math.max(0, (combat.hpB / combat.maxHpB) * 100)}%` }} />
                                </div>
                                <div className="flex justify-between items-center mb-0.5 px-0.5">
                                    <span className="text-[8px] font-black text-blue-400 uppercase">EN</span>
                                    <span className="text-[8px] font-black text-white">{Math.round(combat.actionProgressB)}</span>
                                </div>
                                <div className="h-1 bg-gray-900 rounded-full overflow-hidden border border-white/5">
                                    <motion.div className="h-full bg-gradient-to-r from-blue-600 to-purple-500" animate={{ width: `${(combat.actionProgressB / combat.maxActionBarB) * 100}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Enemy Item Tooltip Popup */}
                    {selectedEnemyItem && (
                        <div 
                            className="md:hidden fixed inset-0 z-[500] flex items-center justify-center bg-black/50 pointer-events-auto"
                            onClick={() => setSelectedEnemyItem(null)}
                        >
                            <motion.div 
                                initial={{ scale: 0.8, opacity: 0 }} 
                                animate={{ scale: 1, opacity: 1 }}
                                className="bg-[#1a1f2e] border-2 border-cyan-500/40 rounded-2xl p-4 shadow-2xl min-w-[200px] max-w-[280px]"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-3xl">{selectedEnemyItem.icon}</span>
                                    <div>
                                        <p className="text-white font-black text-sm">{selectedEnemyItem.name}</p>
                                        <p className="text-xs text-gray-400 capitalize">{selectedEnemyItem.rarity}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div className="bg-black/40 rounded-lg p-2 text-center">
                                        <span className="text-red-400 font-bold">⚔️ {selectedEnemyItem.weight || 0}</span>
                                        <p className="text-gray-500 text-[9px]">DMG</p>
                                    </div>
                                    <div className="bg-black/40 rounded-lg p-2 text-center">
                                        <span className="text-green-400 font-bold">❤️ +{selectedEnemyItem.hpBonus || 0}</span>
                                        <p className="text-gray-500 text-[9px]">HP</p>
                                    </div>
                                    <div className="bg-black/40 rounded-lg p-2 text-center">
                                        <span className="text-blue-400 font-bold">⚡ +{selectedEnemyItem.energyMax || 0}</span>
                                        <p className="text-gray-500 text-[9px]">EN Max</p>
                                    </div>
                                    <div className="bg-black/40 rounded-lg p-2 text-center">
                                        <span className="text-cyan-400 font-bold">✨ +{selectedEnemyItem.energyRegen || 0}</span>
                                        <p className="text-gray-500 text-[9px]">Regen</p>
                                    </div>
                                </div>
                                <div className="mt-3 text-center">
                                    <span className="text-[10px] text-amber-400 font-bold">💰 {selectedEnemyItem.price || 0} vàng</span>
                                    <span className="text-[10px] text-gray-500 ml-2">{selectedEnemyItem.gridW}x{selectedEnemyItem.gridH}</span>
                                </div>
                                <button 
                                    onClick={() => setSelectedEnemyItem(null)}
                                    className="mt-3 w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-xs font-bold transition-colors"
                                >
                                    Đóng
                                </button>
                            </motion.div>
                        </div>
                    )}
                </>
            )}

            {/* 3. Mobile Player HUD: Above ChallengeStatusHeader */}
            {!state.showCurseModal && (
                <div className="md:hidden absolute bottom-[46%] left-2 w-48 pointer-events-auto">
                     <div className="bg-black/60 backdrop-blur-xl rounded-2xl border border-cyan-500/30 p-2 shadow-2xl">
                        <div className="flex justify-between items-center mb-1 px-1">
                            <span className="text-[9px] font-black text-cyan-400">ME: {Math.round(combat.hpA)}/{combat.maxHpA}</span>
                            <span className="text-[9px] font-black text-blue-400">EN: {Math.round(combat.actionProgressA)}/{combat.maxActionBarA}</span>
                        </div>
                        <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden mb-1 border border-white/5">
                            <motion.div className="h-full bg-gradient-to-r from-red-600 to-red-400" animate={{ width: `${(combat.hpA / combat.maxHpA) * 100}%` }} />
                        </div>
                        <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden border border-white/5">
                            <motion.div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400" animate={{ width: `${(combat.actionProgressA / combat.maxActionBarA) * 100}%` }} />
                        </div>
                     </div>
                </div>
            )}

            {/* 4. Removed - Mobile Enemy HUD now merged above */}

            {/* 5. Desktop Player Info at Bottom Left */}
            {!state.showCurseModal && (
                <div className="hidden md:block absolute bottom-2 left-2 w-80 pointer-events-auto">
                    <CombatStatsPanel 
                        side="player" name="Bạn" hp={combat.hpA} maxHp={combat.maxHpA}
                        actionProgress={combat.actionProgressA} maxActionBar={combat.maxActionBarA}
                        dmg={combat.myStats.weight} regen={combat.myStats.eRegen + 10}
                        inventory={combat.initialPlayerInventory}
                        gridWidth={state.inventoryWidth} gridHeight={state.inventoryHeight}
                    />
                </div>
            )}

            {/* 6. Fighting Scene (Start/Skip/Flee Buttons & Flying Items) */}
            {!state.showCurseModal && (
                <div className="absolute inset-0 pointer-events-none">
                     <CombatScene 
                        encounter={encounter} phase={combat.phase} flyingItem={combat.flyingItem}
                        handleStart={combat.handleStart} skipCombat={combat.skipCombat}
                        setShowFleeConfirm={setShowFleeConfirm}
                        isHUDMode={true}
                    />
                </div>
            )}

            {/* 7. Overlays */}
            <div className="pointer-events-auto">
                <FleeConfirmOverlay 
                    show={showFleeConfirm} onFlee={handleFlee} onCancel={() => setShowFleeConfirm(false)} 
                />

                <CombatResultOverlay 
                    show={combat.phase === 'result'} result={combat.pendingResult}
                    selectedItem={selectedResultItem} onSelectItem={setSelectedResultItem}
                    onClose={handleClose}
                />
            </div>
        </motion.div>
    );
};

export default React.memo(CombatScreen);
