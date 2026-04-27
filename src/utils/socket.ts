let socket: WebSocket | null = null;
let reconnectTimeout: any = null;
let reconnectAttempts = 0;
const eventHandlers = new Map<string, Set<Function>>();

export function initSocket(): WebSocket {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return socket;
    }

    const cloudflareUrl = localStorage.getItem('cloudflareUrl') || '';
    let SOCKET_URL = cloudflareUrl || import.meta.env.VITE_SOCKET_URL || '';
    
    if (!SOCKET_URL) {
        SOCKET_URL = window.location.origin;
    }

    // Convert http/https to ws/wss
    let protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // If we're using a specific cloudflare URL, check if it's https
    if (SOCKET_URL.startsWith('https://')) {
        protocol = 'wss:';
    }

    const cleanBaseUrl = SOCKET_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Ensure we don't have double /ws 
    const wsUrl = `${protocol}//${cleanBaseUrl}/ws`.replace(/\/ws\/ws$/, '/ws');
    
    console.log('🔌 Initializing Native WebSocket at:', wsUrl);

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        reconnectAttempts = 0;
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }
        emitInternal('connect', null);
    };

    socket.onclose = (event) => {
        // Only log warning if it's not a normal closure
        if (event.code !== 1000) {
            console.warn('❌ WebSocket closed:', event.code, event.reason);
        } else {
            console.log('🔌 WebSocket connection closed normally');
        }
        
        emitInternal('disconnect', event.reason);
        
        // Auto-reconnect with Exponential Backoff + Jitter
        if (event.code !== 1000 && !reconnectTimeout) {
            const baseDelay = 2000;
            const maxDelay = 30000;
            const delay = Math.min(maxDelay, baseDelay * Math.pow(2, reconnectAttempts)) + Math.random() * 2000;
            reconnectAttempts += 1;

            reconnectTimeout = setTimeout(() => {
                reconnectTimeout = null;
                console.log(`🔄 Attempting to reconnect socket (attempt ${reconnectAttempts})...`);
                initSocket();
            }, delay);
        }
    };

    socket.onerror = (error) => {
        // Console error can be noisy during reconnection, so we use a more subtle log if it's during reconnect
        if (reconnectTimeout) {
            console.log('⚠️ WebSocket connection retry failed...');
        } else {
            console.error('⚠️ WebSocket connection error');
        }
        emitInternal('connect_error', error);
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type) {
                const { type, ...payload } = data;
                emitInternal(type, payload);
            }
        } catch (e) {
            console.error('❌ Message processing error:', e);
        }
    };

    return socket;
}

export function getSocket(): any {
    if (!socket) return null;
    
    // Polyfill for Socket.io syntax to minimize breakage
    return {
        connected: socket.readyState === WebSocket.OPEN,
        active: socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN,
        disconnected: socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING,
        connect: () => {
            initSocket();
        },
        emit: (event: string, data: any) => {
            if (socket?.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: event, ...data }));
            } else {
                console.warn('⚠️ WebSocket not ready to send:', event);
            }
        },
        on: (event: string, callback: Function) => {
            if (!eventHandlers.has(event)) eventHandlers.set(event, new Set());
            eventHandlers.get(event)?.add(callback);
        },
        off: (event: string, callback: Function) => {
            eventHandlers.get(event)?.delete(callback);
        },
        once: (event: string, callback: Function) => {
            const wrapper = (data: any) => {
                callback(data);
                eventHandlers.get(event)?.delete(wrapper);
            };
            if (!eventHandlers.has(event)) eventHandlers.set(event, new Set());
            eventHandlers.get(event)?.add(wrapper);
        },
        disconnect: () => {
            socket?.close();
        }
    };
}

function emitInternal(event: string, data: any) {
    eventHandlers.get(event)?.forEach(cb => cb(data));
}

export function disconnectSocket() {
    if (socket) {
        socket.close();
        socket = null;
        console.log('🔌 WebSocket disconnected');
    }
}

export default { initSocket, getSocket, disconnectSocket };
