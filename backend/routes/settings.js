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
      SELECT COALESCE(SUM(
        CASE 
          WHEN is_refund = 1 OR status = 'refund' THEN -amount
          ELSE amount
        END
      ), 0) as total_expenses FROM expenses ${whereExpenses}
    `).get(...paramsExpenses);

    const totalSales = Number(ordersOverview?.total_sales || 0);
    const totalExpenses = Number(expenseOverview?.total_expenses || 0);
    const netProfit = totalSales - totalExpenses;
    const totalOrders = Number(ordersOverview?.total_orders || 0);
    const avgOrder = totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : '0.00';

    // [3] อันดับสินค้าขายดี (All Menu Items + Sales Summary)
    const topItemsTimeClause = timeParams.length > 0 ? `o.created_at >= datetime('now', 'localtime', '-' || ? || ' month')` : '';
    const topItemsBranchClause = branchParams.length > 0 ? `o.branch_id = ?` : '';
    const topItemsWhere = buildWhere(topItemsTimeClause, topItemsBranchClause);
    
    const topItems = await db.prepare(`
      SELECT 
        mi.id,
        mi.name as item_name,
        COALESCE(c.name, 'ทั่วไป') as category_name,
        COALESCE(SUM(oi_sales.quantity), 0) as total_qty,
        COALESCE(SUM(oi_sales.subtotal), 0) as total_revenue
      FROM menu_items mi
      LEFT JOIN categories c ON mi.category_id = c.id
      LEFT JOIN (
        SELECT oi.menu_item_id, oi.quantity, oi.subtotal
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        ${topItemsWhere ? topItemsWhere + " AND o.status = 'completed'" : "WHERE o.status = 'completed'"}
      ) oi_sales ON mi.id = oi_sales.menu_item_id
      WHERE mi.active = 1
      GROUP BY mi.id, mi.name, c.name
      ORDER BY total_qty DESC, total_revenue DESC, mi.name ASC
    `).all(...paramsOrders);

    // Helper format order item options
    const formatOrderItemSummary = (itemName, optionsStr, quantity) => {
      let details = '';
      if (optionsStr) {
        try {
          const parsed = typeof optionsStr === 'string' ? JSON.parse(optionsStr) : optionsStr;
          if (typeof parsed === 'object' && parsed !== null) {
            const parts = [];
            if (parsed.size && !itemName.includes(`ขนาด ${parsed.size}`) && !itemName.includes(`(${parsed.size})`)) {
              parts.push(`ขนาด ${parsed.size}`);
            }
            if (Array.isArray(parsed.selected_items) && parsed.selected_items.length > 0) {
              const subNames = parsed.selected_items.map(s => s.name || s.item_name).filter(Boolean);
              if (subNames.length > 0) {
                const subText = subNames.join(', ');
                if (subText !== itemName) {
                  parts.push(`ไส้: ${subText}`);
                }
              }
            }
            if (parsed.sweetness) parts.push(`หวาน ${parsed.sweetness}`);
            if (parsed.spicy) parts.push(`เผ็ด ${parsed.spicy}`);
            if (parsed.note) parts.push(`โน้ต: ${parsed.note}`);
            
            if (parts.length > 0) {
              details = ` (${parts.join(' / ')})`;
            }
          } else if (typeof parsed === 'string' && parsed.trim()) {
            details = ` (${parsed.trim()})`;
          }
        } catch (e) {
          if (typeof optionsStr === 'string' && optionsStr.trim() && !optionsStr.startsWith('{')) {
            details = ` (${optionsStr.trim()})`;
          }
        }
      }
      return `${itemName}${details} x${quantity}`;
    };

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
          orderItemsMap[it.order_id].push(formatOrderItemSummary(it.item_name, it.options, it.quantity));
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

    // [9] สรุปยอดขายและค่าใช้จ่ายแยกรายเดือนและรายสาขา (Monthly & Branch Breakdown)
    const monthlyBranchSales = await db.prepare(`
      SELECT 
        substr(o.created_at, 1, 7) as month_key,
        o.branch_id,
        COUNT(*) as order_count,
        COALESCE(SUM(o.subtotal), 0) as month_subtotal,
        COALESCE(SUM(o.discount), 0) as month_discount,
        COALESCE(SUM(o.total), 0) as month_sales
      FROM orders o
      ${whereOrders ? whereOrders + " AND o.status = 'completed'" : "WHERE o.status = 'completed'"}
      GROUP BY month_key, o.branch_id
      ORDER BY month_key ASC, o.branch_id ASC
    `).all(...paramsOrders);

    const monthlyBranchExpenses = await db.prepare(`
      SELECT 
        substr(expense_date, 1, 7) as month_key,
        branch_id,
        COALESCE(SUM(
          CASE 
            WHEN is_refund = 1 OR status = 'refund' THEN -amount
            ELSE amount
          END
        ), 0) as month_expenses
      FROM expenses
      ${whereExpenses}
      GROUP BY month_key, branch_id
      ORDER BY month_key ASC, branch_id ASC
    `).all(...paramsExpenses);

    const mbMap = new Map();
    monthlyBranchSales.forEach(item => {
      const key = `${item.month_key}__${item.branch_id}`;
      if (!mbMap.has(key)) {
        mbMap.set(key, {
          month_key: item.month_key,
          branch_id: item.branch_id,
          sales: Number(item.month_sales || 0),
          discount: Number(item.month_discount || 0),
          expenses: 0,
          orders: Number(item.order_count || 0)
        });
      } else {
        const existing = mbMap.get(key);
        existing.sales += Number(item.month_sales || 0);
        existing.discount += Number(item.month_discount || 0);
        existing.orders += Number(item.order_count || 0);
      }
    });

    monthlyBranchExpenses.forEach(item => {
      const key = `${item.month_key}__${item.branch_id}`;
      if (!mbMap.has(key)) {
        mbMap.set(key, {
          month_key: item.month_key,
          branch_id: item.branch_id,
          sales: 0,
          discount: 0,
          expenses: Number(item.month_expenses || 0),
          orders: 0
        });
      } else {
        const existing = mbMap.get(key);
        existing.expenses += Number(item.month_expenses || 0);
      }
    });

    const monthlyBranchRows = Array.from(mbMap.values()).sort((a, b) => {
      if (a.month_key !== b.month_key) return a.month_key.localeCompare(b.month_key);
      return (a.branch_id || 0) - (b.branch_id || 0);
    });

    // ── 3. สร้างไฟล์ Excel Workbook 7 แถบย่อย (7 Sheets) พร้อม Auto-Fit คอลัมน์ & Excel Formulas ──
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'POS Chang Dang';
    workbook.created = new Date();

    const BRAND_COLOR = '8B0313'; // ช้างแดง
    const HEADER_DARK = '2C3E50';
    const exportDateStr = new Date().toLocaleString('th-TH');

    const styleSheetHeader = (row, bgColor = BRAND_COLOR) => {
      row.height = 28;
      row.eachCell({ includeEmpty: true }, cell => {
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

    const addSheetBanner = (ws, title, lastColLetter) => {
      ws.mergeCells(`A1:${lastColLetter}1`);
      const bannerCell = ws.getCell('A1');
      bannerCell.value = title;
      bannerCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF' + BRAND_COLOR }
      };
      bannerCell.font = {
        name: 'Segoe UI',
        size: 12,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      bannerCell.alignment = { vertical: 'middle', horizontal: 'center' };
      bannerCell.border = {
        top: { style: 'thin', color: { argb: 'FF8B0313' } },
        bottom: { style: 'thin', color: { argb: 'FF8B0313' } },
        left: { style: 'thin', color: { argb: 'FF8B0313' } },
        right: { style: 'thin', color: { argb: 'FF8B0313' } }
      };
      ws.getRow(1).height = 32;
      ws.getRow(2).height = 10;
    };

    const styleDataRows = (sheet, startRow = 4, endRow = null) => {
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
      row.height = 26;
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
          if (cell.isMerged && rowNumber <= 2) return;
          if (sheet.name === '1. สรุปภาพรวม' && (rowNumber === 1 || rowNumber === 8 || rowNumber === 9)) return;

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

    // ════════════════════════════════════════════════════════════════════════
    // ── Sheet 1: สรุปภาพรวม (2-Tier: Top Information + Bottom Breakdown) ──
    // ════════════════════════════════════════════════════════════════════════
    const ws1 = workbook.addWorksheet('1. สรุปภาพรวม');
    ws1.columns = [
      { key: 'colA', width: 22 },
      { key: 'colB', width: 26 },
      { key: 'colC', width: 22 },
      { key: 'colD', width: 20 },
      { key: 'colE', width: 20 },
      { key: 'colF', width: 22 },
      { key: 'colG', width: 18 },
      { key: 'colH', width: 20 }
    ];

    // 1.1 แบนเนอร์หัวเรื่องด้านบนสุด
    addSheetBanner(ws1, 'รายงานสรุปภาพรวมผลการดำเนินงาน (Performance Overview)', 'H');

    // 1.2 กล่องด้านบน: ข้อมูลทั่วไป และ สรุปช่องทางชำระเงิน (Top Box Area)
    const topCardData = [
      { label1: 'ช่วงเวลาที่เลือก (Period)', val1: periodLabel, label2: '• ยอดชำระด้วยเงินสด (Cash)', val2: Number(ordersOverview?.cash_sales || 0) },
      { label1: 'สาขาที่เลือก (Branch)', val1: branchLabel, label2: '• ยอดชำระด้วย QR Code (PromptPay)', val2: Number(ordersOverview?.qr_sales || 0) },
      { label1: 'วันที่ส่งออกข้อมูล (Export Date)', val1: exportDateStr, label2: '• ยอดชำระผ่าน Delivery', val2: Number(ordersOverview?.delivery_sales || 0) },
      { label1: 'สถานะบิล (Order Status)', val1: 'สำเร็จ (Completed Only)', label2: '• ยอดชำระ คนละครึ่ง/สวัสดิการรัฐ', val2: Number(ordersOverview?.gov_sales || 0) }
    ];

    topCardData.forEach((row, idx) => {
      const rNum = idx + 3;
      const r = ws1.getRow(rNum);
      r.height = 24;
      
      // Col A & B (Info)
      const cA = ws1.getCell(`A${rNum}`);
      cA.value = row.label1;
      cA.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF2C3E50' } };
      cA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F4F7' } };
      cA.alignment = { vertical: 'middle', horizontal: 'left' };
      cA.border = { top: { style: 'thin', color: { argb: 'FFD3D3D3' } }, bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } }, left: { style: 'thin', color: { argb: 'FFD3D3D3' } }, right: { style: 'thin', color: { argb: 'FFD3D3D3' } } };

      const cB = ws1.getCell(`B${rNum}`);
      cB.value = row.val1;
      cB.font = { name: 'Segoe UI', size: 10 };
      cB.alignment = { vertical: 'middle', horizontal: 'left' };
      cB.border = { top: { style: 'thin', color: { argb: 'FFD3D3D3' } }, bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } }, left: { style: 'thin', color: { argb: 'FFD3D3D3' } }, right: { style: 'thin', color: { argb: 'FFD3D3D3' } } };

      // Col C & D (Payment breakdown)
      const cC = ws1.getCell(`C${rNum}`);
      cC.value = row.label2;
      cC.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF2C3E50' } };
      cC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F4F7' } };
      cC.alignment = { vertical: 'middle', horizontal: 'left' };
      cC.border = { top: { style: 'thin', color: { argb: 'FFD3D3D3' } }, bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } }, left: { style: 'thin', color: { argb: 'FFD3D3D3' } }, right: { style: 'thin', color: { argb: 'FFD3D3D3' } } };

      const cD = ws1.getCell(`D${rNum}`);
      cD.value = row.val2;
      cD.numFmt = '#,##0.00';
      cD.font = { name: 'Segoe UI', size: 10 };
      cD.alignment = { vertical: 'middle', horizontal: 'right' };
      cD.border = { top: { style: 'thin', color: { argb: 'FFD3D3D3' } }, bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } }, left: { style: 'thin', color: { argb: 'FFD3D3D3' } }, right: { style: 'thin', color: { argb: 'FFD3D3D3' } } };
    });

    // 1.3 กล่องด้านล่าง: ตารางแจกแจงผลประกอบการแยกรายเดือนและสาขา (Bottom Table Breakdown)
    ws1.getRow(7).height = 12; // spacer

    ws1.mergeCells('A8:H8');
    const secCell = ws1.getCell('A8');
    secCell.value = 'ตารางสรุปผลประกอบการ แยกตามเดือนและสาขา (Performance Breakdown by Month & Branch)';
    secCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + HEADER_DARK } };
    secCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    secCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws1.getRow(8).height = 26;

    // Row 9: Table Column Headers
    const tableHeaderRow = ws1.getRow(9);
    tableHeaderRow.values = [
      'เดือน (Month)',
      'สาขา (Branch)',
      'ยอดขายรวม (Sales)',
      'ส่วนลด (Discount)',
      'ค่าใช้จ่าย (Expenses)',
      'กำไรสุทธิ (Net Profit)',
      'จำนวนบิล (Orders)',
      'เฉลี่ยต่อบิล (Avg/Order)'
    ];
    styleSheetHeader(tableHeaderRow, BRAND_COLOR);

    // Row 10+: Monthly & Branch Data Rows
    const dataStartRow = 10;
    monthlyBranchRows.forEach((item, idx) => {
      const rNum = dataStartRow + idx;
      const bName = branchMap[item.branch_id] || `สาขา #${item.branch_id}`;
      
      const r = ws1.getRow(rNum);
      r.values = [
        item.month_key,
        bName,
        item.sales,
        item.discount,
        item.expenses,
        { formula: `C${rNum}-E${rNum}`, result: item.sales - item.expenses },
        item.orders,
        { formula: `IF(G${rNum}>0, C${rNum}/G${rNum}, 0)`, result: item.orders > 0 ? item.sales / item.orders : 0 }
      ];

      r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      r.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
      r.getCell(3).numFmt = '#,##0.00';
      r.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' };
      r.getCell(4).numFmt = '#,##0.00';
      r.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
      r.getCell(5).numFmt = '#,##0.00';
      r.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
      r.getCell(6).numFmt = '#,##0.00';
      r.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };
      r.getCell(7).numFmt = '#,##0';
      r.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
      r.getCell(8).numFmt = '#,##0.00';
      r.getCell(8).alignment = { vertical: 'middle', horizontal: 'right' };
    });

    // Grand Total Row with Excel Formulas
    if (monthlyBranchRows.length > 0) {
      const dataEndRow = dataStartRow + monthlyBranchRows.length - 1;
      const totalRNum = dataEndRow + 1;
      
      const totRow = ws1.getRow(totalRNum);
      totRow.values = [
        'รวมทั้งหมด (Grand Total)',
        '-',
        { formula: `SUM(C${dataStartRow}:C${dataEndRow})`, result: totalSales },
        { formula: `SUM(D${dataStartRow}:D${dataEndRow})`, result: Number(ordersOverview?.total_discount || 0) },
        { formula: `SUM(E${dataStartRow}:E${dataEndRow})`, result: totalExpenses },
        { formula: `SUM(F${dataStartRow}:F${dataEndRow})`, result: netProfit },
        { formula: `SUM(G${dataStartRow}:G${dataEndRow})`, result: totalOrders },
        { formula: `IF(G${totalRNum}>0, C${totalRNum}/G${totalRNum}, 0)`, result: Number(avgOrder) }
      ];

      styleTotalRow(totRow);
      totRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      totRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      totRow.getCell(3).numFmt = '#,##0.00';
      totRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' };
      totRow.getCell(4).numFmt = '#,##0.00';
      totRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
      totRow.getCell(5).numFmt = '#,##0.00';
      totRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
      totRow.getCell(6).numFmt = '#,##0.00';
      totRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };
      totRow.getCell(7).numFmt = '#,##0';
      totRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
      totRow.getCell(8).numFmt = '#,##0.00';
      totRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'right' };
    }

    styleDataRows(ws1, dataStartRow, dataStartRow + monthlyBranchRows.length - 1);
    autoFitCols(ws1, 16);

    // ════════════════════════════════════════════════════════════════════════
    // ── Sheet 2: อันดับสินค้าขายดี (Top Selling & All Menu Items) ──
    // ════════════════════════════════════════════════════════════════════════
    const ws2 = workbook.addWorksheet('2. สินค้าขายดี');
    ws2.columns = [
      { key: 'rank', width: 12 },
      { key: 'item_name', width: 34 },
      { key: 'category_name', width: 22 },
      { key: 'total_qty', width: 22 },
      { key: 'total_revenue', width: 22 }
    ];

    addSheetBanner(ws2, `รายงานยอดขายสินค้าทุกรายการ (Product Sales Summary) | ${periodLabel} | ${branchLabel} | ส่งออก: ${exportDateStr}`, 'E');

    const ws2Header = ws2.getRow(3);
    ws2Header.values = ['อันดับ', 'ชื่อสินค้า', 'หมวดหมู่', 'จำนวนที่ขายได้ (ชิ้น)', 'ยอดขายรวม (บาท)'];
    styleSheetHeader(ws2Header, HEADER_DARK);

    const s2Start = 4;
    topItems.forEach((item, idx) => {
      const rNum = s2Start + idx;
      const r = ws2.getRow(rNum);
      r.values = [
        idx + 1,
        item.item_name,
        item.category_name,
        Number(item.total_qty || 0),
        Number(item.total_revenue || 0)
      ];
      r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      r.getCell(4).numFmt = '#,##0';
      r.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
      r.getCell(5).numFmt = '#,##0.00';
      r.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
    });

    if (topItems.length > 0) {
      const s2End = s2Start + topItems.length - 1;
      const s2TotRow = ws2.getRow(s2End + 1);
      s2TotRow.values = [
        'รวมทั้งหมด',
        `(${topItems.length} รายการ)`,
        '-',
        { formula: `SUM(D${s2Start}:D${s2End})` },
        { formula: `SUM(E${s2Start}:E${s2End})` }
      ];
      styleTotalRow(s2TotRow);
      s2TotRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      s2TotRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
      s2TotRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
      s2TotRow.getCell(4).numFmt = '#,##0';
      s2TotRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
      s2TotRow.getCell(5).numFmt = '#,##0.00';
      s2TotRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
    }

    styleDataRows(ws2, s2Start, topItems.length > 0 ? s2Start + topItems.length - 1 : s2Start);
    autoFitCols(ws2, 16);

    // ════════════════════════════════════════════════════════════════════════
    // ── Sheet 3: ประวัติออเดอร์ (Orders History) ──
    // ════════════════════════════════════════════════════════════════════════
    const ws3 = workbook.addWorksheet('3. ประวัติออเดอร์');
    ws3.columns = [
      { key: 'order_number', width: 20 },
      { key: 'created_at', width: 22 },
      { key: 'branch', width: 22 },
      { key: 'staff', width: 20 },
      { key: 'items', width: 45 },
      { key: 'subtotal', width: 20 },
      { key: 'discount', width: 16 },
      { key: 'total', width: 18 },
      { key: 'payment_method', width: 18 },
      { key: 'status', width: 14 },
      { key: 'note', width: 22 }
    ];

    addSheetBanner(ws3, `รายงานประวัติการสั่งซื้อ (Orders History) | ${periodLabel} | ${branchLabel} | ส่งออก: ${exportDateStr}`, 'K');

    const paymentLabelMap = { cash: 'เงินสด', qr: 'QR Code', gov: 'คนละครึ่ง/รัฐ', delivery: 'เดลิเวอรี่' };
    const statusLabelMap = { completed: 'สำเร็จ', cancelled: 'ยกเลิก' };

    const ws3Header = ws3.getRow(3);
    ws3Header.values = [
      'เลขที่บิล', 'วัน-เวลา', 'สาขา', 'พนักงานผู้ขาย', 'รายการอาหารที่สั่ง',
      'ยอดรวมก่อนลด (บาท)', 'ส่วนลด (บาท)', 'ยอดสุทธิ (บาท)', 'ช่องทางชำระเงิน', 'สถานะบิล', 'หมายเหตุ'
    ];
    styleSheetHeader(ws3Header, BRAND_COLOR);

    const s3Start = 4;
    ordersList.forEach((o, idx) => {
      const rNum = s3Start + idx;
      const branchName = branchMap[o.branch_id] || `สาขา #${o.branch_id}`;
      const staffName = userMap[o.staff_id] || `พนักงาน #${o.staff_id}`;
      const itemsText = (orderItemsMap[o.id] || []).join(' | ');

      const r = ws3.getRow(rNum);
      r.values = [
        o.order_number,
        o.created_at,
        branchName,
        staffName,
        itemsText,
        Number(o.subtotal || 0),
        Number(o.discount || 0),
        Number(o.total || 0),
        paymentLabelMap[o.payment_method] || o.payment_method,
        statusLabelMap[o.status] || o.status,
        o.note || '-'
      ];

      r.getCell(6).numFmt = '#,##0.00';
      r.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };
      r.getCell(7).numFmt = '#,##0.00';
      r.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
      r.getCell(8).numFmt = '#,##0.00';
      r.getCell(8).alignment = { vertical: 'middle', horizontal: 'right' };
      r.getCell(10).alignment = { vertical: 'middle', horizontal: 'center' };
    });

    if (ordersList.length > 0) {
      const s3End = s3Start + ordersList.length - 1;
      const s3TotRow = ws3.getRow(s3End + 1);
      s3TotRow.values = [
        'รวมทั้งสิ้น',
        `(${ordersList.length} บิล)`,
        '-',
        '-',
        '-',
        { formula: `SUM(F${s3Start}:F${s3End})` },
        { formula: `SUM(G${s3Start}:G${s3End})` },
        { formula: `SUM(H${s3Start}:H${s3End})` },
        '-',
        '-',
        '-'
      ];
      styleTotalRow(s3TotRow);
      s3TotRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      s3TotRow.getCell(6).numFmt = '#,##0.00';
      s3TotRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };
      s3TotRow.getCell(7).numFmt = '#,##0.00';
      s3TotRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
      s3TotRow.getCell(8).numFmt = '#,##0.00';
      s3TotRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'right' };
    }

    styleDataRows(ws3, s3Start, ordersList.length > 0 ? s3Start + ordersList.length - 1 : s3Start);
    autoFitCols(ws3, 16);

    // ════════════════════════════════════════════════════════════════════════
    // ── Sheet 4: บันทึกค่าใช้จ่าย (Daily Expenses) ──
    // ════════════════════════════════════════════════════════════════════════
    const ws4 = workbook.addWorksheet('4. บันทึกค่าใช้จ่าย');
    ws4.columns = [
      { key: 'expense_date', width: 16 },
      { key: 'branch', width: 22 },
      { key: 'category', width: 22 },
      { key: 'note', width: 35 },
      { key: 'staff', width: 20 },
      { key: 'payment_method', width: 18 },
      { key: 'amount', width: 20 }
    ];

    addSheetBanner(ws4, `รายงานบันทึกค่าใช้จ่าย (Daily Expenses) | ${periodLabel} | ${branchLabel} | ส่งออก: ${exportDateStr}`, 'G');

    const ws4Header = ws4.getRow(3);
    ws4Header.values = ['วันที่', 'สาขา', 'หมวดหมู่ค่าใช้จ่าย', 'รายละเอียด/หมายเหตุ', 'ผู้บันทึก', 'ช่องทางจ่ายเงิน', 'จำนวนเงิน (บาท)'];
    styleSheetHeader(ws4Header, HEADER_DARK);

    const s4Start = 4;
    expensesList.forEach((e, idx) => {
      const rNum = s4Start + idx;
      const branchName = branchMap[e.branch_id] || `สาขา #${e.branch_id}`;
      const staffName = userMap[e.staff_id] || `พนักงาน #${e.staff_id}`;
      const r = ws4.getRow(rNum);
      r.values = [
        e.expense_date || e.created_at,
        branchName,
        e.category,
        e.note || '-',
        staffName,
        e.payment_method === 'transfer' ? 'เงินโอน' : 'เงินสด',
        Number(e.amount || 0)
      ];
      r.getCell(7).numFmt = '#,##0.00';
      r.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
    });

    if (expensesList.length > 0) {
      const s4End = s4Start + expensesList.length - 1;
      const s4TotRow = ws4.getRow(s4End + 1);
      s4TotRow.values = [
        'รวมค่าใช้จ่ายทั้งหมด',
        `(${expensesList.length} รายการ)`,
        '-',
        '-',
        '-',
        '-',
        { formula: `SUM(G${s4Start}:G${s4End})` }
      ];
      styleTotalRow(s4TotRow);
      s4TotRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      s4TotRow.getCell(7).numFmt = '#,##0.00';
      s4TotRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
    }

    styleDataRows(ws4, s4Start, expensesList.length > 0 ? s4Start + expensesList.length - 1 : s4Start);
    autoFitCols(ws4, 16);

    // ════════════════════════════════════════════════════════════════════════
    // ── Sheet 5: ยอดคลังและสต็อก (Stock Movement Logs) ──
    // ════════════════════════════════════════════════════════════════════════
    const ws5 = workbook.addWorksheet('5. ยอดคลังและสต็อก');
    ws5.columns = [
      { key: 'created_at', width: 22 },
      { key: 'branch', width: 22 },
      { key: 'item_name', width: 28 },
      { key: 'change_qty', width: 18 },
      { key: 'previous_stock', width: 16 },
      { key: 'new_stock', width: 16 },
      { key: 'reason', width: 22 },
      { key: 'staff', width: 20 },
      { key: 'note', width: 28 }
    ];

    addSheetBanner(ws5, `รายงานความเคลื่อนไหวสต็อก (Stock Logs) | ${periodLabel} | ${branchLabel} | ส่งออก: ${exportDateStr}`, 'I');

    const reasonLabelMap = {
      sale: 'ขายสินค้า',
      restock: 'เติมสต็อก',
      adjustment: 'ปรับปรุงสต็อก',
      waste: 'ของเสีย/เสียหาย',
      cancel_restore: 'คืนสตอกจากยกเลิกบิล',
      staff_benefit: 'สวัสดิการพนักงาน'
    };

    const ws5Header = ws5.getRow(3);
    ws5Header.values = ['วัน-เวลา', 'สาขา', 'รายการวัตถุดิบ/สินค้า', 'จำนวนที่เปลี่ยน', 'สต็อกเดิม', 'คงเหลือใหม่', 'เหตุผล', 'ผู้ทำรายการ', 'หมายเหตุ'];
    styleSheetHeader(ws5Header, HEADER_DARK);

    const s5Start = 4;
    stockLogs.forEach((s, idx) => {
      const rNum = s5Start + idx;
      const branchName = branchMap[s.branch_id] || `สาขา #${s.branch_id}`;
      const staffName = userMap[s.staff_id] || `พนักงาน #${s.staff_id}`;
      const r = ws5.getRow(rNum);
      r.values = [
        s.created_at,
        branchName,
        s.item_name || '-',
        s.change_qty,
        s.previous_stock !== null ? s.previous_stock : '-',
        s.new_stock !== null ? s.new_stock : '-',
        reasonLabelMap[s.reason] || s.reason,
        staffName,
        s.note || '-'
      ];
      r.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
      r.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
      r.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };
    });

    if (stockLogs.length > 0) {
      const s5End = s5Start + stockLogs.length - 1;
      const s5TotRow = ws5.getRow(s5End + 1);
      s5TotRow.values = [
        'รวมจำนวนการปรับเปลี่ยนสต็อก',
        `(${stockLogs.length} รายการ)`,
        '-',
        { formula: `SUM(D${s5Start}:D${s5End})` },
        '-',
        '-',
        '-',
        '-',
        '-'
      ];
      styleTotalRow(s5TotRow);
      s5TotRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      s5TotRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
    }

    styleDataRows(ws5, s5Start, stockLogs.length > 0 ? s5Start + stockLogs.length - 1 : s5Start);
    autoFitCols(ws5, 16);

    // ════════════════════════════════════════════════════════════════════════
    // ── Sheet 6: บันทึกกิจกรรม (Staff Activity Logs) ──
    // ════════════════════════════════════════════════════════════════════════
    const ws6 = workbook.addWorksheet('6. บันทึกกิจกรรม');
    ws6.columns = [
      { key: 'created_at', width: 22 },
      { key: 'branch', width: 22 },
      { key: 'staff', width: 20 },
      { key: 'action', width: 25 },
      { key: 'details', width: 45 }
    ];

    addSheetBanner(ws6, `รายงานบันทึกกิจกรรมระบบ (Activity Logs) | ${periodLabel} | ${branchLabel} | ส่งออก: ${exportDateStr}`, 'E');

    const ws6Header = ws6.getRow(3);
    ws6Header.values = ['วัน-เวลา', 'สาขา', 'พนักงาน/ผู้ใช้งาน', 'กิจกรรม (Action)', 'รายละเอียด'];
    styleSheetHeader(ws6Header, HEADER_DARK);

    const s6Start = 4;
    activityLogs.forEach((a, idx) => {
      const rNum = s6Start + idx;
      const branchName = branchMap[a.branch_id] || `สาขา #${a.branch_id}`;
      const staffName = userMap[a.user_id] || `ผู้ใช้ #${a.user_id}`;
      const r = ws6.getRow(rNum);
      r.values = [
        a.created_at,
        branchName,
        staffName,
        a.action,
        a.details || '-'
      ];
    });

    styleDataRows(ws6, s6Start);
    autoFitCols(ws6, 16);

    // ════════════════════════════════════════════════════════════════════════
    // ── Sheet 7: รอบลิ้นชักเก็บเงิน (Cash Drawer Sessions) ──
    // ════════════════════════════════════════════════════════════════════════
    const ws7 = workbook.addWorksheet('7. รอบลิ้นชักเก็บเงิน');
    ws7.columns = [
      { key: 'session_date', width: 16 },
      { key: 'branch', width: 22 },
      { key: 'opening_cash', width: 22 },
      { key: 'expected_cash', width: 24 },
      { key: 'actual_cash', width: 20 },
      { key: 'difference', width: 22 },
      { key: 'status', width: 18 },
      { key: 'note', width: 25 }
    ];

    addSheetBanner(ws7, `รายงานรอบลิ้นชักเก็บเงิน (Cash Drawer Sessions) | ${periodLabel} | ${branchLabel} | ส่งออก: ${exportDateStr}`, 'H');

    const ws7Header = ws7.getRow(3);
    ws7Header.values = ['วันที่', 'สาขา', 'เงินทอนเริ่มต้น (บาท)', 'ยอดเงินสดที่ควรมี (บาท)', 'ยอดนับจริง (บาท)', 'ผลต่าง ขาด/เกิน (บาท)', 'สถานะรอบ', 'หมายเหตุ'];
    styleSheetHeader(ws7Header, BRAND_COLOR);

    const s7Start = 4;
    cashSessions.forEach((c, idx) => {
      const rNum = s7Start + idx;
      const branchName = branchMap[c.branch_id] || `สาขา #${c.branch_id}`;
      const r = ws7.getRow(rNum);
      r.values = [
        c.session_date,
        branchName,
        Number(c.opening_cash || 0),
        c.expected_cash !== null ? Number(c.expected_cash) : '-',
        c.actual_cash !== null ? Number(c.actual_cash) : '-',
        c.difference !== null ? Number(c.difference) : '-',
        c.status === 'open' ? 'กำลังเปิดรอบ' : 'ปิดรอบเรียบร้อย',
        c.note || '-'
      ];

      r.getCell(3).numFmt = '#,##0.00';
      r.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' };
      if (typeof c.expected_cash === 'number') {
        r.getCell(4).numFmt = '#,##0.00';
        r.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
      }
      if (typeof c.actual_cash === 'number') {
        r.getCell(5).numFmt = '#,##0.00';
        r.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
      }
      if (typeof c.difference === 'number') {
        r.getCell(6).numFmt = '#,##0.00';
        r.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };
      }
      r.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
    });

    if (cashSessions.length > 0) {
      const s7End = s7Start + cashSessions.length - 1;
      const s7TotRow = ws7.getRow(s7End + 1);
      s7TotRow.values = [
        'รวมยอดเงินรอบลิ้นชัก',
        `(${cashSessions.length} รอบกะ)`,
        { formula: `SUM(C${s7Start}:C${s7End})` },
        { formula: `SUM(D${s7Start}:D${s7End})` },
        { formula: `SUM(E${s7Start}:E${s7End})` },
        { formula: `SUM(F${s7Start}:F${s7End})` },
        '-',
        '-'
      ];
      styleTotalRow(s7TotRow);
      s7TotRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      s7TotRow.getCell(3).numFmt = '#,##0.00';
      s7TotRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' };
      s7TotRow.getCell(4).numFmt = '#,##0.00';
      s7TotRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
      s7TotRow.getCell(5).numFmt = '#,##0.00';
      s7TotRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
      s7TotRow.getCell(6).numFmt = '#,##0.00';
      s7TotRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };
    }

    styleDataRows(ws7, s7Start, cashSessions.length > 0 ? s7Start + cashSessions.length - 1 : s7Start);
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
