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
          </div>

          <!-- 5. ปุ่มแอ็กชัน (อ้างอิงความกว้างเต็มเท่ารูปภาพ ซ้าย-ขวาเต็ม ไม่โดนบีบ) -->
          <div class="card-footer-actions">
            <!-- ปุ่มเติมสต็อกด่วน เต็มความกว้างซ้าย-ขวา -->
            <button class="btn-action btn-action-primary w-full btn-restock-main" @click="openQuickRestockModal(item)">
              <i class="fa-solid fa-plus-circle"></i> เติมสต็อกด่วน
            </button>
            
            <!-- ปุ่มแก้ไข และ ของเสีย 2 ปุ่มในบรรทัดเดียว ขยายซ้าย-ขวาเต็ม -->
            <div class="card-sub-actions flex gap-xs w-full">
              <button class="btn-action btn-action-edit flex-1 btn-card-sub" @click="openEditItemModal(item)">
                <i class="fa-solid fa-pen"></i> แก้ไข
              </button>
              <button class="btn-action btn-action-waste flex-1 btn-card-sub" @click="openWasteModal(item)">
                <i class="fa-solid fa-trash-can"></i> ตัดของเสีย
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
                  <div class="text-xs text-secondary">หน่วยนับ: {{ item.unit }}</div>
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

        <!-- Right: Branch Filter Dropdown -->
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
              <span class="badge font-bold" :class="getStatusBadgeClass(order.status)">
                <i v-if="order.status === 'pending'" class="fa-solid fa-hourglass-start"></i>
                <i v-else-if="order.status === 'dispatched'" class="fa-solid fa-truck-fast"></i>
                <i v-else-if="order.status === 'received'" class="fa-solid fa-circle-check"></i>
                <span>{{ getStatusLabel(order.status) }}</span>
              </span>
            </div>

            <div class="order-total-header">
              <span class="order-total-label">ยอดต้นทุนตัดเข้าสาขา:</span>
              <span class="order-total-amount font-bold text-primary">฿{{ formatNumber(order.total_cost) }}</span>
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
                    <th class="col-qty text-center">จำนวนขอเบิก</th>
                    <th class="col-total text-right">รวมมูลค่า</th>
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
                    </td>
                    <td class="col-total text-right font-bold text-sm text-primary">
                      ฿{{ formatNumber(it.quantity * it.cost_price) }}
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
                  <span class="order-qty-pill font-bold">
                    {{ it.quantity }} {{ it.unit }}
                  </span>
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
                <i class="fa-solid fa-triangle-exclamation"></i> กรุณาตรวจสอบสต็อกจริงก่อนกดจัดส่ง
              </span>
              <span v-else-if="order.status === 'dispatched'" class="text-info font-bold flex align-center gap-xs">
                <i class="fa-solid fa-truck-ramp-box"></i> ของถูกตัดออกจากสต็อกครัวกลางแล้ว รอสาขากดยืนยันตรวจรับ
              </span>
              <span v-else-if="order.status === 'received'" class="text-success font-bold flex align-center gap-xs">
                <i class="fa-solid fa-circle-check"></i> สาขารับของครบถ้วน และบันทึกเป็น Expense สาขาเรียบร้อย
              </span>
            </div>

            <div class="order-footer-actions">
              <button 
                v-if="order.status === 'pending'" 
                class="btn btn-primary btn-dispatch-order"
                @click="dispatchOrder(order)"
              >
                <i class="fa-solid fa-truck-fast mr-2"></i> ยืนยันจัดส่ง & ตัดสต็อกครัวกลาง
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
            :class="{ active: historyFilter === 'requisition' }"
            @click="historyFilter = 'requisition'"
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
                    <span>{{ getStatusLabel(h.status) }}</span>
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
              <div class="history-total-amount font-bold text-lg text-primary">
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
    <div v-if="activeTab === 'finance'" class="finance-section">
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
              <div class="skeleton" style="width: 120px; height: 18px; border-radius: var(--radius-xs);"></div>
              <div class="skeleton" style="width: 70px; height: 20px; border-radius: var(--radius-full);"></div>
            </div>
            <div class="skeleton my-sm" style="width: 140px; height: 32px; border-radius: var(--radius-sm);"></div>
            <div class="skeleton" style="width: 180px; height: 14px; border-radius: var(--radius-xs);"></div>
          </div>
        </div>

        <!-- Ledger Table Skeleton -->
        <div class="card p-lg ledger-card">
          <div class="flex flex-between align-center mb-lg pb-md" style="border-bottom: 1px solid var(--border-color-light);">
            <div class="skeleton" style="width: 220px; height: 24px; border-radius: var(--radius-xs);"></div>
            <div class="skeleton" style="width: 320px; height: 42px; border-radius: var(--radius-full);"></div>
          </div>
          <div class="skeleton mb-xs" style="width: 100%; height: 42px; border-radius: var(--radius-sm);"></div>
          <div class="skeleton mb-xs" style="width: 100%; height: 48px; border-radius: var(--radius-sm);"></div>
          <div class="skeleton" style="width: 100%; height: 48px; border-radius: var(--radius-sm);"></div>
        </div>
      </div>

      <!-- Content when Finance Data Loaded -->
      <div v-else class="flex flex-col gap-lg">
        <!-- 4 Summary KPI Cards -->
        <div class="financial-summary-grid">
          <!-- Card 1: Cash Balance -->
          <div class="summary-card card-accent-primary">
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
            <div class="summary-caption text-xs text-muted">สินค้าในคลัง คำนวณจากราคาทุนจริง</div>
          </div>

          <!-- Card 3: Pending Receivables from Branches -->
          <div class="summary-card card-accent-danger">
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

        <!-- Transactions Ledger Card -->
        <div class="card p-lg ledger-card">
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

        <!-- 2-Column Row for Reimbursement Settlement & Dividend Payout History -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-lg">
          <!-- Card A: สถานะการเคลียร์ค่าของคืนครัวกลาง -->
          <div class="card p-lg flex flex-col justify-between" style="background: #ffffff; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
            <div>
              <div class="card-title mb-lg flex align-start gap-xs" style="border-bottom: 1px solid var(--border-color); padding-bottom: 14px;">
                <i class="fa-solid fa-hand-holding-dollar text-primary" style="margin-top: 3px; font-size: 1.1rem;"></i>
                <div>
                  <div class="font-bold text-base" style="color: var(--text-primary); line-height: 1.35;">
                    การเคลียร์เงินค่าของคืนครัวกลาง
                  </div>
                  <div class="text-secondary text-xs font-normal mt-2xs">
                    สาขาต้องนำเงินรายได้จากการขายมาชำระคืนต้นทุนสินค้าให้ครัวกลาง
                  </div>
                </div>
              </div>

              <!-- Metrics: Clean, open, spacious list with no cramped box backgrounds -->
              <div class="flex flex-col gap-xs mb-lg">
                <div class="flex flex-between align-center py-sm">
                  <span class="text-sm text-secondary">ต้นทุนของที่เบิกไปทั้งหมด:</span>
                  <span class="font-bold text-base text-primary">฿{{ formatNumber(settlementData.central_kitchen_cost) }}</span>
                </div>
                <div class="flex flex-between align-center py-sm" style="border-top: 1px dashed var(--border-color);">
                  <span class="text-sm text-success font-medium">ชำระคืนครัวกลางแล้ว:</span>
                  <span class="font-bold text-base text-success">฿{{ formatNumber(settlementData.reimbursement?.reimbursed_cost) }}</span>
                </div>
                <div class="flex flex-between align-center py-sm" style="border-top: 1px dashed var(--border-color);">
                  <span class="text-sm text-danger font-medium">ยอดค้างชำระคืน:</span>
                  <span class="font-bold text-lg text-danger">฿{{ formatNumber(settlementData.reimbursement?.pending_reimbursement) }}</span>
                </div>
              </div>

              <!-- Status Alert: Clean, open, unboxed status row -->
              <div 
                class="flex align-center gap-xs py-sm text-sm"
                :class="settlementData.reimbursement?.is_fully_reimbursed ? 'text-success font-bold' : 'text-warning font-medium'"
                style="border-top: 1px solid var(--border-color); padding-top: 14px;"
              >
                <i :class="settlementData.reimbursement?.is_fully_reimbursed ? 'fa-solid fa-circle-check text-success' : 'fa-solid fa-hourglass-half text-warning'"></i>
                <span>
                  {{ settlementData.reimbursement?.is_fully_reimbursed ? 'สาขานี้เคลียร์ชำระค่าของคืนครัวกลางครบถ้วนเรียบร้อยแล้ว' : `มียอดค้างชำระคืนครัวกลาง ฿${formatNumber(settlementData.reimbursement?.pending_reimbursement)}` }}
                </span>
              </div>
            </div>

            <!-- Reimburse Action Button: Global btn-primary -->
            <button 
              v-if="settlementData.reimbursement && settlementData.reimbursement.pending_reimbursement > 0"
              class="btn btn-primary w-full py-md font-bold mt-lg"
              @click="openReimburseModal"
            >
              <i class="fa-solid fa-money-bill-transfer mr-1"></i> เคลียร์โอนเงินคืนครัวกลาง (฿{{ formatNumber(settlementData.reimbursement.pending_reimbursement) }})
            </button>
          </div>

          <!-- Card B: ประวัติการจ่ายเงินปันผลจริง -->
          <div class="card p-lg flex flex-col justify-between" style="background: #ffffff; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
            <div>
              <div class="card-title mb-lg flex flex-between align-center" style="border-bottom: 1px solid var(--border-color); padding-bottom: 14px;">
                <div class="flex align-start gap-xs">
                  <i class="fa-solid fa-file-invoice-dollar text-primary" style="margin-top: 3px; font-size: 1.1rem;"></i>
                  <div>
                    <div class="font-bold text-base" style="color: var(--text-primary); line-height: 1.35;">
                      ประวัติการจ่ายเงินปันผลจริง
                    </div>
                    <div class="text-secondary text-xs font-normal mt-2xs">
                      บันทึกการโอนเงินปันผลให้แก่เจ้าของและหุ้นส่วน
                    </div>
                  </div>
                </div>

                <button 
                  class="btn btn-primary btn-payout-header"
                  @click="openPayoutModal()"
                >
                  <i class="fa-solid fa-paper-plane mr-1"></i> จ่ายปันผล
                </button>
              </div>

              <!-- Payouts List: Clean unboxed list -->
              <div v-if="!settlementData.payouts || settlementData.payouts.length === 0" class="empty-state-box empty-state-compact">
                <div class="empty-state-icon empty-state-icon-sm">
                  <i class="fa-solid fa-receipt"></i>
                </div>
                <div class="empty-state-desc text-xs">ยังไม่มีประวัติการจ่ายเงินปันผลของสาขานี้</div>
              </div>
              <div v-else class="flex flex-col gap-xs" style="max-height: 250px; overflow-y: auto;">
                <div 
                  v-for="po in settlementData.payouts" 
                  :key="po.id"
                  class="py-sm flex flex-between align-center"
                  style="border-bottom: 1px dashed var(--border-color);"
                >
                  <div>
                    <div class="flex align-center gap-xs">
                      <span class="font-bold text-sm">{{ po.partner_name }}</span>
                      <span class="badge badge-success text-2xs" style="font-size: 10px; padding: 1px 6px;">ชำระแล้ว</span>
                    </div>
                    <div class="text-xs text-secondary mt-2xs">
                      {{ formatDateTime(po.payout_date || po.created_at) }}
                      <span v-if="po.note"> • {{ po.note }}</span>
                    </div>
                  </div>
                  <div class="text-right">
                    <span class="font-bold text-primary text-base">฿{{ formatNumber(po.amount) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="text-2xs text-tertiary mt-md text-right">
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

          <!-- Buttons -->
          <div class="flex gap-md mt-xl">
            <button class="btn-modal btn-modal-secondary flex-1" :disabled="isSavingItem" @click="showItemModal = false">ยกเลิก</button>
            <button 
              class="btn-modal btn-modal-primary flex-1" 
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
      <div class="modal-content modal-center w-full max-w-sm" style="position:relative; z-index:2; overflow-y:auto; max-height:85dvh;">
        <div class="modal-header">
          <h3>
            <i class="fa-solid fa-hand-holding-dollar text-success" style="margin-right: 6px;"></i>
            โอนเคลียร์เงินคืนครัวกลาง
          </h3>
          <button class="modal-close" @click="showReimburseModal = false">✕</button>
        </div>

        <div class="modal-body">
          <div class="p-md rounded mb-md text-sm" style="border: 1px solid var(--border-color); background: var(--bg-secondary);">
            สาขา: <strong>{{ settlementData?.branch_name }}</strong><br />
            ยอดค้างชำระคืนทั้งหมด: <strong class="text-danger text-lg">฿{{ formatNumber(settlementData?.reimbursement?.pending_reimbursement) }}</strong>
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
              <span class="font-bold text-sm text-main">{{ settlementData?.branch_name || '-' }}</span>
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
            <select v-model="payoutForm.partner_name" class="form-select w-full font-bold">
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
  total_operating_expenses: 0
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
    const res = await api.centralKitchen.getItems({ active_only: 'false' });
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
    image_url: ''
  };
  isCategoryModalDropdownOpen.value = false;
  isUomModalDropdownOpen.value = false;
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
    image_url: item.image_url || ''
  };
  isCategoryModalDropdownOpen.value = false;
  isUomModalDropdownOpen.value = false;
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

