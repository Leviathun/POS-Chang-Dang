const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { attachUser, requireAuth } = require('../middleware/auth');
const { getOrCreateSession } = require('./cash_drawers');

// ใช้ middleware ตรวจสอบผู้ใช้ทุก route
router.use(attachUser);

// ─── POST / — สร้างออเดอร์และชำระเงินสำเร็จทันที (Single-step Checkout) ──────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { items, note, discount, modifiers, payment_method, cash_received } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ'
      });
    }

    if (!payment_method || !['cash', 'qr', 'gov', 'delivery'].includes(payment_method)) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุวิธีชำระเงิน (cash, qr, gov หรือ delivery)'
      });
    }

    const db = getDb();

    // หาสาขาของผู้ใช้ (ดึงตรงจาก req.user ที่มีค่าอยู่เสมอเนื่องจากผ่าน requireAuth)
    const branchId = req.user ? req.user.branch_id : 1;

    // ดึงหรือสร้างรอบบัญชีเงินสดประจำวัน (Silent Daily Session)
    const session = await getOrCreateSession(db, branchId);
    const sessionId = session ? session.id : null;

    // รวบรวม IDs ของเมนูและวัตถุดิบทั้งหมดใน cart เพื่อคิวรีครั้งเดียว
    const menuItemIds = [...new Set(items.map(item => Number(item.menu_item_id)))];
    const ingredientIds = [];
    items.forEach(item => {
      if (item.options && Array.isArray(item.options.selected_items)) {
        item.options.selected_items.forEach(ing => {
          ingredientIds.push(Number(ing.id));
        });
      }
    });
    const uniqueIngredientIds = [...new Set(ingredientIds)];

    // รวบรวม IDs ของเครื่องปรุงทั้งหมด
    const modifierIds = [];
    if (modifiers) {
      try {
        const parsedMods = Array.isArray(modifiers) ? modifiers : JSON.parse(modifiers);
        if (Array.isArray(parsedMods)) {
          parsedMods.forEach(m => modifierIds.push(Number(m.id)));
        }
      } catch (e) {}
    }
    const uniqueModifierIds = [...new Set(modifierIds)];

    // ดึงเลขออเดอร์ prefix
    const today = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const dateStr = today.getUTCFullYear().toString() +
      String(today.getUTCMonth() + 1).padStart(2, '0') +
      String(today.getUTCDate()).padStart(2, '0');
    const prefix = `CD-${dateStr}-`;

    // ทำ Parallel Read เพื่อความเร็วสูงสุด (1 round trip)
    const [dbMenuItems, dbIngredients, dbModifiers, orderCountResult, chickenItem] = await Promise.all([
      db.prepare(`
        SELECT id, name, price, active, quantity as stock
        FROM menu_items
        WHERE branch_id = ? AND id IN (${menuItemIds.map(() => '?').join(',')})
      `).all(branchId, ...menuItemIds),
      uniqueIngredientIds.length > 0 ? db.prepare(`
        SELECT id, name, quantity as stock
        FROM menu_items
        WHERE branch_id = ? AND id IN (${uniqueIngredientIds.map(() => '?').join(',')})
      `).all(branchId, ...uniqueIngredientIds) : Promise.resolve([]),
      uniqueModifierIds.length > 0 ? db.prepare(`
        SELECT id, name, total_servings FROM modifiers
        WHERE branch_id = ? AND id IN (${uniqueModifierIds.map(() => '?').join(',')})
      `).all(branchId, ...uniqueModifierIds) : Promise.resolve([]),
      db.prepare(`
        SELECT COUNT(*) as count FROM orders WHERE order_number LIKE ?
      `).get(`${prefix}%`),
      db.prepare(`
        SELECT id, name, quantity as stock FROM menu_items WHERE branch_id = ? AND name = ?
      `).get(branchId, 'ไก่ไร้กระดูก')
    ]);

    // สร้างแผนผังสต็อกในหน่วยความจำสำหรับการตรวจสอบและการตัดสต็อก (เพื่อป้องกันปัญหาการตัดสต็อกข้ามบิลและการตัดสต็อกล่าช้า)
    const stockMap = new Map();
    dbMenuItems.forEach(item => {
      if (item.stock !== null && item.stock !== undefined) {
        stockMap.set(Number(item.id), Number(item.stock));
      }
    });
    dbIngredients.forEach(item => {
      if (item.stock !== null && item.stock !== undefined) {
        stockMap.set(Number(item.id), Number(item.stock));
      }
    });
    if (chickenItem && chickenItem.stock !== null && chickenItem.stock !== undefined) {
      stockMap.set(Number(chickenItem.id), Number(chickenItem.stock));
    }

    // สร้างแผนผังสต็อกชั่วคราวสำหรับขั้นตอนตรวจสอบความถูกต้อง (เพื่อป้องกันการซื้อเกินจำนวนที่มีอยู่จริงในตะกร้าเดียวกัน)
    const validationStockMap = new Map(stockMap);

    // สร้างข้อมูลและตรวจเช็คธุรกิจใน Memory
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      if (!item.menu_item_id || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: 'ข้อมูลสินค้าไม่ถูกต้อง — ต้องระบุ menu_item_id และ quantity'
        });
      }

      const menuItem = dbMenuItems.find(m => m.id === Number(item.menu_item_id));
      if (!menuItem) {
        return res.status(400).json({
          success: false,
          error: `ไม่พบเมนู ID: ${item.menu_item_id}`
        });
      }

      if (!menuItem.active) {
        return res.status(400).json({
          success: false,
          error: `เมนู "${menuItem.name}" ถูกปิดใช้งาน`
        });
      }

      // ตรวจสอบสต็อกของเมนูหรือส่วนผสม
      if (item.options && Array.isArray(item.options.selected_items)) {
        for (const ingredient of item.options.selected_items) {
          const ingId = Number(ingredient.id);
          const ingStock = validationStockMap.get(ingId);
          const requiredQty = Number(ingredient.weight) * item.quantity;
          if (ingStock !== undefined && ingStock !== null) {
            if (ingStock < requiredQty) {
              const ingOriginal = dbIngredients.find(i => i.id === ingId) || { name: ingredient.name };
              return res.status(400).json({
                success: false,
                error: `วัตถุดิบ "${ingOriginal.name}" สต็อกไม่เพียงพอ (ต้องการ ${Math.round(requiredQty * 100) / 100} ก. แต่เหลือ ${Math.round(ingStock * 100) / 100} ก.)`
              });
            }
            // ตัดยอดชั่วคราวในแผนผังสำหรับตรวจสอบรายการถัดไปในบิลเดียวกัน
            validationStockMap.set(ingId, Math.round((ingStock - requiredQty) * 100) / 100);
          }
        }
      } else {
        const mId = Number(item.menu_item_id);
        const mStock = validationStockMap.get(mId);
        if (mStock !== undefined && mStock !== null) {
          if (mStock < item.quantity) {
            return res.status(400).json({
              success: false,
              error: `เมนู "${menuItem.name}" สต็อกไม่เพียงพอ (เหลือ ${Math.round(mStock * 100) / 100} ชิ้น)`
            });
          }
          // ตัดยอดชั่วคราวในแผนผังสำหรับตรวจสอบรายการถัดไปในบิลเดียวกัน
          validationStockMap.set(mId, Math.round((mStock - item.quantity) * 100) / 100);
        }
      }

      // ตรวจสอบสต็อกไก่ไร้กระดูก สำหรับแร็ปไก่
      if (menuItem.name.includes('แร็ปไก่') && chickenItem) {
        const chickenId = Number(chickenItem.id);
        const cStock = validationStockMap.get(chickenId);
        if (cStock !== undefined && cStock !== null) {
          const requiredChicken = item.quantity;
          if (cStock < requiredChicken) {
            return res.status(400).json({
              success: false,
              error: `วัตถุดิบ "ไก่ไร้กระดูก" สต็อกไม่เพียงพอสำหรับเมนูแร็ปไก่ (ต้องการ ${requiredChicken} ชิ้น แต่เหลือ ${cStock} ชิ้น)`
            });
          }
          // ตัดยอดชั่วคราวในแผนผังสำหรับตรวจสอบรายการถัดไปในบิลเดียวกัน
          validationStockMap.set(chickenId, Math.round((cStock - requiredChicken) * 100) / 100);
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
      return res.status(400).json({
        success: false,
        error: 'ส่วนลดมากกว่ายอดรวม'
      });
    }

    // คำนวณเงินทอน (ถ้าเป็นเงินสด)
    let cashChange = null;
    if (payment_method === 'cash') {
      if (cash_received === undefined || cash_received === null || Number(cash_received) < total) {
        return res.status(400).json({
          success: false,
          error: 'จำนวนเงินที่รับไม่เพียงพอ'
        });
      }
      cashChange = Number(cash_received) - total;
    }

    // สร้างเลขออเดอร์
    const num = (orderCountResult.count + 1).toString().padStart(3, '0');
    const orderNumber = `${prefix}${num}`;

    // รวบรวมคำสั่ง SQL เพื่อรันใน Transaction batch เดียว (1 write round trip)
    const statements = [];

    // 1. บันทึกออเดอร์ (ดึง id และ created_at กลับมาทันทีในขั้นตอน batch)
    statements.push({
      sql: `INSERT INTO orders (branch_id, order_number, staff_id, subtotal, discount, total, payment_method, cash_received, cash_change, status, note, modifiers, session_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, datetime('now', '+7 hours'))
            RETURNING id, created_at`,
      args: [
        branchId,
        orderNumber,
        req.user.id,
        subtotal,
        orderDiscount,
        total,
        payment_method,
        cash_received || null,
        cashChange,
        note || null,
        modifiers ? (typeof modifiers === 'string' ? modifiers : JSON.stringify(modifiers)) : null,
        sessionId
      ]
    });

    // 2. บันทึกรายการสินค้าในออเดอร์
    for (const oi of orderItems) {
      statements.push({
        sql: `INSERT INTO order_items (order_id, menu_item_id, item_name, item_price, quantity, subtotal, options)
              VALUES ((SELECT id FROM orders WHERE order_number = ?), ?, ?, ?, ?, ?, ?)`,
        args: [
          orderNumber,
          oi.menu_item_id,
          oi.item_name,
          oi.item_price,
          oi.quantity,
          oi.subtotal,
          oi.options
        ]
      });
    }

    // 3. คำสั่งหักสต็อกและเขียนประวัติสต็อก
    for (const oi of orderItems) {
      let optionsObj = null;
      if (oi.options) {
        try { optionsObj = JSON.parse(oi.options); } catch (e) {}
      }

      if (optionsObj && Array.isArray(optionsObj.selected_items) && optionsObj.selected_items.length > 0) {
        for (const ingredient of optionsObj.selected_items) {
          const ingId = Number(ingredient.id);
          if (stockMap.has(ingId)) {
            const previousStock = stockMap.get(ingId);
            const deductAmount = Number(ingredient.weight) * oi.quantity;
            const newStock = Math.round((previousStock - deductAmount) * 100) / 100;
            stockMap.set(ingId, newStock);

            statements.push({
              sql: `UPDATE menu_items SET quantity = ROUND(quantity - ?, 2) WHERE branch_id = ? AND id = ? AND quantity IS NOT NULL`,
              args: [deductAmount, branchId, ingId]
            });

            statements.push({
              sql: `INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, order_id, staff_id, note, created_at)
                    VALUES (?, ?, ?, ?, ?, 'sale', (SELECT id FROM orders WHERE order_number = ?), ?, ?, datetime('now', '+7 hours'))`,
              args: [
                branchId,
                ingId,
                -deductAmount,
                previousStock,
                newStock,
                orderNumber,
                req.user.id,
                `ขาย ${oi.item_name} (วัตถุดิบ: ${ingredient.name} ${deductAmount}ก.) (${orderNumber})`
              ]
            });
          }
        }
      } else {
        const mId = Number(oi.menu_item_id);
        const menuItem = dbMenuItems.find(i => i.id === mId);
        
        if (stockMap.has(mId)) {
          const previousStock = stockMap.get(mId);
          const newStock = Math.round((previousStock - oi.quantity) * 100) / 100;
          stockMap.set(mId, newStock);

          statements.push({
            sql: `UPDATE menu_items SET quantity = ROUND(quantity - ?, 2) WHERE branch_id = ? AND id = ? AND quantity IS NOT NULL`,
            args: [oi.quantity, branchId, mId]
          });

          statements.push({
            sql: `INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, order_id, staff_id, note, created_at)
                  VALUES (?, ?, ?, ?, ?, 'sale', (SELECT id FROM orders WHERE order_number = ?), ?, ?, datetime('now', '+7 hours'))`,
            args: [
              branchId,
              mId,
              -oi.quantity,
              previousStock,
              newStock,
              orderNumber,
              req.user.id,
              `ขาย ${oi.item_name} x${oi.quantity} (${orderNumber})`
            ]
          });
        }

        // Auto-deduct ไก่ไร้กระดูก if this item is แร็ปไก่
        if (menuItem && menuItem.name.includes('แร็ปไก่') && chickenItem) {
          const chickenId = Number(chickenItem.id);
          if (stockMap.has(chickenId)) {
            const previousChickenStock = stockMap.get(chickenId);
            const deductChickenAmount = oi.quantity * 1;
            const newChickenStock = Math.round((previousChickenStock - deductChickenAmount) * 100) / 100;
            stockMap.set(chickenId, newChickenStock);

            statements.push({
              sql: `UPDATE menu_items SET quantity = ROUND(quantity - ?, 2) WHERE branch_id = ? AND id = ? AND quantity IS NOT NULL`,
              args: [deductChickenAmount, branchId, chickenId]
            });

            statements.push({
              sql: `INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, order_id, staff_id, note, created_at)
                    VALUES (?, ?, ?, ?, ?, 'sale', (SELECT id FROM orders WHERE order_number = ?), ?, ?, datetime('now', '+7 hours'))`,
              args: [
                branchId,
                chickenId,
                -deductChickenAmount,
                previousChickenStock,
                newChickenStock,
                orderNumber,
                req.user.id,
                `ขาย ${oi.item_name} x${oi.quantity} (หัก ไก่ไร้กระดูก x${deductChickenAmount}) (${orderNumber})`
              ]
            });
          }
        }
      }
    }

    // 4. คำสั่งหักสต็อกเครื่องปรุง (Modifiers)
    if (modifiers) {
      try {
        const selectedModifiers = Array.isArray(modifiers) ? modifiers : JSON.parse(modifiers);
        if (Array.isArray(selectedModifiers) && selectedModifiers.length > 0) {
          for (const mod of selectedModifiers) {
            const currentMod = dbModifiers.find(m => m.id === Number(mod.id));
            if (currentMod && currentMod.total_servings !== null) {
              const prevModStock = currentMod.total_servings;
              const newModStock = prevModStock - 1;

              statements.push({
                sql: `UPDATE modifiers SET total_servings = total_servings - 1 WHERE branch_id = ? AND id = ? AND total_servings IS NOT NULL`,
                args: [branchId, mod.id]
              });

              statements.push({
                sql: `INSERT INTO modifier_stock_logs (branch_id, modifier_id, change_qty, previous_stock, new_stock, reason, order_id, staff_id, note, created_at)
                      VALUES (?, ?, -1, ?, ?, 'sale', (SELECT id FROM orders WHERE order_number = ?), ?, ?, datetime('now', '+7 hours'))`,
                args: [
                  branchId,
                  mod.id,
                  prevModStock,
                  newModStock,
                  orderNumber,
                  req.user.id,
                  `ใช้เครื่องปรุง ${mod.name} ในออเดอร์ ${orderNumber}`
                ]
              });
            }
          }
        }
      } catch (modErr) {
        console.error('⚠️ Error building modifiers batch:', modErr.message);
      }
    }

    statements.push({
      sql: `INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
            VALUES (?, ?, 'complete_order', ?, datetime('now', '+7 hours'))`,
      args: [
        branchId,
        req.user.id,
        `สร้างออเดอร์และชำระเงินสำเร็จ เลขที่ ${orderNumber} ยอดรวม ${total} บาท`
      ]
    });

    // รันธุรกรรมบันทึกทั้งหมดในครั้งเดียว (ได้ผลลัพธ์ของคำสั่งแรกกลับมาทันที)
    const batchResults = await db.batch(statements);
    const orderResult = batchResults[0];
    const insertedOrderRow = orderResult && orderResult.rows && orderResult.rows[0];
    if (!insertedOrderRow) {
      throw new Error('ไม่สามารถบันทึกบิลลงในฐานข้อมูลได้');
    }

    const orderId = Number(insertedOrderRow.id);
    const createdAt = insertedOrderRow.created_at;

    // ประกอบออบเจ็กต์ข้อมูลออเดอร์ขากลับจากหน่วยความจำโดยไม่ต้องคิวรีซ้ำ (เซฟไปอีก 2 round trips)
    const mockOrder = {
      id: orderId,
      branch_id: branchId,
      order_number: orderNumber,
      staff_id: req.user.id,
      subtotal,
      discount: orderDiscount,
      total,
      payment_method,
      cash_received: cash_received || null,
      cash_change: cashChange,
      status: 'completed',
      note: note || null,
      cancel_reason: null,
      modifiers: modifiers ? (typeof modifiers === 'string' ? modifiers : JSON.stringify(modifiers)) : null,
      created_at: createdAt
    };

    const parsedItems = orderItems.map((oi) => ({
      id: null, // order_items id ไม่จำเป็นสำหรับการแสดงผลหน้าชำระเงินสำเร็จ
      order_id: orderId,
      menu_item_id: oi.menu_item_id,
      item_name: oi.item_name,
      item_price: oi.item_price,
      quantity: oi.quantity,
      subtotal: oi.subtotal,
      options: oi.options ? JSON.parse(oi.options) : null
    }));

    res.status(201).json({
      success: true,
      data: {
        ...mockOrder,
        items: parsedItems
      }
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
      sql += ' AND o.created_at >= ? AND o.created_at <= ?';
      params.push(`${date} 00:00:00`, `${date} 23:59:59`);
    } else if (month) {
      const [yr, mo] = month.split('-');
      let nextYr = Number(yr);
      let nextMo = Number(mo) + 1;
      if (nextMo > 12) {
        nextMo = 1;
        nextYr += 1;
      }
      sql += ' AND o.created_at >= ? AND o.created_at < ?';
      params.push(`${month}-01 00:00:00`, `${nextYr}-${String(nextMo).padStart(2, '0')}-01 00:00:00`);
    } else if (year) {
      sql += ' AND o.created_at >= ? AND o.created_at < ?';
      params.push(`${year}-01-01 00:00:00`, `${Number(year) + 1}-01-01 00:00:00`);
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
    const formattedOrders = orders;

    res.json({
      success: true,
      data: formattedOrders
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
      data: {
        ...order,
        items: parsedItems
      }
    });
  } catch (error) {
    console.error('❌ Get order error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลออเดอร์'
    });
  }
});

