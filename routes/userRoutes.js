const express = require('express');
const router = express.Router();

// 1. นำเข้า Controller
const userController = require('../controllers/userController');

// 2. กำหนดเส้นทาง URL (เปลี่ยนเป็น userController.getById ให้ตรงกับใน Controller)
router.get('/:id', userController.getById);

// 3. ส่งออก router
module.exports = router;