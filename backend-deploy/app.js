/**
 * 應用程式主入口點
 */
console.log('[APP] 程式開始執行...');

const express = require('express');
console.log('[APP] Express 已載入');
const cors = require('cors');
console.log('[APP] CORS 已載入');
const cookieParser = require('cookie-parser');
console.log('[APP] Cookie Parser 已載入');
const path = require('path');
console.log('[APP] Path 已載入');

// 引入資料庫連接
console.log('[APP] 準備載入資料庫設定...');
const { connectDatabase } = require('./config/db');
console.log('[APP] 資料庫設定已載入');

// 引入中間件
console.log('[APP] 準備載入錯誤處理中間件...');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
console.log('[APP] 錯誤處理中間件已載入');

// 創建 Express 應用
const app = express();
console.log('[APP] Express 應用程式已創建');

// 連接資料庫
console.log('[APP] 準備連接資料庫...');
const db = connectDatabase();
console.log('[APP] 資料庫連接已初始化 (等待實際連接結果)');

// --- 基本中間件 ---
console.log('[APP] 準備註冊 CORS 中間件...');
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = ['http://localhost:5173', 'https://therapy-booking.zeabur.app'];
    // 允許沒有來源的請求（例如移動應用或 Postman）
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.CORS_ORIGIN === origin) {
      callback(null, true);
    } else {
      console.log(`CORS 拒絕來源: ${origin}`);
      callback(new Error('不允許的來源'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));
console.log('[APP] CORS 中間件已註冊');

console.log('[APP] 準備註冊 JSON 和 URL-encoded 中間件...');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
console.log('[APP] JSON 和 URL-encoded 中間件已註冊');

console.log('[APP] 準備註冊 Cookie Parser 中間件...');
app.use(cookieParser());
console.log('[APP] Cookie Parser 中間件已註冊');

// --- API 路由優先掛載 ---
console.log('[APP] 準備載入 API 路由...');
const routes = require('./routes')(db);
console.log('[APP] API 路由已成功載入');
console.log('[APP] 準備掛載 API 路由...');
app.use(routes); // API 路由應在靜態文件和 SPA 回退之前
console.log('[APP] API 路由已成功掛載');

// --- 靜態檔案服務 ---
console.log('[APP] 準備設定靜態檔案目錄...');
const clientBuildPath = path.join(__dirname, '../dist');
app.use(express.static(clientBuildPath));
console.log(`[APP] 靜態檔案目錄已設定: ${clientBuildPath}`);

// --- 前端 SPA 回退路由 (應在 API 和靜態文件之後) ---
console.log('[APP] 準備設定前端 SPA 路由處理...');
app.get('*', (req, res) => {
  console.log(`[APP] SPA 回退：將請求 ${req.url} 導向到 index.html`);
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});
console.log('[APP] 前端 SPA 路由處理已設定');

// --- 錯誤處理中間件 (應在所有路由和中間件之後) ---
console.log('[APP] 準備註冊 Not Found 和 Error Handler 中間件...');
app.use(notFound);
app.use(errorHandler);
console.log('[APP] Not Found 和 Error Handler 中間件已註冊');

console.log('[APP] 準備導出 app 和 db...');
module.exports = { app, db };
console.log('[APP] app 和 db 已導出'); 