import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
      // Skip type checking in production builds
      babel: process.env.NODE_ENV === 'production' ? {
        plugins: []
      } : undefined
    })
  ],
  esbuild: {
    // Skip type checking for faster builds
    target: 'esnext',
    ...(process.env.SKIP_TYPE_CHECK === '1' && {
      logOverride: { 'this-is-undefined-in-esm': 'silent' }
    })
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@bliss/supabase': path.resolve(__dirname, '../../packages/supabase/src'),
      '@bliss/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@bliss/types': path.resolve(__dirname, '../../packages/types/src'),
      '@bliss/i18n': path.resolve(__dirname, '../../packages/i18n/src'),
    },
  },
  server: {
    port: 3004,
    strictPort: true,
    host: true, // Allow external connections
    allowedHosts: [
      'localhost',
      '.trycloudflare.com', // Allow all Cloudflare Tunnel subdomains
      '.theblissathome.com', // Production domain
    ],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext', // For LINE LIFF compatibility
  },
})
