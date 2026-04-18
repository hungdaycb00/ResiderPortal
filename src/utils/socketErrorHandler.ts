import { getSocket, disconnectSocket } from './socket';

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export function setupSocketErrorHandlers() {
    const socket = getSocket();
    if (!socket) return;

    socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error?.message || error);
        
        if (error?.message?.includes('Authentication')) {
            alert('Session expired. Please login again.');
            disconnectSocket();
        }
    });

    socket.on('disconnect', (reason) => {
        console.warn('⚠️ Disconnected:', reason);
        
        if (reason === 'io server disconnect') {
            alert('Server disconnected. Reconnecting...');
            socket.connect();
        }
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
        reconnectAttempts = attemptNumber;
        console.log(`🔄 Reconnecting (attempt ${attemptNumber}/${MAX_RECONNECT_ATTEMPTS})...`);
        
        if (attemptNumber > MAX_RECONNECT_ATTEMPTS) {
            alert('Could not reconnect to server. Please reload the page.');
        }
    });

    socket.on('reconnect_failed', () => {
        console.error('❌ Reconnect failed');
        alert('Server connection lost. Please reload page (F5).');
    });

    socket.on('error', (error) => {
        console.error('⚠️ Socket error:', error.message);
    });
}

export function getConnectionStatus() {
    const socket = getSocket();
    if (!socket) {
        return { connected: false, connecting: false, disconnected: true };
    }
    
    return {
        connected: socket.connected,
        connecting: socket.active,
        disconnected: socket.disconnected
    };
}

export default { setupSocketErrorHandlers, getConnectionStatus };
