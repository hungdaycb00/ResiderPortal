import React from 'react';
import type { MotionValue } from 'framer-motion';
import { Map, RefreshCw, Waves, LocateFixed } from 'lucide-react';
import { LocateBoatButton } from './looter-game/components/LocateBoatButton';
import BoatSpeedPanel from './looter-game/components/BoatSpeedPanel';
import type { AlinMapMode } from './constants';

interface MapControlsQuickActionsProps {
    isSocketConnecting: boolean;
    isLooterGameMode: boolean;
    mapMode: AlinMapMode;
    handleRefresh: () => void;
    handleCenter: () => void;
    setMapMode: (v: AlinMapMode) => void;
    cameraZ: MotionValue<number>;
    perspectivePx: number;
    cameraPitchOverride: number | null;
}

const MapControlsQuickActions: React.FC<MapControlsQuickActionsProps> = ({
    isSocketConnecting,
    isLooterGameMode,
    mapMode,
    handleRefresh,
    handleCenter,
    setMapMode,
    cameraZ,
    perspectivePx,
    cameraPitchOverride,
}) => {
    return (
        <>
            <LocateBoatButton
                cameraZ={cameraZ}
                perspectivePx={perspectivePx}
                cameraPitchOverride={cameraPitchOverride}
            />

            {isLooterGameMode && <BoatSpeedPanel />}

            {!isLooterGameMode && (
                <>
                    <button
                        onClick={handleRefresh}
                        disabled={isSocketConnecting}
                        className="w-8 h-8 md:w-10 md:h-10 bg-white/60 md:bg-white backdrop-blur-md rounded-[10px] md:rounded-xl shadow-md md:shadow-[0_4px_15px_rgba(0,0,0,0.1)] flex items-center justify-center text-gray-700 hover:text-blue-600 active:scale-95 transition-all disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 ${isSocketConnecting ? 'animate-spin text-blue-600' : ''}`} />
                    </button>
                    <button
                        onClick={() => setMapMode(mapMode === 'roadmap' ? 'satellite' : 'roadmap')}
                        className={`w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-xl shadow-md backdrop-blur-md flex items-center justify-center active:scale-95 transition-all ${mapMode === 'satellite' ? 'bg-cyan-600/80 md:bg-cyan-600 text-white' : 'bg-white/60 md:bg-white text-gray-700'}`}
                        title={mapMode === 'satellite' ? 'Chuyen sang Roadmap' : 'Chuyen sang Satellite'}
                    >
                        {mapMode === 'satellite' ? <Map className="w-4 h-4 md:w-5 md:h-5" /> : <Waves className="w-4 h-4 md:w-5 md:h-5" />}
                    </button>
                </>
            )}

            {!isLooterGameMode && (
                <div className="flex flex-col bg-white/60 md:bg-white rounded-[10px] md:rounded-[14px] shadow-md overflow-hidden mt-1 pointer-events-auto backdrop-blur-md md:backdrop-blur-none">
                    <button
                        onClick={handleCenter}
                        className="w-8 h-8 md:w-[42px] md:h-11 text-blue-600 md:hover:bg-gray-50 flex items-center justify-center transition-colors"
                        title="Your Position"
                    >
                        <LocateFixed className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                </div>
            )}
        </>
    );
};

export default MapControlsQuickActions;
