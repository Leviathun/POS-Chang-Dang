import { reactive } from 'vue';
import api from './api';

export const store = reactive({
  menuItems: [],
  categories: [],
  stockItems: [],
  lowStockThreshold: 5,
  menuLoaded: false,
  stockLoaded: false,
  modifiersLoaded: false,

  menuPromise: null,
  stockPromise: null,
  modifiersPromise: null,

  modifiers: [],
  modifierPresets: [],

  // Fetch Menu & Categories (cached unless forced, refetches in background if cached)
  async fetchMenu(force = false) {
    if (this.menuLoaded && !force) {
      // Revalidate in the background (stale-while-revalidate)
      Promise.all([
        api.menu.getAll(),
        api.menu.getCategories()
      ]).then(([menuRes, catRes]) => {
        this.menuItems = menuRes.data || menuRes || [];
        this.categories = catRes.data || catRes || [];
      }).catch(e => {
        console.error('Background menu fetch error:', e);
      });
      return;
    }

    if (this.menuPromise && !force) {
      return this.menuPromise;
    }

    // First-time load or forced reload
    this.menuPromise = (async () => {
      try {
        const [menuRes, catRes] = await Promise.all([
          api.menu.getAll(),
          api.menu.getCategories()
        ]);
        this.menuItems = menuRes.data || menuRes || [];
        this.categories = catRes.data || catRes || [];
        this.menuLoaded = true;
      } catch (e) {
        console.error('Store menu fetch error:', e);
        throw e;
      } finally {
        this.menuPromise = null;
      }
    })();

    return this.menuPromise;
  },

  // Fetch Stock Items (cached unless forced, refetches in background if cached)
  async fetchStock(force = false) {
    if (this.stockLoaded && !force) {
      // Revalidate in the background (stale-while-revalidate)
      api.stock.getAll().then(res => {
        if (res.success && res.data && Array.isArray(res.data.items)) {
          this.stockItems = res.data.items.map(item => ({
            ...item,
            quantity: item.stock,
            raw_quantity: item.raw_stock
          }));
          if (res.data.threshold) {
            this.lowStockThreshold = Number(res.data.threshold) || 5;
          }
        } else {
          this.stockItems = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        }
      }).catch(e => {
        console.error('Background stock fetch error:', e);
      });
      return;
    }

    if (this.stockPromise && !force) {
      return this.stockPromise;
    }

    // First-time load or forced reload
    this.stockPromise = (async () => {
      try {
        const res = await api.stock.getAll();
        if (res.success && res.data && Array.isArray(res.data.items)) {
          this.stockItems = res.data.items.map(item => ({
            ...item,
            quantity: item.stock,
            raw_quantity: item.raw_stock
          }));
          if (res.data.threshold) {
            this.lowStockThreshold = Number(res.data.threshold) || 5;
          }
        } else {
          this.stockItems = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        }
        this.stockLoaded = true;
      } catch (e) {
        console.error('Store stock fetch error:', e);
        throw e;
      } finally {
        this.stockPromise = null;
      }
    })();

    return this.stockPromise;
  },

  // Invalidate specific cache stores on change
  clearMenuCache() {
    this.menuLoaded = false;
    this.menuPromise = null;
  },

  clearStockCache() {
    this.stockLoaded = false;
    this.stockPromise = null;
  },

  // Helper methods to update local menu/category data instantly
  addCategory(category) {
    if (!category) return;
    const cat = category.data || category;
    this.categories.push(cat);
    this.categories.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return (a.sort_order || 0) - (b.sort_order || 0);
      }
      return a.id - b.id;
    });
  },

  deleteCategory(catId) {
    this.categories = this.categories.filter(c => c.id !== catId);
  },

  addMenuItem(item) {
    if (!item) return;
    const mi = item.data || item;
    this.menuItems.push(mi);
    this.menuItems.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return (a.sort_order || 0) - (b.sort_order || 0);
      }
      return a.id - b.id;
    });
    if (this.stockLoaded) {
      this.stockItems.push({
        ...mi,
        quantity: mi.stock !== undefined ? mi.stock : mi.quantity,
        raw_quantity: mi.raw_stock !== undefined ? mi.raw_stock : mi.raw_quantity
      });
      this.stockItems.sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
          return (a.sort_order || 0) - (b.sort_order || 0);
        }
        return a.id - b.id;
      });
    }
  },

  updateMenuItem(item) {
    if (!item) return;
    const mi = item.data || item;
    const idx = this.menuItems.findIndex(m => m.id === mi.id);
    if (idx !== -1) {
      this.menuItems[idx] = mi;
      this.menuItems.sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
          return (a.sort_order || 0) - (b.sort_order || 0);
        }
        return a.id - b.id;
      });
    }
    const sIdx = this.stockItems.findIndex(s => s.id === mi.id);
    if (sIdx !== -1) {
      this.stockItems[sIdx] = {
        ...this.stockItems[sIdx],
        ...mi,
        quantity: mi.stock !== undefined ? mi.stock : mi.quantity,
        raw_quantity: mi.raw_stock !== undefined ? mi.raw_stock : mi.raw_quantity
      };
      this.stockItems.sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
          return (a.sort_order || 0) - (b.sort_order || 0);
        }
        return a.id - b.id;
      });
    }
  },

  deleteMenuItem(itemId) {
    this.menuItems = this.menuItems.filter(m => m.id !== itemId);
    this.stockItems = this.stockItems.filter(s => s.id !== itemId);
  },

  updateStock(itemId, stock, rawStock) {
    const idx = this.stockItems.findIndex(s => s.id === itemId);
    if (idx !== -1) {
      if (stock !== undefined) this.stockItems[idx].quantity = stock;
      if (rawStock !== undefined) this.stockItems[idx].raw_quantity = rawStock;
    }
    // Also update menuItems stock to keep POS in sync!
    const mIdx = this.menuItems.findIndex(m => m.id === itemId);
    if (mIdx !== -1) {
      if (stock !== undefined) this.menuItems[mIdx].stock = stock;
      if (rawStock !== undefined) this.menuItems[mIdx].raw_stock = rawStock;
    }
  },

  async fetchModifiers(force = false) {
    if (this.modifiersLoaded && !force) {
      // Revalidate in the background
      Promise.all([
        api.modifiers.getAll(),
        api.modifiers.getPresets()
      ]).then(([modRes, presetRes]) => {
        if (modRes.success) {
          this.modifiers = modRes.data || [];
        }
        if (presetRes.success) {
          this.modifierPresets = presetRes.data || [];
        }
      }).catch(e => {
        console.error('Background modifiers fetch error:', e);
      });
      return;
    }

    if (this.modifiersPromise && !force) {
      return this.modifiersPromise;
    }

    this.modifiersPromise = (async () => {
      try {
        const [modRes, presetRes] = await Promise.all([
          api.modifiers.getAll(),
          api.modifiers.getPresets()
        ]);
        if (modRes.success) {
          this.modifiers = modRes.data || [];
        }
        if (presetRes.success) {
          this.modifierPresets = presetRes.data || [];
        }
        this.modifiersLoaded = true;
      } catch (e) {
        console.error('Store modifiers fetch error:', e);
        throw e;
      } finally {
        this.modifiersPromise = null;
      }
    })();

    return this.modifiersPromise;
  },

  clearModifiersCache() {
    this.modifiersLoaded = false;
    this.modifiersPromise = null;
  },

  clearAllCache() {
    this.menuLoaded = false;
    this.stockLoaded = false;
    this.modifiersLoaded = false;
    this.menuPromise = null;
    this.stockPromise = null;
    this.modifiersPromise = null;
    this.menuItems = [];
    this.categories = [];
    this.stockItems = [];
    this.modifiers = [];
    this.modifierPresets = [];
  }
});
