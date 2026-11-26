<template>
  <div class="branch-requisition-view page-enter">
    
    <!-- Top Action Toolbar Card -->
    <div class="card mb-lg page-header-card">
      <div class="page-header-left">
        <div class="header-icon-circle">
          <i class="fa-solid fa-boxes-packing"></i>
        </div>
        <div class="page-header-text">
          <h2 class="page-header-title">ระบบขอเบิกของจากครัวกลาง</h2>
          <p class="page-header-subtitle">
            เลือกเบิกสินค้าจากคลังกลาง เมื่อรับของแล้วระบบจะบันทึกต้นทุนและเติมสต็อกสาขาอัตโนมัติ
          </p>
        </div>
      </div>
    </div>

    <!-- Main Navigation Tabs (Below Header Card, matching Management.vue) -->
    <div class="category-tabs">
      <button 
        class="category-tab" 
        :class="{ active: currentTab === 'shop' }"
        @click="currentTab = 'shop'"
      >
        <i class="fa-solid fa-cart-plus"></i> เลือกของเบิก
      </button>
      <button 
        class="category-tab relative" 
        :class="{ active: currentTab === 'my_orders' }"
        @click="currentTab = 'my_orders'"
      >
        <i class="fa-solid fa-receipt"></i> รายการที่ขอเบิก
        <span v-if="dispatchedCount > 0" class="badge-count animate-pulse">{{ dispatchedCount }}</span>
      </button>
    </div>

    <!-- ────────────────────────────────────────────────────────── -->
    <!-- TAB 1: SHOP CATALOG (เลือกของใส่ตะกร้าเหมือนหน้าขาย POS) -->
    <!-- ────────────────────────────────────────────────────────── -->
    <KitchenCatalogCart
      v-if="currentTab === 'shop'"
      :items="items"
      :categories="categories"
      :is-loading-items="isLoadingItems"
      :get-category-label="getCategoryLabel"
      v-model:cart="cart"
      v-model:notes="cartNote"
      :is-submitting="isSubmitting"
      search-placeholder="ค้นหา เช่น ซอส, ถุง, กระทะ, กล่อง..."
      @submit="submitRequisition"
    />

    <!-- ────────────────────────────────────────────────────────── -->
    <!-- TAB 2: MY ORDERS (ติดตามสถานะ & กดยืนยันรับของ) -->
    <!-- Exact Design from Central Kitchen Orders Tab (Requirement 4) -->
    <!-- ────────────────────────────────────────────────────────── -->
    <div v-if="currentTab === 'my_orders'" class="my-orders-layout">
      <!-- Date & Period Filter Card (Same 2-Row Card Layout as POS) -->
      <DatePeriodFilter
        v-model:period-mode="periodMode"
        v-model:selected-date="selectedDate"
        v-model:selected-month="selectedMonth"
        v-model:selected-year="selectedYear"
        v-model:start-time="customStartTime"
        v-model:end-time="customEndTime"
        @change="loadMyTransfers"
      />

      <div class="flex flex-between align-center flex-wrap gap-md mb-md">
        <h4 class="font-bold text-base flex align-center gap-xs">
          <i class="fa-solid fa-clock-rotate-left text-primary"></i>
          <span>รายการเบิกของของสาขาคุณ</span>
        </h4>
        <div class="flex align-center gap-sm flex-wrap">
          <div class="flex align-center gap-xs">
            <label class="text-sm font-bold text-secondary whitespace-nowrap flex align-center gap-xs">
              <i class="fa-solid fa-user text-primary"></i>
              <span>ผู้ขอเบิก:</span>
            </label>
            <div class="custom-select-wrapper" @click.stop style="min-width: 150px;">
              <div 
                class="custom-select-trigger" 
                :class="{ 'active': isRequesterDropdownOpen }" 
                @click="isRequesterDropdownOpen = !isRequesterDropdownOpen"
                style="height: 38px; padding: 0 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--card-bg); font-size: var(--font-sm);"
              >
                <span class="custom-select-text font-bold">
                  {{ requesterFilter === 'all' ? 'ทุกคน' : requesterFilter }}
                </span>
              </div>
              <div v-if="isRequesterDropdownOpen" class="custom-select-dropdown">
                <div 
                  class="custom-select-option"
                  :class="{ 'selected': requesterFilter === 'all' }"
                  @click="requesterFilter = 'all'; isRequesterDropdownOpen = false;"
                >
                  ทุกคน
                </div>
                <div 
                  v-for="reqName in availableRequesters" 
                  :key="reqName" 
                  class="custom-select-option"
                  :class="{ 'selected': requesterFilter === reqName }"
                  @click="requesterFilter = reqName; isRequesterDropdownOpen = false;"
                >
                  {{ reqName }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Skeleton Loading for Orders -->
      <div v-if="isLoadingOrders" class="orders-list flex flex-col gap-md">
        <div v-for="i in 3" :key="i" class="card p-lg order-card" style="pointer-events: none;">
          <div class="flex flex-between align-center mb-md pb-md border-b">
            <div class="flex align-center gap-sm">
              <div class="skeleton" style="width: 140px; height: 24px; border-radius: var(--radius-sm);"></div>
              <div class="skeleton" style="width: 90px; height: 24px; border-radius: var(--radius-full);"></div>
            </div>
            <div class="skeleton" style="width: 110px; height: 32px; border-radius: var(--radius-sm);"></div>
          </div>
          <div class="skeleton mb-md" style="width: 260px; height: 16px; border-radius: var(--radius-xs);"></div>
          <div class="order-items-table-wrapper mb-md">
            <div class="skeleton mb-xs" style="width: 100%; height: 38px;"></div>
            <div class="skeleton mb-xs" style="width: 100%; height: 44px;"></div>
            <div class="skeleton" style="width: 100%; height: 44px;"></div>
          </div>
          <div class="flex flex-between align-center pt-xs flex-wrap gap-md">
            <div class="skeleton" style="width: 220px; height: 18px; border-radius: var(--radius-xs);"></div>
            <div class="skeleton" style="width: 180px; height: 46px; border-radius: var(--radius-md);"></div>
          </div>
        </div>
      </div>

      <!-- Empty Orders State -->
      <div v-else-if="filteredMyTransfers.length === 0" class="empty-state-box">
        <div class="empty-state-icon">
          <i class="fa-solid fa-file-invoice"></i>
        </div>
        <div class="empty-state-title">สาขายังไม่มีประวัติการขอเบิกของ</div>
        <div class="empty-state-desc mb-md">คลิกแท็บ "เลือกของเบิก" ด้านบนเพื่อเริ่มยื่นคำขอเบิกชิ้นแรก</div>
        <button class="btn btn-primary btn-md flex align-center gap-xs" @click="currentTab = 'shop'">
          <i class="fa-solid fa-cart-plus"></i>
          <span>ไปที่หน้าเลือกของเบิก</span>
        </button>
      </div>

      <!-- Orders List Cards (Exact Design from Central Kitchen Orders Tab) -->
      <div v-else class="orders-list flex flex-col gap-md">
        <div 
          v-for="t in filteredMyTransfers" 
          :key="t.id" 
          class="card p-lg order-card"
          :class="{ 
            'order-card-pending': t.status === 'pending', 
            'order-card-dispatched': t.status === 'dispatched',
            'order-card-received': t.status === 'received' 
          }"
        >
          <!-- Order Card Header -->
          <div class="order-card-header flex flex-between align-center flex-wrap gap-md mb-md pb-md">
            <div class="flex align-center gap-sm flex-wrap">
              <span class="order-no-title font-bold">
                <i class="fa-solid fa-receipt text-primary"></i>
                <span>#{{ t.transfer_no }}</span>
              </span>
              <span v-if="t.branch_name" class="badge badge-primary font-bold">
                <i class="fa-solid fa-store"></i>
                <span>{{ t.branch_name }}</span>
              </span>
              <!-- Dispatch Type Badge -->
              <span v-if="t.dispatch_type === 'push'" class="badge badge-info font-bold" title="ครัวกลางจัดส่งให้โดยตรง">
                <i class="fa-solid fa-truck-arrow-right"></i> ครัวกลางจ่ายให้
              </span>
              <span v-else class="badge badge-neutral font-bold" title="สาขาเป็นผู้กดขอเบิก">
                <i class="fa-solid fa-hand-holding-hand"></i> สาขาขอเบิก
              </span>
              <span class="badge font-bold" :class="getStatusBadgeClass(t.status)">
                <i v-if="t.status === 'pending'" class="fa-solid fa-hourglass-start"></i>
                <i v-else-if="t.status === 'dispatched'" class="fa-solid fa-truck-fast"></i>
                <i v-else-if="t.status === 'received'" class="fa-solid fa-circle-check"></i>
                <i v-else-if="t.status === 'cancelled'" class="fa-solid fa-ban"></i>
                <span>{{ getStatusLabel(t.status) }}</span>
              </span>
              <span v-if="t.status === 'cancelled'" class="badge badge-success font-bold">
                <i class="fa-solid fa-rotate-left"></i>
                <span>คืนแล้ว</span>
              </span>
            </div>

            <div class="order-total-header">
              <span class="order-total-label">ยอดต้นทุนตัดเข้าสาขา:</span>
              <span 
                class="order-total-amount font-bold"
                :class="t.status === 'cancelled' ? 'text-muted' : 'text-primary'"
                :style="t.status === 'cancelled' ? 'text-decoration: line-through; opacity: 0.65;' : ''"
              >
                ฿{{ formatNumber(t.total_cost) }}
              </span>
            </div>
          </div>

          <!-- Order Metadata Info -->
          <div class="order-meta-row flex flex-between align-center text-xs text-secondary mb-md flex-wrap gap-sm">
            <div class="flex align-center gap-md flex-wrap">
              <span>
                <i class="fa-regular fa-user mr-1 text-muted"></i> ผู้ขอเบิก: <strong class="text-main">{{ t.requested_by_name || 'พนักงาน' }}</strong>
              </span>
              <span>
                <i class="fa-regular fa-clock mr-1 text-muted"></i> ยื่นคำขอเมื่อ: <span class="text-main">{{ formatDateTime(t.created_at) }}</span>
              </span>
            </div>
            <div v-if="t.dispatched_at" class="order-meta-dispatched">
              <i class="fa-solid fa-truck-fast mr-1 text-info"></i> จัดส่งเมื่อ: <span class="text-main">{{ formatDateTime(t.dispatched_at) }}</span> <span class="text-muted">(โดย {{ t.dispatched_by_name || 'ครัวกลาง' }})</span>
            </div>
          </div>

          <!-- Items Clean Table Container -->
          <TransferOrderItems
            :items="t.items"
            qty-column-header="จำนวนขอเบิก"
            :notes="t.notes"
          />

          <!-- Order Card Footer Action -->
          <div class="order-card-footer flex flex-between align-center flex-wrap gap-md pt-sm">
            <div class="order-footer-notice text-xs">
              <span v-if="t.status === 'pending'" class="text-warning font-bold flex align-center gap-xs">
                <i class="fa-solid fa-hourglass-start"></i> รอครัวกลางอนุมัติและจัดส่ง
              </span>
              <span v-else-if="t.status === 'dispatched'" class="text-info font-bold flex align-center gap-xs">
                <i class="fa-solid fa-truck-fast"></i> ของส่งออกจากครัวกลางแล้ว
              </span>
              <span v-else-if="t.status === 'received'" class="text-success font-bold flex align-center gap-xs">
                <i class="fa-solid fa-circle-check"></i> อนุมัติและบันทึกต้นทุนเข้าสาขาเรียบร้อย (เติมสต็อก POS แล้ว)
              </span>
              <span v-else-if="t.status === 'cancelled'" class="text-danger font-bold flex align-center gap-xs">
                <i class="fa-solid fa-ban"></i> ใบเบิกถูกยกเลิก (คืนต้นทุนและสต็อกเรียบร้อย)
              </span>
            </div>

            <div class="order-footer-actions">
              <button 
                v-if="t.status === 'dispatched'" 
                class="btn btn-primary"
                @click="confirmReceive(t)"
              >
                <i class="fa-solid fa-box-open mr-2"></i>
                <span>ตรวจของครบ & กดยืนยันรับของ</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import DatePeriodFilter from '../components/DatePeriodFilter.vue';
