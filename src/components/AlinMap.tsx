import React, { useState, useEffect, useCallback, useRef } from 'react';
import { normalizeImageUrl, getBaseUrl } from '../services/externalApi';
import { Search, MapPin, ChevronRight } from 'lucide-react';
import { useMotionValue, animate } from 'framer-motion';
import { DEGREES_TO_PX, AlinMapProps, getWeatherInfo } from './alinmap/constants';
import MapCanvas from './alinmap/MapCanvas';
import MapControls from './alinmap/MapControls';
import NavigationBar from './alinmap/NavigationBar';
import BottomSheet from './alinmap/BottomSheet';
import SeaGameProvider, { useSeaGame } from './alinmap/sea-game/SeaGameProvider';
import SeaGameUI from './alinmap/sea-game/SeaGameUI';

const AlinMapInner: React.FC<AlinMapProps> = ({ 
    user, 
    onClose, 
    externalApi, 
    games, 
    friends = [], 
    onOpenChat, 
    showNotification, 
    initialMainTab = 'discover',
    onTabChange,
    handlePlayGame,
    cloudflareUrl,
    triggerAuth,
    externalOpenList,
    onOpenListChange
}) => {
    const API_BASE = getBaseUrl();
    const [position, setPosition] = useState<[number, number] | null>(null);
    const [myObfPos, setMyObfPos] = useState<{ lat: number, lng: number } | null>(null);
    const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'posts' | 'saved'>('posts');
    const [mainTab, setMainTab] = useState<'discover' | 'friends' | 'profile' | 'notifications' | 'creator' | 'backpack'>(
        (initialMainTab as any) || 'discover'
    );
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
    const [socialSection, setSocialSection] = useState<'friends' | 'nearby' | 'recent' | 'blocked'>('friends');
    const [myDisplayName, setMyDisplayName] = useState(user?.displayName || 'YOU');
    const [myAvatarUrl, setMyAvatarUrl] = useState(user?.photoURL || '');
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, target: 'map' | 'user', data: any } | null>(null);
    const [desktopSearchResults, setDesktopSearchResults] = useState<{ posts: any[], users: any[] }>({ posts: [], users: [] });
    const [isSearchingDesktop, setIsSearchingDesktop] = useState(false);
    const [showDesktopResults, setShowDesktopResults] = useState(false);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [weatherData, setWeatherData] = useState<{ temp: number, desc: string, icon: string, humidity?: number, feelsLike?: number } | null>(null);
    const [isReporting, setIsReporting] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [reportStatus, setReportStatus] = useState("");
    const [friendLocInput, setFriendLocInput] = useState("");
    const [isEditingStatus, setIsEditingStatus] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [statusInput, setStatusInput] = useState("");
    const [nameInput, setNameInput] = useState("");
    const [isVisibleOnMap, setIsVisibleOnMap] = useState(!!user);
    const [currentProvince, setCurrentProvince] = useState<string | null>(null);
    const [mapMode, setMapMode] = useState<'grid' | 'satellite'>('grid');

    // Sea Game Hooks
    const seaGame = useSeaGame();
    const { setIsSeaGameMode, isSeaGameMode, state: seaState, initGame, loadWorldItems } = seaGame;
    const [isSeaLoading, setIsSeaLoading] = useState(false);

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
    const [notifications, setNotifications] = useState<any[]>([]);
    const [searchMarkerPos, setSearchMarkerPos] = useState<{ lat: number; lng: number } | null>(null);

    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (initialMainTab) {
            setMainTab(initialMainTab as any);
            setIsSheetExpanded(true);
        }
    }, [initialMainTab]);

    useEffect(() => {
        if (mainTab === 'backpack' && seaState.initialized && !isSeaGameMode) {
            setIsSeaGameMode(true);
        }
    }, [mainTab, seaState.initialized, isSeaGameMode, setIsSeaGameMode]);
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
        return () => { isMounted.current = false; };
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
        if (myObfPos) fetchProvinceName(myObfPos.lat, myObfPos.lng);
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
        animate(scale, newScale, { type: "spring", damping: 25, stiffness: 200, restDelta: 0.001 });
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
            if (!isMounted.current) { socket.close(); return; }
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
                if (p.status) { setMyStatus(p.status); setStatusInput(p.status); }
                if (p.gallery) {
                    setGalleryTitle(p.gallery.title || '');
                    setGalleryImages(p.gallery.images || []);
                    setGalleryActive(p.gallery.active || false);
                }
                socket.send(JSON.stringify({ type: 'MAP_MOVE', payload: { lat: p.lat, lng: p.lng, zoom: 13 } }));
                addLog(`🔍 Sent MAP_MOVE scan`);
            }
            if (data.type === 'NEARBY_USERS') {
                const users = data.payload.map((u: any) => ({ ...u, isSelf: u.id === myUserId }));
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
                if (selectedUser && !selectedUser.isSelf) {
                    const updated = users.find(u => u.id === selectedUser.id);
                    if (updated) setSelectedUser(updated);
                }
            }
            if (data.type === 'NEW_NOTIFICATION') {
                fetchNotifications();
            }
        };

        socket.onclose = () => {
            if (!isMounted.current) return;
            addLog('🔌 Disconnected, retrying in 3s...');
            setIsConnecting(false);
            setWsStatus('CLOSED');
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = setTimeout(() => { if (isMounted.current) connectWS(); }, 3000);
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
    }, [position]);

    const handleAddFriend = async (targetUser?: any) => {
        const userToAdd = targetUser || selectedUser;
        if (!userToAdd) return;
        try {
            showNotification?.(`Friend request sent to ${userToAdd.username || userToAdd.id}!`, 'success');
        } catch (err: any) {
            if (err.message.includes('409') || err.message.toLowerCase().includes('already')) {
                showNotification?.("Request already sent or you are already friends!", 'info');
            } else { showNotification?.(err.message || "Failed to send friend request.", 'error'); }
        }
    };

    const handleMessage = (targetUser?: any) => {
        const userToMsg = targetUser || selectedUser;
        if (!userToMsg || !onOpenChat) return;
        onOpenChat(userToMsg.id, userToMsg.username || 'User', userToMsg.avatar_url || userToMsg.photoURL || '');
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
                    if (width > height && width > max) { height *= max / width; width = max; }
                    else if (height > max) { width *= max / height; height = max; }
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
                method: 'POST', headers: { 'X-Device-Id': deviceId }, body: formData
            });
            const data = await resp.json();
            if (data.success) {
                setPostTitle('');
                setIsCreatingPost(false);
                fetchUserPosts(myUserId || user?.uid);
                ws.current?.send(JSON.stringify({ type: 'UPDATE_GALLERY' }));
                showNotification?.('Post created successfully!', 'success');
            } else { showNotification?.(data.error || 'Post creation failed', 'error'); }
        } catch (err) { console.error('Create post error:', err); }
        finally { setIsSavingPost(false); }
    };

    const fetchUserPosts = async (userId: string | null | undefined) => {
        if (!userId) return;
        try {
            const endpoint = userId === 'saved' 
                ? `${API_BASE}/api/user/archived-posts` 
                : `${API_BASE}/api/user/${userId}/posts`;
            const resp = await fetch(endpoint, { headers: { 'X-Device-Id': externalApi.getDeviceId() } });
            const data = await resp.json();
            if (data.success) {
                setUserPosts(data.posts);
                const starred = data.posts.find((p: any) => p.isStarred);
                if (starred) { setGalleryActive(true); setGalleryTitle(starred.title || ''); setGalleryImages(starred.images || []); }
                else { setGalleryActive(false); setGalleryTitle(''); setGalleryImages([]); }
            }
        } catch (err) { console.error('Fetch posts error:', err); }
    };

    const handleStarPost = async (postId: string) => {
        const deviceId = externalApi.getDeviceId();
        try {
            const resp = await fetch(`${API_BASE}/api/user/post/${postId}/star`, { method: 'PUT', headers: { 'X-Device-Id': deviceId } });
            const data = await resp.json();
            if (data.success) { fetchUserPosts(myUserId || user?.uid); ws.current?.send(JSON.stringify({ type: 'UPDATE_GALLERY' })); }
        } catch (err) { console.error('Star post error:', err); }
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm('Xoá bài viết này?')) return;
        const deviceId = externalApi.getDeviceId();
        try {
            const resp = await fetch(`${API_BASE}/api/user/post/${postId}`, { method: 'DELETE', headers: { 'X-Device-Id': deviceId } });
            const data = await resp.json();
            if (data.success) { fetchUserPosts(myUserId || user?.uid); ws.current?.send(JSON.stringify({ type: 'UPDATE_GALLERY' })); }
        } catch (err) { console.error('Delete post error:', err); }
    };

    useEffect(() => {
        if (selectedUser) {
            setIsLoadingGames(true);
            setUserPosts([]);
            externalApi.getUserGames(selectedUser.id)
                .then((res: any) => { if (res.success) setUserGames(res.games); })
                .catch(console.error)
                .finally(() => setIsLoadingGames(false));
            const targetId = selectedUser.isSelf ? (myUserId || user?.uid) : selectedUser.id;
            fetchUserPosts(targetId);
        } else { setUserGames([]); }
    }, [selectedUser, externalApi]);

    const fetchNotifications = async () => {
        try {
            const resp = await fetch(`${API_BASE}/api/notifications`, { headers: { 'X-Device-Id': externalApi.getDeviceId() }});
            const data = await resp.json();
            if (data.success) setNotifications(data.notifications);
        } catch (err) { console.error('Fetch notifications error:', err); }
    };

    useEffect(() => {
        if (wsStatus === 'OPEN') fetchNotifications();
    }, [wsStatus]);

    // Fetch Weather Data (temp, humidity, feels-like)
    useEffect(() => {
        if (myObfPos) {
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${myObfPos.lat}&longitude=${myObfPos.lng}&current_weather=true&current=relative_humidity_2m,apparent_temperature`)
                .then(res => res.json())
                .then(data => {
                    if (data.current_weather) {
                        const { icon, desc } = getWeatherInfo(data.current_weather.weathercode);
                        setWeatherData({
                            temp: data.current_weather.temperature,
                            desc,
                            icon,
                            humidity: data.current?.relative_humidity_2m,
                            feelsLike: data.current?.apparent_temperature,
                        });
                    }
                }).catch(err => console.error('Weather fetch error:', err));
        }
    }, [myObfPos]);

    const handleRefresh = () => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN && myObfPos) {
            setIsConnecting(true);
            const scanLng = myObfPos.lng + (-panX.get() / DEGREES_TO_PX);
            const scanLat = myObfPos.lat + (panY.get() / DEGREES_TO_PX);
            ws.current.send(JSON.stringify({ type: 'MAP_MOVE', payload: { lat: scanLat, lng: scanLng, zoom: 13 } }));
            setTimeout(() => setIsConnecting(false), 1000);
        }
    };

    const handleCenter = () => { panX.set(0); panY.set(0); scale.set(1); };
    const handleCenterTo = (lat: number, lng: number) => {
        if (!myObfPos) return;
        const DEGREES_TO_PX = 11100;
        const pxX = (lng - myObfPos.lng) * DEGREES_TO_PX;
        const pxY = -(lat - myObfPos.lat) * DEGREES_TO_PX;
        panX.set(-pxX);
        panY.set(-pxY);
    };

    const handleUpdateRadius = (newRadius: number) => {
        setRadius(newRadius);
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'UPDATE_RADIUS', payload: { radiusKm: newRadius } }));
            setTimeout(handleRefresh, 500);
        }
    };

    // Auto-init
    useEffect(() => {
        if (!position) {
            const hasConsented = localStorage.getItem('alin_location_consent_handled');
            if (hasConsented === 'true') { requestLocation(); }
            else if (!isConsentOpen) { setIsConsentOpen(true); }
        }
    }, [position]);

    // Sync avatar/displayName/province
    useEffect(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN && user) {
            ws.current.send(JSON.stringify({
                type: 'UPDATE_PROFILE',
                payload: { avatar_url: user.photoURL || '', displayName: user.displayName || myDisplayName, province: currentProvince || '' }
            }));
        }
    }, [user?.photoURL, user?.displayName, currentProvince]);

    const handleTabClick = (tabId: string) => {
        setSelectedUser(null);
        if (tabId === 'profile') { setActiveTab('info'); }
        
        if (tabId === 'backpack') {
            setMainTab('backpack');
            setIsSeaGameMode(true);
            setIsSheetExpanded(false); // Mobile: tự hạ tab xuống
            setIsSeaLoading(true);
            
            const doLoad = async () => {
                try {
                    // Check initialization
                    if (!seaState.initialized && myObfPos) {
                        await initGame(myObfPos.lat, myObfPos.lng);
                    }
                    await loadWorldItems();
                } finally {
                    setIsSeaLoading(false);
                }
            };
            doLoad();
            
            // Pan to current boat or current location
            const targetLat = seaState.currentLat || myObfPos?.lat;
            const targetLng = seaState.currentLng || myObfPos?.lng;
            if (targetLat && targetLng) {
                handleCenterTo(targetLat, targetLng);
            }
        } else {
            setIsSeaGameMode(false);
            if (mainTab === tabId) { 
                setIsSheetExpanded(!isSheetExpanded); 
            } else { 
                setMainTab(tabId as any); 
                setIsSheetExpanded(true); 
            }
        }
        
        // Luôn đồng bộ với parent để đảm bảo activeTab ở App.tsx cũng được cập nhật
        if (onTabChange) onTabChange(tabId);
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    useEffect(() => {
        if (!searchTag || searchTag.trim().length < 2 || !isDesktop) {
            setDesktopSearchResults({ posts: [], users: [] });
            setShowDesktopResults(false);
            return;
        }
        setIsSearchingDesktop(true);
        setShowDesktopResults(true);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(async () => {
            try {
                const resp = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(searchTag.trim())}`);
                const data = await resp.json();
                if (data.success) {
                    setDesktopSearchResults({ posts: data.posts, users: data.users });
                }
            } catch (err) { console.error('[Desktop Search]', err); }
            setIsSearchingDesktop(false);
        }, 300);
        return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
    }, [searchTag, isDesktop]);

    return (
        <div className="fixed inset-0 z-[100] bg-[#13151a] flex flex-col select-none">
            {/* Header / Search Bar */}
            <div className={`absolute top-12 left-4 right-4 z-[180] flex gap-2 transition-all duration-300 ${isDesktop && isSheetExpanded ? 'md:top-0 md:left-[72px] md:w-[400px] md:bg-white md:pt-5 md:pb-2 md:px-4' : 'md:left-[88px] md:top-6 md:w-[384px]'} ${!isDesktop && isSheetExpanded ? 'opacity-0 pointer-events-none translate-y-[-10px]' : 'opacity-100'} ${isSeaGameMode ? 'hidden' : ''}`}>
                <div className={`flex-1 backdrop-blur-xl rounded-full flex items-center px-3 md:px-4 py-2 md:py-3 overflow-hidden transition-all duration-300 ${isDesktop && isSheetExpanded ? 'bg-white border border-gray-200 shadow-none' : 'bg-white/70 md:bg-white/90 shadow-md md:shadow-[0_4px_20px_rgba(0,0,0,0.15)]'}`}>
                    <Search className="w-4 h-4 md:w-5 md:h-5 text-gray-500 mr-2 shrink-0" />
                    <input
                        type="text"
                        placeholder="Search..."
                        onFocus={() => {
                            setIsSheetExpanded(true);
                            if (!isDesktop) { setTimeout(() => document.getElementById('sheet-search-mobile')?.focus(), 50); }
                        }}
                        className="bg-transparent border-none outline-none text-gray-900 text-sm w-full placeholder:text-gray-500 font-medium font-sans"
                        value={searchTag}
                        onChange={(e) => setSearchTag(e.target.value)}
                    />

                    {/* Mobile Weather Widget */}
                    {!isDesktop && weatherData && (
                        <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-gray-200 shrink-0">
                            <span className="text-sm">{weatherData.icon}</span>
                            <span className="text-xs font-bold text-gray-700">{weatherData.temp}°C</span>
                        </div>
                    )}
                </div>

                <button onClick={() => handleTabClick('profile')} className="ml-2 sm:ml-3 shrink-0 active:scale-95 transition-transform overflow-hidden rounded-full border-2 border-blue-500 shadow-sm flex-shrink-0 self-center">
                    <img
                        src={normalizeImageUrl(myAvatarUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(myDisplayName)}&background=3b82f6&color=fff&size=100&bold=true`}
                        alt="Me"
                        className="w-8 h-8 md:w-10 md:h-10 object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(myDisplayName)}&background=3b82f6&color=fff&size=100&bold=true`; }}
                    />
                </button>

                {/* Desktop Search Results Dropdown */}
                {showDesktopResults && isDesktop && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-[70vh] overflow-y-auto z-[200]">
                        {isSearchingDesktop ? (
                            <div className="p-8 text-center">
                                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                <p className="text-xs text-gray-400 font-bold">Đang tìm kiếm...</p>
                            </div>
                        ) : (
                            <div className="p-4">
                                {desktopSearchResults.users.length === 0 && desktopSearchResults.posts.length === 0 ? (
                                    <div className="py-8 text-center text-gray-400">
                                        <p className="text-sm">Không tìm thấy kết quả nào</p>
                                    </div>
                                ) : (
                                    <>
                                        {desktopSearchResults.users.length > 0 && (
                                            <div className="mb-4">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Users</p>
                                                {desktopSearchResults.users.map((u: any) => (
                                                    <div key={u.id} onClick={() => { setSelectedUser(u); setShowDesktopResults(false); }} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors group">
                                                        <img src={normalizeImageUrl(u.avatar) || `https://ui-avatars.com/api/?name=${u.displayName}&background=3b82f6&color=fff`} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                                                        <div className="flex-1">
                                                            <p className="text-sm font-bold text-gray-900">{u.displayName}</p>
                                                            <p className="text-[11px] text-gray-500 truncate">{u.status || 'No status'}</p>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {desktopSearchResults.posts.length > 0 && (
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Posts</p>
                                                {desktopSearchResults.posts.map((p: any) => (
                                                    <div key={p.id} onClick={() => { setSelectedUser(p.author); setActiveTab('posts'); setShowDesktopResults(false); }} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors group">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                                                            {p.images?.[0] ? <img src={normalizeImageUrl(p.images[0])} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">📄</div>}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-bold text-gray-900 line-clamp-1">{p.title}</p>
                                                            <p className="text-[11px] text-gray-500">{p.author?.name} • {p.likeCount} ❤️</p>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <MapCanvas
                position={position} isConsentOpen={isConsentOpen} myObfPos={myObfPos} nearbyUsers={nearbyUsers}
                myUserId={myUserId} user={user} myDisplayName={myDisplayName} myStatus={myStatus}
                isVisibleOnMap={isVisibleOnMap} isConnecting={isConnecting} isDesktop={isDesktop}
                currentProvince={currentProvince} galleryActive={galleryActive} galleryTitle={galleryTitle}
                galleryImages={galleryImages} searchTag={searchTag} filterDistance={filterDistance}
                filterAgeMin={filterAgeMin} filterAgeMax={filterAgeMax} searchMarkerPos={searchMarkerPos}
                scale={scale} panX={panX} panY={panY} selfDragX={selfDragX} selfDragY={selfDragY} ws={ws}
                requestLocation={requestLocation} setSelectedUser={setSelectedUser} setActiveTab={setActiveTab}
                setIsSheetExpanded={setIsSheetExpanded} setMyObfPos={setMyObfPos} addLog={addLog} handleWheel={handleWheel}
                mapMode={mapMode}
                setContextMenu={setContextMenu}
                isSeaGameMode={isSeaGameMode}
                seaState={seaState}
                seaGameCtx={seaGame}
                isSeaLoading={isSeaLoading}
                setMainTab={setMainTab}
            />

            <MapControls
                isConnecting={isConnecting} isSidebarOpen={isSidebarOpen} weatherData={weatherData} currentProvince={currentProvince}
                myObfPos={myObfPos} friendLocInput={friendLocInput} filterDistance={filterDistance}
                filterAgeMin={filterAgeMin} filterAgeMax={filterAgeMax} searchTag={searchTag} radius={radius}
                scale={scale} ws={ws} mapMode={mapMode}
                setIsSidebarOpen={setIsSidebarOpen} setFriendLocInput={setFriendLocInput} setMyObfPos={setMyObfPos}
                setSearchMarkerPos={setSearchMarkerPos} setFilterDistance={setFilterDistance}
                setFilterAgeMin={setFilterAgeMin} setFilterAgeMax={setFilterAgeMax} setSearchTag={setSearchTag}
                handleRefresh={handleRefresh} handleCenter={handleCenter} handleCenterTo={handleCenterTo} handleUpdateRadius={handleUpdateRadius}
                setMapMode={setMapMode}
                isSeaGameMode={isSeaGameMode}
            />

            <NavigationBar mainTab={mainTab} selectedUser={selectedUser} isDesktop={isDesktop} unreadCount={unreadCount} handleTabClick={handleTabClick} />

            <BottomSheet
                isDesktop={isDesktop} isSheetExpanded={isSheetExpanded} selectedUser={selectedUser}
                activeTab={activeTab} mainTab={mainTab} nearbyUsers={nearbyUsers} friends={friends}
                games={games} userGames={userGames} userPosts={userPosts} myUserId={myUserId}
                myDisplayName={myDisplayName} myStatus={myStatus} myObfPos={myObfPos} user={user}
                searchTag={searchTag} isReporting={isReporting} reportReason={reportReason}
                reportStatus={reportStatus} sentFriendRequests={sentFriendRequests}
                isEditingStatus={isEditingStatus} isEditingName={isEditingName} statusInput={statusInput}
                nameInput={nameInput} isVisibleOnMap={isVisibleOnMap} friendIdInput={friendIdInput}
                socialSection={socialSection} isCreatingPost={isCreatingPost} postTitle={postTitle}
                isSavingPost={isSavingPost} galleryActive={galleryActive} currentProvince={currentProvince}
                radius={radius} notifications={notifications} fetchNotifications={fetchNotifications} fetchUserPosts={fetchUserPosts}
                showNotification={showNotification}
                ws={ws} panX={panX} panY={panY} scale={scale} externalApi={externalApi} onOpenChat={onOpenChat}
                setSentFriendRequests={setSentFriendRequests} handleUpdateRadius={handleUpdateRadius}
                setIsSheetExpanded={setIsSheetExpanded} setSelectedUser={setSelectedUser} setActiveTab={setActiveTab}
                setMainTab={setMainTab} setSearchTag={setSearchTag} setIsReporting={setIsReporting}
                setReportReason={setReportReason} setReportStatus={setReportStatus}
                setIsEditingStatus={setIsEditingStatus} setIsEditingName={setIsEditingName}
                setStatusInput={setStatusInput} setNameInput={setNameInput} setMyStatus={setMyStatus}
                setMyDisplayName={setMyDisplayName} setIsVisibleOnMap={setIsVisibleOnMap}
                myAvatarUrl={myAvatarUrl} setMyAvatarUrl={setMyAvatarUrl}
                setFriendIdInput={setFriendIdInput} setSocialSection={setSocialSection}
                setIsCreatingPost={setIsCreatingPost} setPostTitle={setPostTitle}
                handleAddFriend={handleAddFriend} handleMessage={handleMessage}
                handleCreatePost={handleCreatePost} handleStarPost={handleStarPost} handleDeletePost={handleDeletePost}
                handlePlayGame={handlePlayGame}
                cloudflareUrl={cloudflareUrl}
                triggerAuth={triggerAuth}
                externalOpenList={externalOpenList}
                onOpenListChange={onOpenListChange}
                onPublishSuccess={handleRefresh}
            />

            {/* Context Menu Overlay */}
            {contextMenu && (
                <>
                    <div 
                        className="fixed inset-0 z-[998]" 
                        onClick={() => setContextMenu(null)} 
                        onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} 
                    />
                    
                    <div 
                        className="fixed z-[999] bg-[#1a1d24] border border-gray-700/50 rounded-xl shadow-2xl py-2 min-w-[180px] overflow-hidden backdrop-blur-md"
                        style={{ top: Math.min(contextMenu.y, window.innerHeight - 150), left: Math.min(contextMenu.x, window.innerWidth - 180) }}
                    >
                        {contextMenu.target === 'map' ? (
                            <button 
                                className="w-full text-left px-4 py-3 hover:bg-gray-800 text-sm text-gray-200 font-medium transition-colors flex items-center gap-3"
                                onClick={() => {
                                    setMyObfPos({ lat: contextMenu.data.lat, lng: contextMenu.data.lng });
                                    panX.set(0);
                                    panY.set(0);
                                    if (ws.current?.readyState === WebSocket.OPEN) {
                                        ws.current.send(JSON.stringify({
                                            type: 'MAP_MOVE',
                                            payload: { lat: contextMenu.data.lat, lng: contextMenu.data.lng, zoom: 13 }
                                        }));
                                    }
                                    setContextMenu(null);
                                }}
                            >
                                <span className="text-lg">📍</span> Dịch chuyển đến đây
                            </button>
                        ) : (
                            <>
                                <div className="px-4 py-2 border-b border-gray-800 mb-1">
                                    <p className="text-xs font-bold text-gray-400 truncate w-full">{contextMenu.data.username}</p>
                                </div>
                                <button 
                                    className="w-full text-left px-4 py-2 hover:bg-gray-800 text-sm text-gray-200 font-medium transition-colors flex items-center gap-3"
                                    onClick={() => {
                                        setSelectedUser(contextMenu.data);
                                        setContextMenu(null);
                                        setTimeout(() => handleAddFriend(contextMenu.data), 100);
                                    }}
                                >
                                    <span className="text-lg">👋</span> Kết bạn
                                </button>
                                <button 
                                    className="w-full text-left px-4 py-2 hover:bg-gray-800 text-sm text-gray-200 font-medium transition-colors flex items-center gap-3"
                                    onClick={() => {
                                        setSelectedUser(contextMenu.data);
                                        setContextMenu(null);
                                        setTimeout(() => handleMessage(contextMenu.data), 100);
                                    }}
                                >
                                    <span className="text-lg">💬</span> Nhắn tin
                                </button>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

const AlinMap: React.FC<AlinMapProps> = (props) => {
    return (
        <SeaGameProvider deviceId={props.externalApi.getDeviceId()}>
            <SeaGameUI />
            <AlinMapInner {...props} />
        </SeaGameProvider>
    );
};

export default AlinMap;
