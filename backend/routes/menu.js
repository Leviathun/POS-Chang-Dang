const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { attachUser, requireAuth, requireAdmin } = require('../middleware/auth');

// ใช้ middleware ตรวจสอบผู้ใช้ทุก route
router.use(attachUser);

// ═══════════════════════════════════════════════════════════
// เมนูสินค้า
// ═══════════════════════════════════════════════════════════

// ─── GET / — รายการเมนูทั้งหมดที่ใช้งานอยู่ (JOIN หมวดหมู่ + สต็อกแยกสาขา) ─
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    
    // หาสาขาของผู้ใช้ ถ้าไม่มีให้ใช้สาขาแรก
    let branchId = req.user ? req.user.branch_id : null;
    if (!branchId) {
      const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
      branchId = defaultBranch ? defaultBranch.id : null;
    }

    const items = await db.prepare(`
      SELECT 
        mi.id, mi.name, mi.price, mi.category_id, 
        mi.image_url, mi.active, mi.sort_order,
        mi.created_at, mi.updated_at,
        c.name as category_name,
        bs.quantity as stock
      FROM menu_items mi
      LEFT JOIN categories c ON c.id = mi.category_id
      LEFT JOIN branch_stocks bs ON bs.menu_item_id = mi.id AND bs.branch_id = ?
      WHERE mi.active = 1
      ORDER BY mi.sort_order ASC, mi.id ASC
    `).all(branchId);

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error('❌ Get menu items error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลเมนู'
    });
  }
});

// ═══════════════════════════════════════════════════════════
// หมวดหมู่
// ═══════════════════════════════════════════════════════════

// ─── GET /categories — รายการหมวดหมู่ทั้งหมด ────────────
router.get('/categories', async (req, res) => {
  try {
    const db = getDb();
    const categories = await db.prepare(
      'SELECT * FROM categories WHERE active = 1 ORDER BY sort_order ASC, id ASC'
    ).all();

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('❌ Get categories error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่'
    });
  }
});

// ─── POST /categories — สร้างหมวดหมู่ใหม่ ──────────────
router.post('/categories', requireAdmin, async (req, res) => {
  try {
    const { name, sort_order } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุชื่อหมวดหมู่'
      });
    }

    const db = getDb();

    const result = await db.prepare(
      'INSERT INTO categories (name, sort_order) VALUES (?, ?)'
    ).run(name, sort_order || 0);

    const category = await db.prepare(
      'SELECT * FROM categories WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({
        success: false,
        error: 'ชื่อหมวดหมู่นี้มีอยู่แล้ว'
      });
    }
    console.error('❌ Create category error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้างหมวดหมู่'
    });
  }
});

// ─── PUT /categories/:id — แก้ไขหมวดหมู่ ────────────────
router.put('/categories/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sort_order } = req.body;
    const db = getDb();

    const category = await db.prepare('SELECT * FROM categories WHERE id = ?').get(Number(id));
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบหมวดหมู่'
      });
    }

    await db.prepare(
      'UPDATE categories SET name = ?, sort_order = ? WHERE id = ?'
    ).run(
      name || category.name,
      sort_order !== undefined ? sort_order : category.sort_order,
      Number(id)
    );

    const updated = await db.prepare('SELECT * FROM categories WHERE id = ?').get(Number(id));

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({
        success: false,
        error: 'ชื่อหมวดหมู่นี้มีอยู่แล้ว'
      });
    }
    console.error('❌ Update category error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการแก้ไขหมวดหมู่'
    });
  }
});

// ─── DELETE /categories/:id — ลบหมวดหมู่ ────────────────
router.delete('/categories/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const category = await db.prepare('SELECT * FROM categories WHERE id = ?').get(Number(id));
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบหมวดหมู่'
      });
    }

    // ตรวจสอบว่ามีเมนูอยู่ในหมวดหมู่หรือไม่
    const menuCount = await db.prepare(
      'SELECT COUNT(*) as count FROM menu_items WHERE category_id = ? AND active = 1'
    ).get(Number(id));

    if (menuCount.count > 0) {
      return res.status(400).json({
        success: false,
        error: `ไม่สามารถลบได้ มีเมนู ${menuCount.count} รายการในหมวดหมู่นี้`
      });
    }

    await db.prepare('UPDATE categories SET active = 0 WHERE id = ?').run(Number(id));

    res.json({
      success: true,
      data: { message: 'ลบหมวดหมู่สำเร็จ' }
    });
  } catch (error) {
    console.error('❌ Delete category error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการลบหมวดหมู่'
    });
  }
});

// ═══════════════════════════════════════════════════════════
// เมนูสินค้า CRUD
// ═══════════════════════════════════════════════════════════

