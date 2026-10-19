require('dotenv').config();
const { getDb } = require('../config/database');

async function copyBunsToBranch5() {
  const db = getDb();
  console.log('--- Step 1: Ensure category in Branch 5 ---');
  let cat = await db.prepare("SELECT * FROM categories WHERE branch_id = 5 AND name = 'ซาลาเปานึ่ง'").get();
  if (!cat) {
    const res = await db.prepare("INSERT INTO categories (branch_id, name, sort_order, active) VALUES (5, 'ซาลาเปานึ่ง', 4, 1)").run();
    cat = await db.prepare("SELECT * FROM categories WHERE id = ?").get(res.lastInsertRowid);
    console.log('✅ Created category in branch 5:', cat);
  } else {
    console.log('ℹ️ Category already exists in branch 5:', cat);
  }

  console.log('\n--- Step 2: Fetch steamed bun items from Branch 2 (หน้าบ้าน) ---');
  const sourceItems = await db.prepare("SELECT * FROM menu_items WHERE branch_id = 2 AND id IN (1, 2, 3, 4, 5)").all();
  console.log(`Found ${sourceItems.length} items from branch 2`);

  const thaiNow = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

  console.log('\n--- Step 3: Insert items into Branch 5 (วงเวียนพายัพ) with stock = 0 ---');
  for (const item of sourceItems) {
    const existing = await db.prepare("SELECT * FROM menu_items WHERE branch_id = 5 AND name = ?").get(item.name);
    if (!existing) {
      const insRes = await db.prepare(`
        INSERT INTO menu_items (branch_id, name, price, category_id, image_url, active, sort_order, uom, multiple_prices, quantity, raw_quantity, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, 0, NULL, ?, ?)
      `).run(
        5,
        item.name,
        item.price,
        cat.id,
        item.image_url,
        item.sort_order,
        item.uom,
        item.multiple_prices,
        thaiNow,
        thaiNow
      );
      console.log(`✅ Inserted: "${item.name}" (Price: ${item.price} บาท, Stock: 0, ID: ${insRes.lastInsertRowid})`);
    } else {
      console.log(`ℹ️ Already exists: "${item.name}" (ID: ${existing.id})`);
    }
  }

  console.log('\n--- Step 4: Verify items in Branch 5 ---');
  const branch5Items = await db.prepare("SELECT id, name, price, category_id, image_url, quantity, raw_quantity, uom FROM menu_items WHERE branch_id = 5 AND category_id = ?").all(cat.id);
  console.log(JSON.stringify(branch5Items, null, 2));
}

copyBunsToBranch5().then(() => {
  console.log('\n🎉 Finished copying buns to branch 5 successfully!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error copying buns:', err);
  process.exit(1);
});
