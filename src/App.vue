<template>
  <div class="chat-container">
    <div class="floating-container">
      <button 
        class="floating-button mobile-user-btn"
        @click="toggleMobileUserList"
        :title="t('user.online')"
      >
        <i class="fas fa-users"></i>
      </button>
      <button class="floating-button" @click="showCreateRoom">
        <i class="fas fa-comments"></i>
      </button>
      <button 
        v-if="currentRoomId !== 'public'"
        class="floating-button share-room" 
        @click="shareRoom"
        :title="t('room.shareRoom')"
      >
        <i class="fas fa-share-alt"></i>
      </button>
      <button 
        v-if="currentRoomId !== 'public'"
        class="floating-button leave-room" 
        @click="leaveToPublic"
        :title="t('room.leaveToPublic')"
      >
        <i class="fas fa-sign-out-alt"></i>
      </button>
      <button class="floating-button" @click="toggleLanguageMenu">
        <i class="fas fa-globe"></i>
      </button>
      <div v-if="showLanguageMenu" class="language-menu">
        <div 
          v-for="lang in ['en', 'zh_tw', 'zh_cn']" 
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
        ref="messageList"
        :messages="messages"
        @load-history="loadHistory" 
        :localeData="localeData"
        @join-voice-call="handleJoinVoiceCall"
        @leave-voice-call="handleLeaveVoiceCall"
        @end-voice-call="handleEndVoiceCall"
        @mute-voice-call="handleMuteVoiceCall"
        @send-message="handleSendMessage"
        @audio-data="handleAudioData"
      />
      <div class="desktop-user-list">
        <user-list 
          :users="onlineUsers" 
          :current-user="username"
          @show-name-editor="showNameEditor" 
          :localeData="localeData"
        />
      </div>
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
    <div v-if="showRoomModal" class="modal-overlay">
      <create-room-modal
        class="room-modal"
        @close="showRoomModal = false"
        @create="handleCreateRoom"
        :localeData="localeData"
        :socket="socket"
      />
    </div>
    <div v-if="showJoinRoomModal" class="modal-overlay">
      <join-room-modal
        class="room-modal"
        @close="showJoinRoomModal = false"
        :localeData="localeData"
        :currentRoomId="currentRoomId"
      />
    </div>
    <div class="mobile-user-list" :class="{ 'show': showMobileUserList }">
      <button class="close-btn" @click="showMobileUserList = false">
        <i class="fas fa-times"></i>
      </button>
      <user-list 
        :users="onlineUsers" 
        :current-user="username"
        @show-name-editor="showNameEditor" 
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
import CreateRoomModal from './components/CreateRoomModal.vue';
import JoinRoomModal from './components/JoinRoomModal.vue';

