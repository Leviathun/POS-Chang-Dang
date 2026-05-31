const generatePayload = require('promptpay-qr');
const QRCode = require('qrcode');
const { getDb } = require('../config/database');

/**
 * สร้าง PromptPay QR Code สำหรับชำระเงิน
 * @param {number} amount - จำนวนเงิน (บาท)
 * @returns {Promise<{qr_data_url: string, amount: number, promptpay_id: string}>}
 */
async function generatePromptPayQR(amount) {
  const db = getDb();

  // อ่าน promptpay_id จากตาราง settings
  const setting = await db.prepare(
    "SELECT value FROM settings WHERE key = 'promptpay_id'"
  ).get();

  const promptpayId = setting ? setting.value : '';

  if (!promptpayId) {
    throw new Error('ยังไม่ได้ตั้งค่า PromptPay ID — กรุณาไปที่ตั้งค่า > PromptPay ID เพื่อใส่เบอร์โทรหรือเลขบัตรประชาชน');
  }

  // สร้าง PromptPay payload
  const payload = generatePayload(promptpayId, { amount });

  // สร้าง QR Code เป็น data URL (base64 PNG)
  const qrDataUrl = await QRCode.toDataURL(payload, {
    type: 'image/png',
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });

  return {
    qr_data_url: qrDataUrl,
    amount,
    promptpay_id: promptpayId
  };
}

module.exports = { generatePromptPayQR };
