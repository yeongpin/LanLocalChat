<template>
  <div class="file-card">
    <div class="file-info">
      <span class="file-name">{{ file.name }}</span>
      <span class="file-size">{{ formatFileSize(file.size) }}</span>
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
      validator: (file) => {
        return file.name && (file.size !== undefined) && (file.path !== undefined || file instanceof File);
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
</style> 