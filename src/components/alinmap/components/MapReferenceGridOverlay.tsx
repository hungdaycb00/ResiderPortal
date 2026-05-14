import React from 'react';
import { useMotionValueEvent, type MotionValue } from 'framer-motion';
import { clamp, type AlinMapMode } from '../constants';

interface MapReferenceGridOverlayProps {
  scale: MotionValue<number>;
  mapMode: AlinMapMode;
  enabled?: boolean;
}

const MINOR_GRID_BASE = 48;
const MINOR_GRID_MIN = 36;
const MINOR_GRID_MAX = 96;
const MAJOR_GRID_MULTIPLIER = 4;

export default function MapReferenceGridOverlay({
  scale,
  mapMode,
  enabled = true,
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

  return (
    <div className="pointer-events-none absolute inset-0 z-[25] overflow-hidden">
      <div className="alin-map-reference-grid absolute inset-0" style={gridStyle} />

      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-px w-[min(78vw,920px)] -translate-x-1/2 bg-cyan-200/20" />
        <div className="absolute left-1/2 top-1/2 h-[min(78vh,920px)] w-px -translate-x-1/2 -translate-y-1/2 bg-cyan-200/20" />

        <div className="absolute left-4 top-4 rounded-2xl border border-cyan-200/20 bg-slate-950/55 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-50 shadow-[0_10px_28px_rgba(2,8,23,0.24)] backdrop-blur-md">
          <div>GRID REF</div>
          <div className="mt-1 text-[9px] font-semibold tracking-[0.18em] text-cyan-100/80">
            step {gridStep}px / {majorStep}px
          </div>
          <div className="mt-1 text-[9px] font-semibold tracking-[0.16em] text-cyan-100/65">
            scale {Math.round(currentScale * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
}
