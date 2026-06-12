const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { attachUser, requireAuth, requireAdmin } = require('../middleware/auth');

// Apply attachUser globally to all modifier routes
router.use(attachUser);

// Helper function to get branch ID of logged-in user or first branch
async function getBranchId(req, db) {
  let branchId = req.user ? req.user.branch_id : null;
  if (!branchId) {
    const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
    branchId = defaultBranch ? defaultBranch.id : null;
  }
  return branchId;
}

// ─── GET / — ดึงรายการเครื่องปรุงฟรีพร้อมคลังสินค้าของสาขา ──────────────────
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const branchId = await getBranchId(req, db);

    const items = await db.prepare(`
      SELECT 
        fm.id, fm.name, fm.category, fm.servings_per_bag, fm.active,
        COALESCE(bfms.total_servings, 0) as total_servings
      FROM free_modifiers fm
      LEFT JOIN branch_free_modifier_stocks bfms 
        ON bfms.modifier_id = fm.id AND bfms.branch_id = ?
      WHERE fm.branch_id = ?
      ORDER BY fm.category ASC, fm.name ASC
    `).all(branchId, branchId);

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error('❌ Get free modifiers error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายการซอส/ผงปรุงรส'
    });
  }
});

// ─── POST /restock — เติมของเข้าระบบเป็นหน่วย "ถุง" (หรือซอง) ────────────────
router.post('/restock', requireAuth, async (req, res) => {
  try {
    const { modifier_id, bags, note } = req.body;
    const db = getDb();

    if (!modifier_id || !bags || Number(bags) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ modifier_id และจำนวนถุง/ซอง (ต้องมากกว่า 0)'
      });
    }

    const branchId = await getBranchId(req, db);

    const modifier = await db.prepare('SELECT * FROM free_modifiers WHERE id = ? AND branch_id = ?').get(Number(modifier_id), branchId);
    if (!modifier) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบรายการเครื่องปรุง'
      });
    }

    const servingsPerBag = modifier.servings_per_bag || 50;
    const addServings = Number(bags) * servingsPerBag;

    const restockTx = db.transaction(async () => {
      // ดึงสต็อกปัจจุบัน
      const currentStock = await db.prepare(
        'SELECT total_servings FROM branch_free_modifier_stocks WHERE branch_id = ? AND modifier_id = ?'
      ).get(branchId, modifier.id);

      const prevServings = currentStock ? currentStock.total_servings : 0;
      const newServings = prevServings + addServings;

      // อัปเดตคลัง
      await db.prepare(`
        INSERT INTO branch_free_modifier_stocks (branch_id, modifier_id, total_servings)
        VALUES (?, ?, ?)
        ON CONFLICT(branch_id, modifier_id) DO UPDATE SET
          total_servings = excluded.total_servings,
          updated_at = datetime('now', 'localtime')
      `).run(branchId, modifier.id, newServings);

      // บันทึก Log
      const displayUnit = modifier.category === 'sauce_small' ? 'ซอง' : 'ถุง';
      await db.prepare(`
        INSERT INTO free_modifier_stock_logs (branch_id, modifier_id, change_qty, previous_stock, new_stock, reason, staff_id, note, created_at)
        VALUES (?, ?, ?, ?, ?, 'restock', ?, ?, datetime('now', '+7 hours'))
      `).run(
        branchId,
        modifier.id,
        addServings,
        prevServings,
        newServings,
        req.user.id,
        note || `เติมสต็อกสำเร็จ +${bags} ${displayUnit} (+${addServings} รอบ)`
      );

      return newServings;
    });

    const finalStock = await restockTx();

    res.json({
      success: true,
      data: {
        modifier_id: modifier.id,
        name: modifier.name,
        total_servings: finalStock
      }
    });
  } catch (error) {
    console.error('❌ Restock free modifier error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการเติมคลังสินค้า'
    });
  }
});

