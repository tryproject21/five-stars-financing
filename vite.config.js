import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/ac-smart-consultant/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    open: true,
    port: 3000,
  }
});
