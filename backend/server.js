require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000; // Use PORT from env variable if available (for platforms like Zeabur)

// --- Middleware ---

// Enable CORS - Adjust origin for production if needed
app.use(cors()); 

// Parse JSON request bodies
app.use(express.json());

// --- Database Setup ---
// Store DB in the root directory, one level up from backend/
const dbPath = path.resolve(__dirname, "..", process.env.DB_PATH || "database.db"); 
console.log(`Database path: ${dbPath}`);

let db; // Declare db variable

// Function to initialize database schema and default settings
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
                adminPassword TEXT,
                notificationEmail TEXT,
                defaultTimeSlots TEXT
            )`, (err) => handleTableErr("settings", err));

            database.run(`CREATE TABLE IF NOT EXISTS schedule (
                date TEXT PRIMARY KEY,
                availableSlots TEXT,
                bookedSlots TEXT
            )`, (err) => handleTableErr("schedule", err));

            database.run(`CREATE TABLE IF NOT EXISTS appointments (
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
            )`, (err) => handleTableErr("appointments", err));

            database.run(`CREATE TABLE IF NOT EXISTS regular_patients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT NOT NULL,
                frequency TEXT NOT NULL,
                dayOfWeek INTEGER NOT NULL,
                timeSlot TEXT NOT NULL,
                notes TEXT
            )`, (err) => {
                handleTableErr("regular_patients", err);

                // After last table creation attempt, check/insert default settings
                database.get("SELECT 1 FROM settings WHERE id = 1", async (getErr, row) => {
                    if (getErr) {
                        console.error("Error checking settings existence:", getErr.message);
                        return reject(getErr); // Reject the main promise
                    }

                    if (!row) {
                        console.log("No settings found, inserting defaults...");
                        const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
                        const saltRounds = 10;
                        try {
                            const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);
                            const defaultSlots = JSON.stringify(["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]);
                            database.run(`INSERT INTO settings (id, adminPassword, defaultTimeSlots) VALUES (1, ?, ?)`,
                                       [hashedPassword, defaultSlots],
                                       (insertErr) => {
                                if (insertErr) {
                                     console.error("Error inserting default settings:", insertErr.message);
                                     reject(insertErr); // Reject on insertion error
                                } else {
                                     console.log("Default settings inserted.");
                                     resolve(); // Resolve the promise *after* successful insertion
                                }
                            });
                        } catch (hashError) {
                            console.error("Error hashing default password:", hashError);
                            reject(hashError); // Reject on hashing error
                        }
                    } else {
                        console.log("Settings already initialized.");
                        resolve(); // Resolve if settings already exist
                    }
                });
            });
        });
    });
}

// Connect to Database and Initialize
db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, async (err) => {
    if (err) {
        console.error("FATAL: Error opening database:", err.message);
        process.exit(1); // Exit if DB cannot be opened/created
    } else {
        console.log("Connected to the SQLite database.");
        try {
            await initializeDatabase(db);
            console.log("Database initialization complete.");
            // Start the server only after successful DB initialization
            startServer();
        } catch (initError) {
            console.error("FATAL: Database initialization failed:", initError);
            db.close(); // Close DB connection on init error
            process.exit(1); // Exit if DB init fails
        }
    }
});

// --- API Routes --- 
// (Keep all existing API routes: /api/login, /api/settings, /api/schedule, /api/appointments, etc.)

// Authentication
app.post("/api/login", async (req, res) => {
    const { password } = req.body;
    if (!password) {
        return res.status(400).json({ success: false, message: "Password is required." });
    }

    db.get("SELECT adminPassword FROM settings WHERE id = 1", async (err, row) => {
        if (err) {
            console.error("Error fetching admin password:", err);
            return res.status(500).json({ success: false, message: "Database error during login." });
        }
        if (!row || !row.adminPassword) {
            return res.status(401).json({ success: false, message: "Admin password not set or found." });
        }

        try {
            const match = await bcrypt.compare(password, row.adminPassword);
            if (match) {
                // In a real app, generate and return a JWT token here
                res.json({ success: true, message: "Login successful." });
            } else {
                res.status(401).json({ success: false, message: "Invalid password." });
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
            res.json({ success: true, settings: { ...row, defaultTimeSlots: [] }, warning: "Could not parse default time slots." });
        }
    });
});

app.put("/api/settings", async (req, res) => {
    const { doctorName, clinicName, notificationEmail, adminPassword, confirmAdminPassword, defaultTimeSlots } = req.body;
    let hashedPassword = null;

    if (adminPassword && adminPassword !== confirmAdminPassword) {
        return res.status(400).json({ success: false, message: "Passwords do not match." });
    }

    try {
        if (adminPassword) {
            const saltRounds = 10;
            hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
        }

        let sql = "UPDATE settings SET doctorName = ?, clinicName = ?, notificationEmail = ?, defaultTimeSlots = ?";
        const params = [doctorName, clinicName, notificationEmail, JSON.stringify(defaultTimeSlots || [])];

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
                 return res.status(404).json({ success: false, message: "Settings record not found for update." });
            }
            res.json({ success: true, message: "Settings updated successfully." });
        });

    } catch (error) {
        console.error("Error processing settings update:", error);
        res.status(500).json({ success: false, message: "Server error processing settings update." });
    }
});


// Schedule
app.get("/api/schedule/:year/:month", (req, res) => {
    const { year, month } = req.params;
    const formattedMonth = month.padStart(2, "0");
    const startDate = `${year}-${formattedMonth}-01`;
    const tempDate = new Date(year, month, 1); // Use month directly (JS month is 0-indexed)
    tempDate.setMonth(tempDate.getMonth() -1); // Go to previous month
    tempDate.setDate(0); // Go to last day of previous month
    const endDate = new Date(year, month, 0).toISOString().split("T")[0]; // Last day of current month

    const sql = `SELECT date, availableSlots, bookedSlots FROM schedule WHERE date >= ? AND date <= ?`;

    db.all(sql, [startDate, endDate], (err, rows) => {
        if (err) {
            console.error("Error fetching schedule:", err);
            return res.status(500).json({ success: false, message: "Database error fetching schedule." });
        }
        const scheduleData = rows.reduce((acc, row) => {
            try {
                acc[row.date] = {
                    availableSlots: row.availableSlots ? JSON.parse(row.availableSlots) : [],
                    bookedSlots: row.bookedSlots ? JSON.parse(row.bookedSlots) : {}
                };
            } catch (e) {
                console.error(`Error parsing schedule data for date ${row.date}:`, e);
                 acc[row.date] = { availableSlots: [], bookedSlots: {} };
            }
            return acc;
        }, {});
        res.json({ success: true, schedule: scheduleData });
    });
});

app.post("/api/schedule", (req, res) => {
    const { date, availableSlots } = req.body;

    if (!date || !availableSlots) {
        return res.status(400).json({ success: false, message: "Date and available slots are required." });
    }

    const availableSlotsJson = JSON.stringify(availableSlots);
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
    const { date, time, patientName, patientPhone, patientEmail, appointmentReason, notes, isRegular, regularPatientId } = req.body;

    if (!date || !time || !patientName || !patientPhone || !patientEmail) {
        return res.status(400).json({ success: false, message: "Missing required appointment fields." });
    }

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
                return res.status(400).json({ success: false, message: `No schedule found for date ${date}.` });
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
            if (!availableSlots.includes(time) || bookedSlots[time]) {
                db.run("ROLLBACK;");
                return res.status(400).json({ success: false, message: `Time slot ${time} on ${date} is not available.` });
            }
            const insertSql = `INSERT INTO appointments 
                (date, time, patientName, patientPhone, patientEmail, appointmentReason, notes, isRegular, regularPatientId, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`;
            const insertParams = [date, time, patientName, patientPhone, patientEmail, appointmentReason || null, notes || null, isRegular || 0, regularPatientId || null];
            db.run(insertSql, insertParams, function(err) {
                if (err) {
                    console.error("DB Error inserting appointment:", err);
                    db.run("ROLLBACK;");
                    return res.status(500).json({ success: false, message: "Database error creating appointment." });
                }
                const newAppointmentId = this.lastID;
                bookedSlots[time] = { patientName: patientName, appointmentId: newAppointmentId };
                const updateSql = "UPDATE schedule SET bookedSlots = ? WHERE date = ?";
                db.run(updateSql, [JSON.stringify(bookedSlots), date], (err) => {
                    if (err) {
                        console.error("DB Error updating schedule bookedSlots:", err);
                        db.run("ROLLBACK;");
                        db.run("DELETE FROM appointments WHERE id = ?", [newAppointmentId], () => {}); 
                        return res.status(500).json({ success: false, message: "Database error updating schedule after booking." });
                    }
                    db.run("COMMIT;", (commitErr) => {
                         if (commitErr) {
                            console.error("DB Error committing transaction:", commitErr);
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
    db.serialize(() => {
        db.run("BEGIN TRANSACTION;");
        db.get("SELECT date, time FROM appointments WHERE id = ?", [appointmentId], (err, apptRow) => {
            if (err) {
                console.error("DB Error fetching appointment for cancellation:", err);
                db.run("ROLLBACK;");
                return res.status(500).json({ success: false, message: "Database error fetching appointment details." });
            }
            if (!apptRow) {
                db.run("ROLLBACK;");
                return res.status(404).json({ success: false, message: "Appointment not found." });
            }
            const { date, time } = apptRow;
            db.run("UPDATE appointments SET status = ? WHERE id = ?", ["cancelled", appointmentId], function(err) {
                if (err) {
                    console.error("DB Error cancelling appointment:", err);
                    db.run("ROLLBACK;");
                    return res.status(500).json({ success: false, message: "Database error updating appointment status." });
                }
                if (this.changes === 0) {
                     db.run("ROLLBACK;");
                     return res.status(404).json({ success: false, message: "Appointment not found during update." });
                }
                db.get("SELECT bookedSlots FROM schedule WHERE date = ?", [date], (err, scheduleRow) => {
                    if (err) {
                        console.error("DB Error fetching schedule for cancellation update:", err);
                        db.run("ROLLBACK;");
                        return res.status(500).json({ success: false, message: "Database error fetching schedule to update." });
                    }
                    if (scheduleRow && scheduleRow.bookedSlots) {
                        try {
                            let bookedSlots = JSON.parse(scheduleRow.bookedSlots);
                            if (bookedSlots[time]) {
                                delete bookedSlots[time];
                                db.run("UPDATE schedule SET bookedSlots = ? WHERE date = ?", [JSON.stringify(bookedSlots), date], (err) => {
                                    if (err) {
                                        console.error("DB Error updating schedule bookedSlots after cancellation:", err);
                                        db.run("ROLLBACK;");
                                        return res.status(500).json({ success: false, message: "Database error updating schedule." });
                                    }
                                    db.run("COMMIT;", (commitErr) => {
                                        if (commitErr) {
                                            console.error("DB Error committing cancellation:", commitErr);
                                            return res.status(500).json({ success: false, message: "Database error committing cancellation." });
                                        }
                                        res.json({ success: true, message: "Appointment cancelled successfully." });
                                    });
                                });
                            } else {
                                // Slot wasn't booked, commit the status change anyway
                                db.run("COMMIT;", (commitErr) => {
                                    if (commitErr) {
                                        console.error("DB Error committing cancellation (slot not found):", commitErr);
                                        return res.status(500).json({ success: false, message: "Database error committing cancellation." });
                                    }
                                    res.json({ success: true, message: "Appointment cancelled (schedule slot not found)." });
                                });
                            }
                        } catch (parseError) {
                            console.error(`Error parsing bookedSlots for cancellation on ${date}:`, parseError);
                            db.run("ROLLBACK;");
                            return res.status(500).json({ success: false, message: "Error reading schedule data during cancellation." });
                        }
                    } else {
                        // No schedule row or bookedSlots, commit the status change anyway
                        db.run("COMMIT;", (commitErr) => {
                            if (commitErr) {
                                console.error("DB Error committing cancellation (no schedule found):", commitErr);
                                return res.status(500).json({ success: false, message: "Database error committing cancellation." });
                            }
                            res.json({ success: true, message: "Appointment cancelled (schedule not found)." });
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
    app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
}

// Graceful shutdown
process.on("SIGINT", () => {
    console.log("SIGINT signal received: closing HTTP server and DB connection.");
    // Close server first if needed (app.close() requires the server instance)
    db.close((err) => {
        if (err) {
            console.error("Error closing database:", err.message);
        } else {
            console.log("Closed the database connection.");
        }
        process.exit(0);
    });
}); 