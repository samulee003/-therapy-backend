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

let db; // Declare db variable

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
// (Keep all existing API routes...)

// Authentication
// Implements multi-user login based on users table
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body; // Expect username (email) and password

    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password are required." });
    }

    // Find user by username (email) in the users table
    const sql = "SELECT * FROM users WHERE username = ?";
    db.get(sql, [username], async (err, user) => {
        if (err) {
            console.error("Error fetching user during login:", err);
            return res.status(500).json({ success: false, message: "Database error during login." });
        }

        // User not found
        if (!user) {
            // Use a generic message for security (don't reveal if username exists)
            return res.status(401).json({ success: false, message: "Invalid username or password." });
        }

        // User found, compare password
        try {
            const match = await bcrypt.compare(password, user.password); // Compare with hashed password from DB
            if (match) {
                // Login successful
                // IMPORTANT: In a real app, generate and return a JWT token here
                // For now, just return success and basic user info (excluding password)
                const userInfo = {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    role: user.role
                };
                res.json({
                    success: true,
                    message: "Login successful.",
                    user: userInfo // Send back basic user info
                    // token: generatedToken // TODO: Add JWT token later
                });
            } else {
                // Password doesn't match
                res.status(401).json({ success: false, message: "Invalid username or password." }); // Generic message
            }
        } catch (compareError) {
            console.error("Error comparing password:", compareError);
            res.status(500).json({ success: false, message: "Error during authentication." });
        }
    });
});

// Settings
app.get("/api/settings", (req, res) => {
    db.get("SELECT doctorName, clinicName, notificationEmail, defaultTimeSlots FROM settings WHERE id = 1", (err, row) => {
        if (err) {
            console.error("Error fetching settings:", err);
            return res.status(500).json({ success: false, message: "Database error fetching settings." });
        }
        if (!row) {
            return res.status(404).json({ success: false, message: "Settings not found." });
        }
        try {
            const settings = { ...row, defaultTimeSlots: row.defaultTimeSlots ? JSON.parse(row.defaultTimeSlots) : [] };
             res.json({ success: true, settings });
        } catch (parseError) {
            console.error("Error parsing defaultTimeSlots:", parseError);
            // Return row data even if slots parsing fails, with a warning
            res.json({ success: true, settings: { ...row, defaultTimeSlots: [] }, warning: "Could not parse default time slots." });
        }
    });
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


    // Build the SQL query dynamically based on whether password is being updated
    let sql = "UPDATE settings SET doctorName = ?, clinicName = ?, notificationEmail = ?, defaultTimeSlots = ?";
    const params = [
        doctorName || null, // Use null if undefined/empty
        clinicName || null,
        notificationEmail || null,
        JSON.stringify(defaultTimeSlots || []) // Ensure it's always valid JSON string
    ];

    if (hashedPassword) {
        sql += ", adminPassword = ?";
        params.push(hashedPassword);
    }

    sql += " WHERE id = 1";

    db.run(sql, params, function(err) {
        if (err) {
            console.error("Error updating settings:", err);
            return res.status(500).json({ success: false, message: "Database error updating settings." });
        }
        if (this.changes === 0) {
                // This might happen if the settings row doesn't exist (id=1)
                return res.status(404).json({ success: false, message: "Settings record not found for update." });
        }
        res.json({ success: true, message: "Settings updated successfully." });
    });

});


