# ➤ 局域網聊天應用 (LAN Chat)
<div align="center">
<p align="center">
  <h3>
    局域網聊天應用 (LAN Chat)
  </h3>
</p>


<p align="center">

[![Release](https://img.shields.io/github/v/release/yeongpin/LanLocalChat?style=flat-square&logo=github&color=blue)](https://github.com/yeongpin/LanLocalChat/releases/latest)
[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC_BY--NC--ND_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)
[![Stars](https://img.shields.io/github/stars/yeongpin/LanLocalChat?style=flat-square&logo=github)](https://github.com/yeongpin/LanLocalChat/stargazers)

</p>
<p align="center">
<img src="./images/send_2025-02-11_10-14-56.png" width="400" height="400"/>
</p>
</div>

## 📝 項目介紹

一個基於 Node.js 和 Vue.js 的局域網聊天應用，支持文字、圖片、視頻和文件傳輸。支持消息加密。支持Docker部署。支持nginx反向代理。

## ✨ 功能特點

| 功能 | 描述 |
|------|------|
| 💬 即時聊天 | 即時文字消息傳輸 |
| 🌐 多語言 | 支持中文和英文界面 |
| 👋 用戶提及 | 支持 @用戶名 提及通知，帶音效和桌面通知 |
| 📜 歷史消息 | 支持載入歷史聊天記錄 |
| 📷 圖片分享 | 支持 jpg、png、gif 格式 |
| 🎥 視頻分享 | 支持 mp4、webm 格式 |
| 🎵 音頻分享 | 支持 mp3、wav、ogg、m4a 格式 |
| 📄 文件傳輸 | 支持所有類型文件 |
| 👥 用戶列表 | 顯示在線用戶 |
| 📊 上傳進度 | 實時顯示文件上傳進度 |
| 😊 表情符號 | 支持發送表情 |
| 🌓 深色模式 | 支持淺色/深色主題切換 |

## 📂 項目結構

/server - 後端服務器代碼<br>
/public - 前端 Vue.js 應用<br>
/uploads - 上傳文件存儲目錄<br>


## 🚀 快速開始
```
git clone https://github.com/yeongpin/LanLocalChat.git
cd LanLocalChat
```

### 1️⃣ 安裝依賴
```
npm install
```


### 2️⃣ 啟動服務器
```
npm run server
```


### 3️⃣ 啟動前端
```
npm run dev
```

### 4️⃣ 修改 .env 文件
請把 .env.example 複製一份，改名為 .env，並修改以下內容
```
SERVER_PORT=13050 # 服務器端口
PUBLIC_PORT=5173 # 前端端口
HOST=0.0.0.0 # 服務器地址
PUBLIC_HOST=0.0.0.0 # 前端地址
VITE_SERVER_PORT=13050 # 服務器端口
VITE_NAME_LIMIT=20 # 用戶名長度限制
# 歷史記錄和上傳文件的保留時間 (0d0h0m0s 表示立即清理)
CLEANUP_INTERVAL=1h        # 清理檢查間隔
HISTORY_RETENTION=7d      # 歷史記錄保留時間
UPLOADS_RETENTION=1d      # 上傳文件保留時間
```

## 🌐 部署在服務器
```
npm run build:all
```
會Build vite 到 dist 文件夾，並部署在 0.0.0.0:13050 下面，直接訪問 IP:13050 即可

如想要手動Build,請運行
```
npm run build
```
然後運行
```
npm run server
```

## 🌐 使用nginx 反向代理
```
server {
    listen 80;
    server_name localhost;
    
    # 添加这一行来增加上传大小限制
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:13050;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
## 🔄 使用Docker 部署
```bash
# 從 GitHub Container Registry 拉取
docker run -p 13050:13050 ghcr.io/yeongpin/lanlocalchat:main

# 或從 Docker Hub 拉取
docker run -p 13050:13050 yeongpin/lanlocalchat:latest
```

## 🛠 技術棧

| 類別 | 技術 |
|------|------|
| 後端 | ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white) ![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white) ![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=flat-square&logo=socketdotio&logoColor=white) |
| 前端 | ![Vue.js](https://img.shields.io/badge/Vue.js-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white) ![Socket.IO Client](https://img.shields.io/badge/Socket.IO_Client-010101?style=flat-square&logo=socketdotio&logoColor=white) |
| 工具 | ![Multer](https://img.shields.io/badge/Multer-FF6600?style=flat-square&logo=node.js&logoColor=white) |

## 📖 使用指南

### 基本操作
1. 啟動應用後，輸入您的用戶名進入聊天室
2. 點擊左下角的附件按鈕可以發送文件、圖片或視頻
3. 支持拖拽上傳文件
4. 右側面板顯示在線用戶列表

## ⚠️ 注意事項

- 上傳文件大小限制為 50MB
- 支持的圖片格式：jpg, png, gif
- 支持的視頻格式：mp4, webm 

## 👥 貢獻者

<a href="https://github.com/yeongpin">
  <img src="https://github.com/yeongpin.png" width="50" height="50" style="border-radius:50%"/>
</a>

## 🎨 預覽圖
<details>
<summary>預覽圖</summary>
<p align="center">
<img src="./images/send_2025-02-11_10-14-56.png" width="400" height="400"/>
<img src="./images/mention_2025-02-11_10-15-27.png" width="400" height="400"/>
<img src="./images/send_2025-02-11_10-13-23.png" width="400" height="400"/>
</p>
</details>

## 📝 更新日誌

### v1.0.14

- 🔄 新增Docker Hub 部署
- 🔄 新增GitHub Actions 部署
- 修復已知問題

### v1.0.13

- 🔄 新增Dockerfile
- 🔄 新增docker-compose.yml
- 🔄 新增部署
- 修復已知問題

### v1.0.12

- 🔄 新增消息加密
- 🔄 修復消息加密問題
- 🎨 界面優化
- 修復已知問題

### v1.0.11

- 🔄 修復界面高度
- 🎨 界面優化
- 增加移動端適配
- 修復已知問題

### v1.0.10

- 🔄 新增文件卡
- 🎨 界面優化
- 增加移動端適配
- 修復已知問題

### v1.0.9

- 🔄 新增音頻分享
- 🎨 界面優化

### v1.0.8

- 🔄 改進用戶系統

  - 優化用戶名顯示和更改功能
- 🎨 界面優化
- 房間密碼
- 創建房間
- 加入房間
- 離開房間

### v1.0.7

- 🔄 改進用戶系統
  - 優化退出時間
  - 優化用戶名顯示和更改功能
- 🎨 界面優化

### v1.0.6

- 🔄 改進用戶系統
  - 每個標籤頁現在是獨立用戶
  - 優化用戶名顯示和更改功能
- 🎨 界面優化
- 📱 響應式設計優化
- 時間戳顯示
- 添加用戶名長度限制

### v1.0.5

- 🔄 改進用戶系統
  - 每個標籤頁現在是獨立用戶
  - 優化用戶名顯示和更改功能
- 🎨 界面優化
  - 改進用戶列表樣式
  - 添加隨機用戶名生成按鈕
  - 優化文字對齊和間距
- 🐛 修復已知問題
  - 修復重連時的用戶名衝突問題
  - 修復系統消息顯示異常

### v1.0.4

- 🌐 多語言系統優化
  - 改進語言切換機制
  - 添加更多翻譯內容
- 💄 UI/UX 改進
  - 優化深色模式配色
  - 改進按鈕和輸入框樣式
- ⚡️ 性能優化
  - 改進消息處理機制
  - 優化重連邏輯

### v1.0.3

- 📱 響應式設計優化
  - 改進移動端適配
  - 優化浮動按鈕位置
- 🔔 通知系統改進
  - 添加提及音效
  - 優化桌面通知
- 🛠️ 技術改進
  - 添加環境變量配置
  - 改進錯誤處理

### v1.0.2

- 🔄 消息功能增強
  - 添加消息歷史記錄
  - 改進消息顯示格式
- 👥 用戶系統更新
  - 添加用戶列表滾動條
  - 優化用戶名長度限制
- 🎨 界面更新
  - 添加加載動畫
  - 優化錯誤提示

### v1.0.1

- 🚀 首次功能更新
  - 添加文件上傳進度顯示
  - 添加用戶在線狀態顯示
- 🎨 界面優化
  - 添加深色模式切換按鈕
  - 優化聊天界面布局
- 🐛 Bug修復
  - 修復消息發送問題
  - 修復連接穩定性問題

### v1.0.0

- 🎉 初始版本發布
- ✨ 基本聊天功能
- 📤 文件上傳功能
- 🌓 深色模式支持

