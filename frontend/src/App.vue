<template>
  <div class="app-wrapper" :class="user ? 'logged-in' : 'not-logged-in'">
    
    <!-- PIN Login Screen (shown when not logged in) -->
    <div v-if="!user" id="login-screen" class="login-screen">
      <!-- Left & Right Retro Checkered Sidebars -->
      <div class="retro-checker-sidebar left"></div>
      <div class="retro-checker-sidebar right"></div>

      <div class="login-card card glass p-6 w-full max-w-sm text-center">
        <!-- Brand Logo Image (No animation) -->
        <div class="brand-logo mb-2" style="display: flex; justify-content: center; height: 6.5rem; align-items: center;">
          <img src="@/assets/image/Logo POS.png" alt="Logo" style="height: 100%; object-fit: contain;" />
        </div>
        <h2 class="font-bold text-gradient mb-1" style="font-size: 1.8rem;">
          ร้านไก่ทอดช้างแดง
        </h2>
        <p class="text-secondary text-sm mb-lg">กรุณาเลือกสาขาและระบุรหัส PIN เพื่อเข้าใช้งาน</p>

        <!-- Branch Selector Loading Skeleton -->
        <div v-if="isLoadingBranches" class="branch-selector mb-xl" style="margin-top: 1.75rem !important;">
          <div class="skeleton-pulse" style="width: 100px; height: 18px; border-radius: 4px; margin-bottom: var(--space-sm);"></div>
          <div class="skeleton-pulse" style="width: 100%; height: 46px; border-radius: var(--radius-md); border: 2px solid rgba(139, 3, 19, 0.08);"></div>
        </div>

        <!-- Branch Selector -->
        <div v-else-if="branches.length > 0" class="branch-selector mb-xl" style="margin-top: 1.75rem !important;">
          <label class="branch-label"><i class="fa-solid fa-location-dot" style="margin-right: 6px; color: var(--primary);"></i> เลือกสาขา</label>
          <div class="custom-select-wrapper" @click.stop>
            <div 
              class="custom-select-trigger branch-select" 
              :class="{ 'active': isBranchDropdownOpen }" 
              @click="isBranchDropdownOpen = !isBranchDropdownOpen"
              style="border: 2px solid var(--border-color) !important; background-color: var(--card-bg) !important;"
            >
              <span class="custom-select-text">
                {{ selectedBranchName || 'กรุณาเลือกสาขา' }}
              </span>
            </div>
            <div v-if="isBranchDropdownOpen" class="custom-select-dropdown">
              <div 
                v-for="b in branches" 
                :key="b.id" 
                class="custom-select-option"
                :class="{ 'selected': b.id === selectedBranch }"
                @click="selectBranch(b.id)"
              >
                {{ b.name }}{{ b.address ? ' — ' + b.address : '' }}
              </div>
            </div>
          </div>
        </div>

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
          <span class="brand-emoji" style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
            <img src="@/assets/image/Logo POS.png" alt="Logo" style="width: 28px; height: 28px; object-fit: contain;" />
          </span>
          <div class="brand-text">
            <span class="brand-name">ร้านไก่ทอดช้างแดง</span>
            <span class="brand-tagline">ระบบจัดการร้านค้า POS</span>
          </div>
        </div>

        <div class="sidebar-divider"></div>

        <!-- User profile widget -->
        <div class="sidebar-user" v-if="user">
          <div class="user-avatar" style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;">
            <i class="fa-solid fa-circle-user" style="font-size: 2.2rem; color: var(--primary);"></i>
          </div>
          <div class="user-info">
            <div class="user-name">{{ user.name }}</div>
            <div class="user-role-badge" :class="user.role">{{ user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงาน' }}</div>
          </div>
        </div>

        <div class="sidebar-divider"></div>

        <!-- Navigation Links -->
        <nav class="sidebar-menu">
          <router-link to="/pos" class="sidebar-item" active-class="active">
            <span class="sidebar-icon"><i class="fa-solid fa-house"></i></span>
            <span class="sidebar-label">ขายหน้าร้าน (POS)</span>
          </router-link>
          <router-link to="/menu" class="sidebar-item" active-class="active">
            <span class="sidebar-icon"><i class="fa-solid fa-utensils"></i></span>
            <span class="sidebar-label">จัดการเมนูอาหาร</span>
          </router-link>
          <router-link to="/stock" class="sidebar-item" active-class="active">
            <span class="sidebar-icon"><i class="fa-solid fa-boxes-stacked"></i></span>
            <span class="sidebar-label">คลังสินค้า/สต็อก</span>
          </router-link>
          <router-link to="/reports" class="sidebar-item" active-class="active">
            <span class="sidebar-icon"><i class="fa-solid fa-chart-line"></i></span>
            <span class="sidebar-label">รายงานยอดขาย</span>
          </router-link>
          <router-link v-if="adminUser" to="/settings" class="sidebar-item" active-class="active">
            <span class="sidebar-icon"><i class="fa-solid fa-gear"></i></span>
            <span class="sidebar-label">ตั้งค่าระบบ</span>
          </router-link>
        </nav>

        <!-- Sidebar Footer / Logout -->
        <div class="sidebar-footer">
          <button class="sidebar-logout-btn" @click="handleLogout">
            <span class="logout-icon"><i class="fa-solid fa-right-from-bracket"></i></span>
            <span class="logout-label">ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      <!-- Main Layout Body -->
      <div class="main-layout">
        <!-- App Header (Visible on Mobile) -->
        <header id="app-header">
          <span class="header-title" style="display: flex; align-items: center; gap: 6px;">
            <img v-if="route.path === '/pos'" src="@/assets/image/Logo POS.png" alt="Logo" style="width: 24px; height: 24px; object-fit: contain;" />
            <i v-else-if="route.path === '/menu'" class="fa-solid fa-utensils"></i>
            <i v-else-if="route.path.startsWith('/stock')" class="fa-solid fa-boxes-stacked"></i>
            <i v-else-if="route.path === '/reports'" class="fa-solid fa-chart-line"></i>
            <i v-else-if="route.path === '/settings'" class="fa-solid fa-gear"></i>
            <span>{{ activeTitle }}</span>
          </span>
          <div class="header-right">
            <button class="header-btn" id="btn-logout" @click="handleLogout" style="display: inline-flex; align-items: center; gap: 4px;">
              <i class="fa-solid fa-right-from-bracket" style="font-size: 14px;"></i>
              <span style="font-size: 11px; font-weight: bold;">ออก</span>
            </button>
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
            <span class="nav-icon" style="display: flex; justify-content: center; height: 1.35rem;"><i class="fa-solid fa-house"></i></span>
            <span class="nav-label">ขาย</span>
          </router-link>
          <router-link to="/menu" class="nav-item" active-class="active" data-page="menu">
            <span class="nav-icon" style="display: flex; justify-content: center; height: 1.35rem;"><i class="fa-solid fa-utensils"></i></span>
            <span class="nav-label">เมนู</span>
          </router-link>
          <router-link to="/stock" class="nav-item" active-class="active" data-page="stock">
            <span class="nav-icon" style="display: flex; justify-content: center; height: 1.35rem;"><i class="fa-solid fa-boxes-stacked"></i></span>
            <span class="nav-label">สต็อก</span>
          </router-link>
          <router-link to="/reports" class="nav-item" active-class="active" data-page="reports">
            <span class="nav-icon" style="display: flex; justify-content: center; height: 1.35rem;"><i class="fa-solid fa-chart-line"></i></span>
            <span class="nav-label">รายงานยอด</span>
          </router-link>
          <router-link v-if="adminUser" to="/settings" class="nav-item" active-class="active" data-page="settings">
            <span class="nav-icon" style="display: flex; justify-content: center; height: 1.35rem;"><i class="fa-solid fa-gear"></i></span>
            <span class="nav-label">ตั้งค่า</span>
          </router-link>
        </nav>
      </div>
    </div>

    <!-- Reactive Toast Containers -->
    <div id="toast-container">
      <transition-group name="toast-anim">
        <div v-for="t in uiState.toasts" :key="t.id" class="toast" :class="t.type">
          <span class="toast-icon" style="display: inline-flex; align-items: center;">
            <i v-if="t.type === 'success'" class="fa-solid fa-circle-check" style="color: var(--success); font-size: 1.2rem;"></i>
            <i v-else-if="t.type === 'error'" class="fa-solid fa-circle-xmark" style="color: var(--danger); font-size: 1.2rem;"></i>
            <i v-else-if="t.type === 'info'" class="fa-solid fa-circle-info" style="color: var(--accent); font-size: 1.2rem;"></i>
            <i v-else-if="t.type === 'warning'" class="fa-solid fa-triangle-exclamation" style="color: var(--warning); font-size: 1.2rem;"></i>
            <i v-else class="fa-solid fa-circle-info" style="font-size: 1.2rem;"></i>
          </span>
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from './api';
import { ui, uiState, getUser, isAdmin } from './helpers';
import { store } from './store';

// States
const user = ref(null);
const shopSettings = ref({ shop_name: 'ร้านไก่ทอดช้างแดง' });
const enteredPin = ref('');
const pinShake = ref(false);
const hasCartBar = ref(false); // Can be toggled by child view
const branches = ref([]);
const selectedBranch = ref(null);
const isLoadingBranches = ref(true);

// Custom dropdown state for branch selector
const isBranchDropdownOpen = ref(false);
const selectedBranchName = computed(() => {
  const b = branches.value.find(x => x.id === selectedBranch.value);
  return b ? b.name + (b.address ? ' — ' + b.address : '') : '';
});
const selectBranch = (id) => {
  selectedBranch.value = id;
  isBranchDropdownOpen.value = false;
  sessionStorage.setItem('selected_branch_id', String(id));
  
  // Clear cache and pre-warm/pre-fetch for the newly selected branch
  store.clearAllCache();
  store.fetchMenu(true).catch(() => {});
  store.fetchStock(true).catch(() => {});
  store.fetchModifiers(true).catch(() => {});
  store.fetchSettingsData(id, true).catch(() => {});
  store.fetchReports(id, true).catch(() => {});
};

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
    '/pos': 'ร้านไก่ทอดช้างแดง',
    '/menu': 'จัดการเมนู',
    '/stock': 'คลังสินค้า',
    '/stock/bulk': 'คลังสินค้า',
    '/reports': 'รายงานยอดขาย',
    '/settings': 'ตั้งค่าระบบ'
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
    const res = await api.auth.login(enteredPin.value, selectedBranch.value);
    if (res.success) {
      sessionStorage.setItem('pos_user', JSON.stringify(res.data.user));
      user.value = res.data.user;
      const branchName = res.data.branch ? res.data.branch.name : '';
      ui.showToast(`ยินดีต้อนรับคุณ ${user.value.name} 🎉${branchName ? ' (สาขา: ' + branchName + ')' : ''}`, 'success');
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
    store.clearAllCache(); // Clear store cache on logout
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


// Load branches list for login screen
const loadBranches = async () => {
  isLoadingBranches.value = true;
  try {
    const res = await api.auth.getBranches();
    if (res.success && Array.isArray(res.data)) {
      branches.value = res.data;
      if (res.data.length > 0 && !selectedBranch.value) {
        selectedBranch.value = res.data[0].id;
      }
      if (selectedBranch.value) {
        sessionStorage.setItem('selected_branch_id', String(selectedBranch.value));
        // Pre-warm Turso DB connection and preload cache in the background for this default branch
        store.fetchMenu().catch(() => {});
        store.fetchStock().catch(() => {});
        store.fetchModifiers().catch(() => {});
        store.fetchSettingsData(selectedBranch.value).catch(() => {});
        store.fetchReports(selectedBranch.value).catch(() => {});
      }
    }
  } catch (e) {
    console.warn('⚠️ Could not load branches:', e.message);
  } finally {
    isLoadingBranches.value = false;
  }
};

const closeBranchDropdown = () => {
  isBranchDropdownOpen.value = false;
};

onMounted(() => {
  user.value = getUser();
  loadSettings();
  loadBranches();

  // Listen to global events for cart bar visibility
  window.addEventListener('cart-state-change', (e) => {
    hasCartBar.value = e.detail && e.detail.hasItems;
  });

  // Close branch selector dropdown when clicking outside
  window.addEventListener('click', closeBranchDropdown);
});

onUnmounted(() => {
  window.removeEventListener('click', closeBranchDropdown);
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
  transition: all 0.3s ease;
}
.toast-anim-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}
.toast-anim-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.9);
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

/* --- Login Screen --- */
.login-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: var(--space-2xl);
}

.login-card {
  width: 100%;
  max-width: 340px;
  text-align: center;
}

/* --- Branch Selector Custom Style --- */
.branch-label {
  font-size: var(--font-base) !important; /* 16px - Highly readable on mobile! */
  font-weight: var(--font-weight-bold) !important;
  color: var(--text-primary) !important;
  display: block !important;
  margin-bottom: var(--space-sm) !important;
  text-align: left !important;
}

.branch-select {
  width: 100% !important;
  padding: 12px 48px 12px var(--space-md) !important; /* 48px right padding to ensure plenty of space for text */
  font-size: var(--font-base) !important; /* 16px - Matches other input fields! */
  border-radius: var(--radius-md) !important;
  border: 2px solid var(--border-color) !important;
  background-color: var(--card-bg) !important;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236e4e37' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") !important;
  background-repeat: no-repeat !important;
  background-position: right 20px center !important; /* Positioned chevron 20px left, away from edge! */
  cursor: pointer !important;
  appearance: none !important;
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  transition: all var(--transition-base) !important;
}

.branch-select:focus {
  border-color: var(--primary) !important;
  box-shadow: 0 0 0 3px var(--primary-glow) !important;
  outline: none !important;
}

/* Skeleton Loader Shimmer (Warm Reddish tones for Chang Dang brand!) */
.skeleton-pulse {
  display: block;
  background: linear-gradient(
    90deg,
    rgba(139, 3, 19, 0.04) 25%,
    rgba(139, 3, 19, 0.08) 50%,
    rgba(139, 3, 19, 0.04) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite ease-in-out;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.login-logo {
  font-size: 4rem;
  margin-bottom: var(--space-lg);
  animation: float 3s ease-in-out infinite;
}

.login-title {
  font-size: var(--font-xl);
  font-weight: var(--font-weight-bold);
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: var(--space-xs);
}

.login-subtitle {
  font-size: var(--font-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-3xl);
}

.login-user-select {
  margin-bottom: var(--space-2xl);
}

/* --- Header --- */
#app-header {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: var(--max-width);
  height: var(--header-height);
  background: rgba(255, 247, 223, 0.92);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-bottom: 2px solid var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--space-lg);
  z-index: 100;
}
/* Retro Checkered strip under header */
#app-header::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 100%;
  height: 4px;
  background-image: 
    linear-gradient(45deg, var(--primary) 25%, transparent 25%), 
    linear-gradient(-45deg, var(--primary) 25%, transparent 25%), 
    linear-gradient(45deg, transparent 75%, var(--primary) 75%), 
    linear-gradient(-45deg, transparent 75%, var(--primary) 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0;
  background-color: var(--bg-primary);
}

#app-header .header-title {
  font-size: var(--font-lg);
  font-weight: var(--font-weight-semibold);
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

#app-header .header-left,
#app-header .header-right {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

#app-header .header-left { left: var(--space-lg); }
#app-header .header-right { right: var(--space-lg); }

#app-header .header-btn {
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: rgba(139, 3, 19, 0.06) !important;
  border: 1px solid rgba(139, 3, 19, 0.12) !important;
  color: var(--primary) !important;
  font-size: var(--font-sm);
  font-weight: var(--font-weight-bold);
  padding: 0 8px !important;
  gap: 4px;
  width: auto !important;
  cursor: pointer;
  transition: var(--transition-base);
}