// Dispatch Order
const dispatchOrder = async (order) => {
  const ok = await ui.showConfirm(
    'ยืนยันจัดส่งของ',
    `คุณต้องการจัดส่งใบเบิก #${order.transfer_no} ให้ ${order.branch_name} ใช่หรือไม่? (ระบบจะตัดสต็อกครัวกลางทันที)`
  );
  if (!ok) return;

  ui.showLoading();
  try {
    await api.centralKitchen.dispatchTransfer(order.id);
    ui.success('จัดส่งสินค้าและตัดสต็อกครัวกลางเรียบร้อยแล้ว');
    loadOrders();
    loadItems();
    loadHistory();
  } catch (err) {
    ui.error(err.message);
  } finally {
    ui.hideLoading();
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
    const [summaryRes, logsRes] = await Promise.all([
      api.centralKitchen.getFinancesSummary(),
      api.centralKitchen.getFinancesLogs()
    ]);
    if (summaryRes.success) financeSummary.value = summaryRes.data;
    if (logsRes.success) financeLogs.value = logsRes.data;
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

const isFinanceInflow = (type) => {
  return type === 'capital_in' || type === 'reimbursement_in';
};

const getFinanceTypeBadgeClass = (type) => {
  const map = {
    'capital_in': 'badge-success',
    'reimbursement_in': 'badge-info',
    'purchase_out': 'badge-warning',
    'operating_expense_out': 'badge-danger'
  };
  return map[type] || 'badge-secondary';
};

const getFinanceTypeLabel = (type) => {
  const map = {
    'capital_in': 'เติมเงินทุน',
    'reimbursement_in': 'สาขาคืนเงิน',
    'purchase_out': 'ซื้อของเข้าคลัง',
    'operating_expense_out': 'ค่าใช้จ่ายครัวกลาง'
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
  if (!wasteForm.value.quantity_wasted || wasteForm.value.quantity_wasted <= 0) {
    return ui.error('กรุณาระบุจำนวนที่ตัดของเสีย');
  }
  if (wasteForm.value.quantity_wasted > (activeWasteItem.value?.quantity || 0)) {
    return ui.error('จำนวนที่ตัดของเสียมากกว่าสต็อกที่มีในครัวกลาง');
  }
  isSavingWaste.value = true;
  ui.showLoading();
  try {
    await api.centralKitchen.recordWaste(activeWasteItem.value.id, wasteForm.value);
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
const openReimburseModal = () => {
  reimburseNote.value = `โอนเคลียร์เงินคืนครัวกลาง สาขา ${settlementData.value?.branch_name || ''}`;
  showReimburseModal.value = true;
};

const submitReimburseBranch = async () => {
  if (!selectedPartnerBranch.value) return;
  isSubmittingReimburse.value = true;
  ui.showLoading();
  try {
    const res = await api.centralKitchen.reimburseBranchTransfers({
      branch_id: selectedPartnerBranch.value,
      note: reimburseNote.value
    });
    ui.success(res.message || 'เคลียร์โอนเงินคืนครัวกลางเรียบร้อยแล้ว');
    showReimburseModal.value = false;
    await loadPartnerData();
    await loadFinances();
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
      partner_name: partner.name,
      share_percentage: partner.share_percentage,
      amount: partner.payout_amount > 0 ? partner.payout_amount : null,
      note: `เงินปันผล (${partner.share_percentage}%)`
    };
  } else {
    payoutForm.value = {
      partner_name: '',
      share_percentage: 0,
      amount: null,
      note: ''
    };
  }
  showPayoutModal.value = true;
};

const submitPayout = async () => {
  if (!payoutForm.value.partner_name?.trim()) {
    return ui.error('กรุณาระบุชื่อผู้รับเงินปันผล');
  }
  if (!payoutForm.value.amount || payoutForm.value.amount <= 0) {
    return ui.error('กรุณาระบุยอดเงินปันผลที่มากกว่า 0');
  }
  isSubmittingPayout.value = true;
  ui.showLoading();
  try {
    await api.centralKitchen.recordPayouts({
      branch_id: selectedPartnerBranch.value,
      partner_name: payoutForm.value.partner_name,
      amount: payoutForm.value.amount,
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
  else if (tab === 'finance') loadFinances();
}, { immediate: true });

onMounted(async () => {
  window.addEventListener('click', closeCategoryModalDropdown);
  window.addEventListener('click', closeUomModalDropdown);
  window.addEventListener('click', closeTransactionTypeDropdown);
  window.addEventListener('click', closeOrderBranchDropdown);
  window.addEventListener('click', closePartnerBranchDropdown);
  await loadBranches();
  loadItems();
  loadOrders();
  loadHistory();
  loadFinances();
});

onUnmounted(() => {
  window.removeEventListener('click', closeCategoryModalDropdown);
  window.removeEventListener('click', closeUomModalDropdown);
  window.removeEventListener('click', closeTransactionTypeDropdown);
  window.removeEventListener('click', closeOrderBranchDropdown);
  window.removeEventListener('click', closePartnerBranchDropdown);
});
</script>

<style scoped>
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

@media (max-width: 576px) {
  .financial-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
