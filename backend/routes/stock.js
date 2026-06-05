const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { attachUser, requireAuth } = require('../middleware/auth');

// ใช้ middleware ตรวจสอบผู้ใช้ทุก route
router.use(attachUser);

// ─── GET / — รายการสินค้าพร้อมข้อมูลสต็อกแยกสาขา ──────────────
router.get('/', async (req, res) => {
  try {
    const db = getDb();

    // หาสาขาของผู้ใช้
    let branchId = req.user ? req.user.branch_id : null;
    if (!branchId) {
      const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
      branchId = defaultBranch ? defaultBranch.id : null;
    }

    // อ่านเกณฑ์สต็อกต่ำจาก settings
    const thresholdSetting = await db.prepare(
      "SELECT value FROM settings WHERE key = 'low_stock_threshold'"
    ).get();
    const threshold = thresholdSetting ? parseInt(thresholdSetting.value) || 5 : 5;

    const items = await db.prepare(`
      SELECT 
        mi.id, mi.name, mi.price, mi.category_id, mi.active,
        c.name as category_name,
        bs.quantity as stock,
        bs.raw_quantity as raw_stock
      FROM menu_items mi
      LEFT JOIN categories c ON c.id = mi.category_id
      LEFT JOIN branch_stocks bs ON bs.menu_item_id = mi.id AND bs.branch_id = ?
      ORDER BY mi.sort_order ASC, mi.id ASC
    `).all(branchId);

    // เพิ่ม flag low_stock
    const itemsWithFlag = items.map(item => ({
      ...item,
      low_stock: item.stock !== null && item.stock <= threshold,
      low_raw_stock: item.raw_stock !== null && item.raw_stock <= threshold
    }));

    res.json({
      success: true,
      data: {
        threshold,
        items: itemsWithFlag
      }
    });
  } catch (error) {
    console.error('❌ Get stock error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสต็อก'
    });
  }
});

// ─── POST /:id/restock — เติมสต็อกแยกสาขา ──────────────────────
router.post('/:id/restock', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, stock_type, note } = req.body;
    const db = getDb();

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุจำนวนที่ต้องการเติม (ต้องมากกว่า 0)'
      });
    }

    const item = await db.prepare('SELECT * FROM menu_items WHERE id = ?').get(Number(id));
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบเมนู'
      });
    }

    let branchId = req.user ? req.user.branch_id : null;
    if (!branchId) {
      const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
      branchId = defaultBranch ? defaultBranch.id : null;
    }

    const isRaw = stock_type === 'raw';

    // ดึงสต็อกปัจจุบันของสาขานี้
    const branchStock = await db.prepare(
      'SELECT quantity, raw_quantity FROM branch_stocks WHERE branch_id = ? AND menu_item_id = ?'
    ).get(branchId, Number(id));

    const restock = db.transaction(async () => {
      const prev = branchStock 
        ? (isRaw ? branchStock.raw_quantity : branchStock.quantity) 
        : null;
      const previousVal = prev !== null && prev !== undefined ? prev : 0;
      const newVal = previousVal + quantity;

      if (isRaw) {
        await db.prepare(`
          INSERT INTO branch_stocks (branch_id, menu_item_id, raw_quantity)
          VALUES (?, ?, ?)
          ON CONFLICT(branch_id, menu_item_id) DO UPDATE SET
            raw_quantity = excluded.raw_quantity,
            updated_at = datetime('now', 'localtime')
        `).run(branchId, Number(id), newVal);
      } else {
        await db.prepare(`
          INSERT INTO branch_stocks (branch_id, menu_item_id, quantity)
          VALUES (?, ?, ?)
          ON CONFLICT(branch_id, menu_item_id) DO UPDATE SET
            quantity = excluded.quantity,
            updated_at = datetime('now', 'localtime')
        `).run(branchId, Number(id), newVal);
      }

      // บันทึกประวัติ
      await db.prepare(`
        INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, staff_id, note)
        VALUES (?, ?, ?, ?, ?, 'restock', ?, ?)
      `).run(
        branchId,
        Number(id),
        quantity,
        prev,
        newVal,
        req.user.id,
        note || `เติมสต็อก${isRaw ? 'ของสด' : 'ของทอด'} ${item.name} +${quantity}`
      );

      return newVal;
    });

    const newStock = await restock();

    res.json({
      success: true,
      data: {
        id: item.id,
        name: item.name,
        stock: isRaw ? undefined : newStock,
        raw_stock: isRaw ? newStock : undefined
      }
    });
  } catch (error) {
    console.error('❌ Restock error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการเติมสต็อก'
    });
  }
});

