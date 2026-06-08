const express = require('express');
const router = express.Router();
const { attachUser, requireAdmin } = require('../middleware/auth');
const reportsService = require('../services/reports');

function getThailandDate() {
  return new Date(Date.now() + 7 * 60 * 60 * 1000);
}

// ใช้ middleware ตรวจสอบผู้ใช้ทุก route
router.use(attachUser);

// ─── GET /daily — รายงานยอดขายรายวัน ────────────────────
router.get('/daily', async (req, res) => {
  try {
    // ค่าเริ่มต้น = วันนี้
    let date = req.query.date;
    if (!date) {
      const today = getThailandDate();
      date = today.getUTCFullYear() + '-' +
        String(today.getUTCMonth() + 1).padStart(2, '0') + '-' +
        String(today.getUTCDate()).padStart(2, '0');
    }

    // กรองตามสาขา (พนักงานเห็นเฉพาะสาขาตนเอง, แอดมินฟิลเตอร์ได้อิสระ)
    let branchId = req.query.branch_id ? Number(req.query.branch_id) : null;
    if (req.user && req.user.role !== 'admin') {
      branchId = req.user.branch_id;
    }

    const report = await reportsService.getDailyReport(date, branchId);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('❌ Daily report error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้างรายงานรายวัน'
    });
  }
});

// ─── GET /monthly — รายงานยอดขายรายเดือน ────────────────
router.get('/monthly', async (req, res) => {
  try {
    // ค่าเริ่มต้น = เดือนนี้
    let month = req.query.month;
    if (!month) {
      const today = getThailandDate();
      month = today.getUTCFullYear() + '-' +
        String(today.getUTCMonth() + 1).padStart(2, '0');
    }

    // กรองตามสาขา
    let branchId = req.query.branch_id ? Number(req.query.branch_id) : null;
    if (req.user && req.user.role !== 'admin') {
      branchId = req.user.branch_id;
    }

    const report = await reportsService.getMonthlyReport(month, branchId);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('❌ Monthly report error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้างรายงานรายเดือน'
    });
  }
});

// ─── GET /yearly — รายงานยอดขายรายปี ──────────────────
router.get('/yearly', async (req, res) => {
  try {
    let year = req.query.year;
    if (!year) {
      const today = getThailandDate();
      year = String(today.getUTCFullYear());
    }

    // กรองตามสาขา
    let branchId = req.query.branch_id ? Number(req.query.branch_id) : null;
    if (req.user && req.user.role !== 'admin') {
      branchId = req.user.branch_id;
    }

    const report = await reportsService.getYearlyReport(year, branchId);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('❌ Yearly report error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้างรายงานรายปี'
    });
  }
});

// ─── GET /top-items — สินค้าขายดี ───────────────────────
router.get('/top-items', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    // กรองตามสาขา
    let branchId = req.query.branch_id ? Number(req.query.branch_id) : null;
    if (req.user && req.user.role !== 'admin') {
      branchId = req.user.branch_id;
    }

    const items = await reportsService.getTopItems(days, branchId);

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error('❌ Top items error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้าขายดี'
    });
  }
});

// ─── GET /summary — ภาพรวม (วันนี้ + สัปดาห์ + เดือน) ──
router.get('/summary', async (req, res) => {
  try {
    // กรองตามสาขา
    let branchId = req.query.branch_id ? Number(req.query.branch_id) : null;
    if (req.user && req.user.role !== 'admin') {
      branchId = req.user.branch_id;
    }

    const summary = await reportsService.getSummary(branchId);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('❌ Summary error:', error.message);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้างรายงานภาพรวม'
    });
  }
});

module.exports = router;
