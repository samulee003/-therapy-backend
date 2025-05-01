require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();
// Use PORT from env variable if available (for platforms like Zeabur), fallback to 3000
const port = process.env.PORT || 3000;

// --- Middleware ---

// Enable CORS - Adjust origin for production if needed
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// --- Database Setup ---
// Store DB in the root directory, one level up from backend/
// Use environment variable DB_PATH or default to database.db
const dbPath = path.resolve(__dirname, "..", process.env.DB_PATH || "database.db");
console.log(`Database path: ${dbPath}`);

let db; // Declare db variable globally

// Helper function to wrap database.run in a Promise
function runDb(sql, params = []) {
    return new Promise((resolve, reject) => {
        // Ensure db is initialized before using it
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
        // Ensure db is initialized before using it
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

// Helper function to wrap database.all in a Promise
function allDb(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (!db) return reject(new Error("Database connection not established."));
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('DB All Error:', err.message, 'SQL:', sql.substring(0, 100) + '...', 'Params:', params);
                reject(err);
            } else {
                resolve(rows); // Resolve with the array of rows
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
    role TEXT NOT NULL CHECK(role IN ('doctor', 'patient', 'admin')),
    phone TEXT
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
            const defaultPassword = 'admin123'; // Default password for settings management
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
             await runDb("INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)", ['doctor@example.com', hashedUserPassword, 'Dr. Demo', 'doctor', '1234567890']);
             await runDb("INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)", ['patient@example.com', hashedUserPassword, 'Patient Demo', 'patient', '0987654321']);
             console.log("Default users inserted.");
        } else if (usersRow) {
             console.log(`Users table already populated (${usersRow.count} users).`);
        } else {
             // This case handles if getDb returned undefined for the count query, indicating an issue.
             console.error("Could not determine user count. Default users not inserted.");
        }

        console.log("Database initialization check complete.");

    } catch (error) {
        console.error("FATAL: Database initialization process failed.");
        // Re-throw the error so the main connection logic catches it and exits
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
            startServer(); // Start server only after DB init is successful
        } catch (initError) {
             // Error is already logged in initializeDatabase
             if (db) {
                 db.close((closeErr) => {
                    if (closeErr) console.error("Error closing DB after init failure:", closeErr.message);
                 });
            }
            process.exit(1); // Exit if DB init fails
        }
    }
});

// --- API Routes ---

// Authentication
// Implements multi-user login based on users table
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body; // Expect username (email) and password

    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password are required." });
    }

    // Find user by username (email) in the users table
    try {
        const user = await getDb("SELECT id, username, password as hashedPassword, name, role, phone FROM users WHERE username = ?", [username]);

        // User not found
        if (!user) {
            // Use a generic message for security (don't reveal if username exists)
            console.log(`Login attempt failed: User not found - ${username}`);
            return res.status(401).json({ success: false, message: "Invalid username or password." });
        }

        // User found, compare password
        const match = await bcrypt.compare(password, user.hashedPassword);
        if (match) {
            // Login successful
            // IMPORTANT: In a real app, generate and return a JWT token here
            console.log(`Login successful: ${username}`);
            const userInfo = {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                phone: user.phone
            };
            res.json({
                success: true,
                message: "Login successful.",
                user: userInfo // Send back basic user info
                // token: generatedToken // TODO: Add JWT token later
            });
        } else {
            // Password doesn't match
            console.log(`Login attempt failed: Invalid password - ${username}`);
            res.status(401).json({ success: false, message: "Invalid username or password." }); // Generic message
        }
    } catch (error) {
        console.error("Error during login process:", error);
        res.status(500).json({ success: false, message: "Server error during login." });
    }
});

