# 構建階段
FROM node:18-alpine as builder

WORKDIR /app

# 設置構建時環境變量
ARG VITE_MESSAGE_SALT
ENV VITE_MESSAGE_SALT=${VITE_MESSAGE_SALT:-mysecretkey123}

# 複製項目文件
COPY package*.json ./
RUN npm install
COPY . .

# 安裝依賴並構建
RUN echo "Building with VITE_MESSAGE_SALT=${VITE_MESSAGE_SALT}"
RUN npm run build
RUN ls -la dist/
RUN echo "構建完成，檢查 dist 目錄內容"

# 運行階段
FROM node:18-alpine

WORKDIR /app

# 設置運行時環境變量
ENV VITE_MESSAGE_SALT=${VITE_MESSAGE_SALT:-mysecretkey123}

# 複製構建產物和必要文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package*.json ./

# 只安裝生產環境依賴
RUN npm install --omit=dev
RUN npm install dotenv

# 創建上傳目錄
RUN mkdir -p /app/server/uploads

# 暴露端口
EXPOSE 13050

# 啟動服務
CMD ["sh", "-c", "ls -la && npm start"]  # 啟動時顯示文件列表 