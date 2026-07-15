const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { attachUser, requireAdmin } = require('../middleware/auth');
const { getOrCreateSession } = require('./cash_drawers');

const getCategoryLabel = (cat) => {
  const map = {
    'raw_materials': 'วัตถุดิบและของสดทั่วไป',
    'gas_fuel': 'แก๊สและเชื้อเพลิง',
    'packaging': 'บรรจุภัณฑ์/แพ็คเกจ',
    'raw_chicken': 'ของสด: ไก่ดิบ',
    'sticky_rice': 'ของสด: ข้าวเหนียว',
    'meatballs': 'ของสด: ลูกชิ้น',
    'salapao': 'ของสด: ซาลาเปา',
    'fuel_oil': 'น้ำมันทอด',
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
router.use(requireAdmin);

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

    if (!category || !['raw_materials', 'gas_fuel', 'packaging', 'other', 'raw_chicken', 'sticky_rice', 'meatballs', 'salapao', 'fuel_oil', 'gas_lpg', 'salary', 'utility_bills', 'debt'].includes(category)) {
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
    const { date, month, year } = req.query;
    const db = getDb();

    let branchId = req.user.branch_id;
    if (req.user.role === 'admin' && req.query.branch_id) {
      branchId = Number(req.query.branch_id);
    } else if (!branchId) {
      const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
      branchId = defaultBranch ? defaultBranch.id : null;
    }

    let expenses;
    if (year) {
      expenses = await db.prepare(`
        SELECT e.*, u.name as staff_name 
        FROM expenses e
        LEFT JOIN users u ON u.id = e.staff_id
        WHERE e.branch_id = ? AND e.expense_date >= ? AND e.expense_date < ?
        ORDER BY e.expense_date DESC, e.created_at DESC
      `).all(branchId, `${year}-01-01`, `${Number(year) + 1}-01-01`);
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
        WHERE e.branch_id = ? AND e.expense_date >= ? AND e.expense_date < ?
        ORDER BY e.expense_date DESC, e.created_at DESC
      `).all(branchId, `${month}-01`, `${nextYr}-${String(nextMo).padStart(2, '0')}-01`);
    } else if (date) {
      expenses = await db.prepare(`
        SELECT e.*, u.name as staff_name 
        FROM expenses e
        LEFT JOIN users u ON u.id = e.staff_id
        WHERE e.branch_id = ? AND e.expense_date = ?
        ORDER BY e.created_at DESC
      `).all(branchId, date);
    } else {
      expenses = await db.prepare(`
        SELECT e.*, u.name as staff_name 
        FROM expenses e
        LEFT JOIN users u ON u.id = e.staff_id
        WHERE e.branch_id = ?
        ORDER BY e.expense_date DESC, e.created_at DESC
      `).all(branchId);
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

// ─── DELETE /:id — Delete Expense ───────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    let branchId = req.user.branch_id;
    if (!branchId) {
      const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
      branchId = defaultBranch ? defaultBranch.id : null;
    }

    // คิวรีข้อมูลและทำการลบออกภายใน Transaction/Batch เดียวกันเพื่อลดการวิ่งกลับไปกลับมาระหว่างฐานข้อมูล
    const batchRes = await db.batch([
      {
        sql: 'SELECT category, amount FROM expenses WHERE id = ?',
        args: [Number(id)]
      },
      {
        sql: 'DELETE FROM expenses WHERE id = ?',
        args: [Number(id)]
      }
    ]);

    const expense = batchRes[0].rows[0];
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบรายการค่าใช้จ่าย'
      });
    }

    // บันทึก Log กิจกรรมในเบื้องหลังแบบขนานโดยไม่บล็อกรอบการส่งข้อมูลกลับหาผู้ใช้
    db.prepare(`
      INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
      VALUES (?, ?, 'delete_expense', ?, datetime('now', '+7 hours'))
    `).run(branchId, req.user.id, `ลบรายการค่าใช้จ่าย หมวดหมู่ ${getCategoryLabel(expense.category)} จำนวน ${expense.amount} บาท`)
      .catch(err => console.error('Failed to log delete_expense activity:', err.message));

    res.json({
      success: true,
      message: 'ลบรายการค่าใช้จ่ายเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('❌ Delete expense error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการลบค่าใช้จ่าย'
    });
  }
});

module.exports = router;
