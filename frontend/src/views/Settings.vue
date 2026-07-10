<template>
  <div id="settings-page" class="page-enter">
    
    <!-- Tab toggles inside Settings page -->
    <div class="category-tabs mb-lg">
      <button 
        class="btn btn-secondary" 
        :class="{ 'active': activeTab === 'shop' }"
        @click="activeTab = 'shop'"
      >
        <i class="fa-solid fa-store"></i> ตั้งค่าร้านค้า
      </button>
      <button 
        class="btn btn-secondary" 
        :class="{ 'active': activeTab === 'users' }"
        @click="activeTab = 'users'"
      >
        <i class="fa-solid fa-users"></i> พนักงานหน้าร้าน
      </button>
      <button 
        class="btn btn-secondary" 
        :class="{ 'active': activeTab === 'branches' }"
        @click="activeTab = 'branches'"
      >
        <i class="fa-solid fa-code-branch"></i> จัดการสาขา
      </button>
      <button 
        v-if="currentUser?.role === 'admin'"
        class="btn btn-secondary" 
        :class="{ 'active': activeTab === 'presets' }"
        @click="activeTab = 'presets'"
      >
        <i class="fa-solid fa-mortar-pestle"></i> สูตรเครื่องปรุง
      </button>
      <button 
        v-if="currentUser?.role === 'admin'"
        class="btn btn-secondary" 
        :class="{ 'active': activeTab === 'backup' }"
        @click="activeTab = 'backup'"
      >
        <i class="fa-solid fa-database"></i> สำรอง & จัดเก็บข้อมูล
      </button>
      <button 
        class="btn btn-secondary" 
        :class="{ 'active': activeTab === 'printer' }"
        @click="activeTab = 'printer'"
      >
        <i class="fa-solid fa-print"></i> เครื่องพิมพ์ & ลิ้นชัก
      </button>
    </div>

    <!-- Tab 1: Shop Settings Form -->
    <div v-if="activeTab === 'shop'" class="card">
      <!-- Branch Selector for Admin -->
      <div v-if="currentUser?.role === 'admin' && branches.length > 0" class="form-group mb-xl settings-branch-header">
        <label class="form-label font-bold" style="color: var(--primary); margin-bottom: 8px;"><i class="fa-solid fa-store mr-xs"></i> กำลังตั้งค่าข้อมูลของสาขา:</label>
        <div class="custom-select-wrapper" @click.stop>
          <div 
            class="custom-select-trigger settings-branch-trigger" 
            :class="{ 'active': isSettingsBranchDropdownOpen }" 
            @click="toggleSettingsBranchDropdown"
          >
            <span class="custom-select-text">{{ selectedSettingsBranchName }}</span>
          </div>
          <div v-if="isSettingsBranchDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 2px);">
            <div 
              v-for="b in branches" 
              :key="b.id" 
              class="custom-select-option" 
              :class="{ 'selected': selectedSettingsBranchId === b.id }" 
              @click="selectSettingsBranch(b.id)"
            >
              {{ b.name }}
            </div>
          </div>
        </div>
      </div>

      <div class="card-title text-sm"><i class="fa-solid fa-store" style="margin-right: 6px;"></i> ข้อมูลร้านและคีย์การทำธุรกรรม</div>



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

      <!-- Save Shop Settings Button -->
      <button class="btn btn-primary btn-block mt-lg" @click="saveShopSettings">
        <i class="fa-solid fa-floppy-disk"></i> บันทึกตั้งค่าระบบร้าน
      </button>
    </div>

    <!-- Tab 2: User management -->
    <div v-if="activeTab === 'users'" class="flex flex-col gap-lg w-full">
      <!-- Top Action Card -->
      <div class="card flex flex-between align-center p-lg staff-header-card flex-wrap" style="background: var(--card-bg); gap: var(--space-md);">
        <span class="font-bold text-lg"><i class="fa-solid fa-users" style="margin-right: 6px;"></i> จัดการพนักงานหน้าร้าน</span>
        <button class="btn btn-primary" @click="openAddUserModal"><i class="fa-solid fa-plus"></i> เพิ่มพนักงาน</button>
      </div>

      <!-- Users list table (Visible on Desktop Only) -->
      <div class="card p-0 overflow-hidden hide-mobile">
        <div style="overflow-x: auto;">
          <table class="table w-full" style="border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); background: rgba(139, 3, 19, 0.03);">
                <th class="text-left" style="padding: var(--space-md);">ชื่อพนักงาน</th>
                <th class="text-center" style="padding: var(--space-md);">สาขา</th>
                <th class="text-center" style="padding: var(--space-md);">บทบาท</th>
                <th class="text-center" style="padding: var(--space-md);">รหัส PIN</th>
                <th class="text-center" style="padding: var(--space-md);">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="usersLoading">
                <td colspan="5" class="text-center" style="padding: var(--space-2xl);">
                  <div class="spinner mx-auto"></div>
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
                  <div class="font-bold text-base">{{ u.name }}</div>
                  <div class="text-base text-muted">สมัครเมื่อ: {{ formatDate(u.created_at) }}</div>
                </td>
                <td class="text-center" style="padding: var(--space-md); vertical-align: middle;">
                  <span class="text-base text-secondary flex align-center justify-center" style="gap: 4px;">
                    <i class="fa-solid fa-store" style="color: var(--text-tertiary);"></i> {{ getBranchName(u.branch_id) }}
                  </span>
                </td>
                <td class="text-center" style="padding: var(--space-md); vertical-align: middle;">
                  <span class="badge text-base" :class="u.role === 'admin' ? 'badge-primary' : 'badge-neutral'">
                    {{ u.role === 'admin' ? 'เจ้าของร้าน' : 'พนักงาน' }}
                  </span>
                </td>
                <td class="text-center" style="padding: var(--space-md); font-weight: bold; vertical-align: middle; color:var(--primary);">
                  ••••
                </td>
                <td class="text-center" style="padding: var(--space-md); vertical-align: middle;">
                  <div class="flex justify-center gap-sm">
                    <button class="btn-action btn-action-edit" title="แก้ไข" @click="openEditUserModal(u)"><i class="fa-solid fa-pen-to-square"></i> แก้ไข</button>
                    <button 
                      class="btn-action btn-action-delete" 
                      title="ลบ"
                      :disabled="u.id === currentUser?.id"
                      @click="handleDeleteUser(u.id)"
                    >
                      <i class="fa-solid fa-trash-can"></i> ลบ
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
          <div class="spinner mx-auto"></div>
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
            style="width: 44px; height: 44px; border-radius: 50%; background: var(--gradient-primary); color: white; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"
            class="font-bold text-md"
          >
            <i v-if="!u.name" class="fa-solid fa-user"></i>
            <span v-else>{{ u.name.charAt(0).toUpperCase() }}</span>
          </div>

          <!-- Info & Actions -->
          <div class="flex-1 min-w-0">
            <div class="flex flex-between align-center mb-xs">
              <span class="font-bold text-primary text-base">{{ u.name }}</span>
              <span class="badge" :class="u.role === 'admin' ? 'badge-primary' : 'badge-neutral'">
                {{ u.role === 'admin' ? 'เจ้าของร้าน' : 'พนักงาน' }}
              </span>
            </div>
            <div class="text-xs text-secondary" style="margin-bottom: var(--space-sm); display: inline-flex; align-items: center; gap: 4px;">
              <i class="fa-solid fa-store" style="color: var(--text-tertiary);"></i> {{ getBranchName(u.branch_id) }} | PIN: <strong style="color:var(--primary);">••••</strong>
            </div>
            <!-- Actions buttons in card -->
            <div class="flex gap-sm">
              <button 
                class="btn-action btn-action-edit flex-1" 
                @click="openEditUserModal(u)"
              >
                <i class="fa-solid fa-pen-to-square"></i> แก้ไข
              </button>
              <button 
                class="btn-action btn-action-delete flex-1" 
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
    <div v-if="showUserModal" class="modal-container active flex align-center justify-center">
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
            <button class="btn-modal btn-modal-secondary flex-1" @click="showUserModal = false">ยกเลิก</button>
            <button 
              class="btn-modal btn-modal-primary flex-1" 
              :disabled="!userForm.name || !userForm.pin || userForm.pin.length !== 4"
              @click="handleSaveUser"
            >
              <i class="fa-solid fa-floppy-disk"></i> บันทึกข้อมูล
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 3: Branch management (Admin only) -->
    <div v-if="activeTab === 'branches'" class="flex flex-col gap-lg w-full">
      <!-- Top Action Card -->
      <div class="card flex flex-between align-center p-lg staff-header-card flex-wrap" style="background: var(--card-bg); gap: var(--space-md);">
        <span class="font-bold text-lg"><i class="fa-solid fa-store" style="margin-right: 6px;"></i> จัดการสาขาของร้าน</span>
        <button class="btn btn-primary" @click="openAddBranchModal"><i class="fa-solid fa-plus"></i> เพิ่มสาขา</button>
      </div>

      <!-- Branch list table (Visible on Desktop Only) -->
      <div class="card p-0 overflow-hidden hide-mobile">
        <div style="overflow-x: auto;">
          <table class="table w-full" style="border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); background: rgba(139, 3, 19, 0.03);">
                <th class="text-left" style="padding: var(--space-md);">ชื่อสาขา</th>
                <th class="text-left" style="padding: var(--space-md);">ที่อยู่</th>
                <th class="text-center" style="padding: var(--space-md);">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="branches.length === 0">
                <td colspan="3" class="text-center" style="padding: var(--space-xl); color: var(--text-tertiary);">
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
                <td class="text-center" style="padding: var(--space-md); vertical-align: middle;">
                  <div class="flex justify-center gap-sm">
                    <button class="btn-action btn-action-edit" title="แก้ไข" @click="openEditBranchModal(b)"><i class="fa-solid fa-pen-to-square"></i> แก้ไข</button>
                    <button class="btn-action btn-action-delete" title="ลบ" @click="handleDeleteBranch(b.id)"><i class="fa-solid fa-trash-can"></i> ลบ</button>
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
            style="width: 44px; height: 44px; border-radius: 50%; background: var(--gradient-primary); color: white; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"
            class="text-md"
          >
            <i class="fa-solid fa-store" style="font-size: 1.2rem;"></i>
          </div>

          <div class="flex-1 min-w-0">
            <div class="font-bold text-primary mb-xs text-base">{{ b.name }}</div>
            <div class="text-xs text-secondary" style="margin-bottom: var(--space-sm);">
              <i class="fa-solid fa-location-dot" style="margin-right: 4px; color: var(--primary);"></i> ที่อยู่: {{ b.address || '-' }}
            </div>
            <div class="flex gap-sm">
              <button 
                class="btn-action btn-action-edit flex-1" 
                @click="openEditBranchModal(b)"
              >
                <i class="fa-solid fa-pen-to-square"></i> แก้ไข
              </button>
              <button 
                class="btn-action btn-action-delete flex-1" 
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
    <div v-if="showBranchModal" class="modal-container active flex align-center justify-center">
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

          <div class="flex gap-md mt-lg">
            <button class="btn-modal btn-modal-secondary flex-1" @click="showBranchModal = false">ยกเลิก</button>
            <button 
              class="btn-modal btn-modal-primary flex-1" 
              :disabled="!branchForm.name || !branchForm.name.trim()"
              @click="handleSaveBranch"
            >
              <i class="fa-solid fa-floppy-disk"></i> บันทึกข้อมูล
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 4: Presets CRUD -->
    <div v-if="activeTab === 'presets'" class="flex flex-col gap-lg w-full">
      <!-- Top Action Card -->
      <div class="card flex flex-between align-center p-lg staff-header-card flex-wrap" style="background: var(--card-bg); gap: var(--space-md);">
        <span class="font-bold text-lg"><i class="fa-solid fa-mortar-pestle" style="margin-right: 6px;"></i> สูตรเครื่องปรุงสำเร็จรูป</span>
        <button class="btn btn-primary" @click="openAddPresetModal"><i class="fa-solid fa-plus"></i> เพิ่มสูตรสำเร็จ</button>
      </div>

      <!-- Presets List -->
      <div class="card p-0 overflow-hidden hide-mobile">
        <div style="overflow-x: auto;">
          <table class="table w-full" style="border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); background: rgba(139, 3, 19, 0.03);">
                <th class="text-left" style="padding: var(--space-md);">ชื่อสูตร</th>
                <th class="text-left" style="padding: var(--space-md);">เครื่องปรุงที่รวมอยู่</th>
                <th class="text-center" style="padding: var(--space-md);">สถานะ</th>
                <th class="text-center" style="padding: var(--space-md);">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="presetsLoading">
                <td colspan="4" class="text-center" style="padding: var(--space-2xl);">
                  <div class="spinner mx-auto"></div>
                </td>
              </tr>
              <tr v-else-if="presets.length === 0">
                <td colspan="4" class="text-center" style="padding: var(--space-xl); color: var(--text-tertiary);">
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
                <td class="text-center" style="padding: var(--space-md); vertical-align: middle;">
                  <span class="badge text-base" :class="p.active ? 'badge-primary' : 'badge-neutral'">
                    {{ p.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
                  </span>
                </td>
                <td class="text-center" style="padding: var(--space-md); vertical-align: middle;">
                  <div class="flex justify-center gap-sm">
                    <button class="btn-action btn-action-edit" title="แก้ไข" @click="openEditPresetModal(p)"><i class="fa-solid fa-pen-to-square"></i> แก้ไข</button>
                    <button class="btn-action btn-action-delete" title="ลบ" @click="handleDeletePreset(p.id)"><i class="fa-solid fa-trash-can"></i> ลบ</button>
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
          <div class="spinner mx-auto"></div>
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
              <span class="font-bold text-primary text-base">{{ p.name }}</span>
              <span class="badge" :class="p.active ? 'badge-primary' : 'badge-neutral'">
                {{ p.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
              </span>
            </div>
            
            <div class="text-xs text-secondary">
              <div class="mb-xs font-semibold" style="color: var(--text-secondary);">เครื่องปรุงที่รวมอยู่:</div>
              <div class="flex gap-xs" style="flex-wrap: wrap;">
                <span v-for="mid in p.modifier_ids" :key="mid" class="modifier-pill">
                  {{ getModifierName(mid) }}
                </span>
              </div>
            </div>

            <div class="divider" style="height: 1px; background: var(--border-color); margin: 4px 0;"></div>

            <div class="flex gap-sm justify-end">
              <button class="btn-action btn-action-edit flex-1" @click="openEditPresetModal(p)"><i class="fa-solid fa-pen-to-square"></i> แก้ไข</button>
              <button class="btn-action btn-action-delete flex-1" @click="handleDeletePreset(p.id)"><i class="fa-solid fa-trash-can"></i> ลบ</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 5: Backup, Restore & Archive -->
    <div v-if="activeTab === 'backup'" class="flex flex-col gap-lg w-full">
      <!-- Card 1: Data Backup & Restore -->
      <div class="card">
        <div class="card-title mb-md text-base"><i class="fa-solid fa-database" style="margin-right: 6px;"></i> สำรองและกู้คืนข้อมูล (Backup & Restore)</div>
        <p class="text-secondary mb-lg text-sm" style="line-height: 1.5;">
          คุณสามารถดาวน์โหลดข้อมูลระบบทั้งหมดเป็นไฟล์ JSON เพื่อเก็บสำรองไว้ หรืออัปโหลดไฟล์ที่ดาวน์โหลดไปเพื่อกู้คืนข้อมูลระบบได้
        </p>

        <div class="flex gap-md backup-btns-container">
          <button class="btn-modal btn-modal-secondary flex-1" @click="downloadJSONBackup">
            <i class="fa-solid fa-file-arrow-down"></i> ดาวน์โหลดสำรองข้อมูล (JSON)
          </button>
          <button class="btn-modal btn-modal-secondary flex-1" @click="downloadSQLiteDB">
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
        <div class="card-title mb-md text-base"><i class="fa-solid fa-box-archive" style="margin-right: 6px;"></i> ย้ายและบีบอัดข้อมูลเก่า (Order Archive)</div>
        <p class="text-secondary mb-lg text-sm" style="line-height: 1.5;">
          เพื่อช่วยให้ฐานข้อมูลทำงานได้รวดเร็วและป้องกันไม่ให้ฐานข้อมูลบวม คุณสามารถย้ายออเดอร์และประวัติการขายที่เก่ากว่าช่วงเวลาที่กำหนด ไปไว้ที่ตารางเก็บประวัติถาวร (Archived Orders) ได้
        </p>

        <div class="form-group">
          <label class="form-label">ย้ายออเดอร์ที่เก่ากว่า: *</label>
          <div class="flex gap-sm archive-inputs-container">
            <div class="custom-select-wrapper flex-1" @click.stop style="position: relative; z-index: 5;">
              <div 
                class="custom-select-trigger" 
                :class="{ 'active': isArchiveDropdownOpen }" 
                @click="isArchiveDropdownOpen = !isArchiveDropdownOpen"
                style="padding: 10px 36px 10px var(--space-md); border-radius: var(--radius-md); width: 100%; min-height: 44px; display: flex; align-items: center;"
              >
                <span class="custom-select-text">{{ selectedArchiveMonthsName }}</span>
              </div>
              <div v-if="isArchiveDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 2px);">
                <div 
                  v-for="opt in archiveMonthsOptions" 
                  :key="opt.value" 
                  class="custom-select-option" 
                  :class="{ 'selected': archiveMonths === opt.value }" 
                  @click="selectArchiveMonths(opt.value)"
                >
                  {{ opt.label }}
                </div>
              </div>
            </div>
            <button class="btn btn-primary" @click="handleArchiveOrders">
              <i class="fa-solid fa-box-archive"></i> เริ่มจัดเก็บออเดอร์เก่า
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 6: Printer & Cash Drawer Settings -->
    <div v-if="activeTab === 'printer'" class="flex flex-col gap-lg w-full">
      <div class="card">
        <div class="card-title mb-md text-base">
          <i class="fa-solid fa-print" style="margin-right: 6px; color: var(--primary);"></i> ตั้งค่าเครื่องพิมพ์ & ลิ้นชัก
        </div>
        <p class="text-secondary mb-lg text-sm" style="line-height: 1.5;">
          เชื่อมต่อกับเครื่องพิมพ์ใบเสร็จและสั่งงานลิ้นชักเก็บเงินอเนกประสงค์ โดยเลือกประเภทการเชื่อมต่อที่เหมาะสมกับอุปกรณ์ของคุณ
        </p>

        <!-- Connection Type Selection (Premium Cards) -->
        <div class="mb-xl">
          <strong class="font-bold text-sm block mb-sm" style="color: var(--text-primary); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-sm);">
            ประเภทการเชื่อมต่อเครื่องพิมพ์
          </strong>
          <div class="connection-selector-grid">
            <!-- 1. USB Connection -->
            <div 
              class="connection-option-card"
              :class="{ selected: printerConfig.connectionType === 'usb' }"
              @click="setConnectionType('usb')"
            >
              <div class="option-icon">
                <i class="fa-solid fa-plug font-xl"></i>
              </div>
              <div class="option-info">
                <div class="option-title">เครื่องพิมพ์ทั่วไป (ต่อสาย USB)</div>
                <div class="option-desc">สั่งพิมพ์และดีดลิ้นชักตรงจากบราวเซอร์</div>
              </div>
              <div class="option-badge">
                <i class="fa-solid fa-circle-check"></i>
              </div>
            </div>

            <!-- 2. Sunmi Printer Connection -->
            <div 
              class="connection-option-card"
              :class="{ selected: printerConfig.connectionType === 'rawbt' }"
              @click="setConnectionType('rawbt')"
            >
              <div class="option-icon">
                <i class="fa-solid fa-tablet-screen-button font-xl"></i>
              </div>
              <div class="option-info">
                <div class="option-title">เครื่องพิมพ์ในตัวเครื่อง POS (Sunmi)</div>
                <div class="option-desc">สั่งงานพิมพ์สลับแอปผ่านหน้าต่างแอปหลัก (ไม่ต้องเปิดแอป Server)</div>
              </div>
              <div class="option-badge">
                <i class="fa-solid fa-circle-check"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- Connection Status (USB Mode) -->
        <div 
          v-if="printerConfig.connectionType === 'usb'"
          :style="{
            background: printerConnected ? 'rgba(42, 157, 143, 0.08)' : 'rgba(139, 3, 19, 0.04)',
            border: '1px solid ' + (printerConnected ? 'var(--success)' : 'var(--primary)'),
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md) var(--space-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-xl)',
            transition: 'all 0.3s ease'
          }"
        >
          <div style="font-size: 2.2rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <i v-if="printerConnected" class="fa-solid fa-circle-check" style="color: var(--success);"></i>
            <i v-else class="fa-solid fa-circle-xmark" style="color: var(--primary);"></i>
          </div>
          <div style="flex: 1; min-width: 0;">
            <div class="font-bold text-base" :style="{ color: printerConnected ? 'var(--success)' : 'var(--primary)', fontSize: 'var(--font-base)', lineHeight: '1.4' }">
              สถานะเครื่องพิมพ์: {{ printerConnected ? 'เชื่อมต่อพร้อมใช้งาน' : 'ยังไม่ได้เชื่อมต่อ' }}
            </div>
            <div style="font-size: var(--font-xs); color: var(--text-secondary); margin-top: 4px; line-height: 1.4;" v-if="printerConnected">
              เชื่อมต่อผ่านสาย USB พร้อมสำหรับทำรายการขายหน้าร้าน
            </div>
            <div style="font-size: var(--font-xs); color: var(--text-secondary); margin-top: 4px; line-height: 1.4;" v-else>
              คลิกปุ่มเชื่อมต่อด้านล่างเพื่อเลือกเครื่องพิมพ์ความร้อนสำหรับดีดลิ้นชักและพิมพ์ใบเสร็จ
            </div>
          </div>
        </div>

        <!-- Connection Status (RawBT Mode) -->
        <div 
          v-if="printerConfig.connectionType === 'rawbt'"
          :style="{
            background: 'rgba(42, 157, 143, 0.08)',
            border: '1px solid var(--success)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md) var(--space-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-xl)',
            transition: 'all 0.3s ease'
          }"
        >
          <div style="font-size: 2.2rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <i class="fa-solid fa-circle-check" style="color: var(--success);"></i>
          </div>
          <div style="flex: 1; min-width: 0;">
            <div class="font-bold text-base" style="color: var(--success); font-size: var(--font-base); line-height: 1.4;">
              สถานะ: เปิดใช้งานร่วมกับเครื่องพิมพ์ในตัวเครื่อง (Sunmi) เรียบร้อยแล้ว
            </div>
            <div style="font-size: var(--font-xs); color: var(--text-secondary); margin-top: 4px; line-height: 1.4;">
              ระบบจะเปิดแอป RawBT เพื่อปริ้นใบเสร็จและดีดลิ้นชักโดยตรงโดยอัตโนมัติ (ไม่จำเป็นต้องใช้งานแอป Server เพิ่มเติม)
            </div>
          </div>
        </div>

        <!-- Action Buttons (USB Mode Only) -->
        <div v-if="printerConfig.connectionType === 'usb'" class="flex gap-md mb-xl printer-btn-container" style="display: flex; gap: var(--space-md); margin-bottom: var(--space-xl);">
          <button class="btn btn-primary" @click="handleConnectPrinter" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px;">
            <i class="fa-solid fa-plug"></i> เชื่อมต่อเครื่องพิมพ์ใหม่
          </button>
          <button class="btn btn-secondary" v-if="printerConnected" @click="handleDisconnectPrinter" style="border-color: var(--danger); color: var(--danger); display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px;">
            <i class="fa-solid fa-power-off"></i> ตัดการเชื่อมต่อ
          </button>
        </div>

        <div class="divider mb-lg" style="height:1px; background:var(--border-color);"></div>

        <!-- Preferences Toggles -->
        <div class="flex flex-col mb-xl" style="display: flex; flex-direction: column;">
          <div class="setting-item">
            <div style="flex: 1; min-width: 0; padding-right: var(--space-md);">
              <strong style="font-size: var(--font-sm); color: var(--text-primary); display: block; font-weight: var(--font-weight-semibold);">เปิดลิ้นชักอัตโนมัติเมื่อชำระเงิน</strong>
              <span style="font-size: var(--font-xs); color: var(--text-secondary); display: block; margin-top: 4px; line-height: 1.4;">ลิ้นชักจะดีดเปิดโดยอัตโนมัติทันทีที่ทำรายการสำเร็จ</span>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="printerConfig.autoKick" @change="saveLocalPrinterConfig" />
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-item">
            <div style="flex: 1; min-width: 0; padding-right: var(--space-md);">
              <strong style="font-size: var(--font-sm); color: var(--text-primary); display: block; font-weight: var(--font-weight-semibold);">พิมพ์ใบเสร็จอัตโนมัติ</strong>
              <span style="font-size: var(--font-xs); color: var(--text-secondary); display: block; margin-top: 4px; line-height: 1.4;">เครื่องพิมพ์จะสไลด์พิมพ์ใบเสร็จออกมาทันทีเมื่อทำรายการสำเร็จ</span>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="printerConfig.autoPrint" @change="saveLocalPrinterConfig" />
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-item" v-if="printerConfig.connectionType === 'rawbt'">
            <div style="flex: 1; min-width: 0; padding-right: var(--space-md);">
              <strong style="font-size: var(--font-sm); color: var(--text-primary); display: block; font-weight: var(--font-weight-semibold);">รูปแบบใบเสร็จ (โหมด RawBT)</strong>
              <span style="font-size: var(--font-xs); color: var(--text-secondary); display: block; margin-top: 4px; line-height: 1.4;">เลือก 'รูปภาพจาก POS' เพื่อใช้รูปภาพฟอนต์ภาษาไทยคมชัดขนาดใหญ่พอดีกระดาษ</span>
            </div>
            <select 
              v-model="printerConfig.printMode" 
              @change="saveLocalPrinterConfig" 
              class="form-input" 
              style="width: 180px; min-height: 38px; padding: 4px 8px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary);"
            >
              <option value="image">รูปภาพจาก POS (แนะนำ)</option>
              <option value="text">ข้อความธรรมดา (Text)</option>
              <option value="html">รูปภาพ HTML (แอป RawBT)</option>
            </select>
          </div>

        </div>

        <div class="divider mb-lg" style="height:1px; background:var(--border-color);"></div>

        <!-- Testing Buttons -->
        <div class="flex gap-md printer-btn-container" style="display: flex; gap: var(--space-md); flex-wrap: wrap;">
          <button class="btn btn-secondary" @click="handleTestPrint" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px;">
            <i class="fa-solid fa-file-invoice"></i> ทดสอบพิมพ์ใบเสร็จทดลอง
          </button>
          <button class="btn btn-secondary" @click="handleTestKick" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px;">
            <i class="fa-solid fa-key"></i> ทดสอบเปิดลิ้นชักเก็บเงิน
          </button>
        </div>
      </div>
    </div>

    <!-- Preset Add/Edit Dialog Modal -->
    <div v-if="showPresetModal" class="modal-container active flex align-center justify-center">
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
                class="flex align-center gap-sm text-sm"
                style="cursor: pointer; padding: 4px 0;"
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
            <label for="preset-active-checkbox" class="text-sm" style="cursor: pointer;">เปิดใช้งานสูตรสำเร็จนี้</label>
          </div>

          <!-- Buttons -->
          <div class="flex gap-md mt-lg">
            <button class="btn-modal btn-modal-secondary flex-1" @click="showPresetModal = false">ยกเลิก</button>
            <button 
              class="btn-modal btn-modal-primary flex-1" 
              :disabled="!presetForm.name.trim() || presetForm.modifier_ids.length === 0"
              @click="handleSavePreset"
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
import { store } from '../store';
import { 
  getSavedPrinterConfig, 
  savePrinterConfig, 
  requestAndConnectPrinter, 
  autoConnectPrinter, 
  disconnectPrinter, 
  isPrinterConnected, 
  kickDrawer, 
  kickDrawerSync,
  printReceipt,
  printReceiptSync
} from '../utils/printer';

// --- Printer & Cash Drawer States & Actions ---
const printerConnected = ref(false);
const printerConfig = ref({
  vendorId: null,
  productId: null,
  autoPrint: true,
  autoKick: true,
  connectionType: 'usb',
  printMode: 'text'
});

const loadPrinterSettings = async () => {
  const cfg = getSavedPrinterConfig();
  printerConfig.value = cfg;
  
  printerConnected.value = isPrinterConnected();
  if (cfg.connectionType === 'rawbt') return;
  
  if (!navigator.usb) return;
  
  if (!printerConnected.value && cfg.vendorId && cfg.productId) {
    try {
      const dev = await autoConnectPrinter();
      printerConnected.value = !!dev;
    } catch (e) {
      console.warn('Auto connection error:', e);
    }
  }
};

const handleConnectPrinter = async () => {
  try {
    ui.showLoading();
    await requestAndConnectPrinter();
    printerConnected.value = true;
    printerConfig.value = getSavedPrinterConfig();
    ui.showToast('เชื่อมต่อเครื่องพิมพ์สำเร็จแล้ว 🎉', 'success');
  } catch (e) {
    console.error(e);
    ui.showToast('เชื่อมต่อล้มเหลว: ' + e.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

const handleDisconnectPrinter = async () => {
  try {
    await disconnectPrinter();
    printerConnected.value = false;
    printerConfig.value = getSavedPrinterConfig();
    ui.showToast('ยกเลิกการเชื่อมต่อเครื่องพิมพ์แล้ว', 'info');
  } catch (e) {
    console.error(e);
  }
};

const saveLocalPrinterConfig = () => {
  savePrinterConfig(
    printerConfig.value.vendorId,
    printerConfig.value.productId,
    printerConfig.value.autoPrint,
    printerConfig.value.autoKick,
    printerConfig.value.connectionType,
    printerConfig.value.printMode
  );
  printerConnected.value = isPrinterConnected();
};

const handleConnectionTypeChange = () => {
  saveLocalPrinterConfig();
  ui.showToast('เปลี่ยนประเภทการเชื่อมต่อสำเร็จ', 'success');
};

const setConnectionType = (type) => {
  printerConfig.value.connectionType = type;
  handleConnectionTypeChange();
};



const handleTestPrint = async () => {
  try {
    const testOrder = {
      order_number: 'TEST-0001',
      created_at: new Date().toISOString(),
      payment_method: 'cash',
      cash_received: 500,
      discount: 50,
      total: 350
    };
    const testItems = [
      { name: 'ไก่ทอดช้างแดงชิ้นใหญ่', quantity: 2, price: 150 },
      { name: 'ข้าวเหนียวนุ่มพิเศษ', quantity: 3, price: 20 },
      { name: 'น้ำจิ้มแจ่วรสเด็ด', quantity: 1, price: 10 }
    ];
    
    const activeBranch = store.branches.find(b => b.id === selectedSettingsBranchId.value) || { name: 'สาขาทดสอบ' };
    
    const config = getSavedPrinterConfig();
    if (config.connectionType === 'rawbt') {
      await printReceipt(testOrder, testItems, {
        shopName: 'ไก่ทอดช้างแดง (ทดสอบ)',
        branchName: activeBranch.name,
        phone: '081-234-5678',
        forceKick: false
      });
      ui.showToast('ส่งข้อมูลสั่งพิมพ์ใบเสร็จทดสอบแล้ว 🖨️', 'success');
    } else if (config.connectionType === 'usb' && isPrinterConnected()) {
      await printReceipt(testOrder, testItems, {
        shopName: 'ไก่ทอดช้างแดง (ทดสอบ)',
        branchName: activeBranch.name,
        phone: '081-234-5678',
        forceKick: false
      });
      ui.showToast('พิมพ์ใบเสร็จทดสอบสำเร็จแล้ว 🖨️', 'success');
    } else {
      // Fallback for standard browser print dialog
      window.print();
      ui.showToast('เปิดหน้าต่างสั่งพิมพ์ใบเสร็จทดลองแล้ว 🖨️', 'success');
    }
  } catch (e) {
    ui.showToast('การพิมพ์ล้มเหลว: ' + e.message, 'error');
  }
};

const handleTestKick = async () => {
  try {
    const config = getSavedPrinterConfig();
    if (config.connectionType === 'rawbt') {
      kickDrawerSync();
      ui.showToast('ส่งคำสั่งทดสอบเปิดลิ้นชักแล้ว (ผ่าน RawBT) 🔓', 'success');
    } else if (config.connectionType === 'usb') {
      if (isPrinterConnected()) {
        await kickDrawer();
        ui.showToast('ดีดเปิดลิ้นชักสำเร็จแล้ว 🔓', 'success');
      } else {
        throw new Error('ยังไม่ได้เชื่อมต่อเครื่องพิมพ์สาย USB');
      }
    } else {
      throw new Error('ไม่รองรับการทำงานในโหมดนี้');
    }
  } catch (e) {
    ui.showToast('เปิดลิ้นชักล้มเหลว: ' + e.message, 'error');
  }
};

// Custom Dropdown logic for Settings.vue
const isRoleDropdownOpen = ref(false);
const isBranchDropdownOpen = ref(false);
const isSettingsBranchDropdownOpen = ref(false);

const selectedUserBranchName = computed(() => {
  const b = branches.value.find(x => x.id === userForm.value.branch_id);
  return b ? b.name + (b.address ? ' — ' + b.address : '') : 'เลือกสาขาที่สังกัด...';
});

const selectedSettingsBranchName = computed(() => {
  const b = branches.value.find(x => x.id === selectedSettingsBranchId.value);
  return b ? b.name : 'เลือกสาขาที่ต้องการตั้งค่า...';
});

const selectUserRole = (role) => {
  userForm.value.role = role;
  isRoleDropdownOpen.value = false;
};

const selectUserBranch = (branchId) => {
  userForm.value.branch_id = branchId;
  isBranchDropdownOpen.value = false;
};

const selectSettingsBranch = (branchId) => {
  selectedSettingsBranchId.value = branchId;
  isSettingsBranchDropdownOpen.value = false;
  loadShopSettings();
};

const toggleSettingsBranchDropdown = () => {
  const current = isSettingsBranchDropdownOpen.value;
  closeSettingsDropdowns();
  isSettingsBranchDropdownOpen.value = !current;
};

const closeSettingsDropdowns = () => {
  isRoleDropdownOpen.value = false;
  isBranchDropdownOpen.value = false;
  isSettingsBranchDropdownOpen.value = false;
  isArchiveDropdownOpen.value = false;
};

// States
const activeTab = ref('shop');
const currentUser = ref(null);
const selectedSettingsBranchId = ref(null);
const users = computed(() => store.users || []);
const usersLoading = ref(false);
const showUserModal = ref(false);
const isEditUserMode = ref(false);
const editUserId = ref(null);
const branches = computed(() => store.branches || []);

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
    address: ''
  };
  showBranchModal.value = true;
};

const openEditBranchModal = (b) => {
  isEditBranchMode.value = true;
  editBranchId.value = b.id;
  branchForm.value = {
    name: b.name,
    address: b.address || ''
  };
  showBranchModal.value = true;
};

const handleSaveBranch = async () => {
  ui.showLoading();
  try {
    const payload = {
      name: branchForm.value.name,
      address: branchForm.value.address
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
  low_stock_threshold: 5
});

const userForm = ref({
  name: '',
  pin: '',
  role: 'staff',
  branch_id: null
});

// Load Shop Settings
const loadShopSettings = async (force = false) => {
  const showOverlay = !store.settingsLoaded || force;
  if (showOverlay) ui.showLoading();
  try {
    await store.fetchSettingsData(selectedSettingsBranchId.value, force);
    const data = store.settings || {};
    shopForm.value = {
      low_stock_threshold: Number(data.low_stock_threshold) || 5
    };
  } catch (e) {
    console.error('Failed to load settings:', e);
    ui.showToast('ไม่สามารถดึงข้อมูลตั้งค่าระบบได้', 'error');
  } finally {
    if (showOverlay) ui.hideLoading();
  }
};

// Save Shop Settings to Database
const saveShopSettings = async () => {
  ui.showLoading();
  try {
    const promises = Object.entries(shopForm.value).map(([key, val]) => {
      return api.settings.update(key, String(val), selectedSettingsBranchId.value);
    });
    
    await Promise.all(promises);
    await loadShopSettings(true); // Force reload settings to update store cache
    ui.showToast('บันทึกการตั้งค่าร้านสำเร็จแล้ว 🎉', 'success');
  } catch (error) {
    console.error(error);
    ui.showToast('บันทึกตั้งค่าไม่สำเร็จ: ' + error.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

// Users Logic
const loadUsersData = async (force = false) => {
  usersLoading.value = !store.settingsLoaded || force;
  try {
    await store.fetchSettingsData(selectedSettingsBranchId.value, force);
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
      loadUsersData(true);
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
        loadUsersData(true);
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
    await store.fetchSettingsData(selectedSettingsBranchId.value);
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
const presets = computed(() => store.modifierPresets || []);
const presetsLoading = ref(false);
const showPresetModal = ref(false);
const isEditPresetMode = ref(false);
const editPresetId = ref(null);
const presetForm = ref({
  name: '',
  modifier_ids: [],
  active: true
});
const availableModifiers = computed(() => store.modifiers || []);

// Backup & Archive States
const isArchiveDropdownOpen = ref(false);
const archiveMonths = ref(3);
const archiveMonthsOptions = [
  { value: 1, label: '1 เดือนที่ผ่านมา' },
  { value: 3, label: '3 เดือนที่ผ่านมา' },
  { value: 6, label: '6 เดือนที่ผ่านมา' },
  { value: 12, label: '1 ปีที่ผ่านมา' }
];
const selectedArchiveMonthsName = computed(() => {
  const opt = archiveMonthsOptions.find(o => o.value === archiveMonths.value);
  return opt ? opt.label : 'เลือกช่วงเวลา...';
});
const selectArchiveMonths = (val) => {
  archiveMonths.value = val;
  isArchiveDropdownOpen.value = false;
};
const fileInput = ref(null);

const loadPresetsData = async (force = false) => {
  presetsLoading.value = !store.modifiersLoaded || force;
  try {
    await store.fetchModifiers(force);
  } catch (e) {
    console.error(e);
    ui.showToast('ไม่สามารถโหลดข้อมูลสูตรสำเร็จได้', 'error');
  } finally {
    presetsLoading.value = false;
  }
};

const loadAvailableModifiers = async () => {
  try {
    await store.fetchModifiers();
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
      res = await api.modifiers.updatePreset(editPresetId.value, payload);
    } else {
      res = await api.modifiers.createPreset(payload);
    }
    
    if (res.success) {
      ui.showToast(isEditPresetMode.value ? 'แก้ไขสูตรเครื่องปรุงสำเร็จ' : 'เพิ่มสูตรเครื่องปรุงใหม่สำเร็จ', 'success');
      showPresetModal.value = false;
      loadPresetsData(true);
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
      const res = await api.modifiers.deletePreset(id);
      if (res.success) {
        ui.showToast('ลบสูตรสำเร็จเรียบร้อย', 'success');
        loadPresetsData(true);
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
  if (sessionStorage.getItem('selected_branch_id')) {
    selectedSettingsBranchId.value = Number(sessionStorage.getItem('selected_branch_id'));
  } else if (currentUser.value) {
    selectedSettingsBranchId.value = currentUser.value.branch_id;
  }
  loadShopSettings();
  loadBranches();
  loadUsersData();
  loadPresetsData();
  loadAvailableModifiers();
  loadPrinterSettings();
  window.addEventListener('click', closeSettingsDropdowns);
});

onUnmounted(() => {
  window.removeEventListener('click', closeSettingsDropdowns);
});
</script>

<style scoped>

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
@media (max-width: 768px) {
  .show-mobile-only.mobile-users-list {
    display: flex !important;
    flex-direction: column;
    gap: var(--space-sm);
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
  .backup-btns-container .btn,
  .backup-btns-container .btn-modal {
    width: 100% !important;
    flex: none !important;
    height: 48px !important;
    font-size: var(--font-base) !important;
    border-radius: var(--radius-md) !important;
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
  .modifier-pill {
    font-size: var(--font-xs) !important;
    padding: 2px 8px !important;
  }
  .printer-btn-container {
    flex-direction: column !important;
    gap: var(--space-sm) !important;
  }
  .printer-btn-container .btn {
    width: 100% !important;
    flex: none !important;
    justify-content: center !important;
  }
}

.modifier-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  font-size: var(--font-base);
  color: var(--text-primary);
  font-weight: var(--font-weight-semibold);
  box-shadow: var(--shadow-sm);
  white-space: nowrap;
}
.settings-branch-header {
  background: var(--bg-secondary);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  margin-bottom: var(--space-lg);
  position: relative;
  z-index: 10;
}
.settings-branch-trigger {
  padding: 6px 36px 6px var(--space-md);
  border-radius: var(--radius-md);
  width: 100%;
  height: 38px;
  line-height: 24px;
  background-position: right 12px center;
  display: flex;
  align-items: center;
}

/* --- Toggle Switch Styling --- */
.switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(139, 3, 19, 0.15); /* Light primary theme tint */
  transition: .3s;
  border-radius: 26px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .3s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.15);
}

input:checked + .slider {
  background-color: var(--success);
}

input:checked + .slider:before {
  transform: translateX(22px);
}

/* --- Connection Option Cards --- */
.connection-selector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-md);
  margin-top: var(--space-xs);
}

.connection-option-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base) ease;
  position: relative;
  overflow: hidden;
}

.connection-option-card:hover {
  border-color: var(--primary-light);
  background: rgba(230, 57, 70, 0.02);
}

.connection-option-card.selected {
  border-color: var(--primary);
  background: rgba(230, 57, 70, 0.04);
}

.connection-option-card .option-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  background: rgba(0, 0, 0, 0.03);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all var(--transition-base) ease;
  flex-shrink: 0;
}

.connection-option-card.selected .option-icon {
  background: var(--primary);
  color: white;
}

.connection-option-card .option-info {
  flex: 1;
  min-width: 0;
}

.connection-option-card .option-title {
  font-size: var(--font-sm);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin-bottom: 2px;
}

.connection-option-card .option-desc {
  font-size: var(--font-xs);
  color: var(--text-secondary);
}

.connection-option-card .option-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 1rem;
  color: var(--primary);
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.2s ease;
}

.connection-option-card.selected .option-badge {
  opacity: 1;
  transform: scale(1);
}

@media (max-width: 768px) {
  .connection-selector-grid {
    grid-template-columns: 1fr !important;
    gap: var(--space-sm) !important;
  }
}
</style>
