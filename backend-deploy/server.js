const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');

// --- 基本設置 ---
const app = express();
const port = process.env.PORT || 5000;
const dbPath = path.join(__dirname, 'database.sqlite'); // 定義資料庫路徑
const saltRounds = 10; // 用於密碼哈希

// --- 中間件 ---
app.use(cors({
  // 注意：對於生產環境，最好明確列出允許的來源
  origin: (origin, callback) => {
    // 允許來自 Zeabur 部署和本地開發的請求
    const allowedOrigins = [
      'https://therapy-booking.zeabur.app',
      'http://localhost:3000',
      'http://localhost:5173'  // Vite 預設端口
    ];
    
    // 寬鬆規則：無來源 (如 Postman) 或在允許列表中的請求
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS 拒絕請求來自: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // 允許憑證（Cookies）
  exposedHeaders: ['set-cookie'], // 明確暴露 Set-Cookie 標頭
}));
app.use(express.json()); // 解析 JSON 請求
app.use(cookieParser()); // 解析 Cookie

// --- 環境變數 ---
const isProduction = process.env.NODE_ENV === 'production';
console.log(`伺服器環境: ${isProduction ? '生產環境' : '開發環境'}`);

// --- 身份驗證中間件 ---
const isAuthenticated = (req, res, next) => {
  try {
    // 從 cookie 讀取用戶信息
    const userCookie = req.cookies['therapy.userinfo'];
    if (!userCookie) {
      return res.status(401).json({ success: false, message: "未授權：請先登入。" });
    }
    
    // 解析 JSON cookie
    const userInfo = JSON.parse(userCookie);
    if (!userInfo || !userInfo.userId) {
      return res.status(401).json({ success: false, message: "無效的認證信息，請重新登入。" });
    }
    
    // 將用戶信息附加到請求對象，供後續路由使用
    req.user = userInfo;
    return next();
    
  } catch (error) {
    console.error("身份驗證錯誤:", error);
    res.status(401).json({ success: false, message: "認證過程中出錯，請重新登入。" });
  }
};

const isDoctor = (req, res, next) => {
  if (req.user && req.user.role === 'doctor') {
    return next();
  }
  res.status(403).json({ success: false, message: "禁止訪問：此操作需要醫生權限。" });
};

const isPatient = (req, res, next) => {
  if (req.user && req.user.role === 'patient') {
    return next();
  }
  res.status(403).json({ success: false, message: "禁止訪問：此操作需要病人權限。" });
};

// --- 資料庫實例 ---
// 將 db 的初始化移到 try...catch 塊外部，以便在 startServer 和關閉處理程序中使用
let db;

// --- 資料庫輔助函數 (Promise-based) ---
function runDb(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("資料庫連接未建立。"));
    db.run(sql, params, function (err) { // 使用傳統函數獲取 'this'
      if (err) {
        console.error('資料庫執行錯誤:', err.message, 'SQL:', sql.substring(0, 100) + '...', 'Params:', params);
        reject(err);
      } else {
        resolve(this); // resolve with 'this' to get lastID, changes
      }
    });
  });
}

function getDb(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("資料庫連接未建立。"));
    db.get(sql, params, (err, row) => {
      if (err) {
        console.error('資料庫查詢錯誤:', err.message, 'SQL:', sql.substring(0, 100) + '...', 'Params:', params);
        reject(err);
      } else {
        resolve(row); // resolve with the row or undefined
      }
    });
  });
}

function allDb(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("資料庫連接未建立。"));
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('資料庫查詢所有錯誤:', err.message, 'SQL:', sql.substring(0, 100) + '...', 'Params:', params);
        reject(err);
      } else {
        resolve(rows); // resolve with array of rows or empty array
      }
    });
  });
}

// --- 資料庫表結構定義 ---
// 使用分號結束每個 SQL 語句，並確保字符串格式正確
const CREATE_SETTINGS_SQL = `
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    doctorName TEXT,
    clinicName TEXT,
    adminPassword TEXT,
    notificationEmail TEXT,
    defaultTimeSlots TEXT
);`;

