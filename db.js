const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wedding_fauzi_firna',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
};

let pool = null;

async function initDatabase() {
  // 1. Connect without database to create it if needed
  const tempConn = await mysql.createConnection({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password
  });

  await tempConn.execute(
    `CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await tempConn.end();

  // 2. Create connection pool
  pool = mysql.createPool(DB_CONFIG);

  // 3. Create tables
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS guests (
      id BIGINT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(120) DEFAULT '',
      phone VARCHAR(50) DEFAULT '',
      category VARCHAR(100) DEFAULT 'Undangan',
      side VARCHAR(100) DEFAULT 'Umum',
      max_guests INT DEFAULT 1,
      notes TEXT,
      invitation_token VARCHAR(64) NOT NULL UNIQUE,
      checked_in_at VARCHAR(60) DEFAULT '',
      total_views INT DEFAULT 0,
      responded_at VARCHAR(60) DEFAULT '',
      last_viewed_at VARCHAR(60) DEFAULT '',
      created_at VARCHAR(60) DEFAULT ''
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS rsvps (
      id BIGINT PRIMARY KEY,
      guest_id BIGINT DEFAULT NULL,
      guest_token VARCHAR(64) DEFAULT '',
      name VARCHAR(255) NOT NULL,
      attendance VARCHAR(20) NOT NULL,
      guests INT DEFAULT 1,
      phone VARCHAR(50) DEFAULT '',
      \`relation\` VARCHAR(100) DEFAULT '',
      meal_preference VARCHAR(100) DEFAULT '',
      message TEXT,
      is_approved TINYINT(1) DEFAULT 0,
      checked_in_at VARCHAR(60) DEFAULT '',
      created_at VARCHAR(60) DEFAULT '',
      updated_at VARCHAR(60) DEFAULT '',
      INDEX idx_guest_token (guest_token),
      INDEX idx_guest_id (guest_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS photos (
      id BIGINT PRIMARY KEY,
      guest_token VARCHAR(64) DEFAULT '',
      guest_name VARCHAR(255) DEFAULT 'Tamu',
      caption TEXT,
      image_url VARCHAR(500) DEFAULT '',
      is_approved TINYINT(1) DEFAULT 1,
      created_at VARCHAR(60) DEFAULT '',
      INDEX idx_guest_token (guest_token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id BIGINT PRIMARY KEY,
      token VARCHAR(64) DEFAULT '',
      path VARCHAR(255) DEFAULT '/',
      source VARCHAR(50) DEFAULT 'web',
      session_id VARCHAR(100) DEFAULT '',
      created_at VARCHAR(60) DEFAULT '',
      INDEX idx_token (token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS analytics_counters (
      id INT PRIMARY KEY DEFAULT 1,
      total_views INT DEFAULT 0,
      anonymous_views INT DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Seed counters row if not present
  await pool.execute(`
    INSERT IGNORE INTO analytics_counters (id, total_views, anonymous_views) VALUES (1, 0, 0)
  `);

  console.log('✅ Database dan tabel berhasil disiapkan.');
  return pool;
}

function getPool() {
  if (!pool) throw new Error('Database belum diinisialisasi. Panggil initDatabase() terlebih dahulu.');
  return pool;
}

module.exports = { initDatabase, getPool };
