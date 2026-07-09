<template>
  <!-- Print Receipt Area -->
  <div id="receipt-print-area" class="print-only-receipt">
    <!-- Logo -->
    <div class="receipt-logo-container">
      <img src="@/assets/image/Logo POS.png" alt="Logo" class="receipt-logo" />
    </div>

    <!-- Order Number Box -->
    <div class="receipt-order-box">
      <div class="receipt-order-number">#{{ orderId }}</div>
    </div>
    <div class="receipt-copy-indicator">***** ใบเสร็จรับเงิน *****</div>

    <div class="receipt-divider-solid"></div>

    <!-- Meta Info -->
    <div class="receipt-meta">
      <div class="meta-row">
        <span>เวลา:</span>
        <strong>{{ formattedOrderDate }}</strong>
      </div>
      <div class="meta-row">
        <span>สาขา:</span>
        <strong>{{ activeBranchName }}</strong>
      </div>
      <div class="meta-row" v-if="activeBranchPhone">
        <span>โทร:</span>
        <strong>{{ activeBranchPhone }}</strong>
      </div>
    </div>

    <div class="receipt-divider-solid"></div>

    <!-- Item List -->
    <div class="receipt-items">
      <div v-for="[itemId, cartItem] in cart" :key="itemId" class="receipt-item-group">
        <div class="receipt-item-row">
          <span class="item-qty-name">{{ cartItem.quantity }} x  {{ cartItem.item.name }}</span>
          <span class="item-price">{{ formatCurrency(cartItem.item.price * cartItem.quantity) }}</span>
        </div>
        <!-- Modifiers (if any) -->
        <div v-for="mod in freeModifiers" :key="mod.id" class="receipt-item-row modifier-row">
          <span class="item-qty-name">+  {{ mod.name }}</span>
          <span class="item-price">฿0</span>
        </div>
        <div class="receipt-divider-dashed"></div>
      </div>
    </div>

    <!-- Totals -->
    <div class="receipt-totals">
      <div class="total-row">
        <span>ค่าอาหาร</span>
        <span>{{ formatCurrency(total) }}</span>
      </div>
      <div class="total-row" v-if="discount > 0">
        <span>ส่วนลด</span>
        <span>-{{ formatCurrency(discount) }}</span>
      </div>
      
      <div class="receipt-divider-dashed"></div>
      
      <div class="total-row grand-total-row">
        <span>รวมทั้งหมด</span>
        <span>{{ formatCurrency(netTotal) }}</span>
      </div>
      
      <div class="receipt-divider-dashed"></div>
      
      <div class="total-row payment-method-row">
        <span>ชำระผ่าน:</span>
        <span>{{ getPaymentMethodLabel(paymentMethod) }}</span>
      </div>
      <div class="total-row" v-if="paymentMethod === 'cash'">
        <span>รับเงิน:</span>
        <span>{{ formatCurrency(Number(enteredAmount) || 0) }}</span>
      </div>
      <div class="total-row" v-if="paymentMethod === 'cash'">
        <span>เงินทอน:</span>
        <span>{{ formatCurrency(cashChange) }}</span>
      </div>
    </div>

    <div class="receipt-divider-solid" style="margin-top: 15px;"></div>

    <!-- Footer -->
    <div class="receipt-footer">
      <div>ขอบคุณที่ใช้บริการ</div>
      <div>อร่อยสะท้านฟากฟ้า ไก่ทอดช้างแดง</div>
    </div>
  </div>

  <div id="modal-container" class="active full-screen-modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3>
          <span style="display: inline-flex; align-items: center; gap: 8px;">
            <i :class="success ? 'fa-solid fa-circle-check text-success' : 'fa-solid fa-cash-register'"></i>
            {{ success ? 'ทำรายการสำเร็จ' : 'ชำระเงิน POS' }}
          </span>
        </h3>
        <button v-if="!success" class="modal-close" @click="handleClose">✕</button>
      </div>

      <div class="modal-body flex-1 flex flex-col" style="overflow-y: auto;">
        
        <!-- Step 3: Success Screen -->
        <div v-if="success" id="success-section" class="flex-1 flex flex-center">
          <div class="success-screen card" style="max-width: 480px; width: 100%; border: 1px solid var(--border-color); border-radius: var(--radius-2xl); padding: var(--space-3xl); box-shadow: var(--shadow-lg);">
            <div class="success-checkmark">✓</div>
            <div class="success-title text-success font-bold text-2xl" style="margin-bottom: var(--space-md);">ชำระเงินสำเร็จ!</div>
            
            <div class="success-details card" style="background: rgba(244, 162, 97, 0.03); border: 1px dashed var(--border-color); padding: var(--space-lg); text-align: left; width: 100%; margin: var(--space-lg) 0;">
              <div class="flex flex-between mb-sm text-sm">
                <span style="color: var(--text-secondary);">เลขที่บิล:</span>
                <strong style="color: var(--text-primary);">#{{ orderId }}</strong>
              </div>
              <div class="flex flex-between mb-sm text-sm">
                <span style="color: var(--text-secondary);">สถานะบิล:</span>
                <strong :style="{ color: isCheckingOut ? '#ff9500' : 'var(--success)' }">
                  <i v-if="isCheckingOut" class="fa-solid fa-spinner fa-spin" style="margin-right: 4px;"></i>
                  {{ isCheckingOut ? 'กำลังบันทึกลงระบบ...' : 'บันทึกสำเร็จ' }}
                </strong>
              </div>
              <div class="flex flex-between mb-sm text-sm">
                <span style="color: var(--text-secondary);">ช่องทางชำระ:</span>
                <strong style="color: var(--text-primary);">{{ getPaymentMethodLabel(paymentMethod) }}</strong>
              </div>
              <div v-if="discount > 0" class="flex flex-between mb-sm animate-fade-in text-sm text-danger">
                <span>ส่วนลด:</span>
                <strong>-{{ formatCurrency(discount) }}</strong>
              </div>
              <div class="flex flex-between mb-sm text-lg">
                <span class="font-bold">ยอดสุทธิ:</span>
                <strong class="text-accent">{{ formatCurrency(netTotal) }}</strong>
              </div>
              <div v-if="paymentMethod === 'cash'" class="flex flex-between mb-sm text-sm" style="border-top: 1px solid var(--border-color); padding-top: var(--space-sm); margin-top: var(--space-sm);">
                <span style="color: var(--text-secondary);">รับเงินมา:</span>
                <strong style="color: var(--text-primary);">{{ formatCurrency(Number(enteredAmount)) }}</strong>
              </div>
              <div v-if="paymentMethod === 'cash' && cashChange > 0" class="flex flex-between text-lg text-success">
                <span class="font-bold">เงินทอน:</span>
                <strong class="text-xl">{{ formatCurrency(cashChange) }}</strong>
              </div>
            </div>

            <!-- Printer Status Indicator -->
            <div class="text-xs text-secondary mt-sm mb-md flex align-center justify-center gap-xs" style="margin-top: 8px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span :style="{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: printerConnected ? 'var(--success)' : '#d1d1d6',
                display: 'inline-block'
              }"></span>
              <span>เครื่องพิมพ์: {{ printerConnected ? 'พร้อมใช้งาน' : 'ยังไม่ได้เชื่อมต่อ' }}</span>
            </div>

            <div class="w-full flex gap-md success-actions" style="display: flex; gap: var(--space-md); width: 100%;">
              <button 
                class="btn-modal btn-modal-secondary flex-1" 
                @click="() => handlePrintReceipt()"
                :disabled="printLoading"
                style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; font-size: var(--font-base);"
              >
                <i v-if="printLoading" class="fa-solid fa-spinner fa-spin"></i>
                <i v-else class="fa-solid fa-print"></i>
                <span>พิมพ์ใบเสร็จ</span>
              </button>
              <button class="btn-modal btn-modal-primary flex-1" @click="finishPayment" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; font-size: var(--font-base);">
                <i class="fa-solid fa-circle-check"></i> เสร็จสิ้น
              </button>
            </div>
          </div>
        </div>

        <template v-else>
          <div class="checkout-container">
            
            <!-- Top Section: Bill Details -->
            <div class="checkout-left">
              <div class="card" style="border: 1px solid var(--border-color); border-radius: var(--radius-xl); box-shadow: var(--shadow-sm); padding: var(--space-lg) var(--space-xl);">
                <div class="card-title font-bold text-md" style="margin-bottom: var(--space-md); border-bottom: 2px dashed var(--border-color); padding-bottom: var(--space-sm); display: flex; align-items: center; gap: 8px;">
                  <i class="fa-solid fa-receipt" style="color: var(--primary);"></i> รายละเอียดบิลสินค้า
                </div>
                
                <div class="order-items-scroll" style="max-height: 300px; overflow-y: auto; padding-right: var(--space-xs); display: flex; flex-direction: column; gap: var(--space-sm); margin-bottom: var(--space-md);">
                  <div v-for="[itemId, cartItem] in cart" :key="itemId" class="flex flex-between align-start text-base" style="padding-bottom: var(--space-xs); border-bottom: 1px dashed rgba(0,0,0,0.06); gap: var(--space-sm);">
                    <div style="display:flex; flex-direction:column; gap:2px; flex: 1; min-width: 0;">
                      <span class="font-bold" style="color: var(--text-primary); word-break: break-word;">{{ cartItem.item.name }}</span>
                      
                      <!-- Show options details if any -->
                      <div v-if="cartItem.item.options && cartItem.item.options.selected_items" class="text-sm text-secondary" style="margin-top: 2px; line-height: 1.4; word-break: break-word;">
                        ผสม: {{ cartItem.item.options.selected_items.map(i => `${i.name} (${i.weight}ก.)`).join(', ') }}
                      </div>
                    </div>
                    <div style="text-align: right; flex-shrink: 0; min-width: 80px;">
                      <span class="font-bold text-accent text-base" style="display: block;">{{ formatCurrency(cartItem.item.price * cartItem.quantity) }}</span>
                      <span class="text-sm text-secondary" style="display: block; margin-top: 2px;">{{ cartItem.quantity }} × {{ formatCurrency(cartItem.item.price) }}</span>
                    </div>
                  </div>

                  <!-- Seasonings at the end of the menu -->
                  <template v-if="freeModifiers.length > 0">
                    <div style="border-top: 1px dashed var(--border-color); margin: 4px 0 2px 0;"></div>
                    <div v-for="mod in freeModifiers" :key="mod.id" class="flex flex-between align-start text-base" style="padding-bottom: var(--space-xs); border-bottom: 1px dashed rgba(0,0,0,0.06); gap: var(--space-sm);">
                      <div style="display:flex; flex-direction:column; gap:2px; flex: 1; min-width: 0;">
                        <span style="color: var(--text-secondary); word-break: break-word;">{{ mod.name }}</span>
                      </div>
                      <div style="text-align: right; flex-shrink: 0; min-width: 80px;">
                        <span class="font-bold text-accent text-base" style="display: block;">฿0</span>
                        <span class="text-sm text-secondary" style="display: block; margin-top: 2px;">1 × ฿0</span>
                      </div>
                    </div>
                  </template>
                </div>

                <div style="border-top: 2px dashed var(--border-color); padding-top: var(--space-md); display: flex; flex-direction: column; gap: var(--space-xs);">
                  <div class="flex flex-between text-base text-secondary">
                    <span>ยอดรวม</span>
                    <span>{{ formatCurrency(total) }}</span>
                  </div>
                  <div v-if="discount > 0" class="flex flex-between animate-fade-in text-base text-danger font-bold">
                    <span>ส่วนลด</span>
                    <span>-{{ formatCurrency(discount) }}</span>
                  </div>
                  <div class="flex flex-between align-center" style="border-top: 1px solid var(--border-color); padding-top: var(--space-xs); margin-top: var(--space-xs);">
                    <span class="font-bold text-lg">ยอดชำระทั้งสิ้น</span>
                    <span class="font-bold text-accent text-2xl">{{ formatCurrency(netTotal) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bottom Section: Payment Actions -->
            <div class="checkout-right">
              <div class="card" style="border: 1px solid var(--border-color); border-radius: var(--radius-xl); box-shadow: var(--shadow-sm); padding: var(--space-lg) var(--space-xl);">
                
                <!-- Grouped header showing active channel and change method button -->
                <div v-if="paymentMethod" class="flex flex-between align-center mb-lg" style="border-bottom: 1px solid var(--border-color); padding-bottom: var(--space-sm);">
                  <span class="font-bold text-primary text-md">
                    <i class="fa-solid fa-credit-card" style="margin-right: 4px;"></i> ช่องทาง: {{ getPaymentMethodLabel(paymentMethod) }}
                  </span>
                  <button class="btn btn-secondary change-method-btn" @click="paymentMethod = null">
                    <i class="fa-solid fa-arrow-left"></i> เปลี่ยนช่องทาง
                  </button>
                </div>

                <!-- Step 1: Select Payment Method -->
                <div v-if="!paymentMethod" id="payment-method-section">
                  <div class="card-title font-bold text-md" style="margin-bottom: var(--space-lg);">
                    เลือกประเภทการชำระเงิน
                  </div>
                  <div class="payment-methods">
                    <button class="payment-method-btn" @click="selectPaymentMethod('cash')">
                      <div class="method-icon"><i class="fa-solid fa-money-bill-wave" style="color: var(--success); font-size: 2.2rem;"></i></div>
                      <div class="method-label">เงินสด</div>
                    </button>
                    <button class="payment-method-btn" @click="selectPaymentMethod('qr')">
                      <div class="method-icon"><i class="fa-solid fa-qrcode" style="color: var(--primary); font-size: 2.2rem;"></i></div>
                      <div class="method-label">QR / โอน</div>
                    </button>
                    <button class="payment-method-btn" @click="selectPaymentMethod('gov')">
                      <div class="method-icon"><i class="fa-solid fa-landmark" style="color: var(--accent); font-size: 2.2rem;"></i></div>
                      <div class="method-label">
                        <span class="hide-mobile">โครงการรัฐ</span>
                        <span class="show-mobile-inline">รัฐ</span>
                      </div>
                    </button>
                    <button class="payment-method-btn" @click="selectPaymentMethod('delivery')">
                      <div class="method-icon"><i class="fa-solid fa-motorcycle" style="color: #ff9500; font-size: 2.2rem;"></i></div>
                      <div class="method-label">
                        <span class="hide-mobile">เดลิเวอรี</span>
                        <span class="show-mobile-inline">เดลิ</span>
                      </div>
                    </button>
                  </div>
                </div>

                <!-- Step 2A: Cash Payment -->
                <div v-if="paymentMethod === 'cash'" id="cash-section">
                  <div class="payment-amount-display" style="background: rgba(0,0,0,0.015); border-radius: var(--radius-lg); padding: var(--space-md) var(--space-lg); border: 1px solid var(--border-color); margin-bottom: var(--space-md); text-align: center;">
                    <div class="text-xs text-secondary" style="margin-bottom: var(--space-xs); text-transform: uppercase;">
                      จำนวนเงินที่รับ
                    </div>
                    <div class="payment-entered text-primary font-bold text-3xl">
                      {{ enteredAmount > 0 ? formatCurrency(enteredAmount) : '฿0' }}
                    </div>
                    
                    <div v-if="enteredAmount > 0" class="payment-change font-bold text-md" :class="changeClass" style="margin-top: var(--space-xs);">
                      {{ changeText }}
                    </div>
                  </div>

                  <!-- Quick Amount Selector -->
                  <div class="quick-amounts flex gap-sm mb-md" style="overflow-x: auto; padding-bottom: var(--space-xs);">
                    <button 
                      class="quick-amount-btn" 
                      :class="{ 'active': Number(enteredAmount) === netTotal }"
                      @click="enteredAmount = netTotal"
                    >
                      พอดี ({{ formatCurrency(netTotal) }})
                    </button>
                    <button 
                      v-for="amt in quickAmountOptions" 
                      :key="amt" 
                      class="quick-amount-btn"
                      :class="{ 'active': Number(enteredAmount) === amt }"
                      @click="enteredAmount = amt"
                    >
                      {{ formatCurrency(amt) }}
                    </button>
                  </div>

                  <!-- Numeric Keypad -->
                  <div class="keypad" style="margin-bottom: var(--space-lg); display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-sm);">
                    <button v-for="num in 9" :key="num" class="keypad-key" @click="pressNum(String(num))">{{ num }}</button>
                    <button class="keypad-key key-clear" @click="pressNum('C')" style="background: rgba(230, 57, 70, 0.1); color: var(--primary);">C</button>
                    <button class="keypad-key" @click="pressNum('0')">{{ 0 }}</button>
                    <button class="keypad-key key-backspace" @click="pressNum('⌫')"><i class="fa-solid fa-delete-left"></i></button>
                  </div>

                  <div>
                    <button 
                      class="btn btn-primary btn-xl" 
                      :disabled="Number(enteredAmount) < netTotal"
                      @click="confirmCashPayment"
                      style="width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px;"
                    >
                      <i class="fa-solid fa-circle-check"></i> ยืนยันรับเงินสด
                    </button>
                  </div>
                </div>

                <!-- Step 2B: QR Code Payment -->
                <div v-if="paymentMethod === 'qr'" id="qr-section" style="text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 250px; padding: var(--space-md) 0;">
                  <div class="qr-code-display" style="margin-bottom: var(--space-md); width: 100%; max-width: 480px; display: flex; justify-content: center;">
                    <img src="@/assets/image/qr.png" alt="Payment QR Code" style="max-width: 480px; width: 100%; max-height: 480px; border-radius: var(--radius-md); box-shadow: var(--shadow-md); border: 1px solid var(--border-color); object-fit: contain;" />
                  </div>
                  <div class="text-sm text-secondary" style="margin-bottom: var(--space-md);">
                    ช่องทางชำระเงินด้วย QR Code / โอนเงินผ่านธนาคาร
                  </div>

                  <div class="font-bold text-accent mb-xl text-2xl" style="margin-bottom: var(--space-lg);">
                    {{ formatCurrency(netTotal) }}
                  </div>
                  
                  <button class="btn-modal btn-modal-primary" @click="confirmQRPayment">
                    <i class="fa-solid fa-circle-check"></i> ยืนยันผ่านรายการชำระเงิน
                  </button>
                </div>

                <!-- Step 2C: Government Project Payment -->
                <div v-if="paymentMethod === 'gov'" id="gov-section" style="text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 250px;">
                  <div class="empty-state-icon" style="font-size: 3.5rem; margin-bottom: var(--space-sm); color: var(--accent); opacity: 0.9;">
                    <i class="fa-solid fa-landmark"></i>
                  </div>
                  <div class="text-sm text-secondary" style="margin-bottom: var(--space-md);">
                    ช่องทางชำระเงินด้วย โครงการของรัฐ
                  </div>

                  <div class="font-bold text-accent mb-xl text-2xl" style="margin-bottom: var(--space-lg);">
                    {{ formatCurrency(netTotal) }}
                  </div>
                  
                  <button class="btn-modal btn-modal-primary" @click="confirmGovPayment">
                    <i class="fa-solid fa-circle-check"></i> ยืนยันผ่านรายการโครงการรัฐ
                  </button>
                </div>

                <!-- Step 2D: Delivery App Payment -->
                <div v-if="paymentMethod === 'delivery'" id="delivery-section" style="text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 250px;">
                  <div class="empty-state-icon" style="font-size: 3.5rem; margin-bottom: var(--space-sm); color: #ff9500; opacity: 0.9;">
                    <i class="fa-solid fa-motorcycle"></i>
                  </div>
                  <div class="text-sm text-secondary" style="margin-bottom: var(--space-md);">
                    ช่องทางชำระเงินด้วย เดลิเวอรี (Delivery App)
                  </div>

                  <div class="font-bold mb-xl text-2xl" style="margin-bottom: var(--space-lg); color: #ff9500;">
                    {{ formatCurrency(netTotal) }}
                  </div>
                  
                  <button class="btn-modal btn-modal-primary" @click="confirmDeliveryPayment">
                    <i class="fa-solid fa-circle-check"></i> ยืนยันผ่านรายการเดลิเวอรี
                  </button>
                </div>

              </div>
            </div>

          </div>
        </template>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../api';
import { ui, formatCurrency, roundUp, showConfetti, getUser } from '../helpers';
import { store } from '../store';
import { 
  autoConnectPrinter, 
  isPrinterConnected, 
  kickDrawer, 
  printReceipt, 
  getSavedPrinterConfig 
} from '../utils/printer';

// Props
const props = defineProps({
  cart: {
    type: Map,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  freeModifiers: {
    type: Array,
    default: () => []
  }
});

// Emits
const emit = defineEmits(['close', 'success']);

// Reactive States
const paymentMethod = ref(null);
const enteredAmount = ref('');
const orderId = ref(null);
const success = ref(false);
const checkoutPromise = ref(null);
const isCheckingOut = ref(false);

// Printer States & Hook
const printerConnected = ref(false);
const printLoading = ref(false);

// Active Branch & Date States for Browser Print Template
const activeBranchName = ref('สาขาหลัก');
const activeBranchPhone = ref('');
const orderDateStr = ref(new Date().toISOString());

const formattedOrderDate = computed(() => {
  const d = new Date(orderDateStr.value);
  return d.toLocaleDateString('th-TH') + ' ' + d.toLocaleTimeString('th-TH');
});

onMounted(() => {
  if (navigator.usb) {
    setTimeout(async () => {
      try {
        const dev = await autoConnectPrinter();
        printerConnected.value = !!dev;
      } catch (e) {
        console.warn('Auto connect printer in modal failed:', e);
      }
    }, 50);
  }
});

const netTotal = computed(() => Math.max(0, props.total - (props.discount || 0)));

// Cash Calculations
const cashChange = computed(() => {
  const amount = Number(enteredAmount.value) || 0;
  return Math.max(0, amount - netTotal.value);
});

const changeText = computed(() => {
  const amount = Number(enteredAmount.value) || 0;
  const diff = amount - netTotal.value;
  if (diff >= 0) {
    return `เงินทอน: ${formatCurrency(diff)}`;
  } else {
    return `ขาดอีก: ${formatCurrency(Math.abs(diff))}`;
  }
});

const changeClass = computed(() => {
  const amount = Number(enteredAmount.value) || 0;
  return amount >= netTotal.value ? 'positive' : 'negative';
});

// Quick cash bills selection
const quickAmountOptions = computed(() => {
  const options = [];
  const bills = [100, 500, 1000, 5000];
  bills.forEach(bill => {
    const rounded = roundUp(netTotal.value, bill);
    if (rounded > netTotal.value && !options.includes(rounded)) {
      options.push(rounded);
    }
  });
  return options;
});

// Selection Action
const selectPaymentMethod = (method) => {
  paymentMethod.value = method;
};

const handleClose = () => {
  emit('close');
};

const finishPayment = async () => {
  if (isCheckingOut.value) {
    ui.showLoading();
    try {
      await checkoutPromise.value;
    } catch (e) {
      ui.hideLoading();
      return; // ห้ามปิด modal หากการบันทึกล้มเหลว
    }
    ui.hideLoading();
  }
  emit('success');
};

// Helper to compile cart items for API
const getCartItems = () => {
  const items = [];
  props.cart.forEach(({ item, quantity }) => {
    items.push({ 
      menu_item_id: item.id, 
      quantity,
      item_name: item.name,
      item_price: item.price,
      options: item.options || null
    });
  });
  return items;
};

// Cash keypad handler
const pressNum = (key) => {
  if (key === 'C') {
    enteredAmount.value = '';
  } else if (key === '⌫') {
    enteredAmount.value = String(enteredAmount.value).slice(0, -1);
  } else {
    if (String(enteredAmount.value).length >= 8) return;
    enteredAmount.value = String(enteredAmount.value) + key;
  }
};

const getPaymentMethodLabel = (method) => {
  const map = {
    'cash': 'เงินสด (Cash)',
    'qr': 'QR / โอน',
    'gov': 'โครงการรัฐ',
    'delivery': 'เดลิเวอรี'
  };
  return map[method] || method;
};

// --- Printer Trigger Actions ---
const handlePrintReceipt = async (orderData = null) => {
  try {
    printLoading.value = true;
    
    // Set active branch details for the template
    const user = getUser();
    const branchId = user ? user.branch_id : null;
    const activeBranch = store.branches.find(b => b.id === branchId) || { name: 'สาขาหลัก' };
    activeBranchName.value = activeBranch.name;
    activeBranchPhone.value = activeBranch.phone || '';
    
    if (orderData && orderData.created_at) {
      orderDateStr.value = orderData.created_at;
    }

    const config = getSavedPrinterConfig();
    if (config.connectionType === 'rawbt' || (config.connectionType === 'usb' && isPrinterConnected())) {
      const currentOrder = orderData || {
        order_number: orderId.value,
        created_at: new Date().toISOString(),
        payment_method: paymentMethod.value || 'cash',
        cash_received: Number(enteredAmount.value) || 0,
        discount: props.discount,
        total: netTotal.value,
        modifiers: props.freeModifiers
      };
      
      await printReceipt(currentOrder, props.cart, {
        shopName: 'ร้านไก่ทอดช้างแดง',
        branchName: activeBranch.name,
        phone: activeBranch.phone || '',
        forceKick: false
      });
      ui.showToast('พิมพ์ใบเสร็จสำเร็จแล้ว 🖨️', 'success');
    } else {
      // Fallback: Trigger standard browser print dialog
      window.print();
      ui.showToast('เปิดหน้าต่างสั่งพิมพ์ใบเสร็จเรียบร้อยแล้ว 🖨️', 'success');
    }
  } catch (e) {
    console.error(e);
    ui.showToast('การพิมพ์ใบเสร็จล้มเหลว: ' + e.message, 'error');
  } finally {
    printLoading.value = false;
  }
};

const triggerAutoPrinterAndDrawer = async (orderData) => {
  const config = getSavedPrinterConfig();
  if (!navigator.usb && config.connectionType !== 'rawbt') return;
  
  if (isPrinterConnected()) {
    if (config.autoPrint) {
      try {
        await handlePrintReceipt(orderData);
      } catch (e) {
        ui.showToast('พิมพ์ใบเสร็จอัตโนมัติล้มเหลว: ' + e.message, 'error');
      }
    } else if (config.autoKick) {
      try {
        await kickDrawer();
        ui.showToast('ดีดลิ้นชักอัตโนมัติสำเร็จ 🔓', 'success');
      } catch (e) {
        ui.showToast('เปิดลิ้นชักล้มเหลว: ' + e.message, 'error');
      }
    }
  }
};

// Unified Checkout Submitter for Optimistic UI
const submitCheckout = (paymentMethodType, cashReceivedVal) => {
  success.value = true;
  showConfetti();
  
  // สร้างเลขออเดอร์จำลองระหว่างรอเซิร์ฟเวอร์
  const today = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const dateStr = today.getUTCFullYear().toString() +
    String(today.getUTCMonth() + 1).padStart(2, '0') +
    String(today.getUTCDate()).padStart(2, '0');
  const tempNum = Math.floor(100 + Math.random() * 900);
  orderId.value = `กำลังบันทึก... (CD-${dateStr}-${tempNum})`;

  isCheckingOut.value = true;
  checkoutPromise.value = (async () => {
    try {
      const res = await api.orders.create({
        items: getCartItems(),
        note: '',
        discount: props.discount,
        modifiers: props.freeModifiers,
        payment_method: paymentMethodType,
        cash_received: cashReceivedVal
      });
      orderId.value = res.data?.order_number || res.data?.id || res.id;
      orderDateStr.value = res.data?.created_at || new Date().toISOString();
      store.clearReportsCache();
      ui.showToast(`ชำระเงินผ่าน ${getPaymentMethodLabel(paymentMethodType)} สำเร็จ!`, 'success');
      
      // 🟢 Trigger Auto Printer & Drawer Kick
      triggerAutoPrinterAndDrawer(res.data || { 
        order_number: orderId.value, 
        payment_method: paymentMethodType, 
        cash_received: cashReceivedVal,
        discount: props.discount,
        total: netTotal.value
      });

      return res;
    } catch (error) {
      console.error(error);
      ui.showToast(`ชำระเงินไม่สำเร็จ: ${error.message}`, 'error');
      // ย้อนกลับหากไม่สำเร็จ
      success.value = false;
      throw error;
    } finally {
      isCheckingOut.value = false;
    }
  })();
};

// Cash Checkout
const confirmCashPayment = () => {
  const cashVal = Number(enteredAmount.value) || 0;
  submitCheckout('cash', cashVal);
};

// QR Checkout
const confirmQRPayment = () => {
  submitCheckout('qr', netTotal.value);
};

// Government Project Checkout
const confirmGovPayment = () => {
  submitCheckout('gov', netTotal.value);
};

// Delivery App Checkout
const confirmDeliveryPayment = () => {
  submitCheckout('delivery', netTotal.value);
};
</script>

<style scoped>
/* Scoped Modal Override to Full Screen */
.full-screen-modal {
  align-items: center !important;
}

.modal-content {
  width: 100vw !important;
  height: 100vh !important;
  height: 100dvh !important;
  max-width: 100% !important;
  max-height: 100% !important;
  border: none !important;
  border-radius: 0 !important;
  margin: 0 !important;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary) !important;
}

.modal-body {
  padding: var(--space-md);
  overflow-y: auto;
}

/* Center single-column layout */
.checkout-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  max-width: 680px;
  margin: 0 auto;
  width: 100%;
}

@media (min-width: 768px) {
  .checkout-container {
    flex-direction: row !important;
    max-width: 1100px !important;
    align-items: stretch !important;
    gap: var(--space-lg) !important;
  }
  .checkout-left {
    flex: 1.1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .checkout-right {
    flex: 0.9;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .checkout-left .card,
  .checkout-right .card {
    height: 100% !important;
    display: flex !important;
    flex-direction: column !important;
  }
  .checkout-left .order-items-scroll {
    flex: 1 !important;
    max-height: none !important;
  }
}

/* Modal close button override */
.modal-close {
  background: transparent;
  border: none;
  font-size: var(--font-xl);
  color: var(--text-secondary);
  cursor: pointer;
  padding: var(--space-xs);
  line-height: 1;
}

.modal-close:hover {
  color: var(--text-primary);
}

/* --- Payment Section --- */
.payment-amount-display {
  text-align: center;
  padding: var(--space-xl);
}

.payment-change {
  margin-top: var(--space-sm);
  font-size: var(--font-lg);
}

.payment-change.positive {
  color: var(--success);
}

.payment-change.negative {
  color: var(--danger-light);
}

.quick-amounts {
  display: flex;
  gap: var(--space-sm);
  overflow-x: auto;
  scrollbar-width: none;
}

.quick-amounts::-webkit-scrollbar { display: none; }

.quick-amount-btn {
  padding: var(--space-sm) var(--space-lg);
  background: rgba(139, 3, 19, 0.05);
  border: 1px solid rgba(139, 3, 19, 0.15);
  border-radius: var(--radius-full);
  color: var(--primary);
  font-size: var(--font-sm);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  transition: var(--transition-base);
  cursor: pointer;
}

.quick-amount-btn:hover:not(.active) {
  background: rgba(139, 3, 19, 0.10);
}

.quick-amount-btn.active {
  background: var(--primary);
  color: white;
  border-color: transparent;
}

.quick-amount-btn:active {
  transform: scale(0.95);
}

/* --- Payment Methods --- */
.payment-methods {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
  padding: var(--space-md) 0;
}

.payment-method-btn {
  padding: var(--space-xl) var(--space-lg);
  background: var(--card-bg);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-lg);
  text-align: center;
  transition: all var(--transition-base);
  cursor: pointer;
  color: var(--text-primary);
}

.payment-method-btn:active {
  transform: scale(0.97);
}

.payment-method-btn.selected {
  border-color: var(--primary);
  background: rgba(230, 57, 70, 0.08);
}

.payment-method-btn .method-icon {
  font-size: 2rem;
  margin-bottom: var(--space-sm);
}

.payment-method-btn .method-label {
  font-size: var(--font-sm);
  font-weight: var(--font-weight-semibold);
}

/* --- Success Animation --- */
.success-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-4xl) var(--space-xl);
  text-align: center;
}

