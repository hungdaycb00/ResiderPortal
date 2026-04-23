import { MotionValue } from 'framer-motion';

// 1 degree of lat/lng ≈ 111km. We want 1km ≈ 100px on screen.
// So 1 degree = 111 * 100 = 11100 pixels
export const DEGREES_TO_PX = 11100;

export interface AlinMapProps {
    user: any;
    onClose: () => void;
    externalApi: any;
    games: any[];
    friends?: any[];
    onOpenChat?: (id: string, name: string, avatar?: string) => void;
    showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
    initialMainTab?: string;
    handlePlayGame?: (game: any) => void;
    onTabChange?: (tab: string) => void;
    cloudflareUrl?: string;
    triggerAuth?: (callback: () => void) => void;
    externalOpenList?: boolean;
    onOpenListChange?: (v: boolean) => void;
}

export interface SpatialNodeProps {
    user: any;
    myPos: { lat: number; lng: number };
    onClick: () => void;
    mapScale: MotionValue<number>;
}

export function getWeatherInfo(code: number): { icon: string; desc: string } {
    if (code === 0) return { icon: '☀️', desc: 'Clear Sky' };
    if (code <= 3) return { icon: '☁️', desc: 'Cloudy' };
    if (code <= 48) return { icon: '🌫️', desc: 'Fog' };
    if (code <= 57) return { icon: '🌦️', desc: 'Drizzle' };
    if (code <= 67) return { icon: '🌧️', desc: 'Rain' };
    if (code <= 77) return { icon: '❄️', desc: 'Snow' };
    if (code <= 82) return { icon: '🌧️', desc: 'Showers' };
    if (code >= 95) return { icon: '⛈️', desc: 'Thunderstorm' };
    return { icon: '🌤️', desc: 'Clear' };
}
