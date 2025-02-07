const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",  // 允許所有來源
        methods: ["GET", "POST"],
        credentials: true
    }
});
const multer = require('multer');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const fs = require('fs');
dotenv.config();

// 設置靜態文件目錄
app.use(cors());  // 允許所有跨域請求
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// 確保上傳目錄存在
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置文件上傳
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// 在線用戶列表
let publicUsers = new Map();  // 公共聊天室用戶
let privateUsers = new Map(); // 私人房間用戶
let userSockets = new Map();
let disconnectTimers = new Map();
let messageHistory = [];
let originalUsernames = new Map();
let joinMessages = new Set();  // 追踪已發送的加入消息
let rooms = new Map(); // 存儲房間信息
let roomUsers = new Map(); // 存儲每個房間的用戶
let roomMessages = new Map(); // 存儲每個房間的消息

// 追踪斷開連接的計時器
const RECONNECT_TIMEOUT = 1000;

// 防止重複消息的超時時間
const MESSAGE_DEBOUNCE = 2000;

// 檢查並清理過期的用戶
function cleanupStaleUsers() {
    for (const [socketId, username] of publicUsers.entries()) {
        if (!io.sockets.sockets.has(socketId)) {
            cleanupUser(socketId);
        }
    }
}

// 清理舊的加入消息
function cleanupJoinMessages() {
    const now = Date.now();
    for (const message of joinMessages) {
        const [username, timestamp] = message.split('|');
        if (now - parseInt(timestamp) > MESSAGE_DEBOUNCE) {
            joinMessages.delete(message);
        }
    }
}

// 清理用戶
function cleanupUser(socketId) {
    const username = publicUsers.get(socketId);
    if (username) {
        // 檢查是否有其他相同用戶名的連接
        let hasOtherConnection = false;
        for (const [otherSocketId, otherUsername] of publicUsers.entries()) {
            if (otherSocketId !== socketId && otherUsername === username) {
                hasOtherConnection = true;
                break;
            }
        }

        // 只有在沒有其他連接時才發送離開消息
        if (!hasOtherConnection) {
            io.emit('message', {
                type: 'system',
                content: `${username} 離開了聊天室`,
                highlight: username,
                action: 'leave'
            });
        }

        userSockets.delete(username);
        publicUsers.delete(socketId);
        originalUsernames.delete(socketId);
        return username;
    }
    return null;
}

// 檢查用戶名是否可用
function isUsernameAvailable(username, currentSocketId) {
    for (const [socketId, name] of publicUsers.entries()) {
        if (name === username && socketId !== currentSocketId) {
            return false;
        }
    }
    return true;
}

// 存儲最近的消息
const MAX_HISTORY = 100; // 保存最近100條消息

// 檢查是否是私人房間
function isPrivateRoom(socket) {
  const query = socket.handshake.query;
  return query.chat_id && query.private === '1';
}