// Schedule
app.get("/api/schedule/:year/:month", (req, res) => {
    const { year, month } = req.params;

    // Validate year and month
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ success: false, message: "Invalid year or month parameter." });
    }

    const formattedMonth = String(monthNum).padStart(2, "0");
    const startDate = `${yearNum}-${formattedMonth}-01`;
    // Calculate end date correctly (last day of the given month)
    const endDate = new Date(yearNum, monthNum, 0).toISOString().split("T")[0];

    const sql = `SELECT date, availableSlots, bookedSlots FROM schedule WHERE date >= ? AND date <= ?`;

    db.all(sql, [startDate, endDate], (err, rows) => {
        if (err) {
            console.error("Error fetching schedule:", err);
            return res.status(500).json({ success: false, message: "Database error fetching schedule." });
        }
        const scheduleData = rows.reduce((acc, row) => {
            try {
                // Ensure availableSlots and bookedSlots are parsed correctly, default to empty if null/invalid
                acc[row.date] = {
                    availableSlots: row.availableSlots ? JSON.parse(row.availableSlots) : [],
                    bookedSlots: row.bookedSlots ? JSON.parse(row.bookedSlots) : {}
                };
            } catch (e) {
                console.error(`Error parsing schedule data for date ${row.date}:`, e);
                 // Provide default empty structure on parsing error
                 acc[row.date] = { availableSlots: [], bookedSlots: {} };
            }
            return acc;
        }, {});
        res.json({ success: true, schedule: scheduleData });
    });
});

app.post("/api/schedule", (req, res) => {
    const { date, availableSlots } = req.body;

    // Basic validation
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(availableSlots)) {
        return res.status(400).json({ success: false, message: "Valid date (YYYY-MM-DD) and available slots array are required." });
    }

    // Validate time format within availableSlots
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!availableSlots.every(slot => typeof slot === 'string' && timeRegex.test(slot))) {
         return res.status(400).json({ success: false, message: "All available slots must be strings in HH:MM format." });
    }

    const availableSlotsJson = JSON.stringify(availableSlots.sort()); // Sort slots before saving
    // Use INSERT OR REPLACE to handle existing dates. Preserve existing bookedSlots.
    const sql = `INSERT OR REPLACE INTO schedule (date, availableSlots, bookedSlots)
                 VALUES (?, ?, COALESCE((SELECT bookedSlots FROM schedule WHERE date = ?), '{}'))`;

    db.run(sql, [date, availableSlotsJson, date], function(err) {
        if (err) {
            console.error("Error saving schedule:", err);
            return res.status(500).json({ success: false, message: "Database error saving schedule." });
        }
        res.json({ success: true, message: `Schedule for ${date} saved successfully.` });
    });
});

// Appointments
app.get("/api/appointments", (req, res) => {
    // Consider adding filtering options (e.g., by date range, status) via query parameters later
    const sql = "SELECT * FROM appointments ORDER BY date DESC, time ASC";
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Error fetching appointments:", err);
            return res.status(500).json({ success: false, message: "Database error fetching appointments." });
        }
        res.json({ success: true, appointments: rows });
    });
});

