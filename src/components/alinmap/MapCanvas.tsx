import React, { useEffect } from 'react';
import { Eye, UserRound } from 'lucide-react';
import { motion, MotionValue } from 'framer-motion';
import MapTiles from './MapTiles';
import SelfNode from './SelfNode';
import LooterEntities from './LooterEntities';
import { useLooterBoat } from './hooks/useLooterBoat';
import { useLooterState, useLooterActions } from './looter-game/LooterGameContext';
import { useMapInteractions } from './hooks/useMapInteractions';

// Sub-components
import { LooterBackground, MapGrid } from './components/LooterBackground';
import { 
    LocationConsentOverlay, CurseIndicator, 
    LooterLoadingOverlay, MapConnectionStatus 
} from './components/MapUIOverlays';
import { MapBoundary, SearchMarkerPin } from './components/MapObjects';
import UserLayer from './components/UserLayer';
import FortressWaypoint from './components/FortressWaypoint';
import { useCombatCamera } from './looter-game/hooks/useCombatCamera';

interface MapCanvasProps {
    position: [number, number] | null;
    isConsentOpen: boolean;
    myObfPos: { lat: number; lng: number } | null;
    nearbyUsers: any[];
    myUserId: string | null;
    user: any;
    myDisplayName: string;
    myStatus: string;
    isVisibleOnMap: boolean;
    isConnecting: boolean;
    isDesktop: boolean;
    currentProvince: string | null;
    galleryActive: boolean;
    galleryTitle: string;
    galleryImages: string[];
    searchTag: string;
    filterDistance: number;
    filterAgeMin: number;
    filterAgeMax: number;
    searchMarkerPos: { lat: number; lng: number } | null;
    scale: MotionValue<number>;
    panX: MotionValue<number>;
    panY: MotionValue<number>;
    selfDragX: MotionValue<number>;
    selfDragY: MotionValue<number>;
    ws: React.MutableRefObject<WebSocket | null>;
    requestLocation: (forceInvisible?: boolean) => void;
    setSelectedUser: (user: any) => void;
    setActiveTab: (tab: 'info' | 'posts') => void;
    setIsSheetExpanded: (v: boolean) => void;
    setMyObfPos: (pos: { lat: number; lng: number }) => void;
    addLog: (msg: string) => void;
    handleWheel: (e: React.WheelEvent) => void;
    mapMode: 'grid' | 'satellite';
    setContextMenu: (menu: { x: number, y: number, target: 'map' | 'user', data: any } | null) => void;
    isLooterLoading?: boolean;
    setMainTab?: (tab: string) => void;
    showNotification?: (msg: string, type: 'success' | 'error' | 'info') => void;
    setBoatCenterHandler?: (fn: (() => void) | null) => void;
    setIsTierSelectorOpen?: (v: boolean) => void;
}

