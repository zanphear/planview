import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Stamp the service worker cache name with a unique build id so every deploy
// invalidates the old cache (the SW activate handler deletes non-current caches).
// Wired into `npm run build`, so the Docker image build picks it up automatically.
function stampServiceWorker(): Plugin {
  return {
    name: 'stamp-sw',
    apply: 'build',
    closeBundle() {
      const swPath = resolve(__dirname, 'dist/sw.js')
      if (!existsSync(swPath)) return
      const id = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
      const stamped = readFileSync(swPath, 'utf8').replace(/__BUILD_ID__/g, id)
      writeFileSync(swPath, stamped)
      this.info(`service worker cache -> planview-${id}`)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), stampServiceWorker()],
  build: {
    // Keep the initial chunk lean: quarantine heavy deps so a route that doesn't
    // use TipTap or dnd-kit doesn't pay for them. Budget enforced in CI via
    // scripts/check-bundle-budget.mjs (forbidden-27).
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'editor': ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-link', '@tiptap/extension-placeholder'],
          'dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          'markdown': ['react-markdown', 'remark-gfm'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
})
