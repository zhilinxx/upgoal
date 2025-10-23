import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create a single shared pool
const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'upgoals',
  port: Number(process.env.DB_PORT ?? 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Optional: quick connectivity check on boot
export async function connectDB() {
  try {
    await pool.query('SELECT 1');
    console.log('✅ MySQL connected');
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
    process.exit(1);
  }
}

// If you prefer a named accessor instead of importing default
export function getDB() {
  return pool;
}

// Default export for places that do `import pool from ...`
export default pool;
