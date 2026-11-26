<template>
  <div v-if="items && items.length" class="order-items-container mb-md">
    <div class="order-items-title flex flex-between align-center mb-xs">
      <span class="text-xs font-bold text-secondary">
        <i class="fa-solid fa-boxes-stacked mr-1 text-primary"></i> {{ titlePrefix }} ({{ items.length }} รายการ)
      </span>
    </div>

    <!-- Desktop Table (>= 641px) -->
    <div class="order-items-table-wrapper desktop-only-orders-table">
      <table class="order-items-table">
        <thead>
          <tr>
            <th class="col-item text-left">ชื่อสินค้า</th>
            <th class="col-price text-right">ราคาเบิก/หน่วย</th>
            <th class="col-qty text-center">{{ qtyColumnHeader }}</th>
            <th class="col-total text-right">รวมมูลค่า</th>
            <th v-if="canAdjustItems" class="col-actions text-center" style="width: 140px;">การจัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="it in items" :key="it.id">
            <td class="col-item">
              <div class="item-name-main font-bold text-sm">{{ getItemNameParts(it.item_name).main }}</div>
              <div v-if="getItemNameParts(it.item_name).sub" class="item-name-sub text-xs text-secondary">{{ getItemNameParts(it.item_name).sub }}</div>
            </td>
            <td class="col-price text-right text-sm text-secondary">
              ฿{{ formatNumber(it.cost_price) }} <span class="text-xs text-muted">/ {{ it.unit }}</span>
            </td>
            <td class="col-qty text-center">
              <span class="order-qty-pill font-bold">{{ it.quantity }} {{ it.unit }}</span>
              <span v-if="it.pack_size > 1" class="text-2xs text-primary font-bold ml-1">({{ it.quantity * it.pack_size }} ชิ้น)</span>
              <div v-if="it.original_quantity && it.quantity < it.original_quantity" class="text-2xs text-warning mt-1" title="ปรับลดจากยอดเดิม">
                (เดิม {{ it.original_quantity }})
              </div>
            </td>
            <td class="col-total text-right font-bold text-sm text-primary">
              ฿{{ formatNumber(it.quantity * it.cost_price) }}
            </td>
            <td v-if="canAdjustItems" class="col-actions text-center">
              <button
                v-if="it.quantity > 0"
                type="button"
                class="btn-action btn-action-edit btn-xs mx-auto"
                title="ปรับยอดสินค้า / แจ้งของชำรุด"
                @click="emit('adjust-item', it)"
              >
                <i class="fa-solid fa-pen-to-square"></i>
                <span>ปรับยอด/ของชำรุด</span>
              </button>
              <span v-else class="badge badge-neutral text-2xs">ยกเลิกแล้ว</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Itemized List (< 640px) -->
    <div class="order-items-mobile-list mobile-only-orders-list flex flex-col gap-xs">
      <div
        v-for="it in items"
        :key="it.id"
        class="order-mobile-item-card"
      >
        <div class="flex flex-between align-start gap-xs">
          <div class="flex-1 min-w-0 pr-xs">
            <div class="order-mobile-item-name font-bold text-sm text-primary">
              {{ getItemNameParts(it.item_name).main }}
            </div>
            <div v-if="getItemNameParts(it.item_name).sub" class="order-mobile-item-sub text-xs text-secondary mt-1">
              {{ getItemNameParts(it.item_name).sub }}
            </div>
          </div>
          <div class="text-right flex-shrink-0 pl-xs">
            <span class="order-mobile-item-total font-bold text-sm text-primary">
              ฿{{ formatNumber(it.quantity * it.cost_price) }}
            </span>
          </div>
        </div>

        <div class="flex flex-between align-center order-mobile-item-bottom">
          <span class="text-xs text-secondary">
            ฿{{ formatNumber(it.cost_price) }} / {{ it.unit }}
          </span>
          <div class="flex align-center gap-xs">
            <span class="order-qty-pill font-bold">
              {{ it.quantity }} {{ it.unit }}
            </span>
            <span v-if="it.pack_size > 1" class="text-2xs text-primary font-bold">
              ({{ it.quantity * it.pack_size }} ชิ้น)
            </span>
            <span v-if="it.original_quantity && it.quantity < it.original_quantity" class="badge badge-warning text-2xs">
              (เดิม {{ it.original_quantity }})
            </span>
          </div>
        </div>

        <div v-if="canAdjustItems && it.quantity > 0" class="flex justify-end pt-xs mt-xs border-t">
          <button
            type="button"
            class="btn-action btn-action-edit btn-xs"
            @click="emit('adjust-item', it)"
          >
            <i class="fa-solid fa-pen-to-square"></i>
            <span>ปรับยอด/ของชำรุด</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Branch Note if any -->
    <div v-if="notes" class="order-notes-box mt-sm p-sm rounded flex align-center gap-xs">
      <i class="fa-solid fa-comment-dots text-primary"></i>
      <span class="text-xs text-secondary"><strong>บันทึกจากสาขา:</strong> {{ notes }}</span>
    </div>
  </div>
</template>

<script setup>
import { formatNumber, getItemNameParts } from '../helpers';

defineProps({
  items: { type: Array, default: () => [] },
  titlePrefix: { type: String, default: 'รายการของที่ขอเบิก' },
  qtyColumnHeader: { type: String, default: 'จำนวน' },
  notes: { type: String, default: '' },
  canAdjustItems: { type: Boolean, default: false }
});

const emit = defineEmits(['adjust-item']);
</script>

<style scoped>
.desktop-only-orders-table {
  display: block;
}

.mobile-only-orders-list {
  display: none !important;
}

.order-items-table-wrapper {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--card-bg, #ffffff);
}

.order-items-table {
  width: 100%;
  border-collapse: collapse;
}

.order-items-table th {
  background: var(--bg-secondary) !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  color: var(--text-secondary) !important;
  padding: 14px 20px !important;
  border-bottom: 1px solid var(--border-color) !important;
  letter-spacing: 0.02em;
}

.order-items-table td {
  background: #ffffff;
  padding: 16px 20px !important;
  border-bottom: 1px solid var(--border-color-light) !important;
  vertical-align: middle;
  font-variant-numeric: tabular-nums;
}

.order-items-table tbody tr:last-child td {
  border-bottom: none !important;
}

.order-items-table tbody tr:hover td {
  background: rgba(139, 3, 19, 0.02);
}

.order-qty-pill {
  display: inline-block;
  padding: 3px 12px;
  border-radius: var(--radius-full);
  background: rgba(139, 3, 19, 0.07);
  color: var(--primary);
  font-size: var(--font-xs);
}

.order-notes-box {
  background: var(--bg-secondary);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
  padding: 8px 14px;
}

@media (max-width: 640px) {
  .desktop-only-orders-table {
    display: none !important;
  }

  .mobile-only-orders-list {
    display: flex !important;
  }

  .order-mobile-item-card {
    background: #ffffff;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 10px 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
    box-sizing: border-box;
    width: 100%;
    font-variant-numeric: tabular-nums;
  }

  .order-mobile-item-name {
    line-height: 1.35;
    word-break: break-word;
  }

  .order-mobile-item-sub {
    line-height: 1.3;
    word-break: break-word;
    margin-top: 3px !important;
  }

  .order-mobile-item-bottom {
    border-top: 1px dashed rgba(139, 3, 19, 0.15) !important;
    margin-top: 12px !important;
    padding-top: 9px !important;
  }
}
</style>
