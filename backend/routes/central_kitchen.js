const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { attachUser, requireAuth, requireManagerOrAdmin } = require('../middleware/auth');

// All routes require authentication
router.use(attachUser);
router.use(requireAuth);

/**
 * Helper to get current Thai local datetime string (YYYY-MM-DD HH:mm:ss)
 */
function getThaiNow() {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
}

function getThaiToday() {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split('T')[0];
}

// ─────────────────────────────────────────────────────────────
// 1. ITEMS (สินค้า/วัตถุดิบ/บรรจุภัณฑ์/อุปกรณ์ในครัวกลาง)
// ─────────────────────────────────────────────────────────────

// GET /api/central-kitchen/items — ดึงรายการสินค้าทั้งหมดในครัวกลาง
router.get('/items', async (req, res) => {
  try {
    const db = getDb();
    const { category, search, active_only } = req.query;

    let sql = 'SELECT * FROM central_kitchen_items WHERE 1=1';
    const params = [];

    if (active_only !== 'false') {
      sql += ' AND active = 1';
    }
    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (search && search.trim()) {
      sql += ' AND (name LIKE ?)';
      params.push(`%${search.trim()}%`);
    }

    sql += ' ORDER BY id DESC';
    const items = await db.prepare(sql).all(...params);

    res.json({
      success: true,
      data: items || []
    });
  } catch (error) {
    console.error('❌ Error fetching central kitchen items:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/central-kitchen/items — เพิ่มสินค้าใหม่เข้าครัวกลางด้วยตนเอง
router.post('/items', requireManagerOrAdmin, async (req, res) => {
  try {
    const db = getDb();
    const { name, category, unit, cost_price, quantity, min_stock_alert, image_url } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุชื่อสินค้า/วัตถุดิบ' });
    }

    const price = Number(cost_price) || 0;
    const initialQty = Number(quantity) || 0;
    const minAlert = Number(min_stock_alert) || 10;
    const itemUnit = unit ? unit.trim() : 'ชิ้น';
    const itemCat = category || 'general';
    const nowLocal = getThaiNow();

    const insertResult = await db.prepare(`
      INSERT INTO central_kitchen_items (name, category, unit, cost_price, quantity, min_stock_alert, image_url, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(name.trim(), itemCat, itemUnit, price, initialQty, minAlert, image_url || null, nowLocal, nowLocal);

    const insertedId = insertResult.lastInsertRowid;

    // Log initial stock if > 0
    if (initialQty > 0) {
      await db.prepare(`
        INSERT INTO central_kitchen_restock_logs (item_id, quantity_added, unit_cost, total_amount, supplier_note, created_by_name, created_at)
        VALUES (?, ?, ?, ?, 'สต็อกเริ่มต้นเมื่อสร้างสินค้า', ?, ?)
      `).run(insertedId, initialQty, price, initialQty * price, req.user.name, nowLocal);
    }

    res.status(201).json({
      success: true,
      message: 'เพิ่มสินค้าในครัวกลางเรียบร้อยแล้ว',
      data: { id: insertedId }
    });
  } catch (error) {
    console.error('❌ Error creating central kitchen item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/central-kitchen/items/:id — แก้ไขข้อมูลสินค้าในครัวกลาง
router.put('/items/:id', requireManagerOrAdmin, async (req, res) => {
  try {
    const db = getDb();
    const itemId = req.params.id;
    const { name, category, unit, cost_price, min_stock_alert, image_url, active } = req.body;

    const existing = await db.prepare('SELECT id FROM central_kitchen_items WHERE id = ?').get(itemId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'ไม่พบสินค้านี้ในครัวกลาง' });
    }

    const nowLocal = getThaiNow();
    await db.prepare(`
      UPDATE central_kitchen_items 
      SET name = COALESCE(?, name),
          category = COALESCE(?, category),
          unit = COALESCE(?, unit),
          cost_price = COALESCE(?, cost_price),
          min_stock_alert = COALESCE(?, min_stock_alert),
          image_url = COALESCE(?, image_url),
          active = COALESCE(?, active),
          updated_at = ?
      WHERE id = ?
    `).run(
      name ? name.trim() : null,
      category || null,
      unit ? unit.trim() : null,
      cost_price !== undefined ? Number(cost_price) : null,
      min_stock_alert !== undefined ? Number(min_stock_alert) : null,
      image_url !== undefined ? image_url : null,
      active !== undefined ? Number(active) : null,
      nowLocal,
      itemId
    );

    res.json({ success: true, message: 'อัปเดตข้อมูลสินค้าเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('❌ Error updating central kitchen item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/central-kitchen/items/:id/restock — เติมสต็อกด่วน (Quick Restock)
router.post('/items/:id/restock', requireManagerOrAdmin, async (req, res) => {
  try {
    const db = getDb();
    const itemId = req.params.id;
    const { quantity_added, unit_cost, supplier_note } = req.body;

    const qty = Number(quantity_added);
    if (!qty || qty <= 0) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุจำนวนที่เติมให้ถูกต้อง (> 0)' });
    }

    const item = await db.prepare('SELECT * FROM central_kitchen_items WHERE id = ?').get(itemId);
    if (!item) {
      return res.status(404).json({ success: false, error: 'ไม่พบสินค้า' });
    }

    const cost = unit_cost !== undefined ? Number(unit_cost) : Number(item.cost_price);
    const totalAmount = qty * cost;
    const nowLocal = getThaiNow();

    // Batch update stock and insert log
    const statements = [
      {
        sql: `UPDATE central_kitchen_items SET quantity = quantity + ?, cost_price = ?, updated_at = ? WHERE id = ?`,
        args: [qty, cost, nowLocal, itemId]
      },
      {
        sql: `INSERT INTO central_kitchen_restock_logs (item_id, quantity_added, unit_cost, total_amount, supplier_note, created_by_name, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [itemId, qty, cost, totalAmount, supplier_note || 'เติมสต็อกด่วน', req.user.name, nowLocal]
      }
    ];

    if (totalAmount > 0) {
      statements.push({
        sql: `INSERT INTO central_kitchen_finances (type, amount, note, created_by_name, created_at)
              VALUES ('purchase_out', ?, ?, ?, ?)`,
        args: [totalAmount, `ซื้อของเติมสต็อก: ${item.name} (+${qty} ${item.unit})`, req.user.name, nowLocal]
      });
    }

    await db.batch(statements);

    res.json({
      success: true,
      message: `เติมสต็อก ${item.name} จำนวน +${qty} ${item.unit} สำเร็จ`,
      data: {
        new_quantity: Number(item.quantity) + qty
      }
    });
  } catch (error) {
    console.error('❌ Error restocking central kitchen item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 2. REQUISITIONS & TRANSFERS (การเบิกของระหว่างสาขา & ครัวกลาง)
// ─────────────────────────────────────────────────────────────

// GET /api/central-kitchen/transfers — ดึงรายการใบขอเบิก
router.get('/transfers', async (req, res) => {
  try {
    const db = getDb();
    const { branch_id, status } = req.query;

    let sql = `
      SELECT t.*, b.name as branch_name
      FROM central_kitchen_transfers t
      JOIN branches b ON t.branch_id = b.id
      WHERE 1=1
    `;
    const params = [];

    // If user is from a branch and not admin/manager of central kitchen, only show their branch
    if (branch_id) {
      sql += ' AND t.branch_id = ?';
      params.push(branch_id);
    } else if (req.user.role !== 'admin' && !req.user.is_central_kitchen) {
      // Default to user's branch
      if (req.user.branch_id) {
        sql += ' AND t.branch_id = ?';
        params.push(req.user.branch_id);
      }
    }

    if (status && status !== 'all') {
      sql += ' AND t.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY t.id DESC LIMIT 100';
    const transfers = await db.prepare(sql).all(...params);

    // Fetch items for each transfer
    for (const t of transfers) {
      const items = await db.prepare(`
        SELECT * FROM central_kitchen_transfer_items WHERE transfer_id = ?
      `).all(t.id);
      t.items = items || [];
    }

    res.json({
      success: true,
      data: transfers || []
    });
  } catch (error) {
    console.error('❌ Error fetching transfers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/central-kitchen/transfers — สร้างคำขอเบิกของ (จากหน้าร้าน)
router.post('/transfers', async (req, res) => {
  try {
    const db = getDb();
    const { branch_id, items, notes } = req.body;

    const targetBranchId = branch_id || req.user.branch_id;
    if (!targetBranchId) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุสาขาที่ขอเบิก' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'กรุณาเลือกรายการของที่ต้องการเบิก' });
    }

    // Generate Transfer Number: REQ-YYYYMMDD-XXXX
    const dateStr = getThaiToday().replace(/-/g, '');
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const transferNo = `REQ-${dateStr}-${randNum}`;

    let totalCost = 0;
    const itemsToInsert = [];

    // Verify and calculate costs
    for (const it of items) {
      const dbItem = await db.prepare('SELECT * FROM central_kitchen_items WHERE id = ?').get(it.item_id);
      if (!dbItem) continue;

      const qty = Number(it.quantity) || 1;
      const cost = Number(dbItem.cost_price) || 0;
      totalCost += qty * cost;

      itemsToInsert.push({
        item_id: dbItem.id,
        item_name: dbItem.name,
        unit: dbItem.unit,
        cost_price: cost,
        quantity: qty
      });
    }

    if (itemsToInsert.length === 0) {
      return res.status(400).json({ success: false, error: 'ไม่พบรายการสินค้าที่ถูกต้อง' });
    }

    const nowLocal = getThaiNow();

    // 1. Insert master transfer record
    const insertTransfer = await db.prepare(`
      INSERT INTO central_kitchen_transfers (transfer_no, branch_id, requested_by_user_id, requested_by_name, status, total_cost, notes, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)
    `).run(transferNo, targetBranchId, req.user.id, req.user.name, totalCost, notes || null, nowLocal);

    const transferId = insertTransfer.lastInsertRowid;

    // 2. Insert items
    for (const item of itemsToInsert) {
      await db.prepare(`
        INSERT INTO central_kitchen_transfer_items (transfer_id, item_id, item_name, unit, cost_price, quantity)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(transferId, item.item_id, item.item_name, item.unit, item.cost_price, item.quantity);
    }

    res.status(201).json({
      success: true,
      message: 'ยื่นคำขอเบิกของเรียบร้อยแล้ว',
      data: {
        id: transferId,
        transfer_no: transferNo,
        total_cost: totalCost
      }
    });
  } catch (error) {
    console.error('❌ Error creating transfer request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/central-kitchen/transfers/:id/dispatch — ครัวกลางกดส่งของ (ตัดสต็อกครัวกลาง)
router.put('/transfers/:id/dispatch', requireManagerOrAdmin, async (req, res) => {
  try {
    const db = getDb();
    const transferId = req.params.id;

    const transfer = await db.prepare('SELECT * FROM central_kitchen_transfers WHERE id = ?').get(transferId);
    if (!transfer) {
      return res.status(404).json({ success: false, error: 'ไม่พบใบเบิกนี้' });
    }
    if (transfer.status !== 'pending') {
      return res.status(400).json({ success: false, error: `สถานะใบเบิกคือ ${transfer.status} ไม่สามารถกดจัดส่งได้` });
    }

    const transferItems = await db.prepare('SELECT * FROM central_kitchen_transfer_items WHERE transfer_id = ?').all(transferId);

    // Check and deduct stock in central kitchen
    const nowLocal = getThaiNow();
    const statements = [
      {
        sql: `UPDATE central_kitchen_transfers SET status = 'dispatched', dispatched_by_name = ?, dispatched_at = ? WHERE id = ?`,
        args: [req.user.name, nowLocal, transferId]
      }
    ];

    for (const item of transferItems) {
      statements.push({
        sql: `UPDATE central_kitchen_items SET quantity = MAX(0, quantity - ?), updated_at = ? WHERE id = ?`,
        args: [item.quantity, nowLocal, item.item_id]
      });
    }

    await db.batch(statements);

    res.json({
      success: true,
      message: `จัดส่งใบเบิก ${transfer.transfer_no} และตัดสต็อกครัวกลางเรียบร้อยแล้ว`
    });
  } catch (error) {
    console.error('❌ Error dispatching transfer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/central-kitchen/transfers/:id/receive — สาขากดยืนยันรับของ (บันทึก Auto Expense เข้าบัญชีสาขา)
router.put('/transfers/:id/receive', async (req, res) => {
  try {
    const db = getDb();
    const transferId = req.params.id;

    const transfer = await db.prepare('SELECT * FROM central_kitchen_transfers WHERE id = ?').get(transferId);
    if (!transfer) {
      return res.status(404).json({ success: false, error: 'ไม่พบใบเบิกนี้' });
    }
    if (transfer.status !== 'dispatched') {
      return res.status(400).json({ success: false, error: 'ใบเบิกนี้ยังไม่ได้รับการจัดส่งจากครัวกลาง' });
    }

    const nowLocal = getThaiNow();
    const todayDate = getThaiToday();

    // 1. Create Auto Expense for the receiving branch
    let insertedExpenseId = null;
    if (transfer.total_cost > 0) {
      const expenseNote = `เบิกของจากครัวกลาง ใบเบิก #${transfer.transfer_no}${transfer.notes ? ` (${transfer.notes})` : ''}`;
      
      const insertExpenseRes = await db.prepare(`
        INSERT INTO expenses (branch_id, staff_id, amount, category, note, expense_date, payment_method, status, created_at)
        VALUES (?, ?, ?, 'raw_materials', ?, ?, 'transfer', 'completed', ?)
      `).run(transfer.branch_id, req.user.id, transfer.total_cost, expenseNote, todayDate, nowLocal);

      insertedExpenseId = insertExpenseRes.lastInsertRowid;
    }

    // 2. Update transfer status to received
    await db.prepare(`
      UPDATE central_kitchen_transfers 
      SET status = 'received', received_at = ?, expense_id = ?
      WHERE id = ?
    `).run(nowLocal, insertedExpenseId, transferId);

    res.json({
      success: true,
      message: `ยืนยันรับของใบเบิก #${transfer.transfer_no} สำเร็จ พร้อมบันทึกต้นทุน ${transfer.total_cost} บาทเข้าสาขาเรียบร้อยแล้ว`,
      data: {
        expense_id: insertedExpenseId
      }
    });
  } catch (error) {
    console.error('❌ Error receiving transfer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 3. HISTORY & TIMELINE (ประวัติการเติมสต็อกและการเบิกของ)
// ─────────────────────────────────────────────────────────────

// GET /api/central-kitchen/history — ดึงประวัติเติม & เบิก รวมกันเป็นการ์ดไทม์ไลน์
router.get('/history', async (req, res) => {
  try {
    const db = getDb();
    const { branch_id, type } = req.query; // type: 'all' | 'restock' | 'requisition'

    const timeline = [];

    // 1. Restock logs (ครัวกลางเติมของ)
    if (!type || type === 'all' || type === 'restock') {
      const restockLogs = await db.prepare(`
        SELECT l.*, i.name as item_name, i.unit, i.image_url
        FROM central_kitchen_restock_logs l
        JOIN central_kitchen_items i ON l.item_id = i.id
        ORDER BY l.id DESC LIMIT 50
      `).all();

      for (const log of restockLogs) {
        timeline.push({
          id: `restock-${log.id}`,
          type: 'restock',
          title: 'เติมสต็อกเข้าครัวกลาง',
          item_name: log.item_name,
          unit: log.unit,
          quantity: log.quantity_added,
          unit_cost: log.unit_cost,
          total_amount: log.total_amount,
          note: log.supplier_note,
          created_by: log.created_by_name || 'ผู้ดูแลระบบ',
          created_at: log.created_at,
          image_url: log.image_url
        });
      }
    }

    // 2. Requisition/Transfer logs (สาขาเบิกของ)
    if (!type || type === 'all' || type === 'requisition') {
      let transferSql = `
        SELECT t.*, b.name as branch_name
        FROM central_kitchen_transfers t
        JOIN branches b ON t.branch_id = b.id
        WHERE 1=1
      `;
      const params = [];
      if (branch_id) {
        transferSql += ' AND t.branch_id = ?';
        params.push(branch_id);
      }
      transferSql += ' ORDER BY t.id DESC LIMIT 50';

      const transfers = await db.prepare(transferSql).all(...params);

      for (const t of transfers) {
        const items = await db.prepare(`
          SELECT * FROM central_kitchen_transfer_items WHERE transfer_id = ?
        `).all(t.id);

        timeline.push({
          id: `transfer-${t.id}`,
          type: 'transfer',
          transfer_no: t.transfer_no,
          branch_name: t.branch_name,
          branch_id: t.branch_id,
          title: `สาขาเบิกของ (${t.branch_name})`,
          status: t.status,
          total_cost: t.total_cost,
          items: items || [],
          note: t.notes,
          created_by: t.requested_by_name,
          dispatched_by: t.dispatched_by_name,
          created_at: t.created_at,
          dispatched_at: t.dispatched_at,
          received_at: t.received_at
        });
      }
    }

    // Sort combined by created_at DESC
    timeline.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      success: true,
      data: timeline.slice(0, 100)
    });
  } catch (error) {
    console.error('❌ Error fetching central kitchen history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 4. PARTNERS & PROFIT SHARING (ระบบหุ้นส่วนและการแบ่งกำไร 60/40)
// ─────────────────────────────────────────────────────────────

// GET /api/central-kitchen/partners/:branchId — ดึงรายชื่อหุ้นส่วนของสาขา
router.get('/partners/:branchId', async (req, res) => {
  try {
    const db = getDb();
    const branchId = req.params.branchId;

    let partners = await db.prepare(`
      SELECT * FROM branch_partners WHERE branch_id = ? ORDER BY is_owner DESC, id ASC
    `).all(branchId);

    // If no partners defined for this branch yet, create default (Owner 100% or 60/40 for branch 3)
    if (partners.length === 0) {
      if (Number(branchId) === 3) {
        // Default for branch 3: 60/40
        await db.prepare('INSERT INTO branch_partners (branch_id, partner_name, share_percentage, is_owner, notes) VALUES (?, ?, 60, 1, ?)')
          .run(branchId, 'เจ้าของร้าน (Owner)', 'หุ้นส่วนหลัก');
        await db.prepare('INSERT INTO branch_partners (branch_id, partner_name, share_percentage, is_owner, notes) VALUES (?, ?, 40, 0, ?)')
          .run(branchId, 'หุ้นส่วนสาขา 3', 'หุ้นส่วนร่วม');
      } else {
        await db.prepare('INSERT INTO branch_partners (branch_id, partner_name, share_percentage, is_owner, notes) VALUES (?, ?, 100, 1, ?)')
          .run(branchId, 'เจ้าของร้าน (Owner)', 'ถือหุ้น 100%');
      }

      partners = await db.prepare('SELECT * FROM branch_partners WHERE branch_id = ? ORDER BY is_owner DESC, id ASC').all(branchId);
    }

    res.json({
      success: true,
      data: partners
    });
  } catch (error) {
    console.error('❌ Error fetching branch partners:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/central-kitchen/partners/:branchId — เพิ่ม/แก้ไขหุ้นส่วน
router.post('/partners/:branchId', requireManagerOrAdmin, async (req, res) => {
  try {
    const db = getDb();
    const branchId = req.params.branchId;
    const { partners } = req.body;

    if (!Array.isArray(partners) || partners.length === 0) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุรายชื่อหุ้นส่วน' });
    }

    // Verify sum of shares is 100%
    const totalPercentage = partners.reduce((sum, p) => sum + (Number(p.share_percentage) || 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return res.status(400).json({ success: false, error: `ผลรวมของหุ้นส่วนต้องเท่ากับ 100% (ปัจจุบัน: ${totalPercentage}%)` });
    }

    // Replace partners for this branch
    await db.prepare('DELETE FROM branch_partners WHERE branch_id = ?').run(branchId);

    for (const p of partners) {
      await db.prepare(`
        INSERT INTO branch_partners (branch_id, partner_name, share_percentage, is_owner, notes)
        VALUES (?, ?, ?, ?, ?)
      `).run(branchId, p.partner_name, Number(p.share_percentage), p.is_owner ? 1 : 0, p.notes || null);
    }

    res.json({ success: true, message: 'บันทึกข้อมูลสัดส่วนหุ้นส่วนเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('❌ Error saving branch partners:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/central-kitchen/profit-settlement — รายงานคำนวณกำไรและส่วนแบ่งปันผล
router.get('/profit-settlement', async (req, res) => {
  try {
    const db = getDb();
    const { branch_id, start_date, end_date } = req.query;

    if (!branch_id) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุ branch_id' });
    }

    const startDate = start_date || `${getThaiToday().substring(0, 7)}-01`;
    const endDate = end_date || getThaiToday();

    // 1. Total Sales from completed orders
    const salesRes = await db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total_sales, COUNT(id) as total_orders
      FROM orders
      WHERE branch_id = ? AND status = 'completed'
        AND date(created_at) >= date(?) AND date(created_at) <= date(?)
    `).get(branch_id, startDate, endDate);

    const totalSales = Number(salesRes?.total_sales || 0);

    // 2. Direct branch expenses (excluding central kitchen transfers)
    const storeExpRes = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as store_expenses
      FROM expenses
      WHERE branch_id = ? AND status = 'completed'
        AND (note NOT LIKE '%เบิกของจากครัวกลาง%' OR note IS NULL)
        AND date(expense_date) >= date(?) AND date(expense_date) <= date(?)
    `).get(branch_id, startDate, endDate);

    const directStoreExpenses = Number(storeExpRes?.store_expenses || 0);

    // 3. Central kitchen transfer costs
    const ckExpRes = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as ck_expenses
      FROM expenses
      WHERE branch_id = ? AND status = 'completed'
        AND note LIKE '%เบิกของจากครัวกลาง%'
        AND date(expense_date) >= date(?) AND date(expense_date) <= date(?)
    `).get(branch_id, startDate, endDate);

    const centralKitchenCost = Number(ckExpRes?.ck_expenses || 0);

    // 4. Net Profit
    const netProfit = totalSales - directStoreExpenses - centralKitchenCost;

    // 5. Partners breakdown
    const partners = await db.prepare(`
      SELECT * FROM branch_partners WHERE branch_id = ? ORDER BY is_owner DESC, id ASC
    `).all(branch_id);

    const partnerDistributions = partners.map(p => {
      const shareAmount = netProfit > 0 ? (netProfit * (p.share_percentage / 100)) : 0;
      return {
        id: p.id,
        name: p.partner_name,
        share_percentage: p.share_percentage,
        is_owner: Boolean(p.is_owner),
        payout_amount: Number(shareAmount.toFixed(2))
      };
    });

    // 6. Check reimbursement status for this branch in this period
    const reimbRes = await db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN is_reimbursed = 1 THEN total_cost ELSE 0 END), 0) as reimbursed_cost,
        COALESCE(SUM(CASE WHEN is_reimbursed = 0 OR is_reimbursed IS NULL THEN total_cost ELSE 0 END), 0) as pending_reimbursement,
        COUNT(CASE WHEN is_reimbursed = 0 OR is_reimbursed IS NULL THEN 1 ELSE NULL END) as pending_transfers_count
      FROM central_kitchen_transfers
      WHERE branch_id = ? AND status = 'received'
        AND date(created_at) >= date(?) AND date(created_at) <= date(?)
    `).get(branch_id, startDate, endDate);

    // 7. Check existing dividend payouts for this period
    const existingPayouts = await db.prepare(`
      SELECT * FROM branch_dividend_payouts
      WHERE branch_id = ? AND period_start = ? AND period_end = ?
    `).all(branch_id, startDate, endDate);

    res.json({
      success: true,
      data: {
        branch_id: Number(branch_id),
        period: { start_date: startDate, end_date: endDate },
        total_sales: totalSales,
        direct_store_expenses: directStoreExpenses,
        central_kitchen_cost: centralKitchenCost,
        net_profit: netProfit,
        partner_distributions: partnerDistributions,
        reimbursement: {
          reimbursed_cost: Number(reimbRes?.reimbursed_cost || 0),
          pending_reimbursement: Number(reimbRes?.pending_reimbursement || 0),
          pending_transfers_count: Number(reimbRes?.pending_transfers_count || 0),
          is_fully_reimbursed: Number(reimbRes?.pending_reimbursement || 0) <= 0 && centralKitchenCost > 0
        },
        payouts: existingPayouts || [],
        is_payout_completed: Boolean(existingPayouts && existingPayouts.length > 0)
      }
    });
  } catch (error) {
    console.error('❌ Error calculating profit settlement:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 5. CENTRAL KITCHEN FINANCES & CASHBOOK (กระเป๋าเงินกองกลาง)
// ─────────────────────────────────────────────────────────────

// GET /api/central-kitchen/finances/summary — สรุปสถานะการเงินกองกลาง
router.get('/finances/summary', async (req, res) => {
  try {
    const db = getDb();
    
    // 1. Total capital injected by owner
    const capRes = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_capital
      FROM central_kitchen_finances
      WHERE type = 'capital_in'
    `).get();
    const totalCapital = Number(capRes?.total_capital || 0);

    // 2. Total reimbursement received from branches
    const reimbRes = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_reimbursed
      FROM central_kitchen_finances
      WHERE type = 'reimbursement_in'
    `).get();
    const totalReimbursed = Number(reimbRes?.total_reimbursed || 0);

    // 3. Total purchases of inventory
    const purchRes = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_purchases
      FROM central_kitchen_finances
      WHERE type = 'purchase_out'
    `).get();
    const totalPurchases = Number(purchRes?.total_purchases || 0);

    // 4. Total operating expenses (gas, fuel, etc.)
    const opExpRes = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_op_expenses
      FROM central_kitchen_finances
      WHERE type IN ('operating_expense_out', 'other_out')
    `).get();
    const totalOperatingExpenses = Number(opExpRes?.total_op_expenses || 0);

    // Current Cash Balance: All In minus All Out
    const cashBalance = (totalCapital + totalReimbursed) - (totalPurchases + totalOperatingExpenses);

    // 5. Inventory value: SUM(quantity * cost_price)
    const invRes = await db.prepare(`
      SELECT COALESCE(SUM(quantity * cost_price), 0) as total_inventory_value, COUNT(id) as total_items
      FROM central_kitchen_items
      WHERE active = 1 AND quantity > 0
    `).get();
    const inventoryValue = Number(invRes?.total_inventory_value || 0);

    // 6. Outstanding receivables from branches: transfers received but not reimbursed
    const outRes = await db.prepare(`
      SELECT COALESCE(SUM(total_cost), 0) as pending_receivables
      FROM central_kitchen_transfers
      WHERE status = 'received' AND (is_reimbursed = 0 OR is_reimbursed IS NULL)
    `).get();
    const pendingReceivables = Number(outRes?.pending_receivables || 0);

    res.json({
      success: true,
      data: {
        cash_balance: cashBalance,
        inventory_value: inventoryValue,
        pending_receivables: pendingReceivables,
        total_capital: totalCapital,
        total_reimbursed: totalReimbursed,
        total_purchases: totalPurchases,
        total_operating_expenses: totalOperatingExpenses
      }
    });
  } catch (error) {
    console.error('❌ Error fetching central kitchen finances summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/central-kitchen/finances/logs — ประวัติรายการเดินบัญชีกองกลาง
router.get('/finances/logs', async (req, res) => {
  try {
    const db = getDb();
    const { type, limit } = req.query;

    let sql = `
      SELECT f.*, b.name as branch_name
      FROM central_kitchen_finances f
      LEFT JOIN branches b ON f.branch_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (type && type !== 'all') {
      sql += ' AND f.type = ?';
      params.push(type);
    }

    sql += ' ORDER BY f.id DESC LIMIT ?';
    params.push(Number(limit) || 100);

    const logs = await db.prepare(sql).all(...params);

    res.json({
      success: true,
      data: logs || []
    });
  } catch (error) {
    console.error('❌ Error fetching central kitchen finances logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/central-kitchen/finances/transaction — บันทึกเงินเข้า/ออกกองกลาง (เติมทุน หรือ จ่ายค่าใช้จ่าย)
router.post('/finances/transaction', requireManagerOrAdmin, async (req, res) => {
  try {
    const db = getDb();
    const { type, amount, note, payment_method } = req.body;

    const amt = Number(amount);
    if (!amt || amt <= 0) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุจำนวนเงินที่ถูกต้อง (> 0)' });
    }

    const validTypes = ['capital_in', 'operating_expense_out', 'other_out'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: 'ประเภทธุรกรรมไม่ถูกต้อง' });
    }

    const nowLocal = getThaiNow();
    await db.prepare(`
      INSERT INTO central_kitchen_finances (type, amount, payment_method, note, created_by_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(type, amt, payment_method || 'transfer', note || null, req.user.name, nowLocal);

    res.status(201).json({
      success: true,
      message: type === 'capital_in' ? 'เติมเงินทุนกองกลางเรียบร้อยแล้ว' : 'บันทึกรายจ่ายครัวกลางเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('❌ Error recording central kitchen transaction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/central-kitchen/transfers/reimburse-branch — บันทึกสาขาเคลียร์เงินค่าของคืนครัวกลาง (Bulk Reimbursement)
router.post('/transfers/reimburse-branch', requireManagerOrAdmin, async (req, res) => {
  try {
    const db = getDb();
    const { branch_id, start_date, end_date, payment_method, note } = req.body;

    if (!branch_id) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุ branch_id' });
    }

    let sql = `
      SELECT * FROM central_kitchen_transfers
      WHERE branch_id = ? AND status = 'received' AND (is_reimbursed = 0 OR is_reimbursed IS NULL)
    `;
    const params = [branch_id];

    if (start_date && end_date) {
      sql += ' AND date(created_at) >= date(?) AND date(created_at) <= date(?)';
      params.push(start_date, end_date);
    }

    const pendingTransfers = await db.prepare(sql).all(...params);

    if (pendingTransfers.length === 0) {
      return res.status(400).json({ success: false, error: 'ไม่มีรายการใบเบิกที่ค้างชำระคืนในเงื่อนไขที่เลือก' });
    }

    const totalReimburseAmount = pendingTransfers.reduce((sum, t) => sum + Number(t.total_cost || 0), 0);
    const nowLocal = getThaiNow();

    const statements = [];

    // Mark transfers as reimbursed
    for (const t of pendingTransfers) {
      statements.push({
        sql: `UPDATE central_kitchen_transfers SET is_reimbursed = 1, reimbursed_at = ?, reimbursed_by_name = ? WHERE id = ?`,
        args: [nowLocal, req.user.name, t.id]
      });
    }

    // Insert into central_kitchen_finances
    const branchInfo = await db.prepare('SELECT name FROM branches WHERE id = ?').get(branch_id);
    const defaultNote = `รับเงินคืนค่าของจากสาขา ${branchInfo?.name || branch_id} (${pendingTransfers.length} ใบเบิก)`;
    statements.push({
      sql: `INSERT INTO central_kitchen_finances (type, amount, branch_id, payment_method, note, created_by_name, created_at)
            VALUES ('reimbursement_in', ?, ?, ?, ?, ?, ?)`,
      args: [totalReimburseAmount, branch_id, payment_method || 'transfer', note || defaultNote, req.user.name, nowLocal]
    });

    await db.batch(statements);

    res.json({
      success: true,
      message: `บันทึกเคลียร์เงินค่าของคืนครัวกลางจำนวน ฿${totalReimburseAmount.toLocaleString()} เรียบร้อยแล้ว`,
      data: {
        reimbursed_transfers_count: pendingTransfers.length,
        total_amount: totalReimburseAmount
      }
    });
  } catch (error) {
    console.error('❌ Error reimbursing transfers for branch:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/central-kitchen/items/:id/waste — ตัดของเสีย/หมดอายุในครัวกลาง
router.post('/items/:id/waste', requireManagerOrAdmin, async (req, res) => {
  try {
    const db = getDb();
    const itemId = req.params.id;
    const { quantity, quantity_wasted, reason, note } = req.body;

    const rawQty = (quantity !== undefined && quantity !== null && quantity !== '') ? quantity : quantity_wasted;
    const qty = Number(rawQty);
    if (!qty || isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุจำนวนของเสียที่ถูกต้อง (> 0)' });
    }

    const item = await db.prepare('SELECT * FROM central_kitchen_items WHERE id = ?').get(itemId);
    if (!item) {
      return res.status(404).json({ success: false, error: 'ไม่พบสินค้า' });
    }

    if (qty > Number(item.quantity)) {
      return res.status(400).json({ success: false, error: `จำนวนของเสียมากกว่าสต็อกที่มีอยู่ในคลัง (สต็อกปัจจุบัน: ${item.quantity} ${item.unit})` });
    }

    const unitCost = Number(item.cost_price || 0);
    const totalCost = qty * unitCost;
    const nowLocal = getThaiNow();

    const reasonMap = {
      'expired': 'หมดอายุ / เน่าเสีย',
      'damaged': 'แตกหัก / ชำรุดเสียหาย',
      'lost': 'สูญหาย / นับสต็อกไม่ตรง',
      'other': 'อื่นๆ'
    };
    const reasonText = reasonMap[reason] || reason || 'เน่า/เสีย';
    const finalReason = note && String(note).trim() ? `${reasonText} (${String(note).trim()})` : reasonText;

    const statements = [
      {
        sql: `UPDATE central_kitchen_items SET quantity = MAX(0, quantity - ?), updated_at = ? WHERE id = ?`,
        args: [qty, nowLocal, itemId]
      },
      {
        sql: `INSERT INTO central_kitchen_waste_logs (item_id, quantity, unit_cost, total_cost, reason, created_by_name, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [itemId, qty, unitCost, totalCost, finalReason, req.user.name, nowLocal]
      }
    ];

    await db.batch(statements);

    res.json({
      success: true,
      message: `ตัดของเสีย ${item.name} จำนวน ${qty} ${item.unit} เรียบร้อยแล้ว`,
      data: {
        new_quantity: Number(item.quantity) - qty,
        total_waste_cost: totalCost
      }
    });
  } catch (error) {
    console.error('❌ Error recording central kitchen waste:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/central-kitchen/waste-logs — ดึงประวัติของเสียในครัวกลาง
router.get('/waste-logs', async (req, res) => {
  try {
    const db = getDb();
    const logs = await db.prepare(`
      SELECT w.*, i.name as item_name, i.unit, i.image_url
      FROM central_kitchen_waste_logs w
      JOIN central_kitchen_items i ON w.item_id = i.id
      ORDER BY w.id DESC LIMIT 50
    `).all();

    res.json({
      success: true,
      data: logs || []
    });
  } catch (error) {
    console.error('❌ Error fetching waste logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/central-kitchen/payouts — บันทึกจ่ายเงินปันผลหุ้นส่วน
router.post('/payouts', requireManagerOrAdmin, async (req, res) => {
  try {
    const db = getDb();
    const { branch_id, start_date, end_date, distributions, net_profit, note } = req.body;

    if (!branch_id || !Array.isArray(distributions) || distributions.length === 0) {
      return res.status(400).json({ success: false, error: 'ข้อมูลการจ่ายปันผลไม่ถูกต้อง' });
    }

    const nowLocal = getThaiNow();
    const statements = [];

    for (const d of distributions) {
      statements.push({
        sql: `INSERT INTO branch_dividend_payouts (branch_id, period_start, period_end, partner_id, partner_name, share_percentage, payout_amount, net_profit, paid_by_name, note, paid_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [branch_id, start_date, end_date, d.id || null, d.name, d.share_percentage, d.payout_amount, net_profit, req.user.name, note || 'จ่ายเงินปันผลประจำงวด', nowLocal]
      });
    }

    await db.batch(statements);

    res.status(201).json({
      success: true,
      message: 'บันทึกประวัติการจ่ายเงินปันผลเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('❌ Error saving dividend payouts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/central-kitchen/payouts — ดึงประวัติการจ่ายเงินปันผลของสาขา
router.get('/payouts', async (req, res) => {
  try {
    const db = getDb();
    const { branch_id } = req.query;

    let sql = 'SELECT * FROM branch_dividend_payouts WHERE 1=1';
    const params = [];

    if (branch_id) {
      sql += ' AND branch_id = ?';
      params.push(branch_id);
    }

    sql += ' ORDER BY id DESC LIMIT 50';
    const payouts = await db.prepare(sql).all(...params);

    res.json({
      success: true,
      data: payouts || []
    });
  } catch (error) {
    console.error('❌ Error fetching dividend payouts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
