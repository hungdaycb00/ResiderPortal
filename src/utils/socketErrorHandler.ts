import { getSocket, disconnectSocket } from './socket';
import { notify } from './notify';

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export function setupSocketErrorHandlers() {
    const socket = getSocket();
    if (!socket) return;

    socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error?.message || error);

        if (error?.message?.includes('Authentication')) {
            notify('Session expired. Please login again.', 'error');
            disconnectSocket();
        }
    });

    socket.on('disconnect', (reason) => {
        console.warn('⚠️ Disconnected:', reason);

        if (reason === 'io server disconnect') {
            notify('Server disconnected. Reconnecting...', 'info');
            socket.connect();
        }
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
        reconnectAttempts = attemptNumber;
        console.log(`🔄 Reconnecting (attempt ${attemptNumber}/${MAX_RECONNECT_ATTEMPTS})...`);

        if (attemptNumber > MAX_RECONNECT_ATTEMPTS) {
            notify('Could not reconnect to server. Please reload the page.', 'error');
        }
    });

    socket.on('reconnect_failed', () => {
        console.error('❌ Reconnect failed');
        notify('Server connection lost. Please reload page (F5).', 'error');
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
