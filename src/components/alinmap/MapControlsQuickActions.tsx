import React from 'react';
import { RefreshCw, Waves, LocateFixed } from 'lucide-react';
import { LocateBoatButton } from './looter-game/components/LocateBoatButton';

interface MapControlsQuickActionsProps {
    isConnecting: boolean;
    isLooterGameMode: boolean;
    mapMode: 'grid' | 'satellite';
    handleRefresh: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    handleCenter: () => void;
    setMapMode: (v: 'grid' | 'satellite') => void;
}

const MapControlsQuickActions: React.FC<MapControlsQuickActionsProps> = ({
    isConnecting,
    isLooterGameMode,
    mapMode,
    handleRefresh,
    zoomIn,
    zoomOut,
    handleCenter,
    setMapMode,
}) => {
    return (
        <>
            <LocateBoatButton />

            {!isLooterGameMode && (
                <>
                    <button
                        onClick={handleRefresh}
                        disabled={isConnecting}
                        className="w-8 h-8 md:w-10 md:h-10 bg-white/60 md:bg-white backdrop-blur-md rounded-[10px] md:rounded-xl shadow-md md:shadow-[0_4px_15px_rgba(0,0,0,0.1)] flex items-center justify-center text-gray-700 hover:text-blue-600 active:scale-95 transition-all disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 ${isConnecting ? 'animate-spin text-blue-600' : ''}`} />
                    </button>
                    <button
                        onClick={() => setMapMode(mapMode === 'grid' ? 'satellite' : 'grid')}
                        className={`w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-xl shadow-md backdrop-blur-md flex items-center justify-center active:scale-95 transition-all ${mapMode === 'satellite' ? 'bg-cyan-600/80 md:bg-cyan-600 text-white' : 'bg-white/60 md:bg-white text-gray-700'}`}
                        title={mapMode === 'satellite' ? 'Chuyển sang Lưới 3D' : 'Chuyển sang Bản đồ Looter'}
                    >
                        <Waves className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                </>
            )}

            {!isLooterGameMode && (
                <div className="flex flex-col bg-white/60 md:bg-white rounded-[10px] md:rounded-[14px] shadow-md overflow-hidden mt-1 pointer-events-auto backdrop-blur-md md:backdrop-blur-none">
                    <button
                        onClick={handleCenter}
                        className="w-8 h-8 md:w-[42px] md:h-11 text-blue-600 md:hover:bg-gray-50 flex items-center justify-center border-b border-white/30 md:border-gray-200 transition-colors"
                        title="Your Position"
                    >
                        <LocateFixed className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <button
                        onClick={zoomIn}
                        className="w-8 h-8 md:w-[42px] md:h-11 text-gray-700 md:text-gray-600 md:hover:bg-gray-50 flex items-center justify-center border-b border-white/30 md:border-gray-200 transition-colors"
                        title="Zoom In"
                    >
                        <span className="flex items-center justify-center text-lg md:text-2xl font-black h-full w-full">＋</span>
                    </button>
                    <button
                        onClick={zoomOut}
                        className="w-8 h-8 md:w-[42px] md:h-11 text-gray-700 md:text-gray-600 md:hover:bg-gray-50 flex items-center justify-center transition-colors"
                        title="Zoom Out"
                    >
                        <span className="flex items-center justify-center text-lg md:text-2xl font-black h-full w-full">－</span>
                    </button>
                </div>
            )}
        </>
    );
};

export default MapControlsQuickActions;
