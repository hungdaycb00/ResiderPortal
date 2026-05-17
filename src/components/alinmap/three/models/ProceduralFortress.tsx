import React from 'react';
import LootSprite from './LootSprite';
import { AVATAR_PLANE_SIZE } from '../sceneUtils';

interface ProceduralFortressProps {
    position: [number, number, number];
    scale?: number;
    onClick?: () => void;
}

const ProceduralFortress: React.FC<ProceduralFortressProps> = ({ position, scale = 0.62, onClick }) => {
    return (
        <LootSprite
            position={position}
            type="fortress"
            title="Fortress"
            accent="#f59e0b"
            scale={scale}
            size={AVATAR_PLANE_SIZE}
            onClick={onClick}
        />
    );
};

export default React.memo(ProceduralFortress);
