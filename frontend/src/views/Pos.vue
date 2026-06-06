<template>
  <div id="pos-page" class="page-enter pos-split-container">
    
    <!-- Left Side: Product Menu Section (Visible on all screens, flex:1) -->
    <div class="pos-menu-section">
      <!-- Category Tabs -->
      <div class="category-tabs" id="pos-category-tabs">
        <button 
          class="category-tab" 
          :class="{ 'active': activeCategory === 'all' }"
          @click="activeCategory = 'all'"
        >
          ทั้งหมด
        </button>
        <button 
          v-for="cat in categories" 
          :key="cat.id" 
          class="category-tab"
          :class="{ 'active': activeCategory === String(cat.id) }"
          @click="activeCategory = String(cat.id)"
        >
          {{ cat.name }}
        </button>
      </div>

      <!-- Menu Grid -->
      <div class="pos-grid" :class="{ 'stagger-children': isVisualStaggerActive }" id="pos-menu-grid">
        <!-- Skeleton loader while loading -->
        <template v-if="loading">
          <div v-for="i in 8" :key="i" class="pos-item skeleton-card" style="pointer-events:none;">
            <!-- Matches pos-item-img-container -->
            <div class="pos-item-img-container">
              <div class="skeleton" style="width:100%; height:100%;"></div>
            </div>
            <!-- Matches pos-item-name -->
            <div class="pos-item-name">
              <div class="skeleton" style="width:80%; height:16px; border-radius:4px; margin:0 auto;"></div>
            </div>
            <!-- Matches pos-item-details -->
            <div class="pos-item-details">
              <div class="skeleton" style="width:50%; height:18px; border-radius:4px; margin:0 auto;"></div>
              <div class="skeleton" style="width:35%; height:12px; border-radius:4px; margin:var(--space-xs) auto 0;"></div>
            </div>
          </div>
        </template>

        <!-- Render menu items when ready -->
        <template v-else>
          <div 
            v-for="item in filteredMenuItems" 
            :key="item.id" 
            class="pos-item"
            :class="{ 'in-cart': getCartQty(item.id) > 0, 'out-of-stock': isOutOfStock(item) }"
            @click="addToCart(item)"
            :id="'pos-item-' + item.id"
          >
            <!-- Floating Quantity Badge -->
            <span v-if="getCartQty(item.id) > 0" class="qty-badge">
              {{ getCartQty(item.id) }}
            </span>

            <!-- Product Image / Styled Emoji Placeholder -->
            <div class="pos-item-img-container">
              <img v-if="item.image_url" :src="item.image_url" class="pos-item-img" alt="เมนู" />
              <div v-else class="pos-item-placeholder">{{ getEmojiPlaceholder(item.category_id) }}</div>
            </div>

            <!-- Product Name -->
            <div class="pos-item-name">{{ item.name }}</div>

            <!-- Product Price & Stock in stable container -->
            <div class="pos-item-details">
              <div class="pos-item-price">{{ formatCurrency(item.price) }}</div>
              <div v-if="item.stock !== null && item.stock !== undefined" class="pos-item-stock" :class="{ 'low-stock': isLowStock(item) }">
                <span v-if="item.stock <= 0">❌ หมด</span>
                <span v-else-if="isLowStock(item)">⚠️ ใกล้หมด (เหลือ {{ item.stock }})</span>
                <span v-else>เหลือ {{ item.stock }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Empty State -->
      <div v-if="!loading && filteredMenuItems.length === 0" id="pos-empty" class="empty-state">
        <div class="empty-state-icon">🍗</div>
        <div class="empty-state-title">ยังไม่มีเมนู</div>
        <div class="empty-state-desc">เพิ่มเมนูอาหารในหน้า "จัดการเมนู" เพื่อเริ่มต้นการขาย</div>
      </div>
    </div>

    <!-- Right Side: Persistent Cart Section (Visible on Desktop only) -->
    <div class="pos-cart-section-desktop">
      <div class="desktop-cart-card">
        <div class="desktop-cart-header">
          <h3 class="font-bold flex align-center gap-sm" style="font-size: var(--font-base); display:flex; align-items:center;">
            <span>🛒 รายการสั่งซื้อ</span>
            <span class="badge badge-primary" style="margin-left: 6px;" v-if="cartCount > 0">{{ cartCount }} รายการ</span>
          </h3>
          <button class="btn btn-ghost btn-sm text-danger" v-if="cart.size > 0" @click="handleClearCart">ล้างทั้งหมด</button>
        </div>

        <!-- Cart items list (Scrollable) -->
        <div class="desktop-cart-items" v-if="cart.size > 0">
          <div v-for="[itemId, cartItem] in cart" :key="itemId" class="desktop-cart-item animate-fade-in">
            <div class="cart-item-details">
              <div class="cart-item-name" :title="cartItem.item.name">{{ cartItem.item.name }}</div>
              <div class="cart-item-price-row">
                {{ formatCurrency(cartItem.item.price) }}
              </div>
            </div>
            <div class="cart-item-qty">
              <button class="qty-btn minus" @click="removeFromCart(itemId)">−</button>
              <span class="qty-value text-center">{{ cartItem.quantity }}</span>
              <button class="qty-btn" @click="addToCart(cartItem.item)">+</button>
            </div>
            <div class="cart-item-subtotal">
              {{ formatCurrency(cartItem.item.price * cartItem.quantity) }}
            </div>
          </div>
        </div>

        <!-- Empty state for Desktop cart -->
        <div class="desktop-cart-empty" v-else>
          <div style="font-size: 3rem; margin-bottom: var(--space-md); opacity:0.6;">🍗</div>
          <p class="font-semibold text-secondary">ไม่มีสินค้าในตะกร้า</p>
          <p class="text-muted mt-sm" style="font-size: var(--font-xs);">เลือกเมนูอาหารด้านซ้าย<br/>เพื่อเริ่มการสั่งซื้อ</p>
        </div>

        <!-- Checkout summary -->
        <div class="desktop-cart-summary" v-if="cart.size > 0">
          <!-- Free Modifiers Toggle & Pills inside Desktop summary -->
          <div class="free-modifiers-section mb-md p-sm card" style="border: 1px dashed var(--border-color); background: rgba(255, 247, 223, 0.3); border-radius: var(--radius-md);">
            <div class="flex flex-between align-center">
              <span class="font-semibold" style="font-size: var(--font-sm); display: flex; align-items: center; gap: 4px; color: var(--text-primary);">
                🧂 รับซอส/ผง/น้ำจิ้ม
              </span>
              <label class="switch-toggle">
                <input type="checkbox" v-model="useModifiers" @change="onModifiersToggleChange" />
                <span class="slider-toggle"></span>
              </label>
            </div>

            <!-- Expanded Options Panel -->
            <div v-if="useModifiers" class="modifiers-options-panel mt-sm animate-fade-in" style="max-height: 200px; overflow-y: auto; text-align: left;">
              <!-- Presets -->
              <div v-if="activePresets.length > 0" class="presets-row mb-sm">
                <div class="text-muted mb-xs" style="font-size: 10px; font-weight: bold;">สูตรสำเร็จ (Presets):</div>
                <div class="flex gap-xs" style="flex-wrap: wrap;">
                  <button 
                    v-for="preset in activePresets" 
                    :key="preset.id" 
                    class="btn btn-sm btn-secondary preset-btn"
                    @click="applyPreset(preset)"
                    type="button"
                    style="padding: 4px 8px; font-size: 11px; min-height: 28px;"
                  >
                    ✨ {{ preset.name }}
                  </button>
                </div>
              </div>

              <!-- Modifiers Categories -->
              <div class="modifiers-categories" style="display: flex; flex-direction: column; gap: var(--space-xs);">
                <template v-for="cat in modifierCategories" :key="cat.key">
                  <div v-if="getModifiersByCategory(cat.key).length > 0" class="modifier-cat-group">
                    <div class="text-secondary mb-xs font-semibold" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                      {{ cat.label }}:
                    </div>
                    <div class="flex gap-xs" style="flex-wrap: wrap; margin-bottom: 6px;">
                      <button
                        v-for="mod in getModifiersByCategory(cat.key)"
                        :key="mod.id"
                        class="pill-btn"
                        :class="{ 'active': isModifierSelected(mod), 'out-of-stock': mod.total_servings <= 0 }"
                        @click="toggleModifierSelection(mod)"
                        type="button"
                      >
                        {{ mod.name }} 
                        <span class="stock-badge">
                          ({{ formatModifierStockShort(mod) }})
                        </span>
                      </button>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <div class="summary-row">
            <span class="text-secondary">ยอดรวม</span>
            <span class="font-medium">{{ formatCurrency(cartTotal) }}</span>
          </div>
          <div class="summary-row total-row font-bold mt-sm">
            <span>ยอดสุทธิ</span>
            <span class="text-accent" style="font-size: var(--font-lg);">{{ formatCurrency(cartTotal) }}</span>
          </div>
          <button class="btn btn-primary btn-block mt-lg" @click="handleCheckout">
            💰 ชำระเงิน
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile-only Floating Cart Elements (Visible on Mobile) -->
    <div id="cart-bar" class="cart-bar mobile-only-cart" :class="{ 'hidden': cart.size === 0 }">
      <div class="cart-bar-inner">
        <div class="cart-info" style="cursor:pointer;" @click="toggleCartDetail">
          <span class="cart-count">{{ cartCount }} รายการ</span>
          <span class="cart-total">{{ formatCurrency(cartTotal) }}</span>
        </div>
        <button class="cart-pay-btn" @click="handleCheckout">
          💰 ชำระเงิน
        </button>
      </div>
    </div>

    <div id="cart-detail-panel" class="cart-detail-panel mobile-only-cart" :class="{ 'hidden': !cartExpanded || cart.size === 0 }">
      <div class="cart-detail-header">
        <span class="font-semibold" style="font-size: var(--font-md);">🛒 รายการสั่งซื้อ</span>
        <button class="btn btn-ghost btn-sm text-danger" @click="handleClearCart">ล้างทั้งหมด</button>
      </div>
      
      <div id="cart-items-list" style="overflow-y: auto; max-height: calc(45vh - 75px); padding-bottom: 0px;">
        <div v-for="[itemId, cartItem] in cart" :key="itemId" class="cart-item animate-fade-in">
          <div class="cart-item-info">
            <div class="cart-item-name">{{ cartItem.item.name }}</div>
            <div class="cart-item-price">
              {{ formatCurrency(cartItem.item.price) }} × {{ cartItem.quantity }}
            </div>
          </div>
          <div class="cart-item-qty">
            <button class="qty-btn minus" @click="removeFromCart(itemId)">−</button>
            <span class="qty-value">{{ cartItem.quantity }}</span>
            <button class="qty-btn" @click="addToCart(cartItem.item)">+</button>
          </div>
          <div class="cart-item-subtotal">
            {{ formatCurrency(cartItem.item.price * cartItem.quantity) }}
          </div>
        </div>

        <!-- Mobile Free Modifiers Toggle & Pills -->
        <div class="free-modifiers-section" :style="{ 
          borderTop: '1px dashed var(--border-color)', 
          background: 'rgba(255, 247, 223, 0.3)', 
          padding: useModifiers ? '16px 20px 80px 20px' : '16px 20px 36px 20px', 
          marginBottom: '0px' 
        }">
          <div class="flex flex-between align-center" style="margin-bottom: 8px;">
            <span class="font-bold" style="font-size: 14px; display: flex; align-items: center; gap: 6px; color: var(--text-primary);">
              🧂 รับซอส/ผง/น้ำจิ้ม
            </span>
            <label class="switch-toggle">
              <input type="checkbox" v-model="useModifiers" @change="onModifiersToggleChange" />
              <span class="slider-toggle"></span>
            </label>
          </div>

          <!-- Expanded Options Panel -->
          <div v-if="useModifiers" class="modifiers-options-panel mt-md animate-fade-in" style="text-align: left; display: flex; flex-direction: column; gap: 12px; padding-left: 4px;">
            <!-- Presets -->
            <div v-if="activePresets.length > 0" class="presets-row">
              <div class="text-secondary font-bold" style="font-size: 12px; margin-bottom: 6px; color: var(--text-secondary); margin-left: 4px;">สูตรสำเร็จ (Presets):</div>
              <div class="flex gap-xs" style="flex-wrap: wrap; padding-left: 4px;">
                <button 
                  v-for="preset in activePresets" 
                  :key="preset.id" 
                  class="btn btn-sm btn-secondary preset-btn"
                  @click="applyPreset(preset)"
                  type="button"
                  style="padding: 6px 12px; font-size: 12px; min-height: 32px; border-radius: var(--radius-md);"
                >
                  ✨ {{ preset.name }}
                </button>
              </div>
            </div>

            <!-- Modifiers Categories -->
            <div class="modifiers-categories" style="display: flex; flex-direction: column; gap: 12px;">
              <template v-for="cat in modifierCategories" :key="cat.key">
                <div v-if="getModifiersByCategory(cat.key).length > 0" class="modifier-cat-group">
                  <div class="text-secondary font-bold" style="font-size: 12px; margin-bottom: 6px; color: var(--text-secondary); margin-left: 4px;">
                    {{ cat.label }}:
                  </div>
                  <div class="flex gap-xs" style="flex-wrap: wrap; padding-left: 4px;">
                    <button
                      v-for="mod in getModifiersByCategory(cat.key)"
                      :key="mod.id"
                      class="pill-btn"
                      :class="{ 'active': isModifierSelected(mod), 'out-of-stock': mod.total_servings <= 0 }"
                      @click="toggleModifierSelection(mod)"
                      type="button"
                      style="padding: 6px 12px; font-size: 12px; border-radius: var(--radius-full);"
                    >
                      {{ mod.name }} 
                      <span class="stock-badge" style="font-size: 10px; opacity: 0.8;">
                        ({{ formatModifierStockShort(mod) }})
                      </span>
                    </button>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Payment Component Modal Overlay -->
    <PaymentModal 
      v-if="showPaymentModal"
      :cart="cart"
      :total="cartTotal"
      :freeModifiers="selectedModifiers"
      @close="showPaymentModal = false"
      @success="onPaymentSuccess"
    />

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import api from '../api';
import { ui, formatCurrency } from '../helpers';
import PaymentModal from '../components/PaymentModal.vue';
import { store } from '../store';

