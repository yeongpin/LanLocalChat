import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dotenv from 'dotenv'

dotenv.config()

const serverUrl = `http://${process.env.PUBLIC_HOST}:${process.env.SERVER_PORT}`

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 13050,
    host: true,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:13050',
        changeOrigin: true,
        ws: true
      },
      '/upload': {
        target: serverUrl
      },
      '/uploads': {
        target: serverUrl
      }
    }
  },
  build: {
    outDir: 'dist'
  }
}) 