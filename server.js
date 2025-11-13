require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// Подключение к базе данных
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway') 
    ? { rejectUnauthorized: false } 
    : false
});

// Инициализация базы данных
async function initDatabase() {
  try {
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

    // Создаем админа по умолчанию (логин: admin, пароль: admin123)
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO users (username, password, role) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (username) DO NOTHING`,
      ['admin', hashedPassword, 'admin']
    );

    console.log('База данных инициализирована');
  } catch (err) {
    console.error('Ошибка инициализации базы данных:', err);
  }
}

initDatabase();

// Middleware
app.set('trust proxy', 1); // Trust Railway proxy
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: true, // HTTPS через Railway proxy
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 часа
  }
}));

// Middleware для проверки авторизации
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/');
}

function isAdmin(req, res, next) {
  if (req.session.role === 'admin') {
    return next();
  }
  res.status(403).json({ error: 'Доступ запрещен' });
}

// Маршруты страниц
app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API - Авторизация
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    res.json({ success: true, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/user', isAuthenticated, (req, res) => {
  res.json({
    id: req.session.userId,
    username: req.session.username,
    role: req.session.role
  });
});

// API - Объекты
app.get('/api/objects', isAuthenticated, async (req, res) => {
  try {
    let query = 'SELECT objects.*, users.username as client_name FROM objects LEFT JOIN users ON objects.client_id = users.id';
    let params = [];

    // Клиент видит только свои объекты
    if (req.session.role === 'client') {
      query += ' WHERE objects.client_id = $1';
      params = [req.session.userId];
    }

    query += ' ORDER BY objects.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/objects', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, address, budget, client_id, photo } = req.body;
    const result = await pool.query(
      'INSERT INTO objects (name, address, budget, client_id, photo) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, address, budget || 0, client_id || null, photo || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.put('/api/objects/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, budget, spent, client_id, photo } = req.body;
    const result = await pool.query(
      'UPDATE objects SET name = $1, address = $2, budget = $3, spent = $4, client_id = $5, photo = $6 WHERE id = $7 RETURNING *',
      [name, address, budget, spent, client_id || null, photo || null, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.delete('/api/objects/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM objects WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// API - Пользователи
app.get('/api/users', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, role, phone, status, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/users', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { username, password, role, phone, status } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password, role, phone, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, role, phone, status, created_at',
      [username, hashedPassword, role || 'client', phone || null, status || 'active']
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
    }
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.put('/api/users/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { phone, role, status } = req.body;
    
    const result = await pool.query(
      'UPDATE users SET phone = $1, role = $2, status = $3 WHERE id = $4 RETURNING id, username, role, phone, status, created_at',
      [phone || null, role, status || 'active', id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.delete('/api/users/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Нельзя удалить себя
    if (parseInt(id) === req.session.userId) {
      return res.status(400).json({ error: 'Нельзя удалить свою учетную запись' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
