<template>
  <div id="menu-page" class="page-enter">
    
    <!-- Top Action Card -->
    <div class="card mb-lg menu-top-action-card">
      <div class="menu-total-count">
        เมนูทั้งหมด: <strong>{{ menuItems.length }}</strong> รายการ
      </div>
      <div class="menu-action-buttons">
        <button class="btn btn-secondary" @click="openCatModal">📂 จัดการหมวดหมู่</button>
        <button class="btn btn-primary" @click="openAddModal">🍗 + เพิ่มเมนู</button>
      </div>
    </div>

    <!-- Desktop Menu List Table (Visible on desktop only) -->
    <div class="card p-0 overflow-hidden desktop-menu-table-container">
      <div style="overflow-x: auto;">
        <table class="table" style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-color); background: rgba(139, 3, 19, 0.03);">
              <th style="padding: var(--space-md);">รูป</th>
              <th style="padding: var(--space-md);">เมนูอาหาร</th>
              <th style="padding: var(--space-md); text-align: right;">ราคา</th>
              <th style="padding: var(--space-md); text-align: center;">ขาย</th>
              <th style="padding: var(--space-md); text-align: center;">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" style="text-align: center; padding: var(--space-3xl);">
                <div class="spinner" style="margin: 0 auto;"></div>
              </td>
            </tr>
            <tr v-else-if="menuItems.length === 0">
              <td colspan="5" style="text-align: center; padding: var(--space-3xl); color: var(--text-tertiary);">
                ยังไม่มีข้อมูลสินค้า กด "+ เพิ่มเมนู" ด้านบนเพื่อเริ่มสร้างสินค้าชิ้นแรก
              </td>
            </tr>
            <tr 
              v-else 
              v-for="item in menuItems" 
              :key="item.id" 
              style="border-bottom: 1px solid var(--border-color);"
              class="table-row-hover"
            >
              <!-- Image Preview -->
              <td style="padding: var(--space-md); vertical-align: middle;">
                <div style="width: 48px; height: 36px; border-radius: var(--radius-sm); overflow: hidden; background: var(--bg-secondary); border:1px solid var(--border-color); display: flex; align-items: center; justify-content: center;">
                  <img v-if="item.image_url" :src="item.image_url" alt="เมนู" style="width: 100%; height: 100%; object-fit: cover;" />
                  <span v-else style="font-size: 1.1rem;">🍗</span>
                </div>
              </td>
              <!-- Name & Category -->
              <td style="padding: var(--space-md); vertical-align: middle;">
                <div class="font-bold" style="font-size: var(--font-base);">{{ item.name }}</div>
                <div style="font-size: var(--font-xs); color: var(--text-tertiary);">
                  {{ getCategoryName(item.category_id) }}
                </div>
              </td>
              <!-- Price -->
              <td style="padding: var(--space-md); text-align: right; font-weight: bold; vertical-align: middle;">
                {{ formatCurrency(item.price) }}
              </td>
              <!-- Toggle Active Switch -->
              <td style="padding: var(--space-md); text-align: center; vertical-align: middle;">
                <label class="toggle-switch" style="margin: 0 auto; display: block;">
                  <input 
                    type="checkbox" 
                    :checked="item.active !== 0 && item.active !== false"
                    @change="handleToggleActive(item)"
                  />
                  <span class="toggle-slider"></span>
                </label>
              </td>
              <!-- Actions -->
              <td style="padding: var(--space-md); text-align: center; vertical-align: middle;">
                <div class="flex justify-center gap-sm">
                  <button class="btn-action btn-action-edit" title="แก้ไข" @click="openEditModal(item)">📝 แก้ไข</button>
                  <button class="btn-action btn-action-delete" title="ลบ" @click="handleDeleteItem(item.id)">🗑️ ลบ</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Mobile Menu Card List (Visible on mobile only) -->
    <div class="mobile-menu-list-container">
      <div v-if="loading" class="text-center py-3xl">
        <div class="spinner" style="margin: 0 auto;"></div>
      </div>
      <div v-else-if="menuItems.length === 0" class="card text-center py-3xl" style="color: var(--text-tertiary);">
        ยังไม่มีข้อมูลสินค้า กด "+ เพิ่มเมนู" ด้านบนเพื่อเริ่มสร้างสินค้าชิ้นแรก
      </div>
      <div v-else class="mobile-menu-list">
        <div 
          v-for="item in menuItems" 
          :key="item.id" 
          class="mobile-menu-card"
          :class="{ 'inactive-item': item.active === 0 || item.active === false }"
        >
          <div class="mobile-menu-card-body">
            <!-- Left: Product Image / Emoji -->
            <div class="mobile-menu-card-img-container">
              <img v-if="item.image_url" :src="item.image_url" alt="เมนู" class="mobile-menu-card-img" />
              <div v-else class="mobile-menu-card-placeholder">🍗</div>
            </div>
            
            <!-- Middle: Name & Category -->
            <div class="mobile-menu-card-details">
              <div class="mobile-menu-card-name">{{ item.name }}</div>
              <div class="mobile-menu-card-category">{{ getCategoryName(item.category_id) }}</div>
            </div>
            
            <!-- Right: Price & Active Switch -->
            <div class="mobile-menu-card-meta">
              <div class="mobile-menu-card-price">{{ formatCurrency(item.price) }}</div>
              <div class="mobile-menu-card-status">
                <label class="toggle-switch">
                  <input 
                    type="checkbox" 
                    :checked="item.active !== 0 && item.active !== false"
                    @change="handleToggleActive(item)"
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
          
          <!-- Bottom Action Buttons -->
          <div class="mobile-menu-card-actions">
            <button class="btn-action btn-action-edit" @click="openEditModal(item)">📝 แก้ไข</button>
            <button class="btn-action btn-action-delete" @click="handleDeleteItem(item.id)">🗑️ ลบ</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Modal -->
    <div v-if="showCatModal" class="modal-container active" style="display:flex; align-items:center; justify-content:center; position: fixed; inset:0; z-index:1000;">
      <div class="modal-overlay" @click="showCatModal = false"></div>
      <div class="modal-content modal-center w-full max-w-sm" style="position:relative; z-index:2;">
        <div class="modal-header">
          <h3>📂 จัดการหมวดหมู่สินค้า</h3>
          <button class="modal-close" @click="showCatModal = false">✕</button>
        </div>
        <div class="modal-body">
          <!-- Create Category Form -->
          <div class="form-group">
            <label class="form-label font-bold">➕ เพิ่มหมวดหมู่ใหม่</label>
            <div class="flex gap-sm">
              <input 
                type="text" 
                class="form-input" 
                v-model="catForm.name" 
                placeholder="เช่น ของหวาน, ทานเล่น" 
                style="flex: 1;"
              />
              <button 
                class="btn btn-primary btn-sm" 
                :disabled="!catForm.name" 
                @click="handleCreateCat"
                style="padding: 0 var(--space-md);"
              >
                บันทึก
              </button>
            </div>
          </div>

          <!-- List of Existing Categories -->
          <div class="mt-xl">
            <label class="form-label font-bold" style="border-bottom: 1px solid var(--border-color); padding-bottom: var(--space-xs); margin-bottom: var(--space-md);">
              📋 หมวดหมู่ปัจจุบัน ({{ categories.length }} รายการ)
            </label>
            
            <div style="max-height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: var(--space-xs);">
              <div 
                v-for="cat in categories" 
                :key="cat.id" 
                class="flex flex-between align-center p-sm" 
                style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: var(--space-sm) var(--space-md);"
              >
                <span class="font-semibold" style="font-size: var(--font-sm);">📂 {{ cat.name }}</span>
                <button 
                  class="btn-action btn-action-delete" 
                  title="ลบหมวดหมู่"
                  @click="handleDeleteCat(cat.id)"
                  style="min-width: 75px; height: 38px; padding: 0 var(--space-md); font-size: var(--font-xs);"
                >
                  🗑️ ลบ
                </button>
              </div>
              <div v-if="categories.length === 0" class="text-center text-muted py-md" style="font-size: var(--font-xs);">
                ไม่มีหมวดหมู่สินค้า
              </div>
            </div>
          </div>

          <div class="flex gap-md mt-xl">
            <button class="btn btn-secondary btn-block" @click="showCatModal = false">ปิดหน้าต่าง</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Menu Item Modal -->
    <div v-if="showItemModal" class="modal-container active" style="display:flex; align-items:center; justify-content:center; position: fixed; inset:0; z-index:1000;">
      <div class="modal-overlay" @click="showItemModal = false"></div>
      <div class="modal-content modal-center w-full max-w-md" style="position:relative; z-index:2; overflow-y:auto; max-height:85dvh;">
        <div class="modal-header">
          <h3>{{ isEditMode ? '📝 แก้ไขเมนูอาหาร' : '🍗 เพิ่มเมนูอาหาร' }}</h3>
          <button class="modal-close" @click="showItemModal = false">✕</button>
        </div>
        <div class="modal-body">
          <!-- Food Name -->
          <div class="form-group">
            <label class="form-label">ชื่อเมนูอาหาร *</label>
            <input 
              type="text" 
              class="form-input" 
              v-model="itemForm.name" 
              placeholder="เช่น ปีกไก่ทอด" 
            />
          </div>

          <!-- Price -->
          <div class="form-group">
            <label class="form-label">ราคาขาย (บาท) *</label>
            <input 
              type="number" 
              class="form-input" 
              v-model.number="itemForm.price" 
              placeholder="เช่น 20" 
              min="0"
            />
          </div>

          <!-- Category Selector -->
          <div class="form-group">
            <label class="form-label">หมวดหมู่สินค้า *</label>
            <select class="form-select" v-model="itemForm.category_id">
              <option disabled value="">เลือกหมวดหมู่...</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>

          <!-- Raw Stock Tracking Toggle (Checkbox) -->
          <div class="form-group flex align-center gap-sm mt-md mb-md">
            <label class="toggle-switch">
              <input type="checkbox" v-model="itemForm.track_raw_stock" />
              <span class="toggle-slider"></span>
            </label>
            <span style="font-size: var(--font-sm); color: var(--text-primary); font-weight: var(--font-weight-medium);">
              มีของสด
            </span>
          </div>

          <!-- Image URL -->
          <div class="form-group">
            <label class="form-label font-bold">รูปภาพอาหาร</label>
            <div style="display: flex; gap: var(--space-sm); margin-bottom: var(--space-xs);">
              <input 
                type="text" 
                class="form-input flex-1" 
                v-model="itemForm.image_url" 
                placeholder="ใส่ URL รูปภาพ หรือวางรูปภาพ..." 
                @paste="handlePaste"
              />
              <button 
                type="button" 
                class="btn btn-secondary" 
                style="min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 0 15px;"
                @click="triggerFileInput"
              >
                📁 อัปโหลดภาพ
              </button>
            </div>
            <input 
              type="file" 
              ref="fileInputRef" 
              style="display: none;" 
              accept="image/*" 
              @change="handleFileChange"
            />
            <span style="font-size: var(--font-xs); color: var(--text-tertiary); display: block; margin-top: 2px; text-align: left;">
              💡 สามารถเลือกไฟล์, วางลิงก์รูปภาพ หรือคัดลอกรูปภาพแล้วกดวาง (Ctrl+V) ในช่องด้านบนได้
            </span>
          </div>

          <!-- Image Preview in Form -->
          <div v-if="itemForm.image_url" class="form-group flex justify-center">
            <div style="width: 100%; max-width: 200px; height: 130px; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; background: var(--bg-secondary);">
              <img :src="itemForm.image_url" alt="พรีวิว" style="width: 100%; height: 100%; object-fit: cover;" @error="handleImageError" />
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex gap-md mt-xl">
            <button class="btn btn-secondary flex-1" @click="showItemModal = false">ยกเลิก</button>
            <button 
              class="btn btn-primary flex-1" 
              :disabled="!itemForm.name || !itemForm.price || !itemForm.category_id"
              @click="handleSaveItem"
            >
              {{ isEditMode ? '💾 บันทึกการแก้ไข' : '💾 บันทึกรายการใหม่' }}
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../api';
import { ui, formatCurrency } from '../helpers';

