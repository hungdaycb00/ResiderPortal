import React, { useCallback, useEffect } from 'react';
import { motion, MotionValue, useMotionTemplate, useTransform, useMotionValueEvent } from 'framer-motion';

import { useLooterBoat } from './hooks/useLooterBoat';
import { useLooterState, useLooterActions } from './looter-game/LooterGameContext';
import { useMapInteractions } from './hooks/useMapInteractions';
import AlinMapThreeScene from './three/AlinMapThreeScene';
import MapTiles from './MapTiles';
import LooterMapPlaneLayer from './components/LooterMapPlaneLayer';
import RoadmapAvatarLayer from './components/RoadmapAvatarLayer';
import MapReferenceGridOverlay from './components/MapReferenceGridOverlay';
import type { AdaptivePerformanceProfile } from './hooks/useAdaptivePerformance';
import AlinMapLoadingIcon from './components/AlinMapLoadingIcon';

// Sub-components
import { LooterBackground } from './components/LooterBackground';
import { 
    LocationConsentOverlay, CurseIndicator 
} from './components/MapUIOverlays';
import { MapBoundary, SearchMarkerPin } from './components/MapObjects';
import { useCombatCamera } from './looter-game/hooks/useCombatCamera';
import { BILLBOARD_UPRIGHT_PITCH_DEGREES, MAP_PLANE_SCALE, ROADMAP_WORLD_SCALE, type AlinMapMode } from './constants';


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
    isSocketConnecting: boolean;
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
    mapMode: AlinMapMode;
    setContextMenu: (menu: { x: number, y: number, target: 'map' | 'user', data: any } | null) => void;
    isLooterGameMode?: boolean;
    isBackpackLoading?: boolean;
    setMainTab?: (tab: string) => void;
    showNotification?: (msg: string, type: 'success' | 'error' | 'info') => void;
    setBoatCenterHandler?: (fn: (() => void) | null) => void;
    setIsTierSelectorOpen?: (v: boolean) => void;
    setCameraZ: (z: number) => void;
    setCameraHeightOffset: (v: number) => void;
    setCameraRotateDeg: (v: number) => void;
    setCameraPitchOverride: (v: number | null) => void;
    setCameraRotateYDeg: (v: number) => void;
    setCameraFov: (v: number) => void;
    cameraFov: number;
    performance?: AdaptivePerformanceProfile;
}

