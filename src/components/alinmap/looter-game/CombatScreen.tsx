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

            {/* 2. Mobile: Enemy Stats at Top (Inventory Only) */}
            {!state.showCurseModal && (
                <>
                    <div className="md:hidden absolute top-0 left-0 right-0 bg-black/40 backdrop-blur-md border-b border-white/10 p-2 pointer-events-auto">
                        <div className="flex items-center justify-between mb-2 px-1">
                             <span className="text-xs font-black text-red-400 uppercase tracking-widest">{encounter.name}</span>
                             <div className="flex gap-3 text-[9px] font-bold text-white/80">
                                <span>⚔️ {encounter.totalWeight}</span>
                                <span>⚡ +{combat.botStats.eRegen + 10}/s</span>
                             </div>
                        </div>
                        <div className="flex justify-center overflow-auto py-1">
                            <CombatInventoryGrid 
                                items={encounter.inventory || []} 
                                gridWidth={encounter.bags?.[0]?.width || 6} 
                                gridHeight={encounter.bags?.[0]?.height || 4} 
                                bag={encounter.bags?.[0]} 
                                readOnly 
                                cellSize={28}
                            />
                        </div>
                    </div>

                    {/* Enemy HP/EN Bar moved outside */}
                    <div className="md:hidden absolute top-[160px] right-2 w-48 pointer-events-auto">
                        <div className="bg-black/60 backdrop-blur-xl rounded-xl border border-red-500/30 p-1.5 shadow-2xl">
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
