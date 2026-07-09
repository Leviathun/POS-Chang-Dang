/**
 * WebUSB ESC/POS Printer Utility for Chang Dang POS
 * Supports Thai TIS-620/CP874 Encoding, Receipt Formatting, and Cash Drawer kicking.
 */

// ESC/POS control characters
const ESC = 27;
const GS = 29;

const CMD = {
  INIT: [ESC, 64],                // Initialize printer
  ALIGN_LEFT: [ESC, 97, 0],       // Align left
  ALIGN_CENTER: [ESC, 97, 1],     // Align center
  ALIGN_RIGHT: [ESC, 97, 2],      // Align right
  FONT_NORMAL: [GS, 33, 0],       // Normal text size
  FONT_LARGE: [GS, 33, 17],       // Double height & width (1x width, 1x height extra)
  FONT_BOLD_ON: [ESC, 69, 1],     // Turn bold on
  FONT_BOLD_OFF: [ESC, 69, 0],    // Turn bold off
  CUT: [GS, 86, 66, 0],           // Feed and cut paper
  KICK_DRAWER: [ESC, 112, 0, 25, 250], // Kick Cash Drawer 1 (Pin 2: 50ms pulse, 500ms delay)
};

// Convert Thai Unicode characters (0x0E01 - 0x0E5B) to TIS-620 / CP874 bytes
export function encodeTIS620(str) {
  const buffer = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0x0E01 && code <= 0x0E5B) {
      // Mapping Thai Unicode to CP874: byte = unicode_code - 3584 + 160
      buffer.push(code - 0x0E00 + 0xA0);
    } else if (code < 128) {
      buffer.push(code);
    } else {
      // Special mappings
      if (code === 0x0E3F) {
        buffer.push(0xDF); // Thai Baht sign '฿' in CP874 is 0xDF
      } else if (code === 0x2013 || code === 0x2014) {
        buffer.push(0x2D); // En dash, Em dash to '-'
      } else {
        buffer.push(63);   // '?' for unmappable characters
      }
    }
  }
  return new Uint8Array(buffer);
}

// EscPos Command Builder
class EscPosBuilder {
  constructor() {
    this.buffer = [];
  }

  add(bytes) {
    if (Array.isArray(bytes) || bytes instanceof Uint8Array) {
      for (let i = 0; i < bytes.length; i++) {
        this.buffer.push(bytes[i]);
      }
    } else {
      this.buffer.push(bytes);
    }
    return this;
  }

  text(str) {
    const encoded = encodeTIS620(str);
    return this.add(encoded);
  }

  line(str = '') {
    return this.text(str + '\n');
  }

  init() { return this.add(CMD.INIT); }
  left() { return this.add(CMD.ALIGN_LEFT); }
  center() { return this.add(CMD.ALIGN_CENTER); }
  right() { return this.add(CMD.ALIGN_RIGHT); }
  normal() { return this.add(CMD.FONT_NORMAL).add(CMD.FONT_BOLD_OFF); }
  large() { return this.add(CMD.FONT_LARGE).add(CMD.FONT_BOLD_ON); }
  boldOn() { return this.add(CMD.FONT_BOLD_ON); }
  boldOff() { return this.add(CMD.FONT_BOLD_OFF); }
  cut() { return this.add(CMD.CUT); }
  kick() { return this.add(CMD.KICK_DRAWER); }

  feed(lines = 1) {
    for (let i = 0; i < lines; i++) {
      this.add(10); // LF
    }
    return this;
  }

  build() {
    return new Uint8Array(this.buffer);
  }
}

// ─── USB Device Management ───
let activeDevice = null;
let activeEndpointOut = null;

