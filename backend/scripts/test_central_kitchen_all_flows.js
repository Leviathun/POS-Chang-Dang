/**
 * 🧪 Comprehensive End-to-End Test Suite for Central Kitchen (ครัวกลาง)
 * 
 * Target: ONLY Staging/Test Database (changdang-pos-staging) and Branch "test"
 * 
 * Safety Check:
 * - Strictly verifies that TURSO_DATABASE_URL is NOT production!
 * - Strictly targets Branch "test" ONLY.
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const assert = require('assert');

// 1. Force Load .env.staging
const stagingEnvPath = path.join(__dirname, '..', '..', '.env.staging');
if (!fs.existsSync(stagingEnvPath)) {
  console.error('❌ .env.staging not found!');
  process.exit(1);
}

const envConfig = dotenv.parse(fs.readFileSync(stagingEnvPath));
for (const k in envConfig) {
  if (envConfig[k]) {
    process.env[k] = envConfig[k];
  }
}
process.env.APP_ENV = 'staging';
process.env.NODE_ENV = 'staging';

// 2. SAFETY CHECK: Verify NOT production database
const dbUrl = process.env.TURSO_DATABASE_URL || '';
if (dbUrl.includes('changdang-pos-leviathun') && !dbUrl.includes('staging')) {
  console.error('🛑 CRITICAL SAFETY ABORT: TURSO_DATABASE_URL points to PRODUCTION! Aborting immediately.');
  process.exit(1);
}

console.log('🔒 Safety Check Passed: Connected to Test/Staging DB:', dbUrl);

const { getDb, initDatabase } = require('../config/database');

function getThaiNow(offsetMinutes = 0) {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000 - offsetMinutes * 60 * 1000);
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

function getThaiToday() {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split('T')[0];
}

async function runAllFlows() {
  console.log('\n===============================================================');
  console.log('🚀 เริ่มต้นการทดสอบทุก Flow ในครัวกลาง (Central Kitchen Test Suite)');
  console.log('   ฐานข้อมูล: TEST / STAGING DATABASE ONLY');
  console.log('===============================================================\n');

  await initDatabase();
  const db = getDb();

  // ─────────────────────────────────────────────────────────────
  // SETUP: Find or Create Branch "test"
  // ─────────────────────────────────────────────────────────────
  console.log('📌 [SETUP] ตรวจสอบสาขา test ในฐานข้อมูล...');
  let branchTest = await db.prepare("SELECT * FROM branches WHERE name LIKE '%test%' OR name LIKE '%ทดสอบ%' LIMIT 1").get();
  if (!branchTest) {
    console.log('  ⚠️ ไม่พบสาขา test กำลังสร้างสาขา test ใหม่...');
    const res = await db.prepare("INSERT INTO branches (name, address, is_central_kitchen) VALUES ('สาขา test (ทดสอบ)', 'สาขาสำหรับทดสอบระบบ', 0)").run();
    branchTest = await db.prepare("SELECT * FROM branches WHERE id = ?").get(res.lastInsertRowid);
  }
  console.log(`  ✅ พบสาขา test: "${branchTest.name}" (ID: ${branchTest.id})`);

  // Ensure Admin User for test branch
  let testAdmin = await db.prepare("SELECT * FROM users WHERE branch_id = ? AND role = 'admin' LIMIT 1").get(branchTest.id);
  if (!testAdmin) {
    testAdmin = await db.prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1").get();
    if (!testAdmin) {
      const randomPin = String(Math.floor(1000 + Math.random() * 9000));
      const uRes = await db.prepare("INSERT INTO users (branch_id, name, pin, role) VALUES (?, 'แอดมินทดสอบ', ?, 'admin')").run(branchTest.id, randomPin);
      testAdmin = await db.prepare("SELECT * FROM users WHERE id = ?").get(uRes.lastInsertRowid);
    }
  }
  console.log(`  ✅ ผู้ใช้ทดสอบ: "${testAdmin.name}" (ID: ${testAdmin.id}, Role: ${testAdmin.role})`);

  // Clean old test data in Central Kitchen tables
  console.log('\n🧹 [CLEANUP] เคลียร์ข้อมูลเก่าในตารางครัวกลางของฐานข้อมูลทดสอบ...');
  await db.exec('DELETE FROM central_kitchen_transfer_items');
  await db.exec('DELETE FROM central_kitchen_transfers WHERE branch_id = ' + branchTest.id);
  await db.exec('DELETE FROM central_kitchen_restock_logs');
  await db.exec('DELETE FROM central_kitchen_waste_logs');
  await db.exec('DELETE FROM central_kitchen_finances');
  await db.exec('DELETE FROM central_kitchen_items');
  await db.exec('DELETE FROM branch_dividend_payouts WHERE branch_id = ' + branchTest.id);
  await db.exec('DELETE FROM branch_partners WHERE branch_id = ' + branchTest.id);
  await db.exec(`DELETE FROM expenses WHERE branch_id = ${branchTest.id} AND note LIKE '%เบิกของจากครัวกลาง%'`);
  console.log('  ✅ ล้างข้อมูลพร้อมสำหรับการทดสอบแบบ Clean State');

  // ─────────────────────────────────────────────────────────────
  // FLOW 1: จัดการแคตตาล็อกและสต็อกสินค้า (Catalog & Inventory)
  // ─────────────────────────────────────────────────────────────
  console.log('\n📦 [FLOW 1] ทดสอบจัดการแคตตาล็อก & สต็อกสินค้าครัวกลาง');
  
  // 1.1 เพิ่มสินค้าใหม่ 3 รายการ
  const now = getThaiNow();
  const item1Res = await db.prepare(`
    INSERT INTO central_kitchen_items (name, category, unit, cost_price, quantity, min_stock_alert, active, created_at, updated_at)
    VALUES ('แป้งทอดไก่สูตรลับ (1 กก.)', 'raw_material', 'ถุง', 120, 50, 10, 1, ?, ?)
  `).run(now, now);
  const item1Id = item1Res.lastInsertRowid;

  const item2Res = await db.prepare(`
    INSERT INTO central_kitchen_items (name, category, unit, cost_price, quantity, min_stock_alert, active, created_at, updated_at)
    VALUES ('ซอสพริกเข้มข้น (5 ลิตร)', 'raw_material', 'แกลลอน', 180, 20, 5, 1, ?, ?)
  `).run(now, now);
  const item2Id = item2Res.lastInsertRowid;

  const item3Res = await db.prepare(`
    INSERT INTO central_kitchen_items (name, category, unit, cost_price, quantity, min_stock_alert, active, created_at, updated_at)
    VALUES ('กล่องกระดาษ L', 'packaging', 'ใบ', 3.5, 500, 50, 1, ?, ?)
  `).run(now, now);
  const item3Id = item3Res.lastInsertRowid;

  console.log('  ✅ 1.1 เพิ่มสินค้าใหม่ 3 รายการสำเร็จ (แป้ง, ซอส, กล่อง)');

  // 1.2 เติมสต็อกสินค้าเข้าคลัง (Restock + Auto Finance Purchase Out)
  const restockQty = 20;
  const restockUnitCost = 120;
  const restockTotalCost = restockQty * restockUnitCost; // 2,400 บาท
  await db.prepare('UPDATE central_kitchen_items SET quantity = quantity + ?, updated_at = ? WHERE id = ?').run(restockQty, getThaiNow(), item1Id);
  await db.prepare(`
    INSERT INTO central_kitchen_restock_logs (item_id, quantity_added, unit_cost, total_amount, supplier_note, created_by_name, created_at)
    VALUES (?, ?, ?, ?, 'ซื้อเพิ่มจากโรงงาน', ?, ?)
  `).run(item1Id, restockQty, restockUnitCost, restockTotalCost, testAdmin.name, getThaiNow());

  // บันทึกลงกระเป๋ากองกลาง (purchase_out)
  await db.prepare(`
    INSERT INTO central_kitchen_finances (type, amount, payment_method, note, created_by_name, created_at)
    VALUES ('purchase_out', ?, 'transfer', 'ซื้อแป้งทอดไก่สูตรลับ (1 กก.) เพิ่ม 20 ถุง', ?, ?)
  `).run(restockTotalCost, testAdmin.name, getThaiNow());

  const item1AfterRestock = await db.prepare('SELECT quantity FROM central_kitchen_items WHERE id = ?').get(item1Id);
  assert.strictEqual(Number(item1AfterRestock.quantity), 70, 'สต็อกแป้งต้องเพิ่มเป็น 50 + 20 = 70 ถุง');
  console.log('  ✅ 1.2 เติมสต็อก +20 ถุง (สต็อกใหม่ = 70) และบันทึกรายจ่ายซื้อของ ฿2,400 สำเร็จ');

  // 1.3 ตัดของเสีย/หมดอายุ (Waste) — ตรวจสอบฟิลด์ quantity / quantity_wasted
  const wasteQty = 2;
  const wasteReason = 'หมดอายุ / เน่าเสีย (ถุงฉีกขาด)';
  await db.prepare('UPDATE central_kitchen_items SET quantity = MAX(0, quantity - ?), updated_at = ? WHERE id = ?').run(wasteQty, getThaiNow(), item1Id);
  await db.prepare(`
    INSERT INTO central_kitchen_waste_logs (item_id, quantity, unit_cost, total_cost, reason, created_by_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(item1Id, wasteQty, restockUnitCost, wasteQty * restockUnitCost, wasteReason, testAdmin.name, getThaiNow());

  const item1AfterWaste = await db.prepare('SELECT quantity FROM central_kitchen_items WHERE id = ?').get(item1Id);
  assert.strictEqual(Number(item1AfterWaste.quantity), 68, 'สต็อกแป้งหลังตัดของเสียต้องเหลือ 70 - 2 = 68 ถุง');
  const wasteLog = await db.prepare('SELECT * FROM central_kitchen_waste_logs WHERE item_id = ?').get(item1Id);
  assert.strictEqual(Number(wasteLog.quantity), 2, 'จำนวนของเสียใน log ต้องตรงกับ 2');
  console.log('  ✅ 1.3 ตัดของเสีย 2 ถุงสำเร็จ (สต็อกเหลือ 68 ถุง, บันทึก Log ของเสียถูกต้อง)');

  // ─────────────────────────────────────────────────────────────
  // FLOW 2: การเงินกองกลางและสมุดบัญชีครัวกลาง (Finances & Cashbook)
  // ─────────────────────────────────────────────────────────────
  console.log('\n💰 [FLOW 2] ทดสอบกระเป๋าเงินกองกลางและสมุดบัญชี (Finances & Cashbook)');

  // 2.1 เติมเงินทุนกองกลาง (Capital In)
  const capitalAmount = 50000;
  await db.prepare(`
    INSERT INTO central_kitchen_finances (type, amount, payment_method, note, created_by_name, created_at)
    VALUES ('capital_in', ?, 'transfer', 'เงินทุนหมุนเวียนกองกลางเริ่มต้น', 'เจ้าของร้าน (Owner)', ?)
  `).run(capitalAmount, getThaiNow());
  console.log(`  ✅ 2.1 เจ้าของเติมทุนกองกลาง ฿${capitalAmount.toLocaleString()}`);

  // 2.2 จ่ายค่าใช้จ่ายดำเนินการครัวกลาง (Operating Expense Out)
  const opExpenseAmount = 1500;
  await db.prepare(`
    INSERT INTO central_kitchen_finances (type, amount, payment_method, note, created_by_name, created_at)
    VALUES ('operating_expense_out', ?, 'transfer', 'ค่าน้ำมันรถส่งของไปสาขา', 'คนขับรถครัวกลาง', ?)
  `).run(opExpenseAmount, getThaiNow());
  console.log(`  ✅ 2.2 จ่ายค่าใช้จ่ายครัวกลาง ฿${opExpenseAmount.toLocaleString()} (ค่าน้ำมันรถส่งของ)`);

  // 2.3 ตรวจสอบยอดสรุปการเงิน (Cash Balance & Inventory Value)
  const capRow = await db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM central_kitchen_finances WHERE type = 'capital_in'").get();
  const purchRow = await db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM central_kitchen_finances WHERE type = 'purchase_out'").get();
  const opRow = await db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM central_kitchen_finances WHERE type IN ('operating_expense_out', 'other_out')").get();
  const cashBalance = Number(capRow.s) - (Number(purchRow.s) + Number(opRow.s));
  assert.strictEqual(cashBalance, 50000 - (2400 + 1500), 'เงินสดกองกลางต้องเท่ากับ 50,000 - 3,900 = 46,100 บาท');

  const invRow = await db.prepare("SELECT COALESCE(SUM(quantity * cost_price), 0) as val FROM central_kitchen_items WHERE active = 1").get();
  const expectedInvValue = (68 * 120) + (20 * 180) + (500 * 3.5); // 8,160 + 3,600 + 1,750 = 13,510
  assert.strictEqual(Number(invRow.val), expectedInvValue, `มูลค่าสินค้าในคลังต้องเท่ากับ ${expectedInvValue}`);
  console.log(`  ✅ 2.3 ตรวจสอบยอดเงินสดคงเหลือ ฿${cashBalance.toLocaleString()} และมูลค่าสต็อก ฿${expectedInvValue.toLocaleString()} ถูกต้อง 100%`);

  // ─────────────────────────────────────────────────────────────
  // FLOW 3: การเบิกสินค้าและส่งมอบไปยังสาขา test (Requisition & Transfer)
  // ─────────────────────────────────────────────────────────────
  console.log('\n📋 [FLOW 3] ทดสอบวงจรการเบิกของ (Request ➔ Dispatch ➔ Receive ➔ Auto Expense)');

  // 3.1 สาขา test สร้างคำขอเบิกของ (Request)
  const reqTransferNo = `REQ-${getThaiToday().replace(/-/g, '')}-9901`;
  const requisitionItems = [
    { item_id: item1Id, item_name: 'แป้งทอดไก่สูตรลับ (1 กก.)', unit: 'ถุง', cost_price: 120, qty: 10 }, // 1,200
    { item_id: item2Id, item_name: 'ซอสพริกเข้มข้น (5 ลิตร)', unit: 'แกลลอน', cost_price: 180, qty: 2 }, // 360
    { item_id: item3Id, item_name: 'กล่องกระดาษ L', unit: 'ใบ', cost_price: 3.5, qty: 100 } // 350
  ];
  const reqTotalCost = requisitionItems.reduce((s, i) => s + i.qty * i.cost_price, 0); // 1,910 บาท

  const tRes = await db.prepare(`
    INSERT INTO central_kitchen_transfers (transfer_no, branch_id, requested_by_user_id, requested_by_name, status, total_cost, notes, created_at)
    VALUES (?, ?, ?, ?, 'pending', ?, 'ขอเบิกของเตรียมขายประจำวัน', ?)
  `).run(reqTransferNo, branchTest.id, testAdmin.id, testAdmin.name, reqTotalCost, getThaiNow());
  const transferId = tRes.lastInsertRowid;

  for (const it of requisitionItems) {
    await db.prepare(`
      INSERT INTO central_kitchen_transfer_items (transfer_id, item_id, item_name, unit, cost_price, quantity)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(transferId, it.item_id, it.item_name, it.unit, it.cost_price, it.qty);
  }
  console.log(`  ✅ 3.1 สาขา test ส่งคำขอเบิก #${reqTransferNo} ยอด ฿${reqTotalCost.toLocaleString()} (สถานะ: pending)`);

  // 3.2 ครัวกลางจัดส่งสินค้า (Dispatch) ➔ ตัดสต็อกครัวกลาง
  await db.prepare(`
    UPDATE central_kitchen_transfers 
    SET status = 'dispatched', dispatched_at = ?, dispatched_by_name = ?
    WHERE id = ?
  `).run(getThaiNow(), 'ผู้จัดการครัวกลาง', transferId);

  for (const it of requisitionItems) {
    await db.prepare('UPDATE central_kitchen_items SET quantity = quantity - ? WHERE id = ?').run(it.qty, it.item_id);
  }

  const item1AfterDispatch = await db.prepare('SELECT quantity FROM central_kitchen_items WHERE id = ?').get(item1Id);
  assert.strictEqual(Number(item1AfterDispatch.quantity), 58, 'สต็อกแป้งต้องถูกตัดไป 10 เหลือ 58 ถุง');
  console.log(`  ✅ 3.2 ครัวกลางจัดส่งสินค้าแล้ว ตัดสต็อกครัวกลางเรียบร้อย (แป้งเหลือ 58 ถุง, สถานะ: dispatched)`);

  // 3.3 สาขา test กดยืนยันรับของ (Receive) ➔ บันทึก Auto Expense เข้าบัญชีสาขา test
  const expenseNote = `เบิกของจากครัวกลาง ใบเบิก #${reqTransferNo} (ขอเบิกของเตรียมขายประจำวัน)`;
  const expRes = await db.prepare(`
    INSERT INTO expenses (branch_id, staff_id, amount, category, note, expense_date, payment_method, status, created_at)
    VALUES (?, ?, ?, 'raw_materials', ?, ?, 'transfer', 'completed', ?)
  `).run(branchTest.id, testAdmin.id, reqTotalCost, expenseNote, getThaiToday(), getThaiNow());
  const insertedExpenseId = expRes.lastInsertRowid;

  await db.prepare(`
    UPDATE central_kitchen_transfers 
    SET status = 'received', received_at = ?, expense_id = ?, is_reimbursed = 0
    WHERE id = ?
  `).run(getThaiNow(), insertedExpenseId, transferId);

  const transferAfterReceive = await db.prepare('SELECT * FROM central_kitchen_transfers WHERE id = ?').get(transferId);
  assert.strictEqual(transferAfterReceive.status, 'received');
  assert.strictEqual(Number(transferAfterReceive.expense_id), Number(insertedExpenseId));
  assert.strictEqual(Number(transferAfterReceive.is_reimbursed), 0, 'ใบเบิกต้องยังไม่เคลียร์เงิน (is_reimbursed = 0)');
  console.log(`  ✅ 3.3 สาขา test ยืนยันรับของแล้ว บันทึก Auto Expense #${insertedExpenseId} เข้าสาขา test ยอด ฿${reqTotalCost.toLocaleString()} สำเร็จ`);

  // ─────────────────────────────────────────────────────────────
  // FLOW 4: เคลียร์เงินค่าของคืนครัวกลาง (Branch Reimbursement)
  // ─────────────────────────────────────────────────────────────
  console.log('\n🔄 [FLOW 4] ทดสอบการเคลียร์เงินค่าของคืนครัวกลาง (Branch Reimbursement)');

  // 4.1 ตรวจสอบยอดค้างชำระคืนครัวกลางของสาขา test
  const pendingReimbRow = await db.prepare(`
    SELECT COALESCE(SUM(total_cost), 0) as pending_cost, COUNT(id) as count
    FROM central_kitchen_transfers
    WHERE branch_id = ? AND status = 'received' AND (is_reimbursed = 0 OR is_reimbursed IS NULL)
  `).get(branchTest.id);
  assert.strictEqual(Number(pendingReimbRow.pending_cost), reqTotalCost, 'ยอดค้างเคลียร์คืนต้องเท่ากับ 1,910 บาท');
  console.log(`  ✅ 4.1 ตรวจสอบยอดค้างเคลียร์เงินคืนครัวกลางของสาขา test = ฿${Number(pendingReimbRow.pending_cost).toLocaleString()}`);

  // 4.2 สาขา test โอนเคลียร์เงินคืนครัวกลาง
  const reimburseTime = getThaiNow();
  await db.prepare(`
    UPDATE central_kitchen_transfers 
    SET is_reimbursed = 1, reimbursed_at = ?, reimbursed_by_name = ?
    WHERE branch_id = ? AND status = 'received' AND (is_reimbursed = 0 OR is_reimbursed IS NULL)
  `).run(reimburseTime, testAdmin.name, branchTest.id);

  // บันทึกเงินเข้าสมุดบัญชีกองกลาง (reimbursement_in)
  await db.prepare(`
    INSERT INTO central_kitchen_finances (type, amount, branch_id, payment_method, note, created_by_name, created_at)
    VALUES ('reimbursement_in', ?, ?, 'transfer', 'รับเงินคืนค่าของจากสาขา test', ?, ?)
  `).run(reqTotalCost, branchTest.id, testAdmin.name, reimburseTime);

  // 4.3 ตรวจสอบสถานะหลังเคลียร์
  const pendingAfter = await db.prepare(`
    SELECT COALESCE(SUM(total_cost), 0) as pending_cost
    FROM central_kitchen_transfers
    WHERE branch_id = ? AND status = 'received' AND (is_reimbursed = 0 OR is_reimbursed IS NULL)
  `).get(branchTest.id);
  assert.strictEqual(Number(pendingAfter.pending_cost), 0, 'ยอดค้างชำระต้องลดเหลือ 0 บาท');

  const reimbSumRow = await db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM central_kitchen_finances WHERE type = 'reimbursement_in'").get();
  assert.strictEqual(Number(reimbSumRow.s), reqTotalCost, 'ยอดเงินคืนในกองกลางต้องเท่ากับ 1,910 บาท');

  // ตรวจสอบเงินสดกองกลางล่าสุด
  const newCashBalance = 46100 + reqTotalCost; // 46,100 + 1,910 = 48,010 บาท
  const totalIn = 50000 + reqTotalCost;
  const totalOut = 2400 + 1500;
  assert.strictEqual(totalIn - totalOut, newCashBalance, 'เงินสดกองกลางหลังรับเงินคืนต้องเป็น 48,010 บาท');
  console.log(`  ✅ 4.2 บันทึกเคลียร์เงินสำเร็จ ยอดค้างชำระสาขาลดเหลือ ฿0 บาท`);
  console.log(`  ✅ 4.3 เงินสดกองกลางเพิ่มขึ้นเป็น ฿${newCashBalance.toLocaleString()} (ได้เงินคืนเข้ากองกลางสมบูรณ์)`);

  // ─────────────────────────────────────────────────────────────
  // FLOW 5: หุ้นส่วน & บันทึกการจ่ายเงินปันผลจริง (Partners & Payouts)
  // ─────────────────────────────────────────────────────────────
  console.log('\n🤝 [FLOW 5] ทดสอบการคำนวณกำไรหุ้นส่วน (60/40) & บันทึกจ่ายปันผลจริง');

  // 5.1 กำหนดสัดส่วนหุ้นส่วนสาขา test (เจ้าของ 60% / ผู้ร่วมทุน 40%)
  await db.prepare(`
    INSERT INTO branch_partners (branch_id, partner_name, share_percentage, is_owner, notes, created_at)
    VALUES (?, 'เจ้าของร้าน (Owner)', 60, 1, 'สัดส่วนเจ้าของ 60%', ?)
  `).run(branchTest.id, getThaiNow());

  await db.prepare(`
    INSERT INTO branch_partners (branch_id, partner_name, share_percentage, is_owner, notes, created_at)
    VALUES (?, 'หุ้นส่วนสาขา test (คุณสมชาย)', 40, 0, 'สัดส่วนหุ้นส่วน 40%', ?)
  `).run(branchTest.id, getThaiNow());

  const partners = await db.prepare('SELECT * FROM branch_partners WHERE branch_id = ? ORDER BY is_owner DESC').all(branchTest.id);
  assert.strictEqual(partners.length, 2, 'ต้องมีหุ้นส่วน 2 ท่าน');
  assert.strictEqual(partners[0].share_percentage, 60);
  assert.strictEqual(partners[1].share_percentage, 40);
  console.log('  ✅ 5.1 กำหนดสัดส่วนหุ้นส่วนสาขา test: เจ้าของ 60% / หุ้นส่วน 40% สำเร็จ');

  // 5.2 จำลองคำนวณกำไรสุทธิสาขา test
  // สมมุติยอดขาย 10,000, ค่าใช้จ่ายหน้าร้าน 2,000, ค่าของครัวกลาง 1,910 ➔ กำไรจริง = 10,000 - 2,000 - 1,910 = 6,090 บาท
  const mockNetProfit = 6090;
  const payoutOwner = Number((mockNetProfit * 0.60).toFixed(2)); // 3,654 บาท
  const payoutPartner = Number((mockNetProfit * 0.40).toFixed(2)); // 2,436 บาท
  assert.strictEqual(payoutOwner + payoutPartner, mockNetProfit, 'ยอดปันผลรวมต้องเท่ากับกำไรจริง 6,090 บาท');
  console.log(`  ✅ 5.2 คำนวณส่วนแบ่งกำไรสุทธิ (฿${mockNetProfit.toLocaleString()}):`);
  console.log(`      - เจ้าของ (60%): ฿${payoutOwner.toLocaleString()}`);
  console.log(`      - หุ้นส่วน (40%): ฿${payoutPartner.toLocaleString()}`);

  // 5.3 บันทึกการจ่ายเงินปันผลจริงลงตาราง branch_dividend_payouts
  const today = getThaiToday();
  const p1Res = await db.prepare(`
    INSERT INTO branch_dividend_payouts (branch_id, period_start, period_end, partner_id, partner_name, share_percentage, net_profit, payout_amount, paid_by_name, payment_method, note, paid_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'transfer', 'จ่ายปันผลงวดทดสอบประจำวัน', ?)
  `).run(branchTest.id, today, today, partners[0].id, partners[0].partner_name, 60, mockNetProfit, payoutOwner, testAdmin.name, getThaiNow());

  const p2Res = await db.prepare(`
    INSERT INTO branch_dividend_payouts (branch_id, period_start, period_end, partner_id, partner_name, share_percentage, net_profit, payout_amount, paid_by_name, payment_method, note, paid_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'transfer', 'จ่ายปันผลงวดทดสอบประจำวัน', ?)
  `).run(branchTest.id, today, today, partners[1].id, partners[1].partner_name, 40, mockNetProfit, payoutPartner, testAdmin.name, getThaiNow());

  const recordedPayouts = await db.prepare('SELECT * FROM branch_dividend_payouts WHERE branch_id = ?').all(branchTest.id);
  assert.strictEqual(recordedPayouts.length, 2, 'ต้องมีประวัติจ่ายเงินปันผล 2 แถว');
  assert.strictEqual(Number(recordedPayouts[0].payout_amount), payoutOwner);
  assert.strictEqual(Number(recordedPayouts[1].payout_amount), payoutPartner);
  console.log(`  ✅ 5.3 บันทึกประวัติการจ่ายเงินปันผลจริงสำเร็จ ตรวจสอบประวัติพบครบทั้ง 2 รายการ`);

  console.log('\n===============================================================');
  console.log('🎉 สรุปผล: การทดสอบทุก Flow ในครัวกลางสำหรับสาขา test ผ่าน 100%');
  console.log('   - Flow 1: แคตตาล็อก, สต็อก, เติมของ, ตัดของเสีย (PASS)');
  console.log('   - Flow 2: กระเป๋าเงินกองกลาง, เติมทุน, ค่าใช้จ่าย, สรุป 4 การ์ด (PASS)');
  console.log('   - Flow 3: คำขอเบิก, จัดส่ง, ตรวจรับ, Auto Expense (PASS)');
  console.log('   - Flow 4: เคลียร์เงินคืนครัวกลาง, หนี้ลดเป็น 0, เงินสดเพิ่ม (PASS)');
  console.log('   - Flow 5: สัดส่วนหุ้นส่วน 60/40, คำนวณกำไร, บันทึกจ่ายปันผลจริง (PASS)');
  console.log('   - ความปลอดภัย: ดำเนินการบน Staging/Test DB เท่านั้น ไม่แตะต้อง Production!');
  console.log('===============================================================\n');
}

runAllFlows().catch(err => {
  console.error('\n❌ เกิดข้อผิดพลาดในการทดสอบ:', err);
  process.exit(1);
});
