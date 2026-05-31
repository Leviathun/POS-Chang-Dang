const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { attachUser, requireAuth, requireAdmin } = require('../middleware/auth');

// ใช้ middleware ตรวจสอบผู้ใช้ทุก route
router.use(attachUser);

// ─── POST /login — เข้าสู่ระบบด้วย PIN ─────────────────
router.post('/login', async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ PIN'
      });
    }

    const db = getDb();
    const user = await db.prepare(
      'SELECT id, name, role, active FROM users WHERE pin = ? AND active = 1'
    ).get(String(pin));

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'PIN ไม่ถูกต้องหรือบัญชีถูกปิดใช้งาน'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
    });
  }
});

// ─── GET /users — รายชื่อผู้ใช้ทั้งหมด (แอดมินเท่านั้น) ─
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const users = await db.prepare(
      'SELECT id, name, pin, role, active, created_at FROM users ORDER BY id'
    ).all();

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('❌ Get users error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้'
    });
  }
});

// ─── POST /users — สร้างผู้ใช้ใหม่ (แอดมินเท่านั้น) ────
router.post('/users', requireAdmin, async (req, res) => {
  try {
    const { name, pin, role, branch_id } = req.body;

    if (!name || !pin) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุชื่อและ PIN'
      });
    }

    if (role && !['admin', 'staff'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'role ต้องเป็น admin หรือ staff เท่านั้น'
      });
    }

    const db = getDb();

    // ตรวจสอบ PIN ซ้ำ
    const existing = await db.prepare(
      'SELECT id FROM users WHERE pin = ? AND active = 1'
    ).get(String(pin));

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'PIN นี้ถูกใช้งานแล้ว'
      });
    }

    // หาสาขาหลักถ้าไม่ได้ระบุ branch_id
    let targetBranchId = branch_id;
    if (!targetBranchId) {
      const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
      targetBranchId = defaultBranch ? defaultBranch.id : null;
    }

    const result = await db.prepare(
      'INSERT INTO users (name, pin, role, branch_id) VALUES (?, ?, ?, ?)'
    ).run(name, String(pin), role || 'staff', targetBranchId);

    const user = await db.prepare(
      'SELECT id, name, pin, role, active, created_at FROM users WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('❌ Create user error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้างผู้ใช้'
    });
  }
});

// ─── PUT /users/:id — แก้ไขผู้ใช้ (แอดมินเท่านั้น) ─────
router.put('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, pin, role, branch_id } = req.body;
    const db = getDb();

    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(Number(id));
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบผู้ใช้'
      });
    }

    if (role && !['admin', 'staff'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'role ต้องเป็น admin หรือ staff เท่านั้น'
      });
    }

    // ตรวจสอบ PIN ซ้ำ (ถ้าเปลี่ยน)
    if (pin && pin !== user.pin) {
      const existing = await db.prepare(
        'SELECT id FROM users WHERE pin = ? AND active = 1 AND id != ?'
      ).get(String(pin), Number(id));

      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'PIN นี้ถูกใช้งานแล้ว'
        });
      }
    }

    await db.prepare(
      'UPDATE users SET name = ?, pin = ?, role = ?, branch_id = ? WHERE id = ?'
    ).run(
      name || user.name,
      pin ? String(pin) : user.pin,
      role || user.role,
      branch_id !== undefined ? branch_id : user.branch_id,
      Number(id)
    );

    const updated = await db.prepare(
      'SELECT id, name, pin, role, active, created_at FROM users WHERE id = ?'
    ).get(Number(id));

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('❌ Update user error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการแก้ไขผู้ใช้'
    });
  }
});

// ─── DELETE /users/:id — ปิดใช้งานผู้ใช้ (soft delete) ──
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(Number(id));
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบผู้ใช้'
      });
    }

    // ป้องกันไม่ให้ลบตัวเอง
    if (req.user && req.user.id === Number(id)) {
      return res.status(400).json({
        success: false,
        error: 'ไม่สามารถลบบัญชีตัวเองได้'
      });
    }

    await db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(Number(id));

    res.json({
      success: true,
      data: { message: 'ปิดใช้งานผู้ใช้สำเร็จ' }
    });
  } catch (error) {
    console.error('❌ Delete user error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการลบผู้ใช้'
    });
  }
});

module.exports = router;
