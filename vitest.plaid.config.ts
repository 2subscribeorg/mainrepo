import { defineConfig } from 'vitest/config'
import path from 'path'

/**
 * Vitest configuration specifically for Plaid integration tests
 * Uses Node environment instead of jsdom to allow real HTTP requests
 */
export default defineConfig({
  test: {
    environment: 'node', // Use Node instead of jsdom for real API calls
    globals: true,
    include: ['src/services/plaid/__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
