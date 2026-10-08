<template>
  <div class="expense-management-wrapper card p-md" style="position:relative; background: #ffffff; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
    
    <!-- Sub-tab Navigation (Consistent with StaffManagement.vue) -->
    <div class="category-tabs mb-lg flex gap-xs flex-wrap">
      <button 
        type="button"
        class="btn btn-secondary" 
        :class="{ 'active': activeSubTab === 'form' }"
        @click="activeSubTab = 'form'"
      >
        <i class="fa-solid fa-pen-to-square"></i> บันทึกรายจ่าย
      </button>
      <button 
        type="button"
        class="btn btn-secondary" 
        :class="{ 'active': activeSubTab === 'list' }"
        @click="activeSubTab = 'list'"
      >
        <i class="fa-solid fa-list-check"></i> หน้ารายการ ({{ allLedgerEntries.length }})
      </button>
      <button 
        type="button"
        class="btn btn-secondary" 
        :class="{ 'active': activeSubTab === 'analytics' }"
        @click="activeSubTab = 'analytics'"
      >
        <i class="fa-solid fa-chart-pie"></i> หน้ากราฟ & วิเคราะห์
      </button>
    </div>

    <!-- Loading Overlay when fetching new data across period/branch changes -->
    <div v-if="ledgerLoading" class="content-loading-overlay">
      <div class="loading-box flex flex-col align-center justify-center">
        <div class="spinner mb-sm"></div>
        <span class="text-sm font-bold text-primary">กำลังโหลดข้อมูล...</span>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- SUBTAB 1: หน้าบันทึกรายจ่าย (FULL WIDTH VERTICAL FLOW)     -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <div v-if="activeSubTab === 'form'" class="flex flex-col gap-md">
      
      <!-- Top Title Header Banner -->
      <div class="card p-md flex flex-between align-center flex-wrap gap-sm" style="background: rgba(139, 3, 19, 0.02); border: 1px solid var(--border-color);">
        <div>
          <h3 class="font-bold text-base flex align-center gap-xs" style="margin: 0; color: var(--text-primary);">
            <i class="fa-solid fa-wallet text-primary"></i> {{ expenseFormTitle }}
          </h3>
          <p class="text-xs text-secondary mt-xs" style="margin-bottom: 0;">
            กรอกข้อมูลค่าใช้จ่ายตามลำดับจากบนลงล่าง และกดบันทึกเพื่อนำเข้าระบบบัญชีสาขา
          </p>
        </div>
      </div>

      <!-- Main Full-Width Form Card -->
      <div class="card p-lg" style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md);">

        <!-- ── แถวที่ 1: เลือกหมวดหมู่ค่าใช้จ่าย ── -->
        <div class="form-step-section mb-lg">
          <label class="form-section-label mb-sm">
            <span class="step-num">1</span> หมวดหมู่ค่าใช้จ่าย (เลือก 1 หมวด):
          </label>
          <div class="category-grid-12">
            <button 
              v-for="cat in categoryList" 
              :key="cat.id" 
              type="button" 
              class="category-card-btn"
              :class="{ 'active': expenseForm.category === cat.id }"
              @click="expenseForm.category = cat.id"
            >
              <div class="cat-icon-wrap">
                <i :class="cat.icon"></i>
              </div>
              <span class="cat-name">{{ cat.name }}</span>
            </button>
          </div>
        </div>

        <!-- ── แถวที่ 2: ช่องทางจ่ายเงิน (แถวเดี่ยวเต็มความกว้าง) ── -->
        <div class="form-step-section mb-lg">
          <label class="form-section-label mb-sm">
            <span class="step-num">2</span> ช่องทางจ่ายเงิน:
          </label>
          <div class="payment-toggle-fullwidth">
            <button 
              type="button" 
              class="payment-toggle-btn"
              :class="{ 'active': expenseForm.payment_method === 'cash' }"
              @click="expenseForm.payment_method = 'cash'"
            >
              <i class="fa-solid fa-money-bill-wave"></i> เงินสด
            </button>
            <button 
              type="button" 
              class="payment-toggle-btn"
              :class="{ 'active': expenseForm.payment_method === 'transfer' }"
              @click="expenseForm.payment_method = 'transfer'"
            >
              <i class="fa-solid fa-mobile-screen-button"></i> เงินโอน
            </button>
          </div>
        </div>

        <!-- ── แถวที่ 3: ระบุจำนวนเงิน (แถวเดี่ยว) + ปุ่มบวกเงินด้านล่าง ── -->
        <div class="form-step-section mb-lg">
          <label class="form-section-label mb-sm">
            <span class="step-num">3</span> จำนวนเงิน (บาท) *:
          </label>
          <div class="input-with-icon mb-xs">
            <i class="fa-solid fa-baht-sign input-icon"></i>
            <input 
              type="number" 
              class="form-input custom-input full-width-input" 
              v-model.number="expenseForm.amount" 
              placeholder="ระบุจำนวนเงิน เช่น 500" 
              min="0"
              step="any"
            />
          </div>
          <!-- Quick Amount Buttons under input -->
          <div class="quick-amount-buttons-full">
            <button type="button" class="btn-quick-amount" @click="addAmount(50)">+50</button>
            <button type="button" class="btn-quick-amount" @click="addAmount(100)">+100</button>
            <button type="button" class="btn-quick-amount" @click="addAmount(200)">+200</button>
            <button type="button" class="btn-quick-amount" @click="addAmount(500)">+500</button>
            <button type="button" class="btn-quick-amount" @click="addAmount(1000)">+1,000</button>
            <button type="button" class="btn-quick-amount reset-btn" @click="expenseForm.amount = null">ล้างยอด</button>
          </div>
        </div>

        <!-- ── แถวที่ 4: บันทึกช่วยจำ / สถานที่ซื้อ + ปุ่มบันทึกด่วนด้านล่าง ── -->
        <div class="form-step-section mb-xl">
          <label class="form-section-label mb-sm">
            <span class="step-num">4</span> บันทึกช่วยจำ / สถานที่ซื้อ:
          </label>
          <div class="input-with-icon mb-xs">
            <i class="fa-solid fa-pen-to-square input-icon"></i>
            <input 
              type="text" 
              class="form-input custom-input full-width-input" 
              v-model="expenseForm.note" 
              placeholder="เช่น ซื้อไก่สดแม็คโคร, ค่าน้ำมัน..." 
            />
          </div>
          <!-- Quick Notes Grid under input -->
          <div class="quick-notes-grid-6">
            <button 
              v-for="preset in quickNotePresets" 
              :key="preset.name" 
              type="button" 
              class="quick-note-card-btn"
              :class="{ 'active': expenseForm.note === preset.name }"
              @click="setQuickNote(preset.name)"
            >
              <i :class="preset.icon" style="margin-right: 6px;"></i>
              <span>{{ preset.name }}</span>
            </button>
          </div>
        </div>

        <!-- ── ปุ่มบันทึกรายการ ── -->
        <button 
          class="btn btn-primary btn-block submit-expense-btn" 
          @click="handleAddExpense" 
          :disabled="!expenseForm.amount || expenseForm.amount <= 0 || saving"
        >
          <i v-if="saving" class="fa-solid fa-spinner fa-spin"></i>
          <i v-else class="fa-solid fa-circle-check"></i>
          <span>
            {{ saving ? ' กำลังบันทึก...' : ` บันทึกรายจ่าย ${selectedCategoryName} (${formatCurrency(expenseForm.amount || 0)})` }}
          </span>
        </button>

      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- SUBTAB 2: หน้ารายการ (EXPENSE & WASTE COMBINED LIST)       -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <div v-if="activeSubTab === 'list'" class="flex flex-col gap-md">
      
      <!-- Top 4 Summary Cards -->
      <div class="financial-summary-grid">
        <!-- Card 1: Revenue -->
        <div class="summary-card revenue-card">
          <div class="summary-card-header">
            <span class="summary-icon"><i class="fa-solid fa-sack-dollar text-success"></i></span>
            <span class="summary-title">ยอดขาย/รายรับรวม</span>
          </div>
          <div class="summary-value text-success">{{ formatCurrency(totalRevenue) }}</div>
          <div class="summary-sub-badges">
            <span class="sub-badge">สด: {{ formatCurrency(revenueBreakdown.cash) }}</span>
            <span class="sub-badge">โอน: {{ formatCurrency(revenueBreakdown.qr) }}</span>
          </div>
        </div>

        <!-- Card 2: Expenses -->
        <div class="summary-card expense-card">
          <div class="summary-card-header">
            <span class="summary-icon"><i class="fa-solid fa-wallet text-danger"></i></span>
            <span class="summary-title">รายจ่ายรวม</span>
          </div>
          <div class="summary-value text-danger">{{ formatCurrency(totalExpenses) }}</div>
          <div class="summary-sub-badges">
            <span class="sub-badge">สด: {{ formatCurrency(expenseBreakdown.cash) }}</span>
            <span class="sub-badge">โอน: {{ formatCurrency(expenseBreakdown.transfer) }}</span>
          </div>
        </div>

        <!-- Card 3: Waste & Staff Credit -->
        <div class="summary-card waste-card">
          <div class="summary-card-header">
            <span class="summary-icon"><i class="fa-solid fa-trash-can text-warning"></i></span>
            <span class="summary-title">ของเสีย & เครดิต</span>
          </div>
          <div class="summary-value text-warning">{{ formatCurrency(totalWasteAndCreditCost) }}</div>
          <div class="summary-sub-badges">
            <span class="sub-badge">ของเสีย: {{ formatCurrency(wasteCost) }}</span>
            <span class="sub-badge">เครดิต: {{ formatCurrency(staffCreditCost) }}</span>
          </div>
        </div>

        <!-- Card 4: Net Balance -->
        <div class="summary-card net-card" :class="netProfit >= 0 ? 'profit-positive' : 'profit-negative'">
          <div class="summary-card-header">
            <span class="summary-icon"><i class="fa-solid fa-scale-balanced"></i></span>
            <span class="summary-title">คงเหลือสุทธิ (กำไรจริง)</span>
          </div>
          <div class="summary-value" :class="netProfit >= 0 ? 'text-primary' : 'text-danger'">
            {{ formatCurrency(netProfit) }}
          </div>
          <div class="summary-formula-caption">รายรับ - รายจ่าย - ของเสีย/เครดิต</div>
        </div>
      </div>

      <!-- Working Capital Note / Staff Guarantee Fund Indicator -->
      <div v-if="activeHeldGuaranteesTotal > 0" class="card p-sm flex flex-col gap-xs" style="background: rgba(245, 158, 11, 0.05); border: 1px dashed rgba(245, 158, 11, 0.4); border-radius: var(--radius-md);">
        <div class="flex align-center gap-xs text-xs">
          <i class="fa-solid fa-shield-halved text-warning"></i>
          <span class="text-secondary font-medium">เงินประกันพนักงาน (หมุนเวียน):</span>
        </div>
        <div class="flex flex-between align-center flex-wrap gap-xs" style="padding-left: 20px;">
          <div class="flex align-baseline gap-xs">
            <strong class="text-primary font-bold text-sm">{{ formatCurrency(activeHeldGuaranteesTotal) }}</strong>
            <span class="text-secondary text-xs">({{ activeHeldGuaranteesCount }} คน)</span>
          </div>
          <div class="flex align-center gap-xs text-secondary" style="font-size: 11px;">
            <i class="fa-solid fa-circle-info"></i>
            <span>ไม่รวมในยอดขายอาหาร</span>
          </div>
        </div>
      </div>

      <!-- Enhanced Filter & Search Bar Card -->
      <div class="card p-md" style="background: #ffffff; border: 1px solid var(--border-color);">
        
        <!-- Filter Header & Buttons Grid -->
        <div class="mb-md">
          <div class="text-xs font-bold text-secondary mb-sm flex align-center gap-xs">
            <i class="fa-solid fa-filter text-primary"></i> กรองตามหมวดหมู่ / รายการ:
          </div>
          <div class="filter-chips-wrapper">
            <button 
              type="button" 
              class="enhanced-filter-chip"
              :class="{ 'active': filterCategory === 'all' }"
              @click="filterCategory = 'all'"
            >
              <i class="fa-solid fa-border-all"></i>
              <span>ทั้งหมด</span>
              <span class="filter-count-badge">{{ allLedgerEntries.length }}</span>
            </button>
            <button 
              v-for="cat in listFilterCategories" 
              :key="'filter-' + cat.id"
              type="button" 
              class="enhanced-filter-chip"
              :class="{ 'active': filterCategory === cat.id }"
              @click="filterCategory = cat.id"
            >
              <i :class="cat.icon"></i>
              <span>{{ cat.name }}</span>
              <span class="filter-count-badge">{{ getEntryCountByCategory(cat.id) }}</span>
            </button>
          </div>
        </div>

        <!-- Search Input & CSV Export Button Row -->
        <div class="filter-search-row flex flex-col gap-sm">
          <div class="search-input-wrapper" style="width: 100%; max-width: 100%;">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input 
              type="text" 
              class="form-input search-input" 
              v-model="searchQuery" 
              placeholder="ค้นหาชื่อรายการ, หมายเหตุ, หรือผู้บันทึก..." 
              style="width: 100%;"
            />
          </div>
          <div v-if="filteredLedgerEntries.length > 0" class="flex" style="width: 100%;">
            <button 
              class="btn btn-secondary csv-export-btn" 
              style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 38px; padding: 0 16px; font-size: var(--font-sm); border-radius: 8px; width: 100%;"
              @click="exportLedgerCSV"
            >
              <i class="fa-solid fa-file-csv text-primary"></i> ส่งออกบัญชี (CSV)
            </button>
          </div>
        </div>

        <!-- Filter Sub-summary Banner with Proper Margin/Padding -->
        <div class="filter-summary-banner mt-md flex flex-between align-center flex-wrap gap-xs">
          <div class="text-xs text-secondary font-medium">
            <i class="fa-solid fa-circle-info text-primary" style="margin-right: 4px;"></i>
            แสดงผล <strong>{{ filteredLedgerEntries.length }}</strong> รายการ
            <span v-if="filterCategory !== 'all'" class="text-primary font-bold"> (หมวด: {{ getFilterCategoryLabel(filterCategory) }})</span>
            <span v-if="searchQuery" class="text-primary font-bold"> (คำค้น: "{{ searchQuery }}")</span>
          </div>
          <div class="font-bold text-danger text-sm">
            ยอดรวมที่แสดง: {{ formatCurrency(filteredLedgerTotal) }}
          </div>
        </div>

      </div>

      <!-- Combined Table Card (Expenses + Waste + Staff Credit) -->
      <div class="hide-mobile" style="width: 100%; overflow-x: auto; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
        <table class="table" style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-color); background: rgba(139, 3, 19, 0.03);">
              <th class="text-center" style="width: 12%; padding: 14px var(--space-xs); white-space:nowrap;">วัน-เวลา</th>
              <th class="text-center" style="width: 16%; padding: 14px var(--space-xs); white-space:nowrap;">ประเภท / หมวดหมู่</th>
              <th class="text-left" style="width: 29%; padding: 14px var(--space-md);">ชื่อรายการ / รายละเอียด</th>
              <th class="text-center" style="width: 12%; padding: 14px var(--space-xs); white-space:nowrap;">ช่องทาง</th>
              <th class="text-center" style="width: 14%; padding: 14px var(--space-xs); white-space:nowrap;">จำนวนเงิน (บาท)</th>
              <th class="text-center" style="width: 17%; padding: 14px var(--space-xs); white-space:nowrap;">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="ledgerLoading && allLedgerEntries.length === 0">
              <td colspan="6" style="text-align: center; padding: var(--space-3xl) var(--space-md) !important;">
                <div class="spinner mx-auto"></div>
              </td>
            </tr>
            <tr v-else-if="filteredLedgerEntries.length === 0">
              <td colspan="6" style="text-align: center; padding: var(--space-3xl) var(--space-md) !important; color: var(--text-secondary);">
                <div class="flex flex-col align-center justify-center gap-xs">
                  <i class="fa-solid fa-receipt text-secondary" style="font-size: 2rem; opacity: 0.35;"></i>
                  <div class="font-bold text-sm">ไม่มีรายการในหมวดหมู่นี้</div>
                </div>
              </td>
            </tr>
            <tr 
              v-else 
              v-for="item in paginatedLedgerEntries" 
              :key="item.entryKey" 
              style="border-bottom: 1px solid var(--border-color);"
              class="table-row-hover"
              :style="item.isCancelled ? 'opacity: 0.65; background: #fafafa;' : ''"
            >
              <td class="text-center" style="padding: 14px var(--space-xs); vertical-align: middle; white-space:nowrap; color:var(--text-secondary); font-size: var(--font-xs);">
                {{ formatDate(item.date) }}<br/>
                <span class="text-tertiary">{{ formatTime(item.created_at) }}</span>
              </td>
              <td class="text-center" style="padding: 14px var(--space-xs); vertical-align: middle;">
                <span class="category-badge" :class="item.badgeClass">
                  <i :class="item.icon"></i>
                  <span>{{ item.categoryLabel }}</span>
                </span>
              </td>
              <td class="text-left" style="padding: 14px var(--space-md); vertical-align: middle; font-weight: 500; word-break: break-word;">
                <div :style="item.isCancelled ? 'text-decoration: line-through; color: var(--text-secondary);' : ''">{{ item.name }}</div>
                <div v-if="item.staffName" class="text-xs text-secondary mt-xxs">
                  <i class="fa-solid fa-user-pen" style="font-size: 10px;"></i> โดย: {{ item.staffName }}
                </div>
                <div v-if="item.isCancelled && item.cancelReason" class="text-xs text-danger mt-xxs font-semibold">
                  <i class="fa-solid fa-circle-info" style="font-size: 10px;"></i> {{ item.cancelReason }}
                </div>
              </td>
              <td class="text-center" style="padding: 14px var(--space-xs); vertical-align: middle;">
                <span class="payment-method-badge" :class="item.paymentClass">
                  <i v-if="item.paymentClass === 'badge-transfer'" class="fa-solid fa-mobile-screen-button"></i>
                  <i v-else-if="item.paymentClass === 'badge-cash'" class="fa-solid fa-money-bill-wave"></i>
                  <i v-else class="fa-solid fa-box"></i>
                  <span>{{ item.paymentLabel }}</span>
                </span>
              </td>
              <td class="text-center" style="padding: 14px var(--space-xs); vertical-align: middle; font-weight:bold; font-size: var(--font-base);">
                <span v-if="item.isRefund" class="text-success font-bold">+{{ formatCurrency(item.amount) }}</span>
                <span v-else-if="item.isCancelled" class="text-tertiary" style="text-decoration: line-through; font-size: var(--font-sm);">{{ formatCurrency(item.amount) }}</span>
                <span v-else class="text-danger font-bold">{{ formatCurrency(item.amount) }}</span>
              </td>
              <td class="text-center" style="padding: 14px var(--space-xs); vertical-align: middle;">
                <!-- Reversal / Status Column -->
                <!-- Case 1: Refund Entry -->
                <span v-if="item.isRefund" class="badge-status-pill badge-refund-done">
                  <i class="fa-solid fa-circle-check"></i> คืนยอดเงินแล้ว
                </span>
                <!-- Case 2: Cancelled Expense -->
                <span v-else-if="item.isCancelled && item.type === 'expense'" :class="item.category === 'salary' ? 'badge-status-pill badge-salary-cancelled' : 'badge-status-pill badge-cancelled'">
                  <i :class="item.category === 'salary' ? 'fa-solid fa-user-clock' : 'fa-solid fa-ban'"></i>
                  {{ item.category === 'salary' ? 'คืนบัญชีพนักงาน' : 'ยกเลิก & คืนเงิน' }}
                </span>
                <!-- Case 3: Cancelled Stock Log -->
                <span v-else-if="item.isCancelled && (item.type === 'waste_loss' || item.type === 'credit_loss')" class="badge-status-pill badge-stock-cancelled">
                  <i class="fa-solid fa-rotate-left"></i> คืนสต็อกแล้ว
                </span>
                <!-- Case 4: Active Expense -->
                <button 
                  v-else-if="item.type === 'expense'"
                  class="btn-action btn-action-primary table-action-btn"
                  :disabled="reversingEntryId === item.entryKey"
                  @click="handleReverseEntry(item)"
                  title="ยกเลิกและคืนยอด"
                >
                  <i v-if="reversingEntryId === item.entryKey" class="fa-solid fa-spinner fa-spin"></i>
                  <i v-else class="fa-solid fa-rotate-left"></i>
                  <span>{{ reversingEntryId === item.entryKey ? ' กำลังยกเลิก...' : ' ยกเลิก/คืน' }}</span>
                </button>
                <!-- Case 5: Active Stock Waste/Credit -->
                <button 
                  v-else-if="item.type === 'waste_loss' || item.type === 'credit_loss'"
                  class="btn-action btn-action-primary table-action-btn"
                  :disabled="reversingEntryId === item.entryKey"
                  @click="handleReverseEntry(item)"
                  title="ยกเลิกและคืนสต็อกเข้าคลัง"
                >
                  <i v-if="reversingEntryId === item.entryKey" class="fa-solid fa-spinner fa-spin"></i>
                  <i v-else class="fa-solid fa-rotate-left"></i>
                  <span>{{ reversingEntryId === item.entryKey ? ' กำลังคืน...' : ' คืนสต็อก' }}</span>
                </button>
                <span v-else class="text-tertiary text-xs">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile List Cards -->
      <div class="show-mobile-flex mobile-menu-list-container flex-col" style="gap: 12px; padding-bottom: 24px; width: 100%;">
        <div v-if="filteredLedgerEntries.length === 0" class="card text-center py-xl" style="color: var(--text-tertiary);">
          ไม่มีรายการในหมวดหมู่นี้
        </div>
        <div v-else class="flex flex-col" style="gap: 12px; width: 100%;">
          <div 
            v-for="item in paginatedLedgerEntries" 
            :key="'mobile-' + item.entryKey"
            class="expense-mobile-card"
            :style="item.isCancelled ? 'opacity: 0.65; background: #fafafa;' : ''"
          >
            <div class="flex flex-between align-center mb-xs">
              <span class="category-badge" :class="item.badgeClass">
                <i :class="item.icon"></i> {{ item.categoryLabel }}
              </span>
              <span v-if="item.isRefund" class="font-bold text-success text-base" style="font-size: 16px;">+{{ formatCurrency(item.amount) }}</span>
              <span v-else-if="item.isCancelled" class="font-bold text-tertiary text-sm" style="text-decoration: line-through; font-size: 14px;">{{ formatCurrency(item.amount) }}</span>
              <span v-else class="font-bold text-danger text-base" style="font-size: 16px;">{{ formatCurrency(item.amount) }}</span>
            </div>
            <div class="text-sm font-semibold mb-xs" :style="item.isCancelled ? 'text-decoration: line-through; color: var(--text-secondary);' : ''" style="word-break: break-word; font-size: 14px; line-height: 1.4;">
              {{ item.name }}
            </div>
            <div v-if="item.isCancelled && item.cancelReason" class="text-xs text-danger mb-xs font-semibold" style="margin-top: 4px;">
              <i class="fa-solid fa-circle-info" style="font-size: 10px;"></i> {{ item.cancelReason }}
            </div>
            <div class="flex flex-between align-center text-xs text-secondary" style="border-top: 1px dashed var(--border-color); padding-top: 12px; margin-top: 6px;">
              <span>{{ formatDate(item.date) }} {{ formatTime(item.created_at) }}</span>
              <div class="flex align-center gap-xs">
                <span class="payment-method-badge" :class="item.paymentClass">{{ item.paymentLabel }}</span>
                <!-- Reversal Badges / Buttons for Mobile -->
                <span v-if="item.isRefund" class="badge-status-pill badge-refund-done" style="padding: 4px 10px; font-size: 11px;">
                  <i class="fa-solid fa-circle-check"></i> คืนเงินแล้ว
                </span>
                <span v-else-if="item.isCancelled && item.type === 'expense'" :class="item.category === 'salary' ? 'badge-status-pill badge-salary-cancelled' : 'badge-status-pill badge-cancelled'" style="padding: 4px 10px; font-size: 11px;">
                  <i :class="item.category === 'salary' ? 'fa-solid fa-user-clock' : 'fa-solid fa-ban'"></i>
                  {{ item.category === 'salary' ? 'คืนบัญชีพนักงาน' : 'ยกเลิกแล้ว' }}
                </span>
                <span v-else-if="item.isCancelled" class="badge-status-pill badge-stock-cancelled" style="padding: 4px 10px; font-size: 11px;">
                  <i class="fa-solid fa-rotate-left"></i> คืนสต็อกแล้ว
                </span>
                <button 
                  v-else-if="item.type === 'expense' || item.type === 'waste_loss' || item.type === 'credit_loss'"
                  class="btn-action-reverse" 
                  style="padding: 4px 12px; font-size: 11.5px; height: 32px;"
                  :disabled="reversingEntryId === item.entryKey"
                  @click="handleReverseEntry(item)"
                >
                  <i v-if="reversingEntryId === item.entryKey" class="fa-solid fa-spinner fa-spin"></i>
                  <i v-else class="fa-solid fa-rotate-left"></i>
                  <span> ยกเลิก/คืน</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalLedgerPages > 1" class="pagination-bar flex flex-between align-center">
        <button 
          class="pagination-btn" 
          :disabled="ledgerCurrentPage === 1" 
          @click="ledgerCurrentPage--"
        >
          <i class="fa-solid fa-chevron-left"></i> ก่อนหน้า
        </button>
        <span class="pagination-info">
          หน้า {{ ledgerCurrentPage }} จาก {{ totalLedgerPages }}
        </span>
        <button 
          class="pagination-btn" 
          :disabled="ledgerCurrentPage === totalLedgerPages" 
          @click="ledgerCurrentPage++"
        >
          ถัดไป <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>

    </div>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- SUBTAB 3: หน้ากราฟ & วิเคราะห์ (ANALYTICS & CHARTS)         -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <div v-if="activeSubTab === 'analytics'" class="flex flex-col gap-lg">
      <div class="analytics-grid">
        
        <!-- Chart 1: Category Breakdown (Including Waste & Credit) -->
        <div class="card p-lg" style="background: #ffffff; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
          <div class="card-title mb-lg flex align-start gap-xs" style="border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
            <i class="fa-solid fa-chart-pie text-primary" style="margin-top: 3px; font-size: 1.1rem;"></i> 
            <div class="flex flex-col">
              <span class="font-bold text-base" style="color: var(--text-primary); line-height: 1.3;">สัดส่วนค่าใช้จ่าย & ของเสีย</span>
              <span class="text-xs text-secondary font-medium" style="margin-top: 2px;">({{ ledgerPeriodLabel }})</span>
            </div>
          </div>
          
          <div v-if="allCostBreakdownStats.length === 0" class="text-center py-xl text-secondary text-sm">
            <i class="fa-solid fa-chart-pie text-tertiary" style="font-size: 2rem; opacity: 0.35; display: block; margin-bottom: 8px;"></i>
            ไม่มีข้อมูลสำหรับสร้างกราฟ
          </div>
          <div v-else class="category-breakdown-list">
            <div 
              v-for="stat in allCostBreakdownStats" 
              :key="stat.id" 
              class="category-breakdown-row"
            >
              <div class="flex flex-between align-center mb-xs text-xs font-semibold">
                <span class="flex align-center gap-xs" style="color: var(--text-primary);">
                  <i :class="stat.icon" :style="{ color: stat.color }"></i>
                  <span>{{ stat.name }}</span>
                </span>
                <span class="font-bold" style="color: var(--text-primary);">
                  {{ formatCurrency(stat.total) }} <span class="text-secondary font-normal">({{ stat.percentage }}%)</span>
                </span>
              </div>
              <div class="progress-bar-bg">
                <div 
                  class="progress-bar-fill" 
                  :style="{ width: stat.percentage + '%', backgroundColor: stat.color }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Chart 2: Revenue vs Expenses vs Waste Comparison -->
        <div class="card p-lg" style="background: #ffffff; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
          <div class="card-title mb-lg flex align-start gap-xs" style="border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
            <i class="fa-solid fa-chart-simple text-primary" style="margin-top: 3px; font-size: 1.1rem;"></i> 
            <span class="font-bold text-base" style="color: var(--text-primary); line-height: 1.35;">
              เปรียบเทียบ รายรับ vs รายจ่าย
            </span>
          </div>

          <div class="financial-bars-container flex flex-col gap-lg">
            
            <!-- Revenue -->
            <div class="financial-bar-item">
              <div class="flex flex-between align-center text-xs mb-xs" style="gap: 8px;">
                <span class="font-bold text-success flex align-center gap-xs" style="white-space: nowrap;">
                  <i class="fa-solid fa-sack-dollar"></i> 
                  <span>รายรับรวม</span>
                </span>
                <span class="font-bold text-success text-sm" style="white-space: nowrap;">{{ formatCurrency(totalRevenue) }}</span>
              </div>
              <div class="progress-bar-bg" style="height: 14px;">
                <div class="progress-bar-fill" style="width: 100%; background-color: var(--success, #2a9d8f);"></div>
              </div>
            </div>

            <!-- Expense -->
            <div class="financial-bar-item">
              <div class="flex flex-between align-center text-xs mb-xs" style="gap: 8px;">
                <span class="font-bold text-danger flex align-center gap-xs" style="white-space: nowrap;">
                  <i class="fa-solid fa-wallet"></i> 
                  <span>รายจ่ายรวม</span>
                </span>
                <span class="font-bold text-danger text-sm" style="white-space: nowrap;">
                  {{ formatCurrency(totalExpenses) }} 
                  <span class="text-secondary font-normal text-xs">({{ totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : 0 }}%)</span>
                </span>
              </div>
              <div class="progress-bar-bg" style="height: 14px;">
                <div 
                  class="progress-bar-fill" 
                  :style="{ 
                    width: (totalRevenue > 0 ? Math.min((totalExpenses / totalRevenue) * 100, 100) : 0) + '%', 
                    backgroundColor: 'var(--danger, #ad281e)' 
                  }"
                ></div>
              </div>
            </div>

            <!-- Waste & Credit -->
            <div class="financial-bar-item">
              <div class="flex flex-between align-center text-xs mb-xs" style="gap: 8px;">
                <span class="font-bold text-warning flex align-center gap-xs" style="white-space: nowrap;">
                  <i class="fa-solid fa-trash-can"></i> 
                  <span>ของเสีย & เครดิต</span>
                </span>
                <span class="font-bold text-warning text-sm" style="white-space: nowrap;">
                  {{ formatCurrency(totalWasteAndCreditCost) }}
                  <span class="text-secondary font-normal text-xs">({{ totalRevenue > 0 ? ((totalWasteAndCreditCost / totalRevenue) * 100).toFixed(1) : 0 }}%)</span>
                </span>
              </div>
              <div class="progress-bar-bg" style="height: 14px;">
                <div 
                  class="progress-bar-fill" 
                  :style="{ 
                    width: (totalRevenue > 0 ? Math.min((totalWasteAndCreditCost / totalRevenue) * 100, 100) : 0) + '%', 
                    backgroundColor: 'var(--accent, #ffab2b)' 
                  }"
                ></div>
              </div>
            </div>

            <!-- Net Result Card -->
            <div class="net-profit-card card p-md flex flex-between align-center flex-wrap gap-xs" :class="netProfit >= 0 ? 'profit-box-positive' : 'profit-box-negative'">
              <span class="font-bold text-sm flex align-center gap-xs" :class="netProfit >= 0 ? 'text-success' : 'text-danger'" style="white-space: nowrap;">
                <i :class="netProfit >= 0 ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'"></i>
                <span>คงเหลือสุทธิ (กำไรจริง)</span>
              </span>
              <span class="font-bold text-lg" :class="netProfit >= 0 ? 'text-success' : 'text-danger'" style="white-space: nowrap;">
                {{ formatCurrency(netProfit) }}
              </span>
            </div>

            <!-- Profit Sharing Split Card (60% / 40%) -->
            <div class="profit-sharing-section card p-md" style="background: rgba(139, 3, 19, 0.02); border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
              <div class="flex align-center mb-sm">
                <span class="font-bold text-xs flex align-center" style="color: var(--text-primary); gap: 8px;">
                  <i class="fa-solid fa-handshake-angle" style="color: var(--text-primary); font-size: 14px;"></i>
                  <span>การจัดสรรส่วนแบ่งกำไร</span>
                </span>
              </div>
              <div class="grid grid-2 gap-sm">
                <!-- 60% Share (ร้าน / ฝ่ายบริหาร) -->
                <div class="card p-md flex flex-col justify-between" style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-sm); box-shadow: 0 1px 4px rgba(0,0,0,0.02);">
                  <div class="flex flex-between align-center text-xs text-secondary mb-xs">
                    <span class="font-bold flex align-center" style="gap: 8px; color: var(--text-primary);">
                      <i class="fa-solid fa-store text-primary" style="font-size: 14px;"></i> 
                      <span>ร้าน / บริหาร</span>
                    </span>
                    <span class="badge font-bold" style="background: rgba(139, 3, 19, 0.08); color: var(--primary); padding: 2px 8px; border-radius: 6px; font-size: 11px;">60%</span>
                  </div>
                  <div class="font-bold my-xs" style="font-size: 1.45rem; line-height: 1.2;" :class="profitShare60 >= 0 ? 'text-primary' : 'text-danger'">
                    {{ formatCurrency(profitShare60) }}
                  </div>
                  <div class="text-xs text-tertiary mt-2xs font-medium">60% ของกำไรจริง</div>
                </div>

                <!-- 40% Share (ผู้ร่วมทุน / หุ้นส่วน) -->
                <div class="card p-md flex flex-col justify-between" style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-sm); box-shadow: 0 1px 4px rgba(0,0,0,0.02);">
                  <div class="flex flex-between align-center text-xs text-secondary mb-xs">
                    <span class="font-bold flex align-center" style="gap: 8px; color: var(--text-primary);">
                      <i class="fa-solid fa-user-tie" style="color: #cc8000; font-size: 14px;"></i> 
                      <span>ผู้ร่วมทุน / หุ้นส่วน</span>
                    </span>
                    <span class="badge font-bold" style="background: rgba(255, 171, 43, 0.18); color: #b26a00; padding: 2px 8px; border-radius: 6px; font-size: 11px;">40%</span>
                  </div>
                  <div class="font-bold my-xs" style="font-size: 1.45rem; line-height: 1.2; color: #cc8000;" :class="profitShare40 < 0 ? 'text-danger' : ''">
                    {{ formatCurrency(profitShare40) }}
                  </div>
                  <div class="text-xs text-tertiary mt-2xs font-medium">ยอดจ่ายให้ผู้ร่วมทุน (40%)</div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      <!-- Top 5 Highest Expenses -->
      <div class="card p-lg" style="background: #ffffff; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
        <div class="card-title font-bold text-base mb-md flex align-center gap-xs" style="color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
          <i class="fa-solid fa-ranking-star text-primary" style="font-size: 1.1rem;"></i> 
          <span>5 อันดับรายการจ่ายสูงสุด</span>
        </div>
        <div v-if="topExpenses.length === 0" class="text-secondary text-sm text-center py-xl">
          <i class="fa-solid fa-receipt text-tertiary" style="font-size: 2rem; opacity: 0.35; display: block; margin-bottom: 8px;"></i>
          ไม่มีข้อมูลรายการจ่าย
        </div>
        <div v-else class="top-expenses-list">
          <div 
            v-for="(top, idx) in topExpenses" 
            :key="'top-' + top.id" 
            class="top-expense-row flex flex-col gap-2xs"
            style="padding: 10px 4px; border-bottom: 1px solid var(--border-color);"
          >
            <!-- แถวที่ 1: อันดับ + หมวดหมู่ (ซ้าย) และ ยอดเงิน (ขวา) -->
            <div class="flex flex-between align-center">
              <div class="flex align-center gap-xs">
                <span class="rank-indicator" :class="'rank-' + (idx + 1)">#{{ idx + 1 }}</span>
                <span class="category-badge top-cat-badge" :class="'badge-cat-' + top.category">
                  <i :class="getExpenseCategoryIcon(top.category)"></i>
                  <span>{{ getCategoryLabel(top.category) }}</span>
                </span>
              </div>
              <span class="font-bold text-danger text-base" style="font-size: 15.5px; white-space: nowrap;">
                {{ formatCurrency(top.amount) }}
              </span>
            </div>
            
            <!-- แถวที่ 2: ชื่อคำอธิบาย / รายละเอียด (แสดงเต็มข้อความ ไม่ตัดทอน) -->
            <div 
              v-if="top.note && top.note.trim() && top.note.trim() !== getCategoryLabel(top.category)" 
              class="text-xs font-medium" 
              style="padding-left: 32px; word-break: break-word; line-height: 1.4; color: var(--text-secondary);"
            >
              {{ top.note }}
            </div>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import api from '../api';
