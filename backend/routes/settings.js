const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { attachUser, requireAdmin } = require('../middleware/auth');

// ใช้ middleware ตรวจสอบผู้ใช้ทุก route
router.use(attachUser);

// Helper function to get branch ID of logged-in user or first branch (supporting admin override)
async function getBranchId(req, db) {
  let branchId = req.user ? req.user.branch_id : null;
  const paramBranchId = req.query.branch_id || (req.body ? req.body.branch_id : null);
  if (req.user && req.user.role === 'admin' && paramBranchId) {
    branchId = Number(paramBranchId);
  }
  if (!branchId) {
    const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
    branchId = defaultBranch ? defaultBranch.id : null;
  }
  return branchId;
}

// ─── GET / — ดึงตั้งค่าทั้งหมด (key-value object) ───────
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const branchId = await getBranchId(req, db);
    const rows = await db.prepare('SELECT key, value, updated_at FROM settings WHERE branch_id = ?').all(branchId);

    // แปลงเป็น object { key: value }
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('❌ Get settings error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลตั้งค่า'
    });
  }
});

// ─── PUT / — อัปเดตตั้งค่าเดียว ─────────────────────────
router.put('/', requireAdmin, async (req, res) => {
  try {
    const { key, value } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ key'
      });
    }

    const db = getDb();
    const branchId = await getBranchId(req, db);

    // ใช้ UPSERT (INSERT OR REPLACE)
    await db.prepare(`
      INSERT INTO settings (branch_id, key, value, updated_at) 
      VALUES (?, ?, ?, datetime('now', 'localtime'))
      ON CONFLICT(branch_id, key) DO UPDATE SET 
        value = excluded.value,
        updated_at = datetime('now', 'localtime')
    `).run(branchId, key, String(value));

    const updated = await db.prepare('SELECT * FROM settings WHERE branch_id = ? AND key = ?').get(branchId, key);

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('❌ Update setting error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการอัปเดตตั้งค่า'
    });
  }
});

// ─── PUT /bulk — อัปเดตตั้งค่าหลายรายการ ────────────────
router.put('/bulk', requireAdmin, async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || !Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ settings เป็น array ของ { key, value }'
      });
    }

    const db = getDb();
    const branchId = await getBranchId(req, db);

    const updateBulk = db.transaction(async () => {
      const upsert = db.prepare(`
        INSERT INTO settings (branch_id, key, value, updated_at) 
        VALUES (?, ?, ?, datetime('now', 'localtime'))
        ON CONFLICT(branch_id, key) DO UPDATE SET 
          value = excluded.value,
          updated_at = datetime('now', 'localtime')
      `);

      for (const setting of settings) {
        if (!setting.key) continue;
        await upsert.run(branchId, setting.key, String(setting.value));
      }

      // ดึงค่าทั้งหมดกลับ
      const rows = await db.prepare('SELECT key, value FROM settings WHERE branch_id = ?').all(branchId);
      const result = {};
      for (const row of rows) {
        result[row.key] = row.value;
      }
      return result;
    });

    const result = await updateBulk();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Bulk update settings error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการอัปเดตตั้งค่า'
    });
  }
});

// ─── GET /backup/export — ส่งออกข้อมูลทั้งหมดเป็น JSON ────────────────────────
router.get('/backup/export', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const tables = [
      'branches', 'users', 'categories', 'menu_items', 
      'orders', 'order_items', 'stock_logs', 'settings', 'expenses', 
      'activity_logs', 'modifiers', 
      'modifier_stock_logs', 'modifier_presets', 'archived_orders', 
      'archived_order_items'
    ];
    
    const backup = {};
    for (const table of tables) {
      try {
        backup[table] = await db.prepare(`SELECT * FROM ${table}`).all();
      } catch (tableErr) {
        console.warn(`⚠️ Table ${table} backup failed:`, tableErr.message);
        backup[table] = [];
      }
    }

    res.json({
      success: true,
      data: backup
    });
  } catch (error) {
    console.error('❌ Export backup error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้างไฟล์สำรองข้อมูล'
    });
  }
});

