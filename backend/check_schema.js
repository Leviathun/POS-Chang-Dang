require('dotenv').config({ path: '../.env' });
const { getDb } = require('./config/database');

async function check() {
  try {
    const db = getDb();
    console.log('Fetching database schema info...');
    
    const tables = await db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
    console.log('Tables in database:');
    tables.forEach(t => {
      console.log(`- ${t.name}`);
      console.log(`  Schema: ${t.sql}`);
    });
  } catch (err) {
    console.error('Error fetching schema:', err);
  }
}

check();
