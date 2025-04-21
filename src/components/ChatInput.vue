<template>
  <div class="input-area">
    <div class="file-cards-container">
      <div class="file-cards" v-if="uploadingFiles.length > 0">
        <file-card
          v-for="(file, index) in uploadingFiles"
          :key="index"
          :file="file"
          :progress="uploadProgress[file.name] || 0"
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
      <div class="action-buttons">
        <button class="attach-btn" @click="handleAttachClick" :title="t('chat.attach')">
          <i class="fas fa-paperclip"></i>
        </button>
        <button class="voice-call-btn" @click="startVoiceCall" :title="t('chat.voiceCall')">
          <i class="fas fa-phone-alt"></i>
        </button>
        <button class="mention-btn" @click="insertMentionSymbol" :title="t('chat.mention')">
          <i class="fas fa-at"></i>
        </button>
      </div>
      <textarea 
        v-model="message" 
        @keydown.enter.exact.prevent="sendMessage"
        @keydown="handleKeydown"
        @input="onInput"
        :placeholder="t('chat.placeholder')"
        rows="1"
        ref="messageInput"
      ></textarea>
      <button class="send-btn" @click="sendMessage" :title="t('chat.send')">
        <i class="fas fa-paper-plane"></i>
      </button>
    </div>
    <div v-if="showMentions" class="mention-list" :style="mentionListStyle">
      <div 
        v-for="user in filteredUsers" 
        :key="user.id"
        class="mention-item"
        @click="selectMention(user)"
      >
        {{ user.user }}
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import FileCard from './FileCard.vue';
import { t } from '../utils/i18n';
import CryptoJS from 'crypto-js';
import { ref, reactive } from 'vue';

