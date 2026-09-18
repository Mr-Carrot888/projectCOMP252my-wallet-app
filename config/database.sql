-- 1. สร้างฐานข้อมูลใหม่
CREATE DATABASE IF NOT EXISTS budget_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE budget_db;

-- 2. สร้างตาราง: ผู้ใช้งาน (users)
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. สร้างตาราง: บัญชี/กระเป๋าเงิน (accounts)
CREATE TABLE accounts (
    account_id INT AUTO_INCREMENT PRIMARY KEY,
    account_name VARCHAR(100) NOT NULL,
    balance DECIMAL(12, 2) DEFAULT 0.00,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. สร้างตาราง: หมวดหมู่ (categories)
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    type ENUM('income', 'expense') NOT NULL, -- income = รายรับ, expense = รายจ่าย
    user_id INT DEFAULT NULL, -- NULL หมายถึงหมวดหมู่ทั่วไปของระบบ, ถ้ามีเลข user_id แสดงว่าเป็นหมวดหมู่ที่ผู้ใช้สร้างเอง
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. สร้างตาราง: รายการบันทึก (transactions)
CREATE TABLE transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    amount DECIMAL(12, 2) NOT NULL,
    transaction_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note TEXT,
    user_id INT NOT NULL,
    account_id INT NOT NULL,
    category_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. เพิ่มข้อมูลหมวดหมู่พื้นฐานเริ่มต้น (Default Categories)
INSERT INTO categories (category_name, type, user_id) VALUES
('เงินเดือน', 'income', NULL),
('ขายของ/ธุรกิจ', 'income', NULL),
('อาหารและเครื่องดื่ม', 'expense', NULL),
('เดินทาง/ค่าน้ำมัน', 'expense', NULL),
('ค่าที่พัก/ค่าน้ำค่าไฟ', 'expense', NULL),
('ช้อปปิ้ง/บันเทิง', 'expense', NULL);