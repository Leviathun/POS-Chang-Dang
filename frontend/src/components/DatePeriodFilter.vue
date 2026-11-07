<template>
  <div class="card mb-lg p-md" style="background: #ffffff;">
    <div class="flex flex-col gap-md">
      <!-- Period Mode Tabs -->
      <div
        class="flex gap-xs period-tabs flex-wrap"
        style="border-bottom: 1px solid var(--border-color); padding-bottom: 8px;"
      >
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          :class="{ active: periodMode === 'daily' }"
          @click="selectMode('daily')"
        >
          <i class="fa-solid fa-calendar-day"></i> รายวัน
        </button>
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          :class="{ active: periodMode === 'monthly' }"
          @click="selectMode('monthly')"
        >
          <i class="fa-solid fa-calendar-days"></i> รายเดือน
        </button>
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          :class="{ active: periodMode === 'yearly' }"
          @click="selectMode('yearly')"
        >
          <i class="fa-solid fa-calendar"></i> รายปี
        </button>
      </div>

      <!-- Date/Month/Year Picker + Page-Specific Extra Filters Slot -->
      <div class="flex flex-wrap gap-md align-center" style="width: 100%;">
        <div class="flex gap-sm align-center" style="flex-wrap: nowrap;">
          <div style="font-size: var(--font-sm); white-space: nowrap;" class="font-bold">
            {{ periodMode === 'daily' ? 'เลือกวัน:' : periodMode === 'monthly' ? 'เลือกเดือน:' : 'เลือกปี:' }}
          </div>

          <!-- Daily Calendar Picker -->
          <div v-if="periodMode === 'daily'" class="custom-select-wrapper" style="width: auto; min-width: 190px; max-width: 220px; position: relative;" @click.stop>
            <div
              class="custom-select-trigger reports-filter-control"
              :class="{ active: isDateDropdownOpen }"
              @click="toggleDateDropdown"
              style="height: 38px; padding: 6px 36px 6px var(--space-md); display: flex; align-items: center; justify-content: space-between; cursor: pointer;"
            >
              <span class="custom-select-text font-bold">{{ selectedDateLabel }}</span>
            </div>
            <div
              v-if="isDateDropdownOpen"
              class="custom-select-dropdown datepicker-popover"
              style="top: calc(100% + 8px); width: 280px !important; max-width: calc(100vw - 32px) !important; max-height: none !important; overflow: visible !important; padding: var(--space-sm); display: flex; flex-direction: column; gap: var(--space-xs); z-index: 1000;"
            >
              <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: var(--space-xs); border-bottom: 1px solid var(--border-color);">
                <button type="button" class="btn btn-secondary btn-sm" @click.stop="adjustDatePickerMonth(-1)">
                  <i class="fa-solid fa-chevron-left"></i>
                </button>
                <span class="font-bold" style="font-size: var(--font-sm);">{{ datePickerMonthName }} {{ datePickerYear + 543 }}</span>
                <button type="button" class="btn btn-secondary btn-sm" @click.stop="adjustDatePickerMonth(1)">
                  <i class="fa-solid fa-chevron-right"></i>
                </button>
              </div>
              <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: var(--font-xs); font-weight: bold; color: var(--text-secondary); margin-top: 4px;">
                <div v-for="day in ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']" :key="day">{{ day }}</div>
              </div>
              <div class="calendar-days-grid">
                <div v-for="empty in datePickerStartOffset" :key="'empty-' + empty"></div>
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

          <!-- Monthly Picker -->
          <div v-if="periodMode === 'monthly'" class="custom-select-wrapper" style="width: auto; min-width: 190px; max-width: 220px; position: relative;" @click.stop>
            <div
              class="custom-select-trigger reports-filter-control"
              :class="{ active: isMonthDropdownOpen }"
              @click="toggleMonthDropdown"
              style="height: 38px; padding: 6px 36px 6px var(--space-md); display: flex; align-items: center; cursor: pointer;"
            >
              <span class="custom-select-text font-bold">{{ selectedMonthLabel }}</span>
            </div>
            <div
              v-if="isMonthDropdownOpen"
              class="custom-select-dropdown monthpicker-popover"
              style="top: calc(100% + 8px); width: 300px !important; max-width: calc(100vw - 32px) !important; max-height: none !important; overflow: visible !important; padding: var(--space-sm); display: flex; flex-direction: column; gap: var(--space-sm); z-index: 1000;"
            >
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: var(--space-xs);">
                <button type="button" class="btn btn-secondary btn-sm" @click.stop="adjustMonthPickerYear(-1)">
                  <i class="fa-solid fa-chevron-left"></i>
                </button>
                <span class="font-bold">ปี พ.ศ. {{ monthPickerYear + 543 }}</span>
                <button type="button" class="btn btn-secondary btn-sm" @click.stop="adjustMonthPickerYear(1)">
                  <i class="fa-solid fa-chevron-right"></i>
                </button>
              </div>
              <div class="month-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
                <button
                  v-for="(mName, idx) in thaiMonthsShort"
                  :key="idx"
                  type="button"
                  class="btn btn-secondary btn-sm"
                  :class="{ active: isMonthPickerSelected(idx + 1) }"
                  @click="selectMonthPicker(idx + 1)"
                >
                  {{ mName }}
                </button>
              </div>
            </div>
          </div>

          <!-- Yearly Picker -->
          <div v-if="periodMode === 'yearly'" class="custom-select-wrapper" style="width: auto; min-width: 150px; max-width: 200px; position: relative;" @click.stop>
            <div
              class="custom-select-trigger reports-filter-control"
              :class="{ active: isYearDropdownOpen }"
              @click="toggleYearDropdown"
              style="height: 38px; padding: 6px 36px 6px var(--space-md); display: flex; align-items: center; cursor: pointer;"
            >
              <span class="custom-select-text font-bold">{{ selectedYearLabel }}</span>
            </div>
            <div v-if="isYearDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 8px);">
              <div
                v-for="y in availableYears"
                :key="y"
                class="custom-select-option"
                :class="{ selected: String(selectedYear) === String(y) }"
                @click="selectYear(y)"
              >
                ปี {{ y + 543 }}
              </div>
            </div>
          </div>
        </div>

        <!-- Daily Time Range Filter (ชิดติดกับเลือกวัน ในบรรทัดเดียวกัน) -->
        <div v-if="periodMode === 'daily' && showTimeFilter" class="flex gap-sm align-center" style="flex-wrap: nowrap;">
          <div style="font-size: var(--font-sm); white-space: nowrap;" class="font-bold">ช่วงเวลา:</div>
          <div class="flex align-center gap-xs" style="flex-wrap: nowrap;">
            <input
              type="text"
              :value="startTime"
              @input="emit('update:startTime', $event.target.value)"
              placeholder="00.00"
              class="form-input reports-filter-control"
              style="width: 80px; height: 38px; text-align: center; padding: 6px; font-size: var(--font-sm);"
            />
            <span style="font-size: var(--font-sm); color: var(--text-secondary);">ถึง</span>
            <input
              type="text"
              :value="endTime"
              @input="emit('update:endTime', $event.target.value)"
              placeholder="23.59"
              class="form-input reports-filter-control"
              style="width: 80px; height: 38px; text-align: center; padding: 6px; font-size: var(--font-sm);"
            />
          </div>
        </div>

        <!-- Slot for page-specific filters (Branch on the right, Requester, etc.) -->
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { getToday, formatDate } from '../helpers';

