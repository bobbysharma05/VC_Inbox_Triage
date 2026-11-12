import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Forward API calls to Express so the browser never needs CORS.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
