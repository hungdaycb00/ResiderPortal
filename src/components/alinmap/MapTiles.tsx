import React, { useMemo } from 'react';
import { motion, MotionValue, useTransform } from 'framer-motion';

interface MapTilesProps {
  panX: MotionValue<number>;
  panY: MotionValue<number>;
  scale: MotionValue<number>;
  myObfPos: { lat: number; lng: number } | null;
  mode: 'satellite' | 'streets' | 'hybrid' | 'grid';
}

const DEGREES_TO_PX = 11100;
const TILE_SIZE = 256;

// Convert Lat/Lng to Tile Coordinates (Z/X/Y)
function project(lat: number, lng: number, zoom: number) {
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const x = ((lng + 180) / 360) * Math.pow(2, zoom);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * Math.pow(2, zoom);
  return { x, y };
}

const MapTiles: React.FC<MapTilesProps> = ({ panX, panY, scale, myObfPos, mode }) => {
  const [zLevel, setZLevel] = React.useState(14);
  const [tileOffset, setTileOffset] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    const checkViewport = () => {
      // Calculate dynamic Z based on scale
      const currentScale = scale.get();
      const calculatedZ = 14 + Math.floor(Math.log2(currentScale));
      // Restrict Z to valid Google Maps / Carto tile zoom levels (e.g., 2 to 21)
      const newZ = Math.max(2, Math.min(21, calculatedZ));
      
      const ratio = DEGREES_TO_PX / ((256 * Math.pow(2, newZ)) / 360);
      const tileWidthPx = TILE_SIZE * ratio;
      
      const offsetX = Math.round(-panX.get() / tileWidthPx);
      const offsetY = Math.round(-panY.get() / tileWidthPx);
      
      setZLevel(newZ);
      setTileOffset(prev => {
        if (prev.x !== offsetX || prev.y !== offsetY) {
          return { x: offsetX, y: offsetY };
        }
        return prev;
      });
    };

    const unsubscribeX = panX.on('change', checkViewport);
    const unsubscribeY = panY.on('change', checkViewport);
    const unsubscribeScale = scale.on('change', checkViewport);
    
    // Initial check
    checkViewport();

    return () => {
      unsubscribeX();
      unsubscribeY();
      unsubscribeScale();
    };
  }, [panX, panY, scale]);

  if (mode === 'grid' || !myObfPos) return null;

  const centerTile = project(myObfPos.lat, myObfPos.lng, zLevel);
  const ratio = DEGREES_TO_PX / ((256 * Math.pow(2, zLevel)) / 360);
  
  const tiles = [];
  for (let i = -7; i <= 7; i++) {
    for (let j = -7; j <= 7; j++) {
      const tx = Math.floor(centerTile.x) + tileOffset.x + i;
      const ty = Math.floor(centerTile.y) + tileOffset.y + j;
      const offsetX = (tx - centerTile.x) * TILE_SIZE * ratio;
      const offsetY = (ty - centerTile.y) * TILE_SIZE * ratio;
      
      tiles.push({
        id: `${zLevel}-${tx}-${ty}`,
        x: offsetX,
        y: offsetY,
        tx, ty, z: zLevel
      });
    }
  }

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-100">
      {tiles.map(tile => (
        <React.Fragment key={tile.id}>
          {/* Base Layer: Satellite */}
          <img
            src={`https://mt1.google.com/vt/lyrs=s&x=${tile.tx}&y=${tile.ty}&z=${tile.z}`}
            alt=""
            className="absolute"
            style={{
              width: TILE_SIZE * ratio + 1, // +1 to avoid gaps
              height: TILE_SIZE * ratio + 1,
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${tile.x}px), calc(-50% + ${tile.y}px))`,
            }}
          />
          {/* Overlay Layer: Roads (No Labels) */}
          <img
            src={`https://a.basemaps.cartocdn.com/light_nolabels/${tile.z}/${tile.tx}/${tile.ty}.png`}
            alt=""
            className="absolute mix-blend-overlay opacity-80"
            style={{
              width: TILE_SIZE * ratio + 1,
              height: TILE_SIZE * ratio + 1,
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${tile.x}px), calc(-50% + ${tile.y}px))`,
              filter: 'invert(1) brightness(2) contrast(1.2)', // Make roads glow on satellite
            }}
          />
        </React.Fragment>
      ))}
    </div>
  );
};

function getTileUrl(z: number, x: number, y: number, mode: string) {
  if (mode === 'satellite') {
    // Google Satellite
    return `https://mt1.google.com/vt/lyrs=s&x=${x}&y=${y}&z=${z}`;
  }
  if (mode === 'hybrid') {
    // Google Hybrid (Satellite + Roads + Labels)
    return `https://mt1.google.com/vt/lyrs=y&x=${x}&y=${y}&z=${z}`;
  }
  if (mode === 'streets') {
    // CartoDB Positron No Labels (Clean Roads/Boundaries)
    return `https://a.basemaps.cartocdn.com/light_nolabels/${z}/${x}/${y}.png`;
  }
  return `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

export default MapTiles;
