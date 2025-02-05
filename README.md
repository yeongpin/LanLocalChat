# ➤ 局域網聊天應用 (LAN Chat)
<div align="center">
<p align="center">
  <h3>
    局域網聊天應用 (LAN Chat)
  </h3>
</p>


<p align="center">

[![Release](https://img.shields.io/github/v/release/yeongpin/cursor-free-vip?style=flat-square&logo=github&color=blue)](https://github.com/yeongpin/cursor-free-vip/releases/latest)
[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC_BY--NC--ND_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)
[![Stars](https://img.shields.io/github/stars/yeongpin/cursor-free-vip?style=flat-square&logo=github)](https://github.com/yeongpin/cursor-free-vip/stargazers)

</p>


# 局域網聊天應用 (LAN Chat)

一個基於 Node.js 和 Vue.js 的局域網聊天應用，支持文字、圖片、視頻和文件傳輸。

## 功能特點

- 即時文字聊天
- 支持發送圖片（.jpg, .png, .gif）
- 支持發送視頻（.mp4, .webm）
- 支持發送文件（所有類型）
- 在線用戶列表
- 文件上傳進度顯示
- 支持表情符號

## 項目結構

/server - 後端服務器代碼
/public - 前端 Vue.js 應用
/uploads - 上傳文件存儲目錄

## 安裝步驟

1. 安裝依賴：
===
npm install
===

2. 啟動服務器：
===
npm run server
===

3. 在瀏覽器中訪問：
http://localhost:3000

## 技術棧

- 後端：Node.js, Express, Socket.IO
- 前端：Vue.js, Socket.IO-client
- 文件處理：Multer
- UI組件：Element Plus

## 使用方法

1. 啟動應用後，輸入您的用戶名進入聊天室
2. 點擊左下角的附件按鈕可以發送文件、圖片或視頻
3. 支持拖拽上傳文件
4. 右側面板顯示在線用戶列表

## 注意事項

- 上傳文件大小限制為 50MB
- 支持的圖片格式：jpg, png, gif
- 支持的視頻格式：mp4, webm 