import KitchenCatalogCart from '../components/KitchenCatalogCart.vue';
import TransferOrderItems from '../components/TransferOrderItems.vue';
import api from '../api';
import { ui, getToday, isTimeInRange, formatNumber, formatDateTime } from '../helpers';

const currentTab = ref('shop'); // 'shop' | 'my_orders'

watch(currentTab, (newTab) => {
  if (newTab === 'my_orders') {
    loadMyTransfers();
  } else if (newTab === 'shop') {
    loadItems();
  }
});

const items = ref([]);
const cart = ref([]);
const cartNote = ref('');
const myTransfers = ref([]);

const isLoadingItems = ref(true);
const isLoadingOrders = ref(false);
const isSubmitting = ref(false);

const requesterFilter = ref('all');
const isRequesterDropdownOpen = ref(false);

const periodMode = ref('daily');
const selectedDate = ref(getToday());
const selectedMonth = ref(getToday().substring(0, 7));
const selectedYear = ref(getToday().substring(0, 4));
const customStartTime = ref('00.00');
const customEndTime = ref('23.59');

const matchesSelectedPeriod = (dateStr) => {
  if (!dateStr) return true;
  const d = String(dateStr).substring(0, 10);
  if (periodMode.value === 'daily') {
    if (d !== selectedDate.value) return false;
    const isTimeFilterActive = customStartTime.value !== '00.00' || customEndTime.value !== '23.59';
    return !isTimeFilterActive || isTimeInRange(dateStr, customStartTime.value, customEndTime.value);
  }
  if (periodMode.value === 'monthly') return d.substring(0, 7) === selectedMonth.value;
  if (periodMode.value === 'yearly') return d.substring(0, 4) === String(selectedYear.value);
  return true;
};

