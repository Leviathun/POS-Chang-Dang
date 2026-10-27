require('dotenv').config();
const { getDb } = require('../config/database');

async function addShumaiToBranch5() {
  const db = getDb();

  console.log('--- Step 1: Find Category "ซาลาเปา & ขนมจีบ" in Branch 5 ---');
  const cat = await db.prepare("SELECT * FROM categories WHERE branch_id = 5 AND name LIKE '%ซาลาเปา%'").get();
  if (!cat) {
    throw new Error('Category "ซาลาเปา & ขนมจีบ" not found in Branch 5!');
  }
  console.log('Target Category in Branch 5:', cat);

  console.log('\n--- Step 2: Fetch "ขนมจีบหมู" from Branch 1 / Branch 2 ---');
  const sourceShumai = await db.prepare("SELECT * FROM menu_items WHERE name = 'ขนมจีบหมู' AND image_url IS NOT NULL LIMIT 1").get();
  if (!sourceShumai) {
    throw new Error('Source ขนมจีบหมู not found!');
  }
  console.log(`Source item: "${sourceShumai.name}" (Price: ${sourceShumai.price}, UOM: ${sourceShumai.uom})`);

  console.log('\n--- Step 3: Check if "ขนมจีบหมู" already exists in Branch 5 ---');
  const existing = await db.prepare("SELECT * FROM menu_items WHERE branch_id = 5 AND name = 'ขนมจีบหมู'").get();
  if (existing) {
    console.log(`ℹ️ "ขนมจีบหมู" already exists in Branch 5 (ID: ${existing.id}, Cat ID: ${existing.category_id})`);
    return;
  }

  // Find max sort_order within category 35
  const catMaxSort = await db.prepare("SELECT MAX(sort_order) as max_sort FROM menu_items WHERE branch_id = 5 AND category_id = ?").get(cat.id);
  const targetSortOrder = (catMaxSort && catMaxSort.max_sort !== null ? catMaxSort.max_sort : 17) + 1;
  console.log(`Target sort_order for ขนมจีบหมู: ${targetSortOrder}`);

  // Shift sort_order for any items in Branch 5 that have sort_order >= targetSortOrder
  console.log(`Shifting items in Branch 5 with sort_order >= ${targetSortOrder} by +1...`);
  await db.prepare("UPDATE menu_items SET sort_order = sort_order + 1 WHERE branch_id = 5 AND sort_order >= ?").run(targetSortOrder);

  const thaiNow = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

  console.log('\n--- Step 4: Insert "ขนมจีบหมู" into Branch 5 ---');
  const insertRes = await db.prepare(`
    INSERT INTO menu_items (branch_id, name, price, category_id, image_url, active, sort_order, uom, multiple_prices, quantity, raw_quantity, created_at, updated_at)
    VALUES (5, ?, ?, ?, ?, 1, ?, ?, ?, 0, NULL, ?, ?)
  `).run(
    sourceShumai.name,
    sourceShumai.price,
    cat.id,
    sourceShumai.image_url,
    targetSortOrder,
    sourceShumai.uom,
    sourceShumai.multiple_prices,
    thaiNow,
    thaiNow
  );

  console.log(`✅ Inserted "ขนมจีบหมู" into Branch 5 (ID: ${insertRes.lastInsertRowid})`);

  console.log('\n--- Step 5: Verification in Branch 5 ---');
  const allCatItems = await db.prepare(`
    SELECT id, name, price, category_id, (image_url IS NOT NULL) as has_image, sort_order, quantity, uom
    FROM menu_items
    WHERE branch_id = 5 AND category_id = ?
    ORDER BY sort_order ASC
  `).all(cat.id);

  console.log(`Items in "${cat.name}" (Branch 5):`);
  console.table(allCatItems);
}

addShumaiToBranch5().then(() => {
  console.log('\n🎉 Finished successfully!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
