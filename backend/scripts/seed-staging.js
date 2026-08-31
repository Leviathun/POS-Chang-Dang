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
// Ensure env vars are loaded
require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || path.join(__dirname, '..', '..', '.env.staging') });

// Force staging flag if not set
process.env.APP_ENV = 'staging';

const { getDb, initDatabase } = require('../config/database');

async function seedStaging() {
  console.log('🚀 Starting Staging Database Initialization & Seeding...');

  try {
    // Step 1: Initialize schema and default menu/user/settings
    await initDatabase();
    const db = getDb();

    console.log('🧹 Clearing transaction tables in Staging DB...');
    // Clear sales and session logs for clean staging state
    await db.exec('DELETE FROM order_items');
    await db.exec('DELETE FROM orders');
    await db.exec('DELETE FROM archived_order_items');
    await db.exec('DELETE FROM archived_orders');
    await db.exec('DELETE FROM expenses');
    await db.exec('DELETE FROM stock_logs');
    await db.exec('DELETE FROM modifier_stock_logs');
    await db.exec('DELETE FROM cash_drawer_sessions');
    await db.exec('DELETE FROM activity_logs');

    console.log('📦 Seeding Staging Test Users & Cash Drawer Session...');

    const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
    const branchId = defaultBranch ? defaultBranch.id : 1;

    // Ensure test staff users exist
    const staffUser = await db.prepare('SELECT id FROM users WHERE pin = ?').get('1111');
    let staffId = staffUser ? staffUser.id : null;
    if (!staffId) {
      const res = await db.prepare('INSERT INTO users (branch_id, name, pin, role) VALUES (?, ?, ?, ?)')
        .run(branchId, 'พนักงานทดสอบ (Staging Staff)', '1111', 'staff');
      staffId = res.lastInsertRowid;
    }

    const adminUser = await db.prepare('SELECT id FROM users WHERE pin = ?').get('9999');
    let adminId = adminUser ? adminUser.id : null;
    if (!adminId) {
      const res = await db.prepare('INSERT INTO users (branch_id, name, pin, role) VALUES (?, ?, ?, ?)')
        .run(branchId, 'ผู้ดูแลระบบ (Staging Admin)', '9999', 'admin');
      adminId = res.lastInsertRowid;
    }

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

    // Log Activity
    await db.prepare(`
      INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
      VALUES (?, ?, 'STAGING_SEEDED', 'ทำการล้างข้อมูลยอดขายและสร้างข้อมูลทดสอบ Staging เรียบร้อยแล้ว', datetime('now', '+7 hours'))
    `).run(branchId, adminId);

    console.log('\n✨ Staging Database setup completed successfully!');
    console.log('----------------------------------------------------');
    console.log('🔑 Staging Accounts for Testing:');
    console.log('   - Admin PIN: 9999');
    console.log('   - Staff PIN: 1111');
    console.log('----------------------------------------------------');

  } catch (err) {
    console.error('❌ Failed to seed Staging DB:', err);
    process.exit(1);
  }
}

seedStaging();
