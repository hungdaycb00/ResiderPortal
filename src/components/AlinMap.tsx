import React, { useState, useEffect, useCallback, useRef } from 'react';
import { normalizeImageUrl, getBaseUrl } from '../services/externalApi';
import { Search, MapPin } from 'lucide-react';
import { useMotionValue, animate } from 'framer-motion';
import { DEGREES_TO_PX, AlinMapProps, getWeatherInfo } from './alinmap/constants';
import MapCanvas from './alinmap/MapCanvas';
import MapControls from './alinmap/MapControls';
import NavigationBar from './alinmap/NavigationBar';
import BottomSheet from './alinmap/BottomSheet';

const AlinMap: React.FC<AlinMapProps> = ({ user, onClose, externalApi, games, friends = [], onOpenChat }) => {
    const API_BASE = getBaseUrl();
    const [position, setPosition] = useState<[number, number] | null>(null);
    const [myObfPos, setMyObfPos] = useState<{ lat: number, lng: number } | null>(null);
    const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'posts' | 'saved'>('info');
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
    const [reportStatus, setReportStatus] = useState("");
    const [friendLocInput, setFriendLocInput] = useState("");
    const [searchMarkerPos, setSearchMarkerPos] = useState<{lat: number, lng: number}|null>(null);
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
    const [notifications, setNotifications] = useState<any[]>([]);

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

    const handleAddFriend = async () => {
        if (!selectedUser) return;
        try {
            alert(`Friend request sent to ${selectedUser.username || selectedUser.id}!`);
        } catch (err: any) {
            if (err.message.includes('409') || err.message.toLowerCase().includes('already')) {
                alert("Request already sent or you are already friends!");
            } else { alert(err.message || "Failed to send friend request."); }
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
            } else { alert(data.error || 'Post creation failed'); }
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

    // Fetch Weather Data
    useEffect(() => {
        if (myObfPos) {
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${myObfPos.lat}&longitude=${myObfPos.lng}&current_weather=true`)
                .then(res => res.json())
                .then(data => {
                    if (data.current_weather) {
                        const { icon, desc } = getWeatherInfo(data.current_weather.weathercode);
                        setWeatherData({ temp: data.current_weather.temperature, desc, icon });
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
        if (mainTab === tabId) { setIsSheetExpanded(!isSheetExpanded); }
        else { setMainTab(tabId as any); setIsSheetExpanded(true); }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="fixed inset-0 z-[100] bg-[#13151a] flex flex-col">
            {/* Header / Search Bar */}
            <div className={`absolute top-12 left-4 right-4 z-[180] flex gap-2 transition-all duration-300 ${isDesktop && isSheetExpanded ? 'md:top-0 md:left-[72px] md:w-[400px] md:bg-white md:pt-5 md:pb-2 md:px-4' : 'md:left-[88px] md:top-6 md:w-[384px]'} ${!isDesktop && isSheetExpanded ? 'opacity-0 pointer-events-none translate-y-[-10px]' : 'opacity-100'}`}>
                <div className={`flex-1 backdrop-blur-xl rounded-full flex items-center px-4 py-3 overflow-hidden transition-all duration-300 ${isDesktop && isSheetExpanded ? 'bg-white border border-gray-200 shadow-none' : 'bg-white/90 shadow-[0_4px_20px_rgba(0,0,0,0.15)]'}`}>
                    <Search className="w-5 h-5 text-gray-500 mr-2 shrink-0" />
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
                    <div className="ml-2 pl-2 border-l border-gray-300 flex items-center gap-1.5 shrink-0 cursor-pointer" onClick={() => handleTabClick('profile')}>
                        <MapPin className="w-4 h-4 text-blue-500" />
                        <span className="text-[10px] text-blue-600 font-bold whitespace-nowrap truncate max-w-[80px] sm:max-w-[100px] hidden sm:block">{currentProvince || 'Locating...'}</span>
                    </div>
                    <button onClick={() => handleTabClick('profile')} className="ml-2 sm:ml-3 shrink-0 active:scale-95 transition-transform overflow-hidden rounded-full border-2 border-blue-500 shadow-sm">
                        <img
                            src={normalizeImageUrl(user?.photoURL) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || myDisplayName)}&background=3b82f6&color=fff&size=100&bold=true`}
                            alt="Me"
                            className="w-7 h-7 object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || myDisplayName)}&background=3b82f6&color=fff&size=100&bold=true`; }}
                        />
                    </button>
                </div>
            </div>

            <MapCanvas
                position={position} isConsentOpen={isConsentOpen} myObfPos={myObfPos} nearbyUsers={nearbyUsers}
                myUserId={myUserId} user={user} myDisplayName={myDisplayName} myStatus={myStatus}
                isVisibleOnMap={isVisibleOnMap} isConnecting={isConnecting} isDesktop={isDesktop}
                currentProvince={currentProvince} galleryActive={galleryActive} galleryTitle={galleryTitle}
                galleryImages={galleryImages} searchTag={searchTag} filterDistance={filterDistance}
                filterAgeMin={filterAgeMin} filterAgeMax={filterAgeMax}
                scale={scale} panX={panX} panY={panY} selfDragX={selfDragX} selfDragY={selfDragY} ws={ws}
                requestLocation={requestLocation} setSelectedUser={setSelectedUser} setActiveTab={setActiveTab}
                setIsSheetExpanded={setIsSheetExpanded} setMyObfPos={setMyObfPos} addLog={addLog} handleWheel={handleWheel}
            />

            <MapControls
                isConnecting={isConnecting} isSidebarOpen={isSidebarOpen} weatherData={weatherData}
                myObfPos={myObfPos} friendLocInput={friendLocInput} filterDistance={filterDistance}
                filterAgeMin={filterAgeMin} filterAgeMax={filterAgeMax} searchTag={searchTag} radius={radius}
                scale={scale} ws={ws}
                setIsSidebarOpen={setIsSidebarOpen} setFriendLocInput={setFriendLocInput} setMyObfPos={setMyObfPos}
                setSearchMarkerPos={setSearchMarkerPos} setFilterDistance={setFilterDistance}
                setFilterAgeMin={setFilterAgeMin} setFilterAgeMax={setFilterAgeMax} setSearchTag={setSearchTag}
                handleRefresh={handleRefresh} handleCenter={handleCenter} handleUpdateRadius={handleUpdateRadius}
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
                ws={ws} panX={panX} panY={panY} scale={scale} externalApi={externalApi} onOpenChat={onOpenChat}
                setSentFriendRequests={setSentFriendRequests} handleUpdateRadius={handleUpdateRadius}
                setIsSheetExpanded={setIsSheetExpanded} setSelectedUser={setSelectedUser} setActiveTab={setActiveTab}
                setMainTab={setMainTab} setSearchTag={setSearchTag} setIsReporting={setIsReporting}
                setReportReason={setReportReason} setReportStatus={setReportStatus}
                setIsEditingStatus={setIsEditingStatus} setIsEditingName={setIsEditingName}
                setStatusInput={setStatusInput} setNameInput={setNameInput} setMyStatus={setMyStatus}
                setMyDisplayName={setMyDisplayName} setIsVisibleOnMap={setIsVisibleOnMap}
                setFriendIdInput={setFriendIdInput} setSocialSection={setSocialSection}
                setIsCreatingPost={setIsCreatingPost} setPostTitle={setPostTitle}
                handleAddFriend={handleAddFriend} handleMessage={handleMessage}
                handleCreatePost={handleCreatePost} handleStarPost={handleStarPost} handleDeletePost={handleDeletePost}
            />
        </div>
    );
};

export default AlinMap;
