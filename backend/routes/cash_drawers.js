const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { attachUser, requireAuth, requireAdmin } = require('../middleware/auth');

// Helper to get local date string (Thailand timezone: UTC+7, business day offset by 4 hours to handle late-night closings)
function getThailandDateString() {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
}

// Stealth Session Helper (Auto-links orders/expenses in the background)
async function getOrCreateSession(db, branchId) {
  const sessionDate = getThailandDateString();
  
  // Try to find existing session
  let session = await db.prepare(`
    SELECT * FROM cash_drawer_sessions 
    WHERE branch_id = ? AND session_date = ?
    LIMIT 1
  `).get(branchId, sessionDate);

  if (!session) {
    const openingCash = 0.0; // Default to 0.0, owner will enter it

    try {
      const result = await db.prepare(`
        INSERT INTO cash_drawer_sessions (branch_id, session_date, opening_cash, status, created_at, updated_at)
        VALUES (?, ?, ?, 'open', datetime('now', '+7 hours'), datetime('now', '+7 hours'))
      `).run(branchId, sessionDate, openingCash);
      
      session = {
        id: result.lastInsertRowid,
        branch_id: branchId,
        session_date: sessionDate,
        opening_cash: openingCash,
        status: 'open'
      };
      
      console.log(`  📂 Created new silent daily cash session for branch ${branchId} on date ${sessionDate}`);
    } catch (err) {
      // If unique constraint error occurs due to concurrent requests, try fetching again
      session = await db.prepare(`
        SELECT * FROM cash_drawer_sessions 
        WHERE branch_id = ? AND session_date = ?
        LIMIT 1
      `).get(branchId, sessionDate);
      if (!session) throw err;
    }
  }

  return session;
}

// Register authentication middlewares for all web routes below
router.use(attachUser);
router.use(requireAuth);

// ─── POST /opening-cash — Set/Edit Opening Cash (Admin Only) ───────
router.post('/opening-cash', requireAdmin, async (req, res) => {
  try {
    const { session_id, session_date, opening_cash, branch_id } = req.body;
    const db = getDb();
    let branchId = req.user.branch_id;
    if (req.user.role === 'admin' && branch_id) {
      branchId = Number(branch_id);
    }

    if (opening_cash === undefined || opening_cash === null || isNaN(Number(opening_cash)) || Number(opening_cash) < 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุจำนวนเงินทอนเริ่มต้นที่ถูกต้อง'
      });
    }

    let session;
    if (session_id) {
      session = await db.prepare(`
        SELECT * FROM cash_drawer_sessions WHERE id = ?
      `).get(Number(session_id));
    } else if (session_date) {
      session = await db.prepare(`
        SELECT * FROM cash_drawer_sessions WHERE branch_id = ? AND session_date = ?
      `).get(branchId, session_date);
    }

    if (!session) {
      // Create dynamically if not found
      const targetDate = session_date || getThailandDateString();
      const result = await db.prepare(`
        INSERT INTO cash_drawer_sessions (branch_id, session_date, opening_cash, status, created_at, updated_at)
        VALUES (?, ?, ?, 'open', datetime('now', '+7 hours'), datetime('now', '+7 hours'))
      `).run(branchId, targetDate, Number(opening_cash));

      session = {
        id: result.lastInsertRowid,
        branch_id: branchId,
        session_date: targetDate,
        opening_cash: Number(opening_cash),
        status: 'open'
      };
    } else {
      // Update opening cash
      await db.prepare(`
        UPDATE cash_drawer_sessions
        SET opening_cash = ?,
            updated_at = datetime('now', '+7 hours')
        WHERE id = ?
      `).run(Number(opening_cash), session.id);
      
      session.opening_cash = Number(opening_cash);
    }

    // Log Activity
    const logBranchId = session ? session.branch_id : branchId;
    await db.prepare(`
      INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
      VALUES (?, ?, 'cash_opening_set', ?, datetime('now', '+7 hours'))
    `).run(logBranchId, req.user.id, `เจ้าของร้านบันทึกเงินทอนตั้งต้นวันที่ ${session.session_date} เป็นเงิน ${opening_cash} บาท`);

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('❌ Set opening cash error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการบันทึกเงินทอนตั้งต้น'
    });
  }
});