// Reactive States
const menuItems = computed(() => {
  return store.menuItems.filter(item => item.active !== 0 && item.active !== false);
});
const categories = computed(() => store.categories);
const cart = ref(new Map()); // itemId -> { item, quantity }
const activeCategory = ref('all');
const cartExpanded = ref(false);
const showPaymentModal = ref(false);
const loading = ref(true);
const isVisualStaggerActive = ref(true);

// Computed variables
const filteredMenuItems = computed(() => {
  if (activeCategory.value === 'all') {
    return menuItems.value;
  }
  return menuItems.value.filter(item => String(item.category_id) === activeCategory.value);
});

const cartCount = computed(() => {
  let count = 0;
  cart.value.forEach(cartItem => {
    count += cartItem.quantity;
  });
  return count;
});

const cartTotal = computed(() => {
  let total = 0;
  cart.value.forEach(cartItem => {
    total += cartItem.item.price * cartItem.quantity;
  });
  return total;
});

// Watch cart to emit event to App.vue (updating app padding)
watch(cartCount, (newVal) => {
  const event = new CustomEvent('cart-state-change', {
    detail: { hasItems: newVal > 0 }
  });
  window.dispatchEvent(event);
}, { immediate: true });

// Cart Logic
const getCartQty = (itemId) => {
  const cartItem = cart.value.get(itemId);
  return cartItem ? cartItem.quantity : 0;
};

