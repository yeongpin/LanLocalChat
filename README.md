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
</div>

## 📝 項目介紹

一個基於 Node.js 和 Vue.js 的局域網聊天應用，支持文字、圖片、視頻和文件傳輸。

## ✨ 功能特點

| 功能 | 描述 |
|------|------|
| 💬 即時聊天 | 即時文字消息傳輸 |
| 🌐 多語言 | 支持中文和英文界面 |
| 👋 用戶提及 | 支持 @用戶名 提及通知，帶音效和桌面通知 |
| 📜 歷史消息 | 支持載入歷史聊天記錄 |
| 📷 圖片分享 | 支持 jpg、png、gif 格式 |
| 🎥 視頻分享 | 支持 mp4、webm 格式 |
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

## 📝 更新日誌

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