const availableRequesters = computed(() => {
  const names = new Set();
  for (const t of myTransfers.value) {
    const name = (t.requested_by_name || 'พนักงาน').trim();
    if (name) names.add(name);
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, 'th'));
});

const filteredMyTransfers = computed(() => {
  return myTransfers.value.filter(t => {
    const matchReq = requesterFilter.value === 'all' || (t.requested_by_name || 'พนักงาน').trim() === requesterFilter.value;
    return matchReq && matchesSelectedPeriod(t.created_at);
  });
});

const closeRequesterDropdown = () => {
  isRequesterDropdownOpen.value = false;
};

const categories = [
  { id: 'all', label: 'ทั้งหมด', icon: 'fa-solid fa-list' },
  { id: 'raw_material', label: 'วัตถุดิบ/อาหาร', icon: 'fa-solid fa-drumstick-bite' },
  { id: 'packaging', label: 'บรรจุภัณฑ์', icon: 'fa-solid fa-box-open' },
  { id: 'equipment', label: 'อุปกรณ์', icon: 'fa-solid fa-kitchen-set' }
];

const dispatchedCount = computed(() => {
  return myTransfers.value.filter(t => t.status === 'dispatched').length;
});

const totalCartCost = computed(() => {
  return cart.value.reduce((sum, c) => sum + (c.quantity * c.cost_price), 0);
});

