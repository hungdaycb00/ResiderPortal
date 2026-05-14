import React from 'react';
import { useMotionValueEvent, type MotionValue } from 'framer-motion';
import { clamp, type AlinMapMode } from '../constants';

interface MapReferenceGridOverlayProps {
  scale: MotionValue<number>;
  mapMode: AlinMapMode;
  enabled?: boolean;
  is3DPlane?: boolean;
}

const MINOR_GRID_BASE = 48;
const MINOR_GRID_MIN = 36;
const MINOR_GRID_MAX = 96;
const MAJOR_GRID_MULTIPLIER = 4;

export default function MapReferenceGridOverlay({
  scale,
  mapMode,
  enabled = true,
  is3DPlane = false,
}: MapReferenceGridOverlayProps) {
  const [gridStep, setGridStep] = React.useState(() => MINOR_GRID_BASE);
  const [currentScale, setCurrentScale] = React.useState(() => scale.get());

  useMotionValueEvent(scale, 'change', (latest) => {
    setCurrentScale(latest);
    const nextStep = clamp(Math.round(48 * Math.sqrt(Math.max(latest, 0.1))), MINOR_GRID_MIN, MINOR_GRID_MAX);
    setGridStep(nextStep);
  });

  React.useEffect(() => {
    const latest = scale.get();
    setCurrentScale(latest);
    setGridStep(clamp(Math.round(48 * Math.sqrt(Math.max(latest, 0.1))), MINOR_GRID_MIN, MINOR_GRID_MAX));
  }, [scale]);

  if (!enabled || mapMode !== 'roadmap') return null;

  const majorStep = gridStep * MAJOR_GRID_MULTIPLIER;
  const gridStyle = {
    '--alin-map-grid-minor-step': `${gridStep}px`,
    '--alin-map-grid-major-step': `${majorStep}px`,
  } as React.CSSProperties;

  if (is3DPlane) {
    return <div className="alin-map-reference-grid absolute inset-0 pointer-events-none" style={gridStyle} />;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[120] overflow-hidden">
      <div className="alin-map-reference-grid absolute inset-0 opacity-40 mix-blend-screen" style={gridStyle} />
    </div>
  );
}
