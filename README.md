# 🔥 POS Chang-Dang — ระบบจัดการร้านค้าออนไลน์บน LINE (PWA)

ระบบจัดการร้านค้าออนไลน์ ออกแบบมาสำหรับร้านอาหารโดยเฉพาะ ใช้งานบน LINE ได้ 100% รองรับการสั่งซื้อ, บริการส่งถึงที่ (Delivery) และรับที่ร้าน (Pickup) พร้อมระบบจัดการสต็อกและรายงานยอดขายครบวงจร

## 🚀 คุณสมบัติหลัก

- **ใช้งานบน LINE ได้ 100%**: สั่งอาหาร, จ่ายเงิน, แจ้งเตือน และจัดการร้านได้จากหน้าแชท LINE ไม่ต้องดาวน์โหลดแอปแยก
- **ระบบจัดการออเดอร์อัจฉริยะ**:
  - **Auto-accept**: ยอมรับออเดอร์อัตโนมัติ
  - **Smart reminders**: ระบบแจ้งเตือนลูกค้าหากลืมชำระเงิน
  - **OTP verification**: ยืนยันการรับสินค้าด้วย OTP ป้องกันการรับผิดคน
- **Multi-mode Ordering**:
  - **Delivery**: รองรับการส่งถึงที่พร้อมคำนวณระยะทาง
  - **Pickup**: รับที่ร้านสะดวก ประหยัดค่าส่ง
  - **Takeaway**: ห่อกลับบ้าน
- **Real-time Inventory Management**:
  - ตัดสต็อกทันทีเมื่อขาย
  - แจ้งเตือนเมื่อสินค้าใกล้หมด
  - ป้องกันขายสินค้าหมด
- **LINE OA Integration**:
  - บันทึก user ID อัตโนมัติเมื่อลูกค้า add bot
  - แจ้งเตือนพนักงานแบบ real-time ผ่าน LINE
- **Modern POS Interface**:
  - UI แบบมืออาชีพพร้อม dark mode
  - รองรับทั้งมือถือและคอมพิวเตอร์ (Responsive)
  - รองรับ QR code payment

---

## 🛠️ Tech Stack

### Frontend
- **Vue 3 + Vite**: เฟรมเวิร์กหลัก
- **Pinia**: State management
- **Tailwind CSS + daisyUI**: UI library & styling
- **LINE SDK**: เชื่อมต่อ LINE OA
- **PWA**: รองรับการติดตั้งบนมือถือเหมือนแอป

### Backend
- **FastAPI**: Python web framework
- **Turso DB**: Serverless PostgreSQL
- **LINE Messaging API**: จัดการ LINE OA

---

## ⚙️ Installation & Setup

### 1. Clone Repository
```bash
git clone <repo-url>
cd POS-Chang-Dang
```

### 2. Backend Setup
```bash
# สร้าง virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# ติดตั้ง dependencies
pip install -r backend/requirements.txt

# สร้าง .env файл (คัดลอก .env.example)
cp backend/.env.example backend/.env

# แก้ไขค่าใน .env ตาม your config:
# TURSO_DATABASE_URL
# TURSO_AUTH_TOKEN
# LINE_CHANNEL_SECRET
# LINE_CHANNEL_ACCESS_TOKEN
# SHOP_NAME

#migrate database
python backend/app/db/migrate.py

# Run backend
uvicorn backend.app.main:app --reload
```

### 3. Frontend Setup
```bash
# เข้า frontend directory
cd frontend

# ติดตั้ง dependencies
npm install

# แก้ไข vite.config.js (ถ้าจำเป็น)
# เปลี่ยน API_BASE_URL ให้ตรงกับ backend ของคุณ

# Run frontend
npm run dev
```

### 4. Test & Run
เปิดเว็บไซต์ที่ URL ที่แสดงใน `npm run dev` (ปกติคือ `http://localhost:5173`)

ทดสอบการทำงาน:
1. แอด LINE bot (ใช้บัญชีทดสอบ)
2. ลองสั่งซื้อผ่าน LINE (Delivery / Pickup)
3. ดูการแจ้งเตือนแบบ real-time บน backend terminal
4. ทดสอบระบบ OTP และการตัดสต็อก

---

## 🔐 Environment Variables

### Backend (.env)
```env
PORT=3000
TURSO_DATABASE_URL=libsql://... (ของคุณ)
TURSO_AUTH_TOKEN=... (ของคุณ)
LINE_CHANNEL_SECRET=... (ของคุณ)
LINE_CHANNEL_ACCESS_TOKEN=... (ของคุณ)
LINE_OWNER_USER_ID=... (ของคุณ)
SHOP_NAME=ร้านไก่ทอดช้างแดง
```

### Frontend
(ไม่มี .env, ตั้งค่าใน vite.config.js หรือ global env)
```js
const API_BASE_URL = 'http://localhost:3000';
```

---

## 🎯 Production Deployment

### Docker (แนะนำ)
```bash
# Build images
docker build -t changdang-pos-backend backend
docker build -t changdang-pos-frontend frontend

# Run containers
docker-compose up -d
```

### Render.com
(ดู deployment guide ใน wiki)

### Railway
(ดู deployment guide ใน wiki)

---

## 🤝 Contributing

1. Fork และสร้าง branch ใหม่
2. ทำตาม PEP8 style
3. เขียน tests สำหรับฟีเจอร์ใหม่
4. เปิด Pull Request

---

## 📝 License

MIT © [Chang-Dang Team]
