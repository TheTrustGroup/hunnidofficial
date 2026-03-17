import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { writeFileSync } from 'fs';
import { join } from 'path';

const buildId = Date.now().toString();
function versionPlugin() {
  let outDir = 'dist';
  return {
    name: 'version',
    config() {
      return { define: { 'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId) } };
    },
    configResolved(config) {
      outDir = config.build?.outDir ?? 'dist';
    },
    closeBundle() {
      try {
        writeFileSync(join(outDir, 'version.json'), JSON.stringify({ buildId }));
      } catch (_) {}
    },
  };
}

export default defineConfig({
  plugins: [react(), versionPlugin()],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // production only; dev server does not use terser
        passes: 1,
      },
      format: { comments: false },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'react';
          if (id.includes('node_modules/react-router')) return 'router';
          if (id.includes('node_modules/recharts')) return 'recharts';
          if (id.includes('node_modules/framer-motion')) return 'framer';
          if (id.includes('node_modules/lucide-react')) return 'lucide';
          if (id.includes('node_modules/dexie') || id.includes('node_modules/idb')) return 'idb';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    target: 'es2020',
    cssCodeSplit: true,
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
