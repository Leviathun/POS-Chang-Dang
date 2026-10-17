const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { attachUser, requireManagerOrAdmin } = require('../middleware/auth');
const { getOrCreateSession } = require('./cash_drawers');

const getCategoryLabel = (cat) => {
  const map = {
    'raw_materials': 'วัตถุดิบและของสดทั่วไป',
    'gas_fuel': 'แก๊สและเชื้อเพลิง',
    'packaging': 'บรรจุภัณฑ์/แพ็คเกจ',
    'raw_chicken': 'ของสด: ไก่ดิบ',
    'ice': 'ของสด: น้ำแข็ง',
    'sticky_rice': 'ของสด: ข้าวเหนียว',
    'meatballs': 'ของสด: ลูกชิ้น',
    'salapao': 'ของสด: ซาลาเปา',
    'cooking_oil': 'น้ำมันพืช/น้ำมันทอด',
    'fuel_transport': 'น้ำมันรถ/การเดินทาง',
    'fuel_oil': 'น้ำมันพืช/ทอด',
    'gas_lpg': 'แก๊ส LPG',
    'salary': 'ค่าแรงพนักงาน/เงินเดือน',
    'utility_bills': 'ค่าน้ำ/ค่าไฟ/ค่าเน็ต',
    'debt': 'ชำระหนี้/ยอดค้าง',
    'other': 'ค่าใช้จ่ายอื่นๆ'
  };
  return map[cat] || cat;
};

// Apply auth middleware to all routes
router.use(attachUser);
router.use(requireManagerOrAdmin);

// ─── POST / — Create New Expense ────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { amount, category, note, expense_date, payment_method } = req.body;
    const db = getDb();

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุจำนวนเงินที่ถูกต้อง (มากกว่า 0)'
      });
    }

    const validCategories = [
      'raw_materials', 'gas_fuel', 'packaging', 'other', 'raw_chicken', 
      'ice', 'sticky_rice', 'meatballs', 'salapao', 'cooking_oil', 'fuel_transport', 
      'fuel_oil', 'gas_lpg', 'salary', 'utility_bills', 'debt'
    ];

    if (!category || !validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุหมวดหมู่ที่ถูกต้อง'
      });
    }

    const paymentMethod = payment_method || 'cash';
    if (!['cash', 'transfer'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุช่องทางการชำระเงินที่ถูกต้อง (cash หรือ transfer)'
      });
    }

    let branchId = req.user.branch_id;
    if (req.user.role === 'admin' && req.body.branch_id) {
      branchId = Number(req.body.branch_id);
    } else if (!branchId) {
      const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
      branchId = defaultBranch ? defaultBranch.id : null;
    }

    const dateVal = expense_date || new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split('T')[0];

    const activityDetails = `บันทึกค่าใช้จ่าย หมวดหมู่ ${getCategoryLabel(category)} จำนวน ${amount} บาท${note ? ` (บันทึกเพิ่มเติม: ${note})` : ''}`;

    const createdAtVal = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    const statements = [
      {
        sql: `INSERT INTO expenses (branch_id, staff_id, amount, category, note, expense_date, session_id, payment_method, created_at)
              VALUES (?, ?, ?, ?, ?, ?, (SELECT id FROM cash_drawer_sessions WHERE branch_id = ? AND session_date = ? LIMIT 1), ?, ?)`,
        args: [branchId, req.user.id, amount, category, note || null, dateVal, branchId, dateVal, paymentMethod, createdAtVal]
      },
      {
        sql: `INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
              VALUES (?, ?, 'log_expense', ?, ?)`,
        args: [branchId, req.user.id, activityDetails, createdAtVal]
      }
    ];

    // บันทึกแบบกลุ่ม (Batch) เพื่อไปกลับฐานข้อมูลรอบเดียวแทนการส่งทีละคำสั่ง (ลด Latency ลง 3 เท่า)
    const batchRes = await db.batch(statements);
    const expenseInsertRes = batchRes[0];
    const insertedId = expenseInsertRes && expenseInsertRes.lastInsertRowid !== undefined && expenseInsertRes.lastInsertRowid !== null
      ? Number(expenseInsertRes.lastInsertRowid)
      : null;

    res.status(201).json({
      success: true,
      data: {
        id: insertedId,
        branch_id: branchId,
        staff_id: req.user.id,
        amount,
        category,
        note,
        expense_date: dateVal,
        payment_method: paymentMethod,
        created_at: createdAtVal
      }
    });
  } catch (error) {
    console.error('❌ Create expense error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการบันทึกค่าใช้จ่าย'
    });
  }
});

