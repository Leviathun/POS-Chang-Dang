<template>
  <div class="flex align-center gap-xs" :style="fullWidth ? 'width: 100%;' : 'width: auto;'">
    <button
      v-if="showNavArrows && mode === 'month'"
      type="button"
      class="picker-nav-btn flex-shrink-0"
      title="เดือนก่อนหน้า"
      @click="stepMonth(-1)"
    >
      <i class="fa-solid fa-chevron-left"></i>
    </button>

    <div
      class="custom-select-wrapper"
      :style="fullWidth ? 'flex: 1; min-width: 0; width: 100%; position: relative;' : 'width: auto; position: relative;'"
      @click.stop
    >
      <div
        class="picker-trigger-btn"
        :class="{ active: isOpen, 'w-full': fullWidth }"
        :style="fullWidth
          ? 'width: 100%; height: 40px; padding: 0 var(--space-md); justify-content: space-between; gap: 6px; font-size: var(--font-sm); white-space: nowrap;'
          : 'min-width: 170px; height: 38px; padding: 0 var(--space-md); justify-content: space-between; gap: var(--space-xs); font-size: var(--font-sm);'"
        @click="toggleOpen"
      >
        <span class="flex align-center gap-xs" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <i :class="mode === 'month' ? 'fa-solid fa-calendar-days text-primary flex-shrink-0' : 'fa-solid fa-calendar-day text-primary flex-shrink-0'"></i>
          <span style="overflow: hidden; text-overflow: ellipsis; font-weight: bold;">{{ displayLabel }}</span>
        </span>
        <i class="fa-solid fa-chevron-down text-xs text-secondary ml-xs flex-shrink-0"></i>
      </div>

      <!-- Date Picker Popover -->
      <div
        v-if="isOpen && mode === 'date'"
        class="custom-select-dropdown datepicker-popover"
        :style="fullWidthPopover
          ? 'top: calc(100% + 4px); width: 100% !important; max-height: none !important; overflow-y: visible !important; padding: var(--space-sm); display: flex; flex-direction: column; gap: var(--space-xs); z-index: 1000;'
          : 'top: calc(100% + 4px); width: 280px !important; max-width: calc(100vw - 32px) !important; max-height: none !important; overflow: visible !important; padding: var(--space-sm); display: flex; flex-direction: column; gap: var(--space-xs); z-index: 1000;'"
      >
        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: var(--space-xs); border-bottom: 1px solid var(--border-color);">
          <button type="button" class="picker-nav-btn" style="height: 32px !important; width: 32px !important; min-width: 32px !important;" @click.stop="adjustViewMonth(-1)">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <span class="font-bold" style="font-size: var(--font-sm);">{{ viewMonthName }} {{ viewYear + 543 }}</span>
          <button type="button" class="picker-nav-btn" style="height: 32px !important; width: 32px !important; min-width: 32px !important;" @click.stop="adjustViewMonth(1)">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: var(--font-xs); font-weight: bold; color: var(--text-secondary); margin-top: 4px;">
          <div v-for="day in ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']" :key="day">{{ day }}</div>
        </div>
        <div class="calendar-days-grid">
          <div v-for="empty in daysStartOffset" :key="'empty-' + empty"></div>
          <button
            v-for="dNum in daysInViewMonth"
            :key="dNum"
            type="button"
            class="calendar-day-btn"
            :class="{ 'btn-primary selected': isDaySelected(dNum) }"
            @click="selectDay(dNum)"
          >
            {{ dNum }}
          </button>
        </div>
      </div>

      <!-- Month Picker Popover -->
      <div
        v-if="isOpen && mode === 'month'"
        class="custom-select-dropdown monthpicker-popover dropdown-center-desktop"
        style="top: calc(100% + 4px); width: 280px !important; max-width: calc(100vw - 32px) !important; max-height: none !important; overflow: visible !important; padding: var(--space-sm); display: flex; flex-direction: column; gap: var(--space-sm); z-index: 1000;"
      >
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: var(--space-xs);">
          <button type="button" class="picker-nav-btn" style="height: 32px !important; width: 32px !important; min-width: 32px !important;" @click.stop="viewYear -= 1">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <span class="font-bold">ปี พ.ศ. {{ viewYear + 543 }}</span>
          <button type="button" class="picker-nav-btn" style="height: 32px !important; width: 32px !important; min-width: 32px !important;" @click.stop="viewYear += 1">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
        <div class="month-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
          <button
            v-for="(mName, idx) in thaiMonthsShort"
            :key="idx"
            type="button"
            class="btn btn-secondary btn-sm"
            :class="{ 'btn-primary active': isMonthSelected(idx + 1) }"
            @click="selectMonth(idx + 1)"
          >
            {{ mName }}
          </button>
        </div>
      </div>
    </div>

    <button
      v-if="showNavArrows && mode === 'month'"
      type="button"
      class="picker-nav-btn flex-shrink-0"
      title="เดือนถัดไป"
      @click="stepMonth(1)"
    >
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { formatDate } from '../helpers';