// Get stored configuration
export function getSavedPrinterConfig() {
  const vendorId = localStorage.getItem('printer_vendor_id');
  const productId = localStorage.getItem('printer_product_id');
  const autoPrint = localStorage.getItem('printer_auto_print') !== 'false';
  const autoKick = localStorage.getItem('printer_auto_kick') !== 'false';
  const connectionType = localStorage.getItem('printer_connection_type') || 'usb';
  return {
    vendorId: vendorId ? parseInt(vendorId, 10) : null,
    productId: productId ? parseInt(productId, 10) : null,
    autoPrint,
    autoKick,
    connectionType,
  };
}

// Save configuration
export function savePrinterConfig(vendorId, productId, autoPrint, autoKick, connectionType) {
  if (vendorId !== undefined && vendorId !== null) localStorage.setItem('printer_vendor_id', vendorId);
  if (productId !== undefined && productId !== null) localStorage.setItem('printer_product_id', productId);
  if (autoPrint !== undefined && autoPrint !== null) localStorage.setItem('printer_auto_print', String(autoPrint));
  if (autoKick !== undefined && autoKick !== null) localStorage.setItem('printer_auto_kick', String(autoKick));
  if (connectionType !== undefined && connectionType !== null) localStorage.setItem('printer_connection_type', connectionType);
}

// Clear configuration
export function clearPrinterConfig() {
  localStorage.removeItem('printer_vendor_id');
  localStorage.removeItem('printer_product_id');
  localStorage.removeItem('printer_connection_type');
  // keep auto settings intact
}

// Find Bulk OUT endpoint
function findBulkOutEndpoint(device) {
  if (!device.configurations || device.configurations.length === 0) return null;
  for (const config of device.configurations) {
    for (const iface of config.interfaces) {
      const alternate = iface.alternates[0];
      if (alternate) {
        for (const ep of alternate.endpoints) {
          if (ep.direction === 'out' && ep.type === 'bulk') {
            return {
              interfaceNumber: iface.interfaceNumber,
              endpointNumber: ep.endpointNumber
            };
          }
        }
      }
    }
  }
  return null;
}

// Connect to device
async function connectDevice(device) {
  await device.open();
  if (device.configuration === null) {
    await device.selectConfiguration(1);
  }
  
  const epInfo = findBulkOutEndpoint(device);
  if (!epInfo) {
    throw new Error('ไม่พบช่องส่งข้อมูลเครื่องพิมพ์ (Bulk OUT Endpoint)');
  }
  
  await device.claimInterface(epInfo.interfaceNumber);
  activeDevice = device;
  activeEndpointOut = epInfo.endpointNumber;
  return device;
}

// Ask browser to select USB printer device
export async function requestAndConnectPrinter() {
  if (!navigator.usb) {
    throw new Error('เบราว์เซอร์นี้ไม่รองรับ WebUSB API (กรุณาใช้ Google Chrome หรือ Edge)');
  }
  
  const device = await navigator.usb.requestDevice({ filters: [] });
  await connectDevice(device);
  savePrinterConfig(device.vendorId, device.productId);
  return device;
}

let hasAttemptedAutoConnect = false;

// Attempt to auto connect to previously paired printer
export async function autoConnectPrinter(force = false) {
  if (activeDevice) return activeDevice;
  if (!navigator.usb) return null;
  
  const config = getSavedPrinterConfig();
  if (!config.vendorId || !config.productId) return null;
  
  if (hasAttemptedAutoConnect && !force) {
    return null;
  }
  
  hasAttemptedAutoConnect = true;
  try {
    const devices = await navigator.usb.getDevices();
    const matched = devices.find(d => d.vendorId === config.vendorId && d.productId === config.productId);
    if (matched) {
      await connectDevice(matched);
      return matched;
    }
  } catch (e) {
    console.warn('Auto-connecting USB printer failed:', e);
  }
  return null;
}

// Disconnect active printer
export async function disconnectPrinter() {
  if (activeDevice) {
    try {
      await activeDevice.close();
    } catch (e) {
      console.warn('Closing device failed:', e);
    }
  }
  activeDevice = null;
  activeEndpointOut = null;
  hasAttemptedAutoConnect = false;
  clearPrinterConfig();
}

