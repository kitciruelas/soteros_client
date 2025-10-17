import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'node:path'

const base = process.env.BASE_PATH || '/'
const isPreview = process.env.IS_PREVIEW ? true : false;
const isProduction = process.env.NODE_ENV === 'production';

// Environment variables for API configuration
const apiUrl = process.env.VITE_API_URL || 'https://soteros-backend.onrender.com/api';
// https://vite.dev/config/
export default defineConfig({
  define: {
   __BASE_PATH__: JSON.stringify(base),
   __IS_PREVIEW__: JSON.stringify(isPreview)
  },
  plugins: [react()],
  base, 
  build: {
    sourcemap: false,
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['recharts', 'leaflet']
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: isProduction,  // Remove console.log only in production
        drop_debugger: isProduction  // Remove debugger statements only in production
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: {
      port: 24678, // Use a different port for HMR WebSocket
      overlay: false, // Disable error overlay
    },
    // Only use proxy in development when API_URL is relative
    ...(apiUrl.startsWith('/') && {
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '/api')
        },
        '/uploads': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/uploads/, '/uploads')
        }
      }
    })
  }
})
