<template>
  <div id="menu-page" class="page-enter">

    <!-- Tab Selector -->
    <div class="category-tabs mb-lg" style="margin-bottom: var(--space-lg); display: flex; gap: var(--space-sm); border-bottom: 2px solid var(--border-color); padding-bottom: var(--space-sm); overflow-x: auto;">
      <button 
        class="category-tab" 
        :class="{ 'active': activeTab === 'menu_items' }"
        @click="setTab('menu_items')"
      >
        <i class="fa-solid fa-drumstick-bite" style="margin-right: 4px;"></i> สินค้าและเมนู
      </button>
      <button 
        class="category-tab" 
        :class="{ 'active': activeTab === 'modifiers' }"
        @click="setTab('modifiers')"
      >
        <i class="fa-solid fa-bottle-droplet" style="margin-right: 4px;"></i> ซอสและเครื่องปรุง
      </button>
    </div>

    <!-- Tab 1: Menu Items Management -->
    <div v-if="activeTab === 'menu_items'">
      <!-- Top Action Card -->
      <div class="card mb-lg menu-top-action-card">
        <div class="menu-total-count">
          เมนูทั้งหมด: <strong>{{ menuItems.length }}</strong> รายการ
        </div>
        <div class="menu-action-buttons">
          <button class="btn btn-secondary" @click="openCatModal"><i class="fa-solid fa-folder-open" style="margin-right: 4px;"></i> จัดการหมวดหมู่</button>
          <button class="btn btn-primary" @click="openAddModal"><i class="fa-solid fa-plus" style="margin-right: 4px;"></i> เพิ่มเมนูอาหาร</button>
        </div>
      </div>

      <!-- Desktop Menu List Table (Visible on desktop only) -->
      <div class="card p-0 overflow-hidden desktop-menu-table-container">
        <div style="overflow-x: auto;">
          <table class="table" style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); background: rgba(139, 3, 19, 0.03);">
                <th style="padding: var(--space-md);">รูป</th>
                <th style="padding: var(--space-md);">เมนูอาหาร</th>
                <th style="padding: var(--space-md); text-align: right;">ราคา</th>
                <th style="padding: var(--space-md); text-align: center;">ขาย</th>
                <th style="padding: var(--space-md); text-align: center;">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="5" style="text-align: center; padding: var(--space-3xl);">
                  <div class="spinner" style="margin: 0 auto;"></div>
                </td>
              </tr>
              <tr v-else-if="menuItems.length === 0">
                <td colspan="5" style="text-align: center; padding: var(--space-3xl); color: var(--text-tertiary);">
                  ยังไม่มีข้อมูลสินค้า กด "+ เพิ่มเมนู" ด้านบนเพื่อเริ่มสร้างสินค้าชิ้นแรก
                </td>
              </tr>
              <tr 
                v-else 
                v-for="item in menuItems" 
                :key="item.id" 
                style="border-bottom: 1px solid var(--border-color);"
                class="table-row-hover"
              >
                <!-- Image Preview -->
                <td style="padding: var(--space-md); vertical-align: middle;">
                  <div style="width: 48px; height: 36px; border-radius: var(--radius-sm); overflow: hidden; background: var(--bg-secondary); border:1px solid var(--border-color); display: flex; align-items: center; justify-content: center;">
                    <img v-if="item.image_url" :src="item.image_url" alt="เมนู" style="width: 100%; height: 100%; object-fit: cover;" />
                    <i v-else :class="getIconClass(item.category_id)" style="font-size: 1.2rem; color: var(--text-tertiary);"></i>
                  </div>
                </td>
                <!-- Name & Category -->
                <td style="padding: var(--space-md); vertical-align: middle;">
                  <div class="font-bold" style="font-size: var(--font-base);">{{ item.name }}</div>
                  <div style="font-size: var(--font-xs); color: var(--text-tertiary);">
                    {{ getCategoryName(item.category_id) }}
                  </div>
                </td>
                <!-- Price -->
                <td style="padding: var(--space-md); text-align: right; font-weight: bold; vertical-align: middle;">
                  {{ formatItemPrice(item) }} / {{ item.uom || 'ชิ้น' }}
                </td>
                <!-- Toggle Active Switch -->
                <td style="padding: var(--space-md); text-align: center; vertical-align: middle;">
                  <label class="toggle-switch" style="margin: 0 auto; display: block;" :class="{ 'disabled': !isAdminUser }">
                    <input 
                      type="checkbox" 
                      :checked="item.active !== 0 && item.active !== false"
                      :disabled="!isAdminUser"
                      @change="handleToggleActive(item)"
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </td>
                <!-- Actions -->
                <td style="padding: var(--space-md); text-align: center; vertical-align: middle;">
                  <div class="flex justify-center gap-sm">
                    <button class="btn-action btn-action-edit" title="แก้ไข" @click="openEditModal(item)"><i class="fa-solid fa-pen-to-square" style="margin-right: 4px;"></i> แก้ไข</button>
                    <button class="btn-action btn-action-delete" title="ลบ" @click="handleDeleteItem(item.id)"><i class="fa-solid fa-trash-can" style="margin-right: 4px;"></i> ลบ</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mobile Menu Card List (Visible on mobile only) -->
      <div class="mobile-menu-list-container">
        <div v-if="loading" class="text-center py-3xl">
          <div class="spinner" style="margin: 0 auto;"></div>
        </div>
        <div v-else-if="menuItems.length === 0" class="card text-center py-3xl" style="color: var(--text-tertiary);">
          ยังไม่มีข้อมูลสินค้า กด "+ เพิ่มเมนู" ด้านบนเพื่อเริ่มสร้างสินค้าชิ้นแรก
        </div>
        <div v-else class="mobile-menu-list">
          <div 
            v-for="item in menuItems" 
            :key="item.id" 
            class="mobile-menu-card"
            :class="{ 'inactive-item': item.active === 0 || item.active === false }"
          >
            <div class="mobile-menu-card-body">
              <!-- Left: Product Image / Emoji -->
              <div class="mobile-menu-card-img-container">
                <img v-if="item.image_url" :src="item.image_url" alt="เมนู" class="mobile-menu-card-img" />
                <div v-else class="mobile-menu-card-placeholder"><i :class="getIconClass(item.category_id)" style="font-size: 1.2rem; color: var(--text-tertiary);"></i></div>
              </div>
              
              <!-- Middle: Name & Category -->
              <div class="mobile-menu-card-details">
                <div class="mobile-menu-card-name">{{ item.name }}</div>
                <div class="mobile-menu-card-category">{{ getCategoryName(item.category_id) }}</div>
              </div>
              
              <!-- Right: Price & Active Switch -->
              <div class="mobile-menu-card-meta">
                <div class="mobile-menu-card-price">{{ formatItemPrice(item) }} / {{ item.uom || 'ชิ้น' }}</div>
                <div class="mobile-menu-card-status">
                  <label class="toggle-switch" :class="{ 'disabled': !isAdminUser }">
                    <input 
                      type="checkbox" 
                      :checked="item.active !== 0 && item.active !== false"
                      :disabled="!isAdminUser"
                      @change="handleToggleActive(item)"
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
            
            <!-- Bottom Action Buttons -->
            <div class="mobile-menu-card-actions">
              <button class="btn-action btn-action-edit" @click="openEditModal(item)"><i class="fa-solid fa-pen-to-square" style="margin-right: 4px;"></i> แก้ไข</button>
              <button class="btn-action btn-action-delete" @click="handleDeleteItem(item.id)"><i class="fa-solid fa-trash-can" style="margin-right: 4px;"></i> ลบ</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 2: Free Modifiers Management -->
    <div v-else-if="activeTab === 'modifiers'">
      <!-- Top Action Card -->
      <div class="card mb-lg menu-top-action-card">
        <div class="menu-total-count">
          เครื่องปรุงทั้งหมด: <strong>{{ modifierItems.length }}</strong> รายการ
        </div>
        <div class="menu-modifiers-info">
          <span>สิทธิ์แอดมินในการเปิด/ปิดเครื่องปรุง</span>
        </div>
      </div>

      <!-- Desktop Modifiers Table -->
      <div class="card p-0 overflow-hidden desktop-menu-table-container">
        <div style="overflow-x: auto;">
          <table class="table" style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); background: rgba(139, 3, 19, 0.03);">
                <th style="padding: var(--space-md); width: 45%;">ชื่อเครื่องปรุง/ซอส/ผง</th>
                <th style="padding: var(--space-md); text-align: center; width: 25%;">ประเภท</th>
                <th style="padding: var(--space-md); text-align: center; width: 30%;">เปิด/ปิดการใช้งาน</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="modifiersLoading">
                <td colspan="3" style="text-align: center; padding: var(--space-3xl);">
                  <div class="spinner" style="margin: 0 auto;"></div>
                </td>
              </tr>
              <tr v-else-if="modifierItems.length === 0">
                <td colspan="3" style="text-align: center; padding: var(--space-3xl); color: var(--text-tertiary);">
                  ไม่มีรายการเครื่องปรุงในระบบ
                </td>
              </tr>
              <tr 
                v-else 
                v-for="item in modifierItems" 
                :key="item.id" 
                style="border-bottom: 1px solid var(--border-color);"
                :class="{ 'table-row-hover': true, 'opacity-50': !item.active }"
              >
                <!-- Name -->
                <td style="padding: var(--space-md); vertical-align: middle;">
                  <div class="font-bold" style="font-size: var(--font-base);">{{ item.name }}</div>
                  <div style="font-size: var(--font-xs); color: var(--text-tertiary);">ID: {{ item.id }}</div>
                </td>
                <!-- Category -->
                <td style="padding: var(--space-md); text-align: center; vertical-align: middle;">
                  <span class="badge" :class="getModifierCategoryClass(item.category)">
                    {{ getModifierCategoryLabel(item.category) }}
                  </span>
                </td>
                <!-- Toggle switch -->
                <td style="padding: var(--space-md); text-align: center; vertical-align: middle;">
                  <label class="toggle-switch" style="margin: 0 auto; display: block;" :class="{ 'disabled': !isAdminUser }">
                    <input 
                      type="checkbox" 
                      :checked="item.active !== 0 && item.active !== false"
                      :disabled="!isAdminUser"
                      @change="handleToggleModifierActive(item)"
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mobile Modifiers List -->
      <div class="mobile-menu-list-container">
        <div v-if="modifiersLoading" class="text-center py-3xl">
          <div class="spinner" style="margin: 0 auto;"></div>
        </div>
        <div v-else-if="modifierItems.length === 0" class="card text-center py-3xl" style="color: var(--text-tertiary);">
          ไม่มีรายการเครื่องปรุงในระบบ
        </div>
        <div v-else class="mobile-menu-list">
          <div 
            v-for="item in modifierItems" 
            :key="item.id" 
            class="mobile-menu-card"
            :class="{ 'inactive-item': item.active === 0 || item.active === false }"
          >
            <div class="mobile-menu-card-body">
              <div class="mobile-menu-card-details">
                <div class="mobile-menu-card-name">{{ item.name }}</div>
                <div style="margin-top: 4px;">
                  <span class="badge" :class="getModifierCategoryClass(item.category)">
                    {{ getModifierCategoryLabel(item.category) }}
                  </span>
                </div>
              </div>
              <div class="mobile-menu-card-meta">
                <div class="mobile-menu-card-status">
                  <label class="toggle-switch" :class="{ 'disabled': !isAdminUser }">
                    <input 
                      type="checkbox" 
                      :checked="item.active !== 0 && item.active !== false"
                      :disabled="!isAdminUser"
                      @change="handleToggleModifierActive(item)"
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Modal -->
    <div v-if="showCatModal" class="modal-container active" style="display:flex; align-items:center; justify-content:center; position: fixed; inset:0; z-index:1000;">
      <div class="modal-overlay" @click="showCatModal = false"></div>
      <div class="modal-content modal-center w-full max-w-sm" style="position:relative; z-index:2;">
        <div class="modal-header">
          <h3><i class="fa-solid fa-folder-open" style="margin-right: 6px;"></i> จัดการหมวดหมู่สินค้า</h3>
          <button class="modal-close" @click="showCatModal = false">✕</button>
        </div>
        <div class="modal-body">
          <!-- Create Category Form -->
          <div class="form-group">
            <label class="form-label font-bold"><i class="fa-solid fa-plus" style="margin-right: 4px;"></i> เพิ่มหมวดหมู่ใหม่</label>
            <div class="flex gap-sm">
              <input 
                type="text" 
                class="form-input" 
                v-model="catForm.name" 
                placeholder="เช่น ของหวาน, ทานเล่น" 
                style="flex: 1;"
              />
              <button 
                class="btn btn-primary btn-sm" 
                :disabled="!catForm.name" 
                @click="handleCreateCat"
                style="padding: 0 var(--space-md);"
              >
                บันทึก
              </button>
            </div>
          </div>

          <!-- List of Existing Categories -->
          <div class="mt-xl">
            <label class="form-label font-bold" style="border-bottom: 1px solid var(--border-color); padding-bottom: var(--space-xs); margin-bottom: var(--space-md);">
              <i class="fa-solid fa-list-ul" style="margin-right: 4px;"></i> หมวดหมู่ปัจจุบัน ({{ categories.length }} รายการ)
            </label>
            
            <div style="max-height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: var(--space-xs);">
              <div 
                v-for="cat in categories" 
                :key="cat.id" 
                class="flex flex-between align-center p-sm" 
                style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: var(--space-sm) var(--space-md);"
              >
                <span class="font-semibold" style="font-size: var(--font-sm);"><i class="fa-solid fa-folder" style="margin-right: 4px; color: var(--text-tertiary);"></i> {{ cat.name }}</span>
                <button 
                  class="btn-action btn-action-delete" 
                  title="ลบหมวดหมู่"
                  @click="handleDeleteCat(cat.id)"
                  style="min-width: 75px; height: 38px; padding: 0 var(--space-md); font-size: var(--font-xs);"
                >
                  <i class="fa-solid fa-trash-can" style="margin-right: 4px;"></i> ลบ
                </button>
              </div>
              <div v-if="categories.length === 0" class="text-center text-muted py-md" style="font-size: var(--font-xs);">
                ไม่มีหมวดหมู่สินค้า
              </div>
            </div>
          </div>

          <div class="flex gap-md mt-xl">
            <button class="btn btn-secondary btn-block" @click="showCatModal = false">ปิดหน้าต่าง</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Menu Item Modal -->
    <div v-if="showItemModal" class="modal-container active" style="display:flex; align-items:center; justify-content:center; position: fixed; inset:0; z-index:1000;">
      <div class="modal-overlay" @click="showItemModal = false"></div>
      <div class="modal-content modal-center w-full max-w-md" style="position:relative; z-index:2; overflow-y:auto; max-height:85dvh;">
        <div class="modal-header">
          <h3>
            <i :class="isEditMode ? 'fa-solid fa-pen-to-square' : 'fa-solid fa-plus'" style="margin-right: 6px;"></i>
            {{ isEditMode ? 'แก้ไขเมนูอาหาร' : 'เพิ่มเมนูอาหาร' }}
          </h3>
          <button class="modal-close" @click="showItemModal = false">✕</button>
        </div>
        <div class="modal-body">
          <!-- Food Name -->
          <div class="form-group">
            <label class="form-label">ชื่อเมนูอาหาร *</label>
            <input 
              type="text" 
              class="form-input" 
              v-model="itemForm.name" 
              placeholder="เช่น ปีกไก่ทอด" 
            />
          </div>

          <!-- Multiple Prices Toggle -->
          <div class="form-group flex align-center gap-sm" style="display: flex; align-items: center; gap: 8px; margin-bottom: var(--space-md);">
            <label class="toggle-switch" style="margin: 0;">
              <input type="checkbox" v-model="itemForm.use_multiple_prices" />
              <span class="toggle-slider"></span>
            </label>
            <span class="font-semibold" style="font-size: var(--font-sm); margin-left: 6px;">ใช้งานหลายราคาตามขนาดไซส์ (S, M, L)</span>
          </div>

          <!-- Price (Single) -->
          <div v-if="!itemForm.use_multiple_prices" class="form-group">
            <label class="form-label">ราคาขาย (บาท) *</label>
            <input 
              type="number" 
              class="form-input" 
              v-model.number="itemForm.price" 
              placeholder="เช่น 20" 
              min="0"
            />
          </div>

          <!-- Prices (Multiple) -->
          <div v-else class="form-group card p-sm mb-md" style="background: var(--bg-secondary); border: 1px dashed var(--border-color); border-radius: var(--radius-md); padding: 12px; margin-bottom: 16px;">
            <label class="form-label font-bold mb-sm" style="margin-bottom: 8px; display: block;"><i class="fa-solid fa-tags" style="margin-right: 4px;"></i> กำหนดราคาตามไซส์ (บาท)</label>
            <div class="flex flex-column gap-sm" style="display: flex; flex-direction: column; gap: 8px;">
              <div class="flex align-center gap-sm" style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: var(--font-sm); min-width: 80px;">เล็ก (S):</span>
                <input 
                  type="number" 
                  class="form-input" 
                  v-model.number="itemForm.multiple_prices.S" 
                  placeholder="เช่น 40" 
                  style="flex: 1;"
                  min="0"
                />
              </div>
              <div class="flex align-center gap-sm" style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: var(--font-sm); min-width: 80px;">กลาง (M):</span>
                <input 
                  type="number" 
                  class="form-input" 
                  v-model.number="itemForm.multiple_prices.M" 
                  placeholder="เช่น 50" 
                  style="flex: 1;"
                  min="0"
                />
              </div>
              <div class="flex align-center gap-sm" style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: var(--font-sm); min-width: 80px;">ใหญ่ (L):</span>
                <input 
                  type="number" 
                  class="form-input" 
                  v-model.number="itemForm.multiple_prices.L" 
                  placeholder="เช่น 60" 
                  style="flex: 1;"
                  min="0"
                />
              </div>
            </div>
          </div>

          <!-- Category Selector -->
          <div class="form-group">
            <label class="form-label">หมวดหมู่สินค้า *</label>
            <div class="custom-select-wrapper" @click.stop>
              <div 
                class="custom-select-trigger" 
                :class="{ 'active': isCategoryDropdownOpen }" 
                @click="isCategoryDropdownOpen = !isCategoryDropdownOpen"
              >
                <span class="custom-select-text">
                  {{ selectedCategoryName }}
                </span>
              </div>
              <div v-if="isCategoryDropdownOpen" class="custom-select-dropdown">
                <div 
                  v-for="cat in categories" 
                  :key="cat.id" 
                  class="custom-select-option"
                  :class="{ 'selected': cat.id === itemForm.category_id }"
                  @click="selectCategory(cat.id)"
                >
                  {{ cat.name }}
                </div>
              </div>
            </div>
          </div>

          <!-- Unit of Measure Selector -->
          <div class="form-group">
            <label class="form-label font-bold">หน่วยนับ *</label>
            <div class="custom-select-wrapper" @click.stop>
              <div 
                class="custom-select-trigger" 
                :class="{ 'active': isUomDropdownOpen }" 
                @click="isUomDropdownOpen = !isUomDropdownOpen"
              >
                <span class="custom-select-text">
                  {{ itemForm.uom || 'ชิ้น' }}
                </span>
              </div>
              <div v-if="isUomDropdownOpen" class="custom-select-dropdown">
                <div 
                  v-for="u in ['ชิ้น', 'กรัม', 'ไม้', 'ถุง']" 
                  :key="u" 
                  class="custom-select-option"
                  :class="{ 'selected': u === itemForm.uom }"
                  @click="itemForm.uom = u; isUomDropdownOpen = false;"
                >
                  {{ u }}
                </div>
              </div>
            </div>
          </div>

          <!-- Raw Stock Tracking Toggle (Checkbox) -->
          <div class="form-group flex align-center gap-sm mt-md mb-md">
            <label class="toggle-switch">
              <input type="checkbox" v-model="itemForm.track_raw_stock" />
              <span class="toggle-slider"></span>
            </label>
            <span style="font-size: var(--font-sm); color: var(--text-primary); font-weight: var(--font-weight-medium);">
              มีของสด
            </span>
          </div>

          <!-- Image URL -->
          <div class="form-group">
            <label class="form-label font-bold">รูปภาพอาหาร</label>
            <div style="display: flex; gap: var(--space-sm); margin-bottom: var(--space-xs);">
              <input 
                type="text" 
                class="form-input flex-1" 
                v-model="itemForm.image_url" 
                placeholder="ใส่ URL รูปภาพ หรือวางรูปภาพ..." 
                @paste="handlePaste"
              />
              <button 
                type="button" 
                class="btn btn-secondary" 
                style="min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 0 15px;"
                @click="triggerFileInput"
              >
                <i class="fa-solid fa-image" style="margin-right: 4px;"></i> อัปโหลดภาพ
              </button>
            </div>
            <input 
              type="file" 
              ref="fileInputRef" 
              style="display: none;" 
              accept="image/*" 
              @change="handleFileChange"
            />
            <span style="font-size: var(--font-xs); color: var(--text-tertiary); display: block; margin-top: 2px; text-align: left;">
              <i class="fa-regular fa-lightbulb" style="color: var(--primary); margin-right: 4px;"></i> สามารถเลือกไฟล์, วางลิงก์รูปภาพ หรือคัดลอกรูปภาพแล้วกดวาง (Ctrl+V) ในช่องด้านบนได้
            </span>
          </div>

          <!-- Image Preview in Form -->
          <div v-if="itemForm.image_url" class="form-group flex justify-center">
            <div style="width: 100%; max-width: 200px; height: 130px; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; background: var(--bg-secondary);">
              <img :src="itemForm.image_url" alt="พรีวิว" style="width: 100%; height: 100%; object-fit: cover;" @error="handleImageError" />
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex gap-md mt-xl">
            <button class="btn btn-secondary flex-1" @click="showItemModal = false">ยกเลิก</button>
            <button 
              class="btn btn-primary flex-1" 
              :disabled="!itemForm.name || (!itemForm.price && !itemForm.use_multiple_prices) || !itemForm.category_id"
              @click="handleSaveItem"
            >
              <span style="display: inline-flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-floppy-disk"></i>
                {{ isEditMode ? 'บันทึกการแก้ไข' : 'บันทึกรายการใหม่' }}
              </span>
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
import { ui, formatCurrency, isAdmin } from '../helpers';

