import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The map (leaflet/turf/geoman) and the xlsx export lib are large and only used on
    // a couple of routes; splitting them keeps the initial bundle small and the warning honest.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Rolldown (Vite 8) expects manualChunks as a function, not an object.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\\/]node_modules[\\/](leaflet|react-leaflet|@turf|@geoman-io)/.test(id)) return 'map';
          if (/[\\/]node_modules[\\/]xlsx/.test(id)) return 'xlsx';
          if (/[\\/]node_modules[\\/]recharts/.test(id)) return 'charts';
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|@tanstack)[\\/]/.test(id)) return 'vendor';
        },
      },
    },
  },
})
