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
import CreatorView from './components/CreatorView';
import AdminView from './components/AdminView';
import FriendsModal from './components/FriendsModal';
import ChatRoom from './components/ChatRoom';
import UserInfoModal from './components/UserInfoModal';
import GameSlider from './components/GameSlider';
import AuthModal from './components/AuthModal';
import RoomListModal from './components/RoomListModal';
import AlinMap from './components/AlinMap';

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
  const [chatTargetUser, setChatTargetUser] = useState<{id: string, name: string} | null>(null);
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
  const heroScrollRef = useRef<HTMLDivElement>(null);
  const heroDragState = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });

  const scrollHero = (direction: 'left' | 'right') => {
    if (heroScrollRef.current) {
      const { scrollLeft, clientWidth } = heroScrollRef.current;
      const scrollTo = direction === 'left' 
        ? scrollLeft - clientWidth * 0.8 
        : scrollLeft + clientWidth * 0.8;
      
      heroScrollRef.current.scrollTo({
        left: scrollTo,
        behavior: 'smooth'
      });
    }
  };

  const handleHeroPointerDown = (e: React.PointerEvent) => {
    if (heroScrollRef.current) {
      heroDragState.current = { 
        isDown: true, 
        startX: e.pageX, 
        scrollLeft: heroScrollRef.current.scrollLeft,
        moved: false
      };
    }
  };

  const handleHeroPointerMove = (e: React.PointerEvent) => {
    if (!heroDragState.current.isDown || !heroScrollRef.current) return;
    const x = e.pageX;
    const walk = (heroDragState.current.startX - x) * 2;
    if (Math.abs(walk) > 5) {
      heroDragState.current.moved = true; 
    }
    heroScrollRef.current.scrollLeft = heroDragState.current.scrollLeft + walk;
  };

  const handleHeroPointerUpOrLeave = () => {
    heroDragState.current.isDown = false;
  };

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
      <header className="bg-[#1a1d24]/80 backdrop-blur-md border-b border-gray-800/60 sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Left: Logo & Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
              {/* Logo deleted by user request */}
            </div>

            {/* Alin Social Access */}
            <button
              onClick={() => setActiveTab('alin')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-[10px] sm:text-xs transition-all border active:scale-95 group ${
                activeTab === 'alin' 
                ? 'bg-blue-600 text-white border-blue-500' 
                : 'bg-blue-600/10 hover:bg-blue-600/30 text-blue-400 border-blue-500/30'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span className="hidden xs:inline text-[8px] font-black tracking-widest uppercase text-white">Alin Map</span>
            </button>
          </div>

          {/* Middle: Search (Icon on Right) */}
          <div className="flex-1 max-w-2xl relative">
            <div className="relative group">
              <input
                type="text"
                placeholder="Search for games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#252830] text-white rounded-xl pl-4 pr-24 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-500 border border-transparent hover:border-gray-700 focus:bg-[#2a2d36]"
              />
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                  className={`p-1.5 rounded-lg transition-colors ${isFilterExpanded || selectedCategories.length > 0 ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                  title="Filters"
                >
                  <Filter className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-gray-700 mx-0.5" />
                <button className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expandable Filter Area - Absolute Dropdown */}
            <AnimatePresence>
              {isFilterExpanded && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute top-full left-0 right-0 mt-2 bg-[#1a1d24] border border-gray-700/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 z-[60] backdrop-blur-xl"
                >
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategories(prev =>
                            prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id]
                          );
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${selectedCategories.includes(cat.id)
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20'
                            : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600'
                          }`}
                      >
                        {cat.icon}
                        {cat.name.toUpperCase()}
                      </button>
                    ))}
                    {isSearchActive && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategories([]);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                        CLEAR
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: User Profile & Popover */}
          <div className="flex items-center gap-4">
            {user && (
              <button
                onClick={() => setActiveTab(prev => prev === 'creator' ? 'home' : 'creator')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-[10px] sm:text-xs transition-all border active:scale-95 group ${
                  activeTab === 'creator' 
                  ? 'bg-purple-600 text-white border-purple-500' 
                  : 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border-purple-500/30'
                }`}
              >
                <Plus className={`w-4 h-4 transition-transform ${activeTab === 'creator' ? 'rotate-45' : 'group-hover:rotate-90'}`} />
                <span className="hidden xs:inline text-[8px] font-black tracking-widest uppercase">Create</span>
              </button>
            )}

            <div className="relative flex flex-col items-center justify-center">
              {!user ? (
                <button 
                  onClick={() => setIsAuthOpen(true)}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 active:scale-95 flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" /> LOGIN
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setIsUserInfoOpen(!isUserInfoOpen)}
                    className="relative group transition-all active:scale-95"
                  >
                    <img 
                      src={normalizeImageUrl(user.photoURL) || `https://i.pravatar.cc/150?u=${user.uid}`} 
                      alt="Avatar" 
                      className="w-10 h-10 rounded-2xl border-2 border-blue-500/20 group-hover:border-blue-500/50 transition-colors object-cover"
                    />
                  </button>
                  
                  {/* Gold Panel Below */}
                  <div className="mt-1 flex items-center gap-1.5 bg-[#252830] border border-gray-800 rounded-full px-2.5 py-0.5 shadow-lg pointer-events-none translate-y-[-2px]">
                    <Coins className="w-2.5 h-2.5 text-yellow-500" />
                    <span className="text-[9px] font-black text-white">{userStats?.gold || 0}</span>
                  </div>

                  {/* Popover Logic */}
                  <UserInfoModal 
                    isOpen={isUserInfoOpen} 
                    onClose={() => setIsUserInfoOpen(false)}
                    user={user}
                    onLogin={() => setIsAuthOpen(true)}
                    onLogout={logout}
                    onManageGames={() => {
                      setActiveTab('creator');
                      setIsUserInfoOpen(false);
                      setIsMyGamesOverlayOpen(true);
                    }}
                    userStats={userStats}
                    onUpdateAvatar={handleUpdateAvatar}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-4 py-4 md:py-8">
        {activeTab === 'home' && (
          <div className="flex flex-col gap-3 md:gap-16 pb-20">
            {/* Search Results Section */}
            {isSearchActive && (
              <section className="animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <h3 className="text-xl md:text-2xl font-black flex items-center gap-2 uppercase tracking-tighter italic">
                    <Search className="w-6 h-6 text-blue-400" />
                    Search Results ({filteredGames.length})
                  </h3>
                  {isSearchActive && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategories([]);
                      }}
                      className="text-xs font-bold text-gray-500 hover:text-red-400 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                {filteredGames.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {filteredGames.map((game, i) => (
                      <GameCard
                        key={i}
                        title={game.title}
                        image={game.image}
                        logoStyle={game.logoStyle || "text-white"}
                        onClick={() => handlePlayGame(game)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#1a1d24] border border-gray-800 rounded-3xl p-12 text-center">
                    <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-gray-600" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-300 mb-1">No games found</h4>
                    <p className="text-sm text-gray-500">Try changing your search query or filters</p>
                  </div>
                )}
                <div className="h-px bg-gray-800/50 mt-10 md:mt-16" />
              </section>
            )}

            {/* Hero Carousel - Games with score > 8 */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 mb-8 md:mb-12">
              {(() => {
                const highRatedGames = [...fetchedGames, ...games].filter(g => (g.score || 0) >= 8 || g.id === 'quiz-game-root');
                const uniqueHighRated = Array.from(new Map(highRatedGames.map(g => [g.id || g.title, g])).values())
                  .sort((a, b) => (b.score || 0) - (a.score || 0));

                const isSingleGame = uniqueHighRated.length === 1;

                if (uniqueHighRated.length > 0) {
                  return (
                    <div className="relative group/carousel px-4 md:px-0">
                      <div className="flex items-center justify-between mb-4 mt-2">
                        <h3 className="text-xl md:text-2xl font-black flex items-center gap-2 uppercase tracking-tighter italic border-l-4 border-yellow-400 pl-3">
                          <Trophy className="w-6 h-6 text-yellow-400" />
                          Featured Games
                        </h3>
                        {!isSingleGame && (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => scrollHero('left')}
                              className="p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 transition-all active:scale-95"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => scrollHero('right')}
                              className="p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 transition-all active:scale-95"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div 
                        ref={heroScrollRef}
                        onPointerDown={handleHeroPointerDown}
                        onPointerMove={handleHeroPointerMove}
                        onPointerUp={handleHeroPointerUpOrLeave}
                        onPointerLeave={handleHeroPointerUpOrLeave}
                        onPointerCancel={handleHeroPointerUpOrLeave}
                        className={`overflow-x-auto flex gap-4 md:gap-6 pb-4 snap-x snap-mandatory custom-scrollbar select-none cursor-grab active:cursor-grabbing ${isSingleGame ? 'justify-center' : ''}`}
                        style={{ scrollBehavior: 'smooth', touchAction: 'pan-y' }}
                      >
                        {uniqueHighRated.map((game, idx) => (
                          <div
                            key={idx}
                            onClick={(e) => {
                              if (heroDragState.current.moved) {
                                e.preventDefault();
                                e.stopPropagation();
                                heroDragState.current.moved = false; // reset for next time
                                return;
                              }
                              handlePlayGame(game);
                            }}
                            className={`shrink-0 snap-center ${isSingleGame ? 'w-full' : 'w-full md:w-[85%] lg:w-[70%]'} h-[200px] sm:h-[300px] md:h-[400px] rounded-3xl overflow-hidden relative transition-transform active:scale-[0.98] bg-[#1a1d24] shadow-2xl`}
                          >
                            {game.image ? (
                              <img src={game.image} draggable={false} className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none" alt="" />
                            ) : (
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#13151a] via-[#13151a]/20 to-transparent opacity-90 pointer-events-none" />

                            <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 z-10 pointer-events-none">
                              <div className="flex items-center gap-4 pointer-events-auto">
                                <button className="w-14 h-14 md:w-20 md:h-20 bg-white text-black rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-90 flex-shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if(!heroDragState.current.moved) handlePlayGame(game);
                                  }}
                                >
                                  <Play className="w-6 h-6 md:w-10 md:h-10 fill-current ml-1" />
                                </button>
                                <div className="min-w-0">
                                  <div className="px-2 py-1 md:px-3 md:py-1 bg-yellow-400 text-black rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-wider shadow-lg shadow-yellow-400/20 inline-flex items-center gap-1.5 mb-2">
                                    <Trophy className="w-3 h-3" /> Featured {game.score ? `• ${game.score}/10` : '🔥'}
                                  </div>
                                  <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-white tracking-tight leading-none drop-shadow-2xl truncate">
                                    {game.title}
                                  </h1>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </section>

            {/* Recently Played */}
            {recentlyPlayed.length > 0 && (
              <GameSlider 
                title="Recently Played" 
                icon={<RefreshCw className="w-6 h-6 text-blue-400" />}
              >
                {recentlyPlayed.map((game, i) => (
                  <div key={i} className="w-[200px] sm:w-[240px] md:w-[320px]">
                    <GameCard
                      title={game.title}
                      image={game.image}
                      logoStyle={game.logoStyle || "text-white"}
                      onClick={() => handlePlayGame(game)}
                    />
                  </div>
                ))}
              </GameSlider>
            )}

            {/* New Games */}
            <GameSlider 
              title="New Games" 
              icon={<Plus className="w-6 h-6 text-purple-400" />}
            >
              {[...fetchedGames].reverse().slice(0, 10).map((game, i) => (
                <div key={i} className="w-[200px] sm:w-[240px] md:w-[320px]">
                  <GameCard
                    title={game.title}
                    image={game.image}
                    logoStyle={game.logoStyle || "text-white"}
                    onClick={() => handlePlayGame(game)}
                  />
                </div>
              ))}
            </GameSlider>

            {/* Categories Sections */}
            {AVAILABLE_CATEGORIES.map((cat) => {
              const keywordsMap: any = {
                puzzle: ['puzzle', 'quiz', 'brain', 'logic'],
                action: ['action', 'sword', 'combat', 'battle'],
                strategy: ['strategy', 'build', 'defense']
              };
              const catId = cat.id;
              const catGames = (fetchedGames || []).concat(games).filter(g =>
                ((g.category || '').toLowerCase().includes(catId)) ||
                (keywordsMap[catId] && keywordsMap[catId].some((k: string) => (g.title || '').toLowerCase().includes(k)))
              );

              if (catGames.length === 0) return null;

              return (
                <div key={cat.id} id={`cat-${cat.id}`}>
                  <GameSlider 
                    title={cat.name} 
                    icon={cat.icon}
                  >
                    {catGames.map((game, i) => (
                      <div key={i} className="w-[200px] sm:w-[240px] md:w-[320px]">
                        <GameCard
                          title={game.title}
                          image={game.image}
                          logoStyle={game.logoStyle || "text-white"}
                          onClick={() => handlePlayGame(game)}
                        />
                      </div>
                    ))}
                  </GameSlider>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <h2 className="text-3xl font-black mb-8 flex items-center gap-2 uppercase tracking-tighter italic">
              <Grid className="w-8 h-8 text-blue-400" />
              Explore Categories
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {[
                { name: 'Action', icon: <Sword className="w-8 h-8" />, color: 'from-orange-500 to-red-600', id: 'action' },
                { name: 'Strategy', icon: <Shield className="w-8 h-8" />, color: 'from-blue-500 to-indigo-600', id: 'strategy' },
                { name: 'Puzzle', icon: <Brain className="w-8 h-8" />, color: 'from-purple-500 to-pink-600', id: 'puzzle' },
                { name: 'Racing', icon: <Zap className="w-8 h-8" />, color: 'from-yellow-500 to-orange-600', id: 'racing' },
                { name: 'RPG', icon: <Trophy className="w-8 h-8" />, color: 'from-emerald-500 to-teal-600', id: 'rpg' },
                { name: 'Multiplayer', icon: <Users className="w-8 h-8" />, color: 'from-cyan-500 to-blue-600', id: 'multiplayer' },
              ].map((cat) => {
                const keywordsMap: any = {
                  puzzle: ['puzzle', 'quiz', 'brain', 'logic'],
                  action: ['action', 'sword', 'combat', 'battle'],
                  strategy: ['strategy', 'build', 'defense']
                };
                const catId = cat.id;
                const catGames = (fetchedGames || []).concat(games).filter(g =>
                  ((g.category || '').toLowerCase().includes(catId)) ||
                  (keywordsMap[catId] && keywordsMap[catId].some((k: string) => (g.title || '').toLowerCase().includes(k)))
                );
                const count = catGames.length;
                const displayGames = catGames.slice(0, 3);

                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      setActiveTab('home');
                      setTimeout(() => {
                        document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                    className="group cursor-pointer"
                  >
                    <div className={`aspect-square rounded-3xl bg-gradient-to-br ${cat.color} p-6 flex flex-col items-center justify-center transition-all group-hover:scale-[1.03] group-active:scale-95 shadow-2xl relative overflow-hidden`}>
                      {/* Category Background Grid */}
                      {displayGames.length > 0 && (
                        <div className={`absolute inset-0 grid gap-0.5 opacity-40 group-hover:opacity-60 transition-opacity category-grid-${displayGames.length}`}>
                          {displayGames.map((g, i) => (
                            <img key={i} src={g.image} className="w-full h-full object-cover" alt="" />
                          ))}
                        </div>
                      )}
                      
                      {/* Glass Overlay */}
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] group-hover:bg-black/20 transition-colors" />
                      
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="bg-white/20 p-4 rounded-2xl mb-4 backdrop-blur-md shadow-lg">{cat.icon}</div>
                        <h3 className="font-black text-xl uppercase tracking-tighter italic">{cat.name}</h3>
                        <p className="text-white/70 text-xs font-bold uppercase tracking-widest">{count} Games</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'community' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-400" />
                Community Hub
              </h2>
              <button onClick={() => fetchExternalData()} className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white" title="Refresh">
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div className="bg-[#1a1d24] border border-gray-800 rounded-2xl p-6">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-purple-400" />
                    Recent Discussions
                  </h3>
                  <div className="space-y-4">
                    {[
                      { title: "Best strategy for Galaxy Runners?", author: "SpaceCadet", replies: 24, time: "2h ago" },
                      { title: "New high score in Pixel Quest!", author: "RetroGamer", replies: 12, time: "5h ago" },
                      { title: "Looking for a team for Dungeon Delve", author: "Knight99", replies: 8, time: "1d ago" },
                    ].map((topic, i) => (
                      <div key={i} className="flex items-center justify-between p-3 hover:bg-gray-800/50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-gray-700">
                        <div>
                          <h4 className="font-medium text-blue-400">{topic.title}</h4>
                          <p className="text-xs text-gray-500">by {topic.author} • {topic.time}</p>
                        </div>
                        <span className="text-xs font-bold text-gray-400 bg-gray-800 px-2 py-1 rounded-md">{topic.replies} replies</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="bg-[#1a1d24] border border-gray-800 rounded-2xl p-6">
                  <h3 className="font-bold mb-4">Online Now</h3>
                  <div className="space-y-3">
                    {fetchedFriends.length > 0 ? (
                      fetchedFriends.map((friend, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="relative">
                            <img src={friend.photoURL || `https://i.pravatar.cc/150?u=${i}`} className="w-8 h-8 rounded-full border border-gray-700" alt="User" />
                            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${friend.online ? 'bg-green-500' : 'bg-gray-500'} rounded-full border-2 border-[#1a1d24]`} />
                          </div>
                          <span className="text-sm font-medium text-gray-300">{friend.displayName || friend.name || `User_${i}`}</span>
                        </div>
                      ))
                    ) : (
                      [1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="relative">
                            <img src={`https://i.pravatar.cc/150?u=${i}`} className="w-8 h-8 rounded-full border border-gray-700" alt="User" />
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#1a1d24]" />
                          </div>
                          <span className="text-sm font-medium text-gray-300">User_{i}42</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'support' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-blue-400" />
              Help & Support
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#1a1d24] border border-gray-800 p-6 rounded-2xl text-center hover:border-blue-500/50 transition-colors cursor-pointer">
                  <Mail className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                  <h3 className="font-bold">Email Us</h3>
                  <p className="text-xs text-gray-500 mt-1">support@resider.com</p>
                </div>
                <div className="bg-[#1a1d24] border border-gray-800 p-6 rounded-2xl text-center hover:border-purple-500/50 transition-colors cursor-pointer">
                  <MessageCircle className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                  <h3 className="font-bold">Live Chat</h3>
                  <p className="text-xs text-gray-500 mt-1">Available 24/7</p>
                </div>
              </div>
              <div className="bg-[#1a1d24] border border-gray-800 rounded-2xl p-8">
                <h3 className="text-lg font-bold mb-6">Send us a message</h3>
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Name</label>
                      <input type="text" className="w-full bg-[#252830] border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Your name" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Email</label>
                      <input type="email" className="w-full bg-[#252830] border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Your email" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Message</label>
                    <textarea className="w-full bg-[#252830] border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]" placeholder="How can we help?"></textarea>
                  </div>
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-blue-500/20">
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'creator' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CreatorView 
              user={user} 
              showNotification={showNotification} 
              onPublishSuccess={fetchExternalData} 
              onPlayGame={handlePlayGame}
              cloudflareUrl={cloudflareUrl}
              triggerAuth={(callback) => {
                setAuthCallbackQueue(() => callback);
                setIsAuthOpen(true);
              }}
              externalOpenList={isMyGamesOverlayOpen}
              onOpenListChange={setIsMyGamesOverlayOpen}
            />
          </div>
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
        {activeTab === 'alin' && (
          <AlinMap 
            user={user} 
            onClose={() => setActiveTab('home')} 
            externalApi={externalApi}
            games={fetchedGames}
            friends={fetchedFriends}
            onOpenChat={(id: string, name: string) => {
              setChatTargetUser({ id, name });
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


      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowReviewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a1d24] border border-gray-700/50 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-white font-bold text-lg text-center mb-1">Rate Game</h3>
              <p className="text-gray-500 text-[11px] text-center mb-4">Your feedback helps improve game quality</p>

              {/* Star Rating */}
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onMouseEnter={() => setReviewHover(star)}
                    onMouseLeave={() => setReviewHover(0)}
                    onClick={() => setReviewRating(star)}
                    className="transition-transform hover:scale-125"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${star <= (reviewHover || reviewRating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-600'
                        }`}
                    />
                  </button>
                ))}
              </div>

              {/* Comment */}
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Enter your feedback for this game (optional)..."
                className="w-full bg-[#252830] border border-gray-700 rounded-xl p-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none h-20 mb-4"
              />

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 py-2.5 bg-[#252830] text-gray-400 rounded-xl text-sm font-bold hover:bg-gray-700 transition-colors"
                >
                  Skip
                </button>
                <button
                  disabled={reviewRating === 0 || reviewSubmitting}
                  onClick={async () => {
                    if (reviewRating === 0 || !reviewGameId) return;
                    setReviewSubmitting(true);
                    try {
                      await externalApi.request(`/api/games/${reviewGameId}/review`, {
                        method: 'POST',
                        body: JSON.stringify({
                          rating: reviewRating,
                          comment: reviewComment || null,
                          playDuration: Math.floor((Date.now() - gameStartTime) / 1000)
                        })
                      });
                      localStorage.setItem(`rated_game_${reviewGameId}`, 'true');
                      showNotification('Thank you for your rating! ⭐', 'success');
                    } catch (err: any) {
                      showNotification(err.message || 'Error submitting rating', 'error');
                    }
                    setReviewSubmitting(false);
                    setShowReviewModal(false);
                  }}

                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${reviewRating > 0
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  {reviewSubmitting ? 'Sending...' : 'Submit Rating'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
