<template>
  <div>
    <div class="catalog-layout">
      <!-- Left Column: Items Catalog -->
      <div class="catalog-main">
        <!-- Search & Category Filters -->
        <div class="card p-md mb-md toolbar-card filter-bar">
          <div class="search-input-box mb-md" style="position: relative; width: 100%;">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input
              type="text"
              v-model="searchQuery"
              :placeholder="searchPlaceholder"
              class="form-input search-input"
              style="padding-left: 42px; width: 100%; border-radius: var(--radius-md); font-size: var(--font-base);"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="search-clear-btn"
              @click="searchQuery = ''"
              title="ล้างคำค้นหา"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div class="flex gap-xs align-center flex-wrap">
            <button
              v-for="cat in categories"
              :key="cat.id"
              type="button"
              class="filter-pill"
              :class="{ active: selectedCategory === cat.id }"
              @click="selectedCategory = cat.id"
            >
              <span>{{ cat.label }}</span>
              <span v-if="getCategoryCount(cat.id) > 0" class="category-count">
                ({{ getCategoryCount(cat.id) }})
              </span>
            </button>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoadingItems" class="grid-cards">
          <div v-for="i in 6" :key="i" class="card item-card p-md" style="pointer-events: none;">
            <div class="flex flex-between align-center mb-sm">
              <div class="skeleton" style="width: 80px; height: 22px; border-radius: var(--radius-full);"></div>
              <div class="skeleton" style="width: 24px; height: 24px; border-radius: var(--radius-full);"></div>
            </div>
            <div class="skeleton mb-md" style="height: 135px; width: 100%; border-radius: var(--radius-md);"></div>
            <div class="skeleton mb-xs" style="width: 85%; height: 18px;"></div>
            <div class="skeleton mb-sm" style="width: 50%; height: 14px;"></div>
            <div class="skeleton" style="width: 100%; height: 42px; border-radius: var(--radius-md);"></div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredItems.length === 0" class="empty-state-box">
          <div class="empty-state-icon">
            <i class="fa-solid fa-box-open"></i>
          </div>
          <div class="empty-state-title">ไม่พบรายการสินค้า</div>
          <div class="empty-state-desc">ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น</div>
        </div>

        <!-- Items Grid -->
        <div v-else class="grid-cards">
          <div
            v-for="item in filteredItems"
            :key="item.id"
            class="card p-md item-card"
            :class="{
              'low-stock': item.quantity <= (item.min_stock_alert || 5),
              'item-out-of-stock': item.quantity <= 0,
              'in-cart': getCartQty(item.id) > 0
            }"
            @click="addItem(item)"
          >
            <span v-if="getCartQty(item.id) > 0" class="qty-badge">
              {{ getCartQty(item.id) }}
            </span>

            <div class="card-top-badges flex flex-between align-center">
              <span class="badge badge-neutral card-badge-category">
                {{ getCategoryLabel(item.category) }}
              </span>
              <span v-if="item.quantity <= 0" class="badge badge-danger card-badge-status" title="ของหมดสต็อก">
                <i class="fa-solid fa-xmark"></i>
              </span>
              <span v-else-if="item.quantity <= (item.min_stock_alert || 5)" class="badge badge-warning card-badge-status" title="ใกล้หมด">
                <i class="fa-solid fa-triangle-exclamation"></i>
              </span>
              <span v-else class="badge badge-success card-badge-status" title="พร้อมจ่าย">
                <i class="fa-solid fa-check"></i>
              </span>
            </div>

            <div class="item-img-container">
              <img
                v-if="item.image_url"
                :src="item.image_url"
                :alt="item.name"
                class="item-img"
                loading="lazy"
              />
              <div v-else class="item-img-placeholder">
                <i class="fa-solid fa-box-open"></i>
              </div>
            </div>

            <h4 class="item-name font-bold" :title="item.name">
              <div class="item-name-main">{{ getItemNameParts(item.name).main }}</div>
              <div class="item-name-sub" v-if="getItemNameParts(item.name).sub">
                {{ getItemNameParts(item.name).sub }}
              </div>
            </h4>

            <div class="item-meta-box">
              <div class="item-meta-row flex flex-between align-center text-xs py-1">
                <span class="item-meta-label text-secondary font-medium">ราคาเบิก:</span>
                <span class="font-bold text-primary item-cost-val" style="font-size: var(--font-base);">
                  ฿{{ formatNumber(item.cost_price) }} <span class="text-xs text-secondary font-normal item-unit-slash">/ {{ item.unit }}</span>
                </span>
              </div>

              <div class="item-meta-row flex flex-between align-center text-xs py-1">
                <span class="item-meta-label text-secondary font-medium flex align-center gap-xs">
                  <i class="fa-solid fa-cubes-stacked text-tertiary"></i>
                  <span>{{ stockLabel }}</span>
                </span>
                <span
                  class="font-bold item-stock-val"
                  :class="{
                    'text-danger': item.quantity <= 0,
                    'text-warning': item.quantity > 0 && item.quantity <= (item.min_stock_alert || 5),
                    'text-success': item.quantity > (item.min_stock_alert || 5)
                  }"
                  style="font-size: var(--font-base);"
                >
                  <span class="stock-prefix">เหลือ </span>{{ formatNumber(item.quantity) }} {{ item.unit }}
                </span>
              </div>

              <div v-if="item.pack_size > 1" class="item-meta-row flex flex-between align-center text-xs py-1">
                <span class="item-meta-label text-secondary font-medium flex align-center gap-xs">
                  <i class="fa-solid fa-arrows-rotate text-primary"></i>
                  <span>แปลงหน่วย:</span>
                </span>
                <span class="font-bold text-primary item-pack-val" style="font-size: var(--font-sm);">
                  1 {{ item.unit }} = {{ item.pack_size }} ชิ้น
                </span>
              </div>
            </div>

            <div class="card-footer-actions">
              <div v-if="getCartQty(item.id) > 0" class="flex align-center gap-xs w-full" @click.stop>
                <button type="button" class="qty-btn" @click="decreaseQty(getCartItem(item.id))" title="ลดจำนวน">-</button>
                <input
                  type="number"
                  inputmode="numeric"
                  min="1"
                  :max="item.quantity"
                  :value="getCartQty(item.id)"
                  @change="setCartQty(item, $event.target.value)"
                  @focus="$event.target.select()"
                  class="form-input text-center font-bold qty-card-input"
                  style="flex: 1; height: 38px; padding: 2px; font-size: var(--font-sm); border-radius: var(--radius-sm);"
                  title="พิมพ์จำนวนได้ทันที"
                />
                <button type="button" class="qty-btn" :disabled="getCartQty(item.id) >= item.quantity" @click="increaseQty(getCartItem(item.id))" title="เพิ่มจำนวน">+</button>
              </div>
              <button
                v-else
                type="button"
                class="btn-action btn-action-primary w-full"
                :disabled="item.quantity <= 0"
                @click.stop="addItem(item)"
              >
                <i class="fa-solid fa-plus-circle"></i>
                <span>{{ item.quantity > 0 ? addBtnText : 'ของหมดสต็อก' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Cart Sidebar -->
      <div class="card p-md cart-sidebar flex flex-col justify-between">
        <div>
          <div class="flex flex-between align-center mb-md pb-sm cart-header">
            <h4 class="font-bold text-base flex align-center gap-xs">
              <i :class="[cartIcon, 'text-primary']"></i>
              <span>{{ cartTitle }}</span>
              <span v-if="cart.length > 0" class="badge badge-primary font-bold">{{ cart.length }}</span>
            </h4>
            <button
              v-if="cart.length > 0"
              type="button"
              class="text-xs text-danger font-bold cursor-pointer clear-cart-btn flex align-center gap-xs"
              @click="clearCart"
            >
              <i class="fa-solid fa-trash-can"></i>
              <span>ล้างทั้งหมด</span>
            </button>
          </div>

          <slot name="cart-banner" />

          <div v-if="cart.length === 0" class="empty-state-box empty-state-compact">
            <div class="empty-state-icon empty-state-icon-sm">
              <i class="fa-solid fa-basket-shopping"></i>
            </div>
            <div class="empty-state-title text-sm">{{ emptyCartTitle }}</div>
            <div class="empty-state-desc text-xs">{{ emptyCartDesc }}</div>
          </div>

          <div v-else class="cart-items-list flex flex-col gap-sm">
            <div
              v-for="c in cart"
              :key="c.item_id"
              class="cart-row p-sm flex flex-col justify-between"
            >
              <div class="flex flex-between align-start gap-xs mb-xs">
                <div class="flex-1 min-w-0 pr-xs">
                  <div class="cart-item-name font-bold text-sm text-primary">
                    {{ getItemNameParts(c.item_name).main }}
                  </div>
                  <div v-if="getItemNameParts(c.item_name).sub" class="cart-item-sub text-xs text-secondary mt-1">
                    {{ getItemNameParts(c.item_name).sub }}
                  </div>
                  <div v-if="c.pack_size > 1" class="text-2xs text-primary font-bold mt-1">
                    <i class="fa-solid fa-arrows-rotate mr-1"></i> เติมสต็อก {{ c.quantity * c.pack_size }} ชิ้น
                  </div>
                </div>
                <div class="text-right flex-shrink-0 pl-xs">
                  <span class="font-bold text-sm text-primary">฿{{ formatNumber(c.quantity * c.cost_price) }}</span>
                </div>
              </div>

              <div class="flex flex-between align-center pt-xs cart-item-bottom">
                <span class="text-xs text-secondary">
                  ฿{{ formatNumber(c.cost_price) }} / {{ c.unit }}
                </span>

                <div class="flex align-center gap-xs flex-shrink-0">
                  <button type="button" class="qty-btn" @click="decreaseQty(c)" title="ลดจำนวน">-</button>
                  <input
                    type="number"
                    inputmode="numeric"
                    min="1"
                    :max="c.max_quantity"
                    v-model.number="c.quantity"
                    class="form-input text-center text-sm font-bold"
                    style="width: 58px; height: 32px; padding: 2px; border-radius: var(--radius-sm);"
                    @focus="$event.target.select()"
                    @change="validateCartQty(c)"
                  />
                  <button type="button" class="qty-btn" :disabled="c.quantity >= c.max_quantity" @click="increaseQty(c)" title="เพิ่มจำนวน">+</button>
                  <button v-if="showRemoveItemBtn" type="button" class="btn btn-ghost btn-xs text-danger ml-xs" @click="removeItem(c.item_id)">✕</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="cart-footer pt-md mt-md">
          <div class="form-group mb-md">
            <label class="form-label text-xs font-bold text-secondary mb-xs block">
              <i class="fa-solid fa-pen-to-square mr-1"></i> {{ notesLabel }}
            </label>
            <input
              type="text"
              :value="notes"
              @input="emit('update:notes', $event.target.value)"
              :placeholder="notesPlaceholder"
              class="form-input text-sm w-full"
            />
          </div>

          <div class="cart-total-row flex flex-between align-baseline mb-md pt-sm">
            <span class="text-sm font-bold text-secondary">มูลค่าต้นทุนรวม:</span>
            <span class="text-2xl font-bold text-primary">฿{{ formatNumber(totalCartCost) }}</span>
          </div>

          <button
            type="button"
            class="btn btn-primary w-full"
            :disabled="cart.length === 0 || isSubmitting || submitDisabled"
            @click="emit('submit')"
          >
            <i v-if="isSubmitting" class="fa-solid fa-spinner fa-spin mr-2"></i>
            <i v-else :class="[submitBtnIcon, 'mr-2']"></i>
            <span>{{ isSubmitting ? submittingText : submitBtnText }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile-only Docked Cart Bar -->
    <div v-if="cart.length > 0" class="cart-bar mobile-only-cart">
      <div class="cart-bar-inner">
        <div class="cart-info" @click="isMobileDrawerOpen = !isMobileDrawerOpen">
          <span class="cart-count">
            {{ totalCartQty }} รายการ
            <i :class="isMobileDrawerOpen ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up'" style="font-size: var(--font-xxs); margin-left: 2px;"></i>
          </span>
          <span class="cart-total">฿{{ formatNumber(totalCartCost) }}</span>
        </div>
        <button
          type="button"
          class="cart-pay-btn"
          :disabled="cart.length === 0 || isSubmitting || submitDisabled"
          @click="emit('submit')"
        >
          <i v-if="isSubmitting" class="fa-solid fa-spinner fa-spin"></i>
          <i v-else :class="submitBtnIcon"></i>
          <span>{{ isSubmitting ? mobileSubmittingText : mobileSubmitText }}</span>
        </button>
      </div>
    </div>

    <!-- Mobile-only Slide-up Cart Detail Panel -->
    <div
      v-if="cart.length > 0"
      class="cart-detail-panel mobile-only-cart"
      :class="{ hidden: !isMobileDrawerOpen }"
    >
      <div class="cart-detail-header">
        <span class="font-semibold text-md" style="display: flex; align-items: center; gap: 6px;">
          <i :class="cartIcon"></i> {{ mobileDrawerTitle || cartTitle }}
        </span>
        <button type="button" class="btn btn-ghost btn-sm text-danger" @click="clearCart">ล้างทั้งหมด</button>
      </div>

      <div style="overflow-y: auto; max-height: calc(45vh - 60px); padding-bottom: 16px;">
        <div
          v-for="c in cart"
          :key="c.item_id"
          class="cart-item animate-fade-in"
        >
          <div class="cart-item-info">
            <div class="cart-item-name">{{ getItemNameParts(c.item_name).main }}</div>
            <div class="cart-item-price">
              <div>฿{{ formatNumber(c.cost_price) }} × {{ c.quantity }} {{ c.unit }}</div>
              <div v-if="c.pack_size > 1" class="text-primary font-semibold" style="margin-top: 2px;">(เติม {{ c.quantity * c.pack_size }} ชิ้น)</div>
            </div>
          </div>
          <div class="cart-item-qty">
            <button type="button" class="qty-btn minus" @click="decreaseQty(c)">−</button>
            <span class="qty-value">{{ c.quantity }}</span>
            <button type="button" class="qty-btn" :disabled="c.quantity >= c.max_quantity" @click="increaseQty(c)">+</button>
          </div>
          <div class="cart-item-subtotal">
            ฿{{ formatNumber(c.quantity * c.cost_price) }}
          </div>
        </div>

        <div style="padding: 12px 20px;">
          <div class="font-bold text-sm text-primary flex align-center gap-xs" style="margin-bottom: 6px;">
            <i class="fa-solid fa-pen-to-square"></i> {{ notesLabel.replace(/:$/, '') }}
          </div>
          <input
            type="text"
            :value="notes"
            @input="emit('update:notes', $event.target.value)"
            :placeholder="notesPlaceholder"
            class="form-input"
            style="font-size: var(--font-sm); padding: 6px 12px; height: 36px; width: 100%; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-primary);"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { ui, formatNumber, getItemNameParts } from '../helpers';

const props = defineProps({
  items: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
  isLoadingItems: { type: Boolean, default: false },
  getCategoryLabel: { type: Function, required: true },
  cart: { type: Array, default: () => [] },
  notes: { type: String, default: '' },
  isSubmitting: { type: Boolean, default: false },
  submitDisabled: { type: Boolean, default: false },
  showRemoveItemBtn: { type: Boolean, default: false },
  searchPlaceholder: { type: String, default: 'ค้นหาชื่อสินค้า, วัตถุดิบ, ซอส, บรรจุภัณฑ์...' },
  stockLabel: { type: String, default: 'คงเหลือ:' },
  addBtnText: { type: String, default: 'เพิ่มลงรายการเบิก' },
  cartIcon: { type: String, default: 'fa-solid fa-cart-shopping' },
  cartTitle: { type: String, default: 'รายการที่ขอเบิก' },
  mobileDrawerTitle: { type: String, default: '' },
  emptyCartTitle: { type: String, default: 'ยังไม่มีรายการของในตะกร้า' },
  emptyCartDesc: { type: String, default: 'คลิกที่การ์ดสินค้าทางซ้ายเพื่อเพิ่มจำนวนลงรายการเบิก' },
  notesLabel: { type: String, default: 'บันทึก/เหตุผลในการเบิก (ถ้ามี):' },
  notesPlaceholder: { type: String, default: 'เช่น ของใกล้หมดสต็อก, เตรียมรับรอบเย็น' },
  submitBtnIcon: { type: String, default: 'fa-solid fa-paper-plane' },
  submitBtnText: { type: String, default: 'ยื่นคำขอเบิกของจากครัวกลาง' },
  submittingText: { type: String, default: 'กำลังส่งคำขอ...' },
  mobileSubmitText: { type: String, default: 'ยื่นขอเบิก' },
  mobileSubmittingText: { type: String, default: 'กำลังส่ง...' }
});

const emit = defineEmits(['update:cart', 'update:notes', 'submit']);

const searchQuery = ref('');
const selectedCategory = ref('all');
const isMobileDrawerOpen = ref(false);

const getCategoryCount = (catId) => {
  if (catId === 'all') return props.items.length;
  return props.items.filter(i => i.category === catId).length;
};

const filteredItems = computed(() => {
  return props.items.filter(item => {
    const matchCat = selectedCategory.value === 'all' || item.category === selectedCategory.value;
    const matchSearch = !searchQuery.value || item.name.toLowerCase().includes(searchQuery.value.toLowerCase());
    return matchCat && matchSearch;
  });
});

const getCartQty = (itemId) => {
  const found = props.cart.find(c => c.item_id === itemId);
  return found ? found.quantity : 0;
};

const getCartItem = (itemId) => {
  return props.cart.find(c => c.item_id === itemId);
};

const totalCartCost = computed(() => {
  return props.cart.reduce((sum, c) => sum + (Number(c.quantity) * Number(c.cost_price)), 0);
});

const totalCartQty = computed(() => {
  return props.cart.reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
});

const addItem = (item) => {
  if (item.quantity <= 0) {
    ui.showToast('สินค้าชิ้นนี้หมดสต็อกในครัวกลาง', 'warning');
    return;
  }
  const next = [...props.cart];
  const existing = next.find(c => c.item_id === item.id);
  if (existing) {
    if (existing.quantity >= item.quantity) {
      ui.showToast(`สูงสุด ${formatNumber(item.quantity)} ${item.unit} ตามสต็อกครัวกลาง`, 'warning');
      return;
    }
    existing.quantity += 1;
  } else {
    next.push({
      item_id: item.id,
      item_name: item.name,
      unit: item.unit,
      cost_price: item.cost_price,
      max_quantity: item.quantity,
      pack_size: item.pack_size || 1,
      linked_menu_item_name: item.linked_menu_item_name || '',
      quantity: 1
    });
  }
  emit('update:cart', next);
};

const setCartQty = (item, val) => {
  let num = parseInt(val, 10);
  if (isNaN(num) || num <= 0) num = 1;
  const max = Number(item.quantity) || 0;
  if (max > 0 && num > max) {
    num = max;
    ui.showToast(`สูงสุด ${formatNumber(max)} ${item.unit} ตามสต็อกครัวกลาง`, 'warning');
  }
  const next = [...props.cart];
  const existing = next.find(c => c.item_id === item.id);
  if (existing) {
    existing.quantity = num;
  } else {
    next.push({
      item_id: item.id,
      item_name: item.name,
      unit: item.unit,
      cost_price: item.cost_price,
      max_quantity: item.quantity,
      pack_size: item.pack_size || 1,
      linked_menu_item_name: item.linked_menu_item_name || '',
      quantity: num
    });
  }
  emit('update:cart', next);
};

const increaseQty = (c) => {
  const originalItem = props.items.find(i => i.id === c.item_id);
  const maxQty = originalItem ? originalItem.quantity : c.max_quantity;
  if (maxQty && c.quantity >= maxQty) {
    ui.showToast(`สูงสุด ${formatNumber(maxQty)} ${c.unit} ตามสต็อกครัวกลาง`, 'warning');
    return;
  }
  c.quantity += 1;
};

const decreaseQty = (c) => {
  if (c.quantity > 1) {
    c.quantity -= 1;
  } else {
    emit('update:cart', props.cart.filter(x => x.item_id !== c.item_id));
  }
};

const removeItem = (itemId) => {
  emit('update:cart', props.cart.filter(x => x.item_id !== itemId));
};

const validateCartQty = (c) => {
  if (!c.quantity || c.quantity < 1) c.quantity = 1;
  const originalItem = props.items.find(i => i.id === c.item_id);
  const maxQty = originalItem ? originalItem.quantity : c.max_quantity;
  if (maxQty && c.quantity > maxQty) {
    c.quantity = maxQty;
    ui.showToast(`ปรับเป็นจำนวนสูงสุดที่มีในคลัง (${maxQty} ${c.unit})`, 'warning');
  }
};

const clearCart = () => {
  emit('update:cart', []);
  emit('update:notes', '');
};

watch(() => props.cart, (newCart) => {
  const hasItems = newCart.length > 0;
  window.dispatchEvent(new CustomEvent('cart-state-change', { detail: { hasItems } }));
  if (!hasItems) {
    isMobileDrawerOpen.value = false;
  }
}, { deep: true });

onUnmounted(() => {
  window.dispatchEvent(new CustomEvent('cart-state-change', { detail: { hasItems: false } }));
});
</script>

<style scoped>
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
    width: 380px;
    flex-shrink: 0;
    position: sticky;
    top: calc(var(--header-height, 60px) + 16px);
    max-height: calc(100vh - 96px);
  }
  .cart-sidebar > div:first-child {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1;
  }
  .cart-items-list {
    flex: 1;
    min-height: 120px;
    max-height: none !important;
  }
  .mobile-only-cart {
    display: none !important;
  }
}

@media (max-width: 1023px) {
  .cart-sidebar {
    display: none !important;
  }
  .catalog-layout {
    padding-bottom: calc(var(--bottom-nav-height, 60px) + var(--safe-bottom, 0px) + var(--cart-bar-height, 60px) + 35px) !important;
  }
}

.filter-bar {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
}

.filter-bar .category-tabs {
  flex-wrap: wrap !important;
  overflow-x: visible !important;
}

.search-input-box {
  position: relative;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  pointer-events: none;
}

.search-input {
  height: 44px;
  padding-left: 42px;
  padding-right: 36px;
  width: 100%;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  font-size: var(--font-base);
  transition: all var(--transition-base);
}

.search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(139, 3, 19, 0.1);
  outline: none;
}

