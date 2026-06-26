<template>
  <div id="reports-page" class="page-enter">
    
    <!-- Tab toggles placed at the very top, styled as category tabs -->
    <div class="category-tabs mb-lg">
      <button 
        class="category-tab" 
        :class="{ 'active': activeTab === 'sales' }"
        @click="activeTab = 'sales'"
      >
        <i class="fa-solid fa-chart-column" style="margin-right: 4px;"></i> ยอดขาย
      </button>
      <button 
        class="category-tab" 
        :class="{ 'active': activeTab === 'order_history' }"
        @click="activeTab = 'order_history'"
      >
        <i class="fa-solid fa-clock-rotate-left" style="margin-right: 4px;"></i> ประวัติออเดอร์ย้อนหลัง
      </button>
      <button 
        v-if="isAdminUser"
        class="category-tab" 
        :class="{ 'active': activeTab === 'expenses' }"
        @click="activeTab = 'expenses'"
      >
        <i class="fa-solid fa-wallet" style="margin-right: 4px;"></i> บันทึกค่าใช้จ่ายประจำวัน
      </button>
      <button 
        v-if="isAdminUser"
        class="category-tab" 
        :class="{ 'active': activeTab === 'top_menus' }"
        @click="activeTab = 'top_menus'"
      >
        <i class="fa-solid fa-fire" style="margin-right: 4px;"></i> 10 อันดับเมนูขายดี
      </button>
      <button 
        v-if="isAdminUser"
        class="category-tab" 
        :class="{ 'active': activeTab === 'activity_logs' }"
        @click="activeTab = 'activity_logs'"
      >
        <i class="fa-solid fa-user-shield" style="margin-right: 4px;"></i> ประวัติกิจกรรมพนักงาน
      </button>
      <button 
        v-if="isAdminUser"
        class="category-tab" 
        :class="{ 'active': activeTab === 'stock_history' }"
        @click="activeTab = 'stock_history'"
      >
        <i class="fa-solid fa-boxes-stacked" style="margin-right: 4px;"></i> ประวัติสต็อก
      </button>
      <button 
        v-if="isAdminUser"
        class="category-tab" 
        :class="{ 'active': activeTab === 'cash_audit' }"
        @click="activeTab = 'cash_audit'"
      >
        <i class="fa-solid fa-cash-register" style="margin-right: 4px;"></i> ตรวจสอบยอดลิ้นชัก
      </button>
    </div>

    <!-- Date selector card (hidden on 'top_menus' tab only) -->
    <div v-if="activeTab !== 'top_menus'" class="card mb-lg p-md" style="position: relative; z-index: 50;">
      <div class="flex flex-col gap-md">
        <!-- Period Mode Tabs -->
        <div class="flex gap-xs" style="border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
          <button 
            type="button"
            class="btn btn-sm" 
            :class="periodMode === 'daily' ? 'btn-primary' : 'btn-secondary'"
            @click="setPeriodMode('daily')"
            style="min-height:32px; font-size:12px; padding: 4px 12px; border-radius: 4px;"
          >
            <i class="fa-solid fa-calendar-day" style="margin-right: 4px;"></i> รายวัน
          </button>
          <button 
            type="button"
            class="btn btn-sm" 
            :class="periodMode === 'monthly' ? 'btn-primary' : 'btn-secondary'"
            @click="setPeriodMode('monthly')"
            style="min-height:32px; font-size:12px; padding: 4px 12px; border-radius: 4px;"
          >
            <i class="fa-solid fa-calendar-days" style="margin-right: 4px;"></i> รายเดือน
          </button>
          <button 
            type="button"
            class="btn btn-sm" 
            :class="periodMode === 'yearly' ? 'btn-primary' : 'btn-secondary'"
            @click="setPeriodMode('yearly')"
            style="min-height:32px; font-size:12px; padding: 4px 12px; border-radius: 4px;"
          >
            <i class="fa-solid fa-calendar" style="margin-right: 4px;"></i> รายปี
          </button>
        </div>

        <!-- Date Selector Input depending on Mode -->
        <div class="flex flex-wrap gap-md align-center" style="width: 100%;">
          <div class="flex gap-sm align-center">
            <div style="font-size: var(--font-sm); white-space:nowrap;" class="font-bold">
              {{ periodMode === 'daily' ? 'เลือกวัน:' : periodMode === 'monthly' ? 'เลือกเดือน:' : 'เลือกปี:' }}
            </div>
            
            <!-- Custom Select for Daily (Date Picker) -->
            <div v-if="periodMode === 'daily'" class="custom-select-wrapper" style="max-width: 200px; position: relative;" @click.stop>
              <div 
                class="custom-select-trigger reports-filter-control" 
                :class="{ 'active': isDateDropdownOpen }" 
                @click="toggleDateDropdown"
                style="height: 38px; padding: 6px 36px 6px var(--space-md); display: flex; align-items: center; justify-content: space-between; cursor: pointer;"
              >
                <span class="custom-select-text">{{ selectedDateLabel }}</span>
              </div>
              <div v-if="isDateDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 2px); width: 280px !important; max-height: none !important; overflow-y: visible !important; padding: var(--space-sm); display: flex; flex-direction: column; gap: var(--space-xs); z-index: 1000;">
                <!-- Header: Month & Year Selector -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: var(--space-xs); border-bottom: 1px solid var(--border-color);">
                  <button class="btn btn-sm btn-secondary" style="min-height: 28px; padding: 2px 8px;" @click.stop="adjustDatePickerMonth(-1)">
                    <i class="fa-solid fa-chevron-left"></i>
                  </button>
                  <span class="font-bold" style="font-size: 13px;">{{ datePickerMonthName }} {{ datePickerYear + 543 }}</span>
                  <button class="btn btn-sm btn-secondary" style="min-height: 28px; padding: 2px 8px;" @click.stop="adjustDatePickerMonth(1)">
                    <i class="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
                <!-- Weekday Labels -->
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 11px; font-weight: bold; color: var(--text-secondary); margin-top: 4px;">
                  <div v-for="day in ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']" :key="day">{{ day }}</div>
                </div>
                <!-- Days Grid -->
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; margin-top: 4px;">
                  <div v-for="empty in datePickerStartOffset" :key="'empty-'+empty"></div>
                  <button 
                    v-for="dNum in datePickerDaysCount" 
                    :key="dNum"
                    class="btn btn-sm"
                    :class="isDatePickerSelected(dNum) ? 'btn-primary' : 'btn-secondary'"
                    style="min-height: 28px; width: 100%; padding: 0; font-size: 11px; display: flex; align-items: center; justify-content: center; border-radius: 4px;"
                    @click="selectDatePickerDay(dNum)"
                  >
                    {{ dNum }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Custom Select for Monthly (Month Picker) -->
            <div v-if="periodMode === 'monthly'" class="custom-select-wrapper" style="max-width: 200px; position: relative;" @click.stop>
              <div 
                class="custom-select-trigger reports-filter-control" 
                :class="{ 'active': isMonthDropdownOpen }" 
                @click="toggleMonthDropdown"
                style="height: 38px; padding: 6px 36px 6px var(--space-md); display: flex; align-items: center; justify-content: space-between; cursor: pointer;"
              >
                <span class="custom-select-text">{{ selectedMonthLabel }}</span>
              </div>
              <div v-if="isMonthDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 2px); width: 300px !important; max-height: none !important; overflow-y: visible !important; padding: var(--space-sm); display: flex; flex-direction: column; gap: var(--space-sm); z-index: 1000;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: var(--space-xs);">
                  <button class="btn btn-sm btn-secondary" style="min-height: 28px; padding: 2px 8px;" @click.stop="adjustMonthPickerYear(-1)">
                    <i class="fa-solid fa-chevron-left"></i>
                  </button>
                  <span class="font-bold">ปี พ.ศ. {{ monthPickerYear + 543 }}</span>
                  <button class="btn btn-sm btn-secondary" style="min-height: 28px; padding: 2px 8px;" @click.stop="adjustMonthPickerYear(1)">
                    <i class="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
                <div class="month-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
                  <button 
                    v-for="(mName, idx) in thaiMonthsShort" 
                    :key="idx" 
                    class="btn btn-sm"
                    :class="isMonthPickerSelected(idx + 1) ? 'btn-primary' : 'btn-secondary'"
                    style="min-height: 32px; padding: 4px; font-size: 12px;"
                    @click="selectMonthPicker(idx + 1)"
                  >
                    {{ mName }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Custom Select for Yearly -->
            <div v-if="periodMode === 'yearly'" class="custom-select-wrapper" style="max-width: 200px;" @click.stop>
              <div 
                class="custom-select-trigger reports-filter-control" 
                :class="{ 'active': isYearDropdownOpen }" 
                @click="toggleYearDropdown"
                style="height: 38px; padding: 6px 36px 6px var(--space-md); display: flex; align-items: center;"
              >
                <span class="custom-select-text">{{ selectedYearLabel }}</span>
              </div>
              <div v-if="isYearDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 2px);">
                <div 
                  v-for="y in availableYears" 
                  :key="y" 
                  class="custom-select-option" 
                  :class="{ 'selected': selectedYear === String(y) }" 
                  @click="selectYear(y)"
                >
                  ปี {{ y }}
                </div>
              </div>
            </div>
          </div>

          <!-- Branch Selector for Admin -->
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
              <div v-if="isBranchDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 2px);">
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

          <!-- Time Filter (ช่วงเวลา) - Active only on daily mode for specific tabs -->
          <div v-if="periodMode === 'daily' && ['order_history', 'expenses', 'activity_logs', 'stock_history'].includes(activeTab)" class="flex gap-sm align-center reports-time-filter">
            <div style="font-size: var(--font-sm); white-space:nowrap;" class="font-bold">ช่วงเวลา:</div>
            <div class="flex align-center gap-xs">
              <input 
                type="text" 
                v-model="customStartTime" 
                placeholder="00.00" 
                class="form-input reports-filter-control" 
                style="width: 80px; height: 38px; text-align: center; padding: 6px; font-size: var(--font-sm);"
              />
              <span style="font-size: var(--font-sm); color: var(--text-secondary);">ถึง</span>
              <input 
                type="text" 
                v-model="customEndTime" 
                placeholder="23.59" 
                class="form-input reports-filter-control" 
                style="width: 80px; height: 38px; text-align: center; padding: 6px; font-size: var(--font-sm);"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading spinner for reports -->
    <div v-if="loading" class="card text-center p-3xl">
      <div class="spinner" style="margin:0 auto;"></div>
    </div>

    <template v-else>
      <!-- Tab 1: Sales (ยอดขาย) -->
      <div v-if="activeTab === 'sales'" style="display: flex; flex-direction: column; gap: var(--space-lg);">
        
        <!-- Admin Only: Top summary widgets (moved inside Tab 1) -->
        <div v-if="isAdminUser" class="grid grid-2 gap-md" style="display:grid; grid-template-columns: repeat(2, 1fr); gap:var(--space-md);">
          <div class="card text-center p-md">
            <div style="font-size: var(--font-xs); color: var(--text-secondary); margin-bottom: 2px;">ยอดขายวันนี้</div>
            <div class="font-bold text-primary" style="font-size: var(--font-xl);">{{ formatCurrency(summary.today_sales) }}</div>
            <div style="font-size: 10px; color: var(--text-tertiary); margin-top: 2px;">{{ summary.today_orders }} บิลเสร็จสมบูรณ์</div>
          </div>
          <div class="card text-center p-md">
            <div style="font-size: var(--font-xs); color: var(--text-secondary); margin-bottom: 2px;">ยอดรวมเดือนนี้</div>
            <div class="font-bold text-accent" style="font-size: var(--font-xl);">{{ formatCurrency(summary.month_sales) }}</div>
            <div style="font-size: 10px; color: var(--text-tertiary); margin-top: 2px;">{{ summary.month_orders }} รายการขาย</div>
          </div>
        </div>

        <!-- Admin Only: Daily Summary Card -->
        <div v-if="isAdminUser" class="card">
          <div class="card-title" style="font-size: var(--font-sm);"><i class="fa-solid fa-chart-simple" style="margin-right: 6px;"></i> {{ summaryCardTitle }}</div>
          
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
          <div class="payment-methods-grid">
            <div class="p-xs card" style="background:var(--bg-secondary); border:none;">
              <div style="color:var(--text-secondary); display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-money-bill-wave" style="color: var(--success);"></i> เงินสด</div>
              <div class="font-bold" style="font-size:var(--font-base); margin-top:2px;">
                {{ formatCurrency(dailyReport.cash_sales) }}
              </div>
              <div style="color:var(--text-tertiary);">{{ dailyReport.cash_orders }} บิล</div>
            </div>
            <div class="p-xs card" style="background:var(--bg-secondary); border:none;">
              <div style="color:var(--text-secondary); display: inline-flex; align-items: center; gap: 4px;">
                <i class="fa-solid fa-qrcode" style="color: var(--primary);"></i>
                <span class="hide-mobile">QR Code</span>
                <span class="show-mobile-inline">QR</span>
              </div>
              <div class="font-bold" style="font-size:var(--font-base); margin-top:2px;">
                {{ formatCurrency(dailyReport.qr_sales) }}
              </div>
              <div style="color:var(--text-tertiary);">{{ dailyReport.qr_orders }} บิล</div>
            </div>
            <div class="p-xs card" style="background:var(--bg-secondary); border:none;">
              <div style="color:var(--text-secondary); display: inline-flex; align-items: center; gap: 4px;">
                <i class="fa-solid fa-landmark" style="color: var(--accent);"></i>
                <span class="hide-mobile">โครงการรัฐ</span>
                <span class="show-mobile-inline">รัฐ</span>
              </div>
              <div class="font-bold" style="font-size:var(--font-base); margin-top:2px;">
                {{ formatCurrency(dailyReport.gov_sales) }}
              </div>
              <div style="color:var(--text-tertiary);">{{ dailyReport.gov_orders }} บิล</div>
            </div>
            <div class="p-xs card" style="background:var(--bg-secondary); border:none;">
              <div style="color:var(--text-secondary); display: inline-flex; align-items: center; gap: 4px;">
                <i class="fa-solid fa-motorcycle" style="color: #ff9500;"></i>
                <span class="hide-mobile">เดลิเวอรี</span>
                <span class="show-mobile-inline">เดลิ</span>
              </div>
              <div class="font-bold" style="font-size:var(--font-base); margin-top:2px;">
                {{ formatCurrency(dailyReport.delivery_sales) }}
              </div>
              <div style="color:var(--text-tertiary);">{{ dailyReport.delivery_orders }} บิล</div>
            </div>
          </div>
        </div>

        <!-- Today's Transaction Logs (ALL ROLES) -->
        <div class="card">
          <div class="flex flex-between align-center mb-md" style="flex-wrap: wrap; gap: var(--space-sm); border-bottom: 1px solid var(--border-color); padding-bottom: var(--space-sm);">
            <div class="card-title" style="font-size: var(--font-sm); margin: 0;"><i class="fa-solid fa-list" style="margin-right: 6px;"></i> {{ dailyOrdersListTitle }}</div>
          </div>
          
          <div v-if="dailyReport.orders?.length === 0" style="font-size:var(--font-sm); color:var(--text-tertiary); text-align:center; padding: var(--space-md);">
            {{ dailyOrdersEmptyLabel }}
          </div>
          <div v-else style="display: flex; flex-direction: column; gap: var(--space-sm);">
            <div 
              v-for="order in paginatedDailyReportOrders" 
              :key="order.id" 
              class="p-sm card"
              style="font-size:var(--font-sm); background: var(--bg-primary); display:flex; flex-direction:column; gap:2px; cursor:pointer;"
              @click="toggleExpandOrder(order.id)"
            >
              <div class="flex flex-between font-bold">
                <span :style="order.status === 'cancelled' ? 'text-decoration:line-through; opacity:0.5;' : ''">
                  #{{ order.order_number }}
                </span>
                <div>
                  <span v-if="order.status === 'cancelled'" class="text-danger" style="font-size:11px; margin-right:4px;"><i class="fa-solid fa-circle-xmark text-danger" style="margin-right: 4px;"></i> ยกเลิก</span>
                  <span v-if="order.discount > 0" class="badge animate-fade-in" style="font-size:10px; background: rgba(255, 59, 48, 0.1); color: #ff3b30; border: 1px solid rgba(255, 59, 48, 0.2); padding: 2px 6px; border-radius: var(--radius-sm); margin-right: 6px; font-weight: normal;">ลด -{{ formatCurrency(order.discount) }}</span>
                  <span :class="order.status === 'cancelled' ? 'text-danger' : 'text-accent'">{{ formatCurrency(order.total) }}</span>
                </div>
              </div>
              <div class="flex flex-between" style="font-size:11px; color:var(--text-secondary); margin-top:2px;">
                <span style="display: inline-flex; align-items: center; gap: 4px;">
                  <i :class="order.payment_method === 'cash' ? 'fa-solid fa-money-bill-wave' : order.payment_method === 'qr' ? 'fa-solid fa-qrcode' : order.payment_method === 'gov' ? 'fa-solid fa-landmark' : order.payment_method === 'delivery' ? 'fa-solid fa-motorcycle' : 'fa-solid fa-hourglass-half'"></i>
                  {{ order.payment_method === 'cash' ? 'เงินสด' : order.payment_method === 'qr' ? 'QR Code' : order.payment_method === 'gov' ? 'โครงการรัฐ' : order.payment_method === 'delivery' ? 'เดลิเวอรี' : 'รอชำระ' }}
                </span>
                <span>เวลา: {{ formatTime(order.created_at) }}</span>
              </div>
              <div v-if="order.cancel_reason" style="font-size: 11px; color: #ff3b30; border-left: 2px solid #ff3b30; padding-left:6px; margin-top:4px;">
                เหตุผลยกเลิก: {{ order.cancel_reason }}
              </div>

              <!-- Expandable: Order Items Detail -->
              <div v-if="expandedOrderId === order.id" style="margin-top:var(--space-sm); padding-top:var(--space-sm); border-top:1px dashed var(--border-color);">
                <div v-if="expandedItems.length === 0" style="font-size:11px; color:var(--text-tertiary); text-align:center;">กำลังโหลด...</div>
                <div v-else>
                  <div v-for="item in expandedItems" :key="item.id" class="flex flex-between" style="font-size:12px; padding:2px 0;">
                    <span>{{ item.item_name }} x{{ item.quantity }}</span>
                    <span>{{ formatCurrency(item.subtotal) }}</span>
                  </div>
                  <!-- Discount Info if applied -->
                  <div v-if="order.discount > 0" style="margin-top: 6px; border-top: 1px dashed var(--border-color); padding-top: 6px; display: flex; flex-direction: column; gap: 2px; font-size: 11px; color: var(--text-secondary);">
                    <div class="flex flex-between" style="display: flex; justify-content: space-between;">
                      <span>ยอดรวม (ก่อนหัก):</span>
                      <span>{{ formatCurrency(order.subtotal) }}</span>
                    </div>
                    <div class="flex flex-between font-bold" style="display: flex; justify-content: space-between; color: #ff3b30;">
                      <span>ส่วนลด:</span>
                      <span>-{{ formatCurrency(order.discount) }}</span>
                    </div>
                  </div>
                </div>
                <!-- Void Button (only for completed orders) -->
                <button 
                  v-if="order.status === 'completed'" 
                  class="btn btn-sm" 
                  style="margin-top:var(--space-sm); width:100%; background:rgba(255,59,48,0.1); color:#ff3b30; border:1px solid rgba(255,59,48,0.3); min-height:40px; font-size:var(--font-sm); display: inline-flex; align-items: center; justify-content: center; gap: 4px;"
                  @click.stop="openVoidModal(order)"
                >
                  <i class="fa-solid fa-trash-can"></i> ลบบิลนี้
                </button>
              </div>
            </div>

            <!-- Pagination UI for Daily Orders -->
            <div v-if="totalDailyOrdersPages > 1" class="flex flex-center align-center gap-md" style="margin-top: var(--space-md); padding-top: var(--space-md); border-top: 1px solid var(--border-color);">
              <button 
                class="btn btn-secondary" 
                style="min-height:36px; padding: 4px 12px; font-size:12px; display: inline-flex; align-items: center; gap: 4px;"
                :disabled="dailyOrdersCurrentPage === 1" 
                @click="dailyOrdersCurrentPage--"
              >
                <i class="fa-solid fa-chevron-left"></i> ก่อนหน้า
              </button>
              <span style="font-size: var(--font-sm); font-weight: bold;">
                หน้า {{ dailyOrdersCurrentPage }} / {{ totalDailyOrdersPages }}
              </span>
              <button 
                class="btn btn-secondary" 
                style="min-height:36px; padding: 4px 12px; font-size:12px; display: inline-flex; align-items: center; gap: 4px;"
                :disabled="dailyOrdersCurrentPage === totalDailyOrdersPages" 
                @click="dailyOrdersCurrentPage++"
              >
                ถัดไป <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Order History (ประวัติออเดอร์ย้อนหลัง) -->
      <div v-if="activeTab === 'order_history'" class="card">
        <div class="flex flex-between align-center mb-md" style="flex-wrap: wrap; gap: var(--space-sm); border-bottom: 1px solid var(--border-color); padding-bottom: var(--space-sm);">
          <div class="card-title" style="font-size: var(--font-sm); margin:0;"><i class="fa-solid fa-clock-rotate-left" style="margin-right: 6px;"></i> ประวัติออเดอร์ย้อนหลัง</div>
          <div class="flex align-center gap-sm" style="flex-wrap: wrap;">
            <button 
              v-if="historyOrders.length > 0"
              class="btn btn-sm btn-secondary" 
              style="padding: 4px 12px; font-size:12px; min-height:32px; display:inline-flex; align-items:center; gap:4px; border-radius: var(--radius-md);"
              @click="exportHistoryOrdersCSV"
            >
              <i class="fa-solid fa-file-csv" style="margin-right: 4px;"></i> ส่งออกประวัติออเดอร์ (CSV)
            </button>
            
            <!-- Staff Filter -->
            <div class="flex align-center gap-xs">
              <span style="font-size: var(--font-xs); font-weight:bold; color:var(--text-secondary);">พนักงาน:</span>
              <div class="custom-select-wrapper" style="width: 140px;" @click.stop>
                <div 
                  class="custom-select-trigger" 
                  :class="{ 'active': isHistoryStaffDropdownOpen }" 
                  @click="isHistoryStaffDropdownOpen = !isHistoryStaffDropdownOpen; isHistoryPaymentDropdownOpen = false; isHistoryStatusDropdownOpen = false;"
                  style="height: 32px; padding: 4px 32px 4px 12px; font-size: 12px; display: flex; align-items: center; border-radius: var(--radius-sm); background-position: right 10px center;"
                >
                  <span class="custom-select-text">
                    {{ historyStaffFilter === 'all' ? 'ทั้งหมด' : historyStaffFilter }}
                  </span>
                </div>
                <div v-if="isHistoryStaffDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 2px); max-height: 200px; overflow-y: auto;">
                  <div class="custom-select-option" :class="{ 'selected': historyStaffFilter === 'all' }" @click="historyStaffFilter = 'all'; isHistoryStaffDropdownOpen = false;" style="padding: 6px 12px; font-size: 12px;">ทั้งหมด</div>
                  <div 
                    v-for="staff in staffList" 
                    :key="staff.id" 
                    class="custom-select-option" 
                    :class="{ 'selected': historyStaffFilter === staff.name }" 
                    @click="historyStaffFilter = staff.name; isHistoryStaffDropdownOpen = false;" 
                    style="padding: 6px 12px; font-size: 12px;"
                  >
                    {{ staff.name }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Payment Filter -->
            <div class="flex align-center gap-xs">
              <span style="font-size: var(--font-xs); font-weight:bold; color:var(--text-secondary);">ชำระเงิน:</span>
              <div class="custom-select-wrapper" style="width: 140px;" @click.stop>
                <div 
                  class="custom-select-trigger" 
                  :class="{ 'active': isHistoryPaymentDropdownOpen }" 
                  @click="isHistoryPaymentDropdownOpen = !isHistoryPaymentDropdownOpen; isHistoryStaffDropdownOpen = false; isHistoryStatusDropdownOpen = false;"
                  style="height: 32px; padding: 4px 32px 4px 12px; font-size: 12px; display: flex; align-items: center; border-radius: var(--radius-sm); background-position: right 10px center;"
                >
                  <span class="custom-select-text">
                    {{ getPaymentLabel(historyPaymentFilter) }}
                  </span>
                </div>
                <div v-if="isHistoryPaymentDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 2px);">
                  <div class="custom-select-option" :class="{ 'selected': historyPaymentFilter === 'all' }" @click="historyPaymentFilter = 'all'; isHistoryPaymentDropdownOpen = false;" style="padding: 6px 12px; font-size: 12px;">ทั้งหมด</div>
                  <div class="custom-select-option" :class="{ 'selected': historyPaymentFilter === 'cash' }" @click="historyPaymentFilter = 'cash'; isHistoryPaymentDropdownOpen = false;" style="padding: 6px 12px; font-size: 12px;">เงินสด</div>
                  <div class="custom-select-option" :class="{ 'selected': historyPaymentFilter === 'qr' }" @click="historyPaymentFilter = 'qr'; isHistoryPaymentDropdownOpen = false;" style="padding: 6px 12px; font-size: 12px;">QR Code</div>
                  <div class="custom-select-option" :class="{ 'selected': historyPaymentFilter === 'gov' }" @click="historyPaymentFilter = 'gov'; isHistoryPaymentDropdownOpen = false;" style="padding: 6px 12px; font-size: 12px;">โครงการรัฐ</div>
                  <div class="custom-select-option" :class="{ 'selected': historyPaymentFilter === 'delivery' }" @click="historyPaymentFilter = 'delivery'; isHistoryPaymentDropdownOpen = false;" style="padding: 6px 12px; font-size: 12px;">เดลิเวอรี</div>
                </div>
              </div>
            </div>

            <!-- Status Filter -->
            <div class="flex align-center gap-xs">
              <span style="font-size: var(--font-xs); font-weight:bold; color:var(--text-secondary);">สถานะ:</span>
              <div class="custom-select-wrapper" style="width: 140px;" @click.stop>
                <div 
                  class="custom-select-trigger" 
                  :class="{ 'active': isHistoryStatusDropdownOpen }" 
                  @click="isHistoryStatusDropdownOpen = !isHistoryStatusDropdownOpen; isHistoryStaffDropdownOpen = false; isHistoryPaymentDropdownOpen = false;"
                  style="height: 32px; padding: 4px 32px 4px 12px; font-size: 12px; display: flex; align-items: center; border-radius: var(--radius-sm); background-position: right 10px center;"
                >
                  <span class="custom-select-text">
                    {{ selectedHistoryStatusLabel }}
                  </span>
                </div>
                <div v-if="isHistoryStatusDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 2px);">
                  <div class="custom-select-option" :class="{ 'selected': historyStatusFilter === 'all' }" @click="selectHistoryStatus('all')" style="padding: 6px 12px; font-size: 12px;">ทั้งหมด</div>
                  <div class="custom-select-option" :class="{ 'selected': historyStatusFilter === 'completed' }" @click="selectHistoryStatus('completed')" style="padding: 6px 12px; font-size: 12px;">ชำระเงินแล้ว</div>
                  <div class="custom-select-option" :class="{ 'selected': historyStatusFilter === 'cancelled' }" @click="selectHistoryStatus('cancelled')" style="padding: 6px 12px; font-size: 12px;">ยกเลิก</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="historyOrders.length === 0" style="font-size:var(--font-sm); color:var(--text-tertiary); text-align:center; padding: var(--space-xl);">
          ไม่มีรายการออเดอร์ในช่วงเวลาที่เลือก
        </div>
        <div v-else>
          <!-- Desktop Table (Desktop Only) -->
          <div class="hide-mobile" style="display: block; width: 100%; overflow-x: auto; border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-bottom: var(--space-md);">
            <table class="table" style="width: 100%; border-collapse: collapse; font-size: var(--font-sm);">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); background: rgba(139, 3, 19, 0.03);">
                  <th style="padding: var(--space-md); text-align: left;">วัน-เวลา</th>
                  <th style="padding: var(--space-md); text-align: left;">เลขที่บิล</th>
                  <th style="padding: var(--space-md); text-align: left;">พนักงาน</th>
                  <th style="padding: var(--space-md); text-align: left;">สาขา</th>
                  <th style="padding: var(--space-md); text-align: center;">ชำระเงิน</th>
                  <th style="padding: var(--space-md); text-align: right;">ยอดสุทธิ</th>
                  <th style="padding: var(--space-md); text-align: center;">สถานะ</th>
                  <th style="padding: var(--space-md); text-align: center;">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="order in paginatedHistoryOrders" :key="order.id">
                  <tr 
                    style="border-bottom: 1px solid var(--border-color); cursor: pointer;"
                    class="table-row-hover"
                    @click="toggleExpandOrder(order.id)"
                  >
                    <td style="padding: var(--space-sm) var(--space-md); font-size: 11px; color:var(--text-secondary);">
                      {{ formatDate(order.created_at) }}<br/>{{ formatTime(order.created_at) }}
                    </td>
                    <td style="padding: var(--space-sm) var(--space-md); font-weight:bold;">
                      #{{ order.order_number }}
                    </td>
                    <td style="padding: var(--space-sm) var(--space-md);">
                      {{ order.staff_name || 'ระบบ' }}
                    </td>
                    <td style="padding: var(--space-sm) var(--space-md);">
                      {{ order.branch_name || 'ไม่ระบุ' }}
                    </td>
                    <td style="padding: var(--space-sm) var(--space-md); text-align: center; white-space: nowrap;">
                      <i :class="order.payment_method === 'cash' ? 'fa-solid fa-money-bill-wave' : order.payment_method === 'qr' ? 'fa-solid fa-qrcode' : order.payment_method === 'gov' ? 'fa-solid fa-landmark' : order.payment_method === 'delivery' ? 'fa-solid fa-motorcycle' : 'fa-solid fa-hourglass-half'" style="margin-right: 4px;"></i>
                      {{ order.payment_method === 'cash' ? 'เงินสด' : order.payment_method === 'qr' ? 'QR Code' : order.payment_method === 'gov' ? 'โครงการรัฐ' : order.payment_method === 'delivery' ? 'เดลิเวอรี' : 'รอชำระ' }}
                    </td>
                    <td style="padding: var(--space-sm) var(--space-md); text-align: right; font-weight:bold;">
                      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                        <span :class="order.status === 'cancelled' ? 'text-danger' : 'text-accent'">{{ formatCurrency(order.total) }}</span>
                        <span v-if="order.discount > 0" class="badge animate-fade-in" style="font-size:10px; background: rgba(255, 59, 48, 0.1); color: #ff3b30; border: 1px solid rgba(255, 59, 48, 0.2); padding: 1px 4px; border-radius: var(--radius-sm); font-weight: normal; display: inline-block;">ลด -{{ formatCurrency(order.discount) }}</span>
                      </div>
                    </td>
                    <td style="padding: var(--space-sm) var(--space-md); text-align: center;">
                      <span v-if="order.status === 'completed'" class="text-success" style="font-size:12px;"><i class="fa-solid fa-circle-check text-success" style="margin-right: 4px;"></i> สำเร็จ</span>
                      <span v-else-if="order.status === 'cancelled'" class="text-danger" style="font-size:12px;"><i class="fa-solid fa-circle-xmark text-danger" style="margin-right: 4px;"></i> ยกเลิก</span>
                      <span v-else class="text-warning" style="font-size:12px;"><i class="fa-solid fa-hourglass-half text-warning" style="margin-right: 4px;"></i> รอชำระ</span>
                    </td>
                    <td style="padding: var(--space-sm) var(--space-md); text-align: center;" @click.stop>
                      <button 
                        v-if="order.status === 'completed'" 
                        class="btn btn-sm" 
                        style="background:rgba(255,59,48,0.1); color:#ff3b30; border:1px solid rgba(255,59,48,0.2); padding:4px 8px; font-size:11px; min-height:28px; display: inline-flex; align-items: center; gap: 4px;"
                        @click="openVoidModal(order)"
                      >
                        <i class="fa-solid fa-trash-can"></i> ลบ
                      </button>
                      <span v-else>-</span>
                    </td>
                  </tr>
                  <!-- Expand detail row for Desktop table -->
                  <tr v-if="expandedOrderId === order.id" :key="'expand-' + order.id" style="background: rgba(139, 3, 19, 0.01);">
                    <td colspan="8" style="padding: var(--space-md); border-bottom: 1px solid var(--border-color);">
                      <div style="max-width: 500px; margin: 0 auto; border: 1px dashed var(--border-color); padding: var(--space-md); border-radius: var(--radius-md); background: var(--bg-primary);">
                        <div class="font-bold mb-xs" style="font-size: 13px; color: var(--primary);">รายละเอียดสินค้า:</div>
                        <div v-if="expandedItems.length === 0" style="font-size:11px; color:var(--text-tertiary); text-align:center;">กำลังโหลด...</div>
                        <div v-else>
                          <div v-for="item in expandedItems" :key="item.id" class="flex flex-between mb-xs" style="font-size:12px; border-bottom:1px solid rgba(0,0,0,0.03); padding-bottom:2px;">
                            <span>{{ item.item_name }} x{{ item.quantity }}</span>
                            <span class="font-bold">{{ formatCurrency(item.subtotal) }}</span>
                          </div>
                          <!-- Discount Info if applied -->
                          <div v-if="order.discount > 0" style="margin-top: 8px; border-top: 1px dashed var(--border-color); padding-top: 8px; display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--text-secondary);">
                            <div class="flex flex-between" style="display: flex; justify-content: space-between;">
                              <span>ยอดรวม (ก่อนหัก):</span>
                              <span>{{ formatCurrency(order.subtotal) }}</span>
                            </div>
                            <div class="flex flex-between font-bold" style="display: flex; justify-content: space-between; color: #ff3b30;">
                              <span>ส่วนลด:</span>
                              <span>-{{ formatCurrency(order.discount) }}</span>
                            </div>
                            <div class="flex flex-between font-bold" style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-color); padding-top: 4px; margin-top: 2px;">
                              <span>ยอดสุทธิ:</span>
                              <span :class="order.status === 'cancelled' ? 'text-danger' : 'text-accent'">{{ formatCurrency(order.total) }}</span>
                            </div>
                          </div>
                        </div>
                        <div v-if="order.cancel_reason" class="mt-sm pt-sm" style="border-top: 1px solid rgba(255,59,48,0.1); font-size:11px; color:#ff3b30; display: inline-flex; align-items: center; gap: 4px;">
                          <i class="fa-solid fa-triangle-exclamation text-danger"></i> <strong>เหตุผลที่ยกเลิก:</strong> {{ order.cancel_reason }}
                        </div>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

          <!-- Mobile Cards (Mobile Only) -->
          <div class="show-mobile-only history-mobile-list" style="margin-bottom: var(--space-md);">
            <div 
              v-for="order in paginatedHistoryOrders" 
              :key="order.id" 
              class="p-sm card"
              style="font-size:var(--font-sm); background: var(--bg-primary); display:flex; flex-direction:column; gap:4px; cursor:pointer; border:1px solid var(--border-color);"
              @click="toggleExpandOrder(order.id)"
            >
              <div class="flex flex-between font-bold">
                <span :style="order.status === 'cancelled' ? 'text-decoration:line-through; opacity:0.5;' : ''">
                  #{{ order.order_number }}
                </span>
                <div>
                  <span v-if="order.discount > 0" class="badge animate-fade-in" style="font-size:10px; background: rgba(255, 59, 48, 0.1); color: #ff3b30; border: 1px solid rgba(255, 59, 48, 0.2); padding: 2px 6px; border-radius: var(--radius-sm); margin-right: 6px; font-weight: normal;">ลด -{{ formatCurrency(order.discount) }}</span>
                  <span :class="order.status === 'cancelled' ? 'text-danger' : 'text-accent'">{{ formatCurrency(order.total) }}</span>
                </div>
              </div>
              <div class="flex flex-between" style="font-size:11px; color:var(--text-secondary);">
                <span><i class="fa-solid fa-user" style="margin-right: 2px;"></i> {{ order.staff_name || 'ระบบ' }} | <i class="fa-solid fa-store" style="margin-right: 2px;"></i> {{ order.branch_name || 'ไม่ระบุ' }}</span>
                <span>{{ formatDate(order.created_at) }} {{ formatTime(order.created_at) }}</span>
              </div>
              <div class="flex flex-between align-center mt-xs" style="font-size:11px;">
                <span style="display: inline-flex; align-items: center; gap: 4px;">
                  <i :class="order.payment_method === 'cash' ? 'fa-solid fa-money-bill-wave' : order.payment_method === 'qr' ? 'fa-solid fa-qrcode' : order.payment_method === 'gov' ? 'fa-solid fa-landmark' : order.payment_method === 'delivery' ? 'fa-solid fa-motorcycle' : 'fa-solid fa-hourglass-half'"></i>
                  {{ order.payment_method === 'cash' ? 'เงินสด' : order.payment_method === 'qr' ? 'QR Code' : order.payment_method === 'gov' ? 'โครงการรัฐ' : order.payment_method === 'delivery' ? 'เดลิเวอรี' : 'รอชำระ' }}
                </span>
                <div>
                  <span v-if="order.status === 'completed'" class="text-success"><i class="fa-solid fa-circle-check text-success" style="margin-right: 2px;"></i> สำเร็จ</span>
                  <span v-else-if="order.status === 'cancelled'" class="text-danger"><i class="fa-solid fa-circle-xmark text-danger" style="margin-right: 2px;"></i> ยกเลิก</span>
                </div>
              </div>

              <!-- Expanded detail for Mobile card -->
              <div v-if="expandedOrderId === order.id" style="margin-top:var(--space-sm); padding-top:var(--space-sm); border-top:1px dashed var(--border-color);" @click.stop>
                <div v-if="expandedItems.length === 0" style="font-size:11px; color:var(--text-tertiary); text-align:center;">กำลังโหลด...</div>
                <div v-else>
                  <div v-for="item in expandedItems" :key="item.id" class="flex flex-between" style="font-size:12px; padding:2px 0;">
                    <span>{{ item.item_name }} x{{ item.quantity }}</span>
                    <span>{{ formatCurrency(item.subtotal) }}</span>
                  </div>
                  <!-- Discount Info if applied -->
                  <div v-if="order.discount > 0" style="margin-top: 6px; border-top: 1px dashed var(--border-color); padding-top: 6px; display: flex; flex-direction: column; gap: 2px; font-size: 11px; color: var(--text-secondary);">
                    <div class="flex flex-between" style="display: flex; justify-content: space-between;">
                      <span>ยอดรวม (ก่อนหัก):</span>
                      <span>{{ formatCurrency(order.subtotal) }}</span>
                    </div>
                    <div class="flex flex-between font-bold" style="display: flex; justify-content: space-between; color: #ff3b30;">
                      <span>ส่วนลด:</span>
                      <span>-{{ formatCurrency(order.discount) }}</span>
                    </div>
                    <div class="flex flex-between font-bold" style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-color); padding-top: 4px; margin-top: 2px;">
                      <span>ยอดสุทธิ:</span>
                      <span :class="order.status === 'cancelled' ? 'text-danger' : 'text-accent'">{{ formatCurrency(order.total) }}</span>
                    </div>
                  </div>
                </div>
                <div v-if="order.cancel_reason" style="font-size:11px; color:#ff3b30; margin-top:4px; display: inline-flex; align-items: center; gap: 4px;">
                  <i class="fa-solid fa-triangle-exclamation text-danger"></i> เหตุผลยกเลิก: {{ order.cancel_reason }}
                </div>
                <!-- Void Button inside Mobile Expanded Card -->
                <button 
                  v-if="order.status === 'completed'" 
                  class="btn btn-sm mt-sm" 
                  style="width:100%; background:rgba(255,59,48,0.1); color:#ff3b30; border:1px solid rgba(255,59,48,0.2); min-height:36px; font-size:var(--font-sm); display: inline-flex; align-items: center; justify-content: center; gap: 4px;"
                  @click="openVoidModal(order)"
                >
                  <i class="fa-solid fa-trash-can"></i> ลบบิลนี้
                </button>
              </div>
            </div>
          </div>

          <!-- Pagination UI -->
          <div v-if="totalPages > 1" class="flex flex-center align-center gap-md" style="margin-top: var(--space-md); padding-top: var(--space-md); border-top: 1px solid var(--border-color);">
            <button 
              class="btn btn-secondary" 
              style="min-height:36px; padding: 4px 12px; font-size:12px; display: inline-flex; align-items: center; gap: 4px;"
              :disabled="historyCurrentPage === 1" 
              @click="historyCurrentPage--"
            >
              <i class="fa-solid fa-chevron-left"></i> ก่อนหน้า
            </button>
            <span style="font-size: var(--font-sm); font-weight: bold;">
              หน้า {{ historyCurrentPage }} / {{ totalPages }}
            </span>
            <button 
              class="btn btn-secondary" 
              style="min-height:36px; padding: 4px 12px; font-size:12px; display: inline-flex; align-items: center; gap: 4px;"
              :disabled="historyCurrentPage === totalPages" 
              @click="historyCurrentPage++"
            >
              ถัดไป <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Tab 2: Expenses (บันทึกค่าใช้จ่ายประจำวัน) -->
      <div v-if="activeTab === 'expenses' && isAdminUser" class="card">
        <div class="card-title" style="font-size: var(--font-sm);"><i class="fa-solid fa-wallet" style="margin-right: 6px;"></i> บันทึกค่าใช้จ่ายประจำวัน ({{ selectedDate === getToday() ? 'วันนี้' : 'วันที่ ' + formatDate(selectedDate) }})</div>
        
        <!-- Quick Add Expense Form -->
        <div class="expense-form-grid">
          <div class="form-group mb-xs">
            <input type="number" class="form-input" v-model.number="expenseForm.amount" placeholder="จำนวนเงิน (บาท)" />
          </div>
            <div class="form-group mb-xs">
              <div class="custom-select-wrapper" @click.stop>
                <div 
                  class="custom-select-trigger" 
                  :class="{ 'active': isExpenseCategoryDropdownOpen }" 
                  @click="isExpenseCategoryDropdownOpen = !isExpenseCategoryDropdownOpen"
                >
                  <span class="custom-select-text" style="display: inline-flex; align-items: center; gap: 6px;">
                    <i :class="getExpenseCategoryIcon(expenseForm.category)"></i>
                    {{ selectedExpenseCategoryLabel }}
                  </span>
                </div>
                <div v-if="isExpenseCategoryDropdownOpen" class="custom-select-dropdown" style="max-height: 250px; overflow-y: auto;">
                  <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'raw_chicken' }" @click="selectExpenseCategory('raw_chicken')"><i class="fa-solid fa-drumstick-bite" style="margin-right: 4px;"></i> ไก่สด</div>
                  <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'meatballs' }" @click="selectExpenseCategory('meatballs')"><i class="fa-solid fa-circle" style="margin-right: 4px;"></i> ลูกชิ้น</div>
                  <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'salapao' }" @click="selectExpenseCategory('salapao')"><i class="fa-solid fa-cookie" style="margin-right: 4px;"></i> ซาลาเปา</div>
                  <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'fuel_oil' }" @click="selectExpenseCategory('fuel_oil')"><i class="fa-solid fa-gas-pump" style="margin-right: 4px;"></i> น้ำมัน</div>
                  <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'gas_lpg' }" @click="selectExpenseCategory('gas_lpg')"><i class="fa-solid fa-fire" style="margin-right: 4px;"></i> แก๊ส</div>
                  <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'salary' }" @click="selectExpenseCategory('salary')"><i class="fa-solid fa-hand-holding-dollar" style="margin-right: 4px;"></i> เงินเดือน</div>
                  <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'utility_bills' }" @click="selectExpenseCategory('utility_bills')"><i class="fa-solid fa-bolt" style="margin-right: 4px;"></i> ค่าไฟ/น้ำ</div>
                  <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'packaging' }" @click="selectExpenseCategory('packaging')"><i class="fa-solid fa-box" style="margin-right: 4px;"></i> บรรจุภัณฑ์/ถุง</div>
                  <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'debt' }" @click="selectExpenseCategory('debt')"><i class="fa-solid fa-file-invoice-dollar" style="margin-right: 4px;"></i> รายจ่าย - หนี้</div>
                  <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'other' }" @click="selectExpenseCategory('other')"><i class="fa-solid fa-paperclip" style="margin-right: 4px;"></i> อื่นๆ</div>
                </div>
              </div>
            </div>
          <div class="form-group mb-xs">
            <div class="custom-select-wrapper" @click.stop>
              <div 
                class="custom-select-trigger" 
                :class="{ 'active': isExpensePaymentMethodDropdownOpen }" 
                @click="isExpensePaymentMethodDropdownOpen = !isExpensePaymentMethodDropdownOpen"
              >
                <span class="custom-select-text" style="display: inline-flex; align-items: center; gap: 6px;">
                  <i :class="expenseForm.payment_method === 'transfer' ? 'fa-solid fa-mobile-screen-button' : 'fa-solid fa-money-bill-wave'"></i>
                  {{ expenseForm.payment_method === 'transfer' ? 'เงินโอน' : 'เงินสด' }}
                </span>
              </div>
              <div v-if="isExpensePaymentMethodDropdownOpen" class="custom-select-dropdown" style="max-height: 250px; overflow-y: auto;">
                <div class="custom-select-option" :class="{ 'selected': expenseForm.payment_method === 'cash' }" @click="selectExpensePaymentMethod('cash')">
                  <i class="fa-solid fa-money-bill-wave" style="margin-right: 4px;"></i> เงินสด
                </div>
                <div class="custom-select-option" :class="{ 'selected': expenseForm.payment_method === 'transfer' }" @click="selectExpensePaymentMethod('transfer')">
                  <i class="fa-solid fa-mobile-screen-button" style="margin-right: 4px;"></i> เงินโอน
                </div>
              </div>
            </div>
          </div>
          <div class="form-group mb-xs">
            <input type="text" class="form-input" v-model="expenseForm.note" placeholder="บันทึกช่วยจำ..." />
          </div>
          <div class="form-group mb-xs">
            <button class="btn btn-primary btn-block" @click="handleAddExpense" :disabled="!expenseForm.amount || expenseForm.amount <= 0" style="white-space:nowrap; display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
              <i class="fa-solid fa-floppy-disk"></i> บันทึก
            </button>
          </div>
        </div>

        <!-- Monthly Ledger Section -->
        <div class="divider" style="margin: var(--space-xl) 0; height:1px; background:var(--border-color);"></div>
        
        <div class="flex flex-between align-center mb-md" style="flex-wrap: wrap; gap: var(--space-sm);">
          <div class="card-title" style="font-size: var(--font-sm); margin: 0;">
            <i class="fa-solid fa-book" style="margin-right: 6px;"></i> สมุดบัญชีรายรับ-รายจ่าย ({{ ledgerPeriodLabel }})
          </div>
          <div style="display:flex; align-items:center; gap:var(--space-sm);">
            <button 
              v-if="filteredLedgerTransactions.length > 0"
              class="btn btn-sm btn-secondary" 
              style="padding: 4px 12px; font-size:12px; min-height:32px; display:inline-flex; align-items:center; gap:4px; border-radius: var(--radius-md);"
              @click="exportExpensesCSV"
            >
              <i class="fa-solid fa-file-csv" style="margin-right: 4px;"></i> ส่งออกบัญชี (CSV)
            </button>
            <div v-if="ledgerLoading" class="spinner spinner-sm"></div>
          </div>
        </div>

        <!-- Monthly Summary Cards -->
        <div class="ledger-summary-grid">
          <div class="p-xs card" style="background:rgba(42, 157, 143, 0.05); border:none; text-align:center;">
            <div style="color:var(--text-secondary); margin-bottom: 2px; font-size:var(--font-xs);">รายรับรวม</div>
            <div class="font-bold text-success" style="font-size:var(--font-base);">
              {{ formatCurrency(filteredLedgerTransactions.reduce((sum, t) => sum + t.income, 0)) }}
            </div>
          </div>
          <div class="p-xs card" style="background:rgba(173, 40, 30, 0.05); border:none; text-align:center;">
            <div style="color:var(--text-secondary); margin-bottom: 2px; font-size:var(--font-xs);">รายจ่ายรวม</div>
            <div class="font-bold text-danger" style="font-size:var(--font-base);">
              {{ formatCurrency(filteredLedgerTransactions.reduce((sum, t) => sum + t.expense, 0)) }}
            </div>
          </div>
          <div class="p-xs card" style="background:rgba(173, 40, 30, 0.05); border:none; text-align:center;">
            <div style="color:var(--text-secondary); margin-bottom: 2px; font-size:var(--font-xs);">คงเหลือสุทธิ</div>
            <div class="font-bold" style="font-size:var(--font-base); color: var(--text-primary);">
              {{ formatCurrency(filteredLedgerTransactions.reduce((sum, t) => sum + t.income - t.expense, 0)) }}
            </div>
          </div>
        </div>

        <!-- Ledger Table (Desktop Only) -->
        <div class="hide-mobile" style="display: block; width: 100%; overflow-x: auto; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
          <table class="table" style="width: 100%; border-collapse: collapse; font-size: var(--font-sm); table-layout: fixed;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); background: rgba(139, 3, 19, 0.03);">
                <th style="width: 15%; padding: var(--space-md); font-size:12px; font-weight:bold; white-space:nowrap; text-align: left !important;">วัน-เวลา</th>
                <th style="width: 35%; padding: var(--space-md); font-size:12px; font-weight:bold; text-align: left !important;">ชื่อรายการ</th>
                <th style="width: 15%; padding: var(--space-md); font-size:12px; font-weight:bold; white-space:nowrap; text-align: center !important;">รายรับ</th>
                <th style="width: 15%; padding: var(--space-md); font-size:12px; font-weight:bold; white-space:nowrap; text-align: center !important;">รายจ่าย</th>
                <th style="width: 15%; padding: var(--space-md); font-size:12px; font-weight:bold; white-space:nowrap; text-align: center !important;">คงเหลือ</th>
                <th style="width: 5%; padding: var(--space-md); font-size:12px; font-weight:bold; white-space:nowrap; text-align: center !important;">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="ledgerLoading && filteredLedgerTransactions.length === 0">
                <td colspan="6" style="text-align: center; padding: var(--space-xl);">
                  <div class="spinner" style="margin: 0 auto;"></div>
                </td>
              </tr>
              <tr v-else-if="filteredLedgerTransactions.length === 0">
                <td colspan="6" style="text-align: center; padding: var(--space-xl); color: var(--text-tertiary);">
                  ไม่มีรายการธุรกรรมในเดือนนี้
                </td>
              </tr>
              <tr 
                v-else 
                v-for="item in paginatedLedgerTransactions" 
                :key="item.type + '-' + item.id" 
                style="border-bottom: 1px solid var(--border-color);"
                class="table-row-hover"
              >
                <td style="width: 15%; padding: var(--space-sm) var(--space-md); vertical-align: middle; white-space:nowrap; font-size:11px; color:var(--text-secondary); text-align: left !important;">
                  {{ item.formattedDate }}<br/>{{ item.formattedTime }}
                </td>
                <td style="width: 35%; padding: var(--space-sm) var(--space-md); vertical-align: middle; font-weight: 500; text-align: left !important; white-space: normal; word-break: break-word;">
                  {{ item.name }}
                </td>
                <td class="text-success" style="width: 15%; padding: var(--space-sm) var(--space-md); vertical-align: middle; font-weight:bold; text-align: center !important;">
                  {{ item.income > 0 ? formatCurrency(item.income) : '-' }}
                </td>
                <td class="text-danger" style="width: 15%; padding: var(--space-sm) var(--space-md); vertical-align: middle; font-weight:bold; text-align: center !important;">
                  {{ item.expense > 0 ? '-' + formatCurrency(item.expense) : '-' }}
                </td>
                <td style="width: 15%; padding: var(--space-sm) var(--space-md); vertical-align: middle; font-weight:bold; color: var(--text-primary); text-align: center !important;">
                  {{ formatCurrency(item.runningBalance) }}
                </td>
                <td style="width: 5%; padding: var(--space-sm) var(--space-md); vertical-align: middle; text-align: center !important;">
                  <button 
                    v-if="item.type === 'expense'" 
                    class="btn btn-sm" 
                    style="background:rgba(255,59,48,0.1); color:#ff3b30; border:none; padding:4px 8px; font-size:11px; border-radius:var(--radius-sm); cursor:pointer; display: inline-flex; align-items: center; justify-content: center;" 
                    @click="handleDeleteExpense(item.id)"
                  >
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                  <span v-else style="color:var(--text-tertiary); font-size:10px;">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Ledger List (Mobile Only) -->
        <div class="ledger-mobile-list show-mobile-only">
          <div v-if="ledgerLoading && filteredLedgerTransactions.length === 0" style="text-align: center; padding: var(--space-xl);">
            <div class="spinner" style="margin: 0 auto;"></div>
          </div>
          <div v-else-if="filteredLedgerTransactions.length === 0" style="text-align: center; padding: var(--space-xl); color: var(--text-tertiary);">
            ไม่มีรายการธุรกรรมในเดือนนี้
          </div>
          <div v-else style="display:flex; flex-direction:column; gap:var(--space-sm);">
            <div 
              v-for="item in paginatedLedgerTransactions" 
              :key="item.type + '-' + item.id" 
              class="ledger-mobile-card"
              :class="item.type === 'order' ? 'income' : 'expense'"
            >
              <div class="flex flex-between align-center">
                <span class="font-bold text-primary" style="font-size: var(--font-base);">{{ item.name }}</span>
              </div>
              <div class="flex flex-between align-center mt-xs" style="font-size: 11px; color: var(--text-secondary);">
                <span><i class="fa-solid fa-calendar-days" style="margin-right: 4px;"></i> {{ item.formattedDate }} {{ item.formattedTime }}</span>
                <div class="flex align-center gap-md">
                  <span v-if="item.income > 0" class="font-bold text-success" style="font-size: var(--font-base);">
                    +{{ formatCurrency(item.income) }}
                  </span>
                  <span v-else class="font-bold text-danger" style="font-size: var(--font-base);">
                    -{{ formatCurrency(item.expense) }}
                  </span>
                  <button 
                    v-if="item.type === 'expense'"
                    class="btn btn-sm" 
                    style="background:rgba(255,59,48,0.1); color:#ff3b30; border:none; padding:8px 14px; font-size:13px; border-radius:var(--radius-sm); cursor:pointer; display:flex; align-items:center; justify-content:center; min-height:36px; min-width:36px;" 
                    @click="handleDeleteExpense(item.id)"
                  >
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination UI for Ledger -->
        <div v-if="totalLedgerPages > 1" class="flex flex-center align-center gap-md" style="margin-top: var(--space-md); padding-top: var(--space-md); border-top: 1px solid var(--border-color);">
          <button 
            class="btn btn-secondary" 
            style="min-height:36px; padding: 4px 12px; font-size:12px; display: inline-flex; align-items: center; gap: 4px;"
            :disabled="ledgerCurrentPage === 1" 
            @click="ledgerCurrentPage--"
          >
            <i class="fa-solid fa-chevron-left"></i> ก่อนหน้า
          </button>
          <span style="font-size: var(--font-sm); font-weight: bold;">
            หน้า {{ ledgerCurrentPage }} / {{ totalLedgerPages }}
          </span>
          <button 
            class="btn btn-secondary" 
            style="min-height:36px; padding: 4px 12px; font-size:12px; display: inline-flex; align-items: center; gap: 4px;"
            :disabled="ledgerCurrentPage === totalLedgerPages" 
            @click="ledgerCurrentPage++"
          >
            ถัดไป <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>

      <!-- Tab 3: Top Selling Menus (10 อันดับเมนูขายดีที่สุด) -->
      <div v-if="activeTab === 'top_menus' && isAdminUser" class="card" style="position:relative; overflow:hidden; background: var(--glass-bg); backdrop-filter: var(--glass-blur); border: 1px solid var(--glass-border); box-shadow: var(--shadow-md);">
        <!-- Header -->
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: var(--space-md);">
          <div style="width: 38px; height: 38px; border-radius: 50%; background: var(--accent-glow); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255, 171, 43, 0.3);">
            <i class="fa-solid fa-fire text-accent animate-pulse" style="font-size: 1.2rem; color: var(--accent);"></i>
          </div>
          <div>
            <span style="font-weight: 700; color: var(--text-primary); font-size: var(--font-lg); display: block;">10 อันดับสินค้าขายดีที่สุด</span>
            <span style="font-size: 11px; color: var(--text-secondary); font-weight: normal;">สถิติการใช้วัตถุดิบและเมนูจากการขายจริง</span>
          </div>
        </div>

        <!-- Period Selector (Pills) -->
        <div style="margin-bottom: var(--space-md);">
          <div class="pills-container" style="display: inline-flex; gap: var(--space-xs); background: rgba(139, 3, 19, 0.05); padding: 4px; border-radius: var(--radius-full); border: 1px solid rgba(139, 3, 19, 0.12);">
            <button 
              v-for="d in [1, 7, 30]" 
              :key="d"
              @click="setTopItemsDays(d)"
              :style="{
                background: topItemsDays === d ? 'var(--primary)' : 'transparent',
                color: topItemsDays === d ? 'white' : 'var(--text-secondary)',
                boxShadow: topItemsDays === d ? 'var(--shadow-sm)' : 'none',
                fontWeight: topItemsDays === d ? 'bold' : 'normal'
              }"
              style="padding: 6px 18px; border-radius: var(--radius-full); font-size: 11px; transition: all 0.2s ease; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; min-width: 70px;"
            >
              {{ d === 1 ? 'วันนี้' : d + ' วัน' }}
            </button>
          </div>
        </div>

        <!-- Dashed Divider -->
        <div style="border-bottom: 2px dashed var(--border-color-light); margin-bottom: var(--space-lg); width: 100%;"></div>
        
        <div v-if="topItems.length === 0" style="font-size:var(--font-sm); color:var(--text-tertiary); text-align:center; padding: var(--space-3xl); background: rgba(255, 255, 255, 0.3); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
          <i class="fa-solid fa-folder-open mb-sm" style="font-size: 2.5rem; opacity: 0.25; display: block; color: var(--text-primary);"></i>
          ยังไม่มีข้อมูลการขายในระยะเวลาที่เลือก
        </div>
        
        <div v-else style="display: flex; flex-direction: column; gap: var(--space-xs);">
          <!-- Top 3 Items Cards -->
          <div 
            v-for="(item, index) in topItems.slice(0, 3)" 
            :key="item.menu_item_id"
            class="top-item-card-redesign" 
            :class="'rank-' + (index + 1) + '-card'"
          >
            <!-- Left Side: Circle badge/icon -->
            <div class="rank-badge-circle" :class="'rank-' + (index + 1) + '-badge'">
              <i v-if="index === 0" class="fa-solid fa-crown"></i>
              <span v-else>{{ index + 1 }}</span>
            </div>

            <!-- Middle Side: Name (top) and Type Badge (bottom) -->
            <div class="card-info-middle">
              <span class="item-name-text" :title="item.item_name">{{ item.item_name }}</span>
              <div style="display: flex; align-items: center;">
                <span v-if="item.unit === 'กรัม'" class="badge-type mixin">ผสม</span>
                <span v-else class="badge-type main">ทั่วไป</span>
              </div>
            </div>

            <!-- Right Side: Qty & Sales -->
            <div class="card-sales-right">
              <div class="qty-column">
                <span class="qty-num">{{ Number(Number(item.total_qty).toFixed(2)).toLocaleString() }}</span>
                <span class="qty-unit">{{ item.unit || 'ชิ้น' }}</span>
              </div>
              <div class="sales-pill">
                {{ formatCurrency(item.total_sales) }}
              </div>
            </div>
          </div>

          <!-- Divider label for ranks 4-10 -->
          <div v-if="topItems.length > 3" style="font-size: 11px; font-weight: bold; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; padding-left: 6px; margin: var(--space-md) 0 var(--space-sm) 0; border-left: 3px solid var(--primary);">
            อันดับที่ 4 - 10
          </div>

          <!-- Loop for Ranks 4-10 -->
          <div 
            v-for="(item, index) in topItems.slice(3)" 
            :key="item.menu_item_id"
            class="top-item-card-redesign rank-other-card"
          >
            <!-- Left Side: Circle badge with number -->
            <div class="rank-badge-circle rank-other-badge">
              <span>{{ index + 4 }}</span>
            </div>

            <!-- Middle Side: Name (top) and Type Badge (bottom) -->
            <div class="card-info-middle">
              <span class="item-name-text" :title="item.item_name">{{ item.item_name }}</span>
              <div style="display: flex; align-items: center;">
                <span v-if="item.unit === 'กรัม'" class="badge-type mixin">ผสม</span>
                <span v-else class="badge-type main">ทั่วไป</span>
              </div>
            </div>

            <!-- Right Side: Qty & Sales -->
            <div class="card-sales-right">
              <div class="qty-column">
                <span class="qty-num">{{ Number(Number(item.total_qty).toFixed(2)).toLocaleString() }}</span>
                <span class="qty-unit">{{ item.unit || 'ชิ้น' }}</span>
              </div>
              <div class="sales-pill">
                {{ formatCurrency(item.total_sales) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 4: Activity Logs (ประวัติกิจกรรมพนักงาน) -->
      <div v-if="activeTab === 'activity_logs' && isAdminUser" class="card">
        <div class="card-title" style="font-size: var(--font-sm);"><i class="fa-solid fa-user-shield" style="margin-right: 6px;"></i> ประวัติกิจกรรมพนักงาน</div>
        
        <!-- Filter dropdowns in a 2-column grid -->
        <div class="grid grid-2 gap-md mb-md" style="display:grid; grid-template-columns: repeat(2, 1fr); gap:var(--space-md);">
          
          <!-- Category Filter -->
          <div class="form-group">
            <label class="form-label font-bold" style="font-size: var(--font-sm);"><i class="fa-solid fa-magnifying-glass" style="margin-right: 6px;"></i> กรองประเภทกิจกรรม:</label>
            <div class="custom-select-wrapper" @click.stop>
              <div 
                class="custom-select-trigger" 
                :class="{ 'active': isFilterActionDropdownOpen }" 
                @click="isFilterActionDropdownOpen = !isFilterActionDropdownOpen; isActivityStaffDropdownOpen = false;"
                style="height: 40px; padding: 8px 40px 8px var(--space-lg);"
              >
                <span class="custom-select-text" style="font-size: var(--font-sm); display: inline-flex; align-items: center; gap: 6px;">
                  <i :class="getFilterActionIcon(filterAction)"></i>
                  {{ selectedFilterActionLabel }}
                </span>
              </div>
              <div v-if="isFilterActionDropdownOpen" class="custom-select-dropdown">
                <div class="custom-select-option" :class="{ 'selected': filterAction === 'all' }" @click="selectFilterAction('all')"><i class="fa-solid fa-folder-open" style="margin-right: 4px;"></i> ทั้งหมด</div>
                <div class="custom-select-option" :class="{ 'selected': filterAction === 'login' }" @click="selectFilterAction('login')"><i class="fa-solid fa-key" style="margin-right: 4px;"></i> การลงชื่อเข้าใช้งาน (Login)</div>
                <div class="custom-select-option" :class="{ 'selected': filterAction === 'sales' }" @click="selectFilterAction('sales')"><i class="fa-solid fa-cart-shopping" style="margin-right: 4px;"></i> การขาย / ออกบิล (Sales)</div>
                <div class="custom-select-option" :class="{ 'selected': filterAction === 'cancel' }" @click="selectFilterAction('cancel')"><i class="fa-solid fa-ban" style="margin-right: 4px;"></i> การยกเลิกบิล (Void)</div>
                <div class="custom-select-option" :class="{ 'selected': filterAction === 'expenses' }" @click="selectFilterAction('expenses')"><i class="fa-solid fa-wallet" style="margin-right: 4px;"></i> บันทึกค่าใช้จ่าย (Expenses)</div>
                <div class="custom-select-option" :class="{ 'selected': filterAction === 'stock' }" @click="selectFilterAction('stock')"><i class="fa-solid fa-boxes-stacked" style="margin-right: 4px;"></i> จัดการสต็อก / ของเสีย (Stock & Waste)</div>
                <div class="custom-select-option" :class="{ 'selected': filterAction === 'credit' }" @click="selectFilterAction('credit')"><i class="fa-solid fa-user-check" style="margin-right: 4px;"></i> เครดิตพนักงาน (Staff Credit)</div>
                <div class="custom-select-option" :class="{ 'selected': filterAction === 'cash_drawer' }" @click="selectFilterAction('cash_drawer')"><i class="fa-solid fa-cash-register" style="margin-right: 4px;"></i> การจัดการลิ้นชักเงินสด (Cash Drawer)</div>
              </div>
            </div>
          </div>

          <!-- Staff Filter -->
          <div class="form-group">
            <label class="form-label font-bold" style="font-size: var(--font-sm);"><i class="fa-solid fa-user" style="margin-right: 6px;"></i> กรองพนักงาน:</label>
            <div class="custom-select-wrapper" @click.stop>
              <div 
                class="custom-select-trigger" 
                :class="{ 'active': isActivityStaffDropdownOpen }" 
                @click="isActivityStaffDropdownOpen = !isActivityStaffDropdownOpen; isFilterActionDropdownOpen = false;"
                style="height: 40px; padding: 8px 40px 8px var(--space-lg);"
              >
                <span class="custom-select-text" style="font-size: var(--font-sm); display: inline-flex; align-items: center; gap: 6px;">
                  <i class="fa-solid fa-user"></i>
                  {{ activityStaffFilter === 'all' ? 'ทั้งหมด' : activityStaffFilter }}
                </span>
              </div>
              <div v-if="isActivityStaffDropdownOpen" class="custom-select-dropdown" style="max-height: 200px; overflow-y: auto; top: calc(100% + 2px);">
                <div class="custom-select-option" :class="{ 'selected': activityStaffFilter === 'all' }" @click="activityStaffFilter = 'all'; isActivityStaffDropdownOpen = false;"><i class="fa-solid fa-users" style="margin-right: 4px;"></i> ทั้งหมด</div>
                <div 
                  v-for="staff in staffList" 
                  :key="staff.id" 
                  class="custom-select-option" 
                  :class="{ 'selected': activityStaffFilter === staff.name }" 
                  @click="activityStaffFilter = staff.name; isActivityStaffDropdownOpen = false;"
                >
                  <i class="fa-solid fa-user" style="margin-right: 4px;"></i> {{ staff.name }}
                </div>
              </div>
            </div>
          </div>

        </div>

        <div v-if="filteredActivityLogs.length === 0" style="font-size:var(--font-sm); color:var(--text-tertiary); text-align:center; padding:var(--space-md);">
          ยังไม่มีกิจกรรมที่ตรงตามตัวกรองในวันนี้
        </div>
        <div v-else class="activity-logs-list">
          <div v-for="log in paginatedActivityLogs" :key="log.id" class="activity-log-item">
            <div class="log-badge-wrapper">
              <div class="log-badge" :class="log.action">
                <i :class="getActionIconClass(log.action)"></i>
              </div>
            </div>
            <div class="log-content-wrapper">
              <div class="log-details">{{ log.details }}</div>
              <div class="log-meta">
                <span class="log-user"><i class="fa-solid fa-user" style="margin-right: 4px;"></i>{{ log.staff_name || 'ระบบ' }}</span>
                <span class="log-time"><i class="fa-solid fa-clock" style="margin-right: 4px;"></i>{{ formatTime(log.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination UI for Activity Logs -->
        <div v-if="totalActivityPages > 1" class="flex flex-center align-center gap-md" style="margin-top: var(--space-md); padding-top: var(--space-md); border-top: 1px solid var(--border-color);">
          <button 
            class="btn btn-secondary" 
            style="min-height:36px; padding: 4px 12px; font-size:12px; display: inline-flex; align-items: center; gap: 4px;"
            :disabled="activityCurrentPage === 1" 
            @click="activityCurrentPage--"
          >
            <i class="fa-solid fa-chevron-left"></i> ก่อนหน้า
          </button>
          <span style="font-size: var(--font-sm); font-weight: bold;">
            หน้า {{ activityCurrentPage }} / {{ totalActivityPages }}
          </span>
          <button 
            class="btn btn-secondary" 
            style="min-height:36px; padding: 4px 12px; font-size:12px; display: inline-flex; align-items: center; gap: 4px;"
            :disabled="activityCurrentPage === totalActivityPages" 
            @click="activityCurrentPage++"
          >
            ถัดไป <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </template>

    <!-- Void Order Modal -->
    <div v-if="showVoidModal" class="modal-container active" style="display:flex; align-items:center; justify-content:center; position: fixed; inset:0; z-index:1000;">
      <div class="modal-overlay" @click="showVoidModal = false"></div>
      <div class="modal-content modal-center w-full max-w-sm" style="position:relative; z-index:2;">
        <div class="modal-header">
          <h3><i class="fa-solid fa-trash-can" style="margin-right: 6px;"></i> ลบบิล #{{ voidOrder?.order_number }}</h3>
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
              class="btn"
              :class="voidReason === preset.value ? 'btn-primary' : 'btn-secondary'"
              style="text-align:left; min-height:44px; display: inline-flex; align-items: center; gap: 8px;"
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
            <button class="btn btn-secondary flex-1" @click="showVoidModal = false">ยกเลิก</button>
            <button 
              class="btn flex-1" 
              style="background:rgba(255,59,48,0.9); color:#fff; border:none; display: inline-flex; align-items: center; justify-content: center; gap: 4px;"
              :disabled="!voidReason || (voidReason === 'custom' && !voidCustomReason.trim())"
              @click="handleVoidOrder"
            >
              <i class="fa-solid fa-circle-check"></i> ยืนยันลบบิล
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 5: Stock History (ประวัติสต็อก) -->
    <div v-if="activeTab === 'stock_history' && isAdminUser" class="card">
      <div class="flex flex-between align-center mb-md" style="flex-wrap: wrap; gap: var(--space-sm); border-bottom: 1px solid var(--border-color); padding-bottom: var(--space-sm);">
        <div class="card-title" style="font-size: var(--font-sm); margin:0;">
          <i class="fa-solid fa-boxes-stacked" style="margin-right: 6px;"></i> ประวัติสต็อก
        </div>

        <!-- Menu Item Filter -->
        <div class="flex align-center gap-xs">
          <span style="font-size: var(--font-xs); font-weight:bold; color:var(--text-secondary);">สินค้า:</span>
          <div class="custom-select-wrapper" style="width: 200px;" @click.stop>
            <div 
              class="custom-select-trigger" 
              :class="{ 'active': isStockItemDropdownOpen }" 
              @click="isStockItemDropdownOpen = !isStockItemDropdownOpen"
              style="height: 32px; padding: 4px 32px 4px 12px; font-size: 12px; display: flex; align-items: center; border-radius: var(--radius-sm); background-position: right 10px center;"
            >
              <span class="custom-select-text">
                {{ selectedStockItemName }}
              </span>
            </div>
            <div v-if="isStockItemDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 2px); max-height: 200px; overflow-y: auto; z-index:1001;">
              <div 
                v-for="item in reportsStockItems" 
                :key="item.id" 
                class="custom-select-option" 
                :class="{ 'selected': selectedReportsStockItemId === item.id }" 
                @click="selectReportsStockItem(item)" 
                style="padding: 6px 12px; font-size: 12px;"
              >
                {{ item.name }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="stockHistoryLoading" style="text-align: center; padding: var(--space-xl);">
        <div class="spinner" style="margin: 0 auto;"></div>
      </div>
      <div v-else-if="filteredStockLogs.length === 0" style="text-align: center; padding: var(--space-xl); color: var(--text-tertiary); font-size: var(--font-sm);">
        ไม่มีรายการประวัติสต็อกในช่วงเวลาที่เลือก
      </div>
      <div v-else>
        <!-- Desktop Table (Desktop Only) -->
        <div class="hide-mobile" style="display: block; width: 100%; overflow-x: auto; border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-bottom: var(--space-md);">
          <table class="table" style="width: 100%; border-collapse: collapse; font-size: var(--font-sm);">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); background: rgba(139, 3, 19, 0.03);">
                <th style="padding: var(--space-md); text-align: left;">สินค้า</th>
                <th style="padding: var(--space-md); text-align: left;">ชื่อพนักงาน</th>
                <th style="padding: var(--space-md); text-align: left;">กิจกรรม</th>
                <th style="padding: var(--space-md); text-align: left;">เวลา</th>
                <th style="padding: var(--space-md); text-align: center;">จำนวนก่อนปรับ</th>
                <th style="padding: var(--space-md); text-align: center;">จำนวนที่ปรับ</th>
                <th style="padding: var(--space-md); text-align: center;">จำนวนหลังปรับ</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="log in paginatedStockLogs" 
                :key="log.id"
                style="border-bottom: 1px solid var(--border-color);"
                class="table-row-hover"
              >
                <td style="padding: var(--space-sm) var(--space-md); font-weight:bold;">
                  {{ selectedStockItemName }}
                </td>
                <td style="padding: var(--space-sm) var(--space-md);">
                  {{ log.staff_name || 'ระบบ' }}
                </td>
                <td style="padding: var(--space-sm) var(--space-md);">
                  <span class="font-bold" style="display: inline-flex; align-items: center; gap: 6px;">
                    <i :class="getStockReasonIconClass(log.reason)" style="color: var(--text-tertiary);"></i>
                    <span>{{ getStockReasonLabel(log.reason) }}</span>
                  </span>
                </td>
                <td style="padding: var(--space-sm) var(--space-md); font-size: 11px; color:var(--text-secondary);">
                  {{ formatDate(log.created_at) }} {{ formatTime(log.created_at) }}
                </td>
                <td style="padding: var(--space-sm) var(--space-md); text-align: center;">
                  {{ log.previous_stock }}
                </td>
                <td style="padding: var(--space-sm) var(--space-md); text-align: center;" :class="log.change_qty > 0 ? 'text-success' : 'text-danger'">
                  <strong>{{ log.change_qty > 0 ? `+${log.change_qty}` : log.change_qty }}</strong>
                </td>
                <td style="padding: var(--space-sm) var(--space-md); text-align: center; font-weight:bold;">
                  {{ log.new_stock }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile List View (Mobile Only) -->
        <div class="show-mobile-only" style="display: flex; flex-direction: column; gap: var(--space-sm);">
          <div 
            v-for="log in paginatedStockLogs" 
            :key="log.id" 
            class="card p-sm flex flex-between align-center"
            style="font-size: var(--font-sm); background: var(--bg-primary);"
          >
            <div>
              <div class="font-bold" style="display: inline-flex; align-items: center; gap: 6px;">
                <i :class="getStockReasonIconClass(log.reason)" style="color: var(--text-tertiary);"></i>
                <span>{{ getStockReasonLabel(log.reason) }}</span>
                <span 
                  :class="log.change_qty > 0 ? 'text-success' : 'text-danger'"
                  style="margin-left: 4px;"
                >
                  {{ log.change_qty > 0 ? `+${log.change_qty}` : log.change_qty }}
                </span>
              </div>
              <div style="font-size: 10px; color: var(--text-tertiary); margin-top: 2px;">
                โดย: {{ log.staff_name || 'ระบบ' }} | {{ formatDate(log.created_at) }} {{ formatTime(log.created_at) }}
              </div>
              <div v-if="log.note" style="font-size: 11px; color: var(--text-secondary); margin-top: 4px; border-left: 2px solid var(--border-color); padding-left: 6px;">
                {{ log.note }}
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 10px; color: var(--text-tertiary);">ยอดหลังปรับ</div>
              <div class="font-bold">{{ log.new_stock }}</div>
            </div>
          </div>
        </div>

        <!-- Pagination UI -->
        <div v-if="totalStockLogsPages > 1" class="flex flex-center align-center gap-md" style="margin-top: var(--space-md); padding-top: var(--space-md); border-top: 1px solid var(--border-color);">
          <button 
            class="btn btn-secondary" 
            style="min-height:36px; padding: 4px 12px; font-size:12px; display: inline-flex; align-items: center; gap: 4px;"
            :disabled="stockLogsCurrentPage === 1" 
            @click="stockLogsCurrentPage--"
          >
            <i class="fa-solid fa-chevron-left"></i> ก่อนหน้า
          </button>
          <span style="font-size: var(--font-sm); font-weight: bold;">
            หน้า {{ stockLogsCurrentPage }} / {{ totalStockLogsPages }}
          </span>
          <button 
            class="btn btn-secondary" 
            style="min-height:36px; padding: 4px 12px; font-size:12px; display: inline-flex; align-items: center; gap: 4px;"
            :disabled="stockLogsCurrentPage === totalStockLogsPages" 
            @click="stockLogsCurrentPage++"
          >
            ถัดไป <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Cash Drawer Audit Tab (Admin Only) -->
    <div v-if="activeTab === 'cash_audit' && isAdminUser" class="card p-md" style="position:relative; background: var(--glass-bg); backdrop-filter: var(--glass-blur); border: 1px solid var(--glass-border); box-shadow: var(--shadow-md);">
      <div class="flex align-center mb-md" style="margin-bottom:var(--space-md);">
        <h3 style="margin: 0; font-size: 1.2rem; font-weight: 600; color: var(--text-primary);">
          <i class="fa-solid fa-cash-register" style="margin-right: 8px; color: var(--primary);"></i>
          ตรวจสอบเงินสดในลิ้นชักประจำวัน (ลับเฉพาะเจ้าของร้าน)
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

      <div v-if="cashDrawerLoading" class="flex justify-center p-xl" style="display:flex; justify-content:center; padding:var(--space-xl);">
        <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--primary-color);"></i>
      </div>

      <div v-else-if="cashDrawerSessions.length === 0" class="flex justify-center p-xl text-center" style="display:flex; justify-content:center; padding:var(--space-xl); color: var(--text-light);">
        ไม่พบข้อมูลรอบบัญชีเงินสด
      </div>

      <div v-else class="hide-mobile table-responsive">
        <table class="table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="padding: 12px; text-align: center; border-bottom: 1px solid var(--border-color); white-space: nowrap;">วันที่</th>
              <th style="padding: 12px; text-align: center; border-bottom: 1px solid var(--border-color); white-space: nowrap;">เงินทอนตั้งต้น</th>
              <th style="padding: 12px; text-align: center; border-bottom: 1px solid var(--border-color); white-space: nowrap;">ยอดขายเงินสด</th>
              <th style="padding: 12px; text-align: center; border-bottom: 1px solid var(--border-color); white-space: nowrap;">ยอดจ่ายเงินสด</th>
              <th style="padding: 12px; text-align: center; border-bottom: 1px solid var(--border-color); white-space: nowrap;">เงินสดที่ควรมี</th>
              <th style="padding: 12px; text-align: center; border-bottom: 1px solid var(--border-color); white-space: nowrap;">เงินสดนับจริง</th>
              <th style="padding: 12px; text-align: center; border-bottom: 1px solid var(--border-color); white-space: nowrap;">ผลต่าง (ขาด/เกิน)</th>
              <th style="padding: 12px; text-align: center; border-bottom: 1px solid var(--border-color); white-space: nowrap;">สถานะ</th>
              <th style="padding: 12px; text-align: center; border-bottom: 1px solid var(--border-color); white-space: nowrap;">ตรวจสอบ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="session in cashDrawerSessions" :key="session.id" style="border-bottom: 1px solid var(--border-color);">
              <td style="padding: 12px; font-weight: 600; text-align: center; vertical-align: middle; white-space: nowrap;">{{ formatDate(session.session_date) }}</td>
              <td style="padding: 12px; text-align: center; vertical-align: middle; white-space: nowrap;">{{ formatCurrency(session.opening_cash) }}</td>
              <td style="padding: 12px; color: #34c759; font-weight: 500; text-align: center; vertical-align: middle; white-space: nowrap;">
                +{{ formatCurrency(session.cash_sales) }}
              </td>
              <td style="padding: 12px; color: #ff3b30; font-weight: 500; text-align: center; vertical-align: middle; white-space: nowrap;">
                -{{ formatCurrency(session.cash_expenses) }}
              </td>
              <td style="padding: 12px; font-weight: 600; text-align: center; vertical-align: middle; white-space: nowrap;">{{ formatCurrency(session.calculated_expected_cash) }}</td>
              <td style="padding: 12px; text-align: center; vertical-align: middle; white-space: nowrap;">
                <span v-if="session.status === 'closed'" style="font-weight: 600;">
                  {{ formatCurrency(session.actual_cash) }}
                </span>
                <span v-else style="color: var(--text-light); font-style: italic;">ยังไม่ได้ตรวจนับ</span>
              </td>
              <td style="padding: 12px; text-align: center; vertical-align: middle; white-space: nowrap;">
                <span v-if="session.status === 'closed'">
                  <span v-if="session.difference === 0" style="color: #34c759; font-weight: bold; background: rgba(52,199,89,0.15); padding: 2px 6px; border-radius: 4px; display: inline-block; white-space: nowrap;">
                    ครบถ้วน (ยอดเท่ากัน)
                  </span>
                  <span v-else-if="session.difference > 0" style="color: #34c759; font-weight: bold; background: rgba(52,199,89,0.15); padding: 2px 6px; border-radius: 4px; display: inline-block; white-space: nowrap;">
                    เกิน ({{ formatCurrency(session.difference) }})
                  </span>
                  <span v-else style="color: #ff3b30; font-weight: bold; background: rgba(255,59,48,0.15); padding: 2px 6px; border-radius: 4px; display: inline-block; white-space: nowrap;">
                    ขาด ({{ formatCurrency(Math.abs(session.difference)) }})
                  </span>
                </span>
                <span v-else style="color: var(--text-light); font-style: italic;">รอปิดยอดประจำวัน</span>
              </td>
              <td style="padding: 12px; text-align: center; vertical-align: middle; white-space: nowrap;">
                <span 
                  :style="{
                    background: session.status === 'closed' ? 'rgba(52,199,89,0.2)' : 'rgba(255,149,0,0.2)',
                    color: session.status === 'closed' ? '#30d158' : '#ff9f0a',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    display: 'inline-block',
                    whiteSpace: 'nowrap'
                  }"
                >
                  {{ session.status === 'closed' ? 'ตรวจสอบแล้ว' : 'เปิดอยู่' }}
                </span>
              </td>
              <td style="padding: 12px; text-align: center; vertical-align: middle; white-space: nowrap;">
                <div style="display: inline-flex; flex-direction: column; gap: 6px; align-items: center; justify-content: center; width: 100%;">
                  <button class="btn btn-secondary" @click="openOpeningCashModal(session)" style="display:inline-flex; align-items:center; justify-content:center; gap:6px; min-height:36px; padding: 6px 12px; font-size: 0.85rem; font-weight: 700; border: 1.5px solid var(--border-color-light); width: 150px;">
                    <i class="fa-solid fa-coins" style="font-size: 1rem;"></i> กรอกยอดเงินทอน
                  </button>
                  <button class="btn btn-primary" @click="openAuditModal(session)" style="display:inline-flex; align-items:center; justify-content:center; gap:6px; min-height:36px; padding: 6px 12px; font-size: 0.85rem; font-weight: 700; background: var(--gradient-primary) !important; color: white !important; width: 150px;">
                    <i class="fa-solid fa-circle-check" style="font-size: 1rem;"></i> ปิดยอดประจำวัน
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
          :key="session.id" 
          class="cash-audit-mobile-card"
        >
          <!-- Card Header: Date & Status -->
          <div class="cash-card-header">
            <span class="session-date">{{ formatDate(session.session_date) }}</span>
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
              <span class="grid-label">เงินสดที่ระบบคำนวณ</span>
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
            <button class="btn btn-secondary flex-1" @click="openOpeningCashModal(session)">
              <i class="fa-solid fa-coins"></i> กรอกยอดเงินทอน
            </button>
            <button class="btn btn-primary flex-1" @click="openAuditModal(session)">
              <i class="fa-solid fa-circle-check"></i> ปิดยอดประจำวัน
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Cash Audit Modal -->
    <div v-if="showAuditModal" class="modal-container active" style="display:flex; align-items:center; justify-content:center; position: fixed; inset:0; z-index:1000;">
      <div class="modal-overlay" @click="showAuditModal = false"></div>
      <div class="modal-content modal-center w-full max-w-md" style="position:relative; z-index:2; max-height: 90vh; overflow-y: auto; background-color: var(--bg-secondary) !important; color: var(--text-primary) !important; border: 2px solid var(--primary) !important; box-shadow: var(--shadow-lg) !important;">
        <div class="modal-header" style="border-bottom: 1px solid var(--border-color-light) !important; padding: var(--space-md) var(--space-lg) !important;">
          <h3 style="color: var(--primary) !important; font-weight: 800 !important; font-size: var(--font-lg) !important; margin: 0 !important; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-calculator"></i> ปิดยอดประจำวันที่ {{ formatDate(activeAuditSession.session_date) }}
          </h3>
          <button class="modal-close" @click="showAuditModal = false" style="color: var(--text-secondary) !important;">✕</button>
        </div>
        <div class="modal-body" style="padding: var(--space-lg) !important; text-align: left !important;">
          <!-- Session Summary details -->
          <div class="mb-md p-sm" style="background: rgba(139, 3, 19, 0.04) !important; border: 1px solid var(--border-color-light) !important; border-radius: 8px; display: flex; flex-direction: column; gap: var(--space-xs); font-size: 0.9rem; margin-bottom:var(--space-md); padding:var(--space-sm); color: var(--text-primary) !important;">
            <div class="flex justify-between" style="display:flex; justify-content:space-between; align-items: center;">
              <span style="color: var(--text-secondary) !important;">เงินทอนตั้งต้น:</span>
              <span style="font-weight: 700; color: var(--text-primary) !important;">{{ formatCurrency(activeAuditSession.opening_cash) }}</span>
            </div>
            <div class="flex justify-between" style="display:flex; justify-content:space-between; align-items: center; color: var(--success) !important;">
              <span style="color: var(--text-secondary) !important;">ยอดขายเงินสดสะสม:</span>
              <span style="font-weight: 700; color: var(--success) !important;">+{{ formatCurrency(activeAuditSession.cash_sales) }}</span>
            </div>
            <div class="flex justify-between" style="display:flex; justify-content:space-between; align-items: center; color: var(--danger) !important;">
              <span style="color: var(--text-secondary) !important;">ยอดจ่ายเงินสดสะสม:</span>
              <span style="font-weight: 700; color: var(--danger) !important;">-{{ formatCurrency(activeAuditSession.cash_expenses) }}</span>
            </div>
            <div class="flex justify-between" style="display:flex; justify-content:space-between; align-items: center; border-top: 1px solid var(--border-color-light) !important; padding-top: var(--space-xs); font-weight: 700; font-size: 0.95rem; color: var(--text-primary) !important;">
              <span>เงินสดที่ระบบคำนวณว่าควรมี:</span>
              <span style="color: var(--primary) !important; font-size: 1.05rem !important;">{{ formatCurrency(activeAuditSession.calculated_expected_cash) }}</span>
            </div>
          </div>

          <!-- Cash Calculator Helper -->
          <div class="mb-md" style="margin-bottom:var(--space-md);">
            <div class="flex justify-between align-center mb-xs" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-xs);">
              <span class="form-label" style="font-weight: 700; color: var(--text-primary) !important; margin:0;">เครื่องช่วยคำนวณเงินสด (นับเหรียญ & ธนบัตร)</span>
              <button type="button" class="btn btn-secondary" style="border: 1.5px solid var(--border-color-light) !important; padding: 6px 12px !important; font-size: 12px !important; color: var(--text-primary) !important; min-height: 32px; font-weight: bold; border-radius: 6px;" @click="toggleCalculatorHelper">
                {{ showCalculatorHelper ? 'ซ่อนเครื่องช่วยนับ' : 'แสดงเครื่องช่วยนับ' }}
              </button>
            </div>

            <div v-if="showCalculatorHelper" class="calculator-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; background: rgba(139, 3, 19, 0.03) !important; border: 1px dashed var(--border-color-light) !important; padding: 12px; border-radius: 12px; margin-top:6px;">
              <div v-for="denom in denominations" :key="denom.value" class="denom-card" style="background: var(--card-bg) !important; border: 1px solid var(--border-color-light) !important; border-radius: 8px; padding: 8px; display: flex; flex-direction: column; align-items: center; gap: 6px; box-shadow: var(--shadow-sm);">
                <span style="font-weight: 700; color: var(--primary) !important; font-size: 0.9rem;">{{ denom.label }}</span>
                <div style="display: flex; align-items: center; gap: 2px; width: 100%; justify-content: center;">
                  <button type="button" class="btn btn-secondary" style="min-width: 28px; height: 28px; padding: 0 !important; font-weight: bold; border-radius: 4px; border: 1.5px solid var(--border-color-light); display: flex; align-items: center; justify-content: center; font-size: 16px;" @click="decrementDenom(denom)">-</button>
                  <input 
                    type="number" 
                    class="form-input text-center" 
                    style="padding: 2px !important; font-size: 0.9rem !important; width: 44px !important; text-align: center !important; height: 28px !important; border: 1px solid var(--border-color-light) !important; background: var(--bg-primary) !important; color: var(--text-primary) !important; border-radius: 4px; font-weight: bold;" 
                    min="0" 
                    v-model.number="denom.count" 
                    @input="calculateTotalFromDenoms"
                  />
                  <button type="button" class="btn btn-secondary" style="min-width: 28px; height: 28px; padding: 0 !important; font-weight: bold; border-radius: 4px; border: 1.5px solid var(--border-color-light); display: flex; align-items: center; justify-content: center; font-size: 16px;" @click="incrementDenom(denom)">+</button>
                </div>
                <span style="color: var(--text-secondary) !important; font-size: 0.75rem; font-weight: 700; text-align: center; word-break: break-all;">{{ formatCurrency(denom.count * denom.value) }}</span>
              </div>
              <div style="grid-column: 1 / -1; border-top: 1px dashed var(--border-color-light) !important; padding-top: var(--space-xs); display:flex; justify-content:space-between; align-items:center; font-weight: 700; margin-top:8px;">
                <span style="color: var(--text-primary) !important; font-size: 0.9rem;">ยอดคำนวณรวม: <span style="color:var(--primary); font-size: 1.15rem !important; font-weight: 800;">{{ formatCurrency(calculatorTotalSum) }}</span></span>
                <button type="button" class="btn btn-primary" style="background: var(--gradient-primary) !important; color: #fff !important; padding: 6px 12px !important; font-size: 12px !important; font-weight: bold; border-radius: 6px; min-height: 32px;" @click="useCalculatorSum">ใช้ยอดนี้</button>
              </div>
            </div>
          </div>

          <!-- Actual Cash Input -->
          <div class="form-group mb-md" style="margin-bottom:var(--space-md) !important;">
            <label class="form-label" style="color: var(--text-primary) !important; font-weight: 700 !important; margin-bottom: var(--space-sm) !important; display: block !important;">
              ระบุยอดเงินสดนับได้จริง (บาท) *
            </label>
            <input 
              type="number" 
              class="form-input text-lg font-bold" 
              style="text-align: right !important; background-color: var(--card-bg) !important; color: var(--text-primary) !important; border: 2px solid var(--border-color-light) !important; padding: var(--space-md) !important; font-size: var(--font-lg) !important;" 
              v-model.number="actualCashInput" 
              placeholder="0.00" 
              required 
              min="0"
            />
          </div>

          <div class="form-group mb-md" style="margin-bottom:var(--space-md) !important;">
            <label class="form-label" style="color: var(--text-primary) !important; font-weight: 700 !important; margin-bottom: var(--space-sm) !important; display: block !important;">
              บันทึกเพิ่มเติม (ถ้ามี)
            </label>
            <textarea 
              class="form-input" 
              rows="2" 
              v-model="auditNote" 
              placeholder="เช่น ระบุสาเหตุที่เงินขาด/เกิน..."
              style="width: 100% !important; border-radius: 6px !important; padding: var(--space-xs) !important; background-color: var(--card-bg) !important; color: var(--text-primary) !important; border: 2px solid var(--border-color-light) !important;"
            ></textarea>
          </div>

          <!-- Action buttons -->
          <div class="flex gap-md mt-lg" style="display:flex !important; gap:var(--space-md) !important; margin-top:var(--space-lg) !important;">
            <button class="btn btn-secondary flex-1" style="flex:1 !important; border: 1px solid var(--border-color-light) !important; color: var(--text-primary) !important;" @click="showAuditModal = false">ยกเลิก</button>
            <button class="btn btn-primary flex-1" style="flex:1 !important; background: var(--gradient-primary) !important; color: #fff !important;" @click="submitCashAudit" :disabled="actualCashInput === '' || actualCashInput === null || actualCashInput < 0">
              <i class="fa-solid fa-circle-check"></i> ปิดยอดประจำวัน
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Set Opening Cash Modal -->
    <div v-if="showOpeningCashModal" class="modal-container active" style="display:flex; align-items:center; justify-content:center; position: fixed; inset:0; z-index:1000;">
      <div class="modal-overlay" @click="showOpeningCashModal = false"></div>
      <div class="modal-content modal-center w-full max-w-sm" style="position:relative; z-index:2; background-color: var(--bg-secondary) !important; color: var(--text-primary) !important; border: 2px solid var(--primary) !important; box-shadow: var(--shadow-lg) !important;">
        <div class="modal-header" style="border-bottom: 1px solid var(--border-color-light) !important; padding: var(--space-md) var(--space-lg) !important;">
          <h3 style="color: var(--primary) !important; font-weight: 800 !important; font-size: var(--font-lg) !important; margin: 0 !important; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-coins"></i> กรอกยอดเงินทอนตั้งต้นประจำวัน
          </h3>
          <button class="modal-close" @click="showOpeningCashModal = false" style="color: var(--text-secondary) !important;">✕</button>
        </div>
        <div class="modal-body" style="padding: var(--space-lg) !important; text-align: left !important;">
          <p style="font-size: var(--font-sm) !important; color: var(--text-secondary) !important; margin-bottom: var(--space-md) !important; line-height: 1.5 !important;">
            ระบุจำนวนเงินทอนสำหรับเตรียมทอนลูกค้าของวันที่ {{ formatDate(activeOpeningSession.session_date) }}
          </p>

          <div class="form-group mb-md" style="margin-bottom: var(--space-md) !important;">
            <label class="form-label" style="color: var(--text-primary) !important; font-weight: 700 !important; margin-bottom: var(--space-sm) !important; display: block !important;">
              จำนวนเงินทอนตั้งต้น (บาท) *
            </label>
            <input 
              type="number" 
              class="form-input text-lg font-bold" 
              style="text-align: right !important; background-color: var(--card-bg) !important; color: var(--text-primary) !important; border: 2px solid var(--border-color-light) !important; padding: var(--space-md) !important; font-size: var(--font-lg) !important;" 
              v-model.number="openingCashInput" 
              placeholder="0.00" 
              required 
              min="0"
            />
          </div>

          <div class="flex gap-md mt-lg" style="display: flex !important; gap: var(--space-md) !important; margin-top: var(--space-lg) !important;">
            <button class="btn btn-secondary flex-1" style="flex: 1 !important; border: 1px solid var(--border-color-light) !important; color: var(--text-primary) !important;" @click="showOpeningCashModal = false">ยกเลิก</button>
            <button class="btn btn-primary flex-1" style="flex: 1 !important; background: var(--gradient-primary) !important; color: #fff !important;" @click="submitOpeningCash" :disabled="openingCashInput === '' || openingCashInput === null || openingCashInput < 0">
              <i class="fa-solid fa-floppy-disk"></i> บันทึกเงินทอน
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import api from '../api';
import { ui, formatCurrency, formatDate, formatTime, getToday, isAdmin, getUser } from '../helpers';
import { store } from '../store';

// Role check
const isAdminUser = computed(() => isAdmin());

const branches = ref([]);
const currentUser = getUser();
const selectedBranchId = ref(sessionStorage.getItem('selected_branch_id') ? Number(sessionStorage.getItem('selected_branch_id')) : (currentUser ? currentUser.branch_id : null));

const activeTab = ref('sales');

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

const reportsStockItems = computed(() => store.stockItems || []);
const selectedReportsStockItemId = ref(null);

const selectedStockItemName = computed(() => {
  const found = reportsStockItems.value.find(item => item.id === selectedReportsStockItemId.value);
  return found ? found.name : 'เลือกสินค้า...';
});

const parseTimeDot = (timeStr) => {
  if (!timeStr) return { hour: 0, minute: 0 };
  const normalized = timeStr.replace(':', '.');
  const parts = normalized.split('.');
  const hour = Number(parts[0]) || 0;
  const minute = Number(parts[1]) || 0;
  return { hour, minute };
};

const getBangkokTimeComponents = (dateStr) => {
  if (!dateStr) return { hour: 0, minute: 0 };
  let d;
  if (typeof dateStr === 'string' && !dateStr.includes('T') && !dateStr.includes('Z') && !dateStr.includes('+')) {
    const timeAdded = dateStr.includes(' ') ? dateStr : dateStr + ' 00:00:00';
    const isoStr = timeAdded.replace(' ', 'T') + '+07:00';
    d = new Date(isoStr);
  } else {
    d = new Date(dateStr);
  }
  const bkkString = d.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Bangkok',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const [h, m] = bkkString.split(':').map(Number);
  return { hour: h, minute: m };
};

const isTimeInRange = (dateStr, startStr, endStr) => {
  const start = parseTimeDot(startStr || '00.00');
  const end = parseTimeDot(endStr || '23.59');
  
  const { hour, minute } = getBangkokTimeComponents(dateStr);
  const timeVal = hour * 60 + minute;
  
  const startVal = start.hour * 60 + start.minute;
  const endVal = end.hour * 60 + end.minute;
  
  if (startVal <= endVal) {
    return timeVal >= startVal && timeVal <= endVal;
  } else {
    return timeVal >= startVal || timeVal <= endVal;
  }
};

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
const cashDrawerSessions = ref([]);
const cashDrawerLoading = ref(false);
const showAuditModal = ref(false);
const activeAuditSession = ref(null);
const actualCashInput = ref('');
const auditNote = ref('');

const showOpeningCashModal = ref(false);
const activeOpeningSession = ref(null);
const openingCashInput = ref('');

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
  if (!isAdminUser.value) return;
  cashDrawerLoading.value = true;
  try {
    const params = { branch_id: selectedBranchId.value };
    if (periodMode.value === 'daily') {
      params.start_date = selectedDate.value;
      params.end_date = selectedDate.value;
    } else if (periodMode.value === 'monthly') {
      const [year, month] = selectedMonth.value.split('-');
      params.start_date = `${year}-${month}-01`;
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      params.end_date = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    } else if (periodMode.value === 'yearly') {
      params.start_date = `${selectedYear.value}-01-01`;
      params.end_date = `${selectedYear.value}-12-31`;
    }

    const res = await api.cashDrawers.getSummary(params);
    if (res.success) {
      cashDrawerSessions.value = res.data || [];
    }
  } catch (err) {
    ui.error(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลสรุปยอดเงินสด');
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
  if (actualCashInput.value === '' || actualCashInput.value === null || actualCashInput.value < 0) {
    ui.error('กรุณาระบุจำนวนเงินนับได้จริงที่ถูกต้อง');
    return;
  }

  try {
    const res = await api.cashDrawers.audit({
      session_id: activeAuditSession.value.id,
      session_date: activeAuditSession.value.session_date,
      actual_cash: Number(actualCashInput.value),
      note: auditNote.value,
      branch_id: selectedBranchId.value
    });

    if (res.success) {
      ui.success('บันทึกผลการตรวจสอบเงินสดสำเร็จ');
      showAuditModal.value = false;
      await fetchCashDrawerSummary();
    }
  } catch (err) {
    ui.error(err.message || 'เกิดข้อผิดพลาดในการบันทึกผลตรวจสอบ');
  }
};

const openOpeningCashModal = (session) => {
  activeOpeningSession.value = session;
  openingCashInput.value = session.opening_cash || '';
  showOpeningCashModal.value = true;
};

const submitOpeningCash = async () => {
  if (openingCashInput.value === '' || openingCashInput.value === null || openingCashInput.value < 0) {
    ui.error('กรุณาระบุจำนวนเงินทอนตั้งต้นที่ถูกต้อง');
    return;
  }

  try {
    const res = await api.cashDrawers.saveOpeningCash({
      session_id: activeOpeningSession.value.id,
      session_date: activeOpeningSession.value.session_date,
      opening_cash: Number(openingCashInput.value),
      branch_id: selectedBranchId.value
    });

    if (res.success) {
      ui.success('บันทึกยอดเงินทอนตั้งต้นสำเร็จ');
      showOpeningCashModal.value = false;
      await fetchCashDrawerSummary();
    }
  } catch (err) {
    ui.error(err.message || 'เกิดข้อผิดพลาดในการบันทึกยอดเงินทอน');
  }
};

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
  
  if (store.reportTopItems && topItemsDays.value === 7) {
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
    list.push({
      id: e.id,
      created_at: e.created_at,
      timestamp: new Date(e.created_at).getTime(),
      name: e.note || getCategoryLabel(e.category),
      income: 0,
      expense: e.amount || 0,
      type: 'expense'
    });
  });

  list.sort((a, b) => a.timestamp - b.timestamp);

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
  } else if (newVal === 'stock_history') {
    loadStockHistoryLogs();
  }
});