import { ui, formatCurrency, formatDate, formatTime, getToday } from '../helpers';

const props = defineProps({
  branchId: {
    type: Number,
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
  },
  startTime: {
    type: String,
    default: '00.00'
  },
  endTime: {
    type: String,
    default: '23.59'
  }
});

const activeDate = computed(() => props.selectedDate || getToday());
const activeMonth = computed(() => props.selectedMonth || getToday().substring(0, 7));
const activeYear = computed(() => props.selectedYear || getToday().substring(0, 4));
const activePeriodMode = computed(() => props.periodMode || 'daily');

// Sub-tabs: 'form' (บันทึกรายจ่าย), 'list' (หน้ารายการ), 'analytics' (หน้ากราฟ)
const activeSubTab = ref('form');

// Categories list
const categoryList = [
  // Row 1: ของสดและพลังงาน
  { id: 'raw_chicken', name: 'ไก่สด', icon: 'fa-solid fa-drumstick-bite' },
  { id: 'ice', name: 'น้ำแข็ง', icon: 'fa-solid fa-cube' },
  { id: 'cooking_oil', name: 'น้ำมันพืช', icon: 'fa-solid fa-bottle-droplet' },
  { id: 'fuel_transport', name: 'น้ำมันรถ', icon: 'fa-solid fa-gas-pump' },
  { id: 'gas_lpg', name: 'แก๊ส LPG', icon: 'fa-solid fa-fire' },
  { id: 'sticky_rice', name: 'ข้าวเหนียว', icon: 'fa-solid fa-bowl-rice' },
  { id: 'meatballs', name: 'ลูกชิ้น', icon: 'fa-solid fa-circle' },
  // Row 2: ของสดอื่นๆ บรรจุภัณฑ์ และการเงิน
  { id: 'salapao', name: 'ซาลาเปา', icon: 'fa-solid fa-cookie' },
  { id: 'packaging', name: 'บรรจุภัณฑ์', icon: 'fa-solid fa-box' },
  { id: 'salary', name: 'เงินเดือน/ค่าแรง', icon: 'fa-solid fa-hand-holding-dollar' },
  { id: 'utility_bills', name: 'ค่าน้ำ/ไฟ/เน็ต', icon: 'fa-solid fa-bolt' },
  { id: 'debt', name: 'หนี้/ยอดค้าง', icon: 'fa-solid fa-file-invoice-dollar' },
  { id: 'other', name: 'อื่นๆ', icon: 'fa-solid fa-paperclip' }
];

