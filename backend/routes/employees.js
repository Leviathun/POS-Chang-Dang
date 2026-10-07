const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { attachUser, requireAuth, requireAdmin, requireManagerOrAdmin } = require('../middleware/auth');

router.use(attachUser);
router.use(requireAuth);

// Helper to get Thailand date string (YYYY-MM-DD)
function getThailandDate() {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
}

// ─── 1. GET /api/employees — รายชื่อพนักงานและค่าแรง (Admin Only) ───
router.get('/', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    let branchId = req.user.branch_id;
    if (req.user.role === 'admin' && req.query.branch_id) {
      branchId = Number(req.query.branch_id);
    }

    let query = `
      SELECT id, branch_id, name, pin, role, active, wage_type, wage_rate, skill_level,
             benefits, created_at
      FROM users
      WHERE active = 1
    `;
    const params = [];

    if (branchId && req.user.role !== 'admin') {
      query += ' AND (branch_id = ? OR branch_id IS NULL)';
      params.push(branchId);
    } else if (branchId && req.query.branch_id) {
      query += ' AND branch_id = ?';
      params.push(branchId);
    }

    query += " ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'manager' THEN 2 ELSE 3 END, id ASC";

    const employees = await db.prepare(query).all(...params);

    res.json({
      success: true,
      data: employees
    });
  } catch (err) {
    console.error('❌ Get employees error:', err.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลพนักงาน' });
  }
});

// ─── 2. PUT /api/employees/:id/compensation — แก้ไขค่าจ้าง (Admin Only) ───
router.put('/:id/compensation', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { wage_type, wage_rate, skill_level, benefits } = req.body;
    const db = getDb();

    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(Number(id));
    if (!user) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลพนักงาน' });
    }

    await db.prepare(`
      UPDATE users SET
        wage_type = ?,
        wage_rate = ?,
        skill_level = ?,
        benefits = ?
      WHERE id = ?
    `).run(
      wage_type || 'daily',
      wage_rate !== undefined ? Number(wage_rate) : 0,
      skill_level || 'regular',
      benefits !== undefined ? String(benefits) : 'ข้าวเที่ยงฟรี',
      Number(id)
    );

    // Log activity safely
    try {
      await db.prepare(`
        INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
        VALUES (?, ?, 'update_employee_compensation', ?, datetime('now', 'localtime'))
      `).run(
        user.branch_id || req.user?.branch_id || 1,
        req.user?.id || 1,
        `อัปเดตข้อมูลค่าจ้างของ ${user.name}: อัตรา ${wage_rate || 0} บาท (${wage_type || 'daily'}), ระดับ ${skill_level || 'regular'}`
      );
    } catch (logErr) {
      console.warn('⚠️ Log activity failed:', logErr.message);
    }

    const updated = await db.prepare('SELECT * FROM users WHERE id = ?').get(Number(id));

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('❌ Update employee compensation error:', err.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลค่าจ้าง' });
  }
});

