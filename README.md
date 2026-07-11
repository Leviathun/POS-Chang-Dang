# 🍗 Chang Dang POS — Point of Sale for Chang Dang Fried Chicken

A robust, modern, and highly-optimized Point of Sale (POS) system custom-tailored for **Chang Dang Fried Chicken (ร้านไก่ทอดช้างแดง)**. Designed for multi-branch operations, real-time inventory management, daily cash drawer auditing, expense tracking, and thermal receipt printing over WebUSB.

---

## 🚀 Key Features

### 1. Multi-Branch Operations (ระบบหลายสาขา)
- Supports isolated data configurations per branch (e.g., Main Branch "สาขาหลัก (ช้างแดง)", Sub-Branch "สาขารอง").
- Menu items, categories, stocks, cash drawer sessions, and expenses are managed independently for each branch.
- Admins can view and toggle between any branch, while staff are restricted to their assigned branch.

### 2. Role-Based PIN Authentication (ระบบความปลอดภัย PIN)
- Quick user switching on POS terminals using numeric PINs.
- Supports two authorization levels:
  - **Admin (Owner)**: Full access to POS, settings, reports, menus, bulk stock adjustments, and cash drawer settings. Default PIN: `1234`.
  - **Staff (Employee)**: Access to the POS checkout interface, stock viewing, and expense logging for their assigned branch. Default PIN: `0000`.

### 3. POS Cashier & Checkout (ระบบขายหน้าร้าน)
- Responsive split-pane layout optimized for desktops, tablets, and mobile devices.
- Live category tabs and quick search.
- Interactive cart handling: quantity adjustments, customer notes, item discounts, and bill-level discounts.
- Supports multiple payment methods:
  - **Cash (`cash`)**
  - **PromptPay QR (`qr`)**
  - **Government Scheme (`gov`)**
  - **Delivery Apps (`delivery`)**

### 4. Smart Inventory & Recipe Dependencies (ระบบจัดการสต็อกอัจฉริยะ)
- Real-time stock deduction immediately upon order completion.
- **Recipe Dependencies**: The system automatically verifies and deducts raw stock (e.g., ordering "แร็ปไก่" (chicken wrap) automatically checks and deducts "ไก่ไร้กระดูก" (boneless chicken) raw ingredient stock).
- Low stock threshold alerts with visual badges on the POS screen.
- Detailed stock logging for audit tracking with categorizations (`sale`, `restock`, `adjustment`, `waste`, `cancel_restore`, `staff_benefit`).
- Bulk stock adjustment interface for quick inventory counts.

### 5. Modifier & Preset Management (ตัวเลือกและสูตรปรุง)
- Customers can add extra modifiers (sauces, powders, dipping sauces) like "ผงชีส" or "น้ำจิ้มพริกคั่วมะขาม" to their items.
- Real-time modifier stock tracking (servings per bag and total remaining servings).
- **Modifier Presets**: Group multiple modifiers into a preset (e.g., "มะเขือเทศ + ผงชีส") to allow fast selection at checkout.

### 6. Daily Cash Drawer Sessions (ระบบกะการเงินลิ้นชัก)
- Automatically creates a silent cash drawer session on the first transaction of the day.
- Allows admins to set or edit the **Opening Cash** (defaulting to 500 Baht).
- Real-time calculations of **Expected Cash** based on opening cash, cash sales, and cash expenses.
- **End-of-Day Checkout**: Employees enter actual cash in drawer, the system calculates discrepancies (differences/losses), closes the session, and archives the day's orders.

### 7. Expense Logging (ระบบรายจ่ายร้านค้า)
- Staff can record expenses (e.g., fresh ingredient supply, utility bills) directly from the POS interface.
- Expense payment methods:
  - **Cash (`cash`)**: Deducted from the cash drawer session expected balance.
  - **Bank Transfer (`transfer`)**: Tracked in reports without affecting cash drawer expected balances.
- Each expense is associated with the active cash drawer session and the clerk who recorded it.

### 8. ESC/POS WebUSB & RawBT Thermal Printing (พิมพ์ใบเสร็จ & เตะลิ้นชัก)
- Native WebUSB integration to communicate directly with thermal receipt printers from the browser without drivers.
- **Thai Language Encoding**: Automatically converts Unicode Thai characters into standard **TIS-620 / CP874** bytes inside JavaScript, ensuring clean Thai text output on Epson/compatible printers.
- **Cash Drawer Kicking**: Universal trigger commands (`ESC p 0 20 100` and Sunmi DLE DC4 variations) automatically kick open the cash drawer when completing cash orders or doing checkouts.
- Offline-ready print templates using Epson Thai Codepage 26.

### 9. Activity Logs & Auditing (บันทึกกิจกรรมพนักงาน)
- Automatic logging of critical actions (e.g., PIN logins, stock adjustments, expense logging, settings changes, order cancellations).
- Helps managers monitor operations and trace cashier discrepancies.

