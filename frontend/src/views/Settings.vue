<template>
  <div id="settings-page" class="page-enter">
    
    <!-- Tab toggles inside Settings page -->
    <div class="category-tabs mb-lg">
      <button 
        class="category-tab" 
        :class="{ 'active': activeTab === 'shop' }"
        @click="activeTab = 'shop'"
      >
        🏪 ตั้งค่าร้านค้า
      </button>
      <button 
        class="category-tab" 
        :class="{ 'active': activeTab === 'users' }"
        @click="activeTab = 'users'"
      >
        👥 พนักงานหน้าร้าน
      </button>
    </div>

    <!-- Tab 1: Shop Settings Form -->
    <div v-if="activeTab === 'shop'" class="card">
      <div class="card-title" style="font-size: var(--font-sm);">🏪 ข้อมูลร้านและคีย์การทำธุรกรรม</div>

      <!-- Shop Name -->
      <div class="form-group">
        <label class="form-label">ชื่อร้านค้า (จะแสดงบนหัวแอปและบิลขาย)</label>
        <input 
          type="text" 
          class="form-input" 
          v-model="shopForm.shop_name" 
          placeholder="ระบุชื่อร้านค้า..." 
        />
      </div>

      <!-- PromptPay ID -->
      <div class="form-group">
        <label class="form-label">เบอร์โทรศัพท์/เลขบัตรประชาชน PromptPay (สำหรับสร้าง QR Code คิดเงิน)</label>
        <input 
          type="text" 
          class="form-input" 
          v-model="shopForm.promptpay_id" 
          placeholder="เช่น 0891234567 หรือ 1234567890123" 
        />
      </div>

      <!-- Daily Report Send Time -->
      <div class="form-group">
        <label class="form-label">เวลาส่งรายงานแจ้งเตือน LINE ประจำวัน (ส่งอัตโนมัติทุกวัน)</label>
        <input 
          type="time" 
          class="form-input" 
          v-model="shopForm.daily_report_time" 
        />
      </div>

      <!-- Low Stock Threshold -->
      <div class="form-group">
        <label class="form-label">จุดเตือนสต็อกวัตถุดิบใกล้หมด (ชิ้น)</label>
        <input 
          type="number" 
          class="form-input" 
          v-model.number="shopForm.low_stock_threshold" 
          placeholder="เช่น 5" 
          min="1"
        />
      </div>

      <!-- LINE Notify Integration Settings -->
      <div class="divider" style="margin: var(--space-xl) 0 12px; height:1px; background:var(--border-color);"></div>
      <div class="card-title" style="font-size: var(--font-sm);">💬 LINE Messaging Integration</div>
      <p style="font-size: var(--font-xs); color:var(--text-secondary); margin-bottom: var(--space-lg); line-height: 1.45;">
        ระบบจะส่งรายงานผลการขายและยอดขายรวมถึงรายการบิลเข้าหากลุ่ม LINE ของเจ้าของร้านแบบอัตโนมัติ 
      </p>

      <div class="form-group">
        <label class="form-label">LINE Channel Access Token</label>
        <input 
          type="password" 
          class="form-input" 
          v-model="shopForm.line_channel_token" 
          placeholder="ใส่ Channel Access Token จาก LINE Console..." 
        />
      </div>
      <div class="form-group">
        <label class="form-label">LINE User/Group ID (ผู้รับแจ้งเตือน)</label>
        <input 
          type="text" 
          class="form-input" 
          v-model="shopForm.line_recipient_id" 
          placeholder="ใส่ User ID หรือ Group ID..." 
        />
      </div>

      <!-- Save Shop Settings Button -->
      <button class="btn btn-primary btn-block mt-lg" @click="saveShopSettings">
        💾 บันทึกตั้งค่าระบบร้าน
      </button>
    </div>

    <!-- Tab 2: User management -->
    <div v-if="activeTab === 'users'" class="card p-0 overflow-hidden">
      <div class="flex flex-between align-center p-md" style="border-bottom: 1px solid var(--border-color); background: rgba(139, 3, 19, 0.02);">
        <span class="font-bold" style="font-size: var(--font-sm);">👥 จัดการพนักงานหน้าร้าน</span>
        <button class="btn btn-primary btn-sm" @click="openAddUserModal">➕ เพิ่มพนักงาน</button>
      </div>

      <!-- Users list table -->
      <div style="overflow-x: auto;">
        <table class="table" style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-color); background: rgba(139, 3, 19, 0.03);">
              <th style="padding: var(--space-md); font-size:var(--font-sm);">ชื่อพนักงาน</th>
              <th style="padding: var(--space-md); font-size:var(--font-sm); text-align: center;">บทบาท</th>
              <th style="padding: var(--space-md); font-size:var(--font-sm); text-align: center;">รหัส PIN</th>
              <th style="padding: var(--space-md); font-size:var(--font-sm); text-align: center;">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="usersLoading">
              <td colspan="4" style="text-align: center; padding: var(--space-2xl);">
                <div class="spinner" style="margin: 0 auto;"></div>
              </td>
            </tr>
            <tr 
              v-else 
              v-for="u in users" 
              :key="u.id" 
              style="border-bottom: 1px solid var(--border-color);"
              class="table-row-hover"
            >
              <td style="padding: var(--space-md); vertical-align: middle;">
                <div class="font-bold" style="font-size: var(--font-base);">{{ u.name }}</div>
                <div style="font-size: 10px; color: var(--text-tertiary);">สมัครเมื่อ: {{ formatDate(u.created_at) }}</div>
              </td>
              <td style="padding: var(--space-md); text-align: center; vertical-align: middle;">
                <span class="badge" :class="u.role === 'admin' ? 'badge-primary' : 'badge-neutral'">
                  {{ u.role === 'admin' ? 'เจ้าของร้าน' : 'พนักงาน' }}
                </span>
              </td>
              <td style="padding: var(--space-md); text-align: center; font-weight: bold; vertical-align: middle; color:var(--primary);">
                ••••
              </td>
              <td style="padding: var(--space-md); text-align: center; vertical-align: middle;">
                <div class="flex justify-center gap-sm">
                  <button class="btn-action btn-action-edit" title="แก้ไข" @click="openEditUserModal(u)">📝 แก้ไข</button>
                  <button 
                    class="btn-action btn-action-delete" 
                    title="ลบ"
                    :disabled="u.id === currentUser?.id"
                    @click="handleDeleteUser(u.id)"
                  >
                    🗑️ ลบ
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- User Add/Edit Dialog Modal -->
    <div v-if="showUserModal" class="modal-container active" style="display:flex; align-items:center; justify-content:center; position: fixed; inset:0; z-index:1000;">
      <div class="modal-overlay" @click="showUserModal = false"></div>
      <div class="modal-content modal-center w-full max-w-sm" style="position:relative; z-index:2;">
        <div class="modal-header">
          <h3>{{ isEditUserMode ? '📝 แก้ไขข้อมูลพนักงาน' : '👥 เพิ่มพนักงานหน้าร้าน' }}</h3>
          <button class="modal-close" @click="showUserModal = false">✕</button>
        </div>
        <div class="modal-body">
          <!-- Name -->
          <div class="form-group">
            <label class="form-label">ชื่อพนักงาน *</label>
            <input 
              type="text" 
              class="form-input" 
              v-model="userForm.name" 
              placeholder="ระบุชื่อจริงหรือชื่อเล่น..." 
            />
          </div>

          <!-- PIN -->
          <div class="form-group">
            <label class="form-label">รหัส PIN 4 หลัก * (สำหรับล็อกอินเข้าร้าน)</label>
            <input 
              type="password" 
              class="form-input" 
              v-model="userForm.pin" 
              placeholder="ป้อนรหัส 4 ตัวเลข..." 
              maxlength="4"
            />
          </div>

          <!-- Role -->
          <div class="form-group">
            <label class="form-label">สิทธิ์การใช้งานระบบ *</label>
            <select class="form-select" v-model="userForm.role">
              <option value="staff">พนักงานหน้าร้าน (ขายและคุมสต็อกได้)</option>
              <option value="admin">ผู้บริหาร/เจ้าของร้าน (ดูรายงานและแก้การตั้งค่าได้)</option>
            </select>
          </div>

          <!-- Buttons -->
          <div class="flex gap-md mt-lg">
            <button class="btn btn-secondary flex-1" @click="showUserModal = false">ยกเลิก</button>
            <button 
              class="btn btn-primary flex-1" 
              :disabled="!userForm.name || !userForm.pin || userForm.pin.length !== 4"
              @click="handleSaveUser"
            >
              💾 บันทึกข้อมูล
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../api';
import { ui, formatDate, getUser } from '../helpers';

