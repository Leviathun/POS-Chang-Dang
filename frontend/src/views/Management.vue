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

    <!-- Date & Period Filter Card (Shared Global DatePeriodFilter) -->
    <DatePeriodFilter
      v-model:period-mode="periodMode"
      v-model:selected-date="selectedDate"
      v-model:selected-month="selectedMonth"
      v-model:selected-year="selectedYear"
      v-model:start-time="customStartTime"
      v-model:end-time="customEndTime"
    >
      <!-- Branch Selector for Admin (aligned right) -->
      <div v-if="isAdminUser && branches.length > 0" class="flex gap-sm align-center" style="margin-left: auto;">
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
          <div v-if="isBranchDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 8px);">
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
    </DatePeriodFilter>

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
import DatePeriodFilter from '../components/DatePeriodFilter.vue';
import StaffManagement from '../components/StaffManagement.vue';
import ExpenseManagement from '../components/ExpenseManagement.vue';
import CashDrawerManagement from '../components/CashDrawerManagement.vue';
import api from '../api';
import { getUser, getToday } from '../helpers';

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

const isBranchDropdownOpen = ref(false);

const selectedBranchName = computed(() => {
  const b = branches.value.find(item => item.id === selectedBranchId.value);
  return b ? b.name : 'สาขาหลัก';
});

const toggleBranchDropdown = () => {
  isBranchDropdownOpen.value = !isBranchDropdownOpen.value;
};

const selectBranch = (bId) => {
  selectedBranchId.value = bId;
  isBranchDropdownOpen.value = false;
};

const closeAllDropdowns = () => {
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
