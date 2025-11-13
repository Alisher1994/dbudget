// Добавление статуса пользователям
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway') 
    ? { rejectUnauthorized: false } 
    : false
});

async function addUserStatus() {
  try {
    console.log('Добавление статуса пользователям...');
    
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
      
      UPDATE users SET status = 'active' WHERE status IS NULL;
    `);

    console.log('✓ Статус успешно добавлен!');
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Ошибка:', err);
    process.exit(1);
  }
}

addUserStatus();