// User Registration Route
app.post("/api/register", async (req, res) => {
    const { username, password, name, role, phone } = req.body;

    // --- Input Validation ---
    if (!username || !password || !name || !role || !phone) {
        return res.status(400).json({ success: false, message: "Missing required registration fields (username, password, name, role, phone)." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) {
         return res.status(400).json({ success: false, message: "Invalid email format for username." });
    }
     if (!['doctor', 'patient', 'admin'].includes(role)) { // Adjust allowed roles if needed
        return res.status(400).json({ success: false, message: "Invalid role specified." });
    }
    // Add password strength check if desired (e.g., minimum length)
    if (password.length < 6) {
         return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
    }

    // --- Process Registration ---
    try {
        // Check if user already exists (using await on getDb)
        const existingUser = await getDb("SELECT id FROM users WHERE username = ?", [username]);
        if (existingUser) {
            console.log(`Registration attempt failed: Username already exists - ${username}`);
            return res.status(409).json({ success: false, message: "Username (email) already exists." }); // 409 Conflict
        }

        // Hash password and Insert User (using await on bcrypt and runDb)
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const insertSql = "INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)";
        const insertResult = await runDb(insertSql, [username, hashedPassword, name, role, phone]);

        console.log(`User registered: ${username}, ID: ${insertResult.lastID}`);
        res.status(201).json({ success: true, message: "Registration successful.", userId: insertResult.lastID });

    } catch (error) {
        console.error("Error during registration:", error);
        // Handle specific errors like UNIQUE constraint (which might be caught by the earlier check, but good fallback)
        if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes("UNIQUE")) {
             return res.status(409).json({ success: false, message: "Username (email) already exists." });
        }
        res.status(500).json({ success: false, message: "Server error during registration." });
    }
});


// Settings
app.get("/api/settings", async (req, res) => { // Made async
    try {
        const row = await getDb("SELECT doctorName, clinicName, notificationEmail, defaultTimeSlots FROM settings WHERE id = 1");
        if (!row) {
            return res.status(404).json({ success: false, message: "Settings not found." });
        }
        // Safely parse JSON, provide default empty array if parsing fails or field is null/missing
        let defaultTimeSlots = [];
        if (row.defaultTimeSlots) {
            try {
                defaultTimeSlots = JSON.parse(row.defaultTimeSlots);
            } catch (parseError) {
                 console.error("Error parsing defaultTimeSlots:", parseError);
                 // Optionally return a warning in the response
            }
        }
        res.json({ success: true, settings: { ...row, defaultTimeSlots } });
    } catch (error) {
         console.error("Error fetching settings:", error);
         res.status(500).json({ success: false, message: "Database error fetching settings." });
    }
});

app.put("/api/settings", async (req, res) => {
    const { doctorName, clinicName, notificationEmail, adminPassword, confirmAdminPassword, defaultTimeSlots } = req.body;
    let hashedPassword = null;

    // Only validate/hash password if provided
    if (adminPassword) {
         if (adminPassword !== confirmAdminPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match." });
        }
        try {
            const saltRounds = 10;
            hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
        } catch (error) {
            console.error("Error hashing admin password during settings update:", error);
            return res.status(500).json({ success: false, message: "Error processing password update." });
        }
    }

    try {
        // Build the SQL query dynamically
        let sql = "UPDATE settings SET doctorName = ?, clinicName = ?, notificationEmail = ?, defaultTimeSlots = ?";
        // Use null for missing optional fields, ensure defaultTimeSlots is stringified array
        const params = [
            doctorName || null,
            clinicName || null,
            notificationEmail || null,
            JSON.stringify(Array.isArray(defaultTimeSlots) ? defaultTimeSlots : [])
        ];

        if (hashedPassword) {
            sql += ", adminPassword = ?";
            params.push(hashedPassword);
        }
        sql += " WHERE id = 1";

        const result = await runDb(sql, params);

        if (result.changes === 0) {
            // This might happen if the settings row doesn't exist (id=1)
            return res.status(404).json({ success: false, message: "Settings record not found for update." });
        }
        res.json({ success: true, message: "Settings updated successfully." });

    } catch (error) {
         console.error("Error updating settings:", error);
         res.status(500).json({ success: false, message: "Database error updating settings." });
    }
});


// Schedule
app.get("/api/schedule/:year/:month", async (req, res) => { // Made async
    const { year, month } = req.params;

    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ success: false, message: "Invalid year or month parameter." });
    }

    const formattedMonth = String(monthNum).padStart(2, "0");
    const startDate = `${yearNum}-${formattedMonth}-01`;
    const endDate = new Date(yearNum, monthNum, 0).toISOString().split("T")[0]; // Last day

    const sql = `SELECT date, availableSlots, bookedSlots FROM schedule WHERE date >= ? AND date <= ?`;

    try {
        const rows = await allDb(sql, [startDate, endDate]); // Use allDb helper
        const scheduleData = rows.reduce((acc, row) => {
            let availableSlots = [];
            let bookedSlots = {};
            try {
                if (row.availableSlots) availableSlots = JSON.parse(row.availableSlots);
            } catch (e) { console.error(`Error parsing availableSlots for date ${row.date}:`, e); }
             try {
                if (row.bookedSlots) bookedSlots = JSON.parse(row.bookedSlots);
            } catch (e) { console.error(`Error parsing bookedSlots for date ${row.date}:`, e); }

            acc[row.date] = { availableSlots, bookedSlots };
            return acc;
        }, {});
        res.json({ success: true, schedule: scheduleData });
    } catch (error) {
         console.error("Error fetching schedule:", error);
         res.status(500).json({ success: false, message: "Database error fetching schedule." });
    }
});