// ─── POST /backup/import — นำเข้ากู้คืนข้อมูลจากไฟล์ JSON ───────────────────────
router.post('/backup/import', requireAdmin, async (req, res) => {
  try {
    const { backup } = req.body;
    const db = getDb();

    if (!backup || typeof backup !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'รูปแบบข้อมูลสำรองไม่ถูกต้อง'
      });
    }

    const importTx = db.transaction(async () => {
      // 1. ล้างข้อมูลทุกตารางก่อน
      const orderOfDeletion = [
        'activity_logs', 'modifier_stock_logs', 'stock_logs', 
        'order_items', 'archived_order_items', 'orders', 'archived_orders', 
        'modifier_presets', 'modifiers', 'menu_items', 
        'categories', 'users', 'branches', 'settings', 'expenses'
      ];

      for (const table of orderOfDeletion) {
        try {
          await db.prepare(`DELETE FROM ${table}`).run();
        } catch (delErr) {
          console.warn(`⚠️ Clean table ${table} failed:`, delErr.message);
        }
      }

      // 2. เขียนข้อมูลกลับทีละตารางตามลำดับความสัมพันธ์หลักก่อน
      const orderOfInsertion = [
        'branches', 'users', 'categories', 'menu_items', 
        'orders', 'order_items', 'stock_logs', 'settings', 'expenses', 
        'activity_logs', 'modifiers', 
        'modifier_stock_logs', 'modifier_presets', 'archived_orders', 
        'archived_order_items'
      ];

      for (const table of orderOfInsertion) {
        const rows = backup[table];
        if (!rows || !Array.isArray(rows) || rows.length === 0) continue;

        // ดึง keys จากแถวแรก เพื่อสร้างคอลัมน์และ placeholders
        const sampleRow = rows[0];
        const keys = Object.keys(sampleRow);
        const columns = keys.join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const insertStmt = db.prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`);

        for (const row of rows) {
          const vals = keys.map(k => row[k]);
          await insertStmt.run(vals);
        }
      }

      return true;
    });

    await importTx();

    res.json({
      success: true,
      message: 'กู้คืนข้อมูลระบบสำเร็จเสร็จสิ้น'
    });
  } catch (error) {
    console.error('❌ Import backup error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการนำข้อมูลเข้า: ' + error.message
    });
  }
});

// ─── GET /backup/sqlite — ดาวน์โหลดไฟล์ฐานข้อมูล SQLite ตรงๆ ────────────────
router.get('/backup/sqlite', requireAdmin, async (req, res) => {
  try {
    const path = require('path');
    const fs = require('fs');
    const dbPath = path.join(__dirname, '..', '..', 'data', 'pos.db');

    if (fs.existsSync(dbPath) && !process.env.TURSO_DATABASE_URL) {
      res.download(dbPath, 'pos-changdang.db');
    } else {
      res.status(400).json({
        success: false,
        error: 'ระบบนี้เชื่อมต่อฐานข้อมูลบน Cloud หรือไม่พบไฟล์ฐานข้อมูลในเครื่อง'
      });
    }
  } catch (error) {
    console.error('❌ SQLite backup error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการส่งออกไฟล์ SQLite'
    });
  }
});

// ─── GET /backup/csv-summary — ส่งออกรายงานสรุปครบ 7 หมวดหมู่ใน 1 ไฟล์ CSV ───
router.get('/backup/csv-summary', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const monthsParam = req.query.months;
    const branchParam = req.query.branch_id;
    
    // Time filter setup
    let timeClauseOrders = '';
    let timeClauseExpenses = '';
    let timeClauseSessions = '';
    let timeParams = [];

    let periodLabel = 'ข้อมูลทั้งหมด (All Time)';
    if (monthsParam && monthsParam !== 'all' && !isNaN(Number(monthsParam)) && Number(monthsParam) > 0) {
      const m = Number(monthsParam);
      periodLabel = `${m} เดือนที่ผ่านมา`;
      timeClauseOrders = `created_at >= datetime('now', 'localtime', '-' || ? || ' month')`;
      timeClauseExpenses = `expense_date >= date('now', 'localtime', '-' || ? || ' month')`;
      timeClauseSessions = `session_date >= date('now', 'localtime', '-' || ? || ' month')`;
      timeParams = [m];
    }

    // Branch filter setup
    let branchClause = '';
    let branchParams = [];
    let branchLabel = 'ทุกสาขา (All Branches)';

    if (branchParam && branchParam !== 'all' && !isNaN(Number(branchParam))) {
      const bId = Number(branchParam);
      branchClause = `branch_id = ?`;
      branchParams = [bId];
      const branchRow = await db.prepare('SELECT name FROM branches WHERE id = ?').get(bId);
      if (branchRow) branchLabel = branchRow.name;
    }

    // Helper to build WHERE statement
    const buildWhere = (timeClause, branchClause) => {
      const parts = [];
      if (branchClause) parts.push(branchClause);
      if (timeClause) parts.push(timeClause);
      return parts.length > 0 ? 'WHERE ' + parts.join(' AND ') : '';
    };

    const buildParams = (timeClause) => {
      const resParams = [];
      if (branchClause) resParams.push(...branchParams);
      if (timeClause && timeParams.length > 0) resParams.push(...timeParams);
      return resParams;
    };

    // Helper to escape CSV cell
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    // ── 1. ดึงข้อมูลสาขาและพนักงานสำหรับ Map ชื่อ ──
    const allBranches = await db.prepare('SELECT id, name FROM branches').all();
    const branchMap = {};
    allBranches.forEach(b => { branchMap[b.id] = b.name; });

    const allUsers = await db.prepare('SELECT id, name FROM users').all();
    const userMap = {};
    allUsers.forEach(u => { userMap[u.id] = u.name; });

    // ── 2. ดึงข้อมูล 7 หมวดหมู่ ──
    
    // [1] สรุปยอดขาย
    const whereOrders = buildWhere(timeClauseOrders, branchClause);
    const paramsOrders = buildParams(timeClauseOrders);
    
    const ordersOverview = await db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(subtotal), 0) as total_subtotal,
        COALESCE(SUM(discount), 0) as total_discount,
        COALESCE(SUM(total), 0) as total_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) as cash_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'qr' THEN total ELSE 0 END), 0) as qr_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'delivery' THEN total ELSE 0 END), 0) as delivery_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'gov' THEN total ELSE 0 END), 0) as gov_sales
      FROM orders
      ${whereOrders ? whereOrders + " AND status = 'completed'" : "WHERE status = 'completed'"}
    `).get(...paramsOrders);

    // [2] ค่าใช้จ่ายรวม
    const whereExpenses = buildWhere(timeClauseExpenses, branchClause);
    const paramsExpenses = buildParams(timeClauseExpenses);
    const expenseOverview = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses ${whereExpenses}
    `).get(...paramsExpenses);

    const totalSales = Number(ordersOverview?.total_sales || 0);
    const totalExpenses = Number(expenseOverview?.total_expenses || 0);
    const netProfit = totalSales - totalExpenses;
    const totalOrders = Number(ordersOverview?.total_orders || 0);
    const avgOrder = totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : '0.00';

    // [3] อันดับสินค้าขายดี (Top Selling Items)
    const topItemsTimeClause = timeParams.length > 0 ? `o.created_at >= datetime('now', 'localtime', '-' || ? || ' month')` : '';
    const topItemsBranchClause = branchParams.length > 0 ? `o.branch_id = ?` : '';
    const topItemsWhere = buildWhere(topItemsTimeClause, topItemsBranchClause);
    
    const topItems = await db.prepare(`
      SELECT 
        oi.item_name,
        COALESCE(c.name, 'ทั่วไป') as category_name,
        SUM(oi.quantity) as total_qty,
        SUM(oi.subtotal) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      LEFT JOIN categories c ON mi.category_id = c.id
      ${topItemsWhere ? topItemsWhere + " AND o.status = 'completed'" : "WHERE o.status = 'completed'"}
      GROUP BY oi.item_name, c.name
      ORDER BY total_qty DESC
      LIMIT 50
    `).all(...paramsOrders);

    // [4] ประวัติออเดอร์ย้อนหลัง (Orders History)
    const ordersList = await db.prepare(`
      SELECT 
        o.id,
        o.order_number,
        o.branch_id,
        o.staff_id,
        o.subtotal,
        o.discount,
        o.total,
        o.payment_method,
        o.status,
        o.note,
        o.created_at
      FROM orders o
      ${whereOrders}
      ORDER BY o.id DESC
    `).all(...paramsOrders);

    // ดึง Items ของออเดอร์เพื่อประกอบในคอลัมน์รายการอาหาร
    const orderItemsMap = {};
    if (ordersList.length > 0) {
      const orderIds = ordersList.map(o => o.id);
      // แบ่ง batch ละ 500 ID เพื่อความปลอดภัยของ query
      for (let i = 0; i < orderIds.length; i += 500) {
        const chunk = orderIds.slice(i, i + 500);
        const placeholders = chunk.map(() => '?').join(',');
        const items = await db.prepare(`
          SELECT order_id, item_name, quantity, item_price, subtotal, options
          FROM order_items
          WHERE order_id IN (${placeholders})
        `).all(...chunk);

        items.forEach(it => {
          if (!orderItemsMap[it.order_id]) orderItemsMap[it.order_id] = [];
          const optStr = it.options ? ` (${it.options})` : '';
          orderItemsMap[it.order_id].push(`${it.item_name}${optStr} x${it.quantity}`);
        });
      }
    }

    // [5] บันทึกค่าใช้จ่าย (Daily Expenses)
    const expensesList = await db.prepare(`
      SELECT 
        id, branch_id, staff_id, amount, category, note, expense_date, created_at, payment_method
      FROM expenses
      ${whereExpenses}
      ORDER BY expense_date DESC, id DESC
    `).all(...paramsExpenses);

    // [6] ประวัติสต็อก (Stock Logs)
    const stockTimeClause = timeParams.length > 0 ? `sl.created_at >= datetime('now', 'localtime', '-' || ? || ' month')` : '';
    const stockBranchClause = branchParams.length > 0 ? `sl.branch_id = ?` : '';
    const whereStock = buildWhere(stockTimeClause, stockBranchClause);
    const paramsStock = buildParams(timeClauseOrders);

    const stockLogs = await db.prepare(`
      SELECT 
        sl.id,
        sl.branch_id,
        sl.change_qty,
        sl.previous_stock,
        sl.new_stock,
        sl.reason,
        sl.staff_id,
        sl.note,
        sl.created_at,
        mi.name as item_name
      FROM stock_logs sl
      LEFT JOIN menu_items mi ON sl.menu_item_id = mi.id
      ${whereStock}
      ORDER BY sl.id DESC
    `).all(...paramsStock);

    // [7] ประวัติกิจกรรมพนักงาน (Activity Logs)
    const whereActivities = buildWhere(timeClauseOrders, branchClause);
    const paramsActivities = buildParams(timeClauseOrders);
    const activityLogs = await db.prepare(`
      SELECT id, branch_id, user_id, action, details, created_at
      FROM activity_logs
      ${whereActivities}
      ORDER BY id DESC
    `).all(...paramsActivities);

    // [8] ตรวจสอบยอดลิ้นชัก (Cash Drawer Sessions)
    const whereSessions = buildWhere(timeClauseSessions, branchClause);
    const paramsSessions = buildParams(timeClauseSessions);
    const cashSessions = await db.prepare(`
      SELECT id, branch_id, session_date, opening_cash, expected_cash, actual_cash, difference, status, note, created_at
      FROM cash_drawer_sessions
      ${whereSessions}
      ORDER BY session_date DESC, id DESC
    `).all(...paramsSessions);

    // ── 3. สร้างเนื้อหา 1 CSV Multi-Section ──
    const lines = [];

    // Header ของเอกสาร
    lines.push(escapeCsv('================================================================================'));
    lines.push(escapeCsv(`รายงานสรุปข้อมูลร้าน (POS CHANG DANG) - ช่วงเวลา: ${periodLabel}`));
    lines.push(escapeCsv(`สาขา: ${branchLabel} | วันที่ส่งออกข้อมูล: ${new Date().toLocaleString('th-TH')}`));
    lines.push(escapeCsv('================================================================================'));
    lines.push('');

    // --- Section 1: สรุปภาพรวมยอดขาย ---
    lines.push(escapeCsv('=== [1] สรุปภาพรวมยอดขาย (SALES OVERVIEW) ==='));
    lines.push([escapeCsv('หัวข้อสรุป'), escapeCsv('จำนวน / มูลค่า (บาท)')].join(','));
    lines.push([escapeCsv('ยอดขายรวมทั้งหมด (Total Sales)'), escapeCsv(totalSales.toFixed(2))].join(','));
    lines.push([escapeCsv('ส่วนลดรวม (Total Discounts)'), escapeCsv(Number(ordersOverview?.total_discount || 0).toFixed(2))].join(','));
    lines.push([escapeCsv('ค่าใช้จ่ายรวมทั้งหมด (Total Expenses)'), escapeCsv(totalExpenses.toFixed(2))].join(','));
    lines.push([escapeCsv('กำไรเบื้องต้น (Net Profit)'), escapeCsv(netProfit.toFixed(2))].join(','));
    lines.push([escapeCsv('จำนวนบิลที่สำเร็จ (Total Orders)'), escapeCsv(totalOrders)].join(','));
    lines.push([escapeCsv('ยอดขายเฉลี่ยต่อบิล (Avg per Order)'), escapeCsv(avgOrder)].join(','));
    lines.push([escapeCsv('• ยอดชำระด้วยเงินสด (Cash)'), escapeCsv(Number(ordersOverview?.cash_sales || 0).toFixed(2))].join(','));
    lines.push([escapeCsv('• ยอดชำระด้วย QR Code (PromptPay)'), escapeCsv(Number(ordersOverview?.qr_sales || 0).toFixed(2))].join(','));
    lines.push([escapeCsv('• ยอดชำระผ่าน Delivery'), escapeCsv(Number(ordersOverview?.delivery_sales || 0).toFixed(2))].join(','));
    lines.push([escapeCsv('• ยอดชำระผ่าน คนละครึ่ง/สวัสดิการรัฐ'), escapeCsv(Number(ordersOverview?.gov_sales || 0).toFixed(2))].join(','));
    lines.push('');

    // --- Section 2: อันดับสินค้าขายดี ---
    lines.push(escapeCsv('=== [2] อันดับสินค้าขายดี (TOP SELLING ITEMS) ==='));
    lines.push([
      escapeCsv('อันดับ'),
      escapeCsv('ชื่อสินค้า'),
      escapeCsv('หมวดหมู่'),
      escapeCsv('จำนวนที่ขายได้ (ชิ้น)'),
      escapeCsv('ยอดขายรวม (บาท)')
    ].join(','));

    if (topItems.length === 0) {
      lines.push(escapeCsv('ไม่มีข้อมูลสินค้าขายดีในช่วงเวลานี้'));
    } else {
      topItems.forEach((item, idx) => {
        lines.push([
          escapeCsv(idx + 1),
          escapeCsv(item.item_name),
          escapeCsv(item.category_name),
          escapeCsv(item.total_qty),
          escapeCsv(Number(item.total_revenue || 0).toFixed(2))
        ].join(','));
      });
    }
    lines.push('');

    // --- Section 3: ประวัติออเดอร์ย้อนหลัง ---
    lines.push(escapeCsv('=== [3] ประวัติออเดอร์ย้อนหลัง (ORDERS HISTORY) ==='));
    lines.push([
      escapeCsv('เลขที่บิล'),
      escapeCsv('วัน-เวลา'),
      escapeCsv('สาขา'),
      escapeCsv('พนักงานผู้ขาย'),
      escapeCsv('รายการอาหารที่สั่ง'),
      escapeCsv('ยอดรวมก่อนลด (บาท)'),
      escapeCsv('ส่วนลด (บาท)'),
      escapeCsv('ยอดสุทธิ (บาท)'),
      escapeCsv('ช่องทางชำระเงิน'),
      escapeCsv('สถานะบิล'),
      escapeCsv('หมายเหตุ')
    ].join(','));

    const paymentLabelMap = { cash: 'เงินสด', qr: 'QR Code', gov: 'คนละครึ่ง/รัฐ', delivery: 'เดลิเวอรี่' };
    const statusLabelMap = { completed: 'สำเร็จ', cancelled: 'ยกเลิก' };

    if (ordersList.length === 0) {
      lines.push(escapeCsv('ไม่มีข้อมูลออเดอร์ในช่วงเวลานี้'));
    } else {
      ordersList.forEach(o => {
        const branchName = branchMap[o.branch_id] || `สาขา #${o.branch_id}`;
        const staffName = userMap[o.staff_id] || `พนักงาน #${o.staff_id}`;
        const itemsText = (orderItemsMap[o.id] || []).join(' | ');
        lines.push([
          escapeCsv(o.order_number),
          escapeCsv(o.created_at),
          escapeCsv(branchName),
          escapeCsv(staffName),
          escapeCsv(itemsText),
          escapeCsv(Number(o.subtotal || 0).toFixed(2)),
          escapeCsv(Number(o.discount || 0).toFixed(2)),
          escapeCsv(Number(o.total || 0).toFixed(2)),
          escapeCsv(paymentLabelMap[o.payment_method] || o.payment_method),
          escapeCsv(statusLabelMap[o.status] || o.status),
          escapeCsv(o.note || '')
        ].join(','));
      });
    }
    lines.push('');

    // --- Section 4: บันทึกค่าใช้จ่ายประจำวัน ---
    lines.push(escapeCsv('=== [4] บันทึกค่าใช้จ่ายประจำวัน (DAILY EXPENSES) ==='));
    lines.push([
      escapeCsv('วันที่'),
      escapeCsv('สาขา'),
      escapeCsv('หมวดหมู่ค่าใช้จ่าย'),
      escapeCsv('รายละเอียด/หมายเหตุ'),
      escapeCsv('ผู้บันทึก'),
      escapeCsv('ช่องทางจ่ายเงิน'),
      escapeCsv('จำนวนเงิน (บาท)')
    ].join(','));

    if (expensesList.length === 0) {
      lines.push(escapeCsv('ไม่มีข้อมูลค่าใช้จ่ายในช่วงเวลานี้'));
    } else {
      expensesList.forEach(e => {
        const branchName = branchMap[e.branch_id] || `สาขา #${e.branch_id}`;
        const staffName = userMap[e.staff_id] || `พนักงาน #${e.staff_id}`;
        lines.push([
          escapeCsv(e.expense_date || e.created_at),
          escapeCsv(branchName),
          escapeCsv(e.category),
          escapeCsv(e.note || '-'),
          escapeCsv(staffName),
          escapeCsv(e.payment_method === 'transfer' ? 'เงินโอน' : 'เงินสด'),
          escapeCsv(Number(e.amount || 0).toFixed(2))
        ].join(','));
      });
    }
    lines.push('');

    // --- Section 5: ประวัติการตัด/ปรับสต็อก ---
    lines.push(escapeCsv('=== [5] ประวัติการตัด/ปรับสต็อก (STOCK LOGS) ==='));
    lines.push([
      escapeCsv('วัน-เวลา'),
      escapeCsv('สาขา'),
      escapeCsv('รายการวัตถุดิบ/สินค้า'),
      escapeCsv('จำนวนที่เปลี่ยน'),
      escapeCsv('สต็อกเดิม'),
      escapeCsv('คงเหลือใหม่'),
      escapeCsv('เหตุผล'),
      escapeCsv('ผู้ทำรายการ'),
      escapeCsv('หมายเหตุ')
    ].join(','));

    const reasonLabelMap = {
      sale: 'ขายสินค้า',
      restock: 'เติมสต็อก',
      adjustment: 'ปรับปรุงสต็อก',
      waste: 'ของเสีย/เสียหาย',
      cancel_restore: 'คืนสตอกจากยกเลิกบิล',
      staff_benefit: 'สวัสดิการพนักงาน'
    };

    if (stockLogs.length === 0) {
      lines.push(escapeCsv('ไม่มีข้อมูลบันทึกสต็อกในช่วงเวลานี้'));
    } else {
      stockLogs.forEach(s => {
        const branchName = branchMap[s.branch_id] || `สาขา #${s.branch_id}`;
        const staffName = userMap[s.staff_id] || `พนักงาน #${s.staff_id}`;
        lines.push([
          escapeCsv(s.created_at),
          escapeCsv(branchName),
          escapeCsv(s.item_name || '-'),
          escapeCsv(s.change_qty),
          escapeCsv(s.previous_stock !== null ? s.previous_stock : '-'),
          escapeCsv(s.new_stock !== null ? s.new_stock : '-'),
          escapeCsv(reasonLabelMap[s.reason] || s.reason),
          escapeCsv(staffName),
          escapeCsv(s.note || '-')
        ].join(','));
      });
    }
    lines.push('');

    // --- Section 6: ประวัติกิจกรรมพนักงาน ---
    lines.push(escapeCsv('=== [6] ประวัติกิจกรรมพนักงาน (STAFF ACTIVITY LOGS) ==='));
    lines.push([
      escapeCsv('วัน-เวลา'),
      escapeCsv('สาขา'),
      escapeCsv('พนักงาน/ผู้ใช้งาน'),
      escapeCsv('กิจกรรม (Action)'),
      escapeCsv('รายละเอียด')
    ].join(','));

    if (activityLogs.length === 0) {
      lines.push(escapeCsv('ไม่มีข้อมูลกิจกรรมในช่วงเวลานี้'));
    } else {
      activityLogs.forEach(a => {
        const branchName = branchMap[a.branch_id] || `สาขา #${a.branch_id}`;
        const staffName = userMap[a.user_id] || `ผู้ใช้ #${a.user_id}`;
        lines.push([
          escapeCsv(a.created_at),
          escapeCsv(branchName),
          escapeCsv(staffName),
          escapeCsv(a.action),
          escapeCsv(a.details || '-')
        ].join(','));
      });
    }
    lines.push('');

    // --- Section 7: ตรวจสอบรอบเปิด-ปิดลิ้นชักเก็บเงิน ---
    lines.push(escapeCsv('=== [7] ตรวจสอบรอบเปิด-ปิดลิ้นชัก (CASH DRAWER SESSIONS) ==='));
    lines.push([
      escapeCsv('วันที่'),
      escapeCsv('สาขา'),
      escapeCsv('เงินทอนเริ่มต้น (บาท)'),
      escapeCsv('ยอดเงินสดที่ควรมี (บาท)'),
      escapeCsv('ยอดนับจริง (บาท)'),
      escapeCsv('ผลต่าง ขาด/เกิน (บาท)'),
      escapeCsv('สถานะรอบ'),
      escapeCsv('หมายเหตุ')
    ].join(','));

    if (cashSessions.length === 0) {
      lines.push(escapeCsv('ไม่มีข้อมูลรอบลิ้นชักในช่วงเวลานี้'));
    } else {
      cashSessions.forEach(c => {
        const branchName = branchMap[c.branch_id] || `สาขา #${c.branch_id}`;
        lines.push([
          escapeCsv(c.session_date),
          escapeCsv(branchName),
          escapeCsv(Number(c.opening_cash || 0).toFixed(2)),
          escapeCsv(c.expected_cash !== null ? Number(c.expected_cash).toFixed(2) : '-'),
          escapeCsv(c.actual_cash !== null ? Number(c.actual_cash).toFixed(2) : '-'),
          escapeCsv(c.difference !== null ? Number(c.difference).toFixed(2) : '-'),
          escapeCsv(c.status === 'open' ? 'กำลังเปิดรอบ' : 'ปิดรอบเรียบร้อย'),
          escapeCsv(c.note || '-')
        ].join(','));
      });
    }

    // รวมไฟล์ด้วย UTF-8 BOM สำหรับ Excel
    const csvContent = '\uFEFF' + lines.join('\r\n');
    const filename = `pos_summary_report_${monthsParam || 'all'}m_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);

  } catch (error) {
    console.error('❌ Export CSV Summary error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้างไฟล์ CSV รายงานสรุป: ' + error.message
    });
  }
});

// ─── POST /backup/purge-cloud — ลบข้อมูลธุรกรรมเก่าออกจาก Cloud เพื่อรีเซ็ตพื้นที่และลด Reads ───
router.post('/backup/purge-cloud', requireAdmin, async (req, res) => {
  try {
    const { months, branch_id, confirm_text } = req.body;

    if (!confirm_text || (confirm_text !== 'ยืนยันลบข้อมูล' && confirm_text !== 'CONFIRM')) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาพิมพ์คำยืนยันให้ถูกต้อง ("ยืนยันลบข้อมูล" หรือ "CONFIRM")'
      });
    }

    const db = getDb();
    
    // Time condition setup
    let timeClauseOrders = '';
    let timeClauseExpenses = '';
    let timeClauseSessions = '';
    let timeParams = [];

    if (months && months !== 'all' && !isNaN(Number(months)) && Number(months) > 0) {
      const m = Number(months);
      timeClauseOrders = `created_at < datetime('now', 'localtime', '-' || ? || ' month')`;
      timeClauseExpenses = `expense_date < date('now', 'localtime', '-' || ? || ' month')`;
      timeClauseSessions = `session_date < date('now', 'localtime', '-' || ? || ' month')`;
      timeParams = [m];
    }

    // Branch condition setup
    let branchClause = '';
    let branchParams = [];
    if (branch_id && branch_id !== 'all' && !isNaN(Number(branch_id))) {
      branchClause = `branch_id = ?`;
      branchParams = [Number(branch_id)];
    }

    const buildWhere = (timeClause) => {
      const parts = [];
      if (branchClause) parts.push(branchClause);
      if (timeClause) parts.push(timeClause);
      return parts.length > 0 ? 'WHERE ' + parts.join(' AND ') : '';
    };

    const buildParams = (timeClause) => {
      const resParams = [];
      if (branchClause) resParams.push(...branchParams);
      if (timeClause && timeParams.length > 0) resParams.push(...timeParams);
      return resParams;
    };

    const purgeTx = db.transaction(async () => {
      let totalDeleted = 0;

      // 1. ดึง ID ออเดอร์ที่จะลบ เพื่อลบ order_items ด้วย
      const whereOrders = buildWhere(timeClauseOrders);
      const paramsOrders = buildParams(timeClauseOrders);
      const ordersToDelete = await db.prepare(`SELECT id FROM orders ${whereOrders}`).all(...paramsOrders);
      
      if (ordersToDelete.length > 0) {
        const orderIds = ordersToDelete.map(o => o.id);
        const batchSize = 500;
        for (let i = 0; i < orderIds.length; i += batchSize) {
          const chunk = orderIds.slice(i, i + batchSize);
          const placeholders = chunk.map(() => '?').join(',');
          await db.prepare(`DELETE FROM order_items WHERE order_id IN (${placeholders})`).run(...chunk);
          const delOrders = await db.prepare(`DELETE FROM orders WHERE id IN (${placeholders})`).run(...chunk);
          totalDeleted += delOrders.changes;
        }
      }

      // 2. ลบ archived_orders & archived_order_items (ถ้ามี)
      const archivedToDelete = await db.prepare(`SELECT id FROM archived_orders ${whereOrders}`).all(...paramsOrders);
      if (archivedToDelete.length > 0) {
        const archIds = archivedToDelete.map(a => a.id);
        const batchSize = 500;
        for (let i = 0; i < archIds.length; i += batchSize) {
          const chunk = archIds.slice(i, i + batchSize);
          const placeholders = chunk.map(() => '?').join(',');
          await db.prepare(`DELETE FROM archived_order_items WHERE order_id IN (${placeholders})`).run(...chunk);
          const delArch = await db.prepare(`DELETE FROM archived_orders WHERE id IN (${placeholders})`).run(...chunk);
          totalDeleted += delArch.changes;
        }
      }

      // 3. ลบ Expenses
      const whereExpenses = buildWhere(timeClauseExpenses);
      const paramsExpenses = buildParams(timeClauseExpenses);
      const delExp = await db.prepare(`DELETE FROM expenses ${whereExpenses}`).run(...paramsExpenses);
      totalDeleted += delExp.changes;

      // 4. ลบ Stock Logs & Modifier Stock Logs
      const whereStock = buildWhere(timeClauseOrders);
      const paramsStock = buildParams(timeClauseOrders);
      const delStock = await db.prepare(`DELETE FROM stock_logs ${whereStock}`).run(...paramsStock);
      totalDeleted += delStock.changes;

      const delModStock = await db.prepare(`DELETE FROM modifier_stock_logs ${whereStock}`).run(...paramsStock);
      totalDeleted += delModStock.changes;

      // 5. ลบ Activity Logs
      const delAct = await db.prepare(`DELETE FROM activity_logs ${whereStock}`).run(...paramsStock);
      totalDeleted += delAct.changes;

      // 6. ลบ Cash Drawer Sessions
      const whereSessions = buildWhere(timeClauseSessions);
      const paramsSessions = buildParams(timeClauseSessions);
      const delSessions = await db.prepare(`DELETE FROM cash_drawer_sessions ${whereSessions}`).run(...paramsSessions);
      totalDeleted += delSessions.changes;

      return totalDeleted;
    });

    const purgedCount = await purgeTx();

    res.json({
      success: true,
      message: 'ล้างข้อมูลเก่าออกจากระบบ Cloud สำเร็จเรียบร้อย',
      data: {
        purged_count: purgedCount
      }
    });

  } catch (error) {
    console.error('❌ Purge Cloud error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการล้างข้อมูลเก่าบน Cloud: ' + error.message
    });
  }
});

module.exports = router;