import { store } from '../store';

// States
const menuItems = computed(() => store.menuItems);
const categories = computed(() => store.categories);
const loading = ref(true);
const showCatModal = ref(false);
const showItemModal = ref(false);
const isEditMode = ref(false);
const editItemId = ref(null);

// Forms
const catForm = ref({ name: '' });
const itemForm = ref({
  name: '',
  price: '',
  category_id: '',
  image_url: ''
});

// Categories lookup helper
const getCategoryName = (catId) => {
  const cat = categories.value.find(c => c.id === catId);
  return cat ? cat.name : 'หมวดหมู่อื่นๆ';
};

// Toggle item active state
const handleToggleActive = async (item) => {
  try {
    const res = await api.menu.toggle(item.id);
    if (res.success) {
      item.active = item.active === 1 ? 0 : 1;
      store.clearMenuCache(); // Clear cache to keep it in sync!
      ui.showToast(`เปลี่ยนสถานะของ ${item.name} เรียบร้อย`, 'success');
    }
  } catch (error) {
    console.error(error);
    ui.showToast('เปลี่ยนสถานะเมนูอาหารไม่สำเร็จ: ' + error.message, 'error');
  }
};

// Delete menu item
const handleDeleteItem = async (id) => {
  const confirm = await ui.showConfirm('ลบเมนูอาหาร', 'คุณยืนยันต้องการลบเมนูอาหารนี้ใช่หรือไม่?\nการกระทำนี้ไม่สามารถย้อนกลับได้');
  if (confirm) {
    ui.showLoading();
    try {
      const res = await api.menu.delete(id);
      if (res.success) {
        ui.showToast('ลบเมนูอาหารเรียบร้อยแล้ว', 'success');
        loadData(true);
      }
    } catch (e) {
      console.error(e);
      ui.showToast('ไม่สามารถลบเมนูอาหารได้: ' + e.message, 'error');
    } finally {
      ui.hideLoading();
    }
  }
};

