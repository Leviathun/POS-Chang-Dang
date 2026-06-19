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
  const params3_gov = [date];
  const params3_delivery = [date];
  const params4 = [date];

  if (branchId) {
    branchFilter = ' AND branch_id = ?';
    params1.push(branchId);
    params2.push(branchId);
    params3.push(branchId);
    params3_gov.push(branchId);
    params3_delivery.push(branchId);
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

  const govStats = await db.prepare(`
    SELECT 
      COUNT(*) as count,
      COALESCE(SUM(total), 0) as total
    FROM orders 
    WHERE date(created_at) = ? AND status = 'completed' AND payment_method = 'gov'${branchFilter}
  `).get(params3_gov);

  const deliveryStats = await db.prepare(`
    SELECT 
      COUNT(*) as count,
      COALESCE(SUM(total), 0) as total
    FROM orders 
    WHERE date(created_at) = ? AND status = 'completed' AND payment_method = 'delivery'${branchFilter}
  `).get(params3_delivery);

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
    SELECT o.id, o.order_number, o.subtotal, o.discount, o.total, o.payment_method, o.status, o.note, o.cancel_reason, o.created_at,
           b.name as branch_name, u.name as staff_name
    FROM orders o
    LEFT JOIN branches b ON b.id = o.branch_id
    LEFT JOIN users u ON u.id = o.staff_id
    WHERE date(o.created_at) = ? AND o.status IN ('completed', 'cancelled')${branchFilter.replace(/branch_id/g, 'o.branch_id')}
    ORDER BY o.id DESC
  `).all(params5);
 
  const breakdownData = {
    cash_count: cashStats.count,
    cash_total: cashStats.total,
    qr_count: qrStats.count,
    qr_total: qrStats.total,
    gov_count: govStats.count,
    gov_total: govStats.total,
    delivery_count: deliveryStats.count,
    delivery_total: deliveryStats.total
  };

  return {
    date,
    total_orders: totals.total_orders,
    total_revenue: totals.total_revenue,
    avg_order_value: Math.round(totals.avg_order_value * 100) / 100,
    payment_breakdown: breakdownData,
    payment: breakdownData,
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

  // ดึงรายการออเดอร์ทั้งหมดของเดือนนี้
  const paramsOrders = [month];
  if (branchId) paramsOrders.push(branchId);
  const orders = await db.prepare(`
    SELECT o.id, o.order_number, o.subtotal, o.discount, o.total, o.payment_method, o.status, o.note, o.cancel_reason, o.created_at,
           b.name as branch_name, u.name as staff_name
    FROM orders o
    LEFT JOIN branches b ON b.id = o.branch_id
    LEFT JOIN users u ON u.id = o.staff_id
    WHERE strftime('%Y-%m', o.created_at) = ? AND o.status IN ('completed', 'cancelled')${branchFilter.replace(/branch_id/g, 'o.branch_id')}
    ORDER BY o.id DESC
  `).all(paramsOrders);

  return {
    month,
    total_orders: totals.total_orders,
    total_revenue: totals.total_revenue,
    avg_order_value: Math.round(totals.avg_order_value * 100) / 100,
    daily_breakdown: dailyBreakdown,
    orders: orders
  };
}

/**
 * รายงานยอดขายรายปี
 * @param {string} year - ปี ค.ศ.
 * @param {number} [branchId] - รหัสสาขา
 */
async function getYearlyReport(year, branchId = null) {
  const db = getDb();
  let branchFilter = '';
  const params1 = [year];
  const params2 = [year];

  if (branchId) {
    branchFilter = ' AND branch_id = ?';
    params1.push(branchId);
    params2.push(branchId);
  }

  // ยอดรายเดือนของปี
  const monthlyBreakdown = await db.prepare(`
    SELECT 
      strftime('%Y-%m', created_at) as month,
      COUNT(*) as order_count,
      COALESCE(SUM(total), 0) as revenue
    FROM orders 
    WHERE strftime('%Y', created_at) = ? AND status = 'completed'${branchFilter}
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month
  `).all(params1);

  // ยอดรวมของปี
  const totals = await db.prepare(`
    SELECT 
      COUNT(*) as total_orders,
      COALESCE(SUM(total), 0) as total_revenue,
      COALESCE(AVG(total), 0) as avg_order_value
    FROM orders 
    WHERE strftime('%Y', created_at) = ? AND status = 'completed'${branchFilter}
  `).get(params2);

  // ดึงรายการออเดอร์ทั้งหมดของปีนี้
  const paramsOrders = [year];
  if (branchId) paramsOrders.push(branchId);
  const orders = await db.prepare(`
    SELECT o.id, o.order_number, o.subtotal, o.discount, o.total, o.payment_method, o.status, o.note, o.cancel_reason, o.created_at,
           b.name as branch_name, u.name as staff_name
    FROM orders o
    LEFT JOIN branches b ON b.id = o.branch_id
    LEFT JOIN users u ON u.id = o.staff_id
    WHERE strftime('%Y', o.created_at) = ? AND o.status IN ('completed', 'cancelled')${branchFilter.replace(/branch_id/g, 'o.branch_id')}
    ORDER BY o.id DESC
  `).all(paramsOrders);

  return {
    year,
    total_orders: totals.total_orders,
    total_revenue: totals.total_revenue,
    avg_order_value: Math.round(totals.avg_order_value * 100) / 100,
    monthly_breakdown: monthlyBreakdown,
    orders: orders
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
    params.unshift(branchId);
  }

  const sql = `
    SELECT 
      oi.item_name,
      oi.menu_item_id,
      oi.quantity,
      oi.subtotal,
      oi.options
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status = 'completed'
      ${branchFilter}
      AND o.created_at >= datetime('now', 'localtime', ?)
  `;

  const allOrderItems = await db.prepare(sql).all(params);
  const aggregation = {};

  allOrderItems.forEach(oi => {
    let optionsObj = null;
    if (oi.options) {
      try { optionsObj = JSON.parse(oi.options); } catch (e) {}
    }

    if (optionsObj && Array.isArray(optionsObj.selected_items) && optionsObj.selected_items.length > 0) {
      const ingredientCount = optionsObj.selected_items.length;
      const splitRevenue = oi.subtotal / ingredientCount;

      optionsObj.selected_items.forEach(ingredient => {
        const id = Number(ingredient.id);
        const name = ingredient.name;
        const totalWeight = Number(ingredient.weight) * oi.quantity;
        const portions = oi.quantity;

        if (!aggregation[id]) {
          aggregation[id] = {
            menu_item_id: id,
            item_name: name,
            total_qty: 0,
            portion_count: 0,
            total_revenue: 0,
            unit: 'กรัม'
          };
        }
        aggregation[id].total_qty += totalWeight;
        aggregation[id].portion_count += portions;
        aggregation[id].total_revenue += splitRevenue;
      });
    } else {
      const id = oi.menu_item_id;
      const name = oi.item_name;
      const qty = oi.quantity;
      const subtotal = oi.subtotal;

      if (!aggregation[id]) {
        aggregation[id] = {
          menu_item_id: id,
          item_name: name,
          total_qty: 0,
          portion_count: 0,
          total_revenue: 0,
          unit: 'ชิ้น'
        };
      }
      aggregation[id].total_qty += qty;
      aggregation[id].portion_count += qty;
      aggregation[id].total_revenue += subtotal;
    }
  });

  const aggregatedList = Object.values(aggregation);
  
  // Sort by portion_count descending to represent popularity fairly
  aggregatedList.sort((a, b) => b.portion_count - a.portion_count);

  // Take top 10 and map to original property contract
  const top10 = aggregatedList.slice(0, 10).map(item => ({
    menu_item_id: item.menu_item_id,
    item_name: item.item_name,
    total_qty: item.total_qty,
    total_revenue: Math.round(item.total_revenue * 100) / 100,
    unit: item.unit
  }));

  return top10;
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

module.exports = { getDailyReport, getMonthlyReport, getYearlyReport, getTopItems, getSummary };