// ─── GET / — List Expenses (by Date or Month) ───────────────────────
router.get('/', async (req, res) => {
  try {
    const { date, month, year, category } = req.query;
    const db = getDb();

    let branchId = req.user.branch_id;
    if (req.user.role === 'admin' && req.query.branch_id) {
      branchId = Number(req.query.branch_id);
    } else if (!branchId) {
      const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
      branchId = defaultBranch ? defaultBranch.id : null;
    }

    let categoryFilter = '';
    const categoryParams = [];
    if (category && category !== 'all') {
      categoryFilter = ' AND e.category = ?';
      categoryParams.push(category);
    }

    let expenses;
    if (year) {
      expenses = await db.prepare(`
        SELECT e.*, u.name as staff_name 
        FROM expenses e
        LEFT JOIN users u ON u.id = e.staff_id
        WHERE e.branch_id = ? AND e.expense_date >= ? AND e.expense_date < ?${categoryFilter}
        ORDER BY e.expense_date DESC, e.created_at DESC
      `).all(branchId, `${year}-01-01`, `${Number(year) + 1}-01-01`, ...categoryParams);
    } else if (month) {
      const [yr, mo] = month.split('-');
      let nextYr = Number(yr);
      let nextMo = Number(mo) + 1;
      if (nextMo > 12) {
        nextMo = 1;
        nextYr += 1;
      }
      expenses = await db.prepare(`
        SELECT e.*, u.name as staff_name 
        FROM expenses e
        LEFT JOIN users u ON u.id = e.staff_id
        WHERE e.branch_id = ? AND e.expense_date >= ? AND e.expense_date < ?${categoryFilter}
        ORDER BY e.expense_date DESC, e.created_at DESC
      `).all(branchId, `${month}-01`, `${nextYr}-${String(nextMo).padStart(2, '0')}-01`, ...categoryParams);
    } else if (date) {
      expenses = await db.prepare(`
        SELECT e.*, u.name as staff_name 
        FROM expenses e
        LEFT JOIN users u ON u.id = e.staff_id
        WHERE e.branch_id = ? AND e.expense_date = ?${categoryFilter}
        ORDER BY e.created_at DESC
      `).all(branchId, date, ...categoryParams);
    } else {
      expenses = await db.prepare(`
        SELECT e.*, u.name as staff_name 
        FROM expenses e
        LEFT JOIN users u ON u.id = e.staff_id
        WHERE e.branch_id = ?${categoryFilter}
        ORDER BY e.expense_date DESC, e.created_at DESC
      `).all(branchId, ...categoryParams);
    }

    res.json({
      success: true,
      data: expenses
    });
  } catch (error) {
    console.error('❌ Get expenses error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลค่าใช้จ่าย'
    });
  }
});

