import React from 'react';
import { LocateFixed } from 'lucide-react';
import type { MotionValue } from 'framer-motion';
import { useLooterGame } from '../LooterGameContext';
import { getVisibleBoatCameraOffsets } from '../utils/boatCameraFocus';
import { getTiltAngleFromCameraZ } from '../../constants';

interface LocateBoatButtonProps {
    cameraZ?: MotionValue<number>;
    perspectivePx?: number;
    cameraPitchOverride?: number | null;
}

export const LocateBoatButton: React.FC<LocateBoatButtonProps> = ({
    cameraZ,
    perspectivePx,
    cameraPitchOverride,
}) => {
    const { isLooterGameMode, encounter, centerOnBoat, centerOnCombat } = useLooterGame();

    if (!isLooterGameMode) return null;

    const handleLocateBoat = (e: React.MouseEvent | React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const currentCameraZ = cameraZ?.get?.();
        const tiltDeg = cameraPitchOverride ?? (typeof currentCameraZ === 'number' ? getTiltAngleFromCameraZ(currentCameraZ) : undefined);
        const { xOffset, yOffset } = getVisibleBoatCameraOffsets({
            cameraZ: currentCameraZ,
            perspectivePx,
            tiltDeg,
        });
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
