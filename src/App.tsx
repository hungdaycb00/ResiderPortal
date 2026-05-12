import React, { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { pathToTab, tabToPath, ALIN_MAP_TABS, AppTab, extractSlug } from './utils/routing';
import { Sword, Shield, Brain, Zap, Trophy, Users, Layout, Gamepad2, Book } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { externalApi } from './services/externalApi';
import { User } from './types';
import { games } from './constants';
import { setNotify } from './utils/notify';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useServerConnection } from './hooks/useServerConnection';
import { useDataFetching } from './hooks/useDataFetching';
import { useGamePlayer } from './hooks/useGamePlayer';
import { useMultiplayer } from './hooks/useMultiplayer';
import { useFriendActions } from './hooks/useFriendActions';

// Components
import MultiTaskButton from './components/MultiTaskButton';
const AlinMap = lazy(() => import('./components/AlinMap'));
import AppHeader from './components/AppHeader';
import HomeTab from './components/tabs/HomeTab';
import CategoriesTab from './components/tabs/CategoriesTab';
import SupportTab from './components/tabs/SupportTab';
import { AppModals } from './components/AppModals';

export type { User };

export default function App() {
  const appVersion = typeof window !== 'undefined' ? (window.__BUILD_VERSION__ || 'dev') : 'dev';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGameListOpen, setIsGameListOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);
  const [isMyGamesOverlayOpen, setIsMyGamesOverlayOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatTargetUser, setChatTargetUser] = useState<{ id: string, name: string, avatarUrl?: string } | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Client-side routing
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = useMemo(() => pathToTab(location.pathname), [location.pathname]);
  const setActiveTab = useCallback((tab: AppTab | ((prev: AppTab) => AppTab)) => {
    if (typeof tab === 'function') {
      const newTab = tab(pathToTab(location.pathname));
      navigate(tabToPath(newTab));
    } else {
      navigate(tabToPath(tab));
    }
  }, [navigate, location.pathname]);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  useEffect(() => {
    setNotify(showNotification);
  }, [showNotification]);

  // Custom Hooks Initialization
  const { serverStatus, serverError, cloudflareUrl, setCloudflareUrl, checkServer } = useServerConnection();
  
  const {
    user, setUser, isAuthOpen, setIsAuthOpen, isAuthCallbackQueue, setAuthCallbackQueue,
    logout, handleUpdateAvatar,
  } = useAuth(serverStatus, showNotification);

  const {
    fetchedGames, fetchedFriends, friendRequests, userStats, setUserStats,
    profileUserId, profileStatus,
    recentlyPlayed, setRecentlyPlayed, fetchExternalData,
  } = useDataFetching(serverStatus, cloudflareUrl, setUser);

  const {
    playingGame, setPlayingGame, isGameLoading, gameStartTime,
    reviewGameId, showReviewModal, setShowReviewModal,
    isConfirmOpen, setIsConfirmOpen, gameToDelete,
    handlePlayGame: baseHandlePlayGame, closeGame, handleDeleteGame, confirmDeleteGame,
  } = useGamePlayer({ cloudflareUrl, showNotification, fetchExternalData, setRecentlyPlayed, setUserStats, user });

  const {
    isRoomModalOpen, setIsRoomModalOpen,
    selectedRoomGame, setSelectedRoomGame,
    currentJoinedRoomId, setCurrentJoinedRoomId,
  } = useMultiplayer({ playingGame, setPlayingGame, setUserStats, showNotification, user });

  const {
    isFriendsOpen, setIsFriendsOpen,
    handleAddFriend, handleAcceptFriend, handleRejectFriend, handleRemoveFriend,
  } = useFriendActions(showNotification, fetchExternalData);

  // Wrapper for handlePlayGame to integrate multiplayer lobby
  const handlePlayGame = (game: any, bypassLobby: boolean = false) => {
    const isAccessingViaTunnel = cloudflareUrl && (cloudflareUrl.includes('.trycloudflare.com') || cloudflareUrl.includes('alin.city') || cloudflareUrl.includes('.pages.dev'));
    const isVpsGame = game.tunnel_url || (game.category || '').toLowerCase().includes('vps') || isAccessingViaTunnel;
    
    if (!bypassLobby && (game.category || '').toLowerCase().includes('multiplayer') && !isVpsGame) {
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
    baseHandlePlayGame(game, bypassLobby);
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

  const allGames = useMemo(() => {
    const mergedGames = [...(fetchedGames || []), ...games].filter(Boolean);
    return Array.from(new Map(mergedGames.map((game: any) => [
      game.id || game.slug || game.title || game.name,
      game,
    ])).values());
  }, [fetchedGames]);

  const filteredGames = allGames.filter((game: any) => {
    const title = (game.title || game.name || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesQuery = title.includes(query);
    const gameCat = (game.category || '').toLowerCase();
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.some(cat => {
      const normalizedCat = String(cat || '').toLowerCase();
      return gameCat.includes(normalizedCat) || title.includes(normalizedCat);
    });
    return matchesQuery && matchesCategory;
  });

  const isSearchActive = searchQuery.length > 0 || selectedCategories.length > 0;

  // --- Sync URL with Playing Game ---
  useEffect(() => {
    const currentBase = activeTab === 'home' ? '/games' : '/explore';
    let newPath = currentBase;
    const slug = extractSlug(location.pathname);
    
    if (playingGame?.slug) {
      newPath = `${currentBase}/${playingGame.slug}`;
    }

    if (slug === 'looter-game') return;

    if (location.pathname !== newPath && !playingGame?.gameUrl.includes('looter-game')) {
      // Note: Looter Game is handled inside AlinMap.tsx
      window.history.replaceState(null, '', newPath);
    }
  }, [playingGame, activeTab, location.pathname]);

  // --- Auto-Play from URL Slug ---
  useEffect(() => {
    if (allGames.length > 0 && !playingGame) {
      const slug = extractSlug(location.pathname);
      if (slug && slug !== 'looter-game') {
        const game = allGames.find((g: any) => 
          (String(g.slug || '').toLowerCase() === slug) || 
          (String(g.id || '').toLowerCase() === slug) ||
          (String(g.title || g.name || '').toLowerCase().replace(/\s+/g, '-') === slug)
        );
        if (game) {
          console.log(`[AutoPlay] Launching game from URL: ${slug}`);
          handlePlayGame(game);
        }
      }
    }
  }, [allGames.length]); // Run when games are loaded

  return (
    <div className="min-h-screen bg-[#13151a] text-white font-sans md:pb-0 relative overflow-x-hidden">
      <div className="fixed left-3 top-3 z-[1000] pointer-events-none">
        <div className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-white/70 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
          {appVersion}
        </div>
      </div>

      {/* Premium Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse-slow" />
        <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] bg-purple-600/10 blur-[100px] rounded-full animate-drift" />
        <div className="absolute top-[40%] left-[20%] w-[20%] h-[20%] bg-indigo-600/5 blur-[80px] rounded-full animate-pulse-slow" />
      </div>

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

      <main className="max-w-[1400px] mx-auto px-4 py-4 md:py-8">
        {activeTab === 'home' && (
          <HomeTab
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            selectedCategories={selectedCategories} setSelectedCategories={setSelectedCategories}
            isSearchActive={isSearchActive} filteredGames={filteredGames} fetchedGames={fetchedGames}
            recentlyPlayed={recentlyPlayed} handlePlayGame={handlePlayGame} AVAILABLE_CATEGORIES={AVAILABLE_CATEGORIES}
          />
        )}
        {activeTab === 'categories' && <CategoriesTab fetchedGames={fetchedGames} setActiveTab={setActiveTab} />}
        {activeTab === 'support' && <SupportTab />}
      </main>

      <AnimatePresence>
        {ALIN_MAP_TABS.includes(activeTab) && (
          <Suspense fallback={<div className="fixed inset-0 z-[100] bg-[#0a0c12] flex items-center justify-center"><div className="w-12 h-12 rounded-full border-4 border-blue-500/30 border-t-blue-400 animate-spin" /></div>}>
          <AlinMap
            key="alin-map-instance"
            user={user} 
            onClose={() => setActiveTab('home')} 
            externalApi={externalApi}
            profileUserId={profileUserId}
            profileStatus={profileStatus}
            games={allGames}
            handlePlayGame={handlePlayGame}
            showNotification={showNotification}
            friends={fetchedFriends}
            initialMainTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab as any)}
            cloudflareUrl={cloudflareUrl}
            triggerAuth={(callback) => { setAuthCallbackQueue(callback); setIsAuthOpen(true); }}
            logout={logout}
            externalOpenList={isMyGamesOverlayOpen}
            onOpenListChange={setIsMyGamesOverlayOpen}
            onOpenChat={(id: string, name: string, avatar?: string) => { setChatTargetUser({ id, name, avatarUrl: avatar }); setIsChatOpen(true); }}
          />
          </Suspense>
        )}
      </AnimatePresence>

      {(!playingGame && (activeTab === 'home' || activeTab === 'discover')) ? null : (
        <MultiTaskButton 
          className="z-[9999]"
          user={user}
          activeTab={activeTab} 
          isInGame={!!playingGame}
          onFeedback={() => setShowReviewModal(true)}
          setActiveTab={(id) => {
            if (id === 'home' && playingGame) { closeGame(); return; }
            if (id === 'chat') { setIsChatOpen(prev => !prev); setIsFriendsOpen(false); setIsUserInfoOpen(false); }
            else if (id === 'friends') { setIsFriendsOpen(prev => !prev); setIsChatOpen(false); setIsUserInfoOpen(false); }
            else { setActiveTab(id); if (playingGame) closeGame(); setIsChatOpen(false); setIsFriendsOpen(false); setIsUserInfoOpen(false); }
          }} 
        />
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
            onLoad={() => {}} // Could be added to useGamePlayer if needed
            onError={() => { showNotification('An error occurred while loading the game.', 'error'); setPlayingGame(null); }}
          ></iframe>
        </div>
      )}

      {notification && (
        <div className={`fixed bottom-0 right-0 z-[500] p-4 m-2 rounded-xl border shadow-lg animate-in slide-in-from-right-4 duration-300 ${notification.type === 'success' ? 'bg-green-900/95 border-green-500/50 text-green-100' : notification.type === 'info' ? 'bg-blue-900/95 border-blue-500/50 text-blue-100' : 'bg-red-900/95 border-red-500/50 text-red-100'}`}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{notification.message}</span>
          </div>
        </div>
      )}

      <AppModals
        isConfirmOpen={isConfirmOpen} setIsConfirmOpen={setIsConfirmOpen} confirmDeleteGame={confirmDeleteGame}
        isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen}
        isGameListOpen={isGameListOpen} setIsGameListOpen={setIsGameListOpen} fetchedGames={fetchedGames}
        serverStatus={serverStatus} serverError={serverError} handlePlayGame={handlePlayGame} cloudflareUrl={cloudflareUrl}
        setCloudflareUrl={setCloudflareUrl} checkServer={checkServer} showReviewModal={showReviewModal}
        setShowReviewModal={setShowReviewModal} reviewGameId={reviewGameId} gameStartTime={gameStartTime} showNotification={showNotification}
        isGameLoading={isGameLoading} isAuthOpen={isAuthOpen} setIsAuthOpen={setIsAuthOpen} setAuthCallbackQueue={setAuthCallbackQueue}
        setUser={setUser} fetchExternalData={fetchExternalData} isAuthCallbackQueue={isAuthCallbackQueue}
        isRoomModalOpen={isRoomModalOpen} selectedRoomGame={selectedRoomGame} setIsRoomModalOpen={setIsRoomModalOpen}
        user={user} setCurrentJoinedRoomId={setCurrentJoinedRoomId} setPlayingGame={setPlayingGame} externalApi={externalApi}
        isChatOpen={isChatOpen} setIsChatOpen={setIsChatOpen} chatTargetUser={chatTargetUser} fetchedFriends={fetchedFriends}
        isFriendsOpen={isFriendsOpen} setIsFriendsOpen={setIsFriendsOpen} friendRequests={friendRequests}
        handleAddFriend={handleAddFriend} handleAcceptFriend={handleAcceptFriend} handleRejectFriend={handleRejectFriend} handleRemoveFriend={handleRemoveFriend}
      />
    </div>
  );
}
