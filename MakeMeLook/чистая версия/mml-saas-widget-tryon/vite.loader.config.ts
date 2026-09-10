import path from 'path';
import { defineConfig } from 'vite';

// Separate config for building the lightweight loader
export default defineConfig({
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
