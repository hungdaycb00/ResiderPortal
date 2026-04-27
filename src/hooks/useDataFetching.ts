import { useState, useEffect, useCallback } from 'react';
import { externalApi, normalizeImageUrl } from '../services/externalApi';

export function useDataFetching(
    serverStatus: 'online' | 'offline' | 'checking',
    cloudflareUrl: string,
    setUser: (fn: (prev: any) => any) => void,
) {
    const [fetchedGames, setFetchedGames] = useState<any[]>([]);
    const [fetchedFriends, setFetchedFriends] = useState<any[]>([]);
    const [friendRequests, setFriendRequests] = useState<any[]>([]);
    const [userStats, setUserStats] = useState<{ gold: number, level: number, xp: number, rankScore: number } | null>(null);
    const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>(() => {
        const saved = localStorage.getItem('recentlyPlayed');
        return saved ? JSON.parse(saved) : [];
    });

    const extractGamesArray = (gamesData: any): any[] => {
        if (Array.isArray(gamesData)) return gamesData;
        if (gamesData && typeof gamesData === 'object') {
            return gamesData.games || gamesData.data || gamesData.list || gamesData.items || [];
        }
        return [];
    };

    const fetchServerGames = useCallback(async () => {
        try {
            const gamesData = await externalApi.listServer();
            const gamesArray = extractGamesArray(gamesData);
            const normalized = gamesArray.map((game: any) => {
                const actualFilePath = game.file_path || game.file || game.fileName || game.path || game.id || '';
                const rawImage = game.image || game.thumbnail || game.thumbnail_url || '';

                return {
                    ...game,
                    id: game.id?.toString?.() || actualFilePath || game.title || game.name,
                    title: game.title || game.name || game.fileName || 'Untitled',
                    fileName: actualFilePath,
                    image: normalizeImageUrl(rawImage),
                    score: game.score || 0,
                    downloads: game.downloads || 0,
                    rating: game.rating || 0,
                    createdAt: game.createdAt || game.created_at,
                    ownerId: game.ownerId || game.owner_id,
                    tunnel_url: game.tunnel_url || null,
                    category: game.category || '',
                };
            });
            setFetchedGames(normalized);
        } catch (err) {
            console.warn("[DataFetching] Failed to fetch server games:", err);
        }
    }, [cloudflareUrl]);

    const fetchExternalData = useCallback(async (retry = true) => {
        await fetchServerGames();

        if (serverStatus !== 'online') return;

        // 1. Fetch Profile (May fail for guests)
        try {
            const profile = await externalApi.request<{ success: boolean, user: any }>('/api/profile');
            if (profile.success && profile.user) {
                setUserStats({
                    gold: profile.user.gold || 0,
                    level: profile.user.level || 1,
                    xp: profile.user.xp || 0,
                    rankScore: profile.user.balance || 0
                });

                if (profile.user.avatar_url) {
                    const normalizedAvatar = normalizeImageUrl(profile.user.avatar_url);
                    setUser(prev => prev ? { ...prev, photoURL: normalizedAvatar, displayName: profile.user.display_name || prev.displayName } : null);
                }
            }
        } catch (err) {
            // Guests will hit 404 here, which is expected
            console.log("[DataFetching] Profile fetch skipped or failed (Guest user)");
        }

        // 3. Fetch Friends (Requires auth, usually fails for guests)
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
                // Potential stale deviceId
                externalApi.clearDeviceId();
                fetchExternalData(false);
                return;
            }
            // Expected failure for guest users
            console.log("[DataFetching] Friends fetch skipped or failed (Auth required)");
        }
    }, [fetchServerGames, serverStatus, setUser]);

    useEffect(() => {
        void fetchExternalData();
    }, [fetchExternalData]);

    // Validate recentlyPlayed when fetchedGames changes
    useEffect(() => {
        if (fetchedGames.length > 0 && recentlyPlayed.length > 0) {
            const validGames = recentlyPlayed.map(recent => {
                const fetchedMatch = fetchedGames.find(f => (f.id || f.title) === (recent.id || recent.title));
                if (fetchedMatch) return { ...recent, image: fetchedMatch.image };
                if (!recent.id || (typeof recent.id === 'number' && recent.id <= 6) || recent.id === 'quiz-game-root') return recent;
                if (recent.image && !recent.image.startsWith('http') && !recent.image.startsWith('data:') && !recent.image.startsWith('blob:')) {
                    return { ...recent, image: normalizeImageUrl(recent.image) };
                }
                return recent;
            }).filter(recent => {
                if (!recent.id || (typeof recent.id === 'number' && recent.id <= 6)) return true;
                if (recent.id === 'quiz-game-root') return true;
                return fetchedGames.some(f => (f.id || f.title) === (recent.id || recent.title));
            });

            if (JSON.stringify(validGames) !== JSON.stringify(recentlyPlayed)) {
                console.log(`[RecentlyPlayed] Updated/Validated recently played list`);
                setRecentlyPlayed(validGames);
                localStorage.setItem('recentlyPlayed', JSON.stringify(validGames));
            }
        }
    }, [fetchedGames, cloudflareUrl]);

    return {
        fetchedGames, fetchedFriends, friendRequests, userStats, setUserStats,
        recentlyPlayed, setRecentlyPlayed,
        fetchExternalData,
    };
}
