require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { initDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────
app.use(cors());

// LINE webhook needs raw body for signature verification
// Must be registered BEFORE express.json()
try {
  const lineRouter = require('./routes/line');
  app.use('/api/line', lineRouter);
} catch (e) {
  console.log('⚠️  LINE integration not configured (this is OK for development)');
}

// JSON parser for all other routes
app.use(express.json({ limit: '10mb' }));

// Static files (PWA) - served from root dist/ folder
app.use(express.static(path.join(__dirname, '..', 'dist')));

// ─── API Routes ───────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/free-modifiers', require('./routes/free_modifiers'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/activities', require('./routes/activities'));

// ─── SPA Fallback ─────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// ─── Error Handler ────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// ─── Initialize ───────────────────────────────────────────
initDatabase();

// Start cron jobs (daily LINE report)
try {
  require('./services/cron');
} catch (e) {
  console.log('⚠️  Cron jobs not started:', e.message);
}

// ─── Start Server ─────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  🍗 ══════════════════════════════════════════');
  console.log(`  🍗  POS ร้านไก่ทอดช้างแดง`);
  console.log(`  🍗  Running on http://localhost:${PORT}`);
  console.log('  🍗 ══════════════════════════════════════════');
  console.log('');
});

module.exports = app;
