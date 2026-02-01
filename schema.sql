-- Transaction Tracker Database Schema
-- Run: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS transaction_tracker;
USE transaction_tracker;

-- Categories table (predefined spending categories)
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  spending_limit DECIMAL(10, 2) DEFAULT NULL,
  color_code VARCHAR(7) NOT NULL DEFAULT '#6B7280',
  icon VARCHAR(50) NOT NULL DEFAULT 'tag',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO categories (name, color_code, icon) VALUES
  ('Food & Dining', '#EF4444', 'utensils'),
  ('Transportation', '#F59E0B', 'car'),
  ('Shopping', '#8B5CF6', 'shopping-bag'),
  ('Entertainment', '#EC4899', 'film'),
  ('Bills & Utilities', '#3B82F6', 'file-text'),
  ('Healthcare', '#10B981', 'heart'),
  ('Travel', '#06B6D4', 'plane'),
  ('Others', '#6B7280', 'tag')
ON DUPLICATE KEY UPDATE name = name;

-- Transactions table (main transaction data)
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  merchant VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  transaction_date DATETIME NOT NULL,
  category_id INT DEFAULT NULL,
  confidence DECIMAL(3, 2) DEFAULT NULL,
  raw_email TEXT NOT NULL,
  email_id VARCHAR(255) NOT NULL UNIQUE,
  card_ending VARCHAR(4) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,

  -- Indexes for common queries
  INDEX idx_transaction_date (transaction_date),
  INDEX idx_category_id (category_id),
  INDEX idx_amount (amount),
  INDEX idx_merchant (merchant(100)),
  INDEX idx_created_at (created_at)
);

-- Processing log table (tracks email sync jobs)
CREATE TABLE IF NOT EXISTS processing_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  emails_processed INT NOT NULL DEFAULT 0,
  transactions_created INT NOT NULL DEFAULT 0,
  errors INT NOT NULL DEFAULT 0,
  error_details TEXT DEFAULT NULL,
  duration_ms INT NOT NULL DEFAULT 0,

  INDEX idx_timestamp (timestamp)
);

-- Category corrections table (for learning from user feedback)
CREATE TABLE IF NOT EXISTS category_corrections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  original_category_id INT DEFAULT NULL,
  corrected_category_id INT NOT NULL,
  merchant VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (original_category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (corrected_category_id) REFERENCES categories(id) ON DELETE CASCADE,

  INDEX idx_merchant (merchant(100)),
  INDEX idx_corrected_category (corrected_category_id)
);

-- Settings table (app configuration)
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO settings (`key`, value) VALUES
  ('cron_interval', '5'),
  ('ollama_model', 'qwen2.5-coder:7b'),
  ('last_sync', ''),
  ('gmail_connected', 'false')
ON DUPLICATE KEY UPDATE `key` = `key`;

-- View for transactions with category info
CREATE OR REPLACE VIEW transactions_with_categories AS
SELECT
  t.id,
  t.merchant,
  t.amount,
  t.transaction_date,
  t.category_id,
  c.name AS category_name,
  c.color_code AS category_color,
  c.icon AS category_icon,
  t.confidence,
  t.card_ending,
  t.created_at,
  t.updated_at
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id;

-- View for monthly spending by category
CREATE OR REPLACE VIEW monthly_category_spending AS
SELECT
  DATE_FORMAT(t.transaction_date, '%Y-%m') AS month,
  c.id AS category_id,
  c.name AS category_name,
  c.color_code,
  SUM(t.amount) AS total_amount,
  COUNT(t.id) AS transaction_count
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
GROUP BY DATE_FORMAT(t.transaction_date, '%Y-%m'), c.id, c.name, c.color_code
ORDER BY month DESC, total_amount DESC;
