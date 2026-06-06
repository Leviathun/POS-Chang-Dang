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
      <button 
        class="category-tab" 
        :class="{ 'active': activeTab === 'branches' }"
        @click="activeTab = 'branches'"
      >
        🏪 จัดการสาขา
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
    <div v-if="activeTab === 'users'" class="flex flex-col gap-lg" style="width: 100%;">
      <!-- Top Action Card -->
      <div class="card flex flex-between align-center p-lg staff-header-card" style="background: var(--card-bg); gap: var(--space-md); flex-wrap: wrap;">
        <span class="font-bold" style="font-size: 1.25rem;">👥 จัดการพนักงานหน้าร้าน</span>
        <button class="btn btn-primary" style="font-weight: bold; min-height: 44px; padding: 10px 20px;" @click="openAddUserModal">➕ เพิ่มพนักงาน</button>
      </div>

      <!-- Users list table (Visible on Desktop Only) -->
      <div class="card p-0 overflow-hidden hide-mobile">
        <div style="overflow-x: auto;">
          <table class="table" style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); background: rgba(139, 3, 19, 0.03);">
                <th style="padding: var(--space-md);">ชื่อพนักงาน</th>
                <th style="padding: var(--space-md); text-align: center;">สาขา</th>
                <th style="padding: var(--space-md); text-align: center;">บทบาท</th>
                <th style="padding: var(--space-md); text-align: center;">รหัส PIN</th>
                <th style="padding: var(--space-md); text-align: center;">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="usersLoading">
                <td colspan="5" style="text-align: center; padding: var(--space-2xl);">
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
                  <span style="font-size: var(--font-xs); color: var(--text-secondary);">
                    🏠 {{ getBranchName(u.branch_id) }}
                  </span>
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

      <!-- Mobile Users Cards List (Visible on Mobile Only) -->
      <div class="show-mobile-only p-md mobile-users-list">
        <div v-if="usersLoading" style="text-align: center; padding: var(--space-xl);">
          <div class="spinner" style="margin: 0 auto;"></div>
        </div>
        <div v-else-if="users.length === 0" style="text-align: center; padding: var(--space-xl); color: var(--text-tertiary);">
          ยังไม่มีข้อมูลพนักงาน
        </div>
        <div 
          v-else 
          v-for="u in users" 
          :key="u.id"
          class="card p-sm flex align-center gap-md"
          style="margin-bottom: var(--space-sm);"
        >
          <!-- Profile Badge -->
          <div 
            style="width: 44px; height: 44px; border-radius: 50%; background: var(--gradient-primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: var(--font-md); flex-shrink: 0;"
          >
            {{ u.name ? u.name.charAt(0).toUpperCase() : '👤' }}
          </div>

          <!-- Info & Actions -->
          <div class="flex-1" style="min-width: 0;">
            <div class="flex flex-between align-center mb-xs">
              <span class="font-bold text-primary" style="font-size: var(--font-base);">{{ u.name }}</span>
              <span class="badge" :class="u.role === 'admin' ? 'badge-primary' : 'badge-neutral'">
                {{ u.role === 'admin' ? 'เจ้าของร้าน' : 'พนักงาน' }}
              </span>
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: var(--space-sm);">
              🏠 {{ getBranchName(u.branch_id) }} | PIN: <strong style="color:var(--primary);">••••</strong>
            </div>
            <!-- Actions buttons in card -->
            <div class="flex gap-sm">
              <button 
                class="btn btn-sm flex-1" 
                style="background: rgba(255, 171, 43, 0.12); color: var(--accent-dark); border: 1px solid rgba(255, 171, 43, 0.25); min-height: 36px; font-size: 12px; justify-content: center;" 
                @click="openEditUserModal(u)"
              >
                📝 แก้ไข
              </button>
              <button 
                class="btn btn-sm flex-1" 
                style="background: rgba(173, 40, 30, 0.08); color: var(--primary); border: 1px solid rgba(173, 40, 30, 0.18); min-height: 36px; font-size: 12px; justify-content: center;" 
                :disabled="u.id === currentUser?.id"
                @click="handleDeleteUser(u.id)"
              >
                🗑️ ลบ
              </button>
            </div>
          </div>
        </div>
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
            <div class="custom-select-wrapper" @click.stop>
              <div 
                class="custom-select-trigger" 
                :class="{ 'active': isRoleDropdownOpen }" 
                @click="isRoleDropdownOpen = !isRoleDropdownOpen"
              >
                <span class="custom-select-text">
                  {{ userForm.role === 'admin' ? 'ผู้บริหาร/เจ้าของร้าน (ดูรายงานและแก้การตั้งค่าได้)' : 'พนักงานหน้าร้าน (ขายและคุมสต็อกได้)' }}
                </span>
              </div>
              <div v-if="isRoleDropdownOpen" class="custom-select-dropdown">
                <div class="custom-select-option" :class="{ 'selected': userForm.role === 'staff' }" @click="selectUserRole('staff')">พนักงานหน้าร้าน (ขายและคุมสต็อกได้)</div>
                <div class="custom-select-option" :class="{ 'selected': userForm.role === 'admin' }" @click="selectUserRole('admin')">ผู้บริหาร/เจ้าของร้าน (ดูรายงานและแก้การตั้งค่าได้)</div>
              </div>
            </div>
          </div>

          <!-- Branch -->
          <div class="form-group">
            <label class="form-label">🏠 สาขาที่สังกัด *</label>
            <div class="custom-select-wrapper" @click.stop>
              <div 
                class="custom-select-trigger" 
                :class="{ 'active': isBranchDropdownOpen }" 
                @click="isBranchDropdownOpen = !isBranchDropdownOpen"
              >
                <span class="custom-select-text">
                  {{ selectedUserBranchName }}
                </span>
              </div>
              <div v-if="isBranchDropdownOpen" class="custom-select-dropdown">
                <div 
                  v-for="b in branches" 
                  :key="b.id" 
                  class="custom-select-option"
                  :class="{ 'selected': b.id === userForm.branch_id }"
                  @click="selectUserBranch(b.id)"
                >
                  {{ b.name }}{{ b.address ? ' — ' + b.address : '' }}
                </div>
              </div>
            </div>
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

    <!-- Tab 3: Branch management (Admin only) -->
    <div v-if="activeTab === 'branches'" class="flex flex-col gap-lg" style="width: 100%;">
      <!-- Top Action Card -->
      <div class="card flex flex-between align-center p-lg staff-header-card" style="background: var(--card-bg); gap: var(--space-md); flex-wrap: wrap;">
        <span class="font-bold" style="font-size: 1.25rem;">🏪 จัดการสาขาของร้าน</span>
        <button class="btn btn-primary" style="font-weight: bold; min-height: 44px; padding: 10px 20px;" @click="openAddBranchModal">➕ เพิ่มสาขา</button>
      </div>

      <!-- Branch list table (Visible on Desktop Only) -->
      <div class="card p-0 overflow-hidden hide-mobile">
        <div style="overflow-x: auto;">
          <table class="table" style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); background: rgba(139, 3, 19, 0.03);">
                <th style="padding: var(--space-md);">ชื่อสาขา</th>
                <th style="padding: var(--space-md);">ที่อยู่</th>
                <th style="padding: var(--space-md); text-align: center;">เบอร์โทรศัพท์</th>
                <th style="padding: var(--space-md); text-align: center;">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="branches.length === 0">
                <td colspan="4" style="text-align: center; padding: var(--space-xl); color: var(--text-tertiary);">
                  ยังไม่มีข้อมูลสาขา
                </td>
              </tr>
              <tr 
                v-else 
                v-for="b in branches" 
                :key="b.id" 
                style="border-bottom: 1px solid var(--border-color);"
                class="table-row-hover"
              >
                <td style="padding: var(--space-md); vertical-align: middle; font-weight: bold;">
                  {{ b.name }}
                </td>
                <td style="padding: var(--space-md); vertical-align: middle; color: var(--text-secondary);">
                  {{ b.address || '-' }}
                </td>
                <td style="padding: var(--space-md); text-align: center; vertical-align: middle;">
                  {{ b.phone || '-' }}
                </td>
                <td style="padding: var(--space-md); text-align: center; vertical-align: middle;">
                  <div class="flex justify-center gap-sm">
                    <button class="btn-action btn-action-edit" title="แก้ไข" @click="openEditBranchModal(b)">📝 แก้ไข</button>
                    <button class="btn-action btn-action-delete" title="ลบ" @click="handleDeleteBranch(b.id)">🗑️ ลบ</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mobile Branch Cards List (Visible on Mobile Only) -->
      <div class="show-mobile-only p-md mobile-users-list">
        <div v-if="branches.length === 0" style="text-align: center; padding: var(--space-xl); color: var(--text-tertiary);">
          ยังไม่มีข้อมูลสาขา
        </div>
        <div 
          v-else 
          v-for="b in branches" 
          :key="b.id"
          class="card p-sm flex align-center gap-md"
          style="margin-bottom: var(--space-sm);"
        >
          <div 
            style="width: 44px; height: 44px; border-radius: 50%; background: var(--gradient-primary); color: white; display: flex; align-items: center; justify-content: center; font-size: var(--font-md); flex-shrink: 0;"
          >
            🏪
          </div>

          <div class="flex-1" style="min-width: 0;">
            <div class="font-bold text-primary mb-xs" style="font-size: var(--font-base);">{{ b.name }}</div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 2px;">
              📍 ที่อยู่: {{ b.address || '-' }}
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: var(--space-sm);">
              📞 โทร: {{ b.phone || '-' }}
            </div>
            <div class="flex gap-sm">
              <button 
                class="btn btn-sm flex-1" 
                style="background: rgba(255, 171, 43, 0.12); color: var(--accent-dark); border: 1px solid rgba(255, 171, 43, 0.25); min-height: 36px; font-size: 12px; justify-content: center;" 
                @click="openEditBranchModal(b)"
              >
                📝 แก้ไข
              </button>
              <button 
                class="btn btn-sm flex-1" 
                style="background: rgba(173, 40, 30, 0.08); color: var(--primary); border: 1px solid rgba(173, 40, 30, 0.18); min-height: 36px; font-size: 12px; justify-content: center;" 
                @click="handleDeleteBranch(b.id)"
              >
                🗑️ ลบ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Branch Add/Edit Dialog Modal -->
    <div v-if="showBranchModal" class="modal-container active" style="display:flex; align-items:center; justify-content:center; position: fixed; inset:0; z-index:1000;">
      <div class="modal-overlay" @click="showBranchModal = false"></div>
      <div class="modal-content modal-center w-full max-w-sm" style="position:relative; z-index:2;">
        <div class="modal-header">
          <h3>{{ isEditBranchMode ? '🏪 แก้ไขข้อมูลสาขา' : '🏪 เพิ่มสาขาใหม่' }}</h3>
          <button class="modal-close" @click="showBranchModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">ชื่อสาขา *</label>
            <input 
              type="text" 
              class="form-input" 
              v-model="branchForm.name" 
              placeholder="เช่น สาขาลาดพร้าว, สาขาสยาม..." 
            />
          </div>

          <div class="form-group">
            <label class="form-label">ที่อยู่สาขา</label>
            <input 
              type="text" 
              class="form-input" 
              v-model="branchForm.address" 
              placeholder="ระบุที่ตั้งสาขา..." 
            />
          </div>

          <div class="form-group">
            <label class="form-label">เบอร์โทรศัพท์สาขา</label>
            <input 
              type="text" 
              class="form-input" 
              v-model="branchForm.phone" 
              placeholder="เช่น 02-123-4567..." 
            />
          </div>

          <div class="flex gap-md mt-lg">
            <button class="btn btn-secondary flex-1" @click="showBranchModal = false">ยกเลิก</button>
            <button 
              class="btn btn-primary flex-1" 
              :disabled="!branchForm.name || !branchForm.name.trim()"
              @click="handleSaveBranch"
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import api from '../api';
import { ui, formatDate, getUser } from '../helpers';

