import React from 'react';
import { MotionValue } from 'framer-motion';

// 1 degree of lat/lng ≈ 111km. We want 1km ≈ 100px on screen.
// So 1 degree = 111 * 100 = 11100 pixels
export const DEGREES_TO_PX = 11100;
export const MAP_TILT_DEGREES = 60;
export const MAP_PLANE_SCALE = 1.32;
export const MAP_PLANE_Y_SCALE = MAP_PLANE_SCALE * Math.cos((MAP_TILT_DEGREES * Math.PI) / 180);

export const CAMERA_FOV_DEGREES = 75;
export const CAMERA_Z_FAR = -100000;
export const CAMERA_Z_DEFAULT = 0;
export const CAMERA_Z_NEAR = 260;
export const CAMERA_HEIGHT_DEFAULT_PCT = 42;
export const CAMERA_HEIGHT_MIN_PCT = 20;
export const CAMERA_HEIGHT_MAX_PCT = 80;
export const CAMERA_ROTATE_DEFAULT_DEG = 0;
export const CAMERA_ROTATE_MIN_DEG = -180;
export const CAMERA_ROTATE_MAX_DEG = 180;
export const CAMERA_ROTATE_X_DEFAULT_DEG = 0;
export const CAMERA_ROTATE_X_MIN_DEG = -75;
export const CAMERA_ROTATE_X_MAX_DEG = 75;
export const CAMERA_ROTATE_Y_DEFAULT_DEG = 0;
export const CAMERA_ROTATE_Y_MIN_DEG = -180;
export const CAMERA_ROTATE_Y_MAX_DEG = 180;
export const BILLBOARD_UPRIGHT_PITCH_DEGREES = 70;
export const BILLBOARD_UPRIGHT_LIFT_PX = 40;
export const CAMERA_TILT_FAR_DEGREES = 64;
export const CAMERA_TILT_NEAR_DEGREES = 42;
export const LIKE_THRESHOLD_FOR_SCALE = 20;
export const FEATURED_BILLBOARD_FAR_SCALE = 1.35;

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const interpolate = (value: number, input: [number, number], output: [number, number]) => {
    const [inMin, inMax] = input;
    const [outMin, outMax] = output;
    if (inMin === inMax) return outMin;
    const t = clamp((value - inMin) / (inMax - inMin), 0, 1);
    return outMin + (outMax - outMin) * t;
};

export const getPerspectivePx = (viewportHeight: number) => {
    const safeHeight = Math.max(viewportHeight || 0, 320);
    return safeHeight / (2 * Math.tan((CAMERA_FOV_DEGREES / 2) * Math.PI / 180));
};

export const getVisualScaleFromCameraZ = (cameraZ: number, perspectivePx: number) => {
    const safePerspective = Math.max(perspectivePx || 0, 320);
    return clamp(safePerspective / Math.max(1, safePerspective - cameraZ), 0.02, 8);
};

export const getCameraZForVisualScale = (visualScale: number, perspectivePx: number) => {
    const safePerspective = Math.max(perspectivePx || 0, 320);
    const safeScale = clamp(visualScale, 0.02, 8);
    return clamp(safePerspective - safePerspective / safeScale, CAMERA_Z_FAR, CAMERA_Z_NEAR);
};

export const getTiltAngleFromCameraZ = (cameraZ: number) =>
    interpolate(
        cameraZ,
        [CAMERA_Z_FAR, CAMERA_Z_NEAR],
        [CAMERA_TILT_FAR_DEGREES, CAMERA_TILT_NEAR_DEGREES]
    );

export const getPlaneYScaleFromTilt = (tiltDegrees: number) =>
    MAP_PLANE_SCALE * Math.cos((tiltDegrees * Math.PI) / 180);

export interface AlinMapProps {
    user: any;
    onClose: () => void;
    externalApi: any;
    profileUserId?: string | null;
    profileStatus?: string;
    games: any[];
    friends?: any[];
    onOpenChat?: (id: string, name: string, avatar?: string) => void;
    showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
    initialMainTab?: string;
    handlePlayGame?: (game: any) => void;
    onTabChange?: (tab: string) => void;
    cloudflareUrl?: string;
    triggerAuth?: (callback: () => void) => void;
    logout?: () => void;
    externalOpenList?: boolean;
    onOpenListChange?: (v: boolean) => void;
}

export interface SpatialNodeProps {
    user: any;
    myPos: { lat: number; lng: number };
    onClick: () => void;
    mapScale: MotionValue<number>;
    onContextMenu?: (e: React.MouseEvent, user: any) => void;
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
