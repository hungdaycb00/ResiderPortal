let socket: WebSocket | null = null;
let reconnectTimeout: any = null;
let reconnectAttempts = 0;
const eventHandlers = new Map<string, Set<Function>>();
const messageQueue: Array<{ event: string; data: any }> = [];
const SOCKET_DEBUG = import.meta.env.DEV;

const socketLog = (...args: unknown[]) => {
    if (SOCKET_DEBUG) console.log(...args);
};

function flushMessageQueue() {
    if (messageQueue.length === 0) return;
    socketLog(`📤 Flushing ${messageQueue.length} queued messages`);
    while (messageQueue.length > 0) {
        const msg = messageQueue.shift()!;
        if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: msg.event, ...msg.data }));
        }
    }
}

export function initSocket(): WebSocket {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return socket;
    }

    const cloudflareUrl = localStorage.getItem('cloudflareUrl') || '';
    let SOCKET_URL = cloudflareUrl || import.meta.env.VITE_SOCKET_URL || '';

    if (!SOCKET_URL) {
        SOCKET_URL = window.location.origin;
    }

    let protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    if (SOCKET_URL.startsWith('https://')) {
        protocol = 'wss:';
    }

    const cleanBaseUrl = SOCKET_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const wsUrl = `${protocol}//${cleanBaseUrl}/ws`.replace(/\/ws\/ws$/, '/ws');

    socketLog('🔌 Initializing Native WebSocket at:', wsUrl);

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        socketLog('✅ WebSocket connected successfully');
        reconnectAttempts = 0;
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }
        flushMessageQueue();
        emitInternal('connect', null);
    };

    socket.onclose = (event) => {
        if (event.code !== 1000) {
            if (SOCKET_DEBUG) console.warn('❌ WebSocket closed:', event.code, event.reason);
        } else {
            socketLog('🔌 WebSocket connection closed normally');
        }

        emitInternal('disconnect', event.reason);

        if (event.code !== 1000 && !reconnectTimeout) {
            const baseDelay = 2000;
            const maxDelay = 30000;
            const delay = Math.min(maxDelay, baseDelay * Math.pow(2, reconnectAttempts)) + Math.random() * 2000;
            reconnectAttempts += 1;

            reconnectTimeout = setTimeout(() => {
                reconnectTimeout = null;
                socketLog(`🔄 Attempting to reconnect socket (attempt ${reconnectAttempts})...`);
                initSocket();
            }, delay);
        }
    };

    socket.onerror = (error) => {
        if (reconnectTimeout) {
            socketLog('⚠️ WebSocket connection retry failed...');
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
            } else if (socket?.readyState === WebSocket.CONNECTING) {
                socketLog(`⏳ Buffering message "${event}" — socket is connecting`);
                messageQueue.push({ event, data });
            } else {
                if (SOCKET_DEBUG) console.warn('⚠️ WebSocket not ready to send:', event, 'readyState:', socket?.readyState);
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
        messageQueue.length = 0;
        socketLog('🔌 WebSocket disconnected');
    }
}

export default { initSocket, getSocket, disconnectSocket };
