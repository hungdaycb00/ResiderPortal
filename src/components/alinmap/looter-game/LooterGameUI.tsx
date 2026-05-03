import React from 'react';
import CombatScreen from './CombatScreen';
import CurseModal from './CurseModal';
import FortressStorageModal from './backpack/FortressStorageModal';
import ChallengeStatusHeader from './components/ChallengeStatusHeader';
import IntegratedStoragePanel from '../features/backpack/components/IntegratedStoragePanel';
import { PickupMinigame } from './PickupMinigame';
import { Database } from 'lucide-react';
import { useLooterState, useLooterActions } from './LooterGameContext';
import ErrorBoundary from '../../ErrorBoundary';

const LooterGameUI: React.FC = () => {
    const { 
        state, combatResult, isChallengeActive, isLooterGameMode,
        isIntegratedStorageOpen
    } = useLooterState();
    const { setWorldTier, toggleIntegratedStorage } = useLooterActions();
    
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

            {/* Floating Storage Button - Outside BackpackView, Top Left edge */}
            {isLooterGameMode && state.worldTier === -1 && (
                <div className="fixed bottom-0 left-0 z-[250] pointer-events-none w-full max-w-7xl mx-auto px-1 md:px-4">
                    <div className="relative w-full h-[400px] md:h-[400px]">
                        <button
                            onClick={toggleIntegratedStorage}
                            className={`pointer-events-auto absolute -top-12 left-2 p-2 rounded-xl border transition-all shadow-2xl ${
                                isIntegratedStorageOpen 
                                ? 'bg-cyan-500 border-cyan-400 text-white shadow-[0_0_20px_rgba(34,211,238,0.6)] scale-110' 
                                : 'bg-[#0a1526]/90 border-cyan-500/30 text-cyan-400 hover:bg-[#0f213a] hover:border-cyan-400'
                            }`}
                            title="Kho đồ thành trì"
                        >
                            <Database className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            <ErrorBoundary name="IntegratedStorage">
                <IntegratedStoragePanel />
            </ErrorBoundary>
        </>
    );
};

export default LooterGameUI;
