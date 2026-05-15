import { useEffect, useMemo, useState } from 'react';

export type AdaptivePerformanceMode = 'high' | 'balanced' | 'low';
export type AdaptiveLabelMode = 'full' | 'name-only' | 'focus-only';
export type AdaptiveBackgroundMode = 'full' | 'reduced' | 'minimal';

export interface AdaptivePerformanceProfile {
  mode: AdaptivePerformanceMode;
  isPageVisible: boolean;
  dpr: [number, number];
  maxDevicePixelRatio: number;
  antialias: boolean;
  powerPreference: 'high-performance' | 'low-power';
  backgroundMode: AdaptiveBackgroundMode;
  labelMode: AdaptiveLabelMode;
  showMotionDecorations: boolean;
  maxNearbyUsers: number;
  wsPingIntervalMs: number;
}

const DEFAULT_PROFILE: AdaptivePerformanceProfile = {
  mode: 'high',
  isPageVisible: true,
  dpr: [1, 1.5],
  maxDevicePixelRatio: 1.5,
  antialias: true,
  powerPreference: 'high-performance',
  backgroundMode: 'full',
  labelMode: 'full',
  showMotionDecorations: true,
  maxNearbyUsers: 90,
  wsPingIntervalMs: 45000,
};

const readPageVisibility = () => (typeof document === 'undefined' ? true : document.visibilityState !== 'hidden');

const readPerformanceProfile = (): AdaptivePerformanceProfile => {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;

  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string; addEventListener?: (type: string, listener: () => void) => void; removeEventListener?: (type: string, listener: () => void) => void };
    mozConnection?: { saveData?: boolean; effectiveType?: string; addEventListener?: (type: string, listener: () => void) => void; removeEventListener?: (type: string, listener: () => void) => void };
    webkitConnection?: { saveData?: boolean; effectiveType?: string; addEventListener?: (type: string, listener: () => void) => void; removeEventListener?: (type: string, listener: () => void) => void };
    hardwareConcurrency?: number;
    deviceMemory?: number;
  };

  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
  const saveData = !!connection?.saveData;
  const effectiveType = String(connection?.effectiveType || '');
  const cores = typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : 4;
  const memory = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : 4;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const narrowViewport = window.matchMedia('(max-width: 768px)').matches;

  // SPRINT 2: iOS detection — iOS không bao giờ expose deviceMemory
  // nên cores<=4 && memory<=4 luôn true trên iOS gây nhận dạng sai
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // SPRINT 2: GPU tier detection từ WebGL renderer string
  let isHighEndGPU = false;
  try {
    const glCanvas = document.createElement('canvas');
    const gl = glCanvas.getContext('webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = ext ? (gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string) || '' : '';
      isHighEndGPU = /A15|A16|A17|A18|Snapdragon 8 Gen [23]|Adreno 7[0-9][0-9]/.test(renderer);
    }
  } catch { /* skip */ }

  const lowEndSignals = saveData
    || reducedMotion
    // iOS fix: bỏ qua kiểm tra cores/memory trên iOS vì không tin cậy
    || (!isIOS && (cores <= 4 || memory <= 4))
    || effectiveType === 'slow-2g'
    || effectiveType === '2g';

  const mobileLike = coarsePointer || narrowViewport || isIOS;

  let mode: AdaptivePerformanceMode = 'high';
  if (lowEndSignals) mode = 'low';
  else if (mobileLike) mode = 'balanced';

  // SPRINT 2: iOS high-end GPU — upgrade từ 'low' lên 'balanced' nếu GPU mạnh
  if (isIOS && isHighEndGPU && mode === 'low') mode = 'balanced';

  if (mode === 'low') {
    return {
      mode,
      isPageVisible: readPageVisibility(),
      dpr: [0.65, 0.9],
      maxDevicePixelRatio: 0.9,
      antialias: false,
      powerPreference: 'low-power',
      backgroundMode: 'minimal',
      labelMode: 'focus-only',
      showMotionDecorations: false,
      maxNearbyUsers: 24,
      wsPingIntervalMs: 90000,
    };
  }

  if (mode === 'balanced') {
    return {
      mode,
      isPageVisible: readPageVisibility(),
      dpr: [0.8, 1.0],
      maxDevicePixelRatio: 1.0,
      antialias: false,
      powerPreference: 'low-power',
      backgroundMode: 'reduced',
      labelMode: 'name-only',
      showMotionDecorations: true,
      maxNearbyUsers: 48,
      wsPingIntervalMs: 60000,
    };
  }

  return {
    ...DEFAULT_PROFILE,
    isPageVisible: readPageVisibility(),
  };
};

export function useAdaptivePerformance(): AdaptivePerformanceProfile {
  const [profile, setProfile] = useState<AdaptivePerformanceProfile>(() => readPerformanceProfile());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => setProfile(readPerformanceProfile());
    const nav = navigator as Navigator & {
      connection?: { addEventListener?: (type: string, listener: () => void) => void; removeEventListener?: (type: string, listener: () => void) => void };
      mozConnection?: { addEventListener?: (type: string, listener: () => void) => void; removeEventListener?: (type: string, listener: () => void) => void };
      webkitConnection?: { addEventListener?: (type: string, listener: () => void) => void; removeEventListener?: (type: string, listener: () => void) => void };
    };
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    const mediaQueries = [
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(pointer: coarse)'),
      window.matchMedia('(max-width: 768px)'),
    ];

    mediaQueries.forEach((query) => {
      if (typeof query.addEventListener === 'function') {
        query.addEventListener('change', update);
      } else {
        query.addListener(update);
      }
    });

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    document.addEventListener('visibilitychange', update);
    connection?.addEventListener?.('change', update);

    return () => {
      mediaQueries.forEach((query) => {
        if (typeof query.removeEventListener === 'function') {
          query.removeEventListener('change', update);
        } else {
          query.removeListener(update);
        }
      });
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      document.removeEventListener('visibilitychange', update);
      connection?.removeEventListener?.('change', update);
    };
  }, []);

  return useMemo(() => profile, [profile]);
}
