<template>
  <div class="user-list">
    <h3 class="user-list-title">{{ t('user.online') }}</h3>
    <div class="users">
      <div v-for="user in users" :key="user" class="user-item">
        {{ user }}

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
  methods: {
    t(path) {
      if (!this.localeData) return path;
      return path.split('.').reduce((acc, part) => acc && acc[part], this.localeData) || path;
    }
  }
}
</script>

<style scoped>
.user-list-title {
  padding: 0 10px;
}
.user-list {
  grid-column: 2;
  border: 1px solid var(--border-color);

  padding: 20px 5px;
  background-color: var(--bg-color);
  border-radius: 6px;
}

.user-item{
    padding: 8px 10px;
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
</style> 