const isOutOfStock = (item) => {
  return item.stock !== null && item.stock !== undefined && item.stock <= 0;
};

const isLowStock = (item) => {
  return item.stock !== null && item.stock !== undefined && item.stock > 0 && item.stock <= store.lowStockThreshold;
};

const addToCart = (item) => {
  const itemId = item.id;
  
  // Check stock limit
  if (item.stock !== null && item.stock !== undefined) {
    const currentQty = getCartQty(itemId);
    if (currentQty >= item.stock) {
      ui.showToast('สต็อกสินค้านี้ไม่เพียงพอ', 'warning');
      return;
    }
  }

  const currentCart = new Map(cart.value);
  if (currentCart.has(itemId)) {
    currentCart.get(itemId).quantity += 1;
  } else {
    currentCart.set(itemId, { item, quantity: 1 });
  }
  cart.value = currentCart;

  // Visual feedback animation (flash)
  const el = document.getElementById(`pos-item-${itemId}`);
  if (el) {
    el.classList.add('added-flash');
    setTimeout(() => el.classList.remove('added-flash'), 400);
  }
};

const removeFromCart = (itemId) => {
  const currentCart = new Map(cart.value);
  if (!currentCart.has(itemId)) return;

  const cartItem = currentCart.get(itemId);
  cartItem.quantity -= 1;

  if (cartItem.quantity <= 0) {
    currentCart.delete(itemId);
  }
  cart.value = currentCart;

  if (cart.value.size === 0) {
    cartExpanded.value = false;
  }
};