// ─── POST /adjust — ปรับปรุงสต็อกแบบละเอียดเป็น "รอบเสิร์ฟ" ──────────────────
router.post('/adjust', requireAuth, async (req, res) => {
  try {
    const { modifier_id, quantity, reason, note } = req.body;
    const db = getDb();

    if (!modifier_id || quantity === undefined || quantity === null) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ modifier_id และจำนวนรอบที่ต้องการปรับ (quantity)'
      });
    }

    const changeQty = Number(quantity);
    const branchId = await getBranchId(req, db);

    const modifier = await db.prepare('SELECT * FROM free_modifiers WHERE id = ? AND branch_id = ?').get(Number(modifier_id), branchId);
    if (!modifier) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบรายการเครื่องปรุง'
      });
    }

    const adjustTx = db.transaction(async () => {
      const currentStock = await db.prepare(
        'SELECT total_servings FROM branch_free_modifier_stocks WHERE branch_id = ? AND modifier_id = ?'
      ).get(branchId, modifier.id);

      const prevServings = currentStock ? currentStock.total_servings : 0;
      const newServings = prevServings + changeQty;

      if (newServings < 0) {
        throw new Error(`สต็อกสินค้า "${modifier.name}" ไม่สามารถปรับให้ติดลบได้ (มีอยู่ ${prevServings} รอบ)`);
      }

      await db.prepare(`
        INSERT INTO branch_free_modifier_stocks (branch_id, modifier_id, total_servings)
        VALUES (?, ?, ?)
        ON CONFLICT(branch_id, modifier_id) DO UPDATE SET
          total_servings = excluded.total_servings,
          updated_at = datetime('now', 'localtime')
      `).run(branchId, modifier.id, newServings);

      await db.prepare(`
        INSERT INTO free_modifier_stock_logs (branch_id, modifier_id, change_qty, previous_stock, new_stock, reason, staff_id, note, created_at)
        VALUES (?, ?, ?, ?, ?, 'adjustment', ?, ?, datetime('now', '+7 hours'))
      `).run(
        branchId,
        modifier.id,
        changeQty,
        prevServings,
        newServings,
        req.user.id,
        note || `ปรับปรุงสต็อก ${changeQty >= 0 ? '+' : ''}${changeQty} รอบ (${reason || 'ไม่ระบุสาเหตุ'})`
      );

      return newServings;
    });

    const finalStock = await adjustTx();

    res.json({
      success: true,
      data: {
        modifier_id: modifier.id,
        name: modifier.name,
        total_servings: finalStock
      }
    });
  } catch (error) {
    console.error('❌ Adjust free modifier error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการปรับปรุงคลังสินค้า'
    });
  }
});

// ─── POST /toggle/:id — สลับเปิด/ปิดการใช้งานเครื่องปรุง ──────────────────
router.post('/toggle/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const branchId = await getBranchId(req, db);

    const modifier = await db.prepare('SELECT * FROM free_modifiers WHERE id = ? AND branch_id = ?').get(Number(id), branchId);
    if (!modifier) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบรายการเครื่องปรุง'
      });
    }

    const newActive = modifier.active ? 0 : 1;
    await db.prepare('UPDATE free_modifiers SET active = ? WHERE id = ? AND branch_id = ?').run(newActive, modifier.id, branchId);

    res.json({
      success: true,
      data: {
        id: modifier.id,
        name: modifier.name,
        active: newActive
      }
    });
  } catch (error) {
    console.error('❌ Toggle free modifier error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสลับสถานะเปิด/ปิดการใช้งาน'
    });
  }
});

