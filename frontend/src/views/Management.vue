<template>
  <div id="management-page" class="page-enter">
    
    <!-- Top Header Card -->
    <div class="card p-md mb-md flex flex-between align-center flex-wrap gap-md" style="background: #ffffff;">
      <div class="flex align-center gap-md">
        <div class="header-icon-circle">
          <i class="fa-solid fa-briefcase text-primary" style="font-size: 1.3rem;"></i>
        </div>
        <div>
          <h2 class="font-bold text-lg text-primary" style="margin: 0;">
            บริหารจัดการร้าน
          </h2>
          <p class="text-xs text-secondary mt-xs" style="margin-bottom: 0;">
            ศูนย์รวมงานบริหารและบันทึกข้อมูลรายวัน: พนักงาน & ค่าแรง, รายจ่ายสาขา, รอบกะลิ้นชัก
          </p>
        </div>
      </div>
    </div>

    <!-- Date & Period Filter Card (Exact match with Reports.vue & Image 3) -->
    <div class="card mb-lg p-md" style="background: #ffffff;">
      <div class="flex flex-col gap-md">
        <!-- Period Mode Tabs -->
        <div class="flex gap-xs period-tabs" style="border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
          <button 
            type="button"
            class="btn btn-secondary btn-sm" 
            :class="{ 'active': periodMode === 'daily' }"
            @click="setPeriodMode('daily')"
          >
            <i class="fa-solid fa-calendar-day"></i> รายวัน
          </button>
          <button 
            type="button"
            class="btn btn-secondary btn-sm" 
            :class="{ 'active': periodMode === 'monthly' }"
            @click="setPeriodMode('monthly')"
          >
            <i class="fa-solid fa-calendar-days"></i> รายเดือน
          </button>
          <button 
            type="button"
            class="btn btn-secondary btn-sm" 
            :class="{ 'active': periodMode === 'yearly' }"
            @click="setPeriodMode('yearly')"
          >
            <i class="fa-solid fa-calendar"></i> รายปี
          </button>
        </div>

        <!-- Date Selector Input depending on Mode -->
        <div class="flex flex-wrap gap-md align-center" style="width: 100%;">
          <div class="flex gap-sm align-center">
            <div style="font-size: var(--font-sm); white-space:nowrap;" class="font-bold">
              {{ periodMode === 'daily' ? 'เลือกวัน:' : periodMode === 'monthly' ? 'เลือกเดือน:' : 'เลือกปี:' }}
            </div>
            
            <!-- Custom Select for Daily (Date Picker Calendar) -->
            <div v-if="periodMode === 'daily'" class="custom-select-wrapper" style="max-width: 200px; position: relative;" @click.stop>
              <div 
                class="custom-select-trigger reports-filter-control" 
                :class="{ 'active': isDateDropdownOpen }" 
                @click="toggleDateDropdown"
                style="height: 38px; padding: 6px 36px 6px var(--space-md); display: flex; align-items: center; justify-content: space-between; cursor: pointer;"
              >
                <span class="custom-select-text">{{ selectedDateLabel }}</span>
              </div>
              <div v-if="isDateDropdownOpen" class="custom-select-dropdown datepicker-popover" style="top: calc(100% + 2px); width: 280px !important; max-width: calc(100vw - 32px) !important; max-height: none !important; overflow: visible !important; padding: var(--space-sm); display: flex; flex-direction: column; gap: var(--space-xs); z-index: 1000;">
                <!-- Header: Month & Year Selector -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: var(--space-xs); border-bottom: 1px solid var(--border-color);">
                  <button class="btn btn-secondary btn-sm" @click.stop="adjustDatePickerMonth(-1)">
                    <i class="fa-solid fa-chevron-left"></i>
                  </button>
                  <span class="font-bold" style="font-size: var(--font-sm);">{{ datePickerMonthName }} {{ datePickerYear + 543 }}</span>
                  <button class="btn btn-secondary btn-sm" @click.stop="adjustDatePickerMonth(1)">
                    <i class="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
                <!-- Weekday Labels -->
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: var(--font-xs); font-weight: bold; color: var(--text-secondary); margin-top: 4px;">
                  <div v-for="day in ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']" :key="day">{{ day }}</div>
                </div>
                <!-- Days Grid -->
                <div class="calendar-days-grid">
                  <div v-for="empty in datePickerStartOffset" :key="'empty-'+empty"></div>
                  <button 
                    v-for="dNum in datePickerDaysCount" 
                    :key="dNum"
                    type="button"
                    class="calendar-day-btn"
                    :class="{ 'btn-primary selected': isDatePickerSelected(dNum) }"
                    @click="selectDatePickerDay(dNum)"
                  >
                    {{ dNum }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Custom Select for Monthly (Month Picker) -->
            <div v-if="periodMode === 'monthly'" class="custom-select-wrapper" style="max-width: 200px; position: relative;" @click.stop>
              <div 
                class="custom-select-trigger reports-filter-control" 
                :class="{ 'active': isMonthDropdownOpen }" 
                @click="toggleMonthDropdown"
                style="height: 38px; padding: 6px 36px 6px var(--space-md); display: flex; align-items: center; cursor: pointer;"
              >
                <span class="custom-select-text">{{ selectedMonthLabel }}</span>
              </div>
              <div v-if="isMonthDropdownOpen" class="custom-select-dropdown monthpicker-popover" style="top: calc(100% + 2px); width: 300px !important; max-width: calc(100vw - 32px) !important; max-height: none !important; overflow: visible !important; padding: var(--space-sm); display: flex; flex-direction: column; gap: var(--space-sm); z-index: 1000;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: var(--space-xs);">
                  <button class="btn btn-secondary btn-sm" @click.stop="adjustMonthPickerYear(-1)">
                    <i class="fa-solid fa-chevron-left"></i>
                  </button>
                  <span class="font-bold">ปี พ.ศ. {{ monthPickerYear + 543 }}</span>
                  <button class="btn btn-secondary btn-sm" @click.stop="adjustMonthPickerYear(1)">
                    <i class="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
                <div class="month-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
                  <button 
                    v-for="(mName, idx) in thaiMonthsShort" 
                    :key="idx" 
                    class="btn btn-secondary btn-sm"
                    :class="{ 'active': isMonthPickerSelected(idx + 1) }"
                    @click="selectMonthPicker(idx + 1)"
                  >
                    {{ mName }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Custom Select for Yearly -->
            <div v-if="periodMode === 'yearly'" class="custom-select-wrapper" style="max-width: 200px;" @click.stop>
              <div 
                class="custom-select-trigger reports-filter-control" 
                :class="{ 'active': isYearDropdownOpen }" 
                @click="toggleYearDropdown"
                style="height: 38px; padding: 6px 36px 6px var(--space-md); display: flex; align-items: center; cursor: pointer;"
              >
                <span class="custom-select-text">{{ selectedYearLabel }}</span>
              </div>
              <div v-if="isYearDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 2px);">
                <div 
                  v-for="y in availableYears" 
                  :key="y" 
                  class="custom-select-option" 
                  :class="{ 'selected': selectedYear === String(y) }" 
                  @click="selectYear(y)"
                >
                  ปี {{ y + 543 }}
                </div>
              </div>
            </div>
          </div>

          <!-- Branch Selector for Admin -->
          <div v-if="isAdminUser && branches.length > 0" class="flex gap-sm align-center">
            <div style="font-size: var(--font-sm); white-space:nowrap;" class="font-bold">สาขา:</div>
            <div class="custom-select-wrapper" style="min-width: 180px;" @click.stop>
              <div 
                class="custom-select-trigger reports-filter-control" 
                :class="{ 'active': isBranchDropdownOpen }" 
                @click="toggleBranchDropdown"
                style="height: 38px; padding: 6px 36px 6px var(--space-md); display: flex; align-items: center; cursor: pointer;"
              >
                <span class="custom-select-text">{{ selectedBranchName }}</span>
              </div>
              <div v-if="isBranchDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 2px);">
                <div 
                  v-for="b in branches" 
                  :key="b.id" 
                  class="custom-select-option" 
                  :class="{ 'selected': selectedBranchId === b.id }" 
                  @click="selectBranch(b.id)"
                >
                  {{ b.name }}
                </div>
              </div>
            </div>
          </div>

          <!-- Time Range Filter (ช่วงเวลา) -->
          <div v-if="periodMode === 'daily'" class="flex gap-sm align-center">
            <div style="font-size: var(--font-sm); white-space:nowrap;" class="font-bold">ช่วงเวลา:</div>
            <div class="flex align-center gap-xs">
              <input 
                type="text" 
                v-model="customStartTime" 
                placeholder="00.00" 
                class="form-input" 
                style="width: 75px; text-align: center; height: 38px; padding: 4px 8px; font-size: var(--font-sm);" 
              />
              <span class="text-secondary text-xs">ถึง</span>
              <input 
                type="text" 
                v-model="customEndTime" 
                placeholder="23.59" 
                class="form-input" 
                style="width: 75px; text-align: center; height: 38px; padding: 4px 8px; font-size: var(--font-sm);" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Navigation Tabs (Clean names without numbers) -->
    <div class="category-tabs mb-lg flex gap-xs" style="overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 6px; flex-wrap: nowrap;">
      <button 
        v-if="isAdminUser"
        class="btn btn-secondary" 
        :class="{ 'active': mainTab === 'staff' }"
        @click="mainTab = 'staff'"
        style="white-space: nowrap; flex-shrink: 0;"
      >
        <i class="fa-solid fa-users-gear"></i> จัดการพนักงาน & ค่าแรง
      </button>
      <button 
        class="btn btn-secondary" 
        :class="{ 'active': mainTab === 'expenses' }"
        @click="mainTab = 'expenses'"
        style="white-space: nowrap; flex-shrink: 0;"
      >
        <i class="fa-solid fa-wallet"></i> บันทึกรายจ่าย
      </button>
      <button 
        class="btn btn-secondary" 
        :class="{ 'active': mainTab === 'drawers' }"
        @click="mainTab = 'drawers'"
        style="white-space: nowrap; flex-shrink: 0;"
      >
        <i class="fa-solid fa-cash-register"></i> รอบกะ & ลิ้นชักเงิน
      </button>
    </div>

    <!-- Tab 1: Staff & Payroll Management Component (Admin Only) -->
    <StaffManagement 
      v-if="mainTab === 'staff' && isAdminUser" 
      :branch-id="selectedBranchId"
      :selected-date="selectedDate"
      :selected-month="selectedMonth"
      :selected-year="selectedYear"
      :period-mode="periodMode"
      @update:selected-date="val => { selectedDate = val; const [y, m] = val.split('-'); selectedMonth = `${y}-${m}`; selectedYear = y; }"
      @update:selected-month="val => { selectedMonth = val; const [y] = val.split('-'); selectedYear = y; }"
      @update:selected-year="val => selectedYear = val"
      @update:period-mode="val => periodMode = val"
    />

    <!-- Tab 2: Expense Management Component -->
    <ExpenseManagement 
      v-if="mainTab === 'expenses'" 
      :branch-id="selectedBranchId"
      :selected-date="selectedDate"
      :selected-month="selectedMonth"
      :selected-year="selectedYear"
      :period-mode="periodMode"
      :start-time="customStartTime"
      :end-time="customEndTime"
    />

    <!-- Tab 3: Cash Drawer Management Component -->
    <CashDrawerManagement 
      v-if="mainTab === 'drawers'" 
      :branch-id="selectedBranchId"
      :selected-date="selectedDate"
      :selected-month="selectedMonth"
      :selected-year="selectedYear"
      :period-mode="periodMode"
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import StaffManagement from '../components/StaffManagement.vue';
import ExpenseManagement from '../components/ExpenseManagement.vue';
import CashDrawerManagement from '../components/CashDrawerManagement.vue';
import api from '../api';
import { getUser, getToday, formatDate } from '../helpers';

const route = useRoute();
const currentUser = computed(() => getUser());
const isAdminUser = computed(() => currentUser.value?.role === 'admin');

const mainTab = ref(getUser()?.role === 'admin' ? 'staff' : 'expenses');
const branches = ref([]);
const selectedBranchId = ref(currentUser.value?.branch_id || 1);

// Date & Period Filter State
const periodMode = ref('daily');
const selectedDate = ref(getToday());
const selectedMonth = ref(getToday().substring(0, 7));
const selectedYear = ref(getToday().substring(0, 4));
const customStartTime = ref('00.00');
const customEndTime = ref('23.59');

// Dropdown states
const isDateDropdownOpen = ref(false);
const isMonthDropdownOpen = ref(false);
const isYearDropdownOpen = ref(false);
const isBranchDropdownOpen = ref(false);

const monthPickerYear = ref(new Date().getFullYear());
const datePickerYear = ref(new Date().getFullYear());
const datePickerMonth = ref(new Date().getMonth() + 1);

const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

const availableYears = computed(() => {
  const curY = new Date().getFullYear();
  return [curY, curY - 1, curY - 2];
});

const selectedDateLabel = computed(() => {
  if (!selectedDate.value) return 'เลือกวัน';
  return formatDate(selectedDate.value);
});

const selectedMonthLabel = computed(() => {
  if (!selectedMonth.value) return 'เลือกเดือน';
  const [year, month] = selectedMonth.value.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' });
});

const selectedYearLabel = computed(() => {
  return `ปี ${Number(selectedYear.value) + 543}`;
});

const selectedBranchName = computed(() => {
  const b = branches.value.find(item => item.id === selectedBranchId.value);
  return b ? b.name : 'สาขาหลัก';
});

const setPeriodMode = (mode) => {
  periodMode.value = mode;
  if (!selectedDate.value) selectedDate.value = getToday();
  if (!selectedMonth.value) selectedMonth.value = getToday().substring(0, 7);
  if (!selectedYear.value) selectedYear.value = getToday().substring(0, 4);
};

const toggleDateDropdown = () => {
  const cur = isDateDropdownOpen.value;
  closeAllDropdowns();
  isDateDropdownOpen.value = !cur;
  if (isDateDropdownOpen.value) {
    if (selectedDate.value) {
      const [y, m] = selectedDate.value.split('-');
      datePickerYear.value = Number(y);
      datePickerMonth.value = Number(m);
    } else {
      const today = new Date();
      datePickerYear.value = today.getFullYear();
      datePickerMonth.value = today.getMonth() + 1;
    }
  }
};

const datePickerMonthName = computed(() => {
  return thaiMonths[datePickerMonth.value - 1] || '';
});

const datePickerDaysCount = computed(() => {
  return new Date(datePickerYear.value, datePickerMonth.value, 0).getDate();
});

const datePickerStartOffset = computed(() => {
  return new Date(datePickerYear.value, datePickerMonth.value - 1, 1).getDay();
});

const isDatePickerSelected = (day) => {
  if (!selectedDate.value) return false;
  const [y, m, d] = selectedDate.value.split('-');
  return datePickerYear.value === Number(y) &&
         datePickerMonth.value === Number(m) &&
         day === Number(d);
};

const selectDatePickerDay = (day) => {
  selectedDate.value = `${datePickerYear.value}-${String(datePickerMonth.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  selectedMonth.value = `${datePickerYear.value}-${String(datePickerMonth.value).padStart(2, '0')}`;
  selectedYear.value = String(datePickerYear.value);
  isDateDropdownOpen.value = false;
};

const adjustDatePickerMonth = (amount) => {
  let m = datePickerMonth.value + amount;
  let y = datePickerYear.value;
  if (m < 1) {
    m = 12;
    y -= 1;
  } else if (m > 12) {
    m = 1;
    y += 1;
  }
  datePickerMonth.value = m;
  datePickerYear.value = y;
};

const toggleMonthDropdown = () => {
  const cur = isMonthDropdownOpen.value;
  closeAllDropdowns();
  isMonthDropdownOpen.value = !cur;
  if (isMonthDropdownOpen.value) {
    if (selectedMonth.value) {
      monthPickerYear.value = Number(selectedMonth.value.split('-')[0]);
    } else {
      monthPickerYear.value = new Date().getFullYear();
    }
  }
};

const isMonthPickerSelected = (m) => {
  if (!selectedMonth.value) return false;
  const [y, mm] = selectedMonth.value.split('-');
  return monthPickerYear.value === Number(y) && m === Number(mm);
};

const selectMonthPicker = (m) => {
  selectedMonth.value = `${monthPickerYear.value}-${String(m).padStart(2, '0')}`;
  selectedYear.value = String(monthPickerYear.value);
  isMonthDropdownOpen.value = false;
};

const adjustMonthPickerYear = (amount) => {
  monthPickerYear.value += amount;
};

const toggleYearDropdown = () => {
  const cur = isYearDropdownOpen.value;
  closeAllDropdowns();
  isYearDropdownOpen.value = !cur;
};

const selectYear = (y) => {
  selectedYear.value = String(y);
  isYearDropdownOpen.value = false;
};

const toggleBranchDropdown = () => {
  const cur = isBranchDropdownOpen.value;
  closeAllDropdowns();
  isBranchDropdownOpen.value = !cur;
};

const selectBranch = (bId) => {
  selectedBranchId.value = bId;
  isBranchDropdownOpen.value = false;
};

const closeAllDropdowns = () => {
  isDateDropdownOpen.value = false;
  isMonthDropdownOpen.value = false;
  isYearDropdownOpen.value = false;
  isBranchDropdownOpen.value = false;
};

const fetchBranches = async () => {
  try {
    const res = await api.auth.getBranches();
    if (res.success) {
      branches.value = res.data || [];
      if (!selectedBranchId.value && branches.value.length > 0) {
        selectedBranchId.value = branches.value[0].id;
      }
    }
  } catch (err) {
    console.error('Error fetching branches:', err);
  }
};

onMounted(async () => {
  await fetchBranches();
  if (route.query.tab && ['staff', 'expenses', 'drawers'].includes(route.query.tab)) {
    if (route.query.tab === 'staff' && !isAdminUser.value) {
      mainTab.value = 'expenses';
    } else {
      mainTab.value = route.query.tab;
    }
  } else if (!isAdminUser.value && mainTab.value === 'staff') {
    mainTab.value = 'expenses';
  }
  window.addEventListener('click', closeAllDropdowns);
});

onUnmounted(() => {
  window.removeEventListener('click', closeAllDropdowns);
});
</script>

<style scoped>
.header-icon-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(139, 3, 19, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.category-tabs .btn {
  font-size: var(--font-sm);
  padding: 10px 18px;
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}
.category-tabs .btn.active {
  background: var(--primary);
  color: white;
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(139, 3, 19, 0.25);
}
</style>
