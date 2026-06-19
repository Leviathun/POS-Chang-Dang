<template>
  <div id="stock-bulk-page" class="page-enter">
    
    <!-- Top Action Card / Page Header -->
    <div class="card mb-lg bulk-header-grid">
      <div class="header-left">
        <router-link to="/stock" class="btn btn-secondary btn-bulk-back">
          <i class="fa-solid fa-arrow-left" style="margin-right: 4px;"></i> ย้อนกลับ
        </router-link>
      </div>
      <div class="header-center">
        <h2 class="stock-page-title"><i class="fa-solid fa-boxes-stacked" style="margin-right: 6px;"></i> จัดการสต็อกด่วน</h2>
      </div>
      <div class="header-right">
        <button 
          class="btn btn-primary btn-bulk-save" 
          @click="handleSaveBulkAdjust"
        >
          <i class="fa-solid fa-floppy-disk" style="margin-right: 4px;"></i> บันทึกสต็อกด่วน
        </button>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="card p-lg overflow-hidden bulk-main-card">
      <!-- Outer Category Tabs: Menu Items vs Modifiers -->
      <div class="category-tabs mb-lg">
        <button 
          class="category-tab" 
          :class="{ 'active': activeStockType === 'menu_items' }"
          @click="activeStockType = 'menu_items'"
        >
          <i class="fa-solid fa-drumstick-bite" style="margin-right: 4px;"></i> สินค้าและเมนู
        </button>
        <button 
          class="category-tab" 
          :class="{ 'active': activeStockType === 'modifiers' }"
          @click="activeStockType = 'modifiers'"
        >
          <i class="fa-solid fa-bottle-droplet" style="margin-right: 4px;"></i> ซอสและเครื่องปรุง
        </button>
      </div>

      <!-- Action Mode Tabs -->
      <div class="bulk-tabs">
        <button 
          class="bulk-tab" 
          :class="{ 'active': bulkTab === 'relative' }" 
          @click="setBulkTab('relative')"
        >
          <i class="fa-solid fa-square-plus" style="margin-right: 4px;"></i> เพิ่มสต็อก
        </button>
        <button 
          class="bulk-tab" 
          :class="{ 'active': bulkTab === 'absolute' }" 
          @click="setBulkTab('absolute')"
        >
          <i class="fa-solid fa-wrench" style="margin-right: 4px;"></i> ปรับปรุงยอด
        </button>
      </div>

      <!-- Description Hint Box -->
      <div class="bulk-hint-box mb-lg">
        <span class="hint-icon"><i class="fa-solid fa-lightbulb"></i></span>
        <div class="hint-text">
          <template v-if="activeStockType === 'menu_items'">
            <span v-if="bulkTab === 'relative'">
              <strong>โหมดเพิ่มสต็อก (สินค้า):</strong> พิมพ์จำนวนสินค้าที่ต้องการเพิ่ม (เช่น <code>30</code>) หรือจำนวนที่ต้องการหักออก (เช่น <code>-5</code>) ปล่อยว่างไว้หากไม่มีการเปลี่ยนแปลง
            </span>
            <span v-else>
              <strong>โหมดปรับปรุงยอด (สินค้า):</strong> พิมพ์จำนวนสต็อกคงเหลือจริงล่าสุด ระบบจะทำการตั้งค่าสต็อกจริงให้ตรงตามที่ระบุโดยอัตโนมัติ
            </span>
          </template>
          <template v-else>
            <span v-if="bulkTab === 'relative'">
              <strong>โหมดเพิ่มสต็อก (เครื่องปรุง):</strong> พิมพ์จำนวนถุง/ซองที่นำเข้าเพิ่ม (เช่น <code>2</code> ถุง หรือ <code>10</code> ซอง) หรือที่หักออก (เช่น <code>-1</code>) ระบบจะคำนวณรอบเสิร์ฟตามขนาดบรรจุให้โดยอัตโนมัติ
            </span>
            <span v-else>
              <strong>โหมดปรับปรุงยอด (เครื่องปรุง):</strong> พิมพ์จำนวน **รอบเสิร์ฟ** จริงคงเหลือทั้งหมดล่าสุดในระบบ
            </span>
          </template>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-3xl">
        <div class="spinner" style="margin: 0 auto;"></div>
      </div>

      <!-- Form Grid/Table for Menu Items -->
      <div v-else-if="activeStockType === 'menu_items'" class="bulk-stock-table-container">
        <!-- Desktop Grid Header -->
        <div class="bulk-stock-header-row desktop-only">
          <div style="text-align: left; padding-left: var(--space-md);">เมนูอาหาร</div>
          <div style="text-align: center;">ของสดคงเหลือ</div>
          <div style="text-align: center;">ปรับยอดของสด</div>
          <div style="text-align: center;">ทอดสุกคงเหลือ</div>
          <div style="text-align: center;">ปรับยอดทอดสุก</div>
        </div>

        <!-- Scrollable content -->
        <div class="bulk-stock-rows-container">
          <div v-for="item in bulkFormItems" :key="item.menu_item_id" class="bulk-stock-row">
            <!-- Col 1: Name -->
            <div class="bulk-item-name-col">
              <div class="font-bold" style="font-size: var(--font-lg);">{{ item.name }}</div>
              <div class="mobile-only" style="font-size: var(--font-xs); color: var(--text-tertiary); margin-top: 2px;">ID: {{ item.menu_item_id }}</div>
            </div>

            <!-- Col 2: Raw stock quantity -->
            <div class="bulk-item-current-col text-center">
              <span class="mobile-label"><i class="fa-solid fa-box" style="margin-right: 4px;"></i> คงเหลือ:</span>
              <span :class="{ 'text-danger': isItemLowStock(item, item.raw_quantity) }" style="font-weight: bold; font-size: var(--font-md);">
                {{ item.raw_quantity !== null && item.raw_quantity !== undefined ? formatStockQty(item.raw_quantity, item.uom) : '-' }}
              </span>
            </div>

            <!-- Col 3: Raw stock input -->
            <div class="bulk-item-input-col">
              <div class="bulk-input-wrapper">
                <span class="mobile-label"><i class="fa-solid fa-box" style="margin-right: 4px;"></i> ปรับยอด:</span>
                <input 
                  type="text" 
                  v-model="item.raw"
                  :disabled="item.raw_quantity === null || item.raw_quantity === undefined || !isAdmin()"
                  :placeholder="item.raw_quantity === null || item.raw_quantity === undefined ? 'ไม่มี' : (!isAdmin() ? 'ล็อก' : (bulkTab === 'relative' ? '0' : String(Math.round(item.raw_quantity * 100) / 100)))"
                  class="form-input"
                  :class="{ 'disabled-input': item.raw_quantity === null || item.raw_quantity === undefined || !isAdmin() }"
                />
              </div>
            </div>

            <!-- Col 4: Cooked stock quantity -->
            <div class="bulk-item-current-col text-center">
              <span class="mobile-label"><i class="fa-solid fa-drumstick-bite" style="margin-right: 4px;"></i> คงเหลือ:</span>
              <span :class="{ 'text-danger': isItemLowStock(item, item.quantity) }" style="font-weight: bold; font-size: var(--font-md);">
                {{ item.quantity !== null && item.quantity !== undefined ? formatStockQty(item.quantity, item.uom) : formatStockQty(0, item.uom) }}
              </span>
            </div>

            <!-- Col 5: Cooked stock input -->
            <div class="bulk-item-input-col">
              <div class="bulk-input-wrapper">
                <span class="mobile-label"><i class="fa-solid fa-drumstick-bite" style="margin-right: 4px;"></i> ปรับยอด:</span>
                 <input 
                  type="text" 
                  v-model="item.cooked"
                  :placeholder="bulkTab === 'relative' ? '0' : (item.quantity !== null && item.quantity !== undefined ? String(Math.round(item.quantity * 100) / 100) : '0')"
                  class="form-input"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Absolute Tab reason presets -->
        <div v-if="bulkTab === 'absolute'" class="absolute-reason-section mt-xl">
          <div class="form-group mb-0">
            <label class="form-label font-bold" style="font-size: var(--font-md);">เหตุผลในการปรับยอดจริง *</label>
            <div class="custom-select-wrapper" @click.stop>
              <div 
                class="custom-select-trigger" 
                :class="{ 'active': isReasonDropdownOpen }" 
                @click="isReasonDropdownOpen = !isReasonDropdownOpen"
              >
                <span class="custom-select-text" style="display: inline-flex; align-items: center; gap: 6px;">
                  <i :class="getBulkReasonIcon(bulkReasonPreset)"></i>
                  {{ selectedReasonLabel }}
                </span>
              </div>
              <div v-if="isReasonDropdownOpen" class="custom-select-dropdown">
                <div class="custom-select-option" :class="{ 'selected': bulkReasonPreset === 'นับยอดขาด/เกิน' }" @click="selectReasonPreset('นับยอดขาด/เกิน')">
                  <i class="fa-solid fa-chart-simple" style="margin-right: 4px;"></i> นับยอดขาด/เกิน
                </div>
                <div class="custom-select-option" :class="{ 'selected': bulkReasonPreset === 'กรอกผิด' }" @click="selectReasonPreset('กรอกผิด')">
                  <i class="fa-solid fa-pen-to-square" style="margin-right: 4px;"></i> กรอกผิด (แก้ไขยอด)
                </div>
                <div class="custom-select-option" :class="{ 'selected': bulkReasonPreset === 'อื่นๆ' }" @click="selectReasonPreset('อื่นๆ')">
                  <i class="fa-solid fa-circle-question" style="margin-right: 4px;"></i> อื่นๆ
                </div>
              </div>
            </div>
          </div>
          <div class="form-group mb-0">
            <label class="form-label font-bold" style="font-size: var(--font-md);">คำอธิบายเพิ่มเติม (ถ้ามี)</label>
            <input 
              type="text" 
              v-model="bulkNote" 
              placeholder="ระบุข้อความเพื่อบันทึกประวัติ..." 
              class="form-input"
            />
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-lg mt-2xl bulk-action-buttons">
          <router-link to="/stock" class="btn btn-secondary btn-bulk-back">
            ยกเลิก
          </router-link>
          <button 
            class="btn btn-primary btn-bulk-save" 
            @click="handleSaveBulkAdjust"
          >
            <i class="fa-solid fa-floppy-disk" style="margin-right: 4px;"></i> บันทึกสต็อกด่วน
          </button>
        </div>
      </div>

      <!-- Form Grid/Table for Modifiers -->
      <div v-else-if="activeStockType === 'modifiers'" class="bulk-stock-table-container">
        <!-- Desktop Grid Header -->
        <div class="bulk-stock-header-row desktop-only" style="grid-template-columns: 2.2fr 1.2fr 1.2fr 1.2fr;">
          <div style="text-align: left; padding-left: var(--space-md);">ชื่อเครื่องปรุง / ซอส / ผงปรุงรส</div>
          <div style="text-align: center;">ประเภท</div>
          <div style="text-align: center;">คงเหลือปัจจุบัน</div>
          <div style="text-align: center;">
            {{ bulkTab === 'relative' ? 'จำนวนที่ปรับ (ถุง/ซองเล็ก) *' : 'จำนวนรอบเสิร์ฟเป้าหมาย *' }}
          </div>
        </div>

        <!-- Scrollable content -->
        <div class="bulk-stock-rows-container">
          <div 
            v-for="item in bulkModifiersFormItems" 
            :key="item.modifier_id" 
            class="bulk-stock-row bulk-modifier-row"
            style="grid-template-columns: 2.2fr 1.2fr 1.2fr 1.2fr;"
          >
            <!-- Col 1: Name & Mobile Badge -->
            <div class="bulk-item-name-col">
              <div class="flex flex-between align-center" style="width: 100%; gap: var(--space-xs);">
                <div>
                  <div class="font-bold" style="font-size: var(--font-lg); text-align: left;">{{ item.name }}</div>
                  <div style="font-size: var(--font-xs); color: var(--text-tertiary); margin-top: 2px; text-align: left;">ID: {{ item.modifier_id }}</div>
                </div>
                <span class="badge show-mobile-inline" :class="getModifierCategoryClass(item.category)" style="font-size: 11px; padding: 3px 8px; margin-left: auto;">
                  {{ getModifierCategoryLabel(item.category) }}
                </span>
              </div>
            </div>

            <!-- Col 2: Category Badge (Desktop Only) -->
            <div class="flex align-center justify-center font-semibold hide-mobile">
              <span class="badge" :class="getModifierCategoryClass(item.category)">
                {{ getModifierCategoryLabel(item.category) }}
              </span>
            </div>

            <!-- Col 3: Current Stock (servings + bags) -->
            <div class="bulk-item-current-col text-center">
              <span class="mobile-label">คงเหลือ:</span>
              <span style="font-weight: bold; font-size: var(--font-md);">
                {{ formatModifierStockShort(item) }}
              </span>
            </div>

            <!-- Col 4: Input value -->
            <div class="bulk-item-input-col">
              <div class="bulk-input-wrapper">
                <span class="mobile-label">
                  {{ bulkTab === 'relative' ? (item.category === 'sauce_small' ? 'ซองที่ปรับ:' : 'ถุงที่ปรับ:') : 'รอบเสิร์ฟ:' }}
                </span>
                <input 
                  type="text" 
                  v-model="item.value"
                  :placeholder="bulkTab === 'relative' ? '0' : String(Math.round(item.total_servings * 100) / 100)"
                  class="form-input"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Absolute Tab reason presets -->
        <div v-if="bulkTab === 'absolute'" class="absolute-reason-section mt-xl">
          <div class="form-group mb-0">
            <label class="form-label font-bold" style="font-size: var(--font-md);">เหตุผลในการปรับยอดจริง *</label>
            <div class="custom-select-wrapper" @click.stop>
              <div 
                class="custom-select-trigger" 
                :class="{ 'active': isReasonDropdownOpen }" 
                @click="isReasonDropdownOpen = !isReasonDropdownOpen"
              >
                <span class="custom-select-text" style="display: inline-flex; align-items: center; gap: 6px;">
                  <i :class="getBulkReasonIcon(bulkReasonPreset)"></i>
                  {{ selectedReasonLabel }}
                </span>
              </div>
              <div v-if="isReasonDropdownOpen" class="custom-select-dropdown">
                <div class="custom-select-option" :class="{ 'selected': bulkReasonPreset === 'นับยอดขาด/เกิน' }" @click="selectReasonPreset('นับยอดขาด/เกิน')">
                  <i class="fa-solid fa-chart-simple" style="margin-right: 4px;"></i> นับยอดขาด/เกิน
                </div>
                <div class="custom-select-option" :class="{ 'selected': bulkReasonPreset === 'กรอกผิด' }" @click="selectReasonPreset('กรอกผิด')">
                  <i class="fa-solid fa-pen-to-square" style="margin-right: 4px;"></i> กรอกผิด (แก้ไขยอด)
                </div>
                <div class="custom-select-option" :class="{ 'selected': bulkReasonPreset === 'อื่นๆ' }" @click="selectReasonPreset('อื่นๆ')">
                  <i class="fa-solid fa-circle-question" style="margin-right: 4px;"></i> อื่นๆ
                </div>
              </div>
            </div>
          </div>
          <div class="form-group mb-0">
            <label class="form-label font-bold" style="font-size: var(--font-md);">คำอธิบายเพิ่มเติม (ถ้ามี)</label>
            <input 
              type="text" 
              v-model="bulkNote" 
              placeholder="ระบุข้อความเพื่อบันทึกประวัติ..." 
              class="form-input"
            />
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-lg mt-2xl bulk-action-buttons">
          <router-link to="/stock" class="btn btn-secondary btn-bulk-back">
            ยกเลิก
          </router-link>
          <button 
            class="btn btn-primary btn-bulk-save" 
            @click="handleSaveBulkAdjust"
          >
            <i class="fa-solid fa-floppy-disk" style="margin-right: 4px;"></i> บันทึกสต็อกด่วน
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';
import { ui, isAdmin } from '../helpers';
import { store } from '../store';

