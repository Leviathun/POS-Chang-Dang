const express = require('express');
const router = express.Router();
const { getDb, generateOrderNumber } = require('../config/database');
const { attachUser, requireAuth } = require('../middleware/auth');

// ใช้ middleware ตรวจสอบผู้ใช้ทุก route
router.use(attachUser);

// ─── POST / — สร้างออเดอร์ใหม่ ──────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { items, note, discount, free_modifiers } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ'
      });
    }

    const db = getDb();

    // หาสาขาของผู้ใช้
    let branchId = req.user ? req.user.branch_id : null;
    if (!branchId) {
      const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
      branchId = defaultBranch ? defaultBranch.id : null;
    }

    // ใช้ transaction เพื่อความปลอดภัย
    const createOrder = db.transaction(async () => {
      // ดึงข้อมูลเมนูและคำนวณราคา
      const orderItems = [];
      let subtotal = 0;

      for (const item of items) {
        if (!item.menu_item_id || !item.quantity || item.quantity <= 0) {
          throw new Error('ข้อมูลสินค้าไม่ถูกต้อง — ต้องระบุ menu_item_id และ quantity');
        }

        // คิวรีดึงเมนูและสต็อกของสาขานี้
        const menuItem = await db.prepare(`
          SELECT mi.id, mi.name, COALESCE(bs.price, mi.price) as price, mi.active, bs.quantity as stock
          FROM menu_items mi
          LEFT JOIN branch_stocks bs ON bs.menu_item_id = mi.id AND bs.branch_id = ?
          WHERE mi.id = ? AND mi.branch_id = ?
        `).get(branchId, Number(item.menu_item_id), branchId);

        if (!menuItem) {
          throw new Error(`ไม่พบเมนู ID: ${item.menu_item_id}`);
        }

        if (!menuItem.active) {
          throw new Error(`เมนู "${menuItem.name}" ถูกปิดใช้งาน`);
        }

        // ตรวจสอบสต็อก (ถ้ามีจำกัด)
        if (item.options && Array.isArray(item.options.selected_items)) {
          for (const ingredient of item.options.selected_items) {
            const ingStock = await db.prepare(`
              SELECT bs.quantity as stock, mi.name
              FROM menu_items mi
              LEFT JOIN branch_stocks bs ON bs.menu_item_id = mi.id AND bs.branch_id = ?
              WHERE mi.id = ? AND mi.branch_id = ?
            `).get(branchId, Number(ingredient.id), branchId);

            const requiredQty = Number(ingredient.weight) * item.quantity;
            if (ingStock && ingStock.stock !== null && ingStock.stock < requiredQty) {
              throw new Error(`วัตถุดิบ "${ingStock.name}" สต็อกไม่เพียงพอ (ต้องการ ${requiredQty} ก. แต่เหลือ ${ingStock.stock} ก.)`);
            }
          }
        } else {
          if (menuItem.stock !== null && menuItem.stock < item.quantity) {
            throw new Error(`เมนู "${menuItem.name}" สต็อกไม่เพียงพอ (เหลือ ${menuItem.stock} ชิ้น)`);
          }
        }

        const price = item.item_price !== undefined && item.item_price !== null ? Number(item.item_price) : menuItem.price;
        const name = item.item_name || menuItem.name;
        const itemSubtotal = price * item.quantity;
        subtotal += itemSubtotal;

        orderItems.push({
          menu_item_id: menuItem.id,
          item_name: name,
          item_price: price,
          quantity: item.quantity,
          subtotal: itemSubtotal,
          options: item.options ? JSON.stringify(item.options) : null
        });
      }

      const orderDiscount = discount || 0;
      const total = subtotal - orderDiscount;

      if (total < 0) {
        throw new Error('ส่วนลดมากกว่ายอดรวม');
      }

      // สร้างเลขออเดอร์
      const orderNumber = await generateOrderNumber();

      // บันทึกออเดอร์
      const orderResult = await db.prepare(`
        INSERT INTO orders (branch_id, order_number, staff_id, subtotal, discount, total, status, note, free_modifiers, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, datetime('now', '+7 hours'))
      `).run(
        branchId,
        orderNumber,
        req.user.id,
        subtotal,
        orderDiscount,
        total,
        note || null,
        free_modifiers ? JSON.stringify(free_modifiers) : null
      );

      // บันทึกกิจกรรมพนักงาน
      await db.prepare(`
        INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
        VALUES (?, ?, 'create_order', ?, datetime('now', '+7 hours'))
      `).run(
        branchId,
        req.user.id,
        `สร้างออเดอร์ใหม่สำเร็จ เลขที่ ${orderNumber} ยอดรวม ${total} บาท`
      );

      const orderId = orderResult.lastInsertRowid;

      // บันทึกรายการสินค้า
      const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, menu_item_id, item_name, item_price, quantity, subtotal, options)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const oi of orderItems) {
        await insertItem.run(orderId, oi.menu_item_id, oi.item_name, oi.item_price, oi.quantity, oi.subtotal, oi.options);
      }

      // ดึงข้อมูลออเดอร์ที่สร้าง
      const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
      const savedItems = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
      const parsedItems = savedItems.map(oi => ({
        ...oi,
        options: oi.options ? JSON.parse(oi.options) : null
      }));

      return { ...order, items: parsedItems };
    });

    const order = await createOrder();

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('❌ Create order error:', error.message);
    const statusCode = error.message.includes('ไม่พบ') || error.message.includes('ปิดใช้งาน')
      || error.message.includes('ไม่เพียงพอ') || error.message.includes('ไม่ถูกต้อง')
      || error.message.includes('มากกว่า')
      ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

