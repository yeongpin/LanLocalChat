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
const { promisify } = require('util');
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const readdir = promisify(fs.readdir);
const os = require('os');
const net = require('net');
const CryptoJS = require('crypto-js');
const busboy = require('busboy');
dotenv.config();

// 存儲最近的消息
const MAX_HISTORY = 100; // 保存最近100條消息
let messageHistory = [];

// 在線用戶列表
let publicUsers = new Map();  // 格式: socketId -> { id: number, user: string, type: 'public', chat_id: 'public' }
let privateUsers = new Map(); // 格式: socketId -> { id: number, user: string, type: 'private', chat_id: string }
let userIdCounter = 0;  // 用戶 ID 計數器
let userSockets = new Map();
let disconnectTimers = new Map();
let originalUsernames = new Map();
let joinMessages = new Set();  // 追踪已發送的加入消息
let rooms = new Map(); // 存儲房間信息
let roomUsers = new Map(); // 存儲每個房間的用戶
let roomMessages = new Map(); // 存儲每個房間的消息
let roomPasswords = new Map(); // 存儲房間密碼
let roomPassNeedIds = new Map(); // 存儲房間密碼需求標識

const salt = process.env.VITE_MESSAGE_SALT || 'mysecretkey123';
console.log('Server starting with salt:', salt);

// 獲取系統臨時目錄
function getUploadsDir() {
  // 在開發環境使用本地目錄
  if (process.pkg === undefined) {
    const serverDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(serverDir)) {
      fs.mkdirSync(serverDir, { recursive: true });
    }
    return serverDir;
  }
  
  // 在打包環境使用系統臨時目錄
  const tempDir = path.join(os.tmpdir(), 'lanchat-uploads');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
}

// 獲取上傳目錄
const uploadDir = getUploadsDir();

// 設置靜態文件目錄和跨域
app.use(cors());  // 允許所有跨域請求
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
} else {
  app.use(express.static('public'));
}
app.use('/uploads', express.static(uploadDir));

// 解析時間字符串，如 "7d", "24h", "30m", "60s"
function parseTimeString(timeStr) {
    const regex = /^(\d+)([dhms])$/;
    const matches = timeStr.match(regex);
    if (!matches) return 0;

    const value = parseInt(matches[1]);
    const unit = matches[2];
    
    switch (unit) {
        case 'd': return value * 24 * 60 * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'm': return value * 60 * 1000;
        case 's': return value * 1000;
        default: return 0;
    }
}

// 清理過期的文件和消息
async function cleanup() {
    const now = Date.now();
    const historyRetention = parseTimeString(process.env.HISTORY_RETENTION || '7d');
    const uploadsRetention = parseTimeString(process.env.UPLOADS_RETENTION || '1d');

    try {
        // 清理歷史消息
        messageHistory = messageHistory.filter(msg => {
            return (now - msg.timestamp) < historyRetention;
        });

        // 清理上傳文件
        const uploadsDir = uploadDir;
        const files = await readdir(uploadsDir);

        for (const file of files) {
            const filePath = path.join(uploadsDir, file);
            try {
                const stats = await stat(filePath);
                const fileAge = now - stats.mtime.getTime();

                if (fileAge > uploadsRetention) {
                    await unlink(filePath);
                    console.log(`Deleted expired file: ${file}`);
                }
            } catch (err) {
                console.error(`Error processing file ${file}:`, err);
            }
        }
    } catch (err) {
        console.error('Cleanup error:', err);
    }
}

// 設置定期清理
const cleanupInterval = parseTimeString(process.env.CLEANUP_INTERVAL || '1h');
if (cleanupInterval > 0) {
    setInterval(cleanup, cleanupInterval);
    // 啟動時執行一次清理
    cleanup();
}

