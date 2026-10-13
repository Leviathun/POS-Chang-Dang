<template>
  <div class="staff-management-wrapper card p-md" style="background: #ffffff; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
    
    <!-- Sub-tab Navigation for Staff Management -->
    <div class="category-tabs mb-lg flex gap-xs" style="overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 6px; flex-wrap: nowrap;">
      <button 
        class="btn btn-secondary" 
        :class="{ 'active': activeSubTab === 'employees' }"
        @click="activeSubTab = 'employees'"
        style="white-space: nowrap; flex-shrink: 0;"
      >
        <i class="fa-solid fa-users"></i> รายชื่อ & ค่าจ้าง
      </button>
      <button 
        class="btn btn-secondary" 
        :class="{ 'active': activeSubTab === 'calendar' }"
        @click="activeSubTab = 'calendar'"
        style="white-space: nowrap; flex-shrink: 0;"
      >
        <i class="fa-solid fa-calendar-days"></i> ปฏิทินรายบุคคล
      </button>
      <button 
        class="btn btn-secondary" 
        :class="{ 'active': activeSubTab === 'attendance' }"
        @click="activeSubTab = 'attendance'"
        style="white-space: nowrap; flex-shrink: 0;"
      >
        <i class="fa-solid fa-calendar-check"></i> บันทึกเวลา & การลา
      </button>
      <button 
        class="btn btn-secondary" 
        :class="{ 'active': activeSubTab === 'event_ot' }"
        @click="activeSubTab = 'event_ot'"
        style="white-space: nowrap; flex-shrink: 0;"
      >
        <i class="fa-solid fa-tags"></i> OT งานพิเศษ
      </button>
      <button 
        class="btn btn-secondary" 
        :class="{ 'active': activeSubTab === 'advances' }"
        @click="activeSubTab = 'advances'"
        style="white-space: nowrap; flex-shrink: 0;"
      >
        <i class="fa-solid fa-hand-holding-dollar"></i> เบิกเงินล่วงหน้า
      </button>
      <button 
        v-if="isAdminUser"
        class="btn btn-secondary" 
        :class="{ 'active': activeSubTab === 'payroll' }"
        @click="activeSubTab = 'payroll'"
        style="white-space: nowrap; flex-shrink: 0;"
      >
        <i class="fa-solid fa-file-invoice-dollar"></i> คำนวณ & จ่ายเงินเดือน
      </button>
    </div>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- SUBTAB 1: พนักงาน & อัตราค่าจ้าง (Staff & Compensation) -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <div v-if="activeSubTab === 'employees'" class="flex flex-col gap-md">
      <div class="card p-md flex flex-between align-center flex-wrap gap-sm" style="background: rgba(139, 3, 19, 0.02); border: 1px solid var(--border-color);">
        <div>
          <h3 class="font-bold text-base flex align-center gap-xs" style="margin: 0; color: var(--text-primary);">
            <i class="fa-solid fa-id-card text-primary"></i> ข้อมูลพนักงานและอัตราค่าแรง
          </h3>
          <p class="text-xs text-secondary mt-xs" style="margin-bottom: 0;">
            กำหนดอัตราค่าจ้างรายวัน, ระดับทักษะ (ฝึกงาน/ประจำ/เชี่ยวชาญ) และสวัสดิการพนักงาน
          </p>
        </div>
      </div>

      <!-- Desktop & Tablet Table View -->
      <div class="hide-mobile card p-0 overflow-hidden" style="border: 1px solid var(--border-color);">
        <div style="overflow-x: auto;">
          <table class="table w-full" style="border-collapse: collapse;">
            <thead>
              <tr style="background: rgba(139, 3, 19, 0.03); border-bottom: 1px solid var(--border-color);">
                <th class="text-center p-md">ชื่อพนักงาน</th>
                <th class="text-center p-md">บทบาทระบบ</th>
                <th class="text-center p-md">ระดับทักษะ</th>
                <th class="text-center p-md">อัตราค่าจ้าง</th>
                <th class="text-center p-md">สวัสดิการ</th>
                <th v-if="isAdminUser" class="text-center p-md">จัดการค่าแรง</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loadingEmployees">
                <td colspan="6" class="text-center" style="padding: var(--space-3xl) var(--space-md) !important;"><div class="spinner mx-auto"></div></td>
              </tr>
              <tr v-else-if="employees.length === 0">
                <td colspan="6" class="text-center" style="padding: var(--space-3xl) var(--space-md) !important; color: var(--text-secondary);">
                  <div class="flex flex-col align-center justify-center gap-xs">
                    <i class="fa-solid fa-users-slash text-secondary" style="font-size: 2rem; opacity: 0.35;"></i>
                    <div class="font-bold text-sm">ไม่พบข้อมูลพนักงาน</div>
                  </div>
                </td>
              </tr>
              <tr 
                v-else 
                v-for="emp in employees" 
                :key="emp.id"
                class="table-row-hover"
                style="border-bottom: 1px solid var(--border-color);"
              >
                <td class="text-center p-md">
                  <div class="font-bold text-base text-primary">{{ emp.name }}</div>
                  <div class="text-xs text-secondary mt-2xs">
                    <span class="font-bold text-primary">รหัส PIN: {{ emp.pin }}</span>
                  </div>
                </td>
                <td class="text-center p-md">
                  <span class="capsule-badge" :class="emp.role === 'admin' ? 'badge-primary' : emp.role === 'manager' ? 'badge-warning' : 'badge-neutral'">
                    {{ getRoleLabel(emp.role) }}
                  </span>
                </td>
                <td class="text-center p-md">
                  <span class="skill-badge" :class="emp.skill_level">
                    <i :class="getSkillIcon(emp.skill_level)"></i> {{ getSkillLabel(emp.skill_level) }}
                  </span>
                </td>
                <td class="text-center p-md font-bold text-base" style="color: var(--text-primary);">
                  {{ formatCurrency(emp.wage_rate) }} <span class="text-xs text-secondary font-normal">/ {{ emp.wage_type === 'monthly' ? 'เดือน' : 'วัน' }}</span>
                </td>
                <td class="text-center p-md">
                  <span class="benefit-tag">
                    <i class="fa-solid fa-bowl-rice text-warning"></i> {{ emp.benefits || 'ข้าวเที่ยงฟรี' }}
                  </span>
                </td>
                <td v-if="isAdminUser" class="text-center p-md">
                  <button class="btn-action btn-action-edit" @click="openEditCompensationModal(emp)">
                    <i class="fa-solid fa-sliders"></i> ปรับค่าแรง
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mobile Card List View -->
      <div class="show-mobile-flex staff-mobile-card-list">
        <div v-if="loadingEmployees" class="card text-center p-xl"><div class="spinner mx-auto"></div></div>
        <div v-else-if="employees.length === 0" class="card text-center p-xl text-secondary">ไม่พบข้อมูลพนักงาน</div>
        <div 
          v-else 
          v-for="emp in employees" 
          :key="'m-emp-' + emp.id"
          class="staff-mobile-card"
        >
          <div class="flex flex-between align-center gap-xs">
            <div>
              <div class="font-bold text-primary" style="font-size: 16px; line-height: 1.3;">{{ emp.name }}</div>
              <div class="text-xs text-secondary" style="margin-top: 4px;">
                <span class="font-bold text-primary" style="font-size: 12px;">รหัส PIN: {{ emp.pin }}</span>
              </div>
            </div>
            <div class="flex gap-2xs flex-wrap justify-end" style="gap: 4px;">
              <span class="capsule-badge" :class="emp.role === 'admin' ? 'badge-primary' : emp.role === 'manager' ? 'badge-warning' : 'badge-neutral'" style="font-size: 11px; padding: 3px 8px;">
                {{ getRoleLabel(emp.role) }}
              </span>
              <span class="skill-badge" :class="emp.skill_level" style="font-size: 11px; padding: 3px 8px;">
                <i :class="getSkillIcon(emp.skill_level)"></i> {{ getSkillLabel(emp.skill_level) }}
              </span>
            </div>
          </div>
          <div class="flex flex-between align-center text-sm staff-mobile-divider">
            <div>
              <span class="text-secondary text-xs">อัตราค่าจ้าง:</span>
              <span class="font-bold text-base text-primary ml-xs" style="font-size: 15px;">{{ formatCurrency(emp.wage_rate) }}</span>
              <span class="text-xs text-secondary"> / {{ emp.wage_type === 'monthly' ? 'เดือน' : 'วัน' }}</span>
            </div>
            <span class="benefit-tag" style="font-size: 11px; padding: 3px 9px;">
              <i class="fa-solid fa-bowl-rice text-warning"></i> {{ emp.benefits || 'ข้าวเที่ยงฟรี' }}
            </span>
          </div>
          <div v-if="isAdminUser" style="margin-top: 2px;">
            <button class="btn btn-secondary w-full" style="height: 40px; font-size: 13px; font-weight: 600; border-radius: var(--radius-md);" @click="openEditCompensationModal(emp)">
              <i class="fa-solid fa-sliders mr-xs"></i> ปรับค่าแรงและสวัสดิการ
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- SUBTAB 2: ปฏิทินงาน & ค่าแรงรายบุคคล (Individual Calendar) -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <div v-if="activeSubTab === 'calendar'" class="flex flex-col gap-md">
      <!-- Calendar Control Bar -->
      <div class="card p-md flex flex-col gap-sm" style="background: rgba(139, 3, 19, 0.02); border: 1px solid var(--border-color);">
        <!-- Staff Selector (Label on own line, Dropdown 100% full width) -->
        <div class="flex flex-col gap-2xs" style="width: 100%;">
          <label class="font-bold text-sm text-secondary flex align-center gap-xs" style="margin-bottom: 2px;">
            <i class="fa-solid fa-user text-primary"></i> เลือกพนักงาน:
          </label>
          <div class="custom-select-wrapper" style="width: 100%; position: relative;" @click.stop>
            <div 
              class="custom-select-trigger" 
              :class="{ 'active': isCalendarStaffDropdownOpen }" 
              @click="toggleCalendarStaffDropdown"
              style="height: 40px; width: 100%; padding: 0 32px 0 var(--space-md); display: flex; align-items: center; cursor: pointer; border-radius: var(--radius-md); font-weight: bold; font-size: var(--font-sm);"
            >
              <span class="custom-select-text" style="width: 100%;">
                {{ currentCalendarStaff ? `${currentCalendarStaff.name} (${getSkillLabel(currentCalendarStaff.skill_level)})` : 'เลือกพนักงาน' }}
              </span>
            </div>
            <div v-if="isCalendarStaffDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 4px); width: 100%; max-height: 220px; z-index: 1000; overflow-x: hidden;">
              <div 
                v-for="emp in employees" 
                :key="emp.id" 
                class="custom-select-option" 
                :class="{ 'selected': calendarSelectedStaffId === emp.id }" 
                @click="selectCalendarStaff(emp.id)"
                style="width: 100%; box-sizing: border-box;"
              >
                {{ emp.name }} ({{ getSkillLabel(emp.skill_level) }})
              </div>
            </div>
          </div>
        </div>

        <!-- Month Navigation Bar (Spans full width, arrows locked at far ends) -->
        <div class="flex align-center gap-xs" style="width: 100%;">
          <button type="button" class="picker-nav-btn flex-shrink-0" @click="adjustCalendarMonth(-1)" title="เดือนก่อนหน้า">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          
          <!-- Custom Month Picker for Calendar (Fills remaining width between arrows) -->
          <div class="custom-select-wrapper" style="flex: 1; min-width: 0; width: 100%; position: relative;" @click.stop>
            <div 
              class="picker-trigger-btn" 
              :class="{ 'active': isCalendarMonthDropdownOpen }" 
              @click="toggleCalendarMonthDropdown"
              style="width: 100%; height: 38px; padding: 0 var(--space-md); justify-content: space-between; gap: 6px; font-size: 13px; white-space: nowrap;"
            >
              <span class="flex align-center gap-xs" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                <i class="fa-solid fa-calendar-days text-primary flex-shrink-0"></i>
                <span style="overflow: hidden; text-overflow: ellipsis;">{{ calendarMonthLabel }}</span>
              </span>
              <i class="fa-solid fa-chevron-down text-xs text-secondary ml-xs flex-shrink-0"></i>
            </div>

            <!-- Month Dropdown Grid -->
            <div v-if="isCalendarMonthDropdownOpen" class="custom-select-dropdown monthpicker-popover dropdown-center-desktop" style="top: calc(100% + 4px); width: 280px !important; max-width: calc(100vw - 32px) !important; max-height: none !important; overflow: visible !important; padding: var(--space-sm); display: flex; flex-direction: column; gap: var(--space-sm); z-index: 1000;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: var(--space-xs);">
                <button type="button" class="picker-nav-btn" style="height: 32px !important; width: 32px !important; min-width: 32px !important;" @click.stop="adjustCalendarMonthPickerYear(-1)">
                  <i class="fa-solid fa-chevron-left"></i>
                </button>
                <span class="font-bold">ปี พ.ศ. {{ calendarMonthPickerYear + 543 }}</span>
                <button type="button" class="picker-nav-btn" style="height: 32px !important; width: 32px !important; min-width: 32px !important;" @click.stop="adjustCalendarMonthPickerYear(1)">
                  <i class="fa-solid fa-chevron-right"></i>
                </button>
              </div>
              <div class="month-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
                <button 
                  v-for="(mName, idx) in thaiMonthsShort" 
                  :key="idx" 
                  type="button" 
                  class="btn btn-secondary btn-sm"
                  :class="{ 'btn-primary active': isCalendarMonthPickerSelected(idx + 1) }"
                  @click="selectCalendarMonthPicker(idx + 1)"
                >
                  {{ mName }}
                </button>
              </div>
            </div>
          </div>

          <button type="button" class="picker-nav-btn flex-shrink-0" @click="adjustCalendarMonth(1)" title="เดือนถัดไป">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        <!-- Sub-bar: Hint and Current Month Button -->
        <div class="flex flex-between align-center flex-wrap gap-xs" style="margin-top: 2px;">
          <div style="font-size: 11px; color: var(--text-tertiary);">
            <i class="fa-solid fa-circle-info text-primary mr-2xs" style="font-size: 10px;"></i> คลิกที่ช่องวันที่เพื่อดูสรุปรายละเอียดประจำวัน
          </div>
          <button type="button" class="picker-current-btn" style="height: 30px; padding: 0 10px; font-size: 11px; white-space: nowrap;" @click="setCalendarCurrentMonth">
            <i class="fa-solid fa-clock-rotate-left mr-2xs"></i> เดือนปัจจุบัน
          </button>
        </div>
      </div>

      <!-- Selected Staff Monthly Summary Cards -->
      <div v-if="selectedStaffSummary" class="calendar-summary-grid">
        <div class="card p-sm text-center" style="background: rgba(16, 185, 129, 0.06); border: 1px solid rgba(16, 185, 129, 0.2);">
          <div class="text-xs text-secondary mb-2xs">วันทำงานจริง</div>
          <div class="font-bold text-lg text-success">{{ selectedStaffSummary.daysWorked }} <span class="text-xs font-normal">วัน</span></div>
        </div>
        <div class="card p-sm text-center" style="background: rgba(245, 158, 11, 0.06); border: 1px solid rgba(245, 158, 11, 0.2);">
          <div class="text-xs text-secondary mb-2xs">ลา / ขาด</div>
          <div class="font-bold text-lg text-warning">{{ selectedStaffSummary.leaveDays }} / {{ selectedStaffSummary.absentDays }} <span class="text-xs font-normal">วัน</span></div>
        </div>
        <div class="card p-sm text-center" style="background: rgba(139, 3, 19, 0.05); border: 1px solid rgba(139, 3, 19, 0.15);">
          <div class="text-xs text-secondary mb-2xs">ค่าแรงสะสม</div>
          <div class="font-bold text-lg text-primary">{{ formatCurrency(selectedStaffSummary.baseWage) }}</div>
        </div>
        <div class="card p-sm text-center" style="background: rgba(147, 51, 234, 0.06); border: 1px solid rgba(147, 51, 234, 0.2);">
          <div class="text-xs text-secondary mb-2xs">OT อีเวนต์</div>
          <div class="font-bold text-lg" style="color: #9333ea;">+{{ formatCurrency(selectedStaffSummary.totalOt) }}</div>
        </div>
        <div class="card p-sm text-center" style="background: rgba(239, 68, 68, 0.06); border: 1px solid rgba(239, 68, 68, 0.2);">
          <div class="text-xs text-secondary mb-2xs">เบิกล่วงหน้า</div>
          <div class="font-bold text-lg text-danger">-{{ formatCurrency(selectedStaffSummary.totalAdvances) }}</div>
        </div>
        <div class="card p-sm text-center" style="background: rgba(245, 158, 11, 0.06); border: 1px solid rgba(245, 158, 11, 0.2);">
          <div class="text-xs text-secondary mb-2xs">ข้าวเที่ยงฟรี</div>
          <div class="font-bold text-lg text-warning">{{ selectedStaffSummary.lunchCount }} <span class="text-xs font-normal">มื้อ</span></div>
        </div>
      </div>

      <!-- Calendar Month Grid Card -->
      <div v-if="loadingMonthlyAttendance" class="card text-center p-3xl" style="border: 1px solid var(--border-color);">
        <div class="spinner mx-auto mb-sm"></div>
        <div class="text-sm font-bold text-primary">กำลังโหลดข้อมูลปฏิทิน...</div>
      </div>
      <div v-else class="card p-sm md:p-md overflow-hidden" style="border: 1px solid var(--border-color); border-radius: var(--radius-md);">
        <!-- Calendar Scroll Wrapper to prevent overflowing outside card -->
        <div class="calendar-scroll-wrapper">
          <div style="min-width: 520px; width: 100%;">
            <!-- Day of Week Headers -->
            <div class="calendar-grid-header">
              <div v-for="(wd, idx) in ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']" :key="wd" class="calendar-weekday-cell">
                <span class="hide-mobile">{{ wd }}</span>
                <span class="show-mobile-inline">{{ ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'][idx] }}</span>
              </div>
            </div>

            <!-- Days Grid -->
            <div class="calendar-grid-body">
              <!-- Offset empty cells before 1st day of month -->
              <div v-for="emptyIdx in calendarStartOffset" :key="'empty-'+emptyIdx" class="calendar-day-empty"></div>

              <!-- Active Day Cells -->
              <div 
                v-for="day in calendarDays" 
                :key="day.dateStr"
                class="calendar-day-cell"
                :class="{
                  'is-today': day.isToday,
                  'has-worked': day.status === 'present',
                  'has-leave': day.status === 'leave_unpaid',
                  'has-absent': day.status === 'absent'
                }"
                @click="openDayDetail(day)"
              >
                <!-- Day Cell Header: Day Number & Status Icon -->
                <div class="flex flex-between align-center mb-xs">
                  <span class="day-number" :class="{ 'today-badge': day.isToday }">{{ day.dayNum }}</span>
                  <span v-if="day.status === 'present'" class="status-indicator present" title="มาทำงาน">
                    <i class="fa-solid fa-circle-check"></i>
                  </span>
                  <span v-else-if="day.status === 'leave_unpaid'" class="status-indicator leave" title="ลาหยุด">
                    <i class="fa-solid fa-calendar-xmark"></i>
                  </span>
                  <span v-else-if="day.status === 'absent'" class="status-indicator absent" title="ขาดงาน">
                    <i class="fa-solid fa-circle-xmark"></i>
                  </span>
                </div>

                <!-- Day Badges / Details inside Cell -->
                <div class="day-events-list">
                  <!-- Attendance Badge -->
                  <div v-if="day.status === 'present'" class="day-badge badge-work">
                    <span>✓ ค่าแรง {{ formatCurrency(day.dailyWage) }}</span>
                    <span v-if="day.hadLunchBenefit" title="ได้รับข้าวเที่ยงฟรี">🍚</span>
                  </div>
                  <div v-else-if="day.status === 'leave_unpaid'" class="day-badge badge-leave">
                    <span>ลาหยุด (฿0)</span>
                  </div>
                  <div v-else-if="day.status === 'absent'" class="day-badge badge-absent">
                    <span>ขาดงาน (฿0)</span>
                  </div>

                  <!-- OT Events Badges -->
                  <div v-for="ot in day.ots" :key="'ot-'+ot.id" class="day-badge badge-ot" :title="'OT: ' + ot.event_name">
                    <i class="fa-solid fa-tags mr-2xs"></i> +{{ formatCurrency(ot.amount_per_person) }} ({{ ot.event_name }})
                  </div>

                  <!-- Advance Badges -->
                  <div v-for="adv in day.advances" :key="'adv-'+adv.id" class="day-badge badge-advance" :title="'เบิกล่วงหน้า: ' + formatCurrency(adv.amount)">
                    <i class="fa-solid fa-hand-holding-dollar mr-2xs"></i> -{{ formatCurrency(adv.amount) }}
                  </div>

                  <!-- Payout Badges (จ่ายค่าแรงในวันที่จ่าย) -->
                  <div 
                    v-for="pay in day.payouts" 
                    :key="'pay-'+pay.id" 
                    class="day-badge badge-payout" 
                    :title="'จ่ายค่าจ้าง: ' + formatCurrency(pay.net_paid_amount)"
                  >
                    <span><i class="fa-solid fa-receipt mr-2xs"></i> จ่ายค่าจ้าง</span>
                    <span class="font-bold">{{ formatCurrency(pay.net_paid_amount) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- SUBTAB 3: บันทึกเวลา & การลา (Attendance & Leave) -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <div v-if="activeSubTab === 'attendance'" class="flex flex-col gap-md">
      <div class="card p-md flex flex-between align-center flex-wrap gap-sm" style="background: rgba(139, 3, 19, 0.02); border: 1px solid var(--border-color);">
        <div class="flex align-center gap-md flex-wrap">
          <div class="flex align-center gap-xs font-bold text-base" style="white-space: nowrap;">
            <i class="fa-solid fa-calendar-day text-primary"></i> วันที่ลงเวลา:
          </div>

          <!-- Custom Date Picker for Attendance -->
          <div class="custom-select-wrapper" style="width: auto; position: relative;" @click.stop>
            <div 
              class="picker-trigger-btn" 
              :class="{ 'active': isAttendanceDateDropdownOpen }" 
              @click="toggleAttendanceDateDropdown"
              style="min-width: 170px; height: 38px; padding: 0 var(--space-md); justify-content: space-between; gap: var(--space-xs); font-size: var(--font-sm);"
            >
              <span class="flex align-center gap-xs">
                <i class="fa-solid fa-calendar-day text-primary"></i>
                <span>{{ attendanceDateLabel }}</span>
              </span>
              <i class="fa-solid fa-chevron-down text-xs text-secondary ml-xs"></i>
            </div>

            <!-- Date Picker Calendar Popover -->
            <div v-if="isAttendanceDateDropdownOpen" class="custom-select-dropdown datepicker-popover" style="top: calc(100% + 4px); width: 280px !important; max-width: calc(100vw - 32px) !important; max-height: none !important; overflow: visible !important; padding: var(--space-sm); display: flex; flex-direction: column; gap: var(--space-xs); z-index: 1000;">
              <!-- Header: Month & Year Selector -->
              <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: var(--space-xs); border-bottom: 1px solid var(--border-color);">
                <button type="button" class="picker-nav-btn" style="height: 32px !important; width: 32px !important; min-width: 32px !important;" @click.stop="adjustAttendanceDatePickerMonth(-1)">
                  <i class="fa-solid fa-chevron-left"></i>
                </button>
                <span class="font-bold" style="font-size: var(--font-sm);">{{ attendanceDatePickerMonthName }} {{ attendanceDatePickerYear + 543 }}</span>
                <button type="button" class="picker-nav-btn" style="height: 32px !important; width: 32px !important; min-width: 32px !important;" @click.stop="adjustAttendanceDatePickerMonth(1)">
                  <i class="fa-solid fa-chevron-right"></i>
                </button>
              </div>
              <!-- Weekday Labels -->
              <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: var(--font-xs); font-weight: bold; color: var(--text-secondary); margin-top: 4px;">
                <div v-for="day in ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']" :key="day">{{ day }}</div>
              </div>
              <!-- Days Grid -->
              <div class="calendar-days-grid">
                <div v-for="empty in attendanceDatePickerStartOffset" :key="'empty-'+empty"></div>
                <button 
                  v-for="dNum in attendanceDatePickerDaysCount" 
                  :key="dNum"
                  type="button"
                  class="calendar-day-btn"
                  :class="{ 'btn-primary selected': isAttendanceDatePickerSelected(dNum) }"
                  @click="selectAttendanceDatePickerDay(dNum)"
                >
                  {{ dNum }}
                </button>
              </div>
            </div>
          </div>

          <button type="button" class="picker-current-btn" style="height: 38px; padding: 0 10px; font-size: 12px;" @click="setTodayAttendance">
            วันนี้
          </button>
        </div>

        <button 
          class="btn btn-primary" 
          style="height: 38px; font-size: 13px;"
          :disabled="savingAttendance || attendanceRecords.length === 0"
          @click="handleSaveAttendance"
        >
          <i v-if="savingAttendance" class="fa-solid fa-spinner fa-spin"></i>
          <i v-else class="fa-solid fa-floppy-disk"></i>
          {{ savingAttendance ? 'กำลังบันทึก...' : 'บันทึกการลงเวลาวันนี้' }}
        </button>
      </div>

      <!-- Rule Notice Banner -->
      <div class="bulk-hint-box">
        <span class="hint-icon"><i class="fa-solid fa-lightbulb" style="color: var(--accent);"></i></span>
        <div class="hint-text" style="font-size: var(--font-sm); line-height: 1.6;">
          <strong>กฎระเบียบร้านช้างแดง:</strong> คิดค่าแรงตามวันที่มาปฏิบัติงานจริงเท่านั้น หากมีสถานะ <em>ลาหยุด</em> หรือ <em>ขาดงาน</em> จะไม่ได้รับค่าจ้างในวันนั้น และสิทธิข้าวเที่ยงฟรี
        </div>
      </div>

      <!-- Attendance Sheet Desktop & Tablet Table (4 Columns & Center Aligned) -->
      <div class="hide-mobile card p-0 overflow-hidden" style="border: 1px solid var(--border-color);">
        <div style="overflow-x: auto;">
          <table class="table w-full" style="border-collapse: collapse;">
            <thead>
              <tr style="background: rgba(139, 3, 19, 0.03); border-bottom: 1px solid var(--border-color);">
                <th class="text-center p-md" style="width: 28%;">พนักงาน</th>
                <th class="text-center p-md" style="width: 32%;">สถานะการทำงาน</th>
                <th class="text-center p-md" style="width: 22%;">ค่าแรงวันนี้ (บาท)</th>
                <th class="text-center p-md" style="width: 18%;">สวัสดิการข้าวเที่ยงฟรี</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loadingAttendance">
                <td colspan="4" class="text-center" style="padding: var(--space-3xl) var(--space-md) !important;"><div class="spinner mx-auto"></div></td>
              </tr>
              <tr v-else-if="attendanceRecords.length === 0">
                <td colspan="4" class="text-center" style="padding: var(--space-3xl) var(--space-md) !important; color: var(--text-secondary);">
                  <div class="flex flex-col align-center justify-center gap-xs">
                    <i class="fa-solid fa-users-slash text-secondary" style="font-size: 2rem; opacity: 0.35;"></i>
                    <div class="font-bold text-sm">ไม่พบรายชื่อพนักงาน</div>
                  </div>
                </td>
              </tr>
              <tr 
                v-else 
                v-for="rec in attendanceRecords" 
                :key="rec.user_id"
                class="table-row-hover"
                style="border-bottom: 1px solid var(--border-color);"
              >
                <td class="text-center p-md">
                  <div class="font-bold text-base text-primary">{{ rec.name }}</div>
                  <div class="text-xs text-secondary mt-2xs">
                    <span class="skill-badge" :class="rec.skill_level" style="font-size: 10px; padding: 1px 6px;">{{ getSkillLabel(rec.skill_level) }}</span>
                    <span v-if="(rec.default_wage_rate || rec.wage_rate) > 0" class="text-muted ml-xs">• ปกติ {{ formatCurrency(rec.default_wage_rate !== undefined ? rec.default_wage_rate : rec.wage_rate) }}/วัน</span>
                    <span v-else class="text-warning ml-xs font-semibold" style="font-size: 11px;">• ยังไม่ตั้งฐานค่าแรง</span>
                  </div>
                </td>
                <td class="text-center p-md">
                  <div class="flex justify-center gap-xs flex-wrap">
                    <button 
                      type="button"
                      class="status-btn"
                      :class="{ 'active-present': rec.status === 'present' }"
                      @click="rec.status = 'present'; rec.had_lunch_benefit = 1; if (!rec.daily_wage) rec.daily_wage = (rec.default_wage_rate || rec.wage_rate || 0);"
                    >
                      <i class="fa-solid fa-circle-check"></i> มาทำงาน
                    </button>
                    <button 
                      type="button"
                      class="status-btn"
                      :class="{ 'active-leave': rec.status === 'leave_unpaid' }"
                      @click="rec.status = 'leave_unpaid'; rec.had_lunch_benefit = 0;"
                    >
                      <i class="fa-solid fa-calendar-xmark"></i> ลาหยุด
                    </button>
                    <button 
                      type="button"
                      class="status-btn"
                      :class="{ 'active-absent': rec.status === 'absent' }"
                      @click="rec.status = 'absent'; rec.had_lunch_benefit = 0;"
                    >
                      <i class="fa-solid fa-user-xmark"></i> ขาดงาน
                    </button>
                  </div>
                </td>
                <td class="text-center p-md">
                  <div class="flex justify-center align-center gap-xs">
                    <input 
                      type="number" 
                      v-model.number="rec.daily_wage" 
                      class="form-input" 
                      :style="{
                        width: '105px',
                        textAlign: 'center',
                        height: '38px',
                        fontWeight: 'bold',
                        fontSize: 'var(--font-base)',
                        borderColor: (rec.status === 'present' && (!rec.daily_wage || Number(rec.daily_wage) <= 0)) ? '#f59e0b' : ''
                      }" 
                      :disabled="rec.status !== 'present'"
                      min="0" 
                      step="10"
                      placeholder="0"
                    />
                    <span class="text-xs text-secondary font-bold">บ.</span>
                  </div>
                  <div v-if="rec.status !== 'present'" class="text-2xs text-muted mt-2xs">ไม่ได้รับค่าจ้าง</div>
                  <div v-else-if="rec.status === 'present' && (!rec.daily_wage || Number(rec.daily_wage) <= 0)" class="text-2xs text-warning mt-2xs font-semibold">
                    (ยังไม่ระบุค่าแรง)
                  </div>
                  <div v-else-if="rec.default_wage_rate !== undefined && rec.daily_wage !== rec.default_wage_rate" class="text-2xs text-warning mt-2xs">
                    (ปรับจากปกติ {{ rec.default_wage_rate }} บ.)
                  </div>
                </td>
                <td class="text-center p-md">
                  <label class="lunch-benefit-wrapper" :class="{ 'disabled': rec.status !== 'present' }">
                    <input 
                      type="checkbox" 
                      v-model="rec.had_lunch_benefit" 
                      :true-value="1" 
                      :false-value="0"
                      :disabled="rec.status !== 'present'"
                      class="lunch-benefit-checkbox"
                    />
                    <span class="lunch-benefit-content">
                      <span class="lunch-benefit-icon">🍚</span>
                      <span class="lunch-benefit-text">ได้รับข้าวเที่ยง</span>
                    </span>
                  </label>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Attendance Sheet Mobile Cards List -->
      <div class="show-mobile-flex staff-mobile-card-list">
        <div v-if="loadingAttendance" class="card text-center p-xl"><div class="spinner mx-auto"></div></div>
        <div v-else-if="attendanceRecords.length === 0" class="card text-center p-xl text-secondary">ไม่พบรายชื่อพนักงาน</div>
        <div 
          v-else 
          v-for="rec in attendanceRecords" 
          :key="'m-att-' + rec.user_id"
          class="staff-mobile-card"
        >
          <!-- Card Header: Name & Lunch -->
          <div class="flex flex-between align-center gap-xs">
            <div>
              <div class="font-bold text-primary" style="font-size: 16px; line-height: 1.3;">{{ rec.name }}</div>
              <div class="text-xs text-secondary" style="margin-top: 4px;">
                <span class="skill-badge" :class="rec.skill_level" style="font-size: 10.5px; padding: 2px 7px;">{{ getSkillLabel(rec.skill_level) }}</span>
                <span v-if="(rec.default_wage_rate || rec.wage_rate) > 0" class="text-muted ml-xs">• ปกติ {{ formatCurrency(rec.default_wage_rate !== undefined ? rec.default_wage_rate : rec.wage_rate) }}/วัน</span>
              </div>
            </div>
            <label class="lunch-benefit-wrapper" :class="{ 'disabled': rec.status !== 'present' }" style="margin: 0; padding: 5px 9px; border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 8px; background: rgba(245, 158, 11, 0.05);">
              <input 
                type="checkbox" 
                v-model="rec.had_lunch_benefit" 
                :true-value="1" 
                :false-value="0"
                :disabled="rec.status !== 'present'"
                class="lunch-benefit-checkbox"
              />
              <span class="lunch-benefit-content" style="font-size: 11.5px;">
                <span class="lunch-benefit-icon" style="font-size: 14px;">🍚</span>
                <span class="lunch-benefit-text">ข้าวเที่ยง</span>
              </span>
            </label>
          </div>

          <!-- Status Buttons (3 columns) -->
          <div class="grid" style="grid-template-columns: repeat(3, 1fr); gap: 8px;">
            <button 
              type="button"
              class="status-btn w-full"
              style="padding: 9px 2px; font-size: 12px; height: 38px; border-radius: 8px; justify-content: center;"
              :class="{ 'active-present': rec.status === 'present' }"
              @click="rec.status = 'present'; rec.had_lunch_benefit = 1; if (!rec.daily_wage) rec.daily_wage = (rec.default_wage_rate || rec.wage_rate || 0);"
            >
              <i class="fa-solid fa-circle-check mr-2xs"></i> มาทำงาน
            </button>
            <button 
              type="button"
              class="status-btn w-full"
              style="padding: 9px 2px; font-size: 12px; height: 38px; border-radius: 8px; justify-content: center;"
              :class="{ 'active-leave': rec.status === 'leave_unpaid' }"
              @click="rec.status = 'leave_unpaid'; rec.had_lunch_benefit = 0;"
            >
              <i class="fa-solid fa-calendar-xmark mr-2xs"></i> ลาหยุด
            </button>
            <button 
              type="button"
              class="status-btn w-full"
              style="padding: 9px 2px; font-size: 12px; height: 38px; border-radius: 8px; justify-content: center;"
              :class="{ 'active-absent': rec.status === 'absent' }"
              @click="rec.status = 'absent'; rec.had_lunch_benefit = 0;"
            >
              <i class="fa-solid fa-user-xmark mr-2xs"></i> ขาดงาน
            </button>
          </div>

          <!-- Wage input row -->
          <div class="flex flex-between align-center staff-mobile-divider">
            <div class="flex flex-col">
              <span class="text-xs text-secondary font-bold" style="font-size: 12.5px;">ค่าแรงวันนี้:</span>
              <span v-if="rec.status !== 'present'" class="text-2xs text-muted" style="margin-top: 2px;">ไม่ได้รับค่าจ้าง</span>
              <span v-else-if="rec.status === 'present' && (!rec.daily_wage || Number(rec.daily_wage) <= 0)" class="text-2xs text-warning font-semibold" style="margin-top: 2px;">
                (ยังไม่ระบุค่าแรง)
              </span>
              <span v-else-if="rec.default_wage_rate !== undefined && rec.daily_wage !== rec.default_wage_rate" class="text-2xs text-warning" style="margin-top: 2px;">
                (ปรับจากปกติ {{ rec.default_wage_rate }} บ.)
              </span>
            </div>
            <div class="flex align-center gap-xs">
              <input 
                type="number" 
                v-model.number="rec.daily_wage" 
                class="form-input" 
                :style="{
                  width: '100px',
                  textAlign: 'center',
                  height: '38px',
                  fontWeight: 'bold',
                  fontSize: 'var(--font-sm)',
                  borderColor: (rec.status === 'present' && (!rec.daily_wage || Number(rec.daily_wage) <= 0)) ? '#f59e0b' : ''
                }" 
                :disabled="rec.status !== 'present'"
                min="0" 
                step="10"
                placeholder="0"
              />
              <span class="text-xs text-secondary font-bold">บาท</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- SUBTAB 4: OT ตามอีเวนต์ (Event-based OT) -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <div v-if="activeSubTab === 'event_ot'" class="flex flex-col gap-md">
      <div class="card p-md flex flex-between align-center flex-wrap gap-sm" style="background: rgba(139, 3, 19, 0.02); border: 1px solid var(--border-color);">
        <div>
          <h3 class="font-bold text-base flex align-center gap-xs" style="margin: 0; color: var(--text-primary);">
            <i class="fa-solid fa-tags text-primary"></i> บันทึก OT พิเศษตามอีเวนต์
          </h3>
          <p class="text-xs text-secondary mt-xs" style="margin-bottom: 0;">
            เงินพิเศษเฉพาะงานที่แอดมินมอบหมาย (ไม่ใช่คำนวณชั่วโมง) เช่น ทำป้าย คนละ 100 บาท, ล้างร้าน 150 บาท
          </p>
        </div>
        <button class="btn btn-primary" @click="showAddEventOtModal = true">
          <i class="fa-solid fa-plus"></i> เพิ่ม OT อีเวนต์ใหม่
        </button>
      </div>

      <!-- Event OT Desktop & Tablet Table -->
      <div class="hide-mobile card p-0 overflow-hidden" style="border: 1px solid var(--border-color);">
        <div style="overflow-x: auto;">
          <table class="table w-full" style="border-collapse: collapse;">
            <thead>
              <tr style="background: rgba(139, 3, 19, 0.03); border-bottom: 1px solid var(--border-color);">
                <th class="text-center p-md">วันที่</th>
                <th class="text-center p-md">ชื่องานพิเศษ / อีเวนต์</th>
                <th class="text-center p-md">ยอดต่อคน</th>
                <th class="text-center p-md">พนักงานที่ได้รับ</th>
                <th class="text-center p-md">บันทึกโดย</th>
                <th v-if="isAdminUser" class="text-center p-md">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loadingEventOts">
                <td colspan="6" class="text-center" style="padding: var(--space-3xl) var(--space-md) !important;"><div class="spinner mx-auto"></div></td>
              </tr>
              <tr v-else-if="eventOts.length === 0">
                <td colspan="6" class="text-center" style="padding: var(--space-3xl) var(--space-md) !important; color: var(--text-secondary);">
                  <div class="flex flex-col align-center justify-center gap-xs">
                    <i class="fa-solid fa-tags text-secondary" style="font-size: 2rem; opacity: 0.35;"></i>
                    <div class="font-bold text-sm">{{ emptyEventOtsMessage }}</div>
                  </div>
                </td>
              </tr>
              <tr 
                v-else 
                v-for="ev in eventOts" 
                :key="ev.id"
                class="table-row-hover"
                style="border-bottom: 1px solid var(--border-color);"
              >
                <td class="text-center p-md font-bold text-sm">{{ formatDate(ev.event_date) }}</td>
                <td class="text-center p-md">
                  <div class="font-bold text-base text-primary">{{ ev.event_name }}</div>
                  <div v-if="ev.note" class="text-xs text-secondary">{{ ev.note }}</div>
                </td>
                <td class="text-center p-md font-bold text-success text-base">
                  +{{ formatCurrency(ev.amount_per_person) }}
                </td>
                <td class="text-center p-md">
                  <div class="flex justify-center gap-xs flex-wrap">
                    <span 
                      v-for="p in ev.participants" 
                      :key="p.user_id" 
                      class="capsule-badge badge-neutral text-xs"
                    >
                      <i class="fa-solid fa-user mr-xs"></i> {{ p.name }}
                    </span>
                  </div>
                </td>
                <td class="text-center p-md text-xs text-secondary">{{ ev.creator_name || 'แอดมิน' }}</td>
                <td v-if="isAdminUser" class="text-center p-md">
                  <button class="btn-action btn-action-delete" :disabled="deletingEventOtId === ev.id" @click="handleDeleteEventOt(ev.id)">
                    <i v-if="deletingEventOtId === ev.id" class="fa-solid fa-spinner fa-spin"></i>
                    <i v-else class="fa-solid fa-trash-can"></i>
                    <span>{{ deletingEventOtId === ev.id ? ' กำลังลบ...' : ' ลบ' }}</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Event OT Mobile Cards List -->
      <div class="show-mobile-flex staff-mobile-card-list">
        <div v-if="loadingEventOts" class="card text-center p-xl"><div class="spinner mx-auto"></div></div>
        <div v-else-if="eventOts.length === 0" class="card text-center p-xl text-secondary">{{ emptyEventOtsMessage }}</div>
        <div 
          v-else 
          v-for="ev in eventOts" 
          :key="'m-ev-' + ev.id"
          class="staff-mobile-card"
        >
          <div class="flex flex-between align-center">
            <div>
              <div class="font-bold text-primary" style="font-size: 16px; line-height: 1.3;">{{ ev.event_name }}</div>
              <div class="text-xs text-secondary" style="margin-top: 4px;">
                <i class="fa-solid fa-calendar-day mr-2xs text-primary"></i> {{ formatDate(ev.event_date) }}
              </div>
            </div>
            <div class="font-bold text-success text-base" style="font-size: 16px;">
              +{{ formatCurrency(ev.amount_per_person) }} <span class="text-xs text-secondary font-normal">/คน</span>
            </div>
          </div>
          <div v-if="ev.note" class="text-xs text-secondary" style="font-style: italic;">{{ ev.note }}</div>
          <div class="flex flex-col gap-xs staff-mobile-divider">
            <span class="text-2xs text-secondary font-semibold">พนักงานที่ได้รับ ({{ ev.participants ? ev.participants.length : 0 }} คน):</span>
            <div class="flex gap-xs flex-wrap" style="gap: 5px;">
              <span 
                v-for="p in ev.participants" 
                :key="'m-p-' + p.user_id" 
                class="capsule-badge badge-neutral text-xs"
                style="font-size: 11px; padding: 3px 8px;"
              >
                <i class="fa-solid fa-user mr-xs"></i> {{ p.name }}
              </span>
            </div>
          </div>
          <div v-if="isAdminUser" class="flex flex-between align-center staff-mobile-divider" style="margin-top: 0;">
            <span class="text-2xs text-secondary">โดย: {{ ev.creator_name || 'แอดมิน' }}</span>
            <button class="btn btn-sm btn-action-delete" :disabled="deletingEventOtId === ev.id" @click="handleDeleteEventOt(ev.id)" style="padding: 5px 14px; font-size: 12px; height: 34px;">
              <i v-if="deletingEventOtId === ev.id" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-trash-can"></i>
              <span>{{ deletingEventOtId === ev.id ? ' กำลังลบ...' : ' ลบ' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- SUBTAB 5: เบิกเงินล่วงหน้า (Salary Advances) -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <div v-if="activeSubTab === 'advances'" class="flex flex-col gap-md">
      <div class="card p-md flex flex-between align-center flex-wrap gap-sm" style="background: rgba(139, 3, 19, 0.02); border: 1px solid var(--border-color);">
        <div>
          <h3 class="font-bold text-base flex align-center gap-xs" style="margin: 0; color: var(--text-primary);">
            <i class="fa-solid fa-hand-holding-dollar text-primary"></i> รายการเบิกเงินเดือนล่วงหน้า
          </h3>
          <p class="text-xs text-secondary mt-xs" style="margin-bottom: 0;">
            บันทึกการเบิกเงินสดหรือเงินโอนระหว่างงวด ยอดนี้จะถูกนำไปหักลบอัตโนมัติเมื่อสั่งจ่ายเงินเดือน
          </p>
        </div>
        <button class="btn btn-primary" @click="showAddAdvanceModal = true">
          <i class="fa-solid fa-plus"></i> บันทึกเบิกเงินล่วงหน้า
        </button>
      </div>

      <!-- Advances Desktop & Tablet Table -->
      <div class="hide-mobile card p-0 overflow-hidden" style="border: 1px solid var(--border-color);">
        <div style="overflow-x: auto;">
          <table class="table w-full" style="border-collapse: collapse;">
            <thead>
              <tr style="background: rgba(139, 3, 19, 0.03); border-bottom: 1px solid var(--border-color);">
                <th class="text-center p-md">วันที่เบิก</th>
                <th class="text-center p-md">พนักงาน</th>
                <th class="text-center p-md">จำนวนเงินที่เบิก</th>
                <th class="text-center p-md">ช่องทางจ่าย</th>
                <th class="text-center p-md">สถานะการหัก</th>
                <th v-if="isAdminUser" class="text-center p-md">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loadingAdvances">
                <td colspan="6" class="text-center" style="padding: var(--space-3xl) var(--space-md) !important;"><div class="spinner mx-auto"></div></td>
              </tr>
              <tr v-else-if="advances.length === 0">
                <td colspan="6" class="text-center" style="padding: var(--space-3xl) var(--space-md) !important; color: var(--text-secondary);">
                  <div class="flex flex-col align-center justify-center gap-xs">
                    <i class="fa-solid fa-hand-holding-dollar text-secondary" style="font-size: 2rem; opacity: 0.35;"></i>
                    <div class="font-bold text-sm">{{ emptyAdvancesMessage }}</div>
                  </div>
                </td>
              </tr>
              <tr 
                v-else 
                v-for="adv in advances" 
                :key="adv.id"
                class="table-row-hover"
                style="border-bottom: 1px solid var(--border-color);"
              >
                <td class="text-center p-md font-bold text-sm">{{ formatDate(adv.advance_date) }}</td>
                <td class="text-center p-md">
                  <div class="font-bold text-base text-primary">{{ adv.name }}</div>
                  <div class="text-xs text-secondary mt-2xs">
                    <span class="skill-badge" :class="adv.skill_level" style="font-size: 10px; padding: 1px 6px;">{{ getSkillLabel(adv.skill_level) }}</span>
                  </div>
                </td>
                <td class="text-center p-md font-bold text-danger text-base">
                  -{{ formatCurrency(adv.amount) }}
                </td>
                <td class="text-center p-md">
                  <span class="capsule-badge" :class="adv.payment_method === 'transfer' ? 'badge-primary' : 'badge-warning'">
                    <i :class="adv.payment_method === 'transfer' ? 'fa-solid fa-mobile-screen-button' : 'fa-solid fa-money-bill-wave'"></i>
                    {{ adv.payment_method === 'transfer' ? 'เงินโอน' : 'เงินสด' }}
                  </span>
                </td>
                <td class="text-center p-md">
                  <span 
                    class="capsule-badge" 
                    :class="adv.status === 'deducted' ? 'badge-success' : (adv.status === 'cancelled' ? 'badge-neutral' : 'badge-warning')"
                    :style="adv.status === 'cancelled' ? 'background: rgba(139, 3, 19, 0.08); color: var(--primary); border-color: rgba(139, 3, 19, 0.2);' : ''"
                  >
                    <i :class="adv.status === 'deducted' ? 'fa-solid fa-check' : (adv.status === 'cancelled' ? 'fa-solid fa-rotate-left text-primary' : 'fa-solid fa-clock')"></i>
                    {{ adv.status === 'deducted' ? 'หักในเงินเดือนแล้ว' : (adv.status === 'cancelled' ? 'ยกเลิกเบิกสำเร็จ' : 'เบิกสำเร็จ รอหักในบัญชี') }}
                  </span>
                </td>
                <td v-if="isAdminUser" class="text-center p-md">
                  <button 
                    v-if="adv.status === 'pending'"
                    class="btn-action btn-action-delete" 
                    :disabled="deletingAdvanceId === adv.id"
                    @click="handleDeleteAdvance(adv.id)"
                    title="ยกเลิก & คืนยอดรายการเบิกเงิน"
                  >
                    <i v-if="deletingAdvanceId === adv.id" class="fa-solid fa-spinner fa-spin"></i>
                    <i v-else class="fa-solid fa-rotate-left"></i>
                    <span>{{ deletingAdvanceId === adv.id ? ' กำลังยกเลิก...' : ' ยกเลิก/คืน' }}</span>
                  </button>
                  <span v-else-if="adv.status === 'cancelled'" class="text-xs font-semibold" style="color: var(--primary);">
                    <i class="fa-solid fa-circle-check mr-2xs"></i> ยกเลิกแล้ว
                  </span>
                  <span v-else class="text-xs text-muted">หักแล้ว</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Advances Mobile Cards List -->
      <div class="show-mobile-flex staff-mobile-card-list">
        <div v-if="loadingAdvances" class="card text-center p-xl"><div class="spinner mx-auto"></div></div>
        <div v-else-if="advances.length === 0" class="card text-center p-xl text-secondary">{{ emptyAdvancesMessage }}</div>
        <div 
          v-else 
          v-for="adv in advances" 
          :key="'m-adv-' + adv.id"
          class="staff-mobile-card"
          :style="adv.status === 'cancelled' ? 'opacity: 0.7; background: #fafafa;' : ''"
        >
          <div class="flex flex-between align-center">
            <div>
              <div class="font-bold text-primary" style="font-size: 16px; line-height: 1.3;">{{ adv.name }}</div>
              <div class="text-xs text-secondary" style="margin-top: 4px;">
                <span class="skill-badge" :class="adv.skill_level" style="font-size: 10.5px; padding: 2px 7px;">{{ getSkillLabel(adv.skill_level) }}</span>
                <span class="ml-xs">{{ formatDate(adv.advance_date) }}</span>
              </div>
            </div>
            <div class="text-right">
              <div class="font-bold text-danger text-base" :style="adv.status === 'cancelled' ? 'text-decoration: line-through;' : ''" style="font-size: 16px;">
                -{{ formatCurrency(adv.amount) }}
              </div>
              <span class="capsule-badge mt-2xs" :class="adv.payment_method === 'transfer' ? 'badge-primary' : 'badge-warning'" style="font-size: 11px; padding: 2px 8px; margin-top: 4px;">
                <i :class="adv.payment_method === 'transfer' ? 'fa-solid fa-mobile-screen-button' : 'fa-solid fa-money-bill-wave'"></i>
                {{ adv.payment_method === 'transfer' ? 'เงินโอน' : 'เงินสด' }}
              </span>
            </div>
          </div>
          <div class="flex flex-between align-center staff-mobile-divider">
            <span 
              class="capsule-badge" 
              :class="adv.status === 'deducted' ? 'badge-success' : (adv.status === 'cancelled' ? 'badge-neutral' : 'badge-warning')"
              :style="adv.status === 'cancelled' ? 'background: rgba(139, 3, 19, 0.08); color: var(--primary); border-color: rgba(139, 3, 19, 0.2);' : ''"
              style="font-size: 11px; padding: 3px 9px;"
            >
              <i :class="adv.status === 'deducted' ? 'fa-solid fa-check' : (adv.status === 'cancelled' ? 'fa-solid fa-rotate-left text-primary' : 'fa-solid fa-clock')"></i>
              {{ adv.status === 'deducted' ? 'หักในเงินเดือนแล้ว' : (adv.status === 'cancelled' ? 'ยกเลิกเบิกสำเร็จ' : 'เบิกสำเร็จ รอหักในบัญชี') }}
            </span>

            <div v-if="isAdminUser">
              <button 
                v-if="adv.status === 'pending'"
                class="btn-action btn-action-delete" 
                :disabled="deletingAdvanceId === adv.id"
                @click="handleDeleteAdvance(adv.id)"
                style="padding: 5px 14px; font-size: 12px; height: 34px;"
              >
                <i v-if="deletingAdvanceId === adv.id" class="fa-solid fa-spinner fa-spin"></i>
                <i v-else class="fa-solid fa-rotate-left"></i>
                <span>{{ deletingAdvanceId === adv.id ? ' กำลังยกเลิก...' : ' ยกเลิก/คืน' }}</span>
              </button>
              <span v-else-if="adv.status === 'cancelled'" class="text-xs font-semibold" style="color: var(--primary);">
                <i class="fa-solid fa-circle-check mr-2xs"></i> ยกเลิกแล้ว
              </span>
              <span v-else class="text-xs text-muted">หักแล้ว</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- SUBTAB 6: คำนวณ & จ่ายเงินเดือน (Payroll & Salary Payout) -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <div v-if="activeSubTab === 'payroll' && isAdminUser" class="flex flex-col gap-md">
      <!-- Payroll Month Control Bar -->
      <div class="card p-md flex flex-col gap-sm" style="background: rgba(139, 3, 19, 0.02); border: 1px solid var(--border-color);">
        <label class="font-bold text-sm text-secondary flex align-center gap-xs" style="margin-bottom: 2px;">
          <i class="fa-solid fa-calendar text-primary"></i> รอบเดือนที่คำนวณ:
        </label>

        <!-- Month Navigation Bar (100% full width, arrows locked at far ends) -->
        <div class="flex align-center gap-xs" style="width: 100%;">
          <button type="button" class="picker-nav-btn flex-shrink-0" @click="adjustPayrollMonth(-1)" title="เดือนก่อนหน้า">
            <i class="fa-solid fa-chevron-left"></i>
          </button>

          <!-- Custom Month Picker for Payroll (Fills remaining width between arrows) -->
          <div class="custom-select-wrapper" style="flex: 1; min-width: 0; width: 100%; position: relative;" @click.stop>
            <div 
              class="picker-trigger-btn" 
              :class="{ 'active': isPayrollMonthDropdownOpen }" 
              @click="togglePayrollMonthDropdown"
              style="width: 100%; height: 40px; padding: 0 var(--space-md); justify-content: space-between; gap: 6px; font-size: 14px; white-space: nowrap;"
            >
              <span class="flex align-center gap-xs" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                <i class="fa-solid fa-calendar-days text-primary flex-shrink-0"></i>
                <span style="overflow: hidden; text-overflow: ellipsis; font-weight: bold;">{{ payrollMonthLabel }}</span>
              </span>
              <i class="fa-solid fa-chevron-down text-xs text-secondary ml-xs flex-shrink-0"></i>
            </div>

            <!-- Month Dropdown Grid -->
            <div v-if="isPayrollMonthDropdownOpen" class="custom-select-dropdown monthpicker-popover dropdown-center-desktop" style="top: calc(100% + 4px); width: 280px !important; max-width: calc(100vw - 32px) !important; max-height: none !important; overflow: visible !important; padding: var(--space-sm); display: flex; flex-direction: column; gap: var(--space-sm); z-index: 1000;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: var(--space-xs);">
                <button type="button" class="picker-nav-btn" style="height: 32px !important; width: 32px !important; min-width: 32px !important;" @click.stop="adjustPayrollMonthPickerYear(-1)">
                  <i class="fa-solid fa-chevron-left"></i>
                </button>
                <span class="font-bold">ปี พ.ศ. {{ payrollMonthPickerYear + 543 }}</span>
                <button type="button" class="picker-nav-btn" style="height: 32px !important; width: 32px !important; min-width: 32px !important;" @click.stop="adjustPayrollMonthPickerYear(1)">
                  <i class="fa-solid fa-chevron-right"></i>
                </button>
              </div>
              <div class="month-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
                <button 
                  v-for="(mName, idx) in thaiMonthsShort" 
                  :key="idx" 
                  type="button" 
                  class="btn btn-secondary btn-sm"
                  :class="{ 'btn-primary active': isPayrollMonthPickerSelected(idx + 1) }"
                  @click="selectPayrollMonthPicker(idx + 1)"
                >
                  {{ mName }}
                </button>
              </div>
            </div>
          </div>

          <button type="button" class="picker-nav-btn flex-shrink-0" @click="adjustPayrollMonth(1)" title="เดือนถัดไป">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        <!-- Sub-bar: Short Hint and Current Month Button -->
        <div class="flex flex-between align-center flex-wrap gap-xs" style="margin-top: 2px;">
          <div style="font-size: 11px; color: var(--text-tertiary);">
            <i class="fa-solid fa-circle-check text-success mr-2xs" style="font-size: 10px;"></i> ตัดจ่ายเข้าบัญชีรายจ่ายสาขาอัตโนมัติเมื่อยืนยัน
          </div>
          <button type="button" class="picker-current-btn" style="height: 30px; padding: 0 10px; font-size: 11px; white-space: nowrap;" @click="setPayrollCurrentMonth">
            <i class="fa-solid fa-clock-rotate-left mr-2xs"></i> เดือนปัจจุบัน
          </button>
        </div>
      </div>

      <!-- Guarantee Pool Summary Card (กองทุนเงินประกันพนักงาน / เงินสดหมุนเวียนในร้าน) -->
      <div class="card p-md" style="background: #ffffff; border: 1px solid var(--border-color); border-left: 4px solid var(--warning, #f59e0b);">
        <!-- Header -->
        <div class="flex align-center gap-sm mb-sm">
          <div style="width: 38px; height: 38px; border-radius: 8px; background: rgba(245, 158, 11, 0.12); display: flex; align-items: center; justify-content: center; font-size: 1.15rem; color: #d97706; flex-shrink: 0;">
            <i class="fa-solid fa-shield-halved"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex align-center gap-xs flex-wrap">
              <h4 class="font-bold text-base" style="margin: 0; color: var(--text-primary);">
                กองทุนเงินประกันพนักงาน
              </h4>
              <span class="capsule-badge badge-warning" style="padding: 1px 6px; font-size: 10px; font-weight: bold;">
                สภาพคล่องร้าน
              </span>
            </div>
            <p class="text-xs text-secondary mt-2xs" style="margin: 0; font-size: 11px; color: var(--text-tertiary);">
              เงินสดหมุนเวียน (ไม่นับเป็นยอดขายอาหาร และจะคืนเมื่อลาออก)
            </p>
          </div>
        </div>

        <!-- Stat Tiles Grid for Mobile & Desktop -->
        <div class="grid gap-sm" style="grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); background: rgba(245, 158, 11, 0.04); border: 1px solid rgba(245, 158, 11, 0.15); border-radius: var(--radius-md); padding: 10px 14px;">
          <!-- Tile 1: Total Held -->
          <div>
            <div style="font-size: 11px; color: var(--text-secondary); font-weight: 600;">ยอดถือครองทั้งหมด</div>
            <div class="font-bold" style="font-size: 1.25rem; color: #b45309; line-height: 1.2;">
              {{ formatCurrency(guaranteePoolSummary.totalHeld) }}
            </div>
          </div>
          
          <!-- Tile 2: Staff Count -->
          <div>
            <div style="font-size: 11px; color: var(--text-secondary); font-weight: 600;">ผู้วางประกัน</div>
            <div class="font-bold" style="font-size: 1.1rem; color: var(--text-primary); line-height: 1.2;">
              {{ guaranteePoolSummary.heldStaffCount }} <span style="font-size: 11px; color: var(--text-secondary); font-weight: normal;">คน</span>
            </div>
          </div>

          <!-- Tile 3: Channels -->
          <div>
            <div style="font-size: 11px; color: var(--text-secondary); font-weight: 600;">ช่องทางถือครอง</div>
            <div style="font-size: 12px; font-weight: bold; color: var(--text-primary); line-height: 1.2;">
              สด: <span class="text-primary">{{ formatCurrency(guaranteePoolSummary.cashHeld) }}</span> | 
              โอน: <span class="text-primary">{{ formatCurrency(guaranteePoolSummary.transferHeld) }}</span>
            </div>
          </div>
        </div>

        <!-- Staff with held guarantee tags -->
        <div v-if="guaranteePoolSummary.heldStaffCount > 0" class="mt-xs pt-xs flex align-center gap-xs flex-wrap" style="border-top: 1px dashed rgba(245, 158, 11, 0.2);">
          <span style="font-size: 10px; color: var(--text-secondary); font-weight: 600;">รายชื่อ:</span>
          <span 
            v-for="st in guaranteePoolSummary.heldStaffList" 
            :key="st.name" 
            class="capsule-badge badge-neutral" 
            style="background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.3); color: #92400e; padding: 2px 8px; font-size: 11px;"
          >
            <i class="fa-solid fa-user-shield mr-2xs" style="color: #d97706; font-size: 10px;"></i>
            <strong>{{ st.name }}</strong> ({{ formatCurrency(st.amount) }} • {{ st.method === 'cash' ? 'เงินสด' : 'เงินโอน' }})
          </span>
        </div>
      </div>

      <!-- Payroll Summary Desktop & Tablet Table -->
      <div class="hide-mobile card p-0 overflow-hidden" style="border: 1px solid var(--border-color);">
        <div style="overflow-x: auto;">
          <table class="table w-full" style="border-collapse: collapse;">
            <thead>
              <tr style="background: rgba(139, 3, 19, 0.03); border-bottom: 1px solid var(--border-color);">
                <th class="text-center p-md">พนักงาน</th>
                <th class="text-center p-md">วันทำงาน</th>
                <th class="text-center p-md">ฐานค่าแรง</th>
                <th class="text-center p-md">OT อีเวนต์</th>
                <th class="text-center p-md">เบิกล่วงหน้า</th>
                <th class="text-center p-md">ยอดจ่ายสุทธิ</th>
                <th class="text-center p-md">เงินประกัน</th>
                <th class="text-center p-md">ประวัติเดือนนี้</th>
                <th class="text-center p-md">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loadingPayroll">
                <td colspan="9" class="text-center" style="padding: var(--space-3xl) var(--space-md) !important;"><div class="spinner mx-auto"></div></td>
              </tr>
              <tr v-else-if="payrollList.length === 0">
                <td colspan="9" class="text-center" style="padding: var(--space-3xl) var(--space-md) !important; color: var(--text-secondary);">
                  <div class="flex flex-col align-center justify-center gap-xs">
                    <i class="fa-solid fa-file-invoice-dollar text-secondary" style="font-size: 2rem; opacity: 0.35;"></i>
                    <div class="font-bold text-sm">ไม่พบรายการคำนวณเงินเดือนในงวดนี้</div>
                  </div>
                </td>
              </tr>
              <tr 
                v-else 
                v-for="item in payrollList" 
                :key="item.user_id"
                class="table-row-hover"
                style="border-bottom: 1px solid var(--border-color);"
              >
                <td class="text-center p-md">
                  <div class="font-bold text-base text-primary">{{ item.name }}</div>
                  <div class="text-xs text-secondary mt-2xs">
                    <span class="skill-badge" :class="item.skill_level" style="font-size: 10px; padding: 1px 6px;">{{ getSkillLabel(item.skill_level) }}</span> • {{ formatCurrency(item.wage_rate) }}/วัน
                  </div>
                </td>
                <td class="text-center p-md">
                  <span class="font-bold text-base text-primary">{{ item.unpaid_days_worked }}</span> <span class="text-xs text-secondary">วัน</span>
                  <div class="text-xs text-secondary">ข้าวเที่ยง {{ item.unpaid_lunch_count }} มื้อ</div>
                </td>
                <td class="text-center p-md font-bold">{{ formatCurrency(item.unpaid_base_salary) }}</td>
                <td class="text-center p-md font-bold text-success">
                  <span v-if="item.event_ot_amount > 0">+{{ formatCurrency(item.event_ot_amount) }}</span>
                  <span v-else class="text-muted">0</span>
                </td>
                <td class="text-center p-md font-bold text-danger">
                  <span v-if="item.advance_deducted_amount > 0">-{{ formatCurrency(item.advance_deducted_amount) }}</span>
                  <span v-else class="text-muted">0</span>
                </td>
                <td class="text-center p-md font-bold text-lg text-primary" style="font-size: 1.15rem;">
                  {{ formatCurrency(item.net_payable_round) }}
                </td>
                <!-- Guarantee Deposit Column -->
                <td class="text-center p-md">
                  <!-- Case 1: Currently Held -->
                  <div v-if="item.guarantee && item.guarantee.status === 'held'" class="flex flex-col align-center gap-xs">
                    <span class="capsule-badge badge-success text-xs guarantee-capsule-badge">
                      <i class="fa-solid fa-shield-halved"></i> วางประกันแล้ว ({{ formatGuaranteeMonth(item.guarantee.deposit_date) }})
                    </span>
                    <button class="btn btn-sm btn-secondary text-xs guarantee-capsule-btn" @click="openRefundGuaranteeModal(item.guarantee, item)">
                      <i class="fa-solid fa-arrow-rotate-left mr-2xs text-primary"></i> คืนค่าประกัน ({{ formatGuaranteeMonth(item.guarantee.deposit_date) }})
                    </button>
                  </div>
                  <!-- Case 2: Refunded -->
                  <div v-else-if="item.guarantee && item.guarantee.status === 'refunded'" class="flex flex-col align-center gap-xs">
                    <span class="capsule-badge badge-neutral text-xs guarantee-capsule-badge" style="opacity: 0.85;">
                      <i class="fa-solid fa-check"></i> คืนเงินประกันแล้ว ({{ formatGuaranteeMonth(item.guarantee.deposit_date) }})
                    </span>
                  </div>
                  <!-- Case 3: Not Held Yet -->
                  <div v-else class="flex justify-center">
                    <span class="capsule-badge badge-neutral text-xs guarantee-capsule-badge" style="opacity: 0.75;">
                      <i class="fa-solid fa-hourglass-half"></i> รอหักตอนจ่ายเงิน
                    </span>
                  </div>
                </td>
                <!-- Month Payout History Column -->
                <td class="text-center p-md">
                  <div v-if="item.history_payouts && item.history_payouts.length > 0" class="flex flex-col align-center gap-xs">
                    <span class="capsule-badge badge-primary text-xs cursor-pointer history-capsule-badge" @click="openHistoryPayoutsModal(item)" title="คลิกเพื่อดูสลิปแต่ละรอบ">
                      <i class="fa-solid fa-receipt mr-xs"></i> จ่ายแล้ว {{ item.payout_count_month }} รอบ ({{ formatCurrency(item.total_paid_amount_month) }})
                    </span>
                  </div>
                  <div v-else>
                    <span class="text-xs text-muted">ไม่เคยจ่ายเดือนนี้</span>
                  </div>
                </td>
                <!-- Action Column -->
                <td class="text-center p-md">
                  <button 
                    v-if="item.has_pending_payout" 
                    class="btn-action btn-action-primary"
                    @click="openPayModal(item)"
                  >
                    <i class="fa-solid fa-money-bill-wave"></i> จ่ายเงิน
                  </button>
                  <span v-else class="text-xs text-muted font-bold">
                    <i class="fa-solid fa-circle-check text-success"></i> จ่ายครบแล้ว
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Payroll Summary Mobile Cards List -->
      <div class="show-mobile-flex staff-mobile-card-list">
        <div v-if="loadingPayroll" class="card text-center p-xl"><div class="spinner mx-auto"></div></div>
        <div v-else-if="payrollList.length === 0" class="card text-center p-xl text-secondary">ไม่พบรายการคำนวณเงินเดือนในงวดนี้</div>
        <div 
          v-else 
          v-for="item in payrollList" 
          :key="'m-pay-' + item.user_id"
          class="staff-mobile-card"
        >
          <!-- Header: Employee info + Net amount -->
          <div class="flex flex-between align-center">
            <div>
              <div class="font-bold text-primary" style="font-size: 16px; line-height: 1.3;">{{ item.name }}</div>
              <div class="text-xs text-secondary" style="margin-top: 4px;">
                <span class="skill-badge" :class="item.skill_level" style="font-size: 10.5px; padding: 2px 7px;">{{ getSkillLabel(item.skill_level) }}</span>
                <span class="ml-xs font-semibold">{{ formatCurrency(item.wage_rate) }}/วัน</span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-2xs text-secondary">ยอดจ่ายสุทธิรอบนี้</div>
              <div class="font-bold text-lg text-primary" style="font-size: 1.3rem;">
                {{ formatCurrency(item.net_payable_round) }}
              </div>
            </div>
          </div>

          <!-- Breakdown Grid (2x2) -->
          <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 10px; background: rgba(139, 3, 19, 0.03); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <div class="flex flex-col">
              <span class="text-2xs text-secondary">วันทำงานรอบนี้</span>
              <span class="text-xs font-bold text-primary" style="font-size: 12.5px; margin-top: 2px;">{{ item.unpaid_days_worked }} วัน (ข้าว {{ item.unpaid_lunch_count }} มื้อ)</span>
            </div>
            <div class="flex flex-col">
              <span class="text-2xs text-secondary">ฐานค่าแรงค้างจ่าย</span>
              <span class="text-xs font-bold" style="font-size: 12.5px; margin-top: 2px;">{{ formatCurrency(item.unpaid_base_salary) }}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-2xs text-secondary">OT อีเวนต์</span>
              <span class="text-xs font-bold text-success" style="font-size: 12.5px; margin-top: 2px;" v-if="item.event_ot_amount > 0">+{{ formatCurrency(item.event_ot_amount) }}</span>
              <span class="text-xs text-muted" style="font-size: 12.5px; margin-top: 2px;" v-else>฿0</span>
            </div>
            <div class="flex flex-col">
              <span class="text-2xs text-secondary">เบิกล่วงหน้า</span>
              <span class="text-xs font-bold text-danger" style="font-size: 12.5px; margin-top: 2px;" v-if="item.advance_deducted_amount > 0">-{{ formatCurrency(item.advance_deducted_amount) }}</span>
              <span class="text-xs text-muted" style="font-size: 12.5px; margin-top: 2px;" v-else>฿0</span>
            </div>
          </div>

          <!-- Guarantee & History status -->
          <div class="flex flex-between align-center flex-wrap gap-xs staff-mobile-divider">
            <div>
              <span v-if="item.guarantee && item.guarantee.status === 'held'" class="capsule-badge badge-success text-2xs" style="padding: 3px 8px; font-size: 11px;">
                <i class="fa-solid fa-shield-halved"></i> วางประกันแล้ว
              </span>
              <span v-else-if="item.guarantee && item.guarantee.status === 'refunded'" class="capsule-badge badge-neutral text-2xs" style="padding: 3px 8px; font-size: 11px;">
                <i class="fa-solid fa-check"></i> คืนประกันแล้ว
              </span>
              <span v-else class="capsule-badge badge-neutral text-2xs" style="padding: 3px 8px; font-size: 11px; opacity: 0.75;">
                <i class="fa-solid fa-hourglass-half"></i> รอหักประกัน
              </span>
            </div>

            <div>
              <button 
                v-if="item.history_payouts && item.history_payouts.length > 0"
                class="btn btn-sm btn-secondary text-xs" 
                style="padding: 4px 10px; font-size: 11.5px;"
                @click="openHistoryPayoutsModal(item)"
              >
                <i class="fa-solid fa-receipt mr-2xs text-primary"></i> สลิป {{ item.payout_count_month }} รอบ
              </button>
              <span v-else class="text-2xs text-muted">ยังไม่มีสลิปเดือนนี้</span>
            </div>
          </div>

          <!-- Bottom Actions: Refund Guarantee & Pay -->
          <div class="flex gap-sm" style="margin-top: 2px;">
            <button 
              v-if="item.guarantee && item.guarantee.status === 'held'"
              class="btn btn-secondary flex-1 text-xs" 
              style="height: 40px; padding: 0 8px; font-size: 12.5px; font-weight: 600;"
              @click="openRefundGuaranteeModal(item.guarantee, item)"
            >
              <i class="fa-solid fa-arrow-rotate-left mr-2xs text-primary"></i> คืนประกัน
            </button>

            <button 
              v-if="item.has_pending_payout" 
              class="btn btn-primary flex-1 font-bold"
              style="height: 40px; font-size: 13.5px;"
              @click="openPayModal(item)"
            >
              <i class="fa-solid fa-money-bill-wave mr-xs"></i> สั่งจ่ายค่าจ้าง
            </button>
            <div v-else class="flex-1 text-center py-xs text-xs text-success font-bold" style="background: rgba(16, 185, 129, 0.08); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; height: 40px; font-size: 13px;">
              <i class="fa-solid fa-circle-check mr-2xs"></i> จ่ายครบแล้ว
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- TELEPORTED MODALS (Full Screen Backdrop & Perfect Centering) -->
    <!-- ═══════════════════════════════════════════════════════════ -->

    <!-- MODAL 1: ปรับแต่งค่าแรง & กฎเงินประกัน (Edit Compensation) -->
    <Teleport to="body">
      <div v-if="showCompModal" class="modal-container active">
        <div class="modal-overlay" @click="showCompModal = false"></div>
        <div class="modal-content modal-center w-full max-w-sm" style="position:relative; z-index:2; min-height: 490px; display: flex; flex-direction: column;">
          <div class="modal-header">
            <h3><i class="fa-solid fa-sliders" style="margin-right: 6px;"></i> ปรับค่าแรง: {{ selectedEmp?.name }}</h3>
            <button class="modal-close" @click="showCompModal = false">✕</button>
          </div>
          <div class="modal-body" style="display: flex; flex-direction: column; flex: 1; justify-content: space-between;">
            <div>
              <div class="form-group mb-sm">
                <label class="form-label font-bold text-xs">ประเภทค่าจ้าง *</label>
                <div class="custom-select-wrapper" style="width: 100%; position: relative;" @click.stop>
                  <div 
                    class="custom-select-trigger" 
                    :class="{ 'active': isCompWageTypeDropdownOpen }" 
                    @click="isCompWageTypeDropdownOpen = !isCompWageTypeDropdownOpen; isCompSkillLevelDropdownOpen = false;"
                  >
                    <span class="custom-select-text">
                      {{ compForm.wage_type === 'monthly' ? 'รายเดือน (Monthly Salary)' : 'รายวัน (Daily Wage)' }}
                    </span>
                  </div>
                  <div v-if="isCompWageTypeDropdownOpen" class="custom-select-dropdown" style="z-index: 1000;">
                    <div class="custom-select-option" :class="{ 'selected': compForm.wage_type === 'daily' }" @click="selectCompWageType('daily')">
                      รายวัน (Daily Wage)
                    </div>
                    <div class="custom-select-option" :class="{ 'selected': compForm.wage_type === 'monthly' }" @click="selectCompWageType('monthly')">
                      รายเดือน (Monthly Salary)
                    </div>
                  </div>
                </div>
              </div>

              <div class="form-group mb-sm">
                <label class="form-label font-bold text-xs">อัตราค่าจ้าง (บาท) *</label>
                <input type="number" class="form-input" v-model.number="compForm.wage_rate" placeholder="เช่น 450 หรือ 300" min="0" />
              </div>

              <div class="form-group mb-sm">
                <label class="form-label font-bold text-xs">ระดับทักษะ (Skill Tier) *</label>
                <div class="custom-select-wrapper" style="width: 100%; position: relative;" @click.stop>
                  <div 
                    class="custom-select-trigger" 
                    :class="{ 'active': isCompSkillLevelDropdownOpen }" 
                    @click="isCompSkillLevelDropdownOpen = !isCompSkillLevelDropdownOpen; isCompWageTypeDropdownOpen = false;"
                  >
                    <span class="custom-select-text">
                      <span v-if="compForm.skill_level === 'trainee'">🌱 ฝึกงาน (Trainee)</span>
                      <span v-else-if="compForm.skill_level === 'expert'">🏆 เชี่ยวชาญ (Expert)</span>
                      <span v-else>⭐ ประจำ (Regular)</span>
                    </span>
                  </div>
                  <div v-if="isCompSkillLevelDropdownOpen" class="custom-select-dropdown" style="z-index: 1000;">
                    <div class="custom-select-option" :class="{ 'selected': compForm.skill_level === 'trainee' }" @click="selectCompSkillLevel('trainee')">
                      🌱 ฝึกงาน (Trainee)
                    </div>
                    <div class="custom-select-option" :class="{ 'selected': compForm.skill_level === 'regular' }" @click="selectCompSkillLevel('regular')">
                      ⭐ ประจำ (Regular)
                    </div>
                    <div class="custom-select-option" :class="{ 'selected': compForm.skill_level === 'expert' }" @click="selectCompSkillLevel('expert')">
                      🏆 เชี่ยวชาญ (Expert)
                    </div>
                  </div>
                </div>
              </div>

              <div class="form-group mb-sm">
                <label class="form-label font-bold text-xs">สวัสดิการพนักงาน</label>
                <input type="text" class="form-input" v-model="compForm.benefits" placeholder="เช่น ข้าวเที่ยงฟรี" />
              </div>
            </div>

            <div class="flex gap-md mt-lg">
              <button class="btn-modal btn-modal-secondary flex-1" @click="showCompModal = false">ยกเลิก</button>
              <button 
                class="btn-modal btn-modal-primary flex-1" 
                :disabled="savingComp"
                @click="handleSaveCompensation"
              >
                <i v-if="savingComp" class="fa-solid fa-spinner fa-spin"></i>
                <i v-else class="fa-solid fa-floppy-disk"></i>
                <span>{{ savingComp ? ' กำลังบันทึก...' : ' บันทึกข้อมูล' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL 2: สร้าง OT อีเวนต์ใหม่ (Create Event OT) -->
    <Teleport to="body">
      <div v-if="showAddEventOtModal" class="modal-container active">
        <div class="modal-overlay" @click="showAddEventOtModal = false"></div>
        <div class="modal-content modal-center w-full max-w-sm" style="position:relative; z-index:2;">
          <div class="modal-header">
            <h3><i class="fa-solid fa-tags" style="margin-right: 6px;"></i> เพิ่ม OT พิเศษตามอีเวนต์</h3>
            <button class="modal-close" @click="showAddEventOtModal = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label font-bold">ชื่องานพิเศษ / กิจกรรม *</label>
              <input type="text" class="form-input" v-model="eventOtForm.event_name" placeholder="เช่น ทำป้ายหน้าร้าน, ล้างร้านใหญ่" />
            </div>

            <div class="form-group">
              <label class="form-label font-bold">วันที่ปฏิบัติงาน *</label>
              <div class="custom-select-wrapper" style="width: 100%; position: relative;" @click.stop>
                <div 
                  class="picker-trigger-btn w-full" 
                  :class="{ 'active': isEventOtDateDropdownOpen }" 
                  @click="toggleEventOtDateDropdown"
                  style="width: 100%; justify-content: space-between; padding: 0 var(--space-md);"
                >
                  <span class="flex align-center gap-sm">
                    <i class="fa-solid fa-calendar-day text-primary"></i>
                    <span>{{ eventOtDateLabel }}</span>
                  </span>
                  <i class="fa-solid fa-chevron-down text-xs text-secondary ml-xs"></i>
                </div>

                <!-- Date Picker Calendar Popover -->
                <div v-if="isEventOtDateDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 4px); width: 100% !important; max-height: none !important; overflow-y: visible !important; padding: var(--space-sm); display: flex; flex-direction: column; gap: var(--space-xs); z-index: 1000;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: var(--space-xs); border-bottom: 1px solid var(--border-color);">
                    <button type="button" class="picker-nav-btn" style="height: 32px !important; width: 32px !important; min-width: 32px !important;" @click.stop="adjustEventOtDatePickerMonth(-1)">
                      <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <span class="font-bold" style="font-size: var(--font-sm);">{{ eventOtDatePickerMonthName }} {{ eventOtDatePickerYear + 543 }}</span>
                    <button type="button" class="picker-nav-btn" style="height: 32px !important; width: 32px !important; min-width: 32px !important;" @click.stop="adjustEventOtDatePickerMonth(1)">
                      <i class="fa-solid fa-chevron-right"></i>
                    </button>
                  </div>
                  <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: var(--font-xs); font-weight: bold; color: var(--text-secondary); margin-top: 4px;">
                    <div v-for="day in ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']" :key="day">{{ day }}</div>
                  </div>
                  <div class="calendar-days-grid">
                    <div v-for="empty in eventOtDatePickerStartOffset" :key="'empty-'+empty"></div>
                    <button 
                      v-for="dNum in eventOtDatePickerDaysCount" 
                      :key="dNum"
                      type="button"
                      class="calendar-day-btn"
                      :class="{ 'btn-primary selected': isEventOtDatePickerSelected(dNum) }"
                      @click="selectEventOtDatePickerDay(dNum)"
                    >
                      {{ dNum }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label font-bold">จำนวนเงินต่อคน (บาท) *</label>
              <input type="number" class="form-input" v-model.number="eventOtForm.amount_per_person" placeholder="เช่น 100" min="1" />
            </div>

            <div class="form-group">
              <label class="form-label font-bold"><i class="fa-solid fa-users" style="margin-right: 4px;"></i> เลือกพนักงานที่ได้รับเงินพิเศษ *</label>
              <div style="max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: var(--space-xs);">
                <label 
                  v-for="emp in employees" 
                  :key="emp.id" 
                  class="flex flex-between align-center cursor-pointer"
                  style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: var(--space-sm) var(--space-md); transition: var(--transition-base);"
                >
                  <div class="flex align-center gap-sm">
                    <input type="checkbox" :value="emp.id" v-model="eventOtForm.user_ids" style="width: 18px; height: 18px; accent-color: var(--primary);" />
                    <span class="font-semibold text-sm">{{ emp.name }}</span>
                  </div>
                  <span class="skill-badge" :class="emp.skill_level" style="font-size: 10px; padding: 1px 6px;">{{ getSkillLabel(emp.skill_level) }}</span>
                </label>
              </div>
            </div>

            <div class="flex gap-md mt-lg">
              <button class="btn-modal btn-modal-secondary flex-1" @click="showAddEventOtModal = false">ยกเลิก</button>
              <button 
                class="btn-modal btn-modal-primary flex-1" 
                :disabled="savingEventOt || !eventOtForm.event_name || !eventOtForm.amount_per_person || eventOtForm.user_ids.length === 0"
                @click="handleSaveEventOt"
              >
                <i v-if="savingEventOt" class="fa-solid fa-spinner fa-spin"></i>
                <i v-else class="fa-solid fa-tags"></i>
                <span>{{ savingEventOt ? ' กำลังบันทึก...' : ' บันทึก OT อีเวนต์' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL 3: บันทึกการเบิกเงินล่วงหน้า (Salary Advance Modal) -->
    <Teleport to="body">
      <div v-if="showAddAdvanceModal" class="modal-container active">
        <div class="modal-overlay" @click="showAddAdvanceModal = false"></div>
        <div class="modal-content modal-center w-full max-w-sm" style="position:relative; z-index:2; min-height: 760px; max-height: 90vh; display: flex; flex-direction: column;">
          <div class="modal-header">
            <h3><i class="fa-solid fa-hand-holding-dollar" style="margin-right: 6px;"></i> บันทึกการเบิกเงินล่วงหน้า</h3>
            <button class="modal-close" @click="showAddAdvanceModal = false">✕</button>
          </div>
          <div class="modal-body" style="overflow-y: auto; display: flex; flex-direction: column; flex: 1; justify-content: space-between;">
            <div>
              <!-- Staff Selector with custom select -->
              <div class="form-group mb-sm">
                <label class="form-label font-bold text-xs">เลือกพนักงานที่เบิกเงิน *</label>
                <div class="custom-select-wrapper" style="width: 100%; position: relative;" @click.stop>
                  <div 
                    class="custom-select-trigger" 
                    :class="{ 'active': isAdvanceStaffDropdownOpen }" 
                    @click="isAdvanceStaffDropdownOpen = !isAdvanceStaffDropdownOpen"
                  >
                    <span class="custom-select-text">
                      {{ selectedAdvanceStaffLabel }}
                    </span>
                  </div>
                  <div v-if="isAdvanceStaffDropdownOpen" class="custom-select-dropdown" style="max-height: 200px; z-index: 1000;">
                    <div 
                      v-for="emp in employees" 
                      :key="emp.id" 
                      class="custom-select-option flex flex-between align-center" 
                      :class="{ 'selected': advanceForm.user_id === emp.id }" 
                      @click="selectAdvanceStaff(emp.id)"
                    >
                      <span>{{ emp.name }}</span>
                      <span class="skill-badge" :class="emp.skill_level" style="font-size: 10px; padding: 1px 6px;">
                        {{ getSkillLabel(emp.skill_level) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Accumulated Wage Info Box -->
              <div 
                v-if="advanceForm.user_id && selectedStaffAvailableWage" 
                class="form-group mb-sm"
                style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: var(--space-sm);"
              >
                <div class="flex flex-between align-center mb-2xs">
                  <span class="text-xs text-secondary font-bold">
                    <i class="fa-solid fa-coins text-warning mr-xs"></i> ยอดค่าแรงสะสมที่เบิกได้สูงสุดในปัจจุบัน:
                  </span>
                  <span class="text-sm font-bold text-primary">
                    {{ formatCurrency(selectedStaffAvailableWage.maxAvailable) }}
                  </span>
                </div>
                <div class="text-2xs text-secondary flex flex-between flex-wrap gap-2xs" style="font-size: 11px;">
                  <div class="flex align-center gap-xs flex-wrap">
                    <span>วันทำงาน: {{ selectedStaffAvailableWage.unpaidDays }} วัน ({{ formatCurrency(selectedStaffAvailableWage.unpaidBase) }})</span>
                    <span v-if="selectedStaffAvailableWage.eventOt > 0" class="text-success font-semibold">
                      • OT: +{{ formatCurrency(selectedStaffAvailableWage.eventOt) }}
                    </span>
                  </div>
                  <span v-if="selectedStaffAvailableWage.existingAdvances > 0" class="text-danger font-semibold">
                    (เคยเบิกค้างอยู่ {{ formatCurrency(selectedStaffAvailableWage.existingAdvances) }})
                  </span>
                </div>
              </div>

              <div class="form-group mb-sm">
                <label class="form-label font-bold text-xs">จำนวนเงินที่ขอเบิก (บาท) *</label>
                <input 
                  type="number" 
                  class="form-input form-input-sm font-bold" 
                  v-model.number="advanceForm.amount" 
                  placeholder="เช่น 500" 
                  min="1" 
                />
              </div>

              <!-- Orange Warning Box when advance exceeds available wage -->
              <div 
                v-if="advanceForm.user_id && selectedStaffAvailableWage && advanceForm.amount > selectedStaffAvailableWage.maxAvailable"
                class="form-group mb-sm"
                style="background: rgba(255, 149, 0, 0.1); border: 1px solid var(--warning); border-radius: var(--radius-md); padding: var(--space-sm);"
              >
                <div class="flex align-start gap-xs text-xs font-semibold text-warning" style="line-height: 1.4;">
                  <i class="fa-solid fa-triangle-exclamation" style="font-size: 14px; margin-top: 2px;"></i>
                  <div>
                    <strong>คำเตือน:</strong> จำนวนเงินที่ขอเบิก ({{ formatCurrency(advanceForm.amount) }}) <strong>เกินกว่ายอดค่าแรงสะสม</strong> ที่ทำได้ในปัจจุบัน ({{ formatCurrency(selectedStaffAvailableWage.maxAvailable) }})
                    <div class="text-2xs text-secondary font-normal mt-2xs">
                      * นายจ้างยังสามารถยืนยันให้เบิกล่วงหน้าได้ โดยยอดส่วนเกินจะรอหักจากวันทำงานถัดไป
                    </div>
                  </div>
                </div>
              </div>

              <!-- Date Picker for Advance -->
              <div class="form-group mb-sm">
                <label class="form-label font-bold text-xs">วันที่เบิกเงิน *</label>
                <div class="custom-select-wrapper" style="width: 100%; position: relative;" @click.stop>
                  <div 
                    class="picker-trigger-btn w-full" 
                    :class="{ 'active': isAdvanceDateDropdownOpen }" 
                    @click="toggleAdvanceDateDropdown"
                    style="width: 100%; justify-content: space-between; padding: 0 var(--space-md);"
                  >
                    <span class="flex align-center gap-sm">
                      <i class="fa-solid fa-calendar-day text-primary"></i>
                      <span>{{ advanceDateLabel }}</span>
                    </span>
                    <i class="fa-solid fa-chevron-down text-xs text-secondary ml-xs"></i>
                  </div>

                  <!-- Date Picker Calendar Popover -->
                  <div v-if="isAdvanceDateDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 4px); width: 100% !important; max-height: none !important; overflow-y: visible !important; padding: var(--space-sm); display: flex; flex-direction: column; gap: var(--space-xs); z-index: 1000;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: var(--space-xs); border-bottom: 1px solid var(--border-color);">
                      <button type="button" class="picker-nav-btn" style="height: 32px !important; width: 32px !important; min-width: 32px !important;" @click.stop="adjustAdvanceDatePickerMonth(-1)">
                        <i class="fa-solid fa-chevron-left"></i>
                      </button>
                      <span class="font-bold" style="font-size: var(--font-sm);">{{ advanceDatePickerMonthName }} {{ advanceDatePickerYear + 543 }}</span>
                      <button type="button" class="picker-nav-btn" style="height: 32px !important; width: 32px !important; min-width: 32px !important;" @click.stop="adjustAdvanceDatePickerMonth(1)">
                        <i class="fa-solid fa-chevron-right"></i>
                      </button>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: var(--font-xs); font-weight: bold; color: var(--text-secondary); margin-top: 4px;">
                      <div v-for="day in ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']" :key="day">{{ day }}</div>
                    </div>
                    <div class="calendar-days-grid">
                      <div v-for="empty in advanceDatePickerStartOffset" :key="'empty-'+empty"></div>
                      <button 
                        v-for="dNum in advanceDatePickerDaysCount" 
                        :key="dNum"
                        type="button"
                        class="calendar-day-btn"
                        :class="{ 'btn-primary selected': isAdvanceDatePickerSelected(dNum) }"
                        @click="selectAdvanceDatePickerDay(dNum)"
                      >
                        {{ dNum }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Payment Method with custom select -->
              <div class="form-group mb-sm">
                <label class="form-label font-bold text-xs">ช่องทางการจ่ายเงิน *</label>
                <div class="custom-select-wrapper" style="width: 100%; position: relative;" @click.stop>
                  <div 
                    class="custom-select-trigger" 
                    :class="{ 'active': isAdvancePaymentMethodDropdownOpen }" 
                    @click="isAdvancePaymentMethodDropdownOpen = !isAdvancePaymentMethodDropdownOpen"
                  >
                    <span class="custom-select-text" style="display: inline-flex; align-items: center; gap: 6px;">
                      <i :class="advanceForm.payment_method === 'transfer' ? 'fa-solid fa-mobile-screen-button' : 'fa-solid fa-money-bill-wave'"></i>
                      {{ advanceForm.payment_method === 'transfer' ? 'เงินโอนผ่านบัญชี' : 'เงินสด (จ่ายจากลิ้นชัก)' }}
                    </span>
                  </div>
                  <div v-if="isAdvancePaymentMethodDropdownOpen" class="custom-select-dropdown" style="z-index: 1000;">
                    <div class="custom-select-option" :class="{ 'selected': advanceForm.payment_method === 'cash' }" @click="selectAdvancePaymentMethod('cash')">
                      <i class="fa-solid fa-money-bill-wave" style="margin-right: 4px;"></i> เงินสด (จ่ายจากลิ้นชัก)
                    </div>
                    <div class="custom-select-option" :class="{ 'selected': advanceForm.payment_method === 'transfer' }" @click="selectAdvancePaymentMethod('transfer')">
                      <i class="fa-solid fa-mobile-screen-button" style="margin-right: 4px;"></i> เงินโอนผ่านบัญชี
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex gap-md mt-lg" style="margin-top: auto; padding-top: var(--space-md);">
              <button class="btn-modal btn-modal-secondary flex-1" @click="showAddAdvanceModal = false">ยกเลิก</button>
              <button 
                class="btn-modal btn-modal-primary flex-1" 
                :disabled="savingAdvance || !advanceForm.user_id || !advanceForm.amount || advanceForm.amount <= 0"
                @click="handleSaveAdvance"
              >
                <i v-if="savingAdvance" class="fa-solid fa-spinner fa-spin"></i>
                <i v-else class="fa-solid fa-hand-holding-dollar"></i>
                <span>{{ savingAdvance ? ' กำลังบันทึก...' : ' ยืนยันการเบิกเงิน' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL 4: จ่ายเงินเดือน & สรุปยอด (Payout Modal) -->
    <Teleport to="body">
      <div v-if="showPayModal" class="modal-container active">
        <div class="modal-overlay" @click="showPayModal = false"></div>
        <div class="modal-content modal-center w-full max-w-sm" style="position:relative; z-index:2; max-height: 90vh; display: flex; flex-direction: column;">
          <div class="modal-header">
            <h3><i class="fa-solid fa-money-check-dollar" style="margin-right: 6px;"></i> จ่ายเงินรอบนี้</h3>
            <button class="modal-close" @click="showPayModal = false">✕</button>
          </div>
          <div class="modal-body" style="overflow-y: auto;">
            <!-- Staff Header -->
            <div class="form-group" style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: var(--space-md); margin-bottom: var(--space-sm);">
              <div class="flex flex-between align-center mb-xs">
                <span class="text-sm font-bold text-primary">{{ payingItem?.name }}</span>
                <span class="capsule-badge badge-neutral text-xs">งวด {{ payrollMonth }}</span>
              </div>
              <div class="text-xs text-secondary flex flex-between">
                <span>อัตราค่าจ้าง: {{ formatCurrency(payingItem?.wage_rate || (payingItem?.unpaid_days_worked ? Math.round(payingItem?.unpaid_base_salary / payingItem?.unpaid_days_worked) : 0)) }}/{{ payingItem?.wage_type === 'monthly' ? 'เดือน' : 'วัน' }}</span>
                <span class="skill-badge" :class="payingItem?.skill_level" style="font-size: 10px; padding: 1px 6px;">{{ getSkillLabel(payingItem?.skill_level) }}</span>
              </div>
            </div>

            <!-- Itemized Checklist -->
            <div class="form-group mb-sm">
              <label class="form-label font-bold text-xs text-secondary mb-xs">
                <i class="fa-solid fa-list-check mr-xs text-primary"></i> เลือกรายการที่ต้องการจ่าย/หักในรอบนี้:
              </label>
              
              <div class="flex flex-col gap-xs">
                <!-- 1. Base Salary with partial days selector -->
                <div 
                  class="flex flex-between align-center"
                  :style="{
                    background: payForm.pay_base_salary ? 'rgba(52, 199, 89, 0.08)' : '#ffffff',
                    border: '1px solid ' + (payForm.pay_base_salary ? 'var(--success)' : 'var(--border-color)'),
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-xs) var(--space-sm)',
                    opacity: (payingItem?.unpaid_days_worked > 0 || payingItem?.unpaid_base_salary > 0) ? 1 : 0.5
                  }"
                >
                  <label class="flex align-center gap-xs cursor-pointer" style="margin: 0;">
                    <input 
                      type="checkbox" 
                      v-model="payForm.pay_base_salary" 
                      :disabled="!payingItem?.unpaid_days_worked && !payingItem?.unpaid_base_salary"
                      @change="handlePayoutCheckboxChange"
                      style="width: 16px; height: 16px; accent-color: var(--primary);" 
                    />
                    <span class="text-xs font-semibold">จ่ายฐานค่าแรง</span>
                  </label>

                  <div class="flex align-center gap-xs">
                    <!-- Day count stepper when multiple days are unpaid -->
                    <div 
                      v-if="payForm.pay_base_salary && (payingItem?.unpaid_days_worked > 1)" 
                      class="flex align-center gap-2xs" 
                      style="background: var(--bg-primary); padding: 2px 6px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);"
                    >
                      <button 
                        type="button" 
                        class="btn btn-xs btn-secondary" 
                        style="padding: 0 6px; height: 22px; font-weight: bold;" 
                        :disabled="payForm.days_to_pay <= 1"
                        @click.stop="adjustDaysToPay(-1)"
                      >-</button>
                      <span class="text-xs font-bold px-xs" style="min-width: 44px; text-align: center;">
                        {{ payForm.days_to_pay }} / {{ payingItem?.unpaid_days_worked }} วัน
                      </span>
                      <button 
                        type="button" 
                        class="btn btn-xs btn-secondary" 
                        style="padding: 0 6px; height: 22px; font-weight: bold;" 
                        :disabled="payForm.days_to_pay >= payingItem?.unpaid_days_worked"
                        @click.stop="adjustDaysToPay(1)"
                      >+</button>
                    </div>
                    <span v-else-if="payingItem?.unpaid_days_worked" class="text-2xs text-secondary font-medium">
                      ({{ payingItem?.unpaid_days_worked }} วัน)
                    </span>

                    <span class="font-bold text-xs text-primary ml-2xs">
                      {{ formatCurrency(computedBaseSalaryToPay) }}
                    </span>
                  </div>
                </div>

                <!-- 2. Event OT -->
                <label 
                  v-if="payingItem?.event_ot_amount > 0"
                  class="flex flex-between align-center cursor-pointer"
                  :style="{
                    background: payForm.pay_event_ot ? 'rgba(52, 199, 89, 0.08)' : '#ffffff',
                    border: '1px solid ' + (payForm.pay_event_ot ? 'var(--success)' : 'var(--border-color)'),
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-xs) var(--space-sm)'
                  }"
                >
                  <div class="flex align-center gap-xs">
                    <input 
                      type="checkbox" 
                      v-model="payForm.pay_event_ot" 
                      @change="handlePayoutCheckboxChange"
                      style="width: 16px; height: 16px; accent-color: var(--primary);" 
                    />
                    <span class="text-xs font-semibold">จ่าย OT งานพิเศษ</span>
                  </div>
                  <span class="font-bold text-xs text-success">+{{ formatCurrency(payingItem?.event_ot_amount) }}</span>
                </label>

                <!-- 3. Salary Advance Deduction -->
                <label 
                  v-if="payingItem?.advance_deducted_amount > 0"
                  class="flex flex-between align-center cursor-pointer"
                  :style="{
                    background: payForm.deduct_advance ? 'rgba(255, 59, 48, 0.08)' : '#ffffff',
                    border: '1px solid ' + (payForm.deduct_advance ? 'var(--danger)' : 'var(--border-color)'),
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-xs) var(--space-sm)'
                  }"
                >
                  <div class="flex align-center gap-xs">
                    <input 
                      type="checkbox" 
                      v-model="payForm.deduct_advance" 
                      @change="handlePayoutCheckboxChange"
                      style="width: 16px; height: 16px; accent-color: var(--danger);" 
                    />
                    <span class="text-xs font-semibold">หักเงินเบิกล่วงหน้า</span>
                  </div>
                  <span class="font-bold text-xs text-danger">-{{ formatCurrency(payingItem?.advance_deducted_amount) }}</span>
                </label>

                <!-- 4. Guarantee Deposit Deduction (แสดงเฉพาะเมื่อยังไม่เคยวางประกัน หรือไม่มีรายการ held/refunded) -->
                <div v-if="!payingItem?.guarantee || (payingItem?.guarantee?.status !== 'held' && payingItem?.guarantee?.status !== 'refunded')">
                  <label 
                    class="flex flex-between align-center cursor-pointer"
                    :style="{
                      background: payForm.deduct_guarantee ? 'rgba(255, 149, 0, 0.08)' : '#ffffff',
                      border: '1px solid ' + (payForm.deduct_guarantee ? 'var(--warning)' : 'var(--border-color)'),
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-xs) var(--space-sm)'
                    }"
                  >
                    <div class="flex align-center gap-xs">
                      <input 
                        type="checkbox" 
                        v-model="payForm.deduct_guarantee" 
                        @change="handlePayoutCheckboxChange"
                        style="width: 16px; height: 16px; accent-color: var(--warning);" 
                      />
                      <span class="text-xs font-semibold">
                        หักเงินประกันพนักงาน (งวด {{ payrollMonthLabel }})
                      </span>
                    </div>
                    <span class="font-bold text-xs text-warning">-{{ formatCurrency(payForm.holdback_deducted_amount || 1000) }}</span>
                  </label>
                  <div 
                    v-if="payForm.deduct_guarantee && earningsBeforeGuarantee < (payForm.holdback_deducted_amount || 1000)" 
                    class="text-2xs text-warning mt-2xs px-xs font-semibold"
                  >
                    <i class="fa-solid fa-triangle-exclamation mr-2xs"></i> ยอดค่าแรงในรอบนี้ ({{ formatCurrency(earningsBeforeGuarantee) }}) น้อยกว่าเงินประกัน ฿1,000
                  </div>
                </div>
              </div>
            </div>

            <!-- Total Net Payout Display Card (Auto calculated from checklist) -->
            <div class="form-group mb-sm" style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: var(--space-md);">
              <div class="flex flex-between align-center">
                <span class="font-bold text-xs text-secondary">
                  <i class="fa-solid fa-coins mr-xs text-warning"></i> ยอดจ่ายสุทธิรอบนี้:
                </span>
                <span class="font-bold text-md text-secondary">
                  {{ formatCurrency(computedNetPayable) }}
                </span>
              </div>
              <div class="text-secondary mt-xs" style="font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3;">
                * ยอดเงินนี้จะถูกบันทึกเป็นรายจ่ายสาขา (คำนวณอัตโนมัติตามรายการที่เลือก)
              </div>
            </div>

            <div class="form-group mb-sm">
              <label class="form-label font-bold text-xs">ช่องทางการจ่ายเงิน *</label>
              <div class="custom-select-wrapper" style="width: 100%; position: relative;" @click.stop>
                <div 
                  class="custom-select-trigger" 
                  :class="{ 'active': isPayPaymentMethodDropdownOpen }" 
                  @click="isPayPaymentMethodDropdownOpen = !isPayPaymentMethodDropdownOpen"
                >
                  <span class="custom-select-text" style="display: inline-flex; align-items: center; gap: 6px;">
                    <i :class="payForm.payment_method === 'transfer' ? 'fa-solid fa-mobile-screen-button' : 'fa-solid fa-money-bill-wave'"></i>
                    {{ payForm.payment_method === 'transfer' ? 'จ่ายเงินโอน' : 'จ่ายเงินสด (ตัดยอดจากลิ้นชัก)' }}
                  </span>
                </div>
                <div v-if="isPayPaymentMethodDropdownOpen" class="custom-select-dropdown" style="z-index: 1000;">
                  <div class="custom-select-option" :class="{ 'selected': payForm.payment_method === 'cash' }" @click="selectPayPaymentMethod('cash')">
                    <i class="fa-solid fa-money-bill-wave" style="margin-right: 4px;"></i> จ่ายเงินสด (ตัดยอดจากลิ้นชัก)
                  </div>
                  <div class="custom-select-option" :class="{ 'selected': payForm.payment_method === 'transfer' }" @click="selectPayPaymentMethod('transfer')">
                    <i class="fa-solid fa-mobile-screen-button" style="margin-right: 4px;"></i> จ่ายเงินโอน
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group mb-sm">
              <label class="form-label font-bold text-xs">วันที่จ่ายเงิน *</label>
              <div class="custom-select-wrapper" style="width: 100%; position: relative;" @click.stop>
                <div 
                  class="picker-trigger-btn w-full" 
                  :class="{ 'active': isPayDateDropdownOpen }" 
                  @click="togglePayDateDropdown"
                  style="width: 100%; justify-content: space-between; padding: 0 var(--space-md);"
                >
                  <span class="flex align-center gap-sm">
                    <i class="fa-solid fa-calendar-day text-primary"></i>
                    <span>{{ payDateLabel }}</span>
                  </span>
                  <i class="fa-solid fa-chevron-down text-xs text-secondary ml-xs"></i>
                </div>

                <!-- Date Picker Calendar Popover -->
                <div v-if="isPayDateDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 4px); width: 100% !important; max-height: none !important; overflow-y: visible !important; padding: var(--space-sm); display: flex; flex-direction: column; gap: var(--space-xs); z-index: 1000;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: var(--space-xs); border-bottom: 1px solid var(--border-color);">
                    <button type="button" class="picker-nav-btn" style="height: 32px !important; width: 32px !important; min-width: 32px !important;" @click.stop="adjustPayDatePickerMonth(-1)">
                      <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <span class="font-bold" style="font-size: var(--font-sm);">{{ payDatePickerMonthName }} {{ payDatePickerYear + 543 }}</span>
                    <button type="button" class="picker-nav-btn" style="height: 32px !important; width: 32px !important; min-width: 32px !important;" @click.stop="adjustPayDatePickerMonth(1)">
                      <i class="fa-solid fa-chevron-right"></i>
                    </button>
                  </div>
                  <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: var(--font-xs); font-weight: bold; color: var(--text-secondary); margin-top: 4px;">
                    <div v-for="day in ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']" :key="day">{{ day }}</div>
                  </div>
                  <div class="calendar-days-grid">
                    <div v-for="empty in payDatePickerStartOffset" :key="'empty-'+empty"></div>
                    <button 
                      v-for="dNum in payDatePickerDaysCount" 
                      :key="dNum"
                      type="button"
                      class="calendar-day-btn"
                      :class="{ 'btn-primary selected': isPayDatePickerSelected(dNum) }"
                      @click="selectPayDatePickerDay(dNum)"
                    >
                      {{ dNum }}
                    </button>
                  </div>
                </div>
              </div>
            </div>



            <div class="flex gap-md mt-md">
              <button class="btn-modal btn-modal-secondary flex-1" @click="showPayModal = false">ยกเลิก</button>
              <button 
                class="btn-modal btn-modal-primary flex-1" 
                :disabled="processingPayout || payForm.custom_net_paid === null || payForm.custom_net_paid === undefined || payForm.custom_net_paid < 0"
                @click="handleConfirmPayout"
              >
                <i v-if="processingPayout" class="fa-solid fa-spinner fa-spin"></i>
                <i v-else class="fa-solid fa-money-bill-wave"></i>
                <span>{{ processingPayout ? ' กำลังบันทึก...' : ' ยืนยันจ่ายเงิน' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL 5: ประวัติการจ่ายเงินเดือนในงวด (Payout History Modal) -->
    <Teleport to="body">
      <div v-if="showHistoryModal" class="modal-container active">
        <div class="modal-overlay" @click="showHistoryModal = false"></div>
        <div class="modal-content modal-center w-full max-w-md" style="position:relative; z-index:2; max-height: 85vh; display: flex; flex-direction: column;">
          <div class="modal-header">
            <h3><i class="fa-solid fa-receipt" style="margin-right: 6px;"></i> ประวัติการจ่ายเงิน: {{ selectedHistoryStaff?.name }}</h3>
            <button class="modal-close" @click="showHistoryModal = false">✕</button>
          </div>
          <div class="modal-body" style="overflow-y: auto;">
            <div class="text-center mb-sm">
              <h4 class="font-bold text-base text-primary">ประวัติการจ่ายเงินเดือนประจำงวด {{ payrollMonth }}</h4>
              <p class="text-xs text-secondary">
                จ่ายแล้วทั้งหมด {{ selectedHistoryStaff?.payout_count_month }} รอบ รวม 
                <span :class="Number(selectedHistoryStaff?.total_paid_amount_month || 0) === 0 ? 'text-danger font-bold' : 'text-primary font-bold'">
                  {{ formatCurrency(selectedHistoryStaff?.total_paid_amount_month) }}
                </span>
              </p>
            </div>

            <div v-if="!selectedHistoryStaff?.history_payouts || selectedHistoryStaff?.history_payouts.length === 0" class="text-center p-lg text-secondary">
              ยังไม่มีประวัติการจ่ายเงินในเดือนนี้
            </div>

            <div v-else class="flex flex-col gap-sm">
              <div 
                v-for="(slip, idx) in selectedHistoryStaff.history_payouts" 
                :key="slip.id"
                class="form-group"
                :style="{
                  background: slip.status === 'cancelled' ? '#fafafa' : '#ffffff',
                  border: '1px solid ' + (slip.status === 'cancelled' ? 'rgba(255, 59, 48, 0.35)' : 'var(--border-color)'),
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-md)',
                  marginBottom: '0',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  opacity: slip.status === 'cancelled' ? '0.85' : '1'
                }"
              >
                <div class="flex flex-between align-center mb-xs">
                  <span class="font-bold text-sm" :class="slip.status === 'cancelled' ? 'text-secondary' : 'text-primary'">
                    <i class="fa-solid fa-file-invoice-dollar mr-xs" :class="slip.status === 'cancelled' ? 'text-secondary' : 'text-primary'"></i> 
                    สลิปรอบที่ {{ selectedHistoryStaff.history_payouts.length - idx }}
                  </span>
                  <div class="flex align-center gap-xs">
                    <span v-if="slip.status === 'cancelled'" class="capsule-badge badge-danger text-xs font-bold">
                      <i class="fa-solid fa-ban mr-2xs"></i> ยกเลิกสลิป & คืนยอดแล้ว
                    </span>
                    <span v-else class="capsule-badge badge-success text-xs">
                      {{ slip.payment_method === 'transfer' ? '📱 เงินโอน' : '💵 เงินสด' }} • {{ formatDate(slip.payment_date) }}
                    </span>
                  </div>
                </div>
                <div class="flex flex-between text-xs text-secondary mb-2xs">
                  <span>รอบการทำงาน:</span>
                  <span><strong>{{ slip.days_worked }}</strong> วัน</span>
                </div>
                <div class="flex flex-between text-xs text-secondary mb-2xs">
                  <span>ฐานค่าแรง:</span>
                  <span>{{ formatCurrency(slip.base_salary_amount) }}</span>
                </div>
                <div v-if="slip.event_ot_amount > 0" class="flex flex-between text-xs text-success mb-2xs">
                  <span>OT งานพิเศษ:</span>
                  <span>+{{ formatCurrency(slip.event_ot_amount) }}</span>
                </div>
                <div v-if="slip.advance_deducted_amount > 0" class="flex flex-between text-xs text-danger mb-2xs">
                  <span>หักเบิกล่วงหน้า:</span>
                  <span>-{{ formatCurrency(slip.advance_deducted_amount) }}</span>
                </div>
                <div v-if="slip.holdback_deducted_amount > 0" class="flex flex-between text-xs text-warning mb-2xs">
                  <span>หักเงินประกันพนักงาน:</span>
                  <span>-{{ formatCurrency(slip.holdback_deducted_amount) }}</span>
                </div>
                <div v-if="slip.note" class="text-xs text-secondary mb-2xs" style="font-style: italic;">
                  หมายเหตุ: {{ slip.note }}
                </div>
                <div v-if="slip.status === 'cancelled' && slip.cancel_reason" class="text-xs text-danger mb-2xs font-semibold">
                  <i class="fa-solid fa-circle-info mr-2xs"></i> เหตุผลยกเลิก: {{ slip.cancel_reason }}
                </div>
                <div class="divider my-xs" style="height:1px; background:var(--border-color);"></div>
                <div class="flex flex-between align-center font-bold text-sm">
                  <span>ยอดจ่ายสุทธิ:</span>
                  <span 
                    class="text-base font-bold" 
                    :class="slip.status === 'cancelled' ? 'text-secondary' : (Number(slip.net_paid_amount || 0) === 0 ? 'text-danger' : 'text-primary')"
                    :style="slip.status === 'cancelled' ? 'text-decoration: line-through;' : ''"
                  >
                    {{ formatCurrency(slip.net_paid_amount) }}
                  </span>
                </div>

                <!-- Reversal Action Button (For active slips only, Admin only) -->
                <div v-if="slip.status !== 'cancelled' && isAdminUser" class="mt-sm pt-xs flex justify-end" style="border-top: 1px dashed var(--border-color);">
                  <button 
                    class="btn-action btn-action-primary" 
                    style="height: 34px; min-width: auto; padding: 0 14px; font-size: var(--font-xs);"
                    :disabled="reversingSlipId === slip.id"
                    @click="handleReversePayrollSlip(slip)"
                  >
                    <i v-if="reversingSlipId === slip.id" class="fa-solid fa-spinner fa-spin"></i>
                    <i v-else class="fa-solid fa-rotate-left"></i>
                    <span>{{ reversingSlipId === slip.id ? 'กำลังยกเลิก...' : 'ยกเลิกสลิป & คืนยอด' }}</span>
                  </button>
                </div>
              </div>
            </div>

            <div class="flex gap-md mt-lg">
              <button class="btn-modal btn-modal-secondary flex-1" @click="showHistoryModal = false">ปิด</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>



    <!-- MODAL 8: คืนเงินประกันพนักงาน (Refund Guarantee Modal) -->
    <Teleport to="body">
      <div v-if="showRefundModal" class="modal-container active">
        <div class="modal-overlay" @click="showRefundModal = false"></div>
        <div class="modal-content modal-center w-full max-w-sm" style="position:relative; z-index:2;">
          <div class="modal-header">
            <h3><i class="fa-solid fa-arrow-rotate-left text-primary" style="margin-right: 6px;"></i> คืนเงินประกันพนักงาน</h3>
            <button class="modal-close" @click="showRefundModal = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group" style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: var(--space-md);">
              <div class="flex flex-between align-center mb-xs">
                <span class="text-sm font-bold text-primary">{{ refundForm.targetStaff?.name }}</span>
                <span class="capsule-badge badge-warning text-xs">
                  วางประกันไว้: {{ formatDate(refundForm.guarantee?.deposit_date) }}
                </span>
              </div>
              <div class="flex flex-between text-xs text-secondary">
                <span>ยอดเงินประกันที่ต้องคืน:</span>
                <span class="font-bold text-primary text-sm">{{ formatCurrency(refundForm.guarantee?.amount || 1000) }}</span>
              </div>
            </div>

            <div class="form-group mb-sm">
              <label class="form-label font-bold text-xs">วันที่คืนเงินประกัน *</label>
              <div class="custom-select-wrapper" style="width: 100%; position: relative;" @click.stop>
                <div 
                  class="picker-trigger-btn w-full" 
                  :class="{ 'active': isRefundDateDropdownOpen }" 
                  @click="toggleRefundDateDropdown"
                  style="width: 100%; justify-content: space-between; padding: 0 var(--space-md);"
                >
                  <span class="flex align-center gap-sm">
                    <i class="fa-solid fa-calendar-day text-primary"></i>
                    <span>{{ refundDateLabel }}</span>
                  </span>
                  <i class="fa-solid fa-chevron-down text-xs text-secondary ml-xs"></i>
                </div>

                <!-- Date Picker Calendar Popover -->
                <div v-if="isRefundDateDropdownOpen" class="custom-select-dropdown" style="top: calc(100% + 4px); width: 100% !important; max-height: none !important; overflow-y: visible !important; padding: var(--space-sm); display: flex; flex-direction: column; gap: var(--space-xs); z-index: 1000;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: var(--space-xs); border-bottom: 1px solid var(--border-color);">
                    <button type="button" class="picker-nav-btn" style="height: 32px !important; width: 32px !important; min-width: 32px !important;" @click.stop="adjustRefundDatePickerMonth(-1)">
                      <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <span class="font-bold" style="font-size: var(--font-sm);">{{ refundDatePickerMonthName }} {{ refundDatePickerYear + 543 }}</span>
                    <button type="button" class="picker-nav-btn" style="height: 32px !important; width: 32px !important; min-width: 32px !important;" @click.stop="adjustRefundDatePickerMonth(1)">
                      <i class="fa-solid fa-chevron-right"></i>
                    </button>
                  </div>
                  <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: var(--font-xs); font-weight: bold; color: var(--text-secondary); margin-top: 4px;">
                    <div v-for="day in ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']" :key="day">{{ day }}</div>
                  </div>
                  <div class="calendar-days-grid">
                    <div v-for="empty in refundDatePickerStartOffset" :key="'empty-'+empty"></div>
                    <button 
                      v-for="dNum in refundDatePickerDaysCount" 
                      :key="dNum"
                      type="button"
                      class="calendar-day-btn"
                      :class="{ 'btn-primary selected': isRefundDatePickerSelected(dNum) }"
                      @click="selectRefundDatePickerDay(dNum)"
                    >
                      {{ dNum }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group mb-sm">
              <label class="form-label font-bold text-xs">ช่องทางการคืนเงิน *</label>
              <div class="custom-select-wrapper" style="width: 100%; position: relative;" @click.stop>
                <div 
                  class="custom-select-trigger" 
                  :class="{ 'active': isRefundPaymentMethodDropdownOpen }" 
                  @click="isRefundPaymentMethodDropdownOpen = !isRefundPaymentMethodDropdownOpen"
                >
                  <span class="custom-select-text" style="display: inline-flex; align-items: center; gap: 6px;">
                    <i :class="refundForm.refund_payment_method === 'transfer' ? 'fa-solid fa-mobile-screen-button' : 'fa-solid fa-money-bill-wave'"></i>
                    {{ refundForm.refund_payment_method === 'transfer' ? 'คืนด้วยการโอนเงิน' : 'คืนเงินสด (จ่ายออกจากลิ้นชัก)' }}
                  </span>
                </div>
                <div v-if="isRefundPaymentMethodDropdownOpen" class="custom-select-dropdown" style="z-index: 1000;">
                  <div class="custom-select-option" :class="{ 'selected': refundForm.refund_payment_method === 'cash' }" @click="selectRefundPaymentMethod('cash')">
                    <i class="fa-solid fa-money-bill-wave" style="margin-right: 4px;"></i> คืนเงินสด (จ่ายออกจากลิ้นชัก)
                  </div>
                  <div class="custom-select-option" :class="{ 'selected': refundForm.refund_payment_method === 'transfer' }" @click="selectRefundPaymentMethod('transfer')">
                    <i class="fa-solid fa-mobile-screen-button" style="margin-right: 4px;"></i> คืนด้วยการโอนเงิน
                  </div>
                </div>
              </div>
            </div>

            <div class="bulk-hint-box" style="padding: var(--space-xs); margin-bottom: var(--space-md);">
              <div class="text-xs text-secondary">
                <i class="fa-solid fa-circle-exclamation text-warning mr-xs"></i> เมื่อกดยืนยัน ยอดเงิน <strong>{{ formatCurrency(refundForm.guarantee?.amount || 1000) }}</strong> จะถูกตัดเป็นรายจ่ายในหมวด <em>ค่าแรงพนักงาน/เงินเดือน</em> ของสาขาโดยอัตโนมัติ
              </div>
            </div>

            <div class="flex gap-md mt-lg">
              <button class="btn-modal btn-modal-secondary flex-1" @click="showRefundModal = false">ยกเลิก</button>
              <button 
                class="btn-modal btn-modal-primary flex-1" 
                :disabled="savingRefund"
                @click="handleConfirmRefundGuarantee"
              >
                <i v-if="savingRefund" class="fa-solid fa-spinner fa-spin"></i>
                <i v-else class="fa-solid fa-arrow-rotate-left"></i>
                <span>{{ savingRefund ? ' กำลังบันทึก...' : ' ยืนยันคืนเงินประกัน' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL 6: สรุปรายละเอียดรายวัน (Calendar Day Detail Modal) -->
    <Teleport to="body">
      <div v-if="showDayDetailModal" class="modal-container active">
        <div class="modal-overlay" @click="showDayDetailModal = false"></div>
        <div class="modal-content modal-center w-full max-w-sm" style="position:relative; z-index:2;">
          <div class="modal-header">
            <h3><i class="fa-solid fa-calendar-day" style="margin-right: 6px;"></i> วันที่ {{ selectedDayDetail?.formattedDate }}</h3>
            <button class="modal-close" @click="showDayDetailModal = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: var(--space-md);">
              <div class="flex flex-between align-center mb-xs">
                <span class="font-bold text-sm text-primary">{{ currentCalendarStaff?.name }}</span>
                <span class="skill-badge" :class="currentCalendarStaff?.skill_level" style="font-size: 10px; padding: 1px 6px;">
                  {{ getSkillLabel(currentCalendarStaff?.skill_level) }}
                </span>
              </div>
              <div class="text-xs text-secondary mb-xs">
                อัตราค่าจ้าง: <strong>{{ formatCurrency(currentCalendarStaff?.wage_rate) }}</strong> / {{ currentCalendarStaff?.wage_type === 'monthly' ? 'เดือน' : 'วัน' }}
              </div>
              
              <div class="divider my-xs" style="height:1px; background:var(--border-color);"></div>

              <!-- Attendance Detail -->
              <div class="flex flex-between align-center mb-xs">
                <span class="text-xs text-secondary">สถานะการทำงาน:</span>
                <span v-if="selectedDayDetail?.status === 'present'" class="capsule-badge badge-success text-xs">
                  <i class="fa-solid fa-circle-check"></i> มาทำงาน (ได้ค่าแรง)
                </span>
                <span v-else-if="selectedDayDetail?.status === 'leave_unpaid'" class="capsule-badge badge-warning text-xs">
                  <i class="fa-solid fa-calendar-xmark"></i> ลาหยุด (ไม่ได้รับค่าจ้าง)
                </span>
                <span v-else-if="selectedDayDetail?.status === 'absent'" class="capsule-badge" style="background: rgba(239,68,68,0.12); color:#dc2626; border:1px solid rgba(239,68,68,0.3); font-size: 11px;">
                  <i class="fa-solid fa-circle-xmark"></i> ขาดงาน (ไม่ได้รับค่าจ้าง)
                </span>
                <span v-else class="text-xs text-muted">ไม่มีการบันทึกเวลา</span>
              </div>

              <div class="flex flex-between text-xs mb-xs">
                <span class="text-secondary">ค่าจ้างประจำวัน:</span>
                <span class="font-bold" :class="selectedDayDetail?.dailyWage > 0 ? 'text-primary' : 'text-muted'">
                  {{ formatCurrency(selectedDayDetail?.dailyWage || 0) }}
                </span>
              </div>

              <div class="flex flex-between text-xs mb-xs">
                <span class="text-secondary">สวัสดิการข้าวเที่ยงฟรี:</span>
                <span v-if="selectedDayDetail?.hadLunchBenefit" class="font-bold text-warning">🍚 ได้รับ</span>
                <span v-else class="text-muted">-</span>
              </div>

              <!-- Event OT Details -->
              <div v-if="selectedDayDetail?.ots && selectedDayDetail.ots.length > 0" class="mt-xs">
                <div class="text-xs font-bold text-success mb-2xs"><i class="fa-solid fa-tags"></i> OT งานพิเศษในวันนี้:</div>
                <div v-for="ot in selectedDayDetail.ots" :key="ot.id" class="flex flex-between text-xs p-xs mb-2xs" style="background: rgba(16,185,129,0.08); border-radius: 4px;">
                  <span>{{ ot.event_name }}</span>
                  <strong class="text-success">+{{ formatCurrency(ot.amount_per_person) }}</strong>
                </div>
              </div>

              <!-- Advances Details -->
              <div v-if="selectedDayDetail?.advances && selectedDayDetail.advances.length > 0" class="mt-xs">
                <div class="text-xs font-bold text-danger mb-2xs"><i class="fa-solid fa-hand-holding-dollar"></i> เบิกเงินล่วงหน้าในวันนี้:</div>
                <div v-for="adv in selectedDayDetail.advances" :key="adv.id" class="flex flex-between text-xs p-xs mb-2xs" style="background: rgba(239,68,68,0.08); border-radius: 4px;">
                  <span>{{ adv.payment_method === 'transfer' ? 'โอน' : 'เงินสด' }} ({{ adv.note || 'ไม่มีหมายเหตุ' }})</span>
                  <strong class="text-danger">-{{ formatCurrency(adv.amount) }}</strong>
                </div>
              </div>

              <!-- Payout Details -->
              <div v-if="selectedDayDetail?.payouts && selectedDayDetail.payouts.length > 0" class="mt-xs">
                <div class="text-xs font-bold text-primary mb-2xs"><i class="fa-solid fa-receipt"></i> จ่ายค่าจ้างในวันนี้:</div>
                <div v-for="pay in selectedDayDetail.payouts" :key="pay.id" class="flex flex-between text-xs p-xs mb-2xs" style="background: rgba(139,3,19,0.08); border-radius: 4px;">
                  <span>{{ pay.payment_method === 'transfer' ? 'โอน' : 'เงินสด' }} (รอบทำงาน {{ pay.days_worked }} วัน)</span>
                  <strong class="text-primary font-bold">{{ formatCurrency(pay.net_paid_amount) }}</strong>
                </div>
              </div>
            </div>

            <div class="flex gap-md mt-lg">
              <button class="btn-modal btn-modal-secondary flex-1" @click="showDayDetailModal = false">ปิด</button>
              <button class="btn-modal btn-modal-primary flex-1" @click="jumpToAttendanceEdit(selectedDayDetail?.dateStr)">
                <i class="fa-solid fa-pen-to-square"></i> แก้ไขการลงเวลา
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import api from '../api';
import { ui, formatCurrency, formatDate, getUser } from '../helpers';

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
  }
});

const emit = defineEmits(['update:selected-month', 'update:selected-date', 'update:selected-year', 'update:period-mode']);

const currentUser = computed(() => getUser());
const isAdminUser = computed(() => currentUser.value?.role === 'admin' || currentUser.value?.role === 'manager');

const activeSubTab = ref('employees');

// Helper to get today's date in Thailand timezone (YYYY-MM-DD)
const getTodayStr = () => {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
};

const getCurrentMonthStr = () => {
  return getTodayStr().substring(0, 7);
};

const thaiMonthsNames = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const thaiMonthsShort = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

// ─── Subtab 1: Employees State ────────────────────────────────
const employees = ref([]);
const loadingEmployees = ref(false);
const showCompModal = ref(false);
const selectedEmp = ref(null);
const savingComp = ref(false);
const compForm = ref({
  wage_type: 'daily',
  wage_rate: 0,
  skill_level: 'regular',
  benefits: 'ข้าวเที่ยงฟรี'
});

const isCompWageTypeDropdownOpen = ref(false);
const isCompSkillLevelDropdownOpen = ref(false);

const selectCompWageType = (type) => {
  compForm.value.wage_type = type;
  isCompWageTypeDropdownOpen.value = false;
};

const selectCompSkillLevel = (skill) => {
  compForm.value.skill_level = skill;
  isCompSkillLevelDropdownOpen.value = false;
};

const fetchEmployees = async () => {
  loadingEmployees.value = true;
  try {
    const res = await api.employees.getAll({ branch_id: props.branchId || '' });
    if (res.success) {
      employees.value = res.data || [];
      if (!calendarSelectedStaffId.value && employees.value.length > 0) {
        calendarSelectedStaffId.value = employees.value[0].id;
      }
    }
  } catch (err) {
    console.error('Error fetching employees:', err);
  } finally {
    loadingEmployees.value = false;
  }
};

const openEditCompensationModal = (emp) => {
  selectedEmp.value = emp;
  compForm.value = {
    wage_type: emp.wage_type || 'daily',
    wage_rate: emp.wage_rate !== undefined ? emp.wage_rate : 300,
    skill_level: emp.skill_level || 'regular',
    benefits: emp.benefits || 'ข้าวเที่ยงฟรี'
  };
  isCompWageTypeDropdownOpen.value = false;
  isCompSkillLevelDropdownOpen.value = false;
  showCompModal.value = true;
};

const handleSaveCompensation = async () => {
  if (!selectedEmp.value) return;
  savingComp.value = true;
  try {
    const res = await api.employees.updateCompensation(selectedEmp.value.id, compForm.value);
    if (res.success) {
      ui.showToast('บันทึกข้อมูลค่าแรงเรียบร้อยแล้ว', 'success');
      showCompModal.value = false;
      await fetchEmployees();
      await fetchMonthlyAttendance();
    }
  } catch (err) {
    ui.showToast(err.message || 'บันทึกข้อมูลไม่สำเร็จ', 'error');
  } finally {
    savingComp.value = false;
  }
};

// ─── Subtab: Individual Calendar State ────────────────────────
const calendarSelectedStaffId = ref(null);
const calendarMonth = ref(getCurrentMonthStr());
const monthlyAttendanceList = ref([]);
const calendarEventOts = ref([]);
const calendarAdvances = ref([]);
const loadingMonthlyAttendance = ref(false);
const showDayDetailModal = ref(false);
const selectedDayDetail = ref(null);

const isCalendarStaffDropdownOpen = ref(false);
const isCalendarMonthDropdownOpen = ref(false);
const calendarMonthPickerYear = ref(new Date().getFullYear());

const toggleCalendarStaffDropdown = () => {
  const cur = isCalendarStaffDropdownOpen.value;
  closeAllPickerDropdowns();
  isCalendarStaffDropdownOpen.value = !cur;
};

const selectCalendarStaff = (id) => {
  calendarSelectedStaffId.value = id;
  isCalendarStaffDropdownOpen.value = false;
};

const currentCalendarStaff = computed(() => {
  return employees.value.find(e => e.id === calendarSelectedStaffId.value) || null;
});

const calendarMonthLabel = computed(() => {
  if (!calendarMonth.value) return '';
  const [y, m] = calendarMonth.value.split('-');
  const monthIdx = parseInt(m, 10) - 1;
  const beYear = parseInt(y, 10) + 543;
  return `${thaiMonthsNames[monthIdx] || ''} ${beYear}`;
});

const toggleCalendarMonthDropdown = () => {
  const cur = isCalendarMonthDropdownOpen.value;
  closeAllPickerDropdowns();
  isCalendarMonthDropdownOpen.value = !cur;
  if (isCalendarMonthDropdownOpen.value) {
    if (calendarMonth.value) {
      calendarMonthPickerYear.value = Number(calendarMonth.value.split('-')[0]);
    } else {
      calendarMonthPickerYear.value = new Date().getFullYear();
    }
  }
};

const isCalendarMonthPickerSelected = (m) => {
  if (!calendarMonth.value) return false;
  const [y, mm] = calendarMonth.value.split('-');
  return calendarMonthPickerYear.value === Number(y) && m === Number(mm);
};

const selectCalendarMonthPicker = (m) => {
  calendarMonth.value = `${calendarMonthPickerYear.value}-${String(m).padStart(2, '0')}`;
  payrollMonth.value = calendarMonth.value;
  isCalendarMonthDropdownOpen.value = false;
  emit('update:selected-month', calendarMonth.value);
  emit('update:period-mode', 'monthly');
  fetchMonthlyAttendance();
  fetchEventOts();
  fetchAdvances();
};

const adjustCalendarMonthPickerYear = (delta) => {
  calendarMonthPickerYear.value += delta;
};

const adjustCalendarMonth = (diff) => {
  if (!calendarMonth.value) return;
  const [y, m] = calendarMonth.value.split('-').map(Number);
  const d = new Date(y, m - 1 + diff, 1);
  const nextY = d.getFullYear();
  const nextM = String(d.getMonth() + 1).padStart(2, '0');
  calendarMonth.value = `${nextY}-${nextM}`;
  payrollMonth.value = calendarMonth.value;
  emit('update:selected-month', calendarMonth.value);
  emit('update:period-mode', 'monthly');
  fetchMonthlyAttendance();
  fetchEventOts();
  fetchAdvances();
};

const setCalendarCurrentMonth = () => {
  calendarMonth.value = getCurrentMonthStr();
  payrollMonth.value = calendarMonth.value;
  emit('update:selected-month', calendarMonth.value);
  emit('update:period-mode', 'monthly');
  fetchMonthlyAttendance();
  fetchEventOts();
  fetchAdvances();
};

const fetchMonthlyAttendance = async () => {
  loadingMonthlyAttendance.value = true;
  try {
    const [attRes, otRes, advRes] = await Promise.all([
      api.employees.getAttendance({
        month: calendarMonth.value,
        branch_id: props.branchId || ''
      }),
      api.employees.getEventOts({
        month: calendarMonth.value,
        branch_id: props.branchId || ''
      }),
      api.employees.getAdvances({
        month: calendarMonth.value,
        branch_id: props.branchId || ''
      })
    ]);
    if (attRes.success) {
      monthlyAttendanceList.value = attRes.data || [];
    }
    if (otRes.success) {
      calendarEventOts.value = otRes.data || [];
    }
    if (advRes.success) {
      calendarAdvances.value = advRes.data || [];
    }
    if (isAdminUser.value) {
      await fetchPayrollCalculations();
    }
  } catch (err) {
    console.error('Error fetching monthly attendance:', err);
  } finally {
    loadingMonthlyAttendance.value = false;
  }
};

const calendarStartOffset = computed(() => {
  if (!calendarMonth.value) return 0;
  const [y, m] = calendarMonth.value.split('-').map(Number);
  return new Date(y, m - 1, 1).getDay(); // 0 = Sun
});

const calendarDays = computed(() => {
  if (!calendarMonth.value) return [];
  const [y, m] = calendarMonth.value.split('-').map(Number);
  const totalDays = new Date(y, m, 0).getDate();
  const todayStr = getTodayStr();
  const staffId = calendarSelectedStaffId.value;
  const staff = currentCalendarStaff.value;
  const wageRate = staff?.wage_rate || 0;

  // History payouts for this staff
  const staffHistoryPayouts = (payrollList.value.find(p => p.user_id === staffId)?.history_payouts || []);

  const result = [];
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const att = monthlyAttendanceList.value.find(a => a.user_id === staffId && a.work_date === dateStr);
    
    // OT events for this staff on this day
    const ots = calendarEventOts.value.filter(ev => 
      ev.event_date === dateStr && 
      (ev.participants || []).some(p => p.user_id === staffId)
    );

    // Advances for this staff on this day
    const advs = calendarAdvances.value.filter(adv => 
      adv.user_id === staffId && 
      adv.advance_date === dateStr
    );

    // Payouts for this staff on this day
    const payouts = staffHistoryPayouts.filter(pay => pay.payment_date === dateStr);

    const status = att ? att.status : null;
    const isPresent = status === 'present';
    const hadLunch = isPresent && (att?.had_lunch_benefit === 1 || att?.had_lunch_benefit === true);
    const dailyWage = isPresent ? (att?.daily_wage !== undefined && att?.daily_wage !== null ? Number(att.daily_wage) : wageRate) : 0;

    result.push({
      dayNum: d,
      dateStr,
      formattedDate: formatDate(dateStr),
      isToday: dateStr === todayStr,
      status,
      hadLunchBenefit: hadLunch,
      dailyWage,
      ots,
      advances: advs,
      payouts
    });
  }
  return result;
});

const selectedStaffSummary = computed(() => {
  if (!currentCalendarStaff.value) return null;
  const days = calendarDays.value;
  let daysWorked = 0;
  let leaveDays = 0;
  let absentDays = 0;
  let lunchCount = 0;
  let baseWage = 0;
  let totalOt = 0;
  let totalAdvances = 0;
  let totalPayouts = 0;

  for (const day of days) {
    if (day.status === 'present') {
      daysWorked++;
      baseWage += day.dailyWage;
      if (day.hadLunchBenefit) lunchCount++;
    } else if (day.status === 'leave_unpaid') {
      leaveDays++;
    } else if (day.status === 'absent') {
      absentDays++;
    }

    for (const ot of day.ots) {
      totalOt += Number(ot.amount_per_person || 0);
    }
    for (const adv of day.advances) {
      totalAdvances += Number(adv.amount || 0);
    }
    for (const pay of day.payouts || []) {
      totalPayouts += Number(pay.net_paid_amount || 0);
    }
  }

  return {
    daysWorked,
    leaveDays,
    absentDays,
    lunchCount,
    baseWage,
    totalOt,
    totalAdvances,
    totalPayouts
  };
});

const openDayDetail = (day) => {
  selectedDayDetail.value = day;
  showDayDetailModal.value = true;
};

const jumpToAttendanceEdit = (dateStr) => {
  showDayDetailModal.value = false;
  attendanceDate.value = dateStr;
  activeSubTab.value = 'attendance';
  emit('update:selected-date', attendanceDate.value);
  emit('update:period-mode', 'daily');
  fetchDailyAttendance();
};

// ─── Subtab 2: Attendance State ──────────────────────────────
const attendanceDate = ref(getTodayStr());
const attendanceRecords = ref([]);
const loadingAttendance = ref(false);
const savingAttendance = ref(false);

const isAttendanceDateDropdownOpen = ref(false);
const attendanceDatePickerYear = ref(new Date().getFullYear());
const attendanceDatePickerMonth = ref(new Date().getMonth() + 1);

const attendanceDateLabel = computed(() => {
  if (!attendanceDate.value) return 'เลือกวัน';
  return formatDate(attendanceDate.value);
});

const attendanceDatePickerMonthName = computed(() => {
  return thaiMonthsNames[attendanceDatePickerMonth.value - 1] || '';
});

const attendanceDatePickerDaysCount = computed(() => {
  return new Date(attendanceDatePickerYear.value, attendanceDatePickerMonth.value, 0).getDate();
});

const attendanceDatePickerStartOffset = computed(() => {
  return new Date(attendanceDatePickerYear.value, attendanceDatePickerMonth.value - 1, 1).getDay();
});

const toggleAttendanceDateDropdown = () => {
  const cur = isAttendanceDateDropdownOpen.value;
  closeAllPickerDropdowns();
  isAttendanceDateDropdownOpen.value = !cur;
  if (isAttendanceDateDropdownOpen.value) {
    if (attendanceDate.value) {
      const [y, m] = attendanceDate.value.split('-');
      attendanceDatePickerYear.value = Number(y);
      attendanceDatePickerMonth.value = Number(m);
    } else {
      const today = new Date();
      attendanceDatePickerYear.value = today.getFullYear();
      attendanceDatePickerMonth.value = today.getMonth() + 1;
    }
  }
};

const isAttendanceDatePickerSelected = (day) => {
  if (!attendanceDate.value) return false;
  const [y, m, d] = attendanceDate.value.split('-');
  return attendanceDatePickerYear.value === Number(y) &&
         attendanceDatePickerMonth.value === Number(m) &&
         day === Number(d);
};

const selectAttendanceDatePickerDay = (day) => {
  attendanceDate.value = `${attendanceDatePickerYear.value}-${String(attendanceDatePickerMonth.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  isAttendanceDateDropdownOpen.value = false;
  emit('update:selected-date', attendanceDate.value);
  emit('update:period-mode', 'daily');
  fetchDailyAttendance();
};

const adjustAttendanceDatePickerMonth = (amount) => {
  let m = attendanceDatePickerMonth.value + amount;
  let y = attendanceDatePickerYear.value;
  if (m < 1) {
    m = 12;
    y -= 1;
  } else if (m > 12) {
    m = 1;
    y += 1;
  }
  attendanceDatePickerMonth.value = m;
  attendanceDatePickerYear.value = y;
};

const setTodayAttendance = () => {
  attendanceDate.value = getTodayStr();
  isAttendanceDateDropdownOpen.value = false;
  emit('update:selected-date', attendanceDate.value);
  emit('update:period-mode', 'daily');
  fetchDailyAttendance();
};

const fetchDailyAttendance = async () => {
  loadingAttendance.value = true;
  try {
    const res = await api.employees.getAttendance({
      date: attendanceDate.value,
      branch_id: props.branchId || ''
    });
    if (res.success) {
      attendanceRecords.value = (res.data || []).map(r => ({
        ...r,
        daily_wage: (r.daily_wage !== undefined && r.daily_wage !== null) ? Number(r.daily_wage) : (r.wage_rate || 0),
        status: r.status || 'present',
        had_lunch_benefit: r.had_lunch_benefit !== undefined ? r.had_lunch_benefit : 1
      }));
    }
  } catch (err) {
    console.error('Error fetching attendance:', err);
  } finally {
    loadingAttendance.value = false;
  }
};

const handleSaveAttendance = async () => {
  const zeroWageEmployee = attendanceRecords.value.find(r => r.status === 'present' && (!r.daily_wage || Number(r.daily_wage) <= 0));
  if (zeroWageEmployee) {
    const confirmed = await ui.showConfirm(
      'แจ้งเตือนค่าแรง 0 บาท',
      `พนักงาน "${zeroWageEmployee.name}" มีสถานะ "มาทำงาน" แต่ระบุค่าแรง 0 บาท (หรือยังไม่ได้ตั้งฐานค่าแรง)\n\nคุณต้องการยืนยันบันทึกต่อไปหรือไม่? (หรือกดยกเลิกเพื่อใส่ค่าแรงให้เรียบร้อย)`
    );
    if (!confirmed) return;
  }

  savingAttendance.value = true;
  try {
    const res = await api.employees.saveAttendance({
      work_date: attendanceDate.value,
      records: attendanceRecords.value,
      branch_id: props.branchId
    });
    if (res.success) {
      ui.showToast('บันทึกการลงเวลาเรียบร้อยแล้ว', 'success');
      await fetchDailyAttendance();
      await fetchMonthlyAttendance();
      if (isAdminUser.value) {
        await fetchPayrollCalculations();
      }
    }
  } catch (err) {
    ui.showToast(err.message || 'บันทึกการลงเวลาไม่สำเร็จ', 'error');
  } finally {
    savingAttendance.value = false;
  }
};

// ─── Subtab 3: Event OTs State ───────────────────────────────
const eventOts = ref([]);
const loadingEventOts = ref(false);
const showAddEventOtModal = ref(false);
const savingEventOt = ref(false);
const eventOtForm = ref({
  event_name: '',
  event_date: getTodayStr(),
  amount_per_person: 100,
  user_ids: []
});

const isEventOtDateDropdownOpen = ref(false);
const eventOtDatePickerYear = ref(new Date().getFullYear());
const eventOtDatePickerMonth = ref(new Date().getMonth() + 1);

const eventOtDateLabel = computed(() => {
  if (!eventOtForm.value.event_date) return 'เลือกวัน';
  return formatDate(eventOtForm.value.event_date);
});

const eventOtDatePickerMonthName = computed(() => {
  return thaiMonthsNames[eventOtDatePickerMonth.value - 1] || '';
});

const eventOtDatePickerDaysCount = computed(() => {
  return new Date(eventOtDatePickerYear.value, eventOtDatePickerMonth.value, 0).getDate();
});

const eventOtDatePickerStartOffset = computed(() => {
  return new Date(eventOtDatePickerYear.value, eventOtDatePickerMonth.value - 1, 1).getDay();
});

const toggleEventOtDateDropdown = () => {
  const cur = isEventOtDateDropdownOpen.value;
  closeAllPickerDropdowns();
  isEventOtDateDropdownOpen.value = !cur;
  if (isEventOtDateDropdownOpen.value) {
    if (eventOtForm.value.event_date) {
      const [y, m] = eventOtForm.value.event_date.split('-');
      eventOtDatePickerYear.value = Number(y);
      eventOtDatePickerMonth.value = Number(m);
    } else {
      const today = new Date();
      eventOtDatePickerYear.value = today.getFullYear();
      eventOtDatePickerMonth.value = today.getMonth() + 1;
    }
  }
};

const isEventOtDatePickerSelected = (day) => {
  if (!eventOtForm.value.event_date) return false;
  const [y, m, d] = eventOtForm.value.event_date.split('-');
  return eventOtDatePickerYear.value === Number(y) &&
         eventOtDatePickerMonth.value === Number(m) &&
         day === Number(d);
};

const selectEventOtDatePickerDay = (day) => {
  eventOtForm.value.event_date = `${eventOtDatePickerYear.value}-${String(eventOtDatePickerMonth.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  isEventOtDateDropdownOpen.value = false;
};

const adjustEventOtDatePickerMonth = (amount) => {
  let m = eventOtDatePickerMonth.value + amount;
  let y = eventOtDatePickerYear.value;
  if (m < 1) {
    m = 12;
    y -= 1;
  } else if (m > 12) {
    m = 1;
    y += 1;
  }
  eventOtDatePickerMonth.value = m;
  eventOtDatePickerYear.value = y;
};

const getPeriodQueryParams = () => {
  const params = { branch_id: props.branchId || '' };
  if (props.periodMode === 'daily') {
    params.date = props.selectedDate || getTodayStr();
  } else if (props.periodMode === 'yearly') {
    params.year = props.selectedYear || (props.selectedMonth ? props.selectedMonth.split('-')[0] : String(new Date().getFullYear()));
  } else {
    // monthly (default)
    params.month = props.selectedMonth || calendarMonth.value || payrollMonth.value || getCurrentMonthStr();
  }
  return params;
};

const emptyEventOtsMessage = computed(() => {
  if (props.periodMode === 'daily') {
    return `ยังไม่มีรายการ OT งานพิเศษในวันที่ ${formatDate(props.selectedDate || getTodayStr())}`;
  } else if (props.periodMode === 'yearly') {
    const y = props.selectedYear || (props.selectedMonth ? props.selectedMonth.split('-')[0] : String(new Date().getFullYear()));
    return `ยังไม่มีรายการ OT งานพิเศษในปี พ.ศ. ${Number(y) + 543}`;
  } else {
    return 'ยังไม่มีรายการ OT งานพิเศษในเดือนนี้';
  }
});

const emptyAdvancesMessage = computed(() => {
  if (props.periodMode === 'daily') {
    return `ยังไม่มีรายการเบิกเงินล่วงหน้าในวันที่ ${formatDate(props.selectedDate || getTodayStr())}`;
  } else if (props.periodMode === 'yearly') {
    const y = props.selectedYear || (props.selectedMonth ? props.selectedMonth.split('-')[0] : String(new Date().getFullYear()));
    return `ยังไม่มีรายการเบิกเงินล่วงหน้าในปี พ.ศ. ${Number(y) + 543}`;
  } else {
    return 'ยังไม่มีรายการเบิกเงินล่วงหน้าในเดือนนี้';
  }
});

const fetchEventOts = async () => {
  loadingEventOts.value = true;
  try {
    const params = getPeriodQueryParams();
    const res = await api.employees.getEventOts(params);
    if (res.success) {
      eventOts.value = res.data || [];
    }
  } catch (err) {
    console.error('Error fetching event ots:', err);
  } finally {
    loadingEventOts.value = false;
  }
};

watch(showAddEventOtModal, (isOpen) => {
  if (isOpen) {
    if (!eventOtForm.value.event_date) {
      eventOtForm.value.event_date = props.selectedDate || getTodayStr();
    }
  }
});

const handleSaveEventOt = async () => {
  if (savingEventOt.value) return;
  if (!eventOtForm.value.event_name || !eventOtForm.value.amount_per_person || eventOtForm.value.user_ids.length === 0) return;
  savingEventOt.value = true;
  try {
    const res = await api.employees.createEventOt({
      ...eventOtForm.value,
      branch_id: props.branchId
    });
    if (res.success) {
      ui.showToast('บันทึก OT อีเวนต์สำเร็จ', 'success');
      showAddEventOtModal.value = false;
      eventOtForm.value = {
        event_name: '',
        event_date: getTodayStr(),
        amount_per_person: 100,
        user_ids: []
      };
      await fetchEventOts();
      await fetchMonthlyAttendance();
      if (isAdminUser.value) {
        await fetchPayrollCalculations();
      }
    }
  } catch (err) {
    ui.showToast(err.message || 'บันทึก OT อีเวนต์ไม่สำเร็จ', 'error');
  } finally {
    savingEventOt.value = false;
  }
};

const deletingEventOtId = ref(null);

const handleDeleteEventOt = async (id) => {
  const confirmed = await ui.showConfirm('ยืนยันการลบ', 'คุณต้องการลบรายการ OT อีเวนต์นี้ใช่หรือไม่?');
  if (!confirmed) return;
  deletingEventOtId.value = id;
  try {
    const res = await api.employees.deleteEventOt(id);
    if (res.success) {
      ui.showToast('ลบรายการ OT อีเวนต์เรียบร้อยแล้ว', 'success');
      await fetchEventOts();
      await fetchMonthlyAttendance();
      if (isAdminUser.value) {
        await fetchPayrollCalculations();
      }
    }
  } catch (err) {
    ui.showToast(err.message || 'ลบไม่สำเร็จ', 'error');
  } finally {
    deletingEventOtId.value = null;
  }
};

// ─── Subtab 4: Advances State ────────────────────────────────
const advances = ref([]);
const loadingAdvances = ref(false);
const showAddAdvanceModal = ref(false);
const savingAdvance = ref(false);
const deletingAdvanceId = ref(null);
const advanceForm = ref({
  user_id: null,
  amount: 500,
  advance_date: getTodayStr(),
  payment_method: 'cash'
});

const isAdvanceStaffDropdownOpen = ref(false);
const selectedAdvanceStaffLabel = computed(() => {
  if (!advanceForm.value.user_id) return '-- กรุณาเลือกพนักงาน --';
  const emp = employees.value.find(e => e.id === advanceForm.value.user_id);
  return emp ? `${emp.name} (${getSkillLabel(emp.skill_level)})` : '-- กรุณาเลือกพนักงาน --';
});
const selectAdvanceStaff = (id) => {
  advanceForm.value.user_id = id;
  isAdvanceStaffDropdownOpen.value = false;
};

const isAdvanceDateDropdownOpen = ref(false);
const advanceDatePickerYear = ref(new Date().getFullYear());
const advanceDatePickerMonth = ref(new Date().getMonth() + 1);

const advanceDateLabel = computed(() => {
  if (!advanceForm.value.advance_date) return 'เลือกวัน';
  return formatDate(advanceForm.value.advance_date);
});

const advanceDatePickerMonthName = computed(() => {
  return thaiMonthsNames[advanceDatePickerMonth.value - 1] || '';
});

const advanceDatePickerDaysCount = computed(() => {
  return new Date(advanceDatePickerYear.value, advanceDatePickerMonth.value, 0).getDate();
});

const advanceDatePickerStartOffset = computed(() => {
  return new Date(advanceDatePickerYear.value, advanceDatePickerMonth.value - 1, 1).getDay();
});

const toggleAdvanceDateDropdown = () => {
  const cur = isAdvanceDateDropdownOpen.value;
  closeAllPickerDropdowns();
  isAdvanceDateDropdownOpen.value = !cur;
  if (isAdvanceDateDropdownOpen.value) {
    if (advanceForm.value.advance_date) {
      const [y, m] = advanceForm.value.advance_date.split('-');
      advanceDatePickerYear.value = Number(y);
      advanceDatePickerMonth.value = Number(m);
    } else {
      const today = new Date();
      advanceDatePickerYear.value = today.getFullYear();
      advanceDatePickerMonth.value = today.getMonth() + 1;
    }
  }
};

const isAdvanceDatePickerSelected = (day) => {
  if (!advanceForm.value.advance_date) return false;
  const [y, m, d] = advanceForm.value.advance_date.split('-');
  return advanceDatePickerYear.value === Number(y) &&
         advanceDatePickerMonth.value === Number(m) &&
         day === Number(d);
};

const selectAdvanceDatePickerDay = (day) => {
  advanceForm.value.advance_date = `${advanceDatePickerYear.value}-${String(advanceDatePickerMonth.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  isAdvanceDateDropdownOpen.value = false;
};

const adjustAdvanceDatePickerMonth = (amount) => {
  let m = advanceDatePickerMonth.value + amount;
  let y = advanceDatePickerYear.value;
  if (m < 1) {
    m = 12;
    y -= 1;
  } else if (m > 12) {
    m = 1;
    y += 1;
  }
  advanceDatePickerMonth.value = m;
  advanceDatePickerYear.value = y;
};

const isAdvancePaymentMethodDropdownOpen = ref(false);
const selectAdvancePaymentMethod = (method) => {
  advanceForm.value.payment_method = method;
  isAdvancePaymentMethodDropdownOpen.value = false;
};

const selectedStaffAvailableWage = computed(() => {
  if (!advanceForm.value.user_id) return null;
  const pItem = payrollList.value.find(p => p.user_id === advanceForm.value.user_id);
  if (pItem) {
    const grossUnpaid = (pItem.unpaid_base_salary || 0) + (pItem.event_ot_amount || 0) - (pItem.advance_deducted_amount || 0);
    return {
      unpaidDays: pItem.unpaid_days_worked || 0,
      unpaidBase: pItem.unpaid_base_salary || 0,
      eventOt: pItem.event_ot_amount || 0,
      existingAdvances: pItem.advance_deducted_amount || 0,
      maxAvailable: Math.max(0, grossUnpaid)
    };
  }

  const emp = employees.value.find(e => e.id === advanceForm.value.user_id);
  return {
    unpaidDays: 0,
    unpaidBase: 0,
    eventOt: 0,
    existingAdvances: 0,
    maxAvailable: 0
  };
});

watch(showAddAdvanceModal, (isOpen) => {
  if (isOpen) {
    fetchPayrollCalculations();
  }
});

const fetchAdvances = async () => {
  loadingAdvances.value = true;
  try {
    const params = getPeriodQueryParams();
    const res = await api.employees.getAdvances(params);
    if (res.success) {
      advances.value = res.data || [];
    }
  } catch (err) {
    console.error('Error fetching advances:', err);
  } finally {
    loadingAdvances.value = false;
  }
};

const handleSaveAdvance = async () => {
  if (savingAdvance.value) return;
  if (!advanceForm.value.user_id || !advanceForm.value.amount || advanceForm.value.amount <= 0) return;
  savingAdvance.value = true;
  try {
    const res = await api.employees.createAdvance({
      ...advanceForm.value,
      branch_id: props.branchId
    });
    if (res.success) {
      ui.showToast('บันทึกการเบิกเงินและตัดเข้ารายจ่ายสาขาเรียบร้อยแล้ว', 'success');
      showAddAdvanceModal.value = false;
      advanceForm.value = {
        user_id: null,
        amount: 500,
        advance_date: getTodayStr(),
        payment_method: 'cash'
      };
      await fetchAdvances();
      await fetchMonthlyAttendance();
      if (isAdminUser.value) {
        await fetchPayrollCalculations();
      }
    }
  } catch (err) {
    ui.showToast(err.message || 'บันทึกการเบิกเงินไม่สำเร็จ', 'error');
  } finally {
    savingAdvance.value = false;
  }
};

const handleDeleteAdvance = async (id) => {
  const confirmed = await ui.showConfirm(
    'ยืนยันยกเลิกและคืนยอด',
    'คุณต้องการยกเลิกรายการเบิกเงินนี้ใช่หรือไม่?\n\nระบบจะบันทึกรายการคืนเงิน (+฿) เพื่อหักล้างรายจ่ายและปรับยอดเงินสดในลิ้นชักกลับมาถูกต้อง พร้อมทั้งยกเลิกรายการเบิกนี้ (จะไม่ถูกนำไปหักในรอบเงินเดือน)'
  );
  if (!confirmed) return;
  deletingAdvanceId.value = id;
  try {
    const res = await api.employees.deleteAdvance(id);
    if (res.success) {
      ui.showToast('ยกเลิกรายการเบิกเงินและคืนยอดเข้าบัญชีรายจ่ายเรียบร้อยแล้ว', 'success');
      await fetchAdvances();
      await fetchMonthlyAttendance();
      if (isAdminUser.value) {
        await fetchPayrollCalculations();
      }
    }
  } catch (err) {
    ui.showToast(err.message || 'ยกเลิกรายการไม่สำเร็จ', 'error');
  } finally {
    deletingAdvanceId.value = null;
  }
};

// ─── Subtab 5: Payroll Calculation State ─────────────────────
const payrollMonth = ref(getCurrentMonthStr());
const payrollList = ref([]);
const loadingPayroll = ref(false);
const showPayModal = ref(false);
const payingItem = ref(null);
const processingPayout = ref(false);
const payForm = ref({
  payment_method: 'cash',
  payment_date: getTodayStr()
});

const isPayPaymentMethodDropdownOpen = ref(false);
const selectPayPaymentMethod = (method) => {
  payForm.value.payment_method = method;
  isPayPaymentMethodDropdownOpen.value = false;
};

const isPayDateDropdownOpen = ref(false);
const payDatePickerYear = ref(new Date().getFullYear());
const payDatePickerMonth = ref(new Date().getMonth() + 1);

const payDateLabel = computed(() => {
  if (!payForm.value.payment_date) return 'เลือกวัน';
  return formatDate(payForm.value.payment_date);
});

const payDatePickerMonthName = computed(() => {
  return thaiMonthsNames[payDatePickerMonth.value - 1] || '';
});

const payDatePickerDaysCount = computed(() => {
  return new Date(payDatePickerYear.value, payDatePickerMonth.value, 0).getDate();
});

const payDatePickerStartOffset = computed(() => {
  return new Date(payDatePickerYear.value, payDatePickerMonth.value - 1, 1).getDay();
});

const togglePayDateDropdown = () => {
  const cur = isPayDateDropdownOpen.value;
  closeAllPickerDropdowns();
  isPayDateDropdownOpen.value = !cur;
  if (isPayDateDropdownOpen.value) {
    if (payForm.value.payment_date) {
      const [y, m] = payForm.value.payment_date.split('-');
      payDatePickerYear.value = Number(y);
      payDatePickerMonth.value = Number(m);
    } else {
      const today = new Date();
      payDatePickerYear.value = today.getFullYear();
      payDatePickerMonth.value = today.getMonth() + 1;
    }
  }
};

const isPayDatePickerSelected = (day) => {
  if (!payForm.value.payment_date) return false;
  const [y, m, d] = payForm.value.payment_date.split('-');
  return payDatePickerYear.value === Number(y) &&
         payDatePickerMonth.value === Number(m) &&
         day === Number(d);
};

const selectPayDatePickerDay = (day) => {
  payForm.value.payment_date = `${payDatePickerYear.value}-${String(payDatePickerMonth.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  isPayDateDropdownOpen.value = false;
};

const adjustPayDatePickerMonth = (amount) => {
  let m = payDatePickerMonth.value + amount;
  let y = payDatePickerYear.value;
  if (m < 1) {
    m = 12;
    y -= 1;
  } else if (m > 12) {
    m = 1;
    y += 1;
  }
  payDatePickerMonth.value = m;
  payDatePickerYear.value = y;
};

const isPayrollMonthDropdownOpen = ref(false);
const payrollMonthPickerYear = ref(new Date().getFullYear());

const payrollMonthLabel = computed(() => {
  if (!payrollMonth.value) return '';
  const [y, m] = payrollMonth.value.split('-');
  const monthIdx = parseInt(m, 10) - 1;
  const beYear = parseInt(y, 10) + 543;
  return `${thaiMonthsNames[monthIdx] || ''} ${beYear}`;
});

const togglePayrollMonthDropdown = () => {
  const cur = isPayrollMonthDropdownOpen.value;
  closeAllPickerDropdowns();
  isPayrollMonthDropdownOpen.value = !cur;
  if (isPayrollMonthDropdownOpen.value) {
    if (payrollMonth.value) {
      payrollMonthPickerYear.value = Number(payrollMonth.value.split('-')[0]);
    } else {
      payrollMonthPickerYear.value = new Date().getFullYear();
    }
  }
};

const isPayrollMonthPickerSelected = (m) => {
  if (!payrollMonth.value) return false;
  const [y, mm] = payrollMonth.value.split('-');
  return payrollMonthPickerYear.value === Number(y) && m === Number(mm);
};

const selectPayrollMonthPicker = (m) => {
  payrollMonth.value = `${payrollMonthPickerYear.value}-${String(m).padStart(2, '0')}`;
  calendarMonth.value = payrollMonth.value;
  isPayrollMonthDropdownOpen.value = false;
  emit('update:selected-month', payrollMonth.value);
  emit('update:period-mode', 'monthly');
  fetchPayrollCalculations();
};

const adjustPayrollMonthPickerYear = (delta) => {
  payrollMonthPickerYear.value += delta;
};

const adjustPayrollMonth = (diff) => {
  if (!payrollMonth.value) return;
  const [y, m] = payrollMonth.value.split('-').map(Number);
  const d = new Date(y, m - 1 + diff, 1);
  const nextY = d.getFullYear();
  const nextM = String(d.getMonth() + 1).padStart(2, '0');
  payrollMonth.value = `${nextY}-${nextM}`;
  calendarMonth.value = payrollMonth.value;
  emit('update:selected-month', payrollMonth.value);
  emit('update:period-mode', 'monthly');
  fetchPayrollCalculations();
};

const setPayrollCurrentMonth = () => {
  payrollMonth.value = getCurrentMonthStr();
  calendarMonth.value = payrollMonth.value;
  emit('update:selected-month', payrollMonth.value);
  emit('update:period-mode', 'monthly');
  fetchPayrollCalculations();
};

const showSlipModal = ref(false);
const selectedSlipItem = ref(null);

// ─── Subtab 6: Guarantee & Multi-Payout State & Handlers ─────
const guaranteePoolSummary = computed(() => {
  let totalHeld = 0;
  let heldStaffCount = 0;
  let cashHeld = 0;
  let transferHeld = 0;
  const heldStaffList = [];

  payrollList.value.forEach(item => {
    if (item.guarantee && item.guarantee.status === 'held') {
      const amt = Number(item.guarantee.amount) || 1000;
      totalHeld += amt;
      heldStaffCount++;
      if (item.guarantee.deposit_payment_method === 'cash') {
        cashHeld += amt;
      } else {
        transferHeld += amt;
      }
      heldStaffList.push({
        name: item.name,
        amount: amt,
        date: item.guarantee.deposit_date,
        method: item.guarantee.deposit_payment_method
      });
    }
  });

  return {
    totalHeld,
    heldStaffCount,
    cashHeld,
    transferHeld,
    heldStaffList
  };
});

const formatGuaranteeMonth = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length >= 2) {
    const mIdx = parseInt(parts[1], 10) - 1;
    const yStr = parts[0];
    const beYearShort = (parseInt(yStr, 10) + 543).toString().slice(-2);
    return `${thaiMonthsShort[mIdx]} ${beYearShort}`;
  }
  return '';
};

const showHistoryModal = ref(false);
const selectedHistoryStaff = ref(null);

const showRefundModal = ref(false);
const savingRefund = ref(false);
const refundForm = ref({
  guarantee: null,
  targetStaff: null,
  refund_date: getTodayStr(),
  refund_payment_method: 'cash'
});

const isRefundPaymentMethodDropdownOpen = ref(false);
const selectRefundPaymentMethod = (method) => {
  refundForm.value.refund_payment_method = method;
  isRefundPaymentMethodDropdownOpen.value = false;
};

const isRefundDateDropdownOpen = ref(false);
const refundDatePickerYear = ref(new Date().getFullYear());
const refundDatePickerMonth = ref(new Date().getMonth() + 1);

const refundDateLabel = computed(() => {
  if (!refundForm.value.refund_date) return 'เลือกวัน';
  return formatDate(refundForm.value.refund_date);
});

const refundDatePickerMonthName = computed(() => {
  return thaiMonthsNames[refundDatePickerMonth.value - 1] || '';
});

const refundDatePickerDaysCount = computed(() => {
  return new Date(refundDatePickerYear.value, refundDatePickerMonth.value, 0).getDate();
});

const refundDatePickerStartOffset = computed(() => {
  return new Date(refundDatePickerYear.value, refundDatePickerMonth.value - 1, 1).getDay();
});

const toggleRefundDateDropdown = () => {
  const cur = isRefundDateDropdownOpen.value;
  closeAllPickerDropdowns();
  isRefundDateDropdownOpen.value = !cur;
  if (isRefundDateDropdownOpen.value) {
    if (refundForm.value.refund_date) {
      const [y, m] = refundForm.value.refund_date.split('-');
      refundDatePickerYear.value = Number(y);
      refundDatePickerMonth.value = Number(m);
    } else {
      const today = new Date();
      refundDatePickerYear.value = today.getFullYear();
      refundDatePickerMonth.value = today.getMonth() + 1;
    }
  }
};

const isRefundDatePickerSelected = (day) => {
  if (!refundForm.value.refund_date) return false;
  const [y, m, d] = refundForm.value.refund_date.split('-');
  return refundDatePickerYear.value === Number(y) &&
         refundDatePickerMonth.value === Number(m) &&
         day === Number(d);
};

const selectRefundDatePickerDay = (day) => {
  refundForm.value.refund_date = `${refundDatePickerYear.value}-${String(refundDatePickerMonth.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  isRefundDateDropdownOpen.value = false;
};

const adjustRefundDatePickerMonth = (amount) => {
  let m = refundDatePickerMonth.value + amount;
  let y = refundDatePickerYear.value;
  if (m < 1) {
    m = 12;
    y -= 1;
  } else if (m > 12) {
    m = 1;
    y += 1;
  }
  refundDatePickerMonth.value = m;
  refundDatePickerYear.value = y;
};

const openRefundGuaranteeModal = (guar, item) => {
  const today = getTodayStr();
  const [y, m] = today.split('-');
  refundDatePickerYear.value = Number(y);
  refundDatePickerMonth.value = Number(m);
  isRefundDateDropdownOpen.value = false;
  isRefundPaymentMethodDropdownOpen.value = false;
  refundForm.value = {
    guarantee: guar,
    targetStaff: item,
    refund_date: today,
    refund_payment_method: 'cash'
  };
  showRefundModal.value = true;
};

const handleConfirmRefundGuarantee = async () => {
  if (!refundForm.value.guarantee) return;
  savingRefund.value = true;
  try {
    const res = await api.employees.refundGuarantee({
      guarantee_id: refundForm.value.guarantee.id,
      refund_date: refundForm.value.refund_date,
      refund_payment_method: refundForm.value.refund_payment_method,
      branch_id: props.branchId
    });
    if (res.success) {
      ui.showToast('บันทึกคืนเงินประกันและตัดเข้ารายจ่ายสาขาเรียบร้อยแล้ว', 'success');
      showRefundModal.value = false;
      await fetchPayrollCalculations();
    }
  } catch (err) {
    ui.showToast(err.message || 'บันทึกคืนเงินประกันไม่สำเร็จ', 'error');
  } finally {
    savingRefund.value = false;
  }
};

const openHistoryPayoutsModal = (item) => {
  selectedHistoryStaff.value = item;
  showHistoryModal.value = true;
};

const reversingSlipId = ref(null);

const handleReversePayrollSlip = async (slip) => {
  const confirmed = await ui.showConfirm(
    'ยกเลิกสลิป & คืนยอด',
    `คุณต้องการยกเลิกสลิปงวดนี้ (${formatCurrency(slip.net_paid_amount)}) ใช่หรือไม่?\n\nเมื่อยกเลิก:\n1. วันทำงาน/OT/เงินเบิก จะถูกปลดล็อกกลับมาคำนวณใหม่ได้ทันที\n2. ระบบจะบันทึกรายการคืนเงินเข้าสู่บัญชีรายจ่ายสาขาเพื่อคืนยอดเงินสด/เงินโอน`
  );
  if (!confirmed) return;

  reversingSlipId.value = slip.id;
  try {
    const res = await api.employees.reversePayroll(slip.id);
    if (res.success) {
      ui.showToast('ยกเลิกสลิปและคืนยอดเงินเรียบร้อยแล้ว', 'success');
      slip.status = 'cancelled';
      await fetchPayrollCalculations();
      await fetchAdvances();
      await fetchEventOts();
      await fetchMonthlyAttendance();
      if (selectedHistoryStaff.value) {
        const updated = payrollList.value.find(e => e.user_id === selectedHistoryStaff.value.user_id);
        if (updated) {
          selectedHistoryStaff.value = updated;
        }
      }
    }
  } catch (err) {
    ui.showToast(err.message || 'ยกเลิกสลิปไม่สำเร็จ', 'error');
  } finally {
    reversingSlipId.value = null;
  }
};

const fetchPayrollCalculations = async () => {
  loadingPayroll.value = true;
  try {
    const res = await api.employees.calculatePayroll({
      month: payrollMonth.value,
      branch_id: props.branchId || ''
    });
    if (res.success) {
      payrollList.value = res.data?.employees || [];
    }
  } catch (err) {
    console.error('Error fetching payroll calculations:', err);
  } finally {
    loadingPayroll.value = false;
  }
};

const openPayModal = (item) => {
  payingItem.value = item;
  const hasBase = (item.unpaid_days_worked > 0 || item.unpaid_base_salary > 0);
  const hasOt = (item.event_ot_amount > 0);
  const hasAdv = (item.advance_deducted_amount > 0);

  payForm.value = {
    pay_base_salary: hasBase,
    days_to_pay: item.unpaid_days_worked || 1,
    pay_event_ot: hasOt,
    deduct_advance: hasAdv,
    deduct_guarantee: false,
    holdback_deducted_amount: item.guarantee?.amount || 1000,
    custom_net_paid: 0,
    payment_method: 'cash',
    payment_date: getTodayStr(),
    note: ''
  };
  payForm.value.custom_net_paid = computedNetPayable.value;
  showPayModal.value = true;
};

const adjustDaysToPay = (delta) => {
  if (!payingItem.value) return;
  const maxDays = payingItem.value.unpaid_days_worked || 1;
  const currentDays = payForm.value.days_to_pay !== undefined ? payForm.value.days_to_pay : maxDays;
  const nextDays = Math.max(1, Math.min(maxDays, currentDays + delta));
  payForm.value.days_to_pay = nextDays;
  handlePayoutCheckboxChange();
};

const computedBaseSalaryToPay = computed(() => {
  if (!payingItem.value || !payForm.value.pay_base_salary) return 0;
  if (payingItem.value.wage_type === 'monthly') {
    return payingItem.value.unpaid_base_salary || 0;
  }
  const days = payForm.value.days_to_pay !== undefined ? payForm.value.days_to_pay : (payingItem.value.unpaid_days_worked || 0);
  const totalDays = payingItem.value.unpaid_days_worked || 0;
  const totalUnpaidBase = payingItem.value.unpaid_base_salary || 0;

  if (totalDays > 0 && days === totalDays) {
    return totalUnpaidBase;
  }
  if (totalDays > 0) {
    const avgRate = payingItem.value.wage_rate || (totalUnpaidBase / totalDays);
    return Math.round(days * avgRate);
  }
  return days * (payingItem.value.wage_rate || 0);
});

const earningsBeforeGuarantee = computed(() => {
  if (!payingItem.value) return 0;
  const base = computedBaseSalaryToPay.value;
  const ot = (payForm.value.pay_event_ot && payingItem.value.event_ot_amount) ? payingItem.value.event_ot_amount : 0;
  const adv = (payForm.value.deduct_advance && payingItem.value.advance_deducted_amount) ? payingItem.value.advance_deducted_amount : 0;
  return Math.max(0, base + ot - adv);
});

const computedNetPayable = computed(() => {
  if (!payingItem.value) return 0;
  const base = computedBaseSalaryToPay.value;
  const ot = (payForm.value.pay_event_ot && payingItem.value.event_ot_amount) ? payingItem.value.event_ot_amount : 0;
  const adv = (payForm.value.deduct_advance && payingItem.value.advance_deducted_amount) ? payingItem.value.advance_deducted_amount : 0;
  
  let guar = 0;
  if (payingItem.value.guarantee && payingItem.value.guarantee.status === 'held' && !payingItem.value.is_guarantee_settled) {
    guar = Number(payingItem.value.guarantee.amount || 1000);
  } else if (payForm.value.deduct_guarantee) {
    guar = Number(payForm.value.holdback_deducted_amount || 1000);
  }
  return Math.max(0, base + ot - adv - guar);
});

const handlePayoutCheckboxChange = () => {
  payForm.value.custom_net_paid = computedNetPayable.value;
};

const handleConfirmPayout = async () => {
  if (!payingItem.value) return;
  processingPayout.value = true;
  try {
    const daysToPay = payForm.value.pay_base_salary 
      ? (payForm.value.days_to_pay !== undefined ? payForm.value.days_to_pay : (payingItem.value.unpaid_days_worked || 0))
      : 0;
    const baseSalaryToPay = computedBaseSalaryToPay.value;
    const effectiveDailyRate = payingItem.value.wage_rate || (payingItem.value.unpaid_days_worked ? Math.round(payingItem.value.unpaid_base_salary / payingItem.value.unpaid_days_worked) : 0);

    const isAlreadyHeldPendingSettlement = Boolean(
      payingItem.value.guarantee && 
      payingItem.value.guarantee.status === 'held' && 
      !payingItem.value.is_guarantee_settled
    );
    const shouldDeductGuarantee = isAlreadyHeldPendingSettlement || payForm.value.deduct_guarantee;
    const holdbackAmt = shouldDeductGuarantee ? Number(payingItem.value.guarantee?.amount || payForm.value.holdback_deducted_amount || 1000) : 0;

    const payload = {
      user_id: payingItem.value.user_id,
      period_month: payrollMonth.value,
      days_worked: daysToPay,
      daily_rate: effectiveDailyRate,
      base_salary_amount: baseSalaryToPay,
      event_ot_amount: payingItem.value.event_ot_amount,
      advance_deducted_amount: payingItem.value.advance_deducted_amount,
      holdback_deducted_amount: holdbackAmt,
      net_paid_amount: computedNetPayable.value,
      payment_method: payForm.value.payment_method,
      payment_date: payForm.value.payment_date,
      note: payForm.value.note,
      branch_id: props.branchId,
      pay_base_salary: payForm.value.pay_base_salary,
      pay_event_ot: payForm.value.pay_event_ot,
      deduct_advance: payForm.value.deduct_advance,
      deduct_guarantee: shouldDeductGuarantee
    };

    const res = await api.employees.paySalary(payload);
    if (res.success) {
      ui.showToast('บันทึกการจ่ายเงินรอบนี้และตัดเข้ารายจ่ายสาขาสำเร็จ', 'success');
      showPayModal.value = false;
      await fetchPayrollCalculations();
      await fetchAdvances();
      await fetchEventOts();
      await fetchMonthlyAttendance();
    }
  } catch (err) {
    ui.showToast(err.message || 'บันทึกการจ่ายเงินไม่สำเร็จ', 'error');
  } finally {
    processingPayout.value = false;
  }
};

const openSlipModal = (item) => {
  selectedSlipItem.value = item;
  showSlipModal.value = true;
};

// ─── Helpers ─────────────────────────────────────────────────
const getRoleLabel = (role) => {
  if (role === 'admin') return 'เจ้าของร้าน/แอดมิน';
  if (role === 'manager') return 'ผู้จัดการ';
  return 'พนักงานหน้าร้าน';
};

const getSkillLabel = (skill) => {
  if (skill === 'trainee') return 'ฝึกงาน';
  if (skill === 'expert') return 'เชี่ยวชาญ';
  return 'ประจำ';
};

const getSkillIcon = (skill) => {
  if (skill === 'trainee') return 'fa-solid fa-seedling';
  if (skill === 'expert') return 'fa-solid fa-trophy';
  return 'fa-solid fa-star';
};

const reloadAllData = async () => {
  if (props.selectedDate) {
    attendanceDate.value = props.selectedDate;
  }
  if (props.selectedMonth) {
    payrollMonth.value = props.selectedMonth;
    calendarMonth.value = props.selectedMonth;
  }
  
  const promises = [
    fetchEmployees(),
    fetchDailyAttendance(),
    fetchMonthlyAttendance(),
    fetchEventOts(),
    fetchAdvances()
  ];
  if (isAdminUser.value) {
    promises.push(fetchPayrollCalculations());
  }
  await Promise.all(promises);
};

watch(() => props.branchId, () => {
  reloadAllData();
});

watch(() => props.selectedDate, (newDate) => {
  if (newDate) {
    attendanceDate.value = newDate;
    fetchDailyAttendance();
    if (props.periodMode === 'daily') {
      fetchEventOts();
      fetchAdvances();
    }
  }
});

watch(() => props.selectedMonth, (newMonth) => {
  if (newMonth && (newMonth !== payrollMonth.value || newMonth !== calendarMonth.value)) {
    payrollMonth.value = newMonth;
    calendarMonth.value = newMonth;
    fetchMonthlyAttendance();
    if (props.periodMode === 'monthly') {
      fetchEventOts();
      fetchAdvances();
    }
    if (isAdminUser.value) {
      fetchPayrollCalculations();
    }
  }
});

watch(() => props.selectedYear, () => {
  if (props.periodMode === 'yearly') {
    fetchEventOts();
    fetchAdvances();
  }
});

watch(() => props.periodMode, () => {
  fetchEventOts();
  fetchAdvances();
});

watch(activeSubTab, (newTab) => {
  if (newTab === 'calendar') {
    emit('update:period-mode', 'monthly');
    emit('update:selected-month', calendarMonth.value);
  } else if (newTab === 'payroll') {
    emit('update:period-mode', 'monthly');
    emit('update:selected-month', payrollMonth.value);
  } else if (newTab === 'attendance') {
    emit('update:period-mode', 'daily');
    emit('update:selected-date', attendanceDate.value);
  }
});

const closeAllPickerDropdowns = () => {
  isCalendarStaffDropdownOpen.value = false;
  isCalendarMonthDropdownOpen.value = false;
  isAttendanceDateDropdownOpen.value = false;
  isPayrollMonthDropdownOpen.value = false;
  isEventOtDateDropdownOpen.value = false;
  isAdvanceStaffDropdownOpen.value = false;
  isAdvanceDateDropdownOpen.value = false;
  isAdvancePaymentMethodDropdownOpen.value = false;
  isPayDateDropdownOpen.value = false;
  isPayPaymentMethodDropdownOpen.value = false;
  isRefundDateDropdownOpen.value = false;
  isRefundPaymentMethodDropdownOpen.value = false;
  isCompWageTypeDropdownOpen.value = false;
  isCompSkillLevelDropdownOpen.value = false;
};

onMounted(() => {
  window.addEventListener('click', closeAllPickerDropdowns);
  reloadAllData();
});

onUnmounted(() => {
  window.removeEventListener('click', closeAllPickerDropdowns);
});
</script>

<style scoped>
.category-tabs .btn {
  font-size: var(--font-sm);
  padding: 8px 14px;
  border-radius: var(--radius-md);
}
.category-tabs .btn.active {
  background: var(--primary);
  color: white;
  font-weight: bold;
}
.capsule-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: var(--font-xs);
  font-weight: 600;
}
.capsule-badge.badge-primary {
  background: rgba(139, 3, 19, 0.1);
  color: var(--primary);
  border: 1px solid rgba(139, 3, 19, 0.2);
}
.capsule-badge.badge-warning {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
  border: 1px solid rgba(245, 158, 11, 0.3);
}
.capsule-badge.badge-neutral {
  background: rgba(100, 116, 139, 0.12);
  color: #475569;
  border: 1px solid rgba(100, 116, 139, 0.2);
}
.capsule-badge.badge-success {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.3);
}
.skill-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: var(--font-xs);
  font-weight: 600;
}
.skill-badge.trainee {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.3);
}
.skill-badge.regular {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
  border: 1px solid rgba(59, 130, 246, 0.3);
}
.skill-badge.expert {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.4);
}
.benefit-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(245, 158, 11, 0.1);
  color: #b45309;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: var(--font-xs);
  border: 1px solid rgba(245, 158, 11, 0.25);
  font-weight: 500;
}
.status-btn {
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-secondary);
  padding: 8px 16px;
  border-radius: 9999px;
  font-size: var(--font-sm);
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.status-btn:hover {
  background: rgba(139, 3, 19, 0.05);
}
.status-btn.active-present {
  background: #10b981;
  color: white;
  border-color: #10b981;
  font-weight: bold;
}
.status-btn.active-leave {
  background: #f59e0b;
  color: white;
  border-color: #f59e0b;
  font-weight: bold;
}
.status-btn.active-absent {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
  font-weight: bold;
}
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

/* ─── Lunch Benefit Checkbox Alignment ────────────────────── */
.lunch-benefit-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  vertical-align: middle;
}

.lunch-benefit-wrapper:hover:not(.disabled) {
  background: rgba(245, 158, 11, 0.08);
}

.lunch-benefit-wrapper.disabled {
  opacity: 0.4;
  pointer-events: none;
  cursor: not-allowed;
}

.lunch-benefit-checkbox {
  width: 18px;
  height: 18px;
  margin: 0 !important;
  padding: 0 !important;
  accent-color: var(--primary);
  cursor: pointer;
  vertical-align: middle;
  flex-shrink: 0;
  display: block;
}

.lunch-benefit-content {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-sm);
  font-weight: var(--font-weight-bold);
  color: #b45309;
  line-height: 1;
}

.lunch-benefit-icon {
  font-size: 1.1rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.lunch-benefit-text {
  line-height: 1;
  display: inline-block;
  white-space: nowrap;
}

/* ─── Calendar Specific Styles ────────────────────────────── */
.calendar-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: var(--space-sm);
}
.calendar-grid-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-bottom: 6px;
  width: 100%;
}
.calendar-weekday-cell {
  text-align: center;
  font-weight: bold;
  font-size: var(--font-xs);
  color: var(--text-secondary);
  padding: 6px 2px;
  background: rgba(139, 3, 19, 0.04);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  box-sizing: border-box;
}
.calendar-grid-body {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  width: 100%;
}
.calendar-day-empty {
  min-height: 85px;
  background: rgba(0, 0, 0, 0.015);
  border-radius: var(--radius-sm);
  border: 1px dashed rgba(0, 0, 0, 0.05);
  min-width: 0;
  box-sizing: border-box;
}
.calendar-day-cell {
  min-height: 85px;
  padding: 6px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  flex-direction: column;
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
}
.calendar-day-cell:hover {
  transform: translateY(-2px);
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(139, 3, 19, 0.12);
}
.calendar-day-cell.is-today {
  border: 2px solid var(--primary);
  background: rgba(139, 3, 19, 0.02);
}
.day-number {
  font-weight: bold;
  font-size: var(--font-xs);
  color: var(--text-primary);
}
.today-badge {
  background: var(--primary);
  color: white;
  padding: 1px 6px;
  border-radius: 9999px;
  font-size: 10px;
}
.status-indicator {
  font-size: 11px;
}
.status-indicator.present {
  color: #10b981;
}
.status-indicator.leave {
  color: #f59e0b;
}
.status-indicator.absent {
  color: #ef4444;
}
.day-events-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 4px;
}
.day-badge {
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.day-badge.badge-work {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  font-weight: bold;
}
.day-badge.badge-leave {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
}
.day-badge.badge-absent {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}
.day-badge.badge-ot {
  background: rgba(147, 51, 234, 0.12);
  color: #9333ea;
  font-weight: 500;
}
.day-badge.badge-advance {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
  font-weight: 500;
}
.day-badge.badge-payout {
  background: rgba(139, 3, 19, 0.12);
  color: var(--primary);
  font-weight: bold;
  border: 1px solid rgba(139, 3, 19, 0.25);
}

.guarantee-capsule-badge,
.guarantee-capsule-btn {
  width: 175px !important;
  min-width: 175px !important;
  height: 32px !important;
  min-height: 32px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 9999px !important;
  font-size: 12px !important;
  padding: 0 12px !important;
  box-sizing: border-box !important;
  white-space: nowrap !important;
  text-align: center !important;
}

.history-capsule-badge {
  min-width: 175px !important;
  height: 32px !important;
  min-height: 32px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 9999px !important;
  font-size: 12px !important;
  padding: 0 12px !important;
  box-sizing: border-box !important;
  white-space: nowrap !important;
  text-align: center !important;
}

/* Mobile Card List & Items */
.staff-mobile-card-list {
  display: none;
}

@media (max-width: 768px) {
  .staff-mobile-card-list {
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
    padding-bottom: 24px;
  }
}

.staff-mobile-card {
  background: #ffffff;
  border: 1px solid rgba(139, 3, 19, 0.12);
  border-radius: var(--radius-md, 12px);
  padding: 14px 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.staff-mobile-divider {
  border-top: 1px dashed rgba(139, 3, 19, 0.18);
  padding-top: 10px;
}

.calendar-scroll-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 4px;
}
.calendar-scroll-wrapper::-webkit-scrollbar {
  height: 6px;
}
.calendar-scroll-wrapper::-webkit-scrollbar-thumb {
  background: rgba(139, 3, 19, 0.2);
  border-radius: 4px;
}

@media (max-width: 768px) {
  .calendar-weekday-cell {
    font-size: 10px;
  }
  .calendar-day-cell {
    min-height: 60px;
    padding: 3px;
  }
  .day-badge {
    font-size: 9px;
    padding: 1px 2px;
  }
}
</style>
