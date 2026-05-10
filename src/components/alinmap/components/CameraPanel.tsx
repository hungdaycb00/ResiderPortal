import React, { useState, useCallback, useRef } from 'react';
import { MotionValue, useMotionValueEvent } from 'framer-motion';
import {
  CAMERA_Z_WATER_DEFAULT, CAMERA_Z_NEAR,
  CAMERA_HEIGHT_DEFAULT_PCT, CAMERA_HEIGHT_MIN_PCT, CAMERA_HEIGHT_MAX_PCT,
  CAMERA_ROTATE_X_DEFAULT_DEG, CAMERA_ROTATE_X_MIN_DEG, CAMERA_ROTATE_X_MAX_DEG,
} from '../constants';

interface CameraPanelProps {
  cameraZ: MotionValue<number>;
  cameraHeightPct: number;
  cameraRotateXDeg: number;
  setCameraZ: (z: number) => void;
  setCameraHeightPct: (v: number) => void;
  setCameraRotateXDeg: (v: number) => void;
}

const CameraPanel: React.FC<CameraPanelProps> = ({
  cameraZ,
  cameraHeightPct,
  cameraRotateXDeg,
  setCameraZ,
  setCameraHeightPct,
  setCameraRotateXDeg,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [zDisplay, setZDisplay] = useState(() => Math.round(cameraZ.get()));
  const tickRef = useRef(0);

  // Throttle state update: chỉ cập nhật mỗi 3 frame (~20fps) khi spring animation chạy
  useMotionValueEvent(cameraZ, 'change', (v) => {
    tickRef.current = (tickRef.current + 1) % 3;
    if (tickRef.current === 0) {
      setZDisplay(Math.round(v));
    }
  });

  const toggleExpanded = useCallback(() => setExpanded((p) => !p), []);

  const resetAll = useCallback(() => {
    setCameraZ(CAMERA_Z_WATER_DEFAULT);
    setCameraHeightPct(CAMERA_HEIGHT_DEFAULT_PCT);
    setCameraRotateXDeg(CAMERA_ROTATE_X_DEFAULT_DEG);
  }, [setCameraZ, setCameraHeightPct, setCameraRotateXDeg]);

  return (
    <div className="flex items-end gap-0">
      {/* Panel mở rộng về bên trái */}
      {expanded && (
        <div className="bg-[#0a1526]/92 backdrop-blur-xl border border-cyan-500/50 rounded-2xl p-3 md:p-4 min-w-[170px] md:min-w-[190px] shadow-[0_0_24px_rgba(8,145,178,0.3)] mr-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300/80">
              Camera
            </span>
            <button
              onClick={resetAll}
              className="text-[9px] font-bold uppercase tracking-wider text-cyan-400/60 hover:text-cyan-300 active:scale-95 transition-all"
            >
              Reset
            </button>
          </div>

          {/* Zoom */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Zoom</span>
              <span className="text-[10px] font-mono font-bold text-cyan-300">{zDisplay}</span>
            </div>
            <input
              type="range"
              min={5}
              max={CAMERA_Z_NEAR}
              value={zDisplay}
              onChange={(e) => setCameraZ(Number(e.target.value))}
              className="w-full h-1.5 appearance-none rounded-full bg-slate-700/80 outline-none
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(34,211,238,0.5)]"
            />
          </div>

          {/* Góc camera (Rotate X) */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Góc</span>
              <span className="text-[10px] font-mono font-bold text-cyan-300">{cameraRotateXDeg}°</span>
            </div>
            <input
              type="range"
              min={CAMERA_ROTATE_X_MIN_DEG}
              max={CAMERA_ROTATE_X_MAX_DEG}
              value={cameraRotateXDeg}
              onChange={(e) => setCameraRotateXDeg(Number(e.target.value))}
              className="w-full h-1.5 appearance-none rounded-full bg-slate-700/80 outline-none
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(34,211,238,0.5)]"
            />
          </div>

          {/* Độ cao */}
          <div className="mb-0">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Cao</span>
              <span className="text-[10px] font-mono font-bold text-cyan-300">{cameraHeightPct}%</span>
            </div>
            <input
              type="range"
              min={CAMERA_HEIGHT_MIN_PCT}
              max={CAMERA_HEIGHT_MAX_PCT}
              value={cameraHeightPct}
              onChange={(e) => setCameraHeightPct(Number(e.target.value))}
              className="w-full h-1.5 appearance-none rounded-full bg-slate-700/80 outline-none
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(34,211,238,0.5)]"
            />
          </div>
        </div>
      )}

      {/* Nút toggle + các nút khác nằm trong cột */}
      <div className="flex flex-col gap-2 md:gap-3">
        {/* Nút Camera toggle */}
        <button
          onClick={toggleExpanded}
          className={`w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-xl flex items-center justify-center active:scale-95 transition-all backdrop-blur-md shadow-md
            ${expanded
              ? 'bg-cyan-500/25 border border-cyan-400/60 shadow-[0_0_16px_rgba(34,211,238,0.4)]'
              : 'bg-white/60 md:bg-white text-gray-700 hover:text-cyan-600'
            }`}
          title={expanded ? 'Thu nhỏ Camera' : 'Tùy chỉnh Camera'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default React.memo(CameraPanel);
