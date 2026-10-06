<template>
  <div class="expense-management-wrapper card p-md" style="position:relative; background: var(--glass-bg); backdrop-filter: var(--glass-blur); border: 1px solid var(--glass-border); box-shadow: var(--shadow-md);">
    <div class="card-title" style="font-size: var(--font-sm);">
      <i class="fa-solid fa-wallet" style="margin-right: 6px;"></i> {{ expenseFormTitle }}
    </div>
    
    <!-- Quick Add Expense Form -->
    <div class="expense-form-grid">
      <div class="form-group mb-xs">
        <input type="number" class="form-input" v-model.number="expenseForm.amount" placeholder="จำนวนเงิน (บาท)" />
      </div>
      <div class="form-group mb-xs">
        <div class="custom-select-wrapper" @click.stop>
          <div 
            class="custom-select-trigger" 
            :class="{ 'active': isExpenseCategoryDropdownOpen }" 
            @click="isExpenseCategoryDropdownOpen = !isExpenseCategoryDropdownOpen"
          >
            <span class="custom-select-text" style="display: inline-flex; align-items: center; gap: 6px;">
              <i :class="getExpenseCategoryIcon(expenseForm.category)"></i>
              {{ selectedExpenseCategoryLabel }}
            </span>
          </div>
          <div v-if="isExpenseCategoryDropdownOpen" class="custom-select-dropdown" style="max-height: 250px; overflow-y: auto;">
            <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'raw_chicken' }" @click="selectExpenseCategory('raw_chicken')"><i class="fa-solid fa-drumstick-bite" style="margin-right: 4px;"></i> ไก่สด</div>
            <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'sticky_rice' }" @click="selectExpenseCategory('sticky_rice')"><i class="fa-solid fa-bowl-rice" style="margin-right: 4px;"></i> ข้าวเหนียว</div>
            <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'meatballs' }" @click="selectExpenseCategory('meatballs')"><i class="fa-solid fa-circle" style="margin-right: 4px;"></i> ลูกชิ้น</div>
            <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'salapao' }" @click="selectExpenseCategory('salapao')"><i class="fa-solid fa-cookie" style="margin-right: 4px;"></i> ซาลาเปา</div>
            <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'fuel_oil' }" @click="selectExpenseCategory('fuel_oil')"><i class="fa-solid fa-gas-pump" style="margin-right: 4px;"></i> น้ำมัน</div>
            <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'gas_lpg' }" @click="selectExpenseCategory('gas_lpg')"><i class="fa-solid fa-fire" style="margin-right: 4px;"></i> แก๊ส</div>
            <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'salary' }" @click="selectExpenseCategory('salary')"><i class="fa-solid fa-hand-holding-dollar" style="margin-right: 4px;"></i> เงินเดือน</div>
            <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'utility_bills' }" @click="selectExpenseCategory('utility_bills')"><i class="fa-solid fa-bolt" style="margin-right: 4px;"></i> ค่าไฟ/น้ำ</div>
            <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'packaging' }" @click="selectExpenseCategory('packaging')"><i class="fa-solid fa-box" style="margin-right: 4px;"></i> บรรจุภัณฑ์/ถุง</div>
            <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'debt' }" @click="selectExpenseCategory('debt')"><i class="fa-solid fa-file-invoice-dollar" style="margin-right: 4px;"></i> หนี้</div>
            <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'other' }" @click="selectExpenseCategory('other')"><i class="fa-solid fa-paperclip" style="margin-right: 4px;"></i> อื่นๆ</div>
          </div>
        </div>
      </div>
      <div class="form-group mb-xs">
        <div class="custom-select-wrapper" @click.stop>
          <div 
            class="custom-select-trigger" 
            :class="{ 'active': isExpensePaymentMethodDropdownOpen }" 
            @click="isExpensePaymentMethodDropdownOpen = !isExpensePaymentMethodDropdownOpen"
          >
            <span class="custom-select-text" style="display: inline-flex; align-items: center; gap: 6px;">
              <i :class="expenseForm.payment_method === 'transfer' ? 'fa-solid fa-mobile-screen-button' : 'fa-solid fa-money-bill-wave'"></i>
              {{ expenseForm.payment_method === 'transfer' ? 'เงินโอน' : 'เงินสด' }}
            </span>
          </div>
          <div v-if="isExpensePaymentMethodDropdownOpen" class="custom-select-dropdown" style="max-height: 250px; overflow-y: auto;">
            <div class="custom-select-option" :class="{ 'selected': expenseForm.payment_method === 'cash' }" @click="selectExpensePaymentMethod('cash')">
              <i class="fa-solid fa-money-bill-wave" style="margin-right: 4px;"></i> เงินสด
            </div>
            <div class="custom-select-option" :class="{ 'selected': expenseForm.payment_method === 'transfer' }" @click="selectExpensePaymentMethod('transfer')">
              <i class="fa-solid fa-mobile-screen-button" style="margin-right: 4px;"></i> เงินโอน
            </div>
          </div>
        </div>
      </div>
      <div class="form-group mb-xs">
        <input type="text" class="form-input" v-model="expenseForm.note" placeholder="บันทึกช่วยจำ..." />
      </div>
      <!-- Presets Row -->
      <div class="expense-form-presets flex gap-sm align-center flex-wrap">
        <span class="text-secondary font-bold text-sm"><i class="fa-solid fa-tags"></i> บันทึกด่วน:</span>
        <button 
          type="button" 
          class="btn btn-secondary btn-sm preset-btn" 
          :class="{ 'active': expenseForm.note === 'แม็คโคร' }"
          @click="expenseForm.note = 'แม็คโคร'"
        >
          แม็คโคร
        </button>
        <button 
          type="button" 
          class="btn btn-secondary btn-sm preset-btn" 
          :class="{ 'active': expenseForm.note === 'ตลาดสด' }"
          @click="expenseForm.note = 'ตลาดสด'"
        >
          ตลาดสด
        </button>
        <button 
          type="button" 
          class="btn btn-secondary btn-sm preset-btn" 
          :class="{ 'active': expenseForm.note === 'เลี้ยงลูกน้อง' }"
          @click="expenseForm.note = 'เลี้ยงลูกน้อง'"
        >
          เลี้ยงลูกน้อง
        </button>
      </div>
      <div class="form-group mb-xs expense-form-submit-group">
        <button class="btn btn-primary btn-block" @click="handleAddExpense" :disabled="!expenseForm.amount || expenseForm.amount <= 0 || saving">
          <i v-if="saving" class="fa-solid fa-spinner fa-spin"></i>
          <i v-else class="fa-solid fa-floppy-disk"></i>
          <span>{{ saving ? ' กำลังบันทึก...' : ' บันทึก' }}</span>
        </button>
      </div>
    </div>

    <!-- Monthly / Daily Ledger Section -->
    <div class="divider" style="margin: var(--space-xl) 0; height:1px; background:var(--border-color);"></div>
    
    <div class="flex flex-between align-center mb-md" style="flex-wrap: wrap; gap: var(--space-sm);">
      <div class="card-title" style="font-size: var(--font-sm); margin: 0;">
        <i class="fa-solid fa-book" style="margin-right: 6px;"></i> สมุดบัญชีรายรับ-รายจ่าย ({{ ledgerPeriodLabel }})
      </div>
      <div style="display:flex; align-items:center; gap:var(--space-sm);">
        <button 
          v-if="filteredLedgerTransactions.length > 0"
          class="btn btn-sm btn-secondary csv-export-btn" 
          style="display:inline-flex; align-items:center; gap:4px;"
          @click="exportExpensesCSV"
        >
          <i class="fa-solid fa-file-csv" style="margin-right: 4px;"></i> ส่งออกบัญชี (CSV)
        </button>
        <div v-if="ledgerLoading" class="spinner spinner-sm"></div>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="ledger-summary-grid">
      <div class="p-xs card" style="background:rgba(42, 157, 143, 0.05); border:none; text-align:center;">
        <div style="color:var(--text-secondary); margin-bottom: 2px; font-size:var(--font-xs);">รายรับรวม</div>
        <div class="font-bold text-success" style="font-size:var(--font-base);">
          {{ formatCurrency(filteredLedgerTransactions.reduce((sum, t) => sum + t.income, 0)) }}
        </div>
      </div>
      <div class="p-xs card" style="background:rgba(173, 40, 30, 0.05); border:none; text-align:center;">
        <div style="color:var(--text-secondary); margin-bottom: 2px; font-size:var(--font-xs);">รายจ่ายรวม</div>
        <div class="font-bold text-danger" style="font-size:var(--font-base);">
          {{ formatCurrency(filteredLedgerTransactions.reduce((sum, t) => sum + t.expense, 0)) }}
        </div>
      </div>
      <div class="p-xs card" style="background:rgba(173, 40, 30, 0.05); border:none; text-align:center;">
        <div style="color:var(--text-secondary); margin-bottom: 2px; font-size:var(--font-xs);">คงเหลือสุทธิ</div>
        <div class="font-bold" style="font-size:var(--font-base); color: var(--text-primary);">
          {{ formatCurrency(filteredLedgerTransactions.reduce((sum, t) => sum + t.income - t.expense, 0)) }}
        </div>
      </div>
    </div>

    <div class="hide-mobile" style="display: block; width: 100%; overflow-x: auto; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
      <table class="table" style="width: 100%; border-collapse: collapse; table-layout: fixed;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-color); background: rgba(139, 3, 19, 0.03);">
            <th class="text-center" style="width: 15%; padding: 16px var(--space-md); white-space:nowrap;">วัน-เวลา</th>
            <th class="text-center" style="width: 30%; padding: 16px var(--space-md);">ชื่อรายการ</th>
            <th class="text-center" style="width: 15%; padding: 16px var(--space-md); white-space:nowrap;">รายรับ</th>
            <th class="text-center" style="width: 15%; padding: 16px var(--space-md); white-space:nowrap;">รายจ่าย</th>
            <th class="text-center" style="width: 15%; padding: 16px var(--space-md); white-space:nowrap;">คงเหลือ</th>
            <th class="text-center" style="width: 10%; padding: 16px var(--space-md); white-space:nowrap;">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="ledgerLoading && filteredLedgerTransactions.length === 0">
            <td colspan="6" style="text-align: center; padding: var(--space-3xl) var(--space-md) !important;">
              <div class="spinner mx-auto"></div>
            </td>
          </tr>
          <tr v-else-if="filteredLedgerTransactions.length === 0">
            <td colspan="6" style="text-align: center; padding: var(--space-3xl) var(--space-md) !important; color: var(--text-secondary);">
              <div class="flex flex-col align-center justify-center gap-xs">
                <i class="fa-solid fa-receipt text-secondary" style="font-size: 1.8rem; opacity: 0.35;"></i>
                <div class="font-bold text-sm">ไม่มีรายการธุรกรรมในช่วงเวลานี้</div>
              </div>
            </td>
          </tr>
          <tr 
            v-else 
            v-for="item in paginatedLedgerTransactions" 
            :key="item.type + '-' + item.id" 
            style="border-bottom: 1px solid var(--border-color);"
            class="table-row-hover"
          >
            <td class="text-center" style="width: 15%; padding: 18px var(--space-md); vertical-align: middle; white-space:nowrap; color:var(--text-secondary);">
              {{ item.formattedDate }}<br/>{{ item.formattedTime }}
            </td>
            <td class="text-center" style="width: 30%; padding: 18px var(--space-md); vertical-align: middle; font-weight: 500; white-space: normal; word-break: break-word;">
              {{ item.name }}
            </td>
            <td class="text-success text-center" style="width: 15%; padding: 18px var(--space-md); vertical-align: middle; font-weight:bold;">
              {{ item.income > 0 ? formatCurrency(item.income) : '-' }}
            </td>
            <td class="text-danger text-center" style="width: 15%; padding: 18px var(--space-md); vertical-align: middle; font-weight:bold;">
              {{ item.expense > 0 ? '-' + formatCurrency(item.expense) : '-' }}
            </td>
            <td class="text-center" style="width: 15%; padding: 18px var(--space-md); vertical-align: middle; font-weight:bold; color: var(--text-primary);">
              {{ formatCurrency(item.runningBalance) }}
            </td>
            <td class="text-center" style="width: 10%; padding: 18px var(--space-md); vertical-align: middle;">
              <button 
                v-if="item.type === 'expense'" 
                class="btn-action btn-action-delete"
                :disabled="deletingExpenseId === item.id"
                @click="handleDeleteExpense(item.id)"
              >
                <i v-if="deletingExpenseId === item.id" class="fa-solid fa-spinner fa-spin"></i>
                <i v-else class="fa-solid fa-trash-can"></i>
                <span>{{ deletingExpenseId === item.id ? ' กำลังลบ...' : ' ลบ' }}</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Ledger Cards -->
    <div class="mobile-menu-list-container" style="display: none;">
      <div v-if="filteredLedgerTransactions.length === 0" class="card text-center py-xl" style="color: var(--text-tertiary);">
        ไม่มีรายการธุรกรรมในช่วงเวลานี้
      </div>
      <div v-else class="flex flex-col gap-sm">
        <div 
          v-for="item in paginatedLedgerTransactions" 
          :key="'mobile-' + item.type + '-' + item.id"
          class="ledger-mobile-card"
          :class="item.income > 0 ? 'income' : 'expense'"
        >
          <div class="flex flex-between align-center mb-xs">
            <span class="text-xs text-secondary">{{ item.formattedDate }} {{ item.formattedTime }}</span>
            <span class="font-bold text-sm" :class="item.income > 0 ? 'text-success' : 'text-danger'">
              {{ item.income > 0 ? '+' + formatCurrency(item.income) : '-' + formatCurrency(item.expense) }}
            </span>
          </div>
          <div class="flex flex-between align-center">
            <span class="text-sm font-semibold">{{ item.name }}</span>
            <button 
              v-if="item.type === 'expense'" 
              class="btn-action btn-action-delete" 
              style="padding: 2px 6px; font-size: 11px;"
              :disabled="deletingExpenseId === item.id"
              @click="handleDeleteExpense(item.id)"
            >
              <i v-if="deletingExpenseId === item.id" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-trash-can"></i>
              <span>{{ deletingExpenseId === item.id ? ' ลบ...' : ' ลบ' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination Controls -->
    <div v-if="totalLedgerPages > 1" class="flex flex-between align-center mt-md pt-md" style="border-top: 1px solid var(--border-color);">
      <button 
        class="btn btn-secondary btn-sm" 
        :disabled="ledgerCurrentPage === 1" 
        @click="ledgerCurrentPage--"
      >
        <i class="fa-solid fa-chevron-left"></i> ก่อนหน้า
      </button>
      <span class="text-xs text-secondary">
        หน้า {{ ledgerCurrentPage }} จาก {{ totalLedgerPages }}
      </span>
      <button 
        class="btn btn-secondary btn-sm" 
        :disabled="ledgerCurrentPage === totalLedgerPages" 
        @click="ledgerCurrentPage++"
      >
        ถัดไป <i class="fa-solid fa-chevron-right"></i>
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import api from '../api';
import { ui, formatCurrency, formatDate, formatTime, getToday } from '../helpers';

const props = defineProps({
  branchId: {
    type: Number,
    default: null
  },
  selectedDate: {
    type: String,
    default: null
  },
  selectedMonth: {
    type: String,
    default: null
  },
  selectedYear: {
    type: String,
    default: null
  },
  periodMode: {
    type: String,
    default: 'daily'
  },
  startTime: {
    type: String,
    default: '00.00'
  },
  endTime: {
    type: String,
    default: '23.59'
  }
});

const activeDate = computed(() => props.selectedDate || getToday());
const activeMonth = computed(() => props.selectedMonth || getToday().substring(0, 7));
const activeYear = computed(() => props.selectedYear || getToday().substring(0, 4));
const activePeriodMode = computed(() => props.periodMode || 'daily');

const expenseFormTitle = computed(() => {
  if (activePeriodMode.value === 'daily') {
    return `บันทึกค่าใช้จ่ายประจำวัน (${activeDate.value === getToday() ? 'วันนี้' : 'วันที่ ' + formatDate(activeDate.value)})`;
  } else if (activePeriodMode.value === 'monthly') {
    const [y, m] = activeMonth.value.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return `บันทึกค่าใช้จ่าย (ประจำเดือน ${d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })})`;
  } else {
    return `บันทึกค่าใช้จ่าย (ประจำปี ${Number(activeYear.value) + 543})`;
  }
});

const ledgerPeriodLabel = computed(() => {
  if (activePeriodMode.value === 'daily') {
    return `วัน ${formatDate(activeDate.value)}`;
  } else if (activePeriodMode.value === 'monthly') {
    const [y, m] = activeMonth.value.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return `เดือน ${d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}`;
  } else {
    return `ปี ${Number(activeYear.value) + 543}`;
  }
});

// Expense form
const expenseForm = ref({
  amount: null,
  category: 'raw_chicken',
  note: '',
  payment_method: 'transfer'
});
const saving = ref(false);

const isExpenseCategoryDropdownOpen = ref(false);
const selectedExpenseCategoryLabel = computed(() => {
  const categoryLabels = {
    raw_chicken: 'ไก่สด',
    sticky_rice: 'ข้าวเหนียว',
    meatballs: 'ลูกชิ้น',
    salapao: 'ซาลาเปา',
    fuel_oil: 'น้ำมัน',
    gas_lpg: 'แก๊ส',
    salary: 'เงินเดือน',
    utility_bills: 'ค่าไฟ/น้ำ',
    packaging: 'บรรจุภัณฑ์/ถุง',
    debt: 'หนี้',
    other: 'อื่นๆ'
  };
  return categoryLabels[expenseForm.value.category] || 'เลือกหมวดหมู่...';
});

// Ledger
const orders = ref([]);
const expenses = ref([]);
const guarantees = ref([]);
const ledgerTransactions = ref([]);
const ledgerLoading = ref(false);
const ledgerCurrentPage = ref(1);
const ledgerPerPage = 15;

const parseTimeDot = (timeStr) => {
  if (!timeStr) return { hour: 0, minute: 0 };
  const normalized = timeStr.replace(':', '.');
  const parts = normalized.split('.');
  const hour = Number(parts[0]) || 0;
  const minute = Number(parts[1]) || 0;
  return { hour, minute };
};

const getBangkokTimeComponents = (dateStr) => {
  if (!dateStr) return { hour: 0, minute: 0 };
  let d;
  if (typeof dateStr === 'string' && !dateStr.includes('T') && !dateStr.includes('Z') && !dateStr.includes('+')) {
    const timeAdded = dateStr.includes(' ') ? dateStr : dateStr + ' 00:00:00';
    const isoStr = timeAdded.replace(' ', 'T') + '+07:00';
    d = new Date(isoStr);
  } else {
    d = new Date(dateStr);
  }
  const bkkString = d.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Bangkok',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const [h, m] = bkkString.split(':').map(Number);
  return { hour: h, minute: m };
};

const isTimeInRange = (dateStr, startStr, endStr) => {
  const start = parseTimeDot(startStr || '00.00');
  const end = parseTimeDot(endStr || '23.59');
  const { hour, minute } = getBangkokTimeComponents(dateStr);
  const timeVal = hour * 60 + minute;
  const startVal = start.hour * 60 + start.minute;
  const endVal = end.hour * 60 + end.minute;
  if (startVal <= endVal) {
    return timeVal >= startVal && timeVal <= endVal;
  } else {
    return timeVal >= startVal || timeVal <= endVal;
  }
};

const filteredLedgerTransactions = computed(() => {
  let list = ledgerTransactions.value;
  const isTimeFilterActive = (props.startTime && props.startTime !== '00.00') || (props.endTime && props.endTime !== '23.59');
  if (activePeriodMode.value === 'daily' && isTimeFilterActive) {
    list = list.filter(item => isTimeInRange(item.created_at, props.startTime, props.endTime));
  }
  return list;
});

const totalLedgerPages = computed(() => {
  return Math.ceil(filteredLedgerTransactions.value.length / ledgerPerPage) || 1;
});

const paginatedLedgerTransactions = computed(() => {
  const start = (ledgerCurrentPage.value - 1) * ledgerPerPage;
  const end = start + ledgerPerPage;
  return filteredLedgerTransactions.value.slice(start, end);
});

const selectExpenseCategory = (cat) => {
  expenseForm.value.category = cat;
  isExpenseCategoryDropdownOpen.value = false;
};

const isExpensePaymentMethodDropdownOpen = ref(false);
const selectExpensePaymentMethod = (method) => {
  expenseForm.value.payment_method = method;
  isExpensePaymentMethodDropdownOpen.value = false;
};

const computeLedgerTransactions = () => {
  const list = [];

  orders.value.forEach(o => {
    if (o.status !== 'completed') return;
    list.push({
      id: o.id,
      created_at: o.created_at,
      timestamp: new Date(o.created_at.replace(' ', 'T')).getTime(),
      name: `ขายสินค้า (บิล #${o.order_number})`,
      income: o.total || 0,
      expense: 0,
      type: 'order'
    });
  });

  expenses.value.forEach(e => {
    const pmLabel = e.payment_method === 'transfer' ? 'เงินโอน' : 'เงินสด';
    list.push({
      id: e.id,
      created_at: e.created_at,
      timestamp: new Date(e.created_at.replace(' ', 'T')).getTime(),
      name: `${e.note || getCategoryLabel(e.category)} (${pmLabel})`,
      income: 0,
      expense: e.amount || 0,
      type: 'expense'
    });
  });

  guarantees.value.forEach(g => {
    const depDate = g.deposit_date || (g.created_at ? g.created_at.substring(0, 10) : '');
    let matches = false;
    if (activePeriodMode.value === 'daily' && depDate === activeDate.value) matches = true;
    else if (activePeriodMode.value === 'monthly' && depDate.startsWith(activeMonth.value)) matches = true;
    else if (activePeriodMode.value === 'yearly' && depDate.startsWith(activeYear.value)) matches = true;

    if (!matches) return;

    const pmLabel = g.deposit_payment_method === 'transfer' ? 'เงินโอน' : 'เงินสด';
    const createdAtStr = g.created_at || (depDate + ' 00:00:00');
    list.push({
      id: g.id,
      created_at: createdAtStr,
      timestamp: new Date(createdAtStr.replace(' ', 'T')).getTime(),
      name: `รับเงินประกันพนักงาน: ${g.user_name || 'พนักงาน'} (${pmLabel})${g.note ? ' - ' + g.note : ''}`,
      income: g.amount || 0,
      expense: 0,
      type: 'guarantee_deposit'
    });
  });

  list.sort((a, b) => a.timestamp - b.timestamp);

  let running = 0;
  const computedList = list.map(item => {
    running += item.income - item.expense;
    return {
      ...item,
      runningBalance: running,
      formattedDate: formatDate(item.created_at),
      formattedTime: formatTime(item.created_at)
    };
  });

  ledgerTransactions.value = computedList.reverse();
};

const loadLedgerData = async () => {
  ledgerLoading.value = true;
  try {
    const params = { status: 'completed', branch_id: props.branchId || '' };
    const expenseParams = { branch_id: props.branchId || '' };
    const guaranteeParams = { branch_id: props.branchId || '' };

    if (activePeriodMode.value === 'daily') {
      params.date = activeDate.value;
      expenseParams.date = activeDate.value;
    } else if (activePeriodMode.value === 'monthly') {
      params.month = activeMonth.value;
      expenseParams.month = activeMonth.value;
    } else {
      params.year = activeYear.value;
      expenseParams.year = activeYear.value;
    }

    const [ordersRes, expensesRes, guaranteesRes] = await Promise.all([
      api.orders.getAll(params),
      api.expenses.get(expenseParams),
      api.employees.getGuarantees(guaranteeParams)
    ]);

    orders.value = (ordersRes && ordersRes.success) ? (ordersRes.data || []) : [];
    expenses.value = (expensesRes && expensesRes.success) ? (expensesRes.data || []) : [];
    guarantees.value = (guaranteesRes && guaranteesRes.success) ? (guaranteesRes.data || []) : [];
    computeLedgerTransactions();
  } catch (err) {
    console.error('Failed to load ledger data:', err);
  } finally {
    ledgerLoading.value = false;
  }
};

const handleAddExpense = async () => {
  if (!expenseForm.value.amount || expenseForm.value.amount <= 0) return;
  saving.value = true;
  try {
    const res = await api.expenses.create({
      amount: expenseForm.value.amount,
      category: expenseForm.value.category,
      note: expenseForm.value.note,
      expense_date: activeDate.value,
      payment_method: expenseForm.value.payment_method || 'transfer',
      branch_id: props.branchId
    });
    if (res.success) {
      ui.showToast('บันทึกค่าใช้จ่ายสำเร็จ', 'success');
      expenseForm.value = { amount: null, category: 'raw_chicken', note: '', payment_method: 'transfer' };
      if (res.data) {
        expenses.value.unshift(res.data);
        computeLedgerTransactions();
      } else {
        await loadLedgerData();
      }
    }
  } catch (err) {
    ui.showToast('บันทึกไม่สำเร็จ: ' + err.message, 'error');
  } finally {
    saving.value = false;
  }
};

const deletingExpenseId = ref(null);

const handleDeleteExpense = async (id) => {
  const ok = await ui.showConfirm('ลบรายจ่าย', 'ต้องการลบรายการค่าใช้จ่ายนี้ใช่หรือไม่?');
  if (!ok) return;
  deletingExpenseId.value = id;
  try {
    const res = await api.expenses.delete(id);
    if (res.success) {
      ui.showToast('ลบค่าใช้จ่ายสำเร็จ', 'success');
      expenses.value = expenses.value.filter(e => e.id !== id);
      computeLedgerTransactions();
    }
  } catch (err) {
    ui.showToast('ลบไม่สำเร็จ: ' + err.message, 'error');
  } finally {
    deletingExpenseId.value = null;
  }
};

const exportExpensesCSV = () => {
  if (!filteredLedgerTransactions.value || filteredLedgerTransactions.value.length === 0) return;
  let csvContent = '\uFEFFวัน-เวลา,ชื่อรายการ,รายรับ,รายจ่าย,คงเหลือ\n';
  filteredLedgerTransactions.value.forEach(t => {
    const time = `"${t.formattedDate} ${t.formattedTime}"`;
    const name = `"${(t.name || '').replace(/"/g, '""')}"`;
    const inc = t.income || 0;
    const exp = t.expense || 0;
    const bal = t.runningBalance || 0;
    csvContent += `${time},${name},${inc},${exp},${bal}\n`;
  });
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `ledger_${activeDate.value}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const getCategoryLabel = (cat) => {
  const map = {
    'raw_chicken': 'ไก่สด',
    'sticky_rice': 'ข้าวเหนียว',
    'meatballs': 'ลูกชิ้น',
    'salapao': 'ซาลาเปา',
    'fuel_oil': 'น้ำมัน',
    'gas_lpg': 'แก๊ส',
    'salary': 'เงินเดือน',
    'utility_bills': 'ค่าไฟ/น้ำ',
    'packaging': 'บรรจุภัณฑ์',
    'debt': 'หนี้',
    'other': 'อื่นๆ'
  };
  return map[cat] || cat;
};

const getExpenseCategoryIcon = (cat) => {
  const map = {
    'raw_chicken': 'fa-solid fa-drumstick-bite',
    'sticky_rice': 'fa-solid fa-bowl-rice',
    'meatballs': 'fa-solid fa-circle',
    'salapao': 'fa-solid fa-cookie',
    'fuel_oil': 'fa-solid fa-gas-pump',
    'gas_lpg': 'fa-solid fa-fire',
    'salary': 'fa-solid fa-hand-holding-dollar',
    'utility_bills': 'fa-solid fa-bolt',
    'packaging': 'fa-solid fa-box',
    'debt': 'fa-solid fa-file-invoice-dollar',
    'other': 'fa-solid fa-paperclip'
  };
  return map[cat] || 'fa-solid fa-wallet';
};

watch(() => [props.branchId, props.selectedDate, props.selectedMonth, props.selectedYear, props.periodMode], () => {
  loadLedgerData();
});

onMounted(() => {
  loadLedgerData();
});
</script>

<style scoped>
.expense-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-sm);
}
.expense-form-presets {
  grid-column: 1 / -1;
}
.expense-form-submit-group {
  grid-column: 1 / -1;
}
.preset-btn {
  font-size: var(--font-xs);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
}
.preset-btn.active {
  background: var(--primary);
  color: white;
}
.ledger-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}
.ledger-mobile-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
}
.ledger-mobile-card.income {
  border-left: 4px solid var(--success);
}
.ledger-mobile-card.expense {
  border-left: 4px solid var(--danger);
}
</style>