// Quick Notes: 6 prominent cards
const quickNotePresets = [
  { name: 'แม็คโคร', icon: 'fa-solid fa-cart-shopping' },
  { name: 'ตลาดสด', icon: 'fa-solid fa-carrot' },
  { name: 'ปั๊มน้ำมัน', icon: 'fa-solid fa-gas-pump' },
  { name: 'ซีเจ / เซเว่น', icon: 'fa-solid fa-store' },
  { name: 'โลตัส / บิ๊กซี', icon: 'fa-solid fa-basket-shopping' },
  { name: 'เลี้ยงลูกน้อง', icon: 'fa-solid fa-users' }
];

const listFilterCategories = [
  ...categoryList,
  { id: 'waste_loss', name: 'ของเสีย/ทิ้ง', icon: 'fa-solid fa-trash-can' },
  { id: 'credit_loss', name: 'เครดิตพนักงาน', icon: 'fa-solid fa-user-check' }
];

// Expense form
const expenseForm = ref({
  amount: null,
  category: 'raw_chicken',
  note: '',
  payment_method: 'transfer'
});
const saving = ref(false);

const selectedCategoryName = computed(() => {
  const c = categoryList.find(item => item.id === expenseForm.value.category);
  return c ? c.name : 'ค่าใช้จ่าย';
});

