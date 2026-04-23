/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Menu, Home, Grid, Users, HelpCircle, Play, ChevronDown, ChevronLeft, ChevronRight, X, LogIn, LogOut, Sword, Shield, Brain, Zap, Trophy, MessageSquare, Mail, MessageCircle, Layout, RefreshCw, Plus, Gamepad2, Filter, Trash2, Book, Star, Coins, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { externalApi, normalizeImageUrl } from './services/externalApi';
import { initSocket, disconnectSocket, getSocket } from './utils/socket';
import { setupSocketErrorHandlers } from './utils/socketErrorHandler';
import { User } from './types';
import { games, createGameUrl } from './constants';

// Components
import GameCard from './components/GameCard';
import MultiTaskButton from './components/MultiTaskButton';
import ConfirmModal from './components/ConfirmModal';
import GameListModal from './components/GameListModal';
import ImageGeneratorModal from './components/ImageGeneratorModal';
import AdminView from './components/AdminView';
import FriendsModal from './components/FriendsModal';
import ChatRoom from './components/ChatRoom';
import UserInfoModal from './components/UserInfoModal';
import GameSlider from './components/GameSlider';
import AuthModal from './components/AuthModal';
import RoomListModal from './components/RoomListModal';
import AlinMap from './components/AlinMap';

import AppHeader from './components/AppHeader';
import HomeTab from './components/tabs/HomeTab';
import CategoriesTab from './components/tabs/CategoriesTab';
import CommunityTab from './components/tabs/CommunityTab';
import SupportTab from './components/tabs/SupportTab';
import ReviewModal from './components/ReviewModal';
import GameIFrame from './components/GameIFrame';


