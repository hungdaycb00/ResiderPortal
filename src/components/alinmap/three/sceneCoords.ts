import { DEGREES_TO_PX, MAP_PLANE_SCALE } from '../constants';

// ─── Types ────────────────────────────────────────────────────────────────────
export type LatLng = { lat: number; lng: number };

// ─── Constants ────────────────────────────────────────────────────────────────
export const MAP_COORD_SCENE_SCALE = 0.34;
export const BILLBOARD_STATUS_DISTANCE_FACTOR = 5.5;
export const BILLBOARD_GALLERY_DISTANCE_FACTOR = 4.2;
export const AVATAR_PLANE_SIZE = 6.5;
export const AVATAR_RING_RADIUS = 4.4;
export const MARKER_PLANE_SIZE: [number, number] = [25.5, 8.7];
export const LABEL_PLANE_SIZE: [number, number] = [31.5, 9.6];

// ─── Coordinate Helpers ───────────────────────────────────────────────────────
export const worldToScene = (origin: LatLng, target: LatLng) => ({
    x: (target.lng - origin.lng) * DEGREES_TO_PX * MAP_PLANE_SCALE * MAP_COORD_SCENE_SCALE,
    z: -(target.lat - origin.lat) * DEGREES_TO_PX * MAP_PLANE_SCALE * MAP_COORD_SCENE_SCALE,
});

export const pxToScene = (px: number) => px * MAP_COORD_SCENE_SCALE;

// ─── String/Color Helpers ─────────────────────────────────────────────────────
export const initialsForName = (name: string) => {
    const cleaned = (name || 'U')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
    return cleaned || 'U';
};

export const colorFromString = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue} 70% 48%)`;
};

// ─── Image URL Validation ─────────────────────────────────────────────────────
export const isRenderableImageUrl = (value?: string | null): boolean => {
    if (!value) return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (trimmed === '...' || trimmed === 'undefined' || trimmed === 'null') return false;
    if (/^\.\.\.+$/.test(trimmed)) return false;
    if (trimmed.includes('...')) return false;
    return true;
};
