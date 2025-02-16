<template>
  <div class="user-list">
    <h3 class="user-list-title">{{ t('user.online') }}</h3>
    <div class="users">
      <div 
        v-for="user in users" 
        :key="user.id"
        class="user-item"
        :class="{ current: user.user === currentUser }"
      >
        <span class="user-info">
          {{ user.user }}
        </span>
        {{ user.user === currentUser ? t('user.you') : '' }}
        <button 
          v-if="user.user === currentUser" 
          @click="$emit('show-name-editor')"
          class="change-name-btn"
        >
          <i class="fas fa-edit"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UserList',
  props: {
    users: {
      type: Array,
      required: true
    },
    currentUser: {
      type: String,
      required: true
    },
    localeData: {
      type: Object,
      required: false,
      default: () => ({
        user: {
          online: '在線用戶',
          you: '(你)',
          changeName: '更改名稱'
        }
      })
    }
  },
  data() {
    return {
      nameLimit: parseInt(import.meta.env.VITE_NAME_LIMIT || 20)
    }
  },
  methods: {
    t(path) {
      if (!this.localeData) return path;
      return path.split('.').reduce((acc, part) => acc && acc[part], this.localeData) || path;
    },
    truncateUsername(username) {
      if (username.length > this.nameLimit) {
        return username.slice(0, this.nameLimit - 3) + '...';
      }
      return username;
    }
  }
}
</script>

<style scoped>
i.fas.fa-edit {
    margin-top: 2px;
}

.user-list-title {
  padding: 0 10px;
  position: sticky;
  top: 0;
  background-color: var(--bg-color);
  z-index: 1;
  padding-bottom: 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-around;
}
.user-list {
  grid-column: 2;
  border: 1px solid var(--border-color);
  padding: 20px 5px;
  background-color: var(--bg-color);
  border-radius: 6px;
  height: calc(95vh - 220px);
  overflow-y: scroll;
}

.user-item {
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  position: relative;
}

.user-item .username {
  text-align: center;
  flex: 1;
}

.user-item .change-name-btn {
  background: none;
  border: none;
  color: #4a9eff;
  cursor: pointer;
  padding: 4px;
  opacity: 0.7;
  transition: opacity 0.3s;
  position: absolute;
  right: 0;
}

.change-name-btn:hover {
  opacity: 1;
}

/* 美化滾動條 */
.user-list::-webkit-scrollbar {
  width: 6px;
}

.user-list::-webkit-scrollbar-track {
  background: transparent;
}

.user-list::-webkit-scrollbar-thumb {
  background-color: var(--border-color);
  border-radius: 3px;
}

.user-list::-webkit-scrollbar-thumb:hover {
  background-color: var(--hover-color);
}

.username {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
  display: inline-block;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 5px;
}

.user-type {
  font-size: 0.8em;
  color: var(--text-secondary);
  opacity: 0.7;
}

@media (max-width: 768px) {
  .user-list {
    grid-column: unset;
    height: calc(100vh - 60px);
    margin-top: 40px;
    border: none;
    padding: 10px;
  }

  .user-list-title {
    text-align: center;
    justify-content: center;
    padding: 15px 0;
    margin-bottom: 15px;
  }

  .user-item {
    padding: 12px 15px;
    margin: 5px 0;
    border-radius: 8px;
    background: var(--input-bg);
  }

  .change-name-btn {
    opacity: 1;
    font-size: 1.1em;
  }
}
</style> 