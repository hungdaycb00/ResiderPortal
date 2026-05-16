import React from 'react';
import MarkerBillboard from '../MarkerBillboard';

interface SceneMarkersProps {
  isRoadmapOverlay: boolean;
  searchMarkerPos: { lat: number; lng: number } | null;
  searchMarkerScene: { x: number; z: number } | null;
}

export default function SceneMarkers({
  isRoadmapOverlay,
  searchMarkerPos,
  searchMarkerScene,
}: SceneMarkersProps) {
  if (!isRoadmapOverlay) return null;

  return searchMarkerPos && searchMarkerScene ? (
    <MarkerBillboard
      position={[searchMarkerScene.x, 0.01, searchMarkerScene.z]}
      icon="Pin"
      label="Search"
      accent="#fb7185"
    />
  ) : null;
}
