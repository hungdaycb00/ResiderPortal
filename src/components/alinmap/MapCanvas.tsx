import React, { useState, useCallback } from 'react';
import { normalizeImageUrl } from '../../services/externalApi';
import { MapPin, RefreshCw, Diamond } from 'lucide-react';
import { motion, MotionValue, useMotionValue, animate, useAnimationFrame } from 'framer-motion';
import SpatialNode from './SpatialNode';
import MapTiles from './MapTiles';
import { DEGREES_TO_PX } from './constants';

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
}

const MapCanvas: React.FC<MapCanvasProps> = ({
    position, isConsentOpen, myObfPos, nearbyUsers, myUserId, user, myDisplayName, myStatus,
    isVisibleOnMap, isConnecting, isDesktop, currentProvince, galleryActive, galleryTitle, galleryImages,
    searchTag, filterDistance, filterAgeMin, filterAgeMax, searchMarkerPos,
    scale, panX, panY, selfDragX, selfDragY, ws,
    requestLocation, setSelectedUser, setActiveTab, setIsSheetExpanded, setMyObfPos, addLog, handleWheel,
    mapMode, setContextMenu, isSeaGameMode, seaState, seaGameCtx, isSeaLoading, setMainTab
}) => {
    const lastTapRef = React.useRef<number>(0);

    const [boatTargetPin, setBoatTargetPin] = useState<{lat: number, lng: number} | null>(null);
    const pickingItemsRef = React.useRef(new Set<string>());
    const boatOffsetX = useMotionValue(0);
    const boatOffsetY = useMotionValue(0);
    const PICKUP_RADIUS_DEG = 0.0004; // ~45m pickup radius

    useAnimationFrame(() => {
        if (!isSeaGameMode || !seaGameCtx || !myObfPos || !seaGameCtx.worldItems?.length) return;
        
        // Vị trí thuyền = myObfPos + boatOffset (thuyền di chuyển bằng boatOffset)
        const currentLng = myObfPos.lng + boatOffsetX.get() / DEGREES_TO_PX;
        const currentLat = myObfPos.lat - boatOffsetY.get() / DEGREES_TO_PX;

        seaGameCtx.worldItems.forEach((item: any) => {
            if (pickingItemsRef.current.has(item.spawnId)) return;
            const dLat = item.lat - currentLat;
            const dLng = item.lng - currentLng;
            const dist = Math.sqrt(dLat * dLat + dLng * dLng);
            if (dist < PICKUP_RADIUS_DEG) {
                if (item.rarity >= 2) { // Rare items need minigame
                    seaGameCtx.setShowMinigame(item);
                    pickingItemsRef.current.add(item.spawnId);
                    return;
                }
                
                pickingItemsRef.current.add(item.spawnId);
                seaGameCtx.pickupItem(item.spawnId).then((success: boolean) => {
                    if (success) {
                        setMainTab?.('backpack');
                        setIsSheetExpanded(true);
                    } else {
                        setTimeout(() => pickingItemsRef.current.delete(item.spawnId), 5000);
                    }
                });
            }
        });
    });
 
    const handleMapDoubleClick = useCallback((clientX: number, clientY: number) => {
        if (!isSeaGameMode || !seaGameCtx || !myObfPos) {
            console.log('[MapMove] Pre-conditions failed:', { isSeaGameMode, hasCtx: !!seaGameCtx, hasPos: !!myObfPos });
            return;
        }

        const currentScale = scale.get() || 1;
        const offsetX = clientX - window.innerWidth / 2;
        const offsetY = clientY - window.innerHeight / 2;
        const mapX = (offsetX - panX.get()) / currentScale;
        const mapY = (offsetY - panY.get()) / currentScale;
        const lng = myObfPos.lng + mapX / DEGREES_TO_PX;
        const lat = myObfPos.lat - mapY / DEGREES_TO_PX;

        console.log('[MapMove] Target Coordinates:', { lat, lng });

        // Tính khoảng cách từ vị trí hiện tại của thuyền (có tính offset)
        const boatLng = myObfPos.lng + boatOffsetX.get() / DEGREES_TO_PX;
        const boatLat = myObfPos.lat - boatOffsetY.get() / DEGREES_TO_PX;
        const distLng = lng - boatLng;
        const distLat = lat - boatLat;
        const distDeg = Math.sqrt(distLng * distLng + distLat * distLat);

        const multiplier = seaGameCtx?.globalSettings?.speedMultiplier || 1.0;
        const baseDuration = Math.min(Math.max(distDeg * 2000, 1), 8);
        const duration = baseDuration / multiplier;

        const hasFloatingItems = (seaGameCtx.state.inventory.some(i => i.gridX < 0) || !!seaGameCtx.stagingItem);

        if (hasFloatingItems) {
            console.log('[MapMove] Blocked by floating items');
            seaGameCtx.setShowDiscardModal(true);
            return;
        }

        console.log('[MapMove] Executing move...', { duration });
        setBoatTargetPin({ lat, lng });
        seaGameCtx.moveBoat(lat, lng);

        // Tính pixel offset MỚI cho thuyền (từ myObfPos gốc)
        const newBoatPxX = (lng - myObfPos.lng) * DEGREES_TO_PX;
        const newBoatPxY = -(lat - myObfPos.lat) * DEGREES_TO_PX;

        // Di chuyển thuyền đến vị trí mới
        animate(boatOffsetX, newBoatPxX, { duration, ease: "easeInOut" });
        animate(boatOffsetY, newBoatPxY, { duration, ease: "easeInOut" });

        // Camera đuổi theo thuyền
        const newPanX = -newBoatPxX;
        const newPanY = -newBoatPxY;
        animate(panX, newPanX, { duration, ease: "easeInOut" });
        animate(panY, newPanY, { duration, ease: "easeInOut", onComplete: () => setBoatTargetPin(null) });
    }, [isSeaGameMode, seaGameCtx, myObfPos, scale, panX, panY, boatOffsetX, boatOffsetY, DEGREES_TO_PX]);

    return (
        <div
            className="flex-1 relative overflow-hidden bg-[#001424]"
            onWheel={handleWheel}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Sea Glow Background Elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-cyan-500/5 blur-[120px] pointer-events-none rounded-full" />
            <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] pointer-events-none rounded-full" />

            {!position && isConsentOpen && (
                <div className="absolute inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 pointer-events-auto">
                    <div className="bg-[#1a1d24] border border-blue-500/30 p-8 rounded-3xl max-w-sm w-full text-center shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <MapPin className="w-8 h-8 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold mb-2 text-blue-100">Alin 3D Universe</h2>
                        <p className="text-blue-200/50 text-sm mb-8">Deploying your hologram into the social grid. Reveal your relative position to discover other entities.</p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => requestLocation(false)}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                            >
                                Activate Hologram
                            </button>
                            <button
                                onClick={() => requestLocation(true)}
                                className="text-gray-400 hover:text-white text-xs py-2 transition-colors border border-white/10 rounded-xl hover:border-white/30"
                            >
                                👁️ Browse Only — View without sharing location
                            </button>
                            <p className="text-[10px] text-gray-500 mt-2">Note: You can change your visibility anytime in settings.</p>
                        </div>
                    </div>
                </div>
            )}

            {position && (
                <motion.div
                    style={{ scale }}
                    className="w-full h-full absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                    <motion.div
                        drag
                        style={{ x: panX, y: panY }}
                        dragConstraints={{ left: -10000, right: 10000, top: -10000, bottom: 10000 }}
                        dragElastic={0.1}
                        className="absolute w-[10000px] h-[10000px] cursor-grab active:cursor-grabbing pointer-events-auto flex items-center justify-center border border-blue-500/10 bg-black/0"
                        onPointerUp={(e) => {
                            if (!isSeaGameMode || !seaGameCtx || !myObfPos) return;
                            const now = Date.now();
                            // Custom double click/tap detection
                            if (now - lastTapRef.current < 300) {
                                console.log('[MapClick] Double Click/Tap detected');
                                handleMapDoubleClick(e.clientX, e.clientY);
                            } else {
                                console.log('[MapClick] Single Click/Tap at', now);
                            }
                            lastTapRef.current = now;
                        }}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            if (isSeaGameMode) return;
                            if (!myObfPos) return;
                            console.log('[MapClick] Right Click for Context Menu');
                            const currentScale = scale.get() || 1;
                            const offsetX = e.clientX - window.innerWidth / 2;
                            const offsetY = e.clientY - window.innerHeight / 2;
                            const mapX = (offsetX - panX.get()) / currentScale;
                            const mapY = (offsetY - panY.get()) / currentScale;
                            const lng = myObfPos.lng + mapX / DEGREES_TO_PX;
                            const lat = myObfPos.lat - mapY / DEGREES_TO_PX;
                            
                            setContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                target: 'map',
                                data: { lat, lng }
                            });
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
                                    <div
                                        className="absolute w-[2000px] h-[2000px] border-[5px] border-gray-500/20 rounded-full flex items-center justify-center pointer-events-none"
                                        style={{ left: 'calc(50% - 1000px)', top: 'calc(50% - 1000px)' }}
                                    >
                                        <div className="absolute top-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-500/10 border border-gray-500/30 rounded-full text-gray-500 text-xs font-black tracking-widest uppercase backdrop-blur-sm">
                                            {currentProvince} BOUNDARY
                                        </div>
                                    </div>
                                )}

                                {/* Self Node - Sea Game: outer div for position, inner for bobbing */}
                                {isSeaGameMode ? (
                                    <motion.div
                                        className="absolute w-16 h-16 -ml-8 -mt-8 pointer-events-auto z-[100] select-none cursor-default"
                                        style={{ top: '50%', left: '50%', x: boatOffsetX, y: boatOffsetY }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMainTab?.('backpack');
                                            setIsSheetExpanded(true);
                                        }}
                                        onDoubleClick={(e) => e.stopPropagation()}
                                        onPointerDown={(e) => e.stopPropagation()}
                                    >
                                        <motion.div
                                            className="w-full h-full"
                                            animate={{ y: [-2, 2, -2], rotateZ: [-2, 2, -2] }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                        >
                                            <div className="w-full h-full flex items-center justify-center">
                                                <span className="text-4xl drop-shadow-lg">⛵</span>
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                ) : (
                                <motion.div
                                    drag
                                    dragMomentum={false}
                                    dragConstraints={{ left: -3000, right: 3000, top: -3000, bottom: 3000 }}
                                    dragElastic={0}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onDoubleClick={(e) => e.stopPropagation()}
                                    onDragEnd={(e, info) => {
                                        if (ws.current && ws.current.readyState === WebSocket.OPEN && myObfPos) {
                                            const currentScale = scale.get() || 1;
                                            const deltaLng = (info.offset.x / currentScale) / DEGREES_TO_PX;
                                            const deltaLat = (-info.offset.y / currentScale) / DEGREES_TO_PX;
                                            const newLat = myObfPos.lat + deltaLat;
                                            const newLng = myObfPos.lng + deltaLng;
                                            ws.current.send(JSON.stringify({
                                                type: 'MAP_MOVE',
                                                payload: { lat: newLat, lng: newLng, zoom: 13 }
                                            }));
                                            setMyObfPos({ lat: newLat, lng: newLng });
                                            panX.set(panX.get() + info.offset.x / currentScale);
                                            panY.set(panY.get() + info.offset.y / currentScale);
                                            selfDragX.set(0);
                                            selfDragY.set(0);
                                            addLog(`🚀 Moved to: ${newLat.toFixed(4)}, ${newLng.toFixed(4)}`);
                                        }
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isSeaGameMode) {
                                            setMainTab?.('backpack');
                                            setIsSheetExpanded(true);
                                            return;
                                        }
                                        setSelectedUser({
                                            id: user?.uid || myUserId || 'self',
                                            username: myDisplayName,
                                            lat: myObfPos?.lat,
                                            lng: myObfPos?.lng,
                                            isSelf: true,
                                            tags: myStatus.split(' ').filter(w => w.startsWith('#')).map(w => {
                                                return w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9#]/g, '');
                                            })
                                        });
                                    }}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                    className={`absolute group pointer-events-auto z-[100] select-none w-12 h-12 cursor-grab active:cursor-grabbing ${isSeaGameMode ? '-ml-6 -mt-6' : '-ml-6 -mt-12'}`}
                                    style={{ top: '50%', left: '50%', x: selfDragX, y: selfDragY }}
                                    animate={isSeaGameMode ? { y: [0, -4, 0], rotate: [0, 2, -2, 0] } : { y: [0, -6, 0] }}
                                    transition={{ duration: isSeaGameMode ? 6 : 4, repeat: Infinity, ease: "easeInOut" }}
                                    onPointerEnter={() => {
                                        const s = scale.get();
                                        document.documentElement.style.setProperty('--self-hover-scale', String(isDesktop ? Math.max(1.1, 1.2 / s) : 1.1));
                                    }}
                                    whileHover={{ scale: 'var(--self-hover-scale, 1.1)' as any }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                        <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping shadow-[0_0_20px_rgba(34,211,238,0.4)]" />
                                        
                                            <div className={`w-full h-full rounded-full border-[2.5px] overflow-hidden bg-[#1a1d24] relative z-10 transition-all shadow-[0_0_25px_rgba(34,211,238,0.6)] ${isVisibleOnMap ? 'border-cyan-400' : 'border-emerald-500 opacity-60'}`}>
                                                <img
                                                    src={normalizeImageUrl(user?.photoURL) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || myDisplayName)}&background=1a1d24&color=3b82f6&size=150&bold=true`}
                                                    className="w-full h-full object-cover pointer-events-none"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || myDisplayName)}&background=1a1d24&color=3b82f6&size=150&bold=true`; }}
                                                />
                                                {!isVisibleOnMap && (
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                        <div className="w-5 h-5 border-2 border-emerald-400/40 border-dashed rounded-full animate-spin-slow" />
                                                    </div>
                                                )}
                                            </div>


                                        {/* Billboard for SELF NODE */}
                                        {galleryActive && !isSeaGameMode && (
                                        <div
                                            onClick={(e) => { e.stopPropagation(); setSelectedUser({ ...myObfPos, isSelf: true, username: myDisplayName }); setActiveTab('posts'); setIsSheetExpanded(true); }}
                                            className="absolute -top-24 left-1/2 -translate-x-1/2 w-44 aspect-video bg-white/10 backdrop-blur-md rounded-lg overflow-hidden border border-amber-400/30 shadow-2xl shadow-amber-500/20 cursor-pointer pointer-events-auto hover:scale-105 transition-transform"
                                        >
                                            <div className="bg-slate-900/80 px-2 py-1 border-b border-slate-700/50">
                                                <p className="text-[9px] font-black text-blue-100 truncate text-center uppercase tracking-wider">
                                                    {galleryTitle || 'MY ADVERTISEMENT'}
                                                </p>
                                            </div>
                                            {galleryImages?.[0] ? (
                                                <div className="w-full aspect-video bg-black/40">
                                                    <img
                                                        src={normalizeImageUrl(galleryImages[0])}
                                                        className="w-full h-full object-cover opacity-80"
                                                        alt="My Ads"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-full h-12 flex items-center justify-center bg-blue-900/20">
                                                    <Diamond className="w-4 h-4 text-blue-400 animate-pulse" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-transparent mix-blend-overlay" />
                                            <motion.div
                                                animate={{ top: ['0%', '100%', '0%'] }}
                                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                                className="absolute left-0 right-0 h-[1px] bg-blue-300/60 shadow-[0_0_10px_#60a5fa] z-10"
                                            />
                                        </div>
                                    )}

                                    {/* Labels under self avatar */}
                                    <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                                        {myStatus && !isSeaGameMode && (
                                            <div className="whitespace-nowrap bg-white/90 backdrop-blur border border-gray-200/50 px-2 py-1 rounded-full shadow-lg pointer-events-none">
                                                <span className="text-[9px] font-bold text-gray-600 block max-w-[120px] truncate">{myStatus}</span>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                                )}

                                {/* Search Marker Pin */}
                                {searchMarkerPos && (
                                    <div
                                        className="absolute w-10 h-10 -ml-5 -mt-10 flex items-center justify-center pointer-events-none z-[105]"
                                        style={{
                                            top: `calc(50% + ${-(searchMarkerPos.lat - myObfPos.lat) * DEGREES_TO_PX}px)`,
                                            left: `calc(50% + ${(searchMarkerPos.lng - myObfPos.lng) * DEGREES_TO_PX}px)`
                                        }}
                                    >
                                        <div className="relative flex flex-col items-center">
                                            <div className="absolute -top-6 whitespace-nowrap bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">
                                                Target
                                            </div>
                                            <MapPin className="w-8 h-8 text-red-500 fill-red-100" />
                                            <div className="w-2 h-1 bg-black/30 rounded-[100%] blur-[1px] -mt-1" />
                                        </div>
                                    </div>
                                )}

                                {/* Sea Game Specific Entities */}
                                {isSeaGameMode && seaState?.fortressLat && (
                                    <div
                                        className="absolute w-24 h-24 -ml-12 -mt-12 flex items-center justify-center pointer-events-none z-[90]"
                                        style={{
                                            top: `calc(50% + ${-(seaState.fortressLat - myObfPos.lat) * DEGREES_TO_PX}px)`,
                                            left: `calc(50% + ${(seaState.fortressLng - myObfPos.lng) * DEGREES_TO_PX}px)`
                                        }}
                                    >
                                        <div className="relative flex flex-col items-center group">
                                            <span className="text-6xl drop-shadow-lg">🏝️</span>
                                            <div className="absolute -bottom-4 whitespace-nowrap bg-[#1a1d24]/80 text-emerald-400 border border-emerald-500/50 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                                                Thành trì của bạn
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {isSeaGameMode && boatTargetPin && (
                                    <div
                                        className="absolute w-12 h-12 -ml-6 -mt-12 flex items-center justify-center pointer-events-none z-[85]"
                                        style={{
                                            top: `calc(50% + ${-(boatTargetPin.lat - myObfPos.lat) * DEGREES_TO_PX}px)`,
                                            left: `calc(50% + ${(boatTargetPin.lng - myObfPos.lng) * DEGREES_TO_PX}px)`
                                        }}
                                    >
                                        <span className="text-3xl animate-bounce drop-shadow-md">📍</span>
                                    </div>
                                )}

                                {isSeaGameMode && seaGameCtx?.worldItems?.map((item: any) => {
                                    const dLat = item.lat - (myObfPos.lat - boatOffsetY.get() / DEGREES_TO_PX);
                                    const dLng = item.lng - (myObfPos.lng + boatOffsetX.get() / DEGREES_TO_PX);
                                    const distDeg = Math.sqrt(dLat * dLat + dLng * dLng);
                                    const distMeters = Math.round(distDeg * 111000);

                                    return (
                                        <motion.div
                                            key={item.spawnId}
                                            className="absolute w-10 h-10 -ml-5 -mt-5 flex flex-col items-center cursor-pointer z-[95] hover:scale-125 transition-transform"
                                            style={{
                                                top: `calc(50% + ${-(item.lat - myObfPos.lat) * DEGREES_TO_PX}px)`,
                                                left: `calc(50% + ${(item.lng - myObfPos.lng) * DEGREES_TO_PX}px)`
                                            }}
                                            animate={{ y: [-2, 2, -2] }}
                                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: Math.random() * 2 }}
                                        >
                                            <div className="relative group flex flex-col items-center">
                                                <span className="text-2xl drop-shadow-md group-hover:animate-bounce">{item.item?.icon || '💎'}</span>
                                                <div className="flex flex-col items-center bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-lg border border-white/10 mt-0.5">
                                                    <span className="text-[7px] font-black text-cyan-200 uppercase tracking-tighter whitespace-nowrap leading-none">{item.item?.name}</span>
                                                    <span className="text-[6px] font-bold text-white/60 tabular-nums">{distMeters}m</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}


                                {/* Other Nodes */}
                                {!isSeaGameMode && nearbyUsers.filter(u => {
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
                                    const distKm = Math.sqrt(Math.pow(u.lat - myObfPos!.lat, 2) + Math.pow(u.lng - myObfPos!.lng, 2)) * 111;
                                    if (distKm > filterDistance) return false;
                                    const age = u.birthdate ? (new Date().getFullYear() - new Date(u.birthdate).getFullYear()) : 20;
                                    if (age < filterAgeMin || age > filterAgeMax) return false;
                                    return true;
                                }).map(u => (
                                    <SpatialNode
                                        key={u.id}
                                        user={u}
                                        myPos={myObfPos!}
                                        mapScale={scale}
                                        onClick={() => {
                                            setSelectedUser(u);
                                        }}
                                        onContextMenu={(e, uData) => {
                                            setContextMenu({
                                                x: e.clientX,
                                                y: e.clientY,
                                                target: 'user',
                                                data: uData
                                            });
                                        }}
                                    />
                                ))}
                            </>
                        )}
                    </motion.div>
                </motion.div>
            )}

            {/* Sea Game Curse Bar */}
            {isSeaGameMode && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[115] w-[90%] max-w-[500px] pointer-events-none">
                    <div className="flex items-center gap-2 bg-[#0d0f13]/90 backdrop-blur-md rounded-full px-4 py-2 border border-red-900/30 shadow-[0_0_20px_rgba(220,38,38,0.15)]">
                        <span className="text-red-400 text-xs font-bold shrink-0">☠️ Nguyền rủa</span>
                        <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden relative">
                            <motion.div
                                className="h-full rounded-full relative"
                                style={{
                                    background: `linear-gradient(90deg, #7f1d1d, #dc2626 ${Math.min(seaState?.cursePercent || 0, 100)}%, #ef4444)`,
                                    boxShadow: (seaState?.cursePercent || 0) > 50 ? '0 0 12px rgba(239,68,68,0.6)' : 'none',
                                }}
                                animate={{ width: `${Math.min(seaState?.cursePercent || 0, 100)}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                        </div>
                        <span className={`text-xs font-black tabular-nums min-w-[36px] text-right ${(seaState?.cursePercent || 0) > 70 ? 'text-red-400 animate-pulse' : 'text-red-300/70'}`}>
                            {Math.round(seaState?.cursePercent || 0)}%
                        </span>
                    </div>
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

            {/* Connection Status Indicator */}
            {isConnecting && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[110] bg-blue-600/80 backdrop-blur-lg border border-white/10 text-white px-4 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                    <RefreshCw className="w-3 h-3 animate-spin" /> SCANNING SECTOR...
                </div>
            )}
        </div>
    );
};

export default MapCanvas;
