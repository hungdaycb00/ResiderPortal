import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const stylesheetVersion = Date.now().toString(36);
  const buildVersion = mode === 'development'
    ? 'dev'
    : new Date().toISOString();
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'version-stylesheet-assets',
        transformIndexHtml(html) {
          // Inject build version meta tag for proactive cache busting
          html = html.replace(
            /<meta charset/,
            `<meta name="build-version" content="${buildVersion}">\n    <meta charset`,
          );
          // Add cache-bust param to CSS links
          return html.replace(/<link\b[^>]*>/g, (tag) => {
            if (!/\brel=["']stylesheet["']/.test(tag)) return tag;
            return tag.replace(
              /\bhref=["'](\/assets\/[^"']+\.css)["']/,
              `href="$1?css_v=${stylesheetVersion}"`,
            );
          });
        },
        writeBundle() {
          // Write version.txt to dist so client can poll for new version
          const distVersionPath = path.resolve(__dirname, 'dist', 'version.txt');
          fs.mkdirSync(path.dirname(distVersionPath), { recursive: true });
          fs.writeFileSync(distVersionPath, buildVersion, 'utf-8');
        },
      },
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      __APP_BUILD_VERSION__: JSON.stringify(buildVersion),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: true,
      allowedHosts: true,
      // Xóa cấu hình HMR tĩnh để Vite tự động phân tích WSS/WS dựa vào trình duyệt khi dùng qua Tunnel
    },
    build: {
      // Empty the outDir before build to keep it clean.
      emptyOutDir: true,
      // MapLibre is a large monolithic map renderer. Keep it isolated in its
      // own lazy AlinMap vendor chunk and warn only for chunks larger than it.
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/app-[hash].js',
          assetFileNames(assetInfo) {
            if (assetInfo.name?.endsWith('.css')) return 'assets/app-[hash][extname]';
            return 'assets/[name]-[hash][extname]';
          },
          manualChunks(id) {
            const normalizedId = id.split(path.sep).join('/');
            if (!normalizedId.includes('node_modules')) {
              if (normalizedId.includes('/src/components/alinmap/') || normalizedId.includes('/src/components/AlinMap')) return 'feature-map';
              if (normalizedId.includes('/src/components/creator/')) return 'feature-creator';
              if (normalizedId.includes('/src/components/tabs/')) return 'feature-tabs';
              if (normalizedId.includes('/src/components/')) return 'app-components';
              if (normalizedId.includes('/src/hooks/') || normalizedId.includes('/src/services/') || normalizedId.includes('/src/utils/')) return 'app-services';
              return undefined;
            }
            if (normalizedId.includes('/node_modules/maplibre-gl/') || normalizedId.includes('/node_modules/@maplibre/')) return 'vendor-maplibre';
            if (normalizedId.includes('/node_modules/@react-three/fiber/')) return 'vendor-r3f-fiber';
            if (normalizedId.includes('/node_modules/@react-three/drei/')) return 'vendor-r3f-drei';
            if (normalizedId.includes('/node_modules/three/examples/jsm/')) return 'vendor-three-examples';
            if (normalizedId.includes('/node_modules/three/')) return 'vendor-three-core';
            if (normalizedId.includes('/node_modules/react/') || normalizedId.includes('/node_modules/react-dom/') || normalizedId.includes('/node_modules/react-router-dom/')) return 'vendor-react';
            if (normalizedId.includes('/node_modules/firebase/') || normalizedId.includes('/node_modules/@firebase/')) return 'vendor-firebase';
            if (normalizedId.includes('/node_modules/framer-motion/') || normalizedId.includes('/node_modules/motion/')) return 'vendor-motion';
            if (normalizedId.includes('/node_modules/lucide-react/')) return 'vendor-icons';
            if (normalizedId.includes('/node_modules/socket.io')) return 'vendor-socket';
            if (normalizedId.includes('/node_modules/@google/genai/') || normalizedId.includes('/node_modules/jszip/')) return 'vendor-tools';
            return undefined;
          },
        },
      },
    },
  };
});
