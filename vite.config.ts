import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  // The pre-render bundle (vite build --ssr) inlines its dependencies so it
  // runs under plain Node without CJS/ESM interop surprises. Build only:
  // vitest reads this config too, and inlining everything there breaks it.
  ssr: command === "build" ? { noExternal: true } : {},
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('@visx/shape') || id.includes('@visx/scale') ||
            id.includes('@visx/axis') || id.includes('@visx/grid') ||
            id.includes('@visx/group') || id.includes('@visx/responsive') ||
            id.includes('@visx/curve') || id.includes('@visx/brush')
          ) return 'vendor-visx'
          if (id.includes('d3-shape') || id.includes('d3-scale') || id.includes('d3-array')) return 'vendor-d3'
          if (id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('/react/') || id.includes('/react-dom/')) return 'vendor-react'
        },
      },
    },
  },
}))
