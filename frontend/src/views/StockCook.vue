<template>
  <div id="stock-cook-page" class="page-enter">
    
    <!-- Info Header Card (Matches Stock.vue styling & layout) -->
    <div class="card mb-lg p-md flex flex-between align-center mobile-stock-header-card" style="gap: var(--space-md); flex-wrap: wrap;">
      <div class="stock-page-title">
        ปรุงอาหาร
      </div>
      <div class="flex align-center gap-xs flex-wrap mobile-header-actions">
        <router-link to="/stock" class="btn btn-primary btn-bulk-back">
          <i class="fa-solid fa-arrow-left"></i> ย้อนกลับ
        </router-link>
        <button 
          v-if="hasPendingCooks"
          class="btn btn-primary btn-cook-save-all"
          :disabled="isSaving"
          @click="openBatchCookModal"
        >
          <i v-if="isSaving" class="fa-solid fa-spinner fa-spin"></i>
          <i v-else class="fa-solid fa-fire-flame-curved"></i>
          <span class="btn-text">ปรุงทั้งหมด ({{ pendingCookCount }})</span>
        </button>
      </div>
    </div>

    <!-- Description & Tips Banner (Solid White Card) -->
    <div class="card p-md mb-lg cook-hint-box">
      <span class="hint-icon"><i class="fa-solid fa-lightbulb"></i></span>
      <div class="hint-text">
        <strong>จุดปรุงอาหาร:</strong> บันทึกปรุง ทอด ห่อ หรือปิ้ง ระบบจะตัดสต็อกวัตถุดิบและเพิ่มสินค้าพร้อมขายให้อัตโนมัติ
      </div>
    </div>

    <!-- Search & Filter Controls (Solid White Card) -->
    <div class="card p-md mb-lg cook-filter-card">
      <div class="cook-filter-row flex flex-between align-center gap-md flex-wrap">
        <div class="search-box flex-1">
          <div class="input-icon-wrapper">
            <i class="fa-solid fa-magnifying-glass input-icon"></i>
            <input 
              type="text" 
              v-model="searchQuery" 
              class="form-input" 
              placeholder="ค้นหาชื่อสินค้าที่ต้องปรุง..." 
              style="padding-left: 36px;"
            />
            <button 
              v-if="searchQuery" 
              class="clear-search-btn" 
              @click="searchQuery = ''"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Toggle: Only with Raw Stock (Stable size, no text or width jumping) -->
        <button 
          class="btn btn-raw-toggle"
          :class="{ 'btn-primary': onlyWithRawStock, 'btn-secondary-rect': !onlyWithRawStock }"
          @click="onlyWithRawStock = !onlyWithRawStock"
          title="สลับการแสดงผลเฉพาะสินค้าที่มีวัตถุดิบพร้อมปรุง"
        >
          <i :class="onlyWithRawStock ? 'fa-solid fa-check-circle' : 'fa-regular fa-circle'" style="margin-right: 6px;"></i>
          <span>เฉพาะที่มีของสด ({{ itemsWithRawCount }})</span>
        </button>
      </div>

      <!-- Quick Category Filter Pills -->
      <div class="flex align-center gap-xs flex-wrap cook-filter-pills mt-md">
        <button 
          v-for="cat in filterCategories" 
          :key="cat.id" 
          class="btn btn-secondary pill-btn"
          :class="{ 'active': activeCategory === cat.id }"
          @click="activeCategory = cat.id"
        >
          <i :class="cat.icon" style="margin-right: 4px;"></i> {{ cat.label }}
        </button>
      </div>
    </div>

    <!-- Content Area: Cookable Items -->
    <div v-if="loading" class="cook-items-grid">
      <div v-for="n in 6" :key="'sk-cook-' + n" class="card p-md cook-item-card-skeleton">
        <div class="flex flex-between align-center mb-md">
          <div class="skeleton" style="height: 20px; width: 60%; border-radius: 4px;"></div>
          <div class="skeleton" style="height: 20px; width: 50px; border-radius: 12px;"></div>
        </div>
        <div class="flex gap-md mb-md">
          <div class="skeleton flex-1" style="height: 48px; border-radius: 6px;"></div>
          <div class="skeleton flex-1" style="height: 48px; border-radius: 6px;"></div>
        </div>
        <div class="skeleton" style="height: 38px; width: 100%; border-radius: 8px;"></div>
      </div>
    </div>

    <div v-else-if="filteredItems.length === 0" class="card text-center p-3xl cook-empty-card">
      <i class="fa-solid fa-utensils mb-md empty-icon"></i>
      <div class="font-bold text-lg mb-xs">ไม่พบรายการที่ต้องปรุง</div>
      <div class="text-sm text-secondary mb-md">
        {{ onlyWithRawStock ? 'ไม่มีสินค้าที่มีวัตถุดิบคงเหลือในขณะนี้' : 'ไม่มีรายการสินค้าที่ตรงกับเงื่อนไขการค้นหา' }}
      </div>
      <button 
        v-if="onlyWithRawStock && itemsWithRawCount === 0" 
        class="btn btn-secondary mx-auto"
        @click="onlyWithRawStock = false"
      >
        <i class="fa-solid fa-eye"></i> ดูสินค้าที่ต้องปรุงทั้งหมด
      </button>
    </div>

    <div v-else class="cook-items-grid">
      <div 
        v-for="item in filteredItems" 
        :key="item.id" 
        class="card cook-item-card"
        :class="{ 'has-input': cookInputs[item.id] > 0, 'raw-empty': getAvailableRaw(item) <= 0 }"
      >
        <!-- Card Header: Title & Cook Badge, plus red clear text at top-right -->
        <div class="cook-item-header flex flex-between align-start gap-sm">
          <div class="cook-item-title-group">
            <h3 class="cook-item-name font-bold">{{ item.name }}</h3>
            <div class="flex align-center gap-xs flex-wrap mt-2xs">
              <span class="cook-action-badge">
                <i :class="getCookActionIcon(item.name)"></i> {{ getCookActionLabel(item.name) }}
              </span>
              <span v-if="getItemCardHint(item)" class="cook-link-hint-pill">
                <i class="fa-solid fa-link"></i> {{ getItemCardHint(item) }}
              </span>
            </div>
          </div>

          <!-- Clear text link at top-right corner matching POS screen -->
          <button 
            v-if="cookInputs[item.id]" 
            class="btn-item-clear-link text-danger"
            @click="cookInputs[item.id] = ''"
            title="ล้างจำนวนที่ระบุ"
          >
            ล้าง
          </button>
        </div>

        <!-- Stock Status Split Display (Solid White background boxes) -->
        <div class="cook-stock-split-grid mt-sm mb-md">
          <!-- Raw / Source Stock -->
          <div class="cook-stock-box raw-box" :class="{ 'warning': isItemLowStock(item, getAvailableRaw(item)), 'danger': getAvailableRaw(item) <= 0 }">
            <span class="stock-box-label">{{ getSourceLabel(item) }}</span>
            <span class="stock-box-value">{{ formatStockQty(getAvailableRaw(item), item.uom) }}</span>
            <span v-if="getAvailableRaw(item) <= 0" class="stock-box-status text-danger font-bold">
              <i class="fa-solid fa-circle-xmark"></i> วัตถุดิบหมด
            </span>
            <span v-else-if="isItemLowStock(item, getAvailableRaw(item))" class="stock-box-status text-warning">
              <i class="fa-solid fa-triangle-exclamation"></i> ใกล้หมด
            </span>
          </div>

          <!-- Cooked / Ready Stock -->
          <div class="cook-stock-box cooked-box">
            <span class="stock-box-label">ปรุงเสร็จ/พร้อมขาย</span>
            <span class="stock-box-value">{{ formatStockQty(item.quantity, item.uom) }}</span>
            <span v-if="(item.quantity || 0) <= 0" class="stock-box-status text-danger">
              <i class="fa-solid fa-circle-exclamation"></i> หน้าร้านหมด
            </span>
            <span v-else class="stock-box-status text-success">
              <i class="fa-solid fa-circle-check"></i> พร้อมขาย
            </span>
          </div>
        </div>

        <!-- Cook Input Controls -->
        <div class="cook-action-container">
          <!-- Presets -->
          <div class="cook-presets-bar flex gap-xs mb-xs flex-wrap">
            <button 
              v-for="preset in [1, 5, 10, 20]" 
              :key="preset"
              class="btn-preset-qty"
              :disabled="getAvailableRaw(item) <= 0"
              @click="addPreset(item, preset)"
            >
              +{{ preset }}
            </button>
            <button 
              class="btn-preset-qty btn-preset-all"
              :disabled="getAvailableRaw(item) <= 0"
              @click="setAllRaw(item)"
            >
              ทั้งหมด ({{ getAvailableRaw(item) }})
            </button>
          </div>

          <!-- Input field row -->
          <div class="cook-input-row mb-xs">
            <div class="cook-input-wrapper w-full">
              <input 
                type="number" 
                class="form-input cook-number-input" 
                v-model.number="cookInputs[item.id]"
                placeholder="ระบุจำนวน..."
                min="1"
                :max="getAvailableRaw(item)"
                :disabled="getAvailableRaw(item) <= 0 || isSaving"
              />
              <span class="cook-input-unit">{{ item.uom || 'ชิ้น' }}</span>
            </div>
          </div>

          <!-- Cook button: Separate full-width row for big, easy tapping -->
          <button 
            class="btn btn-primary btn-cook-submit w-full"
            :disabled="!canCookItem(item)"
            @click="openSingleCookModal(item)"
          >
            <i :class="getCookActionIcon(item.name)"></i>
            <span>{{ getCookActionLabel(item.name) }}{{ cookInputs[item.id] ? ` ${cookInputs[item.id]} ${item.uom || 'ชิ้น'}` : '' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Floating Batch Action Bar (Safely elevated above mobile bottom menu) -->
    <transition name="slide-up">
      <div v-if="hasPendingCooks" class="cook-floating-batch-bar card">
        <!-- Top row: Info on left, Red text 'ล้างทั้งหมด' on right -->
        <div class="floating-batch-header flex flex-between align-center mb-xs">
          <div class="floating-batch-info flex align-center gap-xs">
            <i class="fa-solid fa-fire-burner floating-batch-icon"></i>
            <span class="font-bold text-sm">รอการปรุง {{ pendingCookCount }} เมนู</span>
            <span class="text-xs text-muted">({{ pendingTotalQty }} {{ defaultUom }})</span>
          </div>
          <!-- Red text link 'ล้างทั้งหมด' matching POS cart style -->
          <button 
            class="btn-batch-clear-link text-danger" 
            @click="clearAllInputs"
            :disabled="isSaving"
          >
            ล้างทั้งหมด
          </button>
        </div>

        <!-- Bottom row: 100% full width cook button -->
        <button 
          class="btn btn-primary btn-save-batch-full w-full" 
          :disabled="isSaving"
          @click="openBatchCookModal"
        >
          <i v-if="isSaving" class="fa-solid fa-spinner fa-spin"></i>
          <i v-else class="fa-solid fa-check"></i>
          ยืนยันปรุงทั้งหมด ({{ pendingTotalQty }} {{ defaultUom }})
        </button>
      </div>
    </transition>

    <!-- Standard Global CSS Modal: Red Header with White Text and White Circular Close Button -->
    <div v-if="showModal" class="modal-container active flex align-center justify-center">
      <div class="modal-overlay" @click="closeModal"></div>
      <div class="modal-content modal-center w-full max-w-md cook-white-modal" style="position:relative; z-index:2002; background: #ffffff !important; overflow: hidden;">
        
        <!-- Standard Red Header matching global CSS -->
        <div class="modal-header">
          <h3>
            <i :class="modalMode === 'batch' ? 'fa-solid fa-fire-flame-curved' : getCookActionIcon(activeModalItem?.name)"></i>
            <span>{{ modalMode === 'batch' ? 'ยืนยันการปรุงทั้งหมด' : `ยืนยัน${getCookActionLabel(activeModalItem?.name)}สินค้า` }}</span>
          </h3>
          <button class="modal-close" @click="closeModal">✕</button>
        </div>

        <div class="modal-body p-md" style="background: #ffffff !important;">
          <!-- Single Item Mode -->
          <div v-if="modalMode === 'single' && activeModalItem">
            <div class="card p-md mb-md text-center modal-preview-card" style="background: #ffffff !important; border: 1px solid var(--border-color);">
              <div class="font-bold text-lg mb-xs">{{ activeModalItem.name }}</div>
              <div class="text-sm text-secondary">
                ต้องการ{{ getCookActionLabel(activeModalItem.name) }}จำนวน
                <strong class="text-primary text-xl" style="font-variant-numeric: tabular-nums;">
                  {{ modalQuantity }} {{ activeModalItem.uom || 'ชิ้น' }}
                </strong>
              </div>
            </div>

            <!-- Stock Shift Preview -->
            <div class="modal-stock-preview-grid mb-md">
              <div class="modal-preview-box">
                <span class="preview-title">{{ getSourceLabel(activeModalItem) }}</span>
                <span class="preview-shift">
                  {{ getAvailableRaw(activeModalItem) }} ➔ 
                  <strong class="text-danger">{{ getAvailableRaw(activeModalItem) - modalQuantity }}</strong>
                </span>
              </div>
              <div class="modal-preview-box">
                <span class="preview-title">พร้อมขาย</span>
                <span class="preview-shift">
                  {{ activeModalItem.quantity }} ➔ 
                  <strong class="text-success">{{ (activeModalItem.quantity || 0) + modalQuantity }}</strong>
                </span>
              </div>
            </div>

            <!-- Linkage Deduction Hint in Confirmation Modal (Requested by user) -->
            <div v-if="getLinkageDeductionNotice(activeModalItem, modalQuantity)" class="mb-md flex align-center gap-sm" style="background: rgba(139, 3, 19, 0.04); border-left: 3px solid var(--primary); border-radius: var(--radius-md); border: 1px solid rgba(139, 3, 19, 0.08); padding: 12px 16px; font-size: var(--font-xs); color: var(--text-secondary); line-height: 1.5;">
              <i class="fa-solid fa-circle-info text-primary" style="flex-shrink:0; font-size: 14px;"></i>
              <span>{{ getLinkageDeductionNotice(activeModalItem, modalQuantity) }}</span>
            </div>

            <!-- Note Input -->
            <div class="form-group mb-md">
              <label class="form-label font-bold text-sm">บันทึกช่วยจำ (ไม่บังคับ)</label>
              <input 
                type="text" 
                class="form-input" 
                v-model="modalNote" 
                placeholder="เช่น ปรุงรอบเช้า, เติมช่วงเร่งด่วน..." 
              />
            </div>
          </div>

          <!-- Batch Mode: Highly Readable Structured Table -->
          <div v-else-if="modalMode === 'batch'">
            <!-- Summary Banner -->
            <div class="batch-summary-header flex flex-between align-center mb-md" style="background: rgba(139, 3, 19, 0.04); border-radius: var(--radius-md); border: 1px solid rgba(139, 3, 19, 0.12); padding: 14px 18px;">
              <div>
                <div class="text-xs text-muted mb-xs">จำนวนรายการที่เลือก</div>
                <div class="font-bold text-base text-primary">{{ pendingCookCount }} เมนู</div>
              </div>
              <div style="text-align: right;">
                <div class="text-xs text-muted mb-xs">ยอดรวมทั้งหมด</div>
                <div class="font-bold text-xl text-primary" style="font-variant-numeric: tabular-nums;">
                  {{ pendingTotalQty }} <span class="text-sm font-normal">{{ defaultUom }}</span>
                </div>
              </div>
            </div>

            <!-- Clean Structured Table -->
            <div class="batch-table-container mb-md" style="border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; max-height: 240px; overflow-y: auto;">
              <table class="w-full text-sm" style="border-collapse: collapse;">
                <thead>
                  <tr style="background: #f9f9f9; border-bottom: 1px solid var(--border-color); color: var(--text-secondary); font-size: var(--font-xs);">
                    <th style="padding: 10px 12px; text-align: left; width: 45%;">เมนู</th>
                    <th style="padding: 10px 12px; text-align: center; width: 25%;">ประเภท</th>
                    <th style="padding: 10px 12px; text-align: right; width: 30%;">จำนวน</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="(entry, idx) in pendingBatchList" 
                    :key="entry.item.id"
                    style="border-bottom: 1px solid var(--border-color);"
                    :style="{ background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }"
                  >
                    <td style="padding: 10px 12px; font-weight: bold; color: var(--text-primary);">
                      {{ entry.item.name }}
                    </td>
                    <td style="padding: 10px 12px; text-align: center;">
                      <span class="badge" style="background: rgba(139, 3, 19, 0.08); color: var(--primary); padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: var(--font-xs);">
                        {{ getCookActionLabel(entry.item.name) }}
                      </span>
                    </td>
                    <td style="padding: 10px 12px; text-align: right; font-weight: bold; color: var(--primary); font-size: var(--font-md); font-variant-numeric: tabular-nums;">
                      +{{ entry.quantity }} <span style="font-size: var(--font-xs); font-weight: normal; color: var(--text-secondary);">{{ entry.item.uom || 'ชิ้น' }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Batch Linkage Deduction Hints (Requested by user) -->
            <div v-if="getBatchLinkageNotices.length > 0" class="mb-md flex flex-col gap-xs" style="background: rgba(139, 3, 19, 0.04); border-left: 3px solid var(--primary); border-radius: var(--radius-md); border: 1px solid rgba(139, 3, 19, 0.08); padding: 12px 16px; font-size: var(--font-xs); color: var(--text-secondary); line-height: 1.5;">
              <div v-for="notice in getBatchLinkageNotices" :key="notice" class="flex align-center gap-sm">
                <i class="fa-solid fa-circle-info text-primary" style="flex-shrink:0; font-size: 14px;"></i>
                <span>{{ notice }}</span>
              </div>
            </div>

            <div class="form-group mb-md">
              <label class="form-label font-bold text-sm">บันทึกช่วยจำสำหรับชุดนี้ (ไม่บังคับ)</label>
              <input 
                type="text" 
                class="form-input" 
                v-model="modalNote" 
                placeholder="เช่น ปรุงพร้อมกันรอบเที่ยง..." 
              />
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-md mt-lg">
            <button class="btn btn-secondary flex-1" :disabled="isSaving" @click="closeModal" style="border-radius: var(--radius-md) !important; height: 44px;">
              ยกเลิก
            </button>
            <button 
              class="btn btn-primary flex-1" 
              :disabled="isSaving"
              @click="confirmCookAction"
              style="border-radius: var(--radius-md) !important; height: 44px;"
            >
              <i v-if="isSaving" class="fa-solid fa-spinner fa-spin"></i>
              {{ isSaving ? 'กำลังบันทึก...' : 'ยืนยัน' }}
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue';
import api from '../api';
import { ui } from '../helpers';
import { store } from '../store';

// Loading & saving states
const loading = ref(true);
const isSaving = ref(false);
const searchQuery = ref('');
const activeCategory = ref('all');

// By default, only show items with raw stock > 0 as requested!
const onlyWithRawStock = ref(true);

// Keyed by item.id -> number
const cookInputs = reactive({});

// Modal states
const showModal = ref(false);
const modalMode = ref('single'); // 'single' or 'batch'
const activeModalItem = ref(null);
const modalQuantity = ref(0);
const modalNote = ref('');

// Categories for filter aligned with POS
const filterCategories = [
  { id: 'all', label: 'ทั้งหมด', icon: 'fa-solid fa-border-all' },
  { id: 'samkrob', label: '3 กรอบ', icon: 'fa-solid fa-bowl-food' },
  { id: 'fried_chicken', label: 'ไก่ทอด', icon: 'fa-solid fa-drumstick-bite' },
  { id: 'snacks', label: 'ของทานเล่น', icon: 'fa-solid fa-cookie-bite' },
  { id: 'bun_fried', label: 'เปาทอด', icon: 'fa-solid fa-fire' },
  { id: 'bun_grilled', label: 'เปาปิ้ง', icon: 'fa-solid fa-fire-flame-simple' },
  { id: 'wrap_rice', label: 'ข้าว / แร็ป', icon: 'fa-solid fa-box' }
];

// Helper: Format quantities
const formatStockQty = (qty, uom) => {
  if (qty === null || qty === undefined) return '-';
  const roundedQty = Math.round(Number(qty) * 100) / 100;
  const formatted = roundedQty.toLocaleString('th-TH', { maximumFractionDigits: 2 });
  if (uom === 'กรัม') {
    return `${formatted} ก.`;
  }
  return `${formatted} ${uom || 'ชิ้น'}`;
};

// Low stock helper
const isItemLowStock = (item, qty) => {
  if (qty === null || qty === undefined) return false;
  if (qty <= 0) return false;
  if (item.uom === 'กรัม') {
    return qty <= 500;
  }
  const threshold = store.lowStockThreshold || 5;
  return qty <= threshold;
};

// Bun linkage helper (Precise separation between pork and pork salted egg)
const getSteamedCounterpartName = (name) => {
  if (!name) return '';
  if (name.includes('ไข่เค็ม') || name.includes('ไขเค็ม')) {
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
  return '';
};

// Robust steamed counterpart finder from store.stockItems
const findSteamedCounterpart = (name) => {
  if (!name) return null;
  const target = getSteamedCounterpartName(name);
  const items = store.stockItems || [];
  if (target) {
    const exact = items.find(i => i.name === target);
    if (exact) return exact;
  }
  if (name.includes('ไข่เค็ม') || name.includes('ไขเค็ม')) {
    return items.find(i => (i.name.includes('ไข่เค็ม') || i.name.includes('ไขเค็ม')) && !i.name.includes('ทอด') && !i.name.includes('ปิ้ง')) || null;
  }
  if (name.includes('หมู')) {
    return items.find(i => i.name.includes('หมู') && !i.name.includes('ไข่เค็ม') && !i.name.includes('ไขเค็ม') && !i.name.includes('ทอด') && !i.name.includes('ปิ้ง')) || null;
  }
  if (name.includes('ถั่วดำ')) {
    return items.find(i => i.name.includes('ถั่วดำ') && !i.name.includes('ทอด') && !i.name.includes('ปิ้ง')) || null;
  }
  if (name.includes('ครีม')) {
    return items.find(i => i.name.includes('ครีม') && !i.name.includes('ทอด') && !i.name.includes('ปิ้ง')) || null;
  }
  if (name.includes('หมั่นโถ')) {
    return items.find(i => i.name.includes('หมั่นโถ') && !i.name.includes('ทอด') && !i.name.includes('ปิ้ง')) || null;
  }
  return null;
};

// Notice helpers for single and batch confirmation modals
const getLinkageDeductionNotice = (item, qty) => {
  if (!item || !qty) return null;
  const numQty = Number(qty) || 0;
  if (item.name && item.name.includes('แร็ป')) {
    const deduct = Math.round(numQty * 1.5 * 100) / 100;
    return `ข้อความพิเศษ: แร็ปไก่จะหักจากสต็อก "ไก่ไร้กระดูก" จำนวน ${deduct} ชิ้น (อัตราส่วน 1.5 ชิ้น/อัน)`;
  }
  const steamed = findSteamedCounterpart(item.name);
  if (steamed) {
    return `ข้อความพิเศษ: จะหักจากสต็อก "${steamed.name}" จำนวน ${numQty} ลูก (อัตราส่วน 1:1)`;
  }
  return null;
};

const getBatchLinkageNotices = computed(() => {
  const notices = [];
  const entries = pendingBatchList.value;
  let wrapQty = 0;
  for (const entry of entries) {
    if (entry.item.name && entry.item.name.includes('แร็ป')) {
      wrapQty += Number(entry.quantity) || 0;
    }
  }
  if (wrapQty > 0) {
    const deduct = Math.round(wrapQty * 1.5 * 100) / 100;
    notices.push(`แร็ปไก่ (${wrapQty} อัน): จะหักจากไก่ไร้กระดูก ${deduct} ชิ้น (อัตรา 1.5 ชิ้น/อัน)`);
  }
  for (const entry of entries) {
    const steamed = findSteamedCounterpart(entry.item.name);
    if (steamed) {
      notices.push(`${entry.item.name} (${entry.quantity} ชิ้น): จะหักจาก ${steamed.name} ${entry.quantity} ลูก (อัตรา 1:1)`);
    }
  }
  return notices;
});

const getItemCardHint = (item) => {
  if (!item || !item.name) return '';
  if (item.name.includes('แร็ป')) {
    return 'หักจากไก่ไร้กระดูก 1.5 ชิ้น';
  }
  const steamed = findSteamedCounterpart(item.name);
  if (steamed) {
    return `หักจาก${steamed.name} 1:1`;
  }
  return '';
};

// Cook Action Helpers
const getCookActionLabel = (name) => {
  if (!name) return 'ทอด';
  const isWrapped = name.includes('ข้าวเหนียว') || 
                    name.includes('เบอร์เกอร์') || 
                    name.includes('แร็ป') ||
                    name.includes('ข้าว');
  if (isWrapped) return 'ห่อ';

  if (name.includes('ปิ้ง')) return 'ปิ้ง';
  if (name.includes('ทอด')) return 'ทอด';

  return 'ทอด';
};

const getCookActionIcon = (name) => {
  if (!name) return 'fa-solid fa-fire';
  const isWrapped = name.includes('ข้าวเหนียว') || 
                    name.includes('เบอร์เกอร์') || 
                    name.includes('แร็ป') ||
                    name.includes('ข้าว');
  if (isWrapped) return 'fa-solid fa-box';

  if (name.includes('ปิ้ง')) return 'fa-solid fa-fire-flame-simple';
  if (name.includes('ทอด')) return 'fa-solid fa-fire';

  return 'fa-solid fa-fire';
};

// Items that require cooking/prep:
// 1. Raw stock items (fried items, etc.)
// 2. Wraps/rolls/rice (แร็ปไก่, เบอร์เกอร์, ข้าวเหนียว, ข้าว)
// 3. Fried/Grilled Buns ONLY (เปาทอด, เปาปิ้ง)
// *Note: Regular steamed buns and dumplings are excluded because they don't have a raw stock counterpart.
const cookableItems = computed(() => {
  const items = store.stockItems || [];
  return items.filter(item => {
    const name = item.name || '';

    // กฎป้องกันเด็ดขาด: ซาลาเปานึ่งปกติและขนมจีบ ห้ามขึ้นในการ์ดหน้าปรุงอาหารเด็ดขาด
    if ((name.includes('เปา') || name.includes('หมั่นโถ') || name.includes('ขนมจีบ')) && !name.includes('ทอด') && !name.includes('ปิ้ง')) {
      return false;
    }

    if (item.raw_quantity !== null && item.raw_quantity !== undefined) {
      return true;
    }
    if (name.includes('แร็ป') || name.includes('เบอร์เกอร์') || name.includes('ข้าวเหนียว') || name.includes('ข้าว')) {
      return true;
    }
    // เฉพาะเปาทอด หรือเปาปิ้ง เท่านั้น:
    if ((name.includes('เปา') || name.includes('หมั่นโถ')) && (name.includes('ทอด') || name.includes('ปิ้ง'))) {
      return true;
    }
    return false;
  });
});

// Available raw/source ingredient calculator
const getAvailableRaw = (item) => {
  if (!item) return 0;
  if (item.raw_quantity !== null && item.raw_quantity !== undefined) {
    return item.raw_quantity;
  }
  if (item.name && item.name.includes('แร็ป')) {
    const chicken = (store.stockItems || []).find(i => i.name === 'ไก่ไร้กระดูก');
    if (chicken && chicken.quantity !== null && chicken.quantity !== undefined) {
      return Math.floor(chicken.quantity / 1.5);
    }
    return 0;
  }
  const steamed = findSteamedCounterpart(item.name);
  if (steamed && steamed.quantity !== null && steamed.quantity !== undefined) {
    return steamed.quantity;
  }
  return 0;
};

// Label for the source ingredient
const getSourceLabel = (item) => {
  if (!item) return 'ของสดคงเหลือ';
  if (item.raw_quantity !== null && item.raw_quantity !== undefined) {
    return 'ของสดคงเหลือ';
  }
  if (item.name && item.name.includes('แร็ป')) {
    const chicken = (store.stockItems || []).find(i => i.name === 'ไก่ไร้กระดูก');
    return `ไก่ไร้กระดูก (${chicken?.quantity || 0})`;
  }
  const steamed = findSteamedCounterpart(item.name);
  if (steamed) {
    return `${steamed.name} (${steamed.quantity || 0})`;
  }
  return 'วัตถุดิบต้นทาง';
};

// Count of items that currently have raw stock > 0
const itemsWithRawCount = computed(() => {
  return cookableItems.value.filter(item => getAvailableRaw(item) > 0).length;
});

// Helper to determine item's primary category (mutually exclusive)
const getItemPrimaryCategory = (item) => {
  const name = item.name || '';
  if (name.includes('แร็ป') || name.includes('เบอร์เกอร์') || name.includes('ข้าว')) {
    return 'wrap_rice';
  }
  if ((name.includes('เปา') || name.includes('หมั่นโถ')) && name.includes('ทอด')) {
    return 'bun_fried';
  }
  if ((name.includes('เปา') || name.includes('หมั่นโถ')) && name.includes('ปิ้ง')) {
    return 'bun_grilled';
  }
  // 3 กรอบ (ไส้กรอกดอกแดง, ไส้กรอกเฟรนฟราย, ปูอัดกรอบ)
  if (
    item.category_id === 1 || 
    item.category_name?.includes('สามกรอบ') || 
    name.includes('ไส้กรอก') || 
    name.includes('ปูอัด')
  ) {
    if (!name.includes('หนังไก่') && !name.includes('ไก่')) {
      return 'samkrob';
    }
  }
  // ไก่ทอด (สะโพก, น่อง, ปีก, อก, หนังไก่กรอบ, ไก่สดหมัก)
  if (
    item.category_id === 2 || 
    item.category_name?.includes('ไก่ทอด') || 
    name.includes('หนังไก่') || 
    name.includes('ไก่') || 
    name.includes('สะโพก') || 
    name.includes('น่อง') || 
    name.includes('ปีก') || 
    name.includes('อก')
  ) {
    if (!name.includes('ไส้กรอก') && !name.includes('ปูอัด')) {
      return 'fried_chicken';
    }
  }
  // ของทานเล่น (ชีสสติ๊ก, ชีสบอล, นักเก็ต, ฯลฯ)
  if (
    item.category_id === 3 || 
    item.category_name?.includes('ของทานเล่น') || 
    name.includes('ชีส') || 
    name.includes('นักเก็ต')
  ) {
    return 'snacks';
  }
  return 'other';
};

// Filtered list based on search, category, and onlyWithRawStock rule
const filteredItems = computed(() => {
  let list = cookableItems.value;

  // Filter: When onlyWithRawStock is true (default), show only cards with raw stock > 0
  if (onlyWithRawStock.value) {
    list = list.filter(item => getAvailableRaw(item) > 0);
  }

  // Filter by category using deterministic mutually exclusive matching
  if (activeCategory.value !== 'all') {
    list = list.filter(item => getItemPrimaryCategory(item) === activeCategory.value);
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(item => item.name && item.name.toLowerCase().includes(q));
  }

  return list;
});

// Presets helper
const addPreset = (item, amount) => {
  const current = Number(cookInputs[item.id]) || 0;
  const max = getAvailableRaw(item);
  const next = current + amount;
  cookInputs[item.id] = Math.min(next, max);
};

const setAllRaw = (item) => {
  cookInputs[item.id] = Math.max(0, getAvailableRaw(item));
};

// Check if a single item can be cooked
const canCookItem = (item) => {
  const val = Number(cookInputs[item.id]);
  if (!val || isNaN(val) || val <= 0) return false;
  if (val > getAvailableRaw(item)) return false;
  return !isSaving.value;
};

// Batch pending summary
const pendingCookCount = computed(() => {
  return Object.keys(cookInputs).filter(id => Number(cookInputs[id]) > 0).length;
});

const hasPendingCooks = computed(() => pendingCookCount.value > 0);

const pendingTotalQty = computed(() => {
  let total = 0;
  for (const id in cookInputs) {
    const val = Number(cookInputs[id]) || 0;
    if (val > 0) total += val;
  }
  return total;
});

const defaultUom = computed(() => 'ชิ้น');

const pendingBatchList = computed(() => {
  const list = [];
  for (const id in cookInputs) {
    const qty = Number(cookInputs[id]) || 0;
    if (qty > 0) {
      const item = cookableItems.value.find(i => i.id === Number(id));
      if (item) {
        list.push({ item, quantity: qty });
      }
    }
  }
  return list;
});

const clearAllInputs = () => {
  for (const key in cookInputs) {
    delete cookInputs[key];
  }
};

// Modal Openers
const openSingleCookModal = (item) => {
  const qty = Number(cookInputs[item.id]);
  if (!qty || qty <= 0) return;
  activeModalItem.value = item;
  modalQuantity.value = qty;
  modalNote.value = '';
  modalMode.value = 'single';
  showModal.value = true;
};

const openBatchCookModal = () => {
  if (!hasPendingCooks.value) return;
  modalNote.value = '';
  modalMode.value = 'batch';
  showModal.value = true;
};

const closeModal = (force = false) => {
  if (isSaving.value && !force) return;
  showModal.value = false;
  activeModalItem.value = null;
  modalQuantity.value = 0;
  modalNote.value = '';
};

// Confirmation execution
const confirmCookAction = async () => {
  if (modalMode.value === 'single') {
    await executeSingleCook();
  } else {
    await executeBatchCook();
  }
};

const executeSingleCook = async () => {
  if (!activeModalItem.value || !modalQuantity.value) return;
  const item = activeModalItem.value;
  const qty = modalQuantity.value;
  const note = modalNote.value.trim();

  isSaving.value = true;
  ui.showLoading();
  try {
    const actionLabel = getCookActionLabel(item.name);
    let res;
    if (item.raw_quantity !== null && item.raw_quantity !== undefined) {
      res = await api.stock.fry(item.id, { quantity: qty, note: note || '' });
    } else {
      res = await api.stock.restock(item.id, { quantity: qty, stock_type: 'cooked', note: note || '' });
    }

    if (res && res.success) {
      await store.fetchStock(true);
      cookInputs[item.id] = '';
      closeModal(true);
      ui.showToast(`บันทึก${actionLabel} "${item.name}" จำนวน ${qty} สำเร็จ`, 'success');
    } else {
      ui.showToast(res?.error || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
    }
  } catch (err) {
    console.error(err);
    ui.showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
  } finally {
    isSaving.value = false;
    ui.hideLoading();
  }
};

const executeBatchCook = async () => {
  const entries = pendingBatchList.value;
  if (entries.length === 0) return;

  isSaving.value = true;
  ui.showLoading();
  let successCount = 0;
  let errorCount = 0;
  const customNote = modalNote.value.trim();

  try {
    for (const entry of entries) {
      const item = entry.item;
      const cookNote = customNote || '';

      try {
        let res;
        if (item.raw_quantity !== null && item.raw_quantity !== undefined) {
          res = await api.stock.fry(item.id, { quantity: entry.quantity, note: cookNote });
        } else {
          res = await api.stock.restock(item.id, { quantity: entry.quantity, stock_type: 'cooked', note: cookNote });
        }

        if (res && res.success) {
          delete cookInputs[item.id];
          successCount++;
        } else {
          errorCount++;
        }
      } catch (e) {
        console.error(e);
        errorCount++;
      }
    }

    await store.fetchStock(true);
    closeModal(true);
    if (errorCount === 0) {
      ui.showToast(`บันทึกปรุงสำเร็จครบทั้ง ${successCount} รายการ`, 'success');
    } else {
      ui.showToast(`ปรุงสำเร็จ ${successCount} รายการ, ผิดพลาด ${errorCount} รายการ`, 'warning');
    }
  } finally {
    isSaving.value = false;
    ui.hideLoading();
  }
};

// Load initial stock data
const loadStockData = async (force = false) => {
  loading.value = !store.stockLoaded || force;
  try {
    await store.fetchStock(force);
  } catch (e) {
    console.error(e);
    ui.showToast('ไม่สามารถโหลดข้อมูลคลังสินค้าได้', 'error');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadStockData();
});
</script>

<style scoped>
/* Card White Theming */
.card,
.cook-hint-box,
.cook-filter-card,
.cook-item-card,
.cook-stock-box,
.cook-floating-batch-bar,
.cook-white-modal,
.modal-preview-card {
  background: #ffffff !important;
  color: var(--text-primary);
}

/* Page Title matching Stock.vue exactly */
.stock-page-title {
  font-size: var(--font-lg);
  font-weight: bold;
  color: var(--text-secondary);
  text-align: left;
}

/* Header buttons: Standard size matching reference image & StockBulk */
.btn-bulk-back,
.btn-cook-save-all {
  height: 44px !important;
  padding: 10px 18px !important;
  font-size: var(--font-base) !important;
  font-weight: var(--font-weight-semibold) !important;
  border-radius: var(--radius-md) !important;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-sizing: border-box !important;
}

.cook-hint-box {
  border: 1px solid rgba(139, 3, 19, 0.15);
  border-left: 4px solid var(--primary);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--font-sm);
  color: var(--text-secondary);
}

.cook-hint-box .hint-icon {
  color: var(--primary);
  font-size: 1.15rem;
  flex-shrink: 0;
}

.cook-filter-card {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
}

.input-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon-wrapper .input-icon {
  position: absolute;
  left: 12px;
  color: var(--text-tertiary);
  pointer-events: none;
}

.clear-search-btn {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 14px;
}

/* Stable Filter Toggle (No resizing or layout shifts) */
.btn-raw-toggle {
  font-size: var(--font-sm);
  white-space: nowrap;
  padding: 8px 16px;
  height: 40px;
  border-radius: var(--radius-md) !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  cursor: pointer;
  min-width: 200px;
}

.btn-secondary-rect {
  background: #ffffff !important;
  color: var(--text-secondary) !important;
  border: 1px solid var(--border-color) !important;
}

.btn-secondary-rect:hover {
  border-color: var(--primary) !important;
  color: var(--primary) !important;
}

.pill-btn {
  padding: 6px 14px !important;
  font-size: var(--font-sm) !important;
  border-radius: var(--radius-full) !important;
}

/* Grid of Cook Items */
.cook-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-md);
  padding-bottom: 140px;
}

.cook-item-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: var(--space-md);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
}

.cook-item-card.has-input {
  border-color: var(--primary);
  box-shadow: 0 4px 16px rgba(139, 3, 19, 0.1);
}

.cook-item-card.raw-empty {
  border-color: rgba(239, 68, 68, 0.3);
}

.cook-item-header {
  border-bottom: 1px dashed var(--border-color);
  padding-bottom: var(--space-xs);
}

.cook-item-name {
  font-size: var(--font-md);
  margin: 0;
  line-height: 1.3;
}

.cook-action-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-xs);
  font-weight: bold;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: rgba(139, 3, 19, 0.08);
  color: var(--primary);
  margin-top: 4px;
}

