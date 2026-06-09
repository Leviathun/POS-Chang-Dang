require('dotenv').config({ path: '../.env' });
const { getDb } = require('./config/database');

async function migrate() {
  const db = getDb();
  try {
    console.log('Detecting tables with orders_old references...');
    const brokenTables = await db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND (sql LIKE '%orders_old%' OR sql LIKE '%\"orders_old\"%')"
    ).all();
    
    if (brokenTables.length > 0) {
      console.log(`Found ${brokenTables.length} tables with broken references:`, brokenTables.map(t => t.name));
      
      await db.exec("PRAGMA foreign_keys=OFF");
      
      for (const tbl of brokenTables) {
        const tblName = tbl.name;
        console.log(`Fixing table ${tblName}...`);
        
        await db.exec(`ALTER TABLE ${tblName} RENAME TO ${tblName}_old`);
        
        if (tblName === 'order_items') {
          await db.exec(`CREATE TABLE order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            menu_item_id INTEGER REFERENCES menu_items(id),
            item_name TEXT NOT NULL,
            item_price REAL NOT NULL,
            quantity INTEGER NOT NULL,
            subtotal REAL NOT NULL
          )`);
          await db.exec(`INSERT INTO order_items (id, order_id, menu_item_id, item_name, item_price, quantity, subtotal)
            SELECT id, order_id, menu_item_id, item_name, item_price, quantity, subtotal FROM order_items_old`);
            
        } else if (tblName === 'stock_logs') {
          await db.exec(`CREATE TABLE stock_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            branch_id INTEGER REFERENCES branches(id),
            menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
            change_qty INTEGER NOT NULL,
            previous_stock INTEGER,
            new_stock INTEGER,
            reason TEXT CHECK(reason IN ('sale', 'restock', 'adjustment', 'waste', 'cancel_restore', 'staff_benefit')),
            order_id INTEGER REFERENCES orders(id),
            staff_id INTEGER REFERENCES users(id),
            note TEXT,
            created_at DATETIME DEFAULT (datetime('now', 'localtime'))
          )`);
          await db.exec(`INSERT INTO stock_logs (id, branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, order_id, staff_id, note, created_at)
            SELECT id, branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, order_id, staff_id, note, created_at FROM stock_logs_old`);
            
        } else if (tblName === 'free_modifier_stock_logs') {
          await db.exec(`CREATE TABLE free_modifier_stock_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            branch_id INTEGER REFERENCES branches(id),
            modifier_id INTEGER NOT NULL REFERENCES free_modifiers(id),
            change_qty INTEGER NOT NULL,
            previous_stock INTEGER,
            new_stock INTEGER,
            reason TEXT CHECK(reason IN ('sale', 'restock', 'adjustment', 'cancel_restore')),
            order_id INTEGER REFERENCES orders(id),
            staff_id INTEGER REFERENCES users(id),
            note TEXT,
            created_at DATETIME DEFAULT (datetime('now', 'localtime'))
          )`);
          await db.exec(`INSERT INTO free_modifier_stock_logs (id, branch_id, modifier_id, change_qty, previous_stock, new_stock, reason, order_id, staff_id, note, created_at)
            SELECT id, branch_id, modifier_id, change_qty, previous_stock, new_stock, reason, order_id, staff_id, note, created_at FROM free_modifier_stock_logs_old`);
        }
        
        await db.exec(`DROP TABLE ${tblName}_old`);
        console.log(`Table ${tblName} fixed successfully.`);
      }
      
      await db.exec("PRAGMA foreign_keys=ON");
      console.log('Migration completed successfully.');
    } else {
      console.log('No broken tables found.');
    }
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

migrate();
