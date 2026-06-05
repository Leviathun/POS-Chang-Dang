<template>
  <div id="stock-page" class="page-enter">
    
    <!-- Info Header Card -->
    <div class="card mb-lg p-md flex flex-between align-center mobile-stock-header-card" style="gap: var(--space-md); flex-wrap: wrap;">
      <div style="font-size: var(--font-sm); color: var(--text-secondary); text-align: left;">
        ระบบจัดการคลังวัตถุดิบและสต็อกสินค้าของร้านไก่ทอดช้างแดง
      </div>
      <div>
        <button class="btn btn-primary" style="background: linear-gradient(135deg, #e63946, #b7091b); color: white; border: none; font-weight: bold; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-md); gap: var(--space-xs); padding: 10px 20px;" @click="openBulkModal">
          📦 จัดการสต็อกด่วน
        </button>
      </div>
    </div>

    <!-- Desktop Stock Table (Visible on desktop only) -->
    <div class="card p-0 overflow-hidden mb-lg desktop-stock-table-container">
      <div style="overflow-x: auto;">
        <table class="table" style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-color); background: rgba(139, 3, 19, 0.03);">
              <th style="padding: var(--space-md); text-align: center; width: 30%;">เมนูอาหาร</th>
              <th style="padding: var(--space-md); text-align: center; width: 20%;">ของสด (🥩)</th>
              <th style="padding: var(--space-md); text-align: center; width: 20%;">ทอดสุก/พร้อมขาย (🍗)</th>
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
                  <a href="#" style="color: var(--accent); text-decoration: underline;" @click.prevent="viewLogs(item)">📋 ดูประวัติสต็อก</a>
                </div>
              </td>
              <!-- Raw Quantity -->
              <td style="padding: var(--space-md); text-align: center; vertical-align: middle;">
                <span v-if="item.raw_quantity !== null && item.raw_quantity !== undefined" :class="{ 'text-danger': (item.raw_quantity || 0) <= lowStockThreshold }" style="font-weight: bold;">
                  {{ item.raw_quantity }} ชิ้น
                  <span v-if="(item.raw_quantity || 0) <= lowStockThreshold && (item.raw_quantity || 0) > 0" style="display:block; font-size: 10px; font-weight:normal;">⚠️ ใกล้หมด</span>
                  <span v-if="(item.raw_quantity || 0) <= 0" style="display:block; font-size: 10px; font-weight:normal;">❌ หมดเกลี้ยง</span>
                </span>
                <span v-else style="color: var(--text-tertiary); font-style: italic;">-</span>
              </td>
              <!-- Cooked Quantity -->
              <td style="padding: var(--space-md); text-align: center; vertical-align: middle;">
                <span :class="{ 'text-danger': (item.quantity !== null && item.quantity !== undefined ? item.quantity : 0) <= lowStockThreshold }" style="font-weight: bold;">
                  {{ item.quantity !== null && item.quantity !== undefined ? item.quantity : 0 }} ชิ้น
                  <span v-if="(item.quantity !== null && item.quantity !== undefined ? item.quantity : 0) <= lowStockThreshold && (item.quantity !== null && item.quantity !== undefined ? item.quantity : 0) > 0" style="display:block; font-size: 10px; font-weight:normal;">⚠️ ใกล้หมด</span>
                  <span v-if="(item.quantity !== null && item.quantity !== undefined ? item.quantity : 0) <= 0" style="display:block; font-size: 10px; font-weight:normal;">❌ หมดเกลี้ยง</span>
                </span>
              </td>
              <!-- Actions -->
              <td style="padding: var(--space-md); text-align: center; vertical-align: middle;">
                <div class="stock-actions flex justify-center gap-sm" style="flex-wrap: wrap;">
                  <button v-if="item.raw_quantity !== null && item.raw_quantity !== undefined" class="btn btn-primary" style="background: linear-gradient(135deg, #ff4500, #ff8c00); color: white;" @click="openActionModal('fry', item)">🔥 ทอดสินค้า</button>
                  <button class="btn" style="background:rgba(255,59,48,0.1); color:#ff3b30; border:1px solid rgba(255,59,48,0.2);" @click="openActionModal('waste', item)">🗑️ ของเสีย</button>
                  <button class="btn" style="background:rgba(255,149,0,0.1); color:#ff9500; border:1px solid rgba(255,149,0,0.2);" @click="openActionModal('staff_benefit', item)">🍴 เครดิต</button>
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
                <a href="#" style="color: var(--accent); text-decoration: underline;" @click.prevent="viewLogs(item)">📋 ประวัติ</a>
              </div>
            </div>
            
            <!-- Right: Stock Quantity & Badge -->
            <div class="mobile-stock-card-meta">
              <div v-if="item.raw_quantity !== null && item.raw_quantity !== undefined" class="flex flex-column align-end gap-xs" style="text-align: right;">
                <div style="font-size: var(--font-sm); color: var(--text-secondary); margin-bottom: 2px;">
                  ทอดแล้ว: <strong :class="{ 'text-danger': (item.quantity || 0) <= lowStockThreshold }">{{ item.quantity || 0 }} ชิ้น</strong>
                </div>
                <div style="font-size: var(--font-sm); color: var(--text-secondary);">
                  ของสด: <strong :class="{ 'text-danger': (item.raw_quantity || 0) <= lowStockThreshold }">{{ item.raw_quantity || 0 }} ชิ้น</strong>
                </div>
              </div>
              <div 
                v-else
                class="mobile-stock-card-qty"
                :class="{ 'text-danger': (item.quantity !== null && item.quantity !== undefined ? item.quantity : 0) <= lowStockThreshold }"
              >
                {{ item.quantity !== null && item.quantity !== undefined ? item.quantity : 0 }} ชิ้น
              </div>
              
              <div class="mobile-stock-card-badge">
                <span 
                  v-if="item.raw_quantity !== null && item.raw_quantity !== undefined && (item.quantity || 0) <= lowStockThreshold && (item.raw_quantity || 0) <= lowStockThreshold"
                  class="badge badge-danger badge-sm"
                  style="display: block; font-size: 0.65rem;"
                >
                  🚨 ของใกล้หมดทั้งคู่
                </span>
                <span 
                  v-else-if="(item.quantity !== null && item.quantity !== undefined ? item.quantity : 0) <= lowStockThreshold && (item.quantity !== null && item.quantity !== undefined ? item.quantity : 0) > 0" 
                  class="badge badge-warning badge-sm"
                  style="display: block; font-size: 0.65rem;"
                >
                  ⚠️ ใกล้หมด
                </span>
                <span 
                  v-else-if="(item.quantity !== null && item.quantity !== undefined ? item.quantity : 0) <= 0" 
                  class="badge badge-danger badge-sm"
                  style="display: block; font-size: 0.65rem;"
                >
                  ❌ หมดเกลี้ยง
                </span>
              </div>
            </div>
          </div>
          
          <!-- Bottom Stock Actions in 2x2 Grid + Full width Fry Button if applicable -->
          <div class="mobile-stock-card-actions">
            <!-- Fry chicken/cooked food button -->
            <button 
              v-if="item.raw_quantity !== null && item.raw_quantity !== undefined" 
              class="btn btn-primary" 
              style="grid-column: span 2; background: linear-gradient(135deg, #ff4500, #ff8c00); color: white;" 
              @click="openActionModal('fry', item)"
            >
              🔥 ทอดสินค้า (หักของสด ➔ ทอดสุก)
            </button>
            <button class="btn btn-danger-outline" @click="openActionModal('waste', item)">🗑️ ของเสีย</button>
            <button class="btn btn-warning-outline" @click="openActionModal('staff_benefit', item)">🍴 เครดิต</button>
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
            {{ actionType === 'fry' ? '🔥 ทอดสินค้า' : actionType === 'restock' ? '➕ เติมสต็อกสินค้า' : actionType === 'waste' ? '🗑️ บันทึกสินค้าเสีย' : actionType === 'staff_benefit' ? '🍴 บันทึกเครดิตพนักงาน' : '🔧 ปรับปรุงยอดสต็อก' }}
          </h3>
          <button class="modal-close" @click="showActionModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="mb-md font-bold" style="font-size: var(--font-base); text-align: center;">
            {{ activeItem?.name }}
          </div>
          <div style="font-size: var(--font-sm); color: var(--text-secondary); text-align: center; margin-bottom: var(--space-lg);">
            <span v-if="activeItem?.raw_quantity !== null && activeItem?.raw_quantity !== undefined">
              ทอดสุกแล้ว: <strong>{{ activeItem?.quantity || 0 }} ชิ้น</strong> | ของสด: <strong>{{ activeItem?.raw_quantity || 0 }} ชิ้น</strong>
            </span>
            <span v-else>
              จำนวนคงเหลือในระบบปัจจุบัน: <strong>{{ activeItem?.quantity !== null && activeItem?.quantity !== undefined ? activeItem?.quantity : 0 }} ชิ้น</strong>
            </span>
          </div>

          <!-- Stock Type Selector (Only if tracks raw stock and not fry mode) -->
          <div v-if="activeItem?.raw_quantity !== null && activeItem?.raw_quantity !== undefined && actionType !== 'fry'" class="form-group">
            <label class="form-label font-bold">จัดการสต็อกส่วนใด? *</label>
            <div style="display:flex; gap:var(--space-sm); margin-bottom:var(--space-md);">
              <button 
                class="btn flex-1"
                :class="actionForm.stock_type === 'cooked' ? 'btn-primary' : 'btn-secondary'"
                @click="actionForm.stock_type = 'cooked'"
                type="button"
                style="min-height:38px; padding: 0 !important; font-size: var(--font-xs) !important;"
              >
                🍗 ทอดสุก ({{ activeItem?.quantity || 0 }} ชิ้น)
              </button>
              <button 
                class="btn flex-1"
                :class="actionForm.stock_type === 'raw' ? 'btn-primary' : 'btn-secondary'"
                @click="actionForm.stock_type = 'raw'"
                type="button"
                style="min-height:38px; padding: 0 !important; font-size: var(--font-xs) !important;"
              >
                🥩 ของสด ({{ activeItem?.raw_quantity || 0 }} ชิ้น)
              </button>
            </div>
          </div>

          <!-- Quantity input -->
          <div class="form-group">
            <label class="form-label">
              {{ actionType === 'fry' ? 'จำนวนที่ต้องการทอด (ชิ้น) *' : actionType === 'restock' ? 'จำนวนที่ต้องการเติม (ชิ้น) *' : 'จำนวนที่ต้องการหัก (ชิ้น) *' }}
            </label>
            <input 
              type="number" 
              class="form-input" 
              v-model.number="actionForm.quantity" 
              placeholder="ใส่ตัวเลข..." 
              min="0"
            />
          </div>

          <div v-if="actionType === 'fry'" style="font-size: var(--font-xs); color: var(--text-tertiary); margin-top: -8px; margin-bottom: var(--space-md); text-align: left;">
            * ระบบจะหักออกจากสต็อก "ของสด" และเพิ่มเข้าสต็อก "ทอดสุกพร้อมขาย" ทันที
          </div>

          <!-- Waste Preset Notes -->
          <div v-if="actionType === 'waste'" class="form-group">
            <label class="form-label">สาเหตุของเสีย</label>
            <div style="display:flex; gap:var(--space-sm); flex-wrap:wrap;">
              <button 
                v-for="preset in wastePresets" :key="preset"
                class="btn btn-sm"
                :class="actionForm.note === preset ? 'btn-primary' : 'btn-secondary'"
                @click="actionForm.note = preset"
                style="min-height:38px;"
              >{{ preset }}</button>
            </div>
          </div>

          <!-- Note/Reason -->
          <div class="form-group">
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
              :disabled="actionForm.quantity === '' || actionForm.quantity === null || actionForm.quantity <= 0" 
              @click="handleSaveAction"
            >
              {{ actionType === 'fry' ? '🔥 เริ่มทอดสินค้า' : '💾 บันทึกสต็อก' }}
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
          <h3>📊 ประวัติการเข้า-ออกของสต็อก</h3>
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
                <div class="font-bold">
                  {{ getReasonLabel(log.reason) }}
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

    <!-- Bulk Stock Management Modal -->
    <div v-if="showBulkModal" class="modal-container active" style="display:flex; align-items:center; justify-content:center; position: fixed; inset:0; z-index:1000;">
      <div class="modal-overlay" @click="showBulkModal = false"></div>
      <div class="modal-content modal-center w-full max-w-lg" style="position:relative; z-index:2; overflow-y:auto; max-height:90dvh;">
        <div class="modal-header">
          <h3>📦 จัดการสต็อกด่วน</h3>
          <button class="modal-close" @click="showBulkModal = false">✕</button>
        </div>
        <div class="modal-body">
          
          <!-- Tabs -->
          <div class="bulk-tabs">
            <button 
              class="bulk-tab" 
              :class="{ 'active': bulkTab === 'relative' }" 
              @click="setBulkTab('relative')"
            >
              📥 เพิ่มสต็อก (Relative)
            </button>
            <button 
              class="bulk-tab" 
              :class="{ 'active': bulkTab === 'absolute' }" 
              @click="setBulkTab('absolute')"
            >
              🔧 ปรับปรุงยอด (Absolute)
            </button>
          </div>

          <!-- Description Hint -->
          <div class="mb-md" style="font-size: var(--font-xs); color: var(--text-secondary); text-align: left;">
            <span v-if="bulkTab === 'relative'">
              💡 <strong>โหมดเพิ่มสต็อกสัมพัทธ์ (Relative):</strong> พิมพ์จำนวนที่นำเข้าเพิ่ม (เช่น <code>30</code> หรือ <code>+30</code>) หรือจำนวนที่หักออก (เช่น <code>-5</code>) ปล่อยว่างหรือกรอก <code>0</code> หากไม่มีความเปลี่ยนแปลง
            </span>
            <span v-else>
              💡 <strong>โหมดปรับปรุงยอดนับจริง (Absolute):</strong> นับจำนวนจริงบนชั้นวางแล้วกรอกยอดสุดท้ายตรงๆ ระบบจะทำการคำนวณส่วนต่างเดลต้าและบันทึกเหตุผลให้โดยอัตโนมัติ
            </span>
          </div>

          <!-- Form List -->
          <div class="bulk-stock-list">
            <!-- Modal Table Header (Visible on Desktop only) -->
            <div class="bulk-stock-header-row desktop-only">
              <div style="text-align: left; padding-left: var(--space-sm);">เมนูอาหาร</div>
              <div style="text-align: center;">ของสดคงเหลือ</div>
              <div style="text-align: center;">ปรับยอดของสด (🥩)</div>
              <div style="text-align: center;">ทอดสุกคงเหลือ</div>
              <div style="text-align: center;">ปรับยอดทอดสุก (🍗)</div>
            </div>
            
            <div v-for="item in bulkFormItems" :key="item.menu_item_id" class="bulk-stock-row">
              <!-- Column 1: Item Name -->
              <div class="bulk-item-name-col">
                <div class="font-bold" style="font-size: var(--font-sm);">{{ item.name }}</div>
                <div class="mobile-only" style="font-size: 10px; color: var(--text-tertiary); margin-top: 2px;">ID: {{ item.menu_item_id }}</div>
              </div>
              
              <!-- Column 2: Raw Stock Current -->
              <div class="bulk-item-current-col text-center">
                <span class="mobile-label">🥩 ของสดคงเหลือ:</span>
                <span :class="{ 'text-danger': item.raw_quantity !== null && (item.raw_quantity || 0) <= lowStockThreshold }" style="font-weight: bold; font-size: var(--font-sm);">
                  {{ item.raw_quantity !== null && item.raw_quantity !== undefined ? item.raw_quantity + ' ชิ้น' : '-' }}
                </span>
              </div>
              
              <!-- Column 3: Raw Stock Input -->
              <div class="bulk-item-input-col">
                <div class="bulk-input-wrapper">
                  <span class="mobile-label" style="margin-bottom: 2px;">🥩 ปรับยอดของสด:</span>
                  <input 
                    type="text" 
                    v-model="item.raw"
                    :disabled="item.raw_quantity === null || item.raw_quantity === undefined || !isAdmin()"
                    :placeholder="item.raw_quantity === null || item.raw_quantity === undefined ? '🔒 ไม่มีของสด' : (!isAdmin() ? '🔒 ล็อก' : (bulkTab === 'relative' ? '0' : String(item.raw_quantity)))"
                    class="form-input"
                    :class="{ 'disabled-input': item.raw_quantity === null || item.raw_quantity === undefined || !isAdmin() }"
                  />
                </div>
              </div>
              
              <!-- Column 4: Cooked Stock Current -->
              <div class="bulk-item-current-col text-center">
                <span class="mobile-label">🍗 ทอดสุกคงเหลือ:</span>
                <span :class="{ 'text-danger': (item.quantity !== null && item.quantity !== undefined ? item.quantity : 0) <= lowStockThreshold }" style="font-weight: bold; font-size: var(--font-sm);">
                  {{ item.quantity !== null && item.quantity !== undefined ? item.quantity + ' ชิ้น' : '0 ชิ้น' }}
                </span>
              </div>
              
              <!-- Column 5: Cooked Stock Input -->
              <div class="bulk-item-input-col">
                <div class="bulk-input-wrapper">
                  <span class="mobile-label" style="margin-bottom: 2px;">🍗 ปรับยอดทอดสุก:</span>
                  <input 
                    type="text" 
                    v-model="item.cooked"
                    :placeholder="bulkTab === 'relative' ? '0' : (item.quantity !== null && item.quantity !== undefined ? String(item.quantity) : '0')"
                    class="form-input"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Absolute Reconcile Preset Reason & Notes -->
          <div v-if="bulkTab === 'absolute'" class="absolute-reason-section mt-md" style="text-align: left;">
            <div class="form-group mb-sm">
              <label class="form-label font-bold" style="font-size: var(--font-xs);">เหตุผลในการปรับยอดจริง *</label>
              <select v-model="bulkReasonPreset" class="form-input" style="height: 38px;">
                <option value="นับยอดขาด/เกิน">📊 นับยอดขาด/เกิน</option>
                <option value="กรอกผิด">✏️ กรอกผิด (แก้ไขยอด)</option>
                <option value="อื่นๆ">❓ อื่นๆ</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size: var(--font-xs);">คำอธิบายเพิ่มเติม (ถ้ามี)</label>
              <input 
                type="text" 
                v-model="bulkNote" 
                placeholder="ระบุข้อความเพื่อบันทึกประวัติ..." 
                class="form-input"
                style="height: 38px;"
              />
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-md mt-lg">
            <button class="btn btn-secondary flex-1" @click="showBulkModal = false" style="height: 44px;">ยกเลิก</button>
            <button 
              class="btn btn-primary flex-1" 
              style="background: linear-gradient(135deg, #e63946, #b7091b); color: white; border: none; height: 44px;"
              @click="handleSaveBulkAdjust"
            >
              💾 บันทึกสต็อกด่วน
            </button>
          </div>

        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../api';