#app-header .header-btn:active {
  transform: scale(0.92);
  background: var(--card-bg-active);
}

/* --- Bottom Navigation --- */
#bottom-nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: var(--max-width);
  height: calc(var(--bottom-nav-height) + var(--safe-bottom));
  padding-bottom: var(--safe-bottom);
  background: rgba(255, 247, 223, 0.95);
  backdrop-filter: var(--glass-blur-heavy);
  -webkit-backdrop-filter: var(--glass-blur-heavy);
  border-top: 2px solid var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 100;
}
/* Retro Checkered strip above bottom navigation */
#bottom-nav::before {
  content: '';
  position: absolute;
  top: -4px;
  left: 0;
  width: 100%;
  height: 4px;
  background-image: 
    linear-gradient(45deg, var(--primary) 25%, transparent 25%), 
    linear-gradient(-45deg, var(--primary) 25%, transparent 25%), 
    linear-gradient(45deg, transparent 75%, var(--primary) 75%), 
    linear-gradient(-45deg, transparent 75%, var(--primary) 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0;
  background-color: var(--bg-primary);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 16px; /* Premium pill shape padding */
  color: var(--text-tertiary);
  font-size: var(--font-xs);
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-base);
  position: relative;
  -webkit-tap-highlight-color: transparent;
  border-radius: var(--radius-lg); /* Rounded pill active background shape */
}

