import { useState, useEffect, useRef, useCallback } from 'react';
import { externalApi } from '../services/externalApi';
import { createGameUrl } from '../constants';

interface UseGameManagerParams {
    cloudflareUrl: string;
    showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
    fetchExternalData: () => void;
    setRecentlyPlayed: (fn: (prev: any[]) => any[]) => void;
    setUserStats: (fn: (prev: any) => any) => void;
    user: any;
}

export function useGamePlayer({
    cloudflareUrl, showNotification, fetchExternalData, setRecentlyPlayed, setUserStats, user,
}: UseGameManagerParams) {
    const [playingGame, setPlayingGame] = useState<{ title: string, gameUrl: string, slug?: string } | null>(null);
    const [isGameLoading, setIsGameLoading] = useState(false);
    const [gameStartTime, setGameStartTime] = useState<number>(0);
    const [reviewGameId, setReviewGameId] = useState<string | null>(null);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [gameToDelete, setGameToDelete] = useState<string | number | null>(null);

    // Close game overlay when browser Back is pressed
    const closedViaBackRef = useRef(false);
    useEffect(() => {
        if (!playingGame) return;
        closedViaBackRef.current = false;
        window.history.pushState({ gameOverlay: true }, '');
        const handlePopState = () => { closedViaBackRef.current = true; setPlayingGame(null); };
        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
            if (!closedViaBackRef.current) window.history.back();
        };
    }, [!!playingGame]);

    // FPS Monitor — kill iframe if game causes CPU stall
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
                if (fps < 15) {
                    lowFpsStreak++;
                    if (lowFpsStreak >= 3) {
                        console.error("[Supervisor] Phát hiện treo trình duyệt hoặc CPU nghẽn. Tiêu diệt iFrame.");
                        setPlayingGame(null);
                        showNotification('Game đã bị tắt tự động do gây quá tải hệ thống (FPS Drop).', 'error');
                        return;
                    }
                } else { lowFpsStreak = 0; }
            }
            animationId = requestAnimationFrame(monitorFPS);
        };
        animationId = requestAnimationFrame(monitorFPS);
        return () => cancelAnimationFrame(animationId);
    }, [playingGame]);

    const handlePlayGame = useCallback(async (game: any, bypassLobby: boolean = false) => {
        const isAccessingViaTunnel = cloudflareUrl && (
            cloudflareUrl.includes('.trycloudflare.com') ||
            cloudflareUrl.includes('alin.city') ||
            cloudflareUrl.includes('.pages.dev')
        );
        const isVpsGame = game.tunnel_url || game.category?.toLowerCase().includes('vps') || isAccessingViaTunnel;

        if (!bypassLobby && game.category?.toLowerCase().includes('multiplayer')) {
            if (isVpsGame) {
                console.log(`[Portal] Authoritative/VPS game detected (${game.title}). Bypassing lobby.`);
                handlePlayGame(game, true);
                return;
            }
            // Multiplayer lobby handled externally via onMultiplayerRequest
            return;
        }

        if (!game.id || (typeof game.id === 'number' && game.id <= 6)) {
            const slug = game.slug || (game.title || game.name || '').toLowerCase().replace(/\s+/g, '-');
            setPlayingGame({
                title: game.title || game.name,
                gameUrl: game.gameUrl || createGameUrl(game.title || game.name),
                slug
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
        const deviceId = externalApi.getDeviceId();
        let gameUrl = `${baseUrl}/games/${gamePath}${gamePath.includes('?') ? '&' : '?'}deviceId=${encodeURIComponent(deviceId)}`;
        if (game.tunnel_url) gameUrl += `&tunnel_url=${encodeURIComponent(game.tunnel_url)}`;

        const slug = game.slug || game.id.toString();
        setPlayingGame({ title: game.title || game.name, gameUrl, slug });
        setReviewGameId(game.id.toString());

        setRecentlyPlayed(prev => {
            const filtered = prev.filter(p => (p.id || p.title) !== (game.id || game.title));
            const updated = [game, ...filtered].slice(0, 10);
            localStorage.setItem('recentlyPlayed', JSON.stringify(updated));
            return updated;
        });
    }, [cloudflareUrl, showNotification, setRecentlyPlayed]);

    const closeGame = useCallback(() => {
        if (!playingGame) return;
        const playTime = Math.floor((Date.now() - gameStartTime) / 1000);
        const hasRated = localStorage.getItem(`rated_game_${reviewGameId}`);
        if (playTime > 15 && !hasRated) {
            setShowReviewModal(true);
        }
        setPlayingGame(null);
    }, [playingGame, gameStartTime, reviewGameId]);

    const handleDeleteGame = (gameId: string | number) => {
        setGameToDelete(gameId);
        setIsConfirmOpen(true);
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

    return {
        playingGame, setPlayingGame, isGameLoading, setIsGameLoading,
        gameStartTime, setGameStartTime,
        reviewGameId, showReviewModal, setShowReviewModal,
        isConfirmOpen, setIsConfirmOpen, gameToDelete,
        handlePlayGame, closeGame, handleDeleteGame, confirmDeleteGame,
    };
}
