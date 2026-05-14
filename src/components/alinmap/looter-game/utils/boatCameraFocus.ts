import { getVisualScaleFromCameraZ, getTiltAngleFromCameraZ } from '../../constants';

export type BoatCameraOffsets = {
  xOffset: number;
  yOffset: number;
};

export type BoatCameraFocusMetrics = {
  cameraZ?: number;
  perspectivePx?: number;
  tiltDeg?: number;
};

export function getVisibleBoatCameraOffsets(metrics: BoatCameraFocusMetrics = {}): BoatCameraOffsets {
  const backpack = document.getElementById('looter-backpack-container');
  const rect = backpack?.getBoundingClientRect();
  if (!rect) return { xOffset: 0, yOffset: 0 };

  const zoom = typeof metrics.cameraZ === 'number' && typeof metrics.perspectivePx === 'number'
    ? getVisualScaleFromCameraZ(metrics.cameraZ, metrics.perspectivePx)
    : 1;
  const tiltDeg = typeof metrics.tiltDeg === 'number'
    ? metrics.tiltDeg
    : (typeof metrics.cameraZ === 'number' ? getTiltAngleFromCameraZ(metrics.cameraZ) : 65);
  const zoomBias = Math.max(0, Math.round((zoom - 1) * 18));
  const tiltBias = Math.max(0, Math.round((tiltDeg - 45) * 2.2));

  const isDesktopSidePanel =
    window.innerWidth >= 768 &&
    rect.left < window.innerWidth * 0.35 &&
    rect.width < window.innerWidth * 0.8 &&
    rect.height > window.innerHeight * 0.55;

  if (isDesktopSidePanel) {
    const visibleLeft = Math.min(Math.max(rect.right, 0), window.innerWidth);
    const visibleCenterX = (visibleLeft + window.innerWidth) / 2;
    return {
      xOffset: visibleCenterX - window.innerWidth / 2,
      yOffset: zoomBias + tiltBias,
    };
  }

  const visibleMapHeight = Math.max(120, Math.min(rect.top, window.innerHeight));
  const visibleCenterY = visibleMapHeight / 2;
  return {
    xOffset: 0,
    yOffset: Math.round(window.innerHeight / 2 - visibleCenterY) + zoomBias + tiltBias,
  };
}
