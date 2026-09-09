import { fileURLToPath } from 'node:url'

import { configDefaults, defineConfig, mergeConfig } from 'vitest/config'

import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      setupFiles: ['./src/app/setup-immer.ts', './src/app/setup-storage.ts'],
      environment: 'jsdom',
      // servers/** have their own `node --test` suites (run via each server's `npm test`).
      exclude: [...configDefaults.exclude, 'e2e/**', 'servers/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
