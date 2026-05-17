import React from 'react';
import LootSprite from './LootSprite';
import type { MotionValue } from 'framer-motion';

interface ProceduralFortressProps {
    position: [number, number, number];
    sizeMultiplier?: number;
    onClick?: () => void;
    zoomScale?: MotionValue<number>;
}

const ProceduralFortress: React.FC<ProceduralFortressProps> = ({ position, sizeMultiplier = 3, onClick, zoomScale }) => {
    return (
        <LootSprite
            position={position}
            type="fortress"
            title="Fortress"
            accent="#f59e0b"
            sizeMultiplier={sizeMultiplier}
            onClick={onClick}
            zoomScale={zoomScale}
        />
    );
};

export default React.memo(ProceduralFortress);
