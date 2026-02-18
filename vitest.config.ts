import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    globals: true,
    environment: 'node',
    include: [
      'apps/*/src/**/*.test.ts',
      'apps/*/src/**/*.test.tsx',
      'packages/*/src/**/*.test.ts',
      'packages/*/src/**/*.test.tsx',
    ],
    exclude: ['node_modules', 'dist'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'apps/*/src/utils/**',
        'apps/*/src/lib/pricingUtils*',
        'packages/*/src/services/**',
        'packages/*/src/components/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@bliss/supabase': path.resolve(__dirname, './packages/supabase/src'),
      '@bliss/ui': path.resolve(__dirname, './packages/ui/src'),
      '@bliss/types': path.resolve(__dirname, './packages/types/src'),
      '@bliss/i18n': path.resolve(__dirname, './packages/i18n/src'),
    },
  },
})