// ─── GET /presets — ดึงรายการสูตรผสมทั้งหมด ──────────────────────────────
router.get('/presets', async (req, res) => {
  try {
    const db = getDb();
    const branchId = await getBranchId(req, db);
    const presets = await db.prepare('SELECT * FROM free_modifier_presets WHERE branch_id = ? ORDER BY name ASC').all(branchId);
    
    // แปลง modifier_ids string กลับเป็น array
    const formatted = presets.map(p => ({
      ...p,
      modifier_ids: JSON.parse(p.modifier_ids || '[]')
    }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('❌ Get presets error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสูตรสำเร็จ'
    });
  }
});

// ─── POST /presets — เพิ่มสูตรสำเร็จใหม่ ──────────────────────────────────
router.post('/presets', requireAdmin, async (req, res) => {
  try {
    const { name, modifier_ids } = req.body;
    const db = getDb();

    if (!name || !modifier_ids || !Array.isArray(modifier_ids)) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุชื่อสูตร (name) และรายการตัวเลือกย่อย (modifier_ids: array)'
      });
    }

    const branchId = await getBranchId(req, db);

    const result = await db.prepare('INSERT INTO free_modifier_presets (branch_id, name, modifier_ids, created_at) VALUES (?, ?, ?, datetime("now", "+7 hours"))')
      .run(branchId, name, JSON.stringify(modifier_ids));

    const newPreset = await db.prepare('SELECT * FROM free_modifier_presets WHERE id = ?').get(result.lastInsertRowid);
    newPreset.modifier_ids = JSON.parse(newPreset.modifier_ids || '[]');

    res.status(201).json({
      success: true,
      data: newPreset
    });
  } catch (error) {
    console.error('❌ Create preset error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้างสูตรสำเร็จ'
    });
  }
});

// ─── PUT /presets/:id — แก้ไขสูตรสำเร็จ ──────────────────────────────────
router.put('/presets/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, modifier_ids, active } = req.body;
    const db = getDb();
    const branchId = await getBranchId(req, db);

    const preset = await db.prepare('SELECT * FROM free_modifier_presets WHERE id = ? AND branch_id = ?').get(Number(id), branchId);
    if (!preset) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบสูตรสำเร็จ'
      });
    }

    const updatedName = name !== undefined ? name : preset.name;
    const updatedIds = modifier_ids !== undefined ? JSON.stringify(modifier_ids) : preset.modifier_ids;
    const updatedActive = active !== undefined ? active : preset.active;

    await db.prepare(`
      UPDATE free_modifier_presets 
      SET name = ?, modifier_ids = ?, active = ? 
      WHERE id = ? AND branch_id = ?
    `).run(updatedName, updatedIds, updatedActive, Number(id), branchId);

    const updated = await db.prepare('SELECT * FROM free_modifier_presets WHERE id = ?').get(Number(id));
    updated.modifier_ids = JSON.parse(updated.modifier_ids || '[]');

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('❌ Update preset error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการแก้ไขสูตรสำเร็จ'
    });
  }
});

// ─── DELETE /presets/:id — ลบสูตรสำเร็จ ──────────────────────────────────
router.delete('/presets/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const branchId = await getBranchId(req, db);

    const preset = await db.prepare('SELECT * FROM free_modifier_presets WHERE id = ? AND branch_id = ?').get(Number(id), branchId);
    if (!preset) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบสูตรสำเร็จ'
      });
    }

    await db.prepare('DELETE FROM free_modifier_presets WHERE id = ? AND branch_id = ?').run(Number(id), branchId);

    res.json({
      success: true,
      message: 'ลบสูตรสำเร็จแล้ว'
    });
  } catch (error) {
    console.error('❌ Delete preset error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการลบสูตรสำเร็จ'
    });
  }
});

// ─── GET /:id/logs — ดึงประวัติการเข้า-ออกของสต็อกเครื่องปรุง ──────────────────
router.get('/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const db = getDb();
    const branchId = await getBranchId(req, db);

    const modifier = await db.prepare('SELECT id, name FROM free_modifiers WHERE id = ? AND branch_id = ?').get(Number(id), branchId);
    if (!modifier) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบรายการเครื่องปรุง'
      });
    }

    const logs = await db.prepare(`
      SELECT fmsl.*, u.name as staff_name
      FROM free_modifier_stock_logs fmsl
      LEFT JOIN users u ON u.id = fmsl.staff_id
      WHERE fmsl.modifier_id = ? AND fmsl.branch_id = ?
      ORDER BY fmsl.created_at DESC
      LIMIT ?
    `).all(Number(id), branchId, limit);

    res.json({
      success: true,
      data: {
        modifier,
        logs
      }
    });
  } catch (error) {
    console.error('❌ Get free modifier logs error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงประวัติการปรับปรุงสต็อก'
    });
  }
});

module.exports = router;
