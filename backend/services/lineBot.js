const line = require('@line/bot-sdk');

// ─── LINE Configuration ──────────────────────────────────
const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
};

let client = null;

/**
 * ตรวจสอบว่า LINE ถูกตั้งค่าแล้วหรือยัง
 */
function isConfigured() {
  return !!(config.channelSecret && config.channelAccessToken);
}

/**
 * สร้าง LINE Client (singleton)
 */
function getClient() {
  if (!client && isConfigured()) {
    client = new line.messagingApi.MessagingApiClient({
      channelAccessToken: config.channelAccessToken
    });
  }
  return client;
}

/**
 * ตอบกลับข้อความ
 * @param {string} replyToken - Reply token จาก LINE webhook
 * @param {string} text - ข้อความที่ต้องการส่ง
 */
async function replyText(replyToken, text) {
  const c = getClient();
  if (!c) return;

  try {
    await c.replyMessage({
      replyToken,
      messages: [{ type: 'text', text }]
    });
  } catch (error) {
    console.error('❌ LINE replyText error:', error.message);
  }
}

/**
 * ส่งข้อความหาผู้ใช้
 * @param {string} userId - LINE User ID
 * @param {string} text - ข้อความที่ต้องการส่ง
 */
async function pushText(userId, text) {
  const c = getClient();
  if (!c) return;

  try {
    await c.pushMessage({
      to: userId,
      messages: [{ type: 'text', text }]
    });
  } catch (error) {
    console.error('❌ LINE pushText error:', error.message);
  }
}

/**
 * ส่ง Flex Message หาผู้ใช้
 * @param {string} userId - LINE User ID
 * @param {object} flexContent - เนื้อหา Flex Message
 */
async function pushFlexMessage(userId, flexContent) {
  const c = getClient();
  if (!c) return;

  try {
    await c.pushMessage({
      to: userId,
      messages: [{
        type: 'flex',
        altText: flexContent.altText || 'รายงานยอดขาย',
        contents: flexContent.contents
      }]
    });
  } catch (error) {
    console.error('❌ LINE pushFlexMessage error:', error.message);
  }
}

/**
 * จัดรูปแบบรายงานยอดขายรายวัน เป็น Flex Message Bubble
 * @param {object} reportData - ข้อมูลจาก getDailyReport()
 */
function formatDailyReport(reportData) {
  const { date, total_orders, total_revenue, avg_order_value, payment } = reportData;

  return {
    altText: `📊 รายงานยอดขายวันที่ ${date}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🍗 ร้านไก่ทอดช้างแดง',
            weight: 'bold',
            size: 'md',
            color: '#FFFFFF'
          },
          {
            type: 'text',
            text: `📊 สรุปยอดขาย ${date}`,
            size: 'sm',
            color: '#FFFFFFCC',
            margin: 'sm'
          }
        ],
        backgroundColor: '#E65100',
        paddingAll: '20px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'จำนวนออเดอร์', size: 'sm', color: '#666666', flex: 5 },
              { type: 'text', text: `${total_orders} รายการ`, size: 'sm', weight: 'bold', align: 'end', flex: 5 }
            ]
          },
          { type: 'separator', margin: 'md' },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            contents: [
              { type: 'text', text: 'ยอดขายรวม', size: 'sm', color: '#666666', flex: 5 },
              { type: 'text', text: `฿${total_revenue.toLocaleString()}`, size: 'sm', weight: 'bold', color: '#E65100', align: 'end', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'sm',
            contents: [
              { type: 'text', text: 'ค่าเฉลี่ย/ออเดอร์', size: 'sm', color: '#666666', flex: 5 },
              { type: 'text', text: `฿${avg_order_value.toLocaleString()}`, size: 'sm', align: 'end', flex: 5 }
            ]
          },
          { type: 'separator', margin: 'md' },
          {
            type: 'text',
            text: '💰 แยกตามการชำระเงิน',
            size: 'sm',
            weight: 'bold',
            margin: 'md'
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'sm',
            contents: [
              { type: 'text', text: `เงินสด: ${payment.cash_count} รายการ`, size: 'xs', color: '#666666', flex: 5 },
              { type: 'text', text: `฿${payment.cash_total.toLocaleString()}`, size: 'xs', align: 'end', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'sm',
            contents: [
              { type: 'text', text: `QR: ${payment.qr_count} รายการ`, size: 'xs', color: '#666666', flex: 5 },
              { type: 'text', text: `฿${payment.qr_total.toLocaleString()}`, size: 'xs', align: 'end', flex: 5 }
            ]
          }
        ],
        paddingAll: '20px'
      }
    }
  };
}

/**
 * จัดรูปแบบสินค้าขายดีเป็นข้อความ
 * @param {Array} items - รายการสินค้าขายดี
 */
function formatTopItems(items) {
  if (!items || items.length === 0) {
    return '📋 ยังไม่มีข้อมูลสินค้าขายดี';
  }

  let text = '🏆 สินค้าขายดี\n═══════════════\n';
  items.forEach((item, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    text += `${medal} ${item.item_name}\n`;
    text += `   จำนวน: ${item.total_qty} ชิ้น | ยอด: ฿${item.total_revenue.toLocaleString()}\n`;
  });

  return text;
}

module.exports = {
  config,
  isConfigured,
  getClient,
  replyText,
  pushText,
  pushFlexMessage,
  formatDailyReport,
  formatTopItems
};
