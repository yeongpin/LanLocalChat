<template>
  <div class="room-modal">
    <button class="close-btn" @click="$emit('close')">
      <i class="fas fa-times"></i>
    </button>
    <div class="modal-content">
      <h2>{{ t('room.create') }}</h2>
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            v-model="usePassword"
          >
          <span>{{ t('room.usePassword') }}</span>
        </label>
      </div>
      <div class="form-group" v-if="usePassword">
        <label>{{ t('room.password') }}</label>
        <input 
          type="password" 
          v-model="password"
          :placeholder="t('room.passwordPlaceholder')"
          ref="passwordInput"
        >
      </div>
      <div class="button-group">
        <button class="create-btn" @click="createRoom">
          <i class="fas fa-plus"></i>
          {{ t('room.create') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { v4 as uuidv4 } from 'uuid';

export default {
  name: 'CreateRoomModal',
  props: {
    localeData: {
      type: Object,
      required: false,
      default: () => ({
        room: {
          create: '創建私人房間',
          usePassword: '使用密碼保護',
          password: '密碼',
          passwordPlaceholder: '輸入房間密碼',
          passwordRequired: '請輸入密碼'
        }
      })
    },
    socket: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      usePassword: false,
      password: ''
    }
  },
  mounted() {
    if (this.usePassword && this.$refs.passwordInput) {
      this.$refs.passwordInput.focus();
    }
  },
  methods: {
    t(path) {
      const defaultValues = {
        'room.create': '創建私人房間',
        'room.usePassword': '使用密碼保護',
        'room.password': '密碼',
        'room.passwordPlaceholder': '輸入房間密碼',
        'room.passwordRequired': '請輸入密碼'
      };
      
      if (!this.localeData) return defaultValues[path] || path;
      const value = path.split('.').reduce((acc, part) => acc && acc[part], this.localeData);
      return value || defaultValues[path] || path;
    },
    createRoom() {
      if (this.usePassword && !this.password.trim()) {
        alert(this.t('room.passwordRequired'));
        return;
      }
      
      const roomId = uuidv4().slice(0, 16);
      // 生成隨機的16進制密碼標識
      const passNeedId = this.usePassword ? 
        Array.from(crypto.getRandomValues(new Uint8Array(8)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('') : 
        'false';
      
      const roomData = {
        roomId,
        password: this.usePassword ? this.password : null,
        passNeedId: passNeedId
      };
      
      // 生成房間URL
      const baseUrl = window.location.origin;
      let url = `${baseUrl}/?chat_id=${roomId}&private=1&pass_need=${passNeedId}&creating=1`;
      if (this.usePassword && this.password) {
        url += `&pass=${this.password}`;
      }
      
      // 使用回調確保房間創建完成後再打開新標籤
      this.socket.emit('createRoom', roomData, () => {
        window.open(url, '_blank');
      });
      
      this.password = '';
      this.usePassword = false;
      this.$emit('close');
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

.modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  width: 100%;
}

h2 {
  margin: 0 0 15px 0;
  font-size: 1.2em;
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
  transition: transform 0.2s;
}

.close-btn:hover {
  transform: scale(1.1);
}

.form-group {
  margin: 15px 0;
  text-align: center;
  width: 100%;
}

.checkbox-group {
  margin: 10px 0;
  display: flex;
  justify-content: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  cursor: pointer;
}

label {
  display: block;
  margin-bottom: 5px;
  text-align: center;
}

input[type="text"],
input[type="password"] {
  width: 95%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--text-color);
  transition: border-color 0.3s;
}

input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.button-group {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  gap: 10px;
  width: 100%;
}

.create-btn {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--text-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
  width: 100%;
  justify-content: center;
}

.create-btn:hover {
  background: var(--hover-color);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style> 