// ─── POST /audit — Reconcile & Close Cash Session (Admin Only) ───────
router.post('/audit', requireAdmin, async (req, res) => {
  try {
    const { session_id, session_date, actual_cash, note, branch_id } = req.body;
    const db = getDb();
    let branchId = req.user.branch_id;
    if (req.user.role === 'admin' && branch_id) {
      branchId = Number(branch_id);
    }

    if (actual_cash === undefined || actual_cash === null || isNaN(Number(actual_cash)) || Number(actual_cash) < 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุจำนวนเงินสดในลิ้นชักที่ถูกต้อง'
      });
    }

    let session;
    if (session_id) {
      session = await db.prepare(`
        SELECT * FROM cash_drawer_sessions WHERE id = ?
      `).get(Number(session_id));
    } else if (session_date) {
      session = await db.prepare(`
        SELECT * FROM cash_drawer_sessions WHERE branch_id = ? AND session_date = ?
      `).get(branchId, session_date);
    }

    if (!session) {
      // Create dynamically if not found (default opening cash is 0.0)
      const targetDate = session_date || getThailandDateString();
      const result = await db.prepare(`
        INSERT INTO cash_drawer_sessions (branch_id, session_date, opening_cash, status, created_at, updated_at)
        VALUES (?, ?, ?, 'open', datetime('now', '+7 hours'), datetime('now', '+7 hours'))
      `).run(branchId, targetDate, 0.0);

      session = {
        id: result.lastInsertRowid,
        branch_id: branchId,
        session_date: targetDate,
        opening_cash: 0.0,
        status: 'open'
      };
    }

    const sessionId = session.id;

    // 1. Calculate cash sales
    const ordersResult = await db.prepare(`
      SELECT SUM(total) as cash_sales
      FROM orders
      WHERE session_id = ? AND payment_method = 'cash' AND status = 'completed'
    `).get(sessionId);
    const cashSales = ordersResult.cash_sales || 0;

    // 2. Calculate cash expenses
    const expensesResult = await db.prepare(`
      SELECT SUM(amount) as cash_expenses
      FROM expenses
      WHERE session_id = ? AND (payment_method = 'cash' OR payment_method IS NULL)
    `).get(sessionId);
    const cashExpenses = expensesResult.cash_expenses || 0;

    // 3. Reconcile
    const expectedCash = session.opening_cash + cashSales - cashExpenses;
    const actualCash = Number(actual_cash);
    const difference = actualCash - expectedCash;

    // Update session to closed
    await db.prepare(`
      UPDATE cash_drawer_sessions
      SET expected_cash = ?,
          actual_cash = ?,
          difference = ?,
          status = 'closed',
          note = ?,
          updated_at = datetime('now', '+7 hours')
      WHERE id = ?
    `).run(expectedCash, actualCash, difference, note || null, sessionId);

    // Log Activity
    const logBranchId = session ? session.branch_id : branchId;
    await db.prepare(`
      INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
      VALUES (?, ?, 'cash_audit', ?, datetime('now', '+7 hours'))
    `).run(logBranchId, req.user.id, `เจ้าของร้านตรวจสอบเงินสดวันที่ ${session.session_date} (นับจริง: ${actualCash} บาท, คาดการณ์: ${expectedCash} บาท, ผลต่าง: ${difference} บาท)`);

    res.json({
      success: true,
      data: {
        id: sessionId,
        session_date: session.session_date,
        opening_cash: session.opening_cash,
        expected_cash: expectedCash,
        actual_cash: actualCash,
        difference: difference,
        status: 'closed',
        note,
        cash_sales: cashSales,
        cash_expenses: cashExpenses
      }
    });
  } catch (error) {
    console.error('❌ Audit cash drawer error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการบันทึกการตรวจสอบเงินสด'
    });
  }
});

