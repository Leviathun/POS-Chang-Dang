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
  KICK_DRAWER: [ESC, 112, 0, 20, 100, ESC, 112, 1, 20, 100, 16, 20, 0, 0, 0, 16, 20, 1, 0, 1, 16, 20, 1, 1, 1, 16, 20, 1, 0, 5, 7], // Universal kick: Epson/Star (ESC p) + Sunmi integrated (DLE DC4 variations) + Beep (BEL)
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

export function encodeString(str) {
  // Use TIS-620 / CP874 encoding for all printing modes to ensure RawBT parser reads CP874 bytes correctly
  return encodeTIS620(str);
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
    const encoded = encodeString(str);
    return this.add(encoded);
  }

  line(str = '') {
    return this.text(str + '\n');
  }

  init() { 
    return this.add(CMD.INIT)
               .add([27, 116, 26]);   // Select standard Epson Thai Codepage (CP874) for all modes so RawBT decodes it correctly
  }
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
  return {
    vendorId: vendorId ? parseInt(vendorId, 10) : null,
    productId: productId ? parseInt(productId, 10) : null,
    autoPrint,
    autoKick,
    connectionType: 'usb',
    printMode: 'image',
  };
}

// Save configuration
export function savePrinterConfig(vendorId, productId, autoPrint, autoKick) {
  if (vendorId !== undefined && vendorId !== null) localStorage.setItem('printer_vendor_id', vendorId);
  if (productId !== undefined && productId !== null) localStorage.setItem('printer_product_id', productId);
  if (autoPrint !== undefined && autoPrint !== null) localStorage.setItem('printer_auto_print', String(autoPrint));
  if (autoKick !== undefined && autoKick !== null) localStorage.setItem('printer_auto_kick', String(autoKick));
}

// Clear configuration
export function clearPrinterConfig() {
  localStorage.removeItem('printer_vendor_id');
  localStorage.removeItem('printer_product_id');
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
  
  try {
    await device.claimInterface(epInfo.interfaceNumber);
    activeDevice = device;
    activeEndpointOut = epInfo.endpointNumber;
    return device;
  } catch (err) {
    if (err.name === 'SecurityError' || err.message.includes('claimInterface') || err.message.includes('already claimed')) {
      throw new Error('เบราว์เซอร์ไม่สามารถเข้าถึงเครื่องพิมพ์ได้ เนื่องจากสิทธิ์ USB กำลังถูกใช้โดยแอปพลิเคชันอื่นอยู่ (เช่น แอป RawBT บนเครื่องแท็บเล็ต) กรุณาเข้าไปที่แอป RawBT เพื่อยกเลิกการเชื่อมต่อ USB หรือเลือกประเภทการเชื่อมต่อในเว็บ POS นี้เป็น "เครื่องพิมพ์ในตัวเครื่อง POS (Sunmi/RawBT)" แทน');
    }
    throw err;
  }
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
  // Return true if activeDevice is connected OR if a printer is configured (so we can trigger fallbacks if claim fails)
  return activeDevice !== null || (config.vendorId !== null && config.productId !== null);
}

// Print raw bytes via local WebSocket server (companion app Server for RawBT)
export function printViaWebSocket(bytes) {
  return new Promise((resolve, reject) => {
    // Port 40213 is the default WebSocket port for Server for RawBT
    const socket = new WebSocket('ws://127.0.0.1:40213/');
    socket.binaryType = 'arraybuffer';
    
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error('เชื่อมต่อ Server for RawBT (Port 40213) ล้มเหลว (Timeout)'));
    }, 1500);
    
    socket.onopen = () => {
      clearTimeout(timeout);
      socket.send(bytes.buffer);
      setTimeout(() => {
        socket.close();
        resolve(true);
      }, 100);
    };
    
    socket.onerror = (err) => {
      clearTimeout(timeout);
      reject(new Error('ไม่สามารถเชื่อมต่อกับ Server for RawBT (WebSocket Error)'));
    };
  });
}