// ─── 3. GET /api/employees/attendance — ดึงข้อมูลการลงเวลา & การลา (Admin Only) ───
router.get('/attendance', requireAdmin, async (req, res) => {
  try {
    const { date, month, branch_id } = req.query;
    const db = getDb();

    let bId = branch_id;
    if (req.user.role !== 'admin' && !bId) {
      bId = req.user.branch_id;
    }

    if (date) {
      // ดึงรายชื่อพนักงานทั้งหมด + สถานะการเข้างานของวันที่ระบุ
      let query = `
        SELECT u.id as user_id, u.name, u.role,
               COALESCE(a.skill_level, u.skill_level, 'regular') as skill_level,
               COALESCE(a.daily_wage, u.wage_rate, 0) as daily_wage,
               u.wage_rate as default_wage_rate,
               u.wage_type,
               a.id as attendance_id, a.work_date,
               COALESCE(a.status, 'present') as status,
               a.leave_reason,
               COALESCE(a.had_lunch_benefit, 1) as had_lunch_benefit,
               a.note
        FROM users u
        LEFT JOIN employee_attendance a ON u.id = a.user_id AND a.work_date = ?
        WHERE u.active = 1
      `;
      const params = [date];
      if (bId) {
        query += ' AND (u.branch_id = ? OR u.branch_id IS NULL)';
        params.push(Number(bId));
      }
      query += " ORDER BY CASE u.role WHEN 'admin' THEN 1 WHEN 'manager' THEN 2 ELSE 3 END, u.id ASC";

      const records = await db.prepare(query).all(...params);
      return res.json({ success: true, data: records });
    }

    if (month) {
      // ดึงประวัติทั้งเดือน
      let query = `
        SELECT a.*, u.name, u.role,
               COALESCE(a.skill_level, u.skill_level, 'regular') as skill_level,
               COALESCE(a.daily_wage, u.wage_rate, 0) as daily_wage,
               u.wage_rate as default_wage_rate,
               u.wage_type
        FROM employee_attendance a
        JOIN users u ON a.user_id = u.id
        WHERE a.work_date LIKE ?
      `;
      const params = [`${month}%`];
      if (bId) {
        query += ' AND (a.branch_id = ? OR u.branch_id = ? OR u.branch_id IS NULL)';
        params.push(Number(bId), Number(bId));
      }
      query += ' ORDER BY a.work_date DESC, u.id ASC';

      const records = await db.prepare(query).all(...params);
      return res.json({ success: true, data: records });
    }

    res.status(400).json({ success: false, error: 'กรุณาระบุ date (YYYY-MM-DD) หรือ month (YYYY-MM)' });
  } catch (err) {
    console.error('❌ Get attendance error:', err.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลการลงเวลา' });
  }
});

// ─── 4. POST /api/employees/attendance — บันทึกการลงเวลา/การลาประจำวัน (Admin Only) ───
router.post('/attendance', requireAdmin, async (req, res) => {
  try {
    const { work_date, records, branch_id } = req.body;
    const db = getDb();

    if (!work_date || !records || !Array.isArray(records)) {
      return res.status(400).json({ success: false, error: 'ข้อมูลไม่ถูกต้อง กรุณาระบุ work_date และ records' });
    }

    const bId = branch_id || req.user.branch_id;

    for (const r of records) {
      if (!r.user_id) continue;

      const user = await db.prepare('SELECT wage_rate, skill_level FROM users WHERE id = ?').get(r.user_id);
      const dailyWage = r.daily_wage !== undefined && r.daily_wage !== null && r.daily_wage !== ''
        ? Number(r.daily_wage)
        : (user ? Number(user.wage_rate || 0) : 0);
      const skillLevel = r.skill_level || (user ? user.skill_level : 'regular');

      const existing = await db.prepare(
        'SELECT id FROM employee_attendance WHERE user_id = ? AND work_date = ?'
      ).get(r.user_id, work_date);

      if (existing) {
        await db.prepare(`
          UPDATE employee_attendance SET
            status = ?,
            daily_wage = ?,
            skill_level = ?,
            leave_reason = ?,
            had_lunch_benefit = ?,
            note = ?
          WHERE id = ?
        `).run(
          r.status || 'present',
          dailyWage,
          skillLevel,
          r.leave_reason || null,
          r.status === 'present' ? (r.had_lunch_benefit !== undefined ? (r.had_lunch_benefit ? 1 : 0) : 1) : 0,
          r.note || null,
          existing.id
        );
      } else {
        await db.prepare(`
          INSERT INTO employee_attendance (branch_id, user_id, work_date, status, daily_wage, skill_level, leave_reason, had_lunch_benefit, note)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          bId,
          r.user_id,
          work_date,
          r.status || 'present',
          dailyWage,
          skillLevel,
          r.leave_reason || null,
          r.status === 'present' ? (r.had_lunch_benefit !== undefined ? (r.had_lunch_benefit ? 1 : 0) : 1) : 0,
          r.note || null
        );
      }
    }

    res.json({ success: true, message: 'บันทึกการลงเวลาเรียบร้อยแล้ว' });
  } catch (err) {
    console.error('❌ Save attendance error:', err.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการบันทึกการลงเวลา' });
  }
});

// ─── 5. GET /api/employees/event-ots — ดึงรายการ OT อีเวนต์ (Admin Only) ───
router.get('/event-ots', requireAdmin, async (req, res) => {
  try {
    const { date, month, year, branch_id } = req.query;
    const db = getDb();

    let query = `
      SELECT o.*, u.name as creator_name
      FROM employee_event_ots o
      LEFT JOIN users u ON o.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (branch_id) {
      query += ' AND o.branch_id = ?';
      params.push(Number(branch_id));
    }

    if (date) {
      query += ' AND o.event_date = ?';
      params.push(date);
    } else if (month) {
      query += ' AND o.event_date LIKE ?';
      params.push(`${month}%`);
    } else if (year) {
      query += ' AND o.event_date LIKE ?';
      params.push(`${year}%`);
    }

    query += ' ORDER BY o.event_date DESC, o.id DESC';

    const events = await db.prepare(query).all(...params);

    // Attach participants to each event
    for (const ev of events) {
      const parts = await db.prepare(`
        SELECT p.*, u.name, u.role, u.skill_level
        FROM employee_event_ot_participants p
        JOIN users u ON p.user_id = u.id
        WHERE p.event_ot_id = ?
      `).all(ev.id);
      ev.participants = parts;
    }

    res.json({ success: true, data: events });
  } catch (err) {
    console.error('❌ Get event-ots error:', err.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล OT อีเวนต์' });
  }
});

// ─── 6. POST /api/employees/event-ots — สร้าง OT อีเวนต์ใหม่ (Admin Only) ───
router.post('/event-ots', requireAdmin, async (req, res) => {
  try {
    const { event_name, event_date, amount_per_person, user_ids, note, branch_id } = req.body;
    const db = getDb();

    if (!event_name || !event_date || !amount_per_person || !user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุชื่องานพิเศษ วันที่ จำนวนเงินต่อคน และเลือกพนักงานอย่างน้อย 1 คน' });
    }

    const bId = branch_id || req.user.branch_id || 1;
    const amountNum = Number(amount_per_person);
    const createdBy = (req.user && req.user.id > 0) ? req.user.id : (Number(user_ids[0]) || 1);

    const result = await db.prepare(`
      INSERT INTO employee_event_ots (branch_id, event_name, event_date, amount_per_person, created_by, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(bId, event_name, event_date, amountNum, createdBy, note || null);

    const eventId = result.lastInsertRowid;

    for (const uId of user_ids) {
      await db.prepare(`
        INSERT INTO employee_event_ot_participants (event_ot_id, user_id, amount)
        VALUES (?, ?, ?)
      `).run(eventId, Number(uId), amountNum);
    }

    // Activity log
    try {
      await db.prepare(`
        INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
        VALUES (?, ?, 'create_event_ot', ?, datetime('now', '+7 hours'))
      `).run(bId, createdBy, `บันทึก OT พิเศษ '${event_name}' วันที่ ${event_date} คนละ ${amountNum} บาท (${user_ids.length} คน)`);
    } catch (logErr) {
      console.warn('⚠️ Log activity failed:', logErr.message);
    }

    res.status(201).json({ success: true, message: 'บันทึก OT อีเวนต์เรียบร้อยแล้ว' });
  } catch (err) {
    console.error('❌ Create event-ot error:', err.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการสร้าง OT อีเวนต์: ' + err.message });
  }
});

// ─── 7. DELETE /api/employees/event-ots/:id — ลบ OT อีเวนต์ (Admin) ───
router.delete('/event-ots/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const ev = await db.prepare('SELECT * FROM employee_event_ots WHERE id = ?').get(Number(id));
    if (!ev) {
      return res.status(404).json({ success: false, error: 'ไม่พบรายการ OT อีเวนต์' });
    }

    await db.prepare('DELETE FROM employee_event_ot_participants WHERE event_ot_id = ?').run(Number(id));
    await db.prepare('DELETE FROM employee_event_ots WHERE id = ?').run(Number(id));

    res.json({ success: true, message: 'ลบรายการเรียบร้อยแล้ว' });
  } catch (err) {
    console.error('❌ Delete event-ot error:', err.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการลบรายการ' });
  }
});

// ─── 8. GET /api/employees/advances — ดึงรายการเบิกเงินล่วงหน้า (Admin Only) ───
router.get('/advances', requireAdmin, async (req, res) => {
  try {
    const { date, month, year, branch_id } = req.query;
    const db = getDb();

    let query = `
      SELECT a.*, u.name, u.role, u.skill_level, c.name as creator_name
      FROM employee_advances a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN users c ON a.created_by = c.id
      WHERE 1=1
    `;
    const params = [];

    if (branch_id) {
      query += ' AND a.branch_id = ?';
      params.push(Number(branch_id));
    }

    if (date) {
      query += ' AND a.advance_date = ?';
      params.push(date);
    } else if (month) {
      query += ' AND a.advance_date LIKE ?';
      params.push(`${month}%`);
    } else if (year) {
      query += ' AND a.advance_date LIKE ?';
      params.push(`${year}%`);
    }

    query += ' ORDER BY a.advance_date DESC, a.id DESC';

    const advances = await db.prepare(query).all(...params);

    res.json({ success: true, data: advances });
  } catch (err) {
    console.error('❌ Get advances error:', err.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลการเบิกเงิน' });
  }
});

// ─── 9. POST /api/employees/advances — บันทึกการเบิกเงินล่วงหน้า & ตัดเข้ารายจ่ายสาขาทันที (Admin Only) ───
router.post('/advances', requireAdmin, async (req, res) => {
  try {
    const { user_id, amount, advance_date, payment_method, note, branch_id } = req.body;
    const db = getDb();

    if (!user_id || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุพนักงานและจำนวนเงินที่ถูกต้อง' });
    }

    const advDate = advance_date || getThailandDate();
    const bId = branch_id || req.user.branch_id;
    const payMethod = payment_method || 'cash';
    const advanceAmount = Number(amount);

    const user = await db.prepare('SELECT name FROM users WHERE id = ?').get(Number(user_id));
    const userName = user ? user.name : `พนักงาน #${user_id}`;

    const staffId = (req.user && req.user.id > 0) ? req.user.id : (Number(user_id) || 1);
    const createdBy = (req.user && req.user.id > 0) ? req.user.id : (Number(user_id) || 1);

    // 1. บันทึกเป็นรายจ่าย (Expense) ลงบัญชีสาขาและลิ้นชักประจำวันทันที
    const expenseNote = `เบิกเงินล่วงหน้า: ${userName} (${payMethod === 'cash' ? 'เงินสด' : 'เงินโอน'})${note ? ` [${note}]` : ''}`;
    const expRes = await db.prepare(`
      INSERT INTO expenses (
        branch_id, staff_id, amount, category, note, expense_date, payment_method, session_id, created_at
      ) VALUES (?, ?, ?, 'salary', ?, ?, ?, (SELECT id FROM cash_drawer_sessions WHERE branch_id = ? AND session_date = ? LIMIT 1), datetime('now', '+7 hours'))
    `).run(
      bId,
      staffId,
      advanceAmount,
      expenseNote,
      advDate,
      payMethod,
      bId,
      advDate
    );

    const expenseId = expRes.lastInsertRowid;

    // 2. บันทึกข้อมูลการเบิกเงินลงตาราง employee_advances
    const result = await db.prepare(`
      INSERT INTO employee_advances (branch_id, user_id, amount, advance_date, payment_method, status, note, expense_id, created_by)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `).run(bId, Number(user_id), advanceAmount, advDate, payMethod, note || null, expenseId, createdBy);

    // 3. Log Activity
    try {
      await db.prepare(`
        INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
        VALUES (?, ?, 'employee_advance', ?, datetime('now', '+7 hours'))
      `).run(
        bId,
        createdBy,
        `บันทึกการเบิกเงินล่วงหน้า: ${userName} จำนวน ${advanceAmount} บาท (${payMethod === 'cash' ? 'เงินสด' : 'เงินโอน'})`
      );
    } catch (logErr) {
      console.warn('⚠️ Log activity failed:', logErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'บันทึกการเบิกเงินและตัดเข้ารายจ่ายสาขาเรียบร้อยแล้ว',
      data: {
        id: result.lastInsertRowid,
        expense_id: expenseId
      }
    });
  } catch (err) {
    console.error('❌ Create advance error:', err.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการบันทึกการเบิกเงิน: ' + err.message });
  }
});

// ─── 10. DELETE /api/employees/advances/:id — ยกเลิกรายการเบิกเงิน (Admin) ───
router.delete('/advances/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const adv = await db.prepare('SELECT * FROM employee_advances WHERE id = ?').get(Number(id));
    if (!adv) {
      return res.status(404).json({ success: false, error: 'ไม่พบรายการเบิกเงิน' });
    }

    if (adv.status === 'deducted') {
      return res.status(400).json({ success: false, error: 'ไม่สามารถลบได้เนื่องจากถูกหักในรอบเงินเดือนแล้ว' });
    }

    // ลบรายจ่ายที่ผูกกับรายการเบิกนี้ออกจากตาราง expenses
    if (adv.expense_id) {
      await db.prepare('DELETE FROM expenses WHERE id = ?').run(Number(adv.expense_id));
    }

    await db.prepare('DELETE FROM employee_advances WHERE id = ?').run(Number(id));

    res.json({ success: true, message: 'ยกเลิกรายการเบิกเงินและลบออกจากรายจ่ายเรียบร้อยแล้ว' });
  } catch (err) {
    console.error('❌ Delete advance error:', err.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการลบรายการเบิกเงิน' });
  }
});

// ─── 11. GET /api/employees/payroll/calculate — คำนวณสรุปเงินเดือนประจำงวด (Admin) ───
router.get('/payroll/calculate', requireAdmin, async (req, res) => {
  try {
    const { month, branch_id } = req.query;
    const db = getDb();

    if (!month) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุ month (YYYY-MM)' });
    }

    let usersQuery = 'SELECT * FROM users WHERE active = 1';
    const params = [];
    if (branch_id) {
      usersQuery += ' AND (branch_id = ? OR branch_id IS NULL)';
      params.push(Number(branch_id));
    }
    usersQuery += ' ORDER BY id ASC';

    const users = await db.prepare(usersQuery).all(...params);
    const calculations = [];

    for (const u of users) {
      // 1. นับจำนวนวันที่มาทำงานจริงที่ "ยังไม่เคยจ่ายเงิน" (is_paid = 0) ในงวดเดือนนี้
      const unpaidAttRow = await db.prepare(`
        SELECT 
          COUNT(CASE WHEN status = 'present' THEN 1 END) as unpaid_days_present,
          COUNT(CASE WHEN status IN ('leave_paid', 'leave_unpaid', 'absent') THEN 1 END) as unpaid_days_leave,
          COUNT(CASE WHEN had_lunch_benefit = 1 AND status = 'present' THEN 1 END) as unpaid_lunch_count,
          COALESCE(SUM(CASE WHEN status = 'present' THEN COALESCE(daily_wage, ?) END), 0) as unpaid_daily_wages
        FROM employee_attendance
        WHERE user_id = ? AND work_date LIKE ? AND (is_paid = 0 OR is_paid IS NULL)
      `).get(u.wage_rate || 0, u.id, `${month}%`);

      const unpaidDaysWorked = unpaidAttRow ? (unpaidAttRow.unpaid_days_present || 0) : 0;
      const unpaidDaysLeave = unpaidAttRow ? (unpaidAttRow.unpaid_days_leave || 0) : 0;
      const unpaidLunchCount = unpaidAttRow ? (unpaidAttRow.unpaid_lunch_count || 0) : 0;
      const unpaidBaseSalary = Number(unpaidAttRow ? (unpaidAttRow.unpaid_daily_wages || 0) : 0);

      // 2. สรุปวันทำงานทั้งหมดของทั้งเดือน (ทั้งที่จ่ายแล้ว + ยังไม่จ่าย)
      const totalMonthAttRow = await db.prepare(`
        SELECT 
          COUNT(CASE WHEN status = 'present' THEN 1 END) as total_days_present,
          COUNT(CASE WHEN had_lunch_benefit = 1 AND status = 'present' THEN 1 END) as total_lunch_count
        FROM employee_attendance
        WHERE user_id = ? AND work_date LIKE ?
      `).get(u.id, `${month}%`);

      const totalDaysWorkedMonth = totalMonthAttRow ? (totalMonthAttRow.total_days_present || 0) : 0;
      const totalLunchCountMonth = totalMonthAttRow ? (totalMonthAttRow.total_lunch_count || 0) : 0;

      // 3. รวม OT ตามอีเวนต์ที่ยังไม่จ่ายในงวดเดือนนี้
      const otRow = await db.prepare(`
        SELECT COALESCE(SUM(p.amount), 0) as total_ot
        FROM employee_event_ot_participants p
        JOIN employee_event_ots o ON p.event_ot_id = o.id
        WHERE p.user_id = ? AND o.event_date LIKE ? AND (p.is_paid = 0 OR p.is_paid IS NULL)
      `).get(u.id, `${month}%`);
      const eventOtAmount = otRow ? Number(otRow.total_ot || 0) : 0;

      // 4. รวมยอดเบิกล่วงหน้าที่รอดำเนินการหัก (pending) ในงวดเดือนนี้
      const advRow = await db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total_advance
        FROM employee_advances
        WHERE user_id = ? AND advance_date LIKE ? AND status = 'pending'
      `).get(u.id, `${month}%`);
      const advanceAmount = advRow ? Number(advRow.total_advance || 0) : 0;

      // 5. ประวัติการจ่ายเงินทั้งหมดในเดือนนี้ (History of Payouts in this month)
      const historyPayouts = await db.prepare(`
        SELECT p.*, e.id as expense_id
        FROM employee_payrolls p
        LEFT JOIN expenses e ON p.expense_id = e.id
        WHERE p.user_id = ? AND p.period_month = ?
        ORDER BY p.payment_date DESC, p.id DESC
      `).all(u.id, month);

      const totalPaidAmountMonth = historyPayouts.reduce((sum, item) => sum + Number(item.net_paid_amount || 0), 0);
      const totalPaidDaysMonth = historyPayouts.reduce((sum, item) => sum + Number(item.days_worked || 0), 0);
      const totalHoldbackDeductedMonth = historyPayouts.reduce((sum, item) => sum + Number(item.holdback_deducted_amount || 0), 0);

      // 6. ข้อมูลสถานะเงินประกัน (Guarantee Deposit)
      const guaranteeRecord = await db.prepare(`
        SELECT * FROM employee_guarantees
        WHERE user_id = ?
        ORDER BY id DESC LIMIT 1
      `).get(u.id);

      // ตรวจสอบว่าเงินประกันรายการปัจจุบัน (ถ้า status = 'held') เคยถูกหักในสลิปจ่ายเงินไปแล้วหรือยัง
      let isGuaranteeSettled = false;
      if (guaranteeRecord && guaranteeRecord.status === 'held') {
        const matchingSlip = await db.prepare(`
          SELECT id FROM employee_payrolls
          WHERE user_id = ? AND holdback_deducted_amount > 0 AND created_at >= ?
          LIMIT 1
        `).get(u.id, guaranteeRecord.created_at);
        if (matchingSlip) {
          isGuaranteeSettled = true;
        }
      }

      // 7. คำนวณยอดสุทธิที่รอจ่ายรอบนี้ (Net Payable this round)
      let baseSalaryRound = 0;
      if (u.wage_type === 'monthly') {
        baseSalaryRound = historyPayouts.length === 0 ? (u.wage_rate || 0) : 0;
      } else {
        baseSalaryRound = unpaidBaseSalary;
      }

      // ถ้ามีการวางเงินประกันแล้ว (status = 'held') และยังไม่เคยถูกหักในสลิปเงินเดือน ให้หักลบ 1,000 บาท
      let guaranteeDeductionRound = 0;
      if (guaranteeRecord && guaranteeRecord.status === 'held' && !isGuaranteeSettled) {
        guaranteeDeductionRound = Number(guaranteeRecord.amount || 1000);
      }

      const netPayableRound = Math.max(0, baseSalaryRound + eventOtAmount - advanceAmount - guaranteeDeductionRound);

      calculations.push({
        user_id: u.id,
        name: u.name,
        role: u.role,
        skill_level: u.skill_level || 'regular',
        wage_type: u.wage_type || 'daily',
        wage_rate: u.wage_rate || 0,
        benefits: u.benefits || 'ข้าวเที่ยงฟรี',
        
        // ข้อมูลรอบที่รอจ่ายปัจจุบัน (Unpaid Round)
        unpaid_days_worked: unpaidDaysWorked,
        unpaid_days_leave: unpaidDaysLeave,
        unpaid_lunch_count: unpaidLunchCount,
        unpaid_base_salary: baseSalaryRound,
        event_ot_amount: eventOtAmount,
        advance_deducted_amount: advanceAmount,
        guarantee_deducted_amount: guaranteeDeductionRound,
        net_payable_round: netPayableRound,
        has_pending_payout: unpaidDaysWorked > 0 || eventOtAmount > 0 || advanceAmount > 0 || guaranteeDeductionRound > 0,
        is_guarantee_settled: isGuaranteeSettled,
        has_pending_guarantee_deduction: (guaranteeRecord && guaranteeRecord.status === 'held' && !isGuaranteeSettled),

        // ยอดรวมทั้งเดือน
        total_days_worked_month: totalDaysWorkedMonth,
        total_lunch_count_month: totalLunchCountMonth,
        total_paid_amount_month: totalPaidAmountMonth,
        total_paid_days_month: totalPaidDaysMonth,
        total_holdback_deducted_month: totalHoldbackDeductedMonth,
        payout_count_month: historyPayouts.length,
        history_payouts: historyPayouts,

        // สถานะเงินประกัน
        guarantee: guaranteeRecord || null
      });
    }

    res.json({
      success: true,
      data: {
        period_month: month,
        employees: calculations
      }
    });
  } catch (err) {
    console.error('❌ Calculate payroll error:', err.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการคำนวณเงินเดือน' });
  }
});

// ─── 12. POST /api/employees/payroll/pay — ยืนยันจ่ายเงินเดือน & หักเข้า Expenses สาขา (Admin) ───
router.post('/payroll/pay', requireAdmin, async (req, res) => {
  try {
    const {
      user_id,
      period_month,
      days_worked,
      daily_rate,
      base_salary_amount,
      event_ot_amount,
      advance_deducted_amount,
      holdback_deducted_amount,
      net_paid_amount,
      payment_method,
      payment_date,
      note,
      branch_id,
      pay_base_salary = true,
      pay_event_ot = true,
      deduct_advance = true,
      deduct_guarantee = false
    } = req.body;

    const db = getDb();

    if (!user_id || !period_month || net_paid_amount === undefined) {
      return res.status(400).json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' });
    }

    const payDate = payment_date || getThailandDate();
    const payMethod = payment_method || 'cash';
    const bId = branch_id || req.user.branch_id;
    const finalPaidAmount = Number(net_paid_amount);
    const holdbackAmt = Number(holdback_deducted_amount || 0);

    const user = await db.prepare('SELECT name FROM users WHERE id = ?').get(Number(user_id));
    const userName = user ? user.name : `พนักงาน #${user_id}`;

    const staffId = (req.user && req.user.id > 0) ? req.user.id : (Number(user_id) || 1);
    const paidBy = (req.user && req.user.id > 0) ? req.user.id : (Number(user_id) || 1);

    let expenseId = null;

    // 1. บันทึก Expense ลงตาราง expenses ทันทีเพื่อหักลบในบัญชีสาขา (เฉพาะถ้ายอดจ่ายจริง > 0)
    if (finalPaidAmount > 0) {
      const details = [];
      if (pay_base_salary && Number(days_worked || 0) > 0) {
        details.push(`รอบทำงาน ${days_worked} วัน, ฐาน ฿${base_salary_amount}`);
      }
      if (pay_event_ot && Number(event_ot_amount || 0) > 0) {
        details.push(`OT ฿${event_ot_amount}`);
      }
      if (deduct_advance && Number(advance_deducted_amount || 0) > 0) {
        details.push(`หักเบิก ฿${advance_deducted_amount}`);
      }
      if (deduct_guarantee && holdbackAmt > 0) {
        details.push(`หักประกัน ฿${holdbackAmt}`);
      }
      if (note) {
        details.push(note);
      }

      const detailStr = details.length > 0 ? ` (${details.join(', ')})` : '';
      const expenseNote = `จ่ายค่าแรง/เงินเดือน: ${userName}${detailStr}`;

      const expRes = await db.prepare(`
        INSERT INTO expenses (
          branch_id, staff_id, amount, category, note, expense_date, payment_method, session_id, created_at
        ) VALUES (?, ?, ?, 'salary', ?, ?, ?, (SELECT id FROM cash_drawer_sessions WHERE branch_id = ? AND session_date = ? LIMIT 1), datetime('now', '+7 hours'))
      `).run(
        bId,
        staffId,
        finalPaidAmount,
        expenseNote,
        payDate,
        payMethod,
        bId,
        payDate
      );

      expenseId = expRes.lastInsertRowid;
    }

    // 2. บันทึกสลิปการจ่ายลงตาราง employee_payrolls (สามารถจ่ายได้หลายรอบใน 1 เดือน)
    const payrollRes = await db.prepare(`
      INSERT INTO employee_payrolls (
        branch_id, user_id, period_month, days_worked, daily_rate,
        base_salary_amount, event_ot_amount,
        holdback_deducted_amount, advance_deducted_amount, net_paid_amount,
        payment_method, payment_date, expense_id, paid_by, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      bId,
      Number(user_id),
      period_month,
      pay_base_salary ? Number(days_worked || 0) : 0,
      Number(daily_rate || 0),
      pay_base_salary ? Number(base_salary_amount || 0) : 0,
      pay_event_ot ? Number(event_ot_amount || 0) : 0,
      deduct_guarantee ? holdbackAmt : 0,
      deduct_advance ? Number(advance_deducted_amount || 0) : 0,
      finalPaidAmount,
      payMethod,
      payDate,
      expenseId,
      paidBy,
      note || null
    );

    const payrollId = payrollRes.lastInsertRowid;

    // 3. ถ้าเลือกจ่ายฐานค่าแรง ให้มาร์กวันทำงานที่ค้างจ่ายในเดือนนี้ตามจำนวนวันที่จ่าย (LIMIT) ให้เป็น 'is_paid = 1'
    if (pay_base_salary && Number(days_worked || 0) > 0) {
      await db.prepare(`
        UPDATE employee_attendance SET
          is_paid = 1,
          payroll_id = ?
        WHERE id IN (
          SELECT id FROM employee_attendance
          WHERE user_id = ? AND work_date LIKE ? AND (is_paid = 0 OR is_paid IS NULL)
          ORDER BY work_date ASC, id ASC
          LIMIT ?
        )
      `).run(payrollId, Number(user_id), `${period_month}%`, Number(days_worked));
    }

    // 4. ถ้าเลือกจ่าย OT พิเศษ ให้มาร์ก OT ที่ค้างจ่ายในเดือนนี้ให้เป็น 'is_paid = 1'
    if (pay_event_ot && Number(event_ot_amount || 0) > 0) {
      await db.prepare(`
        UPDATE employee_event_ot_participants SET
          is_paid = 1,
          payroll_id = ?
        WHERE user_id = ? AND (is_paid = 0 OR is_paid IS NULL)
          AND event_ot_id IN (SELECT id FROM employee_event_ots WHERE event_date LIKE ?)
      `).run(payrollId, Number(user_id), `${period_month}%`);
    }

    // 5. ถ้าเลือกหักเงินเบิกล่วงหน้า ให้อัปเดตรายการเบิกเงินในงวดนั้นเป็น 'deducted'
    if (deduct_advance && Number(advance_deducted_amount || 0) > 0) {
      await db.prepare(`
        UPDATE employee_advances SET
          status = 'deducted',
          payroll_id = ?
        WHERE user_id = ? AND advance_date LIKE ? AND status = 'pending'
      `).run(payrollId, Number(user_id), `${period_month}%`);
    }

    // 6. ถ้าเลือกหักเงินประกันในรอบนี้ ให้บันทึกลง employee_guarantees เป็น 'held' (ถ้ายังไม่มีรายการ held อยู่)
    if (deduct_guarantee && holdbackAmt > 0) {
      const existingHeld = await db.prepare(`
        SELECT id FROM employee_guarantees WHERE user_id = ? AND status = 'held'
      `).get(Number(user_id));

      if (!existingHeld) {
        await db.prepare(`
          INSERT INTO employee_guarantees (branch_id, user_id, amount, deposit_date, deposit_payment_method, status, note, created_by)
          VALUES (?, ?, ?, ?, ?, 'held', ?, ?)
        `).run(
          bId,
          Number(user_id),
          holdbackAmt,
          payDate,
          payMethod,
          `หักเงินประกันจากค่าแรงงวด ${period_month} (สลิป #${payrollId})`,
          paidBy
        );
      }
    }

    // 6. บันทึก Activity Log
    await db.prepare(`
      INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
      VALUES (?, ?, 'pay_salary', ?, datetime('now', '+7 hours'))
    `).run(
      bId,
      req.user.id,
      `จ่ายค่าแรง ${userName} งวด ${period_month} จำนวน ${finalPaidAmount} บาท (${payMethod === 'cash' ? 'เงินสด' : 'เงินโอน'})${holdbackAmt > 0 ? ` (หักเงินประกัน ฿${holdbackAmt})` : ''}`
    );

    res.status(201).json({
      success: true,
      message: 'บันทึกการจ่ายเงินเดือนและตัดเข้ารายจ่ายสาขาสำเร็จ',
      data: {
        payroll_id: payrollId,
        expense_id: expenseId,
        net_paid_amount: finalPaidAmount
      }
    });
  } catch (err) {
    console.error('❌ Pay salary error:', err.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการบันทึกการจ่ายเงินเดือน' });
  }
});

// ─── 13. GET /api/employees/guarantees — ดึงรายการเงินประกัน (Admin/Manager) ───
router.get('/guarantees', requireManagerOrAdmin, async (req, res) => {
  try {
    const { branch_id } = req.query;
    const db = getDb();

    let query = `
      SELECT g.*, u.name as user_name, u.role, u.skill_level, c.name as creator_name
      FROM employee_guarantees g
      JOIN users u ON g.user_id = u.id
      LEFT JOIN users c ON g.created_by = c.id
      WHERE 1=1
    `;
    const params = [];
    if (branch_id) {
      query += ' AND (g.branch_id = ? OR u.branch_id = ?)';
      params.push(Number(branch_id), Number(branch_id));
    }
    query += ' ORDER BY g.id DESC';

    const guarantees = await db.prepare(query).all(...params);
    res.json({ success: true, data: guarantees });
  } catch (err) {
    console.error('❌ Get guarantees error:', err.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลเงินประกัน' });
  }
});

// ─── 14. POST /api/employees/guarantees/deposit — บันทึกรับเงินประกัน (Admin/Manager) ───
router.post('/guarantees/deposit', requireManagerOrAdmin, async (req, res) => {
  try {
    const { user_id, amount, deposit_date, deposit_payment_method, note, branch_id } = req.body;
    const db = getDb();

    if (!user_id) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุพนักงาน' });
    }

    const bId = branch_id || req.user.branch_id;
    const amt = Number(amount) || 1000;
    const dDate = deposit_date || getThailandDate();
    const payMethod = deposit_payment_method || 'cash';

    const user = await db.prepare('SELECT name FROM users WHERE id = ?').get(Number(user_id));

    const createdBy = (req.user && req.user.id > 0) ? req.user.id : (Number(user_id) || 1);

    const result = await db.prepare(`
      INSERT INTO employee_guarantees (branch_id, user_id, amount, deposit_date, deposit_payment_method, status, note, created_by)
      VALUES (?, ?, ?, ?, ?, 'held', ?, ?)
    `).run(bId, Number(user_id), amt, dDate, payMethod, note || null, createdBy);

    // บันทึก Activity Log
    try {
      await db.prepare(`
        INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
        VALUES (?, ?, 'employee_guarantee_deposit', ?, datetime('now', '+7 hours'))
      `).run(
        bId,
        createdBy,
        `บันทึกรับเงินประกัน: ${user ? user.name : user_id} จำนวน ${amt} บาท (${payMethod === 'cash' ? 'เงินสด' : 'เงินโอน'})`
      );
    } catch (logErr) {
      console.warn('⚠️ Log activity failed:', logErr.message);
    }

    res.status(201).json({ success: true, message: 'บันทึกรับเงินประกันเรียบร้อยแล้ว', data: { id: result.lastInsertRowid } });
  } catch (err) {
    console.error('❌ Guarantee deposit error:', err.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการบันทึกรับเงินประกัน: ' + err.message });
  }
});

// ─── 15. POST /api/employees/guarantees/refund — บันทึกคืนเงินประกัน & หักออก Expenses สาขา (Admin) ───
router.post('/guarantees/refund', requireAdmin, async (req, res) => {
  try {
    const { guarantee_id, refund_date, refund_payment_method, note, branch_id } = req.body;
    const db = getDb();

    if (!guarantee_id) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุรายการเงินประกัน' });
    }

    const guar = await db.prepare('SELECT * FROM employee_guarantees WHERE id = ?').get(Number(guarantee_id));
    if (!guar) {
      return res.status(404).json({ success: false, error: 'ไม่พบรายการเงินประกัน' });
    }
    if (guar.status === 'refunded') {
      return res.status(400).json({ success: false, error: 'รายการนี้คืนเงินประกันไปแล้ว' });
    }

    const bId = branch_id || guar.branch_id || req.user.branch_id || 1;
    const rDate = refund_date || getThailandDate();
    const payMethod = refund_payment_method || 'cash';
    const user = await db.prepare('SELECT name FROM users WHERE id = ?').get(guar.user_id);
    const userName = user ? user.name : `พนักงาน #${guar.user_id}`;
    const staffId = (req.user && req.user.id > 0) ? req.user.id : (guar.user_id || 1);

    // 1. บันทึก Expense ลงตาราง expenses ทันทีเพื่อตัดเงินออกจากบัญชีสาขา
    const expenseNote = `คืนเงินประกันพนักงาน: ${userName}${note ? ` [${note}]` : ''}`;
    const expRes = await db.prepare(`
      INSERT INTO expenses (
        branch_id, staff_id, amount, category, note, expense_date, payment_method, session_id, created_at
      ) VALUES (?, ?, ?, 'salary', ?, ?, ?, (SELECT id FROM cash_drawer_sessions WHERE branch_id = ? AND session_date = ? LIMIT 1), datetime('now', '+7 hours'))
    `).run(
      bId,
      staffId,
      Number(guar.amount),
      expenseNote,
      rDate,
      payMethod,
      bId,
      rDate
    );

    // 2. อัปเดตสถานะในตาราง employee_guarantees
    await db.prepare(`
      UPDATE employee_guarantees SET
        status = 'refunded',
        refund_date = ?,
        refund_payment_method = ?,
        refund_expense_id = ?,
        note = COALESCE(?, note),
        updated_at = datetime('now', '+7 hours')
      WHERE id = ?
    `).run(rDate, payMethod, expRes.lastInsertRowid, note || null, guar.id);

    // 3. บันทึก Activity Log
    try {
      await db.prepare(`
        INSERT INTO activity_logs (branch_id, user_id, action, details, created_at)
        VALUES (?, ?, 'employee_guarantee_refund', ?, datetime('now', '+7 hours'))
      `).run(
        bId,
        staffId,
        `คืนเงินประกันให้ ${userName} จำนวน ${guar.amount} บาท (${payMethod === 'cash' ? 'เงินสด' : 'เงินโอน'}) ตัดเข้ารายจ่ายสาขาเรียบร้อย`
      );
    } catch (logErr) {
      console.warn('⚠️ Log activity failed:', logErr.message);
    }

    res.json({ success: true, message: 'บันทึกการคืนเงินประกันเรียบร้อยแล้ว' });
  } catch (err) {
    console.error('❌ Guarantee refund error:', err.message);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการคืนเงินประกัน: ' + err.message });
  }
});

module.exports = router;