import { store } from '../store';

const activeTab = ref('menu_items'); // 'menu_items' or 'modifiers'
const isAdminUser = computed(() => isAdmin());

const modifierItems = ref([]);
const modifiersLoading = ref(false);

const setTab = (tab) => {
  activeTab.value = tab;
  if (tab === 'modifiers') {
    loadModifiers(true);
  } else {
    loadData(true);
  }
};

const loadModifiers = async (force = false) => {
  modifiersLoading.value = true;
  try {
    const res = await api.modifiers.getAll();
    if (res.success) {
      modifierItems.value = res.data || [];
    }
  } catch (error) {
    console.error('Failed to load modifiers:', error);
    ui.showToast('ไม่สามารถดึงข้อมูลรายการซอส/เครื่องปรุงได้', 'error');
  } finally {
    modifiersLoading.value = false;
  }
};

const handleToggleModifierActive = async (item) => {
  try {
    const res = await api.modifiers.toggle(item.id);
    if (res.success) {
      item.active = item.active === 1 ? 0 : 1;
      ui.showToast(`เปลี่ยนสถานะของ ${item.name} เรียบร้อย`, 'success');
    }
  } catch (error) {
    console.error(error);
    ui.showToast('เปลี่ยนสถานะเครื่องปรุงไม่สำเร็จ: ' + error.message, 'error');
  }
};

