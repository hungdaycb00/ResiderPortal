import React, { useState, useEffect, useCallback, useRef } from 'react';
import { normalizeImageUrl, getBaseUrl } from '../services/externalApi';
import { Search, MapPin, Navigation, X, UserPlus, MessageCircle, Filter, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RefreshCw, ZoomIn, ZoomOut, Heart, Star, Bookmark, PlusCircle, CloudSun, Diamond, Compass, LocateFixed, Plus, Minus, Edit, Image as ImageIcon, User, Flag, Copy, AlertTriangle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';

// 1 degree of lat/lng ≈ 111km. We want 1km ≈ 100px on screen.
// So 1 degree = 111 * 100 = 11100 pixels
const DEGREES_TO_PX = 11100;

const SpatialNode: React.FC<{ user: any, myPos: { lat: number, lng: number }, onClick: () => void, mapScale: import('framer-motion').MotionValue<number> }> = ({ user, myPos, onClick, mapScale }) => {
    const dx = (user.lng - myPos.lng) * DEGREES_TO_PX;
    const dy = -(user.lat - myPos.lat) * DEGREES_TO_PX; // CSS Y is inverted vs latitude
    const [hoverScale, setHoverScale] = useState(1.1);
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

    return (
        <motion.div
            onPointerDown={(e) => e.stopPropagation()} // Prevent dragging the floor when clicking this
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            onPointerEnter={() => {
                const s = mapScale.get();
                setHoverScale(isDesktop ? Math.max(1.1, 1.2 / s) : 1.1);
            }}
            className="absolute w-12 h-12 -ml-6 -mt-12 cursor-pointer group hover:z-50 pointer-events-auto"
            style={{
                left: `calc(50% + ${dx}px)`,
                top: `calc(50% + ${dy}px)`
            }}
            whileHover={{ scale: hoverScale }}
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

            {/* Billboard Container (Positioned Above Avatar) */}
            {user.gallery?.active && (
                <div
                    onClick={(e) => { e.stopPropagation(); onClick(); }}
                    className="absolute -top-28 left-1/2 -translate-x-1/2 w-48 aspect-video bg-white/10 backdrop-blur-md rounded-lg overflow-hidden border border-white/20 shadow-2xl shadow-blue-500/20 cursor-pointer pointer-events-auto hover:scale-105 transition-transform"
                >
                    {/* Header */}
                    <div className="bg-slate-900/80 px-2 py-1 border-b border-slate-700/50">
                        <p className="text-[9px] font-black text-blue-100 truncate text-center uppercase tracking-wider">
                            {user.gallery?.title || 'SPECIAL OFFER'}
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
                </div>
            )}

            {/* Labels under avatar to prevent blocking billboard */}
            <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                {/* Status Tooltip */}
                {user.status && (
                    <div className="whitespace-nowrap bg-white/90 backdrop-blur border border-gray-200/50 px-2 py-1 rounded-full shadow-lg pointer-events-none">
                        <span className="text-[9px] font-bold text-gray-600 block max-w-[120px] truncate">{user.status}</span>
                    </div>
                )}
            </div>
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
    const [activeTab, setActiveTab] = useState<'info' | 'posts'>('info');
    const [mainTab, setMainTab] = useState<'discover' | 'nearby' | 'friends' | 'profile'>('discover');
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
    const [friendIdInput, setFriendIdInput] = useState('');
    const [socialSection, setSocialSection] = useState<'friends' | 'recent' | 'blocked'>('friends');
    const [myDisplayName, setMyDisplayName] = useState(user?.displayName || 'YOU');
    const [weatherData, setWeatherData] = useState<{ temp: number, desc: string, icon: string } | null>(null);
    const [isReporting, setIsReporting] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [isEditingStatus, setIsEditingStatus] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [statusInput, setStatusInput] = useState("");
    const [nameInput, setNameInput] = useState("");
    const [isVisibleOnMap, setIsVisibleOnMap] = useState(!!user);
    const [currentProvince, setCurrentProvince] = useState<string | null>(null);

    // Map Filters
    const [filterDistance, setFilterDistance] = useState(50);
    const [filterAgeMin, setFilterAgeMin] = useState(13);
    const [filterAgeMax, setFilterAgeMax] = useState(99);
    // Post state (replaces Gallery)
    const [userPosts, setUserPosts] = useState<any[]>([]);
    const [postTitle, setPostTitle] = useState('');
    const [isCreatingPost, setIsCreatingPost] = useState(false);
    const [isSavingPost, setIsSavingPost] = useState(false);
    // Billboard state (derived from starred post)
    const [galleryActive, setGalleryActive] = useState(false);
    const [galleryTitle, setGalleryTitle] = useState('');
    const [galleryImages, setGalleryImages] = useState<string[]>([]);

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
        const newScale = Math.min(Math.max(0.02, currentScale + delta * currentScale), 5);

        // Use Framer Motion's animate for smooth zoom
        animate(scale, newScale, {
            type: "spring",
            damping: 25,
            stiffness: 200,
            restDelta: 0.001
        });
    };

    // Initial Geolocation
    const requestLocation = (forceInvisible: boolean = false) => {
        localStorage.setItem('alin_location_consent_handled', 'true');
        if (forceInvisible) {
            setIsVisibleOnMap(false);
            if (ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { visible: false } }));
            }
        }
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setPosition([latitude, longitude]);
                    localStorage.setItem('alin_last_position', JSON.stringify([latitude, longitude]));
                    setIsConsentOpen(false);
                },
                (err) => {
                    console.error("Geolocation error:", err);
                    const lastPos = localStorage.getItem('alin_last_position');
                    if (lastPos) {
                        try { setPosition(JSON.parse(lastPos)); } catch (e) { setPosition([10.762622, 106.660172]); }
                    } else {
                        setPosition([10.762622, 106.660172]); // Fallback to HCM City
                    }
                    setIsConsentOpen(false);
                }
            );
        } else {
            const lastPos = localStorage.getItem('alin_last_position');
            if (lastPos) {
                try { setPosition(JSON.parse(lastPos)); } catch (e) { setPosition([10.762622, 106.660172]); }
            } else {
                setPosition([10.762622, 106.660172]);
            }
            setIsConsentOpen(false);
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
                    avatar_url: user?.photoURL || '',
                    province: currentProvince || ''
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

    const compressImage = (file: File): Promise<File> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;
                    const max = 1080;
                    if (width > height && width > max) {
                        height *= max / width;
                        width = max;
                    } else if (height > max) {
                        width *= max / height;
                        height = max;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        resolve(blob ? new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", { type: 'image/webp' }) : file);
                    }, 'image/webp', 0.8);
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleCreatePost = async (files: File[]) => {
        if (files.length === 0 && !postTitle.trim()) return;
        setIsSavingPost(true);
        try {
            const compressedFiles = files.length > 0 ? await Promise.all(files.map(f => compressImage(f))) : [];
            const validFiles = compressedFiles.filter(f => f.size <= 1024 * 1024);
            const formData = new FormData();
            validFiles.forEach(f => formData.append('images', f));
            formData.append('title', postTitle);
            const deviceId = externalApi.getDeviceId();
            const resp = await fetch(`${API_BASE}/api/user/post`, {
                method: 'POST',
                headers: { 'X-Device-Id': deviceId },
                body: formData
            });
            const data = await resp.json();
            if (data.success) {
                setPostTitle('');
                setIsCreatingPost(false);
                fetchUserPosts(myUserId || user?.uid);
                ws.current?.send(JSON.stringify({ type: 'UPDATE_GALLERY' }));
            } else {
                alert(data.error || 'Post creation failed');
            }
        } catch (err) {
            console.error('Create post error:', err);
        } finally {
            setIsSavingPost(false);
        }
    };

    const fetchUserPosts = async (userId: string | null | undefined) => {
        if (!userId) return;
        try {
            const resp = await fetch(`${API_BASE}/api/user/${userId}/posts`);
            const data = await resp.json();
            if (data.success) {
                setUserPosts(data.posts);
                const starred = data.posts.find((p: any) => p.isStarred);
                if (starred) {
                    setGalleryActive(true);
                    setGalleryTitle(starred.title || '');
                    setGalleryImages(starred.images || []);
                } else {
                    setGalleryActive(false);
                    setGalleryTitle('');
                    setGalleryImages([]);
                }
            }
        } catch (err) {
            console.error('Fetch posts error:', err);
        }
    };

    const handleStarPost = async (postId: string) => {
        const deviceId = externalApi.getDeviceId();
        try {
            const resp = await fetch(`${API_BASE}/api/user/post/${postId}/star`, {
                method: 'PUT',
                headers: { 'X-Device-Id': deviceId }
            });
            const data = await resp.json();
            if (data.success) {
                fetchUserPosts(myUserId || user?.uid);
                ws.current?.send(JSON.stringify({ type: 'UPDATE_GALLERY' }));
            }
        } catch (err) {
            console.error('Star post error:', err);
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm('Xoá bài viết này?')) return;
        const deviceId = externalApi.getDeviceId();
        try {
            const resp = await fetch(`${API_BASE}/api/user/post/${postId}`, {
                method: 'DELETE',
                headers: { 'X-Device-Id': deviceId }
            });
            const data = await resp.json();
            if (data.success) {
                fetchUserPosts(myUserId || user?.uid);
                ws.current?.send(JSON.stringify({ type: 'UPDATE_GALLERY' }));
            }
        } catch (err) {
            console.error('Delete post error:', err);
        }
    };



    useEffect(() => {
        if (selectedUser) {
            setIsLoadingGames(true);
            externalApi.getUserGames(selectedUser.id)
                .then((res: any) => {
                    if (res.success) setUserGames(res.games);
                })
                .catch(console.error)
                .finally(() => setIsLoadingGames(false));
            const targetId = selectedUser.isSelf ? (myUserId || user?.uid) : selectedUser.id;
            fetchUserPosts(targetId);
        } else {
            setUserGames([]);
        }
    }, [selectedUser, externalApi]);

    // Fetch Weather Data
    useEffect(() => {
        if (myObfPos) {
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${myObfPos.lat}&longitude=${myObfPos.lng}&current_weather=true`)
                .then(res => res.json())
                .then(data => {
                    if (data.current_weather) {
                        const code = data.current_weather.weathercode;
                        let icon = '🌤️', desc = 'Clear';
                        if (code === 0) { icon = '☀️'; desc = 'Clear Sky'; }
                        else if (code <= 3) { icon = '☁️'; desc = 'Cloudy'; }
                        else if (code <= 48) { icon = '🌫️'; desc = 'Fog'; }
                        else if (code <= 57) { icon = '🌦️'; desc = 'Drizzle'; }
                        else if (code <= 67) { icon = '🌧️'; desc = 'Rain'; }
                        else if (code <= 77) { icon = '❄️'; desc = 'Snow'; }
                        else if (code <= 82) { icon = '🌧️'; desc = 'Showers'; }
                        else if (code >= 95) { icon = '⛈️'; desc = 'Thunderstorm'; }
                        setWeatherData({ temp: data.current_weather.temperature, desc, icon });
                    }
                }).catch(err => console.error('Weather fetch error:', err));
        }
    }, [myObfPos]);

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

    // Auto-init for old users or show consent
    useEffect(() => {
        if (!position) {
            const hasConsented = localStorage.getItem('alin_location_consent_handled');
            if (hasConsented === 'true') {
                requestLocation(); // Automatically grant and connect using previous settings
            } else if (!isConsentOpen) {
                setIsConsentOpen(true);
            }
        }
    }, [position]); // Run on mount or if position is somehow cleared

    // Sync avatar/displayName/province to alin_social WS whenever user data changes
    useEffect(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN && user) {
            ws.current.send(JSON.stringify({
                type: 'UPDATE_PROFILE',
                payload: {
                    avatar_url: user.photoURL || '',
                    displayName: user.displayName || myDisplayName,
                    province: currentProvince || ''
                }
            }));
        }
    }, [user?.photoURL, user?.displayName, currentProvince]);

    return (
        <div className="fixed inset-0 z-[100] bg-[#13151a] flex flex-col">
            {/* Header / Search Bar (Mobile First & Sticky Header on PC) */}
            <div className={`absolute top-12 left-4 right-4 z-[180] flex gap-2 transition-all duration-300 ${isDesktop && isSheetExpanded ? 'md:top-0 md:left-[72px] md:w-[400px] md:bg-white md:pt-5 md:pb-2 md:px-4' : 'md:left-[88px] md:top-6 md:w-[384px]'} ${!isDesktop && isSheetExpanded ? 'opacity-0 pointer-events-none translate-y-[-10px]' : 'opacity-100'}`}>
                <div className={`flex-1 backdrop-blur-xl rounded-full flex items-center px-4 py-3 overflow-hidden transition-all duration-300 ${isDesktop && isSheetExpanded ? 'bg-white border border-gray-200 shadow-none' : 'bg-white/90 shadow-[0_4px_20px_rgba(0,0,0,0.15)]'}`}>
                    <Search className="w-5 h-5 text-gray-500 mr-2 shrink-0" />
                    <input
                        type="text"
                        placeholder="Search..."
                        onFocus={() => {
                            setIsSheetExpanded(true);
                            if (!isDesktop) {
                                setTimeout(() => document.getElementById('sheet-search-mobile')?.focus(), 50);
                            }
                        }}
                        className="bg-transparent border-none outline-none text-gray-900 text-sm w-full placeholder:text-gray-500 font-medium font-sans"
                        value={searchTag}
                        onChange={(e) => setSearchTag(e.target.value)}
                    />
                    <div className="ml-2 pl-2 border-l border-gray-300 flex items-center gap-1.5 shrink-0 cursor-pointer" onClick={() => { setSelectedUser(null); setMainTab('profile'); setActiveTab('info'); setIsSheetExpanded(true); }}>
                        <MapPin className="w-4 h-4 text-blue-500" />
                        <span className="text-[10px] text-blue-600 font-bold whitespace-nowrap truncate max-w-[80px] sm:max-w-[100px] hidden sm:block">{currentProvince || 'Locating...'}</span>
                    </div>
                    {/* User Avatar Inside Search */}
                    <button onClick={() => { setSelectedUser(null); setMainTab('profile'); setActiveTab('info'); setIsSheetExpanded(true); }} className="ml-2 sm:ml-3 shrink-0 active:scale-95 transition-transform overflow-hidden rounded-full border-2 border-blue-500 shadow-sm">
                        <img
                            src={normalizeImageUrl(user?.photoURL) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || myDisplayName)}&background=3b82f6&color=fff&size=100&bold=true`}
                            alt="Me"
                            className="w-7 h-7 object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || myDisplayName)}&background=3b82f6&color=fff&size=100&bold=true`; }}
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
                            {/* Grid styling explicit fix */}
                            <div className="absolute inset-0 pointer-events-none" style={{
                                backgroundImage: "linear-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.05) 1px, transparent 1px)",
                                backgroundSize: "100px 100px",
                                backgroundPosition: "center center",
                            }} />

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
                                        className="absolute w-16 h-16 -ml-8 -mt-16 group pointer-events-auto z-[100] cursor-grab active:cursor-grabbing select-none"
                                        style={{ top: '50%', left: '50%', x: selfDragX, y: selfDragY }}
                                        onPointerEnter={() => {
                                            const s = scale.get();
                                            document.documentElement.style.setProperty('--self-hover-scale', String(isDesktop ? Math.max(1.1, 1.2 / s) : 1.1));
                                        }}
                                        whileHover={{ scale: 'var(--self-hover-scale, 1.1)' as any }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping shadow-[0_0_20px_rgba(59,130,246,0.6)]" />
                                        <div className={`w-full h-full rounded-full border-[3px] overflow-hidden bg-[#1a1d24] relative z-10 transition-all shadow-[0_0_30px_rgba(59,130,246,0.9)] ${isVisibleOnMap ? 'border-blue-400' : 'border-emerald-500 opacity-60'}`}>
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
                                                className="absolute -top-28 left-1/2 -translate-x-1/2 w-48 aspect-video bg-white/10 backdrop-blur-md rounded-lg overflow-hidden border border-amber-400/30 shadow-2xl shadow-amber-500/20 cursor-pointer pointer-events-auto hover:scale-105 transition-transform"
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

                                        {/* Labels under self avatar to prevent blocking billboard */}
                                        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                                            {/* Status Tooltip for Self */}
                                            {myStatus && (
                                                <div className="whitespace-nowrap bg-white/90 backdrop-blur border border-gray-200/50 px-2 py-1 rounded-full shadow-lg pointer-events-none">
                                                    <span className="text-[9px] font-bold text-gray-600 block max-w-[120px] truncate">{myStatus}</span>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>

                                    {/* Other Nodes */}
                                    {nearbyUsers.filter(u => {
                                        if (u.id === myUserId || u.id === user?.uid) return false;
                                        
                                        // 1. Keyword/Tag filter
                                        if (searchTag) {
                                            const term = searchTag.toLowerCase();
                                            const matchesName = (u.displayName || u.username || '').toLowerCase().includes(term);
                                            const tagsStr = (Array.isArray(u.tags) ? u.tags.join(' ') : u.tags || '').toLowerCase();
                                            const matchesTags = tagsStr.includes(term);
                                            const statusStr = (u.status || '').toLowerCase();
                                            const matchesStatus = statusStr.includes(term);
                                            if (!matchesName && !matchesTags && !matchesStatus) return false;
                                        }

                                        // 2. Distance filter
                                        const distKm = Math.sqrt(Math.pow(u.lat - myObfPos!.lat, 2) + Math.pow(u.lng - myObfPos!.lng, 2)) * 111;
                                        if (distKm > filterDistance) return false;

                                        // 3. Age filter (mocked to 20 if missing to avoid breaking UX)
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
                <div className="flex flex-col bg-white rounded-[14px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] overflow-hidden mt-1 pointer-events-auto">
                    <button
                        onClick={handleCenter}
                        className="w-[42px] h-11 text-blue-600 hover:bg-gray-50 flex items-center justify-center border-b border-gray-200 active:bg-gray-100 transition-colors"
                        title="Your Position"
                    >
                        <LocateFixed className="w-5 h-5" />
                    </button>
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

            {/* Weather & Coordinates Widget */}
            <div className="absolute bottom-[200px] md:bottom-12 left-4 md:left-[430px] z-[120] pointer-events-auto bg-white/90 backdrop-blur-md rounded-2xl p-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-gray-100/50 flex flex-col gap-1 min-w-[140px]">
                {weatherData && (
                    <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-xl">{weatherData.icon}</span>
                        <div>
                            <p className="text-[14px] font-black text-gray-900 leading-tight">{weatherData.temp}°C</p>
                            <p className="text-[9px] font-bold text-gray-400 tracking-wide uppercase">{weatherData.desc}</p>
                        </div>
                    </div>
                )}
                {myObfPos && (
                    <div className="bg-gray-100 rounded-lg py-1 px-2 flex flex-col gap-0.5">
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest text-center">Encrypted Location</p>
                        <p className="text-[10px] font-mono font-bold text-gray-700 text-center tracking-wide">
                            {myObfPos.lat.toFixed(5)}, {myObfPos.lng.toFixed(5)}
                        </p>
                    </div>
                )}
            </div>

            {/* Sidebar (Map Filters) */}
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
                                <h2 className="text-xl font-bold">Map Filters</h2>
                                <X className="w-6 h-6 cursor-pointer" onClick={() => setIsSidebarOpen(false)} />
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-3">Distance (km)</h3>
                                    <div className="flex justify-between text-blue-400 font-bold mb-2">
                                        <span>Within {filterDistance} km</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="500"
                                        value={filterDistance}
                                        onChange={(e) => setFilterDistance(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                                    />
                                </div>

                                <div className="pt-6 border-t border-white/10">
                                    <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-3">Age Range</h3>
                                    <div className="flex justify-between items-center gap-4">
                                        <div className="flex-1">
                                            <input
                                                type="number"
                                                min="13"
                                                max="99"
                                                value={filterAgeMin}
                                                onChange={(e) => setFilterAgeMin(parseInt(e.target.value))}
                                                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-[10px] text-gray-500 block text-center mt-1">Min Age</span>
                                        </div>
                                        <span className="text-gray-500 font-bold">-</span>
                                        <div className="flex-1">
                                            <input
                                                type="number"
                                                min="13"
                                                max="99"
                                                value={filterAgeMax}
                                                onChange={(e) => setFilterAgeMax(parseInt(e.target.value))}
                                                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-[10px] text-gray-500 block text-center mt-1">Max Age</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="pt-6 border-t border-white/10">
                                    <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-3">Keywords / Tags</h3>
                                    <input
                                        type="text"
                                        placeholder="E.g. #GAMER or 'Looking for...'"
                                        value={searchTag}
                                        onChange={(e) => setSearchTag(e.target.value)}
                                        className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                    <p className="text-[10px] text-gray-500 mt-2">Filters the map instantly as you type.</p>
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
                        <span className={`text-[9px] font-bold ${mainTab === 'friends' && !selectedUser ? 'text-blue-600' : 'text-gray-400'}`}>Social</span>
                    </button>
                    <button onClick={() => { setSelectedUser(null); setMainTab('profile'); setActiveTab('info'); setIsSheetExpanded(true); }} className="w-12 h-12 flex flex-col items-center justify-center gap-1 group transition-all">
                        <User className={`w-6 h-6 ${mainTab === 'profile' && !selectedUser ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'}`} />
                        <span className={`text-[9px] font-bold ${mainTab === 'profile' && !selectedUser ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'}`}>Profile</span>
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
                    <span className="text-[9px] font-black uppercase">Social</span>
                </button>
                <button onClick={() => { setSelectedUser(null); setMainTab('profile'); setActiveTab('info'); setIsSheetExpanded(true); }} className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 ${mainTab === 'profile' && !selectedUser ? 'text-blue-600' : 'text-gray-400'}`}>
                    <User className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase">Profile</span>
                </button>
            </div>

            {/* Smart Bottom Sheet / PC Sidebar */}
            <div className={`absolute left-0 right-0 md:left-[72px] md:right-auto md:translate-x-0 md:w-[400px] pointer-events-none z-[140] ${isDesktop ? 'top-0 bottom-0 overflow-visible' : 'top-20 bottom-[60px] overflow-hidden'}`}>
                <motion.div
                    className="absolute top-0 left-0 right-0 h-full bg-white rounded-t-[32px] md:rounded-none shadow-[0_-10px_40px_rgba(0,0,0,0.15)] md:shadow-[4px_0_24px_rgba(0,0,0,0.1)] md:border-r md:border-gray-200 flex flex-col pointer-events-auto"
                    variants={{
                        expanded: { y: 0, x: 0 },
                        collapsed: {
                            y: isDesktop ? 0 : 'calc(100% - 40px)',
                            x: isDesktop ? '-100%' : 0
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
                    {/* PC Hinge Toggle Button */}
                    <button 
                        onClick={() => setIsSheetExpanded(!isSheetExpanded)}
                        className="hidden md:flex absolute top-1/2 -right-[23px] -translate-y-1/2 w-6 h-14 bg-white border border-l-0 border-gray-200 rounded-r-[10px] shadow-[4px_0_10px_rgba(0,0,0,0.05)] items-center justify-center cursor-pointer hover:bg-gray-50 z-50 text-gray-500 hover:text-gray-700 transition-colors"
                        title={isSheetExpanded ? "Collapse panel" : "Expand panel"}
                    >
                        {isSheetExpanded ? <ChevronLeft className="w-4 h-4 ml-[-4px]" /> : <ChevronRight className="w-4 h-4 ml-[-4px]" />}
                    </button>

                    {/* Header Part (Search & Handle) */}
                    <div className="bg-white/80 backdrop-blur-md sticky top-0 z-[110] shrink-0">
                        {/* Hover Area / Handle (Mobile Only) */}
                        <div className="w-full flex md:hidden flex-col items-center pt-2 pb-1 cursor-pointer active:bg-gray-50 transition-colors shadow-[0_-2px_8px_rgba(0,0,0,0.02)]" onClick={() => setIsSheetExpanded(!isSheetExpanded)}>
                            <div className="w-10 h-1 bg-gray-300 rounded-full mb-1" />
                            <div className="text-gray-400">
                                {isSheetExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            </div>
                        </div>

                        {/* MOBILE Search Bar inside Sheet */}
                        {!isDesktop && isSheetExpanded && (
                            <div className="px-4 pb-3 -mt-1 block md:hidden animate-in fade-in duration-300">
                                <div className="flex bg-gray-100 rounded-full items-center px-4 py-2 border border-gray-200 shadow-inner">
                                    <Search className="w-4 h-4 text-gray-500 mr-2 shrink-0" />
                                    <input
                                        id="sheet-search-mobile"
                                        type="text"
                                        placeholder="Search..."
                                        className="bg-transparent border-none outline-none text-gray-900 text-sm w-full placeholder:text-gray-500 font-medium font-sans"
                                        value={searchTag}
                                        onChange={(e) => setSearchTag(e.target.value)}
                                    />
                                    {searchTag && (
                                        <button onClick={() => setSearchTag('')} className="p-1 hover:bg-gray-200 rounded-full ml-1">
                                            <X className="w-3 h-3 text-gray-400" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 pb-32 md:pb-6 md:pt-[76px] scrollbar-hide relative z-[100]">
                        {selectedUser ? (
                            <div className="pt-2">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="w-20 h-20 bg-gray-100 rounded-[20px] overflow-hidden shrink-0 shadow-sm border border-gray-200 relative group/avatar">
                                        <img
                                            src={normalizeImageUrl(selectedUser.avatar_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.username || 'U')}&background=3b82f6&color=fff&size=150&bold=true`}
                                            alt="Avatar"
                                            className="w-full h-full object-cover transition-transform group-hover/avatar:scale-110"
                                            onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.username || 'U')}&background=3b82f6&color=fff&size=150&bold=true`; }}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0 pt-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-2xl font-black text-gray-900 truncate tracking-tight mb-1">{selectedUser.username || 'Mysterious User'}</h3>
                                                {selectedUser.province && (
                                                    <p className="text-xs text-gray-500 font-medium">📍 {selectedUser.province}</p>
                                                )}
                                            </div>
                                            <button 
                                                onClick={() => setSelectedUser(null)} 
                                                className="shrink-0 p-2 -mr-2 -mt-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Tab Toggle */}
                                <div className="flex bg-gray-100 p-1 rounded-2xl mb-6">
                                    <button
                                        onClick={() => setActiveTab('info')}
                                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'info' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                    >
                                        Info
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('posts')}
                                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'posts' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                    >
                                        Posts {selectedUser.gallery?.active && <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full ml-1 animate-pulse" />}
                                    </button>
                                </div>

                                {activeTab === 'info' ? (
                                    <>
                                        <p className="text-gray-500 text-[13px] truncate mb-2">{selectedUser.status || "Exploring the digital universe"}</p>
                                        <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
                                            {(selectedUser.tags || ['#GAMER', '#ALIN']).map((tag) => (
                                                <span key={tag} className="text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">
                                                    {tag.toUpperCase()}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pb-8">
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
                                        </div>

                                        {/* Report User Section */}
                                        <div className="mt-2 mb-6">
                                            {!isReporting ? (
                                                <button onClick={() => setIsReporting(true)} className="flex items-center gap-2 text-[11px] font-bold text-red-500 hover:text-red-600 transition-colors px-2 py-1">
                                                    <Flag className="w-3.5 h-3.5" /> Report User
                                                </button>
                                            ) : (
                                                <div className="bg-red-50/50 border border-red-100 rounded-xl p-3">
                                                    <p className="text-[10px] uppercase font-bold text-red-500 mb-2">Report Content/User</p>
                                                    <textarea
                                                        value={reportReason}
                                                        onChange={e => setReportReason(e.target.value)}
                                                        placeholder="Why are you reporting this user?"
                                                        className="w-full bg-white border border-red-200 rounded-lg p-2 text-xs outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 mb-2 resize-none h-16"
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => { setIsReporting(false); setReportReason(""); }} className="px-3 py-1.5 text-[11px] font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                                                        <button 
                                                            onClick={() => {
                                                                if (ws.current?.readyState === WebSocket.OPEN && reportReason.trim()) {
                                                                    ws.current.send(JSON.stringify({ type: 'REPORT_USER', payload: { reportedId: selectedUser.id, reason: reportReason.trim() } }));
                                                                    setIsReporting(false);
                                                                    setReportReason("");
                                                                    alert("Report submitted successfully.");
                                                                }
                                                            }}
                                                            className="px-3 py-1.5 text-[11px] font-bold bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors active:scale-95 disabled:opacity-50"
                                                            disabled={!reportReason.trim()}
                                                        >
                                                            Submit Report
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* User Games Section */}
                                        {games && games.length > 0 && (
                                            <div className="mt-2">
                                                <h4 className="text-[13px] font-bold text-gray-900 mb-3">🎮 Games</h4>
                                                <div className="space-y-2">
                                                    {games.filter((g) => g.creatorId === selectedUser.id).map((g) => (
                                                        <div key={g.id || g.gameId} className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors cursor-pointer group">
                                                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-lg shrink-0 overflow-hidden">
                                                                {g.thumbnail ? (
                                                                    <img src={normalizeImageUrl(g.thumbnail)} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span>🎮</span>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[13px] font-bold text-gray-900 truncate">{g.name || g.title || 'Untitled Game'}</p>
                                                                <p className="text-[11px] text-gray-500">{g.type || 'Game'} {g.playCount ? `• ${g.playCount} plays` : ''}</p>
                                                            </div>
                                                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                                                        </div>
                                                    ))}
                                                    {games.filter((g) => g.creatorId === selectedUser.id).length === 0 && (
                                                        <p className="text-[12px] text-gray-400 text-center py-4">No games created yet.</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="pb-8">
                                        {userPosts.length > 0 ? (
                                            <div className="space-y-4">
                                                {userPosts.map((post) => (
                                                    <div key={post.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                                        <div className="flex items-center justify-between px-4 pt-3 pb-2">
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="text-[14px] font-bold text-gray-900 truncate">{post.title || 'Untitled Post'}</h4>
                                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                                    {new Date(post.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {post.images?.length > 0 && (
                                                            <div className="flex overflow-x-auto gap-1 px-1 pb-1 scrollbar-hide snap-x">
                                                                {post.images.map((img, idx) => (
                                                                    <div key={idx} className="snap-start shrink-0 w-full aspect-[16/10] bg-gray-100 overflow-hidden">
                                                                        <img src={normalizeImageUrl(img)} className="w-full h-full object-cover" alt="Post" />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {post.isStarred && (
                                                            <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 flex items-center gap-1.5">
                                                                <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                                                                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Active Billboard</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                    <Edit className="w-8 h-8 text-gray-200" />
                                                </div>
                                                <p className="text-gray-400 text-sm">No posts yet</p>
                                                <p className="text-[11px] text-gray-400 mt-1">This user hasn't posted anything.</p>
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

                                        {/* Trending Tags from nearby users */}
                                        <div className="mt-4 space-y-4">
                                            <div className="flex justify-between items-center px-1">
                                                <h3 className="text-lg font-black text-gray-900">Trending Tags</h3>
                                                <span className="text-[11px] font-bold text-gray-400">{nearbyUsers.length} users nearby</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {(() => {
                                                    const tagCounts: Record<string, number> = {};
                                                    nearbyUsers.forEach(u => {
                                                        const words = (u.status || '').split(' ').filter((w: string) => w.startsWith('#'));
                                                        words.forEach((w: string) => {
                                                            const clean = w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9#]/g, '').toUpperCase();
                                                            if (clean.length > 1) tagCounts[clean] = (tagCounts[clean] || 0) + 1;
                                                        });
                                                    });
                                                    const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 12);
                                                    if (sorted.length === 0) return <p className="text-[12px] text-gray-400 italic py-2">No trending tags yet.</p>;
                                                    return sorted.map(([tag, count]) => (
                                                        <button key={tag} onClick={() => setSearchTag(tag)} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[11px] font-bold rounded-full border border-blue-100 transition-colors active:scale-95">
                                                            {tag} <span className="text-blue-400 ml-1">×{count}</span>
                                                        </button>
                                                    ));
                                                })()}
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
                                    <div className="space-y-5">
                                        <h3 className="text-lg font-black text-gray-900 px-1">Social</h3>

                                        {/* User ID + Copy */}
                                        <div className="bg-gray-50 rounded-2xl p-3 flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Your User ID</p>
                                                <p className="text-[13px] font-mono font-bold text-gray-900 truncate">{myUserId || '...'}</p>
                                            </div>
                                            <button 
                                                onClick={() => { if (myUserId) { navigator.clipboard.writeText(myUserId); } }}
                                                className="p-2.5 bg-white hover:bg-blue-50 border border-gray-200 rounded-xl transition-colors active:scale-95 shrink-0"
                                                title="Copy ID"
                                            >
                                                <Copy className="w-4 h-4 text-gray-500" />
                                            </button>
                                        </div>

                                        {/* Add Friend by ID */}
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Enter User ID to add..."
                                                value={friendIdInput}
                                                onChange={(e) => setFriendIdInput(e.target.value)}
                                                className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-gray-900 font-medium placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                            />
                                            <button
                                                onClick={() => {
                                                    if (friendIdInput.trim() && ws.current?.readyState === WebSocket.OPEN) {
                                                        ws.current.send(JSON.stringify({ type: 'FRIEND_REQUEST_BY_ID', payload: { targetId: friendIdInput.trim() } }));
                                                        setSentFriendRequests(prev => [...prev, friendIdInput.trim()]);
                                                        setFriendIdInput('');
                                                    }
                                                }}
                                                className="px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-colors active:scale-95 shrink-0"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Section Tabs */}
                                        <div className="flex bg-gray-100 p-1 rounded-xl">
                                            <button onClick={() => setSocialSection('friends')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${socialSection === 'friends' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Friends ({friends.length})</button>
                                            <button onClick={() => setSocialSection('recent')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${socialSection === 'recent' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Recent</button>
                                            <button onClick={() => setSocialSection('blocked')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${socialSection === 'blocked' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Blocked</button>
                                        </div>

                                        {/* Friends Section */}
                                        {socialSection === 'friends' && (
                                            friends.length > 0 ? (
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
                                                <div className="py-10 text-center bg-gray-50 rounded-[32px]">
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                                        <UserPlus className="w-6 h-6 text-gray-200" />
                                                    </div>
                                                    <p className="text-gray-400 text-xs font-medium">No friends added yet</p>
                                                    <p className="text-gray-300 text-[11px] mt-1">Share your ID or add someone above</p>
                                                </div>
                                            )
                                        )}

                                        {/* Recent Interactions */}
                                        {socialSection === 'recent' && (
                                            <div className="py-10 text-center bg-gray-50 rounded-[32px]">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                                    <RefreshCw className="w-6 h-6 text-gray-200" />
                                                </div>
                                                <p className="text-gray-400 text-xs font-medium">No recent interactions</p>
                                                <p className="text-gray-300 text-[11px] mt-1">View profiles and chat to build history</p>
                                            </div>
                                        )}

                                        {/* Blocked Users */}
                                        {socialSection === 'blocked' && (
                                            <div className="py-10 text-center bg-gray-50 rounded-[32px]">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                                    <AlertTriangle className="w-6 h-6 text-gray-200" />
                                                </div>
                                                <p className="text-gray-400 text-xs font-medium">No blocked users</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {mainTab === 'profile' && !selectedUser && (
                                    <div className="space-y-4 pt-16 md:pt-4">
                                        <h3 className="text-lg font-black text-gray-900 px-1 mb-2">My Profile</h3>

                                        {/* Avatar & Basic Info */}
                                        <div className="flex items-start gap-4 mb-6 px-1">
                                            <div className="w-20 h-20 bg-gray-100 rounded-[20px] overflow-hidden shrink-0 shadow-sm border border-gray-200 relative group/avatar cursor-pointer" onClick={() => alert("Chức năng đổi ảnh đại diện sẽ sớm ra mắt!")}>
                                                <img
                                                    src={normalizeImageUrl(user?.photoURL) || `https://ui-avatars.com/api/?name=${encodeURIComponent(myDisplayName)}&background=3b82f6&color=fff&size=150&bold=true`}
                                                    alt="Avatar"
                                                    className="w-full h-full object-cover transition-transform group-hover/avatar:scale-110"
                                                    onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(myDisplayName)}&background=3b82f6&color=fff&size=150&bold=true`; }}
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity justify-center items-center flex">
                                                    <Edit className="w-6 h-6 text-white drop-shadow-md" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0 pt-1">
                                                {isEditingName ? (
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
                                                    <div className="mb-1">
                                                        <div className="group/name inline-flex items-center gap-2 cursor-pointer" onClick={() => { setNameInput(myDisplayName); setIsEditingName(true); }}>
                                                            <h3 className="text-2xl font-black text-gray-900 truncate tracking-tight">{myDisplayName}</h3>
                                                            <Edit className="w-4 h-4 text-blue-500 opacity-40 group-hover/name:opacity-100 transition-opacity" />
                                                        </div>
                                                        {currentProvince && (
                                                            <p className="text-sm text-gray-500 font-medium">📍 {currentProvince}</p>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                {/* ID Copy placed here concisely */}
                                                <div className="group/id inline-flex items-center gap-1.5 bg-gray-100/80 hover:bg-blue-50 px-2 py-1 rounded-md cursor-pointer transition-colors mt-2" onClick={() => { navigator.clipboard.writeText(myUserId); alert("ID copied to clipboard!"); }}>
                                                    <span className="text-[10px] font-bold text-gray-500 group-hover/id:text-blue-600 truncate max-w-[120px]">ID: {myUserId}</span>
                                                    <Copy className="w-3 h-3 text-gray-400 group-hover/id:text-blue-500" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tab Toggle for Profile content */}
                                        <div className="flex bg-gray-100 p-1 rounded-2xl mb-6">
                                            <button
                                                onClick={() => setActiveTab('info')}
                                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'info' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                            >
                                                Info
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('posts')}
                                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'posts' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                            >
                                                Posts {galleryActive && <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full ml-1 animate-pulse" />}
                                            </button>
                                        </div>

                                        {activeTab === 'info' ? (
                                            <>
                                                {isEditingStatus ? (
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
                                                )}

                                                <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
                                                    {myStatus.split(' ').filter(w => w.startsWith('#')).map(w => w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9#]/g, '')).map((tag) => (
                                                        <span key={tag} className="text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">
                                                            {tag.toUpperCase()}
                                                        </span>
                                                    ))}
                                                </div>

                                                <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
                                                    <h4 className="text-[13px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                        <Compass className="w-4 h-4 text-blue-500" /> Privacy & Location
                                                    </h4>
                                                    
                                                    <div className="space-y-4">
                                                        <div>
                                                            <div className="flex justify-between mb-2">
                                                                <span className="text-[11px] font-bold text-gray-500">Obfuscation Radius</span>
                                                                <span className="text-[11px] font-bold text-blue-600">{radius} km</span>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min="0"
                                                                max="100"
                                                                value={radius}
                                                                onChange={(e) => handleUpdateRadius(parseInt(e.target.value))}
                                                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                                                            />
                                                        </div>

                                                        <div className="flex justify-between items-center pt-3 border-t border-gray-200/60">
                                                            <div>
                                                                <span className="text-[11px] font-bold text-gray-700 block">Visible on Map</span>
                                                                <span className="text-[9px] font-medium text-gray-400">{isVisibleOnMap ? 'Others can see you' : 'Ghost mode'}</span>
                                                            </div>
                                                            <div className="relative inline-flex items-center cursor-pointer" onClick={() => {
                                                                const newVal = !isVisibleOnMap;
                                                                setIsVisibleOnMap(newVal);
                                                                if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { visible: newVal } }));
                                                            }}>
                                                                <div className={`w-9 h-5 rounded-full transition-colors ${isVisibleOnMap ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                                                    <div className={`w-4 h-4 bg-white rounded-full mt-0.5 ml-0.5 transition-transform shadow-sm flex items-center justify-center ${isVisibleOnMap ? 'translate-x-4' : 'translate-x-0'}`}>
                                                                        {isVisibleOnMap && <div className="w-1 h-1 bg-blue-600 rounded-full" />}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* User Games Section */}
                                                {games && games.length > 0 && (
                                                    <div className="mt-2">
                                                        <h4 className="text-[13px] font-bold text-gray-900 mb-3">🎮 My Games</h4>
                                                        <div className="space-y-2">
                                                            {games.filter((g) => g.creatorId === user?.uid || g.creatorId === myUserId).map((g) => (
                                                                <div key={g.id || g.gameId} className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors cursor-pointer group">
                                                                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-lg shrink-0 overflow-hidden">
                                                                        {g.thumbnail ? (
                                                                            <img src={normalizeImageUrl(g.thumbnail)} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <span>🎮</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-[13px] font-bold text-gray-900 truncate">{g.name || g.title || 'Untitled Game'}</p>
                                                                        <p className="text-[11px] text-gray-500">{g.type || 'Game'} {g.playCount ? `• ${g.playCount} plays` : ''}</p>
                                                                    </div>
                                                                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                                                                </div>
                                                            ))}
                                                            {games.filter((g) => g.creatorId === user?.uid || g.creatorId === myUserId).length === 0 && (
                                                                <p className="text-[12px] text-gray-400 text-center py-4">No games created yet.</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            <div className="pt-4 pb-4">
                                                <button onClick={() => { setIsSheetExpanded(false); setMainTab('discover'); }} className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 py-4 rounded-[20px] font-bold transition-all active:scale-95 shadow-sm">
                                                    <X className="w-5 h-5" /> Close Profile
                                                </button>
                                            </div>
                                            </>
                                        ) : (
                                            <div className="pb-8">
                                                {/* Create Post Form */}
                                                <div className="mb-6">
                                                    {!isCreatingPost ? (
                                                        <button
                                                            onClick={() => setIsCreatingPost(true)}
                                                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                                                        >
                                                            <Edit className="w-4 h-4" /> Create Post
                                                        </button>
                                                    ) : (
                                                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3">
                                                            <input
                                                                type="text"
                                                                placeholder="Post title..."
                                                                value={postTitle}
                                                                onChange={(e) => setPostTitle(e.target.value.substring(0, 50))}
                                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
                                                            />
                                                            <p className="text-[10px] text-right text-gray-400">{postTitle.length}/50</p>
                                                            <div className="flex gap-2">
                                                                <label className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95">
                                                                    <ImageIcon className="w-4 h-4" /> Add Photos & Post
                                                                    <input
                                                                        type="file"
                                                                        hidden
                                                                        accept="image/png,image/jpeg,image/webp"
                                                                        multiple
                                                                        onChange={(e) => {
                                                                            const files = Array.from(e.target.files || []) as File[];
                                                                            handleCreatePost(files);
                                                                        }}
                                                                    />
                                                                </label>
                                                                <button
                                                                    onClick={() => handleCreatePost([])}
                                                                    className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                                                                >
                                                                    Text Only
                                                                </button>
                                                            </div>
                                                            <button
                                                                onClick={() => { setIsCreatingPost(false); setPostTitle(''); }}
                                                                className="w-full text-gray-400 hover:text-gray-600 text-xs font-medium py-1 transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            {isSavingPost && <p className="text-[10px] text-blue-500 text-center animate-pulse">Posting...</p>}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Posts Timeline */}
                                                {userPosts.length > 0 ? (
                                                    <div className="space-y-4">
                                                        {userPosts.map((post) => (
                                                            <div key={post.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                                                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                                                                    <div className="flex-1 min-w-0">
                                                                        <h4 className="text-[14px] font-bold text-gray-900 truncate">{post.title || 'Untitled Post'}</h4>
                                                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                                                            {new Date(post.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 shrink-0 ml-2">
                                                                        <button
                                                                            onClick={() => handleStarPost(post.id)}
                                                                            className={`p-2 rounded-xl transition-all active:scale-90 ${post.isStarred ? 'bg-amber-50 text-amber-500' : 'text-gray-300 hover:text-amber-400 hover:bg-amber-50'}`}
                                                                            title={post.isStarred ? 'Remove from Billboard' : 'Set as Billboard'}
                                                                        >
                                                                            <Star className={`w-4 h-4 ${post.isStarred ? 'fill-amber-400' : ''}`} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeletePost(post.id)}
                                                                            className="p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90"
                                                                            title="Delete post"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                {post.images?.length > 0 && (
                                                                    <div className="flex overflow-x-auto gap-1 px-1 pb-1 scrollbar-hide snap-x">
                                                                        {post.images.map((img, idx) => (
                                                                            <div key={idx} className="snap-start shrink-0 w-full aspect-[16/10] bg-gray-100 overflow-hidden">
                                                                                <img src={normalizeImageUrl(img)} className="w-full h-full object-cover" alt="Post" />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {post.isStarred && (
                                                                    <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 flex items-center gap-1.5">
                                                                        <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                                                                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Active Billboard</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                            <Edit className="w-8 h-8 text-gray-200" />
                                                        </div>
                                                        <p className="text-gray-400 text-sm">No posts yet</p>
                                                        <p className="text-[11px] text-gray-400 mt-1">Create your first post above!</p>
                                                    </div>
                                                )}
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
