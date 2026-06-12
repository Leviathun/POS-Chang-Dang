const { createClient } = require('@libsql/client');
const { AsyncLocalStorage } = require('async_hooks');
const path = require('path');
const fs = require('fs');

const transactionStorage = new AsyncLocalStorage();

// Statement wrapper mimicking better-sqlite3 Statement class asynchronously
class Statement {
  constructor(dbMock, sql) {
    this.dbMock = dbMock;
    this.sql = sql;
  }

  async all(...params) {
    let args = params;
    if (params.length === 1 && Array.isArray(params[0])) {
      args = params[0];
    }
    const res = await this.dbMock.execute({ sql: this.sql, args });
    return res.rows;
  }

  async get(...params) {
    let args = params;
    if (params.length === 1 && Array.isArray(params[0])) {
      args = params[0];
    }
    const res = await this.dbMock.execute({ sql: this.sql, args });
    return res.rows[0] || null;
  }

  async run(...params) {
    let args = params;
    if (params.length === 1 && Array.isArray(params[0])) {
      args = params[0];
    }
    const res = await this.dbMock.execute({ sql: this.sql, args });
    return {
      lastInsertRowid: res.lastInsertRowid !== undefined && res.lastInsertRowid !== null ? Number(res.lastInsertRowid) : null,
      changes: Number(res.rowsAffected || 0)
    };
  }
}

// Database wrapper mimicking better-sqlite3 Database class asynchronously using @libsql/client
class DatabaseMock {
  constructor(client) {
    this.client = client;
  }

  prepare(sql) {
    // Automatically replace 'localtime' with '+7 hours' to force Thailand timezone (UTC+7)
    // on cloud-hosted environments (e.g. Turso / Vercel) where host localtime is UTC.
    const cleanSql = sql.replace(/'localtime'/g, "'+7 hours'");
    return new Statement(this, cleanSql);
  }

  async execute({ sql, args }) {
    const tx = transactionStorage.getStore();
    const activeClient = tx || this.client;
    const cleanSql = sql.replace(/'localtime'/g, "'+7 hours'");
    return activeClient.execute({ sql: cleanSql, args });
  }

  async exec(sql) {
    const tx = transactionStorage.getStore();
    const activeClient = tx || this.client;
    const cleanSql = sql.replace(/'localtime'/g, "'+7 hours'");
    await activeClient.execute(cleanSql);
  }

  transaction(fn) {
    return async (...args) => {
      const tx = await this.client.transaction("write");
      try {
        const result = await transactionStorage.run(tx, async () => {
          return await fn(...args);
        });
        await tx.commit();
        return result;
      } catch (e) {
        await tx.rollback();
        throw e;
      }
    };
  }
}

let dbInstance;

/**
 * Get database instance (singleton)
 */
function getDb() {
  if (!dbInstance) {
    const dbUrl = process.env.TURSO_DATABASE_URL;
    const dbToken = process.env.TURSO_AUTH_TOKEN;

    let client;
    if (dbUrl) {
      console.log('  🗄️  Connecting to Turso Cloud DB:', dbUrl);
      client = createClient({
        url: dbUrl,
        authToken: dbToken
      });
    } else {
      // Local fallback using a local SQLite file via @libsql/client
      const dbPath = path.join(__dirname, '..', '..', 'data', 'pos.db');
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      console.log('  🗄️  Connecting to Local SQLite DB:', `file:${dbPath}`);
      client = createClient({
        url: `file:${dbPath}`
      });
    }
    dbInstance = new DatabaseMock(client);
  }
  return dbInstance;
}

/**
 * Initialize database schema and seed data
 */