.cook-link-hint-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-xs);
  color: var(--text-secondary);
  background: rgba(110, 78, 55, 0.08);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  margin-top: 4px;
  border: 1px solid var(--border-color);
}

/* Clear link in card header top-right */
.btn-item-clear-link {
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--font-xs);
  font-weight: bold;
  padding: 2px 6px;
  text-decoration: underline;
  transition: opacity var(--transition-fast);
}

.btn-item-clear-link:hover {
  opacity: 0.8;
}

/* Stock Split Box with pure white backgrounds */
.cook-stock-split-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-xs);
}

.cook-stock-box {
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: #ffffff !important;
}

.cook-stock-box.raw-box {
  border-color: rgba(139, 3, 19, 0.2);
}

.cook-stock-box.raw-box.warning {
  border-color: #f59e0b;
}

.cook-stock-box.raw-box.danger {
  border-color: #ef4444;
}

.stock-box-label {
  font-size: var(--font-xs);
  color: var(--text-tertiary);
  margin-bottom: 2px;
}

.stock-box-value {
  font-size: var(--font-lg);
  font-weight: bold;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.stock-box-status {
  font-size: var(--font-xs);
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 3px;
}

/* Cook Action Controls */
.cook-action-container {
  margin-top: auto;
}

.cook-presets-bar {
  margin-bottom: 8px;
}

.btn-preset-qty {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  font-size: var(--font-xs);
  font-weight: bold;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-secondary);
}

