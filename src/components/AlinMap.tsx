import React, { useState, useEffect, useCallback, useRef } from 'react';
import { normalizeImageUrl } from '../services/externalApi';
import { Search, MapPin, Navigation, X, UserPlus, MessageCircle, Filter, ChevronUp, RefreshCw, ZoomIn, ZoomOut, Heart, Star, Bookmark, PlusCircle, CloudSun, Diamond, Compass, LocateFixed, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';

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
                <img 
                    src={normalizeImageUrl(user.avatar_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'U')}&background=1a1d24&color=3b82f6&size=150&bold=true`} 
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'U')}&background=1a1d24&color=3b82f6&size=150&bold=true`; }}
                />
            </div>
            
            {/* Hologram base shadow/glow */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-2 bg-blue-500/50 blur-sm rounded-full -z-10" />
            
            {/* Username Tooltip */}
            <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity text-white border border-white/10 pointer-events-none">
                {user.username || 'Mysterious User'}
            </div>
            
            {/* Status if available */}
            {user.status && (
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[9px] font-medium whitespace-nowrap text-white/80 border border-white/10 max-w-[120px] truncate pointer-events-none">
                    {user.status}
                </div>
            )}
        </motion.div>
    );
};



interface AlinMapProps {
    user: any;
    onClose: () => void;
    externalApi: any; // Pass externalApi from props or import it
    games?: any[];
    onOpenChat?: (id: string, name: string) => void;
}

