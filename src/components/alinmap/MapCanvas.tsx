import React, { useCallback, useEffect } from 'react';
import { motion, MotionValue, useMotionTemplate, useTransform } from 'framer-motion';

import { useLooterBoat } from './hooks/useLooterBoat';
import { useLooterState, useLooterActions } from './looter-game/LooterGameContext';
import { useMapInteractions } from './hooks/useMapInteractions';
import AlinMapThreeScene from './three/AlinMapThreeScene';
import type { AdaptivePerformanceProfile } from './hooks/useAdaptivePerformance';

// Sub-components
import { LooterBackground } from './components/LooterBackground';
import { 
    LocationConsentOverlay, CurseIndicator, 
    LooterLoadingOverlay, MapConnectionStatus 
} from './components/MapUIOverlays';
import { MapBoundary, SearchMarkerPin } from './components/MapObjects';
import FortressWaypoint from './components/FortressWaypoint';
import { useCombatCamera } from './looter-game/hooks/useCombatCamera';
import { BILLBOARD_UPRIGHT_PITCH_DEGREES } from './constants';


interface MapCanvasProps {
    position: [number, number] | null;
    isConsentOpen: boolean;
    myObfPos: { lat: number; lng: number } | null;
    nearbyUsers: any[];
    myUserId: string | null;
    user: any;
    myDisplayName: string;
    myAvatarUrl: string;
    myStatus: string;
    isVisibleOnMap: boolean;
    isConnecting: boolean;
    isDesktop: boolean;
    friends?: any[];
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
    cameraZ: MotionValue<number>;
    tiltAngle: MotionValue<number>;
    planeYScale: MotionValue<number>;
    perspectivePx: number;
    cameraHeightOffset: number;
    cameraRotateDeg: number;
    cameraPitchOverride: number | null;
    cameraRotateYDeg: number;
    panX: MotionValue<number>;
    panY: MotionValue<number>;
    selfDragX: MotionValue<number>;
    selfDragY: MotionValue<number>;
    ws: React.MutableRefObject<WebSocket | null>;
    requestLocation: (forceInvisible?: boolean) => void;
    selectedUser?: any;
    setSelectedUser: (user: any) => void;
    setActiveTab: (tab: 'info' | 'posts') => void;
    isSheetExpanded: boolean;
    setIsSheetExpanded: (v: boolean) => void;
    setMyObfPos: (pos: { lat: number; lng: number }) => void;
    addLog: (msg: string) => void;
    handleWheel: (e: React.WheelEvent) => void;
    mapMode: 'grid' | 'satellite';
    setContextMenu: (menu: { x: number, y: number, target: 'map' | 'user', data: any } | null) => void;
    isLooterGameMode?: boolean;
    isLooterLoading?: boolean;
    setMainTab?: (tab: string) => void;
    showNotification?: (msg: string, type: 'success' | 'error' | 'info') => void;
    setBoatCenterHandler?: (fn: (() => void) | null) => void;
    setIsTierSelectorOpen?: (v: boolean) => void;
    setCameraZ: (z: number) => void;
    setCameraHeightOffset: (v: number) => void;
    setCameraRotateDeg: (v: number) => void;
    setCameraPitchOverride: (v: number | null) => void;
    setCameraRotateYDeg: (v: number) => void;
    performance?: AdaptivePerformanceProfile;
}