export default {
  name: 'App',
  components: {
    LoginForm,
    MessageList,
    UserList,
    ChatInput,
    CreateRoomModal,
    JoinRoomModal
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
          zh_tw: '繁體中文',
          zh_cn: '简体中文'
        }
      },
      showLanguageMenu: false,
      isConnected: false,
      reconnectAttempts: 0,
      maxReconnectAttempts: 5,
      showRoomModal: false,
      showJoinRoomModal: false,
      currentRoomId: new URLSearchParams(window.location.search).get('chat_id') || 'public',
      notificationSound: null,
      audioContext: null,
      showMobileUserList: false,
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
    
    // 如果沒有 chat_id 參數，重定向到公共聊天室
    if (!window.location.search.includes('chat_id')) {
      window.history.replaceState({}, '', '/?chat_id=public');
    }
    
    // 檢查URL是否包含房間ID
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('chat_id');
    const isPrivate = params.get('private') === '1';
    
    const serverUrl = `http://${window.location.hostname}:${import.meta.env.VITE_SERVER_PORT || 13050}`;
    
    // 確保服務器正在運行
    try {
      this.socket = io(serverUrl, {
        query: {
          chat_id: params.get('chat_id') || 'public',
          private: isPrivate ? '1' : '0',
          pass: params.has('pass') ? params.get('pass') : '',
          pass_need: params.get('pass_need'),
          creating: params.get('creating')
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
      });
      
      this.setupSocketListeners();
    } catch (error) {
      console.error('Failed to connect to server:', error);
    }
    
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
      // 清除可能存在的重複監聽器
      this.socket.off('chat-message');
      this.socket.off('user-joined');
      this.socket.off('user-left');
      this.socket.off('user-rename');
      this.socket.off('voice-call-join');
      this.socket.off('voice-call-leave');
      this.socket.off('voice-call-end');
      this.socket.off('voice-call-mute');
      
      // 處理錯誤消息
      this.socket.on('error', (error) => {
        if (error.type === 'auth') {
          // 根據不同的錯誤類型顯示不同的處理方式
          switch (error.message) {
            case 'need_password':
              // 顯示加入房間的模態框
              this.showJoinRoomModal = true;
              break;
            case 'wrong_password':
              // 先顯示加入房間的模態框
              this.showJoinRoomModal = true;
              // 然後顯示錯誤消息
              this.$nextTick(() => {
                alert(this.t('room.invalidPassword'));
              });
              break;
            case 'room_not_found':
              alert(this.t('room.roomNotFound'));
              window.location.href = '/?chat_id=public';
              break;
            default:
              alert(error.message);
              window.location.href = '/?chat_id=public';
              break;
          }
        }
      });
      
      // 處理連接確認
      this.socket.on('connectionConfirmed', (data) => {
        console.log('連接確認:', data);
        // 確保用戶加入正確的房間
        if (this.username) {
          this.socket.emit('join', this.username);
        }
      });
      
      this.socket.on('connect', () => {
        console.log('Connected to server');
        this.isConnected = true;
        this.reconnectAttempts = 0;
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
        // 檢查是否有重複的用戶
        const uniqueUsers = users.filter((user, index, self) =>
          index === self.findIndex((u) => u.user === user.user)
        );
        console.log('Received user list:', users);
        this.onlineUsers = uniqueUsers;
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

      // 監聽用戶加入語音通話
      this.socket.on('voice-call-join', (data) => {
        console.log('收到用戶加入語音通話事件:', data);
        
        // 尋找對應的通話消息
        const callMessage = this.messages.find(m => 
          m.type === 'voice-call' && m.content.callId === data.callId
        );
        
        if (callMessage) {
          // 更新參與者列表
          if (!callMessage.content.participants.includes(data.user)) {
            callMessage.content.participants.push(data.user);
          }
          
          // 添加系統消息
          this.messages.push({
            type: 'system',
            content: `${data.user} 加入了語音通話`,
            timestamp: data.timestamp
          });
        }
      });
      
      // 監聽用戶離開語音通話
      this.socket.on('voice-call-leave', (data) => {
        console.log('收到用戶離開語音通話事件:', data);
        
        // 尋找對應的通話消息
        const callMessage = this.messages.find(m => 
          m.type === 'voice-call' && m.content.callId === data.callId
        );
        
        if (callMessage) {
          // 更新參與者列表
          const index = callMessage.content.participants.indexOf(data.user);
          if (index !== -1) {
            callMessage.content.participants.splice(index, 1);
          }
          
          // 添加系統消息
          this.messages.push({
            type: 'system',
            content: `${data.user} 離開了語音通話`,
            timestamp: data.timestamp
          });
        }
      });
      
      // 監聽語音通話結束
      this.socket.on('voice-call-end', (data) => {
        console.log('收到語音通話結束事件:', data);
        
        // 尋找對應的通話消息
        const callMessage = this.messages.find(m => 
          m.type === 'voice-call' && m.content.callId === data.callId
        );
        
        if (callMessage) {
          // 標記通話為已結束
          callMessage.content.active = false;
          
          // 如果自己在通話中，強制離開
          if (this.$refs.messageList && this.$refs.messageList.activeCallId === data.callId) {
            this.$refs.messageList.leaveCall(data.callId);
          }
          
          // 添加系統消息
          this.messages.push({
            type: 'system',
            content: `${data.user} 結束了語音通話`,
            timestamp: data.timestamp
          });
        }
      });

      // 監聽音頻數據
      this.socket.on('voice-call-audio', (data) => {
        // 將音頻數據轉發給 MessageList 組件
        if (this.$refs.messageList) {
          this.$refs.messageList.handleAudioData(data);
        }
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
      this.initAudio();
      if (this.isConnected) {
        this.socket.emit('join', this.username);
      }
      this.showNameForm = false;
    },
    handleSendMessage(message) {
      // 如果是語音通話消息，直接添加到本地消息列表
      if (message.type === 'voice-call') {
        this.messages.push(message);
        
        // 如果是創建通話的消息，自動設置為活動通話
        if (message.user === this.username) {
          setTimeout(() => {
            if (this.$refs.messageList) {
              this.$refs.messageList.activeCallId = message.content.callId;
            }
          }, 600); // 稍微延遲，確保消息已經渲染
        }
        
        return;
      }
      
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
    initAudio() {
      // 初始化音頻上下文
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      // 初始化音頻元素
      if (!this.notificationSound) {
        this.notificationSound = new Audio('/sounds/notification.mp3');
        this.notificationSound.volume = 0.5;
      }
    },
    playNotificationSound() {
      try {
        if (!this.notificationSound) {
          this.initAudio();
        }

        if (this.audioContext?.state === 'suspended') {
          this.audioContext.resume();
        }

        if (this.notificationSound.paused) {
          this.notificationSound.currentTime = 0;
          this.notificationSound.play()
            .catch(err => {
              console.warn('需要用戶交互才能播放音效');
              // 添加視覺提示
              const notification = document.createElement('div');
              notification.className = 'visual-notification';
              notification.textContent = '🔔';
              document.body.appendChild(notification);
              setTimeout(() => notification.remove(), 1000);
            });
        }
      } catch (err) {
        console.error('音效播放錯誤:', err);
      }
    },
    showCreateRoom() {
      this.showRoomModal = true;
    },
    handleCreateRoom(roomData) {
      // 處理創建房間的邏輯
      console.log('Creating room:', roomData);
      this.showRoomModal = false;
    },
    leaveToPublic() {
      // 重定向到公共聊天室
      window.location.href = '/?chat_id=public';
    },
    shareRoom() {
      const params = new URLSearchParams(window.location.search);
      const passNeed = params.get('pass_need');
      const password = params.get('pass');
      
      if (passNeed && passNeed !== 'false') {
        // 如果需要密碼，詢問是否包含密碼
        if (confirm(this.t('room.includePassword'))) {
          // 包含密碼的URL
          const url = window.location.href;
          navigator.clipboard.writeText(url).then(() => {
            alert(this.t('room.copied'));
          });
        } else {
          // 不包含密碼的URL
          const url = new URL(window.location.href);
          url.searchParams.delete('pass');
          navigator.clipboard.writeText(url.toString()).then(() => {
            alert(this.t('room.copied'));
          });
        }
      } else {
        // 不需要密碼，直接複製URL
        navigator.clipboard.writeText(window.location.href).then(() => {
          alert(this.t('room.copied'));
        });
      }
    },
    toggleMobileUserList() {
      this.showMobileUserList = !this.showMobileUserList;
    },
    handleJoinVoiceCall(data) {
      console.log('用戶加入語音通話:', data);
      
      // 發送加入通話事件
      this.socket.emit('voice-call-join', {
        callId: data.callId,
        user: this.username
      });
    },
    handleLeaveVoiceCall(data) {
      console.log('用戶離開語音通話:', data);
      
      // 發送離開通話事件
      this.socket.emit('voice-call-leave', {
        callId: data.callId,
        user: this.username
      });
    },
    handleEndVoiceCall(data) {
      console.log('用戶結束語音通話:', data);
      
      // 發送結束通話事件
      this.socket.emit('voice-call-end', {
        callId: data.callId,
        user: this.username
      });
    },
    handleMuteVoiceCall(data) {
      console.log('用戶靜音狀態變化:', data);
      
      // 發送靜音狀態變化事件
      this.socket.emit('voice-call-mute', {
        callId: data.callId,
        user: this.username,
        muted: data.muted
      });
    },
    handleAudioData(data) {
      // 發送音頻數據
      this.socket.emit('voice-call-audio', {
        callId: data.callId,
        user: this.username,
        data: data.data,
        timestamp: data.timestamp
      });
    },
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
  overflow: hidden !important;
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
  max-width: 100%;
  overflow: hidden !important;
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
    grid-template-columns: 50px 1fr;
    gap: 10px;
    padding: 10px 0px;
    height: 97vh;
    width: 100%;
    max-width: 100%;
    margin: 0;
    overflow: hidden !important;
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

  .mobile-user-btn {
    display: flex !important;
  }

  .desktop-user-list {
    display: none !important;
  }

  .chat-main {
    grid-template-columns: 1fr;
    padding: 10px;
    gap: 10px;
    width: 90%;
    margin: 0;
    overflow: hidden;
  }

  /* 確保移動端消息列表佔滿寬度 */
  .chat-main > *:first-child {
    grid-column: 1 / -1;
    width: 88%;
    max-width: 100%;
  }
}


.leave-room:hover {
  background-color: var(--error-hover-color);
  transform: scale(1.1);
}

.share-room {
  background-color: var(--accent-color);
  color: white;
}

.share-room:hover {
  background-color: var(--accent-hover-color);
  transform: scale(1.1);
}

.visual-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background: var(--accent-color);
  color: white;
  padding: 10px;
  border-radius: 50%;
  animation: fadeInOut 1s ease-in-out;
  z-index: 1000;
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
  100% { opacity: 0; transform: scale(0.8); }
}

.mobile-user-btn {
  display: none;
}

.desktop-user-list {
  display: block;
  width: 200px;
}

.mobile-user-list {
  position: fixed;
  top: 0;
  right: 0;
  width: 250px;
  height: 100vh;
  background: var(--bg-color);
  border-left: 1px solid var(--border-color);
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 999;
  overflow-y: auto;
}

.mobile-user-list.show {
  transform: translateX(0);
}

.mobile-user-list .close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  color: var(--text-color);
  font-size: 1.2em;
  cursor: pointer;
  padding: 5px;
}
</style> 