// ─── POST /:id/complete — ชำระเงิน/เสร็จสิ้น (Stubbed for backwards-compatibility)
router.post('/:id/complete', (req, res) => {
  res.json({
    success: true,
    message: 'ชำระเงินเสร็จสิ้นแล้ว (Single-step checkout)'
  });
});

// ─── POST /:id/cancel — ยกเลิกออเดอร์ ──────────────────
router.post('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const db = getDb();

    // 1. ดึงข้อมูลออเดอร์จากฐานข้อมูล (อ่านโลคอล เร็วมาก <5ms)
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

    const branchId = order.branch_id;

    // 2. ดึงรายการสินค้าในออเดอร์ (อ่านโลคอล เร็วมาก <5ms)
    const orderItems = await db.prepare(
      'SELECT * FROM order_items WHERE order_id = ?'
    ).all(Number(id));

    // รวบรวม IDs เมนูและส่วนผสมเพื่อดึงข้อมูลสต็อกพร้อมกัน
    const menuItemIds = [];
    const ingredientIds = [];
    for (const oi of orderItems) {
      menuItemIds.push(oi.menu_item_id);
      let optionsObj = null;
      if (oi.options) {
        try { optionsObj = JSON.parse(oi.options); } catch (e) {}
      }
      if (optionsObj && Array.isArray(optionsObj.selected_items)) {
        optionsObj.selected_items.forEach(ing => {
          ingredientIds.push(Number(ing.id));
        });
      }
    }

    const uniqueMenuItemIds = [...new Set(menuItemIds)];
    const uniqueIngredientIds = [...new Set(ingredientIds)];

    // รวบรวม IDs ของเครื่องปรุง (Modifiers)
    const modifierIds = [];
    if (order.modifiers) {
      try {
        const selectedModifiers = JSON.parse(order.modifiers);
        if (Array.isArray(selectedModifiers)) {
          selectedModifiers.forEach(mod => modifierIds.push(Number(mod.id)));
        }
      } catch (e) {}
    }
    const uniqueModifierIds = [...new Set(modifierIds)];

    // ทำ Parallel Read ดึงสต็อกทั้งหมดพร้อมกันในครั้งเดียว (เร็วมาก <10ms)
    const [dbMenuItems, dbIngredients, dbModifiers, chickenItem] = await Promise.all([
      uniqueMenuItemIds.length > 0 ? db.prepare(`
        SELECT id, name, quantity as stock FROM menu_items 
        WHERE branch_id = ? AND id IN (${uniqueMenuItemIds.map(() => '?').join(',')})
      `).all(branchId, ...uniqueMenuItemIds) : Promise.resolve([]),
      uniqueIngredientIds.length > 0 ? db.prepare(`
        SELECT id, name, quantity as stock FROM menu_items 
        WHERE branch_id = ? AND id IN (${uniqueIngredientIds.map(() => '?').join(',')})
      `).all(branchId, ...uniqueIngredientIds) : Promise.resolve([]),
      uniqueModifierIds.length > 0 ? db.prepare(`
        SELECT id, name, total_servings FROM modifiers 
        WHERE branch_id = ? AND id IN (${uniqueModifierIds.map(() => '?').join(',')})
      `).all(branchId, ...uniqueModifierIds) : Promise.resolve([]),
      db.prepare(`
        SELECT id, name, quantity as stock FROM menu_items WHERE branch_id = ? AND name = ?
      `).get(branchId, 'ไก่ไร้กระดูก')
    ]);

    // รวบรวมคำสั่ง SQL ทั้งหมดเพื่อรันใน Transaction batch เดียว (1 write round trip!)
    const statements = [];

    // 1. อัปเดตสถานะออเดอร์และเหตุผลที่ยกเลิก
    statements.push({
      sql: `UPDATE orders SET status = 'cancelled', cancel_reason = ? WHERE id = ?`,
      args: [reason || null, Number(id)]
    });

    // 2. คำสั่งคืนสต็อกของเมนูหรือส่วนผสม
    for (const oi of orderItems) {
      let optionsObj = null;
      if (oi.options) {
        try { optionsObj = JSON.parse(oi.options); } catch (e) {}
      }

      if (optionsObj && Array.isArray(optionsObj.selected_items) && optionsObj.selected_items.length > 0) {
        // คืนสต็อกวัตถุดิบแยกแต่ละส่วนผสม
        for (const ingredient of optionsObj.selected_items) {
          const ingItem = dbIngredients.find(i => i.id === Number(ingredient.id));
          if (ingItem && ingItem.stock !== null) {
            const previousStock = ingItem.stock;
            const restoreAmount = Number(ingredient.weight) * oi.quantity;
            const newStock = Math.round((previousStock + restoreAmount) * 100) / 100;

            ingItem.stock = newStock; // อัปเดตสต็อกจำลองใน loop

            statements.push({
              sql: `UPDATE menu_items SET quantity = ROUND(quantity + ?, 2) WHERE branch_id = ? AND id = ? AND quantity IS NOT NULL`,
              args: [restoreAmount, branchId, Number(ingredient.id)]
            });

            statements.push({
              sql: `INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, order_id, staff_id, note, created_at)
                    VALUES (?, ?, ?, ?, ?, 'cancel_restore', ?, ?, ?, datetime('now', '+7 hours'))`,
              args: [
                branchId,
                Number(ingredient.id),
                restoreAmount,
                previousStock,
                newStock,
                Number(id),
                req.user.id,
                `ยกเลิกออเดอร์ ${order.order_number} — คืนวัตถุดิบ ${ingredient.name} ${restoreAmount}ก. (เหตุผล: ${reason || 'ไม่ได้ระบุ'})`
              ]
            });
          }
        }
      } else {
        // คืนสต็อกสินค้าปกติ
        const menuItem = dbMenuItems.find(i => i.id === oi.menu_item_id);
        if (menuItem && menuItem.stock !== null) {
          const previousStock = menuItem.stock;
          const newStock = Math.round((previousStock + oi.quantity) * 100) / 100;
          
          menuItem.stock = newStock; // อัปเดตสต็อกจำลองใน loop

          statements.push({
            sql: `UPDATE menu_items SET quantity = ROUND(quantity + ?, 2) WHERE branch_id = ? AND id = ? AND quantity IS NOT NULL`,
            args: [oi.quantity, branchId, oi.menu_item_id]
          });

          statements.push({
            sql: `INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, order_id, staff_id, note, created_at)
                  VALUES (?, ?, ?, ?, ?, 'cancel_restore', ?, ?, ?, datetime('now', '+7 hours'))`,
              args: [
                branchId,
                oi.menu_item_id,
                oi.quantity,
                previousStock,
                newStock,
                Number(id),
                req.user.id,
                `ยกเลิกออเดอร์ ${order.order_number} — คืนสต็อก ${oi.item_name} x${oi.quantity} (เหตุผล: ${reason || 'ไม่ได้ระบุ'})`
              ]
          });
        }

        // คืนสต็อกไก่ไร้กระดูก สำหรับเมนูแร็ปไก่
        if (oi.item_name && oi.item_name.includes('แร็ปไก่') && chickenItem && chickenItem.stock !== null) {
          const previousChickenStock = chickenItem.stock;
          const restoreChickenAmount = oi.quantity * 1;
          const newChickenStock = Math.round((previousChickenStock + restoreChickenAmount) * 100) / 100;
          
          chickenItem.stock = newChickenStock; // อัปเดตสต็อกจำลองใน loop

          statements.push({
            sql: `UPDATE menu_items SET quantity = ROUND(quantity + ?, 2) WHERE branch_id = ? AND id = ? AND quantity IS NOT NULL`,
            args: [restoreChickenAmount, branchId, chickenItem.id]
          });

          statements.push({
            sql: `INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, order_id, staff_id, note, created_at)
                  VALUES (?, ?, ?, ?, ?, 'cancel_restore', ?, ?, ?, datetime('now', '+7 hours'))`,
            args: [
              branchId,
              chickenItem.id,
              restoreChickenAmount,
              previousChickenStock,
              newChickenStock,
              Number(id),
              req.user.id,
              `ยกเลิกออเดอร์ ${order.order_number} — คืนวัตถุดิบ ไก่ไร้กระดูก x${restoreChickenAmount} (เหตุผล: ${reason || 'ไม่ได้ระบุ'})`
            ]
          });
        }
      }
    }

    // 3. คืนสต็อกเครื่องปรุง (Modifiers)
    if (order.modifiers) {
      try {
        const selectedModifiers = JSON.parse(order.modifiers);
        if (Array.isArray(selectedModifiers) && selectedModifiers.length > 0) {
          for (const mod of selectedModifiers) {
            const currentMod = dbModifiers.find(m => m.id === Number(mod.id));
            if (currentMod && currentMod.total_servings !== null) {
              const prevModStock = currentMod.total_servings;
              const newModStock = prevModStock + 1;
              
              currentMod.total_servings = newModStock; // อัปเดตสต็อกจำลองใน loop

              statements.push({
                sql: `UPDATE modifiers SET total_servings = total_servings + 1 WHERE branch_id = ? AND id = ? AND total_servings IS NOT NULL`,
                args: [branchId, mod.id]
              });

              statements.push({
                sql: `INSERT INTO modifier_stock_logs (branch_id, modifier_id, change_qty, previous_stock, new_stock, reason, order_id, staff_id, note, created_at)
                      VALUES (?, ?, 1, ?, ?, 'cancel_restore', ?, ?, ?, datetime('now', '+7 hours'))`,
                args: [
                  branchId,
                  mod.id,
                  prevModStock,
                  newModStock,
                  Number(id),
                  req.user.id,
                  `ยกเลิกออเดอร์ ${order.order_number} — คืนสต็อกเครื่องปรุง ${mod.name}`
                ]
              });
            }
          }
        }
      } catch (modErr) {
        console.error('⚠️ Error restoring modifiers stock:', modErr.message);
      }
    }

    // 4. บันทึกกิจกรรมพนักงาน
    statements.push({
      sql: `INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
            VALUES (?, ?, 'cancel_order', ?, datetime('now', '+7 hours'))`,
      args: [
        branchId,
        req.user.id,
        `ยกเลิกออเดอร์ ${order.order_number} สำเร็จ (เหตุผล: ${reason || 'ไม่ได้ระบุ'})`
      ]
    });

    // 5. รันคำสั่งทั้งหมดใน transaction batch เดียว (1 write round trip!)
    await db.batch(statements);

    // 6. ประกอบข้อมูลบิลที่ยกเลิกขากลับในหน่วยความจำโดยไม่ต้องคิวรีซ้ำ
    const mockUpdatedOrder = {
      ...order,
      status: 'cancelled',
      cancel_reason: reason || null
    };

    res.json({
      success: true,
      data: {
        ...mockUpdatedOrder,
        items: orderItems.map(oi => ({
          ...oi,
          options: oi.options ? JSON.parse(oi.options) : null
        }))
      }
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
