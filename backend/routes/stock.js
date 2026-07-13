const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { attachUser, requireAuth } = require('../middleware/auth');

const getBunLinkageName = (name) => {
  if (!name) return null;
  if (name.startsWith('เปาทอด') || name.startsWith('เปาปิ้ง')) {
    if (name.includes('หมูไข่เค็ม') || name.includes('หมูสับไขเค็ม') || name.includes('หมูสับ ไข่เค็ม')) {
      return 'ซาลาเปาไส้หมูสับ ไข่เค็ม';
    }
    if (name.includes('หมู')) {
      return 'ซาลาเปาไส้หมูสับ';
    }
    if (name.includes('ถั่วดำ')) {
      return 'ซาลาเปาไส้ถั่วดำ';
    }
    if (name.includes('ครีม')) {
      return 'ซาลาเปาไส้ครีม';
    }
    if (name.includes('หมั่นโถ')) {
      return 'หมั่นโถว';
    }
  }
  return null;
};

const getCookMethodLabel = (name) => {
  if (!name) return 'ของทอด';
  const isWrapped = name.includes('ข้าวเหนียว') || 
                    name.includes('เบอร์เกอร์') || 
                    name.includes('แร็ป');
  if (isWrapped) {
    return 'ของห่อ';
  }
  const isBunOrDumpling = name.includes('เปา') || 
                          name.includes('หมั่นโถ') || 
                          name.includes('ขนมจีบ');
  if (isBunOrDumpling) {
    if (name.includes('ทอด')) {
      return 'ของทอด';
    }
    if (name.includes('ปิ้ง')) {
      return 'ของปิ้ง';
    }
    return 'ของนึ่ง';
  }
  return 'ของทอด';
};

