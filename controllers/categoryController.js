// Controller สำหรับจัดการหมวดหมู่รายรับ-รายจ่าย (categories)
const db = require('../config/db');

// GET /api/categories
// ดึงหมวดหมู่ทั้งหมดที่ผู้ใช้ใช้ได้ = หมวดของระบบ (user_id IS NULL) + หมวดที่ผู้ใช้สร้างเอง
exports.getCategories = async (req, res) => {
  try {
    const userId = req.session.user.user_id;

    const [rows] = await db.query(
      `SELECT category_id, category_name, type, user_id
       FROM categories
       WHERE user_id IS NULL OR user_id = ?
       ORDER BY user_id IS NULL DESC, type ASC, category_name ASC`,
      [userId]
    );
    // เรียง: หมวดของผู้ใช้ขึ้นก่อน (user_id IS NULL DESC) แล้วค่อยแยกตามประเภท

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/categories
// เพิ่มหมวดหมู่ของผู้ใช้เอง (user_id = คนที่ล็อกอินอยู่)
exports.createCategory = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { category_name, type } = req.body;

    if (!category_name || !type) {
      return res.status(400).json({ message: 'กรุณากรอก category_name และ type (income หรือ expense)' });
    }
    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({ message: 'type ต้องเป็น "income" หรือ "expense" เท่านั้น' });
    }

    const [result] = await db.query(
      'INSERT INTO categories (category_name, type, user_id) VALUES (?, ?, ?)',
      [category_name, type, userId]
    );

    res.status(201).json({
      message: 'สร้างหมวดหมู่สำเร็จ',
      category_id: result.insertId,
      category_name: category_name,
      type: type
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/categories/:id
// แก้ไขชื่อหมวดหมู่ - แก้ได้เฉพาะหมวดที่ผู้ใช้สร้างเอง (หมวดของระบบแก้ไม่ได้)
exports.updateCategory = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const categoryId = req.params.id;
    const { category_name } = req.body;

    if (!category_name) {
      return res.status(400).json({ message: 'กรุณากรอก category_name' });
    }

    // เช็กว่าหมวดนี้เป็นของผู้ใช้คนนี้จริง (user_id ตรงกัน = สร้างเอง)
    const [rows] = await db.query(
      'SELECT category_id FROM categories WHERE category_id = ? AND user_id = ?',
      [categoryId, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบหมวดหมู่นี้ หรือเป็นหมวดของระบบที่แก้ไขไม่ได้' });
    }

    await db.query(
      'UPDATE categories SET category_name = ? WHERE category_id = ? AND user_id = ?',
      [category_name, categoryId, userId]
    );

    res.json({ message: 'แก้ไขหมวดหมู่สำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/categories/:id
// ลบหมวดหมู่ - ลบได้เฉพาะหมวดที่ผู้ใช้สร้างเอง
exports.deleteCategory = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const categoryId = req.params.id;

    // เช็กว่าหมวดนี้เป็นของผู้ใช้คนนี้จริง
    const [rows] = await db.query(
      'SELECT category_id FROM categories WHERE category_id = ? AND user_id = ?',
      [categoryId, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบหมวดหมู่นี้ หรือเป็นหมวดของระบบที่ลบไม่ได้' });
    }

    await db.query('DELETE FROM categories WHERE category_id = ? AND user_id = ?', [categoryId, userId]);

    res.json({ message: 'ลบหมวดหมู่สำเร็จ' });
  } catch (err) {
    // ถ้าหมวดนี้มีรายการเงินผูกอยู่ (FK constraint) จะลบไม่ได้
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ message: 'หมวดหมู่นี้มีรายการเงินผูกอยู่ ไม่สามารถลบได้' });
    }
    res.status(500).json({ error: err.message });
  }
};