const getModifierCategoryLabel = (category) => {
  const map = {
    'sauce_small': 'ซอสซอง',
    'sauce_large': 'ซอสขวด/ถุงบีบ',
    'dipping': 'น้ำจิ้ม',
    'powder': 'ผงโรย'
  };
  return map[category] || category;
};

const getModifierCategoryIcon = (category) => {
  const map = {
    'sauce_small': 'fa-solid fa-bottle-droplet',
    'sauce_large': 'fa-solid fa-prescription-bottle',
    'dipping': 'fa-solid fa-bowl-food',
    'powder': 'fa-solid fa-sparkles'
  };
  return map[category] || 'fa-solid fa-tag';
};

const getModifierCategoryClass = (category) => {
  const map = {
    'sauce_small': 'badge-mod-sauce-small',
    'sauce_large': 'badge-mod-sauce-large',
    'dipping': 'badge-mod-dipping',
    'powder': 'badge-mod-powder'
  };
  return map[category] || 'badge-neutral';
};

// Custom Category Dropdown States/Helpers
const isCategoryDropdownOpen = ref(false);
const selectedCategoryName = computed(() => {
  const cat = categories.value.find(c => c.id === itemForm.value.category_id);
  return cat ? cat.name : 'เลือกหมวดหมู่...';
});
const selectCategory = (id) => {
  itemForm.value.category_id = id;
  isCategoryDropdownOpen.value = false;
};
const closeCategoryDropdown = () => {
  isCategoryDropdownOpen.value = false;
};

