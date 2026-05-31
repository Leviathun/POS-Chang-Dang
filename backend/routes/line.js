const express = require('express');
const router = express.Router();
const line = require('@line/bot-sdk');
const { getDb } = require('../config/database');
const lineBot = require('../services/lineBot');
const reportsService = require('../services/reports');

// ─── LINE Webhook Configuration ─────────────────────────
const lineConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
};

/**
 * ดึง LINE Owner User ID จาก env หรือ settings
 */
async function getOwnerUserId() {
  let ownerId = process.env.LINE_OWNER_USER_ID || '';
  if (!ownerId) {
    try {
      const db = getDb();
      const setting = await db.prepare(
        "SELECT value FROM settings WHERE key = 'line_owner_user_id'"
      ).get();
      ownerId = setting ? setting.value : '';
    } catch (e) {
      // ignore
    }
  }
  return ownerId;
}

// ─── POST /webhook — LINE Webhook Handler ───────────────
if (lineConfig.channelSecret) {
  router.post('/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      try {
        const signature = req.headers['x-line-signature'];
        if (!signature) {
          return res.status(200).json({ success: true });
        }

        const body = req.body.toString('utf8');

        // Verify signature
        if (!line.validateSignature(body, lineConfig.channelSecret, signature)) {
          console.error('❌ LINE signature verification failed');
          return res.status(200).json({ success: true });
        }

        const events = JSON.parse(body).events || [];

        // ประมวลผล events
        await Promise.all(events.map(handleEvent));

        res.status(200).json({ success: true });
      } catch (error) {
        console.error('❌ LINE webhook error:', error.message);
        res.status(200).json({ success: true });
      }
    }
  );
} else {
  router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    res.status(200).json({ success: true });
  });
}

/**
 * จัดการ event จาก LINE
 */
