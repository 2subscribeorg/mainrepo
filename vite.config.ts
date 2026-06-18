import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      // Never ship source maps to production — they expose original source.
      sourcemap: false,
    },
    // Strip console.* and debugger statements from production bundles so no
    // debug output or accidental data leakage reaches end users. warn/error
    // are intentionally preserved for production diagnostics.
    esbuild: isProd
      ? { drop: ['debugger'], pure: ['console.log', 'console.debug', 'console.info'] }
      : {},
    test: {
      globals: true,
      environment: 'jsdom',
    },
  }
})
