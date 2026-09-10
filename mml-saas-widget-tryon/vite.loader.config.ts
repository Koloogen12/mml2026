import path from 'path';
import { defineConfig } from 'vite';

// Separate config for building the lightweight loader
export default defineConfig({
  define: {
    __BUILD_TIMESTAMP__: Date.now(),
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/loader.ts'),
      name: 'MakeMeLookLoader',
      formats: ['iife'],
      fileName: () => 'loader.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
    minify: 'terser',
  },
});
