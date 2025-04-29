import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Ensure output directory is specified explicitly
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    // Better minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Reduce chunk size
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          // Add more manual chunks as needed
        },
      },
    },
    // Pre-optimize large dependencies
    commonjsOptions: {
      include: [/node_modules/],
    },
    // Disable source maps in production
    sourcemap: false,
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'axios']
  },
  // Force Vite to use CommonJS for compatibility
  resolve: {
    conditions: ['node']
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