// Helper to wrap promises with a timeout
function timeoutPromise(promise, ms, errorMsg = 'หมดเวลารอคำสั่ง (Timeout)') {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMsg));
    }, ms);
    
    promise.then(
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// Send raw byte array to printer
export async function sendRawToPrinter(bytes) {
  // 1. Primary path: Direct WebUSB printing
  try {
    if (!activeDevice || !activeEndpointOut) {
      const device = await autoConnectPrinter();
      if (!device) {
        throw new Error('เครื่องพิมพ์ไม่ได้เชื่อมต่ออยู่');
      }
    }
    
    await timeoutPromise(
      activeDevice.transferOut(activeEndpointOut, bytes),
      5000,
      'ส่งข้อมูลไปยังเครื่องพิมพ์ล้มเหลว (การเชื่อมต่อไม่ตอบสนอง) กรุณาปิด-เปิดเครื่องพิมพ์ใหม่ หรือเสียบสาย USB ใหม่'
    );
    return; // Direct USB Success!
  } catch (err) {
    console.warn('Direct WebUSB printing failed, attempting fallback to RawBT App:', err);
    
    // Reset USB device state if it was a connection error so next print tries fresh connection
    activeDevice = null;
    activeEndpointOut = null;
    
    // 2. Fallback path: Try printing via RawBT WebSocket (runs locally on device)
    try {
      await printViaWebSocket(bytes);
      console.log('Printed successfully via RawBT WebSocket fallback!');
      return;
    } catch (wsErr) {
      console.warn('RawBT WebSocket fallback failed, redirecting to RawBT Intent link:', wsErr);
      
      // 3. Last resort fallback: Redirect via Chrome Intent URL to RawBT app
      try {
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);
        window.location.href = 'intent:#Intent;action=ru.a402d.rawbtprinter.action.PRINT;category=android.intent.category.DEFAULT;type=application/octet-stream;S.base64=' + base64Data + ';end;';
      } catch (intentErr) {
        console.error('RawBT Intent redirect failed:', intentErr);
        throw new Error('ไม่สามารถพิมพ์ผ่านพอร์ต USB หรือแอป RawBT ได้: ' + err.message);
      }
    }
  }
}

// Open cash drawer only (Async WebUSB path)
export async function kickDrawer() {
  const bytes = new EscPosBuilder().kick().build();
  await sendRawToPrinter(bytes);
}

// Open cash drawer only (Sync Chrome Intent path)
export function kickDrawerSync() {
  const bytes = new EscPosBuilder().kick().build();
  sendRawToPrinterSync(bytes);
}