const MapCanvas: React.FC<MapCanvasProps> = (props) => {
    const {
        position, isConsentOpen, myObfPos, nearbyUsers, myUserId, user, myDisplayName, myAvatarUrl, myStatus,
        isVisibleOnMap, isConnecting, isDesktop, currentProvince, galleryActive, galleryTitle, galleryImages,
        searchTag, filterDistance, filterAgeMin, filterAgeMax, searchMarkerPos,
        scale, cameraZ, tiltAngle, planeYScale, perspectivePx, cameraHeightOffset, cameraRotateDeg, cameraPitchOverride, cameraRotateYDeg, panX, panY, selfDragX, selfDragY, ws,
        requestLocation, selectedUser, setSelectedUser, setActiveTab, isSheetExpanded, setIsSheetExpanded, setMyObfPos, addLog, handleWheel,
        mapMode, setContextMenu, isLooterLoading, setMainTab, showNotification,
        setBoatCenterHandler, setIsTierSelectorOpen, performance
    } = props;

    const looterState = useLooterState();
    const looterActions = useLooterActions();
    const { isLooterGameMode, state: looterStateObj, isChallengeActive } = looterState;
    const isMapInteractionLocked = React.useMemo(() => !!(
        looterState.showMinigame ||
        looterState.encounter ||
        looterState.showCurseModal ||
        looterState.combatResult
    ), [looterState.showMinigame, looterState.encounter, looterState.showCurseModal, looterState.combatResult]);
    
    const looterBoat = useLooterBoat({
        isLooterGameMode: !!isLooterGameMode,
        myObfPos, scale, planeYScale, panX, panY,
        perspectivePx, cameraZ, cameraHeightOffset,
        setMainTab, setIsSheetExpanded, showNotification,
        setIsTierSelectorOpen
    });

    const [isCursesExpanded, setIsCursesExpanded] = React.useState(false);
    const tiltDeg = useMotionTemplate`${tiltAngle}deg`;
    const counterTiltDeg = useTransform(tiltAngle, (v) => `${-v}deg`);
    const billboardPitchDeg = useTransform(
        tiltAngle,
        (v) => `${-v + BILLBOARD_UPRIGHT_PITCH_DEGREES}deg`
    );
    const nodeCounterScale = useTransform(scale, (v) => 1 / Math.max(0.2, v || 1));

    // Sync Boat Center Handler to Context
    useEffect(() => {
        const boatHandler = (yOffset?: number, xOffset?: number) => {
            looterBoat.centerOnBoat(yOffset, xOffset);
        };
        const combatHandler = (yOffset?: number, xOffset?: number) => {
            looterBoat.centerOnCombat(yOffset, xOffset);
        };
        
        looterActions.setCenterBoatHandler(boatHandler);
        looterActions.setCenterCombatHandler(combatHandler);
        
        return () => {
            looterActions.setCenterBoatHandler(null);
            looterActions.setCenterCombatHandler(null);
        };
    }, [looterBoat.centerOnBoat, looterBoat.centerOnCombat, looterActions.setCenterBoatHandler, looterActions.setCenterCombatHandler]);

    const handleSelfDragEnd = useCallback((newLat: number, newLng: number) => {
        setMyObfPos({ lat: newLat, lng: newLng });
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'MAP_MOVE',
                payload: { lat: newLat, lng: newLng, zoom: 13 }
            }));
        }
        selfDragX.set(0);
        selfDragY.set(0);
        addLog(`Moved to: ${newLat.toFixed(4)}, ${newLng.toFixed(4)}`);
    }, [setMyObfPos, ws, selfDragX, selfDragY, addLog]);

    const handleSelectSelf = useCallback(() => {
        setSelectedUser(null);
        setActiveTab('posts');
        setMainTab?.('profile');
        setIsSheetExpanded(true);
    }, [setSelectedUser, setActiveTab, setMainTab, setIsSheetExpanded]);

    // Pointer Interactions Hook
    const {
        handleMapPointerDown, handleMapPointerMove, handleMapPointerUp,
        handleMapPointerCancel, handleMapClickCapture
    } = useMapInteractions({
        panX, panY, scale, isLooterGameMode: !!isLooterGameMode,
        myObfPos, looterBoat, encounter: looterState.encounter,
        isInteractionLocked: isMapInteractionLocked,
        planeYScale,
        cameraZ,
        setCameraZ: props.setCameraZ
    });
    
    // Auto-focus camera on combat center
    useCombatCamera(
        looterState.encounter, 
        looterBoat.centerOnCombat, 
        looterBoat.centerOnBoat,
        props.setCameraZ,
	        setMainTab,
	        setIsSheetExpanded,
	        !!isLooterGameMode,
	        isSheetExpanded
	    );

    return (
        <div className="absolute inset-0 overflow-hidden bg-[#001424]" onWheel={handleWheel} onContextMenu={(e) => e.preventDefault()}>
            <LooterBackground mode={performance?.backgroundMode} />

            {/* Location Consent Overlay */}
            {!position && isConsentOpen && (
                <LocationConsentOverlay requestLocation={requestLocation} />
            )}

            {/* Map Canvas Layer */}
            {position && (
                <div
                    className="absolute inset-0 overflow-hidden pointer-events-auto alin-map-scene"
                    style={{
                        '--alin-map-perspective-px': `${perspectivePx}px`,
                        '--alin-map-perspective-origin-y': '42%',
                        touchAction: 'none',
                    } as React.CSSProperties}
                    onPointerDown={handleMapPointerDown}
                    onPointerMove={handleMapPointerMove}
                    onPointerUp={handleMapPointerUp}
                    onPointerCancel={handleMapPointerCancel}
                    onClickCapture={handleMapClickCapture}
                >
                    <AlinMapThreeScene
                        position={position}
                        nearbyUsers={nearbyUsers}
                        myUserId={myUserId}
                        user={user}
                        myDisplayName={myDisplayName}
                        myAvatarUrl={myAvatarUrl}
                        myStatus={myStatus}
                        isVisibleOnMap={isVisibleOnMap}
                        isConnecting={isConnecting}
                        isDesktop={isDesktop}
                        currentProvince={currentProvince}
                        galleryActive={galleryActive}
                        galleryTitle={galleryTitle}
                        galleryImages={galleryImages}
                        searchTag={searchTag}
                        filterDistance={filterDistance}
                        filterAgeMin={filterAgeMin}
                        filterAgeMax={filterAgeMax}
                        searchMarkerPos={searchMarkerPos}
                        scale={scale}
                        cameraZ={cameraZ}
                        tiltAngle={tiltAngle}
                        planeYScale={planeYScale}
                        perspectivePx={perspectivePx}
                        cameraHeightOffset={cameraHeightOffset}
                        cameraRotateDeg={cameraRotateDeg}
                        cameraPitchOverride={cameraPitchOverride}
                        cameraRotateYDeg={cameraRotateYDeg}
                        panX={panX}
                        panY={panY}
                        selfDragX={selfDragX}
                        selfDragY={selfDragY}
                        mapMode={mapMode}
                        isLooterGameMode={isLooterGameMode}
                        boatTargetPin={looterBoat.boatTargetPin}
                        boatOffsetX={looterBoat.boatOffsetX}
                        boatOffsetY={looterBoat.boatOffsetY}
                        onRequestMove={looterBoat.executeMoveToExact}
                        onStopBoat={looterBoat.stopBoat}
                        onSelfDragEnd={handleSelfDragEnd}
                        onSetArrivalAction={looterBoat.setOnArrivalAction}
                        setIsTierSelectorOpen={setIsTierSelectorOpen}
                        selectedUser={selectedUser}
                        onSelectUser={setSelectedUser}
                        onSelectSelf={handleSelectSelf}
                        performance={performance}
                    />

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
                        reducedMotion={performance?.mode === 'low'}
                    />
                    <FortressWaypoint 
                        myObfPos={myObfPos} 
                        panX={panX} 
                        panY={panY} 
                        scale={scale} 
                        planeYScale={planeYScale}
                        performance={performance}
                    />
                </>
            )}

            {isLooterGameMode && isLooterLoading && <LooterLoadingOverlay />}

            {/* Connection Status */}
            {isConnecting && <MapConnectionStatus />}
        </div>
    );
};

const LoadingSpinner = () => (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
            <span className="text-blue-500 font-bold text-xs animate-pulse uppercase tracking-widest">Synchronizing Spatial Data...</span>
        </div>
    </div>
);

export default React.memo(MapCanvas);