const handleClearCart = async () => {
  const confirm = await ui.showConfirm('ล้างตะกร้า', 'ต้องการล้างรายการสินค้าในตะกร้าทั้งหมดหรือไม่?');
  if (confirm) {
    cart.value = new Map();
    cartExpanded.value = false;
    ui.showToast('ล้างตะกร้าสินค้าแล้ว', 'info');
  }
};

const toggleCartDetail = () => {
  if (cart.value.size > 0) {
    cartExpanded.value = !cartExpanded.value;
  }
};

const handleCheckout = () => {
  if (cart.value.size > 0) {
    showPaymentModal.value = true;
  }
};

// Callback when payment completes successfully
const onPaymentSuccess = async () => {
  cart.value = new Map();
  cartExpanded.value = false;
  showPaymentModal.value = false;
  useModifiers.value = false;
  selectedModifiers.value = [];
  try {
    ui.showLoading();
    await store.fetchMenu(true); // Force reload menu to update stock counts!
    await loadModifiersAndPresets(); // Reload modifier stocks!
  } catch (e) {
    console.error(e);
  } finally {
    ui.hideLoading();
  }
};

// Load Menu & Categories from API
const loadMenuData = async () => {
  try {
    await store.fetchMenu();
  } catch (error) {
    console.error('Failed to load menu:', error);
    ui.showToast('ไม่สามารถดึงข้อมูลเมนูร้านค้าได้', 'error');
  }
  
  try {
    // Load stock to fetch the low stock threshold from DB/settings
    await store.fetchStock();
  } catch (error) {
    console.warn('Failed to load stock threshold:', error);
  }

  loading.value = false;
  // Turn off stagger animation after it finishes to prevent re-triggering on click updates
  setTimeout(() => {
    isVisualStaggerActive.value = false;
  }, 1000);
};

