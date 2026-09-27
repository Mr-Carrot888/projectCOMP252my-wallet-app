// Controller สำหรับจัดการรายรับ-รายจ่าย (transactions)
// ทุกการบันทึก/แก้ไข/ลบ จะอัปเดตยอด balance ในตาราง accounts ให้อัตโนมัติ
const db = require('../config/db');

// ตรวจสอบว่าบัญชีเป็นของผู้ใช้จริง และคืนข้อมูลบัญชีกลับไป
async function getOwnedAccount(conn, accountId, userId) {
  const [rows] = await conn.query(
    'SELECT account_id, account_name, balance FROM accounts WHERE account_id = ? AND user_id = ? FOR UPDATE',
    [accountId, userId]
  );
  return rows[0];
}

// ตรวจสอบว่าหมวดหมู่ใช้ได้ (หมวดของระบบ หรือหมวดที่ผู้ใช้สร้างเอง)
async function getUsableCategory(conn, categoryId, userId) {
  const [rows] = await conn.query(
    'SELECT category_id, category_name, type FROM categories WHERE category_id = ? AND (user_id IS NULL OR user_id = ?)',
    [categoryId, userId]
  );
  return rows[0];
}

// แปลงประเภทรายการเป็นเครื่องหมายบวก/ลบสำหรับปรับยอด balance
function signedAmount(type, amount) {
  return type === 'income' ? amount : -amount;
}

// ---------- 1. ดึงรายการทั้งหมด ----------
// GET /api/transactions?type=expense&month=9&year=2026
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { type, month, year } = req.query;

    let sql = `
      SELECT t.transaction_id, t.amount, t.note, t.transaction_date,
             c.category_id, c.category_name, c.type,
             a.account_id, a.account_name
      FROM transactions t
      JOIN categories c ON t.category_id = c.category_id
      JOIN accounts a ON t.account_id = a.account_id
      WHERE t.user_id = ?`;
    const params = [userId];

    // กรองตามประเภท (income / expense)
    if (type) {
      if (type !== 'income' && type !== 'expense') {
        return res.status(400).json({ message: 'type ต้องเป็น "income" หรือ "expense" เท่านั้น' });
      }
      sql += ' AND c.type = ?';
      params.push(type);
    }
    // กรองตามเดือน (1-12)
    if (month) {
      const m = parseInt(month);
      if (isNaN(m) || m < 1 || m > 12) {
        return res.status(400).json({ message: 'month ต้องเป็นเลข 1-12' });
      }
      sql += ' AND MONTH(t.transaction_date) = ?';
      params.push(m);
    }
    // กรองตามปี (เช่น 2026)
    if (year) {
      const y = parseInt(year);
      if (isNaN(y)) {
        return res.status(400).json({ message: 'year ต้องเป็นตัวเลข' });
      }
      sql += ' AND YEAR(t.transaction_date) = ?';
      params.push(y);
    }

    sql += ' ORDER BY t.transaction_date DESC, t.transaction_id DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------- 2. สรุปยอดเงิน ----------