.btn-preset-qty:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(139, 3, 19, 0.05);
}

.btn-preset-qty:disabled {
  opacity: 1 !important;
  background: #f1f2f4 !important;
  color: var(--text-tertiary) !important;
  cursor: not-allowed;
}

.btn-preset-all {
  border-color: rgba(139, 3, 19, 0.3);
  color: var(--primary);
}

.cook-input-row {
  display: flex;
  width: 100%;
}

.cook-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.cook-number-input {
  width: 100%;
  padding-right: 42px;
  font-size: var(--font-md);
  font-weight: bold;
  font-variant-numeric: tabular-nums;
  height: 40px;
  border-radius: var(--radius-md);
  background: #ffffff !important;
}

.cook-input-unit {
  position: absolute;
  right: 12px;
  font-size: var(--font-xs);
  color: var(--text-tertiary);
  pointer-events: none;
}

/* Cook submit button: Large, prominent, and full-width */
.btn-cook-submit {
  height: 44px !important;
  font-size: var(--font-base) !important;
  font-weight: bold !important;
  border-radius: var(--radius-md) !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(139, 3, 19, 0.15);
}

.btn-cook-submit:disabled {
  opacity: 1 !important;
  background: var(--primary) !important;
  color: #ffffff !important;
  border: 1px solid var(--primary) !important;
  box-shadow: none !important;
  cursor: not-allowed !important;
  pointer-events: none !important;
}

