const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { attachUser, requireAdmin } = require('../middleware/auth');
const { getOrCreateSession } = require('./cash_drawers');

// Apply auth middleware to all routes
router.use(attachUser);
router.use(requireAdmin);

// ─── POST / — Create New Expense ────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { amount, category, note, expense_date } = req.body;
    const db = getDb();

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุจำนวนเงินที่ถูกต้อง (มากกว่า 0)'
      });
    }

    if (!category || !['raw_materials', 'gas_fuel', 'packaging', 'other'].includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุหมวดหมู่ที่ถูกต้อง'
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

    // ดึงหรือสร้างรอบบัญชีเงินสดประจำวัน
    const session = await getOrCreateSession(db, branchId);
    const sessionId = session ? session.id : null;

    const result = await db.prepare(`
      INSERT INTO expenses (branch_id, staff_id, amount, category, note, expense_date, session_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))
    `).run(branchId, req.user.id, amount, category, note || null, dateVal, sessionId);



    res.status(201).json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        amount,
        category,
        note,
        expense_date: dateVal
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
        WHERE e.branch_id = ? AND strftime('%Y', e.expense_date) = ?
        ORDER BY e.expense_date DESC, e.created_at DESC
      `).all(branchId, year);
    } else if (month) {
      expenses = await db.prepare(`
        SELECT e.*, u.name as staff_name 
        FROM expenses e
        LEFT JOIN users u ON u.id = e.staff_id
        WHERE e.branch_id = ? AND strftime('%Y-%m', e.expense_date) = ?
        ORDER BY e.expense_date DESC, e.created_at DESC
      `).all(branchId, month);
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

    const expense = await db.prepare('SELECT * FROM expenses WHERE id = ?').get(Number(id));
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบรายการค่าใช้จ่าย'
      });
    }

    await db.prepare('DELETE FROM expenses WHERE id = ?').run(Number(id));



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