// Fallback emoji based on category id
const getEmojiPlaceholder = (categoryId) => {
  const emojiMap = {
    '1': '🍗', // เมนูหลัก (ไก่ทอด)
    '2': '🍟', // ของทานเล่น
    '3': '🥤', // เครื่องดื่ม
    '4': '🌶️'  // อื่นๆ
  };
  return emojiMap[String(categoryId)] || '🍗';
};

// Free Modifiers Logic & State
const useModifiers = ref(false);
const selectedModifiers = ref([]);
const activePresets = ref([]);
const allModifiers = ref([]);

const modifierCategories = [
  { key: 'sauce_small', label: 'ซอส (ซองเล็ก)' },
  { key: 'sauce_large', label: 'ซอส (ถุงใหญ่)' },
  { key: 'dipping', label: 'น้ำจิ้ม' },
  { key: 'powder', label: 'ผงปรุงรส' }
];

const getModifiersByCategory = (category) => {
  return allModifiers.value.filter(m => m.category === category);
};

const formatModifierStockShort = (item) => {
  if (!item) return '';
  if (item.category === 'sauce_small') {
    return `${item.total_servings}ซ.`;
  }
  const servingsPerBag = item.servings_per_bag || 50;
  const bags = Math.floor(item.total_servings / servingsPerBag);
  const servings = item.total_servings % servingsPerBag;
  
  let text = '';
  if (bags > 0) text += `${bags}ถ.`;
  if (servings > 0 || bags === 0) {
    if (text) text += ' ';
    text += `${servings}ร.`;
  }
  return text;
};