.nav-item .nav-icon {
  font-size: 1.35rem;
  transition: var(--transition-base);
}

.nav-item.active {
  color: var(--primary) !important;
  background: rgba(139, 3, 19, 0.08) !important; /* Premium brand-colored translucent pill background */
  font-weight: var(--font-weight-bold) !important;
}

.nav-item.active .nav-icon {
  transform: scale(1.05);
}

/* Remove active red top border line */
.nav-item.active::before {
  display: none !important;
}

.nav-item:active {
  transform: scale(0.92);
  background: rgba(255, 255, 255, 0.05);
}

/* --- Toast Notifications --- */
#toast-container {
  position: fixed;
  top: 72px; /* Positioned below mobile header */
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 400px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: center; /* Prevent toast cards from stretching full width */
  gap: var(--space-sm);
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  box-shadow: var(--shadow-lg);
  font-size: var(--font-sm);
  color: var(--text-primary);
  pointer-events: auto;
}

.toast.removing {
  animation: toastOut 0.25s ease forwards;
}

.toast-icon {
  font-size: var(--font-lg);
  flex-shrink: 0;
}

.toast.success { border-left: 3px solid var(--success); }
.toast.success .toast-icon { color: var(--success); }

.toast.error { border-left: 3px solid var(--danger); }
.toast.error .toast-icon { color: var(--danger); }

