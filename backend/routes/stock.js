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
        bs.quantity as stock
      FROM menu_items mi
      LEFT JOIN categories c ON c.id = mi.category_id
      LEFT JOIN branch_stocks bs ON bs.menu_item_id = mi.id AND bs.branch_id = ?
      ORDER BY mi.sort_order ASC, mi.id ASC
    `).all(branchId);

    // เพิ่ม flag low_stock
    const itemsWithFlag = items.map(item => ({
      ...item,
      low_stock: item.stock !== null && item.stock <= threshold
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
    const { quantity, note } = req.body;
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

    // ดึงสต็อกปัจจุบันของสาขานี้
    const branchStock = await db.prepare(
      'SELECT quantity FROM branch_stocks WHERE branch_id = ? AND menu_item_id = ?'
    ).get(branchId, Number(id));

    const restock = db.transaction(async () => {
      const previousStock = branchStock && branchStock.quantity !== null ? branchStock.quantity : 0;
      const newStock = previousStock + quantity;

      // อัปเดตหรือแทรกสต็อกใหม่ใน branch_stocks
      await db.prepare(`
        INSERT INTO branch_stocks (branch_id, menu_item_id, quantity)
        VALUES (?, ?, ?)
        ON CONFLICT(branch_id, menu_item_id) DO UPDATE SET
          quantity = excluded.quantity,
          updated_at = datetime('now', 'localtime')
      `).run(branchId, Number(id), newStock);

      // บันทึกประวัติ
      await db.prepare(`
        INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, staff_id, note)
        VALUES (?, ?, ?, ?, ?, 'restock', ?, ?)
      `).run(
        branchId,
        Number(id),
        quantity,
        branchStock ? branchStock.quantity : null,
        newStock,
        req.user.id,
        note || `เติมสต็อก ${item.name} +${quantity}`
      );

      return newStock;
    });

    const newStock = await restock();

    res.json({
      success: true,
      data: {
        id: item.id,
        name: item.name,
        stock: newStock
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
    const { quantity, reason, note } = req.body;
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

    // ดึงสต็อกปัจจุบันของสาขานี้
    const branchStock = await db.prepare(
      'SELECT quantity FROM branch_stocks WHERE branch_id = ? AND menu_item_id = ?'
    ).get(branchId, Number(id));

    if (!branchStock || branchStock.quantity === null) {
      return res.status(400).json({
        success: false,
        error: 'เมนูนี้ไม่ได้ตั้งค่าสต็อก (unlimited)'
      });
    }

    const newStock = branchStock.quantity + quantity;
    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        error: `สต็อกไม่เพียงพอ (มีอยู่ ${branchStock.quantity} ชิ้น)`
      });
    }

    const adjust = db.transaction(async () => {
      await db.prepare(`
        UPDATE branch_stocks 
        SET quantity = ?, updated_at = datetime('now', 'localtime') 
        WHERE branch_id = ? AND menu_item_id = ?
      `).run(newStock, branchId, Number(id));

      await db.prepare(`
        INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, staff_id, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        branchId,
        Number(id),
        quantity,
        branchStock.quantity,
        newStock,
        reason,
        req.user.id,
        note || `ปรับสต็อก ${item.name} ${quantity >= 0 ? '+' : ''}${quantity} (${reason})`
      );

      // บันทึกกิจกรรมพนักงาน
      let actionLabel = 'adjust_stock';
      if (reason === 'waste') actionLabel = 'record_waste';
      else if (reason === 'staff_benefit') actionLabel = 'staff_credit';

      let detailsText = `ปรับปรุงสต็อก ${item.name} ${quantity >= 0 ? '+' : ''}${quantity} ชิ้น (ก่อนปรับ: ${branchStock.quantity}, หลังปรับ: ${newStock})`;
      if (reason === 'waste') {
        detailsText = `บันทึกของเสีย ${item.name} ${quantity} ชิ้น (${note || 'ไม่ระบุรายละเอียดเพิ่มเติม'})`;
      } else if (reason === 'staff_benefit') {
        detailsText = `บันทึกของกินพนักงาน/เครดิต ${item.name} ${quantity} ชิ้น (${note || 'แจกพนักงานรับประทาน'})`;
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

      return newStock;
    });

    const updatedStock = await adjust();

    res.json({
      success: true,
      data: {
        id: item.id,
        name: item.name,
        stock: updatedStock
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

module.exports = router;