const toggleModifierSelection = (mod) => {
  const idx = selectedModifiers.value.findIndex(m => m.id === mod.id);
  if (idx > -1) {
    selectedModifiers.value.splice(idx, 1);
  } else {
    selectedModifiers.value.push({ id: mod.id, name: mod.name });
  }
};

const isModifierSelected = (mod) => {
  return selectedModifiers.value.some(m => m.id === mod.id);
};

const applyPreset = (preset) => {
  selectedModifiers.value = [];
  preset.modifier_ids.forEach(id => {
    const mod = allModifiers.value.find(m => m.id === Number(id));
    if (mod && mod.total_servings > 0) {
      selectedModifiers.value.push({ id: mod.id, name: mod.name });
    }
  });
};

const onModifiersToggleChange = () => {
  if (!useModifiers.value) {
    selectedModifiers.value = [];
  }
};

const loadModifiersAndPresets = async () => {
  try {
    const [modRes, presetRes] = await Promise.all([
      api.freeModifiers.getAll(),
      api.freeModifiers.getPresets()
    ]);
    if (modRes.success) {
      allModifiers.value = (modRes.data || []).filter(m => m.active);
    }
    if (presetRes.success) {
      activePresets.value = (presetRes.data || []).filter(p => p.active);
    }
  } catch (e) {
    console.error('Failed to load modifiers/presets:', e);
  }
};

onMounted(() => {
  loadMenuData();
  loadModifiersAndPresets();
});

onUnmounted(() => {
  // Make sure cart-bar-height padding is cleared on unmount
  const event = new CustomEvent('cart-state-change', {
    detail: { hasItems: false }
  });
  window.dispatchEvent(event);
});
</script>

<style scoped>
/* --- Category Tabs --- */
.category-tabs {
  display: flex;
  gap: var(--space-sm);
  overflow-x: auto;
  padding-bottom: var(--space-md);
  margin-bottom: var(--space-lg);
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
}

.category-tabs::-webkit-scrollbar {
  display: none;
}

.category-tab {
  padding: var(--space-sm) var(--space-lg);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  font-size: var(--font-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
  white-space: nowrap;
  transition: all var(--transition-base);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.category-tab:active {
  transform: scale(0.97);
}

.category-tab.active {
  background: var(--gradient-primary);
  color: white;
  border-color: transparent;
  box-shadow: var(--shadow-glow-primary);
}

/* --- POS Grid --- */
.pos-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
}

.pos-item {
  position: relative;
  background: var(--card-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-sm);
  text-align: center;
  transition: background var(--transition-base), border-color var(--transition-base), box-shadow var(--transition-base), transform var(--transition-base);
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  overflow: visible;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-xs);
  min-height: 180px;
}

.pos-item:active {
  transform: scale(0.97);
}

.pos-item.in-cart {
  border-color: var(--primary);
  background: rgba(139, 3, 19, 0.05);
  box-shadow: inset 0 0 20px rgba(139, 3, 19, 0.03);
}

.pos-item.out-of-stock {
  opacity: 0.35;
  pointer-events: none;
}

/* Image container for retro POS grid items */
.pos-item-img-container {
  width: 100%;
  height: 95px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border: 1px solid rgba(139, 3, 19, 0.04);
}

.pos-item-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-slow);
}

.pos-item:hover .pos-item-img {
  transform: scale(1.06);
}

.pos-item-placeholder {
  font-size: 2rem;
  filter: drop-shadow(0 2px 4px rgba(61, 27, 17, 0.15));
}

.pos-item-name {
  font-size: var(--font-sm);
  font-weight: var(--font-weight-semibold);
  line-height: 1.25;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 2.5em;
  width: 100%;
  padding: 0 var(--space-xs);
  overflow: hidden;
}

.pos-item-price {
  font-size: var(--font-base);
  font-weight: var(--font-weight-bold);
  color: var(--primary-light);
}

.pos-item-stock {
  font-size: 0.65rem;
  color: var(--text-tertiary);
  font-weight: var(--font-weight-medium);
}