onUnmounted(() => {
  window.removeEventListener('click', closeRequesterDropdown);
});

const getCategoryLabel = (cat) => {
  const map = {
    'raw_material': 'วัตถุดิบ',
    'packaging': 'บรรจุภัณฑ์',
    'equipment': 'อุปกรณ์',
    'general': 'ทั่วไป'
  };
  return map[cat] || cat;
};

const getStatusBadgeClass = (st) => {
  const map = {
    'pending': 'badge-warning',
    'dispatched': 'badge-info',
    'received': 'badge-success',
    'cancelled': 'badge-danger'
  };
  return map[st] || 'badge-secondary';
};

const getStatusLabel = (st) => {
  const map = {
    'pending': 'รอจัดส่ง',
    'dispatched': 'กำลังจัดส่ง',
    'received': 'ส่งสำเร็จ',
    'cancelled': 'ยกเลิกแล้ว'
  };
  return map[st] || st;
};

const clearCart = () => {
  cart.value = [];
  cartNote.value = '';
};

// Submit Requisition
const submitRequisition = async () => {
  if (cart.value.length === 0) return;

  const ok = await ui.showConfirm(
    'ยืนยันขอเบิกของ',
    `คุณต้องการยื่นคำขอเบิก ${cart.value.length} รายการ รวมมูลค่า ฿${formatNumber(totalCartCost.value)} ใช่หรือไม่?`
  );
  if (!ok) return;

  isSubmitting.value = true;
  ui.showLoading();
  try {
    const res = await api.centralKitchen.createTransfer({
      items: cart.value,
      notes: cartNote.value
    });
    if (res.success) {
      ui.showToast('ยื่นคำขอเบิกของเรียบร้อยแล้ว รอครัวกลางจัดส่ง', 'success');
      clearCart();
      currentTab.value = 'my_orders';
      loadMyTransfers();
    }
  } catch (err) {
    ui.showToast(err.message, 'error');
  } finally {
    isSubmitting.value = false;
    ui.hideLoading();
  }
};

