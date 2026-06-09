<template>
  <div id="modal-container" class="active" style="display:flex; align-items:flex-end; justify-content:center;">
    <div class="modal-overlay" @click="handleClose"></div>
    <div class="modal-content">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h3>
          <span style="display: inline-flex; align-items: center; gap: 6px;">
            <i :class="success ? 'fa-solid fa-circle-check text-success' : 'fa-solid fa-cash-register'"></i>
            {{ success ? 'ทำรายการสำเร็จ' : 'ชำระเงิน' }}
          </span>
        </h3>
        <button v-if="!success" class="modal-close" @click="handleClose">✕</button>
      </div>

      <div class="modal-body">
        
        <!-- Step 3: Success Screen -->
        <div v-if="success" id="success-section">
          <div class="success-screen">
            <div class="success-checkmark">✓</div>
            <div class="success-title">ชำระเงินสำเร็จ!</div>
            <div class="success-subtitle">
              ออเดอร์ #{{ orderId }} — {{ formatCurrency(total) }}
              <span v-if="paymentMethod === 'cash' && cashChange > 0">
                <br />เงินทอน: <strong>{{ formatCurrency(cashChange) }}</strong>
              </span>
            </div>
            <div class="mt-2xl w-full">
              <button class="btn btn-primary btn-xl" @click="finishPayment" style="display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
                <i class="fa-solid fa-house"></i> กลับหน้าขาย
              </button>
            </div>
          </div>
        </div>

        <template v-else>
          <!-- Order Summary Card -->
          <div class="card mb-lg">
            <div class="card-title" style="font-size: var(--font-sm);"><i class="fa-solid fa-receipt" style="margin-right: 6px;"></i> สรุปรายการสินค้า</div>
            <div v-for="[itemId, cartItem] in cart" :key="itemId" class="flex flex-between mb-sm" style="font-size: var(--font-sm);">
              <span>{{ cartItem.item.name }} × {{ cartItem.quantity }}</span>
              <span class="text-accent">{{ formatCurrency(cartItem.item.price * cartItem.quantity) }}</span>
            </div>
            <div class="divider" style="margin: var(--space-md) 0; height:1px; background:var(--border-color);"></div>
            <div class="flex flex-between">
              <span class="font-bold" style="font-size: var(--font-lg);">รวมทั้งสิ้น</span>
              <span class="font-bold text-accent" style="font-size: var(--font-xl);">{{ formatCurrency(total) }}</span>
            </div>
          </div>

          <!-- Step 1: Select Payment Method -->
          <div v-if="!paymentMethod" id="payment-method-section">
            <div class="card-title mb-md">เลือกช่องทางการชำระเงิน</div>
            <div class="payment-methods">
              <button class="payment-method-btn" @click="selectPaymentMethod('cash')">
                <div class="method-icon"><i class="fa-solid fa-money-bill-wave" style="color: var(--success); font-size: 2.2rem;"></i></div>
                <div class="method-label">เงินสด</div>
              </button>
              <button class="payment-method-btn" @click="selectPaymentMethod('qr')">
                <div class="method-icon"><i class="fa-solid fa-qrcode" style="color: var(--primary); font-size: 2.2rem;"></i></div>
                <div class="method-label">QR Code</div>
              </button>
            </div>
          </div>

          <!-- Step 2A: Cash Payment -->
          <div v-if="paymentMethod === 'cash'" id="cash-section">
            <div class="payment-amount-display">
              <div style="font-size: var(--font-sm); color: var(--text-secondary); margin-bottom: var(--space-xs);">
                จำนวนเงินที่รับ
              </div>
              <div class="payment-entered">{{ enteredAmount > 0 ? formatCurrency(enteredAmount) : '฿0' }}</div>
              
              <div v-if="enteredAmount > 0" class="payment-change" :class="changeClass">
                {{ changeText }}
              </div>
            </div>

            <!-- Quick Amount Selector -->
            <div class="quick-amounts">
              <button class="quick-amount-btn" @click="enteredAmount = total">พอดี</button>
              <button 
                v-for="amt in quickAmountOptions" 
                :key="amt" 
                class="quick-amount-btn"
                @click="enteredAmount = amt"
              >
                {{ formatCurrency(amt) }}
              </button>
            </div>

            <!-- Numeric Keypad -->
            <div class="keypad">
              <button v-for="num in 9" :key="num" class="keypad-key" @click="pressNum(String(num))">{{ num }}</button>
              <button class="keypad-key key-clear" @click="pressNum('C')">C</button>
              <button class="keypad-key" @click="pressNum('0')">0</button>
              <button class="keypad-key key-backspace" @click="pressNum('⌫')"><i class="fa-solid fa-delete-left"></i></button>
            </div>

            <div style="padding: 0 var(--space-md);">
              <button 
                class="btn btn-primary btn-xl" 
                :disabled="Number(enteredAmount) < total"
                @click="confirmCashPayment"
                style="display: inline-flex; align-items: center; justify-content: center; gap: 4px;"
              >
                <i class="fa-solid fa-circle-check"></i> ยืนยันรับเงินสด
              </button>
            </div>
          </div>

          <!-- Step 2B: QR Code Payment (PromptPay) -->
          <div v-if="paymentMethod === 'qr'" id="qr-section">
            <div class="qr-section" style="text-align: center;">
              <div style="font-size: var(--font-sm); color: var(--text-secondary); margin-bottom: var(--space-lg);">
                กรุณาสแกน QR Code เพื่อชำระเงิน
              </div>
              
              <div class="qr-placeholder" style="width: 200px; height: 200px; margin: 0 auto var(--space-lg); border-radius: var(--radius-lg); overflow: hidden; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid var(--border-color);">
                <div v-if="qrLoading" class="spinner"></div>
                <img v-else-if="qrCodeUrl" :src="qrCodeUrl" alt="PromptPay QR Code" style="width:100%; height:100%; object-fit:contain;" />
                <div v-else style="color: var(--text-muted); font-size:var(--font-sm);">ไม่สามารถโหลด QR ได้</div>
              </div>

              <div class="font-bold text-accent mb-lg" style="font-size: var(--font-xl);">
                {{ formatCurrency(total) }}
              </div>
              
              <button class="btn btn-success btn-xl" @click="confirmQRPayment" style="display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
                <i class="fa-solid fa-circle-check"></i> ยืนยันลูกค้าสแกนเรียบร้อย
              </button>
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
const qrCodeUrl = ref(null);
const qrLoading = ref(false);
const success = ref(false);

