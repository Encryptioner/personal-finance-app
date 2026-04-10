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
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        // Enforced per spec §10.3 — will be tightened per-folder in later phases
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
      include: ['src/**'],
      exclude: ['src/test/**', 'src/vite-env.d.ts', 'src/**/*.d.ts'],
    },
  },
})
