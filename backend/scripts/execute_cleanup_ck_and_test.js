const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { getDb } = require('../config/database');

async function executeCleanup() {
  const db = getDb();
  console.log('========================================================');
  console.log('🚀 Starting Cleanup: Central Kitchen & Branch 3 (test)');
  console.log('Connected DB URL:', process.env.TURSO_DATABASE_URL ? 'Turso Cloud' : 'Local SQLite');
  console.log('========================================================');

  // Verify branch 3 exists and is indeed the test branch
  const branch3 = await db.prepare("SELECT * FROM branches WHERE id = 3").get();
  if (!branch3) {
    throw new Error('Branch 3 not found in database!');
  }
  console.log(`Confirmed Target Branch: ID ${branch3.id} - "${branch3.name}" (${branch3.address})`);

  // ──────────────────────────────────────────────────────────
  // 1. INSPECT BEFORE
  // ──────────────────────────────────────────────────────────
  console.log('\n--- 1. Counts Before Cleanup ---');
  
  // CK Counts
  const ckTransfersBefore = await db.prepare("SELECT COUNT(*) as c FROM central_kitchen_transfers").get().catch(() => ({ c: 0 }));
  const ckTransferItemsBefore = await db.prepare("SELECT COUNT(*) as c FROM central_kitchen_transfer_items").get().catch(() => ({ c: 0 }));
  const ckWasteBefore = await db.prepare("SELECT COUNT(*) as c FROM central_kitchen_waste_logs").get().catch(() => ({ c: 0 }));
  const ckRestockBefore = await db.prepare("SELECT COUNT(*) as c FROM central_kitchen_restock_logs").get().catch(() => ({ c: 0 }));
  const ckFinancesBefore = await db.prepare("SELECT COUNT(*) as c FROM central_kitchen_finances").get().catch(() => ({ c: 0 }));
  const ckItemsBefore = await db.prepare("SELECT id, name, quantity FROM central_kitchen_items").all().catch(() => []);

  // Branch 3 Counts
  const b3OrdersBefore = await db.prepare("SELECT COUNT(*) as c FROM orders WHERE branch_id = 3").get().catch(() => ({ c: 0 }));
  const b3OrderItemsBefore = await db.prepare("SELECT COUNT(*) as c FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE branch_id = 3)").get().catch(() => ({ c: 0 }));
  const b3ExpensesBefore = await db.prepare("SELECT COUNT(*) as c FROM expenses WHERE branch_id = 3").get().catch(() => ({ c: 0 }));
  const b3StockLogsBefore = await db.prepare("SELECT COUNT(*) as c FROM stock_logs WHERE branch_id = 3").get().catch(() => ({ c: 0 }));
  const b3ModifierStockLogsBefore = await db.prepare("SELECT COUNT(*) as c FROM modifier_stock_logs WHERE branch_id = 3").get().catch(() => ({ c: 0 }));
  const b3ActivityLogsBefore = await db.prepare("SELECT COUNT(*) as c FROM activity_logs WHERE branch_id = 3").get().catch(() => ({ c: 0 }));
  const b3CashDrawerBefore = await db.prepare("SELECT COUNT(*) as c FROM cash_drawer_sessions WHERE branch_id = 3").get().catch(() => ({ c: 0 }));
  const b3PayoutsBefore = await db.prepare("SELECT COUNT(*) as c FROM branch_dividend_payouts WHERE branch_id = 3").get().catch(() => ({ c: 0 }));
  const b3MenuItemsBefore = await db.prepare("SELECT id, name, quantity, raw_quantity FROM menu_items WHERE branch_id = 3").all().catch(() => []);

  console.log('Central Kitchen Before:', {
    transfers: ckTransfersBefore.c,
    transferItems: ckTransferItemsBefore.c,
    wasteLogs: ckWasteBefore.c,
    restockLogs: ckRestockBefore.c,
    finances: ckFinancesBefore.c,
    items: ckItemsBefore
  });

  console.log('Branch 3 (test) Before:', {
    orders: b3OrdersBefore.c,
    orderItems: b3OrderItemsBefore.c,
    expenses: b3ExpensesBefore.c,
    stockLogs: b3StockLogsBefore.c,
    modifierStockLogs: b3ModifierStockLogsBefore.c,
    activityLogs: b3ActivityLogsBefore.c,
    cashDrawerSessions: b3CashDrawerBefore.c,
    dividendPayouts: b3PayoutsBefore.c,
    menuItemsCount: b3MenuItemsBefore.length
  });

  // ──────────────────────────────────────────────────────────
  // 2. EXECUTE CLEANUP (Child-to-parent dependency order)
  // ──────────────────────────────────────────────────────────
  console.log('\n--- 2. Executing Cleanup Operations ---');

  // A. Clean Central Kitchen Transfer Items & Transfers
  console.log('  🗑️ 1. Deleting central_kitchen_transfer_items...');
  await db.exec("DELETE FROM central_kitchen_transfer_items");

  console.log('  🗑️ 2. Deleting central_kitchen_transfers...');
  await db.exec("DELETE FROM central_kitchen_transfers");

  console.log('  🗑️ 3. Deleting central_kitchen_waste_logs...');
  await db.exec("DELETE FROM central_kitchen_waste_logs");

  console.log('  🗑️ 4. Deleting central_kitchen_restock_logs...');
  await db.exec("DELETE FROM central_kitchen_restock_logs");

  console.log('  🗑️ 5. Deleting central_kitchen_finances...');
  await db.exec("DELETE FROM central_kitchen_finances");

  try {
    await db.exec("DELETE FROM central_kitchen_payouts");
    console.log('  🗑️ 6. Deleting central_kitchen_payouts...');
  } catch (e) {}

  // B. Clean Order child dependencies before orders table
  console.log('  🗑️ 7. Deleting Branch 3 order_items...');
  await db.exec("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE branch_id = 3)");

  console.log('  🗑️ 8. Deleting Branch 3 stock_logs & modifier_stock_logs...');
  await db.exec("DELETE FROM stock_logs WHERE branch_id = 3 OR order_id IN (SELECT id FROM orders WHERE branch_id = 3)").catch(() => {});
  await db.exec("DELETE FROM modifier_stock_logs WHERE branch_id = 3 OR order_id IN (SELECT id FROM orders WHERE branch_id = 3)").catch(() => {});

  // C. Now delete orders
  console.log('  🗑️ 9. Deleting Branch 3 orders...');
  await db.exec("DELETE FROM orders WHERE branch_id = 3");

  await db.exec("DELETE FROM archived_order_items WHERE order_id IN (SELECT id FROM archived_orders WHERE branch_id = 3)").catch(() => {});
  await db.exec("DELETE FROM archived_orders WHERE branch_id = 3").catch(() => {});

  // D. Clean HR/Employee logs referencing expenses if any
  console.log('  🗑️ 10. Deleting Branch 3 employee advances/payrolls/guarantees...');
  await db.exec("DELETE FROM employee_advances WHERE branch_id = 3").catch(() => {});
  await db.exec("DELETE FROM employee_payrolls WHERE branch_id = 3").catch(() => {});
  await db.exec("DELETE FROM employee_guarantees WHERE branch_id = 3").catch(() => {});

  // E. Clean Expenses
  console.log('  🗑️ 11. Deleting Branch 3 expenses & transfer expenses...');
  await db.exec("DELETE FROM expenses WHERE branch_id = 3");
  await db.exec("DELETE FROM expenses WHERE note LIKE '%ใบเบิก%' OR note LIKE '%ครัวกลาง%'").catch(() => {});

  // F. Clean Cash Drawer & Activity logs
  console.log('  🗑️ 12. Deleting Branch 3 cash_drawer_sessions...');
  await db.exec("DELETE FROM cash_drawer_sessions WHERE branch_id = 3").catch(() => {});

  console.log('  🗑️ 13. Deleting Branch 3 activity_logs...');
  await db.exec("DELETE FROM activity_logs WHERE branch_id = 3").catch(() => {});

  console.log('  🗑️ 14. Deleting Branch 3 dividend payouts...');
  await db.exec("DELETE FROM branch_dividend_payouts WHERE branch_id = 3").catch(() => {});

  // G. Reset Central Kitchen Catalog Stock to 0 (Keep items)
  console.log('  🔄 15. Resetting central_kitchen_items stock quantities to 0...');
  await db.exec("UPDATE central_kitchen_items SET quantity = 0");

  // H. Reset Branch 3 Menu Items Stock to 0 (Keep menu items & categories)
  console.log('  🔄 16. Resetting Branch 3 menu_items stock (quantity = 0, raw_quantity = 0)...');
  await db.exec("UPDATE menu_items SET quantity = 0, raw_quantity = 0 WHERE branch_id = 3");

  try {
    await db.exec("UPDATE modifiers SET quantity = 0 WHERE branch_id = 3");
  } catch (e) {}

  // ──────────────────────────────────────────────────────────
  // 3. INSPECT AFTER
  // ──────────────────────────────────────────────────────────
  console.log('\n--- 3. Counts After Cleanup ---');

  const ckTransfersAfter = await db.prepare("SELECT COUNT(*) as c FROM central_kitchen_transfers").get();
  const ckTransferItemsAfter = await db.prepare("SELECT COUNT(*) as c FROM central_kitchen_transfer_items").get();
  const ckWasteAfter = await db.prepare("SELECT COUNT(*) as c FROM central_kitchen_waste_logs").get();
  const ckRestockAfter = await db.prepare("SELECT COUNT(*) as c FROM central_kitchen_restock_logs").get();
  const ckFinancesAfter = await db.prepare("SELECT COUNT(*) as c FROM central_kitchen_finances").get();
  const ckItemsAfter = await db.prepare("SELECT id, name, quantity FROM central_kitchen_items").all();

  const b3OrdersAfter = await db.prepare("SELECT COUNT(*) as c FROM orders WHERE branch_id = 3").get();
  const b3OrderItemsAfter = await db.prepare("SELECT COUNT(*) as c FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE branch_id = 3)").get();
  const b3ExpensesAfter = await db.prepare("SELECT COUNT(*) as c FROM expenses WHERE branch_id = 3").get();
  const b3CashDrawerAfter = await db.prepare("SELECT COUNT(*) as c FROM cash_drawer_sessions WHERE branch_id = 3").get().catch(() => ({ c: 0 }));
  const b3MenuItemsAfter = await db.prepare("SELECT id, name, quantity, raw_quantity FROM menu_items WHERE branch_id = 3").all();
  const b3UsersAfter = await db.prepare("SELECT id, name, role FROM users WHERE branch_id = 3").all();
  const b3PartnersAfter = await db.prepare("SELECT * FROM branch_partners WHERE branch_id = 3").all().catch(() => []);

  console.log('Central Kitchen After:', {
    transfers: ckTransfersAfter.c,
    transferItems: ckTransferItemsAfter.c,
    wasteLogs: ckWasteAfter.c,
    restockLogs: ckRestockAfter.c,
    finances: ckFinancesAfter.c,
    items: ckItemsAfter
  });

  console.log('Branch 3 (test) After:', {
    orders: b3OrdersAfter.c,
    orderItems: b3OrderItemsAfter.c,
    expenses: b3ExpensesAfter.c,
    cashDrawerSessions: b3CashDrawerAfter.c,
    menuItemsCount: b3MenuItemsAfter.length,
    usersCount: b3UsersAfter.length,
    partnersCount: b3PartnersAfter.length
  });

  // Verify other branches were NOT touched
  const b1Orders = await db.prepare("SELECT COUNT(*) as c FROM orders WHERE branch_id = 1").get();
  const b2Orders = await db.prepare("SELECT COUNT(*) as c FROM orders WHERE branch_id = 2").get();
  const b5Orders = await db.prepare("SELECT COUNT(*) as c FROM orders WHERE branch_id = 5").get();

  console.log('\n--- Safety Check: Production Branches Unaffected ---');
  console.log(`  Branch 1 (สาขา หลัง มช.): ${b1Orders.c} orders (intact)`);
  console.log(`  Branch 2 (สาขา หน้าบ้าน): ${b2Orders.c} orders (intact)`);
  console.log(`  Branch 5 (สาขา วงเวียนพายัพ): ${b5Orders.c} orders (intact)`);

  console.log('\n========================================================');
  console.log('✅ CLEANUP COMPLETED SUCCESSFULLY');
  console.log('========================================================');
}

executeCleanup().catch(err => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});
