const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

// --- Express 設置 ---
const app = express();
const port = process.env.PORT || 5000;

// 中間件
app.use(cors({
  origin: ['http://localhost:3000', 'https://therapy-booking.zeabur.app'], // 允許的來源
  credentials: true, // 允許憑證（Cookies）
}));
app.use(express.json()); // 解析 JSON 請求

// 添加 Session 中間件
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite' }), // 將 session 儲存在 SQLite 資料庫
  secret: 'your-secret-key', // 用於簽名 Session ID cookie 的密鑰
  resave: false, // 不強制儲存未修改的 session
  saveUninitialized: false, // 不儲存未初始化的 session
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // 僅在 HTTPS 下使用 secure cookies
    maxAge: 24 * 60 * 60 * 1000, // 24 小時過期
    httpOnly: true, // 防止客戶端 JavaScript 訪問 cookie
  }
}));

// --- 身份驗證中間件 ---

// 檢查用戶是否已登入
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    next(); // 用戶已登入，繼續
  } else {
    res.status(401).json({ success: false, message: "請先登入。" });
  }
};

// 檢查用戶是否具有醫生角色
const isDoctor = (req, res, next) => {
  if (req.session && req.session.userId && req.session.role === 'doctor') {
    next(); // 用戶是醫生，繼續
  } else {
    res.status(403).json({ success: false, message: "此操作需要醫生權限。" });
  }
};

// 檢查用戶是否具有病人角色
const isPatient = (req, res, next) => {
  if (req.session && req.session.userId && req.session.role === 'patient') {
    next(); // 用戶是病人，繼續
  } else {
    res.status(403).json({ success: false, message: "此操作需要病人權限。" });
  }
};

// Function to initialize database schema and default settings/users
async function initializeDatabase(database) {
    return new Promise((resolve, reject) => {
        database.serialize(async () => {
            console.log("Initializing database schema if necessary...");

            // Helper for logging table creation errors/success
            const handleTableErr = (tableName, err) => {
                if (err) console.error(`Error creating/checking ${tableName}:`, err.message);
                else console.log(`${tableName} table checked/created.`);
            };

            // Create tables
            database.run(`CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                doctorName TEXT,
                clinicName TEXT,
                adminPassword TEXT, // Keep adminPassword for settings management if needed
                notificationEmail TEXT,
                defaultTimeSlots TEXT
            )`, (err) => handleTableErr("settings", err));
            
            // ADDED: Create users table
            database.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL, -- Email as username
                password TEXT NOT NULL,       -- Hashed password
                name TEXT,
                role TEXT NOT NULL CHECK(role IN ('doctor', 'patient', 'admin')) -- Added admin role maybe?
            )`, (err) => handleTableErr("users", err));

            database.run(`CREATE TABLE IF NOT EXISTS schedule (
                date TEXT PRIMARY KEY,
                availableSlots TEXT,
                handleTableErr("regular_patients", err);

                // After last table creation attempt, check/insert default settings AND users
                // Check Settings
                database.get("SELECT 1 FROM settings WHERE id = 1", async (getSettingsErr, settingsRow) => {
                    if (getSettingsErr) {
                        console.error("Error checking settings existence:", getSettingsErr.message);
                        return reject(getSettingsErr); 
                    }

                    let settingsInitialized = !!settingsRow;
                    if (!settingsInitialized) {
                         console.log("No settings found, inserting defaults...");
                         const defaultPassword = 'admin123'; // Keep a simple default admin password for settings
                         const saltRounds = 10;
                         try {
                             const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);
                             const defaultSlots = JSON.stringify(["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]);
                             await new Promise((res, rej) => { // Wait for insert
                                 database.run(`INSERT INTO settings (id, adminPassword, defaultTimeSlots) VALUES (1, ?, ?)`,
                                            [hashedPassword, defaultSlots],
                                            (insertErr) => {
                                     if (insertErr) {
                                          console.error("Error inserting default settings:", insertErr.message);
                                          rej(insertErr);
                                     } else {
                                          console.log("Default settings inserted.");
                                          settingsInitialized = true;
                                          res();
                                     }
                                 });
                            });
                         } catch (hashError) {
                             console.error("Error hashing default settings password:", hashError);
                             return reject(hashError); 
                         }
                    } else {
                        console.log("Settings already initialized.");
                    }

                    // Check Users (only after settings check/insert is potentially done)
                    database.get("SELECT COUNT(*) as count FROM users", async (getUsersErr, usersRow) => {
                         if (getUsersErr) {
                             console.error("Error checking users existence:", getUsersErr.message);
                             return reject(getUsersErr);
                         }

                         if (usersRow && usersRow.count === 0) {
                             console.log("No users found, inserting default doctor and patient...");
                             const defaultUserPassword = 'password123';
                             const saltRounds = 10;
                             try {
                                const hashedUserPassword = await bcrypt.hash(defaultUserPassword, saltRounds);
                                // Wait for both inserts to complete
                                await new Promise((res, rej) => {
                                    database.run(`INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`,
                                            ['doctor@example.com', hashedUserPassword, 'Dr. Demo', 'doctor'],
                                            (insertErr) => { if (insertErr) rej(insertErr); else res(); });
                                });
                                await new Promise((res, rej) => {
                                     database.run(`INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`,
                                             ['patient@example.com', hashedUserPassword, 'Patient Demo', 'patient'],
                                             (insertErr) => { if (insertErr) rej(insertErr); else res(); });
                                });
                                console.log("Default users inserted.");
                                resolve(); // RESOLVE aFTER ALL INITIALIZATION IS DONE
                             } catch (hashOrInsertError) {
                                 console.error("Error hashing/inserting default users:", hashOrInsertError);
                                 reject(hashOrInsertError);
                             }
                         } else {
                             console.log("Users table already populated.");
                             resolve(); // RESOLVE aFTER ALL INITIALIZATION IS DONE
                         }
                    });
                });
            });
        });
    });
}

