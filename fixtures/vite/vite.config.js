import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Two pages: index (KIDS wiring) and overlays (Report over antd Modal / masked Drawer).
export default defineConfig({
  plugins: [react()],
  build: { rollupOptions: { input: { main: 'index.html', overlays: 'overlays.html' } } },
});