// ─── POST / — สร้างเมนูใหม่ ─────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, price, category_id, image_url, stock, sort_order } = req.body;

    if (!name || price === undefined || price === null) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุชื่อเมนูและราคา'
      });
    }

    if (price < 0) {
      return res.status(400).json({
        success: false,
        error: 'ราคาต้องไม่ติดลบ'
      });
    }

    const db = getDb();

    // ตรวจสอบหมวดหมู่ (ถ้าระบุ)
    if (category_id) {
      const cat = await db.prepare('SELECT id FROM categories WHERE id = ?').get(Number(category_id));
      if (!cat) {
        return res.status(400).json({
          success: false,
          error: 'ไม่พบหมวดหมู่ที่ระบุ'
        });
      }
    }

    // หาสาขาหลักสำหรับใส่สต็อกเริ่มต้น
    let branchId = req.user ? req.user.branch_id : null;
    if (!branchId) {
      const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
      branchId = defaultBranch ? defaultBranch.id : null;
    }

    // บันทึกเมนู (ใช้ transaction เพื่อใส่ทั้งเมนูหลักและจำนวนสต็อกสาขา)
    const createMenuWithStock = db.transaction(async () => {
      const result = await db.prepare(`
        INSERT INTO menu_items (name, price, category_id, image_url, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        name,
        price,
        category_id || null,
        image_url || null,
        sort_order || 0
      );

      const newItemId = result.lastInsertRowid;

      // ใส่ข้อมูลสต็อกแยกสาขา
      if (branchId) {
        await db.prepare(`
          INSERT INTO branch_stocks (branch_id, menu_item_id, quantity)
          VALUES (?, ?, ?)
        `).run(branchId, newItemId, stock !== undefined && stock !== null ? stock : null);
      }

      return newItemId;
    });

    const orderId = await createMenuWithStock();

    const item = await db.prepare(`
      SELECT mi.*, c.name as category_name, bs.quantity as stock
      FROM menu_items mi
      LEFT JOIN categories c ON c.id = mi.category_id
      LEFT JOIN branch_stocks bs ON bs.menu_item_id = mi.id AND bs.branch_id = ?
      WHERE mi.id = ?
    `).get(branchId, orderId);

    res.status(201).json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('❌ Create menu item error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้างเมนู'
    });
  }
});

// ─── PUT /:id — แก้ไขเมนู ────────────────────────────────
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, category_id, image_url, stock, sort_order, active } = req.body;
    const db = getDb();

    const item = await db.prepare('SELECT * FROM menu_items WHERE id = ?').get(Number(id));
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบเมนู'
      });
    }

    // ตรวจสอบหมวดหมู่ (ถ้าเปลี่ยน)
    if (category_id !== undefined && category_id !== null) {
      const cat = await db.prepare('SELECT id FROM categories WHERE id = ?').get(Number(category_id));
      if (!cat) {
        return res.status(400).json({
          success: false,
          error: 'ไม่พบหมวดหมู่ที่ระบุ'
        });
      }
    }

    let branchId = req.user ? req.user.branch_id : null;
    if (!branchId) {
      const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
      branchId = defaultBranch ? defaultBranch.id : null;
    }

    const updateMenuWithStock = db.transaction(async () => {
      await db.prepare(`
        UPDATE menu_items 
        SET name = ?, price = ?, category_id = ?, image_url = ?, 
            sort_order = ?, active = ?,
            updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(
        name !== undefined ? name : item.name,
        price !== undefined ? price : item.price,
        category_id !== undefined ? category_id : item.category_id,
        image_url !== undefined ? image_url : item.image_url,
        sort_order !== undefined ? sort_order : item.sort_order,
        active !== undefined ? active : item.active,
        Number(id)
      );

      // อัปเดตสต็อกใน branch_stocks
      if (stock !== undefined && branchId) {
        await db.prepare(`
          INSERT INTO branch_stocks (branch_id, menu_item_id, quantity)
          VALUES (?, ?, ?)
          ON CONFLICT(branch_id, menu_item_id) DO UPDATE SET
            quantity = excluded.quantity,
            updated_at = datetime('now', 'localtime')
        `).run(branchId, Number(id), stock);
      }
    });

    await updateMenuWithStock();

    const updated = await db.prepare(`
      SELECT mi.*, c.name as category_name, bs.quantity as stock
      FROM menu_items mi
      LEFT JOIN categories c ON c.id = mi.category_id
      LEFT JOIN branch_stocks bs ON bs.menu_item_id = mi.id AND bs.branch_id = ?
      WHERE mi.id = ?
    `).get(branchId, Number(id));

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('❌ Update menu item error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการแก้ไขเมนู'
    });
  }
});

// ─── DELETE /:id — ปิดใช้งานเมนู (soft delete) ──────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const item = await db.prepare('SELECT * FROM menu_items WHERE id = ?').get(Number(id));
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบเมนู'
      });
    }

    await db.prepare(
      "UPDATE menu_items SET active = 0, updated_at = datetime('now', 'localtime') WHERE id = ?"
    ).run(Number(id));

    res.json({
      success: true,
      data: { message: 'ปิดใช้งานเมนูสำเร็จ' }
    });
  } catch (error) {
    console.error('❌ Delete menu item error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการลบเมนู'
    });
  }
});

// ─── POST /:id/toggle — สลับสถานะเปิด/ปิดเมนู ─────────
router.post('/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const item = await db.prepare('SELECT * FROM menu_items WHERE id = ?').get(Number(id));
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบเมนู'
      });
    }

    let branchId = req.user ? req.user.branch_id : null;
    if (!branchId) {
      const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
      branchId = defaultBranch ? defaultBranch.id : null;
    }

    const newActive = item.active ? 0 : 1;
    await db.prepare(
      "UPDATE menu_items SET active = ?, updated_at = datetime('now', 'localtime') WHERE id = ?"
    ).run(newActive, Number(id));

    const updated = await db.prepare(`
      SELECT mi.*, c.name as category_name, bs.quantity as stock
      FROM menu_items mi
      LEFT JOIN categories c ON c.id = mi.category_id
      LEFT JOIN branch_stocks bs ON bs.menu_item_id = mi.id AND bs.branch_id = ?
      WHERE mi.id = ?
    `).get(branchId, Number(id));

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('❌ Toggle menu item error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะเมนู'
    });
  }
});

module.exports = router;
