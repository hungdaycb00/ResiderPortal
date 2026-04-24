import React from 'react';
import CombatScreen from './CombatScreen';
import CurseModal from './CurseModal';
import PickupMinigame from './PickupMinigame';
import { useSeaGame } from './SeaGameProvider';

const SeaGameUI: React.FC = () => {
    const { showMinigame, setShowMinigame, pickupItem } = useSeaGame();

    return (
        <>
            <CombatScreen />
            <CurseModal />
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
                        setShowMinigame(null);
                    }}
                    onClose={() => setShowMinigame(null)}
                />
            )}
        </>
    );
};

export default SeaGameUI;
