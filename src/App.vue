<template>
  <div class="chat-container">
    <div class="floating-container">
      <button class="floating-button" @click="toggleLanguageMenu">
        <i class="fas fa-globe"></i>
      </button>
      <div v-if="showLanguageMenu" class="language-menu">
        <div 
          v-for="lang in ['en', 'zh_tw']" 
          :key="lang"
          class="language-item"
          :class="{ active: currentLocale === lang }"
          @click="setLocale(lang)"
        >
          {{ localeData?.language[lang] }}
        </div>
      </div>
      <button class="floating-button" @click="toggleTheme">
        <i :class="isDarkTheme ? 'fas fa-sun' : 'fas fa-moon'"></i>
      </button>
    </div>
    <div class="chat-main">
      <message-list 
        :messages="messages"
        @load-history="loadHistory" 
        :localeData="localeData"
      />
      <user-list 
        :users="onlineUsers" 
        :current-user="username"
        @show-name-editor="showNameEditor" 
        :localeData="localeData"
      />
      <chat-input 
        @send-message="handleSendMessage" 
        :users="filteredUsers"
        :localeData="localeData"
      />
    </div>
    <div v-if="showNameForm" class="modal-overlay">
      <login-form 
        class="name-changer" 
        @join="handleJoin"
        @close="showNameForm = false"
        :currentUsername="username"
        :localeData="localeData"
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
      username: '',
      messages: [],
      onlineUsers: [],
      showNameForm: false,
      isDarkTheme: true,
      currentLocale: 'zh_tw',
      localeData: {
        chat: {
          placeholder: '輸入消息...',
          send: '發送',
          attach: '附加文件',
          mention: '提及用戶',
          fileLimit: '最多只能同時上傳3個文件',
          uploadFailed: '文件上傳失敗'
        },
        language: {
          en: 'English',
          zh_tw: '繁體中文'
        }
      },
      showLanguageMenu: false,
      isConnected: false,
      reconnectAttempts: 0,
      maxReconnectAttempts: 5
    };
  },
  computed: {
    filteredUsers() {
      return this.onlineUsers.filter(user => user !== this.username);
    }
  },
  async mounted() {
    // 每次打開新標籤頁生成新的用戶名
    this.username = `User-${Math.random().toString(36).substr(2, 6)}`;
    
    const serverUrl = `http://${window.location.hostname}:${import.meta.env.VITE_SERVER_PORT || 13000}`;
    this.socket = io(serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });
    this.setupSocketListeners();
    
    // 從 localStorage 獲取語言設置
    const savedLocale = localStorage.getItem('locale') || 'zh_tw';
    try {
      await this.setLocale(savedLocale);
    } catch (error) {
      console.error('Failed to load initial locale:', error);
      console.warn('Using default translations');
    }
    
    // 處理重連邏輯
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      if (this.username) {
        this.socket.emit('join', this.username);
      }
      this.socket.emit('requestUserList');
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });
    
    // 定期檢查連接狀態
    setInterval(() => {
      if (!this.isConnected) {
        console.log('Attempting to reconnect...');
        this.socket.connect();
      }
    }, 5000);
    
    // 初始化主題
    const theme = localStorage.getItem('theme') || 'light';
    this.setTheme(theme);
  },
  methods: {
    async setLocale(locale) {
      try {
        const response = await fetch(`/locale/${locale}.json`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        this.localeData = await response.json();
        this.currentLocale = locale;
        localStorage.setItem('locale', locale);
        
        // 更新所有需要翻譯的文本
        this.updateAllTranslations();
        
        // 關閉語言選單
        this.showLanguageMenu = false;
      } catch (error) {
        console.error('Failed to load locale:', error);
        throw error;
      }
    },
    updateAllTranslations() {
      // 這裡可以添加需要即時更新的文本
      // 例如：更新頁面標題
      document.title = this.t('app.title') || 'LAN Chat';
    },
    t(path) {
      return path.split('.').reduce((acc, part) => acc && acc[part], this.localeData) || path;
    },
    toggleLanguageMenu() {
      this.showLanguageMenu = !this.showLanguageMenu;
    },
    setupSocketListeners() {
      // 清理舊的監聽器
      this.socket.removeAllListeners();
      
      this.socket.on('connect', () => {
        console.log('Connected to server');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        if (this.username) {
          this.socket.emit('join', this.username);
        }
        this.socket.emit('requestUserList');
      });
      
      this.socket.on('disconnect', () => {
        console.log('Disconnected from server');
        this.isConnected = false;
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
        }
      });
      
      this.socket.on('message', (msg) => {
        this.messages.push(msg);
      });

      this.socket.on('chatHistory', (history) => {
        this.messages.unshift(...history);
      });

      this.socket.on('userList', (users) => {
        console.log('Received user list:', users);
        this.onlineUsers = users;
      });

      this.socket.on('nameError', (error) => {
        console.warn('Username taken:', error);
      });

      this.socket.on('nameChanged', (newUsername) => {
        this.username = newUsername;
        localStorage.setItem('username', newUsername);
      });

      this.socket.on('mentioned', (data) => {
        this.playNotificationSound();
        this.showNotification(data);
      });
    },
    async showNotification(data) {
      if (!("Notification" in window)) return;
      
      if (Notification.permission === "granted") {
        this.createNotification(data);
      } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          this.createNotification(data);
        }
      }
    },
    createNotification(data) {
      new Notification(`${data.from} 提到了你`, {
        body: data.message,
        icon: './public/favicon.ico',
        tag: 'mention',  // 防止重複通知
        renotify: true   // 允許重複通知
      });
    },
    handleJoin(username) {
      if (!username.trim()) {
        alert(this.t('user.nameError'));
        return;
      }
      this.username = username;
      if (this.isConnected) {
        this.socket.emit('join', this.username);
      }
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
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 20px;
}

.chat-main {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 20px;
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
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-left: 10px;
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

.language-menu {
  position: absolute;
  left: 70%;
  bottom: 15px;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  animation: fadeIn 0.2s ease-out;
  margin-left: 15px;
}

.language-item {
  padding: 8px 16px;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.2s;
  position: relative;
  padding-left: 32px;
}

.language-item:hover {
  background-color: var(--hover-color);
}

.language-item.active {
  background-color: var(--accent-color);
  color: white;
  font-weight: bold;
}

.language-item.active::before {
  content: '✓';
  position: absolute;
  left: 12px;
  color: white;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@media (max-width: 768px) {
  .chat-container {
    grid-template-columns: 60px 1fr;
    gap: 10px;
    padding: 10px;
  }

  .floating-container {
    margin-left: 5px;
  }

  .language-menu {
    margin-left: 10px;
  }

  .floating-button {
    width: 32px;
    height: 32px;
  }
}
</style> 