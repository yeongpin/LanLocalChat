import { createApp } from 'vue'
import App from './App.vue'
import io from 'socket.io-client'

const socket = io(`http://${window.location.hostname}:13050`, {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  path: '/socket.io'
})

createApp(App).mount('#app') 