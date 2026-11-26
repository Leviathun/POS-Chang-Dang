<template>
  <div v-if="totalPages > 1" class="pagination-bar flex flex-center align-center gap-md mt-md">
    <button
      type="button"
      class="pagination-btn"
      :disabled="currentPage <= 1"
      @click="changePage(currentPage - 1)"
    >
      <i class="fa-solid fa-chevron-left"></i> ก่อนหน้า
    </button>
    <span class="pagination-info tabular-nums" :class="{ 'is-multi-digit': totalPages >= 10 }">
      หน้า {{ currentPage }} / {{ totalPages }}
    </span>
    <button
      type="button"
      class="pagination-btn"
      :disabled="currentPage >= totalPages"
      @click="changePage(currentPage + 1)"
    >
      ถัดไป <i class="fa-solid fa-chevron-right"></i>
    </button>
  </div>
</template>

<script setup>
import { nextTick } from 'vue';

const props = defineProps({
  currentPage: { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 },
  scrollTarget: { type: Object, default: null }
});

const emit = defineEmits(['update:currentPage']);

const changePage = (newPage) => {
  if (newPage < 1 || newPage > props.totalPages) return;
  emit('update:currentPage', newPage);
  if (!props.scrollTarget) return;
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  nextTick(() => {
    const el = props.scrollTarget?.$el || props.scrollTarget;
    if (!el || typeof el.getBoundingClientRect !== 'function') return;
    const isMobile = window.innerWidth < 1024;
    const card = el.closest?.('.card') || el;
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
</script>
