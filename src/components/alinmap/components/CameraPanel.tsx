import React, { useState, useCallback, useRef } from 'react';
import { MotionValue, useMotionValueEvent } from 'framer-motion';
import {
  CAMERA_FOV_DEGREES,
  CAMERA_HEIGHT_OFFSET_DEFAULT,
  getCameraZForVisualScale,
  getDefaultVisualScaleForMapMode,
  getTiltAngleFromCameraZ,
  getVisualScaleFromCameraZ,
  type AlinMapMode,
} from '../constants';

interface CameraPanelProps {
  cameraZ: MotionValue<number>;
  mapMode: AlinMapMode;
  isLooterGameMode: boolean;
  perspectivePx: number;
  cameraHeightOffset: number;
  cameraPitchOverride: number | null;
  setCameraZ: (z: number) => void;
  setCameraHeightOffset: (v: number) => void;
  setCameraPitchOverride: (v: number | null) => void;
  setCameraFov: (v: number) => void;
  cameraFov: number;
  cameraRotateYDeg: number;
  setCameraRotateYDeg: (v: number) => void;
}

const CameraPanel: React.FC<CameraPanelProps> = ({
  cameraZ,
  mapMode,
  isLooterGameMode,
  perspectivePx,
  cameraHeightOffset,
  cameraPitchOverride,
  setCameraZ,
  setCameraHeightOffset,
  setCameraPitchOverride,
  cameraFov,
  setCameraFov,
  cameraRotateYDeg,
  setCameraRotateYDeg,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [zDisplay, setZDisplay] = useState(() => Math.round(cameraZ.get()));
  const tickRef = useRef(0);
  const safeSetCameraZ = useCallback((value: number) => {
    setCameraZ(value);
  }, [setCameraZ]);
  const safeSetCameraHeightOffset = useCallback((value: number) => {
    setCameraHeightOffset(value);
  }, [setCameraHeightOffset]);
  const safeSetCameraPitchOverride = useCallback((value: number | null) => {
    setCameraPitchOverride(value);
  }, [setCameraPitchOverride]);
  const safeSetCameraFov = useCallback((value: number) => {
    setCameraFov(value);
  }, [setCameraFov]);
  const safeSetCameraRotateYDeg = useCallback((value: number) => {
    setCameraRotateYDeg(value);
  }, [setCameraRotateYDeg]);

  useMotionValueEvent(cameraZ, 'change', (v) => {
    tickRef.current = (tickRef.current + 1) % 3;
    if (tickRef.current === 0) {
      setZDisplay(Math.round(v));
    }
  });

  const toggleExpanded = useCallback(() => setExpanded((p) => !p), []);

  const autoTilt = Math.round(getTiltAngleFromCameraZ(zDisplay));
  const effectivePitch = cameraPitchOverride ?? autoTilt;
  const isAutoPitch = cameraPitchOverride === null;
  const zoomPercent = Math.round(getVisualScaleFromCameraZ(zDisplay, perspectivePx) * 100);

  const resetAll = useCallback(() => {
    const targetVisualScale = getDefaultVisualScaleForMapMode(mapMode, isLooterGameMode);
    safeSetCameraZ(getCameraZForVisualScale(targetVisualScale, perspectivePx));
    safeSetCameraHeightOffset(CAMERA_HEIGHT_OFFSET_DEFAULT);
    safeSetCameraPitchOverride(65);
    safeSetCameraFov(CAMERA_FOV_DEGREES);
  }, [mapMode, isLooterGameMode, perspectivePx, safeSetCameraZ, safeSetCameraHeightOffset, safeSetCameraPitchOverride, safeSetCameraFov]);

  return (
    <div className="flex items-end gap-0">
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
            </div>
            <input
              type="number"
              step={1}
              value={zDisplay}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) safeSetCameraZ(v);
              }}
              className="w-full bg-slate-800/70 border border-slate-600/60 rounded-lg px-2.5 py-1.5 text-[11px] font-mono font-bold text-cyan-300 outline-none focus:border-cyan-400/70 focus:shadow-[0_0_6px_rgba(34,211,238,0.25)] transition-all"
            />
          </div>

          {/* Góc (Pitch) */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Góc</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold text-cyan-300">
                  {effectivePitch}°
                </span>
                <button
                  onClick={() => safeSetCameraPitchOverride(isAutoPitch ? effectivePitch : null)}
                  className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md transition-all ${
                    isAutoPitch
                      ? 'bg-slate-700/70 text-slate-400 hover:text-slate-300'
                      : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  }`}
                >
                  {isAutoPitch ? 'Auto' : 'Manual'}
                </button>
              </div>
            </div>
            <input
              type="number"
              step={1}
              value={effectivePitch}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) safeSetCameraPitchOverride(v);
              }}
              className="w-full bg-slate-800/70 border border-slate-600/60 rounded-lg px-2.5 py-1.5 text-[11px] font-mono font-bold text-cyan-300 outline-none focus:border-cyan-400/70 focus:shadow-[0_0_6px_rgba(34,211,238,0.25)] transition-all"
            />
          </div>

          {/* Độ cao (Height Offset) */}
          <div className="mb-0">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Cao</span>
              <span className="text-[10px] font-mono font-bold text-cyan-300">{cameraHeightOffset}</span>
            </div>
            <input
              type="number"
              step={10}
              value={cameraHeightOffset}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) safeSetCameraHeightOffset(v);
              }}
              className="w-full bg-slate-800/70 border border-slate-600/60 rounded-lg px-2.5 py-1.5 text-[11px] font-mono font-bold text-cyan-300 outline-none focus:border-cyan-400/70 focus:shadow-[0_0_6px_rgba(34,211,238,0.25)] transition-all"
            />
          </div>
          
          {/* Tầm nhìn (Perspective/FOV) */}
          <div className="mb-0 pt-3 border-t border-slate-700/50">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Perspective</span>
              <span className="text-[10px] font-mono font-bold text-cyan-300">{cameraFov}°</span>
            </div>
            <input
              type="range"
              min="1"
              max="180"
              step="1"
              value={cameraFov}
              onChange={(e) => safeSetCameraFov(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer mb-2"
            />
            <input
              type="number"
              step={1}
              value={cameraFov}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) safeSetCameraFov(v);
              }}
              className="w-full bg-slate-800/70 border border-slate-600/60 rounded-lg px-2.5 py-1.5 text-[11px] font-mono font-bold text-cyan-300 outline-none focus:border-cyan-400/70 focus:shadow-[0_0_6px_rgba(34,211,238,0.25)] transition-all"
            />
          </div>

          {/* Hướng xoay (Yaw) */}
          <div className="mb-0 pt-3 border-t border-slate-700/50">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Rotation (Yaw)</span>
              <span className="text-[10px] font-mono font-bold text-cyan-300">{cameraRotateYDeg}°</span>
            </div>
            <input
              type="range"
              min="-720"
              max="720"
              step="1"
              value={cameraRotateYDeg}
              onChange={(e) => safeSetCameraRotateYDeg(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer mb-2"
            />
            <input
              type="number"
              step={1}
              value={cameraRotateYDeg}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) safeSetCameraRotateYDeg(v);
              }}
              className="w-full bg-slate-800/70 border border-slate-600/60 rounded-lg px-2.5 py-1.5 text-[11px] font-mono font-bold text-cyan-300 outline-none focus:border-cyan-400/70 focus:shadow-[0_0_6px_rgba(34,211,238,0.25)] transition-all"
            />
          </div>
        </div>
      )}

      {/* Nút toggle */}
      <div className="flex flex-col gap-2 md:gap-3">
        <div className="rounded-full border border-cyan-400/30 bg-[#06111f]/85 px-2.5 py-1 text-center shadow-[0_0_14px_rgba(8,145,178,0.18)] backdrop-blur-md">
          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-200/90">
            Zoom
          </div>
          <div className="mt-0.5 text-[10px] font-mono font-bold text-cyan-100">
            Z {zDisplay} / {zoomPercent}%
          </div>
        </div>
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