app.post("/api/appointments", (req, res) => {
    // Destructure expected fields, provide defaults for optional ones
    const {
        date, time, patientName, patientPhone, patientEmail,
        appointmentReason = null, notes = null, isRegular = 0, regularPatientId = null
    } = req.body;

    // Strict validation for required fields
    if (!date || !time || !patientName || !patientPhone || !patientEmail) {
        return res.status(400).json({ success: false, message: "Missing required appointment fields (date, time, name, phone, email)." });
    }
    // Validate date and time format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
         return res.status(400).json({ success: false, message: "Invalid date or time format." });
    }


    // Use transaction for atomicity
    db.serialize(() => {
        db.run("BEGIN TRANSACTION;");

        const checkSql = "SELECT availableSlots, bookedSlots FROM schedule WHERE date = ?";
        db.get(checkSql, [date], (err, scheduleRow) => {
            if (err) {
                console.error("DB Error checking schedule:", err);
                db.run("ROLLBACK;");
                return res.status(500).json({ success: false, message: "Database error checking availability." });
            }

            if (!scheduleRow) {
                db.run("ROLLBACK;");
                return res.status(400).json({ success: false, message: `No schedule found for date ${date}. Cannot book.` });
            }

            let availableSlots = [];
            let bookedSlots = {};
            try {
                availableSlots = scheduleRow.availableSlots ? JSON.parse(scheduleRow.availableSlots) : [];
                bookedSlots = scheduleRow.bookedSlots ? JSON.parse(scheduleRow.bookedSlots) : {};
            } catch (parseError) {
                 console.error(`Error parsing schedule data for booking on ${date}:`, parseError);
                 db.run("ROLLBACK;");
                 return res.status(500).json({ success: false, message: "Error reading schedule data." });
            }

            // Check if the slot is available AND not already booked
            if (!availableSlots.includes(time) || bookedSlots[time]) {
                db.run("ROLLBACK;");
                return res.status(400).json({ success: false, message: `Time slot ${time} on ${date} is not available or already booked.` });
            }

            // Slot is available, proceed to insert appointment
            const insertSql = `INSERT INTO appointments
                (date, time, patientName, patientPhone, patientEmail, appointmentReason, notes, isRegular, regularPatientId, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`;
            const insertParams = [date, time, patientName, patientPhone, patientEmail, appointmentReason, notes, isRegular, regularPatientId];

            db.run(insertSql, insertParams, function(err) {
                if (err) {
                    console.error("DB Error inserting appointment:", err);
                    db.run("ROLLBACK;");
                    return res.status(500).json({ success: false, message: "Database error creating appointment." });
                }

                const newAppointmentId = this.lastID;

                // Update the bookedSlots in the schedule
                bookedSlots[time] = { patientName: patientName, appointmentId: newAppointmentId }; // Add booking info
                const updateSql = "UPDATE schedule SET bookedSlots = ? WHERE date = ?";

                db.run(updateSql, [JSON.stringify(bookedSlots), date], (updateErr) => {
                    if (updateErr) {
                        console.error("DB Error updating schedule bookedSlots:", updateErr);
                        // Attempt to rollback the appointment insertion
                        db.run("ROLLBACK;", () => {
                             // Log or handle rollback error if necessary
                             res.status(500).json({ success: false, message: "Database error updating schedule after booking. Booking rolled back." });
                         });
                        return; // Stop execution here
                    }

                    // If schedule update is successful, commit the transaction
                    db.run("COMMIT;", (commitErr) => {
                         if (commitErr) {
                            console.error("DB Error committing transaction:", commitErr);
                            // This state is problematic - appointment inserted but transaction failed commit
                            return res.status(500).json({ success: false, message: "Database error committing booking." });
                         }
                         res.status(201).json({ success: true, message: "Appointment created successfully.", appointmentId: newAppointmentId });
                    });
                });
            });
        });
    });
});


