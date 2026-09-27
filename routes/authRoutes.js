// Routes สำหรับระบบยืนยันตัวตน
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

// POST /api/auth/register - สมัครสมาชิก (auto-create กระเป๋าหลัก)
router.post('/register', authController.register);

// POST /api/auth/login - เข้าสู่ระบบ
router.post('/login', authController.login);

// POST /api/auth/logout - ออกจากระบบ (ต้องล็อกอินก่อน)
router.post('/logout', require('./../middlewares/auth'), authController.logout);

module.exports = router;
