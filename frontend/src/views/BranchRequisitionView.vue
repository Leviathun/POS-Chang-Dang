<template>
  <div class="branch-requisition-view page-enter">
    
    <!-- Top Action Toolbar Card -->
    <div class="card mb-lg p-md flex flex-between align-center toolbar-card" style="gap: var(--space-md); flex-wrap: wrap;">
      <div>
        <h3 class="font-bold text-base mb-xs flex align-center gap-xs">
          <i class="fa-solid fa-boxes-packing text-primary"></i>
          <span>ระบบขอเบิกของจากครัวกลาง</span>
        </h3>
        <p class="text-secondary text-xs">
          เลือกรายการของที่ต้องการจากคลังส่วนกลาง เมื่อได้รับของแล้วยอดเงินจะถูกบันทึกเป็นต้นทุนของสาขาอัตโนมัติ
        </p>
      </div>

      <!-- Tab Switcher (44px Touch Buttons) - No Parentheses in 'เลือกของเบิก' -->
      <div class="requisition-tabs flex gap-xs align-center">
        <button 
          class="requisition-tab-btn" 
          :class="{ active: currentTab === 'shop' }"
          @click="currentTab = 'shop'"
        >
          <i class="fa-solid fa-cart-plus mr-1"></i>
          <span>เลือกของเบิก</span>
        </button>
        <button 
          class="requisition-tab-btn relative" 
          :class="{ active: currentTab === 'my_orders' }"
          @click="currentTab = 'my_orders'"
        >
          <i class="fa-solid fa-receipt mr-1"></i>
          <span>รายการที่ขอเบิก</span>
          <span v-if="dispatchedCount > 0" class="badge-count animate-pulse">{{ dispatchedCount }}</span>
        </button>
      </div>
    </div>

    <!-- ────────────────────────────────────────────────────────── -->
    <!-- TAB 1: SHOP CATALOG (เลือกของใส่ตะกร้าเหมือนหน้าขาย POS) -->
    <!-- ────────────────────────────────────────────────────────── -->
    <div v-if="currentTab === 'shop'" class="catalog-layout">
      <!-- Left Column: Items Catalog -->
      <div class="catalog-main">
        <!-- Search and Filter Bar: Search 1 Full Row, Filters Below (Requirement 2) -->
        <div class="card p-md mb-md toolbar-card filter-bar">
          <!-- Top Row: Full Width Search Input (100%) -->
          <div class="search-input-box mb-md" style="position: relative; width: 100%;">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="ค้นหา เช่น ซอส, ถุง, กระทะ, กล่อง..." 
              class="form-input search-input"
              style="padding-left: 42px; width: 100%; border-radius: var(--radius-md); font-size: var(--font-base);"
            />
            <button 
              v-if="searchQuery" 
              class="search-clear-btn" 
              @click="searchQuery = ''"
              title="ล้างคำค้นหา"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Bottom Row: Filter Pills -->
          <div class="category-tabs flex gap-xs align-center overflow-x-auto" style="border-bottom: none !important; margin-bottom: 0 !important; padding-bottom: 0 !important;">
            <button 
              v-for="cat in categories" 
              :key="cat.id" 
              class="category-tab"
              :class="{ active: selectedCategory === cat.id }"
              @click="selectedCategory = cat.id"
            >
              <i :class="cat.icon" style="margin-right: 4px;"></i>
              <span>{{ cat.label }}</span>
              <span v-if="getCategoryCount(cat.id) > 0" class="category-count">
                ({{ getCategoryCount(cat.id) }})
              </span>
            </button>
          </div>
        </div>

        <!-- Items Cards Grid Loading (Warm Brand Shimmer Skeletons) -->
        <div v-if="isLoadingItems" class="grid-cards">
          <div v-for="i in 8" :key="i" class="card item-card p-md" style="pointer-events: none;">
            <!-- Top badges skeleton -->
            <div class="flex flex-between align-center mb-sm">
              <div class="skeleton" style="width: 80px; height: 22px; border-radius: var(--radius-full);"></div>
              <div class="skeleton" style="width: 24px; height: 24px; border-radius: var(--radius-full);"></div>
            </div>
            <!-- Image placeholder skeleton -->
            <div class="skeleton mb-md" style="height: 135px; width: 100%; border-radius: var(--radius-md);"></div>
            <!-- Title skeleton -->
            <div class="skeleton mb-xs" style="width: 85%; height: 18px;"></div>
            <div class="skeleton mb-sm" style="width: 50%; height: 14px;"></div>
            <!-- Price & stock skeleton -->
            <div class="flex flex-between align-center mb-md">
              <div class="skeleton" style="width: 90px; height: 20px;"></div>
              <div class="skeleton" style="width: 70px; height: 16px;"></div>
            </div>
            <!-- Button skeleton -->
            <div class="skeleton" style="width: 100%; height: 42px; border-radius: var(--radius-md);"></div>
          </div>
        </div>

        <!-- Empty State (Unified .empty-state-box) -->
        <div v-else-if="filteredItems.length === 0" class="empty-state-box">
          <div class="empty-state-icon">
            <i class="fa-solid fa-box-open"></i>
          </div>
          <div class="empty-state-title">ไม่พบรายการของ</div>
          <div class="empty-state-desc">ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น</div>
        </div>

        <!-- Items Cards Grid: Exact Design from Central Kitchen Catalog -->
        <div v-else class="grid-cards">
          <div 
            v-for="item in filteredItems" 
            :key="item.id" 
            class="card p-md item-card"
            :class="{ 
              'low-stock': item.quantity <= (item.min_stock_alert || 5),
              'item-out-of-stock': item.quantity <= 0,
              'in-cart': getCartQty(item.id) > 0
            }"
            @click="addToCart(item)"
          >
            <!-- Floating Quantity Badge (เหมือนหน้าขาย POS บนมือถือ) -->
            <span v-if="getCartQty(item.id) > 0" class="qty-badge">
              {{ getCartQty(item.id) }}
            </span>

            <!-- 1. TOP: ประเภท กับ พร้อมจ่าย (ใช้เฉพาะไอคอนประหยัดพื้นที่ ไม่เบียด) -->
            <div class="card-top-badges flex flex-between align-center">
              <span class="badge badge-neutral card-badge-category">
                <i :class="getCategoryIcon(item.category)" class="mr-1"></i>
                {{ getCategoryLabel(item.category) }}
              </span>
              <span v-if="item.quantity <= 0" class="badge badge-danger card-badge-status" title="ของหมดสต็อก">
                <i class="fa-solid fa-xmark"></i>
              </span>
              <span v-else-if="item.quantity <= (item.min_stock_alert || 5)" class="badge badge-warning card-badge-status" title="ใกล้หมด">
                <i class="fa-solid fa-triangle-exclamation"></i>
              </span>
              <span v-else class="badge badge-success card-badge-status" title="พร้อมจ่าย">
                <i class="fa-solid fa-check"></i>
              </span>
            </div>

            <!-- 2. รูปภาพสินค้า (มี Margin ชัดเจน ไม่ชิดกับองค์ประกอบอื่น พร้อมพื้นหลัง Soft Cream Gradient) -->
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
                    'text-warning': item.quantity > 0 && item.quantity <= (item.min_stock_alert || 5),
                    'text-success': item.quantity > (item.min_stock_alert || 5)
                  }"
                  style="font-size: 1rem;"
                >
                  <span class="stock-prefix">เหลือ </span>{{ formatNumber(item.quantity) }} {{ item.unit }}
                </span>
              </div>
            </div>

            <!-- 5. ปุ่มแอ็กชัน (เต็มความกว้างซ้าย-ขวา เท่ารูปภาพ) -->
            <div class="card-footer-actions">
              <button 
                class="btn-action btn-action-primary w-full btn-restock-main" 
                :disabled="item.quantity <= 0"
                @click.stop="addToCart(item)"
              >
                <i class="fa-solid fa-plus-circle"></i>
                <span>{{ item.quantity > 0 ? 'เพิ่มลงรายการเบิก' : 'ของหมดสต็อก' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Requisition Cart Panel -->
      <div ref="cartSidebarRef" class="card p-md cart-sidebar flex flex-col justify-between">
        <div>
          <!-- Cart Header -->
          <div class="flex flex-between align-center mb-md pb-sm cart-header">
            <h4 class="font-bold text-base flex align-center gap-xs">
              <i class="fa-solid fa-cart-shopping text-primary"></i>
              <span>รายการที่ขอเบิก</span>
              <span v-if="cart.length > 0" class="badge badge-primary font-bold">{{ cart.length }}</span>
            </h4>
            <button 
              v-if="cart.length > 0" 
              class="text-xs text-danger font-bold cursor-pointer clear-cart-btn flex align-center gap-xs"
              @click="clearCart"
            >
              <i class="fa-solid fa-trash-can"></i>
              <span>ล้างทั้งหมด</span>
            </button>
          </div>

          <!-- Empty Cart State (Unified Compact Empty Box) -->
          <div v-if="cart.length === 0" class="empty-state-box empty-state-compact">
            <div class="empty-state-icon empty-state-icon-sm">
              <i class="fa-solid fa-basket-shopping"></i>
            </div>
            <div class="empty-state-title text-sm">ยังไม่มีรายการของในตะกร้า</div>
            <div class="empty-state-desc text-xs">คลิกที่การ์ดสินค้าทางซ้ายเพื่อเพิ่มจำนวนลงรายการเบิก</div>
          </div>

          <!-- Cart Items List: Spacious 2-Tier Cards (ไม่ล้น ไม่หลุดกรอบ รองรับชื่อ 2 บรรทัด) -->
          <div v-else class="cart-items-list flex flex-col gap-sm">
            <div 
              v-for="c in cart" 
              :key="c.item_id" 
              class="cart-row p-sm flex flex-col justify-between"
            >
              <!-- Tier 1: Item Name (2 Lines) + Subtotal on top right -->
              <div class="flex flex-between align-start gap-xs mb-xs">
                <div class="flex-1 min-w-0 pr-xs">
                  <div class="cart-item-name font-bold text-sm text-primary">
                    {{ getItemNameParts(c.item_name).main }}
                  </div>
                  <div v-if="getItemNameParts(c.item_name).sub" class="cart-item-sub text-xs text-secondary mt-1">
                    {{ getItemNameParts(c.item_name).sub }}
                  </div>
                </div>
                <!-- Subtotal on top right (bold, prominent) -->
                <div class="text-right flex-shrink-0 pl-xs">
                  <span class="font-bold text-sm text-primary">฿{{ formatNumber(c.quantity * c.cost_price) }}</span>
                </div>
              </div>

              <!-- Tier 2: Unit price on left + Quantity Stepper on right -->
              <div class="flex flex-between align-center pt-xs cart-item-bottom">
                <span class="text-xs text-secondary">
                  ฿{{ formatNumber(c.cost_price) }} / {{ c.unit }}
                </span>

                <!-- Qty Stepper (32px Circle Buttons) -->
                <div class="flex align-center gap-xs flex-shrink-0">
                  <button class="btn-qty" @click="decreaseQty(c)" title="ลดจำนวน">-</button>
                  <span class="font-bold text-sm text-center qty-display">{{ c.quantity }}</span>
                  <button class="btn-qty" @click="increaseQty(c)" title="เพิ่มจำนวน">+</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Cart Summary & Submit Footer -->
        <div class="cart-footer pt-md mt-md">
          <div class="form-group mb-md">
            <label class="form-label text-xs font-bold text-secondary mb-xs block">
              <i class="fa-solid fa-pen-to-square mr-1"></i> บันทึก/เหตุผลในการเบิก (ถ้ามี):
            </label>
            <input 
              type="text" 
              v-model="cartNote" 
              placeholder="เช่น ของใกล้หมดสต็อก, เตรียมรับรอบเย็น" 
              class="form-input text-sm w-full"
            />
          </div>

          <!-- Unboxed Total Cost (Rule: No boxed background color behind text/numbers) -->
          <div class="cart-total-row flex flex-between align-baseline mb-md pt-sm">
            <span class="text-sm font-bold text-secondary">มูลค่าต้นทุนรวม:</span>
            <span class="text-2xl font-bold text-primary">฿{{ formatNumber(totalCartCost) }}</span>
          </div>

          <!-- 48px Submit Button -->
          <button 
            class="btn btn-primary btn-submit-requisition w-full"
            :disabled="cart.length === 0 || isSubmitting"
            @click="submitRequisition"
          >
            <i class="fa-solid fa-paper-plane mr-2"></i>
            <span>{{ isSubmitting ? 'กำลังส่งคำขอ...' : 'ยื่นคำขอเบิกของจากครัวกลาง' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile-only Docked Cart Bar (เหมือนหน้าขาย POS บนมือถือ) -->
    <div 
      v-if="currentTab === 'shop' && cart.length > 0 && !isCartDrawerOpen" 
      class="cart-bar mobile-only-cart"
    >
      <div class="cart-bar-inner">
        <div class="cart-info" style="cursor: pointer;" @click="isCartDrawerOpen = true">
          <span class="cart-count">{{ totalCartQty }} รายการ</span>
          <span class="cart-total">฿{{ formatNumber(totalCartCost) }}</span>
        </div>
        <button 
          class="cart-pay-btn flex align-center justify-center gap-xs" 
          @click="isCartDrawerOpen = true"
        >
          <i class="fa-solid fa-cart-shopping"></i>
          <span>ดูรายการเบิก</span>
        </button>
      </div>
    </div>

    <!-- Mobile-only Slide-up Cart Drawer Overlay & Panel (Bottom Sheet) -->
    <div 
      v-if="currentTab === 'shop' && cart.length > 0 && isCartDrawerOpen" 
      class="cart-drawer-overlay mobile-only-cart"
      @click="isCartDrawerOpen = false"
    ></div>

    <div 
      v-if="currentTab === 'shop' && cart.length > 0" 
      class="cart-detail-panel mobile-only-cart"
      :class="{ 'hidden': !isCartDrawerOpen }"
    >
      <!-- Drawer Header -->
      <div class="cart-detail-header">
        <span class="font-bold text-base flex align-center gap-xs">
          <i class="fa-solid fa-cart-shopping text-primary"></i>
          <span>รายการที่ขอเบิก</span>
          <span class="badge badge-primary font-bold">{{ totalCartQty }}</span>
        </span>
        <div class="flex align-center gap-sm">
          <button class="btn btn-ghost btn-sm text-danger" @click="clearCart">ล้างทั้งหมด</button>
          <button class="modal-close" @click="isCartDrawerOpen = false">✕</button>
        </div>
      </div>

      <!-- Drawer Scrollable Content (Only Items & Notes Scroll!) -->
      <div class="cart-drawer-scroll-body flex flex-col gap-md">
        <!-- Cart Items List: Spacious 2-Tier Cards -->
        <div class="cart-items-list flex flex-col gap-sm">
          <div 
            v-for="c in cart" 
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
              </div>
              <div class="text-right flex-shrink-0 pl-xs">
                <span class="font-bold text-sm text-primary">฿{{ formatNumber(c.quantity * c.cost_price) }}</span>
              </div>
            </div>

            <!-- Tier 2: Unit price + Stepper -->
            <div class="flex flex-between align-center pt-xs cart-item-bottom">
              <span class="text-xs text-secondary">
                ฿{{ formatNumber(c.cost_price) }} / {{ c.unit }}
              </span>
              <div class="flex align-center gap-xs flex-shrink-0">
                <button class="btn-qty" @click="decreaseQty(c)" title="ลดจำนวน">-</button>
                <span class="font-bold text-sm text-center qty-display">{{ c.quantity }}</span>
                <button class="btn-qty" @click="increaseQty(c)" title="เพิ่มจำนวน">+</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Notes Field -->
        <div class="form-group">
          <label class="form-label text-xs font-bold text-secondary mb-xs block">
            <i class="fa-solid fa-pen-to-square mr-1"></i> บันทึก/เหตุผลในการเบิก (ถ้ามี):
          </label>
          <input 
            type="text" 
            v-model="cartNote" 
            placeholder="เช่น ของใกล้หมดสต็อก, เตรียมรับรอบเย็น" 
            class="form-input text-sm w-full"
          />
        </div>
      </div>

      <!-- Drawer Fixed Footer (Always visible, perfectly padded, never cut off!) -->
      <div class="cart-drawer-footer">
        <!-- Unboxed Total Cost -->
        <div class="cart-total-row flex flex-between align-baseline mb-sm">
          <span class="text-sm font-bold text-secondary">มูลค่าต้นทุนรวม:</span>
          <span class="text-2xl font-bold text-primary">฿{{ formatNumber(totalCartCost) }}</span>
        </div>

        <!-- 48px Submit Button -->
        <button 
          class="btn btn-primary btn-submit-requisition w-full"
          :disabled="cart.length === 0 || isSubmitting"
          @click="submitRequisition"
        >
          <i class="fa-solid fa-paper-plane mr-2"></i>
          <span>{{ isSubmitting ? 'กำลังส่งคำขอ...' : 'ยื่นคำขอเบิกของจากครัวกลาง' }}</span>
        </button>
      </div>
    </div>

    <!-- ────────────────────────────────────────────────────────── -->
    <!-- TAB 2: MY ORDERS (ติดตามสถานะ & กดยืนยันรับของ) -->
    <!-- Exact Design from Central Kitchen Orders Tab (Requirement 4) -->
    <!-- ────────────────────────────────────────────────────────── -->
    <div v-if="currentTab === 'my_orders'" class="my-orders-layout">
      <div class="flex flex-between align-center mb-md">
        <h4 class="font-bold text-base flex align-center gap-xs">
          <i class="fa-solid fa-clock-rotate-left text-primary"></i>
          <span>รายการเบิกของของสาขาคุณ</span>
        </h4>
        <button class="btn btn-secondary btn-sm flex align-center gap-xs" @click="loadMyTransfers">
          <i class="fa-solid fa-rotate-right"></i>
          <span>รีเฟรช</span>
        </button>
      </div>

      <!-- Skeleton Loading for Orders -->
      <div v-if="isLoadingOrders" class="orders-list flex flex-col gap-md">
        <div v-for="i in 3" :key="i" class="card p-lg order-card" style="pointer-events: none;">
          <div class="flex flex-between align-center mb-md pb-md border-b">
            <div class="flex align-center gap-sm">
              <div class="skeleton" style="width: 140px; height: 24px; border-radius: var(--radius-sm);"></div>
              <div class="skeleton" style="width: 90px; height: 24px; border-radius: var(--radius-full);"></div>
            </div>
            <div class="skeleton" style="width: 110px; height: 32px; border-radius: var(--radius-sm);"></div>
          </div>
          <div class="skeleton mb-md" style="width: 260px; height: 16px; border-radius: var(--radius-xs);"></div>
          <div class="order-items-table-wrapper mb-md">
            <div class="skeleton mb-xs" style="width: 100%; height: 38px;"></div>
            <div class="skeleton mb-xs" style="width: 100%; height: 44px;"></div>
            <div class="skeleton" style="width: 100%; height: 44px;"></div>
          </div>
          <div class="flex flex-between align-center pt-xs flex-wrap gap-md">
            <div class="skeleton" style="width: 220px; height: 18px; border-radius: var(--radius-xs);"></div>
            <div class="skeleton" style="width: 180px; height: 46px; border-radius: var(--radius-md);"></div>
          </div>
        </div>
      </div>

      <!-- Empty Orders State -->
      <div v-else-if="myTransfers.length === 0" class="empty-state-box">
        <div class="empty-state-icon">
          <i class="fa-solid fa-file-invoice"></i>
        </div>
        <div class="empty-state-title">สาขายังไม่มีประวัติการขอเบิกของ</div>
        <div class="empty-state-desc mb-md">คลิกแท็บ "เลือกของเบิก" ด้านบนเพื่อเริ่มยื่นคำขอเบิกชิ้นแรก</div>
        <button class="btn btn-primary btn-md flex align-center gap-xs" @click="currentTab = 'shop'">
          <i class="fa-solid fa-cart-plus"></i>
          <span>ไปที่หน้าเลือกของเบิก</span>
        </button>
      </div>

      <!-- Orders List Cards (Exact Design from Central Kitchen Orders Tab) -->
      <div v-else class="orders-list flex flex-col gap-md">
        <div 
          v-for="t in myTransfers" 
          :key="t.id" 
          class="card p-lg order-card"
          :class="{ 
            'order-card-pending': t.status === 'pending', 
            'order-card-dispatched': t.status === 'dispatched',
            'order-card-received': t.status === 'received' 
          }"
        >
          <!-- Order Card Header -->
          <div class="order-card-header flex flex-between align-center flex-wrap gap-md mb-md pb-md">
            <div class="flex align-center gap-sm flex-wrap">
              <span class="order-no-title font-bold">
                <i class="fa-solid fa-receipt text-primary"></i>
                <span>#{{ t.transfer_no }}</span>
              </span>
              <span v-if="t.branch_name" class="badge badge-primary font-bold">
                <i class="fa-solid fa-store"></i>
                <span>{{ t.branch_name }}</span>
              </span>
              <span class="badge font-bold" :class="getStatusBadgeClass(t.status)">
                <i v-if="t.status === 'pending'" class="fa-solid fa-hourglass-start"></i>
                <i v-else-if="t.status === 'dispatched'" class="fa-solid fa-truck-fast"></i>
                <i v-else-if="t.status === 'received'" class="fa-solid fa-circle-check"></i>
                <span>{{ getStatusLabel(t.status) }}</span>
              </span>
            </div>

            <div class="order-total-header">
              <span class="order-total-label">ยอดต้นทุนตัดเข้าสาขา:</span>
              <span class="order-total-amount font-bold text-primary">฿{{ formatNumber(t.total_cost) }}</span>
            </div>
          </div>

          <!-- Order Metadata Info -->
          <div class="order-meta-row flex flex-between align-center text-xs text-secondary mb-md flex-wrap gap-sm">
            <div class="flex align-center gap-md flex-wrap">
              <span>
                <i class="fa-regular fa-user mr-1 text-muted"></i> ผู้ขอเบิก: <strong class="text-main">{{ t.requested_by_name || 'พนักงาน' }}</strong>
              </span>
              <span>
                <i class="fa-regular fa-clock mr-1 text-muted"></i> ยื่นคำขอเมื่อ: <span class="text-main">{{ formatDateTime(t.created_at) }}</span>
              </span>
            </div>
            <div v-if="t.dispatched_at" class="order-meta-dispatched">
              <i class="fa-solid fa-truck-fast mr-1 text-info"></i> จัดส่งเมื่อ: <span class="text-main">{{ formatDateTime(t.dispatched_at) }}</span> <span class="text-muted">(โดย {{ t.dispatched_by_name || 'ครัวกลาง' }})</span>
            </div>
          </div>

          <!-- Items Clean Table Container -->
          <div class="order-items-container mb-md">
            <div class="order-items-title flex flex-between align-center mb-xs">
              <span class="text-xs font-bold text-secondary">
                <i class="fa-solid fa-boxes-stacked mr-1 text-primary"></i> รายการของที่ขอเบิก ({{ t.items ? t.items.length : 0 }} รายการ)
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
                  <tr v-for="it in t.items" :key="it.id">
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
                v-for="it in t.items" 
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
                <div class="flex flex-between align-center pt-xs mt-xs order-mobile-item-bottom">
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
            <div v-if="t.notes" class="order-notes-box mt-sm p-sm rounded flex align-center gap-xs">
              <i class="fa-solid fa-comment-dots text-primary"></i>
              <span class="text-xs text-secondary"><strong>บันทึกจากสาขา:</strong> {{ t.notes }}</span>
            </div>
          </div>

          <!-- Order Card Footer Action -->
          <div class="order-card-footer flex flex-between align-center flex-wrap gap-md pt-sm">
            <div class="order-footer-notice text-xs">
              <span v-if="t.status === 'pending'" class="text-warning font-bold flex align-center gap-xs">
                <i class="fa-solid fa-hourglass-start"></i> รอครัวกลางจัดเตรียมของและกดส่ง
              </span>
              <span v-else-if="t.status === 'dispatched'" class="text-info font-bold flex align-center gap-xs">
                <i class="fa-solid fa-truck-fast"></i> ของส่งออกจากครัวกลางแล้ว กรุณาตรวจนับของจริงก่อนกดยืนยันรับ
              </span>
              <span v-else-if="t.status === 'received'" class="text-success font-bold flex align-center gap-xs">
                <i class="fa-solid fa-circle-check"></i> รับของเรียบร้อย (บันทึกเป็น Expense สาขาแล้ว)
              </span>
            </div>

            <div class="order-footer-actions">
              <button 
                v-if="t.status === 'dispatched'" 
                class="btn btn-primary btn-dispatch-order"
                @click="confirmReceive(t)"
              >
                <i class="fa-solid fa-box-open mr-2"></i>
                <span>ตรวจของครบ & กดยืนยันรับของ</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import api from '../api';
import { ui } from '../helpers';

const currentTab = ref('shop'); // 'shop' | 'my_orders'

watch(currentTab, (newTab) => {
  if (newTab === 'my_orders') {
    loadMyTransfers();
  } else if (newTab === 'shop') {
    loadItems();
  }
});

const items = ref([]);
const cart = ref([]);
const cartNote = ref('');
const myTransfers = ref([]);

const isLoadingItems = ref(true);
const isLoadingOrders = ref(false);
const isSubmitting = ref(false);

const searchQuery = ref('');
const selectedCategory = ref('all');

const categories = [
  { id: 'all', label: 'ทั้งหมด', icon: 'fa-solid fa-list' },
  { id: 'raw_material', label: 'วัตถุดิบ/อาหาร', icon: 'fa-solid fa-drumstick-bite' },
  { id: 'packaging', label: 'บรรจุภัณฑ์', icon: 'fa-solid fa-box-open' },
  { id: 'equipment', label: 'อุปกรณ์', icon: 'fa-solid fa-kitchen-set' }
];

const getCategoryCount = (catId) => {
  if (catId === 'all') return items.value.length;
  return items.value.filter(i => i.category === catId).length;
};

const getItemNameParts = (name) => {
  if (!name) return { main: '', sub: '' };
  const match = name.match(/^(.*?)\s*(\([^(]+\))\s*$/);
  if (match) {
    return { main: match[1].trim(), sub: match[2].trim() };
  }
  return { main: name, sub: '' };
};

const dispatchedCount = computed(() => {
  return myTransfers.value.filter(t => t.status === 'dispatched').length;
});

const filteredItems = computed(() => {
  return items.value.filter(item => {
    const matchCat = selectedCategory.value === 'all' || item.category === selectedCategory.value;
    const matchSearch = !searchQuery.value || item.name.toLowerCase().includes(searchQuery.value.toLowerCase());
    return matchCat && matchSearch;
  });
});

const totalCartCost = computed(() => {
  return cart.value.reduce((sum, c) => sum + (c.quantity * c.cost_price), 0);
});

const totalCartQty = computed(() => {
  return cart.value.reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
});

const isCartDrawerOpen = ref(false);

const getCartQty = (itemId) => {
  const found = cart.value.find(c => c.item_id === itemId);
  return found ? found.quantity : 0;
};

watch(cart, (newCart) => {
  const hasItems = newCart.length > 0;
  window.dispatchEvent(new CustomEvent('cart-state-change', {
    detail: { hasItems }
  }));
  if (!hasItems) {
    isCartDrawerOpen.value = false;
  }
}, { deep: true });

onUnmounted(() => {
  window.dispatchEvent(new CustomEvent('cart-state-change', {
    detail: { hasItems: false }
  }));
});

const cartSidebarRef = ref(null);
const scrollToCart = () => {
  if (cartSidebarRef.value) {
    cartSidebarRef.value.scrollIntoView({ behavior: 'smooth' });
  } else {
    document.querySelector('.cart-sidebar')?.scrollIntoView({ behavior: 'smooth' });
  }
};

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
    'raw_material': 'วัตถุดิบ',
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
    'pending': 'รอจัดส่ง',
    'dispatched': 'กำลังจัดส่ง',
    'received': 'ส่งสำเร็จ',
    'cancelled': 'ยกเลิกแล้ว'
  };
  return map[st] || st;
};

// Cart Actions
const addToCart = (item) => {
  if (item.quantity <= 0) {
    ui.showToast('สินค้าชิ้นนี้หมดสต็อกในครัวกลาง', 'warning');
    return;
  }
  const existing = cart.value.find(c => c.item_id === item.id);
  if (existing) {
    if (existing.quantity >= item.quantity) {
      ui.showToast(`สามารถเบิกได้สูงสุด ${formatNumber(item.quantity)} ${item.unit} ตามสต็อกครัวกลาง`, 'warning');
      return;
    }
    existing.quantity += 1;
  } else {
    cart.value.push({
      item_id: item.id,
      item_name: item.name,
      unit: item.unit,
      cost_price: item.cost_price,
      max_quantity: item.quantity,
      quantity: 1
    });
  }
};

const increaseQty = (c) => {
  const originalItem = items.value.find(i => i.id === c.item_id);
  const maxQty = originalItem ? originalItem.quantity : c.max_quantity;
  if (maxQty && c.quantity >= maxQty) {
    ui.showToast(`สามารถเบิกได้สูงสุด ${formatNumber(maxQty)} ${c.unit} ตามสต็อกครัวกลาง`, 'warning');
    return;
  }
  c.quantity += 1;
};

const decreaseQty = (c) => {
  if (c.quantity > 1) {
    c.quantity -= 1;
  } else {
    cart.value = cart.value.filter(x => x.item_id !== c.item_id);
  }
};

const clearCart = () => {
  cart.value = [];
  cartNote.value = '';
};

// Submit Requisition
const submitRequisition = async () => {
  if (cart.value.length === 0) return;

  const ok = await ui.showConfirm(
    'ยืนยันขอเบิกของ',
    `คุณต้องการยื่นคำขอเบิก ${cart.value.length} รายการ รวมมูลค่า ฿${formatNumber(totalCartCost.value)} ใช่หรือไม่?`
  );
  if (!ok) return;

  isSubmitting.value = true;
  ui.showLoading();
  try {
    const res = await api.centralKitchen.createTransfer({
      items: cart.value,
      notes: cartNote.value
    });
    if (res.success) {
      ui.showToast('ยื่นคำขอเบิกของเรียบร้อยแล้ว รอครัวกลางจัดส่ง', 'success');
      clearCart();
      currentTab.value = 'my_orders';
      loadMyTransfers();
    }
  } catch (err) {
    ui.showToast(err.message, 'error');
  } finally {
    isSubmitting.value = false;
    ui.hideLoading();
  }
};

// Confirm Receive
const confirmReceive = async (transfer) => {
  const ok = await ui.showConfirm(
    'ยืนยันการรับของครบถ้วน',
    `ตรวจนับของใบเบิก #${transfer.transfer_no} เรียบร้อยแล้วใช่หรือไม่?\nระบบจะบันทึกค่าของ ฿${formatNumber(transfer.total_cost)} เป็นรายจ่าย (Expense) ของสาขาอัตโนมัติ`
  );
  if (!ok) return;

  ui.showLoading();
  try {
    const res = await api.centralKitchen.receiveTransfer(transfer.id);
    if (res.success) {
      ui.showToast('ยืนยันรับของสำเร็จ บันทึกค่าใช้จ่ายเข้าสาขาแล้ว 🎉', 'success');
      loadMyTransfers();
    }
  } catch (err) {
    ui.showToast(err.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

// Data Loaders
const loadItems = async () => {
  isLoadingItems.value = true;
  try {
    const res = await api.centralKitchen.getItems({ active_only: 'true' });
    if (res.success) {
      items.value = res.data;
    }
  } catch (err) {
    ui.showToast(err.message, 'error');
  } finally {
    isLoadingItems.value = false;
  }
};

const loadMyTransfers = async () => {
  isLoadingOrders.value = true;
  try {
    const res = await api.centralKitchen.getTransfers();
    if (res.success) {
      myTransfers.value = res.data;
    }
  } catch (err) {
    ui.showToast(err.message, 'error');
  } finally {
    isLoadingOrders.value = false;
  }
};

onMounted(() => {
  loadItems();
  loadMyTransfers();
});
</script>

<style scoped>
.branch-requisition-view {
  width: 100%;
}

.toolbar-card {
  box-shadow: var(--shadow-sm);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
}

/* 44px Touch Friendly Tab Switcher */
.requisition-tabs {
  display: flex;
  gap: var(--space-xs);
  align-items: center;
}

.requisition-tab-btn {
  height: 44px;
  padding: 0 20px;
  border-radius: var(--radius-full);
  font-size: var(--font-sm);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
  user-select: none;
}

.requisition-tab-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.requisition-tab-btn.active {
  background: var(--primary);
  color: #ffffff;
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(139, 3, 19, 0.2);
}

.badge-count {
  position: absolute;
  top: -6px;
  right: -6px;
  background-color: var(--primary);
  color: white;
  border-radius: 999px;
  font-size: 0.7rem;
  padding: 1px 7px;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
  border: 2px solid #ffffff;
}

/* Catalog Layout */
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

/* Filter Bar & Search: Full Width Row 1 */
.filter-bar {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
}

.search-input-box {
  position: relative;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  pointer-events: none;
}

.search-input {
  height: 44px;
  padding-left: 42px;
  padding-right: 36px;
  width: 100%;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  font-size: var(--font-base);
  transition: all var(--transition-base);
}

.search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(139, 3, 19, 0.1);
  outline: none;
}

.search-clear-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 4px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-clear-btn:hover {
  color: var(--text-primary);
}

/* 44px Capsule Category Filter Tabs */
.category-tabs {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
  align-items: center;
}

.category-tab {
  height: 44px;
  padding: 0 18px;
  border-radius: var(--radius-full);
  font-size: var(--font-sm);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
  user-select: none;
}

.category-tab:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.category-tab.active {
  background: var(--primary);
  color: #ffffff;
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(139, 3, 19, 0.2);
}

.category-count {
  font-size: 0.85em;
  opacity: 0.85;
  font-weight: 500;
}

/* Cards Grid */
.grid-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-md);
}

/* Item Card - Exact Central Kitchen Catalog Card Design */
.item-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
  cursor: pointer;
}

.item-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-color-focus);
}

