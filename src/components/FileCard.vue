<template>
  <div class="file-card">
    <div class="file-info">
      <i :class="getFileIcon"></i>
      <span class="file-name">{{ file.name }}</span>
      <span class="file-size">{{ formatFileSize(file.size) }}</span>
    </div>
    <div class="progress-bar" v-if="progress > 0 && progress < 100">
      <div class="progress" :style="{ width: progress + '%' }">
        {{ progress }}%
      </div>
    </div>
    <slot name="action">
      <a :href="file.path" download class="action-btn">
        <i class="fas fa-download"></i>
      </a>
    </slot>
  </div>
</template>

<script>
export default {
  name: 'FileCard',
  props: {
    file: {
      type: Object,
      required: true,
      validator: function(file) {
        return file.name && (file.size !== undefined) && (file.path !== undefined || file instanceof File);
      }
    },
    progress: {
      type: Number,
      default: 0
    }
  },
  computed: {
    getFileIcon() {
      const ext = this.file.name.split('.').pop().toLowerCase();
      switch (ext) {
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
          return 'fas fa-image';
        case 'mp4':
        case 'webm':
        case 'mov':
          return 'fas fa-video';
        case 'mp3':
        case 'wav':
        case 'ogg':
          return 'fas fa-music';
        case 'pdf':
          return 'fas fa-file-pdf';
        case 'doc':
        case 'docx':
          return 'fas fa-file-word';
        case 'xls':
        case 'xlsx':
          return 'fas fa-file-excel';
        case 'zip':
        case 'rar':
        case '7z':
          return 'fas fa-file-archive';
        default:
          return 'fas fa-file';
      }
    }
  },
  methods: {
    formatFileSize(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
  }
}
</script>

<style scoped>
.file-card {
    display: inline-flex;
    justify-content: space-between;
    align-items: center;
    width: 95%;
    padding: 8px;
    background: var(--input-bg);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    position: relative;
    overflow: hidden;
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

.action-btn {
  color: var(--text-color);
  font-size: 1.1em;
  padding: 4px 8px;
  transition: opacity 0.3s;
  margin-left: 12px;
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
}

.action-btn:hover {
  opacity: 0.8;
}

.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 8px;
  background: var(--border-color);
}

.progress {
  height: 100%;
  background: var(--accent-color);
  transition: width 0.3s ease;
  text-align: center;
  font-size: 11px;
  line-height: 8px;
  color: white;
}
</style> 