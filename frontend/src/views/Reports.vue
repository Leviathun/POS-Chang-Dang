<template>
  <div id="reports-page" class="page-enter">
    
    <!-- Tab toggles placed at the very top, styled as category tabs (Matches Menu.vue style) -->
    <div class="category-tabs mb-lg" style="margin-bottom: var(--space-lg); display: flex; gap: var(--space-sm); border-bottom: 2px solid var(--border-color); padding-bottom: var(--space-sm); overflow-x: auto;">
      <button 
        class="category-tab" 
        :class="{ 'active': activeTab === 'sales' }"
        @click="activeTab = 'sales'"
      >
        <i class="fa-solid fa-chart-column"></i> ยอดขาย
      </button>
      <button 
        class="category-tab" 
        :class="{ 'active': activeTab === 'order_history' }"
        @click="activeTab = 'order_history'"
      >
        <i class="fa-solid fa-clock-rotate-left"></i> ประวัติออเดอร์ย้อนหลัง
      </button>
      <button 
        v-if="isAdminUser"
        class="category-tab" 
        :class="{ 'active': activeTab === 'top_menus' }"
        @click="activeTab = 'top_menus'"
      >
        <i class="fa-solid fa-fire"></i> อันดับสินค้าขายดี
      </button>
      <button 
        v-if="isManagerOrAdminUser"
        class="category-tab" 
        :class="{ 'active': activeTab === 'activity_logs' }"
        @click="activeTab = 'activity_logs'"
      >
        <i class="fa-solid fa-user-shield"></i> ประวัติกิจกรรมพนักงาน
      </button>
      <button 
        v-if="isManagerOrAdminUser"
        class="category-tab" 
        :class="{ 'active': activeTab === 'stock_history' }"
        @click="activeTab = 'stock_history'"
      >
        <i class="fa-solid fa-boxes-stacked"></i> ประวัติสต็อก
      </button>
    </div>

    <!-- Date selector card (Shared Global DatePeriodFilter across all tabs) -->
    <DatePeriodFilter
      v-model:period-mode="periodMode"
      v-model:selected-date="selectedDate"
      v-model:selected-month="selectedMonth"
      v-model:selected-year="selectedYear"
      v-model:start-time="customStartTime"
      v-model:end-time="customEndTime"
      @change="loadReportData"
    >
      <!-- Branch Selector for Admin (aligned right) -->
      <div v-if="isAdminUser && branches.length > 0" class="flex gap-sm align-center reports-branch-selector">
        <div style="font-size: var(--font-sm); white-space:nowrap;" class="font-bold">สาขา:</div>
        <div class="custom-select-wrapper" style="min-width: 180px;" @click.stop>
          <div 
            class="custom-select-trigger reports-filter-control" 
            :class="{ 'active': isBranchDropdownOpen }" 
            @click="toggleBranchDropdown"
            style="height: 38px; padding: 6px 36px 6px var(--space-md); display: flex; align-items: center;"
          >
            <span class="custom-select-text">{{ selectedBranchName }}</span>
          </div>
          <div v-if="isBranchDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 8px);">
            <div 
              class="custom-select-option" 
              :class="{ 'selected': selectedBranchId === null }" 
              @click="selectBranch(null)"
            >
              ทุกสาขา
            </div>
            <div 
              v-for="b in branches" 
              :key="b.id" 
              class="custom-select-option" 
              :class="{ 'selected': selectedBranchId === b.id }" 
              @click="selectBranch(b.id)"
            >
              {{ b.name }}
            </div>
          </div>
        </div>
      </div>
    </DatePeriodFilter>

    <!-- Skeleton Loading for Sales tab only -->
    <div v-if="loading && activeTab === 'sales'" class="flex flex-col gap-lg">
      <div class="grid grid-2 gap-md">
        <div v-for="n in 2" :key="'sk-rep-kpi-' + n" class="card text-center p-md">
          <div class="skeleton mx-auto mb-xs" style="height: 12px; width: 90px; border-radius: 4px;"></div>
          <div class="skeleton mx-auto mb-xs" style="height: 26px; width: 120px; border-radius: 6px;"></div>
          <div class="skeleton mx-auto" style="height: 12px; width: 80px; border-radius: 4px;"></div>
        </div>
      </div>
      <div class="card">
        <div class="skeleton mb-md" style="height: 20px; width: 180px; border-radius: 4px;"></div>
        <div v-for="r in 4" :key="'sk-rep-row-' + r" class="flex flex-between align-center py-sm" style="border-bottom: 1px solid var(--border-color);">
          <div class="skeleton" style="height: 16px; width: 45%; border-radius: 4px;"></div>
          <div class="skeleton" style="height: 18px; width: 85px; border-radius: 4px;"></div>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- Tab 1: Sales (ยอดขาย) -->
      <div v-if="activeTab === 'sales'" class="flex flex-col gap-lg">
        
        <!-- Top summary widgets (Clean Minimal Cards, No background colors) -->
        <div class="grid grid-2 gap-md">
          <div class="card p-md text-center sales-kpi-card" style="border: 1.5px solid rgba(139, 3, 19, 0.15); background: #ffffff; position: relative; overflow: hidden;">
            <div class="flex flex-center align-center gap-xs text-xs text-secondary mb-xs font-semibold">
              <i class="fa-solid fa-sack-dollar text-primary"></i>
              <span>ยอดขายวันนี้</span>
            </div>
            <div class="font-bold text-primary tabular-nums" style="font-size: var(--font-2xl); line-height: 1.2; margin: 4px 0 8px;">
              {{ formatCurrency(summary.today_sales) }}
            </div>
            <div class="inline-flex align-center gap-xs text-xs text-muted font-medium" style="white-space: nowrap;">
              <i class="fa-solid fa-receipt"></i>
              <span class="tabular-nums">{{ summary.today_orders }} บิลสำเร็จ</span>
            </div>
          </div>

          <div class="card p-md text-center sales-kpi-card" style="border: 1.5px solid rgba(217, 119, 6, 0.2); background: #ffffff; position: relative; overflow: hidden;">
            <div class="flex flex-center align-center gap-xs text-xs text-secondary mb-xs font-semibold">
              <i class="fa-solid fa-calendar-check" style="color: #b45309;"></i>
              <span>ยอดรวมเดือนนี้</span>
            </div>
            <div class="font-bold tabular-nums" style="font-size: var(--font-2xl); line-height: 1.2; margin: 4px 0 8px; color: #b45309;">
              {{ formatCurrency(summary.month_sales) }}
            </div>
            <div class="inline-flex align-center gap-xs text-xs text-muted font-medium">
              <i class="fa-solid fa-bag-shopping"></i>
              <span class="tabular-nums">{{ summary.month_orders }} รายการขาย</span>
            </div>
          </div>
        </div>

        <!-- Daily / Period Summary Card -->
        <div class="card p-lg" style="background: #ffffff; border: 1.5px solid var(--border-color);">
          <div class="flex flex-between align-center mb-md pb-xs" style="border-bottom: 1.5px dashed var(--border-color);">
            <div class="card-title text-base font-bold flex align-center gap-xs" style="color: var(--primary); margin-bottom: 0;">
              <i class="fa-solid fa-chart-pie"></i>
              <span>{{ summaryCardTitle }}</span>
            </div>
          </div>
          
          <!-- Clean 3-Metric Stats Bar (No colored boxes, clean white theme) -->
          <div class="sales-clean-summary-grid mb-lg">
            <div class="sales-clean-stat">
              <span class="stat-clean-label">ยอดขายทั้งหมด (สุทธิ)</span>
              <span class="stat-clean-val text-primary tabular-nums">{{ formatCurrency(displayedDailyReport.total_sales) }}</span>
            </div>
            <div class="sales-clean-stat border-sides">
              <span class="stat-clean-label">จำนวนคำสั่งซื้อ</span>
              <span class="stat-clean-val tabular-nums" style="color: var(--text-primary);">
                {{ displayedDailyReport.all_orders }} <small style="font-size: var(--font-xs); font-weight: normal; color: var(--text-secondary);">บิลทั้งหมด</small>
              </span>
              <div class="stat-sub-meta flex align-center gap-sm text-xs tabular-nums" style="flex-wrap: wrap; margin-top: 4px;">
                <span style="color: #10b981; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                  <i class="fa-solid fa-circle-check" style="font-size: var(--font-xxs);"></i> ชำระแล้ว {{ displayedDailyReport.total_orders }} บิล
                </span>
                <span class="stat-sub-sep" style="color: var(--border-color-light);">|</span>
                <span style="color: var(--danger); font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                  <i class="fa-solid fa-ban" style="font-size: var(--font-xxs);"></i> ยกเลิก {{ displayedDailyReport.cancelled_orders }} บิล
                </span>
              </div>
            </div>
            <div class="sales-clean-stat" style="position: relative;">
              <div class="stat-clean-label" style="display: flex; justify-content: space-between; align-items: center; width: 100%; position: relative;">
                <span>เฉลี่ยต่อบิล</span>
                <div style="position: relative; display: inline-flex; align-items: center;" @mouseenter="showAvgBillInfo = true" @mouseleave="showAvgBillInfo = false" @click.stop>
                  <button
                    type="button"
                    @click="showAvgBillInfo = !showAvgBillInfo"
                    aria-label="ดูสูตรการคำนวณ"
                    style="background: none; border: none; outline: none; box-shadow: none; padding: 0; width: 22px; height: 22px; border-radius: 999px; cursor: pointer; color: var(--text-muted); font-size: var(--font-sm); display: inline-flex; align-items: center; justify-content: center; transition: all 0.15s;"
                    :style="showAvgBillInfo ? { color: 'var(--primary)', background: 'rgba(139, 3, 19, 0.08)' } : {}"
                  >
                    <i class="fa-solid fa-circle-info"></i>
                  </button>
                  <!-- Floating Tooltip Card -->
                  <div
                    v-if="showAvgBillInfo"
                    class="text-xs"
                    style="position: absolute; top: calc(100% + 8px); right: 0; z-index: 60; width: min(300px, 82vw); padding: 10px 12px; background: #fffcf7; border: 1px solid rgba(139, 3, 19, 0.18); border-left: 3px solid var(--primary); border-radius: var(--radius-sm); color: var(--text-secondary); line-height: 1.65; box-shadow: 0 8px 24px rgba(61, 27, 17, 0.14); white-space: normal; text-align: left;"
                  >
                    <div style="position: absolute; top: -6px; right: 5px; width: 10px; height: 10px; background: #fffcf7; border-top: 1px solid rgba(139, 3, 19, 0.18); border-left: 1px solid rgba(139, 3, 19, 0.18); transform: rotate(45deg);"></div>
                    <div style="font-weight: 700; color: var(--primary); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                      <i class="fa-solid fa-calculator" style="font-size: var(--font-xxs);"></i>
                      <span>สูตรการคำนวณ</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                      <div>• <strong style="color: var(--text-primary);">เฉลี่ยต่อบิล:</strong> ยอดขายสุทธิ ÷ จำนวนบิลที่ชำระแล้ว</div>
                      <div>• <strong style="color: var(--text-primary);">เกณฑ์เฉลี่ยสาขา:</strong> ยอดขายสะสมทั้งหมด ÷ จำนวนบิลสะสมทั้งหมด <span style="color: var(--text-muted);">(ตั้งแต่เปิดสาขาถึงวันก่อนหน้า)</span></div>
                      <div>• <strong style="color: var(--text-primary);">ผลต่าง:</strong> เฉลี่ยต่อบิล − เกณฑ์เฉลี่ยสาขา</div>
                    </div>
                  </div>
                </div>
              </div>
              <span class="stat-clean-val tabular-nums" style="color: #b45309;">{{ formatCurrency(displayedDailyReport.average_bill) }}</span>
              <div v-if="displayedDailyReport.historical_avg_bill > 0" class="stat-sub-meta flex align-center text-xs tabular-nums" style="flex-wrap: nowrap; white-space: nowrap; gap: 5px; margin-top: 4px; font-size: var(--font-xxs);">
                <span style="color: var(--text-secondary);">เกณฑ์เฉลี่ยสาขา {{ formatCurrency(displayedDailyReport.historical_avg_bill) }}</span>
                <span class="stat-sub-sep" style="color: var(--border-color-light);">|</span>
                <span v-if="displayedDailyReport.average_bill >= displayedDailyReport.historical_avg_bill" style="color: #10b981; font-weight: 600; display: inline-flex; align-items: center; gap: 3px;">
                  <i class="fa-solid fa-arrow-trend-up" style="font-size: var(--font-xxs);"></i> +{{ formatCurrency(displayedDailyReport.average_bill - displayedDailyReport.historical_avg_bill) }} (สูงกว่าเกณฑ์)
                </span>
                <span v-else style="color: var(--danger); font-weight: 600; display: inline-flex; align-items: center; gap: 3px;">
                  <i class="fa-solid fa-arrow-trend-down" style="font-size: var(--font-xxs);"></i> -{{ formatCurrency(displayedDailyReport.historical_avg_bill - displayedDailyReport.average_bill) }} (ต่ำกว่าเกณฑ์)
                </span>
              </div>
            </div>
          </div>

          <!-- Payment Proportion Progress Bar -->
          <div class="payment-ratio-section mb-md" v-if="displayedDailyReport.total_sales > 0">
            <div class="flex flex-between align-center mb-xs text-xs text-secondary font-semibold">
              <span class="flex align-center gap-xs">
                <i class="fa-solid fa-chart-bar text-primary"></i>
                <span>สัดส่วนช่องทางชำระเงิน</span>
              </span>
              <span class="tabular-nums font-bold text-primary">{{ formatCurrency(displayedDailyReport.total_sales) }}</span>
            </div>
            <!-- Multi-Color Visual Ratio Bar (Flex filled, no grey gap) -->
            <div class="payment-ratio-bar" style="background: transparent;">
              <div 
                v-if="displayedDailyReport.cash_sales > 0" 
                class="ratio-seg seg-cash" 
                :style="{ flex: displayedDailyReport.cash_sales }"
                :title="'เงินสด: ' + getPaymentPct(displayedDailyReport.cash_sales) + '%'"
              ></div>
              <div 
                v-if="displayedDailyReport.qr_sales > 0" 
                class="ratio-seg seg-qr" 
                :style="{ flex: displayedDailyReport.qr_sales }"
                :title="'QR Code: ' + getPaymentPct(displayedDailyReport.qr_sales) + '%'"
              ></div>
              <div 
                v-if="displayedDailyReport.gov_sales > 0" 
                class="ratio-seg seg-gov" 
                :style="{ flex: displayedDailyReport.gov_sales }"
                :title="'โครงการรัฐ: ' + getPaymentPct(displayedDailyReport.gov_sales) + '%'"
              ></div>
              <div 
                v-if="displayedDailyReport.delivery_sales > 0" 
                class="ratio-seg seg-delivery" 
                :style="{ flex: displayedDailyReport.delivery_sales }"
                :title="'เดลิเวอรี: ' + getPaymentPct(displayedDailyReport.delivery_sales) + '%'"
              ></div>
            </div>
          </div>
          
          <!-- Payment Methods 4 Cards Grid -->
          <div class="payment-methods-grid">
            <!-- 1. Cash -->
            <div class="p-sm card pay-card pay-card-cash">
              <div class="flex flex-between align-center mb-xs">
                <span class="pay-title inline-flex align-center gap-xs">
                  <i class="fa-solid fa-money-bill-wave" style="color: #10b981;"></i>
                  <span>เงินสด</span>
                </span>
                <span class="pay-pct-badge tabular-nums" v-if="displayedDailyReport.total_sales > 0">
                  {{ getPaymentPct(displayedDailyReport.cash_sales) }}%
                </span>
              </div>
              <div class="pay-amount tabular-nums">
                {{ formatCurrency(displayedDailyReport.cash_sales) }}
              </div>
              <div class="pay-count text-muted tabular-nums">
                {{ displayedDailyReport.cash_orders }} บิล
              </div>
            </div>

            <!-- 2. QR Code -->
            <div class="p-sm card pay-card pay-card-qr">
              <div class="flex flex-between align-center mb-xs">
                <span class="pay-title inline-flex align-center gap-xs">
                  <i class="fa-solid fa-qrcode" style="color: var(--primary);"></i>
                  <span class="hide-mobile">QR Code</span>
                  <span class="show-mobile-inline">QR</span>
                </span>
                <span class="pay-pct-badge tabular-nums" v-if="displayedDailyReport.total_sales > 0">
                  {{ getPaymentPct(displayedDailyReport.qr_sales) }}%
                </span>
              </div>
              <div class="pay-amount tabular-nums">
                {{ formatCurrency(displayedDailyReport.qr_sales) }}
              </div>
              <div class="pay-count text-muted tabular-nums">
                {{ displayedDailyReport.qr_orders }} บิล
              </div>
            </div>

            <!-- 3. Gov -->
            <div class="p-sm card pay-card pay-card-gov">
              <div class="flex flex-between align-center mb-xs">
                <span class="pay-title inline-flex align-center gap-xs">
                  <i class="fa-solid fa-landmark" style="color: #3b82f6;"></i>
                  <span class="hide-mobile">โครงการรัฐ</span>
                  <span class="show-mobile-inline">รัฐ</span>
                </span>
                <span class="pay-pct-badge tabular-nums" v-if="displayedDailyReport.total_sales > 0">
                  {{ getPaymentPct(displayedDailyReport.gov_sales) }}%
                </span>
              </div>
              <div class="pay-amount tabular-nums">
                {{ formatCurrency(displayedDailyReport.gov_sales) }}
              </div>
              <div class="pay-count text-muted tabular-nums">
                {{ displayedDailyReport.gov_orders }} บิล
              </div>
            </div>

            <!-- 4. Delivery -->
            <div class="p-sm card pay-card pay-card-delivery">
              <div class="flex flex-between align-center mb-xs">
                <span class="pay-title inline-flex align-center gap-xs">
                  <i class="fa-solid fa-motorcycle" style="color: #ea580c;"></i>
                  <span class="hide-mobile">เดลิเวอรี</span>
                  <span class="show-mobile-inline">เดลี่</span>
                </span>
                <span class="pay-pct-badge tabular-nums" v-if="displayedDailyReport.total_sales > 0">
                  {{ getPaymentPct(displayedDailyReport.delivery_sales) }}%
                </span>
              </div>
              <div class="pay-amount tabular-nums">
                {{ formatCurrency(displayedDailyReport.delivery_sales) }}
              </div>
              <div class="pay-count text-muted tabular-nums">
                {{ displayedDailyReport.delivery_orders }} บิล
              </div>
            </div>
          </div>
        </div>

        <!-- Today's Transaction Logs (ALL ROLES) -->
        <div ref="dailyOrdersCardRef" class="card p-lg" style="background: #ffffff; border: 1.5px solid var(--border-color);">
          <div class="flex flex-between align-center mb-md pb-xs" style="border-bottom: 1.5px dashed var(--border-color);">
            <div class="card-title text-base font-bold flex align-center gap-xs" style="color: var(--primary); margin-bottom: 0;">
              <i class="fa-solid fa-list-check"></i>
              <span>{{ dailyOrdersListTitle }}</span>
            </div>
            <span class="text-xs text-secondary font-medium tabular-nums" v-if="displayedDailyReport.orders?.length > 0">
              รวม {{ displayedDailyReport.orders.length }} รายการ
            </span>
          </div>
          
          <div v-if="displayedDailyReport.orders?.length === 0" style="font-size:var(--font-sm); color:var(--text-tertiary); text-align:center; padding: var(--space-xl) var(--space-md);">
            <i class="fa-regular fa-clipboard" style="font-size: 2.25rem; color: var(--text-tertiary); opacity: 0.45; margin-bottom: 8px; display: inline-block;"></i>
            <div>{{ dailyOrdersEmptyLabel }}</div>
          </div>
          <div v-else class="flex flex-col gap-sm">
            <div 
              v-for="order in paginatedDailyReportOrders" 
              :key="order.id" 
              class="p-md card order-report-card"
              :class="{ 'expanded': expandedOrderId === order.id, 'cancelled-order': order.status === 'cancelled' }"
              @click="toggleExpandOrder(order.id)"
            >
              <!-- Order Header Row (Clean, no clunky boxes) -->
              <div class="flex flex-between align-center gap-sm">
                <div class="flex align-center gap-md">
                  <span class="font-bold text-base tabular-nums" :class="order.status === 'cancelled' ? 'text-muted strike' : 'text-primary'">
                    #{{ order.order_number }}
                  </span>
                  <div class="flex align-center" style="flex-wrap: wrap; gap: 14px;">
                    <!-- 2. เวลา -->
                    <span class="text-xs text-muted tabular-nums" style="display: inline-flex; align-items: center; gap: 6px;">
                      <i class="fa-regular fa-clock" style="font-size: var(--font-xxs);"></i>
                      <span>{{ formatTime(order.created_at) }}</span>
                    </span>
                    <!-- 3. ประเภทการชำระเงิน -->
                    <span class="text-xs" style="color: var(--text-secondary); display: inline-flex; align-items: center; gap: 6px;">
                      <i :class="order.payment_method === 'cash' ? 'fa-solid fa-money-bill-wave' : order.payment_method === 'qr' ? 'fa-solid fa-qrcode' : order.payment_method === 'gov' ? 'fa-solid fa-landmark' : order.payment_method === 'delivery' ? 'fa-solid fa-motorcycle' : 'fa-solid fa-hourglass-half'" :style="order.payment_method === 'cash' ? 'color: #10b981;' : order.payment_method === 'qr' ? 'color: var(--primary);' : order.payment_method === 'gov' ? 'color: #3b82f6;' : order.payment_method === 'delivery' ? 'color: #ea580c;' : ''"></i>
                      <span class="hide-mobile">{{ order.payment_method === 'cash' ? 'เงินสด' : order.payment_method === 'qr' ? 'QR Code' : order.payment_method === 'gov' ? 'โครงการรัฐ' : order.payment_method === 'delivery' ? 'เดลิเวอรี' : 'รอชำระ' }}</span>
                      <span class="show-mobile-inline">{{ order.payment_method === 'cash' ? 'เงินสด' : order.payment_method === 'qr' ? 'QR' : order.payment_method === 'gov' ? 'รัฐ' : order.payment_method === 'delivery' ? 'เดลี่' : 'รอชำระ' }}</span>
                    </span>
                    <span v-if="order.status === 'cancelled'" class="order-status-pill pill-cancelled">
                      <i class="fa-solid fa-ban mr-xs"></i> ยกเลิก
                    </span>
                    <span v-if="order.discount > 0" class="order-discount-pill tabular-nums">
                      ลด -{{ formatCurrency(order.discount) }}
                    </span>
                  </div>
                </div>

                <div class="flex align-center gap-sm">
                  <div class="text-right">
                    <div class="order-total-amount tabular-nums" :class="order.status === 'cancelled' ? 'text-muted strike' : 'text-primary'">
                      {{ formatCurrency(order.total) }}
                    </div>
                  </div>
                  <div class="order-chevron-btn" :class="{ 'rotate': expandedOrderId === order.id }">
                    <i class="fa-solid fa-chevron-down"></i>
                  </div>
                </div>
              </div>

              <!-- Cancel Reason Box -->
              <div v-if="order.cancel_reason" class="order-cancel-reason-box mt-xs">
                <i class="fa-solid fa-triangle-exclamation mr-xs"></i>
                <span>เหตุผลยกเลิก: {{ order.cancel_reason }}</span>
              </div>

              <!-- Expandable: Order Items Detail Drawer -->
              <div v-if="expandedOrderId === order.id" class="order-drawer-content mt-sm pt-sm" @click.stop>
                <div v-if="expandedItems.length === 0" style="font-size:var(--font-xs); color:var(--text-tertiary); text-align:center; padding: var(--space-sm);">
                  <i class="fa-solid fa-spinner fa-spin mr-xs"></i> กำลังโหลดรายการอาหาร...
                </div>
                <div v-else class="order-items-table">
                  <div v-for="item in expandedItems" :key="item.id" class="order-item-row flex flex-between py-xs" style="align-items: flex-start;">
                    <div class="flex gap-xs" style="align-items: flex-start; flex: 1; min-width: 0;">
                      <span class="order-item-qty tabular-nums" style="margin-top: 1px; flex-shrink: 0;">x{{ item.quantity }}</span>
                      <span class="order-item-name font-medium" style="word-break: break-word;">{{ item.item_name }}</span>
                    </div>
                    <span class="order-item-subtotal tabular-nums font-semibold" style="margin-left: var(--space-sm); flex-shrink: 0;">{{ formatCurrency(item.subtotal) }}</span>
                  </div>

                  <!-- Subtotal & Discount Info if applied -->
                  <div v-if="order.discount > 0" class="order-drawer-summary pt-xs mt-xs">
                    <div class="flex flex-between text-xs text-secondary py-2xs">
                      <span>ยอดรวมสินค้า:</span>
                      <span class="tabular-nums">{{ formatCurrency(order.subtotal) }}</span>
                    </div>
                    <div class="flex flex-between text-xs text-danger font-semibold py-2xs">
                      <span>ส่วนลด:</span>
                      <span class="tabular-nums">-{{ formatCurrency(order.discount) }}</span>
                    </div>
                    <div class="flex flex-between text-sm font-bold text-primary pt-2xs" style="border-top: 1px dashed var(--border-color);">
                      <span>ยอดสุทธิ:</span>
                      <span class="tabular-nums">{{ formatCurrency(order.total) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Void Button (Aligned to the far right) -->
                <div v-if="order.status === 'completed'" style="display: flex; justify-content: flex-end; width: 100%; margin-top: var(--space-md);">
                  <button 
                    type="button"
                    class="btn btn-outline-danger" 
                    style="margin-left: auto;"
                    @click.stop="openVoidModal(order)"
                  >
                    <i class="fa-solid fa-trash-can mr-xs"></i> ลบบิลนี้
                  </button>
                </div>
              </div>
            </div>

            <!-- Pagination UI for Daily Orders -->
            <div v-if="totalDailyOrdersPages > 1" class="pagination-bar flex flex-center align-center gap-md mt-md">
              <button 
                class="pagination-btn" 
                :disabled="dailyOrdersCurrentPage === 1" 
                @click="changeDailyOrdersPage(dailyOrdersCurrentPage - 1)"
              >
                <i class="fa-solid fa-chevron-left"></i> ก่อนหน้า
              </button>
              <span class="pagination-info tabular-nums" :class="{ 'is-multi-digit': totalDailyOrdersPages >= 10 }">
                หน้า {{ dailyOrdersCurrentPage }} / {{ totalDailyOrdersPages }}
              </span>
              <button 
                class="pagination-btn" 
                :disabled="dailyOrdersCurrentPage === totalDailyOrdersPages" 
                @click="changeDailyOrdersPage(dailyOrdersCurrentPage + 1)"
              >
                ถัดไป <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Order History (ประวัติออเดอร์ย้อนหลัง) -->
      <div v-if="activeTab === 'order_history'" class="flex flex-col gap-md">
        
        <!-- Filter Card: Separate Box between Date Filter and Orders (Similar to Central Kitchen) -->
        <div class="card p-md" style="background: #ffffff; border: 1.5px solid var(--border-color);">
          <div class="flex align-center gap-md" style="flex-wrap: wrap;">
            <!-- Staff Filter -->
            <div class="flex align-center gap-xs">
              <span style="font-size: var(--font-xs); font-weight: bold; color: var(--text-secondary);">พนักงาน:</span>
              <div class="custom-select-wrapper" style="width: 140px;" @click.stop>
                <div 
                  class="custom-select-trigger" 
                  :class="{ 'active': isHistoryStaffDropdownOpen }" 
                  @click="isHistoryStaffDropdownOpen = !isHistoryStaffDropdownOpen; isHistoryPaymentDropdownOpen = false; isHistoryStatusDropdownOpen = false;"
                  style="height: 32px; padding: 4px 32px 4px 12px; font-size: var(--font-sm); display: flex; align-items: center; border-radius: var(--radius-sm); background-position: right 10px center;"
                >
                  <span class="custom-select-text">
                    {{ historyStaffFilter === 'all' ? 'ทั้งหมด' : historyStaffFilter }}
                  </span>
                </div>
                <div v-if="isHistoryStaffDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 2px); max-height: 200px; overflow-y: auto;">
                  <div class="custom-select-option" :class="{ 'selected': historyStaffFilter === 'all' }" @click="historyStaffFilter = 'all'; isHistoryStaffDropdownOpen = false;" style="padding: 6px 12px; font-size: var(--font-sm);">ทั้งหมด</div>
                  <div 
                    v-for="staff in staffList" 
                    :key="staff.id" 
                    class="custom-select-option" 
                    :class="{ 'selected': historyStaffFilter === staff.name }" 
                    @click="historyStaffFilter = staff.name; isHistoryStaffDropdownOpen = false;" 
                    style="padding: 6px 12px; font-size: var(--font-sm);"
                  >
                    {{ staff.name }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Payment Filter -->
            <div class="flex align-center gap-xs">
              <span style="font-size: var(--font-xs); font-weight: bold; color: var(--text-secondary);">ชำระเงิน:</span>
              <div class="custom-select-wrapper" style="width: 140px;" @click.stop>
                <div 
                  class="custom-select-trigger" 
                  :class="{ 'active': isHistoryPaymentDropdownOpen }" 
                  @click="isHistoryPaymentDropdownOpen = !isHistoryPaymentDropdownOpen; isHistoryStaffDropdownOpen = false; isHistoryStatusDropdownOpen = false;"
                  style="height: 32px; padding: 4px 32px 4px 12px; font-size: var(--font-sm); display: flex; align-items: center; border-radius: var(--radius-sm); background-position: right 10px center;"
                >
                  <span class="custom-select-text">
                    {{ getPaymentLabel(historyPaymentFilter) }}
                  </span>
                </div>
                <div v-if="isHistoryPaymentDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 2px);">
                  <div class="custom-select-option" :class="{ 'selected': historyPaymentFilter === 'all' }" @click="historyPaymentFilter = 'all'; isHistoryPaymentDropdownOpen = false;" style="padding: 6px 12px; font-size: var(--font-sm);">ทั้งหมด</div>
                  <div class="custom-select-option" :class="{ 'selected': historyPaymentFilter === 'cash' }" @click="historyPaymentFilter = 'cash'; isHistoryPaymentDropdownOpen = false;" style="padding: 6px 12px; font-size: var(--font-sm);">เงินสด</div>
                  <div class="custom-select-option" :class="{ 'selected': historyPaymentFilter === 'qr' }" @click="historyPaymentFilter = 'qr'; isHistoryPaymentDropdownOpen = false;" style="padding: 6px 12px; font-size: var(--font-sm);">QR Code</div>
                  <div class="custom-select-option" :class="{ 'selected': historyPaymentFilter === 'gov' }" @click="historyPaymentFilter = 'gov'; isHistoryPaymentDropdownOpen = false;" style="padding: 6px 12px; font-size: var(--font-sm);">โครงการรัฐ</div>
                  <div class="custom-select-option" :class="{ 'selected': historyPaymentFilter === 'delivery' }" @click="historyPaymentFilter = 'delivery'; isHistoryPaymentDropdownOpen = false;" style="padding: 6px 12px; font-size: var(--font-sm);">เดลิเวอรี</div>
                </div>
              </div>
            </div>

            <!-- Status Filter -->
            <div class="flex align-center gap-xs">
              <span style="font-size: var(--font-xs); font-weight: bold; color: var(--text-secondary);">สถานะ:</span>
              <div class="custom-select-wrapper" style="width: 140px;" @click.stop>
                <div 
                  class="custom-select-trigger" 
                  :class="{ 'active': isHistoryStatusDropdownOpen }" 
                  @click="isHistoryStatusDropdownOpen = !isHistoryStatusDropdownOpen; isHistoryStaffDropdownOpen = false; isHistoryPaymentDropdownOpen = false;"
                  style="height: 32px; padding: 4px 32px 4px 12px; font-size: var(--font-sm); display: flex; align-items: center; border-radius: var(--radius-sm); background-position: right 10px center;"
                >
                  <span class="custom-select-text">
                    {{ selectedHistoryStatusLabel }}
                  </span>
                </div>
                <div v-if="isHistoryStatusDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 2px);">
                  <div class="custom-select-option" :class="{ 'selected': historyStatusFilter === 'all' }" @click="selectHistoryStatus('all')" style="padding: 6px 12px; font-size: var(--font-sm);">ทั้งหมด</div>
                  <div class="custom-select-option" :class="{ 'selected': historyStatusFilter === 'completed' }" @click="selectHistoryStatus('completed')" style="padding: 6px 12px; font-size: var(--font-sm);">ชำระเงินแล้ว</div>
                  <div class="custom-select-option" :class="{ 'selected': historyStatusFilter === 'cancelled' }" @click="selectHistoryStatus('cancelled')" style="padding: 6px 12px; font-size: var(--font-sm);">ยกเลิก</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Orders Card / List (Unified Modern Card Layout with Direct Item Details) -->
        <div ref="historyOrdersCardRef" class="card p-lg" style="background: #ffffff; border: 1.5px solid var(--border-color);">
          <div class="flex flex-between align-center mb-md pb-xs" style="border-bottom: 1.5px dashed var(--border-color);">
            <div class="card-title text-base font-bold flex align-center gap-xs" style="color: var(--primary); margin-bottom: 0;">
              <i class="fa-solid fa-clock-rotate-left"></i>
              <span>ประวัติออเดอร์ย้อนหลัง</span>
            </div>
            <span class="text-xs text-secondary font-medium tabular-nums" v-if="filteredHistoryOrders.length > 0">
              รวม {{ filteredHistoryOrders.length }} รายการ
            </span>
          </div>

          <!-- Skeleton Loading for Order History -->
          <div v-if="loading || historyOrdersLoading" class="flex flex-col gap-sm">
            <div v-for="n in 4" :key="'sk-hist-ord-' + n" class="p-md card order-report-card">
              <div class="flex flex-between align-center gap-sm mb-xs">
                <div class="flex align-center gap-md" style="flex-wrap: wrap;">
                  <div class="skeleton" style="height: 18px; width: 85px; border-radius: 4px;"></div>
                  <div class="skeleton" style="height: 14px; width: 160px; border-radius: 4px;"></div>
                  <div class="skeleton" style="height: 14px; width: 90px; border-radius: 4px;"></div>
                </div>
                <div class="skeleton" style="height: 20px; width: 75px; border-radius: 4px;"></div>
              </div>
              <div class="skeleton mt-xs" style="height: 30px; width: 100%; border-radius: 6px;"></div>
            </div>
          </div>

          <div v-else-if="filteredHistoryOrders.length === 0" class="text-center text-secondary py-xl text-sm" style="padding: var(--space-xl);">
            ไม่มีรายการออเดอร์ในช่วงเวลาที่เลือก
          </div>
          <div v-else class="flex flex-col gap-sm">
            <div 
              v-for="order in paginatedHistoryOrders" 
              :key="order.id" 
              class="p-md card order-report-card"
              :class="{ 'cancelled-order': order.status === 'cancelled' }"
            >
              <!-- Order Header Row -->
              <div class="flex flex-between align-center gap-sm" style="flex-wrap: wrap;">
                <div class="flex align-center gap-md" style="flex-wrap: wrap;">
                  <span class="font-bold text-base tabular-nums" :class="order.status === 'cancelled' ? 'text-muted strike' : 'text-primary'">
                    #{{ order.order_number }}
                  </span>
                  <div class="flex align-center" style="flex-wrap: wrap; gap: 14px;">
                    <!-- Date & Time -->
                    <span class="text-xs text-muted tabular-nums" style="display: inline-flex; align-items: center; gap: 6px;">
                      <i class="fa-regular fa-clock" style="font-size: var(--font-xxs);"></i>
                      <span>{{ formatDate(order.created_at) }} {{ formatTime(order.created_at) }}</span>
                    </span>
                    <!-- Staff -->
                    <span class="text-xs text-secondary" v-if="order.staff_name" style="display: inline-flex; align-items: center; gap: 6px;">
                      <i class="fa-regular fa-user" style="font-size: var(--font-xxs);"></i>
                      <span>{{ order.staff_name }}</span>
                    </span>
                    <!-- Branch -->
                    <span class="text-xs text-secondary" v-if="order.branch_name && !selectedBranchId" style="display: inline-flex; align-items: center; gap: 6px;">
                      <i class="fa-solid fa-store" style="font-size: var(--font-xxs);"></i>
                      <span>{{ order.branch_name }}</span>
                    </span>
                    <!-- Payment Method -->
                    <span class="text-xs" style="color: var(--text-secondary); display: inline-flex; align-items: center; gap: 6px;">
                      <i :class="order.payment_method === 'cash' ? 'fa-solid fa-money-bill-wave' : order.payment_method === 'qr' ? 'fa-solid fa-qrcode' : order.payment_method === 'gov' ? 'fa-solid fa-landmark' : order.payment_method === 'delivery' ? 'fa-solid fa-motorcycle' : 'fa-solid fa-hourglass-half'" :style="order.payment_method === 'cash' ? 'color: #10b981;' : order.payment_method === 'qr' ? 'color: var(--primary);' : order.payment_method === 'gov' ? 'color: #3b82f6;' : order.payment_method === 'delivery' ? 'color: #ea580c;' : ''"></i>
                      <span class="hide-mobile">{{ order.payment_method === 'cash' ? 'เงินสด' : order.payment_method === 'qr' ? 'QR Code' : order.payment_method === 'gov' ? 'โครงการรัฐ' : order.payment_method === 'delivery' ? 'เดลิเวอรี' : 'รอชำระ' }}</span>
                      <span class="show-mobile-inline">{{ order.payment_method === 'cash' ? 'เงินสด' : order.payment_method === 'qr' ? 'QR' : order.payment_method === 'gov' ? 'รัฐ' : order.payment_method === 'delivery' ? 'เดลี่' : 'รอชำระ' }}</span>
                    </span>
                    <!-- Status -->
                    <span v-if="order.status === 'cancelled'" class="order-status-pill pill-cancelled">
                      <i class="fa-solid fa-ban mr-xs"></i> ยกเลิก
                    </span>
                    <!-- Discount -->
                    <span v-if="order.discount > 0" class="order-discount-pill tabular-nums">
                      ลด -{{ formatCurrency(order.discount) }}
                    </span>
                  </div>
                </div>

                <div class="text-right">
                  <div class="order-total-amount tabular-nums" :class="order.status === 'cancelled' ? 'text-muted strike' : 'text-primary'">
                    {{ formatCurrency(order.total) }}
                  </div>
                </div>
              </div>

              <!-- Cancel Reason Box if cancelled -->
              <div v-if="order.cancel_reason" class="order-cancel-reason-box mt-xs">
                <i class="fa-solid fa-triangle-exclamation mr-xs"></i>
                <span>เหตุผลยกเลิก: {{ order.cancel_reason }}</span>
              </div>

              <!-- Item Details Directly Displayed (No clicking required!) -->
              <div class="order-drawer-content mt-sm pt-sm">
                <div v-if="order.items && order.items.length > 0" class="order-items-table">
                  <div v-for="item in order.items" :key="item.id" class="order-item-row flex flex-between py-xs" style="align-items: flex-start;">
                    <div class="flex gap-xs" style="align-items: flex-start; flex: 1; min-width: 0;">
                      <span class="order-item-qty tabular-nums" style="margin-top: 1px; flex-shrink: 0;">x{{ item.quantity }}</span>
                      <span class="order-item-name font-medium" style="word-break: break-word;">{{ item.item_name }}</span>
                    </div>
                    <span class="order-item-subtotal tabular-nums font-semibold" style="margin-left: var(--space-sm); flex-shrink: 0;">{{ formatCurrency(item.subtotal) }}</span>
                  </div>

                  <!-- Subtotal & Discount Info if applied -->
                  <div v-if="order.discount > 0" class="order-drawer-summary pt-xs mt-xs">
                    <div class="flex flex-between text-xs text-secondary py-2xs">
                      <span>ยอดรวมสินค้า:</span>
                      <span class="tabular-nums">{{ formatCurrency(order.subtotal) }}</span>
                    </div>
                    <div class="flex flex-between text-xs text-danger font-semibold py-2xs">
                      <span>ส่วนลด:</span>
                      <span class="tabular-nums">-{{ formatCurrency(order.discount) }}</span>
                    </div>
                    <div class="flex flex-between text-sm font-bold text-primary pt-2xs" style="border-top: 1px dashed var(--border-color);">
                      <span>ยอดสุทธิ:</span>
                      <span class="tabular-nums">{{ formatCurrency(order.total) }}</span>
                    </div>
                  </div>
                </div>
                <div v-else style="font-size:var(--font-xs); color:var(--text-tertiary); text-align:center; padding: var(--space-xs);">
                  ไม่มีรายละเอียดสินค้า
                </div>

                <!-- Void Button (Pinned to Far Right) -->
                <div v-if="order.status === 'completed'" class="flex justify-end mt-sm" style="width: 100%;">
                  <button 
                    type="button"
                    class="btn btn-outline-danger" 
                    style="margin-left: auto;"
                    @click.stop="openVoidModal(order)"
                  >
                    <i class="fa-solid fa-trash-can mr-xs"></i> ลบบิลนี้
                  </button>
                </div>
              </div>
            </div>

            <!-- Pagination UI for Order History -->
            <div v-if="totalPages > 1" class="pagination-bar flex flex-center align-center gap-md mt-md">
              <button 
                class="pagination-btn" 
                :disabled="historyCurrentPage === 1" 
                @click="changeHistoryOrdersPage(historyCurrentPage - 1)"
              >
                <i class="fa-solid fa-chevron-left"></i> ก่อนหน้า
              </button>
              <span class="pagination-info tabular-nums" :class="{ 'is-multi-digit': totalPages >= 10 }">
                หน้า {{ historyCurrentPage }} / {{ totalPages }}
              </span>
              <button 
                class="pagination-btn" 
                :disabled="historyCurrentPage === totalPages" 
                @click="changeHistoryOrdersPage(historyCurrentPage + 1)"
              >
                ถัดไป <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Ranked Menus (อันดับสินค้าขายดี) -->
      <div v-if="activeTab === 'top_menus' && isAdminUser" class="flex flex-col gap-lg">
        
        <!-- Summary Overview Card -->
        <div class="card p-lg" style="background: #ffffff; border: 1.5px solid var(--border-color);">
          <div class="flex flex-between align-center mb-md pb-xs" style="border-bottom: 1.5px dashed var(--border-color); flex-wrap: wrap; gap: 8px;">
            <div class="card-title text-base font-bold flex align-center gap-xs" style="color: var(--primary); margin-bottom: 0; flex-wrap: wrap;">
              <span class="flex align-center gap-xs"><i class="fa-solid fa-fire"></i><span>สรุปภาพรวมอันดับสินค้าขายดี</span></span>
              <span class="top-menus-period-sub">({{ summaryCardTitle.replace('สรุปยอด', '').trim() }})</span>
            </div>
            <span class="text-xs text-secondary font-medium tabular-nums">
              แสดงทั้งหมด {{ topItems.length }} รายการ
            </span>
          </div>

          <div class="sales-clean-summary-grid">
            <div class="sales-clean-stat">
              <span class="stat-clean-label">ยอดขายรวมทุกเมนู</span>
              <div v-if="loading || topItemsLoading" class="skeleton mt-xs" style="height: 28px; width: 120px; border-radius: 6px;"></div>
              <span v-else class="stat-clean-val text-primary tabular-nums">{{ formatCurrency(topItemsTotalSales) }}</span>
            </div>
            <div class="sales-clean-stat border-sides">
              <span class="stat-clean-label">จำนวนเมนูที่ขายได้</span>
              <div v-if="loading || topItemsLoading" class="skeleton mt-xs" style="height: 28px; width: 90px; border-radius: 6px;"></div>
              <span v-else class="stat-clean-val tabular-nums" style="color: var(--text-primary);">
                {{ topItems.length }} <small style="font-size: var(--font-xs); font-weight: normal; color: var(--text-secondary);">รายการ</small>
              </span>
            </div>
            <div class="sales-clean-stat">
              <span class="stat-clean-label">เมนูทำเงินสูงสุด</span>
              <template v-if="loading || topItemsLoading">
                <div class="skeleton mt-xs" style="height: 22px; width: 140px; border-radius: 6px;"></div>
                <div class="skeleton mt-xs" style="height: 14px; width: 110px; border-radius: 4px;"></div>
              </template>
              <template v-else>
                <span class="stat-clean-val tabular-nums" style="color: #b45309; font-size: var(--font-md); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  {{ topRevenueItem ? topRevenueItem.item_name : '-' }}
                </span>
                <div v-if="topRevenueItem" class="flex align-center gap-xs text-xs tabular-nums" style="margin-top: 4px; color: var(--text-secondary);">
                  <span style="font-weight: 600; color: var(--primary);">{{ formatCurrency(topRevenueItem.total_sales) }}</span>
                  <span>({{ getTopItemSalesPct(topRevenueItem.total_sales) }}% ของยอดรวม)</span>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- Skeleton Loading for top items (Matching exact Ranked Item Card structure) -->
        <div v-if="loading || topItemsLoading" class="ranked-items-grid">
          <div v-for="n in 6" :key="'sk-top-' + n" class="ranked-item-card">
            <div class="ranked-card-header">
              <div class="skeleton" style="height: 24px; width: 85px; border-radius: 999px;"></div>
              <div class="skeleton" style="height: 20px; width: 50px; border-radius: 999px;"></div>
            </div>
            <div class="ranked-card-single-body">
              <div class="ranked-image-wrapper">
                <div class="skeleton" style="width: 100%; height: 100%; border-radius: var(--radius-sm);"></div>
              </div>
              <div class="skeleton" style="height: 18px; width: 65%; border-radius: 4px; margin: 6px 0;"></div>
              <div class="ranked-stats-2boxes">
                <div class="ranked-stat-box-half">
                  <div class="skeleton mx-auto mb-xs" style="height: 10px; width: 55px; border-radius: 4px;"></div>
                  <div class="skeleton mx-auto" style="height: 18px; width: 70px; border-radius: 4px;"></div>
                </div>
                <div class="ranked-stat-box-half">
                  <div class="skeleton mx-auto mb-xs" style="height: 10px; width: 55px; border-radius: 4px;"></div>
                  <div class="skeleton mx-auto" style="height: 18px; width: 70px; border-radius: 4px;"></div>
                </div>
              </div>
              <div style="margin-top: 8px;">
                <div class="flex flex-between align-center" style="margin-bottom: 4px;">
                  <div class="skeleton" style="height: 10px; width: 70px; border-radius: 4px;"></div>
                  <div class="skeleton" style="height: 10px; width: 32px; border-radius: 4px;"></div>
                </div>
                <div class="skeleton" style="height: 6px; width: 100%; border-radius: 999px;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="topItems.length === 0" class="card" style="font-size:var(--font-sm); color:var(--text-tertiary); text-align:center; padding: var(--space-3xl); background: #ffffff !important;">
          <i class="fa-solid fa-folder-open mb-sm" style="font-size: 2.5rem; opacity: 0.25; display: block; color: var(--text-primary);"></i>
          ยังไม่มีข้อมูลการขายในระยะเวลาที่เลือก
        </div>

        <!-- Uniform Grid Cards of Ranked Items (Equal Size for Every Rank) -->
        <div v-else class="ranked-items-grid">
          <div 
            v-for="(item, index) in topItems" 
            :key="item.menu_item_id || item.item_name"
            class="ranked-item-card"
          >
            <!-- Card Header: Rank Badge & Category/Type Tag -->
            <div class="ranked-card-header">
              <div class="ranked-badge" :class="index === 0 ? 'ranked-badge-1' : index === 1 ? 'ranked-badge-2' : index === 2 ? 'ranked-badge-3' : 'ranked-badge-other'">
                <i v-if="index === 0" class="fa-solid fa-crown" style="margin-right: 4px; color: #d48806;"></i>
                <i v-else-if="index === 1" class="fa-solid fa-medal" style="margin-right: 4px; color: #8c8c8c;"></i>
                <i v-else-if="index === 2" class="fa-solid fa-medal" style="margin-right: 4px; color: #d46b08;"></i>
                <span>อันดับ {{ index + 1 }}</span>
              </div>
              <span v-if="item.unit === 'กรัม'" class="badge-type mixin">ผสม</span>
              <span v-else class="badge-type main">ทั่วไป</span>
            </div>

            <!-- Uniform Single Column Card Body for All Ranks -->
            <div class="ranked-card-single-body">
              <!-- Product Image -->
              <div class="ranked-image-wrapper">
                <img 
                  v-if="item.image_url" 
                  :src="item.image_url" 
                  :alt="item.item_name" 
                  class="ranked-img"
                  @error="item.image_url = null"
                />
                <div v-else class="ranked-img-placeholder">
                  <i class="fa-solid fa-utensils"></i>
                </div>
              </div>

              <!-- Product Details -->
              <h4 class="ranked-item-title" :title="item.item_name">{{ item.item_name }}</h4>
              
              <!-- 2 Separate Boxes Side-by-Side (ซ้าย-ขวา) with Centered Text -->
              <div class="ranked-stats-2boxes">
                <div class="ranked-stat-box-half">
                  <span class="stat-label">จำนวนขาย</span>
                  <div class="stat-value font-bold text-primary tabular-nums">
                    {{ Number(Number(item.total_qty).toFixed(2)).toLocaleString() }}
                    <span class="stat-unit">{{ item.unit || 'ชิ้น' }}</span>
                  </div>
                </div>
                <div class="ranked-stat-box-half">
                  <span class="stat-label">ยอดขายรวม</span>
                  <div class="stat-value font-bold text-accent tabular-nums">
                    {{ formatCurrency(item.total_sales) }}
                  </div>
                </div>
              </div>

              <!-- Sales Share Percentage Bar -->
              <div style="margin-top: 8px;">
                <div class="flex flex-between align-center text-xs tabular-nums" style="margin-bottom: 4px; color: var(--text-secondary);">
                  <span>สัดส่วนยอดขาย</span>
                  <span style="font-weight: 700; color: var(--primary);">{{ getTopItemSalesPct(item.total_sales) }}%</span>
                </div>
                <div style="height: 6px; width: 100%; background: var(--bg-secondary); border-radius: 999px; overflow: hidden;">
                  <div
                    :style="{
                      width: Math.min(100, Math.max(2, Number(getTopItemSalesPct(item.total_sales)))) + '%',
                      height: '100%',
                      background: index === 0 ? 'linear-gradient(90deg, #d97706, #f59e0b)' : 'var(--primary)',
                      borderRadius: '999px'
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Tab 4: Activity Logs (ประวัติกิจกรรมพนักงาน) -->
      <div v-if="activeTab === 'activity_logs' && isManagerOrAdminUser" class="flex flex-col gap-md">
        
        <!-- Filter Card: Separate Box between Date Filter and Activity Logs -->
        <div class="card p-md" style="background: #ffffff; border: 1.5px solid var(--border-color);">
          <div class="flex align-center gap-md" style="flex-wrap: wrap;">
            <!-- Category Filter -->
            <div class="flex align-center gap-xs">
              <span style="font-size: var(--font-xs); font-weight: bold; color: var(--text-secondary);">ประเภท:</span>
              <div class="custom-select-wrapper" style="width: 210px;" @click.stop>
                <div 
                  class="custom-select-trigger" 
                  :class="{ 'active': isFilterActionDropdownOpen }" 
                  @click="isFilterActionDropdownOpen = !isFilterActionDropdownOpen; isActivityStaffDropdownOpen = false;"
                  style="height: 32px; padding: 4px 32px 4px 12px; font-size: var(--font-sm); display: flex; align-items: center; border-radius: var(--radius-sm); background-position: right 10px center;"
                >
                  <span class="custom-select-text" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {{ selectedFilterActionLabel }}
                  </span>
                </div>
                <div v-if="isFilterActionDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 2px);">
                  <div class="custom-select-option" :class="{ 'selected': filterAction === 'all' }" @click="selectFilterAction('all')" style="padding: 6px 12px; font-size: var(--font-sm);">ทั้งหมด</div>
                  <div class="custom-select-option" :class="{ 'selected': filterAction === 'login' }" @click="selectFilterAction('login')" style="padding: 6px 12px; font-size: var(--font-sm);">เข้าสู่ระบบ</div>
                  <div class="custom-select-option" :class="{ 'selected': filterAction === 'sales' }" @click="selectFilterAction('sales')" style="padding: 6px 12px; font-size: var(--font-sm);">ขายสำเร็จ</div>
                  <div class="custom-select-option" :class="{ 'selected': filterAction === 'cancel' }" @click="selectFilterAction('cancel')" style="padding: 6px 12px; font-size: var(--font-sm);">ยกเลิกบิล</div>
                  <div class="custom-select-option" :class="{ 'selected': filterAction === 'expenses' }" @click="selectFilterAction('expenses')" style="padding: 6px 12px; font-size: var(--font-sm);">ค่าใช้จ่าย</div>
                  <div class="custom-select-option" :class="{ 'selected': filterAction === 'restock_ck' }" @click="selectFilterAction('restock_ck')" style="padding: 6px 12px; font-size: var(--font-sm);">เติมสต็อก (ครัวกลาง)</div>
                  <div class="custom-select-option" :class="{ 'selected': filterAction === 'restock' }" @click="selectFilterAction('restock')" style="padding: 6px 12px; font-size: var(--font-sm);">เติมสต็อก (POS)</div>
                  <div class="custom-select-option" :class="{ 'selected': filterAction === 'stock' }" @click="selectFilterAction('stock')" style="padding: 6px 12px; font-size: var(--font-sm);">ปรับสต็อก</div>
                  <div class="custom-select-option" :class="{ 'selected': filterAction === 'cook' }" @click="selectFilterAction('cook')" style="padding: 6px 12px; font-size: var(--font-sm);">ทอด/ปรุงสุกพร้อมขาย</div>
                  <div class="custom-select-option" :class="{ 'selected': filterAction === 'waste' }" @click="selectFilterAction('waste')" style="padding: 6px 12px; font-size: var(--font-sm);">ของเสีย</div>
                  <div class="custom-select-option" :class="{ 'selected': filterAction === 'credit' }" @click="selectFilterAction('credit')" style="padding: 6px 12px; font-size: var(--font-sm);">เครดิตพนักงาน</div>
                  <div class="custom-select-option" :class="{ 'selected': filterAction === 'cash_drawer' }" @click="selectFilterAction('cash_drawer')" style="padding: 6px 12px; font-size: var(--font-sm);">ลิ้นชักเงินสด</div>
                </div>
              </div>
            </div>

            <!-- Staff Filter -->
            <div class="flex align-center gap-xs">
              <span style="font-size: var(--font-xs); font-weight: bold; color: var(--text-secondary);">พนักงาน:</span>
              <div class="custom-select-wrapper" style="width: 150px;" @click.stop>
                <div 
                  class="custom-select-trigger" 
                  :class="{ 'active': isActivityStaffDropdownOpen }" 
                  @click="isActivityStaffDropdownOpen = !isActivityStaffDropdownOpen; isFilterActionDropdownOpen = false;"
                  style="height: 32px; padding: 4px 32px 4px 12px; font-size: var(--font-sm); display: flex; align-items: center; border-radius: var(--radius-sm); background-position: right 10px center;"
                >
                  <span class="custom-select-text">
                    {{ activityStaffFilter === 'all' ? 'ทั้งหมด' : activityStaffFilter }}
                  </span>
                </div>
                <div v-if="isActivityStaffDropdownOpen" class="custom-select-dropdown" style="max-height: 200px; overflow-y: auto; top: calc(100% + 2px);">
                  <div class="custom-select-option" :class="{ 'selected': activityStaffFilter === 'all' }" @click="activityStaffFilter = 'all'; isActivityStaffDropdownOpen = false;" style="padding: 6px 12px; font-size: var(--font-sm);">ทั้งหมด</div>
                  <div 
                    v-for="staff in staffList" 
                    :key="staff.id" 
                    class="custom-select-option" 
                    :class="{ 'selected': activityStaffFilter === staff.name }" 
                    @click="activityStaffFilter = staff.name; isActivityStaffDropdownOpen = false;"
                    style="padding: 6px 12px; font-size: var(--font-sm);"
                  >
                    {{ staff.name }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Activity Logs Card -->
        <div ref="activityCardRef" class="card p-lg" style="background: #ffffff; border: 1.5px solid var(--border-color);">
          <div class="flex flex-between align-center mb-md pb-xs" style="border-bottom: 1.5px dashed var(--border-color); flex-wrap: wrap; gap: 8px;">
            <div class="card-title text-base font-bold flex align-center gap-xs" style="color: var(--primary); margin-bottom: 0; flex-wrap: wrap;">
              <span class="flex align-center gap-xs"><i class="fa-solid fa-user-shield"></i><span>ประวัติกิจกรรมพนักงาน</span></span>
              <span class="top-menus-period-sub">({{ summaryCardTitle.replace('สรุปยอด', '').trim() }})</span>
            </div>
            <span class="text-xs text-secondary font-medium tabular-nums" v-if="filteredActivityLogs.length > 0 && !loading && !activityLogsLoading">
              รวม {{ filteredActivityLogs.length }} รายการ
            </span>
          </div>

          <!-- Skeleton Loading for Activity Logs -->
          <div v-if="loading || activityLogsLoading" class="activity-logs-list">
            <div v-for="n in 5" :key="'sk-act-log-' + n" class="activity-log-item">
              <div class="log-badge-wrapper">
                <div class="skeleton" style="width: 36px; height: 36px; border-radius: 50%;"></div>
              </div>
              <div class="log-content-wrapper" style="flex: 1;">
                <div class="skeleton mb-xs" style="height: 16px; width: 75%; border-radius: 4px;"></div>
                <div class="flex align-center gap-md">
                  <div class="skeleton" style="height: 12px; width: 90px; border-radius: 4px;"></div>
                  <div class="skeleton" style="height: 12px; width: 110px; border-radius: 4px;"></div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="filteredActivityLogs.length === 0" class="text-center text-secondary py-xl text-sm" style="padding: var(--space-xl);">
            ไม่มีกิจกรรมที่ตรงตามตัวกรองในช่วงเวลาที่เลือก
          </div>
          <div v-else class="activity-logs-list">
            <div v-for="log in paginatedActivityLogs" :key="log.id" class="activity-log-item">
              <div class="log-badge-wrapper">
                <div class="log-badge" :class="resolveActivityAction(log)">
                  <i :class="getActionIconClass(resolveActivityAction(log))"></i>
                </div>
              </div>
              <div class="log-content-wrapper">
                <div class="flex align-center gap-xs flex-wrap">
                  <span class="log-title">{{ getActivityCardTitle(log) }}</span>
                  <span 
                    v-if="getActivityStockTypeBadge(log)" 
                    class="stock-type-pill" 
                    :class="getActivityStockTypeBadge(log).type"
                  >
                    {{ getActivityStockTypeBadge(log).label }}
                  </span>
                </div>
                <div class="log-details tabular-nums">{{ formatActivityDetails(log) }}</div>
                <div class="log-meta" style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
                  <span class="log-user" style="display: inline-flex; align-items: center; gap: 6px;"><i class="fa-regular fa-user" style="font-size: var(--font-xxs);"></i><span>{{ log.staff_name || 'ระบบ' }}</span></span>
                  <span class="log-time tabular-nums" style="display: inline-flex; align-items: center; gap: 6px;"><i class="fa-regular fa-clock" style="font-size: var(--font-xxs);"></i><span>{{ formatDate(log.created_at) }} {{ formatTime(log.created_at) }}</span></span>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination UI for Activity Logs -->
          <div v-if="!loading && !activityLogsLoading && totalActivityPages > 1" class="pagination-bar flex flex-center align-center gap-md mt-md">
            <button 
              class="pagination-btn" 
              :disabled="activityCurrentPage === 1" 
              @click="changeActivityPage(activityCurrentPage - 1)"
            >
              <i class="fa-solid fa-chevron-left"></i> ก่อนหน้า
            </button>
            <span class="pagination-info tabular-nums" :class="{ 'is-multi-digit': totalActivityPages >= 10 }">
              หน้า {{ activityCurrentPage }} / {{ totalActivityPages }}
            </span>
            <button 
              class="pagination-btn" 
              :disabled="activityCurrentPage === totalActivityPages" 
              @click="changeActivityPage(activityCurrentPage + 1)"
            >
              ถัดไป <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Void Order Modal -->
    <div v-if="showVoidModal" class="modal-container active flex align-center justify-center">
      <div class="modal-overlay" @click="showVoidModal = false"></div>
      <div class="modal-content modal-center w-full max-w-sm" style="position:relative; z-index:2;">
        <div class="modal-header">
          <h3 class="void-modal-title"><i class="fa-solid fa-trash-can" style="margin-right: 6px;"></i> ลบบิล #{{ voidOrder?.order_number }}</h3>
          <button class="modal-close" @click="showVoidModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div style="font-size:var(--font-sm); color:var(--text-secondary); margin-bottom:var(--space-lg); text-align:center;">
            ยอดรวม: <strong class="text-accent">{{ formatCurrency(voidOrder?.total) }}</strong>
          </div>

          <div class="form-label" style="margin-bottom:var(--space-sm);">เลือกเหตุผลการลบ:</div>
          
          <!-- Preset Buttons -->
          <div style="display:flex; flex-direction:column; gap:var(--space-sm); margin-bottom:var(--space-md);">
            <button 
              v-for="preset in voidPresets" 
              :key="preset.value"
              class="btn-action w-full"
              :class="{ 'btn-action-primary': voidReason === preset.value }"
              style="text-align: left; justify-content: flex-start;"
              @click="voidReason = preset.value"
            >
              <i :class="preset.icon"></i> {{ preset.label.replace('ยกเลิกออเดอร์', 'ลบออเดอร์') }}
            </button>
          </div>

          <!-- Custom Reason Input -->
          <div v-if="voidReason === 'custom'" class="form-group">
            <input type="text" class="form-input" v-model="voidCustomReason" placeholder="พิมพ์เหตุผลที่ต้องการระบุ..." />
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-md mt-lg">
            <button class="btn btn-secondary flex-1" :disabled="isVoidingOrder" @click="showVoidModal = false">ยกเลิก</button>
            <button 
              class="btn btn-primary flex-1" 
              :disabled="!voidReason || (voidReason === 'custom' && !voidCustomReason.trim()) || isVoidingOrder"
              @click="handleVoidOrder"
            >
              <i v-if="isVoidingOrder" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-circle-check"></i>
              {{ isVoidingOrder ? 'กำลังลบบิล...' : 'ยืนยันลบบิล' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 5: Stock History (ประวัติสต็อก) -->
    <div v-if="activeTab === 'stock_history' && isManagerOrAdminUser" class="flex flex-col gap-md">
      
      <!-- Summary Stat Cards for Stock History (Waste, Credit, Restock) -->
      <div class="stock-summary-cards-grid gap-md">
        <!-- Waste Summary Card -->
        <div 
          class="card p-md sales-kpi-card" 
          style="position: relative; overflow: hidden; background: #ffffff; border: 1.5px solid var(--border-color); border-left: 4px solid #dc2626; cursor: pointer;"
          :style="stockReasonFilter === 'waste' ? 'border-color: #dc2626; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.12);' : ''"
          @click="stockReasonFilter = stockReasonFilter === 'waste' ? 'all' : 'waste'"
        >
          <div class="flex flex-between align-center mb-xs">
            <span class="text-sm font-bold flex align-center gap-xs" style="color: var(--text-secondary);">
              <span class="sales-kpi-icon-badge" style="background: rgba(220, 38, 38, 0.1); color: #dc2626;"><i class="fa-solid fa-trash-can" style="font-size: var(--font-xxs);"></i></span>
              สินค้าเสีย / ทิ้ง
            </span>
            <span class="badge badge-danger tabular-nums" style="font-size: var(--font-xxs);">{{ stockWasteCount }} รายการ</span>
          </div>
          <template v-if="loading || stockHistoryLoading">
            <div class="skeleton my-xs" style="height: 28px; width: 100px; border-radius: 6px;"></div>
            <div class="skeleton mt-xs" style="height: 14px; width: 160px; border-radius: 4px;"></div>
          </template>
          <template v-else>
            <div class="flex flex-between align-baseline gap-sm tabular-nums">
              <div class="text-2xl font-bold text-danger">{{ stockWasteTotalQty }} <span class="text-xs text-muted font-normal">ชิ้น</span></div>
              <div class="text-base font-bold text-danger">฿{{ formatMoney(totalWasteValue) }}</div>
            </div>
            <div class="text-xs text-secondary mt-xs flex align-center gap-xs" style="color: var(--text-tertiary);">
              <i class="fa-solid fa-circle-info text-muted"></i>
              <span class="truncate">{{ stockWasteSummaryText }}</span>
            </div>
          </template>
        </div>

        <!-- Staff Credit Summary Card -->
        <div 
          class="card p-md sales-kpi-card" 
          style="position: relative; overflow: hidden; background: #ffffff; border: 1.5px solid var(--border-color); border-left: 4px solid #ea580c; cursor: pointer;"
          :style="stockReasonFilter === 'staff_benefit' ? 'border-color: #ea580c; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.12);' : ''"
          @click="stockReasonFilter = stockReasonFilter === 'staff_benefit' ? 'all' : 'staff_benefit'"
        >
          <div class="flex flex-between align-center mb-xs">
            <span class="text-sm font-bold flex align-center gap-xs" style="color: var(--text-secondary);">
              <span class="sales-kpi-icon-badge" style="background: rgba(234, 88, 12, 0.1); color: #ea580c;"><i class="fa-solid fa-utensils" style="font-size: var(--font-xxs);"></i></span>
              เครดิตพนักงาน / สวัสดิการ
            </span>
            <span class="badge tabular-nums" style="background: rgba(234, 88, 12, 0.12); color: #ea580c; font-size: var(--font-xxs);">{{ stockStaffCreditCount }} รายการ</span>
          </div>
          <template v-if="loading || stockHistoryLoading">
            <div class="skeleton my-xs" style="height: 28px; width: 110px; border-radius: 6px;"></div>
            <div class="skeleton mt-xs" style="height: 14px; width: 180px; border-radius: 4px;"></div>
          </template>
          <template v-else>
            <div class="flex flex-between align-baseline gap-sm tabular-nums">
              <div class="text-2xl font-bold" style="color: #ea580c;">{{ stockStaffCreditTotalQty }} <span class="text-xs text-muted font-normal">ชิ้น</span></div>
              <div class="text-base font-bold" style="color: #ea580c;">฿{{ formatMoney(totalStaffCreditValue) }}</div>
            </div>
            <div class="text-xs text-secondary mt-xs flex flex-between align-center" style="color: var(--text-tertiary);">
              <span class="truncate"><i class="fa-solid fa-user-check text-muted mr-xs"></i> {{ stockStaffCreditSummaryText }}</span>
              <span class="text-xs font-bold" style="color: #ea580c; white-space: nowrap;">ดูสรุปรายคน <i class="fa-solid fa-chevron-right ml-xs"></i></span>
            </div>
          </template>
        </div>

        <!-- Restock Summary Card -->
        <div 
          class="card p-md sales-kpi-card" 
          style="position: relative; overflow: visible; background: #ffffff; border: 1.5px solid var(--border-color); border-left: 4px solid #10b981; cursor: pointer;"
          :style="stockReasonFilter === 'restock_all' || stockReasonFilter === 'restock' || stockReasonFilter === 'restock_ck' ? 'border-color: #10b981; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.12);' : ''"
          @click="stockReasonFilter = stockReasonFilter === 'restock_all' ? 'all' : 'restock_all'"
        >
          <div class="flex flex-between align-center mb-xs">
            <span class="text-sm font-bold flex align-center gap-xs" style="color: var(--text-secondary);">
              <span class="sales-kpi-icon-badge" style="background: rgba(16, 185, 129, 0.1); color: #10b981;"><i class="fa-solid fa-boxes-packing" style="font-size: var(--font-xxs);"></i></span>
              การเติมสต็อกรวม
            </span>
            <div class="flex align-center gap-xs">
              <span class="badge badge-success tabular-nums" style="font-size: var(--font-xxs);">{{ stockRestockCount }} รายการ</span>
              <div style="position: relative; display: inline-flex; align-items: center;" @mouseenter="showRestockValueInfo = true" @mouseleave="showRestockValueInfo = false" @click.stop>
                <button
                  type="button"
                  @click="showRestockValueInfo = !showRestockValueInfo"
                  aria-label="ดูที่มาของมูลค่าเติมสต็อก"
                  style="background: none; border: none; outline: none; box-shadow: none; padding: 0; width: 22px; height: 22px; border-radius: 999px; cursor: pointer; color: var(--text-muted); font-size: var(--font-sm); display: inline-flex; align-items: center; justify-content: center; transition: all 0.15s;"
                  :style="showRestockValueInfo ? { color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' } : {}"
                >
                  <i class="fa-solid fa-circle-info"></i>
                </button>
                <div
                  v-if="showRestockValueInfo"
                  class="text-xs"
                  style="position: absolute; top: calc(100% + 8px); right: 0; z-index: 60; width: min(290px, 82vw); padding: 10px 12px; background: #fffcf7; border: 1px solid rgba(16, 185, 129, 0.25); border-left: 3px solid #10b981; border-radius: var(--radius-sm); color: var(--text-secondary); line-height: 1.65; box-shadow: 0 8px 24px rgba(61, 27, 17, 0.14); white-space: normal; text-align: left;"
                >
                  <div style="position: absolute; top: -6px; right: 5px; width: 10px; height: 10px; background: #fffcf7; border-top: 1px solid rgba(16, 185, 129, 0.25); border-left: 1px solid rgba(16, 185, 129, 0.25); transform: rotate(45deg);"></div>
                  <div style="font-weight: 700; color: #059669; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-calculator" style="font-size: var(--font-xxs);"></i>
                    <span>ที่มาของมูลค่าเติมสต็อก</span>
                  </div>
                  <div>คำนวณจาก <strong>ราคาขายหน้าร้าน × จำนวนชิ้นที่เติม</strong> ไม่ใช่ราคาทุนวัตถุดิบ</div>
                </div>
              </div>
            </div>
          </div>
          <template v-if="loading || stockHistoryLoading">
            <div class="skeleton my-xs" style="height: 28px; width: 100px; border-radius: 6px;"></div>
            <div class="skeleton mt-xs" style="height: 14px; width: 150px; border-radius: 4px;"></div>
          </template>
          <template v-else>
            <div class="flex flex-between align-baseline gap-sm tabular-nums">
              <div class="text-2xl font-bold text-success">+{{ stockRestockTotalQty }} <span class="text-xs text-muted font-normal">ชิ้น</span></div>
              <div class="text-base font-bold text-success">฿{{ formatMoney(totalRestockValue) }}</div>
            </div>
            <div class="text-xs text-secondary mt-xs flex align-center gap-xs" style="color: var(--text-tertiary);">
              <i class="fa-solid fa-boxes-packing text-muted"></i>
              <span>มูลค่าสินค้าที่เติมเข้าคลังสาขา</span>
            </div>
          </template>
        </div>
      </div>

      <!-- Standalone Filter Card for Stock History -->
      <div class="card p-md" style="background: #ffffff; border: 1.5px solid var(--border-color);">
        <div class="flex flex-between align-center flex-wrap gap-md">
          <!-- Quick Reason Filter Pills -->
          <div class="flex flex-wrap align-center gap-xs">
            <span style="font-size: var(--font-xs); font-weight: bold; color: var(--text-secondary); margin-right: 4px;">ประเภท:</span>
            <button 
              class="filter-pill tabular-nums" 
              :class="{ 'active': stockReasonFilter === 'all' }" 
              @click="stockReasonFilter = 'all'"
            >
              ทั้งหมด ({{ stockHistoryLogs.length }})
            </button>
            <button 
              class="filter-pill tabular-nums" 
              :class="{ 'active-success': stockReasonFilter === 'restock_ck' }" 
              @click="stockReasonFilter = 'restock_ck'"
            >
              เติมสต็อก (ครัวกลาง) ({{ stockCkRestockLogs.length }})
            </button>
            <button 
              class="filter-pill tabular-nums" 
              :class="{ 'active-success': stockReasonFilter === 'restock' }" 
              @click="stockReasonFilter = 'restock'"
            >
              เติมสต็อก (POS) ({{ stockGeneralRestockLogs.length }})
            </button>
            <button 
              class="filter-pill tabular-nums" 
              :class="{ 'active-warning': stockReasonFilter === 'cook' || stockReasonFilter === 'cook_deduct' || stockReasonFilter === 'cook_ready' }" 
              @click="stockReasonFilter = 'cook'"
            >
              ตัดของสด/ปรุงสุก ({{ stockCookLogs.length }})
            </button>
            <button 
              class="filter-pill tabular-nums" 
              :class="{ 'active': stockReasonFilter === 'adjustment' }" 
              @click="stockReasonFilter = 'adjustment'"
            >
              ปรับปรุงยอด ({{ stockAdjustmentLogs.length }})
            </button>
            <button 
              class="filter-pill tabular-nums" 
              :class="{ 'active': stockReasonFilter === 'sale' }" 
              @click="stockReasonFilter = 'sale'"
            >
              หักจากการขาย ({{ stockSaleLogs.length }})
            </button>
            <button 
              class="filter-pill tabular-nums" 
              :class="{ 'active': stockReasonFilter === 'cancel_restore' }" 
              @click="stockReasonFilter = 'cancel_restore'"
            >
              คืนสต็อก (ยกเลิกบิล) ({{ stockCancelRestoreLogs.length }})
            </button>
            <button 
              class="filter-pill tabular-nums" 
              :class="{ 'active-danger': stockReasonFilter === 'waste' }" 
              @click="stockReasonFilter = 'waste'"
            >
              ของเสีย/ทิ้ง ({{ stockWasteCount }})
            </button>
            <button 
              class="filter-pill tabular-nums" 
              :class="{ 'active-warning': stockReasonFilter === 'staff_benefit' }" 
              @click="stockReasonFilter = 'staff_benefit'"
            >
              เครดิตพนักงาน ({{ stockStaffCreditCount }})
            </button>
          </div>

          <!-- Menu Item Filter -->
          <div class="flex align-center gap-xs">
            <span style="font-size: var(--font-xs); font-weight: bold; color: var(--text-secondary);">สินค้า:</span>
            <div class="custom-select-wrapper" style="width: 220px;" @click.stop>
              <div 
                class="custom-select-trigger" 
                :class="{ 'active': isStockItemDropdownOpen }" 
                @click="isStockItemDropdownOpen = !isStockItemDropdownOpen"
                style="height: 32px; padding: 4px 32px 4px 12px; font-size: var(--font-sm); display: flex; align-items: center; border-radius: var(--radius-sm); background-position: right 10px center;"
              >
                <span class="custom-select-text">
                  {{ selectedStockItemName }}
                </span>
              </div>
              <div v-if="isStockItemDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 2px); max-height: 250px; overflow-y: auto; z-index: 1001;">
                <div 
                  class="custom-select-option" 
                  :class="{ 'selected': selectedReportsStockItemId === 'all' }" 
                  @click="selectReportsStockItem({ id: 'all', name: 'สินค้าทั้งหมด (รวมทั้งร้าน)' })" 
                  style="padding: 6px 12px; font-size: var(--font-sm); font-weight: bold; border-bottom: 1px dashed var(--border-color);"
                >
                  สินค้าทั้งหมด (รวมทั้งร้าน)
                </div>
                <div 
                  v-for="item in reportsStockItems" 
                  :key="item.id" 
                  class="custom-select-option" 
                  :class="{ 'selected': selectedReportsStockItemId === item.id }" 
                  @click="selectReportsStockItem(item)" 
                  style="padding: 6px 12px; font-size: var(--font-sm);"
                >
                  {{ item.name }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Per-Staff Credit Breakdown Card (Visible when staff_benefit filter active) -->
      <div v-if="stockReasonFilter === 'staff_benefit' && staffCreditBreakdown.length > 0" class="card p-md" style="background: #ffffff; border: 1.5px solid var(--border-color); border-radius: var(--radius-md);">
        <div class="flex flex-between align-center mb-sm pb-xs flex-wrap gap-xs" style="border-bottom: 1px solid var(--border-color);">
          <div class="font-bold text-sm flex align-center gap-xs" style="color: var(--text-primary);">
            <i class="fa-solid fa-users-viewfinder" style="color: #ea580c;"></i>
            <span>สรุปเครดิตพนักงานรายคน ({{ staffCreditBreakdown.length }} คน)</span>
          </div>
          <div class="flex align-center gap-xs text-xs font-bold tabular-nums" style="color: var(--text-secondary);">
            <span>รวม <span style="color: #ea580c;">{{ stockStaffCreditTotalQty }} ชิ้น</span></span>
            <span v-if="totalStaffCreditValue > 0">| <span class="text-danger">฿{{ formatMoney(totalStaffCreditValue) }}</span></span>
          </div>
        </div>

        <div class="flex flex-col">
          <div 
            v-for="(staff, idx) in staffCreditBreakdown" 
            :key="staff.name" 
            class="flex flex-col gap-xs"
            :style="{
              padding: '10px 2px',
              borderBottom: idx < staffCreditBreakdown.length - 1 ? '1px dashed var(--border-color)' : 'none'
            }"
          >
            <div class="flex flex-between align-center gap-xs flex-wrap">
              <div class="flex align-center gap-xs" style="min-width: 0;">
                <span class="text-xs font-bold tabular-nums" style="color: #ea580c; min-width: 18px;">{{ idx + 1 }}.</span>
                <span class="font-bold text-sm text-primary">{{ staff.name }}</span>
                <span class="text-xs text-muted tabular-nums">({{ staff.log_count }} ครั้ง)</span>
              </div>
              <div class="flex align-center gap-xs text-xs font-bold tabular-nums" style="flex-shrink: 0;">
                <span style="color: #c2410c;">{{ staff.total_qty }} ชิ้น</span>
                <span v-if="staff.total_value > 0" class="text-danger">| ฿{{ formatMoney(staff.total_value) }}</span>
              </div>
            </div>
            <div class="text-xs text-secondary tabular-nums" style="padding-left: 24px; line-height: 1.5;">
              {{ staff.items_summary }}
            </div>
          </div>
        </div>
      </div>

      <!-- Stock Logs Main Card -->
      <div ref="stockLogsCardRef" class="card p-lg" style="background: #ffffff; border: 1.5px solid var(--border-color);">
        <div class="card-header-clean mb-md" style="padding-bottom: var(--space-sm); border-bottom: 1px solid var(--border-color);">
          <div class="card-title card-title-clean">
            <i class="fa-solid fa-boxes-stacked mr-xs" style="color: var(--primary);"></i> ประวัติสต็อกและการปรับปรุง
          </div>
          <span class="text-xs text-muted font-bold tabular-nums">{{ filteredStockLogs.length }} รายการ</span>
        </div>

        <div v-if="loading || stockHistoryLoading" class="activity-logs-list">
          <div v-for="n in 5" :key="'sk-sh-' + n" class="activity-log-item" style="align-items: center;">
            <div class="skeleton" style="width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;"></div>
            <div style="flex: 1;">
              <div class="skeleton mb-xs" style="height: 15px; width: 45%; border-radius: 4px;"></div>
              <div class="skeleton mb-xs" style="height: 12px; width: 65%; border-radius: 4px;"></div>
              <div class="skeleton" style="height: 11px; width: 35%; border-radius: 4px;"></div>
            </div>
            <div style="text-align: right; flex-shrink: 0;">
              <div class="skeleton mb-xs" style="height: 18px; width: 55px; border-radius: 6px; margin-left: auto;"></div>
              <div class="skeleton" style="height: 12px; width: 70px; border-radius: 4px;"></div>
            </div>
          </div>
        </div>
        <div v-else-if="filteredStockLogs.length === 0" class="text-center text-secondary py-lg text-sm" style="padding: var(--space-lg); background: #ffffff; border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(139, 3, 19, 0.06); color: var(--primary); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 8px;">
            <i class="fa-solid fa-box-open" style="font-size: var(--font-base);"></i>
          </div>
          <div class="font-bold text-sm mb-xs" style="color: var(--text-primary);">
            ไม่พบประวัติสต็อก ({{ periodMode === 'daily' ? formatDate(selectedDate) : (periodMode === 'monthly' ? selectedMonth : selectedYear) }})
          </div>
          <div class="text-xs text-muted mb-md">
            ไม่มีรายการตามตัวกรองหรือช่วงเวลาที่เลือก
          </div>
          <div class="flex justify-center gap-xs flex-wrap">
            <button
              v-if="stockReasonFilter !== 'all' || selectedReportsStockItemId !== 'all'"
              class="filter-pill"
              @click="stockReasonFilter = 'all'; selectReportsStockItem({ id: 'all', name: 'สินค้าทั้งหมด (รวมทั้งร้าน)' })"
            >
              <i class="fa-solid fa-rotate-left" style="color: var(--primary);"></i> ล้างตัวกรอง
            </button>
            <button class="filter-pill" @click="selectYesterdayDate">
              <i class="fa-solid fa-calendar-day" style="color: var(--primary);"></i> ดูเมื่อวาน ({{ getYesterdayLabel() }})
            </button>
            <button v-if="periodMode !== 'monthly'" class="filter-pill" @click="switchToMonthlyStock">
              <i class="fa-solid fa-calendar-days" style="color: var(--primary);"></i> ดูรายเดือน ({{ selectedMonth }})
            </button>
          </div>
        </div>
        <div v-else>
          <!-- Unified Clean White Cards for Desktop & Mobile -->
          <div class="activity-logs-list" style="gap: 0;">
            <template v-for="(log, idx) in paginatedStockLogs" :key="log.id">
              <div 
                class="activity-log-item stock-log-card"
                :class="{
                  'cook-pair-top': isReportCookPair(log, paginatedStockLogs[idx + 1]),
                  'cook-pair-bottom': idx > 0 && isReportCookPair(paginatedStockLogs[idx - 1], log)
                }"
              >
                <!-- Left Reason Badge -->
                <div class="log-badge-wrapper">
                  <div class="log-badge" :class="'stock-reason-' + getStockLogCategory(log)">
                    <i :class="getStockCategoryIconClass(log)"></i>
                  </div>
                </div>

                <!-- Center Info -->
                <div class="log-content-wrapper">
                  <div class="flex align-center gap-xs flex-wrap">
                    <span class="log-title">{{ log.item_name || selectedStockItemName }}</span>
                    <span 
                      class="stock-type-pill" 
                      :class="isRawStockLog(log) ? 'raw' : 'cooked'"
                    >
                      {{ isRawStockLog(log) ? 'ของสด' : 'พร้อมขาย' }}
                    </span>
                    <span class="stock-action-tag">{{ getStockReportActionLabel(log) }}</span>
                  </div>

                  <div v-if="formatReportLogNote(log, isRawStockLog(log))" class="log-details tabular-nums">
                    {{ formatReportLogNote(log, isRawStockLog(log)) }}
                  </div>

                  <div class="log-meta" style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
                    <span class="log-user" style="display: inline-flex; align-items: center; gap: 6px;">
                      <i class="fa-regular fa-user" style="font-size: var(--font-xxs);"></i>
                      <span>{{ log.staff_name || 'ระบบ' }}</span>
                    </span>
                    <span class="log-time tabular-nums" style="display: inline-flex; align-items: center; gap: 6px;">
                      <i class="fa-regular fa-clock" style="font-size: var(--font-xxs);"></i>
                      <span>{{ formatDate(log.created_at) }} {{ formatTime(log.created_at) }}</span>
                    </span>
                  </div>
                </div>

                <!-- Right Stock Change & Balance -->
                <div class="stock-log-right tabular-nums">
                  <div class="stock-delta-badge" :class="log.change_qty > 0 ? 'positive' : 'negative'">
                    {{ log.change_qty > 0 ? `+${log.change_qty}` : log.change_qty }} ชิ้น
                  </div>
                  <div v-if="log.previous_stock !== null && log.previous_stock !== undefined" class="stock-balance-flow">
                    <span>{{ log.previous_stock }}</span>
                    <i class="fa-solid fa-arrow-right" style="font-size: var(--font-xxs); opacity: 0.6;"></i>
                    <strong style="color: var(--text-primary);">{{ log.new_stock }}</strong>
                  </div>
                </div>
              </div>

              <!-- Downward Arrow Connector for Paired Cooking Cards -->
              <div 
                v-if="isReportCookPair(log, paginatedStockLogs[idx + 1])" 
                class="flex flex-center align-center cook-pair-connector" 
                style="margin: -11px 0; z-index: 3; position: relative; pointer-events: none;"
              >
                <div 
                  class="cook-pair-pill"
                  style="display: inline-flex; align-items: center; gap: 6px; padding: 2px 10px; border-radius: 999px; background: #ffffff; border: 1.5px solid var(--border-color); color: var(--primary, #8b0313); font-size: var(--font-xxs); font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.08); transition: border-color var(--transition-base), box-shadow var(--transition-base);"
                >
                  <i class="fa-solid fa-arrow-down" style="font-size: var(--font-xxs);"></i>
                  <span style="color: var(--text-secondary); font-size: 10.5px;">นำไปปรุงสุก</span>
                </div>
              </div>
            </template>
          </div>

          <!-- Pagination UI -->
          <div v-if="totalStockLogsPages > 1" class="pagination-bar flex flex-center align-center gap-md mt-md">
            <button 
              class="pagination-btn" 
              :disabled="stockLogsCurrentPage === 1" 
              @click="changeStockLogsPage(stockLogsCurrentPage - 1)"
            >
              <i class="fa-solid fa-chevron-left"></i> ก่อนหน้า
            </button>
            <span class="pagination-info tabular-nums" :class="{ 'is-multi-digit': totalStockLogsPages >= 10 }">
              หน้า {{ stockLogsCurrentPage }} / {{ totalStockLogsPages }}
            </span>
            <button 
              class="pagination-btn" 
              :disabled="stockLogsCurrentPage === totalStockLogsPages" 
              @click="changeStockLogsPage(stockLogsCurrentPage + 1)"
            >
              ถัดไป <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import DatePeriodFilter from '../components/DatePeriodFilter.vue';
import api from '../api';
import { ui, formatCurrency, formatDate, formatTime, getToday, isTimeInRange, isAdmin, isManagerOrAdmin, getUser } from '../helpers';
import { store } from '../store';

const formatMoney = (val) => formatCurrency(val).replace('฿', '').trim();

// Role checks
const isAdminUser = computed(() => isAdmin());
const isManagerOrAdminUser = computed(() => isManagerOrAdmin());

const localBranches = ref([]);
const branches = computed(() => {
  if (store.branches && Array.isArray(store.branches) && store.branches.length > 0) {
    return store.branches;
  }
  return localBranches.value || [];
});
const currentUser = getUser();
const selectedBranchId = ref(sessionStorage.getItem('selected_branch_id') !== null && sessionStorage.getItem('selected_branch_id') !== 'all' ? Number(sessionStorage.getItem('selected_branch_id')) : (currentUser ? currentUser.branch_id : null));

const activeTab = ref('sales');
const showAvgBillInfo = ref(false);
const showRestockValueInfo = ref(false);

// New Filters State & Helpers
const customStartTime = ref('00.00');
const customEndTime = ref('23.59');

const staffList = computed(() => store.users || []);
const historyStaffFilter = ref('all');
const historyPaymentFilter = ref('all');
const activityStaffFilter = ref('all');

const isHistoryStaffDropdownOpen = ref(false);
const isHistoryPaymentDropdownOpen = ref(false);
const isActivityStaffDropdownOpen = ref(false);
const isStockItemDropdownOpen = ref(false);

const reportsStockItems = computed(() => {
  if (selectedBranchId.value && selectedBranchId.value !== 'all' && Number(selectedBranchId.value) === Number(currentUser?.branch_id)) {
    return store.stockItems || [];
  }
  const byName = new Map();
  for (const log of allStockHistoryLogs.value || []) {
    if (log?.item_name && !byName.has(log.item_name)) {
      byName.set(log.item_name, { id: log.menu_item_id, name: log.item_name });
    }
  }
  return byName.size > 0
    ? Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name, 'th'))
    : (store.stockItems || []);
});
const selectedReportsStockItemId = ref('all');

const selectedStockItemName = computed(() => {
  if (selectedReportsStockItemId.value === 'all' || !selectedReportsStockItemId.value) return 'สินค้าทั้งหมด (รวมทั้งร้าน)';
  const found = reportsStockItems.value.find(item => item.id === selectedReportsStockItemId.value);
  return found ? found.name : 'สินค้าทั้งหมด';
});

const getPaymentLabel = (pm) => {
  const map = {
    'all': 'ทั้งหมด',
    'cash': 'เงินสด',
    'qr': 'QR Code',
    'gov': 'โครงการรัฐ',
    'delivery': 'เดลิเวอรี'
  };
  return map[pm] || pm;
};

// --- CASH DRAWER AUDIT STATE ---

const calculatorTotalSum = ref(0);

// ponytail: sequence guards prevent slower earlier dropdown requests from overwriting newer selections
const reqSeq = { cashDrawer: 0, stockHistory: 0, ledger: 0, summary: 0, expenses: 0, activities: 0, history: 0, report: 0, topItems: 0 };

const isUsingDefaultFilters = () => {
  return periodMode.value === 'daily' &&
         selectedDate.value === getToday() &&
         selectedMonth.value === getToday().substring(0, 7) &&
         selectedYear.value === getToday().substring(0, 4) &&
         historyStatusFilter.value === 'all' &&
         selectedBranchId.value === store.reportsBranchId;
};

const applyDataFromStore = () => {
  if (!store.reportsLoaded) return;
  
  if (store.reportSummary) {
    summary.value = {
      today_sales: store.reportSummary.today?.total_revenue || 0,
      today_orders: store.reportSummary.today?.total_orders || 0,
      month_sales: store.reportSummary.month?.total_revenue || 0,
      month_orders: store.reportSummary.month?.total_orders || 0
    };
  }
  
  if (store.reportDailyData) {
    const data = store.reportDailyData;
    dailyReport.value = {
      total_sales: data.total_revenue || 0,
      total_orders: data.total_orders || 0,
      average_bill: data.avg_order_value || 0,
      historical_avg_bill: data.historical_avg_value || 0,
      cash_sales: data.payment_breakdown?.cash_total || 0,
      cash_orders: data.payment_breakdown?.cash_count || 0,
      qr_sales: data.payment_breakdown?.qr_total || 0,
      qr_orders: data.payment_breakdown?.qr_count || 0,
      gov_sales: data.payment_breakdown?.gov_total || 0,
      gov_orders: data.payment_breakdown?.gov_count || 0,
      delivery_sales: data.payment_breakdown?.delivery_total || 0,
      delivery_orders: data.payment_breakdown?.delivery_count || 0,
      orders: data.orders || []
    };
  }
  
  if (store.reportTopItems && !topItems.value.length) {
    topItems.value = store.reportTopItems.map(item => ({
      ...item,
      total_sales: item.total_revenue || 0
    }));
  }
  
  if (periodMode.value === 'daily') {
    expenses.value = store.reportsExpenses || [];
    activityLogs.value = store.reportsActivities || [];
  } else if (periodMode.value === 'monthly') {
    expenses.value = store.reportMonthlyExpenses || [];
  }
  
  if (periodMode.value === 'daily' && historyStatusFilter.value === 'all') {
    historyOrders.value = store.reportsHistory || [];
  }
  
  // Ledger
  let ledgerOrders = [];
  let ledgerExpenses = [];

  if (periodMode.value === 'daily') {
    ledgerOrders = store.reportsHistory || [];
    ledgerExpenses = store.reportsExpenses || [];
  } else if (periodMode.value === 'monthly') {
    ledgerOrders = store.reportMonthlyOrders || [];
    ledgerExpenses = store.reportMonthlyExpenses || [];
  }

  const list = [];

  ledgerOrders.forEach(o => {
    if (o.status !== 'completed') return;
    list.push({
      id: o.id,
      created_at: o.created_at,
      timestamp: new Date(o.created_at).getTime(),
      name: `ขายสินค้า (บิล #${o.order_number})`,
      income: o.total || 0,
      expense: 0,
      type: 'order'
    });
  });

  ledgerExpenses.forEach(e => {
    const expDate = e.expense_date || (e.created_at ? e.created_at.substring(0, 10) : '');
    const timePart = e.created_at ? e.created_at.substring(11, 19) : '00:00:00';
    const effectiveDateTime = `${expDate} ${timePart}`;
    list.push({
      id: e.id,
      date: expDate,
      created_at: e.created_at,
      timestamp: new Date(effectiveDateTime.replace(' ', 'T')).getTime() || 0,
      name: e.note || getCategoryLabel(e.category),
      income: 0,
      expense: e.amount || 0,
      type: 'expense'
    });
  });

  list.sort((a, b) => {
    const dateA = a.date || (a.created_at ? a.created_at.substring(0, 10) : '');
    const dateB = b.date || (b.created_at ? b.created_at.substring(0, 10) : '');
    if (dateA !== dateB) {
      return (dateA || '').localeCompare(dateB || '');
    }
    return a.timestamp - b.timestamp;
  });

  let running = 0;
  const computedList = list.map(item => {
    running += item.income - item.expense;
    return {
      ...item,
      runningBalance: running,
      formattedDate: formatDate(item.created_at),
      formattedTime: formatTime(item.created_at)
    };
  });

  ledgerTransactions.value = computedList.reverse();
};

// States for Period Mode
const periodMode = ref('daily'); // 'daily', 'monthly', 'yearly'
const selectedDate = ref(getToday());
const selectedMonth = ref(getToday().substring(0, 7)); // YYYY-MM
const selectedYear = ref(getToday().substring(0, 4)); // YYYY
const availableYears = ref([2024, 2025, 2026, 2027, 2028]);

// Order History States
const historyStatusFilter = ref('all');
const historyOrders = ref([]);
const historyOrdersLoading = ref(false);
let historyFilterSkeletonTimer = null;
const triggerHistoryFilterSkeleton = () => {
  historyCurrentPage.value = 1;
  historyOrdersLoading.value = true;
  if (historyFilterSkeletonTimer) clearTimeout(historyFilterSkeletonTimer);
  historyFilterSkeletonTimer = setTimeout(() => {
    historyOrdersLoading.value = false;
  }, 220);
};
const historyCurrentPage = ref(1);
const historyOrdersPerPage = 20;

const filteredHistoryOrders = computed(() => {
  let list = historyOrders.value;
  
  if (historyStaffFilter.value !== 'all') {
    list = list.filter(o => o.staff_name === historyStaffFilter.value);
  }
  
  if (historyPaymentFilter.value !== 'all') {
    list = list.filter(o => o.payment_method === historyPaymentFilter.value);
  }
  
  const isTimeFilterActive = customStartTime.value !== '00.00' || customEndTime.value !== '23.59';
  if (periodMode.value === 'daily' && isTimeFilterActive) {
    list = list.filter(o => isTimeInRange(o.created_at, customStartTime.value, customEndTime.value));
  }
  
  return list;
});

const paginatedHistoryOrders = computed(() => {
  const start = (historyCurrentPage.value - 1) * historyOrdersPerPage;
  const end = start + historyOrdersPerPage;
  return filteredHistoryOrders.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(filteredHistoryOrders.value.length / historyOrdersPerPage) || 1;
});



watch(activeTab, (newVal) => {
  if (newVal === 'order_history') {
    loadOrderHistory();
  } else if (newVal === 'cash_audit') {
    fetchCashDrawerSummary();
  } else if (newVal === 'stock_history' || newVal === 'activity_logs') {
    loadStockHistoryLogs();
    if (newVal === 'activity_logs') {
      loadActivityLogsForPeriod();
      loadExpensesForPeriod();
    }
  } else if (newVal === 'top_menus') {
    loadTopItems();
  }
});

watch(historyStatusFilter, () => {
  historyCurrentPage.value = 1;
});

watch([historyStaffFilter, historyPaymentFilter, customStartTime, customEndTime], () => {
  triggerHistoryFilterSkeleton();
  if (activeTab.value === 'top_menus' && periodMode.value === 'daily') {
    loadTopItems();
  }
});

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
  gov_sales: 0,
  gov_orders: 0,
  delivery_sales: 0,
  delivery_orders: 0,
  orders: []
});
const topItems = ref([]);
const topItemsDays = ref(7); // default 7 days
const topItemsCache = ref({});
const topItemsLoading = ref(false);

const topItemsTotalSales = computed(() => {
  return topItems.value.reduce((sum, item) => sum + (Number(item.total_sales) || 0), 0);
});

const topRevenueItem = computed(() => {
  if (!topItems.value || topItems.value.length === 0) return null;
  return [...topItems.value].sort((a, b) => (Number(b.total_sales) || 0) - (Number(a.total_sales) || 0))[0];
});

const getTopItemSalesPct = (sales) => {
  const total = topItemsTotalSales.value;
  if (!total || total <= 0) return 0;
  const pct = ((Number(sales) || 0) / total) * 100;
  return pct >= 10 ? Math.round(pct) : Number(pct.toFixed(1));
};
const expenses = ref([]);
const activityLogs = ref([]);
const activityLogsLoading = ref(false);
const stockHistoryLogs = ref([]);
const allStockHistoryLogs = ref([]);
const stockHistoryLoading = ref(false);
let activityFilterSkeletonTimer = null;
const triggerActivityFilterSkeleton = () => {
  activityCurrentPage.value = 1;
  activityLogsLoading.value = true;
  if (activityFilterSkeletonTimer) clearTimeout(activityFilterSkeletonTimer);
  activityFilterSkeletonTimer = setTimeout(() => {
    activityLogsLoading.value = false;
  }, 220);
};
const filterAction = ref('all');

watch([filterAction, activityStaffFilter], () => {
  triggerActivityFilterSkeleton();
});

const getExpenseCategoryLabel = (cat) => {
  const map = {
    raw_chicken: 'ไก่สด',
    sticky_rice: 'ข้าวเหนียว',
    meatballs: 'ลูกชิ้น',
    salapao: 'ซาลาเปา',
    fuel_oil: 'น้ำมัน',
    gas_lpg: 'แก๊ส',
    salary: 'เงินเดือน',
    utility_bills: 'ค่าไฟ/น้ำ',
    packaging: 'บรรจุภัณฑ์/ถุง',
    debt: 'หนี้',
    other: 'อื่นๆ',
    raw_materials: 'ครัวกลาง',
    gas_fuel: 'แก๊ส/น้ำมัน (เดิม)'
  };
  return map[cat] || cat;
};

const resolveActivityAction = (log) => {
  const act = log?.action || '';
  const raw = String(log?.details || '');
  if (act === 'restock_ck' || ((act.startsWith('restock_') || act.startsWith('adjust_')) && raw.includes('ครัวกลาง'))) {
    return 'restock_ck';
  }
  if ((act === 'restock_stock' || act === 'restock_raw_stock' || act === 'restock_modifier') && raw.includes('[สาเหตุ:')) {
    return act === 'restock_raw_stock' ? 'adjust_raw_stock' : 'adjust_stock';
  }
  return act;
};

const getActivityStockTypeBadge = (log) => {
  const act = resolveActivityAction(log);
  const stockActions = [
    'restock_ck', 'restock_stock', 'restock_raw_stock', 'restock_modifier',
    'adjust_stock', 'adjust_raw_stock', 'adjust_modifier',
    'record_waste', 'record_raw_waste', 'staff_credit', 'staff_raw_credit'
  ];
  if (!stockActions.includes(act)) return null;
  if (log?.stock_kind === 'raw') return { label: 'ของสด', type: 'raw' };
  if (log?.stock_kind === 'cooked') return { label: 'พร้อมขาย', type: 'cooked' };
  const raw = String(log?.details || '');
  if (act.includes('_modifier') || raw.includes('เครื่องปรุง')) {
    return { label: 'เครื่องปรุง', type: 'raw' };
  }
  if (act.includes('_raw_') || raw.includes('ของสด') || raw.includes('วัตถุดิบ')) {
    return { label: 'ของสด', type: 'raw' };
  }
  return { label: 'พร้อมขาย', type: 'cooked' };
};

const getActivityCardTitle = (log) => {
  const act = resolveActivityAction(log);
  const raw = String(log?.details || '');
  if (act === 'fry_chicken') {
    const m = raw.match(/^ทำการ(ทอด|ย่าง|ต้ม|นึ่ง|ปิ้ง|ห่อ)/);
    return m ? `${m[1]}สินค้าพร้อมขาย` : 'ทอด/ปรุงสุกพร้อมขาย';
  }
  const map = {
    login: 'เข้าสู่ระบบ',
    complete_order: 'ขายสำเร็จ',
    cancel_order: 'ยกเลิกบิล',
    log_expense: 'บันทึกค่าใช้จ่าย',
    delete_expense: 'ยกเลิกค่าใช้จ่าย',
    reverse_expense: 'ยกเลิกค่าใช้จ่าย',
    restock_ck: 'เติมสต็อก (ครัวกลาง)',
    restock_stock: 'เติมสต็อก (POS)',
    restock_raw_stock: 'เติมสต็อก (POS)',
    restock_modifier: 'เติมสต็อกเครื่องปรุง (POS)',
    adjust_stock: 'ปรับสต็อก',
    adjust_raw_stock: 'ปรับสต็อก',
    adjust_modifier: 'ปรับสต็อกเครื่องปรุง',
    reverse_stock_log: 'ยกเลิกรายการสต็อก',
    record_waste: 'บันทึกของเสีย',
    record_raw_waste: 'บันทึกของเสีย',
    staff_credit: 'เครดิตพนักงาน',
    staff_raw_credit: 'เครดิตพนักงาน',
    cash_opening_set: 'ตั้งเงินทอนเริ่มต้น',
    cash_audit: 'ตรวจนับลิ้นชักเงินสด',
    setting_change: 'เปลี่ยนการตั้งค่า'
  };
  return map[act] || 'กิจกรรมระบบ';
};

const formatActivityDetails = (log) => {
  const raw = String(log?.details || '').trim();
  if (!raw) return '-';
  const badge = getActivityStockTypeBadge(log);
  const kindPrefix = badge ? `${badge.label} • ` : '';
  const formatted = raw
    .replace(/^(.+?)\s*เข้าสู่ระบบ(?:สำเร็จ)?\s*\(สาขา:\s*(.+)\)$/, '$1\nสาขา: $2')
    .replace(/^สร้าง(?:ออเดอร์และชำระเงินสำเร็จ|และชำระเงินออเดอร์)\s*เลขที่\s*#?(\S+)\s*ยอดรวม\s*([\d,.]+)\s*บาท$/, 'เลขที่ #$1\nยอดรวม ฿$2')
    .replace(/^ยกเลิก(?:บิล|ออเดอร์)\s*#?(\S+)\s*สำเร็จ\s*\(เหตุผล:\s*(.+)\)$/, 'เลขที่ #$1\nเหตุผล: $2')
    .replace(/^รายจ่าย:\s*/, '')
    .replace(/^บันทึกค่าใช้จ่าย\s*หมวดหมู่\s*(.+?)\s*จำนวน\s*([\d,.]+)\s*บาท(?:\s*\(บันทึกเพิ่มเติม:\s*(.+)\))?$/, (_, cat, amt, note) => `${cat}\n฿${amt}${note ? ` (${note.replace(/^เบิกของจากครัวกลาง\s*/, '')})` : ''}`)
    .replace(/\(เบิกของจากครัวกลาง\s*/g, '(')
    .replace(/^ยกเลิก(?:และคืนยอดค่าใช้จ่าย|รายการเบิกของจากครัวกลาง)\s*(#\S+)\s*\((.+?)\)\s*จำนวน\s*([\d,.]+)\s*บาท.*$/, (_, id, note, amt) => `รายการ ${id} (${note.replace(/^เบิกของจากครัวกลาง\s*/, '')})\n฿${amt}`)
    .replace(/^(?:ปรับปรุง|เติม)สต็อก(?:ของสด|ของทอด|ของนึ่ง|ของปิ้ง|ของห่อ|ทอดสุก|ย่างสุก|ต้มสุก|นึ่งสุก|สุก|เครื่องปรุง|วัตถุดิบอัตโนมัติจากครัวกลาง)?\s*(.+?)\s*([+-]?[\d,.]+\s*\S+)\s*\(ก่อนปรับ:\s*([\d,.]+),\s*หลังปรับ:\s*([\d,.]+)\)(?:\s*\[(?:สาเหตุ:\s*)?(.+?)\])?$/, (_, name, qty, prev, next, r) => `${kindPrefix}${name} ${qty}\nคงเหลือ ${prev} → ${next}${r && r !== 'อื่นๆ' ? ` (${r})` : ''}`)
    .replace(/^ทำการ(ทอด|ย่าง|ต้ม|นึ่ง|ปิ้ง|ห่อ)\s*(.+?)\s*จำนวน\s*([\d,.]+)\s*(\S+)\s*\(ของสดคงเหลือ:\s*([\d,.]+),\s*.+?พร้อมขายคงเหลือ:\s*([\d,.]+)\)$/, 'นำของสดมา$1: $2 +$3 $4\nหลัง$1: ของสดเหลือ $5 / พร้อมขาย $6')
    .replace(/^ทำการ(ทอด|ย่าง|ต้ม|นึ่ง|ปิ้ง|ห่อ)\s*(.+?)\s*จำนวน\s*([\d,.]+)\s*(\S+)\s*\(พร้อมขายคงเหลือ:\s*([\d,.]+)\)$/, '$1เพิ่ม: $2 +$3 $4\nหลัง$1: พร้อมขาย $5')
    .replace(/^ยกเลิกบันทึกสต็อก\s*(#\S+)\s*\((.+?)\).*$/, 'รายการ $1\n$2')
    .replace(/^บันทึกของเสีย(?:ของสด)?\s*(.+?)\s*([+-]?[\d,.]+\s*\S+)\s*\((.+)\)$/, (_, name, qty, note) => `${kindPrefix}${name} ${qty}${note && note !== 'ไม่ระบุรายละเอียดเพิ่มเติม' ? `\n${note}` : ''}`)
    .replace(/^บันทึกของกินพนักงาน\/เครดิต(?:ของสด)?\s*(.+?)\s*([+-]?[\d,.]+\s*\S+)\s*\((.+)\)$/, (_, name, qty, note) => {
      const cleanStaffNote = String(note || '').replace(/^\[.*?\]\s*/, '').trim();
      const staffName = String(log?.staff_name || '').trim();
      const showNote = cleanStaffNote && cleanStaffNote !== 'แจกพนักงานรับประทาน' && (!staffName || cleanStaffNote !== staffName);
      return `${kindPrefix}${name} ${qty}${showNote ? `\n${cleanStaffNote}` : ''}`;
    })
    .replace(/^.+?บันทึกเงินทอนตั้งต้น(?:กะ)?วันที่\s*(\S+)\s*(?:เป็นเงิน|จำนวน)\s*([\d,.]+)\s*บาท$/, 'วันที่ $1\nเป็นเงิน ฿$2')
    .replace(/^.+?ตรวจสอบเงินสด(?:กะ)?วันที่\s*(\S+)\s*\(นับจริง:\s*([\d,.]+)\s*บาท,\s*คาดการณ์:\s*([\d,.]+)\s*บาท,\s*ผลต่าง:\s*([+-]?[\d,.]+)\s*บาท\)$/, 'วันที่ $1\nนับจริง ฿$2 • คาดการณ์ ฿$3 (ผลต่าง ฿$4)')
    .replace(/\s*\(สาขา:\s*(.+)\)$/, '\nสาขา: $1');

  const staffName = String(log?.staff_name || '').trim();
  if (staffName && log?.action !== 'login' && !raw.includes('ครัวกลาง')) {
    return formatted.split('\n').filter(line => line.trim() !== staffName).join('\n');
  }
  return formatted;
};

const filteredActivityLogs = computed(() => {
  // 1. Get database activity logs, filtering out database log_expense (avoid duplicates) and create_order (keep only completed orders)
  let dbLogs = activityLogs.value.filter(log => log.action !== 'log_expense' && log.action !== 'create_order');
  
  // 2. Map actual expense records dynamically to mock activity logs
  const mappedExpenses = expenses.value.map(e => {
    const cleanNote = e.note ? String(e.note).replace(/^เบิกของจากครัวกลาง\s*/, '').trim() : '';
    const amountStr = `฿${Number(e.amount || 0).toLocaleString()}`;
    const ckMatch = cleanNote.match(/^(\[[^\]]+\])\s*(ใบเบิก\s*#\S+)(?:\s*\((.+)\))?$/);
    let details = `${getExpenseCategoryLabel(e.category)}\n${amountStr}`;
    if (ckMatch) {
      details = `${getExpenseCategoryLabel(e.category)}\n${amountStr} ${ckMatch[1]}\n${ckMatch[2]}${ckMatch[3] ? ` (${ckMatch[3]})` : ''}`;
    } else if (cleanNote) {
      details += `\n${cleanNote}`;
    }
    return {
      id: `expense-${e.id}`,
      branch_id: e.branch_id,
      user_id: e.staff_id,
      action: 'log_expense',
      details,
      created_at: e.created_at,
      staff_name: e.staff_name || 'ผู้ดูแลระบบ'
    };
  });

  // 2.5 Map Central Kitchen auto-restocks from allStockHistoryLogs / stockHistoryLogs into activity logs
  const sourceStockLogs = Array.isArray(allStockHistoryLogs.value) && allStockHistoryLogs.value.length > 0
    ? allStockHistoryLogs.value
    : (Array.isArray(stockHistoryLogs.value) ? stockHistoryLogs.value : []);
  const mappedCkRestocks = sourceStockLogs
    .filter(s => s.reason === 'restock' && String(s.note || '').includes('ครัวกลาง'))
    .map(s => {
      const reqMatch = String(s.note || '').match(/ใบเบิก\s*(#\S+)/);
      const byMatch = String(s.note || '').match(/โดย\s*(.+)$/);
      const qtySign = Number(s.change_qty) >= 0 ? '+' : '';
      const isRaw = isRawStockLog(s);
      const kindLabel = isRaw ? 'ของสด' : 'พร้อมขาย';
      return {
        id: `ck-restock-${s.id}`,
        branch_id: s.branch_id,
        user_id: s.staff_id,
        action: 'restock_ck',
        stock_kind: isRaw ? 'raw' : 'cooked',
        details: `${kindLabel} • ${s.item_name || 'สินค้า'} ${qtySign}${s.change_qty} ชิ้น\nคงเหลือ ${s.previous_stock} → ${s.new_stock}${reqMatch ? `\nใบเบิก ${reqMatch[1]}` : ''}`,
        created_at: s.created_at,
        staff_name: s.staff_name || (byMatch ? byMatch[1].trim() : 'ครัวกลาง')
      };
    });

  // 3. Combine all lists
  let combined = [...dbLogs, ...mappedExpenses, ...mappedCkRestocks];

  // 4. Sort by created_at descending
  combined.sort((a, b) => new Date(b.created_at.replace(' ', 'T')) - new Date(a.created_at.replace(' ', 'T')));
  
  // 5. Apply activity category filter
  if (filterAction.value !== 'all') {
    combined = combined.filter(log => {
      const act = resolveActivityAction(log);
      if (filterAction.value === 'login') return act === 'login';
      if (filterAction.value === 'sales') return act === 'complete_order';
      if (filterAction.value === 'cancel') return act === 'cancel_order';
      if (filterAction.value === 'expenses') return act === 'log_expense' || act === 'delete_expense' || act === 'reverse_expense';
      if (filterAction.value === 'restock_ck') return act === 'restock_ck';
      if (filterAction.value === 'restock') return act === 'restock_stock' || act === 'restock_raw_stock' || act === 'restock_modifier';
      if (filterAction.value === 'stock') return act === 'adjust_stock' || act === 'adjust_raw_stock' || act === 'adjust_modifier' || act === 'reverse_stock_log';
      if (filterAction.value === 'cook') return act === 'fry_chicken';
      if (filterAction.value === 'waste') return act === 'record_waste' || act === 'record_raw_waste';
      if (filterAction.value === 'credit') return act === 'staff_credit' || act === 'staff_raw_credit';
      if (filterAction.value === 'cash_drawer') return act === 'cash_opening_set' || act === 'cash_audit' || act === 'setting_change';
      return true;
    });
  }

  // 6. Filter by staff
  if (activityStaffFilter.value !== 'all') {
    combined = combined.filter(log => log.staff_name === activityStaffFilter.value);
  }

  // 7. Filter by time range if periodMode === 'daily'
  const isTimeFilterActive = customStartTime.value !== '00.00' || customEndTime.value !== '23.59';
  if (periodMode.value === 'daily' && isTimeFilterActive) {
    combined = combined.filter(log => isTimeInRange(log.created_at, customStartTime.value, customEndTime.value));
  }

  return combined;
});

// Expanded order state
const expandedOrderId = ref(null);
const expandedItems = ref([]);

// Void modal state
const showVoidModal = ref(false);
const voidOrder = ref(null);
const voidReason = ref('');
const voidCustomReason = ref('');
const voidPresets = [
  { value: 'ลูกค้ายกเลิกออเดอร์', label: 'ลูกค้ายกเลิกออเดอร์', icon: 'fa-solid fa-circle-xmark' },
  { value: 'กรอกข้อมูลผิดพลาด / ทำบิลซ้ำ', label: 'กรอกข้อมูลผิดพลาด / ทำบิลซ้ำ', icon: 'fa-solid fa-pen-to-square' },
  { value: 'custom', label: 'อื่นๆ (ระบุเอง)', icon: 'fa-solid fa-circle-question' },
];

// Expense form state
const totalExpenses = computed(() => {
  const refundedIds = new Set(
    expenses.value
      .filter(e => (e.is_refund === 1 || e.status === 'refund') && e.refund_ref_id)
      .map(e => Number(e.refund_ref_id))
  );
  return expenses.value.reduce((sum, e) => {
    if (e.is_refund === 1 || e.status === 'refund') return sum - (Number(e.amount) || 0);
    if (e.status === 'cancelled') {
      if (refundedIds.has(Number(e.id))) return sum + (Number(e.amount) || 0);
      return sum;
    }
    return sum + (Number(e.amount) || 0);
  }, 0);
});

// Ledger States
const ledgerTransactions = ref([]);
const ledgerOrders = ref([]);
const ledgerLoading = ref(false);

const filteredLedgerTransactions = computed(() => {
  let list = ledgerTransactions.value;
  const isTimeFilterActive = customStartTime.value !== '00.00' || customEndTime.value !== '23.59';
  if (periodMode.value === 'daily' && isTimeFilterActive) {
    list = list.filter(item => isTimeInRange(item.created_at, customStartTime.value, customEndTime.value));
  }
  return list;
});


// Pagination States for Daily/Monthly Orders
const displayedDailyReport = computed(() => {
  const rep = dailyReport.value || { orders: [] };
  const isTimeFilterActive = customStartTime.value !== '00.00' || customEndTime.value !== '23.59';
  if (periodMode.value !== 'daily' || !isTimeFilterActive) {
    const allOrders = rep.orders || [];
    const completedCount = Number(rep.total_orders) || allOrders.filter(o => o.status === 'completed').length;
    const cancelledCount = allOrders.filter(o => o.status === 'cancelled').length;
    return {
      ...rep,
      total_orders: completedCount,
      cancelled_orders: cancelledCount,
      all_orders: completedCount + cancelledCount,
      historical_avg_bill: Number(rep.historical_avg_bill) || 0
    };
  }

  const orders = (rep.orders || []).filter(o => isTimeInRange(o.created_at, customStartTime.value, customEndTime.value));
  const completed = orders.filter(o => o.status === 'completed');
  const cancelled = orders.filter(o => o.status === 'cancelled');
  const sumBy = (pm) => completed.filter(o => o.payment_method === pm);
  const sumAmt = (arr) => arr.reduce((s, o) => s + (Number(o.total) || 0), 0);

  const total_sales = sumAmt(completed);
  const total_orders = completed.length;
  const cancelled_orders = cancelled.length;
  const all_orders = total_orders + cancelled_orders;
  const cash = sumBy('cash');
  const qr = completed.filter(o => o.payment_method === 'qr' || o.payment_method === 'promptpay');
  const gov = sumBy('gov');
  const delivery = sumBy('delivery');

  return {
    total_sales,
    total_orders,
    cancelled_orders,
    all_orders,
    average_bill: total_orders > 0 ? total_sales / total_orders : 0,
    historical_avg_bill: Number(rep.historical_avg_bill) || 0,
    cash_sales: sumAmt(cash),
    cash_orders: cash.length,
    qr_sales: sumAmt(qr),
    qr_orders: qr.length,
    gov_sales: sumAmt(gov),
    gov_orders: gov.length,
    delivery_sales: sumAmt(delivery),
    delivery_orders: delivery.length,
    orders
  };
});

const getPaymentPct = (sales) => {
  const total = Number(displayedDailyReport.value?.total_sales) || 0;
  if (total <= 0) return 0;
  return Math.round(((Number(sales) || 0) / total) * 100);
};

const scrollToRef = (refEl) => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  nextTick(() => {
    const el = refEl?.value;
    if (!el) return;
    const isMobile = window.innerWidth < 1024;
    const card = el.closest('.card') || el;
    card.style.minHeight = isMobile ? 'calc(100dvh - 130px)' : 'calc(100dvh - 24px)';
    const offset = isMobile ? 64 : 12;
    el.style.scrollMarginTop = `${offset}px`;
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      const targetY = Math.max(0, rect.top + currentScroll - offset);
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    });
  });
};

const dailyOrdersCardRef = ref(null);
const dailyOrdersCurrentPage = ref(1);
const changeDailyOrdersPage = (newPage) => {
  if (newPage < 1 || newPage > totalDailyOrdersPages.value) return;
  dailyOrdersCurrentPage.value = newPage;
  scrollToRef(dailyOrdersCardRef);
};

const historyOrdersCardRef = ref(null);
const changeHistoryOrdersPage = (newPage) => {
  if (newPage < 1 || newPage > totalPages.value) return;
  historyCurrentPage.value = newPage;
  scrollToRef(historyOrdersCardRef);
};
const dailyOrdersPerPage = 15;
const totalDailyOrdersPages = computed(() => {
  const count = (displayedDailyReport.value.orders || []).length;
  return Math.ceil(count / dailyOrdersPerPage) || 1;
});
const paginatedDailyReportOrders = computed(() => {
  const orders = displayedDailyReport.value.orders || [];
  const start = (dailyOrdersCurrentPage.value - 1) * dailyOrdersPerPage;
  const end = start + dailyOrdersPerPage;
  return orders.slice(start, end);
});

// Pagination States for Ledger Transactions
const ledgerCardRef = ref(null);
const ledgerCurrentPage = ref(1);
const ledgerPerPage = 15;
const totalLedgerPages = computed(() => {
  const count = filteredLedgerTransactions.value.length;
  return Math.ceil(count / ledgerPerPage) || 1;
});
const changeLedgerPage = (newPage) => {
  if (newPage < 1 || newPage > totalLedgerPages.value) return;
  ledgerCurrentPage.value = newPage;
  scrollToRef(ledgerCardRef);
};
const paginatedLedgerTransactions = computed(() => {
  const start = (ledgerCurrentPage.value - 1) * ledgerPerPage;
  const end = start + ledgerPerPage;
  return filteredLedgerTransactions.value.slice(start, end);
});

// Pagination States for Activity Logs
const activityCardRef = ref(null);
const activityCurrentPage = ref(1);
const activityPerPage = 15;
const totalActivityPages = computed(() => {
  const count = filteredActivityLogs.value.length;
  return Math.ceil(count / activityPerPage) || 1;
});
const changeActivityPage = (newPage) => {
  if (newPage < 1 || newPage > totalActivityPages.value) return;
  activityCurrentPage.value = newPage;
  scrollToRef(activityCardRef);
};
const paginatedActivityLogs = computed(() => {
  const start = (activityCurrentPage.value - 1) * activityPerPage;
  const end = start + activityPerPage;
  return filteredActivityLogs.value.slice(start, end);
});

// Pagination & Filtering States for Stock Logs
const stockLogsCurrentPage = ref(1);
const stockLogsPerPage = 16;
const stockReasonFilter = ref('all'); // 'all', 'waste', 'staff_benefit', 'restock', 'adjustment'
let stockFilterSkeletonTimer = null;
watch(stockReasonFilter, () => {
  stockLogsCurrentPage.value = 1;
  stockHistoryLoading.value = true;
  if (stockFilterSkeletonTimer) clearTimeout(stockFilterSkeletonTimer);
  stockFilterSkeletonTimer = setTimeout(() => {
    stockHistoryLoading.value = false;
  }, 220);
});

const normalizeLinkedName = (str) => String(str || '').replace(/ไส้/g, '').replace(/หมั่นโถว/g, 'หมั่นโถ').replace(/ไขเค็ม/g, 'ไข่เค็ม').replace(/\s+/g, '').trim();

const isLinkedRecipeCookPair = (deductLog, readyLog) => {
  if (!deductLog || !readyLog || deductLog.id === readyLog.id) return false;
  if (readyLog._syntheticPartnerId === deductLog.id || deductLog._syntheticForId === readyLog.id) return true;
  const dNote = String(deductLog.note || '');
  const m = dNote.match(/หักอัตโนมัติจากการ\S+\s+(.+?)\s+\+([\d,.]+)\s*ชิ้น/);
  if (!m) return false;
  const targetName = normalizeLinkedName(m[1]);
  const targetQty = Number(m[2].replace(/,/g, ''));
  const rName = normalizeLinkedName(readyLog.item_name);
  if (!rName || rName !== targetName || Number(readyLog.change_qty) <= 0) return false;
  if (!isNaN(targetQty) && Math.abs(Number(readyLog.change_qty) - targetQty) > 0.01) return false;
  const t1 = new Date(deductLog.created_at).getTime();
  const t2 = new Date(readyLog.created_at).getTime();
  return Math.abs(t1 - t2) <= 120000;
};

const buildSyntheticCookDeductPartner = (readyLog) => {
  if (!readyLog) return null;
  const name = String(readyLog.item_name || '').trim();
  const qty = Math.abs(Number(readyLog.change_qty) || 0);
  if (qty <= 0) return null;
  if (name.includes('แร็ป')) {
    const deductQty = Math.round(qty * 1.5 * 100) / 100;
    return {
      id: `syn-deduct-${readyLog.id}`,
      _syntheticForId: readyLog.id,
      branch_id: readyLog.branch_id,
      menu_item_id: null,
      item_name: 'ไก่ไร้กระดูก',
      change_qty: -deductQty,
      previous_stock: null,
      new_stock: null,
      reason: 'adjustment',
      staff_name: readyLog.staff_name,
      stock_type: 'cooked',
      note: `หักอัตโนมัติจากการเพิ่มสต็อก ${name} +${qty} ชิ้น (ใช้ไก่ไร้กระดูก ${deductQty} ชิ้น)`,
      created_at: readyLog.created_at
    };
  }
  if (name.includes('เปาทอด') || name.includes('เปาปิ้ง')) {
    let sourceName = 'ซาลาเปานึ่ง';
    if (name.includes('ไข่เค็ม') || name.includes('ไขเค็ม')) sourceName = 'ซาลาเปาไส้หมูสับ ไข่เค็ม';
    else if (name.includes('หมู')) sourceName = 'ซาลาเปาไส้หมูสับ';
    else if (name.includes('ถั่วดำ')) sourceName = 'ซาลาเปาไส้ถั่วดำ';
    else if (name.includes('ครีม')) sourceName = 'ซาลาเปาไส้ครีม';
    else if (name.includes('หมั่นโถ')) sourceName = 'หมั่นโถว';
    return {
      id: `syn-deduct-${readyLog.id}`,
      _syntheticForId: readyLog.id,
      branch_id: readyLog.branch_id,
      menu_item_id: null,
      item_name: sourceName,
      change_qty: -qty,
      previous_stock: null,
      new_stock: null,
      reason: 'adjustment',
      staff_name: readyLog.staff_name,
      stock_type: 'cooked',
      note: `หักอัตโนมัติจากการเพิ่มสต็อก ${name} +${qty} ชิ้น`,
      created_at: readyLog.created_at
    };
  }
  return null;
};

const getStockLogCategory = (log) => {
  if (!log) return 'other';
  const note = String(log.note || '');
  const isRaw = isRawStockLog(log);
  if (log.reason === 'waste') return 'waste';
  if (log.reason === 'staff_benefit') return 'staff_benefit';
  if (log.reason === 'cancel_restore') return 'cancel_restore';
  if (log.reason === 'sale') return 'sale';
  const itemName = String(log.item_name || '').trim();
  const pool = Array.isArray(allStockHistoryLogs.value) && allStockHistoryLogs.value.length > 0
    ? allStockHistoryLogs.value
    : (Array.isArray(stockHistoryLogs.value) ? stockHistoryLogs.value : []);
  const isLinkedTarget = !isRaw && Number(log.change_qty) > 0 && !note.includes('ครัวกลาง') && (
    itemName.includes('แร็ป') || itemName.includes('เปาทอด') || itemName.includes('เปาปิ้ง') ||
    pool.some(other => isLinkedRecipeCookPair(other, log))
  );
  if (log.reason === 'adjustment') {
    if (note.includes('หักอัตโนมัติจากการ') || (isRaw && Number(log.change_qty) < 0 && (note.includes('ปรุง') || note.includes('ทอด') || note.includes('หัก')))) {
      return 'cook_deduct';
    }
    if (isLinkedTarget) return 'cook_ready';
    return 'adjustment';
  }
  if (log.reason === 'restock') {
    if (note.includes('ครัวกลาง')) {
      return 'restock_ck';
    }
    if (isLinkedTarget || (!isRaw && (note.includes('ปรุง') || note.includes('ทอด') || note.includes('สุก')) && !note.includes('(Relative)') && !note.includes('เติมสต็อกของ'))) {
      return 'cook_ready';
    }
    return 'restock';
  }
  return log.reason || 'other';
};

const isReportCookPair = (topLog, bottomLog) => {
  if (!topLog || !bottomLog || topLog.id === bottomLog.id) return false;
  if (getStockLogCategory(topLog) !== 'cook_deduct' || getStockLogCategory(bottomLog) !== 'cook_ready') return false;
  if (isLinkedRecipeCookPair(topLog, bottomLog)) return true;
  const sameItem = (topLog.menu_item_id && topLog.menu_item_id === bottomLog.menu_item_id) ||
    (topLog.item_name && topLog.item_name === bottomLog.item_name);
  if (!sameItem) return false;
  const sameQty = Math.abs(Number(topLog.change_qty)) === Math.abs(Number(bottomLog.change_qty));
  const timeClose = Math.abs(new Date(topLog.created_at).getTime() - new Date(bottomLog.created_at).getTime()) <= 120000;
  return sameQty && timeClose;
};

const orderStockLogsWithCookPairs = (logs) => {
  if (!Array.isArray(logs) || logs.length === 0) return logs;
  const pool = Array.isArray(allStockHistoryLogs.value) && allStockHistoryLogs.value.length > 0
    ? allStockHistoryLogs.value
    : (Array.isArray(stockHistoryLogs.value) ? stockHistoryLogs.value : logs);
  const expanded = [...logs];
  const expandedIds = new Set(expanded.map(l => l?.id));
  for (const item of logs) {
    if (!item) continue;
    const cat = getStockLogCategory(item);
    if (cat === 'cook_deduct') {
      const partner = pool.find(other => other && !expandedIds.has(other.id) && isReportCookPair(item, other));
      if (partner) {
        expandedIds.add(partner.id);
        expanded.push(partner);
      }
    } else if (cat === 'cook_ready') {
      const partner = pool.find(other => other && !expandedIds.has(other.id) && isReportCookPair(other, item));
      if (partner) {
        expandedIds.add(partner.id);
        expanded.push(partner);
      }
    }
  }
  if (expanded.length < 2) {
    if (expanded.length === 1 && getStockLogCategory(expanded[0]) === 'cook_ready') {
      const syn = buildSyntheticCookDeductPartner(expanded[0]);
      if (syn) return [syn, expanded[0]];
    }
    return expanded;
  }
  const usedIds = new Set();
  const result = [];
  for (let i = 0; i < expanded.length; i++) {
    const current = expanded[i];
    if (!current || usedIds.has(current.id)) continue;
    const cat = getStockLogCategory(current);
    if (cat === 'cook_deduct') {
      const partner = expanded.find(other => !usedIds.has(other.id) && isReportCookPair(current, other));
      usedIds.add(current.id);
      result.push(current);
      if (partner) {
        usedIds.add(partner.id);
        result.push(partner);
      }
    } else if (cat === 'cook_ready') {
      let partner = expanded.find(other => !usedIds.has(other.id) && isReportCookPair(other, current));
      if (!partner) {
        partner = buildSyntheticCookDeductPartner(current);
      }
      if (partner) {
        usedIds.add(partner.id);
        usedIds.add(current.id);
        result.push(partner, current);
      } else {
        usedIds.add(current.id);
        result.push(current);
      }
    } else {
      usedIds.add(current.id);
      result.push(current);
    }
  }
  return result;
};

const getStockCategoryIconClass = (log) => {
  const cat = getStockLogCategory(log);
  const map = {
    restock_ck: 'fa-solid fa-truck-ramp-box',
    restock: 'fa-solid fa-boxes-packing',
    adjustment: 'fa-solid fa-sliders',
    cook_deduct: 'fa-solid fa-fire-burner',
    cook_ready: 'fa-solid fa-fire-burner',
    waste: 'fa-solid fa-trash-can',
    staff_benefit: 'fa-solid fa-utensils',
    cancel_restore: 'fa-solid fa-rotate-left',
    sale: 'fa-solid fa-cart-shopping'
  };
  return map[cat] || 'fa-solid fa-box';
};

const filteredStockLogs = computed(() => {
  try {
    let list = Array.isArray(stockHistoryLogs.value) ? stockHistoryLogs.value : [];
    if (stockReasonFilter.value && stockReasonFilter.value !== 'all') {
      if (stockReasonFilter.value === 'restock_all') {
        list = list.filter(log => {
          const cat = getStockLogCategory(log);
          return cat === 'restock_ck' || cat === 'restock';
        });
      } else if (stockReasonFilter.value === 'cook') {
        list = list.filter(log => {
          const cat = getStockLogCategory(log);
          return cat === 'cook_deduct' || cat === 'cook_ready';
        });
      } else {
        list = list.filter(log => getStockLogCategory(log) === stockReasonFilter.value);
      }
    }
    const isTimeFilterActive = customStartTime.value !== '00.00' || customEndTime.value !== '23.59';
    if (periodMode.value === 'daily' && isTimeFilterActive) {
      list = list.filter(log => log && isTimeInRange(log.created_at, customStartTime.value, customEndTime.value));
    }
    return orderStockLogsWithCookPairs(list);
  } catch (e) {
    console.error('filteredStockLogs error:', e);
    return [];
  }
});

// Category log lists for stat cards & filter pills
const stockWasteLogs = computed(() => Array.isArray(stockHistoryLogs.value) ? stockHistoryLogs.value.filter(l => getStockLogCategory(l) === 'waste') : []);
const stockStaffCreditLogs = computed(() => Array.isArray(stockHistoryLogs.value) ? stockHistoryLogs.value.filter(l => getStockLogCategory(l) === 'staff_benefit') : []);
const stockCkRestockLogs = computed(() => Array.isArray(stockHistoryLogs.value) ? stockHistoryLogs.value.filter(l => getStockLogCategory(l) === 'restock_ck') : []);
const stockGeneralRestockLogs = computed(() => Array.isArray(stockHistoryLogs.value) ? stockHistoryLogs.value.filter(l => getStockLogCategory(l) === 'restock') : []);
const stockRestockLogs = computed(() => Array.isArray(stockHistoryLogs.value) ? stockHistoryLogs.value.filter(l => {
  const cat = getStockLogCategory(l);
  return cat === 'restock_ck' || cat === 'restock';
}) : []);
const stockAdjustmentLogs = computed(() => Array.isArray(stockHistoryLogs.value) ? stockHistoryLogs.value.filter(l => getStockLogCategory(l) === 'adjustment') : []);
const stockCookDeductLogs = computed(() => Array.isArray(stockHistoryLogs.value) ? stockHistoryLogs.value.filter(l => getStockLogCategory(l) === 'cook_deduct') : []);
const stockCookReadyLogs = computed(() => Array.isArray(stockHistoryLogs.value) ? stockHistoryLogs.value.filter(l => getStockLogCategory(l) === 'cook_ready') : []);
const stockCookLogs = computed(() => Array.isArray(stockHistoryLogs.value) ? stockHistoryLogs.value.filter(l => {
  const cat = getStockLogCategory(l);
  return cat === 'cook_deduct' || cat === 'cook_ready';
}) : []);
const stockSaleLogs = computed(() => Array.isArray(stockHistoryLogs.value) ? stockHistoryLogs.value.filter(l => getStockLogCategory(l) === 'sale') : []);
const stockCancelRestoreLogs = computed(() => Array.isArray(stockHistoryLogs.value) ? stockHistoryLogs.value.filter(l => getStockLogCategory(l) === 'cancel_restore') : []);

// Stat Card Calculations
const stockWasteCount = computed(() => Array.isArray(stockWasteLogs.value) ? stockWasteLogs.value.length : 0);
const stockWasteTotalQty = computed(() => {
  if (!Array.isArray(stockWasteLogs.value)) return 0;
  return stockWasteLogs.value.reduce((sum, l) => sum + Math.abs(Number(l?.change_qty) || 0), 0);
});
const stockWasteSummaryText = computed(() => {
  try {
    if (!Array.isArray(stockWasteLogs.value) || stockWasteLogs.value.length === 0) return 'ไม่มีบันทึกของเสียในช่วงเวลานี้';
    const itemMap = {};
    stockWasteLogs.value.forEach(l => {
      if (!l) return;
      const name = l.item_name || 'สินค้า';
      itemMap[name] = (itemMap[name] || 0) + Math.abs(Number(l.change_qty) || 0);
    });
    const sorted = Object.entries(itemMap).sort((a, b) => b[1] - a[1]);
    if (!sorted || sorted.length === 0 || !sorted[0]) return 'ไม่มีบันทึกของเสียในช่วงเวลานี้';
    return `เสียมากสุด: ${sorted[0][0]} (${sorted[0][1]} ชิ้น)`;
  } catch (e) {
    console.error('stockWasteSummaryText error:', e);
    return 'ไม่มีบันทึกของเสียในช่วงเวลานี้';
  }
});

const stockStaffCreditCount = computed(() => Array.isArray(stockStaffCreditLogs.value) ? stockStaffCreditLogs.value.length : 0);
const stockStaffCreditTotalQty = computed(() => {
  if (!Array.isArray(stockStaffCreditLogs.value)) return 0;
  return stockStaffCreditLogs.value.reduce((sum, l) => sum + Math.abs(Number(l?.change_qty) || 0), 0);
});
const extractStaffCreditName = (log) => {
  if (!log) return 'พนักงาน';
  const raw = String(log.note || log.staff_name || '').replace(/^\[.*?\]\s*/, '').trim();
  return raw || String(log.staff_name || '').trim() || 'พนักงาน';
};

const getStockLogMonetaryValue = (log) => {
  if (!log) return 0;
  const qty = Math.abs(Number(log.change_qty) || 0);
  let price = Number(log.item_price) || 0;
  if (!price && Array.isArray(store.stockItems)) {
    const found = store.stockItems.find(item => item && (item.id === log.menu_item_id || item.name === log.item_name));
    if (found && found.price) price = Number(found.price) || 0;
  }
  return qty * price;
};

const stockStaffCreditSummaryText = computed(() => {
  try {
    if (!Array.isArray(stockStaffCreditLogs.value) || stockStaffCreditLogs.value.length === 0) return 'ไม่มีบันทึกแจกพนักงานในช่วงเวลานี้';
    const staffMap = {};
    stockStaffCreditLogs.value.forEach(l => {
      if (!l) return;
      const staff = extractStaffCreditName(l);
      staffMap[staff] = (staffMap[staff] || 0) + Math.abs(Number(l.change_qty) || 0);
    });
    const sorted = Object.entries(staffMap).sort((a, b) => b[1] - a[1]);
    if (!sorted || sorted.length === 0 || !sorted[0]) return 'ไม่มีบันทึกแจกพนักงานในช่วงเวลานี้';
    return `รับมากสุด: ${sorted[0][0]} (${sorted[0][1]} ชิ้น)`;
  } catch (e) {
    console.error('stockStaffCreditSummaryText error:', e);
    return 'ไม่มีบันทึกแจกพนักงานในช่วงเวลานี้';
  }
});

const staffCreditBreakdown = computed(() => {
  try {
    if (!Array.isArray(stockStaffCreditLogs.value) || stockStaffCreditLogs.value.length === 0) return [];
    const staffMap = {};

    stockStaffCreditLogs.value.forEach(log => {
      if (!log) return;
      const staffName = extractStaffCreditName(log);
      const qty = Math.abs(Number(log.change_qty) || 0);
      const logValue = getStockLogMonetaryValue(log);

      if (!staffMap[staffName]) {
        staffMap[staffName] = {
          name: staffName,
          log_count: 0,
          total_qty: 0,
          total_value: 0,
          item_counts: {}
        };
      }

      staffMap[staffName].log_count += 1;
      staffMap[staffName].total_qty += qty;
      staffMap[staffName].total_value += logValue;

      const itemName = log.item_name || 'สินค้า';
      staffMap[staffName].item_counts[itemName] = (staffMap[staffName].item_counts[itemName] || 0) + qty;
    });

    const result = Object.values(staffMap).map(s => {
      const sortedEntries = Object.entries(s.item_counts || {}).sort((a, b) => b[1] - a[1]);
      return {
        ...s,
        items_list: sortedEntries.map(([name, qty]) => ({ name, qty })),
        items_summary: sortedEntries.map(([name, qty]) => `${name} x${qty}`).join(', ')
      };
    });

    result.sort((a, b) => b.total_qty - a.total_qty);
    return result;
  } catch (e) {
    console.error('staffCreditBreakdown error:', e);
    return [];
  }
});

const totalWasteValue = computed(() => {
  if (!Array.isArray(stockWasteLogs.value)) return 0;
  return stockWasteLogs.value.reduce((sum, l) => sum + getStockLogMonetaryValue(l), 0);
});

const totalStaffCreditValue = computed(() => {
  try {
    if (!Array.isArray(stockStaffCreditLogs.value)) return 0;
    return stockStaffCreditLogs.value.reduce((sum, l) => sum + getStockLogMonetaryValue(l), 0);
  } catch (e) {
    console.error('totalStaffCreditValue error:', e);
    return 0;
  }
});

const stockRestockReversalLogs = computed(() =>
  Array.isArray(stockHistoryLogs.value)
    ? stockHistoryLogs.value.filter(l => String(l?.note || '').includes('ปรับลดคืนวัตถุดิบจากการยกเลิกรายจ่าย'))
    : []
);
const stockRestockCount = computed(() => Array.isArray(stockRestockLogs.value) ? stockRestockLogs.value.length : 0);
const stockRestockTotalQty = computed(() => {
  if (!Array.isArray(stockRestockLogs.value)) return 0;
  const added = stockRestockLogs.value.reduce((sum, l) => sum + (Number(l?.change_qty) || 0), 0);
  const reversed = stockRestockReversalLogs.value.reduce((sum, l) => sum + (Number(l?.change_qty) || 0), 0);
  return Math.max(0, added + reversed);
});
const totalRestockValue = computed(() => {
  if (!Array.isArray(stockRestockLogs.value)) return 0;
  const added = stockRestockLogs.value.reduce((sum, l) => sum + getStockLogMonetaryValue(l), 0);
  const reversed = stockRestockReversalLogs.value.reduce((sum, l) => sum + getStockLogMonetaryValue(l), 0);
  return Math.max(0, added - reversed);
});

const stockLogsCardRef = ref(null);
const stockLogPages = computed(() => {
  const list = Array.isArray(filteredStockLogs.value) ? filteredStockLogs.value : [];
  if (list.length === 0) return [];
  const pages = [];
  let currentPage = [];
  let i = 0;
  while (i < list.length) {
    const isPair = i + 1 < list.length && isReportCookPair(list[i], list[i + 1]);
    if (isPair) {
      if (currentPage.length + 2 > stockLogsPerPage && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [];
      }
      currentPage.push(list[i], list[i + 1]);
      i += 2;
    } else {
      if (currentPage.length + 1 > stockLogsPerPage && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [];
      }
      currentPage.push(list[i]);
      i += 1;
    }
  }
  if (currentPage.length > 0) pages.push(currentPage);
  return pages;
});
const totalStockLogsPages = computed(() => stockLogPages.value.length || 1);
const changeStockLogsPage = (newPage) => {
  if (newPage < 1 || newPage > totalStockLogsPages.value) return;
  stockLogsCurrentPage.value = newPage;
  scrollToRef(stockLogsCardRef);
};
const paginatedStockLogs = computed(() => {
  return stockLogPages.value[stockLogsCurrentPage.value - 1] || [];
});

const loadStockHistoryLogs = async () => {
  const seq = ++reqSeq.stockHistory;
  stockHistoryLoading.value = true;
  const safetyReleaseTimer = setTimeout(() => {
    stockHistoryLoading.value = false;
  }, 4000);

  try {
    const params = { branch_id: selectedBranchId.value };
    if (periodMode.value === 'daily') {
      params.date = selectedDate.value;
    } else if (periodMode.value === 'monthly') {
      params.month = selectedMonth.value;
    } else {
      params.year = selectedYear.value;
    }

    let logs = [];
    const allRes = await api.stock.getAllLogs(params);
    if (seq !== reqSeq.stockHistory) return;
    const allLogs = Array.isArray(allRes.data) ? allRes.data : (Array.isArray(allRes) ? allRes : []);
    allStockHistoryLogs.value = allLogs;

    if (selectedReportsStockItemId.value && selectedReportsStockItemId.value !== 'all') {
      const itemName = selectedStockItemName.value;
      const baseLogs = allLogs.filter(l => l && (l.menu_item_id === selectedReportsStockItemId.value || (itemName && l.item_name === itemName)));
      const includedIds = new Set(baseLogs.map(l => l.id));
      const partnerLogs = [];
      for (const bLog of baseLogs) {
        const partner = allLogs.find(other => other && !includedIds.has(other.id) && (isLinkedRecipeCookPair(bLog, other) || isLinkedRecipeCookPair(other, bLog)));
        if (partner) {
          includedIds.add(partner.id);
          partnerLogs.push(partner);
        }
      }
      logs = [...baseLogs, ...partnerLogs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id);
    } else {
      logs = allLogs;
    }
    stockHistoryLogs.value = logs;
  } catch (e) {
    console.error('Stock history logs load error:', e);
  } finally {
    clearTimeout(safetyReleaseTimer);
    if (seq === reqSeq.stockHistory) stockHistoryLoading.value = false;
  }
};

const selectYesterdayDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  selectedDate.value = `${year}-${month}-${day}`;
  periodMode.value = 'daily';
  stockLogsCurrentPage.value = 1;
  loadStockHistoryLogs();
};

const switchToMonthlyStock = () => {
  periodMode.value = 'monthly';
  stockLogsCurrentPage.value = 1;
  loadStockHistoryLogs();
};

const getYesterdayLabel = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return formatDate(`${year}-${month}-${day}`);
};

const selectReportsStockItem = (item) => {
  selectedReportsStockItemId.value = item.id;
  isStockItemDropdownOpen.value = false;
  stockLogsCurrentPage.value = 1;
  loadStockHistoryLogs();
};

const isRawStockLog = (log) => {
  const note = String(log?.note || '');
  if (note.includes('ครัวกลาง')) {
    if (note.includes('พร้อมขาย')) return false;
    if (note.includes('ของสด')) return true;
    if (log.item_raw_quantity !== undefined) return log.item_raw_quantity !== null;
    const stockItems = Array.isArray(store.stockItems) ? store.stockItems : [];
    const found = stockItems.find(i => i && (Number(i.id) === Number(log.menu_item_id) || i.name === log.item_name));
    if (found) return found.raw_quantity !== null && found.raw_quantity !== undefined;
    if (/ข้าวเหนียว|น้ำจิ้ม|เครื่องดื่ม|น้ำอัดลม|โค้ก|เป๊ปซี่/.test(String(log.item_name || ''))) return false;
    return true;
  }
  if (log.stock_type === 'raw') return true;
  if (log.stock_type === 'cooked') return false;
  if (note.includes('ของสด') || note.includes('วัตถุดิบ') || note.includes('[ของสด]')) return true;
  if (note.includes('สุก') || note.includes('พร้อมขาย') || note.includes('[พร้อมขาย]')) return false;
  if ((note.includes('ปรุง') || note.includes('ทอด') || note.includes('ปิ้ง')) && log.change_qty < 0 && log.reason === 'adjustment') {
    return true;
  }
  return false;
};

const getStockReportActionLabel = (log) => {
  const isRaw = isRawStockLog(log);
  const cat = getStockLogCategory(log);
  if (cat === 'cook_deduct') {
    return String(log?.note || '').includes('หักอัตโนมัติจากการ') ? 'ตัดสต็อกไปปรุง' : 'ตัดของสดไปปรุง';
  }
  if (cat === 'cook_ready') return 'ปรุงสุกพร้อมขาย';
  if (cat === 'restock_ck') return 'เติมสต็อก (ครัวกลาง)';
  if (cat === 'restock') return 'เติมสต็อก (POS)';
  if (cat === 'adjustment') return isRaw ? 'ปรับสต็อกของสด' : 'ปรับสต็อกพร้อมขาย';
  return getStockReasonLabel(log.reason);
};

const formatReportLogNote = (log, isRaw) => {
  if (!log.note) return '';
  let note = log.note.trim();
  note = note.replace(/^\|(.*)$/, '$1').trim();
  note = note.replace(/^\[(ของสด|พร้อมขาย|.*สุก\/พร้อมขาย|.*\/พร้อมขาย)\]\s*/i, '').trim();

  if (log.reason === 'staff_benefit' && note && note === String(log.staff_name || '').trim()) {
    return '';
  }

  if (/^ปรุงพร้อมกัน\s*\([^)]*\)$/.test(note)) {
    return isRaw ? 'ตัดของสดเพื่อนำไปปรุง' : 'ทอดสุกเรียบร้อย เติมเข้าสต็อกพร้อมขาย';
  }

  const matchCustom = note.match(/^ปรุงพร้อมกัน\s*\(([^)]+)\):/);
  if (matchCustom && matchCustom[1]) {
    const custom = matchCustom[1].trim();
    if (custom.startsWith('ทอด') || custom.startsWith('ปิ้ง') || custom.startsWith('ห่อ')) {
      return isRaw ? 'ตัดของสดเพื่อนำไปปรุง' : 'ทอดสุกเรียบร้อย เติมเข้าสต็อกพร้อมขาย';
    }
    return `หมายเหตุ: ${custom}`;
  }

  if (/^ปรุงหน้าจุดทอด\s*\(.*\)$/.test(note)) {
    return isRaw ? 'ตัดของสดเพื่อนำไปปรุง' : 'ทอดสุกเรียบร้อย เติมเข้าสต็อกพร้อมขาย';
  }

  if (note.includes('หักวัตถุดิบของสดเพื่อนำไป')) {
    return 'ตัดของสดเพื่อนำไปปรุง';
  }
  if (note.includes('สุกพร้อมขาย:')) {
    return 'ทอดสุกเรียบร้อย เติมเข้าสต็อกพร้อมขาย';
  }

  return note
    .replace(/^(ขาย\s+.+?)\s+(\([^)]+\))$/, '$1\n$2')
    .replace(/^(ยกเลิกออเดอร์\s+\S+)\s*—\s*(คืน(?:สต็อก|วัตถุดิบ)\s+.+?)\s*(\(เหตุผล:[^)]+\))$/, '$1\n$2\n$3')
    .replace(/^ปรับปรุงสต็อก.*?\(Absolute\):\s*ปรับจาก\s*[\d,.]+\s*เป็น\s*[\d,.]+\s*\S+\s*\[สาเหตุ:\s*(.+?)\](?:\s*\((.+)\))?$/, (_, r, n) => `สาเหตุ: ${r}${n && n !== 'ไม่ระบุโน้ต' ? ` (${n})` : ''}`)
    .replace(/^เติมสต็อก.*?\(Relative\)\s*[+-]?[\d,.]+\s*\S+$/, 'เติมสต็อกเพิ่มเข้าคลัง')
    .replace(/^เติมสต็อกวัตถุดิบอัตโนมัติจากครัวกลาง\s*ใบเบิก\s*(#\S+)\s*\((.+?)\)(?:\s*\((.+?)\))?(?:\s*โดย\s*(.+))?$/, (_, reqNo, ckName, formula) => `เติมจากครัวกลาง\nใบเบิก ${reqNo}${formula ? ` (${formula})` : ''}`);
};

const getStockReasonLabel = (reason) => {
  const map = {
    'sale': 'หักจากการขาย',
    'restock': 'เติมสต็อกสินค้า',
    'adjustment': 'ปรับปรุงจำนวนสต็อก',
    'waste': 'สินค้าเสีย/ทิ้ง',
    'cancel_restore': 'คืนสต็อก (ยกเลิกบิล)',
    'staff_benefit': 'แจกพนักงาน/เครดิต',
    'fry': 'ทอดสุกพร้อมขาย'
  };
  return map[reason] || reason;
};

// Refetch stock history when item or date changes
watch(selectedReportsStockItemId, () => {
  stockLogsCurrentPage.value = 1;
  loadStockHistoryLogs();
});

watch(stockReasonFilter, () => {
  stockLogsCurrentPage.value = 1;
});

watch(filterAction, () => {
  activityCurrentPage.value = 1;
});

watch([customStartTime, customEndTime], () => {
  historyCurrentPage.value = 1;
  ledgerCurrentPage.value = 1;
  activityCurrentPage.value = 1;
  stockLogsCurrentPage.value = 1;
});

watch([historyStaffFilter, historyPaymentFilter], () => {
  historyCurrentPage.value = 1;
});

watch(activityStaffFilter, () => {
  activityCurrentPage.value = 1;
});

// Custom dropdowns logic for Reports.vue

const selectExpensePaymentMethod = (method) => {
  expenseForm.value.payment_method = method;
  isExpensePaymentMethodDropdownOpen.value = false;
};

const isFilterActionDropdownOpen = ref(false);
const selectedFilterActionLabel = computed(() => {
  const filterLabels = {
    all: 'ทั้งหมด',
    login: 'เข้าสู่ระบบ',
    sales: 'ขายสำเร็จ',
    cancel: 'ยกเลิกบิล',
    expenses: 'ค่าใช้จ่าย',
    restock_ck: 'เติมสต็อก (ครัวกลาง)',
    restock: 'เติมสต็อก (POS)',
    stock: 'ปรับสต็อก',
    cook: 'ทอด/ปรุงสุกพร้อมขาย',
    waste: 'ของเสีย',
    credit: 'เครดิตพนักงาน',
    cash_drawer: 'ลิ้นชักเงินสด'
  };
  return filterLabels[filterAction.value] || 'ทั้งหมด';
});
const selectFilterAction = (action) => {
  filterAction.value = action;
  isFilterActionDropdownOpen.value = false;
};

const isHistoryStatusDropdownOpen = ref(false);
const selectedHistoryStatusLabel = computed(() => {
  const statusLabels = {
    all: 'ทั้งหมด',
    completed: 'ชำระเงินแล้ว',
    cancelled: 'ยกเลิก'
  };
  return statusLabels[historyStatusFilter.value] || 'ทั้งหมด';
});
const selectHistoryStatus = (status) => {
  historyStatusFilter.value = status;
  isHistoryStatusDropdownOpen.value = false;
  loadOrderHistory();
};

// Custom dropdown for Branch filter
const isBranchDropdownOpen = ref(false);

const selectedMonthLabel = computed(() => {
  if (!selectedMonth.value) return 'เลือกเดือน';
  const [year, month] = selectedMonth.value.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' });
});

const selectedDateLabel = computed(() => {
  if (!selectedDate.value) return 'เลือกวัน';
  return formatDate(selectedDate.value);
});

const selectedBranchName = computed(() => {
  if (selectedBranchId.value === null) return 'ทุกสาขา';
  const found = branches.value.find(b => b.id === selectedBranchId.value);
  return found ? found.name : 'ทุกสาขา';
});

const selectedYearLabel = computed(() => `ปี ${Number(selectedYear.value) + 543}`);

const summaryCardTitle = computed(() => {
  if (periodMode.value === 'daily') {
    return `สรุปยอดวันที่ ${selectedDateLabel.value}`;
  } else if (periodMode.value === 'monthly') {
    return `สรุปยอดประจำเดือน ${selectedMonthLabel.value}`;
  } else {
    return `สรุปยอดประจำปี ${selectedYearLabel.value}`;
  }
});

const dailyOrdersListTitle = computed(() => {
  if (periodMode.value === 'daily') {
    return 'รายการบิลประจำวัน';
  } else if (periodMode.value === 'monthly') {
    return 'รายการบิลประจำเดือน';
  } else {
    return 'รายการบิลประจำปี';
  }
});

const dailyOrdersEmptyLabel = computed(() => {
  if (periodMode.value === 'daily') {
    return 'ยังไม่มีรายการขายในวันนี้';
  } else if (periodMode.value === 'monthly') {
    return 'ยังไม่มีรายการขายในเดือนนี้';
  } else {
    return 'ยังไม่มีรายการขายในปีนี้';
  }
});

const ledgerPeriodLabel = computed(() => {
  if (periodMode.value === 'daily') {
    return `วัน ${formatDate(selectedDate.value)}`;
  } else if (periodMode.value === 'monthly') {
    if (!selectedMonth.value) return 'เดือน -';
    const [year, month] = selectedMonth.value.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    const formatted = d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long'
    });
    return `เดือน ${formatted}`;
  } else {
    return `ปี ${Number(selectedYear.value) + 543}`;
  }
});

const toggleBranchDropdown = () => {
  const current = isBranchDropdownOpen.value;
  closeReportsDropdowns();
  isBranchDropdownOpen.value = !current;
};

const selectBranch = (branchId) => {
  selectedBranchId.value = branchId;
  selectedReportsStockItemId.value = 'all';
  isBranchDropdownOpen.value = false;
  if (branchId !== null) {
    sessionStorage.setItem('selected_branch_id', String(branchId));
  } else {
    sessionStorage.setItem('selected_branch_id', 'all');
  }
  onBranchChange();
};

const closeReportsDropdowns = () => {
  isExpenseCategoryDropdownOpen.value = false;
  isExpensePaymentMethodDropdownOpen.value = false;
  isFilterActionDropdownOpen.value = false;
  isHistoryStatusDropdownOpen.value = false;
  isBranchDropdownOpen.value = false;
  isHistoryStaffDropdownOpen.value = false;
  isHistoryPaymentDropdownOpen.value = false;
  isActivityStaffDropdownOpen.value = false;
  isStockItemDropdownOpen.value = false;
  showAvgBillInfo.value = false;
  showRestockValueInfo.value = false;
};

const computeLedgerTransactions = () => {
  const list = [];

  ledgerOrders.value.forEach(o => {
    if (o.status !== 'completed') return;
    list.push({
      id: o.id,
      created_at: o.created_at,
      timestamp: new Date(o.created_at).getTime(),
      name: `ขายสินค้า (บิล #${o.order_number})`,
      income: o.total || 0,
      expense: 0,
      type: 'order'
    });
  });

  const refundedIds = new Set(
    expenses.value
      .filter(e => (e.is_refund === 1 || e.status === 'refund') && e.refund_ref_id)
      .map(e => Number(e.refund_ref_id))
  );

  expenses.value.forEach(e => {
    if (e.status === 'cancelled' && !refundedIds.has(Number(e.id))) return;
    const isRefund = Boolean(e.is_refund === 1 || e.status === 'refund');
    const isCancelled = e.status === 'cancelled';
    const pmLabel = e.payment_method === 'transfer' ? 'เงินโอน' : 'เงินสด';
    const expDate = e.expense_date || (e.created_at ? e.created_at.substring(0, 10) : '');
    const timePart = e.created_at ? e.created_at.substring(11, 19) : '00:00:00';
    const effectiveDateTime = `${expDate} ${timePart}`;

    list.push({
      id: e.id,
      date: expDate,
      created_at: e.created_at,
      timestamp: new Date(effectiveDateTime.replace(' ', 'T')).getTime() || 0,
      name: `${e.note || getCategoryLabel(e.category)} (${pmLabel})${isCancelled ? ' [ยกเลิก]' : ''}`,
      income: isRefund ? (Number(e.amount) || 0) : 0,
      expense: isRefund ? 0 : (Number(e.amount) || 0),
      type: isRefund ? 'refund' : 'expense'
    });
  });

  list.sort((a, b) => {
    const dateA = a.date || (a.created_at ? a.created_at.substring(0, 10) : '');
    const dateB = b.date || (b.created_at ? b.created_at.substring(0, 10) : '');
    if (dateA !== dateB) {
      return (dateA || '').localeCompare(dateB || '');
    }
    return a.timestamp - b.timestamp;
  });

  let running = 0;
  const computedList = list.map(item => {
    running += item.income - item.expense;
    return {
      ...item,
      runningBalance: running,
      formattedDate: formatDate(item.date || item.created_at),
      formattedTime: formatTime(item.created_at)
    };
  });

  ledgerTransactions.value = computedList.reverse();
};

const loadMonthlyLedger = async () => {
  const seq = ++reqSeq.ledger;
  if (isUsingDefaultFilters() && store.reportsLoaded && store.reportsBranchId === selectedBranchId.value) {
    applyDataFromStore();
    ledgerLoading.value = false;
    return;
  }
  ledgerLoading.value = true;
  try {
    const params = { status: 'completed', branch_id: selectedBranchId.value, include_items: 'false' };

    if (periodMode.value === 'daily') {
      params.date = selectedDate.value;
    } else if (periodMode.value === 'monthly') {
      params.month = selectedMonth.value;
    } else {
      params.year = selectedYear.value;
    }

    let periodExpenses = expenses.value;
    let ordersRes;

    // ถ้ามีข้อมูลรายจ่ายอยู่แล้ว ไม่จำเป็นต้องคิวรีผ่าน API อีกรอบเพื่อประหยัดเน็ตและเวลา
    if (periodExpenses && periodExpenses.length > 0) {
      ordersRes = await api.orders.getAll(params);
    } else {
      const expenseParams = { branch_id: selectedBranchId.value };
      if (periodMode.value === 'daily') {
        expenseParams.date = selectedDate.value;
      } else if (periodMode.value === 'monthly') {
        expenseParams.month = selectedMonth.value;
      } else {
        expenseParams.year = selectedYear.value;
      }

      const [ordersResData, expensesRes] = await Promise.all([
        api.orders.getAll(params),
        api.expenses.get(expenseParams)
      ]);
      ordersRes = ordersResData;
      if (seq !== reqSeq.ledger) return;
      expenses.value = expensesRes.success ? (expensesRes.data || []) : [];
    }

    if (seq !== reqSeq.ledger) return;
    ledgerOrders.value = ordersRes.success ? (ordersRes.data || []) : [];
    computeLedgerTransactions();
  } catch (e) {
    if (seq !== reqSeq.ledger) return;
    console.error('❌ Failed to load ledger:', e);
    ui.showToast('ไม่สามารถดึงข้อมูลบัญชีรายรับ-รายจ่ายได้', 'error');
  } finally {
    if (seq === reqSeq.ledger) ledgerLoading.value = false;
  }
};

// ── Data Loading ──

const loadReportSummary = async () => {
  const seq = ++reqSeq.summary;
  if (isUsingDefaultFilters() && store.reportsLoaded && store.reportsBranchId === selectedBranchId.value) {
    applyDataFromStore();
    return;
  }
  try {
    const res = await api.reports.summary(selectedBranchId.value);
    if (seq !== reqSeq.summary) return;
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

const loadExpensesForPeriod = async () => {
  const seq = ++reqSeq.expenses;
  if (isUsingDefaultFilters() && store.reportsLoaded && store.reportsBranchId === selectedBranchId.value) {
    applyDataFromStore();
    return;
  }
  try {
    let res;
    if (periodMode.value === 'daily') {
      res = await api.expenses.get({ date: selectedDate.value, branch_id: selectedBranchId.value });
    } else if (periodMode.value === 'monthly') {
      res = await api.expenses.get({ month: selectedMonth.value, branch_id: selectedBranchId.value });
    } else {
      res = await api.expenses.get({ year: selectedYear.value, branch_id: selectedBranchId.value });
    }
    if (seq !== reqSeq.expenses) return;
    if (res.success) {
      expenses.value = res.data || [];
    }
  } catch (e) {
    console.warn(e);
  }
};

const loadActivityLogsForPeriod = async () => {
  const seq = ++reqSeq.activities;
  if (activityFilterSkeletonTimer) clearTimeout(activityFilterSkeletonTimer);
  activityLogsLoading.value = true;
  if (isUsingDefaultFilters() && store.reportsLoaded && store.reportsBranchId === selectedBranchId.value) {
    applyDataFromStore();
    activityFilterSkeletonTimer = setTimeout(() => {
      activityLogsLoading.value = false;
    }, 180);
    return;
  }
  try {
    let limitVal = 200;
    if (periodMode.value === 'monthly') {
      limitVal = 1000;
    } else if (periodMode.value === 'yearly') {
      limitVal = 5000;
    }

    let res;
    const params = { branch_id: selectedBranchId.value, limit: limitVal };
    if (periodMode.value === 'daily') {
      params.date = selectedDate.value;
    } else if (periodMode.value === 'monthly') {
      params.month = selectedMonth.value;
    } else {
      params.year = selectedYear.value;
    }
    res = await api.activities.get(params);
    if (seq !== reqSeq.activities) return;
    if (res.success) {
      activityLogs.value = res.data || [];
    }
  } catch (e) {
    console.warn(e);
  } finally {
    if (seq === reqSeq.activities) activityLogsLoading.value = false;
  }
};

const loadOrderHistory = async () => {
  const seq = ++reqSeq.history;
  if (historyFilterSkeletonTimer) clearTimeout(historyFilterSkeletonTimer);
  historyOrdersLoading.value = true;
  if (isUsingDefaultFilters() && store.reportsLoaded && store.reportsBranchId === selectedBranchId.value) {
    applyDataFromStore();
    historyFilterSkeletonTimer = setTimeout(() => {
      historyOrdersLoading.value = false;
    }, 180);
    return;
  }
  try {
    let limitVal = 200;
    if (periodMode.value === 'monthly') {
      limitVal = 1000;
    } else if (periodMode.value === 'yearly') {
      limitVal = 5000;
    }

    const params = {
      limit: limitVal,
      branch_id: selectedBranchId.value
    };
    if (periodMode.value === 'daily') {
      params.date = selectedDate.value;
    } else if (periodMode.value === 'monthly') {
      params.month = selectedMonth.value;
    } else {
      params.year = selectedYear.value;
    }

    if (historyStatusFilter.value !== 'all') {
      params.status = historyStatusFilter.value;
    }

    const res = await api.orders.getAll(params);
    if (seq !== reqSeq.history) return;
    if (res.success) {
      historyOrders.value = res.data || [];
    } else {
      historyOrders.value = [];
    }
  } catch (e) {
    if (seq !== reqSeq.history) return;
    console.error('❌ Failed to load order history:', e);
    ui.showToast('ไม่สามารถดึงข้อมูลประวัติออเดอร์ได้', 'error');
  } finally {
    if (seq === reqSeq.history) historyOrdersLoading.value = false;
  }
};

const loadReportData = async () => {
  const seq = ++reqSeq.report;
  expandedOrderId.value = null;
  expandedItems.value = [];
  dailyOrdersCurrentPage.value = 1;
  ledgerCurrentPage.value = 1;
  activityCurrentPage.value = 1;

  // Check if we can use store cache
  if (isUsingDefaultFilters() && store.reportsLoaded && store.reportsBranchId === selectedBranchId.value) {
    applyDataFromStore();
    loading.value = false;
    if (isAdmin()) {
      loadTopItems().catch(e => console.warn('Background top items load error:', e));
    }
    
    if (isManagerOrAdmin() && activeTab.value === 'cash_audit') {
      fetchCashDrawerSummary();
    }
    
    // Silent background fetch to update store cache
    store.fetchReports(selectedBranchId.value, false).then(() => {
      if (isUsingDefaultFilters() && store.reportsBranchId === selectedBranchId.value) {
        applyDataFromStore();
        if (isManagerOrAdmin() && activeTab.value === 'cash_audit') {
          fetchCashDrawerSummary();
        }
      }
    }).catch(e => console.error(e));
    
    return;
  }

  loading.value = true;
  try {
    const promises = [];

    // Promise 1: Main report data depending on period mode
    const loadMainReport = async () => {
      let res;
      if (periodMode.value === 'daily') {
        res = await api.reports.daily(selectedDate.value, selectedBranchId.value);
      } else if (periodMode.value === 'monthly') {
        res = await api.reports.monthly(selectedMonth.value, selectedBranchId.value);
      } else {
        res = await api.reports.yearly(selectedYear.value, selectedBranchId.value);
      }

      if (seq !== reqSeq.report) return;
      if (res.success && res.data) {
        const data = res.data;
        dailyReport.value = {
          total_sales: data.total_revenue || 0,
          total_orders: data.total_orders || 0,
          average_bill: data.avg_order_value || 0,
          historical_avg_bill: data.historical_avg_value || 0,
          cash_sales: data.payment_breakdown?.cash_total || 0,
          cash_orders: data.payment_breakdown?.cash_count || 0,
          qr_sales: data.payment_breakdown?.qr_total || 0,
          qr_orders: data.payment_breakdown?.qr_count || 0,
          gov_sales: data.payment_breakdown?.gov_total || 0,
          gov_orders: data.payment_breakdown?.gov_count || 0,
          delivery_sales: data.payment_breakdown?.delivery_total || 0,
          delivery_orders: data.payment_breakdown?.delivery_count || 0,
          orders: data.orders || []
        };
      } else {
        dailyReport.value = {
          total_sales: 0,
          total_orders: 0,
          average_bill: 0,
          historical_avg_bill: 0,
          cash_sales: 0,
          cash_orders: 0,
          qr_sales: 0,
          qr_orders: 0,
          gov_sales: 0,
          gov_orders: 0,
          delivery_sales: 0,
          delivery_orders: 0,
          orders: []
        };
      }
    };
    // โหลดรายงานยอดขายหลักก่อนเพื่อให้พนักงานเห็นยอดสรุปได้ทันทีโดยไม่ติดหน้าจอโหลดนิ่ง
    try {
      await loadMainReport();
      if (seq !== reqSeq.report) return;
    } catch (err) {
      if (seq !== reqSeq.report) return;
      console.warn('loadMainReport background warning:', err);
      dailyReport.value = {
        total_sales: 0,
        total_orders: 0,
        average_bill: 0,
        cash_sales: 0,
        cash_orders: 0,
        qr_sales: 0,
        qr_orders: 0,
        gov_sales: 0,
        gov_orders: 0,
        delivery_sales: 0,
        delivery_orders: 0,
        orders: []
      };
    }
    loading.value = false; // ปิดสถานะการโหลดหลักทันที เพื่อให้แสดง Dashboard เร็วสุด (<0.5 วิ)

    // สั่งโหลดข้อมูลตารางประวัติอื่นๆ เบื้องหลังแบบขนานโดยไม่ขัดจังหวะผู้ใช้ (Background Async Load)
    if (isAdmin()) {
      loadTopItems().catch(e => console.warn('Background top items load error:', e));
      // โหลดค่าใช้จ่ายให้เสร็จก่อนรันสมุดรายวัน เพื่อหลีกเลี่ยงการเรียก API รายจ่ายซ้ำซ้อน
      (async () => {
        await loadExpensesForPeriod().catch(e => console.warn('Background expenses load error:', e));
        loadMonthlyLedger().catch(e => console.warn('Background ledger load error:', e));
      })();
    }
    if (isManagerOrAdmin()) {
      loadActivityLogsForPeriod().catch(e => console.warn('Background activities load error:', e));
      loadStockHistoryLogs().catch(e => console.warn('Background stock logs load error:', e));
      if (!isAdmin()) {
        loadExpensesForPeriod().catch(e => console.warn('Background expenses load error:', e));
      }
      if (activeTab.value === 'cash_audit') {
        fetchCashDrawerSummary().catch(e => console.warn('Background cash drawer load error:', e));
      }
    }
    loadOrderHistory().catch(e => console.warn('Background order history load error:', e));
  } catch (e) {
    if (seq !== reqSeq.report) return;
    console.error(e);
    ui.showToast('ไม่สามารถดึงข้อมูลรายงานได้', 'error');
    loading.value = false;
  }
};

const loadTopItems = async () => {
  const seq = ++reqSeq.topItems;
  const periodParams = {};
  if (periodMode.value === 'daily') {
    periodParams.date = selectedDate.value;
    if (customStartTime.value !== '00.00' || customEndTime.value !== '23.59') {
      periodParams.start_time = customStartTime.value;
      periodParams.end_time = customEndTime.value;
    }
  } else if (periodMode.value === 'monthly') {
    periodParams.month = selectedMonth.value;
  } else {
    periodParams.year = selectedYear.value;
  }

  const cacheKey = `${selectedBranchId.value || 'all'}_${periodMode.value}_${periodParams.date || periodParams.month || periodParams.year}_${periodParams.start_time || ''}_${periodParams.end_time || ''}`;
  topItemsLoading.value = true;
  
  try {
    const res = await api.reports.topItems(topItemsDays.value, selectedBranchId.value, periodParams);
    if (seq !== reqSeq.topItems) return;
    if (res.success && Array.isArray(res.data)) {
      const mapped = res.data.map(item => ({
        ...item,
        total_sales: item.total_revenue || 0
      }));
      topItems.value = mapped;
      topItemsCache.value[cacheKey] = mapped;
    }
  } catch (e) {
    console.warn(e);
  } finally {
    if (seq === reqSeq.topItems) topItemsLoading.value = false;
  }
};

// ── Order Expand & Void ──

const toggleExpandOrder = async (orderId) => {
  if (expandedOrderId.value === orderId) {
    expandedOrderId.value = null;
    expandedItems.value = [];
    return;
  }
  expandedOrderId.value = orderId;
  expandedItems.value = [];
  try {
    const res = await api.orders.getById(orderId);
    if (res.success && res.data?.items) {
      expandedItems.value = res.data.items;
    }
  } catch (e) {
    console.error(e);
  }
};

const openVoidModal = (order) => {
  voidOrder.value = order;
  voidReason.value = '';
  voidCustomReason.value = '';
  showVoidModal.value = true;
};

const isVoidingOrder = ref(false);
const isSubmittingExpense = ref(false);

const handleVoidOrder = async () => {
  if (!voidOrder.value || isVoidingOrder.value) return;
  const finalReason = voidReason.value === 'custom' ? voidCustomReason.value.trim() : voidReason.value;
  if (!finalReason) return;

  isVoidingOrder.value = true;
  ui.showLoading();
  try {
    const res = await api.orders.cancel(voidOrder.value.id, finalReason);
    if (res.success) {
      ui.showToast(`ยกเลิกบิล #${voidOrder.value.order_number} สำเร็จ`, 'success');
      showVoidModal.value = false;
      ui.hideLoading(); // Hide full-screen blocking loader immediately!
      
      // Reload reports silently in background
      store.clearReportsCache();
      loadReportData();
      loadReportSummary();
      return; // Skip the finally block to prevent double hiding
    }
  } catch (e) {
    ui.showToast('ยกเลิกบิลไม่สำเร็จ: ' + e.message, 'error');
  } finally {
    ui.hideLoading();
    isVoidingOrder.value = false;
  }
};

const handleAddExpense = async () => {
  if (!expenseForm.value.amount || expenseForm.value.amount <= 0 || isSubmittingExpense.value) return;
  isSubmittingExpense.value = true;
  ui.showLoading();
  try {
    const res = await api.expenses.create({
      amount: expenseForm.value.amount,
      category: expenseForm.value.category,
      note: expenseForm.value.note,
      expense_date: selectedDate.value,
      payment_method: expenseForm.value.payment_method || 'cash',
      branch_id: selectedBranchId.value
    });
    if (res.success) {
      ui.showToast('บันทึกค่าใช้จ่ายสำเร็จ', 'success');
      expenseForm.value = { amount: null, category: 'raw_chicken', note: '', payment_method: 'transfer' };
      store.clearReportsCache(); // Clear store cache!
      if (res.data) {
        expenses.value.unshift(res.data);
        computeLedgerTransactions();
      } else {
        await loadExpensesForPeriod();
        loadMonthlyLedger();
      }
    }
  } catch (e) {
    ui.showToast('บันทึกค่าใช้จ่ายไม่สำเร็จ: ' + e.message, 'error');
  } finally {
    ui.hideLoading();
    isSubmittingExpense.value = false;
  }
};

const handleDeleteExpense = async (id) => {
  const ok = await ui.showConfirm('ลบรายจ่าย', 'ต้องการลบรายการค่าใช้จ่ายนี้ใช่หรือไม่?');
  if (!ok) return;
  ui.showLoading();
  try {
    const res = await api.expenses.delete(id);
    if (res.success) {
      ui.showToast('ลบค่าใช้จ่ายสำเร็จ', 'success');
      store.clearReportsCache(); // Clear store cache!
      expenses.value = expenses.value.filter(e => e.id !== id);
      computeLedgerTransactions();
    }
  } catch (e) {
    ui.showToast('ลบค่าใช้จ่ายไม่สำเร็จ: ' + e.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

// ── Helpers ──

const getCategoryLabel = (cat) => {
  const map = {
    'raw_chicken': 'ไก่สด',
    'sticky_rice': 'ข้าวเหนียว',
    'meatballs': 'ลูกชิ้น',
    'salapao': 'ซาลาเปา',
    'fuel_oil': 'น้ำมัน',
    'gas_lpg': 'แก๊ส',
    'salary': 'เงินเดือน',
    'utility_bills': 'ค่าไฟ/น้ำ',
    'packaging': 'บรรจุภัณฑ์',
    'debt': 'หนี้',
    'other': 'อื่นๆ',
    'raw_materials': 'ครัวกลาง',
    'gas_fuel': 'แก๊ส/น้ำมัน'
  };
  return map[cat] || cat;
};

const getActionIconClass = (action) => {
  const map = {
    'login': 'fa-solid fa-key text-warning',
    'create_order': 'fa-solid fa-cart-shopping text-success',
    'complete_order': 'fa-solid fa-circle-check text-success',
    'cancel_order': 'fa-solid fa-ban text-danger',
    'adjust_stock': 'fa-solid fa-boxes-stacked text-accent',
    'adjust_raw_stock': 'fa-solid fa-boxes-stacked text-accent',
    'adjust_modifier': 'fa-solid fa-boxes-stacked text-accent',
    'restock_ck': 'fa-solid fa-truck-ramp-box text-success',
    'restock_stock': 'fa-solid fa-boxes-packing text-success',
    'restock_raw_stock': 'fa-solid fa-boxes-packing text-success',
    'restock_modifier': 'fa-solid fa-boxes-packing text-success',
    'fry_chicken': 'fa-solid fa-fire-burner text-warning',
    'reverse_stock_log': 'fa-solid fa-rotate-left text-accent',
    'record_waste': 'fa-solid fa-trash-can text-danger',
    'record_raw_waste': 'fa-solid fa-trash-can text-danger',
    'staff_credit': 'fa-solid fa-user-check text-warning',
    'staff_raw_credit': 'fa-solid fa-user-check text-warning',
    'log_expense': 'fa-solid fa-wallet text-danger',
    'delete_expense': 'fa-solid fa-trash-can text-danger',
    'reverse_expense': 'fa-solid fa-rotate-left text-danger',
    'cash_opening_set': 'fa-solid fa-cash-register text-success',
    'cash_audit': 'fa-solid fa-cash-register text-success',
    'setting_change': 'fa-solid fa-gear text-warning'
  };
  return map[action] || 'fa-solid fa-bookmark text-warning';
};

const onBranchChange = () => {
  loadReportSummary();
  loadTopItems();
  loadMonthlyLedger();
  loadReportData();
  if (activeTab.value === 'cash_audit') {
    fetchCashDrawerSummary();
  }
};

onMounted(() => {
  if (isAdmin()) {
    // Non-blocking fetch of branches
    api.auth.getBranches()
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          localBranches.value = res.data;
          store.branches = res.data;
        }
      })
      .catch(e => console.warn('Failed to load branches:', e));

    // Load top items (non-blocking)
    loadTopItems();
  }

  if (isManagerOrAdmin()) {
    // Load staff/users list for filters (non-blocking)
    store.fetchSettingsData(selectedBranchId.value)
      .catch(e => console.warn('Failed to load settings:', e));

    // Fetch stock items for stock logs (non-blocking)
    store.fetchStock()
      .catch(e => console.warn('Failed to load stock:', e));
  }

  // Load summary for ALL roles (Admin, Manager, Staff)
  loadReportSummary();

  // Load report data (which handles ledger internally)
  loadReportData();

  window.addEventListener('click', closeReportsDropdowns);
});

onUnmounted(() => {
  window.removeEventListener('click', closeReportsDropdowns);
});

// CSV Export Methods
const exportToCSV = (headers, rows, filename) => {
  try {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(val => {
          const cleanVal = String(val === null || val === undefined ? '' : val).replace(/"/g, '""');
          return `"${cleanVal}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    ui.showToast('ส่งออกไฟล์ CSV สำเร็จ', 'success');
  } catch (error) {
    console.error(error);
    ui.showToast('เกิดข้อผิดพลาดในการส่งออกไฟล์: ' + error.message, 'error');
  }
};

const exportExpensesCSV = () => {
  const headers = ['วันที่-เวลา', 'รายการ', 'รายรับ (บาท)', 'รายจ่าย (บาท)', 'คงเหลือสุทธิ (บาท)'];
  const rows = filteredLedgerTransactions.value.map(t => [
    formatDate(t.created_at) + ' ' + formatTime(t.created_at),
    t.name,
    t.income > 0 ? t.income : 0,
    t.expense > 0 ? t.expense : 0,
    t.runningBalance
  ]);
  const periodStr = periodMode.value === 'daily' ? selectedDate.value : periodMode.value === 'monthly' ? selectedMonth.value : selectedYear.value;
  exportToCSV(headers, rows, `ledger_report_${periodStr}.csv`);
};
</script>

<style scoped>
/* --- Reports Filter Controls --- */
.reports-filter-control {
  background-color: var(--card-bg) !important;
  border: 1px solid var(--border-color) !important;
  border-radius: var(--radius-md) !important; /* Premium rounded corner 12px */
  color: var(--text-primary) !important;
  font-family: var(--font-family) !important;
  font-size: var(--font-sm) !important;
  height: 38px !important;
  line-height: 24px !important;
  transition: all var(--transition-base) !important;
}

input.reports-filter-control {
  padding: 6px var(--space-md) !important;
}

select.reports-filter-control,
.custom-select-trigger.reports-filter-control {
  padding: 6px 36px 6px var(--space-md) !important;
  background-position: right 12px center !important;
}

.reports-filter-control:hover {
  border-color: var(--border-color-focus) !important;
  background-color: var(--card-bg-hover) !important;
}

.reports-filter-control:focus {
  border-color: var(--primary) !important;
  background-color: var(--card-bg-active) !important;
  box-shadow: 0 0 0 3px var(--primary-glow) !important;
  outline: none !important;
}

.reports-branch-selector {
  margin-left: auto;
}

@media (max-width: 768px) {
  .reports-branch-selector {
    margin-left: 0 !important;
  }
}



.stat-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  text-align: center;
}



/* --- Expense Form Grid --- */
.expense-form-grid {
  display: grid;
  grid-template-columns: 130px 180px 160px 1fr auto;
  gap: var(--space-sm);
  align-items: end;
  margin-bottom: var(--space-md);
}

.expense-form-grid .custom-select-trigger {
  padding: var(--space-md) 32px var(--space-md) var(--space-lg) !important;
  font-size: var(--font-base) !important;
  background-position: right 12px center !important;
}

.expense-form-presets {
  grid-column: 1 / -1;
  margin-top: 4px;
}

@media (max-width: 768px) {
  .expense-form-grid {
    grid-template-columns: 1fr;
    gap: var(--space-xs);
  }
  .expense-form-presets {
    order: 5;
  }
  .expense-form-submit-group {
    order: 6;
  }
  .void-modal-title {
    font-size: var(--font-base) !important;
  }
}

/* --- Ledger Summary Grid --- */

/* --- History Mobile list layout --- */
.history-mobile-list {
  display: none;
}
@media (max-width: 768px) {
  .history-mobile-list {
    display: flex !important;
    flex-direction: column;
    gap: var(--space-sm);
  }
}

/* --- Activity Logs Premium Layout --- */
.activity-logs-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.activity-log-item {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md);
  background: #ffffff;
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: 0 2px 6px rgba(61, 27, 17, 0.03);
  transition: all var(--transition-base);
}

.activity-log-item:hover {
  background: #ffffff;
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(139, 3, 19, 0.06);
}

.log-badge-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.log-badge {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-md);
  background: rgba(139, 3, 19, 0.04);
}

/* Log badge colors */
.log-badge.login { background: rgba(255, 171, 43, 0.1); color: #f4a261; }
.log-badge.create_order, .log-badge.complete_order { background: rgba(42, 157, 143, 0.1); color: #2a9d8f; }
.log-badge.cancel_order { background: rgba(173, 40, 30, 0.1); color: #e63946; }
.log-badge.log_expense, .log-badge.delete_expense, .log-badge.reverse_expense { background: rgba(173, 40, 30, 0.08); color: #e63946; }
.log-badge.adjust_stock, .log-badge.adjust_raw_stock, .log-badge.adjust_modifier, .log-badge.reverse_stock_log { background: rgba(139, 3, 19, 0.06); color: #8b0313; }
.log-badge.restock_ck, .log-badge.restock_stock, .log-badge.restock_raw_stock, .log-badge.restock_modifier { background: rgba(42, 157, 143, 0.1); color: #2a9d8f; }
.log-badge.fry_chicken { background: rgba(255, 171, 43, 0.12); color: #f4a261; }
.log-badge.record_waste, .log-badge.record_raw_waste { background: rgba(173, 40, 30, 0.1); color: #e63946; }
.log-badge.staff_credit, .log-badge.staff_raw_credit { background: rgba(139, 3, 19, 0.08); color: #8b0313; }
.log-badge.cash_opening_set, .log-badge.cash_audit, .log-badge.setting_change { background: rgba(42, 157, 143, 0.1); color: #2a9d8f; }

.log-content-wrapper {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
}

.log-title {
  font-size: var(--font-sm);
  color: var(--text-primary);
  font-weight: 700;
  line-height: 1.35;
}

.log-details {
  font-size: var(--font-xs);
  color: var(--text-secondary);
  font-weight: 500;
  line-height: 1.4;
  word-break: break-word;
}

.log-meta {
  display: flex;
  gap: var(--space-md);
  font-size: var(--font-xs);
  color: var(--text-tertiary);
}

@media (max-width: 640px) {
  .activity-log-item {
    gap: 10px;
    padding: 12px;
  }

  .stock-log-card {
    align-items: flex-start;
  }

  .stock-log-card.cook-pair-top {
    padding-bottom: 20px;
  }

  .stock-log-card.cook-pair-bottom {
    padding-top: 22px;
  }

  .log-content-wrapper {
    gap: 6px;
  }

  .log-details {
    font-size: var(--font-xs);
    line-height: 1.6;
    white-space: pre-line;
  }

  .log-meta {
    gap: 6px 12px !important;
    margin-top: 2px;
  }

  .stock-log-right {
    min-width: 68px;
    gap: 5px;
  }
}

.log-user, .log-time {
  white-space: nowrap;
}

/* --- Top Selling Menus Premium Styles --- */
.podium-container {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: var(--space-md);
  margin: var(--space-xl) 0;
  padding-top: var(--space-xl);
}

.podium-card {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.45);
  border: 1px solid var(--border-color);
  transition: all var(--transition-spring);
  position: relative;
  overflow: visible;
}

/* --- Ranked Menu Sales Card Grid System --- */
.ranked-items-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
}

@media (max-width: 1024px) {
  .ranked-items-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .ranked-items-grid {
    grid-template-columns: 1fr;
  }
}

/* Card: Pure White Background */
.ranked-item-card {
  background: #ffffff !important;
  border: 1px solid rgba(139, 3, 19, 0.12);
  border-radius: var(--radius-lg);
  padding: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all var(--transition-base);
  position: relative;
  overflow: hidden;
}

.ranked-item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(139, 3, 19, 0.08);
  border-color: var(--primary-light);
}

/* Rank 1 Feature Card: Pure White + Golden Border */
.ranked-item-card.ranked-item-card-first {
  grid-column: span 2;
  background: #ffffff !important;
  border: 2px solid #ffab2b;
  box-shadow: 0 4px 18px rgba(255, 171, 43, 0.18);
  padding: 16px;
}

@media (max-width: 640px) {
  .ranked-item-card.ranked-item-card-first {
    grid-column: span 1;
  }
}

/* Card Header */
.ranked-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-xs);
}

.ranked-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: 700;
  letter-spacing: 0.2px;
}

.ranked-badge-1 {
  background: #fff1b8;
  color: #873800;
  border: 1px solid #ffd591;
  font-size: var(--font-sm);
  padding: 4px 12px;
}

.ranked-badge-2 {
  background: #f0f0f0;
  color: #434343;
  border: 1px solid #d9d9d9;
}

.ranked-badge-3 {
  background: #ffe7ba;
  color: #873800;
  border: 1px solid #ffd591;
}

.ranked-badge-other {
  background: rgba(139, 3, 19, 0.05);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

/* ─── Rank 1 Special Layout: Image Left (Full Height/Width), Title + Stacked Boxes Right ─── */
.ranked-card-first-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: stretch;
  flex: 1;
  height: 100%;
}

@media (max-width: 640px) {
  .ranked-card-first-body {
    grid-template-columns: 1fr;
  }
}

.ranked-image-wrapper-first {
  width: 100%;
  height: 100%;
  min-height: 100%;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #fdfbf7;
  border: 1px solid rgba(139, 3, 19, 0.08);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ranked-image-wrapper-first .ranked-img {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  object-fit: cover;
  display: block;
}

@media (max-width: 640px) {
  .ranked-image-wrapper-first {
    height: 140px;
    min-height: 140px;
  }
}

.ranked-details-first {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  height: 100%;
}

.ranked-item-title-first {
  font-size: var(--font-base);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ranked-stats-first-stacked {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  margin-top: 0;
}

.ranked-stat-box-first {
  background: #fdfbf7;
  border: 1px solid rgba(255, 171, 43, 0.35);
  border-radius: var(--radius-md);
  padding: 6px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  width: 100%;
}

/* ─── Rank 2..N Single Column Card Elements ─── */
.ranked-card-single-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.ranked-image-wrapper {
  width: 100%;
  height: 125px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #fdfbf7;
  border: 1px solid rgba(139, 3, 19, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ranked-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ranked-img-placeholder {
  font-size: 2.5rem;
  color: var(--text-muted);
  opacity: 0.4;
}

.ranked-item-title {
  font-size: var(--font-base);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

/* 2 Separate Boxes Side-by-Side (ซ้าย-ขวา) with Centered Text */
.ranked-stats-2boxes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: auto;
  width: 100%;
}

.ranked-stat-box-half {
  background: #fdfbf7;
  border: 1px solid rgba(139, 3, 19, 0.08);
  border-radius: var(--radius-md);
  padding: 6px 4px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
}

.stat-label {
  font-size: var(--font-xxs, 0.72rem);
  color: var(--text-secondary);
  font-weight: 600;
}

.stat-value {
  font-size: var(--font-sm);
  line-height: 1.2;
}

.stat-value-lg {
  font-size: var(--font-base);
  line-height: 1.2;
}

.stat-unit {
  font-size: var(--font-xs);
  color: var(--text-secondary);
  font-weight: normal;
  margin-left: 2px;
}

.badge-type {
  font-size: var(--font-xs);
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  display: inline-block;
}

.badge-type.mixin {
  background: rgba(42, 157, 143, 0.08);
  color: var(--success);
  border: 1px solid rgba(42, 157, 143, 0.15);
}

.badge-type.main {
  background: rgba(139, 3, 19, 0.05);
  color: var(--primary);
  border: 1px solid rgba(139, 3, 19, 0.1);
}

/* --- Cash Audit Mobile Card Redesign --- */
.cash-audit-mobile-list {
  display: none;
}

@media (max-width: 768px) {
  .cash-audit-mobile-list {
    display: flex !important;
    flex-direction: column;
    gap: var(--space-md);
    margin-top: var(--space-md);
  }
}


/* --- Sales Tab Elevated Styling --- */
.sales-kpi-card {
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}
.sales-kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139, 3, 19, 0.08) !important;
}
.sales-kpi-icon-badge {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Clean 3-Metric Stats Grid (Pure White, No Cream) */
.sales-clean-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  background: #ffffff;
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-md) var(--space-lg);
  gap: var(--space-md);
}

@media (min-width: 641px) and (max-width: 1024px) {
  .sales-clean-stat {
    justify-content: flex-start !important;
    min-width: 0;
  }
  .sales-clean-stat .stat-sub-meta {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 3px !important;
    white-space: normal !important;
  }
  .sales-clean-stat .stat-sub-sep {
    display: none !important;
  }
}
@media (max-width: 640px) {
  .top-menus-period-sub {
    display: block;
    width: 100%;
    font-size: var(--font-sm);
    margin-top: 2px;
  }
  .sales-clean-summary-grid {
    grid-template-columns: 1fr;
    gap: var(--space-sm);
    padding: var(--space-md);
  }
  .sales-clean-stat.border-sides {
    border-left: none !important;
    border-right: none !important;
    border-top: 1px dashed var(--border-color);
    border-bottom: 1px dashed var(--border-color);
    padding: var(--space-xs) 0 !important;
  }
}
.sales-clean-stat {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.sales-clean-stat.border-sides {
  border-left: 1px dashed var(--border-color);
  border-right: 1px dashed var(--border-color);
  padding: 0 var(--space-lg);
}
.stat-clean-label {
  font-size: var(--font-xs);
  color: var(--text-secondary);
  margin-bottom: 4px;
  font-weight: 500;
}
.stat-clean-val {
  font-size: var(--font-xl);
  font-weight: 800;
  line-height: 1.2;
}

/* Payment Ratio Multi-Color Bar */
.payment-ratio-bar {
  display: flex;
  height: 10px;
  width: 100%;
  border-radius: 999px;
  overflow: hidden;
  background: transparent;
}
.ratio-seg {
  height: 100%;
  transition: width 0.3s ease;
}
.ratio-seg.seg-cash { background: #10b981; }
.ratio-seg.seg-qr { background: var(--primary, #8b0313); }
.ratio-seg.seg-gov { background: #3b82f6; }
.ratio-seg.seg-delivery { background: #ea580c; }

/* Payment Methods Grid */
.payment-methods-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-sm);
  font-size: var(--font-xs);
}

@media (max-width: 768px) {
  .payment-methods-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}

.pay-card {
  border: 1.5px solid var(--border-color) !important;
  background: #ffffff !important;
  transition: all var(--transition-base);
}
.pay-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
.pay-card.pay-card-cash { border-left: 3px solid #10b981 !important; }
.pay-card.pay-card-qr { border-left: 3px solid var(--primary, #8b0313) !important; }
.pay-card.pay-card-gov { border-left: 3px solid #3b82f6 !important; }
.pay-card.pay-card-delivery { border-left: 3px solid #ea580c !important; }

.pay-card .pay-title {
  font-size: var(--font-xs);
  font-weight: 600;
  color: var(--text-secondary);
}
.pay-card .pay-pct-badge {
  font-size: var(--font-xxs);
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.04);
  color: var(--text-secondary);
  font-weight: 700;
}
.pay-card .pay-amount {
  font-size: var(--font-base);
  font-weight: 800;
  color: var(--text-primary);
  margin-top: 2px;
}
.pay-card .pay-count {
  font-size: var(--font-xs);
}

/* Order Report Cards */
.order-report-card {
  background: #ffffff !important;
  border: 1.5px solid var(--border-color) !important;
  border-radius: var(--radius-md) !important;
  transition: all var(--transition-base);
  cursor: pointer;
}
.order-report-card:hover {
  border-color: rgba(139, 3, 19, 0.3) !important;
  box-shadow: 0 2px 8px rgba(139, 3, 19, 0.06);
}
.order-report-card.cancelled-order {
  background: #fafafa !important;
  opacity: 0.75;
}
.order-id-badge {
  background: rgba(139, 3, 19, 0.08);
  color: var(--primary);
  font-weight: 800;
  font-size: var(--font-sm);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
}
.order-id-badge.cancelled {
  background: rgba(0, 0, 0, 0.08);
  color: var(--text-muted);
  text-decoration: line-through;
}
.order-pay-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-xxs);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
}
.order-pay-pill.pay-cash { background: rgba(16, 185, 129, 0.1); color: #059669; }
.order-pay-pill.pay-qr { background: rgba(139, 3, 19, 0.08); color: var(--primary); }
.order-pay-pill.pay-gov { background: rgba(59, 130, 246, 0.1); color: #2563eb; }
.order-pay-pill.pay-delivery { background: rgba(234, 88, 12, 0.1); color: #ea580c; }

.order-status-pill.pill-cancelled {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  font-size: var(--font-xxs);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
}
.order-discount-pill {
  background: rgba(239, 68, 68, 0.08);
  color: #dc2626;
  font-size: var(--font-xxs);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px dashed rgba(239, 68, 68, 0.3);
}
.order-total-amount {
  font-size: var(--font-base);
  font-weight: 800;
}
.order-total-amount.strike {
  text-decoration: line-through;
}
.order-chevron-btn {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: var(--font-xs);
  transition: transform 0.2s ease;
}
.order-chevron-btn.rotate {
  transform: rotate(180deg);
  color: var(--primary);
}
.order-cancel-reason-box {
  background: rgba(239, 68, 68, 0.06);
  border-left: 3px solid #dc2626;
  padding: 6px 10px;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  font-size: var(--font-xs);
  color: #dc2626;
}
.order-drawer-content {
  border-top: 1px dashed var(--border-color);
}
.order-item-qty {
  background: rgba(139, 3, 19, 0.06);
  color: var(--primary);
  font-size: var(--font-xxs);
  font-weight: 700;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}


/* Custom Stock Quick Filter Pills & Stock Log Cards */
.stock-log-card {
  align-items: center;
  margin-bottom: var(--space-sm);
}

.stock-log-card.cook-pair-top {
  margin-bottom: 0;
  border-bottom-style: dashed;
  border-bottom-color: rgba(234, 88, 12, 0.45);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.stock-log-card.cook-pair-bottom {
  margin-top: -1.5px;
  border-top-style: dashed;
  border-top-color: rgba(16, 185, 129, 0.45);
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

.stock-log-card.cook-pair-top:hover,
.stock-log-card.cook-pair-top:has(+ .cook-pair-connector + .stock-log-card.cook-pair-bottom:hover),
.stock-log-card.cook-pair-bottom:hover,
.stock-log-card.cook-pair-top:hover + .cook-pair-connector + .stock-log-card.cook-pair-bottom {
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(139, 3, 19, 0.06);
}

.stock-log-card.cook-pair-top:hover + .cook-pair-connector .cook-pair-pill,
.cook-pair-connector:has(+ .stock-log-card.cook-pair-bottom:hover) .cook-pair-pill {
  border-color: var(--primary) !important;
  box-shadow: 0 2px 8px rgba(139, 3, 19, 0.14) !important;
}

.log-badge.stock-reason-restock, .log-badge.stock-reason-restock_ck, .log-badge.stock-reason-cook_ready { background: rgba(16, 185, 129, 0.12); color: #10b981; }
.log-badge.stock-reason-adjustment { background: rgba(139, 3, 19, 0.08); color: var(--primary); }
.log-badge.stock-reason-cook_deduct { background: rgba(234, 88, 12, 0.12); color: #ea580c; }
.log-badge.stock-reason-waste { background: rgba(220, 38, 38, 0.1); color: #dc2626; }
.log-badge.stock-reason-staff_benefit { background: rgba(234, 88, 12, 0.12); color: #ea580c; }
.log-badge.stock-reason-sale, .log-badge.stock-reason-cancel_restore { background: rgba(59, 130, 246, 0.1); color: #2563eb; }

.stock-type-pill {
  font-size: 10.5px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
}
.stock-type-pill.raw {
  background: rgba(234, 88, 12, 0.1);
  color: #c2410c;
  border: 1px solid rgba(234, 88, 12, 0.25);
}
.stock-type-pill.cooked {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.stock-action-tag {
  font-size: var(--font-xs);
  font-weight: 600;
  color: var(--text-secondary);
}

.stock-log-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-shrink: 0;
  min-width: 78px;
}

.stock-delta-badge {
  font-size: var(--font-xs);
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}
.stock-delta-badge.positive {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}
.stock-delta-badge.negative {
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
}

.stock-balance-flow {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: var(--font-xs);
  color: var(--text-secondary);
  white-space: nowrap;
}

</style>
