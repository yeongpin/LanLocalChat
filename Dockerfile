# 構建階段
FROM node:18-alpine as builder

WORKDIR /app

# 複製項目文件
COPY package*.json ./
RUN npm install
COPY . .

# 安裝依賴並構建
RUN npm run build
RUN ls -la dist/
RUN echo "構建完成，檢查 dist 目錄內容"

# 運行階段
FROM node:18-alpine

WORKDIR /app

# 複製構建產物和必要文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.env.example ./.env
RUN echo "檢查 dist 目錄是否正確複製"
RUN ls -la dist/

# 只安裝生產環境依賴
RUN npm install --omit=dev
RUN npm install dotenv

# 創建上傳目錄
RUN mkdir -p /app/server/uploads
RUN chown -R node:node /app

USER node

# 暴露端口
EXPOSE 13050
EXPOSE 5173

# 啟動服務
CMD ["sh", "-c", "node server/server.js & npm run preview"] 