const MapCanvas: React.FC<MapCanvasProps> = (props) => {
    const {
        position, isConsentOpen, myObfPos, nearbyUsers, myUserId, user, myDisplayName, myAvatarUrl, myStatus,
        isVisibleOnMap, isSocketConnecting, isDesktop, currentProvince, galleryActive, galleryTitle, galleryImages,
        searchTag, filterDistance, filterAgeMin, filterAgeMax, searchMarkerPos,
        scale, cameraZ, tiltAngle, planeYScale, perspectivePx, cameraHeightOffset, cameraRotateDeg, cameraPitchOverride, cameraRotateYDeg, panX, panY, selfDragX, selfDragY, ws,
        requestLocation, selectedUser, setSelectedUser, setActiveTab, isSheetExpanded, setIsSheetExpanded, setMyObfPos, addLog, handleWheel,
        mapMode, setContextMenu, isBackpackLoading, setMainTab, showNotification,
        setBoatCenterHandler, setIsTierSelectorOpen, performance,
        setCameraFov, cameraFov,
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
        perspectivePx, cameraFov, cameraZ, cameraHeightOffset,
        setMainTab, setIsSheetExpanded, showNotification,
        setIsTierSelectorOpen
    });

    const [isCursesExpanded, setIsCursesExpanded] = React.useState(false);
    const [debugCameraZ, setDebugCameraZ] = React.useState(() => Math.round(cameraZ.get()));
    const [debugScale, setDebugScale] = React.useState(() => scale.get());
    const tiltDeg = useMotionTemplate`${tiltAngle}deg`;
    const counterTiltDeg = useTransform(tiltAngle, (v) => `${-v}deg`);
    const billboardPitchDeg = useTransform(
        tiltAngle,
        (v) => `${-v + BILLBOARD_UPRIGHT_PITCH_DEGREES}deg`
    );
    const nodeCounterScale = useTransform(scale, (v) => Math.max(0.35, Math.min(1.6, v || 1)));
    const nodeCounterScaleCss = useMotionTemplate`${nodeCounterScale}`;
    const sceneWorldScale = mapMode === 'roadmap' && !isLooterGameMode ? ROADMAP_WORLD_SCALE : 1;
    const showRoadmapDiagnostics = import.meta.env.DEV && typeof window !== 'undefined' && window.localStorage.getItem('alinmap.debugRoadmap') === '1';
    const showReferenceGrid = React.useMemo(() => {
        if (mapMode !== 'roadmap') return false;
        if (typeof window === 'undefined') return false;
        const value = window.localStorage.getItem('alinmap.showReferenceGrid');
        if (value === '1') return true;
        return false;
    }, [mapMode]);

    useMotionValueEvent(cameraZ, 'change', (latest) => {
        setDebugCameraZ(Math.round(latest));
    });

    useMotionValueEvent(scale, 'change', (latest) => {
        setDebugScale(latest);
    });

    useEffect(() => {
        if (!showRoadmapDiagnostics || !position || mapMode !== 'roadmap') return;

        const timer = window.setTimeout(() => {
            const scalePct = Math.round(debugScale * 100);
            const message = `[RoadmapDiag] cameraZ=${debugCameraZ} scale=${scalePct}% worldScale=${sceneWorldScale.toFixed(2)} tilt=${Math.round(tiltAngle.get())}deg`;
            addLog(message);
            console.info(message);
        }, 250);

        return () => window.clearTimeout(timer);
    }, [addLog, debugCameraZ, debugScale, mapMode, position, sceneWorldScale, showRoadmapDiagnostics, tiltAngle]);

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
        setCameraZ: props.setCameraZ,
        mapMode,
        useDomLooterLayer: !!isLooterGameMode && mapMode === 'roadmap',
    });
    
    // Auto-focus camera on combat center
    useCombatCamera(
        looterState.encounter, 
        looterBoat.centerOnBoat, 
        looterBoat.centerOnBoat,
        props.setCameraZ,
	        setMainTab,
	        setIsSheetExpanded,
	        !!isLooterGameMode,
	        isSheetExpanded,
	        cameraZ,
	        perspectivePx,
	        cameraPitchOverride
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
                    <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[180vmax] w-[180vmax] -translate-x-1/2 -translate-y-1/2">
                        <motion.div
                            className="absolute inset-0 alin-map-tilt-plane"
                            style={{
                                '--alin-map-tilt-deg': tiltDeg,
                                '--alin-map-world-rotate-deg': `${cameraRotateDeg}deg`,
                                '--alin-map-camera-rotate-y-deg': `${cameraRotateYDeg}deg`,
                                '--alin-map-camera-rotate-x-deg': '0deg',
                                '--alin-map-billboard-pitch-deg': billboardPitchDeg,
                                '--alin-map-billboard-yaw-deg': `${-cameraRotateYDeg}deg`,
                                '--alin-map-billboard-lift-px': '30px',
                                '--alin-map-plane-scale': MAP_PLANE_SCALE,
                                '--alin-map-node-counter-scale': nodeCounterScaleCss,
                            } as React.CSSProperties}
                        >
                            <MapTiles
                                panX={panX}
                                panY={panY}
                                scale={scale}
                                planeYScale={planeYScale}
                                myObfPos={myObfPos}
                                mode={mapMode}
                            />
                            {isLooterGameMode && mapMode === 'roadmap' && (
                                <LooterMapPlaneLayer
                                    myObfPos={myObfPos}
                                    panX={panX}
                                    panY={panY}
                                    scale={scale}
                                    planeYScale={planeYScale}
                                    boatTargetPin={looterBoat.boatTargetPin}
                                    boatOffsetX={looterBoat.boatOffsetX}
                                    boatOffsetY={looterBoat.boatOffsetY}
                                    onRequestMove={looterBoat.executeMoveToExact}
                                    onStopBoat={looterBoat.stopBoat}
                                    onSetArrivalAction={looterBoat.setOnArrivalAction}
                                />
                            )}
                            <MapReferenceGridOverlay
                                scale={scale}
                                mapMode={mapMode}
                                enabled={showReferenceGrid}
                                is3DPlane={true}
                            />
                        </motion.div>
                    </div>

                    <MapReferenceGridOverlay
                        scale={scale}
                        mapMode={mapMode}
                        enabled={showReferenceGrid}
                        is3DPlane={false}
                    />

                    {!isLooterGameMode && mapMode === 'roadmap' && myObfPos && (
                        <RoadmapAvatarLayer
                            nearbyUsers={nearbyUsers}
                            myUserId={myUserId}
                            user={user}
                            myDisplayName={myDisplayName}
                            myAvatarUrl={myAvatarUrl}
                            myStatus={myStatus}
                            galleryActive={galleryActive}
                            galleryTitle={galleryTitle}
                            galleryImages={galleryImages}
                            myObfPos={myObfPos}
                            searchTag={searchTag}
                            filterDistance={filterDistance}
                            filterAgeMin={filterAgeMin}
                            filterAgeMax={filterAgeMax}
                            scale={scale}
                            panX={panX}
                            panY={panY}
                            planeYScale={planeYScale}
                            mapMode={mapMode}
                            onSelectUser={setSelectedUser}
                            onSelectSelf={() => {
                                setSelectedUser(null);
                                setActiveTab('posts');
                                setMainTab?.('profile');
                                setIsSheetExpanded(true);
                            }}
                        />
                    )}

                    <AlinMapThreeScene
                        position={position}
                        nearbyUsers={nearbyUsers}
                        myUserId={myUserId}
                        user={user}
                        myDisplayName={myDisplayName}
                        myAvatarUrl={myAvatarUrl}
                        myStatus={myStatus}
                        isVisibleOnMap={isVisibleOnMap}
                        isSocketConnecting={isSocketConnecting}
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
                        useDomLooterLayer={isLooterGameMode && mapMode === 'roadmap'}
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
                        cameraFov={cameraFov}
                        performance={performance}
                    />

                    {/* Global Synchronizing Spinner */}
                    {!myObfPos && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <AlinMapLoadingIcon className="h-10 w-10 animate-spin text-white/35 drop-shadow-[0_0_14px_rgba(255,255,255,0.12)]" />
                        </div>
                    )}
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
                </>
            )}

            {isLooterGameMode && isBackpackLoading && (
                <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-[2px] pointer-events-none">
                    <AlinMapLoadingIcon className="h-10 w-10 animate-spin text-white/35 drop-shadow-[0_0_14px_rgba(255,255,255,0.12)]" />
                </div>
            )}

            {isSocketConnecting && (
                <div className="absolute inset-0 z-[210] flex items-center justify-center pointer-events-none">
                    <AlinMapLoadingIcon className="h-8 w-8 animate-spin text-white/30 drop-shadow-[0_0_14px_rgba(255,255,255,0.12)]" />
                </div>
            )}

            {showRoadmapDiagnostics && position && mapMode === 'roadmap' && (
                <div className="absolute left-3 bottom-[112px] z-[230] pointer-events-none rounded-2xl border border-cyan-400/20 bg-slate-950/80 px-3 py-2 text-[11px] text-cyan-100 shadow-[0_10px_28px_rgba(2,8,23,0.35)] backdrop-blur-md">
                    <div className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300/90">
                        Roadmap diag
                    </div>
                    <div className="mt-1 space-y-0.5 font-mono leading-tight">
                        <div>Z {debugCameraZ}</div>
                        <div>Scale {Math.round(debugScale * 100)}%</div>
                        <div>World {sceneWorldScale.toFixed(2)}</div>
                        <div>Tilt {Math.round(tiltAngle.get())}deg</div>
                        <div>FOV {cameraFov}°</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(MapCanvas);
