import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const configuredProxyTarget = env.VITE_API_PROXY_TARGET
  // An empty value in .env means "not configured", so it falls back to the local API as well.
  const apiProxyTarget =
    configuredProxyTarget === undefined || configuredProxyTarget === ''
      ? 'https://localhost:7121'
      : configuredProxyTarget

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      environment: 'jsdom',
      environmentOptions: {
        jsdom: {
          url: 'http://localhost',
        },
      },
      exclude: ['node_modules/**', 'dist/**', 'tests/**'],
      globals: true,
      setupFiles: './src/test/setup.ts',
    },
  }
})
