import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    hmr: {
      clientPort: 5174,
      overlay: false
    },
    proxy: {
      // Override with VITE_API_URL if needed (e.g. http://localhost:8001)
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true
      },
      '/uploads': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true
      },
      // Dynamic product sitemap (same as nginx production proxy)
      '/sitemap.xml': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: () => '/api/v1/sitemap.xml',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Keep browser host so sitemap <loc> is http://localhost:5173/... not :8000
            const host = req.headers.host || 'localhost:5173'
            proxyReq.setHeader('X-Forwarded-Host', host)
            proxyReq.setHeader('X-Forwarded-Proto', 'http')
            proxyReq.setHeader('Host', host)
          })
        },
      },
    }
  }
})
