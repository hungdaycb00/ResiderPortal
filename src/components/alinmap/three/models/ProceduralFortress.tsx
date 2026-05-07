import LootSprite from './LootSprite';

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
            scale={scale * 2.15}
            size={34}
            onClick={onClick}
        />
    );
}
