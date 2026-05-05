import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs/promises';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import type {Plugin} from 'vite';

const legacyAssetAliases = {
  'app-js': ['index-cu68UyN9.js', 'app-DbPll2Hn.js'],
  'app-css': ['index-B-m6XZrH.css', 'app-5pVPrLl8.css'],
  'feature-looter': ['feature-looter-Dgr_Fkix.js'],
  'feature-tabs': ['feature-tabs-DTCEvHLv.js']
};

function legacyAssetAliasPlugin(): Plugin {
  return {
    name: 'legacy-asset-aliases',
    apply: 'build',
    async closeBundle() {
      const assetsDir = path.resolve(__dirname, 'dist', 'assets');
      const files = await fs.readdir(assetsDir);
      
      const chunks = {
        'app-js': files.find((file) => /^app-[\w-]+\.js$/.test(file)),
        'app-css': files.find((file) => /^app-[\w-]+\.css$/.test(file)),
        'feature-looter': files.find((file) => /^feature-looter-[\w-]+\.js$/.test(file)),
        'feature-tabs': files.find((file) => /^feature-tabs-[\w-]+\.js$/.test(file))
      };

      if (!chunks['app-js'] || !chunks['app-css']) {
        throw new Error('Build did not produce index JS/CSS assets.');
      }

      const copyTasks = [];
      
      for (const [key, aliases] of Object.entries(legacyAssetAliases)) {
        const sourceFile = chunks[key as keyof typeof chunks];
        if (sourceFile) {
          for (const alias of aliases) {
            copyTasks.push(fs.copyFile(path.join(assetsDir, sourceFile), path.join(assetsDir, alias)));
          }
        }
      }

      await Promise.all(copyTasks);
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
          entryFileNames: 'assets/app-[hash].js',
          assetFileNames(assetInfo) {
            if (assetInfo.name?.endsWith('.css')) return 'assets/app-[hash][extname]';
            return 'assets/[name]-[hash][extname]';
          },
          manualChunks(id) {
            const normalizedId = id.split(path.sep).join('/');
            if (!normalizedId.includes('node_modules')) {
              if (normalizedId.includes('/src/components/alinmap/looter-game/')) return 'feature-looter';
              if (normalizedId.includes('/src/components/alinmap/')) return 'feature-alinmap';
              if (normalizedId.includes('/src/components/creator/')) return 'feature-creator';
              if (normalizedId.includes('/src/components/tabs/')) return 'feature-tabs';
              if (normalizedId.includes('/src/components/')) return 'app-components';
              if (normalizedId.includes('/src/hooks/') || normalizedId.includes('/src/services/') || normalizedId.includes('/src/utils/')) return 'app-services';
              return undefined;
            }
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
