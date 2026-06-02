<template>
  <div id="stock-page" class="page-enter">
    
    <!-- Info Header Card -->
    <div class="card mb-lg p-md">
      <div style="font-size: var(--font-sm); color: var(--text-secondary);">
        ระบบจัดการคลังวัตถุดิบและสต็อกสินค้าของร้านไก่ทอดช้างแดง
      </div>
    </div>

    <!-- Desktop Stock Table (Visible on desktop only) -->
    <div class="card p-0 overflow-hidden mb-lg desktop-stock-table-container">
      <div style="overflow-x: auto;">
        <table class="table" style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-color); background: rgba(139, 3, 19, 0.03);">
              <th style="padding: var(--space-md); text-align: center;">เมนูอาหาร</th>
              <th style="padding: var(--space-md); text-align: center;">จำนวนคงเหลือ</th>
              <th style="padding: var(--space-md); text-align: center;">จัดการสต็อก</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="3" style="text-align: center; padding: var(--space-3xl);">
                <div class="spinner" style="margin: 0 auto;"></div>
              </td>
            </tr>
            <tr v-else-if="stockItems.length === 0">
              <td colspan="3" style="text-align: center; padding: var(--space-3xl); color: var(--text-tertiary);">
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
                <div style="font-size: var(--font-xs); color: var(--text-tertiary);">
                  ID: {{ item.id }}
                </div>
              </td>
              <!-- Quantity -->
              <td style="padding: var(--space-md); text-align: center; font-weight: bold; vertical-align: middle;">
                <span :class="{ 'text-danger': (item.quantity !== null && item.quantity !== undefined ? item.quantity : 0) <= lowStockThreshold }">
                  {{ item.quantity !== null && item.quantity !== undefined ? item.quantity : 0 }} ชิ้น
                  <span v-if="(item.quantity !== null && item.quantity !== undefined ? item.quantity : 0) <= lowStockThreshold && (item.quantity !== null && item.quantity !== undefined ? item.quantity : 0) > 0" style="display:block; font-size: 10px; font-weight:normal;">⚠️ ใกล้หมด</span>
                  <span v-if="(item.quantity !== null && item.quantity !== undefined ? item.quantity : 0) <= 0" style="display:block; font-size: 10px; font-weight:normal;">❌ หมดเกลี้ยง</span>
                </span>
              </td>
              <!-- Actions -->
              <td style="padding: var(--space-md); text-align: center; vertical-align: middle;">
                <div class="stock-actions flex justify-center gap-sm" style="flex-wrap: wrap;">
                  <button class="btn btn-success" @click="openActionModal('restock', item)">➕ เติมของ</button>
                  <button class="btn btn-secondary" @click="openActionModal('adjust', item)">🔧 ปรับปรุง</button>
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
              <div class="mobile-stock-card-id">ID: {{ item.id }}</div>
            </div>
            
            <!-- Right: Stock Quantity & Badge -->
            <div class="mobile-stock-card-meta">
              <div 
                class="mobile-stock-card-qty"
                :class="{ 'text-danger': (item.quantity !== null && item.quantity !== undefined ? item.quantity : 0) <= lowStockThreshold }"
              >
                {{ item.quantity !== null && item.quantity !== undefined ? item.quantity : 0 }} ชิ้น
              </div>
              <div class="mobile-stock-card-badge">
                <span 
                  v-if="(item.quantity !== null && item.quantity !== undefined ? item.quantity : 0) <= lowStockThreshold && (item.quantity !== null && item.quantity !== undefined ? item.quantity : 0) > 0" 
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
          
          <!-- Bottom Stock Actions in 2x2 Grid -->
          <div class="mobile-stock-card-actions">
            <button class="btn btn-success" @click="openActionModal('restock', item)">➕ เติมของ</button>
            <button class="btn btn-secondary" @click="openActionModal('adjust', item)">🔧 ปรับปรุง</button>
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
            {{ actionType === 'restock' ? '➕ เติมสต็อกสินค้า' : actionType === 'waste' ? '🗑️ บันทึกสินค้าเสีย' : actionType === 'staff_benefit' ? '🍴 บันทึกเครดิตพนักงาน' : '🔧 ปรับปรุงยอดสต็อก' }}
          </h3>
          <button class="modal-close" @click="showActionModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="mb-md font-bold" style="font-size: var(--font-base); text-align: center;">
            {{ activeItem?.name }}
          </div>
          <div style="font-size: var(--font-sm); color: var(--text-secondary); text-align: center; margin-bottom: var(--space-lg);">
            จำนวนคงเหลือในระบบปัจจุบัน: <strong>{{ activeItem?.quantity !== null && activeItem?.quantity !== undefined ? activeItem?.quantity : 0 }} ชิ้น</strong>
          </div>

          <!-- Quantity input -->
          <div class="form-group">
            <label class="form-label">
              {{ actionType === 'restock' ? 'จำนวนที่ต้องการเติม (ชิ้น) *' : 'จำนวนที่ต้องการหัก (ชิ้น) *' }}
            </label>
            <input 
              type="number" 
              class="form-input" 
              v-model.number="actionForm.quantity" 
              placeholder="ใส่ตัวเลข..." 
              min="0"
            />
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
              :disabled="actionForm.quantity === '' || actionForm.quantity === null" 
              @click="handleSaveAction"
            >
              💾 บันทึกสต็อก
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

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../api';
import { ui, formatDateTime } from '../helpers';

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

    let res;
    if (actionType.value === 'restock') {
      res = await api.stock.restock(itemId, { quantity: qty, note });
    } else {
      // For adjust, waste, and staff_benefit — send negative qty and reason
      const reason = actionType.value === 'waste' ? 'waste' : actionType.value === 'staff_benefit' ? 'staff_benefit' : 'adjustment';
      const delta = actionType.value === 'adjust' ? qty : -Math.abs(qty);
      res = await api.stock.adjust(itemId, { quantity: delta, reason, note });
    }

    if (res.success) {
      store.clearMenuCache(); // Invalidate menu cache so POS updates stock!
      ui.showToast(actionType.value === 'restock' ? 'เติมสต็อกเรียบร้อย' : 'ปรับสต็อกหน้าร้านสำเร็จ', 'success');
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
    logs.value = res.data || res || [];
  } catch (e) {
    console.error(e);
    ui.showToast('ไม่สามารถดึงข้อมูลประวัติสต็อกได้', 'error');
  } finally {
    logsLoading.value = false;
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
