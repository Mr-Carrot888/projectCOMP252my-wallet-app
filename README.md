# งานโปรเจคนำเสนองานกลุ่มตามหมวดที่ได้รับมอบหมาย วิชา COMP252-03-การพัฒนาโปรแกรมประยุกต์บนเว็บ<br>
## หัวข้อ ระบบจัดการรายรับ-รายจ่ายส่วนบุคคล<br>
โปรเจกต์ระบบจัดการรายรับ-รายจ่ายส่วนบุคคล พัฒนาด้วย **Express.js, HTML5, Vanilla JavaScript** และ **Tailwind CSS**

## ✨ ฟีเจอร์หลักของระบบ (Features)

1. **ระบบยืนยันตัวตน (Authentication & Authorization)**
   * สมัครสมาชิก (Register) พร้อมสร้าง "กระเป๋าหลัก" อัตโนมัติ
   * เข้าสู่ระบบ (Login) / ออกจากระบบ (Logout) ด้วย `express-session` และเข้ารหัสรหัสผ่านด้วย `bcrypt`
2. **แดชบอร์ดสรุปภาพรวม (Dashboard Overview)**
   * การ์ดแสดง ยอดเงินคงเหลือสุทธิ (Net Balance), รวมรายรับเดือนนี้ และ รวมรายจ่ายเดือนนี้
   * ปุ่ม Quick Action บันทึกรายรับ-รายจ่ายผ่าน Modal ป๊อบอัป
   * ตารางแสดงประวัติรายการล่าสุด 5–10 รายการ
3. **การจัดการรายรับ-รายจ่าย (Transactions Management - CRUD)**
   * เพิ่ม/แก้ไข/ลบ รายการเงิน
   * ระบบอัปเดตยอดเงินคงเหลือในกระเป๋า (`accounts`) อัตโนมัติเมื่อมีการบันทึก แก้ไข หรือลบรายการ
   * ตัวกรอง (Filter) ดูประวัติการเงินตาม เดือน, ปี หรือ ประเภทรายการ
4. **การจัดการหมวดหมู่ (Categories Management)**
   * หมวดหมู่พื้นฐานของระบบ (Default Categories) เช่น เงินเดือน, อาหาร, การเดินทาง
   * สามารถ เพิ่ม/แก้ไข/ลบ หมวดหมู่ส่วนตัวได้
5. **การตั้งค่าโปรไฟล์และบัญชีเงินเก็บ (Profile & Account Settings)**
   * แก้ไขข้อมูลส่วนตัว และ เปลี่ยนรหัสผ่าน
   * เพิ่ม/แก้ไข/ลบ บัญชีเงินเก็บเพิ่มเติม (เช่น เงินสด, บัญชีธนาคาร, บัตรเครดิต)

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

* **Backend:** Node.js, Express.js
* **Database:** MySQL (`mysql2`)
* **Frontend:** HTML5, Vanilla JavaScript (Fetch API)
* **CSS Framework:** Tailwind CSS v4 (`@tailwindcss/cli`)
* **Authentication:** Express Session, Bcrypt.js

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)
```
.
├── README.md
├── app.js
├── config
│   ├── database.sql
│   └── db.js
├── controllers
│   ├── authController.js
│   ├── categoryController.js
│   ├── transactionController.js
│   └── userController.js
├── middlewares
│   └── auth.js
├── package-lock.json
├── package.json
├── public
│   ├── css
│   │   ├── input.css
│   │   └── output.css
│   └── js
│       └── app.js
├── routes
│   ├── authRoutes.js
│   ├── categoryRoutes.js
│   ├── transactionRoutes.js
│   └── userRoutes.js
└── views
    ├── auth.html
    ├── categories.html
    ├── dashboard.html
    ├── index.html
    ├── profile.html
    └── transactions.html
```
## 🚀 ขั้นตอนการติดตั้งและการใช้งาน (Installation & Setup)
1. ติดตั้ง Dependencies
เปิด Terminal ในโฟลเดอร์โปรเจกต์แล้วรันคำสั่ง:<br>
```
npm install
```
2. นำเข้าฐานข้อมูล (Database Setup)
เปิดโปรแกรมจัดการ Database (เช่น phpMyAdmin, MySQL Workbench, DBeaver)<br>
นำไฟล์ config/database.sql ไป Import รันใน MySQL เพื่อสร้าง Database ชื่อ budget_db และตารางทั้งหมด<br>

3. Build Tailwind CSS
รันคำสั่ง Compile ไฟล์ CSS ของ Tailwind:

4. เริ่มต้นใช้งานเซิร์ฟเวอร์
node app.js

สมาชิก<br>
1.นายภูริ มาภู 6712231035<br>
2.น.ส.กมลวรรณ แก้วเจิม 6712231001<br>
3.นายอรรนพ เพริดพริ้ง 6712231029<br>
