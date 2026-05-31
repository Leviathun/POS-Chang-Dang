const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { attachUser, requireAdmin } = require('../middleware/auth');

// ใช้ middleware ตรวจสอบผู้ใช้ทุก route
router.use(attachUser);

// ─── GET / — ดึงตั้งค่าทั้งหมด (key-value object) ───────
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const rows = await db.prepare('SELECT key, value, updated_at FROM settings').all();

    // แปลงเป็น object { key: value }
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('❌ Get settings error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลตั้งค่า'
    });
  }
});

// ─── PUT / — อัปเดตตั้งค่าเดียว ─────────────────────────
router.put('/', requireAdmin, async (req, res) => {
  try {
    const { key, value } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ key'
      });
    }

    const db = getDb();

    // ใช้ UPSERT (INSERT OR REPLACE)
    await db.prepare(`
      INSERT INTO settings (key, value, updated_at) 
      VALUES (?, ?, datetime('now', 'localtime'))
      ON CONFLICT(key) DO UPDATE SET 
        value = excluded.value,
        updated_at = datetime('now', 'localtime')
    `).run(key, String(value));

    const updated = await db.prepare('SELECT * FROM settings WHERE key = ?').get(key);

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('❌ Update setting error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการอัปเดตตั้งค่า'
    });
  }
});

// ─── PUT /bulk — อัปเดตตั้งค่าหลายรายการ ────────────────
router.put('/bulk', requireAdmin, async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || !Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ settings เป็น array ของ { key, value }'
      });
    }

    const db = getDb();

    const updateBulk = db.transaction(async () => {
      const upsert = db.prepare(`
        INSERT INTO settings (key, value, updated_at) 
        VALUES (?, ?, datetime('now', 'localtime'))
        ON CONFLICT(key) DO UPDATE SET 
          value = excluded.value,
          updated_at = datetime('now', 'localtime')
      `);

      for (const setting of settings) {
        if (!setting.key) continue;
        await upsert.run(setting.key, String(setting.value));
      }

      // ดึงค่าทั้งหมดกลับ
      const rows = await db.prepare('SELECT key, value FROM settings').all();
      const result = {};
      for (const row of rows) {
        result[row.key] = row.value;
      }
      return result;
    });

    const result = await updateBulk();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Bulk update settings error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการอัปเดตตั้งค่า'
    });
  }
});

module.exports = router;
