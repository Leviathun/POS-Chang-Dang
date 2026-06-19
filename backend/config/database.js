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

  async batch(statements, mode = "write") {
    const cleanStatements = statements.map(stmt => {
      if (typeof stmt === 'string') {
        return stmt.replace(/'localtime'/g, "'+7 hours'");
      } else {
        return {
          sql: stmt.sql.replace(/'localtime'/g, "'+7 hours'"),
          args: stmt.args
        };
      }
    });
    return this.client.batch(cleanStatements, mode);
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
      if (process.env.VERCEL) {
        // Direct cloud connection for Serverless environments (which have no persistent disk)
        console.log('  🗄️  Connecting directly to Turso Cloud DB (Serverless Mode):', dbUrl);
        client = createClient({
          url: dbUrl,
          authToken: dbToken
        });
      } else {
        // Embedded Replica for persistent servers / local development (instant read speed)
        const dbPath = path.join(__dirname, '..', '..', 'data', 'pos_replica.db');
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        console.log('  🗄️  Connecting to Turso Cloud DB via Embedded Replica (Persistent Mode):', `file:${dbPath}`);
        client = createClient({
          url: `file:${dbPath}`,
          syncUrl: dbUrl,
          authToken: dbToken,
          syncInterval: 60000 // Automatically sync every 60 seconds
        });

        // Trigger initial sync on startup asynchronously to not block server boot
        client.sync().then(() => {
          console.log('  🔄 Initial Turso Cloud DB sync completed successfully');
        }).catch(e => {
          console.warn('  ⚠️ Initial Turso Cloud DB sync failed (operating offline?):', e.message);
        });
      }
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

  // 1. Ensure branches table and default branch exist first
  await db.exec(`CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    address TEXT,
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



  // ─── Create Tables (Multi-Branch Enabled) ─────────────────
  const tables = [
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
      quantity INTEGER DEFAULT NULL,
      raw_quantity INTEGER DEFAULT NULL,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS modifiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('sauce_small', 'sauce_large', 'dipping', 'powder')),
      servings_per_bag INTEGER DEFAULT 50,
      total_servings INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      UNIQUE(branch_id, name)
    )`,
    `CREATE TABLE IF NOT EXISTS modifier_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      modifier_ids TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      UNIQUE(branch_id, name)
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
      status TEXT DEFAULT 'completed' CHECK(status IN ('completed', 'cancelled')),
      note TEXT,
      cancel_reason TEXT,
      modifiers TEXT,
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
    `CREATE TABLE IF NOT EXISTS modifier_stock_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER REFERENCES branches(id),
      modifier_id INTEGER NOT NULL REFERENCES modifiers(id),
      change_qty INTEGER NOT NULL,
      previous_stock INTEGER,
      new_stock INTEGER,
      reason TEXT CHECK(reason IN ('sale', 'restock', 'adjustment', 'cancel_restore')),
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
      modifiers TEXT,
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

  // ─── Create Indexes ───────────────────────────────────────
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_orders_branch ON orders(branch_id)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`,
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

  // Seed default settings per branch (without shop_name)
  for (const b of branches) {
    const settingsCount = await db.prepare('SELECT COUNT(*) as count FROM settings WHERE branch_id = ?').get(b.id);
    if (settingsCount.count === 0) {
      const insertSetting = db.prepare('INSERT INTO settings (branch_id, key, value) VALUES (?, ?, ?)');
      await insertSetting.run(b.id, 'low_stock_threshold', '5');
    }
  }

  // Seed default modifiers
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
    { name: 'ซอสเปรี้ยว (ขวด)', category: 'sauce_large', servings: 60, active: 1 },
    { name: 'ซอสหวาน (ขวด)', category: 'sauce_large', servings: 60, active: 1 },
    { name: 'กระเทียมเจียว (ถุง)', category: 'powder', servings: 50, active: 1 }
  ];

  let seededCount = 0;
  for (const b of branches) {
    for (const m of defaultModifiers) {
      // For Branch ID 2 (สาขารอง หน้าบ้าน), we ONLY allow these 3 modifiers
      if (b.id === 2 && !['ซอสเปรี้ยว (ขวด)', 'ซอสหวาน (ขวด)', 'กระเทียมเจียว (ถุง)'].includes(m.name)) {
        continue;
      }

      const existing = await db.prepare('SELECT id FROM modifiers WHERE branch_id = ? AND name = ?').get(b.id, m.name);
      if (!existing) {
        await db.prepare('INSERT INTO modifiers (branch_id, name, category, servings_per_bag, active, total_servings) VALUES (?, ?, ?, ?, ?, 0)')
          .run(b.id, m.name, m.category, m.servings, m.active);
        seededCount++;
      }
    }
  }
  if (seededCount > 0) {
    console.log(`  🧂 สร้างตัวเลือกซอส/ผง/น้ำจิ้มเริ่มต้นเพิ่มเติมสำเร็จ (${seededCount} รายการ)`);
  }

  // Cleanup extra modifiers in Branch 2 (in case they exist from a past seed)
  try {
    const delCount = await db.prepare(`
      DELETE FROM modifiers 
      WHERE branch_id = 2 
        AND name NOT IN ('ซอสเปรี้ยว (ขวด)', 'ซอสหวาน (ขวด)', 'กระเทียมเจียว (ถุง)')
    `).run();
    if (delCount.changes > 0) {
      console.log(`  🧂 Cleaned up ${delCount.changes} extra modifiers from Branch 2`);
    }
  } catch (e) {
    console.warn('⚠️ Error cleaning up Branch 2 modifiers:', e.message);
  }

  // Seed default presets per branch
  for (const b of branches) {
    // For Branch 2, we shouldn't seed 'มะเขือเทศ + ผงชีส' since those modifiers don't exist in Branch 2
    if (b.id === 2) {
      try {
        await db.prepare("DELETE FROM modifier_presets WHERE branch_id = 2").run();
      } catch (e) {}
      continue;
    }
    const presetCount = await db.prepare('SELECT COUNT(*) as count FROM modifier_presets WHERE branch_id = ?').get(b.id);
    if (presetCount.count === 0) {
      const tomatoBag = await db.prepare("SELECT id FROM modifiers WHERE branch_id = ? AND name = 'ซอสมะเขือเทศ (ถุง)'").get(b.id);
      const cheesePowder = await db.prepare("SELECT id FROM modifiers WHERE branch_id = ? AND name = 'ผงชีส'").get(b.id);
      if (tomatoBag && cheesePowder) {
        await db.prepare('INSERT INTO modifier_presets (branch_id, name, modifier_ids) VALUES (?, ?, ?)')
          .run(b.id, 'มะเขือเทศ + ผงชีส', JSON.stringify([tomatoBag.id, cheesePowder.id]));
        console.log(`  ✨ สร้างสูตรสำเร็จเริ่มต้น (มะเขือเทศ + ผงชีส) สำหรับสาขา ID ${b.id} สำเร็จ`);
      }
    }
  }



  console.log('  ✅ Cloud/Local Database initialized');
}

module.exports = { getDb, initDatabase };