// States
const activeTab = ref('shop');
const currentUser = ref(null);
const users = ref([]);
const usersLoading = ref(false);
const showUserModal = ref(false);
const isEditUserMode = ref(false);
const editUserId = ref(null);

// Forms
const shopForm = ref({
  shop_name: 'ร้านไก่ทอดช้างแดง',
  promptpay_id: '',
  daily_report_time: '21:00',
  low_stock_threshold: 5,
  line_channel_token: '',
  line_recipient_id: ''
});

const userForm = ref({
  name: '',
  pin: '',
  role: 'staff'
});

// Load Shop Settings
const loadShopSettings = async () => {
  ui.showLoading();
  try {
    const res = await api.settings.getAll();
    if (res.success) {
      const data = res.data;
      shopForm.value = {
        shop_name: data.shop_name || 'ร้านไก่ทอดช้างแดง',
        promptpay_id: data.promptpay_id || '',
        daily_report_time: data.daily_report_time || '21:00',
        low_stock_threshold: Number(data.low_stock_threshold) || 5,
        line_channel_token: data.line_channel_token || '',
        line_recipient_id: data.line_recipient_id || ''
      };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
    ui.showToast('ไม่สามารถดึงข้อมูลตั้งค่าระบบได้', 'error');
  } finally {
    ui.hideLoading();
  }
};

// Save Shop Settings to Database
const saveShopSettings = async () => {
  ui.showLoading();
  try {
    const promises = Object.entries(shopForm.value).map(([key, val]) => {
      return api.settings.update(key, String(val));
    });
    
    await Promise.all(promises);
    ui.showToast('บันทึกการตั้งค่าร้านสำเร็จแล้ว 🎉', 'success');
  } catch (error) {
    console.error(error);
    ui.showToast('บันทึกตั้งค่าไม่สำเร็จ: ' + error.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

// Users Logic
const loadUsersData = async () => {
  usersLoading.value = true;
  try {
    const res = await api.auth.getUsers();
    users.value = res.data || res || [];
  } catch (e) {
    console.error(e);
    ui.showToast('ไม่สามารถโหลดข้อมูลพนักงานได้', 'error');
  } finally {
    usersLoading.value = false;
  }
};

const openAddUserModal = () => {
  isEditUserMode.value = false;
  editUserId.value = null;
  userForm.value = {
    name: '',
    pin: '',
    role: 'staff'
  };
  showUserModal.value = true;
};

const openEditUserModal = (u) => {
  isEditUserMode.value = true;
  editUserId.value = u.id;
  userForm.value = {
    name: u.name,
    pin: '', // Keep PIN empty initially for security
    role: u.role
  };
  showUserModal.value = true;
};

const handleSaveUser = async () => {
  ui.showLoading();
  try {
    const payload = {
      name: userForm.value.name,
      pin: userForm.value.pin,
      role: userForm.value.role
    };

    let res;
    if (isEditUserMode.value) {
      res = await api.auth.updateUser(editUserId.value, payload);
    } else {
      res = await api.auth.createUser(payload);
    }

    if (res.success) {
      ui.showToast(isEditUserMode.value ? 'แก้ไขข้อมูลพนักงานสำเร็จ' : 'เพิ่มพนักงานสำเร็จ', 'success');
      showUserModal.value = false;
      loadUsersData();
    }
  } catch (e) {
    console.error(e);
    ui.showToast('บันทึกข้อมูลพนักงานไม่สำเร็จ: ' + e.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

const handleDeleteUser = async (id) => {
  const confirm = await ui.showConfirm('ลบข้อมูลพนักงาน', 'คุณยืนยันต้องการลบพนักงานคนนี้ใช่หรือไม่?');
  if (confirm) {
    ui.showLoading();
    try {
      const res = await api.auth.deleteUser(id);
      if (res.success) {
        ui.showToast('ลบพนักงานสำเร็จเรียบร้อย', 'success');
        loadUsersData();
      }
    } catch (e) {
      console.error(e);
      ui.showToast('ลบพนักงานไม่สำเร็จ: ' + e.message, 'error');
    } finally {
      ui.hideLoading();
    }
  }
};

onMounted(() => {
  currentUser.value = getUser();
  loadShopSettings();
  loadUsersData();
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

.table-row-hover:hover {
  background: rgba(139, 3, 19, 0.015) !important;
}

/* --- Setting Item --- */
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg) 0;
  border-bottom: 1px solid var(--border-color);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  font-size: var(--font-base);
  font-weight: var(--font-weight-medium);
}

.setting-desc {
  font-size: var(--font-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
}

.setting-value {
  font-size: var(--font-sm);
  color: var(--text-secondary);
}

/* --- Staff Card --- */
.staff-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-md);
}

.staff-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--gradient-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-md);
  flex-shrink: 0;
}

.staff-info {
  flex: 1;
  min-width: 0;
}

.staff-name {
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-base);
}

.staff-role {
  font-size: var(--font-xs);
  color: var(--text-secondary);
}
</style>
