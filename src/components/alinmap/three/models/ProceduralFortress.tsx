import LootSprite from './LootSprite';
import { AVATAR_PLANE_SIZE } from '../sceneUtils';

interface ProceduralFortressProps {
    position: [number, number, number];
    scale?: number;
    onClick?: () => void;
}

export default function ProceduralFortress({ position, scale = 1, onClick }: ProceduralFortressProps) {
    return (
        <LootSprite
            position={position}
            type="fortress"
            title="Fortress"
            accent="#f59e0b"
            scale={scale}
            size={AVATAR_PLANE_SIZE * 1.5}
            onClick={onClick}
        />
    );
}
