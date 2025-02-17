# 構建階段
FROM node:18-alpine as builder

WORKDIR /app

# 複製項目文件
COPY package*.json ./
RUN npm install
COPY . .

# 安裝依賴並構建
RUN npm run build

# 運行階段
FROM node:18-alpine

WORKDIR /app

# 複製構建產物和必要文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.env.example ./.env

# 只安裝生產環境依賴
RUN npm install --omit=dev
RUN npm install dotenv

# 創建上傳目錄
RUN mkdir -p /app/server/uploads

# 暴露端口
EXPOSE 13050

# 啟動服務
CMD ["npm", "start"] 