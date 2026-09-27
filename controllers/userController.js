// Controller สำหรับจัดการข้อมูลผู้ใช้และบัญชีเงินเก็บ (accounts)
const bcrypt = require('bcryptjs');
const db = require('../config/db');

// ============================================================
// ส่วนที่ 1: ข้อมูลโปรไฟล์ (ต้องล็อกอิน)
// ============================================================

// GET /api/users/me - ดึงข้อมูลโปรไฟล์ของผู้ใช้ที่ล็อกอินอยู่
exports.getProfile = async (req, res) => {
  try {
    const userId = req.session.user.user_id;

    const [rows] = await db.query(
      'SELECT user_id, username, email, created_at FROM users WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }

    // แถมจำนวนบัญชีและยอดรวมทุกกระเป๋าให้ด้วย
    const [accounts] = await db.query(
      'SELECT COUNT(*) AS total_accounts, COALESCE(SUM(balance), 0) AS total_balance FROM accounts WHERE user_id = ?',
      [userId]
    );

    res.json({
      ...rows[0],
      total_accounts: accounts[0].total_accounts,
      total_balance: accounts[0].total_balance
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/users/me - แก้ไขข้อมูลโปรไฟล์ (username และ/หรือ email)
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { username, email } = req.body;

    if (!username && !email) {
      return res.status(400).json({ message: 'ระบุอย่างน้อย 1 ฟิลด์ (username หรือ email)' });
    }

    // ถ้าจะเปลี่ยน username/email ต้องเช็กก่อนว่าซ้ำกับคนอื่นหรือไม่
    if (username) {
      const [dup] = await db.query(
        'SELECT user_id FROM users WHERE username = ? AND user_id != ?',
        [username, userId]
      );
      if (dup.length > 0) {
        return res.status(409).json({ message: 'username นี้ถูกใช้งานแล้ว' });
      }
    }
    if (email) {
      const [dup] = await db.query(
        'SELECT user_id FROM users WHERE email = ? AND user_id != ?',
        [email, userId]
      );
      if (dup.length > 0) {
        return res.status(409).json({ message: 'email นี้ถูกใช้งานแล้ว' });
      }
    }

    // สร้างคำสั่ง UPDATE แบบไดนามิกตามฟิลด์ที่ส่งมา
    const fields = [];
    const values = [];
    if (username) { fields.push('username = ?'); values.push(username); }
    if (email) { fields.push('email = ?'); values.push(email); }
    values.push(userId);

    await db.query(`UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`, values);

    // อัปเดต session ให้ตรงกับข้อมูลใหม่ด้วย
    if (username) req.session.user.username = username;
    if (email) req.session.user.email = email;

    res.json({ message: 'อัปเดตโปรไฟล์สำเร็จ', user: req.session.user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/users/me/password - เปลี่ยนรหัสผ่าน (ต้องกรอกรหัสเดิมก่อน)
exports.changePassword = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ message: 'กรุณากรอก current_password และ new_password' });
    }

    // ดึงรหัสผ่านปัจจุบันมาเทียบ
    const [rows] = await db.query('SELECT password FROM users WHERE user_id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }

    const isMatch = await bcrypt.compare(current_password, rows[0].password);
    if (!isMatch) {
      return res.status(401).json({ message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
    }

    // เข้ารหัสรหัสใหม่แล้วบันทึก
    const hashedPassword = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password = ? WHERE user_id = ?', [hashedPassword, userId]);

    res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============================================================
// ส่วนที่ 2: จัดการบัญชีเงินเก็บ (accounts)
// ============================================================

// GET /api/users/accounts - ดึงรายการบัญชีเงินเก็บทั้งหมดของผู้ใช้
exports.getAccounts = async (req, res) => {
  try {
    const userId = req.session.user.user_id;

    const [rows] = await db.query(
      'SELECT account_id, account_name, balance, created_at FROM accounts WHERE user_id = ? ORDER BY account_id ASC',
      [userId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/users/accounts - เพิ่มบัญชีเงินเก็บใหม่
exports.createAccount = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { account_name, balance } = req.body;

    if (!account_name) {
      return res.status(400).json({ message: 'กรุณากรอก account_name' });
    }

    const initialBalance = balance !== undefined ? parseFloat(balance) : 0.00;
    if (isNaN(initialBalance) || initialBalance < 0) {
      return res.status(400).json({ message: 'balance ต้องเป็นตัวเลขที่ไม่ติดลบ' });
    }

    const [result] = await db.query(
      'INSERT INTO accounts (account_name, balance, user_id) VALUES (?, ?, ?)',
      [account_name, initialBalance, userId]
    );

    res.status(201).json({
      message: 'สร้างบัญชีเงินเก็บสำเร็จ',
      account_id: result.insertId,
      account_name: account_name,
      balance: initialBalance
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/users/accounts/:accountId - แก้ไขชื่อบัญชี (และ/หรือตั้งยอดคงเหลือใหม่)
exports.updateAccount = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const accountId = req.params.accountId;
    const { account_name, balance } = req.body;

    if (!account_name && balance === undefined) {
      return res.status(400).json({ message: 'ระบุอย่างน้อย 1 ฟิลด์ (account_name หรือ balance)' });
    }

    // เช็กว่าบัญชีนี้เป็นของผู้ใช้คนนี้จริงหรือไม่ (กันเผื่อเรียก account ของคนอื่น)
    const [rows] = await db.query(
      'SELECT account_id FROM accounts WHERE account_id = ? AND user_id = ?',
      [accountId, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบบัญชีนี้ หรือไม่มีสิทธิ์เข้าถึง' });
    }

    const fields = [];
    const values = [];
    if (account_name) { fields.push('account_name = ?'); values.push(account_name); }
    if (balance !== undefined) {
      const newBalance = parseFloat(balance);
      if (isNaN(newBalance) || newBalance < 0) {
        return res.status(400).json({ message: 'balance ต้องเป็นตัวเลขที่ไม่ติดลบ' });
      }
      fields.push('balance = ?');
      values.push(newBalance);
    }
    values.push(accountId, userId);

    await db.query(
      `UPDATE accounts SET ${fields.join(', ')} WHERE account_id = ? AND user_id = ?`,
      values
    );

    res.json({ message: 'อัปเดตบัญชีสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/users/accounts/:accountId - ลบบัญชีเงินเก็บ
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const accountId = req.params.accountId;

    // เช็กว่าบัญชีนี้เป็นของผู้ใช้คนนี้จริง
    const [rows] = await db.query(
      'SELECT account_id FROM accounts WHERE account_id = ? AND user_id = ?',
      [accountId, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบบัญชีนี้ หรือไม่มีสิทธิ์เข้าถึง' });
    }

    await db.query('DELETE FROM accounts WHERE account_id = ? AND user_id = ?', [accountId, userId]);

    res.json({ message: 'ลบบัญชีเงินเก็บสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============================================================
// ส่วนที่ 3: ดึงข้อมูลตาม ID (ใช้ในกรณีทั่วไป)
// ============================================================

// GET /api/users/:id - ดึงข้อมูลผู้ใช้ตาม ID (คงเส้นทางเดิมไว้)
exports.getById = async (req, res) => {
  try {
    const id = req.params.id; // รับค่า id มาจาก URL (เช่น เลข 2 จาก /users/2)

    const [rows] = await db.query('SELECT * FROM users WHERE user_id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Data not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};