import { useEffect } from 'react';
import { getSocket } from '../utils/socket';

export function useChat(
    onMessageReceived?: (message: any) => void, 
    onRoomHistory?: (messages: any[]) => void, 
    onError?: (error: any) => void
) {
    useEffect(() => {
        const socket = getSocket();
        
        if (!socket) return;

        const handleNewMessage = (message: any) => {
            console.log('📨 New message:', message);
            onMessageReceived?.(message);
        };

        const handleRoomHistory = (data: any) => {
            console.log('📜 Room history:', data.messages);
            onRoomHistory?.(data.messages);
        };

        const handleError = (error: any) => {
            console.error('⚠️ Error:', error.message);
            onError?.(error);
        };

        socket.on('new_message', handleNewMessage);
        socket.on('room_history', handleRoomHistory);
        socket.on('error', handleError);

        return () => {
            socket.off('new_message', handleNewMessage);
            socket.off('room_history', handleRoomHistory);
            socket.off('error', handleError);
        };
    }, [onMessageReceived, onRoomHistory, onError]);
}

export function useMultiplayer(
    onPositionUpdate?: (data: any) => void, 
    onPlayerLeft?: (data: any) => void
) {
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const handlePositions = (data: any) => onPositionUpdate?.(data);
        const handleLeft = (data: any) => onPlayerLeft?.(data);

        socket.on('player_positions', handlePositions);
        socket.on('player_left', handleLeft);

        return () => {
            socket.off('player_positions', handlePositions);
            socket.off('player_left', handleLeft);
        };
    }, [onPositionUpdate, onPlayerLeft]);
}

export default { useChat, useMultiplayer };
