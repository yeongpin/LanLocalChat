<template>
  <div class="room-modal">
    <button class="close-btn" @click="$emit('close')">
      <i class="fas fa-times"></i>
    </button>
    <h2>{{ t('room.needPassword') }}</h2>
    <div class="form-group">
      <label for="password">{{ t('room.password') }}</label>
      <input 
        type="password" 
        id="password" 
        v-model="password" 
        :placeholder="t('room.passwordPlaceholder')"
        ref="passwordInput"
        @keyup.enter="joinRoom"
      >
    </div>
    <div class="button-group">
      <button @click="joinRoom" class="primary">{{ t('room.join') }}</button>
      <button @click="$emit('close')" class="secondary">{{ t('login.cancel') }}</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'JoinRoomModal',
  props: {
    localeData: {
      type: Object,
      required: true
    },
    currentRoomId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      roomId: this.currentRoomId,
      password: '',
      needPassword: false
    }
  },
  methods: {
    t(path) {
      return path.split('.').reduce((acc, part) => acc && acc[part], this.localeData) || path;
    },
    async joinRoom() {
      if (!this.password) {
        alert(this.t('room.passwordRequired'));
        return;
      }
      
      // 構建房間URL，保留原有的參數
      const currentUrl = new URL(window.location.href);
      const params = currentUrl.searchParams;
      params.set('pass', this.password);
      
      // 重定向到房間
      window.location.href = `/?${params.toString()}`;
    }
  }
}
</script>

<style scoped>
.room-modal {
  text-align: center;
  color: var(--text-color);
  position: relative;
  padding: 20px;
  background-color: var(--bg-color);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  width: 300px;
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

.form-group {
  margin: 15px 0;
  text-align: left;
}

label {
  display: block;
  margin-bottom: 5px;
}

input {
  width: 95%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--text-color);
}

.button-group {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  gap: 10px;
}

button {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--text-color);
  cursor: pointer;
}

button:hover {
  background: var(--hover-color);
}
</style> 