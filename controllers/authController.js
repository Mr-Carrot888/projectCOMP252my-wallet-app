// Controller สำหรับระบบยืนยันตัวตน (Authentication)
const bcrypt = require('bcryptjs');
const db = require('../config/db');

// ---------- 1. สมัครสมาชิก ----------
// POST /api/auth/register
// รับ { username, email, password } -> สร้างผู้ใช้ใหม่ + บัญชี "กระเป๋าหลัก" ยอด 0 บาทอัตโนมัติ
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // ตรวจสอบว่ากรอกครบหรือไม่
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'กรุณากรอก username, email และ password ให้ครบถ้วน' });
    }

    // ตรวจสอบว่า username หรือ email ซ้ำกับในระบบหรือไม่
    const [existing] = await db.query(
      'SELECT user_id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'username หรือ email นี้ถูกใช้งานแล้ว' });
    }

    // เข้ารหัสรหัสผ่านก่อนบันทึกลงฐานข้อมูล (ห้ามเก็บรหัสผ่านเป็นข้อความเปล่า!)
    const hashedPassword = await bcrypt.hash(password, 10);

    // ใช้ transaction เพื่อให้สร้างผู้ใช้ + กระเป๋าหลักพร้อมกัน
    // (ถ้าขั้นตอนไหนล้มเหลวจะยกเลิกทั้งหมด ไม่เกิดข้อมูลครึ่งๆ กลางๆ)
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // บันทึกผู้ใช้ใหม่
      const [userResult] = await conn.query(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword]
      );
      const newUserId = userResult.insertId;

      // สร้างบัญชีเงินเก็บ "กระเป๋าหลัก" ยอดเริ่มต้น 0 บาทให้อัตโนมัติ
      await conn.query(
        'INSERT INTO accounts (account_name, balance, user_id) VALUES (?, ?, ?)',
        ['กระเป๋าหลัก', 0.00, newUserId]
      );

      await conn.commit();

      res.status(201).json({
        message: 'สมัครสมาชิกสำเร็จ รับ "กระเป๋าหลัก" ยอดเริ่มต้น 0 บาทแล้ว',
        user_id: newUserId,
        username: username
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------- 2. เข้าสู่ระบบ ----------
// POST /api/auth/login
// รับ { username, password } -> ตรวจสอบรหัสผ่านแล้วสร้าง session
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'กรุณากรอก username และ password' });
    }

    // ค้นหาผู้ใช้จาก username
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'username หรือ password ไม่ถูกต้อง' });
    }
    const user = rows[0];

    // เปรียบเทียบรหัสผ่านที่กรอกเข้ามากับรหัสที่เข้ารหัสไว้ในฐานข้อมูล
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'username หรือ password ไม่ถูกต้อง' });
    }

    // ถ้ารหัสผ่านถูก ให้บันทึกข้อมูลผู้ใช้ไว้ใน session
    req.session.user = {
      user_id: user.user_id,
      username: user.username,
      email: user.email
    };

    res.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      user: req.session.user
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------- 3. ออกจากระบบ ----------
// POST /api/auth/logout
exports.logout = (req, res) => {
  // ทำลาย session แล้วลบ cookie ออกไปด้วย
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'ออกจากระบบไม่สำเร็จ' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'ออกจากระบบสำเร็จ' });
  });
};
