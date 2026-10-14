/**
 * 🍗 Seed Central Kitchen Mock Data & Test Requisition for Branch "test" (ID 3)
 * 
 * Target: ONLY Central Kitchen and Branch "test" (branch_id = 3).
 * Leaves Branch 1 and Branch 2 untouched.
 */
require('dotenv').config();
const { getDb } = require('../config/database');

function getThaiNow(offsetMinutes = 0) {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000 - offsetMinutes * 60 * 1000);
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

function getThaiToday() {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split('T')[0];
}

async function run() {
  console.log('🚀 เริ่มต้นการสร้างข้อมูลจำลองครัวกลางและทดสอบการเบิกสินค้าสำหรับสาขา test (ID 3)...');
  const db = getDb();

  // 1. ตรวจสอบสาขา test
  const branchTest = await db.prepare('SELECT * FROM branches WHERE id = 3').get();
  if (!branchTest) {
    throw new Error('ไม่พบสาขา test (id: 3) ในระบบ');
  }
  console.log(`✅ พบสาขาเป้าหมาย: ${branchTest.name} (id: ${branchTest.id})`);

  // 2. เคลียร์ข้อมูลเก่าของครัวกลาง (เฉพาะตารางครัวกลางเท่านั้น) เพื่อให้ข้อมูลสะอาด
  console.log('🧹 ล้างข้อมูลเดิมในตารางครัวกลาง...');
  await db.exec('DELETE FROM central_kitchen_transfer_items');
  await db.exec('DELETE FROM central_kitchen_transfers');
  await db.exec('DELETE FROM central_kitchen_restock_logs');
  await db.exec('DELETE FROM central_kitchen_waste_logs');
  await db.exec('DELETE FROM central_kitchen_finances');
  await db.exec('DELETE FROM central_kitchen_items');

  // ลบ expenses ที่เกิดจากการเบิกของครัวกลางของสาขา test เดิม (ถ้ามี)
  await db.exec("DELETE FROM expenses WHERE branch_id = 3 AND note LIKE '%เบิกของจากครัวกลาง%'");

  // 3. เพิ่มรายการสินค้าในครัวกลาง (10 รายการ ครอบคลุม วัตถุดิบ, บรรจุภัณฑ์, อุปกรณ์)
  console.log('📦 เพิ่มรายการสินค้าและสต็อกตั้งต้นในคลังครัวกลาง...');
  const items = [
    {
      name: 'แป้งทอดไก่สูตรลับช้างแดง (1 กก.)',
      category: 'raw_material',
      unit: 'ถุง',
      cost_price: 120,
      quantity: 150,
      min_stock_alert: 25
    },
    {
      name: 'ผงหมักไก่ต้นตำรับช้างแดง (500 กรัม)',
      category: 'raw_material',
      unit: 'ถุง',
      cost_price: 250,
      quantity: 80,
      min_stock_alert: 15
    },
    {
      name: 'ซอสพริกเข้มข้นสูตรช้างแดง (5 ลิตร)',
      category: 'raw_material',
      unit: 'แกลลอน',
      cost_price: 180,
      quantity: 40,
      min_stock_alert: 10
    },
    {
      name: 'น้ำมันปาล์มทอดกรอบ (13.75 ลิตร)',
      category: 'raw_material',
      unit: 'ปี๊บ',
      cost_price: 520,
      quantity: 30,
      min_stock_alert: 8
    },
    {
      name: 'กล่องกระดาษใส่ไก่ทอด (ไซส์ L)',
      category: 'packaging',
      unit: 'ใบ',
      cost_price: 3.5,
      quantity: 2000,
      min_stock_alert: 300
    },
    {
      name: 'กล่องกระดาษใส่ไก่ทอด (ไซส์ M)',
      category: 'packaging',
      unit: 'ใบ',
      cost_price: 2.5,
      quantity: 3000,
      min_stock_alert: 400
    },
    {
      name: 'ถุงหิ้วพิมพ์ลายช้างแดง (แพ็ค 100 ใบ)',
      category: 'packaging',
      unit: 'แพ็ค',
      cost_price: 45,
      quantity: 120,
      min_stock_alert: 20
    },
    {
      name: 'กระดาษรองซับน้ำมันฟู้ดเกรด (แพ็ค 500 แผ่น)',
      category: 'packaging',
      unit: 'แพ็ค',
      cost_price: 65,
      quantity: 80,
      min_stock_alert: 15
    },
    {
      name: 'ถุงมือพลาสติกใสสัมผัสอาหาร (กล่อง 100 ชิ้น)',
      category: 'equipment',
      unit: 'กล่อง',
      cost_price: 35,
      quantity: 50,
      min_stock_alert: 10
    },
    {
      name: 'ที่คีบสแตนเลสทนความร้อนอย่างหนา',
      category: 'equipment',
      unit: 'อัน',
      cost_price: 85,
      quantity: 25,
      min_stock_alert: 5
    }
  ];

  const itemMap = {};
  for (const it of items) {
    const now = getThaiNow(120);
    const res = await db.prepare(`
      INSERT INTO central_kitchen_items (name, category, unit, cost_price, quantity, min_stock_alert, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(it.name, it.category, it.unit, it.cost_price, it.quantity, it.min_stock_alert, now, now);

    const insertedId = res.lastInsertRowid;
    itemMap[it.name] = { id: insertedId, ...it };

    // บันทึก log เติมสต็อกเริ่มต้น
    await db.prepare(`
      INSERT INTO central_kitchen_restock_logs (item_id, quantity_added, unit_cost, total_amount, supplier_note, created_by_name, created_at)
      VALUES (?, ?, ?, ?, 'สต็อกเริ่มต้นเปิดคลังสินค้าส่วนกลาง', 'ผู้จัดการครัวกลาง', ?)
    `).run(insertedId, it.quantity, it.cost_price, it.quantity * it.cost_price, now);
  }
  console.log(`✅ เพิ่มสินค้าในครัวกลางครบ 10 รายการพร้อมประวัติการเติมสต็อก`);

  // 4. บันทึกบัญชีการเงินเริ่มต้นของครัวกลาง (ทุนเริ่มต้น + ค่าจัดซื้อของเข้าคลัง)
  console.log('💰 บันทึกบัญชีการเงินทุนหมุนเวียนครัวกลาง...');
  await db.prepare(`
    INSERT INTO central_kitchen_finances (type, amount, payment_method, note, created_by_name, created_at)
    VALUES ('capital_in', 100000, 'transfer', 'เงินทุนหมุนเวียนเริ่มต้นคลังสินค้าครัวกลาง', 'เจ้าของร้าน (Owner)', ?)
  `).run(getThaiNow(180));

  await db.prepare(`
    INSERT INTO central_kitchen_finances (type, amount, payment_method, note, created_by_name, created_at)
    VALUES ('purchase_out', 42800, 'transfer', 'จัดซื้อวัตถุดิบและบรรจุภัณฑ์ล็อตแรกเข้าคลังสินค้า', 'ผู้จัดการครัวกลาง', ?)
  `).run(getThaiNow(120));

  // 5. บันทึกของเสียในคลัง 1 รายการ (แป้ง 1 ถุง ถุงแตกชำรุด)
  console.log('🗑️ บันทึกของเสียในคลัง 1 รายการเพื่อทดสอบรายงานของเสีย...');
  const flour = itemMap['แป้งทอดไก่สูตรลับช้างแดง (1 กก.)'];
  await db.prepare(`
    INSERT INTO central_kitchen_waste_logs (item_id, quantity, unit_cost, total_cost, reason, created_by_name, created_at)
    VALUES (?, 1, ?, ?, 'ถุงแป้งรั่วชำรุดระหว่างการขนถ่ายขึ้นชั้นวาง', 'ผู้จัดการครัวกลาง', ?)
  `).run(flour.id, flour.cost_price, flour.cost_price, getThaiNow(90));
  await db.prepare('UPDATE central_kitchen_items SET quantity = quantity - 1 WHERE id = ?').run(flour.id);

  // 6. กำหนดหุ้นส่วนสาขา test (ID 3): เจ้าของร้าน 60%, หุ้นส่วนสาขา 40%
  console.log('🤝 กำหนดสัดส่วนหุ้นส่วนสาขา test (60 / 40)...');
  await db.prepare('DELETE FROM branch_partners WHERE branch_id = 3').run();
  await db.prepare(`
    INSERT INTO branch_partners (branch_id, partner_name, share_percentage, is_owner, notes, created_at)
    VALUES (3, 'เจ้าของร้าน (Owner)', 60, 1, 'หุ้นส่วนใหญ่ 60%', ?)
  `).run(getThaiNow(200));
  await db.prepare(`
    INSERT INTO branch_partners (branch_id, partner_name, share_percentage, is_owner, notes, created_at)
    VALUES (3, 'หุ้นส่วนสาขา test (คุณธัน)', 40, 0, 'หุ้นส่วนผู้ดำเนินงานสาขา 40%', ?)
  `).run(getThaiNow(200));

  // 7. สร้างใบเบิก 3 ใบสำหรับสาขา test (3 สถานะ: received, dispatched, pending)
  console.log('📋 สร้างใบเบิก 3 รายการสำหรับสาขา test เพื่อทดสอบฟังก์ชันทุกสถานะ...');

  // --- ใบเบิกที่ 1: สถานะ 'received' (เบิกสำเร็จแล้ว + รับของแล้ว + บันทึกค่าใช้จ่ายเข้าสาขา test แล้ว) ---
  const order1Items = [
    { item: itemMap['แป้งทอดไก่สูตรลับช้างแดง (1 กก.)'], qty: 10 }, // 1,200
    { item: itemMap['ผงหมักไก่ต้นตำรับช้างแดง (500 กรัม)'], qty: 4 }, // 1,000
    { item: itemMap['กล่องกระดาษใส่ไก่ทอด (ไซส์ L)'], qty: 300 }, // 1,050
    { item: itemMap['ถุงหิ้วพิมพ์ลายช้างแดง (แพ็ค 100 ใบ)'], qty: 5 } // 225
  ];
  const order1Total = order1Items.reduce((sum, i) => sum + i.qty * i.item.cost_price, 0); // 3,475

  const t1Res = await db.prepare(`
    INSERT INTO central_kitchen_transfers (transfer_no, branch_id, requested_by_user_id, requested_by_name, status, total_cost, notes, dispatched_by_name, created_at, dispatched_at, received_at)
    VALUES ('REQ-20261014-1001', 3, 8, 'ธัน', 'received', ?, 'เบิกวัตถุดิบและกล่องบรรจุภัณฑ์ประจำสัปดาห์', 'ผู้จัดการครัวกลาง', ?, ?, ?)
  `).run(order1Total, getThaiNow(80), getThaiNow(60), getThaiNow(30));
  const t1Id = t1Res.lastInsertRowid;

  for (const it of order1Items) {
    await db.prepare(`
      INSERT INTO central_kitchen_transfer_items (transfer_id, item_id, item_name, unit, cost_price, quantity)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(t1Id, it.item.id, it.item.name, it.item.unit, it.item.cost_price, it.qty);
    // ตัดสต็อกครัวกลาง
    await db.prepare('UPDATE central_kitchen_items SET quantity = quantity - ? WHERE id = ?').run(it.qty, it.item.id);
  }

  // สร้างบันทึกค่าใช้จ่าย (Auto Expense) ในตาราง expenses ของสาขา test
  const expRes = await db.prepare(`
    INSERT INTO expenses (branch_id, staff_id, amount, category, note, expense_date, payment_method, status, created_at)
    VALUES (3, 8, ?, 'raw_materials', 'เบิกของจากครัวกลาง ใบเบิก #REQ-20261014-1001 (เบิกวัตถุดิบและกล่องบรรจุภัณฑ์ประจำสัปดาห์)', ?, 'transfer', 'completed', ?)
  `).run(order1Total, getThaiToday(), getThaiNow(30));
  await db.prepare('UPDATE central_kitchen_transfers SET expense_id = ? WHERE id = ?').run(expRes.lastInsertRowid, t1Id);
  console.log(`  ✅ ใบเบิก 1 (#REQ-20261014-1001): สถานะ "ได้รับของแล้ว (received)" ยอด ${order1Total} บาท บันทึกค่าใช้จ่ายเข้าสาขา test เรียบร้อย`);

  // --- ใบเบิกที่ 2: สถานะ 'dispatched' (ครัวกลางจัดส่งแล้ว - รอสาขา test กด "ตรวจรับสินค้า") ---
  const order2Items = [
    { item: itemMap['น้ำมันปาล์มทอดกรอบ (13.75 ลิตร)'], qty: 2 }, // 1,040
    { item: itemMap['ซอสพริกเข้มข้นสูตรช้างแดง (5 ลิตร)'], qty: 3 }, // 540
    { item: itemMap['กระดาษรองซับน้ำมันฟู้ดเกรด (แพ็ค 500 แผ่น)'], qty: 4 } // 260
  ];
  const order2Total = order2Items.reduce((sum, i) => sum + i.qty * i.item.cost_price, 0); // 1,840

  const t2Res = await db.prepare(`
    INSERT INTO central_kitchen_transfers (transfer_no, branch_id, requested_by_user_id, requested_by_name, status, total_cost, notes, dispatched_by_name, created_at, dispatched_at)
    VALUES ('REQ-20261014-1002', 3, 9, 'mr.1', 'dispatched', ?, 'เบิกน้ำมันปาล์มและซอสพริกเร่งด่วน', 'ผู้จัดการครัวกลาง', ?, ?)
  `).run(order2Total, getThaiNow(45), getThaiNow(15));
  const t2Id = t2Res.lastInsertRowid;

  for (const it of order2Items) {
    await db.prepare(`
      INSERT INTO central_kitchen_transfer_items (transfer_id, item_id, item_name, unit, cost_price, quantity)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(t2Id, it.item.id, it.item.name, it.item.unit, it.item.cost_price, it.qty);
    // ตัดสต็อกครัวกลาง
    await db.prepare('UPDATE central_kitchen_items SET quantity = quantity - ? WHERE id = ?').run(it.qty, it.item.id);
  }
  console.log(`  🚚 ใบเบิก 2 (#REQ-20261014-1002): สถานะ "จัดส่งแล้ว (dispatched)" ยอด ${order2Total} บาท (รอสาขา test กดปุ่มตรวจรับ)`);

  // --- ใบเบิกที่ 3: สถานะ 'pending' (สาขา test ขอเบิกแล้ว - รอครัวกลางกด "จัดส่งสินค้า") ---
  const order3Items = [
    { item: itemMap['ถุงมือพลาสติกใสสัมผัสอาหาร (กล่อง 100 ชิ้น)'], qty: 3 }, // 105
    { item: itemMap['ที่คีบสแตนเลสทนความร้อนอย่างหนา'], qty: 2 } // 170
  ];
  const order3Total = order3Items.reduce((sum, i) => sum + i.qty * i.item.cost_price, 0); // 275

  const t3Res = await db.prepare(`
    INSERT INTO central_kitchen_transfers (transfer_no, branch_id, requested_by_user_id, requested_by_name, status, total_cost, notes, created_at)
    VALUES ('REQ-20261014-1003', 3, 8, 'ธัน', 'pending', ?, 'ขอเบิกอุปกรณ์และถุงมือเพิ่มสำหรับกะบ่าย', ?)
  `).run(order3Total, getThaiNow(10));
  const t3Id = t3Res.lastInsertRowid;

  for (const it of order3Items) {
    await db.prepare(`
      INSERT INTO central_kitchen_transfer_items (transfer_id, item_id, item_name, unit, cost_price, quantity)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(t3Id, it.item.id, it.item.name, it.item.unit, it.item.cost_price, it.qty);
  }
  console.log(`  ⏳ ใบเบิก 3 (#REQ-20261014-1003): สถานะ "รอจัดส่ง (pending)" ยอด ${order3Total} บาท (รอครัวกลางกดปุ่มจัดส่ง)`);

  // 8. เติมยอดขายจำลองของสาขา test ในเดือนนี้ (~18,500 บาท) เพื่อให้คำนวณกำไร 60/40 แสดงผลได้จริง
  console.log('🍗 เพิ่มยอดขายตัวอย่างสำหรับสาขา test ในเดือนนี้เพื่อทดสอบรายงานแบ่งกำไร...');
  const mockOrders = [
    { num: 'CD-20261014-101', sub: 450, total: 450, pay: 'cash', staff: 8 },
    { num: 'CD-20261014-102', sub: 620, total: 620, pay: 'qr', staff: 9 },
    { num: 'CD-20261014-103', sub: 1250, total: 1250, pay: 'cash', staff: 8 },
    { num: 'CD-20261014-104', sub: 890, total: 890, pay: 'qr', staff: 11 },
    { num: 'CD-20261014-105', sub: 2400, total: 2400, pay: 'delivery', staff: 9 },
    { num: 'CD-20261014-106', sub: 1550, total: 1550, pay: 'cash', staff: 8 },
    { num: 'CD-20261014-107', sub: 3200, total: 3200, pay: 'qr', staff: 8 },
    { num: 'CD-20261014-108', sub: 1800, total: 1800, pay: 'qr', staff: 9 },
    { num: 'CD-20261014-109', sub: 2650, total: 2650, pay: 'cash', staff: 8 },
    { num: 'CD-20261014-110', sub: 3500, total: 3500, pay: 'qr', staff: 11 }
  ];

  for (let idx = 0; idx < mockOrders.length; idx++) {
    const o = mockOrders[idx];
    const createdTime = getThaiNow(240 - idx * 20);
    // ตรวจสอบว่ามี order_number นี้แล้วหรือยัง
    const exist = await db.prepare('SELECT id FROM orders WHERE order_number = ?').get(o.num);
    if (!exist) {
      await db.prepare(`
        INSERT INTO orders (branch_id, order_number, staff_id, subtotal, discount, total, payment_method, cash_received, cash_change, status, created_at)
        VALUES (3, ?, ?, ?, 0, ?, ?, ?, 0, 'completed', ?)
      `).run(o.num, o.staff, o.sub, o.total, o.pay, o.total, createdTime);
    }
  }

  // สรุปผล
  const totalSalesRes = await db.prepare("SELECT COALESCE(SUM(total), 0) as s FROM orders WHERE branch_id = 3 AND status = 'completed' AND date(created_at) >= date('now', 'start of month', '+7 hours')").get();
  const totalExpRes = await db.prepare("SELECT COALESCE(SUM(amount), 0) as e FROM expenses WHERE branch_id = 3 AND status = 'completed' AND date(expense_date) >= date('now', 'start of month', '+7 hours')").get();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 สร้าง Mock Data และชุดทดสอบครัวกลางสำหรับสาขา test สำเร็จ 100%!');
  console.log(`📊 ยอดขายสาขา test เดือนนี้: ${totalSalesRes.s.toLocaleString()} บาท`);
  console.log(`💸 ค่าใช้จ่าย/ค่าเบิกของสาขา test เดือนนี้: ${totalExpRes.e.toLocaleString()} บาท`);
  console.log(`📈 กำไรสุทธิคงเหลือให้แบ่งปันผล: ${(totalSalesRes.s - totalExpRes.e).toLocaleString()} บาท`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

run().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ เกิดข้อผิดพลาด:', err);
  process.exit(1);
});