.pos-item-stock.low-stock {
  color: var(--primary-light);
  font-weight: var(--font-weight-bold);
  background: rgba(173, 40, 30, 0.08);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  border: 1px dashed rgba(173, 40, 30, 0.25);
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-top: 2px;
  animation: pulse-warning 2.5s infinite ease-in-out;
}

@keyframes pulse-warning {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.85;
    transform: scale(0.98);
  }
}

.pos-item-details {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  width: 100%;
}

.pos-item.added-flash::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(139, 3, 19, 0.15);
  border-radius: var(--radius-lg);
  animation: itemFlash 0.4s ease forwards;
  pointer-events: none;
  z-index: 1;
}

/* --- Cart Bar --- */
.cart-bar {
  position: fixed;
  bottom: calc(var(--bottom-nav-height) + var(--safe-bottom));
  left: 0;
  right: 0;
  margin: 0 auto;
  width: 100%;
  max-width: var(--max-width);
  padding: var(--space-md) var(--space-lg);
  background: rgba(139, 3, 19, 0.96);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-top: 2px solid var(--accent);
  z-index: 50;
  animation: slideUp 0.3s ease;
}

.cart-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  width: 100% !important; /* Ensure it expands to full width to push payment button right */
}

.cart-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cart-count {
  font-size: var(--font-sm);
  color: rgba(255, 247, 223, 0.85);
}

.cart-total {
  font-size: var(--font-xl);
  font-weight: var(--font-weight-bold);
  color: var(--accent);
}

.cart-pay-btn {
  padding: var(--space-md) var(--space-2xl);
  background: var(--accent);
  color: var(--primary-dark);
  font-weight: var(--font-weight-bold);
  border-radius: var(--radius-md);
  box-shadow: 0 0 15px rgba(255, 171, 43, 0.3);
}

.cart-pay-btn:active {
  transform: scale(0.96);
  box-shadow: 0 0 25px rgba(255, 171, 43, 0.5);
}

/* --- Cart Detail Panel --- */
.cart-detail-panel {
  position: fixed;
  bottom: calc(var(--bottom-nav-height) + var(--safe-bottom) + var(--cart-bar-height) - 16px);
  left: 0;
  right: 0;
  margin: 0 auto;
  width: 100%;
  max-width: var(--max-width);
  max-height: 45vh; /* Increased max height slightly */
  background: var(--bg-secondary);
  border: 2px solid var(--primary-light) !important;
  border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.12) !important;
  display: flex !important; /* Enforce flex layout */
  flex-direction: column !important; /* Stack children vertically */
  overflow-y: auto;
  z-index: 49;
  animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

/* Enforce absolute hiding when the hidden class is present on mobile */
.cart-detail-panel.hidden {
  display: none !important;
}

.cart-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px !important; /* Increased header padding for spaciousness */
  border-bottom: 2px dashed rgba(139, 3, 19, 0.15) !important; /* Diner-style dashed border */
  position: sticky;
  top: 0;
  background: rgba(255, 247, 223, 0.98) !important; /* Standout warm background */
  z-index: 1;
}

.cart-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px !important; /* Massive breathing room for items */
  border-bottom: 1px solid rgba(139, 3, 19, 0.08);
  background: rgba(255, 255, 255, 0.4) !important; /* Standout background */
}

.cart-item-info {
  flex: 1;
  min-width: 0;
}

.cart-item-name {
  font-size: var(--font-base) !important; /* 16px - Highly readable and bold! */
  font-weight: var(--font-weight-bold) !important;
  color: var(--text-primary) !important;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cart-item-price {
  font-size: var(--font-xs) !important;
  color: var(--text-secondary) !important;
  font-weight: 500;
}

.cart-item-qty {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.qty-btn {
  width: 38px; /* Enlarged touch target from 30px for easy pressing! */
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 1.35rem; /* Enlarged font-size to match the circle size! */
  font-weight: var(--font-weight-bold);
  transition: var(--transition-base);
}

.qty-btn:active {
  transform: scale(0.9);
  background: var(--card-bg-active);
}

.qty-btn.minus {
  color: var(--danger-light);
}

.qty-value {
  min-width: 24px;
  text-align: center;
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-base);
}

.cart-item-subtotal {
  font-weight: var(--font-weight-bold);
  color: var(--primary);
  font-size: var(--font-sm);
  min-width: 60px;
  text-align: right;
}



/* --- Empty States --- */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-4xl) var(--space-xl);
  text-align: center;
}

