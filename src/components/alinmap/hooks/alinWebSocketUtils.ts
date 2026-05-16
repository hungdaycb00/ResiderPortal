import { DEGREES_TO_PX, MAP_PLANE_SCALE, MAP_PLANE_Y_SCALE } from '../constants';

export const buildWsUrl = () => {
    const override = (import.meta.env.VITE_ALIN_SOCIAL_WS_URL as string | undefined)?.trim();
    if (override) {
        const normalized = override.replace(/\/$/, '');
        if (normalized.startsWith('http://')) return normalized.replace('http://', 'ws://');
        if (normalized.startsWith('https://')) return normalized.replace('https://', 'wss://');
        return normalized;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const isLocalHost =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.endsWith('.local');

    if (isLocalHost) {
        const localHost = hostname === '::1' ? 'localhost' : hostname;
        return `${protocol}//${localHost}:2096`;
    }

    return 'wss://alin-social.alin.city';
};

export const buildPositionKey = (pos: [number, number] | null | undefined) => {
    if (!Array.isArray(pos) || pos.length < 2) return '';
    return `${pos[0].toFixed(6)}:${pos[1].toFixed(6)}`;
};

export const parseWsMessage = (eventData: string) => {
    try {
        const parsed = JSON.parse(eventData);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed as { type?: string; payload?: any };
    } catch {
        return null;
    }
};

export const createJoinPayload = (params: {
    currentUser: any;
    currentPosition: [number, number];
    radius: number;
    status: string;
    visible: boolean;
    province: string;
    deviceId: string;
}) => {
    const { currentUser, currentPosition, radius, status, visible, province, deviceId } = params;
    const joinType = currentUser ? 'USER_JOIN' : 'OBSERVER_JOIN';

    return {
        type: joinType,
        payload: {
            deviceId,
            userId: currentUser?.uid || undefined,
            lat: currentPosition[0],
            lng: currentPosition[1],
            radiusKm: radius,
            status,
            visible: currentUser ? visible : false,
            avatar_url: currentUser?.photoURL || '',
            province,
        },
    };
};

export const normalizeNearbyUsers = (params: {
    payload: any[];
    currentMyUserId: string | null;
    currentSearchTag: string;
}) => {
    const { payload, currentMyUserId, currentSearchTag } = params;
    const users = Array.isArray(payload)
        ? payload.map((u: any) => ({ ...u, isSelf: u.id === currentMyUserId }))
        : [];

    let filtered = users.filter((u: any) => !u.isSelf);

    if (currentSearchTag?.trim()) {
        const tag = String(currentSearchTag || '').toLowerCase().replace('#', '');
        filtered = filtered.filter((u: any) =>
            (u.gallery?.title && String(u.gallery.title).toLowerCase().includes(tag)) ||
            (u.username && String(u.username).toLowerCase().includes(tag)) ||
            (u.status && String(u.status).toLowerCase().includes(tag))
        );
    }

    return { users, filtered };
};

export const getReconnectDelay = (attempt: number) => {
    const baseDelay = 2000;
    const maxDelay = 30000;
    return Math.min(maxDelay, baseDelay * Math.pow(2, attempt)) + Math.random() * 2000;
};

export const buildMapMoveFromPan = (params: {
    myObfPos: { lat: number; lng: number };
    panX: number;
    panY: number;
    planeYScale: number; // Giữ nguyên tham số để tránh lỗi interface
}) => {
    const { myObfPos, panX, panY } = params;
    // CHUYÊN GIA FIX: panY giờ đã đồng nhất với panX (cùng chia MAP_PLANE_SCALE).
    // Nên lat cũng phải chia cho MAP_PLANE_SCALE thay vì planeYScale.
    return {
        lat: myObfPos.lat + (panY / MAP_PLANE_SCALE / DEGREES_TO_PX),
        lng: myObfPos.lng + (-panX / MAP_PLANE_SCALE / DEGREES_TO_PX),
        zoom: 13,
    };
};

export const buildMapMovePayload = (lat: number, lng: number) => ({
    type: 'MAP_MOVE',
    payload: { lat, lng, zoom: 13 },
});
