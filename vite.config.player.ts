import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Separate Vite config for building the player browser client.
 * Output goes to dist-player-client/ which Express serves at runtime.
 */
export default defineConfig({
  plugins: [react()],
  root: 'src/player-client',
  base: './',
  build: {
    outDir: '../../dist-player-client',
    emptyOutDir: true,
  },
})
