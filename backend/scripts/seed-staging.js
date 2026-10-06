/**
 * 🍗 Staging Database Seeding Script (Option A)
 * 
 * Purpose:
 * 1. Ensures database schema tables exist.
 * 2. Preserves / initializes real menu items, categories, recipes, and settings.
 * 3. Clears real production transactions (orders, expenses, drawer logs).
 * 4. Seeds realistic mock staging sales, drawer sessions, stock logs, and expenses
 *    so QA and owners can immediately test reports and POS operations in Staging.
 * 
 * Usage:
 *   node backend/scripts/seed-staging.js
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load .env.staging explicitly
const stagingEnvPath = path.join(__dirname, '..', '..', '.env.staging');
if (fs.existsSync(stagingEnvPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(stagingEnvPath));
  for (const k in envConfig) {
    if (envConfig[k]) {
      process.env[k] = envConfig[k];
    } else if (k === 'TURSO_DATABASE_URL' || k === 'TURSO_AUTH_TOKEN') {
      delete process.env[k]; // Ensure local fallback if staging credentials are empty in .env.staging
    }
  }
}

// Force staging flag
process.env.APP_ENV = 'staging';

const { getDb, initDatabase } = require('../config/database');

async function seedStaging() {
  console.log('🚀 Starting Staging Database Initialization & Seeding...');

  try {
    // Step 1: Initialize schema and default menu/user/settings
    await initDatabase();
    const db = getDb();

    console.log('🧹 Clearing transaction tables in Staging DB...');
    await db.exec('PRAGMA foreign_keys = OFF;');
    // Clear child tables first
    await db.exec('DELETE FROM employee_advances');
    await db.exec('DELETE FROM employee_payrolls');
    await db.exec('DELETE FROM employee_event_ot_participants');
    await db.exec('DELETE FROM employee_event_ots');
    await db.exec('DELETE FROM employee_attendance');
    await db.exec('DELETE FROM stock_logs');
    await db.exec('DELETE FROM modifier_stock_logs');
    await db.exec('DELETE FROM order_items');
    await db.exec('DELETE FROM orders');
    await db.exec('DELETE FROM archived_order_items');
    await db.exec('DELETE FROM archived_orders');
    await db.exec('DELETE FROM expenses');
    await db.exec('DELETE FROM cash_drawer_sessions');
    await db.exec('DELETE FROM activity_logs');
    await db.exec('PRAGMA foreign_keys = ON;');

    console.log('📦 Seeding Staging Test Users & Cash Drawer Session...');

    const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
    const branchId = defaultBranch ? defaultBranch.id : 1;

    // Ensure test staff users exist
    const staffUser = await db.prepare('SELECT id FROM users WHERE pin = ?').get('1111');
    let staffId = staffUser ? staffUser.id : null;
    if (!staffId) {
      const res = await db.prepare('INSERT INTO users (branch_id, name, pin, role, wage_type, wage_rate, skill_level, benefits, holdback_amount, is_holdback_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(branchId, 'พนักงานทดสอบ (Staging Staff)', '1111', 'staff', 'daily', 350, 'regular', 'ข้าวเที่ยงฟรี', 1000, 1);
      staffId = res.lastInsertRowid;
    }

    const adminUser = await db.prepare('SELECT id FROM users WHERE pin = ?').get('9999');
    let adminId = adminUser ? adminUser.id : null;
    if (!adminId) {
      const res = await db.prepare('INSERT INTO users (branch_id, name, pin, role, wage_type, wage_rate, skill_level, benefits, holdback_amount, is_holdback_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(branchId, 'ผู้ดูแลระบบ (Staging Admin)', '9999', 'admin', 'monthly', 18000, 'expert', 'ข้าวเที่ยงฟรี', 0, 0);
      adminId = res.lastInsertRowid;
    }

    // ─── Seed 6 Staging Employees Requested ──────────────────────
    const testEmployees = [
      { name: 'แรงใหม่', pin: '2001', wage_rate: 450, skill_level: 'regular', benefits: 'ข้าวเที่ยงฟรี' },
      { name: 'จอม', pin: '2002', wage_rate: 450, skill_level: 'regular', benefits: 'ข้าวเที่ยงฟรี' },
      { name: 'เล็ก', pin: '2003', wage_rate: 370, skill_level: 'regular', benefits: 'ข้าวเที่ยงฟรี' },
      { name: 'อ้อน', pin: '2004', wage_rate: 300, skill_level: 'trainee', benefits: 'ข้าวเที่ยงฟรี' },
      { name: 'คือใหญ่', pin: '2005', wage_rate: 300, skill_level: 'trainee', benefits: 'ข้าวเที่ยงฟรี' },
      { name: 'ดาว', pin: '2006', wage_rate: 300, skill_level: 'trainee', benefits: 'ข้าวเที่ยงฟรี' }
    ];

    const employeeIds = [];
    for (const emp of testEmployees) {
      let existingEmp = await db.prepare('SELECT id FROM users WHERE name = ? OR pin = ?').get(emp.name, emp.pin);
      if (existingEmp) {
        await db.prepare(`
          UPDATE users SET
            wage_type = 'daily',
            wage_rate = ?,
            skill_level = ?,
            benefits = ?,
            holdback_amount = 1000,
            is_holdback_enabled = 1
          WHERE id = ?
        `).run(emp.wage_rate, emp.skill_level, emp.benefits, existingEmp.id);
        employeeIds.push(existingEmp.id);
      } else {
        const res = await db.prepare(`
          INSERT INTO users (branch_id, name, pin, role, wage_type, wage_rate, skill_level, benefits, holdback_amount, is_holdback_enabled)
          VALUES (?, ?, ?, 'staff', 'daily', ?, ?, ?, 1000, 1)
        `).run(branchId, emp.name, emp.pin, emp.wage_rate, emp.skill_level, emp.benefits);
        employeeIds.push(res.lastInsertRowid);
      }
    }
    console.log(`  👥 บันทึกข้อมูลพนักงานทดลอง 6 คน (แรงใหม่, จอม, เล็ก, อ้อน, คือใหญ่, ดาว) เรียบร้อย`);

    // Create a mock active Cash Drawer session for today
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const drawerRes = await db.prepare(`
      INSERT INTO cash_drawer_sessions (
        branch_id, session_date, opening_cash, expected_cash, status, created_at
      ) VALUES (?, ?, ?, ?, 'open', datetime('now', '+7 hours'))
    `).run(branchId, todayStr, 500.0, 1850.0);
    
    const drawerId = drawerRes.lastInsertRowid;

    console.log(`  💵 สร้างกะการเงินทดสอบ (ID: ${drawerId}, วันที่: ${todayStr}, เงินเริ่มต้น: 500 บาท)`);

    // Fetch existing menu items for creating mock orders
    const menuItems = await db.prepare('SELECT id, name, price FROM menu_items WHERE active = 1 LIMIT 5').all();

    if (menuItems.length > 0) {
      console.log('🛒 Generating mock test orders for Staging...');

      // Mock Order 1 (Cash payment)
      const item1 = menuItems[0];
      const item2 = menuItems[1] || menuItems[0];
      const subtotal1 = (item1.price * 2) + item2.price;
      const total1 = subtotal1;

      const order1 = await db.prepare(`
        INSERT INTO orders (
          branch_id, order_number, staff_id, subtotal, discount, total, payment_method, cash_received, cash_change, status, session_id, created_at
        ) VALUES (?, ?, ?, ?, 0, ?, 'cash', ?, ?, 'completed', ?, datetime('now', '-2 hours', '+7 hours'))
      `).run(branchId, `STG-${todayStr.replace(/-/g, '')}-0001`, staffId, subtotal1, total1, total1 + 100, 100, drawerId);

      await db.prepare(`
        INSERT INTO order_items (order_id, menu_item_id, item_name, item_price, quantity, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(order1.lastInsertRowid, item1.id, item1.name, item1.price, 2, item1.price * 2);

      await db.prepare(`
        INSERT INTO order_items (order_id, menu_item_id, item_name, item_price, quantity, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(order1.lastInsertRowid, item2.id, item2.name, item2.price, 1, item2.price);

      // Mock Order 2 (PromptPay QR payment)
      const subtotal2 = item1.price;
      const total2 = subtotal2;

      const order2 = await db.prepare(`
        INSERT INTO orders (
          branch_id, order_number, staff_id, subtotal, discount, total, payment_method, status, session_id, created_at
        ) VALUES (?, ?, ?, ?, 0, ?, 'qr', 'completed', ?, datetime('now', '-30 minutes', '+7 hours'))
      `).run(branchId, `STG-${todayStr.replace(/-/g, '')}-0002`, staffId, subtotal2, total2, drawerId);

      await db.prepare(`
        INSERT INTO order_items (order_id, menu_item_id, item_name, item_price, quantity, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(order2.lastInsertRowid, item1.id, item1.name, item1.price, 1, item1.price);

      console.log('  ✅ สร้างคำสั่งซื้อทดสอบ 2 รายการเรียบร้อย');
    }

    // Create a mock expense
    await db.prepare(`
      INSERT INTO expenses (
        branch_id, staff_id, session_id, category, note, amount, payment_method, created_at
      ) VALUES (?, ?, ?, 'ของสด/วัตถุดิบ', 'ซื้อวัตถุดิบไก่สดเติมร้าน (ทดสอบ Staging)', 250.0, 'cash', datetime('now', '-1 hour', '+7 hours'))
    `).run(branchId, staffId, drawerId);

    console.log('  💸 สร้างรายการรายจ่ายทดสอบ 1 รายการ (250 บาท)');

    // ─── Seed Mock Employee Attendance for current month ─────────
    const currentMonth = todayStr.substring(0, 7);
    const mockUsers = await db.prepare("SELECT id, name FROM users WHERE role = 'staff'").all();
    
    // Seed attendance for today and previous 4 days
    for (let dayOffset = 0; dayOffset <= 4; dayOffset++) {
      const d = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      const dStr = d.toISOString().split('T')[0];
      
      for (const u of mockUsers) {
        // Mock: some present, some leave
        const isAbsent = (u.name === 'ดาว' && dayOffset === 1) || (u.name === 'อ้อน' && dayOffset === 2);
        const status = isAbsent ? 'leave_unpaid' : 'present';
        const reason = isAbsent ? 'ลากิจส่วนตัว' : null;
        const lunch = status === 'present' ? 1 : 0;
        
        await db.prepare(`
          INSERT INTO employee_attendance (branch_id, user_id, work_date, status, leave_reason, had_lunch_benefit, note)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(branchId, u.id, dStr, status, reason, lunch, status === 'present' ? 'มาทำงานปกติ' : 'ลาหยุด (ไม่ได้รับค่าจ้าง)');
      }
    }
    console.log('  📅 สร้างข้อมูลการลงเวลาทำงานและลาหยุดย้อนหลัง 5 วันเรียบร้อย');

    // Seed Mock Event OT: 'ทำป้ายโปรโมชั่นร้าน' (100 บาท/คน)
    const otRes = await db.prepare(`
      INSERT INTO employee_event_ots (branch_id, event_name, event_date, amount_per_person, created_by, note)
      VALUES (?, 'ช่วยทำป้ายโปรโมชั่นร้าน', ?, 100, ?, 'ช่วยตัดและติดป้ายไวนิลหน้าร้าน')
    `).run(branchId, todayStr, adminId);
    
    const otId = otRes.lastInsertRowid;
    // Add 3 staff participants
    for (let i = 0; i < Math.min(3, mockUsers.length); i++) {
      await db.prepare(`
        INSERT INTO employee_event_ot_participants (event_ot_id, user_id, amount)
        VALUES (?, ?, 100)
      `).run(otId, mockUsers[i].id);
    }
    console.log('  🏷️ สร้างข้อมูล OT อีเวนต์: "ช่วยทำป้ายโปรโมชั่นร้าน" คนละ 100 บาท');

    // Seed Mock Salary Advance: 'เล็ก' เบิกเงินสด 500 บาท
    const lekUser = mockUsers.find(u => u.name === 'เล็ก') || mockUsers[0];
    if (lekUser) {
      await db.prepare(`
        INSERT INTO employee_advances (branch_id, user_id, amount, advance_date, payment_method, status, note, created_by)
        VALUES (?, ?, 500, ?, 'cash', 'pending', 'เบิกค่าใช้จ่ายฉุกเฉิน', ?)
      `).run(branchId, lekUser.id, todayStr, adminId);
      console.log(`  💸 สร้างข้อมูลเบิกเงินล่วงหน้า: ${lekUser.name} 500 บาท`);
    }

    // Log Activity
    await db.prepare(`
      INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
      VALUES (?, ?, 'STAGING_SEEDED', 'ทำการล้างข้อมูลยอดขายและสร้างข้อมูลทดสอบ Staging เรียบร้อยแล้ว', datetime('now', '+7 hours'))
    `).run(branchId, adminId);

    console.log('\n✨ Staging Database setup completed successfully!');
    console.log('----------------------------------------------------');
    console.log('🔑 Staging Accounts for Testing:');
    console.log('   - Admin PIN: 9999 (ผู้ดูแลระบบ)');
    console.log('   - Staff PIN: 1111 (พนักงานทดสอบ)');
    console.log('   - แรงใหม่ PIN: 2001 (450 บ./วัน)');
    console.log('   - จอม PIN: 2002 (450 บ./วัน)');
    console.log('   - เล็ก PIN: 2003 (370 บ./วัน)');
    console.log('   - อ้อน PIN: 2004 (300 บ./วัน)');
    console.log('   - คือใหญ่ PIN: 2005 (300 บ./วัน)');
    console.log('   - ดาว PIN: 2006 (300 บ./วัน)');
    console.log('----------------------------------------------------');

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to seed Staging DB:', err);
    process.exit(1);
  }
}

seedStaging();