.success-checkmark {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--gradient-success);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  margin-bottom: var(--space-2xl);
  animation: successPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 0 40px var(--success-glow);
  color: white;
}

.success-title {
  font-size: var(--font-xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--space-sm);
}

.success-subtitle {
  font-size: var(--font-base);
  color: var(--text-secondary);
}

/* Confetti particles */
.confetti-container {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
}

.confetti-piece {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  animation: confettiFall 1.5s ease forwards;
}

/* --- Keypad keys --- */
.keypad-key {
  padding: var(--space-md) 0;
  font-size: var(--font-lg);
  font-weight: var(--font-weight-semibold);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-base);
}

.keypad-key:active {
  transform: scale(0.95);
  background: var(--border-color);
}

@media (max-width: 768px) {
  .payment-methods {
    grid-template-columns: repeat(2, 1fr) !important;
  }
  .success-actions {
    flex-direction: column !important;
    gap: var(--space-sm) !important;
  }
  .success-actions .btn-modal {
    width: 100% !important;
    flex: none !important;
  }
}

</style>

<style>
/* Global Print Styles (Unscoped to hide other page elements like home/sidebar/grids) */
@media print {
  body * {
    visibility: hidden !important;
  }
  
  #receipt-print-area, #receipt-print-area * {
    visibility: visible !important;
  }
  
  #receipt-print-area {
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    width: 76mm !important;
    display: block !important;
    background: #fff !important;
    color: #000 !important;
    margin: 0 !important;
    padding: 0 !important;
    font-family: 'Prompt', monospace !important;
    font-size: 12px !important;
    line-height: 1.4 !important;
  }
  
  .receipt-logo-container {
    text-align: center;
    margin-bottom: 12px;
  }
  .receipt-logo {
    max-height: 48px;
    object-fit: contain;
  }
  .receipt-order-box {
    border: 2px solid #000;
    padding: 8px 12px;
    text-align: center;
    margin: 6px auto;
    max-width: 90%;
  }
  .receipt-order-number {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: 0.5px;
  }
  .receipt-copy-indicator {
    text-align: center;
    font-size: 11px;
    font-weight: 500;
    margin-top: 4px;
    margin-bottom: 8px;
  }
  .receipt-divider-solid {
    border-top: 1px solid #000;
    margin: 8px 0;
  }
  .receipt-divider-dashed {
    border-top: 1px dashed #000;
    margin: 6px 0;
  }
  .receipt-meta {
    font-size: 12px;
    line-height: 1.4;
  }
  .meta-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 2px;
  }
  .receipt-items {
    margin-top: 8px;
  }
  .receipt-item-group {
    margin-bottom: 4px;
  }
  .receipt-item-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    line-height: 1.4;
    align-items: flex-start;
  }
  .receipt-item-row .item-qty-name {
    flex: 1;
    padding-right: 12px;
    word-break: break-word;
    text-align: left;
  }
  .receipt-item-row .item-price {
    flex-shrink: 0;
    font-weight: 600;
  }
  .receipt-item-row.modifier-row {
    color: #444;
    font-size: 11px;
    padding-left: 12px;
  }
  .receipt-totals {
    margin-top: 8px;
  }
  .total-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    margin-bottom: 3px;
  }
  .grand-total-row {
    font-size: 15px;
    font-weight: 800;
  }
  .payment-method-row {
    color: #333;
    font-weight: 600;
  }
  .receipt-footer {
    text-align: center;
    font-size: 11px;
    margin-top: 12px;
    line-height: 1.4;
  }
}

@media screen {
  #receipt-print-area {
    display: none !important;
  }
}
</style>