const CREATE_USERS_SQL = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    phone TEXT, -- 添加 phone 欄位
    role TEXT NOT NULL CHECK(role IN ('doctor', 'patient', 'admin'))
);`;

const CREATE_SCHEDULE_SQL = `
CREATE TABLE IF NOT EXISTS schedule (
    date TEXT NOT NULL,
    doctorId INTEGER NOT NULL,
    availableSlots TEXT,
    bookedSlots TEXT, -- 儲存已預約時段的詳細信息，例如 { "09:00": { patientId: 1, patientName: "..." } }
    isRestDay INTEGER DEFAULT 0, -- 新增休假日標記，0=正常日，1=休假日
    PRIMARY KEY (date, doctorId),
    FOREIGN KEY (doctorId) REFERENCES users(id)
);`;

const CREATE_APPOINTMENTS_SQL = `
CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    patientId INTEGER NOT NULL, -- 使用 patientId 關聯用戶
    patientName TEXT NOT NULL,  -- 冗餘儲存方便查詢，但應考慮是否必要
    patientPhone TEXT,         -- 同上
    patientEmail TEXT NOT NULL, -- 同上，並確保與 users 表的 username 關聯
    appointmentReason TEXT,
    notes TEXT,
    status TEXT DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'cancelled', 'completed')), -- 添加 completed 狀態
    isRegular BOOLEAN DEFAULT 0,
    regularPatientId INTEGER,
    doctorId INTEGER, -- 新增的醫生ID欄位，關聯到users表的醫生
    doctorName TEXT, -- 新增的醫生姓名欄位，方便查詢
    FOREIGN KEY (patientId) REFERENCES users(id), -- 外鍵關聯
    FOREIGN KEY (regularPatientId) REFERENCES regular_patients(id),
    FOREIGN KEY (doctorId) REFERENCES users(id), -- 新增的外鍵約束
    UNIQUE(date, time, doctorId) -- 同一時間只能有一個預約【修改為同一時間、同一醫生只能有一個預約】
);`;

const CREATE_REGULAR_PATIENTS_SQL = `
CREATE TABLE IF NOT EXISTS regular_patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE, -- 確保 email 唯一
    frequency TEXT NOT NULL,
    dayOfWeek INTEGER NOT NULL,
    timeSlot TEXT NOT NULL,
    notes TEXT
);`;

// --- 資料庫初始化函數 ---
async function initializeDatabase() {
  console.log("正在初始化資料庫架構...");
  try {
    // 啟用外鍵約束 (對 SQLite 很重要)
    await runDb('PRAGMA foreign_keys = ON;');
    console.log("外鍵約束已啟用。");

    // --- 依次創建表 ---
    await runDb(CREATE_SETTINGS_SQL);
    console.log("settings 表已檢查/創建。");

    await runDb(CREATE_USERS_SQL);
    console.log("users 表已檢查/創建。");

    await runDb(CREATE_SCHEDULE_SQL);
    console.log("schedule 表已檢查/創建。");

    await runDb(CREATE_APPOINTMENTS_SQL);
    console.log("appointments 表已檢查/創建。");

    await runDb(CREATE_REGULAR_PATIENTS_SQL);
    console.log("regular_patients 表已檢查/創建。");

    // --- 檢查並插入預設 Settings ---
    const settingsRow = await getDb("SELECT 1 FROM settings WHERE id = 1");
    if (!settingsRow) {
      console.log("未找到設置，正在插入預設值...");
      const defaultPassword = 'admin123'; // 考慮使用更安全的預設值或強制修改
      const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);
      const defaultSlots = JSON.stringify(["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]);
      await runDb("INSERT INTO settings (id, adminPassword, defaultTimeSlots) VALUES (1, ?, ?)", [hashedPassword, defaultSlots]);
      console.log("預設設置已插入。");
    } else {
      console.log("設置已初始化。");
    }

    // --- 檢查並插入預設 Users ---
    const usersRow = await getDb("SELECT COUNT(*) as count FROM users");
    if (usersRow && usersRow.count === 0) {
      console.log("未找到用戶，正在插入預設醫生和病人...");
      const defaultUserPassword = 'password123';
      const hashedUserPassword = await bcrypt.hash(defaultUserPassword, saltRounds);
      await runDb("INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)", ['doctor@example.com', hashedUserPassword, 'Dr. Demo', 'doctor', '12345678']);
      await runDb("INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)", ['patient@example.com', hashedUserPassword, 'Patient Demo', 'patient', '87654321']);
      console.log("預設用戶已插入。");
    } else if (usersRow) {
      console.log(`用戶表已存在 ${usersRow.count} 個用戶。`);
    } else {
      // 如果 getDb 返回 null 或 undefined，這是一個問題
      console.error("無法確定用戶數量。未插入預設用戶。");
    }

    console.log("資料庫初始化檢查完成。");

  } catch (error) {
    console.error("資料庫初始化過程失敗:", error);
    // 在初始化失敗時拋出錯誤，阻止伺服器啟動
    throw error;
  }
}

// --- API 路由 ---

// --- 身份驗證 ---
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "請提供用戶名和密碼。" });
  }

  try {
    const user = await getDb("SELECT * FROM users WHERE username = ?", [username]);
    if (!user) {
      return res.status(401).json({ success: false, message: "用戶名或密碼不正確。" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: "用戶名或密碼不正確。" });
    }

    // 不再使用 session，改用直接設置 cookie
    const userInfo = {
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.name
    };

    // 設置一個包含用戶資訊的 JSON 字符串 cookie
    const userInfoStr = JSON.stringify(userInfo);
    
    // 設置 cookie（永遠使用 SameSite=None 和 Secure=true）
    res.cookie('therapy.userinfo', userInfoStr, {
      maxAge: 24 * 60 * 60 * 1000, // 24小時
      httpOnly: true,
      secure: true, // Zeabur 是 HTTPS
      sameSite: 'none'
    });

    // 設置一個普通的測試 cookie
    res.cookie('therapy.test', 'simple-test-value', {
      maxAge: 60 * 1000, // 1分鐘
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    });

    // 檢查設置的標頭
    console.log('=== Cookie 設置情況 ===');
    console.log('已設置兩個 cookie: therapy.userinfo 和 therapy.test');
    console.log('response headers:', res.getHeaders());
    console.log('=== Cookie 設置完成 ===');

    // 返回用戶資訊
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error("登入錯誤:", error);
    res.status(500).json({ success: false, message: "伺服器內部錯誤，登入失敗。" });
  }
});

app.post('/api/logout', (req, res) => {
  // 從 cookie 獲取用戶名（如果存在的話）
  let username = '(未知)';
  try {
    const userCookie = req.cookies['therapy.userinfo'];
    if (userCookie) {
      const userInfo = JSON.parse(userCookie);
      username = userInfo.username || username;
    }
  } catch (e) {
    console.error('登出時解析用戶 cookie 出錯:', e);
  }

  // 清除 cookie
  res.clearCookie('therapy.userinfo', {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });
  res.clearCookie('therapy.test', {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });

  console.log(`用戶 ${username} 已登出`);
  res.json({ success: true, message: "登出成功。" });
});

app.post('/api/register', async (req, res) => {
  const { username, password, name, role, phone } = req.body; // 包含 phone

  // --- 輸入驗證 ---
  if (!username || !password || !name || !role || !phone) {
    return res.status(400).json({ success: false, message: "缺少必要的註冊欄位 (username, password, name, role, phone)。" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) {
    return res.status(400).json({ success: false, message: "用戶名必須是有效的電子郵件格式。" });
  }
  // 簡單的電話號碼格式驗證 (例如，至少5位數字)
  if (!/^\d{5,}$/.test(phone)) {
       return res.status(400).json({ success: false, message: "無效的電話號碼格式。" });
  }
  if (!['doctor', 'patient'].includes(role)) { // 限制可註冊的角色
    return res.status(400).json({ success: false, message: "無效的角色。" });
  }

  try {
    // --- 檢查用戶是否存在 ---
    const existingUser = await getDb("SELECT id FROM users WHERE username = ?", [username]);
    if (existingUser) {
      return res.status(409).json({ success: false, message: "此電子郵件已被註冊。" }); // 409 Conflict
    }

    // --- 哈希密碼並插入用戶 ---
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const insertSql = "INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)";
    const insertResult = await runDb(insertSql, [username, hashedPassword, name, role, phone]);

    console.log(`用戶已註冊: ${username}, ID: ${insertResult.lastID}`);
    // 註冊成功後不自動登入，讓用戶手動登入
    res.status(201).json({ success: true, message: "註冊成功！請使用您的帳號密碼登入。", userId: insertResult.lastID });

  } catch (error) {
    console.error("註冊過程中出錯:", error);
    if (error.message.includes("UNIQUE constraint failed")) {
      // 理論上上面的檢查已經處理了這種情況，但作為雙重保險
      return res.status(409).json({ success: false, message: "此電子郵件已被註冊。" });
    }
    res.status(500).json({ success: false, message: "伺服器錯誤，註冊失敗。" });
  }
});

// 獲取當前登入用戶信息
app.get('/api/me', isAuthenticated, async (req, res) => {
  try {
    // 從 req.user 獲取用戶 ID (由 isAuthenticated 中間件設置)
    const user = await getDb("SELECT id, username, name, role, phone FROM users WHERE id = ?", [req.user.userId]);
    if (!user) {
      // 如果用戶不存在（理論上不應發生，因為 Cookie 中的用戶 ID 應該有效）
      console.error(`無法找到 ID 為 ${req.user.userId} 的用戶 (來自 Cookie)。`);
      // 清除無效的 cookie
      res.clearCookie('therapy.userinfo', {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      });
      return res.status(404).json({ success: false, message: "用戶不存在或認證信息無效，請重新登入。" });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error("獲取用戶資訊錯誤:", error);
    res.status(500).json({ success: false, message: "獲取用戶資訊時發生伺服器錯誤。" });
  }
});

// --- 設置 ---
// 獲取設置 (僅限醫生或管理員 - 暫時只檢查登入)
app.get('/api/settings', isAuthenticated, async (req, res) => {
  // TODO: 將來可能需要更細緻的權限檢查 (isDoctor or isAdmin)
  try {
    const settings = await getDb("SELECT doctorName, clinicName, notificationEmail, defaultTimeSlots FROM settings WHERE id = 1");
    if (!settings) {
      // 如果沒有設置，返回一個預設結構或錯誤
      return res.status(404).json({ success: false, message: "未找到系統設置。" });
    }
    // 解析 defaultTimeSlots
    try {
        settings.defaultTimeSlots = JSON.parse(settings.defaultTimeSlots || '[]');
    } catch(e) {
        console.error("解析 defaultTimeSlots JSON 失敗:", e);
        settings.defaultTimeSlots = []; // 出錯時返回空數組
    }
    res.json({ success: true, settings });
  } catch (error) {
    console.error("獲取設置錯誤:", error);
    res.status(500).json({ success: false, message: "獲取設置失敗。" });
  }
});

// 更新設置 (僅限醫生或管理員 - 暫時只用 isDoctor)
app.put('/api/settings', isAuthenticated, isDoctor, async (req, res) => {
  const { doctorName, clinicName, notificationEmail, defaultTimeSlots } = req.body;
  // 基本驗證
  if (!Array.isArray(defaultTimeSlots)) {
      return res.status(400).json({ success: false, message: "defaultTimeSlots 必須是一個數組。" });
  }
  const slotsJson = JSON.stringify(defaultTimeSlots);

  try {
    // 使用 UPSERT (Update or Insert) 邏輯，雖然我們知道 id=1 應該存在
    await runDb(
      `INSERT INTO settings (id, doctorName, clinicName, notificationEmail, defaultTimeSlots)
       VALUES (1, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         doctorName=excluded.doctorName,
         clinicName=excluded.clinicName,
         notificationEmail=excluded.notificationEmail,
         defaultTimeSlots=excluded.defaultTimeSlots;`,
      [doctorName, clinicName, notificationEmail, slotsJson]
    );
    res.json({ success: true, message: "設置已成功更新。" });
  } catch (error) {
    console.error("更新設置錯誤:", error);
    res.status(500).json({ success: false, message: "更新設置失敗。" });
  }
});

// --- 排班 ---
// 獲取指定月份的排班 (需要登入)
app.get('/api/schedule/:year/:month', isAuthenticated, async (req, res) => {
  const { year, month } = req.params;
  const doctorId = req.query.doctorId; // 可選參數，特定醫生的ID
  const userId = req.user.userId;
  const userRole = req.user.role;
  
  // 驗證年和月
  if (!/^\d{4}$/.test(year) || !/^(0?[1-9]|1[0-2])$/.test(month)) {
    return res.status(400).json({ success: false, message: "無效的年份或月份格式。" });
  }
  const monthPadded = String(month).padStart(2, '0');
  const startDate = `${year}-${monthPadded}-01`;
  // 計算月份的最後一天
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${monthPadded}-${String(lastDay).padStart(2, '0')}`;

  try {
    let scheduleRows;
    
    // 根據角色和請求參數決定查詢邏輯
    if (userRole === 'doctor' && !doctorId) {
      // 醫生查看自己的排班
      scheduleRows = await allDb(
        "SELECT date, availableSlots, bookedSlots, isRestDay FROM schedule WHERE date BETWEEN ? AND ? AND doctorId = ?",
        [startDate, endDate, userId]
      );
    } else if (doctorId) {
      // 查詢特定醫生的排班
      scheduleRows = await allDb(
        "SELECT date, availableSlots, bookedSlots, isRestDay FROM schedule WHERE date BETWEEN ? AND ? AND doctorId = ?",
        [startDate, endDate, doctorId]
      );
    } else {
      // 患者查看：獲取所有醫生的排班
      scheduleRows = await allDb(
        "SELECT s.date, s.doctorId, u.name as doctorName, s.availableSlots, s.bookedSlots, s.isRestDay FROM schedule s JOIN users u ON s.doctorId = u.id WHERE s.date BETWEEN ? AND ? AND u.role = 'doctor' ORDER BY s.date",
        [startDate, endDate]
      );
    }

    // 將結果轉換為前端期望的格式
    const scheduleMap = {};
    
    if (userRole === 'doctor' && !doctorId || doctorId) {
      // 醫生查看自己排班 或 查詢特定醫生排班：保持原有格式
      scheduleRows.forEach(row => {
        let availableSlots = [];
        let bookedSlots = {};
        try {
          availableSlots = JSON.parse(row.availableSlots || '[]');
        } catch (e) { console.error(`解析 ${row.date} 的 availableSlots 失敗:`, e); }
        try {
          bookedSlots = JSON.parse(row.bookedSlots || '{}');
        } catch (e) { console.error(`解析 ${row.date} 的 bookedSlots 失敗:`, e); }
        
        // 添加 isRestDay 標記到返回數據中
        scheduleMap[row.date] = { 
          availableSlots, 
          bookedSlots,
          isRestDay: row.isRestDay === 1 // 將數字轉換為布爾值
        };
      });
    } else {
      // 患者查看所有醫生排班：新格式，按日期分組，每天包含多個醫生的信息
      scheduleRows.forEach(row => {
        let availableSlots = [];
        let bookedSlots = {};
        try {
          availableSlots = JSON.parse(row.availableSlots || '[]');
        } catch (e) { console.error(`解析 ${row.date} 的 availableSlots 失敗:`, e); }
        try {
          bookedSlots = JSON.parse(row.bookedSlots || '{}');
        } catch (e) { console.error(`解析 ${row.date} 的 bookedSlots 失敗:`, e); }
        
        // 初始化日期的信息（如果不存在）
        if (!scheduleMap[row.date]) {
          scheduleMap[row.date] = {
            doctors: []
          };
        }
        
        // 添加這個醫生的信息到該日期
        scheduleMap[row.date].doctors.push({
          doctorId: row.doctorId,
          doctorName: row.doctorName || '未指定',
          availableSlots,
          bookedSlots,
          isRestDay: row.isRestDay === 1 // 將數字轉換為布爾值
        });
      });
    }

    res.json({ success: true, schedule: scheduleMap });
  } catch (error) {
    console.error(`獲取 ${year}-${month} 排班錯誤:`, error);
    res.status(500).json({ success: false, message: "獲取排班失敗。" });
  }
});

