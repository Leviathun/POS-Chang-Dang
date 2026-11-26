<template>
  <div class="central-kitchen-view page-enter">

    <!-- ────────────────────────────────────────────────────────── -->
    <!-- TAB 1: CATALOG (แคตตาล็อกสินค้า + เติมสต็อกด่วน) -->
    <!-- ────────────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'catalog'" class="catalog-section">
      <!-- ────────────────────────────────────────────────────────── -->
      <!-- REORDER MODE: แบบเดียวกับหน้าจัดการเมนู POS (Menu.vue)      -->
      <!-- ────────────────────────────────────────────────────────── -->
      <ReorderItemsPanel
        v-if="isReorderMode"
        v-model:items="reorderItems"
        :is-saving="isSavingReorder"
        title-prefix="จัดลำดับเมนู"
        column-header="สินค้าในครัวกลาง"
        :get-category-label="(item) => getCategoryLabel(item.category)"
        :get-desktop-price-text="(item) => `฿${formatNumber(item.cost_price)} / ${item.unit}`"
        :get-mobile-price-text="(item) => `฿${formatNumber(item.cost_price)}`"
        @close="closeReorderMode"
        @save="handleSaveReorder"
      />

      <!-- ────────────────────────────────────────────────────────── -->
      <!-- NORMAL CATALOG VIEW (เมื่อไม่ได้อยู่ในโหมดจัดเรียง)           -->
      <!-- ────────────────────────────────────────────────────────── -->
      <div v-else>
      <!-- Action & Filter Bar (Requirement 2 & 3) -->
      <div class="card mb-lg p-md">
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

        <!-- Middle Row: Category Filter Pills -->
        <div class="flex gap-xs align-center flex-wrap">
          <button 
            v-for="cat in categories" 
            :key="cat.id" 
            class="filter-pill"
            :class="{ 'active': selectedCategory === cat.id }"
            @click="selectedCategory = cat.id"
          >
            {{ cat.label }}
            <span v-if="getCategoryCount(cat.id) > 0" class="ml-xs font-normal opacity-90">
              ({{ getCategoryCount(cat.id) }})
            </span>
          </button>
        </div>

        <!-- Bottom Row: Separate Action Buttons Row -->
        <div class="catalog-toolbar-actions">
          <button class="btn btn-secondary" @click="openCategoryModal" title="จัดการหมวดหมู่สินค้าในครัวกลาง">
            <i class="fa-solid fa-folder-open"></i> <span>จัดการหมวด</span>
          </button>
          <button class="btn btn-secondary" @click="openReorderMode" title="จัดเรียงลำดับการแสดงแคตตาล็อก">
            <i class="fa-solid fa-sort"></i> <span>เรียงลำดับ</span>
          </button>
          <button class="btn btn-primary" @click="openCreateItemModal">
            <i class="fa-solid fa-plus"></i> <span>สร้างใหม่</span>
          </button>
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
      <div v-else class="grid-cards">
        <div 
          v-for="item in filteredItems" 
          :key="item.id" 
          class="card item-card"
          :class="{ 'low-stock': item.quantity <= item.min_stock_alert }"
        >
          <!-- 1. TOP: ประเภท กับ พร้อมจ่าย (ใช้เฉพาะไอคอนประหยัดพื้นที่ ไม่เบียด) -->
          <div class="card-top-badges flex flex-between align-center">
            <span class="badge badge-neutral card-badge-category">
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
              <i class="fa-solid fa-box-open"></i>
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
              <span class="font-bold text-primary item-cost-val" style="font-size: var(--font-base);">
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
                style="font-size: var(--font-base);"
              >
                {{ formatNumber(item.quantity) }} {{ item.unit }}
              </span>
            </div>

            <div v-if="item.pack_size > 1" class="item-meta-row flex flex-between align-center text-xs py-1">
              <span class="item-meta-label text-secondary font-medium flex align-center gap-xs">
                <i class="fa-solid fa-arrows-rotate text-primary"></i>
                <span>แปลงหน่วย:</span>
              </span>
              <span class="font-bold text-primary item-pack-val" style="font-size: var(--font-sm); white-space: nowrap;">
                1 {{ item.unit }} = {{ item.pack_size }} ชิ้น
              </span>
            </div>
          </div>

          <!-- 5. ปุ่มแอ็กชัน (อ้างอิงความกว้างเต็มเท่ารูปภาพ ซ้าย-ขวาเต็ม ไม่โดนบีบ) -->
          <div class="card-footer-actions">
            <!-- ปุ่มเติมสต็อกด่วน เต็มความกว้างซ้าย-ขวา -->
            <button class="btn-action btn-action-primary w-full" @click="openQuickRestockModal(item)">
              <i class="fa-solid fa-plus-circle"></i> เติมสต็อกด่วน
            </button>
            
            <!-- ปุ่มปรับปรุงสต็อก ยาวสีแดง คล้ายเติมสต็อกด่วน เอาไว้ใต้ เติมสต็อกด่วน -->
            <button class="btn-action btn-action-primary w-full" @click="openAdjustStockModal(item)">
              <i class="fa-solid fa-sliders"></i> ปรับปรุงสต็อก
            </button>
            
            <!-- ปุ่มแก้ไข, ของเสีย, และลบสินค้า ขยายซ้าย-ขวาเต็ม -->
            <div class="card-sub-actions flex gap-xs w-full">
              <button class="btn-action btn-action-edit flex-1" @click="openEditItemModal(item)" title="แก้ไขข้อมูลสินค้า">
                <i class="fa-solid fa-pen"></i> แก้ไข
              </button>
              <button class="btn-action btn-action-delete flex-1" @click="openWasteModal(item)" title="ตัดของเสีย/หมดอายุ">
                <i class="fa-solid fa-dumpster"></i> ของเสีย
              </button>
              <button class="btn-action btn-action-delete" style="flex: 0 0 36px; padding: 0;" @click="confirmDeleteItem(item)" title="ลบสินค้าออกจากแคตตาล็อก">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      </div>
    </div>

    <!-- ────────────────────────────────────────────────────────── -->
    <!-- TAB 1.5: DISPATCH (จ่ายของให้สาขา - Push Model) -->
    <!-- ────────────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'dispatch'" class="dispatch-section">
      <!-- Top Action Toolbar Card -->
      <div class="card mb-lg page-header-card dispatch-toolbar-card">
        <div class="page-header-left">
          <div class="header-icon-circle">
            <i class="fa-solid fa-truck-arrow-right"></i>
          </div>
          <div class="page-header-text">
            <h2 class="page-header-title">ระบบจ่ายของให้สาขา</h2>
          </div>
        </div>

        <!-- Target Branch Selector (Prominent in Toolbar) -->
        <DatePeriodFilter
          branch-only
          v-model:branch-id="dispatchBranchId"
          :branches="retailBranches"
          :show-all-branches="false"
          branch-label="สาขาปลายทาง:"
        />
      </div>

      <!-- Main Layout: Left Catalog (70%) + Right Cart (30%) -->
      <KitchenCatalogCart
        :items="items"
        :categories="categories"
        :is-loading-items="isLoadingItems"
        :get-category-label="getCategoryLabel"
        v-model:cart="dispatchCart"
        v-model:notes="dispatchNotes"
        :is-submitting="isSubmittingDispatch"
        :submit-disabled="!dispatchBranchId"
        :show-remove-item-btn="true"
        search-placeholder="ค้นหาชื่อสินค้า, วัตถุดิบ, ซอส, บรรจุภัณฑ์..."
        stock-label="ในครัวกลาง:"
        add-button-text="เพิ่มลงรายการจ่าย"
        cart-title="รายการของที่จะจ่าย"
        :mobile-cart-title="`รายการของที่จะจ่าย (${selectedDispatchBranchName || 'ยังไม่เลือกสาขา'})`"
        cart-icon="fa-solid fa-truck-arrow-right"
        empty-cart-title="ยังไม่มีสินค้าในรายการจ่าย"
        empty-cart-desc="คลิกการ์ดสินค้าทางซ้ายเพื่อเพิ่มรายการที่จะส่งให้สาขา"
        notes-label="บันทึกช่วยจำ / รอบส่ง (ถ้ามี):"
        notes-placeholder="เช่น รอบส่งเช้า 08:30 น., ส่งของด่วน"
        submit-icon="fa-solid fa-truck-arrow-right"
        submit-label="ยืนยันจ่ายของให้สาขา (ตัดสต็อกทันที)"
        submitting-label="กำลังบันทึกจ่ายของ..."
        mobile-submit-label="ยืนยันจ่ายของ"
        mobile-submitting-label="กำลังจ่าย..."
        @submit="submitPushDispatch"
      >
        <template #cart-banner>
          <div class="dispatch-branch-info-card flex align-center gap-md" style="background: rgba(139, 3, 19, 0.03); padding: 12px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: var(--space-md);">
            <div style="width: 36px; height: 36px; border-radius: var(--radius-sm); background: var(--card-bg); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid var(--border-color-light); box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
              <i class="fa-solid fa-building-circle-arrow-right text-primary" style="font-size: var(--font-md);"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-xs text-secondary font-medium" style="margin-bottom: 2px;">สาขาที่จะตัดยอดเข้า:</div>
              <div class="font-bold text-sm text-primary truncate" style="font-size: var(--font-sm);">
                {{ selectedDispatchBranchName || 'ยังไม่ได้เลือกสาขา' }}
              </div>
            </div>
          </div>
        </template>
      </KitchenCatalogCart>
    </div>

    <!-- ────────────────────────────────────────────────────────── -->
    <!-- TAB 2: ORDERS (คำขอเบิกของจากสาขา & จัดส่ง) -->
    <!-- ────────────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'orders'" class="orders-section">
      <!-- Date & Period Filter Card (Same 2-Row Card Layout as POS) -->
      <DatePeriodFilter
        v-model:period-mode="periodMode"
        v-model:selected-date="selectedDate"
        v-model:selected-month="selectedMonth"
        v-model:selected-year="selectedYear"
        v-model:start-time="customStartTime"
        v-model:end-time="customEndTime"
        v-model:branch-id="orderBranchFilter"
        :branches="retailBranches"
        @change="refreshActivePeriodTab"
      />

      <!-- Orders Status & Requester Filter Toolbar -->
      <div class="card mb-lg p-md flex flex-between align-center flex-wrap gap-md orders-toolbar">
        <!-- Status Filter Tabs -->
        <div class="order-status-tabs flex gap-xs align-center flex-wrap">
          <button 
            class="filter-pill" 
            :class="{ active: orderFilterStatus === 'all' }"
            @click="orderFilterStatus = 'all'"
          >
            ทั้งหมด
            <span class="order-tab-count">{{ periodMatchedOrders.length }}</span>
          </button>
          <button 
            class="filter-pill" 
            :class="{ active: orderFilterStatus === 'pending' }"
            @click="orderFilterStatus = 'pending'"
          >
            <i class="fa-solid fa-hourglass-start mr-1"></i> ยังไม่อนุมัติ 
            <span class="order-tab-count">{{ pendingOrdersCount }}</span>
          </button>
          <button 
            class="filter-pill" 
            :class="{ active: orderFilterStatus === 'received' }"
            @click="orderFilterStatus = 'received'"
          >
            <i class="fa-solid fa-circle-check mr-1"></i> อนุมัติแล้ว
            <span class="order-tab-count">{{ receivedOrdersCount }}</span>
          </button>
          <button 
            class="filter-pill" 
            :class="{ active: orderFilterStatus === 'pull' }"
            @click="orderFilterStatus = 'pull'"
          >
            <i class="fa-solid fa-hand-holding-hand mr-1"></i> สาขาขอเบิก
            <span class="order-tab-count">{{ pullOrdersCount }}</span>
          </button>
          <button 
            class="filter-pill" 
            :class="{ active: orderFilterStatus === 'push' }"
            @click="orderFilterStatus = 'push'"
          >
            <i class="fa-solid fa-truck-arrow-right mr-1"></i> ครัวกลางจ่ายให้
            <span class="order-tab-count">{{ pushOrdersCount }}</span>
          </button>
          <button 
            class="filter-pill" 
            :class="{ active: orderFilterStatus === 'cancelled' }"
            @click="orderFilterStatus = 'cancelled'"
          >
            <i class="fa-solid fa-ban mr-1"></i> ยกเลิก & คืนแล้ว
            <span class="order-tab-count">{{ cancelledOrdersCount }}</span>
          </button>
        </div>

        <!-- Right: Requester Filter Dropdown -->
        <div class="order-branch-filter">
          <label class="order-branch-label">
            <i class="fa-solid fa-user text-primary"></i>
            <span>ผู้ขอเบิก:</span>
          </label>
          <div class="custom-select-wrapper order-branch-select-wrapper" @click.stop style="min-width: 160px;">
            <div 
              class="custom-select-trigger order-branch-select" 
              :class="{ 'active': isOrderRequesterDropdownOpen }" 
              @click="isOrderRequesterDropdownOpen = !isOrderRequesterDropdownOpen"
            >
              <span class="custom-select-text font-bold">
                {{ orderRequesterFilter === 'all' ? 'ทุกคน' : orderRequesterFilter }}
              </span>
            </div>
            <div v-if="isOrderRequesterDropdownOpen" class="custom-select-dropdown">
              <div 
                class="custom-select-option"
                :class="{ 'selected': orderRequesterFilter === 'all' }"
                @click="orderRequesterFilter = 'all'; isOrderRequesterDropdownOpen = false;"
              >
                ทุกคน
              </div>
              <div 
                v-for="reqName in availableOrderRequesters" 
                :key="reqName" 
                class="custom-select-option"
                :class="{ 'selected': orderRequesterFilter === reqName }"
                @click="orderRequesterFilter = reqName; isOrderRequesterDropdownOpen = false;"
              >
                {{ reqName }}
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
                <i v-else-if="order.status === 'dispatched' || order.status === 'received'" class="fa-solid fa-circle-check"></i>
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
          <TransferOrderItems
            :items="order.items"
            :notes="order.notes"
            :can-adjust-items="order.status === 'received'"
            @adjust-item="it => openAdjustItemModal(order, it)"
          />

          <!-- Order Card Footer Action -->
          <div class="order-card-footer flex flex-between align-center flex-wrap gap-md pt-sm">
            <div class="order-footer-notice text-xs">
              <div v-if="order.status === 'pending'" class="text-warning font-bold notice-group">
                <div class="notice-line-1 flex align-center gap-xs">
                  <i class="fa-solid fa-triangle-exclamation"></i>
                  <span class="notice-main">ตรวจสอบก่อนอนุมัติ</span>
                </div>
                <div class="notice-line-2 text-muted font-normal">
                  (จะหักต้นทุนสาขา & เติมสต็อก POS ทันที)
                </div>
              </div>
              <div v-else-if="order.status === 'dispatched'" class="text-info font-bold notice-group">
                <div class="notice-line-1 flex align-center gap-xs">
                  <i class="fa-solid fa-truck-ramp-box"></i>
                  <span class="notice-main">ส่งของออกจากครัวกลางแล้ว</span>
                </div>
              </div>
              <div v-else-if="order.status === 'received'" class="text-success font-bold notice-group">
                <div class="notice-line-1 flex align-center gap-xs">
                  <i class="fa-solid fa-circle-check"></i>
                  <span class="notice-main">อนุมัติสำเร็จ & บันทึกเป็นรายจ่ายสาขาเรียบร้อย</span>
                </div>
                <div class="notice-line-2 text-muted font-normal">
                  (เติมสต็อก POS แล้ว)
                </div>
              </div>
              <div v-else-if="order.status === 'cancelled'" class="text-danger font-bold notice-group">
                <div class="notice-line-1 flex align-center gap-xs">
                  <i class="fa-solid fa-ban"></i>
                  <span class="notice-main">ใบเบิกถูกยกเลิก และคืนสต็อกเข้าครัวกลาง</span>
                </div>
              </div>
            </div>

            <div class="order-footer-actions flex align-center gap-sm flex-wrap">
              <button 
                v-if="order.status === 'pending'" 
                class="btn btn-primary"
                @click="dispatchOrder(order)"
              >
                <i class="fa-solid fa-circle-check mr-2"></i> อนุมัติ & ตัดจ่ายเข้าสาขาทันที
              </button>
              <button 
                v-if="order.status === 'pending'" 
                class="btn btn-outline-danger"
                @click="cancelTransferOrder(order)"
              >
                <i class="fa-solid fa-xmark mr-1"></i> ยกเลิกคำขอ
              </button>
              <button 
                v-if="order.status === 'received'" 
                class="btn btn-outline-danger btn-sm"
                @click="cancelTransferOrder(order)"
                title="ยกเลิกใบเบิกนี้และดึงสต็อกกลับคืน"
              >
                <i class="fa-solid fa-ban mr-1"></i> ยกเลิกใบเบิกและคืนค่าทั้งหมด
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
      <!-- Date & Period Filter Card (Same 2-Row Card Layout as Orders) -->
      <DatePeriodFilter
        v-model:period-mode="periodMode"
        v-model:selected-date="selectedDate"
        v-model:selected-month="selectedMonth"
        v-model:selected-year="selectedYear"
        v-model:start-time="customStartTime"
        v-model:end-time="customEndTime"
        v-model:branch-id="historyBranchFilter"
        :branches="retailBranches"
        @change="refreshActivePeriodTab"
      />

      <!-- History Type & Extended Filter Toolbar -->
      <div class="card mb-lg p-md flex flex-between align-center flex-wrap gap-md history-toolbar">
        <!-- Type Tabs -->
        <div class="history-status-tabs flex gap-xs align-center flex-wrap">
          <button 
            class="filter-pill" 
            :class="{ active: historyFilter === 'all' }"
            @click="historyFilter = 'all'"
          >
            <span>ทั้งหมด</span>
            <span class="history-tab-count">{{ historyTotalCount }}</span>
          </button>
          <button 
            class="filter-pill" 
            :class="{ active: historyFilter === 'restock' }"
            @click="historyFilter = 'restock'"
          >
            <i class="fa-solid fa-circle-plus mr-1"></i>
            <span>เติมสต็อกเข้าคลัง</span>
            <span class="history-tab-count">{{ historyRestockCount }}</span>
          </button>
          <button 
            class="filter-pill" 
            :class="{ active: historyFilter === 'transfer' || historyFilter === 'requisition' }"
            @click="historyFilter = 'transfer'"
          >
            <i class="fa-solid fa-truck-fast mr-1"></i>
            <span>สาขาเบิกของ</span>
            <span class="history-tab-count">{{ historyTransferCount }}</span>
          </button>
          <button 
            class="filter-pill" 
            :class="{ active: historyFilter === 'cancelled' }"
            @click="historyFilter = 'cancelled'"
          >
            <i class="fa-solid fa-ban mr-1"></i>
            <span>ยกเลิก & คืนแล้ว</span>
            <span class="history-tab-count">{{ historyCancelledCount }}</span>
          </button>
        </div>

        <!-- Right: Central Kitchen Menu Dropdown + Requester Dropdown -->
        <div class="flex align-center gap-md flex-wrap">
          <!-- Dropdown เมนูในครัวกลาง (Item filter) -->
          <div class="order-branch-filter flex align-center gap-xs">
            <label class="order-branch-label" style="white-space: nowrap;">
              <i class="fa-solid fa-utensils text-primary"></i>
              <span>สินค้า:</span>
            </label>
            <div class="custom-select-wrapper order-branch-select-wrapper" @click.stop style="min-width: 170px;">
              <div 
                class="custom-select-trigger order-branch-select" 
                :class="{ 'active': isHistoryItemDropdownOpen }" 
                @click="isHistoryItemDropdownOpen = !isHistoryItemDropdownOpen; isHistoryRequesterDropdownOpen = false;"
                style="height: 38px;"
              >
                <span class="custom-select-text font-bold" style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  {{ selectedHistoryItemName }}
                </span>
              </div>
              <div v-if="isHistoryItemDropdownOpen" class="custom-select-dropdown" style="max-height: 280px; overflow-y: auto;">
                <div 
                  class="custom-select-option"
                  :class="{ 'selected': historyItemFilter === 'all' }"
                  @click="historyItemFilter = 'all'; isHistoryItemDropdownOpen = false;"
                >
                  สินค้าทั้งหมด
                </div>
                <div 
                  v-for="item in sortedKitchenItems" 
                  :key="item.id" 
                  class="custom-select-option"
                  :class="{ 'selected': historyItemFilter === item.name }"
                  @click="historyItemFilter = item.name; isHistoryItemDropdownOpen = false;"
                >
                  {{ item.name }}
                </div>
              </div>
            </div>
          </div>

          <!-- Dropdown ผู้ขอเบิก -->
          <div class="order-branch-filter flex align-center gap-xs">
            <label class="order-branch-label" style="white-space: nowrap;">
              <i class="fa-solid fa-user text-primary"></i>
              <span>ผู้ขอเบิก:</span>
            </label>
            <div class="custom-select-wrapper order-branch-select-wrapper" @click.stop style="min-width: 150px;">
              <div 
                class="custom-select-trigger order-branch-select" 
                :class="{ 'active': isHistoryRequesterDropdownOpen }" 
                @click="isHistoryRequesterDropdownOpen = !isHistoryRequesterDropdownOpen; isHistoryItemDropdownOpen = false;"
                style="height: 38px;"
              >
                <span class="custom-select-text font-bold">
                  {{ historyRequesterFilter === 'all' ? 'ทุกคน' : historyRequesterFilter }}
                </span>
              </div>
              <div v-if="isHistoryRequesterDropdownOpen" class="custom-select-dropdown">
                <div 
                  class="custom-select-option"
                  :class="{ 'selected': historyRequesterFilter === 'all' }"
                  @click="historyRequesterFilter = 'all'; isHistoryRequesterDropdownOpen = false;"
                >
                  ทุกคน
                </div>
                <div 
                  v-for="reqName in availableHistoryRequesters" 
                  :key="reqName" 
                  class="custom-select-option"
                  :class="{ 'selected': historyRequesterFilter === reqName }"
                  @click="historyRequesterFilter = reqName; isHistoryRequesterDropdownOpen = false;"
                >
                  {{ reqName }}
                </div>
              </div>
            </div>
          </div>
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
          <!-- 1. RESTOCK & ADJUSTMENT CARD -->
          <div v-if="h.type === 'restock'" class="history-card-restock">
            <!-- Header Row -->
            <div class="history-card-header flex flex-between align-center flex-wrap gap-md mb-md pb-md">
              <div class="flex align-center gap-sm flex-wrap">
                <span class="order-no-title font-bold">
                  <i :class="h.quantity < 0 ? 'fa-solid fa-sliders text-warning' : 'fa-solid fa-circle-plus text-success'"></i>
                  <span>{{ h.quantity < 0 ? 'ปรับปรุงสต็อก' : 'เติมสต็อกเข้าคลัง' }}</span>
                </span>
                <span class="badge font-bold" :class="h.quantity < 0 ? 'badge-warning' : 'badge-success'">
                  {{ h.quantity < 0 ? 'ลดสต็อก' : 'เติมเข้า' }}
                </span>
                <span class="badge badge-neutral font-bold">
                  <i class="fa-solid fa-box"></i>
                  <span>{{ getItemNameParts(h.item_name).main }}</span>
                </span>
              </div>

              <div class="order-total-header">
                <span class="order-total-label">{{ h.quantity < 0 ? 'มูลค่าผลต่าง:' : 'ยอดเงินที่ซื้อ:' }}</span>
                <span class="order-total-amount font-bold" :class="h.quantity < 0 ? 'text-warning' : 'text-success'">
                  ฿{{ formatNumber(Math.abs(h.total_amount)) }}
                </span>
              </div>
            </div>

            <!-- Metadata Row -->
            <div class="history-meta-row flex flex-between align-center text-xs text-secondary mb-md flex-wrap gap-sm">
              <div class="flex align-center gap-md flex-wrap">
                <span><i class="fa-regular fa-user mr-1 text-muted"></i> โดย: <strong class="text-main">{{ h.created_by }}</strong></span>
                <span><i class="fa-regular fa-clock mr-1 text-muted"></i> วันที่ทำรายการ: <span class="text-main">{{ formatDateTime(h.created_at) }}</span></span>
              </div>
              <div v-if="h.note" class="history-meta-note">
                <i class="fa-solid fa-tag mr-1 text-muted"></i> แหล่งซื้อ/หมายเหตุ: <span class="text-main">{{ h.note }}</span>
              </div>
            </div>

            <!-- Items Table (Desktop >= 641px) -->
            <div class="history-items-container mb-xs">
              <div class="order-items-title flex flex-between align-center mb-xs">
                <span class="text-xs font-bold text-secondary">
                  <i class="fa-solid fa-boxes-stacked mr-1 text-primary"></i> รายการสินค้าที่เติมเข้าคลัง
                </span>
              </div>

              <div class="history-items-table-wrapper desktop-only-orders-table">
                <table class="history-items-table">
                  <thead>
                    <tr>
                      <th class="col-item text-left">ชื่อสินค้า</th>
                      <th class="col-price text-right">ราคาต้นทุน/หน่วย</th>
                      <th class="col-qty text-center">จำนวน</th>
                      <th class="col-total text-right">รวมมูลค่า</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="col-item">
                        <div class="item-name-main font-bold text-sm">{{ getItemNameParts(h.item_name).main }}</div>
                        <div v-if="getItemNameParts(h.item_name).sub" class="item-name-sub text-xs text-secondary">{{ getItemNameParts(h.item_name).sub }}</div>
                      </td>
                      <td class="col-price text-right text-sm text-secondary">
                        ฿{{ formatNumber(h.unit_cost) }} <span class="text-xs text-muted">/ {{ h.unit || 'หน่วย' }}</span>
                      </td>
                      <td class="col-qty text-center">
                        <span class="history-qty-pill font-bold" :class="h.quantity < 0 ? 'text-warning' : 'text-success'">
                          {{ h.quantity > 0 ? '+' : '' }}{{ formatNumber(h.quantity) }} {{ h.unit || 'หน่วย' }}
                        </span>
                      </td>
                      <td class="col-total text-right font-bold text-sm" :class="h.quantity < 0 ? 'text-warning' : 'text-primary'">
                        ฿{{ formatNumber(Math.abs(h.total_amount)) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Mobile List (< 640px) -->
              <div class="history-items-mobile-list mobile-only-orders-list flex flex-col gap-xs">
                <div class="order-mobile-item-card">
                  <div class="flex flex-between align-start gap-xs">
                    <div class="flex-1 min-w-0 pr-xs">
                      <div class="order-mobile-item-name font-bold text-sm text-primary">
                        {{ getItemNameParts(h.item_name).main }}
                      </div>
                      <div v-if="getItemNameParts(h.item_name).sub" class="order-mobile-item-sub text-xs text-secondary mt-1">
                        {{ getItemNameParts(h.item_name).sub }}
                      </div>
                    </div>
                    <div class="text-right flex-shrink-0 pl-xs">
                      <span class="order-mobile-item-total font-bold text-sm text-primary">
                        ฿{{ formatNumber(Math.abs(h.total_amount)) }}
                      </span>
                    </div>
                  </div>
                  <div class="flex flex-between align-center order-mobile-item-bottom">
                    <span class="text-xs text-secondary">
                      ฿{{ formatNumber(h.unit_cost) }} / {{ h.unit || 'หน่วย' }}
                    </span>
                    <span class="history-qty-pill font-bold" :class="h.quantity < 0 ? 'text-warning' : 'text-success'">
                      {{ h.quantity > 0 ? '+' : '' }}{{ formatNumber(h.quantity) }} {{ h.unit || 'หน่วย' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. TRANSFER FEED CARD (Structure matching Orders Card) -->
          <div v-else class="history-card-transfer">
            <!-- Header Row -->
            <div class="history-card-header flex flex-between align-center flex-wrap gap-md mb-md pb-md">
              <div class="flex align-center gap-sm flex-wrap">
                <span class="order-no-title font-bold">
                  <i class="fa-solid fa-receipt text-primary"></i>
                  <span>#{{ h.transfer_no }}</span>
                </span>
                <span class="badge badge-primary font-bold">
                  <i class="fa-solid fa-store"></i>
                  <span>{{ h.branch_name }}</span>
                </span>
                <!-- Dispatch Type Badge -->
                <span v-if="h.dispatch_type === 'push'" class="badge badge-info font-bold" title="ครัวกลางจ่ายให้โดยตรง">
                  <i class="fa-solid fa-truck-arrow-right"></i> ครัวกลางจ่ายให้
                </span>
                <span v-else class="badge badge-neutral font-bold" title="สาขาขอเบิก">
                  <i class="fa-solid fa-hand-holding-hand"></i> สาขาขอเบิก
                </span>
                <span class="badge font-bold" :class="getStatusBadgeClass(h.status)">
                  <i v-if="h.status === 'pending'" class="fa-solid fa-hourglass-start"></i>
                  <i v-else-if="h.status === 'dispatched' || h.status === 'received'" class="fa-solid fa-circle-check"></i>
                  <i v-else-if="h.status === 'cancelled'" class="fa-solid fa-ban"></i>
                  <span>{{ getStatusLabel(h.status) }}</span>
                </span>
                <span v-if="h.status === 'cancelled'" class="badge badge-success font-bold">
                  <i class="fa-solid fa-rotate-left"></i>
                  <span>คืนแล้ว</span>
                </span>
              </div>

              <div class="order-total-header">
                <span class="order-total-label">ยอดต้นทุนตัดเข้าสาขา:</span>
                <span 
                  class="order-total-amount font-bold"
                  :class="h.status === 'cancelled' ? 'text-muted' : 'text-primary'"
                  :style="h.status === 'cancelled' ? 'text-decoration: line-through; opacity: 0.65;' : ''"
                >
                  ฿{{ formatNumber(h.total_cost || h.total_amount) }}
                </span>
              </div>
            </div>

            <!-- Metadata Info -->
            <div class="history-meta-row flex flex-between align-center text-xs text-secondary mb-md flex-wrap gap-sm">
              <div class="flex align-center gap-md flex-wrap">
                <span>
                  <i class="fa-regular fa-user mr-1 text-muted"></i> ผู้ขอเบิก: <strong class="text-main">{{ h.created_by || 'ไม่ระบุ' }}</strong>
                </span>
                <span>
                  <i class="fa-regular fa-clock mr-1 text-muted"></i> วันที่ทำรายการ: <span class="text-main">{{ formatDateTime(h.created_at) }}</span>
                </span>
              </div>
            </div>

            <!-- Items Table (Desktop >= 641px) -->
            <TransferOrderItems
              v-if="h.items && h.items.length"
              :items="h.items"
              title-prefix="รายการของที่เบิก"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- ────────────────────────────────────────────────────────── -->
    <!-- TAB: FINANCE (สมุดบัญชี & กระเป๋าเงินกองกลางครัวกลาง) -->
    <!-- ────────────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'finance' || activeTab === 'receivables'" class="finance-section">
      <!-- Toolbar Header -->
      <div class="card mb-lg page-header-card finance-toolbar">
        <div class="page-header-left">
          <div class="header-icon-circle">
            <i class="fa-solid fa-vault"></i>
          </div>
          <div class="page-header-text">
            <h2 class="page-header-title">สมุดบัญชี & เงินกองกลาง</h2>
          </div>
        </div>

        <div class="finance-action-buttons">
          <button class="btn btn-primary" @click="openTransactionModal('capital_in')">
            <i class="fa-solid fa-circle-plus"></i>
            <span>เติมทุนกองกลาง</span>
          </button>
          <button class="btn btn-secondary" @click="openTransactionModal('operating_expense_out')">
            <i class="fa-solid fa-circle-minus"></i>
            <span>ใช้จ่ายครัวกลาง</span>
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
      <div v-else>
        <!-- 4 Summary KPI Cards -->
        <div class="financial-summary-grid mb-md">
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
        <div id="finance-subtabs-nav" class="category-tabs">
          <button 
            type="button"
            class="category-tab" 
            :class="{ 'active': financeSubTab === 'ledger' }"
            @click="financeSubTab = 'ledger'"
          >
            <i class="fa-solid fa-book-journal-whills"></i> สมุดบัญชีกองกลาง
            <span v-if="financeLogs.length > 0" class="tab-count-pill ml-xs font-normal">({{ financeLogs.length }})</span>
          </button>
          <button 
            type="button"
            class="category-tab" 
            :class="{ 'active': financeSubTab === 'receivables' }"
            @click="financeSubTab = 'receivables'"
          >
            <i class="fa-solid fa-shop"></i> ยอดค้างชำระ & ของที่สาขาเบิก
            <span v-if="(receivablesBreakdown?.branches?.length || 0) > 0" class="tab-count-pill ml-xs font-bold">
              ({{ receivablesBreakdown.branches.length }} สาขา)
            </span>
          </button>
        </div>

        <!-- Date & Period Filter Card (Shared across Ledger & Receivables sub-tabs) -->
        <DatePeriodFilter
          v-model:period-mode="periodMode"
          v-model:selected-date="selectedDate"
          v-model:selected-month="selectedMonth"
          v-model:selected-year="selectedYear"
          v-model:start-time="customStartTime"
          v-model:end-time="customEndTime"
          v-model:branch-id="selectedReceivablesBranch"
          :branches="retailBranches"
          @change="refreshActivePeriodTab"
        />

        <!-- SUB-TAB 1: Transactions Ledger Card -->
        <div v-if="financeSubTab === 'ledger'" class="ledger-tab-view flex flex-col gap-md">
          <div class="card p-lg ledger-card">
          <div class="ledger-header flex flex-between align-center flex-wrap gap-md">
            <div class="flex align-center gap-xs">
              <i class="fa-solid fa-clock-rotate-left text-primary" style="font-size: var(--font-md);"></i>
              <span class="font-bold text-base text-main">ประวัติรายการเดินบัญชีกองกลาง</span>
            </div>

            <!-- Filter Pills -->
            <div class="finance-status-tabs flex gap-xs align-center">
              <button 
                class="filter-pill" 
                :class="{ active: financeFilterType === 'all' }"
                @click="financeFilterType = 'all'"
              >
                <span>ทั้งหมด</span>
                <span class="finance-tab-count">{{ branchFilteredFinanceLogs.length }}</span>
              </button>
              <button 
                class="filter-pill" 
                :class="{ active: financeFilterType === 'capital_in' }"
                @click="financeFilterType = 'capital_in'"
              >
                <i class="fa-solid fa-circle-plus"></i>
                <span>เติมทุน +</span>
                <span class="finance-tab-count">{{ capitalInCount }}</span>
              </button>
              <button 
                class="filter-pill" 
                :class="{ active: financeFilterType === 'reimbursement_in' }"
                @click="financeFilterType = 'reimbursement_in'"
              >
                <i class="fa-solid fa-hand-holding-dollar"></i>
                <span>สาขาคืนเงิน +</span>
                <span class="finance-tab-count">{{ reimbursementInCount }}</span>
              </button>
              <button 
                class="filter-pill" 
                :class="{ active: financeFilterType === 'purchase_out' }"
                @click="financeFilterType = 'purchase_out'"
              >
                <i class="fa-solid fa-cart-shopping"></i>
                <span>ซื้อของเข้าคลัง -</span>
                <span class="finance-tab-count">{{ purchaseOutCount }}</span>
              </button>
              <button 
                class="filter-pill" 
                :class="{ active: financeFilterType === 'operating_expense_out' }"
                @click="financeFilterType = 'operating_expense_out'"
              >
                <i class="fa-solid fa-circle-minus"></i>
                <span>รายจ่ายครัวกลาง -</span>
                <span class="finance-tab-count">{{ operatingExpenseOutCount }}</span>
              </button>
              <button 
                class="filter-pill" 
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
                        <i v-else-if="log.type === 'other_out'" class="fa-solid fa-arrow-right-from-bracket"></i>
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
                    <i v-else-if="log.type === 'other_out'" class="fa-solid fa-arrow-right-from-bracket"></i>
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

        <!-- SUB-TAB 2: Branch Receivables & Consolidated Items -->
        <div v-else-if="financeSubTab === 'receivables'" class="receivables-tab-view flex flex-col gap-md">
          <!-- Status Filter Toolbar (Exact style from Orders / History for 100% unity) -->
          <div class="card mb-md p-md flex flex-between align-center flex-wrap gap-md">
            <!-- Status Toggle Buttons -->
            <div class="order-status-tabs flex gap-xs align-center">
              <button 
                type="button"
                class="filter-pill" 
                :class="{ active: receivablesStatusTab === 'pending' }"
                @click="setReceivablesStatus('pending')"
              >
                <i class="fa-solid fa-clock"></i>
                <span>รอเคลียร์ (ค้างชำระ)</span>
                <span class="history-tab-count">{{ receivablesBreakdown?.total_pending_count || 0 }}</span>
              </button>
              <button 
                type="button"
                class="filter-pill" 
                :class="{ active: receivablesStatusTab === 'reimbursed' }"
                @click="setReceivablesStatus('reimbursed')"
              >
                <i class="fa-solid fa-circle-check text-success"></i>
                <span>เคลียร์แล้ว (ประวัติการชำระเงิน)</span>
                <span class="history-tab-count">{{ receivablesBreakdown?.total_reimbursed_count || 0 }}</span>
              </button>
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
                <div class="text-xs text-secondary font-medium">{{ receivablesStatusTab === 'reimbursed' ? 'ใบเบิกที่เคลียร์แล้ว' : 'ใบเบิกที่รอเคลียร์' }}</div>
                <div class="text-lg font-bold text-main">{{ totalFilteredTransfersCount }} ใบ</div>
              </div>
            </div>
            <div class="text-right receivables-banner-right">
              <div class="text-xs text-secondary font-semibold">{{ receivablesStatusTab === 'reimbursed' ? 'ยอดรวมเคลียร์ชำระคืนแล้ว' : 'ยอดรวมค้างชำระคืน' }}</div>
              <div :class="receivablesStatusTab === 'reimbursed' ? 'text-success font-bold text-2xl' : 'amount-danger-bold'">฿{{ formatNumber(totalFilteredPendingAmount) }}</div>
            </div>
          </div>

          <!-- Loading Skeleton State -->
          <div v-if="isLoadingReceivables" class="branch-cards-list flex flex-col gap-lg">
            <div v-for="i in 2" :key="i" class="card p-lg branch-receivable-card">
              <div class="flex flex-between align-center pb-md mb-md border-b">
                <div class="flex align-center gap-sm">
                  <div class="skeleton" style="width: 44px; height: 44px; border-radius: var(--radius-md);"></div>
                  <div>
                    <div class="skeleton mb-xs" style="width: 140px; height: 20px; border-radius: var(--radius-xs);"></div>
                    <div class="skeleton" style="width: 180px; height: 14px; border-radius: var(--radius-xs);"></div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="skeleton mb-xs" style="width: 100px; height: 14px; border-radius: var(--radius-xs); margin-left: auto;"></div>
                  <div class="skeleton" style="width: 120px; height: 26px; border-radius: var(--radius-sm); margin-left: auto;"></div>
                </div>
              </div>
              <div class="skeleton mb-xs" style="width: 100%; height: 38px; border-radius: var(--radius-sm);"></div>
              <div class="skeleton mb-xs" style="width: 100%; height: 44px; border-radius: var(--radius-sm);"></div>
              <div class="skeleton" style="width: 100%; height: 44px; border-radius: var(--radius-sm);"></div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else-if="!filteredReceivablesBranches || filteredReceivablesBranches.length === 0" class="card p-xl text-center">
            <div class="empty-icon-circle mx-auto mb-md">
              <i class="fa-solid fa-circle-check text-success text-3xl"></i>
            </div>
            <h4 class="font-bold text-base mb-xs text-main">
              {{ receivablesStatusTab === 'reimbursed' 
                  ? (selectedReceivablesBranch === 'all' ? 'ไม่มีประวัติรายการที่เคลียร์เงินในช่วงเวลานี้' : 'สาขานี้ยังไม่มีประวัติการเคลียร์เงินในช่วงเวลานี้')
                  : (selectedReceivablesBranch === 'all' ? 'ไม่มีสาขาค้างชำระคืน' : 'สาขานี้ไม่มีรายการค้างชำระ') 
              }}
            </h4>
            <p class="text-secondary text-sm mb-0">
              {{ receivablesStatusTab === 'reimbursed' 
                  ? 'ลองเลือกเปลี่ยนช่วงวันที่ หรือเลือกดูสาขาอื่น' 
                  : 'ทุกรายการได้รับการชำระหรือเคลียร์ยอดค่าวัตถุดิบและสินค้าเรียบร้อยแล้ว' 
              }}
            </p>
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
                    <i :class="receivablesStatusTab === 'reimbursed' ? 'fa-solid fa-shop text-success' : 'fa-solid fa-store text-danger'"></i>
                  </span>
                  <div>
                    <h4 class="font-bold text-lg text-main mb-0">{{ branch.branch_name }}</h4>
                    <span class="text-xs text-secondary font-medium">
                      <i class="fa-solid fa-receipt mr-1"></i> {{ branch.transfers_count }} ใบเบิกที่รับของแล้ว {{ receivablesStatusTab === 'reimbursed' ? '(เคลียร์แล้ว)' : '(รอเคลียร์)' }}
                    </span>
                  </div>
                </div>
                <div class="text-right branch-card-header-amount">
                  <div class="text-xs text-secondary font-medium">{{ receivablesStatusTab === 'reimbursed' ? 'ยอดที่เคลียร์ชำระคืนแล้ว' : 'ยอดค้างชำระสาขานี้' }}</div>
                  <div :class="receivablesStatusTab === 'reimbursed' ? 'text-success font-bold text-xl' : 'amount-danger-bold'">฿{{ formatNumber(branch.total_pending_amount) }}</div>
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
                        <td class="p-sm pl-md text-secondary text-xs" colspan="3">{{ receivablesStatusTab === 'reimbursed' ? 'รวมมูลค่าสินค้าที่เคลียร์แล้ว' : 'รวมมูลค่าสินค้าทั้งหมด' }}</td>
                        <td class="p-sm pr-md text-right font-bold text-base" :class="receivablesStatusTab === 'reimbursed' ? 'text-success' : 'text-danger'">฿{{ formatNumber(branch.total_pending_amount) }}</td>
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
                        <div class="font-bold text-sm" :class="receivablesStatusTab === 'reimbursed' ? 'text-success' : 'text-danger'">
                          ฿{{ formatNumber(t.total_cost) }}
                        </div>
                      </div>
                      <!-- Row 2: Date & Time in 1 single line (Moved down, no wrapping) -->
                      <div class="ticket-time-row flex align-center gap-xs text-xs text-secondary mt-xs">
                        <i class="fa-regular fa-clock text-muted"></i>
                        <span class="ticket-time-text">{{ receivablesStatusTab === 'reimbursed' && t.reimbursed_at ? ('เคลียร์เมื่อ: ' + formatDateTime(t.reimbursed_at) + (t.reimbursed_by_name ? ' โดย ' + t.reimbursed_by_name : '')) : ('รับของเมื่อ: ' + formatDateTime(t.received_at || t.created_at)) }}</span>
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

              <!-- Branch Card Footer Action: Pending (ปุ่มเคลียร์รับเงิน) VS Reimbursed (สถานะเคลียร์เรียบร้อย) -->
              <div v-if="receivablesStatusTab === 'pending' && branch.total_pending_amount > 0" class="branch-card-footer mt-md pt-md border-t flex flex-between align-center flex-wrap gap-sm">
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

              <div v-else-if="receivablesStatusTab === 'reimbursed'" class="branch-card-footer mt-md pt-md border-t flex flex-between align-center flex-wrap gap-sm">
                <div class="text-xs text-secondary flex align-center gap-xs">
                  <i class="fa-solid fa-circle-check text-success"></i>
                  <span>รายการในรอบนี้ได้รับการเคลียร์เงินคืนเข้ากองกลางเรียบร้อยแล้ว</span>
                  <span v-if="branch.last_reimbursed_by_name" class="font-medium">
                    (โดย {{ branch.last_reimbursed_by_name }})
                  </span>
                </div>
                <span class="badge badge-success font-bold">
                  <i class="fa-solid fa-check-double mr-1"></i> เคลียร์ชำระแล้ว
                </span>
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
      <div class="card mb-lg page-header-card partner-toolbar-card">
        <div class="page-header-left">
          <div class="header-icon-circle">
            <i class="fa-solid fa-calculator"></i>
          </div>
          <div class="page-header-text">
            <h2 class="page-header-title">คำนวณกำไร & ปันผล</h2>
          </div>
        </div>

        <DatePeriodFilter
          branch-only
          v-model:branch-id="selectedPartnerBranch"
          :branches="retailBranches"
          :show-all-branches="false"
          branch-label="เลือกสาขา:"
        />
      </div>

      <!-- Pill Tabs (แท็บหลอดยา): หุ้นส่วน vs ประวัติปันผล -->
      <div class="category-tabs">
        <button 
          type="button"
          class="category-tab" 
          :class="{ 'active': partnerSubTab === 'partners' }"
          @click="partnerSubTab = 'partners'"
        >
          <i class="fa-solid fa-users"></i> หุ้นส่วน
        </button>
        <button 
          type="button"
          class="category-tab" 
          :class="{ 'active': partnerSubTab === 'payout_history' }"
          @click="partnerSubTab = 'payout_history'"
        >
          <i class="fa-solid fa-clock-rotate-left"></i> ประวัติปันผล
        </button>
      </div>

      <!-- Loading / Error States -->
      <div v-if="isLoadingSettlement" class="flex flex-col gap-lg mb-lg">
        <!-- 4 Summary KPI Cards Skeleton -->
        <div class="financial-summary-grid">
          <div v-for="i in (partnerSubTab === 'partners' ? 4 : 3)" :key="i" class="summary-card">
            <div class="flex flex-between align-center mb-xs">
              <div class="skeleton" style="width: 60%; height: 16px; border-radius: var(--radius-xs);"></div>
              <div class="skeleton" style="width: 28%; height: 18px; border-radius: var(--radius-full);"></div>
            </div>
            <div class="skeleton my-sm" style="width: 70%; height: 28px; border-radius: var(--radius-sm);"></div>
            <div class="skeleton" style="width: 85%; height: 14px; border-radius: var(--radius-xs);"></div>
          </div>
        </div>

        <!-- Sub-Tab 1 Skeleton: 2-Column Comparison & Partner Equity -->
        <div v-if="partnerSubTab === 'partners'" class="grid grid-cols-1 lg:grid-cols-2 gap-lg">
          <div class="card p-lg flex flex-col gap-md">
            <div class="skeleton pb-sm" style="width: 55%; height: 22px; border-radius: var(--radius-xs);"></div>
            <div v-for="b in 3" :key="b" class="flex flex-col gap-xs">
              <div class="flex flex-between">
                <div class="skeleton" style="width: 35%; height: 14px; border-radius: var(--radius-xs);"></div>
                <div class="skeleton" style="width: 25%; height: 14px; border-radius: var(--radius-xs);"></div>
              </div>
              <div class="skeleton" style="width: 100%; height: 14px; border-radius: var(--radius-full);"></div>
            </div>
            <div class="skeleton mt-xs" style="width: 100%; height: 52px; border-radius: var(--radius-md);"></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-sm mt-xs">
              <div v-for="p in 2" :key="p" class="skeleton" style="width: 100%; height: 120px; border-radius: var(--radius-sm);"></div>
            </div>
          </div>

          <div class="card p-lg flex flex-col justify-between gap-md">
            <div class="flex flex-col gap-md">
              <div class="flex flex-between align-center">
                <div class="skeleton" style="width: 50%; height: 22px; border-radius: var(--radius-xs);"></div>
                <div class="skeleton" style="width: 100px; height: 32px; border-radius: var(--radius-full);"></div>
              </div>
              <div class="skeleton" style="width: 85%; height: 14px; border-radius: var(--radius-xs);"></div>
              <div v-for="r in 2" :key="r" class="skeleton" style="width: 100%; height: 54px; border-radius: var(--radius-md);"></div>
            </div>
            <div class="skeleton" style="width: 100%; height: 46px; border-radius: var(--radius-md);"></div>
          </div>
        </div>

        <!-- Sub-Tab 2 Skeleton: Payout History Table -->
        <div v-else class="card p-lg">
          <div class="flex flex-between align-center mb-lg pb-sm" style="border-bottom: 1px solid var(--border-color);">
            <div class="skeleton" style="width: 200px; height: 22px; border-radius: var(--radius-xs);"></div>
            <div class="skeleton" style="width: 110px; height: 36px; border-radius: var(--radius-md);"></div>
          </div>
          <div class="skeleton mb-xs" style="width: 100%; height: 40px; border-radius: var(--radius-sm);"></div>
          <div v-for="r in 3" :key="r" class="skeleton mb-xs" style="width: 100%; height: 48px; border-radius: var(--radius-sm);"></div>
        </div>
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
                style="font-size: var(--font-xxs); padding: 2px 7px; border-radius: var(--radius-sm); margin-left: auto;"
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
                <i class="fa-solid fa-chart-simple text-primary" style="margin-top: 3px; font-size: var(--font-md);"></i> 
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
                        style="font-size: var(--font-xl); line-height: 1.2;" 
                        :style="{ color: settlementData.net_profit < 0 ? 'var(--danger)' : (p.is_owner ? 'var(--primary)' : '#cc8000') }"
                      >
                        ฿{{ formatNumber(p.payout_amount) }}
                      </div>
                      <div class="text-xs text-tertiary mt-2xs font-medium">
                        {{ p.share_percentage }}% ของกำไรจริง ({{ p.is_owner ? 'เจ้าของหลัก' : 'ผู้ร่วมทุน' }})
                      </div>
                      <button 
                        v-if="settlementData.net_profit > 0" 
                        class="btn btn-primary w-full mt-md"
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
                {{ settlementData.payouts?.length || 0 }} <span style="font-size: var(--font-base); font-weight: normal; color: var(--text-secondary);">ครั้ง</span>
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
                <i class="fa-solid fa-file-invoice-dollar text-primary" style="margin-top: 3px; font-size: var(--font-md);"></i>
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
    <!-- MODAL: จัดการหมวดหมู่ครัวกลาง -->
    <!-- ────────────────────────────────────────────────────────── -->
    <div v-if="showCategoryModal" class="modal-container active">
      <div class="modal-overlay" @click="showCategoryModal = false"></div>
      <div class="modal-content modal-center w-full max-w-lg" style="position:relative; z-index:2; overflow-y:auto; max-height:88dvh;">
        <div class="modal-header">
          <h3>
            <i class="fa-solid fa-folder-open" style="margin-right: 8px;"></i>
            จัดการหมวดหมู่ครัวกลาง
          </h3>
          <button class="modal-close" @click="showCategoryModal = false" aria-label="ปิด">✕</button>
        </div>
        <div class="modal-body" style="display: flex; flex-direction: column; gap: var(--space-lg);">
          <!-- Form: Add or Edit Category -->
          <div class="ck-cat-form-card">
            <div class="ck-cat-form-title">
              <i :class="editingCat ? 'fa-solid fa-pen-to-square' : 'fa-solid fa-circle-plus'"></i>
              <span>{{ editingCat ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่' }}</span>
            </div>

            <div class="ck-cat-form-fields">
              <div class="form-group mb-0">
                <label class="form-label text-xs font-bold">ชื่อหมวดหมู่ *</label>
                <input 
                  type="text" 
                  class="form-input w-full" 
                  v-model="catForm.name" 
                  placeholder="เช่น ซอส, ผงปรุงรส, แป้งและน้ำมัน"
                />
              </div>
            </div>

            <div class="ck-cat-form-actions">
              <button 
                v-if="editingCat" 
                type="button"
                class="btn btn-secondary" 
                @click="handleCancelEditCat"
              >
                ยกเลิก
              </button>
              <button 
                type="button"
                class="btn btn-primary" 
                :disabled="!catForm.name || isSavingCat" 
                @click="handleSaveCategory"
                style="flex: 1;"
              >
                <i v-if="isSavingCat" class="fa-solid fa-spinner fa-spin"></i>
                <i v-else class="fa-solid fa-floppy-disk"></i>
                <span>{{ isSavingCat ? 'กำลังบันทึก...' : (editingCat ? 'บันทึก' : 'เพิ่มหมวดหมู่') }}</span>
              </button>
            </div>
          </div>

          <!-- Existing Categories List -->
          <div>
            <div class="flex flex-between align-center mb-sm">
              <span class="font-bold text-sm text-secondary">หมวดหมู่ทั้งหมด ({{ kitchenCategories.length }})</span>
              <span class="text-xs text-muted">แก้ไขหรือลบหมวดหมู่ได้</span>
            </div>

            <div class="ck-cat-list">
              <div 
                v-for="cat in kitchenCategories" 
                :key="cat.id" 
                class="ck-cat-row"
              >
                <div style="min-width: 0;">
                  <div class="font-bold text-sm text-primary-dark" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ cat.name }}</div>
                  <div class="text-xs text-secondary">{{ getCategoryCount(cat.code) }} สินค้า</div>
                </div>

                <div class="flex align-center gap-xs flex-shrink-0">
                  <button 
                    type="button"
                    class="ck-cat-action-btn edit" 
                    title="แก้ไขหมวดหมู่"
                    @click="handleEditCat(cat)"
                  >
                    <i class="fa-solid fa-pen"></i>
                  </button>
                  <button 
                    type="button"
                    class="ck-cat-action-btn delete" 
                    title="ลบหมวดหมู่"
                    @click="handleDeleteCat(cat)"
                  >
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
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
                <span>ผูกกับเมนูใน POS</span>
                <span class="ck-tooltip-wrap" @click.stop>
                  <button type="button" class="ck-tooltip-trigger" aria-label="คำอธิบายการผูกเมนู POS">
                    <i class="fa-solid fa-circle-info"></i>
                  </button>
                  <span class="ck-tooltip-bubble" role="tooltip">
                    <span class="ck-tooltip-arrow"></span>
                    <span class="ck-tooltip-title"><i class="fa-solid fa-link"></i> การผูกกับเมนูใน POS</span>
                    <span class="ck-tooltip-body">
                      • <strong>เมื่อผูกเมนู:</strong> เติมสต็อกเมนูที่สาขาอัตโนมัติเมื่อเบิก/จ่าย<br>
                      • <strong>เมื่อเว้นว่าง:</strong> หักเฉพาะสต็อกครัวกลางและบันทึกรายจ่ายสาขา โดยไม่แตะสต็อกเมนู POS
                    </span>
                  </span>
                </span>
              </label>
              <span v-if="itemForm.linked_menu_item_name" class="badge badge-success text-2xs" style="font-size: var(--font-xxs); padding: 2px 8px; flex-shrink: 0;">
                <i class="fa-solid fa-check"></i> ผูกแล้ว
              </span>
              <span v-else class="badge badge-secondary text-2xs" style="font-size: var(--font-xxs); padding: 2px 8px; flex-shrink: 0;">
                ไม่ผูก
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
                    <span class="text-muted">-- ไม่ผูกกับเมนู POS --</span>
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
                  <span>-- ไม่ผูกกับเมนู POS --</span>
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

            <!-- 2. ปุ่มเลือกว่าจะเติมอยู่ใน ประเภทสด หรือ พร้อมทาน -->
            <div v-if="itemForm.linked_menu_item_name" class="stock-type-selector mt-sm">
              <label class="text-xs font-bold text-secondary block mb-xs">
                <span class="desktop-only">เลือกประเภทสต็อกที่จะเติมเข้าเมนู "{{ itemForm.linked_menu_item_name }}":</span>
                <span class="mobile-only">ประเภทสต็อกที่เติม:</span>
              </label>
              <div class="grid grid-2 gap-sm">
                <button 
                  type="button" 
                  class="btn-stock-choice"
                  :class="{ 'active': itemForm.target_stock_type === 'raw' }"
                  @click="itemForm.target_stock_type = 'raw'"
                >
                  <span class="btn-stock-choice-title">🥩 ประเภทสด</span>
                </button>

                <button 
                  type="button" 
                  class="btn-stock-choice"
                  :class="{ 'active': itemForm.target_stock_type === 'ready' }"
                  @click="itemForm.target_stock_type = 'ready'"
                >
                  <span class="btn-stock-choice-title">🍗 พร้อมทาน</span>
                </button>
              </div>

              <!-- 3. อัตราแปลงหน่วยเข้าสต็อกหน้าร้าน (Unit Conversion) -->
              <div class="conversion-rate-box">
                <label class="conversion-rate-title">
                  <i class="fa-solid fa-arrows-rotate text-primary"></i>
                  <span>อัตราแปลงหน่วยเข้าสต็อกหน้าร้าน (1 {{ itemForm.unit || 'หน่วย' }} = กี่ชิ้น):</span>
                </label>
                <div class="conversion-rate-input-row">
                  <span class="font-bold text-sm">1 {{ itemForm.unit || 'หน่วย' }}</span>
                  <span class="text-xs text-muted font-bold">=</span>
                  <div style="width: 100px;">
                    <input 
                      type="number" 
                      v-model.number="itemForm.pack_size" 
                      min="1" 
                      step="any"
                      class="form-input text-center font-bold text-sm conversion-rate-input" 
                      placeholder="1"
                    />
                  </div>
                  <span class="font-bold text-sm text-primary">ชิ้น (เข้าหน้าร้าน)</span>
                </div>
                <div class="conversion-rate-example">
                  <i class="fa-solid fa-lightbulb text-warning flex-shrink-0"></i>
                  <span>
                    ตัวอย่าง: เบิก 1 {{ itemForm.unit || 'หน่วย' }} = เพิ่มสต็อกหน้าร้าน <strong>{{ Number(itemForm.pack_size || 1) }}</strong> ชิ้น
                    <template v-if="Number(itemForm.pack_size || 1) > 1">
                      (เช่น เบิก 6 {{ itemForm.unit || 'หน่วย' }} = เติมสต็อก {{ Number(itemForm.pack_size || 1) * 6 }} ชิ้น)
                    </template>
                  </span>
                </div>
              </div>

              <div class="stock-sync-alert">
                <i class="fa-solid fa-circle-info text-info flex-shrink-0"></i>
                <span class="desktop-only">เมื่อครัวกลางจ่ายของให้สาขา ระบบจะคำนวณตามอัตราแปลงหน่วยและเติมสต็อกเมนูนี้ที่สาขาให้อัตโนมัติ</span>
                <span class="mobile-only">เมื่อจ่ายของ จะคำนวณแปลงหน่วยและเติมสต็อกเมนูนี้ให้สาขาอัตโนมัติ</span>
              </div>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex gap-md mt-xl">
            <button class="btn btn-secondary flex-1" :disabled="isSavingItem" @click="showItemModal = false">ยกเลิก</button>
            <button 
              class="btn btn-primary flex-1" 
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
            <button class="btn btn-secondary flex-1" @click="showRestockModal = false">ยกเลิก</button>
            <button class="btn btn-primary flex-1" @click="submitQuickRestock">
              <i class="fa-solid fa-floppy-disk"></i> บันทึก
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ────────────────────────────────────────────────────────── -->
    <!-- MODAL: ปรับปรุงสต็อก (Stock Adjustment) -->
    <!-- ────────────────────────────────────────────────────────── -->
    <div v-if="showAdjustModal" class="modal-container active">
      <div class="modal-overlay" @click="showAdjustModal = false"></div>
      <div class="modal-content modal-center w-full max-w-md" style="position:relative; z-index:2; overflow-y:auto; max-height:85dvh;">
        <div class="modal-header">
          <h3>
            <i class="fa-solid fa-sliders text-primary" style="margin-right: 6px;"></i>
            ปรับปรุงสต็อก
          </h3>
          <button class="modal-close" @click="showAdjustModal = false">✕</button>
        </div>

        <div class="modal-body">
          <!-- กล่องข้อมูลสินค้า: โปร่ง สบายตา ไม่ชิดขอบ -->
          <div class="modal-item-summary-card mb-md">
            <div class="modal-item-summary-name">
              <span class="modal-item-summary-label">สินค้า:</span>
              <span class="modal-item-summary-title">{{ activeAdjustItem?.name }}</span>
            </div>
            <div class="modal-item-summary-stock">
              <i class="fa-solid fa-cubes-stacked text-tertiary"></i>
              <span>สต็อกปัจจุบันในระบบ:</span>
              <strong class="text-main">{{ activeAdjustItem?.quantity }} {{ activeAdjustItem?.unit }}</strong>
            </div>
          </div>

          <!-- ช่องกรอก: ยอดที่นับได้จริง -->
          <div class="form-group mb-md">
            <label class="form-label font-bold text-sm">ยอดที่นับได้จริง (สต็อกจริงล่าสุด) *</label>
            <div class="flex align-center gap-xs">
              <input 
                type="number" 
                v-model.number="adjustForm.actual_quantity" 
                placeholder="ระบุยอดที่นับได้จริง..." 
                class="form-input font-bold text-lg text-primary flex-1" 
                min="0"
                step="any"
                @input="onActualQuantityInput"
              />
              <span class="font-bold text-sm text-secondary">{{ activeAdjustItem?.unit }}</span>
            </div>
          </div>

          <!-- กล่องสรุปผลต่างคำนวณอัตโนมัติ -->
          <div class="modal-item-summary-card mb-md" style="background: rgba(0, 0, 0, 0.02); border: 1px dashed var(--border-color); padding: 12px 14px;">
            <div class="flex flex-between align-center mb-xs">
              <span class="text-xs text-secondary font-medium">
                <i class="fa-solid fa-calculator text-muted mr-1"></i>ผลต่างสต็อก (คำนวณอัตโนมัติ):
              </span>
              <span class="font-bold text-base" :class="diffQuantity < 0 ? 'text-danger' : (diffQuantity > 0 ? 'text-success' : 'text-muted')">
                {{ diffQuantity > 0 ? '+' : '' }}{{ formatNumber(diffQuantity) }} {{ activeAdjustItem?.unit }}
              </span>
            </div>
            <div class="flex flex-between align-center text-xs text-muted">
              <span>มูลค่าผลต่าง (ต้นทุน ฿{{ formatNumber(activeAdjustItem?.cost_price) }}/{{ activeAdjustItem?.unit }}):</span>
              <strong :class="diffQuantity < 0 ? 'text-danger' : (diffQuantity > 0 ? 'text-success' : 'text-muted')">
                {{ diffQuantity < 0 ? '- ฿' : (diffQuantity > 0 ? '+ ฿' : '฿') }}{{ formatNumber(Math.abs(diffQuantity * (activeAdjustItem?.cost_price || 0))) }}
              </strong>
            </div>
          </div>

          <!-- ติ๊กเลือก คืนเงินเข้าบัญชีกองกลาง (ติ๊กเลือกอัตโนมัติเมื่อสต็อกลดลง) -->
          <div v-if="diffQuantity < 0" class="modal-finance-adjust-card mb-md refund-mode">
            <label class="modal-finance-adjust-label cursor-pointer">
              <input 
                type="checkbox" 
                v-model="adjustForm.refund_to_finance" 
                class="modal-finance-checkbox"
              />
              <div class="modal-finance-adjust-content">
                <span class="text-sm font-bold text-success flex align-center gap-xs">
                  <i class="fa-solid fa-hand-holding-dollar"></i>
                  คืนเงิน ฿{{ formatNumber(Math.abs(diffQuantity * (activeAdjustItem?.cost_price || 0))) }} เข้าบัญชีกองกลางอัตโนมัติ
                </span>
                <p class="text-2xs text-muted mb-0 mt-xs leading-normal">
                  (ระบบจะบันทึกเงินปรับปรุงเข้ากองกลาง เพื่อหักล้างยอดที่เคยหักซื้อเกินไป ทำให้ยอดเงินคงเหลือถูกต้อง 100%)
                </p>
              </div>
            </label>
          </div>

          <!-- กรณีสต็อกเพิ่มขึ้น (ถ้าต้องการตัดเงินซื้อกองกลาง) -->
          <div v-else-if="diffQuantity > 0" class="modal-finance-adjust-card mb-md charge-mode">
            <label class="modal-finance-adjust-label cursor-pointer">
              <input 
                type="checkbox" 
                v-model="adjustForm.charge_to_finance" 
                class="modal-finance-checkbox"
              />
              <div class="modal-finance-adjust-content">
                <span class="text-sm font-bold text-danger flex align-center gap-xs">
                  <i class="fa-solid fa-cart-shopping"></i>
                  ตัดเงินซื้อ ฿{{ formatNumber(diffQuantity * (activeAdjustItem?.cost_price || 0)) }} ออกจากบัญชีกองกลาง
                </span>
                <p class="text-2xs text-muted mb-0 mt-xs leading-normal">
                  (หากเป็นการนับพบของเดิม ไม่ต้องการตัดเงินเพิ่ม สามารถนำติ๊กถูกออกได้)
                </p>
              </div>
            </label>
          </div>

          <!-- ช่องสาเหตุ / หมายเหตุ -->
          <div class="form-group mb-md">
            <label class="form-label font-bold text-sm">สาเหตุ / บันทึกช่วยจำ</label>
            <input 
              type="text" 
              v-model="adjustForm.reason" 
              placeholder="เช่น เติมสต็อกเกิน 1 ชิ้น, ตรวจนับสต็อกจริง" 
              class="form-input w-full" 
            />
          </div>

          <!-- ปุ่มกดยืนยัน / ยกเลิก -->
          <div class="flex gap-md mt-xl">
            <button class="btn btn-secondary flex-1" @click="showAdjustModal = false">ยกเลิก</button>
            <button 
              class="btn btn-primary flex-1" 
              :disabled="adjustForm.actual_quantity === null || adjustForm.actual_quantity === undefined || adjustForm.actual_quantity < 0 || diffQuantity === 0"
              @click="submitAdjustStock"
            >
              <i class="fa-solid fa-floppy-disk"></i> บันทึก
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
            <button class="btn btn-secondary flex-1" :disabled="isSavingTransaction" @click="showTransactionModal = false">ยกเลิก</button>
            <button class="btn btn-primary flex-1" :disabled="isSavingTransaction" @click="submitTransaction">
              <i v-if="isSavingTransaction" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-floppy-disk"></i>
              {{ isSavingTransaction ? 'กำลังบันทึก...' : 'บันทึก' }}
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
            <button class="btn btn-secondary flex-1" :disabled="isSavingWaste" @click="showWasteModal = false">ยกเลิก</button>
            <button class="btn btn-primary flex-1" :disabled="isSavingWaste" @click="submitWaste">
              <i v-if="isSavingWaste" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-floppy-disk"></i>
              {{ isSavingWaste ? 'กำลังบันทึก...' : 'บันทึก' }}
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
            <button class="btn btn-secondary flex-1" :disabled="isSubmittingReimburse" @click="showReimburseModal = false">ยกเลิก</button>
            <button class="btn btn-primary flex-1" :disabled="isSubmittingReimburse" @click="submitReimburseBranch">
              <i v-if="isSubmittingReimburse" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-floppy-disk"></i>
              {{ isSubmittingReimburse ? 'กำลังบันทึก...' : 'บันทึก' }}
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
            <button class="btn btn-secondary flex-1" :disabled="isSubmittingPayout" @click="showPayoutModal = false">ยกเลิก</button>
            <button class="btn btn-primary flex-1" :disabled="isSubmittingPayout" @click="submitPayout">
              <i v-if="isSubmittingPayout" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-floppy-disk"></i>
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
            <i class="fa-solid fa-pen-to-square" style="margin-right: 6px;"></i>
            ปรับยอดสินค้า / แจ้งของชำรุด
          </h3>
          <button class="modal-close" @click="showAdjustItemModal = false" aria-label="ปิด">✕</button>
        </div>

        <div class="modal-body">
          <!-- กล่องข้อมูลสินค้า (Reuse .modal-item-summary-card) -->
          <div class="modal-item-summary-card mb-md">
            <div class="modal-item-summary-name">
              <span class="modal-item-summary-label">สินค้า:</span>
              <span class="modal-item-summary-title">{{ adjustingItem.item_name }}</span>
            </div>
            <div class="modal-item-summary-stock flex-between">
              <span>ราคาเบิก: <strong class="text-main">฿{{ formatNumber(adjustingItem.cost_price) }} / {{ adjustingItem.unit }}</strong></span>
              <span>จำนวนปัจจุบัน: <strong class="text-primary">{{ formatNumber(adjustingItem.quantity) }} {{ adjustingItem.unit }}</strong></span>
            </div>
          </div>

          <!-- New Quantity Input -->
          <div class="form-group mb-md">
            <label for="adjust-new-qty" class="form-label font-bold text-sm">
              ระบุจำนวนใหม่ที่ได้รับจริง ({{ adjustingItem.unit }}) *
            </label>
            <div class="flex align-center gap-xs">
              <input 
                id="adjust-new-qty"
                type="number" 
                inputmode="numeric"
                class="form-input font-bold text-lg text-primary flex-1 tabular-nums" 
                v-model.number="adjustNewQty" 
                min="0" 
                :max="adjustingItem.quantity - 1" 
                step="1"
              />
              <span class="font-bold text-sm text-secondary">{{ adjustingItem.unit }}</span>
            </div>
            <span class="text-xs text-secondary block mt-xs tabular-nums">
              ยอดเดิม: <strong>{{ formatNumber(adjustingItem.quantity) }} {{ adjustingItem.unit }}</strong> ➔ จะปรับลดออก <strong class="text-danger">{{ formatNumber(Math.max(0, adjustingItem.quantity - adjustNewQty)) }} {{ adjustingItem.unit }}</strong>
            </span>
          </div>

          <!-- Refund Amount Calculation (Reuse .modal-total-summary-box) -->
          <div class="modal-total-summary-box modal-total-waste mb-md">
            <div class="modal-total-label text-danger">
              <i class="fa-solid fa-rotate-left mr-1 text-danger"></i>
              <span>ยอดเงินที่ปรับลดคืนสาขา:</span>
            </div>
            <div class="modal-total-amount text-danger tabular-nums">
              -฿{{ formatNumber(Math.max(0, adjustingItem.quantity - adjustNewQty) * adjustingItem.cost_price) }}
            </div>
          </div>

          <!-- Action for Diff Stock -->
          <div class="form-group mb-md">
            <label class="form-label font-bold text-sm">การจัดการของส่วนต่าง *</label>
            <div class="flex flex-col gap-xs mt-xs">
              <label 
                class="modal-finance-adjust-card modal-radio-card"
                :class="{ 'refund-mode': adjustWasteAction === 'return_to_stock' }"
              >
                <div class="modal-finance-adjust-label">
                  <input type="radio" value="return_to_stock" v-model="adjustWasteAction" class="modal-finance-checkbox" />
                  <span class="text-sm" :class="adjustWasteAction === 'return_to_stock' ? 'font-bold text-success' : 'font-medium text-main'">
                    คืนสต็อกเข้าคลังครัวกลาง (ของยังดี / ส่งคืนกลับมา)
                  </span>
                </div>
              </label>
              <label 
                class="modal-finance-adjust-card modal-radio-card"
                :class="{ 'charge-mode': adjustWasteAction === 'log_as_waste' }"
              >
                <div class="modal-finance-adjust-label">
                  <input type="radio" value="log_as_waste" v-model="adjustWasteAction" class="modal-finance-checkbox" />
                  <span class="text-sm" :class="adjustWasteAction === 'log_as_waste' ? 'font-bold text-danger' : 'font-medium text-main'">
                    บันทึกเป็นของเสียครัวกลาง (แตกหัก / ชำรุด / เสียหาย)
                  </span>
                </div>
              </label>
            </div>
          </div>

          <!-- Note/Reason -->
          <div class="form-group mb-md">
            <label for="adjust-waste-note" class="form-label font-bold text-sm">เหตุผลการปรับลด/ของชำรุด:</label>
            <input 
              id="adjust-waste-note"
              type="text" 
              class="form-input w-full text-sm" 
              v-model="adjustWasteNote" 
              placeholder="เช่น กล่องบุบ, ถุงฉีกขาด, ส่งของไม่ครบ" 
            />
          </div>

          <!-- Actions -->
          <div class="flex gap-md mt-xl">
            <button class="btn btn-secondary flex-1" :disabled="isSubmittingAdjust" @click="showAdjustItemModal = false">ยกเลิก</button>
            <button 
              class="btn btn-primary flex-1" 
              :disabled="isSubmittingAdjust || adjustNewQty < 0 || adjustNewQty >= adjustingItem.quantity"
              @click="submitAdjustItem"
            >
              <i v-if="isSubmittingAdjust" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-floppy-disk"></i>
              {{ isSubmittingAdjust ? 'กำลังบันทึก...' : 'บันทึก' }}
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
import DatePeriodFilter from '../components/DatePeriodFilter.vue';
import ReorderItemsPanel from '../components/ReorderItemsPanel.vue';
import KitchenCatalogCart from '../components/KitchenCatalogCart.vue';
import TransferOrderItems from '../components/TransferOrderItems.vue';
import api from '../api';
import { ui, compressImage, getToday, isTimeInRange, formatNumber, formatDateTime, getItemNameParts } from '../helpers';

const route = useRoute();
const router = useRouter();

// Active tab is derived directly from sidebar route param /central-kitchen/:tab
const activeTab = computed(() => {
  return route.params.tab || 'catalog';
});

// States
const items = ref([]);
const orders = ref([]);
const history = ref([]);
const branches = ref([]);
const retailBranches = ref([]);

// Dedicated Dispatch Tab States (Push Model)
const dispatchBranchId = ref('');
const dispatchCart = ref([]);
const dispatchNotes = ref('');
const isSubmittingDispatch = ref(false);

const selectedDispatchBranchName = computed(() => {
  const b = retailBranches.value.find(x => Number(x.id) === Number(dispatchBranchId.value));
  return b ? b.name : '';
});

const totalDispatchCost = computed(() => {
  return dispatchCart.value.reduce((sum, c) => sum + (Number(c.quantity) * Number(c.cost_price)), 0);
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
const orderFilterStatus = ref('all');
const orderBranchFilter = ref('all');
const orderRequesterFilter = ref('all');
const isOrderRequesterDropdownOpen = ref(false);
const historyRequesterFilter = ref('all');
const isHistoryRequesterDropdownOpen = ref(false);
const historySearchQuery = ref('');
const historyBranchFilter = ref('all');
const historyItemFilter = ref('all');
const isHistoryItemDropdownOpen = ref(false);

const sortedKitchenItems = computed(() => {
  const map = new Map();
  for (const it of items.value) {
    if (it && it.name && it.name.trim()) {
      map.set(it.name.trim().toLowerCase(), { id: it.id, name: it.name.trim() });
    }
  }
  for (const h of history.value) {
    if (h.item_name && h.item_name.trim()) {
      map.set(h.item_name.trim().toLowerCase(), { id: h.item_name.trim(), name: h.item_name.trim() });
    }
    if (h.items && Array.isArray(h.items)) {
      for (const it of h.items) {
        if (it && it.item_name && it.item_name.trim()) {
          map.set(it.item_name.trim().toLowerCase(), { id: it.item_name.trim(), name: it.item_name.trim() });
        }
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'th'));
});

const selectedHistoryItemName = computed(() => {
  if (historyItemFilter.value === 'all') return 'สินค้าทั้งหมด';
  return historyItemFilter.value;
});

const availableOrderRequesters = computed(() => {
  const names = new Set();
  for (const o of orders.value) {
    const name = (o.requested_by_name || 'ไม่ระบุ').trim();
    if (name) names.add(name);
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, 'th'));
});

const availableHistoryRequesters = computed(() => {
  const names = new Set();
  for (const h of history.value) {
    const name = (h.created_by || 'ไม่ระบุ').trim();
    if (name) names.add(name);
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, 'th'));
});

const selectedPartnerBranchName = computed(() => {
  if (!selectedPartnerBranch.value) return 'เลือกสาขา';
  const found = retailBranches.value.find(b => Number(b.id) === Number(selectedPartnerBranch.value));
  return found ? found.name : 'เลือกสาขา';
});

const closeOrderBranchDropdown = () => {
  isOrderRequesterDropdownOpen.value = false;
  isHistoryRequesterDropdownOpen.value = false;
  isHistoryItemDropdownOpen.value = false;
};

const historyFilter = ref('all');

// Categories filter list & Management
const defaultKitchenCategories = [
  { id: 1, code: 'raw_material', name: 'วัตถุดิบ/อาหาร', icon: 'fa-solid fa-drumstick-bite' },
  { id: 2, code: 'sauce', name: 'ซอส/น้ำจิ้ม', icon: 'fa-solid fa-bottle-droplet' },
  { id: 3, code: 'powder', name: 'ผง/เครื่องปรุง', icon: 'fa-solid fa-mortar-pestle' },
  { id: 4, code: 'oil_flour', name: 'แป้งและน้ำมัน', icon: 'fa-solid fa-wheat-awn' },
  { id: 5, code: 'packaging', name: 'บรรจุภัณฑ์', icon: 'fa-solid fa-box-open' },
  { id: 6, code: 'equipment', name: 'อุปกรณ์/ของใช้', icon: 'fa-solid fa-kitchen-set' },
  { id: 7, code: 'general', name: 'ทั่วไป/อื่นๆ', icon: 'fa-solid fa-tag' }
];

const kitchenCategories = ref([...defaultKitchenCategories]);

const loadCategories = async () => {
  try {
    const res = await api.centralKitchen.getCategories();
    const list = Array.isArray(res) ? res : (res && res.data ? res.data : []);
    if (Array.isArray(list) && list.length > 0) {
      kitchenCategories.value = list;
    }
  } catch (err) {
    console.error('Failed to load kitchen categories:', err);
  }
};

const categories = computed(() => {
  const base = [{ id: 'all', label: 'ทั้งหมด', icon: 'fa-solid fa-boxes-stacked' }];
  const dynamic = kitchenCategories.value.map(c => ({
    id: c.code,
    label: c.name,
    icon: c.icon || 'fa-solid fa-tag'
  }));
  return [...base, ...dynamic];
});

// Item Modal Options & Dropdowns
const isCategoryModalDropdownOpen = ref(false);
const isUomModalDropdownOpen = ref(false);
const isPosMenuModalDropdownOpen = ref(false);
const isSavingItem = ref(false);
const fileInputRef = ref(null);

const itemModalCategories = computed(() => {
  return kitchenCategories.value.map(c => ({
    id: c.code,
    label: c.name,
    icon: c.icon || 'fa-solid fa-tag'
  }));
});

const kitchenUnits = ['ชิ้น', 'กิโลกรัม', 'กรัม', 'แพ็ค', 'ถุง', 'ขวด', 'ลัง', 'กระป๋อง', 'ม้วน', 'อัน', 'กล่อง', 'ลิตร', 'ถัง'];

const itemModalCategoryLabel = computed(() => {
  const cat = itemModalCategories.value.find(c => c.id === itemForm.value.category);
  return cat ? cat.label : 'เลือกหมวดหมู่...';
});

// Category Management Modal State
const showCategoryModal = ref(false);
const isSavingCat = ref(false);
const editingCat = ref(null);
const catForm = ref({ name: '', code: '', icon: 'fa-solid fa-tag' });


const openCategoryModal = () => {
  editingCat.value = null;
  catForm.value = { name: '', code: '', icon: 'fa-solid fa-tag' };
  showCategoryModal.value = true;
};

const handleEditCat = (cat) => {
  editingCat.value = cat;
  catForm.value = { name: cat.name, code: cat.code, icon: cat.icon || 'fa-solid fa-tag' };
};

const handleCancelEditCat = () => {
  editingCat.value = null;
  catForm.value = { name: '', code: '', icon: 'fa-solid fa-tag' };
};

const handleSaveCategory = async () => {
  if (!catForm.value.name.trim()) {
    ui.showToast('กรุณาระบุชื่อหมวดหมู่', 'warning');
    return;
  }
  isSavingCat.value = true;
  try {
    let code = (catForm.value.code || '').trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+|_+$/g, '');
    if (!code) {
      code = `cat_${Date.now()}`;
    }
    if (editingCat.value) {
      await api.centralKitchen.updateCategory(editingCat.value.id, {
        name: catForm.value.name.trim(),
        icon: catForm.value.icon
      });
      ui.showToast(`แก้ไขหมวดหมู่ "${catForm.value.name}" เรียบร้อยแล้ว`, 'success');
    } else {
      await api.centralKitchen.createCategory({
        name: catForm.value.name.trim(),
        code: code,
        icon: catForm.value.icon
      });
      ui.showToast(`เพิ่มหมวดหมู่ "${catForm.value.name}" สำเร็จ`, 'success');
    }
    await loadCategories();
    handleCancelEditCat();
  } catch (err) {
    console.error('Error saving category:', err);
    ui.showToast(err.message || 'บันทึกหมวดหมู่ไม่สำเร็จ', 'danger');
  } finally {
    isSavingCat.value = false;
  }
};

const handleDeleteCat = async (cat) => {
  const count = getCategoryCount(cat.code);
  if (count > 0) {
    ui.showToast(`ไม่สามารถลบหมวดหมู่ "${cat.name}" ได้เนื่องจากมีสินค้าใช้งานอยู่ ${count} รายการ`, 'warning');
    return;
  }
  const ok = await ui.showConfirm('ยืนยันการลบหมวดหมู่', `คุณต้องการลบหมวดหมู่ "${cat.name}" ใช่หรือไม่?`);
  if (!ok) return;
  try {
    await api.centralKitchen.deleteCategory(cat.id);
    ui.showToast(`ลบหมวดหมู่ "${cat.name}" สำเร็จ`, 'success');
    await loadCategories();
  } catch (err) {
    console.error('Error deleting category:', err);
    ui.showToast(err.response?.data?.error || err.message || 'ลบหมวดหมู่ไม่สำเร็จ', 'danger');
  }
};

// Reorder Mode State & Drag-and-Drop Methods (Like Menu.vue)
const isReorderMode = ref(false);
const reorderItems = ref([]);
const isSavingReorder = ref(false);

const openReorderMode = () => {
  reorderItems.value = [...items.value];
  isReorderMode.value = true;
};

const closeReorderMode = () => {
  isReorderMode.value = false;
};

const handleSaveReorder = async () => {
  if (isSavingReorder.value) return;
  isSavingReorder.value = true;
  ui.showLoading();
  try {
    const ids = reorderItems.value.map(item => item.id);
    const res = await api.centralKitchen.reorderItems(ids);
    if (res && res.success) {
      ui.showToast('เปลี่ยนลำดับสินค้าเรียบร้อยแล้ว', 'success');
      isReorderMode.value = false;
      await loadItems();
    } else {
      ui.showToast('เปลี่ยนลำดับสินค้าไม่สำเร็จ: ' + ((res && res.error) || 'ข้อผิดพลาดระบบ'), 'danger');
    }
  } catch (err) {
    console.error(err);
    ui.showToast('เปลี่ยนลำดับสินค้าไม่สำเร็จ: ' + (err.response?.data?.error || err.message), 'danger');
  } finally {
    ui.hideLoading();
    isSavingReorder.value = false;
  }
};

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

// Stock Adjustment State
const showAdjustModal = ref(false);
const activeAdjustItem = ref(null);
const adjustForm = ref({
  actual_quantity: 0,
  refund_to_finance: true,
  charge_to_finance: false,
  reason: ''
});

const diffQuantity = computed(() => {
  if (!activeAdjustItem.value || adjustForm.value.actual_quantity === null || adjustForm.value.actual_quantity === undefined || adjustForm.value.actual_quantity === '') {
    return 0;
  }
  return Number(adjustForm.value.actual_quantity) - Number(activeAdjustItem.value.quantity || 0);
});

const onActualQuantityInput = () => {
  if (diffQuantity.value < 0) {
    adjustForm.value.refund_to_finance = true;
  } else {
    adjustForm.value.refund_to_finance = false;
  }
};

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

const branchFilteredFinanceLogs = computed(() => {
  if (selectedReceivablesBranch.value === 'all') return financeLogs.value;
  return financeLogs.value.filter(l => Number(l.branch_id) === Number(selectedReceivablesBranch.value));
});

const filteredFinanceLogs = computed(() => {
  if (financeFilterType.value === 'all') return branchFilteredFinanceLogs.value;
  return branchFilteredFinanceLogs.value.filter(l => l.type === financeFilterType.value);
});

const capitalInCount = computed(() => branchFilteredFinanceLogs.value.filter(l => l.type === 'capital_in').length);
const reimbursementInCount = computed(() => branchFilteredFinanceLogs.value.filter(l => l.type === 'reimbursement_in').length);
const purchaseOutCount = computed(() => branchFilteredFinanceLogs.value.filter(l => l.type === 'purchase_out').length);
const operatingExpenseOutCount = computed(() => branchFilteredFinanceLogs.value.filter(l => l.type === 'operating_expense_out').length);
const wasteLossCount = computed(() => branchFilteredFinanceLogs.value.filter(l => l.type === 'waste_loss').length);

// Finance Sub-Tabs & Receivables
const financeSubTab = ref('ledger'); // 'ledger' | 'receivables'
const receivablesBreakdown = ref(null);
const isLoadingReceivables = ref(false);
const expandedBranchTransfers = ref({}); // { [branchId]: boolean }
const receivablesStatusTab = ref('pending'); // 'pending' | 'reimbursed'
const setReceivablesStatus = (status) => {
  receivablesStatusTab.value = status;
  loadReceivablesBreakdown();
};

const selectedReceivablesBranch = ref('all'); // 'all' or branch_id

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

// Date & Period Filter State (for Orders & History tabs)
const periodMode = ref('daily'); // 'daily' | 'monthly' | 'yearly'
const selectedDate = ref(getToday());
const selectedMonth = ref(getToday().substring(0, 7));
const selectedYear = ref(getToday().substring(0, 4));
const customStartTime = ref('00.00');
const customEndTime = ref('23.59');

const getPeriodQueryParams = () => {
  if (periodMode.value === 'daily' && selectedDate.value) return { date: selectedDate.value };
  if (periodMode.value === 'monthly' && selectedMonth.value) return { month: selectedMonth.value };
  if (periodMode.value === 'yearly' && selectedYear.value) return { year: selectedYear.value };
  return {};
};

const refreshActivePeriodTab = () => {
  if (activeTab.value === 'orders') loadOrders();
  else if (activeTab.value === 'history') loadHistory();
  else if (activeTab.value === 'finance' || activeTab.value === 'receivables') {
    loadFinances();
    loadReceivablesBreakdown();
  }
};

const matchesSelectedPeriod = (dateStr) => {
  if (!dateStr) return true;
  const d = String(dateStr).substring(0, 10);
  if (periodMode.value === 'daily') {
    if (d !== selectedDate.value) return false;
    const isTimeFilterActive = customStartTime.value !== '00.00' || customEndTime.value !== '23.59';
    return !isTimeFilterActive || isTimeInRange(dateStr, customStartTime.value, customEndTime.value);
  }
  if (periodMode.value === 'monthly') return d.substring(0, 7) === selectedMonth.value;
  if (periodMode.value === 'yearly') return d.substring(0, 4) === String(selectedYear.value);
  return true;
};

const periodMatchedOrders = computed(() => {
  return orders.value.filter(o => {
    const matchBranch = orderBranchFilter.value === 'all' || Number(o.branch_id) === Number(orderBranchFilter.value);
    const matchRequester = orderRequesterFilter.value === 'all' || (o.requested_by_name || 'ไม่ระบุ').trim() === orderRequesterFilter.value;
    return matchBranch && matchRequester && matchesSelectedPeriod(o.created_at);
  });
});

const pendingOrdersCount = computed(() => periodMatchedOrders.value.filter(o => o.status === 'pending').length);
const receivedOrdersCount = computed(() => periodMatchedOrders.value.filter(o => o.status === 'received' || o.status === 'dispatched').length);
const pullOrdersCount = computed(() => periodMatchedOrders.value.filter(o => o.dispatch_type !== 'push').length);
const pushOrdersCount = computed(() => periodMatchedOrders.value.filter(o => o.dispatch_type === 'push').length);
const cancelledOrdersCount = computed(() => periodMatchedOrders.value.filter(o => o.status === 'cancelled').length);

const periodMatchedHistory = computed(() => {
  return history.value.filter(h => {
    const matchRequester = historyRequesterFilter.value === 'all' || (h.created_by || 'ไม่ระบุ').trim() === historyRequesterFilter.value;
    return matchRequester && matchesSelectedPeriod(h.created_at);
  });
});

const historyRestockCount = computed(() => {
  return periodMatchedHistory.value.filter(h => {
    if (h.type !== 'restock') return false;
    if (historyBranchFilter.value !== 'all') return false;
    if (historyItemFilter.value !== 'all' && h.item_name !== historyItemFilter.value) return false;
    return true;
  }).length;
});

const historyTransferCount = computed(() => {
  return periodMatchedHistory.value.filter(h => {
    if (h.type !== 'transfer' && h.type !== 'requisition') return false;
    if (historyBranchFilter.value !== 'all' && Number(h.branch_id) !== Number(historyBranchFilter.value)) return false;
    if (historyItemFilter.value !== 'all') {
      const matchItem = h.items && h.items.some(it => it.item_name === historyItemFilter.value);
      if (!matchItem) return false;
    }
    return true;
  }).length;
});

const historyCancelledCount = computed(() => {
  return periodMatchedHistory.value.filter(h => {
    if (h.status !== 'cancelled') return false;
    if (historyBranchFilter.value !== 'all' && Number(h.branch_id) !== Number(historyBranchFilter.value)) return false;
    if (historyItemFilter.value !== 'all') {
      const matchItem = (h.items && h.items.some(it => it.item_name === historyItemFilter.value)) || (h.item_name === historyItemFilter.value);
      if (!matchItem) return false;
    }
    return true;
  }).length;
});

const historyTotalCount = computed(() => {
  return periodMatchedHistory.value.filter(h => {
    if (historyBranchFilter.value !== 'all' && (h.type === 'transfer' || h.type === 'requisition') && Number(h.branch_id) !== Number(historyBranchFilter.value)) return false;
    if (historyItemFilter.value !== 'all') {
      const matchItem = (h.items && h.items.some(it => it.item_name === historyItemFilter.value)) || (h.item_name === historyItemFilter.value);
      if (!matchItem) return false;
    }
    return true;
  }).length;
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
  if (orderFilterStatus.value === 'all') return periodMatchedOrders.value;
  if (orderFilterStatus.value === 'pending') {
    return periodMatchedOrders.value.filter(o => o.status === 'pending');
  }
  if (orderFilterStatus.value === 'received') {
    return periodMatchedOrders.value.filter(o => o.status === 'received' || o.status === 'dispatched');
  }
  if (orderFilterStatus.value === 'pull') {
    return periodMatchedOrders.value.filter(o => o.dispatch_type !== 'push');
  }
  if (orderFilterStatus.value === 'push') {
    return periodMatchedOrders.value.filter(o => o.dispatch_type === 'push');
  }
  if (orderFilterStatus.value === 'cancelled') {
    return periodMatchedOrders.value.filter(o => o.status === 'cancelled');
  }
  return periodMatchedOrders.value.filter(o => o.status === orderFilterStatus.value);
});

const filteredHistory = computed(() => {
  let list = periodMatchedHistory.value;

  // 1. Filter by Type / Status
  if (historyFilter.value === 'restock') {
    list = list.filter(h => h.type === 'restock');
  } else if (historyFilter.value === 'transfer' || historyFilter.value === 'requisition') {
    list = list.filter(h => h.type === 'transfer' || h.type === 'requisition');
  } else if (historyFilter.value === 'cancelled') {
    list = list.filter(h => h.status === 'cancelled');
  }

  // 2. Filter by Branch
  if (historyBranchFilter.value !== 'all') {
    const bId = Number(historyBranchFilter.value);
    list = list.filter(h => (h.type === 'transfer' || h.type === 'requisition') && Number(h.branch_id) === bId);
  }

  // 3. Filter by Kitchen Item Dropdown
  if (historyItemFilter.value !== 'all') {
    list = list.filter(h => {
      if (h.type === 'restock') {
        return h.item_name === historyItemFilter.value;
      }
      if (h.type === 'transfer' || h.type === 'requisition') {
        return h.items && h.items.some(it => it.item_name === historyItemFilter.value);
      }
      return false;
    });
  }

  return list;
});

const getCategoryLabel = (cat) => {
  const found = kitchenCategories.value.find(c => c.code === cat);
  if (found) return found.name;
  const map = {
    'raw_material': 'วัตถุดิบ/อาหาร',
    'sauce': 'ซอส/น้ำจิ้ม',
    'powder': 'ผง/เครื่องปรุง',
    'oil_flour': 'แป้งและน้ำมัน',
    'packaging': 'บรรจุภัณฑ์',
    'equipment': 'อุปกรณ์',
    'general': 'ทั่วไป'
  };
  return map[cat] || cat;
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
    'pending': 'ยังไม่อนุมัติ',
    'dispatched': 'อนุมัติแล้ว',
    'received': 'อนุมัติแล้ว',
    'cancelled': 'ยกเลิก'
  };
  return map[st] || st;
};

// Fetch Methods
const loadItems = async () => {
  if (items.value.length === 0) isLoadingItems.value = true;
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
  if (orders.value.length === 0) isLoadingOrders.value = true;
  try {
    const res = await api.centralKitchen.getTransfers(getPeriodQueryParams());
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
  if (history.value.length === 0) isLoadingHistory.value = true;
  try {
    const res = await api.centralKitchen.getHistory(getPeriodQueryParams());
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
      if (activeTab.value === 'partners') {
        await loadPartnerData();
      }
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

// Stock Adjustment
const openAdjustStockModal = (item) => {
  activeAdjustItem.value = item;
  adjustForm.value = {
    actual_quantity: item.quantity,
    refund_to_finance: true,
    charge_to_finance: false,
    reason: ''
  };
  showAdjustModal.value = true;
};

const submitAdjustStock = async () => {
  if (adjustForm.value.actual_quantity === null || adjustForm.value.actual_quantity === undefined || adjustForm.value.actual_quantity < 0) {
    return ui.error('กรุณาระบุยอดที่นับได้จริงให้ถูกต้อง (>= 0)');
  }
  if (diffQuantity.value === 0) {
    return ui.warning('ยอดที่นับได้จริงเท่ากับสต็อกปัจจุบัน ไม่มีการเปลี่ยนแปลง');
  }

  ui.showLoading();
  try {
    const res = await api.centralKitchen.adjustStock(activeAdjustItem.value.id, {
      actual_quantity: adjustForm.value.actual_quantity,
      refund_to_finance: adjustForm.value.refund_to_finance,
      charge_to_finance: adjustForm.value.charge_to_finance,
      reason: adjustForm.value.reason
    });
    ui.success(res.message || 'ปรับปรุงสต็อกเรียบร้อยแล้ว');
    showAdjustModal.value = false;
    loadItems();
    loadHistory();
    if (typeof loadFinances === 'function') loadFinances();
  } catch (err) {
    ui.error(err.message || 'เกิดข้อผิดพลาดในการปรับปรุงสต็อก');
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
    const periodParams = getPeriodQueryParams();
    const [summaryRes, logsRes, recRes] = await Promise.all([
      api.centralKitchen.getFinancesSummary(periodParams),
      api.centralKitchen.getFinancesLogs(periodParams),
      api.centralKitchen.getReceivablesBreakdown(receivablesStatusTab.value === 'reimbursed' ? { ...periodParams, status: 'reimbursed' } : {}).catch(() => ({ success: false }))
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
    const params = {
      status: receivablesStatusTab.value
    };
    if (receivablesStatusTab.value === 'reimbursed') {
      const periodParams = getPeriodQueryParams();
      Object.assign(params, periodParams);
    }
    const res = await api.centralKitchen.getReceivablesBreakdown(params);
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
    'waste_loss': 'badge-danger badge-cat-waste',
    'other_out': 'badge-danger'
  };
  return map[type] || 'badge-secondary';
};

const getFinanceTypeLabel = (type) => {
  const map = {
    'capital_in': 'เติมเงินทุน',
    'reimbursement_in': 'สาขาคืนเงิน',
    'purchase_out': 'ซื้อของเข้าคลัง',
    'operating_expense_out': 'ค่าใช้จ่ายครัวกลาง',
    'waste_loss': 'ตัดของเสีย',
    'other_out': 'รายจ่ายอื่นๆ'
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
  if (activeTab.value === 'partners') loadPartnerData();
});

watch(activeTab, (tab) => {
  if (tab === 'catalog' || tab === 'dispatch') loadItems();
  else if (tab === 'orders') loadOrders();
  else if (tab === 'history') {
    loadHistory();
    if (items.value.length === 0) loadItems();
  }
  else if (tab === 'partners') loadPartnerData();
  else if (tab === 'finance' || tab === 'receivables') {
    if (tab === 'receivables') financeSubTab.value = 'receivables';
    loadFinances();
  }
}, { immediate: true });

onMounted(() => {
  window.addEventListener('click', closeCategoryModalDropdown);
  window.addEventListener('click', closeUomModalDropdown);
  window.addEventListener('click', closePosMenuModalDropdown);
  window.addEventListener('click', closeTransactionTypeDropdown);
  window.addEventListener('click', closeOrderBranchDropdown);
  loadCategories();
  loadBranches();
});

onUnmounted(() => {
  window.removeEventListener('click', closeCategoryModalDropdown);
  window.removeEventListener('click', closeUomModalDropdown);
  window.removeEventListener('click', closePosMenuModalDropdown);
  window.removeEventListener('click', closeTransactionTypeDropdown);
  window.removeEventListener('click', closeOrderBranchDropdown);
});
</script>

<style scoped>
/* ────────────────────────────────────────────────────────── */
/* TOOLBAR & POS MENU LINKING STYLES                          */
/* ────────────────────────────────────────────────────────── */
.catalog-toolbar-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--border-color);
}

/* POS Menu Stock Linking Styles */
.custom-select-group-header {
  padding: 6px 14px;
  font-size: var(--font-xxs);
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
  min-height: 52px;
  padding: 14px 16px;
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


.btn-stock-choice.active .btn-stock-choice-sub {
  color: rgba(255, 255, 255, 0.9) !important;
}

.conversion-rate-box {
  padding: 14px 16px;
  background: rgba(139, 3, 19, 0.035);
  border: 1px solid rgba(139, 3, 19, 0.16);
  border-radius: 10px;
  margin-top: 12px;
  box-sizing: border-box;
}

.conversion-rate-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-xs);
  font-weight: 700;
  color: var(--text-primary, #1f2937);
  margin-bottom: 10px;
}

.conversion-rate-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.conversion-rate-input {
  height: 38px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1.5px solid var(--primary, #8b0313);
  background: #ffffff;
  color: var(--text-primary, #111827);
  box-sizing: border-box;
}

.conversion-rate-example {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(197, 118, 0, 0.08);
  border: 1px solid rgba(197, 118, 0, 0.22);
  border-radius: 6px;
  font-size: 11.5px;
  color: var(--accent-dark, #c57600);
  line-height: 1.4;
}

.stock-sync-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(30, 144, 255, 0.08);
  border: 1px solid rgba(30, 144, 255, 0.2);
  border-radius: 8px;
  color: #1e5bb8;
  font-size: var(--font-xs);
  line-height: 1.4;
  margin-top: 10px;
}


/* Responsive visibility helpers */
@media (max-width: 768px) {
  .desktop-only {
    display: none !important;
  }
  .btn-stock-choice {
    min-height: 48px !important;
    padding: 12px 10px !important;
  }
  .btn-stock-choice-title {
    font-size: var(--font-sm) !important;
  }
  .btn-stock-choice-sub {
    font-size: var(--font-xxs) !important;
  }
}

@media (min-width: 641px) and (max-width: 1023px) {
  .grid-cards { gap: 12px !important; }
  .item-card { padding: 12px !important; }
  .item-img-container { height: 170px !important; margin-bottom: 8px !important; }
  .card-badge-category { font-size: var(--font-xs) !important; padding: 3px 10px !important; }
  .card-badge-status { width: 24px !important; height: 24px !important; min-width: 24px !important; font-size: var(--font-xs) !important; }
  .item-name, .item-name-main { font-size: var(--font-md) !important; }
  .item-meta-label { font-size: var(--font-sm) !important; }
}
@media (max-width: 640px) {
  .item-img-container { height: 100px !important; }
  .item-name, .item-name-main { font-size: var(--font-sm) !important; }
  .item-meta-label, .item-unit-slash { font-size: var(--font-xxs) !important; }
  .item-cost-val, .item-stock-val { font-size: var(--font-sm) !important; white-space: nowrap !important; }
  .item-pack-val { font-size: var(--font-xxs) !important; white-space: nowrap !important; }
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
  border: 1px solid var(--border-color);
  background: #ffffff !important;
  border-radius: var(--radius-lg);
}

.filter-bar .category-tabs {
  border-bottom: none !important;
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
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
  font-size: var(--font-xs) !important;
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
  font-size: var(--font-xs) !important;
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
  font-size: var(--font-base);
  line-height: 1.35;
  min-height: unset;
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
  font-size: var(--font-xs);
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

.card-footer-actions > .btn-action {
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


/* Modal Stock Adjustment Finance Card */
.modal-finance-adjust-card {
  padding: 14px 18px !important;
  border-radius: var(--radius-md) !important;
  box-sizing: border-box !important;
  width: 100% !important;
}

.modal-radio-card {
  background: var(--card-bg);
  border: 1.5px solid var(--border-color);
  cursor: pointer;
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

.modal-radio-card .modal-finance-adjust-label {
  align-items: center !important;
}

.tabular-nums,
.modal-item-summary-stock,
.modal-total-amount {
  font-variant-numeric: tabular-nums;
}

.modal-finance-adjust-card.refund-mode {
  background: rgba(46, 125, 50, 0.08) !important;
  border: 1px solid rgba(46, 125, 50, 0.25) !important;
}

.modal-finance-adjust-card.charge-mode {
  background: rgba(139, 3, 19, 0.06) !important;
  border: 1px solid rgba(139, 3, 19, 0.2) !important;
}

.modal-finance-adjust-label {
  display: flex !important;
  align-items: flex-start !important;
  gap: 14px !important;
  margin: 0 !important;
  width: 100% !important;
  cursor: pointer !important;
}

.modal-finance-checkbox {
  width: 20px !important;
  height: 20px !important;
  margin: 2px 0 0 0 !important;
  accent-color: var(--primary) !important;
  flex-shrink: 0 !important;
  cursor: pointer !important;
}

.modal-finance-adjust-content {
  flex: 1;
  min-width: 0;
}

.card-sub-actions {
  display: flex;
  gap: var(--space-xs);
  width: 100%;
}

.card-sub-actions .btn-action {
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
  border: 1px solid var(--border-color);
  background: var(--card-bg);
}

.order-status-tabs {
  display: flex;
  gap: var(--space-xs);
  align-items: center;
  flex-wrap: wrap;
}

.order-tab-count {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-xxs);
  font-weight: 700;
  line-height: 1;
}

.filter-pill.active .order-tab-count {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

.filter-pill:not(.active) .order-tab-count {
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
  font-size: var(--font-sm);
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
  background: #ffffff !important;
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
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
  font-size: var(--font-md);
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
  font-size: var(--font-xl);
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
  font-size: 13px !important;
  font-weight: 600 !important;
  color: var(--text-secondary) !important;
  padding: 14px 20px !important;
  border-bottom: 1px solid var(--border-color) !important;
  letter-spacing: 0.02em;
}

.order-items-table td {
  padding: 16px 20px !important;
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
  font-size: var(--font-xs);
}

.order-notes-box {
  background: var(--bg-secondary);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
  padding: 8px 14px;
}




/* ============================================================ */
/* HISTORY TAB STYLING                                          */
/* ============================================================ */
.history-toolbar {
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
  background: var(--card-bg);
}

.history-status-tabs {
  display: flex;
  gap: var(--space-xs);
  align-items: center;
  flex-wrap: wrap;
}

.history-tab-count {
  margin-left: 2px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-xxs);
  font-weight: 700;
  line-height: 1;
}

.filter-pill.active .history-tab-count {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

.filter-pill:not(.active) .history-tab-count {
  background: rgba(139, 3, 19, 0.08);
  color: var(--primary);
}

/* History Feed Cards */
.history-feed-card {
  border: 1px solid var(--border-color);
  background: #ffffff !important;
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
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
  font-size: var(--font-lg);
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




/* ────────────────────────────────────────────────────────── */
/* TAB 3: CENTRAL KITCHEN FINANCE (สมุดบัญชีกองกลาง)         */
/* ────────────────────────────────────────────────────────── */
.finance-toolbar {
  border-bottom: none !important;
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
  font-size: var(--font-xxs);
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

.finance-tab-count {
  font-size: var(--font-xxs);
  font-weight: 600;
  padding: 2px 7px;
  border-radius: var(--radius-full);
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-secondary);
  line-height: 1.2;
}

.filter-pill.active .finance-tab-count {
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
  font-size: var(--font-lg);
  margin-bottom: 10px;
}

.empty-state-title {
  font-size: var(--font-md);
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
  font-size: var(--font-xl);
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
  font-size: var(--font-xxs);
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
  font-size: var(--font-xxs);
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
  font-size: var(--font-xs);
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
  font-size: var(--font-xs);
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
  font-size: var(--font-xs) !important;
  font-weight: 700 !important;
  color: var(--text-secondary) !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  white-space: nowrap !important;
}

.modal-total-amount {
  font-size: var(--font-lg) !important;
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
  .desktop-menu-table-container {
    display: none !important;
  }

  .mobile-menu-list-container {
    display: block !important;
    width: 100% !important;
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
    font-size: var(--font-xxs) !important;
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
    font-size: var(--font-xxs) !important;
    border-radius: 50% !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0 !important;
    flex-shrink: 0 !important;
  }

  /* 2. Soft Cream Image Box */
  .item-img-container {
    height: 115px !important;
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
    font-size: var(--font-base) !important;
    line-height: 1.3 !important;
    min-height: unset !important;
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
    font-size: var(--font-base) !important;
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
    font-size: var(--font-xxs) !important;
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
    font-size: var(--font-xs) !important;
    color: var(--text-secondary) !important;
    font-weight: 500 !important;
    white-space: nowrap !important;
    flex-shrink: 0 !important;
  }

  .item-unit-slash {
    display: inline !important;
    font-size: var(--font-xxs) !important;
  }

  .item-cost-val {
    font-size: var(--font-base) !important;
    font-weight: 700 !important;
    color: var(--text-primary) !important;
    white-space: nowrap !important;
    flex-shrink: 0 !important;
  }

  .item-stock-val {
    font-size: var(--font-base) !important;
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

  .card-footer-actions > .btn-action {
    height: 36px !important;
    font-size: var(--font-xs) !important;
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

  .modal-finance-adjust-card {
    padding: 12px 14px !important;
  }

  .modal-finance-adjust-label {
    gap: 10px !important;
  }

  .modal-finance-checkbox {
    width: 18px !important;
    height: 18px !important;
    margin-top: 2px !important;
  }

  .card-sub-actions .btn-action {
    height: 32px !important;
    font-size: var(--font-xxs) !important;
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

  /* Order Status Tabs: Multi-line Wrap on Mobile (No horizontal scroll) */
  .order-status-tabs {
    flex-wrap: wrap !important;
    overflow-x: visible !important;
    padding-bottom: 0 !important;
    gap: 6px !important;
    width: 100% !important;
  }

  .order-branch-filter {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .order-branch-label {
    white-space: nowrap;
    flex-shrink: 0;
  }

  .order-branch-select-wrapper {
    max-width: 220px !important;
  }

  .order-branch-select {
    width: 100% !important;
    height: 38px !important;
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

  .order-footer-actions .btn { width: 100%; justify-content: center; }

  /* History Tab Responsive */
  .history-toolbar {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: var(--space-md) !important;
  }

  .history-status-tabs {
    flex-wrap: wrap !important;
    overflow-x: visible !important;
    padding-bottom: 0 !important;
    gap: 6px !important;
    width: 100% !important;
  }

  
  .history-item-chip {
    height: 48px !important;
    min-height: 48px !important;
    max-height: 48px !important;
    padding: 4px 10px !important;
    box-sizing: border-box !important;
  }

  .history-item-chip-name {
    font-size: var(--font-xs) !important;
    line-height: 1.3 !important;
  }

  .history-item-chip-qty {
    min-width: 76px !important;
    font-size: var(--font-xs) !important;
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
    font-size: var(--font-md) !important;
  }

  
  /* Finance Tab Responsive */
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
  font-size: var(--font-xxs);
  margin-top: 8px;
  opacity: 0.9;
  transition: opacity 0.15s ease;
}

.card-clickable:hover .card-click-hint {
  opacity: 1;
  text-decoration: underline;
}

.tab-count-pill {
  font-size: var(--font-xxs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: rgba(0, 0, 0, 0.08);
  color: inherit;
  transition: all 0.2s ease;
}

.category-tab.active .tab-count-pill {
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
  font-size: var(--font-2xl) !important;
  line-height: 1.2 !important;
  letter-spacing: -0.01em;
}

.amount-danger-bold-table {
  color: var(--danger, #ad281e) !important;
  font-weight: 700 !important;
  font-size: var(--font-md) !important;
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
  font-size: var(--font-lg);
  flex-shrink: 0;
}

/* Desktop vs Mobile for Consolidated Items */
.desktop-consolidated-table {
  display: block;
}

.mobile-consolidated-list {
  display: none;
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
  font-size: var(--font-xs);
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
    font-size: var(--font-xxs) !important;
    line-height: 1.35 !important;
    word-break: keep-all !important;
    white-space: normal !important;
  }
  .summary-card-header .badge {
    font-size: var(--font-xxs) !important;
    padding: 2px 6px !important;
    align-self: flex-start !important;
    margin-left: 0 !important;
  }
  .summary-value {
    font-size: var(--font-lg) !important;
    margin-bottom: 2px !important;
  }
  .summary-caption {
    display: none !important;
  }
  .card-click-hint {
    font-size: var(--font-xxs) !important;
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
/* DEDICATED DISPATCH TAB (PUSH MODEL) & CATALOG RESPONSIVE   */
/* ────────────────────────────────────────────────────────── */
.dispatch-section {
  width: 100%;
}

@media (max-width: 768px) {
  /* Toolbar Card on mobile */
  .dispatch-toolbar-card {
    padding: var(--space-md) !important;
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
    font-size: var(--font-xxs) !important;
    padding: 2px 6px !important;
    max-width: calc(100% - 26px) !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  .card-badge-status {
    width: 20px !important;
    height: 20px !important;
    font-size: var(--font-xxs) !important;
    padding: 0 !important;
  }

  .item-img-container {
    height: 115px !important;
    width: 100% !important;
    margin-bottom: 6px !important;
    border-radius: var(--radius-md) !important;
    background: linear-gradient(180deg, #fff7df 0%, #fceecc 100%) !important;
  }

  .item-name {
    font-size: var(--font-base) !important;
    line-height: 1.25 !important;
    margin-bottom: 4px !important;
  }

  .item-meta-box {
    margin-bottom: 2px !important;
  }

  .item-meta-row {
    padding: 1px 0 !important;
    font-size: var(--font-xs) !important;
  }

  .item-cost-val, .item-stock-val {
    font-size: var(--font-base) !important;
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

  .card-footer-actions > .btn-action {
    height: 34px !important;
    min-height: 34px !important;
    font-size: var(--font-xs) !important;
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

  .card-sub-actions .btn-action {
    height: 30px !important;
    min-height: 30px !important;
    font-size: var(--font-xxs) !important;
    font-weight: 600 !important;
    padding: 0 4px !important;
    border-radius: var(--radius-sm) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 3px !important;
  }

  .card-sub-actions .btn-action:last-child {
    flex: 0 0 30px !important;
    padding: 0 !important;
  }
}

/* ── POS Link Tooltip ── */
.ck-tooltip-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.ck-tooltip-trigger {
  background: none;
  border: none;
  outline: none;
  padding: 0;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  cursor: pointer;
  color: var(--text-muted);
  font-size: var(--font-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.ck-tooltip-wrap:hover .ck-tooltip-trigger,
.ck-tooltip-trigger:focus {
  color: var(--primary);
  background: rgba(139, 3, 19, 0.08);
}

.ck-tooltip-bubble {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 10px);
  transform: translateX(-50%);
  width: min(270px, 72vw);
  padding: 10px 12px;
  background: #fffcf7;
  border: 1px solid rgba(139, 3, 19, 0.18);
  border-left: 3px solid var(--primary);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: var(--font-xs);
  font-weight: 400;
  line-height: 1.6;
  box-shadow: 0 8px 24px rgba(61, 27, 17, 0.14);
  text-align: left;
  white-space: normal;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.15s ease;
  z-index: 60;
}

.ck-tooltip-arrow {
  position: absolute;
  bottom: -6px;
  left: 50%;
  width: 10px;
  height: 10px;
  background: #fffcf7;
  border-right: 1px solid rgba(139, 3, 19, 0.18);
  border-bottom: 1px solid rgba(139, 3, 19, 0.18);
  transform: translateX(-50%) rotate(45deg);
}

.ck-tooltip-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 4px;
}

.ck-tooltip-body {
  display: block;
}

.ck-tooltip-body strong {
  color: var(--text-primary);
}

.ck-tooltip-wrap:hover .ck-tooltip-bubble,
.ck-tooltip-wrap:focus-within .ck-tooltip-bubble {
  opacity: 1;
  visibility: visible;
}
/* --- Catalog UI Polish --- */
.filter-bar .category-tabs {
  flex-wrap: wrap !important;
  overflow-x: visible !important;
}

.item-img-container {
  background: rgba(0, 0, 0, 0.02);
}

.category-count,
.item-cost-val,
.item-stock-val {
  font-variant-numeric: tabular-nums;
}

@media (min-width: 769px) {
  .dispatch-toolbar-card,
  .finance-toolbar,
  .partner-toolbar-card {
    padding: var(--space-xl) !important;
  }
}

@media (max-width: 768px) {
  .dispatch-toolbar-card,
  .finance-toolbar,
  .partner-toolbar-card {
    padding: var(--space-md) !important;
  }
}

/* History Card Structure & Table Styling */
.history-card-header {
  border-bottom: 1px solid var(--border-color);
}

.history-items-table-wrapper {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #ffffff;
}

.history-items-table {
  width: 100%;
  border-collapse: collapse;
}

.history-items-table th {
  background: var(--bg-secondary) !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  color: var(--text-secondary) !important;
  padding: 14px 20px !important;
  border-bottom: 1px solid var(--border-color) !important;
  letter-spacing: 0.02em;
}

.history-items-table td {
  background: #ffffff;
  padding: 16px 20px !important;
  border-bottom: 1px solid var(--border-color-light) !important;
  vertical-align: middle;
  font-variant-numeric: tabular-nums;
}

.history-items-table tbody tr:last-child td {
  border-bottom: none !important;
}

.history-qty-pill {
  display: inline-block;
  padding: 3px 12px;
  border-radius: var(--radius-full);
  background: rgba(139, 3, 19, 0.07);
  color: var(--primary);
  font-size: var(--font-xs);
}


.order-footer-notice .notice-group {
  display: flex;
  align-items: center;
  gap: var(--space-xs, 6px);
  flex-wrap: wrap;
}

.order-footer-notice .notice-line-1 {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.order-footer-notice .notice-line-2 {
  display: inline-block;
  font-size: 11.5px;
}

@media (max-width: 640px) {
  .order-footer-notice .notice-group {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
  .order-footer-notice .notice-line-1 {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: normal;
  }
  .order-footer-notice .notice-line-2 {
    display: block;
    margin-left: 0 !important;
    padding-left: 0 !important;
    font-size: 11px;
    text-align: left;
  }
}


</style>
