const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { attachUser, requireAdmin } = require('../middleware/auth');

// ใช้ middleware ตรวจสอบผู้ใช้ทุก route
router.use(attachUser);

// Helper function to get branch ID of logged-in user or first branch (supporting admin override)
async function getBranchId(req, db) {
  let branchId = req.user ? req.user.branch_id : null;
  const paramBranchId = req.query.branch_id || (req.body ? req.body.branch_id : null);
  if (req.user && req.user.role === 'admin' && paramBranchId) {
    branchId = Number(paramBranchId);
  }
  if (!branchId) {
    const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
    branchId = defaultBranch ? defaultBranch.id : null;
  }
  return branchId;
}

// ─── GET / — ดึงตั้งค่าทั้งหมด (key-value object) ───────
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const branchId = await getBranchId(req, db);
    const rows = await db.prepare('SELECT key, value, updated_at FROM settings WHERE branch_id = ?').all(branchId);

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
    const branchId = await getBranchId(req, db);

    // ใช้ UPSERT (INSERT OR REPLACE)
    await db.prepare(`
      INSERT INTO settings (branch_id, key, value, updated_at) 
      VALUES (?, ?, ?, datetime('now', 'localtime'))
      ON CONFLICT(branch_id, key) DO UPDATE SET 
        value = excluded.value,
        updated_at = datetime('now', 'localtime')
    `).run(branchId, key, String(value));

    const updated = await db.prepare('SELECT * FROM settings WHERE branch_id = ? AND key = ?').get(branchId, key);

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
    const branchId = await getBranchId(req, db);

    const updateBulk = db.transaction(async () => {
      const upsert = db.prepare(`
        INSERT INTO settings (branch_id, key, value, updated_at) 
        VALUES (?, ?, ?, datetime('now', 'localtime'))
        ON CONFLICT(branch_id, key) DO UPDATE SET 
          value = excluded.value,
          updated_at = datetime('now', 'localtime')
      `);

      for (const setting of settings) {
        if (!setting.key) continue;
        await upsert.run(branchId, setting.key, String(setting.value));
      }

      // ดึงค่าทั้งหมดกลับ
      const rows = await db.prepare('SELECT key, value FROM settings WHERE branch_id = ?').all(branchId);
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

// ─── GET /backup/export — ส่งออกข้อมูลทั้งหมดเป็น JSON ────────────────────────
router.get('/backup/export', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const tables = [
      'branches', 'users', 'categories', 'menu_items', 'branch_stocks', 
      'orders', 'order_items', 'stock_logs', 'settings', 'expenses', 
      'activity_logs', 'free_modifiers', 'branch_free_modifier_stocks', 
      'free_modifier_stock_logs', 'free_modifier_presets', 'archived_orders', 
      'archived_order_items'
    ];
    
    const backup = {};
    for (const table of tables) {
      try {
        backup[table] = await db.prepare(`SELECT * FROM ${table}`).all();
      } catch (tableErr) {
        console.warn(`⚠️ Table ${table} backup failed:`, tableErr.message);
        backup[table] = [];
      }
    }

    res.json({
      success: true,
      data: backup
    });
  } catch (error) {
    console.error('❌ Export backup error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้างไฟล์สำรองข้อมูล'
    });
  }
});

