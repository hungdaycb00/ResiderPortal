import React from 'react';
import { MotionValue } from 'framer-motion';
import maplibregl, { type Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl';
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

const DEFAULT_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
const CACHE_WORKER_URL = '/alinmap-cache-sw.js';
const NUMERIC_MIN_FALLBACK = -999999999;
const NUMERIC_MAX_FALLBACK = 999999999;

const STYLE_NUMBER_DEFAULTS: Record<string, number> = {
  'icon-size': 1,
  'icon-opacity': 1,
  'text-size': 12,
  'text-opacity': 1,
  'line-width': 1,
  'line-opacity': 1,
  'circle-radius': 5,
  'circle-opacity': 1,
  'fill-opacity': 1,
  'icon-rotate': 0,
  'text-rotate': 0,
};

let cacheWorkerRegistered = false;

type JsonObject = Record<string, unknown>;
type MissingImageEvent = { id: string };
type MapErrorEvent = { error?: { message?: string } };

const getStyleUrl = () =>
  (import.meta.env.VITE_MAP_STYLE_URL || DEFAULT_STYLE_URL).trim();

const canRegisterCacheWorker = () => {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  return window.location.protocol === 'https:' || window.location.hostname === 'localhost';
};

const isGetExpression = (value: unknown): value is ['get', string, ...unknown[]] => (
  Array.isArray(value) && value[0] === 'get' && typeof value[1] === 'string'
);

const getNumericFallback = (operator: string, comparisonValue: number) => {
  if (operator === '<' || operator === '<=') return NUMERIC_MAX_FALLBACK;
  if (operator === '!=') return comparisonValue;
  return NUMERIC_MIN_FALLBACK;
};

const patchStyleExpression = (value: unknown): unknown => {
  if (value === null) return value;

  if (Array.isArray(value)) {
    const [operator, left, right, ...rest] = value;

    if (operator === 'to-number' && isGetExpression(left) && value.length === 2) {
      return ['to-number', patchStyleExpression(left), NUMERIC_MIN_FALLBACK];
    }

    if (operator === 'step' && isGetExpression(left)) {
      return [
        operator,
        ['to-number', patchStyleExpression(left), NUMERIC_MIN_FALLBACK],
        right,
        ...rest.map(patchStyleExpression),
      ];
    }

    if (operator === 'interpolate' && isGetExpression(right)) {
      return [
        operator,
        patchStyleExpression(left),
        ['to-number', patchStyleExpression(right), NUMERIC_MIN_FALLBACK],
        ...rest.map(patchStyleExpression),
      ];
    }

    if (
      typeof operator === 'string'
      && ['>', '>=', '<', '<=', '==', '!='].includes(operator)
      && typeof right === 'number'
      && isGetExpression(left)
    ) {
      return [
        operator,
        ['to-number', patchStyleExpression(left), getNumericFallback(operator, right)],
        right,
        ...rest.map(patchStyleExpression),
      ];
    }

    if (
      typeof operator === 'string'
      && ['>', '>=', '<', '<=', '==', '!='].includes(operator)
      && typeof left === 'number'
      && isGetExpression(right)
    ) {
      return [
        operator,
        left,
        ['to-number', patchStyleExpression(right), getNumericFallback(operator, left)],
        ...rest.map(patchStyleExpression),
      ];
    }

    return value.map(patchStyleExpression);
  }

  if (typeof value === 'object') {
    const result: JsonObject = {};
    const source = value as JsonObject;
    for (const key of Object.keys(source)) {
      const child = source[key];
      if (child === null && key in STYLE_NUMBER_DEFAULTS) {
        result[key] = STYLE_NUMBER_DEFAULTS[key];
      } else {
        result[key] = patchStyleExpression(child);
      }
    }
    return result;
  }

  return value;
};

const fetchAndPatchStyle = async (url: string): Promise<StyleSpecification> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch style: ${res.status}`);
  const style = await res.json() as StyleSpecification;
  if (Array.isArray(style.layers)) {
    style.layers = patchStyleExpression(style.layers) as StyleSpecification['layers'];
  }
  return style;
};

const createFallbackIcon = () => ({
  width: 1,
  height: 1,
  data: new Uint8Array([0, 0, 0, 0]),
});

const isNoisyMapLibreError = (event: MapErrorEvent) => {
  const message = event.error?.message ?? '';
  return (
    message.includes('Expected value to be of type number')
    || message.includes('could not be loaded')
  );
};

const registerMapCacheWorker = () => {
  if (cacheWorkerRegistered || !canRegisterCacheWorker()) return;
  cacheWorkerRegistered = true;
  navigator.serviceWorker.register(CACHE_WORKER_URL).catch(() => {
    cacheWorkerRegistered = false;
  });
};

const MapTiles: React.FC<MapTilesProps> = ({ panX, panY, scale, planeYScale, myObfPos, mode }) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<MapLibreMap | null>(null);
  const positionRef = React.useRef(myObfPos);
  const syncFrameRef = React.useRef<number | null>(null);
  const lastViewRef = React.useRef<{ lat: number; lng: number; zoom: number } | null>(null);
  const missingImageIdsRef = React.useRef(new Set<string>());
  const styleUrl = React.useMemo(getStyleUrl, []);
  const hasPosition = myObfPos !== null;

  const syncMapView = React.useCallback(() => {
    const map = mapRef.current;
    const position = positionRef.current;
    if (!map || !position || mode !== 'roadmap') return;

    const center = getRoadmapCenterFromPan(
      position,
      panX.get(),
      panY.get(),
      planeYScale.get()
    );
    const zoom = getRoadmapTileZoom(scale.get());
    const lastView = lastViewRef.current;

    if (
      lastView
      && Math.abs(center.lng - lastView.lng) < 0.000001
      && Math.abs(center.lat - lastView.lat) < 0.000001
      && Math.abs(zoom - lastView.zoom) < 0.01
    ) {
      return;
    }

    lastViewRef.current = { lat: center.lat, lng: center.lng, zoom };
    map.jumpTo({ center: [center.lng, center.lat], zoom });
  }, [mode, panX, panY, planeYScale, scale]);

  const scheduleMapViewSync = React.useCallback(() => {
    if (typeof window === 'undefined' || syncFrameRef.current !== null) return;
    syncFrameRef.current = window.requestAnimationFrame(() => {
      syncFrameRef.current = null;
      syncMapView();
    });
  }, [syncMapView]);

  React.useEffect(() => {
    registerMapCacheWorker();
  }, []);

  React.useEffect(() => {
    positionRef.current = myObfPos;
    scheduleMapViewSync();
  }, [myObfPos, scheduleMapViewSync]);

  React.useEffect(() => {
    const initialPosition = positionRef.current;
    if (!containerRef.current || !initialPosition || mode !== 'roadmap') return;
    if (mapRef.current) return;

    let cancelled = false;

    const initMap = async () => {
      let styleOrUrl: string | StyleSpecification = styleUrl;
      try {
        styleOrUrl = await fetchAndPatchStyle(styleUrl);
      } catch (e) {
        console.warn('[MapTiles] Failed to fetch/validate style, using raw URL:', e);
      }
      if (cancelled || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: styleOrUrl,
        center: [initialPosition.lng, initialPosition.lat],
        zoom: getRoadmapTileZoom(scale.get()),
        interactive: false,
        attributionControl: false,
        fadeDuration: 0,
        refreshExpiredTiles: true,
      });

      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
      map.on('error', (event: MapErrorEvent) => {
        if (!isNoisyMapLibreError(event)) {
          console.warn('[MapTiles] MapLibre error:', event.error);
        }
      });
      map.on('styleimagemissing', (event: MissingImageEvent) => {
        if (!event.id || map.hasImage(event.id) || missingImageIdsRef.current.has(event.id)) return;
        missingImageIdsRef.current.add(event.id);
        map.addImage(event.id, createFallbackIcon(), { pixelRatio: 1 });
      });
      mapRef.current = map;
      scheduleMapViewSync();
    };

    initMap();

    return () => {
      cancelled = true;
      if (syncFrameRef.current !== null) {
        window.cancelAnimationFrame(syncFrameRef.current);
        syncFrameRef.current = null;
      }
      lastViewRef.current = null;
      missingImageIdsRef.current.clear();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [hasPosition, mode, scale, scheduleMapViewSync, styleUrl]);

  React.useEffect(() => {
    if (mode !== 'roadmap') return;

    const unsubscribers = [
      panX.on('change', scheduleMapViewSync),
      panY.on('change', scheduleMapViewSync),
      scale.on('change', scheduleMapViewSync),
      planeYScale.on('change', scheduleMapViewSync),
    ];

    scheduleMapViewSync();

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      if (syncFrameRef.current !== null) {
        window.cancelAnimationFrame(syncFrameRef.current);
        syncFrameRef.current = null;
      }
    };
  }, [mode, panX, panY, planeYScale, scale, scheduleMapViewSync]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || mode !== 'roadmap') return;
    const frame = window.requestAnimationFrame(() => map.resize());
    return () => window.cancelAnimationFrame(frame);
  }, [mode]);

  if (!myObfPos || mode !== 'roadmap') return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#dfe8df] select-none">
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08),rgba(226,243,230,0.02)_42%,rgba(15,23,42,0.12))]" />
    </div>
  );
};

export default React.memo(MapTiles);
