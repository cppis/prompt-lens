import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path'

/**
 * Chrome Extension build config (MV3 compatible)
 * - No inline scripts (CSP safe)
 * - Multi-page: popup.html + sidepanel.html
 * - background.js copied via build script
 */
export default defineConfig({
  base: './',
  plugins: [svelte()],
  build: {
    target: 'esnext',
    outDir: 'extension-dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        sidepanel: resolve(__dirname, 'sidepanel.html')
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
})