.category-count {
  font-size: 0.85em;
  opacity: 0.85;
  font-weight: 500;
}

.grid-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-md);
}

.item-card {
  position: relative !important;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
  cursor: pointer;
}

.item-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-color-focus);
}

.item-card.item-out-of-stock {
  opacity: 0.7;
}

.item-card.in-cart {
  background: var(--card-bg, #ffffff) !important;
  border: 2px solid var(--primary) !important;
  box-shadow: 0 4px 14px rgba(139, 3, 19, 0.12);
}

.qty-badge {
  display: flex !important;
  position: absolute;
  top: -8px;
  right: -8px;
  width: 26px;
  height: 26px;
  background: var(--primary, #8b0313);
  color: #ffffff;
  font-size: var(--font-xs);
  font-weight: 700;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 10px rgba(139, 3, 19, 0.45);
  border: 2px solid #ffffff;
  z-index: 10;
}

.card-top-badges {
  margin-bottom: var(--space-sm);
  width: 100%;
}

.card-badge-category {
  font-size: var(--font-xs) !important;
  padding: 3px 10px !important;
  border-radius: var(--radius-full) !important;
  background: var(--bg-secondary) !important;
  color: var(--text-secondary) !important;
  border: 1px solid var(--border-color) !important;
}

.card-badge-status {
  width: 26px;
  height: 26px;
  min-width: 26px;
  border-radius: var(--radius-full) !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 12px !important;
  padding: 0 !important;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.item-img-container {
  height: 135px;
  width: 100%;
  margin-bottom: var(--space-sm);
  background: linear-gradient(180deg, #fff7df 0%, #fceecc 100%);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.item-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.item-card:hover .item-img {
  transform: scale(1.05);
}

.item-img-placeholder {
  font-size: 2.6rem;
  opacity: 0.4;
  color: var(--text-tertiary);
}

.item-name {
  font-size: var(--font-base);
  line-height: 1.35;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
  width: 100%;
}

.item-name-main {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 700;
}

.item-name-sub {
  font-size: var(--font-xs);
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.item-meta-box {
  border-top: 1px dashed var(--border-color);
  padding-top: var(--space-xs);
  margin-bottom: var(--space-sm);
  width: 100%;
}

.card-footer-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  width: 100%;
  margin-top: auto;
}

.card-footer-actions > .btn-action {
  height: 42px !important;
  width: 100% !important;
  font-size: var(--font-sm) !important;
  min-width: unset !important;
}

.cart-sidebar {
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  box-sizing: border-box;
}

.cart-header {
  border-bottom: 1px solid var(--border-color);
}

.clear-cart-btn {
  background: none;
  border: none;
  padding: 4px;
  font-size: var(--font-xs);
  transition: opacity var(--transition-base);
}

.clear-cart-btn:hover {
  text-decoration: underline;
  opacity: 0.8;
}

.cart-items-list {
  max-height: 420px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

.cart-row {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  transition: all var(--transition-base);
  width: 100%;
  box-sizing: border-box;
}

.cart-row:hover {
  border-color: var(--primary-light, #c92a2a);
}

.cart-item-name {
  line-height: 1.35;
  word-break: break-word;
}

.cart-item-sub {
  line-height: 1.3;
  word-break: break-word;
}

.cart-item-bottom {
  border-top: 1px dashed rgba(139, 3, 19, 0.15);
  margin-top: 10px;
  padding-top: 8px;
}

.cart-total-row {
  border-top: 1px dashed var(--border-color);
}

.empty-state-box {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
  width: 100%;
}

.empty-state-box.empty-state-compact {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 24px 16px;
}

.empty-state-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(139, 3, 19, 0.05);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  margin: 0 auto 16px auto;
  flex-shrink: 0;
}

.empty-state-icon.empty-state-icon-sm {
  width: 48px;
  height: 48px;
  font-size: var(--font-lg);
  margin-bottom: 10px;
}

.empty-state-title {
  font-size: var(--font-md);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
  line-height: 1.3;
}

.empty-state-desc {
  font-size: var(--font-sm);
  color: var(--text-secondary);
  max-width: 440px;
  margin: 0 auto;
  line-height: 1.5;
}

.stock-prefix {
  display: none;
}

.qty-badge,
.category-count,
.item-cost-val,
.item-stock-val,
.cart-total-row,
.cart-info {
  font-variant-numeric: tabular-nums;
}

@media (max-width: 768px) {
  .filter-bar {
    padding: var(--space-sm) !important;
  }

  .grid-cards {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 8px !important;
    width: 100% !important;
  }

  .item-card {
    padding: 8px !important;
    border-radius: var(--radius-lg) !important;
  }

  .card-top-badges {
    margin-bottom: 6px !important;
  }

  .card-badge-category {
    font-size: var(--font-xxs) !important;
    padding: 2px 6px !important;
    max-width: calc(100% - 26px) !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  .card-badge-status {
    width: 20px !important;
    height: 20px !important;
    min-width: 20px !important;
    font-size: var(--font-xxs) !important;
  }

  .item-img-container {
    height: 115px !important;
    margin-bottom: 6px !important;
  }

  .stock-prefix {
    display: inline !important;
  }

  .card-footer-actions > .btn-action {
    height: 34px !important;
    min-height: 34px !important;
    font-size: var(--font-xs) !important;
    font-weight: 700 !important;
    padding: 0 6px !important;
  }

  .qty-badge {
    top: -6px;
    right: -6px;
    width: 24px;
    height: 24px;
  }
}

@media (max-width: 640px) {
  .item-img-container { height: 100px !important; }
  .item-name, .item-name-main { font-size: var(--font-sm) !important; }
  .item-meta-label, .item-unit-slash { font-size: var(--font-xxs) !important; }
  .item-cost-val, .item-stock-val { font-size: var(--font-sm) !important; white-space: nowrap !important; }
  .item-pack-val { font-size: var(--font-xxs) !important; white-space: nowrap !important; }
}
</style>
