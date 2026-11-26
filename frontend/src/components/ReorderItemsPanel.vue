<template>
  <div>
    <!-- Reorder Top Action Card -->
    <div class="card mb-lg page-header-card">
      <div class="page-header-left">
        <div class="header-icon-circle">
          <i class="fa-solid fa-sort"></i>
        </div>
        <div class="page-header-text">
          <h2 class="page-header-title">
            {{ titlePrefix }}: <strong class="tabular-nums">{{ items.length }}</strong> รายการ
          </h2>
        </div>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-secondary" :disabled="isSaving" @click="emit('close')">
          <i class="fa-solid fa-arrow-left"></i> ย้อนกลับ
        </button>
        <button class="btn btn-primary" :disabled="isSaving" @click="emit('save')">
          <i v-if="isSaving" class="fa-solid fa-spinner fa-spin"></i>
          <i v-else class="fa-solid fa-floppy-disk"></i>
          {{ isSaving ? 'กำลังบันทึก...' : 'บันทึก' }}
        </button>
      </div>
    </div>

    <!-- Desktop Reorder Table (Visible on desktop only) -->
    <div class="card p-0 overflow-hidden desktop-menu-table-container">
      <div style="overflow-x: auto;">
        <table class="table w-full" style="border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-color); background: rgba(139, 3, 19, 0.03);">
              <th class="text-center" style="padding: var(--space-md); width: 10%;">ลาก</th>
              <th class="text-center" style="padding: var(--space-md); width: 15%;">รูป</th>
              <th class="text-left" style="padding: var(--space-md); width: 45%;">{{ columnHeader }}</th>
              <th class="text-center" style="padding: var(--space-md); width: 30%; white-space: nowrap;">ราคา</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in items"
              :key="item.id"
              style="border-bottom: 1px solid var(--border-color);"
              class="table-row-hover desktop-reorder-row"
              :class="{ dragging: dragIndex === index }"
              :data-index="index"
              draggable="true"
              @dragstart="handleDragStart(index, $event)"
              @dragover="handleDragOver"
              @dragenter="handleDragEnter(index)"
              @dragend="handleDragEnd"
            >
              <td class="text-center" style="padding: var(--space-md); vertical-align: middle;">
                <div
                  class="drag-handle"
                  style="cursor: grab;"
                  @touchstart.prevent="handleTouchStart(index, $event)"
                  @touchmove.prevent="handleTouchMove"
                  @touchend="handleTouchEnd"
                  @touchcancel="handleTouchEnd"
                >
                  <i class="fa-solid fa-bars"></i>
                </div>
              </td>
              <td class="text-center" style="padding: var(--space-md); vertical-align: middle;">
                <div style="width: 48px; height: 36px; margin: 0 auto; border-radius: var(--radius-sm); overflow: hidden; background: var(--bg-secondary); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center;">
                  <img v-if="item.image_url" :src="item.image_url" :alt="item.name" style="width: 100%; height: 100%; object-fit: cover;" />
                  <i v-else :class="getIconClass(item)" class="text-base text-muted"></i>
                </div>
              </td>
              <td style="padding: var(--space-md); vertical-align: middle;">
                <div class="font-bold text-base">{{ item.name }}</div>
                <div class="text-sm text-muted">
                  {{ getCategoryLabel(item) }}
                </div>
              </td>
              <td class="text-center" style="padding: var(--space-md); font-weight: bold; vertical-align: middle; white-space: nowrap; font-variant-numeric: tabular-nums;">
                {{ getDesktopPriceText(item) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Mobile Reorder Cards (Visible on mobile only) -->
    <div class="mobile-menu-list-container">
      <div class="mobile-menu-list">
        <div
          v-for="(item, index) in items"
          :key="item.id"
          class="mobile-menu-card mobile-reorder-card"
          :class="{ dragging: dragIndex === index }"
          :data-index="index"
        >
          <div class="mobile-menu-card-body" style="align-items: center; display: flex; flex-direction: row; width: 100%; padding: var(--space-sm) var(--space-md);">
            <div
              class="drag-handle"
              style="margin-right: var(--space-md); cursor: grab; padding: var(--space-xs); font-size: var(--font-md); color: var(--text-tertiary);"
              @touchstart="handleTouchStart(index, $event)"
              @touchmove.prevent="handleTouchMove"
              @touchend="handleTouchEnd"
              @touchcancel="handleTouchEnd"
            >
              <i class="fa-solid fa-bars"></i>
            </div>

            <div class="mobile-menu-card-img-container" style="margin-right: var(--space-md);">
              <img v-if="item.image_url" :src="item.image_url" :alt="item.name" class="mobile-menu-card-img" />
              <div v-else class="mobile-menu-card-placeholder">
                <i :class="getIconClass(item)" style="font-size: var(--font-md); color: var(--text-tertiary);"></i>
              </div>
            </div>

            <div class="mobile-menu-card-details" style="flex: 1; min-width: 0;">
              <div class="mobile-menu-card-name truncate">{{ item.name }}</div>
              <div class="mobile-menu-card-category">{{ getCategoryLabel(item) }}</div>
            </div>

            <div class="mobile-menu-card-meta" style="text-align: right; justify-content: center; width: auto; margin-left: auto; flex-shrink: 0;">
              <div class="mobile-menu-card-price tabular-nums">{{ getMobilePriceText(item) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue';

const props = defineProps({
  items: { type: Array, default: () => [] },
  isSaving: { type: Boolean, default: false },
  titlePrefix: { type: String, default: 'จัดลำดับเมนู' },
  columnHeader: { type: String, default: 'รายการสินค้า' },
  getCategoryLabel: { type: Function, required: true },
  getIconClass: { type: Function, default: () => 'fa-solid fa-box-open' },
  getDesktopPriceText: { type: Function, required: true },
  getMobilePriceText: { type: Function, required: true }
});

const emit = defineEmits(['update:items', 'close', 'save']);

const dragIndex = ref(null);

const moveItem = (fromIdx, toIdx) => {
  const next = [...props.items];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  emit('update:items', next);
  dragIndex.value = toIdx;
};

const handleDragStart = (index, event) => {
  dragIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
};

const handleDragOver = (event) => {
  event.preventDefault();
  const clientY = event.clientY;
  const threshold = 120;
  const scrollSpeed = 15;
  if (clientY < threshold) {
    window.scrollBy(0, -scrollSpeed);
  } else if (clientY > window.innerHeight - threshold) {
    window.scrollBy(0, scrollSpeed);
  }
};

const handleDragEnter = (index) => {
  if (dragIndex.value !== null && dragIndex.value !== index) {
    moveItem(dragIndex.value, index);
  }
};

const handleDragEnd = () => {
  dragIndex.value = null;
};

let touchScrollRaf = null;
let lastTouchX = 0;
let lastTouchY = 0;
let lastScrollTs = 0;
let lastAutoSwapTs = 0;

const swapItemAtPoint = (x, y) => {
  if (dragIndex.value === null) return;
  const targetElement = document.elementFromPoint(x, y);
  const element = targetElement?.closest('.mobile-reorder-card, .desktop-reorder-row');
  if (!element) return;
  const targetIndex = Number(element.dataset.index);
  if (!isNaN(targetIndex) && dragIndex.value !== targetIndex) {
    moveItem(dragIndex.value, targetIndex);
  }
};

const runTouchAutoScroll = (now) => {
  if (dragIndex.value === null) {
    touchScrollRaf = null;
    return;
  }
  const dt = lastScrollTs ? Math.min(now - lastScrollTs, 50) : 16.67;
  lastScrollTs = now;
  const frameScale = dt / 16.67;

  const threshold = 170;
  const maxSpeed = 48;
  let dy = 0;
  if (lastTouchY < threshold) {
    const ratio = Math.min(1, (threshold - lastTouchY) / threshold);
    dy = -Math.ceil((6 + ratio * maxSpeed) * frameScale);
  } else if (lastTouchY > window.innerHeight - threshold) {
    const ratio = Math.min(1, (lastTouchY - (window.innerHeight - threshold)) / threshold);
    dy = Math.ceil((6 + ratio * maxSpeed) * frameScale);
  }
  if (dy !== 0) {
    // ponytail: 2-arg scrollBy with scrollBehavior='auto' avoids iOS/Android smooth-scroll lag
    window.scrollBy(0, dy);
    if (now - lastAutoSwapTs >= 60) {
      lastAutoSwapTs = now;
      swapItemAtPoint(lastTouchX, lastTouchY);
    }
  }
  touchScrollRaf = requestAnimationFrame(runTouchAutoScroll);
};

const handleTouchStart = (index, event) => {
  dragIndex.value = index;
  document.documentElement.style.scrollBehavior = 'auto';
  document.documentElement.style.overflowAnchor = 'none';
  const touch = event.touches[0];
  if (touch) {
    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
  }
  lastScrollTs = 0;
  lastAutoSwapTs = 0;
  if (touchScrollRaf) cancelAnimationFrame(touchScrollRaf);
  touchScrollRaf = requestAnimationFrame(runTouchAutoScroll);
};

const handleTouchMove = (event) => {
  if (dragIndex.value === null) return;
  const touch = event.touches[0];
  if (!touch) return;
  lastTouchX = touch.clientX;
  lastTouchY = touch.clientY;
  swapItemAtPoint(lastTouchX, lastTouchY);
};

const handleTouchEnd = () => {
  dragIndex.value = null;
  document.documentElement.style.scrollBehavior = '';
  document.documentElement.style.overflowAnchor = '';
  if (touchScrollRaf) {
    cancelAnimationFrame(touchScrollRaf);
    touchScrollRaf = null;
  }
};

onUnmounted(handleTouchEnd);
</script>

<style scoped>
.desktop-menu-table-container {
  display: block;
}

.mobile-menu-list-container {
  display: none;
}

.desktop-reorder-row.dragging,
.mobile-reorder-card.dragging {
  opacity: 0.5;
  background-color: var(--primary-glow, rgba(139, 3, 19, 0.08)) !important;
  border: 2px dashed var(--primary) !important;
}

.drag-handle {
  cursor: grab;
  padding: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: var(--font-lg);
  user-select: none;
}

.drag-handle:active {
  cursor: grabbing;
}

.mobile-menu-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding-bottom: var(--space-2xl);
}

.mobile-menu-card {
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.mobile-menu-card-img-container {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mobile-menu-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mobile-menu-card-placeholder {
  font-size: var(--font-lg);
}

.mobile-menu-card-name {
  font-size: var(--font-sm);
  font-weight: bold;
  color: var(--text-primary);
  line-height: 1.3;
}

.mobile-menu-card-category {
  font-size: var(--font-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
}

.mobile-menu-card-price {
  font-size: var(--font-base);
  font-weight: bold;
  color: var(--primary);
}

@media (max-width: 768px) {
  .desktop-menu-table-container {
    display: none !important;
  }

  .mobile-menu-list-container {
    display: block !important;
    width: 100% !important;
  }
}
</style>