### 10. Reports & Analytics (รายงานยอดขาย)
- Comprehensive analytics dashboard for owners:
  - Gross sales, net sales, discounts, and total expenses.
  - Breakdown of sales by payment methods.
  - Top-selling items.
  - Detailed daily cash drawer session logs and activity logs.

---

## 🛠️ Tech Stack

### Frontend
* **Vue 3 + Vite**: Core Single Page Application framework.
* **Vue Router**: Client-side routing.
* **WebUSB API**: Native hardware communication with thermal printers.
* **Vanilla CSS**: Responsive, dark-themed, premium custom stylesheet (`style.css`). No third-party heavy CSS frameworks to ensure instant loads.

### Backend
* **Node.js + Express.js**: Lightweight and fast REST API backend.
* **@libsql/client**: Connection adapter for Turso Database.
* **dotenv & cors**: Configuration and cross-origin resource sharing.
* **nodemon & concurrently**: Development task automation.

### Database
* **Turso DB / SQLite**: Serverless relational database.
* **Embedded Replicas**: For persistent server environments, it automatically syncs with the remote cloud Turso DB every 60 seconds. Reads are made locally at sub-millisecond speeds, while writes are synchronized to the cloud replica.
* **Local Database Fallback**: If no cloud credentials are provided, it falls back to a local SQLite database (`data/pos.db`).

---

## 📁 Project Directory Layout

```
POS-Chang-Dang/
├── api/                   # Vercel Serverless entrypoint (maps to backend)
│   └── index.js
├── backend/               # Express.js REST API Backend
│   ├── config/            # Database initialization and singleton client
│   ├── middleware/        # Authentication and authorization guards
│   ├── routes/            # REST API Routes (auth, orders, cash drawers, stock, expenses, reports, etc.)
│   ├── services/          # Business logic services (reports calculations)
│   ├── server.js          # Express server entrypoint
│   └── package.json
├── data/                  # Local SQLite database files (gitignored)
├── dist/                  # Compiled production static files of the frontend
├── frontend/              # Vue 3 Frontend
│   ├── src/
│   │   ├── assets/        # Emojis, images, and custom style.css (40+ KB design)
│   │   ├── components/    # Reusable Vue components (PaymentModal, etc.)
│   │   ├── router/        # Vue Router index
│   │   ├── utils/         # WebUSB ESC/POS Thai printer utility
│   │   ├── views/         # Pages: POS, Menu, Stock, Settings, Reports, Bulk Stock
│   │   ├── App.vue        # Main layout
│   │   ├── api.js         # API client configurations
│   │   └── main.js
│   └── vite.config.js
├── package.json           # Root package.json managing workspaces
├── vercel.json            # Vercel deployment configurations
└── README.md
```

---

## ⚙️ Configuration & Quick Start

### 1. Prerequisiets
Ensure you have [Node.js (v18+)](https://nodejs.org/) installed.

### 2. Installation
Clone the repository and install all dependencies for both workspace directories from the root:
```bash
git clone <repository_url>
cd POS-Chang-Dang
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory. You can copy the template:
```bash
cp .env.example .env
```
Inside `.env`, configure the server port and database details:
```env
# Server running port
PORT=3000

# Turso Cloud DB (Leave empty to use local SQLite)
TURSO_DATABASE_URL=libsql://your-database-name.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token
```

### 4. Run in Development Mode
To start both the frontend Vite dev server and the backend Express server concurrently:
```bash
npm run dev
```
- **Backend API**: Runs on `http://localhost:3000` (updates automatically on changes).
- **Frontend App**: Runs on `http://localhost:5173` (proxied `/api` requests to backend).

On startup, the system automatically:
1. Initializes database schema tables.
2. Creates indexes for performance.
3. Seeds the first branch: `สาขาหลัก (ช้างแดง)`.
4. Seeds default users:
   - **Admin (Owner)**: PIN `1234`
   - **Staff (Employee)**: PIN `0000`
5. Seeds default categories, settings, modifiers, and modifier presets.

---

## 🚀 Production Deployment

### 1. Production Build
Compile the frontend code:
```bash
npm run build
```
This builds and optimizes the Vue 3 application into the `dist/` directory at the root level.

### 2. Run Production Server
Start the Express server in production:
```bash
npm start
```
The server will bind to the configured `PORT` and serve:
- The REST API under `/api/*`
- Static frontend files compiled in `dist/` under all other routes.

### 3. Cloud Deployment (Vercel Serverless)
This repository is configured to deploy directly to [Vercel](https://vercel.com/):
- `vercel.json` directs all API traffic to `api/index.js` and public traffic to `dist/`.
- In Vercel, set your environment variables (`TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`) in the project settings.
- The serverless environment automatically skips local database replication and connects directly to the Turso cloud database to prevent cold-start bottlenecks.

---

## 🤝 Contributing
1. Fork the repository and create your branch.
2. Ensure your changes follow clean, robust, and commented code standards.
3. Test your endpoints and frontend UI states thoroughly.
4. Open a Pull Request.

---

## 📝 License
This project is licensed under the [MIT License](LICENSE).