// 保存指定日期的可用時段 (僅限醫生)
app.post('/api/schedule', isAuthenticated, isDoctor, async (req, res) => {
  const { date, availableSlots, isRestDay } = req.body;
  const doctorId = req.user.userId; // 從登入用戶獲取醫生ID

  // 驗證日期和時段
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, message: "無效的日期格式 (需要 YYYY-MM-DD)。" });
  }
  if (!Array.isArray(availableSlots) || !availableSlots.every(slot => /^([01]\d|2[0-3]):([0-5]\d)$/.test(slot))) {
    return res.status(400).json({ success: false, message: "availableSlots 必須是 HH:MM 格式的時間數組。" });
  }
  // 去重並排序
  const uniqueSortedSlots = [...new Set(availableSlots)].sort();
  const slotsJson = JSON.stringify(uniqueSortedSlots);

  try {
    // 獲取當前已預約的時段，以防覆蓋
    const existingSchedule = await getDb("SELECT bookedSlots FROM schedule WHERE date = ? AND doctorId = ?", [date, doctorId]);
    const bookedSlotsJson = existingSchedule ? existingSchedule.bookedSlots : '{}';

    // 記錄操作類型用於日誌
    const operationType = isRestDay ? '設置為休假日' : '更新可用時段';
    console.log(`醫生 ID ${doctorId} 正在${operationType}: ${date}, 時段數: ${availableSlots.length}`);

    // 使用 UPSERT 邏輯更新或插入排班，增加 isRestDay 欄位
    await runDb(
      `INSERT INTO schedule (date, doctorId, availableSlots, bookedSlots, isRestDay)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(date, doctorId) DO UPDATE SET
         availableSlots=excluded.availableSlots,
         isRestDay=excluded.isRestDay;`, // 更新 availableSlots 和 isRestDay
      [date, doctorId, slotsJson, bookedSlotsJson, isRestDay ? 1 : 0] // 使用 1/0 儲存布爾值
    );
    res.json({ success: true, message: `日期 ${date} 的排班已保存。${isRestDay ? '已設為休假日。' : ''}` });
  } catch (error) {
    console.error(`保存 ${date} 排班錯誤:`, error);
    res.status(500).json({ success: false, message: "保存排班失敗。" });
  }
});