// Cash Calculations
const cashChange = computed(() => {
  const amount = Number(enteredAmount.value) || 0;
  return Math.max(0, amount - props.total);
});

const changeText = computed(() => {
  const amount = Number(enteredAmount.value) || 0;
  const diff = amount - props.total;
  if (diff >= 0) {
    return `เงินทอน: ${formatCurrency(diff)}`;
  } else {
    return `ขาดอีก: ${formatCurrency(Math.abs(diff))}`;
  }
});

const changeClass = computed(() => {
  const amount = Number(enteredAmount.value) || 0;
  return amount >= props.total ? 'positive' : 'negative';
});

// Quick cash bills selection
const quickAmountOptions = computed(() => {
  const options = [];
  const bills = [100, 500, 1000, 5000];
  bills.forEach(bill => {
    const rounded = roundUp(props.total, bill);
    if (rounded > props.total && !options.includes(rounded)) {
      options.push(rounded);
    }
  });
  return options;
});

// Selection Action
const selectPaymentMethod = async (method) => {
  paymentMethod.value = method;
  await createBackendOrder();
};

const handleClose = () => {
  emit('close');
};

const finishPayment = () => {
  emit('success');
};

// Create Order in DB
const createBackendOrder = async () => {
  ui.showLoading();
  try {
    const items = [];
    props.cart.forEach(({ item, quantity }) => {
      items.push({ menu_item_id: item.id, quantity });
    });

    const res = await api.orders.create({ 
      items, 
      note: '',
      free_modifiers: props.freeModifiers
    });
    orderId.value = res.data?.id || res.id;

    if (paymentMethod.value === 'qr') {
      await loadPromptPayQR();
    }
  } catch (error) {
    console.error(error);
    ui.showToast('ไม่สามารถสร้างรายการสั่งซื้อได้: ' + error.message, 'error');
    paymentMethod.value = null; // Reset selection
  } finally {
    ui.hideLoading();
  }
};