const setQuickNote = (note) => {
  if (expenseForm.value.note === note) {
    expenseForm.value.note = '';
  } else {
    expenseForm.value.note = note;
  }
};

const addAmount = (val) => {
  expenseForm.value.amount = (Number(expenseForm.value.amount) || 0) + val;
};

const expenseFormTitle = computed(() => {
  if (activePeriodMode.value === 'daily') {
    return `บันทึกค่าใช้จ่าย (${activeDate.value === getToday() ? 'วันนี้' : formatDate(activeDate.value)})`;
  } else if (activePeriodMode.value === 'monthly') {
    const [y, m] = activeMonth.value.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return `บันทึกค่าใช้จ่าย (${d.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' })})`;
  } else {
    return `บันทึกค่าใช้จ่าย (${Number(activeYear.value) + 543})`;
  }
});

const ledgerPeriodLabel = computed(() => {
  if (activePeriodMode.value === 'daily') {
    return formatDate(activeDate.value);
  } else if (activePeriodMode.value === 'monthly') {
    const [y, m] = activeMonth.value.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' });
  } else {
    return `ปี ${Number(activeYear.value) + 543}`;
  }
});

// Data states
const orders = ref([]);
const expenses = ref([]);
const guarantees = ref([]);
const menuItems = ref([]);
const rawStockLogs = ref([]);
const ledgerLoading = ref(false);

