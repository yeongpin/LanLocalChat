<template>
  <div class="media-card sound-card">
    <!-- 音頻預覽 -->
    <div class="media-preview">
      <div class="audio-container">
        <i class="fas fa-music audio-icon"></i>
        <audio controls class="audio-player">
          <source :src="file.path" :type="audioType">
          Your browser does not support the audio element.
        </audio>
      </div>
      <div class="media-actions">
        <a :href="file.path" :download="file.name" class="action-btn">
          <i class="fas fa-download"></i>
        </a>
      </div>
    </div>
    <!-- 文件信息 -->
    <div class="media-info">
      <span class="file-name">{{ file.name }}</span>
      <span class="file-size">{{ formatFileSize(file.size) }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SoundCard',
  props: {
    file: {
      type: Object,
      required: true,
      validator: (file) => {
        return file.name && file.size && file.path;
      }
    }
  },
  computed: {
    audioType() {
      const ext = this.file.path.split('.').pop().toLowerCase();
      return `audio/${ext}`;
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
.media-card {
  display: inline-block;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--input-bg);
  width: 200px;
}

.media-preview {
  position: relative;
  width: 200px;
  height: 100px;
  background: var(--bg-color);
}

.audio-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
}

.audio-icon {
  font-size: 24px;
  color: var(--accent-color);
}

.audio-player {
  width: 100%;
  height: 32px;
  border-radius: 16px;
  outline: none;
}

.media-actions {
  position: absolute;
  top: 0;
  right: 0;
  padding: 8px;
  display: flex;
  gap: 8px;
  background: linear-gradient(to bottom, rgba(0,0,0,0.5), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}

.media-preview:hover .media-actions {
  opacity: 1;
}

.action-btn {
  color: white;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  font-size: 1.1em;
  transition: transform 0.2s;
}

.action-btn:hover {
  transform: scale(1.1);
}

.media-info {
  padding: 8px;
  border-top: 1px solid var(--border-color);
}

.file-name {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
  font-weight: 500;
}

.file-size {
  font-size: 0.8em;
  opacity: 0.8;
}
</style> 