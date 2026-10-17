import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'node:path'
import { execSync } from 'node:child_process'

// Codice del deploy mostrato nell'app: l'inizio dell'hash del commit pubblicato (in locale, quello corrente)
function buildId(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short=7 HEAD').toString().trim()
  } catch {
    return 'locale'
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/lavorettydicarta/',
  plugins: [react()],
  define: {
    __BUILD_ID__: JSON.stringify(buildId()),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