// Filter & Pagination for List
const filterCategory = ref('all');
const searchQuery = ref('');
const ledgerCurrentPage = ref(1);
const ledgerPerPage = 15;

// Combined Ledger Entries (Expenses + Waste + Staff Credit)
const allLedgerEntries = computed(() => {
  const list = [];
  const menuMap = new Map();
  const menuByNameMap = new Map();
  menuItems.value.forEach(m => {
    if (m && m.id !== undefined && m.id !== null) {
      menuMap.set(Number(m.id), m);
      menuMap.set(String(m.id), m);
    }
    if (m && m.name) {
      menuByNameMap.set(m.name.trim().toLowerCase(), m);
    }
  });

  // 1. Regular Expenses & Refunds
  expenses.value.forEach(e => {
    const isRefund = Boolean(e.is_refund === 1 || e.status === 'refund');
    const isCancelled = e.status === 'cancelled';
    const catLabel = isRefund ? 'คืนเงิน/ยกเลิก' : getCategoryLabel(e.category);
    const catIcon = isRefund ? 'fa-solid fa-rotate-left' : getExpenseCategoryIcon(e.category);
    const badgeCls = isRefund ? 'badge-cat-refund' : ('badge-cat-' + e.category);
    const displayName = isRefund
      ? (e.note || `คืน: ${getCategoryLabel(e.category)}`)
      : (e.note || getCategoryLabel(e.category));

    list.push({
      entryKey: 'exp-' + e.id,
      id: e.id,
      type: 'expense',
      status: e.status || (isRefund ? 'refund' : 'completed'),
      isRefund,
      isCancelled,
      cancelReason: e.cancel_reason || '',
      cancelledAt: e.cancelled_at || null,
      category: e.category,
      categoryLabel: catLabel,
      icon: catIcon,
      badgeClass: badgeCls,
      name: displayName,
      amount: Number(e.amount) || 0,
      paymentLabel: e.payment_method === 'transfer' ? 'เงินโอน' : 'เงินสด',
      paymentClass: e.payment_method === 'transfer' ? 'badge-transfer' : 'badge-cash',
      date: e.expense_date || (e.created_at ? e.created_at.substring(0, 10) : ''),
      created_at: e.created_at,
      timestamp: new Date((e.created_at || '').replace(' ', 'T')).getTime(),
      staffName: e.staff_name
    });
  });

  // 2. Waste & Staff Credit from Stock Logs
  rawStockLogs.value.forEach(log => {
    if (!['waste', 'staff_benefit'].includes(log.reason)) return;
    const item = (log.menu_item_id ? (menuMap.get(Number(log.menu_item_id)) || menuMap.get(String(log.menu_item_id))) : null) ||
                 (log.item_name ? menuByNameMap.get(String(log.item_name).trim().toLowerCase()) : null);
    const unitPrice = (item && Number(item.price) > 0)
      ? Number(item.price)
      : (Number(log.item_price) > 0 ? Number(log.item_price) : 0);
    const uom = (item && item.uom) ? item.uom : (log.item_uom || 'ชิ้น');
    const name = log.item_name || (item ? item.name : 'สินค้า');
    const qty = Math.abs(Number(log.change_qty) || 0);
    const lossCost = qty * unitPrice;
    const isWaste = log.reason === 'waste';
    const isCancelled = log.status === 'cancelled';

    list.push({
      entryKey: 'stock-' + log.id,
      id: log.id,
      type: isWaste ? 'waste_loss' : 'credit_loss',
      status: log.status || 'completed',
      isRefund: false,
      isCancelled,
      cancelReason: log.cancel_reason || '',
      cancelledAt: log.cancelled_at || null,
      category: isWaste ? 'waste_loss' : 'credit_loss',
      categoryLabel: isWaste ? 'ของเสีย/ทิ้ง' : 'เครดิตพนักงาน',
      icon: isWaste ? 'fa-solid fa-trash-can' : 'fa-solid fa-user-check',
      badgeClass: isWaste ? 'badge-cat-waste' : 'badge-cat-credit',
      name: `${name} (${qty} ${uom}${log.note ? ' - ' + log.note : ''})`,
      amount: lossCost,
      paymentLabel: 'ตัดสต็อก',
      paymentClass: 'badge-stock',
      date: log.created_at ? log.created_at.substring(0, 10) : '',
      created_at: log.created_at,
      timestamp: new Date((log.created_at || '').replace(' ', 'T')).getTime(),
      staffName: log.staff_name || log.note || '-'
    });
  });

  // Sort descending by created_at / timestamp
  return list.sort((a, b) => b.timestamp - a.timestamp);
});

const filteredLedgerEntries = computed(() => {
  let list = allLedgerEntries.value;
  if (filterCategory.value !== 'all') {
    list = list.filter(item => {
      if (filterCategory.value === 'cooking_oil') {
        return item.category === 'cooking_oil' || item.category === 'fuel_oil';
      }
      return item.category === filterCategory.value;
    });
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(item => {
      const n = (item.name || '').toLowerCase();
      const s = (item.staffName || '').toLowerCase();
      const c = (item.categoryLabel || '').toLowerCase();
      return n.includes(q) || s.includes(q) || c.includes(q);
    });
  }
  return list;
});

const filteredLedgerTotal = computed(() => {
  return filteredLedgerEntries.value.reduce((sum, item) => {
    if (item.type !== 'expense' && item.isCancelled) return sum;
    if (item.isRefund) return sum - (Number(item.amount) || 0);
    return sum + (Number(item.amount) || 0);
  }, 0);
});

const totalLedgerPages = computed(() => {
  return Math.ceil(filteredLedgerEntries.value.length / ledgerPerPage) || 1;
});

const paginatedLedgerEntries = computed(() => {
  const start = (ledgerCurrentPage.value - 1) * ledgerPerPage;
  return filteredLedgerEntries.value.slice(start, start + ledgerPerPage);
});

const getEntryCountByCategory = (catId) => {
  return allLedgerEntries.value.filter(item => {
    if (catId === 'cooking_oil') return item.category === 'cooking_oil' || item.category === 'fuel_oil';
    return item.category === catId;
  }).length;
};

// Calculations for Financial Summary
const totalRevenue = computed(() => {
  return orders.value
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
});

const revenueBreakdown = computed(() => {
  let cash = 0;
  let qr = 0;
  orders.value.forEach(o => {
    if (o.status !== 'completed') return;
    if (o.payment_method === 'cash') cash += Number(o.total) || 0;
    else qr += Number(o.total) || 0;
  });
  return { cash, qr };
});

const totalExpenses = computed(() => {
  return expenses.value.reduce((sum, e) => {
    if (e.is_refund === 1 || e.status === 'refund') return sum - (Number(e.amount) || 0);
    return sum + (Number(e.amount) || 0);
  }, 0);
});

const expenseBreakdown = computed(() => {
  let cash = 0;
  let transfer = 0;
  expenses.value.forEach(e => {
    const amt = Number(e.amount) || 0;
    const mult = (e.is_refund === 1 || e.status === 'refund') ? -1 : 1;
    if (e.payment_method === 'cash') cash += (amt * mult);
    else transfer += (amt * mult);
  });
  return { cash: Math.max(0, cash), transfer: Math.max(0, transfer) };
});

const wasteCost = computed(() => {
  const menuMap = new Map();
  const menuByNameMap = new Map();
  menuItems.value.forEach(m => {
    if (m && m.id !== undefined && m.id !== null) {
      menuMap.set(Number(m.id), m);
      menuMap.set(String(m.id), m);
    }
    if (m && m.name) {
      menuByNameMap.set(m.name.trim().toLowerCase(), m);
    }
  });
  return rawStockLogs.value
    .filter(l => l.reason === 'waste' && l.status !== 'cancelled')
    .reduce((sum, l) => {
      const item = (l.menu_item_id ? (menuMap.get(Number(l.menu_item_id)) || menuMap.get(String(l.menu_item_id))) : null) ||
                   (l.item_name ? menuByNameMap.get(String(l.item_name).trim().toLowerCase()) : null);
      const price = (item && Number(item.price) > 0)
        ? Number(item.price)
        : (Number(l.item_price) > 0 ? Number(l.item_price) : 0);
      return sum + (Math.abs(Number(l.change_qty) || 0) * price);
    }, 0);
});

