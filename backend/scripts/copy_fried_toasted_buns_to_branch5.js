require('dotenv').config();
const { getDb } = require('../config/database');

async function copyFriedAndToastedBunsToBranch5() {
  const db = getDb();

  console.log('--- Step 1: Ensure categories "เปาทอด" and "เปาปิ้ง" in Branch 5 ---');
  
  // 1. Ensure "เปาทอด" category
  let catFried = await db.prepare("SELECT * FROM categories WHERE branch_id = 5 AND name = 'เปาทอด'").get();
  if (!catFried) {
    const res = await db.prepare("INSERT INTO categories (branch_id, name, sort_order, active) VALUES (5, 'เปาทอด', 5, 1)").run();
    catFried = await db.prepare("SELECT * FROM categories WHERE id = ?").get(res.lastInsertRowid);
    console.log('✅ Created category in branch 5: "เปาทอด" (ID:', catFried.id, ')');
  } else {
    console.log('ℹ️ Category already exists: "เปาทอด" (ID:', catFried.id, ')');
  }

  // 2. Ensure "เปาปิ้ง" category
  let catToasted = await db.prepare("SELECT * FROM categories WHERE branch_id = 5 AND name = 'เปาปิ้ง'").get();
  if (!catToasted) {
    const res = await db.prepare("INSERT INTO categories (branch_id, name, sort_order, active) VALUES (5, 'เปาปิ้ง', 6, 1)").run();
    catToasted = await db.prepare("SELECT * FROM categories WHERE id = ?").get(res.lastInsertRowid);
    console.log('✅ Created category in branch 5: "เปาปิ้ง" (ID:', catToasted.id, ')');
  } else {
    console.log('ℹ️ Category already exists: "เปาปิ้ง" (ID:', catToasted.id, ')');
  }

  console.log('\n--- Step 2: Fetch items from Branch 1 (สาขาหลัก) ---');
  const sourceCatFried = await db.prepare("SELECT * FROM categories WHERE branch_id = 1 AND name = 'เปาทอด'").get();
  const sourceCatToasted = await db.prepare("SELECT * FROM categories WHERE branch_id = 1 AND name = 'เปาปิ้ง'").get();

  if (!sourceCatFried || !sourceCatToasted) {
    throw new Error('Source categories not found in Branch 1!');
  }

  const friedItems = await db.prepare("SELECT * FROM menu_items WHERE branch_id = 1 AND category_id = ? ORDER BY sort_order, id").all(sourceCatFried.id);
  const toastedItems = await db.prepare("SELECT * FROM menu_items WHERE branch_id = 1 AND category_id = ? ORDER BY sort_order, id").all(sourceCatToasted.id);

  console.log(`Found ${friedItems.length} fried bun items and ${toastedItems.length} toasted bun items from Branch 1`);

  // Find max sort_order currently in branch 5
  const maxSortRow = await db.prepare("SELECT MAX(sort_order) as max_sort FROM menu_items WHERE branch_id = 5").get();
  let currentSort = (maxSortRow && maxSortRow.max_sort !== null ? maxSortRow.max_sort : 0) + 1;
  console.log(`Starting sort_order in Branch 5: ${currentSort}`);

  const thaiNow = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

  console.log('\n--- Step 3: Insert fried buns into Branch 5 ---');
  for (const item of friedItems) {
    const existing = await db.prepare("SELECT * FROM menu_items WHERE branch_id = 5 AND name = ?").get(item.name);
    if (!existing) {
      const ins = await db.prepare(`
        INSERT INTO menu_items (branch_id, name, price, category_id, image_url, active, sort_order, uom, multiple_prices, quantity, raw_quantity, created_at, updated_at)
        VALUES (5, ?, ?, ?, ?, 1, ?, ?, ?, 0, NULL, ?, ?)
      `).run(
        item.name,
        item.price,
        catFried.id,
        item.image_url,
        currentSort++,
        item.uom,
        item.multiple_prices,
        thaiNow,
        thaiNow
      );
      console.log(`✅ [เปาทอด] Inserted: "${item.name}" (Price: ${item.price} บาท, Stock: 0, ID: ${ins.lastInsertRowid})`);
    } else {
      console.log(`ℹ️ [เปาทอด] Already exists: "${item.name}" (ID: ${existing.id})`);
    }
  }

  console.log('\n--- Step 4: Insert toasted buns into Branch 5 ---');
  for (const item of toastedItems) {
    const existing = await db.prepare("SELECT * FROM menu_items WHERE branch_id = 5 AND name = ?").get(item.name);
    if (!existing) {
      const ins = await db.prepare(`
        INSERT INTO menu_items (branch_id, name, price, category_id, image_url, active, sort_order, uom, multiple_prices, quantity, raw_quantity, created_at, updated_at)
        VALUES (5, ?, ?, ?, ?, 1, ?, ?, ?, 0, NULL, ?, ?)
      `).run(
        item.name,
        item.price,
        catToasted.id,
        item.image_url,
        currentSort++,
        item.uom,
        item.multiple_prices,
        thaiNow,
        thaiNow
      );
      console.log(`✅ [เปาปิ้ง] Inserted: "${item.name}" (Price: ${item.price} บาท, Stock: 0, ID: ${ins.lastInsertRowid})`);
    } else {
      console.log(`ℹ️ [เปาปิ้ง] Already exists: "${item.name}" (ID: ${existing.id})`);
    }
  }

  console.log('\n--- Step 5: Verification in Branch 5 ---');
  const verifyFried = await db.prepare("SELECT id, name, price, category_id, (image_url IS NOT NULL) as has_image, sort_order, quantity, raw_quantity, uom FROM menu_items WHERE branch_id = 5 AND category_id = ? ORDER BY sort_order").all(catFried.id);
  const verifyToasted = await db.prepare("SELECT id, name, price, category_id, (image_url IS NOT NULL) as has_image, sort_order, quantity, raw_quantity, uom FROM menu_items WHERE branch_id = 5 AND category_id = ? ORDER BY sort_order").all(catToasted.id);

  console.log('\nเปาทอด (Branch 5):', verifyFried);
  console.log('\nเปาปิ้ง (Branch 5):', verifyToasted);
}

copyFriedAndToastedBunsToBranch5().then(() => {
  console.log('\n🎉 Successfully copied fried and toasted buns to Branch 5 (วงเวียนพายัพ)!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error during copy:', err);
  process.exit(1);
});
