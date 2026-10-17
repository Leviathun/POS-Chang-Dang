<template>
  <div class="central-kitchen-view page-enter">

    <!-- ────────────────────────────────────────────────────────── -->
    <!-- TAB 1: CATALOG (แคตตาล็อกสินค้า + เติมสต็อกด่วน) -->
    <!-- ────────────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'catalog'" class="catalog-section">
      <!-- Action & Filter Bar (Requirement 2 & 3) -->
      <div class="card mb-lg p-md toolbar-card">
        <!-- Top Row: Full Width Search Input (100%) -->
        <div class="search-input-box mb-md" style="position: relative; width: 100%;">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="ค้นหาชื่อสินค้า, วัตถุดิบ, ถุง, กระทะ, บรรจุภัณฑ์..." 
            class="form-input"
            style="padding-left: 42px; width: 100%; border-radius: var(--radius-md); font-size: var(--font-base);"
          />
        </div>

        <!-- Bottom Row: Filter Pills on left, View Toggle & Add Button on right -->
        <div class="flex flex-between align-center flex-wrap gap-md catalog-toolbar-bottom">
          <!-- Left: Category Pills -->
          <div class="category-tabs flex gap-xs align-center" style="border-bottom: none !important; margin-bottom: 0 !important; padding-bottom: 0 !important;">
            <button 
              v-for="cat in categories" 
              :key="cat.id" 
              class="category-tab"
              :class="{ 'active': selectedCategory === cat.id }"
              @click="selectedCategory = cat.id"
            >
              <i :class="cat.icon" style="margin-right: 4px;"></i> {{ cat.label }}
              <span v-if="getCategoryCount(cat.id) > 0" class="ml-xs font-normal opacity-90">
                ({{ getCategoryCount(cat.id) }})
              </span>
            </button>
          </div>

          <!-- Right: View Toggle & Add Button (Matched 48px height) -->
          <div class="flex align-center gap-md catalog-toolbar-actions">
            <div class="view-mode-toggle flex align-center">
              <button 
                class="view-toggle-btn" 
                :class="{ 'active': viewMode === 'grid' }"
                @click="viewMode = 'grid'"
                title="มุมมองการ์ดรูปภาพ"
              >
                <i class="fa-solid fa-grip"></i>
              </button>
              <button 
                class="view-toggle-btn" 
                :class="{ 'active': viewMode === 'table' }"
                @click="viewMode = 'table'"
                title="มุมมองตาราง"
              >
                <i class="fa-solid fa-table-list"></i>
              </button>
            </div>
            <button class="btn btn-primary btn-add-item" @click="openCreateItemModal">
              <i class="fa-solid fa-plus" style="margin-right: 6px;"></i> เพิ่มของใหม่ด้วยตนเอง
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State: Single Unified Skeleton system -->
      <div v-if="isLoadingItems" class="grid-cards">
        <div v-for="i in 8" :key="i" class="card item-card" style="pointer-events: none;">
          <!-- 1. Skeleton Top Badges -->
          <div class="flex flex-between align-center mb-sm">
            <div class="skeleton" style="height: 22px; width: 80px; border-radius: var(--radius-full);"></div>
            <div class="skeleton" style="height: 22px; width: 70px; border-radius: var(--radius-full);"></div>
          </div>
          <!-- 2. Skeleton Image (with margin) -->
          <div class="skeleton" style="height: 135px; width: 100%; border-radius: var(--radius-md); margin-bottom: var(--space-sm);"></div>
          <!-- 3. Skeleton Title (2 lines) -->
          <div class="skeleton mb-xs" style="height: 18px; width: 85%;"></div>
          <div class="skeleton mb-sm" style="height: 14px; width: 55%;"></div>
          <!-- 4. Skeleton Meta Box -->
          <div class="skeleton mb-xs" style="height: 14px; width: 70%;"></div>
          <div class="skeleton mb-sm" style="height: 14px; width: 60%;"></div>
          <!-- 5. Skeleton Buttons matching image width -->
          <div class="skeleton mb-xs" style="height: 42px; width: 100%; border-radius: var(--radius-md);"></div>
          <div class="flex gap-xs w-full">
            <div class="skeleton flex-1" style="height: 36px; border-radius: var(--radius-md);"></div>
            <div class="skeleton flex-1" style="height: 36px; border-radius: var(--radius-md);"></div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredItems.length === 0" class="empty-state-box">
        <div class="empty-state-icon">
          <i class="fa-solid fa-boxes-packing"></i>
        </div>
        <h3 class="empty-state-title">ยังไม่มีรายการของในครัวกลาง</h3>
        <p class="empty-state-desc">
          {{ searchQuery ? 'ไม่พบสินค้าที่ตรงกับคำค้นหา ลองเปลี่ยนคำค้นหรือเลือกหมวดหมู่อื่น' : 'เริ่มต้นลงทะเบียนวัตถุดิบ บรรจุภัณฑ์ หรืออุปกรณ์ เพื่อให้สาขาต่างๆ สามารถเบิกไปใช้งานได้' }}
        </p>
        <button v-if="!searchQuery" class="btn btn-primary mt-lg" @click="openCreateItemModal" style="height: 44px; display: inline-flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-plus"></i> เพิ่มของชิ้นแรกเข้าคลัง
        </button>
      </div>

      <!-- View 1: Grid Cards View -->
      <div v-else-if="viewMode === 'grid'" class="grid-cards">
        <div 
          v-for="item in filteredItems" 
          :key="item.id" 
          class="card item-card"
          :class="{ 'low-stock': item.quantity <= item.min_stock_alert }"
        >
          <!-- 1. TOP: ประเภท กับ พร้อมจ่าย (ใช้เฉพาะไอคอนประหยัดพื้นที่ ไม่เบียด) -->
          <div class="card-top-badges flex flex-between align-center">
            <span class="badge badge-neutral card-badge-category">
              <i :class="getCategoryIcon(item.category)" class="mr-1"></i>
              {{ getCategoryLabel(item.category) }}
            </span>
            <span v-if="item.quantity <= 0" class="badge badge-danger card-badge-status" title="ของหมดสต็อก">
              <i class="fa-solid fa-xmark"></i>
            </span>
            <span v-else-if="item.quantity <= item.min_stock_alert" class="badge badge-warning card-badge-status" title="ใกล้หมด">
              <i class="fa-solid fa-triangle-exclamation"></i>
            </span>
            <span v-else class="badge badge-success card-badge-status" title="พร้อมจ่าย">
              <i class="fa-solid fa-check"></i>
            </span>
          </div>

          <!-- 2. รูปภาพสินค้า (มี Margin ชัดเจน ไม่ชิดกับองค์ประกอบอื่น) -->
          <div class="item-img-container">
            <img 
              v-if="item.image_url" 
              :src="item.image_url" 
              :alt="item.name" 
              class="item-img"
            />
            <div v-else class="item-img-placeholder">
              <i :class="getCategoryIcon(item.category)"></i>
            </div>
          </div>

          <!-- 3. ชื่อสินค้า (2 บรรทัด โดยบรรทัดล่างเป็นวงเล็บ) -->
          <h4 class="item-name font-bold" :title="item.name">
            <div class="item-name-main">{{ getItemNameParts(item.name).main }}</div>
            <div class="item-name-sub" v-if="getItemNameParts(item.name).sub">
              {{ getItemNameParts(item.name).sub }}
            </div>
          </h4>
          
          <!-- 4. ข้อมูลต้นทุนและสต็อก (คำว่า ราคาเบิก / คงเหลือ กระชับ) -->
          <div class="item-meta-box">
            <div class="item-meta-row flex flex-between align-center text-xs py-1">
              <span class="item-meta-label text-secondary font-medium">ราคาเบิก:</span>
              <span class="font-bold text-primary item-cost-val" style="font-size: 1rem;">
                ฿{{ formatNumber(item.cost_price) }} <span class="text-xs text-secondary font-normal item-unit-slash">/ {{ item.unit }}</span>
              </span>
            </div>
            
            <div class="item-meta-row flex flex-between align-center text-xs py-1">
              <span class="item-meta-label text-secondary font-medium flex align-center gap-xs">
                <i class="fa-solid fa-cubes-stacked text-tertiary"></i>
                <span>คงเหลือ:</span>
              </span>
              <span 
                class="font-bold item-stock-val" 
                :class="{
                  'text-danger': item.quantity <= 0,
                  'text-warning': item.quantity > 0 && item.quantity <= item.min_stock_alert,
                  'text-success': item.quantity > item.min_stock_alert
                }"
                style="font-size: 1rem;"
              >
                {{ formatNumber(item.quantity) }} {{ item.unit }}
              </span>
            </div>

            <div v-if="item.pack_size > 1" class="item-meta-row flex flex-between align-center text-xs py-1">
              <span class="item-meta-label text-secondary font-medium flex align-center gap-xs">
                <i class="fa-solid fa-arrows-rotate text-primary"></i>
                <span>แปลงหน่วย:</span>
              </span>
              <span class="font-bold text-primary" style="font-size: 0.85rem;">
                1 {{ item.unit }} = {{ item.pack_size }} ชิ้น
              </span>
            </div>
          </div>

          <!-- 5. ปุ่มแอ็กชัน (อ้างอิงความกว้างเต็มเท่ารูปภาพ ซ้าย-ขวาเต็ม ไม่โดนบีบ) -->
          <div class="card-footer-actions">
            <!-- ปุ่มเติมสต็อกด่วน เต็มความกว้างซ้าย-ขวา -->
            <button class="btn-action btn-action-primary w-full btn-restock-main" @click="openQuickRestockModal(item)">
              <i class="fa-solid fa-plus-circle"></i> เติมสต็อกด่วน
            </button>
            
            <!-- ปุ่มแก้ไข, ของเสีย, และลบสินค้า ขยายซ้าย-ขวาเต็ม -->
            <div class="card-sub-actions flex gap-xs w-full">
              <button class="btn-action btn-action-edit flex-1 btn-card-sub" @click="openEditItemModal(item)" title="แก้ไขข้อมูลสินค้า">
                <i class="fa-solid fa-pen"></i> แก้ไข
              </button>
              <button class="btn-action btn-action-waste flex-1 btn-card-sub" @click="openWasteModal(item)" title="ตัดของเสีย/หมดอายุ">
                <i class="fa-solid fa-dumpster"></i> ของเสีย
              </button>
              <button class="btn-action btn-card-sub text-danger" style="flex: 0 0 36px; padding: 0;" @click="confirmDeleteItem(item)" title="ลบสินค้าออกจากแคตตาล็อก">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- View 2: Desktop Table View -->
      <div v-else class="card p-0 overflow-hidden desktop-stock-table-container">
        <div style="overflow-x: auto;">
          <table class="table w-full" style="border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); background: rgba(139, 3, 19, 0.03);">
                <th class="text-center" style="padding: var(--space-md); width: 80px;">รูป</th>
                <th class="text-left" style="padding: var(--space-md);">ชื่อสินค้า / วัตถุดิบ</th>
                <th class="text-center" style="padding: var(--space-md); width: 150px;">หมวดหมู่</th>
                <th class="text-right" style="padding: var(--space-md); width: 140px;">ราคาทุนต่อหน่วย</th>
                <th class="text-center" style="padding: var(--space-md); width: 150px;">สต็อกในครัวกลาง</th>
                <th class="text-center" style="padding: var(--space-md); width: 130px;">สถานะ</th>
                <th class="text-center" style="padding: var(--space-md); width: 180px;">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="item in filteredItems" 
                :key="item.id"
                style="border-bottom: 1px solid var(--border-color);"
                class="table-row-hover"
              >
                <!-- Thumbnail -->
                <td class="text-center" style="padding: var(--space-sm); vertical-align: middle;">
                  <div style="width: 50px; height: 42px; margin: 0 auto; border-radius: var(--radius-sm); overflow: hidden; background: var(--bg-secondary); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center;">
                    <img v-if="item.image_url" :src="item.image_url" alt="" style="width: 100%; height: 100%; object-fit: cover;" />
                    <i v-else :class="getCategoryIcon(item.category)" style="color: var(--text-tertiary); font-size: 1.2rem;"></i>
                  </div>
                </td>
                <!-- Name -->
                <td style="padding: var(--space-md); vertical-align: middle;">
                  <div class="font-bold text-base">{{ item.name }}</div>
                  <div class="text-xs text-secondary">
                    หน่วยนับ: {{ item.unit }}
                    <span v-if="item.pack_size > 1" class="text-primary font-bold ml-1">(1 {{ item.unit }} = {{ item.pack_size }} ชิ้น)</span>
                  </div>
                </td>
                <!-- Category -->
                <td class="text-center" style="padding: var(--space-md); vertical-align: middle;">
                  <span class="text-secondary text-sm flex justify-center align-center gap-xs">
                    <i :class="getCategoryIcon(item.category)" class="text-muted"></i>
                    <span>{{ getCategoryLabel(item.category) }}</span>
                  </span>
                </td>
                <!-- Cost -->
                <td class="text-right" style="padding: var(--space-md); vertical-align: middle; font-weight: bold; color: var(--primary);">
                  ฿{{ formatNumber(item.cost_price) }} / {{ item.unit }}
                </td>
                <!-- Quantity -->
                <td class="text-center" style="padding: var(--space-md); vertical-align: middle; font-weight: bold; font-size: 1.05rem;">
                  {{ formatNumber(item.quantity) }} {{ item.unit }}
                </td>
                <!-- Status -->
                <td class="text-center" style="padding: var(--space-md); vertical-align: middle;">
                  <span v-if="item.quantity <= 0" class="text-danger font-medium text-sm flex justify-center align-center gap-xs">
                    <i class="fa-solid fa-circle-xmark"></i> หมดสต็อก
                  </span>
                  <span v-else-if="item.quantity <= item.min_stock_alert" class="text-warning font-medium text-sm flex justify-center align-center gap-xs">
                    <i class="fa-solid fa-triangle-exclamation"></i> ใกล้หมด
                  </span>
                  <span v-else class="text-success font-medium text-sm flex justify-center align-center gap-xs">
                    <i class="fa-solid fa-circle-check"></i> พร้อมจ่าย
                  </span>
                </td>
                <!-- Actions -->
                <td class="text-center" style="padding: var(--space-md); vertical-align: middle;">
                  <div class="flex justify-center gap-xs align-center">
                    <button class="btn-action btn-action-primary table-btn-action" @click="openQuickRestockModal(item)" title="เติมสต็อกด่วน">
                      <i class="fa-solid fa-plus"></i> เติมด่วน
                    </button>
                    <button class="btn-action btn-action-edit table-btn-action table-btn-icon" @click="openEditItemModal(item)" title="แก้ไข">
                      <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-action btn-action-waste table-btn-action table-btn-icon" @click="openWasteModal(item)" title="ตัดของเสีย/หมดอายุ">
                      <i class="fa-solid fa-dumpster"></i>
                    </button>
                    <button class="btn-action table-btn-action table-btn-icon text-danger" @click="confirmDeleteItem(item)" title="ลบสินค้าออกจากแคตตาล็อก">
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ────────────────────────────────────────────────────────── -->
    <!-- TAB 1.5: DISPATCH (จ่ายของให้สาขา - Push Model) -->
    <!-- ────────────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'dispatch'" class="dispatch-section">
      <!-- Top Action Toolbar Card -->
      <div class="card mb-lg p-md flex flex-between align-center toolbar-card dispatch-toolbar-card" style="gap: var(--space-md); flex-wrap: wrap;">
        <div>
          <h3 class="font-bold text-base mb-xs flex align-center gap-xs">
            <i class="fa-solid fa-truck-arrow-right text-primary"></i>
            <span>ระบบจ่ายของให้สาขา (Push Model)</span>
          </h3>
          <p class="text-secondary text-xs">
            ครัวกลางจัดส่งของให้สาขาโดยตรง เมื่อกดยืนยันจะตัดสต็อกครัวกลาง บันทึกเป็นรายจ่ายสาขา และเติมสต็อก POS ให้อัตโนมัติ
          </p>
        </div>

        <!-- Target Branch Selector (Prominent in Toolbar) -->
        <div class="dispatch-target-branch-bar flex align-center gap-sm">
          <label class="font-bold text-sm text-secondary flex align-center gap-xs" style="white-space: nowrap;">
            <i class="fa-solid fa-store text-primary"></i>
            <span>สาขาปลายทาง</span>
          </label>
          <div class="custom-select-wrapper dispatch-branch-select-wrapper" @click.stop>
            <div 
              class="custom-select-trigger dispatch-branch-select" 
              :class="{ 'active': isDispatchBranchDropdownOpen }" 
              @click="isDispatchBranchDropdownOpen = !isDispatchBranchDropdownOpen"
            >
              <span class="custom-select-text font-bold text-sm text-primary flex align-center gap-xs">
                <i class="fa-solid fa-store text-primary mr-1"></i>
                <span>{{ selectedDispatchBranchName || 'เลือกสาขา' }}</span>
              </span>
            </div>
            <div v-if="isDispatchBranchDropdownOpen" class="custom-select-dropdown">
              <div 
                v-for="b in retailBranches" 
                :key="b.id" 
                class="custom-select-option"
                :class="{ 'selected': Number(dispatchBranchId) === Number(b.id) }"
                @click="dispatchBranchId = b.id; isDispatchBranchDropdownOpen = false;"
              >
                <div class="flex align-center gap-xs font-bold text-sm">
                  <i class="fa-solid fa-store mr-1 text-primary"></i>
                  <span>{{ b.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Layout: Left Catalog (70%) + Right Cart (30%) -->
      <div class="catalog-layout">
        <!-- Left: Items Catalog -->
        <div class="catalog-main">
          <!-- Search & Category Filters -->
          <div class="card p-md mb-md toolbar-card filter-bar">
            <!-- Full Width Search -->
            <div class="search-input-box mb-md" style="position: relative; width: 100%;">
              <i class="fa-solid fa-magnifying-glass search-icon"></i>
              <input 
                type="text" 
                v-model="dispatchSearchQuery" 
                placeholder="ค้นหาชื่อสินค้า, วัตถุดิบ, ซอส, บรรจุภัณฑ์..." 
                class="form-input search-input"
                style="padding-left: 42px; width: 100%; border-radius: var(--radius-md); font-size: var(--font-base);"
              />
              <button 
                v-if="dispatchSearchQuery" 
                class="search-clear-btn" 
                @click="dispatchSearchQuery = ''"
                title="ล้างคำค้นหา"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>

            <!-- Category Pills -->
            <div class="category-tabs flex gap-xs align-center" style="border-bottom: none !important; margin-bottom: 0 !important; padding-bottom: 0 !important;">
              <button 
                v-for="cat in categories" 
                :key="cat.id" 
                class="category-tab"
                :class="{ active: dispatchCategory === cat.id }"
                @click="dispatchCategory = cat.id"
              >
                <i :class="cat.icon" style="margin-right: 4px;"></i>
                <span>{{ cat.label }}</span>
                <span v-if="getDispatchCategoryCount(cat.id) > 0" class="category-count">
                  ({{ getDispatchCategoryCount(cat.id) }})
                </span>
              </button>
            </div>
          </div>

          <!-- Loading state -->
          <div v-if="isLoadingItems" class="grid-cards">
            <div v-for="i in 6" :key="i" class="card item-card p-md" style="pointer-events: none;">
              <div class="skeleton mb-md" style="height: 135px; width: 100%; border-radius: var(--radius-md);"></div>
              <div class="skeleton mb-xs" style="width: 85%; height: 18px;"></div>
              <div class="skeleton mb-sm" style="width: 50%; height: 14px;"></div>
              <div class="skeleton" style="width: 100%; height: 42px; border-radius: var(--radius-md);"></div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-else-if="filteredDispatchItems.length === 0" class="empty-state-box">
            <div class="empty-state-icon">
              <i class="fa-solid fa-box-open"></i>
            </div>
            <div class="empty-state-title">ไม่พบรายการสินค้า</div>
            <div class="empty-state-desc">ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น</div>
          </div>

          <!-- Items Grid -->
          <div v-else class="grid-cards">
            <div 
              v-for="item in filteredDispatchItems" 
              :key="item.id" 
              class="card p-md item-card"
              :class="{ 
                'low-stock': item.quantity <= (item.min_stock_alert || 5),
                'item-out-of-stock': item.quantity <= 0,
                'in-cart': getDispatchCartQty(item.id) > 0
              }"
              @click="addDispatchItem(item)"
            >
              <!-- Quantity Badge if in cart (Desktop & Mobile) -->
              <span v-if="getDispatchCartQty(item.id) > 0" class="qty-badge">
                {{ getDispatchCartQty(item.id) }}
              </span>

              <!-- Top badges -->
              <div class="card-top-badges flex flex-between align-center">
                <span class="badge badge-neutral card-badge-category">
                  <i :class="getCategoryIcon(item.category)" class="mr-1"></i>
                  {{ getCategoryLabel(item.category) }}
                </span>
                <span v-if="item.quantity <= 0" class="badge badge-danger card-badge-status" title="หมดสต็อก">
                  <i class="fa-solid fa-xmark"></i>
                </span>
                <span v-else-if="item.quantity <= (item.min_stock_alert || 5)" class="badge badge-warning card-badge-status" title="ใกล้หมด">
                  <i class="fa-solid fa-triangle-exclamation"></i>
                </span>
                <span v-else class="badge badge-success card-badge-status" title="พร้อมจ่าย">
                  <i class="fa-solid fa-check"></i>
                </span>
              </div>

              <!-- Item Image -->
              <div class="item-img-container">
                <img 
                  v-if="item.image_url" 
                  :src="item.image_url" 
                  :alt="item.name" 
                  class="item-img"
                  loading="lazy"
                />
                <div v-else class="item-img-placeholder">
                  <i :class="getCategoryIcon(item.category)"></i>
                </div>
              </div>

              <!-- Item Name -->
              <h4 class="item-name font-bold" :title="item.name">
                <div class="item-name-main">{{ getItemNameParts(item.name).main }}</div>
                <div class="item-name-sub" v-if="getItemNameParts(item.name).sub">
                  {{ getItemNameParts(item.name).sub }}
                </div>
              </h4>

              <!-- Meta -->
              <div class="item-meta-box">
                <div class="item-meta-row flex flex-between align-center text-xs py-1">
                  <span class="item-meta-label text-secondary font-medium">ราคาเบิก:</span>
                  <span class="font-bold text-primary item-cost-val" style="font-size: 1rem;">
                    ฿{{ formatNumber(item.cost_price) }} <span class="text-xs text-secondary font-normal item-unit-slash">/ {{ item.unit }}</span>
                  </span>
                </div>
                
                <div class="item-meta-row flex flex-between align-center text-xs py-1">
                  <span class="item-meta-label text-secondary font-medium flex align-center gap-xs">
                    <i class="fa-solid fa-cubes-stacked text-tertiary"></i>
                    <span>ในครัวกลาง:</span>
                  </span>
                  <span 
                    class="font-bold item-stock-val" 
                    :class="{
                      'text-danger': item.quantity <= 0,
                      'text-warning': item.quantity > 0 && item.quantity <= (item.min_stock_alert || 5),
                      'text-success': item.quantity > (item.min_stock_alert || 5)
                    }"
                    style="font-size: 1rem;"
                  >
                    <span class="stock-prefix">เหลือ </span>{{ formatNumber(item.quantity) }} {{ item.unit }}
                  </span>
                </div>
              </div>

              <!-- Action Button -->
              <div class="card-footer-actions">
                <button 
                  class="btn-action btn-action-primary w-full btn-restock-main" 
                  :disabled="item.quantity <= 0"
                  @click.stop="addDispatchItem(item)"
                >
                  <i class="fa-solid fa-plus-circle"></i>
                  <span>{{ item.quantity > 0 ? 'เพิ่มลงรายการจ่าย' : 'ของหมดสต็อก' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Dispatch Cart Panel -->
        <div class="card p-md cart-sidebar flex flex-col justify-between">
          <div>
            <!-- Header -->
            <div class="flex flex-between align-center mb-md pb-sm cart-header">
              <h4 class="font-bold text-base flex align-center gap-xs">
                <i class="fa-solid fa-truck-arrow-right text-primary"></i>
                <span>รายการของที่จะจ่าย</span>
                <span v-if="dispatchCart.length > 0" class="badge badge-primary font-bold">{{ dispatchCart.length }}</span>
              </h4>
              <button 
                v-if="dispatchCart.length > 0" 
                class="text-xs text-danger font-bold cursor-pointer clear-cart-btn flex align-center gap-xs"
                @click="clearDispatchCart"
              >
                <i class="fa-solid fa-trash-can"></i>
                <span>ล้างทั้งหมด</span>
              </button>
            </div>

            <!-- Target Branch Badge Card -->
            <div class="dispatch-branch-info-card flex align-center gap-md" style="background: var(--bg-secondary); padding: 12px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: var(--space-md);">
              <div style="width: 36px; height: 36px; border-radius: var(--radius-sm); background: var(--card-bg); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid var(--border-color-light); box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                <i class="fa-solid fa-building-circle-arrow-right text-primary" style="font-size: 1.15rem;"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-xs text-secondary font-medium" style="margin-bottom: 2px;">สาขาที่จะตัดยอดเข้า:</div>
                <div class="font-bold text-sm text-primary truncate" style="font-size: 0.95rem;">
                  {{ selectedDispatchBranchName || 'ยังไม่ได้เลือกสาขา' }}
                </div>
              </div>
            </div>

            <!-- Empty Cart -->
            <div v-if="dispatchCart.length === 0" class="empty-state-box empty-state-compact">
              <div class="empty-state-icon empty-state-icon-sm">
                <i class="fa-solid fa-basket-shopping"></i>
              </div>
              <div class="empty-state-title text-sm">ยังไม่มีสินค้าในรายการจ่าย</div>
              <div class="empty-state-desc text-xs">คลิกการ์ดสินค้าทางซ้ายเพื่อเพิ่มรายการที่จะส่งให้สาขา</div>
            </div>

            <!-- Cart Items List -->
            <div v-else class="cart-items-list flex flex-col gap-sm" style="max-height: 380px; overflow-y: auto;">
              <div 
                v-for="c in dispatchCart" 
                :key="c.item_id" 
                class="cart-row p-sm flex flex-col justify-between"
              >
                <!-- Row 1: Name + Subtotal -->
                <div class="flex flex-between align-start gap-xs mb-xs">
                  <div class="flex-1 min-w-0 pr-xs">
                    <div class="cart-item-name font-bold text-sm text-primary">
                      {{ getItemNameParts(c.item_name).main }}
                    </div>
                    <div v-if="getItemNameParts(c.item_name).sub" class="cart-item-sub text-xs text-secondary mt-1">
                      {{ getItemNameParts(c.item_name).sub }}
                    </div>
                    <div v-if="c.pack_size > 1" class="text-2xs text-primary font-bold mt-1">
                      <i class="fa-solid fa-arrows-rotate mr-1"></i> เติมสต็อก {{ c.quantity * c.pack_size }} ชิ้น
                    </div>
                  </div>
                  <div class="text-right flex-shrink-0 pl-xs">
                    <span class="font-bold text-sm text-primary">฿{{ formatNumber(c.quantity * c.cost_price) }}</span>
                  </div>
                </div>

                <!-- Row 2: Price + Stepper + Delete -->
                <div class="flex flex-between align-center pt-xs cart-item-bottom">
                  <span class="text-xs text-secondary">
                    ฿{{ formatNumber(c.cost_price) }} / {{ c.unit }}
                  </span>

                  <div class="flex align-center gap-xs flex-shrink-0">
                    <button class="btn-qty" @click="decreaseDispatchQty(c)">-</button>
                    <input 
                      type="number" 
                      v-model.number="c.quantity" 
                      min="1" 
                      :max="c.max_quantity" 
                      class="form-input text-center text-sm font-bold" 
                      style="width: 50px; height: 32px; padding: 2px;"
                      @change="validateDispatchQty(c)"
                    />
                    <button class="btn-qty" :disabled="c.quantity >= c.max_quantity" @click="increaseDispatchQty(c)">+</button>
                    <button class="btn btn-ghost btn-xs text-danger ml-xs" @click="removeDispatchItem(c.item_id)">✕</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer: Notes + Total + Submit -->
          <div class="cart-footer pt-md mt-md">
            <div class="form-group mb-md">
              <label class="form-label text-xs font-bold text-secondary mb-xs block">
                <i class="fa-solid fa-pen-to-square mr-1"></i> บันทึกช่วยจำ / รอบส่ง (ถ้ามี):
              </label>
              <input 
                type="text" 
                v-model="dispatchNotes" 
                placeholder="เช่น รอบส่งเช้า 08:30 น., ส่งของด่วน" 
                class="form-input text-sm w-full"
              />
            </div>

            <!-- Total Cost -->
            <div class="cart-total-row flex flex-between align-baseline mb-md pt-sm">
              <span class="text-sm font-bold text-secondary">มูลค่าต้นทุนรวม:</span>
              <span class="text-2xl font-bold text-primary">฿{{ formatNumber(totalDispatchCost) }}</span>
            </div>

            <!-- Submit Button (48px) -->
            <button 
              class="btn btn-primary btn-submit-requisition w-full"
              :disabled="dispatchCart.length === 0 || !dispatchBranchId || isSubmittingDispatch"
              @click="submitPushDispatch"
            >
              <i v-if="isSubmittingDispatch" class="fa-solid fa-spinner fa-spin mr-2"></i>
              <i v-else class="fa-solid fa-truck-arrow-right mr-2"></i>
              <span>{{ isSubmittingDispatch ? 'กำลังบันทึกจ่ายของ...' : 'ยืนยันจ่ายของให้สาขา (ตัดสต็อกทันที)' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile-only Bottom Docked Cart Bar (Exact POS Floating Cart Bar) -->
      <div 
        v-if="dispatchCart.length > 0 && !isDispatchMobileDrawerOpen" 
        class="cart-bar mobile-only-cart"
      >
        <div class="cart-bar-inner">
          <div class="cart-info" style="cursor: pointer;" @click="isDispatchMobileDrawerOpen = true">
            <span class="cart-count">{{ totalDispatchQty }} รายการ</span>
            <span class="cart-total">฿{{ formatNumber(totalDispatchCost) }}</span>
          </div>
          <button 
            class="cart-pay-btn flex align-center justify-center gap-xs" 
            @click="isDispatchMobileDrawerOpen = true"
          >
            <i class="fa-solid fa-cart-shopping"></i>
            <span>ดูรายการจ่าย</span>
          </button>
        </div>
      </div>

      <!-- Mobile-only Slide-up Cart Drawer Overlay & Panel (Bottom Sheet) -->
      <div 
        v-if="dispatchCart.length > 0 && isDispatchMobileDrawerOpen" 
        class="cart-drawer-overlay mobile-only-cart"
        @click="isDispatchMobileDrawerOpen = false"
      ></div>

      <div 
        v-if="dispatchCart.length > 0" 
        class="cart-detail-panel mobile-only-cart"
        :class="{ 'hidden': !isDispatchMobileDrawerOpen }"
      >
        <!-- Drawer Header -->
        <div class="cart-detail-header">
          <span class="font-bold text-base flex align-center gap-xs">
            <i class="fa-solid fa-truck-arrow-right text-primary"></i>
            <span>รายการของที่จะจ่าย</span>
            <span class="badge badge-primary font-bold">{{ totalDispatchQty }}</span>
          </span>
          <div class="flex align-center gap-sm">
            <button class="btn btn-ghost btn-sm text-danger" @click="clearDispatchCart">ล้างทั้งหมด</button>
            <button class="modal-close" @click="isDispatchMobileDrawerOpen = false">✕</button>
          </div>
        </div>

        <!-- Drawer Scrollable Content -->
        <div class="cart-drawer-scroll-body flex flex-col gap-md">
          <!-- Target Branch Badge Card -->
          <div class="dispatch-branch-info-card flex align-center gap-md" style="background: var(--bg-secondary); padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 0;">
            <div style="width: 34px; height: 34px; border-radius: var(--radius-sm); background: var(--card-bg); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid var(--border-color-light); box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
              <i class="fa-solid fa-building-circle-arrow-right text-primary" style="font-size: 1.1rem;"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-xs text-secondary font-medium" style="margin-bottom: 2px;">สาขาที่จะตัดยอดเข้า:</div>
              <div class="font-bold text-sm text-primary truncate" style="font-size: 0.95rem;">
                {{ selectedDispatchBranchName || 'ยังไม่ได้เลือกสาขา' }}
              </div>
            </div>
          </div>

          <!-- Cart Items List: Spacious 2-Tier Cards with Steppers -->
          <div class="cart-items-list flex flex-col gap-sm">
            <div 
              v-for="c in dispatchCart" 
              :key="c.item_id" 
              class="cart-row p-sm flex flex-col justify-between"
            >
              <!-- Tier 1: Item Name + Subtotal -->
              <div class="flex flex-between align-start gap-xs mb-xs">
                <div class="flex-1 min-w-0 pr-xs">
                  <div class="cart-item-name font-bold text-sm text-primary">
                    {{ getItemNameParts(c.item_name).main }}
                  </div>
                  <div v-if="getItemNameParts(c.item_name).sub" class="cart-item-sub text-xs text-secondary mt-1">
                    {{ getItemNameParts(c.item_name).sub }}
                  </div>
                  <div v-if="c.pack_size > 1" class="text-2xs text-primary font-bold mt-1">
                    <i class="fa-solid fa-arrows-rotate mr-1"></i> เติมสต็อก {{ c.quantity * c.pack_size }} ชิ้น
                  </div>
                </div>
                <div class="text-right flex-shrink-0 pl-xs">
                  <span class="font-bold text-sm text-primary">฿{{ formatNumber(c.quantity * c.cost_price) }}</span>
                </div>
              </div>

              <!-- Tier 2: Unit price + Stepper -->
              <div class="flex flex-between align-center cart-item-bottom">
                <span class="text-xs text-secondary">
                  ฿{{ formatNumber(c.cost_price) }} / {{ c.unit }}
                </span>
                <div class="flex align-center gap-xs flex-shrink-0">
                  <button class="btn-qty" @click="decreaseDispatchQty(c)" title="ลดจำนวน">-</button>
                  <span class="font-bold text-sm text-center qty-display">{{ c.quantity }}</span>
                  <button class="btn-qty" @click="increaseDispatchQty(c)" title="เพิ่มจำนวน">+</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Notes Field -->
          <div class="form-group">
            <label class="form-label text-xs font-bold text-secondary mb-xs block">
              <i class="fa-solid fa-pen-to-square mr-1"></i> บันทึกช่วยจำ / รอบส่ง (ถ้ามี):
            </label>
            <input 
              type="text" 
              v-model="dispatchNotes" 
              placeholder="เช่น รอบส่งเช้า 08:30 น., ส่งของด่วน" 
              class="form-input text-sm w-full"
            />
          </div>
        </div>

        <!-- Drawer Fixed Footer -->
        <div class="cart-drawer-footer">
          <div class="cart-total-row flex flex-between align-baseline mb-sm">
            <span class="text-sm font-bold text-secondary">มูลค่าต้นทุนรวม:</span>
            <span class="text-2xl font-bold text-primary">฿{{ formatNumber(totalDispatchCost) }}</span>
          </div>
          <button 
            class="btn btn-primary w-full btn-submit-requisition flex align-center justify-center gap-xs" 
            :disabled="isSubmittingDispatch || dispatchCart.length === 0 || !dispatchBranchId"
            @click="submitPushDispatch"
          >
            <i v-if="isSubmittingDispatch" class="fa-solid fa-spinner fa-spin mr-2"></i>
            <i v-else class="fa-solid fa-truck-arrow-right mr-2"></i>
            <span>{{ isSubmittingDispatch ? 'กำลังบันทึกจ่ายของ...' : 'ยืนยันจ่ายของให้สาขา (ตัดสต็อกทันที)' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ────────────────────────────────────────────────────────── -->
    <!-- TAB 2: ORDERS (คำขอเบิกของจากสาขา & จัดส่ง) -->
    <!-- ────────────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'orders'" class="orders-section">
      <!-- Orders Filter Toolbar -->
      <div class="card mb-lg p-md flex flex-between align-center toolbar-card orders-toolbar">
        <!-- Status Filter Tabs -->
        <div class="order-status-tabs flex gap-xs align-center">
          <button 
            class="order-tab-btn" 
            :class="{ active: orderFilterStatus === 'pending' }"
            @click="orderFilterStatus = 'pending'"
          >
            <i class="fa-solid fa-hourglass-start mr-1"></i> รอจัดส่ง 
            <span class="order-tab-count">{{ pendingOrdersCount }}</span>
          </button>
          <button 
            class="order-tab-btn" 
            :class="{ active: orderFilterStatus === 'dispatched' }"
            @click="orderFilterStatus = 'dispatched'"
          >
            <i class="fa-solid fa-truck-fast mr-1"></i> กำลังส่ง 
            <span class="order-tab-count">{{ dispatchedOrdersCount }}</span>
          </button>
          <button 
            class="order-tab-btn" 
            :class="{ active: orderFilterStatus === 'received' }"
            @click="orderFilterStatus = 'received'"
          >
            <i class="fa-solid fa-circle-check mr-1"></i> สาขารับแล้ว
          </button>
          <button 
            class="order-tab-btn" 
            :class="{ active: orderFilterStatus === 'all' }"
            @click="orderFilterStatus = 'all'"
          >
            ทั้งหมด
            <span class="order-tab-count">{{ orders.length }}</span>
          </button>
        </div>

        <!-- Right: Branch Filter Dropdown & Direct Dispatch Button -->
        <div class="flex align-center gap-sm flex-wrap">
          <div class="order-branch-filter">
            <label class="order-branch-label">
              <i class="fa-solid fa-store text-primary"></i>
              <span>สาขา:</span>
            </label>
            <div class="custom-select-wrapper order-branch-select-wrapper" @click.stop style="min-width: 170px;">
              <div 
                class="custom-select-trigger order-branch-select" 
                :class="{ 'active': isOrderBranchDropdownOpen }" 
                @click="isOrderBranchDropdownOpen = !isOrderBranchDropdownOpen"
              >
                <span class="custom-select-text font-bold">
                  {{ selectedOrderBranchName }}
                </span>
              </div>
              <div v-if="isOrderBranchDropdownOpen" class="custom-select-dropdown">
                <div 
                  class="custom-select-option"
                  :class="{ 'selected': orderBranchFilter === 'all' }"
                  @click="orderBranchFilter = 'all'; isOrderBranchDropdownOpen = false;"
                >
                  ทุกสาขา
                </div>
                <div 
                  v-for="b in retailBranches" 
                  :key="b.id" 
                  class="custom-select-option"
                  :class="{ 'selected': Number(orderBranchFilter) === Number(b.id) }"
                  @click="orderBranchFilter = b.id; isOrderBranchDropdownOpen = false;"
                >
                  {{ b.name }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading Skeleton State -->
      <div v-if="isLoadingOrders" class="orders-list flex flex-col gap-md">
        <div v-for="i in 3" :key="i" class="card p-lg order-card-skeleton">
          <!-- Header skeleton -->
          <div class="flex flex-between align-center mb-md pb-md" style="border-bottom: 1px solid var(--border-color-light);">
            <div class="flex align-center gap-sm">
              <div class="skeleton" style="width: 120px; height: 26px; border-radius: var(--radius-sm);"></div>
              <div class="skeleton" style="width: 90px; height: 24px; border-radius: var(--radius-full);"></div>
              <div class="skeleton" style="width: 80px; height: 24px; border-radius: var(--radius-full);"></div>
            </div>
            <div class="skeleton" style="width: 110px; height: 32px; border-radius: var(--radius-sm);"></div>
          </div>
          <!-- Meta skeleton -->
          <div class="skeleton mb-md" style="width: 260px; height: 16px; border-radius: var(--radius-xs);"></div>
          <!-- Items table skeleton -->
          <div class="order-items-table-wrapper mb-md">
            <div class="skeleton mb-xs" style="width: 100%; height: 38px;"></div>
            <div class="skeleton mb-xs" style="width: 100%; height: 44px;"></div>
            <div class="skeleton" style="width: 100%; height: 44px;"></div>
          </div>
          <!-- Footer skeleton -->
          <div class="flex flex-between align-center pt-xs flex-wrap gap-md">
            <div class="skeleton" style="width: 220px; height: 18px; border-radius: var(--radius-xs);"></div>
            <div class="skeleton" style="width: 180px; height: 46px; border-radius: var(--radius-md);"></div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredOrders.length === 0" class="empty-state-box">
        <div class="empty-state-icon">
          <i class="fa-solid fa-clipboard-check"></i>
        </div>
        <h3 class="empty-state-title">ไม่มีรายการคำขอเบิก</h3>
        <p class="empty-state-desc">
          {{ orderFilterStatus === 'pending' ? 'ขณะนี้ไม่มีคำขอเบิกที่ค้างรอการจัดส่ง ครัวกลางเคลียร์รายการครบถ้วนแล้ว' : 'ไม่พบรายการคำขอเบิกในเงื่อนไขที่เลือก' }}
        </p>
      </div>

      <!-- Orders List Cards -->
      <div v-else class="orders-list flex flex-col gap-md">
        <div 
          v-for="order in filteredOrders" 
          :key="order.id" 
          class="card p-lg order-card"
          :class="{ 
            'order-card-pending': order.status === 'pending', 
            'order-card-dispatched': order.status === 'dispatched',
            'order-card-received': order.status === 'received' 
          }"
        >
          <!-- Order Card Header -->
          <div class="order-card-header flex flex-between align-center flex-wrap gap-md mb-md pb-md">
            <div class="flex align-center gap-sm flex-wrap">
              <span class="order-no-title font-bold">
                <i class="fa-solid fa-receipt text-primary"></i>
                <span>#{{ order.transfer_no }}</span>
              </span>
              <span class="badge badge-primary font-bold">
                <i class="fa-solid fa-store"></i>
                <span>{{ order.branch_name }}</span>
              </span>
              <!-- Dispatch Type Badge -->
              <span v-if="order.dispatch_type === 'push'" class="badge badge-info font-bold" title="ครัวกลางจ่ายให้โดยตรง">
                <i class="fa-solid fa-truck-arrow-right"></i> ครัวกลางจ่ายให้
              </span>
              <span v-else class="badge badge-neutral font-bold" title="สาขาขอเบิก">
                <i class="fa-solid fa-hand-holding-hand"></i> สาขาขอเบิก
              </span>
              <span class="badge font-bold" :class="getStatusBadgeClass(order.status)">
                <i v-if="order.status === 'pending'" class="fa-solid fa-hourglass-start"></i>
                <i v-else-if="order.status === 'dispatched'" class="fa-solid fa-truck-fast"></i>
                <i v-else-if="order.status === 'received'" class="fa-solid fa-circle-check"></i>
                <i v-else-if="order.status === 'cancelled'" class="fa-solid fa-ban"></i>
                <span>{{ getStatusLabel(order.status) }}</span>
              </span>
              <span v-if="order.status === 'cancelled'" class="badge badge-success font-bold">
                <i class="fa-solid fa-rotate-left"></i>
                <span>คืนแล้ว</span>
              </span>
            </div>

            <div class="order-total-header">
              <span class="order-total-label">ยอดต้นทุนตัดเข้าสาขา:</span>
              <span 
                class="order-total-amount font-bold"
                :class="order.status === 'cancelled' ? 'text-muted' : 'text-primary'"
                :style="order.status === 'cancelled' ? 'text-decoration: line-through; opacity: 0.65;' : ''"
              >
                ฿{{ formatNumber(order.total_cost) }}
              </span>
            </div>
          </div>

          <!-- Order Metadata Info -->
          <div class="order-meta-row flex flex-between align-center text-xs text-secondary mb-md flex-wrap gap-sm">
            <div class="flex align-center gap-md flex-wrap">
              <span>
                <i class="fa-regular fa-user mr-1 text-muted"></i> ผู้ขอเบิก: <strong class="text-main">{{ order.requested_by_name || 'ไม่ระบุ' }}</strong>
              </span>
              <span>
                <i class="fa-regular fa-clock mr-1 text-muted"></i> ยื่นคำขอเมื่อ: <span class="text-main">{{ formatDateTime(order.created_at) }}</span>
              </span>
            </div>
            <div v-if="order.dispatched_at" class="order-meta-dispatched">
              <i class="fa-solid fa-truck-fast mr-1 text-info"></i> จัดส่งเมื่อ: <span class="text-main">{{ formatDateTime(order.dispatched_at) }}</span> <span class="text-muted">(โดย {{ order.dispatched_by_name || 'ครัวกลาง' }})</span>
            </div>
          </div>

          <!-- Items Clean Table Container -->
          <div class="order-items-container mb-md">
            <div class="order-items-title flex flex-between align-center mb-xs">
              <span class="text-xs font-bold text-secondary">
                <i class="fa-solid fa-boxes-stacked mr-1 text-primary"></i> รายการของที่ขอเบิก ({{ order.items.length }} รายการ)
              </span>
            </div>
            
            <!-- Desktop Table (>= 641px) -->
            <div class="order-items-table-wrapper desktop-only-orders-table">
              <table class="order-items-table">
                <thead>
                  <tr>
                    <th class="col-item text-left">ชื่อสินค้า</th>
                    <th class="col-price text-right">ราคาเบิก/หน่วย</th>
                    <th class="col-qty text-center">จำนวน</th>
                    <th class="col-total text-right">รวมมูลค่า</th>
                    <th v-if="order.status === 'received'" class="col-actions text-center" style="width: 140px;">การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="it in order.items" :key="it.id">
                    <td class="col-item">
                      <div class="item-name-main font-bold text-sm">{{ getItemNameParts(it.item_name).main }}</div>
                      <div v-if="getItemNameParts(it.item_name).sub" class="item-name-sub text-xs text-secondary">{{ getItemNameParts(it.item_name).sub }}</div>
                    </td>
                    <td class="col-price text-right text-sm text-secondary">
                      ฿{{ formatNumber(it.cost_price) }} <span class="text-xs text-muted">/ {{ it.unit }}</span>
                    </td>
                    <td class="col-qty text-center">
                      <span class="order-qty-pill font-bold">{{ it.quantity }} {{ it.unit }}</span>
                      <span v-if="it.pack_size > 1" class="text-2xs text-primary font-bold ml-1">({{ it.quantity * it.pack_size }} ชิ้น)</span>
                      <div v-if="it.original_quantity && it.quantity < it.original_quantity" class="text-2xs text-warning mt-1" title="ปรับลดจากยอดเดิม">
                        (เดิม {{ it.original_quantity }})
                      </div>
                    </td>
                    <td class="col-total text-right font-bold text-sm text-primary">
                      ฿{{ formatNumber(it.quantity * it.cost_price) }}
                    </td>
                    <td v-if="order.status === 'received'" class="col-actions text-center">
                      <button 
                        v-if="it.quantity > 0"
                        class="btn btn-ghost btn-xs text-warning flex align-center justify-center gap-xs mx-auto" 
                        title="ปรับยอดสินค้า / แจ้งของชำรุด"
                        @click="openAdjustItemModal(order, it)"
                      >
                        <i class="fa-solid fa-pen-to-square"></i>
                        <span>ปรับยอด/ของชำรุด</span>
                      </button>
                      <span v-else class="badge badge-neutral text-2xs">ยกเลิกแล้ว</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Mobile Itemized List (< 640px) -->
            <div class="order-items-mobile-list mobile-only-orders-list flex flex-col gap-xs">
              <div 
                v-for="it in order.items" 
                :key="it.id" 
                class="order-mobile-item-card"
              >
                <!-- Row 1: Item Name + Subtotal -->
                <div class="flex flex-between align-start gap-xs">
                  <div class="flex-1 min-w-0 pr-xs">
                    <div class="order-mobile-item-name font-bold text-sm text-primary">
                      {{ getItemNameParts(it.item_name).main }}
                    </div>
                    <div v-if="getItemNameParts(it.item_name).sub" class="order-mobile-item-sub text-xs text-secondary mt-1">
                      {{ getItemNameParts(it.item_name).sub }}
                    </div>
                  </div>
                  <div class="text-right flex-shrink-0 pl-xs">
                    <span class="order-mobile-item-total font-bold text-sm text-primary">
                      ฿{{ formatNumber(it.quantity * it.cost_price) }}
                    </span>
                  </div>
                </div>

                <!-- Row 2: Unit Price + Quantity Pill -->
                <div class="flex flex-between align-center order-mobile-item-bottom">
                  <span class="text-xs text-secondary">
                    ฿{{ formatNumber(it.cost_price) }} / {{ it.unit }}
                  </span>
                  <div class="flex align-center gap-xs">
                    <span class="order-qty-pill font-bold">
                      {{ it.quantity }} {{ it.unit }}
                    </span>
                    <span v-if="it.pack_size > 1" class="text-2xs text-primary font-bold">
                      ({{ it.quantity * it.pack_size }} ชิ้น)
                    </span>
                    <span v-if="it.original_quantity && it.quantity < it.original_quantity" class="badge badge-warning text-2xs">
                      (เดิม {{ it.original_quantity }})
                    </span>
                  </div>
                </div>

                <!-- Row 3: Action for received items -->
                <div v-if="order.status === 'received' && it.quantity > 0" class="flex justify-end pt-xs mt-xs border-t">
                  <button 
                    class="btn btn-ghost btn-xs text-warning flex align-center gap-xs" 
                    @click="openAdjustItemModal(order, it)"
                  >
                    <i class="fa-solid fa-pen-to-square"></i>
                    <span>ปรับยอด/ของชำรุด</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Branch Note if any -->
            <div v-if="order.notes" class="order-notes-box mt-sm p-sm rounded flex align-center gap-xs">
              <i class="fa-solid fa-comment-dots text-primary"></i>
              <span class="text-xs text-secondary"><strong>บันทึกจากสาขา:</strong> {{ order.notes }}</span>
            </div>
          </div>

          <!-- Order Card Footer Action -->
          <div class="order-card-footer flex flex-between align-center flex-wrap gap-md pt-sm">
            <div class="order-footer-notice text-xs">
              <span v-if="order.status === 'pending'" class="text-warning font-bold flex align-center gap-xs">
                <i class="fa-solid fa-triangle-exclamation"></i> กรุณาตรวจสอบสต็อกจริงก่อนกดอนุมัติ (ระบบจะหักต้นทุนสาขา & เติมสต็อก POS ทันที)
              </span>
              <span v-else-if="order.status === 'dispatched'" class="text-info font-bold flex align-center gap-xs">
                <i class="fa-solid fa-truck-ramp-box"></i> ส่งของออกจากครัวกลางแล้ว
              </span>
              <span v-else-if="order.status === 'received'" class="text-success font-bold flex align-center gap-xs">
                <i class="fa-solid fa-circle-check"></i> อนุมัติสำเร็จ & บันทึกเป็น Expense สาขาเรียบร้อย (เติมสต็อก POS แล้ว)
              </span>
              <span v-else-if="order.status === 'cancelled'" class="text-danger font-bold flex align-center gap-xs">
                <i class="fa-solid fa-ban"></i> ใบเบิกถูกยกเลิก และคืนสต็อกสินค้ากลับเข้าครัวกลางเรียบร้อยแล้ว
              </span>
            </div>

            <div class="order-footer-actions flex align-center gap-sm flex-wrap">
              <button 
                v-if="order.status === 'pending'" 
                class="btn btn-primary btn-dispatch-order"
                @click="dispatchOrder(order)"
              >
                <i class="fa-solid fa-circle-check mr-2"></i> อนุมัติ & ตัดจ่ายเข้าสาขาทันที
              </button>
              <button 
                v-if="order.status === 'pending'" 
                class="btn btn-ghost btn-sm text-danger"
                @click="cancelTransferOrder(order)"
              >
                <i class="fa-solid fa-xmark mr-1"></i> ยกเลิกคำขอ
              </button>
              <button 
                v-if="order.status === 'received'" 
                class="btn btn-ghost btn-xs text-danger"
                @click="cancelTransferOrder(order)"
                title="ยกเลิกใบเบิกนี้และดึงสต็อกกลับคืน"
              >
                <i class="fa-solid fa-ban mr-1"></i> ยกเลิกใบเบิก (Rollback ทั้งหมด)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ────────────────────────────────────────────────────────── -->
    <!-- TAB 3: HISTORY (การ์ดประวัติการเติม & การเบิก) -->
    <!-- ────────────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'history'" class="history-section">
      <!-- Filter Bar -->
      <div class="card mb-lg p-md flex flex-between align-center toolbar-card history-toolbar">
        <div class="history-status-tabs flex gap-xs align-center">
          <button 
            class="history-tab-btn" 
            :class="{ active: historyFilter === 'all' }"
            @click="historyFilter = 'all'"
          >
            <span>ทั้งหมด</span>
            <span class="history-tab-count">{{ history.length }}</span>
          </button>
          <button 
            class="history-tab-btn" 
            :class="{ active: historyFilter === 'restock' }"
            @click="historyFilter = 'restock'"
          >
            <i class="fa-solid fa-circle-plus"></i>
            <span>เติมสต็อกเข้าคลัง</span>
            <span class="history-tab-count">{{ restockHistoryCount }}</span>
          </button>
          <button 
            class="history-tab-btn" 
            :class="{ active: historyFilter === 'transfer' || historyFilter === 'requisition' }"
            @click="historyFilter = 'transfer'"
          >
            <i class="fa-solid fa-truck-fast"></i>
            <span>สาขาเบิกของ</span>
            <span class="history-tab-count">{{ transferHistoryCount }}</span>
          </button>
        </div>
      </div>

      <!-- Loading Skeleton State -->
      <div v-if="isLoadingHistory" class="timeline-container flex flex-col gap-md">
        <div v-for="i in 3" :key="i" class="card p-lg history-card-skeleton">
          <div class="flex flex-between align-start flex-wrap gap-md">
            <div class="flex gap-md align-start flex-1">
              <div class="skeleton" style="width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;"></div>
              <div class="flex-1">
                <div class="flex align-center gap-sm mb-xs">
                  <div class="skeleton" style="width: 120px; height: 24px; border-radius: var(--radius-full);"></div>
                  <div class="skeleton" style="width: 140px; height: 24px; border-radius: var(--radius-sm);"></div>
                </div>
                <div class="skeleton mb-xs" style="width: 240px; height: 16px; border-radius: var(--radius-xs);"></div>
                <div class="skeleton" style="width: 180px; height: 20px; border-radius: var(--radius-sm);"></div>
              </div>
            </div>
            <div class="skeleton" style="width: 130px; height: 36px; border-radius: var(--radius-sm);"></div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredHistory.length === 0" class="empty-state-box">
        <div class="empty-state-icon">
          <i class="fa-solid fa-clock-rotate-left"></i>
        </div>
        <h3 class="empty-state-title">ยังไม่มีประวัติการทำรายการ</h3>
        <p class="empty-state-desc">
          เมื่อมีการเติมสต็อกหรือส่งของให้สาขา ข้อมูลจะถูกบันทึกที่นี่โดยละเอียด
        </p>
      </div>

      <!-- Timeline Feed Cards -->
      <div v-else class="timeline-container flex flex-col gap-md">
        <div 
          v-for="h in filteredHistory" 
          :key="h.id" 
          class="card p-lg history-feed-card"
          :class="h.type === 'restock' ? 'border-restock-feed' : 'border-transfer-feed'"
        >
          <!-- RESTOCK FEED CARD -->
          <div v-if="h.type === 'restock'" class="history-card-inner flex flex-between align-start flex-wrap gap-md">
            <div class="flex gap-md align-start flex-1 min-w-0">
              <div class="feed-icon-circle bg-success-light text-success">
                <i class="fa-solid fa-circle-plus"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex align-center gap-sm mb-xs flex-wrap">
                  <span class="badge badge-success font-bold">
                    <i class="fa-solid fa-circle-plus"></i>
                    <span>เติมสต็อกเข้าคลัง</span>
                  </span>
                  <span class="font-bold text-base text-main">{{ getItemNameParts(h.item_name).main }}</span>
                  <span v-if="getItemNameParts(h.item_name).sub" class="text-xs text-secondary font-medium">
                    {{ getItemNameParts(h.item_name).sub }}
                  </span>
                </div>

                <div class="history-meta-row text-xs text-secondary flex align-center gap-md flex-wrap mb-xs">
                  <span class="inline-flex align-center gap-xs">
                    <i class="fa-regular fa-clock text-muted"></i>
                    <span>{{ formatDateTime(h.created_at) }}</span>
                  </span>
                  <span class="inline-flex align-center gap-xs">
                    <i class="fa-regular fa-user text-muted"></i>
                    <span>โดย: <strong class="text-main">{{ h.created_by }}</strong></span>
                  </span>
                  <span v-if="h.note" class="inline-flex align-center gap-xs">
                    <i class="fa-solid fa-tag text-muted"></i>
                    <span>แหล่งซื้อ/หมายเหตุ: <span class="text-main">{{ h.note }}</span></span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Restock Right Details -->
            <div class="history-amount-box text-right">
              <div class="history-qty-value font-bold text-lg text-success">
                +{{ formatNumber(h.quantity) }} {{ h.unit }}
              </div>
              <div class="history-sub-cost text-xs text-secondary">
                <span>ยอดเงินที่ซื้อ: </span>
                <strong class="text-main">฿{{ formatNumber(h.total_amount) }}</strong> 
                <span class="text-muted ml-xs font-medium">(ต้นทุน ฿{{ formatNumber(h.unit_cost) }} / {{ h.unit || 'หน่วย' }})</span>
              </div>
            </div>
          </div>

          <!-- TRANSFER FEED CARD -->
          <div v-else class="history-card-inner flex flex-between align-start flex-wrap gap-md">
            <div class="flex gap-md align-start flex-1 min-w-0">
              <div class="feed-icon-circle bg-primary-light text-primary">
                <i class="fa-solid fa-truck-fast"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex align-center gap-sm mb-xs flex-wrap">
                  <span class="badge badge-primary font-bold">
                    <i class="fa-solid fa-truck"></i>
                    <span>ส่งของให้สาขา</span>
                  </span>
                  <span class="font-bold text-base text-main">{{ h.branch_name }}</span>
                  <span class="order-no-title font-bold text-sm">
                    <i class="fa-solid fa-receipt text-primary"></i>
                    <span>#{{ h.transfer_no }}</span>
                  </span>
                  <span class="badge font-bold" :class="getStatusBadgeClass(h.status)">
                    <i v-if="h.status === 'pending'" class="fa-solid fa-hourglass-start"></i>
                    <i v-else-if="h.status === 'dispatched'" class="fa-solid fa-truck-fast"></i>
                    <i v-else-if="h.status === 'received'" class="fa-solid fa-circle-check"></i>
                    <i v-else-if="h.status === 'cancelled'" class="fa-solid fa-ban"></i>
                    <span>{{ getStatusLabel(h.status) }}</span>
                  </span>
                  <span v-if="h.status === 'cancelled'" class="badge badge-success font-bold">
                    <i class="fa-solid fa-rotate-left"></i>
                    <span>คืนแล้ว</span>
                  </span>
                </div>

                <div class="history-meta-row text-xs text-secondary flex align-center gap-md flex-wrap mb-sm">
                  <span class="inline-flex align-center gap-xs">
                    <i class="fa-regular fa-clock text-muted"></i>
                    <span>{{ formatDateTime(h.created_at) }}</span>
                  </span>
                  <span class="inline-flex align-center gap-xs">
                    <i class="fa-regular fa-user text-muted"></i>
                    <span>ผู้ขอเบิก: <strong class="text-main">{{ h.created_by }}</strong></span>
                  </span>
                </div>

                <!-- Items Mini Preview Chips -->
                <div v-if="h.items && h.items.length" class="history-items-chips">
                  <div 
                    v-for="it in h.items" 
                    :key="it.id" 
                    class="history-item-chip"
                  >
                    <div class="history-item-chip-name" :title="it.item_name">
                      {{ it.item_name }}
                    </div>
                    <div class="history-item-chip-qty">
                      <span class="history-item-chip-num">× {{ it.quantity }}</span>
                      <span class="history-item-chip-unit" :title="it.unit">{{ it.unit }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Transfer Right Details -->
            <div class="history-amount-box text-right">
              <div class="history-total-label text-xs text-secondary">มูลค่าของที่ตัดบัญชี:</div>
              <div 
                class="history-total-amount font-bold text-lg"
                :class="h.status === 'cancelled' ? 'text-muted' : 'text-primary'"
                :style="h.status === 'cancelled' ? 'text-decoration: line-through; opacity: 0.65;' : ''"
              >
                ฿{{ formatNumber(h.total_cost) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ────────────────────────────────────────────────────────── -->
    <!-- TAB: FINANCE (สมุดบัญชี & กระเป๋าเงินกองกลางครัวกลาง) -->
    <!-- ────────────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'finance' || activeTab === 'receivables'" class="finance-section">
      <!-- Toolbar Header -->
      <div class="card mb-lg p-md flex flex-between align-center toolbar-card finance-toolbar" style="gap: var(--space-md); flex-wrap: wrap;">
        <div>
          <h3 class="font-bold text-base mb-xs flex align-center gap-xs">
            <i class="fa-solid fa-vault text-primary"></i>
            <span>สมุดบัญชี & กระเป๋าเงินกองกลาง</span>
          </h3>
          <p class="text-secondary text-xs">
            บันทึกเงินทุนตั้งต้นของเจ้าของร้าน, บันทึกเงินจ่ายซื้อของสดตุนเข้าคลัง, และติดตามเงินที่สาขาโอนคืนค่าของ
          </p>
        </div>

        <div class="finance-action-buttons flex align-center gap-sm flex-wrap">
          <button class="btn btn-primary btn-finance-action" @click="openTransactionModal('capital_in')">
            <i class="fa-solid fa-circle-plus"></i>
            <span>เติมเงินทุนกองกลาง</span>
          </button>
          <button class="btn btn-secondary btn-finance-action" @click="openTransactionModal('operating_expense_out')">
            <i class="fa-solid fa-circle-minus"></i>
            <span>จ่ายค่าใช้จ่ายครัวกลาง</span>
          </button>
        </div>
      </div>

      <!-- Loading Skeleton State -->
      <div v-if="isLoadingFinance" class="flex flex-col gap-lg">
        <!-- 4 Summary KPI Cards Skeleton -->
        <div class="financial-summary-grid">
          <div v-for="i in 4" :key="i" class="summary-card">
            <div class="flex flex-between align-center mb-xs">
              <div class="skeleton" style="width: 55%; height: 16px; border-radius: var(--radius-xs);"></div>
              <div class="skeleton" style="width: 35%; height: 18px; border-radius: var(--radius-full);"></div>
            </div>
            <div class="skeleton my-sm" style="width: 70%; height: 28px; border-radius: var(--radius-sm);"></div>
            <div class="skeleton" style="width: 85%; height: 12px; border-radius: var(--radius-xs);"></div>
          </div>
        </div>

        <!-- Ledger Table Skeleton -->
        <div class="card p-lg ledger-card">
          <div class="flex flex-between align-center flex-wrap gap-md mb-lg pb-md" style="border-bottom: 1px solid var(--border-color-light);">
            <div class="skeleton" style="width: 180px; max-width: 50%; height: 24px; border-radius: var(--radius-xs);"></div>
            <div class="skeleton" style="width: 240px; max-width: 45%; height: 38px; border-radius: var(--radius-full);"></div>
          </div>
          <div class="skeleton mb-xs" style="width: 100%; height: 42px; border-radius: var(--radius-sm);"></div>
          <div class="skeleton mb-xs" style="width: 100%; height: 48px; border-radius: var(--radius-sm);"></div>
          <div class="skeleton" style="width: 100%; height: 48px; border-radius: var(--radius-sm);"></div>
        </div>
      </div>

      <!-- Content when Finance Data Loaded -->
      <div v-else class="flex flex-col gap-lg">
        <!-- 4 Summary KPI Cards -->
        <!-- 4 Summary KPI Cards -->
        <div class="financial-summary-grid">
          <!-- Card 1: Cash Balance -->
          <div 
            class="summary-card card-accent-primary card-clickable"
            :class="{ 'card-active-tab': financeSubTab === 'ledger' }"
            @click="financeSubTab = 'ledger'"
            title="คลิกเพื่อดูสมุดบัญชีเดินเงินกองกลาง"
            role="button"
            tabindex="0"
          >
            <div class="summary-card-header flex flex-between align-center">
              <div class="flex align-center gap-xs">
                <span class="summary-icon"><i class="fa-solid fa-wallet text-primary"></i></span>
                <span class="summary-title">เงินสดกองกลางคงเหลือ</span>
              </div>
              <span class="badge badge-success font-bold text-xs">
                <i class="fa-solid fa-circle-check"></i>
                <span>เงินสดพร้อมใช้</span>
              </span>
            </div>
            <div class="summary-value" :class="financeSummary.cash_balance >= 0 ? 'text-primary' : 'text-danger'">
              ฿{{ formatNumber(financeSummary.cash_balance) }}
            </div>
            <div class="summary-caption text-xs text-muted">ทุนเจ้าของ + สาขาคืนเงิน - ซื้อของ - ค่าใช้จ่าย</div>
            <div class="card-click-hint" :class="{ 'card-click-hint-active': financeSubTab === 'ledger' }">
              <i class="fa-solid mr-1" :class="financeSubTab === 'ledger' ? 'fa-circle-check text-success' : 'fa-arrow-down'"></i>
              <span>{{ financeSubTab === 'ledger' ? 'กำลังแสดงสมุดบัญชีด้านล่าง' : 'คลิกเพื่อดูสมุดบัญชี' }}</span>
            </div>
          </div>

          <!-- Card 2: Inventory Stock Value -->
          <div class="summary-card card-accent-warning">
            <div class="summary-card-header flex flex-between align-center">
              <div class="flex align-center gap-xs">
                <span class="summary-icon"><i class="fa-solid fa-boxes-stacked text-warning"></i></span>
                <span class="summary-title">มูลค่าสต็อกของในโกดัง</span>
              </div>
              <span class="badge badge-warning font-bold text-xs">
                <i class="fa-solid fa-box"></i>
                <span>พร้อมจ่าย</span>
              </span>
            </div>
            <div class="summary-value text-warning">฿{{ formatNumber(financeSummary.inventory_value) }}</div>
            <div class="summary-sub-badges flex align-center flex-wrap gap-xs mt-xs">
              <span class="sub-badge">สินค้าในคลัง ทุนจริง</span>
              <span v-if="(financeSummary.total_waste_cost || 0) > 0" class="sub-badge sub-badge-waste-loss font-bold">
                <i class="fa-solid fa-trash-can mr-1"></i> เสียสะสม: -฿{{ formatNumber(financeSummary.total_waste_cost) }}
              </span>
            </div>
          </div>

          <!-- Card 3: Pending Receivables from Branches -->
          <div 
            class="summary-card card-accent-danger card-clickable" 
            :class="{ 'card-active-tab': financeSubTab === 'receivables' }"
            @click="onReceivablesCardClick" 
            title="คลิกเพื่อสลับไปแท็บยอดค้างชำระและรายการของที่สาขาเบิก"
            role="button"
            tabindex="0"
          >
            <div class="summary-card-header flex flex-between align-center">
              <div class="flex align-center gap-xs">
                <span class="summary-icon"><i class="fa-solid fa-hourglass-half text-danger"></i></span>
                <span class="summary-title">ยอดที่สาขายังค้างชำระคืน</span>
              </div>
              <span class="badge badge-danger font-bold text-xs">
                <i class="fa-solid fa-clock"></i>
                <span>รอสาขาเคลียร์</span>
              </span>
            </div>
            <div class="summary-value text-danger">฿{{ formatNumber(financeSummary.pending_receivables) }}</div>
            <div class="summary-caption text-xs text-muted">ของที่สาขารับไปแล้ว รอโอนเคลียร์คืนครัวกลาง</div>
            <div class="card-click-hint" :class="{ 'card-click-hint-active': financeSubTab === 'receivables' }">
              <i class="fa-solid mr-1" :class="financeSubTab === 'receivables' ? 'fa-circle-check text-success' : 'fa-arrow-down'"></i>
              <span>{{ financeSubTab === 'receivables' ? 'กำลังแสดงข้อมูลในแท็บด้านล่าง' : 'คลิกดูของที่สาขาเบิก & ยอดค้าง' }}</span>
            </div>
          </div>

          <!-- Card 4: Total Capital Injected -->
          <div class="summary-card card-accent-info">
            <div class="summary-card-header flex flex-between align-center">
              <div class="flex align-center gap-xs">
                <span class="summary-icon"><i class="fa-solid fa-landmark text-info"></i></span>
                <span class="summary-title">เงินทุนเจ้าของที่เติมสะสม</span>
              </div>
              <span class="badge badge-info font-bold text-xs">
                <i class="fa-solid fa-user-shield"></i>
                <span>ทุนเจ้าของ</span>
              </span>
            </div>
            <div class="summary-value text-info">฿{{ formatNumber(financeSummary.total_capital) }}</div>
            <div class="summary-caption text-xs text-muted">เงินทุนตั้งต้นกองกลางจากเจ้าของร้าน</div>
          </div>
        </div>

        <!-- Pill Navigation Tabs (Exact style from Management.vue & User reference) -->
        <div id="finance-subtabs-nav" class="finance-subtabs-container flex gap-xs">
          <button 
            type="button"
            class="btn btn-secondary" 
            :class="{ 'active': financeSubTab === 'ledger' }"
            @click="financeSubTab = 'ledger'"
          >
            <i class="fa-solid fa-book-journal-whills"></i> สมุดบัญชีกองกลาง
            <span v-if="financeLogs.length > 0" class="tab-count-pill ml-xs font-normal">({{ financeLogs.length }})</span>
          </button>
          <button 
            type="button"
            class="btn btn-secondary" 
            :class="{ 'active': financeSubTab === 'receivables' }"
            @click="financeSubTab = 'receivables'"
          >
            <i class="fa-solid fa-shop"></i> ยอดค้างชำระ & ของที่สาขาเบิก
            <span v-if="(receivablesBreakdown?.branches?.length || 0) > 0" class="tab-count-pill ml-xs font-bold">
              ({{ receivablesBreakdown.branches.length }} สาขา)
            </span>
          </button>
        </div>

        <!-- SUB-TAB 1: Transactions Ledger Card -->
        <div v-if="financeSubTab === 'ledger'" class="card p-lg ledger-card">
          <div class="ledger-header flex flex-between align-center flex-wrap gap-md">
            <div class="flex align-center gap-xs">
              <i class="fa-solid fa-clock-rotate-left text-primary" style="font-size: 1.15rem;"></i>
              <span class="font-bold text-base text-main">ประวัติรายการเดินบัญชีกองกลาง</span>
            </div>

            <!-- Filter Pills -->
            <div class="finance-status-tabs flex gap-xs align-center">
              <button 
                class="finance-tab-btn" 
                :class="{ active: financeFilterType === 'all' }"
                @click="financeFilterType = 'all'"
              >
                <span>ทั้งหมด</span>
                <span class="finance-tab-count">{{ financeLogs.length }}</span>
              </button>
              <button 
                class="finance-tab-btn" 
                :class="{ active: financeFilterType === 'capital_in' }"
                @click="financeFilterType = 'capital_in'"
              >
                <i class="fa-solid fa-circle-plus"></i>
                <span>เติมทุน +</span>
                <span class="finance-tab-count">{{ capitalInCount }}</span>
              </button>
              <button 
                class="finance-tab-btn" 
                :class="{ active: financeFilterType === 'reimbursement_in' }"
                @click="financeFilterType = 'reimbursement_in'"
              >
                <i class="fa-solid fa-hand-holding-dollar"></i>
                <span>สาขาคืนเงิน +</span>
                <span class="finance-tab-count">{{ reimbursementInCount }}</span>
              </button>
              <button 
                class="finance-tab-btn" 
                :class="{ active: financeFilterType === 'purchase_out' }"
                @click="financeFilterType = 'purchase_out'"
              >
                <i class="fa-solid fa-cart-shopping"></i>
                <span>ซื้อของเข้าคลัง -</span>
                <span class="finance-tab-count">{{ purchaseOutCount }}</span>
              </button>
              <button 
                class="finance-tab-btn" 
                :class="{ active: financeFilterType === 'operating_expense_out' }"
                @click="financeFilterType = 'operating_expense_out'"
              >
                <i class="fa-solid fa-circle-minus"></i>
                <span>รายจ่ายครัวกลาง -</span>
                <span class="finance-tab-count">{{ operatingExpenseOutCount }}</span>
              </button>
              <button 
                class="finance-tab-btn" 
                :class="{ active: financeFilterType === 'waste_loss' }"
                @click="financeFilterType = 'waste_loss'"
              >
                <i class="fa-solid fa-trash-can"></i>
                <span>ของเสีย/ตัดทิ้ง -</span>
                <span class="finance-tab-count">{{ wasteLossCount }}</span>
              </button>
            </div>
          </div>

          <!-- Empty Logs -->
          <div v-if="filteredFinanceLogs.length === 0" class="empty-state-box empty-state-seamless">
            <div class="empty-state-icon">
              <i class="fa-solid fa-receipt"></i>
            </div>
            <h4 class="empty-state-title">ยังไม่มีรายการเดินบัญชี</h4>
            <p class="empty-state-desc">
              เมื่อมีการเติมทุน ซื้อของเข้าคลัง หรือสาขาโอนเงินคืน จะถูกบันทึกที่นี่โดยละเอียด
            </p>
          </div>

          <!-- Logs Container -->
          <div v-else class="ledger-body-container">
            <!-- Desktop Table View -->
            <div class="ledger-table-wrapper desktop-only-ledger-table">
              <table class="ledger-table">
                <thead>
                  <tr>
                    <th class="col-date text-left">วันที่ & เวลา</th>
                    <th class="col-type text-center">ประเภทรายการ</th>
                    <th class="col-note text-left">บันทึกช่วยจำ / รายละเอียด</th>
                    <th class="col-branch text-center">สาขา</th>
                    <th class="col-amount text-right">จำนวนเงิน</th>
                    <th class="col-user text-center">ผู้บันทึก</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="log in filteredFinanceLogs" 
                    :key="log.id"
                  >
                    <td class="col-date text-xs text-secondary">
                      <span class="font-medium text-main">{{ formatDateTime(log.created_at) }}</span>
                    </td>
                    <td class="col-type text-center">
                      <span class="badge font-bold text-xs" :class="getFinanceTypeBadgeClass(log.type)">
                        <i v-if="log.type === 'capital_in'" class="fa-solid fa-circle-plus"></i>
                        <i v-else-if="log.type === 'reimbursement_in'" class="fa-solid fa-hand-holding-dollar"></i>
                        <i v-else-if="log.type === 'purchase_out'" class="fa-solid fa-cart-shopping"></i>
                        <i v-else-if="log.type === 'operating_expense_out'" class="fa-solid fa-circle-minus"></i>
                        <i v-else-if="log.type === 'waste_loss'" class="fa-solid fa-trash-can"></i>
                        <span>{{ getFinanceTypeLabel(log.type) }}</span>
                      </span>
                    </td>
                    <td class="col-note">
                      <div class="font-bold text-sm text-main">{{ log.note || '-' }}</div>
                    </td>
                    <td class="col-branch text-center">
                      <span v-if="log.branch_name" class="badge badge-primary font-bold text-xs">
                        <i class="fa-solid fa-store"></i>
                        <span>{{ log.branch_name }}</span>
                      </span>
                      <span v-else class="text-xs text-muted">-</span>
                    </td>
                    <td class="col-amount text-right font-bold text-base" :class="isFinanceInflow(log.type) ? 'text-success' : 'text-danger'">
                      {{ isFinanceInflow(log.type) ? '+ ฿' : '- ฿' }}{{ formatNumber(log.amount) }}
                    </td>
                    <td class="col-user text-center text-xs text-secondary">
                      <span class="font-medium">{{ log.created_by_name || '-' }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Mobile Cards View (< 640px) -->
            <div class="mobile-only-ledger-list flex flex-col gap-sm">
              <div 
                v-for="log in filteredFinanceLogs" 
                :key="log.id" 
                class="ledger-mobile-card"
              >
                <!-- Top Row: Type Badge + Amount -->
                <div class="flex flex-between align-center gap-xs">
                  <span class="badge font-bold text-xs" :class="getFinanceTypeBadgeClass(log.type)">
                    <i v-if="log.type === 'capital_in'" class="fa-solid fa-circle-plus"></i>
                    <i v-else-if="log.type === 'reimbursement_in'" class="fa-solid fa-hand-holding-dollar"></i>
                    <i v-else-if="log.type === 'purchase_out'" class="fa-solid fa-cart-shopping"></i>
                    <i v-else-if="log.type === 'operating_expense_out'" class="fa-solid fa-circle-minus"></i>
                    <i v-else-if="log.type === 'waste_loss'" class="fa-solid fa-trash-can"></i>
                    <span>{{ getFinanceTypeLabel(log.type) }}</span>
                  </span>
                  <span class="font-bold text-base" :class="isFinanceInflow(log.type) ? 'text-success' : 'text-danger'">
                    {{ isFinanceInflow(log.type) ? '+ ฿' : '- ฿' }}{{ formatNumber(log.amount) }}
                  </span>
                </div>

                <!-- Middle Row: Note / Memo -->
                <div class="ledger-mobile-note font-bold text-sm text-main mt-xs">
                  {{ log.note || '-' }}
                </div>

                <!-- Bottom Row: Date/Time + Branch / Created By -->
                <div class="flex flex-between align-center ledger-mobile-bottom text-xs text-secondary">
                  <span class="inline-flex align-center gap-xs">
                    <i class="fa-regular fa-clock text-muted"></i>
                    <span>{{ formatDateTime(log.created_at) }}</span>
                  </span>
                  <div class="inline-flex align-center gap-xs">
                    <span v-if="log.branch_name" class="badge badge-primary font-bold text-xs">
                      <i class="fa-solid fa-store"></i>
                      <span>{{ log.branch_name }}</span>
                    </span>
                    <span v-if="log.created_by_name" class="inline-flex align-center gap-xs text-muted">
                      <i class="fa-regular fa-user"></i>
                      <span>{{ log.created_by_name }}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SUB-TAB 2: Branch Receivables & Consolidated Items -->
        <div v-else-if="financeSubTab === 'receivables'" class="receivables-tab-view flex flex-col gap-md">
          <!-- Filter Bar: Branch Dropdown & Refresh -->
          <div class="card p-md receivables-filter-card">
            <!-- Row 1: Label on left, Refresh button on right -->
            <div class="flex flex-between align-center mb-sm">
              <label class="form-label font-bold text-sm text-main mb-0 flex align-center gap-xs">
                <i class="fa-solid fa-store text-primary"></i> 
                <span>เลือกดูสาขา:</span>
              </label>
              <button 
                type="button" 
                class="btn btn-secondary btn-sm" 
                :disabled="isLoadingReceivables"
                @click="loadReceivablesBreakdown"
                title="รีเฟรชข้อมูล"
              >
                <i class="fa-solid fa-arrows-rotate mr-1" :class="{ 'fa-spin': isLoadingReceivables }"></i>
                <span>รีเฟรช</span>
              </button>
            </div>

            <!-- Row 2: Custom Dropdown Selection 100% width with Diner Theme -->
            <div class="custom-select-wrapper receivables-branch-select-wrapper" @click.stop>
              <div 
                class="custom-select-trigger receivables-branch-select-trigger" 
                :class="{ 'active': isReceivablesBranchDropdownOpen }" 
                @click="isReceivablesBranchDropdownOpen = !isReceivablesBranchDropdownOpen"
              >
                <span class="custom-select-text font-bold text-sm flex align-center gap-xs">
                  <i class="fa-solid fa-shop text-primary mr-1"></i>
                  <span>{{ selectedReceivablesBranchLabel }}</span>
                </span>
              </div>
              <div v-if="isReceivablesBranchDropdownOpen" class="custom-select-dropdown receivables-branch-dropdown">
                <div 
                  class="custom-select-option" 
                  :class="{ 'selected': selectedReceivablesBranch === 'all' }"
                  @click="selectedReceivablesBranch = 'all'; isReceivablesBranchDropdownOpen = false;"
                >
                  <div class="flex flex-between align-center w-full gap-sm">
                    <span class="font-bold">ทุกสาขา</span>
                    <span class="badge text-xs" :class="selectedReceivablesBranch === 'all' ? 'badge-light' : 'badge-secondary'">
                      มียอดค้าง {{ receivablesBreakdown?.branches?.length || 0 }} สาขา
                    </span>
                  </div>
                </div>
                <div 
                  v-for="b in (receivablesBreakdown?.branches || [])" 
                  :key="b.branch_id" 
                  class="custom-select-option"
                  :class="{ 'selected': Number(selectedReceivablesBranch) === Number(b.branch_id) }"
                  @click="selectedReceivablesBranch = b.branch_id; isReceivablesBranchDropdownOpen = false;"
                >
                  <div class="flex flex-between align-center w-full gap-sm">
                    <span class="font-bold">{{ b.branch_name }}</span>
                    <span class="font-bold text-xs" :class="Number(selectedReceivablesBranch) === Number(b.branch_id) ? 'text-white' : 'text-danger'">
                      ค้าง ฿{{ formatNumber(b.total_pending_amount) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Overview Banner Card -->
          <div class="card p-md receivables-overview-banner flex flex-between align-center flex-wrap gap-md">
            <div class="flex align-center gap-lg flex-wrap">
              <div class="overview-stat">
                <div class="text-xs text-secondary font-medium">สาขาที่แสดง</div>
                <div class="text-lg font-bold text-main">
                  {{ selectedReceivablesBranch === 'all' ? (filteredReceivablesBranches.length + ' สาขา') : (filteredReceivablesBranches[0]?.branch_name || '-') }}
                </div>
              </div>
              <div class="overview-divider"></div>
              <div class="overview-stat">
                <div class="text-xs text-secondary font-medium">ใบเบิกที่รอเคลียร์</div>
                <div class="text-lg font-bold text-main">{{ totalFilteredTransfersCount }} ใบ</div>
              </div>
            </div>
            <div class="text-right receivables-banner-right">
              <div class="text-xs text-secondary font-semibold">ยอดรวมค้างชำระคืน</div>
              <div class="amount-danger-bold">฿{{ formatNumber(totalFilteredPendingAmount) }}</div>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="isLoadingReceivables" class="card p-xl text-center">
            <i class="fa-solid fa-circle-notch fa-spin text-primary text-3xl mb-md"></i>
            <p class="text-secondary font-medium">กำลังโหลดข้อมูลยอดค้างชำระแยกสาขา...</p>
          </div>

          <!-- Empty State -->
          <div v-else-if="!filteredReceivablesBranches || filteredReceivablesBranches.length === 0" class="card p-xl text-center">
            <div class="empty-icon-circle mx-auto mb-md">
              <i class="fa-solid fa-circle-check text-success text-3xl"></i>
            </div>
            <h4 class="font-bold text-base mb-xs text-main">
              {{ selectedReceivablesBranch === 'all' ? 'ไม่มีสาขาค้างชำระคืน' : 'สาขานี้ไม่มีรายการค้างชำระ' }}
            </h4>
            <p class="text-secondary text-sm mb-0">ทุกรายการได้รับการชำระหรือเคลียร์ยอดค่าวัตถุดิบและสินค้าเรียบร้อยแล้ว</p>
          </div>

          <!-- Branch Cards List -->
          <div v-else class="branch-cards-list flex flex-col gap-lg">
            <div 
              v-for="branch in filteredReceivablesBranches" 
              :key="branch.branch_id"
              class="card p-lg branch-receivable-card"
            >
              <!-- Branch Card Header -->
              <div class="branch-card-header flex flex-between align-center flex-wrap gap-sm pb-md border-b">
                <div class="flex align-center gap-sm">
                  <span class="branch-badge-icon">
                    <i class="fa-solid fa-store text-danger"></i>
                  </span>
                  <div>
                    <h4 class="font-bold text-lg text-main mb-0">{{ branch.branch_name }}</h4>
                    <span class="text-xs text-secondary font-medium">
                      <i class="fa-solid fa-receipt mr-1"></i> {{ branch.transfers_count }} ใบเบิกที่รับของแล้ว (รอเคลียร์)
                    </span>
                  </div>
                </div>
                <div class="text-right branch-card-header-amount">
                  <div class="text-xs text-secondary font-medium">ยอดค้างชำระสาขานี้</div>
                  <div class="amount-danger-bold">฿{{ formatNumber(branch.total_pending_amount) }}</div>
                </div>
              </div>

              <!-- Consolidated Items Section -->
              <div class="branch-consolidated-section mt-md">
                <div class="flex flex-between align-center mb-sm">
                  <span class="font-bold text-sm text-secondary flex align-center gap-xs">
                    <i class="fa-solid fa-boxes-stacked text-primary"></i> 
                    รายการของที่เบิกไปทั้งหมด ({{ branch.consolidated_items.length }} รายการ)
                  </span>
                </div>

                <!-- Desktop Table View -->
                <div class="table-responsive rounded border overflow-hidden desktop-consolidated-table">
                  <table class="w-full text-sm receivables-items-table">
                    <thead>
                      <tr class="text-secondary text-xs text-left">
                        <th class="p-sm pl-md font-semibold">ชื่อสินค้า / วัตถุดิบ</th>
                        <th class="p-sm text-right font-semibold">จำนวนรวมที่เบิก</th>
                        <th class="p-sm text-right font-semibold">ราคาทุน / หน่วย</th>
                        <th class="p-sm pr-md text-right font-semibold">รวมเป็นเงิน</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in branch.consolidated_items" :key="item.item_id + '_' + item.unit">
                        <td class="p-sm pl-md font-medium text-main">
                          <i class="fa-solid fa-box text-muted text-xs mr-1"></i> {{ item.item_name }}
                        </td>
                        <td class="p-sm text-right font-bold text-primary">
                          {{ formatNumber(item.total_quantity) }} {{ item.unit }}
                        </td>
                        <td class="p-sm text-right text-secondary text-xs">
                          ฿{{ formatNumber(item.cost_price) }}
                        </td>
                        <td class="p-sm pr-md text-right font-bold text-main">
                          ฿{{ formatNumber(item.total_cost) }}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr class="font-bold border-t">
                        <td class="p-sm pl-md text-secondary text-xs" colspan="3">รวมมูลค่าสินค้าทั้งหมด</td>
                        <td class="p-sm pr-md text-right text-danger font-bold text-base">฿{{ formatNumber(branch.total_pending_amount) }}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <!-- Mobile Card-based Items View -->
                <div class="mobile-consolidated-list flex flex-col gap-sm">
                  <div 
                    v-for="item in branch.consolidated_items" 
                    :key="'mob_' + item.item_id + '_' + item.unit"
                    class="mobile-consolidated-item-card"
                  >
                    <!-- Row 1: Item Name and Quantity -->
                    <div class="flex flex-between align-start gap-sm mb-xs">
                      <div class="mobile-item-name font-bold text-sm text-main flex-1">
                        <i class="fa-solid fa-box text-muted text-xs mr-1"></i> {{ item.item_name }}
                      </div>
                      <div class="mobile-item-qty font-bold text-sm text-primary text-right" style="flex-shrink: 0; white-space: nowrap;">
                        {{ formatNumber(item.total_quantity) }} {{ item.unit }}
                      </div>
                    </div>
                    <!-- Row 2: Unit Cost and Subtotal Cost -->
                    <div class="flex flex-between align-center text-xs pt-xs mobile-item-bottom">
                      <span class="text-secondary font-medium">ทุน ฿{{ formatNumber(item.cost_price) }} / {{ item.unit }}</span>
                      <span class="font-bold text-danger text-sm">฿{{ formatNumber(item.total_cost) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Collapsible Transfer Orders History -->
              <div class="branch-transfers-section mt-md pt-sm border-t">
                <button 
                  type="button"
                  class="btn-transfer-toggle cursor-pointer"
                  @click="toggleBranchTransfers(branch.branch_id)"
                >
                  <span class="flex align-center gap-xs font-semibold">
                    <i :class="expandedBranchTransfers[branch.branch_id] ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
                    <span>{{ expandedBranchTransfers[branch.branch_id] ? 'ซ่อนรายละเอียดประวัติใบเบิก' : 'ดูรายละเอียดแยกตามใบเบิก' }}</span>
                  </span>
                  <span class="badge badge-secondary font-bold text-xs">
                    {{ branch.transfers.length }} ใบเบิก
                  </span>
                </button>

                <div v-if="expandedBranchTransfers[branch.branch_id]" class="transfer-tickets-list mt-md flex flex-col gap-sm">
                  <div 
                    v-for="t in branch.transfers" 
                    :key="t.id"
                    class="transfer-ticket-box"
                  >
                    <!-- Ticket Header -->
                    <div class="ticket-header">
                      <!-- Row 1: Ticket # and Total Amount -->
                      <div class="flex flex-between align-center">
                        <span class="badge badge-secondary font-bold text-xs">#{{ t.transfer_no }}</span>
                        <div class="font-bold text-danger text-sm">
                          ฿{{ formatNumber(t.total_cost) }}
                        </div>
                      </div>
                      <!-- Row 2: Date & Time in 1 single line (Moved down, no wrapping) -->
                      <div class="ticket-time-row flex align-center gap-xs text-xs text-secondary mt-xs">
                        <i class="fa-regular fa-clock text-muted"></i>
                        <span class="ticket-time-text">รับของเมื่อ: {{ formatDateTime(t.received_at || t.created_at) }}</span>
                      </div>
                    </div>

                    <!-- Optional Note -->
                    <div v-if="t.notes" class="ticket-note text-muted italic text-xs mt-xs">
                      <i class="fa-regular fa-comment-dots mr-1"></i>โน้ต: {{ t.notes }}
                    </div>

                    <!-- Uniform Items List (Consistent 100% width on all cards) -->
                    <div class="ticket-items-list mt-xs flex flex-col gap-xs">
                      <div 
                        v-for="it in t.items" 
                        :key="it.id" 
                        class="ticket-item-row flex flex-between align-center"
                      >
                        <div class="ticket-item-name font-medium text-main flex align-center gap-xs flex-1">
                          <i class="fa-solid fa-box text-muted text-xxs"></i>
                          <span>{{ it.item_name }}</span>
                        </div>
                        <div class="ticket-item-meta flex align-center gap-md flex-shrink-0 text-right">
                          <span class="text-secondary font-medium">{{ formatNumber(it.quantity) }} {{ it.unit }}</span>
                          <span class="font-bold text-main">฿{{ formatNumber(it.subtotal) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Branch Card Footer Action -->
              <div v-if="branch.total_pending_amount > 0" class="branch-card-footer mt-md pt-md border-t flex flex-between align-center flex-wrap gap-sm">
                <div class="text-xs text-secondary">
                  <i class="fa-solid fa-circle-info text-primary mr-1"></i>
                  เมื่อสาขาโอนเงินคืนค่าของเข้ากองกลางแล้ว ให้กดปุ่มเพื่อบันทึกตัดยอดค้างชำระ
                </div>
                <button 
                  type="button"
                  class="btn btn-primary font-bold"
                  @click="openReimburseModalForBranch(branch)"
                  style="white-space: nowrap; padding: 9px 18px; border-radius: var(--radius-md);"
                >
                  <i class="fa-solid fa-money-bill-transfer mr-1"></i>
                  <span>เคลียร์รับเงินคืน ฿{{ formatNumber(branch.total_pending_amount) }}</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ────────────────────────────────────────────────────────── -->
    <!-- TAB 4: PARTNERS & PROFIT (ระบบหุ้นส่วน & แบ่งกำไร 60/40) -->
    <!-- ────────────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'partners'" class="partners-section">
      <!-- Store Selector Header Card -->
      <div class="card mb-lg p-md flex flex-between align-center toolbar-card" style="gap: var(--space-md); flex-wrap: wrap;">
        <div>
          <h3 class="font-bold text-base mb-xs flex align-center gap-xs">
            <i class="fa-solid fa-calculator text-primary"></i>
            <span>ระบบคำนวณกำไร & ปันผลหุ้นส่วน</span>
          </h3>
          <p class="text-secondary text-xs">
            คำนวณกำไรสุทธิของแต่ละสาขาหลังหักต้นทุนของที่เบิกจากครัวกลาง และแบ่งปันผลอัตโนมัติ
          </p>
        </div>

        <div class="flex align-center gap-sm partner-branch-filter-box" style="flex-shrink: 0;">
          <label class="text-sm font-bold text-secondary" style="white-space: nowrap;">เลือกสาขา:</label>
          <div class="custom-select-wrapper partner-branch-select-wrapper" @click.stop style="min-width: 200px;">
            <div 
              class="custom-select-trigger partner-branch-select-trigger" 
              :class="{ 'active': isPartnerBranchDropdownOpen }" 
              @click="isPartnerBranchDropdownOpen = !isPartnerBranchDropdownOpen"
            >
              <span class="custom-select-text font-bold text-base">
                {{ selectedPartnerBranchName }}
              </span>
            </div>
            <div v-if="isPartnerBranchDropdownOpen" class="custom-select-dropdown">
              <div 
                v-for="b in retailBranches" 
                :key="b.id" 
                class="custom-select-option"
                :class="{ 'selected': Number(selectedPartnerBranch) === Number(b.id) }"
                @click="selectedPartnerBranch = b.id; isPartnerBranchDropdownOpen = false;"
              >
                {{ b.name }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pill Tabs (แท็บหลอดยา): หุ้นส่วน vs ประวัติปันผล -->
      <div class="category-tabs partner-subtabs mb-lg flex gap-xs" style="margin-bottom: var(--space-lg); display: flex; gap: var(--space-sm); border-bottom: 2px solid var(--border-color); padding-bottom: var(--space-sm); overflow-x: auto;">
        <button 
          type="button"
          class="btn btn-secondary" 
          :class="{ 'active': partnerSubTab === 'partners' }"
          @click="partnerSubTab = 'partners'"
        >
          <i class="fa-solid fa-users"></i> หุ้นส่วน
        </button>
        <button 
          type="button"
          class="btn btn-secondary" 
          :class="{ 'active': partnerSubTab === 'payout_history' }"
          @click="partnerSubTab = 'payout_history'"
        >
          <i class="fa-solid fa-clock-rotate-left"></i> ประวัติปันผล
        </button>
      </div>

      <!-- Loading / Error States -->
      <div v-if="isLoadingSettlement" class="card text-center p-3xl text-secondary mb-lg">
        <div class="spinner mx-auto mb-sm"></div>
        กำลังคำนวณงบกำไร-ขาดทุน...
      </div>
      <div v-else-if="settlementError" class="card text-center p-3xl text-danger mb-lg">
        <i class="fa-solid fa-triangle-exclamation mb-sm" style="font-size: 2rem;"></i>
        <p class="font-bold text-sm mb-xs">{{ settlementError }}</p>
        <button class="btn btn-sm btn-secondary" @click="loadPartnerData">ลองใหม่อีกครั้ง</button>
      </div>

      <!-- Content when Settlement Data is loaded -->
      <div v-else-if="settlementData" class="flex flex-col gap-lg">
        <!-- SUB-TAB 1: หุ้นส่วน (เปรียบเทียบ รายรับ vs รายจ่าย & สัดส่วนหุ้นส่วน) -->
        <div v-if="partnerSubTab === 'partners'" class="flex flex-col gap-lg">
          <!-- 4 Summary KPI Cards (Photo 2) -->
        <div class="financial-summary-grid">
          <!-- Card 1: Revenue -->
          <div class="summary-card revenue-card">
            <div class="summary-card-header">
              <span class="summary-icon"><i class="fa-solid fa-sack-dollar text-success"></i></span>
              <span class="summary-title">ยอดขาย/รายรับรวม</span>
            </div>
            <div class="summary-value text-success">฿{{ formatNumber(settlementData.total_sales) }}</div>
            <div class="summary-sub-badges">
              <span class="sub-badge">ยอดขายหน้าร้าน</span>
              <span class="sub-badge">{{ settlementData.period?.start_date }} ถึง {{ settlementData.period?.end_date }}</span>
            </div>
          </div>

          <!-- Card 2: Direct Store Expenses -->
          <div class="summary-card expense-card">
            <div class="summary-card-header">
              <span class="summary-icon"><i class="fa-solid fa-wallet text-danger"></i></span>
              <span class="summary-title">รายจ่ายรวมของสาขา</span>
            </div>
            <div class="summary-value text-danger">฿{{ formatNumber(settlementData.direct_store_expenses) }}</div>
            <div class="summary-sub-badges">
              <span class="sub-badge">ค่าไฟ/แก๊ส/แรงงาน</span>
              <span class="sub-badge">{{ settlementData.total_sales > 0 ? ((settlementData.direct_store_expenses / settlementData.total_sales) * 100).toFixed(1) : 0 }}%</span>
            </div>
          </div>

          <!-- Card 3: Central Kitchen Goods Cost -->
          <div class="summary-card waste-card">
            <div class="summary-card-header">
              <span class="summary-icon"><i class="fa-solid fa-boxes-packing text-warning"></i></span>
              <span class="summary-title">ต้นทุนเบิกจากครัวกลาง</span>
            </div>
            <div class="summary-value text-warning">฿{{ formatNumber(settlementData.central_kitchen_cost) }}</div>
            <div class="summary-sub-badges">
              <span class="sub-badge">ของที่เบิกเข้าสาขา</span>
              <span class="sub-badge">{{ settlementData.total_sales > 0 ? ((settlementData.central_kitchen_cost / settlementData.total_sales) * 100).toFixed(1) : 0 }}%</span>
            </div>
          </div>

          <!-- Card 4: Net Balance (Profit) -->
          <div class="summary-card net-card" :class="settlementData.net_profit >= 0 ? 'profit-positive' : 'profit-negative'">
            <div class="summary-card-header flex flex-between align-center">
              <div class="flex align-center gap-xs">
                <span class="summary-icon"><i class="fa-solid fa-scale-balanced" :class="settlementData.net_profit >= 0 ? 'text-primary' : 'text-danger'"></i></span>
                <span class="summary-title">คงเหลือสุทธิ (กำไรจริง)</span>
              </div>
              <span 
                class="badge font-bold" 
                :class="settlementData.net_profit >= 0 ? 'badge-success' : 'badge-danger'" 
                style="font-size: 10px; padding: 2px 7px; border-radius: var(--radius-sm); margin-left: auto;"
              >
                {{ settlementData.net_profit >= 0 ? 'กำไรสุทธิ' : 'ขาดทุนสุทธิ' }}
              </span>
            </div>
            <div class="summary-value" :class="settlementData.net_profit >= 0 ? 'text-primary' : 'text-danger'">
              ฿{{ formatNumber(settlementData.net_profit) }}
            </div>
            <div class="summary-formula-caption">รายรับ - รายจ่าย - ต้นทุนครัวกลาง</div>
          </div>
        </div>

        <!-- 2-Column Financial Grid (Photo 3 + Partner Configuration) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-lg">
          
          <!-- COLUMN 1: Revenue vs Expenses Comparison & Profit Allocation (Photo 3) -->
          <div class="card p-lg flex flex-col justify-between" style="background: #ffffff; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
            <div>
              <div class="card-title mb-lg flex align-start gap-xs" style="border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
                <i class="fa-solid fa-chart-simple text-primary" style="margin-top: 3px; font-size: 1.1rem;"></i> 
                <span class="font-bold text-base" style="color: var(--text-primary); line-height: 1.35;">
                  เปรียบเทียบ รายรับ vs รายจ่าย
                </span>
              </div>

              <div class="financial-bars-container flex flex-col gap-lg">
                <!-- Revenue Bar -->
                <div class="financial-bar-item">
                  <div class="flex flex-between align-center text-xs mb-xs" style="gap: 8px;">
                    <span class="font-bold text-success flex align-center gap-xs" style="white-space: nowrap;">
                      <i class="fa-solid fa-sack-dollar"></i> 
                      <span>รายรับรวม</span>
                    </span>
                    <span class="font-bold text-success text-sm" style="white-space: nowrap;">฿{{ formatNumber(settlementData.total_sales) }}</span>
                  </div>
                  <div class="progress-bar-bg" style="height: 14px;">
                    <div class="progress-bar-fill" style="width: 100%; background-color: var(--success, #2a9d8f);"></div>
                  </div>
                </div>

                <!-- Expenses Bar -->
                <div class="financial-bar-item">
                  <div class="flex flex-between align-center text-xs mb-xs" style="gap: 8px;">
                    <span class="font-bold text-danger flex align-center gap-xs" style="white-space: nowrap;">
                      <i class="fa-solid fa-wallet"></i> 
                      <span>รายจ่ายรวม</span>
                    </span>
                    <span class="font-bold text-danger text-sm" style="white-space: nowrap;">
                      ฿{{ formatNumber(settlementData.direct_store_expenses) }} 
                      <span class="text-secondary font-normal text-xs">({{ settlementData.total_sales > 0 ? ((settlementData.direct_store_expenses / settlementData.total_sales) * 100).toFixed(1) : 0 }}%)</span>
                    </span>
                  </div>
                  <div class="progress-bar-bg" style="height: 14px;">
                    <div 
                      class="progress-bar-fill" 
                      :style="{ 
                        width: (settlementData.total_sales > 0 ? Math.min((settlementData.direct_store_expenses / settlementData.total_sales) * 100, 100) : 0) + '%', 
                        backgroundColor: 'var(--danger, #ad281e)' 
                      }"
                    ></div>
                  </div>
                </div>

                <!-- Central Kitchen Cost Bar -->
                <div class="financial-bar-item">
                  <div class="flex flex-between align-center text-xs mb-xs" style="gap: 8px;">
                    <span class="font-bold text-warning flex align-center gap-xs" style="white-space: nowrap;">
                      <i class="fa-solid fa-boxes-packing"></i> 
                      <span>ต้นทุนเบิกจากครัวกลาง</span>
                    </span>
                    <span class="font-bold text-warning text-sm" style="white-space: nowrap;">
                      ฿{{ formatNumber(settlementData.central_kitchen_cost) }} 
                      <span class="text-secondary font-normal text-xs">({{ settlementData.total_sales > 0 ? ((settlementData.central_kitchen_cost / settlementData.total_sales) * 100).toFixed(1) : 0 }}%)</span>
                    </span>
                  </div>
                  <div class="progress-bar-bg" style="height: 14px;">
                    <div 
                      class="progress-bar-fill" 
                      :style="{ 
                        width: (settlementData.total_sales > 0 ? Math.min((settlementData.central_kitchen_cost / settlementData.total_sales) * 100, 100) : 0) + '%', 
                        backgroundColor: 'var(--accent, #ffab2b)' 
                      }"
                    ></div>
                  </div>
                </div>

                <!-- Net Result Card -->
                <div class="net-profit-card card p-md flex flex-between align-center flex-wrap gap-xs" :class="settlementData.net_profit >= 0 ? 'profit-box-positive' : 'profit-box-negative'">
                  <span class="font-bold text-sm flex align-center gap-xs" :class="settlementData.net_profit >= 0 ? 'text-success' : 'text-danger'" style="white-space: nowrap;">
                    <i :class="settlementData.net_profit >= 0 ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'"></i>
                    <span>คงเหลือสุทธิ (กำไรจริง)</span>
                  </span>
                  <span class="font-bold text-lg" :class="settlementData.net_profit >= 0 ? 'text-success' : 'text-danger'" style="white-space: nowrap;">
                    ฿{{ formatNumber(settlementData.net_profit) }}
                  </span>
                </div>

                <!-- Profit Sharing Allocation Section -->
                <div class="profit-sharing-section card p-md" style="background: rgba(139, 3, 19, 0.02); border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
                  <div class="flex align-center mb-sm">
                    <span class="font-bold text-xs flex align-center" style="color: var(--text-primary); gap: 8px;">
                      <i class="fa-solid fa-handshake-angle" style="color: var(--text-primary); font-size: 14px;"></i>
                      <span>การจัดสรรส่วนแบ่งกำไร</span>
                    </span>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-sm">
                    <div 
                      v-for="p in settlementData.partner_distributions" 
                      :key="p.id" 
                      class="card p-md flex flex-col justify-between" 
                      style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-sm); box-shadow: 0 1px 4px rgba(0,0,0,0.02);"
                    >
                      <div class="flex flex-between align-center text-xs text-secondary mb-xs">
                        <span class="font-bold flex align-center" style="gap: 8px; color: var(--text-primary);">
                          <i :class="p.is_owner ? 'fa-solid fa-store text-primary' : 'fa-solid fa-user-tie'" :style="{ color: p.is_owner ? 'var(--primary)' : '#cc8000', fontSize: '14px' }"></i> 
                          <span>{{ p.name }}</span>
                        </span>
                        <span 
                          class="badge font-bold" 
                          :style="{ 
                            background: p.is_owner ? 'rgba(139, 3, 19, 0.08)' : 'rgba(255, 171, 43, 0.18)', 
                            color: p.is_owner ? 'var(--primary)' : '#b26a00', 
                            padding: '2px 8px', 
                            borderRadius: '6px', 
                            fontSize: '11px' 
                          }"
                        >
                          {{ p.share_percentage }}%
                        </span>
                      </div>
                      <div 
                        class="font-bold my-xs" 
                        style="font-size: 1.45rem; line-height: 1.2;" 
                        :style="{ color: settlementData.net_profit < 0 ? 'var(--danger)' : (p.is_owner ? 'var(--primary)' : '#cc8000') }"
                      >
                        ฿{{ formatNumber(p.payout_amount) }}
                      </div>
                      <div class="text-xs text-tertiary mt-2xs font-medium">
                        {{ p.share_percentage }}% ของกำไรจริง ({{ p.is_owner ? 'เจ้าของหลัก' : 'ผู้ร่วมทุน' }})
                      </div>
                      <button 
                        v-if="settlementData.net_profit > 0" 
                        class="btn btn-primary btn-payout-partner w-full"
                        @click="openPayoutModal(p)"
                      >
                        <i class="fa-solid fa-paper-plane mr-1"></i> บันทึกจ่ายปันผล
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <!-- COLUMN 2: Partner Equity Settings Card -->
          <div class="card p-lg flex flex-col justify-between" style="background: #ffffff; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
            <div>
              <div class="card-title mb-lg flex flex-between align-center" style="border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
                <h4 class="font-bold text-base flex align-center gap-xs">
                  <i class="fa-solid fa-users-gear text-primary"></i>
                  <span>สัดส่วนหุ้นส่วนของสาขานี้</span>
                </h4>
                <button class="btn btn-sm btn-secondary" @click="addPartnerRow">
                  <i class="fa-solid fa-plus mr-1"></i> เพิ่มหุ้นส่วน
                </button>
              </div>

              <p class="text-secondary text-xs mb-md">
                กำหนดชื่อและสัดส่วนเปอร์เซ็นต์ (%) ของหุ้นส่วนในสาขานี้ ผลรวมทั้งหมดจะต้องเท่ากับ 100% พอดี
              </p>

              <!-- Partners Rows Input -->
              <div class="flex flex-col gap-sm mb-md">
                <div 
                  v-for="(partner, idx) in partnerList" 
                  :key="idx" 
                  class="flex align-center gap-sm p-sm rounded border bg-surface"
                  style="background: var(--card-bg);"
                >
                  <div class="flex-1">
                    <input 
                      type="text" 
                      v-model="partner.partner_name" 
                      placeholder="ชื่อหุ้นส่วน / ผู้ถือหุ้น" 
                      class="form-input text-sm w-full"
                    />
                  </div>

                  <div class="flex align-center gap-xs" style="min-width: 110px; justify-content: flex-end;">
                    <input 
                      type="number" 
                      v-model.number="partner.share_percentage" 
                      min="1" 
                      max="100" 
                      class="form-input text-sm text-center font-bold"
                      style="width: 80px; height: 38px; padding: 0 4px;"
                      placeholder="0"
                    />
                    <span class="font-bold text-sm text-secondary" style="min-width: 14px;">%</span>
                  </div>

                  <button 
                    v-if="partnerList.length > 1" 
                    class="btn btn-sm btn-icon text-danger" 
                    @click="removePartnerRow(idx)"
                    title="ลบแถวนี้"
                  >
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>

              <!-- Total Percentage Validation Row (No background, spacious & friendly) -->
              <div 
                class="flex flex-between align-center py-sm mb-lg" 
                :class="partnerSumPercentage === 100 ? 'text-success' : 'text-danger'"
                style="border-top: 1px dashed var(--border-color); margin-top: var(--space-xs);"
              >
                <span class="font-medium text-sm flex align-center gap-xs">
                  <i :class="partnerSumPercentage === 100 ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'"></i>
                  <span>ผลรวมสัดส่วนทั้งหมด:</span>
                </span>
                <span class="font-bold text-base">
                  {{ partnerSumPercentage }}% / 100%
                </span>
              </div>
            </div>

            <!-- Save Button -->
            <button 
              class="btn btn-primary w-full py-md font-bold"
              :disabled="partnerSumPercentage !== 100"
              @click="savePartnersConfig"
            >
              <i class="fa-solid fa-floppy-disk mr-1"></i> บันทึกสัดส่วนหุ้นส่วน
            </button>
          </div>
        </div>

        </div>
        <!-- End of Sub-Tab 1: หุ้นส่วน -->

        <!-- SUB-TAB 2: ประวัติปันผล (ประวัติการจ่ายเงินปันผลจริง) -->
        <div v-else-if="partnerSubTab === 'payout_history'" class="flex flex-col gap-lg">
          <!-- Summary Cards for Payouts -->
          <div class="financial-summary-grid">
            <div class="summary-card" style="border-left: 4px solid var(--primary);">
              <div class="summary-card-header">
                <span class="summary-icon"><i class="fa-solid fa-coins text-primary"></i></span>
                <span class="summary-title">ยอดเงินปันผลจ่ายจริงสะสม</span>
              </div>
              <div class="summary-value text-primary">
                ฿{{ formatNumber(settlementData.payouts?.reduce((sum, p) => sum + Number(p.payout_amount || p.amount || 0), 0) || 0) }}
              </div>
              <div class="summary-sub-badges">
                <span class="sub-badge">สาขา: {{ selectedPartnerBranchName }}</span>
              </div>
            </div>

            <div class="summary-card" style="border-left: 4px solid var(--success, #2a9d8f);">
              <div class="summary-card-header">
                <span class="summary-icon"><i class="fa-solid fa-receipt text-success"></i></span>
                <span class="summary-title">จำนวนครั้งที่จ่ายปันผล</span>
              </div>
              <div class="summary-value text-success">
                {{ settlementData.payouts?.length || 0 }} <span style="font-size: 1rem; font-weight: normal; color: var(--text-secondary);">ครั้ง</span>
              </div>
              <div class="summary-sub-badges">
                <span class="sub-badge">บันทึกสำเร็จทั้งหมด</span>
              </div>
            </div>

            <div class="summary-card" style="border-left: 4px solid var(--accent, #ffab2b);">
              <div class="summary-card-header">
                <span class="summary-icon"><i class="fa-solid fa-scale-balanced text-warning"></i></span>
                <span class="summary-title">กำไรจริงงวดปัจจุบัน</span>
              </div>
              <div class="summary-value" :class="settlementData.net_profit >= 0 ? 'text-primary' : 'text-danger'">
                ฿{{ formatNumber(settlementData.net_profit) }}
              </div>
              <div class="summary-sub-badges">
                <span class="sub-badge">{{ settlementData.net_profit >= 0 ? 'พร้อมจัดสรรปันผล' : 'ขาดทุนสุทธิ' }}</span>
              </div>
            </div>
          </div>

          <!-- Main Payouts History Card -->
          <div class="card p-lg" style="background: #ffffff; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
            <div class="card-title mb-lg flex flex-between align-center" style="border-bottom: 1px solid var(--border-color); padding-bottom: 14px; flex-wrap: wrap; gap: var(--space-sm);">
              <div class="flex align-start gap-xs">
                <i class="fa-solid fa-file-invoice-dollar text-primary" style="margin-top: 3px; font-size: 1.2rem;"></i>
                <div>
                  <div class="font-bold text-base" style="color: var(--text-primary); line-height: 1.35;">
                    ประวัติการจ่ายเงินปันผลจริง
                  </div>
                  <div class="text-secondary text-xs font-normal mt-2xs">
                    บันทึกการโอนเงินปันผลให้แก่เจ้าของและหุ้นส่วนของ {{ selectedPartnerBranchName }}
                  </div>
                </div>
              </div>

              <button 
                class="btn btn-primary font-bold"
                style="padding: 8px 18px; border-radius: var(--radius-md);"
                @click="openPayoutModal()"
              >
                <i class="fa-solid fa-paper-plane mr-1"></i> จ่ายปันผล
              </button>
            </div>

            <!-- Empty State -->
            <div v-if="!settlementData.payouts || settlementData.payouts.length === 0" class="empty-state-box p-3xl text-center">
              <div class="empty-state-icon mb-sm" style="font-size: 2.5rem; color: var(--text-tertiary);">
                <i class="fa-solid fa-receipt"></i>
              </div>
              <div class="font-bold text-base text-main mb-xs">ยังไม่มีประวัติการจ่ายเงินปันผล</div>
              <div class="text-secondary text-xs mb-md">ยังไม่มีการบันทึกการจ่ายเงินปันผลให้แก่หุ้นส่วนของสาขานี้</div>
              <button 
                v-if="settlementData.net_profit > 0"
                class="btn btn-primary btn-sm font-bold"
                @click="openPayoutModal()"
              >
                <i class="fa-solid fa-plus mr-1"></i> บันทึกจ่ายปันผลครั้งแรก
              </button>
            </div>

            <!-- Payouts Table / List -->
            <div v-else>
              <!-- Desktop Table View -->
              <div class="desktop-payout-table overflow-x-auto">
                <table class="table w-full text-left" style="border-collapse: collapse;">
                  <thead>
                    <tr class="text-secondary text-xs" style="border-bottom: 2px solid var(--border-color); background: var(--bg-secondary);">
                      <th class="p-md font-semibold">วันที่ / เวลาทำรายการ</th>
                      <th class="p-md font-semibold">หุ้นส่วนที่ได้รับปันผล</th>
                      <th class="p-md font-semibold">สถานะ</th>
                      <th class="p-md font-semibold">หมายเหตุ / ช่องทางโอน</th>
                      <th class="p-md font-semibold text-right">ยอดเงินปันผล</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr 
                      v-for="po in settlementData.payouts" 
                      :key="po.id"
                      style="border-bottom: 1px solid var(--border-color);"
                    >
                      <td class="p-md text-sm text-secondary">
                        <i class="fa-regular fa-clock text-muted mr-1"></i>
                        {{ formatDateTime(po.paid_at || po.payout_date || po.created_at) }}
                      </td>
                      <td class="p-md font-bold text-sm text-main">
                        <i class="fa-solid fa-user-check text-success mr-1"></i>
                        {{ po.partner_name }}
                      </td>
                      <td class="p-md">
                        <span class="badge badge-success text-xs font-bold" style="padding: 3px 8px; border-radius: var(--radius-sm);">
                          <i class="fa-solid fa-check mr-1"></i> ชำระแล้ว
                        </span>
                      </td>
                      <td class="p-md text-xs text-secondary">
                        {{ po.note || '-' }}
                      </td>
                      <td class="p-md text-right font-bold text-primary text-base">
                        ฿{{ formatNumber(po.payout_amount || po.amount) }}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr class="font-bold" style="border-top: 2px solid var(--border-color); background: var(--bg-secondary);">
                      <td colspan="4" class="p-md text-right text-sm text-secondary">รวมยอดเงินปันผลที่จ่ายจริงแล้วทั้งหมด:</td>
                      <td class="p-md text-right text-lg text-primary">
                        ฿{{ formatNumber(settlementData.payouts.reduce((sum, p) => sum + Number(p.payout_amount || p.amount || 0), 0)) }}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <!-- Mobile Card List View -->
              <div class="mobile-payout-list flex flex-col gap-sm">
                <div 
                  v-for="po in settlementData.payouts" 
                  :key="'mob_' + po.id"
                  class="p-md rounded border flex flex-col gap-xs"
                  style="background: var(--bg-secondary); border: 1px solid var(--border-color);"
                >
                  <div class="flex flex-between align-center">
                    <span class="font-bold text-sm text-main">
                      <i class="fa-solid fa-user-check text-success mr-1"></i>
                      {{ po.partner_name }}
                    </span>
                    <span class="font-bold text-primary text-base">
                      ฿{{ formatNumber(po.payout_amount || po.amount) }}
                    </span>
                  </div>
                  <div class="flex flex-between align-center text-xs text-secondary pt-xs" style="border-top: 1px dashed var(--border-color);">
                    <span>
                      <i class="fa-regular fa-clock mr-1"></i>
                      {{ formatDateTime(po.paid_at || po.payout_date || po.created_at) }}
                    </span>
                    <span class="badge badge-success text-2xs font-bold" style="padding: 2px 6px;">
                      ชำระแล้ว
                    </span>
                  </div>
                  <div v-if="po.note" class="text-xs text-secondary mt-2xs">
                    <i class="fa-solid fa-comment-dots text-muted mr-1"></i>
                    {{ po.note }}
                  </div>
                </div>
              </div>
            </div>

            <div class="text-2xs text-tertiary mt-lg text-right">
              * ข้อมูลปันผลอิงตามงบกำไรสุทธิจริง
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ────────────────────────────────────────────────────────── -->
    <!-- MODAL: สร้าง / แก้ไข สินค้าในครัวกลาง -->
    <!-- ────────────────────────────────────────────────────────── -->
    <div v-if="showItemModal" class="modal-container active">
      <div class="modal-overlay" @click="showItemModal = false"></div>
      <div class="modal-content modal-center w-full max-w-md" style="position:relative; z-index:2; overflow-y:auto; max-height:85dvh;">
        <div class="modal-header">
          <h3>
            <i :class="editingItem ? 'fa-solid fa-pen-to-square' : 'fa-solid fa-plus'" style="margin-right: 6px;"></i>
            {{ editingItem ? 'แก้ไขรายการ' : 'เพิ่มของใหม่ด้วยตนเอง' }}
          </h3>
          <button class="modal-close" @click="showItemModal = false">✕</button>
        </div>
        <div class="modal-body">
          <!-- Item Name -->
          <div class="form-group">
            <label class="form-label font-bold">ชื่อสินค้า/วัตถุดิบ *</label>
            <input 
              type="text" 
              class="form-input" 
              v-model="itemForm.name" 
              placeholder="เช่น ซอสมะเขือเทศ (1kg), ถุงหูหิ้ว" 
            />
          </div>

          <!-- Cost Price -->
          <div class="form-group">
            <label class="form-label font-bold">ราคาทุนต่อหน่วย (บาท) *</label>
            <input 
              type="number" 
              class="form-input" 
              v-model.number="itemForm.cost_price" 
              placeholder="เช่น 25" 
              min="0" 
              step="0.5" 
            />
          </div>

          <!-- Category Selector -->
          <div class="form-group">
            <label class="form-label font-bold">หมวดหมู่สินค้า *</label>
            <div class="custom-select-wrapper" @click.stop>
              <div 
                class="custom-select-trigger" 
                :class="{ 'active': isCategoryModalDropdownOpen }" 
                @click="isCategoryModalDropdownOpen = !isCategoryModalDropdownOpen"
              >
                <span class="custom-select-text">
                  {{ itemModalCategoryLabel }}
                </span>
              </div>
              <div v-if="isCategoryModalDropdownOpen" class="custom-select-dropdown">
                <div 
                  v-for="cat in itemModalCategories" 
                  :key="cat.id" 
                  class="custom-select-option"
                  :class="{ 'selected': cat.id === itemForm.category }"
                  @click="itemForm.category = cat.id; isCategoryModalDropdownOpen = false;"
                >
                  <i :class="cat.icon" style="margin-right: 6px; width: 16px;"></i>
                  {{ cat.label }}
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
                :class="{ 'active': isUomModalDropdownOpen }" 
                @click="isUomModalDropdownOpen = !isUomModalDropdownOpen"
              >
                <span class="custom-select-text">
                  {{ itemForm.unit || 'ชิ้น' }}
                </span>
              </div>
              <div v-if="isUomModalDropdownOpen" class="custom-select-dropdown">
                <div 
                  v-for="u in kitchenUnits" 
                  :key="u" 
                  class="custom-select-option"
                  :class="{ 'selected': u === itemForm.unit }"
                  @click="itemForm.unit = u; isUomModalDropdownOpen = false;"
                >
                  {{ u }}
                </div>
              </div>
            </div>
          </div>

          <!-- Stock & Alert Threshold -->
          <div v-if="!editingItem" class="grid grid-cols-2 gap-md">
            <div class="form-group">
              <label class="form-label font-bold">สต็อกเริ่มต้น</label>
              <input 
                type="number" 
                class="form-input" 
                v-model.number="itemForm.quantity" 
                min="0" 
                placeholder="0" 
              />
            </div>
            <div class="form-group">
              <label class="form-label font-bold">แจ้งเตือนเมื่อต่ำกว่า</label>
              <input 
                type="number" 
                class="form-input" 
                v-model.number="itemForm.min_stock_alert" 
                min="0" 
                placeholder="10" 
              />
            </div>
          </div>
          <div v-else class="form-group">
            <label class="form-label font-bold">แจ้งเตือนเมื่อสต็อกต่ำกว่า</label>
            <input 
              type="number" 
              class="form-input" 
              v-model.number="itemForm.min_stock_alert" 
              min="0" 
              placeholder="10" 
            />
          </div>

          <!-- Image URL / Upload -->
          <div class="form-group">
            <label class="form-label font-bold">รูปภาพสินค้า</label>
            <div style="display: flex; gap: var(--space-sm); margin-bottom: var(--space-xs);">
              <input 
                type="text" 
                class="form-input flex-1" 
                v-model="itemForm.image_url" 
                placeholder="ใส่ URL รูปภาพ หรือวางรูปภาพ..." 
                @paste="handlePasteImage" 
              />
              <button 
                type="button" 
                class="btn-upload" 
                @click="triggerFileInput"
              >
                <i class="fa-solid fa-image"></i> อัปโหลดภาพ
              </button>
            </div>
            <input 
              type="file" 
              ref="fileInputRef" 
              style="display: none;" 
              accept="image/*" 
              @change="handleFileChange" 
            />
            <span class="text-xs text-muted" style="display: block; margin-top: 2px; text-align: left;">
              <i class="fa-regular fa-lightbulb" style="color: var(--primary); margin-right: 4px;"></i> สามารถเลือกไฟล์, วางลิงก์รูปภาพ หรือคัดลอกรูปภาพแล้วกดวาง (Ctrl+V) ในช่องด้านบนได้
            </span>
          </div>

          <!-- Image Preview in Form -->
          <div v-if="itemForm.image_url" class="form-group flex justify-center">
            <div style="width: 100%; max-width: 200px; height: 130px; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; background: var(--bg-secondary);">
              <img :src="itemForm.image_url" alt="พรีวิว" style="width: 100%; height: 100%; object-fit: cover;" @error="handleImageError" />
            </div>
          </div>

          <!-- POS Auto-Restock Linking -->
          <div class="form-group border-t pt-md mt-md">
            <div class="flex flex-between align-center mb-xs">
              <label class="form-label font-bold flex align-center gap-xs mb-0">
                <i class="fa-solid fa-link text-primary"></i>
                <span class="desktop-only">ผูกกับเมนูใน POS (สำหรับเติมสต็อกอัตโนมัติเมื่อเบิก/จ่าย)</span>
                <span class="mobile-only">ผูกกับเมนู POS (เติมสต็อกอัตโนมัติ)</span>
              </label>
              <span v-if="itemForm.linked_menu_item_name" class="badge badge-success text-2xs" style="font-size: 11px; padding: 2px 8px; flex-shrink: 0;">
                <i class="fa-solid fa-check"></i> ผูกแล้ว
              </span>
              <span v-else class="badge badge-secondary text-2xs" style="font-size: 11px; padding: 2px 8px; flex-shrink: 0;">
                ไม่ผูก (เว้นว่าง)
              </span>
            </div>

            <!-- 1. Dropdown เลือกเมนูใน POS (ใช้ Global CSS custom-select) -->
            <div class="custom-select-wrapper" @click.stop>
              <div 
                class="custom-select-trigger" 
                :class="{ 'active': isPosMenuModalDropdownOpen }" 
                @click="isPosMenuModalDropdownOpen = !isPosMenuModalDropdownOpen"
              >
                <span class="custom-select-text">
                  <template v-if="itemForm.linked_menu_item_name">
                    <i class="fa-solid fa-link text-primary" style="margin-right: 6px;"></i>
                    {{ itemForm.linked_menu_item_name }}
                  </template>
                  <template v-else>
                    <span class="text-muted desktop-only">-- ไม่ผูกกับเมนู POS (ไม่เติมสต็อกอัตโนมัติ) --</span>
                    <span class="text-muted mobile-only">-- ไม่ผูกกับเมนู POS --</span>
                  </template>
                </span>
              </div>
              <div v-if="isPosMenuModalDropdownOpen" class="custom-select-dropdown" style="max-height: 250px; overflow-y: auto;">
                <div 
                  class="custom-select-option"
                  :class="{ 'selected': !itemForm.linked_menu_item_name }"
                  @click="itemForm.linked_menu_item_name = ''; isPosMenuModalDropdownOpen = false;"
                >
                  <i class="fa-solid fa-ban text-muted" style="margin-right: 6px; width: 16px;"></i>
                  <span>-- ไม่ผูกกับเมนู POS (ไม่เติมสต็อก) --</span>
                </div>

                <template v-for="(groupItems, categoryName) in groupedPosMenuItems" :key="categoryName">
                  <div class="custom-select-group-header">
                    📁 หมวด {{ categoryName }}
                  </div>
                  <div 
                    v-for="menu in groupItems" 
                    :key="menu.name" 
                    class="custom-select-option"
                    :class="{ 'selected': menu.name === itemForm.linked_menu_item_name }"
                    @click="itemForm.linked_menu_item_name = menu.name; isPosMenuModalDropdownOpen = false;"
                    style="padding-left: 24px;"
                  >
                    {{ menu.name }}
                  </div>
                </template>
              </div>
            </div>

            <!-- 2. ปุ่มเลือกว่าจะเติมอยู่ใน ประเภทสด หรือ พร้อมทาน (สไตล์ปุ่ม ไม่มีรูเช็คถูก) -->
            <div v-if="itemForm.linked_menu_item_name" class="stock-type-selector mt-sm">
              <label class="text-xs font-bold text-secondary block mb-xs">
                <span class="desktop-only">เลือกประเภทสต็อกที่จะเติมเข้าเมนู "{{ itemForm.linked_menu_item_name }}":</span>
                <span class="mobile-only">ประเภทสต็อกที่เติม:</span>
              </label>
              <div class="grid grid-2 gap-sm">
                <!-- ปุ่มสต็อกของสด -->
                <button 
                  type="button" 
                  class="btn-stock-choice"
                  :class="{ 'active': itemForm.target_stock_type === 'raw' }"
                  @click="itemForm.target_stock_type = 'raw'"
                >
                  <span class="btn-stock-choice-title">🥩 ประเภทสด</span>
                  <span class="btn-stock-choice-sub desktop-only">ของสด/ดิบ (raw_quantity) นำไปหมัก/ปรุงต่อ</span>
                  <span class="btn-stock-choice-sub mobile-only">ของดิบ (raw_quantity)</span>
                </button>

                <!-- ปุ่มสต็อกพร้อมทาน -->
                <button 
                  type="button" 
                  class="btn-stock-choice"
                  :class="{ 'active': itemForm.target_stock_type === 'ready' }"
                  @click="itemForm.target_stock_type = 'ready'"
                >
                  <span class="btn-stock-choice-title">🍗 พร้อมทาน</span>
                  <span class="btn-stock-choice-sub desktop-only">พร้อมขาย (quantity) หน้าร้านกดขายได้เลย</span>
                  <span class="btn-stock-choice-sub mobile-only">พร้อมขาย (quantity)</span>
                </button>
              </div>

              <!-- 3. อัตราแปลงหน่วยเข้าสต็อกหน้าร้าน (Unit Conversion) -->
              <div class="conversion-rate-box mt-sm p-sm rounded" style="background: var(--bg-secondary); border: 1px solid var(--border-color);">
                <label class="text-xs font-bold text-secondary block mb-xs">
                  <i class="fa-solid fa-arrows-rotate text-primary mr-1"></i>
                  อัตราแปลงหน่วยเข้าสต็อกหน้าร้าน (1 {{ itemForm.unit || 'หน่วย' }} = กี่ชิ้น):
                </label>
                <div class="flex align-center gap-xs flex-wrap">
                  <span class="font-bold text-sm">1 {{ itemForm.unit || 'หน่วย' }}</span>
                  <span class="text-xs text-muted font-bold">=</span>
                  <div style="width: 100px;">
                    <input 
                      type="number" 
                      v-model.number="itemForm.pack_size" 
                      min="1" 
                      step="any"
                      class="form-input text-center font-bold text-sm" 
                      style="height: 36px; padding: 4px;"
                      placeholder="1"
                    />
                  </div>
                  <span class="font-bold text-sm text-primary">ชิ้น (เข้าหน้าร้าน)</span>
                </div>
                <div class="text-2xs text-secondary mt-xs flex align-center gap-xs">
                  <i class="fa-solid fa-lightbulb text-warning flex-shrink-0"></i>
                  <span>
                    ตัวอย่าง: เบิก 1 {{ itemForm.unit || 'หน่วย' }} = เพิ่มสต็อกหน้าร้าน <strong>{{ Number(itemForm.pack_size || 1) }}</strong> ชิ้น
                    <template v-if="Number(itemForm.pack_size || 1) > 1">
                      (เช่น เบิก 6 {{ itemForm.unit || 'หน่วย' }} = เติมสต็อก {{ Number(itemForm.pack_size || 1) * 6 }} ชิ้น)
                    </template>
                  </span>
                </div>
              </div>

              <div class="stock-sync-alert mt-xs">
                <i class="fa-solid fa-circle-info text-info flex-shrink-0"></i>
                <span class="desktop-only">เมื่อครัวกลางจ่ายของให้สาขา ระบบจะคำนวณตามอัตราแปลงหน่วยและเติมสต็อกเมนูนี้ที่สาขาให้อัตโนมัติ</span>
                <span class="mobile-only">เมื่อจ่ายของ จะคำนวณแปลงหน่วยและเติมสต็อกเมนูนี้ให้สาขาอัตโนมัติ</span>
              </div>
            </div>

            <!-- ข้อมูลอธิบายเมื่อเว้นว่าง (ไม่ผูกกับเมนู) -->
            <div v-else class="stock-sync-empty-note mt-xs">
              <div class="flex align-center gap-xs text-xs font-bold text-secondary mb-1">
                <i class="fa-regular fa-circle-question text-primary"></i>
                <span>เมื่อเว้นว่าง (ไม่ผูกเมนู)</span>
              </div>
              <p class="text-2xs text-muted mb-0 desktop-only">
                เมื่อเบิกจ่าย ระบบจะ<strong>หักเฉพาะสต็อกครัวกลาง</strong> และบันทึกเป็น<strong>รายจ่ายสาขา</strong>ตามปกติ โดย<strong>ไม่มีการแตะต้องสต็อกเมนู POS</strong> ของสาขา (เหมาะสำหรับ บรรจุภัณฑ์, ถุงหิ้ว, ของใช้ทั่วไป, อุปกรณ์ หรือวัตถุดิบรวม)
              </p>
              <p class="text-2xs text-muted mb-0 mobile-only">
                ระบบจะตัดสต็อกครัวกลาง และบันทึกรายจ่ายสาขา โดย<strong>ไม่แตะสต็อก POS</strong> (เหมาะกับของใช้, บรรจุภัณฑ์)
              </p>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex justify-end gap-md mt-xl">
            <button class="btn-modal btn-modal-secondary" :disabled="isSavingItem" @click="showItemModal = false">ยกเลิก</button>
            <button 
              class="btn-modal btn-modal-primary" 
              :disabled="isSavingItem || !itemForm.name?.trim()"
              @click="saveItem"
            >
              <i v-if="isSavingItem" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-floppy-disk"></i>
              {{ isSavingItem ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ────────────────────────────────────────────────────────── -->
    <!-- MODAL: เติมสต็อกด่วน (Quick Restock) -->
    <!-- ────────────────────────────────────────────────────────── -->
    <div v-if="showRestockModal" class="modal-container active">
      <div class="modal-overlay" @click="showRestockModal = false"></div>
      <div class="modal-content modal-center w-full max-w-md" style="position:relative; z-index:2; overflow-y:auto; max-height:85dvh;">
        <div class="modal-header">
          <h3>
            <i class="fa-solid fa-circle-plus text-success" style="margin-right: 6px;"></i>
            เติมสต็อกด่วน
          </h3>
          <button class="modal-close" @click="showRestockModal = false">✕</button>
        </div>

        <div class="modal-body">
          <!-- กล่องข้อมูลสินค้า: โปร่ง สบายตา ไม่ชิดขอบ -->
          <div class="modal-item-summary-card mb-md">
            <div class="modal-item-summary-name">
              <span class="modal-item-summary-label">สินค้า:</span>
              <span class="modal-item-summary-title">{{ activeRestockItem?.name }}</span>
            </div>
            <div class="modal-item-summary-stock">
              <i class="fa-solid fa-cubes-stacked text-tertiary"></i>
              <span>สต็อกปัจจุบัน:</span>
              <strong class="text-main">{{ activeRestockItem?.quantity }} {{ activeRestockItem?.unit }}</strong>
            </div>
          </div>

          <div class="form-group mb-md">
            <label class="form-label font-bold text-sm">จำนวนที่ซื้อมาเพิ่ม *</label>
            <div class="flex align-center gap-xs">
              <input 
                type="number" 
                v-model.number="restockForm.quantity_added" 
                placeholder="เช่น 10" 
                class="form-input font-bold text-lg text-success flex-1" 
                min="1"
              />
              <span class="font-bold text-sm text-secondary">{{ activeRestockItem?.unit }}</span>
            </div>
          </div>

          <div class="form-group mb-md">
            <label class="form-label font-bold text-sm">ราคาทุนต่อหน่วยรอบนี้ (บาท)</label>
            <input 
              type="number" 
              v-model.number="restockForm.unit_cost" 
              step="0.5" 
              class="form-input w-full" 
            />
          </div>

          <div class="form-group mb-md">
            <label class="form-label font-bold text-sm">หมายเหตุ / แหล่งซื้อ</label>
            <input 
              type="text" 
              v-model="restockForm.supplier_note" 
              placeholder="เช่น ซื้อจากแม็คโคร, ล็อต 13/10" 
              class="form-input w-full" 
            />
          </div>

          <!-- กล่องสรุปยอดเงินรวม: โปร่ง มีพื้นที่หายใจ ตัวเลขและข้อความไม่ชิดขอบ -->
          <div class="modal-total-summary-box mb-lg">
            <div class="modal-total-label">
              <i class="fa-solid fa-receipt mr-1 text-primary"></i>
              <span>ยอดเงินรวมที่จ่ายซื้อ:</span>
            </div>
            <div class="modal-total-amount text-primary">
              ฿{{ formatNumber((restockForm.quantity_added || 0) * (restockForm.unit_cost || 0)) }}
            </div>
          </div>

          <div class="flex gap-md mt-xl">
            <button class="btn-modal btn-modal-secondary flex-1" @click="showRestockModal = false">ยกเลิก</button>
            <button class="btn-modal btn-modal-primary flex-1" @click="submitQuickRestock">
              <i class="fa-solid fa-check"></i> ยืนยันการเติมสต็อก
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ────────────────────────────────────────────────────────── -->
    <!-- MODAL: รายการเดินบัญชีกองกลาง (เติมทุน / ค่าใช้จ่ายครัวกลาง) -->
    <!-- ────────────────────────────────────────────────────────── -->
    <div v-if="showTransactionModal" class="modal-container active">
      <div class="modal-overlay" @click="showTransactionModal = false"></div>
      <div class="modal-content modal-center w-full max-w-md" style="position:relative; z-index:2; overflow-y:auto; max-height:85dvh;">
        <div class="modal-header">
          <h3>
            <i :class="transactionForm.type === 'capital_in' ? 'fa-solid fa-circle-plus text-success' : 'fa-solid fa-circle-minus text-danger'" style="margin-right: 8px;"></i>
            {{ transactionForm.type === 'capital_in' ? 'เติมเงินทุนกองกลาง' : 'จ่ายค่าใช้จ่ายครัวกลาง' }}
          </h3>
          <button class="modal-close" @click="showTransactionModal = false">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-group mb-md">
            <label class="form-label font-bold text-sm">ประเภทรายการ *</label>
            <div class="custom-select-wrapper" @click.stop>
              <div 
                class="custom-select-trigger" 
                :class="{ 'active': isTransactionTypeDropdownOpen }" 
                @click="isTransactionTypeDropdownOpen = !isTransactionTypeDropdownOpen"
              >
                <div class="flex align-center gap-xs">
                  <i :class="transactionForm.type === 'capital_in' ? 'fa-solid fa-circle-plus text-success' : 'fa-solid fa-circle-minus text-danger'" style="width: 16px;"></i>
                  <span class="custom-select-text font-bold">
                    {{ transactionForm.type === 'capital_in' ? 'เติมเงินทุนกองกลาง' : 'ค่าใช้จ่ายครัวกลาง' }}
                  </span>
                </div>
              </div>
              <div v-if="isTransactionTypeDropdownOpen" class="custom-select-dropdown">
                <div 
                  class="custom-select-option transaction-dropdown-option"
                  :class="{ 'selected': transactionForm.type === 'capital_in' }"
                  @click="transactionForm.type = 'capital_in'; isTransactionTypeDropdownOpen = false;"
                >
                  <div class="flex align-center gap-xs font-bold">
                    <i class="fa-solid fa-circle-plus text-success" :class="{ 'text-white': transactionForm.type === 'capital_in' }" style="width: 16px;"></i>
                    <span>เติมเงินทุนกองกลาง</span>
                  </div>
                  <div class="dropdown-subtext" :class="transactionForm.type === 'capital_in' ? 'text-white opacity-90' : 'text-secondary'">
                    เงินทุนตั้งต้น / เงินสำรองหมุนเวียนจากเจ้าของร้าน
                  </div>
                </div>

                <div 
                  class="custom-select-option transaction-dropdown-option"
                  :class="{ 'selected': transactionForm.type === 'operating_expense_out' }"
                  @click="transactionForm.type = 'operating_expense_out'; isTransactionTypeDropdownOpen = false;"
                >
                  <div class="flex align-center gap-xs font-bold">
                    <i class="fa-solid fa-circle-minus text-danger" :class="{ 'text-white': transactionForm.type === 'operating_expense_out' }" style="width: 16px;"></i>
                    <span>ค่าใช้จ่ายครัวกลาง</span>
                  </div>
                  <div class="dropdown-subtext" :class="transactionForm.type === 'operating_expense_out' ? 'text-white opacity-90' : 'text-secondary'">
                    จ่ายค่าไฟ, ค่าเช่าโกดัง, ค่าจ้างคนส่งของ หรือค่าซ่อมบำรุง
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="form-group mb-md">
            <label class="form-label font-bold text-sm">จำนวนเงิน *</label>
            <input 
              type="number" 
              v-model.number="transactionForm.amount" 
              placeholder="0.00" 
              class="form-input font-bold text-lg w-full" 
              :class="transactionForm.type === 'capital_in' ? 'text-success' : 'text-danger'"
              min="1"
            />
          </div>

          <div class="form-group mb-lg">
            <label class="form-label font-bold text-sm">บันทึกช่วยจำ / รายละเอียด</label>
            <textarea 
              v-model="transactionForm.note" 
              rows="2" 
              placeholder="เช่น เติมทุนสำรองซื้อของสด, จ่ายค่าไฟโกดังครัวกลาง"
              class="form-input w-full"
            ></textarea>
          </div>

          <div class="flex gap-md mt-xl">
            <button class="btn-modal btn-modal-secondary flex-1" :disabled="isSavingTransaction" @click="showTransactionModal = false">ยกเลิก</button>
            <button class="btn-modal btn-modal-primary flex-1" :disabled="isSavingTransaction" @click="submitTransaction">
              <i v-if="isSavingTransaction" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-check"></i>
              {{ isSavingTransaction ? 'กำลังบันทึก...' : 'บันทึกรายการ' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ────────────────────────────────────────────────────────── -->
    <!-- MODAL: ตัดของเสีย / หมดอายุ (Waste Tracking) -->
    <!-- ────────────────────────────────────────────────────────── -->
    <div v-if="showWasteModal" class="modal-container active">
      <div class="modal-overlay" @click="showWasteModal = false"></div>
      <div class="modal-content modal-center w-full max-w-md" style="position:relative; z-index:2; overflow-y:auto; max-height:85dvh;">
        <div class="modal-header">
          <h3>
            <i class="fa-solid fa-trash-can text-danger" style="margin-right: 6px;"></i>
            ตัดของเสีย / หมดอายุ
          </h3>
          <button class="modal-close" @click="showWasteModal = false">✕</button>
        </div>

        <div class="modal-body">
          <!-- กล่องข้อมูลสินค้า: โปร่ง สบายตา ไม่ชิดขอบ -->
          <div class="modal-item-summary-card mb-md">
            <div class="modal-item-summary-name">
              <span class="modal-item-summary-label">สินค้า:</span>
              <span class="modal-item-summary-title">{{ activeWasteItem?.name }}</span>
            </div>
            <div class="modal-item-summary-stock">
              <i class="fa-solid fa-cubes-stacked text-tertiary"></i>
              <span>คงเหลือในครัวกลาง:</span>
              <strong class="text-main">{{ activeWasteItem?.quantity }} {{ activeWasteItem?.unit }}</strong>
            </div>
          </div>

          <div class="form-group mb-md">
            <label class="form-label font-bold text-sm">จำนวนที่ตัดทิ้ง *</label>
            <div class="flex align-center gap-xs">
              <input 
                type="number" 
                v-model.number="wasteForm.quantity_wasted" 
                placeholder="เช่น 2" 
                class="form-input font-bold text-lg text-danger flex-1" 
                min="0.01"
                :max="activeWasteItem?.quantity"
              />
              <span class="font-bold text-sm text-secondary">{{ activeWasteItem?.unit }}</span>
            </div>
          </div>

          <div class="form-group mb-md">
            <label class="form-label font-bold text-sm">สาเหตุที่ตัดทิ้ง *</label>
            <select v-model="wasteForm.reason" class="form-select w-full font-bold">
              <option value="expired">หมดอายุ / เน่าเสีย</option>
              <option value="damaged">แตกหัก / ชำรุดเสียหาย</option>
              <option value="lost">สูญหาย / นับสต็อกไม่ตรง</option>
              <option value="other">อื่นๆ</option>
            </select>
          </div>

          <div class="form-group mb-lg">
            <label class="form-label font-bold text-sm">หมายเหตุเพิ่มเติม</label>
            <input 
              type="text" 
              v-model="wasteForm.note" 
              placeholder="เช่น ลืมแช่ตู้เย็น, ถุงฉีกขาด" 
              class="form-input w-full" 
            />
          </div>

          <!-- กล่องสรุปมูลค่าความเสียหาย: โปร่ง มีพื้นที่หายใจ ตัวเลขและข้อความไม่ชิดขอบ -->
          <div class="modal-total-summary-box modal-total-waste mb-lg">
            <div class="modal-total-label text-danger">
              <i class="fa-solid fa-triangle-exclamation mr-1 text-danger"></i>
              <span>มูลค่าความเสียหาย:</span>
            </div>
            <div class="modal-total-amount text-danger">
              ฿{{ formatNumber((wasteForm.quantity_wasted || 0) * (activeWasteItem?.cost_price || 0)) }}
            </div>
          </div>

          <div class="flex gap-md mt-xl">
            <button class="btn-modal btn-modal-secondary flex-1" :disabled="isSavingWaste" @click="showWasteModal = false">ยกเลิก</button>
            <button class="btn-modal btn-modal-primary flex-1" :disabled="isSavingWaste" @click="submitWaste">
              <i v-if="isSavingWaste" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-trash-can"></i>
              {{ isSavingWaste ? 'กำลังตัดสต็อก...' : 'ยืนยันตัดของเสีย' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ────────────────────────────────────────────────────────── -->
    <!-- MODAL: เคลียร์โอนเงินคืนครัวกลาง (Reimburse Branch Modal) -->
    <!-- ────────────────────────────────────────────────────────── -->
    <div v-if="showReimburseModal" class="modal-container active">
      <div class="modal-overlay" @click="showReimburseModal = false"></div>
      <div class="modal-content modal-center w-full max-w-md" style="position:relative; z-index:2; overflow-y:auto; max-height:85dvh;">
        <div class="modal-header">
          <h3>
            <i class="fa-solid fa-hand-holding-dollar text-success" style="margin-right: 6px;"></i>
            โอนเคลียร์เงินคืนครัวกลาง
          </h3>
          <button class="modal-close" @click="showReimburseModal = false">✕</button>
        </div>

        <div class="modal-body">
          <div class="mb-lg rounded-lg" style="background: rgba(139, 3, 19, 0.04); border: 1.5px solid rgba(139, 3, 19, 0.15); padding: 18px 20px;">
            <div class="flex flex-between align-center mb-sm pb-sm" style="border-bottom: 1px dashed rgba(139, 3, 19, 0.18);">
              <span class="text-secondary text-sm font-medium">
                <i class="fa-solid fa-store text-muted mr-1"></i> สาขาที่จะเคลียร์ยอด:
              </span>
              <strong class="text-main font-bold text-sm">{{ reimburseTargetBranch?.branch_name || settlementData?.branch_name }}</strong>
            </div>
            <div class="flex flex-between align-center pt-2xs">
              <span class="text-secondary text-sm font-medium">
                <i class="fa-solid fa-file-invoice-dollar text-muted mr-1"></i> ยอดค้างชำระคืนทั้งหมด:
              </span>
              <span class="text-danger font-bold text-xl">฿{{ formatNumber(reimburseTargetBranch ? reimburseTargetBranch.total_pending_amount : settlementData?.reimbursement?.pending_reimbursement) }}</span>
            </div>
          </div>

          <p class="text-xs text-secondary mb-md">
            เมื่อกดยืนยัน ระบบจะปรับสถานะใบเบิกของสาขานี้ทั้งหมดให้เป็น <strong>ชำระแล้ว</strong> และบันทึกเงินยอดนี้เข้า <strong>กระเป๋าเงินกองกลาง</strong> ทันที
          </p>

          <div class="form-group mb-lg">
            <label class="form-label font-bold text-sm">หมายเหตุ / อ้างอิงการโอน</label>
            <input 
              type="text" 
              v-model="reimburseNote" 
              placeholder="เช่น โอนเงินคืนผ่าน บัญชีกองกลาง วันที่ 14/10" 
              class="form-input w-full" 
            />
          </div>

          <div class="flex gap-md mt-xl">
            <button class="btn-modal btn-modal-secondary flex-1" :disabled="isSubmittingReimburse" @click="showReimburseModal = false">ยกเลิก</button>
            <button class="btn-modal btn-modal-primary flex-1" :disabled="isSubmittingReimburse" @click="submitReimburseBranch">
              <i v-if="isSubmittingReimburse" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-check"></i>
              {{ isSubmittingReimburse ? 'กำลังบันทึก...' : 'ยืนยันโอนเงินคืน' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ────────────────────────────────────────────────────────── -->
    <!-- MODAL: บันทึกจ่ายเงินปันผลจริง (Payout Modal) -->
    <!-- ────────────────────────────────────────────────────────── -->
    <div v-if="showPayoutModal" class="modal-container active">
      <div class="modal-overlay" @click="showPayoutModal = false"></div>
      <div class="modal-content modal-center w-full max-w-md" style="position:relative; z-index:2; overflow-y:auto; max-height:85dvh;">
        <div class="modal-header">
          <h3>
            <i class="fa-solid fa-money-bill-wave text-primary" style="margin-right: 6px;"></i>
            บันทึกจ่ายเงินปันผลจริง
          </h3>
          <button class="modal-close" @click="showPayoutModal = false">✕</button>
        </div>

        <div class="modal-body">
          <div class="modal-partner-summary-card mb-md">
            <div class="modal-summary-line flex flex-between align-center">
              <span class="text-xs text-secondary font-medium">สาขา:</span>
              <span class="font-bold text-sm text-main">{{ settlementData?.branch_name || selectedPartnerBranchName || '-' }}</span>
            </div>
            <div class="modal-summary-line modal-summary-divider flex flex-between align-center">
              <span class="text-xs text-secondary font-medium">ผู้รับปันผล:</span>
              <div class="text-right">
                <span class="font-bold text-sm text-primary">{{ payoutForm.partner_name || 'ระบุชื่อด้านล่าง' }}</span>
                <span v-if="payoutForm.share_percentage" class="badge badge-primary font-bold text-xs ml-xs">{{ payoutForm.share_percentage }}%</span>
              </div>
            </div>
          </div>

          <div class="form-group mb-md" v-if="!payoutForm.partner_name">
            <label class="form-label font-bold text-sm">เลือกหุ้นส่วน *</label>
            <select v-model="payoutForm.partner_name" class="form-select w-full font-bold" @change="onPayoutPartnerSelect">
              <option value="" disabled>-- เลือกหุ้นส่วน --</option>
              <option v-for="p in settlementData?.partner_distributions" :key="p.id" :value="p.name">
                {{ p.name }} ({{ p.share_percentage }}%) - แนะนำ ฿{{ formatNumber(p.payout_amount) }}
              </option>
            </select>
          </div>

          <div class="form-group mb-md">
            <label class="form-label font-bold text-sm">ยอดเงินปันผลที่จ่ายจริง *</label>
            <input 
              type="number" 
              v-model.number="payoutForm.amount" 
              placeholder="0.00" 
              class="form-input font-bold text-lg text-primary w-full" 
              min="1"
            />
          </div>

          <div class="form-group mb-lg">
            <label class="form-label font-bold text-sm">หมายเหตุ / อ้างอิงสลิป</label>
            <input 
              type="text" 
              v-model="payoutForm.note" 
              placeholder="เช่น โอนเงินเข้าบัญชี KBank ปันผลรอบประจำสัปดาห์" 
              class="form-input w-full" 
            />
          </div>

          <div class="flex gap-md mt-xl">
            <button class="btn-modal btn-modal-secondary flex-1" :disabled="isSubmittingPayout" @click="showPayoutModal = false">ยกเลิก</button>
            <button class="btn-modal btn-modal-primary flex-1" :disabled="isSubmittingPayout" @click="submitPayout">
              <i v-if="isSubmittingPayout" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-check"></i>
              {{ isSubmittingPayout ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ────────────────────────────────────────────────────────── -->
    <!-- MODAL: ปรับยอดสินค้า / แจ้งของชำรุด (Partial Adjustment) -->
    <!-- ────────────────────────────────────────────────────────── -->
    <div v-if="showAdjustItemModal && adjustingItem" class="modal-container active">
      <div class="modal-overlay" @click="showAdjustItemModal = false"></div>
      <div class="modal-content modal-center w-full max-w-md" style="position:relative; z-index:2; overflow-y:auto; max-height:85dvh;">
        <div class="modal-header">
          <h3>
            <i class="fa-solid fa-pen-to-square text-warning" style="margin-right: 6px;"></i>
            ปรับยอดสินค้า / แจ้งของชำรุด
          </h3>
          <button class="modal-close" @click="showAdjustItemModal = false">✕</button>
        </div>

        <div class="modal-body">
          <div class="p-sm rounded mb-md" style="background: var(--bg-secondary);">
            <div class="font-bold text-base text-main mb-xs">{{ adjustingItem.item_name }}</div>
            <div class="flex flex-between align-center text-xs text-secondary">
              <span>ราคาเบิก: <strong>฿{{ formatNumber(adjustingItem.cost_price) }} / {{ adjustingItem.unit }}</strong></span>
              <span>จำนวนปัจจุบัน: <strong class="text-primary">{{ adjustingItem.quantity }} {{ adjustingItem.unit }}</strong></span>
            </div>
          </div>

          <!-- New Quantity Input -->
          <div class="form-group mb-md">
            <label class="form-label font-bold text-sm">
              ระบุจำนวนใหม่ที่ได้รับจริง ({{ adjustingItem.unit }}) *
            </label>
            <input 
              type="number" 
              class="form-input w-full font-bold text-base" 
              v-model.number="adjustNewQty" 
              min="0" 
              :max="adjustingItem.quantity - 1" 
              step="1"
            />
            <span class="text-xs text-muted block mt-xs">
              ยอดเดิม: {{ adjustingItem.quantity }} ➔ จะปรับลดออก <strong>{{ adjustingItem.quantity - adjustNewQty }} {{ adjustingItem.unit }}</strong>
            </span>
          </div>

          <!-- Refund Amount Calculation -->
          <div class="flex flex-between align-center p-sm rounded mb-md border" style="background: var(--bg-surface);">
            <span class="text-xs font-bold text-secondary">ยอดเงินที่ปรับลดคืนสาขา:</span>
            <span class="font-bold text-lg text-danger">
              -฿{{ formatNumber((adjustingItem.quantity - adjustNewQty) * adjustingItem.cost_price) }}
            </span>
          </div>

          <!-- Action for Diff Stock -->
          <div class="form-group mb-md">
            <label class="form-label font-bold text-sm">การจัดการของส่วนต่าง *</label>
            <div class="flex flex-col gap-xs mt-xs">
              <label class="flex align-center gap-xs cursor-pointer p-xs rounded hover:bg-secondary">
                <input type="radio" value="return_to_stock" v-model="adjustWasteAction" />
                <span class="text-sm">คืนสต็อกเข้าคลังครัวกลาง (ของยังดี / ส่งคืนกลับมา)</span>
              </label>
              <label class="flex align-center gap-xs cursor-pointer p-xs rounded hover:bg-secondary">
                <input type="radio" value="log_as_waste" v-model="adjustWasteAction" />
                <span class="text-sm">บันทึกเป็นของเสียครัวกลาง (แตกหัก / ชำรุด / เสียหาย)</span>
              </label>
            </div>
          </div>

          <!-- Note/Reason -->
          <div class="form-group mb-md">
            <label class="form-label text-xs font-bold text-secondary">เหตุผลการปรับลด/ของชำรุด:</label>
            <input 
              type="text" 
              class="form-input w-full text-sm" 
              v-model="adjustWasteNote" 
              placeholder="เช่น กล่องบุบ, ถุงฉีกขาด, ส่งของไม่ครบ" 
            />
          </div>

          <!-- Actions -->
          <div class="flex gap-md mt-lg">
            <button class="btn-modal btn-modal-secondary flex-1" :disabled="isSubmittingAdjust" @click="showAdjustItemModal = false">ยกเลิก</button>
            <button 
              class="btn-modal btn-modal-primary flex-1" 
              :disabled="isSubmittingAdjust || adjustNewQty < 0 || adjustNewQty >= adjustingItem.quantity"
              @click="submitAdjustItem"
            >
              <i v-if="isSubmittingAdjust" class="fa-solid fa-spinner fa-spin mr-1"></i>
              <i v-else class="fa-solid fa-check mr-1"></i>
              {{ isSubmittingAdjust ? 'กำลังบันทึก...' : 'ยืนยันปรับลดยอด' }}
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api';
import { ui, compressImage } from '../helpers';

const route = useRoute();
const router = useRouter();

// Active tab is derived directly from sidebar route param /central-kitchen/:tab
const activeTab = computed(() => {
  return route.params.tab || 'catalog';
});

// View mode: 'grid' or 'table'
const viewMode = ref('grid');

// States
const items = ref([]);
const orders = ref([]);
const history = ref([]);
const branches = ref([]);
const retailBranches = ref([]);

// Dedicated Dispatch Tab States (Push Model)
const dispatchBranchId = ref('');
const isDispatchBranchDropdownOpen = ref(false);
const dispatchCart = ref([]);
const dispatchSearchQuery = ref('');
const dispatchCategory = ref('all');
const dispatchNotes = ref('');
const isSubmittingDispatch = ref(false);
const isDispatchMobileDrawerOpen = ref(false);

watch(dispatchCart, (newCart) => {
  if (newCart.length === 0) {
    isDispatchMobileDrawerOpen.value = false;
  }
}, { deep: true });

const closeDispatchBranchDropdown = () => {
  isDispatchBranchDropdownOpen.value = false;
};

const selectedDispatchBranchName = computed(() => {
  const b = retailBranches.value.find(x => Number(x.id) === Number(dispatchBranchId.value));
  return b ? b.name : '';
});

const getDispatchCategoryCount = (catId) => {
  if (catId === 'all') return items.value.length;
  return items.value.filter(i => i.category === catId).length;
};

const filteredDispatchItems = computed(() => {
  return items.value.filter(item => {
    const matchCat = dispatchCategory.value === 'all' || item.category === dispatchCategory.value;
    const matchSearch = !dispatchSearchQuery.value || item.name.toLowerCase().includes(dispatchSearchQuery.value.toLowerCase());
    return matchCat && matchSearch;
  });
});

const getDispatchCartQty = (itemId) => {
  const found = dispatchCart.value.find(c => c.item_id === itemId);
  return found ? found.quantity : 0;
};

const totalDispatchCost = computed(() => {
  return dispatchCart.value.reduce((sum, c) => sum + (Number(c.quantity) * Number(c.cost_price)), 0);
});

const totalDispatchQty = computed(() => {
  return dispatchCart.value.reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
});

// Partial Item Adjustment States
const showAdjustItemModal = ref(false);
const adjustingOrder = ref(null);
const adjustingItem = ref(null);
const adjustNewQty = ref(0);
const adjustWasteAction = ref('return_to_stock');
const adjustWasteNote = ref('');
const isSubmittingAdjust = ref(false);

const isLoadingItems = ref(true);
const isLoadingOrders = ref(false);
const isLoadingHistory = ref(false);

const searchQuery = ref('');
const selectedCategory = ref('all');
const orderFilterStatus = ref('pending');
const orderBranchFilter = ref('all');
const isOrderBranchDropdownOpen = ref(false);
const isPartnerBranchDropdownOpen = ref(false);

const selectedOrderBranchName = computed(() => {
  if (orderBranchFilter.value === 'all') return 'ทุกสาขา';
  const found = retailBranches.value.find(b => Number(b.id) === Number(orderBranchFilter.value));
  return found ? found.name : 'ทุกสาขา';
});

const selectedPartnerBranchName = computed(() => {
  if (!selectedPartnerBranch.value) return 'เลือกสาขา';
  const found = retailBranches.value.find(b => Number(b.id) === Number(selectedPartnerBranch.value));
  return found ? found.name : 'เลือกสาขา';
});

const closeOrderBranchDropdown = () => {
  isOrderBranchDropdownOpen.value = false;
};

const closePartnerBranchDropdown = () => {
  isPartnerBranchDropdownOpen.value = false;
};

const historyFilter = ref('all');

// Categories filter list
const categories = [
  { id: 'all', label: 'ทั้งหมด', icon: 'fa-solid fa-boxes-stacked' },
  { id: 'raw_material', label: 'วัตถุดิบ/อาหาร', icon: 'fa-solid fa-drumstick-bite' },
  { id: 'packaging', label: 'บรรจุภัณฑ์', icon: 'fa-solid fa-box-open' },
  { id: 'equipment', label: 'อุปกรณ์', icon: 'fa-solid fa-kitchen-set' },
  { id: 'general', label: 'ทั่วไป', icon: 'fa-solid fa-tag' }
];

// Item Modal Options & Dropdowns
const isCategoryModalDropdownOpen = ref(false);
const isUomModalDropdownOpen = ref(false);
const isPosMenuModalDropdownOpen = ref(false);
const isSavingItem = ref(false);
const fileInputRef = ref(null);

const itemModalCategories = [
  { id: 'raw_material', label: 'วัตถุดิบ/อาหาร', icon: 'fa-solid fa-drumstick-bite' },
  { id: 'packaging', label: 'บรรจุภัณฑ์/สิ้นเปลือง', icon: 'fa-solid fa-box-open' },
  { id: 'equipment', label: 'อุปกรณ์/เครื่องครัว', icon: 'fa-solid fa-kitchen-set' },
  { id: 'general', label: 'ทั่วไป', icon: 'fa-solid fa-tag' }
];

const kitchenUnits = ['ชิ้น', 'กิโลกรัม', 'กรัม', 'แพ็ค', 'ถุง', 'ขวด', 'ลัง', 'กระป๋อง', 'ม้วน', 'อัน', 'กล่อง', 'ลิตร'];

const itemModalCategoryLabel = computed(() => {
  const cat = itemModalCategories.find(c => c.id === itemForm.value.category);
  return cat ? cat.label : 'เลือกหมวดหมู่...';
});

const closeCategoryModalDropdown = () => {
  isCategoryModalDropdownOpen.value = false;
};

const closeUomModalDropdown = () => {
  isUomModalDropdownOpen.value = false;
};

const closePosMenuModalDropdown = () => {
  isPosMenuModalDropdownOpen.value = false;
};

// POS Menus for Linking
const posMenuItems = ref([]);
const isLoadingPosMenus = ref(false);

const loadPosMenuItems = async () => {
  isLoadingPosMenus.value = true;
  try {
    const res = await api.centralKitchen.getPosMenus();
    if (res.success) {
      posMenuItems.value = res.data || [];
    }
  } catch (err) {
    console.warn('Could not load POS menu items:', err);
  } finally {
    isLoadingPosMenus.value = false;
  }
};

const groupedPosMenuItems = computed(() => {
  const groups = {};
  for (const item of posMenuItems.value) {
    const cat = item.category_name || 'ทั่วไป';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }
  return groups;
});

// Modals
const showItemModal = ref(false);
const editingItem = ref(null);
const itemForm = ref({
  name: '',
  category: 'packaging',
  unit: 'ชิ้น',
  cost_price: 0,
  quantity: 0,
  min_stock_alert: 10,
  image_url: ''
});

const showRestockModal = ref(false);
const activeRestockItem = ref(null);
const restockForm = ref({
  quantity_added: 1,
  unit_cost: 0,
  supplier_note: ''
});

// Finance State
const financeSummary = ref({
  cash_balance: 0,
  inventory_value: 0,
  pending_receivables: 0,
  total_capital: 0,
  total_purchases: 0,
  total_reimbursements: 0,
  total_operating_expenses: 0,
  total_waste_cost: 0,
  total_waste_count: 0
});
const financeLogs = ref([]);
const isLoadingFinance = ref(false);
const financeFilterType = ref('all');

const filteredFinanceLogs = computed(() => {
  if (financeFilterType.value === 'all') return financeLogs.value;
  return financeLogs.value.filter(l => l.type === financeFilterType.value);
});

const capitalInCount = computed(() => financeLogs.value.filter(l => l.type === 'capital_in').length);
const reimbursementInCount = computed(() => financeLogs.value.filter(l => l.type === 'reimbursement_in').length);
const purchaseOutCount = computed(() => financeLogs.value.filter(l => l.type === 'purchase_out').length);
const operatingExpenseOutCount = computed(() => financeLogs.value.filter(l => l.type === 'operating_expense_out').length);
const wasteLossCount = computed(() => financeLogs.value.filter(l => l.type === 'waste_loss').length);

// Finance Sub-Tabs & Receivables
const financeSubTab = ref('ledger'); // 'ledger' | 'receivables'
const receivablesBreakdown = ref(null);
const isLoadingReceivables = ref(false);
const expandedBranchTransfers = ref({}); // { [branchId]: boolean }
const selectedReceivablesBranch = ref('all'); // 'all' or branch_id
const isReceivablesBranchDropdownOpen = ref(false);

const closeReceivablesBranchDropdown = () => {
  isReceivablesBranchDropdownOpen.value = false;
};

const selectedReceivablesBranchLabel = computed(() => {
  if (selectedReceivablesBranch.value === 'all') {
    return `ทุกสาขา (มียอดค้าง ${receivablesBreakdown.value?.branches?.length || 0} สาขา)`;
  }
  const b = receivablesBreakdown.value?.branches?.find(
    br => Number(br.branch_id) === Number(selectedReceivablesBranch.value)
  );
  return b ? `${b.branch_name} (ค้าง ฿${formatNumber(b.total_pending_amount)})` : 'เลือกสาขา';
});

const filteredReceivablesBranches = computed(() => {
  if (!receivablesBreakdown.value?.branches) return [];
  if (selectedReceivablesBranch.value === 'all') {
    return receivablesBreakdown.value.branches;
  }
  return receivablesBreakdown.value.branches.filter(
    b => Number(b.branch_id) === Number(selectedReceivablesBranch.value)
  );
});

const totalFilteredPendingAmount = computed(() => {
  if (selectedReceivablesBranch.value === 'all') {
    return receivablesBreakdown.value?.total_pending_amount || 0;
  }
  return filteredReceivablesBranches.value.reduce((sum, b) => sum + Number(b.total_pending_amount || 0), 0);
});

const totalFilteredTransfersCount = computed(() => {
  if (selectedReceivablesBranch.value === 'all') {
    return receivablesBreakdown.value?.total_transfers_count || 0;
  }
  return filteredReceivablesBranches.value.reduce((sum, b) => sum + Number(b.transfers_count || 0), 0);
});

// Modals: Transaction (Finance)
const showTransactionModal = ref(false);
const isSavingTransaction = ref(false);
const isTransactionTypeDropdownOpen = ref(false);
const transactionForm = ref({
  type: 'capital_in',
  amount: 0,
  note: ''
});

const closeTransactionTypeDropdown = () => {
  isTransactionTypeDropdownOpen.value = false;
};

// Modals: Waste Tracking
const showWasteModal = ref(false);
const activeWasteItem = ref(null);
const isSavingWaste = ref(false);
const wasteForm = ref({
  quantity_wasted: 1,
  reason: 'expired',
  note: ''
});

// Modals: Reimburse Branch
const showReimburseModal = ref(false);
const reimburseNote = ref('');
const isSubmittingReimburse = ref(false);

// Modals: Payout Partner
const showPayoutModal = ref(false);
const isSubmittingPayout = ref(false);
const payoutForm = ref({
  partner_name: '',
  share_percentage: 0,
  amount: 0,
  note: ''
});

// Partner State
const selectedPartnerBranch = ref(null);
const partnerList = ref([]);
const settlementData = ref(null);
const isLoadingSettlement = ref(false);
const settlementError = ref('');
const partnerSubTab = ref('partners'); // 'partners' | 'payout_history'

const partnerSumPercentage = computed(() => {
  return partnerList.value.reduce((acc, p) => acc + (Number(p.share_percentage) || 0), 0);
});

const pendingOrdersCount = computed(() => {
  return orders.value.filter(o => o.status === 'pending').length;
});

const dispatchedOrdersCount = computed(() => {
  return orders.value.filter(o => o.status === 'dispatched').length;
});

const restockHistoryCount = computed(() => {
  return history.value.filter(h => h.type === 'restock').length;
});

const transferHistoryCount = computed(() => {
  return history.value.filter(h => h.type === 'transfer').length;
});

const getCategoryCount = (catId) => {
  if (catId === 'all') return items.value.length;
  return items.value.filter(i => i.category === catId).length;
};

const filteredItems = computed(() => {
  return items.value.filter(item => {
    const matchCat = selectedCategory.value === 'all' || item.category === selectedCategory.value;
    const matchSearch = !searchQuery.value || item.name.toLowerCase().includes(searchQuery.value.toLowerCase());
    return matchCat && matchSearch;
  });
});

const filteredOrders = computed(() => {
  return orders.value.filter(o => {
    const matchStatus = orderFilterStatus.value === 'all' || o.status === orderFilterStatus.value;
    const matchBranch = orderBranchFilter.value === 'all' || Number(o.branch_id) === Number(orderBranchFilter.value);
    return matchStatus && matchBranch;
  });
});

const filteredHistory = computed(() => {
  if (historyFilter.value === 'all') return history.value;
  if (historyFilter.value === 'transfer' || historyFilter.value === 'requisition') {
    return history.value.filter(h => h.type === 'transfer' || h.type === 'requisition');
  }
  return history.value.filter(h => h.type === historyFilter.value);
});

// Helpers
const formatNumber = (num) => Number(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const formatDateTime = (str) => {
  if (!str) return '-';
  const d = new Date(str);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' +
         d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
};

const getCategoryLabel = (cat) => {
  const map = {
    'raw_material': 'วัตถุดิบ/อาหาร',
    'packaging': 'บรรจุภัณฑ์',
    'equipment': 'อุปกรณ์',
    'general': 'ทั่วไป'
  };
  return map[cat] || cat;
};

const getItemNameParts = (name) => {
  if (!name) return { main: '', sub: '' };
  const match = name.match(/^(.*?)\s*(\([^(]+\))\s*$/);
  if (match) {
    return { main: match[1].trim(), sub: match[2].trim() };
  }
  return { main: name, sub: '' };
};

const getCategoryIcon = (cat) => {
  const map = {
    'raw_material': 'fa-solid fa-drumstick-bite',
    'packaging': 'fa-solid fa-box-open',
    'equipment': 'fa-solid fa-kitchen-set',
    'general': 'fa-solid fa-tag'
  };
  return map[cat] || 'fa-solid fa-box';
};

const getStatusBadgeClass = (st) => {
  const map = {
    'pending': 'badge-warning',
    'dispatched': 'badge-info',
    'received': 'badge-success',
    'cancelled': 'badge-danger'
  };
  return map[st] || 'badge-secondary';
};

const getStatusLabel = (st) => {
  const map = {
    'pending': 'รอจัดส่ง',
    'dispatched': 'กำลังส่ง',
    'received': 'สาขารับแล้ว',
    'cancelled': 'ยกเลิก'
  };
  return map[st] || st;
};

// Fetch Methods
const loadItems = async () => {
  isLoadingItems.value = true;
  try {
    const res = await api.centralKitchen.getItems({ active_only: 'true' });
    if (res.success) {
      items.value = res.data;
    }
  } catch (err) {
    ui.error(err.message);
  } finally {
    isLoadingItems.value = false;
  }
};

const loadOrders = async () => {
  isLoadingOrders.value = true;
  try {
    const res = await api.centralKitchen.getTransfers();
    if (res.success) {
      orders.value = res.data;
    }
  } catch (err) {
    ui.error(err.message);
  } finally {
    isLoadingOrders.value = false;
  }
};

const loadHistory = async () => {
  isLoadingHistory.value = true;
  try {
    const res = await api.centralKitchen.getHistory();
    if (res.success) {
      history.value = res.data;
    }
  } catch (err) {
    ui.error(err.message);
  } finally {
    isLoadingHistory.value = false;
  }
};

const loadBranches = async () => {
  try {
    const res = await api.auth.getBranches();
    if (res.success && res.data) {
      branches.value = res.data;
      retailBranches.value = res.data.filter(b => !b.name.includes('ครัวกลาง'));
      if (retailBranches.value.length > 0 && !selectedPartnerBranch.value) {
        selectedPartnerBranch.value = retailBranches.value[0].id;
      }
      if (retailBranches.value.length > 0 && !dispatchBranchId.value) {
        dispatchBranchId.value = retailBranches.value[0].id;
      }
      await loadPartnerData();
    }
  } catch (e) {
    console.warn(e);
  }
};

// Item Actions
const openCreateItemModal = () => {
  editingItem.value = null;
  itemForm.value = {
    name: '',
    category: 'packaging',
    unit: 'ชิ้น',
    cost_price: 0,
    quantity: 0,
    min_stock_alert: 10,
    image_url: '',
    linked_menu_item_name: '',
    target_stock_type: 'raw',
    pack_size: 1
  };
  isCategoryModalDropdownOpen.value = false;
  isUomModalDropdownOpen.value = false;
  isPosMenuModalDropdownOpen.value = false;
  if (posMenuItems.value.length === 0) loadPosMenuItems();
  showItemModal.value = true;
};

const openEditItemModal = (item) => {
  editingItem.value = item;
  itemForm.value = {
    name: item.name,
    category: item.category,
    unit: item.unit,
    cost_price: item.cost_price,
    quantity: item.quantity,
    min_stock_alert: item.min_stock_alert,
    image_url: item.image_url || '',
    linked_menu_item_name: item.linked_menu_item_name || '',
    target_stock_type: item.target_stock_type || 'raw',
    pack_size: item.pack_size || 1
  };
  isCategoryModalDropdownOpen.value = false;
  isUomModalDropdownOpen.value = false;
  isPosMenuModalDropdownOpen.value = false;
  if (posMenuItems.value.length === 0) loadPosMenuItems();
  showItemModal.value = true;
};

const triggerFileInput = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
};

const handleFileChange = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      ui.showLoading();
      const compressed = await compressImage(event.target.result, 300, 300, 0.7);
      itemForm.value.image_url = compressed;
      ui.showToast('อัปโหลดและบีบอัดรูปภาพเรียบร้อย', 'success');
    } catch (err) {
      console.error(err);
      itemForm.value.image_url = event.target.result;
      ui.showToast('อัปโหลดรูปภาพเรียบร้อย', 'success');
    } finally {
      ui.hideLoading();
    }
  };
  reader.readAsDataURL(file);
};

const handlePasteImage = (e) => {
  const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
  if (!items) return;
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          ui.showLoading();
          const compressed = await compressImage(event.target.result, 300, 300, 0.7);
          itemForm.value.image_url = compressed;
          ui.showToast('วางและบีบอัดรูปภาพเรียบร้อยแล้ว', 'success');
        } catch (err) {
          console.error(err);
          itemForm.value.image_url = event.target.result;
          ui.showToast('วางรูปภาพเรียบร้อยแล้ว', 'success');
        } finally {
          ui.hideLoading();
        }
      };
      reader.readAsDataURL(file);
      e.preventDefault();
      break;
    }
  }
};

const handleImageError = () => {
  ui.showToast('ลิงก์รูปภาพที่ใส่อ่านไม่ได้ กรุณาตรวจสอบ URL', 'warning');
};

const saveItem = async () => {
  if (!itemForm.value.name?.trim()) {
    return ui.showToast('กรุณาระบุชื่อสินค้า', 'warning');
  }
  isSavingItem.value = true;
  ui.showLoading();
  try {
    if (editingItem.value) {
      await api.centralKitchen.updateItem(editingItem.value.id, itemForm.value);
      ui.showToast('แก้ไขข้อมูลสินค้าสำเร็จ', 'success');
    } else {
      await api.centralKitchen.createItem(itemForm.value);
      ui.showToast('เพิ่มสินค้าใหม่ในครัวกลางสำเร็จ', 'success');
    }
    showItemModal.value = false;
    loadItems();
  } catch (err) {
    ui.showToast(err.message, 'error');
  } finally {
    ui.hideLoading();
    isSavingItem.value = false;
  }
};

const confirmDeleteItem = async (item) => {
  if (!item || !item.id) return;
  const ok = await ui.showConfirm(
    'ยืนยันการลบสินค้า',
    `คุณต้องการลบ "${item.name}" ออกจากแคตตาล็อกครัวกลางใช่หรือไม่?\n\nสินค้านี้จะถูกนำออกจากระบบและไม่แสดงในรายการเบิก/จ่ายอีก`
  );
  if (!ok) return;

  ui.showLoading();
  try {
    const res = await api.centralKitchen.deleteItem(item.id);
    ui.showToast(res.message || 'ลบสินค้าสำเร็จ', 'success');
    showItemModal.value = false;
    await loadItems();
  } catch (err) {
    ui.showToast(err.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

// Quick Restock
const openQuickRestockModal = (item) => {
  activeRestockItem.value = item;
  restockForm.value = {
    quantity_added: 1,
    unit_cost: item.cost_price,
    supplier_note: ''
  };
  showRestockModal.value = true;
};

const submitQuickRestock = async () => {
  if (!restockForm.value.quantity_added || restockForm.value.quantity_added <= 0) {
    return ui.error('กรุณาระบุจำนวนที่เติมให้มากกว่า 0');
  }
  ui.showLoading();
  try {
    await api.centralKitchen.quickRestock(activeRestockItem.value.id, restockForm.value);
    ui.success('เติมสต็อกด่วนเรียบร้อยแล้ว');
    showRestockModal.value = false;
    loadItems();
    loadHistory();
  } catch (err) {
    ui.error(err.message);
  } finally {
    ui.hideLoading();
  }
};

// Dispatch Order (Approve 1-click completion)
const dispatchOrder = async (order) => {
  const ok = await ui.showConfirm(
    'ยืนยันอนุมัติจ่ายของให้สาขา',
    `คุณต้องการอนุมัติคำขอเบิก #${order.transfer_no} ให้ ${order.branch_name} ใช่หรือไม่? (ระบบจะตัดสต็อกครัวกลาง, บันทึกต้นทุนเข้าสาขา ฿${Number(order.total_cost).toLocaleString()} และเติมสต็อก POS ทันที)`
  );
  if (!ok) return;

  ui.showLoading();
  try {
    await api.centralKitchen.dispatchTransfer(order.id);
    ui.success(`อนุมัติคำขอเบิก #${order.transfer_no} และบันทึกต้นทุนเข้าสาขาเรียบร้อยแล้ว`);
    loadOrders();
    loadItems();
    loadHistory();
    if (typeof loadFinances === 'function') loadFinances();
  } catch (err) {
    ui.error(err.message);
  } finally {
    ui.hideLoading();
  }
};

// Cancel Order Method (Rollback all)
const cancelTransferOrder = async (order) => {
  const ok = await ui.showConfirm(
    'ยืนยันยกเลิกใบเบิก',
    `คุณต้องการยกเลิกใบเบิก #${order.transfer_no} (${order.branch_name}) ใช่หรือไม่? (ระบบจะคืนสต็อกเข้าครัวกลาง, ยกเลิก Expense สาขา และดึงสต็อก POS คืนทั้งหมด)`
  );
  if (!ok) return;

  ui.showLoading();
  try {
    const res = await api.centralKitchen.cancelTransfer(order.id);
    ui.success(res.message || 'ยกเลิกใบเบิกและคืนสต็อกเรียบร้อยแล้ว');
    loadOrders();
    loadItems();
    loadHistory();
    if (typeof loadFinances === 'function') loadFinances();
  } catch (err) {
    ui.error(err.message);
  } finally {
    ui.hideLoading();
  }
};

// Dedicated Dispatch Methods (Push Model)
const addDispatchItem = (item) => {
  if (item.quantity <= 0) {
    ui.showToast('สินค้ารายการนี้หมดสต็อกในครัวกลาง', 'warning');
    return;
  }
  const existing = dispatchCart.value.find(c => c.item_id === item.id);
  if (existing) {
    if (existing.quantity >= item.quantity) {
      ui.showToast(`สามารถจ่ายได้สูงสุด ${formatNumber(item.quantity)} ${item.unit} ตามสต็อกในคลัง`, 'warning');
      return;
    }
    existing.quantity += 1;
  } else {
    dispatchCart.value.push({
      item_id: item.id,
      item_name: item.name,
      unit: item.unit,
      cost_price: item.cost_price,
      max_quantity: item.quantity,
      pack_size: item.pack_size || 1,
      linked_menu_item_name: item.linked_menu_item_name || '',
      quantity: 1
    });
  }
};

const increaseDispatchQty = (c) => {
  const original = items.value.find(i => i.id === c.item_id);
  const max = original ? original.quantity : c.max_quantity;
  if (max && c.quantity >= max) {
    ui.showToast(`สามารถจ่ายได้สูงสุด ${formatNumber(max)} ${c.unit} ตามสต็อกในคลัง`, 'warning');
    return;
  }
  c.quantity += 1;
};

const decreaseDispatchQty = (c) => {
  if (c.quantity > 1) {
    c.quantity -= 1;
  } else {
    dispatchCart.value = dispatchCart.value.filter(x => x.item_id !== c.item_id);
  }
};

const validateDispatchQty = (c) => {
  if (!c.quantity || c.quantity < 1) c.quantity = 1;
  if (c.quantity > c.max_quantity) {
    c.quantity = c.max_quantity;
    ui.showToast(`ปรับเป็นจำนวนสูงสุดที่มีในคลัง (${c.max_quantity} ${c.unit})`, 'warning');
  }
};

const removeDispatchItem = (itemId) => {
  dispatchCart.value = dispatchCart.value.filter(c => c.item_id !== itemId);
};

const clearDispatchCart = () => {
  dispatchCart.value = [];
  dispatchNotes.value = '';
};

const submitPushDispatch = async () => {
  if (!dispatchBranchId.value) {
    ui.showToast('กรุณาเลือกสาขาปลายทางที่จะรับของ', 'warning');
    return;
  }
  if (dispatchCart.value.length === 0) {
    ui.showToast('ยังไม่ได้เลือกสินค้าที่จะจ่ายออก', 'warning');
    return;
  }

  const branchName = selectedDispatchBranchName.value;
  const ok = await ui.showConfirm(
    'ยืนยันจ่ายของให้สาขา',
    `คุณต้องการจ่ายของ ${dispatchCart.value.length} รายการ มูลค่ารวม ฿${formatNumber(totalDispatchCost.value)} ให้กับ "${branchName}" ใช่หรือไม่?\n\nระบบจะตัดสต็อกครัวกลาง บันทึกเป็นรายจ่ายสาขา และเติมสต็อก POS ทันที`
  );
  if (!ok) return;

  isSubmittingDispatch.value = true;
  ui.showLoading();
  try {
    const payload = {
      branch_id: Number(dispatchBranchId.value),
      items: dispatchCart.value.map(c => ({ item_id: c.item_id, quantity: c.quantity })),
      notes: dispatchNotes.value
    };
    const res = await api.centralKitchen.directDispatch(payload);
    ui.showToast(res.message || `จ่ายของให้ ${branchName} สำเร็จเรียบร้อยแล้ว`, 'success');
    clearDispatchCart();
    isDispatchMobileDrawerOpen.value = false;
    await Promise.all([loadItems(), loadOrders(), loadHistory()]);
    if (typeof loadFinances === 'function') loadFinances();
  } catch (err) {
    ui.showToast(err.message, 'error');
  } finally {
    isSubmittingDispatch.value = false;
    ui.hideLoading();
  }
};

// Item Adjustment Methods (Partial Damage / Return)
const openAdjustItemModal = (order, item) => {
  adjustingOrder.value = order;
  adjustingItem.value = item;
  adjustNewQty.value = Math.max(0, item.quantity - 1);
  adjustWasteAction.value = 'return_to_stock';
  adjustWasteNote.value = '';
  showAdjustItemModal.value = true;
};

const submitAdjustItem = async () => {
  if (!adjustingOrder.value || !adjustingItem.value) return;
  const newQty = Number(adjustNewQty.value);
  if (isNaN(newQty) || newQty < 0 || newQty >= adjustingItem.value.quantity) {
    return ui.showToast('กรุณาระบุจำนวนใหม่ที่ถูกต้อง (ต้องน้อยกว่าจำนวนปัจจุบัน)', 'warning');
  }

  const diffQty = adjustingItem.value.quantity - newQty;
  const refundCost = diffQty * adjustingItem.value.cost_price;

  const ok = await ui.showConfirm(
    'ยืนยันปรับลดยอดสินค้า',
    `ต้องการปรับลด ${adjustingItem.value.item_name} ลง -${diffQty} ${adjustingItem.value.unit} (ปรับลดต้นทุนสาขาคืน ฿${refundCost.toLocaleString()}) ใช่หรือไม่?`
  );
  if (!ok) return;

  isSubmittingAdjust.value = true;
  ui.showLoading();
  try {
    const res = await api.centralKitchen.adjustTransferItem(adjustingOrder.value.id, adjustingItem.value.id, {
      new_quantity: newQty,
      waste_action: adjustWasteAction.value,
      waste_note: adjustWasteNote.value
    });
    ui.success(res.message || 'ปรับยอดยกเลิกสินค้าสำเร็จ');
    showAdjustItemModal.value = false;
    loadOrders();
    loadItems();
    loadHistory();
    if (typeof loadFinances === 'function') loadFinances();
  } catch (err) {
    ui.error(err.message);
  } finally {
    ui.hideLoading();
    isSubmittingAdjust.value = false;
  }
};

// Partners Management
const loadPartnerData = async () => {
  if (!selectedPartnerBranch.value) return;
  isLoadingSettlement.value = true;
  settlementError.value = '';
  try {
    const [pRes, sRes] = await Promise.all([
      api.centralKitchen.getPartners(selectedPartnerBranch.value),
      api.centralKitchen.getProfitSettlement({ branch_id: selectedPartnerBranch.value })
    ]);
    if (pRes.success) partnerList.value = pRes.data || [];
    if (sRes.success) settlementData.value = sRes.data || null;
  } catch (e) {
    console.warn('Error loading partner data:', e);
    settlementError.value = e.message || 'ไม่สามารถโหลดข้อมูลงบกำไรขาดทุนได้';
  } finally {
    isLoadingSettlement.value = false;
  }
};

const addPartnerRow = () => {
  partnerList.value.push({
    partner_name: '',
    share_percentage: 0,
    is_owner: 0
  });
};

const removePartnerRow = (idx) => {
  partnerList.value.splice(idx, 1);
};

const savePartnersConfig = async () => {
  if (partnerSumPercentage.value !== 100) {
    return ui.error('ผลรวมสัดส่วนหุ้นส่วนต้องเท่ากับ 100%');
  }
  ui.showLoading();
  try {
    await api.centralKitchen.savePartners(selectedPartnerBranch.value, partnerList.value);
    ui.success('บันทึกสัดส่วนหุ้นส่วนสำเร็จ');
    loadPartnerData();
  } catch (err) {
    ui.error(err.message);
  } finally {
    ui.hideLoading();
  }
};

// ── Finance Methods & Helpers ─────────────────────────────────────
const loadFinances = async () => {
  isLoadingFinance.value = true;
  try {
    const [summaryRes, logsRes, recRes] = await Promise.all([
      api.centralKitchen.getFinancesSummary(),
      api.centralKitchen.getFinancesLogs(),
      api.centralKitchen.getReceivablesBreakdown().catch(() => ({ success: false }))
    ]);
    if (summaryRes.success) financeSummary.value = summaryRes.data;
    if (logsRes.success) financeLogs.value = logsRes.data;
    if (recRes && recRes.success) receivablesBreakdown.value = recRes.data;
  } catch (err) {
    console.warn('Error loading finances:', err);
  } finally {
    isLoadingFinance.value = false;
  }
};

const openTransactionModal = (type = 'capital_in') => {
  isTransactionTypeDropdownOpen.value = false;
  transactionForm.value = {
    type,
    amount: null,
    note: ''
  };
  showTransactionModal.value = true;
};

const submitTransaction = async () => {
  if (!transactionForm.value.amount || transactionForm.value.amount <= 0) {
    return ui.error('กรุณาระบุจำนวนเงินที่มากกว่า 0');
  }
  isSavingTransaction.value = true;
  ui.showLoading();
  try {
    await api.centralKitchen.addFinancesTransaction(transactionForm.value);
    ui.success('บันทึกรายการบัญชีกองกลางสำเร็จ');
    showTransactionModal.value = false;
    await loadFinances();
  } catch (err) {
    ui.error(err.message);
  } finally {
    ui.hideLoading();
    isSavingTransaction.value = false;
  }
};

const loadReceivablesBreakdown = async () => {
  isLoadingReceivables.value = true;
  try {
    const res = await api.centralKitchen.getReceivablesBreakdown();
    if (res.success) {
      receivablesBreakdown.value = res.data;
    }
  } catch (err) {
    ui.error(err.message || 'ไม่สามารถโหลดข้อมูลยอดค้างชำระได้');
  } finally {
    isLoadingReceivables.value = false;
  }
};

const onReceivablesCardClick = () => {
  financeSubTab.value = 'receivables';
  if (!receivablesBreakdown.value) {
    loadReceivablesBreakdown();
  }
  const el = document.getElementById('finance-subtabs-nav');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const toggleBranchTransfers = (branchId) => {
  expandedBranchTransfers.value[branchId] = !expandedBranchTransfers.value[branchId];
};

const isFinanceInflow = (type) => {
  return type === 'capital_in' || type === 'reimbursement_in';
};

const getFinanceTypeBadgeClass = (type) => {
  const map = {
    'capital_in': 'badge-success',
    'reimbursement_in': 'badge-info',
    'purchase_out': 'badge-warning',
    'operating_expense_out': 'badge-danger',
    'waste_loss': 'badge-danger badge-cat-waste'
  };
  return map[type] || 'badge-secondary';
};

const getFinanceTypeLabel = (type) => {
  const map = {
    'capital_in': 'เติมเงินทุน',
    'reimbursement_in': 'สาขาคืนเงิน',
    'purchase_out': 'ซื้อของเข้าคลัง',
    'operating_expense_out': 'ค่าใช้จ่ายครัวกลาง',
    'waste_loss': 'ตัดของเสีย'
  };
  return map[type] || type;
};

// ── Waste Management Methods ──────────────────────────────────────
const openWasteModal = (item) => {
  activeWasteItem.value = item;
  wasteForm.value = {
    quantity_wasted: 1,
    reason: 'expired',
    note: ''
  };
  showWasteModal.value = true;
};

const submitWaste = async () => {
  const qty = Number(wasteForm.value.quantity_wasted);
  if (!qty || isNaN(qty) || qty <= 0) {
    return ui.error('กรุณาระบุจำนวนที่ตัดของเสียที่ถูกต้อง');
  }
  if (qty > (activeWasteItem.value?.quantity || 0)) {
    return ui.error('จำนวนที่ตัดของเสียมากกว่าสต็อกที่มีในครัวกลาง');
  }
  isSavingWaste.value = true;
  ui.showLoading();
  try {
    await api.centralKitchen.recordWaste(activeWasteItem.value.id, {
      quantity: qty,
      quantity_wasted: qty,
      reason: wasteForm.value.reason,
      note: wasteForm.value.note
    });
    ui.success('บันทึกตัดสต็อกของเสียเรียบร้อยแล้ว');
    showWasteModal.value = false;
    await loadItems();
    await loadFinances();
    await loadHistory();
  } catch (err) {
    ui.error(err.message);
  } finally {
    ui.hideLoading();
    isSavingWaste.value = false;
  }
};

// ── Branch Reimbursement Methods ──────────────────────────────────
const reimburseTargetBranch = ref(null);

const openReimburseModal = () => {
  reimburseTargetBranch.value = null;
  reimburseNote.value = `โอนเคลียร์เงินคืนครัวกลาง สาขา ${settlementData.value?.branch_name || ''}`;
  showReimburseModal.value = true;
};

const openReimburseModalForBranch = (branch) => {
  reimburseTargetBranch.value = branch;
  reimburseNote.value = `โอนเคลียร์เงินคืนครัวกลาง สาขา ${branch.branch_name || ''}`;
  showReimburseModal.value = true;
};

const submitReimburseBranch = async () => {
  const branchId = reimburseTargetBranch.value ? reimburseTargetBranch.value.branch_id : selectedPartnerBranch.value;
  if (!branchId) return;
  isSubmittingReimburse.value = true;
  ui.showLoading();
  try {
    const res = await api.centralKitchen.reimburseBranchTransfers({
      branch_id: branchId,
      note: reimburseNote.value
    });
    ui.success(res.message || 'เคลียร์โอนเงินคืนครัวกลางเรียบร้อยแล้ว');
    showReimburseModal.value = false;
    await Promise.all([
      loadReceivablesBreakdown(),
      loadPartnerData(),
      loadFinances()
    ]);
  } catch (err) {
    ui.error(err.message);
  } finally {
    ui.hideLoading();
    isSubmittingReimburse.value = false;
  }
};

// ── Partner Dividend Payout Methods ───────────────────────────────
const openPayoutModal = (partner = null) => {
  if (partner) {
    payoutForm.value = {
      partner_id: partner.id,
      partner_name: partner.name,
      share_percentage: partner.share_percentage,
      amount: partner.payout_amount > 0 ? partner.payout_amount : null,
      note: `เงินปันผล (${partner.share_percentage}%)`
    };
  } else {
    payoutForm.value = {
      partner_id: null,
      partner_name: '',
      share_percentage: 0,
      amount: null,
      note: ''
    };
  }
  showPayoutModal.value = true;
};

const onPayoutPartnerSelect = () => {
  const found = settlementData.value?.partner_distributions?.find(p => p.name === payoutForm.value.partner_name);
  if (found) {
    payoutForm.value.partner_id = found.id;
    payoutForm.value.share_percentage = found.share_percentage;
    if (!payoutForm.value.amount) {
      payoutForm.value.amount = found.payout_amount > 0 ? found.payout_amount : null;
    }
    if (!payoutForm.value.note) {
      payoutForm.value.note = `เงินปันผล (${found.share_percentage}%)`;
    }
  }
};

const submitPayout = async () => {
  const branchId = selectedPartnerBranch.value || settlementData.value?.branch_id;
  if (!branchId) {
    return ui.error('กรุณาเลือกสาขาที่ต้องการบันทึกจ่ายปันผล');
  }
  if (!payoutForm.value.partner_name?.trim()) {
    return ui.error('กรุณาระบุชื่อผู้รับเงินปันผล');
  }
  if (!payoutForm.value.amount || payoutForm.value.amount <= 0) {
    return ui.error('กรุณาระบุยอดเงินปันผลที่มากกว่า 0');
  }
  isSubmittingPayout.value = true;
  ui.showLoading();
  try {
    const matchedPartner = settlementData.value?.partner_distributions?.find(p => p.name === payoutForm.value.partner_name);
    await api.centralKitchen.recordPayouts({
      branch_id: branchId,
      partner_id: payoutForm.value.partner_id || matchedPartner?.id || null,
      partner_name: payoutForm.value.partner_name,
      share_percentage: payoutForm.value.share_percentage || matchedPartner?.share_percentage || 0,
      amount: payoutForm.value.amount,
      start_date: settlementData.value?.period?.start_date,
      end_date: settlementData.value?.period?.end_date,
      net_profit: settlementData.value?.net_profit || 0,
      note: payoutForm.value.note
    });
    ui.success('บันทึกการจ่ายเงินปันผลเรียบร้อยแล้ว');
    showPayoutModal.value = false;
    await loadPartnerData();
  } catch (err) {
    ui.error(err.message);
  } finally {
    ui.hideLoading();
    isSubmittingPayout.value = false;
  }
};

watch(selectedPartnerBranch, () => {
  loadPartnerData();
});

watch(activeTab, (tab) => {
  if (tab === 'catalog') loadItems();
  else if (tab === 'orders') loadOrders();
  else if (tab === 'history') loadHistory();
  else if (tab === 'partners') loadPartnerData();
  else if (tab === 'finance' || tab === 'receivables') {
    if (tab === 'receivables') financeSubTab.value = 'receivables';
    loadFinances();
  }
}, { immediate: true });

onMounted(async () => {
  window.addEventListener('click', closeCategoryModalDropdown);
  window.addEventListener('click', closeUomModalDropdown);
  window.addEventListener('click', closePosMenuModalDropdown);
  window.addEventListener('click', closeTransactionTypeDropdown);
  window.addEventListener('click', closeOrderBranchDropdown);
  window.addEventListener('click', closePartnerBranchDropdown);
  window.addEventListener('click', closeReceivablesBranchDropdown);
  window.addEventListener('click', closeDispatchBranchDropdown);
  await loadBranches();
  loadItems();
  loadPosMenuItems();
  loadOrders();
  loadHistory();
  loadFinances();
});

onUnmounted(() => {
  window.removeEventListener('click', closeCategoryModalDropdown);
  window.removeEventListener('click', closeUomModalDropdown);
  window.removeEventListener('click', closePosMenuModalDropdown);
  window.removeEventListener('click', closeTransactionTypeDropdown);
  window.removeEventListener('click', closeOrderBranchDropdown);
  window.removeEventListener('click', closePartnerBranchDropdown);
  window.removeEventListener('click', closeReceivablesBranchDropdown);
  window.removeEventListener('click', closeDispatchBranchDropdown);
});
</script>

<style scoped>
/* POS Menu Stock Linking Styles */
.custom-select-group-header {
  padding: 6px 14px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary, #718096);
  background: rgba(0, 0, 0, 0.04);
  border-top: 1px solid var(--border-color-light, rgba(0, 0, 0, 0.08));
  border-bottom: 1px solid var(--border-color-light, rgba(0, 0, 0, 0.08));
  user-select: none;
}

.btn-stock-choice {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--border-color);
  background: var(--card-bg, #ffffff);
  cursor: pointer;
  text-align: center;
  transition: all var(--transition-fast, 0.15s ease);
  outline: none;
  box-sizing: border-box;
  width: 100%;
}

.btn-stock-choice:hover:not(.active) {
  border-color: var(--primary, #8b0313);
  background: rgba(139, 3, 19, 0.03);
}

.btn-stock-choice.active {
  background: var(--primary, #8b0313) !important;
  color: #ffffff !important;
  border-color: var(--primary, #8b0313) !important;
  box-shadow: 0 3px 10px rgba(139, 3, 19, 0.3) !important;
}

.btn-stock-choice:active {
  transform: scale(0.97);
}

.btn-stock-choice-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-color, #2d3748);
  line-height: 1.2;
}

.btn-stock-choice.active .btn-stock-choice-title {
  color: #ffffff !important;
}

.btn-stock-choice-sub {
  font-size: 11px;
  color: var(--text-secondary, #718096);
  line-height: 1.3;
}

.btn-stock-choice.active .btn-stock-choice-sub {
  color: rgba(255, 255, 255, 0.9) !important;
}

.stock-sync-alert {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(30, 144, 255, 0.08);
  border: 1px solid rgba(30, 144, 255, 0.2);
  border-radius: var(--radius-sm);
  color: #1e5bb8;
  font-size: 11.5px;
  line-height: 1.35;
}

.stock-sync-empty-note {
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.025);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
}

/* Responsive visibility helpers */
@media (max-width: 768px) {
  .desktop-only {
    display: none !important;
  }
  .btn-stock-choice {
    padding: 8px 6px !important;
  }
  .btn-stock-choice-title {
    font-size: 12.5px !important;
  }
  .btn-stock-choice-sub {
    font-size: 10px !important;
  }
}

@media (min-width: 769px) {
  .mobile-only {
    display: none !important;
  }
}

.central-kitchen-view {
  width: 100%;
}

.toolbar-card {
  box-shadow: var(--shadow-sm);
  border: none !important;
  background: var(--card-bg);
}

.category-tabs {
  border-bottom: none !important;
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
.category-tabs::-webkit-scrollbar {
  display: none !important;
}

.view-mode-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  height: 48px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  box-sizing: border-box;
}

.view-toggle-btn {
  height: 38px;
  width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  font-size: 1.15rem;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all var(--transition-base);
}

.view-toggle-btn.active {
  background: var(--gradient-primary);
  color: white;
  box-shadow: var(--shadow-sm);
}

.view-toggle-btn:hover:not(.active) {
  background: rgba(139, 3, 19, 0.05);
  color: var(--primary);
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  pointer-events: none;
}

.grid-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-md);
}

.item-card {
  padding: var(--space-md);
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.item-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-color-focus);
}

.card-top-badges {
  margin-bottom: var(--space-sm);
  width: 100%;
}

.card-badge-category {
  font-size: 11.5px !important;
  padding: 3px 10px !important;
  border-radius: var(--radius-full) !important;
  background: var(--bg-secondary) !important;
  color: var(--text-secondary) !important;
  border: 1px solid var(--border-color) !important;
}

.card-badge-status {
  width: 26px;
  height: 26px;
  min-width: 26px;
  border-radius: var(--radius-full) !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 12px !important;
  padding: 0 !important;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* Image with margin */
.item-img-container {
  height: 135px;
  width: 100%;
  margin-bottom: var(--space-sm);
  background: linear-gradient(180deg, #fff7df 0%, #fceecc 100%);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.item-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-img-placeholder {
  font-size: 2.6rem;
  opacity: 0.4;
  color: var(--text-tertiary);
}

.item-name {
  font-size: 0.92rem;
  line-height: 1.35;
  min-height: 42px;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
  width: 100%;
}

.item-name-main {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-name-sub {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta-box {
  border-top: 1px dashed var(--border-color);
  padding-top: var(--space-xs);
  margin-bottom: var(--space-sm);
  width: 100%;
}

/* Catalog Card Footer Action Buttons: Width 100% matching image */
.card-footer-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  width: 100%;
  margin-top: auto;
}

.btn-restock-main {
  height: 42px !important;
  width: 100% !important;
  font-size: var(--font-sm) !important;
  border-radius: var(--radius-md) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  min-width: unset !important;
  box-sizing: border-box !important;
}

.card-sub-actions {
  display: flex;
  gap: var(--space-xs);
  width: 100%;
}

.btn-card-sub {
  height: 36px !important;
  flex: 1 !important;
  font-size: var(--font-xs) !important;
  border-radius: var(--radius-md) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
  min-width: unset !important;
  box-sizing: border-box !important;
}

.table-btn-action {
  height: 36px !important;
  min-width: unset !important;
  padding: 0 var(--space-md) !important;
  font-size: var(--font-xs) !important;
  border-radius: var(--radius-sm) !important;
  gap: 6px !important;
}

.table-btn-icon {
  width: 36px !important;
  min-width: 36px !important;
  padding: 0 !important;
}

/* ============================================================ */
/* ORDERS TAB STYLING                                           */
/* ============================================================ */
.orders-toolbar {
  box-shadow: var(--shadow-sm);
  border: none !important;
  background: var(--card-bg);
}

.order-status-tabs {
  display: flex;
  gap: var(--space-xs);
  align-items: center;
  flex-wrap: wrap;
}

.order-tab-btn {
  height: 44px;
  padding: 0 16px;
  border-radius: var(--radius-full);
  font-size: var(--font-sm);
  font-weight: var(--font-weight-semibold);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
}

.order-tab-btn:hover:not(.active) {
  background: var(--bg-secondary);
  color: var(--primary);
  border-color: var(--border-color-focus);
}

.order-tab-btn.active {
  background: var(--gradient-primary);
  color: #ffffff;
  border-color: transparent;
  box-shadow: var(--shadow-sm);
}

.order-tab-count {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.order-tab-btn.active .order-tab-count {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

.order-tab-btn:not(.active) .order-tab-count {
  background: rgba(139, 3, 19, 0.08);
  color: var(--primary);
}

.order-branch-filter {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.order-branch-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  font-size: var(--font-sm);
  font-weight: var(--font-weight-bold);
  color: var(--text-secondary);
  line-height: 1;
  flex-shrink: 0;
}

.order-branch-label i {
  font-size: 0.95rem;
}

.order-branch-select {
  height: 44px;
  min-width: 170px;
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  padding: 0 12px;
}

/* Order Cards */
.order-card {
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.order-card:hover {
  box-shadow: var(--shadow-md);
}

.order-card-pending {
  border-left: 5px solid var(--warning) !important;
}

.order-card-dispatched {
  border-left: 5px solid var(--info) !important;
}

.order-card-received {
  border-left: 5px solid var(--success) !important;
}

.order-card-header {
  border-bottom: 1px solid var(--border-color);
}

.order-no-title {
  font-size: 1.15rem;
  color: var(--primary);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.order-total-header {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  text-align: right;
}

.order-total-label {
  font-size: var(--font-xs);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

.order-total-amount {
  font-size: 1.45rem;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.order-meta-row {
  line-height: 1.5;
}

/* Order Items Table */
.desktop-only-orders-table {
  display: block;
}

.mobile-only-orders-list {
  display: none !important;
}

.order-items-table-wrapper {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--card-bg);
}

.order-items-table {
  width: 100%;
  border-collapse: collapse;
}

.order-items-table th {
  background: var(--bg-secondary) !important;
  font-size: 12.5px !important;
  font-weight: 600 !important;
  color: var(--text-secondary) !important;
  padding: 10px 16px !important;
  border-bottom: 1px solid var(--border-color) !important;
  letter-spacing: 0.02em;
}

.order-items-table td {
  padding: 12px 16px !important;
  border-bottom: 1px solid var(--border-color-light) !important;
  vertical-align: middle;
}

.order-items-table tbody tr:last-child td {
  border-bottom: none !important;
}

.order-items-table tbody tr:hover td {
  background: rgba(139, 3, 19, 0.02);
}

.order-qty-pill {
  display: inline-block;
  padding: 3px 12px;
  border-radius: var(--radius-full);
  background: rgba(139, 3, 19, 0.07);
  color: var(--primary);
  font-size: 13px;
}

.order-notes-box {
  background: var(--bg-secondary);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
  padding: 8px 14px;
}

.mobile-only-price {
  display: none;
}

.btn-dispatch-order {
  height: 48px;
  padding: 0 24px;
  font-size: var(--font-base);
  font-weight: var(--font-weight-bold);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
}

.btn-dispatch-order:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* ============================================================ */
/* HISTORY TAB STYLING                                          */
/* ============================================================ */
.history-toolbar {
  box-shadow: var(--shadow-sm);
  border: none !important;
  background: var(--card-bg);
}

.history-status-tabs {
  display: flex;
  gap: var(--space-xs);
  align-items: center;
  flex-wrap: wrap;
}

.history-tab-btn {
  height: 44px;
  padding: 0 16px;
  border-radius: var(--radius-full);
  font-size: var(--font-sm);
  font-weight: var(--font-weight-semibold);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
}

.history-tab-btn:hover:not(.active) {
  background: var(--bg-secondary);
  color: var(--primary);
  border-color: var(--border-color-focus);
}

.history-tab-btn.active {
  background: var(--gradient-primary);
  color: #ffffff;
  border-color: transparent;
  box-shadow: var(--shadow-sm);
}

.history-tab-count {
  margin-left: 2px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.history-tab-btn.active .history-tab-count {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

.history-tab-btn:not(.active) .history-tab-count {
  background: rgba(139, 3, 19, 0.08);
  color: var(--primary);
}

/* History Feed Cards */
.history-feed-card {
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.history-feed-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.border-restock-feed {
  border-left: 5px solid var(--success) !important;
}

.border-transfer-feed {
  border-left: 5px solid var(--primary) !important;
}

.feed-icon-circle {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.bg-success-light {
  background: rgba(42, 157, 143, 0.12);
  color: #2a9d8f;
}

.bg-primary-light {
  background: rgba(139, 3, 19, 0.08);
  color: var(--primary);
}

.bg-danger-light {
  background: rgba(173, 40, 30, 0.1);
}

.bg-card-alt {
  background: rgba(139, 3, 19, 0.03);
  border: 1px solid var(--border-color);
}

.history-meta-row {
  line-height: 1.6;
}

.history-items-chips {
  margin-top: var(--space-xs);
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.history-item-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 12px;
  height: 48px;
  min-height: 48px;
  max-height: 48px;
  box-sizing: border-box;
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color-light);
  width: 100%;
}

.history-item-chip-name {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 500;
  line-height: 1.32;
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
}

.history-item-chip-qty {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  color: var(--primary);
  font-weight: var(--font-weight-bold);
  font-size: 12px;
  white-space: nowrap;
  text-align: right;
  min-width: 80px;
}

.history-item-chip-num {
  font-weight: 700;
  white-space: nowrap;
  text-align: right;
  min-width: 34px;
}

.history-item-chip-unit {
  min-width: 30px;
  max-width: 44px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  text-align: left;
}

.history-amount-box {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  flex-shrink: 0;
}

.history-total-label {
  font-size: var(--font-xs);
  color: var(--text-secondary);
  white-space: nowrap;
}

.history-total-amount {
  font-size: 1.35rem;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.history-qty-value {
  font-size: 1.35rem;
  line-height: 1.1;
  white-space: nowrap;
}

/* ────────────────────────────────────────────────────────── */
/* TAB 3: CENTRAL KITCHEN FINANCE (สมุดบัญชีกองกลาง)         */
/* ────────────────────────────────────────────────────────── */
.finance-toolbar {
  border-bottom: none !important;
}

.btn-finance-action {
  height: 44px;
  padding: 0 var(--space-lg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 600;
  font-size: var(--font-sm);
  border-radius: var(--radius-md);
  white-space: nowrap;
}

.card-accent-primary {
  border-top: 3.5px solid var(--primary) !important;
}

.card-accent-warning {
  border-top: 3.5px solid var(--warning) !important;
}

.card-accent-danger {
  border-top: 3.5px solid var(--danger) !important;
}

.card-accent-info {
  border-top: 3.5px solid var(--info) !important;
}

.summary-caption {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.4;
  margin-top: 4px;
}

/* Ledger Card & Filter Pills */
.ledger-card {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
}

.ledger-header {
  border-bottom: 1px solid var(--border-color-light);
  padding-bottom: 22px;
  margin-bottom: 24px;
}

.transaction-dropdown-option {
  white-space: normal !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 3px !important;
  padding: 10px 14px !important;
  border-bottom: 1px solid var(--border-color-light);
}

.transaction-dropdown-option:last-child {
  border-bottom: none !important;
}

.dropdown-subtext {
  font-size: 11.5px;
  line-height: 1.35;
  white-space: normal;
}

.finance-status-tabs {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  border-bottom: none !important;
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
}

.finance-tab-btn {
  height: 44px;
  padding: 0 16px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-color);
  background: #ffffff;
  color: var(--text-secondary);
  font-size: var(--font-sm);
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.finance-tab-btn:hover {
  background: var(--bg-hover, #f8f9fa);
  color: var(--text-primary);
  border-color: var(--border-color-dark, #ccc);
}

.finance-tab-btn.active {
  background: var(--primary);
  color: #ffffff;
  border-color: var(--primary);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(139, 3, 19, 0.2);
}

.finance-tab-count {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: var(--radius-full);
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-secondary);
  line-height: 1.2;
}

.finance-tab-btn.active .finance-tab-count {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

/* Ledger Table */
.ledger-table-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.ledger-table {
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
  font-size: var(--font-sm);
}

.ledger-table th {
  padding: var(--space-md) var(--space-sm);
  background: var(--bg-secondary, #fcfcfc);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: var(--font-xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border-color);
  white-space: nowrap;
}

.ledger-table td {
  padding: var(--space-md) var(--space-sm);
  border-bottom: 1px solid var(--border-color-light);
  vertical-align: middle;
}

.ledger-table tbody tr:hover {
  background-color: var(--bg-hover, rgba(0, 0, 0, 0.015));
}

.mobile-only-ledger-list {
  display: none;
}

/* ────────────────────────────────────────────────────────── */
/* UNIFIED EMPTY STATES (สำหรับทุกส่วน ทุกแท็บ)               */
/* ────────────────────────────────────────────────────────── */
.empty-state-box {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
  width: 100%;
}

.empty-state-box.empty-state-seamless {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 44px 20px;
}

.empty-state-box.empty-state-compact {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 24px 16px;
}

.empty-state-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(139, 3, 19, 0.05);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  margin: 0 auto 16px auto;
  flex-shrink: 0;
}

.empty-state-icon.empty-state-icon-sm {
  width: 48px;
  height: 48px;
  font-size: 1.35rem;
  margin-bottom: 10px;
}

.empty-state-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
  line-height: 1.3;
}

.empty-state-desc {
  font-size: var(--font-sm);
  color: var(--text-secondary);
  max-width: 440px;
  margin: 0 auto;
  line-height: 1.5;
}

/* ────────────────────────────────────────────────────────── */
/* TAB 4: PARTNERS & FINANCIAL SUMMARY CARDS                 */
/* ────────────────────────────────────────────────────────── */
.financial-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
}

.summary-card {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-md) var(--space-lg);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 110px;
}

.summary-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.summary-icon {
  font-size: var(--font-base);
  display: flex;
  align-items: center;
}

.summary-title {
  font-size: var(--font-xs);
  color: var(--text-secondary);
  font-weight: var(--font-weight-semibold, 600);
}

.summary-value {
  font-size: 1.5rem;
  font-weight: var(--font-weight-bold, 700);
  line-height: 1.2;
  margin-bottom: 8px;
}

.summary-sub-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.sub-badge {
  font-size: 11px;
  background: rgba(139, 3, 19, 0.04);
  color: var(--text-secondary);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
}

.sub-badge-waste-loss {
  background: rgba(173, 40, 30, 0.08) !important;
  color: var(--danger, #ad281e) !important;
  border: 1px solid rgba(173, 40, 30, 0.2);
}

.summary-formula-caption {
  font-size: 11px;
  color: var(--text-tertiary);
  font-style: italic;
}

.net-card {
  background: #ffffff !important;
}

.profit-positive {
  background: #ffffff !important;
  border: 1px solid var(--border-color);
  border-top: 3.5px solid var(--primary) !important;
  box-shadow: 0 4px 14px rgba(139, 3, 19, 0.08);
}

.profit-negative {
  background: #ffffff !important;
  border: 1px solid var(--border-color);
  border-top: 3.5px solid var(--danger) !important;
  box-shadow: 0 4px 14px rgba(173, 40, 30, 0.09);
}

/* Progress Bars & Profit Box */
.progress-bar-bg {
  width: 100%;
  height: 14px;
  background: rgba(139, 3, 19, 0.06);
  border-radius: var(--radius-full, 9999px);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: var(--radius-full, 9999px);
  transition: width 0.4s ease;
}

.financial-bar-item {
  display: flex;
  flex-direction: column;
}

.profit-box-positive {
  background: rgba(42, 157, 143, 0.08) !important;
  border: 1.5px solid rgba(42, 157, 143, 0.25) !important;
  border-radius: var(--radius-md);
}

.profit-box-negative {
  background: rgba(173, 40, 30, 0.08) !important;
  border: 1.5px solid rgba(173, 40, 30, 0.25) !important;
  border-radius: var(--radius-md);
}

.btn-payout-partner {
  height: 42px;
  font-size: var(--font-sm);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: var(--radius-md);
  margin-top: 14px;
}

/* ────────────────────────────────────────────────────────── */
/* MODAL SUMMARY CARDS (Spacious, Breathing Room, Not Cramped) */
/* ────────────────────────────────────────────────────────── */
.modal-item-summary-card {
  padding: 12px 14px;
  background: rgba(139, 3, 19, 0.04);
  border: 1px solid rgba(139, 3, 19, 0.12);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  box-sizing: border-box;
}

.modal-item-summary-name {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  line-height: 1.45;
  word-break: break-word;
}

.modal-item-summary-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  flex-shrink: 0;
}

.modal-item-summary-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.4;
}

.modal-item-summary-stock {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  border-top: 1px dashed rgba(139, 3, 19, 0.12);
  padding-top: 6px;
  margin-top: 2px;
}

.modal-total-summary-box {
  padding: 14px 16px !important;
  background: #ffffff !important;
  border: 1.5px solid var(--border-color) !important;
  border-radius: var(--radius-md) !important;
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  width: 100% !important;
  box-sizing: border-box !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
  min-height: 52px !important;
}

.modal-total-waste {
  background: rgba(173, 40, 30, 0.04) !important;
  border-color: rgba(173, 40, 30, 0.25) !important;
}

.modal-total-label {
  font-size: 13px !important;
  font-weight: 700 !important;
  color: var(--text-secondary) !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  white-space: nowrap !important;
}

.modal-total-amount {
  font-size: 1.35rem !important;
  font-weight: 800 !important;
  line-height: 1.1 !important;
  white-space: nowrap !important;
}

.modal-partner-summary-card {
  padding: 12px 14px;
  background: rgba(139, 3, 19, 0.04);
  border: 1px solid rgba(139, 3, 19, 0.12);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
}

.modal-summary-line {
  line-height: 1.45;
}

.modal-summary-divider {
  border-top: 1px dashed rgba(139, 3, 19, 0.12);
  padding-top: 8px;
  margin-top: 2px;
}

.btn-payout-header {
  height: 42px !important;
  padding: 0 18px !important;
  font-size: 13.5px !important;
  font-weight: 700 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
  border-radius: var(--radius-full) !important;
  box-shadow: 0 2px 6px rgba(139, 3, 19, 0.25) !important;
  white-space: nowrap !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
}

.btn-payout-header:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(139, 3, 19, 0.35) !important;
}

.order-branch-select-wrapper {
  min-width: 170px;
}

.partner-branch-select-wrapper {
  min-width: 200px;
}

.partner-branch-select-trigger {
  font-weight: 700;
  font-size: var(--font-base);
}

@media (max-width: 900px) {
  .financial-summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .catalog-toolbar-bottom {
    flex-direction: column;
    align-items: stretch;
  }

  .catalog-toolbar-actions {
    justify-content: space-between;
    width: 100%;
  }

  .btn-add-item {
    flex: 1;
    justify-content: center;
  }

  /* Mobile Modal Comfort (Spacious width, not pinched to screen edge) */
  .modal-content.modal-center {
    width: calc(100% - 24px) !important;
    margin: auto 12px !important;
    max-width: 480px !important;
  }

  .modal-header {
    padding: 14px 16px !important;
  }

  .modal-body {
    padding: 16px !important;
  }

  /* ========================================================== */
  /* MOBILE 2-COLUMN CARDS - CENTRAL KITCHEN CATALOG DESIGN     */
  /* ========================================================== */
  .catalog-section {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
    overflow-x: hidden !important;
  }

  .grid-cards {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 8px !important;
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  .item-card {
    padding: 8px !important;
    border-radius: var(--radius-lg) !important;
    min-height: unset !important;
    min-width: 0 !important;
    max-width: 100% !important;
    width: 100% !important;
    box-sizing: border-box !important;
    position: relative !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;
    align-items: stretch !important;
    text-align: left !important;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
  }

  /* 1. Top Badges: Category Left + Compact Circular Status Right */
  .card-top-badges {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    gap: 4px !important;
    margin-bottom: 6px !important;
    box-sizing: border-box !important;
  }

  .card-badge-category {
    font-size: 9.5px !important;
    padding: 2px 6px !important;
    max-width: calc(100% - 26px) !important;
    min-width: 0 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    border-radius: var(--radius-full) !important;
    background: var(--bg-secondary) !important;
    color: var(--text-secondary) !important;
    border: 1px solid var(--border-color) !important;
    box-sizing: border-box !important;
  }

  .card-badge-status {
    width: 20px !important;
    height: 20px !important;
    min-width: 20px !important;
    font-size: 9.5px !important;
    border-radius: 50% !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0 !important;
    flex-shrink: 0 !important;
  }

  /* 2. Soft Cream Image Box */
  .item-img-container {
    height: 95px !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    margin-bottom: 6px !important;
    border-radius: var(--radius-md) !important;
    background: linear-gradient(180deg, #fff7df 0%, #fceecc 100%) !important;
    box-sizing: border-box !important;
  }

  .item-img-placeholder {
    font-size: 2rem !important;
  }

  /* 3. 2-Line Name Block */
  .item-name {
    font-size: 0.82rem !important;
    line-height: 1.3 !important;
    min-height: 36px !important;
    margin-bottom: 2px !important;
    text-align: left !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    justify-content: flex-start !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  .item-name-main {
    font-size: 0.82rem !important;
    font-weight: 700 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    text-align: left !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    color: var(--text-primary) !important;
    box-sizing: border-box !important;
  }

  .item-name-sub {
    display: block !important;
    font-size: 0.7rem !important;
    color: var(--text-secondary) !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    text-align: left !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    margin-top: 1px !important;
    box-sizing: border-box !important;
  }

  /* 4. Meta Box: Dashed divider + ราคาเบิก / คงเหลือ rows */
  .item-meta-box {
    border-top: 1px dashed var(--border-color) !important;
    margin-top: 10px !important;
    padding-top: 8px !important;
    margin-bottom: 4px !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 3px !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  .item-meta-row {
    padding: 1px 0 !important;
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  .item-meta-label {
    display: inline-flex !important;
    align-items: center !important;
    font-size: 10.5px !important;
    color: var(--text-secondary) !important;
    font-weight: 500 !important;
    white-space: nowrap !important;
    flex-shrink: 0 !important;
  }

  .item-unit-slash {
    display: inline !important;
    font-size: 10px !important;
  }

  .item-cost-val {
    font-size: 0.88rem !important;
    font-weight: 700 !important;
    color: var(--text-primary) !important;
    white-space: nowrap !important;
    flex-shrink: 0 !important;
  }

  .item-stock-val {
    font-size: 0.88rem !important;
    font-weight: 700 !important;
    white-space: nowrap !important;
    flex-shrink: 0 !important;
  }

  /* 5. Scaled 2-column action buttons */
  .card-footer-actions {
    display: flex !important;
    flex-direction: column !important;
    gap: 4px !important;
    width: 100% !important;
    margin-top: 8px !important;
  }

  .btn-restock-main {
    height: 36px !important;
    font-size: 11.5px !important;
    padding: 0 6px !important;
    border-radius: var(--radius-sm) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 4px !important;
    width: 100% !important;
  }

  .card-sub-actions {
    gap: 4px !important;
    width: 100% !important;
  }

  .btn-card-sub {
    height: 32px !important;
    font-size: 11px !important;
    padding: 0 4px !important;
    border-radius: var(--radius-sm) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 3px !important;
  }

  /* Orders Tab Responsive */
  .orders-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-md);
  }

  /* Filter Tabs & Order Status Tabs: Multi-line Wrap on Mobile (No horizontal scroll) */
  .category-tabs,
  .order-status-tabs {
    flex-wrap: wrap !important;
    overflow-x: visible !important;
    padding-bottom: 0 !important;
    gap: 6px !important;
    width: 100% !important;
  }

  .category-tab,
  .order-tab-btn {
    flex-shrink: 0 !important;
    height: 34px !important;
    padding: 0 10px !important;
    font-size: 12px !important;
  }

  .order-branch-filter {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .order-branch-label {
    white-space: nowrap;
    flex-shrink: 0;
  }

  .order-branch-select-wrapper {
    flex: 1 !important;
    width: 100% !important;
  }

  .order-branch-select {
    width: 100% !important;
    height: 42px !important;
  }

  .order-card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-sm);
  }

  .order-total-header {
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-md);
    padding-top: var(--space-xs);
    border-top: 1px dashed var(--border-color);
  }

  .order-card-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .btn-dispatch-order {
    width: 100%;
    height: 48px;
  }

  /* History Tab Responsive */
  .history-toolbar {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: var(--space-sm) !important;
  }

  .history-status-tabs {
    flex-wrap: wrap !important;
    overflow-x: visible !important;
    padding-bottom: 0 !important;
    gap: 6px !important;
    width: 100% !important;
  }

  .history-tab-btn {
    flex-shrink: 0 !important;
    height: 34px !important;
    padding: 0 12px !important;
    font-size: 12px !important;
  }

  .history-card-inner {
    flex-direction: column !important;
    align-items: stretch !important;
  }

  .history-item-chip {
    height: 48px !important;
    min-height: 48px !important;
    max-height: 48px !important;
    padding: 4px 10px !important;
    box-sizing: border-box !important;
  }

  .history-item-chip-name {
    font-size: 12px !important;
    line-height: 1.3 !important;
  }

  .history-item-chip-qty {
    min-width: 76px !important;
    font-size: 11.5px !important;
    gap: 3px !important;
  }

  .history-item-chip-num {
    min-width: 32px !important;
  }

  .history-item-chip-unit {
    max-width: 40px !important;
    min-width: 28px !important;
  }

  .history-amount-box {
    width: 100% !important;
    flex-direction: row !important;
    justify-content: space-between !important;
    align-items: center !important;
    padding-top: var(--space-xs) !important;
    border-top: 1px dashed var(--border-color) !important;
    margin-top: var(--space-xs) !important;
    gap: 8px !important;
  }

  .history-qty-value {
    white-space: nowrap !important;
    flex-shrink: 0 !important;
    font-size: 1.2rem !important;
  }

  .history-sub-cost {
    text-align: right !important;
    line-height: 1.35 !important;
    font-size: 11px !important;
  }

  /* Finance Tab Responsive */
  .finance-toolbar {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: var(--space-sm) !important;
  }

  .finance-action-buttons {
    width: 100% !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 8px !important;
  }

  .btn-finance-action {
    width: 100% !important;
    height: 44px !important;
    justify-content: center !important;
  }

  .ledger-header {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 12px !important;
    padding-bottom: 14px !important;
    margin-bottom: 14px !important;
  }

  .finance-status-tabs {
    flex-wrap: wrap !important;
    overflow-x: visible !important;
    padding-bottom: 0 !important;
    gap: 6px !important;
    width: 100% !important;
  }

  .finance-tab-btn {
    flex-shrink: 0 !important;
    height: 34px !important;
    padding: 0 10px !important;
    font-size: 12px !important;
  }

  /* Partners Tab Responsive */
  .partner-branch-filter-box {
    width: 100% !important;
    display: flex !important;
    align-items: center !important;
    gap: var(--space-sm) !important;
  }

  .partner-branch-select-wrapper {
    flex: 1 !important;
    width: 100% !important;
  }

  .btn-payout-header {
    height: 40px !important;
    padding: 0 14px !important;
    font-size: 13px !important;
  }
}

@media (max-width: 640px) {
  /* Orders Tab Table vs Mobile Itemized Cards */
  .desktop-only-orders-table {
    display: none !important;
  }

  .mobile-only-orders-list {
    display: flex !important;
  }

  .order-mobile-item-card {
    background: #ffffff;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 10px 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
    box-sizing: border-box;
    width: 100%;
  }

  .order-mobile-item-name {
    line-height: 1.35;
    word-break: break-word;
  }

  .order-mobile-item-sub {
    line-height: 1.3;
    word-break: break-word;
    margin-top: 3px !important;
  }

  /* เส้นประในรายการขอเบิก มีระยะห่างสบายตา ไม่ชิด */
  .order-mobile-item-bottom {
    border-top: 1px dashed rgba(139, 3, 19, 0.15) !important;
    margin-top: 12px !important;
    padding-top: 9px !important;
  }

  /* Finance Ledger Table vs Mobile Cards */
  .desktop-only-ledger-table {
    display: none !important;
  }

  .mobile-only-ledger-list {
    display: flex !important;
  }

  .ledger-mobile-card {
    background: #ffffff;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 12px 14px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
    box-sizing: border-box;
    width: 100%;
  }

  .ledger-mobile-note {
    line-height: 1.4;
    word-break: break-word;
    color: var(--text-primary);
  }

  .ledger-mobile-bottom {
    border-top: 1px dashed rgba(139, 3, 19, 0.15) !important;
    margin-top: 10px !important;
    padding-top: 8px !important;
  }
}

/* Clickable Summary Card */
.card-clickable {
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  position: relative;
  user-select: none;
}

.card-clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(139, 3, 19, 0.12);
  border-color: rgba(139, 3, 19, 0.3) !important;
}

.card-clickable:active {
  transform: translateY(0);
}

.card-click-hint {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--primary, #8b0313);
  font-weight: 600;
  font-size: 0.75rem;
  margin-top: 8px;
  opacity: 0.9;
  transition: opacity 0.15s ease;
}

.card-clickable:hover .card-click-hint {
  opacity: 1;
  text-decoration: underline;
}

/* Pill Sub-Tab Navigation for Finance (Scrollable Left-Right, No Wrap) */
#finance-subtabs-nav,
.finance-subtabs-container {
  margin-top: var(--space-xs);
  margin-bottom: var(--space-lg);
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  overflow-x: auto !important;
  -webkit-overflow-scrolling: touch !important;
  gap: var(--space-sm) !important;
  border-bottom: none !important;
  padding-bottom: 8px !important;
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

#finance-subtabs-nav::-webkit-scrollbar,
.finance-subtabs-container::-webkit-scrollbar {
  display: none;
}

#finance-subtabs-nav .btn,
.finance-subtabs-container .btn {
  font-size: var(--font-sm);
  padding: 10px 22px;
  border-radius: var(--radius-full) !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: #ffffff;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  white-space: nowrap !important;
  flex-shrink: 0 !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

#finance-subtabs-nav .btn:hover:not(.active),
.finance-subtabs-container .btn:hover:not(.active) {
  background: var(--bg-hover, #f8fafc);
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

#finance-subtabs-nav .btn.active,
.finance-subtabs-container .btn.active {
  background: var(--primary, #8b0313) !important;
  border-color: var(--primary, #8b0313) !important;
  color: #ffffff !important;
  font-weight: 700;
  box-shadow: 0 4px 14px rgba(139, 3, 19, 0.28);
}

.tab-count-pill {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: rgba(0, 0, 0, 0.08);
  color: inherit;
  transition: all 0.2s ease;
}

#finance-subtabs-nav .btn.active .tab-count-pill,
.finance-subtabs-container .btn.active .tab-count-pill {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

/* Active Card Indicator */
.card-active-tab {
  border-color: var(--primary, #8b0313) !important;
  box-shadow: 0 0 0 2px rgba(139, 3, 19, 0.2), 0 6px 16px rgba(139, 3, 19, 0.1) !important;
  background: #ffffff !important;
}

.card-click-hint-active {
  color: var(--success, #2a9d8f) !important;
  font-weight: 700 !important;
}

/* Receivables Filter Card & Custom Branch Dropdown */
.receivables-filter-card {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

/* Custom Branch Dropdown Selection */
.receivables-branch-select-wrapper {
  position: relative;
  width: 100%;
}

.receivables-branch-select-trigger {
  width: 100% !important;
  height: 44px !important;
  min-height: 44px !important;
  background: #ffffff !important;
  border: 1.5px solid var(--border-color) !important;
  border-radius: var(--radius-md) !important;
  padding: 0 40px 0 14px !important;
  display: flex !important;
  align-items: center !important;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(61, 27, 17, 0.04);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.receivables-branch-select-trigger:hover {
  border-color: var(--border-color-light) !important;
}

.receivables-branch-select-trigger.active {
  border-color: var(--primary) !important;
  box-shadow: 0 0 0 3px rgba(139, 3, 19, 0.12) !important;
}

.receivables-branch-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 100%;
  background: #ffffff !important;
  border: 1px solid var(--border-color-light) !important;
  border-radius: var(--radius-md) !important;
  box-shadow: var(--shadow-lg) !important;
  z-index: 1050 !important;
  max-height: 260px;
  overflow-y: auto;
  box-sizing: border-box;
}

.receivables-branch-dropdown .custom-select-option {
  padding: 11px 16px;
  border-bottom: 1px solid var(--border-color);
  font-size: var(--font-sm);
  transition: all 0.15s ease;
  cursor: pointer;
}

.receivables-branch-dropdown .custom-select-option:last-child {
  border-bottom: none;
}

.receivables-branch-dropdown .custom-select-option:hover:not(.selected) {
  background: rgba(139, 3, 19, 0.04) !important;
}

.receivables-branch-dropdown .custom-select-option.selected {
  background: var(--primary) !important;
  color: #ffffff !important;
}

.badge-light {
  background: rgba(255, 255, 255, 0.25) !important;
  color: #ffffff !important;
}

/* Bold Amount Highlights */
.amount-danger-bold {
  color: var(--danger, #ad281e) !important;
  font-weight: 700 !important;
  font-size: 1.65rem !important;
  line-height: 1.2 !important;
  letter-spacing: -0.01em;
}

.amount-danger-bold-table {
  color: var(--danger, #ad281e) !important;
  font-weight: 700 !important;
  font-size: 1.15rem !important;
}

/* Receivables Tab View Styling */
.receivables-overview-banner {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.overview-divider {
  width: 1px;
  height: 36px;
  background: var(--border-color);
}

.branch-receivable-card {
  border: 1px solid var(--border-color);
  background: #ffffff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: var(--transition-base);
}

.branch-receivable-card:hover {
  border-color: var(--primary-light);
  box-shadow: var(--shadow-md);
}

.branch-badge-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: rgba(139, 3, 19, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

/* Desktop vs Mobile for Consolidated Items */
.desktop-consolidated-table {
  display: block;
}

.mobile-consolidated-list {
  display: none;
}

/* Partner Subtabs (Capsule Pills) */
.partner-subtabs {
  border-bottom: 2px solid var(--border-color) !important;
  padding-bottom: var(--space-sm) !important;
  margin-bottom: var(--space-lg) !important;
}

/* Desktop vs Mobile for Payout History */
.desktop-payout-table {
  display: block;
}

.mobile-payout-list {
  display: none;
}

.receivables-items-table {
  width: 100%;
  border-collapse: collapse;
}

.receivables-items-table thead tr {
  background: rgba(139, 3, 19, 0.03);
  border-bottom: 1px solid var(--border-color);
}

.receivables-items-table th {
  padding: 10px 14px;
  font-size: var(--font-xs);
  color: var(--text-secondary);
  font-weight: 600;
}

.receivables-items-table td {
  padding: 10px 14px;
  vertical-align: middle;
  border-bottom: 1px solid var(--border-color);
  font-size: var(--font-sm);
}

.receivables-items-table tbody tr:hover {
  background: rgba(139, 3, 19, 0.02);
}

.receivables-items-table tfoot tr {
  background: rgba(139, 3, 19, 0.03);
  border-top: 1.5px solid var(--border-color-light);
}

/* Collapsible Accordion & Uniform Transfer Tickets */
.btn-transfer-toggle {
  background: rgba(139, 3, 19, 0.04);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
  padding: 9px 14px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  outline: none;
  font-size: var(--font-xs);
  font-weight: 600;
  color: var(--primary);
  transition: all 0.2s ease;
}

.btn-transfer-toggle:hover {
  background: rgba(139, 3, 19, 0.08);
}

.transfer-ticket-box {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  box-shadow: 0 1px 3px rgba(61, 27, 17, 0.03);
}

.ticket-header {
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 8px;
}

.ticket-time-row {
  line-height: 1.35;
}

.ticket-time-text {
  white-space: nowrap !important;
}

.ticket-note {
  padding-top: 4px;
}

.ticket-items-list {
  padding-top: 2px;
}

.ticket-item-row {
  background: rgba(139, 3, 19, 0.02);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  font-size: 0.8rem;
  width: 100%;
  box-sizing: border-box;
}

.ticket-item-name {
  line-height: 1.35;
  word-break: break-word;
}

.mobile-consolidated-item-card {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: 0 1px 4px rgba(61, 27, 17, 0.04);
  padding: 10px 14px;
}

.mobile-item-name {
  line-height: 1.35;
  word-break: break-word;
}

.mobile-item-bottom {
  border-top: 1px dashed var(--border-color);
  margin-top: 6px;
  padding-top: 6px;
}

@media (max-width: 768px) {
  /* Skeleton containment on mobile */
  .skeleton {
    max-width: 100% !important;
  }

  /* Fix 4 Summary KPI cards on mobile: stop vertical character wrapping */
  .financial-summary-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8px !important;
  }
  .summary-card {
    padding: 10px 12px !important;
    min-height: auto !important;
  }
  .summary-card-header {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 4px !important;
    margin-bottom: 6px !important;
  }
  .summary-card-header > .flex {
    width: 100% !important;
  }
  .summary-title {
    font-size: 0.78rem !important;
    line-height: 1.35 !important;
    word-break: keep-all !important;
    white-space: normal !important;
  }
  .summary-card-header .badge {
    font-size: 0.65rem !important;
    padding: 2px 6px !important;
    align-self: flex-start !important;
    margin-left: 0 !important;
  }
  .summary-value {
    font-size: 1.35rem !important;
    margin-bottom: 2px !important;
  }
  .summary-caption {
    display: none !important;
  }
  .card-click-hint {
    font-size: 0.68rem !important;
    margin-top: 4px !important;
  }

  /* Receivables overview & cards on mobile */
  .desktop-consolidated-table {
    display: none !important;
  }
  .mobile-consolidated-list {
    display: flex !important;
  }

  /* Payout History on mobile */
  .desktop-payout-table {
    display: none !important;
  }
  .mobile-payout-list {
    display: flex !important;
  }
  .receivables-overview-banner {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 12px !important;
  }
  .receivables-banner-right {
    text-align: left !important;
    width: 100%;
    border-top: 1px dashed var(--border-color);
    padding-top: 10px;
    margin-top: 4px;
  }
  .branch-card-header {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 8px !important;
  }
  .branch-card-header-amount {
    text-align: left !important;
    width: 100%;
    border-top: 1px dashed var(--border-color);
    padding-top: 8px;
    margin-top: 4px;
  }
}

/* ────────────────────────────────────────────────────────── */
/* DEDICATED DISPATCH TAB (PUSH MODEL) STYLES                */
/* ────────────────────────────────────────────────────────── */
.dispatch-section {
  width: 100%;
}

.catalog-layout {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

@media (min-width: 1024px) {
  .catalog-layout {
    flex-direction: row;
    align-items: flex-start;
  }
  .catalog-main {
    flex: 1;
    min-width: 0;
  }
  .cart-sidebar {
    width: 380px;
    flex-shrink: 0;
    position: sticky;
    top: calc(var(--header-height, 60px) + 16px);
  }
}

.cart-sidebar {
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  box-sizing: border-box;
}

.cart-header {
  border-bottom: 1px solid var(--border-color);
}

.clear-cart-btn {
  background: none;
  border: none;
  padding: 4px;
  font-size: 0.8rem;
  transition: opacity var(--transition-base);
}

.clear-cart-btn:hover {
  text-decoration: underline;
  opacity: 0.8;
}

.cart-items-list {
  max-height: 420px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

.cart-row {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  transition: all var(--transition-base);
  width: 100%;
  box-sizing: border-box;
}

.cart-row:hover {
  border-color: var(--primary-light, #c92a2a);
}

.cart-item-name {
  line-height: 1.35;
  word-break: break-word;
}

.cart-item-sub {
  line-height: 1.3;
  word-break: break-word;
}

.cart-item-bottom {
  border-top: 1px dashed rgba(139, 3, 19, 0.15);
  margin-top: 10px;
  padding-top: 8px;
}

.btn-qty {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--text-primary);
  transition: all var(--transition-base);
  padding: 0;
  line-height: 1;
}

.btn-qty:hover {
  background: var(--primary);
  color: #ffffff;
  border-color: var(--primary);
}

.cart-total-row {
  border-top: 1px dashed var(--border-color);
}

.btn-submit-requisition {
  height: 48px;
  font-size: 0.95rem;
  font-weight: 700;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(139, 3, 19, 0.2);
}

.item-card {
  position: relative !important;
}

.item-card.in-cart {
  /* No dimming / tinting when selected; card remains crisp with normal background */
  background: var(--card-bg, #ffffff) !important;
  border-color: var(--border-color) !important;
}

.dispatch-branch-select-wrapper {
  min-width: 200px;
}

.dispatch-branch-select {
  font-size: var(--font-sm);
  font-weight: var(--font-weight-bold);
}

.qty-badge {
  display: flex !important;
  position: absolute;
  top: -8px;
  right: -8px;
  width: 26px;
  height: 26px;
  background: var(--primary, #8b0313);
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 10px rgba(139, 3, 19, 0.45);
  border: 2px solid #ffffff;
  z-index: 10;
  animation: popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* ============================================================ */
/* MOBILE DOCKED CART BAR & BOTTOM SHEET DRAWER (POS DESIGN)    */
/* ============================================================ */
.cart-bar {
  position: fixed;
  bottom: calc(var(--bottom-nav-height, 60px) + var(--safe-bottom, 0px));
  left: 0;
  right: 0;
  margin: 0 auto;
  width: 100%;
  max-width: var(--max-width, 100%);
  height: var(--cart-bar-height, 60px);
  padding: 0 var(--space-lg);
  background: rgba(139, 3, 19, 0.96);
  backdrop-filter: var(--glass-blur, blur(10px));
  -webkit-backdrop-filter: var(--glass-blur, blur(10px));
  border-top: 2px solid var(--accent, #ffab2b);
  z-index: 50;
  display: flex;
  align-items: center;
  animation: slideUp 0.3s ease;
  box-sizing: border-box;
}

.cart-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  width: 100% !important;
}

.cart-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cart-count {
  font-size: var(--font-xs);
  color: rgba(255, 247, 223, 0.85);
  line-height: 1.2;
}

.cart-total {
  font-size: var(--font-xl);
  font-weight: var(--font-weight-bold);
  color: var(--accent, #ffab2b);
  line-height: 1.1;
  letter-spacing: -0.01em;
}

.cart-pay-btn {
  padding: 8px 18px;
  background: var(--accent, #ffab2b);
  color: var(--primary-dark, #500000);
  font-weight: var(--font-weight-bold);
  border-radius: var(--radius-md);
  box-shadow: 0 0 15px rgba(255, 171, 43, 0.35);
  border: none;
  cursor: pointer;
  font-size: var(--font-sm);
  transition: all var(--transition-base);
}

.cart-pay-btn:active {
  transform: scale(0.96);
  box-shadow: 0 0 25px rgba(255, 171, 43, 0.5);
}

/* Mobile Slide-up Drawer Overlay */
.cart-drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  z-index: 55;
  animation: fadeIn 0.2s ease;
}

/* Mobile Slide-up Cart Drawer Panel */
.cart-detail-panel {
  position: fixed;
  bottom: calc(var(--bottom-nav-height, 60px) + var(--safe-bottom, 0px));
  left: 0;
  right: 0;
  margin: 0 auto;
  width: 100%;
  max-width: var(--max-width, 100%);
  max-height: 78vh;
  background: var(--bg-secondary, #fff8ee);
  border: 2px solid var(--primary-light, #ad281e) !important;
  border-radius: var(--radius-2xl, 16px) var(--radius-2xl, 16px) 0 0;
  box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.25) !important;
  display: flex !important;
  flex-direction: column !important;
  z-index: 56;
  animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  overflow: hidden;
}

.cart-detail-panel.hidden {
  display: none !important;
}

.cart-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px !important;
  border-bottom: 2px dashed rgba(139, 3, 19, 0.15) !important;
  background: rgba(255, 247, 223, 0.98) !important;
  z-index: 1;
  flex-shrink: 0;
}

.cart-drawer-scroll-body {
  flex: 1 1 auto;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 14px 18px;
  max-height: calc(78vh - 165px);
}

.cart-drawer-footer {
  flex-shrink: 0;
  background: #ffffff;
  border-top: 1px solid rgba(139, 3, 19, 0.12);
  padding: 12px 18px 16px 18px;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.06);
}

.cart-drawer-footer .cart-total-row {
  margin-bottom: 10px;
}

/* ============================================================ */
/* RESPONSIVE BREAKPOINTS: DESKTOP VS MOBILE ONLY               */
/* ============================================================ */
@media (min-width: 1024px) {
  .mobile-only-cart {
    display: none !important;
  }
}

@media (max-width: 1023px) {
  /* Hide desktop sidebar cart; user uses docked bar + bottom sheet */
  .cart-sidebar {
    display: none !important;
  }

  .catalog-layout {
    padding-bottom: calc(var(--bottom-nav-height, 60px) + var(--safe-bottom, 0px) + var(--cart-bar-height, 60px) + 35px) !important;
  }
}

@media (max-width: 768px) {
  /* Toolbar Card on mobile */
  .dispatch-toolbar-card {
    padding: var(--space-sm) 12px !important;
  }

  /* Fix Dropdown exceeding frame on mobile */
  .dispatch-target-branch-bar {
    width: 100% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 8px !important;
    margin-top: 8px !important;
    box-sizing: border-box !important;
  }

  .dispatch-target-branch-bar label {
    flex-shrink: 0 !important;
    font-size: var(--font-xs) !important;
  }

  .dispatch-branch-select-wrapper {
    flex: 1 !important;
    min-width: 0 !important;
    width: auto !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  .dispatch-branch-select {
    width: 100% !important;
    max-width: 100% !important;
    height: 38px !important;
    min-height: 38px !important;
    font-size: var(--font-xs) !important;
    padding: 0 32px 0 10px !important;
    box-sizing: border-box !important;
  }

  .dispatch-branch-select-wrapper .custom-select-dropdown {
    width: 100% !important;
    max-width: 100% !important;
    left: 0 !important;
    right: 0 !important;
    box-sizing: border-box !important;
  }

  /* 2-column mobile item cards (Matching BranchRequisition) */
  .grid-cards {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 8px !important;
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  .item-card {
    padding: 8px !important;
    border-radius: var(--radius-lg) !important;
    min-height: unset !important;
    min-width: 0 !important;
    max-width: 100% !important;
    width: 100% !important;
    box-sizing: border-box !important;
    position: relative !important;
    cursor: pointer;
    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;
    align-items: stretch !important;
  }

  .item-card:active {
    transform: scale(0.97);
  }

  .item-card.in-cart {
    background: var(--card-bg, #ffffff) !important;
    border-color: var(--border-color) !important;
    box-shadow: var(--shadow-sm) !important;
  }

  .card-top-badges {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    width: 100% !important;
    gap: 4px !important;
    margin-bottom: 6px !important;
    box-sizing: border-box !important;
  }

  .card-badge-category {
    font-size: 9.5px !important;
    padding: 2px 6px !important;
    max-width: calc(100% - 26px) !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  .card-badge-status {
    width: 20px !important;
    height: 20px !important;
    font-size: 9.5px !important;
    padding: 0 !important;
  }

  .item-img-container {
    height: 95px !important;
    width: 100% !important;
    margin-bottom: 6px !important;
    border-radius: var(--radius-md) !important;
    background: linear-gradient(180deg, #fff7df 0%, #fceecc 100%) !important;
  }

  .item-name {
    font-size: 13px !important;
    line-height: 1.25 !important;
    margin-bottom: 4px !important;
  }

  .item-meta-box {
    margin-bottom: 2px !important;
  }

  .item-meta-row {
    padding: 1px 0 !important;
    font-size: 11px !important;
  }

  .item-cost-val, .item-stock-val {
    font-size: 0.9rem !important;
  }

  .stock-prefix {
    display: inline !important;
  }

  /* Restore and properly style Catalog card footer actions on mobile */
  .card-footer-actions {
    display: flex !important;
    flex-direction: column !important;
    gap: 5px !important;
    width: 100% !important;
    margin-top: 6px !important;
  }

  .btn-restock-main {
    height: 34px !important;
    min-height: 34px !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    padding: 0 6px !important;
    border-radius: var(--radius-md) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 4px !important;
    width: 100% !important;
  }

  .card-sub-actions {
    display: flex !important;
    gap: 4px !important;
    width: 100% !important;
  }

  .btn-card-sub {
    height: 30px !important;
    min-height: 30px !important;
    font-size: 10px !important;
    font-weight: 600 !important;
    padding: 0 4px !important;
    border-radius: var(--radius-sm) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 3px !important;
  }

  .btn-card-sub.text-danger {
    flex: 0 0 30px !important;
    padding: 0 !important;
  }

  /* Floating quantity badge on card top right */
  .qty-badge {
    display: flex !important;
    position: absolute;
    top: -6px;
    right: -6px;
    width: 24px;
    height: 24px;
    background: var(--primary, #8b0313);
    color: #ffffff;
    font-size: 12px;
    font-weight: 700;
    border-radius: 50%;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(139, 3, 19, 0.4);
    border: 2px solid #ffffff;
    z-index: 10;
    animation: popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
}
</style>
