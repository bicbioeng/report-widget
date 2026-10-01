import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Three pages: index (KIDS wiring), overlays (Report over antd Modal / masked
// Drawer) and scroll (quick capture under document and body scrolling).
export default defineConfig({
  plugins: [react()],
  // scroll.js imports ../../../src/capture.js; resolve its snapdom from here.
  resolve: { dedupe: ['@zumer/snapdom'] },
  build: { rollupOptions: { input: { main: 'index.html', overlays: 'overlays.html', scroll: 'scroll.html' } } },
});
