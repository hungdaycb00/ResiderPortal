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

    const fetchExternalData = useCallback(async (retry = true) => {
        if (serverStatus !== 'online') return;

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
    }, [serverStatus, setUser]);

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