// Check status
export function isPrinterConnected() {
  const config = getSavedPrinterConfig();
  if (config.connectionType === 'rawbt') {
    return true; // RawBT uses local HTTP requests, so it is always ready to accept print payloads
  }
  return activeDevice !== null;
}

// Send raw byte array to printer
export async function sendRawToPrinter(bytes) {
  const config = getSavedPrinterConfig();
  
  if (config.connectionType === 'rawbt_intent') {
    try {
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = btoa(binary);
      window.location.href = 'rawbt:base64:' + base64Data;
    } catch (err) {
      console.error('RawBT Intent redirect failed:', err);
      throw new Error('ไม่สามารถพิมพ์ผ่านหน้าต่างแอป RawBT ได้: ' + err.message);
    }
    return;
  }
  
  if (config.connectionType === 'rawbt') {
    // 1. Try printing via Server for RawBT WebSocket API (Port 40213 - Silent Print)
    try {
      await new Promise((resolve, reject) => {
        const socket = new WebSocket("ws://localhost:40213/");
        socket.binaryType = "arraybuffer";
        
        const timeout = setTimeout(() => {
          socket.close();
          reject(new Error("WebSocket timeout"));
        }, 1500);
        
        socket.onopen = () => {
          clearTimeout(timeout);
          socket.send(bytes.buffer);
          setTimeout(() => {
            socket.close();
            resolve();
          }, 120);
        };
        
        socket.onerror = (err) => {
          clearTimeout(timeout);
          reject(err);
        };
      });
      console.log('Printed silently via RawBT WebSocket server successfully!');
      return;
    } catch (e) {
      console.warn('RawBT WebSocket print failed, trying URL Scheme redirect:', e);
    }

    // 2. Fallback: Use URL Scheme redirect (opens RawBT app)
    try {
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = btoa(binary);
      window.location.href = 'rawbt:base64:' + base64Data;
    } catch (err) {
      console.error('RawBT URL redirect failed:', err);
      throw new Error('ไม่สามารถพิมพ์ผ่าน RawBT ได้: ' + err.message);
    }
    return;
  }

  // WebUSB Connection fallback
  if (!activeDevice || !activeEndpointOut) {
    const device = await autoConnectPrinter();
    if (!device) {
      throw new Error('เครื่องพิมพ์ไม่ได้เชื่อมต่ออยู่');
    }
  }
  await activeDevice.transferOut(activeEndpointOut, bytes);
}

// Open cash drawer only
export async function kickDrawer() {
  const bytes = new EscPosBuilder().init().kick().build();
  await sendRawToPrinter(bytes);
}

