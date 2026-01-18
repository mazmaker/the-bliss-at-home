import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
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
    port: 3002,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
