<template>
  <div class="user-list">
    <h3>在線用戶</h3>
    <ul>
      <li v-for="user in users" :key="user">
        {{ user }}
        <button v-if="isCurrentUser(user)" class="edit-btn" @click="showNameEditor">
          <i class="fas fa-edit"></i>
        </button>
      </li>
    </ul>
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
    }
  },
  methods: {
    isCurrentUser(user) {
      return user === this.currentUser;
    },
    showNameEditor() {
      this.$emit('show-name-editor');
    }
  }
}
</script>

<style scoped>
.user-list {
  grid-column: 2;
  border: 1px solid var(--border-color);
  padding: 20px;
  background-color: var(--bg-color);
  border-radius: 6px;
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

.edit-btn {
  background: none;
  border: none;
  color: #4a9eff;
  cursor: pointer;
  padding: 4px;
  opacity: 0.7;
  transition: opacity 0.3s;
}

.edit-btn:hover {
  opacity: 1;
}
</style> 