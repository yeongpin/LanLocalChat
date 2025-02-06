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
let onlineUsers = new Map();
let userSockets = new Map();  // 追踪每個用戶名的最後一個 socket ID

// 存儲最近的消息
const messageHistory = [];
const MAX_HISTORY = 100; // 保存最近100條消息

// Socket.IO 連接處理
io.on('connection', (socket) => {
    console.log('用戶連接');

    // 當新用戶連接時，發送當前在線用戶列表
    socket.emit('userList', Array.from(onlineUsers.values()));

    // 處理歷史消息請求
    socket.on('requestHistory', () => {
        socket.emit('chatHistory', messageHistory);
    });

    // 用戶加入
    socket.on('join', (username) => {
        const oldUsername = onlineUsers.get(socket.id);
        const existingSocketId = userSockets.get(username);
        
        // 如果是同一個用戶的新連接，先清理舊連接
        if (existingSocketId && existingSocketId !== socket.id) {
            // 清理舊的 socket 連接
            onlineUsers.delete(existingSocketId);
        }
        
        // 更新用戶的 socket ID
        userSockets.set(username, socket.id);

        // 如果這個用戶已經在線（使用不同的 socket），不發送加入消息
        if (Array.from(onlineUsers.values()).includes(username)) {
            socket.emit('nameError', '此用戶名已被使用');
            return;
        }

        onlineUsers.set(socket.id, username);
        io.emit('userList', Array.from(onlineUsers.values()));
        
        if (oldUsername) {
            io.emit('message', {
                type: 'system',
                content: `${oldUsername} 改名為 ${username}`,
                highlight: username
            });
        } else {
            io.emit('message', {
                type: 'system',
                content: `${username} 加入了聊天室`,
                highlight: username
            });
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
            type: 'user',
            user: onlineUsers.get(socket.id),
            content: data,
            timestamp: Date.now(),
            mentions: mentions
        };

        // 添加到歷史記錄
        messageHistory.push(messageData);
        if (messageHistory.length > MAX_HISTORY) {
            messageHistory.shift();
        }

        io.emit('message', messageData);

        // 發送提及通知
        if (mentions.length > 0) {
            const mentionedSocketIds = Array.from(onlineUsers.entries())
                .filter(([_, username]) => mentions.includes(username))
                .map(([socketId]) => socketId);

            mentionedSocketIds.forEach(socketId => {
                io.to(socketId).emit('mentioned', {
                    from: onlineUsers.get(socket.id),
                    message: data
                });
            });
        }
    });

    // 處理斷開連接
    socket.on('disconnect', () => {
        const username = onlineUsers.get(socket.id);
        if (username) {
            // 檢查是否是用戶的最後一個連接
            if (userSockets.get(username) === socket.id) {
                userSockets.delete(username);
                onlineUsers.delete(socket.id);
                io.emit('userList', Array.from(onlineUsers.values()));
                io.emit('message', {
                    type: 'system',
                    content: `${username} 離開了聊天室`
                });
            } else {
                // 如果不是最後一個連接，只清理 socket 映射
                onlineUsers.delete(socket.id);
            }
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