// Custom UoM Dropdown States/Helpers
const isUomDropdownOpen = ref(false);
const closeUomDropdown = () => {
  isUomDropdownOpen.value = false;
};

// States
const menuItems = computed(() => store.menuItems);
const categories = computed(() => store.categories);
const loading = ref(true);
const showCatModal = ref(false);
const showItemModal = ref(false);
const isEditMode = ref(false);
const editItemId = ref(null);

// Forms
const catForm = ref({ name: '' });
const itemForm = ref({
  name: '',
  price: '',
  category_id: '',
  image_url: '',
  uom: 'ชิ้น',
  use_multiple_prices: false,
  multiple_prices: { S: '', M: '', L: '' }
});

// Categories lookup helper
const getCategoryName = (catId) => {
  const cat = categories.value.find(c => c.id === catId);
  return cat ? cat.name : 'หมวดหมู่อื่นๆ';
};

const formatItemPrice = (item) => {
  if (item.multiple_prices) {
    try {
      const parsed = typeof item.multiple_prices === 'string' ? JSON.parse(item.multiple_prices) : item.multiple_prices;
      if (parsed && typeof parsed === 'object') {
        const prices = Object.values(parsed).filter(v => v !== null && v !== '');
        if (prices.length > 0) {
          return '฿' + prices.join('/');
        }
      }
    } catch (e) {
      console.warn(e);
    }
  }
  return formatCurrency(item.price);
};

