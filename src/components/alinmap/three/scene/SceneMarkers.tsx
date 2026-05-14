import React from 'react';
import MarkerBillboard from '../MarkerBillboard';

interface SceneMarkersProps {
  isRoadmapOverlay: boolean;
  currentProvince: string | null;
  selfSceneX: number;
  selfSceneZ: number;
  pxToScaledScene: (px: number) => number;
  searchMarkerPos: { lat: number; lng: number } | null;
  searchMarkerScene: { x: number; z: number } | null;
}

export default function SceneMarkers({
  isRoadmapOverlay,
  currentProvince,
  selfSceneX,
  selfSceneZ,
  pxToScaledScene,
  searchMarkerPos,
  searchMarkerScene,
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
    </>
  );
}