// Connect to Database and Initialize
// ... existing code ... 

let db; // Declare db variable

// Helper function to wrap database.run in a Promise
function runDb(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (!db) return reject(new Error("Database connection not established."));
        db.run(sql, params, function(err) { // Use traditional function for `this` context
            if (err) {
                // Shorten SQL in log for readability
                console.error('DB Run Error:', err.message, 'SQL:', sql.substring(0, 100) + '...', 'Params:', params); 
                reject(err);
            } else {
                resolve(this); // Resolve with `this` context (contains lastID, changes)
            }
        });
    });
}

// Helper function to wrap database.get in a Promise
function getDb(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (!db) return reject(new Error("Database connection not established."));
        db.get(sql, params, (err, row) => {
            if (err) {
                // Shorten SQL in log for readability
                 console.error('DB Get Error:', err.message, 'SQL:', sql.substring(0, 100) + '...', 'Params:', params); 
                 reject(err);
            } else {
                resolve(row); // Resolve with the row found (or undefined)
            }
        });
    });
}

// Helper function to wrap database.all in a Promise (for getting multiple rows)
function allDb(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (!db) return reject(new Error("Database connection not established."));
        db.all(sql, params, (err, rows) => { // Use db.all to get all matching rows
            if (err) {
                console.error('DB All Error:', err.message, 'SQL:', sql.substring(0, 100) + '...', 'Params:', params);
                reject(err);
            } else {
                resolve(rows); // Resolve with the array of rows found (or empty array)
            }
        });
    });
}

// --- SQL Definitions for Table Creation ---
const CREATE_SETTINGS_SQL = `
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    doctorName TEXT,
    clinicName TEXT,
    adminPassword TEXT,
    notificationEmail TEXT,
    defaultTimeSlots TEXT
)`;

