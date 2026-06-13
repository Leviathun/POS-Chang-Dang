const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { attachUser, requireAuth, requireAdmin } = require('../middleware/auth');

// ใช้ middleware ตรวจสอบผู้ใช้ทุก route
router.use(attachUser);

// ─── GET /branches — รายการสาขาทั้งหมด (Public, ไม่ต้อง login) ───
router.get('/branches', async (req, res) => {
  try {
    const db = getDb();
    const branches = await db.prepare(
      'SELECT id, name, address FROM branches ORDER BY id ASC'
    ).all();

    res.json({
      success: true,
      data: branches
    });
  } catch (error) {
    console.error('❌ Get branches error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสาขา'
    });
  }
});

// ─── POST /login — เข้าสู่ระบบด้วย PIN + เลือกสาขา ──────
router.post('/login', async (req, res) => {
  try {
    const { pin, branch_id } = req.body;

    if (!pin) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ PIN'
      });
    }

    const db = getDb();
    const user = await db.prepare(
      'SELECT id, name, role, active, branch_id FROM users WHERE pin = ? AND active = 1'
    ).get(String(pin));

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'PIN ไม่ถูกต้องหรือบัญชีถูกปิดใช้งาน'
      });
    }

    const selectedBranchId = branch_id ? Number(branch_id) : null;

    // ถ้าไม่ใช่แอดมิน (เป็นพนักงานทั่วไป) ต้องตรวจสอบสิทธิ์สาขา
    if (user.role !== 'admin') {
      if (selectedBranchId && user.branch_id && selectedBranchId !== user.branch_id) {
        return res.status(403).json({
          success: false,
          error: 'รหัส PIN นี้ไม่มีสิทธิ์เข้าใช้งานในสาขานี้'
        });
      }
    }

    // ใช้ branch_id ที่เลือกจากหน้า login (ถ้ามี) แทน branch_id ในฐานข้อมูล
    let activeBranchId = selectedBranchId || user.branch_id;
    if (!activeBranchId) {
      const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
      activeBranchId = defaultBranch ? defaultBranch.id : null;
    }

    // อัปเดต branch_id ของ user ให้ตรงกับที่เลือก (ถ้าเปลี่ยน)
    if (activeBranchId && activeBranchId !== user.branch_id) {
      await db.prepare('UPDATE users SET branch_id = ? WHERE id = ?').run(activeBranchId, user.id);
    }

    // Write to activity logs
    const branchInfo = await db.prepare('SELECT name FROM branches WHERE id = ?').get(activeBranchId);
    await db.prepare(`
      INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
      VALUES (?, ?, 'login', ?, datetime('now', '+7 hours'))
    `).run(activeBranchId, user.id, `พนักงาน ${user.name} เข้าสู่ระบบสำเร็จ (สาขา: ${branchInfo ? branchInfo.name : 'ไม่ระบุ'})`);

    // ส่ง user กลับพร้อม branch_id ที่ถูกต้อง
    res.json({
      success: true,
      data: {
        user: {
          ...user,
          branch_id: activeBranchId
        },
        branch: branchInfo || null
      }
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
      'SELECT id, name, pin, role, active, branch_id, created_at FROM users ORDER BY id'
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
      `INSERT INTO users (name, pin, role, branch_id, created_at) VALUES (?, ?, ?, ?, datetime('now', '+7 hours'))`
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

// ─── DELETE /users/:id — ลบผู้ใช้ (hard delete) ──────────
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

    // ลบผู้ใช้โดยตัดการเชื่อมโยง Foreign Key ในประวัติก่อน
    await db.batch([
      {
        sql: 'UPDATE orders SET staff_id = NULL WHERE staff_id = ?',
        args: [Number(id)]
      },
      {
        sql: 'UPDATE expenses SET staff_id = NULL WHERE staff_id = ?',
        args: [Number(id)]
      },
      {
        sql: 'UPDATE activity_logs SET user_id = NULL WHERE user_id = ?',
        args: [Number(id)]
      },
      {
        sql: 'UPDATE stock_logs SET staff_id = NULL WHERE staff_id = ?',
        args: [Number(id)]
      },
      {
        sql: 'UPDATE modifier_stock_logs SET staff_id = NULL WHERE staff_id = ?',
        args: [Number(id)]
      },
      {
        sql: 'DELETE FROM users WHERE id = ?',
        args: [Number(id)]
      }
    ]);

    res.json({
      success: true,
      data: { message: 'ลบข้อมูลพนักงานสำเร็จเรียบร้อย' }
    });
  } catch (error) {
    console.error('❌ Delete user error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการลบผู้ใช้'
    });
  }
});

