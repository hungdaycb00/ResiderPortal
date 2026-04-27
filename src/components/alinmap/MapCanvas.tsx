import React, { useCallback, useEffect, useRef } from 'react';
import { Eye, MapPin, RefreshCw, UserRound } from 'lucide-react';
import { motion, MotionValue, useMotionTemplate, useTransform } from 'framer-motion';
import SpatialNode from './SpatialNode';
import MapTiles from './MapTiles';
import SelfNode from './SelfNode';
import SeaEntities from './SeaEntities';
import { DEGREES_TO_PX } from './constants';
import { useSeaBoat } from './hooks/useSeaBoat';

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
    isSeaGameMode?: boolean;
    seaState?: any;
    seaGameCtx?: any;
    isSeaLoading?: boolean;
    setMainTab?: (tab: string) => void;
    showNotification?: (msg: string, type: 'success' | 'error' | 'info') => void;
    setBoatCenterHandler?: (fn: (() => void) | null) => void;
}

const MapCanvas: React.FC<MapCanvasProps> = ({
    position, isConsentOpen, myObfPos, nearbyUsers, myUserId, user, myDisplayName, myStatus,
    isVisibleOnMap, isConnecting, isDesktop, currentProvince, galleryActive, galleryTitle, galleryImages,
    searchTag, filterDistance, filterAgeMin, filterAgeMax, searchMarkerPos,
    scale, panX, panY, selfDragX, selfDragY, ws,
    requestLocation, setSelectedUser, setActiveTab, setIsSheetExpanded, setMyObfPos, addLog, handleWheel,
    mapMode, setContextMenu, isSeaGameMode, seaState, seaGameCtx, isSeaLoading, setMainTab, showNotification,
    setBoatCenterHandler
}) => {
    const seaBoat = useSeaBoat({
        isSeaGameMode: !!isSeaGameMode,
        seaGameCtx,
        myObfPos,
        scale, panX, panY,
        setMainTab, setIsSheetExpanded, showNotification
    });

    useEffect(() => {
        setBoatCenterHandler?.(seaBoat.centerOnBoat);
        return () => {
            setBoatCenterHandler?.(null);
        };
    }, [seaBoat.centerOnBoat, setBoatCenterHandler]);

    const mapDragRef = useRef<{
        active: boolean;
        pointerId: number | null;
        startX: number;
        startY: number;
        startPanX: number;
        startPanY: number;
        moved: boolean;
        suppressClick: boolean;
    }>({
        active: false,
        pointerId: null,
        startX: 0,
        startY: 0,
        startPanX: 0,
        startPanY: 0,
        moved: false,
        suppressClick: false,
    });

    const handleMapPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        const interactiveTarget = (e.target as HTMLElement | null)?.closest?.('[data-map-interactive="true"]');
        if (interactiveTarget && !isSeaGameMode) {
            seaBoat.handlePointerDown(e);
            return;
        }
        seaBoat.handlePointerDown(e);
        mapDragRef.current = {
            active: true,
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            startPanX: panX.get(),
            startPanY: panY.get(),
            moved: false,
            suppressClick: false,
        };

        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
        e.preventDefault();
    }, [isSeaGameMode, panX, panY, seaBoat]);

    const handleMapPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const dragState = mapDragRef.current;
        if (!dragState.active || dragState.pointerId !== e.pointerId) return;

        const currentScale = scale?.get?.() ?? 1;
        const deltaX = (e.clientX - dragState.startX) / currentScale;
        const deltaY = (e.clientY - dragState.startY) / currentScale;
        if (Math.abs(deltaX) + Math.abs(deltaY) > 4) {
            dragState.moved = true;
        }

        panX.set(dragState.startPanX + deltaX);
        panY.set(dragState.startPanY + deltaY);
        e.preventDefault();
    }, [panX, panY, scale]);

    const handleMapPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const dragState = mapDragRef.current;
        const interactiveTarget = (e.target as HTMLElement | null)?.closest?.('[data-map-interactive="true"]');

        if (dragState.active && dragState.pointerId === e.pointerId) {
            dragState.active = false;
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {}

            if (dragState.moved) {
                dragState.suppressClick = true;
                seaBoat.handlePointerCancel();
                return;
            }
        }

        if (interactiveTarget) {
            seaBoat.handlePointerCancel();
            return;
        }

        seaBoat.handlePointerUp(e);
    }, [seaBoat]);

    const handleMapPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const dragState = mapDragRef.current;
        if (dragState.active && dragState.pointerId === e.pointerId) {
            dragState.active = false;
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {}
        }
        seaBoat.handlePointerCancel();
    }, [seaBoat]);

    const handleMapClickCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const dragState = mapDragRef.current;
        if (!dragState.suppressClick) return;
        dragState.suppressClick = false;
        e.preventDefault();
        e.stopPropagation();
    }, []);

    return (
        <div className="flex-1 relative overflow-hidden bg-[#001424]" onWheel={handleWheel} onContextMenu={(e) => e.preventDefault()}>
            {/* Sea Glow Background */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-cyan-500/5 blur-[120px] pointer-events-none rounded-full" />
            <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] pointer-events-none rounded-full" />

            {/* Location Consent Overlay */}
            {!position && isConsentOpen && (
                <div className="absolute inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 pointer-events-auto">
                    <div className="bg-[#1a1d24] border border-blue-500/30 p-8 rounded-3xl max-w-sm w-full text-center shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <MapPin className="w-8 h-8 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold mb-2 text-blue-100">Alin 3D Universe</h2>
                        <p className="text-blue-200/50 text-sm mb-8">Deploying your hologram into the social grid. Reveal your relative position to discover other entities.</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => requestLocation(false)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                                Activate Hologram
                            </button>
                            <button onClick={() => requestLocation(true)} className="text-gray-400 hover:text-white text-xs py-2 transition-colors border border-white/10 rounded-xl hover:border-white/30">
                                👁️ Browse Only — View without sharing location
                            </button>
                            <p className="text-[10px] text-gray-500 mt-2">Note: You can change your visibility anytime in settings.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Map Canvas */}
            {position && (
                <motion.div style={{ scale }} className="w-full h-full absolute inset-0 flex items-center justify-center pointer-events-none">
                    <motion.div
                        style={{ x: panX, y: panY, touchAction: 'none' }}
                        className="absolute w-[10000px] h-[10000px] cursor-grab active:cursor-grabbing pointer-events-auto flex items-center justify-center border border-blue-500/10 bg-black/0"
                        onPointerDown={handleMapPointerDown}
                        onPointerMove={handleMapPointerMove}
                        onPointerUp={handleMapPointerUp}
                        onPointerCancel={handleMapPointerCancel}
                        onClickCapture={handleMapClickCapture}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            if (isSeaGameMode || !myObfPos) return;
                            const currentScale = scale?.get?.() || 1;
                            const offsetX = e.clientX - window.innerWidth / 2;
                            const offsetY = e.clientY - window.innerHeight / 2;
                            const mapX = offsetX / currentScale - (panX?.get?.() ?? 0);
                            const mapY = offsetY / currentScale - (panY?.get?.() ?? 0);
                            const lng = myObfPos.lng + mapX / DEGREES_TO_PX;
                            const lat = myObfPos.lat - mapY / DEGREES_TO_PX;
                            setContextMenu({ x: e.clientX, y: e.clientY, target: 'map', data: { lat, lng } });
                        }}
                    >
                        {/* Grid styling */}
                        <div className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${mapMode === 'satellite' ? 'opacity-20' : 'opacity-100'}`} style={{
                            backgroundImage: "linear-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.05) 1px, transparent 1px)",
                            backgroundSize: "100px 100px",
                            backgroundPosition: "center center",
                        }} />

                        {/* Real Map Tiles */}
                        <MapTiles panX={panX} panY={panY} scale={scale} myObfPos={myObfPos} mode={mapMode} />

                        {/* Loading spinner */}
                        {!myObfPos && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                                    <span className="text-blue-500 font-bold text-xs animate-pulse uppercase tracking-widest">Synchronizing Spatial Data...</span>
                                </div>
                            </div>
                        )}

                        {myObfPos && (
                            <>
                                {/* Province Boundary */}
                                {currentProvince && (
                                    <div className="absolute w-[2000px] h-[2000px] border-[5px] border-gray-500/20 rounded-full flex items-center justify-center pointer-events-none" style={{ left: 'calc(50% - 1000px)', top: 'calc(50% - 1000px)' }}>
                                        <div className="absolute top-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-500/10 border border-gray-500/30 rounded-full text-gray-500 text-xs font-black tracking-widest uppercase backdrop-blur-sm">
                                            {currentProvince} BOUNDARY
                                        </div>
                                    </div>
                                )}

                                {/* Self Node */}
                                {user ? (
                                    <SelfNode
                                        isSeaGameMode={!!isSeaGameMode} myObfPos={myObfPos} myDisplayName={myDisplayName}
                                        myStatus={myStatus} isVisibleOnMap={isVisibleOnMap} isDesktop={isDesktop}
                                        user={user} myUserId={myUserId} galleryActive={galleryActive}
                                        galleryTitle={galleryTitle} galleryImages={galleryImages}
                                        scale={scale} selfDragX={selfDragX} selfDragY={selfDragY}
                                        panX={panX} panY={panY}
                                        boatOffsetX={seaBoat.boatOffsetX} boatOffsetY={seaBoat.boatOffsetY}
                                        ws={ws} setSelectedUser={setSelectedUser} setActiveTab={setActiveTab}
                                        setIsSheetExpanded={setIsSheetExpanded} setMyObfPos={setMyObfPos}
                                        setMainTab={setMainTab} addLog={addLog} seaState={seaState}
                                    />
                                ) : (
                                    <div
                                        className="absolute z-[100] -ml-6 -mt-12 pointer-events-auto select-none"
                                        style={{ top: '50%', left: '50%' }}
                                        title="Guest see-only mode"
                                    >
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
                                )}

                                {/* Search Marker Pin */}
                                {searchMarkerPos && (
                                    <div className="absolute w-10 h-10 -ml-5 -mt-10 flex items-center justify-center pointer-events-none z-[105]" style={{
                                        top: `calc(50% + ${-(searchMarkerPos.lat - myObfPos.lat) * DEGREES_TO_PX}px)`,
                                        left: `calc(50% + ${(searchMarkerPos.lng - myObfPos.lng) * DEGREES_TO_PX}px)`
                                    }}>
                                        <div className="relative flex flex-col items-center">
                                            <div className="absolute -top-6 whitespace-nowrap bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">Target</div>
                                            <MapPin className="w-8 h-8 text-red-500 fill-red-100" />
                                            <div className="w-2 h-1 bg-black/30 rounded-[100%] blur-[1px] -mt-1" />
                                        </div>
                                    </div>
                                )}

                                {/* Sea Game Entities */}
                                {isSeaGameMode && (
                                    <SeaEntities
                                        myObfPos={myObfPos} seaState={seaState} seaGameCtx={seaGameCtx}
                                        boatTargetPin={seaBoat.boatTargetPin}
                                        boatOffsetX={seaBoat.boatOffsetX} boatOffsetY={seaBoat.boatOffsetY}
                                        executeMoveToExact={seaBoat.executeMoveToExact}
                                    />
                                )}

                                {/* Other User Nodes */}
                                {nearbyUsers.filter(u => {
                                    if (u.id === myUserId || u.id === user?.uid) return false;
                                    if (searchTag) {
                                        const term = searchTag.toLowerCase();
                                        const matchesName = (u.displayName || u.username || '').toLowerCase().includes(term);
                                        const tagsStr = (Array.isArray(u.tags) ? u.tags.join(' ') : u.tags || '').toLowerCase();
                                        const matchesTags = tagsStr.includes(term);
                                        const statusStr = (u.status || '').toLowerCase();
                                        const matchesStatus = statusStr.includes(term);
                                        if (!matchesName && !matchesTags && !matchesStatus) return false;
                                    }
                                    if (u.lat == null || u.lng == null || isNaN(u.lat) || isNaN(u.lng)) return false;
                                    const distKm = Math.sqrt(Math.pow(u.lat - myObfPos!.lat, 2) + Math.pow(u.lng - myObfPos!.lng, 2)) * 111;
                                    if (distKm > filterDistance) return false;
                                    const age = u.birthdate ? (new Date().getFullYear() - new Date(u.birthdate).getFullYear()) : 20;
                                    if (age < filterAgeMin || age > filterAgeMax) return false;
                                    return true;
                                }).map(u => (
                                    <div key={u.id} className={`transition-opacity duration-500 ${isSeaGameMode ? 'opacity-30 blur-[1px] pointer-events-none' : 'opacity-100'}`}>
                                        <SpatialNode
                                            user={u} myPos={myObfPos!} mapScale={scale}
                                            onClick={() => !isSeaGameMode && setSelectedUser(u)}
                                            onContextMenu={(e, uData) => {
                                                if (!isSeaGameMode) setContextMenu({ x: e.clientX, y: e.clientY, target: 'user', data: uData });
                                            }}
                                        />
                                    </div>
                                ))}
                            </>
                        )}
                    </motion.div>
                </motion.div>
            )}

            {/* Sea Game Curse Bar */}
            {isSeaGameMode && (
                <div className="absolute top-[12px] left-1/2 -translate-x-1/2 z-[115] w-[90%] max-w-[500px] pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-xl border border-red-500/30 rounded-full p-1.5 flex items-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                        <span className="text-red-400 text-xs font-black uppercase tracking-wider shrink-0">☠️ Curse</span>
                        <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden relative">
                            <motion.div
                                className="h-full rounded-full relative"
                                style={{
                                    background: useMotionTemplate`linear-gradient(90deg, #7f1d1d, #dc2626 ${seaBoat.curseVisual}%, #ef4444)`,
                                    width: useMotionTemplate`${seaBoat.curseVisual}%`,
                                    boxShadow: (seaState?.cursePercent || 0) > 50 ? '0 0 12px rgba(239,68,68,0.6)' : 'none',
                                }}
                            />
                        </div>
                        <motion.span 
                            className={`text-xs font-black tabular-nums min-w-[36px] text-right ${(seaState?.cursePercent || 0) > 70 ? 'text-red-400 animate-pulse' : 'text-red-300/70'}`}
                            initial={false}
                            animate={{ opacity: [0.5, 1] }}
                        >
                            <motion.span>{useTransform(seaBoat.curseVisual, (v) => `${Math.round(v)}%`)}</motion.span>
                        </motion.span>
                    </div>
                </div>
            )}

            {/* Active Curses List - Top Right Corner */}
            {isSeaGameMode && seaState?.activeCurses && Object.values(seaState.activeCurses).some(v => (v as number) > 0) && (
                <div className="absolute top-[60px] right-4 z-[115] flex flex-col items-end gap-2 pointer-events-none">
                    {Object.entries(seaState.activeCurses).filter(([_, v]) => (v as number) > 0).map(([key, value]) => {
                        const CURSE_META: any = {
                            dmg_debuff: { icon: '📉', name: 'DMG', color: 'text-red-400' },
                            hp_debuff: { icon: '💔', name: 'HP', color: 'text-rose-400' },
                            regen_debuff: { icon: '💧', name: 'MANA', color: 'text-blue-400' },
                            boat_scale: { icon: '🚢', name: 'SIZE', color: 'text-amber-400' },
                            curse_gain: { icon: '☠️', name: 'CURSE', color: 'text-purple-400' },
                        };
                        const meta = CURSE_META[key];
                        if (!meta) return null;
                        return (
                            <motion.div
                                key={key}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 shadow-lg"
                            >
                                <span className="text-sm">{meta.icon}</span>
                                <span className={`text-[10px] font-black ${meta.color} uppercase tracking-tighter`}>{meta.name} x{value as number}</span>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Sea Game Loading Overlay */}
            {isSeaGameMode && isSeaLoading && (
                <div className="absolute inset-0 z-[200] bg-[#001424]/95 backdrop-blur-md flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full" />
                            <div className="absolute inset-0 border-4 border-transparent border-t-cyan-400 rounded-full animate-spin" />
                            <div className="absolute inset-2 border-4 border-transparent border-b-amber-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                            <span className="absolute inset-0 flex items-center justify-center text-3xl">⛵</span>
                        </div>
                        <div className="text-center">
                            <p className="text-cyan-300 font-bold text-sm tracking-widest uppercase animate-pulse">Khởi tạo Thế Giới...</p>
                            <p className="text-cyan-500/50 text-[10px] mt-1">Đang sinh vật phẩm và chuẩn bị hành trình</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Connection Status */}
            {isConnecting && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[110] bg-blue-600/80 backdrop-blur-lg border border-white/10 text-white px-4 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                    <RefreshCw className="w-3 h-3 animate-spin" /> SCANNING SECTOR...
                </div>
            )}
        </div>
    );
};

export default MapCanvas;
