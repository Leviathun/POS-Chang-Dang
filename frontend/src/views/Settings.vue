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
        v-if="currentUser?.role === 'admin'"
        class="btn btn-secondary" 
        :class="{ 'active': activeTab === 'users' }"
        @click="activeTab = 'users'"
      >
        <i class="fa-solid fa-users"></i> พนักงานหน้าร้าน
      </button>
      <button 
        v-if="currentUser?.role === 'admin'"
        class="btn btn-secondary" 
        :class="{ 'active': activeTab === 'branches' }"
        @click="activeTab = 'branches'"
      >
        <i class="fa-solid fa-code-branch"></i> จัดการสาขา
      </button>
      <button 
        v-if="false"
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
    <div v-if="activeTab === 'shop'" class="flex flex-col gap-lg w-full">
      <div v-if="shopSettingsLoading" class="card flex flex-col gap-md">
        <div class="skeleton" style="width: 100%; height: 78px; border-radius: var(--radius-md);"></div>
        <div class="skeleton" style="width: 100%; height: 82px; border-radius: var(--radius-lg);"></div>
        <div class="skeleton" style="width: 100%; height: 82px; border-radius: var(--radius-lg);"></div>
      </div>

      <template v-else>
        <!-- Quick Navigation Cards -->
        <div class="diner-modules-grid">
          <!-- 1. Central Kitchen System (Admin Only) -->
          <div v-if="currentUser?.role === 'admin'" class="card diner-module-card" :class="{ 'is-active': isCentralKitchenSession }">
            <div class="flex flex-between align-center flex-wrap gap-md">
              <div class="flex align-center gap-md">
                <div class="diner-icon-badge" :class="{ 'is-solid': isCentralKitchenSession }">
                  <i v-if="!isCentralKitchenSession" class="fa-solid fa-warehouse"></i>
                  <i v-else class="fa-solid fa-store"></i>
                </div>
                <div>
                  <div class="font-bold text-base text-primary">
                    {{ isCentralKitchenSession ? 'กำลังใช้งาน: ระบบครัวกลาง' : 'ระบบครัวกลาง' }}
                  </div>
                  <div class="text-xs text-secondary">
                    {{ isCentralKitchenSession ? 'กดปุ่มเพื่อสลับกลับไปหน้าขายหน้าร้าน' : 'จัดการคลังกลาง จ่ายของให้สาขา และอนุมัติใบเบิก' }}
                  </div>
                </div>
              </div>
              <div class="flex align-center gap-xs">
                <button 
                  v-if="!isCentralKitchenSession" 
                  type="button"
                  class="btn btn-primary inline-flex align-center gap-xs"
                  @click="enterCentralKitchenFromSettings"
                >
                  <i class="fa-solid fa-arrow-right-to-bracket"></i>
                  <span>เข้าสู่ระบบครัวกลาง</span>
                </button>
                <button 
                  v-else 
                  type="button" 
                  class="btn btn-primary inline-flex align-center gap-xs"
                  @click="switchToPosBranchFromSettings"
                >
                  <i class="fa-solid fa-store"></i>
                  <span>สลับกลับหน้าร้าน</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 2. Requisition System -->
          <div class="card diner-module-card">
            <div class="flex flex-between align-center flex-wrap gap-md">
              <div class="flex align-center gap-md">
                <div class="diner-icon-badge">
                  <i class="fa-solid fa-boxes-packing"></i>
                </div>
                <div>
                  <div class="font-bold text-base text-primary">เบิกของจากครัวกลาง</div>
                  <div class="text-xs text-secondary">ส่งคำขอเบิกวัตถุดิบและสินค้าเข้าสาขา</div>
                </div>
              </div>
              <router-link 
                to="/requisition" 
                class="btn btn-primary inline-flex align-center gap-xs"
              >
                <i class="fa-solid fa-box-open"></i>
                <span>ไปที่หน้าเบิกของ</span>
              </router-link>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Tab 2: User management -->
    <div v-if="activeTab === 'users'" class="flex flex-col gap-lg w-full">
      <!-- Top Action Card -->
      <div class="card diner-page-header">
        <div class="diner-header-title">
          พนักงานหน้าร้าน: <strong class="tabular-nums">{{ filteredUsers.length }}</strong> คน
        </div>
        <div class="diner-header-actions">
          <button class="btn btn-primary" @click="openAddUserModal"><i class="fa-solid fa-plus"></i> เพิ่มพนักงาน</button>
        </div>
      </div>

      <!-- Branch & Role Filter Bar -->
      <div class="card p-md flex flex-col gap-sm" style="background: #ffffff; border: 1.5px solid var(--border-color);">
        <div class="flex align-center gap-xs flex-wrap">
          <span class="text-xs font-bold text-secondary" style="min-width: 48px;">สาขา:</span>
          <button
            type="button"
            class="btn btn-secondary btn-filter-pill"
            :class="{ active: userBranchFilter === 'all' }"
            @click="userBranchFilter = 'all'"
          >ทั้งหมด</button>
          <button
            v-for="b in branches"
            :key="'uf-b-' + b.id"
            type="button"
            class="btn btn-secondary btn-filter-pill"
            :class="{ active: userBranchFilter === b.id }"
            @click="userBranchFilter = b.id"
          >{{ b.name }}</button>
        </div>
        <div class="flex align-center gap-xs flex-wrap">
          <span class="text-xs font-bold text-secondary" style="min-width: 48px;">บทบาท:</span>
          <button
            v-for="r in [
              { value: 'all', label: 'ทั้งหมด' },
              { value: 'admin', label: 'ผู้ดูแลระบบ' },
              { value: 'manager', label: 'ผู้จัดการ' },
              { value: 'staff', label: 'พนักงาน' }
            ]"
            :key="'uf-r-' + r.value"
            type="button"
            class="btn btn-secondary btn-filter-pill"
            :class="{ active: userRoleFilter === r.value }"
            @click="userRoleFilter = r.value"
          >{{ r.label }}</button>
        </div>
      </div>

      <!-- Users list table (Visible on Desktop Only) -->
      <div class="card diner-table-card p-0 overflow-hidden hide-mobile">
        <div style="overflow-x: auto;">
          <table class="table w-full" style="border-collapse: collapse;">
            <thead>
              <tr class="diner-table-head">
                <th class="text-left" style="padding: var(--space-md);">ชื่อพนักงาน</th>
                <th class="text-center" style="padding: var(--space-md);">สาขา</th>
                <th class="text-center" style="padding: var(--space-md);">บทบาท</th>
                <th class="text-center" style="padding: var(--space-md);">รหัส PIN</th>
                <th class="text-center" style="padding: var(--space-md);">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <template v-if="usersLoading">
                <tr v-for="i in 4" :key="'u-skel-' + i" style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: var(--space-md);">
                    <div class="skeleton mb-xs" style="width: 140px; height: 18px; border-radius: var(--radius-sm);"></div>
                    <div class="skeleton" style="width: 110px; height: 14px; border-radius: var(--radius-sm);"></div>
                  </td>
                  <td class="text-center" style="padding: var(--space-md);">
                    <div class="skeleton mx-auto" style="width: 100px; height: 18px; border-radius: var(--radius-sm);"></div>
                  </td>
                  <td class="text-center" style="padding: var(--space-md);">
                    <div class="skeleton mx-auto" style="width: 80px; height: 24px; border-radius: var(--radius-full);"></div>
                  </td>
                  <td class="text-center" style="padding: var(--space-md);">
                    <div class="skeleton mx-auto" style="width: 48px; height: 18px; border-radius: var(--radius-sm);"></div>
                  </td>
                  <td class="text-center" style="padding: var(--space-md);">
                    <div class="flex justify-center gap-sm">
                      <div class="skeleton" style="width: 80px; height: 38px; border-radius: var(--radius-md);"></div>
                      <div class="skeleton" style="width: 70px; height: 38px; border-radius: var(--radius-md);"></div>
                    </div>
                  </td>
                </tr>
              </template>
              <tr v-else-if="filteredUsers.length === 0">
                <td colspan="5" class="text-center" style="padding: var(--space-xl); color: var(--text-tertiary);">
                  ไม่พบพนักงานตามเงื่อนไขที่เลือก
                </td>
              </tr>
              <tr 
                v-else 
                v-for="u in filteredUsers" 
                :key="u.id" 
                style="border-bottom: 1px solid var(--border-color);"
                class="table-row-hover"
              >
                <td style="padding: var(--space-md); vertical-align: middle;">
                  <div class="flex align-center gap-sm">
                    <div class="diner-avatar-sm">{{ u.name ? u.name.charAt(0).toUpperCase() : '?' }}</div>
                    <div>
                      <div class="font-bold text-base">{{ u.name }}</div>
                      <div class="text-xs text-muted">สมัครเมื่อ: {{ formatDate(u.created_at) }}</div>
                    </div>
                  </div>
                </td>
                <td class="text-center" style="padding: var(--space-md); vertical-align: middle;">
                  <span class="text-sm text-secondary inline-flex align-center justify-center" style="gap: 4px;">
                    <i class="fa-solid fa-store" style="color: var(--primary);"></i> {{ getBranchName(u.branch_id) }}
                  </span>
                </td>
                <td class="text-center" style="padding: var(--space-md); vertical-align: middle;">
                  <span class="badge text-sm" :class="u.role === 'admin' ? 'badge-primary' : u.role === 'manager' ? 'badge-warning' : 'badge-neutral'">
                    {{ getRoleLabel(u.role) }}
                  </span>
                </td>
                <td class="text-center" style="padding: var(--space-md); font-weight: bold; vertical-align: middle; color:var(--primary);">
                  <div class="inline-flex align-center justify-center gap-xs">
                    <span class="tabular-nums" style="letter-spacing: 2px;">{{ (currentUser?.role === 'admin' && visiblePinUserIds[u.id]) ? (u.pin || '-') : '••••' }}</span>
                    <button
                      v-if="currentUser?.role === 'admin'"
                      type="button"
                      class="btn-pin-toggle"
                      :title="visiblePinUserIds[u.id] ? 'ซ่อนรหัส PIN' : 'ดูรหัส PIN'"
                      @click="toggleUserPin(u.id)"
                    >
                      <i :class="visiblePinUserIds[u.id] ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
                    </button>
                  </div>
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
      <div class="show-mobile-only mobile-users-list">
        <template v-if="usersLoading">
          <div v-for="i in 3" :key="'um-skel-' + i" class="card p-sm flex align-center gap-md" style="margin-bottom: var(--space-sm);">
            <div class="skeleton" style="width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;"></div>
            <div class="flex-1 min-w-0">
              <div class="flex flex-between align-center mb-xs">
                <div class="skeleton" style="width: 120px; height: 18px; border-radius: var(--radius-sm);"></div>
                <div class="skeleton" style="width: 64px; height: 22px; border-radius: var(--radius-full);"></div>
              </div>
              <div class="skeleton mb-sm" style="width: 160px; height: 14px; border-radius: var(--radius-sm);"></div>
              <div class="flex gap-sm">
                <div class="skeleton flex-1" style="height: 38px; border-radius: var(--radius-md);"></div>
                <div class="skeleton flex-1" style="height: 38px; border-radius: var(--radius-md);"></div>
              </div>
            </div>
          </div>
        </template>
        <div v-else-if="filteredUsers.length === 0" style="text-align: center; padding: var(--space-xl); color: var(--text-tertiary);">
          ไม่พบข้อมูลพนักงาน
        </div>
        <div 
          v-else 
          v-for="u in filteredUsers" 
          :key="u.id"
          class="card diner-item-card"
        >
          <div class="flex align-center gap-md mb-sm">
            <div class="diner-icon-badge font-bold">
              <i v-if="!u.name" class="fa-solid fa-user"></i>
              <span v-else>{{ u.name.charAt(0).toUpperCase() }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex flex-between align-center gap-xs">
                <span class="font-bold text-base" style="color: var(--text-primary);">{{ u.name }}</span>
                <span class="badge" :class="u.role === 'admin' ? 'badge-primary' : u.role === 'manager' ? 'badge-warning' : 'badge-neutral'">
                  {{ getRoleLabel(u.role) }}
                </span>
              </div>
              <div class="text-xs text-secondary mt-xs flex flex-col gap-xs">
                <div><i class="fa-solid fa-store mr-xs" style="color: var(--primary);"></i>{{ getBranchName(u.branch_id) }}</div>
                <div class="flex align-center gap-sm">
                  <span>PIN: <strong class="tabular-nums" style="color: var(--primary); letter-spacing: 1px;">{{ (currentUser?.role === 'admin' && visiblePinUserIds[u.id]) ? (u.pin || '-') : '••••' }}</strong></span>
                  <button
                    v-if="currentUser?.role === 'admin'"
                    type="button"
                    class="btn-pin-toggle"
                    :title="visiblePinUserIds[u.id] ? 'ซ่อนรหัส PIN' : 'ดูรหัส PIN'"
                    @click="toggleUserPin(u.id)"
                  >
                    <i :class="visiblePinUserIds[u.id] ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="flex gap-sm">
            <button class="btn-action btn-action-edit flex-1" @click="openEditUserModal(u)">
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
            <label class="form-label">รหัส PIN 4 หลัก * (รหัสเฉพาะบุคคลไม่ซ้ำกันทั่วทั้งระบบ)</label>
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
                  {{ userForm.role === 'admin' ? 'เจ้าของร้าน/ผู้บริหาร (เข้าถึงได้ทุกระบบ 100%)' : userForm.role === 'manager' ? 'ผู้จัดการร้าน (ขาย, สต็อก, จัดการเมนู, ดูยอดขายสาขา)' : 'พนักงานหน้าร้าน (ขายหน้าร้าน, ทอด, บันทึกของเสีย/สวัสดิการ)' }}
                </span>
              </div>
              <div v-if="isRoleDropdownOpen" class="custom-select-dropdown">
                <div class="custom-select-option" :class="{ 'selected': userForm.role === 'staff' }" @click="selectUserRole('staff')">พนักงานหน้าร้าน (ขายหน้าร้าน, ทอด, บันทึกของเสีย/สวัสดิการ)</div>
                <div class="custom-select-option" :class="{ 'selected': userForm.role === 'manager' }" @click="selectUserRole('manager')">ผู้จัดการร้าน (ขาย, สต็อก, จัดการเมนู, ดูยอดขายสาขา)</div>
                <div class="custom-select-option" :class="{ 'selected': userForm.role === 'admin' }" @click="selectUserRole('admin')">เจ้าของร้าน/ผู้บริหาร (เข้าถึงได้ทุกระบบ 100%)</div>
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
            <button class="btn-modal btn-modal-secondary flex-1" :disabled="isSavingUser" @click="showUserModal = false">ยกเลิก</button>
            <button 
              class="btn-modal btn-modal-primary flex-1" 
              :disabled="!userForm.name || !userForm.pin || userForm.pin.length !== 4 || isSavingUser"
              @click="handleSaveUser"
            >
              <i v-if="isSavingUser" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-floppy-disk"></i>
              {{ isSavingUser ? 'กำลังบันทึก...' : 'บันทึกข้อมูล' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 3: Branch management (Admin only) -->
    <div v-if="activeTab === 'branches'" class="flex flex-col gap-lg w-full">
      <!-- Top Action Card -->
      <div class="card diner-page-header">
        <div class="diner-header-title">
          สาขาทั้งหมด: <strong class="tabular-nums">{{ branches.length }}</strong> สาขา
        </div>
        <div class="diner-header-actions">
          <button class="btn btn-primary" @click="openAddBranchModal"><i class="fa-solid fa-plus"></i> เพิ่มสาขา</button>
        </div>
      </div>

      <!-- Branch list table (Visible on Desktop Only) -->
      <div class="card diner-table-card p-0 overflow-hidden hide-mobile">
        <div style="overflow-x: auto;">
          <table class="table w-full" style="border-collapse: collapse;">
            <thead>
              <tr class="diner-table-head">
                <th class="text-left" style="padding: var(--space-md);">ชื่อสาขา</th>
                <th class="text-left" style="padding: var(--space-md);">ที่อยู่</th>
                <th class="text-center" style="padding: var(--space-md);">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <template v-if="usersLoading || shopSettingsLoading">
                <tr v-for="i in 3" :key="'b-skel-' + i" style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: var(--space-md);">
                    <div class="skeleton" style="width: 150px; height: 18px; border-radius: var(--radius-sm);"></div>
                  </td>
                  <td style="padding: var(--space-md);">
                    <div class="skeleton" style="width: 220px; height: 18px; border-radius: var(--radius-sm);"></div>
                  </td>
                  <td class="text-center" style="padding: var(--space-md);">
                    <div class="flex justify-center gap-sm">
                      <div class="skeleton" style="width: 80px; height: 38px; border-radius: var(--radius-md);"></div>
                      <div class="skeleton" style="width: 70px; height: 38px; border-radius: var(--radius-md);"></div>
                    </div>
                  </td>
                </tr>
              </template>
              <tr v-else-if="branches.length === 0">
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
                  <div class="flex align-center gap-sm">
                    <div class="diner-avatar-sm"><i class="fa-solid fa-store"></i></div>
                    <span>{{ b.name }}</span>
                  </div>
                </td>
                <td style="padding: var(--space-md); vertical-align: middle; color: var(--text-secondary);">
                  <i class="fa-solid fa-location-dot mr-xs" style="color: var(--primary);"></i>{{ b.address || '-' }}
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
      <div class="show-mobile-only mobile-users-list">
        <template v-if="usersLoading || shopSettingsLoading">
          <div v-for="i in 3" :key="'bm-skel-' + i" class="card p-sm flex align-center gap-md" style="margin-bottom: var(--space-sm);">
            <div class="skeleton" style="width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;"></div>
            <div class="flex-1 min-w-0">
              <div class="skeleton mb-xs" style="width: 140px; height: 18px; border-radius: var(--radius-sm);"></div>
              <div class="skeleton mb-sm" style="width: 180px; height: 14px; border-radius: var(--radius-sm);"></div>
              <div class="flex gap-sm">
                <div class="skeleton flex-1" style="height: 38px; border-radius: var(--radius-md);"></div>
                <div class="skeleton flex-1" style="height: 38px; border-radius: var(--radius-md);"></div>
              </div>
            </div>
          </div>
        </template>
        <div v-else-if="branches.length === 0" style="text-align: center; padding: var(--space-xl); color: var(--text-tertiary);">
          ยังไม่มีข้อมูลสาขา
        </div>
        <div 
          v-else 
          v-for="b in branches" 
          :key="b.id"
          class="card diner-item-card"
        >
          <div class="flex align-center gap-md mb-sm">
            <div class="diner-icon-badge">
              <i class="fa-solid fa-store"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-bold text-base" style="color: var(--text-primary);">{{ b.name }}</div>
              <div class="text-xs text-secondary mt-xs">
                <i class="fa-solid fa-location-dot mr-xs" style="color: var(--primary);"></i>{{ b.address || '-' }}
              </div>
            </div>
          </div>
          <div class="flex gap-sm">
            <button class="btn-action btn-action-edit flex-1" @click="openEditBranchModal(b)">
              <i class="fa-solid fa-pen-to-square"></i> แก้ไข
            </button>
            <button class="btn-action btn-action-delete flex-1" @click="handleDeleteBranch(b.id)">
              <i class="fa-solid fa-trash-can"></i> ลบ
            </button>
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
            <button class="btn-modal btn-modal-secondary flex-1" :disabled="isSavingBranch" @click="showBranchModal = false">ยกเลิก</button>
            <button 
              class="btn-modal btn-modal-primary flex-1" 
              :disabled="!branchForm.name || !branchForm.name.trim() || isSavingBranch"
              @click="handleSaveBranch"
            >
              <i v-if="isSavingBranch" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-floppy-disk"></i>
              {{ isSavingBranch ? 'กำลังบันทึก...' : 'บันทึกข้อมูล' }}
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
              <template v-if="presetsLoading">
                <tr v-for="i in 3" :key="'p-skel-' + i" style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: var(--space-md);">
                    <div class="skeleton" style="width: 140px; height: 18px; border-radius: var(--radius-sm);"></div>
                  </td>
                  <td style="padding: var(--space-md);">
                    <div class="flex gap-xs">
                      <div class="skeleton" style="width: 80px; height: 24px; border-radius: var(--radius-full);"></div>
                      <div class="skeleton" style="width: 90px; height: 24px; border-radius: var(--radius-full);"></div>
                    </div>
                  </td>
                  <td class="text-center" style="padding: var(--space-md);">
                    <div class="skeleton mx-auto" style="width: 76px; height: 24px; border-radius: var(--radius-full);"></div>
                  </td>
                  <td class="text-center" style="padding: var(--space-md);">
                    <div class="flex justify-center gap-sm">
                      <div class="skeleton" style="width: 80px; height: 38px; border-radius: var(--radius-md);"></div>
                      <div class="skeleton" style="width: 70px; height: 38px; border-radius: var(--radius-md);"></div>
                    </div>
                  </td>
                </tr>
              </template>
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
        <div v-if="presetsLoading" class="flex flex-col gap-sm">
          <div v-for="i in 3" :key="'pm-skel-' + i" class="card p-md flex flex-col gap-sm">
            <div class="flex flex-between align-center">
              <div class="skeleton" style="width: 140px; height: 18px; border-radius: var(--radius-sm);"></div>
              <div class="skeleton" style="width: 70px; height: 22px; border-radius: var(--radius-full);"></div>
            </div>
            <div class="skeleton" style="width: 180px; height: 24px; border-radius: var(--radius-full);"></div>
            <div class="flex gap-sm">
              <div class="skeleton flex-1" style="height: 38px; border-radius: var(--radius-md);"></div>
              <div class="skeleton flex-1" style="height: 38px; border-radius: var(--radius-md);"></div>
            </div>
          </div>
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

    <!-- Tab 5: Backup, Restore & Cloud Purge -->
    <div v-if="activeTab === 'backup'" class="flex flex-col gap-lg w-full">
      <!-- Card 1: Data Export & Cloud Purge -->
      <div class="card">
        <div class="card-title mb-sm text-base">
          <i class="fa-solid fa-cloud-arrow-down" style="margin-right: 6px; color: var(--primary);"></i> 
          ส่งออกรายงาน & สำรองข้อมูล
        </div>
        <p class="text-secondary mb-lg text-sm" style="line-height: 1.5;">
          ดาวน์โหลดข้อมูลสรุป 7 หมวดหมู่เป็นไฟล์ Excel แยกแถบพร้อมใช้งาน
        </p>

        <!-- Filters Row: Period & Branch Selector -->
        <div class="flex gap-md mb-lg flex-wrap" style="align-items: flex-end;">
          <!-- Period Selector -->
          <div class="form-group flex-1 min-w-200 mb-0">
            <label class="form-label font-bold text-xs"><i class="fa-solid fa-calendar-days mr-xs"></i> เลือกช่วงเวลาย้อนหลัง: *</label>
            <div class="custom-select-wrapper" @click.stop style="position: relative; z-index: 6;">
              <div 
                class="custom-select-trigger" 
                :class="{ 'active': isBackupPeriodDropdownOpen }" 
                @click="isBackupPeriodDropdownOpen = !isBackupPeriodDropdownOpen"
                style="padding: 10px 14px; min-height: 42px;"
              >
                <span class="custom-select-text font-semibold">{{ selectedBackupPeriodName }}</span>
              </div>
              <div v-if="isBackupPeriodDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 2px);">
                <div 
                  v-for="opt in backupPeriodOptions" 
                  :key="opt.value" 
                  class="custom-select-option" 
                  :class="{ 'selected': backupPeriod === opt.value }" 
                  @click="selectBackupPeriod(opt.value)"
                >
                  {{ opt.label }}
                </div>
              </div>
            </div>
          </div>

          <!-- Branch Selector -->
          <div class="form-group flex-1 min-w-200 mb-0">
            <label class="form-label font-bold text-xs"><i class="fa-solid fa-store mr-xs"></i> เลือกสาขา: *</label>
            <div class="custom-select-wrapper" @click.stop style="position: relative; z-index: 5;">
              <div 
                class="custom-select-trigger" 
                :class="{ 'active': isBackupBranchDropdownOpen }" 
                @click="isBackupBranchDropdownOpen = !isBackupBranchDropdownOpen"
                style="padding: 10px 14px; min-height: 42px;"
              >
                <span class="custom-select-text font-semibold">{{ selectedBackupBranchName }}</span>
              </div>
              <div v-if="isBackupBranchDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 2px);">
                <div 
                  class="custom-select-option" 
                  :class="{ 'selected': backupBranchId === 'all' }" 
                  @click="selectBackupBranch('all')"
                >
                  ทุกสาขา (รวมข้อมูลทุกสาขา)
                </div>
                <div 
                  v-for="b in branches" 
                  :key="b.id" 
                  class="custom-select-option" 
                  :class="{ 'selected': backupBranchId === b.id }" 
                  @click="selectBackupBranch(b.id)"
                >
                  {{ b.name }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Cards Grid -->
        <div class="grid-2-cols gap-md mb-xl" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-md);">
          
          <!-- Action 1: Standard Multi-Sheet Excel Download -->
          <div 
            class="card p-md flex flex-col justify-between" 
            style="border: 1px solid rgba(42, 157, 143, 0.4); background: rgba(42, 157, 143, 0.03); border-radius: var(--radius-lg);"
          >
            <div>
              <div class="flex align-center gap-sm mb-xs">
                <i class="fa-solid fa-file-excel text-lg" style="color: var(--success, #2a9d8f);"></i>
                <strong class="text-base font-bold" style="color: var(--text-primary);">1. ดาวน์โหลดรายงาน Excel</strong>
              </div>
              <p class="text-xs text-secondary mb-md" style="line-height: 1.4;">
                ส่งออกรายงานสรุป 7 หมวดหมู่ลงเครื่อง
              </p>
            </div>
            <button 
              class="btn btn-secondary w-full" 
              @click="downloadExcelSummary"
              style="border-color: var(--success, #2a9d8f); color: var(--success, #2a9d8f); font-weight: bold; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;"
            >
              <i class="fa-solid fa-file-excel"></i> ดาวน์โหลดรายงาน Excel
            </button>
          </div>

          <!-- Action 2: Download Excel + Purge Cloud -->
          <div 
            class="card p-md flex flex-col justify-between" 
            style="border: 1px solid rgba(192, 57, 43, 0.4); background: rgba(192, 57, 43, 0.03); border-radius: var(--radius-lg);"
          >
            <div>
              <div class="flex align-center gap-sm mb-xs">
                <i class="fa-solid fa-cloud-arrow-down text-lg" style="color: var(--danger, #c0392b);"></i>
                <strong class="text-base font-bold" style="color: var(--danger, #c0392b);">2. ดาวน์โหลดและล้างข้อมูลเก่า</strong>
              </div>
              <p class="text-xs text-secondary mb-md" style="line-height: 1.4;">
                สำรองไฟล์ลงเครื่องก่อนลบประวัติเก่าบนคลาวด์
              </p>
            </div>
            <button 
              class="btn btn-primary w-full" 
              @click="openPurgeModal"
              style="background: var(--danger, #c0392b); border-color: var(--danger, #c0392b); font-weight: bold; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;"
            >
              <i class="fa-solid fa-trash-can-arrow-up"></i> ดาวน์โหลด & ล้างข้อมูลเก่า
            </button>
          </div>

        </div>

        <div class="divider mb-lg" style="height: 1px; background: var(--border-color);"></div>

        <!-- Full JSON Backup & SQLite Download -->
        <div>
          <div class="text-xs font-bold text-secondary mb-sm">สำรองข้อมูลทั้งระบบ:</div>
          <div class="flex gap-md backup-btns-container">
            <button class="btn btn-secondary flex-1" @click="downloadJSONBackup" style="min-height: 42px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
              <i class="fa-solid fa-database"></i> สำรองข้อมูล (.json)
            </button>
            <button class="btn btn-secondary flex-1" @click="downloadSQLiteDB" style="min-height: 42px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
              <i class="fa-solid fa-download"></i> ดาวน์โหลดฐานข้อมูล (.db)
            </button>
          </div>
        </div>
      </div>

      <!-- Card 2: Data Restore -->
      <div class="card">
        <div class="card-title mb-sm text-base">
          <i class="fa-solid fa-file-import" style="margin-right: 6px; color: var(--primary);"></i> 
          นำเข้าและกู้คืนข้อมูล
        </div>
        <p class="text-secondary mb-lg text-sm" style="line-height: 1.5;">
          เลือกไฟล์สำรอง .json ที่เคยดาวน์โหลดไว้เพื่อกู้คืนข้อมูล
        </p>

        <div class="form-group mb-0">
          <label class="form-label font-bold text-sm"><i class="fa-solid fa-file-arrow-up mr-xs"></i> เลือกไฟล์สำรองข้อมูล:</label>
          <input 
            type="file" 
            class="form-input" 
            accept=".json"
            @change="handleImportJSON"
            ref="fileInput"
            style="padding: 10px;"
          />
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
          เลือกวิธีเชื่อมต่อเครื่องพิมพ์ใบเสร็จและลิ้นชักเก็บเงิน
        </p>

        <!-- Connection Type Selection (Cards) -->
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
                <div class="option-title">ต่อสาย USB ตรง</div>
                <div class="option-desc">เหมาะสำหรับคอมพิวเตอร์และโน้ตบุ๊ก</div>
              </div>
              <div class="option-badge">
                <i class="fa-solid fa-circle-check"></i>
              </div>
            </div>

            <!-- 2. RawBT App Connection -->
            <div 
              class="connection-option-card"
              :class="{ selected: printerConfig.connectionType === 'rawbt' }"
              @click="setConnectionType('rawbt')"
            >
              <div class="option-icon">
                <i class="fa-solid fa-tablet-screen-button font-xl"></i>
              </div>
              <div class="option-info">
                <div class="option-title">แอป RawBT</div>
                <div class="option-desc">แนะนำสำหรับแท็บเล็ตและมือถือ Android</div>
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
            <i v-if="printerConnected" class="fa-solid fa-circle-check" style="color: var(--success)"></i>
            <i v-else class="fa-solid fa-circle-xmark" style="color: var(--primary)"></i>
          </div>
          <div style="flex: 1; min-width: 0;">
            <div class="font-bold text-base" :style="{ color: printerConnected ? 'var(--success)' : 'var(--primary)', fontSize: 'var(--font-base)', lineHeight: '1.4' }">
              สถานะเครื่องพิมพ์: <span class="printer-status-value">{{ printerConnected ? 'เชื่อมต่อพร้อมใช้งาน' : 'ยังไม่ได้เชื่อมต่อ' }}</span>
            </div>
            <div style="font-size: var(--font-xs); color: var(--text-secondary); margin-top: 4px; line-height: 1.4;" v-if="printerConnected">
              พร้อมพิมพ์ใบเสร็จและเปิดลิ้นชัก
            </div>
            <div style="font-size: var(--font-xs); color: var(--text-secondary); margin-top: 4px; line-height: 1.4;" v-else>
              กดปุ่มด้านล่างเพื่อเลือกเครื่องพิมพ์
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
            <i class="fa-solid fa-circle-check" style="color: var(--success)"></i>
          </div>
          <div style="flex: 1; min-width: 0;">
            <div class="font-bold text-base" style="color: var(--success); font-size: var(--font-base); line-height: 1.4;">
              สถานะ: เปิดใช้งานผ่านแอป RawBT แล้ว
            </div>
            <div style="font-size: var(--font-xs); color: var(--text-secondary); margin-top: 4px; line-height: 1.4;">
              ส่งคำสั่งพิมพ์และเปิดลิ้นชักอัตโนมัติ
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
              <strong style="font-size: var(--font-sm); color: var(--text-primary); display: block; font-weight: var(--font-weight-semibold);">เปิดลิ้นชักอัตโนมัติ</strong>
              <span style="font-size: var(--font-xs); color: var(--text-secondary); display: block; margin-top: 4px; line-height: 1.4;">เปิดลิ้นชักทันทีเมื่อชำระเงินสำเร็จ</span>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="printerConfig.autoKick" @change="saveLocalPrinterConfig" />
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-item">
            <div style="flex: 1; min-width: 0; padding-right: var(--space-md);">
              <strong style="font-size: var(--font-sm); color: var(--text-primary); display: block; font-weight: var(--font-weight-semibold);">พิมพ์ใบเสร็จอัตโนมัติ</strong>
              <span style="font-size: var(--font-xs); color: var(--text-secondary); display: block; margin-top: 4px; line-height: 1.4;">พิมพ์ทันทีเมื่อทำรายการสำเร็จ</span>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="printerConfig.autoPrint" @change="saveLocalPrinterConfig" />
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-item setting-item-select" v-if="printerConfig.connectionType === 'rawbt'">
            <div style="flex: 1; min-width: 0; padding-right: var(--space-md);">
              <strong style="font-size: var(--font-sm); color: var(--text-primary); display: block; font-weight: var(--font-weight-semibold);">รูปแบบใบเสร็จ RawBT</strong>
              <span style="font-size: var(--font-xs); color: var(--text-secondary); display: block; margin-top: 4px; line-height: 1.4;">โหมดรูปภาพคมชัด 100%</span>
            </div>
            
            <div class="custom-select-wrapper" @click.stop style="width: auto; min-width: 280px; max-width: 100%; position: relative; z-index: 5;">
              <div 
                class="custom-select-trigger" 
                :class="{ 'active': isPrintModeDropdownOpen }" 
                @click="togglePrintModeDropdown"
              >
                <span class="custom-select-text font-semibold">
                  <i class="fa-solid fa-image mr-xs" style="color: var(--primary);"></i>
                  รูปภาพคมชัด 100%
                </span>
              </div>
              <div v-if="isPrintModeDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 2px);">
                <div 
                  class="custom-select-option selected" 
                  @click="selectPrintMode('image')"
                >
                  <i class="fa-solid fa-circle-check mr-xs text-primary"></i>
                  รูปภาพคมชัด 100%
                </div>
              </div>
            </div>
          </div>

        </div>

        <div class="divider mb-lg" style="height:1px; background:var(--border-color);"></div>

        <!-- Testing Buttons -->
        <div class="flex gap-md printer-btn-container" style="display: flex; gap: var(--space-md); flex-wrap: wrap;">
          <button class="btn btn-secondary" :disabled="isTestingPrint" @click="handleTestPrint" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px;">
            <i v-if="isTestingPrint" class="fa-solid fa-spinner fa-spin"></i>
            <i v-else class="fa-solid fa-file-invoice"></i>
            {{ isTestingPrint ? 'กำลังทดสอบ...' : 'ทดสอบพิมพ์ใบเสร็จ' }}
          </button>
          <button class="btn btn-secondary" :disabled="isTestingKick" @click="handleTestKick" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px;">
            <i v-if="isTestingKick" class="fa-solid fa-spinner fa-spin"></i>
            <i v-else class="fa-solid fa-key"></i>
            {{ isTestingKick ? 'กำลังทดสอบ...' : 'ทดสอบเปิดลิ้นชัก' }}
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
            <button class="btn-modal btn-modal-secondary flex-1" :disabled="isSavingPreset" @click="showPresetModal = false">ยกเลิก</button>
            <button 
              class="btn-modal btn-modal-primary flex-1" 
              :disabled="!presetForm.name.trim() || presetForm.modifier_ids.length === 0 || isSavingPreset"
              @click="handleSavePreset"
            >
              <i v-if="isSavingPreset" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-floppy-disk"></i>
              {{ isSavingPreset ? 'กำลังบันทึก...' : 'บันทึกข้อมูล' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Purge Cloud Data Confirmation Dialog Modal -->
    <div v-if="showPurgeModal" class="modal-container active flex align-center justify-center">
      <div class="modal-overlay" @click="!isPurging && (showPurgeModal = false)"></div>
      <div class="modal-content modal-center w-full max-w-md" style="position:relative; z-index:2;">
        <div class="modal-header" style="background: rgba(192, 57, 43, 0.08); border-bottom: 1px solid rgba(192, 57, 43, 0.2);">
          <h3 style="color: var(--danger, #c0392b);">
            <i class="fa-solid fa-triangle-exclamation mr-xs"></i> ยืนยันดาวน์โหลด & ล้างข้อมูลบน Cloud
          </h3>
          <button class="modal-close" :disabled="isPurging" @click="showPurgeModal = false">✕</button>
        </div>
        
        <div class="modal-body">
          <!-- Info Details Box -->
          <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; margin-bottom: 16px;">
            <div class="flex flex-between align-center mb-xs text-sm">
              <span class="text-secondary">ช่วงเวลาที่จะล้าง:</span>
              <strong class="text-primary">{{ selectedBackupPeriodName }}</strong>
            </div>
            <div class="flex flex-between align-center mb-xs text-sm">
              <span class="text-secondary">สาขา:</span>
              <strong class="text-primary">{{ selectedBackupBranchName }}</strong>
            </div>
          </div>

          <!-- Process Explanation & Safeguards -->
          <div style="font-size: 13px; line-height: 1.6; color: var(--text-secondary); margin-bottom: 16px;">
            <div class="flex align-center gap-xs mb-xs" style="color: var(--success, #2a9d8f); font-weight: bold;">
              <i class="fa-solid fa-circle-check"></i>
              <span>ระบบจะดาวน์โหลดไฟล์ CSV สำรองข้อมูลลงเครื่องให้โดยอัตโนมัติก่อนเริ่มลบเสมอ</span>
            </div>
            <div class="flex align-center gap-xs mb-xs" style="color: var(--danger, #c0392b); font-weight: bold;">
              <i class="fa-solid fa-circle-exclamation"></i>
              <span>ข้อมูลธุรกรรมเก่า (ออเดอร์, สต็อก, ค่าใช้จ่าย, กิจกรรม, ลิ้นชัก) จะถูกล้างออกจาก Turso Cloud</span>
            </div>
            <div class="text-xs text-muted mt-xs">
              *ข้อมูลหลักของร้าน (เมนู, หมวดหมู่, สาขา, พนักงาน, ตั้งค่าระบบ) จะยังคงอยู่ปลอดภัยครบ 100%
            </div>
          </div>

          <!-- Typing Confirmation -->
          <div class="form-group mb-md">
            <label class="form-label font-bold text-xs" style="color: var(--danger, #c0392b);">
              พิมพ์คำว่า <span style="background: rgba(192, 57, 43, 0.15); padding: 2px 6px; border-radius: 4px; user-select: all;">ยืนยันลบข้อมูล</span> เพื่อปลดล็อกปุ่มยืนยัน:
            </label>
            <input 
              type="text" 
              class="form-input" 
              v-model="purgeConfirmInput" 
              placeholder="พิมพ์ ยืนยันลบข้อมูล" 
              style="border-color: rgba(192, 57, 43, 0.4); text-align: center; font-weight: bold;"
            />
          </div>

          <!-- Buttons -->
          <div class="flex gap-md mt-lg">
            <button class="btn-modal btn-modal-secondary flex-1" :disabled="isPurging" @click="showPurgeModal = false">
              ยกเลิก
            </button>
            <button 
              class="btn-modal btn-modal-primary flex-1" 
              :disabled="isPurging || (purgeConfirmInput !== 'ยืนยันลบข้อมูล' && purgeConfirmInput !== 'CONFIRM')"
              @click="handleExecutePurgeCloud"
              style="background: var(--danger, #c0392b); border-color: var(--danger, #c0392b);"
            >
              <i v-if="isPurging" class="fa-solid fa-spinner fa-spin mr-xs"></i>
              <i v-else class="fa-solid fa-trash-can-arrow-up mr-xs"></i>
              {{ isPurging ? 'กำลังดำเนินการ...' : 'ยืนยันดาวน์โหลด & ลบข้อมูล' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile-Only Logout Section -->
    <div class="mobile-logout-section card mt-xl">
      <div class="flex flex-between align-center">
        <div class="flex align-center gap-sm">
          <i class="fa-solid fa-circle-user text-primary" style="font-size: 1.5rem;"></i>
          <div>
            <div class="font-bold text-base text-primary">{{ currentUser?.name }}</div>
            <div class="text-xs text-secondary">{{ getRoleLabel(currentUser?.role) }}</div>
          </div>
        </div>
        <button class="btn btn-danger mobile-logout-btn" @click="handleLogout">
          <i class="fa-solid fa-right-from-bracket mr-xs"></i>
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';
import { ui, formatDate, getUser, getRoleLabel } from '../helpers';
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

const router = useRouter();

const isCentralKitchenSession = computed(() => {
  if (sessionStorage.getItem('is_central_kitchen') === '1') return true;
  const branchName = sessionStorage.getItem('selected_branch_name') || '';
  if (branchName.includes('ครัวกลาง')) return true;
  const currentBranchId = Number(sessionStorage.getItem('selected_branch_id'));
  const b = branches.value.find(x => x.id === currentBranchId);
  return b && (b.is_central_kitchen === 1 || b.name.includes('ครัวกลาง'));
});

const enterCentralKitchenFromSettings = () => {
  sessionStorage.setItem('is_central_kitchen', '1');
  const ckBranch = branches.value.find(b => b.is_central_kitchen === 1 || b.name.includes('ครัวกลาง'));
  if (ckBranch) {
    sessionStorage.setItem('selected_branch_id', String(ckBranch.id));
    sessionStorage.setItem('selected_branch_name', ckBranch.name);
  }
  router.push('/central-kitchen/catalog');
};

const switchToPosBranchFromSettings = () => {
  sessionStorage.removeItem('is_central_kitchen');
  const userBranchId = currentUser.value?.branch_id;
  let retailBranch = branches.value.find(b => b.id === userBranchId && !b.name.includes('ครัวกลาง') && b.is_central_kitchen !== 1);
  if (!retailBranch) {
    const lastPosId = sessionStorage.getItem('last_pos_branch_id') ? Number(sessionStorage.getItem('last_pos_branch_id')) : null;
    retailBranch = branches.value.find(b => b.id === lastPosId && !b.name.includes('ครัวกลาง') && b.is_central_kitchen !== 1);
  }
  if (!retailBranch) {
    retailBranch = branches.value.find(b => !b.name.includes('ครัวกลาง') && b.is_central_kitchen !== 1) || branches.value[0];
  }
  if (retailBranch) {
    sessionStorage.setItem('selected_branch_id', String(retailBranch.id));
    sessionStorage.setItem('selected_branch_name', retailBranch.name);
  }
  router.push('/pos');
};

const handleLogout = () => {
  window.dispatchEvent(new CustomEvent('trigger-logout'));
};

// --- Printer & Cash Drawer States & Actions ---
const printerConnected = ref(false);
const printerConfig = ref({
  vendorId: null,
  productId: null,
  autoPrint: true,
  autoKick: true,
  connectionType: 'usb',
  printMode: 'image'
});

const loadPrinterSettings = async () => {
  const cfg = getSavedPrinterConfig();
  // Ensure RawBT print mode is strictly 'image' for Branch 1 design quality
  if (cfg.connectionType === 'rawbt' && cfg.printMode !== 'image') {
    cfg.printMode = 'image';
    savePrinterConfig(cfg.vendorId, cfg.productId, cfg.autoPrint, cfg.autoKick, cfg.connectionType, 'image');
  }
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

const setConnectionType = (type) => {
  printerConfig.value.connectionType = type;
  if (type === 'rawbt' && !printerConfig.value.printMode) {
    printerConfig.value.printMode = 'image';
  }
  saveLocalPrinterConfig();
  ui.showToast(`เปลี่ยนประเภทการเชื่อมต่อเป็น ${type === 'rawbt' ? 'แอป RawBT (แท็บเล็ต)' : 'สาย USB'} สำเร็จ`, 'success');
};



const isTestingPrint = ref(false);
const isTestingKick = ref(false);

const handleTestPrint = async () => {
  const config = getSavedPrinterConfig();
  if (config.connectionType === 'rawbt') {
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
      printReceiptSync(testOrder, testItems, {
        shopName: 'ไก่ทอดช้างแดง (ทดสอบ)',
        branchName: activeBranch.name,
        phone: '081-234-5678',
        forceKick: !!printerConfig.value.autoKick
      });
      ui.showToast('ส่งข้อมูลสั่งพิมพ์ไปยังแอป RawBT แล้ว 🖨️', 'success');
    } catch (e) {
      ui.showToast('การพิมพ์ล้มเหลว: ' + e.message, 'error');
    }
    return;
  }

  if (isTestingPrint.value) return;
  isTestingPrint.value = true;
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
    
    if (isPrinterConnected()) {
      await printReceipt(testOrder, testItems, {
        shopName: 'ไก่ทอดช้างแดง (ทดสอบ)',
        branchName: activeBranch.name,
        phone: '081-234-5678',
        forceKick: !!printerConfig.value.autoKick
      });
      ui.showToast('พิมพ์ใบเสร็จทดสอบสำเร็จแล้ว 🖨️', 'success');
    } else {
      // Fallback for standard browser print dialog
      window.print();
      ui.showToast('เปิดหน้าต่างสั่งพิมพ์ใบเสร็จทดลองแล้ว 🖨️', 'success');
    }
  } catch (e) {
    ui.showToast('การพิมพ์ล้มเหลว: ' + e.message, 'error');
  } finally {
    isTestingPrint.value = false;
  }
};

const handleTestKick = async () => {
  const config = getSavedPrinterConfig();
  if (config.connectionType === 'rawbt') {
    try {
      kickDrawerSync();
      ui.showToast('ส่งคำสั่งเปิดลิ้นชักไปยังแอป RawBT แล้ว 🔓', 'success');
    } catch (e) {
      ui.showToast('เปิดลิ้นชักล้มเหลว: ' + e.message, 'error');
    }
    return;
  }

  if (isTestingKick.value) return;
  isTestingKick.value = true;
  try {
    if (isPrinterConnected()) {
      await kickDrawer();
      ui.showToast('ดีดเปิดลิ้นชักสำเร็จแล้ว 🔓', 'success');
    } else {
      throw new Error('ยังไม่ได้เชื่อมต่อเครื่องพิมพ์สาย USB');
    }
  } catch (e) {
    ui.showToast('เปิดลิ้นชักล้มเหลว: ' + e.message, 'error');
  } finally {
    isTestingKick.value = false;
  }
};

// Custom Dropdown logic for Settings.vue
const isRoleDropdownOpen = ref(false);
const isBranchDropdownOpen = ref(false);
const isSettingsBranchDropdownOpen = ref(false);
const isPrintModeDropdownOpen = ref(false);

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
  if (branchId !== null) {
    sessionStorage.setItem('selected_branch_id', String(branchId));
  }
  loadShopSettings();
};

const toggleSettingsBranchDropdown = () => {
  const current = isSettingsBranchDropdownOpen.value;
  closeSettingsDropdowns();
  isSettingsBranchDropdownOpen.value = !current;
};

const togglePrintModeDropdown = () => {
  const current = isPrintModeDropdownOpen.value;
  closeSettingsDropdowns();
  isPrintModeDropdownOpen.value = !current;
};

const selectPrintMode = (mode) => {
  printerConfig.value.printMode = mode;
  saveLocalPrinterConfig();
  isPrintModeDropdownOpen.value = false;
};

const closeSettingsDropdowns = () => {
  isRoleDropdownOpen.value = false;
  isBranchDropdownOpen.value = false;
  isSettingsBranchDropdownOpen.value = false;
  isBackupPeriodDropdownOpen.value = false;
  isBackupBranchDropdownOpen.value = false;
  isPrintModeDropdownOpen.value = false;
};

// States
const activeTab = ref('shop');
const currentUser = ref(null);
const selectedSettingsBranchId = ref(null);
const users = computed(() => store.users || []);
const userBranchFilter = ref('all');
const userRoleFilter = ref('all');
const visiblePinUserIds = ref({});
const toggleUserPin = (userId) => {
  visiblePinUserIds.value = {
    ...visiblePinUserIds.value,
    [userId]: !visiblePinUserIds.value[userId]
  };
};
const filteredUsers = computed(() => {
  return users.value.filter(u => {
    if (userBranchFilter.value !== 'all' && Number(u.branch_id) !== Number(userBranchFilter.value)) return false;
    if (userRoleFilter.value !== 'all' && u.role !== userRoleFilter.value) return false;
    return true;
  });
});
const shopSettingsLoading = ref(false);
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

const isSavingBranch = ref(false);
const isSavingShopSettings = ref(false);
const isSavingUser = ref(false);

const handleSaveBranch = async () => {
  if (isSavingBranch.value) return;
  isSavingBranch.value = true;
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
    isSavingBranch.value = false;
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
  shopSettingsLoading.value = !store.settingsLoaded || force;
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
    shopSettingsLoading.value = false;
  }
};

// Save Shop Settings to Database
const saveShopSettings = async () => {
  if (isSavingShopSettings.value) return;
  isSavingShopSettings.value = true;
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
    isSavingShopSettings.value = false;
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
  if (isSavingUser.value) return;
  isSavingUser.value = true;
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
    isSavingUser.value = false;
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
    await store.fetchSettingsData(selectedSettingsBranchId.value, true);
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

// Backup & Export States
const isBackupPeriodDropdownOpen = ref(false);
const isBackupBranchDropdownOpen = ref(false);
const backupPeriod = ref(3);
const backupPeriodOptions = [
  { value: 1, label: '1 เดือนที่ผ่านมา' },
  { value: 3, label: '3 เดือนที่ผ่านมา' },
  { value: 6, label: '6 เดือนที่ผ่านมา' },
  { value: 12, label: '1 ปีที่ผ่านมา' },
  { value: 'all', label: 'ข้อมูลทั้งหมด (All Time)' }
];
const backupBranchId = ref('all');

const showPurgeModal = ref(false);
const purgeConfirmInput = ref('');
const isPurging = ref(false);

const selectedBackupPeriodName = computed(() => {
  const opt = backupPeriodOptions.find(o => o.value === backupPeriod.value);
  return opt ? opt.label : 'เลือกช่วงเวลา...';
});

const selectedBackupBranchName = computed(() => {
  if (backupBranchId.value === 'all') return 'ทุกสาขา (รวมข้อมูลทุกสาขา)';
  const b = branches.value.find(x => x.id === backupBranchId.value);
  return b ? b.name : `สาขา #${backupBranchId.value}`;
});

const selectBackupPeriod = (val) => {
  backupPeriod.value = val;
  isBackupPeriodDropdownOpen.value = false;
};

const selectBackupBranch = (val) => {
  backupBranchId.value = val;
  isBackupBranchDropdownOpen.value = false;
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

const isSavingPreset = ref(false);

const handleSavePreset = async () => {
  if (isSavingPreset.value) return;
  isSavingPreset.value = true;
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
    isSavingPreset.value = false;
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

// Download 7-sheet Excel summary report (.xlsx)
const downloadExcelSummary = async () => {
  ui.showLoading();
  try {
    const user = sessionStorage.getItem('pos_user');
    const headers = {};
    if (user) {
      const parsed = JSON.parse(user);
      if (parsed.id) headers['x-user-id'] = String(parsed.id);
    }

    const query = new URLSearchParams({
      months: backupPeriod.value,
      branch_id: backupBranchId.value
    }).toString();

    const response = await fetch(`${window.location.origin}/api/settings/backup/csv-summary?${query}`, { headers });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'ดาวน์โหลดรายงาน Excel ล้มเหลว');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pos_summary_report_${backupPeriod.value}m_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    ui.showToast('ดาวน์โหลดรายงาน Excel (7 แถบย่อย) สำเร็จเรียบร้อย 🎉', 'success');
  } catch (error) {
    console.error(error);
    ui.showToast('ไม่สามารถดาวน์โหลด Excel ได้: ' + error.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

const openPurgeModal = () => {
  purgeConfirmInput.value = '';
  showPurgeModal.value = true;
};

const handleExecutePurgeCloud = async () => {
  if (purgeConfirmInput.value !== 'ยืนยันลบข้อมูล' && purgeConfirmInput.value !== 'CONFIRM') {
    ui.showToast('กรุณาพิมพ์คำยืนยันให้ถูกต้อง', 'error');
    return;
  }

  isPurging.value = true;
  ui.showLoading();
  try {
    // 1. Download Excel backup first automatically as a safety guarantee
    await downloadExcelSummary();

    // 2. Call backend purge endpoint
    const res = await api.settings.purgeCloudData(
      backupPeriod.value,
      backupBranchId.value,
      purgeConfirmInput.value
    );

    if (res.success) {
      showPurgeModal.value = false;
      purgeConfirmInput.value = '';
      ui.showToast(`ล้างข้อมูลเก่าบน Cloud สำเร็จ! เคลียร์ทั้งหมด ${res.data?.purged_count || 0} รายการ 🎉`, 'success');
    } else {
      throw new Error(res.error || 'เกิดข้อผิดพลาดในการล้างข้อมูล');
    }
  } catch (error) {
    console.error(error);
    ui.showToast('การล้างข้อมูลล้มเหลว: ' + error.message, 'error');
  } finally {
    isPurging.value = false;
    ui.hideLoading();
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
  .printer-status-value {
    display: block;
  }
  .diner-page-header {
    flex-direction: column;
    justify-content: center;
    text-align: center;
  }
  .diner-header-actions {
    width: 100%;
    justify-content: center;
  }
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
  .setting-item.setting-item-select {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: var(--space-sm) !important;
  }
  .setting-item.setting-item-select .custom-select-wrapper {
    width: 100% !important;
    min-width: 100% !important;
  }
}
.mobile-logout-section {
  display: none;
}

@media (max-width: 900px) {
  .mobile-logout-section {
    display: block;
    margin-top: var(--space-xl);
    margin-bottom: var(--space-2xl);
    padding: var(--space-md) var(--space-lg);
    background: #ffffff;
    border: 1.5px solid rgba(173, 40, 30, 0.2);
    border-radius: var(--radius-lg);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  }
  .mobile-logout-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    font-size: var(--font-sm);
    font-weight: var(--font-weight-bold);
    background: var(--danger, #ad281e);
    color: #ffffff;
    border-radius: var(--radius-md);
    border: none;
    cursor: pointer;
    transition: all var(--transition-base);
  }
  .mobile-logout-btn:active {
    transform: scale(0.96);
  }
}

/* --- Diner Retro Settings Cards & Tables --- */
.diner-page-header {
  background: #ffffff;
  border: 1.5px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
}
.diner-icon-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(139, 3, 19, 0.08);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}
.diner-header-title {
  font-size: var(--font-lg);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
}
.diner-header-title strong {
  color: var(--primary);
  font-size: 1.35rem;
}
.diner-header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}
.btn-filter-pill {
  padding: 5px 12px;
  font-size: var(--font-xs);
  border-radius: var(--radius-full);
  min-height: 30px;
}
.btn-filter-pill.active {
  background: var(--primary);
  color: #ffffff;
  border-color: var(--primary);
}
.btn-pin-toggle {
  background: rgba(139, 3, 19, 0.08);
  color: var(--primary);
  border: 1px solid rgba(139, 3, 19, 0.16);
  border-radius: var(--radius-md);
  min-width: 34px;
  height: 32px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.95rem;
}
.btn-pin-toggle:hover {
  background: rgba(139, 3, 19, 0.16);
}
.diner-item-card {
  background: #ffffff;
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  margin-bottom: var(--space-sm);
}
.diner-retro-card {
  background: #ffffff;
  border: 1.5px solid var(--border-color);
  border-left: 4px solid var(--primary);
  box-shadow: 0 2px 8px rgba(139, 3, 19, 0.04);
}
.diner-modules-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md);
}
.diner-module-card {
  background: #ffffff;
  border: 1.5px solid var(--border-color);
  transition: border-color var(--transition-base), box-shadow var(--transition-base);
}
.diner-module-card:hover {
  border-color: var(--primary-light);
  box-shadow: 0 4px 12px rgba(139, 3, 19, 0.06);
}
.diner-module-card.is-active {
  border: 2px solid var(--primary);
  background: rgba(139, 3, 19, 0.03);
}
.diner-icon-badge {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: rgba(139, 3, 19, 0.08);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}
.diner-icon-badge.is-solid {
  background: var(--primary);
  color: #ffffff;
}
.diner-count-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  background: rgba(139, 3, 19, 0.08);
  color: var(--primary);
  font-size: var(--font-xs);
  font-weight: var(--font-weight-bold);
  font-variant-numeric: tabular-nums;
}
.diner-table-card {
  border: 1.5px solid var(--border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}
.diner-table-head {
  border-bottom: 1.5px solid var(--border-color);
  background: rgba(139, 3, 19, 0.04);
}
.diner-avatar-sm {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(139, 3, 19, 0.1);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-sm);
  flex-shrink: 0;
}
</style>
