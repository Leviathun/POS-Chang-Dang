const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { getDb } = require('./config/database');

async function run() {
  const db = getDb();
  try {
    console.log('Fetching activity logs for 2026-06-23...');
    const logs = await db.prepare(`
      SELECT id, user_id, action, details, created_at 
      FROM activity_logs 
      WHERE date(created_at) = '2026-06-23'
      ORDER BY created_at ASC
    `).all();
    
    console.log(`Found ${logs.length} logs:`);
    logs.forEach(l => {
      console.log(`- [${l.created_at}] Action: ${l.action} | Details: ${l.details}`);
    });
  } catch (e) {
    console.error('Error:', e);
  }
}

run();