// ─── POST /branches — สร้างสาขาใหม่ (Admin only) ────────────────
router.post('/branches', requireAdmin, async (req, res) => {
  try {
    const { name, address, phone } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุชื่อสาขา'
      });
    }

    const db = getDb();

    // ทำรายการแบบ transaction เพื่อความปลอดภัย
    const createBranchTx = db.transaction(async () => {
      const result = await db.prepare(
        `INSERT INTO branches (name, address, created_at) VALUES (?, ?, datetime('now', '+7 hours'))`
      ).run(name.trim(), address ? address.trim() : null);

      const branchId = result.lastInsertRowid;

      // หาสาขาหลัก (เพื่อคัดลอกข้อมูลสินค้า)
      const sourceBranch = await db.prepare('SELECT id FROM branches WHERE id != ? LIMIT 1').get(branchId);
      const sourceBranchId = sourceBranch ? sourceBranch.id : null;

      if (sourceBranchId) {
        // 1. คัดลอก Categories
        const categories = await db.prepare('SELECT id, name, sort_order, active FROM categories WHERE branch_id = ?').all(sourceBranchId);
        const categoryMap = {}; // { [oldCategoryId]: newCategoryId }
        for (const cat of categories) {
          const catRes = await db.prepare(
            'INSERT INTO categories (branch_id, name, sort_order, active) VALUES (?, ?, ?, ?)'
          ).run(branchId, cat.name, cat.sort_order, cat.active);
          categoryMap[cat.id] = catRes.lastInsertRowid;
        }

        // 2. คัดลอก Menu Items (พร้อมตั้งสต็อกเป็น 0/null ตามต้นฉบับ)
        const menuItems = await db.prepare(`
          SELECT name, price, category_id, image_url, active, sort_order, uom, multiple_prices, quantity, raw_quantity 
          FROM menu_items 
          WHERE branch_id = ?
        `).all(sourceBranchId);

        for (const item of menuItems) {
          const newCatId = item.category_id ? categoryMap[item.category_id] : null;
          const initialQuantity = item.quantity !== null ? 0 : null;
          const initialRawQuantity = item.raw_quantity !== null ? 0 : null;

          await db.prepare(`
            INSERT INTO menu_items (branch_id, name, price, category_id, image_url, active, sort_order, uom, multiple_prices, quantity, raw_quantity)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            branchId,
            item.name,
            item.price,
            newCatId,
            item.image_url,
            item.active,
            item.sort_order,
            item.uom,
            item.multiple_prices,
            initialQuantity,
            initialRawQuantity
          );
        }

        // 3. คัดลอก Modifiers
        const modifiers = await db.prepare('SELECT id, name, category, servings_per_bag, active FROM modifiers WHERE branch_id = ?').all(sourceBranchId);
        const modifierMap = {}; // { [oldModifierId]: newModifierId }
        for (const mod of modifiers) {
          const modRes = await db.prepare(`
            INSERT INTO modifiers (branch_id, name, category, servings_per_bag, active, total_servings) 
            VALUES (?, ?, ?, ?, ?, 0)
          `).run(branchId, mod.name, mod.category, mod.servings_per_bag, mod.active);
          
          const newModId = modRes.lastInsertRowid;
          modifierMap[mod.id] = newModId;
        }

        // 4. คัดลอก Modifier Presets (สูตรสำเร็จ)
        const presets = await db.prepare('SELECT id, name, modifier_ids, active FROM modifier_presets WHERE branch_id = ?').all(sourceBranchId);
        for (const preset of presets) {
          let newModIds = [];
          try {
            const oldModIds = JSON.parse(preset.modifier_ids || '[]');
            newModIds = oldModIds.map(oldId => modifierMap[oldId]).filter(id => id !== undefined && id !== null);
          } catch (e) {
            console.error('Failed to parse preset modifier_ids:', preset.modifier_ids);
          }

          await db.prepare(
            'INSERT INTO modifier_presets (branch_id, name, modifier_ids, active) VALUES (?, ?, ?, ?)'
          ).run(branchId, preset.name, JSON.stringify(newModIds), preset.active);
        }

        // 5. คัดลอก Settings และปรับปรุงฟิลด์เฉพาะสาขา
        const settings = await db.prepare('SELECT key, value FROM settings WHERE branch_id = ?').all(sourceBranchId);
        for (const s of settings) {
          let val = s.value;
          if (s.key === 'shop_name') {
            continue; // Skip shop_name settings key in V2
          } else if (s.key === 'line_channel_token' || s.key === 'line_recipient_id' || s.key === 'line_owner_user_id') {
            val = ''; // เคลียร์ไลน์สำหรับผู้ใช้สาขาใหม่
          }
          await db.prepare(
            'INSERT INTO settings (branch_id, key, value) VALUES (?, ?, ?)'
          ).run(branchId, s.key, val);
        }
      } else {
        // ถ้าไม่มีสาขาอื่น (เป็นสาขาแรก) — ให้ Seeder ใน database.js ทำงานอัตโนมัติ
        console.log('No other branches found to clone menu from.');
      }

      // บันทึก Log กิจกรรม
      await db.prepare(`
        INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
        VALUES (?, ?, 'create_branch', ?, datetime('now', '+7 hours'))
      `).run(branchId, req.user.id, `สร้างสาขาใหม่: ${name}`);

      return branchId;
    });

    const newBranchId = await createBranchTx();
    const newBranch = await db.prepare('SELECT * FROM branches WHERE id = ?').get(newBranchId);

    res.status(201).json({
      success: true,
      data: newBranch
    });
  } catch (error) {
    console.error('❌ Create branch error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message.includes('UNIQUE') ? 'มีสาขานี้อยู่ในระบบแล้ว' : 'เกิดข้อผิดพลาดในการสร้างสาขา'
    });
  }
});

// ─── PUT /branches/:id — แก้ไขข้อมูลสาขา (Admin only) ───────────
router.put('/branches/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุชื่อสาขา'
      });
    }

    const db = getDb();
    const branch = await db.prepare('SELECT * FROM branches WHERE id = ?').get(Number(id));
    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบสาขา'
      });
    }

    await db.prepare(
      'UPDATE branches SET name = ?, address = ? WHERE id = ?'
    ).run(name.trim(), address ? address.trim() : null, Number(id));

    // บันทึก Log กิจกรรม
    await db.prepare(`
      INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
      VALUES (?, ?, 'update_branch', ?, datetime('now', '+7 hours'))
    `).run(Number(id), req.user.id, `แก้ไขข้อมูลสาขา: จาก "${branch.name}" เป็น "${name}"`);

    const updated = await db.prepare('SELECT * FROM branches WHERE id = ?').get(Number(id));

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('❌ Update branch error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message.includes('UNIQUE') ? 'มีสาขานี้อยู่ในระบบแล้ว' : 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลสาขา'
    });
  }
});

// ─── DELETE /branches/:id — ลบสาขา (Admin only) ─────────────────
router.delete('/branches/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const branch = await db.prepare('SELECT * FROM branches WHERE id = ?').get(Number(id));
    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบสาขา'
      });
    }

    // ห้ามลบสาขาสุดท้าย
    const branchCount = await db.prepare('SELECT COUNT(*) as count FROM branches').get();
    if (branchCount.count <= 1) {
      return res.status(400).json({
        success: false,
        error: 'ไม่สามารถลบสาขาสุดท้ายของระบบได้'
      });
    }

    // ห้ามลบถ้ามีพนักงานผูกอยู่
    const activeUsers = await db.prepare('SELECT COUNT(*) as count FROM users WHERE branch_id = ? AND active = 1').get(Number(id));
    if (activeUsers.count > 0) {
      return res.status(400).json({
        success: false,
        error: 'ไม่สามารถลบสาขาที่มีพนักงานปฏิบัติงานอยู่ได้'
      });
    }

    // ห้ามลบถ้ามีประวัติออเดอร์ผูกอยู่
    const ordersCount = await db.prepare('SELECT COUNT(*) as count FROM orders WHERE branch_id = ?').get(Number(id));
    if (ordersCount.count > 0) {
      return res.status(400).json({
        success: false,
        error: 'ไม่สามารถลบสาขาที่มีประวัติการทำรายการ (ออเดอร์) อยู่ได้'
      });
    }

    // ลบสาขาและข้อมูลเมนู/สต็อก (เนื่องจากมี CASCADE ใน menu_items และตารางอื่นที่เกี่ยวข้อง)
    await db.prepare('DELETE FROM branches WHERE id = ?').run(Number(id));

    // บันทึก Log กิจกรรมในส่วนกลาง (ไม่มีสาขาให้ระบุให้ระบุ NULL หรือสาขาแรกที่ยังเหลืออยู่)
    const remainingBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
    await db.prepare(`
      INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
      VALUES (?, ?, 'delete_branch', ?, datetime('now', '+7 hours'))
    `).run(remainingBranch ? remainingBranch.id : null, req.user.id, `ลบสาขา: ${branch.name}`);

    res.json({
      success: true,
      data: { message: 'ลบสาขาเรียบร้อยแล้ว' }
    });
  } catch (error) {
    console.error('❌ Delete branch error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการลบสาขา'
    });
  }
});

module.exports = router;
