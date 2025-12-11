import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    target: 'esnext',
    supported: {
      'top-level-await': true,
    },
  },
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
});
