const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { createClient } = require('@libsql/client');

async function seedItems() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  console.log('Connecting to Turso DB...');

  const ckCatalog = [
    {
      name: 'ไก่ไร้กระดูก',
      category: 'raw_material',
      unit: 'ถุง',
      cost_price: 240,
      quantity: 50,
      min_stock_alert: 5,
      linked_menu_item_name: 'ไก่ไร้กระดูก',
      target_stock_type: 'raw',
      pack_size: 30
    },
    {
      name: 'สะโพกไก่',
      category: 'raw_material',
      unit: 'ถุง',
      cost_price: 235,
      quantity: 50,
      min_stock_alert: 5,
      linked_menu_item_name: 'สะโพกไก่',
      target_stock_type: 'raw',
      pack_size: 10
    },
    {
      name: 'น่องเล็ก',
      category: 'raw_material',
      unit: 'ถุง',
      cost_price: 220,
      quantity: 50,
      min_stock_alert: 5,
      linked_menu_item_name: 'น่องเล็ก',
      target_stock_type: 'raw',
      pack_size: 30
    },
    {
      name: 'น่องใหญ่',
      category: 'raw_material',
      unit: 'ถุง',
      cost_price: 195,
      quantity: 50,
      min_stock_alert: 5,
      linked_menu_item_name: 'น่องใหญ่',
      target_stock_type: 'raw',
      pack_size: 10
    },
    {
      name: 'ปีกไก่',
      category: 'raw_material',
      unit: 'ถุง',
      cost_price: 170,
      quantity: 50,
      min_stock_alert: 5,
      linked_menu_item_name: 'ปีก',
      target_stock_type: 'raw',
      pack_size: 10
    },
    {
      name: 'สะโพกติดน่อง',
      category: 'raw_material',
      unit: 'ถุง',
      cost_price: 225,
      quantity: 50,
      min_stock_alert: 5,
      linked_menu_item_name: 'สะโพกติดน่อง',
      target_stock_type: 'raw',
      pack_size: 5
    },
    {
      name: 'อกไก่สไปร์ซี่',
      category: 'raw_material',
      unit: 'ถุง',
      cost_price: 130,
      quantity: 50,
      min_stock_alert: 5,
      linked_menu_item_name: 'อกไก่สไปร์ซี่',
      target_stock_type: 'raw',
      pack_size: 8
    },
    {
      name: 'สะโพกไก่ไร้กระดูก',
      category: 'raw_material',
      unit: 'ถุง',
      cost_price: 130,
      quantity: 50,
      min_stock_alert: 5,
      linked_menu_item_name: 'สะโพกไก่ไร้กระดูก',
      target_stock_type: 'raw',
      pack_size: 11
    },
    {
      name: 'ชีสบอล',
      category: 'raw_material',
      unit: 'ถุง',
      cost_price: 80,
      quantity: 50,
      min_stock_alert: 5,
      linked_menu_item_name: 'ชีสบอล',
      target_stock_type: 'raw',
      pack_size: 30
    },
    {
      name: 'ชีสสติ๊ก',
      category: 'raw_material',
      unit: 'ถุง',
      cost_price: 85,
      quantity: 50,
      min_stock_alert: 5,
      linked_menu_item_name: 'ชีสสติ๊ก',
      target_stock_type: 'raw',
      pack_size: 13
    },
    {
      name: 'นักเก็ต',
      category: 'raw_material',
      unit: 'ถุง',
      cost_price: 130,
      quantity: 50,
      min_stock_alert: 5,
      linked_menu_item_name: 'นักเก็ต',
      target_stock_type: 'raw',
      pack_size: 50
    },
    {
      name: 'นักเก็ตลาวา',
      category: 'raw_material',
      unit: 'ถุง',
      cost_price: 75,
      quantity: 50,
      min_stock_alert: 5,
      linked_menu_item_name: 'นักเก็ตลาวา',
      target_stock_type: 'raw',
      pack_size: 20
    },
    {
      name: 'ซาลาเปาไส้หมูสับ',
      category: 'raw_material',
      unit: 'ลูก',
      cost_price: 10.50,
      quantity: 100,
      min_stock_alert: 10,
      linked_menu_item_name: 'ซาลาเปาไส้หมูสับ',
      target_stock_type: 'ready',
      pack_size: 1
    },
    {
      name: 'ซาลาเปาไส้ถั่วดำ',
      category: 'raw_material',
      unit: 'ลูก',
      cost_price: 10.50,
      quantity: 100,
      min_stock_alert: 10,
      linked_menu_item_name: 'ซาลาเปาไส้ถั่วดำ',
      target_stock_type: 'ready',
      pack_size: 1
    },
    {
      name: 'ซาลาเปาไส้ครีม',
      category: 'raw_material',
      unit: 'ลูก',
      cost_price: 10.50,
      quantity: 100,
      min_stock_alert: 10,
      linked_menu_item_name: 'ซาลาเปาไส้ครีม',
      target_stock_type: 'ready',
      pack_size: 1
    },
    {
      name: 'หมั่นโถว',
      category: 'raw_material',
      unit: 'ลูก',
      cost_price: 10.50,
      quantity: 100,
      min_stock_alert: 10,
      linked_menu_item_name: 'หมั่นโถว',
      target_stock_type: 'ready',
      pack_size: 1
    },
    {
      name: 'ซาลาเปาไส้หมูสับ ไข่เค็ม',
      category: 'raw_material',
      unit: 'ลูก',
      cost_price: 15.00,
      quantity: 100,
      min_stock_alert: 10,
      linked_menu_item_name: 'ซาลาเปาไส้หมูสับ ไข่เค็ม',
      target_stock_type: 'ready',
      pack_size: 1
    },
    {
      name: 'ขนมจีบหมู',
      category: 'raw_material',
      unit: 'ไม้',
      cost_price: 12.00,
      quantity: 100,
      min_stock_alert: 10,
      linked_menu_item_name: 'ขนมจีบหมู',
      target_stock_type: 'ready',
      pack_size: 1
    }
  ];

  console.log(`Starting upsert of ${ckCatalog.length} Central Kitchen items...`);

  for (const item of ckCatalog) {
    const existing = await client.execute({
      sql: "SELECT id, name FROM central_kitchen_items WHERE name = ? LIMIT 1",
      args: [item.name]
    });

    if (existing.rows.length > 0) {
      const existingId = existing.rows[0].id;
      console.log(`Updating existing item [${existingId}] ${item.name} (pack_size: ${item.pack_size}, cost: ${item.cost_price})...`);
      await client.execute({
        sql: `UPDATE central_kitchen_items 
              SET category = ?, unit = ?, cost_price = ?, pack_size = ?, 
                  linked_menu_item_name = ?, target_stock_type = ?, 
                  quantity = ?, min_stock_alert = ?, active = 1, updated_at = datetime('now', '+7 hours')
              WHERE id = ?`,
        args: [
          item.category, item.unit, item.cost_price, item.pack_size,
          item.linked_menu_item_name, item.target_stock_type,
          item.quantity, item.min_stock_alert, existingId
        ]
      });
    } else {
      console.log(`Inserting new item ${item.name} (pack_size: ${item.pack_size}, cost: ${item.cost_price})...`);
      await client.execute({
        sql: `INSERT INTO central_kitchen_items 
              (name, category, unit, cost_price, quantity, min_stock_alert, linked_menu_item_name, target_stock_type, pack_size, active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now', '+7 hours'), datetime('now', '+7 hours'))`,
        args: [
          item.name, item.category, item.unit, item.cost_price, item.quantity,
          item.min_stock_alert, item.linked_menu_item_name, item.target_stock_type, item.pack_size
        ]
      });
    }
  }

  // Next: Ensure Branch 3 (ทดสอบ (ห้ามเข้า)) has the fried/chicken items in menu_items
  console.log('--- Ensuring Branch 3 menu items exist for testing ---');
  // Check if category 'ไก่ทอด' exists in Branch 3
  let b3ChickenCat = await client.execute({
    sql: "SELECT id FROM categories WHERE branch_id = 3 AND name = 'ไก่ทอด' LIMIT 1"
  });
  let chickenCatId = b3ChickenCat.rows.length > 0 ? b3ChickenCat.rows[0].id : null;
  if (!chickenCatId) {
    console.log('Creating category ไก่ทอด for Branch 3...');
    const insertCat = await client.execute({
      sql: "INSERT INTO categories (branch_id, name, sort_order, active) VALUES (3, 'ไก่ทอด', 1, 1)"
    });
    chickenCatId = Number(insertCat.lastInsertRowid);
  }

  const branch3ExtraItems = [
    { name: 'ไก่ไร้กระดูก', price: 15, uom: 'ชิ้น' },
    { name: 'สะโพกไก่', price: 35, uom: 'ชิ้น' },
    { name: 'น่องเล็ก', price: 15, uom: 'ชิ้น' },
    { name: 'น่องใหญ่', price: 30, uom: 'ชิ้น' },
    { name: 'ปีก', price: 25, uom: 'ชิ้น' },
    { name: 'สะโพกติดน่อง', price: 55, uom: 'ชิ้น' },
    { name: 'อกไก่สไปร์ซี่', price: 25, uom: 'ชิ้น' },
    { name: 'สะโพกไก่ไร้กระดูก', price: 35, uom: 'ชิ้น' },
    { name: 'ชีสบอล', price: 10, uom: 'ชิ้น' },
    { name: 'ชีสสติ๊ก', price: 15, uom: 'ชิ้น' },
    { name: 'นักเก็ต', price: 5, uom: 'ชิ้น' },
    { name: 'นักเก็ตลาวา', price: 7, uom: 'ชิ้น' }
  ];

  for (const mItem of branch3ExtraItems) {
    const existingM = await client.execute({
      sql: "SELECT id FROM menu_items WHERE branch_id = 3 AND name = ? LIMIT 1",
      args: [mItem.name]
    });
    if (existingM.rows.length === 0) {
      console.log(`Adding ${mItem.name} to Branch 3 menu_items...`);
      await client.execute({
        sql: `INSERT INTO menu_items (branch_id, category_id, name, price, uom, quantity, raw_quantity, active, created_at, updated_at)
              VALUES (3, ?, ?, ?, ?, 0, 0, 1, datetime('now', '+7 hours'), datetime('now', '+7 hours'))`,
        args: [chickenCatId, mItem.name, mItem.price, mItem.uom]
      });
    }
  }

  // Final check
  const allCK = await client.execute("SELECT id, name, category, unit, cost_price, quantity, pack_size, linked_menu_item_name, target_stock_type FROM central_kitchen_items ORDER BY id ASC");
  console.log(`Successfully verified ${allCK.rows.length} items in central_kitchen_items:`);
  console.table(allCK.rows);

  process.exit(0);
}

seedItems().catch(err => {
  console.error('Error seeding items:', err);
  process.exit(1);
});