const staffCreditCost = computed(() => {
  const menuMap = new Map();
  const menuByNameMap = new Map();
  menuItems.value.forEach(m => {
    if (m && m.id !== undefined && m.id !== null) {
      menuMap.set(Number(m.id), m);
      menuMap.set(String(m.id), m);
    }
    if (m && m.name) {
      menuByNameMap.set(m.name.trim().toLowerCase(), m);
    }
  });
  return rawStockLogs.value
    .filter(l => l.reason === 'staff_benefit' && l.status !== 'cancelled')
    .reduce((sum, l) => {
      const item = (l.menu_item_id ? (menuMap.get(Number(l.menu_item_id)) || menuMap.get(String(l.menu_item_id))) : null) ||
                   (l.item_name ? menuByNameMap.get(String(l.item_name).trim().toLowerCase()) : null);
      const price = (item && Number(item.price) > 0)
        ? Number(item.price)
        : (Number(l.item_price) > 0 ? Number(l.item_price) : 0);
      return sum + (Math.abs(Number(l.change_qty) || 0) * price);
    }, 0);
});

const totalWasteAndCreditCost = computed(() => {
  return wasteCost.value + staffCreditCost.value;
});

// กองทุนเงินประกันพนักงานที่ถือครองอยู่ (Staff Guarantee Working Capital)
const activeHeldGuaranteesTotal = computed(() => {
  return guarantees.value
    .filter(g => g.status === 'held')
    .reduce((sum, g) => sum + (Number(g.amount) || 0), 0);
});

const activeHeldGuaranteesCount = computed(() => {
  return guarantees.value.filter(g => g.status === 'held').length;
});

// คงเหลือสุทธิ = รายรับรวม - รายจ่ายรวม - ของเสีย/เครดิต
const netProfit = computed(() => {
  return totalRevenue.value - totalExpenses.value - totalWasteAndCreditCost.value;
});

// การจัดสรรส่วนแบ่งกำไร (60% ร้าน/บริหาร, 40% ผู้ร่วมทุน)
const profitShare60 = computed(() => {
  return (netProfit.value || 0) * 0.6;
});

const profitShare40 = computed(() => {
  return (netProfit.value || 0) * 0.4;
});

// Analytics Breakdown Stats (Expenses + Waste + Credit)
const allCostBreakdownStats = computed(() => {
  const totalCost = (totalExpenses.value + totalWasteAndCreditCost.value) || 1;
  const map = {};

  categoryList.forEach(c => {
    map[c.id] = { ...c, total: 0, color: 'var(--primary-light, #ad281e)' };
  });
  map['raw_chicken'].color = '#ad281e';
  map['ice'].color = '#0284c7';
  map['cooking_oil'].color = 'var(--accent, #ffab2b)';
  map['fuel_transport'].color = 'var(--accent-dark, #cc8000)';
  map['gas_lpg'].color = 'var(--primary, #8b0313)';
  map['salary'].color = 'var(--success, #2a9d8f)';
  map['waste_loss'] = { id: 'waste_loss', name: 'ของเสีย/ทิ้ง', icon: 'fa-solid fa-trash-can', color: 'var(--danger, #ad281e)', total: wasteCost.value };
  map['credit_loss'] = { id: 'credit_loss', name: 'เครดิตพนักงาน', icon: 'fa-solid fa-user-check', color: 'var(--accent, #ffab2b)', total: staffCreditCost.value };

  expenses.value.forEach(e => {
    const amt = Number(e.amount) || 0;
    const key = (e.category === 'fuel_oil') ? 'cooking_oil' : (map[e.category] ? e.category : 'other');
    if (map[key]) {
      if (e.is_refund === 1 || e.status === 'refund') {
        map[key].total = Math.max(0, map[key].total - amt);
      } else {
        map[key].total += amt;
      }
    }
  });

  return Object.values(map)
    .filter(c => c.total > 0)
    .map(c => ({
      ...c,
      percentage: Math.round((c.total / totalCost) * 1000) / 10
    }))
    .sort((a, b) => b.total - a.total);
});

const topExpenses = computed(() => {
  return expenses.value
    .filter(e => e.status !== 'cancelled' && !e.is_refund && e.status !== 'refund')
    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
    .slice(0, 5);
});

// Data Loading
const loadData = async () => {
  ledgerLoading.value = true;
  try {
    const params = { status: 'completed', branch_id: props.branchId || '' };
    const expenseParams = { branch_id: props.branchId || '' };
    const guaranteeParams = { branch_id: props.branchId || '' };
    const stockLogParams = { branch_id: props.branchId || '', limit: 500 };

    if (activePeriodMode.value === 'daily') {
      params.date = activeDate.value;
      expenseParams.date = activeDate.value;
      stockLogParams.date = activeDate.value;
    } else if (activePeriodMode.value === 'monthly') {
      params.month = activeMonth.value;
      expenseParams.month = activeMonth.value;
      stockLogParams.month = activeMonth.value;
    } else {
      params.year = activeYear.value;
      expenseParams.year = activeYear.value;
      stockLogParams.year = activeYear.value;
    }

    const [ordersRes, expensesRes, guaranteesRes, menuRes, stockLogsRes] = await Promise.all([
      api.orders.getAll(params),
      api.expenses.get(expenseParams),
      api.employees.getGuarantees(guaranteeParams),
      api.menu.getAll({ all_branches: 'true', branch_id: props.branchId || '' }),
      api.stock.getAllLogs(stockLogParams)
    ]);

    orders.value = (ordersRes && ordersRes.success) ? (ordersRes.data || []) : [];
    expenses.value = (expensesRes && expensesRes.success) ? (expensesRes.data || []) : [];
    guarantees.value = (guaranteesRes && guaranteesRes.success) ? (guaranteesRes.data || []) : [];
    menuItems.value = (menuRes && menuRes.success) ? (menuRes.data || []) : [];
    rawStockLogs.value = (stockLogsRes && stockLogsRes.success) ? (stockLogsRes.data || []) : [];
  } catch (err) {
    console.error('Failed to load ledger data:', err);
  } finally {
    ledgerLoading.value = false;
  }
};

const handleAddExpense = async () => {
  if (!expenseForm.value.amount || expenseForm.value.amount <= 0) return;
  saving.value = true;
  try {
    const res = await api.expenses.create({
      amount: expenseForm.value.amount,
      category: expenseForm.value.category,
      note: expenseForm.value.note,
      expense_date: activeDate.value,
      payment_method: expenseForm.value.payment_method || 'transfer',
      branch_id: props.branchId
    });
    if (res.success) {
      ui.showToast('บันทึกค่าใช้จ่ายสำเร็จ', 'success');
      const curCat = expenseForm.value.category;
      const curPm = expenseForm.value.payment_method;
      expenseForm.value = { amount: null, category: curCat, note: '', payment_method: curPm };
      if (res.data) {
        expenses.value.unshift(res.data);
      } else {
        await loadData();
      }
      // Auto switch to list tab to see new entry
      activeSubTab.value = 'list';
    }
  } catch (err) {
    ui.showToast('บันทึกไม่สำเร็จ: ' + err.message, 'error');
  } finally {
    saving.value = false;
  }
};

const reversingEntryId = ref(null);

const handleReverseEntry = async (item) => {
  if (item.type === 'expense') {
    const isSalary = item.category === 'salary';
    const isAdvance = isSalary && (item.name && item.name.includes('เบิกเงินล่วงหน้า'));
    const isPayroll = isSalary && !isAdvance;

    let msg = '';
    if (isAdvance) {
      msg = `ต้องการยกเลิกรายการ "${item.name}" (${formatCurrency(item.amount)}) ใช่หรือไม่?\n\nเมื่อยกเลิก ระบบจะ:\n1. บันทึกคืนเงิน (+${formatCurrency(item.amount)}) เพื่อหักล้างรายจ่ายและปรับยอดเงินสดในลิ้นชักกลับมาถูกต้อง\n2. ยกเลิกรายการเบิกเงินล่วงหน้า (จะไม่นำไปหักค่าแรงพนักงานตอนสิ้นเดือน)`;
    } else if (isPayroll) {
      msg = `ต้องการยกเลิกและคืนยอดค่าใช้จ่ายค่าแรง "${item.name}" (${formatCurrency(item.amount)}) ใช่หรือไม่?\n\nเมื่อยกเลิก ระบบจะ:\n1. บันทึกคืนเงิน (+${formatCurrency(item.amount)}) เพื่อหักล้างรายจ่ายและปรับยอดเงินสดในลิ้นชักกลับมาถูกต้อง\n2. ปลดล็อกวันทำงาน/OT ให้กลับสู่สถานะรอคำนวณเงินเดือนใหม่`;
    } else {
      msg = `ต้องการยกเลิกและคืนยอดรายจ่าย "${item.name}" (${formatCurrency(item.amount)}) ใช่หรือไม่?\n\nระบบจะบันทึกแถวคืนเงิน (+${formatCurrency(item.amount)}) เพื่อหักล้างรายจ่ายและปรับยอดเงินสดในลิ้นชักกลับมาถูกต้อง`;
    }

    const confirmed = await ui.showConfirm('ยืนยันยกเลิก & คืนยอด', msg);
    if (!confirmed) return;

    reversingEntryId.value = item.entryKey;
    try {
      const res = await api.expenses.reverse(item.id);
      if (res.success) {
        ui.showToast('ยกเลิกรายการและคืนยอดสำเร็จ', 'success');
        await loadData();
      }
    } catch (err) {
      ui.showToast(err.message || 'ยกเลิกรายการไม่สำเร็จ', 'error');
    } finally {
      reversingEntryId.value = null;
    }
  } else if (item.type === 'waste_loss' || item.type === 'credit_loss') {
    const confirmed = await ui.showConfirm(
      'ยืนยันคืนสต็อกเข้าคลัง',
      `ต้องการยกเลิกรายการ "${item.name}" และคืนจำนวนสต็อกเข้าคลังสินค้าใช่หรือไม่?`
    );
    if (!confirmed) return;

    reversingEntryId.value = item.entryKey;
    try {
      const res = await api.stock.reverseLog(item.id);
      if (res.success) {
        ui.showToast('ยกเลิกรายการและคืนสต็อกเข้าคลังสำเร็จ', 'success');
        await loadData();
      }
    } catch (err) {
      ui.showToast(err.message || 'ยกเลิกรายการไม่สำเร็จ', 'error');
    } finally {
      reversingEntryId.value = null;
    }
  }
};

