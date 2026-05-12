import * as THREE from 'three';
import { normalizeImageUrl } from '../../../services/externalApi';
import { colorFromString, initialsForName, isRenderableImageUrl } from './sceneCoords';

// ─── URL Resolution ───────────────────────────────────────────────────────────
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
        ctx.font = '800 92px system-ui, sans-serif';
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
    ctx.font = '800 42px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;
    ctx.fillText(title, width / 2, height * 0.42);

    if (subtitle) {
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '800 22px system-ui, sans-serif';
        ctx.fillText(subtitle, width / 2, height * 0.72);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
};

export const makeLootSpriteTexture = (type: string, title?: string, accent = '#22d3ee', icon?: string): THREE.CanvasTexture => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    const cx = size / 2;
    const cy = size / 2 - 20;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
    grad.addColorStop(0, `${accent}66`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.translate(cx, cy);

    const fallbackIconByType: Record<string, string> = {
        boat: '⛵',
        fortress: '🏰',
        bag: '🎒',
        chest: '📦',
        gem: '💎',
        item: '💎',
    };
    const displayIcon = icon || fallbackIconByType[type];

    if (displayIcon && type !== 'portal' && type !== 'enemy' && type !== 'target') {
        ctx.shadowColor = accent;
        ctx.shadowBlur = 20;
        ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
        ctx.beginPath();
        ctx.arc(0, 0, 64, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = `${accent}cc`;
        ctx.stroke();
        ctx.font = '800 112px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 10;
        ctx.fillText(displayIcon, 0, 8);
    } else if (type === 'portal') {
        const pGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 60);
        pGrad.addColorStop(0, '#f3e8ff');
        pGrad.addColorStop(0.5, '#a855f7');
        pGrad.addColorStop(1, 'rgba(168,85,247,0)');
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.ellipse(0, 0, 40 - i * 10, 20 - i * 5, (Math.PI / 4) * i, 0, Math.PI * 2);
            ctx.stroke();
        }
    } else if (type === 'enemy') {
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 20, 40, 0, Math.PI);
        ctx.lineTo(-30, -10);
        ctx.lineTo(30, -10);
        ctx.fill();
        ctx.fillStyle = '#fee2e2';
        ctx.beginPath();
        ctx.moveTo(0, -60);
        ctx.lineTo(35, -10);
        ctx.lineTo(-20, -10);
        ctx.fill();
        ctx.fillStyle = '#451a03';
        ctx.fillRect(-2, -70, 4, 90);
    } else if (type === 'target') {
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(0, -20, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-28, -10);
        ctx.lineTo(28, -10);
        ctx.lineTo(0, 40);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, -20, 12, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.shadowColor = accent;
        ctx.shadowBlur = 15;
        const gGrad = ctx.createLinearGradient(0, -40, 0, 40);
        gGrad.addColorStop(0, '#ffffff');
        gGrad.addColorStop(0.3, accent);
        gGrad.addColorStop(1, '#083344');
        ctx.fillStyle = gGrad;
        ctx.beginPath();
        ctx.moveTo(0, -40);
        ctx.lineTo(35, -10);
        ctx.lineTo(0, 40);
        ctx.lineTo(-35, -10);
        ctx.closePath();
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.moveTo(0, -35);
        ctx.lineTo(20, -10);
        ctx.lineTo(0, 30);
        ctx.lineTo(-20, -10);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();

    if (title) {
        ctx.fillStyle = '#ffffff';
    ctx.font = '800 24px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(title, cx, 25);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
};

/**
 * Tạo texture từ emoji/text bằng Canvas.
 * Được dùng bởi LootSprite để hiển thị vật phẩm.
 */
export const createTextCanvasTexture = (text: string, size = 128): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (ctx) {
        ctx.clearRect(0, 0, size, size);
        ctx.font = `${size * 0.7}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Vẽ shadow nhẹ để icon nổi bật hơn
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = size * 0.1;
        ctx.shadowOffsetX = size * 0.05;
        ctx.shadowOffsetY = size * 0.05;

        ctx.fillText(text, size / 2, size / 2 + size * 0.05);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
};
