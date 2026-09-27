// ============================================
// app.js - ฟังก์ชันกลางสำหรับทุกหน้า (Vanilla JS)
// ============================================

// ---------- 1. Helper เรียก API ----------
// ยิง fetch พร้อมส่ง cookie (session) และเช็ก 401 อัตโนมัติ
async function apiFetch(url, options = {}) {
  const opts = {
    credentials: 'same-origin', // สำคัญ! ส่ง session cookie ไปด้วย
    headers: { 'Content-Type': 'application/json' },
    ...options
  };
  if (opts.body && typeof opts.body !== 'string') {
    opts.body = JSON.stringify(opts.body);
  }

  const res = await fetch(url, opts);

  // ถ้า session หมดอายุ/ไม่ได้ล็อกอิน พากลับไปหน้า login
  if (res.status === 401 && !url.includes('/api/auth/login')) {
    window.location.href = '/auth.html';
    throw new Error('กรุณาเข้าสู่ระบบก่อนใช้งาน');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || 'เกิดข้อผิดพลาด');
  }
  return data;
}

// ---------- 2. Format ตัวเลข/วันที่ ----------
// แสดงจำนวนเงินแบบบาท เช่น 25,000.00
function formatMoney(amount) {
  const num = parseFloat(amount) || 0;
  return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// แสดงวันที่ไทย เช่น 27/09/2026 14:30
function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('th-TH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ---------- 3. Modal helper ----------
// เปิด/ปิด modal ด้วย id ของ element
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ---------- 4. แสดงข้อความแจ้งเตือนง่ายๆ ----------
function showAlert(elementId, message, isError = true) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
  el.className = el.className.replace(/(bg-red-100|bg-green-100|text-red-700|text-green-700)/g, '').trim();
  if (isError) {
    el.className += ' bg-red-100 text-red-700';
  } else {
    el.className += ' bg-green-100 text-green-700';
  }
  // ซ่อนเองใน 4 วินาที
  setTimeout(() => el.classList.add('hidden'), 4000);
}

// ---------- 5. เช็กสถานะล็อกอิน (ใช้ในหน้าที่ต้องล็อกอิน) ----------
// ดึงโปรไฟล์มาแสดงชื่อใน navbar ถ้าไม่ได้ล็อกอินจะโดนเด้งไป auth.html โดย apiFetch
async function requireLogin() {
  try {
    const user = await apiFetch('/api/users/me');
    const nameEl = document.getElementById('nav-username');
    if (nameEl) nameEl.textContent = user.username;
    return user;
  } catch (err) {
    // apiFetch เด้งไป auth.html ให้แล้ว
    throw err;
  }
}

// ---------- 6. Logout ----------
async function logout() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch (err) {
    // ไม่สำคัญ ปล่อยไปหน้า login ได้เลย
  }
  window.location.href = '/auth.html';
}
