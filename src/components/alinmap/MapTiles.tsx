import React from 'react';
import { MotionValue } from 'framer-motion';
import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  getRoadmapCenterFromPan,
  getRoadmapTileZoom,
  type AlinMapMode,
} from './constants';

interface MapTilesProps {
  panX: MotionValue<number>;
  panY: MotionValue<number>;
  scale: MotionValue<number>;
  planeYScale: MotionValue<number>;
  myObfPos: { lat: number; lng: number } | null;
  mode: AlinMapMode;
}

const DEFAULT_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const CACHE_WORKER_URL = '/alinmap-cache-sw.js';

let cacheWorkerRegistered = false;

const getStyleUrl = () =>
  (import.meta.env.VITE_MAP_STYLE_URL || DEFAULT_STYLE_URL).trim();

const canRegisterCacheWorker = () => {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  return window.location.protocol === 'https:' || window.location.hostname === 'localhost';
};

const registerMapCacheWorker = () => {
  if (cacheWorkerRegistered || !canRegisterCacheWorker()) return;
  cacheWorkerRegistered = true;
  navigator.serviceWorker.register(CACHE_WORKER_URL).catch(() => {
    cacheWorkerRegistered = false;
  });
};

const useMotionValueSnapshot = (value: MotionValue<number>) => {
  const frameRef = React.useRef<number | null>(null);

  React.useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
  }, []);

  return React.useSyncExternalStore(
    React.useCallback((notify) => value.on('change', () => {
      if (typeof window === 'undefined') {
        notify();
        return;
      }
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        notify();
      });
    }), [value]),
    React.useCallback(() => value.get(), [value]),
    React.useCallback(() => value.get(), [value])
  );
};

const MapTiles: React.FC<MapTilesProps> = ({ panX, panY, scale, planeYScale, myObfPos, mode }) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<MapLibreMap | null>(null);
  const [hasMapError, setHasMapError] = React.useState(false);
  const currentPanX = useMotionValueSnapshot(panX);
  const currentPanY = useMotionValueSnapshot(panY);
  const visualScale = useMotionValueSnapshot(scale);
  const currentPlaneYScale = useMotionValueSnapshot(planeYScale);
  const styleUrl = React.useMemo(getStyleUrl, []);

  const center = React.useMemo(() => (
    myObfPos
      ? getRoadmapCenterFromPan(myObfPos, currentPanX, currentPanY, currentPlaneYScale)
      : null
  ), [currentPanX, currentPanY, currentPlaneYScale, myObfPos]);

  const zoom = React.useMemo(() => getRoadmapTileZoom(visualScale), [visualScale]);
  const hasCenter = center !== null;

  React.useEffect(() => {
    registerMapCacheWorker();
  }, []);

  React.useEffect(() => {
    if (!containerRef.current || !center || mode !== 'roadmap') return;
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [center.lng, center.lat],
      zoom,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      refreshExpiredTiles: true,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    map.on('error', () => setHasMapError(true));
    map.on('load', () => setHasMapError(false));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [hasCenter, mode, styleUrl]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !center || mode !== 'roadmap') return;
    map.jumpTo({
      center: [center.lng, center.lat],
      zoom,
    });
  }, [center, mode, zoom]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || mode !== 'roadmap') return;
    const frame = window.requestAnimationFrame(() => map.resize());
    return () => window.cancelAnimationFrame(frame);
  }, [mode]);

  if (!myObfPos || mode !== 'roadmap') return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#dfe8df] select-none">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08),rgba(226,243,230,0.02)_42%,rgba(15,23,42,0.12))]" />
      {hasMapError && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-[3] -translate-x-1/2 rounded bg-slate-950/70 px-3 py-1 text-[10px] font-semibold text-slate-100 shadow-lg backdrop-blur">
          Map layer unavailable
        </div>
      )}
    </div>
  );
};

export default React.memo(MapTiles);
