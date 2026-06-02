const { getDb } = require('../config/database');

/**
 * รายงานยอดขายรายวัน
 * @param {string} date - วันที่ในรูปแบบ YYYY-MM-DD
 * @param {number} [branchId] - รหัสสาขา (ระบุหรือไม่ก็ได้)
 */
async function getDailyReport(date, branchId = null) {
  const db = getDb();
  let branchFilter = '';
  const params1 = [date];
  const params2 = [date];
  const params3 = [date];
  const params4 = [date];

  if (branchId) {
    branchFilter = ' AND branch_id = ?';
    params1.push(branchId);
    params2.push(branchId);
    params3.push(branchId);
    params4.push(branchId);
  }

  // ยอดรวมของวัน
  const totals = await db.prepare(`
    SELECT 
      COUNT(*) as total_orders,
      COALESCE(SUM(total), 0) as total_revenue,
      COALESCE(AVG(total), 0) as avg_order_value
    FROM orders 
    WHERE date(created_at) = ? AND status = 'completed'${branchFilter}
  `).get(params1);

  // แยกตามวิธีชำระเงิน
  const cashStats = await db.prepare(`
    SELECT 
      COUNT(*) as count,
      COALESCE(SUM(total), 0) as total
    FROM orders 
    WHERE date(created_at) = ? AND status = 'completed' AND payment_method = 'cash'${branchFilter}
  `).get(params2);

  const qrStats = await db.prepare(`
    SELECT 
      COUNT(*) as count,
      COALESCE(SUM(total), 0) as total
    FROM orders 
    WHERE date(created_at) = ? AND status = 'completed' AND payment_method = 'qr'${branchFilter}
  `).get(params3);

  // ยอดขายรายชั่วโมง (ระวังการเขียน strftime ใน libSQL/SQLite)
  const hourlyBreakdown = await db.prepare(`
    SELECT 
      CAST(strftime('%H', created_at) AS INTEGER) as hour,
      COUNT(*) as order_count,
      COALESCE(SUM(total), 0) as revenue
    FROM orders 
    WHERE date(created_at) = ? AND status = 'completed'${branchFilter}
    GROUP BY strftime('%H', created_at)
    ORDER BY hour
  `).all(params4);

  // รายการบิลขายของวัน
  const params5 = [date];
  if (branchId) {
    params5.push(branchId);
  }
  const orders = await db.prepare(`
    SELECT id, order_number, subtotal, discount, total, payment_method, status, note, cancel_reason, created_at
    FROM orders
    WHERE date(created_at) = ? AND status IN ('completed', 'cancelled')${branchFilter}
    ORDER BY id DESC
  `).all(params5);
 
  return {
    date,
    total_orders: totals.total_orders,
    total_revenue: totals.total_revenue,
    avg_order_value: Math.round(totals.avg_order_value * 100) / 100,
    payment_breakdown: {
      cash_count: cashStats.count,
      cash_total: cashStats.total,
      qr_count: qrStats.count,
      qr_total: qrStats.total
    },
    hourly_breakdown: hourlyBreakdown,
    orders: orders
  };
}

/**
 * รายงานยอดขายรายเดือน
 * @param {string} month - เดือนในรูปแบบ YYYY-MM
 * @param {number} [branchId] - รหัสสาขา (ระบุหรือไม่ก็ได้)
 */
async function getMonthlyReport(month, branchId = null) {
  const db = getDb();
  let branchFilter = '';
  const params1 = [month];
  const params2 = [month];

  if (branchId) {
    branchFilter = ' AND branch_id = ?';
    params1.push(branchId);
    params2.push(branchId);
  }

  // ยอดรายวันของเดือน
  const dailyBreakdown = await db.prepare(`
    SELECT 
      date(created_at) as date,
      COUNT(*) as order_count,
      COALESCE(SUM(total), 0) as revenue
    FROM orders 
    WHERE strftime('%Y-%m', created_at) = ? AND status = 'completed'${branchFilter}
    GROUP BY date(created_at)
    ORDER BY date
  `).all(params1);

  // ยอดรวมของเดือน
  const totals = await db.prepare(`
    SELECT 
      COUNT(*) as total_orders,
      COALESCE(SUM(total), 0) as total_revenue,
      COALESCE(AVG(total), 0) as avg_order_value
    FROM orders 
    WHERE strftime('%Y-%m', created_at) = ? AND status = 'completed'${branchFilter}
  `).get(params2);

  return {
    month,
    total_orders: totals.total_orders,
    total_revenue: totals.total_revenue,
    avg_order_value: Math.round(totals.avg_order_value * 100) / 100,
    daily_breakdown: dailyBreakdown
  };
}

/**
 * สินค้าขายดี
 * @param {number} days - จำนวนวันย้อนหลัง
 * @param {number} [branchId] - รหัสสาขา
 */
async function getTopItems(days = 7, branchId = null) {
  const db = getDb();
  let branchFilter = '';
  const params = [`-${days} days`];

  if (branchId) {
    branchFilter = ' AND o.branch_id = ?';
    params.unshift(branchId); // ใส่ก่อนด้านหน้าหรือตามตำแหน่ง
  }

  // ปรับการหาตำแหน่งของ params
  const sql = `
    SELECT 
      oi.item_name,
      oi.menu_item_id,
      SUM(oi.quantity) as total_qty,
      SUM(oi.subtotal) as total_revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status = 'completed'
      ${branchFilter}
      AND o.created_at >= datetime('now', 'localtime', ${branchId ? '?' : '?'})
    GROUP BY oi.menu_item_id, oi.item_name
    ORDER BY total_qty DESC
    LIMIT 10
  `;

  const items = await db.prepare(sql).all(params);
  return items;
}

/**
 * สรุปภาพรวม: วันนี้ + สัปดาห์นี้ + เดือนนี้
 * @param {number} [branchId] - รหัสสาขา
 */
async function getSummary(branchId = null) {
  const db = getDb();
  let branchFilter = '';
  const params = [];

  if (branchId) {
    branchFilter = ' AND branch_id = ?';
    params.push(branchId);
  }

  // วันนี้
  const today = await db.prepare(`
    SELECT 
      COUNT(*) as total_orders,
      COALESCE(SUM(total), 0) as total_revenue
    FROM orders 
    WHERE date(created_at) = date('now', 'localtime') AND status = 'completed'${branchFilter}
  `).get(params);

  // สัปดาห์นี้ (7 วันย้อนหลัง)
  const weekParams = branchId ? [`-${7} days`, branchId] : [`-${7} days`];
  const week = await db.prepare(`
    SELECT 
      COUNT(*) as total_orders,
      COALESCE(SUM(total), 0) as total_revenue
    FROM orders 
    WHERE created_at >= datetime('now', 'localtime', ?) AND status = 'completed'${branchFilter}
  `).get(weekParams);

  // เดือนนี้
  const month = await db.prepare(`
    SELECT 
      COUNT(*) as total_orders,
      COALESCE(SUM(total), 0) as total_revenue
    FROM orders 
    WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime') AND status = 'completed'${branchFilter}
  `).get(params);

  return {
    today: {
      total_orders: today.total_orders,
      total_revenue: today.total_revenue
    },
    week: {
      total_orders: week.total_orders,
      total_revenue: week.total_revenue
    },
    month: {
      total_orders: month.total_orders,
      total_revenue: month.total_revenue
    }
  };
}

module.exports = { getDailyReport, getMonthlyReport, getTopItems, getSummary };
