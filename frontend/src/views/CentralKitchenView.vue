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
        <div class="flex flex-between align-center flex-wrap gap-md">
          <!-- Left: Category Pills -->
          <div class="flex gap-xs flex-wrap align-center">
            <button 
              v-for="cat in categories" 
              :key="cat.id" 
              class="btn btn-sm"
              :class="selectedCategory === cat.id ? 'btn-primary' : 'btn-secondary'"
              @click="selectedCategory = cat.id"
            >
              <i :class="cat.icon" style="margin-right: 4px;"></i> {{ cat.label }}
              <span class="category-count-badge" v-if="getCategoryCount(cat.id) > 0">
                {{ getCategoryCount(cat.id) }}
              </span>
            </button>
          </div>

          <!-- Right: View Toggle & Add Button (Single + icon) -->
          <div class="flex align-center gap-md">
            <div class="view-mode-toggle flex align-center p-xs" style="background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <button 
                class="btn btn-sm btn-icon" 
                :class="{ 'btn-primary': viewMode === 'grid', 'btn-secondary': viewMode !== 'grid' }"
                @click="viewMode = 'grid'"
                title="มุมมองการ์ดรูปภาพ"
              >
                <i class="fa-solid fa-grip"></i>
              </button>
              <button 
                class="btn btn-sm btn-icon" 
                :class="{ 'btn-primary': viewMode === 'table', 'btn-secondary': viewMode !== 'table' }"
                @click="viewMode = 'table'"
                title="มุมมองตาราง"
              >
                <i class="fa-solid fa-table-list"></i>
              </button>
            </div>

            <button class="btn btn-primary" @click="openCreateItemModal">
              <i class="fa-solid fa-plus" style="margin-right: 6px;"></i> เพิ่มของใหม่ด้วยตนเอง
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoadingItems" class="grid-cards">
        <div v-for="i in 6" :key="i" class="card p-4 skeleton-pulse" style="height: 240px; border-radius: var(--radius-md);"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredItems.length === 0" class="card p-3xl text-center">
        <div class="empty-icon-wrap mb-md">
          <i class="fa-solid fa-boxes-packing" style="font-size: 3rem; color: var(--text-tertiary); opacity: 0.6;"></i>
        </div>
        <h3 class="font-bold text-lg mb-xs">ยังไม่มีรายการของในครัวกลาง</h3>
        <p class="text-secondary text-sm mb-lg" style="max-width: 420px; margin-left: auto; margin-right: auto;">
          {{ searchQuery ? 'ไม่พบสินค้าที่ตรงกับคำค้นหา ลองเปลี่ยนคำค้นหรือเลือกหมวดหมู่อื่น' : 'เริ่มต้นลงทะเบียนวัตถุดิบ บรรจุภัณฑ์ หรืออุปกรณ์ เพื่อให้สาขาต่างๆ สามารถเบิกไปใช้งานได้' }}
        </p>
        <button class="btn btn-primary" @click="openCreateItemModal">
          <i class="fa-solid fa-plus mr-1"></i> เพิ่มของชิ้นแรกเข้าคลัง
        </button>
      </div>

      <!-- View 1: Grid Cards View -->
      <div v-else-if="viewMode === 'grid'" class="grid-cards">
        <div 
          v-for="item in filteredItems" 
          :key="item.id" 
          class="card item-card flex flex-col justify-between"
          :class="{ 'low-stock': item.quantity <= item.min_stock_alert }"
        >
          <div>
            <!-- Image & Badges Container -->
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

              <!-- Top Left: Stock Status Badge -->
              <span 
                v-if="item.quantity <= 0" 
                class="status-pill status-out"
              >
                <i class="fa-solid fa-circle-xmark mr-1"></i> หมด
              </span>
              <span 
                v-else-if="item.quantity <= item.min_stock_alert" 
                class="status-pill status-low"
              >
                <i class="fa-solid fa-triangle-exclamation mr-1"></i> ใกล้หมด
              </span>

              <!-- Top Right: Category Tag -->
              <span class="category-tag">
                <i :class="getCategoryIcon(item.category)" style="margin-right: 3px;"></i>
                {{ getCategoryLabel(item.category) }}
              </span>
            </div>

            <!-- Item Body Info -->
            <div class="p-md">
              <h4 class="item-name font-bold mb-xs" :title="item.name">{{ item.name }}</h4>
              
              <div class="flex flex-between align-center text-sm mb-sm">
                <span class="text-secondary">ราคาทุนเบิก:</span>
                <span class="font-bold text-primary" style="font-size: 1.05rem;">
                  ฿{{ formatNumber(item.cost_price) }} <span class="text-xs text-secondary font-normal">/ {{ item.unit }}</span>
                </span>
              </div>
              
              <div class="stock-display-pill flex flex-between align-center px-sm py-xs" :class="item.quantity <= item.min_stock_alert ? 'stock-pill-low' : 'stock-pill-ok'">
                <span class="text-xs text-secondary">
                  <i class="fa-solid fa-cubes-stacked mr-1"></i> สต็อกคงเหลือ:
                </span>
                <span class="font-bold" style="font-size: 0.95rem;">
                  {{ formatNumber(item.quantity) }} {{ item.unit }}
                </span>
              </div>
            </div>
          </div>

          <!-- Bottom Actions -->
          <div class="card-footer-actions flex gap-xs p-md pt-0">
            <button class="btn btn-sm btn-secondary flex-1" @click="openEditItemModal(item)">
              <i class="fa-solid fa-pen"></i> แก้ไข
            </button>
            <button class="btn btn-sm btn-primary flex-1" @click="openQuickRestockModal(item)">
              <i class="fa-solid fa-plus-circle"></i> + เติมด่วน
            </button>
            <button class="btn btn-sm btn-icon text-danger" @click="openWasteModal(item)" title="ตัดของเสีย/หมดอายุ" style="border: 1px solid var(--border-color);">
              <i class="fa-solid fa-trash-can"></i>
            </button>
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
                  <span class="badge badge-secondary" style="font-size: 0.8rem;">
                    {{ getCategoryLabel(item.category) }}
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
                  <span v-if="item.quantity <= 0" class="badge badge-danger">หมดสต็อก</span>
                  <span v-else-if="item.quantity <= item.min_stock_alert" class="badge badge-warning">ใกล้หมด</span>
                  <span v-else class="badge badge-success">พร้อมจ่าย</span>
                </td>
                <!-- Actions -->
                <td class="text-center" style="padding: var(--space-md); vertical-align: middle;">
                  <div class="flex justify-center gap-xs">
                    <button class="btn btn-sm btn-primary" @click="openQuickRestockModal(item)" title="เติมสต็อกด่วน">
                      <i class="fa-solid fa-plus"></i> เติมด่วน
                    </button>
                    <button class="btn btn-sm btn-secondary" @click="openEditItemModal(item)" title="แก้ไข">
                      <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn btn-sm btn-icon text-danger" @click="openWasteModal(item)" title="ตัดของเสีย/หมดอายุ" style="border: 1px solid var(--border-color);">
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
      <div class="card mb-lg p-md flex flex-between align-center toolbar-card" style="gap: var(--space-md); flex-wrap: wrap;">
        <!-- Status Filter Buttons -->
        <div class="flex gap-xs flex-wrap align-center">
          <button 
            class="btn btn-sm" 
            :class="orderFilterStatus === 'pending' ? 'btn-primary' : 'btn-secondary'"
            @click="orderFilterStatus = 'pending'"
          >
            <i class="fa-solid fa-hourglass-start mr-1"></i> รอจัดส่ง ({{ pendingOrdersCount }})
          </button>
          <button 
            class="btn btn-sm" 
            :class="orderFilterStatus === 'dispatched' ? 'btn-primary' : 'btn-secondary'"
            @click="orderFilterStatus = 'dispatched'"
          >
            <i class="fa-solid fa-truck-fast mr-1"></i> กำลังส่ง ({{ dispatchedOrdersCount }})
          </button>
          <button 
            class="btn btn-sm" 
            :class="orderFilterStatus === 'received' ? 'btn-primary' : 'btn-secondary'"
            @click="orderFilterStatus = 'received'"
          >
            <i class="fa-solid fa-circle-check mr-1"></i> สาขารับแล้ว
          </button>
          <button 
            class="btn btn-sm" 
            :class="orderFilterStatus === 'all' ? 'btn-primary' : 'btn-secondary'"
            @click="orderFilterStatus = 'all'"
          >
            ทั้งหมด ({{ orders.length }})
          </button>
        </div>

        <!-- Right: Branch Filter Dropdown -->
        <div class="flex align-center gap-xs">
          <span class="text-xs text-secondary font-bold">สาขา:</span>
          <select v-model="orderBranchFilter" class="form-select" style="min-width: 160px;">
            <option value="all">ทุกสาขา</option>
            <option v-for="b in retailBranches" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoadingOrders" class="card p-3xl text-center">
        <div class="spinner mx-auto mb-md"></div>
        <p class="text-secondary text-sm">กำลังโหลดรายการคำขอเบิกจากสาขา...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredOrders.length === 0" class="card p-3xl text-center">
        <i class="fa-solid fa-clipboard-check mb-md" style="font-size: 3rem; color: var(--text-tertiary); opacity: 0.6;"></i>
        <h3 class="font-bold text-lg mb-xs">ไม่มีรายการคำขอเบิก</h3>
        <p class="text-secondary text-sm">
          {{ orderFilterStatus === 'pending' ? 'ขณะนี้ไม่มีคำขอเบิกที่ค้างรอการจัดส่ง ครัวกลางเคลียร์รายการครบถ้วนแล้ว' : 'ไม่พบรายการคำขอเบิกในเงื่อนไขที่เลือก' }}
        </p>
      </div>

      <!-- Orders List Cards -->
      <div v-else class="orders-list flex flex-col gap-md">
        <div 
          v-for="order in filteredOrders" 
          :key="order.id" 
          class="card p-lg order-card"
          :class="{ 'order-card-pending': order.status === 'pending', 'order-card-dispatched': order.status === 'dispatched' }"
        >
          <!-- Order Card Header -->
          <div class="flex flex-between align-center flex-wrap gap-md mb-md pb-md" style="border-bottom: 1px solid var(--border-color);">
            <div class="flex align-center gap-md flex-wrap">
              <span class="order-no-pill font-bold">
                <i class="fa-solid fa-receipt mr-1"></i> #{{ order.transfer_no }}
              </span>
              <span class="badge badge-primary font-bold" style="font-size: 0.85rem;">
                <i class="fa-solid fa-store mr-1"></i> {{ order.branch_name }}
              </span>
              <span class="badge" :class="getStatusBadgeClass(order.status)">
                {{ getStatusLabel(order.status) }}
              </span>
            </div>

            <div class="text-right">
              <span class="text-xs text-secondary block">ยอดต้นทุนตัดเข้าสาขา:</span>
              <span class="font-bold text-xl text-primary">฿{{ formatNumber(order.total_cost) }}</span>
            </div>
          </div>

          <!-- Order Metadata Info -->
          <div class="flex flex-between align-center text-xs text-secondary mb-md flex-wrap gap-sm">
            <span>
              <i class="fa-solid fa-user mr-1"></i> ผู้ขอเบิก: <strong>{{ order.requested_by_name || 'ไม่ระบุ' }}</strong>
              &nbsp;|&nbsp;
              <i class="fa-solid fa-clock mr-1"></i> ยื่นคำขอเมื่อ: {{ formatDateTime(order.created_at) }}
            </span>
            <span v-if="order.dispatched_at">
              <i class="fa-solid fa-truck mr-1"></i> จัดส่งเมื่อ: {{ formatDateTime(order.dispatched_at) }} โดย {{ order.dispatched_by_name || 'ครัวกลาง' }}
            </span>
          </div>

          <!-- Items Table / Chips Container -->
          <div class="order-items-container p-md mb-md" style="background: var(--bg-secondary); border-radius: var(--radius-md);">
            <div class="text-xs font-bold text-secondary mb-sm flex flex-between">
              <span>รายการของที่ขอเบิก ({{ order.items.length }} รายการ):</span>
              <span>จำนวน × ราคาทุน</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-sm">
              <div 
                v-for="it in order.items" 
                :key="it.id" 
                class="flex flex-between align-center p-sm px-md rounded bg-surface border"
                style="background: var(--card-bg);"
              >
                <div class="flex-1 pr-sm">
                  <div class="font-bold text-sm">{{ it.item_name }}</div>
                  <div class="text-xs text-secondary">@฿{{ formatNumber(it.cost_price) }} / {{ it.unit }}</div>
                </div>
                <div class="text-right">
                  <span class="font-bold text-sm text-primary">{{ it.quantity }} {{ it.unit }}</span>
                  <div class="text-xs text-muted">฿{{ formatNumber(it.quantity * it.cost_price) }}</div>
                </div>
              </div>
            </div>
            <div v-if="order.notes" class="mt-sm pt-sm text-xs text-secondary flex align-center gap-xs" style="border-top: 1px dashed var(--border-color);">
              <i class="fa-solid fa-comment-dots text-primary"></i>
              <span><strong>บันทึกจากสาขา:</strong> {{ order.notes }}</span>
            </div>
          </div>

          <!-- Order Card Footer Action -->
          <div class="flex flex-between align-center flex-wrap gap-md pt-sm">
            <div class="text-xs text-secondary">
              <span v-if="order.status === 'pending'" class="text-warning font-bold">
                <i class="fa-solid fa-triangle-exclamation mr-1"></i> กรุณาตรวจสอบสต็อกจริงก่อนกดจัดส่ง
              </span>
              <span v-else-if="order.status === 'dispatched'" class="text-info font-bold">
                <i class="fa-solid fa-truck-ramp-box mr-1"></i> ของถูกตัดออกจากสต็อกครัวกลางแล้ว รอสาขากดยืนยันตรวจรับ
              </span>
              <span v-else-if="order.status === 'received'" class="text-success font-bold">
                <i class="fa-solid fa-circle-check mr-1"></i> สาขารับของครบถ้วน และบันทึกเป็น Expense สาขาเรียบร้อย
              </span>
            </div>

            <div>
              <button 
                v-if="order.status === 'pending'" 
                class="btn btn-primary"
                @click="dispatchOrder(order)"
              >
                <i class="fa-solid fa-truck-fast mr-1"></i> ยืนยันจัดส่ง & ตัดสต็อกครัวกลาง
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
      <div class="card mb-lg p-md flex flex-between align-center toolbar-card" style="gap: var(--space-md); flex-wrap: wrap;">
        <div class="flex gap-xs flex-wrap align-center">
          <button 
            class="btn btn-sm" 
            :class="historyFilter === 'all' ? 'btn-primary' : 'btn-secondary'"
            @click="historyFilter = 'all'"
          >
            ทั้งหมด ({{ history.length }})
          </button>
          <button 
            class="btn btn-sm" 
            :class="historyFilter === 'restock' ? 'btn-primary' : 'btn-secondary'"
            @click="historyFilter = 'restock'"
          >
            <i class="fa-solid fa-circle-plus text-success mr-1"></i> เติมสต็อกเข้าคลัง ({{ restockHistoryCount }})
          </button>
          <button 
            class="btn btn-sm" 
            :class="historyFilter === 'requisition' ? 'btn-primary' : 'btn-secondary'"
            @click="historyFilter = 'requisition'"
          >
            <i class="fa-solid fa-truck-fast text-primary mr-1"></i> สาขาเบิกของ ({{ transferHistoryCount }})
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoadingHistory" class="card p-3xl text-center">
        <div class="spinner mx-auto mb-md"></div>
        <p class="text-secondary text-sm">กำลังโหลดประวัติการทำรายการ...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredHistory.length === 0" class="card p-3xl text-center">
        <i class="fa-solid fa-timeline mb-md" style="font-size: 3rem; color: var(--text-tertiary); opacity: 0.6;"></i>
        <h3 class="font-bold text-lg mb-xs">ยังไม่มีประวัติการทำรายการ</h3>
        <p class="text-secondary text-sm">เมื่อมีการเติมสต็อกหรือส่งของให้สาขา ข้อมูลจะถูกบันทึกที่นี่โดยละเอียด</p>
      </div>

      <!-- Timeline List -->
      <div v-else class="timeline-container flex flex-col gap-md">
        <div 
          v-for="h in filteredHistory" 
          :key="h.id" 
          class="card p-md history-feed-card"
          :class="h.type === 'restock' ? 'border-restock-feed' : 'border-transfer-feed'"
        >
          <!-- RESTOCK FEED CARD -->
          <div v-if="h.type === 'restock'" class="flex flex-between align-start flex-wrap gap-md">
            <div class="flex gap-md align-start">
              <div class="feed-icon-circle bg-success-light text-success">
                <i class="fa-solid fa-circle-plus"></i>
              </div>
              <div>
                <div class="flex align-center gap-sm mb-xs flex-wrap">
                  <span class="badge badge-success font-bold">🟢 เติมสต็อกเข้าคลัง</span>
                  <span class="font-bold text-base">{{ h.item_name }}</span>
                </div>
                <div class="text-xs text-secondary flex align-center gap-md flex-wrap mb-xs">
                  <span><i class="fa-solid fa-clock mr-1"></i> {{ formatDateTime(h.created_at) }}</span>
                  <span><i class="fa-solid fa-user mr-1"></i> โดย: {{ h.created_by }}</span>
                  <span v-if="h.note"><i class="fa-solid fa-tag mr-1"></i> แหล่งซื้อ/หมายเหตุ: {{ h.note }}</span>
                </div>
              </div>
            </div>

            <div class="text-right">
              <span class="font-bold text-lg text-success block">+{{ formatNumber(h.quantity) }} {{ h.unit }}</span>
              <span class="text-xs text-secondary">ยอดเงินที่ซื้อ: <strong>฿{{ formatNumber(h.total_amount) }}</strong> (@฿{{ formatNumber(h.unit_cost) }})</span>
            </div>
          </div>

          <!-- TRANSFER FEED CARD -->
          <div v-else class="flex flex-between align-start flex-wrap gap-md">
            <div class="flex gap-md align-start">
              <div class="feed-icon-circle bg-primary-glow text-primary">
                <i class="fa-solid fa-truck-fast"></i>
              </div>
              <div>
                <div class="flex align-center gap-sm mb-xs flex-wrap">
                  <span class="badge badge-primary font-bold">📤 ส่งของให้สาขา</span>
                  <span class="font-bold text-base">{{ h.branch_name }}</span>
                  <span class="badge badge-secondary text-xs">#{{ h.transfer_no }}</span>
                  <span class="badge" :class="getStatusBadgeClass(h.status)">{{ getStatusLabel(h.status) }}</span>
                </div>
                <div class="text-xs text-secondary flex align-center gap-md flex-wrap mb-sm">
                  <span><i class="fa-solid fa-clock mr-1"></i> {{ formatDateTime(h.created_at) }}</span>
                  <span><i class="fa-solid fa-user mr-1"></i> ผู้ขอเบิก: {{ h.created_by }}</span>
                </div>

                <!-- Items mini preview -->
                <div class="flex flex-wrap gap-xs">
                  <span 
                    v-for="it in h.items" 
                    :key="it.id" 
                    class="badge badge-sm badge-secondary"
                    style="border: 1px solid var(--border-color);"
                  >
                    {{ it.item_name }} × {{ it.quantity }} {{ it.unit }}
                  </span>
                </div>
              </div>
            </div>

            <div class="text-right">
              <span class="text-xs text-secondary block">มูลค่าของที่ตัดบัญชี</span>
              <span class="font-bold text-lg text-primary">฿{{ formatNumber(h.total_cost) }}</span>
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
      <div class="card mb-lg p-md flex flex-between align-center toolbar-card" style="gap: var(--space-md); flex-wrap: wrap;">
        <div>
          <h3 class="font-bold text-base mb-xs flex align-center gap-xs">
            <i class="fa-solid fa-vault text-primary"></i>
            <span>สมุดบัญชี & กระเป๋าเงินกองกลาง (Central Kitchen Cashbook)</span>
          </h3>
          <p class="text-secondary text-xs">
            บันทึกเงินทุนตั้งต้นของเจ้าของร้าน, บันทึกเงินจ่ายซื้อของสดตุนเข้าคลัง, และติดตามเงินที่สาขาโอนคืนค่าของ
          </p>
        </div>

        <div class="menu-action-buttons flex align-center gap-sm flex-wrap">
          <button class="btn btn-primary" @click="openTransactionModal('capital_in')">
            <i class="fa-solid fa-plus-circle mr-1"></i> เติมเงินทุนกองกลาง
          </button>
          <button class="btn btn-primary" @click="openTransactionModal('operating_expense_out')">
            <i class="fa-solid fa-minus-circle mr-1"></i> จ่ายค่าใช้จ่ายครัวกลาง
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoadingFinance" class="card text-center p-3xl text-secondary mb-lg">
        <div class="spinner mx-auto mb-sm"></div>
        กำลังโหลดข้อมูลการเงินกองกลาง...
      </div>

      <!-- Content when Finance Data Loaded -->
      <div v-else class="flex flex-col gap-lg">
        <!-- 4 Summary KPI Cards -->
        <div class="financial-summary-grid">
          <!-- Card 1: Cash Balance -->
          <div class="summary-card net-card profit-positive">
            <div class="summary-card-header flex flex-between align-center">
              <div class="flex align-center gap-xs">
                <span class="summary-icon"><i class="fa-solid fa-wallet text-primary"></i></span>
                <span class="summary-title">เงินสดกองกลางคงเหลือ</span>
              </div>
              <span class="badge badge-success font-bold text-xs" style="padding: 2px 7px; border-radius: var(--radius-sm);">
                เงินสดพร้อมใช้
              </span>
            </div>
            <div class="summary-value" :class="financeSummary.cash_balance >= 0 ? 'text-primary' : 'text-danger'">
              ฿{{ formatNumber(financeSummary.cash_balance) }}
            </div>
            <div class="summary-formula-caption">ทุนเจ้าของ + สาขาคืนเงิน - ซื้อของ - ค่าใช้จ่าย</div>
          </div>

          <!-- Card 2: Inventory Stock Value -->
          <div class="summary-card">
            <div class="summary-card-header">
              <span class="summary-icon"><i class="fa-solid fa-boxes-stacked text-warning"></i></span>
              <span class="summary-title">มูลค่าสต็อกของในโกดัง</span>
            </div>
            <div class="summary-value text-warning">฿{{ formatNumber(financeSummary.inventory_value) }}</div>
            <div class="summary-sub-badges">
              <span class="sub-badge">สินค้าพร้อมจ่าย</span>
              <span class="sub-badge">คำนวณจากราคาทุน</span>
            </div>
          </div>

          <!-- Card 3: Pending Receivables from Branches -->
          <div class="summary-card">
            <div class="summary-card-header">
              <span class="summary-icon"><i class="fa-solid fa-hourglass-half text-danger"></i></span>
              <span class="summary-title">ยอดที่สาขายังค้างชำระคืน</span>
            </div>
            <div class="summary-value text-danger">฿{{ formatNumber(financeSummary.pending_receivables) }}</div>
            <div class="summary-sub-badges">
              <span class="sub-badge">ของที่สาขารับไปแล้ว</span>
              <span class="sub-badge">รอสาขาโอนคืน</span>
            </div>
          </div>

          <!-- Card 4: Total Capital Injected -->
          <div class="summary-card">
            <div class="summary-card-header">
              <span class="summary-icon"><i class="fa-solid fa-landmark text-info"></i></span>
              <span class="summary-title">เงินทุนเจ้าของที่เติมสะสม</span>
            </div>
            <div class="summary-value text-info">฿{{ formatNumber(financeSummary.total_capital) }}</div>
            <div class="summary-sub-badges">
              <span class="sub-badge">ทุนส่วนตัวเจ้าของร้าน</span>
              <span class="sub-badge">เงินตั้งต้นครัวกลาง</span>
            </div>
          </div>
        </div>

        <!-- Transactions Ledger Card -->
        <div class="card p-lg" style="background: #ffffff; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
          <div class="flex flex-between align-center flex-wrap gap-md" style="border-bottom: 1px solid var(--border-color); padding-bottom: 20px; margin-bottom: 24px;">
            <div class="flex align-center gap-xs">
              <i class="fa-solid fa-clock-rotate-left text-primary" style="font-size: 1.1rem;"></i>
              <span class="font-bold text-base">ประวัติรายการเดินบัญชีกองกลาง</span>
            </div>

            <!-- Filter Pills -->
            <div class="flex gap-xs flex-wrap align-center">
              <button 
                class="btn btn-sm" 
                :class="financeFilterType === 'all' ? 'btn-primary' : 'btn-secondary'"
                @click="financeFilterType = 'all'"
              >
                ทั้งหมด ({{ financeLogs.length }})
              </button>
              <button 
                class="btn btn-sm" 
                :class="financeFilterType === 'capital_in' ? 'btn-primary' : 'btn-secondary'"
                @click="financeFilterType = 'capital_in'"
              >
                <i class="fa-solid fa-circle-plus text-success mr-1"></i> เติมทุน (+)
              </button>
              <button 
                class="btn btn-sm" 
                :class="financeFilterType === 'reimbursement_in' ? 'btn-primary' : 'btn-secondary'"
                @click="financeFilterType = 'reimbursement_in'"
              >
                <i class="fa-solid fa-hand-holding-dollar text-primary mr-1"></i> สาขาคืนเงิน (+)
              </button>
              <button 
                class="btn btn-sm" 
                :class="financeFilterType === 'purchase_out' ? 'btn-primary' : 'btn-secondary'"
                @click="financeFilterType = 'purchase_out'"
              >
                <i class="fa-solid fa-cart-shopping text-warning mr-1"></i> ซื้อของเข้าคลัง (-)
              </button>
              <button 
                class="btn btn-sm" 
                :class="financeFilterType === 'operating_expense_out' ? 'btn-primary' : 'btn-secondary'"
                @click="financeFilterType = 'operating_expense_out'"
              >
                <i class="fa-solid fa-circle-minus text-danger mr-1"></i> รายจ่ายครัวกลาง (-)
              </button>
            </div>
          </div>

          <!-- Empty Logs -->
          <div v-if="filteredFinanceLogs.length === 0" class="text-center p-3xl text-secondary">
            <i class="fa-solid fa-receipt mb-md" style="font-size: 3rem; color: var(--text-tertiary); opacity: 0.5;"></i>
            <h4 class="font-bold text-base mb-xs">ยังไม่มีรายการเดินบัญชี</h4>
            <p class="text-xs text-secondary">เมื่อมีการเติมทุน ซื้อของเข้าคลัง หรือสาขาโอนเงินคืน จะถูกบันทึกที่นี่โดยละเอียด</p>
          </div>

          <!-- Logs Table -->
          <div v-else style="overflow-x: auto;">
            <table class="table w-full" style="border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); background: rgba(139, 3, 19, 0.03);">
                  <th class="text-left" style="padding: var(--space-md); width: 160px;">วันที่ & เวลา</th>
                  <th class="text-center" style="padding: var(--space-md); width: 150px;">ประเภท</th>
                  <th class="text-left" style="padding: var(--space-md);">รายการ / บันทึกช่วยจำ</th>
                  <th class="text-center" style="padding: var(--space-md); width: 140px;">สาขา</th>
                  <th class="text-right" style="padding: var(--space-md); width: 150px;">จำนวนเงิน</th>
                  <th class="text-center" style="padding: var(--space-md); width: 120px;">ผู้บันทึก</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="log in filteredFinanceLogs" 
                  :key="log.id" 
                  style="border-bottom: 1px solid var(--border-color);"
                  class="table-row-hover"
                >
                  <td style="padding: var(--space-md); vertical-align: middle;" class="text-xs text-secondary">
                    {{ formatDateTime(log.created_at) }}
                  </td>
                  <td class="text-center" style="padding: var(--space-md); vertical-align: middle;">
                    <span class="badge font-bold text-xs" :class="getFinanceTypeBadgeClass(log.type)">
                      {{ getFinanceTypeLabel(log.type) }}
                    </span>
                  </td>
                  <td style="padding: var(--space-md); vertical-align: middle;">
                    <div class="font-bold text-sm">{{ log.note || '-' }}</div>
                  </td>
                  <td class="text-center" style="padding: var(--space-md); vertical-align: middle;">
                    <span v-if="log.branch_name" class="badge badge-secondary text-xs">
                      {{ log.branch_name }}
                    </span>
                    <span v-else class="text-xs text-tertiary">-</span>
                  </td>
                  <td class="text-right" style="padding: var(--space-md); vertical-align: middle; font-weight: bold; font-size: 1.05rem;" :class="isFinanceInflow(log.type) ? 'text-success' : 'text-danger'">
                    {{ isFinanceInflow(log.type) ? '+' : '-' }}฿{{ formatNumber(log.amount) }}
                  </td>
                  <td class="text-center text-xs text-secondary" style="padding: var(--space-md); vertical-align: middle;">
                    {{ log.created_by_name || '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
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

        <div class="flex align-center gap-sm" style="flex-shrink: 0;">
          <label class="text-sm font-bold text-secondary" style="white-space: nowrap;">เลือกสาขา:</label>
          <select 
            v-model="selectedPartnerBranch" 
            class="form-select font-bold text-base" 
            style="min-width: 220px; border: 1.5px solid var(--border-color); border-radius: var(--radius-md); padding: 8px 14px;"
          >
            <option v-for="b in retailBranches" :key="b.id" :value="b.id">
              {{ b.name }}
            </option>
          </select>
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
                        class="btn btn-xs btn-outline-primary mt-xs w-full"
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
                  class="btn btn-sm btn-primary"
                  @click="openPayoutModal()"
                >
                  <i class="fa-solid fa-paper-plane mr-1"></i> จ่ายปันผล
                </button>
              </div>

              <!-- Payouts List: Clean unboxed list -->
              <div v-if="!settlementData.payouts || settlementData.payouts.length === 0" class="text-center p-xl text-secondary">
                <i class="fa-solid fa-receipt mb-sm" style="font-size: 2rem; color: var(--text-tertiary); opacity: 0.5;"></i>
                <div class="text-xs">ยังไม่มีประวัติการจ่ายเงินปันผลของสาขานี้</div>
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
            {{ editingItem ? 'แก้ไขรายการของในครัวกลาง' : 'เพิ่มของใหม่ด้วยตนเอง' }}
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
      <div class="modal-content modal-center w-full max-w-sm" style="position:relative; z-index:2; overflow-y:auto; max-height:85dvh;">
        <div class="modal-header">
          <h3>
            <i class="fa-solid fa-circle-plus text-success" style="margin-right: 6px;"></i>
            เติมสต็อกด่วน
          </h3>
          <button class="modal-close" @click="showRestockModal = false">✕</button>
        </div>

        <div class="modal-body">
          <div class="p-sm rounded mb-md text-sm" style="border: 1px solid var(--border-color); background: var(--bg-secondary);">
            สินค้า: <strong>{{ activeRestockItem?.name }}</strong><br />
            <span class="text-xs text-secondary">สต็อกปัจจุบัน: {{ activeRestockItem?.quantity }} {{ activeRestockItem?.unit }}</span>
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

          <div class="p-md rounded mb-lg flex flex-between align-center" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            <span class="text-xs text-secondary font-bold">ยอดเงินรวมที่จ่ายซื้อ:</span>
            <span class="font-bold text-xl text-primary">
              ฿{{ formatNumber((restockForm.quantity_added || 0) * (restockForm.unit_cost || 0)) }}
            </span>
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
      <div class="modal-content modal-center w-full max-w-sm" style="position:relative; z-index:2; overflow-y:auto; max-height:85dvh;">
        <div class="modal-header">
          <h3>
            <i :class="transactionForm.type === 'capital_in' ? 'fa-solid fa-circle-plus text-success' : 'fa-solid fa-circle-minus text-danger'" style="margin-right: 6px;"></i>
            {{ transactionForm.type === 'capital_in' ? 'เติมเงินทุนกองกลาง (ทุนเจ้าของ)' : 'จ่ายค่าใช้จ่ายครัวกลาง' }}
          </h3>
          <button class="modal-close" @click="showTransactionModal = false">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-group mb-md">
            <label class="form-label font-bold text-sm">ประเภทรายการ *</label>
            <select v-model="transactionForm.type" class="form-select w-full font-bold">
              <option value="capital_in">🟢 เติมเงินทุนกองกลาง (เงินเข้ากระเป๋า)</option>
              <option value="operating_expense_out">🔴 ค่าใช้จ่ายครัวกลาง (เงินออกจากกระเป๋า เช่น ค่าไฟ/ค่าเช่า/ค่าจ้าง)</option>
            </select>
          </div>

          <div class="form-group mb-md">
            <label class="form-label font-bold text-sm">จำนวนเงิน (บาท) *</label>
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
      <div class="modal-content modal-center w-full max-w-sm" style="position:relative; z-index:2; overflow-y:auto; max-height:85dvh;">
        <div class="modal-header">
          <h3>
            <i class="fa-solid fa-trash-can text-danger" style="margin-right: 6px;"></i>
            ตัดของเสีย / หมดอายุ
          </h3>
          <button class="modal-close" @click="showWasteModal = false">✕</button>
        </div>

        <div class="modal-body">
          <div class="p-sm rounded mb-md text-sm" style="border: 1px solid var(--border-color); background: var(--bg-secondary);">
            สินค้า: <strong>{{ activeWasteItem?.name }}</strong><br />
            <span class="text-xs text-secondary">คงเหลือในครัวกลาง: {{ activeWasteItem?.quantity }} {{ activeWasteItem?.unit }}</span>
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

          <div class="p-md rounded mb-lg flex flex-between align-center" style="background: rgba(173, 40, 30, 0.05); border: 1px solid rgba(173, 40, 30, 0.2); border-radius: var(--radius-md);">
            <span class="text-xs text-danger font-bold">มูลค่าความเสียหาย:</span>
            <span class="font-bold text-xl text-danger">
              ฿{{ formatNumber((wasteForm.quantity_wasted || 0) * (activeWasteItem?.cost_price || 0)) }}
            </span>
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
      <div class="modal-content modal-center w-full max-w-sm" style="position:relative; z-index:2; overflow-y:auto; max-height:85dvh;">
        <div class="modal-header">
          <h3>
            <i class="fa-solid fa-money-bill-wave text-primary" style="margin-right: 6px;"></i>
            บันทึกจ่ายเงินปันผลจริง
          </h3>
          <button class="modal-close" @click="showPayoutModal = false">✕</button>
        </div>

        <div class="modal-body">
          <div class="p-sm rounded mb-md text-sm" style="border: 1px solid var(--border-color); background: var(--bg-secondary);">
            สาขา: <strong>{{ settlementData?.branch_name }}</strong><br />
            ผู้รับปันผล: <strong>{{ payoutForm.partner_name || 'ระบุชื่อด้านล่าง' }}</strong> <span v-if="payoutForm.share_percentage">({{ payoutForm.share_percentage }}%)</span>
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
            <label class="form-label font-bold text-sm">ยอดเงินปันผลที่จ่ายจริง (บาท) *</label>
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
              {{ isSubmittingPayout ? 'กำลังบันทึก...' : 'บันทึกจ่ายเงินปันผล' }}
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

// Modals: Transaction (Finance)
const showTransactionModal = ref(false);
const isSavingTransaction = ref(false);
const transactionForm = ref({
  type: 'capital_in',
  amount: 0,
  note: ''
});

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
    'pending': '🟡 รอจัดส่ง',
    'dispatched': '🔵 กำลังจัดส่ง',
    'received': '🟢 รับของแล้ว',
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
    'capital_in': '🟢 เติมเงินทุน',
    'reimbursement_in': '🔵 สาขาคืนเงิน',
    'purchase_out': '🟠 ซื้อของเข้าคลัง',
    'operating_expense_out': '🔴 ค่าใช้จ่ายครัวกลาง'
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
  await loadBranches();
  loadItems();
  loadOrders();
  loadHistory();
  loadFinances();
});

