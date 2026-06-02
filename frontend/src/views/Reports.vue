<template>
  <div id="reports-page" class="page-enter">
    
    <!-- Admin Only: Top summary widget -->
    <div v-if="isAdminUser" class="grid grid-2 mb-lg gap-md" style="display:grid; grid-template-columns: repeat(2, 1fr); gap:var(--space-md);">
      <div class="card text-center p-md">
        <div style="font-size: var(--font-xs); color: var(--text-secondary); margin-bottom: 2px;">ยอดขายวันนี้</div>
        <div class="font-bold text-gradient" style="font-size: var(--font-xl);">{{ formatCurrency(summary.today_sales) }}</div>
        <div style="font-size: 10px; color: var(--text-tertiary); margin-top: 2px;">{{ summary.today_orders }} บิลเสร็จสมบูรณ์</div>
      </div>
      <div class="card text-center p-md">
        <div style="font-size: var(--font-xs); color: var(--text-secondary); margin-bottom: 2px;">ยอดรวมเดือนนี้</div>
        <div class="font-bold text-accent" style="font-size: var(--font-xl);">{{ formatCurrency(summary.month_sales) }}</div>
        <div style="font-size: 10px; color: var(--text-tertiary); margin-top: 2px;">{{ summary.month_orders }} รายการขาย</div>
      </div>
    </div>

    <!-- Date selector card -->
    <div class="card mb-lg p-md">
      <div class="flex gap-sm align-center">
        <div style="font-size: var(--font-sm); white-space:nowrap;" class="font-bold">📅 เลือกวันที่:</div>
        <input 
          type="date" 
          class="form-input p-xs" 
          style="padding: 6px var(--space-md); border-radius: var(--radius-sm);" 
          v-model="selectedDate" 
          @change="loadDailyReport"
        />
      </div>
    </div>

    <!-- Loading spinner for reports -->
    <div v-if="loading" class="card text-center p-3xl">
      <div class="spinner" style="margin:0 auto;"></div>
    </div>

    <template v-else>
      <!-- Admin Only: Daily Summary Card -->
      <div v-if="isAdminUser" class="card mb-lg">
        <div class="card-title" style="font-size: var(--font-sm);">📊 สรุปยอดวันที่ {{ formatDate(selectedDate) }}</div>
        
        <div class="flex flex-between mb-sm" style="font-size: var(--font-sm);">
          <span>ยอดขายทั้งหมด (สุทธิ):</span>
          <strong class="text-accent" style="font-size: var(--font-md);">{{ formatCurrency(dailyReport.total_sales) }}</strong>
        </div>
        <div class="flex flex-between mb-sm" style="font-size: var(--font-sm);">
          <span>จำนวนคำสั่งซื้อ:</span>
          <span>{{ dailyReport.total_orders }} บิล</span>
        </div>
        <div class="flex flex-between mb-sm" style="font-size: var(--font-sm);">
          <span>เฉลี่ยต่อบิล:</span>
          <span>{{ formatCurrency(dailyReport.average_bill) }}</span>
        </div>

        <div class="divider" style="margin: var(--space-md) 0; height:1px; background:var(--border-color);"></div>
        
        <!-- Payment Methods Breakdowns -->
        <div class="grid grid-2" style="display:grid; grid-template-columns: repeat(2, 1fr); gap:var(--space-sm); font-size:var(--font-xs);">
          <div class="p-xs card" style="background:var(--bg-secondary); border:none;">
            <div style="color:var(--text-secondary);">💵 เงินสด</div>
            <div class="font-bold" style="font-size:var(--font-base); margin-top:2px;">
              {{ formatCurrency(dailyReport.cash_sales) }}
            </div>
            <div style="color:var(--text-tertiary);">{{ dailyReport.cash_orders }} บิล</div>
          </div>
          <div class="p-xs card" style="background:var(--bg-secondary); border:none;">
            <div style="color:var(--text-secondary);">📱 QR Code</div>
            <div class="font-bold" style="font-size:var(--font-base); margin-top:2px;">
              {{ formatCurrency(dailyReport.qr_sales) }}
            </div>
            <div style="color:var(--text-tertiary);">{{ dailyReport.qr_orders }} บิล</div>
          </div>
        </div>
      </div>

      <!-- Admin Only: Top Selling Menu Items (Last 7 Days) -->
      <div v-if="isAdminUser" class="card mb-lg">
        <div class="card-title" style="font-size: var(--font-sm);">🔥 10 อันดับเมนูขายดีที่สุด (7 วันที่ผ่านมา)</div>
        
        <div v-if="topItems.length === 0" style="font-size:var(--font-sm); color:var(--text-tertiary); text-align:center; padding: var(--space-md);">
          ยังไม่มีข้อมูลการขายในรอบ 7 วันที่ผ่านมา
        </div>
        <div v-else style="display: flex; flex-direction: column; gap: var(--space-sm);">
          <div 
            v-for="(item, index) in topItems" 
            :key="item.menu_item_id" 
            class="flex flex-between align-center p-xs"
            style="font-size:var(--font-sm); border-bottom: 1px solid var(--border-color);"
          >
            <div class="flex align-center gap-sm">
              <span class="font-bold" :class="index === 0 ? 'text-accent' : 'text-secondary'">
                #{{ index + 1 }}
              </span>
              <span>{{ item.item_name }}</span>
            </div>
            <div>
              <span class="font-bold">{{ item.total_qty }}ชิ้น</span> | 
              <span style="font-size:11px; color:var(--text-secondary);">{{ formatCurrency(item.total_sales) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Admin Only: Expense Recording Card -->
      <div v-if="isAdminUser" class="card mb-lg">
        <div class="card-title" style="font-size: var(--font-sm);">💸 บันทึกค่าใช้จ่ายประจำวัน</div>
        
        <!-- Quick Add Expense Form -->
        <div style="display:flex; gap:var(--space-sm); flex-wrap:wrap; margin-bottom:var(--space-md);">
          <input type="number" class="form-input" v-model.number="expenseForm.amount" placeholder="จำนวนเงิน (บาท)" style="flex:1; min-width:100px;" />
          <select class="form-input" v-model="expenseForm.category" style="flex:1; min-width:120px;">
            <option value="raw_materials">🍗 วัตถุดิบ</option>
            <option value="gas_fuel">⛽ แก๊ส/น้ำมัน</option>
            <option value="packaging">📦 บรรจุภัณฑ์/ถุง</option>
            <option value="other">📎 อื่นๆ</option>
          </select>
        </div>
        <div style="display:flex; gap:var(--space-sm); margin-bottom:var(--space-md);">
          <input type="text" class="form-input" v-model="expenseForm.note" placeholder="บันทึกช่วยจำ..." style="flex:1;" />
          <button class="btn btn-primary" @click="handleAddExpense" :disabled="!expenseForm.amount || expenseForm.amount <= 0" style="white-space:nowrap;">
            💾 บันทึก
          </button>
        </div>

        <!-- Today's Expense List -->
        <div v-if="expenses.length > 0" style="display:flex; flex-direction:column; gap:var(--space-sm);">
          <div v-for="exp in expenses" :key="exp.id" class="p-sm card" style="font-size:var(--font-sm); background:var(--bg-primary); display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span class="font-bold text-danger">-{{ formatCurrency(exp.amount) }}</span>
              <span style="margin-left:6px; color:var(--text-secondary);">{{ getCategoryLabel(exp.category) }}</span>
              <div v-if="exp.note" style="font-size:11px; color:var(--text-tertiary); margin-top:2px;">{{ exp.note }}</div>
            </div>
            <button class="btn btn-sm" style="background:rgba(255,59,48,0.1); color:#ff3b30; border:none; padding:4px 8px; font-size:11px; border-radius:var(--radius-sm); cursor:pointer;" @click="handleDeleteExpense(exp.id)">🗑️</button>
          </div>
          <div class="flex flex-between font-bold" style="font-size:var(--font-sm); padding-top:var(--space-sm); border-top:1px solid var(--border-color);">
            <span>รวมค่าใช้จ่ายวันนี้:</span>
            <span class="text-danger">-{{ formatCurrency(totalExpenses) }}</span>
          </div>
          <div class="flex flex-between font-bold" style="font-size:var(--font-md); color:var(--success);">
            <span>💰 กำไรสุทธิ:</span>
            <span>{{ formatCurrency(dailyReport.total_sales - totalExpenses) }}</span>
          </div>
        </div>
        <div v-else style="font-size:var(--font-sm); color:var(--text-tertiary); text-align:center; padding:var(--space-md);">
          ยังไม่มีค่าใช้จ่ายในวันนี้
        </div>
      </div>

      <!-- Today's Transaction Logs (ALL ROLES) -->
      <div class="card mb-lg">
        <div class="card-title" style="font-size: var(--font-sm);">📋 รายการบิลประจำวัน</div>
        
        <div v-if="dailyReport.orders?.length === 0" style="font-size:var(--font-sm); color:var(--text-tertiary); text-align:center; padding: var(--space-md);">
          ยังไม่มีรายการขายในวันนี้
        </div>
        <div v-else style="display: flex; flex-direction: column; gap: var(--space-sm);">
          <div 
            v-for="order in dailyReport.orders" 
            :key="order.id" 
            class="p-sm card"
            style="font-size:var(--font-sm); background: var(--bg-primary); display:flex; flex-direction:column; gap:2px; cursor:pointer;"
            @click="toggleExpandOrder(order.id)"
          >
            <div class="flex flex-between font-bold">
              <span :style="order.status === 'cancelled' ? 'text-decoration:line-through; opacity:0.5;' : ''">
                #{{ order.order_number }}
              </span>
              <div>
                <span v-if="order.status === 'cancelled'" class="text-danger" style="font-size:11px; margin-right:4px;">❌ ยกเลิก</span>
                <span :class="order.status === 'cancelled' ? 'text-danger' : 'text-accent'">{{ formatCurrency(order.total) }}</span>
              </div>
            </div>
            <div class="flex flex-between" style="font-size:11px; color:var(--text-secondary); margin-top:2px;">
              <span>{{ order.payment_method === 'cash' ? '💵 เงินสด' : order.payment_method === 'qr' ? '📱 QR Code' : '⏳ รอชำระ' }}</span>
              <span>เวลา: {{ formatTime(order.created_at) }}</span>
            </div>
            <div v-if="order.cancel_reason" style="font-size: 11px; color: #ff3b30; border-left: 2px solid #ff3b30; padding-left:6px; margin-top:4px;">
              เหตุผลยกเลิก: {{ order.cancel_reason }}
            </div>

            <!-- Expandable: Order Items Detail -->
            <div v-if="expandedOrderId === order.id" style="margin-top:var(--space-sm); padding-top:var(--space-sm); border-top:1px dashed var(--border-color);">
              <div v-if="expandedItems.length === 0" style="font-size:11px; color:var(--text-tertiary); text-align:center;">กำลังโหลด...</div>
              <div v-else>
                <div v-for="item in expandedItems" :key="item.id" class="flex flex-between" style="font-size:12px; padding:2px 0;">
                  <span>{{ item.item_name }} x{{ item.quantity }}</span>
                  <span>{{ formatCurrency(item.subtotal) }}</span>
                </div>
              </div>
              <!-- Void Button (only for completed orders) -->
              <button 
                v-if="order.status === 'completed'" 
                class="btn btn-sm" 
                style="margin-top:var(--space-sm); width:100%; background:rgba(255,59,48,0.1); color:#ff3b30; border:1px solid rgba(255,59,48,0.3); min-height:40px; font-size:var(--font-sm);"
                @click.stop="openVoidModal(order)"
              >
                🚫 ยกเลิกบิลนี้ (Void)
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Admin Only: Activity Logs Card -->
      <div v-if="isAdminUser" class="card mb-lg">
        <div class="card-title" style="font-size: var(--font-sm);">👁️ ประวัติกิจกรรมพนักงาน</div>
        
        <div v-if="activityLogs.length === 0" style="font-size:var(--font-sm); color:var(--text-tertiary); text-align:center; padding:var(--space-md);">
          ยังไม่มีกิจกรรมในวันนี้
        </div>
        <div v-else style="display:flex; flex-direction:column; gap:var(--space-sm); max-height:400px; overflow-y:auto;">
          <div v-for="log in activityLogs" :key="log.id" class="p-sm" style="font-size:12px; border-bottom:1px solid var(--border-color);">
            <div class="flex flex-between">
              <span class="font-bold">{{ getActionIcon(log.action) }} {{ log.staff_name || 'ระบบ' }}</span>
              <span style="color:var(--text-tertiary); font-size:11px;">{{ formatTime(log.created_at) }}</span>
            </div>
            <div style="color:var(--text-secondary); margin-top:2px;">{{ log.details }}</div>
          </div>
        </div>
      </div>
    </template>

    <!-- Void Order Modal -->
    <div v-if="showVoidModal" class="modal-container active" style="display:flex; align-items:center; justify-content:center; position: fixed; inset:0; z-index:1000;">
      <div class="modal-overlay" @click="showVoidModal = false"></div>
      <div class="modal-content modal-center w-full max-w-sm" style="position:relative; z-index:2;">
        <div class="modal-header">
          <h3>🚫 ยกเลิกบิล #{{ voidOrder?.order_number }}</h3>
          <button class="modal-close" @click="showVoidModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div style="font-size:var(--font-sm); color:var(--text-secondary); margin-bottom:var(--space-lg); text-align:center;">
            ยอดรวม: <strong class="text-accent">{{ formatCurrency(voidOrder?.total) }}</strong>
          </div>

          <div class="form-label" style="margin-bottom:var(--space-sm);">เลือกเหตุผลการยกเลิก:</div>
          
          <!-- Preset Buttons -->
          <div style="display:flex; flex-direction:column; gap:var(--space-sm); margin-bottom:var(--space-md);">
            <button 
              v-for="preset in voidPresets" 
              :key="preset.value"
              class="btn"
              :class="voidReason === preset.value ? 'btn-primary' : 'btn-secondary'"
              style="text-align:left; min-height:44px;"
              @click="voidReason = preset.value"
            >
              {{ preset.icon }} {{ preset.label }}
            </button>
          </div>

          <!-- Custom Reason Input -->
          <div v-if="voidReason === 'custom'" class="form-group">
            <input type="text" class="form-input" v-model="voidCustomReason" placeholder="พิมพ์เหตุผลที่ต้องการระบุ..." />
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-md mt-lg">
            <button class="btn btn-secondary flex-1" @click="showVoidModal = false">ยกเลิก</button>
            <button 
              class="btn flex-1" 
              style="background:rgba(255,59,48,0.9); color:#fff; border:none;"
              :disabled="!voidReason || (voidReason === 'custom' && !voidCustomReason.trim())"
              @click="handleVoidOrder"
            >
              ✅ ยืนยันยกเลิกบิล
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../api';
import { ui, formatCurrency, formatDate, formatTime, getToday, isAdmin } from '../helpers';

// Role check
const isAdminUser = computed(() => isAdmin());

// States
const selectedDate = ref(getToday());
const loading = ref(true);
const summary = ref({
  today_sales: 0,
  today_orders: 0,
  month_sales: 0,
  month_orders: 0
});
const dailyReport = ref({
  total_sales: 0,
  total_orders: 0,
  average_bill: 0,
  cash_sales: 0,
  cash_orders: 0,
  qr_sales: 0,
  qr_orders: 0,
  orders: []
});
const topItems = ref([]);
const expenses = ref([]);
const activityLogs = ref([]);

// Expanded order state
const expandedOrderId = ref(null);
const expandedItems = ref([]);

// Void modal state
const showVoidModal = ref(false);
const voidOrder = ref(null);
const voidReason = ref('');
const voidCustomReason = ref('');
const voidPresets = [
  { value: 'ลูกค้ายกเลิกออเดอร์', label: 'ลูกค้ายกเลิกออเดอร์', icon: '❌' },
  { value: 'กรอกข้อมูลผิดพลาด / ทำบิลซ้ำ', label: 'กรอกข้อมูลผิดพลาด / ทำบิลซ้ำ', icon: '✍️' },
  { value: 'custom', label: 'อื่นๆ (ระบุเอง)', icon: '💬' },
];

// Expense form state
const expenseForm = ref({
  amount: null,
  category: 'raw_materials',
  note: ''
});

const totalExpenses = computed(() => expenses.value.reduce((sum, e) => sum + (e.amount || 0), 0));

// ── Data Loading ──

const loadReportSummary = async () => {
  try {
    const res = await api.reports.summary();
    if (res.success && res.data) {
      summary.value = {
        today_sales: res.data.today?.total_revenue || 0,
        today_orders: res.data.today?.total_orders || 0,
        month_sales: res.data.month?.total_revenue || 0,
        month_orders: res.data.month?.total_orders || 0
      };
    }
  } catch (e) {
    console.warn(e);
  }
};

const loadDailyReport = async () => {
  loading.value = true;
  expandedOrderId.value = null;
  expandedItems.value = [];
  try {
    const dateVal = selectedDate.value || getToday();
    const res = await api.reports.daily(dateVal);
    if (res.success && res.data) {
      const data = res.data;
      dailyReport.value = {
        total_sales: data.total_revenue || 0,
        total_orders: data.total_orders || 0,
        average_bill: data.avg_order_value || 0,
        cash_sales: data.payment_breakdown?.cash_total || 0,
        cash_orders: data.payment_breakdown?.cash_count || 0,
        qr_sales: data.payment_breakdown?.qr_total || 0,
        qr_orders: data.payment_breakdown?.qr_count || 0,
        orders: data.orders || []
      };
    }
    // Load expenses and activity logs for the same date (admin only)
    if (isAdmin()) {
      loadExpenses(dateVal);
      loadActivityLogs(dateVal);
    }
  } catch (e) {
    console.error(e);
    ui.showToast('ไม่สามารถดึงข้อมูลรายงานประจำวันได้', 'error');
  } finally {
    loading.value = false;
  }
};

const loadTopItems = async () => {
  try {
    const res = await api.reports.topItems(7);
    if (res.success && Array.isArray(res.data)) {
      topItems.value = res.data.map(item => ({
        ...item,
        total_sales: item.total_revenue || 0
      }));
    }
  } catch (e) {
    console.warn(e);
  }
};

const loadExpenses = async (date) => {
  try {
    const res = await api.expenses.get(date);
    if (res.success) {
      expenses.value = res.data || [];
    }
  } catch (e) {
    console.warn(e);
  }
};

const loadActivityLogs = async (date) => {
  try {
    const res = await api.activities.get(date);
    if (res.success) {
      activityLogs.value = res.data || [];
    }
  } catch (e) {
    console.warn(e);
  }
};

// ── Order Expand & Void ──

const toggleExpandOrder = async (orderId) => {
  if (expandedOrderId.value === orderId) {
    expandedOrderId.value = null;
    expandedItems.value = [];
    return;
  }
  expandedOrderId.value = orderId;
  expandedItems.value = [];
  try {
    const res = await api.orders.getById(orderId);
    if (res.success && res.data?.items) {
      expandedItems.value = res.data.items;
    }
  } catch (e) {
    console.error(e);
  }
};

const openVoidModal = (order) => {
  voidOrder.value = order;
  voidReason.value = '';
  voidCustomReason.value = '';
  showVoidModal.value = true;
};

const handleVoidOrder = async () => {
  if (!voidOrder.value) return;
  const finalReason = voidReason.value === 'custom' ? voidCustomReason.value.trim() : voidReason.value;
  if (!finalReason) return;

  ui.showLoading();
  try {
    const res = await api.orders.cancel(voidOrder.value.id, finalReason);
    if (res.success) {
      ui.showToast(`ยกเลิกบิล #${voidOrder.value.order_number} สำเร็จ`, 'success');
      showVoidModal.value = false;
      loadDailyReport();
      if (isAdmin()) {
        loadReportSummary();
      }
    }
  } catch (e) {
    ui.showToast('ยกเลิกบิลไม่สำเร็จ: ' + e.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

// ── Expense Handlers ──

const handleAddExpense = async () => {
  ui.showLoading();
  try {
    const res = await api.expenses.create({
      amount: expenseForm.value.amount,
      category: expenseForm.value.category,
      note: expenseForm.value.note,
      expense_date: selectedDate.value
    });
    if (res.success) {
      ui.showToast('บันทึกค่าใช้จ่ายสำเร็จ', 'success');
      expenseForm.value = { amount: null, category: 'raw_materials', note: '' };
      loadExpenses(selectedDate.value);
      loadActivityLogs(selectedDate.value);
    }
  } catch (e) {
    ui.showToast('บันทึกค่าใช้จ่ายไม่สำเร็จ: ' + e.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

const handleDeleteExpense = async (id) => {
  const ok = await ui.showConfirm('ลบรายจ่าย', 'ต้องการลบรายการค่าใช้จ่ายนี้ใช่หรือไม่?');
  if (!ok) return;
  ui.showLoading();
  try {
    const res = await api.expenses.delete(id);
    if (res.success) {
      ui.showToast('ลบค่าใช้จ่ายสำเร็จ', 'success');
      loadExpenses(selectedDate.value);
      loadActivityLogs(selectedDate.value);
    }
  } catch (e) {
    ui.showToast('ลบค่าใช้จ่ายไม่สำเร็จ: ' + e.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

// ── Helpers ──

const getCategoryLabel = (cat) => {
  const map = {
    'raw_materials': '🍗 วัตถุดิบ',
    'gas_fuel': '⛽ แก๊ส/น้ำมัน',
    'packaging': '📦 บรรจุภัณฑ์',
    'other': '📎 อื่นๆ'
  };
  return map[cat] || cat;
};

const getActionIcon = (action) => {
  const map = {
    'login': '🔑',
    'create_order': '🛒',
    'complete_order': '✅',
    'cancel_order': '🚫',
    'adjust_stock': '🔧',
    'record_waste': '🗑️',
    'staff_credit': '🍴',
    'log_expense': '💸',
    'delete_expense': '🗑️'
  };
  return map[action] || '📌';
};

onMounted(() => {
  if (isAdmin()) {
    loadReportSummary();
    loadTopItems();
  }
  loadDailyReport();
});
</script>

<style scoped>
/* Reuse existing chart styles */
.stat-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  text-align: center;
}
</style>
