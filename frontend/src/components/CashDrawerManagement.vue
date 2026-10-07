<template>
  <div class="cash-drawer-management-wrapper card p-md" style="position:relative; background: #ffffff; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
    <div class="flex flex-between align-center mb-md" style="margin-bottom:var(--space-md); flex-wrap: wrap; gap: var(--space-sm);">
      <h3 style="margin: 0; font-size: var(--font-lg); font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
        <i class="fa-solid fa-cash-register" style="color: var(--text-primary);"></i>
        ตรวจสอบเงินสดในลิ้นชักประจำวัน
      </h3>
    </div>

    <!-- Hint Explanation Box -->
    <div class="bulk-hint-box mb-lg">
      <span class="hint-icon"><i class="fa-solid fa-lightbulb" style="color: var(--accent);"></i></span>
      <div class="hint-text" style="font-size: var(--font-sm); line-height: 1.6;">
        <strong>วิธีใช้งานและระบบเวลาทำงาน:</strong>
        <ul style="list-style-type: disc; padding-left: 20px; margin-top: 4px; display: flex; flex-direction: column; gap: 2px;">
          <li>กรอกยอดเงินทอนตั้งต้นก่อนเปิดร้าน (หรือปล่อยเป็น ฿0 หากไม่ต้องการใช้เงินทอน)</li>
          <li>ตรวจนับเงินสดในลิ้นชักหลังปิดร้าน แล้วกด "ปิดยอดประจำวัน" เพื่อตรวจสอบผลต่าง ยอดเงินที่ระบบคำนวณจะอิงตามบิลเงินสดและบันทึกรายจ่ายที่เกิดขึ้น</li>
          <li><strong>การเปลี่ยนรอบวันทำงาน (Rollover ตี 4):</strong> เพื่อให้สอดคล้องกับพฤติกรรมการจ่ายตลาดและการปิดร้านหลังเที่ยงคืน ระบบจะตัดยอดและเริ่มรอบวันใหม่ที่เวลา <strong>04:00 น. (ตี 4)</strong> ของทุกวัน บิลและค่าใช้จ่ายช่วงหลังเที่ยงคืนถึงตี 4 จะนำมารวมในรอบวันเดียวกันโดยอัตโนมัติ</li>
        </ul>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="cashDrawerLoading" class="content-loading-overlay">
      <div class="loading-box flex flex-col align-center justify-center">
        <div class="spinner mb-sm"></div>
        <span class="text-sm font-bold text-primary">กำลังโหลดข้อมูลรอบเงินสด...</span>
      </div>
    </div>

    <div v-else-if="cashDrawerSessions.length === 0" class="flex flex-col justify-center align-center text-center gap-xs" style="padding: var(--space-3xl) var(--space-md); color: var(--text-secondary);">
      <i class="fa-solid fa-cash-register text-secondary" style="font-size: 2rem; opacity: 0.35;"></i>
      <div class="font-bold text-sm">ไม่พบข้อมูลรอบบัญชีเงินสดในช่วงเวลานี้</div>
    </div>

    <div v-else class="hide-mobile table-responsive" style="border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow-x: auto;">
      <table class="table" style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: rgba(139, 3, 19, 0.03);">
            <th class="text-center" style="padding: 16px var(--space-md); border-bottom: 1px solid var(--border-color); white-space: nowrap;">วันที่</th>
            <th class="text-center" style="padding: 16px var(--space-md); border-bottom: 1px solid var(--border-color); white-space: nowrap;">เงินทอนตั้งต้น</th>
            <th class="text-center" style="padding: 16px var(--space-md); border-bottom: 1px solid var(--border-color); white-space: nowrap;">ยอดขายเงินสด</th>
            <th class="text-center" style="padding: 16px var(--space-md); border-bottom: 1px solid var(--border-color); white-space: nowrap;">ยอดจ่ายเงินสด</th>
            <th class="text-center" style="padding: 16px var(--space-md); border-bottom: 1px solid var(--border-color); white-space: nowrap;">เงินสดที่ควรมี</th>
            <th class="text-center" style="padding: 16px var(--space-md); border-bottom: 1px solid var(--border-color); white-space: nowrap;">เงินสดนับจริง</th>
            <th class="text-center" style="padding: 16px var(--space-md); border-bottom: 1px solid var(--border-color); white-space: nowrap;">ผลต่าง (ขาด/เกิน)</th>
            <th class="text-center" style="padding: 16px var(--space-md); border-bottom: 1px solid var(--border-color); white-space: nowrap;">สถานะ</th>
            <th class="text-center" style="padding: 16px var(--space-md); border-bottom: 1px solid var(--border-color); white-space: nowrap;">ตรวจสอบ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="session in cashDrawerSessions" :key="(session.id || 'virtual') + '-' + session.branch_id + '-' + session.session_date" style="border-bottom: 1px solid var(--border-color);" class="table-row-hover">
            <td class="text-center" style="padding: 18px var(--space-md); font-weight: 600; vertical-align: middle; white-space: nowrap;">{{ formatDate(session.session_date) }}</td>
            <td class="text-center" style="padding: 18px var(--space-md); vertical-align: middle; white-space: nowrap;">{{ formatCurrency(session.opening_cash) }}</td>
            <td class="text-center" style="padding: 18px var(--space-md); color: var(--success); font-weight: 600; vertical-align: middle; white-space: nowrap;">
              +{{ formatCurrency(session.cash_sales) }}
            </td>
            <td class="text-center" style="padding: 18px var(--space-md); color: var(--danger); font-weight: 600; vertical-align: middle; white-space: nowrap;">
              -{{ formatCurrency(session.cash_expenses) }}
            </td>
            <td class="text-center" style="padding: 18px var(--space-md); font-weight: 700; color: var(--primary); vertical-align: middle; white-space: nowrap;">{{ formatCurrency(session.calculated_expected_cash) }}</td>
            <td class="text-center" style="padding: 18px var(--space-md); vertical-align: middle; white-space: nowrap;">
              <span v-if="session.status === 'closed'" style="font-weight: 700;">
                {{ formatCurrency(session.actual_cash) }}
              </span>
              <span v-else style="color: var(--text-secondary); font-style: italic;">ยังไม่ได้ตรวจนับ</span>
            </td>
            <td class="text-center" style="padding: 18px var(--space-md); vertical-align: middle; white-space: nowrap;">
              <span v-if="session.status === 'closed'">
                <span v-if="session.difference === 0" style="color: var(--success); font-weight: bold; background: rgba(52,199,89,0.15); padding: 4px 8px; border-radius: 4px; display: inline-block; white-space: nowrap;">
                  ครบถ้วน (ยอดเท่ากัน)
                </span>
                <span v-else-if="session.difference > 0" style="color: var(--success); font-weight: bold; background: rgba(52,199,89,0.15); padding: 4px 8px; border-radius: 4px; display: inline-block; white-space: nowrap;">
                  เกิน ({{ formatCurrency(session.difference) }})
                </span>
                <span v-else style="color: var(--danger); font-weight: bold; background: rgba(255,59,48,0.15); padding: 4px 8px; border-radius: 4px; display: inline-block; white-space: nowrap;">
                  ขาด ({{ formatCurrency(Math.abs(session.difference)) }})
                </span>
              </span>
              <span v-else style="color: var(--text-secondary); font-style: italic;">รอปิดยอดประจำวัน</span>
            </td>
            <td class="text-center" style="padding: 18px var(--space-md); vertical-align: middle; white-space: nowrap;">
              <span 
                :style="{
                  background: session.status === 'closed' ? 'rgba(52,199,89,0.2)' : 'rgba(255,149,0,0.2)',
                  color: session.status === 'closed' ? '#30d158' : '#ff9f0a',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontWeight: '600',
                  display: 'inline-block',
                  whiteSpace: 'nowrap'
                }"
              >
                {{ session.status === 'closed' ? 'ตรวจสอบแล้ว' : 'เปิดอยู่' }}
              </span>
            </td>
            <td class="text-center" style="padding: 18px var(--space-md); vertical-align: middle; white-space: nowrap;">
              <div class="flex flex-col align-center justify-center" style="gap: 6px; width: 100%;">
                <button class="btn-action btn-drawer-action" @click="openOpeningCashModal(session)">
                  <i class="fa-solid fa-coins"></i> กรอกยอดเงินทอน
                </button>
                <button class="btn-action btn-action-primary btn-drawer-action" @click="openAuditModal(session)">
                  <i class="fa-solid fa-circle-check"></i> ปิดยอดประจำวัน
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Cards View (Mobile Only) -->
    <div class="show-mobile-only cash-audit-mobile-list" style="margin-bottom: var(--space-md);">
      <div 
        v-for="session in cashDrawerSessions" 
        :key="(session.id || 'virtual') + '-' + session.branch_id + '-' + session.session_date" 
        class="cash-audit-mobile-card"
      >
        <!-- Card Header: Date & Status -->
        <div class="cash-card-header">
          <div class="flex flex-col gap-2xs">
            <span class="session-date">{{ formatDate(session.session_date) }}</span>
          </div>
          <span 
            class="session-status-badge"
            :class="session.status"
          >
            {{ session.status === 'closed' ? 'ตรวจสอบแล้ว' : 'เปิดอยู่' }}
          </span>
        </div>

        <!-- Card Body: Grid of details -->
        <div class="cash-card-grid">
          <div class="grid-item">
            <span class="grid-label">เงินทอนตั้งต้น</span>
            <span class="grid-value">{{ formatCurrency(session.opening_cash) }}</span>
          </div>
          <div class="grid-item">
            <span class="grid-label">ยอดขายเงินสด</span>
            <span class="grid-value text-success">+{{ formatCurrency(session.cash_sales) }}</span>
          </div>
          <div class="grid-item">
            <span class="grid-label">ยอดจ่ายเงินสด</span>
            <span class="grid-value text-danger">-{{ formatCurrency(session.cash_expenses) }}</span>
          </div>
          <div class="grid-item">
            <span class="grid-label">เงินสดที่ควรมี</span>
            <span class="grid-value font-bold text-primary">{{ formatCurrency(session.calculated_expected_cash) }}</span>
          </div>
          <div class="grid-item full-width">
            <span class="grid-label">เงินสดนับจริง</span>
            <span class="grid-value">
              <span v-if="session.status === 'closed'" class="font-bold">
                {{ formatCurrency(session.actual_cash) }}
              </span>
              <span v-else class="text-light-italic">ยังไม่ได้ตรวจนับ</span>
            </span>
          </div>
          <div class="grid-item full-width">
            <span class="grid-label">ผลต่าง (ขาด/เกิน)</span>
            <span class="grid-value">
              <span v-if="session.status === 'closed'">
                <span v-if="session.difference === 0" class="diff-badge equal">
                  ครบถ้วน (ยอดเท่ากัน)
                </span>
                <span v-else-if="session.difference > 0" class="diff-badge surplus">
                  เกิน {{ formatCurrency(session.difference) }}
                </span>
                <span v-else class="diff-badge deficit">
                  ขาด {{ formatCurrency(Math.abs(session.difference)) }}
                </span>
              </span>
              <span v-else class="text-light-italic">รอปิดยอดประจำวัน</span>
            </span>
          </div>
        </div>

        <!-- Card Actions: Buttons -->
        <div class="cash-card-actions">
          <button class="btn-action flex-1" @click="openOpeningCashModal(session)">
            <i class="fa-solid fa-coins"></i> กรอกยอดเงินทอน
          </button>
          <button class="btn-action btn-action-primary flex-1" @click="openAuditModal(session)">
            <i class="fa-solid fa-circle-check"></i> ปิดยอดประจำวัน
          </button>
        </div>
      </div>
    </div>

    <!-- Cash Audit Modal -->
    <Teleport to="body">
      <div v-if="showAuditModal" class="modal-container active">
        <div class="modal-overlay" @click="showAuditModal = false"></div>
        <div class="modal-content modal-center w-full max-w-md" style="position:relative; z-index:2;">
          <div class="modal-header">
            <h3><i class="fa-solid fa-calculator" style="margin-right: 6px;"></i> ปิดยอดประจำวันที่ {{ formatDate(activeAuditSession?.session_date) }}</h3>
            <button class="modal-close" @click="showAuditModal = false">✕</button>
          </div>
          <div class="modal-body">
            <!-- Session Summary details -->
            <div class="form-group" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: var(--space-md); display: flex; flex-direction: column; gap: var(--space-xs); font-size: var(--font-sm);">
              <div class="flex flex-between align-center">
                <span class="text-secondary">เงินทอนตั้งต้น:</span>
                <span class="font-bold text-primary">{{ formatCurrency(activeAuditSession?.opening_cash) }}</span>
              </div>
              <div class="flex flex-between align-center text-success">
                <span class="text-secondary">ยอดขายเงินสดสะสม:</span>
                <span class="font-bold text-success">+{{ formatCurrency(activeAuditSession?.cash_sales) }}</span>
              </div>
              <div class="flex flex-between align-center text-danger">
                <span class="text-secondary">ยอดจ่ายเงินสดสะสม:</span>
                <span class="font-bold text-danger">-{{ formatCurrency(activeAuditSession?.cash_expenses) }}</span>
              </div>
              <div class="flex flex-between align-center font-bold text-base text-primary" style="border-top: 1px solid var(--border-color); padding-top: var(--space-xs); margin-top: 2px;">
                <span>เงินสดที่ควรมีในลิ้นชัก:</span>
                <span style="font-size: 1.15rem;">{{ formatCurrency(activeAuditSession?.calculated_expected_cash) }}</span>
              </div>
            </div>

            <!-- Cash Calculator Helper -->
            <div class="form-group">
              <div class="flex flex-between align-center mb-xs">
                <label class="form-label font-bold" style="margin: 0;">เครื่องช่วยนับเงิน</label>
                <button 
                  type="button" 
                  class="btn btn-secondary btn-sm" 
                  :class="{ 'active': showCalculatorHelper }"
                  @click="toggleCalculatorHelper"
                >
                  {{ showCalculatorHelper ? 'ซ่อน' : 'แสดง' }}
                </button>
              </div>

              <div v-if="showCalculatorHelper" class="calculator-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; background: var(--bg-secondary); border: 1px dashed var(--border-color); padding: 12px; border-radius: var(--radius-md); margin-top: 6px;">
                <div v-for="denom in denominations" :key="denom.value" class="denom-card" style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px; display: flex; flex-direction: column; align-items: center; gap: 6px;">
                  <span class="font-bold text-primary text-xs">{{ denom.label }}</span>
                  <div style="display: flex; align-items: center; gap: 2px; width: 100%; justify-content: center;">
                    <button type="button" class="btn btn-secondary btn-sm" style="min-width: 28px; height: 28px; padding: 0;" @click="decrementDenom(denom)">-</button>
                    <input 
                      type="number" 
                      class="form-input text-center" 
                      style="padding: 2px; font-size: var(--font-sm); width: 44px; text-align: center; height: 28px;" 
                      min="0" 
                      v-model.number="denom.count" 
                      @input="calculateTotalFromDenoms"
                    />
                    <button type="button" class="btn btn-secondary btn-sm" style="min-width: 28px; height: 28px; padding: 0;" @click="incrementDenom(denom)">+</button>
                  </div>
                  <span class="text-secondary text-xs font-bold">{{ formatCurrency(denom.count * denom.value) }}</span>
                </div>
                <div style="grid-column: 1 / -1; border-top: 1px dashed var(--border-color); padding-top: var(--space-xs); display: flex; justify-content: space-between; align-items: center; font-weight: 700; margin-top: 8px;">
                  <span class="text-sm text-primary">ยอดคำนวณรวม: <span class="text-primary font-bold text-base">{{ formatCurrency(calculatorTotalSum) }}</span></span>
                  <button type="button" class="btn btn-primary btn-sm" @click="useCalculatorSum">ใช้ยอดนี้</button>
                </div>
              </div>
            </div>

            <!-- Actual Cash Input -->
            <div class="form-group">
              <label class="form-label font-bold">
                ระบุยอดเงินสดนับได้จริง (บาท) *
              </label>
              <input 
                type="number" 
                class="form-input text-lg font-bold" 
                style="text-align: right;" 
                v-model.number="actualCashInput" 
                placeholder="0.00" 
                required 
                min="0"
              />
            </div>

            <div class="form-group">
              <label class="form-label font-bold">
                บันทึกเพิ่มเติม (ถ้ามี)
              </label>
              <textarea 
                class="form-input" 
                rows="2" 
                v-model="auditNote" 
                placeholder="เช่น ระบุสาเหตุที่เงินขาด/เกิน..."
              ></textarea>
            </div>

            <div class="flex gap-md mt-lg">
              <button class="btn-modal btn-modal-secondary flex-1" @click="showAuditModal = false">ยกเลิก</button>
              <button class="btn-modal btn-modal-primary flex-1" @click="submitCashAudit" :disabled="actualCashInput === '' || actualCashInput === null || actualCashInput < 0 || savingAudit">
                <i v-if="savingAudit" class="fa-solid fa-spinner fa-spin"></i>
                <i v-else class="fa-solid fa-circle-check"></i>
                <span>{{ savingAudit ? ' กำลังปิดยอด...' : ' ปิดยอด' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Set Opening Cash Modal -->
    <Teleport to="body">
      <div v-if="showOpeningCashModal" class="modal-container active">
        <div class="modal-overlay" @click="showOpeningCashModal = false"></div>
        <div class="modal-content modal-center w-full max-w-sm" style="position:relative; z-index:2;">
          <div class="modal-header">
            <h3><i class="fa-solid fa-coins" style="margin-right: 6px;"></i> กรอกยอดเงินทอนตั้งต้น</h3>
            <button class="modal-close" @click="showOpeningCashModal = false">✕</button>
          </div>
          <div class="modal-body">
            <p class="text-xs text-secondary mb-md">
              ระบุจำนวนเงินทอนสำหรับเตรียมทอนลูกค้าของวันที่ {{ formatDate(activeOpeningSession?.session_date) }}
            </p>

            <div class="form-group">
              <label class="form-label font-bold">
                จำนวนเงินทอนตั้งต้น (บาท) *
              </label>
              <input 
                type="number" 
                class="form-input text-lg font-bold" 
                style="text-align: right;" 
                v-model.number="openingCashInput" 
                placeholder="0.00" 
                required 
                min="0"
              />
            </div>

            <div class="flex gap-md mt-lg">
              <button class="btn-modal btn-modal-secondary flex-1" @click="showOpeningCashModal = false">ยกเลิก</button>
              <button class="btn-modal btn-modal-primary flex-1" @click="submitOpeningCash" :disabled="openingCashInput === '' || openingCashInput === null || openingCashInput < 0 || savingOpeningCash">
                <i v-if="savingOpeningCash" class="fa-solid fa-spinner fa-spin"></i>
                <i v-else class="fa-solid fa-floppy-disk"></i>
                <span>{{ savingOpeningCash ? ' กำลังบันทึก...' : ' บันทึกเงินทอน' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import api from '../api';
import { ui, formatCurrency, formatDate } from '../helpers';

const props = defineProps({
  branchId: {
    type: [Number, String],
    default: null
  },
  selectedDate: {
    type: String,
    default: null
  },
  selectedMonth: {
    type: String,
    default: null
  },
  selectedYear: {
    type: String,
    default: null
  },
  periodMode: {
    type: String,
    default: 'daily'
  }
});

const getToday = () => {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
};

const cashDrawerSessions = ref([]);
const cashDrawerLoading = ref(false);

const showAuditModal = ref(false);
const activeAuditSession = ref(null);
const actualCashInput = ref('');
const auditNote = ref('');
const savingAudit = ref(false);

const showOpeningCashModal = ref(false);
const activeOpeningSession = ref(null);
const openingCashInput = ref('');
const savingOpeningCash = ref(false);

const showCalculatorHelper = ref(false);
const denominations = ref([
  { label: '฿1000', value: 1000, count: '' },
  { label: '฿500', value: 500, count: '' },
  { label: '฿100', value: 100, count: '' },
  { label: '฿50', value: 50, count: '' },
  { label: '฿20', value: 20, count: '' },
  { label: '฿10', value: 10, count: '' },
  { label: '฿5', value: 5, count: '' },
  { label: '฿2', value: 2, count: '' },
  { label: '฿1', value: 1, count: '' },
]);
const calculatorTotalSum = ref(0);

const toggleCalculatorHelper = () => {
  showCalculatorHelper.value = !showCalculatorHelper.value;
};

const calculateTotalFromDenoms = () => {
  calculatorTotalSum.value = denominations.value.reduce((sum, d) => sum + (Number(d.count || 0) * d.value), 0);
};

const incrementDenom = (denom) => {
  denom.count = (Number(denom.count) || 0) + 1;
  calculateTotalFromDenoms();
};

const decrementDenom = (denom) => {
  const current = Number(denom.count) || 0;
  denom.count = current > 0 ? current - 1 : '';
  calculateTotalFromDenoms();
};

const useCalculatorSum = () => {
  actualCashInput.value = calculatorTotalSum.value;
};

const fetchCashDrawerSummary = async () => {
  cashDrawerLoading.value = true;
  try {
    const params = {};
    if (props.branchId !== null && props.branchId !== undefined && props.branchId !== '') {
      params.branch_id = props.branchId;
    } else {
      params.branch_id = 'all';
    }

    if (props.periodMode === 'daily') {
      const dateVal = props.selectedDate || getToday();
      params.start_date = dateVal;
      params.end_date = dateVal;
    } else if (props.periodMode === 'monthly') {
      const monthVal = props.selectedMonth || getToday().substring(0, 7);
      const [year, month] = monthVal.split('-');
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      params.start_date = `${year}-${month}-01`;
      params.end_date = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    } else if (props.periodMode === 'yearly') {
      const yearVal = props.selectedYear || new Date().getFullYear().toString();
      params.start_date = `${yearVal}-01-01`;
      params.end_date = `${yearVal}-12-31`;
    }

    const res = await api.cashDrawers.getSummary(params);
    if (res.success) {
      cashDrawerSessions.value = Array.isArray(res.data) ? res.data : (res.data?.sessions || []);
    }
  } catch (err) {
    ui.showToast(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลสรุปยอดเงินสด', 'error');
  } finally {
    cashDrawerLoading.value = false;
  }
};

const openAuditModal = (session) => {
  activeAuditSession.value = session;
  actualCashInput.value = session.status === 'closed' ? session.actual_cash : '';
  auditNote.value = session.note || '';
  calculatorTotalSum.value = 0;
  denominations.value.forEach(d => d.count = '');
  showCalculatorHelper.value = false;
  showAuditModal.value = true;
};

const submitCashAudit = async () => {
  if (!activeAuditSession.value || savingAudit.value) return;
  savingAudit.value = true;
  ui.showLoading();
  try {
    const res = await api.cashDrawers.audit({
      session_id: activeAuditSession.value.id || null,
      branch_id: activeAuditSession.value.branch_id || props.branchId || 1,
      session_date: activeAuditSession.value.session_date,
      actual_cash: Number(actualCashInput.value),
      note: auditNote.value
    });
    if (res.success) {
      ui.showToast('บันทึกปิดยอดเงินสดประจำวันสำเร็จ', 'success');
      showAuditModal.value = false;
      await fetchCashDrawerSummary();
    }
  } catch (err) {
    ui.showToast('ปิดยอดไม่สำเร็จ: ' + err.message, 'error');
  } finally {
    savingAudit.value = false;
    ui.hideLoading();
  }
};

const openOpeningCashModal = (session) => {
  activeOpeningSession.value = session;
  openingCashInput.value = session.opening_cash || 0;
  showOpeningCashModal.value = true;
};

const submitOpeningCash = async () => {
  if (!activeOpeningSession.value || savingOpeningCash.value) return;
  savingOpeningCash.value = true;
  ui.showLoading();
  try {
    const res = await api.cashDrawers.saveOpeningCash({
      session_id: activeOpeningSession.value.id || null,
      branch_id: activeOpeningSession.value.branch_id || props.branchId || 1,
      session_date: activeOpeningSession.value.session_date,
      opening_cash: Number(openingCashInput.value)
    });
    if (res.success) {
      ui.showToast('บันทึกยอดเงินทอนตั้งต้นสำเร็จ', 'success');
      showOpeningCashModal.value = false;
      await fetchCashDrawerSummary();
    }
  } catch (err) {
    ui.showToast('บันทึกเงินทอนไม่สำเร็จ: ' + err.message, 'error');
  } finally {
    savingOpeningCash.value = false;
    ui.hideLoading();
  }
};

watch(
  [() => props.branchId, () => props.selectedDate, () => props.selectedMonth, () => props.selectedYear, () => props.periodMode],
  () => {
    fetchCashDrawerSummary();
  }
);

onMounted(() => {
  fetchCashDrawerSummary();
});
</script>

<style scoped>
.bulk-hint-box {
  background: rgba(139, 3, 19, 0.04);
  border: 1px solid var(--border-color);
  border-left: 4px solid var(--primary);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  display: flex;
  gap: var(--space-sm);
  align-items: flex-start;
}
.btn-drawer-action {
  width: 180px !important;
  height: 42px !important;
  min-height: 42px !important;
  font-size: var(--font-sm) !important;
  font-weight: 600 !important;
  border-radius: var(--radius-md) !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: var(--space-xs) !important;
  white-space: nowrap !important;
}
.cash-audit-mobile-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  margin-bottom: var(--space-sm);
}
.cash-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
  padding-bottom: var(--space-xs);
  border-bottom: 1px solid var(--border-color);
}
.session-date {
  font-weight: 700;
  color: var(--primary);
}
.session-status-badge {
  font-size: var(--font-xs);
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}
.session-status-badge.closed {
  background: rgba(52, 199, 89, 0.2);
  color: #30d158;
}
.session-status-badge.open {
  background: rgba(255, 149, 0, 0.2);
  color: #ff9f0a;
}
.cash-card-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-xs) var(--space-sm);
  font-size: var(--font-xs);
  margin-bottom: var(--space-md);
}
.cash-card-grid .grid-item {
  display: flex;
  flex-direction: column;
}
.cash-card-grid .grid-item.full-width {
  grid-column: 1 / -1;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  border-top: 1px dashed var(--border-color);
  padding-top: var(--space-2xs);
}
.grid-label {
  color: var(--text-secondary);
}
.grid-value {
  font-weight: 600;
}
.cash-card-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
}
.cash-card-actions .btn-action {
  flex: 1 !important;
  height: 44px !important;
  min-height: 44px !important;
  font-size: var(--font-xs) !important;
  font-weight: 700 !important;
  border-radius: var(--radius-md) !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 4px !important;
  padding: 0 4px !important;
  white-space: nowrap !important;
}
.diff-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
}
.diff-badge.equal {
  color: var(--success);
  background: rgba(52,199,89,0.15);
}
.diff-badge.surplus {
  color: var(--success);
  background: rgba(52,199,89,0.15);
}
.diff-badge.deficit {
  color: var(--danger);
  background: rgba(255,59,48,0.15);
}

/* Loading Overlay */
.content-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
  border-radius: var(--radius-md);
  min-height: 250px;
}

.loading-box {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 20px rgba(61, 27, 17, 0.12);
  padding: 24px 36px;
}
</style>
