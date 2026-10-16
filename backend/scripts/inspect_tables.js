const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { getDb, initDatabase } = require('../config/database');

(async () => {
  await initDatabase();
  const db = getDb();
  console.log('Connected DB URL:', process.env.TURSO_DATABASE_URL ? 'Turso Cloud' : 'Local SQLite');
  const items = await db.prepare("SELECT id, name, active, quantity FROM central_kitchen_items").all();
  console.log('Items count:', items.length);
  console.log('Items:', items);
})();
