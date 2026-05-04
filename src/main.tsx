import {lazy, StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.tsx';
import './index.css';

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