.toast.info { border-left: 3px solid var(--accent); }
.toast.info .toast-icon { color: var(--accent); }

.toast.warning { border-left: 3px solid var(--warning); }
.toast.warning .toast-icon { color: var(--warning); }

/* --- Confirm Dialog --- */
.confirm-dialog {
  width: 100%;
  max-width: 320px;
  margin: auto;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-2xl);
  padding: var(--space-2xl);
  text-align: center;
  animation: scaleIn 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}

.confirm-title {
  font-size: var(--font-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-sm);
}

.confirm-message {
  font-size: var(--font-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-2xl);
  white-space: pre-line;
}

.confirm-actions {
  display: flex;
  gap: var(--space-md);
}

.confirm-actions .btn {
  flex: 1;
}

/* --- Keypad --- */
.keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
  padding: var(--space-md);
}

.keypad-key {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  transition: all var(--transition-base);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.keypad-key:active {
  transform: scale(0.95);
  background: var(--card-bg-active);
}

.keypad-key.key-clear {
  color: var(--danger-light);
}

.keypad-key.key-confirm {
  background: var(--gradient-primary);
  color: white;
  border-color: transparent;
}

.keypad-key.key-backspace {
  color: var(--warning-light);
}

/* PIN Display */
.pin-display {
  display: flex;
  justify-content: center;
  gap: var(--space-lg);
  padding: var(--space-2xl);
}

.pin-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--border-color-light);
  background: transparent;
  transition: all var(--transition-base);
}