// ─── POST /:id/adjust — ปรับสต็อกแยกสาขา (เพิ่ม/ลด) ──────────
router.post('/:id/adjust', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, reason, stock_type, note } = req.body;
    const db = getDb();

    if (quantity === undefined || quantity === null) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุจำนวนที่ต้องการปรับ'
      });
    }

    if (!reason || !['adjustment', 'waste', 'staff_benefit'].includes(reason)) {
      return res.status(400).json({
        success: false,
        error: "กรุณาระบุเหตุผล: 'adjustment', 'waste' หรือ 'staff_benefit'"
      });
    }

    const item = await db.prepare('SELECT * FROM menu_items WHERE id = ?').get(Number(id));
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบเมนู'
      });
    }

    let branchId = req.user ? req.user.branch_id : null;
    if (!branchId) {
      const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
      branchId = defaultBranch ? defaultBranch.id : null;
    }

    const isRaw = stock_type === 'raw';

    // ดึงสต็อกปัจจุบันของสาขานี้
    const branchStock = await db.prepare(
      'SELECT quantity, raw_quantity FROM branch_stocks WHERE branch_id = ? AND menu_item_id = ?'
    ).get(branchId, Number(id));

    const currentQty = branchStock 
      ? (isRaw ? branchStock.raw_quantity : branchStock.quantity) 
      : null;

    if (currentQty === null || currentQty === undefined) {
      return res.status(400).json({
        success: false,
        error: `เมนูนี้ไม่ได้ตั้งค่าติดตามสต็อก${isRaw ? 'ของสด' : 'ของทอด'}`
      });
    }

    const newVal = currentQty + quantity;
    if (newVal < 0) {
      return res.status(400).json({
        success: false,
        error: `สต็อกไม่เพียงพอ (มีอยู่ ${currentQty} ชิ้น)`
      });
    }

    const adjust = db.transaction(async () => {
      if (isRaw) {
        await db.prepare(`
          UPDATE branch_stocks 
          SET raw_quantity = ?, updated_at = datetime('now', 'localtime') 
          WHERE branch_id = ? AND menu_item_id = ?
        `).run(newVal, branchId, Number(id));
      } else {
        await db.prepare(`
          UPDATE branch_stocks 
          SET quantity = ?, updated_at = datetime('now', 'localtime') 
          WHERE branch_id = ? AND menu_item_id = ?
        `).run(newVal, branchId, Number(id));
      }

      await db.prepare(`
        INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, staff_id, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        branchId,
        Number(id),
        quantity,
        currentQty,
        newVal,
        reason,
        req.user.id,
        note || `ปรับสต็อก${isRaw ? 'ของสด' : 'ของทอด'} ${item.name} ${quantity >= 0 ? '+' : ''}${quantity} (${reason})`
      );

      // บันทึกกิจกรรมพนักงาน
      let actionLabel = isRaw ? 'adjust_raw_stock' : 'adjust_stock';
      if (reason === 'waste') actionLabel = isRaw ? 'record_raw_waste' : 'record_waste';
      else if (reason === 'staff_benefit') actionLabel = isRaw ? 'staff_raw_credit' : 'staff_credit';

      let detailsText = `ปรับปรุงสต็อก${isRaw ? 'ของสด' : 'ของทอด'} ${item.name} ${quantity >= 0 ? '+' : ''}${quantity} ชิ้น (ก่อนปรับ: ${currentQty}, หลังปรับ: ${newVal})`;
      if (reason === 'waste') {
        detailsText = `บันทึกของเสีย${isRaw ? 'ของสด' : ''} ${item.name} ${quantity} ชิ้น (${note || 'ไม่ระบุรายละเอียดเพิ่มเติม'})`;
      } else if (reason === 'staff_benefit') {
        detailsText = `บันทึกของกินพนักงาน/เครดิต${isRaw ? 'ของสด' : ''} ${item.name} ${quantity} ชิ้น (${note || 'แจกพนักงานรับประทาน'})`;
      }

      await db.prepare(`
        INSERT INTO activity_logs (branch_id, user_id, action, details)
        VALUES (?, ?, ?, ?)
      `).run(
        branchId,
        req.user.id,
        actionLabel,
        detailsText
      );

      return newVal;
    });

    const updatedStock = await adjust();

    res.json({
      success: true,
      data: {
        id: item.id,
        name: item.name,
        stock: isRaw ? undefined : updatedStock,
        raw_stock: isRaw ? updatedStock : undefined
      }
    });
  } catch (error) {
    console.error('❌ Adjust stock error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการปรับสต็อก'
    });
  }
});

// ─── POST /:id/fry — ทอดสินค้า (หักของสด -> เพิ่มของทอด) ──────────
router.post('/:id/fry', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, note } = req.body;
    const db = getDb();

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุจำนวนสินค้าที่ต้องการทอด (มากกว่า 0)'
      });
    }

    const item = await db.prepare('SELECT * FROM menu_items WHERE id = ?').get(Number(id));
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบเมนู'
      });
    }

    let branchId = req.user ? req.user.branch_id : null;
    if (!branchId) {
      const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
      branchId = defaultBranch ? defaultBranch.id : null;
    }

    // ดึงสต็อกปัจจุบัน
    const branchStock = await db.prepare(
      'SELECT quantity, raw_quantity FROM branch_stocks WHERE branch_id = ? AND menu_item_id = ?'
    ).get(branchId, Number(id));

    if (!branchStock || branchStock.raw_quantity === null || branchStock.quantity === null) {
      return res.status(400).json({
        success: false,
        error: 'สินค้าประเภทนี้ไม่ได้ติดตามสต็อกของสดหรือของทอด'
      });
    }

    if (branchStock.raw_quantity < quantity) {
      return res.status(400).json({
        success: false,
        error: `จำนวนของสดไม่เพียงพอที่จะทอด (มีของสดอยู่ ${branchStock.raw_quantity} ชิ้น)`
      });
    }

    const fryChicken = db.transaction(async () => {
      const newRawStock = branchStock.raw_quantity - quantity;
      const newCookedStock = branchStock.quantity + quantity;

      // 1. อัปเดตสต็อกใน branch_stocks
      await db.prepare(`
        UPDATE branch_stocks 
        SET raw_quantity = ?, quantity = ?, updated_at = datetime('now', 'localtime')
        WHERE branch_id = ? AND menu_item_id = ?
      `).run(newRawStock, newCookedStock, branchId, Number(id));

      // 2. บันทึก Stock logs (หักของสด)
      await db.prepare(`
        INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, staff_id, note)
        VALUES (?, ?, ?, ?, ?, 'adjustment', ?, ?)
      `).run(
        branchId,
        Number(id),
        -quantity,
        branchStock.raw_quantity,
        newRawStock,
        req.user.id,
        note || `หักวัตถุดิบของสดเพื่อนำไปทอด: ${quantity} ชิ้น`
      );

      // 3. บันทึก Stock logs (เพิ่มของทอด)
      await db.prepare(`
        INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, staff_id, note)
        VALUES (?, ?, ?, ?, ?, 'restock', ?, ?)
      `).run(
        branchId,
        Number(id),
        quantity,
        branchStock.quantity,
        newCookedStock,
        req.user.id,
        note || `ทอดสุกพร้อมขาย: +${quantity} ชิ้น`
      );

      // 4. บันทึกกิจกรรมพนักงาน
      await db.prepare(`
        INSERT INTO activity_logs (branch_id, user_id, action, details)
        VALUES (?, ?, ?, ?)
      `).run(
        branchId,
        req.user.id,
        'fry_chicken',
        `ทำการทอด ${item.name} จำนวน ${quantity} ชิ้น (ของสดคงเหลือ: ${newRawStock}, ของทอดพร้อมขายคงเหลือ: ${newCookedStock})`
      );

      return { rawStock: newRawStock, cookedStock: newCookedStock };
    });

    const result = await fryChicken();

    res.json({
      success: true,
      data: {
        id: item.id,
        name: item.name,
        raw_stock: result.rawStock,
        stock: result.cookedStock
      }
    });
  } catch (error) {
    console.error('❌ Fry item error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการทอดสินค้า'
    });
  }
});

// ─── GET /:id/logs — ประวัติการเปลี่ยนแปลงสต็อกแยกสาขา ────────
router.get('/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const db = getDb();

    // หาสาขาของผู้ใช้
    let branchId = req.user ? req.user.branch_id : null;
    if (!branchId) {
      const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
      branchId = defaultBranch ? defaultBranch.id : null;
    }

    // ตรวจสอบว่าเมนูมีอยู่
    const item = await db.prepare('SELECT id, name FROM menu_items WHERE id = ?').get(Number(id));
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบเมนู'
      });
    }

    const logs = await db.prepare(`
      SELECT sl.*, u.name as staff_name
      FROM stock_logs sl
      LEFT JOIN users u ON u.id = sl.staff_id
      WHERE sl.menu_item_id = ? AND sl.branch_id = ?
      ORDER BY sl.created_at DESC
      LIMIT ?
    `).all(Number(id), branchId, limit);

    res.json({
      success: true,
      data: {
        menu_item: item,
        logs
      }
    });
  } catch (error) {
    console.error('❌ Get stock logs error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงประวัติสต็อก'
    });
  }
});

// ─── POST /bulk-adjust — จัดการสต็อกด่วนแบบกลุ่ม ──────────────────────
router.post('/bulk-adjust', requireAuth, async (req, res) => {
  try {
    const { mode, items, reason_preset, note } = req.body;
    const db = getDb();

    if (!mode || !['relative', 'absolute'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุโหมดการปรับปรุง (relative หรือ absolute)'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุรายการสินค้าที่ต้องการปรับปรุง'
      });
    }

    let branchId = req.user ? req.user.branch_id : null;
    if (!branchId) {
      const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
      branchId = defaultBranch ? defaultBranch.id : null;
    }

    const isAdmin = req.user && req.user.role === 'admin';

    const bulkTransaction = db.transaction(async () => {
      for (const item of items) {
        const { menu_item_id } = item;
        if (!menu_item_id) continue;

        const branchStock = await db.prepare(
          'SELECT quantity, raw_quantity FROM branch_stocks WHERE branch_id = ? AND menu_item_id = ?'
        ).get(branchId, Number(menu_item_id));

        const currentCooked = branchStock ? (branchStock.quantity !== null && branchStock.quantity !== undefined ? branchStock.quantity : 0) : 0;
        const currentRaw = branchStock ? (branchStock.raw_quantity !== null && branchStock.raw_quantity !== undefined ? branchStock.raw_quantity : 0) : 0;

        const menuItem = await db.prepare('SELECT name FROM menu_items WHERE id = ?').get(Number(menu_item_id));
        if (!menuItem) continue;

        let deltaCooked = 0;
        let deltaRaw = 0;

        if (item.cooked !== undefined && item.cooked !== null && item.cooked !== '') {
          const val = Number(item.cooked);
          if (!isNaN(val)) {
            if (mode === 'relative') {
              deltaCooked = val;
            } else {
              deltaCooked = val - currentCooked;
            }
          }
        }

        if (item.raw !== undefined && item.raw !== null && item.raw !== '') {
          const val = Number(item.raw);
          if (!isNaN(val)) {
            if (mode === 'relative') {
              deltaRaw = val;
            } else {
              deltaRaw = val - currentRaw;
            }
          }
        }

        if (deltaCooked !== 0) {
          const newCooked = currentCooked + deltaCooked;
          if (newCooked < 0) {
            throw new Error(`STOCK_NEGATIVE_COOKED:${menuItem.name}`);
          }

          await db.prepare(`
            INSERT INTO branch_stocks (branch_id, menu_item_id, quantity)
            VALUES (?, ?, ?)
            ON CONFLICT(branch_id, menu_item_id) DO UPDATE SET
              quantity = excluded.quantity,
              updated_at = datetime('now', 'localtime')
          `).run(branchId, Number(menu_item_id), newCooked);

          const logReason = mode === 'relative' ? (deltaCooked > 0 ? 'restock' : 'adjustment') : 'adjustment';
          const logNote = mode === 'relative'
            ? `เติมสต็อกของทอดสุก (Relative) ${deltaCooked >= 0 ? '+' : ''}${deltaCooked} ชิ้น`
            : `ปรับปรุงสต็อกของทอดสุก (Absolute): ปรับจาก ${currentCooked} เป็น ${newCooked} ชิ้น [สาเหตุ: ${reason_preset || 'อื่นๆ'}] (${note || 'ไม่ระบุโน้ต'})`;

          await db.prepare(`
            INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, staff_id, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            branchId,
            Number(menu_item_id),
            deltaCooked,
            currentCooked,
            newCooked,
            logReason,
            req.user.id,
            logNote
          );

          await db.prepare(`
            INSERT INTO activity_logs (branch_id, user_id, action, details)
            VALUES (?, ?, ?, ?)
          `).run(
            branchId,
            req.user.id,
            deltaCooked > 0 ? 'restock_stock' : 'adjust_stock',
            `ปรับปรุงสต็อกของทอด ${menuItem.name} ${deltaCooked >= 0 ? '+' : ''}${deltaCooked} ชิ้น (ก่อนปรับ: ${currentCooked}, หลังปรับ: ${newCooked})${mode === 'absolute' ? ` [สาเหตุ: ${reason_preset || 'อื่นๆ'}]` : ''}`
          );
        }

        if (deltaRaw !== 0) {
          if (!isAdmin) {
            throw new Error('FORBIDDEN_RAW');
          }

          const newRaw = currentRaw + deltaRaw;
          if (newRaw < 0) {
            throw new Error(`STOCK_NEGATIVE_RAW:${menuItem.name}`);
          }

          await db.prepare(`
            INSERT INTO branch_stocks (branch_id, menu_item_id, raw_quantity)
            VALUES (?, ?, ?)
            ON CONFLICT(branch_id, menu_item_id) DO UPDATE SET
              raw_quantity = excluded.raw_quantity,
              updated_at = datetime('now', 'localtime')
          `).run(branchId, Number(menu_item_id), newRaw);

          const logReason = mode === 'relative' ? (deltaRaw > 0 ? 'restock' : 'adjustment') : 'adjustment';
          const logNote = mode === 'relative'
            ? `เติมสต็อกวัตถุดิบ (Relative) ${deltaRaw >= 0 ? '+' : ''}${deltaRaw} ชิ้น`
            : `ปรับปรุงสต็อกวัตถุดิบ (Absolute): ปรับจาก ${currentRaw} เป็น ${newRaw} ชิ้น [สาเหตุ: ${reason_preset || 'อื่นๆ'}] (${note || 'ไม่ระบุโน้ต'})`;

          await db.prepare(`
            INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, staff_id, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            branchId,
            Number(menu_item_id),
            deltaRaw,
            currentRaw,
            newRaw,
            logReason,
            req.user.id,
            logNote
          );

          await db.prepare(`
            INSERT INTO activity_logs (branch_id, user_id, action, details)
            VALUES (?, ?, ?, ?)
          `).run(
            branchId,
            req.user.id,
            deltaRaw > 0 ? 'restock_raw_stock' : 'adjust_raw_stock',
            `ปรับปรุงสต็อกของสด ${menuItem.name} ${deltaRaw >= 0 ? '+' : ''}${deltaRaw} ชิ้น (ก่อนปรับ: ${currentRaw}, หลังปรับ: ${newRaw})${mode === 'absolute' ? ` [สาเหตุ: ${reason_preset || 'อื่นๆ'}]` : ''}`
          );
        }
      }
    });

    try {
      await bulkTransaction();
      res.json({
        success: true,
        message: 'ปรับปรุงสต็อกเรียบร้อยแล้ว'
      });
    } catch (txError) {
      if (txError.message === 'FORBIDDEN_RAW') {
        return res.status(403).json({
          success: false,
          error: 'สิทธิ์พนักงานไม่สามารถแก้ไขคลังวัตถุดิบ (ของสด) ได้'
        });
      }
      if (txError.message.startsWith('STOCK_NEGATIVE_RAW:')) {
        const itemName = txError.message.split(':')[1];
        return res.status(400).json({
          success: false,
          error: `ไม่สามารถปรับคลังวัตถุดิบ ${itemName} ให้ติดลบได้`
        });
      }
      if (txError.message.startsWith('STOCK_NEGATIVE_COOKED:')) {
        const itemName = txError.message.split(':')[1];
        return res.status(400).json({
          success: false,
          error: `ไม่สามารถปรับสต็อกของทอด ${itemName} ให้ติดลบได้`
        });
      }
      throw txError;
    }
  } catch (error) {
    console.error('❌ Bulk adjust stock error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการปรับสต็อกแบบกลุ่ม'
    });
  }
});

module.exports = router;

