import React, { useCallback, useState } from 'react';
import { MotionValue, useMotionValueEvent } from 'framer-motion';

interface ZoomSliderProps {
  cameraZ: MotionValue<number>;
  setCameraZ: (z: number) => void;
}

const SLIDER_MIN = -100000;
const SLIDER_MAX = 100000;

export const ZoomSlider: React.FC<ZoomSliderProps> = ({ cameraZ, setCameraZ }) => {
  const [value, setValue] = useState(() => cameraZ.get());

  useMotionValueEvent(cameraZ, 'change', (latest) => {
    setValue(latest);
  });

  const percentage = Math.round(((value - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCameraZ(Number(e.target.value));
  }, [setCameraZ]);

  return (
    <div className="flex flex-col items-center gap-1 bg-white/60 md:bg-white rounded-[10px] md:rounded-[14px] shadow-md px-1.5 py-2 w-8 md:w-[42px] backdrop-blur-md md:backdrop-blur-none mt-1">
      <button
        onClick={() => setCameraZ(value + 20)}
        className="w-6 h-6 md:w-7 md:h-7 text-gray-700 md:text-gray-600 md:hover:bg-gray-100 rounded-md flex items-center justify-center transition-colors"
        title="Zoom In"
      >
        <span className="text-base md:text-lg font-black leading-none">+</span>
      </button>

      <div className="relative h-28 md:h-36 flex items-center justify-center">
        <input
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={1}
          value={value}
          onChange={handleChange}
          style={{
            writingMode: 'vertical-lr',
            direction: 'rtl',
            WebkitAppearance: 'slider-vertical',
            width: '24px',
            height: '100%',
            accentColor: '#06b6d4',
          }}
          title={`Zoom: ${percentage}%`}
        />
      </div>

      <button
        onClick={() => setCameraZ(value - 20)}
        className="w-6 h-6 md:w-7 md:h-7 text-gray-700 md:text-gray-600 md:hover:bg-gray-100 rounded-md flex items-center justify-center transition-colors"
        title="Zoom Out"
      >
        <span className="text-base md:text-lg font-black leading-none">-</span>
      </button>

      <span className="text-[9px] md:text-[10px] font-bold text-gray-500 tabular-nums mt-0.5">
        {percentage}%
      </span>
    </div>
  );
};

export default ZoomSlider;
