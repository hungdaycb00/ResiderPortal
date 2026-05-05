import {lazy, StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && event.reason.message.includes('Failed to fetch dynamically imported module')) {
      event.preventDefault();
      console.warn('[Auto-Recovery] Lazy load thất bại (phiên bản cũ), đang ép tải lại...');
      window.location.reload();
    }
  });
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
// Cache buster: 2026-05-05
