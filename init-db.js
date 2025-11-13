// Скрипт для инициализации базы данных
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway') 
    ? { rejectUnauthorized: false } 
    : false
});

async function initDatabase() {
  try {
    console.log('Создание таблиц...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'client',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS objects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        budget DECIMAL(12, 2) DEFAULT 0,
        spent DECIMAL(12, 2) DEFAULT 0,
        client_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Таблицы созданы успешно!');

    // Создаем админа по умолчанию
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO users (username, password, role) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (username) DO NOTHING`,
      ['admin', hashedPassword, 'admin']
    );

    console.log('Администратор создан успешно!');
    console.log('Логин: admin');
    console.log('Пароль: admin123');
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Ошибка инициализации:', err);
    process.exit(1);
  }
}

initDatabase();
