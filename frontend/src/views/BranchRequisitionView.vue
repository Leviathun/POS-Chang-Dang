<template>
  <div class="branch-requisition-view page-enter">
    
    <!-- Top Action Toolbar Card -->
    <div class="card mb-lg p-md flex flex-between align-center toolbar-card" style="gap: var(--space-md); flex-wrap: wrap;">
      <div>
        <h3 class="font-bold text-base mb-xs flex align-center gap-xs">
          <i class="fa-solid fa-boxes-packing text-primary"></i>
          <span>ระบบขอเบิกของจากครัวกลาง</span>
        </h3>
        <p class="text-secondary text-xs">
          เลือกรายการของที่ต้องการจากคลังส่วนกลาง เมื่อได้รับของแล้วยอดเงินจะถูกบันทึกเป็นต้นทุนของสาขาอัตโนมัติ
        </p>
      </div>

      <!-- Tab Switcher (Catalog vs My Orders) -->
      <div class="flex gap-xs align-center">
        <button 
          class="btn btn-sm" 
          :class="currentTab === 'shop' ? 'btn-primary' : 'btn-secondary'"
          @click="currentTab = 'shop'"
        >
          <i class="fa-solid fa-cart-plus mr-1"></i> เลือกของเบิก (Catalog)
        </button>
        <button 
          class="btn btn-sm relative" 
          :class="currentTab === 'my_orders' ? 'btn-primary' : 'btn-secondary'"
          @click="currentTab = 'my_orders'"
        >
          <i class="fa-solid fa-receipt mr-1"></i> รายการที่ขอเบิก
          <span v-if="dispatchedCount > 0" class="badge-count animate-pulse">{{ dispatchedCount }}</span>
        </button>
      </div>
    </div>

    <!-- ────────────────────────────────────────────────────────── -->
    <!-- TAB 1: SHOP CATALOG (เลือกของใส่ตะกร้าเหมือนหน้าขาย POS) -->
    <!-- ────────────────────────────────────────────────────────── -->
    <div v-if="currentTab === 'shop'" class="catalog-layout">
      <!-- Left Column: Items Catalog -->
      <div class="catalog-main">
        <!-- Search and Filter Bar -->
        <div class="card p-md mb-md flex flex-between align-center flex-wrap gap-md filter-bar">
          <div class="search-input-box" style="position: relative; flex: 1; min-width: 200px; max-width: 320px;">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="ค้นหา เช่น ซอส, ถุง, กะทะ..." 
              class="form-input"
              style="padding-left: 38px; width: 100%; border-radius: var(--radius-md);"
            />
          </div>

          <div class="flex gap-xs flex-wrap align-center">
            <button 
              v-for="cat in categories" 
              :key="cat.id" 
              class="btn btn-sm"
              :class="selectedCategory === cat.id ? 'btn-primary' : 'btn-secondary'"
              @click="selectedCategory = cat.id"
            >
              <i :class="cat.icon" style="margin-right: 4px;"></i> {{ cat.label }}
            </button>
          </div>
        </div>

        <!-- Items Cards Grid -->
        <div v-if="isLoadingItems" class="grid-cards">
          <div v-for="i in 6" :key="i" class="card p-md skeleton-pulse" style="height: 200px; border-radius: var(--radius-md);"></div>
        </div>

        <div v-else-if="filteredItems.length === 0" class="card p-3xl text-center">
          <div class="mb-md">
            <i class="fa-solid fa-box-open text-muted" style="font-size: 3rem; opacity: 0.5;"></i>
          </div>
          <h4 class="font-bold text-base mb-xs">ไม่พบรายการของ</h4>
          <p class="text-secondary text-sm">ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น</p>
        </div>

        <div v-else class="grid-cards">
          <div 
            v-for="item in filteredItems" 
            :key="item.id" 
            class="card item-card flex flex-col justify-between"
            @click="addToCart(item)"
          >
            <div>
              <div class="item-img-container">
                <img 
                  v-if="item.image_url" 
                  :src="item.image_url" 
                  :alt="item.name" 
                  class="item-img"
                />
                <div v-else class="item-img-placeholder">
                  <i :class="getCategoryIcon(item.category)"></i>
                </div>
                <span class="category-tag">{{ getCategoryLabel(item.category) }}</span>
              </div>

              <div class="p-md pb-xs">
                <h4 class="item-name font-bold mb-xs" :title="item.name">{{ item.name }}</h4>
                
                <div class="flex flex-between align-center text-sm mb-xs">
                  <span class="text-secondary">ราคาทุนเบิก:</span>
                  <span class="font-bold text-primary" style="font-size: 1.05rem;">
                    ฿{{ formatNumber(item.cost_price) }} <span class="text-xs text-secondary font-normal">/ {{ item.unit }}</span>
                  </span>
                </div>

                <div class="text-xs text-secondary">
                  สต็อกครัวกลาง: <strong>{{ formatNumber(item.quantity) }} {{ item.unit }}</strong>
                </div>
              </div>
            </div>

            <div class="p-md pt-xs">
              <button class="btn btn-sm btn-primary w-full flex align-center justify-center gap-xs">
                <i class="fa-solid fa-plus"></i> เพิ่มลงรายการเบิก
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Requisition Cart Panel -->
      <div class="card p-md cart-sidebar flex flex-col justify-between">
        <div>
          <div class="flex flex-between align-center mb-md pb-sm" style="border-bottom: 2px dashed var(--border-color);">
            <h4 class="font-bold text-base flex align-center gap-xs">
              <i class="fa-solid fa-cart-shopping text-primary"></i>
              <span>รายการที่ขอเบิก</span>
              <span v-if="cart.length > 0" class="badge badge-primary font-bold">{{ cart.length }}</span>
            </h4>
            <button 
              v-if="cart.length > 0" 
              class="text-xs text-danger font-bold cursor-pointer"
              style="text-decoration: underline;"
              @click="clearCart"
            >
              ล้างทั้งหมด
            </button>
          </div>

          <!-- Empty Cart State -->
          <div v-if="cart.length === 0" class="text-center py-3xl text-secondary">
            <i class="fa-solid fa-basket-shopping mb-md" style="font-size: 3rem; color: var(--text-tertiary); opacity: 0.4;"></i>
            <h5 class="font-bold text-sm mb-xs">ยังไม่มีรายการของในตะกร้า</h5>
            <p class="text-xs text-secondary">คลิกที่การ์ดสินค้าทางซ้ายเพื่อเพิ่มจำนวนลงรายการเบิก</p>
          </div>

          <!-- Cart Items List -->
          <div v-else class="cart-items-list flex flex-col gap-sm pr-xs" style="max-height: 380px; overflow-y: auto;">
            <div 
              v-for="c in cart" 
              :key="c.item_id" 
              class="cart-row p-sm px-md rounded flex flex-between align-center bg-card-alt"
            >
              <div class="flex-1 pr-sm">
                <span class="font-bold text-sm block leading-tight">{{ c.item_name }}</span>
                <span class="text-xs text-secondary">@฿{{ formatNumber(c.cost_price) }} / {{ c.unit }}</span>
              </div>

              <!-- Qty Stepper -->
              <div class="flex align-center gap-xs">
                <button class="btn-qty" @click="decreaseQty(c)">-</button>
                <span class="font-bold text-sm text-center" style="min-width: 28px;">{{ c.quantity }}</span>
                <button class="btn-qty" @click="increaseQty(c)">+</button>
              </div>

              <!-- Subtotal -->
              <div class="text-right pl-md" style="min-width: 70px;">
                <span class="font-bold text-sm text-primary">฿{{ formatNumber(c.quantity * c.cost_price) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Cart Summary & Submit Footer -->
        <div class="cart-footer pt-md mt-md" style="border-top: 1px solid var(--border-color);">
          <div class="form-group mb-sm">
            <label class="form-label text-xs font-bold text-secondary">บันทึก/เหตุผลในการเบิก (ถ้ามี):</label>
            <input 
              type="text" 
              v-model="cartNote" 
              placeholder="เช่น ของใกล้หมดสต็อก, เตรียมรับรอบเย็น" 
              class="form-input text-sm w-full"
            />
          </div>

          <div class="flex flex-between align-center mb-md p-sm rounded bg-card-alt">
            <span class="text-sm font-bold text-secondary">มูลค่าต้นทุนรวม:</span>
            <span class="text-xl font-bold text-primary">฿{{ formatNumber(totalCartCost) }}</span>
          </div>

          <button 
            class="btn btn-primary w-full py-md font-bold flex align-center justify-center gap-sm"
            :disabled="cart.length === 0 || isSubmitting"
            @click="submitRequisition"
          >
            <i class="fa-solid fa-paper-plane"></i>
            <span>{{ isSubmitting ? 'กำลังส่งคำขอ...' : 'ยื่นคำขอเบิกของจากครัวกลาง' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ────────────────────────────────────────────────────────── -->
    <!-- TAB 2: MY ORDERS (ติดตามสถานะ & กดยืนยันรับของ) -->
    <!-- ────────────────────────────────────────────────────────── -->
    <div v-if="currentTab === 'my_orders'" class="my-orders-layout">
      <div class="flex flex-between align-center mb-md">
        <h4 class="font-bold text-base">รายการเบิกของของสาขาคุณ</h4>
      </div>

      <div v-if="isLoadingOrders" class="card text-center p-3xl">
        <div class="spinner mx-auto mb-md"></div>
        <p class="text-secondary text-sm">กำลังโหลดรายการคำขอเบิก...</p>
      </div>

      <div v-else-if="myTransfers.length === 0" class="card p-3xl text-center text-secondary">
        <i class="fa-solid fa-file-invoice mb-md" style="font-size: 3rem; color: var(--text-tertiary); opacity: 0.5;"></i>
        <h4 class="font-bold text-base mb-xs">สาขายังไม่มีประวัติการขอเบิกของ</h4>
        <p class="text-secondary text-sm">คลิกแท็บ "เลือกของเบิก (Catalog)" ด้านบนเพื่อเริ่มยื่นคำขอเบิกชิ้นแรก</p>
      </div>

      <div v-else class="flex flex-col gap-md">
        <div 
          v-for="t in myTransfers" 
          :key="t.id" 
          class="card p-md flex flex-col gap-md my-transfer-card"
          :class="{ 'border-active-delivery': t.status === 'dispatched' }"
        >
          <!-- Card Header -->
          <div class="flex flex-between align-start flex-wrap gap-sm pb-sm" style="border-bottom: 1px solid var(--border-color);">
            <div>
              <div class="flex align-center gap-sm mb-xs flex-wrap">
                <span class="font-bold text-base text-primary">#{{ t.transfer_no }}</span>
                <span class="badge" :class="getStatusBadgeClass(t.status)">
                  {{ getStatusLabel(t.status) }}
                </span>
              </div>
              <p class="text-xs text-secondary">
                <i class="fa-solid fa-clock mr-1"></i> วันที่ขอ: {{ formatDateTime(t.created_at) }}
                &nbsp;|&nbsp;
                <i class="fa-solid fa-user mr-1"></i> ผู้ขอ: {{ t.requested_by_name || 'พนักงาน' }}
              </p>
            </div>

            <div class="text-right">
              <span class="text-xs text-secondary block">ยอดบันทึกค่าใช้จ่ายสาขา:</span>
              <span class="font-bold text-lg text-primary">฿{{ formatNumber(t.total_cost) }}</span>
            </div>
          </div>

          <!-- Items list -->
          <div class="p-sm px-md rounded bg-card-alt">
            <h5 class="text-xs font-bold text-secondary mb-xs">รายการของที่ขอเบิก:</h5>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-xs">
              <div 
                v-for="it in t.items" 
                :key="it.id" 
                class="flex flex-between align-center text-xs p-xs px-sm rounded"
                style="background: var(--card-bg); border: 1px solid var(--border-color);"
              >
                <span>{{ it.item_name }}</span>
                <span class="font-bold">{{ it.quantity }} {{ it.unit }}</span>
              </div>
            </div>
            <p v-if="t.notes" class="text-xs text-secondary mt-xs">
              <i class="fa-solid fa-comment-dots text-primary mr-1"></i> โน้ต: {{ t.notes }}
            </p>
          </div>

          <!-- Receive Action -->
          <div class="flex flex-between align-center flex-wrap gap-sm pt-xs">
            <div>
              <span v-if="t.status === 'pending'" class="text-xs text-secondary font-medium">
                <i class="fa-solid fa-hourglass-start text-warning mr-1"></i> รอครัวกลางจัดเตรียมของและกดส่ง
              </span>
              <span v-else-if="t.status === 'dispatched'" class="text-xs text-warning font-bold">
                <i class="fa-solid fa-truck-fast mr-1"></i> ของส่งออกจากครัวกลางแล้ว กรุณาตรวจนับของแล้วกดยืนยันรับ
              </span>
              <span v-else-if="t.status === 'received'" class="text-xs text-success font-bold">
                <i class="fa-solid fa-circle-check mr-1"></i> รับของเรียบร้อย (บันทึกเป็น Expense สาขาแล้ว)
              </span>
            </div>

            <button 
              v-if="t.status === 'dispatched'" 
              class="btn btn-sm btn-success font-bold"
              @click="confirmReceive(t)"
            >
              <i class="fa-solid fa-box-open mr-1"></i> ตรวจของครบ & กดยืนยันรับของ
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import api from '../api';
import { ui } from '../helpers';

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

const searchQuery = ref('');
const selectedCategory = ref('all');

const categories = [
  { id: 'all', label: 'ทั้งหมด', icon: 'fa-solid fa-list' },
  { id: 'raw_material', label: 'วัตถุดิบ/อาหาร', icon: 'fa-solid fa-drumstick-bite' },
  { id: 'packaging', label: 'บรรจุภัณฑ์', icon: 'fa-solid fa-box' },
  { id: 'equipment', label: 'อุปกรณ์', icon: 'fa-solid fa-kitchen-set' }
];

const dispatchedCount = computed(() => {
  return myTransfers.value.filter(t => t.status === 'dispatched').length;
});

const filteredItems = computed(() => {
  return items.value.filter(item => {
    const matchCat = selectedCategory.value === 'all' || item.category === selectedCategory.value;
    const matchSearch = !searchQuery.value || item.name.toLowerCase().includes(searchQuery.value.toLowerCase());
    return matchCat && matchSearch;
  });
});

const totalCartCost = computed(() => {
  return cart.value.reduce((sum, c) => sum + (c.quantity * c.cost_price), 0);
});

// Helpers
const formatNumber = (num) => Number(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const formatDateTime = (str) => {
  if (!str) return '-';
  const d = new Date(str);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' +
         d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
};

const getCategoryLabel = (cat) => {
  const map = {
    'raw_material': 'วัตถุดิบ',
    'packaging': 'บรรจุภัณฑ์',
    'equipment': 'อุปกรณ์',
    'general': 'ทั่วไป'
  };
  return map[cat] || cat;
};

const getCategoryIcon = (cat) => {
  const map = {
    'raw_material': 'fa-solid fa-drumstick-bite',
    'packaging': 'fa-solid fa-box-open',
    'equipment': 'fa-solid fa-kitchen-set',
    'general': 'fa-solid fa-tag'
  };
  return map[cat] || 'fa-solid fa-box';
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
    'pending': '🟡 รอครัวกลางส่งของ',
    'dispatched': '🔵 ของกำลังส่งมา (รอรับ)',
    'received': '🟢 ได้รับของแล้ว',
    'cancelled': 'ยกเลิก'
  };
  return map[st] || st;
};

// Cart Actions
const addToCart = (item) => {
  const existing = cart.value.find(c => c.item_id === item.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.value.push({
      item_id: item.id,
      item_name: item.name,
      unit: item.unit,
      cost_price: item.cost_price,
      quantity: 1
    });
  }
};

const increaseQty = (c) => {
  c.quantity += 1;
};

const decreaseQty = (c) => {
  if (c.quantity > 1) {
    c.quantity -= 1;
  } else {
    cart.value = cart.value.filter(x => x.item_id !== c.item_id);
  }
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
    const res = await api.centralKitchen.getTransfers();
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
  loadItems();
  loadMyTransfers();
});
</script>

<style scoped>
.branch-requisition-view {
  width: 100%;
}

.toolbar-card {
  box-shadow: var(--shadow-sm);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
}

.badge-count {
  position: absolute;
  top: -6px;
  right: -6px;
  background-color: var(--primary);
  color: white;
  border-radius: 999px;
  font-size: 0.7rem;
  padding: 1px 6px;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.catalog-layout {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

@media (min-width: 1024px) {
  .catalog-layout {
    flex-direction: row;
    align-items: flex-start;
  }
  .catalog-main {
    flex: 1;
    min-width: 0;
  }
  .cart-sidebar {
    width: 360px;
    flex-shrink: 0;
    position: sticky;
    top: calc(var(--header-height) + 16px);
  }
}

.filter-bar {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  pointer-events: none;
}

.grid-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: var(--space-md);
}

.item-card {
  transition: transform var(--transition-base), box-shadow var(--transition-base);
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
}

.item-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-color-focus);
}

.item-img-container {
  height: 120px;
  background: var(--bg-secondary);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--border-color);
}

.item-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-img-placeholder {
  font-size: 2.5rem;
  opacity: 0.35;
  color: var(--text-tertiary);
}

.category-tag {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 0.7rem;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  color: white;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-weight: 500;
}

.item-name {
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
}

.btn-qty {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: bold;
  font-size: 0.95rem;
  color: var(--text-primary);
  transition: all var(--transition-base);
}

.btn-qty:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.bg-card-alt {
  background: rgba(139, 3, 19, 0.03);
  border: 1px solid var(--border-color);
}

.my-transfer-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
}

.border-active-delivery {
  border-left: 5px solid var(--warning) !important;
  box-shadow: var(--shadow-md);
}
</style>
