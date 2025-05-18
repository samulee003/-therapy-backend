/**
 * 資料庫設定與連接模組
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 獲取資料庫路徑（優先使用環境變數）
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite');

// 創建資料庫連接函數
const connectDatabase = () => {
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, err => {
    if (err) {
      console.error('無法連接到資料庫:', err.message);
      return;
    }
    console.log(`成功連接到資料庫，路徑: ${dbPath}`);
  });

  // 啟用外鍵約束
  db.run('PRAGMA foreign_keys = ON');
  
  return db;
};

// 檢查資料庫連接
const testConnection = (db) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT sqlite_version() as version', (err, row) => {
      if (err) {
        console.error('資料庫連接測試失敗:', err.message);
        reject(err);
      } else {
        console.log(`資料庫連接測試成功。SQLite 版本: ${row.version}`);
        resolve(row.version);
      }
    });
  });
};

// 關閉資料庫連接
const closeDatabase = (db) => {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('關閉資料庫時發生錯誤:', err.message);
      } else {
        console.log('資料庫連接已關閉');
      }
    });
  }
};

module.exports = {
  connectDatabase,
  testConnection,
  closeDatabase,
  dbPath
}; 