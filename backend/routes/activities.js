const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { attachUser, requireAdmin } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(attachUser);
router.use(requireAdmin);

// ─── GET / — Get Activity Logs (by Date) ─────────────────────
router.get('/', async (req, res) => {
  try {
    const { date, month, year, user_id, limit, offset } = req.query;
    const db = getDb();

    let branchId = req.user.branch_id;
    if (!branchId) {
      const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
      branchId = defaultBranch ? defaultBranch.id : null;
    }

    const queryLimit = parseInt(limit) || 100;
    const queryOffset = parseInt(offset) || 0;

    let sql = `
      SELECT al.*, u.name as staff_name 
      FROM activity_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE al.branch_id = ?
    `;
    const params = [branchId];

    if (year) {
      sql += " AND strftime('%Y', al.created_at) = ?";
      params.push(year);
    } else if (month) {
      sql += " AND strftime('%Y-%m', al.created_at) = ?";
      params.push(month);
    } else {
      const dateVal = date || new Date().toISOString().split('T')[0];
      sql += ' AND date(al.created_at) = ?';
      params.push(dateVal);
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
