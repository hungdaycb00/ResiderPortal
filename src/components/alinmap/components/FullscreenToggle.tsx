import React from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { useMobileImmersiveMode } from '../hooks/useMobileImmersiveMode';

interface FullscreenToggleProps {
  isDesktop?: boolean;
  blocked?: boolean;
}

const FullscreenToggle: React.FC<FullscreenToggleProps> = ({ isDesktop, blocked = false }) => {
  const {
    isImmersive,
    isDragging,
    dragOffsetY,
    dragDirection,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useMobileImmersiveMode({
    enabled: !isDesktop,
    blocked,
  });

  if (isDesktop || blocked) return null;

  const activeClass = dragDirection === 'up'
    ? 'border-emerald-300 bg-emerald-500 shadow-emerald-500/50'
    : dragDirection === 'down'
      ? 'border-rose-300 bg-rose-500 shadow-rose-500/50'
      : isImmersive
        ? 'border-cyan-200 bg-cyan-500 shadow-cyan-500/40'
        : 'border-sky-300 bg-sky-600 shadow-black/45';

  return (
    <>
      <div
        id="fullscreen-drag-ball"
        className={`fixed left-[15px] top-20 z-[500] flex h-12 w-12 items-center justify-center rounded-full border-2 text-white shadow-lg transition-all duration-300 ${activeClass}`}
        style={{
          opacity: isDragging ? 1 : 0.68,
          pointerEvents: 'none',
          transform: isDragging ? `scale(1.15) translateY(${dragOffsetY}px)` : 'scale(1)',
          transition: isDragging ? 'none' : undefined,
        }}
        aria-hidden="true"
      >
        <ChevronsUpDown className="h-5 w-5 drop-shadow" strokeWidth={3} />
      </div>

      <div
        id="fullscreen-touch-zone"
        className="fixed left-[5px] top-[70px] z-[501] h-[120px] w-[70px] touch-none"
        role="button"
        aria-label="Vuot len de an thanh trinh duyet, vuot xuong de hien lai"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      />
    </>
  );
};

export default FullscreenToggle;