// ─── POST /backup/import — นำเข้ากู้คืนข้อมูลจากไฟล์ JSON ───────────────────────
router.post('/backup/import', requireAdmin, async (req, res) => {
  try {
    const { backup } = req.body;
    const db = getDb();

    if (!backup || typeof backup !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'รูปแบบข้อมูลสำรองไม่ถูกต้อง'
      });
    }

    const importTx = db.transaction(async () => {
      // 1. ล้างข้อมูลทุกตารางก่อน
      const orderOfDeletion = [
        'activity_logs', 'free_modifier_stock_logs', 'stock_logs', 
        'branch_free_modifier_stocks', 'branch_stocks', 'order_items', 
        'archived_order_items', 'orders', 'archived_orders', 
        'free_modifier_presets', 'free_modifiers', 'menu_items', 
        'categories', 'users', 'branches', 'settings', 'expenses'
      ];

      for (const table of orderOfDeletion) {
        try {
          await db.prepare(`DELETE FROM ${table}`).run();
        } catch (delErr) {
          console.warn(`⚠️ Clean table ${table} failed:`, delErr.message);
        }
      }

      // 2. เขียนข้อมูลกลับทีละตารางตามลำดับความสัมพันธ์หลักก่อน
      const orderOfInsertion = [
        'branches', 'users', 'categories', 'menu_items', 'branch_stocks', 
        'orders', 'order_items', 'stock_logs', 'settings', 'expenses', 
        'activity_logs', 'free_modifiers', 'branch_free_modifier_stocks', 
        'free_modifier_stock_logs', 'free_modifier_presets', 'archived_orders', 
        'archived_order_items'
      ];

      for (const table of orderOfInsertion) {
        const rows = backup[table];
        if (!rows || !Array.isArray(rows) || rows.length === 0) continue;

        // ดึง keys จากแถวแรก เพื่อสร้างคอลัมน์และ placeholders
        const sampleRow = rows[0];
        const keys = Object.keys(sampleRow);
        const columns = keys.join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const insertStmt = db.prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`);

        for (const row of rows) {
          const vals = keys.map(k => row[k]);
          await insertStmt.run(vals);
        }
      }

      return true;
    });

    await importTx();

    res.json({
      success: true,
      message: 'กู้คืนข้อมูลระบบสำเร็จเสร็จสิ้น'
    });
  } catch (error) {
    console.error('❌ Import backup error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการนำข้อมูลเข้า: ' + error.message
    });
  }
});

// ─── GET /backup/sqlite — ดาวน์โหลดไฟล์ฐานข้อมูล SQLite ตรงๆ ────────────────
router.get('/backup/sqlite', requireAdmin, async (req, res) => {
  try {
    const path = require('path');
    const fs = require('fs');
    const dbPath = path.join(__dirname, '..', '..', 'data', 'pos.db');

    if (fs.existsSync(dbPath) && !process.env.TURSO_DATABASE_URL) {
      res.download(dbPath, 'pos-changdang.db');
    } else {
      res.status(400).json({
        success: false,
        error: 'ระบบนี้เชื่อมต่อฐานข้อมูลบน Cloud หรือไม่พบไฟล์ฐานข้อมูลในเครื่อง'
      });
    }
  } catch (error) {
    console.error('❌ SQLite backup error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการส่งออกไฟล์ SQLite'
    });
  }
});

// ─── POST /archive — จัดเก็บประวัติออเดอร์เก่าถาวร ───────────────────────────
router.post('/archive', requireAdmin, async (req, res) => {
  try {
    const { months } = req.body;
    if (!months || isNaN(Number(months)) || Number(months) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุจำนวนเดือนย้อนหลังที่ถูกต้อง (ต้องมากกว่า 0)'
      });
    }

    const db = getDb();
    const branchId = await getBranchId(req, db);

    const archiveTx = db.transaction(async () => {
      // 1. ดึง ID ออเดอร์ที่อายุเกินกำหนด เฉพาะสาขานี้
      const ordersToArchive = await db.prepare(`
        SELECT id FROM orders WHERE created_at < datetime('now', 'localtime', '-' || ? || ' month') AND branch_id = ?
      `).all(Number(months), branchId);

      if (ordersToArchive.length === 0) return 0;

      const orderIds = ordersToArchive.map(o => o.id);
      
      const batchSize = 500;
      let totalArchived = 0;

      for (let i = 0; i < orderIds.length; i += batchSize) {
        const batchIds = orderIds.slice(i, i + batchSize);
        const placeholders = batchIds.map(() => '?').join(',');

        // คัดลอกไปตารางเก็บถาวร
        await db.prepare(`
          INSERT OR IGNORE INTO archived_orders
          SELECT * FROM orders WHERE id IN (${placeholders})
        `).run(batchIds);

        await db.prepare(`
          INSERT OR IGNORE INTO archived_order_items
          SELECT * FROM order_items WHERE order_id IN (${placeholders})
        `).run(batchIds);

        // ลบออกจากตารางหลัก
        await db.prepare(`
          DELETE FROM order_items WHERE order_id IN (${placeholders})
        `).run(batchIds);

        const delRes = await db.prepare(`
          DELETE FROM orders WHERE id IN (${placeholders})
        `).run(batchIds);

        totalArchived += delRes.changes;
      }

      return totalArchived;
    });

    const count = await archiveTx();

    res.json({
      success: true,
      data: {
        archived_count: count
      }
    });
  } catch (error) {
    console.error('❌ Archive orders error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการย้ายข้อมูลจัดเก็บถาวร: ' + error.message
    });
  }
});

module.exports = router;
