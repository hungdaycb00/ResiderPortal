import React, { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { checkAppVersion } from './utils/cacheBuster';

declare const __APP_BUILD_VERSION__: string;

// Build version identifier - injected at build time
export const BUILD_VERSION = __APP_BUILD_VERSION__ || 'dev';

if (import.meta.env.PROD && typeof window !== 'undefined') {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
}

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && event.reason.message.includes('Failed to fetch dynamically imported module')) {
      event.preventDefault();
      console.warn('[Auto-Recovery] Lazy load thất bại (phiên bản cũ), đang ép tải lại...');
      window.location.reload();
    }
  });

  // Tạm ẩn cảnh báo THREE.Clock deprecation từ @react-three/fiber
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('THREE.Clock')) return;
    originalWarn(...args);
  };
}

if (typeof window !== 'undefined' && 'ontouchstart' in window) {
  let lastTouchEnd = 0;
  document.addEventListener(
    'touchend',
    (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false },
  );
}

async function bootstrap() {
  // Kiểm tra và dọn cache cũ nếu phát hiện phiên bản mới
  const shouldReload = await checkAppVersion(BUILD_VERSION);
  if (shouldReload) {
    return;
  }

  window.__BUILD_VERSION__ = BUILD_VERSION;

  const DevClickToComponent = import.meta.env.DEV
    ? lazy(() => import('click-to-react-component').then((module) => ({ default: module.ClickToComponent })))
    : null;

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        {DevClickToComponent && (
          <Suspense fallback={null}>
            <DevClickToComponent />
          </Suspense>
        )}
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}

void bootstrap();
