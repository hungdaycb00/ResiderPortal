import { useState, useEffect, useRef } from 'react';
import { DeviceType, Orientation } from '../types';
import { DEVICE_DIMENSIONS } from '../constants';

export function usePreviewScale(
  deviceType: DeviceType,
  orientation: Orientation,
  hasPreview: boolean
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;

      const dims = DEVICE_DIMENSIONS[deviceType][orientation];
      const targetW = dims.w;
      const targetH = dims.h;

      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth === 0 || clientHeight === 0) return;

      const paddingX = deviceType === 'pc' ? 0 : 48;
      const paddingY = deviceType === 'pc' ? 0 : 48;

      const scaleX = (clientWidth - paddingX) / targetW;
      const scaleY = (clientHeight - paddingY) / targetH;

      let newScale = Math.min(scaleX, scaleY);
      if (newScale > 1) newScale = 1;

      setScale(newScale);
    };

    const resizeObserver = new ResizeObserver(() => updateScale());
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    updateScale();
    window.addEventListener('resize', updateScale);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [deviceType, orientation, hasPreview]);

  return { containerRef, scale };
}
