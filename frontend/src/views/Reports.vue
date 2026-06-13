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
    </div>

    <!-- Date selector card (hidden on 'top_menus' tab) -->
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
            
            <input 
              v-if="periodMode === 'daily'"
              type="date" 
              class="form-input reports-filter-control" 
              style="max-width: 200px;" 
              v-model="selectedDate" 
              @change="loadReportData"
            />
            
            <input 
              v-if="periodMode === 'monthly'"
              type="month" 
              class="form-input reports-filter-control" 
              style="max-width: 200px;" 
              v-model="selectedMonth" 
              @change="loadReportData"
            />

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
          <div class="card-title" style="font-size: var(--font-sm);"><i class="fa-solid fa-chart-simple" style="margin-right: 6px;"></i> สรุปยอดวันที่ {{ formatDate(selectedDate) }}</div>
          
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
          <div class="grid grid-3" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:var(--space-sm); font-size:var(--font-xs);">
            <div class="p-xs card" style="background:var(--bg-secondary); border:none;">
              <div style="color:var(--text-secondary); display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-money-bill-wave" style="color: var(--success);"></i> เงินสด</div>
              <div class="font-bold" style="font-size:var(--font-base); margin-top:2px;">
                {{ formatCurrency(dailyReport.cash_sales) }}
              </div>
              <div style="color:var(--text-tertiary);">{{ dailyReport.cash_orders }} บิล</div>
            </div>
            <div class="p-xs card" style="background:var(--bg-secondary); border:none;">
              <div style="color:var(--text-secondary); display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-qrcode" style="color: var(--primary);"></i> QR Code</div>
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
          </div>
        </div>

        <!-- Today's Transaction Logs (ALL ROLES) -->
        <div class="card">
          <div class="flex flex-between align-center mb-md" style="flex-wrap: wrap; gap: var(--space-sm); border-bottom: 1px solid var(--border-color); padding-bottom: var(--space-sm);">
            <div class="card-title" style="font-size: var(--font-sm); margin: 0;"><i class="fa-solid fa-list" style="margin-right: 6px;"></i> รายการบิลประจำวัน</div>
            <button 
              v-if="dailyReport.orders?.length > 0"
              class="btn btn-sm btn-secondary" 
              style="padding: 4px 12px; font-size:12px; min-height:32px; display:inline-flex; align-items:center; gap:4px; border-radius: var(--radius-md);"
              @click="exportSalesCSV"
            >
              <i class="fa-solid fa-file-csv" style="margin-right: 4px;"></i> ส่งออกรายงานยอดขาย (CSV)
            </button>
          </div>
          
          <div v-if="dailyReport.orders?.length === 0" style="font-size:var(--font-sm); color:var(--text-tertiary); text-align:center; padding: var(--space-md);">
            ยังไม่มีรายการขายในวันนี้
          </div>
          <div v-else style="display: flex; flex-direction: column; gap: var(--space-sm);">
            <div 
              v-for="order in dailyReport.orders" 
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
                  <span :class="order.status === 'cancelled' ? 'text-danger' : 'text-accent'">{{ formatCurrency(order.total) }}</span>
                </div>
              </div>
              <div class="flex flex-between" style="font-size:11px; color:var(--text-secondary); margin-top:2px;">
                <span style="display: inline-flex; align-items: center; gap: 4px;">
                  <i :class="order.payment_method === 'cash' ? 'fa-solid fa-money-bill-wave' : order.payment_method === 'qr' ? 'fa-solid fa-qrcode' : order.payment_method === 'gov' ? 'fa-solid fa-landmark' : 'fa-solid fa-hourglass-half'"></i>
                  {{ order.payment_method === 'cash' ? 'เงินสด' : order.payment_method === 'qr' ? 'QR Code' : order.payment_method === 'gov' ? 'โครงการรัฐ' : 'รอชำระ' }}
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
                </div>
                <!-- Void Button (only for completed orders) -->
                <button 
                  v-if="order.status === 'completed'" 
                  class="btn btn-sm" 
                  style="margin-top:var(--space-sm); width:100%; background:rgba(255,59,48,0.1); color:#ff3b30; border:1px solid rgba(255,59,48,0.3); min-height:40px; font-size:var(--font-sm); display: inline-flex; align-items: center; justify-content: center; gap: 4px;"
                  @click.stop="openVoidModal(order)"
                >
                  <i class="fa-solid fa-ban"></i> ยกเลิกบิลนี้ (Void)
                </button>
              </div>
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
            <div class="flex align-center gap-xs">
              <span style="font-size: var(--font-xs); font-weight:bold; color:var(--text-secondary);">สถานะ:</span>
              <div class="custom-select-wrapper" style="width: 140px;" @click.stop>
                <div 
                  class="custom-select-trigger" 
                  :class="{ 'active': isHistoryStatusDropdownOpen }" 
                  @click="isHistoryStatusDropdownOpen = !isHistoryStatusDropdownOpen"
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
                      <i :class="order.payment_method === 'cash' ? 'fa-solid fa-money-bill-wave' : order.payment_method === 'qr' ? 'fa-solid fa-qrcode' : order.payment_method === 'gov' ? 'fa-solid fa-landmark' : 'fa-solid fa-hourglass-half'" style="margin-right: 4px;"></i>
                      {{ order.payment_method === 'cash' ? 'เงินสด' : order.payment_method === 'qr' ? 'QR Code' : order.payment_method === 'gov' ? 'โครงการรัฐ' : 'รอชำระ' }}
                    </td>
                    <td style="padding: var(--space-sm) var(--space-md); text-align: right; font-weight:bold;" :class="order.status === 'cancelled' ? 'text-danger' : 'text-accent'">
                      {{ formatCurrency(order.total) }}
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
                        <i class="fa-solid fa-ban"></i> Void
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
                <span :class="order.status === 'cancelled' ? 'text-danger' : 'text-accent'">{{ formatCurrency(order.total) }}</span>
              </div>
              <div class="flex flex-between" style="font-size:11px; color:var(--text-secondary);">
                <span><i class="fa-solid fa-user" style="margin-right: 2px;"></i> {{ order.staff_name || 'ระบบ' }} | <i class="fa-solid fa-store" style="margin-right: 2px;"></i> {{ order.branch_name || 'ไม่ระบุ' }}</span>
                <span>{{ formatDate(order.created_at) }} {{ formatTime(order.created_at) }}</span>
              </div>
              <div class="flex flex-between align-center mt-xs" style="font-size:11px;">
                <span style="display: inline-flex; align-items: center; gap: 4px;">
                  <i :class="order.payment_method === 'cash' ? 'fa-solid fa-money-bill-wave' : order.payment_method === 'qr' ? 'fa-solid fa-qrcode' : order.payment_method === 'gov' ? 'fa-solid fa-landmark' : 'fa-solid fa-hourglass-half'"></i>
                  {{ order.payment_method === 'cash' ? 'เงินสด' : order.payment_method === 'qr' ? 'QR Code' : order.payment_method === 'gov' ? 'โครงการรัฐ' : 'รอชำระ' }}
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
                  <i class="fa-solid fa-ban"></i> ยกเลิกบิลนี้ (Void)
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
        <div class="card-title" style="font-size: var(--font-sm);"><i class="fa-solid fa-wallet" style="margin-right: 6px;"></i> บันทึกค่าใช้จ่ายประจำวัน (วันที่ {{ formatDate(selectedDate) }})</div>
        
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
                <div v-if="isExpenseCategoryDropdownOpen" class="custom-select-dropdown">
                  <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'raw_materials' }" @click="selectExpenseCategory('raw_materials')"><i class="fa-solid fa-drumstick-bite" style="margin-right: 4px;"></i> วัตถุดิบ</div>
                  <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'gas_fuel' }" @click="selectExpenseCategory('gas_fuel')"><i class="fa-solid fa-gas-pump" style="margin-right: 4px;"></i> แก๊ส/น้ำมัน</div>
                  <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'packaging' }" @click="selectExpenseCategory('packaging')"><i class="fa-solid fa-box" style="margin-right: 4px;"></i> บรรจุภัณฑ์/ถุง</div>
                  <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'other' }" @click="selectExpenseCategory('other')"><i class="fa-solid fa-paperclip" style="margin-right: 4px;"></i> อื่นๆ</div>
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
            <i class="fa-solid fa-book" style="margin-right: 6px;"></i> สมุดบัญชีรายรับ-รายจ่าย (เดือน {{ selectedDate.substring(0, 7) }})
          </div>
          <div style="display:flex; align-items:center; gap:var(--space-sm);">
            <button 
              v-if="ledgerTransactions.length > 0"
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
              {{ formatCurrency(ledgerTransactions.reduce((sum, t) => sum + t.income, 0)) }}
            </div>
          </div>
          <div class="p-xs card" style="background:rgba(173, 40, 30, 0.05); border:none; text-align:center;">
            <div style="color:var(--text-secondary); margin-bottom: 2px; font-size:var(--font-xs);">รายจ่ายรวม</div>
            <div class="font-bold text-danger" style="font-size:var(--font-base);">
              {{ formatCurrency(ledgerTransactions.reduce((sum, t) => sum + t.expense, 0)) }}
            </div>
          </div>
          <div class="p-xs card" style="background:rgba(173, 40, 30, 0.05); border:none; text-align:center;">
            <div style="color:var(--text-secondary); margin-bottom: 2px; font-size:var(--font-xs);">คงเหลือสุทธิ</div>
            <div class="font-bold" style="font-size:var(--font-base); color: var(--text-primary);">
              {{ formatCurrency(ledgerTransactions.reduce((sum, t) => sum + t.income - t.expense, 0)) }}
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
              <tr v-if="ledgerLoading && ledgerTransactions.length === 0">
                <td colspan="6" style="text-align: center; padding: var(--space-xl);">
                  <div class="spinner" style="margin: 0 auto;"></div>
                </td>
              </tr>
              <tr v-else-if="ledgerTransactions.length === 0">
                <td colspan="6" style="text-align: center; padding: var(--space-xl); color: var(--text-tertiary);">
                  ไม่มีรายการธุรกรรมในเดือนนี้
                </td>
              </tr>
              <tr 
                v-else 
                v-for="item in ledgerTransactions" 
                :key="item.type + '-' + item.id" 
                style="border-bottom: 1px solid var(--border-color);"
                class="table-row-hover"
              >
                <td style="width: 15%; padding: var(--space-sm) var(--space-md); vertical-align: middle; white-space:nowrap; font-size:11px; color:var(--text-secondary); text-align: left !important;">
                  {{ formatDate(item.created_at) }}<br/>{{ formatTime(item.created_at) }}
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
          <div v-if="ledgerLoading && ledgerTransactions.length === 0" style="text-align: center; padding: var(--space-xl);">
            <div class="spinner" style="margin: 0 auto;"></div>
          </div>
          <div v-else-if="ledgerTransactions.length === 0" style="text-align: center; padding: var(--space-xl); color: var(--text-tertiary);">
            ไม่มีรายการธุรกรรมในเดือนนี้
          </div>
          <div v-else style="display:flex; flex-direction:column; gap:var(--space-sm);">
            <div 
              v-for="item in ledgerTransactions" 
              :key="item.type + '-' + item.id" 
              class="ledger-mobile-card"
              :class="item.type === 'order' ? 'income' : 'expense'"
            >
              <div class="flex flex-between align-center">
                <span class="font-bold text-primary" style="font-size: var(--font-base);">{{ item.name }}</span>
              </div>
              <div class="flex flex-between align-center mt-xs" style="font-size: 11px; color: var(--text-secondary);">
                <span><i class="fa-solid fa-calendar-days" style="margin-right: 4px;"></i> {{ formatDate(item.created_at) }} {{ formatTime(item.created_at) }}</span>
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
      </div>

      <!-- Tab 3: Top Selling Menus (10 อันดับเมนูขายดีที่สุด) -->
      <div v-if="activeTab === 'top_menus' && isAdminUser" class="card">
        <div class="card-title" style="font-size: var(--font-sm);"><i class="fa-solid fa-fire" style="margin-right: 6px;"></i> 10 อันดับเมนูขายดีที่สุด (7 วันที่ผ่านมา)</div>
        
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
              <span class="font-bold">{{ item.total_qty }} ชิ้น</span> | 
              <span style="font-size:11px; color:var(--text-secondary);">{{ formatCurrency(item.total_sales) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 4: Activity Logs (ประวัติกิจกรรมพนักงาน) -->
      <div v-if="activeTab === 'activity_logs' && isAdminUser" class="card">
        <div class="card-title" style="font-size: var(--font-sm);"><i class="fa-solid fa-user-shield" style="margin-right: 6px;"></i> ประวัติกิจกรรมพนักงาน (วันที่ {{ formatDate(selectedDate) }})</div>
        
        <!-- Filter dropdown -->
        <div class="form-group mb-md">
          <label class="form-label font-bold" style="font-size: var(--font-sm);"><i class="fa-solid fa-magnifying-glass" style="margin-right: 6px;"></i> กรองประเภทกิจกรรม:</label>
          <div class="custom-select-wrapper" @click.stop>
            <div 
              class="custom-select-trigger" 
              :class="{ 'active': isFilterActionDropdownOpen }" 
              @click="isFilterActionDropdownOpen = !isFilterActionDropdownOpen"
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
            </div>
          </div>
        </div>

        <div v-if="filteredActivityLogs.length === 0" style="font-size:var(--font-sm); color:var(--text-tertiary); text-align:center; padding:var(--space-md);">
          ยังไม่มีกิจกรรมที่ตรงตามตัวกรองในวันนี้
        </div>
        <div v-else class="activity-logs-list">
          <div v-for="log in filteredActivityLogs" :key="log.id" class="activity-log-item">
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
      </div>
    </template>

    <!-- Void Order Modal -->
    <div v-if="showVoidModal" class="modal-container active" style="display:flex; align-items:center; justify-content:center; position: fixed; inset:0; z-index:1000;">
      <div class="modal-overlay" @click="showVoidModal = false"></div>
      <div class="modal-content modal-center w-full max-w-sm" style="position:relative; z-index:2;">
        <div class="modal-header">
          <h3><i class="fa-solid fa-ban" style="margin-right: 6px;"></i> ยกเลิกบิล #{{ voidOrder?.order_number }}</h3>
          <button class="modal-close" @click="showVoidModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div style="font-size:var(--font-sm); color:var(--text-secondary); margin-bottom:var(--space-lg); text-align:center;">
            ยอดรวม: <strong class="text-accent">{{ formatCurrency(voidOrder?.total) }}</strong>
          </div>

          <div class="form-label" style="margin-bottom:var(--space-sm);">เลือกเหตุผลการยกเลิก:</div>
          
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
              <i :class="preset.icon"></i> {{ preset.label }}
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
              <i class="fa-solid fa-circle-check"></i> ยืนยันยกเลิกบิล
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
      orders: data.orders || []
    };
  }
  
  if (store.reportTopItems) {
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
  const monthOrders = store.reportMonthlyOrders || [];
  const monthExpenses = store.reportMonthlyExpenses || [];
  const list = [];

  monthOrders.forEach(o => {
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

  monthExpenses.forEach(e => {
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
      runningBalance: running
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

const paginatedHistoryOrders = computed(() => {
  const start = (historyCurrentPage.value - 1) * historyOrdersPerPage;
  const end = start + historyOrdersPerPage;
  return historyOrders.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(historyOrders.value.length / historyOrdersPerPage) || 1;
});

watch(activeTab, (newVal) => {
  if (newVal === 'order_history') {
    loadOrderHistory();
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
  orders: []
});
const topItems = ref([]);
const expenses = ref([]);
const activityLogs = ref([]);
const filterAction = ref('all');

const filteredActivityLogs = computed(() => {
  // Filter out create_order entirely to prevent duplicate count & confusion
  const list = activityLogs.value.filter(log => log.action !== 'create_order');
  if (filterAction.value === 'all') return list;
  return list.filter(log => {
    const act = log.action;
    if (filterAction.value === 'login') return act === 'login';
    if (filterAction.value === 'sales') return act === 'complete_order';
    if (filterAction.value === 'cancel') return act === 'cancel_order';
    if (filterAction.value === 'expenses') return act === 'log_expense' || act === 'delete_expense';
    if (filterAction.value === 'stock') return act === 'adjust_stock' || act === 'record_waste';
    if (filterAction.value === 'credit') return act === 'staff_credit';
    return true;
  });
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
  category: 'raw_materials',
  note: ''
});

const totalExpenses = computed(() => expenses.value.reduce((sum, e) => sum + (e.amount || 0), 0));

// Ledger States
const ledgerTransactions = ref([]);
const ledgerLoading = ref(false);

// Custom dropdowns logic for Reports.vue
const isExpenseCategoryDropdownOpen = ref(false);
const selectedExpenseCategoryLabel = computed(() => {
  const categoryLabels = {
    raw_materials: 'วัตถุดิบ',
    gas_fuel: 'แก๊ส/น้ำมัน',
    packaging: 'บรรจุภัณฑ์/ถุง',
    other: 'อื่นๆ'
  };
  return categoryLabels[expenseForm.value.category] || 'เลือกหมวดหมู่...';
});
const getExpenseCategoryIcon = (cat) => {
  const map = {
    raw_materials: 'fa-solid fa-drumstick-bite',
    gas_fuel: 'fa-solid fa-gas-pump',
    packaging: 'fa-solid fa-box',
    other: 'fa-solid fa-paperclip'
  };
  return map[cat] || 'fa-solid fa-folder';
};
const selectExpenseCategory = (cat) => {
  expenseForm.value.category = cat;
  isExpenseCategoryDropdownOpen.value = false;
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
    credit: 'เครดิตพนักงาน (Staff Credit)'
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
    credit: 'fa-solid fa-user-check'
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

const selectedBranchName = computed(() => {
  if (selectedBranchId.value === null) return 'ทุกสาขา';
  const found = branches.value.find(b => b.id === selectedBranchId.value);
  return found ? found.name : 'ทุกสาขา';
});

const selectedYearLabel = computed(() => `ปี ${selectedYear.value}`);

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
  isFilterActionDropdownOpen.value = false;
  isHistoryStatusDropdownOpen.value = false;
  isBranchDropdownOpen.value = false;
  isYearDropdownOpen.value = false;
};

const loadMonthlyLedger = async () => {
  if (isUsingDefaultFilters() && store.reportsLoaded && store.reportsBranchId === selectedBranchId.value) {
    applyDataFromStore();
    return;
  }
  ledgerLoading.value = true;
  try {
    const monthVal = selectedDate.value.substring(0, 7);
    const ordersRes = await api.orders.getAll({ status: 'completed', month: monthVal, branch_id: selectedBranchId.value });
    const monthOrders = ordersRes.success ? (ordersRes.data || []) : [];

    const expensesRes = await api.expenses.get({ month: monthVal, branch_id: selectedBranchId.value });
    const monthExpenses = expensesRes.success ? (expensesRes.data || []) : [];

    const list = [];

    monthOrders.forEach(o => {
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

    monthExpenses.forEach(e => {
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
        runningBalance: running
      };
    });

    ledgerTransactions.value = computedList.reverse();
  } catch (e) {
    console.error('❌ Failed to load monthly ledger:', e);
    ui.showToast('ไม่สามารถดึงข้อมูลบัญชีรายรับ-รายจ่ายรายเดือนได้', 'error');
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
    const params = { branch_id: selectedBranchId.value };
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

  // Check if we can use store cache
  if (isUsingDefaultFilters() && store.reportsLoaded && store.reportsBranchId === selectedBranchId.value) {
    applyDataFromStore();
    loading.value = false;
    
    // Silent background fetch to update store cache
    store.fetchReports(selectedBranchId.value, false).then(() => {
      if (isUsingDefaultFilters() && store.reportsBranchId === selectedBranchId.value) {
        applyDataFromStore();
      }
    }).catch(e => console.error(e));
    
    return;
  }

  loading.value = true;
  try {
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
        orders: []
      };
    }

    // Load expenses and activity logs (admin only)
    if (isAdmin()) {
      await loadExpensesForPeriod();
      await loadActivityLogsForPeriod();
      await loadMonthlyLedger();
    }

    // Load history orders if currently active
    await loadOrderHistory();
  } catch (e) {
    console.error(e);
    ui.showToast('ไม่สามารถดึงข้อมูลรายงานได้', 'error');
  } finally {
    loading.value = false;
  }
};

const loadTopItems = async () => {
  if (isUsingDefaultFilters() && store.reportsLoaded && store.reportsBranchId === selectedBranchId.value) {
    applyDataFromStore();
    return;
  }
  try {
    const res = await api.reports.topItems(7, selectedBranchId.value);
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

// ── Expense Handlers ──

const handleAddExpense = async () => {
  ui.showLoading();
  try {
    const res = await api.expenses.create({
      amount: expenseForm.value.amount,
      category: expenseForm.value.category,
      note: expenseForm.value.note,
      expense_date: selectedDate.value
    });
    if (res.success) {
      ui.showToast('บันทึกค่าใช้จ่ายสำเร็จ', 'success');
      expenseForm.value = { amount: null, category: 'raw_materials', note: '' };
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
    'raw_materials': 'วัตถุดิบ',
    'gas_fuel': 'แก๊ส/น้ำมัน',
    'packaging': 'บรรจุภัณฑ์',
    'other': 'อื่นๆ'
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
    'delete_expense': 'fa-solid fa-trash-can text-danger'
  };
  return map[action] || 'fa-solid fa-bookmark text-neutral';
};

const onBranchChange = () => {
  loadReportSummary();
  loadTopItems();
  loadMonthlyLedger();
  loadReportData();
};

onMounted(async () => {
  if (isAdmin()) {
    try {
      const res = await api.auth.getBranches();
      if (res.success) {
        branches.value = res.data || [];
      }
    } catch (e) {
      console.warn('Failed to load branches:', e);
    }
    loadReportSummary();
    loadTopItems();
    loadMonthlyLedger();
  }
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
      o.payment_method === 'cash' ? 'เงินสด' : (o.payment_method === 'qr' || o.payment_method === 'promptpay') ? 'QR Code' : o.payment_method === 'gov' ? 'โครงการของรัฐ' : 'รอชำระ',
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
      o.payment_method === 'cash' ? 'เงินสด' : (o.payment_method === 'qr' || o.payment_method === 'promptpay') ? 'QR Code' : o.payment_method === 'gov' ? 'โครงการของรัฐ' : 'รอชำระ',
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
  const rows = ledgerTransactions.value.map(t => [
    formatDate(t.created_at) + ' ' + formatTime(t.created_at),
    t.name,
    t.income > 0 ? t.income : 0,
    t.expense > 0 ? t.expense : 0,
    t.runningBalance
  ]);
  const monthVal = selectedDate.value.substring(0, 7);
  exportToCSV(headers, rows, `ledger_report_${monthVal}.csv`);
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
  grid-template-columns: 150px 180px 1fr auto;
  gap: var(--space-sm);
  align-items: end;
  margin-bottom: var(--space-md);
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
</style>
