import React from 'react';
import { LocateFixed } from 'lucide-react';
import { useLooterGame } from './looter-game/LooterGameContext';

export const LocateBoatButton: React.FC = () => {
    const { isLooterGameMode, encounter, centerOnBoat, centerOnCombat } = useLooterGame();

    if (!isLooterGameMode) return null;

    const handleLocateBoat = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const backpack = document.getElementById('looter-backpack-container');
        const backpackTop = backpack ? backpack.getBoundingClientRect().top : window.innerHeight;
        const visibleMapHeight = Math.max(120, backpack ? backpackTop : window.innerHeight);
        const yOffset = backpack ? (window.innerHeight / 2) - (visibleMapHeight / 2) : 0;

        if (encounter) {
            centerOnCombat(yOffset);
        } else {
            centerOnBoat(yOffset);
        }
    };

    return (
        <button
            type="button"
            data-map-interactive="true"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleLocateBoat}
            className="w-11 h-11 md:w-12 md:h-12 rounded-2xl border border-cyan-500/60 bg-[#0a1526]/85 text-cyan-300 shadow-[0_0_24px_rgba(8,145,178,0.35)] backdrop-blur-xl flex items-center justify-center active:scale-95 transition-all hover:bg-[#0f213a] hover:border-cyan-300"
            title="Định vị thuyền"
        >
            <LocateFixed className="w-5 h-5 md:w-6 md:h-6" />
        </button>
    );
};
