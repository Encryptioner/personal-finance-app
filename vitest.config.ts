import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    testTimeout: 15000,
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        // Global fallback (untested areas like UI pages keep global from blocking CI)
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
        // Per-folder enforcement per spec §10.3
        'src/shared/lib/**': { statements: 95, branches: 95, functions: 95, lines: 95 },
        'src/shared/validation/**': { statements: 95, branches: 95, functions: 95, lines: 95 },
        'src/features/sync/api/**': { statements: 90, branches: 90, functions: 80, lines: 90 },
        'src/features/sync/model/**': { statements: 90, branches: 90, functions: 90, lines: 90 },
        'src/features/auth/model/**': { statements: 90, branches: 90, functions: 90, lines: 90 },
      },
      include: ['src/**'],
      exclude: ['src/test/**', 'src/vite-env.d.ts', 'src/**/*.d.ts'],
    },
  },
})
