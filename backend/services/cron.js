const cron = require('node-cron');
const { getDb } = require('../config/database');
const lineBot = require('./lineBot');
const { getDailyReport } = require('./reports');

/**
 * ตั้งเวลาส่งรายงานยอดขายประจำวันผ่าน LINE
 */
async function startDailyReportCron() {
  let reportTime = '21:00';
  try {
    const db = getDb();
    const setting = await db.prepare(
      "SELECT value FROM settings WHERE key = 'daily_report_time'"
    ).get();
    if (setting && setting.value) {
      reportTime = setting.value;
    }
  } catch (error) {
    console.error('⚠️ อ่านเวลารายงานไม่ได้ ใช้ค่าเริ่มต้น 21:00:', error.message);
  }

  // แปลง HH:MM เป็น cron expression (minute hour * * *)
  const [hour, minute] = reportTime.split(':');
  const cronExpression = `${parseInt(minute)} ${parseInt(hour)} * * *`;

  console.log(`  📅 ตั้งเวลารายงานประจำวัน: ${reportTime} น. (cron: ${cronExpression})`);

  cron.schedule(cronExpression, async () => {
    console.log('⏰ กำลังสร้างรายงานประจำวัน...');

    try {
      // ตรวจสอบว่า LINE ตั้งค่าแล้ว
      if (!lineBot.isConfigured()) {
        console.log('⚠️ LINE ยังไม่ได้ตั้งค่า — ข้ามการส่งรายงาน');
        return;
      }

      // หา LINE Owner User ID
      const db = getDb();
      let ownerUserId = process.env.LINE_OWNER_USER_ID || '';

      if (!ownerUserId) {
        const setting = await db.prepare(
          "SELECT value FROM settings WHERE key = 'line_owner_user_id'"
        ).get();
        ownerUserId = setting ? setting.value : '';
      }

      if (!ownerUserId) {
        console.log('⚠️ ไม่พบ LINE Owner User ID — ข้ามการส่งรายงาน');
        return;
      }

      // สร้างรายงานวันนี้ (รวมทุกสาขาให้เจ้าของร้าน)
      const today = new Date();
      const dateStr = today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');

      const report = await getDailyReport(dateStr);
      const flexMessage = lineBot.formatDailyReport(report);

      // ส่ง Flex Message
      await lineBot.pushFlexMessage(ownerUserId, flexMessage);
      console.log(`✅ ส่งรายงานประจำวัน ${dateStr} สำเร็จ`);

    } catch (error) {
      console.error('❌ ส่งรายงานประจำวันล้มเหลว:', error.message);
    }
  }, {
    timezone: 'Asia/Bangkok'
  });
}

// เริ่มต้น cron job ในรูปแบบ async IIFE
(async () => {
  await startDailyReportCron();
})();

module.exports = { startDailyReportCron };