const exportLedgerCSV = () => {
  if (!filteredLedgerEntries.value || filteredLedgerEntries.value.length === 0) return;
  let csvContent = '\uFEFFวัน-เวลา,ประเภท,ชื่อรายการ,ช่องทาง,จำนวนเงิน(บาท),ผู้บันทึก\n';
  filteredLedgerEntries.value.forEach(item => {
    const time = `"${formatDate(item.date)} ${formatTime(item.created_at)}"`;
    const cat = `"${item.categoryLabel}"`;
    const note = `"${(item.name || '').replace(/"/g, '""')}"`;
    const pm = `"${item.paymentLabel}"`;
    const amt = item.amount || 0;
    const staff = `"${(item.staffName || '').replace(/"/g, '""')}"`;
    csvContent += `${time},${cat},${note},${pm},${amt},${staff}\n`;
  });
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `ledger_expenses_${activeDate.value}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const getCategoryLabel = (cat) => {
  const map = {
    'raw_chicken': 'ไก่สด',
    'ice': 'น้ำแข็ง',
    'cooking_oil': 'น้ำมันพืช',
    'fuel_transport': 'น้ำมันรถ',
    'fuel_oil': 'น้ำมันพืช',
    'gas_lpg': 'แก๊ส LPG',
    'sticky_rice': 'ข้าวเหนียว',
    'meatballs': 'ลูกชิ้น',
    'salapao': 'ซาลาเปา',
    'packaging': 'บรรจุภัณฑ์',
    'salary': 'เงินเดือน/ค่าแรง',
    'utility_bills': 'ค่าน้ำ/ไฟ/เน็ต',
    'debt': 'หนี้/ยอดค้าง',
    'other': 'อื่นๆ'
  };
  return map[cat] || cat;
};

const getFilterCategoryLabel = (cat) => {
  if (cat === 'waste_loss') return 'ของเสีย/ทิ้ง';
  if (cat === 'credit_loss') return 'เครดิตพนักงาน';
  return getCategoryLabel(cat);
};

const getExpenseCategoryIcon = (cat) => {
  const map = {
    'raw_chicken': 'fa-solid fa-drumstick-bite',
    'ice': 'fa-solid fa-cube',
    'cooking_oil': 'fa-solid fa-bottle-droplet',
    'fuel_transport': 'fa-solid fa-gas-pump',
    'fuel_oil': 'fa-solid fa-bottle-droplet',
    'gas_lpg': 'fa-solid fa-fire',
    'sticky_rice': 'fa-solid fa-bowl-rice',
    'meatballs': 'fa-solid fa-circle',
    'salapao': 'fa-solid fa-cookie',
    'packaging': 'fa-solid fa-box',
    'salary': 'fa-solid fa-hand-holding-dollar',
    'utility_bills': 'fa-solid fa-bolt',
    'debt': 'fa-solid fa-file-invoice-dollar',
    'other': 'fa-solid fa-paperclip'
  };
  return map[cat] || 'fa-solid fa-wallet';
};

watch(() => [props.branchId, props.selectedDate, props.selectedMonth, props.selectedYear, props.periodMode], () => {
  loadData();
});

onMounted(() => {
  loadData();
});
</script>

<style scoped>
/* 1. Sub-tab Navigation (Consistent with StaffManagement) */
.category-tabs .btn {
  font-size: var(--font-sm);
  padding: 8px 16px;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast, 0.15s ease);
}

.category-tabs .btn.active {
  background: var(--primary);
  color: #ffffff;
  font-weight: var(--font-weight-bold, 700);
  box-shadow: 0 4px 12px var(--primary-glow, rgba(139, 3, 19, 0.25));
}

/* 2. Step Section & Form Labels */
.form-step-section {
  display: flex;
  flex-direction: column;
}

.form-section-label {
  font-size: var(--font-sm);
  font-weight: var(--font-weight-bold, 700);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-full, 9999px);
  background: var(--primary);
  color: #ffffff;
  font-size: var(--font-xxs, 11px);
  font-weight: var(--font-weight-bold, 700);
}

/* 3. Category 12 Buttons Grid */
.category-grid-12 {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
}

.category-card-btn {
  background: #ffffff;
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-md, 12px);
  padding: 14px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
  user-select: none;
  min-height: 90px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

.category-card-btn:hover {
  border-color: var(--primary-light);
  background: rgba(139, 3, 19, 0.03);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--primary-glow, rgba(139, 3, 19, 0.12));
}

.category-card-btn.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #ffffff;
  box-shadow: 0 4px 14px var(--primary-glow, rgba(139, 3, 19, 0.3));
  transform: translateY(-2px);
}

.cat-icon-wrap {
  font-size: 1.75rem;
  line-height: 1;
  color: var(--text-secondary);
  transition: color var(--transition-fast, 0.15s ease);
}

.category-card-btn.active .cat-icon-wrap {
  color: #ffffff;
}

.cat-name {
  font-size: var(--font-sm, 13.5px);
  font-weight: var(--font-weight-bold, 700);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  color: var(--text-primary);
}

.category-card-btn.active .cat-name {
  color: #ffffff;
}

/* 4. Payment Toggle */
.payment-toggle-fullwidth {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md, 12px);
}

.payment-toggle-btn {
  background: #ffffff;
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-md, 12px);
  padding: var(--space-md, 12px) var(--space-lg, 16px);
  font-size: var(--font-sm);
  font-weight: var(--font-weight-bold, 700);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm, 8px);
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
  min-height: 48px;
}

.payment-toggle-btn:hover {
  border-color: var(--primary-light);
}

.payment-toggle-btn.active {
  background: var(--primary);
  color: #ffffff;
  border-color: var(--primary);
  box-shadow: 0 3px 10px var(--primary-glow, rgba(139, 3, 19, 0.25));
}

/* 5. Inputs & Quick Buttons Full Row */
.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.input-icon {
  position: absolute;
  left: 14px;
  color: var(--text-tertiary);
  font-size: 1rem;
}

.custom-input {
  height: 46px;
  font-size: var(--font-base);
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 12px);
  color: var(--text-primary);
}

.custom-input:focus {
  border-color: var(--primary-light);
  box-shadow: 0 0 0 3px var(--primary-glow);
}

.full-width-input {
  width: 100%;
  padding-left: 42px !important;
}

.quick-amount-buttons-full {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--space-sm, 8px);
}

.btn-quick-amount {
  background: #ffffff;
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-sm, 8px);
  padding: var(--space-sm, 8px) var(--space-xs, 4px);
  font-size: var(--font-xs);
  font-weight: var(--font-weight-bold, 700);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
  text-align: center;
}

.btn-quick-amount:hover {
  background: var(--primary);
  color: #ffffff;
  border-color: var(--primary);
}

.btn-quick-amount.reset-btn {
  color: var(--danger);
  border-color: var(--danger-glow);
  background: rgba(173, 40, 30, 0.04);
}

/* 6. Quick Notes 6 Grid */
.quick-notes-grid-6 {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--space-sm, 8px);
}

.quick-note-card-btn {
  background: #ffffff;
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-sm, 8px);
  padding: var(--space-sm, 8px) var(--space-xs, 4px);
  font-size: var(--font-xs);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
  user-select: none;
}

.quick-note-card-btn:hover {
  border-color: var(--primary-light);
  color: var(--primary);
  background: rgba(139, 3, 19, 0.02);
}

.quick-note-card-btn.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #ffffff;
  box-shadow: 0 3px 10px var(--primary-glow, rgba(139, 3, 19, 0.25));
}

.submit-expense-btn {
  height: 48px;
  font-size: var(--font-base);
  font-weight: var(--font-weight-bold, 700);
  border-radius: var(--radius-md, 12px);
  background: var(--primary);
  border: none;
  color: #ffffff;
  box-shadow: 0 4px 12px var(--primary-glow);
  transition: all var(--transition-fast, 0.15s ease);
}

.submit-expense-btn:hover:not(:disabled) {
  background: var(--primary-light);
  transform: translateY(-1px);
}

/* 7. Summary Cards */
.financial-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-sm);
}

.summary-card {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  box-shadow: 0 2px 6px rgba(0,0,0,0.03);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.summary-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.summary-icon {
  font-size: var(--font-sm);
}

.summary-title {
  font-size: var(--font-xs);
  color: var(--text-secondary);
  font-weight: var(--font-weight-semibold, 600);
}

.summary-value {
  font-size: 1.25rem;
  font-weight: var(--font-weight-bold, 700);
  line-height: 1.2;
  margin-bottom: 6px;
}

.summary-sub-badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.sub-badge {
  font-size: 10px;
  background: rgba(139, 3, 19, 0.04);
  color: var(--text-secondary);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
}

.summary-formula-caption {
  font-size: 10px;
  color: var(--text-tertiary);
  font-style: italic;
}

.profit-positive {
  background: rgba(42, 157, 143, 0.04);
  border-color: rgba(42, 157, 143, 0.3);
}

.profit-negative {
  background: rgba(173, 40, 30, 0.04);
  border-color: rgba(173, 40, 30, 0.3);
}

/* 8. Enhanced Filter Chips & Search Bar */
.filter-chips-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.enhanced-filter-chip {
  background: #ffffff;
  border: 1.5px solid var(--border-color);
  border-radius: 10px;
  padding: 7px 12px;
  font-size: var(--font-xs, 0.8rem);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
  user-select: none;
}

.enhanced-filter-chip:hover {
  border-color: var(--primary-light);
  color: var(--primary);
  background: rgba(139, 3, 19, 0.02);
}

.enhanced-filter-chip.active {
  background: var(--primary);
  color: #ffffff;
  border-color: var(--primary);
  font-weight: var(--font-weight-bold, 700);
  box-shadow: 0 2px 8px var(--primary-glow);
}

.filter-count-badge {
  font-size: 10px;
  background: rgba(0,0,0,0.06);
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 700;
}

.enhanced-filter-chip.active .filter-count-badge {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

.filter-search-row {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--border-color);
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 100%;
}

.search-icon {
  position: absolute;
  left: 14px;
  color: var(--text-tertiary);
  font-size: var(--font-sm, 13px);
}

.search-input {
  padding-left: 38px !important;
  height: 40px;
  font-size: var(--font-sm);
  width: 100%;
  border-radius: var(--radius-sm);
}

.filter-summary-banner {
  background: rgba(139, 3, 19, 0.03);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm, 8px);
  padding: 10px 14px;
}

/* 9. Badges - Enlarged for clear visibility */
.category-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: var(--font-weight-bold, 700);
  background: rgba(139, 3, 19, 0.06);
  color: var(--text-primary);
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  white-space: nowrap;
}

.category-badge i {
  font-size: 13px;
}

.top-cat-badge {
  padding: 3px 8px !important;
  font-size: 11.5px !important;
  border-radius: 6px !important;
  gap: 4px !important;
  flex-shrink: 0 !important;
}

.top-cat-badge i {
  font-size: 11px !important;
}

.badge-cat-raw_chicken { background: rgba(173, 40, 30, 0.12); color: #a81c1c; border: 1px solid rgba(173, 40, 30, 0.2); }
.badge-cat-ice { background: rgba(56, 189, 248, 0.14); color: #0284c7; border: 1px solid rgba(56, 189, 248, 0.25); }
.badge-cat-cooking_oil, .badge-cat-fuel_oil { background: rgba(255, 153, 0, 0.14); color: #b26a00; border: 1px solid rgba(255, 153, 0, 0.25); }
.badge-cat-fuel_transport { background: rgba(255, 153, 0, 0.14); color: #b26a00; border: 1px solid rgba(255, 153, 0, 0.25); }
.badge-cat-gas_lpg { background: rgba(139, 3, 19, 0.12); color: var(--primary); border: 1px solid rgba(139, 3, 19, 0.2); }
.badge-cat-sticky_rice { background: rgba(42, 157, 143, 0.14); color: #1f7a6f; border: 1px solid rgba(42, 157, 143, 0.25); }
.badge-cat-meatballs { background: rgba(69, 123, 157, 0.14); color: #2a5d7e; border: 1px solid rgba(69, 123, 157, 0.25); }
.badge-cat-salapao { background: rgba(131, 56, 236, 0.12); color: #6f25d2; border: 1px solid rgba(131, 56, 236, 0.2); }
.badge-cat-packaging { background: rgba(108, 117, 125, 0.14); color: #495057; border: 1px solid rgba(108, 117, 125, 0.2); }
.badge-cat-salary { background: rgba(42, 157, 143, 0.14); color: #1f7a6f; border: 1px solid rgba(42, 157, 143, 0.25); }
.badge-cat-utility_bills { background: rgba(13, 202, 240, 0.14); color: #087990; border: 1px solid rgba(13, 202, 240, 0.25); }
.badge-cat-debt { background: rgba(173, 40, 30, 0.12); color: var(--danger); border: 1px solid rgba(173, 40, 30, 0.2); }
.badge-cat-waste, .badge-cat-waste_loss { background: rgba(173, 40, 30, 0.14); color: #a81c1c; border: 1px solid rgba(173, 40, 30, 0.25); }
.badge-cat-credit, .badge-cat-credit_loss { background: rgba(255, 153, 0, 0.14); color: #b26a00; border: 1px solid rgba(255, 153, 0, 0.25); }
.badge-cat-refund { background: rgba(52, 199, 89, 0.14); color: #1f7a3f; border: 1px solid rgba(52, 199, 89, 0.3); }

.badge-status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: var(--font-weight-bold, 700);
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  min-width: 130px;
}

.badge-status-pill i {
  font-size: 11px;
}

.table-action-btn {
  width: 130px !important;
  min-width: 130px !important;
}

.badge-refund-done {
  background: rgba(52, 199, 89, 0.14);
  color: #1f7a3f;
  border: 1px solid rgba(52, 199, 89, 0.3);
}

.badge-salary-cancelled {
  background: rgba(255, 153, 0, 0.14);
  color: #b26a00;
  border: 1px solid rgba(255, 153, 0, 0.3);
}

.badge-cancelled {
  background: rgba(108, 117, 125, 0.12);
  color: #555555;
  border: 1px solid rgba(108, 117, 125, 0.25);
}

.badge-stock-cancelled {
  background: rgba(69, 123, 157, 0.14);
  color: #2a5d7e;
  border: 1px solid rgba(69, 123, 157, 0.3);
}

.payment-method-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: var(--font-weight-bold, 700);
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.payment-method-badge i {
  font-size: 12px;
}

/* Action Reverse Button */
.btn-action-reverse {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: #ffffff;
  color: var(--primary, #8b0313);
  border: 1.5px solid rgba(139, 3, 19, 0.35);
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(139, 3, 19, 0.08);
  transition: all var(--transition-fast, 0.15s ease);
  user-select: none;
}

.btn-action-reverse:hover:not(:disabled) {
  background: rgba(139, 3, 19, 0.06);
  border-color: var(--primary, #8b0313);
  transform: translateY(-1px);
}

.btn-action-reverse:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: none;
}

.btn-action-reverse:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.badge-cash { background: rgba(42, 157, 143, 0.14); color: #1f7a6f; border: 1px solid rgba(42, 157, 143, 0.25); }
.badge-transfer { background: rgba(139, 3, 19, 0.1); color: var(--primary); border: 1px solid rgba(139, 3, 19, 0.2); }
.badge-stock { background: rgba(108, 117, 125, 0.12); color: #495057; border: 1px solid rgba(108, 117, 125, 0.2); }

/* 10. Analytics & Charts */
.analytics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
}

.category-breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-breakdown-row {
  display: flex;
  flex-direction: column;
  padding: 2px 0;
}

.progress-bar-bg {
  width: 100%;
  height: 10px;
  background: rgba(139, 3, 19, 0.06);
  border-radius: var(--radius-full, 9999px);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: var(--radius-full, 9999px);
  transition: width 0.4s ease;
}

.financial-bar-item {
  display: flex;
  flex-direction: column;
}

.profit-box-positive {
  background: rgba(42, 157, 143, 0.08) !important;
  border: 1.5px solid rgba(42, 157, 143, 0.25) !important;
  border-radius: var(--radius-md);
}

.profit-box-negative {
  background: rgba(173, 40, 30, 0.08) !important;
  border: 1.5px solid rgba(173, 40, 30, 0.25) !important;
  border-radius: var(--radius-md);
}

/* 11. Top 5 Expenses List */
.top-expenses-list {
  display: flex;
  flex-direction: column;
}

.top-expense-row {
  padding: 14px 12px;
  border-bottom: 1px solid var(--border-color);
  transition: background var(--transition-fast, 0.15s ease);
}

.top-expense-row:last-child {
  border-bottom: none;
}

.top-expense-row:hover {
  background: rgba(139, 3, 19, 0.02);
  border-radius: var(--radius-sm);
}

.rank-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: var(--font-xs);
  font-weight: var(--font-weight-bold, 700);
  background: rgba(139, 3, 19, 0.06);
  color: var(--text-secondary);
  flex-shrink: 0;
}

.rank-indicator.rank-1 {
  background: #ffab2b;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(255, 171, 43, 0.35);
}

.rank-indicator.rank-2 {
  background: #9c7b63;
  color: #ffffff;
}

.rank-indicator.rank-3 {
  background: #bc9e88;
  color: #ffffff;
}

.top-expense-note {
  font-size: var(--font-sm);
}

.expense-mobile-card {
  background: #ffffff;
  border: 1px solid rgba(139, 3, 19, 0.12);
  border-radius: var(--radius-md, 12px);
  padding: 14px 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.expense-mobile-card .category-badge {
  padding: 3px 8px;
  font-size: 11px;
  border-radius: 6px;
  gap: 4px;
}

.expense-mobile-card .category-badge i {
  font-size: 11px;
}

.expense-mobile-card .payment-method-badge {
  padding: 3px 8px;
  font-size: 11px;
  border-radius: 6px;
  gap: 4px;
}

.expense-mobile-card .payment-method-badge i {
  font-size: 10px;
}

.expense-mobile-card .badge-status-pill {
  min-width: unset;
  padding: 3px 8px;
  font-size: 11px;
  border-radius: 6px;
  gap: 4px;
}

/* Responsive Grids */
@media (max-width: 1100px) {
  .category-grid-12 {
    grid-template-columns: repeat(auto-fill, minmax(115px, 1fr));
    gap: 10px;
  }
  .category-card-btn {
    min-height: 80px;
    padding: 12px 6px;
    gap: 6px;
  }
  .cat-icon-wrap {
    font-size: 1.5rem;
  }
  .cat-name {
    font-size: 12.5px;
  }
  .quick-notes-grid-6 {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .financial-summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .analytics-grid {
    grid-template-columns: 1fr;
  }
  .category-grid-12 {
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .category-card-btn {
    min-height: 72px;
    padding: 10px 4px;
    gap: 5px;
  }
  .cat-icon-wrap {
    font-size: 1.35rem;
  }
  .cat-name {
    font-size: 12px;
  }
  .quick-notes-grid-6 {
    grid-template-columns: repeat(3, 1fr);
  }
  .quick-amount-buttons-full {
    grid-template-columns: repeat(3, 1fr);
  }
  .search-input-wrapper {
    max-width: 100%;
  }
}

@media (max-width: 768px) {
  .hide-mobile {
    display: none !important;
  }
  .mobile-menu-list-container {
    display: block !important;
  }
  .category-grid-12 {
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
  .category-card-btn {
    min-height: 56px;
    padding: 6px 3px;
    border-radius: 10px;
  }
  .cat-icon-wrap {
    font-size: 1.2rem;
  }
  .cat-name {
    font-size: 11.5px;
  }
  .quick-notes-grid-6 {
    grid-template-columns: repeat(2, 1fr);
  }
  .quick-amount-buttons-full {
    grid-template-columns: repeat(3, 1fr);
  }
  /* Profit Sharing 60/40 Stack on Mobile */
  .profit-sharing-section .grid.grid-2 {
    grid-template-columns: 1fr !important;
  }
  /* Top Expenses on Mobile */
  .top-expense-row {
    padding: 10px 8px;
  }
  .top-expense-note {
    font-size: 12px;
  }
  .rank-indicator {
    width: 24px;
    height: 24px;
    font-size: 11px;
  }
}

/* 13. Loading Overlay */
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