// Modals Trigger
const openCatModal = () => {
  catForm.value.name = '';
  showCatModal.value = true;
};

const openAddModal = () => {
  isEditMode.value = false;
  editItemId.value = null;
  itemForm.value = {
    name: '',
    price: '',
    category_id: categories.value[0]?.id || '',
    image_url: '',
    track_raw_stock: false
  };
  showItemModal.value = true;
};

const openEditModal = (item) => {
  isEditMode.value = true;
  editItemId.value = item.id;
  itemForm.value = {
    name: item.name,
    price: item.price,
    category_id: item.category_id,
    image_url: item.image_url || '',
    track_raw_stock: item.raw_stock !== null && item.raw_stock !== undefined
  };
  showItemModal.value = true;
};

const fileInputRef = ref(null);

const triggerFileInput = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
};

const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  if (file.size > 2 * 1024 * 1024) { // limit 2MB
    ui.showToast('ขนาดไฟล์รูปภาพห้ามเกิน 2MB', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    itemForm.value.image_url = event.target.result;
    ui.showToast('อัปโหลดและแปลงรูปภาพเรียบร้อย', 'success');
  };
  reader.readAsDataURL(file);
};

const handlePaste = (e) => {
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      const reader = new FileReader();
      reader.onload = (event) => {
        itemForm.value.image_url = event.target.result;
        ui.showToast('วางรูปภาพเรียบร้อยแล้ว', 'success');
      };
      reader.readAsDataURL(file);
      e.preventDefault();
      break;
    }
  }
};

