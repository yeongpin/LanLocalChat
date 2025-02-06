<template>
  <div class="login-form">
    <button class="close-btn" @click="$emit('close')">
      <i class="fas fa-times"></i>
    </button>
    <h2>{{ t('login.title') }}</h2>
    <input 
      v-model="inputUsername" 
      @keyup.enter="handleJoin" 
      placeholder="輸入用戶名"
      ref="usernameInput"
      :maxlength="nameLimit"
    >
    <div class="button-group">
      <button class="random-btn" @click="generateRandomName">
        <i class="fas fa-random"></i>
        {{ t('login.random') }}
      </button>
      <button @click="handleJoin">{{ t('login.update') }}</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoginForm',
  props: {
    currentUsername: {
      type: String,
      required: true
    },
    localeData: {
      type: Object,
      required: false,
      default: () => ({
        login: {
          title: '加入聊天室',
          username: '用戶名',
          join: '加入',
          cancel: '取消',
          random: '隨機名字'
        }
      })
    }
  },
  data() {
    return {
      inputUsername: this.currentUsername,
      nameLimit: parseInt(import.meta.env.VITE_NAME_LIMIT || 20)
    }
  },
  mounted() {
    this.$refs.usernameInput.focus();
    this.$refs.usernameInput.select();
  },
  methods: {
    t(path) {
      if (!this.localeData) return path;
      return path.split('.').reduce((acc, part) => acc && acc[part], this.localeData) || path;
    },
    handleJoin() {
      const trimmedUsername = this.inputUsername.trim();
      if (trimmedUsername) {
        this.$emit('join', trimmedUsername);
        this.inputUsername = '';
      }
    },
    generateRandomName() {
      const randomId = Math.random().toString(36).substr(2, 6);
      this.inputUsername = `User-${randomId}`;
    }
  }
}
</script>

<style scoped>
.login-form {
  text-align: center;
  color: var(--text-color);
  position: relative;
}

.close-btn {
  position: absolute;
  top: -10px;
  right: -10px;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.close-btn:hover {
  background-color: var(--hover-color);
}

h2 {
  font-size: 1rem;
  margin: 0 0 10px 0;
}

input, button {
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  padding: 8px 16px;
  border-radius: 4px;
  margin: 0 5px;
}

input {
  width: 150px;
}

button {
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: var(--hover-color);
}

input:focus {
  outline: none;
  border-color: #666;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  justify-content: center;
}

.random-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  min-width: 100px;
  justify-content: center;
}

.random-btn:hover {
  background-color: var(--hover-color);
}
</style> 