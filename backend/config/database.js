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
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      image_url TEXT,
      active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
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
      payment_method TEXT CHECK(payment_method IN ('cash', 'qr')),
      cash_received REAL,
      cash_change REAL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
      note TEXT,
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      menu_item_id INTEGER REFERENCES menu_items(id),
      item_name TEXT NOT NULL,
      item_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal REAL NOT NULL
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
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
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
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('sauce_small', 'sauce_large', 'dipping', 'powder')),
      servings_per_bag INTEGER DEFAULT 50,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
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
      name TEXT NOT NULL,
      modifier_ids TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
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
      subtotal REAL NOT NULL
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
  // Seed default branch
  const branchCount = await db.prepare('SELECT COUNT(*) as count FROM branches').get();
  if (branchCount.count === 0) {
    await db.prepare('INSERT INTO branches (name, address) VALUES (?, ?)')
      .run('สาขาหลัก (ช้างแดง)', 'กรุงเทพฯ');
    console.log('  🏪 สร้างสาขาเริ่มต้น: สาขาหลัก (ช้างแดง)');
  }
  const defaultBranch = await db.prepare('SELECT id FROM branches LIMIT 1').get();

  // Seed default users
  const userCount = await db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    await db.prepare('INSERT INTO users (name, pin, role, branch_id) VALUES (?, ?, ?, ?)')
      .run('เจ้าของร้าน', '1234', 'admin', defaultBranch.id);
    await db.prepare('INSERT INTO users (name, pin, role, branch_id) VALUES (?, ?, ?, ?)')
      .run('พนักงาน 1', '0000', 'staff', defaultBranch.id);
    console.log('  👤 สร้างผู้ใช้เริ่มต้น: เจ้าของร้าน (PIN: 1234), พนักงาน 1 (PIN: 0000)');
  }

  // Seed default categories
  const catCount = await db.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (catCount.count === 0) {
    const insertCat = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)');
    await insertCat.run('เมนูหลัก', 1);
    await insertCat.run('ของทานเล่น', 2);
    await insertCat.run('เครื่องดื่ม', 3);
    await insertCat.run('อื่นๆ', 4);
  }

  // Seed default settings
  const settingsCount = await db.prepare('SELECT COUNT(*) as count FROM settings').get();
  if (settingsCount.count === 0) {
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    await insertSetting.run('shop_name', process.env.SHOP_NAME || 'ร้านไก่ทอดช้างแดง');
    await insertSetting.run('promptpay_id', process.env.PROMPTPAY_ID || '');
    await insertSetting.run('daily_report_time', '21:00');
    await insertSetting.run('low_stock_threshold', '5');
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
    { name: 'ผงปาปริก้า', category: 'powder', servings: 50, active: 1 }
  ];

  let seededCount = 0;
  for (const m of defaultModifiers) {
    const existing = await db.prepare('SELECT id FROM free_modifiers WHERE name = ?').get(m.name);
    if (!existing) {
      await db.prepare('INSERT INTO free_modifiers (name, category, servings_per_bag, active) VALUES (?, ?, ?, ?)')
        .run(m.name, m.category, m.servings, m.active);
      seededCount++;
    }
  }
  if (seededCount > 0) {
    console.log(`  🧂 สร้างตัวเลือกซอส/ผง/น้ำจิ้มเริ่มต้นเพิ่มเติมสำเร็จ (${seededCount} รายการ)`);
  }

  // Seed branch Stocks for free modifiers
  const branches = await db.prepare('SELECT id FROM branches').all();
  const modifiers = await db.prepare('SELECT id FROM free_modifiers').all();
  const insertModStock = db.prepare(`
    INSERT OR IGNORE INTO branch_free_modifier_stocks (branch_id, modifier_id, total_servings)
    VALUES (?, ?, 0)
  `);
  for (const b of branches) {
    for (const m of modifiers) {
      await insertModStock.run(b.id, m.id);
    }
  }

  // Seed default presets (สูตรสำเร็จ)
  const presetCount = await db.prepare('SELECT COUNT(*) as count FROM free_modifier_presets').get();
  if (presetCount.count === 0) {
    const tomatoBag = await db.prepare("SELECT id FROM free_modifiers WHERE name = 'ซอสมะเขือเทศ (ถุง)'").get();
    const cheesePowder = await db.prepare("SELECT id FROM free_modifiers WHERE name = 'ผงชีส'").get();
    if (tomatoBag && cheesePowder) {
      await db.prepare('INSERT INTO free_modifier_presets (name, modifier_ids) VALUES (?, ?)')
        .run('มะเขือเทศ + ผงชีส', JSON.stringify([tomatoBag.id, cheesePowder.id]));
      console.log('  ✨ สร้างสูตรสำเร็จเริ่มต้น (มะเขือเทศ + ผงชีส) สำเร็จ');
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
