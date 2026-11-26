<template>
  <div>
    <!-- Info Header Card -->
    <div class="card mb-lg page-header-card">
      <div class="page-header-left">
        <div class="header-icon-circle">
          <i :class="icon"></i>
        </div>
        <div class="page-header-text">
          <div class="title-tooltip-wrapper" @click.stop>
            <h2 class="page-header-title">
              {{ title }}<template v-if="count !== null && count !== undefined">: <strong class="tabular-nums">{{ count }}</strong> {{ countUnit }}</template>
            </h2>
            <button
              v-if="tooltipText"
              type="button"
              class="title-info-btn"
              :aria-label="`คำอธิบาย${title}`"
              :aria-expanded="showHintTooltip"
              @click="showHintTooltip = !showHintTooltip"
            >
              <i class="fa-solid fa-circle-info"></i>
            </button>
            <div v-if="tooltipText && showHintTooltip" class="title-tooltip-popover" role="tooltip">
              <strong v-if="tooltipTitle">{{ tooltipTitle }}</strong> {{ tooltipText }}
            </div>
          </div>
          <p v-if="!$slots.actions && !backTo && (count === null || count === undefined) && subtitle" class="page-header-subtitle">
            {{ subtitle }}
          </p>
        </div>
      </div>

      <div class="page-header-actions">
        <slot name="actions">
          <router-link v-if="backTo" :to="backTo" class="btn btn-secondary">
            <i class="fa-solid fa-arrow-left"></i> ย้อนกลับ
          </router-link>
        </slot>
      </div>
    </div>

    <!-- Optional Search & Filter Card -->
    <div v-if="searchable" class="card p-md mb-lg cook-filter-card">
      <div class="cook-filter-row flex flex-between align-center gap-md flex-wrap">
        <div class="search-box flex-1" style="min-width: 220px;">
          <div class="input-icon-wrapper">
            <i class="fa-solid fa-magnifying-glass input-icon"></i>
            <input 
              type="text" 
              :value="searchQuery"
              @input="$emit('update:searchQuery', $event.target.value)"
              class="form-input" 
              :placeholder="searchPlaceholder" 
              :aria-label="searchPlaceholder"
              style="padding-left: 36px;"
            />
            <button 
              v-if="searchQuery" 
              type="button"
              class="search-clear-btn" 
              aria-label="ล้างคำค้นหา"
              @click="$emit('update:searchQuery', '')"
            >
              ✕
            </button>
          </div>
        </div>
        <slot name="search-extra" />
      </div>
      <slot name="search-bottom" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: 'fa-solid fa-warehouse' },
  subtitle: { type: String, default: '' },
  count: { type: [Number, String], default: null },
  countUnit: { type: String, default: 'รายการ' },
  tooltipTitle: { type: String, default: '' },
  tooltipText: { type: String, default: '' },
  backTo: { type: String, default: '' },
  searchable: { type: Boolean, default: false },
  searchQuery: { type: String, default: '' },
  searchPlaceholder: { type: String, default: 'ค้นหาชื่อสินค้า...' }
});

defineEmits(['update:searchQuery']);

const showHintTooltip = ref(false);
const closeTooltip = () => {
  showHintTooltip.value = false;
};

onMounted(() => window.addEventListener('click', closeTooltip));
onUnmounted(() => window.removeEventListener('click', closeTooltip));
</script>

<style scoped>
.input-icon-wrapper {
  position: relative;
  width: 100%;
}

.input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  font-size: var(--font-sm);
  pointer-events: none;
}
</style>
