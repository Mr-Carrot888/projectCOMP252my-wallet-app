// Routes สำหรับจัดการข้อมูลผู้ใช้และบัญชีเงินเก็บ
const express = require('express');
const router = express.Router();

// นำเข้า Controller และ Middleware
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');

// ---------- โปรไฟล์ (ต้องล็อกอิน) ----------
// GET /api/users/me - ดึงโปรไฟล์ของตัวเอง
router.get('/me', auth, userController.getProfile);

// PUT /api/users/me - แก้ไขโปรไฟล์ (username/email)
router.put('/me', auth, userController.updateProfile);

// PUT /api/users/me/password - เปลี่ยนรหัสผ่าน
router.put('/me/password', auth, userController.changePassword);

// ---------- บัญชีเงินเก็บ (accounts) ----------
// GET /api/users/accounts - ดึงบัญชีทั้งหมดของผู้ใช้
router.get('/accounts', auth, userController.getAccounts);

// POST /api/users/accounts - เพิ่มบัญชีเงินเก็บใหม่
router.post('/accounts', auth, userController.createAccount);

// PUT /api/users/accounts/:accountId - แก้ไขบัญชี
router.put('/accounts/:accountId', auth, userController.updateAccount);

// DELETE /api/users/accounts/:accountId - ลบบัญชี
router.delete('/accounts/:accountId', auth, userController.deleteAccount);

// ---------- ดึงข้อมูลตาม ID (เส้นทางเดิม) ----------
// หมายเหตุ: ต้องอยู่ล่างสุด เพราะ /:id จะกินทุก URL ที่เหลือ
// GET /api/users/:id - ดึงข้อมูลผู้ใช้ตาม ID
router.get('/:id', userController.getById);

module.exports = router;