const props = defineProps({
  modelValue: { type: String, default: '' },
  mode: { type: String, default: 'date' }, // 'date' | 'month'
  showNavArrows: { type: Boolean, default: false },
  fullWidth: { type: Boolean, default: true },
  fullWidthPopover: { type: Boolean, default: false }
});

const emit = defineEmits(['update:modelValue', 'change']);

const thaiMonthsNames = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const thaiMonthsShort = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const isOpen = ref(false);
const viewYear = ref(new Date().getFullYear());
const viewMonth = ref(new Date().getMonth() + 1);

const displayLabel = computed(() => {
  if (!props.modelValue) return props.mode === 'month' ? 'เลือกเดือน' : 'เลือกวัน';
  if (props.mode === 'month') {
    const [y, m] = props.modelValue.split('-');
    const monthIdx = parseInt(m, 10) - 1;
    const beYear = parseInt(y, 10) + 543;
    return `${thaiMonthsNames[monthIdx] || ''} ${beYear}`;
  }
  return formatDate(props.modelValue);
});

const viewMonthName = computed(() => thaiMonthsNames[viewMonth.value - 1] || '');
const daysInViewMonth = computed(() => new Date(viewYear.value, viewMonth.value, 0).getDate());
const daysStartOffset = computed(() => new Date(viewYear.value, viewMonth.value - 1, 1).getDay());

const toggleOpen = () => {
  const next = !isOpen.value;
  window.dispatchEvent(new CustomEvent('close-thai-pickers'));
  isOpen.value = next;
  if (next && props.modelValue) {
    const parts = props.modelValue.split('-').map(Number);
    if (parts[0]) viewYear.value = parts[0];
    if (parts[1]) viewMonth.value = parts[1];
  }
};

const adjustViewMonth = (delta) => {
  let m = viewMonth.value + delta;
  let y = viewYear.value;
  if (m < 1) { m = 12; y -= 1; }
  else if (m > 12) { m = 1; y += 1; }
  viewMonth.value = m;
  viewYear.value = y;
};

const isDaySelected = (day) => {
  if (!props.modelValue) return false;
  const [y, m, d] = props.modelValue.split('-').map(Number);
  return viewYear.value === y && viewMonth.value === m && day === d;
};

const selectDay = (day) => {
  const val = `${viewYear.value}-${String(viewMonth.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  isOpen.value = false;
  emit('update:modelValue', val);
  emit('change', val);
};

const isMonthSelected = (m) => {
  if (!props.modelValue) return false;
  const [y, mm] = props.modelValue.split('-').map(Number);
  return viewYear.value === y && m === mm;
};

const selectMonth = (m) => {
  const val = `${viewYear.value}-${String(m).padStart(2, '0')}`;
  isOpen.value = false;
  emit('update:modelValue', val);
  emit('change', val);
};

const stepMonth = (diff) => {
  if (!props.modelValue) return;
  const [y, m] = props.modelValue.split('-').map(Number);
  const d = new Date(y, m - 1 + diff, 1);
  const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  emit('update:modelValue', val);
  emit('change', val);
};

const closeDropdown = () => {
  isOpen.value = false;
};

onMounted(() => {
  window.addEventListener('click', closeDropdown);
  window.addEventListener('close-thai-pickers', closeDropdown);
});

onUnmounted(() => {
  window.removeEventListener('click', closeDropdown);
  window.removeEventListener('close-thai-pickers', closeDropdown);
});
</script>
