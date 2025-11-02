const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// Ensure data directory exists
const dataDir = path.dirname(process.env.DB_PATH || "./data/m_hike.db");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize SQLite database
const db = new Database(process.env.DB_PATH || "./data/m_hike.db");

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Enable WAL mode for better concurrency
db.pragma("journal_mode = WAL");

// Initialize database schema
const initDatabase = () => {
  try {
    // Users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        avatar TEXT DEFAULT 'default_avatar.png',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1
      )
    `);

    // Hikes table
    db.exec(`
      CREATE TABLE IF NOT EXISTS hikes (
        hike_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        hike_date DATE NOT NULL,
        parking_available INTEGER NOT NULL,
        length REAL NOT NULL,
        difficulty_level TEXT NOT NULL,
        description TEXT,
        estimated_duration TEXT,
        elevation_gain INTEGER,
        trail_type TEXT,
        equipment_needed TEXT,
        weather_conditions TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);

    // Create index on user_id for faster queries
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_hikes_user_id ON hikes(user_id)
    `);

    // Create index on name for search
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_hikes_name ON hikes(name)
    `);

    // Observations table
    db.exec(`
      CREATE TABLE IF NOT EXISTS observations (
        observation_id INTEGER PRIMARY KEY AUTOINCREMENT,
        hike_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        observation TEXT NOT NULL,
        observation_time DATETIME NOT NULL,
        comments TEXT,
        observation_type TEXT,
        photo_url TEXT,
        latitude REAL,
        longitude REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (hike_id) REFERENCES hikes(hike_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);

    // Create indexes on observations
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_observations_hike_id ON observations(hike_id)
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_observations_user_id ON observations(user_id)
    `);

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
};

// Initialize on module load
initDatabase();

module.exports = db;
