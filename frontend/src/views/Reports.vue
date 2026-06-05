<template>
  <div id="reports-page" class="page-enter">
    
    <!-- Tab toggles placed at the very top, styled as category tabs (matching settings) -->
    <div v-if="isAdminUser" class="category-tabs mb-lg">
      <button 
        class="category-tab" 
        :class="{ 'active': activeTab === 'sales' }"
        @click="activeTab = 'sales'"
      >
        📊 ยอดขาย
      </button>
      <button 
        class="category-tab" 
        :class="{ 'active': activeTab === 'expenses' }"
        @click="activeTab = 'expenses'"
      >
        💸 บันทึกค่าใช้จ่ายประจำวัน
      </button>
      <button 
        class="category-tab" 
        :class="{ 'active': activeTab === 'top_menus' }"
        @click="activeTab = 'top_menus'"
      >
        🔥 10 อันดับเมนูขายดี
      </button>
      <button 
        class="category-tab" 
        :class="{ 'active': activeTab === 'activity_logs' }"
        @click="activeTab = 'activity_logs'"
      >
        👁️ ประวัติกิจกรรมพนักงาน
      </button>
    </div>

    <!-- Date selector card (hidden on 'top_menus' tab) -->
    <div v-if="activeTab !== 'top_menus'" class="card mb-lg p-md">
      <div class="flex gap-sm align-center">
        <div style="font-size: var(--font-sm); white-space:nowrap;" class="font-bold">📅 เลือกวันที่:</div>
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

        <!-- Today's Transaction Logs (ALL ROLES) -->
        <div class="card">
          <div class="card-title" style="font-size: var(--font-sm);">📋 รายการบิลประจำวัน</div>
          
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
                  <span v-if="order.status === 'cancelled'" class="text-danger" style="font-size:11px; margin-right:4px;">❌ ยกเลิก</span>
                  <span :class="order.status === 'cancelled' ? 'text-danger' : 'text-accent'">{{ formatCurrency(order.total) }}</span>
                </div>
              </div>
              <div class="flex flex-between" style="font-size:11px; color:var(--text-secondary); margin-top:2px;">
                <span>{{ order.payment_method === 'cash' ? '💵 เงินสด' : order.payment_method === 'qr' ? '📱 QR Code' : '⏳ รอชำระ' }}</span>
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
                  style="margin-top:var(--space-sm); width:100%; background:rgba(255,59,48,0.1); color:#ff3b30; border:1px solid rgba(255,59,48,0.3); min-height:40px; font-size:var(--font-sm);"
                  @click.stop="openVoidModal(order)"
                >
                  🚫 ยกเลิกบิลนี้ (Void)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: Expenses (บันทึกค่าใช้จ่ายประจำวัน) -->
      <div v-if="activeTab === 'expenses' && isAdminUser" class="card">
        <div class="card-title" style="font-size: var(--font-sm);">💸 บันทึกค่าใช้จ่ายประจำวัน (วันที่ {{ formatDate(selectedDate) }})</div>
        
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
                  <span class="custom-select-text">
                    {{ selectedExpenseCategoryLabel }}
                  </span>
                </div>
                <div v-if="isExpenseCategoryDropdownOpen" class="custom-select-dropdown">
                  <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'raw_materials' }" @click="selectExpenseCategory('raw_materials')">🍗 วัตถุดิบ</div>
                  <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'gas_fuel' }" @click="selectExpenseCategory('gas_fuel')">⛽ แก๊ส/น้ำมัน</div>
                  <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'packaging' }" @click="selectExpenseCategory('packaging')">📦 บรรจุภัณฑ์/ถุง</div>
                  <div class="custom-select-option" :class="{ 'selected': expenseForm.category === 'other' }" @click="selectExpenseCategory('other')">📎 อื่นๆ</div>
                </div>
              </div>
            </div>
          <div class="form-group mb-xs">
            <input type="text" class="form-input" v-model="expenseForm.note" placeholder="บันทึกช่วยจำ..." />
          </div>
          <div class="form-group mb-xs">
            <button class="btn btn-primary btn-block" @click="handleAddExpense" :disabled="!expenseForm.amount || expenseForm.amount <= 0" style="white-space:nowrap;">
              💾 บันทึก
            </button>
          </div>
        </div>

        <!-- Monthly Ledger Section -->
        <div class="divider" style="margin: var(--space-xl) 0; height:1px; background:var(--border-color);"></div>
        
        <div class="flex flex-between align-center mb-md">
          <div class="card-title" style="font-size: var(--font-sm); margin: 0;">
            📅 สมุดบัญชีรายรับ-รายจ่าย (เดือน {{ selectedDate.substring(0, 7) }})
          </div>
          <div v-if="ledgerLoading" class="spinner spinner-sm"></div>
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
        <div class="hide-mobile" style="overflow-x: auto; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
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
                    style="background:rgba(255,59,48,0.1); color:#ff3b30; border:none; padding:4px 8px; font-size:11px; border-radius:var(--radius-sm); cursor:pointer;" 
                    @click="handleDeleteExpense(item.id)"
                  >
                    🗑️
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
                <span>📅 {{ formatDate(item.created_at) }} {{ formatTime(item.created_at) }}</span>
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
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 3: Top Selling Menus (10 อันดับเมนูขายดีที่สุด) -->
      <div v-if="activeTab === 'top_menus' && isAdminUser" class="card">
        <div class="card-title" style="font-size: var(--font-sm);">🔥 10 อันดับเมนูขายดีที่สุด (7 วันที่ผ่านมา)</div>
        
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
        <div class="card-title" style="font-size: var(--font-sm);">👁️ ประวัติกิจกรรมพนักงาน (วันที่ {{ formatDate(selectedDate) }})</div>
        
        <!-- Filter dropdown -->
        <div class="form-group mb-md">
          <label class="form-label font-bold" style="font-size: var(--font-sm);">🔍 กรองประเภทกิจกรรม:</label>
          <div class="custom-select-wrapper" @click.stop>
            <div 
              class="custom-select-trigger" 
              :class="{ 'active': isFilterActionDropdownOpen }" 
              @click="isFilterActionDropdownOpen = !isFilterActionDropdownOpen"
              style="height: 40px; padding: 8px 40px 8px var(--space-lg);"
            >
              <span class="custom-select-text" style="font-size: var(--font-sm);">
                {{ selectedFilterActionLabel }}
              </span>
            </div>
            <div v-if="isFilterActionDropdownOpen" class="custom-select-dropdown">
              <div class="custom-select-option" :class="{ 'selected': filterAction === 'all' }" @click="selectFilterAction('all')">📁 ทั้งหมด</div>
              <div class="custom-select-option" :class="{ 'selected': filterAction === 'login' }" @click="selectFilterAction('login')">🔑 การลงชื่อเข้าใช้งาน (Login)</div>
              <div class="custom-select-option" :class="{ 'selected': filterAction === 'sales' }" @click="selectFilterAction('sales')">🛒 การขาย / ออกบิล (Sales)</div>
              <div class="custom-select-option" :class="{ 'selected': filterAction === 'cancel' }" @click="selectFilterAction('cancel')">🚫 การยกเลิกบิล (Void)</div>
              <div class="custom-select-option" :class="{ 'selected': filterAction === 'expenses' }" @click="selectFilterAction('expenses')">💸 บันทึกค่าใช้จ่าย (Expenses)</div>
              <div class="custom-select-option" :class="{ 'selected': filterAction === 'stock' }" @click="selectFilterAction('stock')">🔧 จัดการสต็อก / ของเสีย (Stock & Waste)</div>
              <div class="custom-select-option" :class="{ 'selected': filterAction === 'credit' }" @click="selectFilterAction('credit')">🍴 เครดิตพนักงาน (Staff Credit)</div>
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
                {{ getActionIcon(log.action) }}
              </div>
            </div>
            <div class="log-content-wrapper">
              <div class="log-details">{{ log.details }}</div>
              <div class="log-meta">
                <span class="log-user">👤 {{ log.staff_name || 'ระบบ' }}</span>
                <span class="log-time">🕒 {{ formatTime(log.created_at) }}</span>
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
          <h3>🚫 ยกเลิกบิล #{{ voidOrder?.order_number }}</h3>
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
              style="text-align:left; min-height:44px;"
              @click="voidReason = preset.value"
            >
              {{ preset.icon }} {{ preset.label }}
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
              style="background:rgba(255,59,48,0.9); color:#fff; border:none;"
              :disabled="!voidReason || (voidReason === 'custom' && !voidCustomReason.trim())"
              @click="handleVoidOrder"
            >
              ✅ ยืนยันยกเลิกบิล
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import api from '../api';
import { ui, formatCurrency, formatDate, formatTime, getToday, isAdmin } from '../helpers';

