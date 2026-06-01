<template>
  <div id="stock-page" class="page-enter">
    
    <!-- Info Header Card -->
    <div class="card mb-lg p-md">
      <div style="font-size: var(--font-sm); color: var(--text-secondary);">
        ระบบจัดการคลังวัตถุดิบและสต็อกสินค้าของร้านไก่ทอดช้างแดง
      </div>
    </div>

    <!-- Stock Table -->
    <div class="card p-0 overflow-hidden mb-lg">
      <div style="overflow-x: auto;">
        <table class="table" style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-color); background: rgba(139, 3, 19, 0.03);">
              <th style="padding: var(--space-md);">เมนูอาหาร</th>
              <th style="padding: var(--space-md); text-align: right;">จำนวนคงเหลือ</th>
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
              <td style="padding: var(--space-md); text-align: right; font-weight: bold; vertical-align: middle;">
                <span v-if="item.quantity === null || item.quantity === undefined" class="text-secondary" style="font-weight: normal; font-size:var(--font-xs);">
                  ♾️ ไม่จำกัด
                </span>
                <span v-else :class="{ 'text-danger': item.quantity <= lowStockThreshold }">
                  {{ item.quantity }} ชิ้น
                  <span v-if="item.quantity <= lowStockThreshold && item.quantity > 0" style="display:block; font-size: 10px; font-weight:normal;">⚠️ ใกล้หมด</span>
                  <span v-if="item.quantity <= 0" style="display:block; font-size: 10px; font-weight:normal;">❌ หมดเกลี้ยง</span>
                </span>
              </td>
              <!-- Actions -->
              <td style="padding: var(--space-md); text-align: center; vertical-align: middle;">
                <div class="flex justify-center gap-sm">
                  <button class="btn btn-success btn-sm" @click="openActionModal('restock', item)">➕ เติมของ</button>
                  <button class="btn btn-secondary btn-sm" @click="openActionModal('adjust', item)">🔧 ปรับปรุง</button>
                  <button class="btn btn-ghost btn-sm p-xs" title="ดูประวัติ" @click="viewLogs(item)">📊 ประวัติ</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Restock/Adjust Modal -->
    <div v-if="showActionModal" class="modal-container active" style="display:flex; align-items:center; justify-content:center; position: fixed; inset:0; z-index:1000;">
      <div class="modal-overlay" @click="showActionModal = false"></div>
      <div class="modal-content modal-center w-full max-w-sm" style="position:relative; z-index:2;">
        <div class="modal-header">
          <h3>
            {{ actionType === 'restock' ? '➕ เติมสต็อกสินค้า' : '🔧 ปรับปรุงยอดสต็อก' }}
          </h3>
          <button class="modal-close" @click="showActionModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="mb-md font-bold" style="font-size: var(--font-base); text-align: center;">
            {{ activeItem?.name }}
          </div>
          <div style="font-size: var(--font-sm); color: var(--text-secondary); text-align: center; margin-bottom: var(--space-lg);">
            จำนวนคงเหลือในระบบปัจจุบัน: <strong>{{ activeItem?.quantity !== null ? activeItem?.quantity : 'ไม่จำกัด' }}</strong>
          </div>

          <!-- Quantity input -->
          <div class="form-group">
            <label class="form-label">
              {{ actionType === 'restock' ? 'จำนวนที่ต้องการเติม (ชิ้น) *' : 'ระบุยอดจำนวนจริงหน้าร้านปัจจุบัน (ชิ้น) *' }}
            </label>
            <input 
              type="number" 
              class="form-input" 
              v-model.number="actionForm.quantity" 
              placeholder="ใส่ตัวเลข..." 
              min="0"
            />
          </div>

          <!-- Note/Reason -->
          <div class="form-group">
            <label class="form-label">บันทึกช่วยจำ (เช่น เลขบิล หรือเหตุผลที่ปรับปรุง)</label>
            <input 
              type="text" 
              class="form-input" 
              v-model="actionForm.note" 
              placeholder="ใส่ข้อความช่วยจำ..." 
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
import { ref, onMounted } from 'vue';
import api from '../api';
import { ui, formatDateTime } from '../helpers';

import { store } from '../store';

// States
const stockItems = computed(() => store.stockItems);
const loading = ref(true);
const lowStockThreshold = computed(() => store.lowStockThreshold);
const showActionModal = ref(false);
const showLogsModal = ref(false);
const actionType = ref('restock'); // 'restock' or 'adjust'
const activeItem = ref(null);
const logs = ref([]);
const logsLoading = ref(false);

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
      res = await api.stock.adjust(itemId, { quantity: qty, note });
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
    'cancel_restore': '🔄 คืนสต็อก (ยกเลิกบิล)'
  };
  return map[reason] || reason;
};

onMounted(() => {
  loadSettings();
  loadStockData();
});
</script>

<style scoped>
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
}

.stock-actions .btn {
  padding: var(--space-sm) var(--space-md);
  font-size: var(--font-xs);
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
