import { normalizeImageUrl } from '../services/externalApi';

export interface AvatarFallbackOptions {
    size?: number;
    background?: string;
    color?: string;
    bold?: boolean;
}

export const buildAvatarFallbackUrl = (name: string, options: AvatarFallbackOptions = {}) => {
    const params = new URLSearchParams({
        name: name || 'User',
        background: options.background || '3b82f6',
        color: options.color || 'fff',
        size: String(options.size || 150),
        bold: options.bold === false ? 'false' : 'true',
    });
    return `https://ui-avatars.com/api/?${params.toString()}`;
};

export const resolveAvatarSrc = (
    avatarUrl?: string | null,
    fallbackName = 'User',
    options: AvatarFallbackOptions = {},
) => normalizeImageUrl(avatarUrl) || buildAvatarFallbackUrl(fallbackName, options);

