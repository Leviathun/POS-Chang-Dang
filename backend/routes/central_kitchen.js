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

/**
 * Auto-sync restock to branch POS menu items
 * If ckItem has linked_menu_item_name, or if category === 'raw_material' and matches menu_items.name
 */
async function syncRestockToBranchMenu(db, branchId, ckItem, qty, transferNo, userName, isReverse = false, packSize = null) {
  try {
    if (!branchId || !ckItem || !qty || qty <= 0) return { synced: false };

    // 1. Determine target menu item name (Explicit link only)
    let targetName = ckItem.linked_menu_item_name ? ckItem.linked_menu_item_name.trim() : null;

    // If not linked explicitly, do NOT auto-restock branch POS menu (เว้นว่าง = ไม่เติมสต็อก POS)
    if (!targetName) {
      return { synced: false, reason: 'not_linked' };
    }

    let menuItem = await db.prepare('SELECT * FROM menu_items WHERE branch_id = ? AND name = ? LIMIT 1').get(branchId, targetName);

    if (!menuItem) {
      // Smart alias fallback for common branch menu naming differences across branches
      if (targetName.includes('น่อง') && targetName.includes('เล็ก')) {
        menuItem = await db.prepare("SELECT * FROM menu_items WHERE branch_id = ? AND name LIKE '%น่อง%เล็ก%' LIMIT 1").get(branchId);
      } else if (targetName.includes('น่อง') && targetName.includes('ใหญ่')) {
        menuItem = await db.prepare("SELECT * FROM menu_items WHERE branch_id = ? AND name LIKE '%น่อง%ใหญ่%' LIMIT 1").get(branchId);
      } else if (targetName.startsWith('ปีก')) {
        menuItem = await db.prepare("SELECT * FROM menu_items WHERE branch_id = ? AND name LIKE 'ปีก%' LIMIT 1").get(branchId);
      } else if (targetName.includes('สะโพก') && targetName.includes('ไร้')) {
        menuItem = await db.prepare("SELECT * FROM menu_items WHERE branch_id = ? AND name LIKE '%สะโพก%ไร้%' LIMIT 1").get(branchId);
      } else if (targetName.includes('สะโพก') && targetName.includes('น่อง')) {
        menuItem = await db.prepare("SELECT * FROM menu_items WHERE branch_id = ? AND (name LIKE '%สะโพก%น่อง%' OR name LIKE '%น่อง%สะโพก%') LIMIT 1").get(branchId);
      } else if (targetName === 'สะโพก' || targetName === 'สะโพกไก่') {
        menuItem = await db.prepare("SELECT * FROM menu_items WHERE branch_id = ? AND (name = 'สะโพก' OR name = 'สะโพกไก่') LIMIT 1").get(branchId);
      } else if (targetName.includes('อกไก่') && targetName.includes('สไป')) {
        menuItem = await db.prepare("SELECT * FROM menu_items WHERE branch_id = ? AND name LIKE '%อกไก่%สไป%' LIMIT 1").get(branchId);
      } else if ((targetName.includes('ชีส') || targetName.includes('ซีส')) && targetName.includes('บอล')) {
        menuItem = await db.prepare("SELECT * FROM menu_items WHERE branch_id = ? AND (name LIKE '%ชีสบอล%' OR name LIKE '%ซีสบอล%') LIMIT 1").get(branchId);
      } else if ((targetName.includes('ชีส') || targetName.includes('ซีส')) && (targetName.includes('สติ๊ก') || targetName.includes('สตริก'))) {
        menuItem = await db.prepare("SELECT * FROM menu_items WHERE branch_id = ? AND (name LIKE '%ชีส%สติ๊ก%' OR name LIKE '%ซีส%สติ๊ก%') LIMIT 1").get(branchId);
      } else if (targetName.includes('นักเก็ต') && targetName.includes('ลาวา')) {
        menuItem = await db.prepare("SELECT * FROM menu_items WHERE branch_id = ? AND name LIKE '%นักเก็ต%ลาวา%' LIMIT 1").get(branchId);
      } else if (targetName.includes('นักเก็ต')) {
        menuItem = await db.prepare("SELECT * FROM menu_items WHERE branch_id = ? AND name LIKE '%นักเก็ต%' AND name NOT LIKE '%ลาวา%' LIMIT 1").get(branchId);
      }
    }

    if (!menuItem) {
      return { synced: false, reason: 'no_matching_menu_item' };
    }

    // 2. Unit conversion multiplier: check packSize snapshot, then ckItem.pack_size, fallback to 1
    const multiplier = Number((packSize && packSize > 0) ? packSize : (ckItem.pack_size && ckItem.pack_size > 0 ? ckItem.pack_size : 1));
    const convertedQty = Number(qty) * multiplier;

    const stockField = (ckItem.target_stock_type === 'ready' || menuItem.raw_quantity === null) ? 'quantity' : 'raw_quantity';
    const currentStock = Number(menuItem[stockField] || 0);
    const changeQty = isReverse ? -convertedQty : convertedQty;
    const newStock = Math.max(0, currentStock + changeQty);
    const nowLocal = getThaiNow();

    // Update menu_items stock
    await db.prepare(`
      UPDATE menu_items 
      SET ${stockField} = ?, updated_at = ?
      WHERE id = ?
    `).run(newStock, nowLocal, menuItem.id);

    // Insert stock_logs with clear unit conversion info
    const logReason = isReverse ? 'adjustment' : 'restock';
    const formulaStr = multiplier > 1 ? ` (${qty} ${ckItem.unit || 'หน่วย'} x ${multiplier} = ${convertedQty} ${menuItem.unit || 'ชิ้น'})` : '';
    const logNote = isReverse 
      ? `ปรับลดคืนวัตถุดิบครัวกลาง ใบเบิก #${transferNo} (${ckItem.name})${formulaStr} โดย ${userName}`
      : `เติมสต็อกวัตถุดิบอัตโนมัติจากครัวกลาง ใบเบิก #${transferNo} (${ckItem.name})${formulaStr} โดย ${userName}`;

    await db.prepare(`
      INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(branchId, menuItem.id, changeQty, currentStock, newStock, logReason, logNote, nowLocal);

    return {
      synced: true,
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      stockField,
      changeQty,
      newStock,
      multiplier,
      convertedQty
    };
  } catch (err) {
    console.warn(`⚠️ syncRestockToBranchMenu error for item ${ckItem?.name}:`, err.message);
    return { synced: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────
// 1. ITEMS & POS MENUS (สินค้า/วัตถุดิบ/บรรจุภัณฑ์/อุปกรณ์ในครัวกลาง)
// ─────────────────────────────────────────────────────────────

// GET /api/central-kitchen/pos-menus — ดึงรายชื่อเมนู POS ทั้งหมดที่เปิดใช้งาน สำหรับผูกเติมสต็อก
router.get('/pos-menus', async (req, res) => {
  try {
    const db = getDb();
    const items = await db.prepare(`
      SELECT 
        mi.id, mi.name, 
        COALESCE(c.name, 'ทั่วไป') as category_name,
        mi.raw_quantity, mi.quantity
      FROM menu_items mi
      LEFT JOIN categories c ON c.id = mi.category_id
      WHERE mi.active = 1
      ORDER BY c.sort_order ASC, c.name ASC, mi.sort_order ASC, mi.name ASC
    `).all();

    const distinctMap = new Map();
    for (const item of items) {
      if (!distinctMap.has(item.name)) {
        distinctMap.set(item.name, {
          name: item.name,
          category_name: item.category_name,
          has_raw_stock: item.raw_quantity !== null,
          has_ready_stock: item.quantity !== null
        });
      }
    }

    res.json({
      success: true,
      data: Array.from(distinctMap.values())
    });
  } catch (error) {
    console.error('❌ Error fetching POS menu items:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

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
    const { name, category, unit, cost_price, quantity, min_stock_alert, image_url, linked_menu_item_name, target_stock_type, pack_size } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุชื่อสินค้า/วัตถุดิบ' });
    }

    const price = Number(cost_price) || 0;
    const initialQty = Number(quantity) || 0;
    const minAlert = Number(min_stock_alert) || 10;
    const itemUnit = unit ? unit.trim() : 'ชิ้น';
    const itemCat = category || 'general';
    const linkedMenu = linked_menu_item_name && linked_menu_item_name.trim() ? linked_menu_item_name.trim() : null;
    const stockType = target_stock_type === 'ready' ? 'ready' : 'raw';
    const packMultiplier = Number(pack_size) > 0 ? Number(pack_size) : 1;
    const nowLocal = getThaiNow();

    const insertResult = await db.prepare(`
      INSERT INTO central_kitchen_items (name, category, unit, cost_price, quantity, min_stock_alert, image_url, linked_menu_item_name, target_stock_type, pack_size, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(name.trim(), itemCat, itemUnit, price, initialQty, minAlert, image_url || null, linkedMenu, stockType, packMultiplier, nowLocal, nowLocal);

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
    const { name, category, unit, cost_price, min_stock_alert, image_url, active, linked_menu_item_name, target_stock_type, pack_size } = req.body;

    const existing = await db.prepare('SELECT id FROM central_kitchen_items WHERE id = ?').get(itemId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'ไม่พบสินค้านี้ในครัวกลาง' });
    }

    const hasLinkedMenuParam = linked_menu_item_name !== undefined;
    const cleanLinkedMenu = hasLinkedMenuParam 
      ? (linked_menu_item_name && linked_menu_item_name.trim() ? linked_menu_item_name.trim() : null)
      : null;

    const nowLocal = getThaiNow();
    await db.prepare(`
      UPDATE central_kitchen_items 
      SET name = COALESCE(?, name),
          category = COALESCE(?, category),
          unit = COALESCE(?, unit),
          cost_price = COALESCE(?, cost_price),
          min_stock_alert = COALESCE(?, min_stock_alert),
          image_url = COALESCE(?, image_url),
          linked_menu_item_name = CASE WHEN ? = 1 THEN ? ELSE linked_menu_item_name END,
          target_stock_type = COALESCE(?, target_stock_type),
          pack_size = COALESCE(?, pack_size),
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
      hasLinkedMenuParam ? 1 : 0,
      cleanLinkedMenu,
      target_stock_type !== undefined ? (target_stock_type === 'ready' ? 'ready' : 'raw') : null,
      pack_size !== undefined ? (Number(pack_size) > 0 ? Number(pack_size) : 1) : null,
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

// DELETE /api/central-kitchen/items/:id — ลบสินค้าออกจากแคตตาล็อกครัวกลาง
router.delete('/items/:id', requireManagerOrAdmin, async (req, res) => {
  try {
    const db = getDb();
    const itemId = req.params.id;

    const existing = await db.prepare('SELECT * FROM central_kitchen_items WHERE id = ?').get(itemId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'ไม่พบสินค้านี้ในครัวกลาง' });
    }

    // Check if referenced in transfers
    const transferRef = await db.prepare('SELECT COUNT(*) as count FROM central_kitchen_transfer_items WHERE item_id = ?').get(itemId);

    if (transferRef && transferRef.count > 0) {
      // Soft-delete to preserve transfer history
      const nowLocal = getThaiNow();
      await db.prepare('UPDATE central_kitchen_items SET active = 0, updated_at = ? WHERE id = ?').run(nowLocal, itemId);
      return res.json({
        success: true,
        message: `ลบสินค้า "${existing.name}" ออกจากแคตตาล็อกเรียบร้อยแล้ว (ซ่อนจากระบบเนื่องจากมีประวัติการเบิก)`
      });
    }

    // No transfer history: clean up item restock/waste logs and delete the item
    await db.prepare('DELETE FROM central_kitchen_restock_logs WHERE item_id = ?').run(itemId);
    await db.prepare('DELETE FROM central_kitchen_waste_logs WHERE item_id = ?').run(itemId);
    await db.prepare('DELETE FROM central_kitchen_items WHERE id = ?').run(itemId);

    res.json({
      success: true,
      message: `ลบสินค้า "${existing.name}" ออกจากแคตตาล็อกเรียบร้อยแล้ว`
    });
  } catch (error) {
    console.error('❌ Error deleting central kitchen item:', error);
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
        quantity: qty,
        pack_size: dbItem.pack_size || 1
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

    // 2. Insert items with pack_size snapshot
    for (const item of itemsToInsert) {
      await db.prepare(`
        INSERT INTO central_kitchen_transfer_items (transfer_id, item_id, item_name, unit, cost_price, quantity, pack_size)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(transferId, item.item_id, item.item_name, item.unit, item.cost_price, item.quantity, item.pack_size);
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

// PUT /api/central-kitchen/transfers/:id/dispatch — ครัวกลางกดยืนยันจ่ายของ (ตัดสต็อกครัวกลาง + หัก Expense สาขาทันที + เติมสต็อก POS สาขาอัตโนมัติ)
router.put('/transfers/:id/dispatch', requireManagerOrAdmin, async (req, res) => {
  try {
    const db = getDb();
    const transferId = req.params.id;

    const transfer = await db.prepare('SELECT * FROM central_kitchen_transfers WHERE id = ?').get(transferId);
    if (!transfer) {
      return res.status(404).json({ success: false, error: 'ไม่พบใบเบิกนี้' });
    }
    if (transfer.status !== 'pending') {
      return res.status(400).json({ success: false, error: `สถานะใบเบิกคือ ${transfer.status} ไม่สามารถกดอนุมัติได้` });
    }

    const transferItems = await db.prepare('SELECT * FROM central_kitchen_transfer_items WHERE transfer_id = ?').all(transferId);
    const nowLocal = getThaiNow();
    const todayDate = getThaiToday();

    // 1. Deduct stock in central kitchen & save original_quantity
    const statements = [];
    for (const item of transferItems) {
      statements.push({
        sql: `UPDATE central_kitchen_items SET quantity = MAX(0, quantity - ?), updated_at = ? WHERE id = ?`,
        args: [item.quantity, nowLocal, item.item_id]
      });
      statements.push({
        sql: `UPDATE central_kitchen_transfer_items SET original_quantity = COALESCE(original_quantity, quantity) WHERE id = ?`,
        args: [item.id]
      });
    }
    await db.batch(statements);

    // 2. Create Auto Expense for the receiving branch immediately
    let insertedExpenseId = null;
    if (transfer.total_cost > 0) {
      const typeLabel = transfer.dispatch_type === 'push' ? 'ครัวกลางจ่ายให้' : 'สาขาขอเบิก';
      const expenseNote = `เบิกของจากครัวกลาง [${typeLabel}] ใบเบิก #${transfer.transfer_no}${transfer.notes ? ` (${transfer.notes})` : ''}`;
      
      const insertExpenseRes = await db.prepare(`
        INSERT INTO expenses (branch_id, staff_id, amount, category, note, expense_date, payment_method, status, created_at)
        VALUES (?, ?, ?, 'raw_materials', ?, ?, 'transfer', 'completed', ?)
      `).run(transfer.branch_id, req.user.id, transfer.total_cost, expenseNote, todayDate, nowLocal);

      insertedExpenseId = insertExpenseRes.lastInsertRowid;
    }

    // 3. Auto-sync restock to branch POS menu items (for raw materials or linked items)
    const restockedItems = [];
    for (const item of transferItems) {
      const ckItem = await db.prepare('SELECT * FROM central_kitchen_items WHERE id = ?').get(item.item_id);
      if (ckItem) {
        const syncRes = await syncRestockToBranchMenu(db, transfer.branch_id, ckItem, item.quantity, transfer.transfer_no, req.user.name, false, item.pack_size);
        if (syncRes.synced) {
          restockedItems.push(syncRes);
        }
      }
    }

    // 4. Update transfer status directly to received (completed!)
    await db.prepare(`
      UPDATE central_kitchen_transfers 
      SET status = 'received', dispatched_by_name = ?, dispatched_at = ?, received_at = ?, expense_id = ?
      WHERE id = ?
    `).run(req.user.name, nowLocal, nowLocal, insertedExpenseId, transferId);

    res.json({
      success: true,
      message: `อนุมัติคำขอเบิก #${transfer.transfer_no} เรียบร้อยแล้ว (ตัดสต็อกครัวกลาง, บันทึกต้นทุนเข้าสาขา ฿${transfer.total_cost.toLocaleString()} และเติมสต็อก POS สำเร็จ)`,
      data: {
        expense_id: insertedExpenseId,
        restocked_items: restockedItems
      }
    });
  } catch (error) {
    console.error('❌ Error dispatching transfer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/central-kitchen/transfers/direct-dispatch — ครัวกลางจ่ายของให้สาขาโดยตรง (Push Model: 1 คลิกจบ)
router.post('/transfers/direct-dispatch', requireManagerOrAdmin, async (req, res) => {
  try {
    const db = getDb();
    const { branch_id, items, notes } = req.body;

    const targetBranchId = Number(branch_id);
    if (!targetBranchId) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุสาขาปลายทางที่ต้องการจ่ายของให้' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'กรุณาเลือกรายการสินค้าที่ต้องการจ่ายให้สาขา' });
    }

    // Generate Transfer Number: REQ-YYYYMMDD-XXXX
    const dateStr = getThaiToday().replace(/-/g, '');
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const transferNo = `REQ-${dateStr}-${randNum}`;

    let totalCost = 0;
    const itemsToInsert = [];

    // Verify stock and calculate costs
    for (const it of items) {
      const dbItem = await db.prepare('SELECT * FROM central_kitchen_items WHERE id = ?').get(it.item_id);
      if (!dbItem) continue;

      const qty = Number(it.quantity) || 0;
      if (qty <= 0) continue;

      const cost = Number(dbItem.cost_price) || 0;
      totalCost += qty * cost;

      itemsToInsert.push({
        item_id: dbItem.id,
        item_name: dbItem.name,
        unit: dbItem.unit,
        cost_price: cost,
        quantity: qty,
        pack_size: dbItem.pack_size || 1
      });
    }

    if (itemsToInsert.length === 0) {
      return res.status(400).json({ success: false, error: 'ไม่พบรายการสินค้าหรือจำนวนที่ถูกต้อง (> 0)' });
    }

    const nowLocal = getThaiNow();
    const todayDate = getThaiToday();

    // 1. Create Auto Expense for branch
    let insertedExpenseId = null;
    if (totalCost > 0) {
      const expenseNote = `เบิกของจากครัวกลาง [ครัวกลางจ่ายให้ โดย ${req.user.name}] ใบเบิก #${transferNo}${notes ? ` (${notes})` : ''}`;
      const insertExpenseRes = await db.prepare(`
        INSERT INTO expenses (branch_id, staff_id, amount, category, note, expense_date, payment_method, status, created_at)
        VALUES (?, ?, ?, 'raw_materials', ?, ?, 'transfer', 'completed', ?)
      `).run(targetBranchId, req.user.id, totalCost, expenseNote, todayDate, nowLocal);
      insertedExpenseId = insertExpenseRes.lastInsertRowid;
    }

    // 2. Insert master transfer record with dispatch_type = 'push' and status = 'received'
    const insertTransfer = await db.prepare(`
      INSERT INTO central_kitchen_transfers (
        transfer_no, branch_id, requested_by_user_id, requested_by_name,
        dispatch_type, status, total_cost, expense_id, notes,
        dispatched_by_name, created_at, dispatched_at, received_at
      ) VALUES (?, ?, ?, ?, 'push', 'received', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      transferNo, targetBranchId, req.user.id, req.user.name,
      totalCost, insertedExpenseId, notes || null,
      req.user.name, nowLocal, nowLocal, nowLocal
    );

    const transferId = insertTransfer.lastInsertRowid;

    // 3. Deduct stock in central kitchen & insert transfer items
    const restockedItems = [];
    for (const item of itemsToInsert) {
      // Insert item record
      await db.prepare(`
        INSERT INTO central_kitchen_transfer_items (transfer_id, item_id, item_name, unit, cost_price, quantity, original_quantity, pack_size)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(transferId, item.item_id, item.item_name, item.unit, item.cost_price, item.quantity, item.quantity, item.pack_size);

      // Deduct CK stock
      await db.prepare(`
        UPDATE central_kitchen_items SET quantity = MAX(0, quantity - ?), updated_at = ? WHERE id = ?
      `).run(item.quantity, nowLocal, item.item_id);

      // Auto-sync to branch POS menu items
      const ckItem = await db.prepare('SELECT * FROM central_kitchen_items WHERE id = ?').get(item.item_id);
      if (ckItem) {
        const syncRes = await syncRestockToBranchMenu(db, targetBranchId, ckItem, item.quantity, transferNo, req.user.name, false, item.pack_size);
        if (syncRes.synced) restockedItems.push(syncRes);
      }
    }

    res.status(201).json({
      success: true,
      message: `บันทึกจ่ายของให้สาขาเรียบร้อยแล้ว (ใบเบิก #${transferNo}, หักต้นทุนสาขา ฿${totalCost.toLocaleString()})`,
      data: {
        id: transferId,
        transfer_no: transferNo,
        total_cost: totalCost,
        expense_id: insertedExpenseId,
        restocked_items: restockedItems
      }
    });
  } catch (error) {
    console.error('❌ Error creating direct dispatch:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/central-kitchen/transfers/:id/items/:item_id/adjust — ปรับยอดยกเลิกสินค้าบางรายการ / แจ้งของชำรุด (Partial Adjustment)
router.put('/transfers/:id/items/:item_id/adjust', requireManagerOrAdmin, async (req, res) => {
  try {
    const db = getDb();
    const transferId = Number(req.params.id);
    const transferItemId = Number(req.params.item_id);
    const { new_quantity, waste_action, waste_note } = req.body;

    const transfer = await db.prepare('SELECT * FROM central_kitchen_transfers WHERE id = ?').get(transferId);
    if (!transfer) {
      return res.status(404).json({ success: false, error: 'ไม่พบใบเบิกนี้' });
    }
    if (transfer.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'ใบเบิกนี้ถูกยกเลิกไปแล้ว ไม่สามารถปรับปรุงยอดได้' });
    }

    const tItem = await db.prepare('SELECT * FROM central_kitchen_transfer_items WHERE id = ? AND transfer_id = ?').get(transferItemId, transferId);
    if (!tItem) {
      return res.status(404).json({ success: false, error: 'ไม่พบรายการสินค้านี้ในใบเบิก' });
    }

    const newQty = Number(new_quantity);
    if (isNaN(newQty) || newQty < 0) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุจำนวนใหม่ที่ถูกต้อง (>= 0)' });
    }

    if (newQty >= Number(tItem.quantity)) {
      return res.status(400).json({ success: false, error: `จำนวนใหม่ (${newQty}) ต้องน้อยกว่าจำนวนปัจจุบัน (${tItem.quantity})` });
    }

    const diffQty = Number(tItem.quantity) - newQty;
    const unitPrice = Number(tItem.cost_price) || 0;
    const refundCost = diffQty * unitPrice;
    const nowLocal = getThaiNow();

    // 1. Update transfer item quantity & retain original_quantity
    await db.prepare(`
      UPDATE central_kitchen_transfer_items 
      SET original_quantity = COALESCE(original_quantity, quantity),
          quantity = ?
      WHERE id = ?
    `).run(newQty, transferItemId);

    // 2. Update transfer total_cost
    const newTransferTotalCost = Math.max(0, Number(transfer.total_cost) - refundCost);
    await db.prepare(`
      UPDATE central_kitchen_transfers 
      SET total_cost = ?
      WHERE id = ?
    `).run(newTransferTotalCost, transferId);

    // 3. Update branch Expense if linked
    if (transfer.expense_id && refundCost > 0) {
      const adjNote = ` [ปรับลดยอดของชำรุด/คืนของ: ${tItem.item_name} -${diffQty} ${tItem.unit}]`;
      await db.prepare(`
        UPDATE expenses 
        SET amount = MAX(0, amount - ?),
            note = COALESCE(note, '') || ?
        WHERE id = ?
      `).run(refundCost, adjNote, transfer.expense_id);
    }

    // 4. Handle stock difference (return to CK stock or record as waste)
    if (waste_action === 'log_as_waste') {
      const reasonText = waste_note && waste_note.trim() ? waste_note.trim() : 'ของชำรุด/ส่งคืนจากสาขา';
      await db.prepare(`
        INSERT INTO central_kitchen_waste_logs (item_id, quantity, unit_cost, total_cost, reason, created_by_name, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(tItem.item_id, diffQty, unitPrice, refundCost, reasonText, req.user.name, nowLocal);
    } else {
      // Default: Return to central kitchen stock
      await db.prepare(`
        UPDATE central_kitchen_items SET quantity = quantity + ?, updated_at = ? WHERE id = ?
      `).run(diffQty, nowLocal, tItem.item_id);
    }

    // 5. Reverse branch POS restock if linked
    const ckItem = await db.prepare('SELECT * FROM central_kitchen_items WHERE id = ?').get(tItem.item_id);
    if (ckItem) {
      await syncRestockToBranchMenu(db, transfer.branch_id, ckItem, diffQty, transfer.transfer_no, req.user.name, true, tItem.pack_size);
    }

    res.json({
      success: true,
      message: `ปรับยอดยกเลิก ${tItem.item_name} จำนวน ${diffQty} ${tItem.unit} เรียบร้อยแล้ว (ลดต้นทุนสาขา ฿${refundCost.toLocaleString()})`,
      data: {
        item_id: transferItemId,
        previous_quantity: tItem.quantity,
        new_quantity: newQty,
        refund_amount: refundCost,
        new_transfer_total_cost: newTransferTotalCost
      }
    });
  } catch (error) {
    console.error('❌ Error adjusting transfer item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/central-kitchen/transfers/:id/cancel — ยกเลิกใบเบิกทั้งใบ (Rollback ทุกอย่าง: สต็อกครัวกลาง, Expense สาขา, สต็อก POS สาขา)
router.put('/transfers/:id/cancel', requireManagerOrAdmin, async (req, res) => {
  try {
    const db = getDb();
    const transferId = req.params.id;

    const transfer = await db.prepare('SELECT * FROM central_kitchen_transfers WHERE id = ?').get(transferId);
    if (!transfer) {
      return res.status(404).json({ success: false, error: 'ไม่พบใบเบิกนี้' });
    }
    if (transfer.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'ใบเบิกนี้ถูกยกเลิกไปแล้ว' });
    }

    const transferItems = await db.prepare('SELECT * FROM central_kitchen_transfer_items WHERE transfer_id = ?').all(transferId);
    const nowLocal = getThaiNow();

    // 1. If items were already deducted (dispatched or received), restore stock to CK
    if (transfer.status === 'dispatched' || transfer.status === 'received') {
      for (const item of transferItems) {
        await db.prepare(`
          UPDATE central_kitchen_items SET quantity = quantity + ?, updated_at = ? WHERE id = ?
        `).run(item.quantity, nowLocal, item.item_id);

        // Reverse branch POS restock
        const ckItem = await db.prepare('SELECT * FROM central_kitchen_items WHERE id = ?').get(item.item_id);
        if (ckItem) {
          await syncRestockToBranchMenu(db, transfer.branch_id, ckItem, item.quantity, transfer.transfer_no, req.user.name, true, item.pack_size);
        }
      }
    }

    // 2. Cancel linked Expense if any
    if (transfer.expense_id) {
      await db.prepare(`
        UPDATE expenses 
        SET status = 'cancelled', note = COALESCE(note, '') || ' [ยกเลิกตามใบเบิกครัวกลาง]'
        WHERE id = ?
      `).run(transfer.expense_id);
    }

    // 3. Mark transfer as cancelled
    await db.prepare(`
      UPDATE central_kitchen_transfers 
      SET status = 'cancelled', notes = COALESCE(notes, '') || ?
      WHERE id = ?
    `).run(` [ยกเลิกใบเบิกโดย ${req.user.name}]`, transferId);

    res.json({
      success: true,
      message: `ยกเลิกใบเบิก #${transfer.transfer_no} และคืนสต็อกทั้งหมดเรียบร้อยแล้ว`
    });
  } catch (error) {
    console.error('❌ Error cancelling transfer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/central-kitchen/transfers/:id/receive — สาขากดยืนยันรับของ (Fallback รองรับกรณีใบเบิกเก่าที่ยังค้าง dispatched)
router.put('/transfers/:id/receive', async (req, res) => {
  try {
    const db = getDb();
    const transferId = req.params.id;

    const transfer = await db.prepare('SELECT * FROM central_kitchen_transfers WHERE id = ?').get(transferId);
    if (!transfer) {
      return res.status(404).json({ success: false, error: 'ไม่พบใบเบิกนี้' });
    }
    if (transfer.status !== 'dispatched') {
      return res.status(400).json({ success: false, error: 'ใบเบิกนี้ไม่ได้อยู่ในสถานะกำลังส่ง' });
    }

    const nowLocal = getThaiNow();
    const todayDate = getThaiToday();

    // 1. Create Auto Expense for the receiving branch
    let insertedExpenseId = null;
    if (transfer.total_cost > 0) {
      const typeLabel = transfer.dispatch_type === 'push' ? 'ครัวกลางจ่ายให้' : 'สาขาขอเบิก';
      const expenseNote = `เบิกของจากครัวกลาง [${typeLabel}] ใบเบิก #${transfer.transfer_no}${transfer.notes ? ` (${transfer.notes})` : ''}`;
      
      const insertExpenseRes = await db.prepare(`
        INSERT INTO expenses (branch_id, staff_id, amount, category, note, expense_date, payment_method, status, created_at)
        VALUES (?, ?, ?, 'raw_materials', ?, ?, 'transfer', 'completed', ?)
      `).run(transfer.branch_id, req.user.id, transfer.total_cost, expenseNote, todayDate, nowLocal);

      insertedExpenseId = insertExpenseRes.lastInsertRowid;
    }

    // 2. Sync restock to branch
    const transferItems = await db.prepare('SELECT * FROM central_kitchen_transfer_items WHERE transfer_id = ?').all(transferId);
    for (const item of transferItems) {
      const ckItem = await db.prepare('SELECT * FROM central_kitchen_items WHERE id = ?').get(item.item_id);
      if (ckItem) {
        await syncRestockToBranchMenu(db, transfer.branch_id, ckItem, item.quantity, transfer.transfer_no, req.user.name, false, item.pack_size);
      }
    }

    // 3. Update transfer status to received
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

    const branch = await db.prepare('SELECT id, name FROM branches WHERE id = ?').get(branch_id);
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

    // 7. Check existing dividend payouts for this branch
    const existingPayouts = await db.prepare(`
      SELECT *, payout_amount as amount, paid_at as created_at
      FROM branch_dividend_payouts
      WHERE branch_id = ?
      ORDER BY id DESC LIMIT 50
    `).all(branch_id);

    res.json({
      success: true,
      data: {
        branch_id: Number(branch_id),
        branch_name: branch?.name || '',
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

    // 7. Total waste loss accumulated
    const wasteRes = await db.prepare(`
      SELECT COALESCE(SUM(total_cost), 0) as total_waste_cost, COUNT(id) as total_waste_count
      FROM central_kitchen_waste_logs
    `).get();
    const totalWasteCost = Number(wasteRes?.total_waste_cost || 0);
    const totalWasteCount = Number(wasteRes?.total_waste_count || 0);

    res.json({
      success: true,
      data: {
        cash_balance: cashBalance,
        inventory_value: inventoryValue,
        pending_receivables: pendingReceivables,
        total_capital: totalCapital,
        total_reimbursed: totalReimbursed,
        total_purchases: totalPurchases,
        total_operating_expenses: totalOperatingExpenses,
        total_waste_cost: totalWasteCost,
        total_waste_count: totalWasteCount
      }
    });
  } catch (error) {
    console.error('❌ Error fetching central kitchen finances summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/central-kitchen/finances/receivables-breakdown — รายละเอียดของที่สาขาเบิกและยอดค้างชำระคืนแยกตามสาขา
router.get('/finances/receivables-breakdown', async (req, res) => {
  try {
    const db = getDb();
    
    // 1. ดึงใบเบิกทั้งหมดที่สถานะ received (รับของแล้ว) และยังไม่เคลียร์เงิน (is_reimbursed = 0)
    const transfers = await db.prepare(`
      SELECT 
        t.id,
        t.transfer_no,
        t.branch_id,
        b.name as branch_name,
        t.total_cost,
        t.notes,
        t.status,
        t.created_at,
        t.dispatched_at,
        t.received_at,
        t.dispatched_by_name,
        t.requested_by_name
      FROM central_kitchen_transfers t
      JOIN branches b ON t.branch_id = b.id
      WHERE t.status = 'received' AND (t.is_reimbursed = 0 OR t.is_reimbursed IS NULL)
      ORDER BY t.received_at DESC, t.id DESC
    `).all();

    if (transfers.length === 0) {
      return res.json({
        success: true,
        data: {
          total_pending_amount: 0,
          total_transfers_count: 0,
          branches: []
        }
      });
    }

    // 2. ดึงรายการสินค้าทั้งหมดของใบเบิกเหล่านี้
    const transferIds = transfers.map(t => t.id);
    const placeholders = transferIds.map(() => '?').join(',');
    const items = await db.prepare(`
      SELECT 
        id,
        transfer_id,
        item_id,
        item_name,
        unit,
        cost_price,
        quantity,
        (quantity * cost_price) as subtotal
      FROM central_kitchen_transfer_items
      WHERE transfer_id IN (${placeholders})
      ORDER BY id ASC
    `).all(...transferIds);

    const itemsByTransfer = {};
    for (const item of items) {
      if (!itemsByTransfer[item.transfer_id]) itemsByTransfer[item.transfer_id] = [];
      itemsByTransfer[item.transfer_id].push(item);
    }

    for (const t of transfers) {
      t.items = itemsByTransfer[t.id] || [];
    }

    // 3. จัดกลุ่มตามสาขา และสรุปยอดของที่สาขาเบิกไป
    const branchMap = {};
    let totalPendingAll = 0;

    for (const t of transfers) {
      totalPendingAll += Number(t.total_cost || 0);
      if (!branchMap[t.branch_id]) {
        branchMap[t.branch_id] = {
          branch_id: t.branch_id,
          branch_name: t.branch_name,
          total_pending_amount: 0,
          transfers_count: 0,
          transfers: [],
          consolidated_items_map: {}
        };
      }
      const bObj = branchMap[t.branch_id];
      bObj.total_pending_amount += Number(t.total_cost || 0);
      bObj.transfers_count += 1;
      bObj.transfers.push(t);

      for (const it of t.items) {
        const key = `${it.item_id}_${it.unit}`;
        if (!bObj.consolidated_items_map[key]) {
          bObj.consolidated_items_map[key] = {
            item_id: it.item_id,
            item_name: it.item_name,
            unit: it.unit,
            cost_price: it.cost_price,
            total_quantity: 0,
            total_cost: 0
          };
        }
        bObj.consolidated_items_map[key].total_quantity += Number(it.quantity || 0);
        bObj.consolidated_items_map[key].total_cost += Number(it.subtotal || 0);
      }
    }

    const branches = Object.values(branchMap).map(b => ({
      branch_id: b.branch_id,
      branch_name: b.branch_name,
      total_pending_amount: Number(b.total_pending_amount.toFixed(2)),
      transfers_count: b.transfers_count,
      consolidated_items: Object.values(b.consolidated_items_map).sort((a, b) => b.total_cost - a.total_cost),
      transfers: b.transfers
    })).sort((a, b) => b.total_pending_amount - a.total_pending_amount);

    res.json({
      success: true,
      data: {
        total_pending_amount: Number(totalPendingAll.toFixed(2)),
        total_transfers_count: transfers.length,
        branches
      }
    });
  } catch (error) {
    console.error('❌ Error fetching receivables breakdown:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/central-kitchen/finances/logs — ประวัติรายการเดินบัญชีกองกลาง (รวมบันทึกของเสีย)
router.get('/finances/logs', async (req, res) => {
  try {
    const db = getDb();
    const { type, limit } = req.query;

    let sql;
    const params = [];
    const limitNum = Number(limit) || 100;

    if (type === 'waste_loss') {
      sql = `
        SELECT 
          w.id,
          'waste_loss' as type,
          w.total_cost as amount,
          'stock' as payment_method,
          printf('ตัดของเสีย: %s (%.1f %s) - %s', i.name, w.quantity, i.unit, w.reason) as note,
          w.created_by_name,
          w.created_at,
          NULL as branch_id,
          'คลังครัวกลาง' as branch_name
        FROM central_kitchen_waste_logs w
        JOIN central_kitchen_items i ON w.item_id = i.id
        ORDER BY w.id DESC LIMIT ?
      `;
      params.push(limitNum);
    } else if (type && type !== 'all') {
      sql = `
        SELECT f.*, b.name as branch_name
        FROM central_kitchen_finances f
        LEFT JOIN branches b ON f.branch_id = b.id
        WHERE f.type = ?
        ORDER BY f.id DESC LIMIT ?
      `;
      params.push(type, limitNum);
    } else {
      // type === 'all'
      sql = `
        SELECT * FROM (
          SELECT 
            f.id,
            f.type,
            f.amount,
            f.payment_method,
            f.note,
            f.created_by_name,
            f.created_at,
            f.branch_id,
            b.name as branch_name
          FROM central_kitchen_finances f
          LEFT JOIN branches b ON f.branch_id = b.id

          UNION ALL

          SELECT 
            w.id,
            'waste_loss' as type,
            w.total_cost as amount,
            'stock' as payment_method,
            printf('ตัดของเสีย: %s (%.1f %s) - %s', i.name, w.quantity, i.unit, w.reason) as note,
            w.created_by_name,
            w.created_at,
            NULL as branch_id,
            'คลังครัวกลาง' as branch_name
          FROM central_kitchen_waste_logs w
          JOIN central_kitchen_items i ON w.item_id = i.id
        ) combined
        ORDER BY created_at DESC LIMIT ?
      `;
      params.push(limitNum);
    }

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

    let payoutItems = [];
    if (Array.isArray(distributions) && distributions.length > 0) {
      payoutItems = distributions.map(d => ({
        partner_id: d.id || d.partner_id || null,
        partner_name: d.name || d.partner_name,
        share_percentage: Number(d.share_percentage) || 0,
        payout_amount: Number(d.payout_amount !== undefined ? d.payout_amount : d.amount) || 0
      }));
    } else if (req.body.partner_name && (req.body.amount !== undefined || req.body.payout_amount !== undefined)) {
      payoutItems = [{
        partner_id: req.body.partner_id || null,
        partner_name: req.body.partner_name,
        share_percentage: Number(req.body.share_percentage) || 0,
        payout_amount: Number(req.body.amount !== undefined ? req.body.amount : req.body.payout_amount) || 0
      }];
    }

    const bId = Number(branch_id);
    if (!bId || payoutItems.length === 0 || payoutItems.some(item => !item.partner_name || item.payout_amount <= 0)) {
      return res.status(400).json({ success: false, error: 'ข้อมูลการจ่ายปันผลไม่ถูกต้อง (กรุณาระบุสาขา ผู้รับ และยอดเงิน)' });
    }

    const startDate = start_date || `${getThaiToday().substring(0, 7)}-01`;
    const endDate = end_date || getThaiToday();
    const netProfitVal = Number(net_profit) || 0;
    const nowLocal = getThaiNow();
    const paidByName = req.user?.name || 'ผู้จัดการ';
    const payoutNote = note || req.body.note || 'จ่ายเงินปันผลประจำงวด';

    const statements = [];

    for (const d of payoutItems) {
      statements.push({
        sql: `INSERT INTO branch_dividend_payouts (
                branch_id, period_start, period_end, partner_id, partner_name, 
                share_percentage, payout_amount, net_profit, paid_by_name, payment_method, note, paid_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          bId,
          startDate,
          endDate,
          d.partner_id,
          d.partner_name,
          d.share_percentage,
          d.payout_amount,
          netProfitVal,
          paidByName,
          'transfer',
          payoutNote,
          nowLocal
        ]
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