// Helper to format currency (no currency symbol for perfect vertical alignment of digits)
function formatCurrencyVal(amount) {
  return Number(amount).toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// Calculate visual length of Thai string by removing combining marks (vowels/tones)
function getThaiVisualLength(str) {
  // Matches all Thai combining marks that do not occupy horizontal space
  const thaiCombiningMarks = /[\u0e31\u0e34-\u0e3a\u0e47-\u0e4e]/g;
  return str.replace(thaiCombiningMarks, '').length;
}

// Format line item with left aligned item name/qty, right aligned price (adjusted to 28 chars for narrow 58mm printers)
function formatLine(leftText, rightText, width = 28) {
  const leftLen = getThaiVisualLength(leftText);
  const rightLen = getThaiVisualLength(rightText);
  const padLength = width - leftLen - rightLen;
  if (padLength <= 0) {
    return leftText + ' ' + rightText;
  }
  return leftText + ' '.repeat(padLength) + rightText;
}

// Synchronous version to bypass Chrome Android async microtask gesture blocks
export function sendRawToPrinterSync(bytes) {
  const config = getSavedPrinterConfig();
  if (config.connectionType === 'rawbt') {
    try {
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = btoa(binary);
      window.location.href = 'intent:#Intent;action=ru.a402d.rawbtprinter.action.PRINT;category=android.intent.category.DEFAULT;type=application/octet-stream;S.base64=' + base64Data + ';end;';
      return true;
    } catch (err) {
      console.error('RawBT Intent redirect failed:', err);
      throw new Error('ไม่สามารถพิมพ์ผ่านหน้าต่างแอป RawBT ได้: ' + err.message);
    }
  }
  return false;
}

// Render receipt onto a canvas using high quality layout for raster graphics printing
// Render receipt onto a canvas using high quality layout for raster graphics printing
function renderReceiptToCanvas(order, cartItems, options) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const width = 384; // 58mm (standard thermal printer width)
  // We will dynamically measure height
  const drawOps = [];
  let currentY = 15;
  
  // Helper to wrap Thai text
  function wrapText(text, maxWidth, fontSize, style = 'normal') {
    ctx.font = `${style === 'bold' ? 'bold' : 'normal'} ${fontSize}px Sarabun, system-ui, -apple-system, sans-serif`;
    let words = text.split('');
    let lines = [];
    let currentLine = '';
    
    for (let i = 0; i < words.length; i++) {
      let testLine = currentLine + words[i];
      let metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
    return lines;
  }
  
  function addText(text, align = 'left', style = 'normal', size = 20) {
    const maxTextWidth = width - 20;
    const lines = wrapText(text, maxTextWidth, size, style);
    
    lines.forEach(line => {
      drawOps.push({
        type: 'text',
        text: line,
        align,
        style,
        size,
        y: currentY
      });
      currentY += size + 6;
    });
    currentY += 4;
  }
  
  function addRow(leftText, rightText, style = 'normal', size = 20) {
    ctx.font = `${style === 'bold' ? 'bold' : 'normal'} ${size}px Sarabun, system-ui, -apple-system, sans-serif`;
    const rightWidth = ctx.measureText(rightText).width;
    const maxLeftWidth = width - 30 - rightWidth;
    const leftLines = wrapText(leftText, maxLeftWidth, size, style);
    
    drawOps.push({
      type: 'row',
      left: leftText,
      right: rightText,
      style,
      size,
      y: currentY
    });
    
    currentY += (leftLines.length * (size + 4)) + 6;
  }
  
  function addLine() {
    drawOps.push({
      type: 'line',
      y: currentY
    });
    currentY += 15;
  }

  function addSpace(height = 10) {
    currentY += height;
  }

  // --- Build operations ---
  const shopName = options.shopName || 'ร้านไก่ทอดช้างแดง';
  const branchName = options.branchName || 'สาขาหลัก';
  const phone = options.phone || '';
  
  addText(shopName, 'center', 'bold', 36);
  addText(`สาขา: ${branchName}`, 'center', 'normal', 24);
  if (phone) {
    addText(`โทร: ${phone}`, 'center', 'normal', 24);
  }
  
  addLine();
  
  const orderNumber = order.order_number || order.id || '-';
  const rawDate = order.created_at || new Date().toISOString();
  const dateObj = new Date(rawDate);
  const formattedDate = dateObj.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' +
                        dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  addText(`เลขที่บิล: #${orderNumber}`, 'left', 'normal', 22);
  addText(`วันที่: ${formattedDate}`, 'left', 'normal', 22);
  
  addLine();
  
  const items = Array.isArray(cartItems) ? cartItems : Array.from(cartItems.values() || []);
  items.forEach(cartItem => {
    const itemName = cartItem.item?.name || cartItem.name || 'สินค้า';
    const qty = cartItem.quantity || 1;
    const itemPrice = cartItem.item?.price || cartItem.price || 0;
    const subtotal = qty * itemPrice;
    
    addRow(`${itemName} x${qty}`, formatCurrencyVal(subtotal), 'normal', 24);
    
    if (cartItem.item?.options && Array.isArray(cartItem.item.options.selected_items)) {
      const opts = cartItem.item.options.selected_items.map(i => `${i.name}`).join(', ');
      addText(`  * ผสม: ${opts}`, 'left', 'normal', 18);
    } else if (cartItem.options && Array.isArray(cartItem.options.selected_items)) {
      const opts = cartItem.options.selected_items.map(i => `${i.name}`).join(', ');
      addText(`  * ผสม: ${opts}`, 'left', 'normal', 18);
    }
  });

  if (order.modifiers && Array.isArray(order.modifiers) && order.modifiers.length > 0) {
    addText(' - เครื่องปรุงรสเพิ่มเติม -', 'center', 'normal', 20);
    order.modifiers.forEach(mod => {
      addRow(`  + ${mod.name}`, '฿0', 'normal', 22);
    });
  }
  
  addLine();
  
  const total = order.total !== undefined ? order.total : (order.net_total || 0);
  const discount = order.discount || 0;
  const netTotal = total;
  const subtotalBeforeDiscount = total + discount;
  
  if (discount > 0) {
    addRow('ยอดรวม:', formatCurrencyVal(subtotalBeforeDiscount), 'normal', 24);
    addRow('ส่วนลด:', `-${formatCurrencyVal(discount)}`, 'normal', 24);
  }
  
  addRow('ยอดชำระทั้งสิ้น:', formatCurrencyVal(netTotal), 'bold', 32);
  
  if (order.payment_method === 'cash') {
    const cashReceived = order.cash_received || 0;
    const change = Math.max(0, cashReceived - netTotal);
    addLine();
    addRow('รับเงินสด:', formatCurrencyVal(cashReceived), 'normal', 24);
    addRow('เงินทอน:', formatCurrencyVal(change), 'normal', 24);
  } else {
    const paymentLabels = {
      'qr': 'QR Code / โอนเงิน',
      'gov': 'โครงการรัฐ',
      'delivery': 'เดลิเวอรี'
    };
    const methodLabel = paymentLabels[order.payment_method] || order.payment_method;
    addLine();
    addText(`ชำระเงินผ่าน: ${methodLabel}`, 'left', 'normal', 24);
  }
  
  addLine();
  addText('ขอบคุณที่ใช้บริการ', 'center', 'bold', 26);
  addSpace(50); // padding for physical feed
  
  // --- Perform drawing ---
  canvas.width = width;
  canvas.height = currentY;
  
  // Fill white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, currentY);
  
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';
  
  drawOps.forEach(op => {
    const fontName = 'Sarabun, system-ui, -apple-system, sans-serif'; 
    ctx.font = `${op.style === 'bold' ? 'bold' : 'normal'} ${op.size}px ${fontName}`;
    
    if (op.type === 'text') {
      ctx.textAlign = op.align;
      let x = 10;
      if (op.align === 'center') x = width / 2;
      if (op.align === 'right') x = width - 10;
      ctx.fillText(op.text, x, op.y);
    } else if (op.type === 'row') {
      const rightWidth = ctx.measureText(op.right).width;
      const maxLeftWidth = width - 30 - rightWidth;
      const leftLines = wrapText(op.left, maxLeftWidth, op.size, op.style);
      
      ctx.textAlign = 'left';
      let rowY = op.y;
      leftLines.forEach(line => {
        ctx.fillText(line, 10, rowY);
        rowY += op.size + 4;
      });
      
      ctx.textAlign = 'right';
      ctx.fillText(op.right, width - 10, op.y);
    } else if (op.type === 'line') {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.setLineDash([4, 4]); // dashed line like receipt
      ctx.moveTo(10, op.y);
      ctx.lineTo(width - 10, op.y);
      ctx.stroke();
      ctx.setLineDash([]); // reset
    }
  });
  
  return canvas;
}

// Convert HTML5 Canvas to ESC/POS Raster Image Format (GS v 0)
function convertCanvasToEscPosRaster(canvas) {
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const width = canvas.width;
  const height = canvas.height;
  const widthBytes = Math.ceil(width / 8);
  const buffer = [];

  // GS v 0 0 widthBytesL widthBytesH heightL heightH
  buffer.push(29, 118, 48, 0);
  buffer.push(widthBytes & 0xFF, (widthBytes >> 8) & 0xFF);
  buffer.push(height & 0xFF, (height >> 8) & 0xFF);

  for (let y = 0; y < height; y++) {
    for (let xByte = 0; xByte < widthBytes; xByte++) {
      let byteVal = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = xByte * 8 + bit;
        let pixelBlack = 0;
        if (x < width) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          
          if (a < 128) {
            pixelBlack = 0;
          } else {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            pixelBlack = gray < 128 ? 1 : 0;
          }
        }
        byteVal = (byteVal << 1) | pixelBlack;
      }
      buffer.push(byteVal);
    }
  }
  return new Uint8Array(buffer);
}

