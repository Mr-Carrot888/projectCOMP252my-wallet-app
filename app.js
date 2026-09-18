const express = require('express');
const app = express();

// 1. นำเข้าไฟล์ routes ที่เราสร้างใน Step 2
const userRoutes = require('./routes/userRoutes');

// 2. บอก Express ให้ใช้ userRoutes เมื่อมีคนเข้า URL ที่ขึ้นต้นด้วย /users
app.use('/users', userRoutes);

// 3. สั่งให้เซิร์ฟเวอร์ทำงานที่ Port 3000
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
const userController = require('./controllers/userController');
console.log('Controller content:', userController); // <-- เพิ่มบรรทัดนี้แล้วรัน node app.js ดู