// Fallback icon based on category name/id
const getIconClass = (catId) => {
  const cat = categories.value.find(c => c.id === catId);
  const catName = cat ? cat.name : '';

  if (catName.includes('สามกรอบ')) {
    return 'fa-solid fa-bacon';
  } else if (catName.includes('ไก่ทอด')) {
    return 'fa-solid fa-drumstick-bite';
  } else if (catName.includes('ของทานเล่น')) {
    return 'fa-solid fa-burger';
  } else if (catName.includes('ซาลาเปา') || catName.includes('ขนมจีบ')) {
    return 'fa-solid fa-bread-slice';
  }

  return 'fa-solid fa-drumstick-bite';
};

// Toggle item active state
const handleToggleActive = async (item) => {
  try {
    const res = await api.menu.toggle(item.id);
    if (res.success) {
      store.updateMenuItem(res.data || res);
      ui.showToast(`เปลี่ยนสถานะของ ${item.name} เรียบร้อย`, 'success');
    }
  } catch (error) {
    console.error(error);
    ui.showToast('เปลี่ยนสถานะเมนูอาหารไม่สำเร็จ: ' + error.message, 'error');
  }
};

// Delete menu item
const handleDeleteItem = async (id) => {
  const confirm = await ui.showConfirm('ลบเมนูอาหาร', 'คุณยืนยันต้องการลบเมนูอาหารนี้ใช่หรือไม่?\nการกระทำนี้ไม่สามารถย้อนกลับได้');
  if (confirm) {
    ui.showLoading();
    try {
      const res = await api.menu.delete(id);
      if (res.success) {
        store.deleteMenuItem(id);
        ui.showToast('ลบเมนูอาหารเรียบร้อยแล้ว', 'success');
      }
    } catch (e) {
      console.error(e);
      ui.showToast('ไม่สามารถลบเมนูอาหารได้: ' + e.message, 'error');
    } finally {
      ui.hideLoading();
    }
  }
};