// Custom Dropdown logic for Settings.vue
const isRoleDropdownOpen = ref(false);
const isBranchDropdownOpen = ref(false);

const selectedUserBranchName = computed(() => {
  const b = branches.value.find(x => x.id === userForm.value.branch_id);
  return b ? b.name + (b.address ? ' — ' + b.address : '') : 'เลือกสาขาที่สังกัด...';
});

const selectUserRole = (role) => {
  userForm.value.role = role;
  isRoleDropdownOpen.value = false;
};

const selectUserBranch = (branchId) => {
  userForm.value.branch_id = branchId;
  isBranchDropdownOpen.value = false;
};

const closeSettingsDropdowns = () => {
  isRoleDropdownOpen.value = false;
  isBranchDropdownOpen.value = false;
};

// States
const activeTab = ref('shop');
const currentUser = ref(null);
const users = ref([]);
const usersLoading = ref(false);
const showUserModal = ref(false);
const isEditUserMode = ref(false);
const editUserId = ref(null);
const branches = ref([]);

// Branch CRUD States
const showBranchModal = ref(false);
const isEditBranchMode = ref(false);
const editBranchId = ref(null);
const branchForm = ref({
  name: '',
  address: '',
  phone: ''
});

const openAddBranchModal = () => {
  isEditBranchMode.value = false;
  editBranchId.value = null;
  branchForm.value = {
    name: '',
    address: '',
    phone: ''
  };
  showBranchModal.value = true;
};