.empty-state-icon {
  font-size: 3.5rem;
  margin-bottom: var(--space-xl);
  opacity: 0.6;
}

.empty-state-title {
  font-size: var(--font-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-sm);
  color: var(--text-secondary);
}

.empty-state-desc {
  font-size: var(--font-sm);
  color: var(--text-tertiary);
  max-width: 260px;
}

/* --- Desktop Layout & Cart Overrides --- */
@media (min-width: 1024px) {
  .pos-split-container {
    display: flex !important;
    gap: var(--space-xl);
    align-items: flex-start;
  }

  .pos-menu-section {
    flex: 1;
    min-width: 0;
  }

  .pos-cart-section-desktop {
    width: 380px;
    flex-shrink: 0;
    position: sticky;
    top: calc(var(--space-xl) + 10px);
    display: block !important;
  }

  .desktop-cart-card {
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--space-xl) * 2 - 40px);
    max-height: 800px;
    padding: var(--space-lg);
    background: var(--card-bg);
    border: 2px solid var(--border-color-light);
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-lg);
  }

  .desktop-cart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-md);
    padding-bottom: var(--space-sm);
    border-bottom: 1px solid var(--border-color);
  }

  .desktop-cart-items {
    flex-grow: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    padding-right: var(--space-xs);
  }

  .desktop-cart-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    padding: var(--space-sm) 0;
    border-bottom: 1px dashed var(--border-color);
  }

  .desktop-cart-item .cart-item-details {
    flex-grow: 1;
    min-width: 0;
    text-align: left;
  }

  .desktop-cart-item .cart-item-name {
    font-size: var(--font-sm);
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-primary);
  }

  .desktop-cart-item .cart-item-price-row {
    font-size: var(--font-xs);
    color: var(--text-secondary);
  }

  .desktop-cart-item .cart-item-qty {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .desktop-cart-item .qty-value {
    min-width: 20px;
    font-size: var(--font-sm);
  }

  .desktop-cart-item .qty-btn {
    width: 26px;
    height: 26px;
    font-size: var(--font-sm);
  }

  .desktop-cart-item .cart-item-subtotal {
    font-size: var(--font-sm);
    font-weight: var(--font-weight-bold);
    color: var(--primary);
    min-width: 60px;
    text-align: right;
  }

  .desktop-cart-empty {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--text-tertiary);
  }

  .desktop-cart-summary {
    margin-top: auto;
    padding-top: var(--space-md);
    border-top: 2px solid var(--border-color-light);
  }

  .desktop-cart-summary .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--font-sm);
    margin-bottom: var(--space-xs);
  }

  .desktop-cart-summary .total-row {
    margin-bottom: 0;
  }

  .pos-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-xl);
  }

  .pos-item {
    min-height: 280px;
    padding: var(--space-lg);
  }

  .pos-item-img-container {
    height: 160px;
  }

  .pos-item-name {
    font-size: 1.15rem !important;
  }
}

/* --- Toggle Switch Styles --- */
.switch-toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider-toggle {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border-color);
  transition: .3s;
  border-radius: 24px;
}

.slider-toggle:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .3s;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

input:checked + .slider-toggle {
  background-color: var(--accent);
}

input:checked + .slider-toggle:before {
  transform: translateX(20px);
}

/* --- Pill Button Styles --- */
.pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.pill-btn:hover {
  border-color: var(--accent);
  background: rgba(255, 149, 0, 0.05);
}

.pill-btn.active {
  background: linear-gradient(135deg, #ff9500, #ff5e00);
  border-color: transparent;
  color: white;
  box-shadow: 0 2px 8px rgba(255, 94, 0, 0.3);
}

.pill-btn.out-of-stock {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.pill-btn .stock-badge {
  font-size: 9px;
  opacity: 0.75;
}
.pill-btn.active .stock-badge {
  opacity: 0.9;
}

.preset-btn {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
  border-radius: var(--radius-md);
  color: var(--text-primary);
}
.preset-btn:hover {
  background: rgba(139, 3, 19, 0.05);
  border-color: var(--primary);
}
</style>