const getCookVerb = (name) => {
  if (!name) return 'ทอด';
  const isWrapped = name.includes('ข้าวเหนียว') || 
                    name.includes('เบอร์เกอร์') || 
                    name.includes('แร็ป');
  if (isWrapped) {
    return 'ห่อ';
  }
  const isBunOrDumpling = name.includes('เปา') || 
                          name.includes('หมั่นโถ') || 
                          name.includes('ขนมจีบ');
  if (isBunOrDumpling) {
    if (name.includes('ทอด')) {
      return 'ทอด';
    }
    if (name.includes('ปิ้ง')) {
      return 'ปิ้ง';
    }
    return 'นึ่ง';
  }
  return 'ทอด';
};


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
      "SELECT value FROM settings WHERE key = 'low_stock_threshold' AND branch_id = ?"
    ).get(branchId);
    const threshold = thresholdSetting ? parseInt(thresholdSetting.value) || 5 : 5;

    const items = await db.prepare(`
      SELECT 
        mi.id, mi.name, mi.price, mi.category_id, mi.active, mi.uom,
        c.name as category_name,
        mi.quantity as stock,
        mi.raw_quantity as raw_stock
      FROM menu_items mi
      LEFT JOIN categories c ON c.id = mi.category_id AND c.branch_id = ?
      WHERE mi.branch_id = ?
      ORDER BY mi.sort_order ASC, mi.id ASC
    `).all(branchId, branchId);

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

    // หาสาขาของผู้ใช้
    let branchId = req.user ? req.user.branch_id : null;
    if (!branchId) {
      const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
      branchId = defaultBranch ? defaultBranch.id : null;
    }

    const item = await db.prepare('SELECT * FROM menu_items WHERE id = ? AND branch_id = ?').get(Number(id), branchId);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบเมนู'
      });
    }

    const isRaw = stock_type === 'raw';

    const restock = db.transaction(async () => {
      const prev = isRaw ? item.raw_quantity : item.quantity;
      const previousVal = prev !== null && prev !== undefined ? prev : 0;
      const newVal = Math.round((previousVal + quantity) * 100) / 100;

      if (isRaw) {
        await db.prepare(`
          UPDATE menu_items 
          SET raw_quantity = ?, updated_at = datetime('now', 'localtime')
          WHERE id = ? AND branch_id = ?
        `).run(newVal, Number(id), branchId);
      } else {
        await db.prepare(`
          UPDATE menu_items 
          SET quantity = ?, updated_at = datetime('now', 'localtime')
          WHERE id = ? AND branch_id = ?
        `).run(newVal, Number(id), branchId);
      }

      // บันทึกประวัติ
      await db.prepare(`
        INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, staff_id, note, created_at)
        VALUES (?, ?, ?, ?, ?, 'restock', ?, ?, datetime('now', '+7 hours'))
      `).run(
        branchId,
        Number(id),
        quantity,
        previousVal,
        newVal,
        req.user.id,
        note || `เติมสต็อก${isRaw ? 'ของสด' : getCookMethodLabel(item.name)} ${item.name} +${quantity}`
      );

      // Auto-deduct ไก่ไร้กระดูก when restocking แร็ปไก่
      if (!isRaw && item.name.includes('แร็ปไก่') && quantity > 0) {
        const chickenItem = await db.prepare('SELECT id, name, quantity FROM menu_items WHERE branch_id = ? AND name = ?').get(branchId, 'ไก่ไร้กระดูก');
        if (chickenItem && chickenItem.quantity !== null && chickenItem.quantity !== undefined) {
          const prevChickenStock = chickenItem.quantity;
          const deductChicken = quantity;
          const newChickenStock = Math.round((prevChickenStock - deductChicken) * 100) / 100;

          if (newChickenStock < 0) {
            throw new Error(`STOCK_NEGATIVE_CHICKEN:${chickenItem.name}:${prevChickenStock}:${deductChicken}`);
          }

          await db.prepare(`
            UPDATE menu_items
            SET quantity = ?, updated_at = datetime('now', 'localtime')
            WHERE id = ? AND branch_id = ?
          `).run(newChickenStock, chickenItem.id, branchId);

          await db.prepare(`
            INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, staff_id, note, created_at)
            VALUES (?, ?, ?, ?, ?, 'adjustment', ?, ?, datetime('now', '+7 hours'))
          `).run(
            branchId,
            chickenItem.id,
            -deductChicken,
            prevChickenStock,
            newChickenStock,
            req.user.id,
            `หักอัตโนมัติจากการเติมสต็อก ${item.name} +${quantity} ชิ้น`
          );
        }
      }

      // Auto-deduct steamed bun when restocking fried/grilled bun
      const steamedBunName = getBunLinkageName(item.name);
      if (!isRaw && steamedBunName && quantity > 0) {
        const steamedItem = await db.prepare('SELECT id, name, quantity FROM menu_items WHERE branch_id = ? AND name = ?').get(branchId, steamedBunName);
        if (steamedItem && steamedItem.quantity !== null && steamedItem.quantity !== undefined) {
          const prevSteamedStock = steamedItem.quantity;
          const deductSteamed = quantity;
          const newSteamedStock = Math.round((prevSteamedStock - deductSteamed) * 100) / 100;

          if (newSteamedStock < 0) {
            throw new Error(`STOCK_NEGATIVE_BUN:${steamedItem.name}:${prevSteamedStock}:${deductSteamed}`);
          }

          await db.prepare(`
            UPDATE menu_items
            SET quantity = ?, updated_at = datetime('now', 'localtime')
            WHERE id = ? AND branch_id = ?
          `).run(newSteamedStock, steamedItem.id, branchId);

          await db.prepare(`
            INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, staff_id, note, created_at)
            VALUES (?, ?, ?, ?, ?, 'adjustment', ?, ?, datetime('now', '+7 hours'))
          `).run(
            branchId,
            steamedItem.id,
            -deductSteamed,
            prevSteamedStock,
            newSteamedStock,
            req.user.id,
            `หักอัตโนมัติจากการเติมสต็อก ${item.name} +${quantity} ชิ้น`
          );
        }
      }

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
    if (error.message && (error.message.startsWith('STOCK_NEGATIVE_CHICKEN:') || error.message.startsWith('STOCK_NEGATIVE_BUN:'))) {
      const parts = error.message.split(':');
      const name = parts[1];
      const prev = parts[2];
      const reqQty = parts[3];
      return res.status(400).json({
        success: false,
        error: `วัตถุดิบ "${name}" สต็อกไม่เพียงพอ (ต้องการ ${reqQty} ชิ้น แต่เหลือเพียง ${prev} ชิ้น)`
      });
    }
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

    // หาสาขาของผู้ใช้
    let branchId = req.user ? req.user.branch_id : null;
    if (!branchId) {
      const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
      branchId = defaultBranch ? defaultBranch.id : null;
    }

    const item = await db.prepare('SELECT * FROM menu_items WHERE id = ? AND branch_id = ?').get(Number(id), branchId);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบเมนู'
      });
    }

    const isRaw = stock_type === 'raw';
    const currentQty = isRaw ? item.raw_quantity : item.quantity;

    if (currentQty === null || currentQty === undefined) {
      return res.status(400).json({
        success: false,
        error: `เมนูนี้ไม่ได้ตั้งค่าติดตามสต็อก${isRaw ? 'ของสด' : getCookMethodLabel(item.name)}`
      });
    }

    const newVal = Math.round((currentQty + quantity) * 100) / 100;
    if (newVal < 0) {
      return res.status(400).json({
        success: false,
        error: `สต็อกไม่เพียงพอ (มีอยู่ ${currentQty} ชิ้น)`
      });
    }

    const adjust = db.transaction(async () => {
      if (isRaw) {
        await db.prepare(`
          UPDATE menu_items 
          SET raw_quantity = ?, updated_at = datetime('now', 'localtime') 
          WHERE id = ? AND branch_id = ?
        `).run(newVal, Number(id), branchId);
      } else {
        await db.prepare(`
          UPDATE menu_items 
          SET quantity = ?, updated_at = datetime('now', 'localtime') 
          WHERE id = ? AND branch_id = ?
        `).run(newVal, Number(id), branchId);
      }

      const dbReason = reason === 'staff_benefit' ? 'adjustment' : reason;

      await db.prepare(`
        INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, staff_id, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))
      `).run(
        branchId,
        Number(id),
        quantity,
        currentQty,
        newVal,
        dbReason,
        req.user.id,
        note || `ปรับสต็อก${isRaw ? 'ของสด' : getCookMethodLabel(item.name)} ${item.name} ${quantity >= 0 ? '+' : ''}${quantity} (${reason})`
      );

      // Auto-adjust ไก่ไร้กระดูก when adjusting แร็ปไก่ stock
      if (!isRaw && item.name.includes('แร็ปไก่') && quantity !== 0) {
        const chickenItem = await db.prepare('SELECT id, name, quantity FROM menu_items WHERE branch_id = ? AND name = ?').get(branchId, 'ไก่ไร้กระดูก');
        if (chickenItem && chickenItem.quantity !== null && chickenItem.quantity !== undefined) {
          const prevChickenStock = chickenItem.quantity;
          const deductChicken = quantity;
          const newChickenStock = Math.round((prevChickenStock - deductChicken) * 100) / 100;

          if (newChickenStock < 0) {
            throw new Error(`STOCK_NEGATIVE_CHICKEN:${chickenItem.name}:${prevChickenStock}:${deductChicken}`);
          }

          await db.prepare(`
            UPDATE menu_items
            SET quantity = ?, updated_at = datetime('now', 'localtime')
            WHERE id = ? AND branch_id = ?
          `).run(newChickenStock, chickenItem.id, branchId);

          await db.prepare(`
            INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, staff_id, note, created_at)
            VALUES (?, ?, ?, ?, ?, 'adjustment', ?, ?, datetime('now', '+7 hours'))
          `).run(
            branchId,
            chickenItem.id,
            -deductChicken,
            prevChickenStock,
            newChickenStock,
            req.user.id,
            deductChicken > 0 
              ? `หักอัตโนมัติจากการปรับปรุงสต็อก ${item.name} +${deductChicken} ชิ้น`
              : `คืนอัตโนมัติจากการปรับปรุงสต็อก ${item.name} ${deductChicken} ชิ้น`
          );
        }
      }

      // Auto-adjust steamed bun when adjusting fried/grilled bun stock
      const steamedBunName = getBunLinkageName(item.name);
      if (!isRaw && steamedBunName && quantity !== 0) {
        const steamedItem = await db.prepare('SELECT id, name, quantity FROM menu_items WHERE branch_id = ? AND name = ?').get(branchId, steamedBunName);
        if (steamedItem && steamedItem.quantity !== null && steamedItem.quantity !== undefined) {
          const prevSteamedStock = steamedItem.quantity;
          const deductSteamed = quantity;
          const newSteamedStock = Math.round((prevSteamedStock - deductSteamed) * 100) / 100;

          if (newSteamedStock < 0) {
            throw new Error(`STOCK_NEGATIVE_BUN:${steamedItem.name}:${prevSteamedStock}:${deductSteamed}`);
          }

          await db.prepare(`
            UPDATE menu_items
            SET quantity = ?, updated_at = datetime('now', 'localtime')
            WHERE id = ? AND branch_id = ?
          `).run(newSteamedStock, steamedItem.id, branchId);

          await db.prepare(`
            INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, staff_id, note, created_at)
            VALUES (?, ?, ?, ?, ?, 'adjustment', ?, ?, datetime('now', '+7 hours'))
          `).run(
            branchId,
            steamedItem.id,
            -deductSteamed,
            prevSteamedStock,
            newSteamedStock,
            req.user.id,
            deductSteamed > 0 
              ? `หักอัตโนมัติจากการปรับปรุงสต็อก ${item.name} +${deductSteamed} ชิ้น`
              : `คืนอัตโนมัติจากการปรับปรุงสต็อก ${item.name} ${deductSteamed} ชิ้น`
          );
        }
      }

      // บันทึกกิจกรรมพนักงาน
      let actionLabel = isRaw ? 'adjust_raw_stock' : 'adjust_stock';
      if (reason === 'waste') actionLabel = isRaw ? 'record_raw_waste' : 'record_waste';
      else if (reason === 'staff_benefit') actionLabel = isRaw ? 'staff_raw_credit' : 'staff_credit';

      let detailsText = `ปรับปรุงสต็อก${isRaw ? 'ของสด' : getCookMethodLabel(item.name)} ${item.name} ${quantity >= 0 ? '+' : ''}${quantity} ชิ้น (ก่อนปรับ: ${currentQty}, หลังปรับ: ${newVal})`;
      if (reason === 'waste') {
        detailsText = `บันทึกของเสีย${isRaw ? 'ของสด' : ''} ${item.name} ${quantity} ชิ้น (${note || 'ไม่ระบุรายละเอียดเพิ่มเติม'})`;
      } else if (reason === 'staff_benefit') {
        detailsText = `บันทึกของกินพนักงาน/เครดิต${isRaw ? 'ของสด' : ''} ${item.name} ${quantity} ชิ้น (${note || 'แจกพนักงานรับประทาน'})`;
      }

      await db.prepare(`
        INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
        VALUES (?, ?, ?, ?, datetime('now', '+7 hours'))
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
    if (error.message && (error.message.startsWith('STOCK_NEGATIVE_CHICKEN:') || error.message.startsWith('STOCK_NEGATIVE_BUN:'))) {
      const parts = error.message.split(':');
      const name = parts[1];
      const prev = parts[2];
      const reqQty = parts[3];
      return res.status(400).json({
        success: false,
        error: `วัตถุดิบ "${name}" สต็อกไม่เพียงพอ (ต้องการ ${reqQty} ชิ้น แต่เหลือเพียง ${prev} ชิ้น)`
      });
    }
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

    // หาสาขาของผู้ใช้
    let branchId = req.user ? req.user.branch_id : null;
    if (!branchId) {
      const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
      branchId = defaultBranch ? defaultBranch.id : null;
    }

    const item = await db.prepare('SELECT * FROM menu_items WHERE id = ? AND branch_id = ?').get(Number(id), branchId);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบเมนู'
      });
    }

    if (item.raw_quantity === null || item.quantity === null) {
      return res.status(400).json({
        success: false,
        error: `สินค้าประเภทนี้ไม่ได้ติดตามสต็อกของสดหรือ${getCookMethodLabel(item.name)}`
      });
    }

    if (item.raw_quantity < quantity) {
      return res.status(400).json({
        success: false,
        error: `จำนวนของสดไม่เพียงพอที่จะทอด (มีของสดอยู่ ${item.raw_quantity} ชิ้น)`
      });
    }

    const fryChicken = db.transaction(async () => {
      const newRawStock = Math.round((item.raw_quantity - quantity) * 100) / 100;
      const newCookedStock = Math.round((item.quantity + quantity) * 100) / 100;

      // 1. อัปเดตสต็อกใน menu_items
      await db.prepare(`
        UPDATE menu_items 
        SET raw_quantity = ?, quantity = ?, updated_at = datetime('now', 'localtime')
        WHERE branch_id = ? AND id = ?
      `).run(newRawStock, newCookedStock, branchId, Number(id));

      // 2. บันทึก Stock logs (หักของสด)
      await db.prepare(`
        INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, staff_id, note, created_at)
        VALUES (?, ?, ?, ?, ?, 'adjustment', ?, ?, datetime('now', '+7 hours'))
      `).run(
        branchId,
        Number(id),
        -quantity,
        item.raw_quantity,
        newRawStock,
        req.user.id,
        note || `หักวัตถุดิบของสดเพื่อนำไปทอด: ${quantity} ชิ้น`
      );

      // 3. บันทึก Stock logs (เพิ่มสต็อกปรุงสุก)
      await db.prepare(`
        INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, staff_id, note, created_at)
        VALUES (?, ?, ?, ?, ?, 'restock', ?, ?, datetime('now', '+7 hours'))
      `).run(
        branchId,
        Number(id),
        quantity,
        item.quantity,
        newCookedStock,
        req.user.id,
        note || `ทอดสุกพร้อมขาย: +${quantity} ชิ้น`
      );

      // 4. บันทึกกิจกรรมพนักงาน
      await db.prepare(`
        INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
        VALUES (?, ?, ?, ?, datetime('now', '+7 hours'))
      `).run(
        branchId,
        req.user.id,
        'fry_chicken',
        `ทำการ${getCookVerb(item.name)} ${item.name} จำนวน ${quantity} ชิ้น (ของสดคงเหลือ: ${newRawStock}, ${getCookMethodLabel(item.name)}พร้อมขายคงเหลือ: ${newCookedStock})`
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
    const item = await db.prepare('SELECT id, name FROM menu_items WHERE id = ? AND branch_id = ?').get(Number(id), branchId);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบเมนู'
      });
    }

    let query = `
      SELECT sl.*, u.name as staff_name
      FROM stock_logs sl
      LEFT JOIN users u ON u.id = sl.staff_id
      WHERE sl.menu_item_id = ? AND sl.branch_id = ?
    `;
    const params = [Number(id), branchId];

    if (req.query.date) {
      query += ` AND date(sl.created_at) = ? `;
      params.push(req.query.date);
    } else if (req.query.month) {
      query += ` AND strftime('%Y-%m', sl.created_at) = ? `;
      params.push(req.query.month);
    } else if (req.query.year) {
      query += ` AND strftime('%Y', sl.created_at) = ? `;
      params.push(req.query.year);
    }

    query += ` ORDER BY sl.created_at DESC `;

    const hasFilter = req.query.date || req.query.month || req.query.year;
    if (!hasFilter) {
      query += ` LIMIT ? `;
      params.push(limit);
    }

    const logs = await db.prepare(query).all(...params);

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

        const menuItem = await db.prepare('SELECT name, quantity, raw_quantity FROM menu_items WHERE id = ? AND branch_id = ?').get(Number(menu_item_id), branchId);
        if (!menuItem) continue;

        const currentCooked = menuItem.quantity !== null && menuItem.quantity !== undefined ? menuItem.quantity : 0;
        const currentRaw = menuItem.raw_quantity !== null && menuItem.raw_quantity !== undefined ? menuItem.raw_quantity : 0;

        let deltaCooked = 0;
        let deltaRaw = 0;

        if (item.cooked !== undefined && item.cooked !== null && item.cooked !== '') {
          const val = Number(item.cooked);
          if (!isNaN(val)) {
            if (mode === 'relative') {
              deltaCooked = val;
            } else {
              deltaCooked = Math.round((val - currentCooked) * 100) / 100;
            }
          }
        }

        if (item.raw !== undefined && item.raw !== null && item.raw !== '') {
          const val = Number(item.raw);
          if (!isNaN(val)) {
            if (mode === 'relative') {
              deltaRaw = val;
            } else {
              deltaRaw = Math.round((val - currentRaw) * 100) / 100;
            }
          }
        }

        if (deltaCooked !== 0) {
          const newCooked = Math.round((currentCooked + deltaCooked) * 100) / 100;
          if (newCooked < 0) {
            throw new Error(`STOCK_NEGATIVE_COOKED:${menuItem.name}`);
          }

          await db.prepare(`
            UPDATE menu_items 
            SET quantity = ?, updated_at = datetime('now', 'localtime')
            WHERE id = ? AND branch_id = ?
          `).run(newCooked, Number(menu_item_id), branchId);

          const logReason = mode === 'relative' ? (deltaCooked > 0 ? 'restock' : 'adjustment') : 'adjustment';
          const logNote = mode === 'relative'
            ? `เติมสต็อก${getCookMethodLabel(menuItem.name)}สุก (Relative) ${deltaCooked >= 0 ? '+' : ''}${deltaCooked} ชิ้น`
            : `ปรับปรุงสต็อก${getCookMethodLabel(menuItem.name)}สุก (Absolute): ปรับจาก ${currentCooked} เป็น ${newCooked} ชิ้น [สาเหตุ: ${reason_preset || 'อื่นๆ'}] (${note || 'ไม่ระบุโน้ต'})`;

          await db.prepare(`
            INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, staff_id, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))
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
            INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
            VALUES (?, ?, ?, ?, datetime('now', '+7 hours'))
          `).run(
            branchId,
            req.user.id,
            deltaCooked > 0 ? 'restock_stock' : 'adjust_stock',
            `ปรับปรุงสต็อก${getCookMethodLabel(menuItem.name)} ${menuItem.name} ${deltaCooked >= 0 ? '+' : ''}${deltaCooked} ชิ้น (ก่อนปรับ: ${currentCooked}, หลังปรับ: ${newCooked})${mode === 'absolute' ? ` [สาเหตุ: ${reason_preset || 'อื่นๆ'}]` : ''}`
          );

          // Auto-adjust ไก่ไร้กระดูก when adjusting แร็ปไก่ stock in bulk adjust
          if (menuItem.name.includes('แร็ปไก่') && deltaCooked !== 0) {
            const chickenItem = await db.prepare('SELECT id, name, quantity FROM menu_items WHERE branch_id = ? AND name = ?').get(branchId, 'ไก่ไร้กระดูก');
            if (chickenItem && chickenItem.quantity !== null && chickenItem.quantity !== undefined) {
              const prevChickenStock = chickenItem.quantity;
              const deductChicken = deltaCooked;
              const newChickenStock = Math.round((prevChickenStock - deductChicken) * 100) / 100;

              if (newChickenStock < 0) {
                throw new Error(`STOCK_NEGATIVE_CHICKEN:${chickenItem.name}:${prevChickenStock}:${deductChicken}`);
              }

              await db.prepare(`
                UPDATE menu_items
                SET quantity = ?, updated_at = datetime('now', 'localtime')
                WHERE id = ? AND branch_id = ?
              `).run(newChickenStock, chickenItem.id, branchId);

              await db.prepare(`
                INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, staff_id, note, created_at)
                VALUES (?, ?, ?, ?, ?, 'adjustment', ?, ?, datetime('now', '+7 hours'))
              `).run(
                branchId,
                chickenItem.id,
                -deductChicken,
                prevChickenStock,
                newChickenStock,
                req.user.id,
                deductChicken > 0
                  ? `หักอัตโนมัติจากการเพิ่มสต็อก ${menuItem.name} +${deductChicken} ชิ้น`
                  : `คืนอัตโนมัติจากการลดสต็อก ${menuItem.name} ${deductChicken} ชิ้น`
              );
            }
          }

          // Auto-adjust steamed bun when adjusting fried/grilled bun stock in bulk adjust
          const steamedBunName = getBunLinkageName(menuItem.name);
          if (steamedBunName && deltaCooked !== 0) {
            const steamedItem = await db.prepare('SELECT id, name, quantity FROM menu_items WHERE branch_id = ? AND name = ?').get(branchId, steamedBunName);
            if (steamedItem && steamedItem.quantity !== null && steamedItem.quantity !== undefined) {
              const prevSteamedStock = steamedItem.quantity;
              const deductSteamed = deltaCooked;
              const newSteamedStock = Math.round((prevSteamedStock - deductSteamed) * 100) / 100;

              if (newSteamedStock < 0) {
                throw new Error(`STOCK_NEGATIVE_BUN:${steamedItem.name}:${prevSteamedStock}:${deductSteamed}`);
              }

              await db.prepare(`
                UPDATE menu_items
                SET quantity = ?, updated_at = datetime('now', 'localtime')
                WHERE id = ? AND branch_id = ?
              `).run(newSteamedStock, steamedItem.id, branchId);

              await db.prepare(`
                INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, staff_id, note, created_at)
                VALUES (?, ?, ?, ?, ?, 'adjustment', ?, ?, datetime('now', '+7 hours'))
              `).run(
                branchId,
                steamedItem.id,
                -deductSteamed,
                prevSteamedStock,
                newSteamedStock,
                req.user.id,
                deductSteamed > 0
                  ? `หักอัตโนมัติจากการเพิ่มสต็อก ${menuItem.name} +${deductSteamed} ชิ้น`
                  : `คืนอัตโนมัติจากการลดสต็อก ${menuItem.name} ${deductSteamed} ชิ้น`
              );
            }
          }
        }

        if (deltaRaw !== 0) {
          if (!isAdmin) {
            throw new Error('FORBIDDEN_RAW');
          }

          const newRaw = Math.round((currentRaw + deltaRaw) * 100) / 100;
          if (newRaw < 0) {
            throw new Error(`STOCK_NEGATIVE_RAW:${menuItem.name}`);
          }

          await db.prepare(`
            UPDATE menu_items 
            SET raw_quantity = ?, updated_at = datetime('now', 'localtime')
            WHERE id = ? AND branch_id = ?
          `).run(newRaw, Number(menu_item_id), branchId);

          const logReason = mode === 'relative' ? (deltaRaw > 0 ? 'restock' : 'adjustment') : 'adjustment';
          const logNote = mode === 'relative'
            ? `เติมสต็อกวัตถุดิบ (Relative) ${deltaRaw >= 0 ? '+' : ''}${deltaRaw} ชิ้น`
            : `ปรับปรุงสต็อกวัตถุดิบ (Absolute): ปรับจาก ${currentRaw} เป็น ${newRaw} ชิ้น [สาเหตุ: ${reason_preset || 'อื่นๆ'}] (${note || 'ไม่ระบุโน้ต'})`;

          await db.prepare(`
            INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, staff_id, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))
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
            INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
            VALUES (?, ?, ?, ?, datetime('now', '+7 hours'))
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
      
      // Fetch all updated stock values to return
      const updatedItems = await db.prepare(`
        SELECT id, quantity as stock, raw_quantity as raw_stock 
        FROM menu_items 
        WHERE branch_id = ?
      `).all(branchId);

      res.json({
        success: true,
        message: 'ปรับปรุงสต็อกเรียบร้อยแล้ว',
        updatedItems
      });
    } catch (txError) {
      if (txError.message.startsWith('STOCK_NEGATIVE_CHICKEN:') || txError.message.startsWith('STOCK_NEGATIVE_BUN:')) {
        const parts = txError.message.split(':');
        const name = parts[1];
        const prev = parts[2];
        const reqQty = parts[3];
        return res.status(400).json({
          success: false,
          error: `วัตถุดิบ "${name}" สต็อกไม่เพียงพอ (ต้องการ ${reqQty} ชิ้น แต่เหลือเพียง ${prev} ชิ้น)`
        });
      }
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
          error: `ไม่สามารถปรับสต็อก${getCookMethodLabel(itemName)} ${itemName} ให้ติดลบได้`
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

