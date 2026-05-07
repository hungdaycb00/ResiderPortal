import React from 'react';
import { useLooterGame } from './looter-game/LooterGameContext';
import MapControlsQuickActions from './MapControlsQuickActions';
import MapControlsWeatherWidget from './MapControlsWeatherWidget';
import MapControlsFiltersSidebar from './MapControlsFiltersSidebar';

interface MapControlsProps {
    isConnecting: boolean;
    isSidebarOpen: boolean;
    weatherData: { temp: number; desc: string; icon: string; humidity?: number; feelsLike?: number } | null;
    currentProvince?: string | null;
    myObfPos: { lat: number; lng: number } | null;
    friendLocInput: string;
    filterDistance: number;
    filterAgeMin: number;
    filterAgeMax: number;
    searchTag: string;
    zoomIn: () => void;
    zoomOut: () => void;
    mapMode: 'grid' | 'satellite';
    setIsSidebarOpen: (v: boolean) => void;
    setFriendLocInput: (v: string) => void;
    setSearchMarkerPos: (pos: { lat: number; lng: number } | null) => void;
    setFilterDistance: (v: number) => void;
    setFilterAgeMin: (v: number) => void;
    setFilterAgeMax: (v: number) => void;
    setSearchTag: (v: string) => void;
    handleRefresh: () => void;
    handleCenter: () => void;
    handleCenterTo: (lat: number, lng: number, offset?: number) => void;
    setMapMode: (v: 'grid' | 'satellite') => void;
    isWidgetExpanded: boolean;
    setIsWidgetExpanded: (v: boolean) => void;
    isSheetExpanded: boolean;
}

const MapControls: React.FC<MapControlsProps> = ({
    isConnecting,
    isSidebarOpen,
    weatherData,
    currentProvince,
    myObfPos,
    friendLocInput,
    filterDistance,
    filterAgeMin,
    filterAgeMax,
    searchTag,
    zoomIn,
    zoomOut,
    mapMode,
    setIsSidebarOpen,
    setFriendLocInput,
    setSearchMarkerPos,
    setFilterDistance,
    setFilterAgeMin,
    setFilterAgeMax,
    setSearchTag,
    handleRefresh,
    handleCenter,
    handleCenterTo,
    setMapMode,
    isWidgetExpanded,
    setIsWidgetExpanded,
    isSheetExpanded,
}) => {
    const { isLooterGameMode } = useLooterGame();

    return (
        <>
            <div className={`absolute right-2 md:right-8 z-[360] flex flex-col gap-2 md:gap-3 pointer-events-auto transition-all duration-500 ${isSheetExpanded ? 'opacity-0 pointer-events-none translate-x-4' : 'opacity-100 translate-x-0'} ${isLooterGameMode ? 'bottom-[42%]' : 'bottom-[75px] md:bottom-12'}`}>
                <MapControlsQuickActions
                    isConnecting={isConnecting}
                    isLooterGameMode={isLooterGameMode}
                    mapMode={mapMode}
                    handleRefresh={handleRefresh}
                    zoomIn={zoomIn}
                    zoomOut={zoomOut}
                    handleCenter={handleCenter}
                    setMapMode={setMapMode}
                />
            </div>

            {!isLooterGameMode && (
                <MapControlsWeatherWidget
                    weatherData={weatherData}
                    currentProvince={currentProvince}
                    myObfPos={myObfPos}
                    friendLocInput={friendLocInput}
                    setFriendLocInput={setFriendLocInput}
                    setSearchMarkerPos={setSearchMarkerPos}
                    handleCenterTo={handleCenterTo}
                    isWidgetExpanded={isWidgetExpanded}
                    setIsWidgetExpanded={setIsWidgetExpanded}
                />
            )}

            <MapControlsFiltersSidebar
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                filterDistance={filterDistance}
                filterAgeMin={filterAgeMin}
                filterAgeMax={filterAgeMax}
                searchTag={searchTag}
                setFilterDistance={setFilterDistance}
                setFilterAgeMin={setFilterAgeMin}
                setFilterAgeMax={setFilterAgeMax}
                setSearchTag={setSearchTag}
            />
        </>
    );
};

export default React.memo(MapControls);