// Modals Trigger
const openCatModal = () => {
  catForm.value.name = '';
  showCatModal.value = true;
};

const openAddModal = () => {
  isEditMode.value = false;
  editItemId.value = null;
  itemForm.value = {
    name: '',
    price: '',
    category_id: categories.value[0]?.id || '',
    image_url: '',
    track_raw_stock: false,
    uom: 'ชิ้น',
    use_multiple_prices: false,
    multiple_prices: { S: '', M: '', L: '' }
  };
  showItemModal.value = true;
};

const openEditModal = (item) => {
  isEditMode.value = true;
  editItemId.value = item.id;
  
  let useMult = false;
  let multPrices = { S: '', M: '', L: '' };
  if (item.multiple_prices) {
    try {
      const parsed = typeof item.multiple_prices === 'string' ? JSON.parse(item.multiple_prices) : item.multiple_prices;
      if (parsed && typeof parsed === 'object') {
        useMult = true;
        multPrices = {
          S: parsed.S !== undefined ? parsed.S : '',
          M: parsed.M !== undefined ? parsed.M : '',
          L: parsed.L !== undefined ? parsed.L : ''
        };
      }
    } catch (e) {
      console.warn(e);
    }
  }

  itemForm.value = {
    name: item.name,
    price: item.price,
    category_id: item.category_id,
    image_url: item.image_url || '',
    track_raw_stock: item.raw_stock !== null && item.raw_stock !== undefined,
    uom: item.uom || 'ชิ้น',
    use_multiple_prices: useMult,
    multiple_prices: multPrices
  };
  showItemModal.value = true;
};