// Role check
const isAdminUser = computed(() => isAdmin());

const activeTab = ref('sales');

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
  { value: 'ลูกค้ายกเลิกออเดอร์', label: 'ลูกค้ายกเลิกออเดอร์', icon: '❌' },
  { value: 'กรอกข้อมูลผิดพลาด / ทำบิลซ้ำ', label: 'กรอกข้อมูลผิดพลาด / ทำบิลซ้ำ', icon: '✍️' },
  { value: 'custom', label: 'อื่นๆ (ระบุเอง)', icon: '💬' },
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
    raw_materials: '🍗 วัตถุดิบ',
    gas_fuel: '⛽ แก๊ส/น้ำมัน',
    packaging: '📦 บรรจุภัณฑ์/ถุง',
    other: '📎 อื่นๆ'
  };
  return categoryLabels[expenseForm.value.category] || 'เลือกหมวดหมู่...';
});
const selectExpenseCategory = (cat) => {
  expenseForm.value.category = cat;
  isExpenseCategoryDropdownOpen.value = false;
};

const isFilterActionDropdownOpen = ref(false);
const selectedFilterActionLabel = computed(() => {
  const filterLabels = {
    all: '📁 ทั้งหมด',
    login: '🔑 การลงชื่อเข้าใช้งาน (Login)',
    sales: '🛒 การขาย / ออกบิล (Sales)',
    cancel: '🚫 การยกเลิกบิล (Void)',
    expenses: '💸 บันทึกค่าใช้จ่าย (Expenses)',
    stock: '🔧 จัดการสต็อก / ของเสีย (Stock & Waste)',
    credit: '🍴 เครดิตพนักงาน (Staff Credit)'
  };
  return filterLabels[filterAction.value] || '📁 ทั้งหมด';
});
const selectFilterAction = (action) => {
  filterAction.value = action;
  isFilterActionDropdownOpen.value = false;
};
const closeReportsDropdowns = () => {
  isExpenseCategoryDropdownOpen.value = false;
  isFilterActionDropdownOpen.value = false;
};

