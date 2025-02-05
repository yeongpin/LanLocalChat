<template>
  <div class="media-card" :class="mediaType">
    <!-- 圖片預覽 -->
    <div v-if="isImage" class="media-preview" @click="$emit('preview', file.path)">
      <img :src="file.path" class="media-content">
      <div class="media-actions">
        <a :href="file.path" :download="file.name" class="action-btn">
          <i class="fas fa-download"></i>
        </a>
        <button class="action-btn" @click.stop="$emit('preview', file.path)">
          <i class="fas fa-expand"></i>
        </button>
      </div>
    </div>
    <!-- 視頻預覽 -->
    <div v-else class="media-preview">
      <video controls class="media-content">
        <source :src="file.path" :type="videoType">
      </video>
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
  name: 'MediaCard',
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
    isImage() {
      return /\.(jpg|jpeg|png|gif)$/i.test(this.file.path);
    },
    mediaType() {
      return this.isImage ? 'image-card' : 'video-card';
    },
    videoType() {
      const ext = this.file.path.split('.').pop().toLowerCase();
      return `video/${ext}`;
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
  cursor: pointer;
}

.media-content {
  width: 100%;
  height: 100%;
  object-fit: cover;
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

/* 視頻卡片特定樣式 */
.video-card .media-preview {
  cursor: default;
}

.video-card video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style> 