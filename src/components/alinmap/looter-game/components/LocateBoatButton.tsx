import React from 'react';
import { LocateFixed } from 'lucide-react';
import { useLooterGame } from '../LooterGameContext';

export const LocateBoatButton: React.FC = () => {
    const { isLooterGameMode, encounter, centerOnBoat, centerOnCombat } = useLooterGame();

    if (!isLooterGameMode) return null;

    const getVisibleMapOffsets = () => {
        const backpack = document.getElementById('looter-backpack-container');
        const rect = backpack?.getBoundingClientRect();
        if (!rect) return { xOffset: 0, yOffset: 0 };

        const isDesktopSidePanel =
            window.innerWidth >= 768 &&
            rect.left < window.innerWidth * 0.35 &&
            rect.width < window.innerWidth * 0.8 &&
            rect.height > window.innerHeight * 0.55;

        if (isDesktopSidePanel) {
            const visibleLeft = Math.min(Math.max(rect.right, 0), window.innerWidth);
            const visibleCenterX = (visibleLeft + window.innerWidth) / 2;
            return { xOffset: visibleCenterX - window.innerWidth / 2, yOffset: 0 };
        }

        const visibleMapHeight = Math.max(120, Math.min(rect.top, window.innerHeight));
        const visibleCenterY = visibleMapHeight / 2;
        return { xOffset: 0, yOffset: window.innerHeight / 2 - visibleCenterY };
    };

    const handleLocateBoat = (e: React.MouseEvent | React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const { xOffset, yOffset } = getVisibleMapOffsets();
        if (encounter) {
            centerOnCombat(yOffset, xOffset);
        } else {
            centerOnBoat(yOffset, xOffset);
        }
    };

    return (
        <button
            type="button"
            data-map-interactive="true"
            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onPointerUp={handleLocateBoat}
            className="w-11 h-11 md:w-12 md:h-12 rounded-2xl border border-cyan-500/60 bg-[#0a1526]/85 text-cyan-300 shadow-[0_0_24px_rgba(8,145,178,0.35)] backdrop-blur-xl flex items-center justify-center active:scale-95 transition-all hover:bg-[#0f213a] hover:border-cyan-300"
            title="Định vị thuyền"
        >
            <LocateFixed className="w-5 h-5 md:w-6 md:h-6" />
        </button>
    );
};
