import React, { useState } from 'react';
import { normalizeImageUrl } from '../../services/externalApi';
import { MapPin, RefreshCw, Diamond } from 'lucide-react';
import { motion, MotionValue, useMotionValue } from 'framer-motion';
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
}

const MapCanvas: React.FC<MapCanvasProps> = ({
    position, isConsentOpen, myObfPos, nearbyUsers, myUserId, user, myDisplayName, myStatus,
    isVisibleOnMap, isConnecting, isDesktop, currentProvince, galleryActive, galleryTitle, galleryImages,
    searchTag, filterDistance, filterAgeMin, filterAgeMax, searchMarkerPos,
    scale, panX, panY, selfDragX, selfDragY, ws,
    requestLocation, setSelectedUser, setActiveTab, setIsSheetExpanded, setMyObfPos, addLog, handleWheel,
    mapMode
}) => {
    return (
        <div
            className="flex-1 relative overflow-hidden bg-[#0c0d12]"
            onWheel={handleWheel}
        >
            {/* Glow Background Elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-blue-500/10 blur-[100px] pointer-events-none rounded-full" />

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
                        dragConstraints={{ left: -5000, right: 5000, top: -5000, bottom: 5000 }}
                        dragElastic={0.1}
                        className="absolute w-[10000px] h-[10000px] cursor-grab active:cursor-grabbing pointer-events-auto flex items-center justify-center border border-blue-500/10"
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

                                {/* Self Node */}
                                <motion.div
                                    drag
                                    dragMomentum={false}
                                    dragConstraints={{ left: -3000, right: 3000, top: -3000, bottom: 3000 }}
                                    dragElastic={0}
                                    onPointerDown={(e) => e.stopPropagation()}
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
                                    className="absolute w-12 h-12 -ml-6 -mt-12 group pointer-events-auto z-[100] cursor-grab active:cursor-grabbing select-none"
                                    style={{ top: '50%', left: '50%', x: selfDragX, y: selfDragY }}
                                    onPointerEnter={() => {
                                        const s = scale.get();
                                        document.documentElement.style.setProperty('--self-hover-scale', String(isDesktop ? Math.max(1.1, 1.2 / s) : 1.1));
                                    }}
                                    whileHover={{ scale: 'var(--self-hover-scale, 1.1)' as any }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping shadow-[0_0_20px_rgba(59,130,246,0.6)]" />
                                    <div className={`w-full h-full rounded-full border-[2.5px] overflow-hidden bg-[#1a1d24] relative z-10 transition-all shadow-[0_0_25px_rgba(59,130,246,0.8)] ${isVisibleOnMap ? 'border-blue-400' : 'border-emerald-500 opacity-60'}`}>
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
                                    {galleryActive && (
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
                                        {myStatus && (
                                            <div className="whitespace-nowrap bg-white/90 backdrop-blur border border-gray-200/50 px-2 py-1 rounded-full shadow-lg pointer-events-none">
                                                <span className="text-[9px] font-bold text-gray-600 block max-w-[120px] truncate">{myStatus}</span>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>

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

                                {/* Other Nodes */}
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
                                            const pxX = (u.lng - myObfPos!.lng) * DEGREES_TO_PX;
                                            const pxY = -(u.lat - myObfPos!.lat) * DEGREES_TO_PX;
                                            panX.set(-pxX);
                                            panY.set(-pxY);
                                        }}
                                    />
                                ))}
                            </>
                        )}
                    </motion.div>
                </motion.div>
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
