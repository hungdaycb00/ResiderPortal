import React from 'react';
import { MotionValue } from 'framer-motion';
import { useMotionValueEvent } from 'framer-motion';
import type { AlinMapMode } from './constants';

interface MapTilesProps {
  panX: MotionValue<number>;
  panY: MotionValue<number>;
  scale: MotionValue<number>;
  planeYScale: MotionValue<number>;
  myObfPos: { lat: number; lng: number } | null;
  mode: AlinMapMode;
}

const TILE_SIZE = 256;
const MIN_ZOOM = 8;
const MAX_ZOOM = 17;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const modulo = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

const lngToTileX = (lng: number, zoom: number) => ((lng + 180) / 360) * 2 ** zoom;

const latToTileY = (lat: number, zoom: number) => {
  const safeLat = clamp(lat, -85.05112878, 85.05112878);
  const rad = safeLat * Math.PI / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom;
};

const getTileZoom = (visualScale: number) => {
  const safeScale = Math.max(visualScale || 1, 0.05);
  return clamp(Math.round(13 + Math.log2(safeScale / 1.35) * 1.35), MIN_ZOOM, MAX_ZOOM);
};

const getTileUrl = (x: number, y: number, z: number) => {
  const subdomains = ['a', 'b', 'c', 'd'];
  const subdomain = subdomains[Math.abs(x + y) % subdomains.length];
  return `https://${subdomain}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
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

const MapTiles: React.FC<MapTilesProps> = ({ panX, panY, scale, myObfPos, mode }) => {
  const viewport = useViewportSize();
  const [pan, setPan] = React.useState({ x: panX.get(), y: panY.get() });
  const [visualScale, setVisualScale] = React.useState(scale.get());

  useMotionValueEvent(panX, 'change', (value) => setPan((prev) => ({ ...prev, x: value })));
  useMotionValueEvent(panY, 'change', (value) => setPan((prev) => ({ ...prev, y: value })));
  useMotionValueEvent(scale, 'change', setVisualScale);

  const tiles = React.useMemo(() => {
    if (!myObfPos || mode !== 'roadmap') return [];

    const zoom = getTileZoom(visualScale);
    const worldTileCount = 2 ** zoom;
    const centerTileX = lngToTileX(myObfPos.lng, zoom);
    const centerTileY = latToTileY(myObfPos.lat, zoom);
    const centerPixelX = centerTileX * TILE_SIZE;
    const centerPixelY = centerTileY * TILE_SIZE;
    const tileScale = clamp(visualScale / 1.15, 0.75, 2.35);
    const tileSize = TILE_SIZE * tileScale;
    const cols = Math.ceil(viewport.width / tileSize) + 5;
    const rows = Math.ceil(viewport.height / tileSize) + 5;
    const startX = Math.floor(centerTileX - cols / 2);
    const startY = Math.floor(centerTileY - rows / 2);
    const result: Array<{ key: string; src: string; left: number; top: number; size: number }> = [];

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const rawX = startX + col;
        const rawY = startY + row;
        if (rawY < 0 || rawY >= worldTileCount) continue;
        const tileX = modulo(rawX, worldTileCount);
        const tileY = rawY;
        const left = viewport.width / 2 + (rawX * TILE_SIZE - centerPixelX) * tileScale + pan.x * 0.38;
        const top = viewport.height / 2 + (rawY * TILE_SIZE - centerPixelY) * tileScale + pan.y * 0.38;
        result.push({
          key: `${zoom}-${tileX}-${tileY}`,
          src: getTileUrl(tileX, tileY, zoom),
          left,
          top,
          size: tileSize + 1,
        });
      }
    }

    return result;
  }, [mode, myObfPos?.lat, myObfPos?.lng, pan.x, pan.y, viewport.height, viewport.width, visualScale]);

  if (!myObfPos || mode !== 'roadmap') return null;

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#dfe8dd] pointer-events-none select-none">
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
          }}
        />
      ))}
      <div className="absolute bottom-1 left-[76px] rounded bg-white/80 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 shadow-sm">
        © OpenStreetMap © CARTO
      </div>
    </div>
  );
};

export default React.memo(MapTiles);