const loadMonthlyLedger = async () => {
  ledgerLoading.value = true;
  try {
    const monthVal = selectedDate.value.substring(0, 7);
    const ordersRes = await api.orders.getAll({ status: 'completed', month: monthVal });
    const monthOrders = ordersRes.success ? (ordersRes.data || []) : [];

    const expensesRes = await api.expenses.get({ month: monthVal });
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

const loadDailyReport = async () => {
  loading.value = true;
  expandedOrderId.value = null;
  expandedItems.value = [];
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
    // Load expenses and activity logs for the same date (admin only)
    if (isAdmin()) {
      loadExpenses(dateVal);
      loadActivityLogs(dateVal);
      loadMonthlyLedger();
    }
  } catch (e) {
    console.error(e);
    ui.showToast('ไม่สามารถดึงข้อมูลรายงานประจำวันได้', 'error');
  } finally {
    loading.value = false;
  }
};

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

const loadExpenses = async (date) => {
  try {
    const res = await api.expenses.get(date);
    if (res.success) {
      expenses.value = res.data || [];
    }
  } catch (e) {
    console.warn(e);
  }
};

const loadActivityLogs = async (date) => {
  try {
    const res = await api.activities.get(date);
    if (res.success) {
      activityLogs.value = res.data || [];
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
      loadDailyReport();
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
      loadExpenses(selectedDate.value);
      loadActivityLogs(selectedDate.value);
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
      loadExpenses(selectedDate.value);
      loadActivityLogs(selectedDate.value);
      loadMonthlyLedger();
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
    'raw_materials': '🍗 วัตถุดิบ',
    'gas_fuel': '⛽ แก๊ส/น้ำมัน',
    'packaging': '📦 บรรจุภัณฑ์',
    'other': '📎 อื่นๆ'
  };
  return map[cat] || cat;
};

const getActionIcon = (action) => {
  const map = {
    'login': '🔑',
    'create_order': '🛒',
    'complete_order': '✅',
    'cancel_order': '🚫',
    'adjust_stock': '🔧',
    'record_waste': '🗑️',
    'staff_credit': '🍴',
    'log_expense': '💸',
    'delete_expense': '🗑️'
  };
  return map[action] || '📌';
};

onMounted(() => {
  if (isAdmin()) {
    loadReportSummary();
    loadTopItems();
    loadMonthlyLedger();
  }
  loadDailyReport();
  window.addEventListener('click', closeReportsDropdowns);
});

onUnmounted(() => {
  window.removeEventListener('click', closeReportsDropdowns);
});
</script>

<style scoped>
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

/* --- Responsive Utilities --- */
.show-mobile-only {
  display: none;
}
.hide-mobile {
  display: block;
}

@media (max-width: 768px) {
  .show-mobile-only {
    display: block;
  }
  .hide-mobile {
    display: none;
  }
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