/* Floating Batch Bar: elevated cleanly above mobile bottom nav */
.cook-floating-batch-bar {
  position: fixed;
  bottom: calc(var(--bottom-nav-height, 64px) + var(--safe-bottom, 0px) + 14px);
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 600px;
  z-index: 900;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.22);
  border-radius: var(--radius-lg);
  border: 1.5px solid var(--primary);
  padding: var(--space-sm) var(--space-md);
}

.floating-batch-icon {
  font-size: 1.3rem;
  color: var(--primary);
}

.btn-batch-clear-link {
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--font-xs);
  font-weight: bold;
  padding: 4px 8px;
  text-decoration: underline;
}

.btn-batch-clear-link:hover {
  opacity: 0.8;
}

.btn-save-batch-full {
  height: 44px !important;
  font-size: var(--font-base) !important;
  font-weight: bold !important;
  border-radius: var(--radius-md) !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}

/* Modal styling: elevated cleanly above mobile bottom nav */
.modal-container {
  z-index: 2000 !important;
}

.modal-overlay {
  z-index: 2001 !important;
}

.cook-white-modal {
  border-radius: var(--radius-2xl);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-color);
  max-height: 85vh;
  overflow-y: auto;
  z-index: 2002 !important;
}

.modal-stock-preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

.modal-preview-box {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
}

