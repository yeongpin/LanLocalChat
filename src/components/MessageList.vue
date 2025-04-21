<template>
    <div class="chat-messages" ref="messageContainer">
      <div v-if="showHistoryButton" class="load-history">
        <button @click="loadHistory" class="history-btn" :title="t('message.loadHistory')">
          <i class="fas fa-history"></i>
          {{ t('message.loadHistory') }}
        </button>
      </div>
      <div v-for="(msg, index) in messages" :key="index" :class="msg.type">
        <template v-if="msg.type === 'system'">
          <div class="system-message">
            <template v-if="msg.highlight">
              <template v-if="msg.action === 'rename'">
                {{ msg.content }}
              </template>
              <template v-else>
                <span class="highlight">{{ msg.highlight }}</span>
                {{ t(msg.action === 'join' ? 'message.systemJoin' : 'message.systemLeave') }}
              </template>
            </template>
            <template v-else>{{ msg.content }}</template>
          </div>
        </template>
        <template v-else-if="msg.type === 'voice-call'">
          <div class="voice-call-message">
            <div class="voice-call-header">
              <i class="fas fa-phone-alt"></i>
              <span class="voice-call-title">語音通話</span>
              <span class="voice-call-status" :class="{ 'active': msg.content.active }">
                {{ msg.content.active ? '進行中' : '已結束' }}
              </span>
            </div>
            <div class="voice-call-info">
              <div class="voice-call-detail">
                <i class="fas fa-clock"></i>
                <span>{{ formatTime(msg.content.startTime) }}</span>
              </div>
              <div class="voice-call-detail">
                <i class="fas fa-users"></i>
                <span>{{ msg.content.participants.length }} 參與者</span>
              </div>
              <div class="voice-call-detail">
                <i class="fas fa-hourglass-half"></i>
                <span>{{ formatDuration(msg.content.duration) }}</span>
              </div>
            </div>
            <div class="voice-call-actions" v-if="msg.content.active">
              <button v-if="!isInCall(msg.content.callId)" class="join-call-btn" @click="joinCall(msg.content.callId)">
                <i class="fas fa-phone-alt"></i> 加入通話
              </button>
              <button v-else class="leave-call-btn" @click="leaveCall(msg.content.callId)">
                <i class="fas fa-phone-slash"></i> 離開通話
              </button>
              <button v-if="isInCall(msg.content.callId)" class="toggle-mute-btn" :class="{ 'muted': isMuted }" @click="toggleMute()">
                <i :class="isMuted ? 'fas fa-microphone-slash' : 'fas fa-microphone'"></i>
                {{ isMuted ? '取消靜音' : '靜音' }}
              </button>
              <button v-if="msg.user === $root.$data.username" class="end-call-btn" @click="endCall(msg.content.callId)">
                <i class="fas fa-ban"></i> 結束通話
              </button>
            </div>
            <div v-if="isInCall(msg.content.callId)" class="voice-call-participants">
              <div v-for="(participant, index) in msg.content.participants" :key="index" class="voice-call-participant">
                <i class="fas fa-user"></i>
                <span>{{ participant }}</span>
                <i v-if="participant === $root.$data.username" class="fas fa-volume-up"></i>
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="message">
            <div class="message-header">
              <span class="username">{{ msg.user }}</span>
              <span class="timestamp">{{ formatTimestamp(msg.timestamp) }}</span>
            </div>
            <div class="message-content">
              <div class="text">
                <template v-if="typeof msg.content === 'string'">
                  {{ msg.content }}
                </template>
                <media-card
                  v-else-if="msg.type === 'file' && msg.content?.path && (isImage(msg.content.path) || isVideo(msg.content.path))"
                  :file="msg.content"
                  @preview="showImagePreview"
                />
                <sound-card
                  v-else-if="msg.type === 'file' && msg.content?.path && isSound(msg.content.path)"
                  :file="msg.content"
                />
                <file-card
                  v-else-if="msg.type === 'file' && msg.content?.path && !isImage(msg.content.path) && !isVideo(msg.content.path) && !isSound(msg.content.path)"
                  :file="msg.content"
                />
                <template v-else>
                  <div class="unknown-message">Unknown message format</div>
                </template>
              </div>
            </div>
          </div>
        </template>
      </div>
      <!-- 圖片預覽模態框 -->
      <div v-if="imagePreviewVisible" class="image-preview-modal" @click="closeImagePreview">
        <div class="image-preview-container">
          <img :src="previewImageUrl" alt="Preview" class="preview-image">
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import FileCard from './FileCard.vue';
  import MediaCard from './MediaCard.vue';
  import SoundCard from './SoundCard.vue';
  
  export default {
    name: 'MessageList',
    props: {
      messages: {
        type: Array,
        required: true
      },
      localeData: {
        type: Object,
        required: false,
        default: () => ({
          message: {
            loadHistory: '載入歷史消息',
            systemJoin: '加入了聊天室',
            systemLeave: '離開了聊天室',
            download: '下載',
            preview: '預覽'
          }
        })
      }
    },
    components: {
      FileCard,
      MediaCard,
      SoundCard
    },
    data() {
      return {
        imagePreviewVisible: false,
        previewImageUrl: '',
        hasLoadedHistory: false,
        activeCallId: null,
        isMuted: false,
        localStream: null,
        audioContext: null,
        audioSources: {},
        callTimer: null,
        nextTime: null
      }
    },
    computed: {
      showHistoryButton() {
        return !this.hasLoadedHistory;
      }
    },
    emits: ['load-history', 'join-voice-call', 'leave-voice-call', 'end-voice-call', 'mute-voice-call', 'audio-data'],
    methods: {
      t(path) {
        if (!this.localeData) return path;
        return path.split('.').reduce((acc, part) => acc && acc[part], this.localeData) || path;
      },
      loadHistory() {
        this.$emit('load-history');
        this.hasLoadedHistory = true;
      },
      isMediaFile(path) {
        return typeof path === 'string' && path.startsWith('/uploads/');
      },
      isImage(path) {
        return typeof path === 'string' && /\.(jpg|jpeg|png|gif)$/i.test(path);
      },
      isVideo(path) {
        return typeof path === 'string' && /\.(mp4|webm)$/i.test(path);
      },
      isSound(path) {
        return typeof path === 'string' && /\.(mp3|wav|ogg|m4a)$/i.test(path);
      },
      scrollToBottom() {
        const container = this.$refs.messageContainer;
        container.scrollTop = container.scrollHeight;
      },
      formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      },
      showImagePreview(url) {
        this.imagePreviewVisible = true;
        this.previewImageUrl = url;
      },
      closeImagePreview() {
        this.imagePreviewVisible = false;
        this.previewImageUrl = '';
      },
      formatTimestamp(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const time = `${hours}:${minutes}`;
        
        if (isToday) {
          return time;
        }
        
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${time} ${year}/${month}/${day}`;
      },
      formatDuration(seconds) {
        if (!seconds) return '0秒';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        
        let result = '';
        if (hours > 0) result += `${hours}時`;
        if (minutes > 0) result += `${minutes}分`;
        if (remainingSeconds > 0 || (!hours && !minutes)) result += `${remainingSeconds}秒`;
        
        return result;
      },
      isInCall(callId) {
        return this.activeCallId === callId;
      },
      joinCall(callId) {
        console.log('嘗試加入通話:', callId);
        
        // 尋找通話消息
        const callMessage = this.messages.find(m => 
          m.type === 'voice-call' && m.content.callId === callId
        );
        
        if (!callMessage || !callMessage.content.active) {
          console.warn('嘗試加入不存在或已結束的通話');
          return;
        }
        
        // 獲取麥克風權限
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          .then(stream => {
            this.localStream = stream;
            this.activeCallId = callId;
            
            // 初始化音頻處理
            this.setupAudioProcessing(stream);
            
            // 發送加入通話事件
            this.$emit('join-voice-call', {
              callId: callId,
              stream: stream
            });
            
            // 更新通話參與者列表
            if (!callMessage.content.participants.includes(this.$root.$data.username)) {
              callMessage.content.participants.push(this.$root.$data.username);
            }
            
            // 啟動計時器
            this.startCallTimer(callId);
          })
          .catch(err => {
            console.error('無法獲取麥克風權限:', err);
            alert('無法獲取麥克風權限，請確保您的瀏覽器有權限訪問麥克風。');
          });
      },
      leaveCall(callId) {
        console.log('離開通話:', callId);
        
        // 尋找通話消息
        const callMessage = this.messages.find(m => 
          m.type === 'voice-call' && m.content.callId === callId
        );
        
        if (!callMessage) {
          console.warn('嘗試離開不存在的通話');
          return;
        }
        
        // 停止本地流
        if (this.localStream) {
          this.localStream.getTracks().forEach(track => track.stop());
          this.localStream = null;
        }
        
        // 停止音頻處理
        if (this.audioContext) {
          this.audioContext.close().catch(err => console.error('關閉音頻上下文時出錯:', err));
          this.audioContext = null;
        }
        
        // 停止計時器
        this.stopCallTimer();
        
        // 重置狀態
        this.activeCallId = null;
        this.isMuted = false;
        
        // 更新參與者列表
        if (callMessage) {
          const index = callMessage.content.participants.indexOf(this.$root.$data.username);
          if (index !== -1) {
            callMessage.content.participants.splice(index, 1);
          }
        }
        
        // 發送離開通話事件
        this.$emit('leave-voice-call', {
          callId: callId
        });
        
        // 添加系統消息
        this.$root.socket.emit('message', {
          type: 'system',
          content: `${this.$root.$data.username || '未知用戶'} 離開了語音通話`,
          timestamp: Date.now()
        });
      },
      endCall(callId) {
        console.log('結束通話:', callId);
        
        // 尋找通話消息
        const callMessage = this.messages.find(m => 
          m.type === 'voice-call' && m.content.callId === callId
        );
        
        if (!callMessage) {
          console.warn('嘗試結束不存在的通話');
          return;
        }
        
        // 標記通話為已結束
        callMessage.content.active = false;
        
        // 如果自己在通話中，先離開
        if (this.activeCallId === callId) {
          this.leaveCall(callId);
        }
        
        // 停止計時器
        this.stopCallTimer();
        
        // 發送結束通話事件
        this.$emit('end-voice-call', {
          callId: callId
        });
        
        // 添加系統消息
        this.$root.socket.emit('message', {
          type: 'system',
          content: `${this.$root.$data.username || '未知用戶'} 結束了語音通話`,
          timestamp: Date.now()
        });
      },
      toggleMute() {
        if (!this.localStream) return;
        
        this.isMuted = !this.isMuted;
        
        // 靜音/取消靜音所有音軌
        this.localStream.getAudioTracks().forEach(track => {
          track.enabled = !this.isMuted;
        });
        
        // 發送靜音狀態變化事件
        this.$emit('mute-voice-call', {
          callId: this.activeCallId,
          muted: this.isMuted
        });
      },
      setupAudioProcessing(stream) {
        if (this.audioContext) {
          this.audioContext.close().catch(err => console.error('關閉音頻上下文時出錯:', err));
        }
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = this.audioContext.createMediaStreamSource(stream);
        
        // 添加一個增益節點來控制音量
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0.8; // 設置音量為80%
        
        // 添加一個低通濾波器來減少高頻噪音
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 8000; // 設置截止頻率
        
        const processor = this.audioContext.createScriptProcessor(2048, 1, 1); // 增加緩衝區大小
        
        source.connect(processor);
        processor.connect(gainNode);
        gainNode.connect(filter);
        filter.connect(this.audioContext.destination);
        
        // 處理音頻數據
        processor.onaudioprocess = (e) => {
          if (this.activeCallId && !this.isMuted) {
            const inputData = e.inputBuffer.getChannelData(0);
            
            // 創建一個新的 Float32Array 來存儲音頻數據
            const audioData = new Float32Array(inputData.length);
            audioData.set(inputData);
            
            // 對音頻數據進行降噪處理
            for (let i = 0; i < audioData.length; i++) {
              // 限制音頻振幅，減少爆音
              if (audioData[i] > 0.8) audioData[i] = 0.8;
              if (audioData[i] < -0.8) audioData[i] = -0.8;
              
              // 應用簡單的噪音門限，過濾低音量噪音
              if (Math.abs(audioData[i]) < 0.05) audioData[i] = 0;
            }
            
            // 發送音頻數據
            this.$emit('audio-data', {
              callId: this.activeCallId,
              data: Array.from(audioData.slice(0, 256)), // 增加數據量以提高音質
              timestamp: Date.now()
            });
          }
        };
      },
      cleanupAudioProcessing() {
        if (this.audioSources) {
          if (this.audioSources.source) {
            this.audioSources.source.disconnect();
          }
          
          if (this.audioSources.processor) {
            this.audioSources.processor.disconnect();
          }
          
          this.audioSources = {};
        }
        
        if (this.audioContext) {
          this.audioContext.close().catch(err => console.error('關閉音頻上下文時出錯:', err));
          this.audioContext = null;
        }
      },
      handleAudioData(data) {
        if (!this.activeCallId || this.activeCallId !== data.callId || data.user === this.$root.$data.username) {
          return; // 不處理自己的音頻數據或不相關的通話
        }
        
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          this.nextTime = this.audioContext.currentTime;
        }
        
        // 用服務器實際採樣率
        const sampleRate = data.sampleRate || this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, data.data.length, sampleRate);
        buffer.copyToChannel(new Float32Array(data.data), 0);
        
        // 音量和壓限
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 1.0;  // 不要 >1
        
        const compressor = this.audioContext.createDynamicsCompressor();
        compressor.threshold.value = -15;
        compressor.ratio.value = 3;
        
        // 低通濾波微調
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 12000;
        filter.Q.value = 0.7;
        
        // 鏈接並精準排隊
        source.connect(gainNode)
              .connect(compressor)
              .connect(filter)
              .connect(this.audioContext.destination);
        
        source.start(this.nextTime);
        this.nextTime += buffer.duration;
      },
      formatTime(timestamp) {
        const date = new Date(timestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      },
      startCallTimer(callId) {
        // 如果已經有計時器，先停止
        if (this.callTimer) {
          clearInterval(this.callTimer);
        }
        
        // 找到通話消息
        const callMessage = this.messages.find(m => 
          m.type === 'voice-call' && m.content.callId === callId
        );
        
        if (callMessage) {
          // 啟動計時器
          this.callTimer = setInterval(() => {
            callMessage.content.duration += 1;
          }, 1000);
        }
      },
      stopCallTimer() {
        if (this.callTimer) {
          clearInterval(this.callTimer);
          this.callTimer = null;
        }
      }
    },
    updated() {
      this.scrollToBottom();
    },
    watch: {
      messages: {
        handler(newMessages) {
          if (newMessages.length > 0 && !this.hasLoadedHistory) {
            this.hasLoadedHistory = true;
          }
        },
        immediate: true
      }
    }
  }
  </script>
  
  <style scoped>
  .chat-messages {
    grid-column: 1;
    border: 1px solid var(--border-color);
    padding: 20px;
    height: calc(95vh - 220px);
    overflow-y: scroll;
    background-color: var(--bg-color);
    border-radius: 6px;
    max-width: 100%;
  }
  
  /* 美化滾動條 */
  .chat-messages::-webkit-scrollbar {
    width: 6px;
  }
  
  .chat-messages::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .chat-messages::-webkit-scrollbar-thumb {
    background-color: var(--border-color);
    border-radius: 3px;
  }
  
  .chat-messages::-webkit-scrollbar-thumb:hover {
    background-color: var(--hover-color);
  }
  
  .system-message {
    color: #888;
    font-style: italic;
    text-align: center;
    margin: 10px 0;
  }
  
  .message {
    margin: 10px 0;
    padding: 0;
    border-radius: 4px;
  }
  
  .message-header {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 4px;
  }
  
  .username {
    font-weight: bold;
    color: var(--accent-color);
  }
  
  .timestamp {
    font-size: 0.8em;
    color: var(--text-color);
    opacity: 0.7;
  }
  
  .message-content {
    padding: 8px 12px;
    margin: 4px 0;
    border-radius: 8px;
    background-color: var(--message-ai-bg);
  }
  
  .text {
    word-break: break-word;
    line-height: 1.4;
  }
  
  .highlight {
    color: #4caf50;
    font-weight: bold;
  }
  
  .image-preview-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .image-preview-container {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
  }
  
  .preview-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  
  .media-card,
  .file-card {
    display: inline-block;
    background: var(--input-bg);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 8px;
    margin: 4px 0;
  }
  
  .file-card {
    display: inline-flex;
    justify-content: space-between;
    align-items: center;
    width: 95%;
    padding: 8px;
    background: var(--input-bg);
    border: 1px solid var(--border-color);
    border-radius: 4px;
  }
  
  .file-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }
  
  .file-name {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }
  
  .file-size {
    font-size: 0.8em;
    opacity: 0.8;
  }
  
  .download-btn {
    color: var(--text-color);
    font-size: 1.1em;
    padding: 4px 8px;
    transition: opacity 0.3s;
    margin-left: 12px;
    flex-shrink: 0;
  }
  
  .download-btn:hover {
    opacity: 0.8;
  }
  
  .image-info {
    padding: 8px;
    border-top: 1px solid var(--border-color);
  }
  
  .image-info .file-name {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 4px;
  }
  
  .image-info .file-size {
    font-size: 0.8em;
    opacity: 0.8;
  }
  
  .load-history {
    text-align: center;
    padding: 10px;
    margin-bottom: 10px;
    background: var(--input-bg);
    border-radius: 8px;
    border: 1px solid var(--border-color);
  }
  
  .history-btn {
    background: var(--input-bg);
    border: 1px solid var(--border-color);
    color: var(--text-color);
    padding: 8px 16px;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    justify-content: center;
  }
  
  .history-btn:hover {
    background: var(--hover-color);
    transform: scale(1.01);
  }
  
  .history-btn i {
    font-size: 0.9em;
  }
  
  @media (max-width: 768px) {
    .chat-messages {
      padding: 10px;
      height: calc(98vh - 180px);
      width: 100%;
      max-width: 100%;
      margin: 0;
    }
  }
  
  .voice-call-message {
    margin: 10px 0;
    padding: 12px;
    background-color: var(--secondary-bg);
    border-radius: 8px;
    border: 1px solid var(--border-color);
  }
  
  .voice-call-header {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .voice-call-title {
    margin-left: 8px;
    font-weight: bold;
  }
  
  .voice-call-status {
    margin-left: auto;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.8em;
    background-color: #ff3b30;
    color: white;
  }
  
  .voice-call-status.active {
    background-color: #34c759;
  }
  
  .voice-call-info {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 10px;
  }
  
  .voice-call-detail {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9em;
  }
  
  .voice-call-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }
  
  .join-call-btn, .leave-call-btn, .toggle-mute-btn, .end-call-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    font-size: 0.9em;
  }
  
  .join-call-btn {
    background-color: var(--accent-color);
    color: white;
  }
  
  .leave-call-btn {
    background-color: #ff3b30;
    color: white;
  }
  
  .toggle-mute-btn {
    background-color: var(--input-bg);
    color: var(--text-color);
  }
  
  .toggle-mute-btn.muted {
    background-color: var(--secondary-bg);
  }
  
  .end-call-btn {
    background-color: #8B0000;
    color: white;
  }
  
  .voice-call-participants {
    margin-top: 10px;
    padding: 8px;
    background-color: var(--input-bg);
    border-radius: 4px;
  }
  
  .voice-call-participant {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
  }
  </style> 