const fileInputRef = ref(null);

const triggerFileInput = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
};

const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  if (file.size > 2 * 1024 * 1024) { // limit 2MB
    ui.showToast('ขนาดไฟล์รูปภาพห้ามเกิน 2MB', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    itemForm.value.image_url = event.target.result;
    ui.showToast('อัปโหลดและแปลงรูปภาพเรียบร้อย', 'success');
  };
  reader.readAsDataURL(file);
};

const handlePaste = (e) => {
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      const reader = new FileReader();
      reader.onload = (event) => {
        itemForm.value.image_url = event.target.result;
        ui.showToast('วางรูปภาพเรียบร้อยแล้ว', 'success');
      };
      reader.readAsDataURL(file);
      e.preventDefault();
      break;
    }
  }
};

// Create new Category
const handleCreateCat = async () => {
  ui.showLoading();
  try {
    const res = await api.menu.createCategory({ name: catForm.value.name });
    if (res.success) {
      store.addCategory(res.data || res);
      ui.showToast(`เพิ่มหมวดหมู่ ${catForm.value.name} สำเร็จ`, 'success');
      catForm.value.name = ''; // Clear input
    }
  } catch (e) {
    console.error(e);
    ui.showToast('เพิ่มหมวดหมู่ไม่สำเร็จ: ' + e.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

// Delete a Category
const handleDeleteCat = async (catId) => {
  const cat = categories.value.find(c => c.id === catId);
  const catName = cat ? cat.name : 'หมวดหมู่นี้';
  
  const confirm = await ui.showConfirm(
    'ลบหมวดหมู่สินค้า',
    `คุณยืนยันต้องการลบหมวดหมู่ "${catName}" ใช่หรือไม่?`
  );
  
  if (confirm) {
    ui.showLoading();
    try {
      const res = await api.menu.deleteCategory(catId);
      if (res.success) {
        store.deleteCategory(catId);
        ui.showToast('ลบหมวดหมู่เรียบร้อยแล้ว', 'success');
      }
    } catch (e) {
      console.error(e);
      ui.showToast('ไม่สามารถลบหมวดหมู่ได้: ' + e.message, 'error');
    } finally {
      ui.hideLoading();
    }
  }
};

// Save Menu Item (Add or Edit)
const handleSaveItem = async () => {
  ui.showLoading();
  try {
    let multiplePricesPayload = null;
    let basePrice = Number(itemForm.value.price) || 0;

    if (itemForm.value.use_multiple_prices) {
      const sVal = itemForm.value.multiple_prices.S;
      const mVal = itemForm.value.multiple_prices.M;
      const lVal = itemForm.value.multiple_prices.L;
      
      multiplePricesPayload = {
        S: sVal !== '' && sVal !== null && sVal !== undefined ? Number(sVal) : null,
        M: mVal !== '' && mVal !== null && mVal !== undefined ? Number(mVal) : null,
        L: lVal !== '' && lVal !== null && lVal !== undefined ? Number(lVal) : null
      };

      if (multiplePricesPayload.S !== null) {
        basePrice = multiplePricesPayload.S;
      }
    }

    const payload = {
      name: itemForm.value.name,
      price: basePrice,
      category_id: Number(itemForm.value.category_id),
      image_url: itemForm.value.image_url.trim() || null,
      track_raw_stock: !!itemForm.value.track_raw_stock,
      uom: itemForm.value.uom || 'ชิ้น',
      multiple_prices: multiplePricesPayload
    };

    let res;
    if (isEditMode.value) {
      res = await api.menu.update(editItemId.value, payload);
    } else {
      res = await api.menu.create(payload);
    }

    if (res.success) {
      if (isEditMode.value) {
        store.updateMenuItem(res.data || res);
      } else {
        store.addMenuItem(res.data || res);
      }
      ui.showToast(isEditMode.value ? 'แก้ไขเมนูสำเร็จ' : 'เพิ่มเมนูอาหารสำเร็จ', 'success');
      showItemModal.value = false;
    }
  } catch (e) {
    console.error(e);
    ui.showToast('บันทึกข้อมูลไม่สำเร็จ: ' + e.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

// Triggered when Image fails to load in preview
const handleImageError = () => {
  ui.showToast('ลิงก์รูปภาพที่ใส่อ่านไม่ได้ กรุณาตรวจสอบ URL', 'warning');
};

// Load initial data
const loadData = async (force = false) => {
  try {
    await store.fetchMenu(force);
  } catch (e) {
    console.error('Failed to load menu data:', e);
    ui.showToast('ไม่สามารถดึงข้อมูลเมนูอาหารได้', 'error');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
  window.addEventListener('click', closeCategoryDropdown);
  window.addEventListener('click', closeUomDropdown);
});

onUnmounted(() => {
  window.removeEventListener('click', closeCategoryDropdown);
  window.removeEventListener('click', closeUomDropdown);
});
</script>

<style scoped>
/* Custom responsive layout for top actions */
.menu-top-action-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.menu-total-count {
  font-size: 1.25rem;
  font-weight: bold;
  color: var(--text-secondary);
  margin-left: 0;
}
.menu-action-buttons {
  display: flex;
  gap: var(--space-sm);
}

/* Hide mobile menu list by default */
.mobile-menu-list-container {
  display: none;
}

/* Desktop layout rules */
.desktop-menu-table-container {
  display: block;
}

.table-row-hover:hover {
  background: rgba(139, 3, 19, 0.015) !important;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  /* Top Actions layout on mobile */
  .menu-top-action-card {
    flex-direction: column;
    gap: var(--space-md);
    align-items: stretch;
    text-align: center;
    padding: var(--space-md);
  }
  
  .menu-total-count {
    font-size: 1.1rem;
    font-weight: bold;
    margin-left: 0;
  }
  
  .menu-action-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-sm);
    width: 100%;
  }
  
  .menu-action-buttons button {
    width: 100%;
    justify-content: center;
  }

  /* Table Hide & Mobile List Show */
  .desktop-menu-table-container {
    display: none;
  }
  
  .mobile-menu-list-container {
    display: block;
    width: 100%;
  }
  
  .mobile-menu-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding-bottom: var(--space-2xl);
  }
  
  .mobile-menu-card {
    background: var(--card-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--space-md);
    box-shadow: 0 4px 12px rgba(139, 3, 19, 0.03);
    transition: all var(--transition-base);
    display: flex;
    flex-direction: column;
  }
  
  .mobile-menu-card.inactive-item {
    border-color: rgba(110, 78, 55, 0.1);
    box-shadow: none;
  }
  .mobile-menu-card.inactive-item .mobile-menu-card-body {
    opacity: 0.55;
  }

  .mobile-menu-card-body {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    width: 100%;
  }
  
  .mobile-menu-card-img-container {
    width: 64px;
    height: 64px;
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .mobile-menu-card-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .mobile-menu-card-placeholder {
    font-size: 1.6rem;
  }
  
  .mobile-menu-card-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  
  .mobile-menu-card-name {
    font-size: var(--font-md);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
    word-break: break-word;
    text-align: left;
  }
  
  .mobile-menu-card-category {
    font-size: var(--font-xs);
    color: var(--text-tertiary);
    text-align: left;
  }
  
  .mobile-menu-card-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-xs);
    flex-shrink: 0;
  }
  
  .mobile-menu-card-price {
    font-size: var(--font-md);
    font-weight: var(--font-weight-bold);
    color: var(--primary);
  }
  
  .mobile-menu-card-status {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }
  
  .mobile-menu-card-actions {
    display: flex;
    gap: var(--space-sm);
    margin-top: var(--space-md);
    padding-top: var(--space-sm);
    border-top: 1px dashed var(--border-color);
    width: 100%;
  }
  
  .mobile-menu-card-actions .btn-action {
    flex: 1;
    height: 44px;
    font-size: var(--font-sm);
    justify-content: center;
  }
}

/* --- Category Tabs (Rounded Buttons style matching user's request) --- */
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
  background: #ffffff !important;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  font-size: var(--font-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
  white-space: nowrap;
  transition: all var(--transition-base);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.category-tab:active {
  transform: scale(0.97);
}

.category-tab.active {
  background: var(--gradient-primary) !important;
  color: white !important;
  border-color: transparent !important;
  box-shadow: var(--shadow-glow-primary) !important;
}

/* Modifier Specific Badges (High Contrast, Distinct Colors) */
.badge-mod-sauce-small {
  background: rgba(42, 157, 143, 0.12) !important;
  color: #1a7167 !important;
}
.badge-mod-sauce-large {
  background: rgba(139, 3, 19, 0.12) !important;
  color: #8b0313 !important;
}
.badge-mod-dipping {
  background: rgba(214, 90, 49, 0.12) !important;
  color: #a23e1e !important;
}
.badge-mod-powder {
  background: rgba(138, 43, 226, 0.12) !important;
  color: #6f2dbd !important;
}

/* Centered Admin Permission Text style */
.menu-modifiers-info {
  font-size: var(--font-sm);
  color: var(--text-tertiary);
  text-align: right;
}
@media (max-width: 768px) {
  .menu-modifiers-info {
    text-align: center;
    width: 100%;
    margin-top: var(--space-xs);
  }
}
</style>
