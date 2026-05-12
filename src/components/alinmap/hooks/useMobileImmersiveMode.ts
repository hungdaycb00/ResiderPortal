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
const TAP_MOVE_TOLERANCE_PX = 10;
const MIN_SCROLL_OFFSET_PX = 320;
const COOL_DOWN_MS = 850;
const DEBUG_IMMERSIVE = import.meta.env.DEV && typeof window !== 'undefined' && window.localStorage.getItem('alinmap.debugImmersive') === '1';

const logImmersive = (...args: unknown[]) => {
  if (!DEBUG_IMMERSIVE) return;
  console.info('[AlinMapImmersive]', ...args);
};

const getImmersiveScrollOffset = () => {
  if (typeof window === 'undefined') return MIN_SCROLL_OFFSET_PX;

  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  return Math.max(MIN_SCROLL_OFFSET_PX, Math.round(viewportHeight * 0.75));
};

const getFullscreenElement = () => {
  if (typeof document === 'undefined') return null;
  return document.fullscreenElement as Element | null;
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
    logImmersive('mount', {
      enabled,
      bodyClass: document.body.classList.contains(BODY_CLASS),
      rootClass: document.documentElement.classList.contains(HTML_CLASS),
      viewportHeight: window.visualViewport?.height || window.innerHeight,
      fullscreenEnabled: document.fullscreenEnabled,
      fullscreenElement: !!document.fullscreenElement,
    });

    window.visualViewport?.addEventListener('resize', updateViewportHeight);
    window.addEventListener('resize', updateViewportHeight);
    const handleFullscreenChange = () => {
      logImmersive('fullscreenchange', {
        fullscreenElement: !!document.fullscreenElement,
        fullscreenEnabled: document.fullscreenEnabled,
      });
      setIsImmersive(!!document.fullscreenElement || window.scrollY > 24);
    };
    const handleFullscreenError = () => {
      logImmersive('fullscreenerror', {
        fullscreenEnabled: document.fullscreenEnabled,
        fullscreenElement: !!document.fullscreenElement,
      });
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('fullscreenerror', handleFullscreenError);

    return () => {
      document.body.classList.remove(BODY_CLASS);
      document.documentElement.classList.remove(HTML_CLASS);
      document.documentElement.style.removeProperty('--alinmap-vvh');
      window.visualViewport?.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('resize', updateViewportHeight);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('fullscreenerror', handleFullscreenError);
      window.scrollTo({ top: 0, behavior: 'auto' });
      logImmersive('unmount');
    };
  }, [enabled]);

  React.useEffect(() => {
    if (!enabled || blocked || typeof document === 'undefined') return;

    const handleGlobalTouchStart = (event: TouchEvent) => {
      globalTouchStartYRef.current = event.touches[0]?.clientY ?? 0;
      if (DEBUG_IMMERSIVE) {
        const target = event.target;
        if (target instanceof Element) {
          logImmersive('global-touchstart', {
            target: target.tagName,
            id: target.id || null,
            immersiveScroll: !!target.closest('[data-immersive-scroll]'),
            ignore: !!target.closest('[data-immersive-ignore]'),
          });
        }
      }
    };

    const handleGlobalTouchMove = (event: TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.closest('#fullscreen-touch-zone')) return;
      if (target.closest('[data-immersive-ignore]')) return;

      const touchY = event.touches[0]?.clientY ?? globalTouchStartYRef.current;
      const deltaY = touchY - globalTouchStartYRef.current;
      const isTapMovement = Math.abs(deltaY) <= TAP_MOVE_TOLERANCE_PX;
      const interactiveTarget = target.closest(
        'button,a,input,textarea,select,label,[role="button"],[data-immersive-interactive]'
      );
      if (interactiveTarget && isTapMovement) {
        logImmersive('allow-interactive-tap', {
          target: target.tagName,
          id: target.id || null,
          deltaY,
        });
        return;
      }

      const scrollRegion = target.closest('[data-immersive-scroll]') as HTMLElement | null;
      if (scrollRegion) {
        if (shouldAllowScrollBoundary(scrollRegion, deltaY)) {
          if (DEBUG_IMMERSIVE) {
            logImmersive('allow-scroll', {
              region: scrollRegion.id || scrollRegion.className || scrollRegion.tagName,
              deltaY,
              scrollTop: scrollRegion.scrollTop,
              clientHeight: scrollRegion.clientHeight,
              scrollHeight: scrollRegion.scrollHeight,
            });
          }
          return;
        }
      }

      logImmersive('prevent-touchmove', {
        target: target.tagName,
        id: target.id || null,
        immersiveScroll: !!target.closest('[data-immersive-scroll]'),
        touchY: event.touches[0]?.clientY ?? null,
        startY: globalTouchStartYRef.current,
      });
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
      const nextImmersive = window.scrollY > 24;
      setIsImmersive((prev) => {
        if (prev !== nextImmersive) {
          logImmersive('scroll-state', {
            scrollY: window.scrollY,
            immersive: nextImmersive,
          });
        }
        return nextImmersive;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [enabled]);

  const requestNativeFullscreen = React.useCallback(async () => {
    if (typeof document === 'undefined') return false;
    if (!document.fullscreenEnabled) {
      logImmersive('fullscreen-not-enabled');
      return false;
    }
    if (getFullscreenElement()) {
      logImmersive('fullscreen-already-active');
      return true;
    }

    try {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      logImmersive('fullscreen-requested');
      return true;
    } catch (error) {
      logImmersive('fullscreen-request-failed', error);
      return false;
    }
  }, []);

  const exitNativeFullscreen = React.useCallback(async () => {
    if (typeof document === 'undefined') return false;
    if (!getFullscreenElement()) return false;

    try {
      await document.exitFullscreen();
      logImmersive('fullscreen-exit-requested');
      return true;
    } catch (error) {
      logImmersive('fullscreen-exit-failed', error);
      return false;
    }
  }, []);

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
    logImmersive('handle-touchstart', {
      startY: dragStartYRef.current,
      blocked,
    });
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

    logImmersive('handle-touchmove', {
      currentY,
      deltaY,
      direction: deltaY <= -8 ? 'up' : deltaY >= 8 ? 'down' : 'none',
    });
  }, [blocked, isDragging]);

  const handleTouchEnd = React.useCallback(() => {
    if (!isDragging || blocked) {
      logImmersive('handle-touchend-skip', { isDragging, blocked });
      stopDragging();
      return;
    }

    const now = Date.now();
    if (now >= coolDownUntilRef.current && dragOffsetY <= -SWIPE_THRESHOLD_PX) {
      coolDownUntilRef.current = now + COOL_DOWN_MS;
      void requestNativeFullscreen().then((didFullscreen) => {
        if (!didFullscreen) {
          window.scrollTo({ top: getImmersiveScrollOffset(), behavior: 'smooth' });
          setIsImmersive(true);
          logImmersive('swipe-up-fallback-scroll', {
            dragOffsetY,
            targetScroll: getImmersiveScrollOffset(),
          });
          return;
        }
        setIsImmersive(true);
      });
      logImmersive('swipe-up', {
        dragOffsetY,
        targetScroll: getImmersiveScrollOffset(),
      });
    } else if (now >= coolDownUntilRef.current && dragOffsetY >= SWIPE_THRESHOLD_PX) {
      coolDownUntilRef.current = now + COOL_DOWN_MS;
      void exitNativeFullscreen().then((didExit) => {
        if (!didExit) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        setIsImmersive(false);
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setIsImmersive(false);
      logImmersive('swipe-down', {
        dragOffsetY,
        targetScroll: 0,
      });
    } else {
      logImmersive('touchend-noop', {
        dragOffsetY,
        coolDownUntil: coolDownUntilRef.current,
        now,
      });
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
