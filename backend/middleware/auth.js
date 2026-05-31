const { getDb } = require('../config/database');

/**
 * Middleware ตรวจสอบผู้ใช้จาก header
 * ใช้ x-user-id หรือ Authorization header เพื่อหาผู้ใช้ในระบบ
 */
async function attachUser(req, res, next) {
  try {
    const db = getDb();
    let userId = req.headers['x-user-id'];

    // ถ้าไม่มี x-user-id ให้ลองจาก Authorization header
    if (!userId) {
      const authHeader = req.headers['authorization'];
      if (authHeader) {
        // รองรับ format: Bearer <userId> หรือ <userId>
        userId = authHeader.replace(/^Bearer\s+/i, '').trim();
      }
    }

    if (userId) {
      const user = await db.prepare(
        'SELECT id, name, pin, role, active FROM users WHERE id = ? AND active = 1'
      ).get(Number(userId));

      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    next();
  }
}

/**
 * Middleware ต้องล็อกอินก่อนใช้งาน
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน'
    });
  }
  next();
}

/**
 * Middleware ต้องเป็นแอดมินเท่านั้น
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน'
    });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'ต้องเป็นแอดมินเท่านั้นจึงจะใช้งานได้'
    });
  }
  next();
}

module.exports = { attachUser, requireAuth, requireAdmin };