async function initDatabase() {
  const db = getDb();

  // 1. Ensure branches table and default branch exist first (to support Foreign Key constraints)
  await db.exec(`CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    address TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT (datetime('now', 'localtime'))
  )`);

  const branchCount = await db.prepare('SELECT COUNT(*) as count FROM branches').get();
  if (branchCount.count === 0) {
    await db.prepare('INSERT INTO branches (name, address) VALUES (?, ?)')
      .run('สาขาหลัก (ช้างแดง)', 'กรุงเทพฯ');
    console.log('  🏪 สร้างสาขาเริ่มต้น: สาขาหลัก (ช้างแดง)');
  }
  const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
  const defaultBranchId = defaultBranch ? defaultBranch.id : 1;

  // 2. RUN SCHEMA MIGRATIONS (Adding branch_id to existing tables)
  // Check categories
  let needsCategoriesMig = false;
  try {
    const tableInfo = await db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='categories'").get();
    if (tableInfo && tableInfo.sql && !tableInfo.sql.includes('branch_id')) {
      needsCategoriesMig = true;
    }
  } catch (e) {}

  if (needsCategoriesMig) {
    console.log('  🔧 Migration: เริ่มปรับปรุงโครงสร้างตาราง categories...');
    await db.exec("PRAGMA foreign_keys=OFF");
    try {
      await db.exec("DROP TABLE IF EXISTS categories_old");
      await db.exec("ALTER TABLE categories RENAME TO categories_old");
      await db.exec(`CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        UNIQUE(branch_id, name)
      )`);
      await db.prepare(`INSERT INTO categories (id, branch_id, name, sort_order, active)
        SELECT id, ?, name, sort_order, active FROM categories_old`).run(defaultBranchId);
      await db.exec("DROP TABLE categories_old");
      console.log('  ✅ Migration: ปรับปรุงโครงสร้างตาราง categories สำเร็จ');
    } catch (err) {
      console.error('  ⚠️ Migration categories error:', err.message);
    } finally {
      await db.exec("PRAGMA foreign_keys=ON");
    }
  }

  // Check menu_items
  let needsMenuItemsMig = false;
  try {
    const tableInfo = await db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='menu_items'").get();
    if (tableInfo && tableInfo.sql && !tableInfo.sql.includes('branch_id')) {
      needsMenuItemsMig = true;
    }
  } catch (e) {}

  if (needsMenuItemsMig) {
    console.log('  🔧 Migration: เริ่มปรับปรุงโครงสร้างตาราง menu_items...');
    await db.exec("PRAGMA foreign_keys=OFF");
    try {
      await db.exec("DROP TABLE IF EXISTS menu_items_old");
      await db.exec("ALTER TABLE menu_items RENAME TO menu_items_old");
      await db.exec(`CREATE TABLE menu_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        image_url TEXT,
        active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        uom TEXT DEFAULT 'ชิ้น',
        multiple_prices TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT (datetime('now', 'localtime')),
        updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
      )`);
      await db.prepare(`INSERT INTO menu_items (id, branch_id, name, price, category_id, image_url, active, sort_order, uom, multiple_prices, created_at, updated_at)
        SELECT id, ?, name, price, category_id, image_url, active, sort_order, uom, multiple_prices, created_at, updated_at FROM menu_items_old`).run(defaultBranchId);
      await db.exec("DROP TABLE menu_items_old");
      console.log('  ✅ Migration: ปรับปรุงโครงสร้างตาราง menu_items สำเร็จ');
    } catch (err) {
      console.error('  ⚠️ Migration menu_items error:', err.message);
    } finally {
      await db.exec("PRAGMA foreign_keys=ON");
    }
  }

  // Check settings
  let needsSettingsMig = false;
  try {
    const tableInfo = await db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='settings'").get();
    if (tableInfo && tableInfo.sql && !tableInfo.sql.includes('branch_id')) {
      needsSettingsMig = true;
    }
  } catch (e) {}

  if (needsSettingsMig) {
    console.log('  🔧 Migration: เริ่มปรับปรุงโครงสร้างตาราง settings...');
    await db.exec("PRAGMA foreign_keys=OFF");
    try {
      await db.exec("DROP TABLE IF EXISTS settings_old");
      await db.exec("ALTER TABLE settings RENAME TO settings_old");
      await db.exec(`CREATE TABLE settings (
        branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        value TEXT,
        updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
        PRIMARY KEY (branch_id, key)
      )`);
      await db.prepare(`INSERT INTO settings (branch_id, key, value, updated_at)
        SELECT ?, key, value, updated_at FROM settings_old`).run(defaultBranchId);
      await db.exec("DROP TABLE settings_old");
      console.log('  ✅ Migration: ปรับปรุงโครงสร้างตาราง settings สำเร็จ');
    } catch (err) {
      console.error('  ⚠️ Migration settings error:', err.message);
    } finally {
      await db.exec("PRAGMA foreign_keys=ON");
    }
  }

  // Check free_modifiers
  let needsModifiersMig = false;
  try {
    const tableInfo = await db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='free_modifiers'").get();
    if (tableInfo && tableInfo.sql && !tableInfo.sql.includes('branch_id')) {
      needsModifiersMig = true;
    }
  } catch (e) {}

  if (needsModifiersMig) {
    console.log('  🔧 Migration: เริ่มปรับปรุงโครงสร้างตาราง free_modifiers...');
    await db.exec("PRAGMA foreign_keys=OFF");
    try {
      await db.exec("DROP TABLE IF EXISTS free_modifiers_old");
      await db.exec("ALTER TABLE free_modifiers RENAME TO free_modifiers_old");
      await db.exec(`CREATE TABLE free_modifiers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('sauce_small', 'sauce_large', 'dipping', 'powder')),
        servings_per_bag INTEGER DEFAULT 50,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT (datetime('now', 'localtime')),
        UNIQUE(branch_id, name)
      )`);
      await db.prepare(`INSERT INTO free_modifiers (id, branch_id, name, category, servings_per_bag, active, created_at)
        SELECT id, ?, name, category, servings_per_bag, active, created_at FROM free_modifiers_old`).run(defaultBranchId);
      await db.exec("DROP TABLE free_modifiers_old");
      console.log('  ✅ Migration: ปรับปรุงโครงสร้างตาราง free_modifiers สำเร็จ');
    } catch (err) {
      console.error('  ⚠️ Migration free_modifiers error:', err.message);
    } finally {
      await db.exec("PRAGMA foreign_keys=ON");
    }
  }

  // Check free_modifier_presets
  let needsPresetsMig = false;
  try {
    const tableInfo = await db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='free_modifier_presets'").get();
    if (tableInfo && tableInfo.sql && !tableInfo.sql.includes('branch_id')) {
      needsPresetsMig = true;
    }
  } catch (e) {}

  if (needsPresetsMig) {
    console.log('  🔧 Migration: เริ่มปรับปรุงโครงสร้างตาราง free_modifier_presets...');
    await db.exec("PRAGMA foreign_keys=OFF");
    try {
      await db.exec("DROP TABLE IF EXISTS free_modifier_presets_old");
      await db.exec("ALTER TABLE free_modifier_presets RENAME TO free_modifier_presets_old");
      await db.exec(`CREATE TABLE free_modifier_presets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        modifier_ids TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT (datetime('now', 'localtime')),
        UNIQUE(branch_id, name)
      )`);
      await db.prepare(`INSERT INTO free_modifier_presets (id, branch_id, name, modifier_ids, active, created_at)
        SELECT id, ?, name, modifier_ids, active, created_at FROM free_modifier_presets_old`).run(defaultBranchId);
      await db.exec("DROP TABLE free_modifier_presets_old");
      console.log('  ✅ Migration: ปรับปรุงโครงสร้างตาราง free_modifier_presets สำเร็จ');
    } catch (err) {
      console.error('  ⚠️ Migration free_modifier_presets error:', err.message);
    } finally {
      await db.exec("PRAGMA foreign_keys=ON");
    }
  }

  // ─── Create Tables (Multi-Branch Enabled) ─────────────────
  const tables = [
    `CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      address TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER REFERENCES branches(id),
      name TEXT NOT NULL,
      pin TEXT NOT NULL,
      role TEXT DEFAULT 'staff' CHECK(role IN ('admin', 'staff')),
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      UNIQUE(branch_id, name)
    )`,
    `CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      image_url TEXT,
      active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      uom TEXT DEFAULT 'ชิ้น',
      multiple_prices TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS branch_stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
      quantity INTEGER DEFAULT NULL, -- NULL = Unlimited
      raw_quantity INTEGER DEFAULT NULL, -- NULL = Unlimited
      price REAL DEFAULT NULL,
      multiple_prices TEXT DEFAULT NULL,
      updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
      UNIQUE(branch_id, menu_item_id)
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER REFERENCES branches(id),
      order_number TEXT UNIQUE NOT NULL,
      staff_id INTEGER REFERENCES users(id),
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0,
      total REAL NOT NULL,
      payment_method TEXT CHECK(payment_method IN ('cash', 'qr', 'gov')),
      cash_received REAL,
      cash_change REAL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
      note TEXT,
      cancel_reason TEXT,
      free_modifiers TEXT,
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      menu_item_id INTEGER REFERENCES menu_items(id),
      item_name TEXT NOT NULL,
      item_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      options TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS stock_logs (
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
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value TEXT,
      updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
      PRIMARY KEY (branch_id, key)
    )`,
    `CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER REFERENCES branches(id),
      staff_id INTEGER REFERENCES users(id),
      amount REAL NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('raw_materials', 'gas_fuel', 'packaging', 'other')),
      note TEXT,
      expense_date DATE DEFAULT (date('now', 'localtime')),
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER REFERENCES branches(id),
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS free_modifiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('sauce_small', 'sauce_large', 'dipping', 'powder')),
      servings_per_bag INTEGER DEFAULT 50,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      UNIQUE(branch_id, name)
    )`,
    `CREATE TABLE IF NOT EXISTS branch_free_modifier_stocks (
      branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      modifier_id INTEGER NOT NULL REFERENCES free_modifiers(id) ON DELETE CASCADE,
      total_servings INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
      PRIMARY KEY (branch_id, modifier_id)
    )`,
    `CREATE TABLE IF NOT EXISTS free_modifier_stock_logs (
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
    )`,
    `CREATE TABLE IF NOT EXISTS free_modifier_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      modifier_ids TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      UNIQUE(branch_id, name)
    )`,
    `CREATE TABLE IF NOT EXISTS archived_orders (
      id INTEGER PRIMARY KEY,
      branch_id INTEGER,
      order_number TEXT UNIQUE NOT NULL,
      staff_id INTEGER,
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0,
      total REAL NOT NULL,
      payment_method TEXT,
      cash_received REAL,
      cash_change REAL,
      status TEXT,
      note TEXT,
      cancel_reason TEXT,
      free_modifiers TEXT,
      created_at DATETIME
    )`,
    `CREATE TABLE IF NOT EXISTS archived_order_items (
      id INTEGER PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES archived_orders(id) ON DELETE CASCADE,
      menu_item_id INTEGER,
      item_name TEXT NOT NULL,
      item_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      options TEXT
    )`
  ];

  for (const table of tables) {
    await db.exec(table);
  }

  // Add cancel_reason column to orders if not exists (SQLite-friendly ALTER TABLE)
  try {
    await db.exec("ALTER TABLE orders ADD COLUMN cancel_reason TEXT");
  } catch (e) {
    // Column already exists, safe to ignore
  }

  // Add raw_quantity column to branch_stocks if not exists (SQLite-friendly ALTER TABLE)
  try {
    await db.exec("ALTER TABLE branch_stocks ADD COLUMN raw_quantity INTEGER DEFAULT NULL");
  } catch (e) {
    // Column already exists, safe to ignore
  }

  // Add price column to branch_stocks if not exists (SQLite-friendly ALTER TABLE)
  try {
    await db.exec("ALTER TABLE branch_stocks ADD COLUMN price REAL DEFAULT NULL");
  } catch (e) {
    // Column already exists, safe to ignore
  }

  // Add free_modifiers column to orders if not exists (SQLite-friendly ALTER TABLE)
  try {
    await db.exec("ALTER TABLE orders ADD COLUMN free_modifiers TEXT");
  } catch (e) {
    // Column already exists, safe to ignore
  }

  // Add uom column to menu_items if not exists (SQLite-friendly ALTER TABLE)
  try {
    await db.exec("ALTER TABLE menu_items ADD COLUMN uom TEXT DEFAULT 'ชิ้น'");
  } catch (e) {
    // Column already exists, safe to ignore
  }

  // Add options column to order_items if not exists (SQLite-friendly ALTER TABLE)
  try {
    await db.exec("ALTER TABLE order_items ADD COLUMN options TEXT");
  } catch (e) {
    // Column already exists, safe to ignore
  }

  // Add options column to archived_order_items if not exists (SQLite-friendly ALTER TABLE)
  try {
    await db.exec("ALTER TABLE archived_order_items ADD COLUMN options TEXT");
  } catch (e) {
    // Column already exists, safe to ignore
  }

  // Add multiple_prices column to menu_items if not exists (SQLite-friendly ALTER TABLE)
  try {
    await db.exec("ALTER TABLE menu_items ADD COLUMN multiple_prices TEXT DEFAULT NULL");
  } catch (e) {
    // Column already exists, safe to ignore
  }

  // Add multiple_prices column to branch_stocks if not exists (SQLite-friendly ALTER TABLE)
  try {
    await db.exec("ALTER TABLE branch_stocks ADD COLUMN multiple_prices TEXT DEFAULT NULL");
  } catch (e) {
    // Column already exists, safe to ignore
  }

  // Migration: ปรับปรุงโครงสร้างตาราง orders เพื่อรองรับ payment_method: gov
  try {
    const tableInfo = await db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='orders'").get();
    if (tableInfo && tableInfo.sql && !tableInfo.sql.includes("'gov'")) {
      console.log('  🔧 Migration: เริ่มปรับปรุงโครงสร้างตาราง orders เพื่อรองรับ payment_method: gov...');
      
      await db.exec("PRAGMA foreign_keys=OFF");
      
      // Rename old table
      await db.exec("ALTER TABLE orders RENAME TO orders_old");
      
      // Create new table with updated check constraint
      await db.exec(`CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_id INTEGER REFERENCES branches(id),
        order_number TEXT UNIQUE NOT NULL,
        staff_id INTEGER REFERENCES users(id),
        subtotal REAL NOT NULL,
        discount REAL DEFAULT 0,
        total REAL NOT NULL,
        payment_method TEXT CHECK(payment_method IN ('cash', 'qr', 'gov')),
        cash_received REAL,
        cash_change REAL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
        note TEXT,
        cancel_reason TEXT,
        free_modifiers TEXT,
        created_at DATETIME DEFAULT (datetime('now', 'localtime'))
      )`);
      
      // Copy data from old table
      await db.exec(`INSERT INTO orders (id, branch_id, order_number, staff_id, subtotal, discount, total, payment_method, cash_received, cash_change, status, note, cancel_reason, free_modifiers, created_at)
        SELECT id, branch_id, order_number, staff_id, subtotal, discount, total, payment_method, cash_received, cash_change, status, note, cancel_reason, free_modifiers, created_at 
        FROM orders_old`);
      
      // Drop old table
      await db.exec("DROP TABLE orders_old");
      
      await db.exec("PRAGMA foreign_keys=ON");
      
      console.log('  ✅ Migration: ปรับปรุงโครงสร้างตาราง orders สำเร็จ');
    }
  } catch (e) {
    console.warn('⚠️ Migration orders table error:', e.message);
  }

  // Migration: ซ่อมแซม Foreign Key ที่เสียหายจากการเปลี่ยนชื่อตารางใน SQLite (เช่น ชี้ไปยังตาราง _old)
  try {
    const brokenTables = await db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND (sql LIKE '%_old%' OR sql LIKE '%\"_old\"%')"
    ).all();
    
    if (brokenTables.length > 0) {
      console.log(`  🔧 Migration: พบ ${brokenTables.length} ตารางที่มี foreign key เสียหาย (อ้างอิงตาราง _old):`, brokenTables.map(t => t.name));
      
      await db.exec("PRAGMA foreign_keys=OFF");
      
      for (const tbl of brokenTables) {
        const tblName = tbl.name;
        console.log(`  🔧 Migration: กำลังซ่อมแซมตาราง ${tblName}...`);
        
        await db.exec(`DROP TABLE IF EXISTS ${tblName}_temp_old`);
        await db.exec(`ALTER TABLE ${tblName} RENAME TO ${tblName}_temp_old`);
        
        if (tblName === 'branch_stocks') {
          await db.exec(`CREATE TABLE branch_stocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
            menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
            quantity INTEGER DEFAULT NULL,
            raw_quantity INTEGER DEFAULT NULL,
            price REAL DEFAULT NULL,
            multiple_prices TEXT DEFAULT NULL,
            updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
            UNIQUE(branch_id, menu_item_id)
          )`);
          await db.exec(`INSERT INTO branch_stocks (id, branch_id, menu_item_id, quantity, raw_quantity, price, multiple_prices, updated_at)
            SELECT id, branch_id, menu_item_id, quantity, raw_quantity, price, multiple_prices, updated_at FROM branch_stocks_temp_old`);
            
        } else if (tblName === 'branch_free_modifier_stocks') {
          await db.exec(`CREATE TABLE branch_free_modifier_stocks (
            branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
            modifier_id INTEGER NOT NULL REFERENCES free_modifiers(id) ON DELETE CASCADE,
            total_servings INTEGER DEFAULT 0,
            updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
            PRIMARY KEY (branch_id, modifier_id)
          )`);
          await db.exec(`INSERT INTO branch_free_modifier_stocks (branch_id, modifier_id, total_servings, updated_at)
            SELECT branch_id, modifier_id, total_servings, updated_at FROM branch_free_modifier_stocks_temp_old`);
            
        } else if (tblName === 'order_items') {
          await db.exec(`CREATE TABLE order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            menu_item_id INTEGER REFERENCES menu_items(id),
            item_name TEXT NOT NULL,
            item_price REAL NOT NULL,
            quantity INTEGER NOT NULL,
            subtotal REAL NOT NULL,
            options TEXT
          )`);
          await db.exec(`INSERT INTO order_items (id, order_id, menu_item_id, item_name, item_price, quantity, subtotal, options)
            SELECT id, order_id, menu_item_id, item_name, item_price, quantity, subtotal, options FROM order_items_temp_old`);
            
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
            SELECT id, branch_id, menu_item_id, change_qty, previous_stock, new_stock, reason, order_id, staff_id, note, created_at FROM stock_logs_temp_old`);
            
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
            SELECT id, branch_id, modifier_id, change_qty, previous_stock, new_stock, reason, order_id, staff_id, note, created_at FROM free_modifier_stock_logs_temp_old`);
        }
        
        await db.exec(`DROP TABLE ${tblName}_temp_old`);
        console.log(`  ✅ Migration: ซ่อมแซมตาราง ${tblName} สำเร็จ`);
      }
      
      await db.exec("PRAGMA foreign_keys=ON");
      console.log('  ✅ Migration: ซ่อมแซม Foreign Key ทั้งหมดสำเร็จ');
    }
  } catch (err) {
    console.warn('⚠️ Migration foreign keys repair error:', err.message);
  }

  // Migration: Fix users with NULL branch_id — assign to first branch
  try {
    const firstBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();
    if (firstBranch) {
      const updated = await db.prepare(
        'UPDATE users SET branch_id = ? WHERE branch_id IS NULL'
      ).run(firstBranch.id);
      if (updated.changes > 0) {
        console.log(`  🔧 Migration: อัปเดต ${updated.changes} ผู้ใช้ที่ยังไม่มีสาขา → สาขา ID ${firstBranch.id}`);
      }
    }
  } catch (e) {
    console.warn('⚠️ Migration fix branch_id:', e.message);
  }

  // Migration: Fix branch_stocks with NULL quantity — set to 0
  try {
    const updated = await db.prepare(
      'UPDATE branch_stocks SET quantity = 0 WHERE quantity IS NULL'
    ).run();
    if (updated.changes > 0) {
      console.log(`  🔧 Migration: อัปเดตสต็อก ${updated.changes} รายการที่มีค่า NULL → 0`);
    }
  } catch (e) {
    console.warn('⚠️ Migration fix branch_stocks quantity:', e.message);
  }

  // ─── Create Indexes ───────────────────────────────────────
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_orders_branch ON orders(branch_id)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`,
    `CREATE INDEX IF NOT EXISTS idx_branch_stocks ON branch_stocks(branch_id, menu_item_id)`,
    `CREATE INDEX IF NOT EXISTS idx_stock_logs_branch ON stock_logs(branch_id)`
  ];

  for (const index of indexes) {
    await db.exec(index);
  }

  // ─── Seed Default Data ────────────────────────────────────
  // Seed default users
  const userCount = await db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    await db.prepare('INSERT INTO users (name, pin, role, branch_id) VALUES (?, ?, ?, ?)')
      .run('เจ้าของร้าน', '1234', 'admin', defaultBranchId);
    await db.prepare('INSERT INTO users (name, pin, role, branch_id) VALUES (?, ?, ?, ?)')
      .run('พนักงาน 1', '0000', 'staff', defaultBranchId);
    console.log('  👤 สร้างผู้ใช้เริ่มต้น: เจ้าของร้าน (PIN: 1234), พนักงาน 1 (PIN: 0000)');
  }

  // Seed default categories per branch
  const branches = await db.prepare('SELECT id FROM branches').all();

  for (const b of branches) {
    const catCount = await db.prepare('SELECT COUNT(*) as count FROM categories WHERE branch_id = ?').get(b.id);
    if (catCount.count === 0) {
      const insertCat = db.prepare('INSERT INTO categories (branch_id, name, sort_order) VALUES (?, ?, ?)');
      await insertCat.run(b.id, 'เมนูหลัก', 1);
      await insertCat.run(b.id, 'ของทานเล่น', 2);
      await insertCat.run(b.id, 'เครื่องดื่ม', 3);
      await insertCat.run(b.id, 'อื่นๆ', 4);
    }
  }

  // Ensure promptpay_id is completely removed from database settings table
  try {
    await db.prepare("DELETE FROM settings WHERE key = 'promptpay_id'").run();
  } catch (e) {
    // ignore
  }

  // Seed default settings per branch
  for (const b of branches) {
    const settingsCount = await db.prepare('SELECT COUNT(*) as count FROM settings WHERE branch_id = ?').get(b.id);
    if (settingsCount.count === 0) {
      const insertSetting = db.prepare('INSERT INTO settings (branch_id, key, value) VALUES (?, ?, ?)');
      await insertSetting.run(b.id, 'shop_name', process.env.SHOP_NAME || 'ร้านไก่ทอดช้างแดง');
      await insertSetting.run(b.id, 'daily_report_time', '21:00');
      await insertSetting.run(b.id, 'low_stock_threshold', '5');
    }
  }

  // Seed default free modifiers (Sync to make sure no items are missing)
  const defaultModifiers = [
    { name: 'ซอสมะเขือเทศ (ซอง)', category: 'sauce_small', servings: 1, active: 1 },
    { name: 'ซอสพริก (ซอง)', category: 'sauce_small', servings: 1, active: 1 },
    { name: 'ซอสมะเขือเทศ (ถุง)', category: 'sauce_large', servings: 50, active: 1 },
    { name: 'ซอสพริก (ถุง)', category: 'sauce_large', servings: 50, active: 1 },
    { name: 'ซอสมะยองเนส (ถุง)', category: 'sauce_large', servings: 50, active: 1 },
    { name: 'ซอสชีสดิป (ถุง)', category: 'sauce_large', servings: 50, active: 1 },
    { name: 'น้ำจิ้มพริกคั่วมะขาม', category: 'dipping', servings: 50, active: 1 },
    { name: 'น้ำจิ้มเผ็ดถั่วโบราณ', category: 'dipping', servings: 50, active: 0 },
    { name: 'น้ำจิ้มหวานถั่วโบราณ', category: 'dipping', servings: 50, active: 0 },
    { name: 'ผงชีส', category: 'powder', servings: 50, active: 1 },
    { name: 'ผงบาร์บีคิว', category: 'powder', servings: 50, active: 1 },
    { name: 'ผงหม่าล่า', category: 'powder', servings: 50, active: 1 },
    { name: 'ผงฮอตแอนด์สไปซี่', category: 'powder', servings: 50, active: 1 },
    { name: 'ผงวิงส์แซ่บ', category: 'powder', servings: 50, active: 1 },
    { name: 'ผงปาปริก้า', category: 'powder', servings: 50, active: 1 },
    { name: 'ซอสเปรี้ยว (ขวด)', category: 'dipping', servings: 60, active: 1 },
    { name: 'ซอสหวาน (ขวด)', category: 'dipping', servings: 60, active: 1 },
    { name: 'กระเทียมเจียว (ถุง)', category: 'dipping', servings: 50, active: 1 }
  ];

  let seededCount = 0;
  for (const b of branches) {
    for (const m of defaultModifiers) {
      const existing = await db.prepare('SELECT id FROM free_modifiers WHERE branch_id = ? AND name = ?').get(b.id, m.name);
      if (!existing) {
        await db.prepare('INSERT INTO free_modifiers (branch_id, name, category, servings_per_bag, active) VALUES (?, ?, ?, ?, ?)')
          .run(b.id, m.name, m.category, m.servings, m.active);
        seededCount++;
      }
    }
  }
  if (seededCount > 0) {
    console.log(`  🧂 สร้างตัวเลือกซอส/ผง/น้ำจิ้มเริ่มต้นเพิ่มเติมสำเร็จ (${seededCount} รายการ)`);
  }

  // Seed branch Stocks for free modifiers
  const modifiers = await db.prepare('SELECT id, branch_id FROM free_modifiers').all();
  const insertModStock = db.prepare(`
    INSERT OR IGNORE INTO branch_free_modifier_stocks (branch_id, modifier_id, total_servings)
    VALUES (?, ?, 0)
  `);
  for (const m of modifiers) {
    await insertModStock.run(m.branch_id, m.id);
  }

  // Seed default presets (สูตรสำเร็จ) per branch
  for (const b of branches) {
    const presetCount = await db.prepare('SELECT COUNT(*) as count FROM free_modifier_presets WHERE branch_id = ?').get(b.id);
    if (presetCount.count === 0) {
      const tomatoBag = await db.prepare("SELECT id FROM free_modifiers WHERE branch_id = ? AND name = 'ซอสมะเขือเทศ (ถุง)'").get(b.id);
      const cheesePowder = await db.prepare("SELECT id FROM free_modifiers WHERE branch_id = ? AND name = 'ผงชีส'").get(b.id);
      if (tomatoBag && cheesePowder) {
        await db.prepare('INSERT INTO free_modifier_presets (branch_id, name, modifier_ids) VALUES (?, ?, ?)')
          .run(b.id, 'มะเขือเทศ + ผงชีส', JSON.stringify([tomatoBag.id, cheesePowder.id]));
        console.log(`  ✨ สร้างสูตรสำเร็จเริ่มต้น (มะเขือเทศ + ผงชีส) สำหรับสาขา ID ${b.id} สำเร็จ`);
      }
    }
  }

  // Migration: ปรับเวลาของข้อมูลประวัติเดิมที่มีอยู่แล้วให้เป็นเวลาไทย (UTC+7)
  // เนื่องจากก่อนหน้านี้เก็บเวลาตามเขตเวลาเซิร์ฟเวอร์คลาวด์ที่เป็น UTC
  try {
    const migrationDone = await db.prepare("SELECT value FROM settings WHERE key = 'timezone_migration_v2'").get();
    if (!migrationDone) {
      console.log('  🔧 Migration: เริ่มต้นปรับปรุงประวัติเวลาเดิมให้เป็นเวลาไทย (UTC+7)...');
      
      const tablesToUpdate = [
        { name: 'branches', cols: ['created_at'] },
        { name: 'users', cols: ['created_at'] },
        { name: 'menu_items', cols: ['created_at', 'updated_at'] },
        { name: 'branch_stocks', cols: ['updated_at'] },
        { name: 'orders', cols: ['created_at'] },
        { name: 'stock_logs', cols: ['created_at'] },
        { name: 'settings', cols: ['updated_at'] },
        { name: 'expenses', cols: ['created_at'] },
        { name: 'activity_logs', cols: ['created_at'] },
        { name: 'free_modifiers', cols: ['created_at'] },
        { name: 'branch_free_modifier_stocks', cols: ['updated_at'] },
        { name: 'free_modifier_stock_logs', cols: ['created_at'] },
        { name: 'free_modifier_presets', cols: ['created_at'] }
      ];

      for (const t of tablesToUpdate) {
        for (const col of t.cols) {
          try {
            await db.exec(`UPDATE ${t.name} SET ${col} = datetime(${col}, '+7 hours') WHERE ${col} IS NOT NULL`);
          } catch (e) {
            console.warn(`  ⚠️ ไม่สามารถปรับเวลาตาราง ${t.name} คอลัมน์ ${col}:`, e.message);
          }
        }
      }
      
      await db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('timezone_migration_v2', 'done')").run();
      console.log('  ✅ Migration: ปรับปรุงประวัติเวลาเดิมเสร็จสมบูรณ์');
    }
  } catch (e) {
    console.warn('⚠️ Migration timezone_migration_v2 error:', e.message);
  }

  // Migration: ปรับข้อมูลหน่วยนับสินค้า (uom) เริ่มต้น
  try {
    const migrationDone = await db.prepare("SELECT value FROM settings WHERE key = 'uom_initial_migration'").get();
    if (!migrationDone) {
      console.log('  🔧 Migration: เริ่มต้นตั้งค่าหน่วยนับสินค้าเริ่มต้น...');
      
      // 1. ปรับ ขนมจีบหมู ให้เป็นหน่วย 'ไม้'
      await db.prepare("UPDATE menu_items SET uom = 'ไม้' WHERE name = 'ขนมจีบหมู'").run();
      
      // 2. ปรับสินค้ากลุ่มสามกรอบ ให้เป็นหน่วย 'กรัม'
      const samKrobCat = await db.prepare("SELECT id FROM categories WHERE name = 'สามกรอบ'").get();
      if (samKrobCat) {
        await db.prepare("UPDATE menu_items SET uom = 'กรัม' WHERE category_id = ?").run(samKrobCat.id);
      }
      
      await db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('uom_initial_migration', 'done')").run();
      console.log('  ✅ Migration: ปรับปรุงหน่วยนับเริ่มต้นสำเร็จ');
    }
  } catch (e) {
    console.warn('⚠️ Migration uom_initial_migration error:', e.message);
  }

  // Migration: ตั้งค่าหลายราคา (multiple_prices) สำหรับสินค้ากลุ่มสามกรอบเริ่มต้น
  try {
    const migrationDone = await db.prepare("SELECT value FROM settings WHERE key = 'multiple_prices_initial_migration'").get();
    if (!migrationDone) {
      console.log('  🔧 Migration: เริ่มต้นตั้งค่าหลายราคาสำหรับสินค้ากลุ่มสามกรอบ...');
      const samKrobCat = await db.prepare("SELECT id FROM categories WHERE name = 'สามกรอบ'").get();
      if (samKrobCat) {
        const defaultMultiplePrices = JSON.stringify({ S: 40, M: 50, L: 60 });
        await db.prepare("UPDATE menu_items SET multiple_prices = ? WHERE category_id = ?").run(defaultMultiplePrices, samKrobCat.id);
        await db.prepare("UPDATE branch_stocks SET multiple_prices = ? WHERE menu_item_id IN (SELECT id FROM menu_items WHERE category_id = ?)").run(defaultMultiplePrices, samKrobCat.id);
      }
      await db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('multiple_prices_initial_migration', 'done')").run();
      console.log('  ✅ Migration: ตั้งค่าหลายราคาเริ่มต้นสำเร็จ');
    }
  } catch (e) {
    console.warn('⚠️ Migration multiple_prices_initial_migration error:', e.message);
  }

  // Self-Healing: ตรวจสอบและสร้างข้อมูลสต็อกสาขาที่ขาดหายไปสำหรับ menu_items
  try {
    console.log('  🔧 Self-healing: ตรวจสอบและสร้างข้อมูลสต็อกสาขาที่ขาดหายไป...');
    const branches = await db.prepare("SELECT id FROM branches").all();
    const menuItems = await db.prepare("SELECT id, price FROM menu_items").all();
    
    for (const item of menuItems) {
      for (const branch of branches) {
        const stockExists = await db.prepare("SELECT 1 FROM branch_stocks WHERE branch_id = ? AND menu_item_id = ?").get(branch.id, item.id);
        if (!stockExists) {
          console.log(`    ➕ เพิ่มข้อมูลสต็อกสาขาที่ขาดหายไป: เมนู ID ${item.id} สาขา ID ${branch.id}`);
          await db.prepare(`
            INSERT INTO branch_stocks (branch_id, menu_item_id, quantity, raw_quantity, price, multiple_prices)
            VALUES (?, ?, 0, NULL, ?, (SELECT multiple_prices FROM menu_items WHERE id = ?))
          `).run(branch.id, item.id, item.price, item.id);
        }
      }
    }
    console.log('  ✅ Self-healing: ตรวจสอบและสร้างข้อมูลสต็อกสาขาเสร็จสมบูรณ์');
  } catch (e) {
    console.warn('⚠️ Self-healing branch stocks error:', e.message);
  }

  console.log('  ✅ Cloud/Local Database initialized');
}

/**
 * Generate order number: CD-YYYYMMDD-NNN
 */
async function generateOrderNumber() {
  const db = getDb();
  const today = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const dateStr = today.getUTCFullYear().toString() +
    String(today.getUTCMonth() + 1).padStart(2, '0') +
    String(today.getUTCDate()).padStart(2, '0');

  const prefix = `CD-${dateStr}-`;

  const result = await db.prepare(
    `SELECT COUNT(*) as count FROM orders 
     WHERE order_number LIKE ?`
  ).get(`${prefix}%`);

  const num = (result.count + 1).toString().padStart(3, '0');
  return `${prefix}${num}`;
}

module.exports = { getDb, initDatabase, generateOrderNumber };
