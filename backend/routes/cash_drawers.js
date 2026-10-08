const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { attachUser, requireAuth, requireManagerOrAdmin } = require('../middleware/auth');

// Helper to get local date string (Thailand timezone: UTC+7, business day offset by 4 hours to handle late-night closings)
function getThailandDateString() {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
}

// In-memory cache for daily cash drawer sessions to eliminate redundant database checks/roundtrips
const sessionCache = new Map(); // Key: `${branchId}-${sessionDate}`, Value: session object

// Stealth Session Helper (Auto-links orders/expenses in the background)
async function getOrCreateSession(db, branchId) {
  const sessionDate = getThailandDateString();
  const cacheKey = `${branchId}-${sessionDate}`;
  
  if (sessionCache.has(cacheKey)) {
    return sessionCache.get(cacheKey);
  }
  
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

  if (session) {
    sessionCache.set(cacheKey, session);
  }

  return session;
}

// Register authentication middlewares for all web routes below
router.use(attachUser);
router.use(requireAuth);

// Helper to parse branch_id safely
function parseBranchId(val) {
  if (val === undefined || val === null || val === 'null' || val === 'undefined' || val === 'all' || val === '') {
    return null;
  }
  const n = Number(val);
  return isNaN(n) ? null : n;
}

// ─── POST /opening-cash — Set/Edit Opening Cash (Manager/Admin) ───────
router.post('/opening-cash', requireManagerOrAdmin, async (req, res) => {
  try {
    const { session_id, session_date, opening_cash, branch_id } = req.body;
    const db = getDb();
    let targetBranchId = req.user.branch_id;
    const parsedBodyBranchId = parseBranchId(branch_id);
    if (req.user.role === 'admin' && parsedBodyBranchId !== null) {
      targetBranchId = parsedBodyBranchId;
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
      if (session) {
        targetBranchId = session.branch_id;
      }
    }
    
    if (!session && session_date) {
      session = await db.prepare(`
        SELECT * FROM cash_drawer_sessions WHERE branch_id = ? AND session_date = ?
      `).get(targetBranchId, session_date);
    }

    const targetDate = (session && session.session_date) || session_date || getThailandDateString();

    if (!session) {
      // Create dynamically if not found
      const result = await db.prepare(`
        INSERT INTO cash_drawer_sessions (branch_id, session_date, opening_cash, status, created_at, updated_at)
        VALUES (?, ?, ?, 'open', datetime('now', '+7 hours'), datetime('now', '+7 hours'))
      `).run(targetBranchId, targetDate, Number(opening_cash));

      session = {
        id: result.lastInsertRowid,
        branch_id: targetBranchId,
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

    // Auto-link unlinked orders and expenses for this branch & date
    await db.prepare(`
      UPDATE orders SET session_id = ? 
      WHERE branch_id = ? AND date(created_at, '+7 hours') = ? AND session_id IS NULL
    `).run(session.id, targetBranchId, targetDate);

    await db.prepare(`
      UPDATE expenses SET session_id = ? 
      WHERE branch_id = ? AND expense_date = ? AND session_id IS NULL
    `).run(session.id, targetBranchId, targetDate);

    // Invalidate session cache
    sessionCache.delete(`${targetBranchId}-${targetDate}`);

    // Log Activity
    await db.prepare(`
      INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
      VALUES (?, ?, 'cash_opening_set', ?, datetime('now', '+7 hours'))
    `).run(targetBranchId, req.user.id, `เจ้าของร้านบันทึกเงินทอนตั้งต้นวันที่ ${session.session_date} เป็นเงิน ${opening_cash} บาท`);

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

// ─── POST /audit — Reconcile & Close Cash Session (Manager/Admin) ───────
router.post('/audit', requireManagerOrAdmin, async (req, res) => {
  try {
    const { session_id, session_date, actual_cash, note, branch_id } = req.body;
    const db = getDb();
    let targetBranchId = req.user.branch_id;
    const parsedBodyBranchId = parseBranchId(branch_id);
    if (req.user.role === 'admin' && parsedBodyBranchId !== null) {
      targetBranchId = parsedBodyBranchId;
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
      if (session) {
        targetBranchId = session.branch_id;
      }
    }
    
    if (!session && session_date) {
      session = await db.prepare(`
        SELECT * FROM cash_drawer_sessions WHERE branch_id = ? AND session_date = ?
      `).get(targetBranchId, session_date);
    }

    const targetDate = (session && session.session_date) || session_date || getThailandDateString();

    if (!session) {
      // Create dynamically if not found (default opening cash is 0.0)
      const result = await db.prepare(`
        INSERT INTO cash_drawer_sessions (branch_id, session_date, opening_cash, status, created_at, updated_at)
        VALUES (?, ?, ?, 'open', datetime('now', '+7 hours'), datetime('now', '+7 hours'))
      `).run(targetBranchId, targetDate, 0.0);

      session = {
        id: result.lastInsertRowid,
        branch_id: targetBranchId,
        session_date: targetDate,
        opening_cash: 0.0,
        status: 'open'
      };
    }

    const sessionId = session.id;

    // Auto-link unlinked orders and expenses for this branch & date
    await db.prepare(`
      UPDATE orders SET session_id = ? 
      WHERE branch_id = ? AND date(created_at, '+7 hours') = ? AND session_id IS NULL
    `).run(sessionId, targetBranchId, targetDate);

    await db.prepare(`
      UPDATE expenses SET session_id = ? 
      WHERE branch_id = ? AND expense_date = ? AND session_id IS NULL
    `).run(sessionId, targetBranchId, targetDate);

    // 1. Calculate cash sales
    const ordersResult = await db.prepare(`
      SELECT SUM(total) as cash_sales
      FROM orders
      WHERE (session_id = ? OR (branch_id = ? AND date(created_at, '+7 hours') = ?))
        AND payment_method = 'cash' AND status = 'completed'
    `).get(sessionId, targetBranchId, targetDate);
    const cashSales = ordersResult ? (ordersResult.cash_sales || 0) : 0;

    // 2. Calculate cash expenses
    const expensesResult = await db.prepare(`
      SELECT SUM(
        CASE 
          WHEN is_refund = 1 OR status = 'refund' THEN -amount
          ELSE amount
        END
      ) as cash_expenses
      FROM expenses
      WHERE (session_id = ? OR (branch_id = ? AND expense_date = ?))
        AND (payment_method = 'cash' OR payment_method IS NULL)
    `).get(sessionId, targetBranchId, targetDate);
    const cashExpenses = Math.max(0, expensesResult ? (expensesResult.cash_expenses || 0) : 0);

    // 3. Reconcile
    const expectedCash = (session.opening_cash || 0) + cashSales - cashExpenses;
    const actualCashNum = Number(actual_cash);
    const difference = actualCashNum - expectedCash;

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
    `).run(expectedCash, actualCashNum, difference, note || null, sessionId);

    // Invalidate session cache
    sessionCache.delete(`${targetBranchId}-${targetDate}`);

    // Log Activity
    const actorRole = req.user.role === 'admin' ? 'เจ้าของร้าน' : 'ผู้จัดการ';
    await db.prepare(`
      INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
      VALUES (?, ?, 'cash_audit', ?, datetime('now', '+7 hours'))
    `).run(targetBranchId, req.user.id, `${actorRole}ตรวจสอบเงินสดวันที่ ${session.session_date} (นับจริง: ${actualCashNum} บาท, คาดการณ์: ${expectedCash} บาท, ผลต่าง: ${difference} บาท)`);

    res.json({
      success: true,
      data: {
        id: sessionId,
        branch_id: targetBranchId,
        session_date: session.session_date,
        opening_cash: session.opening_cash,
        expected_cash: expectedCash,
        actual_cash: actualCashNum,
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

// ─── GET /summary — Get Daily Session Summaries (Manager/Admin) ───────
router.get('/summary', requireManagerOrAdmin, async (req, res) => {
  try {
    const db = getDb();
    let filterBranchId = null;
    if (req.user.role === 'admin') {
      filterBranchId = parseBranchId(req.query.branch_id);
    } else {
      filterBranchId = req.user.branch_id;
    }

    const { start_date, end_date } = req.query;

    let query = `
      SELECT s.*, b.name as branch_name
      FROM cash_drawer_sessions s
      JOIN branches b ON b.id = s.branch_id
    `;
    const params = [];

    const whereConditions = [];
    if (filterBranchId !== null) {
      whereConditions.push(`s.branch_id = ?`);
      params.push(filterBranchId);
    }

    if (start_date && end_date) {
      whereConditions.push(`s.session_date BETWEEN ? AND ?`);
      params.push(start_date, end_date);
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ` + whereConditions.join(' AND ');
    }

    query += ` ORDER BY s.session_date DESC, s.branch_id ASC LIMIT 180`;

    const sessions = await db.prepare(query).all(...params);

    const enrichedSessions = [];
    for (const session of sessions) {
      // Get cash sales comprehensively
      const salesRes = await db.prepare(`
        SELECT SUM(total) as cash_sales
        FROM orders
        WHERE (session_id = ? OR (session_id IS NULL AND branch_id = ? AND date(created_at, '+7 hours') = ?))
          AND payment_method = 'cash' AND status = 'completed'
      `).get(session.id, session.branch_id, session.session_date);
      const cashSales = salesRes ? (salesRes.cash_sales || 0) : 0;

      // Get cash expenses comprehensively
      const expRes = await db.prepare(`
        SELECT SUM(
          CASE 
            WHEN is_refund = 1 OR status = 'refund' THEN -amount
            ELSE amount
          END
        ) as cash_expenses
        FROM expenses
        WHERE (session_id = ? OR (session_id IS NULL AND branch_id = ? AND expense_date = ?))
          AND (payment_method = 'cash' OR payment_method IS NULL)
      `).get(session.id, session.branch_id, session.session_date);
      const cashExpenses = Math.max(0, expRes ? (expRes.cash_expenses || 0) : 0);

      // For open session, calculate expected cash on the fly
      const expectedCash = (session.opening_cash || 0) + cashSales - cashExpenses;
      
      enrichedSessions.push({
        ...session,
        cash_sales: cashSales,
        cash_expenses: cashExpenses,
        calculated_expected_cash: expectedCash
      });
    }

    // Determine branches that need virtual sessions for today & yesterday if not yet created
    let targetBranches = [];
    if (filterBranchId !== null) {
      const b = await db.prepare('SELECT id, name FROM branches WHERE id = ?').get(filterBranchId);
      if (b) targetBranches.push(b);
    } else {
      targetBranches = await db.prepare('SELECT id, name FROM branches ORDER BY id ASC').all();
    }

    // Helper to generate list of YYYY-MM-DD dates in range
    const getDatesInRange = (startStr, endStr) => {
      const dates = [];
      const [sy, sm, sd] = startStr.split('-').map(Number);
      const [ey, em, ed] = endStr.split('-').map(Number);
      const cur = new Date(sy, sm - 1, sd);
      const end = new Date(ey, em - 1, ed);
      while (cur <= end) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
        cur.setDate(cur.getDate() + 1);
      }
      return dates;
    };

    const todayStr = getThailandDateString();
    const todayDate = new Date(Date.now() + 7 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000);
    const yesterdayDate = new Date(todayDate.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    for (const targetBranch of targetBranches) {
      if (start_date && end_date) {
        // Generate every day in the requested date range (e.g. days 1 to 31 of the month)
        const dateRangeList = getDatesInRange(start_date, end_date);
        for (const dStr of dateRangeList) {
          const hasSession = enrichedSessions.some(s => s.branch_id === targetBranch.id && s.session_date === dStr);
          if (!hasSession) {
            // Query actual cash sales/expenses for this date
            const dSales = await db.prepare(`
              SELECT SUM(total) as cash_sales FROM orders 
              WHERE branch_id = ? AND date(created_at, '+7 hours') = ? AND payment_method = 'cash' AND status = 'completed'
            `).get(targetBranch.id, dStr);
            const dExpenses = await db.prepare(`
              SELECT SUM(
                CASE 
                  WHEN is_refund = 1 OR status = 'refund' THEN -amount
                  ELSE amount
                END
              ) as cash_expenses FROM expenses 
              WHERE branch_id = ? AND expense_date = ? AND (payment_method = 'cash' OR payment_method IS NULL)
            `).get(targetBranch.id, dStr);

            const cashSales = dSales ? (dSales.cash_sales || 0) : 0;
            const cashExpenses = Math.max(0, dExpenses ? (dExpenses.cash_expenses || 0) : 0);

            enrichedSessions.push({
              id: null,
              branch_id: targetBranch.id,
              branch_name: targetBranch.name,
              session_date: dStr,
              opening_cash: 0.0,
              expected_cash: cashSales - cashExpenses,
              actual_cash: null,
              difference: null,
              status: 'open',
              note: null,
              cash_sales: cashSales,
              cash_expenses: cashExpenses,
              calculated_expected_cash: cashSales - cashExpenses
            });
          }
        }
      } else {
        // Default fallback if no range specified: ensure yesterday & today exist
        const hasToday = enrichedSessions.some(s => s.branch_id === targetBranch.id && s.session_date === todayStr);
        const hasYesterday = enrichedSessions.some(s => s.branch_id === targetBranch.id && s.session_date === yesterdayStr);

        if (!hasYesterday) {
          const ySales = await db.prepare(`
            SELECT SUM(total) as cash_sales FROM orders 
            WHERE branch_id = ? AND date(created_at, '+7 hours') = ? AND payment_method = 'cash' AND status = 'completed'
          `).get(targetBranch.id, yesterdayStr);
          const yExpenses = await db.prepare(`
            SELECT SUM(
              CASE 
                WHEN is_refund = 1 OR status = 'refund' THEN -amount
                ELSE amount
              END
            ) as cash_expenses FROM expenses 
            WHERE branch_id = ? AND expense_date = ? AND (payment_method = 'cash' OR payment_method IS NULL)
          `).get(targetBranch.id, yesterdayStr);
          
          const yCashSales = ySales ? (ySales.cash_sales || 0) : 0;
          const yCashExpenses = Math.max(0, yExpenses ? (yExpenses.cash_expenses || 0) : 0);

          enrichedSessions.push({
            id: null,
            branch_id: targetBranch.id,
            branch_name: targetBranch.name,
            session_date: yesterdayStr,
            opening_cash: 0.0,
            expected_cash: yCashSales - yCashExpenses,
            actual_cash: null,
            difference: null,
            status: 'open',
            note: null,
            cash_sales: yCashSales,
            cash_expenses: yCashExpenses,
            calculated_expected_cash: yCashSales - yCashExpenses
          });
        }

        if (!hasToday) {
          const tSales = await db.prepare(`
            SELECT SUM(total) as cash_sales FROM orders 
            WHERE branch_id = ? AND date(created_at, '+7 hours') = ? AND payment_method = 'cash' AND status = 'completed'
          `).get(targetBranch.id, todayStr);
          const tExpenses = await db.prepare(`
            SELECT SUM(
              CASE 
                WHEN is_refund = 1 OR status = 'refund' THEN -amount
                ELSE amount
              END
            ) as cash_expenses FROM expenses 
            WHERE branch_id = ? AND expense_date = ? AND (payment_method = 'cash' OR payment_method IS NULL)
          `).get(targetBranch.id, todayStr);
          
          const tCashSales = tSales ? (tSales.cash_sales || 0) : 0;
          const tCashExpenses = Math.max(0, tExpenses ? (tExpenses.cash_expenses || 0) : 0);

          enrichedSessions.push({
            id: null,
            branch_id: targetBranch.id,
            branch_name: targetBranch.name,
            session_date: todayStr,
            opening_cash: 0.0,
            expected_cash: tCashSales - tCashExpenses,
            actual_cash: null,
            difference: null,
            status: 'open',
            note: null,
            cash_sales: tCashSales,
            cash_expenses: tCashExpenses,
            calculated_expected_cash: tCashSales - tCashExpenses
          });
        }
      }
    }

    // Sort all sessions by session_date DESC, branch_id ASC
    enrichedSessions.sort((a, b) => {
      if (a.session_date !== b.session_date) {
        return b.session_date.localeCompare(a.session_date);
      }
      return (a.branch_id || 0) - (b.branch_id || 0);
    });

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

// ─── GET /settings — Get Default Opening Cash (Manager/Admin) ──────────
router.get('/settings', requireManagerOrAdmin, async (req, res) => {
  try {
    const db = getDb();
    let branchId = req.user.branch_id;
    const parsed = parseBranchId(req.query.branch_id);
    if (req.user.role === 'admin' && parsed !== null) {
      branchId = parsed;
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

// ─── POST /settings — Save Default Opening Cash (Manager/Admin) ─────────
router.post('/settings', requireManagerOrAdmin, async (req, res) => {
  try {
    const { default_opening_cash, branch_id } = req.body;
    const db = getDb();
    let branchId = req.user.branch_id;
    const parsed = parseBranchId(branch_id);
    if (req.user.role === 'admin' && parsed !== null) {
      branchId = parsed;
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
