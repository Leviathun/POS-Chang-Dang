const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { attachUser, requireManagerOrAdmin } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(attachUser);
router.use(requireManagerOrAdmin);

// ─── GET / — Get Activity Logs (by Date) ─────────────────────
router.get('/', async (req, res) => {
  try {
    const { date, month, year, user_id, limit, offset } = req.query;
    const db = getDb();

    let branchId = (req.user && req.user.role === 'admin' && req.query.branch_id) 
      ? Number(req.query.branch_id) 
      : (req.user ? req.user.branch_id : null);
    if (!branchId) {
      const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
      branchId = defaultBranch ? defaultBranch.id : null;
    }

    const queryLimit = parseInt(limit) || 1000;
    const queryOffset = parseInt(offset) || 0;

    let sql = `
      SELECT al.*, u.name as staff_name 
      FROM activity_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE al.branch_id = ?
    `;
    const params = [branchId];

    if (year) {
      sql += ' AND al.created_at >= ? AND al.created_at < ?';
      params.push(`${year}-01-01`, `${Number(year) + 1}-01-01`);
    } else if (month) {
      const [y, m] = month.split('-').map(Number);
      const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
      sql += ' AND al.created_at >= ? AND al.created_at < ?';
      params.push(`${month}-01`, nextMonth);
    } else {
      const dateVal = date || new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split('T')[0];
      const nextDay = new Date(`${dateVal}T00:00:00Z`);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      sql += ' AND al.created_at >= ? AND al.created_at < ?';
      params.push(dateVal, nextDay.toISOString().split('T')[0]);
    }

    if (user_id) {
      sql += ' AND al.user_id = ?';
      params.push(Number(user_id));
    }

    sql += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(queryLimit, queryOffset);

    const logs = await db.prepare(sql).all(params);

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('❌ Get activity logs error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลบันทึกกิจกรรม'
    });
  }
});

module.exports = router;
