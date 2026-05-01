import React from 'react';
import CombatScreen from './CombatScreen';
import CurseModal from './CurseModal';
import { FortressStorageModal } from './backpack';
import ChallengeStatusHeader from './components/ChallengeStatusHeader';
import CombatLootModal from './backpack/CombatLootModal';
import { useLooterState } from './LooterGameContext';
import ErrorBoundary from '../../ErrorBoundary';

const LooterGameUI: React.FC = () => {
    const { 
        state, combatResult, isChallengeActive, isLooterGameMode
    } = useLooterState();
    
    if (!isLooterGameMode) return null;

    return (
        <>
            <ChallengeStatusHeader 
                isChallengeActive={!!isChallengeActive} 
                worldTier={state.worldTier || 0} 
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
        </>
    );
};

export default LooterGameUI;
