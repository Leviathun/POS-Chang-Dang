<template>
  <div id="stock-bulk-page" class="page-enter">
    
    <!-- Top Header Card (Matches Stock.vue & StockCook.vue) -->
    <div class="card mb-lg p-md flex flex-between align-center mobile-stock-header-card" style="gap: var(--space-md); flex-wrap: wrap;">
      <div class="title-tooltip-wrapper" @click.stop>
        <h2 class="stock-page-title">
          ปรับปรุงยอด
        </h2>
        <button 
          type="button" 
          class="title-info-btn" 
          aria-label="คำอธิบายโหมดปรับปรุงยอด"
          :aria-expanded="showHintTooltip"
          @click="showHintTooltip = !showHintTooltip"
        >
          <i class="fa-solid fa-circle-info"></i>
        </button>
        <div v-if="showHintTooltip" class="title-tooltip-popover" role="tooltip">
          <template v-if="activeStockType === 'menu_items'">
            <strong>โหมดปรับปรุงยอด:</strong> กรอกจำนวนสต็อกคงเหลือจริงล่าสุด ระบบจะคำนวณส่วนต่างและบันทึกเฉพาะรายการที่มีการเปลี่ยนแปลง
          </template>
          <template v-else>
            <strong>โหมดปรับปรุงยอด (เครื่องปรุง):</strong> กรอกจำนวน <strong>รอบเสิร์ฟ</strong> จริงคงเหลือทั้งหมดล่าสุดในระบบ
          </template>
        </div>
      </div>
      <div class="flex align-center gap-sm flex-wrap mobile-header-actions">
        <router-link to="/stock" class="btn btn-secondary btn-bulk-back">
          <i class="fa-solid fa-arrow-left"></i> ย้อนกลับ
        </router-link>
        <button 
          class="btn btn-primary btn-bulk-header-save" 
          :disabled="isSaving"
          @click="handleSaveBulkAdjust"
        >
          <i v-if="isSaving" class="fa-solid fa-spinner fa-spin"></i>
          <i v-else class="fa-solid fa-floppy-disk"></i>
          <span>{{ isSaving ? 'กำลังบันทึก...' : (changedCount > 0 ? `บันทึก (${changedCount})` : 'บันทึก') }}</span>
        </button>
      </div>
    </div>

    <!-- Search & Modified Summary Bar -->
    <div class="card p-md mb-lg bulk-toolbar-card">
      <div class="flex flex-between align-center gap-md flex-wrap">
        <div class="input-icon-wrapper flex-1" style="min-width: 220px;">
          <i class="fa-solid fa-magnifying-glass input-icon"></i>
          <input 
            type="text" 
            v-model="searchQuery" 
            class="form-input bulk-search-input" 
            placeholder="ค้นหาชื่อสินค้า..." 
            aria-label="ค้นหาชื่อสินค้า"
          />
          <button 
            v-if="searchQuery" 
            type="button"
            class="clear-search-btn" 
            aria-label="ล้างคำค้นหา"
            @click="searchQuery = ''"
          >
            ✕
          </button>
        </div>

        <div class="flex align-center gap-sm flex-wrap">
          <span class="text-sm font-semibold tabular-nums" :class="changedCount > 0 ? 'text-primary' : 'text-secondary'">
            แก้ไขแล้ว {{ changedCount }} รายการ
          </span>
          <button 
            v-if="changedCount > 0"
            type="button"
            class="btn btn-secondary btn-sm"
            @click="resetAllChanges"
          >
            <i class="fa-solid fa-rotate-left"></i> รีเซ็ต
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="card p-lg overflow-hidden bulk-main-card">
      <!-- Outer Category Tabs: Menu Items vs Modifiers (Hidden while preserving structure) -->
      <div class="category-tabs mb-lg" v-if="false">
        <button 
          class="btn btn-secondary" 
          :class="{ 'active': activeStockType === 'menu_items' }"
          @click="activeStockType = 'menu_items'"
        >
          <i class="fa-solid fa-drumstick-bite"></i> สินค้าและเมนู
        </button>
        <button 
          class="btn btn-secondary" 
          :class="{ 'active': activeStockType === 'modifiers' }"
          @click="activeStockType = 'modifiers'"
        >
          <i class="fa-solid fa-bottle-droplet"></i> ซอสและเครื่องปรุง
        </button>
      </div>

      <!-- Loading State (Skeleton) -->
      <div v-if="loading" class="bulk-stock-table-container">
        <div class="bulk-stock-rows-container">
          <div v-for="n in 5" :key="'sk-bulk-' + n" class="bulk-stock-row">
            <div class="bulk-item-name-col">
              <div class="skeleton" style="height: 18px; width: 140px; border-radius: 4px;"></div>
            </div>
            <div class="bulk-item-current-col text-center">
              <div class="skeleton mx-auto" style="height: 18px; width: 70px; border-radius: 4px;"></div>
            </div>
            <div class="bulk-item-input-col">
              <div class="skeleton mx-auto" style="height: 44px; width: 110px; border-radius: 8px;"></div>
            </div>
            <div class="bulk-item-current-col text-center">
              <div class="skeleton mx-auto" style="height: 18px; width: 70px; border-radius: 4px;"></div>
            </div>
            <div class="bulk-item-input-col">
              <div class="skeleton mx-auto" style="height: 44px; width: 110px; border-radius: 8px;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Form Grid/Table for Menu Items -->
      <div v-else-if="activeStockType === 'menu_items'" class="bulk-stock-table-container">
        <!-- Desktop Grid Header -->
        <div class="bulk-stock-header-row desktop-only">
          <div style="text-align: left; padding-left: var(--space-md);">เมนูอาหาร</div>
          <div class="text-center flex align-center justify-center gap-xs"><i class="fa-solid fa-snowflake text-accent"></i> คงเหลือ (ของสด)</div>
          <div class="text-center flex align-center justify-center gap-xs"><i class="fa-solid fa-snowflake text-accent"></i> ปรับยอด (ของสด)</div>
          <div class="text-center flex align-center justify-center gap-xs"><i class="fa-solid fa-fire text-primary"></i> คงเหลือ (พร้อมขาย)</div>
          <div class="text-center flex align-center justify-center gap-xs"><i class="fa-solid fa-fire text-primary"></i> ปรับยอด (พร้อมขาย)</div>
        </div>

        <!-- Empty Search State -->
        <div v-if="filteredMenuItems.length === 0" class="text-center p-3xl text-secondary">
          <i class="fa-solid fa-magnifying-glass mb-sm" style="font-size: 28px; opacity: 0.4;"></i>
          <div class="font-bold">ไม่พบรายการสินค้าที่ค้นหา</div>
        </div>

        <!-- Scrollable content -->
        <div v-else class="bulk-stock-rows-container">
          <div 
            v-for="item in filteredMenuItems" 
            :key="item.menu_item_id" 
            class="bulk-stock-row" 
            :class="{ 
              'has-linkage-warning': item.name.includes('แร็ปไก่') || isLinkedBun(item),
              'is-modified': isMenuItemModified(item)
            }"
          >
            <!-- Col 1: Name -->
            <div class="bulk-item-name-col">
              <div class="flex align-center gap-xs flex-wrap">
                <span class="font-bold text-base item-name-text">{{ item.name }}</span>
                <span v-if="isMenuItemModified(item)" class="badge badge-warning badge-sm">แก้ไข</span>
              </div>
            </div>

            <!-- Col 2: Raw stock quantity -->
            <div class="bulk-item-current-col text-center tabular-nums">
              <span class="mobile-label"><i class="fa-solid fa-snowflake text-accent" style="margin-right: 4px;"></i> คงเหลือ ของสด</span>
              <span :class="{ 'text-danger': isItemLowStock(item, item.raw_quantity) }" class="font-bold text-base">
                {{ item.raw_quantity !== null && item.raw_quantity !== undefined ? formatStockQty(item.raw_quantity, item.uom) : '-' }}
              </span>
            </div>

            <!-- Col 3: Raw stock input -->
            <div class="bulk-item-input-col">
              <div class="bulk-input-wrapper">
                <span class="mobile-label"><i class="fa-solid fa-snowflake text-accent" style="margin-right: 4px;"></i> ปรับยอด ของสด</span>
                <div class="input-with-delta">
                  <input 
                    type="text" 
                    inputmode="decimal"
                    v-model="item.raw"
                    :disabled="item.raw_quantity === null || item.raw_quantity === undefined || !isAdmin()"
                    :placeholder="item.raw_quantity === null || item.raw_quantity === undefined ? 'ไม่มี' : (!isAdmin() ? 'ล็อก' : String(Math.round(item.raw_quantity * 100) / 100))"
                    :aria-label="`ปรับยอดของสด ${item.name}`"
                    class="form-input tabular-nums"
                    :class="{ 
                      'disabled-input': item.raw_quantity === null || item.raw_quantity === undefined || !isAdmin(),
                      'input-changed': getDelta(item.raw, item.raw_quantity) !== 0 && item.raw_quantity !== null && item.raw_quantity !== undefined
                    }"
                  />
                  <span 
                    v-if="item.raw_quantity !== null && item.raw_quantity !== undefined && getDelta(item.raw, item.raw_quantity) !== 0"
                    class="delta-pill tabular-nums"
                    :class="getDelta(item.raw, item.raw_quantity) > 0 ? 'delta-positive' : 'delta-negative'"
                  >
                    {{ formatDelta(getDelta(item.raw, item.raw_quantity)) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Col 4: Cooked/Steamed/Grilled stock quantity -->
            <div class="bulk-item-current-col text-center tabular-nums">
              <span class="mobile-label"><i :class="getProductMethodIcon(item.name) + ' text-primary'" style="margin-right: 4px;"></i> คงเหลือ {{ getProductMethodLabel(item.name) }}</span>
              <span :class="{ 'text-danger': isItemLowStock(item, item.quantity) }" class="font-bold text-base">
                {{ item.quantity !== null && item.quantity !== undefined ? formatStockQty(item.quantity, item.uom) : formatStockQty(0, item.uom) }}
              </span>
            </div>

            <!-- Col 5: Cooked/Steamed/Grilled stock input -->
            <div class="bulk-item-input-col">
              <div class="bulk-input-wrapper">
                <span class="mobile-label"><i :class="getProductMethodIcon(item.name) + ' text-primary'" style="margin-right: 4px;"></i> ปรับยอด {{ getProductMethodLabel(item.name) }}</span>
                <div class="input-with-delta">
                  <input 
                    type="text" 
                    inputmode="decimal"
                    v-model="item.cooked"
                    :placeholder="item.quantity !== null && item.quantity !== undefined ? String(Math.round(item.quantity * 100) / 100) : '0'"
                    :aria-label="`ปรับยอดพร้อมขาย ${item.name}`"
                    class="form-input tabular-nums"
                    :class="{ 'input-changed': getDelta(item.cooked, item.quantity ?? 0) !== 0 }"
                  />
                  <span 
                    v-if="getDelta(item.cooked, item.quantity ?? 0) !== 0"
                    class="delta-pill tabular-nums"
                    :class="getDelta(item.cooked, item.quantity ?? 0) > 0 ? 'delta-positive' : 'delta-negative'"
                  >
                    {{ formatDelta(getDelta(item.cooked, item.quantity ?? 0)) }}
                  </span>
                </div>
                <div v-if="item.name.includes('แร็ปไก่') || isLinkedBun(item)" class="linkage-warning-text text-danger font-bold text-center">
                  {{ getLinkageWarningText(item) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Reason presets & Note -->
        <div class="absolute-reason-section mt-xl">
          <div class="form-group mb-0">
            <label class="form-label font-bold text-sm text-secondary mb-xs block">
              <i class="fa-solid fa-clipboard-check text-primary" style="margin-right: 4px;"></i> เหตุผลในการปรับยอดจริง *
            </label>
            <div class="reason-preset-group" role="radiogroup" aria-label="เหตุผลในการปรับยอดจริง">
              <button
                v-for="opt in reasonOptions"
                :key="opt.value"
                type="button"
                class="reason-preset-btn"
                :class="{ active: bulkReasonPreset === opt.value }"
                @click="bulkReasonPreset = opt.value"
              >
                <i :class="opt.icon"></i>
                <span>{{ opt.label }}</span>
              </button>
            </div>
          </div>
          <div class="form-group mb-0">
            <label for="bulk-note-menu" class="form-label font-bold text-sm text-secondary mb-xs block">
              <i class="fa-solid fa-pen-to-square text-primary" style="margin-right: 4px;"></i> คำอธิบายเพิ่มเติม (ถ้ามี)
            </label>
            <input 
              id="bulk-note-menu"
              type="text" 
              v-model="bulkNote" 
              placeholder="ระบุข้อความเพื่อบันทึกประวัติ..." 
              class="form-input"
            />
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-lg mt-xl bulk-action-buttons">
          <router-link to="/stock" class="btn-modal btn-modal-secondary flex-1">
            ยกเลิก
          </router-link>
          <button 
            class="btn-modal btn-modal-primary btn-bulk-save flex-1" 
            :disabled="isSaving"
            @click="handleSaveBulkAdjust"
          >
            <i v-if="isSaving" class="fa-solid fa-spinner fa-spin"></i>
            <i v-else class="fa-solid fa-floppy-disk"></i>
            {{ isSaving ? 'กำลังบันทึกข้อมูล...' : (changedCount > 0 ? `บันทึกการเปลี่ยนแปลง (${changedCount})` : 'บันทึก') }}
          </button>
        </div>
      </div>

      <!-- Form Grid/Table for Modifiers -->
      <div v-else-if="activeStockType === 'modifiers'" class="bulk-stock-table-container">
        <!-- Desktop Grid Header -->
        <div class="bulk-stock-header-row desktop-only" style="grid-template-columns: 2.2fr 1.2fr 1.2fr 1.2fr;">
          <div style="text-align: left; padding-left: var(--space-md);">ชื่อเครื่องปรุง / ซอส / ผงปรุงรส</div>
          <div class="text-center">ประเภท</div>
          <div class="text-center">คงเหลือปัจจุบัน</div>
          <div style="text-align: center;">จำนวนรอบเสิร์ฟเป้าหมาย *</div>
        </div>

        <!-- Scrollable content -->
        <div class="bulk-stock-rows-container">
          <div 
            v-for="item in filteredModifiers" 
            :key="item.modifier_id" 
            class="bulk-stock-row bulk-modifier-row"
            :class="{ 'is-modified': getDelta(item.value, item.total_servings) !== 0 }"
            style="grid-template-columns: 2.2fr 1.2fr 1.2fr 1.2fr;"
          >
            <!-- Col 1: Name & Mobile Badge -->
            <div class="bulk-item-name-col">
              <div class="flex flex-between align-center w-full gap-xs">
                <div class="font-bold text-base text-left item-name-text">{{ item.name }}</div>
                <span class="badge show-mobile-inline" :class="getModifierCategoryClass(item.category)" style="padding: 3px 8px; margin-left: auto;">
                  {{ getModifierCategoryLabel(item.category) }}
                </span>
              </div>
            </div>

            <!-- Col 2: Category Badge (Desktop Only) -->
            <div class="hide-mobile-flex align-center justify-center font-semibold">
              <span class="badge" :class="getModifierCategoryClass(item.category)">
                {{ getModifierCategoryLabel(item.category) }}
              </span>
            </div>

            <!-- Col 3: Current Stock (servings + bags) -->
            <div class="bulk-item-current-col text-center tabular-nums">
              <span class="mobile-label">คงเหลือ</span>
              <span class="font-bold text-base">
                {{ formatModifierStockShort(item) }}
              </span>
            </div>

            <!-- Col 4: Input value -->
            <div class="bulk-item-input-col">
              <div class="bulk-input-wrapper">
                <span class="mobile-label">รอบเสิร์ฟ</span>
                <div class="input-with-delta">
                  <input 
                    type="text" 
                    inputmode="decimal"
                    v-model="item.value"
                    :placeholder="String(Math.round(item.total_servings * 100) / 100)"
                    :aria-label="`ปรับยอดรอบเสิร์ฟ ${item.name}`"
                    class="form-input tabular-nums"
                    :class="{ 'input-changed': getDelta(item.value, item.total_servings) !== 0 }"
                  />
                  <span 
                    v-if="getDelta(item.value, item.total_servings) !== 0"
                    class="delta-pill tabular-nums"
                    :class="getDelta(item.value, item.total_servings) > 0 ? 'delta-positive' : 'delta-negative'"
                  >
                    {{ formatDelta(getDelta(item.value, item.total_servings)) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Reason presets & Note -->
        <div class="absolute-reason-section mt-xl">
          <div class="form-group mb-0">
            <label class="form-label font-bold text-sm text-secondary mb-xs block">
              <i class="fa-solid fa-clipboard-check text-primary" style="margin-right: 4px;"></i> เหตุผลในการปรับยอดจริง *
            </label>
            <div class="reason-preset-group" role="radiogroup" aria-label="เหตุผลในการปรับยอดจริง">
              <button
                v-for="opt in reasonOptions"
                :key="opt.value"
                type="button"
                class="reason-preset-btn"
                :class="{ active: bulkReasonPreset === opt.value }"
                @click="bulkReasonPreset = opt.value"
              >
                <i :class="opt.icon"></i>
                <span>{{ opt.label }}</span>
              </button>
            </div>
          </div>
          <div class="form-group mb-0">
            <label for="bulk-note-mod" class="form-label font-bold text-sm text-secondary mb-xs block">
              <i class="fa-solid fa-pen-to-square text-primary" style="margin-right: 4px;"></i> คำอธิบายเพิ่มเติม (ถ้ามี)
            </label>
            <input 
              id="bulk-note-mod"
              type="text" 
              v-model="bulkNote" 
              placeholder="ระบุข้อความเพื่อบันทึกประวัติ..." 
              class="form-input"
            />
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-lg mt-xl bulk-action-buttons">
          <router-link to="/stock" class="btn-modal btn-modal-secondary flex-1">
            ยกเลิก
          </router-link>
          <button 
            class="btn-modal btn-modal-primary btn-bulk-save flex-1" 
            :disabled="isSaving"
            @click="handleSaveBulkAdjust"
          >
            <i v-if="isSaving" class="fa-solid fa-spinner fa-spin"></i>
            <i v-else class="fa-solid fa-floppy-disk"></i>
            {{ isSaving ? 'กำลังบันทึกข้อมูล...' : (changedCount > 0 ? `บันทึกการเปลี่ยนแปลง (${changedCount})` : 'บันทึก') }}
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
const isSaving = ref(false);
const activeStockType = ref('menu_items'); // 'menu_items' or 'modifiers'
const searchQuery = ref('');
const bulkFormItems = ref([]);
const bulkModifiersFormItems = ref([]);
const bulkReasonPreset = ref('นับยอดขาด/เกิน');
const bulkNote = ref('');
const lowStockThreshold = computed(() => store.lowStockThreshold);

const round2 = (n) => Math.round(Number(n) * 100) / 100;

const getDelta = (inputVal, currentVal) => {
  if (inputVal === '' || inputVal === null || inputVal === undefined) return 0;
  const parsed = Number(String(inputVal).trim());
  if (isNaN(parsed)) return 0;
  return round2(parsed - round2(currentVal ?? 0));
};

const formatDelta = (delta) => (delta > 0 ? `+${delta}` : String(delta));

const isMenuItemModified = (item) => {
  const cookedChanged = getDelta(item.cooked, item.quantity ?? 0) !== 0;
  const rawChanged = item.raw_quantity !== null && item.raw_quantity !== undefined && getDelta(item.raw, item.raw_quantity) !== 0;
  return cookedChanged || rawChanged;
};

const filteredMenuItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return bulkFormItems.value;
  return bulkFormItems.value.filter(i => i.name.toLowerCase().includes(q));
});

const filteredModifiers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return bulkModifiersFormItems.value;
  return bulkModifiersFormItems.value.filter(i => i.name.toLowerCase().includes(q));
});

const changedCount = computed(() => {
  if (activeStockType.value === 'menu_items') {
    return bulkFormItems.value.filter(isMenuItemModified).length;
  }
  return bulkModifiersFormItems.value.filter(m => getDelta(m.value, m.total_servings) !== 0).length;
});

const formatStockQty = (qty, uom) => {
  if (qty === null || qty === undefined) return '';
  const roundedQty = round2(qty);
  const formatted = roundedQty.toLocaleString('th-TH', { maximumFractionDigits: 2 });
  if (uom === 'กรัม') {
    return `${formatted} ก.`;
  }
  return `${formatted} ${uom || 'ชิ้น'}`;
};

const isItemLowStock = (item, qty) => {
  if (qty === null || qty === undefined) return false;
  if (qty <= 0) return false;
  if (item.low_stock_threshold !== null && item.low_stock_threshold !== undefined) {
    return qty <= Number(item.low_stock_threshold);
  }
  if (item.uom === 'กรัม') {
    return qty <= 500;
  }
  return qty <= lowStockThreshold.value;
};

const getSteamedCounterpartName = (name) => {
  if (!name) return '';
  if (name.startsWith('เปาทอด') || name.startsWith('เปาปิ้ง')) {
    if (name.includes('หมูไข่เค็ม') || name.includes('หมูสับไขเค็ม') || name.includes('หมูสับ ไข่เค็ม')) {
      return 'ซาลาเปาไส้หมูสับ ไข่เค็ม';
    }
    if (name.includes('หมู')) {
      return 'ซาลาเปาไส้หมูสับ';
    }
    if (name.includes('ถั่วดำ')) {
      return 'ซาลาเปาไส้ถั่วดำ';
    }
    if (name.includes('ครีม')) {
      return 'ซาลาเปาไส้ครีม';
    }
    if (name.includes('หมั่นโถ')) {
      return 'หมั่นโถว';
    }
  }
  return '';
};

const isLinkedBun = (item) => {
  if (!item || !item.name) return false;
  return !!getSteamedCounterpartName(item.name);
};

const getLinkageWarningText = (item) => {
  if (!item || !item.name) return '';
  let isDeduct = true;
  const val = Number(item.cooked);
  if (!isNaN(val) && item.cooked !== '' && item.cooked !== null && item.cooked !== undefined) {
    const current = item.quantity || 0;
    if (val < current) {
      isDeduct = false;
    }
  }

  const isWrap = item.name.includes('แร็ปไก่');
  const targetName = isWrap ? 'ไก่ไร้กระดูก' : getSteamedCounterpartName(item.name);
  if (!targetName) return '';

  const ratioText = isWrap ? ' 1.5 ชิ้น' : '';
  return isDeduct 
    ? `⚠️ หัก "${targetName}"${ratioText} อัตโนมัติ (ไม่ต้องลดซ้ำ)`
    : `ℹ️ คืน "${targetName}"${ratioText} อัตโนมัติ`;
};

const getProductMethodLabel = (name) => {
  if (!name) return 'ของทอด';
  const isWrapped = name.includes('ข้าวเหนียว') || 
                    name.includes('เบอร์เกอร์') || 
                    name.includes('แร็ป');
  if (isWrapped) {
    return 'ของห่อ';
  }
  const isBunOrDumpling = name.includes('เปา') || 
                          name.includes('หมั่นโถ') || 
                          name.includes('ขนมจีบ');
  if (isBunOrDumpling) {
    if (name.includes('ทอด')) return 'ของทอด';
    if (name.includes('ปิ้ง')) return 'ของปิ้ง';
    return 'ของนึ่ง';
  }
  return 'ของทอด';
};

const getProductMethodIcon = (name) => {
  if (!name) return 'fa-solid fa-fire';
  const isWrapped = name.includes('ข้าวเหนียว') || 
                    name.includes('เบอร์เกอร์') || 
                    name.includes('แร็ป');
  if (isWrapped) {
    return 'fa-solid fa-box';
  }
  const isBunOrDumpling = name.includes('เปา') || 
                          name.includes('หมั่นโถ') || 
                          name.includes('ขนมจีบ');
  if (isBunOrDumpling) {
    if (name.includes('ทอด')) return 'fa-solid fa-fire';
    if (name.includes('ปิ้ง')) return 'fa-solid fa-fire-flame-simple';
    return 'fa-solid fa-cloud';
  }
  return 'fa-solid fa-fire';
};

const showHintTooltip = ref(false);
const reasonOptions = [
  { value: 'นับยอดขาด/เกิน', label: 'นับยอดขาด/เกิน', icon: 'fa-solid fa-chart-simple' },
  { value: 'กรอกผิด', label: 'กรอกผิด (แก้ไขยอด)', icon: 'fa-solid fa-pen-to-square' },
  { value: 'อื่นๆ', label: 'อื่นๆ', icon: 'fa-solid fa-circle-question' }
];
const closeReasonDropdown = () => {
  showHintTooltip.value = false;
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
    return `${round2(item.total_servings)} ซอง`;
  }
  const servingsPerBag = item.servings_per_bag || 50;
  const bags = Math.floor(item.total_servings / servingsPerBag);
  const servings = round2(item.total_servings % servingsPerBag);
  
  let text = '';
  if (bags > 0) text += `${bags} ถุง`;
  if (servings > 0 || bags === 0) {
    if (text) text += ' ';
    text += `${servings} รอบ`;
  }
  return text;
};

const initializeForm = () => {
  bulkFormItems.value = stockItems.value.map(item => ({
    menu_item_id: item.id,
    name: item.name,
    quantity: item.quantity,
    raw_quantity: item.raw_quantity,
    uom: item.uom,
    cooked: item.quantity !== null && item.quantity !== undefined ? round2(item.quantity) : 0,
    raw: item.raw_quantity !== null && item.raw_quantity !== undefined ? round2(item.raw_quantity) : 0
  }));
  initializeModifiersForm();
};

const initializeModifiersForm = () => {
  bulkModifiersFormItems.value = store.modifiers.map(item => ({
    modifier_id: item.id,
    name: item.name,
    category: item.category,
    servings_per_bag: item.servings_per_bag || 50,
    total_servings: item.total_servings || 0,
    value: item.total_servings !== null && item.total_servings !== undefined ? round2(item.total_servings) : 0
  }));
};

const resetAllChanges = () => {
  initializeForm();
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

const handleSaveBulkAdjust = async () => {
  if (isSaving.value) return;
  isSaving.value = true;
  ui.showLoading();
  try {
    if (activeStockType.value === 'menu_items') {
      const itemsToSend = [];
      
      for (const item of bulkFormItems.value) {
        const cookedVal = item.cooked !== null && item.cooked !== undefined && String(item.cooked).trim() !== '' ? String(item.cooked).trim() : null;
        const rawVal = item.raw !== null && item.raw !== undefined && String(item.raw).trim() !== '' ? String(item.raw).trim() : null;
        
        const parsedCooked = cookedVal !== null ? Number(cookedVal) : null;
        const parsedRaw = rawVal !== null ? Number(rawVal) : null;
        
        const currentCooked = item.quantity !== null && item.quantity !== undefined ? round2(item.quantity) : 0;
        const currentRaw = item.raw_quantity !== null && item.raw_quantity !== undefined ? round2(item.raw_quantity) : 0;
        
        const targetCooked = parsedCooked !== null && !isNaN(parsedCooked) ? round2(parsedCooked) : currentCooked;
        const targetRaw = parsedRaw !== null && !isNaN(parsedRaw) ? round2(parsedRaw) : currentRaw;
        
        if (targetCooked !== currentCooked || (item.raw_quantity !== null && item.raw_quantity !== undefined && targetRaw !== currentRaw)) {
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
        isSaving.value = false;
        return;
      }
      
      const payload = {
        mode: 'absolute',
        items: itemsToSend,
        reason_preset: bulkReasonPreset.value,
        note: bulkNote.value.trim()
      };
      
      const res = await api.stock.bulkAdjust(payload);
      if (res && res.success) {
        if (res.updatedItems && Array.isArray(res.updatedItems)) {
          res.updatedItems.forEach(item => {
            store.updateStock(item.id, item.stock, item.raw_stock);
          });
        }
        store.clearMenuCache();
        store.clearStockCache();
        ui.showToast('ปรับปรุงสต็อกสินค้าเรียบร้อยแล้ว', 'success');
        router.push('/stock');
      }
    } else {
      const itemsToSend = [];
      
      for (const item of bulkModifiersFormItems.value) {
        const inputVal = item.value !== null && item.value !== undefined && String(item.value).trim() !== '' ? String(item.value).trim() : null;
        const parsedVal = inputVal !== null ? Number(inputVal) : null;
        const currentVal = round2(item.total_servings);
        const targetVal = parsedVal !== null && !isNaN(parsedVal) ? round2(parsedVal) : currentVal;
        
        if (targetVal !== currentVal) {
          itemsToSend.push({
            modifier_id: item.modifier_id,
            servings: parsedVal
          });
        }
      }
      
      if (itemsToSend.length === 0) {
        ui.showToast('ไม่มีรายการเครื่องปรุงใดที่มีความเปลี่ยนแปลง', 'info');
        ui.hideLoading();
        isSaving.value = false;
        return;
      }
      
      const payload = {
        mode: 'absolute',
        items: itemsToSend,
        reason_preset: bulkReasonPreset.value,
        note: bulkNote.value.trim()
      };
      
      const res = await api.modifiers.bulkAdjust(payload);
      if (res && res.success) {
        if (res.updatedModifiers && Array.isArray(res.updatedModifiers)) {
          res.updatedModifiers.forEach(m => {
            const idx = store.modifiers.findIndex(x => x.id === m.id);
            if (idx !== -1) {
              store.modifiers[idx].total_servings = m.total_servings;
            }
          });
        }
        store.clearModifiersCache();
        ui.showToast('ปรับปรุงสต็อกเครื่องปรุงเรียบร้อยแล้ว', 'success');
        router.push('/stock');
      }
    }
  } catch (e) {
    console.error(e);
    ui.showToast(e.message || 'ปรับปรุงสต็อกด่วนล้มเหลว กรุณาตรวจสอบสัญญาณเน็ตแล้วกดบันทึกใหม่อีกครั้ง', 'error');
  } finally {
    isSaving.value = false;
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
.stock-page-title {
  margin: 0;
  font-size: var(--font-lg);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

.tabular-nums {
  font-variant-numeric: tabular-nums;
}

.title-tooltip-wrapper {
  position: relative;
  display: inline-flex;
  align-items: flex-start;
  gap: 6px;
}

.title-info-btn {
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 2px;
  font-size: var(--font-sm);
  line-height: 1;
  margin-top: -2px;
  border-radius: var(--radius-full);
  touch-action: manipulation;
  transition: color var(--transition-fast);
}

.title-info-btn:hover,
.title-info-btn:focus-visible {
  color: var(--primary);
  outline: none;
}

.title-tooltip-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 30;
  width: min(320px, 82vw);
  padding: var(--space-sm) var(--space-md);
  background: var(--card-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  font-size: var(--font-xs);
  line-height: 1.45;
}

.input-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  color: var(--text-tertiary);
  pointer-events: none;
}

.bulk-search-input {
  padding-left: 36px;
  padding-right: 34px;
  min-height: 44px;
}

.clear-search-btn {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: manipulation;
}

.clear-search-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: var(--text-primary);
}

.btn-bulk-back,
.btn-bulk-header-save {
  height: 44px !important;
  min-width: 132px;
  padding: 0 var(--space-lg) !important;
  border-radius: var(--radius-md) !important;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: var(--font-base) !important;
  font-weight: var(--font-weight-semibold);
  box-sizing: border-box;
  touch-action: manipulation;
}

.btn-bulk-save {
  min-height: 44px;
  touch-action: manipulation;
}

.bulk-action-buttons {
  display: flex;
  gap: var(--space-lg);
  justify-content: flex-end;
  width: 100%;
}

.bulk-stock-table-container {
  display: flex;
  flex-direction: column;
}

.bulk-stock-header-row {
  display: grid;
  grid-template-columns: 2fr 1.1fr 1.3fr 1.1fr 1.3fr;
  padding: var(--space-md);
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid var(--border-color);
  border-bottom: 2px solid var(--border-color);
  font-size: var(--font-sm);
  font-weight: var(--font-weight-bold);
  color: var(--text-secondary);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}

.bulk-stock-rows-container {
  max-height: 55vh;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-top: none;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  background: var(--card-bg);
}

.bulk-stock-row {
  display: grid;
  grid-template-columns: 2fr 1.1fr 1.3fr 1.1fr 1.3fr;
  align-items: center;
  padding: var(--space-md);
  border-bottom: 1px solid var(--border-color);
  gap: var(--space-md);
  position: relative;
  transition: background-color var(--transition-fast);
}

@media (hover: hover) {
  .bulk-stock-row:hover {
    background: rgba(139, 3, 19, 0.015);
  }
}

.bulk-stock-row.is-modified {
  background: rgba(139, 3, 19, 0.035);
  box-shadow: inset 3px 0 0 var(--primary);
}

.bulk-stock-row.has-linkage-warning {
  padding-bottom: 30px !important;
}

.linkage-warning-text {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  line-height: 1.2;
  font-size: var(--font-xxs) !important;
  font-weight: var(--font-weight-bold);
  text-align: center;
  color: var(--danger) !important;
  white-space: normal;
  pointer-events: none;
}

.bulk-stock-row:last-child {
  border-bottom: none;
}

.bulk-item-name-col {
  text-align: left;
  padding-left: var(--space-sm);
  min-width: 0;
}

.item-name-text {
  word-break: break-word;
}

.bulk-item-current-col {
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
}

.bulk-input-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
}

.input-with-delta {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.bulk-input-wrapper input {
  min-height: 44px;
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--font-base);
  font-weight: var(--font-weight-semibold);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-primary);
  text-align: center;
  width: 100%;
  touch-action: manipulation;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.bulk-input-wrapper input:focus-visible {
  border-color: var(--border-color-focus);
  box-shadow: 0 0 0 3px var(--accent-glow);
  outline: none;
}

.bulk-input-wrapper input.input-changed {
  border-color: var(--primary);
  background: var(--card-bg);
}

.bulk-input-wrapper input.disabled-input {
  background: rgba(0, 0, 0, 0.04) !important;
  color: var(--text-tertiary) !important;
  cursor: not-allowed !important;
  opacity: 0.65 !important;
}

.delta-pill {
  position: absolute;
  right: 6px;
  font-size: var(--font-xxs);
  font-weight: var(--font-weight-bold);
  padding: 2px 6px;
  border-radius: var(--radius-full);
  pointer-events: none;
}

.delta-positive {
  background: rgba(22, 163, 74, 0.14);
  color: var(--success);
}

.delta-negative {
  background: rgba(220, 38, 38, 0.14);
  color: var(--danger);
}

.mobile-label {
  display: none;
}

.absolute-reason-section {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: var(--space-lg);
  padding: var(--space-lg);
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  text-align: left;
  align-items: start;
}

.reason-preset-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.reason-preset-btn {
  min-height: 44px;
  padding: 0 var(--space-md);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-secondary);
  font-size: var(--font-sm);
  font-weight: var(--font-weight-medium);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  touch-action: manipulation;
  transition: border-color var(--transition-fast), background-color var(--transition-fast), color var(--transition-fast);
}

.reason-preset-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.reason-preset-btn.active {
  border-color: var(--primary);
  background: rgba(139, 3, 19, 0.08);
  color: var(--primary);
  font-weight: var(--font-weight-semibold);
}

.reason-preset-btn:focus-visible {
  outline: 2px solid var(--border-color-focus);
  outline-offset: 2px;
}

.absolute-reason-section .form-input {
  min-height: 44px;
  font-size: var(--font-base);
  width: 100%;
}

/* Responsive Styles */
@media (max-width: 992px) {
  .desktop-only {
    display: none !important;
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
    margin-bottom: var(--space-md);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-sm);
  }
  
  .bulk-item-name-col {
    grid-column: span 2;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: var(--space-sm);
    padding-left: 0;
  }
  
  /* Arrange Menu Items Raw and Cooked into two parallel columns on mobile */
  .bulk-stock-row:not(.bulk-modifier-row) > div:nth-child(2) { grid-column: 1; grid-row: 2; }
  .bulk-stock-row:not(.bulk-modifier-row) > div:nth-child(3) { grid-column: 1; grid-row: 3; }
  .bulk-stock-row:not(.bulk-modifier-row) > div:nth-child(4) { grid-column: 2; grid-row: 2; }
  .bulk-stock-row:not(.bulk-modifier-row) > div:nth-child(5) { grid-column: 2; grid-row: 3; }

  /* Arrange Modifiers Row on mobile */
  .bulk-modifier-row > div:nth-child(3) { grid-column: 1; grid-row: 2; }
  .bulk-modifier-row > div:nth-child(4) { grid-column: 2; grid-row: 2; width: 100%; }

  .bulk-item-current-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center !important;
    background: rgba(139, 3, 19, 0.025);
    border: 1px dashed var(--border-color);
    border-radius: var(--radius-sm);
    padding: var(--space-sm) var(--space-xs);
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

  .mobile-label {
    display: block !important;
    font-size: var(--font-xs);
    font-weight: var(--font-weight-bold);
    color: var(--text-secondary);
    margin-bottom: var(--space-xs);
    text-align: center;
  }

  .bulk-main-card {
    padding: var(--space-sm) 0 !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }
}

@media (min-width: 769px) {
  .mobile-stock-header-card {
    padding: var(--space-xl) !important;
  }
  .btn-bulk-back,
  .btn-bulk-header-save {
    height: auto !important;
    padding: var(--space-md) var(--space-xl) !important;
  }
}

@media (max-width: 768px) {
  .title-tooltip-wrapper {
    width: 100%;
    justify-content: center;
  }

  .title-tooltip-popover {
    left: 50%;
    transform: translateX(-50%);
  }

  .mobile-header-actions {
    width: 100%;
  }

  .btn-bulk-back,
  .btn-bulk-header-save {
    flex: 1;
    justify-content: center;
  }

  .absolute-reason-section {
    grid-template-columns: 1fr;
    gap: var(--space-md);
    padding: var(--space-md);
  }

  .bulk-action-buttons {
    gap: var(--space-md);
  }
}
</style>