const router = useRouter();
const stockItems = computed(() => store.stockItems);
const loading = ref(true);
const activeStockType = ref('menu_items'); // 'menu_items' or 'modifiers'
const bulkTab = ref('relative'); // 'relative' or 'absolute'
const bulkFormItems = ref([]);
const bulkModifiersFormItems = ref([]);
const bulkReasonPreset = ref('นับยอดขาด/เกิน');
const bulkNote = ref('');
const lowStockThreshold = computed(() => store.lowStockThreshold);

const formatStockQty = (qty, uom) => {
  if (qty === null || qty === undefined) return '';
  const roundedQty = Math.round(Number(qty) * 100) / 100;
  if (uom === 'กรัม') {
    return `${roundedQty} ก.`;
  }
  return `${roundedQty} ${uom || 'ชิ้น'}`;
};

const isItemLowStock = (item, qty) => {
  if (qty === null || qty === undefined) return false;
  if (qty <= 0) return false;
  if (item.uom === 'กรัม') {
    return qty <= 500;
  }
  return qty <= lowStockThreshold.value;
};

// Custom Dropdown logic for StockBulk.vue
const isReasonDropdownOpen = ref(false);
const selectedReasonLabel = computed(() => {
  const reasonLabels = {
    'นับยอดขาด/เกิน': 'นับยอดขาด/เกิน',
    'กรอกผิด': 'กรอกผิด (แก้ไขยอด)',
    'อื่นๆ': 'อื่นๆ'
  };
  return reasonLabels[bulkReasonPreset.value] || 'นับยอดขาด/เกิน';
});