import { ui, formatDateTime, isAdmin } from '../helpers';

import { store } from '../store';

// States
const stockItems = computed(() => store.stockItems);
const loading = ref(true);
const lowStockThreshold = computed(() => store.lowStockThreshold);
const showActionModal = ref(false);
const showLogsModal = ref(false);
const actionType = ref('restock'); // 'restock', 'adjust', 'waste', or 'staff_benefit'
const activeItem = ref(null);
const logs = ref([]);
const logsLoading = ref(false);
const wastePresets = ['🍂 เน่า/เสีย', '🛹 ตกพื้น/เสียหาย'];

const actionForm = ref({
  quantity: '',
  note: ''
});

// Bulk Stock Management States
const showBulkModal = ref(false);
const bulkTab = ref('relative'); // 'relative' or 'absolute'
const bulkFormItems = ref([]);
const bulkReasonPreset = ref('นับยอดขาด/เกิน');
const bulkNote = ref('');

// Load System Settings to check Low Stock Threshold
const loadSettings = async () => {
  try {
    const res = await api.settings.getAll();
    if (res.success && res.data.low_stock_threshold) {
      lowStockThreshold.value = Number(res.data.low_stock_threshold) || 5;
    }
  } catch (e) {
    console.warn(e);
  }
};

const loadStockData = async (force = false) => {
  try {
    await store.fetchStock(force);
  } catch (e) {
    console.error(e);
    ui.showToast('ไม่สามารถโหลดข้อมูลคลังสินค้าได้', 'error');
  } finally {
    loading.value = false;
  }
};

