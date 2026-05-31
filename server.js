require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { initDatabase } = require('./backend/config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────
app.use(cors());

// LINE webhook needs raw body for signature verification
// Must be registered BEFORE express.json()
try {
  const lineRouter = require('./backend/routes/line');
  app.use('/api/line', lineRouter);
} catch (e) {
  console.log('⚠️  LINE integration not configured (this is OK for development)');
}

// JSON parser for all other routes
app.use(express.json({ limit: '10mb' }));

// Static files (PWA)
app.use(express.static(path.join(__dirname, 'public')));

// ─── API Routes ───────────────────────────────────────────
app.use('/api/auth', require('./backend/routes/auth'));
app.use('/api/menu', require('./backend/routes/menu'));
app.use('/api/orders', require('./backend/routes/orders'));
app.use('/api/reports', require('./backend/routes/reports'));
app.use('/api/settings', require('./backend/routes/settings'));
app.use('/api/stock', require('./backend/routes/stock'));

// ─── SPA Fallback ─────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
  require('./backend/services/cron');
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
