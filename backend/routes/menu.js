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
        mi.id, mi.name, mi.price AS global_price, mi.category_id, 
        mi.image_url, mi.active, mi.sort_order, mi.uom,
        mi.created_at, mi.updated_at,
        c.name as category_name,
        COALESCE(bs.price, mi.price) AS price,
        bs.quantity as stock,
        bs.raw_quantity as raw_stock
      FROM menu_items mi
      LEFT JOIN categories c ON c.id = mi.category_id
      INNER JOIN branch_stocks bs ON bs.menu_item_id = mi.id AND bs.branch_id = ?
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
    const { name, price, category_id, image_url, stock, raw_stock, track_raw_stock, sort_order, uom } = req.body;

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
        INSERT INTO menu_items (name, price, category_id, image_url, sort_order, uom)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        name,
        price,
        category_id || null,
        image_url || null,
        sort_order || 0,
        uom || 'ชิ้น'
      );

      const newItemId = result.lastInsertRowid;

      // ใส่ข้อมูลสต็อกแยกสาขา
      if (branchId) {
        await db.prepare(`
          INSERT INTO branch_stocks (branch_id, menu_item_id, quantity, raw_quantity, price)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          branchId, 
          newItemId, 
          stock !== undefined && stock !== null ? stock : 0,
          track_raw_stock ? (raw_stock !== undefined && raw_stock !== null ? raw_stock : 0) : null,
          price !== undefined && price !== null ? price : null
        );
      }

      return newItemId;
    });

    const orderId = await createMenuWithStock();

    const item = await db.prepare(`
      SELECT mi.*, c.name as category_name, bs.quantity as stock, bs.raw_quantity as raw_stock
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
    const { name, price, category_id, image_url, stock, raw_stock, track_raw_stock, sort_order, active, uom } = req.body;
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
            sort_order = ?, active = ?, uom = ?,
            updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(
        name !== undefined ? name : item.name,
        price !== undefined ? price : item.price,
        category_id !== undefined ? category_id : item.category_id,
        image_url !== undefined ? image_url : item.image_url,
        sort_order !== undefined ? sort_order : item.sort_order,
        active !== undefined ? active : item.active,
        uom !== undefined ? uom : item.uom,
        Number(id)
      );

      // อัปเดตสต็อกใน branch_stocks
      if (branchId) {
        const stockRow = await db.prepare('SELECT * FROM branch_stocks WHERE branch_id = ? AND menu_item_id = ?').get(branchId, Number(id));
        if (stockRow) {
          let q = stockRow.quantity;
          if (stock !== undefined && stock !== null) {
            q = stock;
          } else if (q === null) {
            q = 0;
          }
          let rq = stockRow.raw_quantity;
          if (track_raw_stock !== undefined) {
            if (track_raw_stock) {
              rq = (raw_stock !== undefined && raw_stock !== null) ? raw_stock : (rq !== null ? rq : 0);
            } else {
              rq = null;
            }
          } else if (raw_stock !== undefined) {
            rq = raw_stock;
          }
          let p = stockRow.price;
          if (price !== undefined) {
            p = price;
          }
          await db.prepare(`
            UPDATE branch_stocks
            SET quantity = ?, raw_quantity = ?, price = ?, updated_at = datetime('now', 'localtime')
            WHERE branch_id = ? AND menu_item_id = ?
          `).run(q, rq, p, branchId, Number(id));
        } else {
          let q = stock !== undefined && stock !== null ? stock : 0;
          let rq = track_raw_stock ? (raw_stock !== undefined && raw_stock !== null ? raw_stock : 0) : null;
          let p = price !== undefined ? price : null;
          await db.prepare(`
            INSERT INTO branch_stocks (branch_id, menu_item_id, quantity, raw_quantity, price)
            VALUES (?, ?, ?, ?, ?)
          `).run(branchId, Number(id), q, rq, p);
        }
      }
    });

    await updateMenuWithStock();

    const updated = await db.prepare(`
      SELECT mi.*, c.name as category_name, bs.quantity as stock, bs.raw_quantity as raw_stock
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

// ─── DELETE /:id — ลบเมนูออกจากระบบ (hard delete) ───────
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

    // ลบข้อมูลที่เกี่ยวข้องทั้งหมดใน transaction
    const deleteMenu = db.transaction(async () => {
      // ตัดความเชื่อมโยงกับ order_items (เก็บประวัติออเดอร์ไว้ แต่เอา FK ออก)
      await db.prepare('UPDATE order_items SET menu_item_id = NULL WHERE menu_item_id = ?').run(Number(id));
      // ลบ stock_logs ที่เกี่ยวข้อง
      await db.prepare('DELETE FROM stock_logs WHERE menu_item_id = ?').run(Number(id));
      // ลบสต็อกสาขาที่เกี่ยวข้อง
      await db.prepare('DELETE FROM branch_stocks WHERE menu_item_id = ?').run(Number(id));
      // ลบเมนูออกจาก database
      await db.prepare('DELETE FROM menu_items WHERE id = ?').run(Number(id));
    });

    await deleteMenu();

    res.json({
      success: true,
      data: { message: 'ลบเมนูสำเร็จ' }
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
