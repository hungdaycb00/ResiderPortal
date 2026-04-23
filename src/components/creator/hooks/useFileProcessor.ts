import React, { useRef } from 'react';
import JSZip from 'jszip';

/** Normalize path separators for cross-platform compatibility (Windows uses \, Unix uses /) */
const normalizePath = (path: string) => path.replace(/\\/g, '/');

/**
 * Process index.html for Vite builds:
 * - Convert absolute assets to relative
 * - Inject Alin.city runtime fixes (localStorage mock, WebSocket mock)
 */
export function processIndexHtml(content: string, cloudflareUrl: string): string {
  const isViteBuild = content.includes('type="module"') && (content.includes('/assets/') || content.includes('src="/'));

  // 1. Vite-specific path fixes
  if (isViteBuild) {
    // Inject <base href="."> if not present
    if (!content.includes('<base')) {
      content = content.replace('<head>', '<head><base href=".">');
    }

    // Convert absolute /assets/ to relative ./assets/
    content = content.replace(/(href|src)=["']\/assets\//g, '$1="./assets/');

    // Convert other absolute src/href to relative (for Vite builds)
    content = content.replace(/(href|src)=["']\/(index|main|style|src)/g, '$1="./$2');

    // Remove Vite dev scripts aggressively (only on Portal)
    content = content.replace(/<script[^>]*src=["'][^"']*(?:@vite\/client|vite\.js|hmr|:24678)[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '<!-- Vite Scrubbed (External) -->');
    content = content.replace(/<script[^>]*>[\s\S]*?(?:__vite_plugin_react_preamble_installed__|@react-refresh|RefreshRuntime|:24678)[\s\S]*?<\/script>/gi, '<!-- Vite Scrubbed (Inline) -->');
  }

  // 2. Global Alin.city Injections (Always apply when on Portal)
  if (!content.includes('window.__ALIN_FREE_ZONE__')) {
    const tunnelConfig = `<script id="alin-tunnel-config">window.__ALIN_TUNNEL_URL__ = "${cloudflareUrl}";</script>`;
    const alinFix = `
<script id="alin-runtime-fixes">
  window.__ALIN_FREE_ZONE__ = true;
  
  // A. LocalStorage Mock: Prevent cross-origin iframe security errors
  try {
    localStorage.getItem('test');
  } catch (e) {
    console.warn('[Alin.city Fix] LocalStorage is blocked by browser tracking prevention. Injecting Memory Storage...');
      const store = {};
      const mockStorage = {
        getItem: (k) => store[k] || null,
        setItem: (k, v) => store[k] = v.toString(),
        removeItem: (k) => delete store[k],
        clear: () => { for (let k in store) delete store[k]; },
        key: (i) => Object.keys(store)[i] || null,
        get length() { return Object.keys(store).length; }
      };
      Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true });
    }

  // B. WebSocket Mock: Suppress Vite HMR errors (only on Portal)
  const originalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    if (url && url.includes(':24678')) {
      console.warn('[Alin.city Fix] Suppressing HMR WebSocket for built game.');
      return { 
        send: () => {}, close: () => {}, addEventListener: () => {}, removeEventListener: () => {},
        binaryType: 'blob', url: url, readyState: 0, onopen: null, onmessage: null, onclose: null, onerror: null
      };
    }
    return new originalWebSocket(url, protocols);
  };
</script>`;

    const combinedInjections = `\n    ${tunnelConfig}${alinFix}`;
    const headMatch = content.match(/<head[^>]*>/i);
    if (headMatch) {
      content = content.replace(headMatch[0], headMatch[0] + combinedInjections);
    } else {
      content = combinedInjections + content;
    }
  }

  return content;
}

interface UseFileProcessorParams {
  showNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
  cloudflareUrl: string;
  gameName: string;
  setGameName: (name: string) => void;
  setSelectedFiles: (files: File[] | null) => void;
  setGameBaseDir: (dir: string) => void;
  setServerPreviewUrl: (url: string | null) => void;
  setLocalGameUrl: (url: string | null) => void;
  setShowOutdatedModal: (show: boolean) => void;
  setOutdatedDetails: (details: { sourceTime: string; buildTime: string } | null) => void;
  setShowPasteCodeModal: (show: boolean) => void;
}

export function useFileProcessor({
  showNotification,
  cloudflareUrl,
  gameName,
  setGameName,
  setSelectedFiles,
  setGameBaseDir,
  setServerPreviewUrl,
  setLocalGameUrl,
  setShowOutdatedModal,
  setOutdatedDetails,
  setShowPasteCodeModal,
}: UseFileProcessorParams) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setServerPreviewUrl(null);
    setLocalGameUrl(null);

    const allFiles = Array.from(files) as File[];

    if (allFiles.length > 0 && allFiles[0].webkitRelativePath) {
      const normalizedPath = normalizePath(allFiles[0].webkitRelativePath);
      const rootFolderName = normalizedPath.split('/')[0];
      if (rootFolderName) {
        setGameName(rootFolderName);
      }
    }

    // Find all index.html files, excluding node_modules (cross-platform compatible)
    const indexFiles = allFiles.filter(file => {
      const normalizedPath = normalizePath(file.webkitRelativePath);
      return (normalizedPath.endsWith('index.html') || normalizedPath.endsWith('index.html')) &&
        (!file.webkitRelativePath.includes('node_modules'));
    });

    if (indexFiles.length > 0) {
      // Priority patterns for finding the best index.html (cross-platform compatible)
      const priorities = [
        /\/(web\/dist)\/index\.html$/,
        /\/(dist)\/index\.html$/,
        /\/(build)\/index\.html$/,
        /\/(web)\/index\.html$/
      ];

      let bestIndexFile;
      for (const p of priorities) {
        bestIndexFile = indexFiles.find(f => {
          const normalizedPath = normalizePath(f.webkitRelativePath);
          return normalizedPath.match(p);
        });
        if (bestIndexFile) break;
      }

      // Fallback: use shortest path (closest to root)
      if (!bestIndexFile) {
        bestIndexFile = indexFiles.reduce((prev, curr) => {
          const prevLen = normalizePath(prev.webkitRelativePath).length;
          const currLen = normalizePath(curr.webkitRelativePath).length;
          return prevLen < currLen ? prev : curr;
        });
      }

      // Extract base directory (cross-platform compatible)
      const normalizedBestPath = normalizePath(bestIndexFile.webkitRelativePath);
      const baseDir = normalizedBestPath.substring(0, normalizedBestPath.lastIndexOf('/') + 1);
      setGameBaseDir(baseDir);

      // Filter files to only include those in the base directory
      const filteredFiles = allFiles.filter(f => {
        const normalizedPath = normalizePath(f.webkitRelativePath);
        return normalizedPath.startsWith(baseDir) &&
          !f.webkitRelativePath.includes('node_modules') &&
          !f.webkitRelativePath.includes('.git');
      });

      setSelectedFiles(filteredFiles);

      // VITE BUILD GUARD: Check if source files are newer than build files
      const isViteProject = allFiles.some(f =>
        f.name === 'vite.config.ts' ||
        f.name === 'vite.config.js' ||
        (f.name === 'package.json' && f.webkitRelativePath.includes('node_modules') === false)
      );

      if (isViteProject) {
        const buildFolderPatterns = ['/dist/', '/build/', '/web/dist/'];
        const buildFiles = filteredFiles.filter(f => {
          const normalizedPath = normalizePath(f.webkitRelativePath);
          return buildFolderPatterns.some(pattern => normalizedPath.includes(pattern));
        });
        const sourceFiles = filteredFiles.filter(f => {
          const normalizedPath = normalizePath(f.webkitRelativePath);
          return !buildFolderPatterns.some(pattern => normalizedPath.includes(pattern)) &&
            !f.webkitRelativePath.includes('node_modules') &&
            !f.webkitRelativePath.includes('.git');
        });

        if (buildFiles.length > 0 && sourceFiles.length > 0) {
          const maxSourceMod = Math.max(...sourceFiles.map(f => f.lastModified));
          const minBuildMod = Math.min(...buildFiles.map(f => f.lastModified));

          if (maxSourceMod > minBuildMod) {
            setOutdatedDetails({
              sourceTime: new Date(maxSourceMod).toLocaleString(),
              buildTime: new Date(minBuildMod).toLocaleString()
            });
            setShowOutdatedModal(true);
          }
        }
      }

      // Analyze index.html content
      try {
        const htmlContent = await bestIndexFile.text();
        const hasModuleScript = htmlContent.includes('type="module"');
        const hasServiceWorker = htmlContent.includes('serviceWorker') || htmlContent.includes('sw.js');

        console.log('Project analysis:', {
          hasModuleScript,
          hasServiceWorker,
          fileName: bestIndexFile.webkitRelativePath
        });
      } catch (err) {
        console.error('Error processing offline files:', err);
        showNotification('An error occurred during game folder preprocessing.', 'error');
      }
    } else {
      showNotification('index.html not found in selected folder.', 'error');
    }
  };

  const handlePasteCodeSubmit = (pastedCode: string) => {
    if (!pastedCode.trim()) {
      showNotification('Vui lòng dán mã HTML vào.', 'error');
      return;
    }
    try {
      const file = new File([pastedCode], 'index.html', { type: 'text/html' });
      Object.defineProperty(file, 'webkitRelativePath', { value: 'game/index.html' });
      setServerPreviewUrl(null);
      setLocalGameUrl(null);
      setGameBaseDir('game/');
      if (!gameName) setGameName('Single File Game');
      setSelectedFiles([file]);
      setShowPasteCodeModal(false);
    } catch (e: any) {
      showNotification('Lỗi khi tạo file: ' + e.message, 'error');
    }
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    return file || null;
  };

  /** Create a zip blob from selected files, processing index.html */
  const createZipBlob = async (selectedFiles: File[], gameBaseDir: string): Promise<Blob> => {
    const zip = new JSZip();
    for (const file of selectedFiles) {
      const normalizedPath = normalizePath(file.webkitRelativePath);
      const path = normalizedPath.substring(gameBaseDir.length);
      if (!path) continue;

      if (file.name === 'index.html') {
        const processedContent = processIndexHtml(await file.text(), cloudflareUrl);
        zip.file(path, processedContent);
      } else {
        zip.file(path, file);
      }
    }
    return zip.generateAsync({ type: 'blob' });
  };

  return {
    fileInputRef,
    thumbnailInputRef,
    handleFolderSelect,
    handlePasteCodeSubmit,
    handleThumbnailSelect,
    createZipBlob,
  };
}
