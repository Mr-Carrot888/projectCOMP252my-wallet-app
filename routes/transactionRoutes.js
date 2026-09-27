// Routes สำหรับจัดการรายรับ-รายจ่าย (ต้องล็อกอินทุกเส้นทาง)
const express = require('express');
const router = express.Router();

const transactionController = require('../controllers/transactionController');
const auth = require('../middlewares/auth');

// GET /api/transactions/summary - สรุปยอดเงิน
// (หมายเหตุ: ต้องประกาศก่อน /:id เพราะไม่งั้น "summary" จะถูกมองเป็น :id)
router.get('/summary', auth, transactionController.getSummary);

// GET /api/transactions - ดึงรายการ (กรองด้วย ?type=&month=&year=)
router.get('/', auth, transactionController.getTransactions);

// POST /api/transactions - บันทึกรายการใหม่ + อัปเดต balance
router.post('/', auth, transactionController.createTransaction);

// PUT /api/transactions/:id - แก้ไขรายการ + ปรับ balance
router.put('/:id', auth, transactionController.updateTransaction);

// DELETE /api/transactions/:id - ลบรายการ + คืน balance
router.delete('/:id', auth, transactionController.deleteTransaction);

module.exports = router;
