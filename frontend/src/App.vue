<template>
  <div class="app-wrapper" :class="user ? 'logged-in' : 'not-logged-in'">
    
    <!-- PIN Login Screen (shown when not logged in) -->
    <div v-if="!user" id="login-screen" class="login-screen">
      <!-- Left & Right Retro Checkered Sidebars -->
      <div class="retro-checker-sidebar left"></div>
      <div class="retro-checker-sidebar right"></div>

      <div class="login-card card glass p-6 w-full max-w-sm text-center">
        <!-- Elephant Emoji with Pulsing Effect -->
        <div class="brand-logo mb-2" style="font-size: 4.5rem; animation: float 3s ease-in-out infinite;">🐘</div>
        <h2 class="font-bold text-gradient mb-1" style="font-size: 1.8rem;">
          {{ shopSettings.shop_name || 'ร้านไก่ทอดช้างแดง' }}
        </h2>
        <p class="text-secondary text-sm mb-6">กรุณาระบุรหัส PIN เพื่อยืนยันเข้าใช้งาน</p>

        <!-- PIN Dots Display -->
        <div class="pin-display flex justify-center gap-4 mb-8" :class="{ 'shake': pinShake }">
          <div v-for="i in 4" :key="i" class="pin-dot" :class="{ 'filled': enteredPin.length >= i }"></div>
        </div>

        <!-- Numeric Keypad -->
        <div class="keypad">
          <button v-for="n in 9" :key="n" class="keypad-key" @click="pressKey(String(n))">{{ n }}</button>
          <button class="keypad-key key-clear" @click="pressKey('C')">ลบ</button>
          <button class="keypad-key" @click="pressKey('0')">0</button>
          <button class="keypad-key" style="visibility: hidden;" disabled></button>
        </div>
      </div>
    </div>

    <!-- Main Content App layout (shown when logged in) -->
    <div v-else class="app-container">
      
      <!-- Desktop Sidebar -->
      <aside id="app-sidebar">
        <!-- Brand / Logo -->
        <div class="sidebar-brand">
          <span class="brand-emoji">🐘</span>
          <div class="brand-text">
            <span class="brand-name">{{ shopSettings.shop_name || 'ร้านไก่ทอดช้างแดง' }}</span>
            <span class="brand-tagline">ระบบจัดการร้านค้า POS</span>
          </div>
        </div>

        <div class="sidebar-divider"></div>

        <!-- User profile widget -->
        <div class="sidebar-user" v-if="user">
          <div class="user-avatar">👤</div>
          <div class="user-info">
            <div class="user-name">{{ user.name }}</div>
            <div class="user-role-badge" :class="user.role">{{ user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงาน' }}</div>
          </div>
        </div>

        <div class="sidebar-divider"></div>

        <!-- Navigation Links -->
        <nav class="sidebar-menu">
          <router-link to="/pos" class="sidebar-item" active-class="active">
            <span class="sidebar-icon">🏠</span>
            <span class="sidebar-label">ขายหน้าร้าน (POS)</span>
          </router-link>
          <router-link to="/menu" class="sidebar-item" active-class="active">
            <span class="sidebar-icon">📋</span>
            <span class="sidebar-label">จัดการเมนูอาหาร</span>
          </router-link>
          <router-link to="/stock" class="sidebar-item" active-class="active">
            <span class="sidebar-icon">📦</span>
            <span class="sidebar-label">คลังสินค้า/สต็อก</span>
          </router-link>
          <router-link v-if="adminUser" to="/reports" class="sidebar-item" active-class="active">
            <span class="sidebar-icon">📊</span>
            <span class="sidebar-label">รายงานยอดขาย</span>
          </router-link>
          <router-link v-if="adminUser" to="/settings" class="sidebar-item" active-class="active">
            <span class="sidebar-icon">⚙️</span>
            <span class="sidebar-label">ตั้งค่าระบบ</span>
          </router-link>
        </nav>

        <!-- Sidebar Footer / Logout -->
        <div class="sidebar-footer">
          <button class="sidebar-logout-btn" @click="handleLogout">
            <span class="logout-icon">🚪</span>
            <span class="logout-label">ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      <!-- Main Layout Body -->
      <div class="main-layout">
        <!-- App Header (Visible on Mobile) -->
        <header id="app-header">
          <span class="header-title">🐘 {{ activeTitle }}</span>
          <div class="header-right">
            <button class="header-btn" id="btn-logout" title="ออกจากระบบ" @click="handleLogout">🚪</button>
          </div>
        </header>

        <!-- App Main Content Views -->
        <main id="app-content" :class="{ 'has-cart-bar': hasCartBar }">
          <!-- Desktop Page Title Header (Visible on Desktop) -->
          <div class="desktop-content-header">
            <h2 class="desktop-page-title">{{ activeTitle }}</h2>
            <div class="desktop-user-profile" v-if="user">
              <span class="user-greeting">สวัสดี, <strong>{{ user.name }}</strong></span>
              <span class="user-badge" :class="user.role">{{ user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงาน' }}</span>
            </div>
          </div>

          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </main>

        <!-- Bottom Navigation (Visible on Mobile) -->
        <nav id="bottom-nav">
          <router-link to="/pos" class="nav-item" active-class="active" data-page="pos">
            <span class="nav-icon">🏠</span>
            <span class="nav-label">ขาย</span>
          </router-link>
          <router-link to="/menu" class="nav-item" active-class="active" data-page="menu">
            <span class="nav-icon">📋</span>
            <span class="nav-label">เมนู</span>
          </router-link>
          <router-link to="/stock" class="nav-item" active-class="active" data-page="stock">
            <span class="nav-icon">📦</span>
            <span class="nav-label">สต็อก</span>
          </router-link>
          <router-link v-if="adminUser" to="/reports" class="nav-item" active-class="active" data-page="reports">
            <span class="nav-icon">📊</span>
            <span class="nav-label">รายงาน</span>
          </router-link>
          <router-link v-if="adminUser" to="/settings" class="nav-item" active-class="active" data-page="settings">
            <span class="nav-icon">⚙️</span>
            <span class="nav-label">ตั้งค่า</span>
          </router-link>
        </nav>
      </div>
    </div>

    <!-- Reactive Toast Containers -->
    <div id="toast-container">
      <transition-group name="toast-anim">
        <div v-for="t in uiState.toasts" :key="t.id" class="toast" :class="t.type">
          <span class="toast-icon">{{ getToastIcon(t.type) }}</span>
          <span class="toast-message">{{ t.message }}</span>
        </div>
      </transition-group>
    </div>

    <!-- Reactive Global Modal Container (Confirm dialog) -->
    <div id="modal-container" :class="{ 'active': uiState.confirm }" :style="uiState.confirm ? 'display:flex; align-items:center;' : ''">
      <div v-if="uiState.confirm" class="modal-overlay" @click="uiState.confirm.resolve(false)"></div>
      <div v-if="uiState.confirm" class="confirm-dialog" style="position:relative; z-index:2;">
        <div class="confirm-title">{{ uiState.confirm.title }}</div>
        <div class="confirm-message">{{ uiState.confirm.message }}</div>
        <div class="confirm-actions">
          <button class="btn btn-secondary flex-1" @click="uiState.confirm.resolve(false)">ยกเลิก</button>
          <button class="btn btn-danger flex-1" @click="uiState.confirm.resolve(true)">ยืนยัน</button>
        </div>
      </div>
    </div>

    <!-- Reactive Loading Overlay -->
    <div v-if="uiState.loading" id="loading-overlay" class="loading-overlay">
      <div class="spinner"></div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from './api';
import { ui, uiState, getUser, isAdmin } from './helpers';

// States
const user = ref(null);
const shopSettings = ref({ shop_name: 'ร้านไก่ทอดช้างแดง' });
const enteredPin = ref('');
const pinShake = ref(false);
const hasCartBar = ref(false); // Can be toggled by child view

const route = useRoute();
const router = useRouter();

// Watch user state to dynamically apply body class for css display states
watch(user, (newUser) => {
  if (newUser) {
    document.body.classList.remove('not-logged-in');
    document.body.classList.add('logged-in');
  } else {
    document.body.classList.remove('logged-in');
    document.body.classList.add('not-logged-in');
  }
}, { immediate: true });

// Computed properties
const adminUser = computed(() => {
  return user.value && user.value.role === 'admin';
});

const activeTitle = computed(() => {
  const titles = {
    '/pos': shopSettings.value.shop_name || 'ร้านไก่ทอดช้างแดง',
    '/menu': '📋 จัดการเมนู',
    '/stock': '📦 คลังสินค้า',
    '/reports': '📊 รายงานยอดขาย',
    '/settings': '⚙️ ตั้งค่าระบบ'
  };
  return titles[route.path] || 'ช้างแดง POS';
});

// Keypad press handler
const pressKey = (key) => {
  // Key press haptic scale effect
  if (key === 'C') {
    enteredPin.value = '';
    return;
  }
  
  if (enteredPin.value.length < 4) {
    enteredPin.value += key;
    
    if (enteredPin.value.length === 4) {
      submitPin();
    }
  }
};

// Login Pin Verification
const submitPin = async () => {
  ui.showLoading();
  try {
    const res = await api.auth.login(enteredPin.value);
    if (res.success) {
      sessionStorage.setItem('pos_user', JSON.stringify(res.data.user));
      user.value = res.data.user;
      ui.showToast(`ยินดีต้อนรับคุณ ${user.value.name} 🎉`, 'success');
      enteredPin.value = '';
      router.push('/pos');
    } else {
      throw new Error('รหัส PIN ไม่ถูกต้อง');
    }
  } catch (e) {
    pinShake.value = true;
    ui.showToast(e.message || 'รหัสผ่าน PIN ไม่ถูกต้อง กรุณาลองใหม่', 'error');
    enteredPin.value = '';
    setTimeout(() => {
      pinShake.value = false;
    }, 500);
  } finally {
    ui.hideLoading();
  }
};

// Logout Handler
const handleLogout = async () => {
  const confirm = await ui.showConfirm('ออกจากระบบ', 'คุณต้องการออกจากระบบ POS ใช่หรือไม่?');
  if (confirm) {
    sessionStorage.removeItem('pos_user');
    user.value = null;
    enteredPin.value = '';
    ui.showToast('ออกจากระบบเรียบร้อย', 'info');
    router.push('/');
  }
};

// Global Events / Init
const loadSettings = async () => {
  try {
    const res = await api.settings.getAll();
    if (res.success) {
      shopSettings.value = res.data;
    }
  } catch (e) {
    console.warn('⚠️ Could not load settings:', e.message);
  }
};

const getToastIcon = (type) => {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  return icons[type] || 'ℹ️';
};

onMounted(() => {
  user.value = getUser();
  loadSettings();

  // Listen to global events for cart bar visibility
  window.addEventListener('cart-state-change', (e) => {
    hasCartBar.value = e.detail && e.detail.hasItems;
  });
});
</script>

<style>
/* App Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Toast Transitions */
.toast-anim-enter-active,
.toast-anim-leave-active {
  transition: all 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}
.toast-anim-enter-from {
  opacity: 0;
  transform: translate(-50%, 20px);
}
.toast-anim-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px) scale(0.9);
}

/* Retro Diner Checker Flag Sidebar Styles */
.retro-checker-sidebar {
  position: fixed;
  top: 0;
  bottom: 0;
  width: 40px;
  background-image: 
    linear-gradient(45deg, var(--primary) 25%, transparent 25%), 
    linear-gradient(-45deg, var(--primary) 25%, transparent 25%), 
    linear-gradient(45deg, transparent 75%, var(--primary) 75%), 
    linear-gradient(-45deg, transparent 75%, var(--primary) 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0;
  background-color: var(--bg-primary);
  opacity: 0.85;
  box-shadow: var(--shadow-md);
  z-index: 1;
}
.retro-checker-sidebar.left {
  left: 0;
  border-right: 3px solid var(--accent);
}
.retro-checker-sidebar.right {
  right: 0;
  border-left: 3px solid var(--accent);
}

/* Hide sidebars on small screens to keep it clean and focused */
@media (max-width: 580px) {
  .retro-checker-sidebar {
    display: none;
  }
}
</style>
