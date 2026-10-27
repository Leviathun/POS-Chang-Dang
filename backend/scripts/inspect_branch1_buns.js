require('dotenv').config();
const { getDb } = require('../config/database');

async function inspect() {
  const db = getDb();
  const cats1 = await db.prepare("SELECT * FROM categories WHERE branch_id = 1").all();
  for (const c of cats1) {
    if (c.name.includes('เปา') || c.name.includes('ปิ้ง')) {
      console.log(`\n=== Category ${c.id}: "${c.name}" (sort_order: ${c.sort_order}) ===`);
      const items = await db.prepare("SELECT id, name, price, category_id, image_url, sort_order, uom, multiple_prices, quantity, raw_quantity FROM menu_items WHERE branch_id = 1 AND category_id = ?").all(c.id);
      items.forEach(i => console.log(`  - [ID ${i.id}] ${i.name} | Price: ${i.price} | UOM: ${i.uom} | Image: ${i.image_url}`));
    }
  }

  console.log('\n=== Branch 5 Existing Categories ===');
  const cats5 = await db.prepare("SELECT * FROM categories WHERE branch_id = 5").all();
  cats5.forEach(c => console.log(`  Cat ${c.id}: "${c.name}" (sort: ${c.sort_order})`));
}

inspect().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
