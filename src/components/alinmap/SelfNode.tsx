import React from 'react';
import { Diamond } from 'lucide-react';
import { motion, MotionValue, useTransform } from 'framer-motion';
import { normalizeImageUrl } from '../../services/externalApi';
import { DEGREES_TO_PX } from './constants';

interface SelfNodeProps {
    isSeaGameMode: boolean;
    myObfPos: { lat: number; lng: number };
    myDisplayName: string;
    myStatus: string;
    isVisibleOnMap: boolean;
    isDesktop: boolean;
    user: any;
    myUserId: string | null;
    galleryActive: boolean;
    galleryTitle: string;
    galleryImages: string[];
    scale: MotionValue<number>;
    selfDragX: MotionValue<number>;
    selfDragY: MotionValue<number>;
    panX: MotionValue<number>;
    panY: MotionValue<number>;
    boatOffsetX: MotionValue<number>;
    boatOffsetY: MotionValue<number>;
    ws: React.MutableRefObject<WebSocket | null>;
    setSelectedUser: (u: any) => void;
    setActiveTab: (tab: 'info' | 'posts') => void;
    setIsSheetExpanded: (v: boolean) => void;
    setMyObfPos: (pos: { lat: number; lng: number }) => void;
    setMainTab?: (tab: string) => void;
    addLog: (msg: string) => void;
    seaState?: any;
}

const SelfNode: React.FC<SelfNodeProps> = ({
    isSeaGameMode, myObfPos, myDisplayName, myStatus, isVisibleOnMap, isDesktop,
    user, myUserId, galleryActive, galleryTitle, galleryImages,
    scale, selfDragX, selfDragY, panX, panY, boatOffsetX, boatOffsetY,
    ws, setSelectedUser, setActiveTab, setIsSheetExpanded, setMyObfPos, setMainTab, addLog, seaState,
}) => {
    const avatarUrl = normalizeImageUrl(user?.photoURL) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || myDisplayName)}&background=1a1d24&color=3b82f6&size=150&bold=true`;
    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || myDisplayName)}&background=1a1d24&color=3b82f6&size=150&bold=true`;

    const fortressDist = useTransform(boatOffsetX || new MotionValue(), (ox) => {
        if (!isSeaGameMode || !seaState?.fortressLat) return '';
        const oy = boatOffsetY?.get() || 0;
        const dLat = seaState.fortressLat - (myObfPos.lat - oy / DEGREES_TO_PX);
        const dLng = seaState.fortressLng - (myObfPos.lng + ox / DEGREES_TO_PX);
        const dist = Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 111000);
        return dist <= 100 ? 'Đang ở Thành' : `${dist}m`;
    });

    if (isSeaGameMode) {
        const boatScaleStack = seaState?.activeCurses?.boat_scale || 0;
        const finalBoatScale = 1 + boatScaleStack * 0.05;

        return (
                <motion.div
                    data-map-interactive="true"
                    className="absolute w-16 h-16 -ml-8 -mt-8 pointer-events-auto z-[100] select-none cursor-default"
                    style={{ top: '50%', left: '50%', x: boatOffsetX, y: boatOffsetY, scale: finalBoatScale }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!user) return;
                    setMainTab?.('backpack');
                    setIsSheetExpanded(true);
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
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
                {seaState?.fortressLat && (
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 w-max">
                        <div className="bg-[#050b12]/90 backdrop-blur border border-cyan-500/30 px-2.5 py-0.5 rounded-full shadow-lg pointer-events-none">
                            <motion.span className="text-[10px] font-black text-cyan-300 tracking-wider">
                                🏰 <motion.span>{fortressDist}</motion.span>
                            </motion.span>
                        </div>
                    </div>
                )}
            </motion.div>
        );
    }

    return (
        <motion.div
            data-map-interactive="true"
            drag
            dragMomentum={false}
            dragConstraints={{ left: -3000, right: 3000, top: -3000, bottom: 3000 }}
            dragElastic={0}
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onDragEnd={(e, info) => {
                if (ws.current && ws.current.readyState === WebSocket.OPEN && myObfPos) {
                    const currentScale = scale?.get?.() || 1;
                    const deltaLng = (info.offset.x / currentScale) / DEGREES_TO_PX;
                    const deltaLat = (-info.offset.y / currentScale) / DEGREES_TO_PX;
                    const newLat = myObfPos.lat + deltaLat;
                    const newLng = myObfPos.lng + deltaLng;
                    ws.current.send(JSON.stringify({
                        type: 'MAP_MOVE',
                        payload: { lat: newLat, lng: newLng, zoom: 13 }
                    }));
                    setMyObfPos({ lat: newLat, lng: newLng });
                    panX.set((panX?.get?.() ?? 0) + info.offset.x / currentScale);
                    panY.set((panY?.get?.() ?? 0) + info.offset.y / currentScale);
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
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="absolute group pointer-events-auto z-[100] select-none w-12 h-12 cursor-grab active:cursor-grabbing -ml-6 -mt-12"
            style={{ top: '50%', left: '50%', x: selfDragX, y: selfDragY }}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            onPointerEnter={() => {
                const s = scale?.get?.() ?? 1;
                document.documentElement.style.setProperty('--self-hover-scale', String(isDesktop ? Math.max(1.1, 1.2 / s) : 1.1));
            }}
            whileHover={{ scale: 'var(--self-hover-scale, 1.1)' as any }}
            whileTap={{ scale: 0.95 }}
        >
            <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping shadow-[0_0_20px_rgba(34,211,238,0.4)]" />
            <div className={`w-full h-full rounded-full border-[2.5px] overflow-hidden bg-[#1a1d24] relative z-10 transition-all shadow-[0_0_25px_rgba(34,211,238,0.6)] ${isVisibleOnMap ? 'border-cyan-400' : 'border-emerald-500 opacity-60'}`}>
                <img
                    src={avatarUrl}
                    className="w-full h-full object-cover pointer-events-none"
                    onError={(e) => { (e.target as HTMLImageElement).src = fallbackUrl; }}
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
                    {Array.isArray(galleryImages) && galleryImages.length > 0 ? (
                        <div className="w-full aspect-video bg-black/40">
                            <img src={normalizeImageUrl(galleryImages[0])} className="w-full h-full object-cover opacity-80" alt="My Ads" />
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

            {/* Status label */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 w-max">
                {isSeaGameMode && seaState?.fortressLat && (
                    <div className="bg-[#050b12]/90 backdrop-blur border border-cyan-500/30 px-2.5 py-0.5 rounded-full shadow-lg pointer-events-none">
                        <motion.span className="text-[10px] font-black text-cyan-300 tracking-wider">
                            🏰 <motion.span>{fortressDist}</motion.span>
                        </motion.span>
                    </div>
                )}
                {myStatus && !isSeaGameMode && (
                    <div className="whitespace-nowrap bg-white/90 backdrop-blur border border-gray-200/50 px-2 py-1 rounded-full shadow-lg pointer-events-none mt-1">
                        <span className="text-[9px] font-bold text-gray-600 block max-w-[120px] truncate">{myStatus}</span>
                        <span className="text-[10px] font-bold text-gray-400">#{(galleryImages?.[0] || '').slice(-4).toUpperCase()}</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default React.memo(SelfNode);
