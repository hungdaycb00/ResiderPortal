import React from 'react';
import { MotionValue } from 'framer-motion';

interface MapTilesProps {
  panX: MotionValue<number>;
  panY: MotionValue<number>;
  scale: MotionValue<number>;
  planeYScale: MotionValue<number>;
  myObfPos: { lat: number; lng: number } | null;
  mode: 'grid' | 'satellite';
}

const MapTiles: React.FC<MapTilesProps> = () => {
  return null;
};

export default React.memo(MapTiles);
