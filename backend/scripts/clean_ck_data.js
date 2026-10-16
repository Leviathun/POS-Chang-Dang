const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { getDb, initDatabase } = require('../config/database');

async function cleanData() {
  await initDatabase();
  const db = getDb();
  console.log('--- Cleaning Central Kitchen Data ---');
  console.log('Connected DB URL:', process.env.TURSO_DATABASE_URL ? 'Turso Cloud' : 'Local SQLite');

  // 1. Inspect before
  const transfersBefore = await db.prepare("SELECT COUNT(*) as count FROM central_kitchen_transfers").get();
  const transferItemsBefore = await db.prepare("SELECT COUNT(*) as count FROM central_kitchen_transfer_items").get();
  const wasteBefore = await db.prepare("SELECT COUNT(*) as count FROM central_kitchen_waste_logs").get();
  const restockBefore = await db.prepare("SELECT COUNT(*) as count FROM central_kitchen_restock_logs").get();
  const financeBefore = await db.prepare("SELECT COUNT(*) as count FROM central_kitchen_finances").get();
  const expensesBefore = await db.prepare("SELECT COUNT(*) as count FROM expenses WHERE note LIKE '%ครัวกลาง%' OR note LIKE '%ใบเบิก%'").get();
  const itemsBefore = await db.prepare("SELECT id, name, quantity, unit, cost_price FROM central_kitchen_items").all();

  console.log('Before cleanup:');
  console.log({
    transfers: transfersBefore.count,
    transferItems: transferItemsBefore.count,
    wasteLogs: wasteBefore.count,
    restockLogs: restockBefore.count,
    financeLogs: financeBefore.count,
    ckExpenses: expensesBefore.count,
    itemsCount: itemsBefore.length
  });

  // 2. Perform deletions
  console.log('Deleting transfer items...');
  await db.exec("DELETE FROM central_kitchen_transfer_items");
  
  console.log('Deleting transfers...');
  await db.exec("DELETE FROM central_kitchen_transfers");

  console.log('Deleting waste logs...');
  await db.exec("DELETE FROM central_kitchen_waste_logs");

  console.log('Deleting restock logs...');
  await db.exec("DELETE FROM central_kitchen_restock_logs");

  console.log('Deleting central kitchen finances...');
  await db.exec("DELETE FROM central_kitchen_finances");

  console.log('Deleting transfer expenses from expenses table...');
  await db.exec("DELETE FROM expenses WHERE note LIKE '%ครัวกลาง%' OR note LIKE '%ใบเบิก%'");

  // 3. Reset catalog items stock to clean round values for easy user testing
  console.log('Resetting catalog item quantities...');
  for (const item of itemsBefore) {
    let cleanQty = 50;
    if (item.name.includes('ถุง')) cleanQty = 100;
    if (item.name.includes('กะทะ') || item.name.includes('หม้อ')) cleanQty = 10;
    if (item.name.includes('ไก่')) cleanQty = 50;
    if (item.name.includes('ซอส')) cleanQty = 50;

    await db.prepare("UPDATE central_kitchen_items SET quantity = ? WHERE id = ?").run(cleanQty, item.id);
  }

  // 4. Inspect after
  const transfersAfter = await db.prepare("SELECT COUNT(*) as count FROM central_kitchen_transfers").get();
  const transferItemsAfter = await db.prepare("SELECT COUNT(*) as count FROM central_kitchen_transfer_items").get();
  const wasteAfter = await db.prepare("SELECT COUNT(*) as count FROM central_kitchen_waste_logs").get();
  const restockAfter = await db.prepare("SELECT COUNT(*) as count FROM central_kitchen_restock_logs").get();
  const financeAfter = await db.prepare("SELECT COUNT(*) as count FROM central_kitchen_finances").get();
  const expensesAfter = await db.prepare("SELECT COUNT(*) as count FROM expenses WHERE note LIKE '%ครัวกลาง%' OR note LIKE '%ใบเบิก%'").get();
  const itemsAfter = await db.prepare("SELECT id, name, quantity, unit, cost_price FROM central_kitchen_items").all();

  console.log('After cleanup:');
  console.log({
    transfers: transfersAfter.count,
    transferItems: transferItemsAfter.count,
    wasteLogs: wasteAfter.count,
    restockLogs: restockAfter.count,
    financeLogs: financeAfter.count,
    ckExpenses: expensesAfter.count,
    items: itemsAfter
  });
  console.log('--- Cleanup Finished Successfully ---');
}

cleanData().catch(err => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});
