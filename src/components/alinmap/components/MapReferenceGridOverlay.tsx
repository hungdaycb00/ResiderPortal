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
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-px w-[min(82vw,1080px)] -translate-x-1/2 bg-slate-900/35 shadow-[0_0_0_1px_rgba(255,255,255,0.28)]" />
        <div className="absolute left-1/2 top-1/2 h-[min(82vh,1080px)] w-px -translate-x-1/2 -translate-y-1/2 bg-slate-900/35 shadow-[0_0_0_1px_rgba(255,255,255,0.28)]" />

        <div className="absolute left-4 top-4 rounded-2xl border border-sky-200/30 bg-slate-950/70 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-50 shadow-[0_12px_34px_rgba(2,8,23,0.34)] backdrop-blur-md">
          <div>GRID REF</div>
          <div className="mt-1 text-[9px] font-semibold tracking-[0.18em] text-cyan-100/88">
            step {gridStep}px / {majorStep}px
          </div>
          <div className="mt-1 text-[9px] font-semibold tracking-[0.16em] text-cyan-100/75">
            scale {Math.round(currentScale * 100)}%
          </div>
        </div>

        <div className="absolute right-4 bottom-4 rounded-full border border-slate-900/20 bg-white/85 px-3 py-1 text-[9px] font-black uppercase tracking-[0.24em] text-slate-800 shadow-[0_10px_24px_rgba(15,23,42,0.18)]">
          reference overlay on
        </div>
      </div>
    </div>
  );
}
