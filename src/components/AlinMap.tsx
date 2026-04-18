import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, MapPin, Navigation, X, UserPlus, MessageCircle, Filter, ChevronUp, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';

// 1 degree of lat/lng ≈ 111km. We want 1km ≈ 100px on screen.
// So 1 degree = 111 * 100 = 11100 pixels
const DEGREES_TO_PX = 11100;

const SpatialNode = ({ user, myPos, onClick }: { user: any, myPos: { lat: number, lng: number }, onClick: () => void }) => {
    const dx = (user.lng - myPos.lng) * DEGREES_TO_PX;
    const dy = -(user.lat - myPos.lat) * DEGREES_TO_PX; // CSS Y is inverted vs latitude

    return (
        <motion.div 
            onPointerDown={(e) => e.stopPropagation()} // Prevent dragging the floor when clicking this
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="absolute w-12 h-12 -ml-6 -mt-12 cursor-pointer group hover:z-50 pointer-events-auto"
            style={{ 
                left: `calc(50% + ${dx}px)`, 
                top: `calc(50% + ${dy}px)`
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
        >
            <div className="w-full h-full rounded-full border-[3px] overflow-hidden shadow-[0_0_15px_rgba(59,130,246,0.6)] border-blue-500 bg-[#1a1d24]">
                <img src={`https://i.pravatar.cc/150?u=${user.id}`} className="w-full h-full object-cover" />
            </div>
            
            {/* Hologram base shadow/glow */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-2 bg-blue-500/50 blur-sm rounded-full -z-10" />
            
            {/* Username Tooltip */}
            <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity text-white border border-white/10 pointer-events-none">
                {user.username || 'Mysterious User'}
            </div>
        </motion.div>
    );
};



interface AlinMapProps {
    user: any;
    onClose: () => void;
    externalApi: any; // Pass externalApi from props or import it
}

const AlinMap: React.FC<AlinMapProps> = ({ user, onClose, externalApi }) => {
    const [position, setPosition] = useState<[number, number] | null>(null);
    const [myObfPos, setMyObfPos] = useState<{ lat: number, lng: number } | null>(null);
    const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [userGames, setUserGames] = useState<any[]>([]);
    const [searchTag, setSearchTag] = useState('');
    const [radius, setRadius] = useState(5);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isConsentOpen, setIsConsentOpen] = useState(true);
    const [isLoadingGames, setIsLoadingGames] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [debugLog, setDebugLog] = useState<string[]>([]);
    const [wsStatus, setWsStatus] = useState('IDLE');
    const ws = useRef<WebSocket | null>(null);

    const addLog = (msg: string) => {
        console.log('[Alin]', msg);
        setDebugLog(prev => [...prev.slice(-15), `${new Date().toLocaleTimeString()} ${msg}`]);
    };

    // 3D Grid Panning & Zooming variables
    const panX = useMotionValue(0);
    const panY = useMotionValue(0);
    const scale = useMotionValue(1);

    // Initial Geolocation
    const requestLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setPosition([latitude, longitude]);
                    setIsConsentOpen(false);
                },
                (err) => {
                    console.error("Geolocation error:", err);
                    // Fallback to IP logic would go here
                    setPosition([10.762622, 106.660172]); // Sample: HCM City
                    setIsConsentOpen(false);
                }
            );
        }
    };

    // WebSocket Integration with Auto-Reconnect
    const connectWS = useCallback(() => {
        if (!position || isConnecting) return;
        setIsConnecting(true);

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const hostname = window.location.hostname;
        // Connect to the dedicated Alin Social subdomain
        const wsUrl = hostname === 'localhost' 
            ? `${protocol}//${hostname}:2096` 
            : `wss://alin-social.alin.city`;
        addLog(`Connecting to ${wsUrl}...`);
        setWsStatus('CONNECTING');
        
        let socket: WebSocket;
        try {
            socket = new WebSocket(wsUrl);
        } catch (e: any) {
            addLog(`❌ WebSocket create failed: ${e.message}`);
            setWsStatus('ERROR');
            setIsConnecting(false);
            return;
        }
        ws.current = socket;

        socket.onopen = () => {
            addLog(`✅ Connected! Sending USER_JOIN...`);
            setIsConnecting(false);
            setWsStatus('OPEN');
            const deviceId = localStorage.getItem('deviceId') || '';
            socket.send(JSON.stringify({
                type: 'USER_JOIN',
                payload: {
                    deviceId,
                    lat: position[0],
                    lng: position[1],
                    radiusKm: radius
                }
            }));
            addLog(`📍 Sent GPS: ${position[0].toFixed(4)}, ${position[1].toFixed(4)}`);
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            addLog(`📨 Received: ${data.type}`);
            
            if (data.type === 'JOIN_SUCCESS') {
                const p = data.payload;
                addLog(`🎯 My obf pos: ${p.lat?.toFixed(4)}, ${p.lng?.toFixed(4)} (user: ${p.username})`);
                setMyObfPos({ lat: p.lat, lng: p.lng });
                // Auto scan immediately
                socket.send(JSON.stringify({
                    type: 'MAP_MOVE',
                    payload: { lat: p.lat, lng: p.lng, zoom: 13 }
                }));
                addLog(`🔍 Sent MAP_MOVE scan`);
            }
            if (data.type === 'NEARBY_USERS') {
                const users = data.payload;
                addLog(`👥 Found ${users.length} users nearby`);
                users.forEach((u: any) => {
                    addLog(`  → ${u.username || u.id} at ${u.lat?.toFixed(4)},${u.lng?.toFixed(4)}`);
                });
                let filtered = users;
                if (searchTag.trim()) {
                    const tag = searchTag.toLowerCase().replace('#', '');
                    filtered = filtered.filter((u: any) => 
                        (u.tags && u.tags.some((t: string) => t.toLowerCase().includes(tag))) ||
                        (u.username && u.username.toLowerCase().includes(tag))
                    );
                }
                setNearbyUsers(filtered);
            }
        };

        socket.onclose = () => {
            addLog('🔌 Disconnected, retrying in 3s...');
            setIsConnecting(false);
            setWsStatus('CLOSED');
            setTimeout(connectWS, 3000);
        };

        socket.onerror = (e) => {
            addLog(`❌ WebSocket error (CSP blocked?)`);
            setIsConnecting(false);
            setWsStatus('ERROR');
        };
    }, [position, radius, searchTag, isConnecting]);

    useEffect(() => {
        connectWS();
        return () => {
            if (ws.current) ws.current.close();
        };
    }, [position]); // Only reconnect if position changes significantly or on mount

    const handleAddFriend = async () => {
        if (!selectedUser) return;
        try {
            await externalApi.addFriend(selectedUser.id);
            alert(`Friend request sent to ${selectedUser.username}!`);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleMessage = () => {
        alert("Chat feature is coming soon to Alin Map!");
    };

    // Fetch games for selected user
    useEffect(() => {
        if (selectedUser) {
            setIsLoadingGames(true);
            externalApi.getUserGames(selectedUser.id)
                .then((res: any) => {
                    if (res.success) setUserGames(res.games);
                })
                .catch(console.error)
                .finally(() => setIsLoadingGames(false));
        } else {
            setUserGames([]);
        }
    }, [selectedUser, externalApi]);

    const handleRefresh = () => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN && myObfPos) {
            setIsConnecting(true);
            
            // Convert pan offset back to degrees
            const scanLng = myObfPos.lng + (-panX.get() / DEGREES_TO_PX);
            const scanLat = myObfPos.lat + (panY.get() / DEGREES_TO_PX);

            ws.current.send(JSON.stringify({
                type: 'MAP_MOVE',
                payload: { lat: scanLat, lng: scanLng, zoom: 13 }
            }));
            setTimeout(() => setIsConnecting(false), 1000);
        }
    };

    const handleCenter = () => {
        // Reset pan to center
        panX.set(0);
        panY.set(0);
        scale.set(1);
    };

    const handleUpdateRadius = (newRadius: number) => {
        setRadius(newRadius);
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'UPDATE_RADIUS',
                payload: { radiusKm: newRadius }
            }));
            setTimeout(handleRefresh, 500); // Rescan after updating radius!
        }
    };

    if (!user) {
        return (
            <div className="fixed inset-0 z-[100] bg-[#050508] flex border border-blue-500/20 items-center justify-center p-6">
                <div className="bg-[#1a1d24] p-8 rounded-3xl max-w-sm w-full text-center shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <MapPin className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-gray-400 text-sm mb-8">Bạn cần đăng nhập vào Resider Portal để khởi động không gian Alin 3D Universe.</p>
                    <button 
                        onClick={onClose}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                    >
                        Quay lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-[#13151a] flex flex-col">
            {/* Header / Search Bar (Mobile First) */}
            <div className="absolute top-4 left-4 right-4 z-[110] flex gap-2">
                <div className="flex-1 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center px-4 py-2.5 shadow-2xl">
                    <Search className="w-5 h-5 text-gray-400 mr-2" />
                    <input 
                        type="text" 
                        placeholder="Search tags (#gaming, #coder...)" 
                        className="bg-transparent border-none outline-none text-white text-sm w-full placeholder:text-gray-500"
                        value={searchTag}
                        onChange={(e) => setSearchTag(e.target.value)}
                    />
                    {searchTag && <X className="w-4 h-4 text-gray-400 cursor-pointer" onClick={() => setSearchTag('')} />}
                </div>
                <button 
                    onClick={onClose}
                    className="w-12 h-12 bg-gray-800/80 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 text-white"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* 2D Flat Space Interactor */}
            <div className="flex-1 relative overflow-hidden bg-[#0a0a0f]">
                
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
                                    onClick={requestLocation}
                                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                                >
                                    Activate Hologram
                                </button>
                                <button 
                                    onClick={() => { setPosition([10.762, 106.660]); setIsConsentOpen(false); }}
                                    className="text-gray-500 hover:text-gray-300 text-sm py-2 transition-colors"
                                >
                                    Deploy as Ghost (Fake coords)
                                </button>
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
                            styles={{
                                backgroundImage: "linear-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.05) 1px, transparent 1px)",
                                backgroundSize: "100px 100px",
                                backgroundPosition: "center center"
                            }}
                        >
                            {/* Grid styling explicit fix */}
                            <div className="absolute inset-0 pointer-events-none" style={{
                                backgroundImage: "linear-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.05) 1px, transparent 1px)",
                                backgroundSize: "100px 100px",
                                backgroundPosition: "center center",
                            }} />

                            {/* Self Node */}
                            <motion.div className="absolute w-12 h-12 -ml-6 -mt-6 group pointer-events-auto" style={{ top: '50%', left: '50%' }}>
                                <div className="w-full h-full rounded-full border-[3px] overflow-hidden shadow-[0_0_25px_rgba(59,130,246,0.8)] border-blue-400 bg-[#1a1d24] relative z-10">
                                    <img src={`https://i.pravatar.cc/150?u=${user?.uid || 'self'}`} className="w-full h-full object-cover" />
                                </div>
                                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-10 h-2 bg-blue-500/60 blur-[6px] rounded-full -z-10" />
                                
                                <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 bg-blue-600/80 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap text-white border border-white/20">
                                    YOU
                                </div>
                            </motion.div>

                            {/* Other Nodes */}
                            {nearbyUsers.map(u => (
                                <SpatialNode 
                                    key={u.id}
                                    user={u} 
                                    myPos={myObfPos!}
                                    onClick={() => {
                                        setSelectedUser(u);
                                        // Auto-center by pan calculation
                                        const pxX = (u.lng - myObfPos!.lng) * DEGREES_TO_PX;
                                        const pxY = -(u.lat - myObfPos!.lat) * DEGREES_TO_PX;
                                        panX.set(-pxX);
                                        panY.set(-pxY);
                                    }} 
                                />
                            ))}
                        </motion.div>
                    </motion.div>
                )}

                {/* Connection Status Indicator */}
                {isConnecting && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[110] bg-blue-600/80 backdrop-blur-lg border border-white/10 text-white px-4 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                        <RefreshCw className="w-3 h-3 animate-spin" /> SCANNING SECTOR...
                    </div>
                )}

                {/* DEBUG PANEL */}
                <div className="absolute bottom-4 left-4 z-[200] bg-black/90 backdrop-blur-lg border border-green-500/50 rounded-xl p-3 max-w-[300px] max-h-[250px] overflow-y-auto text-[9px] font-mono text-green-400 pointer-events-auto">
                    <div className="text-green-300 font-bold mb-1">🛰️ ALIN DEBUG [{wsStatus}]</div>
                    <div className="text-yellow-400">GPS: {position ? `${position[0].toFixed(4)}, ${position[1].toFixed(4)}` : 'null'}</div>
                    <div className="text-cyan-400">ObfPos: {myObfPos ? `${myObfPos.lat.toFixed(4)}, ${myObfPos.lng.toFixed(4)}` : 'null'}</div>
                    <div className="text-pink-400">Nearby: {nearbyUsers.length} users</div>
                    {nearbyUsers.map(u => (
                        <div key={u.id} className="text-gray-400 pl-2">
                            → {u.username || u.id}: {u.lat?.toFixed(4)},{u.lng?.toFixed(4)}
                            {myObfPos && <span className="text-orange-400"> ({((u.lng - myObfPos.lng) * DEGREES_TO_PX).toFixed(0)}px, {(-(u.lat - myObfPos.lat) * DEGREES_TO_PX).toFixed(0)}px)</span>}
                        </div>
                    ))}
                    <div className="border-t border-green-500/30 mt-1 pt-1">
                        {debugLog.slice(-8).map((log, i) => (
                            <div key={i} className="text-gray-500">{log}</div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Floating Controls */}
            <div className="absolute bottom-20 right-4 z-[110] flex flex-col gap-3">
                <button 
                    onClick={() => scale.set(Math.min(scale.get() + 0.3, 3))}
                    className="w-12 h-12 bg-white/10 backdrop-blur-lg border border-white/20 text-white rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-transform"
                >
                    <ZoomIn className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => scale.set(Math.max(scale.get() - 0.3, 0.4))}
                    className="w-12 h-12 bg-white/10 backdrop-blur-lg border border-white/20 text-white rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-transform"
                >
                    <ZoomOut className="w-5 h-5" />
                </button>
                <button 
                    onClick={handleRefresh}
                    className="w-12 h-12 bg-white text-gray-900 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center justify-center active:scale-95 transition-transform"
                >
                    <RefreshCw className={`w-5 h-5 ${isConnecting ? 'animate-spin' : ''}`} />
                </button>
                <button 
                    onClick={handleCenter}
                    className="w-12 h-12 bg-gray-800 text-white rounded-full shadow-xl border border-white/10 flex items-center justify-center active:scale-95 transition-transform"
                >
                    <Navigation className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)] flex items-center justify-center active:scale-95 transition-transform mt-4"
                >
                    <Filter className="w-5 h-5" />
                </button>
            </div>

                {/* Sidebar (Settings/Radius) */}
                <AnimatePresence>
                    {isSidebarOpen && (
                        <>
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsSidebarOpen(false)}
                                className="absolute inset-0 bg-black/40 z-[150]"
                            />
                            <motion.div 
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                className="absolute top-0 right-0 bottom-0 w-80 bg-[#1a1d24] z-[160] p-6 shadow-2xl border-l border-white/10"
                            >
                                <div className="flex justify-between items-center mb-8">
                                    <h2 className="text-xl font-bold">Privacy Settings</h2>
                                    <X className="w-6 h-6 cursor-pointer" onClick={() => setIsSidebarOpen(false)} />
                                </div>

                                <div className="space-y-8">
                                    <div>
                                        <div className="flex justify-between mb-4">
                                            <span className="text-gray-400 font-medium">Obfuscation Radius</span>
                                            <span className="text-blue-400 font-bold">{radius} km</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="100" 
                                            value={radius} 
                                            onChange={(e) => handleUpdateRadius(parseInt(e.target.value))}
                                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                        />
                                        <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
                                            Your avatar will be placed randomly within this radius from your real location. 
                                            Higher radius means more privacy.
                                        </p>
                                    </div>

                                    <div className="pt-6 border-t border-white/5">
                                        <h3 className="font-bold mb-4">Display Mode</h3>
                                        <label className="flex items-center justify-between cursor-pointer group">
                                            <span className="text-gray-400 group-hover:text-white transition-colors">Visible on Map</span>
                                            <div className="relative inline-flex items-center">
                                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

            {/* Bottom Sheet (Mobile Info) */}
            <AnimatePresence>
                {selectedUser && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedUser(null)}
                            className="absolute inset-0 bg-black/40 z-[130]"
                        />
                        <motion.div 
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="absolute bottom-0 left-0 right-0 bg-[#1a1d24] rounded-t-[32px] p-6 z-[140] border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] max-h-[85vh] overflow-y-auto"
                        >
                            <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-6" />
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-16 h-16 bg-gray-800 rounded-2xl border-2 border-blue-500/30 overflow-hidden">
                                    <img src={`https://i.pravatar.cc/150?u=${selectedUser.id}`} alt="Avatar" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold">{selectedUser.username || 'Mysterious User'}</h3>
                                    <p className="text-gray-400 text-sm mt-1">"Exploring the digital universe"</p>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {(selectedUser.tags || ['#GAMER', '#ALIN']).map((tag: string) => (
                                            <span key={tag} className="text-[10px] font-bold bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full border border-blue-500/30">
                                                {tag.toUpperCase()}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Game List (Creator connection) */}
                            <div className="mb-8">
                                <h4 className="text-xs font-black text-gray-500 tracking-widest uppercase mb-4">Created Games</h4>
                                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                    {isLoadingGames ? (
                                        <div className="flex gap-4">
                                            {[1,2,3].map(i => <div key={i} className="min-w-[120px] h-20 bg-gray-800/50 rounded-xl animate-pulse" />)}
                                        </div>
                                    ) : userGames.length > 0 ? (
                                        userGames.map((game) => (
                                            <div key={game.id} className="min-w-[140px] bg-gray-800 rounded-xl overflow-hidden border border-white/5 group active:scale-95 transition-transform">
                                                <div className="h-20 bg-gray-700 relative">
                                                    <img src={game.image} className="w-full h-full object-cover" alt={game.title} />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Navigation className="w-5 h-5 text-white" />
                                                    </div>
                                                </div>
                                                <div className="p-2">
                                                    <p className="text-[10px] font-bold truncate">{game.title}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 text-xs italic">No games published yet.</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pb-4">
                                <button 
                                    onClick={handleAddFriend}
                                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                                >
                                    <UserPlus className="w-5 h-5" /> Add Friend
                                </button>
                                <button 
                                    onClick={handleMessage}
                                    className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white py-3.5 rounded-2xl font-bold transition-all border border-white/5 active:scale-95"
                                >
                                    <MessageCircle className="w-5 h-5" /> Message
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AlinMap;
