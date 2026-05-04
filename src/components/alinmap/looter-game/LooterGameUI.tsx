import React from 'react';
import CombatScreen from './CombatScreen';
import CurseModal from './CurseModal';
import FortressStorageModal from './backpack/FortressStorageModal';
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
    } = useLooterState();
    const { setWorldTier, centerOnBoat, centerOnCombat } = useLooterActions();
    const [isTierOverlayDismissed, setIsTierOverlayDismissed] = React.useState(false);

    const isBoatAtFortress = React.useMemo(() => {
        const dist = Math.sqrt(
            Math.pow((state.currentLat || 0) - (state.fortressLat || 0), 2) +
            Math.pow(((state.currentLng || 0) - (state.fortressLng || 0)) * Math.cos(((state.currentLat || 0) * Math.PI) / 180), 2)
        ) * 111000;
        return dist <= 300;
    }, [state.currentLat, state.currentLng, state.fortressLat, state.fortressLng]);

    const shouldShowTierOverlay = state.initialized && !isChallengeActive && state.worldTier === -1 && isBoatAtFortress;

    React.useEffect(() => {
        if (!shouldShowTierOverlay) {
            setIsTierOverlayDismissed(false);
        }
    }, [shouldShowTierOverlay]);

    if (!isLooterGameMode) return null;

    const handleLocateBoat = () => {
        let yOffset = 0;
        if (!isDesktop) {
            const backpack = document.getElementById('looter-backpack-container');
            const backpackTop = backpack ? backpack.getBoundingClientRect().top : window.innerHeight;
            if (backpackTop < window.innerHeight) {
                yOffset = (window.innerHeight / 2) - (backpackTop / 2);
            }
        }

        if (encounter) {
            centerOnCombat(yOffset);
        } else {
            centerOnBoat(yOffset);
        }
    };

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

            {shouldShowTierOverlay && !isTierOverlayDismissed && (
                <ErrorBoundary name="TierSelector">
                    <TierSelectionOverlay
                        isOpen={true}
                        onClose={() => setIsTierOverlayDismissed(true)}
                        currentGold={state.looterGold || 0}
                        onSelectTier={(tier) => setWorldTier(tier)}
                    />
                </ErrorBoundary>
            )}

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
