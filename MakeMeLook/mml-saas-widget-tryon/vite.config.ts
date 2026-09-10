import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const apiTarget = env.VITE_API_TARGET || 'http://localhost:3010';
  const s3Proxy = env.VITE_S3_PROXY === 'true';
  const s3Target = env.VITE_S3_TARGET || 'http://127.0.0.1:9010';

  const proxy: Record<string, object> = {
    '/api': {
      target: apiTarget,
      changeOrigin: true,
    },
  };

  if (s3Proxy) {
    proxy['/s3'] = {
      target: s3Target,
      changeOrigin: true,
      rewrite: (p: string) => p.replace(/^\/s3/, ''),
    };
  }

  return {
    plugins: [tailwindcss(), react()],
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    server: {
      port: 5175,
      proxy,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      lib: {
        entry: path.resolve(__dirname, 'src/widget.tsx'),
        name: 'MakeMeLookWidget',
        formats: ['iife'],
        fileName: () => 'widget.js',
      },
      rollupOptions: {
        external: [],
        output: {
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) return 'widget.css';
            return assetInfo.name ?? 'assets/[name]-[hash][extname]';
          },
        },
      },
      cssCodeSplit: false,
      outDir: 'dist',
      cssMinify: true,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: false,
        },
      },
    },
  };
});
