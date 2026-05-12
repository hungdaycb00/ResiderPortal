import React from 'react';
import { MotionValue } from 'framer-motion';
import {
  getRoadmapCenterFromPan,
  getRoadmapTileScale,
  getRoadmapTileZoom,
  ROADMAP_TILE_SIZE,
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

const DEFAULT_PROVIDER = 'carto';
const CARTO_TILE_VARIANTS = {
  base: 'voyager_nolabels',
  labels: 'voyager_only_labels',
} as const;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const modulo = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

const lngToTileX = (lng: number, zoom: number) => ((lng + 180) / 360) * 2 ** zoom;

const latToTileY = (lat: number, zoom: number) => {
  const safeLat = clamp(lat, -85.05112878, 85.05112878);
  const rad = safeLat * Math.PI / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom;
};

const getTileUrl = (
  x: number,
  y: number,
  z: number,
  provider: string,
  layer: 'base' | 'labels' | 'osm'
) => {
  if (provider === 'osm' || layer === 'osm') {
    const subdomains = ['a', 'b', 'c'];
    const subdomain = subdomains[Math.abs(x + y) % subdomains.length];
    return `https://${subdomain}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
  }

  const subdomains = ['a', 'b', 'c', 'd'];
  const subdomain = subdomains[Math.abs(x + y) % subdomains.length];
  const variant = CARTO_TILE_VARIANTS[layer === 'labels' ? 'labels' : 'base'];
  const highResSuffix = typeof window !== 'undefined' && window.devicePixelRatio >= 1.5 ? '@2x' : '';
  return `https://${subdomain}.basemaps.cartocdn.com/rastertiles/${variant}/${z}/${x}/${y}${highResSuffix}.png`;
};

const useViewportSize = () => {
  const [size, setSize] = React.useState(() => ({
    width: typeof window === 'undefined' ? 1200 : window.innerWidth,
    height: typeof window === 'undefined' ? 800 : window.innerHeight,
  }));

  React.useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
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
  const viewport = useViewportSize();
  const currentPanX = useMotionValueSnapshot(panX);
  const currentPanY = useMotionValueSnapshot(panY);
  const visualScale = useMotionValueSnapshot(scale);
  const currentPlaneYScale = useMotionValueSnapshot(planeYScale);
  const provider = React.useMemo(
    () => (import.meta.env.VITE_MAP_TILE_PROVIDER || DEFAULT_PROVIDER).toLowerCase(),
    []
  );
  const isCartoProvider = provider !== 'osm';

  const attribution = React.useMemo(() => {
    return provider === 'osm'
      ? '© OpenStreetMap'
      : '© OpenStreetMap © CARTO';
  }, [provider]);

  const tiles = React.useMemo(() => {
    if (!myObfPos || mode !== 'roadmap') return [];

    const zoom = getRoadmapTileZoom(visualScale);
    const center = getRoadmapCenterFromPan(myObfPos, currentPanX, currentPanY, currentPlaneYScale);
    const worldTileCount = 2 ** zoom;
    const centerTileX = lngToTileX(center.lng, zoom);
    const centerTileY = latToTileY(center.lat, zoom);
    const centerPixelX = centerTileX * ROADMAP_TILE_SIZE;
    const centerPixelY = centerTileY * ROADMAP_TILE_SIZE;
    const tileScale = getRoadmapTileScale(visualScale);
    const tileSize = ROADMAP_TILE_SIZE * tileScale;
    const cols = Math.ceil(viewport.width / tileSize) + 5;
    const rows = Math.ceil(viewport.height / tileSize) + 5;
    const startX = Math.floor(centerTileX - cols / 2);
    const startY = Math.floor(centerTileY - rows / 2);
    const result: Array<{
      key: string;
      src: string;
      left: number;
      top: number;
      size: number;
      layer: 'base' | 'labels';
    }> = [];

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const rawX = startX + col;
        const rawY = startY + row;
        if (rawY < 0 || rawY >= worldTileCount) continue;
        const tileX = modulo(rawX, worldTileCount);
        const tileY = rawY;
        const left = viewport.width / 2 + (rawX * ROADMAP_TILE_SIZE - centerPixelX) * tileScale;
        const top = viewport.height / 2 + (rawY * ROADMAP_TILE_SIZE - centerPixelY) * tileScale;

        result.push({
          key: `base-${zoom}-${tileX}-${tileY}`,
          src: getTileUrl(tileX, tileY, zoom, provider, isCartoProvider ? 'base' : 'osm'),
          left,
          top,
          size: tileSize + 1,
          layer: 'base',
        });

        if (isCartoProvider) {
          result.push({
            key: `labels-${zoom}-${tileX}-${tileY}`,
            src: getTileUrl(tileX, tileY, zoom, provider, 'labels'),
            left,
            top,
            size: tileSize + 1,
            layer: 'labels',
          });
        }
      }
    }

    return result;
  }, [currentPanX, currentPanY, currentPlaneYScale, isCartoProvider, mode, myObfPos, provider, viewport.height, viewport.width, visualScale]);

  if (!myObfPos || mode !== 'roadmap') return null;

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#eef3ed] pointer-events-none select-none">
      {tiles.map((tile) => (
        <img
          key={tile.key}
          src={tile.src}
          alt=""
          draggable={false}
          className="absolute max-w-none"
          style={{
            left: `${tile.left}px`,
            top: `${tile.top}px`,
            width: `${tile.size}px`,
            height: `${tile.size}px`,
            transform: 'translate3d(0,0,0)',
            zIndex: tile.layer === 'labels' ? 2 : 1,
            opacity: tile.layer === 'labels' ? 0.99 : 1,
          }}
        />
      ))}
      <div className="absolute bottom-1 left-[76px] rounded bg-white/85 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 shadow-sm">
        {attribution}
      </div>
    </div>
  );
};

export default React.memo(MapTiles);
