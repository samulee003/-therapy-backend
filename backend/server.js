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