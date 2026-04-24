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
                    type={showMinigame.rarity >= 4 ? 'chest' : (showMinigame.rarity >= 3 ? 'diving' : 'fishing')}
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
