import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dotenv from 'dotenv'

dotenv.config()

const serverUrl = `http://${process.env.PUBLIC_HOST}:${process.env.SERVER_PORT}`

export default defineConfig({
  plugins: [vue()],
  define: {
    'import.meta.env.SERVER_PORT': JSON.stringify(process.env.SERVER_PORT || 13050),
    'import.meta.env.PUBLIC_PORT': JSON.stringify(process.env.PUBLIC_PORT || 5173),
    'import.meta.env.HOST': JSON.stringify(process.env.HOST || '0.0.0.0'),
    'import.meta.env.PUBLIC_HOST': JSON.stringify(process.env.PUBLIC_HOST || '0.0.0.0'),
    'import.meta.env.VITE_SERVER_PORT': JSON.stringify(process.env.VITE_SERVER_PORT || 13050),
    'import.meta.env.VITE_NAME_LIMIT': JSON.stringify(process.env.VITE_NAME_LIMIT || 20),
    'import.meta.env.VITE_MESSAGE_SALT': JSON.stringify(process.env.VITE_MESSAGE_SALT || 'mysecretkey123'),
    'import.meta.env.MAX_FILE_SIZE': JSON.stringify(process.env.MAX_FILE_SIZE || 500),
    'import.meta.env.CLEANUP_INTERVAL': JSON.stringify(process.env.CLEANUP_INTERVAL || '1h'),
    'import.meta.env.HISTORY_RETENTION': JSON.stringify(process.env.HISTORY_RETENTION || '7d'),
    'import.meta.env.UPLOADS_RETENTION': JSON.stringify(process.env.UPLOADS_RETENTION || '1d'),
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