app.post("/api/schedule", async (req, res) => { // Made async
    const { date, availableSlots } = req.body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(availableSlots)) {
        return res.status(400).json({ success: false, message: "Valid date (YYYY-MM-DD) and available slots array are required." });
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!availableSlots.every(slot => typeof slot === 'string' && timeRegex.test(slot))) {
         return res.status(400).json({ success: false, message: "All available slots must be strings in HH:MM format." });
    }

    const availableSlotsJson = JSON.stringify(availableSlots.sort());
    // Preserve existing bookedSlots when updating availableSlots
    const sql = `INSERT INTO schedule (date, availableSlots, bookedSlots)
                 VALUES (?, ?, '{}')
                 ON CONFLICT(date) DO UPDATE SET
                 availableSlots = excluded.availableSlots`; // Only update availableSlots

    try {
        await runDb(sql, [date, availableSlotsJson]);
        res.json({ success: true, message: `Schedule for ${date} saved successfully.` });
    } catch (error) {
        console.error("Error saving schedule:", error);
        res.status(500).json({ success: false, message: "Database error saving schedule." });
    }
});

// Appointments
app.get("/api/appointments", async (req, res) => { // Made async
    const sql = "SELECT * FROM appointments ORDER BY date DESC, time ASC";
    try {
        const rows = await allDb(sql); // Use allDb helper
        res.json({ success: true, appointments: rows });
    } catch (error) {
        console.error("Error fetching appointments:", error);
        res.status(500).json({ success: false, message: "Database error fetching appointments." });
    }
});

app.post("/api/appointments", async (req, res) => { // Made async
    const {
        date, time, patientName, patientPhone, patientEmail,
        appointmentReason = null, notes = null, isRegular = 0, regularPatientId = null
    } = req.body;

    if (!date || !time || !patientName || !patientPhone || !patientEmail) {
        return res.status(400).json({ success: false, message: "Missing required appointment fields (date, time, name, phone, email)." });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
         return res.status(400).json({ success: false, message: "Invalid date or time format." });
    }

    // Use transaction for atomicity - wrap in a promise for easier async/await
    const runTransaction = (actions) => {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run("BEGIN TRANSACTION;");
                actions()
                    .then(() => {
                        db.run("COMMIT;", (commitErr) => {
                            if (commitErr) reject(commitErr); else resolve();
                        });
                    })
                    .catch((err) => {
                        db.run("ROLLBACK;", () => reject(err)); // Rollback on error
                    });
            });
        });
    };


    try {
        await runTransaction(async () => {
            const scheduleRow = await getDb("SELECT availableSlots, bookedSlots FROM schedule WHERE date = ?", [date]);

            if (!scheduleRow) {
                throw new Error(`No schedule found for date ${date}. Cannot book.`); // Throw error to trigger rollback
            }

            let availableSlots = [];
            let bookedSlots = {};
            try {
                availableSlots = scheduleRow.availableSlots ? JSON.parse(scheduleRow.availableSlots) : [];
                bookedSlots = scheduleRow.bookedSlots ? JSON.parse(scheduleRow.bookedSlots) : {};
            } catch (parseError) {
                 console.error(`Error parsing schedule data for booking on ${date}:`, parseError);
                 throw new Error("Error reading schedule data."); // Throw error to trigger rollback
            }

            if (!availableSlots.includes(time) || bookedSlots[time]) {
                throw new Error(`Time slot ${time} on ${date} is not available or already booked.`); // Throw error
            }

            const insertSql = `INSERT INTO appointments
                (date, time, patientName, patientPhone, patientEmail, appointmentReason, notes, isRegular, regularPatientId, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`;
            const insertParams = [date, time, patientName, patientPhone, patientEmail, appointmentReason, notes, isRegular, regularPatientId];
            const insertResult = await runDb(insertSql, insertParams); // Await insertion

            const newAppointmentId = insertResult.lastID;

            bookedSlots[time] = { patientName: patientName, appointmentId: newAppointmentId };
            const updateSql = "UPDATE schedule SET bookedSlots = ? WHERE date = ?";
            await runDb(updateSql, [JSON.stringify(bookedSlots), date]); // Await update

            // If we reach here, all DB operations in the transaction were successful
             // Send the success response INSIDE the transaction completion if possible,
             // or signal success upwards. For simplicity, sending here directly BEFORE commit.
             // Note: It's safer to send response AFTER commit resolves.
             // A better pattern might be needed if the response relies on commit success.
            res.status(201).json({ success: true, message: "Appointment created successfully.", appointmentId: newAppointmentId });
        });
         // If runTransaction resolves without error, the response was already sent.
         // If it rejects, the catch block handles the error response.

    } catch (error) {
         console.error("Error during appointment booking transaction:", error.message);
         // Determine status code based on error type if possible
         // Only send error response if headers haven't been sent yet
         if (!res.headersSent) {
             if (error.message.includes("No schedule found") || error.message.includes("not available")) {
                 res.status(400).json({ success: false, message: error.message });
             } else {
                 res.status(500).json({ success: false, message: "Server error creating appointment." });
             }
         }
    }
});


