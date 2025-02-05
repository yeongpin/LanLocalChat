<template>
  <div class="chat-messages" ref="messageContainer">
    <div v-for="(msg, index) in messages" :key="index" :class="msg.type">
      <template v-if="msg.type === 'system'">
        <div class="system-message">
          <template v-if="msg.highlight">
            {{ msg.content.split(msg.highlight)[0] }}
            <span class="highlight">{{ msg.highlight }}</span>
            {{ msg.content.split(msg.highlight)[1] }}
          </template>
          <template v-else>{{ msg.content }}</template>
        </div>
      </template>
      <template v-else>
        <div class="message">
          <div class="message-header">{{ msg.user }}</div>
          <div class="message-content">
            <template v-if="typeof msg.content === 'string'">
              {{ msg.content }}
            </template>
            <media-card
              v-else-if="msg.content.type === 'file' && (isImage(msg.content.path) || isVideo(msg.content.path))"
              :file="msg.content"
              @preview="showImagePreview"
            />
            <file-card
              v-else-if="msg.content.type === 'file' && !isImage(msg.content.path) && !isVideo(msg.content.path)"
              :file="msg.content"
            />
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

export default {
  name: 'MessageList',
  props: {
    messages: {
      type: Array,
      required: true
    }
  },
  components: {
    FileCard,
    MediaCard
  },
  data() {
    return {
      previewImage: null
    }
  },
  methods: {
    isMediaFile(path) {
      return typeof path === 'string' && path.startsWith('/uploads/');
    },
    isImage(path) {
      return typeof path === 'string' && /\.(jpg|jpeg|png|gif)$/i.test(path);
    },
    isVideo(path) {
      return typeof path === 'string' && /\.(mp4|webm)$/i.test(path);
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
    }
  },
  updated() {
    this.scrollToBottom();
  }
}
</script>

<style scoped>
.chat-messages {
  grid-column: 1;
  border: 1px solid var(--border-color);
  padding: 20px;
  overflow-y: auto;
  background-color: var(--bg-color);
  border-radius: 6px;
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
  color: #4a9eff;
  font-weight: bold;
  margin-bottom: 4px;
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
</style> 