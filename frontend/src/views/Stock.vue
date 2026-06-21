<template>
  <div id="stock-page" class="page-enter">
    
    <!-- Info Header Card -->
    <div class="card mb-lg p-md flex flex-between align-center mobile-stock-header-card" style="gap: var(--space-md); flex-wrap: wrap;">
      <div class="stock-page-title">
        ระบบจัดการสต็อกสินค้า
      </div>
      <div>
        <router-link to="/stock/bulk" class="btn btn-primary" style="background: linear-gradient(135deg, #e63946, #b7091b); color: white; border: none; font-weight: bold; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-md); gap: var(--space-xs); padding: 10px 20px;">
          <i class="fa-solid fa-boxes-stacked" style="margin-right: 4px;"></i> จัดการสต็อกด่วน
        </router-link>
      </div>
    </div>

    <!-- Tab Selector -->
    <div class="category-tabs mb-lg" style="margin-bottom: var(--space-lg); display: flex; gap: var(--space-sm); border-bottom: 2px solid var(--border-color); padding-bottom: var(--space-sm); overflow-x: auto;">
      <button 
        class="category-tab" 
        :class="{ 'active': activeTab === 'menu_items' }"
        @click="activeTab = 'menu_items'"
      >
        <i class="fa-solid fa-drumstick-bite" style="margin-right: 4px;"></i> สินค้าและเมนู
      </button>
      <button 
        class="category-tab" 
        :class="{ 'active': activeTab === 'modifiers' }"
        @click="activeTab = 'modifiers'"
      >
        <i class="fa-solid fa-bottle-droplet" style="margin-right: 4px;"></i> ซอสและเครื่องปรุง
      </button>
    </div>

    <!-- Tab 1: Menu Items Stock -->
    <div v-if="activeTab === 'menu_items'">
      <!-- Desktop Stock Table (Visible on desktop only) -->
      <div class="card p-0 overflow-hidden mb-lg desktop-stock-table-container">
        <div style="overflow-x: auto;">
          <table class="table" style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); background: rgba(139, 3, 19, 0.03);">
                <th style="padding: var(--space-md); text-align: center; width: 30%;">เมนูอาหาร</th>
                <th style="padding: var(--space-md); text-align: center; width: 20%;">ของสด</th>
                <th style="padding: var(--space-md); text-align: center; width: 20%;">ทอดสุก/พร้อมขาย</th>
                <th style="padding: var(--space-md); text-align: center; width: 30%;">จัดการสต็อก</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="4" style="text-align: center; padding: var(--space-3xl);">
                  <div class="spinner" style="margin: 0 auto;"></div>
                </td>
              </tr>
              <tr v-else-if="stockItems.length === 0">
                <td colspan="4" style="text-align: center; padding: var(--space-3xl); color: var(--text-tertiary);">
                  ไม่มีรายการสินค้าที่ต้องคุมคลังสต็อก (เพิ่มสินค้าในหน้า "จัดการเมนู")
                </td>
              </tr>
              <tr 
                v-else 
                v-for="item in stockItems" 
                :key="item.id" 
                style="border-bottom: 1px solid var(--border-color);"
                class="table-row-hover"
              >
                <!-- Name -->
                <td style="padding: var(--space-md); vertical-align: middle;">
                  <div class="font-bold" style="font-size: var(--font-base);">{{ item.name }}</div>
                  <div style="font-size: var(--font-xs); color: var(--text-tertiary); display: flex; gap: var(--space-sm); align-items: center;">
                    <span>ID: {{ item.id }}</span>
                    <span style="color: var(--border-color);">|</span>
                    <a href="#" style="color: var(--accent); text-decoration: underline;" @click.prevent="viewLogs(item, false)"><i class="fa-solid fa-file-medical" style="margin-right: 4px;"></i> ดูประวัติสต็อก</a>
                  </div>
                </td>
                <!-- Raw Quantity -->
                <td style="padding: var(--space-md); text-align: center; vertical-align: middle;">
                  <span v-if="item.raw_quantity !== null && item.raw_quantity !== undefined" :class="{ 'text-danger': isItemLowStock(item, item.raw_quantity) }" style="font-weight: bold;">
                    {{ formatStockQty(item.raw_quantity, item.uom) }}
                    <span v-if="isItemLowStock(item, item.raw_quantity)" style="display:block; font-size: 10px; font-weight:normal;"><i class="fa-solid fa-triangle-exclamation text-warning" style="margin-right: 2px;"></i> ใกล้หมด</span>
                    <span v-if="(item.raw_quantity || 0) <= 0" style="display:block; font-size: 10px; font-weight:normal;"><i class="fa-solid fa-circle-xmark text-danger" style="margin-right: 2px;"></i> หมดเกลี้ยง</span>
                  </span>
                  <span v-else style="color: var(--text-tertiary); font-style: italic;">-</span>
                </td>
                <!-- Cooked Quantity -->
                <td style="padding: var(--space-md); text-align: center; vertical-align: middle;">
                  <span :class="{ 'text-danger': isItemLowStock(item, item.quantity) }" style="font-weight: bold;">
                    {{ formatStockQty(item.quantity, item.uom) }}
                    <span v-if="isItemLowStock(item, item.quantity)" style="display:block; font-size: 10px; font-weight:normal;"><i class="fa-solid fa-triangle-exclamation text-warning" style="margin-right: 2px;"></i> ใกล้หมด</span>
                    <span v-if="(item.quantity !== null && item.quantity !== undefined ? item.quantity : 0) <= 0" style="display:block; font-size: 10px; font-weight:normal;"><i class="fa-solid fa-circle-xmark text-danger" style="margin-right: 2px;"></i> หมดเกลี้ยง</span>
                  </span>
                </td>
                <!-- Actions -->
                <td style="padding: var(--space-md); text-align: center; vertical-align: middle;">
                  <div class="stock-actions flex justify-center gap-sm" style="flex-wrap: wrap;">
                    <button v-if="item.raw_quantity !== null && item.raw_quantity !== undefined" class="btn btn-primary" style="background: #8b0313; color: white; border: 1px solid #6b020e; font-weight: bold;" @click="openActionModal('fry', item, false)"><i class="fa-solid fa-fire" style="margin-right: 4px;"></i> ทอดสินค้า</button>
                    <button class="btn" style="background:rgba(255,59,48,0.1); color:#ff3b30; border:1px solid rgba(255,59,48,0.2);" @click="openActionModal('waste', item, false)"><i class="fa-solid fa-trash-can" style="margin-right: 4px;"></i> ของเสีย</button>
                    <button class="btn" style="background:rgba(255,149,0,0.1); color:#ff9500; border:1px solid rgba(255,149,0,0.2);" @click="openActionModal('staff_benefit', item, false)"><i class="fa-solid fa-user-check" style="margin-right: 4px;"></i> เครดิต</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mobile Stock Card List (Visible on mobile only) -->
      <div class="mobile-stock-list-container">
        <div v-if="loading" class="text-center py-3xl">
          <div class="spinner" style="margin: 0 auto;"></div>
        </div>
        <div v-else-if="stockItems.length === 0" class="card text-center py-3xl" style="color: var(--text-tertiary);">
          ไม่มีรายการสินค้าที่ต้องคุมคลังสต็อก
        </div>
        <div v-else class="mobile-stock-list">
          <div 
            v-for="item in stockItems" 
            :key="item.id" 
            class="mobile-stock-card"
            :class="{ 'out-of-stock-card': (item.quantity !== null && item.quantity !== undefined ? item.quantity : 0) <= 0 }"
          >
            <div class="mobile-stock-card-body">
              <!-- Left: Name & ID -->
              <div class="mobile-stock-card-details">
                <div class="mobile-stock-card-name">{{ item.name }}</div>
                <div class="mobile-stock-card-id" style="display: flex; gap: var(--space-sm); align-items: center; flex-wrap: wrap;">
                  <span>ID: {{ item.id }}</span>
                  <span style="color: var(--border-color);">|</span>
                  <a href="#" style="color: var(--accent); text-decoration: underline;" @click.prevent="viewLogs(item, false)"><i class="fa-solid fa-file-medical"></i> ประวัติ</a>
                </div>
              </div>
              
              <!-- Right: Stock Quantity & Badge -->
              <div class="mobile-stock-card-meta">
                <div v-if="item.raw_quantity !== null && item.raw_quantity !== undefined" class="flex flex-column align-end gap-xs" style="text-align: right;">
                  <div style="font-size: var(--font-sm); color: var(--text-secondary); margin-bottom: 2px;">
                    ทอดแล้ว: <strong :class="{ 'text-danger': isItemLowStock(item, item.quantity) }">{{ formatStockQty(item.quantity, item.uom) }}</strong>
                  </div>
                  <div style="font-size: var(--font-sm); color: var(--text-secondary);">
                    ของสด: <strong :class="{ 'text-danger': isItemLowStock(item, item.raw_quantity) }">{{ formatStockQty(item.raw_quantity, item.uom) }}</strong>
                  </div>
                </div>
                <div 
                  v-else
                  class="mobile-stock-card-qty"
                  :class="{ 'text-danger': isItemLowStock(item, item.quantity) }"
                >
                  {{ formatStockQty(item.quantity, item.uom) }}
                </div>
                
                <div class="mobile-stock-card-badge">
                  <span 
                    v-if="item.raw_quantity !== null && item.raw_quantity !== undefined && isItemLowStock(item, item.quantity) && isItemLowStock(item, item.raw_quantity)"
                    class="badge badge-danger badge-sm"
                    style="display: block; font-size: 0.65rem;"
                  >
                    <i class="fa-solid fa-triangle-exclamation" style="margin-right: 2px;"></i> ของใกล้หมดทั้งคู่
                  </span>
                  <span 
                    v-else-if="isItemLowStock(item, item.quantity)" 
                    class="badge badge-warning badge-sm"
                    style="display: block; font-size: 0.65rem;"
                  >
                    <i class="fa-solid fa-triangle-exclamation" style="margin-right: 2px;"></i> ใกล้หมด
                  </span>
                  <span 
                    v-else-if="(item.quantity !== null && item.quantity !== undefined ? item.quantity : 0) <= 0" 
                    class="badge badge-danger badge-sm"
                    style="display: block; font-size: 0.65rem;"
                  >
                    <i class="fa-solid fa-circle-xmark" style="margin-right: 2px;"></i> หมดเกลี้ยง
                  </span>
                </div>
              </div>
            </div>
            
            <!-- Bottom Stock Actions -->
            <div class="mobile-stock-card-actions">
              <button 
                v-if="item.raw_quantity !== null && item.raw_quantity !== undefined" 
                class="btn btn-primary" 
                style="grid-column: span 2; background: #8b0313; color: white; border: 1px solid #6b020e; font-weight: bold;" 
                @click="openActionModal('fry', item, false)"
              >
                <i class="fa-solid fa-fire"></i> ทอดสินค้า (หักของสด ➔ ทอดสุก)
              </button>
              <button class="btn btn-danger-outline" @click="openActionModal('waste', item, false)"><i class="fa-solid fa-trash-can"></i> ของเสีย</button>
              <button class="btn btn-warning-outline" @click="openActionModal('staff_benefit', item, false)"><i class="fa-solid fa-user-check"></i> เครดิต</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 2: Free Modifiers Stock -->
    <div v-else-if="activeTab === 'modifiers'">
      <!-- Desktop Free Modifiers Table -->
      <div class="card p-0 overflow-hidden mb-lg desktop-stock-table-container">
        <div style="overflow-x: auto;">
          <table class="table" style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); background: rgba(139, 3, 19, 0.03);">
                <th style="padding: var(--space-md); text-align: center; width: 35%;">ชื่อเครื่องปรุง/ซอส/ผง</th>
                <th style="padding: var(--space-md); text-align: center; width: 25%;">ประเภท</th>
                <th style="padding: var(--space-md); text-align: center; width: 20%;">ปริมาณคงเหลือ</th>
                <th style="padding: var(--space-md); text-align: center; width: 20%;">จัดการสต็อก</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="4" style="text-align: center; padding: var(--space-3xl);">
                  <div class="spinner" style="margin: 0 auto;"></div>
                </td>
              </tr>
              <tr v-else-if="modifierItems.length === 0">
                <td colspan="4" style="text-align: center; padding: var(--space-3xl); color: var(--text-tertiary);">
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
                  <div class="font-bold" style="font-size: var(--font-base);">
                    {{ item.name }}
                    <span v-if="!item.active" class="badge badge-neutral badge-sm" style="margin-left:6px;">ปิดใช้งาน</span>
                  </div>
                  <div style="font-size: var(--font-xs); color: var(--text-tertiary); display: flex; gap: var(--space-sm); align-items: center;">
                    <span>ID: {{ item.id }}</span>
                    <span style="color: var(--border-color);">|</span>
                    <a href="#" style="color: var(--accent); text-decoration: underline;" @click.prevent="viewLogs(item, true)"><i class="fa-solid fa-file-invoice" style="margin-right: 4px;"></i> ดูประวัติสต็อก</a>
                  </div>
                </td>
                <!-- Category -->
                <td style="padding: var(--space-md); text-align: center; vertical-align: middle;">
                  <span class="badge" :class="getModifierCategoryClass(item.category)">
                    {{ getModifierCategoryLabel(item.category) }}
                  </span>
                </td>
                <!-- Quantity -->
                <td style="padding: var(--space-md); text-align: center; vertical-align: middle;">
                  <span :class="{ 'text-danger font-bold': isModifierLowStock(item), 'font-semibold': !isModifierLowStock(item) }">
                    {{ formatModifierStock(item) }}
                    <span v-if="isModifierLowStock(item) && item.total_servings > 0" style="display:block; font-size: 10px; font-weight:normal;"><i class="fa-solid fa-triangle-exclamation text-warning" style="margin-right: 2px;"></i> ใกล้หมด</span>
                    <span v-if="item.total_servings <= 0" style="display:block; font-size: 10px; font-weight:normal;"><i class="fa-solid fa-circle-xmark text-danger" style="margin-right: 2px;"></i> หมด</span>
                  </span>
                </td>
                <!-- Actions -->
                <td style="padding: var(--space-md); text-align: center; vertical-align: middle;">
                  <div class="stock-actions flex justify-center gap-sm" style="flex-wrap: wrap;">
                    <button class="btn btn-primary" style="background: var(--success); color: white; border: 1px solid var(--success-light); font-weight: bold;" @click="openActionModal('restock', item, true)">
                      <i class="fa-solid fa-plus" style="margin-right: 4px;"></i> เติมสต็อก
                    </button>
                    <button class="btn" style="background: rgba(255, 149, 0, 0.1); color: #ff9500; border: 1px solid rgba(255, 149, 0, 0.2); font-weight: bold;" @click="openActionModal('adjust', item, true)">
                      <i class="fa-solid fa-wrench" style="margin-right: 4px;"></i> ปรับปรุง
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mobile Free Modifiers Card List -->
      <div class="mobile-stock-list-container">
        <div v-if="loading" class="text-center py-3xl">
          <div class="spinner" style="margin: 0 auto;"></div>
        </div>
        <div v-else-if="modifierItems.length === 0" class="card text-center py-3xl" style="color: var(--text-tertiary);">
          ไม่มีรายการเครื่องปรุงในระบบ
        </div>
        <div v-else class="mobile-stock-list">
          <div 
            v-for="item in modifierItems" 
            :key="item.id" 
            class="mobile-stock-card"
            :class="{ 'out-of-stock-card': item.total_servings <= 0, 'opacity-50': !item.active }"
          >
            <div class="mobile-stock-card-body">
              <!-- Left: Name & ID -->
              <div class="mobile-stock-card-details">
                <div class="mobile-stock-card-name">
                  {{ item.name }}
                  <span v-if="!item.active" class="badge badge-sm badge-neutral" style="margin-left:4px;">ปิดใช้งาน</span>
                </div>
                <div class="mobile-stock-card-id" style="display: flex; gap: var(--space-sm); align-items: center; flex-wrap: wrap;">
                  <span>ID: {{ item.id }}</span>
                  <span style="color: var(--border-color);">|</span>
                  <a href="#" style="color: var(--accent); text-decoration: underline;" @click.prevent="viewLogs(item, true)"><i class="fa-solid fa-file-invoice" style="margin-right: 4px;"></i> ประวัติ</a>
                </div>
                <div style="margin-top: 4px;">
                  <span class="badge badge-sm" :class="getModifierCategoryClass(item.category)">
                    {{ getModifierCategoryLabel(item.category) }}
                  </span>
                </div>
              </div>
              
              <!-- Right: Stock Quantity & Badge -->
              <div class="mobile-stock-card-meta">
                <div class="mobile-stock-card-qty" :class="{ 'text-danger': isModifierLowStock(item) }">
                  {{ formatModifierStock(item) }}
                </div>
                <div class="mobile-stock-card-badge">
                  <span v-if="isModifierLowStock(item) && item.total_servings > 0" class="badge badge-warning badge-sm"><i class="fa-solid fa-triangle-exclamation" style="margin-right: 2px;"></i> ใกล้หมด</span>
                  <span v-else-if="item.total_servings <= 0" class="badge badge-danger badge-sm"><i class="fa-solid fa-circle-xmark" style="margin-right: 2px;"></i> หมด</span>
                </div>
              </div>
            </div>
            
            <!-- Bottom Stock Actions -->
            <div class="mobile-stock-card-actions">
              <button class="btn btn-primary" style="background: var(--success); color: white; border: 1px solid var(--success-light); font-weight: bold;" @click="openActionModal('restock', item, true)">
                <i class="fa-solid fa-plus" style="margin-right: 4px;"></i> เติมสต็อก
              </button>
              <button class="btn" style="background: rgba(255, 149, 0, 0.1); color: #ff9500; border: 1px solid rgba(255, 149, 0, 0.2); font-weight: bold;" @click="openActionModal('adjust', item, true)">
                <i class="fa-solid fa-wrench" style="margin-right: 4px;"></i> ปรับปรุง
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Restock/Adjust Modal -->
    <div v-if="showActionModal" class="modal-container active" style="display:flex; align-items:center; justify-content:center; position: fixed; inset:0; z-index:1000;">
      <div class="modal-overlay" @click="showActionModal = false"></div>
      <div class="modal-content modal-center w-full max-w-sm" style="position:relative; z-index:2;">
        <div class="modal-header">
          <h3>
            <i :class="getActionIconClass(actionType, activeIsModifier)" style="margin-right: 6px;"></i>
            {{ getActionTitleLabel(actionType, activeIsModifier) }}
          </h3>
          <button class="modal-close" @click="showActionModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="mb-md font-bold" style="font-size: var(--font-base); text-align: center;">
            {{ activeItem?.name }}
          </div>
          <div style="font-size: var(--font-sm); color: var(--text-secondary); text-align: center; margin-bottom: var(--space-lg);">
            <span v-if="activeIsModifier">
              จำนวนคงเหลือปัจจุบัน: <strong>{{ formatModifierStock(activeItem) }}</strong>
            </span>
            <span v-else-if="activeItem?.raw_quantity !== null && activeItem?.raw_quantity !== undefined">
              ทอดสุกแล้ว: <strong>{{ activeItem?.quantity || 0 }} ชิ้น</strong> | ของสด: <strong>{{ activeItem?.raw_quantity || 0 }} ชิ้น</strong>
            </span>
            <span v-else>
              จำนวนคงเหลือในระบบปัจจุบัน: <strong>{{ activeItem?.quantity !== null && activeItem?.quantity !== undefined ? activeItem?.quantity : 0 }} ชิ้น</strong>
            </span>
          </div>

          <!-- Stock Type Selector (Only if tracks raw stock and not fry mode) -->
          <div v-if="!activeIsModifier && activeItem?.raw_quantity !== null && activeItem?.raw_quantity !== undefined && actionType !== 'fry'" class="form-group">
            <label class="form-label font-bold">จัดการสต็อกส่วนใด? *</label>
            <div style="display:flex; gap:var(--space-sm); margin-bottom:var(--space-md);">
              <button 
                class="btn flex-1"
                :class="actionForm.stock_type === 'cooked' ? 'btn-primary' : 'btn-secondary'"
                @click="actionForm.stock_type = 'cooked'"
                type="button"
                style="min-height:50px; padding: 10px !important; font-size: var(--font-sm) !important; font-weight: normal; display: inline-flex; align-items: center; justify-content: center; gap: var(--space-xs);"
              >
                <i class="fa-solid fa-drumstick-bite"></i> ทอดสุก
              </button>
              <button 
                class="btn flex-1"
                :class="actionForm.stock_type === 'raw' ? 'btn-primary' : 'btn-secondary'"
                @click="actionForm.stock_type = 'raw'"
                type="button"
                style="min-height:50px; padding: 10px !important; font-size: var(--font-sm) !important; font-weight: normal; display: inline-flex; align-items: center; justify-content: center; gap: var(--space-xs);"
              >
                <i class="fa-solid fa-box"></i> ของสด
              </button>
            </div>
          </div>

          <!-- Quantity input -->
          <div class="form-group">
            <template v-if="!activeIsModifier && activeItem?.uom === 'กรัม' && actionType === 'restock'">
              <div class="form-group">
                <label class="form-label">จำนวนถุงที่ต้องการเติม *</label>
                <input 
                  type="number" 
                  class="form-input" 
                  v-model.number="restockBags" 
                  placeholder="เช่น 1, 2, 5" 
                  min="1"
                />
              </div>
              <div class="form-group mt-sm">
                <label class="form-label">ขนาดบรรจุต่อถุง *</label>
                <select class="form-input" v-model.number="restockBagCapacity">
                  <option :value="1000">1 กิโลกรัม (1,000 กรัม)</option>
                  <option :value="2000">2 กิโลกรัม (2,000 กรัม)</option>
                </select>
              </div>
              <div class="mt-sm p-sm card" style="background: rgba(255, 149, 0, 0.05); border: 1px dashed var(--border-color); text-align: left; font-size: var(--font-sm);">
                น้ำหนักที่จะเพิ่มเข้าคลัง: <strong>{{ formatStockQty(restockBags * restockBagCapacity, 'กรัม') }}</strong>
              </div>
            </template>
            <template v-else>
              <label class="form-label">
                <template v-if="activeIsModifier">
                  {{ actionType === 'restock' ? (activeItem?.category === 'sauce_small' ? 'จำนวนซองที่ต้องการเติม *' : 'จำนวนถุงที่ต้องการเติม *') : 'จำนวนรอบเสิร์ฟที่ต้องการปรับ (ใส่ติดลบเพื่อหักออก) *' }}
                </template>
                <template v-else>
                  <span v-if="actionType === 'fry'">จำนวนที่ต้องการทอด (ชิ้น) *</span>
                  <span v-else-if="actionType === 'restock'">จำนวนที่ต้องการเติม ({{ activeItem?.uom || 'ชิ้น' }}) *</span>
                  <span v-else-if="actionType === 'adjust'">จำนวนที่ต้องการปรับปรุง ({{ activeItem?.uom || 'ชิ้น' }}) * (ใส่ติดลบเพื่อหักออก)</span>
                  <span v-else>จำนวนที่ต้องการหัก ({{ activeItem?.uom || 'ชิ้น' }}) *</span>
                </template>
              </label>
              <input 
                type="number" 
                class="form-input" 
                v-model.number="actionForm.quantity" 
                placeholder="ใส่ตัวเลข..." 
              />
            </template>
          </div>

          <div v-if="!activeIsModifier && (activeItem?.name?.includes('แร็ปไก่') || isLinkedBun(activeItem)) && (actionType === 'restock' || actionType === 'adjust')" style="font-size: 13px; color: #ff3b30; margin-top: -6px; margin-bottom: var(--space-md); text-align: left; font-weight: bold; line-height: 1.3;">
            {{ getLinkageWarningText(activeItem) }}
          </div>

          <div v-if="!activeIsModifier && actionType === 'fry'" style="font-size: var(--font-xs); color: var(--text-tertiary); margin-top: -8px; margin-bottom: var(--space-md); text-align: left;">
            * ระบบจะหักออกจากสต็อก "ของสด" และเพิ่มเข้าสต็อก "ทอดสุก" 
          </div>

          <div v-if="activeIsModifier && actionType === 'restock'" style="font-size: var(--font-xs); color: var(--text-tertiary); margin-top: -8px; margin-bottom: var(--space-md); text-align: left;">
            * {{ activeItem?.category === 'sauce_small' ? 'ระบบจะเติมสต็อกตามจำนวนซองที่ระบุ' : `ระบบจะคูณด้วย ${activeItem?.servings_per_bag || 50} รอบเสิร์ฟอัตโนมัติเมื่อกดบันทึก` }}
          </div>

          <!-- Waste Preset Notes -->
          <div v-if="!activeIsModifier && actionType === 'waste'" class="form-group">
            <label class="form-label">สาเหตุของเสีย</label>
            <div style="display:flex; gap:var(--space-sm); flex-wrap:wrap;">
              <button 
                v-for="preset in wastePresets" :key="preset"
                class="btn btn-sm"
                :class="actionForm.note === preset ? 'btn-primary' : 'btn-secondary'"
                @click="actionForm.note = preset"
                style="min-height:38px; display: inline-flex; align-items: center; gap: 4px;"
              >
                <i :class="preset === 'เน่า/เสีย' ? 'fa-solid fa-trash-can' : 'fa-solid fa-circle-exclamation'" style="font-size: var(--font-xs);"></i>
                {{ preset }}
              </button>
            </div>
          </div>

          <!-- Note/Reason -->
          <div v-if="actionType !== 'fry'" class="form-group">
            <label class="form-label">บันทึกช่วยจำ {{ actionType === 'waste' || actionType === 'staff_benefit' ? '' : '(เช่น เลขบิล หรือเหตุผลที่ปรับปรุง)' }}</label>
            <input 
              type="text" 
              class="form-input" 
              v-model="actionForm.note" 
              :placeholder="actionType === 'staff_benefit' ? 'ชื่อพนักงานที่รับ...' : 'ใส่ข้อความช่วยจำ...'" 
            />
          </div>

          <!-- Buttons -->
          <div class="flex gap-md mt-lg">
            <button class="btn btn-secondary flex-1" @click="showActionModal = false">ยกเลิก</button>
            <button 
              class="btn btn-primary flex-1" 
              :disabled="actionForm.quantity === '' || actionForm.quantity === null" 
              @click="handleSaveAction"
            >
              <span style="display: inline-flex; align-items: center; gap: 6px;">
                <i :class="actionType === 'fry' ? 'fa-solid fa-fire' : 'fa-solid fa-floppy-disk'"></i>
                {{ actionType === 'fry' ? 'เริ่มทอดสินค้า' : 'บันทึกสต็อก' }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Logs Modal -->
    <div v-if="showLogsModal" class="modal-container active" style="display:flex; align-items:center; justify-content:center; position: fixed; inset:0; z-index:1000;">
      <div class="modal-overlay" @click="showLogsModal = false"></div>
      <div class="modal-content modal-center w-full max-w-md" style="position:relative; z-index:2; overflow-y:auto; max-height:80dvh;">
        <div class="modal-header">
          <h3><i class="fa-solid fa-clock-rotate-left" style="margin-right: 6px;"></i> ประวัติการเข้า-ออกของสต็อก</h3>
          <button class="modal-close" @click="showLogsModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="mb-lg font-bold" style="font-size: var(--font-md); text-align: center;">
            {{ activeItem?.name }}
          </div>

          <div v-if="logsLoading" style="text-align: center; padding: var(--space-2xl);">
            <div class="spinner" style="margin:0 auto;"></div>
          </div>
          <div v-else-if="logs.length === 0" style="text-align: center; padding: var(--space-xl); color: var(--text-tertiary);">
            ยังไม่มีบันทึกประวัติการปรับปรุงสต็อกสำหรับสินค้าชิ้นนี้
          </div>
          
          <div v-else style="display: flex; flex-direction: column; gap: var(--space-md);">
            <div 
              v-for="log in logs" 
              :key="log.id" 
              class="card p-sm flex flex-between align-center"
              style="font-size: var(--font-sm); background: var(--bg-primary);"
            >
              <div>
                <div class="font-bold" style="display: inline-flex; align-items: center; gap: 6px;">
                  <i :class="getReasonIconClass(log.reason)" style="color: var(--text-tertiary);"></i>
                  <span>{{ getReasonLabel(log.reason) }}</span>
                  <span 
                    :class="log.change_qty > 0 ? 'text-success' : 'text-danger'"
                    style="margin-left: 4px;"
                  >
                    {{ log.change_qty > 0 ? `+${log.change_qty}` : log.change_qty }}
                  </span>
                </div>
                <div style="font-size: 10px; color: var(--text-tertiary); margin-top: 2px;">
                  โดย: {{ log.staff_name || 'ระบบ' }} | {{ formatDateTime(log.created_at) }}
                </div>
                <div v-if="log.note" style="font-size: 11px; color: var(--text-secondary); margin-top: 4px; border-left: 2px solid var(--border-color); padding-left: 6px;">
                  {{ log.note }}
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 10px; color: var(--text-tertiary);">ยอดหลังปรับ</div>
                <div class="font-bold">{{ log.new_stock }} ชิ้น</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bulk Stock Management Modal removed (moved to dedicated page /stock/bulk) -->

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../api';
import { ui, formatDateTime, getUser } from '../helpers';

import { store } from '../store';

// States
const activeTab = ref('menu_items'); // 'menu_items' or 'modifiers'
const stockItems = computed(() => store.stockItems);
const modifierItems = ref([]);
const loading = ref(true);
const lowStockThreshold = computed(() => store.lowStockThreshold);
const showActionModal = ref(false);
const showLogsModal = ref(false);
const actionType = ref('restock'); // 'restock', 'adjust', 'waste', or 'staff_benefit'
const activeItem = ref(null);
const activeIsModifier = ref(false);
const logs = ref([]);
const logsLoading = ref(false);
const wastePresets = ['เน่า/เสีย', 'ตกพื้น/เสียหาย'];

// Gram-based restocking states
const restockBags = ref(1);
const restockBagCapacity = ref(1000); // default to 1kg (1,000g)

const actionForm = ref({
  quantity: '',
  note: ''
});

const formatStockQty = (qty, uom) => {
  if (qty === null || qty === undefined) return '';
  const roundedQty = Math.round(Number(qty) * 100) / 100;
  const formatted = roundedQty.toLocaleString('th-TH', { maximumFractionDigits: 2 });
  if (uom === 'กรัม') {
    return `${formatted} ก.`;
  }
  return `${formatted} ${uom || 'ชิ้น'}`;
};

const isItemLowStock = (item, qty) => {
  if (qty === null || qty === undefined) return false;
  if (qty <= 0) return false;
  if (item.uom === 'กรัม') {
    return qty <= 500;
  }
  return qty <= lowStockThreshold.value;
};

const getSteamedCounterpartName = (name) => {
  if (!name) return '';
  if (name.startsWith('เปาทอด') || name.startsWith('เปาปิ้ง')) {
    if (name.includes('หมูไข่เค็ม') || name.includes('หมูสับไขเค็ม') || name.includes('หมูสับ ไข่เค็ม')) {
      return 'ซาลาเปาไส้หมูสับ ไข่เค็ม';
    }
    if (name.includes('หมู')) {
      return 'ซาลาเปาไส้หมูสับ';
    }
    if (name.includes('ถั่วดำ')) {
      return 'ซาลาเปาไส้ถั่วดำ';
    }
    if (name.includes('ครีม')) {
      return 'ซาลาเปาไส้ครีม';
    }
    if (name.includes('หมั่นโถ')) {
      return 'หมั่นโถว';
    }
  }
  return '';
};

const isLinkedBun = (item) => {
  if (!item || !item.name) return false;
  return !!getSteamedCounterpartName(item.name);
};

const getLinkageWarningText = (item) => {
  if (!item) return '';
  let isDeduct = true; // default to deduct
  if (actionType.value === 'adjust') {
    const val = Number(actionForm.value.quantity);
    if (!isNaN(val) && actionForm.value.quantity !== '' && actionForm.value.quantity !== null) {
      if (val < 0) {
        isDeduct = false;
      }
    }
  }

  const targetName = item.name.includes('แร็ปไก่') ? 'ไก่ไร้กระดูก' : getSteamedCounterpartName(item.name);
  if (!targetName) return '';

  return isDeduct 
    ? `* การเพิ่มจะหัก "${targetName}" 1 ชิ้น อัตโนมัติ`
    : `* การลบจะเพิ่ม "${targetName}" 1 ชิ้น อัตโนมัติ`;
};

// Load System Settings to check Low Stock Threshold
const loadSettings = async () => {
  try {
    const res = await api.settings.getAll();
    if (res.success && res.data.low_stock_threshold) {
      store.lowStockThreshold = Number(res.data.low_stock_threshold) || 5;
    }
  } catch (e) {
    console.warn(e);
  }
};

const loadModifiersData = async (force = false) => {
  try {
    await store.fetchModifiers(force);
    modifierItems.value = store.modifiers || [];
  } catch (e) {
    console.error(e);
    ui.showToast('ไม่สามารถโหลดข้อมูลคลังซอส/ผงปรุงรสได้', 'error');
  }
};

const loadStockData = async (force = false) => {
  loading.value = !store.stockLoaded || force;
  try {
    await Promise.all([
      store.fetchStock(force),
      loadModifiersData(force)
    ]);
  } catch (e) {
    console.error(e);
    ui.showToast('ไม่สามารถโหลดข้อมูลคลังสินค้าได้', 'error');
  } finally {
    loading.value = false;
  }
};

// Actions Handlers
const openActionModal = (type, item, isMod = false) => {
  actionType.value = type;
  activeItem.value = item;
  activeIsModifier.value = isMod;
  
  let defaultNote = '';
  if (type === 'staff_benefit') {
    const currentUser = getUser();
    defaultNote = currentUser ? currentUser.name : '';
  }

  restockBags.value = 1;
  restockBagCapacity.value = 1000;

  actionForm.value = {
    quantity: '',
    stock_type: 'cooked',
    note: defaultNote
  };
  showActionModal.value = true;
};

const handleSaveAction = async () => {
  ui.showLoading();
  try {
    const itemId = activeItem.value.id;
    let qty = Number(actionForm.value.quantity) || 0;
    let note = actionForm.value.note.trim();
    const stockType = actionForm.value.stock_type;

    if (!activeIsModifier.value && activeItem.value?.uom === 'กรัม' && actionType.value === 'restock') {
      const bags = Number(restockBags.value) || 0;
      const cap = Number(restockBagCapacity.value) || 0;
      qty = bags * cap;
      const bagDesc = `(เติม ${bags} ถุง ถุงละ ${cap / 1000} กก.)`;
      note = note ? `${note} ${bagDesc}` : bagDesc;
    }

    let res;
    if (activeIsModifier.value) {
      if (actionType.value === 'restock') {
        res = await api.modifiers.restock(itemId, qty, note);
      } else if (actionType.value === 'adjust') {
        res = await api.modifiers.adjust(itemId, qty, 'adjustment', note);
      }
    } else {
      if (actionType.value === 'fry') {
        res = await api.stock.fry(itemId, { quantity: qty, note });
      } else if (actionType.value === 'restock') {
        res = await api.stock.restock(itemId, { quantity: qty, stock_type: stockType, note });
      } else {
        const reason = actionType.value === 'waste' ? 'waste' : actionType.value === 'staff_benefit' ? 'staff_benefit' : 'adjustment';
        const delta = actionType.value === 'adjust' ? qty : -Math.abs(qty);
        res = await api.stock.adjust(itemId, { quantity: delta, reason, stock_type: stockType, note });
      }
    }

    if (res.success) {
      let successMsg = 'บันทึกยอดคลังเรียบร้อย';
      if (activeIsModifier.value) {
        successMsg = actionType.value === 'restock' ? 'เติมสต็อกเครื่องปรุงสำเร็จ' : 'ปรับสต็อกเครื่องปรุงสำเร็จ';
        if (res.data) {
          const mId = res.data.modifier_id;
          const idx = modifierItems.value.findIndex(m => m.id === mId);
          if (idx !== -1) {
            modifierItems.value[idx].total_servings = res.data.total_servings;
          }
        }
      } else {
        if (actionType.value === 'fry') {
          successMsg = `ทอดสุกสำเร็จ: หักของสดไป ${qty} ชิ้น และเพิ่มของทอดพร้อมขาย`;
        } else {
          successMsg = actionType.value === 'restock' ? 'เติมสต็อกสำเร็จ' : 'ปรับสต็อกสำเร็จ';
        }
        if (res.data) {
          store.updateStock(res.data.id, res.data.stock, res.data.raw_stock);
        }
      }
      ui.showToast(successMsg, 'success');
      showActionModal.value = false;
    }
  } catch (e) {
    console.error(e);
    ui.showToast('บันทึกยอดคลังล้มเหลว: ' + e.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

const viewLogs = async (item, isMod = false) => {
  activeItem.value = item;
  activeIsModifier.value = isMod;
  showLogsModal.value = true;
  logsLoading.value = true;
  try {
    const res = isMod
      ? await api.modifiers.getLogs(item.id)
      : await api.stock.getLogs(item.id);
    logs.value = res.data?.logs || res.data || res || [];
  } catch (e) {
    console.error(e);
    ui.showToast('ไม่สามารถดึงข้อมูลประวัติสต็อกได้', 'error');
  } finally {
    logsLoading.value = false;
  }
};

const getReasonLabel = (reason) => {
  const map = {
    'sale': 'หักจากการขาย',
    'restock': 'เติมสต็อกสินค้า',
    'adjustment': 'ปรับปรุงจำนวนสต็อก',
    'waste': 'สินค้าเสีย/ทิ้ง',
    'cancel_restore': 'คืนสต็อก (ยกเลิกบิล)',
    'staff_benefit': 'แจกพนักงาน/เครดิต'
  };
  return map[reason] || reason;
};

const getReasonIconClass = (reason) => {
  const map = {
    'sale': 'fa-solid fa-cart-shopping',
    'restock': 'fa-solid fa-plus',
    'adjustment': 'fa-solid fa-wrench',
    'waste': 'fa-solid fa-trash-can',
    'cancel_restore': 'fa-solid fa-rotate-left',
    'staff_benefit': 'fa-solid fa-utensils'
  };
  return map[reason] || 'fa-solid fa-circle-info';
};

const getActionIconClass = (type, isMod) => {
  if (isMod) {
    return type === 'restock' ? 'fa-solid fa-plus' : 'fa-solid fa-wrench';
  }
  const map = {
    'fry': 'fa-solid fa-fire',
    'restock': 'fa-solid fa-plus',
    'waste': 'fa-solid fa-trash-can',
    'staff_benefit': 'fa-solid fa-user-check',
    'adjust': 'fa-solid fa-wrench'
  };
  return map[type] || 'fa-solid fa-wrench';
};

const getActionTitleLabel = (type, isMod) => {
  if (isMod) {
    return type === 'restock' ? 'เติมสต็อกเครื่องปรุง' : 'ปรับปรุงยอดเครื่องปรุง';
  }
  const map = {
    'fry': 'ทอดสินค้า',
    'restock': 'เติมสต็อกสินค้า',
    'waste': 'บันทึกสินค้าเสีย',
    'staff_benefit': 'บันทึกเครดิตพนักงาน',
    'adjust': 'ปรับปรุงยอดสต็อก'
  };
  return map[type] || 'ปรับปรุงยอดสต็อก';
};

const formatModifierStock = (item) => {
  if (!item) return '';
  if (item.category === 'sauce_small') {
    return `${item.total_servings} ซอง`;
  }
  const servingsPerBag = item.servings_per_bag || 50;
  const bags = Math.floor(item.total_servings / servingsPerBag);
  const servings = Math.round((item.total_servings % servingsPerBag) * 100) / 100;
  
  let text = '';
  if (bags > 0) text += `${bags} ถุง`;
  if (servings > 0 || bags === 0) {
    if (text) text += ' ';
    text += `${servings} รอบ`;
  }
  return text;
};

const isModifierLowStock = (item) => {
  if (!item) return false;
  if (item.category === 'sauce_small') {
    return item.total_servings <= 20;
  }
  return item.total_servings <= 30; // under 1 bag
};

const getModifierCategoryLabel = (category) => {
  const map = {
    'sauce_small': 'ซอส (ซองเล็ก)',
    'sauce_large': 'ซอส (ถุงใหญ่)',
    'dipping': 'น้ำจิ้ม',
    'powder': 'ผงปรุงรส'
  };
  return map[category] || category;
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

onMounted(() => {
  loadSettings();
  loadStockData(false);
});
</script>

<style scoped>
/* Responsive container controls */
.mobile-stock-list-container {
  display: none;
}

.stock-page-title {
  font-size: 1.25rem;
  font-weight: bold;
  color: var(--text-secondary);
  text-align: left;
}
@media (max-width: 768px) {
  .stock-page-title {
    font-size: 1.1rem !important;
    font-weight: bold !important;
    text-align: center !important;
  }
}
@media (max-width: 576px) {
  .mobile-stock-header-card {
    flex-direction: column !important;
    align-items: stretch !important;
    text-align: center !important;
  }
  .mobile-stock-header-card > div {
    text-align: center !important;
  }
  .mobile-stock-header-card .btn {
    width: 100% !important;
  }
}

.desktop-stock-table-container {
  display: block;
}

.btn-danger-outline {
  background: rgba(255, 59, 48, 0.08) !important;
  color: #ff3b30 !important;
  border: 1px solid rgba(255, 59, 48, 0.2) !important;
}

.btn-warning-outline {
  background: rgba(255, 149, 0, 0.08) !important;
  color: #ff9500 !important;
  border: 1px solid rgba(255, 149, 0, 0.2) !important;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .desktop-stock-table-container {
    display: none;
  }
  
  .mobile-stock-list-container {
    display: block;
    width: 100%;
  }
  
  .mobile-stock-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding-bottom: var(--space-2xl);
  }
  
  .mobile-stock-card {
    background: #ffffff;
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
  
  .mobile-stock-card.out-of-stock-card {
    border-color: rgba(173, 40, 30, 0.2);
    background: #fff5f5;
  }
  
  .mobile-stock-card-body {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    width: 100%;
  }
  
  .mobile-stock-card-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    text-align: left;
  }
  
  .mobile-stock-card-name {
    font-size: var(--font-md);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
    word-break: break-word;
  }
  
  .mobile-stock-card-id {
    font-size: var(--font-xs);
    color: var(--text-tertiary);
  }
  
  .mobile-stock-card-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-xs);
    flex-shrink: 0;
  }
  
  .mobile-stock-card-qty {
    font-size: var(--font-md);
    font-weight: var(--font-weight-bold);
    color: var(--text-secondary);
  }
  
  .mobile-stock-card-qty.text-danger {
    color: var(--danger) !important;
  }
  
  .mobile-stock-card-badge {
    display: flex;
    align-items: center;
  }
  
  .mobile-stock-card-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-sm);
    margin-top: var(--space-md);
    padding-top: var(--space-md);
    border-top: 1px dashed var(--border-color);
    width: 100%;
  }
  
  .mobile-stock-card-actions .btn {
    width: 100% !important;
    height: 44px !important;
    font-size: var(--font-sm) !important;
    justify-content: center !important;
    padding: 0 !important;
    margin: 0 !important;
  }
}