const getBulkReasonIcon = (reason) => {
  const map = {
    'นับยอดขาด/เกิน': 'fa-solid fa-chart-simple',
    'กรอกผิด': 'fa-solid fa-pen-to-square',
    'อื่นๆ': 'fa-solid fa-circle-question'
  };
  return map[reason] || 'fa-solid fa-circle-question';
};
const selectReasonPreset = (val) => {
  bulkReasonPreset.value = val;
  isReasonDropdownOpen.value = false;
};
const closeReasonDropdown = () => {
  isReasonDropdownOpen.value = false;
};

// Modifiers Helper Functions
const getModifierCategoryLabel = (category) => {
  const map = {
    'sauce_small': 'ซอส (ซองเล็ก)',
    'sauce_large': 'ซอส (ถุงใหญ่)',
    'dipping': 'น้ำจิ้ม',
    'powder': 'ผงปรุงรส'
  };
  return map[category] || category;
};

const getModifierCategoryClass = (category) => {
  const map = {
    'sauce_small': 'badge-mod-sauce-small',
    'sauce_large': 'badge-mod-sauce-large',
    'dipping': 'badge-mod-dipping',
    'powder': 'badge-mod-powder'
  };
  return map[category] || 'badge-neutral';
};

const formatModifierStockShort = (item) => {
  if (!item) return '';
  if (item.category === 'sauce_small') {
    return `${Math.round(item.total_servings * 100) / 100} ซอง`;
  }
  const servingsPerBag = item.servings_per_bag || 50;
  const bags = Math.floor(item.total_servings / servingsPerBag);
  const servings = Math.round((item.total_servings % servingsPerBag) * 100) / 100;
  
  let text = '';
  if (bags > 0) text += `${bags} ถุง`;
  if (servings > 0 || bags === 0) {
    if (text) text += ' ';
    text += `${servings} รอบ`;
  }
  return text;
};