watch(historyStatusFilter, () => {
  historyCurrentPage.value = 1;
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
const setTopItemsDays = (days) => {
  topItemsDays.value = days;
  loadTopItems();
};
const expenses = ref([]);
const activityLogs = ref([]);
const filterAction = ref('all');

const filteredActivityLogs = computed(() => {
  // Filter out create_order entirely to prevent duplicate count & confusion
  let list = activityLogs.value.filter(log => log.action !== 'create_order');
  
  if (filterAction.value !== 'all') {
    list = list.filter(log => {
      const act = log.action;
      if (filterAction.value === 'login') return act === 'login';
      if (filterAction.value === 'sales') return act === 'complete_order';
      if (filterAction.value === 'cancel') return act === 'cancel_order';
      if (filterAction.value === 'expenses') return act === 'log_expense' || act === 'delete_expense';
      if (filterAction.value === 'stock') return act === 'adjust_stock' || act === 'record_waste';
      if (filterAction.value === 'credit') return act === 'staff_credit';
      if (filterAction.value === 'cash_drawer') return act === 'cash_opening_set' || act === 'cash_audit' || act === 'setting_change';
      return true;
    });
  }

  // Filter by activityStaffFilter
  if (activityStaffFilter.value !== 'all') {
    list = list.filter(log => log.staff_name === activityStaffFilter.value);
  }

  // Filter by time range if periodMode === 'daily'
  const isTimeFilterActive = customStartTime.value !== '00.00' || customEndTime.value !== '23.59';
  if (periodMode.value === 'daily' && isTimeFilterActive) {
    list = list.filter(log => isTimeInRange(log.created_at, customStartTime.value, customEndTime.value));
  }

  return list;
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
const expenseForm = ref({
  amount: null,
  category: 'raw_chicken',
  note: '',
  payment_method: 'transfer'
});

const totalExpenses = computed(() => expenses.value.reduce((sum, e) => sum + (e.amount || 0), 0));

// Ledger States
const ledgerTransactions = ref([]);
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
const dailyOrdersCurrentPage = ref(1);
const dailyOrdersPerPage = 15;
const totalDailyOrdersPages = computed(() => {
  const count = (dailyReport.value.orders || []).length;
  return Math.ceil(count / dailyOrdersPerPage) || 1;
});
const paginatedDailyReportOrders = computed(() => {
  const orders = dailyReport.value.orders || [];
  const start = (dailyOrdersCurrentPage.value - 1) * dailyOrdersPerPage;
  const end = start + dailyOrdersPerPage;
  return orders.slice(start, end);
});

// Pagination States for Ledger Transactions
const ledgerCurrentPage = ref(1);
const ledgerPerPage = 15;
const totalLedgerPages = computed(() => {
  const count = filteredLedgerTransactions.value.length;
  return Math.ceil(count / ledgerPerPage) || 1;
});
const paginatedLedgerTransactions = computed(() => {
  const start = (ledgerCurrentPage.value - 1) * ledgerPerPage;
  const end = start + ledgerPerPage;
  return filteredLedgerTransactions.value.slice(start, end);
});

// Pagination States for Activity Logs
const activityCurrentPage = ref(1);
const activityPerPage = 15;
const totalActivityPages = computed(() => {
  const count = filteredActivityLogs.value.length;
  return Math.ceil(count / activityPerPage) || 1;
});
const paginatedActivityLogs = computed(() => {
  const start = (activityCurrentPage.value - 1) * activityPerPage;
  const end = start + activityPerPage;
  return filteredActivityLogs.value.slice(start, end);
});

// Pagination States for Stock Logs
const stockLogsCurrentPage = ref(1);
const stockLogsPerPage = 15;
const stockHistoryLogs = ref([]);
const stockHistoryLoading = ref(false);

const filteredStockLogs = computed(() => {
  let list = stockHistoryLogs.value;
  const isTimeFilterActive = customStartTime.value !== '00.00' || customEndTime.value !== '23.59';
  if (periodMode.value === 'daily' && isTimeFilterActive) {
    list = list.filter(log => isTimeInRange(log.created_at, customStartTime.value, customEndTime.value));
  }
  return list;
});

const totalStockLogsPages = computed(() => {
  const count = filteredStockLogs.value.length;
  return Math.ceil(count / stockLogsPerPage) || 1;
});
const paginatedStockLogs = computed(() => {
  const start = (stockLogsCurrentPage.value - 1) * stockLogsPerPage;
  const end = start + stockLogsPerPage;
  return filteredStockLogs.value.slice(start, end);
});

const loadStockHistoryLogs = async () => {
  if (!selectedReportsStockItemId.value) return;
  stockHistoryLoading.value = true;
  try {
    const params = {};
    if (periodMode.value === 'daily') {
      params.date = selectedDate.value;
    } else if (periodMode.value === 'monthly') {
      params.month = selectedMonth.value;
    } else {
      params.year = selectedYear.value;
    }
    const res = await api.stock.getLogs(selectedReportsStockItemId.value, params);
    stockHistoryLogs.value = res.data?.logs || res.data || res || [];
  } catch (e) {
    console.error(e);
    ui.showToast('ไม่สามารถดึงข้อมูลประวัติสต็อกได้', 'error');
  } finally {
    stockHistoryLoading.value = false;
  }
};

const selectReportsStockItem = (item) => {
  selectedReportsStockItemId.value = item.id;
  isStockItemDropdownOpen.value = false;
  loadStockHistoryLogs();
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

const getStockReasonIconClass = (reason) => {
  const map = {
    'sale': 'fa-solid fa-cart-shopping',
    'restock': 'fa-solid fa-plus',
    'adjustment': 'fa-solid fa-wrench',
    'waste': 'fa-solid fa-trash-can',
    'cancel_restore': 'fa-solid fa-rotate-left',
    'staff_benefit': 'fa-solid fa-utensils',
    'fry': 'fa-solid fa-fire'
  };
  return map[reason] || 'fa-solid fa-circle-info';
};

// Watch stockItems list to default to "ไส้กรอกดอกแดง"
watch(reportsStockItems, (newVal) => {
  if (newVal.length > 0 && selectedReportsStockItemId.value === null) {
    const defaultItem = newVal.find(item => item.name.includes('ไส้กรอกดอกแดง'));
    if (defaultItem) {
      selectedReportsStockItemId.value = defaultItem.id;
    } else {
      selectedReportsStockItemId.value = newVal[0].id;
    }
  }
}, { immediate: true });

// Refetch stock history when item or date changes
watch(selectedReportsStockItemId, () => {
  stockLogsCurrentPage.value = 1;
  loadStockHistoryLogs();
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
const isExpenseCategoryDropdownOpen = ref(false);
const selectedExpenseCategoryLabel = computed(() => {
  const categoryLabels = {
    raw_chicken: 'ไก่สด',
    meatballs: 'ลูกชิ้น',
    salapao: 'ซาลาเปา',
    fuel_oil: 'น้ำมัน',
    gas_lpg: 'แก๊ส',
    salary: 'เงินเดือน',
    utility_bills: 'ค่าไฟ/น้ำ',
    packaging: 'บรรจุภัณฑ์/ถุง',
    debt: 'รายจ่าย - หนี้',
    other: 'อื่นๆ',
    raw_materials: 'วัตถุดิบ (เดิม)',
    gas_fuel: 'แก๊ส/น้ำมัน (เดิม)'
  };
  return categoryLabels[expenseForm.value.category] || 'เลือกหมวดหมู่...';
});
const getExpenseCategoryIcon = (cat) => {
  const map = {
    raw_chicken: 'fa-solid fa-drumstick-bite',
    meatballs: 'fa-solid fa-circle',
    salapao: 'fa-solid fa-cookie',
    fuel_oil: 'fa-solid fa-gas-pump',
    gas_lpg: 'fa-solid fa-fire',
    salary: 'fa-solid fa-hand-holding-dollar',
    utility_bills: 'fa-solid fa-bolt',
    packaging: 'fa-solid fa-box',
    debt: 'fa-solid fa-file-invoice-dollar',
    other: 'fa-solid fa-paperclip',
    raw_materials: 'fa-solid fa-drumstick-bite',
    gas_fuel: 'fa-solid fa-gas-pump'
  };
  return map[cat] || 'fa-solid fa-folder';
};
const selectExpenseCategory = (cat) => {
  expenseForm.value.category = cat;
  isExpenseCategoryDropdownOpen.value = false;
};

const isExpensePaymentMethodDropdownOpen = ref(false);
const selectExpensePaymentMethod = (method) => {
  expenseForm.value.payment_method = method;
  isExpensePaymentMethodDropdownOpen.value = false;
};

const isFilterActionDropdownOpen = ref(false);
const selectedFilterActionLabel = computed(() => {
  const filterLabels = {
    all: 'ทั้งหมด',
    login: 'การลงชื่อเข้าใช้งาน (Login)',
    sales: 'การขาย / ออกบิล (Sales)',
    cancel: 'การยกเลิกบิล (Void)',
    expenses: 'บันทึกค่าใช้จ่าย (Expenses)',
    stock: 'จัดการสต็อก / ของเสีย (Stock & Waste)',
    credit: 'เครดิตพนักงาน (Staff Credit)',
    cash_drawer: 'การจัดการลิ้นชักเงินสด (Cash Drawer)'
  };
  return filterLabels[filterAction.value] || 'ทั้งหมด';
});
const getFilterActionIcon = (action) => {
  const map = {
    all: 'fa-solid fa-folder-open',
    login: 'fa-solid fa-key',
    sales: 'fa-solid fa-cart-shopping',
    cancel: 'fa-solid fa-ban',
    expenses: 'fa-solid fa-wallet',
    stock: 'fa-solid fa-boxes-stacked',
    credit: 'fa-solid fa-user-check',
    cash_drawer: 'fa-solid fa-cash-register'
  };
  return map[action] || 'fa-solid fa-folder';
};
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

// Custom dropdowns for Branch and Year filter
const isBranchDropdownOpen = ref(false);
const isYearDropdownOpen = ref(false);
const isMonthDropdownOpen = ref(false);
const isDateDropdownOpen = ref(false);

const monthPickerYear = ref(new Date().getFullYear());
const datePickerYear = ref(new Date().getFullYear());
const datePickerMonth = ref(new Date().getMonth() + 1);

const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

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

const selectedYearLabel = computed(() => `ปี ${selectedYear.value}`);

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
    return `ปี ${selectedYear.value}`;
  }
});

const toggleBranchDropdown = () => {
  const current = isBranchDropdownOpen.value;
  closeReportsDropdowns();
  isBranchDropdownOpen.value = !current;
};

const toggleYearDropdown = () => {
  const current = isYearDropdownOpen.value;
  closeReportsDropdowns();
  isYearDropdownOpen.value = !current;
};

const toggleMonthDropdown = () => {
  const current = isMonthDropdownOpen.value;
  closeReportsDropdowns();
  isMonthDropdownOpen.value = !current;
  if (isMonthDropdownOpen.value) {
    if (selectedMonth.value) {
      monthPickerYear.value = Number(selectedMonth.value.split('-')[0]);
    } else {
      monthPickerYear.value = new Date().getFullYear();
    }
  }
};

const toggleDateDropdown = () => {
  const current = isDateDropdownOpen.value;
  closeReportsDropdowns();
  isDateDropdownOpen.value = !current;
  if (isDateDropdownOpen.value) {
    if (selectedDate.value) {
      const [y, m] = selectedDate.value.split('-');
      datePickerYear.value = Number(y);
      datePickerMonth.value = Number(m);
    } else {
      const today = new Date();
      datePickerYear.value = today.getFullYear();
      datePickerMonth.value = today.getMonth() + 1;
    }
  }
};

const isMonthPickerSelected = (m) => {
  if (!selectedMonth.value) return false;
  const [y, mm] = selectedMonth.value.split('-');
  return monthPickerYear.value === Number(y) && m === Number(mm);
};

const selectMonthPicker = (m) => {
  selectedMonth.value = `${monthPickerYear.value}-${String(m).padStart(2, '0')}`;
  isMonthDropdownOpen.value = false;
  loadReportData();
};

const adjustMonthPickerYear = (amount) => {
  monthPickerYear.value += amount;
};

const datePickerMonthName = computed(() => {
  return thaiMonths[datePickerMonth.value - 1] || '';
});

const datePickerDaysCount = computed(() => {
  return new Date(datePickerYear.value, datePickerMonth.value, 0).getDate();
});

const datePickerStartOffset = computed(() => {
  return new Date(datePickerYear.value, datePickerMonth.value - 1, 1).getDay();
});

const isDatePickerSelected = (day) => {
  if (!selectedDate.value) return false;
  const [y, m, d] = selectedDate.value.split('-');
  return datePickerYear.value === Number(y) &&
         datePickerMonth.value === Number(m) &&
         day === Number(d);
};

const selectDatePickerDay = (day) => {
  selectedDate.value = `${datePickerYear.value}-${String(datePickerMonth.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  isDateDropdownOpen.value = false;
  loadReportData();
};

const adjustDatePickerMonth = (amount) => {
  let m = datePickerMonth.value + amount;
  let y = datePickerYear.value;
  if (m < 1) {
    m = 12;
    y -= 1;
  } else if (m > 12) {
    m = 1;
    y += 1;
  }
  datePickerMonth.value = m;
  datePickerYear.value = y;
};

const selectBranch = (branchId) => {
  selectedBranchId.value = branchId;
  isBranchDropdownOpen.value = false;
  onBranchChange();
};

const selectYear = (y) => {
  selectedYear.value = String(y);
  isYearDropdownOpen.value = false;
  loadReportData();
};

const closeReportsDropdowns = () => {
  isExpenseCategoryDropdownOpen.value = false;
  isExpensePaymentMethodDropdownOpen.value = false;
  isFilterActionDropdownOpen.value = false;
  isHistoryStatusDropdownOpen.value = false;
  isBranchDropdownOpen.value = false;
  isYearDropdownOpen.value = false;
  isMonthDropdownOpen.value = false;
  isDateDropdownOpen.value = false;
  isHistoryStaffDropdownOpen.value = false;
  isHistoryPaymentDropdownOpen.value = false;
  isActivityStaffDropdownOpen.value = false;
  isStockItemDropdownOpen.value = false;
};

const loadMonthlyLedger = async () => {
  if (isUsingDefaultFilters() && store.reportsLoaded && store.reportsBranchId === selectedBranchId.value) {
    applyDataFromStore();
    return;
  }
  ledgerLoading.value = true;
  try {
    const params = { status: 'completed', branch_id: selectedBranchId.value };
    const expenseParams = { branch_id: selectedBranchId.value };

    if (periodMode.value === 'daily') {
      params.date = selectedDate.value;
      expenseParams.date = selectedDate.value;
    } else if (periodMode.value === 'monthly') {
      params.month = selectedMonth.value;
      expenseParams.month = selectedMonth.value;
    } else {
      params.year = selectedYear.value;
      expenseParams.year = selectedYear.value;
    }

    const [ordersRes, expensesRes] = await Promise.all([
      api.orders.getAll(params),
      api.expenses.get(expenseParams)
    ]);
    const periodOrders = ordersRes.success ? (ordersRes.data || []) : [];
    const periodExpenses = expensesRes.success ? (expensesRes.data || []) : [];

    const list = [];

    periodOrders.forEach(o => {
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

    periodExpenses.forEach(e => {
      const pmLabel = e.payment_method === 'transfer' ? 'เงินโอน' : 'เงินสด';
      list.push({
        id: e.id,
        created_at: e.created_at,
        timestamp: new Date(e.created_at).getTime(),
        name: `${e.note || getCategoryLabel(e.category)} (${pmLabel})`,
        income: 0,
        expense: e.amount || 0,
        type: 'expense'
      });
    });

    list.sort((a, b) => a.timestamp - b.timestamp);

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
  } catch (e) {
    console.error('❌ Failed to load ledger:', e);
    ui.showToast('ไม่สามารถดึงข้อมูลบัญชีรายรับ-รายจ่ายได้', 'error');
  } finally {
    ledgerLoading.value = false;
  }
};

// ── Data Loading ──

const loadReportSummary = async () => {
  if (isUsingDefaultFilters() && store.reportsLoaded && store.reportsBranchId === selectedBranchId.value) {
    applyDataFromStore();
    return;
  }
  try {
    const res = await api.reports.summary(selectedBranchId.value);
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
    if (res.success) {
      expenses.value = res.data || [];
    }
  } catch (e) {
    console.warn(e);
  }
};

const loadActivityLogsForPeriod = async () => {
  if (isUsingDefaultFilters() && store.reportsLoaded && store.reportsBranchId === selectedBranchId.value) {
    applyDataFromStore();
    return;
  }
  try {
    let res;
    const params = { branch_id: selectedBranchId.value, limit: 1000 };
    if (periodMode.value === 'daily') {
      params.date = selectedDate.value;
    } else if (periodMode.value === 'monthly') {
      params.month = selectedMonth.value;
    } else {
      params.year = selectedYear.value;
    }
    res = await api.activities.get(params);
    if (res.success) {
      activityLogs.value = res.data || [];
    }
  } catch (e) {
    console.warn(e);
  }
};

const loadOrderHistory = async () => {
  if (isUsingDefaultFilters() && store.reportsLoaded && store.reportsBranchId === selectedBranchId.value) {
    applyDataFromStore();
    return;
  }
  try {
    const params = {
      limit: 1000,
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
    if (res.success) {
      historyOrders.value = res.data || [];
    } else {
      historyOrders.value = [];
    }
  } catch (e) {
    console.error('❌ Failed to load order history:', e);
    ui.showToast('ไม่สามารถดึงข้อมูลประวัติออเดอร์ได้', 'error');
  }
};

const loadReportData = async () => {
  expandedOrderId.value = null;
  expandedItems.value = [];
  dailyOrdersCurrentPage.value = 1;
  ledgerCurrentPage.value = 1;
  activityCurrentPage.value = 1;

  // Check if we can use store cache
  if (isUsingDefaultFilters() && store.reportsLoaded && store.reportsBranchId === selectedBranchId.value) {
    applyDataFromStore();
    loading.value = false;
    
    if (isAdmin() && activeTab.value === 'cash_audit') {
      fetchCashDrawerSummary();
    }
    
    // Silent background fetch to update store cache
    store.fetchReports(selectedBranchId.value, false).then(() => {
      if (isUsingDefaultFilters() && store.reportsBranchId === selectedBranchId.value) {
        applyDataFromStore();
        if (isAdmin() && activeTab.value === 'cash_audit') {
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
    promises.push(loadMainReport());

    // Promise 2: Admin only data loads
    if (isAdmin()) {
      promises.push(loadExpensesForPeriod());
      promises.push(loadActivityLogsForPeriod());
      promises.push(loadMonthlyLedger());
      if (activeTab.value === 'cash_audit') {
        promises.push(fetchCashDrawerSummary());
      }
      if (activeTab.value === 'stock_history') {
        promises.push(loadStockHistoryLogs());
      }
    }

    // Promise 3: Order history
    promises.push(loadOrderHistory());

    // Execute all concurrently!
    await Promise.all(promises);
  } catch (e) {
    console.error(e);
    ui.showToast('ไม่สามารถดึงข้อมูลรายงานได้', 'error');
  } finally {
    loading.value = false;
  }
};

const loadTopItems = async () => {
  if (topItemsDays.value === 7 && isUsingDefaultFilters() && store.reportsLoaded && store.reportsBranchId === selectedBranchId.value) {
    applyDataFromStore();
    return;
  }
  try {
    const res = await api.reports.topItems(topItemsDays.value, selectedBranchId.value);
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

const getPopularityPercentage = (qty, maxQty) => {
  if (!maxQty) return 0;
  return Math.round((qty / maxQty) * 100);
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

const handleVoidOrder = async () => {
  if (!voidOrder.value) return;
  const finalReason = voidReason.value === 'custom' ? voidCustomReason.value.trim() : voidReason.value;
  if (!finalReason) return;

  ui.showLoading();
  try {
    const res = await api.orders.cancel(voidOrder.value.id, finalReason);
    if (res.success) {
      ui.showToast(`ยกเลิกบิล #${voidOrder.value.order_number} สำเร็จ`, 'success');
      showVoidModal.value = false;
      store.clearReportsCache(); // Clear store cache!
      loadReportData();
      if (isAdmin()) {
        loadReportSummary();
      }
    }
  } catch (e) {
    ui.showToast('ยกเลิกบิลไม่สำเร็จ: ' + e.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

const handleAddExpense = async () => {
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
      loadExpensesForPeriod();
      loadActivityLogsForPeriod();
      loadMonthlyLedger();
    }
  } catch (e) {
    ui.showToast('บันทึกค่าใช้จ่ายไม่สำเร็จ: ' + e.message, 'error');
  } finally {
    ui.hideLoading();
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
      loadExpensesForPeriod();
      loadActivityLogsForPeriod();
      loadMonthlyLedger();
    }
  } catch (e) {
    ui.showToast('ลบค่าใช้จ่ายไม่สำเร็จ: ' + e.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

// ── Helpers ──

const setPeriodMode = (mode) => {
  periodMode.value = mode;
  if (!selectedDate.value) selectedDate.value = getToday();
  if (!selectedMonth.value) selectedMonth.value = getToday().substring(0, 7);
  if (!selectedYear.value) selectedYear.value = getToday().substring(0, 4);
  loadReportData();
};

const getCategoryLabel = (cat) => {
  const map = {
    'raw_chicken': 'ไก่สด',
    'meatballs': 'ลูกชิ้น',
    'salapao': 'ซาลาเปา',
    'fuel_oil': 'น้ำมัน',
    'gas_lpg': 'แก๊ส',
    'salary': 'เงินเดือน',
    'utility_bills': 'ค่าไฟ/น้ำ',
    'packaging': 'บรรจุภัณฑ์',
    'debt': 'หนี้',
    'other': 'อื่นๆ',
    'raw_materials': 'วัตถุดิบ',
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
    'adjust_stock': 'fa-solid fa-boxes-stacked text-primary',
    'record_waste': 'fa-solid fa-trash-can text-danger',
    'staff_credit': 'fa-solid fa-user-check text-primary',
    'log_expense': 'fa-solid fa-wallet text-danger',
    'delete_expense': 'fa-solid fa-trash-can text-danger',
    'cash_opening_set': 'fa-solid fa-cash-register text-success',
    'cash_audit': 'fa-solid fa-cash-register text-primary',
    'setting_change': 'fa-solid fa-gear text-neutral'
  };
  return map[action] || 'fa-solid fa-bookmark text-neutral';
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
        if (res.success) {
          branches.value = res.data || [];
        }
      })
      .catch(e => console.warn('Failed to load branches:', e));

    // Load staff/users list for filters (non-blocking)
    store.fetchSettingsData(selectedBranchId.value)
      .catch(e => console.warn('Failed to load settings:', e));

    // Load summary and top items (non-blocking)
    loadReportSummary();
    loadTopItems();

    // Fetch stock items for stock logs (non-blocking)
    store.fetchStock()
      .catch(e => console.warn('Failed to load stock:', e));
  }

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

const exportSalesCSV = () => {
  const headers = ['เลขที่บิล', 'ยอดสุทธิ (บาท)', 'วิธีชำระเงิน', 'พนักงาน', 'สาขา', 'สถานะ', 'วันที่-เวลา', 'ซอส/ผง/น้ำจิ้มที่เลือก', 'หมายเหตุ'];
  const rows = dailyReport.value.orders.map(o => {
    let modsText = '';
    const modsStr = o.modifiers || o.free_modifiers;
    if (modsStr) {
      try {
        const parsed = JSON.parse(modsStr);
        if (Array.isArray(parsed)) {
          modsText = parsed.map(m => m.name).join(' | ');
        }
      } catch (e) {}
    }
    return [
      o.order_number,
      o.total,
      o.payment_method === 'cash' ? 'เงินสด' : (o.payment_method === 'qr' || o.payment_method === 'promptpay') ? 'QR Code' : o.payment_method === 'gov' ? 'โครงการของรัฐ' : o.payment_method === 'delivery' ? 'เดลิเวอรี' : 'รอชำระ',
      o.staff_name || 'ระบบ',
      o.branch_name || 'ไม่ระบุ',
      o.status === 'completed' ? 'สำเร็จ' : o.status === 'cancelled' ? 'ยกเลิก' : 'รอชำระ',
      formatDate(o.created_at) + ' ' + formatTime(o.created_at),
      modsText,
      o.note || ''
    ];
  });
  
  const periodStr = periodMode.value === 'daily' ? selectedDate.value : periodMode.value === 'monthly' ? selectedMonth.value : selectedYear.value;
  exportToCSV(headers, rows, `sales_report_${periodStr}.csv`);
};

const exportHistoryOrdersCSV = () => {
  const headers = ['เลขที่บิล', 'ยอดสุทธิ (บาท)', 'วิธีชำระเงิน', 'พนักงาน', 'สาขา', 'สถานะ', 'วันที่-เวลา', 'ซอส/ผง/น้ำจิ้มที่เลือก', 'หมายเหตุ'];
  const rows = historyOrders.value.map(o => {
    let modsText = '';
    const modsStr = o.modifiers || o.free_modifiers;
    if (modsStr) {
      try {
        const parsed = JSON.parse(modsStr);
        if (Array.isArray(parsed)) {
          modsText = parsed.map(m => m.name).join(' | ');
        }
      } catch (e) {}
    }
    return [
      o.order_number,
      o.total,
      o.payment_method === 'cash' ? 'เงินสด' : (o.payment_method === 'qr' || o.payment_method === 'promptpay') ? 'QR Code' : o.payment_method === 'gov' ? 'โครงการของรัฐ' : o.payment_method === 'delivery' ? 'เดลิเวอรี' : 'รอชำระ',
      o.staff_name || 'ระบบ',
      o.branch_name || 'ไม่ระบุ',
      o.status === 'completed' ? 'สำเร็จ' : o.status === 'cancelled' ? 'ยกเลิก' : 'รอชำระ',
      formatDate(o.created_at) + ' ' + formatTime(o.created_at),
      modsText,
      o.note || ''
    ];
  });
  
  const periodStr = periodMode.value === 'daily' ? selectedDate.value : periodMode.value === 'monthly' ? selectedMonth.value : selectedYear.value;
  exportToCSV(headers, rows, `order_history_${periodStr}.csv`);
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

@media (max-width: 768px) {
  .expense-form-grid {
    grid-template-columns: 1fr;
    gap: var(--space-xs);
  }
}

/* --- Ledger Summary Grid --- */
.ledger-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

@media (max-width: 768px) {
  .ledger-summary-grid {
    grid-template-columns: 1fr;
    gap: var(--space-sm);
  }
}

/* --- Ledger Mobile Card --- */
.ledger-mobile-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  transition: all var(--transition-base);
  border-left: 4px solid var(--text-tertiary);
}
.ledger-mobile-card.income {
  border-left-color: var(--success);
}
.ledger-mobile-card.expense {
  border-left-color: var(--danger);
}

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
  max-height: 480px;
  overflow-y: auto;
  padding-right: 4px;
}

.activity-log-item {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
}

.activity-log-item:hover {
  background: var(--card-bg-hover);
  border-color: var(--border-color-light);
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
  font-size: 1.15rem;
  background: rgba(139, 3, 19, 0.04);
}

/* Log badge colors */
.log-badge.login { background: rgba(255, 171, 43, 0.1); }
.log-badge.create_order, .log-badge.complete_order { background: rgba(42, 157, 143, 0.1); }
.log-badge.cancel_order { background: rgba(173, 40, 30, 0.1); }
.log-badge.log_expense, .log-badge.delete_expense { background: rgba(173, 40, 30, 0.08); }
.log-badge.adjust_stock, .log-badge.record_waste { background: rgba(139, 3, 19, 0.06); }
.log-badge.staff_credit { background: rgba(139, 3, 19, 0.08); }
.log-badge.cash_opening_set, .log-badge.cash_audit { background: rgba(42, 157, 143, 0.1); }

.log-content-wrapper {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.log-details {
  font-size: var(--font-sm);
  color: var(--text-primary);
  font-weight: 500;
  line-height: 1.4;
  word-break: break-word;
}

.log-meta {
  display: flex;
  gap: var(--space-md);
  font-size: 10px;
  color: var(--text-tertiary);
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

/* --- Top Selling Menus Premium Styles --- */
.top-item-card-redesign {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.45);
  transition: all var(--transition-base);
  margin-bottom: var(--space-xs);
}

.top-item-card-redesign:hover {
  background: rgba(255, 255, 255, 0.75);
  transform: translateX(4px);
}

.rank-1-card {
  border: 1px solid #ffab2b;
  box-shadow: 0 2px 10px rgba(255, 171, 43, 0.08);
}
.rank-1-card:hover {
  border-color: #ffab2b !important;
  box-shadow: 0 4px 16px rgba(255, 171, 43, 0.15);
}

.rank-2-card {
  border: 1px solid #bc9e88;
  box-shadow: 0 2px 8px rgba(188, 158, 136, 0.05);
}
.rank-2-card:hover {
  border-color: #bc9e88 !important;
  box-shadow: 0 4px 12px rgba(188, 158, 136, 0.1);
}

.rank-3-card {
  border: 1px solid #e9c46a;
  box-shadow: 0 2px 8px rgba(233, 196, 106, 0.05);
}
.rank-3-card:hover {
  border-color: #e9c46a !important;
  box-shadow: 0 4px 12px rgba(233, 196, 106, 0.1);
}

.rank-other-card {
  border: 1px solid var(--border-color);
}
.rank-other-card:hover {
  border-color: var(--primary-light) !important;
  box-shadow: var(--shadow-sm);
}

/* Badge Circle Icon */
.rank-badge-circle {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.95rem;
  flex-shrink: 0;
}

.rank-1-badge {
  background: #ffe066;
  color: #8b0313;
}
.rank-2-badge {
  background: rgba(188, 158, 136, 0.2);
  color: #6e4e37;
}
.rank-3-badge {
  background: rgba(233, 196, 106, 0.2);
  color: #6e4e37;
}
.rank-other-badge {
  background: rgba(110, 78, 55, 0.08);
  border: 1px solid rgba(110, 78, 55, 0.12);
  color: var(--text-secondary);
}

/* Middle Layout */
.card-info-middle {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
  text-align: left;
}

.item-name-text {
  font-size: var(--font-base);
  font-weight: 700;
  color: var(--text-primary);
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.badge-type {
  font-size: 9px;
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

/* Right Layout */
.card-sales-right {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex-shrink: 0;
}

.qty-column {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  min-width: 50px;
}

.qty-num {
  font-size: var(--font-sm);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.qty-unit {
  font-size: 9px;
  color: var(--text-secondary);
  font-weight: 500;
}

.sales-pill {
  background: rgba(139, 3, 19, 0.05);
  border: 1px solid rgba(139, 3, 19, 0.12);
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: 11px;
  color: var(--primary);
  font-weight: 700;
  min-width: 80px;
  text-align: center;
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

.cash-audit-mobile-card {
  background: var(--bg-primary);
  border: 1.5px solid var(--border-color-light);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  transition: all var(--transition-base);
}

.cash-audit-mobile-card:hover {
  border-color: var(--primary-light);
  box-shadow: var(--shadow-md);
}

.cash-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1.5px dashed var(--border-color);
  padding-bottom: var(--space-sm);
}

.cash-card-header .session-date {
  font-size: var(--font-md);
  font-weight: 700;
  color: var(--text-primary);
}

.session-status-badge {
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  white-space: nowrap;
}

.session-status-badge.open {
  background: rgba(255, 149, 0, 0.15);
  color: #cc8000;
  border: 1px solid rgba(255, 149, 0, 0.25);
}

.session-status-badge.closed {
  background: rgba(42, 157, 143, 0.15);
  color: var(--success);
  border: 1px solid rgba(42, 157, 143, 0.25);
}

.cash-card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
}

.cash-card-grid .grid-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  text-align: center;
}

.cash-card-grid .grid-item.full-width {
  grid-column: span 2;
  border-top: 1px solid var(--border-color);
  padding-top: var(--space-sm);
  margin-top: 2px;
}

.cash-card-grid .grid-label {
  font-size: var(--font-xs);
  color: var(--text-secondary);
  font-weight: 600;
}

.cash-card-grid .grid-value {
  font-size: var(--font-base);
  color: var(--text-primary);
  font-weight: 700;
  white-space: nowrap;
}

.cash-card-grid .grid-value.text-success {
  color: var(--success);
}

.cash-card-grid .grid-value.text-danger {
  color: var(--danger);
}

.text-light-italic {
  color: var(--text-muted);
  font-style: italic;
  font-weight: normal !important;
}

.diff-badge {
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-weight: 700;
  font-size: 12px;
  display: inline-block;
  white-space: nowrap;
}

.diff-badge.equal {
  color: var(--success);
  background: rgba(42, 157, 143, 0.15);
  border: 1px solid rgba(42, 157, 143, 0.25);
}

.diff-badge.surplus {
  color: var(--success);
  background: rgba(42, 157, 143, 0.15);
  border: 1px solid rgba(42, 157, 143, 0.25);
}

.diff-badge.deficit {
  color: var(--danger);
  background: rgba(173, 40, 30, 0.12);
  border: 1px solid rgba(173, 40, 30, 0.25);
}

.cash-card-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
}

.cash-card-actions .btn {
  flex: 1;
  min-height: 40px;
  font-size: var(--font-sm);
  font-weight: 700;
  border-radius: var(--radius-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

/* Hint box alert */
.bulk-hint-box {
  font-size: var(--font-base);
  color: var(--text-secondary);
  text-align: left;
  background: rgba(255, 171, 43, 0.06);
  border: 1px solid rgba(255, 171, 43, 0.25);
  border-left: 6px solid var(--accent);
  border-radius: var(--radius-sm);
  padding: var(--space-md) var(--space-lg);
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  line-height: 1.5;
}
.hint-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
  line-height: 1;
  margin-top: 2px;
}
.hint-text {
  flex: 1;
}

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
</style>