// Format and build receipt ESC/POS byte array
function buildReceiptBytes(order, cartItems = [], options = {}) {
  const config = getSavedPrinterConfig();
  const builder = new EscPosBuilder();
  
  // 1. Initialize printer and open drawer if auto-kick is set
  builder.init();
  const isCash = order && (order.payment_method === 'cash' || !order.payment_method);
  if (((config.autoKick && isCash) || options.forceKick) && !options.skipKick) {
    builder.kick();
  }
  const builderBytes = builder.build();

  // 2. Generate raster bytes
  const canvas = renderReceiptToCanvas(order, cartItems, options);
  const rasterBytes = convertCanvasToEscPosRaster(canvas);

  // 3. Cut
  const cutBuilder = new EscPosBuilder();
  cutBuilder.cut();
  const cutBytes = cutBuilder.build();

  // Combine [init & kick] + [raster image] + [cut]
  const combined = new Uint8Array(builderBytes.length + rasterBytes.length + cutBytes.length);
  combined.set(builderBytes, 0);
  combined.set(rasterBytes, builderBytes.length);
  combined.set(cutBytes, builderBytes.length + rasterBytes.length);
  return combined;
}

// Build plain text receipt string (UTF-8 compatible for RawBT)
export function buildReceiptTextString(order, cartItems = [], options = {}) {
  const shopName = options.shopName || 'ร้านไก่ทอดช้างแดง';
  const branchName = options.branchName || 'สาขาหลัก';
  const phone = options.phone || '';
  
  const orderNumber = order.order_number || order.id || '-';
  const rawDate = order.created_at || new Date().toISOString();
  const dateObj = new Date(rawDate);
  const formattedDate = dateObj.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' +
                        dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        
  let text = '';
  text += `   ${shopName}\n`;
  text += `   สาขา: ${branchName}\n`;
  if (phone) {
    text += `   โทร: ${phone}\n`;
  }
  text += '============================\n';
  text += `เลขที่บิล: #${orderNumber}\n`;
  text += `วันที่: ${formattedDate}\n`;
  text += '----------------------------\n';
  
  const items = Array.isArray(cartItems) ? cartItems : Array.from(cartItems.values() || []);
  items.forEach(cartItem => {
    let itemName = cartItem.item?.name || cartItem.name || 'สินค้า';
    // Truncate name to 14 characters to prevent wrapping on 58mm printer
    if (itemName.length > 14) {
      itemName = itemName.substring(0, 13) + '..';
    }
    const qty = cartItem.quantity || 1;
    const itemPrice = cartItem.item?.price || cartItem.price || 0;
    const subtotal = qty * itemPrice;
    
    text += formatLine(`${itemName} x${qty}`, formatCurrencyVal(subtotal)) + '\n';
    
    if (cartItem.item?.options && Array.isArray(cartItem.item.options.selected_items)) {
      const opts = cartItem.item.options.selected_items.map(i => `${i.name} (${i.weight}ก.)`).join(', ');
      text += `  * ผสม: ${opts}\n`;
    } else if (cartItem.options && Array.isArray(cartItem.options.selected_items)) {
      const opts = cartItem.options.selected_items.map(i => `${i.name} (${i.weight}ก.)`).join(', ');
      text += `  * ผสม: ${opts}\n`;
    }
  });
  
  // Modifiers
  if (order.modifiers && Array.isArray(order.modifiers) && order.modifiers.length > 0) {
    text += ' - เครื่องปรุงรสเพิ่มเติม -\n';
    order.modifiers.forEach(mod => {
      text += formatLine(`  + ${mod.name}`, '฿0') + '\n';
    });
  }
  
  text += '----------------------------\n';
  
  const total = order.total !== undefined ? order.total : (order.net_total || 0);
  const discount = order.discount || 0;
  const netTotal = total;
  const subtotalBeforeDiscount = total + discount;
  
  if (discount > 0) {
    text += formatLine('ยอดรวม:', formatCurrencyVal(subtotalBeforeDiscount)) + '\n';
    text += formatLine('ส่วนลด:', `-${formatCurrencyVal(discount)}`) + '\n';
  }
  text += formatLine('ยอดชำระทั้งสิ้น:', formatCurrencyVal(netTotal)) + '\n';
  
  if (order.payment_method === 'cash') {
    const cashReceived = order.cash_received || 0;
    const change = Math.max(0, cashReceived - netTotal);
    text += '----------------------------\n';
    text += formatLine('รับเงินสด:', formatCurrencyVal(cashReceived)) + '\n';
    text += formatLine('เงินทอน:', formatCurrencyVal(change)) + '\n';
  } else {
    const paymentLabels = {
      'qr': 'QR Code / โอนเงิน',
      'gov': 'โครงการรัฐ',
      'delivery': 'เดลิเวอรี'
    };
    const methodLabel = paymentLabels[order.payment_method] || order.payment_method;
    text += '----------------------------\n';
    text += `ชำระเงินผ่าน: ${methodLabel}\n`;
  }
  
  text += '============================\n';
  text += 'ขอบคุณที่ใช้บริการ\n';
  text += '\n\n\n\n';
  
  return text;
}