// ─── GET / — รายการออเดอร์ ──────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { date, month, year, status, limit, offset, branch_id } = req.query;
    const db = getDb();

    let sql = `
      SELECT o.*, u.name as staff_name, b.name as branch_name
      FROM orders o
      LEFT JOIN users u ON u.id = o.staff_id
      LEFT JOIN branches b ON b.id = o.branch_id
      WHERE 1=1
    `;
    const params = [];

    // กรองออเดอร์ตามสาขาของพนักงานที่ร้องขอ (แอดมินฟิลเตอร์ได้อิสระ)
    let targetBranchId = branch_id ? Number(branch_id) : null;
    if (req.user && req.user.role !== 'admin') {
      targetBranchId = req.user.branch_id;
    }

    if (targetBranchId) {
      sql += ' AND o.branch_id = ?';
      params.push(targetBranchId);
    }

    if (date) {
      sql += ' AND date(o.created_at) = ?';
      params.push(date);
    } else if (month) {
      sql += " AND strftime('%Y-%m', o.created_at) = ?";
      params.push(month);
    } else if (year) {
      sql += " AND strftime('%Y', o.created_at) = ?";
      params.push(year);
    }

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY o.created_at DESC';

    if (limit) {
      sql += ' LIMIT ?';
      params.push(Number(limit));
    }

    if (offset) {
      sql += ' OFFSET ?';
      params.push(Number(offset));
    }

    const orders = await db.prepare(sql).all(params);

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('❌ Get orders error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลออเดอร์'
    });
  }
});

