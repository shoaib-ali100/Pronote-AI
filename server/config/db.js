const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 4000,
};

const dbName = process.env.DB_NAME || 'pronote_ai';

let pool = null;
let isConnected = false;
let lastError = null;

async function initializeDatabase() {
  try {
    lastError = null;

    // Reload dotenv in case .env was updated
    dotenv.config();
    dbConfig.host = process.env.DB_HOST || 'localhost';
    dbConfig.user = process.env.DB_USER || 'root';
    dbConfig.password = process.env.DB_PASSWORD || '';
    dbConfig.port = parseInt(process.env.DB_PORT || '3306', 10);

    // 1. Connect to MySQL server to ensure DB exists
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port,
      connectTimeout: 4000,
    });

    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await tempConnection.end();

    // 2. Initialize connection pool targeting database
    pool = mysql.createPool({
      ...dbConfig,
      database: dbName,
    });

    // Test the pool connection
    const connection = await pool.getConnection();
    console.log(`[MySQL] Connected successfully to database: "${dbName}" on ${dbConfig.host}:${dbConfig.port}`);
    connection.release();

    // 3. Create tables
    await createTables();
    isConnected = true;
    lastError = null;
    return pool;
  } catch (err) {
    lastError = err.message;
    console.error(`[MySQL Error] Failed to connect (${dbConfig.user}@${dbConfig.host}:${dbConfig.port}): ${err.message}`);
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error(`[MySQL Auth Tip] Access denied for user '${dbConfig.user}'. Please set DB_PASSWORD=your_password in the .env file.`);
    } else if (err.code === 'ECONNREFUSED') {
      console.error(`[MySQL Tip] Could not reach MySQL on port ${dbConfig.port}. Please ensure MySQL service is running.`);
    }
    isConnected = false;
    return null;
  }
}

async function createTables() {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      specialty VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createNotesTable = `
    CREATE TABLE IF NOT EXISTS notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      patient_name VARCHAR(255) NOT NULL,
      visit_type VARCHAR(100) DEFAULT 'General Consultation',
      raw_transcript MEDIUMTEXT NOT NULL,
      subjective TEXT,
      objective TEXT,
      assessment TEXT,
      plan TEXT,
      specialty VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await pool.query(createUsersTable);
  await pool.query(createNotesTable);
  console.log('[MySQL] Database tables (users, notes) verified/created successfully.');
}

function getPool() {
  return pool;
}

function checkConnection() {
  return isConnected;
}

function getLastError() {
  return lastError;
}

module.exports = {
  initializeDatabase,
  getPool,
  checkConnection,
  getLastError,
};