// ─── POST /:id/reverse — ยกเลิก & คืนยอดรายจ่าย (Reversal / Audit Trail) ───
router.post('/:id/reverse', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const db = getDb();

    let branchId = (req.user && req.user.branch_id) ? req.user.branch_id : null;
    if (!branchId) {
      const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
      branchId = defaultBranch ? defaultBranch.id : 1;
    }
    const userId = (req.user && req.user.id) ? req.user.id : 1;

    const expense = await db.prepare('SELECT * FROM expenses WHERE id = ?').get(Number(id));
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบรายการค่าใช้จ่าย'
      });
    }

    if (expense.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'รายการนี้ถูกยกเลิก/คืนยอดไปแล้ว'
      });
    }

    if (expense.is_refund === 1 || expense.status === 'refund') {
      return res.status(400).json({
        success: false,
        error: 'ไม่สามารถยกเลิกรายการคืนเงินซ้ำได้'
      });
    }

    const cancelReason = reason || 'ยกเลิกรายการโดยผู้ใช้';
    const nowLocal = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    const todayDate = nowLocal.substring(0, 10);

    // 1. ทำเครื่องหมายรายการเดิมว่า 'cancelled'
    await db.prepare(`
      UPDATE expenses SET
        status = 'cancelled',
        cancelled_at = ?,
        cancelled_by = ?,
        cancel_reason = ?
      WHERE id = ?
    `).run(nowLocal, userId, cancelReason, Number(id));

    // 2. ถ้าเป็นค่าแรง/เงินเดือนที่ผูกกับสลิป (employee_payrolls)
    let payrollUnlocked = false;
    const linkedPayroll = await db.prepare('SELECT * FROM employee_payrolls WHERE expense_id = ? OR id = ?').get(Number(id), Number(id));
    if (linkedPayroll && linkedPayroll.status !== 'cancelled') {
      await db.prepare(`
        UPDATE employee_payrolls SET
          status = 'cancelled',
          cancelled_at = ?,
          cancelled_by = ?,
          cancel_reason = ?
        WHERE id = ?
      `).run(nowLocal, userId, `ยกเลิกตามรายการค่าใช้จ่าย #${id}`, linkedPayroll.id);

      // ปลดล็อกวันทำงาน
      await db.prepare(`
        UPDATE employee_attendance SET
          is_paid = 0,
          payroll_id = NULL
        WHERE payroll_id = ?
      `).run(linkedPayroll.id);

      // ปลดล็อก OT พิเศษ
      await db.prepare(`
        UPDATE employee_event_ot_participants SET
          is_paid = 0,
          payroll_id = NULL
        WHERE payroll_id = ?
      `).run(linkedPayroll.id);

      // ปลดล็อกเงินเบิกล่วงหน้า
      await db.prepare(`
        UPDATE employee_advances SET
          status = 'pending',
          payroll_id = NULL
        WHERE payroll_id = ?
      `).run(linkedPayroll.id);

      // ถ้ามีการหักเงินประกันในสลิปนี้ ให้ลบรายการ held ที่เกิดจากสลิปนี้
      if (linkedPayroll.holdback_deducted_amount > 0) {
        try {
          await db.prepare(`
            DELETE FROM employee_guarantees 
            WHERE user_id = ? AND status = 'held' AND note LIKE ?
          `).run(linkedPayroll.user_id, `%สลิป #${linkedPayroll.id}%`);
        } catch (gErr) {
          console.warn('⚠️ Revert guarantee deduction warning:', gErr.message);
        }
      }
      payrollUnlocked = true;
    }

    // 3. ถ้าเป็นเงินเบิกล่วงหน้า (employee_advances) ที่ผูกกับ expense_id
    try {
      await db.prepare(`
        UPDATE employee_advances SET
          status = 'cancelled'
        WHERE expense_id = ? AND status != 'cancelled'
      `).run(Number(id));
    } catch (advErr) {
      console.warn('⚠️ Cancel linked advance warning:', advErr.message);
    }

    // 4. ถ้าเป็นค่าใช้จ่ายที่มาจากการเบิกของครัวกลาง (central_kitchen_transfers)
    // Auto-Sync: ดึงสต็อกสินค้าคืนเข้าครัวกลาง และปรับสถานะใบเบิกเป็น cancelled (ไม่สร้างแถวคืนเงิน)
    let isCKTransfer = false;
    let ckTransferRestored = false;
    let ckTransferNo = '';
    let ckItemsRestoredCount = 0;
    try {
      let linkedTransfer = await db.prepare('SELECT * FROM central_kitchen_transfers WHERE expense_id = ?').get(Number(id));
      
      // ค้นหาเพิ่มเติมจาก transfer_no ใน note เผื่อกรณี expense_id ไม่ตรง
      if (!linkedTransfer && expense.note && (expense.note.includes('เบิกของจากครัวกลาง') || expense.note.includes('ครัวกลาง'))) {
        const matchNo = expense.note.match(/#(REQ-[\w-]+)/);
        if (matchNo && matchNo[1]) {
          linkedTransfer = await db.prepare('SELECT * FROM central_kitchen_transfers WHERE transfer_no = ?').get(matchNo[1]);
        }
      }

      if (linkedTransfer || (expense.note && (expense.note.includes('เบิกของจากครัวกลาง') || expense.note.includes('ครัวกลาง')))) {
        isCKTransfer = true;
      }

      if (linkedTransfer && linkedTransfer.status !== 'cancelled') {
        ckTransferNo = linkedTransfer.transfer_no;
        const transferItems = await db.prepare('SELECT * FROM central_kitchen_transfer_items WHERE transfer_id = ?').all(linkedTransfer.id);
        
        // คืนสต็อกสินค้ากลับเข้าครัวกลาง (central_kitchen_items) และดึงสต็อก POS สาขาคืน
        for (const item of transferItems) {
          await db.prepare(`
            UPDATE central_kitchen_items 
            SET quantity = quantity + ?, updated_at = ?
            WHERE id = ?
          `).run(Number(item.quantity), nowLocal, item.item_id);
          ckItemsRestoredCount += Number(item.quantity);

          // Reverse branch POS restock if linked/raw_material
          try {
            const ckItem = await db.prepare('SELECT * FROM central_kitchen_items WHERE id = ?').get(item.item_id);
            if (ckItem) {
              const targetName = ckItem.linked_menu_item_name ? ckItem.linked_menu_item_name.trim() : null;
              let menuItem = null;
              if (targetName) {
                menuItem = await db.prepare('SELECT * FROM menu_items WHERE branch_id = ? AND name = ? LIMIT 1').get(linkedTransfer.branch_id, targetName);
                if (!menuItem) {
                  // Smart alias fallback
                  if (targetName.includes('น่อง') && targetName.includes('เล็ก')) {
                    menuItem = await db.prepare("SELECT * FROM menu_items WHERE branch_id = ? AND name LIKE '%น่อง%เล็ก%' LIMIT 1").get(linkedTransfer.branch_id);
                  } else if (targetName.includes('น่อง') && targetName.includes('ใหญ่')) {
                    menuItem = await db.prepare("SELECT * FROM menu_items WHERE branch_id = ? AND name LIKE '%น่อง%ใหญ่%' LIMIT 1").get(linkedTransfer.branch_id);
                  } else if (targetName.startsWith('ปีก')) {
                    menuItem = await db.prepare("SELECT * FROM menu_items WHERE branch_id = ? AND name LIKE 'ปีก%' LIMIT 1").get(linkedTransfer.branch_id);
                  } else if (targetName.includes('สะโพก') && targetName.includes('ไร้')) {
                    menuItem = await db.prepare("SELECT * FROM menu_items WHERE branch_id = ? AND name LIKE '%สะโพก%ไร้%' LIMIT 1").get(linkedTransfer.branch_id);
                  } else if (targetName.includes('สะโพก') && targetName.includes('น่อง')) {
                    menuItem = await db.prepare("SELECT * FROM menu_items WHERE branch_id = ? AND (name LIKE '%สะโพก%น่อง%' OR name LIKE '%น่อง%สะโพก%') LIMIT 1").get(linkedTransfer.branch_id);
                  } else if (targetName === 'สะโพก' || targetName === 'สะโพกไก่') {
                    menuItem = await db.prepare("SELECT * FROM menu_items WHERE branch_id = ? AND (name = 'สะโพก' OR name = 'สะโพกไก่') LIMIT 1").get(linkedTransfer.branch_id);
                  } else if (targetName.includes('อกไก่') && targetName.includes('สไป')) {
                    menuItem = await db.prepare("SELECT * FROM menu_items WHERE branch_id = ? AND name LIKE '%อกไก่%สไป%' LIMIT 1").get(linkedTransfer.branch_id);
                  } else if ((targetName.includes('ชีส') || targetName.includes('ซีส')) && targetName.includes('บอล')) {
                    menuItem = await db.prepare("SELECT * FROM menu_items WHERE branch_id = ? AND (name LIKE '%ชีสบอล%' OR name LIKE '%ซีสบอล%') LIMIT 1").get(linkedTransfer.branch_id);
                  } else if ((targetName.includes('ชีส') || targetName.includes('ซีส')) && (targetName.includes('สติ๊ก') || targetName.includes('สตริก'))) {
                    menuItem = await db.prepare("SELECT * FROM menu_items WHERE branch_id = ? AND (name LIKE '%ชีส%สติ๊ก%' OR name LIKE '%ซีส%สติ๊ก%') LIMIT 1").get(linkedTransfer.branch_id);
                  } else if (targetName.includes('นักเก็ต') && targetName.includes('ลาวา')) {
                    menuItem = await db.prepare("SELECT * FROM menu_items WHERE branch_id = ? AND name LIKE '%นักเก็ต%ลาวา%' LIMIT 1").get(linkedTransfer.branch_id);
                  } else if (targetName.includes('นักเก็ต')) {
                    menuItem = await db.prepare("SELECT * FROM menu_items WHERE branch_id = ? AND name LIKE '%นักเก็ต%' AND name NOT LIKE '%ลาวา%' LIMIT 1").get(linkedTransfer.branch_id);
                  }
                }
              }
              if (menuItem) {
                const multiplier = Number((item.pack_size && item.pack_size > 0) ? item.pack_size : (ckItem.pack_size && ckItem.pack_size > 0 ? ckItem.pack_size : 1));
                const convertedQty = Number(item.quantity) * multiplier;
                const stockField = (ckItem.target_stock_type === 'ready' || menuItem.raw_quantity === null) ? 'quantity' : 'raw_quantity';
                const curStock = Number(menuItem[stockField] || 0);
                const newStock = Math.max(0, curStock - convertedQty);
                await db.prepare(`UPDATE menu_items SET ${stockField} = ?, updated_at = ? WHERE id = ?`).run(newStock, nowLocal, menuItem.id);
                const formulaStr = multiplier > 1 ? ` (${item.quantity} ${item.unit || 'หน่วย'} x ${multiplier} = ${convertedQty} ชิ้น)` : '';
                await db.prepare(`
                  INSERT INTO stock_logs (branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, note, created_at)
                  VALUES (?, ?, ?, ?, ?, 'adjustment', ?, ?)
                `).run(linkedTransfer.branch_id, menuItem.id, -convertedQty, curStock, newStock, `ปรับลดคืนวัตถุดิบจากการยกเลิกรายจ่าย #${id} (ใบเบิก #${linkedTransfer.transfer_no})${formulaStr}`, nowLocal);
              }
            }
          } catch (menuRollErr) {
            console.warn('⚠️ Menu item rollback error on expense cancel:', menuRollErr.message);
          }
        }

        // อัปเดตสถานะใบเบิกในครัวกลางเป็น 'cancelled'
        await db.prepare(`
          UPDATE central_kitchen_transfers 
          SET status = 'cancelled', 
              notes = COALESCE(notes, '') || ?
          WHERE id = ?
        `).run(` [ยกเลิกและคืนของเข้าคลังครัวกลางตามการยกเลิกรายจ่าย #${id}]`, linkedTransfer.id);

        // ถ้าใบเบิกนี้เคยเคลียร์เงินคืนครัวกลางไปแล้ว (is_reimbursed = 1) ให้บันทึกคืนเงินในกองกลางด้วย
        if (linkedTransfer.is_reimbursed === 1 && linkedTransfer.total_cost > 0) {
          try {
            await db.prepare(`
              INSERT INTO central_kitchen_finances (branch_id, type, amount, payment_method, note, created_by_name, created_at)
              VALUES (?, 'other_out', ?, 'transfer', ?, ?, ?)
            `).run(
              linkedTransfer.branch_id,
              linkedTransfer.total_cost,
              `คืนเงินค่าของให้สาขาตามการยกเลิกใบเบิก #${linkedTransfer.transfer_no}`,
              req.user?.name || 'ผู้จัดการ',
              nowLocal
            );
            await db.prepare('UPDATE central_kitchen_transfers SET is_reimbursed = 0 WHERE id = ?').run(linkedTransfer.id);
          } catch (fErr) {
            console.warn('⚠️ Central kitchen finance refund warning:', fErr.message);
          }
        }

        ckTransferRestored = true;
      }
    } catch (ckErr) {
      console.warn('⚠️ Central kitchen transfer auto-revert warning:', ckErr.message);
    }

    // 5. สร้างแถวคู่ตรงข้าม (Contra / Refund Entry) เฉพาะกรณีที่ไม่ใช่การเบิกของครัวกลาง
    let refundId = null;
    let refundExpense = null;
    if (!isCKTransfer) {
      const refundNote = expense.note ? `คืน: ${expense.note}` : `คืน: ${getCategoryLabel(expense.category)}`;
      const refundRes = await db.prepare(`
        INSERT INTO expenses (
          branch_id, staff_id, amount, category, note,
          expense_date, session_id, payment_method, status,
          is_refund, refund_ref_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'refund', 1, ?, ?)
      `).run(
        expense.branch_id || branchId,
        userId,
        Number(expense.amount),
        expense.category,
        refundNote,
        todayDate,
        expense.session_id || null,
        expense.payment_method || 'cash',
        Number(id),
        nowLocal
      );

      refundId = refundRes.lastInsertRowid;
      refundExpense = await db.prepare('SELECT e.*, u.name as staff_name FROM expenses e LEFT JOIN users u ON u.id = e.staff_id WHERE e.id = ?').get(Number(refundId));
    }

    // 6. บันทึก Activity Log
    try {
      const logDetails = isCKTransfer
        ? `ยกเลิกรายการเบิกของจากครัวกลาง #${id} (${expense.note || getCategoryLabel(expense.category)}) จำนวน ${expense.amount} บาท [ขีดฆ่ายกเลิกยอด และดึงสต็อกสินค้าคืนครัวกลาง]${ckTransferNo ? ` (ใบเบิก #${ckTransferNo})` : ''}`
        : `ยกเลิกและคืนยอดค่าใช้จ่าย #${id} (${getCategoryLabel(expense.category)}) จำนวน ${expense.amount} บาท (คืนในแถว #${refundId})${payrollUnlocked ? ' [ปลดล็อกสลิปและวันทำงานพนักงานกลับสู่สถานะรอจ่าย]' : ''}`;

      await db.prepare(`
        INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
        VALUES (?, ?, 'reverse_expense', ?, ?)
      `).run(
        expense.branch_id || branchId,
        userId,
        logDetails,
        nowLocal
      );
    } catch (logErr) {
      console.warn('⚠️ Log activity failed on reverse_expense:', logErr.message);
    }

    const updatedExpense = await db.prepare('SELECT e.*, u.name as staff_name FROM expenses e LEFT JOIN users u ON u.id = e.staff_id WHERE e.id = ?').get(Number(id));

    const successMsg = isCKTransfer
      ? `ยกเลิกรายการเบิกของจากครัวกลางเรียบร้อยแล้ว (ขีดฆ่ายกเลิกยอดเดิม${ckTransferNo ? ` ใบเบิก #${ckTransferNo}` : ''} และคืนสต็อกเข้าครัวกลาง)`
      : (ckTransferRestored 
          ? `ยกเลิกรายการและคืนยอดเรียบร้อยแล้ว (คืนสต็อกสินค้าใบเบิก #${ckTransferNo} กลับเข้าครัวกลางเรียบร้อย)` 
          : 'ยกเลิกรายการและคืนยอดเรียบร้อยแล้ว');

    res.json({
      success: true,
      message: successMsg,
      data: {
        original: updatedExpense,
        refund: refundExpense,
        payroll_unlocked: payrollUnlocked,
        ck_transfer_restored: ckTransferRestored,
        ck_transfer_no: ckTransferNo,
        is_ck_transfer: isCKTransfer
      }
    });
  } catch (error) {
    console.error('❌ Reverse expense error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการยกเลิกและคืนยอด: ' + error.message
    });
  }
});

// ─── DELETE /:id — Delete/Reverse Expense (Wrapper for backward compatibility) ───
router.delete('/:id', async (req, res) => {
  // Redirect delete requests to reverse handler for safe audit trail
  req.url = `/${req.params.id}/reverse`;
  return router.handle(req, res);
});

module.exports = router;
