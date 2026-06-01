<template>
  <div id="reports-page" class="page-enter">
    
    <!-- Top summary widget -->
    <div class="grid grid-2 mb-lg gap-md" style="display:grid; grid-template-columns: repeat(2, 1fr); gap:var(--space-md);">
      <div class="card text-center p-md">
        <div style="font-size: var(--font-xs); color: var(--text-secondary); margin-bottom: 2px;">ยอดขายวันนี้</div>
        <div class="font-bold text-gradient" style="font-size: var(--font-xl);">{{ formatCurrency(summary.today_sales) }}</div>
        <div style="font-size: 10px; color: var(--text-tertiary); margin-top: 2px;">{{ summary.today_orders }} บิลเสร็จสมบูรณ์</div>
      </div>
      <div class="card text-center p-md">
        <div style="font-size: var(--font-xs); color: var(--text-secondary); margin-bottom: 2px;">ยอดรวมเดือนนี้</div>
        <div class="font-bold text-accent" style="font-size: var(--font-xl);">{{ formatCurrency(summary.month_sales) }}</div>
        <div style="font-size: 10px; color: var(--text-tertiary); margin-top: 2px;">{{ summary.month_orders }} รายการขาย</div>
      </div>
    </div>

    <!-- Date selector card -->
    <div class="card mb-lg p-md">
      <div class="flex gap-sm align-center">
        <div style="font-size: var(--font-sm); white-space:nowrap;" class="font-bold">📅 เลือกวันที่ดูรายงาน:</div>
        <input 
          type="date" 
          class="form-input p-xs" 
          style="padding: 6px var(--space-md); border-radius: var(--radius-sm);" 
          v-model="selectedDate" 
          @change="loadDailyReport"
        />
      </div>
    </div>

    <!-- Loading spinner for reports -->
    <div v-if="loading" class="card text-center p-3xl">
      <div class="spinner" style="margin:0 auto;"></div>
    </div>

    <template v-else>
      <!-- Daily Summary Card -->
      <div class="card mb-lg">
        <div class="card-title" style="font-size: var(--font-sm);">📊 สรุปยอดวันที่ {{ formatDate(selectedDate) }}</div>
        
        <div class="flex flex-between mb-sm" style="font-size: var(--font-sm);">
          <span>ยอดขายทั้งหมด (สุทธิ):</span>
          <strong class="text-accent" style="font-size: var(--font-md);">{{ formatCurrency(dailyReport.total_sales) }}</strong>
        </div>
        <div class="flex flex-between mb-sm" style="font-size: var(--font-sm);">
          <span>จำนวนคำสั่งซื้อ:</span>
          <span>{{ dailyReport.total_orders }} บิล</span>
        </div>
        <div class="flex flex-between mb-sm" style="font-size: var(--font-sm);">
          <span>เฉลี่ยต่อบิล:</span>
          <span>{{ formatCurrency(dailyReport.average_bill) }}</span>
        </div>

        <div class="divider" style="margin: var(--space-md) 0; height:1px; background:var(--border-color);"></div>
        
        <!-- Payment Methods Breakdowns -->
        <div class="grid grid-2" style="display:grid; grid-template-columns: repeat(2, 1fr); gap:var(--space-sm); font-size:var(--font-xs);">
          <div class="p-xs card" style="background:var(--bg-secondary); border:none;">
            <div style="color:var(--text-secondary);">💵 เงินสด</div>
            <div class="font-bold" style="font-size:var(--font-base); margin-top:2px;">
              {{ formatCurrency(dailyReport.cash_sales) }}
            </div>
            <div style="color:var(--text-tertiary);">{{ dailyReport.cash_orders }} บิล</div>
          </div>
          <div class="p-xs card" style="background:var(--bg-secondary); border:none;">
            <div style="color:var(--text-secondary);">📱 QR Code</div>
            <div class="font-bold" style="font-size:var(--font-base); margin-top:2px;">
              {{ formatCurrency(dailyReport.qr_sales) }}
            </div>
            <div style="color:var(--text-tertiary);">{{ dailyReport.qr_orders }} บิล</div>
          </div>
        </div>
      </div>

      <!-- Top Selling Menu Items (Last 7 Days) -->
      <div class="card mb-lg">
        <div class="card-title" style="font-size: var(--font-sm);">🔥 5 อันดับเมนูขายดีที่สุด (7 วันที่ผ่านมา)</div>
        
        <div v-if="topItems.length === 0" style="font-size:var(--font-sm); color:var(--text-tertiary); text-align:center; padding: var(--space-md);">
          ยังไม่มีข้อมูลการขายในรอบ 7 วันที่ผ่านมา
        </div>
        <div v-else style="display: flex; flex-direction: column; gap: var(--space-sm);">
          <div 
            v-for="(item, index) in topItems" 
            :key="item.menu_item_id" 
            class="flex flex-between align-center p-xs"
            style="font-size:var(--font-sm); border-bottom: 1px solid var(--border-color);"
          >
            <div class="flex align-center gap-sm">
              <span class="font-bold" :class="index === 0 ? 'text-accent' : 'text-secondary'">
                #{{ index + 1 }}
              </span>
              <span>{{ item.item_name }}</span>
            </div>
            <div>
              <span class="font-bold">{{ item.total_qty }}ชิ้น</span> | 
              <span style="font-size:11px; color:var(--text-secondary);">{{ formatCurrency(item.total_sales) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Today's Transaction Logs -->
      <div class="card">
        <div class="card-title" style="font-size: var(--font-sm);">📋 รายการบิลขายประจำวัน</div>
        
        <div v-if="dailyReport.orders?.length === 0" style="font-size:var(--font-sm); color:var(--text-tertiary); text-align:center; padding: var(--space-md);">
          ยังไม่มีรายการขายสำเร็จในวันนี้
        </div>
        <div v-else style="display: flex; flex-direction: column; gap: var(--space-sm);">
          <div 
            v-for="order in dailyReport.orders" 
            :key="order.id" 
            class="p-sm card"
            style="font-size:var(--font-sm); background: var(--bg-primary); display:flex; flex-direction:column; gap:2px;"
          >
            <div class="flex flex-between font-bold">
              <span>#{{ order.order_number }}</span>
              <span class="text-accent">{{ formatCurrency(order.total) }}</span>
            </div>
            <div class="flex flex-between" style="font-size:11px; color:var(--text-secondary); margin-top:2px;">
              <span>ชำระด้วย: {{ order.payment_method === 'cash' ? '💵 เงินสด' : '📱 QR Code' }}</span>
              <span>เวลา: {{ formatTime(order.created_at) }}</span>
            </div>
            <div v-if="order.note" style="font-size: 11px; color: var(--text-tertiary); border-left: 2px solid var(--border-color); padding-left:6px; margin-top:4px;">
              หมายเหตุ: {{ order.note }}
            </div>
          </div>
        </div>
      </div>
    </template>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../api';
import { ui, formatCurrency, formatDate, formatTime, getToday } from '../helpers';

// States
const selectedDate = ref(getToday());
const loading = ref(true);
const summary = ref({
  today_sales: 0,
  today_orders: 0,
  month_sales: 0,
  month_orders: 0
});
const dailyReport = ref({
  total_sales: 0,
  total_orders: 0,
  average_bill: 0,
  cash_sales: 0,
  cash_orders: 0,
  qr_sales: 0,
  qr_orders: 0,
  orders: []
});
const topItems = ref([]);

// Load Global Summary
const loadReportSummary = async () => {
  try {
    const res = await api.reports.summary();
    if (res.success && res.data) {
      summary.value = {
        today_sales: res.data.today?.total_revenue || 0,
        today_orders: res.data.today?.total_orders || 0,
        month_sales: res.data.month?.total_revenue || 0,
        month_orders: res.data.month?.total_orders || 0
      };
    }
  } catch (e) {
    console.warn(e);
  }
};

// Load Daily Report
const loadDailyReport = async () => {
  loading.value = true;
  try {
    const dateVal = selectedDate.value || getToday();
    const res = await api.reports.daily(dateVal);
    if (res.success && res.data) {
      const data = res.data;
      dailyReport.value = {
        total_sales: data.total_revenue || 0,
        total_orders: data.total_orders || 0,
        average_bill: data.avg_order_value || 0,
        cash_sales: data.payment_breakdown?.cash_total || 0,
        cash_orders: data.payment_breakdown?.cash_count || 0,
        qr_sales: data.payment_breakdown?.qr_total || 0,
        qr_orders: data.payment_breakdown?.qr_count || 0,
        orders: data.orders || []
      };
    }
  } catch (e) {
    console.error(e);
    ui.showToast('ไม่สามารถดึงข้อมูลรายงานประจำวันได้', 'error');
  } finally {
    loading.value = false;
  }
};

// Load Top Selling Items (last 7 days)
const loadTopItems = async () => {
  try {
    const res = await api.reports.topItems(7);
    if (res.success && Array.isArray(res.data)) {
      topItems.value = res.data.map(item => ({
        ...item,
        total_sales: item.total_revenue || 0
      }));
    }
  } catch (e) {
    console.warn(e);
  }
};

onMounted(() => {
  loadReportSummary();
  loadDailyReport();
  loadTopItems();
});
</script>

<style scoped>
/* --- Report Charts (CSS Only) --- */
.chart-container {
  padding: var(--space-lg) 0;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: var(--space-sm);
  height: 160px;
  padding: 0 var(--space-sm);
}

.bar-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
}

.bar-value {
  font-size: var(--font-xs);
  color: var(--text-secondary);
  margin-bottom: var(--space-xs);
  font-weight: var(--font-weight-medium);
}

.bar {
  width: 100%;
  max-width: 40px;
  background: var(--gradient-primary);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  min-height: 4px;
  transition: height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.bar-label {
  font-size: var(--font-xs);
  color: var(--text-tertiary);
  margin-top: var(--space-xs);
  text-align: center;
}

/* Horizontal bar chart for top items */
.h-bar-chart {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.h-bar-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.h-bar-label {
  width: 100px;
  font-size: var(--font-sm);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.h-bar-track {
  flex: 1;
  height: 24px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.h-bar-fill {
  height: 100%;
  background: var(--gradient-primary);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  padding-left: var(--space-sm);
  font-size: var(--font-xs);
  font-weight: var(--font-weight-semibold);
  transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  min-width: 30px;
}

/* Mini donut (CSS only) */
.donut-chart {
  position: relative;
  width: 100px;
  height: 100px;
}

.donut-chart svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.donut-chart .donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.donut-center-value {
  font-size: var(--font-md);
  font-weight: var(--font-weight-bold);
}

.donut-center-label {
  font-size: var(--font-xs);
  color: var(--text-tertiary);
}

/* Summary stat card */
.stat-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  text-align: center;
}

.stat-value {
  font-size: var(--font-2xl);
  font-weight: var(--font-weight-bold);
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: var(--font-sm);
  color: var(--text-secondary);
  margin-top: var(--space-xs);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.stats-grid-3 {
  grid-template-columns: repeat(3, 1fr);
}
</style>
