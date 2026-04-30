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
      const currentScale = scale?.get?.() ?? 1;
      const calculatedZ = Math.min(21, Math.max(2, 14 + Math.floor(Math.log2(currentScale))));
      setZLevel(calculatedZ);

      const ratio = DEGREES_TO_PX / ((TILE_SIZE * Math.pow(2, calculatedZ)) / 360);
      const tileWidthPx = TILE_SIZE * ratio;
      
      const currentPanX = panX?.get?.() ?? 0;
      const currentPanY = panY?.get?.() ?? 0;
      
      setTileOffset({
        x: -Math.floor(currentPanX / tileWidthPx),
        y: -Math.floor(currentPanY / tileWidthPx)
      });
    };

    const unsubscribeX = panX.on('change', checkViewport);
    const unsubscribeY = panY.on('change', checkViewport);
    const unsubscribeScale = scale.on('change', checkViewport);

    checkViewport();

    return () => {
      unsubscribeX();
      unsubscribeY();
      unsubscribeScale();
    };
  }, [panX, panY, scale]);

  if (!myObfPos) return null;

  // Use dynamic zLevel for projection
  const centerTile = project(myObfPos.lat, myObfPos.lng, zLevel);
  const ratio = DEGREES_TO_PX / ((TILE_SIZE * Math.pow(2, zLevel)) / 360);

  const tiles = [];
  // Render a grid of tiles
  for (let i = -6 + tileOffset.x; i <= 6 + tileOffset.x; i++) {
    for (let j = -6 + tileOffset.y; j <= 6 + tileOffset.y; j++) {
      const tx = Math.floor(centerTile.x) + i;
      const ty = Math.floor(centerTile.y) + j;
      
      const offsetX = (tx - centerTile.x) * TILE_SIZE * ratio;
      const offsetY = (ty - centerTile.y) * TILE_SIZE * ratio;

      tiles.push({
        id: `${zLevel}-${tx}-${ty}`,
        x: offsetX,
        y: offsetY,
      });
    }
  }

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {/* Ocean SVG Filter for Ripple Effect */}
      <svg className="hidden">
        <filter id="ocean-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise" seed="1">
            <animate attributeName="baseFrequency" values="0.015;0.02;0.015" dur="15s" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="20" />
        </filter>
      </svg>


      {tiles.map((tile) => (
        <div
          key={tile.id}
          className="absolute overflow-hidden"
          style={{
            width: TILE_SIZE * ratio + 2,
            height: TILE_SIZE * ratio + 2,
            left: `calc(50% + ${tile.x}px)`,
            top: `calc(50% + ${tile.y}px)`,
            background: mode === 'satellite' 
              ? 'radial-gradient(circle at center, #004d7a 0%, #002b4d 70%, #001424 100%)'
              : 'transparent',
            opacity: mode === 'satellite' ? 1 : 0,
            transition: 'opacity 0.5s ease-in-out',
          }}
        >
          {/* Water Surface Detail */}
          {mode === 'satellite' && (
            <>
              <div className="absolute inset-0 opacity-30" style={{ 
                backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")',
                filter: 'url(#ocean-noise)',
                transform: 'scale(2)',
              }} />
              <div className="absolute inset-0 opacity-20 bg-gradient-to-tr from-cyan-500/20 to-transparent animate-pulse" />
              
              {/* Fake Depth Grid */}
              <div className="absolute inset-0 border border-cyan-500/5" />
            </>
          )}
        </div>
      ))}
      
      {/* Overall Ocean Glow */}
      {mode === 'satellite' && (
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-900/10 to-blue-900/20 pointer-events-none" />
      )}
    </div>
  );
};

export default React.memo(MapTiles);
