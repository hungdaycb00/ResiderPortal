import { getSocket } from './socket';

export function authenticateChat(deviceId: string): Promise<any> {
    const socket = getSocket();
    
    if (!socket) {
        throw new Error('WebSocket not initialized');
    }

    return new Promise((resolve, reject) => {
        socket.emit('auth', { deviceId });

        socket.once('authenticated', (data: any) => {
            console.log('✅ Chat authenticated:', data.user);
            resolve(data.user);
        });

        setTimeout(() => {
            reject(new Error('Authentication timeout'));
        }, 10000);
    });
}

export function joinRoom(type: 'global' | 'private', roomId: number | null = null): Promise<any> {
    const socket = getSocket();
    
    return new Promise((resolve, reject) => {
        if (!socket) return reject(new Error('WebSocket not connected'));

        socket.emit('join_room', { type, roomId });

        socket.once('room_joined', (data) => {
            console.log(`✅ Joined ${type} room:`, data.roomId);
            resolve(data);
        });

        socket.once('error', (error) => {
            reject(new Error(error.message));
        });

        setTimeout(() => {
            reject(new Error('Join room timeout'));
        }, 10000);
    });
}

export function sendMessage(content: string, contentType: string = 'text', roomId: number | null = null) {
    const socket = getSocket();
    
    if (!socket) {
        throw new Error('WebSocket not connected');
    }

    if (content.length > 800) {
        throw new Error('Message too long (max 800 characters)');
    }

    socket.emit('msg', {
        content,
        contentType,
        roomId,
        mediaKey: null
    });
}

export function createOrGetPrivateRoom(targetUserId: string): Promise<any> {
    const socket = getSocket();
    
    return new Promise((resolve, reject) => {
        if (!socket) return reject(new Error('WebSocket not connected'));

        socket.emit('create_or_get_private_room', { targetUserId });

        socket.once('private_room_ready', (data) => {
            console.log('🏠 Private room ready:', data);
            resolve(data);
        });

        socket.once('error', (error) => {
            reject(new Error(error.message));
        });

        setTimeout(() => {
            reject(new Error('Create room timeout'));
        }, 10000);
    });
}

export function leaveRoom(roomId: number) {
    const socket = getSocket();
    if (socket) {
        socket.emit('leave_room', { roomId });
    }
}

export function getMyPrivateRooms(): Promise<any> {
    const socket = getSocket();
    
    return new Promise((resolve, reject) => {
        if (!socket) return reject(new Error('WebSocket not connected'));

        socket.emit('get_my_private_rooms');

        socket.once('my_private_rooms', (data) => {
            resolve(data.rooms);
        });

        socket.once('error', (error) => {
            reject(new Error(error.message));
        });

        setTimeout(() => {
            reject(new Error('Fetch rooms timeout'));
        }, 10000);
    });
}

export default {
    authenticateChat,
    joinRoom,
    sendMessage,
    createOrGetPrivateRoom,
    getMyPrivateRooms,
    leaveRoom
};
