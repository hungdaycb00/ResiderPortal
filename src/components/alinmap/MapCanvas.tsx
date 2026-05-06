import React, { useEffect } from 'react';
import { Eye, UserRound } from 'lucide-react';
import { motion, MotionValue, useMotionTemplate, useMotionValueEvent, useTransform } from 'framer-motion';
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
    cameraHeightPct: number;
    cameraRotateDeg: number;
    cameraRotateXDeg: number;
    cameraRotateYDeg: number;
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
    isLooterGameMode?: boolean;
    isLooterLoading?: boolean;
    setMainTab?: (tab: string) => void;
    showNotification?: (msg: string, type: 'success' | 'error' | 'info') => void;
    setBoatCenterHandler?: (fn: (() => void) | null) => void;
    setIsTierSelectorOpen?: (v: boolean) => void;
    setCameraZ: (z: number) => void;
    setCameraHeightPct: (v: number) => void;
    setCameraRotateDeg: (v: number) => void;
    setCameraRotateXDeg: (v: number) => void;
    setCameraRotateYDeg: (v: number) => void;
}

const MapCanvas: React.FC<MapCanvasProps> = (props) => {
    const {
        position, isConsentOpen, myObfPos, nearbyUsers, myUserId, user, myDisplayName, myStatus,
        isVisibleOnMap, isConnecting, isDesktop, currentProvince, galleryActive, galleryTitle, galleryImages,
        searchTag, filterDistance, filterAgeMin, filterAgeMax, searchMarkerPos,
        scale, cameraZ, tiltAngle, planeYScale, perspectivePx, cameraHeightPct, cameraRotateDeg, cameraRotateXDeg, cameraRotateYDeg, panX, panY, selfDragX, selfDragY, ws,
        requestLocation, setSelectedUser, setActiveTab, setIsSheetExpanded, setMyObfPos, addLog, handleWheel,
        mapMode, setContextMenu, isLooterLoading, setMainTab, showNotification,
        setBoatCenterHandler, setIsTierSelectorOpen
    } = props;

    const looterState = useLooterState();
    const looterActions = useLooterActions();
    const { isLooterGameMode, state: looterStateObj, isChallengeActive } = looterState;
    const isMapInteractionLocked = !!(
        looterState.showMinigame ||
        looterState.encounter ||
        looterState.showCurseModal ||
        looterState.combatResult
    );
    
    const looterBoat = useLooterBoat({
        isLooterGameMode: !!isLooterGameMode,
        myObfPos, scale, planeYScale, panX, panY,
        setMainTab, setIsSheetExpanded, showNotification,
        setIsTierSelectorOpen
    });

    const [isCursesExpanded, setIsCursesExpanded] = React.useState(false);
    const tiltDeg = useMotionTemplate`${tiltAngle}deg`;
    const counterTiltDeg = useTransform(tiltAngle, (v) => `${-v}deg`);
    const nodeCounterScale = useTransform(scale, (v) => 1 / Math.max(0.2, v || 1));

    // Sync Boat Center Handler to Context
    useEffect(() => {
        const boatHandler = (yOffset?: number) => {
            looterBoat.centerOnBoat(yOffset);
        };
        const combatHandler = (yOffset?: number) => {
            looterBoat.centerOnCombat(yOffset);
        };
        
        looterActions.setCenterBoatHandler(boatHandler);
        looterActions.setCenterCombatHandler(combatHandler);
        
        return () => {
            looterActions.setCenterBoatHandler(null);
            looterActions.setCenterCombatHandler(null);
        };
    }, [looterBoat.centerOnBoat, looterBoat.centerOnCombat, looterActions.setCenterBoatHandler, looterActions.setCenterCombatHandler]);

    // Pointer Interactions Hook
    const {
        handleMapPointerDown, handleMapPointerMove, handleMapPointerUp,
        handleMapPointerCancel, handleMapClickCapture
    } = useMapInteractions({
        panX, panY, scale, isLooterGameMode: !!isLooterGameMode,
        looterStateObj, isChallengeActive: !!isChallengeActive,
        myObfPos, looterBoat, encounter: looterState.encounter,
        isInteractionLocked: isMapInteractionLocked,
        setIsTierSelectorOpen,
        planeYScale
    });
    
    // Auto-focus camera on combat center
    useCombatCamera(
        looterState.encounter, 
        looterBoat.centerOnCombat, 
        looterBoat.centerOnBoat,
        props.setCameraZ,
        setMainTab,
        setIsSheetExpanded
    );

    return (
        <div className="absolute inset-0 overflow-hidden bg-[#001424]" onWheel={handleWheel} onContextMenu={(e) => e.preventDefault()}>
            <LooterBackground />

            {/* Location Consent Overlay */}
            {!position && isConsentOpen && (
                <LocationConsentOverlay requestLocation={requestLocation} />
            )}

            {/* Map Canvas Layer */}
            {position && (
                <div
                    className="absolute inset-0 overflow-hidden pointer-events-none alin-map-scene"
                    style={{
                        '--alin-map-perspective-px': `${perspectivePx}px`,
                        '--alin-map-perspective-origin-y': `${cameraHeightPct}%`,
                    } as React.CSSProperties}
                >
                    <motion.div
                        style={{
                            z: cameraZ,
                            '--alin-map-tilt-deg': tiltDeg,
                            '--alin-map-counter-tilt-deg': counterTiltDeg,
                            '--alin-map-world-rotate-deg': `${cameraRotateDeg}deg`,
                            '--alin-map-camera-rotate-x-deg': `${cameraRotateXDeg}deg`,
                            '--alin-map-camera-rotate-y-deg': `${cameraRotateYDeg}deg`,
                            '--alin-map-billboard-stand-deg': '90deg',
                            '--alin-map-billboard-yaw-deg': '0deg',
                            '--alin-map-node-counter-scale': nodeCounterScale,
                        } as any}
                        className="w-full h-full flex items-center justify-center alin-map-camera-layer"
                    >
                        <motion.div
                            style={{ touchAction: 'none' }}
                            className="absolute w-[10000px] h-[10000px] cursor-grab active:cursor-grabbing pointer-events-auto flex items-center justify-center border border-blue-500/10 bg-black/0 alin-map-pan-layer"
                            onPointerDown={handleMapPointerDown}
                            onPointerMove={handleMapPointerMove}
                            onPointerUp={handleMapPointerUp}
                            onPointerCancel={handleMapPointerCancel}
                            onClickCapture={handleMapClickCapture}
                        >
                            <div className="absolute inset-0 flex items-center justify-center alin-map-tilt-plane">
                                <motion.div style={{ x: panX, y: panY }} className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <MapTiles panX={panX} panY={panY} scale={scale} planeYScale={planeYScale} myObfPos={myObfPos} mode={mapMode} />
                                    <MapGrid mapMode={mapMode} />

                                    {myObfPos && (
                                        <>
                                            {currentProvince && <MapBoundary currentProvince={currentProvince} />}
                                            
                                            {(user || isLooterGameMode) ? (
                                                <SelfNode
                                                    isLooterGameMode={!!isLooterGameMode} myObfPos={myObfPos} myDisplayName={myDisplayName}
                                                    myStatus={myStatus} isVisibleOnMap={isVisibleOnMap} isDesktop={isDesktop}
                                                    user={user} myUserId={myUserId} galleryActive={galleryActive}
                                                    galleryTitle={galleryTitle} galleryImages={galleryImages}
                                                    scale={scale} planeYScale={planeYScale} selfDragX={selfDragX} selfDragY={selfDragY}
                                                    panX={panX} panY={panY}
                                                    boatOffsetX={looterBoat.boatOffsetX} boatOffsetY={looterBoat.boatOffsetY}
                                                    ws={ws} setSelectedUser={setSelectedUser} setActiveTab={setActiveTab}
                                                    setIsSheetExpanded={setIsSheetExpanded} setMyObfPos={setMyObfPos}
                                                    setMainTab={setMainTab} addLog={addLog} looterState={looterStateObj}
                                                />
                                            ) : (
                                                <GuestNode />
                                            )}
                                            <BillboardTransformProbes
                                                tiltAngle={tiltAngle}
                                                cameraRotateXDeg={cameraRotateXDeg}
                                                cameraRotateYDeg={cameraRotateYDeg}
                                            />

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
                            </div>
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
                        planeYScale={planeYScale}
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
    <div className="absolute z-[100] -ml-6 -mt-12 pointer-events-auto select-none alin-map-billboard" style={{ top: '50%', left: '50%' }}>
        <div className="relative w-12 h-12 alin-map-upright-sprite">
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
    </div>
);

const BillboardTransformProbes = ({
    tiltAngle,
    cameraRotateXDeg,
    cameraRotateYDeg,
}: {
    tiltAngle: MotionValue<number>;
    cameraRotateXDeg: number;
    cameraRotateYDeg: number;
}) => {
    type ProbeId = 'A' | 'D';
    type ProbeState = { x: number; y: number; yaw: number; pitch: number; z: number };

    const [selectedProbe, setSelectedProbe] = React.useState<ProbeId>('A');
    const [tiltValue, setTiltValue] = React.useState(() => tiltAngle.get());
    const [probeState, setProbeState] = React.useState<Record<ProbeId, ProbeState>>({
        A: { x: -120, y: -110, yaw: 45, pitch: 90, z: 40 },
        D: { x: 24, y: -110, yaw: 0, pitch: 0, z: 40 },
    });

    useMotionValueEvent(tiltAngle, 'change', setTiltValue);

    React.useEffect(() => {
        const root = document.documentElement;
        console.table({
            mapTilt: getComputedStyle(root).getPropertyValue('--alin-map-tilt-deg'),
            counterTilt: getComputedStyle(root).getPropertyValue('--alin-map-counter-tilt-deg'),
            standDeg: getComputedStyle(root).getPropertyValue('--alin-map-billboard-stand-deg'),
            yawDeg: getComputedStyle(root).getPropertyValue('--alin-map-billboard-yaw-deg'),
        });
    }, []);

    const nudge = (patch: Partial<ProbeState>) => {
        setProbeState((prev) => ({
            ...prev,
            [selectedProbe]: {
                ...prev[selectedProbe],
                ...patch,
            },
        }));
    };

    const selectedState = probeState[selectedProbe];

    const staticRefs = [
        { id: 'B', label: 'flat ref', x: -72, y: -110, transform: 'translateZ(0px) rotateX(0deg) rotateY(0deg)' },
        { id: 'C', label: 'x90 ref', x: -24, y: -110, transform: 'translateZ(40px) rotateX(90deg) rotateY(0deg)' },
        { id: 'E', label: 'y90 ref', x: 72, y: -110, transform: 'translateZ(40px) rotateY(90deg)' },
        { id: 'F', label: 'x90 y-90', x: 120, y: -110, transform: 'translateZ(40px) rotateX(90deg) rotateY(-90deg)' },
    ];

    const renderProbe = (probe: { id: string; label: string; x: number; y: number; transform: string }) => (
        <div
            key={probe.id}
            className="absolute z-[999] pointer-events-auto select-none"
            style={{
                left: `calc(50% + ${probe.x}px)`,
                top: `calc(50% + ${probe.y}px)`,
                width: 78,
                height: 108,
                marginLeft: -39,
                marginTop: -108,
                transformStyle: 'preserve-3d',
            }}
            onClick={(e) => {
                e.stopPropagation();
                if (probe.id === 'A' || probe.id === 'D') {
                    setSelectedProbe(probe.id);
                }
                console.info(`[AlinMap probe] ${probe.id}: ${probe.label}`, probe.transform);
            }}
        >
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    transform: probe.transform,
                    transformOrigin: 'center bottom',
                    transformStyle: 'preserve-3d',
                    backfaceVisibility: 'visible',
                }}
            >
                <div className={`flex h-full w-full flex-col overflow-hidden rounded-xl border-2 text-center shadow-[0_0_24px_rgba(251,191,36,0.55)] ${selectedProbe === probe.id ? 'border-cyan-300 bg-slate-950/98' : 'border-amber-300 bg-slate-950/95'}`}>
                    <div className="bg-amber-300 px-1 py-1 text-[10px] font-black text-slate-950">{probe.id}</div>
                    <div className="flex flex-1 items-center justify-center bg-cyan-500/20 text-3xl font-black text-white">
                        {probe.id}
                    </div>
                    <div className="bg-slate-900 px-1 py-1 text-[8px] font-bold uppercase tracking-wide text-cyan-100">{probe.label}</div>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <div
                className="absolute z-[1000] pointer-events-auto select-none rounded-xl border border-white/15 bg-slate-950/85 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md"
                style={{
                    left: 'calc(50% - 180px)',
                    top: 'calc(50% + 56px)',
                    minWidth: 360,
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200">Billboard Lab</div>
                        <div className="text-[9px] text-slate-300">Chọn A hoặc D, rồi nắn góc/điểm neo ngay tại map.</div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black text-amber-200">
                        Selected {selectedProbe}
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                    {([
                        { label: 'X-', onClick: () => nudge({ x: selectedState.x - 8 }) },
                        { label: 'X+', onClick: () => nudge({ x: selectedState.x + 8 }) },
                        { label: 'Y-', onClick: () => nudge({ y: selectedState.y - 8 }) },
                        { label: 'Y+', onClick: () => nudge({ y: selectedState.y + 8 }) },
                        { label: 'Yaw-', onClick: () => nudge({ yaw: selectedState.yaw - 5 }) },
                        { label: 'Yaw+', onClick: () => nudge({ yaw: selectedState.yaw + 5 }) },
                        { label: 'Pitch-', onClick: () => nudge({ pitch: selectedState.pitch - 5 }) },
                        { label: 'Pitch+', onClick: () => nudge({ pitch: selectedState.pitch + 5 }) },
                    ]).map((btn) => (
                        <button
                            key={btn.label}
                            type="button"
                            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white/90 hover:bg-white/10"
                            onClick={(e) => {
                                e.stopPropagation();
                                btn.onClick();
                            }}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                <div className="mt-2 flex items-center gap-1.5">
                    {(['A', 'D'] as ProbeId[]).map((probeId) => (
                        <button
                            key={probeId}
                            type="button"
                            className={`rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${selectedProbe === probeId ? 'border-cyan-300 bg-cyan-400/20 text-cyan-100' : 'border-white/10 bg-white/5 text-white/80'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProbe(probeId);
                            }}
                        >
                            Probe {probeId}
                        </button>
                    ))}
                    <button
                        type="button"
                        className="rounded-md border border-amber-300/30 bg-amber-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-100"
                        onClick={(e) => {
                            e.stopPropagation();
                            setProbeState((prev) => ({
                                A: { x: -120, y: -110, yaw: 45, pitch: 90, z: 40 },
                                D: { x: 24, y: -110, yaw: -45, pitch: 75, z: 40 },
                            }));
                        }}
                    >
                        Reset
                    </button>
                </div>

                <div className="mt-2 rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-slate-300">
                    A: x={probeState.A.x}, y={probeState.A.y}, yaw={probeState.A.yaw}, pitch={probeState.A.pitch}, z={probeState.A.z}
                    <br />
                    D: x={probeState.D.x}, y={probeState.D.y}, yaw={probeState.D.yaw}, pitch={probeState.D.pitch}, z={probeState.D.z}
                </div>
            </div>

            {renderProbe({
                id: 'A',
                label: 'upright y45',
                x: probeState.A.x,
                y: probeState.A.y,
                transform: `translateZ(${probeState.A.z}px) rotateX(${probeState.A.pitch}deg) rotateY(${probeState.A.yaw}deg)`,
            })}
            {renderProbe({
                id: 'D',
                label: 'billboard upright',
                x: probeState.D.x,
                y: probeState.D.y,
                transform: `translateZ(${probeState.D.z}px) rotateX(${-(tiltValue + cameraRotateXDeg) + probeState.D.pitch}deg) rotateY(${-cameraRotateYDeg + probeState.D.yaw}deg)`,
            })}

            {staticRefs.map(renderProbe)}
        </>
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

