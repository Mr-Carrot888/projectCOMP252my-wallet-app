const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();

// ---------- 1. Middleware ----------
// แปลง JSON ที่ส่งเข้ามาใน Request Body ให้กลายเป็น req.body อัตโนมัติ
app.use(express.json());

// (เผื่อไว้กรณีส่งฟอร์มแบบ application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

// จัดการ Session (ใช้เก็บสถานะการล็อกอิน)
app.use(session({
  secret: 'butterfly-relief-center-secret', // ใช้เข้ารหัส session id (ควรเปลี่ยนเป็นค่าลับของทีมเอง)
  resave: false,            // ไม่บันทึก session ใหม่ถ้าไม่มีการเปลี่ยนแปลง
  saveUninitialized: false, // ไม่สร้าง session เปล่าให้คนที่ยังไม่ล็อกอิน
  cookie: {
    httpOnly: true,         // กัน JavaScript ฝั่ง client อ่าน cookie (ป้องกัน XSS)
    maxAge: 1000 * 60 * 60 * 24 // อายุ session 1 วัน
  }
}));

// ---------- 2. Static Files ----------
// เสิร์ฟไฟล์ฝั่ง Frontend ทั้งหมด (CSS, JS, รูปภาพ) จากโฟลเดอร์ public
// เข้าถึงได้ผ่าน URL เช่น http://localhost:3000/css/style.css
app.use(express.static(path.join(__dirname, 'public')));

// ---------- 3. เสิร์ฟหน้า HTML จากโฟลเดอร์ views ----------
// หน้าแรก (http://localhost:3000) -> views/index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// เปิดหน้า HTML อื่นๆ ใน views ได้จาก URL ตรงๆ เช่น
// http://localhost:3000/login.html -> views/login.html
app.get('/:page.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', `${req.params.page}.html`));
});

// ---------- 4. Routes (API) ----------
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

// ระบบยืนยันตัวตน: /api/auth/register, /api/auth/login, /api/auth/logout
app.use('/api/auth', authRoutes);

// ข้อมูลผู้ใช้ + บัญชีเงินเก็บ: /api/users/...
app.use('/api/users', userRoutes);

// หมวดหมู่รายรับ-รายจ่าย: /api/categories
app.use('/api/categories', categoryRoutes);

// รายรับ-รายจ่าย: /api/transactions
app.use('/api/transactions', transactionRoutes);

// คงเส้นทางเดิม /users ไว้ให้โค้ดเก่ายังใช้ได้
app.use('/users', userRoutes);

// ---------- 5. จัดการ Error ----------
// กรณีเข้า URL ที่ไม่มีอยู่จริง
app.use((req, res) => {
  res.status(404).send('404 Not Found');
});

// กรณีเกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Internal Server Error');
});

// ---------- 6. สั่งให้เซิร์ฟเวอร์ทำงาน ----------
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});