// Build a minimal HTML table structure for RawBT to guarantee pixel-perfect numeric digit alignment
export function buildReceiptHTMLMinimal(order, cartItems = [], options = {}) {
  const shopName = options.shopName || 'ร้านไก่ทอดช้างแดง';
  const branchName = options.branchName || 'สาขาหลัก';
  const phone = options.phone || '';
  
  const orderNumber = order.order_number || order.id || '-';
  const rawDate = order.created_at || new Date().toISOString();
  const dateObj = new Date(rawDate);
  const formattedDate = dateObj.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' +
                        dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        
  let itemsRows = '';
  const items = Array.isArray(cartItems) ? cartItems : Array.from(cartItems.values() || []);
  items.forEach(cartItem => {
    const itemName = cartItem.item?.name || cartItem.name || 'สินค้า';
    const qty = cartItem.quantity || 1;
    const itemPrice = cartItem.item?.price || cartItem.price || 0;
    const subtotal = qty * itemPrice;
    
    itemsRows += `
      <tr>
        <td align="left" valign="top" style="font-family:monospace;font-size:11px;">${itemName} x${qty}</td>
        <td align="right" valign="top" style="font-family:monospace;font-size:11px;padding-left:10px;">${formatCurrencyVal(subtotal)}</td>
      </tr>
    `;
    
    if (cartItem.item?.options && Array.isArray(cartItem.item.options.selected_items)) {
      const opts = cartItem.item.options.selected_items.map(i => `${i.name}`).join(',');
      itemsRows += `<tr><td colspan="2" style="font-family:monospace;font-size:9px;color:#555;padding-left:8px;text-align:left;">* ผสม: ${opts}</td></tr>`;
    } else if (cartItem.options && Array.isArray(cartItem.options.selected_items)) {
      const opts = cartItem.options.selected_items.map(i => `${i.name}`).join(',');
      itemsRows += `<tr><td colspan="2" style="font-family:monospace;font-size:9px;color:#555;padding-left:8px;text-align:left;">* ผสม: ${opts}</td></tr>`;
    }
  });
  
  // Modifiers
  if (order.modifiers && Array.isArray(order.modifiers) && order.modifiers.length > 0) {
    itemsRows += '<tr><td colspan="2" style="font-family:monospace;font-size:9px;border-top:1px dashed #ccc;text-align:left;">- เพิ่มเติม -</td></tr>';
    order.modifiers.forEach(mod => {
      itemsRows += `
        <tr>
          <td align="left" style="font-family:monospace;font-size:10px;padding-left:8px;">+ ${mod.name}</td>
          <td align="right" style="font-family:monospace;font-size:10px;">0</td>
        </tr>
      `;
    });
  }
  
  const total = order.total !== undefined ? order.total : (order.net_total || 0);
  const discount = order.discount || 0;
  const netTotal = total;
  const subtotalBeforeDiscount = total + discount;
  
  let totalsRows = '';
  if (discount > 0) {
    totalsRows += `
      <tr>
        <td align="left" style="font-family:monospace;font-size:11px;">ยอดรวม:</td>
        <td align="right" style="font-family:monospace;font-size:11px;">${formatCurrencyVal(subtotalBeforeDiscount)}</td>
      </tr>
      <tr>
        <td align="left" style="font-family:monospace;font-size:11px;">ส่วนลด:</td>
        <td align="right" style="font-family:monospace;font-size:11px;">-${formatCurrencyVal(discount)}</td>
      </tr>
    `;
  }
  totalsRows += `
    <tr style="font-weight:bold;font-size:12px;">
      <td align="left" style="font-family:monospace;">ยอดชำระทั้งสิ้น:</td>
      <td align="right" style="font-family:monospace;">${formatCurrencyVal(netTotal)}</td>
    </tr>
  `;
  
  let paymentRows = '';
  if (order.payment_method === 'cash') {
    const cashReceived = order.cash_received || 0;
    const change = Math.max(0, cashReceived - netTotal);
    paymentRows = `
      <tr><td colspan="2"><hr style="border-top:1px dashed #000;margin:3px 0;"></td></tr>
      <tr>
        <td align="left" style="font-family:monospace;font-size:11px;">รับเงินสด:</td>
        <td align="right" style="font-family:monospace;font-size:11px;">${formatCurrencyVal(cashReceived)}</td>
      </tr>
      <tr>
        <td align="left" style="font-family:monospace;font-size:11px;">เงินทอน:</td>
        <td align="right" style="font-family:monospace;font-size:11px;">${formatCurrencyVal(change)}</td>
      </tr>
    `;
  } else {
    const paymentLabels = {
      'qr': 'QR Code / โอนเงิน',
      'gov': 'โครงการรัฐ',
      'delivery': 'เดลิเวอรี'
    };
    const methodLabel = paymentLabels[order.payment_method] || order.payment_method;
    paymentRows = `
      <tr><td colspan="2"><hr style="border-top:1px dashed #000;margin:3px 0;"></td></tr>
      <tr>
        <td align="left" colspan="2" style="font-family:monospace;font-size:11px;text-align:left;">ชำระเงินผ่าน: ${methodLabel}</td>
      </tr>
    `;
  }
  
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:monospace;font-size:11px;color:#000;margin:0;padding:2px;width:100%;box-sizing:border-box;}hr{border:none;border-top:1px solid #000;margin:4px 0;}</style></head><body><div style="font-weight:bold;font-size:14px;text-align:center;font-family:monospace;">${shopName}</div><div style="text-align:center;font-size:10px;font-family:monospace;">สาขา: ${branchName}</div>${phone?`<div style="text-align:center;font-size:10px;font-family:monospace;">โทร: ${phone}</div>`:''}<hr><div style="font-size:10px;font-family:monospace;text-align:left;">บิล: #${orderNumber}</div><div style="font-size:10px;margin-bottom:4px;font-family:monospace;text-align:left;">วันที่: ${formattedDate}</div><hr><table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size:11px;">${itemsRows}<tr><td colspan="2"><hr style="border-top:1px dashed #000;margin:4px 0;"></td></tr>${totalsRows}${paymentRows}</table><hr><div style="text-align:center;font-weight:bold;font-size:11px;margin-top:4px;font-family:monospace;">ขอบคุณที่ใช้บริการ</div><div style="height:35px;"></div></body></html>`;
}

