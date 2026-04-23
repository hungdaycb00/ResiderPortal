import React from 'react';
import CombatScreen from './CombatScreen';
import CurseModal from './CurseModal';

const SeaGameUI: React.FC = () => {
    return (
        <>
            <CombatScreen />
            <CurseModal />
        </>
    );
};

export default SeaGameUI;
