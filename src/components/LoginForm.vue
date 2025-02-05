<template>
  <div class="login-form">
    <button class="close-btn" @click="$emit('close')">
      <i class="fas fa-times"></i>
    </button>
    <h2>修改用戶名</h2>
    <input 
      v-model="inputUsername" 
      @keyup.enter="handleJoin" 
      placeholder="輸入用戶名"
      ref="usernameInput"
    >
    <button @click="handleJoin">更新</button>
  </div>
</template>

<script>
export default {
  name: 'LoginForm',
  props: {
    currentUsername: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      inputUsername: this.currentUsername
    }
  },
  mounted() {
    this.$refs.usernameInput.focus();
    this.$refs.usernameInput.select();
  },
  methods: {
    handleJoin() {
      const trimmedUsername = this.inputUsername.trim();
      if (trimmedUsername) {
        this.$emit('join', trimmedUsername);
        this.inputUsername = '';
      }
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
</style> 