.item-card.item-out-of-stock {
  opacity: 0.7;
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

/* Image with margin and soft cream background */
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
  transition: transform 0.3s ease;
}

.item-card:hover .item-img {
  transform: scale(1.05);
}

.item-img-placeholder {
  font-size: 2.6rem;
  opacity: 0.4;
  color: var(--text-tertiary);
}

/* 2-Line Name Block */
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
  font-weight: 700;
}

.item-name-sub {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

/* Item Meta Box */
.item-meta-box {
  border-top: 1px dashed var(--border-color);
  padding-top: var(--space-xs);
  margin-bottom: var(--space-sm);
  width: 100%;
}

/* Card Action Button */
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
  background: var(--gradient-primary, linear-gradient(135deg, #8b0313 0%, #68000b 100%)) !important;
  color: #ffffff !important;
  border: none !important;
  font-weight: 700 !important;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(139, 3, 19, 0.25);
  transition: all var(--transition-base);
}

.btn-restock-main:hover:not(:disabled) {
  box-shadow: 0 4px 10px rgba(139, 3, 19, 0.35);
  transform: translateY(-1px);
}

.btn-restock-main:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

/* Cart Sidebar */
.cart-sidebar {
  background: var(--card-bg);
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

/* Cart Items Container */
.cart-items-list {
  max-height: 420px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

/* Spacious 2-Tier Cart Rows */
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
  border-top: 1px dashed rgba(0, 0, 0, 0.08);
  margin-top: 6px;
  padding-top: 6px;
}

/* 32px Circle Stepper Buttons */
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

.qty-display {
  min-width: 28px;
}

/* Unboxed Cart Total Row */
.cart-total-row {
  border-top: 1px dashed var(--border-color);
}

/* 48px Cart Submit Button */
.btn-submit-requisition {
  height: 48px;
  font-size: 0.95rem;
  font-weight: 700;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(139, 3, 19, 0.2);
}

/* ============================================================ */
/* MY ORDERS TAB - EXACT ORDERS CARD FROM CENTRAL KITCHEN       */
/* ============================================================ */
.my-orders-layout {
  width: 100%;
}

.orders-list {
  width: 100%;
}

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

.order-card-footer {
  border-top: 1px dashed var(--border-color);
  padding-top: var(--space-sm);
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
  background: var(--gradient-primary, linear-gradient(135deg, #8b0313 0%, #68000b 100%));
  color: #ffffff;
  border: none;
  cursor: pointer;
}

.btn-dispatch-order:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* ============================================================ */
/* MOBILE DOCKED CART BAR & BOTTOM SHEET DRAWER (POS DESIGN)    */
/* ============================================================ */
.cart-bar {
  position: fixed;
  bottom: calc(var(--bottom-nav-height) + var(--safe-bottom));
  left: 0;
  right: 0;
  margin: 0 auto;
  width: 100%;
  max-width: var(--max-width);
  height: var(--cart-bar-height, 60px);
  padding: 0 var(--space-lg);
  background: rgba(139, 3, 19, 0.96);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
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
  bottom: calc(var(--bottom-nav-height) + var(--safe-bottom));
  left: 0;
  right: 0;
  margin: 0 auto;
  width: 100%;
  max-width: var(--max-width);
  max-height: 75vh;
  background: var(--bg-secondary, #fff8ee);
  border: 2px solid var(--primary-light, #ad281e) !important;
  border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
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
  max-height: calc(75vh - 165px);
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

.cart-drawer-footer .btn-submit-requisition {
  height: 48px;
  font-size: 15px;
  font-weight: 700;
  border-radius: var(--radius-md);
}

/* Orders Tab: Desktop Table vs Mobile Itemized Cards */
.desktop-only-orders-table {
  display: block;
}

.mobile-only-orders-list {
  display: none !important;
}

/* Desktop Defaults for Prefix */
.stock-prefix {
  display: none;
}

.item-unit-slash {
  display: inline;
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
  /* Hide the right-side cart card on mobile (use docked cart bar + drawer instead) */
  .cart-sidebar {
    display: none !important;
  }

  /* Add generous scroll padding at the bottom of catalog so user can scroll completely past everything */
  .catalog-layout {
    padding-bottom: calc(var(--bottom-nav-height) + var(--safe-bottom) + var(--cart-bar-height, 60px) + 35px) !important;
  }
}

@media (max-width: 768px) {
  /* Toolbar Tabs: 50/50 Full Width */
  .toolbar-card {
    padding: var(--space-sm) !important;
  }

  .requisition-tabs {
    width: 100%;
  }

  .requisition-tab-btn {
    flex: 1;
    padding: 0 12px;
    height: 42px;
    font-size: 13px;
  }

  /* Filter Tabs: Horizontal Smooth Swipe on Mobile */
  .category-tabs {
    flex-wrap: nowrap !important;
    overflow-x: auto !important;
    padding-bottom: 6px !important;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    width: 100%;
  }

  .category-tabs::-webkit-scrollbar {
    display: none;
  }

  .category-tab {
    flex-shrink: 0;
    height: 38px;
    padding: 0 14px;
    font-size: 12.5px;
  }

  /* ========================================================== */
  /* MOBILE 2-COLUMN CARDS - RESTORED ORIGINAL CATALOG DESIGN   */
  /* (Exact design from media_1792071395897.png, without button)*/
  /* ========================================================== */
  .grid-cards {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 10px !important;
  }

  .item-card {
    padding: 10px !important;
    border-radius: var(--radius-lg) !important;
    min-height: unset !important;
    position: relative !important;
    overflow: visible !important;
    cursor: pointer;
    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;
    align-items: stretch !important;
    text-align: left !important;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    transition: transform var(--transition-base), border-color var(--transition-base), box-shadow var(--transition-base);
  }

  .item-card:active {
    transform: scale(0.97);
  }

  .item-card.in-cart {
    border-color: var(--primary) !important;
    background: rgba(139, 3, 19, 0.04) !important;
    box-shadow: 0 0 0 1.5px var(--primary), var(--shadow-sm) !important;
  }

  /* 1. Top Badges: Category Left + Status Right */
  .card-top-badges {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    width: 100% !important;
    margin-bottom: 6px !important;
  }

  .card-badge-category {
    font-size: 10px !important;
    padding: 2px 7px !important;
    max-width: 72% !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    border-radius: var(--radius-full) !important;
    background: var(--bg-secondary) !important;
    color: var(--text-secondary) !important;
    border: 1px solid var(--border-color) !important;
  }

  .card-badge-status {
    width: 22px !important;
    height: 22px !important;
    min-width: 22px !important;
    font-size: 10px !important;
    border-radius: 50% !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0 !important;
  }

  /* 2. Soft Cream Image Box */
  .item-img-container {
    height: 105px !important;
    width: 100% !important;
    margin-bottom: 6px !important;
    border-radius: var(--radius-md) !important;
    background: linear-gradient(180deg, #fff7df 0%, #fceecc 100%) !important;
  }

  .item-img-placeholder {
    font-size: 2.2rem !important;
  }

  /* 3. 2-Line Name Block */
  .item-name {
    font-size: 0.85rem !important;
    line-height: 1.3 !important;
    min-height: 38px !important;
    margin-bottom: 4px !important;
    text-align: left !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    justify-content: flex-start !important;
    width: 100% !important;
  }

  .item-name-main {
    font-size: 0.85rem !important;
    font-weight: 700 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    text-align: left !important;
    width: 100% !important;
    color: var(--text-primary) !important;
  }

  .item-name-sub {
    display: block !important;
    font-size: 0.72rem !important;
    color: var(--text-secondary) !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    text-align: left !important;
    width: 100% !important;
    margin-top: 1px !important;
  }

  /* 4. Meta Box: Dashed divider + ราคาเบิก / คงเหลือ rows */
  .item-meta-box {
    border-top: 1px dashed var(--border-color) !important;
    padding-top: 5px !important;
    margin-bottom: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 2px !important;
    width: 100% !important;
  }

  .item-meta-row {
    padding: 1px 0 !important;
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    width: 100% !important;
  }

  .item-meta-label {
    display: inline-flex !important;
    align-items: center !important;
    font-size: 11px !important;
    color: var(--text-secondary) !important;
    font-weight: 500 !important;
  }

  .item-unit-slash {
    display: inline !important;
    font-size: 10.5px !important;
  }

  .item-cost-val {
    font-size: 0.95rem !important;
    font-weight: 700 !important;
    color: var(--text-primary) !important;
  }

  .item-stock-val {
    font-size: 0.95rem !important;
    font-weight: 700 !important;
  }

  .stock-prefix {
    display: none !important;
  }

  /* 5. Button Removed on Mobile (whole card is tapped to add) */
  .card-footer-actions {
    display: none !important;
  }

  /* Qty Badge on card */
  .qty-badge {
    position: absolute !important;
    top: -6px !important;
    right: -6px !important;
    background: var(--primary) !important;
    color: #ffffff !important;
    width: 24px !important;
    height: 24px !important;
    border-radius: 50% !important;
    font-size: 11.5px !important;
    font-weight: 700 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    box-shadow: 0 2px 6px rgba(139, 3, 19, 0.4) !important;
    border: 2px solid #ffffff !important;
    z-index: 5 !important;
  }

  /* Orders Tab Responsive */
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
  }

  .order-mobile-item-bottom {
    border-top: 1px dashed rgba(0, 0, 0, 0.07);
  }
}
</style>
