import {lazy, StrictMode, Suspense} from 'react';

// Build version identifier — changing this forces new asset hashes
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { checkAppVersion } from './utils/cacheBuster';

// Build version identifier — changing this forces storage cleanup
export const BUILD_VERSION = '2026.05.11.1';

// Kiểm tra và dọn dẹp dữ liệu cũ nếu phát hiện phiên bản mới
checkAppVersion(BUILD_VERSION);

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

const DevClickToComponent = import.meta.env.DEV
  ? lazy(() => import('click-to-react-component').then(module => ({default: module.ClickToComponent})))
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
window.__BUILD_VERSION__ = BUILD_VERSION;
