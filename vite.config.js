import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Local dev proxy: the browser calls same-origin /api/* and Vite forwards
    // to the hosted backend server-side. We strip the Origin header so the
    // backend's CORS check treats it as a non-browser request and responds.
    proxy: {
      '/api': {
        target: BACKEND,
        changeOrigin: true,
        secure: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin')
            proxyReq.removeHeader('referer')
          })
        },
      },
      // Socket.IO (real-time notifications/chat) over the same proxy
      '/socket.io': {
        target: BACKEND,
        changeOrigin: true,
        secure: true,
        ws: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin')
            proxyReq.removeHeader('referer')
          })
        },
      },
    },
  },
})
