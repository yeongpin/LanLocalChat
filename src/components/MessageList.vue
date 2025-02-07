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
      <div v-if="previewImage" class="image-preview-modal" @click="previewImage = null">
        <img :src="previewImage" class="preview-image" @click.stop>
        <button class="close-preview" @click="previewImage = null">
          <i class="fas fa-times"></i>
        </button>
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
        previewImage: null,
        hasLoadedHistory: false
      }
    },
    computed: {
      showHistoryButton() {
        return !this.hasLoadedHistory;
      }
    },
    emits: ['load-history'],
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
      showImagePreview(src) {
        this.previewImage = src;
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
    height: calc(95vh - 150px); /* 減去頂部間距、底部輸入框和padding */
    overflow-y: scroll;
    background-color: var(--bg-color);
    border-radius: 6px;
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
  
  .preview-image {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
  }
  
  .close-preview {
    position: absolute;
    top: 20px;
    right: 20px;
    background: none;
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    padding: 8px;
    transition: transform 0.2s;
  }
  
  .close-preview:hover {
    transform: scale(1.1);
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
    min-width: 200px;
    max-width: 300px;
    width: 300px;
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
  </style> 