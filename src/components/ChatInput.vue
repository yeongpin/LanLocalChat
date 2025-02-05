<template>
  <div class="input-area">
    <div class="file-cards-container">
      <div class="file-cards" v-if="uploadingFiles.length > 0">
        <file-card
          v-for="(file, index) in uploadingFiles"
          :key="index"
          :file="file"
        >
          <template #action>
            <button class="action-btn" @click="removeFile(index)">
              <i class="fas fa-times"></i>
            </button>
          </template>
        </file-card>
      </div>
    </div>
    <div class="input-controls">
      <input type="file" ref="fileInput" @change="handleFileUpload" style="display: none">
      <button class="attach-btn" @click="handleAttachClick">
        <i class="fas fa-paperclip"></i>
      </button>
      <textarea 
        v-model="message" 
        @keydown.enter.exact.prevent="sendMessage"
        @keydown="handleKeydown"
        @input="adjustHeight"
        placeholder="輸入消息..."
        rows="1"
        ref="messageInput"
      ></textarea>
      <button class="send-btn" @click="sendMessage">
        <i class="fas fa-paper-plane"></i>
      </button>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import FileCard from './FileCard.vue';

export default {
  name: 'ChatInput',
  components: {
    FileCard
  },
  data() {
    return {
      message: '',
      uploadingFiles: []
    }
  },
  mounted() {
    this.$nextTick(() => {
      const textarea = this.$refs.messageInput;
      textarea.style.height = '36px';
      textarea.style.overflowY = 'hidden';
    });
  },
  methods: {
    handleAttachClick() {
      if (this.uploadingFiles.length >= 3) {
        alert('最多只能同時上傳3個文件');
        return;
      }
      this.$refs.fileInput.click();
    },
    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      this.uploadingFiles.push(file);
      this.$refs.fileInput.value = ''; // 重置 input
    },
    removeFile(index) {
      this.uploadingFiles.splice(index, 1);
    },
    async sendMessage() {
      const hasMessage = this.message.trim();
      const hasFiles = this.uploadingFiles.length > 0;
      
      if (!hasMessage && !hasFiles) return;
      
      if (hasMessage) {
        this.$emit('send-message', this.message);
        this.message = '';
      }
      
      if (hasFiles) {
        for (const file of this.uploadingFiles) {
          const formData = new FormData();
          formData.append('file', file);
          try {
            const response = await axios.post('/upload', formData);
            this.$emit('send-message', {
              type: 'file',
              name: file.name,
              size: file.size,
              path: response.data.path
            });
          } catch (error) {
            console.error('File upload failed:', error);
            alert('文件上傳失敗');
          }
        }
        this.uploadingFiles = [];
      }
    },
    formatFileSize(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    handleKeydown(e) {
      if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        const textarea = this.$refs.messageInput;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        this.message = value.substring(0, start) + '\n' + value.substring(end);
        this.$nextTick(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
          this.adjustHeight();
          textarea.scrollTop = textarea.scrollHeight;
        });
      }
    },

    adjustHeight() {
      const textarea = this.$refs.messageInput;
      textarea.style.height = '36px';
      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, 36), 60);
      textarea.style.height = `${newHeight}px`;
      if (scrollHeight > 60) {
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.overflowY = 'hidden';
      }
    },
  }
}
</script>

<style scoped>
.input-area {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  background-color: var(--input-bg);
  border-radius: 6px;
}

.input-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.input-area textarea {
  flex: 1;
  padding: 6px 12px;
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  border-radius: 4px;
  resize: none;
  min-height: 36px;
  overflow-y: hidden;
  line-height: 1.5;
  font-family: inherit;
  font-size: 16px;
  box-sizing: border-box;
}

.input-area button {
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.input-area button:hover {
  background-color: var(--hover-color);
}

.attach-btn {
  padding: 8px 12px;
}

.file-cards {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.file-card {
  flex: 0 0 auto;
  width: 200px;
  padding: 8px 12px;
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-name {
  font-weight: 500;
  color: var(--text-color);
}

.file-size {
  font-size: 0.8em;
  color: var(--text-color);
  opacity: 0.8;
}

.action-btn {
  background: none;
  border: none;
  color: var(--text-color);
  cursor: pointer;
  padding: 4px 8px;
  font-size: 1.1em;
  transition: opacity 0.3s;
}

.action-btn:hover {
  opacity: 0.8;
}

.send-btn {
  padding: 8px 12px;
  background: none;
  border: none;
  color: var(--text-color);
  cursor: pointer;
  transition: opacity 0.3s;
}

.send-btn:hover {
  opacity: 0.8;
}
</style> 