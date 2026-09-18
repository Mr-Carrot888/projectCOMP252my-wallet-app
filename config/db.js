const mysql = require('mysql2');

// สร้าง Connection Pool เพื่อรองรับผู้ใช้หลายคนพร้อมกันได้อย่างมีประสิทธิภาพ
const pool = mysql.createPool({
  host: 'localhost',      // เซิร์ฟเวอร์ฐานข้อมูล (เครื่องตัวเองใช้ localhost)
  user: 'root',           // ชื่อผู้ใช้ ( default ของ XAMPP คือ root)
  password: '',           // รหัสผ่าน (ถ้าไม่ได้ตั้งไว้ให้เว้นเป็น string ว่าง '')
  database: 'budget_db' // เปลี่ยนเป็นชื่อฐานข้อมูลของคุณใน MySQL/phpMyAdmin
});

// ใช้ .promise() เพื่อให้เขียนโค้ดแบบ async / await ได้ง่าย
module.exports = pool.promise();