// ─── GET /summary — Get Daily Session Summaries (Admin Only) ───────
router.get('/summary', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    let branchId = req.user.branch_id;
    if (req.user.role === 'admin' && req.query.branch_id) {
      branchId = Number(req.query.branch_id);
    }

    const { start_date, end_date } = req.query;

    let query = `
      SELECT s.*, b.name as branch_name
      FROM cash_drawer_sessions s
      JOIN branches b ON b.id = s.branch_id
      WHERE s.branch_id = ?
    `;
    const params = [branchId];

    if (start_date && end_date) {
      query += ` AND s.session_date BETWEEN ? AND ? `;
      params.push(start_date, end_date);
    }

    query += ` ORDER BY s.session_date DESC LIMIT 90`;

    const sessions = await db.prepare(query).all(...params);

    const enrichedSessions = [];
    for (const session of sessions) {
      // Get cash sales
      const salesRes = await db.prepare(`
        SELECT SUM(total) as cash_sales
        FROM orders
        WHERE session_id = ? AND payment_method = 'cash' AND status = 'completed'
      `).get(session.id);
      const cashSales = salesRes.cash_sales || 0;

      // Get cash expenses
      const expRes = await db.prepare(`
        SELECT SUM(amount) as cash_expenses
        FROM expenses
        WHERE session_id = ? AND (payment_method = 'cash' OR payment_method IS NULL)
      `).get(session.id);
      const cashExpenses = expRes.cash_expenses || 0;

      // For open session, calculate expected cash on the fly
      const expectedCash = session.opening_cash + cashSales - cashExpenses;
      
      enrichedSessions.push({
        ...session,
        cash_sales: cashSales,
        cash_expenses: cashExpenses,
        calculated_expected_cash: expectedCash
      });
    }

    const todayStr = getThailandDateString();
    const todayDate = new Date(Date.now() + 7 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000);
    const yesterdayDate = new Date(todayDate.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    const hasToday = enrichedSessions.some(s => s.session_date === todayStr);
    const hasYesterday = enrichedSessions.some(s => s.session_date === yesterdayStr);
    const branch = await db.prepare('SELECT name FROM branches WHERE id = ?').get(branchId);
    const branchName = branch ? branch.name : '';

    // If yesterday is missing, insert it dynamically in the sorted array (DESC order)
    if (!hasYesterday && (!start_date || (yesterdayStr >= start_date && yesterdayStr <= end_date))) {
      const insertIndex = enrichedSessions.findIndex(s => s.session_date < yesterdayStr);
      const virtualYesterday = {
        id: null,
        branch_id: branchId,
        branch_name: branchName,
        session_date: yesterdayStr,
        opening_cash: 0.0,
        expected_cash: 0.0,
        actual_cash: null,
        difference: null,
        status: 'open',
        note: null,
        cash_sales: 0.0,
        cash_expenses: 0.0,
        calculated_expected_cash: 0.0
      };
      if (insertIndex === -1) {
        enrichedSessions.push(virtualYesterday);
      } else {
        enrichedSessions.splice(insertIndex, 0, virtualYesterday);
      }
    }

    // If today is missing, insert it at the very beginning
    if (!hasToday && (!start_date || (todayStr >= start_date && todayStr <= end_date))) {
      enrichedSessions.unshift({
        id: null,
        branch_id: branchId,
        branch_name: branchName,
        session_date: todayStr,
        opening_cash: 0.0,
        expected_cash: 0.0,
        actual_cash: null,
        difference: null,
        status: 'open',
        note: null,
        cash_sales: 0.0,
        cash_expenses: 0.0,
        calculated_expected_cash: 0.0
      });
    }

    res.json({
      success: true,
      data: enrichedSessions
    });
  } catch (error) {
    console.error('❌ Get cash drawer summaries error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสรุปยอดเงินสด'
    });
  }
});

// ─── GET /settings — Get Default Opening Cash (Admin Only) ──────────
router.get('/settings', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    let branchId = req.user.branch_id;
    if (req.user.role === 'admin' && req.query.branch_id) {
      branchId = Number(req.query.branch_id);
    }

    const setting = await db.prepare(`
      SELECT value FROM settings 
      WHERE branch_id = ? AND key = 'default_opening_cash'
      LIMIT 1
    `).get(branchId);

    res.json({
      success: true,
      data: {
        default_opening_cash: setting ? Number(setting.value) : 500
      }
    });
  } catch (error) {
    console.error('❌ Get cash settings error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลตั้งค่า'
    });
  }
});

// ─── POST /settings — Save Default Opening Cash (Admin Only) ─────────
router.post('/settings', requireAdmin, async (req, res) => {
  try {
    const { default_opening_cash } = req.body;
    const db = getDb();
    let branchId = req.user.branch_id;
    if (req.user.role === 'admin' && req.body.branch_id) {
      branchId = Number(req.body.branch_id);
    }

    if (default_opening_cash === undefined || default_opening_cash === null || isNaN(Number(default_opening_cash)) || Number(default_opening_cash) < 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุจำนวนเงินสดตั้งต้นที่ถูกต้อง'
      });
    }

    // Insert or update setting
    const existing = await db.prepare(`
      SELECT key FROM settings WHERE branch_id = ? AND key = 'default_opening_cash'
    `).get(branchId);

    if (existing) {
      await db.prepare(`
        UPDATE settings SET value = ?, updated_at = datetime('now', '+7 hours')
        WHERE branch_id = ? AND key = 'default_opening_cash'
      `).run(String(default_opening_cash), branchId);
    } else {
      await db.prepare(`
        INSERT INTO settings (branch_id, key, value, updated_at)
        VALUES (?, 'default_opening_cash', ?, datetime('now', '+7 hours'))
      `).run(branchId, String(default_opening_cash));
    }

    // Log Activity
    await db.prepare(`
      INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
      VALUES (?, ?, 'setting_change', ?, datetime('now', '+7 hours'))
    `).run(branchId, req.user.id, `เจ้าของร้านเปลี่ยนค่าเริ่มต้นเงินทอนตั้งต้นเป็น ${default_opening_cash} บาท`);

    res.json({
      success: true,
      message: 'บันทึกการตั้งค่าสำเร็จ'
    });
  } catch (error) {
    console.error('❌ Save cash settings error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า'
    });
  }
});

module.exports = router;
module.exports.getOrCreateSession = getOrCreateSession;
