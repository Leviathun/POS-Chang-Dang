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
      <div class="pos-grid stagger-children" id="pos-menu-grid">
        <!-- Skeleton loader while loading -->
        <template v-if="loading">
          <div v-for="i in 6" :key="i" class="pos-item" style="pointer-events:none; min-height:180px;">
            <div class="skeleton" style="width:100%; height:95px; border-radius:var(--radius-md);"></div>
            <div class="skeleton" style="width:80%; height:14px; margin: 8px auto 4px;"></div>
            <div class="skeleton" style="width:50%; height:16px; margin: 0 auto;"></div>
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

            <!-- Product Name & Price & Stock -->
            <div class="pos-item-name">{{ item.name }}</div>
            <div class="pos-item-price">{{ formatCurrency(item.price) }}</div>
            <div v-if="item.stock !== null && item.stock !== undefined" class="pos-item-stock">
              {{ item.stock <= 0 ? '❌ หมด' : `เหลือ ${item.stock}` }}
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
      
      <div id="cart-items-list" style="overflow-y: auto; max-height: calc(40vh - 60px);">
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
      </div>
    </div>

    <!-- Payment Component Modal Overlay -->
    <PaymentModal 
      v-if="showPaymentModal"
      :cart="cart"
      :total="cartTotal"
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

// Reactive States
const menuItems = ref([]);
const categories = ref([]);
const cart = ref(new Map()); // itemId -> { item, quantity }
const activeCategory = ref('all');
const cartExpanded = ref(false);
const showPaymentModal = ref(false);
const loading = ref(true);

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
    const flash = document.createElement('div');
    flash.className = 'pos-item-added';
    el.appendChild(flash);
    setTimeout(() => flash.remove(), 400);
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
const onPaymentSuccess = () => {
  cart.value = new Map();
  cartExpanded.value = false;
  showPaymentModal.value = false;
  loadMenuData(); // Reload menu items and categories to refresh stock counts!
};

// Load Menu & Categories from API
const loadMenuData = async () => {
  try {
    const [menuRes, catRes] = await Promise.all([
      api.menu.getAll(),
      api.menu.getCategories()
    ]);
    
    // API might return success payload wrapping data
    const rawItems = menuRes.data || menuRes || [];
    menuItems.value = rawItems.filter(item => item.active !== 0 && item.active !== false);
    categories.value = catRes.data || catRes || [];
  } catch (error) {
    console.error('Failed to load menu:', error);
    ui.showToast('ไม่สามารถดึงข้อมูลเมนูร้านค้าได้', 'error');
  } finally {
    loading.value = false;
  }
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

onMounted(() => {
  loadMenuData();
});

onUnmounted(() => {
  // Make sure cart-bar-height padding is cleared on unmount
  const event = new CustomEvent('cart-state-change', {
    detail: { hasItems: false }
  });
  window.dispatchEvent(event);
});
</script>