const initializeForm = () => {
  bulkFormItems.value = stockItems.value.map(item => {
    return {
      menu_item_id: item.id,
      name: item.name,
      quantity: item.quantity,
      raw_quantity: item.raw_quantity,
      uom: item.uom,
      cooked: '',
      raw: ''
    };
  });
  initializeModifiersForm();
};

const initializeModifiersForm = () => {
  bulkModifiersFormItems.value = store.modifiers.map(item => {
    return {
      modifier_id: item.id,
      name: item.name,
      category: item.category,
      servings_per_bag: item.servings_per_bag || 50,
      total_servings: item.total_servings || 0,
      value: ''
    };
  });
};

const loadStockData = async () => {
  try {
    await Promise.all([
      store.fetchStock(true),
      store.fetchModifiers(true)
    ]);
    initializeForm();
  } catch (e) {
    console.error(e);
    ui.showToast('ไม่สามารถโหลดข้อมูลคลังสินค้าได้', 'error');
  } finally {
    loading.value = false;
  }
};

const setBulkTab = (tab) => {
  bulkTab.value = tab;
  
  bulkFormItems.value.forEach(item => {
    if (tab === 'absolute') {
      item.cooked = item.quantity !== null && item.quantity !== undefined ? Math.round(item.quantity * 100) / 100 : 0;
      item.raw = item.raw_quantity !== null && item.raw_quantity !== undefined ? Math.round(item.raw_quantity * 100) / 100 : 0;
    } else {
      item.cooked = '';
      item.raw = '';
    }
  });

  bulkModifiersFormItems.value.forEach(item => {
    if (tab === 'absolute') {
      item.value = item.total_servings !== null && item.total_servings !== undefined ? Math.round(item.total_servings * 100) / 100 : 0;
    } else {
      item.value = '';
    }
  });
};