// ─── GET /:id — รายละเอียดออเดอร์ ───────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const order = await db.prepare(`
      SELECT o.*, u.name as staff_name, b.name as branch_name
      FROM orders o
      LEFT JOIN users u ON u.id = o.staff_id
      LEFT JOIN branches b ON b.id = o.branch_id
      WHERE o.id = ?
    `).get(Number(id));

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบออเดอร์'
      });
    }

    const items = await db.prepare(
      'SELECT * FROM order_items WHERE order_id = ?'
    ).all(Number(id));

    const parsedItems = items.map(oi => ({
      ...oi,
      options: oi.options ? JSON.parse(oi.options) : null
    }));

    res.json({
      success: true,
      data: { ...order, items: parsedItems }
    });
  } catch (error) {
    console.error('❌ Get order error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลออเดอร์'
    });
  }
});



// ─── POST /:id/complete — ชำระเงิน/เสร็จสิ้น ───────────
router.post('/:id/complete', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method, cash_received } = req.body;
    const db = getDb();

    if (!payment_method || !['cash', 'qr', 'gov'].includes(payment_method)) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุวิธีชำระเงิน (cash, qr หรือ gov)'
      });
    }

    const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(id));

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบออเดอร์'
      });
    }

    if (order.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'ออเดอร์นี้ชำระเงินแล้ว'
      });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'ออเดอร์นี้ถูกยกเลิกแล้ว'
      });
    }

    // คำนวณเงินทอน (ถ้าเป็นเงินสด)
    let cashChange = null;
    if (payment_method === 'cash') {
      if (!cash_received || cash_received < order.total) {
        return res.status(400).json({
          success: false,
          error: 'จำนวนเงินที่รับไม่เพียงพอ'
        });
      }
      cashChange = cash_received - order.total;
    }

    const branchId = order.branch_id;

    // ใช้ transaction สำหรับอัปเดตออเดอร์ + ตัดสต็อก
    const completeOrder = db.transaction(async () => {
      // อัปเดตสถานะออเดอร์
      await db.prepare(`
        UPDATE orders 
        SET status = 'completed', payment_method = ?, cash_received = ?, cash_change = ?
        WHERE id = ?
      `).run(payment_method, cash_received || null, cashChange, Number(id));

      // บันทึกกิจกรรมพนักงาน
      const paymentLabel = payment_method === 'cash' ? 'เงินสด' : (payment_method === 'qr' ? 'QR Code' : 'โครงการของรัฐ');
      await db.prepare(`
        INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
        VALUES (?, ?, 'complete_order', ?, datetime('now', '+7 hours'))
      `).run(
        branchId,
        req.user.id,
        `ชำระเงินออเดอร์ ${order.order_number} สำเร็จ (วิธี: ${paymentLabel})`
      );

      // ดึงรายการสินค้าในออเดอร์
      const orderItems = await db.prepare(
        'SELECT * FROM order_items WHERE order_id = ?'
      ).all(Number(id));

      // ตัดสต็อกแยกตามสาขา (เฉพาะที่มีสต็อกคีย์ไว้และไม่เป็น NULL)
      const updateStock = db.prepare(`
        UPDATE branch_stocks 
        SET quantity = quantity - ? 
        WHERE branch_id = ? AND menu_item_id = ? AND quantity IS NOT NULL
      `);
      const getItem = db.prepare(`
        SELECT mi.id, mi.name, bs.quantity as stock 
        FROM menu_items mi
        LEFT JOIN branch_stocks bs ON bs.menu_item_id = mi.id AND bs.branch_id = ?
        WHERE mi.id = ? AND mi.branch_id = ?
      `);
      const insertLog = db.prepare(`
        INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, order_id, staff_id, note, created_at)
        VALUES (?, ?, ?, ?, ?, 'sale', ?, ?, ?, datetime('now', '+7 hours'))
      `);

      for (const oi of orderItems) {
        let optionsObj = null;
        if (oi.options) {
          try {
            optionsObj = JSON.parse(oi.options);
          } catch (e) {
            console.error('Failed to parse order item options:', e.message);
          }
        }

        if (optionsObj && Array.isArray(optionsObj.selected_items) && optionsObj.selected_items.length > 0) {
          // หักสต็อกตามส่วนผสมและสัดส่วนน้ำหนัก
          for (const ingredient of optionsObj.selected_items) {
            const ingItem = await getItem.get(branchId, Number(ingredient.id), branchId);
            if (ingItem && ingItem.stock !== null) {
              const previousStock = ingItem.stock;
              const deductAmount = Number(ingredient.weight) * oi.quantity;
              const newStock = previousStock - deductAmount;

              await updateStock.run(deductAmount, branchId, Number(ingredient.id));

              // บันทึกประวัติสต็อก
              await insertLog.run(
                branchId,
                Number(ingredient.id),
                -deductAmount,
                previousStock,
                newStock,
                Number(id),
                req.user.id,
                `ขาย ${oi.item_name} (วัตถุดิบ: ${ingredient.name} ${deductAmount}ก.) (${order.order_number})`
              );
            }
          }
        } else {
          // ตัดสต็อกสินค้าชิ้นเดี่ยวปกติ
          const menuItem = await getItem.get(branchId, oi.menu_item_id);
          if (menuItem && menuItem.stock !== null) {
            const previousStock = menuItem.stock;
            const newStock = previousStock - oi.quantity;

            await updateStock.run(oi.quantity, branchId, oi.menu_item_id);

            // บันทึกประวัติสต็อก
            await insertLog.run(
              branchId,
              oi.menu_item_id,
              -oi.quantity,
              previousStock,
              newStock,
              Number(id),
              req.user.id,
              `ขาย ${oi.item_name} x${oi.quantity} (${order.order_number})`
            );
          }
        }
      }

      // หักสต็อกของซอส/ผง/น้ำจิ้มฟรี (ถ้ามีในออเดอร์)
      if (order.free_modifiers) {
        try {
          const selectedModifiers = JSON.parse(order.free_modifiers);
          if (Array.isArray(selectedModifiers) && selectedModifiers.length > 0) {
            const updateModStock = db.prepare(`
              UPDATE branch_free_modifier_stocks
              SET total_servings = total_servings - 1
              WHERE branch_id = ? AND modifier_id = ?
            `);
            const getModStock = db.prepare(`
              SELECT total_servings FROM branch_free_modifier_stocks
              WHERE branch_id = ? AND modifier_id = ?
            `);
            const insertModLog = db.prepare(`
              INSERT INTO free_modifier_stock_logs (branch_id, modifier_id, change_qty, previous_stock, new_stock, reason, order_id, staff_id, note, created_at)
              VALUES (?, ?, -1, ?, ?, 'sale', ?, ?, ?, datetime('now', '+7 hours'))
            `);

            for (const mod of selectedModifiers) {
              const currentMod = await getModStock.get(branchId, mod.id);
              const prevModStock = currentMod ? currentMod.total_servings : 0;
              const newModStock = prevModStock - 1;

              await updateModStock.run(branchId, mod.id);
              await insertModLog.run(
                branchId,
                mod.id,
                prevModStock,
                newModStock,
                Number(id),
                req.user.id,
                `ใช้ฟรี ${mod.name} ในออเดอร์ ${order.order_number}`
              );
            }
          }
        } catch (modErr) {
          console.error('⚠️ Error deducting free modifiers stock:', modErr.message);
        }
      }

      // ดึงออเดอร์ที่อัปเดตแล้ว
      const updatedOrder = await db.prepare(`
        SELECT o.*, u.name as staff_name, b.name as branch_name
        FROM orders o
        LEFT JOIN users u ON u.id = o.staff_id
        LEFT JOIN branches b ON b.id = o.branch_id
        WHERE o.id = ?
      `).get(Number(id));

      const items = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(Number(id));
      const parsedItems = items.map(oi => ({
        ...oi,
        options: oi.options ? JSON.parse(oi.options) : null
      }));

      return { ...updatedOrder, items: parsedItems };
    });

    const result = await completeOrder();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Complete order error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
// ─── POST /:id/cancel — ยกเลิกออเดอร์ ──────────────────
router.post('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const db = getDb();

    const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(id));

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบออเดอร์'
      });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'ออเดอร์นี้ถูกยกเลิกไปแล้ว'
      });
    }

    const wasCompleted = order.status === 'completed';
    const branchId = order.branch_id;

    // ใช้ transaction สำหรับยกเลิก + คืนสต็อก
    const cancelOrder = db.transaction(async () => {
      // อัปเดตสถานะและเหตุผล
      await db.prepare(
        "UPDATE orders SET status = 'cancelled', cancel_reason = ? WHERE id = ?"
      ).run(reason || null, Number(id));

      // คืนสต็อกเฉพาะเมื่อออเดอร์ถูก complete ไปแล้ว
      if (wasCompleted) {
        const orderItems = await db.prepare(
          'SELECT * FROM order_items WHERE order_id = ?'
        ).all(Number(id));

        const updateStock = db.prepare(`
          UPDATE branch_stocks 
          SET quantity = quantity + ? 
          WHERE branch_id = ? AND menu_item_id = ? AND quantity IS NOT NULL
        `);
        const getItem = db.prepare(`
          SELECT mi.id, mi.name, bs.quantity as stock 
          FROM menu_items mi
          LEFT JOIN branch_stocks bs ON bs.menu_item_id = mi.id AND bs.branch_id = ?
          WHERE mi.id = ? AND mi.branch_id = ?
        `);
        const insertLog = db.prepare(`
          INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, order_id, staff_id, note, created_at)
          VALUES (?, ?, ?, ?, ?, 'cancel_restore', ?, ?, ?, datetime('now', '+7 hours'))
        `);

        for (const oi of orderItems) {
          const menuItem = await getItem.get(branchId, oi.menu_item_id, branchId);
          if (menuItem && menuItem.stock !== null) {
            const previousStock = menuItem.stock;
            const newStock = previousStock + oi.quantity;

            await updateStock.run(oi.quantity, branchId, oi.menu_item_id);

            await insertLog.run(
              branchId,
              oi.menu_item_id,
              oi.quantity,
              previousStock,
              newStock,
              Number(id),
              req.user.id,
              `ยกเลิกออเดอร์ ${order.order_number} — คืนสต็อก ${oi.item_name} x${oi.quantity} (เหตุผล: ${reason || 'ไม่ได้ระบุ'})`
            );
          }
        }

        // คืนสต็อกซอส/ผง/น้ำจิ้มฟรี (ถ้ามีในออเดอร์)
        if (order.free_modifiers) {
          try {
            const selectedModifiers = JSON.parse(order.free_modifiers);
            if (Array.isArray(selectedModifiers) && selectedModifiers.length > 0) {
              const updateModStock = db.prepare(`
                UPDATE branch_free_modifier_stocks
                SET total_servings = total_servings + 1
                WHERE branch_id = ? AND modifier_id = ?
              `);
              const getModStock = db.prepare(`
                SELECT total_servings FROM branch_free_modifier_stocks
                WHERE branch_id = ? AND modifier_id = ?
              `);
              const insertModLog = db.prepare(`
                INSERT INTO free_modifier_stock_logs (branch_id, modifier_id, change_qty, previous_stock, new_stock, reason, order_id, staff_id, note, created_at)
                VALUES (?, ?, 1, ?, ?, 'cancel_restore', ?, ?, ?, datetime('now', '+7 hours'))
              `);

              for (const mod of selectedModifiers) {
                const currentMod = await getModStock.get(branchId, mod.id);
                const prevModStock = currentMod ? currentMod.total_servings : 0;
                const newModStock = prevModStock + 1;

                await updateModStock.run(branchId, mod.id);
                await insertModLog.run(
                  branchId,
                  mod.id,
                  prevModStock,
                  newModStock,
                  Number(id),
                  req.user.id,
                  `ยกเลิกออเดอร์ ${order.order_number} — คืนสต็อกเครื่องปรุง ${mod.name}`
                );
              }
            }
          } catch (modErr) {
            console.error('⚠️ Error restoring free modifiers stock:', modErr.message);
          }
        }
      }

      // บันทึกกิจกรรมพนักงาน
      await db.prepare(`
        INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
        VALUES (?, ?, 'cancel_order', ?, datetime('now', '+7 hours'))
      `).run(
        branchId,
        req.user.id,
        `ยกเลิกออเดอร์ ${order.order_number} สำเร็จ (เหตุผล: ${reason || 'ไม่ได้ระบุ'})`
      );

      const updatedOrder = await db.prepare(`
        SELECT o.*, u.name as staff_name, b.name as branch_name
        FROM orders o
        LEFT JOIN users u ON u.id = o.staff_id
        LEFT JOIN branches b ON b.id = o.branch_id
        WHERE o.id = ?
      `).get(Number(id));

      const items = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(Number(id));

      return { ...updatedOrder, items };
    });

    const result = await cancelOrder();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Cancel order error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