export default {
  name: 'ChatInput',
  components: {
    FileCard
  },
  props: {
    users: {
      type: Array,
      required: true
    },
    localeData: {
      type: Object,
      required: false,
      default: () => ({
        chat: {
          placeholder: '輸入消息...',
          send: '發送',
          attach: '附加文件',
          mention: '提及用戶',
          fileLimit: '最多只能同時上傳3個文件',
          uploadFailed: '文件上傳失敗',
          fileTooLarge: '文件大小超過限制，最大為 {size}MB'
        }
      })
    }
  },
  data() {
    return {
      message: '',
      uploadingFiles: [],
      showMentions: false,
      mentionFilter: '',
      mentionPosition: { top: 0, left: 0 },
      currentMentionStart: -1,
      salt: import.meta.env.VITE_MESSAGE_SALT
    }
  },
  setup() {
    const uploadProgress = reactive({});
    return {
      uploadProgress
    }
  },
  computed: {
    filteredUsers() {
      if (!this.mentionFilter) return this.users;
      return this.users.filter(user => 
        user.toLowerCase().includes(this.mentionFilter.toLowerCase())
      );
    },
    mentionListStyle() {
      return {
        top: `${this.mentionPosition.top}px`,
        left: `${this.mentionPosition.left}px`
      }
    }
  },
  created() {
    //console.log('ChatInput created with salt:', this.salt);
    if (!this.salt) {
      console.error('Warning: VITE_MESSAGE_SALT is not set');
    }
  },
  mounted() {
    this.$nextTick(() => {
      const textarea = this.$refs.messageInput;
      textarea.style.height = '36px';
      textarea.style.overflowY = 'hidden';
      
      // add paste event listener
      textarea.addEventListener('paste', this.handlePaste);
    });
  },
  methods: {
    t(path, params = {}) {
      try {
        const value = path.split('.').reduce((acc, part) => acc && acc[part], this.localeData);
        if (!value) return path;
        
        // 替換參數
        return value.replace(/\{(\w+)\}/g, (match, key) => {
          return params[key] !== undefined ? params[key] : match;
        });
      } catch (error) {
        console.warn(`Translation not found for: ${path}`);
        return path;
      }
    },
    handleAttachClick() {
      if (this.uploadingFiles.length >= 3) {
        alert(this.t('chat.fileLimit'));
        return;
      }
      this.$refs.fileInput.click();
    },
    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      // 檢查文件大小
      const maxSize = (parseInt(import.meta.env.MAX_FILE_SIZE) || 500) * 1024 * 1024; // MB to bytes
      if (file.size > maxSize) {
        const maxSizeMB = parseInt(import.meta.env.MAX_FILE_SIZE) || 500;
        alert(this.t('chat.fileTooLarge', { size: maxSizeMB }));
        this.$refs.fileInput.value = '';
        return;
      }
      
      if (this.uploadingFiles.length >= 3) {
        alert(this.t('chat.fileLimit'));
        return;
      }
      
      // 添加到待上傳文件列表
      this.uploadingFiles.push(file);
      this.uploadProgress[file.name] = 0;
      
      // 清空文件輸入
      this.$refs.fileInput.value = '';
    },
    removeFile(index) {
      this.uploadingFiles.splice(index, 1);
    },
    encryptMessage(message) {
      try {
        // 如果是文件類型，不加密
        if (typeof message === 'object' && message.type === 'file') {
          return message;
        }
        
        // 加密文本消息
        const encrypted = CryptoJS.AES.encrypt(message, this.salt);
        const base64 = encrypted.toString();
        return base64;
      } catch (error) {
        console.error('Encryption error:', error);
        return message;
      }
    },
    async sendMessage() {
      const hasMessage = this.message.trim();
      const hasFiles = this.uploadingFiles.length > 0;
      
      if (!hasMessage && !hasFiles) return;
      
      if (hasMessage) {
        // 加密消息內容
        console.log('發送前的原始消息:', this.message.trim());
        //console.log('使用的 salt 值:', this.salt);
        const encrypted = CryptoJS.AES.encrypt(this.message.trim(), this.salt);
        const encryptedContent = encrypted.toString();
        console.log('加密後:', encryptedContent);
        
        this.$emit('send-message', {
          type: 'text',
          content: encryptedContent,
          timestamp: Date.now(),
          mentions: [],
          user: ''
        });
        this.message = '';
      }
      
      if (hasFiles) {
        for (const file of this.uploadingFiles) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('totalSize', file.size.toString());
          
          try {
            const response = await new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open('POST', '/upload');

              xhr.onload = () => {
                try {
                  // 分割響應並過濾空行
                  const responses = xhr.responseText.split('\n').filter(line => line.trim());
                  // 獲取最後一個有效的 JSON 響應
                  const lastResponse = responses[responses.length - 1];
                  resolve(JSON.parse(lastResponse));
                } catch (e) {
                  console.error('Parse error:', e);
                  console.log('Response text:', xhr.responseText);
                  reject(e);
                }
              };

              xhr.onerror = () => reject(new Error('Upload failed'));

              xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                  const percentCompleted = Math.round((e.loaded * 100) / e.total);
                  this.uploadProgress[file.name] = percentCompleted;
                }
              };

              xhr.onreadystatechange = () => {
                if (xhr.readyState === 3) {  // 接收到部分響應
                  try {
                    // 分割響應並過濾空行
                    const responses = xhr.responseText.split('\n').filter(line => line.trim());
                    // 處理每個進度更新
                    responses.forEach(response => {
                      if (!response.trim()) return;
                      const data = JSON.parse(response);
                      if (data.progress) {
                        this.uploadProgress[file.name] = data.progress;
                      }
                    });
                  } catch (e) {
                    // 忽略部分響應的解析錯誤
                  }
                }
              };

              xhr.send(formData);
            });

            this.$emit('send-message', {
              type: 'file',
              content: {
                type: 'file',
                name: file.name,
                size: file.size,
                path: response.path
              },
              timestamp: Date.now(),
              mentions: [],
              user: ''
            });
            
            // 上傳完成後清除進度
            delete this.uploadProgress[file.name];
          } catch (error) {
            console.error('File upload failed:', error);
            alert(this.t('chat.uploadFailed'));
            // 上傳失敗也清除進度
            delete this.uploadProgress[file.name];
          }
        }
        // 清空上傳文件列表
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
    insertMentionSymbol() {
      const textarea = this.$refs.messageInput;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      this.message = this.message.slice(0, start) + '@' + this.message.slice(end);
      this.currentMentionStart = start;
      
      this.$nextTick(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + 1;
        this.showMentionList(true);
      });
    },
    showMentionList(force = false) {
      if (!this.users || this.users.length === 0) return;
      if (!force && !this.mentionFilter && this.users.length > 10) return;

      const textarea = this.$refs.messageInput;
      const pos = textarea.getBoundingClientRect();
      
      // 計算文本框的行高
      const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
      
      // 獲取光標位置
      const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart);
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines.length;
      
      // 計算垂直位置
      const verticalOffset = (currentLine - 1) * lineHeight;
      
      // 計算選單的預計高度（每個項目 36px + padding 和 border）
      const estimatedHeight = Math.min(this.filteredUsers.length * 36 + 16, 200);
      
      this.mentionPosition = {
        top: pos.top - estimatedHeight + 8, // 顯示在輸入框上方
        left: pos.left
      };
      
      this.showMentions = true;
      this.mentionFilter = '';
    },
    onInput(event) {
      this.adjustHeight();
      
      const text = event.target.value;
      const pos = event.target.selectionStart;
      
      if (text[pos - 1] === '@' && (pos === 1 || text[pos - 2] === ' ' || text[pos - 2] === '\n')) {
        this.currentMentionStart = pos - 1;
        this.showMentionList(true);
      } else if (this.currentMentionStart >= 0) {
        const mentionText = text.slice(this.currentMentionStart + 1, pos);
        if (mentionText.includes(' ') || mentionText.includes('\n')) {
          this.showMentions = false;
          this.currentMentionStart = -1;
        } else {
          this.mentionFilter = mentionText;
          this.showMentions = true;
          this.showMentionList();
        }
      }
    },
    selectMention(user) {
      // 檢查 user 是否是對象
      const username = typeof user === 'object' ? user.user : user;
      const before = this.message.slice(0, this.currentMentionStart);
      const after = this.message.slice(this.currentMentionStart + 1 + (this.mentionFilter?.length || 0));
      this.message = before + '@' + username + ' ' + after;
      
      this.showMentions = false;
      this.currentMentionStart = -1;
      this.$refs.messageInput.focus();
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
    async handlePaste(event) {
      const items = (event.clipboardData || window.clipboardData).items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            // check file size
            const maxSize = (parseInt(import.meta.env.MAX_FILE_SIZE) || 500) * 1024 * 1024; // MB to bytes
            if (file.size > maxSize) {
              const maxSizeMB = parseInt(import.meta.env.MAX_FILE_SIZE) || 500;
              alert(this.t('chat.fileTooLarge', { size: maxSizeMB }));
              return;
            }

            let uniqueFileName;
            // Check if the file name is a default name
            if (file.name.startsWith('image') && file.name.endsWith('.png')) {
              // Generate unique filename for default names
              const timestamp = new Date().getTime();
              const randomStr = Math.random().toString(36).substring(2, 8);
              const fileExtension = file.name.split('.').pop();
              uniqueFileName = `pasted_${timestamp}_${randomStr}.${fileExtension}`;
            } else {
              // Use the original file name
              uniqueFileName = file.name;
            }

            // Create new File object with the determined name
            const uniqueFile = new File([file], uniqueFileName, {
              type: file.type,
              lastModified: file.lastModified,
            });

            // add to uploading files list
            this.uploadingFiles.push(uniqueFile);
            this.uploadProgress[uniqueFile.name] = 0;
          }
        }
      }
    },
    startVoiceCall() {
      // 生成唯一的通話ID
      const callId = 'call-' + Math.random().toString(36).substring(2, 15);
      
      // 創建通話消息
      const callMessage = {
        type: 'voice-call',
        content: {
          callId: callId,
          startTime: Date.now(),
          participants: [this.$root.$data.username || '未知用戶'],
          duration: 0,
          active: true,
          creator: this.$root.$data.username || '未知用戶'
        },
        user: this.$root.$data.username || '未知用戶',
        timestamp: Date.now()
      };
      
      // 使用 socket 發送通話消息，確保所有用戶都能收到
      this.$root.socket.emit('message', callMessage);
      
      // 添加系統消息
      const systemMessage = {
        type: 'system',
        content: `${this.$root.$data.username || '未知用戶'} 創建了語音通話`,
        timestamp: Date.now()
      };
      this.$root.socket.emit('message', systemMessage);
      
      // 自動加入通話
      setTimeout(() => {
        // 獲取麥克風權限並加入通話
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          .then(stream => {
            // 創建音頻上下文
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            
            // 創建音頻處理節點
            const processor = audioContext.createScriptProcessor(1024, 1, 1);
            
            // 連接節點
            source.connect(processor);
            processor.connect(audioContext.destination);
            
            // 處理音頻數據
            processor.onaudioprocess = (e) => {
              // 這裡可以處理音頻數據，例如發送到服務器
              const inputData = e.inputBuffer.getChannelData(0);
              
              // 創建一個新的 Float32Array 來存儲音頻數據
              const audioData = new Float32Array(inputData.length);
              audioData.set(inputData);
              
              // 這裡可以添加發送音頻數據的代碼
              // 例如使用 WebSocket 發送
            };
            
            // 添加系統消息
            const joinMessage = {
              type: 'system',
              content: `${this.$root.$data.username || '未知用戶'} 加入了語音通話`,
              timestamp: Date.now()
            };
            this.$root.socket.emit('message', joinMessage);
            
            // 發送加入通話事件
            this.$emit('join-voice-call', {
              callId: callId,
              stream: stream
            });
            
            // 通知 MessageList 組件設置活動通話 ID
            const messageList = this.$parent.$refs.messageList;
            if (messageList) {
              messageList.activeCallId = callId;
              messageList.localStream = stream;
              messageList.setupAudioProcessing(stream);
            }
          })
          .catch(err => {
            console.error('無法獲取麥克風權限:', err);
            alert('無法獲取麥克風權限，請確保您的瀏覽器有權限訪問麥克風。');
          });
      }, 500);
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
    insertMentionSymbol() {
      const textarea = this.$refs.messageInput;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      this.message = this.message.slice(0, start) + '@' + this.message.slice(end);
      this.currentMentionStart = start;
      
      this.$nextTick(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + 1;
        this.showMentionList(true);
      });
    },
    showMentionList(force = false) {
      if (!this.users || this.users.length === 0) return;
      if (!force && !this.mentionFilter && this.users.length > 10) return;

      const textarea = this.$refs.messageInput;
      const pos = textarea.getBoundingClientRect();
      
      // 計算文本框的行高
      const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
      
      // 獲取光標位置
      const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart);
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines.length;
      
      // 計算垂直位置
      const verticalOffset = (currentLine - 1) * lineHeight;
      
      // 計算選單的預計高度（每個項目 36px + padding 和 border）
      const estimatedHeight = Math.min(this.filteredUsers.length * 36 + 16, 200);
      
      this.mentionPosition = {
        top: pos.top - estimatedHeight + 8, // 顯示在輸入框上方
        left: pos.left
      };
      
      this.showMentions = true;
      this.mentionFilter = '';
    },
    onInput(event) {
      this.adjustHeight();
      
      const text = event.target.value;
      const pos = event.target.selectionStart;
      
      if (text[pos - 1] === '@' && (pos === 1 || text[pos - 2] === ' ' || text[pos - 2] === '\n')) {
        this.currentMentionStart = pos - 1;
        this.showMentionList(true);
      } else if (this.currentMentionStart >= 0) {
        const mentionText = text.slice(this.currentMentionStart + 1, pos);
        if (mentionText.includes(' ') || mentionText.includes('\n')) {
          this.showMentions = false;
          this.currentMentionStart = -1;
        } else {
          this.mentionFilter = mentionText;
          this.showMentions = true;
          this.showMentionList();
        }
      }
    },
    selectMention(user) {
      // 檢查 user 是否是對象
      const username = typeof user === 'object' ? user.user : user;
      const before = this.message.slice(0, this.currentMentionStart);
      const after = this.message.slice(this.currentMentionStart + 1 + (this.mentionFilter?.length || 0));
      this.message = before + '@' + username + ' ' + after;
      
      this.showMentions = false;
      this.currentMentionStart = -1;
      this.$refs.messageInput.focus();
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
    async handlePaste(event) {
      const items = (event.clipboardData || window.clipboardData).items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            // check file size
            const maxSize = (parseInt(import.meta.env.MAX_FILE_SIZE) || 500) * 1024 * 1024; // MB to bytes
            if (file.size > maxSize) {
              const maxSizeMB = parseInt(import.meta.env.MAX_FILE_SIZE) || 500;
              alert(this.t('chat.fileTooLarge', { size: maxSizeMB }));
              return;
            }

            let uniqueFileName;
            // Check if the file name is a default name
            if (file.name.startsWith('image') && file.name.endsWith('.png')) {
              // Generate unique filename for default names
              const timestamp = new Date().getTime();
              const randomStr = Math.random().toString(36).substring(2, 8);
              const fileExtension = file.name.split('.').pop();
              uniqueFileName = `pasted_${timestamp}_${randomStr}.${fileExtension}`;
            } else {
              // Use the original file name
              uniqueFileName = file.name;
            }

            // Create new File object with the determined name
            const uniqueFile = new File([file], uniqueFileName, {
              type: file.type,
              lastModified: file.lastModified,
            });

            // add to uploading files list
            this.uploadingFiles.push(uniqueFile);
            this.uploadProgress[uniqueFile.name] = 0;
          }
        }
      }
    }
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

.input-area button:active {
  background-color: var(--active-color);
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

.action-buttons {
  display: flex;
  gap: 8px;
}

.mention-btn {
  padding: 8px 12px;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.mention-btn:hover {
  background-color: var(--hover-color);
}

.mention-list {
  position: fixed;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: 150px;
  backdrop-filter: blur(10px);
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mention-item {
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  box-sizing: border-box;
}

.mention-item::before {
  content: '@';
  opacity: 0.5;
}

.mention-item:hover {
  background-color: var(--hover-color);
}

.mention-item:not(:last-child) {
  border-bottom: 1px solid var(--border-color);
}

/* 添加滾動條樣式 */
.mention-list::-webkit-scrollbar {
  width: 6px;
}

.mention-list::-webkit-scrollbar-track {
  background: transparent;
}

.mention-list::-webkit-scrollbar-thumb {
  background-color: var(--border-color);
  border-radius: 3px;
}

.mention-list::-webkit-scrollbar-thumb:hover {
  background-color: var(--hover-color);
}

.voice-call-btn {
  padding: 8px 12px;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  color: var(--accent-color);
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.voice-call-btn:hover {
  background-color: var(--hover-color);
}
</style> 