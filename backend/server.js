// Server entry point for POS-Chang-Dang
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Catch uncaught exceptions and unhandled rejections to prevent server crash on connection timeouts
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception thrown:', err);
});

const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────
app.use(cors());

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
app.use('/api/modifiers', require('./routes/modifiers'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/cash-drawers', require('./routes/cash_drawers'));

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
// Skip automatic database initialization in production or cloud deployment to prevent a cold-start query storm
const skipDbInit = process.env.VERCEL || process.env.SKIP_INIT_DB === 'true' || process.env.NODE_ENV === 'production';
if (!skipDbInit) {
  initDatabase().catch(err => {
    console.error('❌ Failed to initialize database:', err.message);
  });
} else {
  console.log('  🗄️  Production/Serverless Mode: Skipping automatic database initialization.');
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
