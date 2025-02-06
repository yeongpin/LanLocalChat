<template>
  <div class="user-list">
    <h3 class="user-list-title">{{ t('user.online') }}</h3>
    <div class="users">
      <div v-for="user in users" :key="user" class="user-item">
        <span class="username" :title="user">{{ truncateUsername(user) }}</span>
        {{ user === currentUser ? t('user.you') : '' }}
        <button 
          v-if="user === currentUser"
          class="change-name-btn"
          @click="$emit('show-name-editor')"
          :title="t('user.changeName')"
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
}
.user-list {
  grid-column: 2;
  border: 1px solid var(--border-color);
  padding: 20px 5px;
  background-color: var(--bg-color);
  border-radius: 6px;
  height: calc(95vh - 150px);
  overflow-y: scroll;
}

.user-item {
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.user-item .username {
  text-align: center;
  flex: 1;
}

.user-item .change-name-btn {
  margin-left: auto;
}

h3 {
  color: #4a9eff;
  margin-top: 0;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  padding: 8px;
  margin: 4px 0;
  background-color: var(--input-bg);
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.change-name-btn {
  background: none;
  border: none;
  color: #4a9eff;
  cursor: pointer;
  padding: 4px;
  opacity: 0.7;
  transition: opacity 0.3s;
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
</style> 