.pin-dot.filled {
  background: var(--primary);
  border-color: var(--primary);
  box-shadow: 0 0 10px var(--primary-glow);
  animation: pinDotFill 0.2s ease;
}

/* --- Responsive Layout for Desktop / Tablet --- */
@media (min-width: 1024px) {
  /* ทุกๆการแจ้งเตือน ต้องแจ้งด้านบน ตรงกลางหน้าจอเสมอ (ไม่ว่าจะล็อกอินอยู่หรือไม่ก็ตาม) */
  #toast-container {
    top: 24px;
    left: 50% !important;
    transform: translateX(-50%) !important;
  }

  /* Desktop Sidebar styling */
  #app-sidebar {
    width: var(--sidebar-width);
    height: 100vh;
    position: fixed;
    top: 0;
    left: 0;
    background: rgba(255, 247, 223, 0.95);
    backdrop-filter: var(--glass-blur-heavy);
    -webkit-backdrop-filter: var(--glass-blur-heavy);
    border-right: 3px solid var(--primary-light);
    display: flex !important;
    flex-direction: column;
    z-index: 1000;
    padding: var(--space-xl) var(--space-lg);
    box-shadow: var(--shadow-lg);
  }

  /* Retro Diner Checkered Border on Sidebar right border */
  #app-sidebar::after {
    content: '';
    position: absolute;
    top: 0;
    right: -6px;
    width: 6px;
    height: 100%;
    background-image: 
      linear-gradient(45deg, var(--primary) 25%, transparent 25%), 
      linear-gradient(-45deg, var(--primary) 25%, transparent 25%), 
      linear-gradient(45deg, transparent 75%, var(--primary) 75%), 
      linear-gradient(-45deg, transparent 75%, var(--primary) 75%);
    background-size: 12px 12px;
    background-position: 0 0, 0 6px, 6px -6px, -6px 0;
    background-color: var(--bg-primary);
  }

  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-sm) 0;
    text-align: left;
  }

  .sidebar-brand .brand-emoji {
    font-size: 2.8rem;
  }

  .sidebar-brand .brand-name {
    font-size: var(--font-md);
    font-weight: var(--font-weight-bold);
    color: var(--primary);
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .sidebar-brand .brand-tagline {
    font-size: 10px;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 1px;
    display: block;
    margin-top: -2px;
  }

  .sidebar-divider {
    height: 2px;
    background: rgba(139, 3, 19, 0.08);
    margin: var(--space-lg) 0;
    border-radius: var(--radius-full);
  }

  .sidebar-user {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-sm) var(--space-md);
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    text-align: left;
  }

  .sidebar-user .user-avatar {
    font-size: 1.5rem;
    background: var(--bg-tertiary);
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sidebar-user .user-name {
    font-size: var(--font-base);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
  }

  .sidebar-user .user-role-badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: var(--radius-full);
    display: inline-block;
    font-weight: var(--font-weight-medium);
  }

  .sidebar-user .user-role-badge.admin {
    background: rgba(139, 3, 19, 0.1);
    color: var(--primary-light);
  }

  .sidebar-user .user-role-badge.staff {
    background: rgba(42, 157, 143, 0.1);
    color: var(--success);
  }

  .sidebar-menu {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    flex-grow: 1;
    margin-top: var(--space-md);
  }

  .sidebar-item {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md) var(--space-lg);
    color: var(--text-secondary);
    font-size: var(--font-base);
    font-weight: var(--font-weight-medium);
    border-radius: var(--radius-md);
    transition: all var(--transition-base);
  }

  .sidebar-item .sidebar-icon {
    font-size: 1.3rem;
  }

  .sidebar-item:hover {
    background: var(--bg-secondary);
    color: var(--primary);
    transform: translateX(4px);
  }

  .sidebar-item.active {
    background: var(--gradient-primary);
    color: white;
    box-shadow: var(--shadow-glow-primary);
    transform: translateX(6px);
  }

  .sidebar-footer {
    padding-top: var(--space-md);
  }

  .sidebar-logout-btn {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md) var(--space-lg);
    width: 100%;
    color: var(--danger-light);
    font-size: var(--font-base);
    font-weight: var(--font-weight-semibold);
    border-radius: var(--radius-md);
    background: rgba(173, 40, 30, 0.05);
    border: 1px solid rgba(173, 40, 30, 0.1);
    transition: all var(--transition-base);
  }

  .sidebar-logout-btn:hover {
    background: rgba(173, 40, 30, 0.12);
    transform: translateY(-2px);
  }

  /* Content header on Desktop */
  .desktop-content-header {
    display: flex !important;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-2xl);
    padding-bottom: var(--space-md);
    border-bottom: 2px dashed rgba(139, 3, 19, 0.1);
  }

  .desktop-content-header .desktop-page-title {
    font-size: var(--font-xl);
    font-weight: var(--font-weight-bold);
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .desktop-content-header .desktop-user-profile {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    font-size: var(--font-base);
  }

  .desktop-content-header .desktop-user-profile .user-badge {
    font-size: var(--font-xs);
    padding: 2px 10px;
    border-radius: var(--radius-full);
    font-weight: var(--font-weight-semibold);
  }

  .desktop-content-header .desktop-user-profile .user-badge.admin {
    background: var(--gradient-primary);
    color: white;
  }

  .desktop-content-header .desktop-user-profile .user-badge.staff {
    background: var(--gradient-success);
    color: white;
  }
}
</style>