// Helper to format currency
function formatCurrencyVal(amount) {
  return '฿' + Number(amount).toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// Format line item with left aligned item name/qty, right aligned price
function formatLine(leftText, rightText, width = 42) {
  const padLength = width - leftText.length - rightText.length;
  if (padLength <= 0) {
    return leftText + ' ' + rightText;
  }
  return leftText + ' '.repeat(padLength) + rightText;
}

// Print Receipt
export async function printReceipt(order, cartItems = [], options = {}) {
  const config = getSavedPrinterConfig();
  const builder = new EscPosBuilder();
  
  // 1. Initialize printer and open drawer if auto-kick is set
  builder.init();
  if (config.autoKick || options.forceKick) {
    builder.kick();
  }

  // 2. Receipt Headers (Centered)
  const shopName = options.shopName || 'ร้านไก่ทอดช้างแดง';
  const branchName = options.branchName || 'สาขาหลัก';
  const phone = options.phone || '';
  
  builder.center().large().line(shopName);
  builder.normal().line(`สาขา: ${branchName}`);
  if (phone) {
    builder.line(`โทร: ${phone}`);
  }
  builder.line('=========================================='); // 42 chars

  // 3. Order Metadata
  const orderNumber = order.order_number || order.id || '-';
  const rawDate = order.created_at || new Date().toISOString();
  // Simple date format
  const dateObj = new Date(rawDate);
  const formattedDate = dateObj.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' +
                        dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  builder.left().line(`เลขที่บิล: #${orderNumber}`);
  builder.line(`วันที่: ${formattedDate}`);
  builder.line('------------------------------------------');

  // 4. Print Items
  // Normalize items to array
  const items = Array.isArray(cartItems) ? cartItems : Array.from(cartItems.values() || []);
  
  items.forEach(cartItem => {
    // Left: "ItemName xQty", Right: "Price"
    const itemName = cartItem.item?.name || cartItem.name || 'สินค้า';
    const qty = cartItem.quantity || 1;
    const itemPrice = cartItem.item?.price || cartItem.price || 0;
    const subtotal = qty * itemPrice;

    const leftPart = `${itemName} x${qty}`;
    const rightPart = formatCurrencyVal(subtotal);
    builder.line(formatLine(leftPart, rightPart));

    // Print customized ingredients options if exists
    if (cartItem.item?.options && Array.isArray(cartItem.item.options.selected_items)) {
      const opts = cartItem.item.options.selected_items.map(i => `${i.name} (${i.weight}ก.)`).join(', ');
      builder.line(`  * ผสม: ${opts}`);
    } else if (cartItem.options && Array.isArray(cartItem.options.selected_items)) {
      const opts = cartItem.options.selected_items.map(i => `${i.name} (${i.weight}ก.)`).join(', ');
      builder.line(`  * ผสม: ${opts}`);
    }
  });

  // Print Seasonings / Modifiers if exists in order
  if (order.modifiers && Array.isArray(order.modifiers) && order.modifiers.length > 0) {
    builder.line(' - เครื่องปรุงรสเพิ่มเติม -');
    order.modifiers.forEach(mod => {
      builder.line(formatLine(`  + ${mod.name}`, '฿0'));
    });
  }

  builder.line('------------------------------------------');

  // 5. Total Calculations (Right Aligned)
  const total = order.total !== undefined ? order.total : (order.net_total || 0);
  const discount = order.discount || 0;
  const netTotal = total; // Net total is what they pay
  const subtotalBeforeDiscount = total + discount;

  builder.right();
  
  if (discount > 0) {
    builder.line(formatLine('ยอดรวม:', formatCurrencyVal(subtotalBeforeDiscount)));
    builder.line(formatLine('ส่วนลด:', `-${formatCurrencyVal(discount)}`));
  }

  builder.boldOn().large().line(formatLine('ยอดชำระทั้งสิ้น:', formatCurrencyVal(netTotal))).normal().boldOff();

  // Cash Details
  if (order.payment_method === 'cash') {
    const cashReceived = order.cash_received || 0;
    const change = Math.max(0, cashReceived - netTotal);
    builder.line('------------------------------------------');
    builder.line(formatLine('รับเงินสด:', formatCurrencyVal(cashReceived)));
    builder.line(formatLine('เงินทอน:', formatCurrencyVal(change)));
  } else {
    // Print payment method label
    const paymentLabels = {
      'qr': 'QR Code / โอนเงิน',
      'gov': 'โครงการรัฐ',
      'delivery': 'เดลิเวอรี'
    };
    const methodLabel = paymentLabels[order.payment_method] || order.payment_method;
    builder.line(`ชำระเงินผ่าน: ${methodLabel}`);
  }

  builder.line('==========================================');

  // 6. Footer
  builder.center()
         .line('ขอบคุณที่ใช้บริการ')
         .line('อร่อยสะท้านฟากฟ้า ไก่ทอดช้างแดง')
         .feed(4)
         .cut();

  const bytes = builder.build();
  await sendRawToPrinter(bytes);
}