const props = defineProps({
  periodMode: { type: String, default: 'daily' },
  selectedDate: { type: String, default: () => getToday() },
  selectedMonth: { type: String, default: () => getToday().substring(0, 7) },
  selectedYear: { type: String, default: () => getToday().substring(0, 4) },
  startTime: { type: String, default: '00.00' },
  endTime: { type: String, default: '23.59' },
  showTimeFilter: { type: Boolean, default: true }
});

const emit = defineEmits([
  'update:periodMode',
  'update:selectedDate',
  'update:selectedMonth',
  'update:selectedYear',
  'update:startTime',
  'update:endTime',
  'change'
]);

const isDateDropdownOpen = ref(false);
const isMonthDropdownOpen = ref(false);
const isYearDropdownOpen = ref(false);

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
  if (!props.selectedDate) return 'เลือกวัน';
  return formatDate(props.selectedDate);
});

const selectedMonthLabel = computed(() => {
  if (!props.selectedMonth) return 'เลือกเดือน';
  const [year, month] = props.selectedMonth.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' });
});

const selectedYearLabel = computed(() => `ปี ${Number(props.selectedYear) + 543}`);

const datePickerMonthName = computed(() => thaiMonths[datePickerMonth.value - 1] || '');
const datePickerDaysCount = computed(() => new Date(datePickerYear.value, datePickerMonth.value, 0).getDate());
const datePickerStartOffset = computed(() => new Date(datePickerYear.value, datePickerMonth.value - 1, 1).getDay());

