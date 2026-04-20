import React, { useState, useEffect, useCallback, useRef } from 'react';
import { normalizeImageUrl, getBaseUrl } from '../services/externalApi';
import { Search, MapPin, Navigation, X, UserPlus, MessageCircle, Filter, ChevronUp, RefreshCw, ZoomIn, ZoomOut, Heart, Star, Bookmark, PlusCircle, CloudSun, Diamond, Compass, LocateFixed, Plus, Minus, Edit } from 'lucide-react';
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

            {/* Gallery Billboard */}
            {user.gallery?.active && (
                <motion.div
                    initial={{ y: 0, opacity: 0 }}
                    animate={{ y: [0, -5, 0], opacity: 1 }}
                    transition={{
                        y: { repeat: Infinity, duration: 3, ease: "easeInOut" },
                        opacity: { duration: 0.5 }
                    }}
                    className="absolute -top-24 left-1/2 -translate-x-1/2 w-32 bg-blue-600/20 backdrop-blur-lg border border-blue-400/30 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.4)] pointer-events-none group-hover:scale-110 transition-transform"
                >
                    <div className="bg-blue-500/40 px-2 py-1 border-b border-blue-400/20">
                        <p className="text-[9px] font-black text-white truncate text-center uppercase tracking-wider">
                            {user.gallery.title || 'ADVERTISEMENT'}
                        </p>
                    </div>
                    {user.gallery.images?.[0] ? (
                        <div className="w-full aspect-video bg-black/40">
                            <img
                                src={normalizeImageUrl(user.gallery.images[0])}
                                className="w-full h-full object-cover opacity-80"
                                alt="Ads"
                            />
                        </div>
                    ) : (
                        <div className="w-full h-12 flex items-center justify-center bg-blue-900/20">
                            <Diamond className="w-4 h-4 text-blue-400 animate-pulse" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-transparent mix-blend-overlay" />
                    {/* Glowing scanning line effect */}
                    <motion.div
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-[1px] bg-blue-300/60 shadow-[0_0_10px_#60a5fa] z-10"
                    />
                </motion.div>
            )}
        </motion.div>
    );
};



interface AlinMapProps {
    user: any;
    onClose: () => void;
    externalApi: any;
    games: any[];
    friends?: any[];
    onOpenChat?: (id: string, name: string) => void;
}

const AlinMap: React.FC<AlinMapProps> = ({ user, onClose, externalApi, games, friends = [], onOpenChat }) => {
    const API_BASE = getBaseUrl();
    const [position, setPosition] = useState<[number, number] | null>(null);
    const [myObfPos, setMyObfPos] = useState<{ lat: number, lng: number } | null>(null);
    const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'gallery'>('info');
    const [mainTab, setMainTab] = useState<'discover' | 'nearby' | 'friends'>('discover');
    const [userGames, setUserGames] = useState<any[]>([]);
    const [searchTag, setSearchTag] = useState('');
    const [radius, setRadius] = useState(5);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isConsentOpen, setIsConsentOpen] = useState(() => !localStorage.getItem('alin_location_consent_handled'));
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

    // Gallery state
    const [galleryTitle, setGalleryTitle] = useState('');
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    const [galleryActive, setGalleryActive] = useState(false);
    const [galleryLinks, setGalleryLinks] = useState<any[]>([]);
    const [isSavingGallery, setIsSavingGallery] = useState(false);

    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<any>(null);
    const isMounted = useRef(true);
    const selfDragX = useMotionValue(0);
    const selfDragY = useMotionValue(0);
    const [isSheetExpanded, setIsSheetExpanded] = useState(false);
    const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth >= 768);

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
        localStorage.setItem('alin_location_consent_handled', 'true');
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setPosition([latitude, longitude]);
                    setIsConsentOpen(false);
                },
                (err) => {
                    console.error("Geolocation error:", err);
                    // Fallback to HCM City
                    setPosition([10.762622, 106.660172]);
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
                    visible: isVisibleOnMap,
                    avatar_url: user?.photoURL || ''
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
                if (p.status) {
                    setMyStatus(p.status);
                    setStatusInput(p.status);
                }
                if (p.gallery) {
                    setGalleryTitle(p.gallery.title || '');
                    setGalleryImages(p.gallery.images || []);
                    setGalleryActive(p.gallery.active || false);
                    setGalleryLinks(p.gallery.links || []);
                }
                // Auto scan immediately
                socket.send(JSON.stringify({
                    type: 'MAP_MOVE',
                    payload: { lat: p.lat, lng: p.lng, zoom: 13 }
                }));
                addLog(`🔍 Sent MAP_MOVE scan`);
            }
            if (data.type === 'NEARBY_USERS') {
                const users = data.payload.map((u: any) => ({
                    ...u,
                    isSelf: u.id === myUserId
                }));

                // Filter out self from map to avoid duplicate avatar at center 
                // (though SpatialNode handles it, filtering here is cleaner)
                let filtered = users.filter((u: any) => !u.isSelf);

                if (searchTag.trim()) {
                    const tag = searchTag.toLowerCase().replace('#', '');
                    filtered = filtered.filter((u: any) =>
                        (u.gallery?.title && u.gallery.title.toLowerCase().includes(tag)) ||
                        (u.username && u.username.toLowerCase().includes(tag)) ||
                        (u.status && u.status.toLowerCase().includes(tag))
                    );
                }

                setNearbyUsers(filtered);

                // Update selectedUser if they are in the nearby list to get latest gallery data
                if (selectedUser && !selectedUser.isSelf) {
                    const updated = users.find(u => u.id === selectedUser.id);
                    if (updated) setSelectedUser(updated);
                }
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
            alert(`Friend request sent to ${selectedUser.username || selectedUser.id}!`);
        } catch (err: any) {
            if (err.message.includes('409') || err.message.toLowerCase().includes('already')) {
                alert("Request already sent or you are already friends!");
            } else {
                alert(err.message || "Failed to send friend request.");
            }
        }
    };

    const handleMessage = () => {
        if (!selectedUser || !onOpenChat) return;
        onOpenChat(selectedUser.id, selectedUser.username || 'User');
    };

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Validation
        const validFiles = files.filter(f => f.size <= 1024 * 1024); // 1MB
        if (validFiles.length < files.length) {
            alert("Some files were skipped (limit 1MB per file).");
        }
        if (validFiles.length === 0) return;

        const formData = new FormData();
        validFiles.forEach(f => formData.append('images', f));

        const deviceId = externalApi.getDeviceId();

        try {
            const resp = await fetch(`${API_BASE}/api/user/gallery`, {
                method: 'POST',
                headers: { 'X-Device-Id': deviceId },
                body: formData
            });
            const data = await resp.json();
            if (data.success) {
                setGalleryImages(data.gallery.images);
                // Also update session in WS
                ws.current?.send(JSON.stringify({ type: 'UPDATE_GALLERY' }));
            } else {
                alert(data.error || "Upload failed");
            }
        } catch (err) {
            console.error("Gallery upload error:", err);
        }
    };

    const saveGallerySettings = async (updates: any) => {
        setIsSavingGallery(true);
        const deviceId = externalApi.getDeviceId();
        const formData = new FormData();

        if (updates.title !== undefined) formData.append('title', updates.title);
        if (updates.active !== undefined) formData.append('active', updates.active);
        if (updates.links !== undefined) formData.append('links', JSON.stringify(updates.links));

        // Indicate which images to keep
        formData.append('keepImages', JSON.stringify(galleryImages));

        try {
            const resp = await fetch(`${API_BASE}/api/user/gallery`, {
                method: 'POST',
                headers: { 'X-Device-Id': deviceId },
                body: formData
            });
            const data = await resp.json();
            if (data.success) {
                setGalleryActive(data.gallery.active);
                setGalleryTitle(data.gallery.title);
                // Refresh Billboard
                ws.current?.send(JSON.stringify({ type: 'UPDATE_GALLERY' }));
            }
        } catch (err) {
            console.error("Save gallery failed", err);
        } finally {
            setIsSavingGallery(false);
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

    // Sync avatar/displayName to alin_social WS whenever user data changes
    useEffect(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN && user) {
            ws.current.send(JSON.stringify({
                type: 'UPDATE_PROFILE',
                payload: {
                    avatar_url: user.photoURL || '',
                    displayName: user.displayName || myDisplayName
                }
            }));
        }
    }, [user?.photoURL, user?.displayName]);

    return (
        <div className="fixed inset-0 z-[100] bg-[#13151a] flex flex-col">
            {/* Header / Search Bar (Mobile First & Sticky Header on PC) */}
            <div className={`absolute top-12 left-4 right-4 z-[180] flex gap-2 transition-all duration-300 ${isDesktop && isSheetExpanded ? 'md:top-0 md:left-[72px] md:w-[400px] md:bg-white md:pt-5 md:pb-2 md:px-4' : 'md:left-[88px] md:top-6 md:w-[384px]'}`}>
                <div className={`flex-1 backdrop-blur-xl rounded-full flex items-center px-4 py-3 overflow-hidden transition-all duration-300 ${isDesktop && isSheetExpanded ? 'bg-white border border-gray-200 shadow-none' : 'bg-white/90 shadow-[0_4px_20px_rgba(0,0,0,0.15)]'}`}>
                    <Search className="w-5 h-5 text-gray-500 mr-2 shrink-0" />
                    <input
                        type="text"
                        placeholder="Search..."
                        onFocus={() => setIsSheetExpanded(true)}
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
                    <button onClick={() => { setSelectedUser({ id: myUserId, isSelf: true, username: myDisplayName, status: myStatus }); setIsSheetExpanded(true); }} className="ml-3 shrink-0 active:scale-95 transition-transform overflow-hidden rounded-full border-2 border-blue-500 shadow-sm">
                        <img
                            src={normalizeImageUrl(user?.photoURL) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || myDisplayName)}&background=3b82f6&color=fff&size=100&bold=true`}
                            alt="Me"
                            className="w-7 h-7 object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || myDisplayName)}&background=3b82f6&color=fff&size=100&bold=true`; }}
                        />
                    </button>
                </div>
            </div>

            {/* Desktop Sticky Header Tabs */}
            <div className={`hidden md:flex absolute z-[170] transition-all duration-300 top-[80px] left-[72px] w-[400px] bg-white border-b border-gray-200 px-4 pt-4 gap-6 pointer-events-auto ${!isSheetExpanded ? 'opacity-0 pointer-events-none -translate-x-4' : 'opacity-100'}`}>
                <button className="text-blue-600 border-b-2 border-blue-600 pb-3 px-1 font-bold text-[13px] tracking-tight">List</button>
                <button className="text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 pb-3 px-1 font-medium text-[13px] tracking-tight">Labeled</button>
                <button className="text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 pb-3 px-1 font-medium text-[13px] tracking-tight">Map</button>
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
                                    onClick={() => { localStorage.setItem('alin_location_consent_handled', 'true'); setIsVisibleOnMap(false); setPosition([10.762, 106.660]); setIsConsentOpen(false); }}
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
                                className="absolute w-16 h-16 -ml-8 -mt-16 group pointer-events-auto z-[100] cursor-grab active:cursor-grabbing select-none"
                                style={{ top: '50%', left: '50%', x: selfDragX, y: selfDragY }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {/* Pulse Effect Ripple */}
                                <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping shadow-[0_0_20px_rgba(59,130,246,0.6)]" />
                                
                                <div className={`w-full h-full rounded-full border-[3px] overflow-hidden bg-[#1a1d24] relative z-10 transition-all shadow-[0_0_30px_rgba(59,130,246,0.9)] ${isVisibleOnMap ? 'border-blue-400' : 'border-emerald-500 opacity-60'}`}>
                                    <img
                                        src={normalizeImageUrl(user?.photoURL) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || myDisplayName)}&background=1a1d24&color=3b82f6&size=150&bold=true`}
                                        className="w-full h-full object-cover pointer-events-none"
                                        draggable={false}
                                        onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || myDisplayName)}&background=1a1d24&color=3b82f6&size=150&bold=true`; }}
                                    />
                                    {!isVisibleOnMap && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <div className="w-5 h-5 border-2 border-emerald-400/40 border-dashed rounded-full animate-spin-slow" />
                                        </div>
                                    )}
                                </div>
                                
                                {/* Self Label */}
                                <div className={`absolute top-[-35px] left-1/2 -translate-x-1/2 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-black whitespace-nowrap text-white border-2 border-white/20 shadow-lg ${isVisibleOnMap ? 'bg-blue-600/90' : 'bg-emerald-600/90'}`}>
                                    {isVisibleOnMap ? 'YOU' : 'GHOST MODE'}
                                    {currentProvince && <span className="ml-1 opacity-70 text-[9px]">| {currentProvince}</span>}
                                </div>

                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[8px] text-gray-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isVisibleOnMap ? 'Click to view | Drag to move' : 'You are invisible | Drag to move'}
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
                            {nearbyUsers.filter(u => u.id !== myUserId && u.id !== user?.uid).map(u => (
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
            </div>

            {/* Floating Controls (Map Tools) */}
            <div className="absolute bottom-[200px] md:bottom-12 right-4 md:right-8 z-[120] flex flex-col gap-3 pointer-events-auto items-end">
                <button
                    onClick={handleRefresh}
                    className="w-10 h-10 bg-white text-gray-700 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.1)] flex items-center justify-center active:scale-95 transition-all"
                    title="Refresh"
                >
                    <RefreshCw className={`w-5 h-5 ${isConnecting ? 'animate-spin text-blue-600' : ''}`} />
                </button>
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="w-10 h-10 bg-white text-gray-700 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.1)] flex items-center justify-center active:scale-95 transition-all"
                    title="Settings / Filters"
                >
                    <Filter className="w-5 h-5" />
                </button>
                <button
                    onClick={handleCenter}
                    className="w-[42px] h-[42px] bg-white text-blue-600 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.1)] flex items-center justify-center active:scale-95 transition-all mt-1"
                    title="Your Position"
                >
                    <LocateFixed className="w-5 h-5" />
                </button>
                <div className="flex flex-col bg-white rounded-[14px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] overflow-hidden mt-1">
                    <button
                        onClick={() => scale.set(Math.min(scale.get() + 0.3, 3))}
                        className="w-[42px] h-11 text-gray-600 hover:bg-gray-50 flex items-center justify-center border-b border-gray-200 active:bg-gray-100 transition-colors"
                        title="Zoom In"
                    >
                        <Plus className="w-6 h-6 stroke-[2.5]" />
                    </button>
                    <button
                        onClick={() => scale.set(Math.max(scale.get() - 0.3, 0.4))}
                        className="w-[42px] h-11 text-gray-600 hover:bg-gray-50 flex items-center justify-center active:bg-gray-100 transition-colors"
                        title="Zoom Out"
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
                                            <p className="text-[10px] text-gray-600 mt-0.5">{isVisibleOnMap ? 'Others can see you' : 'You are invisible (Observer)'}</p>
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

            {/* Global Left Navigation (PC Only) */}
            <div className="hidden md:flex absolute top-0 left-0 bottom-0 w-[72px] bg-white border-r border-gray-100 flex-col items-center py-8 z-[150] shadow-[4px_0_24px_rgba(0,0,0,0.05)]">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-10 shadow-lg shadow-blue-600/20">
                    <Compass className="w-7 h-7 text-white" />
                </div>

                <div className="flex flex-col gap-6">
                    <button onClick={() => { setSelectedUser(null); setMainTab('discover'); setIsSheetExpanded(true); }} className="w-12 h-12 flex flex-col items-center justify-center gap-1 group transition-all">
                        <Navigation className={`w-6 h-6 ${mainTab === 'discover' && !selectedUser ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className={`text-[9px] font-bold ${mainTab === 'discover' && !selectedUser ? 'text-blue-600' : 'text-gray-400'}`}>Explore</span>
                    </button>
                    <button onClick={() => { setSelectedUser(null); setMainTab('nearby'); setIsSheetExpanded(true); }} className="w-12 h-12 flex flex-col items-center justify-center gap-1 group transition-all">
                        <Compass className={`w-6 h-6 ${mainTab === 'nearby' && !selectedUser ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className={`text-[9px] font-bold ${mainTab === 'nearby' && !selectedUser ? 'text-blue-600' : 'text-gray-400'}`}>Nearby</span>
                    </button>
                    <button onClick={() => { setSelectedUser(null); setMainTab('friends'); setIsSheetExpanded(true); }} className="w-12 h-12 flex flex-col items-center justify-center gap-1 group transition-all">
                        <UserPlus className={`w-6 h-6 ${mainTab === 'friends' && !selectedUser ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className={`text-[9px] font-bold ${mainTab === 'friends' && !selectedUser ? 'text-blue-600' : 'text-gray-400'}`}>Friends</span>
                    </button>
                </div>

                <div className="mt-auto flex flex-col gap-6">
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="flex md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex-row items-center justify-around py-2 z-[200] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] pointer-events-auto">
                <button onClick={() => { setSelectedUser(null); setMainTab('discover'); setIsSheetExpanded(false); }} className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 ${mainTab === 'discover' && !selectedUser ? 'text-blue-600' : 'text-gray-400'}`}>
                    <Navigation className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase">Explore</span>
                </button>
                <button onClick={() => { setSelectedUser(null); setMainTab('nearby'); setIsSheetExpanded(true); }} className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 ${mainTab === 'nearby' && !selectedUser ? 'text-blue-600' : 'text-gray-400'}`}>
                    <Compass className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase">Nearby</span>
                </button>
                <button onClick={() => { setSelectedUser(null); setMainTab('friends'); setIsSheetExpanded(true); }} className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 ${mainTab === 'friends' && !selectedUser ? 'text-blue-600' : 'text-gray-400'}`}>
                    <UserPlus className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase">Friends</span>
                </button>
                <button onClick={onClose} className="flex-1 flex flex-col items-center justify-center gap-1 py-1 text-gray-400 hover:text-red-500">
                    <X className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase">Close</span>
                </button>
            </div>

            {/* Smart Bottom Sheet / PC Sidebar */}
            <div className={`absolute left-0 right-0 md:left-[72px] md:right-auto md:translate-x-0 md:w-[400px] pointer-events-none z-[140] ${isDesktop ? 'top-0 bottom-0 overflow-visible' : 'top-20 bottom-[60px] overflow-hidden'}`}>
                <motion.div
                    className="absolute top-0 left-0 right-0 h-full bg-white rounded-t-[32px] md:rounded-none shadow-[0_-10px_40px_rgba(0,0,0,0.15)] md:shadow-[4px_0_24px_rgba(0,0,0,0.1)] md:border-r md:border-gray-200 flex flex-col pointer-events-auto"
                    variants={{
                        expanded: { y: 0, x: 0 },
                        collapsed: {
                            y: isDesktop ? 0 : 'calc(100% - 36px)',
                            x: isDesktop ? '-120%' : 0
                        }
                    }}
                    initial="collapsed"
                    animate={isSheetExpanded || selectedUser ? "expanded" : "collapsed"}
                    transition={{ type: "spring", stiffness: 350, damping: 35 }}
                    drag={isDesktop ? false : "y"}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={0.05}
                    onDragEnd={(e, info) => {
                        if (isDesktop) return;
                        const threshold = 100;
                        if (info.offset.y < -threshold) setIsSheetExpanded(true);
                        else if (info.offset.y > threshold) { setIsSheetExpanded(false); setSelectedUser(null); }
                    }}
                >
                    {/* Header Part (Search & Handle) */}
                    <div className="bg-white/80 backdrop-blur-md sticky top-0 z-[110] shrink-0">
                        {/* Hover Area / Handle (Mobile Only) */}
                        <div className="w-full flex md:hidden flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing" onClick={() => setIsSheetExpanded(!isSheetExpanded)}>
                            <div className="w-12 h-[5px] bg-gray-300 rounded-full" />
                        </div>

                        <div className="px-5 pt-4 md:pt-10 pb-4">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    className="w-full bg-gray-100 hover:bg-gray-200/70 focus:bg-white border-none rounded-2xl pl-11 pr-4 py-3.5 text-[13px] font-medium transition-all outline-none focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="Search users, billboards, tags..."
                                    value={searchTag}
                                    onChange={(e) => setSearchTag(e.target.value)}
                                />
                                {searchTag && (
                                    <button onClick={() => setSearchTag('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 pb-32 md:pb-6 md:pt-[20px] scrollbar-hide relative z-[100]">
                        {selectedUser ? (
                            <div className="pt-2">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="w-20 h-20 bg-gray-100 rounded-[20px] overflow-hidden shrink-0 shadow-sm border border-gray-200 relative group/avatar cursor-pointer" onClick={() => selectedUser.isSelf && alert("Chức năng đổi ảnh đại diện sẽ sớm ra mắt!")}>
                                        <img
                                            src={selectedUser.isSelf
                                                ? (normalizeImageUrl(user?.photoURL) || `https://ui-avatars.com/api/?name=${encodeURIComponent(myDisplayName)}&background=3b82f6&color=fff&size=150&bold=true`)
                                                : (normalizeImageUrl(selectedUser.avatar_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.username || 'U')}&background=3b82f6&color=fff&size=150&bold=true`)
                                            }
                                            alt="Avatar"
                                            className="w-full h-full object-cover transition-transform group-hover/avatar:scale-110"
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
                                                    <button onClick={() => { setMyDisplayName(nameInput); setIsEditingName(false); if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { displayName: nameInput } })); }} className="bg-blue-600 hover:bg-blue-500 text-white px-3 rounded-lg text-xs font-bold transition-colors">Save</button>
                                                </div>
                                            ) : (
                                                <div className="group/name inline-flex items-center gap-2 mb-1 cursor-pointer" onClick={() => { setNameInput(myDisplayName); setIsEditingName(true); }}>
                                                    <h3 className="text-2xl font-black text-gray-900 truncate tracking-tight">{myDisplayName}</h3>
                                                    <Edit className="w-4 h-4 text-blue-500 opacity-40 group-hover/name:opacity-100 transition-opacity" />
                                                </div>
                                            )
                                        ) : (
                                            <h3 className="text-2xl font-black text-gray-900 truncate tracking-tight mb-1">{selectedUser.username || 'Mysterious User'}</h3>
                                        )}
                                    </div>
                                </div>

                                {/* Tab Toggle */}
                                <div className="flex bg-gray-100 p-1 rounded-2xl mb-6">
                                    <button
                                        onClick={() => setActiveTab('info')}
                                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'info' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                    >
                                        Information
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('gallery')}
                                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'gallery' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                    >
                                        Gallery {selectedUser.gallery?.active && <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full ml-1 animate-pulse" />}
                                    </button>
                                </div>

                                {activeTab === 'info' ? (
                                    <>
                                        {selectedUser.isSelf ? (
                                            isEditingStatus ? (
                                                <div className="bg-gray-100/80 p-3 rounded-xl mt-2 border border-gray-200 shadow-inner">
                                                    <div className="flex gap-2">
                                                        <input
                                                            autoFocus type="text" value={statusInput}
                                                            onChange={(e) => setStatusInput(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    setMyStatus(statusInput);
                                                                    setIsEditingStatus(false);
                                                                    if (ws.current?.readyState === WebSocket.OPEN && myObfPos) ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { status: statusInput } }));
                                                                }
                                                            }}
                                                            placeholder="Update your status..."
                                                            className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 w-full outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                setMyStatus(statusInput);
                                                                setIsEditingStatus(false);
                                                                if (ws.current?.readyState === WebSocket.OPEN && myObfPos) ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { status: statusInput } }));
                                                            }}
                                                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                                                        >
                                                            Save
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="group/status inline-flex items-center gap-2 cursor-pointer mb-2" onClick={() => { setStatusInput(myStatus); setIsEditingStatus(true); }}>
                                                    <p className="text-gray-500 text-[13px] truncate">{myStatus || "Tap to add status..."}</p>
                                                    <Edit className="w-3.5 h-3.5 text-gray-400 opacity-40 group-hover/status:opacity-100 transition-opacity" />
                                                </div>
                                            )
                                        ) : (
                                            <p className="text-gray-500 text-[13px] truncate mb-2">{selectedUser.status || "Exploring the digital universe"}</p>
                                        )}
                                        <div className="flex flex-wrap gap-1.5 mt-3 mb-6">
                                            {(selectedUser.isSelf ? myStatus.split(' ').filter(w => w.startsWith('#')).map(w => w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9#]/g, '')) : (selectedUser.tags || ['#GAMER', '#ALIN'])).map((tag: string) => (
                                                <span key={tag} className="text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">
                                                    {tag.toUpperCase()}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pb-8">
                                            {selectedUser?.isSelf ? (
                                                <button onClick={() => { setSelectedUser(null); setIsSheetExpanded(false); }} className="col-span-2 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 py-4 rounded-[20px] font-bold transition-all active:scale-95 shadow-sm">
                                                    <X className="w-5 h-5" /> Close Profile
                                                </button>
                                            ) : (
                                                <>
                                                    {!sentFriendRequests.includes(selectedUser.id) && !friends.some(f => f.id === selectedUser.id) && (
                                                        <button onClick={handleAddFriend} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-[20px] font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
                                                            <UserPlus className="w-5 h-5" /> Add Friend
                                                        </button>
                                                    )}
                                                    <div className={`flex gap-3 ${sentFriendRequests.includes(selectedUser.id) || friends.some(f => f.id === selectedUser.id) ? 'col-span-2' : ''}`}>
                                                        <button onClick={handleMessage} className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 py-4 rounded-[20px] font-bold active:scale-95 transition-all shadow-sm">
                                                            <MessageCircle className="w-5 h-5" /> Message
                                                        </button>
                                                        <button onClick={() => { const pxX = (selectedUser.lng - (myObfPos?.lng || 0)) * DEGREES_TO_PX; const pxY = -(selectedUser.lat - (myObfPos?.lat || 0)) * DEGREES_TO_PX; panX.set(-pxX); panY.set(-pxY); scale.set(2); }} className="px-5 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-blue-600 rounded-[20px] active:scale-95 transition-all shadow-sm">
                                                            <MapPin className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="pb-8">
                                        {selectedUser.isSelf ? (
                                            <div className="space-y-5">
                                                <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <label className="text-[13px] font-bold text-gray-900">Active Billboard</label>
                                                        <button
                                                            onClick={() => saveGallerySettings({ active: !galleryActive })}
                                                            className={`w-12 h-6 rounded-full transition-colors relative ${galleryActive ? 'bg-blue-500' : 'bg-gray-300'}`}
                                                        >
                                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${galleryActive ? 'left-7' : 'left-1'}`} />
                                                        </button>
                                                    </div>
                                                    <p className="text-[11px] text-gray-500">Toggle this to show your advertisement board above your avatar on the map.</p>
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-[13px] font-bold text-gray-900 block mb-2">Headline</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Example: My cool puzzle game..."
                                                            value={galleryTitle}
                                                            onChange={(e) => setGalleryTitle(e.target.value.substring(0, 50))}
                                                            onBlur={() => saveGallerySettings({ title: galleryTitle })}
                                                            className="w-full bg-gray-100 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20"
                                                        />
                                                        <p className="text-[10px] text-right text-gray-400 mt-1">{galleryTitle.length}/50</p>
                                                    </div>

                                                    <div>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <label className="text-[13px] font-bold text-gray-900">Promotional Images</label>
                                                            <span className="text-[11px] text-gray-400">{galleryImages.length}/5</span>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {galleryImages.map((img, idx) => (
                                                                <div key={idx} className="aspect-square rounded-xl overflow-hidden relative group">
                                                                    <img src={normalizeImageUrl(img)} className="w-full h-full object-cover" alt="Ad" />
                                                                    <button
                                                                        onClick={() => {
                                                                            const newImgs = galleryImages.filter((_, i) => i !== idx);
                                                                            setGalleryImages(newImgs);
                                                                            saveGallerySettings({ images: newImgs });
                                                                        }}
                                                                        className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            {galleryImages.length < 5 && (
                                                                <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors">
                                                                    <Plus className="w-6 h-6 text-gray-300" />
                                                                    <input type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={handleGalleryUpload} />
                                                                </label>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-gray-400 mt-2">Max 1MB per image (.jpg, .png, .webp)</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {selectedUser.gallery?.active ? (
                                                    <>
                                                        <div className="flex items-center gap-3">
                                                            <Diamond className="w-5 h-5 text-blue-500" />
                                                            <h3 className="text-xl font-black text-gray-900">{selectedUser.gallery.title || 'Special Offer'}</h3>
                                                        </div>

                                                        {selectedUser.gallery.images?.length > 0 && (
                                                            <div className="flex overflow-x-auto gap-3 pb-2 -mx-5 px-5 scrollbar-hide snap-x">
                                                                {selectedUser.gallery.images.map((img: string, idx: number) => (
                                                                    <div key={idx} className="snap-start shrink-0 w-72 aspect-[16/10] bg-gray-100 rounded-3xl overflow-hidden shadow-sm">
                                                                        <img src={normalizeImageUrl(img)} className="w-full h-full object-cover" alt="Ad Content" />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div className="bg-gray-100 p-6 rounded-[32px]">
                                                            <p className="text-gray-600 text-sm leading-relaxed mb-6">
                                                                Visit my creative space and discover more exciting projects and games!
                                                            </p>
                                                            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-blue-600/20">
                                                                Explore Projects
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                            <Diamond className="w-8 h-8 text-gray-200" />
                                                        </div>
                                                        <p className="text-gray-400 text-sm">Gallery is currently offline</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="pt-2">
                                {mainTab === 'discover' && (
                                    <>
                                        <div className="flex justify-between items-center mb-5">
                                            <h2 className="text-[22px] font-black text-gray-900 tracking-tight">Featured Games</h2>
                                            <div className="bg-gray-100 rounded-full px-3 py-1 flex items-center gap-1.5 shrink-0">
                                                <CloudSun className="w-4 h-4 text-gray-500" />
                                                <span className="text-[11px] font-bold text-gray-700">28°</span>
                                            </div>
                                        </div>
                                        <div className="flex overflow-x-auto gap-4 pb-8 snap-x snap-mandatory scrollbar-hide -mx-5 px-5">
                                            {(games && games.length > 0 ? games : [1, 2, 3]).slice(0, 5).map((game: any, idx: number) => {
                                                const isPlaceholder = typeof game === 'number';
                                                return (
                                                    <div key={isPlaceholder ? idx : game.id} className="snap-start shrink-0 w-64 bg-[#eef5fa] rounded-3xl overflow-hidden border border-[#d6eaf3] flex flex-col active:scale-[0.98] transition-transform cursor-pointer">
                                                        <div className="p-4 pb-3">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <h3 className="font-bold text-gray-900 text-[15px] leading-tight line-clamp-2">{isPlaceholder ? 'Explore a world of smooth gaming...' : game.title}</h3>
                                                                <Diamond className="w-5 h-5 text-blue-500 shrink-0 fill-blue-50 mt-0.5" />
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500 mt-2">
                                                                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                                                                <span>Alin Maps • {isPlaceholder ? 'Coming Soon' : (game.mode || 'Multiplayer')}</span>
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

                                        <div className="mt-4 space-y-4">
                                            <div className="flex justify-between items-center px-1">
                                                <h3 className="text-lg font-black text-gray-900">Active Residents</h3>
                                                <button onClick={() => setMainTab('nearby')} className="text-[11px] font-bold text-blue-600 hover:underline">View All</button>
                                            </div>
                                            <div className="divide-y divide-gray-50">
                                                {nearbyUsers.slice(0, 4).map(u => (
                                                    <div
                                                        key={u.id}
                                                        onClick={() => setSelectedUser(u)}
                                                        className="flex items-center gap-3 py-3 hover:bg-gray-50 rounded-2xl px-2 transition-colors cursor-pointer group"
                                                    >
                                                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 shrink-0 relative">
                                                            <img src={normalizeImageUrl(u.avatar_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || 'U')}`} className="w-full h-full object-cover" alt={u.username} onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || 'U')}&background=3b82f6&color=fff&size=100&bold=true`; }} />
                                                            {u.gallery?.active && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-full animate-pulse" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <h4 className="font-bold text-gray-900 text-sm truncate">{u.username || 'Mysterious User'}</h4>
                                                                {u.isSelf && <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase">You</span>}
                                                            </div>
                                                            <p className="text-[11px] text-gray-400 truncate">{u.status || "Exploring digital world"}</p>
                                                        </div>
                                                        <div className="text-[10px] text-gray-300 font-bold uppercase group-hover:text-blue-500 transition-colors">Details</div>
                                                    </div>
                                                ))}
                                                {nearbyUsers.length === 0 && (
                                                    <p className="text-center py-4 text-gray-400 text-xs italic">Searching for residents nearby...</p>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {mainTab === 'nearby' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-black text-gray-900 px-1">Nearby People</h3>
                                        {nearbyUsers.length > 0 ? (
                                            <div className="divide-y divide-gray-50">
                                                {nearbyUsers.map(u => (
                                                    <div
                                                        key={u.id}
                                                        onClick={() => setSelectedUser(u)}
                                                        className="flex items-center gap-3 py-3 hover:bg-gray-50 rounded-2xl px-2 transition-colors cursor-pointer group"
                                                    >
                                                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 shrink-0 relative">
                                                            <img src={normalizeImageUrl(u.avatar_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || 'U')}`} className="w-full h-full object-cover" alt={u.username} onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || 'U')}&background=3b82f6&color=fff&size=100&bold=true`; }} />
                                                            {u.gallery?.active && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-full animate-pulse" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <h4 className="font-bold text-gray-900 text-sm truncate">{u.username || 'Mysterious User'}</h4>
                                                                {u.isSelf && <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase">You</span>}
                                                            </div>
                                                            <p className="text-[11px] text-gray-400 truncate">{u.status || "Exploring digital world"}</p>
                                                        </div>
                                                        <div className="text-[10px] text-gray-300 font-bold uppercase group-hover:text-blue-500 transition-colors">View</div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-12 text-center bg-gray-50 rounded-[32px]">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                                    <Navigation className="w-6 h-6 text-gray-200" />
                                                </div>
                                                <p className="text-gray-400 text-xs font-medium">No active users found nearby</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {mainTab === 'friends' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-black text-gray-900 px-1">Your Friends</h3>
                                        {friends.length > 0 ? (
                                            <div className="divide-y divide-gray-50">
                                                {friends.map(f => (
                                                    <div
                                                        key={f.id}
                                                        onClick={() => { setSelectedUser({ ...f, isFriend: true }); setActiveTab('info'); }}
                                                        className="flex items-center gap-3 py-3 hover:bg-gray-50 rounded-2xl px-2 transition-colors cursor-pointer"
                                                    >
                                                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 shrink-0">
                                                            <img src={normalizeImageUrl(f.avatar_url || f.photoURL) || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.username || f.displayName || 'U')}`} className="w-full h-full object-cover" alt={f.username} onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(f.username || f.displayName || 'U')}&background=3b82f6&color=fff&size=100&bold=true`; }} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-gray-900 text-sm truncate">{f.displayName || f.username}</h4>
                                                            <div className="flex items-center gap-1">
                                                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                                                <p className="text-[10px] text-emerald-500 font-bold uppercase">Online</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onOpenChat?.(f.id, f.displayName || f.username); }}
                                                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                                                        >
                                                            <MessageCircle className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-12 text-center bg-gray-50 rounded-[32px]">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                                    <UserPlus className="w-6 h-6 text-gray-200" />
                                                </div>
                                                <p className="text-gray-400 text-xs font-medium">No friends added yet</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default AlinMap;
