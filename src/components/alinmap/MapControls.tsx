import React from 'react';
import { MotionValue } from 'framer-motion';
import { useLooterGame } from './looter-game/LooterGameContext';
import MapControlsQuickActions from './MapControlsQuickActions';
import MapControlsWeatherWidget from './MapControlsWeatherWidget';
import MapControlsFiltersSidebar from './MapControlsFiltersSidebar';
import CameraPanel from './components/CameraPanel';
import type { AlinMapMode } from './constants';

interface MapControlsProps {
    isSocketConnecting: boolean;
    isSidebarOpen: boolean;
    weatherData: { temp: number; desc: string; icon: string; humidity?: number; feelsLike?: number } | null;
    currentProvince?: string | null;
    myObfPos: { lat: number; lng: number } | null;
    friendLocInput: string;
    filterDistance: number;
    filterAgeMin: number;
    filterAgeMax: number;
    searchTag: string;
    mapMode: AlinMapMode;
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
    setMapMode: (v: AlinMapMode) => void;
    cameraZ: MotionValue<number>;
    setCameraZ: (z: number) => void;
    cameraHeightOffset: number;
    cameraPitchOverride: number | null;
    setCameraHeightOffset: (v: number) => void;
    setCameraPitchOverride: (v: number | null) => void;
    isWidgetExpanded: boolean;
    setIsWidgetExpanded: (v: boolean) => void;
    isSheetExpanded: boolean;
}

const MapControls: React.FC<MapControlsProps> = ({
    isSocketConnecting,
    isSidebarOpen,
    weatherData,
    currentProvince,
    myObfPos,
    friendLocInput,
    filterDistance,
    filterAgeMin,
    filterAgeMax,
    searchTag,
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
    cameraZ,
    setCameraZ,
    cameraHeightOffset,
    cameraPitchOverride,
    setCameraHeightOffset,
    setCameraPitchOverride,
    isWidgetExpanded,
    setIsWidgetExpanded,
    isSheetExpanded,
}) => {
    const { isLooterGameMode } = useLooterGame();

    return (
        <>
            <div className={`absolute right-2 md:right-8 z-[360] flex items-end gap-0 transition-all duration-500 ${isSheetExpanded ? 'opacity-0 pointer-events-none translate-x-4 md:opacity-100 md:pointer-events-auto md:translate-x-0' : 'opacity-100 translate-x-0 pointer-events-auto'} ${isLooterGameMode ? 'bottom-[42%]' : 'bottom-[75px] md:bottom-12'}`}>
                <CameraPanel
                    cameraZ={cameraZ}
                    cameraHeightOffset={cameraHeightOffset}
                    cameraPitchOverride={cameraPitchOverride}
                    setCameraZ={setCameraZ}
                    setCameraHeightOffset={setCameraHeightOffset}
                    setCameraPitchOverride={setCameraPitchOverride}
                />
                <div className="flex flex-col gap-2 md:gap-3 ml-2">
                    <MapControlsQuickActions
                        isSocketConnecting={isSocketConnecting}
                        isLooterGameMode={isLooterGameMode}
                        mapMode={mapMode}
                        handleRefresh={handleRefresh}
                        handleCenter={handleCenter}
                        setMapMode={setMapMode}
                    />
                </div>
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

export default MapControls;