// Create new Category
const handleCreateCat = async () => {
  ui.showLoading();
  try {
    const res = await api.menu.createCategory({ name: catForm.value.name });
    if (res.success) {
      ui.showToast(`เพิ่มหมวดหมู่ ${catForm.value.name} สำเร็จ`, 'success');
      catForm.value.name = ''; // Clear input
      loadData(true);
    }
  } catch (e) {
    console.error(e);
    ui.showToast('เพิ่มหมวดหมู่ไม่สำเร็จ: ' + e.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

// Delete a Category
const handleDeleteCat = async (catId) => {
  const cat = categories.value.find(c => c.id === catId);
  const catName = cat ? cat.name : 'หมวดหมู่นี้';
  
  const confirm = await ui.showConfirm(
    'ลบหมวดหมู่สินค้า',
    `คุณยืนยันต้องการลบหมวดหมู่ "${catName}" ใช่หรือไม่?`
  );
  
  if (confirm) {
    ui.showLoading();
    try {
      const res = await api.menu.deleteCategory(catId);
      if (res.success) {
        ui.showToast('ลบหมวดหมู่เรียบร้อยแล้ว', 'success');
        loadData(true);
      }
    } catch (e) {
      console.error(e);
      ui.showToast('ไม่สามารถลบหมวดหมู่ได้: ' + e.message, 'error');
    } finally {
      ui.hideLoading();
    }
  }
};

// Save Menu Item (Add or Edit)
const handleSaveItem = async () => {
  ui.showLoading();
  try {
    const payload = {
      name: itemForm.value.name,
      price: Number(itemForm.value.price) || 0,
      category_id: Number(itemForm.value.category_id),
      image_url: itemForm.value.image_url.trim() || null,
      track_raw_stock: !!itemForm.value.track_raw_stock
    };

    let res;
    if (isEditMode.value) {
      res = await api.menu.update(editItemId.value, payload);
    } else {
      res = await api.menu.create(payload);
    }

    if (res.success) {
      ui.showToast(isEditMode.value ? 'แก้ไขเมนูสำเร็จ' : 'เพิ่มเมนูอาหารสำเร็จ', 'success');
      showItemModal.value = false;
      loadData(true);
    }
  } catch (e) {
    console.error(e);
    ui.showToast('บันทึกข้อมูลไม่สำเร็จ: ' + e.message, 'error');
  } finally {
    ui.hideLoading();
  }
};

// Triggered when Image fails to load in preview
const handleImageError = () => {
  ui.showToast('ลิงก์รูปภาพที่ใส่อ่านไม่ได้ กรุณาตรวจสอบ URL', 'warning');
};

// Load initial data
const loadData = async (force = false) => {
  try {
    await store.fetchMenu(force);
  } catch (e) {
    console.error('Failed to load menu data:', e);
    ui.showToast('ไม่สามารถดึงข้อมูลเมนูอาหารได้', 'error');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
/* Custom responsive layout for top actions */
.menu-top-action-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.menu-total-count {
  font-size: 1.25rem;
  font-weight: bold;
  color: var(--text-secondary);
  margin-left: 0;
}
.menu-action-buttons {
  display: flex;
  gap: var(--space-sm);
}

/* Hide mobile menu list by default */
.mobile-menu-list-container {
  display: none;
}

/* Desktop layout rules */
.desktop-menu-table-container {
  display: block;
}

.table-row-hover:hover {
  background: rgba(139, 3, 19, 0.015) !important;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  /* Top Actions layout on mobile */
  .menu-top-action-card {
    flex-direction: column;
    gap: var(--space-md);
    align-items: stretch;
    text-align: center;
    padding: var(--space-md);
  }
  
  .menu-total-count {
    font-size: 1.1rem;
    font-weight: bold;
    margin-left: 0;
  }
  
  .menu-action-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-sm);
    width: 100%;
  }
  
  .menu-action-buttons button {
    width: 100%;
    justify-content: center;
  }

  /* Table Hide & Mobile List Show */
  .desktop-menu-table-container {
    display: none;
  }
  
  .mobile-menu-list-container {
    display: block;
    width: 100%;
  }
  
  .mobile-menu-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding-bottom: var(--space-2xl);
  }
  
  .mobile-menu-card {
    background: var(--card-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--space-md);
    box-shadow: 0 4px 12px rgba(139, 3, 19, 0.03);
    transition: all var(--transition-base);
    display: flex;
    flex-direction: column;
  }
  
  .mobile-menu-card.inactive-item {
    border-color: rgba(110, 78, 55, 0.15);
    background: rgba(110, 78, 55, 0.02);
  }

  .mobile-menu-card-body {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    width: 100%;
  }
  
  .mobile-menu-card-img-container {
    width: 64px;
    height: 64px;
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
    font-size: 1.6rem;
  }
  
  .mobile-menu-card-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  
  .mobile-menu-card-name {
    font-size: var(--font-md);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
    word-break: break-word;
    text-align: left;
  }
  
  .mobile-menu-card-category {
    font-size: var(--font-xs);
    color: var(--text-tertiary);
    text-align: left;
  }
  
  .mobile-menu-card-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-xs);
    flex-shrink: 0;
  }
  
  .mobile-menu-card-price {
    font-size: var(--font-md);
    font-weight: var(--font-weight-bold);
    color: var(--primary);
  }
  
  .mobile-menu-card-status {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }
  
  .mobile-menu-card-actions {
    display: flex;
    gap: var(--space-sm);
    margin-top: var(--space-md);
    padding-top: var(--space-sm);
    border-top: 1px dashed var(--border-color);
    width: 100%;
  }
  
  .mobile-menu-card-actions .btn-action {
    flex: 1;
    height: 44px;
    font-size: var(--font-sm);
    justify-content: center;
  }
}
</style>
