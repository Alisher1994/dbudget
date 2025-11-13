// Скрипт для обновления базы данных - добавление новых полей
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway') 
    ? { rejectUnauthorized: false } 
    : false
});

async function updateDatabase() {
  try {
    console.log('Добавление новых полей...');
    
    // Добавляем телефон к пользователям
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
    `);
    
    // Добавляем фото к объектам
    await pool.query(`
      ALTER TABLE objects 
      ADD COLUMN IF NOT EXISTS photo TEXT;
    `);

    console.log('✓ Поля успешно добавлены!');
    console.log('- users.phone (телефон клиента)');
    console.log('- objects.photo (URL фото объекта)');
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Ошибка обновления:', err);
    process.exit(1);
  }
}

updateDatabase();