// --- 預約 ---

// 新增預約 (需要病人登入)
app.post('/api/book', isAuthenticated, isPatient, async (req, res) => {
  const { date, time, appointmentReason, notes, doctorId } = req.body;
  
  // 檢查是否提供了醫生ID
  if (!doctorId) {
    return res.status(400).json({ success: false, message: "請選擇一位醫生進行預約。" });
  }
  
  const patientId = req.user.userId;
  const patientEmail = req.user.username; // 從 req.user 獲取
  const patientName = req.user.name; // 從 req.user 獲取

  // 從資料庫獲取病人電話 (因為 user 對象可能沒有)
  let patientPhone = '';
  let doctorName = '';
  try {
    const patientInfo = await getDb("SELECT phone FROM users WHERE id = ?", [patientId]);
    if (patientInfo && patientInfo.phone) {
      patientPhone = patientInfo.phone;
    } else {
      console.warn(`無法找到 ID 為 ${patientId} 的病人的電話號碼。`);
    }
    
    // 獲取醫生資訊（如果提供了doctorId）
    const doctorInfo = await getDb("SELECT name FROM users WHERE id = ? AND role = 'doctor'", [doctorId]);
    if (doctorInfo && doctorInfo.name) {
      doctorName = doctorInfo.name;
    } else {
      console.warn(`無法找到 ID 為 ${doctorId} 的醫生資訊。`);
      return res.status(404).json({ success: false, message: "找不到指定的醫生，請重新選擇。" });
    }
  } catch (dbError) {
     console.error("預約時查詢用戶資訊失敗:", dbError);
     return res.status(500).json({ success: false, message: "資料庫錯誤，無法完成預約。" });
  }

  // --- 輸入驗證 ---
  if (!date || !time || !patientName || !patientEmail) {
    return res.status(400).json({ success: false, message: "缺少必要的預約信息 (日期, 時間, 患者姓名, 患者郵箱)。" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, message: "無效的日期格式。" });
  }
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
    return res.status(400).json({ success: false, message: "無效的時間格式。" });
  }

  // --- 核心邏輯：檢查時段可用性並預約 ---
  try {
    await db.serialize(async () => { // 使用 serialize 確保事務性
      await runDb('BEGIN TRANSACTION;');

      try {
        // 1. 檢查排班是否存在及該時段是否可用
        const schedule = await getDb("SELECT availableSlots, bookedSlots FROM schedule WHERE date = ? AND doctorId = ?", [date, doctorId]);
        if (!schedule) {
          await runDb('ROLLBACK;');
          return res.status(400).json({ success: false, message: `醫生 ${doctorName} 在 ${date} 沒有可預約的時段。` });
        }

        let availableSlots = [];
        let bookedSlots = {};
        try { availableSlots = JSON.parse(schedule.availableSlots || '[]'); } catch (e) {}
        try { bookedSlots = JSON.parse(schedule.bookedSlots || '{}'); } catch (e) {}

        // 檢查時段是否真的在 availableSlots 中，並且沒有在 bookedSlots 中
        if (!availableSlots.includes(time) || bookedSlots[time]) {
          await runDb('ROLLBACK;');
          return res.status(409).json({ success: false, message: `醫生 ${doctorName} 在 ${date} ${time} 的時段不可用或已被預約。` }); // 409 Conflict
        }

        // 2. 創建預約記錄
        const appointmentSql = `INSERT INTO appointments
          (date, time, patientId, patientName, patientPhone, patientEmail, appointmentReason, notes, status, doctorId, doctorName)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const appointmentResult = await runDb(appointmentSql, [
          date, time, patientId, patientName, patientPhone, patientEmail, appointmentReason || '', notes || '', 'confirmed', doctorId, doctorName
        ]);
        const newAppointmentId = appointmentResult.lastID;

        // 3. 更新排班表，將該時段標記為已預約
        const updatedAvailableSlots = availableSlots.filter(slot => slot !== time);
        bookedSlots[time] = { // 儲存預約信息
             appointmentId: newAppointmentId,
             patientId: patientId,
             patientName: patientName,
             doctorId: doctorId,
             doctorName: doctorName
        };
        const updateScheduleSql = "UPDATE schedule SET availableSlots = ?, bookedSlots = ? WHERE date = ? AND doctorId = ?";
        await runDb(updateScheduleSql, [JSON.stringify(updatedAvailableSlots), JSON.stringify(bookedSlots), date, doctorId]);

        // 4. 提交事務
        await runDb('COMMIT;');
        console.log(`預約成功: ID ${newAppointmentId}, 日期 ${date}, 時間 ${time}, 患者 ${patientName} (${patientEmail}), 醫生 ${doctorName}`);
        res.status(201).json({ success: true, message: "預約成功！", appointmentId: newAppointmentId });

      } catch (innerError) {
        // 如果事務內部出錯，回滾
        console.error("預約事務處理失敗，正在回滾:", innerError);
        await runDb('ROLLBACK;');
        // 檢查是否是 UNIQUE constraint 錯誤 (重複預約)
        if (innerError.message && innerError.message.includes('UNIQUE constraint failed: appointments.date, appointments.time, appointments.doctorId')) {
             res.status(409).json({ success: false, message: `醫生 ${doctorName} 在 ${date} ${time} 的時段已被預約。` });
        } else {
             res.status(500).json({ success: false, message: "預約過程中發生錯誤。" });
        }
      }
    }); // end serialize
  } catch (outerError) {
    // 如果 serialize 本身出錯（例如 BEGIN TRANSACTION 失敗）
    console.error("預約事務啟動失敗:", outerError);
    res.status(500).json({ success: false, message: "處理預約時發生嚴重錯誤。" });
  }
});

// 獲取預約列表 (安全版)
// GET /api/appointments/my - 獲取當前登入用戶的預約 (病人看自己的，醫生看所有的)
app.get('/api/appointments/my', isAuthenticated, async (req, res) => {
  try {
    let appointments;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const userEmail = req.user.username;

    if (userRole === 'patient') {
      // 病人只能查看自己的預約 (通過 email 關聯)
      appointments = await allDb(
        "SELECT * FROM appointments WHERE patientEmail = ? ORDER BY date DESC, time DESC",
        [userEmail]
      );
    } else if (userRole === 'doctor') {
      // 醫生可以查看所有預約
      appointments = await allDb("SELECT * FROM appointments ORDER BY date DESC, time DESC");
    } else {
      // 其他角色 (例如 admin) 或未定義角色
      console.warn(`用戶 ID ${userId} 角色 ${userRole} 嘗試訪問 /api/appointments/my`);
      return res.status(403).json({ success: false, message: "無權限獲取預約列表。" });
    }

    res.json({ success: true, appointments });
  } catch (error) {
    console.error("獲取 '我的預約' 列表錯誤:", error);
    res.status(500).json({ success: false, message: "獲取預約列表時發生伺服器錯誤。" });
  }
});

// GET /api/appointments/all - 獲取所有預約 (僅限醫生)
app.get('/api/appointments/all', isAuthenticated, isDoctor, async (req, res) => {
  try {
    const appointments = await allDb("SELECT * FROM appointments ORDER BY date DESC, time DESC");
    res.json({ success: true, appointments });
  } catch (error) {
    console.error("獲取所有預約列表錯誤:", error);
    res.status(500).json({ success: false, message: "獲取所有預約列表時發生伺服器錯誤。" });
  }
});

// 取消預約 (病人取消自己的，醫生取消任意的)
app.put('/api/appointments/:id/cancel', isAuthenticated, async (req, res) => {
  const appointmentId = parseInt(req.params.id, 10);
  const userId = req.user.userId;
  const userRole = req.user.role;
  const userEmail = req.user.username;

  if (isNaN(appointmentId)) {
    return res.status(400).json({ success: false, message: "無效的預約 ID。" });
  }

  try {
      await db.serialize(async () => {
          await runDb('BEGIN TRANSACTION;');
          try {
              // 1. 獲取預約信息，檢查是否存在以及狀態
              const appointment = await getDb("SELECT * FROM appointments WHERE id = ?", [appointmentId]);

              if (!appointment) {
                  await runDb('ROLLBACK;');
                  return res.status(404).json({ success: false, message: "未找到指定的預約。" });
              }
              if (appointment.status === 'cancelled') {
                   await runDb('ROLLBACK;');
                  return res.status(400).json({ success: false, message: "此預約已被取消。" });
              }
              // 可選：檢查是否已完成
              // if (appointment.status === 'completed') { ... }

              // 2. 權限檢查
              if (userRole === 'patient' && appointment.patientEmail !== userEmail) {
                  await runDb('ROLLBACK;');
                  return res.status(403).json({ success: false, message: "您只能取消自己的預約。" });
              }
              // 醫生或管理員可以取消任何預約 (這裡只實現了醫生)
              if (!['patient', 'doctor'].includes(userRole)) {
                   await runDb('ROLLBACK;');
                   return res.status(403).json({ success: false, message: "無權限執行此操作。" });
              }

              // 3. 更新預約狀態為 'cancelled'
              await runDb("UPDATE appointments SET status = 'cancelled' WHERE id = ?", [appointmentId]);

              // 4. 更新對應日期的排班表：將時段從 bookedSlots 移回 availableSlots
              const schedule = await getDb("SELECT availableSlots, bookedSlots FROM schedule WHERE date = ?", [appointment.date]);
              if (schedule) {
                  let availableSlots = [];
                  let bookedSlots = {};
                  try { availableSlots = JSON.parse(schedule.availableSlots || '[]'); } catch(e){}
                  try { bookedSlots = JSON.parse(schedule.bookedSlots || '{}'); } catch(e){}

                  if (bookedSlots[appointment.time]) { // 如果時段確實被預約了
                      delete bookedSlots[appointment.time]; // 從 booked 移除
                      if (!availableSlots.includes(appointment.time)) { // 加回 available (如果不存在)
                           availableSlots.push(appointment.time);
                           availableSlots.sort(); // 保持排序
                      }
                      await runDb("UPDATE schedule SET availableSlots = ?, bookedSlots = ? WHERE date = ?",
                          [JSON.stringify(availableSlots), JSON.stringify(bookedSlots), appointment.date]);
                  } else {
                       console.warn(`警告：在排班表中未找到預約 ${appointmentId} (${appointment.date} ${appointment.time}) 的 bookedSlot 記錄。`);
                  }
              } else {
                   console.warn(`警告：未找到預約 ${appointmentId} 對應日期 ${appointment.date} 的排班記錄。`);
              }

              // 5. 提交事務
              await runDb('COMMIT;');
              console.log(`預約 ${appointmentId} 已被用戶 ${userEmail} (${userRole}) 取消。`);
              res.json({ success: true, message: "預約已成功取消。" });

          } catch (innerError) {
              await runDb('ROLLBACK;');
              console.error(`取消預約 ${appointmentId} 事務失敗:`, innerError);
              res.status(500).json({ success: false, message: "取消預約過程中發生錯誤。" });
          }
      }); // end serialize
  } catch (outerError) {
      console.error(`取消預約 ${appointmentId} 事務啟動失敗:`, outerError);
      res.status(500).json({ success: false, message: "處理取消預約時發生嚴重錯誤。" });
  }
});

// --- 其他路由 (可以根據需要添加，例如 regular_patients 的管理) ---

// --- 伺服器啟動函數 ---
function startServer() {
  app.listen(port, () => {
    console.log(`後端伺服器運行在 http://localhost:${port}`);
    console.log(`資料庫文件位於: ${dbPath}`);
  });
}

// --- 連接資料庫並啟動伺服器 ---
db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, async (err) => {
  if (err) {
    console.error("致命錯誤：打開資料庫失敗:", err.message);
    process.exit(1); // 退出進程
  } else {
    console.log(`成功連接到 SQLite 資料庫: ${dbPath}`);
    try {
      // 初始化資料庫（如果需要）
      await initializeDatabase();
      // 啟動 Express 伺服器
      startServer();
    } catch (initError) {
      console.error("致命錯誤：資料庫初始化失敗，伺服器未啟動。", initError);
      if (db) {
        db.close((closeErr) => {
          if (closeErr) console.error("關閉資料庫連接時出錯（初始化失敗後）:", closeErr.message);
        });
      }
      process.exit(1); // 退出進程
    }
  }
});

// --- 優雅關閉 ---
process.on('SIGINT', () => {
  console.log('\n收到 SIGINT 信號，正在關閉伺服器...');
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('關閉資料庫連接時出錯:', err.message);
        process.exit(1); // 強制退出
      } else {
        console.log('資料庫連接已關閉。');
        process.exit(0); // 正常退出
      }
    });
  } else {
    process.exit(0); // 如果沒有資料庫連接，直接退出
  }
});
// 添加 SIGTERM 處理程序，用於容器環境
process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 信號，觸發優雅關閉...');
    process.emit('SIGINT'); // 觸發 SIGINT 處理邏輯
});

// 捕獲未處理的 Promise 拒絕
process.on('unhandledRejection', (reason, promise) => {
  console.error('未處理的 Promise 拒絕:', promise, '原因:', reason);
  // 考慮是否需要退出進程
  // process.exit(1);
});

// 捕獲未捕獲的異常
process.on('uncaughtException', (error) => {
  console.error('未捕獲的異常:', error);
  // 嘗試優雅關閉，但可能不可靠
  process.emit('SIGINT');
  // 在記錄錯誤後退出是個好主意
  // process.exit(1);
});

// 獲取所有醫生列表 (公開API，用於預約頁面)
app.get('/api/doctors', async (req, res) => {
  try {
    const doctors = await allDb(
      "SELECT id, name FROM users WHERE role = 'doctor' ORDER BY name"
    );
    res.json({ success: true, doctors });
  } catch (error) {
    console.error('獲取醫生列表失敗:', error);
    res.status(500).json({ success: false, message: "無法獲取醫生列表。" });
  }
}); 