.preview-title {
  font-size: var(--font-xs);
  color: var(--text-tertiary);
  margin-bottom: 4px;
}

.preview-shift {
  font-size: var(--font-md);
  font-variant-numeric: tabular-nums;
}

.empty-icon {
  font-size: 2.5rem;
  opacity: 0.35;
  color: var(--text-tertiary);
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .stock-page-title {
    font-size: var(--font-lg) !important;
    font-weight: bold !important;
    text-align: center !important;
  }
}

@media (max-width: 576px) {
  .mobile-stock-header-card {
    flex-direction: column !important;
    align-items: stretch !important;
    text-align: center !important;
  }

  .mobile-stock-header-card > div {
    text-align: center !important;
  }

  .mobile-stock-header-card .mobile-header-actions {
    display: flex !important;
    flex-direction: row !important;
    gap: var(--space-xs) !important;
    width: 100% !important;
  }

  .btn-bulk-back,
  .btn-cook-save-all {
    flex: 1 !important;
    width: auto !important;
    height: 44px !important;
    justify-content: center !important;
    padding: 10px 12px !important;
    font-size: var(--font-sm) !important;
  }

  .cook-items-grid {
    grid-template-columns: 1fr;
    gap: var(--space-sm);
    padding-bottom: calc(var(--bottom-nav-height, 64px) + var(--safe-bottom, 0px) + 150px) !important;
  }

  .cook-filter-row {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-xs);
  }

  .btn-raw-toggle {
    width: 100%;
    min-width: unset;
    justify-content: center;
  }

  .cook-filter-pills {
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 4px;
    -webkit-overflow-scrolling: touch;
  }

  .cook-filter-pills .pill-btn {
    flex-shrink: 0;
  }

  /* Floating Bar elevated safely above #bottom-nav */
  .cook-floating-batch-bar {
    bottom: calc(var(--bottom-nav-height, 64px) + var(--safe-bottom, 0px) + 14px) !important;
    width: calc(100% - 24px) !important;
    padding: 10px 14px;
  }

  /* Modal lifted above mobile bottom menu */
  .modal-container {
    padding-bottom: calc(var(--bottom-nav-height, 64px) + var(--safe-bottom, 0px) + 20px) !important;
    align-items: flex-end !important;
  }

  .cook-white-modal {
    margin-bottom: calc(var(--bottom-nav-height, 64px) + var(--safe-bottom, 0px) + 10px) !important;
    max-height: calc(100vh - var(--bottom-nav-height, 64px) - var(--safe-bottom, 0px) - 50px) !important;
    width: calc(100% - 24px) !important;
  }
}
</style>
