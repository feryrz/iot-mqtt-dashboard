const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path from environment or default
const dbPath = process.env.DB_PATH || path.join(__dirname, 'iot_data.db');

// Initialize SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log(`Connected to SQLite database at ${dbPath}`);
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Create devices table
db.run(`
  CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) {
    console.error('Error creating devices table:', err.message);
  } else {
    console.log('Devices table ready');
  }
});

// Create readings table
db.run(`
  CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    voltage REAL NOT NULL,
    current REAL NOT NULL,
    battery_soh REAL NOT NULL,
    soh_measurement_time DATETIME,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
  )
`, (err) => {
  if (err) {
    console.error('Error creating readings table:', err.message);
  } else {
    console.log('Readings table ready');
  }
});

// Create indexes for performance
db.run(`
  CREATE INDEX IF NOT EXISTS idx_readings_device_id 
  ON readings(device_id)
`, (err) => {
  if (err) {
    console.error('Error creating device_id index:', err.message);
  }
});

db.run(`
  CREATE INDEX IF NOT EXISTS idx_readings_timestamp 
  ON readings(timestamp DESC)
`, (err) => {
  if (err) {
    console.error('Error creating timestamp index:', err.message);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});

module.exports = db;
