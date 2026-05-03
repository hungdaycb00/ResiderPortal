import React from 'react';
import CombatScreen from './CombatScreen';
import CurseModal from './CurseModal';
import FortressStorageModal from './backpack/FortressStorageModal';
import ChallengeStatusHeader from './components/ChallengeStatusHeader';
import IntegratedStoragePanel from '../features/backpack/components/IntegratedStoragePanel';
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
            

            <ErrorBoundary name="Minigame">
                <PickupMinigame />
            </ErrorBoundary>

            <ErrorBoundary name="IntegratedStorage">
                <IntegratedStoragePanel />
            </ErrorBoundary>
        </>
    );
};

export default LooterGameUI;
