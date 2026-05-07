import * as THREE from 'three';
import { normalizeImageUrl } from '../../../services/externalApi';
import { DEGREES_TO_PX, MAP_PLANE_SCALE } from '../constants';

// ─── Constants ────────────────────────────────────────────────────────────────
export type LatLng = { lat: number; lng: number };

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

export const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

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

export const resolveRenderableImageUrl = (value?: string | null): string => {
    if (!isRenderableImageUrl(value)) return '';
    return normalizeImageUrl(value);
};

// ─── Texture Factories ────────────────────────────────────────────────────────
export const makeAvatarTexture = (name: string, imageUrl?: string | null): THREE.CanvasTexture => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return new THREE.CanvasTexture(canvas);
    }

    const bg = colorFromString(name || imageUrl || 'alin');
    const drawFallback = () => {
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, bg);
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0.95)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 92px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 18;
        ctx.fillText(initialsForName(name), size / 2, size / 2 + 4);
    };

    const seed = encodeURIComponent(name || 'alin');
    const randomSpriteUrl = `https://api.dicebear.com/7.x/pixel-art/png?seed=${seed}`;
    const finalImageUrl = resolveRenderableImageUrl(imageUrl) || randomSpriteUrl;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        ctx.clearRect(0, 0, size, size);
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, bg);
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size * 0.47, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, 0, 0, size, size);
        ctx.restore();

        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size * 0.47, 0, Math.PI * 2);
        ctx.lineWidth = 10;
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.stroke();

        texture.needsUpdate = true;
    };
    img.onerror = drawFallback;
    img.src = finalImageUrl;

    drawFallback();
    return texture;
};

export const makeBadgeTexture = (title: string, subtitle?: string, accent = '#22d3ee'): THREE.CanvasTexture => {
    const width = 512;
    const height = 168;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return new THREE.CanvasTexture(canvas);
    }

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(2, 6, 23, 0.95)');
    gradient.addColorStop(1, accent);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 0, width, 20);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '900 42px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;
    ctx.fillText(title, width / 2, height * 0.42);

    if (subtitle) {
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '800 22px Inter, system-ui, sans-serif';
        ctx.fillText(subtitle, width / 2, height * 0.72);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
};
