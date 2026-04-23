import React from 'react';
import BackpackPanel from './BackpackPanel';
import CombatScreen from './CombatScreen';
import CurseModal from './CurseModal';

const SeaGameUI: React.FC = () => {
    return (
        <>
            <BackpackPanel />
            <CombatScreen />
            <CurseModal />
        </>
    );
};

export default SeaGameUI;
