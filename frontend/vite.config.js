import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for React and related libraries
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // React Query chunk
          query: ['@tanstack/react-query'],
          // UI libraries chunk
          ui: ['react-hot-toast', 'react-icons'],
          // SignalR chunk (for chat functionality)
          signalr: ['@microsoft/signalr'],
          // Utility libraries
          utils: ['axios', 'jwt-decode', 'cloudinary-core']
        }
      }
    },
    // Optimize chunk size warning limit
    chunkSizeWarningLimit: 600,
    // Enable source maps for better debugging in production
    sourcemap: false, // Disabled for better performance
    // Minimize bundle size using esbuild (faster than terser)
    minify: 'esbuild',
    // Remove console logs in production
    drop: ['console', 'debugger']
  },
  // Performance optimizations
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query']
  }
})