export type { User };

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAuthCallbackQueue, setAuthCallbackQueue] = useState<(()=>void) | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<string | number | null>(null);
  const [isGameListOpen, setIsGameListOpen] = useState(false);
  const [cloudflareUrl, setCloudflareUrl] = useState(() => {
    const saved = localStorage.getItem('cloudflareUrl');
    // If running on tunnel, prioritize current origin
    if (window.location.hostname.endsWith('.trycloudflare.com')) {
      return window.location.origin;
    }
    return saved || import.meta.env.VITE_EXTERNAL_API_URL || 'http://localhost:3000';
  });

  useEffect(() => {
    localStorage.setItem('cloudflareUrl', cloudflareUrl);
    // If URL changes, check server immediately
    checkServer(cloudflareUrl);
  }, [cloudflareUrl]);
  const [playingGame, setPlayingGame] = useState<{ title: string, gameUrl: string } | null>(null);
  const [isGameLoading, setIsGameLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [serverError, setServerError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'categories' | 'community' | 'support' | 'chat' | 'friends' | 'admin' | 'creator' | 'alin'>('home');
  const [fetchedGames, setFetchedGames] = useState<any[]>([]);
  const [fetchedFriends, setFetchedFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const lastSocketUrlRef = useRef<string | null>(null);
  const [friendInput, setFriendInput] = useState('');
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>(() => {
    const saved = localStorage.getItem('recentlyPlayed');
    return saved ? JSON.parse(saved) : [];
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatTargetUser, setChatTargetUser] = useState<{ id: string, name: string, avatarUrl?: string } | null>(null);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);
  const [isMyGamesOverlayOpen, setIsMyGamesOverlayOpen] = useState(false);
  const [userStats, setUserStats] = useState<{ gold: number, level: number, xp: number, rankScore: number } | null>(null);

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewGameId, setReviewGameId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  
  // Multiplayer Room State
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [selectedRoomGame, setSelectedRoomGame] = useState<any>(null);
  const [currentJoinedRoomId, setCurrentJoinedRoomId] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Hero Carousel State

  const AVAILABLE_CATEGORIES = [
    { id: 'puzzle', name: 'Puzzle', icon: <Brain className="w-3 h-3" /> },
    { id: 'action', name: 'Action', icon: <Sword className="w-3 h-3" /> },
    { id: 'strategy', name: 'Strategy', icon: <Shield className="w-3 h-3" /> },
    { id: 'racing', name: 'Racing', icon: <Zap className="w-3 h-3" /> },
    { id: 'rpg', name: 'RPG', icon: <Trophy className="w-3 h-3" /> },
    { id: 'multiplayer', name: 'Multiplayer', icon: <Users className="w-3 h-3" /> },
    { id: 'simulation', name: 'Simulation', icon: <Layout className="w-3 h-3" /> },
    { id: 'arcade', name: 'Arcade', icon: <Gamepad2 className="w-3 h-3" /> },
    { id: 'sports', name: 'Sports', icon: <Zap className="w-3 h-3" /> },
    { id: 'education', name: 'Education', icon: <Book className="w-3 h-3" /> },
    { id: 'adventure', name: 'Adventure', icon: <Sword className="w-3 h-3" /> },
  ];

  const filteredGames = (fetchedGames || []).concat(games).filter(game => {
    const title = (game.title || game.name || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesQuery = title.includes(query);

    // Check categories
    const gameCat = (game.category || '').toLowerCase();
    // Some games might have category keywords in title
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.some(cat =>
      gameCat.includes(cat.toLowerCase()) || title.includes(cat.toLowerCase())
    );

    return matchesQuery && matchesCategory;
  });

  // Check if any filter is active
  const isSearchActive = searchQuery.length > 0 || selectedCategories.length > 0;

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Ref to ensure GSI is initialized only once
  const gsiInitialized = useRef(false);

  const handleCredentialResponse = useCallback(async (response: any) => {
    try {
      if (serverStatus !== 'online') {
        showNotification('Could not connect to server for login.', 'error');
        return;
      }
      const result = await externalApi.syncGoogleLogin(response.credential);
      if (result.success && result.user) {
        const loggedInUser: User = {
          uid: result.user.id || result.user.uid,
          email: result.user.email,
          displayName: result.user.display_name || result.user.displayName,
          photoURL: normalizeImageUrl(result.user.photoURL || result.user.avatar_url),
        };
        setUser(loggedInUser);
        localStorage.setItem('user', JSON.stringify(loggedInUser));
        showNotification('Login successful!', 'success');
      }
    } catch (error: any) {
      showNotification('Login failed: ' + (error.message || 'Unknown error'), 'error');
    }
  }, [serverStatus, showNotification]);

  const login = () => {
    // Google Sign-In is usually handled by the GSI button in the modal
    showNotification('Please use the Sign In button in the profile.', 'info');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    externalApi.clearDeviceId();
    showNotification('Logged out successfully', 'info');
    setIsUserInfoOpen(false);
    window.location.reload();
  };

  const handleUpdateAvatar = async (url: string) => {
    if (!user) return;
    try {
      await externalApi.syncUser({
        uid: user.uid,
        displayName: user.displayName,
        photoURL: url,
        email: user.email
      });
      setUser(prev => prev ? { ...prev, photoURL: url } : null);
      showNotification('Avatar updated!', 'success');
    } catch (err) {
      showNotification('Failed to update avatar', 'error');
    }
  };

  const initializeGSI = useCallback(() => {
    if (gsiInitialized.current) return; // Skip if already initialized
    if (!window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: '681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com',
      callback: handleCredentialResponse,
      cancel_on_tap_outside: false
    });
    gsiInitialized.current = true;
    console.log('✅ GSI initialized once');
  }, [handleCredentialResponse]);

  const handleLogin = () => {
    if (window.google?.accounts?.id) {
      // Ensure GSI is initialized before prompting
      initializeGSI();

      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          const reason = notification.getNotDisplayedReason();
          if (reason === 'origin_not_allowed') {
            showNotification('Auth Error: Current URL is not whitelisted in Google Console.', 'error');
          } else {
            showNotification('Login popup blocked or not displayed. Try again later.', 'info');
          }
        }
      });
    } else {
      showNotification('Google Sign-In not ready. Please reload the page.', 'error');
    }
  };

  const fetchExternalData = async (retry = true) => {
    if (serverStatus === 'online') {
      try {
        const profile = await externalApi.request<{ success: boolean, user: any }>('/api/profile');
        if (profile.success && profile.user) {
          setUserStats({
            gold: profile.user.gold || 0,
            level: profile.user.level || 1,
            xp: profile.user.xp || 0,
            rankScore: profile.user.balance || 0
          });
          
          // Update photoURL if it changed on server
          if (profile.user.avatar_url) {
            const normalizedAvatar = normalizeImageUrl(profile.user.avatar_url);
            setUser(prev => prev ? { ...prev, photoURL: normalizedAvatar, displayName: profile.user.display_name || prev.displayName } : null);
          }
        }
        const gamesData = await externalApi.listServer();
        if (gamesData && Array.isArray(gamesData.games)) {
          const normalized = gamesData.games.map(g => ({
            ...g,
            image: normalizeImageUrl(g.image)
          }));
          setFetchedGames(normalized);
        }
      } catch (err) {
        console.warn("Failed to fetch games/profile:", err);
      }

      try {
        const friendsData = await externalApi.getFriends();
        if (friendsData && friendsData.success) {
          const normalizedFriends = (friendsData.friends || []).map((f: any) => ({
            ...f,
            photoURL: normalizeImageUrl(f.photoURL || f.avatar_url)
          }));
          const normalizedRequests = (friendsData.requests || []).map((r: any) => ({
            ...r,
            photoURL: normalizeImageUrl(r.photoURL || r.avatar_url)
          }));
          setFetchedFriends(normalizedFriends);
          setFriendRequests(normalizedRequests);
        }
      } catch (err: any) {
        if (retry && err.message.toLowerCase().includes('user not found')) {
          externalApi.clearDeviceId();
          fetchExternalData(false);
          return;
        }
        console.warn("Failed to fetch friends:", err);
      }
    }
  };

  useEffect(() => {
    if (serverStatus === 'online') {
      fetchExternalData();
    }
  }, [serverStatus, activeTab, isGameListOpen]);

  // Validate recentlyPlayed when fetchedGames changes (remove deleted games)
  useEffect(() => {
    if (fetchedGames.length > 0 && recentlyPlayed.length > 0) {
      const baseUrl = cloudflareUrl.endsWith('/') ? cloudflareUrl.slice(0, -1) : cloudflareUrl;
      const validGames = recentlyPlayed.map(recent => {
        // Find matching fetched game to get latest image/metadata
        const fetchedMatch = fetchedGames.find(f => (f.id || f.title) === (recent.id || recent.title));
        if (fetchedMatch) {
          return { ...recent, image: fetchedMatch.image };
        }
        
        // If it's a hardcoded game or doesn't have a relative path, keep it
        if (!recent.id || (typeof recent.id === 'number' && recent.id <= 6) || recent.id === 'quiz-game-root') {
          return recent;
        }

        // If it has a relative path but no match (maybe offline?), normalize it anyway if possible
        if (recent.image && !recent.image.startsWith('http') && !recent.image.startsWith('data:') && !recent.image.startsWith('blob:')) {
          return { ...recent, image: normalizeImageUrl(recent.image) };
        }

        return recent;
      }).filter(recent => {
        // Keep internal hardcoded games
        if (!recent.id || (typeof recent.id === 'number' && recent.id <= 6)) return true;
        if (recent.id === 'quiz-game-root') return true;
        
        // Check if exists in fetchedGames
        return fetchedGames.some(f => (f.id || f.title) === (recent.id || recent.title));
      });
      
      if (JSON.stringify(validGames) !== JSON.stringify(recentlyPlayed)) {
        console.log(`[RecentlyPlayed] Updated/Validated recently played list`);
        setRecentlyPlayed(validGames);
        localStorage.setItem('recentlyPlayed', JSON.stringify(validGames));
      }
    }
  }, [fetchedGames, cloudflareUrl]);

  const checkServer = async (url?: string) => {
    setServerStatus('checking');
    const result = await externalApi.checkStatus(url);
    setServerStatus(result.status);
    setServerError(result.message || null);

    if (result.status === 'offline' && result.message === 'Proxy unreachable' && cloudflareUrl) {
      setCloudflareUrl('');
    }
  };

  useEffect(() => {
    if (activeTab === 'home' && playingGame) {
      setPlayingGame(null);
    }
  }, [activeTab]);

  // TẦNG 3: SUPERVISOR SCRIPT - Theo dõi FPS và tự động Kill IFrame nếu Game ngốn CPU
  useEffect(() => {
    if (!playingGame) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let lowFpsStreak = 0;
    let animationId: number;

    const monitorFPS = () => {
      const now = performance.now();
      frameCount++;

      if (now - lastTime >= 1000) {
        const fps = frameCount;
        frameCount = 0;
        lastTime = now;

        // Nếu FPS < 15 liên tục trong 3 chu kỳ (3 giây), đóng game
        if (fps < 15) {
          lowFpsStreak++;
          if (lowFpsStreak >= 3) {
            console.error("[Supervisor] Phát hiện treo trình duyệt hoặc CPU nghẽn. Tiêu diệt iFrame.");
            setPlayingGame(null);
            showNotification('Game đã bị tắt tự động do gây quá tải hệ thống (FPS Drop).', 'error');
            return; // Dừng vòng lặp giám sát
          }
        } else {
          lowFpsStreak = 0;
        }
      }
      animationId = requestAnimationFrame(monitorFPS);
    };

    animationId = requestAnimationFrame(monitorFPS);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [playingGame]);

  useEffect(() => {
    // Check tunnel on page load
    if (window.location.hostname.endsWith('.trycloudflare.com') && cloudflareUrl !== window.location.origin) {
      setCloudflareUrl(window.location.origin);
    }

    checkServer(cloudflareUrl);
    const interval = setInterval(() => {
      checkServer(cloudflareUrl);
      // Heartbeat: Fetch data periodically every 30s to keep tunnel active
      if (serverStatus === 'online') {
        fetchExternalData();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [cloudflareUrl]);

  useEffect(() => {
    // Only re-init socket if cloudflareUrl actually changed from what we last connected with
    if (cloudflareUrl !== lastSocketUrlRef.current) {
      console.log(`🔌 URL Changed: ${lastSocketUrlRef.current} -> ${cloudflareUrl}. Re-initializing socket...`);
      lastSocketUrlRef.current = cloudflareUrl;
      disconnectSocket();
      initSocket();
      setupSocketErrorHandlers();
    }
  }, [cloudflareUrl]);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch (e) { console.error("Failed to parse saved user", e); }
    }
  }, []);

  // --- Multiplayer P2P Logic ---

  // 1. Listen for HOST_LEFT event from Socket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleHostLeft = (data: any) => {
      if (currentJoinedRoomId) {
        showNotification(data.message || 'Host has left. Returning to lobby.', 'info');
        setPlayingGame(null);
        setCurrentJoinedRoomId(null);
        // If we were in a room, reopen the lobby modal
        if (selectedRoomGame) {
          setIsRoomModalOpen(true);
        }
      }
    };

    socket.on('HOST_LEFT', handleHostLeft);
    return () => socket.off('HOST_LEFT', handleHostLeft);
  }, [currentJoinedRoomId, selectedRoomGame]);

  // 2. Heartbeat logic for Host
  useEffect(() => {
    if (!currentJoinedRoomId || !playingGame || !playingGame.gameUrl.includes('isHost=true')) return;

    const interval = setInterval(async () => {
      try {
        await externalApi.sendHeartbeat(currentJoinedRoomId, {
          hostId: externalApi.getDeviceId(),
          members: [{ id: user?.uid || externalApi.getDeviceId(), name: user?.displayName || 'Host' }]
        });
      } catch (e) {
        console.error('[Heartbeat] Failed:', e);
      }
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [currentJoinedRoomId, playingGame, user]);

  // 3. Listen for messages from Game IFrame (e.g. member list updates)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security check: only trust our current game URL origin
      if (playingGame && event.data?.type === 'P2P_MEMBERS_UPDATE') {
        const members = event.data.members;
        if (currentJoinedRoomId && Array.isArray(members) && playingGame.gameUrl.includes('isHost=true')) {
          // Immediate heartbeat with fresh member list
          externalApi.sendHeartbeat(currentJoinedRoomId, {
            hostId: externalApi.getDeviceId(),
            members: members
          }).catch(e => console.error('[MemberUpdate] Heartbeat failed:', e));
        }
      } else if (playingGame && event.data?.type === 'SYNC_GOLD' && typeof event.data.gold === 'number') {
        // Instant gold update from iframe game (e.g. QuizGame)
        setUserStats(prev => prev ? { ...prev, gold: event.data.gold } : null);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [playingGame, currentJoinedRoomId]);

  // 4. Leave room on game close
  useEffect(() => {
    if (!playingGame && currentJoinedRoomId) {
      externalApi.leaveP2PRoom(currentJoinedRoomId).catch(() => {});
      setCurrentJoinedRoomId(null);
    }
  }, [playingGame, currentJoinedRoomId]);

  const handleAddFriend = async () => {
    if (!friendInput.trim()) return;
    if (user && user.uid === friendInput.trim()) {
      showNotification('You cannot send a friend request to yourself.', 'error');
      return;
    }
    try {
      await externalApi.addFriend(friendInput);
      showNotification('Friend request sent!', 'success');
      setFriendInput('');
      fetchExternalData();
    } catch (err: any) { showNotification(err.message, 'error'); }
  };

  const handleAcceptFriend = async (targetId: string) => {
    try {
      await externalApi.acceptFriend(targetId);
      showNotification('Friend request accepted!', 'success');
      fetchExternalData();
    } catch (err: any) { showNotification(err.message, 'error'); }
  };

  const handleRejectFriend = async (targetId: string) => {
    try {
      await externalApi.rejectFriend(targetId);
      showNotification('Friend request rejected!', 'success');
      fetchExternalData();
    } catch (err: any) { showNotification(err.message, 'error'); }
  };

  const handleRemoveFriend = async (targetId: string) => {
    try {
      await externalApi.removeFriend(targetId);
      showNotification('Friend removed!', 'success');
      fetchExternalData();
    } catch (err: any) { showNotification(err.message, 'error'); }
  };

  const handleDeleteGame = async (gameId: string | number) => {
    setGameToDelete(gameId);
    setIsConfirmOpen(true);
  };

  const handlePlayGame = async (game: any, bypassLobby: boolean = false) => {
    // Check if game is multiplayer and should show lobby first
    // All games served from the same server (via Cloudflare Tunnel) are VPS-authoritative.
    // They have their own server-side matchmaking, so bypass the P2P lobby.
    const isAccessingViaTunnel = cloudflareUrl && (
      cloudflareUrl.includes('.trycloudflare.com') || 
      cloudflareUrl.includes('alin.city') ||
      cloudflareUrl.includes('.pages.dev')
    );
    const isVpsGame = game.tunnel_url || game.category?.toLowerCase().includes('vps') || isAccessingViaTunnel;
    
    if (!bypassLobby && game.category?.toLowerCase().includes('multiplayer')) {
      // If it's a VPS-authoritative game, we skip the Room List Modal entirely
      if (isVpsGame) {
        console.log(`[Portal] Authoritative/VPS game detected (${game.title}). Bypassing lobby.`);
        handlePlayGame(game, true);
        return;
      }

      if (!user) {
        setAuthCallbackQueue(() => {
          setSelectedRoomGame(game);
          setIsRoomModalOpen(true);
        });
        setIsAuthOpen(true);
        return;
      }
      setSelectedRoomGame(game);
      setIsRoomModalOpen(true);
      return;
    }

    if (!game.id || (typeof game.id === 'number' && game.id <= 6)) {
      setPlayingGame({
        title: game.title || game.name,
        gameUrl: game.gameUrl || createGameUrl(game.title || game.name)
      });
      return;
    }

    if (!game.id) {
      showNotification('Error: Game ID not found.', 'error');
      return;
    }

    const targetUrl = cloudflareUrl || import.meta.env.VITE_EXTERNAL_API_URL || '';
    const baseUrl = targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl;
    const gamePath = game.fileName || `${game.id}/index.html`;

    // Pass current deviceId and tunnel_url to the game for synchronization
    const deviceId = externalApi.getDeviceId();
    let gameUrl = `${baseUrl}/games/${gamePath}${gamePath.includes('?') ? '&' : '?'}deviceId=${encodeURIComponent(deviceId)}`;
    
    if (game.tunnel_url) {
      gameUrl += `&tunnel_url=${encodeURIComponent(game.tunnel_url)}`;
    }

    setPlayingGame({
      title: game.title || game.name,
      gameUrl: gameUrl
    });

    // Set review game ID for later feedback
    setReviewGameId(game.id.toString());

    // Update Recently Played
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(p => (p.id || p.title) !== (game.id || game.title));
      const updated = [game, ...filtered].slice(0, 10);
      localStorage.setItem('recentlyPlayed', JSON.stringify(updated));
      return updated;
    });
  };

  const closeGame = () => {
    if (!playingGame) return;

    const playTime = Math.floor((Date.now() - gameStartTime) / 1000);
    const hasRated = localStorage.getItem(`rated_game_${reviewGameId}`);

    // If played > 15 seconds and hasn't rated yet, show feedback modal
    if (playTime > 15 && !hasRated) {
      setReviewRating(0);
      setReviewHover(0);
      setReviewComment('');
      setShowReviewModal(true);
    }

    setPlayingGame(null);
  };


  const confirmDeleteGame = async () => {
    if (!gameToDelete) return;
    try {
      await externalApi.deleteGame(gameToDelete);
      showNotification('Game deleted successfully!', 'success');
      fetchExternalData();
    } catch (err: any) {
      showNotification('Error deleting game: ' + err.message, 'error');
    }
    setGameToDelete(null);
  };

  return (
    <div className="min-h-screen bg-[#13151a] text-white font-sans pb-16 md:pb-0 relative overflow-x-hidden">
      {/* Premium Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse-slow" />
        <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] bg-purple-600/10 blur-[100px] rounded-full animate-drift" />
        <div className="absolute top-[40%] left-[20%] w-[20%] h-[20%] bg-indigo-600/5 blur-[80px] rounded-full animate-pulse-slow" />
      </div>

      {/* Header */}
            <AppHeader
        user={user}
        userStats={userStats}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isFilterExpanded={isFilterExpanded}
        setIsFilterExpanded={setIsFilterExpanded}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        isSearchActive={isSearchActive}
        AVAILABLE_CATEGORIES={AVAILABLE_CATEGORIES}
        isUserInfoOpen={isUserInfoOpen}
        setIsUserInfoOpen={setIsUserInfoOpen}
        setIsAuthOpen={setIsAuthOpen}
        logout={logout}
        handleUpdateAvatar={handleUpdateAvatar}
        setIsMyGamesOverlayOpen={setIsMyGamesOverlayOpen}
      />

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-4 py-4 md:py-8">
        {activeTab === 'home' && (
          <HomeTab
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            isSearchActive={isSearchActive}
            filteredGames={filteredGames}
            fetchedGames={fetchedGames}
            recentlyPlayed={recentlyPlayed}
            handlePlayGame={handlePlayGame}
            AVAILABLE_CATEGORIES={AVAILABLE_CATEGORIES}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesTab
            fetchedGames={fetchedGames}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'community' && (
          <CommunityTab
            fetchedFriends={fetchedFriends}
            fetchExternalData={fetchExternalData}
          />
        )}

        {activeTab === 'support' && (
          <SupportTab />
        )}

        {activeTab === 'chat' && null}

        {activeTab === 'friends' && null}

        {activeTab === 'admin' && (
          <AdminView
            games={fetchedGames}
            onDeleteGame={handleDeleteGame}
            onPlayGame={handlePlayGame}
            onRefresh={fetchExternalData}
          />
        )}
      </main>

      {/* Final Checkpoint: MultiTask & Modals */}
      <AnimatePresence>
        {(activeTab === 'alin' || activeTab === 'notifications' || activeTab === 'creator') && (
          <AlinMap 
            user={user} 
            onClose={() => setActiveTab('home')} 
            externalApi={externalApi}
            games={fetchedGames}
            handlePlayGame={handlePlayGame}
            showNotification={showNotification}
            friends={fetchedFriends}
            initialMainTab={activeTab === 'notifications' ? 'notifications' : activeTab === 'creator' ? 'creator' : 'discover'}
            onTabChange={(tab) => setActiveTab(tab as any)}
            cloudflareUrl={cloudflareUrl}
            triggerAuth={(callback) => {
              setAuthCallbackQueue(() => callback);
              setIsAuthOpen(true);
            }}
            externalOpenList={isMyGamesOverlayOpen}
            onOpenListChange={setIsMyGamesOverlayOpen}
            onOpenChat={(id: string, name: string, avatar?: string) => {
              setChatTargetUser({ id, name, avatarUrl: avatar });
              setIsChatOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      <MultiTaskButton 
        className="z-[9999]"
        activeTab={activeTab} 
        isInGame={!!playingGame}
        onFeedback={() => {
          setReviewRating(0);
          setReviewHover(0);
          setReviewComment('');
          setShowReviewModal(true);
        }}
        setActiveTab={(id) => {
          if (id === 'home' && playingGame) {
            closeGame();
            return;
          }
          
          if (id === 'chat') {
            setIsChatOpen(prev => !prev);
            setIsFriendsOpen(false);
            setIsUserInfoOpen(false);
          } else if (id === 'friends') {
            setIsFriendsOpen(prev => !prev);
            setIsChatOpen(false);
            setIsUserInfoOpen(false);
          } else {
            setActiveTab(id);
            if (playingGame) closeGame();
            setIsChatOpen(false);
            setIsFriendsOpen(false);
            setIsUserInfoOpen(false);
          }
        }} 
      />



      <FriendsModal
        isOpen={isFriendsOpen}
        onClose={() => setIsFriendsOpen(false)}
        friends={fetchedFriends}
        requests={friendRequests}
        onAddFriend={async (targetId) => {
          await externalApi.addFriend(targetId);
          fetchExternalData();
          return { success: true, message: 'Friend request sent!' };
        }}
        onAccept={handleAcceptFriend}
        onReject={handleRejectFriend}
        onRemove={handleRemoveFriend}
        onRefresh={fetchExternalData}
      />

      <AnimatePresence>
        {isChatOpen && (
          <div className="fixed inset-0 z-[260] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl h-[80vh] bg-[#1a1d24] border border-gray-800 rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="absolute top-6 right-6 z-10">
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="p-2 bg-gray-800/80 hover:bg-gray-700 rounded-full transition-colors text-white backdrop-blur-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ChatRoom
                deviceId={externalApi.getDeviceId()}
                currentUserId={user?.uid}
                userName={user?.displayName || ''}
                userAvatar={user?.photoURL || ''}
                targetUser={chatTargetUser}
                friends={fetchedFriends}
                onClose={() => setIsChatOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDeleteGame}
        title="Confirm Delete"
        message="Are you sure you want to delete this game? This action cannot be undone."
      />
      <ImageGeneratorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <GameListModal
        isOpen={isGameListOpen}
        onClose={() => setIsGameListOpen(false)}
        games={fetchedGames}
        serverStatus={serverStatus}
        serverError={serverError}
        onPlayGame={handlePlayGame}
        cloudflareUrl={cloudflareUrl}
        setCloudflareUrl={setCloudflareUrl}
        onCheckConnection={() => checkServer(cloudflareUrl)}
      />

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-4 right-4 z-[500] p-4 rounded-xl border shadow-lg animate-in slide-in-from-right-4 duration-300 ${notification.type === 'success' ? 'bg-green-900/90 border-green-500/50 text-green-100' :
          notification.type === 'info' ? 'bg-blue-900/90 border-blue-500/50 text-blue-100' :
            'bg-red-900/90 border-red-500/50 text-red-100'
          }`}>
          {notification.message}
        </div>
      )}

      {/* Fullscreen Game Iframe Overlay */}
      {playingGame && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-in fade-in duration-300">
          <iframe
            src={playingGame.gameUrl}
            className="w-full flex-1 border-none bg-black"
            title={playingGame.title}
            sandbox="allow-scripts allow-pointer-lock allow-forms allow-popups allow-same-origin"
            allowFullScreen
            onLoad={() => setGameStartTime(Date.now())}
            onError={() => {
              showNotification('An error occurred while loading the game. File might be missing.', 'error');
              setPlayingGame(null);
            }}
          ></iframe>
        </div>
      )}


            <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        reviewGameId={reviewGameId}
        gameStartTime={gameStartTime}
        showNotification={showNotification}
      />

      {/* Loading Overlay */}
      {isGameLoading && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="w-20 h-20 relative mb-6">
            <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Play className="w-8 h-8 text-blue-500 ml-1" fill="currentColor" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Loading game...</h3>
          <p className="text-gray-400 text-sm animate-pulse">Please wait a moment</p>
        </div>
      )}

      <AuthModal 
        isOpen={isAuthOpen}
        onClose={() => {
            setIsAuthOpen(false);
            setAuthCallbackQueue(null);
        }}
        onSuccess={(u) => {
            setUser(u);
            localStorage.setItem('user', JSON.stringify(u));
            fetchExternalData();
            if (isAuthCallbackQueue) {
                isAuthCallbackQueue();
                setAuthCallbackQueue(null);
            }
        }}
      />
      {/* Multiplayer Room Modal */}
      <AnimatePresence>
        {isRoomModalOpen && selectedRoomGame && (
          <RoomListModal 
            game={selectedRoomGame}
            user={user}
            onClose={() => setIsRoomModalOpen(false)}
            onCreateRoom={async (roomData) => {
              try {
                const res = await externalApi.createP2PRoom({
                  ...roomData,
                  gameId: selectedRoomGame.id.toString(),
                  hostId: user?.uid || externalApi.getDeviceId(),
                  hostName: user?.displayName || 'Guest'
                });
                
                if (res.success) {
                  setIsRoomModalOpen(false);
                  setCurrentJoinedRoomId(res.roomId);
                  
                  // Construction launch URL for Host
                  const deviceId = externalApi.getDeviceId();
                  const targetUrl = cloudflareUrl || import.meta.env.VITE_EXTERNAL_API_URL || '';
                  const baseUrl = targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl;
                  const gamePath = selectedRoomGame.fileName || `${selectedRoomGame.id}/index.html`;
                  
                  const launchUrl = `${baseUrl}/games/${gamePath}?deviceId=${encodeURIComponent(deviceId)}&room=${res.roomId}&isHost=true&id=${selectedRoomGame.id}`;
                  
                  setPlayingGame({
                    title: selectedRoomGame.title || selectedRoomGame.name,
                    gameUrl: launchUrl
                  });
                }
              } catch (err: any) {
                showNotification(err.message, 'error');
              }
            }}
            onJoinRoom={async (room, password) => {
              try {
                const res = await externalApi.joinP2PRoom(room.id, {
                  playerId: user?.uid || externalApi.getDeviceId(),
                  playerName: user?.displayName || 'Guest',
                  password
                });
                
                if (res.success) {
                  setIsRoomModalOpen(false);
                  setCurrentJoinedRoomId(room.id);
                  
                  // Construction launch URL for Client
                  const deviceId = externalApi.getDeviceId();
                  const targetUrl = cloudflareUrl || import.meta.env.VITE_EXTERNAL_API_URL || '';
                  const baseUrl = targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl;
                  const gamePath = selectedRoomGame.fileName || `${selectedRoomGame.id}/index.html`;
                  
                  const launchUrl = `${baseUrl}/games/${gamePath}?deviceId=${encodeURIComponent(deviceId)}&room=${room.id}&isHost=false&id=${selectedRoomGame.id}`;
                  
                  setPlayingGame({
                    title: selectedRoomGame.title || selectedRoomGame.name,
                    gameUrl: launchUrl
                  });
                }
              } catch (err: any) {
                showNotification(err.message, 'error');
              }
            }}
            onLoginRequest={() => {
              setIsAuthOpen(true);
            }}
            onPlaySolo={() => {
              if (selectedRoomGame) {
                setIsRoomModalOpen(false);
                handlePlayGame(selectedRoomGame, true);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