// Print Receipt (Async WebUSB path)
export async function printReceipt(order, cartItems = [], options = {}) {
  const config = getSavedPrinterConfig();
  if (config.connectionType === 'rawbt') {
    if (config.printMode === 'html') {
      const htmlString = buildReceiptHTMLMinimal(order, cartItems, options);
      const base64Html = btoa(unescape(encodeURIComponent(htmlString)));
      window.location.href = 'intent:data:text/html;base64,' + base64Html + '#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;';
    } else if (config.printMode === 'text') {
      const textString = buildReceiptTextString(order, cartItems, options);
      const utf8Bytes = new TextEncoder().encode(textString);
      let binary = '';
      const len = utf8Bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(utf8Bytes[i]);
      }
      const base64Data = btoa(binary);
      window.location.href = 'intent:data:text/plain;base64,' + base64Data + '#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;';
    } else {
      // 'image' mode (default) - Sends raw monochrome raster bytes to RawBT
      const bytes = buildReceiptBytes(order, cartItems, options);
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = btoa(binary);
      window.location.href = 'intent:#Intent;action=ru.a402d.rawbtprinter.action.PRINT;category=android.intent.category.DEFAULT;type=application/octet-stream;S.base64=' + base64Data + ';end;';
    }
    return;
  }
  const bytes = buildReceiptBytes(order, cartItems, options);
  await sendRawToPrinter(bytes);
}

