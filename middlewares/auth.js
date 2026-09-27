// Middleware ตรวจสอบว่าผู้ใช้ล็อกอินแล้วหรือยัง (เช็กจาก session)
// ถ้ายังไม่ล็อกอิน จะตอบกลับ 401 ทันที ไม่ให้ผ่านไปยังเส้นทางที่ต้องการ
module.exports = function (req, res, next) {
  if (req.session && req.session.user) {
    // ล็อกอินแล้ว ผ่านได้
    next();
  } else {
    res.status(401).json({ message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' });
  }
};
