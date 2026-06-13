const cron = require('node-cron');
const { getDb } = require('../config/database');
const lineBot = require('./lineBot');
const { getDailyReport } = require('./reports');

/**
 * ตั้งเวลาส่งรายงานยอดขายประจำวันผ่าน LINE (เช็คทุกนาที)
 */
async function startDailyReportCron() {
  console.log('  📅 ระบบเริ่มต้น cron checking สำหรับส่งรายงานยอดขายรายสาขา (ทุก 1 นาที)');

  cron.schedule('* * * * *', async () => {
    // 1. ดึงเวลาปัจจุบันในโซนเวลาไทย (UTC+7)
    const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const hourStr = String(now.getUTCHours()).padStart(2, '0');
    const minuteStr = String(now.getUTCMinutes()).padStart(2, '0');
    const currentHHMM = `${hourStr}:${minuteStr}`;

    try {
      const db = getDb();
      // ค้นหาสาขาที่มีเวลาตั้งค่ารายงานตรงกับเวลาปัจจุบัน
      const scheduledBranches = await db.prepare(
        "SELECT branch_id, value FROM settings WHERE key = 'daily_report_time' AND value = ?"
      ).all(currentHHMM);

      for (const sb of scheduledBranches) {
        const branchId = sb.branch_id;
        
        // ดึงการตั้งค่าของสาขานี้ทั้งหมด
        const settingsRows = await db.prepare("SELECT key, value FROM settings WHERE branch_id = ?").all(branchId);
        const settings = {};
        for (const row of settingsRows) {
          settings[row.key] = row.value;
        }

        const channelToken = settings.line_channel_token;
        const recipientId = settings.line_recipient_id || settings.line_owner_user_id;
        const shopName = settings.shop_name || 'ร้านไก่ทอดช้างแดง';

        // ดึงชื่อสาขา
        const branchInfo = await db.prepare("SELECT name FROM branches WHERE id = ?").get(branchId);
        const branchName = branchInfo ? branchInfo.name : `สาขา ID ${branchId}`;

        if (!channelToken || !recipientId) {
          console.log(`⚠️ [LINE Cron] สาขา ID ${branchId} (${branchName}) ไม่ได้ตั้งค่า line_channel_token หรือ line_recipient_id — ข้ามการส่งรายงาน`);
          continue;
        }

        console.log(`⏰ [LINE Cron] กำลังสร้างและส่งรายงานประจำวันสำหรับสาขา: ${branchName} (${currentHHMM})...`);

        // สร้างรายงานของวันของสาขานี้
        const todayStr = now.getUTCFullYear() + '-' +
          String(now.getUTCMonth() + 1).padStart(2, '0') + '-' +
          String(now.getUTCDate()).padStart(2, '0');

        const report = await getDailyReport(todayStr, branchId);
        
        // จัดรูปแบบ bubble flex message
        const flexMessage = lineBot.formatDailyReport({
          ...report,
          shopName: `${shopName} (${branchName})`
        });

        // ส่ง Flex Message โดยใช้ token และ LINE User ID ของแต่ละสาขา
        await lineBot.pushFlexMessage(recipientId, flexMessage, channelToken);
        console.log(`✅ [LINE Cron] ส่งรายงานประจำวันของสาขา ${branchName} เข้า LINE (${todayStr}) สำเร็จ`);
      }
    } catch (error) {
      console.error('❌ [LINE Cron] ตรวจสอบหรือส่งรายงานยอดขายล้มเหลว:', error.message);
    }
  }, {
    timezone: 'Asia/Bangkok'
  });
}

// เริ่มต้น cron checking
(async () => {
  await startDailyReportCron();
})();

module.exports = { startDailyReportCron };
