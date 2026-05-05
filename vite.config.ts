import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs/promises';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import type {Plugin} from 'vite';

const legacyAssetAliases = {
  js: ['index-cu68UyN9.js'],
  css: ['index-B-m6XZrH.css'],
};

function legacyAssetAliasPlugin(): Plugin {
  return {
    name: 'legacy-asset-aliases',
    apply: 'build',
    async closeBundle() {
      const assetsDir = path.resolve(__dirname, 'dist', 'assets');
      const files = await fs.readdir(assetsDir);
      const currentEntryJs = files.find((file) => /^index-[\w-]+\.js$/.test(file));
      const currentEntryCss = files.find((file) => /^index-[\w-]+\.css$/.test(file));

      if (!currentEntryJs || !currentEntryCss) {
        throw new Error('Build did not produce index JS/CSS assets.');
      }

      await Promise.all([
        ...legacyAssetAliases.js.map((alias) =>
          fs.copyFile(path.join(assetsDir, currentEntryJs), path.join(assetsDir, alias)),
        ),
        ...legacyAssetAliases.css.map((alias) =>
          fs.copyFile(path.join(assetsDir, currentEntryCss), path.join(assetsDir, alias)),
        ),
      ]);
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), legacyAssetAliasPlugin()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
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
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
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
