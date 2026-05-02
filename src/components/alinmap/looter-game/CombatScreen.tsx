import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLooterState, useLooterActions } from './LooterGameContext';
import { useCombatLoop } from './combat/hooks/useCombatLoop';

// Sub-components
import { CombatScene } from './combat/components/CombatScene';
import { CombatStatsPanel } from './combat/components/CombatStatsPanel';
import { FleeConfirmOverlay, CombatResultOverlay } from './combat/components/CombatOverlays';

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
            className="fixed inset-0 z-[400] bg-[#040e1a] flex flex-col overflow-hidden"
        >
            {/* 1. Enemy Stats & Inventory (Mobile Top) */}
            <CombatStatsPanel 
                side="enemy" name={encounter.name} hp={combat.hpB} maxHp={combat.maxHpB}
                actionProgress={combat.actionProgressB} maxActionBar={combat.maxActionBarB}
                dmg={encounter.totalWeight} regen={combat.botStats.eRegen + 10}
                inventory={encounter.inventory || []} bags={encounter.bags}
                gridWidth={encounter.bags?.[0]?.width || 6} gridHeight={encounter.bags?.[0]?.height || 4} isMobileTop
            />

            {/* 2. Ocean scene with boats (Middle) */}
            <CombatScene 
                encounter={encounter} phase={combat.phase} flyingItem={combat.flyingItem}
                handleStart={combat.handleStart} skipCombat={combat.skipCombat}
                setShowFleeConfirm={setShowFleeConfirm}
            />

            {/* 3. Stats + Inventories (Desktop Layout / Player Inventory Bottom on Mobile) */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-0 md:p-2 gap-0 md:gap-2 bg-[#040e1a]">
                {/* Player side */}
                <CombatStatsPanel 
                    side="player" name="Bạn" hp={combat.hpA} maxHp={combat.maxHpA}
                    actionProgress={combat.actionProgressA} maxActionBar={combat.maxActionBarA}
                    dmg={combat.myStats.weight} regen={combat.myStats.eRegen + 10}
                    inventory={combat.initialPlayerInventory}
                    gridWidth={state.inventoryWidth} gridHeight={state.inventoryHeight}
                />

                {/* Enemy side (Desktop only) */}
                <div className="hidden md:flex flex-1">
                    <CombatStatsPanel 
                        side="enemy" name={encounter.name} hp={combat.hpB} maxHp={combat.maxHpB}
                        actionProgress={combat.actionProgressB} maxActionBar={combat.maxActionBarB}
                        dmg={encounter.totalWeight} regen={combat.botStats.eRegen + 10}
                        inventory={encounter.inventory || []} bags={encounter.bags}
                        gridWidth={encounter.bags?.[0]?.width || 6} gridHeight={encounter.bags?.[0]?.height || 4}
                    />
                </div>
            </div>

            {/* Overlays */}
            <FleeConfirmOverlay 
                show={showFleeConfirm} onFlee={handleFlee} onCancel={() => setShowFleeConfirm(false)} 
            />

            <CombatResultOverlay 
                show={combat.phase === 'result'} result={combat.pendingResult}
                selectedItem={selectedResultItem} onSelectItem={setSelectedResultItem}
                onClose={handleClose}
            />
        </motion.div>
    );
};

export default React.memo(CombatScreen);