app.put("/api/appointments/:id/cancel", (req, res) => {
    const appointmentId = req.params.id;

    if (isNaN(parseInt(appointmentId, 10))) {
         return res.status(400).json({ success: false, message: "Invalid appointment ID." });
    }

    db.serialize(() => {
        db.run("BEGIN TRANSACTION;");

        // Get appointment details before cancelling
        db.get("SELECT date, time, status FROM appointments WHERE id = ?", [appointmentId], (err, apptRow) => {
            if (err) {
                console.error("DB Error fetching appointment for cancellation:", err);
                db.run("ROLLBACK;");
                return res.status(500).json({ success: false, message: "Database error fetching appointment details." });
            }
            if (!apptRow) {
                db.run("ROLLBACK;");
                return res.status(404).json({ success: false, message: "Appointment not found." });
            }
            if (apptRow.status === 'cancelled') {
                 db.run("ROLLBACK;");
                 return res.status(400).json({ success: false, message: "Appointment is already cancelled." });
            }

            const { date, time } = apptRow;

            // Update appointment status
            db.run("UPDATE appointments SET status = ? WHERE id = ?", ["cancelled", appointmentId], function(updateErr) {
                if (updateErr) {
                    console.error("DB Error cancelling appointment:", updateErr);
                    db.run("ROLLBACK;");
                    return res.status(500).json({ success: false, message: "Database error updating appointment status." });
                }
                if (this.changes === 0) {
                     // Should not happen due to the check above, but good practice
                     db.run("ROLLBACK;");
                     return res.status(404).json({ success: false, message: "Appointment not found during update." });
                }

                // Update schedule to remove the booking from bookedSlots
                db.get("SELECT bookedSlots FROM schedule WHERE date = ?", [date], (getScheduleErr, scheduleRow) => {
                    if (getScheduleErr) {
                        console.error("DB Error fetching schedule for cancellation update:", getScheduleErr);
                        db.run("ROLLBACK;"); // Rollback status change if we can't update schedule
                        return res.status(500).json({ success: false, message: "Database error fetching schedule to update." });
                    }

                    // Only update schedule if it exists and has booked slots
                    if (scheduleRow && scheduleRow.bookedSlots) {
                        try {
                            let bookedSlots = JSON.parse(scheduleRow.bookedSlots);
                            // Only update if the specific time slot was indeed booked
                            if (bookedSlots[time]) {
                                delete bookedSlots[time]; // Remove the booking for this slot
                                db.run("UPDATE schedule SET bookedSlots = ? WHERE date = ?", [JSON.stringify(bookedSlots), date], (updateScheduleErr) => {
                                    if (updateScheduleErr) {
                                        console.error("DB Error updating schedule bookedSlots after cancellation:", updateScheduleErr);
                                        db.run("ROLLBACK;"); // Rollback status change
                                        return res.status(500).json({ success: false, message: "Database error updating schedule." });
                                    }
                                    // Commit only if schedule update was successful
                                    db.run("COMMIT;", (commitErr) => {
                                        if (commitErr) {
                                            console.error("DB Error committing cancellation:", commitErr);
                                            return res.status(500).json({ success: false, message: "Database error committing cancellation." });
                                        }
                                        res.json({ success: true, message: "Appointment cancelled successfully." });
                                    });
                                });
                            } else {
                                // Slot wasn't in bookedSlots, just commit the status change
                                db.run("COMMIT;", (commitErr) => {
                                    if (commitErr) { /* Handle commit error */ }
                                    res.json({ success: true, message: "Appointment cancelled (schedule slot was not marked as booked)." });
                                });
                            }
                        } catch (parseError) {
                            console.error(`Error parsing bookedSlots for cancellation on ${date}:`, parseError);
                            db.run("ROLLBACK;");
                            return res.status(500).json({ success: false, message: "Error reading schedule data during cancellation." });
                        }
                    } else {
                        // No schedule row or no bookedSlots, just commit the status change
                        db.run("COMMIT;", (commitErr) => {
                            if (commitErr) { /* Handle commit error */ }
                            res.json({ success: true, message: "Appointment cancelled (schedule not found or no booked slots)." });
                        });
                    }
                });
            });
        });
    });
});


// --- Start Server Function ---
// Encapsulate server start logic
function startServer() {
    const server = app.listen(port, () => { // Store server instance
        console.log(`Server listening on port ${port}`);
    });

    // Handle server errors e.g., EADDRINUSE
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
}

// Graceful shutdown
process.on("SIGINT", () => {
    console.log("SIGINT signal received: closing HTTP server and DB connection.");
    // Close server first if needed (requires server instance)
    // Assuming 'server' variable is accessible or handle differently
    console.log("Closing DB connection...");
    db.close((err) => {
        if (err) {
            console.error("Error closing database:", err.message);
            process.exit(1); // Exit with error if DB close fails
        } else {
            console.log("Closed the database connection.");
            process.exit(0); // Exit cleanly after DB close
        }
    });
    // Add a timeout to force exit if DB close hangs
    setTimeout(() => {
        console.error("Database close timed out, forcing exit.");
        process.exit(1);
    }, 5000); // 5 seconds timeout
});
// Ensure there are no stray characters or unterminated comments/strings at the end of the file.