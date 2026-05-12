import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
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
          return html.replace(/<link\b[^>]*>/g, (tag) => {
            if (!/\brel=["']stylesheet["']/.test(tag)) return tag;
            return tag.replace(
              /\bhref=["'](\/assets\/[^"']+\.css)["']/,
              `href="$1?css_v=${stylesheetVersion}"`,
            );
          });
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
            if (id.includes('three') || id.includes('@react-three') || id.includes('three-stdlib')) return 'vendor-three';
            if (id.includes('react/') || id.includes('react-dom/') || id.includes('react-router-dom/')) return 'vendor-react';
            if (id.includes('firebase/')) return 'vendor-firebase';
            if (id.includes('framer-motion') || id.includes('motion/')) return 'vendor-motion';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('socket.io')) return 'vendor-socket';
            if (id.includes('@google/genai') || id.includes('jszip')) return 'vendor-tools';
            return undefined;
          },
        },
      },
    },
  };
});