// GET /api/transactions/summary?month=9&year=2026 (ไม่กรอก = เดือน/ปีปัจจุบัน)
exports.getSummary = async (req, res) => {
  try {
    const userId = req.session.user.user_id;

    // ถ้าไม่ระบุ month/year ให้ใช้เดือนและปีปัจจุบัน
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month) : now.getMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();

    if (isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: 'month ต้องเป็นเลข 1-12' });
    }
    if (isNaN(year)) {
      return res.status(400).json({ message: 'year ต้องเป็นตัวเลข' });
    }

    // รวมรายรับ/รายจ่ายของเดือนที่เลือก
    const [totals] = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN c.type = 'income' THEN t.amount END), 0) AS total_income,
         COALESCE(SUM(CASE WHEN c.type = 'expense' THEN t.amount END), 0) AS total_expense
       FROM transactions t
       JOIN categories c ON t.category_id = c.category_id
       WHERE t.user_id = ? AND MONTH(t.transaction_date) = ? AND YEAR(t.transaction_date) = ?`,
      [userId, month, year]
    );

    // ยอดเงินคงเหลือสุทธิ = ผลรวม balance ทุกกระเป๋า ณ ปัจจุบัน
    const [balanceRows] = await db.query(
      'SELECT COALESCE(SUM(balance), 0) AS net_balance FROM accounts WHERE user_id = ?',
      [userId]
    );

    const totalIncome = parseFloat(totals[0].total_income);
    const totalExpense = parseFloat(totals[0].total_expense);

    res.json({
      month: month,
      year: year,
      net_balance: balanceRows[0].net_balance,   // เงินคงเหลือสุทธิทั้งหมด (ทุกกระเป๋า)
      total_income: totalIncome,                 // รวมรายรับเดือนนี้
      total_expense: totalExpense,               // รวมรายจ่ายเดือนนี้
      month_net: totalIncome - totalExpense      // รายรับ-รายจ่ายสุทธิของเดือนนี้
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------- 3. บันทึกรายการใหม่ ----------
// POST /api/transactions  รับ { amount, note, account_id, category_id, type }
exports.createTransaction = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const userId = req.session.user.user_id;
    const { amount, note, account_id, category_id, type } = req.body;

    // ตรวจข้อมูลที่จำเป็น
    if (amount === undefined || !account_id || !category_id || !type) {
      return res.status(400).json({ message: 'กรุณากรอก amount, account_id, category_id และ type ให้ครบถ้วน' });
    }
    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({ message: 'type ต้องเป็น "income" หรือ "expense" เท่านั้น' });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'amount ต้องเป็นตัวเลขมากกว่า 0' });
    }

    await conn.beginTransaction();

    // เช็กว่าบัญชีเป็นของผู้ใช้จริง (FOR UPDATE = ล็อกแถวกันยอดพลาดเวลาคนเดียวกันยิงพร้อมกัน)
    const account = await getOwnedAccount(conn, account_id, userId);
    if (!account) {
      await conn.rollback();
      return res.status(404).json({ message: 'ไม่พบบัญชีนี้ หรือไม่มีสิทธิ์เข้าถึง' });
    }

    // เช็กว่าหมวดหมู่ใช้ได้
    const category = await getUsableCategory(conn, category_id, userId);
    if (!category) {
      await conn.rollback();
      return res.status(404).json({ message: 'ไม่พบหมวดหมู่นี้' });
    }

    // คำนวณยอดใหม่ของบัญชี: รายรับ + รายจ่าย -
    const newBalance = parseFloat(account.balance) + signedAmount(type, numAmount);
    if (newBalance < 0) {
      await conn.rollback();
      return res.status(400).json({ message: `ยอดเงินในบัญชี "${account.account_name}" ไม่พอสำหรับรายจ่ายนี้` });
    }

    // บันทึกรายการ
    const [result] = await conn.query(
      'INSERT INTO transactions (amount, note, user_id, account_id, category_id) VALUES (?, ?, ?, ?, ?)',
      [numAmount, note || null, userId, account_id, category_id]
    );

    // อัปเดตยอดเงินในบัญชีอัตโนมัติ
    await conn.query('UPDATE accounts SET balance = ? WHERE account_id = ?', [newBalance, account_id]);

    await conn.commit();

    res.status(201).json({
      message: type === 'income' ? 'บันทึกรายรับสำเร็จ' : 'บันทึกรายจ่ายสำเร็จ',
      transaction_id: result.insertId,
      account_name: account.account_name,
      new_balance: newBalance
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};

// ---------- 4. แก้ไขรายการ ----------
// PUT /api/transactions/:id  รับฟิลด์ที่ต้องการแก้ (amount, note, account_id, category_id, type)
// ต้องยกเลิกผลของรายการเดิมก่อน แล้วค่อยคิดผลของรายการใหม่ เพื่อให้ยอด balance ถูกต้องเสมอ
exports.updateTransaction = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const userId = req.session.user.user_id;
    const transactionId = req.params.id;
    const { amount, note, account_id, category_id, type } = req.body;

    await conn.beginTransaction();

    // ดึงรายการเดิม (ต้องเป็นของผู้ใช้เท่านั้น)
    const [oldRows] = await conn.query(
      `SELECT t.transaction_id, t.amount, t.note, t.account_id, t.category_id, c.type
       FROM transactions t
       JOIN categories c ON t.category_id = c.category_id
       WHERE t.transaction_id = ? AND t.user_id = ? FOR UPDATE`,
      [transactionId, userId]
    );
    if (oldRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'ไม่พบรายการนี้ หรือไม่มีสิทธิ์เข้าถึง' });
    }
    const old = oldRows[0];

    // ค่าใหม่: ใช้ค่าที่ส่งมา ถ้าไม่ส่งมาใช้ค่าเดิม
    const newType = type !== undefined ? type : old.type;
    if (newType !== 'income' && newType !== 'expense') {
      await conn.rollback();
      return res.status(400).json({ message: 'type ต้องเป็น "income" หรือ "expense" เท่านั้น' });
    }
    const newAmount = amount !== undefined ? parseFloat(amount) : parseFloat(old.amount);
    if (isNaN(newAmount) || newAmount <= 0) {
      await conn.rollback();
      return res.status(400).json({ message: 'amount ต้องเป็นตัวเลขมากกว่า 0' });
    }
    const newAccountId = account_id !== undefined ? account_id : old.account_id;
    const newCategoryId = category_id !== undefined ? category_id : old.category_id;

    // ล็อกบัญชีเก่าและบัญชีใหม่ (ถ้าเปลี่ยนบัญชี)
    const oldAccount = await getOwnedAccount(conn, old.account_id, userId);
    const newAccount = newAccountId === old.account_id
      ? oldAccount
      : await getOwnedAccount(conn, newAccountId, userId);
    if (!oldAccount || !newAccount) {
      await conn.rollback();
      return res.status(404).json({ message: 'ไม่พบบัญชีปลายทาง หรือไม่มีสิทธิ์เข้าถึง' });
    }

    // เช็กหมวดใหม่ว่าใช้ได้
    const category = await getUsableCategory(conn, newCategoryId, userId);
    if (!category) {
      await conn.rollback();
      return res.status(404).json({ message: 'ไม่พบหมวดหมู่นี้' });
    }

    // 1) ยกเลิกผลของรายการเดิม: รายรับเดิมเอาออก (-) รายจ่ายเดิมคืนเงิน (+)
    const oldAccountBalance = parseFloat(oldAccount.balance) - signedAmount(old.type, parseFloat(old.amount));

    // 2) คิดผลของรายการใหม่: รายรับ + รายจ่าย -
    let finalBalance = oldAccountBalance;
    if (newAccount.account_id === oldAccount.account_id) {
      // แก้ในบัญชีเดิม → คิดต่อจากยอดที่เพิ่งยกเลิก
      finalBalance = oldAccountBalance + signedAmount(newType, newAmount);
    } else {
      // ย้ายไปบัญชีใหม่ → บัญชีเก่ายอดคงเหลือหลังยกเลิก, บัญชีใหม่คิดเพิ่ม
      finalBalance = parseFloat(newAccount.balance) + signedAmount(newType, newAmount);
    }
    if (finalBalance < 0) {
      await conn.rollback();
      return res.status(400).json({ message: `ยอดเงินในบัญชี "${newAccount.account_name}" ไม่พอสำหรับรายการที่แก้ไข` });
    }

    // อัปเดตยอดบัญชีที่ได้รับผลกระทบ
    await conn.query('UPDATE accounts SET balance = ? WHERE account_id = ?', [finalBalance, newAccount.account_id]);
    if (newAccount.account_id !== oldAccount.account_id) {
      await conn.query('UPDATE accounts SET balance = ? WHERE account_id = ?', [oldAccountBalance, oldAccount.account_id]);
    }

    // อัปเดตรายการ
    await conn.query(
      'UPDATE transactions SET amount = ?, note = ?, account_id = ?, category_id = ? WHERE transaction_id = ?',
      [newAmount, note !== undefined ? note : old.note, newAccount.account_id, newCategoryId, transactionId]
    );

    await conn.commit();

    res.json({
      message: 'แก้ไขรายการสำเร็จ และปรับยอดเงินให้แล้ว',
      transaction_id: Number(transactionId),
      new_balance: finalBalance
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};

// ---------- 5. ลบรายการ ----------
// DELETE /api/transactions/:id -> ลบรายการและคืนยอดเงินในบัญชีตามเดิม
exports.deleteTransaction = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const userId = req.session.user.user_id;
    const transactionId = req.params.id;

    await conn.beginTransaction();

    // ดึงรายการเดิม (ต้องเป็นของผู้ใช้เท่านั้น)
    const [oldRows] = await conn.query(
      `SELECT t.transaction_id, t.amount, t.account_id, t.category_id, c.type, a.account_name
       FROM transactions t
       JOIN categories c ON t.category_id = c.category_id
       JOIN accounts a ON t.account_id = a.account_id
       WHERE t.transaction_id = ? AND t.user_id = ? FOR UPDATE`,
      [transactionId, userId]
    );
    if (oldRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'ไม่พบรายการนี้ หรือไม่มีสิทธิ์เข้าถึง' });
    }
    const old = oldRows[0];

    // ล็อกบัญชีแล้วคืนยอด: ถ้าเป็นรายรับ → หักออก, ถ้าเป็นรายจ่าย → คืนเงิน
    const account = await getOwnedAccount(conn, old.account_id, userId);
    if (!account) {
      await conn.rollback();
      return res.status(404).json({ message: 'ไม่พบบัญชีที่ผูกกับรายการนี้' });
    }
    const restoredBalance = parseFloat(account.balance) - signedAmount(old.type, parseFloat(old.amount));
    if (restoredBalance < 0) {
      await conn.rollback();
      return res.status(400).json({ message: 'ไม่สามารถลบได้ เพราะยอดเงินในบัญชีจะติดลบ' });
    }

    await conn.query('UPDATE accounts SET balance = ? WHERE account_id = ?', [restoredBalance, old.account_id]);
    await conn.query('DELETE FROM transactions WHERE transaction_id = ?', [transactionId]);

    await conn.commit();

    res.json({
      message: 'ลบรายการสำเร็จ และคืนยอดเงินให้แล้ว',
      account_name: old.account_name,
      new_balance: restoredBalance
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};