const AlinMap: React.FC<AlinMapProps> = ({ user, onClose, externalApi, games, onOpenChat }) => {
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
    const [myUserId, setMyUserId] = useState<string | null>(null);
    const [sentFriendRequests, setSentFriendRequests] = useState<string[]>([]);
    const [myStatus, setMyStatus] = useState("🚀 Exploring the digital universe");
    const [myDisplayName, setMyDisplayName] = useState(user?.displayName || 'YOU');
    const [isEditingStatus, setIsEditingStatus] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [statusInput, setStatusInput] = useState("");
    const [nameInput, setNameInput] = useState("");
    const [isVisibleOnMap, setIsVisibleOnMap] = useState(!!user);
    const [currentProvince, setCurrentProvince] = useState<string | null>(null);
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<any>(null);
    const isMounted = useRef(true);
    const selfDragX = useMotionValue(0);
    const selfDragY = useMotionValue(0);
    const [isSheetExpanded, setIsSheetExpanded] = useState(false);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    const fetchProvinceName = async (lat: number, lng: number) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`);
            const data = await res.json();
            const province = data.address?.province || data.address?.city || data.address?.state || 'Unknown Location';
            setCurrentProvince(province);
        } catch (e) {
            console.error('Geocoding error:', e);
        }
    };

    useEffect(() => {
        if (myObfPos) {
            fetchProvinceName(myObfPos.lat, myObfPos.lng);
        }
    }, [myObfPos?.lat, myObfPos?.lng]);

    const addLog = (msg: string) => {
        console.log('[Alin]', msg);
        setDebugLog(prev => [...prev.slice(-15), `${new Date().toLocaleTimeString()} ${msg}`]);
    };

    // 3D Grid Panning & Zooming variables
    const panX = useMotionValue(0);
    const panY = useMotionValue(0);
    const scale = useMotionValue(1);

    const handleWheel = (e: React.WheelEvent) => {
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const currentScale = scale.get();
        const newScale = Math.min(Math.max(0.5, currentScale + delta), 3);
        
        // Use Framer Motion's animate for smooth zoom
        animate(scale, newScale, {
            type: "spring",
            damping: 25,
            stiffness: 200,
            restDelta: 0.001
        });
    };

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
            if (!isMounted.current) {
                socket.close();
                return;
            }
            addLog(`✅ Connected! Sending USER_JOIN...`);
            setIsConnecting(false);
            setWsStatus('OPEN');
            const deviceId = externalApi.getDeviceId();
            socket.send(JSON.stringify({
                type: 'USER_JOIN',
                payload: {
                    deviceId,
                    lat: position[0],
                    lng: position[1],
                    radiusKm: radius,
                    status: myStatus,
                    visible: isVisibleOnMap
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
                setMyUserId(p.userId);
                if (p.username) setMyDisplayName(p.username);
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
                // Filter out self from nearby users to avoid duplicate avatar
                let filtered = users.filter((u: any) => u.id !== myUserId);
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
            if (!isMounted.current) return;
            addLog('🔌 Disconnected, retrying in 3s...');
            setIsConnecting(false);
            setWsStatus('CLOSED');
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = setTimeout(() => {
                if (isMounted.current) connectWS();
            }, 3000);
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
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
            if (ws.current) ws.current.close();
        };
    }, [position]); // Only reconnect if position changes significantly or on mount

    const handleAddFriend = async () => {
        if (!selectedUser) return;
        try {
            await externalApi.addFriend(selectedUser.id);
            setSentFriendRequests(prev => [...prev, selectedUser.id]);
            alert(`Friend request sent to ${selectedUser.username}!`);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleMessage = () => {
        if (selectedUser && onOpenChat) {
            onOpenChat(selectedUser.id, selectedUser.username);
        } else {
            alert("Chat feature is coming soon to Alin Map!");
        }
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

    // Replaced blocking screen with Guest Mode logic
    useEffect(() => {
        if (!user && !position && !isConsentOpen) {
            setIsConsentOpen(true);
        }
    }, [user, position, isConsentOpen]);

    return (
        <div className="fixed inset-0 z-[100] bg-[#13151a] flex flex-col">
            {/* Header / Search Bar (Mobile First & Left Sidebar on PC) */}
            <div className="absolute top-12 left-4 right-4 md:left-6 md:right-auto md:translate-x-0 md:w-[420px] z-[170] flex gap-2 transition-all">
                <div className="flex-1 bg-white/90 backdrop-blur-xl rounded-full flex items-center px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.15)] overflow-hidden">
                    <Search className="w-5 h-5 text-gray-500 mr-2 shrink-0" />
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm..." 
                        className="bg-transparent border-none outline-none text-gray-900 text-sm w-full placeholder:text-gray-500 font-medium font-sans"
                        value={searchTag}
                        onChange={(e) => setSearchTag(e.target.value)}
                    />
                    {currentProvince && (
                        <div className="ml-2 pl-2 border-l border-gray-300 flex items-center gap-1.5 shrink-0 hidden sm:flex">
                            <MapPin className="w-3 h-3 text-blue-500" />
                            <span className="text-[10px] text-blue-600 font-bold whitespace-nowrap">{currentProvince}</span>
                        </div>
                    )}
                    {/* User Avatar Inside Search */}
                    <button onClick={() => { setSelectedUser({ id: myUserId, isSelf: true, username: myDisplayName, status: myStatus }); setIsSheetExpanded(true); }} className="ml-3 shrink-0 active:scale-95 transition-transform overflow-hidden rounded-full border-2 border-transparent hover:border-blue-500">
                        <img 
                            src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(myDisplayName)}&background=3b82f6&color=fff&size=50&bold=true`} 
                            alt="Me" 
                            className="w-7 h-7 object-cover"
                        />
                    </button>
                </div>
            </div>

            {/* 2D Flat Space Interactor */}
            <div 
                className="flex-1 relative overflow-hidden bg-[#0a0a0f]"
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
                                    onClick={requestLocation}
                                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                                >
                                    Activate Hologram
                                </button>
                                <button 
                                    onClick={() => { setIsVisibleOnMap(false); setPosition([10.762, 106.660]); setIsConsentOpen(false); }}
                                    className="text-gray-400 hover:text-white text-xs py-2 transition-colors border border-white/10 rounded-xl hover:border-white/30"
                                >
                                    👁️ Browse Only — Xem mà không chia sẻ vị trí
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
                        >
                            {/* Province Boundary (Symbolic Gray Circle) */}
                            {currentProvince && (
                                <div 
                                    className="absolute w-[2000px] h-[2000px] border-[5px] border-gray-500/20 rounded-full flex items-center justify-center pointer-events-none"
                                    style={{ 
                                        left: 'calc(50% - 1000px)', 
                                        top: 'calc(50% - 1000px)' 
                                    }}
                                >
                                    <div className="absolute top-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-500/10 border border-gray-500/30 rounded-full text-gray-500 text-xs font-black tracking-widest uppercase backdrop-blur-sm">
                                        {currentProvince} BOUNDARY
                                    </div>
                                </div>
                            )}

                            {/* Grid styling explicit fix */}
                            <div className="absolute inset-0 pointer-events-none" style={{
                                backgroundImage: "linear-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.05) 1px, transparent 1px)",
                                backgroundSize: "100px 100px",
                                backgroundPosition: "center center",
                            }} />

                            {/* Self Node — Always show, but visual diff if hidden */}
                            <motion.div 
                                drag
                                dragMomentum={false}
                                dragConstraints={{ left: -3000, right: 3000, top: -3000, bottom: 3000 }}
                                dragElastic={0}
                                onPointerDown={(e) => e.stopPropagation()}
                                onDragEnd={(e, info) => {
                                    if (ws.current && ws.current.readyState === WebSocket.OPEN && myObfPos) {
                                        const currentScale = scale.get() || 1;
                                        // Use info.offset which is the corrected cumulative displacement
                                        const deltaLng = (info.offset.x / currentScale) / DEGREES_TO_PX;
                                        const deltaLat = (-info.offset.y / currentScale) / DEGREES_TO_PX;
                                        
                                        const newLat = myObfPos.lat + deltaLat;
                                        const newLng = myObfPos.lng + deltaLng;

                                        ws.current.send(JSON.stringify({
                                            type: 'MAP_MOVE',
                                            payload: { lat: newLat, lng: newLng, zoom: 13 }
                                        }));
                                        
                                        // Sync local origin
                                        setMyObfPos({ lat: newLat, lng: newLng });
                                        
                                        // Pan the grid by the exact offset so the avatar stays under the cursor visually!
                                        panX.set(panX.get() + info.offset.x / currentScale);
                                        panY.set(panY.get() + info.offset.y / currentScale);

                                        // RESET drag displacement to zero so avatar remains at visual center relative to new myObfPos
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
                                className="absolute w-14 h-14 -ml-7 -mt-7 group pointer-events-auto z-20 cursor-grab active:cursor-grabbing" 
                                style={{ top: '50%', left: '50%', x: selfDragX, y: selfDragY }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <div className={`w-full h-full rounded-full border-[3px] overflow-hidden bg-[#1a1d24] relative z-10 transition-all shadow-[0_0_25px_rgba(59,130,246,0.8)] ${isVisibleOnMap ? 'border-blue-400' : 'border-gray-500 opacity-60'}`}>
                                    <img 
                                        src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(myDisplayName)}&background=1a1d24&color=3b82f6&size=150&bold=true`} 
                                        className="w-full h-full object-cover" 
                                        onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(myDisplayName)}&background=1a1d24&color=3b82f6&size=150&bold=true`; }}
                                    />
                                    {!isVisibleOnMap && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <div className="w-5 h-5 border-2 border-white/40 border-dashed rounded-full animate-spin-slow" />
                                        </div>
                                    )}
                                </div>
                                <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 w-10 h-2 blur-[6px] rounded-full -z-10 ${isVisibleOnMap ? 'bg-blue-500/60' : 'bg-gray-500/30'}`} />
                                
                                <div className={`absolute top-[-30px] left-1/2 -translate-x-1/2 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap text-white border border-white/20 ${isVisibleOnMap ? 'bg-blue-600/80' : 'bg-gray-600/80'}`}>
                                    {isVisibleOnMap ? 'YOU' : 'YOU (HIDDEN)'}
                                    {currentProvince && <span className="ml-1 opacity-70 text-[9px]">| {currentProvince}</span>}
                                </div>
                                
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[8px] text-gray-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isVisibleOnMap ? 'Click to view | Drag to move' : 'Bạn đang ẩn danh | Kéo để di chuyển'}
                                </div>

                                {/* Status under avatar */}
                                <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[9px] font-medium whitespace-nowrap text-white/80 border border-white/10 max-w-[120px] truncate pointer-events-none">
                                    {myStatus}
                                </div>
                            </motion.div>

                            {/* Observer mode indicator */}
                            {!isVisibleOnMap && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 flex flex-col items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-dashed border-gray-500 rounded-full animate-pulse" />
                                    <span className="text-[9px] text-gray-500 font-bold tracking-widest uppercase bg-black/40 px-2 py-1 rounded-md">OBSERVER</span>
                                </div>
                            )}

                            {/* Other Nodes */}
                            {nearbyUsers.filter(u => u.id !== myUserId).map(u => (
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

                {/* DEBUG PANEL (Hidden) */}
                {false && (
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
                )}
            </div>

            {/* Floating Controls (Map Tools) */}
            <div className="absolute bottom-[200px] md:bottom-12 right-4 md:right-8 z-[120] flex flex-col gap-3 pointer-events-auto items-end">
                {/* Extra Options */}
                <button 
                    onClick={handleRefresh}
                    className="w-10 h-10 bg-white text-gray-700 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.1)] flex items-center justify-center active:scale-95 transition-all"
                    title="Làm mới"
                >
                    <RefreshCw className={`w-5 h-5 ${isConnecting ? 'animate-spin text-blue-600' : ''}`} />
                </button>
                <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="w-10 h-10 bg-white text-gray-700 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.1)] flex items-center justify-center active:scale-95 transition-all"
                    title="Cài đặt / Bộ lọc"
                >
                    <Filter className="w-5 h-5" />
                </button>

                {/* Target / Locate Me */}
                <button 
                    onClick={handleCenter}
                    className="w-[42px] h-[42px] bg-white text-blue-600 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.1)] flex items-center justify-center active:scale-95 transition-all mt-1"
                    title="Vị trí của bạn"
                >
                    <LocateFixed className="w-5 h-5" />
                </button>

                {/* Zoom Controls */}
                <div className="flex flex-col bg-white rounded-[14px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] overflow-hidden mt-1">
                    <button 
                        onClick={() => scale.set(Math.min(scale.get() + 0.3, 3))}
                        className="w-[42px] h-11 text-gray-600 hover:bg-gray-50 flex items-center justify-center border-b border-gray-200 active:bg-gray-100 transition-colors"
                        title="Phóng to"
                    >
                        <Plus className="w-6 h-6 stroke-[2.5]" />
                    </button>
                    <button 
                        onClick={() => scale.set(Math.max(scale.get() - 0.3, 0.4))}
                        className="w-[42px] h-11 text-gray-600 hover:bg-gray-50 flex items-center justify-center active:bg-gray-100 transition-colors"
                        title="Thu nhỏ"
                    >
                        <Minus className="w-6 h-6 stroke-[2.5]" />
                    </button>
                </div>
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
                                            <div>
                                                <span className="text-gray-400 group-hover:text-white transition-colors">Visible on Map</span>
                                                <p className="text-[10px] text-gray-600 mt-0.5">{isVisibleOnMap ? 'Người khác có thể thấy bạn' : 'Bạn đang ẩn danh (Observer)'}</p>
                                            </div>
                                            <div className="relative inline-flex items-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer" 
                                                    checked={isVisibleOnMap}
                                                    onChange={(e) => {
                                                        const newVal = e.target.checked;
                                                        setIsVisibleOnMap(newVal);
                                                        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                                                            ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { visible: newVal } }));
                                                        }
                                                    }}
                                                />
                                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

            {/* Bottom Navigation */}
            <div className="absolute bottom-0 left-0 right-0 md:left-6 md:right-auto md:translate-x-0 md:w-[420px] h-[65px] bg-white border-t md:border-x border-gray-200 z-[160] flex justify-around items-center px-4 md:rounded-t-[32px] md:shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-all">
                <button className="flex flex-col items-center justify-center gap-1 text-blue-600 active:scale-95 transition-transform" onClick={() => setIsSheetExpanded(false)}>
                    <MapPin className="w-6 h-6 fill-blue-100" />
                    <span className="text-[10px] font-bold">Khám phá</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-gray-900 transition-colors active:scale-95">
                    <Bookmark className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Đã lưu</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-gray-900 transition-colors active:scale-95">
                    <PlusCircle className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Đóng góp</span>
                </button>
            </div>

            {/* Floating Tabs */}
            <div className={`absolute left-1/2 -translate-x-1/2 md:left-6 md:translate-x-0 md:w-[420px] md:justify-center z-[150] flex gap-2 pointer-events-auto transition-all duration-300 ${isSheetExpanded || selectedUser ? 'bottom-[80px] opacity-0 pointer-events-none scale-95' : 'bottom-[115px] opacity-100 scale-100'}`}>
                <button className="bg-blue-600 text-white px-5 py-3 rounded-full flex flex-col items-center justify-center shadow-lg active:scale-95 transition-transform" onClick={() => { panX.set(0); panY.set(0); scale.set(1.5); }}>
                    <Compass className="w-5 h-5 mb-0.5" />
                    <span className="text-[10px] font-bold tracking-tight uppercase">Gần bạn</span>
                </button>
                <button className="bg-white text-gray-700 px-5 py-3 rounded-full flex flex-col items-center justify-center shadow-lg active:scale-95 transition-transform">
                    <Heart className="w-5 h-5 mb-0.5" />
                    <span className="text-[10px] font-bold tracking-tight uppercase">Ưa thích</span>
                </button>
                <button className="bg-white text-gray-700 px-5 py-3 rounded-full flex flex-col items-center justify-center shadow-lg active:scale-95 transition-transform">
                    <Star className="w-5 h-5 mb-0.5" />
                    <span className="text-[10px] font-bold tracking-tight uppercase">Đề cử</span>
                </button>
            </div>

            {/* Smart Bottom Sheet */}
            <div className="absolute top-28 bottom-[65px] left-0 right-0 md:left-6 md:right-auto md:translate-x-0 md:w-[420px] overflow-hidden pointer-events-none z-[140]">
                <motion.div 
                    className="absolute top-0 left-0 right-0 h-full bg-white rounded-t-[32px] md:rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] md:shadow-[0_0_40px_rgba(0,0,0,0.1)] md:border md:border-gray-200 flex flex-col pointer-events-auto"
                    variants={{
                        expanded: { y: 0 },
                        collapsed: { y: 'calc(100% - 36px)' }
                    }}
                    initial="collapsed"
                    animate={isSheetExpanded || selectedUser ? "expanded" : "collapsed"}
                    transition={{ type: "spring", stiffness: 350, damping: 35 }}
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={0.05}
                    onDragEnd={(e, info) => {
                        const threshold = 100;
                        if (info.offset.y < -threshold) setIsSheetExpanded(true);
                        else if (info.offset.y > threshold) { setIsSheetExpanded(false); setSelectedUser(null); }
                    }}
                >
                    {/* Hover Area / Handle */}
                    <div className="w-full flex flex-col items-center pt-3 pb-4 cursor-grab active:cursor-grabbing shrink-0" onClick={() => setIsSheetExpanded(!isSheetExpanded)}>
                        <div className="w-12 h-[5px] bg-gray-300 rounded-full" />
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 pb-32 scrollbar-hide">
                        {selectedUser ? (
                            <div className="pt-2">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="w-20 h-20 bg-gray-100 rounded-[20px] overflow-hidden shrink-0 shadow-sm border border-gray-200">
                                        <img 
                                            src={selectedUser.isSelf 
                                                ? (user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(myDisplayName)}&background=3b82f6&color=fff&size=150&bold=true`) 
                                                : (normalizeImageUrl(selectedUser.avatar_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.username || 'U')}&background=3b82f6&color=fff&size=150&bold=true`)
                                            } 
                                            alt="Avatar" 
                                            className="w-full h-full object-cover" 
                                            onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.isSelf ? myDisplayName : (selectedUser.username || 'U'))}&background=3b82f6&color=fff&size=150&bold=true`; }}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0 pt-1">
                                        {selectedUser.isSelf ? (
                                            isEditingName ? (
                                                <div className="flex gap-2 mb-2">
                                                    <input 
                                                        autoFocus type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} 
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                setMyDisplayName(nameInput); setIsEditingName(false);
                                                                if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { displayName: nameInput } }));
                                                            }
                                                        }}
                                                        className="bg-gray-100 border border-blue-500 rounded-lg px-2 py-1 text-sm font-bold text-gray-900 w-full outline-none focus:border-blue-500 transition-colors"
                                                    />
                                                    <button onClick={() => { setMyDisplayName(nameInput); setIsEditingName(false); if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { displayName: nameInput } })); }} className="bg-blue-600 hover:bg-blue-500 text-white px-3 rounded-lg text-xs font-bold transition-colors">Lưu</button>
                                                </div>
                                            ) : (
                                                <div className="group/name inline-flex items-center gap-2 mb-1 cursor-pointer" onClick={() => { setNameInput(myDisplayName); setIsEditingName(true); }}>
                                                    <h3 className="text-2xl font-black text-gray-900 truncate tracking-tight">{myDisplayName}</h3>
                                                </div>
                                            )
                                        ) : (
                                            <h3 className="text-2xl font-black text-gray-900 truncate tracking-tight mb-1">{selectedUser.username || 'Mysterious User'}</h3>
                                        )}
                                        {selectedUser.isSelf ? (
                                            isEditingStatus ? (
                                                <div className="flex gap-2 mt-1">
                                                    <input autoFocus type="text" value={statusInput} onChange={(e) => setStatusInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setMyStatus(statusInput); setIsEditingStatus(false); if (ws.current?.readyState === WebSocket.OPEN && myObfPos) ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { status: statusInput } })); } }} className="bg-gray-100 border border-blue-500 rounded-lg px-2 py-1.5 text-xs text-gray-900 w-full outline-none focus:border-blue-500 transition-colors" />
                                                    <button onClick={() => { setMyStatus(statusInput); setIsEditingStatus(false); if (ws.current?.readyState === WebSocket.OPEN && myObfPos) ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { status: statusInput } })); }} className="bg-blue-600 hover:bg-blue-500 text-white px-3 rounded-lg text-xs font-bold transition-colors">Lưu</button>
                                                </div>
                                            ) : (
                                                <div className="group/status inline-flex items-center gap-2 cursor-pointer" onClick={() => { setStatusInput(myStatus); setIsEditingStatus(true); }}>
                                                    <p className="text-gray-500 text-[13px] truncate">{myStatus || "Nhấp để thêm trạng thái..."}</p>
                                                </div>
                                            )
                                        ) : (
                                            <p className="text-gray-500 text-[13px] truncate">{selectedUser.status || "Exploring the digital universe"}</p>
                                        )}
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                            {(selectedUser.isSelf ? myStatus.split(' ').filter(w => w.startsWith('#')).map(w => w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9#]/g, '')) : (selectedUser.tags || ['#GAMER', '#ALIN'])).map((tag: string) => (
                                                <span key={tag} className="text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">
                                                    {tag.toUpperCase()}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pb-8">
                                    {selectedUser?.isSelf ? (
                                        <button onClick={() => { setSelectedUser(null); setIsSheetExpanded(false); }} className="col-span-2 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 py-4 rounded-[20px] font-bold transition-all active:scale-95 shadow-sm">
                                            <X className="w-5 h-5" /> Đóng hồ sơ
                                        </button>
                                    ) : (
                                        <>
                                            {!sentFriendRequests.includes(selectedUser.id) && (
                                                <button onClick={handleAddFriend} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-[20px] font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
                                                    <UserPlus className="w-5 h-5" /> Kết bạn
                                                </button>
                                            )}
                                            <div className={`flex gap-3 ${sentFriendRequests.includes(selectedUser.id) ? 'col-span-2' : ''}`}>
                                                <button onClick={handleMessage} className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 py-4 rounded-[20px] font-bold active:scale-95 transition-all shadow-sm">
                                                    <MessageCircle className="w-5 h-5" /> Nhắn tin
                                                </button>
                                                <button onClick={() => { const pxX = (selectedUser.lng - (myObfPos?.lng || 0)) * DEGREES_TO_PX; const pxY = -(selectedUser.lat - (myObfPos?.lat || 0)) * DEGREES_TO_PX; panX.set(-pxX); panY.set(-pxY); scale.set(2); }} className="px-5 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-blue-600 rounded-[20px] active:scale-95 transition-all shadow-sm">
                                                    <MapPin className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="pt-2">
                                <div className="flex justify-between items-center mb-5">
                                    <h2 className="text-[22px] font-black text-gray-900 tracking-tight">Nổi bật trong khu vực</h2>
                                    <div className="bg-gray-100 rounded-full px-3 py-1 flex items-center gap-1.5 shrink-0">
                                        <CloudSun className="w-4 h-4 text-gray-500" />
                                        <span className="text-[11px] font-bold text-gray-700">28°</span>
                                    </div>
                                </div>
                                <div className="flex overflow-x-auto gap-4 pb-8 snap-x snap-mandatory scrollbar-hide -mx-5 px-5">
                                    {(games && games.length > 0 ? games : [1,2,3]).slice(0, 5).map((game: any, idx: number) => {
                                        const isPlaceholder = typeof game === 'number';
                                        return (
                                            <div key={isPlaceholder ? idx : game.id} className="snap-start shrink-0 w-64 bg-[#eef5fa] rounded-3xl overflow-hidden border border-[#d6eaf3] flex flex-col active:scale-[0.98] transition-transform cursor-pointer">
                                                <div className="p-4 pb-3">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h3 className="font-bold text-gray-900 text-[15px] leading-tight line-clamp-2">{isPlaceholder ? 'Khám phá thế giới trò chơi mượt mà...' : game.title}</h3>
                                                        <Diamond className="w-5 h-5 text-blue-500 shrink-0 fill-blue-50 mt-0.5" />
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500 mt-2">
                                                        <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                                                        <span>Alin Maps • {isPlaceholder ? 'Sắp ra mắt' : (game.mode || 'Nhiều người chơi')}</span>
                                                    </div>
                                                </div>
                                                <div className="p-2 pt-0 flex-1 flex flex-col justify-end">
                                                    <div className="w-full aspect-[4/3] bg-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                        {!isPlaceholder && (
                                                            <img 
                                                                src={normalizeImageUrl(game.image || '')} 
                                                                alt={game.title} 
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                            />
                                                        )}
                                                        {isPlaceholder && <div className="w-full h-full bg-gradient-to-br from-blue-100 to-gray-200" />}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default AlinMap;
