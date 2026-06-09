<template>
  <div id="settings-page" class="page-enter">
    
    <!-- Tab toggles inside Settings page -->
    <div class="category-tabs mb-lg">
      <button 
        class="category-tab" 
        :class="{ 'active': activeTab === 'shop' }"
        @click="activeTab = 'shop'"
      >
        <i class="fa-solid fa-store" style="margin-right: 4px;"></i> ตั้งค่าร้านค้า
      </button>
      <button 
        class="category-tab" 
        :class="{ 'active': activeTab === 'users' }"
        @click="activeTab = 'users'"
      >
        <i class="fa-solid fa-users" style="margin-right: 4px;"></i> พนักงานหน้าร้าน
      </button>
      <button 
        class="category-tab" 
        :class="{ 'active': activeTab === 'branches' }"
        @click="activeTab = 'branches'"
      >
        <i class="fa-solid fa-code-branch" style="margin-right: 4px;"></i> จัดการสาขา
      </button>
      <button 
        v-if="currentUser?.role === 'admin'"
        class="category-tab" 
        :class="{ 'active': activeTab === 'presets' }"
        @click="activeTab = 'presets'"
      >
        <i class="fa-solid fa-mortar-pestle" style="margin-right: 4px;"></i> สูตรเครื่องปรุง
      </button>
      <button 
        v-if="currentUser?.role === 'admin'"
        class="category-tab" 
        :class="{ 'active': activeTab === 'backup' }"
        @click="activeTab = 'backup'"
      >
        <i class="fa-solid fa-database" style="margin-right: 4px;"></i> สำรอง & จัดเก็บข้อมูล
      </button>
    </div>

    <!-- Tab 1: Shop Settings Form -->
    <div v-if="activeTab === 'shop'" class="card">
      <div class="card-title" style="font-size: var(--font-sm);"><i class="fa-solid fa-store" style="margin-right: 6px;"></i> ข้อมูลร้านและคีย์การทำธุรกรรม</div>

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
      <div class="card-title" style="font-size: var(--font-sm);"><i class="fa-solid fa-comment" style="margin-right: 6px;"></i> LINE Messaging Integration</div>
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
      <button class="btn btn-primary btn-block mt-lg" @click="saveShopSettings" style="display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
        <i class="fa-solid fa-floppy-disk"></i> บันทึกตั้งค่าระบบร้าน
      </button>
    </div>

    <!-- Tab 2: User management -->
    <div v-if="activeTab === 'users'" class="flex flex-col gap-lg" style="width: 100%;">
      <!-- Top Action Card -->
      <div class="card flex flex-between align-center p-lg staff-header-card" style="background: var(--card-bg); gap: var(--space-md); flex-wrap: wrap;">
        <span class="font-bold" style="font-size: 1.25rem;"><i class="fa-solid fa-users" style="margin-right: 6px;"></i> จัดการพนักงานหน้าร้าน</span>
        <button class="btn btn-primary" style="font-weight: bold; min-height: 44px; padding: 10px 20px;" @click="openAddUserModal"><i class="fa-solid fa-plus" style="margin-right: 4px;"></i> เพิ่มพนักงาน</button>
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
                  <span style="font-size: var(--font-xs); color: var(--text-secondary); display: inline-flex; align-items: center; gap: 4px;">
                    <i class="fa-solid fa-store" style="color: var(--text-tertiary);"></i> {{ getBranchName(u.branch_id) }}
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
                    <button class="btn-action btn-action-edit" title="แก้ไข" @click="openEditUserModal(u)"><i class="fa-solid fa-pen-to-square" style="margin-right: 4px;"></i> แก้ไข</button>
                    <button 
                      class="btn-action btn-action-delete" 
                      title="ลบ"
                      :disabled="u.id === currentUser?.id"
                      @click="handleDeleteUser(u.id)"
                    >
                      <i class="fa-solid fa-trash-can" style="margin-right: 4px;"></i> ลบ
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
            <i v-if="!u.name" class="fa-solid fa-user"></i>
            <span v-else>{{ u.name.charAt(0).toUpperCase() }}</span>
          </div>

          <!-- Info & Actions -->
          <div class="flex-1" style="min-width: 0;">
            <div class="flex flex-between align-center mb-xs">
              <span class="font-bold text-primary" style="font-size: var(--font-base);">{{ u.name }}</span>
              <span class="badge" :class="u.role === 'admin' ? 'badge-primary' : 'badge-neutral'">
                {{ u.role === 'admin' ? 'เจ้าของร้าน' : 'พนักงาน' }}
              </span>
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: var(--space-sm); display: inline-flex; align-items: center; gap: 4px;">
              <i class="fa-solid fa-store" style="color: var(--text-tertiary);"></i> {{ getBranchName(u.branch_id) }} | PIN: <strong style="color:var(--primary);">••••</strong>
            </div>
            <!-- Actions buttons in card -->
            <div class="flex gap-sm">
              <button 
                class="btn btn-sm flex-1" 
                style="background: rgba(255, 171, 43, 0.12); color: var(--accent-dark); border: 1px solid rgba(255, 171, 43, 0.25); min-height: 36px; font-size: 12px; justify-content: center; display: inline-flex; align-items: center; gap: 4px;" 
                @click="openEditUserModal(u)"
              >
                <i class="fa-solid fa-pen-to-square"></i> แก้ไข
              </button>
              <button 
                class="btn btn-sm flex-1" 
                style="background: rgba(173, 40, 30, 0.08); color: var(--primary); border: 1px solid rgba(173, 40, 30, 0.18); min-height: 36px; font-size: 12px; justify-content: center; display: inline-flex; align-items: center; gap: 4px;" 
                :disabled="u.id === currentUser?.id"
                @click="handleDeleteUser(u.id)"
              >
                <i class="fa-solid fa-trash-can"></i> ลบ
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
          <h3>
            <i :class="isEditUserMode ? 'fa-solid fa-pen-to-square' : 'fa-solid fa-users'" style="margin-right: 6px;"></i>
            {{ isEditUserMode ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานหน้าร้าน' }}
          </h3>
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
            <label class="form-label"><i class="fa-solid fa-store" style="margin-right: 4px;"></i> สาขาที่สังกัด *</label>
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
              style="display: inline-flex; align-items: center; justify-content: center; gap: 4px;"
            >
              <i class="fa-solid fa-floppy-disk"></i> บันทึกข้อมูล
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 3: Branch management (Admin only) -->
    <div v-if="activeTab === 'branches'" class="flex flex-col gap-lg" style="width: 100%;">
      <!-- Top Action Card -->
      <div class="card flex flex-between align-center p-lg staff-header-card" style="background: var(--card-bg); gap: var(--space-md); flex-wrap: wrap;">
        <span class="font-bold" style="font-size: 1.25rem;"><i class="fa-solid fa-store" style="margin-right: 6px;"></i> จัดการสาขาของร้าน</span>
        <button class="btn btn-primary" style="font-weight: bold; min-height: 44px; padding: 10px 20px;" @click="openAddBranchModal"><i class="fa-solid fa-plus" style="margin-right: 4px;"></i> เพิ่มสาขา</button>
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
                    <button class="btn-action btn-action-edit" title="แก้ไข" @click="openEditBranchModal(b)"><i class="fa-solid fa-pen-to-square" style="margin-right: 4px;"></i> แก้ไข</button>
                    <button class="btn-action btn-action-delete" title="ลบ" @click="handleDeleteBranch(b.id)"><i class="fa-solid fa-trash-can" style="margin-right: 4px;"></i> ลบ</button>
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
            <i class="fa-solid fa-store" style="font-size: 1.2rem;"></i>
          </div>

          <div class="flex-1" style="min-width: 0;">
            <div class="font-bold text-primary mb-xs" style="font-size: var(--font-base);">{{ b.name }}</div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 2px;">
              <i class="fa-solid fa-location-dot" style="margin-right: 4px; color: var(--primary);"></i> ที่อยู่: {{ b.address || '-' }}
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: var(--space-sm);">
              <i class="fa-solid fa-phone" style="margin-right: 4px; color: var(--primary);"></i> โทร: {{ b.phone || '-' }}
            </div>
            <div class="flex gap-sm">
              <button 
                class="btn btn-sm flex-1" 
                style="background: rgba(255, 171, 43, 0.12); color: var(--accent-dark); border: 1px solid rgba(255, 171, 43, 0.25); min-height: 36px; font-size: 12px; justify-content: center; display: inline-flex; align-items: center; gap: 4px;" 
                @click="openEditBranchModal(b)"
              >
                <i class="fa-solid fa-pen-to-square"></i> แก้ไข
              </button>
              <button 
                class="btn btn-sm flex-1" 
                style="background: rgba(173, 40, 30, 0.08); color: var(--primary); border: 1px solid rgba(173, 40, 30, 0.18); min-height: 36px; font-size: 12px; justify-content: center; display: inline-flex; align-items: center; gap: 4px;" 
                @click="handleDeleteBranch(b.id)"
              >
                <i class="fa-solid fa-trash-can"></i> ลบ
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
          <h3>
            <i :class="isEditBranchMode ? 'fa-solid fa-pen-to-square' : 'fa-solid fa-store'" style="margin-right: 6px;"></i>
            {{ isEditBranchMode ? 'แก้ไขข้อมูลสาขา' : 'เพิ่มสาขาใหม่' }}
          </h3>
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
              style="display: inline-flex; align-items: center; justify-content: center; gap: 4px;"
            >
              <i class="fa-solid fa-floppy-disk"></i> บันทึกข้อมูล
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 4: Presets CRUD -->
    <div v-if="activeTab === 'presets'" class="flex flex-col gap-lg" style="width: 100%;">
      <!-- Top Action Card -->
      <div class="card flex flex-between align-center p-lg staff-header-card" style="background: var(--card-bg); gap: var(--space-md); flex-wrap: wrap;">
        <span class="font-bold" style="font-size: 1.25rem;"><i class="fa-solid fa-mortar-pestle" style="margin-right: 6px;"></i> สูตรเครื่องปรุงสำเร็จรูป</span>
        <button class="btn btn-primary" style="font-weight: bold; min-height: 44px; padding: 10px 20px;" @click="openAddPresetModal"><i class="fa-solid fa-plus" style="margin-right: 4px;"></i> เพิ่มสูตรสำเร็จ</button>
      </div>

      <!-- Presets List -->
      <div class="card p-0 overflow-hidden hide-mobile">
        <div style="overflow-x: auto;">
          <table class="table" style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); background: rgba(139, 3, 19, 0.03);">
                <th style="padding: var(--space-md);">ชื่อสูตร</th>
                <th style="padding: var(--space-md);">เครื่องปรุงที่รวมอยู่</th>
                <th style="padding: var(--space-md); text-align: center;">สถานะ</th>
                <th style="padding: var(--space-md); text-align: center;">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="presetsLoading">
                <td colspan="4" style="text-align: center; padding: var(--space-2xl);">
                  <div class="spinner" style="margin: 0 auto;"></div>
                </td>
              </tr>
              <tr v-else-if="presets.length === 0">
                <td colspan="4" style="text-align: center; padding: var(--space-xl); color: var(--text-tertiary);">
                  ยังไม่มีข้อมูลสูตรผสมสำเร็จรูป
                </td>
              </tr>
              <tr 
                v-else 
                v-for="p in presets" 
                :key="p.id" 
                style="border-bottom: 1px solid var(--border-color);"
                class="table-row-hover"
              >
                <td style="padding: var(--space-md); vertical-align: middle; font-weight: bold;">
                  {{ p.name }}
                </td>
                <td style="padding: var(--space-md); vertical-align: middle; color: var(--text-secondary);">
                  <div class="flex gap-xs" style="flex-wrap: wrap;">
                    <span v-for="mid in p.modifier_ids" :key="mid" class="modifier-pill">
                      {{ getModifierName(mid) }}
                    </span>
                  </div>
                </td>
                <td style="padding: var(--space-md); text-align: center; vertical-align: middle;">
                  <span class="badge" :class="p.active ? 'badge-primary' : 'badge-neutral'">
                    {{ p.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
                  </span>
                </td>
                <td style="padding: var(--space-md); text-align: center; vertical-align: middle;">
                  <div class="flex justify-center gap-sm">
                    <button class="btn-action btn-action-edit" title="แก้ไข" @click="openEditPresetModal(p)"><i class="fa-solid fa-pen-to-square" style="margin-right: 4px;"></i> แก้ไข</button>
                    <button class="btn-action btn-action-delete" title="ลบ" @click="handleDeletePreset(p.id)"><i class="fa-solid fa-trash-can" style="margin-right: 4px;"></i> ลบ</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mobile Presets List -->
      <div class="show-mobile-only" style="display: none;">
        <div v-if="presetsLoading" class="card p-lg text-center" style="background: var(--card-bg);">
          <div class="spinner" style="margin: 0 auto;"></div>
        </div>
        <div v-else-if="presets.length === 0" class="card p-lg text-center text-secondary" style="background: var(--card-bg);">
          ยังไม่มีข้อมูลสูตรผสมสำเร็จรูป
        </div>
        <div v-else class="flex flex-col gap-sm">
          <div 
            v-for="p in presets" 
            :key="p.id" 
            class="card p-md flex flex-col gap-sm"
            style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: var(--radius-lg);"
          >
            <div class="flex flex-between align-center">
              <span class="font-bold text-primary" style="font-size: var(--font-base);">{{ p.name }}</span>
              <span class="badge" :class="p.active ? 'badge-primary' : 'badge-neutral'">
                {{ p.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
              </span>
            </div>
            
            <div class="text-secondary" style="font-size: var(--font-xs);">
              <div class="mb-xs font-semibold" style="color: var(--text-secondary);">เครื่องปรุงที่รวมอยู่:</div>
              <div class="flex gap-xs" style="flex-wrap: wrap;">
                <span v-for="mid in p.modifier_ids" :key="mid" class="modifier-pill">
                  {{ getModifierName(mid) }}
                </span>
              </div>
            </div>

            <div class="divider" style="height: 1px; background: var(--border-color); margin: 4px 0;"></div>

            <div class="flex gap-sm justify-end">
              <button class="btn btn-sm btn-secondary flex-1" style="min-height: 36px; font-size: var(--font-xs); display: inline-flex; align-items: center; justify-content: center; gap: 4px;" @click="openEditPresetModal(p)"><i class="fa-solid fa-pen-to-square"></i> แก้ไข</button>
              <button class="btn btn-sm btn-ghost text-danger flex-1" style="min-height: 36px; font-size: var(--font-xs); border: 1px solid var(--danger-light); display: inline-flex; align-items: center; justify-content: center; gap: 4px;" @click="handleDeletePreset(p.id)"><i class="fa-solid fa-trash-can"></i> ลบ</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 5: Backup, Restore & Archive -->
    <div v-if="activeTab === 'backup'" class="flex flex-col gap-lg" style="width: 100%;">
      <!-- Card 1: Data Backup & Restore -->
      <div class="card">
        <div class="card-title mb-md" style="font-size: var(--font-base);"><i class="fa-solid fa-database" style="margin-right: 6px;"></i> สำรองและกู้คืนข้อมูล (Backup & Restore)</div>
        <p class="text-secondary mb-lg" style="font-size: var(--font-sm); line-height: 1.5;">
          คุณสามารถดาวน์โหลดข้อมูลระบบทั้งหมดเป็นไฟล์ JSON เพื่อเก็บสำรองไว้ หรืออัปโหลดไฟล์ที่ดาวน์โหลดไปเพื่อกู้คืนข้อมูลระบบได้
        </p>

        <div class="flex gap-md backup-btns-container" style="flex-wrap: wrap; margin-bottom: var(--space-lg);">
          <button class="btn btn-secondary flex-1" style="min-height:48px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;" @click="downloadJSONBackup">
            <i class="fa-solid fa-file-arrow-down"></i> ดาวน์โหลดสำรองข้อมูล (JSON)
          </button>
          <button class="btn btn-secondary flex-1" style="min-height:48px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;" @click="downloadSQLiteDB">
            <i class="fa-solid fa-download"></i> ดาวน์โหลดฐานข้อมูลดิบ (SQLite)
          </button>
        </div>

        <div class="divider mb-lg" style="height:1px; background:var(--border-color);"></div>

        <div class="form-group">
          <label class="form-label font-bold"><i class="fa-solid fa-file-arrow-up" style="margin-right: 4px;"></i> เลือกไฟล์ JSON เพื่อกู้คืนข้อมูลระบบ</label>
          <input 
            type="file" 
            class="form-input" 
            accept=".json"
            @change="handleImportJSON"
            ref="fileInput"
          />
        </div>
      </div>

      <!-- Card 2: Old Orders Archiving -->
      <div class="card">
        <div class="card-title mb-md" style="font-size: var(--font-base);"><i class="fa-solid fa-box-archive" style="margin-right: 6px;"></i> ย้ายและบีบอัดข้อมูลเก่า (Order Archive)</div>
        <p class="text-secondary mb-lg" style="font-size: var(--font-sm); line-height: 1.5;">
          เพื่อช่วยให้ฐานข้อมูลทำงานได้รวดเร็วและป้องกันไม่ให้ฐานข้อมูลบวม คุณสามารถย้ายออเดอร์และประวัติการขายที่เก่ากว่าช่วงเวลาที่กำหนด ไปไว้ที่ตารางเก็บประวัติถาวร (Archived Orders) ได้
        </p>

        <div class="form-group">
          <label class="form-label">ย้ายออเดอร์ที่เก่ากว่า: *</label>
          <div class="flex gap-sm archive-inputs-container">
            <select class="form-input flex-1" v-model.number="archiveMonths" style="min-height:44px; padding: 0 var(--space-sm);">
              <option :value="1">1 เดือนที่ผ่านมา</option>
              <option :value="3">3 เดือนที่ผ่านมา</option>
              <option :value="6">6 เดือนที่ผ่านมา</option>
              <option :value="12">1 ปีที่ผ่านมา</option>
            </select>
            <button class="btn btn-primary" style="font-weight:bold; min-height:44px; display: inline-flex; align-items: center; justify-content: center; gap: 4px;" @click="handleArchiveOrders">
              <i class="fa-solid fa-box-archive"></i> เริ่มจัดเก็บออเดอร์เก่า
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Preset Add/Edit Dialog Modal -->
    <div v-if="showPresetModal" class="modal-container active" style="display:flex; align-items:center; justify-content:center; position: fixed; inset:0; z-index:1000;">
      <div class="modal-overlay" @click="showPresetModal = false"></div>
      <div class="modal-content modal-center w-full max-w-sm" style="position:relative; z-index:2;">
        <div class="modal-header">
          <h3>
            <i :class="isEditPresetMode ? 'fa-solid fa-pen-to-square' : 'fa-solid fa-mortar-pestle'" style="margin-right: 6px;"></i>
            {{ isEditPresetMode ? 'แก้ไขสูตรเครื่องปรุงสำเร็จ' : 'เพิ่มสูตรเครื่องปรุงสำเร็จ' }}
          </h3>
          <button class="modal-close" @click="showPresetModal = false">✕</button>
        </div>
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto; text-align: left;">
          <!-- Name -->
          <div class="form-group">
            <label class="form-label">ชื่อสูตร *</label>
            <input 
              type="text" 
              class="form-input" 
              v-model="presetForm.name" 
              placeholder="เช่น มะเขือเทศ + ผงชีส..." 
            />
          </div>

          <!-- Modifiers Checkboxes -->
          <div class="form-group">
            <label class="form-label font-bold mb-xs">เลือกซอส/ผงปรุงรส/น้ำจิ้มที่ร่วมอยู่: *</label>
            <div style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); padding: 8px; border-radius: var(--radius-md); background: var(--bg-primary);">
              <label 
                v-for="mod in availableModifiers" 
                :key="mod.id" 
                class="flex align-center gap-sm"
                style="cursor: pointer; font-size: var(--font-sm); padding: 4px 0;"
              >
                <input 
                  type="checkbox" 
                  :value="mod.id" 
                  v-model="presetForm.modifier_ids"
                  style="width: 18px; height: 18px;"
                />
                <span>{{ mod.name }} ({{ getCategoryLabel(mod.category) }})</span>
              </label>
            </div>
          </div>

          <!-- Active status -->
          <div class="form-group flex align-center gap-sm" style="cursor: pointer; margin-top: 12px;">
            <input 
              type="checkbox" 
              id="preset-active-checkbox" 
              v-model="presetForm.active" 
              style="width: 18px; height: 18px;" 
            />
            <label for="preset-active-checkbox" style="cursor: pointer; font-size: var(--font-sm);">เปิดใช้งานสูตรสำเร็จนี้</label>
          </div>

          <!-- Buttons -->
          <div class="flex gap-md mt-lg">
            <button class="btn btn-secondary flex-1" @click="showPresetModal = false">ยกเลิก</button>
            <button 
              class="btn btn-primary flex-1" 
              :disabled="!presetForm.name.trim() || presetForm.modifier_ids.length === 0"
              @click="handleSavePreset"
              style="display: inline-flex; align-items: center; justify-content: center; gap: 4px;"
            >
              <i class="fa-solid fa-floppy-disk"></i> บันทึกข้อมูล
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

// Presets States & Logic
const presets = ref([]);
const presetsLoading = ref(false);
const showPresetModal = ref(false);
const isEditPresetMode = ref(false);
const editPresetId = ref(null);
const presetForm = ref({
  name: '',
  modifier_ids: [],
  active: true
});
const availableModifiers = ref([]);

// Backup & Archive States
const archiveMonths = ref(3);
const fileInput = ref(null);

const loadPresetsData = async () => {
  presetsLoading.value = true;
  try {
    const res = await api.freeModifiers.getPresets();
    if (res.success) {
      presets.value = res.data || [];
    }
  } catch (e) {
    console.error(e);
    ui.showToast('ไม่สามารถโหลดข้อมูลสูตรสำเร็จได้', 'error');
  } finally {
    presetsLoading.value = false;
  }
};

const loadAvailableModifiers = async () => {
  try {
    const res = await api.freeModifiers.getAll();
    if (res.success) {
      availableModifiers.value = res.data || [];
    }
  } catch (e) {
    console.error(e);
  }
};

const getModifierName = (id) => {
  const mod = availableModifiers.value.find(m => m.id === Number(id));
  return mod ? mod.name : `เครื่องปรุง #${id}`;
};

const getCategoryLabel = (category) => {
  const map = {
    'sauce_small': 'ซอสซองเล็ก',
    'sauce_large': 'ซอสถุงใหญ่',
    'dipping': 'น้ำจิ้ม',
    'powder': 'ผงปรุงรส'
  };
  return map[category] || category;
};

const openAddPresetModal = () => {
  isEditPresetMode.value = false;
  editPresetId.value = null;
  presetForm.value = {
    name: '',
    modifier_ids: [],
    active: true
  };
  showPresetModal.value = true;
};

const openEditPresetModal = (p) => {
  isEditPresetMode.value = true;
  editPresetId.value = p.id;
  presetForm.value = {
    name: p.name,
    modifier_ids: [...p.modifier_ids],
    active: p.active === 1 || p.active === true
  };
  showPresetModal.value = true;
};

const handleSavePreset = async () => {
  ui.showLoading();
  try {
    const payload = {
      name: presetForm.value.name,
      modifier_ids: presetForm.value.modifier_ids,
      active: presetForm.value.active ? 1 : 0
    };
    
    let res;
    if (isEditPresetMode.value) {
      res = await api.freeModifiers.updatePreset(editPresetId.value, payload);
    } else {
      res = await api.freeModifiers.createPreset(payload);
    }
    
    if (res.success) {
      ui.showToast(isEditPresetMode.value ? 'แก้ไขสูตรเครื่องปรุงสำเร็จ' : 'เพิ่มสูตรเครื่องปรุงใหม่สำเร็จ', 'success');
      showPresetModal.value = false;
      loadPresetsData();
    }
  } catch (e) {
    console.error(e);
    ui.showToast('บันทึกข้อมูลสูตรผสมล้มเหลว: ' + e.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

const handleDeletePreset = async (id) => {
  const confirm = await ui.showConfirm('ลบสูตรสำเร็จ', 'คุณยืนยันต้องการลบสูตรผสมสำเร็จรูปนี้ใช่หรือไม่?');
  if (confirm) {
    ui.showLoading();
    try {
      const res = await api.freeModifiers.deletePreset(id);
      if (res.success) {
        ui.showToast('ลบสูตรสำเร็จเรียบร้อย', 'success');
        loadPresetsData();
      }
    } catch (e) {
      console.error(e);
      ui.showToast('ลบสูตรสำเร็จไม่สำเร็จ: ' + e.message, 'error');
    } finally {
      ui.hideLoading();
    }
  }
};

// Backup and Archiving Methods
const downloadJSONBackup = async () => {
  ui.showLoading();
  try {
    const res = await api.settings.exportBackup();
    if (res.success && res.data) {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const a = document.createElement('a');
      a.setAttribute("href", dataStr);
      a.setAttribute("download", `pos_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      ui.showToast('ส่งออกไฟล์สำรองข้อมูล JSON สำเร็จ', 'success');
    } else {
      throw new Error(res.error || 'ไม่มีข้อมูลส่งกลับ');
    }
  } catch (error) {
    console.error(error);
    ui.showToast('ส่งออกสำรองข้อมูลล้มเหลว: ' + error.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

const downloadSQLiteDB = async () => {
  ui.showLoading();
  try {
    const user = sessionStorage.getItem('pos_user');
    const headers = {};
    if (user) {
      const parsed = JSON.parse(user);
      if (parsed.id) {
        headers['x-user-id'] = String(parsed.id);
      }
    }
    
    const response = await fetch(window.location.origin + '/api/settings/backup/sqlite', { headers });
    if (!response.ok) throw new Error('ดาวน์โหลดฐานข้อมูลล้มเหลว');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pos_database_${new Date().toISOString().split('T')[0]}.db`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    ui.showToast('ดาวน์โหลดไฟล์ SQLite ฐานข้อมูลสำเร็จ', 'success');
  } catch (error) {
    console.error(error);
    ui.showToast('ไม่สามารถดาวน์โหลดไฟล์ SQLite ได้: ' + error.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

const handleImportJSON = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      const confirm = await ui.showConfirm('ยืนยันการกู้คืนข้อมูล', 'คำเตือน: การนำเข้าข้อมูลสำรองนี้จะเขียนทับตารางข้อมูลเดิมทั้งหมด คุณต้องการดำเนินการต่อหรือไม่?');
      if (confirm) {
        ui.showLoading();
        const res = await api.settings.importBackup(parsed);
        if (res.success) {
          ui.showToast('กู้คืนฐานข้อมูลจากไฟล์สำรองสำเร็จแล้ว! 🎉', 'success');
        } else {
          throw new Error(res.error || 'เกิดข้อผิดพลาดในการกู้คืน');
        }
      }
    } catch (err) {
      console.error(err);
      ui.showToast('ไม่สามารถนำเข้าไฟล์ได้: ' + err.message, 'error');
    } finally {
      if (fileInput.value) fileInput.value.value = '';
      ui.hideLoading();
    }
  };
  reader.readAsText(file);
};

const handleArchiveOrders = async () => {
  const confirm = await ui.showConfirm(
    'ยืนยันการจัดเก็บออเดอร์เก่า', 
    `คุณต้องการย้ายออเดอร์ที่เก่ากว่า ${archiveMonths.value} เดือน ไปไว้ที่ตารางจัดเก็บประวัติถาวรเพื่อลดขนาดฐานข้อมูลหลักใช่หรือไม่?`
  );
  if (confirm) {
    ui.showLoading();
    try {
      const res = await api.settings.archiveOrders(archiveMonths.value);
      if (res.success) {
        ui.showToast(`จัดเก็บออเดอร์เก่าสำเร็จ! ย้ายทั้งหมด ${res.archived_count || res.count || 0} รายการ`, 'success');
      } else {
        throw new Error(res.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error(error);
      ui.showToast('การจัดเก็บข้อมูลล้มเหลว: ' + error.message, 'error');
    } finally {
      ui.hideLoading();
    }
  }
};

onMounted(() => {
  currentUser.value = getUser();
  loadShopSettings();
  loadBranches();
  loadUsersData();
  loadPresetsData();
  loadAvailableModifiers();
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
  .backup-btns-container {
    flex-direction: column !important;
    gap: var(--space-sm) !important;
  }
  .backup-btns-container .btn {
    width: 100% !important;
    flex: none !important;
  }
  .archive-inputs-container {
    flex-direction: column !important;
    gap: var(--space-sm) !important;
  }
  .archive-inputs-container .form-input,
  .archive-inputs-container .btn {
    width: 100% !important;
    flex: none !important;
  }
}

.modifier-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  color: var(--text-primary);
  font-weight: var(--font-weight-semibold);
  box-shadow: var(--shadow-sm);
  white-space: nowrap;
}
</style>
