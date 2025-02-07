class RoomManager {
  constructor() {
    this.currentRoom = null;
    this.socket = null;
  }

  init(socket) {
    this.socket = socket;
  }

  // 創建新房間
  createRoom(roomData) {
    return new Promise((resolve, reject) => {
      this.socket.emit('createRoom', roomData, (response) => {
        if (response.success) {
          this.currentRoom = response.roomId;
          const url = this.generateShareUrl(response.roomId, roomData.password);
          resolve({ roomId: response.roomId, shareUrl: url });
        } else {
          reject(response.error);
        }
      });
    });
  }

  // 加入房間
  joinRoom(roomId, password = null) {
    return new Promise((resolve, reject) => {
      this.socket.emit('joinRoom', { roomId, password }, (response) => {
        if (response.success) {
          this.currentRoom = roomId;
          resolve(response);
        } else {
          reject(response.error);
        }
      });
    });
  }

  // 離開房間
  leaveRoom() {
    if (this.currentRoom) {
      this.socket.emit('leaveRoom', this.currentRoom);
      this.currentRoom = null;
    }
  }

  // 生成分享URL
  generateShareUrl(roomId, password = null) {
    const baseUrl = window.location.origin;
    let url = `${baseUrl}/?chat_id=${roomId}`;
    if (password) {
      url += `&pass=${password}`;
    }
    return url;
  }

  // 從URL獲取房間信息
  static getRoomFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return {
      roomId: params.get('chat_id'),
      password: params.get('pass')
    };
  }
}

export default new RoomManager(); 