// Actions Handlers
const openActionModal = (type, item) => {
  actionType.value = type;
  activeItem.value = item;
  actionForm.value = {
    quantity: '',
    stock_type: 'cooked', // default to cooked stock
    note: ''
  };
  showActionModal.value = true;
};

const handleSaveAction = async () => {
  ui.showLoading();
  try {
    const itemId = activeItem.value.id;
    const qty = Number(actionForm.value.quantity) || 0;
    const note = actionForm.value.note.trim();
    const stockType = actionForm.value.stock_type;

    let res;
    if (actionType.value === 'fry') {
      res = await api.stock.fry(itemId, { quantity: qty, note });
    } else if (actionType.value === 'restock') {
      res = await api.stock.restock(itemId, { quantity: qty, stock_type: stockType, note });
    } else {
      // For adjust, waste, and staff_benefit — send negative qty and reason
      const reason = actionType.value === 'waste' ? 'waste' : actionType.value === 'staff_benefit' ? 'staff_benefit' : 'adjustment';
      const delta = actionType.value === 'adjust' ? qty : -Math.abs(qty);
      res = await api.stock.adjust(itemId, { quantity: delta, reason, stock_type: stockType, note });
    }

    if (res.success) {
      store.clearMenuCache(); // Invalidate menu cache so POS updates stock!
      let successMsg = 'บันทึกยอดคลังเรียบร้อย';
      if (actionType.value === 'fry') {
        successMsg = `ทอดสุกสำเร็จ: หักของสดไป ${qty} ชิ้น และเพิ่มของทอดพร้อมขาย`;
      } else {
        successMsg = actionType.value === 'restock' ? 'เติมสต็อกสำเร็จ' : 'ปรับสต็อกสำเร็จ';
      }
      ui.showToast(successMsg, 'success');
      showActionModal.value = false;
      loadStockData(true);
    }
  } catch (e) {
    console.error(e);
    ui.showToast('บันทึกยอดคลังล้มเหลว: ' + e.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

const viewLogs = async (item) => {
  activeItem.value = item;
  showLogsModal.value = true;
  logsLoading.value = true;
  try {
    const res = await api.stock.getLogs(item.id);
    logs.value = res.data?.logs || res.data || res || [];
  } catch (e) {
    console.error(e);
    ui.showToast('ไม่สามารถดึงข้อมูลประวัติสต็อกได้', 'error');
  } finally {
    logsLoading.value = false;
  }
};

const openBulkModal = () => {
  bulkTab.value = 'relative';
  bulkReasonPreset.value = 'นับยอดขาด/เกิน';
  bulkNote.value = '';
  
  bulkFormItems.value = stockItems.value.map(item => {
    return {
      menu_item_id: item.id,
      name: item.name,
      quantity: item.quantity,
      raw_quantity: item.raw_quantity,
      cooked: '',
      raw: ''
    };
  });
  
  showBulkModal.value = true;
};

const setBulkTab = (tab) => {
  bulkTab.value = tab;
  
  bulkFormItems.value.forEach(item => {
    if (tab === 'absolute') {
      item.cooked = item.quantity !== null && item.quantity !== undefined ? item.quantity : 0;
      item.raw = item.raw_quantity !== null && item.raw_quantity !== undefined ? item.raw_quantity : 0;
    } else {
      item.cooked = '';
      item.raw = '';
    }
  });
};

const handleSaveBulkAdjust = async () => {
  ui.showLoading();
  try {
    const itemsToSend = [];
    
    for (const item of bulkFormItems.value) {
      let hasChange = false;
      
      const cookedVal = item.cooked !== null && item.cooked !== undefined && String(item.cooked).trim() !== '' ? String(item.cooked).trim() : null;
      const rawVal = item.raw !== null && item.raw !== undefined && String(item.raw).trim() !== '' ? String(item.raw).trim() : null;
      
      const parsedCooked = cookedVal !== null ? Number(cookedVal) : null;
      const parsedRaw = rawVal !== null ? Number(rawVal) : null;
      
      if (bulkTab.value === 'relative') {
        if ((parsedCooked !== null && parsedCooked !== 0 && !isNaN(parsedCooked)) || 
            (parsedRaw !== null && parsedRaw !== 0 && !isNaN(parsedRaw))) {
          hasChange = true;
        }
      } else {
        const currentCooked = item.quantity !== null && item.quantity !== undefined ? item.quantity : 0;
        const currentRaw = item.raw_quantity !== null && item.raw_quantity !== undefined ? item.raw_quantity : 0;
        
        const targetCooked = parsedCooked !== null && !isNaN(parsedCooked) ? parsedCooked : currentCooked;
        const targetRaw = parsedRaw !== null && !isNaN(parsedRaw) ? parsedRaw : currentRaw;
        
        if (targetCooked !== currentCooked || targetRaw !== currentRaw) {
          hasChange = true;
        }
      }
      
      if (hasChange) {
        itemsToSend.push({
          menu_item_id: item.menu_item_id,
          cooked: cookedVal,
          raw: rawVal
        });
      }
    }
    
    if (itemsToSend.length === 0) {
      ui.showToast('ไม่มีรายการใดที่มีความเปลี่ยนแปลง', 'info');
      ui.hideLoading();
      return;
    }
    
    const payload = {
      mode: bulkTab.value,
      items: itemsToSend,
      reason_preset: bulkTab.value === 'absolute' ? bulkReasonPreset.value : undefined,
      note: bulkTab.value === 'absolute' ? bulkNote.value.trim() : undefined
    };
    
    const res = await api.stock.bulkAdjust(payload);
    if (res.success) {
      store.clearMenuCache();
      ui.showToast('ปรับปรุงสต็อกด่วนเรียบร้อย', 'success');
      showBulkModal.value = false;
      await loadStockData(true);
    }
  } catch (e) {
    console.error(e);
    ui.showToast('ปรับปรุงสต็อกด่วนล้มเหลว: ' + e.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

const getReasonLabel = (reason) => {
  const map = {
    'sale': '🛒 หักจากการขาย',
    'restock': '➕ เติมสต็อกสินค้า',
    'adjustment': '🔧 ปรับปรุงจำนวนสต็อก',
    'waste': '🗑️ สินค้าเสีย/ทิ้ง',
    'cancel_restore': '🔄 คืนสต็อก (ยกเลิกบิล)',
    'staff_benefit': '🍴 แจกพนักงาน/เครดิต'
  };
  return map[reason] || reason;
};

onMounted(() => {
  loadSettings();
  loadStockData();
});
</script>

<style scoped>
/* Responsive container controls */
.mobile-stock-list-container {
  display: none;
}

/* Bulk Stock Edit UI Styles */
.bulk-tabs {
  display: flex;
  gap: var(--space-xs);
  border-bottom: 1px solid var(--border-color);
  margin-bottom: var(--space-md);
}
.bulk-tab {
  flex: 1;
  padding: 12px 8px;
  text-align: center;
  cursor: pointer;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: var(--text-secondary);
  font-size: var(--font-sm);
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-base);
}
.bulk-tab:hover {
  color: var(--text-primary);
}
.bulk-tab.active {
  border-bottom-color: var(--accent);
  color: var(--accent);
  font-weight: var(--font-weight-bold);
}
.bulk-stock-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  max-height: 40vh;
  overflow-y: auto;
  padding-right: var(--space-xs);
  margin-bottom: var(--space-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0;
  background: rgba(139, 3, 19, 0.01);
}
.bulk-stock-header-row {
  display: grid;
  grid-template-columns: 2fr 1.2fr 1.2fr 1.2fr 1.2fr;
  padding: var(--space-sm);
  background: rgba(139, 3, 19, 0.05);
  border-bottom: 2px solid var(--border-color);
  font-size: var(--font-xs);
  font-weight: bold;
  color: var(--text-secondary);
}
.bulk-stock-row {
  display: grid;
  grid-template-columns: 2fr 1.2fr 1.2fr 1.2fr 1.2fr;
  align-items: center;
  padding: var(--space-sm);
  border-bottom: 1px solid var(--border-color);
  gap: var(--space-sm);
}
.bulk-stock-row:last-child {
  border-bottom: none;
}
.bulk-item-name-col {
  flex: 1;
  min-width: 0;
  text-align: left;
}
.bulk-item-current-col {
  font-size: var(--font-xs);
  color: var(--text-primary);
  text-align: center;
}
.bulk-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.bulk-input-wrapper input {
  height: 38px;
  padding: var(--space-xs);
  font-size: var(--font-sm);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  text-align: center;
  width: 100%;
}
.bulk-input-wrapper input:focus {
  border-color: var(--accent);
  outline: none;
}
.bulk-input-wrapper input.disabled-input {
  background: rgba(0, 0, 0, 0.05) !important;
  color: var(--text-tertiary) !important;
  cursor: not-allowed !important;
  opacity: 0.6 !important;
}
.mobile-label {
  display: none;
}
.mobile-only {
  display: none;
}
@media (max-width: 768px) {
  .desktop-only {
    display: none !important;
  }
  .bulk-stock-row {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-sm);
    padding: var(--space-md);
    background: rgba(255, 255, 255, 0.5);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-xs);
    border: 1px solid var(--border-color);
  }
  .mobile-label {
    display: inline-block;
    font-size: 11px;
    color: var(--text-tertiary);
    margin-right: var(--space-xs);
    width: 100px;
    text-align: left;
    flex-shrink: 0;
  }
  .mobile-only {
    display: block !important;
  }
  .bulk-item-current-col {
    display: flex;
    align-items: center;
    text-align: left !important;
    padding-left: var(--space-xs);
  }
  .bulk-item-input-col {
    display: flex;
    align-items: center;
  }
  .bulk-input-wrapper {
    flex: 1;
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
  
  .mobile-stock-card.out-of-stock-card {
    border-color: rgba(173, 40, 30, 0.2);
    background: rgba(173, 40, 30, 0.02);
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
</style>
