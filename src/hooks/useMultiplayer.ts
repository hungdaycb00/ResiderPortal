import { useState, useEffect } from 'react';
import { externalApi } from '../services/externalApi';
import { getSocket } from '../utils/socket';

interface UseMultiplayerParams {
    playingGame: { title: string, gameUrl: string } | null;
    setPlayingGame: (v: { title: string, gameUrl: string } | null) => void;
    setUserStats: (fn: (prev: any) => any) => void;
    showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
    user: any;
}

export function useMultiplayer({
    playingGame, setPlayingGame, setUserStats, showNotification, user,
}: UseMultiplayerParams) {
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [selectedRoomGame, setSelectedRoomGame] = useState<any>(null);
    const [currentJoinedRoomId, setCurrentJoinedRoomId] = useState<string | null>(null);

    // Listen for HOST_LEFT
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;
        const handleHostLeft = (data: any) => {
            if (currentJoinedRoomId) {
                showNotification(data.message || 'Host has left. Returning to lobby.', 'info');
                setPlayingGame(null);
                setCurrentJoinedRoomId(null);
                if (selectedRoomGame) setIsRoomModalOpen(true);
            }
        };
        socket.on('HOST_LEFT', handleHostLeft);
        return () => socket.off('HOST_LEFT', handleHostLeft);
    }, [currentJoinedRoomId, selectedRoomGame]);

    // Host heartbeat
    useEffect(() => {
        if (!currentJoinedRoomId || !playingGame || !playingGame.gameUrl.includes('isHost=true')) return;
        const interval = setInterval(async () => {
            try {
                await externalApi.sendHeartbeat(currentJoinedRoomId, {
                    hostId: externalApi.getDeviceId(),
                    members: [{ id: user?.uid || externalApi.getDeviceId(), name: user?.displayName || 'Host' }]
                });
            } catch (e) { console.error('[Heartbeat] Failed:', e); }
        }, 60000);
        return () => clearInterval(interval);
    }, [currentJoinedRoomId, playingGame, user]);

    // Iframe message handler
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (playingGame && event.data?.type === 'P2P_MEMBERS_UPDATE') {
                const members = event.data.members;
                if (currentJoinedRoomId && Array.isArray(members) && playingGame.gameUrl.includes('isHost=true')) {
                    externalApi.sendHeartbeat(currentJoinedRoomId, {
                        hostId: externalApi.getDeviceId(),
                        members: members
                    }).catch(e => console.error('[MemberUpdate] Heartbeat failed:', e));
                }
            } else if (playingGame && event.data?.type === 'SYNC_GOLD' && typeof event.data.gold === 'number') {
                setUserStats(prev => prev ? { ...prev, gold: event.data.gold } : null);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [playingGame, currentJoinedRoomId]);

    // Leave room on game close
    useEffect(() => {
        if (!playingGame && currentJoinedRoomId) {
            externalApi.leaveP2PRoom(currentJoinedRoomId).catch(() => {});
            setCurrentJoinedRoomId(null);
        }
    }, [playingGame, currentJoinedRoomId]);

    return {
        isRoomModalOpen, setIsRoomModalOpen,
        selectedRoomGame, setSelectedRoomGame,
        currentJoinedRoomId, setCurrentJoinedRoomId,
    };
}
