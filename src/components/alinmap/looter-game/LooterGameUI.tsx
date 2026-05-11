import React from 'react';
import CombatScreen from './CombatScreen';
import CurseModal from './CurseModal';
import ChallengeStatusHeader from './components/ChallengeStatusHeader';
import IntegratedStoragePanel from '../features/backpack/components/IntegratedStoragePanel';
import { PickupMinigame } from './PickupMinigame';
import { useLooterState, useLooterActions } from './LooterGameContext';
import ErrorBoundary from '../../ErrorBoundary';
import TierSelectionOverlay from './TierSelectionOverlay';

const useMediaQuery = (query: string) => {
    const [matches, setMatches] = React.useState(false);

    React.useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) setMatches(media.matches);
        const listener = () => setMatches(media.matches);
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
    }, [query, matches]);

    return matches;
};

const LooterGameUI: React.FC = () => {
    const isDesktop = useMediaQuery('(min-width: 768px)');
    const {
        state,
        encounter,
        isChallengeActive,
        isLooterGameMode,
        isTierSelectorOpen,
    } = useLooterState();
    const { setWorldTier, setIsTierSelectorOpen } = useLooterActions();


    if (!isLooterGameMode) return null;



    return (
        <>
            <ChallengeStatusHeader
                isChallengeActive={!!isChallengeActive}
                worldTier={state.worldTier ?? -1}
                onStartChallenge={() => setIsTierSelectorOpen(true)}
            />

            <TierSelectionOverlay
                isOpen={isTierSelectorOpen}
                onClose={() => setIsTierSelectorOpen(false)}
                currentGold={state.looterGold || 0}
                onSelectTier={async (tier: number) => {
                    await setWorldTier(tier);
                    setIsTierSelectorOpen(false);
                }}
            />

            <ErrorBoundary name="Combat">
                <CombatScreen />
            </ErrorBoundary>

            <ErrorBoundary name="Curse">
                <CurseModal />
            </ErrorBoundary>


            <ErrorBoundary name="Minigame">
                <PickupMinigame />
            </ErrorBoundary>

            {!isDesktop && (
                <ErrorBoundary name="IntegratedStorage">
                    <IntegratedStoragePanel />
                </ErrorBoundary>
            )}
        </>
    );
};

export default LooterGameUI;
