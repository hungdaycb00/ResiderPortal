import React, { useState, useEffect } from 'react';
import { MotionValue } from 'framer-motion';
import { DEGREES_TO_PX } from './constants';

interface MapTilesProps {
  panX: MotionValue<number>;
  panY: MotionValue<number>;
  scale: MotionValue<number>;
  myObfPos: { lat: number; lng: number } | null;
  mode: 'grid' | 'satellite';
}

const TILE_SIZE = 256;

// Web Mercator projection: convert lat/lng to tile coordinates
function project(lat: number, lng: number, zoom: number) {
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const x = ((lng + 180) / 360) * Math.pow(2, zoom);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * Math.pow(2, zoom);
  return { x, y };
}

const MapTiles: React.FC<MapTilesProps> = ({ panX, panY, scale, myObfPos, mode }) => {
  const [zLevel, setZLevel] = useState(14);
  const [tileOffset, setTileOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const checkViewport = () => {
      // 1. Calculate dynamic Zoom Level (Z) based on scale
      // scale 1.0 -> Z 14
      const currentScale = scale.get();
      const calculatedZ = Math.min(21, Math.max(2, 14 + Math.floor(Math.log2(currentScale))));
      setZLevel(calculatedZ);

      // 2. Handle infinite panning by tracking how many tiles we've moved
      // ratio: how many pixels per degree at this zoom level
      const ratio = DEGREES_TO_PX / ((TILE_SIZE * Math.pow(2, calculatedZ)) / 360);
      const tileWidthPx = TILE_SIZE * ratio;
      
      const currentPanX = panX.get();
      const currentPanY = panY.get();
      
      setTileOffset({
        x: -Math.floor(currentPanX / tileWidthPx),
        y: -Math.floor(currentPanY / tileWidthPx)
      });
    };

    // Listen to Framer Motion values
    const unsubscribeX = panX.on('change', checkViewport);
    const unsubscribeY = panY.on('change', checkViewport);
    const unsubscribeScale = scale.on('change', checkViewport);

    // Initial run
    checkViewport();

    return () => {
      unsubscribeX();
      unsubscribeY();
      unsubscribeScale();
    };
  }, [panX, panY, scale]);

  if (mode === 'grid' || !myObfPos) return null;

  // Use dynamic zLevel for projection
  const centerTile = project(myObfPos.lat, myObfPos.lng, zLevel);
  const ratio = DEGREES_TO_PX / ((TILE_SIZE * Math.pow(2, zLevel)) / 360);

  const tiles = [];
  // Render a 15x15 grid of tiles around the current offset
  for (let i = -7 + tileOffset.x; i <= 7 + tileOffset.x; i++) {
    for (let j = -7 + tileOffset.y; j <= 7 + tileOffset.y; j++) {
      const tx = Math.floor(centerTile.x) + i;
      const ty = Math.floor(centerTile.y) + j;
      
      // Calculate tile position relative to center
      const offsetX = (tx - centerTile.x) * TILE_SIZE * ratio;
      const offsetY = (ty - centerTile.y) * TILE_SIZE * ratio;

      tiles.push({
        id: `${zLevel}-${tx}-${ty}`,
        x: offsetX,
        y: offsetY,
        tx, 
        ty, 
        z: zLevel
      });
    }
  }

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-100">
      {tiles.map((tile) => (
        <div
          key={tile.id}
          className="absolute"
          style={{
            width: TILE_SIZE * ratio + 1, // +1 to avoid tiny gaps between tiles
            height: TILE_SIZE * ratio + 1,
            left: `calc(50% + ${tile.x}px)`,
            top: `calc(50% + ${tile.y}px)`,
          }}
        >
          {/* Google Satellite Base Layer */}
          <img
            src={`https://mt1.google.com/vt/lyrs=s&x=${tile.tx}&y=${tile.ty}&z=${tile.z}`}
            className="absolute inset-0 w-full h-full object-cover"
            alt=""
            loading="lazy"
          />
          {/* CartoDB Road Overlay (No Labels) */}
          <img
            src={`https://basemaps.cartocdn.com/rastertiles/light_nolabels/${tile.z}/${tile.tx}/${tile.ty}.png`}
            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40 grayscale invert"
            alt=""
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
};

export default MapTiles;
