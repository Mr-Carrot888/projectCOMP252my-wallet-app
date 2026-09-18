// ดึงตัวเชื่อมต่อ DB ที่เราสร้างไว้ใน config/db.js
const db = require('../config/db');

// ฟังก์ชันดึงข้อมูลตาม ID
exports.getById = async (req, res) => {
  try {
    const id = req.params.id; // รับค่า id มาจาก URL (เช่น เลข 2 จาก /users/2)

    // เขียนคำสั่ง SQL (เปลี่ยน 'your_table_name' เป็นชื่อตารางใน DB ของคุณ)
    const [rows] = await db.query('SELECT * FROM users WHERE user_id = ?', [id]);

    // ถ้าไม่เจอข้อมูล
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Data not found' });
    }

    // ส่งข้อมูลรายการแรกกลับไปให้เบราว์เซอร์ (จะออกมาเป็น JSON แบบในรูป)
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};