const closeDropdowns = () => {
  isDateDropdownOpen.value = false;
  isMonthDropdownOpen.value = false;
  isYearDropdownOpen.value = false;
};

const selectMode = (mode) => {
  closeDropdowns();
  emit('update:periodMode', mode);
  if (!props.selectedDate) emit('update:selectedDate', getToday());
  if (!props.selectedMonth) emit('update:selectedMonth', getToday().substring(0, 7));
  if (!props.selectedYear) emit('update:selectedYear', getToday().substring(0, 4));
  emit('change', { periodMode: mode });
};

const toggleDateDropdown = () => {
  const cur = isDateDropdownOpen.value;
  closeDropdowns();
  isDateDropdownOpen.value = !cur;
  if (isDateDropdownOpen.value) {
    if (props.selectedDate) {
      const [y, m] = props.selectedDate.split('-');
      datePickerYear.value = Number(y);
      datePickerMonth.value = Number(m);
    } else {
      const today = new Date();
      datePickerYear.value = today.getFullYear();
      datePickerMonth.value = today.getMonth() + 1;
    }
  }
};

const isDatePickerSelected = (day) => {
  if (!props.selectedDate) return false;
  const [y, m, d] = props.selectedDate.split('-');
  return datePickerYear.value === Number(y) && datePickerMonth.value === Number(m) && day === Number(d);
};

const selectDatePickerDay = (day) => {
  const nextDate = `${datePickerYear.value}-${String(datePickerMonth.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const nextMonth = `${datePickerYear.value}-${String(datePickerMonth.value).padStart(2, '0')}`;
  const nextYear = String(datePickerYear.value);
  emit('update:selectedDate', nextDate);
  emit('update:selectedMonth', nextMonth);
  emit('update:selectedYear', nextYear);
  isDateDropdownOpen.value = false;
  emit('change', { selectedDate: nextDate, selectedMonth: nextMonth, selectedYear: nextYear });
};

const adjustDatePickerMonth = (amount) => {
  let m = datePickerMonth.value + amount;
  let y = datePickerYear.value;
  if (m < 1) { m = 12; y -= 1; }
  else if (m > 12) { m = 1; y += 1; }
  datePickerMonth.value = m;
  datePickerYear.value = y;
};

const toggleMonthDropdown = () => {
  const cur = isMonthDropdownOpen.value;
  closeDropdowns();
  isMonthDropdownOpen.value = !cur;
  if (isMonthDropdownOpen.value) {
    monthPickerYear.value = props.selectedMonth ? Number(props.selectedMonth.split('-')[0]) : new Date().getFullYear();
  }
};

const isMonthPickerSelected = (m) => {
  if (!props.selectedMonth) return false;
  const [y, mm] = props.selectedMonth.split('-');
  return monthPickerYear.value === Number(y) && m === Number(mm);
};

const selectMonthPicker = (m) => {
  const nextMonth = `${monthPickerYear.value}-${String(m).padStart(2, '0')}`;
  const nextYear = String(monthPickerYear.value);
  emit('update:selectedMonth', nextMonth);
  emit('update:selectedYear', nextYear);
  isMonthDropdownOpen.value = false;
  emit('change', { selectedMonth: nextMonth, selectedYear: nextYear });
};

const adjustMonthPickerYear = (amount) => {
  monthPickerYear.value += amount;
};

const toggleYearDropdown = () => {
  const cur = isYearDropdownOpen.value;
  closeDropdowns();
  isYearDropdownOpen.value = !cur;
};

const selectYear = (y) => {
  const nextYear = String(y);
  emit('update:selectedYear', nextYear);
  isYearDropdownOpen.value = false;
  emit('change', { selectedYear: nextYear });
};

onMounted(() => window.addEventListener('click', closeDropdowns));
onUnmounted(() => window.removeEventListener('click', closeDropdowns));
</script>

<style scoped>
.reports-filter-control {
  background-color: var(--card-bg) !important;
  border: 1px solid var(--border-color) !important;
  border-radius: var(--radius-md) !important;
  color: var(--text-primary) !important;
  font-family: var(--font-family) !important;
  font-size: var(--font-sm) !important;
  height: 38px !important;
  line-height: 24px !important;
  transition: all var(--transition-base) !important;
}

.reports-filter-control:hover {
  border-color: var(--border-color-focus) !important;
  background-color: var(--card-bg-hover) !important;
}

.reports-filter-control:focus {
  border-color: var(--primary) !important;
  background-color: var(--card-bg-active) !important;
  box-shadow: 0 0 0 3px var(--primary-glow) !important;
  outline: none !important;
}
</style>