const openEditBranchModal = (b) => {
  isEditBranchMode.value = true;
  editBranchId.value = b.id;
  branchForm.value = {
    name: b.name,
    address: b.address || '',
    phone: b.phone || ''
  };
  showBranchModal.value = true;
};

const handleSaveBranch = async () => {
  ui.showLoading();
  try {
    const payload = {
      name: branchForm.value.name,
      address: branchForm.value.address,
      phone: branchForm.value.phone
    };

    let res;
    if (isEditBranchMode.value) {
      res = await api.auth.updateBranch(editBranchId.value, payload);
    } else {
      res = await api.auth.createBranch(payload);
    }

    if (res.success) {
      ui.showToast(isEditBranchMode.value ? 'แก้ไขข้อมูลสาขาสำเร็จ' : 'เพิ่มสาขาใหม่สำเร็จ', 'success');
      showBranchModal.value = false;
      loadBranches();
    }
  } catch (e) {
    console.error(e);
    ui.showToast('บันทึกข้อมูลสาขาไม่สำเร็จ: ' + e.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

const handleDeleteBranch = async (id) => {
  const confirm = await ui.showConfirm('ลบสาขา', 'คุณยืนยันต้องการลบสาขานี้ใช่หรือไม่? คุณสมบัติของพนักงานและออเดอร์ในระบบอาจได้รับผลกระทบ');
  if (confirm) {
    ui.showLoading();
    try {
      const res = await api.auth.deleteBranch(id);
      if (res.success) {
        ui.showToast('ลบสาขาสำเร็จเรียบร้อย', 'success');
        loadBranches();
      }
    } catch (e) {
      console.error(e);
      ui.showToast('ลบสาขาไม่สำเร็จ: ' + e.message, 'error');
    } finally {
      ui.hideLoading();
    }
  }
};

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
  role: 'staff',
  branch_id: null
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
    role: 'staff',
    branch_id: branches.value.length > 0 ? branches.value[0].id : null
  };
  showUserModal.value = true;
};

const openEditUserModal = (u) => {
  isEditUserMode.value = true;
  editUserId.value = u.id;
  userForm.value = {
    name: u.name,
    pin: '', // Keep PIN empty initially for security
    role: u.role,
    branch_id: u.branch_id || (branches.value.length > 0 ? branches.value[0].id : null)
  };
  showUserModal.value = true;
};

const handleSaveUser = async () => {
  ui.showLoading();
  try {
    const payload = {
      name: userForm.value.name,
      pin: userForm.value.pin,
      role: userForm.value.role,
      branch_id: userForm.value.branch_id
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

// Load branches for user management
const loadBranches = async () => {
  try {
    const res = await api.auth.getBranches();
    if (res.success && Array.isArray(res.data)) {
      branches.value = res.data;
    }
  } catch (e) {
    console.warn('⚠️ Could not load branches:', e.message);
  }
};

const getBranchName = (branchId) => {
  if (!branchId) return 'ไม่ระบุ';
  const b = branches.value.find(br => br.id === branchId);
  return b ? b.name : `สาขา #${branchId}`;
};

onMounted(() => {
  currentUser.value = getUser();
  loadShopSettings();
  loadBranches();
  loadUsersData();
  window.addEventListener('click', closeSettingsDropdowns);
});

onUnmounted(() => {
  window.removeEventListener('click', closeSettingsDropdowns);
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

/* --- Responsive Visibility Utilities --- */
.show-mobile-only {
  display: none !important;
}
.hide-mobile {
  display: block;
}

@media (max-width: 768px) {
  .show-mobile-only {
    display: block !important;
  }
  .show-mobile-only.mobile-users-list {
    display: flex !important;
    flex-direction: column;
    gap: var(--space-sm);
  }
  .hide-mobile {
    display: none !important;
  }
  .staff-header-card {
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    text-align: center !important;
  }
}
</style>