.table-row-hover:hover {
  background: rgba(139, 3, 19, 0.015) !important;
}

/* --- Stock Item --- */
.stock-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-md);
}

.stock-item .stock-level {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-md);
}

.stock-level.plenty {
  background: rgba(42, 157, 143, 0.15);
  color: var(--success);
}

.stock-level.medium {
  background: rgba(244, 162, 97, 0.15);
  color: var(--accent);
}

.stock-level.low {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger-light);
}

.stock-level.unlimited {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-tertiary);
  font-size: var(--font-xs);
}

.stock-item .stock-info {
  flex: 1;
  min-width: 0;
}

.stock-item .stock-name {
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-base);
  margin-bottom: 2px;
}

.stock-item .stock-meta {
  font-size: var(--font-sm);
  color: var(--text-secondary);
}

.stock-actions {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
  justify-content: center;
}

.stock-actions .btn {
  padding: 10px 18px !important;
  font-size: var(--font-sm) !important;
  font-weight: var(--font-weight-semibold) !important;
  min-height: 44px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: var(--radius-md) !important;
  gap: 4px !important;
}

/* --- Stock History / Logs --- */
.log-entry {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  padding: var(--space-md) 0;
  border-bottom: 1px solid var(--border-color);
  font-size: var(--font-sm);
}

.log-entry:last-child {
  border-bottom: none;
}

.log-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-sm);
  flex-shrink: 0;
}

.log-icon.add { background: rgba(42, 157, 143, 0.15); color: var(--success); }
.log-icon.remove { background: rgba(239, 68, 68, 0.15); color: var(--danger-light); }
.log-icon.adjust { background: rgba(244, 162, 97, 0.15); color: var(--accent); }

.log-details { flex: 1; }
.log-action { font-weight: var(--font-weight-medium); }
.log-time { color: var(--text-tertiary); font-size: var(--font-xs); }
.log-note { color: var(--text-secondary); font-size: var(--font-xs); margin-top: 2px; }

/* --- Expandable section --- */
.expandable-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  cursor: pointer;
  user-select: none;
}

.expandable-header .expand-arrow {
  transition: transform var(--transition-base);
  color: var(--text-tertiary);
}

.expandable-header.expanded .expand-arrow {
  transform: rotate(180deg);
}

.expandable-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height var(--transition-slow);
}

.expandable-content.expanded {
  max-height: 500px;
}

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
</style>
