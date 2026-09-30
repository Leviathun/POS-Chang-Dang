const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
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

    // [9] สรุปยอดขายและค่าใช้จ่ายแยกรายเดือน (Monthly Breakdown)
    const monthlySales = await db.prepare(`
      SELECT 
        substr(created_at, 1, 7) as month_key,
        COUNT(*) as order_count,
        COALESCE(SUM(subtotal), 0) as month_subtotal,
        COALESCE(SUM(discount), 0) as month_discount,
        COALESCE(SUM(total), 0) as month_sales
      FROM orders
      ${whereOrders ? whereOrders + " AND status = 'completed'" : "WHERE status = 'completed'"}
      GROUP BY month_key
      ORDER BY month_key ASC
    `).all(...paramsOrders);

    const monthlyExpenses = await db.prepare(`
      SELECT 
        substr(expense_date, 1, 7) as month_key,
        COALESCE(SUM(amount), 0) as month_expenses
      FROM expenses
      ${whereExpenses}
      GROUP BY month_key
      ORDER BY month_key ASC
    `).all(...paramsExpenses);

    const monthlyExpMap = {};
    monthlyExpenses.forEach(me => { monthlyExpMap[me.month_key] = Number(me.month_expenses || 0); });

    // ── 3. สร้างไฟล์ Excel Workbook 7 แถบย่อย (7 Sheets) พร้อม Auto-Fit คอลัมน์ & Excel Formulas ──
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'POS Chang Dang';
    workbook.created = new Date();

    const BRAND_COLOR = '8B0313'; // ช้างแดง
    const HEADER_DARK = '2C3E50';

    const styleSheetHeader = (row, bgColor = BRAND_COLOR) => {
      row.height = 28;
      row.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF' + bgColor }
        };
        cell.font = {
          name: 'Segoe UI',
          size: 11,
          bold: true,
          color: { argb: 'FFFFFFFF' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
        };
      });
    };

    const styleDataRows = (sheet, startRow = 2, endRow = null) => {
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber >= startRow && (!endRow || rowNumber <= endRow)) {
          row.height = 22;
          const isEven = rowNumber % 2 === 0;
          row.eachCell({ includeEmpty: true }, cell => {
            cell.font = { name: 'Segoe UI', size: 10 };
            cell.alignment = { vertical: 'middle' };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFEAEAEA' } },
              left: { style: 'thin', color: { argb: 'FFEAEAEA' } },
              bottom: { style: 'thin', color: { argb: 'FFEAEAEA' } },
              right: { style: 'thin', color: { argb: 'FFEAEAEA' } }
            };
            if (isEven && (!cell.fill || !cell.fill.fgColor)) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF9FAFB' }
              };
            }
          });
        }
      });
    };

    const styleTotalRow = (row, bgArgb = 'FFF2F4F7') => {
      row.height = 24;
      row.eachCell({ includeEmpty: true }, cell => {
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF8B0313' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgArgb }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF8B0313' } },
          bottom: { style: 'double', color: { argb: 'FF8B0313' } },
          left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
        };
      });
    };

    const autoFitCols = (sheet, minWidth = 14) => {
      sheet.columns.forEach(column => {
        let maxLen = 0;
        column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
          if (cell.value !== null && cell.value !== undefined) {
            let text = '';
            if (typeof cell.value === 'object' && cell.value.formula) {
              text = String(cell.value.result || '');
            } else {
              text = String(cell.value);
            }
            let len = 0;
            for (let i = 0; i < text.length; i++) {
              len += text.charCodeAt(i) > 255 ? 1.5 : 1.05;
            }
            if (len > maxLen) maxLen = len;
          }
        });
        column.width = Math.max(Math.ceil(maxLen) + 5, minWidth);
      });
    };

    // ── Sheet 1: สรุปภาพรวม & ตารางสมการรายเดือน (Overview & Monthly Performance) ──
    const ws1 = workbook.addWorksheet('1. สรุปภาพรวม');
    ws1.columns = [
      { header: 'หัวข้อสรุป (Overview Topic)', key: 'topic', width: 38 },
      { header: 'จำนวน / มูลค่า (บาท)', key: 'value', width: 25 },
      { header: '', key: 'c3', width: 4 },
      { header: 'เดือน (Month)', key: 'm_month', width: 16 },
      { header: 'ยอดขายรวม (Sales)', key: 'm_sales', width: 22 },
      { header: 'ส่วนลด (Discount)', key: 'm_disc', width: 16 },
      { header: 'ค่าใช้จ่าย (Expenses)', key: 'm_exp', width: 20 },
      { header: 'กำไรสุทธิ (Net Profit)', key: 'm_profit', width: 22 },
      { header: 'จำนวนบิล (Orders)', key: 'm_orders', width: 18 },
      { header: 'เฉลี่ยต่อบิล (Avg/Order)', key: 'm_avg', width: 20 }
    ];

    // Header styling
    styleSheetHeader(ws1.getRow(1), BRAND_COLOR);

    // Left Table: KPI Card rows with formula
    const leftRows = [
      { topic: 'ช่วงเวลาที่เลือก (Period)', value: periodLabel },
      { topic: 'สาขา (Branch)', value: branchLabel },
      { topic: 'วันที่ส่งออกข้อมูล (Export Date)', value: new Date().toLocaleString('th-TH') },
      { topic: 'ยอดขายรวมทั้งหมด (Total Sales)', value: totalSales },
      { topic: 'ส่วนลดรวม (Total Discounts)', value: Number(ordersOverview?.total_discount || 0) },
      { topic: 'ค่าใช้จ่ายรวมทั้งหมด (Total Expenses)', value: totalExpenses },
      { topic: 'กำไรเบื้องต้น (Net Profit)', value: { formula: 'B5-B7', result: netProfit } },
      { topic: 'จำนวนบิลที่สำเร็จ (Total Orders)', value: totalOrders },
      { topic: 'ยอดขายเฉลี่ยต่อบิล (Avg per Order)', value: { formula: 'IF(B9>0, B5/B9, 0)', result: Number(avgOrder) } },
      { topic: '• ยอดชำระด้วยเงินสด (Cash Sales)', value: Number(ordersOverview?.cash_sales || 0) },
      { topic: '• ยอดชำระด้วย QR Code (PromptPay)', value: Number(ordersOverview?.qr_sales || 0) },
      { topic: '• ยอดชำระผ่าน Delivery', value: Number(ordersOverview?.delivery_sales || 0) },
      { topic: '• ยอดชำระผ่าน คนละครึ่ง/สวัสดิการรัฐ', value: Number(ordersOverview?.gov_sales || 0) }
    ];

    // Populate Monthly Breakdown Table on the right side
    const maxRows = Math.max(leftRows.length, monthlySales.length);
    for (let i = 0; i < maxRows; i++) {
      const rowNum = i + 2;
      const left = leftRows[i];
      const m = monthlySales[i];
      
      const rowData = {
        topic: left ? left.topic : '',
        value: left ? left.value : null
      };

      if (m) {
        const mExp = monthlyExpMap[m.month_key] || 0;
        const mSales = Number(m.month_sales || 0);
        const mOrders = Number(m.order_count || 0);
        rowData.m_month = m.month_key;
        rowData.m_sales = mSales;
        rowData.m_disc = Number(m.month_discount || 0);
        rowData.m_exp = mExp;
        rowData.m_profit = { formula: `E${rowNum}-G${rowNum}`, result: mSales - mExp };
        rowData.m_orders = mOrders;
        rowData.m_avg = { formula: `IF(I${rowNum}>0, E${rowNum}/I${rowNum}, 0)`, result: mOrders > 0 ? mSales / mOrders : 0 };
      }

      ws1.addRow(rowData);
    }

    // Add Monthly Grand Total row if months > 0
    if (monthlySales.length > 0) {
      const startMRow = 2;
      const endMRow = monthlySales.length + 1;
      const totalRowIndex = ws1.rowCount + 1;
      
      const totalRow = ws1.addRow({
        topic: '',
        value: null,
        c3: '',
        m_month: 'รวมทุกเดือน (Grand Total)',
        m_sales: { formula: `SUM(E${startMRow}:E${endMRow})`, result: totalSales },
        m_disc: { formula: `SUM(F${startMRow}:F${endMRow})`, result: Number(ordersOverview?.total_discount || 0) },
        m_exp: { formula: `SUM(G${startMRow}:G${endMRow})`, result: totalExpenses },
        m_profit: { formula: `SUM(H${startMRow}:H${endMRow})`, result: netProfit },
        m_orders: { formula: `SUM(I${startMRow}:I${endMRow})`, result: totalOrders },
        m_avg: { formula: `IF(I${totalRowIndex}>0, E${totalRowIndex}/I${totalRowIndex}, 0)`, result: Number(avgOrder) }
      });
      styleTotalRow(totalRow);
    }

    styleDataRows(ws1, 2, ws1.rowCount - (monthlySales.length > 0 ? 1 : 0));
    // Number formatting for ws1
    for (let r = 2; r <= ws1.rowCount; r++) {
      const bCell = ws1.getCell(`B${r}`);
      if (bCell.value !== null && typeof bCell.value !== 'string') {
        if (r === 9) {
          bCell.numFmt = '#,##0';
        } else {
          bCell.numFmt = '#,##0.00';
        }
        bCell.alignment = { vertical: 'middle', horizontal: 'right' };
      }
      const eCell = ws1.getCell(`E${r}`);
      if (eCell.value) { eCell.numFmt = '#,##0.00'; eCell.alignment = { vertical: 'middle', horizontal: 'right' }; }
      const fCell = ws1.getCell(`F${r}`);
      if (fCell.value) { fCell.numFmt = '#,##0.00'; fCell.alignment = { vertical: 'middle', horizontal: 'right' }; }
      const gCell = ws1.getCell(`G${r}`);
      if (gCell.value) { gCell.numFmt = '#,##0.00'; gCell.alignment = { vertical: 'middle', horizontal: 'right' }; }
      const hCell = ws1.getCell(`H${r}`);
      if (hCell.value) { hCell.numFmt = '#,##0.00'; hCell.alignment = { vertical: 'middle', horizontal: 'right' }; }
      const iCell = ws1.getCell(`I${r}`);
      if (iCell.value) { iCell.numFmt = '#,##0'; iCell.alignment = { vertical: 'middle', horizontal: 'right' }; }
      const jCell = ws1.getCell(`J${r}`);
      if (jCell.value) { jCell.numFmt = '#,##0.00'; jCell.alignment = { vertical: 'middle', horizontal: 'right' }; }
    }
    autoFitCols(ws1, 16);

    // ── Sheet 2: อันดับสินค้าขายดี (Top Selling) ──
    const ws2 = workbook.addWorksheet('2. สินค้าขายดี');
    ws2.columns = [
      { header: 'อันดับ', key: 'rank', width: 10 },
      { header: 'ชื่อสินค้า', key: 'item_name', width: 30 },
      { header: 'หมวดหมู่', key: 'category_name', width: 20 },
      { header: 'จำนวนที่ขายได้ (ชิ้น)', key: 'total_qty', width: 22 },
      { header: 'ยอดขายรวม (บาท)', key: 'total_revenue', width: 22 }
    ];
    styleSheetHeader(ws2.getRow(1), HEADER_DARK);

    topItems.forEach((item, idx) => {
      ws2.addRow({
        rank: idx + 1,
        item_name: item.item_name,
        category_name: item.category_name,
        total_qty: Number(item.total_qty || 0),
        total_revenue: Number(item.total_revenue || 0)
      });
    });

    if (topItems.length > 0) {
      const topStart = 2;
      const topEnd = topItems.length + 1;
      const topSumRow = ws2.addRow({
        rank: 'รวมทั้งหมด',
        item_name: `(${topItems.length} อันดับแรก)`,
        category_name: '-',
        total_qty: { formula: `SUM(D${topStart}:D${topEnd})` },
        total_revenue: { formula: `SUM(E${topStart}:E${topEnd})` }
      });
      styleTotalRow(topSumRow);
      topSumRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    }

    styleDataRows(ws2, 2, topItems.length > 0 ? ws2.rowCount - 1 : ws2.rowCount);
    ws2.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        if (rowNumber <= topItems.length + 1) row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(4).numFmt = '#,##0';
        row.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
        row.getCell(5).numFmt = '#,##0.00';
        row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
      }
    });
    autoFitCols(ws2, 16);

    // ── Sheet 3: ประวัติออเดอร์ (Orders History) ──
    const ws3 = workbook.addWorksheet('3. ประวัติออเดอร์');
    ws3.columns = [
      { header: 'เลขที่บิล', key: 'order_number', width: 20 },
      { header: 'วัน-เวลา', key: 'created_at', width: 22 },
      { header: 'สาขา', key: 'branch', width: 22 },
      { header: 'พนักงานผู้ขาย', key: 'staff', width: 20 },
      { header: 'รายการอาหารที่สั่ง', key: 'items', width: 45 },
      { header: 'ยอดรวมก่อนลด (บาท)', key: 'subtotal', width: 20 },
      { header: 'ส่วนลด (บาท)', key: 'discount', width: 16 },
      { header: 'ยอดสุทธิ (บาท)', key: 'total', width: 18 },
      { header: 'ช่องทางชำระเงิน', key: 'payment_method', width: 18 },
      { header: 'สถานะบิล', key: 'status', width: 14 },
      { header: 'หมายเหตุ', key: 'note', width: 22 }
    ];
    styleSheetHeader(ws3.getRow(1), BRAND_COLOR);

    const paymentLabelMap = { cash: 'เงินสด', qr: 'QR Code', gov: 'คนละครึ่ง/รัฐ', delivery: 'เดลิเวอรี่' };
    const statusLabelMap = { completed: 'สำเร็จ', cancelled: 'ยกเลิก' };

    ordersList.forEach(o => {
      const branchName = branchMap[o.branch_id] || `สาขา #${o.branch_id}`;
      const staffName = userMap[o.staff_id] || `พนักงาน #${o.staff_id}`;
      const itemsText = (orderItemsMap[o.id] || []).join(' | ');

      ws3.addRow({
        order_number: o.order_number,
        created_at: o.created_at,
        branch: branchName,
        staff: staffName,
        items: itemsText,
        subtotal: Number(o.subtotal || 0),
        discount: Number(o.discount || 0),
        total: Number(o.total || 0),
        payment_method: paymentLabelMap[o.payment_method] || o.payment_method,
        status: statusLabelMap[o.status] || o.status,
        note: o.note || '-'
      });
    });

    if (ordersList.length > 0) {
      const oStart = 2;
      const oEnd = ordersList.length + 1;
      const oSumRow = ws3.addRow({
        order_number: 'รวมทั้งสิ้น',
        created_at: `(${ordersList.length} บิล)`,
        branch: '-',
        staff: '-',
        items: '-',
        subtotal: { formula: `SUM(F${oStart}:F${oEnd})` },
        discount: { formula: `SUM(G${oStart}:G${oEnd})` },
        total: { formula: `SUM(H${oStart}:H${oEnd})` },
        payment_method: '-',
        status: '-',
        note: '-'
      });
      styleTotalRow(oSumRow);
      oSumRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    }

    styleDataRows(ws3, 2, ordersList.length > 0 ? ws3.rowCount - 1 : ws3.rowCount);
    ws3.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.getCell(6).numFmt = '#,##0.00';
        row.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };
        row.getCell(7).numFmt = '#,##0.00';
        row.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
        row.getCell(8).numFmt = '#,##0.00';
        row.getCell(8).alignment = { vertical: 'middle', horizontal: 'right' };
        if (rowNumber <= ordersList.length + 1) row.getCell(10).alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });
    autoFitCols(ws3, 16);

    // ── Sheet 4: บันทึกค่าใช้จ่าย (Daily Expenses) ──
    const ws4 = workbook.addWorksheet('4. บันทึกค่าใช้จ่าย');
    ws4.columns = [
      { header: 'วันที่', key: 'expense_date', width: 16 },
      { header: 'สาขา', key: 'branch', width: 22 },
      { header: 'หมวดหมู่ค่าใช้จ่าย', key: 'category', width: 22 },
      { header: 'รายละเอียด/หมายเหตุ', key: 'note', width: 35 },
      { header: 'ผู้บันทึก', key: 'staff', width: 20 },
      { header: 'ช่องทางจ่ายเงิน', key: 'payment_method', width: 18 },
      { header: 'จำนวนเงิน (บาท)', key: 'amount', width: 20 }
    ];
    styleSheetHeader(ws4.getRow(1), HEADER_DARK);

    expensesList.forEach(e => {
      const branchName = branchMap[e.branch_id] || `สาขา #${e.branch_id}`;
      const staffName = userMap[e.staff_id] || `พนักงาน #${e.staff_id}`;
      ws4.addRow({
        expense_date: e.expense_date || e.created_at,
        branch: branchName,
        category: e.category,
        note: e.note || '-',
        staff: staffName,
        payment_method: e.payment_method === 'transfer' ? 'เงินโอน' : 'เงินสด',
        amount: Number(e.amount || 0)
      });
    });

    if (expensesList.length > 0) {
      const expStart = 2;
      const expEnd = expensesList.length + 1;
      const expSumRow = ws4.addRow({
        expense_date: 'รวมค่าใช้จ่ายทั้งหมด',
        branch: `(${expensesList.length} รายการ)`,
        category: '-',
        note: '-',
        staff: '-',
        payment_method: '-',
        amount: { formula: `SUM(G${expStart}:G${expEnd})` }
      });
      styleTotalRow(expSumRow);
      expSumRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    }

    styleDataRows(ws4, 2, expensesList.length > 0 ? ws4.rowCount - 1 : ws4.rowCount);
    ws4.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.getCell(7).numFmt = '#,##0.00';
        row.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
      }
    });
    autoFitCols(ws4, 16);

    // ── Sheet 5: ยอดคลังและสต็อก (Stock Logs) ──
    const ws5 = workbook.addWorksheet('5. ยอดคลังและสต็อก');
    ws5.columns = [
      { header: 'วัน-เวลา', key: 'created_at', width: 22 },
      { header: 'สาขา', key: 'branch', width: 22 },
      { header: 'รายการวัตถุดิบ/สินค้า', key: 'item_name', width: 28 },
      { header: 'จำนวนที่เปลี่ยน', key: 'change_qty', width: 18 },
      { header: 'สต็อกเดิม', key: 'previous_stock', width: 16 },
      { header: 'คงเหลือใหม่', key: 'new_stock', width: 16 },
      { header: 'เหตุผล', key: 'reason', width: 22 },
      { header: 'ผู้ทำรายการ', key: 'staff', width: 20 },
      { header: 'หมายเหตุ', key: 'note', width: 28 }
    ];
    styleSheetHeader(ws5.getRow(1), HEADER_DARK);

    const reasonLabelMap = {
      sale: 'ขายสินค้า',
      restock: 'เติมสต็อก',
      adjustment: 'ปรับปรุงสต็อก',
      waste: 'ของเสีย/เสียหาย',
      cancel_restore: 'คืนสตอกจากยกเลิกบิล',
      staff_benefit: 'สวัสดิการพนักงาน'
    };

    stockLogs.forEach(s => {
      const branchName = branchMap[s.branch_id] || `สาขา #${s.branch_id}`;
      const staffName = userMap[s.staff_id] || `พนักงาน #${s.staff_id}`;
      ws5.addRow({
        created_at: s.created_at,
        branch: branchName,
        item_name: s.item_name || '-',
        change_qty: s.change_qty,
        previous_stock: s.previous_stock !== null ? s.previous_stock : '-',
        new_stock: s.new_stock !== null ? s.new_stock : '-',
        reason: reasonLabelMap[s.reason] || s.reason,
        staff: staffName,
        note: s.note || '-'
      });
    });

    if (stockLogs.length > 0) {
      const stkStart = 2;
      const stkEnd = stockLogs.length + 1;
      const stkSumRow = ws5.addRow({
        created_at: 'รวมจำนวนการปรับเปลี่ยนสต็อก',
        branch: `(${stockLogs.length} รายการ)`,
        item_name: '-',
        change_qty: { formula: `SUM(D${stkStart}:D${stkEnd})` },
        previous_stock: '-',
        new_stock: '-',
        reason: '-',
        staff: '-',
        note: '-'
      });
      styleTotalRow(stkSumRow);
      stkSumRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    }

    styleDataRows(ws5, 2, stockLogs.length > 0 ? ws5.rowCount - 1 : ws5.rowCount);
    ws5.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
        row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
        row.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };
      }
    });
    autoFitCols(ws5, 16);

    // ── Sheet 6: บันทึกกิจกรรม (Staff Activity Logs) ──
    const ws6 = workbook.addWorksheet('6. บันทึกกิจกรรม');
    ws6.columns = [
      { header: 'วัน-เวลา', key: 'created_at', width: 22 },
      { header: 'สาขา', key: 'branch', width: 22 },
      { header: 'พนักงาน/ผู้ใช้งาน', key: 'staff', width: 20 },
      { header: 'กิจกรรม (Action)', key: 'action', width: 25 },
      { header: 'รายละเอียด', key: 'details', width: 45 }
    ];
    styleSheetHeader(ws6.getRow(1), HEADER_DARK);

    activityLogs.forEach(a => {
      const branchName = branchMap[a.branch_id] || `สาขา #${a.branch_id}`;
      const staffName = userMap[a.user_id] || `ผู้ใช้ #${a.user_id}`;
      ws6.addRow({
        created_at: a.created_at,
        branch: branchName,
        staff: staffName,
        action: a.action,
        details: a.details || '-'
      });
    });
    styleDataRows(ws6, 2);
    autoFitCols(ws6, 16);

    // ── Sheet 7: รอบลิ้นชักเก็บเงิน (Cash Drawer Sessions) ──
    const ws7 = workbook.addWorksheet('7. รอบลิ้นชักเก็บเงิน');
    ws7.columns = [
      { header: 'วันที่', key: 'session_date', width: 16 },
      { header: 'สาขา', key: 'branch', width: 22 },
      { header: 'เงินทอนเริ่มต้น (บาท)', key: 'opening_cash', width: 22 },
      { header: 'ยอดเงินสดที่ควรมี (บาท)', key: 'expected_cash', width: 24 },
      { header: 'ยอดนับจริง (บาท)', key: 'actual_cash', width: 20 },
      { header: 'ผลต่าง ขาด/เกิน (บาท)', key: 'difference', width: 22 },
      { header: 'สถานะรอบ', key: 'status', width: 18 },
      { header: 'หมายเหตุ', key: 'note', width: 25 }
    ];
    styleSheetHeader(ws7.getRow(1), BRAND_COLOR);

    cashSessions.forEach(c => {
      const branchName = branchMap[c.branch_id] || `สาขา #${c.branch_id}`;
      ws7.addRow({
        session_date: c.session_date,
        branch: branchName,
        opening_cash: Number(c.opening_cash || 0),
        expected_cash: c.expected_cash !== null ? Number(c.expected_cash) : '-',
        actual_cash: c.actual_cash !== null ? Number(c.actual_cash) : '-',
        difference: c.difference !== null ? Number(c.difference) : '-',
        status: c.status === 'open' ? 'กำลังเปิดรอบ' : 'ปิดรอบเรียบร้อย',
        note: c.note || '-'
      });
    });

    if (cashSessions.length > 0) {
      const cdStart = 2;
      const cdEnd = cashSessions.length + 1;
      const cdSumRow = ws7.addRow({
        session_date: 'รวมยอดเงินรอบลิ้นชัก',
        branch: `(${cashSessions.length} รอบกะ)`,
        opening_cash: { formula: `SUM(C${cdStart}:C${cdEnd})` },
        expected_cash: { formula: `SUM(D${cdStart}:D${cdEnd})` },
        actual_cash: { formula: `SUM(E${cdStart}:E${cdEnd})` },
        difference: { formula: `SUM(F${cdStart}:F${cdEnd})` },
        status: '-',
        note: '-'
      });
      styleTotalRow(cdSumRow);
      cdSumRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    }

    styleDataRows(ws7, 2, cashSessions.length > 0 ? ws7.rowCount - 1 : ws7.rowCount);
    ws7.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.getCell(3).numFmt = '#,##0.00';
        row.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' };
        if (typeof row.getCell(4).value === 'number' || (row.getCell(4).value && row.getCell(4).value.formula)) {
          row.getCell(4).numFmt = '#,##0.00';
          row.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
        }
        if (typeof row.getCell(5).value === 'number' || (row.getCell(5).value && row.getCell(5).value.formula)) {
          row.getCell(5).numFmt = '#,##0.00';
          row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
        }
        if (typeof row.getCell(6).value === 'number' || (row.getCell(6).value && row.getCell(6).value.formula)) {
          row.getCell(6).numFmt = '#,##0.00';
          row.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };
        }
        if (rowNumber <= cashSessions.length + 1) row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });
    autoFitCols(ws7, 16);

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `pos_summary_report_${monthsParam || 'all'}m_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(Buffer.from(buffer));

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
