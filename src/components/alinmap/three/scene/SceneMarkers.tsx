import React from 'react';
import { Html } from '@react-three/drei';
import MarkerBillboard from '../MarkerBillboard';

interface SceneMarkersProps {
  isRoadmapOverlay: boolean;
  currentProvince: string | null;
  selfSceneX: number;
  selfSceneZ: number;
  pxToScaledScene: (px: number) => number;
  searchMarkerPos: { lat: number; lng: number } | null;
  searchMarkerScene: { x: number; z: number } | null;
  mapMode: string;
}

export default function SceneMarkers({
  isRoadmapOverlay,
  currentProvince,
  selfSceneX,
  selfSceneZ,
  pxToScaledScene,
  searchMarkerPos,
  searchMarkerScene,
  mapMode,
}: SceneMarkersProps) {
  if (isRoadmapOverlay) return null;

  return (
    <>
      {/* Province marker */}
      {currentProvince ? (
        <MarkerBillboard
          position={[selfSceneX + pxToScaledScene(180), 0.5, selfSceneZ - pxToScaledScene(180)]}
          icon="Province"
          label={currentProvince}
          accent="#0ea5e9"
        />
      ) : null}

      {/* Search marker */}
      {searchMarkerPos ? (
        <MarkerBillboard
          position={[searchMarkerScene!.x, 0.4, searchMarkerScene!.z]}
          icon="Pin"
          label="Search"
          accent="#fb7185"
        />
      ) : null}

      {/* Mode label */}
      <Html position={[0, 10, 0]} center transform sprite distanceFactor={18} occlude={false}>
        <div className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-[9px] font-black uppercase tracking-[0.26em] text-cyan-200 shadow-lg backdrop-blur-md">
          {mapMode}
        </div>
      </Html>
    </>
  );
}
