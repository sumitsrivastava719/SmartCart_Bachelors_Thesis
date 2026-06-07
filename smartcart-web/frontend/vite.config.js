import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Single raw WebSocket channel to the deployed Render backend.
      '/ws': {
        target: 'https://smartcart-bachelors-thesis.onrender.com',
        ws: true,
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