// Print Receipt (Sync Chrome Intent path)
export function printReceiptSync(order, cartItems = [], options = {}) {
  const config = getSavedPrinterConfig();
  if (config.connectionType === 'rawbt') {
    if (config.printMode === 'html') {
      const htmlString = buildReceiptHTMLMinimal(order, cartItems, options);
      const base64Html = btoa(unescape(encodeURIComponent(htmlString)));
      window.location.href = 'intent:data:text/html;base64,' + base64Html + '#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;';
    } else if (config.printMode === 'text') {
      const textString = buildReceiptTextString(order, cartItems, options);
      const utf8Bytes = new TextEncoder().encode(textString);
      let binary = '';
      const len = utf8Bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(utf8Bytes[i]);
      }
      const base64Data = btoa(binary);
      window.location.href = 'intent:data:text/plain;base64,' + base64Data + '#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;';
    } else {
      // 'image' mode (default) - Sends raw monochrome raster bytes to RawBT
      const bytes = buildReceiptBytes(order, cartItems, options);
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = btoa(binary);
      window.location.href = 'intent:#Intent;action=ru.a402d.rawbtprinter.action.PRINT;category=android.intent.category.DEFAULT;type=application/octet-stream;S.base64=' + base64Data + ';end;';
    }
    return;
  }
  const bytes = buildReceiptBytes(order, cartItems, options);
  sendRawToPrinterSync(bytes);
}
