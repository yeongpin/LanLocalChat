import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dotenv from 'dotenv'

dotenv.config()

const serverUrl = `http://${process.env.PUBLIC_HOST}:${process.env.SERVER_PORT}`

export default defineConfig({
  plugins: [vue()],
  define: {
    'import.meta.env.VITE_MESSAGE_SALT': JSON.stringify(process.env.VITE_MESSAGE_SALT || 'default-salt-value')
  },
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PUBLIC_PORT) || 5173,
    proxy: {
      '/socket.io': {
        target: serverUrl,
        ws: true,
        changeOrigin: true
      },
      '/upload': {
        target: serverUrl
      },
      '/uploads': {
        target: serverUrl
      }
    }
  }
}) 
