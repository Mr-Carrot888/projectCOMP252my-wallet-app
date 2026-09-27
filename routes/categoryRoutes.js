// Routes สำหรับจัดการหมวดหมู่ (ต้องล็อกอินทุกเส้นทาง)
const express = require('express');
const router = express.Router();

const categoryController = require('../controllers/categoryController');
const auth = require('../middlewares/auth');

// GET /api/categories - หมวดของระบบ + ของผู้ใช้
router.get('/', auth, categoryController.getCategories);

// POST /api/categories - เพิ่มหมวดของผู้ใช้เอง
router.post('/', auth, categoryController.createCategory);

// PUT /api/categories/:id - แก้ไขหมวดของตัวเอง
router.put('/:id', auth, categoryController.updateCategory);

// DELETE /api/categories/:id - ลบหมวดของตัวเอง
router.delete('/:id', auth, categoryController.deleteCategory);

module.exports = router;