// Confirm Receive
const confirmReceive = async (transfer) => {
  const ok = await ui.showConfirm(
    'ยืนยันการรับของครบถ้วน',
    `ตรวจนับของใบเบิก #${transfer.transfer_no} เรียบร้อยแล้วใช่หรือไม่?\nระบบจะบันทึกค่าของ ฿${formatNumber(transfer.total_cost)} เป็นรายจ่าย (Expense) ของสาขาอัตโนมัติ`
  );
  if (!ok) return;

  ui.showLoading();
  try {
    const res = await api.centralKitchen.receiveTransfer(transfer.id);
    if (res.success) {
      ui.showToast('ยืนยันรับของสำเร็จ บันทึกค่าใช้จ่ายเข้าสาขาแล้ว 🎉', 'success');
      loadMyTransfers();
    }
  } catch (err) {
    ui.showToast(err.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

// Data Loaders
const loadItems = async () => {
  isLoadingItems.value = true;
  try {
    const res = await api.centralKitchen.getItems({ active_only: 'true' });
    if (res.success) {
      items.value = res.data;
    }
  } catch (err) {
    ui.showToast(err.message, 'error');
  } finally {
    isLoadingItems.value = false;
  }
};

const loadMyTransfers = async () => {
  isLoadingOrders.value = true;
  try {
    const params = {};
    if (periodMode.value === 'daily' && selectedDate.value) params.date = selectedDate.value;
    else if (periodMode.value === 'monthly' && selectedMonth.value) params.month = selectedMonth.value;
    else if (periodMode.value === 'yearly' && selectedYear.value) params.year = selectedYear.value;
    const res = await api.centralKitchen.getTransfers(params);
    if (res.success) {
      myTransfers.value = res.data;
    }
  } catch (err) {
    ui.showToast(err.message, 'error');
  } finally {
    isLoadingOrders.value = false;
  }
};

onMounted(() => {
  window.addEventListener('click', closeRequesterDropdown);
  loadItems();
  loadMyTransfers();
});
</script>

<style scoped>
.branch-requisition-view {
  width: 100%;
}

.relative {
  position: relative !important;
}

.badge-count {
  position: absolute !important;
  top: -5px !important;
  right: -5px !important;
  background-color: var(--primary, #8b0313);
  color: #ffffff;
  border-radius: 999px;
  font-size: var(--font-xxs);
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25);
  border: 2px solid #ffffff;
  z-index: 2;
  font-variant-numeric: tabular-nums;
}

.category-tab.active .badge-count {
  background-color: var(--accent, #ffab2b) !important;
  color: var(--primary-dark, #500000) !important;
  border-color: #ffffff !important;
}

.my-orders-layout,
.orders-list {
  width: 100%;
}

.order-card {
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.order-card:hover {
  box-shadow: var(--shadow-md);
}

.order-card-pending {
  border-left: 5px solid var(--warning) !important;
}

.order-card-dispatched {
  border-left: 5px solid var(--info) !important;
}

.order-card-received {
  border-left: 5px solid var(--success) !important;
}

.order-card-header {
  border-bottom: 1px solid var(--border-color);
}

.order-no-title {
  font-size: var(--font-md);
  color: var(--primary);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.order-total-header {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  text-align: right;
}

.order-total-label {
  font-size: var(--font-xs);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

.order-total-amount {
  font-size: var(--font-xl);
  letter-spacing: -0.02em;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.order-meta-row {
  line-height: 1.5;
}

.order-items-table-wrapper {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--card-bg);
}

.order-card-footer {
  border-top: 1px dashed var(--border-color);
  padding-top: var(--space-sm);
}

@media (max-width: 768px) {
  .order-card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-sm);
  }

  .order-total-header {
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-md);
    padding-top: var(--space-xs);
    border-top: 1px dashed var(--border-color);
  }

  .order-card-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .order-footer-actions .btn { width: 100%; justify-content: center; }
}

@media (min-width: 769px) {
  .branch-requisition-view > .toolbar-card {
    padding: var(--space-xl) !important;
  }
}
</style>
