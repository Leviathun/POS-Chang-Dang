<template>
  <div id="management-page" class="page-enter">
    
    <!-- Top Header Card -->
    <div class="card mb-md page-header-card">
      <div class="page-header-left">
        <div class="header-icon-circle">
          <i class="fa-solid fa-briefcase"></i>
        </div>
        <div class="page-header-text">
          <h2 class="page-header-title">บริหารจัดการร้าน</h2>
          <p class="page-header-subtitle">
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
      v-model:branch-id="selectedBranchId"
      :branches="isAdminUser ? branches : []"
      :show-all-branches="false"
    />

    <!-- Main Navigation Tabs (Clean names without numbers) -->
    <div class="category-tabs">
      <button 
        v-if="isAdminUser"
        class="category-tab" 
        :class="{ 'active': mainTab === 'staff' }"
        @click="mainTab = 'staff'"
      >
        <i class="fa-solid fa-users-gear"></i> จัดการพนักงาน & ค่าแรง
      </button>
      <button 
        class="category-tab" 
        :class="{ 'active': mainTab === 'expenses' }"
        @click="mainTab = 'expenses'"
      >
        <i class="fa-solid fa-wallet"></i> บันทึกรายจ่าย
      </button>
      <button 
        class="category-tab" 
        :class="{ 'active': mainTab === 'drawers' }"
        @click="mainTab = 'drawers'"
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
});
</script>