const MapCanvas: React.FC<MapCanvasProps> = (props) => {
    const {
        position, isConsentOpen, myObfPos, nearbyUsers, myUserId, user, myDisplayName, myStatus,
        isVisibleOnMap, isConnecting, isDesktop, currentProvince, galleryActive, galleryTitle, galleryImages,
        searchTag, filterDistance, filterAgeMin, filterAgeMax, searchMarkerPos,
        scale, panX, panY, selfDragX, selfDragY, ws,
        requestLocation, setSelectedUser, setActiveTab, setIsSheetExpanded, setMyObfPos, addLog, handleWheel,
        mapMode, setContextMenu, isLooterLoading, setMainTab, showNotification,
        setBoatCenterHandler, setIsTierSelectorOpen
    } = props;

    const looterState = useLooterState();
    const looterActions = useLooterActions();
    const { isLooterGameMode, state: looterStateObj, isChallengeActive } = looterState;
    
    const looterBoat = useLooterBoat({
        isLooterGameMode: !!isLooterGameMode,
        myObfPos, scale, panX, panY,
        setMainTab, setIsSheetExpanded, showNotification,
        setIsTierSelectorOpen
    });

    const [isCursesExpanded, setIsCursesExpanded] = React.useState(false);

    // Sync Boat Center Handler
    useEffect(() => {
        setBoatCenterHandler?.(looterBoat.centerOnBoat);
        return () => setBoatCenterHandler?.(null);
    }, [looterBoat.centerOnBoat, setBoatCenterHandler]);

    // Pointer Interactions Hook
    const {
        handleMapPointerDown, handleMapPointerMove, handleMapPointerUp,
        handleMapPointerCancel, handleMapClickCapture
    } = useMapInteractions({
        panX, panY, scale, isLooterGameMode: !!isLooterGameMode,
        looterStateObj, isChallengeActive: !!isChallengeActive,
        myObfPos, looterBoat, setIsTierSelectorOpen
    });
    
    // Auto-focus camera on combat center
    useCombatCamera(looterState.encounter, looterBoat.centerOnCombat, looterBoat.centerOnBoat);

    return (
        <div className="flex-1 relative overflow-hidden bg-[#001424]" onWheel={handleWheel} onContextMenu={(e) => e.preventDefault()}>
            <LooterBackground />

            {/* Location Consent Overlay */}
            {!position && isConsentOpen && (
                <LocationConsentOverlay requestLocation={requestLocation} />
            )}

            {/* Map Canvas Layer */}
            {position && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.div style={{ scale }} className="w-full h-full flex items-center justify-center">
                        <motion.div
                            style={{ x: panX, y: panY, touchAction: 'none' }}
                            className="absolute w-[10000px] h-[10000px] cursor-grab active:cursor-grabbing pointer-events-auto flex items-center justify-center border border-blue-500/10 bg-black/0"
                            onPointerDown={handleMapPointerDown}
                            onPointerMove={handleMapPointerMove}
                            onPointerUp={handleMapPointerUp}
                            onPointerCancel={handleMapPointerCancel}
                            onClickCapture={handleMapClickCapture}
                        >
                            <MapTiles panX={panX} panY={panY} scale={scale} myObfPos={myObfPos} mode={mapMode} />
                            <MapGrid mapMode={mapMode} />

                            {myObfPos && (
                                <>
                                    {currentProvince && <MapBoundary currentProvince={currentProvince} />}
                                    
                                    {user ? (
                                        <SelfNode
                                            isLooterGameMode={!!isLooterGameMode} myObfPos={myObfPos} myDisplayName={myDisplayName}
                                            myStatus={myStatus} isVisibleOnMap={isVisibleOnMap} isDesktop={isDesktop}
                                            user={user} myUserId={myUserId} galleryActive={galleryActive}
                                            galleryTitle={galleryTitle} galleryImages={galleryImages}
                                            scale={scale} selfDragX={selfDragX} selfDragY={selfDragY}
                                            panX={panX} panY={panY}
                                            boatOffsetX={looterBoat.boatOffsetX} boatOffsetY={looterBoat.boatOffsetY}
                                            ws={ws} setSelectedUser={setSelectedUser} setActiveTab={setActiveTab}
                                            setIsSheetExpanded={setIsSheetExpanded} setMyObfPos={setMyObfPos}
                                            setMainTab={setMainTab} addLog={addLog} looterState={looterStateObj}
                                        />
                                    ) : (
                                        <GuestNode />
                                    )}

                                    {searchMarkerPos && <SearchMarkerPin pos={searchMarkerPos} myObfPos={myObfPos} />}

                                    {isLooterGameMode && (
                                        <LooterEntities
                                            myObfPos={myObfPos} looterState={looterStateObj}
                                            boatTargetPin={looterBoat.boatTargetPin}
                                            boatOffsetX={looterBoat.boatOffsetX} boatOffsetY={looterBoat.boatOffsetY}
                                            executeMoveToExact={looterBoat.executeMoveToExact}
                                            stopBoat={looterBoat.stopBoat}
                                        />
                                    )}

                                    <UserLayer 
                                        nearbyUsers={nearbyUsers} myUserId={myUserId} user={user}
                                        myObfPos={myObfPos} searchTag={searchTag} filterDistance={filterDistance}
                                        filterAgeMin={filterAgeMin} filterAgeMax={filterAgeMax}
                                        isLooterGameMode={!!isLooterGameMode} scale={scale}
                                        setSelectedUser={setSelectedUser} setContextMenu={setContextMenu}
                                    />
                                </>
                            )}
                        </motion.div>
                    </motion.div>

                    {/* Global Synchronizing Spinner */}
                    {!myObfPos && <LoadingSpinner />}
                </div>
            )}

            {/* Looter Game Overlays */}
            {isLooterGameMode && (
                <>
                    <CurseIndicator 
                        cursePercent={looterState?.cursePercent || 0}
                        curseVisual={looterBoat.curseVisual}
                        activeCurses={looterStateObj?.activeCurses}
                        isExpanded={isCursesExpanded}
                        onToggle={() => setIsCursesExpanded(!isCursesExpanded)}
                    />
                    <FortressWaypoint 
                        myObfPos={myObfPos} 
                        panX={panX} 
                        panY={panY} 
                        scale={scale} 
                    />
                </>
            )}

            {isLooterGameMode && isLooterLoading && <LooterLoadingOverlay />}

            {/* Connection Status */}
            {isConnecting && <MapConnectionStatus />}
        </div>
    );
};

// Internal sub-components for cleaner structure
const GuestNode = () => (
    <div className="absolute z-[100] -ml-6 -mt-12 pointer-events-auto select-none" style={{ top: '50%', left: '50%' }}>
        <div className="absolute inset-0 rounded-full bg-slate-400/20 animate-ping" />
        <div className="relative w-12 h-12 rounded-full border-[2.5px] border-slate-300 bg-slate-950/90 shadow-[0_0_24px_rgba(148,163,184,0.35)] flex items-center justify-center overflow-hidden">
            <UserRound className="w-6 h-6 text-slate-200" />
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-slate-800 border border-slate-500 flex items-center justify-center">
                <Eye className="w-3 h-3 text-cyan-300" />
            </div>
        </div>
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/85 backdrop-blur border border-slate-500/40 px-2 py-1 rounded-full shadow-lg pointer-events-none">
            <span className="text-[9px] font-bold text-slate-200">Guest - see only</span>
        </div>
    </div>
);

const LoadingSpinner = () => (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
            <span className="text-blue-500 font-bold text-xs animate-pulse uppercase tracking-widest">Synchronizing Spatial Data...</span>
        </div>
    </div>
);

export default React.memo(MapCanvas);
