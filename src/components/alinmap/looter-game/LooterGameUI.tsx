import React from 'react';
import CombatScreen from './CombatScreen';
import CurseModal from './CurseModal';
import FortressStorageModal from './backpack/FortressStorageModal';
import ChallengeStatusHeader from './components/ChallengeStatusHeader';
import CombatLootModal from './backpack/CombatLootModal';
import { PickupMinigame } from './PickupMinigame';
import { useLooterState, useLooterActions } from './LooterGameContext';
import ErrorBoundary from '../../ErrorBoundary';

const LooterGameUI: React.FC = () => {
    const { 
        state, combatResult, isChallengeActive, isLooterGameMode
    } = useLooterState();
    const { setWorldTier } = useLooterActions();
    
    if (!isLooterGameMode) return null;

    return (
        <>
            <ChallengeStatusHeader 
                isChallengeActive={!!isChallengeActive} 
                worldTier={state.worldTier ?? -1} 
                onStartChallenge={() => setWorldTier(1)}
            />
            
            <ErrorBoundary name="Combat">
                <CombatScreen />
            </ErrorBoundary>
            
            <ErrorBoundary name="Curse">
                <CurseModal />
            </ErrorBoundary>

            {state.initialized && (
                <ErrorBoundary name="Storage">
                    <FortressStorageModal />
                </ErrorBoundary>
            )}
            
            {combatResult?.result === 'win' && combatResult?.loot && combatResult.loot.length > 0 && (
                <ErrorBoundary name="Loot">
                    <CombatLootModal />
                </ErrorBoundary>
            )}

            <ErrorBoundary name="Minigame">
                <PickupMinigame />
            </ErrorBoundary>
        </>
    );
};

export default LooterGameUI;