const handleSaveBulkAdjust = async () => {
  ui.showLoading();
  try {
    if (activeStockType.value === 'menu_items') {
      const itemsToSend = [];
      
      for (const item of bulkFormItems.value) {
        let hasChange = false;
        
        const cookedVal = item.cooked !== null && item.cooked !== undefined && String(item.cooked).trim() !== '' ? String(item.cooked).trim() : null;
        const rawVal = item.raw !== null && item.raw !== undefined && String(item.raw).trim() !== '' ? String(item.raw).trim() : null;
        
        const parsedCooked = cookedVal !== null ? Number(cookedVal) : null;
        const parsedRaw = rawVal !== null ? Number(rawVal) : null;
        
        if (bulkTab.value === 'relative') {
          if ((parsedCooked !== null && parsedCooked !== 0 && !isNaN(parsedCooked)) || 
              (parsedRaw !== null && parsedRaw !== 0 && !isNaN(parsedRaw))) {
            hasChange = true;
          }
        } else {
          const currentCooked = item.quantity !== null && item.quantity !== undefined ? item.quantity : 0;
          const currentRaw = item.raw_quantity !== null && item.raw_quantity !== undefined ? item.raw_quantity : 0;
          
          const targetCooked = parsedCooked !== null && !isNaN(parsedCooked) ? parsedCooked : currentCooked;
          const targetRaw = parsedRaw !== null && !isNaN(parsedRaw) ? parsedRaw : currentRaw;
          
          if (targetCooked !== currentCooked || targetRaw !== currentRaw) {
            hasChange = true;
          }
        }
        
        if (hasChange) {
          itemsToSend.push({
            menu_item_id: item.menu_item_id,
            cooked: cookedVal,
            raw: rawVal
          });
        }
      }
      
      if (itemsToSend.length === 0) {
        ui.showToast('ไม่มีรายการใดที่มีความเปลี่ยนแปลง', 'info');
        ui.hideLoading();
        return;
      }
      
      const payload = {
        mode: bulkTab.value,
        items: itemsToSend,
        reason_preset: bulkTab.value === 'absolute' ? bulkReasonPreset.value : undefined,
        note: bulkTab.value === 'absolute' ? bulkNote.value.trim() : undefined
      };
      
      const res = await api.stock.bulkAdjust(payload);
      if (res.success) {
        if (res.updatedItems && Array.isArray(res.updatedItems)) {
          res.updatedItems.forEach(item => {
            store.updateStock(item.id, item.stock, item.raw_stock);
          });
        } else {
          store.clearMenuCache();
          store.clearStockCache();
        }
        ui.showToast('ปรับปรุงสต็อกด่วนเรียบร้อย', 'success');
        router.push('/stock');
      }
    } else {
      // Modifiers bulk adjust
      const itemsToSend = [];
      
      for (const item of bulkModifiersFormItems.value) {
        let hasChange = false;
        
        const inputVal = item.value !== null && item.value !== undefined && String(item.value).trim() !== '' ? String(item.value).trim() : null;
        const parsedVal = inputVal !== null ? Number(inputVal) : null;
        
        if (bulkTab.value === 'relative') {
          if (parsedVal !== null && parsedVal !== 0 && !isNaN(parsedVal)) {
            hasChange = true;
          }
        } else {
          const currentVal = item.total_servings;
          const targetVal = parsedVal !== null && !isNaN(parsedVal) ? parsedVal : currentVal;
          
          if (targetVal !== currentVal) {
            hasChange = true;
          }
        }
        
        if (hasChange) {
          let servingsDelta = 0;
          if (bulkTab.value === 'relative') {
            if (item.category === 'sauce_small') {
              servingsDelta = parsedVal;
            } else {
              servingsDelta = parsedVal * item.servings_per_bag;
            }
          }
          
          itemsToSend.push({
            modifier_id: item.modifier_id,
            servings: bulkTab.value === 'relative' ? servingsDelta : parsedVal
          });
        }
      }
      
      if (itemsToSend.length === 0) {
        ui.showToast('ไม่มีรายการเครื่องปรุงใดที่มีความเปลี่ยนแปลง', 'info');
        ui.hideLoading();
        return;
      }
      
      const payload = {
        mode: bulkTab.value,
        items: itemsToSend,
        reason_preset: bulkTab.value === 'absolute' ? bulkReasonPreset.value : undefined,
        note: bulkTab.value === 'absolute' ? bulkNote.value.trim() : undefined
      };
      
      const res = await api.modifiers.bulkAdjust(payload);
      if (res.success) {
        if (res.updatedModifiers && Array.isArray(res.updatedModifiers)) {
          res.updatedModifiers.forEach(m => {
            const idx = store.modifiers.findIndex(x => x.id === m.id);
            if (idx !== -1) {
              store.modifiers[idx].total_servings = m.total_servings;
            }
          });
        } else {
          store.clearModifiersCache();
        }
        ui.showToast('ปรับปรุงสต็อกเครื่องปรุงด่วนเรียบร้อย', 'success');
        router.push('/stock');
      }
    }
  } catch (e) {
    console.error(e);
    ui.showToast('ปรับปรุงสต็อกด่วนล้มเหลว: ' + e.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

onMounted(() => {
  loadStockData();
  window.addEventListener('click', closeReasonDropdown);
});

onUnmounted(() => {
  window.removeEventListener('click', closeReasonDropdown);
});
</script>

<style scoped>
/* Header Grid Styling */
.bulk-header-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
}

.header-left {
  display: flex;
  justify-content: flex-start;
}

.header-center {
  display: flex;
  justify-content: center;
}

.header-right {
  display: flex;
  justify-content: flex-end;
}

.stock-page-title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: bold;
  color: var(--text-primary);
  text-align: center;
}

/* Header Buttons matching styling */
.btn-bulk-back, .btn-bulk-save {
  min-height: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  font-weight: bold;
  font-size: var(--font-base);
  padding: 0 var(--space-lg);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
  white-space: nowrap;
}

.btn-bulk-back {
  background: var(--bg-primary);
  border: 1px solid var(--border-color-light);
  color: var(--text-primary);
  text-decoration: none;
  min-width: 150px;
}

.btn-bulk-back:hover {
  background: var(--bg-secondary);
  border-color: var(--border-color-focus);
  transform: translateY(-1px);
}

.btn-bulk-save {
  background: linear-gradient(135deg, #e63946, #b7091b);
  color: white;
  border: none;
  cursor: pointer;
  min-width: 200px;
}

.btn-bulk-save:hover {
  filter: brightness(1.05);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* Action Buttons Footer Container */
.bulk-action-buttons {
  display: flex;
  gap: var(--space-lg);
  justify-content: flex-end;
  width: 100%;
}

/* Outer category tabs style */
.category-tabs {
  display: flex;
  gap: var(--space-sm);
  border-bottom: 2px solid var(--border-color);
  padding-bottom: var(--space-sm);
  margin-bottom: var(--space-lg);
  overflow-x: auto;
}
.category-tab {
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 1.15rem;
  font-weight: bold;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
  white-space: nowrap;
}
.category-tab:hover {
  color: var(--text-primary);
}
.category-tab.active {
  border-bottom-color: var(--primary);
  color: var(--primary);
}

/* Tabs */
.bulk-tabs {
  display: flex;
  gap: var(--space-xs);
  border-bottom: 2px solid var(--border-color);
  margin-bottom: var(--space-lg);
}
.bulk-tab {
  flex: 1;
  padding: 16px 8px;
  text-align: center;
  cursor: pointer;
  background: transparent;
  border: none;
  border-bottom: 4px solid transparent;
  color: var(--text-secondary);
  font-size: 1.25rem;
  font-weight: var(--font-weight-bold);
  transition: all var(--transition-base);
}
.bulk-tab:hover {
  color: var(--text-primary);
}
.bulk-tab.active {
  border-bottom-color: var(--primary);
  color: var(--primary);
}

/* Hint box alert */
.bulk-hint-box {
  font-size: var(--font-base);
  color: var(--text-secondary);
  text-align: left;
  background: rgba(255, 171, 43, 0.06);
  border: 1px solid rgba(255, 171, 43, 0.25);
  border-left: 6px solid var(--accent);
  border-radius: var(--radius-sm);
  padding: var(--space-md) var(--space-lg);
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  line-height: 1.5;
}
.hint-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
  line-height: 1;
  margin-top: 2px;
}
.hint-text {
  flex: 1;
}

.bulk-stock-table-container {
  display: flex;
  flex-direction: column;
}

.bulk-stock-header-row {
  display: grid;
  grid-template-columns: 2fr 1.2fr 1.2fr 1.2fr 1.2fr;
  padding: var(--space-lg) var(--space-md);
  background: rgba(139, 3, 19, 0.05);
  border-bottom: 2px solid var(--border-color);
  font-size: 1.15rem;
  font-weight: bold;
  color: var(--text-secondary);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}

.bulk-stock-rows-container {
  max-height: 55vh;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-top: none;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  background: rgba(255, 255, 255, 0.2);
}

.bulk-stock-row {
  display: grid;
  grid-template-columns: 2fr 1.2fr 1.2fr 1.2fr 1.2fr;
  align-items: center;
  padding: var(--space-lg) var(--space-md);
  border-bottom: 1px solid var(--border-color);
  gap: var(--space-md);
}

.bulk-stock-row:last-child {
  border-bottom: none;
}

.bulk-item-name-col {
  text-align: left;
  padding-left: var(--space-md);
}

.bulk-item-current-col {
  font-weight: bold;
  color: var(--text-primary);
}

.bulk-input-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.bulk-input-wrapper input {
  height: 48px;
  padding: var(--space-sm);
  font-size: 1.35rem;
  font-weight: bold;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  text-align: center;
  width: 100%;
}

.bulk-input-wrapper input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
  outline: none;
}

.bulk-input-wrapper input.disabled-input {
  background: rgba(0, 0, 0, 0.05) !important;
  color: var(--text-tertiary) !important;
  cursor: not-allowed !important;
  opacity: 0.6 !important;
}

.mobile-label {
  display: none;
}

.mobile-only {
  display: none;
}

/* Absolute adjustments layout container */
.absolute-reason-section {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: var(--space-lg);
  padding: var(--space-lg);
  background: rgba(139, 3, 19, 0.02);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  text-align: left;
}
.absolute-reason-section .form-select,
.absolute-reason-section .form-input {
  height: 48px;
  font-size: var(--font-base);
  width: 100%;
}

/* Responsive Styles */
@media (max-width: 992px) {
  .desktop-only {
    display: none !important;
  }
  
  .bulk-tab {
    font-size: 1.05rem;
    padding: 10px 4px;
  }

  .bulk-stock-rows-container {
    border: none;
    background: transparent;
    max-height: none;
  }
  
  .bulk-stock-row {
    display: grid;
    grid-template-columns: 1fr 1fr !important;
    gap: var(--space-md);
    padding: var(--space-lg);
    background: var(--card-bg);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-lg);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-sm);
  }
  
  .bulk-item-name-col {
    grid-column: span 2;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: var(--space-sm);
    padding-left: 0;
    margin-bottom: var(--space-xs);
  }
  
  .mobile-only {
    display: block !important;
  }
  
  /* Arrange Menu Items Raw and Cooked into two parallel columns on mobile */
  .bulk-stock-row:not(.bulk-modifier-row) > div:nth-child(2) { /* Raw Current */
    grid-column: 1;
    grid-row: 2;
  }
  .bulk-stock-row:not(.bulk-modifier-row) > div:nth-child(3) { /* Raw Input */
    grid-column: 1;
    grid-row: 3;
  }
  .bulk-stock-row:not(.bulk-modifier-row) > div:nth-child(4) { /* Cooked Current */
    grid-column: 2;
    grid-row: 2;
  }
  .bulk-stock-row:not(.bulk-modifier-row) > div:nth-child(5) { /* Cooked Input */
    grid-column: 2;
    grid-row: 3;
  }

  /* Arrange Modifiers Row on mobile */
  .bulk-modifier-row > div:nth-child(3) { /* Current Stock */
    grid-column: 1;
    grid-row: 2;
  }
  .bulk-modifier-row > div:nth-child(4) { /* Input Value */
    grid-column: 2;
    grid-row: 2;
    width: 100%;
  }

  .bulk-item-current-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center !important;
    background: rgba(139, 3, 19, 0.02);
    border: 1px dashed var(--border-color);
    border-radius: var(--radius-sm);
    padding: var(--space-sm) var(--space-xs);
    font-size: var(--font-base);
  }

  .bulk-item-input-col {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  .bulk-input-wrapper {
    align-items: center;
  }
  
  .bulk-input-wrapper input {
    height: 44px;
    font-size: 1.15rem;
  }

  .mobile-label {
    display: block !important;
    font-size: var(--font-xs);
    font-weight: bold;
    color: var(--text-secondary);
    margin-bottom: var(--space-xs);
    text-align: center;
    width: auto;
  }

  /* Prevent action buttons from breaking borders/viewport on mobile */
  .bulk-action-buttons {
    display: flex;
    gap: var(--space-md);
    width: 100%;
  }
  .btn-bulk-back, .btn-bulk-save {
    flex: 1;
    min-width: 0 !important;
    width: 100%;
    padding: 0 var(--space-sm);
    font-size: var(--font-sm);
  }

  .bulk-main-card {
    padding: var(--space-md) 0 !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }
}

@media (max-width: 768px) {
  .bulk-header-grid {
    grid-template-columns: 1fr 1fr;
    gap: var(--space-md);
    padding: var(--space-md);
  }
  
  .header-center {
    grid-column: span 2;
    order: 1;
    justify-content: center;
  }
  
  .header-left {
    grid-column: 1;
    order: 2;
    width: 100%;
  }
  
  .header-right {
    grid-column: 2;
    order: 3;
    width: 100%;
  }
  
  .btn-bulk-back, .btn-bulk-save {
    width: 100%;
  }

  .absolute-reason-section {
    grid-template-columns: 1fr;
    gap: var(--space-md);
    padding: var(--space-md);
  }
}
</style>
