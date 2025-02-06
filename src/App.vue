<template>
  <div class="chat-container">
    <div class="floating-container">
      <button class="floating-button" @click="toggleTheme">
        <i :class="isDarkTheme ? 'fas fa-sun' : 'fas fa-moon'"></i>
      </button>
    </div>
    <div class="chat-main">
      <message-list 
        :messages="messages"
        @load-history="loadHistory" 
      />
      <user-list 
        :users="onlineUsers" 
        :current-user="username"
        @show-name-editor="showNameEditor" 
      />
      <chat-input 
        @send-message="handleSendMessage" 
        :users="filteredUsers"
      />
    </div>
    <div v-if="showNameForm" class="modal-overlay">
      <login-form 
        class="name-changer" 
        @join="handleJoin"
        @close="showNameForm = false"
        :currentUsername="username"
      />
    </div>
  </div>
</template>

<script>
import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import './css/global.css';
import LoginForm from './components/LoginForm.vue';
import MessageList from './components/MessageList.vue';
import UserList from './components/UserList.vue';
import ChatInput from './components/ChatInput.vue';

export default {
  name: 'App',
  components: {
    LoginForm,
    MessageList,
    UserList,
    ChatInput
  },
  data() {
    return {
      socket: null,
      username: `User-${uuidv4().slice(0, 6)}`,
      messages: [],
      onlineUsers: [],
      showNameForm: false,
      isDarkTheme: true,
    };
  },
  computed: {
    filteredUsers() {
      return this.onlineUsers.filter(user => user !== this.username);
    }
  },
  mounted() {
    const serverUrl = `http://${window.location.hostname}:${import.meta.env.VITE_SERVER_PORT || 13000}`;
    this.socket = io(serverUrl);
    this.setupSocketListeners();
    
    // 從 localStorage 獲取用戶名
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
      this.username = savedUsername;
    }
    
    // 確保連接成功後再發送加入消息
    this.socket.on('connect', () => {
      this.socket.emit('join', this.username);
    });
    
    // 初始化主題
    const theme = localStorage.getItem('theme') || 'light';
    this.setTheme(theme);
  },
  methods: {
    setupSocketListeners() {
      this.socket.on('message', (msg) => {
        this.messages.push(msg);
      });

      this.socket.on('chatHistory', (history) => {
        this.messages.unshift(...history);
      });

      this.socket.on('userList', (users) => {
        this.onlineUsers = users;
      });

      this.socket.on('nameError', (error) => {
        alert(error);
        this.username = `User-${uuidv4().slice(0, 6)}`;
        this.socket.emit('join', this.username);
      });

      this.socket.on('mentioned', (data) => {
        // 播放提示音
        this.playNotificationSound();
        
        // 如果瀏覽器支持通知且用戶已授權
        if (Notification.permission === "granted") {
          new Notification(`${data.from} 提到了你`, {
            body: data.message,
            icon: './public/favicon.ico'
          });
        }
        // 如果用戶未決定是否允許通知

        else if (Notification.permission !== "denied") {
          Notification.requestPermission().then(permission => {
            if (permission === "granted") {
              new Notification(`${data.from} 提到了你`, {
                body: data.message,
                icon: './public/favicon.ico'
              });
            }
          });
        }
      });
    },
    handleJoin(username) {
      if (!username.trim()) {
        alert('用戶名不能為空');
        return;
      }
      this.username = username;
      localStorage.setItem('username', username);
      this.socket.emit('join', this.username);
      this.showNameForm = false;
    },
    handleSendMessage(message) {
      this.socket.emit('message', message);
    },
    showNameEditor() {
      this.showNameForm = true;
    },
    toggleTheme() {
      const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      this.setTheme(newTheme);
      localStorage.setItem('theme', newTheme);
    },
    setTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      this.isDarkTheme = theme === 'dark';
    },
    loadHistory() {
      this.socket.emit('requestHistory');
    },
    playNotificationSound() {
      // 使用 Web Audio API 創建提示音
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // 設置音量
      gainNode.gain.value = 0.1;
      
      // 設置音調和持續時間
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 音
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1); // 持續 0.1 秒
    }
  }
};
</script>

<style>
body {
  background-color: var(--bg-color);
  color: var(--text-color);
  margin: 0;
}

.chat-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
  height: 95vh;
  display: flex;
  flex-direction: column;
}

.chat-main {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 20px;
  flex: 1;
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
  grid-template-rows: 1fr auto;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.name-changer {
  background-color: var(--bg-color);
  padding: 20px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.floating-container {
  position: fixed;
  left: 20px;
  bottom: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.floating-button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.floating-button:hover {
  background-color: var(--hover-color);
  transform: scale(1.1);
}
</style> 