onUnmounted(() => {
  window.removeEventListener('click', closeCategoryModalDropdown);
  window.removeEventListener('click', closeUomModalDropdown);
});
</script>

<style scoped>
.central-kitchen-view {
  width: 100%;
}

.toolbar-card {
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
  background: var(--card-bg);
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  pointer-events: none;
}

.category-count-badge {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 999px;
  font-size: 0.7rem;
  padding: 1px 5px;
  margin-left: 4px;
}

.grid-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-md);
}

.item-card {
  transition: transform var(--transition-base), box-shadow var(--transition-base);
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.item-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-color-focus);
}

.item-img-container {
  height: 140px;
  background: var(--bg-secondary);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--border-color);
}

.item-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-img-placeholder {
  font-size: 2.8rem;
  opacity: 0.35;
  color: var(--text-tertiary);
}

.category-tag {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 0.7rem;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  color: white;
  padding: 2px 7px;
  border-radius: var(--radius-sm);
  font-weight: 500;
}

.status-pill {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 0.7rem;
  padding: 2px 7px;
  border-radius: var(--radius-sm);
  font-weight: bold;
}

.status-low {
  background: #ffab2b;
  color: #3d1b11;
}

.status-out {
  background: #ad281e;
  color: white;
}

.item-name {
  font-size: 1.05rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
}

.stock-display-pill {
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
}

.stock-pill-ok {
  background: rgba(42, 157, 143, 0.08);
  color: var(--success);
}

.stock-pill-low {
  background: rgba(173, 40, 30, 0.08);
  color: var(--danger);
}

/* Order Cards */
.order-card {
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  border-radius: var(--radius-md);
  transition: box-shadow var(--transition-base);
}

.order-card-pending {
  border-left: 5px solid var(--accent);
}

.order-card-dispatched {
  border-left: 5px solid var(--primary);
}

.order-no-pill {
  font-size: 1.05rem;
  color: var(--primary);
  background: rgba(139, 3, 19, 0.06);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

/* Feed Timeline Cards */
.history-feed-card {
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
}

.border-restock-feed {
  border-left: 5px solid var(--success) !important;
}

.border-transfer-feed {
  border-left: 5px solid var(--primary) !important;
}

.feed-icon-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.bg-success-light {
  background: rgba(42, 157, 143, 0.12);
}

.bg-danger-light {
  background: rgba(173, 40, 30, 0.1);
}

.bg-card-alt {
  background: rgba(139, 3, 19, 0.03);
  border: 1px solid var(--border-color);
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

@media (max-width: 900px) {
  .financial-summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 576px) {
  .financial-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