// Fetch PromptPay QR Image
const loadPromptPayQR = async () => {
  qrLoading.value = true;
  try {
    const res = await api.orders.getQR(orderId.value);
    qrCodeUrl.value = res.data?.qr_url || res.qr_url;
  } catch (error) {
    console.error('Failed to load QR:', error);
    ui.showToast('โหลด QR Code ชำระเงินไม่สำเร็จ', 'error');
  } finally {
    qrLoading.value = false;
  }
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

// Cash Checkout
const confirmCashPayment = async () => {
  if (!orderId.value) return;
  ui.showLoading();
  try {
    const cashVal = Number(enteredAmount.value) || 0;
    await api.orders.complete(orderId.value, {
      payment_method: 'cash',
      cash_received: cashVal
    });
    
    success.value = true;
    showConfetti();
    ui.showToast('ชำระเงินสดเรียบร้อย!', 'success');
  } catch (error) {
    console.error(error);
    ui.showToast('บันทึกยอดเงินสดไม่สำเร็จ: ' + error.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

// QR Checkout
const confirmQRPayment = async () => {
  if (!orderId.value) return;
  ui.showLoading();
  try {
    await api.orders.complete(orderId.value, {
      payment_method: 'promptpay',
      cash_received: props.total
    });

    success.value = true;
    showConfetti();
    ui.showToast('ชำระเงิน PromptPay เรียบร้อย!', 'success');
  } catch (error) {
    console.error(error);
    ui.showToast('ยืนยันชำระคิวอาร์โค้ดไม่สำเร็จ: ' + error.message, 'error');
  } finally {
    ui.hideLoading();
  }
};
</script>

<style scoped>
/* --- Payment Section --- */
.payment-amount-display {
  text-align: center;
  padding: var(--space-2xl);
}

.payment-entered {
  font-size: var(--font-4xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  letter-spacing: 1px;
}

.payment-change {
  margin-top: var(--space-md);
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
  padding: 0 var(--space-md);
  margin-bottom: var(--space-md);
  overflow-x: auto;
  scrollbar-width: none;
}

.quick-amounts::-webkit-scrollbar { display: none; }

.quick-amount-btn {
  padding: var(--space-sm) var(--space-lg);
  background: rgba(244, 162, 97, 0.1);
  border: 1px solid rgba(244, 162, 97, 0.2);
  border-radius: var(--radius-full);
  color: var(--accent);
  font-size: var(--font-sm);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  transition: var(--transition-base);
  cursor: pointer;
}

.quick-amount-btn:active {
  transform: scale(0.95);
  background: rgba(244, 162, 97, 0.2);
}

/* --- Payment Methods --- */
.payment-methods {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
  padding: var(--space-md);
}

.payment-method-btn {
  padding: var(--space-xl) var(--space-lg);
  background: var(--card-bg);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-lg);
  text-align: center;
  transition: all var(--transition-base);
  cursor: pointer;
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

/* --- QR Code Section --- */
.qr-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-2xl);
}

.qr-placeholder {
  width: 200px;
  height: 200px;
  background: white;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-xl);
}

.qr-placeholder img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: var(--radius-lg);
}
</style>
