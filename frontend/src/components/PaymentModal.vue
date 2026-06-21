<template>
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

      <div class="modal-body flex-1" style="display: flex; flex-direction: column; overflow-y: auto;">
        
        <!-- Step 3: Success Screen -->
        <div v-if="success" id="success-section" class="flex-1" style="display:flex; align-items:center; justify-content:center;">
          <div class="success-screen card" style="max-width: 480px; width: 100%; border: 1px solid var(--border-color); border-radius: var(--radius-2xl); padding: var(--space-3xl); box-shadow: var(--shadow-lg);">
            <div class="success-checkmark">✓</div>
            <div class="success-title text-success" style="font-size: var(--font-2xl); font-weight: var(--font-weight-bold); margin-bottom: var(--space-md);">ชำระเงินสำเร็จ!</div>
            
            <div class="success-details card" style="background: rgba(244, 162, 97, 0.03); border: 1px dashed var(--border-color); padding: var(--space-lg); text-align: left; width: 100%; margin: var(--space-lg) 0;">
              <div class="flex flex-between mb-sm" style="font-size: var(--font-sm);">
                <span style="color: var(--text-secondary);">เลขที่บิล:</span>
                <strong style="color: var(--text-primary);">#{{ orderId }}</strong>
              </div>
              <div class="flex flex-between mb-sm" style="font-size: var(--font-sm);">
                <span style="color: var(--text-secondary);">สถานะบิล:</span>
                <strong :style="{ color: isCheckingOut ? '#ff9500' : 'var(--success)' }">
                  <i v-if="isCheckingOut" class="fa-solid fa-spinner fa-spin" style="margin-right: 4px;"></i>
                  {{ isCheckingOut ? 'กำลังบันทึกลงระบบ...' : 'บันทึกสำเร็จ' }}
                </strong>
              </div>
              <div class="flex flex-between mb-sm" style="font-size: var(--font-sm);">
                <span style="color: var(--text-secondary);">ช่องทางชำระ:</span>
                <strong style="color: var(--text-primary);">{{ getPaymentMethodLabel(paymentMethod) }}</strong>
              </div>
              <div v-if="discount > 0" class="flex flex-between mb-sm animate-fade-in" style="font-size: var(--font-sm); color: #ff3b30;">
                <span>ส่วนลด:</span>
                <strong>-{{ formatCurrency(discount) }}</strong>
              </div>
              <div class="flex flex-between mb-sm" style="font-size: var(--font-lg);">
                <span class="font-bold">ยอดสุทธิ:</span>
                <strong class="text-accent">{{ formatCurrency(netTotal) }}</strong>
              </div>
              <div v-if="paymentMethod === 'cash'" class="flex flex-between mb-sm" style="font-size: var(--font-sm); border-top: 1px solid var(--border-color); padding-top: var(--space-sm); margin-top: var(--space-sm);">
                <span style="color: var(--text-secondary);">รับเงินมา:</span>
                <strong style="color: var(--text-primary);">{{ formatCurrency(Number(enteredAmount)) }}</strong>
              </div>
              <div v-if="paymentMethod === 'cash' && cashChange > 0" class="flex flex-between" style="font-size: var(--font-lg); color: var(--success);">
                <span class="font-bold">เงินทอน:</span>
                <strong style="font-size: var(--font-xl);">{{ formatCurrency(cashChange) }}</strong>
              </div>
            </div>

            <div class="w-full">
              <button class="btn btn-primary btn-xl" @click="finishPayment" style="width:100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
                <i class="fa-solid fa-circle-check"></i> เสร็จสิ้น (กลับหน้าขาย)
              </button>
            </div>
          </div>
        </div>

        <template v-else>
          <div class="checkout-container">
            
            <!-- Top Section: Bill Details -->
            <div class="checkout-left">
              <div class="card" style="border: 1px solid var(--border-color); border-radius: var(--radius-xl); box-shadow: var(--shadow-sm); padding: var(--space-lg) var(--space-xl);">
                <div class="card-title" style="font-size: var(--font-md); font-weight: var(--font-weight-bold); margin-bottom: var(--space-md); border-bottom: 2px dashed var(--border-color); padding-bottom: var(--space-sm); display: flex; align-items: center; gap: 8px;">
                  <i class="fa-solid fa-receipt" style="color: var(--primary);"></i> รายละเอียดบิลสินค้า
                </div>
                
                <div class="order-items-scroll" style="max-height: 300px; overflow-y: auto; padding-right: var(--space-xs); display: flex; flex-direction: column; gap: var(--space-sm); margin-bottom: var(--space-md);">
                  <div v-for="[itemId, cartItem] in cart" :key="itemId" class="flex flex-between align-start" style="font-size: var(--font-sm); padding-bottom: var(--space-xs); border-bottom: 1px dashed rgba(0,0,0,0.06); gap: var(--space-sm);">
                    <div style="display:flex; flex-direction:column; gap:2px; flex: 1; min-width: 0;">
                      <span class="font-bold" style="color: var(--text-primary); word-break: break-word;">{{ cartItem.item.name }}</span>
                      
                      <!-- Show options details if any -->
                      <div v-if="cartItem.item.options && cartItem.item.options.selected_items" style="font-size: 11px; color: var(--text-secondary); margin-top: 2px; line-height: 1.4; word-break: break-word;">
                        ผสม: {{ cartItem.item.options.selected_items.map(i => `${i.name} (${i.weight}ก.)`).join(', ') }}
                      </div>
                    </div>
                    <div style="text-align: right; flex-shrink: 0; min-width: 80px;">
                      <span class="font-bold text-accent" style="display: block;">{{ formatCurrency(cartItem.item.price * cartItem.quantity) }}</span>
                      <span style="font-size: 11px; color: var(--text-secondary); display: block; margin-top: 2px;">{{ cartItem.quantity }} × {{ formatCurrency(cartItem.item.price) }}</span>
                    </div>
                  </div>

                  <!-- Seasonings at the end of the menu -->
                  <template v-if="freeModifiers.length > 0">
                    <div style="border-top: 1px dashed var(--border-color); margin: 4px 0 2px 0;"></div>
                    <div v-for="mod in freeModifiers" :key="mod.id" class="flex flex-between align-start" style="font-size: var(--font-sm); padding-bottom: var(--space-xs); border-bottom: 1px dashed rgba(0,0,0,0.06); gap: var(--space-sm);">
                      <div style="display:flex; flex-direction:column; gap:2px; flex: 1; min-width: 0;">
                        <span style="color: var(--text-secondary); word-break: break-word;">{{ mod.name }}</span>
                      </div>
                      <div style="text-align: right; flex-shrink: 0; min-width: 80px;">
                        <span class="font-bold text-accent" style="display: block;">฿0</span>
                        <span style="font-size: 11px; color: var(--text-secondary); display: block; margin-top: 2px;">1 × ฿0</span>
                      </div>
                    </div>
                  </template>
                </div>

                <div style="border-top: 2px dashed var(--border-color); padding-top: var(--space-md); display: flex; flex-direction: column; gap: var(--space-xs);">
                  <div class="flex flex-between" style="display: flex; justify-content: space-between; font-size: var(--font-sm); color: var(--text-secondary);">
                    <span>ยอดรวม</span>
                    <span>{{ formatCurrency(total) }}</span>
                  </div>
                  <div v-if="discount > 0" class="flex flex-between animate-fade-in" style="display: flex; justify-content: space-between; font-size: var(--font-sm); color: #ff3b30; font-weight: bold;">
                    <span>ส่วนลด</span>
                    <span>-{{ formatCurrency(discount) }}</span>
                  </div>
                  <div class="flex flex-between align-center" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: var(--space-xs); margin-top: var(--space-xs);">
                    <span class="font-bold" style="font-size: var(--font-md);">ยอดชำระทั้งสิ้น</span>
                    <span class="font-bold text-accent" style="font-size: var(--font-xl);">{{ formatCurrency(netTotal) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bottom Section: Payment Actions -->
            <div class="checkout-right">
              <div class="card" style="border: 1px solid var(--border-color); border-radius: var(--radius-xl); box-shadow: var(--shadow-sm); padding: var(--space-lg) var(--space-xl);">
                
                <!-- Grouped header showing active channel and change method button -->
                <div v-if="paymentMethod" class="flex flex-between align-center" style="margin-bottom: var(--space-lg); border-bottom: 1px solid var(--border-color); padding-bottom: var(--space-sm);">
                  <span class="font-bold text-primary" style="font-size: var(--font-sm);">
                    <i class="fa-solid fa-credit-card" style="margin-right: 4px;"></i> ช่องทาง: {{ getPaymentMethodLabel(paymentMethod) }}
                  </span>
                  <button class="btn btn-secondary btn-sm" @click="paymentMethod = null" style="font-size: 11px; padding: var(--space-xs) var(--space-sm); border-radius: var(--radius-full); display: inline-flex; align-items: center; gap: 4px;">
                    <i class="fa-solid fa-arrow-left"></i> เปลี่ยนช่องทาง
                  </button>
                </div>

                <!-- Step 1: Select Payment Method -->
                <div v-if="!paymentMethod" id="payment-method-section">
                  <div class="card-title font-bold" style="font-size: var(--font-md); margin-bottom: var(--space-lg);">
                    เลือกประเภทการชำระเงิน
                  </div>
                  <div class="payment-methods">
                    <button class="payment-method-btn" @click="selectPaymentMethod('cash')">
                      <div class="method-icon"><i class="fa-solid fa-money-bill-wave" style="color: var(--success); font-size: 2.2rem;"></i></div>
                      <div class="method-label">เงินสด</div>
                    </button>
                    <button class="payment-method-btn" @click="selectPaymentMethod('qr')">
                      <div class="method-icon"><i class="fa-solid fa-qrcode" style="color: var(--primary); font-size: 2.2rem;"></i></div>
                      <div class="method-label">QR Code / โอนเงิน</div>
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
                    <div style="font-size: var(--font-xs); color: var(--text-secondary); margin-bottom: var(--space-xs); text-transform: uppercase;">
                      จำนวนเงินที่รับ
                    </div>
                    <div class="payment-entered text-primary" style="font-size: var(--font-3xl); font-weight: var(--font-weight-bold); color: var(--primary);">
                      {{ enteredAmount > 0 ? formatCurrency(enteredAmount) : '฿0' }}
                    </div>
                    
                    <div v-if="enteredAmount > 0" class="payment-change font-bold" :class="changeClass" style="font-size: var(--font-md); margin-top: var(--space-xs);">
                      {{ changeText }}
                    </div>
                  </div>

                  <!-- Quick Amount Selector -->
                  <div class="quick-amounts" style="margin-bottom: var(--space-md); display: flex; gap: var(--space-sm); overflow-x: auto; padding-bottom: var(--space-xs);">
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
                  <div class="empty-state-icon" style="font-size: 3.5rem; margin-bottom: var(--space-sm); color: var(--primary); opacity: 0.9;">
                    <i class="fa-solid fa-qrcode"></i>
                  </div>
                  <div style="font-size: var(--font-sm); color: var(--text-secondary); margin-bottom: var(--space-md);">
                    ช่องทางชำระเงินด้วย QR Code / โอนเงินผ่านธนาคาร
                  </div>

                  <div class="font-bold text-accent mb-xl" style="font-size: var(--font-2xl); margin-bottom: var(--space-lg);">
                    {{ formatCurrency(netTotal) }}
                  </div>
                  
                  <button class="btn btn-success btn-xl" @click="confirmQRPayment" style="width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fa-solid fa-circle-check"></i> ยืนยันผ่านรายการชำระเงิน
                  </button>
                </div>

                <!-- Step 2C: Government Project Payment -->
                <div v-if="paymentMethod === 'gov'" id="gov-section" style="text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 250px;">
                  <div class="empty-state-icon" style="font-size: 3.5rem; margin-bottom: var(--space-sm); color: var(--accent); opacity: 0.9;">
                    <i class="fa-solid fa-landmark"></i>
                  </div>
                  <div style="font-size: var(--font-sm); color: var(--text-secondary); margin-bottom: var(--space-md);">
                    ช่องทางชำระเงินด้วย โครงการของรัฐ
                  </div>

                  <div class="font-bold text-accent mb-xl" style="font-size: var(--font-2xl); margin-bottom: var(--space-lg);">
                    {{ formatCurrency(netTotal) }}
                  </div>
                  
                  <button class="btn btn-primary btn-xl" @click="confirmGovPayment" style="width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px; background-color: var(--accent) !important; border-color: var(--accent) !important;">
                    <i class="fa-solid fa-circle-check"></i> ยืนยันผ่านรายการโครงการรัฐ
                  </button>
                </div>

                <!-- Step 2D: Delivery App Payment -->
                <div v-if="paymentMethod === 'delivery'" id="delivery-section" style="text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 250px;">
                  <div class="empty-state-icon" style="font-size: 3.5rem; margin-bottom: var(--space-sm); color: #ff9500; opacity: 0.9;">
                    <i class="fa-solid fa-motorcycle"></i>
                  </div>
                  <div style="font-size: var(--font-sm); color: var(--text-secondary); margin-bottom: var(--space-md);">
                    ช่องทางชำระเงินด้วย เดลิเวอรี (Delivery App)
                  </div>

                  <div class="font-bold mb-xl" style="font-size: var(--font-2xl); margin-bottom: var(--space-lg); color: #ff9500;">
                    {{ formatCurrency(netTotal) }}
                  </div>
                  
                  <button class="btn btn-primary btn-xl" @click="confirmDeliveryPayment" style="width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px; background-color: #ff9500 !important; border-color: #ff9500 !important;">
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
import { ref, computed } from 'vue';
import api from '../api';
import { ui, formatCurrency, roundUp, showConfetti } from '../helpers';
import { store } from '../store';

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
    'qr': 'QR Code / โอนเงิน',
    'gov': 'โครงการรัฐ',
    'delivery': 'เดลิเวอรี'
  };
  return map[method] || method;
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
      store.clearReportsCache();
      ui.showToast(`ชำระเงินผ่าน ${getPaymentMethodLabel(paymentMethodType)} สำเร็จ!`, 'success');
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

/* Modal close button override */
.modal-close {
  background: transparent;
  border: none;
  font-size: 1.5rem;
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
</style>