app.put("/api/appointments/:id/cancel", async (req, res) => { // Made async
    const appointmentId = req.params.id;

    if (isNaN(parseInt(appointmentId, 10))) {
         return res.status(400).json({ success: false, message: "Invalid appointment ID." });
    }

    const runTransaction = (actions) => {
        // Transaction helper that passes result back up
        return new Promise((resolve, reject) => {
            if (!db) return reject(new Error("DB connection lost before transaction"));
            db.serialize(() => {
                db.run("BEGIN TRANSACTION;", (beginErr) => {
                    if (beginErr) return reject(beginErr);
                    actions()
                        .then((result) => { // Get result from actions
                            db.run("COMMIT;", (commitErr) => {
                                if (commitErr) {
                                    console.error("Commit failed during cancel:", commitErr);
                                    db.run("ROLLBACK;", () => reject(commitErr));
                                } else resolve(result); // Resolve with the result
                            });
                        })
                        .catch((err) => {
                            console.error("Cancel action failed, rolling back:", err);
                            db.run("ROLLBACK;", () => reject(err));
                        });
                });
            });
        });
    };

    try {
        const resultMessage = await runTransaction(async () => { // Await the transaction promise
            const apptRow = await getDb("SELECT date, time, status FROM appointments WHERE id = ?", [appointmentId]);

            if (!apptRow) throw new Error("Appointment not found.");
            if (apptRow.status === 'cancelled') throw new Error("Appointment is already cancelled.");

            const { date, time } = apptRow;

            const updateResult = await runDb("UPDATE appointments SET status = ? WHERE id = ?", ["cancelled", appointmentId]);
            if (updateResult.changes === 0) throw new Error("Appointment not found during update.");

            const scheduleRow = await getDb("SELECT bookedSlots FROM schedule WHERE date = ?", [date]);

            if (scheduleRow && scheduleRow.bookedSlots) {
                 let bookedSlots = {};
                 try { bookedSlots = JSON.parse(scheduleRow.bookedSlots); } catch(e) { console.warn("Error parsing bookedSlots during cancel:", e); }

                 if (bookedSlots[time]) {
                     delete bookedSlots[time];
                     await runDb("UPDATE schedule SET bookedSlots = ? WHERE date = ?", [JSON.stringify(bookedSlots), date]);
                     return "Appointment cancelled and schedule updated."; // Return result message
                 } else {
                    return "Appointment cancelled (schedule slot was not marked as booked)."; // Return result message
                 }
            } else {
                 return "Appointment cancelled (schedule not found for date to update)."; // Return result message
            }
        });
         res.json({ success: true, message: resultMessage }); // Send response after transaction succeeds

    } catch (error) {
        console.error("Error during appointment cancellation transaction:", error.message);
         if (!res.headersSent) { // Check if response already sent (unlikely here but good practice)
             if (error.message.includes("not found") || error.message.includes("already cancelled")) {
                 res.status(404).json({ success: false, message: error.message });
             } else {
                 res.status(500).json({ success: false, message: "Server error cancelling appointment." });
             }
         }
    }
});


// --- Start Server Function ---
// Encapsulate server start logic
function startServer() {
    // Store server instance to potentially close it later during graceful shutdown
    const server = app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });

    // Handle common server errors
    server.on('error', (error) => {
        if (error.syscall !== 'listen') {
            throw error;
        }
        switch (error.code) {
            case 'EACCES':
                console.error(`Port ${port} requires elevated privileges`);
                process.exit(1);
                break;
            case 'EADDRINUSE':
                console.error(`Port ${port} is already in use`);
                process.exit(1);
                break;
            default:
                throw error;
        }
    });

    // Optional: Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      // Application specific logging, throwing an error, or other logic here
    });
}

// Graceful shutdown
process.on("SIGINT", () => {
    console.log("SIGINT signal received: closing HTTP server and DB connection.");
    // Ideally, close the server first before closing DB
    // For simplicity here, just closing DB
    console.log("Closing DB connection...");
    if (db) {
        db.close((err) => {
            if (err) {
                console.error("Error closing database:", err.message);
                process.exit(1); // Exit with error if DB close fails
            } else {
                console.log("Closed the database connection.");
                process.exit(0); // Exit cleanly after DB close
            }
        });
    } else {
        process.exit(0); // Exit if DB wasn't even opened
    }

    // Add a timeout to force exit if DB close hangs
    setTimeout(() => {
        console.error("Database close timed out, forcing exit.");
        process.exit(1);
    }, 5000); // 5 seconds timeout
});

// Make sure there are no stray characters or code after this point