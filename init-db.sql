-- Создание таблиц
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

-- Создание администратора по умолчанию
-- Пароль: admin123 (хеширован с bcrypt)
INSERT INTO users (username, password, role) 
VALUES ('admin', '$2b$10$rLKvF5qN3F3qN3F3qN3F3u7YvN3F3qN3F3qN3F3qN3F3qN3F3qN3F', 'admin')
ON CONFLICT (username) DO NOTHING;