// 檢查房間API
app.get('/api/checkRoom', (req, res) => {
    const { roomId } = req.query;
    const room = rooms.get(roomId);
    const passNeedId = roomPassNeedIds.get(roomId);
    
    res.json({
        exists: !!room,
        needPassword: !!passNeedId && passNeedId !== 'false'
    });
});

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
    limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE) || 500) * 1024 * 1024 } // MB limit
});

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
    const password = socket.handshake.query.pass;
    const passNeed = socket.handshake.query.pass_need;
    const creating = socket.handshake.query.creating;

    // 發送未過期的歷史消息
    const now = Date.now();
    const historyRetention = parseTimeString(process.env.HISTORY_RETENTION || '7d');
    const validHistory = messageHistory.filter(msg => 
        (now - msg.timestamp) < historyRetention
    );
    socket.emit('history', validHistory);

    // 將用戶添加到對應的房間
    const addUserToRoom = (username) => {
        // 先檢查用戶是否已存在於任何房間
        const existingPublicUser = Array.from(publicUsers.values())
            .find(u => u.user === username);
        const existingPrivateUser = Array.from(privateUsers.values())
            .find(u => u.user === username);
        
        // 如果用戶已存在，先移除
        if (existingPublicUser) {
            const socketId = Array.from(publicUsers.entries())
                .find(([_, u]) => u.user === username)[0];
            publicUsers.delete(socketId);
        }
        if (existingPrivateUser) {
            const socketId = Array.from(privateUsers.entries())
                .find(([_, u]) => u.user === username)[0];
            privateUsers.delete(socketId);
        }

        if (currentRoom && currentRoom !== 'public') {
            const roomUsersList = roomUsers.get(currentRoom);
            if (roomUsersList) {
                roomUsersList.add(username);
                privateUsers.set(socket.id, {
                    id: ++userIdCounter,
                    user: username,
                    type: 'private',
                    chat_id: currentRoom
                });
                // 只發送給當前房間的用戶
                const roomUsers = Array.from(privateUsers.values())
                    .filter(u => u.chat_id === currentRoom);
                socket.emit('userList', roomUsers);
                io.to(currentRoom).emit('userList', roomUsers);
            }
        } else {
            publicUsers.set(socket.id, {
                id: ++userIdCounter,
                user: username,
                type: 'public',
                chat_id: 'public'
            });
            // 只發送給公共聊天室的用戶
            const publicRoomSockets = Array.from(publicUsers.keys());
            const publicUsersList = Array.from(publicUsers.values())
                .filter((user, index, self) => 
                    index === self.findIndex(u => u.user === user.user)
                );
            publicRoomSockets.forEach(socketId => {
                io.to(socketId).emit('userList', publicUsersList);
            });
        }
    };

    console.log('新連接:', {
        roomId,
        isPrivate,
        hasPassword: !!password,
        passNeed,
        creating,
        currentRoom
    });

    if (roomId !== 'public') {
        console.log('房間信息:', {
            room: rooms.get(roomId),
            storedPassword: roomPasswords.get(roomId),
            storedPassNeedId: roomPassNeedIds.get(roomId)
        });

        // 初始化房間用戶列表
        if (!roomUsers.has(roomId)) {
            roomUsers.set(roomId, new Set());
        }
        
        // 檢查房間和密碼
        const room = rooms.get(roomId);
        const storedPassword = roomPasswords.get(roomId);
        const storedPassNeedId = roomPassNeedIds.get(roomId);
        const creating = socket.handshake.query.creating === '1';
        
        // 如果是創建新房間
        if (creating === '1') {
            currentRoom = roomId;
            socket.join(roomId);
            return;
        }
        
        // 如果是加入現有房間
        // 先檢查房間是否存在
        if (!room) {
            socket.emit('error', {
                type: 'auth',
                message: 'room_not_found'  // 特殊標記，表示房間不存在
            });
            return;
        }
        
        // 檢查是否需要密碼
        if (storedPassNeedId && storedPassNeedId !== 'false') {
            // 如果沒有提供密碼，直接要求輸入密碼
            if (!password) {
                socket.emit('error', {
                    type: 'auth',
                    message: 'need_password'  // 特殊標記，表示需要密碼
                });
                return;
            }
            
            // 如果提供了密碼但密碼錯誤
            if (password !== storedPassword) {
                socket.emit('error', {
                    type: 'auth',
                    message: 'wrong_password'  // 特殊標記，表示密碼錯誤
                });
                return;
            }
        }
        
        // 通過所有驗證，加入房間
        currentRoom = roomId;
        socket.join(roomId);
    } else {
        // 加入公共聊天室
        currentRoom = 'public';
        socket.join('public');
        socket.emit('requestUserList');
    }

    // 發送連接確認
    socket.emit('connectionConfirmed', {
        room: currentRoom,
        isPrivate: isPrivate === '1'
    });

    console.log('用戶連接');

    // 清理過期的用戶
    cleanupStaleUsers();
    cleanupJoinMessages();

    // 處理用戶列表請求
    socket.on('requestUserList', () => {
        let users;
        if (currentRoom && currentRoom !== 'public') {
            // 只返回當前私人房間的用戶
            const roomUsersList = roomUsers.get(currentRoom);
            if (roomUsersList) {
                users = Array.from(privateUsers.values())
                    .filter(u => roomUsersList.has(u.user) && u.chat_id === currentRoom)
                    .map(({ id, user, type, chat_id }) => ({
                        id,
                        user,
                        type: 'private',
                        chat_id: currentRoom
                    }));
            } else {
                users = [];
            }
        } else {
            // 只返回公共聊天室的用戶
            users = Array.from(publicUsers.values())
                .filter(u => u.chat_id === 'public')
                .map(({ id, user, type, chat_id }) => ({ id, user, type, chat_id }));
        }

        // 根據房間類型發送用戶列表
        if (currentRoom && currentRoom !== 'public') {
            io.to(currentRoom).emit('userList', users);
        } else {
            socket.emit('userList', users);
        }
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
        // 檢查用戶當前所在的房間
        const currentUserRoom = currentRoom !== 'public' ? 
            Array.from(privateUsers.values()).find(u => u.user === username)?.chat_id :
            Array.from(publicUsers.values()).find(u => u.user === username)?.chat_id;
        
        // 如果用戶已經在其他房間，不顯示加入消息
        if (currentUserRoom === currentRoom) {
            return;
        }

        // 檢查是否已經在當前房間
        const isInRoom = currentRoom !== 'public' ?
            Array.from(privateUsers.values()).some(u => u.user === username && u.chat_id === currentRoom) :
            Array.from(publicUsers.values()).some(u => u.user === username);
        
        if (isInRoom) {
            console.log('用戶已在房間中:', username);
            return;
        }

        // 添加用戶到對應的房間
        addUserToRoom(username);
        
        // 發送加入消息
        const message = {
            type: 'system',
            content: `${username} ${currentRoom !== 'public' ? '加入了私人房間' : '加入了聊天室'}`,
            highlight: username,
            action: 'join'
        };
        
        // 只發送給相應的房間
        if (currentRoom !== 'public') {
            io.to(currentRoom).emit('message', message);
        } else {
            io.to('public').emit('message', message);
        }
    });

    // 處理消息
    socket.on('message', (msg) => {
        if (msg.type === 'text' && msg.content) {
            console.log('服務器收到加密消息:', msg.content);
            //console.log('使用的 salt 值:', process.env.VITE_MESSAGE_SALT);
            try {
                const decrypted = CryptoJS.AES.decrypt(msg.content, salt);
                //console.log('解密過程中的 salt:', salt);
                msg.content = decrypted.toString(CryptoJS.enc.Utf8);
                console.log('解密後:', msg.content);
                if (!msg.content) {
                    console.error('解密結果為空');
                    console.error('加密消息格式:', typeof msg.content, msg.content.length);
                }
            } catch (error) {
                console.error('解密錯誤:', error.message);
                console.error('完整錯誤:', error);
            }
        }

        // 獲取當前用戶
        const currentUser = currentRoom !== 'public' ?
            privateUsers.get(socket.id)?.user :
            publicUsers.get(socket.id)?.user;
        
        // 檢查消息中的提及
        let mentions = [];
        if (typeof msg.content === 'string') {
            const mentionRegex = /@(\S+)/g;
            mentions = [...msg.content.matchAll(mentionRegex)]
                .map(match => match[1])
                .filter(mention => mention !== currentUser);
        }

        const messageData = {
            user: currentUser,
            type: msg.type || 'user',
            content: msg.content,
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
                    .filter(([_, u]) => mentions.includes(u.user))
                    // 排除自己
                    .filter(([_, u]) => u.user !== currentUser)
                    .map(([socketId]) => socketId)
                    .filter(socketId => io.sockets.adapter.rooms.get(currentRoom)?.has(socketId));

                mentionedSocketIds.forEach(socketId => {
                    io.to(socketId).emit('mentioned', {
                        from: currentUser,
                        message: msg.content
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
                .filter(([_, u]) => mentions.includes(u.user))
                // 排除自己
                .filter(([_, u]) => u.user !== currentUser)
                .map(([socketId]) => socketId);

            mentionedSocketIds.forEach(socketId => {
                io.to(socketId).emit('mentioned', {
                    from: currentUser,
                    message: msg.content
                });
            });
        }
    });

    // 處理斷開連接
    socket.on('disconnect', () => {
        console.log('用戶斷開連接');
        let username;
        
        if (currentRoom && currentRoom !== 'public') {
            const userInfo = privateUsers.get(socket.id);
            if (!userInfo) {
                console.log('用戶信息不存在');
                return;
            }
            username = userInfo.user;
            if (username) {
                const roomUsersList = roomUsers.get(currentRoom);
                if (roomUsersList) {
                    roomUsersList.delete(username);
                    privateUsers.delete(socket.id);
                    // 只發送給當前房間的用戶
                    const roomUsers = Array.from(privateUsers.values())
                        .filter(u => u.chat_id === currentRoom);
                    io.to(currentRoom).emit('userList', roomUsers);
                    
                    // 只發送離開消息給當前房間
                    io.to(currentRoom).emit('message', {
                        type: 'system',
                        content: `${username} 離開了私人房間`,
                        highlight: username,
                        action: 'leave'
                    });
                }
            }
        } else {
            const userInfo = publicUsers.get(socket.id);
            if (!userInfo) {
                console.log('用戶信息不存在');
                return;
            }
            username = userInfo.user;
            if (username) {
                publicUsers.delete(socket.id);
                // 只發送給公共聊天室的用戶
                const publicRoomSockets = Array.from(publicUsers.keys());
                const publicUsersList = Array.from(publicUsers.values())
                    .filter((user, index, self) => 
                        index === self.findIndex(u => u.user === user.user)
                    );
                publicRoomSockets.forEach(socketId => {
                    io.to(socketId).emit('userList', publicUsersList);
                });
                
                // 只發送離開消息給公共聊天室
                io.to('public').emit('message', {
                    type: 'system',
                    content: `${username} 離開了聊天室`,
                    highlight: username,
                    action: 'leave'
                });
            }
        }
    });

    // 處理加入語音通話
    socket.on('voice-call-join', (data) => {
        console.log(`用戶 ${data.user} 加入了語音通話 ${data.callId}`);
        
        // 廣播用戶加入通話的消息
        socket.broadcast.emit('voice-call-join', {
            callId: data.callId,
            user: data.user,
            timestamp: Date.now()
        });
    });

    // 處理離開語音通話
    socket.on('voice-call-leave', (data) => {
        console.log(`用戶 ${data.user} 離開了語音通話 ${data.callId}`);
        
        // 廣播用戶離開通話的消息
        socket.broadcast.emit('voice-call-leave', {
            callId: data.callId,
            user: data.user,
            timestamp: Date.now()
        });
    });

    // 處理結束語音通話
    socket.on('voice-call-end', (data) => {
        console.log(`用戶 ${data.user} 結束了語音通話 ${data.callId}`);
        
        // 廣播通話結束的消息
        io.emit('voice-call-end', {
            callId: data.callId,
            user: data.user,
            timestamp: Date.now()
        });
    });

    // 處理靜音狀態變化
    socket.on('voice-call-mute', (data) => {
        console.log(`用戶 ${data.user} ${data.muted ? '已靜音' : '取消靜音'}`);
        
        // 廣播靜音狀態變化
        socket.broadcast.emit('voice-call-mute', {
            callId: data.callId,
            user: data.user,
            muted: data.muted,
            timestamp: Date.now()
        });
    });

    // 處理音頻數據
    socket.on('voice-call-audio', (data) => {
        // 轉發音頻數據給其他參與者
        socket.broadcast.emit('voice-call-audio', {
            callId: data.callId,
            user: data.user,
            data: data.data,
            timestamp: data.timestamp
        });
    });

    // 處理創建房間
    socket.on('createRoom', (data, callback) => {
        const { roomId, password, passNeedId } = data;
        console.log('創建房間:', { roomId, password, passNeedId });
        
        // 先創建房間
        rooms.set(roomId, {
            created: true,
            password: password,
            passNeedId: passNeedId
        });
        
        if (password) {
            roomPasswords.set(roomId, password);
            roomPassNeedIds.set(roomId, passNeedId);
            console.log('設置房間密碼:', { roomId, password });
        }
        
        // 初始化房間用戶列表
        if (!roomUsers.has(roomId)) {
            roomUsers.set(roomId, new Set());
        }
        
        // 立即回調，不需要等待
        if (callback) {
            callback();
        }
    });
});

// 文件上傳路由
app.post('/upload', (req, res) => {
    const bb = busboy({ 
        headers: req.headers,
        limits: {
            fileSize: (parseInt(process.env.MAX_FILE_SIZE) || 500) * 1024 * 1024
        }
    });
    let totalSize = 0;
    let processedSize = 0;
    let filePath = '';
    let fileName = '';

    bb.on('file', (name, file, info) => {
        fileName = info.filename;
        filePath = path.join(uploadDir, fileName);
        const writeStream = fs.createWriteStream(filePath);

        // 獲取文件大小
        file.on('data', data => {
            processedSize += data.length;
            if (totalSize > 0) {
                const progress = Math.round((processedSize / totalSize) * 100);
                res.write(JSON.stringify({ progress }) + '\n');
            }
        });

        file.pipe(writeStream);
    });

    bb.on('field', (name, val) => {
        if (name === 'totalSize') {
            totalSize = parseInt(val);
            if (totalSize > (parseInt(process.env.MAX_FILE_SIZE) || 500) * 1024 * 1024) {
                res.status(413).json({
                    error: `File size exceeds limit of ${process.env.MAX_FILE_SIZE}MB`
                });
                req.unpipe(bb);
                return;
            }
        }
    });

    bb.on('finish', () => {
        res.write(JSON.stringify({
            progress: 100,
            filename: fileName,
            path: `/uploads/${fileName}`
        }) + '\n');
        res.end();
    });

    req.pipe(bb);
});

// 所有請求都返回 index.html
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../dist/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  }
});

// 檢查端口是否可用
async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '0.0.0.0');
  });
}

// 尋找可用端口
async function findAvailablePort(startPort) {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    console.log(`Port ${port} is in use, trying ${port + 1}...`);
    port++;
  }
  return port;
}

// 使用異步啟動服務器
(async () => {
  const startPort = parseInt(process.env.SERVER_PORT) || 13050;
  const PORT = await findAvailablePort(startPort);
  
  http.listen(PORT, process.env.HOST || '0.0.0.0', () => {
    console.log(`Server running on http://${process.env.HOST || '127.0.0.1'}:${PORT}`); 
    console.log(`Server running on http://127.0.0.1:${PORT}`);
    // 如果端口不是原始端口，提示用戶
    if (PORT !== startPort) {
      console.log(`Original port ${startPort} was in use, using port ${PORT} instead`);
    }
  });
})(); 