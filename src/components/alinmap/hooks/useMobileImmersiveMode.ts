import React from 'react';

interface UseMobileImmersiveModeOptions {
  enabled: boolean;
  blocked?: boolean;
}

interface UseMobileImmersiveModeResult {
  isImmersive: boolean;
  isDragging: boolean;
  dragOffsetY: number;
  dragDirection: 'up' | 'down' | null;
  handleTouchStart: (event: React.TouchEvent<HTMLElement>) => void;
  handleTouchMove: (event: React.TouchEvent<HTMLElement>) => void;
  handleTouchEnd: () => void;
}

const BODY_CLASS = 'alinmap-immersive-shell';
const HTML_CLASS = 'alinmap-immersive-root';
const SWIPE_THRESHOLD_PX = 40;
const MIN_SCROLL_OFFSET_PX = 320;
const COOL_DOWN_MS = 850;

const getImmersiveScrollOffset = () => {
  if (typeof window === 'undefined') return MIN_SCROLL_OFFSET_PX;

  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  return Math.max(MIN_SCROLL_OFFSET_PX, Math.round(viewportHeight * 0.75));
};

const isElementScrollable = (element: HTMLElement) => {
  return element.scrollHeight > element.clientHeight + 1;
};

const shouldAllowScrollBoundary = (element: HTMLElement, deltaY: number) => {
  if (!isElementScrollable(element)) return false;

  const isAtTop = element.scrollTop <= 0;
  const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 1;

  if (isAtTop && deltaY > 0) return false;
  if (isAtBottom && deltaY < 0) return false;
  return true;
};

export function useMobileImmersiveMode({
  enabled,
  blocked = false,
}: UseMobileImmersiveModeOptions): UseMobileImmersiveModeResult {
  const [isImmersive, setIsImmersive] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOffsetY, setDragOffsetY] = React.useState(0);
  const [dragDirection, setDragDirection] = React.useState<'up' | 'down' | null>(null);

  const dragStartYRef = React.useRef(0);
  const globalTouchStartYRef = React.useRef(0);
  const coolDownUntilRef = React.useRef(0);

  React.useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    const updateViewportHeight = () => {
      const visualHeight = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty('--alinmap-vvh', `${visualHeight}px`);
    };

    document.body.classList.add(BODY_CLASS);
    document.documentElement.classList.add(HTML_CLASS);
    updateViewportHeight();

    window.visualViewport?.addEventListener('resize', updateViewportHeight);
    window.addEventListener('resize', updateViewportHeight);

    return () => {
      document.body.classList.remove(BODY_CLASS);
      document.documentElement.classList.remove(HTML_CLASS);
      document.documentElement.style.removeProperty('--alinmap-vvh');
      window.visualViewport?.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('resize', updateViewportHeight);
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
  }, [enabled]);

  React.useEffect(() => {
    if (!enabled || blocked || typeof document === 'undefined') return;

    const handleGlobalTouchStart = (event: TouchEvent) => {
      globalTouchStartYRef.current = event.touches[0]?.clientY ?? 0;
    };

    const handleGlobalTouchMove = (event: TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.closest('#fullscreen-touch-zone')) return;
      if (target.closest('[data-immersive-ignore]')) return;

      const scrollRegion = target.closest('[data-immersive-scroll]') as HTMLElement | null;
      if (scrollRegion) {
        const touchY = event.touches[0]?.clientY ?? globalTouchStartYRef.current;
        const deltaY = touchY - globalTouchStartYRef.current;
        if (shouldAllowScrollBoundary(scrollRegion, deltaY)) return;
      }

      event.preventDefault();
    };

    document.addEventListener('touchstart', handleGlobalTouchStart, { passive: true });
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleGlobalTouchStart);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
    };
  }, [blocked, enabled]);

  React.useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleScroll = () => {
      setIsImmersive(window.scrollY > 24);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [enabled]);

  const stopDragging = React.useCallback(() => {
    setIsDragging(false);
    setDragOffsetY(0);
    setDragDirection(null);
  }, []);

  const handleTouchStart = React.useCallback((event: React.TouchEvent<HTMLElement>) => {
    if (!enabled || blocked) return;
    dragStartYRef.current = event.touches[0]?.clientY ?? 0;
    setIsDragging(true);
    setDragOffsetY(0);
    setDragDirection(null);
  }, [blocked, enabled]);

  const handleTouchMove = React.useCallback((event: React.TouchEvent<HTMLElement>) => {
    if (!isDragging || blocked) return;

    const currentY = event.touches[0]?.clientY ?? dragStartYRef.current;
    const deltaY = currentY - dragStartYRef.current;
    setDragOffsetY(deltaY);

    if (deltaY <= -8) {
      setDragDirection('up');
    } else if (deltaY >= 8) {
      setDragDirection('down');
    } else {
      setDragDirection(null);
    }
  }, [blocked, isDragging]);

  const handleTouchEnd = React.useCallback(() => {
    if (!isDragging || blocked) {
      stopDragging();
      return;
    }

    const now = Date.now();
    if (now >= coolDownUntilRef.current && dragOffsetY <= -SWIPE_THRESHOLD_PX) {
      coolDownUntilRef.current = now + COOL_DOWN_MS;
      window.scrollTo({ top: getImmersiveScrollOffset(), behavior: 'smooth' });
      setIsImmersive(true);
    } else if (now >= coolDownUntilRef.current && dragOffsetY >= SWIPE_THRESHOLD_PX) {
      coolDownUntilRef.current = now + COOL_DOWN_MS;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setIsImmersive(false);
    }

    stopDragging();
  }, [blocked, dragOffsetY, isDragging, stopDragging]);

  return {
    isImmersive,
    isDragging,
    dragOffsetY,
    dragDirection,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