// Socket.IO 連接處理
io.on('connection', (socket) => {
    let currentRoom = null;
    const isPrivate = socket.handshake.query.private === '1';
    const roomId = socket.handshake.query.chat_id || 'public';

    // 根據房間類型選擇用戶列表
    const getUserList = () => {
        if (roomId === 'public') {
            return publicUsers;
        }
        return privateUsers;
    };

    if (roomId !== 'public') {
        currentRoom = roomId;
        socket.join(roomId);
    }

    console.log('用戶連接');

    // 清理過期的用戶
    cleanupStaleUsers();
    cleanupJoinMessages();

    // 處理用戶列表請求
    socket.on('requestUserList', () => {
        let users;
        if (currentRoom && currentRoom !== 'public') {
            users = Array.from(roomUsers.get(currentRoom) || []);
        } else {
            users = Array.from(getUserList().values());
        }
        socket.emit('userList', users);
    });

    // 處理歷史消息請求
    socket.on('requestHistory', () => {
        if (currentRoom && currentRoom !== 'public') {
            socket.emit('chatHistory', roomMessages.get(currentRoom) || []);
        } else {
            socket.emit('chatHistory', messageHistory);
        }
    });

    // 用戶加入
    socket.on('join', (username) => {
        if (currentRoom && currentRoom !== 'public') {
            // 初始化房間數據
            if (!roomUsers.has(roomId)) {
                roomUsers.set(roomId, new Set());
                roomMessages.set(roomId, []);
            }
            
            // 添加用戶到房間
            roomUsers.get(roomId).add(username);
            privateUsers.set(socket.id, username);
            
            // 發送房間用戶列表
            io.to(roomId).emit('userList', Array.from(roomUsers.get(roomId)));
            
            // 發送加入消息只給房間內的用戶
            io.to(roomId).emit('message', {
                type: 'system',
                content: `${username} 加入了私人房間`,
                highlight: username,
                action: 'join'
            });
            return;
        }

        // 公共聊天室的原有邏輯
        const oldTimer = disconnectTimers.get(username);
        if (oldTimer) {
            clearTimeout(oldTimer);
            disconnectTimers.delete(username);
        }
        
        const originalUsername = originalUsernames.get(socket.id);
        
        // 避免相同名字的改名消息
        if (originalUsername === username) {
            publicUsers.set(socket.id, username);
            userSockets.set(username, socket.id);
            io.emit('userList', Array.from(getUserList().values()));
            return;
        }
        
        // 只有在用戶名被占用且不是重連的情況下才生成新用戶名
        if (!isUsernameAvailable(username, socket.id)) {
            const newUsername = `User-${Math.random().toString(36).substr(2, 6)}`;
            socket.emit('nameChanged', newUsername);
            username = newUsername;
        }
        
        publicUsers.set(socket.id, username);
        userSockets.set(username, socket.id);
        io.emit('userList', Array.from(getUserList().values()));
        
        if (originalUsername) {
            io.emit('message', {
                type: 'system',
                content: `${originalUsername} 改名為 ${username}`,
                highlight: username,
                action: 'rename'
            });
        } else {
            // 檢查是否已經發送過加入消息
            const messageKey = `${username}|${Date.now()}`;
            if (!Array.from(joinMessages).some(msg => msg.startsWith(`${username}|`))) {
                joinMessages.add(messageKey);
                io.emit('message', {
                    type: 'system',
                    content: `${username} 加入了聊天室`,
                    highlight: username,
                    action: 'join'
                });
                // 設置定時器清理消息記錄
                setTimeout(() => {
                    joinMessages.delete(messageKey);
                }, MESSAGE_DEBOUNCE);
            }
        }
    });

    // 處理消息
    socket.on('message', (data) => {
        // 檢查消息中的提及
        let mentions = [];
        if (typeof data === 'string') {
            const mentionRegex = /@(\S+)/g;
            mentions = [...data.matchAll(mentionRegex)].map(match => match[1]);
        }

        const messageData = {
            user: currentRoom && currentRoom !== 'public' ? 
                Array.from(roomUsers.get(currentRoom)).find(u => u === privateUsers.get(socket.id)) : 
                publicUsers.get(socket.id),
            type: 'user',
            content: data,
            timestamp: Date.now(),
            mentions: mentions
        };

        // 如果是私人房間
        if (currentRoom && currentRoom !== 'public') {
            // 保存消息到房間歷史記錄
            const roomHistory = roomMessages.get(currentRoom) || [];
            roomHistory.push(messageData);
            if (roomHistory.length > MAX_HISTORY) {
                roomHistory.shift();
            }
            roomMessages.set(currentRoom, roomHistory);
            
            // 只發送給房間成員
            io.to(currentRoom).emit('message', messageData);
            
            // 私人房間的提及通知只發送給房間內的用戶
            if (mentions.length > 0) {
                const mentionedSocketIds = Array.from(privateUsers.entries())
                    .filter(([_, username]) => mentions.includes(username))
                    .map(([socketId]) => socketId)
                    .filter(socketId => io.sockets.adapter.rooms.get(currentRoom)?.has(socketId));

                mentionedSocketIds.forEach(socketId => {
                    io.to(socketId).emit('mentioned', {
                        from: privateUsers.get(socket.id),
                        message: data
                    });
                });
            }
            return;
        }

        // 公共聊天室的消息處理
        messageHistory.push(messageData);
        if (messageHistory.length > MAX_HISTORY) {
            messageHistory.shift();
        }
        // 只發送給公共聊天室的用戶
        const publicRoomSockets = Array.from(publicUsers.keys());
        publicRoomSockets.forEach(socketId => {
            io.to(socketId).emit('message', messageData);
        });

        // 發送提及通知（只給公共聊天室的用戶）
        if (mentions.length > 0) {
            const mentionedSocketIds = Array.from(publicUsers.entries())
                .filter(([_, username]) => mentions.includes(username))
                .map(([socketId]) => socketId);

            mentionedSocketIds.forEach(socketId => {
                io.to(socketId).emit('mentioned', {
                    from: publicUsers.get(socket.id),
                    message: data
                });
            });
        }
    });

    // 處理斷開連接
    socket.on('disconnect', () => {
        console.log('用戶斷開連接');
        let username;
        if (currentRoom && currentRoom !== 'public') {
            username = Array.from(roomUsers.get(currentRoom)).find(u => u === privateUsers.get(socket.id));
        } else {
            username = getUserList().get(socket.id);
        }
        
        // 如果是私人房間的用戶
        if (currentRoom && currentRoom !== 'public') {
            const roomUsersList = roomUsers.get(currentRoom);
            if (roomUsersList && username) {
                roomUsersList.delete(username);
                privateUsers.delete(socket.id);
                io.to(currentRoom).emit('userList', Array.from(roomUsersList));
                io.to(currentRoom).emit('message', {
                    type: 'system',
                    content: `${username} 離開了私人房間`,
                    highlight: username,
                    action: 'leave'
                });
            }
            return;
        }

        // 公共聊天室的斷開連接處理
        if (username) {
            const timer = setTimeout(() => {
                if (publicUsers.has(socket.id)) {
                    publicUsers.delete(socket.id);
                    io.emit('userList', Array.from(publicUsers.values()));
                }
                disconnectTimers.delete(username);
                originalUsernames.delete(socket.id);
            }, RECONNECT_TIMEOUT);
            
            disconnectTimers.set(username, timer);
        }
    });
});

// 文件上傳路由
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    res.json({
        filename: req.file.filename,
        path: `/uploads/${req.file.filename}`
    });
});

// 啟動服務器
const PORT = process.env.SERVER_PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
http.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
}); 