async function handleEvent(event) {
  try {
    // Follow event — บันทึก User ID เป็นเจ้าของ
    if (event.type === 'follow') {
      const userId = event.source.userId;
      if (userId) {
        try {
          const db = getDb();
          await db.prepare(`
            INSERT INTO settings (key, value, updated_at) 
            VALUES ('line_owner_user_id', ?, datetime('now', 'localtime'))
            ON CONFLICT(key) DO UPDATE SET 
              value = excluded.value,
              updated_at = datetime('now', 'localtime')
          `).run(userId);
          console.log(`✅ บันทึก LINE Owner User ID: ${userId}`);
        } catch (e) {
          console.error('❌ บันทึก LINE Owner User ID ไม่สำเร็จ:', e.message);
        }
      }
      return;
    }

    // Text message event
    if (event.type !== 'message' || event.message.type !== 'text') {
      return;
    }

    const text = event.message.text.trim().toLowerCase();
    const replyToken = event.replyToken;

    // ตรวจสอบว่าเป็นเจ้าของร้านหรือไม่
    const ownerId = await getOwnerUserId();
    if (ownerId && event.source.userId !== ownerId) {
      await lineBot.replyText(replyToken, '⚠️ คำสั่งนี้ใช้ได้เฉพาะเจ้าของร้านเท่านั้น');
      return;
    }

    // ─── คำสั่ง: ยอดวันนี้ ──────────────────────────────
    if (text === 'ยอดวันนี้' || text === 'ยอด') {
      const today = new Date();
      const dateStr = today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');

      const report = await reportsService.getDailyReport(dateStr);

      const message = [
        `📊 สรุปยอดขายวันนี้ (${dateStr})`,
        `═══════════════════`,
        `📦 จำนวนออเดอร์: ${report.total_orders} รายการ`,
        `💰 ยอดขายรวม: ฿${report.total_revenue.toLocaleString()}`,
        `📈 ค่าเฉลี่ย/ออเดอร์: ฿${report.avg_order_value.toLocaleString()}`,
        ``,
        `💵 เงินสด: ${report.payment_breakdown.cash_count} รายการ (฿${report.payment_breakdown.cash_total.toLocaleString()})`,
        `📱 QR: ${report.payment_breakdown.qr_count} รายการ (฿${report.payment_breakdown.qr_total.toLocaleString()})`
      ].join('\n');

      await lineBot.replyText(replyToken, message);
      return;
    }

    // ─── คำสั่ง: ยอดเดือนนี้ ────────────────────────────
    if (text === 'ยอดเดือนนี้') {
      const today = new Date();
      const monthStr = today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0');

      const report = await reportsService.getMonthlyReport(monthStr);

      const message = [
        `📊 สรุปยอดขายเดือนนี้ (${monthStr})`,
        `═══════════════════`,
        `📦 จำนวนออเดอร์: ${report.total_orders} รายการ`,
        `💰 ยอดขายรวม: ฿${report.total_revenue.toLocaleString()}`,
        `📈 ค่าเฉลี่ย/ออเดอร์: ฿${report.avg_order_value.toLocaleString()}`,
        `📅 จำนวนวันที่มียอด: ${report.daily_breakdown.length} วัน`
      ].join('\n');

      await lineBot.replyText(replyToken, message);
      return;
    }

    // ─── คำสั่ง: สินค้าขายดี ────────────────────────────
    if (text === 'สินค้าขายดี') {
      const items = await reportsService.getTopItems(7);
      const topItems = items.slice(0, 5); // แสดง 5 อันดับ
      const message = lineBot.formatTopItems(topItems);

      await lineBot.replyText(replyToken, message);
      return;
    }

    // ─── คำสั่ง: สต็อก ──────────────────────────────────
    if (text === 'สต็อก') {
      const db = getDb();

      const thresholdSetting = await db.prepare(
        "SELECT value FROM settings WHERE key = 'low_stock_threshold'"
      ).get();
      const threshold = thresholdSetting ? parseInt(thresholdSetting.value) || 5 : 5;

      // คิวรีดึงข้อมูลสต็อกแยกตามสาขาและชื่อเมนู
      const lowStockItems = await db.prepare(`
        SELECT mi.name, bs.quantity as stock, b.name as branch_name
        FROM menu_items mi
        JOIN branch_stocks bs ON bs.menu_item_id = mi.id
        JOIN branches b ON b.id = bs.branch_id
        WHERE mi.active = 1 AND bs.quantity IS NOT NULL AND bs.quantity <= ?
        ORDER BY bs.quantity ASC
      `).all(threshold);

      let message;
      if (lowStockItems.length === 0) {
        message = '✅ สต็อกสินค้าปกติ ไม่มีรายการที่ต่ำกว่าเกณฑ์';
      } else {
        message = `⚠️ สินค้าใกล้หมด (≤ ${threshold} ชิ้น)\n═══════════════════\n`;
        lowStockItems.forEach(item => {
          const emoji = item.stock === 0 ? '🔴' : '🟡';
          message += `${emoji} ${item.name} (${item.branch_name}): เหลือ ${item.stock} ชิ้น\n`;
        });
      }

      await lineBot.replyText(replyToken, message);
      return;
    }

    // ─── คำสั่ง: เมนู / help / คำสั่ง ───────────────────
    if (text === 'เมนู' || text === 'help' || text === 'คำสั่ง') {
      const message = [
        '🍗 คำสั่งที่ใช้ได้:',
        '═══════════════════',
        '📊 "ยอด" หรือ "ยอดวันนี้"',
        '   → สรุปยอดขายรวมวันนี้',
        '',
        '📅 "ยอดเดือนนี้"',
        '   → สรุปยอดขายรวมเดือนนี้',
        '',
        '🏆 "สินค้าขายดี"',
        '   → 5 อันดับสินค้าขายดี',
        '',
        '📦 "สต็อก"',
        '   → เช็คสินค้าใกล้หมดแยกสาขา',
        '',
        '❓ "เมนู" หรือ "help"',
        '   → แสดงคำสั่งทั้งหมด'
      ].join('\n');

      await lineBot.replyText(replyToken, message);
      return;
    }

    // ข้อความไม่ตรงกับคำสั่งใดๆ
    await lineBot.replyText(replyToken,
      '🤔 ไม่เข้าใจคำสั่ง พิมพ์ "เมนู" เพื่อดูคำสั่งที่ใช้ได้'
    );

  } catch (error) {
    console.error('❌ Handle LINE event error:', error.message);
  }
}

module.exports = router;