const CREATE_USERS_SQL = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL CHECK(role IN ('doctor', 'patient', 'admin'))
)`;

const CREATE_SCHEDULE_SQL = `
CREATE TABLE IF NOT EXISTS schedule (
    date TEXT PRIMARY KEY,
    availableSlots TEXT,
    bookedSlots TEXT
)`;

const CREATE_APPOINTMENTS_SQL = `
CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    patientName TEXT NOT NULL,
    patientPhone TEXT NOT NULL,
    patientEmail TEXT NOT NULL,
    appointmentReason TEXT,
    notes TEXT,
    status TEXT DEFAULT 'confirmed',
    isRegular BOOLEAN DEFAULT 0,
    regularPatientId INTEGER,
    FOREIGN KEY (regularPatientId) REFERENCES regular_patients(id)
)`;

const CREATE_REGULAR_PATIENTS_SQL = `
CREATE TABLE IF NOT EXISTS regular_patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    frequency TEXT NOT NULL,
    dayOfWeek INTEGER NOT NULL,
    timeSlot TEXT NOT NULL,
    notes TEXT
)`;

// Function to initialize database schema and default settings/users (Refactored with async/await)
async function initializeDatabase() {
    console.log("Initializing database schema if necessary...");
    try {
        // --- Create Tables Sequentially using defined SQL ---
        await runDb(CREATE_SETTINGS_SQL);
        console.log("settings table checked/created.");

        await runDb(CREATE_USERS_SQL);
         console.log("users table checked/created.");

        await runDb(CREATE_SCHEDULE_SQL);
        console.log("schedule table checked/created.");

        await runDb(CREATE_APPOINTMENTS_SQL);
        console.log("appointments table checked/created.");

         await runDb(CREATE_REGULAR_PATIENTS_SQL);
        console.log("regular_patients table checked/created.");

        // --- Check and Insert Default Settings ---
        const settingsRow = await getDb("SELECT 1 FROM settings WHERE id = 1");
        if (!settingsRow) {
            console.log("No settings found, inserting defaults...");
            const defaultPassword = 'admin123';
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);
            const defaultSlots = JSON.stringify(["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]);
            await runDb("INSERT INTO settings (id, adminPassword, defaultTimeSlots) VALUES (1, ?, ?)", [hashedPassword, defaultSlots]);
            console.log("Default settings inserted.");
        } else {
            console.log("Settings already initialized.");
        }

        // --- Check and Insert Default Users ---
        const usersRow = await getDb("SELECT COUNT(*) as count FROM users");
        if (usersRow && usersRow.count === 0) {
             console.log("No users found, inserting default doctor and patient...");
             const defaultUserPassword = 'password123';
             const saltRounds = 10;
             const hashedUserPassword = await bcrypt.hash(defaultUserPassword, saltRounds);
             await runDb("INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)", ['doctor@example.com', hashedUserPassword, 'Dr. Demo', 'doctor']);
             await runDb("INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)", ['patient@example.com', hashedUserPassword, 'Patient Demo', 'patient']);
             console.log("Default users inserted.");
        } else if (usersRow) {
            console.log("Users table already populated.");
        } else {
             console.error("Could not determine user count. Default users not inserted.");
        }

        console.log("Database initialization check complete.");

    } catch (error) {
        console.error("FATAL: Database initialization process failed.");
        throw error; 
    }
}

// Connect to Database and Initialize
db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, async (err) => {
    if (err) {
        console.error("FATAL: Error opening database:", err.message);
        process.exit(1); 
    } else {
        console.log("Connected to the SQLite database.");
        try {
            await initializeDatabase(); 
            startServer();
        } catch (initError) {
             if (db) {
                 db.close((closeErr) => {
                    if (closeErr) console.error("Error closing DB after init failure:", closeErr.message);
                 });
            }
            process.exit(1); 
        }
    }
});

// --- API Routes --- 
// ... existing code ... 

// Authentication
// ... (Login route code remains the same) ...

// ADDED: User Registration Route
app.post("/api/register", async (req, res) => {
    const { username, password, name, role } = req.body;

    // --- Input Validation ---
    if (!username || !password || !name || !role) {
        return res.status(400).json({ success: false, message: "Missing required registration fields (username, password, name, role)." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) {
         return res.status(400).json({ success: false, message: "Invalid email format for username." });
    }
     if (!['doctor', 'patient', 'admin'].includes(role)) { // Adjust allowed roles if needed
        return res.status(400).json({ success: false, message: "Invalid role specified." });
    }

    // --- Check if user already exists ---
    try {
        const existingUser = await getDb("SELECT id FROM users WHERE username = ?", [username]);
        if (existingUser) {
            return res.status(409).json({ success: false, message: "Username (email) already exists." }); // 409 Conflict
        }

        // --- Hash password and Insert User ---
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const insertSql = "INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)";
        const insertResult = await runDb(insertSql, [username, hashedPassword, name, role]);

        console.log(`User registered: ${username}, ID: ${insertResult.lastID}`);
        res.status(201).json({ success: true, message: "Registration successful.", userId: insertResult.lastID });

    } catch (error) {
        console.error("Error during registration:", error);
        if (error.message.includes("UNIQUE constraint failed")) { 
             return res.status(409).json({ success: false, message: "Username (email) already exists." });
        }
        res.status(500).json({ success: false, message: "Server error during registration." });
    }
});

// Settings
// ... (Settings routes code remains the same) ...

// Schedule
// ... (Schedule routes code remains the same) ...

// Appointments
// ... (Appointments routes code remains the same) ...

// --- Start Server Function --- 
// ... (startServer function remains the same) ...

// Graceful shutdown
// ... (process.on('SIGINT') remains the same) ...

// Ensure there are no stray characters or unterminated comments/strings at the end of the file.

// --- NEW: API Routes for Fetching Appointments ---

// GET Patient's Appointments (by email - INSECURE, needs proper auth)
app.get('/api/appointments/patient/:email', async (req, res) => {
    const patientEmail = req.params.email;
    console.log(`Fetching appointments for patient email: ${patientEmail}`);
    if (!patientEmail) {
        return res.status(400).json({ message: "Patient email parameter is required." });
    }
    try {
        const sql = "SELECT * FROM appointments WHERE patientEmail = ? ORDER BY date, time";
        const appointments = await allDb(sql, [patientEmail]);
        console.log(`Found ${appointments.length} appointments for ${patientEmail}`);
        res.json(appointments);
    } catch (error) {
        console.error('Error fetching patient appointments:', error);
        res.status(500).json({ message: 'Failed to fetch appointments.', error: error.message });
    }
});

// GET All Appointments (for Doctor - INSECURE, needs role check)
// WARNING: This endpoint currently returns ALL appointments without checking user role.
// Implement proper authorization middleware before production use.
app.get('/api/appointments/doctor/all', async (req, res) => {
    console.log("Fetching all appointments for doctor view...");
    try {
        const sql = "SELECT * FROM appointments ORDER BY date, time";
        const appointments = await allDb(sql);
        console.log(`Found total ${appointments.length} appointments.`);
        res.json(appointments);
    } catch (error) {
        console.error('Error fetching all appointments:', error);
        res.status(500).json({ message: 'Failed to fetch all appointments.', error: error.message });
    }
});

// Default route for testing
app.get('/', (req, res) => {
    res.send('Therapy Appointment API is running!');
});

// Error handling for database initialization should prevent server from starting without DB
// No need for app.listen here as it's moved inside the db connection callback

// Note: The app.listen call was moved inside the database connection callback
// to ensure the database is ready before the server starts accepting requests.

// 修改登入路由，加入 Session 支持
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 基本輸入驗證
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "請提供用戶名和密碼。" });
    }
    
    // 從資料庫獲取用戶
    const user = await getDb("SELECT * FROM users WHERE username = ?", [username]);
    if (!user) {
      return res.status(401).json({ success: false, message: "用戶名或密碼不正確。" });
    }
    
    // 驗證密碼
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: "用戶名或密碼不正確。" });
    }
    
    // 創建 Session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.name = user.name;
    
    // 返回用戶資訊（不包含密碼）
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
    res.status(500).json({ success: false, message: "服務器錯誤，請稍後再試。" });
  }
});

// 新增登出路由
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("登出錯誤:", err);
      return res.status(500).json({ success: false, message: "登出失敗，請稍後再試。" });
    }
    res.json({ success: true, message: "登出成功。" });
  });
});

// 獲取當前登入用戶資訊
app.get('/api/me', isAuthenticated, async (req, res) => {
  try {
    const user = await getDb("SELECT id, username, name, role, phone FROM users WHERE id = ?", [req.session.userId]);
    if (!user) {
      return res.status(404).json({ success: false, message: "用戶不存在。" });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error("獲取用戶資訊錯誤:", error);
    res.status(500).json({ success: false, message: "服務器錯誤，請稍後再試。" });
  }
});

// 安全版：獲取當前登入用戶的預約列表
app.get('/api/appointments/my', isAuthenticated, async (req, res) => {
  try {
    let appointments;
    
    if (req.session.role === 'patient') {
      // 病人只能查看自己的預約
      appointments = await allDb(
        "SELECT * FROM appointments WHERE patientEmail = ? ORDER BY date, time",
        [req.session.username] // 使用 session 中的 username (email)
      );
    } else if (req.session.role === 'doctor') {
      // 醫生可以查看所有預約
      appointments = await allDb("SELECT * FROM appointments ORDER BY date, time");
    } else {
      return res.status(403).json({ success: false, message: "無權限獲取預約列表。" });
    }
    
    res.json({ success: true, appointments });
  } catch (error) {
    console.error("獲取預約列表錯誤:", error);
    res.status(500).json({ success: false, message: "服務器錯誤，請稍後再試。" });
  }
});

// 安全版：獲取所有預約列表 (僅限醫生)
app.get('/api/appointments/all', isAuthenticated, isDoctor, async (req, res) => {
  try {
    const appointments = await allDb("SELECT * FROM appointments ORDER BY date, time");
    res.json({ success: true, appointments });
  } catch (error) {
    console.error("獲取所有預約列表錯誤:", error);
    res.status(500).json({ success: false, message: "服務器錯誤，請稍後再試。" });
  }
});

// 保留原有的路由，但將其標記為棄用
app.get('/api/appointments/patient/:email', async (req, res) => {
  console.warn("棄用警告: 使用 /api/appointments/patient/:email 路由。請改用 /api/appointments/my");
  // ... existing implementation ...
});

app.get('/api/appointments/doctor/all', async (req, res) => {
  console.warn("棄用警告: 使用 /api/appointments/doctor/all 路由。請改用 /api/appointments/all");
  // ... existing implementation ...
});

// Register Route
// ... other existing routes ...

// 修改預約路由以使用身份驗證
app.post('/api/book', isAuthenticated, async (req, res) => {
  // ... existing booking logic ...
  // 可以使用 req.session.userId 和 req.session.role 進行額外的授權檢查
});

// --- 開始伺服器 ---
function startServer() {
  app.listen(port, () => {
    console.log(`伺服器運行在 http://localhost:${port}`);
  });
  
  // 優雅關閉
  process.on('SIGINT', () => {
    console.log('\n正在關閉伺服器...');
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('關閉資料庫錯誤:', err.message);
        } else {
          console.log('資料庫連接已關閉');
        }
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
}